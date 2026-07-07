/* JUCUM English Center · Supabase client + data layer
 * Loads supabase-js, exposes window.JUCUM_SB with helpers.
 * Custom username login (no email shown to students).
 */
(function () {
  const cfg = window.JUCUM_CONFIG;
  if (!cfg || cfg.SUPABASE_ANON_KEY.startsWith('PEGA_')) {
    console.error('⚠️ config.js no configurado. Pega la Publishable key.');
    return;
  }

  let client = null;
  function getClient() {
    if (client) return client;
    if (!window.supabase) { console.error('supabase-js no cargó'); return null; }
    client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    return client;
  }

  /* ── Auth (custom, against users table) ──
   * Robusto: tolera usuarios DUPLICADOS en la base (no usa maybeSingle, que
   * fallaba con error si había más de una fila), mayúsculas y espacios. */
  async function login(username, password) {
    const sb = getClient();
    const uname = (username || '').trim().toLowerCase();
    const pass  = (password  || '').trim();
    if (!uname) return { ok: false, reason: 'Escribe tu usuario.' };
    // ilike = búsqueda sin distinguir mayúsculas; devuelve lista (no falla con duplicados)
    const { data, error } = await sb.from('users').select('*').ilike('username', uname);
    if (error) throw error;
    const rows = data || [];
    if (!rows.length) return { ok: false, reason: 'Usuario no encontrado. Revisa que esté bien escrito, sin espacios.' };
    // Si hay duplicados, prioriza la fila cuya contraseña coincide.
    const match = rows.find(r => (r.password || '').trim() === pass) || rows[0];
    if ((match.password || '').trim() !== pass) return { ok: false, reason: 'Contraseña incorrecta.' };
    const data2 = match;
    const role = data2.is_admin ? 'admin' : (data2.is_dev || data2.username === 'dev') ? 'dev' : data2.role;
    const session = {
      role,
      studentId: role === 'student' ? data2.id : null,
      name: data2.full_name,
      username: data2.username,
      level: data2.level,
      groupId: data2.group_id,
    };
    localStorage.setItem('jucum_user', JSON.stringify(session));
    // 📶 Conexión REAL: sella users.last_seen_at al entrar (best-effort;
    // requiere el script 22 — si la columna no existe, se ignora en silencio).
    try {
      localStorage.setItem('jucum_touch_' + data2.id, String(Date.now()));
      sb.from('users').update({ last_seen_at: new Date().toISOString() }).eq('id', data2.id).then(() => {}, () => {});
    } catch (e) {}
    return { ok: true, session };
  }

  /* ── 📶 Última conexión real (columna users.last_seen_at · script 22) ──
   * Sella "estuvo aquí" del usuario con sesión abierta. Con acelerador:
   * máximo una escritura cada 10 min por usuario. Best-effort: si la
   * columna aún no existe, no rompe nada. */
  function touchLastSeen(userId) {
    if (!userId) return;
    try {
      const k = 'jucum_touch_' + userId;
      const last = Number(localStorage.getItem(k) || 0);
      if (Date.now() - last < 10 * 60000) return;
      localStorage.setItem(k, String(Date.now()));
      getClient().from('users').update({ last_seen_at: new Date().toISOString() }).eq('id', userId).then(() => {}, () => {});
    } catch (e) {}
  }

  /* ── Generic table helpers ── */
  /* Paginado: Supabase corta todo select en 1000 filas; tablas como
   * teacher_class_log o payments crecen sin tope y sin paginar se perderían
   * las filas más recientes (mismo bug que dejó de registrar el avance). */
  async function all(table) {
    const PAGE = 1000;
    let rows = [], from = 0;
    while (true) {
      const { data, error } = await getClient().from(table).select('*')
        .order('id', { ascending: true }).range(from, from + PAGE - 1);
      if (error) throw error;
      rows = rows.concat(data || []);
      if (!data || data.length < PAGE) return rows;
      from += PAGE;
    }
  }
  async function insert(table, row) {
    const { data, error } = await getClient().from(table).insert(row).select().maybeSingle();
    if (error) throw error; return data;
  }
  async function update(table, id, patch) {
    const { data, error } = await getClient().from(table).update(patch).eq('id', id).select().maybeSingle();
    if (error) throw error; return data;
  }
  async function remove(table, id) {
    const { error } = await getClient().from(table).delete().eq('id', id);
    if (error) throw error;
  }

  /* ── Verificar la contraseña del profesor (para acciones sensibles:
   *    resetear contraseña de un alumno, etc.) sin alterar la sesión. ── */
  async function verifyTeacherPassword(password) {
    try {
      const { data, error } = await getClient().from('users').select('password').eq('role', 'teacher');
      if (error) throw error;
      return (data || []).some(u => u.password === password);
    } catch (e) { return false; }
  }

  /* ── Verificar la contraseña de la ADMINISTRADORA (para acciones sensibles
   *    del panel de administración: eliminar alumno, resetear contraseña). ── */
  async function verifyAdminPassword(password) {
    const pass = (password || '').trim();
    if (!pass) return false;
    try {
      // admin marcado por is_admin, por role='admin' o por el usuario 'admi'
      const { data, error } = await getClient().from('users')
        .select('password, is_admin, role, username');
      if (error) throw error;
      return (data || []).some(u =>
        (u.is_admin || u.role === 'admin' || u.username === 'admi') &&
        (u.password || '').trim() === pass);
    } catch (e) { return false; }
  }

  /* ── Connection test ── */
  async function testConnection() {
    try {
      const { error } = await getClient().from('users').select('id', { count: 'exact', head: true });
      if (error) throw error;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  window.JUCUM_SB = { getClient, login, all, insert, update, remove, testConnection, verifyTeacherPassword, verifyAdminPassword, touchLastSeen };
})();
