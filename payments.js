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
  async function cloudLoad() {
    if (!window.JUCUM_SB) return;
    try {
      const rows = await window.JUCUM_SB.all('payments');
      if (Array.isArray(rows)) savePayments(rows.map(mapRowToLocal));
    } catch (e) { /* tabla aún no creada */ }
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

  function currentPeriod() { return new Date().toISOString().slice(0, 7); } // YYYY-MM

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

  /* Estado de cuenta del alumno respecto a su pago del periodo actual */
  function getAccountStatus(student) {
    const sid = student.id;
    const cfg = getConfig();
    // Si el control de pagos no está activo, O el grupo está exonerado (convenio
    // Homeschool), nadie se bloquea.
    if (!cfg.enforce || isExemptGroup(student, cfg)) {
      return { state: 'al_dia', daysLeft: null, payDay: payDayFor(sid), dueDate: null,
        blocked: false, pending: false, rejected: false, confirmed: null,
        period: currentPeriod(), currency: cfg.currency, phone: ATTN_PHONE, enforced: false,
        exempt: isExemptGroup(student, cfg) };
    }
    const period = currentPeriod();
    const mine = loadPayments().filter(p => p.studentId === sid);
    const confirmedNow = mine.find(p => p.status === 'confirmado' && p.period === period);
    const pendingNow = mine.find(p => p.status === 'por_confirmar' && p.period === period);
    const rejectedNow = mine.find(p => p.status === 'rechazado' && p.period === period);

    const now = new Date();
    const day = payDayFor(sid);
    const due = new Date(now.getFullYear(), now.getMonth(), day);
    const msDay = 86400000;
    const daysOverdue = Math.floor((now - due) / msDay);

    let state, daysLeft = null;
    if (confirmedNow) state = 'al_dia';
    else if (pendingNow) state = 'en_revision';
    else if (now < due) state = 'al_dia';               // aún no llega el día de pago
    else if (daysOverdue <= 7) { state = 'por_vencer'; daysLeft = 7 - daysOverdue; }
    else state = 'bloqueado';

    return {
      state, daysLeft, payDay: day,
      dueDate: due.toISOString().slice(0, 10),
      blocked: state === 'bloqueado',
      pending: !!pendingNow, rejected: !!rejectedNow,
      confirmed: confirmedNow || null,
      period, currency: cfg.currency, phone: ATTN_PHONE, enforced: true,
    };
  }

  /* Pago recién confirmado que el alumno aún no ha "visto" al entrar (para el
   * mensajito de felicitación que aparece una vez y desaparece) */
  function pendingConfirmCelebration(studentId) {
    const seen = (() => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}'); } catch { return {}; } })();
    const conf = getStudentPayments(studentId).find(p => p.status === 'confirmado');
    if (conf && !seen[conf.id]) return conf;
    return null;
  }
  function markCelebrationSeen(paymentId) {
    let seen = {}; try { seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}'); } catch {}
    seen[paymentId] = true;
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  }

  function labelMode(m) { return m === 'mensual' ? 'Mensual' : m === 'modulo' ? 'Por módulo' : m === 'total' ? 'Pago total' : m; }

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
    pendingConfirmCelebration, markCelebrationSeen, cloudLoad, currentPeriod,
    PAYMENT_METHODS, ATTN_PHONE,
  };
})();
