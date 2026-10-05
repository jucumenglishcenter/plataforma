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
      amounts: {                 // montos por nivel y modalidad (los define el admin)
        'pre-a1': { mensual: 0, total: 0 },
        'a1':     { mensual: 180, modulo: 350, total: 0 },
        'a2':     { mensual: 180, modulo: 350, total: 0 },
      },
      packMonths: { 'pre-a1': 6, 'a1': 6, 'a2': 6 }, // meses que cubre el paquete completo (sugerencia; se edita en cada pago)
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
  const ROW_COLS = ['debtor','notice_start','closed_manual','extension_until','paid_until','amount','amount_why','pay_day','join_date','exempt','teacher_allow','teacher_views','note','mode','rejected','falta'];
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
  /* Modalidades por nivel (05-oct): Pre-A1 mensual o curso completo · A1/A2 mensual, módulo (2 meses) o completo */
  const MODE_LABEL = { mensual: 'Mensual', modulo: 'Por módulo', total: 'Paquete completo' };
  function modesFor(level) { return level === 'a1' || level === 'a2' ? ['mensual', 'modulo', 'total'] : ['mensual', 'total']; }
  function modeOf(student) { const r = GATE.rows[student.id]; return (r && r.mode) || student.payMode || 'mensual'; }
  /* Precio de una modalidad para un alumno. El monto especial (pay_status.amount) aplica al mensual. */
  function priceFor(student, mode) {
    const r = GATE.rows[student.id];
    if (mode === 'mensual' && r && r.amount != null && r.amount !== '') return Number(r.amount);
    const v = (getConfig().amounts[student.level] || {})[mode];
    return v ? Number(v) : null;
  }
  /* Monto que corresponde a un alumno (según su modalidad): especial o general del nivel */
  function amountFor(student) {
    const r = GATE.rows[student.id];
    const m = modeOf(student);
    const special = m === 'mensual' && r && r.amount != null && r.amount !== '';
    return { amount: priceFor(student, m) || 0, special: !!special, why: special ? (r.amount_why || '') : '', mode: m };
  }
  /* Lo que se limpia al quedar al día */
  function clearDebt(extra) { return Object.assign({ debtor: false, notice_start: null, closed_manual: false, extension_until: null, rejected: '', falta: null }, extra || {}); }

  /* ✅ La ADMINISTRADORA aprueba un pago subido por el alumno (con modalidad, monto y hasta cuándo cubre) */
  async function approvePayment(id, o) {
    const arr = loadPayments(); const p = arr.find(x => x.id === id);
    if (!p) return { ok: false, error: 'No se encontró el pago.' };
    const res = await gateSet(p.studentId, clearDebt({ paid_until: o.until, mode: o.mode }), 'aprobó pago', `${labelMode(o.mode)} · ${getConfig().currency} ${o.amount ?? '—'} · cubre hasta ${o.until}`);
    if (!res.ok) return res;
    p.status = 'confirmado'; p.confirmedAt = new Date().toISOString(); p.note = ''; p.mode = o.mode; if (o.amount != null && o.amount !== '') p.amount = Number(o.amount);
    savePayments(arr); pushPaymentCloud(p);
    if (window.JUCUM_NOTIF) window.JUCUM_NOTIF.pushNotif(p.studentId, { type: 'payment-ok', title: '✅ ¡Pago confirmado!', body: 'Administración aprobó tu pago. ¡Gracias! Sigue practicando con normalidad. 🎉', link: 'payments' });
    return { ok: true };
  }
  /* ⚠️ La administradora NO aprueba: incompleto o rechazado → pausa al instante, salvo que dé plazo (días) */
  async function disapprovePayment(id, o) {
    const arr = loadPayments(); const p = arr.find(x => x.id === id);
    if (!p) return { ok: false, error: 'No se encontró el pago.' };
    const cur = getConfig().currency;
    const falta = o.kind === 'inc' ? Math.max(0, (Number(o.expected) || 0) - (Number(o.received) || 0)) : null;
    const why = o.kind === 'inc' ? `Pago incompleto · falta ${cur} ${falta}` : ('Pago no aprobado' + (o.reason ? ' · ' + o.reason : ''));
    const until = o.days ? window.JUCUM_PAYGATE.addDays(window.JUCUM_PAYGATE.peruToday(), Number(o.days)) : null;
    const res = await gateSet(p.studentId, { debtor: true, rejected: why, falta, extension_until: until, closed_manual: false }, o.kind === 'inc' ? 'pago incompleto' : 'no aprobó pago', why + (until ? ` · plazo hasta ${until}` : ' · plataforma pausada'));
    if (!res.ok) return res;
    p.status = 'rechazado'; p.note = why; if (o.kind === 'inc' && o.received) p.amount = Number(o.received);
    savePayments(arr); pushPaymentCloud(p);
    if (window.JUCUM_NOTIF) window.JUCUM_NOTIF.pushNotif(p.studentId, { type: 'payment', link: 'payments', title: '⚠️ Tu pago no se pudo aprobar',
      body: `${why}. ${until ? `Tienes hasta el ${until} para regularizarlo; si no, tu plataforma se pondrá en pausa.` : 'Tu plataforma quedó en pausa hasta que lo regularices.'} Escríbenos al ${ATTN_PHONE}.` });
    return { ok: true };
  }
  /* 💵 Pago registrado por la administradora (efectivo, etc.): ya aprobado */
  async function adminRecordPayment(student, o) {
    const res = await gateSet(student.id, clearDebt({ paid_until: o.until, mode: o.mode }), 'pagó', `${labelMode(o.mode)} · ${getConfig().currency} ${o.amount ?? '—'} · ${o.medio || ''} · cubre hasta ${o.until}`);
    if (!res.ok) return res;
    registerManualPayment(student.id, { dni: student.dni || '', mode: o.mode, level: student.level, amount: o.amount === '' || o.amount == null ? null : Number(o.amount), note: (o.medio || 'Registrado por administración') + ' · cubre hasta ' + o.until, _gateDone: true });
    return { ok: true };
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
    if (gr && (gr.debtor || gr.closed_manual || gr.notice_start || gr.rejected)) gateSet(p.studentId, gr.rejected ? clearDebt() : { debtor: false, notice_start: null, closed_manual: false }, 'pago confirmado', 'Captura confirmada · se quitó el aviso/pausa');
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
    // Pago no aprobado CON plazo → el alumno ve el aviso con la fecha en que se pausa
    const plazo = g.k === 'pr' && !!g.reason;
    const PGg = PG();
    const closeDate = plazo ? PGg.addDays(g.until, 1) : (g.close || null);
    const st = g.k === 'pre' ? 'por_vencer' : (g.k === 'av' || plazo) ? 'aviso' : g.k === 'rev' ? 'en_revision' : g.k === 'cl' ? 'bloqueado' : 'al_dia';
    return {
      state: st, gate: g, reason: g.reason || '',
      daysLeft: plazo ? PGg.diff(closeDate, PGg.peruToday()) : (g.k === 'pre' || g.k === 'av') ? g.left : null,
      payDay: g.payDay || null,
      dueDate: g.due || null, closeDate,
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

  function labelMode(m) { return m === 'mensual' ? 'Mensual' : m === 'modulo' ? 'Por módulo' : m === 'total' ? 'Paquete completo' : m; }

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
    // 🚦 Un pago registrado a mano también quita aviso / pausa / marca de deudor
    const gr = GATE.rows[studentId];
    if (!data._gateDone && gr && (gr.debtor || gr.closed_manual || gr.notice_start || gr.rejected)) gateSet(studentId, gr.rejected ? clearDebt() : { debtor: false, notice_start: null, closed_manual: false }, 'pagó', 'Pago registrado por administración');
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
    modesFor, modeOf, priceFor, MODE_LABEL, approvePayment, disapprovePayment, adminRecordPayment, isExemptGroup,
  };
})();
