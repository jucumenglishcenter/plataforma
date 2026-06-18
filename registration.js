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
    const rec = {
      id: 's' + Date.now(), username, fullName: data.fullName, level: data.level, group: data.group,
      email: data.email, age: data.age, dni: data.dni, guardianName: data.guardianName, payMode: data.payMode,
      starred: false, completedModules: 0, avgScore: 0, streak: 0, lastActiveDays: 0, totalMinutes: 0, achievements: [],
    };
    if (window.JUCUM_SB) {
      try {
        const row = await window.JUCUM_SB.insert('users', {
          username, full_name: data.fullName, role: 'student', level: data.level, group_id: data.group,
          starred: false, password, email: data.email || null, age: data.age || null, dni: data.dni || null,
          guardian_name: data.guardianName || null, guardian_dni: data.guardianDni || null,
          phone: data.phone || null, pay_mode: data.payMode || null,
        });
        if (row && row.id) rec.id = row.id;
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
      level, group, username, password,
    });
    if (!stu) return null;
    r.status = 'aprobado'; r.group_id = group; save(arr);
    cloudUpdateRegistration(id, { status: 'aprobado', group_id: group });
    return stu;
  }

  window.JUCUM_REG = {
    listRegistrations, pendingCount, submitRegistration, rejectRegistration,
    createStudentDirect, approveRegistration, usernameFrom, cloudLoadRegistrations,
  };
})();
