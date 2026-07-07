/* Bloque R · Registro de alumnos + Inscripciones
 * - Inscripciones (autoregistro por link): submitRegistration() lo usa la
 *   página pública registro.html; la administradora las aprueba/rechaza.
 * - createStudentDirect(): la administradora registra un alumno a mano.
 * Al aprobar/crear: se crea el usuario, se asigna grupo y (si hay voucher)
 * se registra un primer pago con el modo elegido.
 * localStorage como caché; sincroniza a Supabase si está disponible.
 */
(function () {
  const REG_KEY = 'jucum_registrations_v1';

  function load() { try { const a = JSON.parse(localStorage.getItem(REG_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } }
  function save(a) { localStorage.setItem(REG_KEY, JSON.stringify(a)); }

  function listRegistrations(status) {
    const a = load().sort((x, y) => String(y.createdAt).localeCompare(String(x.createdAt)));
    return status ? a.filter(r => r.status === status) : a;
  }
  function pendingCount() { return load().filter(r => r.status === 'pendiente').length; }

  /* slug de usuario a partir del nombre: "Ana Pérez" → "ana.perez" (sin tildes) */
  function usernameFrom(fullName) {
    const base = (fullName || 'alumno').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z\s]/g, '').trim().split(/\s+/);
    let u = base.length >= 2 ? `${base[0]}.${base[1]}` : (base[0] || 'alumno');
    // evitar choque con usernames existentes
    const taken = new Set((window.JUCUM_DATA?.STUDENTS || []).map(s => s.username));
    let cand = u, n = 1;
    while (taken.has(cand)) cand = u + (++n);
    return cand;
  }

  async function cloudInsertRegistration(r) {
    if (!window.JUCUM_SB) return;
    try {
      await window.JUCUM_SB.getClient().from('registrations').insert({
        id: r.id, full_name: r.fullName, email: r.email, age: r.age || null, dni: r.dni,
        guardian_name: r.guardianName || null, guardian_dni: r.guardianDni || null,
        phone: r.phone || null, pay_mode: r.payMode || null, voucher: r.voucher || null,
        level: r.level || null, note: r.note || null, status: r.status || 'pendiente',
      });
    } catch (e) { console.warn('reg cloud:', e.message); }
  }
  async function cloudUpdateRegistration(id, patch) {
    if (!window.JUCUM_SB) return;
    try { await window.JUCUM_SB.getClient().from('registrations').update(patch).eq('id', id); }
    catch (e) { console.warn('reg upd:', e.message); }
  }

  /* Trae las inscripciones de la nube al caché local (para la administradora) */
  async function cloudLoadRegistrations() {
    if (!window.JUCUM_SB) return;
    try {
      const { data } = await window.JUCUM_SB.getClient().from('registrations').select('*').order('created_at', { ascending: false });
      if (!data) return;
      const mapped = data.map(r => ({
        id: r.id, fullName: r.full_name, email: r.email, age: r.age, dni: r.dni,
        guardianName: r.guardian_name, guardianDni: r.guardian_dni, phone: r.phone,
        payMode: r.pay_mode, voucher: r.voucher, level: r.level, note: r.note,
        status: r.status, group_id: r.group_id, createdAt: r.created_at,
      }));
      save(mapped);
    } catch (e) { console.warn('reg load:', e.message); }
  }

  /* Usado por la página pública: guarda la inscripción como 'pendiente' */
  async function submitRegistration(data) {
    const r = { id: 'reg-' + Date.now(), createdAt: new Date().toISOString(), status: 'pendiente', ...data };
    const arr = load(); arr.unshift(r); save(arr);
    await cloudInsertRegistration(r);
    return r;
  }

  function rejectRegistration(id) {
    const arr = load(); const r = arr.find(x => x.id === id); if (!r) return;
    r.status = 'rechazado'; save(arr); cloudUpdateRegistration(id, { status: 'rechazado' });
  }

  /* Crea el usuario alumno (Supabase o local) con sus datos */
  async function createStudentDirect(data) {
    const D = window.JUCUM_DATA;
    const username = data.username || usernameFrom(data.fullName);
    const password = data.password || '1234';
    const source = data.source || 'admin';
    const nowIso = new Date().toISOString();
    const rec = {
      id: 's' + Date.now(), username, fullName: data.fullName, level: data.level, group: data.group,
      email: data.email, age: data.age, dni: data.dni, guardianName: data.guardianName, guardianDni: data.guardianDni,
      phone: data.phone, payMode: data.payMode, source, createdAt: nowIso,
      starred: false, completedModules: 0, avgScore: 0, streak: 0, lastActiveDays: 0, totalMinutes: 0, achievements: [],
    };
    if (window.JUCUM_SB) {
      try {
        const row = await window.JUCUM_SB.insert('users', {
          username, full_name: data.fullName, role: 'student', level: data.level, group_id: data.group,
          starred: false, password, email: data.email || null, age: data.age || null, dni: data.dni || null,
          guardian_name: data.guardianName || null, guardian_dni: data.guardianDni || null,
          phone: data.phone || null, pay_mode: data.payMode || null, source,
        });
        if (row && row.id) rec.id = row.id;
        if (row && row.created_at) rec.createdAt = row.created_at;
      } catch (e) { alert('Error al crear alumno: ' + e.message); return null; }
    }
    D.STUDENTS.push(rec);
    if (D.saveStudents) D.saveStudents(D.STUDENTS);
    // primer pago con voucher (queda por confirmar)
    if (data.voucher && window.JUCUM_PAY) {
      window.JUCUM_PAY.registerPayment(rec.id, { dni: data.dni, mode: data.payMode, level: data.level, screenshot: data.voucher });
    }
    return rec;
  }

  /* Aprueba una inscripción → crea el alumno y la marca aprobada */
  async function approveRegistration(id, { group, level, username, password }) {
    const arr = load(); const r = arr.find(x => x.id === id); if (!r) return null;
    const stu = await createStudentDirect({
      fullName: r.fullName, email: r.email, age: r.age, dni: r.dni, guardianName: r.guardianName,
      guardianDni: r.guardianDni, phone: r.phone, payMode: r.payMode, voucher: r.voucher,
      level, group, username, password, source: 'self',
    });
    if (!stu) return null;
    r.status = 'aprobado'; r.group_id = group; save(arr);
    cloudUpdateRegistration(id, { status: 'aprobado', group_id: group });
    return stu;
  }

  /* ── Autoinscripción de alumnos EXISTENTES (página pública) ──
   * Crea el acceso directamente y devuelve usuario+contraseña. No requiere
   * aprobación ni voucher. Es seguro en registro.html (no usa JUCUM_DATA). */

  /* Lista de grupos para que el alumno elija el suyo */
  async function listGroupsPublic() {
    if (!window.JUCUM_SB) return [];
    try {
      const { data } = await window.JUCUM_SB.getClient()
        .from('groups').select('*').order('level', { ascending: true });
      return (data || []).map(g => ({ id: g.id, level: g.level, name: g.name, schedule: g.schedule }));
    } catch (e) { console.warn('grupos:', e.message); return []; }
  }

  /* Genera un usuario único consultando la base real (y el caché si existe) */
  async function usernameFromCloud(fullName) {
    const base = (fullName || 'alumno').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z\s]/g, '').trim().split(/\s+/);
    const u = base.length >= 2 ? `${base[0]}.${base[1]}` : (base[0] || 'alumno');
    const taken = new Set();
    if (window.JUCUM_SB) {
      try { const { data } = await window.JUCUM_SB.getClient().from('users').select('username');
        (data || []).forEach(r => taken.add((r.username || '').toLowerCase())); } catch {}
    }
    (window.JUCUM_DATA?.STUDENTS || []).forEach(s => taken.add((s.username || '').toLowerCase()));
    let cand = u, n = 1; while (taken.has(cand)) cand = u + (++n);
    return cand;
  }

  /* Devuelve la cuenta existente con ese DNI, si la hay (anti-duplicado) */
  async function findStudentByDni(dni) {
    if (!window.JUCUM_SB || !dni) return null;
    try {
      const { data } = await window.JUCUM_SB.getClient().from('users')
        .select('username, full_name').eq('dni', String(dni).trim());
      return (data && data.length) ? data[0] : null;
    } catch { return null; }
  }

  async function selfEnrollExistingStudent(data) {
    const username = data.username || await usernameFromCloud(data.fullName);
    const password = (data.password || '').trim() || '1234';
    if (window.JUCUM_SB) {
      const row = await window.JUCUM_SB.insert('users', {
        username, full_name: data.fullName, role: 'student', level: data.level, group_id: data.group,
        starred: false, password, email: data.email || null, age: data.age || null, dni: data.dni || null,
        guardian_name: data.guardianName || null, guardian_dni: data.guardianDni || null, phone: data.phone || null, source: 'self',
      });
      // Deja constancia para la administración (inscripción ya aprobada)
      try {
        await window.JUCUM_SB.getClient().from('registrations').insert({
          id: 'reg-' + Date.now(), full_name: data.fullName, email: data.email || null, age: data.age || null,
          dni: data.dni || null, guardian_name: data.guardianName || null, guardian_dni: data.guardianDni || null,
          phone: data.phone || null, level: data.level || null, group_id: data.group || null,
          status: 'aprobado', note: 'Autoinscripción · alumno existente',
        });
      } catch (e) { console.warn('selfEnroll reg:', e.message); }
      // Refresca el caché local si la app está abierta en este equipo
      if (window.JUCUM_DATA && row) {
        window.JUCUM_DATA.STUDENTS.push({
          id: row.id || ('s' + Date.now()), username, fullName: data.fullName, level: data.level, group: data.group,
          email: data.email, age: data.age, dni: data.dni, guardianName: data.guardianName, starred: false,
          source: 'self', createdAt: (row && row.created_at) || new Date().toISOString(),
          completedModules: 0, avgScore: 0, streak: 0, lastActiveDays: 0, totalMinutes: 0, achievements: [],
        });
        if (window.JUCUM_DATA.saveStudents) window.JUCUM_DATA.saveStudents(window.JUCUM_DATA.STUDENTS);
      }
    }
    return { username, password };
  }

  window.JUCUM_REG = {
    listRegistrations, pendingCount, submitRegistration, rejectRegistration,
    createStudentDirect, approveRegistration, usernameFrom, cloudLoadRegistrations,
    listGroupsPublic, usernameFromCloud, findStudentByDni, selfEnrollExistingStudent,
  };
})();
