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

  /* ── Auth (custom, against users table) ── */
  async function login(username, password) {
    const sb = getClient();
    const { data, error } = await sb.from('users')
      .select('*')
      .eq('username', username.trim().toLowerCase())
      .maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false, reason: 'Usuario no encontrado.' };
    if (data.password !== password) return { ok: false, reason: 'Contraseña incorrecta.' };
    const role = data.is_admin ? 'admin' : data.is_dev ? 'dev' : data.role;
    const session = {
      role,
      studentId: role === 'student' ? data.id : null,
      name: data.full_name,
      username: data.username,
      level: data.level,
      groupId: data.group_id,
    };
    localStorage.setItem('jucum_user', JSON.stringify(session));
    return { ok: true, session };
  }

  /* ── Generic table helpers ── */
  async function all(table) {
    const { data, error } = await getClient().from(table).select('*');
    if (error) throw error; return data || [];
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

  window.JUCUM_SB = { getClient, login, all, insert, update, remove, testConnection, verifyTeacherPassword };
})();
