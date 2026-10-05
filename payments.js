/* JUCUM EC — Pagos + configuración administrativa
 * localStorage como caché; Supabase (tablas payments + app_settings) como nube.
 * El Administrador define monto/día de pago y confirma; el alumno registra su
 * pago (DNI + modalidad + captura), ve su estado y, si se vence, su cuenta se
 * bloquea hasta regularizar.
 */
(function () {
  const PAY_KEY  = 'jucum_payments_v1';
  const PCFG_KEY = 'jucum_pay_config_v1';
  const SEEN_KEY = 'jucum_pay_confirm_seen_v1'; // ids de pago ya celebrados al entrar

  const ATTN_PHONE = '+51 935 972 183';

  function loadPayments() { try { const a = JSON.parse(localStorage.getItem(PAY_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } }
  function savePayments(a) { localStorage.setItem(PAY_KEY, JSON.stringify(a)); }

  function defaultCfg() {
    return {
      enforce: false,            // control de pagos activo (bloqueo). Apagado por defecto
      payDay: 5,                 // día fijo de pago para todos
      currency: 'S/',
      totalMonths: 2,            // "pago total" válido los primeros 2 meses del módulo
      exceptions: {},            // { studentId: díaDePago }
      exemptGroups: [],          // ids de grupos exonerados de pago (convenio). También se exoneran automáticamente los grupos con "Homeschool"/"Convenio" en el nombre.
      amounts: {                 // montos por nivel (los define el admin)
        'pre-a1': { mensual: 0 },
        'a1':     { mensual: 0, modulo: 0 },
        'a2':     { mensual: 0, modulo: 0 },
      },
    };
  }
  function getConfig() {
    try { return { ...defaultCfg(), ...(JSON.parse(localStorage.getItem(PCFG_KEY) || '{}')) }; }
    catch { return defaultCfg(); }
  }
  function setConfig(patch) {
    const c = { ...getConfig(), ...patch };
    localStorage.setItem(PCFG_KEY, JSON.stringify(c));
    pushConfigCloud(c);
    return c;
  }

  /* ── Sincronización con la nube (best-effort: no rompe si la tabla aún no existe) ── */
  function mapRowToLocal(r) {
    return {
      id: r.id, studentId: r.student_id, dni: r.dni, mode: r.mode, level: r.level,
      moduleId: r.module_id, amount: r.amount, period: r.period, screenshot: r.screenshot,
      status: r.status, note: r.note, registeredAt: r.registered_at, confirmedAt: r.confirmed_at,
    };
  }
  function mapLocalToRow(p) {
    return {
      id: p.id, student_id: p.studentId, dni: p.dni, mode: p.mode, level: p.level,
      module_id: p.moduleId || null, amount: p.amount ?? null, period: p.period,
      screenshot: p.screenshot || null, status: p.status, note: p.note || null,
      registered_at: p.registeredAt, confirmed_at: p.confirmedAt || null,
    };
  }
  /* 📸 Las capturas YA NO se bajan en la carga (pesaban MB y se bajaban las de
   * TODOS, hasta en el equipo de cada alumno). Se piden de a una con fetchShot().
   * El alumno solo baja SUS pagos. (01-oct-2026) */
  const PAY_COLS = 'id,student_id,dni,mode,level,module_id,amount,period,status,note,registered_at,confirmed_at';
  function sessionUser() { try { return JSON.parse(localStorage.getItem('jucum_user') || '{}') || {}; } catch { return {}; } }
  async function cloudLoad() {
    if (!window.JUCUM_SB) return;
    try {
      const sb = window.JUCUM_SB.getClient(); const me = sessionUser();
      let rows = [], from = 0;
      while (true) {
        let q = sb.from('payments').select(PAY_COLS).order('id', { ascending: true }).range(from, from + 999);
        if (me.role === 'student' && me.studentId) q = q.eq('student_id', me.studentId);
        const { data, error } = await q;
        if (error) throw error;
        rows = rows.concat(data || []);
        if (!data || data.length < 1000) break;
        from += 1000;
      }
      const local = {}; loadPayments().forEach(p => { if (p.screenshot) local[p.id] = p.screenshot; });
      savePayments(rows.map(r => { const p = mapRowToLocal(r); p.screenshot = local[p.id] || null; p.hasShot = null; return p; }));
    } catch (e) { /* tabla aún no creada */ }
    try { await gateLoad(); } catch (e) {}
    try {
      const { data } = await window.JUCUM_SB.getClient().from('app_settings').select('value').eq('key', 'payment_config').maybeSingle();
      if (data && data.value) localStorage.setItem(PCFG_KEY, JSON.stringify({ ...defaultCfg(), ...data.value }));
    } catch (e) {}
    try {
      const { data } = await window.JUCUM_SB.getClient().from('app_settings').select('value').eq('key', 'module_grade_cfg').maybeSingle();
      if (data && data.value) localStorage.setItem('jucum_module_grade_cfg_v1', JSON.stringify(data.value));
    } catch (e) {}
  }
  async function pushPaymentCloud(p) {
    if (!window.JUCUM_SB) return;
    try { await window.JUCUM_SB.getClient().from('payments').upsert(mapLocalToRow(p), { onConflict: 'id' }); }
    catch (e) { console.warn('payments cloud:', e.message); }
  }
  async function pushConfigCloud(c) {
    if (!window.JUCUM_SB) return;
    try { await window.JUCUM_SB.getClient().from('app_settings').upsert({ key: 'payment_config', value: c }, { onConflict: 'key' }); }
    catch (e) {}
  }

  function currentPeriod() { return new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 7); } // YYYY-MM (Perú)

  /* 📸 Captura de UN pago, a pedido (no se guarda en caché) */
  async function fetchShot(id) {
    const loc = loadPayments().find(p => p.id === id);
    if (loc && loc.screenshot) return loc.screenshot;
    if (!window.JUCUM_SB) return null;
    try { const { data } = await window.JUCUM_SB.getClient().from('payments').select('screenshot').eq('id', id).maybeSingle(); return (data && data.screenshot) || null; }
    catch (e) { return null; }
  }

  /* ══════════ 🚦 CONTROL DE PAGOS (script 30 · motor en pay-gate.js) ══════════
   * GATE.ok solo es true si se leyó la NUBE en esta sesión. Sin eso, nadie ve
   * avisos ni pausa (regla: ante la duda, todo normal). */
  const GATE = { ok: false, ctl: null, rows: {}, pays: null, at: 0, err: '' };
  const PG = () => window.JUCUM_PAYGATE;
  async function gateLoad() {
    const sb = window.JUCUM_SB && window.JUCUM_SB.getClient();
    if (!sb || !PG()) { GATE.ok = false; return false; }
    const me = sessionUser();
    try {
      const c = await sb.from('app_settings').select('value').eq('key', 'payment_control').maybeSingle();
      if (c.error) throw c.error;
      let q = sb.from('pay_status').select('*');
      if (me.role === 'student' && me.studentId) q = q.eq('student_id', me.studentId);
      const r = await q;
      if (r.error) throw r.error;
      let pays = null;
      if (me.role === 'student' && me.studentId) {
        const p = await sb.from('payments').select('status,period,registered_at,confirmed_at').eq('student_id', me.studentId);
        if (p.error) throw p.error;
        pays = p.data || [];
      }
      GATE.ctl = (c.data && c.data.value) || null; GATE.rows = {}; (r.data || []).forEach(x => { GATE.rows[x.student_id] = x; });
      GATE.pays = pays; GATE.ok = true; GATE.at = Date.now(); GATE.err = '';
      return true;
    } catch (e) { GATE.ok = false; GATE.err = (e && e.message) || 'sin conexión'; return false; }
  }
  function gateCtl() { return PG() ? PG().cfg(GATE.ctl) : { on: false }; }
  function gateRow(sid) { return GATE.rows[sid] || null; }
  function gateStatus(student) {
    if (!student || !GATE.ok || !PG()) return { k: 'off' };
    if (isExemptGroup(student, getConfig())) return { k: 'ex', group: true };
    const pays = GATE.pays || loadPayments().filter(p => p.studentId === student.id);
    return PG().classify(GATE.ctl, GATE.rows[student.id], pays, student.group);
  }
  function whoAmI() { const me = sessionUser(); return me.role === 'admin' ? 'Administración' : me.role === 'teacher' ? 'Profesor' : (me.name || me.role || ''); }
  async function gateLog(sid, action, detail) {
    try { await window.JUCUM_SB.getClient().from('pay_log').insert({ who: whoAmI(), student_id: sid || '', action, detail: detail || '' }); } catch (e) {}
  }
  async function gateLogList(limit) {
    try { const { data } = await window.JUCUM_SB.getClient().from('pay_log').select('*').order('at', { ascending: false }).limit(limit || 80); return data || []; } catch (e) { return []; }
  }
  const ROW_COLS = ['debtor','notice_start','closed_manual','extension_until','paid_until','amount','amount_why','pay_day','join_date','exempt','teacher_allow','teacher_views','note'];
  async function gateSet(sid, patch, action, detail) {
    const sb = window.JUCUM_SB && window.JUCUM_SB.getClient();
    if (!sb) return { ok: false, error: 'Sin conexión' };
    const prev = GATE.rows[sid] || {};
    const row = { student_id: sid };
    ROW_COLS.forEach(k => { if (k in prev) row[k] = prev[k]; });
    Object.assign(row, patch, { updated_at: new Date().toISOString(), updated_by: whoAmI() });
    const { error } = await sb.from('pay_status').upsert(row, { onConflict: 'student_id' });
    if (error) return { ok: false, error: error.message };
    GATE.rows[sid] = row;
    if (action) gateLog(sid, action, detail);
    return { ok: true };
  }
  async function gateSetControl(patch, detail) {
    const sb = window.JUCUM_SB && window.JUCUM_SB.getClient();
    if (!sb) return { ok: false, error: 'Sin conexión' };
    let cur = {};
    try { const { data } = await sb.from('app_settings').select('value').eq('key', 'payment_control').maybeSingle(); cur = (data && data.value) || {}; } catch (e) {}
    const next = { ...cur, ...patch, groups: { ...(cur.groups || {}), ...(patch.groups || {}) } };
    const { error } = await sb.from('app_settings').upsert({ key: 'payment_control', value: next }, { onConflict: 'key' });
    if (error) return { ok: false, error: error.message };
    GATE.ctl = next;
    if (detail) gateLog('', 'config', detail);
    return { ok: true };
  }
  /* Monto que corresponde a un alumno: especial (pay_status.amount) o general del nivel */
  function amountFor(student) {
    const r = GATE.rows[student.id];
    if (r && r.amount != null && r.amount !== '') return { amount: Number(r.amount), special: true, why: r.amount_why || '' };
    const a = (getConfig().amounts[student.level] || {}).mensual || 0;
    return { amount: a, special: false, why: '' };
  }

  function getStudentPayments(studentId) {
    return loadPayments().filter(p => p.studentId === studentId).sort((a, b) => String(b.registeredAt).localeCompare(String(a.registeredAt)));
  }
  function getAllPayments() {
    return loadPayments().sort((a, b) => String(b.registeredAt).localeCompare(String(a.registeredAt)));
  }

  function registerPayment(studentId, data) {
    const arr = loadPayments();
    const p = {
      id: 'pay-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      studentId, dni: (data.dni || '').trim(), mode: data.mode, level: data.level || null,
      moduleId: data.moduleId || null, amount: data.amount ?? null,
      period: data.period || currentPeriod(), screenshot: data.screenshot || null,
      status: 'por_confirmar', note: '', registeredAt: new Date().toISOString(), confirmedAt: null,
    };
    arr.unshift(p);
    savePayments(arr);
    pushPaymentCloud(p);
    // Aviso (con sonido) al administrador
    if (window.JUCUM_NOTIF) {
      const name = (() => { try { return (window.JUCUM_DATA.STUDENTS.find(s => s.id === studentId) || {}).fullName || 'Un alumno'; } catch { return 'Un alumno'; } })();
      window.JUCUM_NOTIF.pushNotif('admin', {
        type: 'payment',
        title: '💳 Nuevo registro de pago',
        body: `${name} registró un pago (${labelMode(p.mode)}). Pendiente de confirmación.`,
        link: 'payments',
      });
    }
    return p.id;
  }

  function confirmPayment(id) {
    const arr = loadPayments();
    const p = arr.find(x => x.id === id);
    if (!p) return;
    p.status = 'confirmado'; p.confirmedAt = new Date().toISOString(); p.note = '';
    savePayments(arr); pushPaymentCloud(p);
    // 🚦 Confirmar el pago quita la marca de deudor / la pausa manual
    const gr = GATE.rows[p.studentId];
    if (gr && (gr.debtor || gr.closed_manual || gr.notice_start)) gateSet(p.studentId, { debtor: false, notice_start: null, closed_manual: false }, 'pago confirmado', 'Captura confirmada · se quitó el aviso/pausa');
    if (window.JUCUM_NOTIF) window.JUCUM_NOTIF.pushNotif(p.studentId, {
      type: 'payment-ok',
      title: '✅ ¡Pago confirmado!',
      body: 'Tu pago fue confirmado. ¡Gracias! Ya puedes seguir practicando con normalidad. 🎉',
      link: 'payments',
    });
  }
  function rejectPayment(id, note) {
    const arr = loadPayments();
    const p = arr.find(x => x.id === id);
    if (!p) return;
    p.status = 'rechazado'; p.note = note || 'Revisa los datos e inténtalo de nuevo.';
    savePayments(arr); pushPaymentCloud(p);
    if (window.JUCUM_NOTIF) window.JUCUM_NOTIF.pushNotif(p.studentId, {
      type: 'payment',
      title: '⚠️ Pago no confirmado',
      body: `El administrador revisó tu pago: ${p.note} Vuelve a registrarlo, por favor.`,
      link: 'payments',
    });
  }

  function payDayFor(studentId) {
    const c = getConfig();
    return c.exceptions[studentId] || c.payDay;
  }

  /* ¿El grupo del alumno está exonerado de pagos? (convenio Homeschool)
   * Se exonera si: (a) su grupo está en cfg.exemptGroups, o
   *                (b) el nombre del grupo contiene "Homeschool" o "Convenio". */
  function isExemptGroup(student, cfg) {
    if (!student) return false;
    const list = (cfg && cfg.exemptGroups) || [];
    if (student.group && list.includes(student.group)) return true;
    try {
      const g = (window.JUCUM_DATA.GROUPS || []).find(x => x.id === student.group);
      if (g && /homeschool|convenio/i.test(g.name || '')) return true;
    } catch (e) {}
    return false;
  }

  /* Estado de cuenta del alumno · 01-oct-2026: lo decide el motor PAYGATE
   * (pay-gate.js). El viejo control 'enforce' + 7 días quedó SIN EFECTO.
   * state: al_dia · por_vencer (recordatorio) · aviso (cuenta regresiva) ·
   *        en_revision · bloqueado (= en pausa: blocked true). */
  function getAccountStatus(student) {
    const sid = student.id;
    const cfg = getConfig();
    const g = gateStatus(student);
    const mine = loadPayments().filter(p => p.studentId === sid);
    const last = mine.sort((a, b) => String(b.registeredAt).localeCompare(String(a.registeredAt)))[0];
    const st = g.k === 'pre' ? 'por_vencer' : g.k === 'av' ? 'aviso' : g.k === 'rev' ? 'en_revision' : g.k === 'cl' ? 'bloqueado' : 'al_dia';
    return {
      state: st, gate: g,
      daysLeft: (g.k === 'pre' || g.k === 'av') ? g.left : null,
      payDay: g.payDay || null,
      dueDate: g.due || null, closeDate: g.close || null,
      blocked: st === 'bloqueado',
      pending: st === 'en_revision', rejected: !!(last && last.status === 'rechazado'),
      confirmed: mine.find(p => p.status === 'confirmado') || null,
      period: currentPeriod(), currency: cfg.currency, phone: ATTN_PHONE,
      enforced: GATE.ok && gateCtl().on, exempt: g.k === 'ex',
      amount: amountFor(student).amount,
    };
  }

  /* Pago recién confirmado que el alumno aún no ha "visto" al entrar (para el
   * mensajito de felicitación que aparece una vez y desaparece) */
  function pendingConfirmCelebration(studentId) {
    const seen = (() => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}'); } catch { return {}; } })();
    // El primer pago confirmado AÚN NO visto. Antes tomaba solo el primero del
    // arreglo: si ese ya estaba visto, los pagos confirmados de meses siguientes
    // nunca felicitaban.
    const conf = getStudentPayments(studentId).filter(p => p.status === 'confirmado').find(p => !seen[p.id]);
    return conf || null;
  }
  function markCelebrationSeen(paymentId) {
    let seen = {}; try { seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}'); } catch {}
    seen[paymentId] = true;
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  }

  function labelMode(m) { return m === 'mensual' ? 'Mensual' : m === 'modulo' ? 'Por módulo' : m === 'total' ? 'Pago total' : m; }

  /* ── Registro de pago hecho POR LA ADMINISTRACIÓN, en nombre del alumno ──
   * Para alumnos que pagan pero tienen problemas para registrarlo solos.
   * Se crea YA CONFIRMADO (la admin da fe del pago) y avisa al alumno. */
  function registerManualPayment(studentId, data) {
    const arr = loadPayments();
    const now = new Date().toISOString();
    const p = {
      id: 'pay-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      studentId, dni: (data.dni || '').trim(), mode: data.mode, level: data.level || null,
      moduleId: data.moduleId || null, amount: data.amount ?? null,
      period: data.period || currentPeriod(), screenshot: data.screenshot || null,
      status: 'confirmado', note: data.note || 'Registrado por administración',
      registeredAt: now, confirmedAt: now, byAdmin: true,
    };
    arr.unshift(p);
    savePayments(arr);
    pushPaymentCloud(p);
    if (window.JUCUM_NOTIF) window.JUCUM_NOTIF.pushNotif(studentId, {
      type: 'payment-ok',
      title: '✅ Pago registrado',
      body: `La administración registró y confirmó tu pago (${labelMode(p.mode)}, periodo ${p.period}). ¡Gracias! 🎉`,
      link: 'payments',
    });
    return p.id;
  }

  /* ── Aviso de pago a uno o varios grupos ──
   * Envía una notificación (con enlace a Pagos) a todos los alumnos de los
   * grupos elegidos. Devuelve a cuántos alumnos se avisó. */
  /* ── Aviso INDIVIDUAL a un alumno (misma semántica que el grupal) ── */
  function notifyPaymentIndividual(studentId, opts) {
    if (!window.JUCUM_NOTIF) return false;
    const body = (opts && opts.body) ||
      'Te recordamos que tu pago está pendiente. Por favor comunícate con nosotros o registra tu pago directamente en la plataforma (sección 💳 Pagos). ¡Gracias!';
    const title = (opts && opts.title) || '💳 Recordatorio de pago';
    window.JUCUM_NOTIF.pushNotif(studentId, { type: 'payment', title, body, link: 'payments' });
    return true;
  }

  /* ── Reporte por grupo: cuántos están al día / por vencer / bloqueados ── */
  function getGroupPaymentReport() {
    const D = window.JUCUM_DATA;
    const cfg = getConfig();
    return (D.GROUPS || []).map(g => {
      const students = (D.STUDENTS || []).filter(s => s.group === g.id);
      const rows = students.map(s => ({ student: s, status: getAccountStatus(s) }));
      const count = (st) => rows.filter(r => r.status.state === st).length;
      return {
        group: g,
        total: students.length,
        alDia: count('al_dia'),
        enRevision: count('en_revision'),
        porVencer: count('por_vencer'),
        bloqueado: count('bloqueado'),
        rows,
      };
    }).sort((a, b) => (b.bloqueado + b.porVencer) - (a.bloqueado + a.porVencer));
  }

  function notifyPaymentToGroups(groupIds, opts) {
    if (!window.JUCUM_NOTIF) return 0;
    const D = window.JUCUM_DATA;
    const set = new Set(groupIds || []);
    const targets = (D.STUDENTS || []).filter(s => set.has(s.group));
    const body = (opts && opts.body) ||
      'Te recordamos que tu pago está pendiente. Por favor comunícate con nosotros o registra tu pago directamente en la plataforma (sección 💳 Pagos). ¡Gracias!';
    const title = (opts && opts.title) || '💳 Recordatorio de pago';
    targets.forEach(s => window.JUCUM_NOTIF.pushNotif(s.id, { type: 'payment', title, body, link: 'payments' }));
    return targets.length;
  }

  /* Medios de pago (recreados con texto, sin imagen) */
  const PAYMENT_METHODS = {
    titular: 'Jucum English Center Eirl',
    yape: '935 972 183',
    bcp: '5607095203080',
    cci: '00256000709520308010',
    phone: ATTN_PHONE,
  };

  // Carga inicial desde la nube
  cloudLoad();

  window.JUCUM_PAY = {
    getConfig, setConfig, getStudentPayments, getAllPayments, registerPayment,
    confirmPayment, rejectPayment, getAccountStatus, payDayFor, labelMode,
    registerManualPayment, notifyPaymentToGroups, notifyPaymentIndividual, getGroupPaymentReport,
    pendingConfirmCelebration, markCelebrationSeen, cloudLoad, currentPeriod,
    PAYMENT_METHODS, ATTN_PHONE, fetchShot,
    gateLoad, gateStatus, gateRow, gateCtl, gateSet, gateSetControl, gateLog, gateLogList, amountFor, gateReady: () => GATE.ok, gateError: () => GATE.err,
  };
})();
