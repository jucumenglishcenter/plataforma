/* Bloque J2 · Flujo de examen "en el módulo" (carpetas por grupo + apertura automática)
 * Complementa exams.js (que guarda exámenes/ventanas/notas). Aquí vive lo NUEVO:
 *   - Anuncio con FECHA + HORA de apertura/cierre (hora de Perú) y apertura AUTOMÁTICA.
 *   - Versión del examen por grupo (niños/adultos).
 *   - Pre-examen controlado POR GRUPO (solo lo ven los grupos donde la profesora lo abra).
 *   - Registro de las notas del M1 rendido por Google Forms (primera nota enviada).
 *   - Eventos para el calendario de Planificar.
 * Persistencia: localStorage + app_settings(key 'exam_flow') en Supabase → llega a los alumnos.
 * ⚠ REGLA FIJA: todo cálculo de "hoy/hora" usa HORA DE PERÚ (UTC−5), jamás la local/UTC. */

(function () {
  const KEY = 'jucum_exam_flow_v1';

  /* ── Hora de Perú ── */
  function pNow() { return new Date(Date.now() - 5 * 3600000); }        // campos UTC = hora Perú
  function pDay() { return pNow().toISOString().slice(0, 10); }
  function pMin() { const d = pNow(); return d.getUTCHours() * 60 + d.getUTCMinutes(); }
  function hm(s, fb) { if (!s || !/^\d{1,2}:\d{2}$/.test(s)) return fb; const [h, m] = s.split(':').map(Number); return h * 60 + m; }
  function fmtHora(s) { if (!s) return ''; const [h, m] = s.split(':').map(Number); const am = h < 12; const h12 = h % 12 || 12; return h12 + ':' + String(m).padStart(2, '0') + (am ? ' am' : ' pm'); }
  function fmtFecha(d) { if (!d) return ''; return new Date(d + 'T12:00:00Z').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }); }
  function daysTo(d) { return Math.round((Date.parse(d + 'T00:00:00Z') - Date.parse(pDay() + 'T00:00:00Z')) / 86400000); }

  /* ── Almacén (local + nube app_settings) ── */
  function load() { try { const o = JSON.parse(localStorage.getItem(KEY) || '{}'); return { ann: o.ann || {}, pre: o.pre || {} }; } catch (e) { return { ann: {}, pre: {} }; } }
  function save(flow) {
    try { localStorage.setItem(KEY, JSON.stringify(flow)); } catch (e) {}
    try { if (window.JUCUM_SB) window.JUCUM_SB.getClient().from('app_settings').upsert({ key: 'exam_flow', value: flow }, { onConflict: 'key' }).then(function () {}, function () {}); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('jucum:examflow')); } catch (e) {}
  }
  async function hydrate() {
    try {
      if (!window.JUCUM_SB) return;
      const { data } = await window.JUCUM_SB.getClient().from('app_settings').select('value').eq('key', 'exam_flow').maybeSingle();
      if (data && data.value && typeof data.value === 'object') {
        localStorage.setItem(KEY, JSON.stringify({ ann: data.value.ann || {}, pre: data.value.pre || {} }));
        try { window.dispatchEvent(new CustomEvent('jucum:examflow')); } catch (e) {}
      }
    } catch (e) {}
  }
  // Hidratar al arrancar (cuando el cliente de Supabase ya existe)
  let tries = 0;
  (function boot() { if (window.JUCUM_SB) { hydrate(); return; } if (tries++ < 40) setTimeout(boot, 500); })();

  /* ── Anuncio del examen de módulo (fecha + horas + versión + auto) ── */
  function getAnn(groupId, moduleId) { return load().ann[groupId + ':' + moduleId] || null; }
  function setAnn(groupId, moduleId, patch) {
    const flow = load(); const k = groupId + ':' + moduleId;
    if (patch === null) delete flow.ann[k];
    else flow.ann[k] = Object.assign({}, flow.ann[k] || {}, patch);
    save(flow);
    return flow.ann[k] || null;
  }

  /* ── Pre-examen por grupo (ventana de fechas y horas) ── */
  function preKey(groupId, moduleId) { return groupId + ':' + moduleId; }
  function getPre(groupId, moduleId) { return load().pre[preKey(groupId, moduleId)] || null; }
  function setPre(groupId, moduleId, patch) {
    const flow = load(); const k = preKey(groupId, moduleId);
    if (patch === null) delete flow.pre[k];
    else flow.pre[k] = Object.assign({}, flow.pre[k] || {}, patch);
    save(flow);
    return flow.pre[k] || null;
  }
  function isPreexamActivity(a) { return !!a && /pre-?examen/i.test(String(a.id || '') + ' ' + String(a.name || '')); }
  function preOpenNow(pre) {
    if (!pre || !pre.open) return false;
    const today = pDay(), min = pMin();
    if (pre.fromDate && today < pre.fromDate) return false;
    if (pre.toDate && today > pre.toDate) return false;
    if (pre.fromDate && today === pre.fromDate && min < hm(pre.from, 0)) return false;
    if (pre.toDate && today === pre.toDate && min > hm(pre.to, 1439)) return false;
    return true;
  }
  /* ¿Este alumno ve el pre-examen de este módulo? (abierto para su grupo, o ya lo hizo) */
  function preexamVisibleFor(student, mod) {
    if (!student || !mod) return false;
    return preOpenNow(getPre(student.group, mod.id));
  }

  /* ── Apertura efectiva de una ventana de examen (manual O automática) ── */
  function annForWindow(w) {
    const X = window.JUCUM_EXAMS; if (!X || !w) return null;
    const exam = X.getExam(w.examId); if (!exam) return null;
    for (const mid of (exam.moduleIds || [])) { const a = getAnn(w.groupId, mid); if (a) return Object.assign({ moduleId: mid }, a); }
    return null;
  }
  function winEffectiveOpen(w) {
    if (!w) return false;
    const ann = annForWindow(w);
    if (ann && ann.forceClosed) return false;
    if (w.isOpen) { if (w.closesAt && new Date(w.closesAt) < new Date()) return false; return true; }
    if (ann && ann.auto !== false && ann.date) {
      if (pDay() !== ann.date) return false;
      const min = pMin();
      return min >= hm(ann.from, 0) && min <= hm(ann.to, 1439);
    }
    return false;
  }

  /* ── Info completa del examen de UN módulo para UN alumno (alimenta el banner) ──
   * phase: none | ready | announced | today | waitgrade | done */
  function infoForModule(student, mod) {
    const D = window.JUCUM_DATA, X = window.JUCUM_EXAMS;
    if (!D || !X || !student || !mod) return { phase: 'none' };
    const exam = X.examForModule(mod.id, student.level);
    if (!exam) return { phase: 'none' };
    const isForms = /^ex-m1forms-/.test(exam.id);
    const win = X.windowForExamGroup(exam.id, student.group);
    const ann = getAnn(student.group, mod.id);
    const res = (win && win.published) ? (win.results || {})[student.id] : null;
    if (res) return { phase: 'done', exam: exam, win: win, ann: ann, result: res, isForms: isForms };
    if (isForms) return { phase: 'none' };                       // Forms sin nota propia: nada que mostrar
    const r = D.getStudentReadiness(student);
    const overridden = !!(win && (win.allowOverrides || []).includes(student.id));
    const canTake = r.apt || overridden;
    const open = winEffectiveOpen(win);
    const link = (function () {
      const p = (exam.parts || []).find(function (x) { return x.url; });
      if (!p) return null;
      let href = X.examPartLink(p, exam.id, student.id);
      if (ann && ann.variant) href += '&jucum_variant=' + encodeURIComponent(ann.variant);
      return href;
    })();
    if (open && canTake) return { phase: 'today', exam: exam, win: win, ann: ann, r: r, canTake: true, link: link, days: 0 };
    if (ann && ann.date) {
      const d = daysTo(ann.date);
      if (d >= 0 && !open) return { phase: 'announced', exam: exam, win: win, ann: ann, r: r, canTake: canTake, days: d, isToday: d === 0 };
      if (open && !canTake) return { phase: 'announced', exam: exam, win: win, ann: ann, r: r, canTake: false, days: 0, isToday: true };
      if (d < 0) return { phase: 'waitgrade', exam: exam, win: win, ann: ann, r: r };   // ya pasó: sin recordatorios
    }
    if (open && !canTake) return { phase: 'announced', exam: exam, win: win, ann: null, r: r, canTake: false, days: null };
    return { phase: 'ready', exam: exam, win: win, ann: ann, r: r };
  }

  /* ── Registro de las notas del M1 (Google Forms · primera nota enviada) ── */
  function normName(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function nameMatch(a, b) {
    const ta = normName(a).split(' ').filter(Boolean), tb = normName(b).split(' ').filter(Boolean);
    if (!ta.length || !tb.length) return false;
    if (ta.join(' ') === tb.join(' ')) return true;
    const short = ta.length <= tb.length ? ta : tb, long = ta.length <= tb.length ? tb : ta;
    if (short.length < 2) return false;
    return short.every(function (t) { return long.some(function (u) { return u === t || (t.length > 3 && u.length > 3 && (u.startsWith(t) || t.startsWith(u))); }); });
  }
  function formsExamId(level) { return 'ex-m1forms-' + level; }
  function formsWindowFor(group) {
    const X = window.JUCUM_EXAMS;
    return X.getWindows().find(function (w) { return w.examId === formsExamId(group.level) && w.groupId === group.id; }) || null;
  }
  function registerM1Forms(group) {
    const D = window.JUCUM_DATA, X = window.JUCUM_EXAMS, F = window.JUCUM_M1FORMS;
    if (!D || !X || !F) return { error: 'Faltan datos (exam-m1-forms.js).' };
    const mods = D.MODULE_CATALOG[group.level] || [];
    const m1 = mods[0]; if (!m1) return { error: 'El nivel no tiene módulos.' };
    if (formsWindowFor(group)) return { already: true };
    let exam = X.getExam(formsExamId(group.level));
    if (!exam) { X.createExam({ id: formsExamId(group.level), level: group.level, title: '📋 Examen M1 · Google Forms (' + F.dates + ')', moduleIds: [m1.id], parts: [] }); }
    const members = D.STUDENTS.filter(function (s) { return s.group === group.id; });
    const results = {}; const matched = []; const usedRows = new Set();
    members.forEach(function (s) {
      const row = F.rows.find(function (r0) { return !usedRows.has(r0) && nameMatch(r0.n, s.fullName); });
      if (!row) return;
      // duplicados del mismo alumno (nombre con typo): marca TODAS sus filas como usadas
      F.rows.forEach(function (r2) { if (nameMatch(r2.n, s.fullName)) usedRows.add(r2); });
      results[s.id] = { grade: row.p, passed: row.p >= 75, feedback: 'Rendido por Google Forms el ' + new Date(row.d + 'T12:00:00Z').toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }) + ', fuera de la plataforma (primera nota enviada).', gradedAt: row.d + 'T17:00:00.000Z' };
      matched.push({ student: s, row: row });
    });
    if (!matched.length) return { error: 'Ningún nombre del Forms coincide con alumnos de este grupo.' };
    X.createWindow({ id: 'ew-m1forms-' + group.id, examId: formsExamId(group.level), groupId: group.id, isOpen: false, published: true, results: results });
    const unmatchedStudents = members.filter(function (s) { return !results[s.id]; });
    return { matched: matched, unmatchedStudents: unmatchedStudents };
  }

  /* ── Eventos para el calendario de Planificar ── */
  function eventsForDay(groupId, dstr) {
    const D = window.JUCUM_DATA; if (!D) return [];
    const g = (D.GROUPS || []).find(function (x) { return x.id === groupId; }); if (!g) return [];
    const mods = D.MODULE_CATALOG[g.level] || [];
    const out = [];
    mods.forEach(function (m) {
      const a = getAnn(groupId, m.id);
      if (a && a.date === dstr) out.push({ kind: 'exam', icon: '🎓', moduleId: m.id, title: 'Examen · ' + m.name, sub: (a.from ? fmtHora(a.from) : '') + (a.to ? ' – ' + fmtHora(a.to) : '') + (a.auto === false ? ' · apertura manual' : ' · se abre solo') + (a.variant ? ' · versión ' + (a.variant === 'kids' ? 'niños' : 'adultos') : '') });
      const p = getPre(groupId, m.id);
      if (p && p.open) {
        if (p.fromDate === dstr) out.push({ kind: 'preexam', icon: '🧭', moduleId: m.id, title: 'Abre pre-examen · ' + m.name, sub: (p.from ? fmtHora(p.from) : '') });
        if (p.toDate === dstr && p.toDate !== p.fromDate) out.push({ kind: 'preexam', icon: '🧭', moduleId: m.id, title: 'Cierra pre-examen · ' + m.name, sub: (p.to ? fmtHora(p.to) : '') });
      }
    });
    return out;
  }

  window.JUCUM_EXAMFLOW = {
    pDay: pDay, pMin: pMin, fmtHora: fmtHora, fmtFecha: fmtFecha, daysTo: daysTo,
    getAnn: getAnn, setAnn: setAnn, getPre: getPre, setPre: setPre,
    isPreexamActivity: isPreexamActivity, preOpenNow: preOpenNow, preexamVisibleFor: preexamVisibleFor,
    annForWindow: annForWindow, winEffectiveOpen: winEffectiveOpen, infoForModule: infoForModule,
    registerM1Forms: registerM1Forms, formsWindowFor: formsWindowFor, eventsForDay: eventsForDay, hydrate: hydrate,
  };
})();
