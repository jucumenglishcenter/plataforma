/* 🔎 Seguimiento de clase · FOLLOWUP-V1 (07-oct-2026)
 * Aprobado en “Espejo - Seguimiento, cierre y reporte.html”.
 *  · FollowUpPanel  → “Desde la última clase”: EN CLASE (asistencia + materiales hechos ESE día) y
 *    EN CASA (sets del grupo desde la clase hasta el día antes de la próxima; solo cuenta lo hecho
 *    DESDE la clase — antes se marcaba ✓ cualquier práctica vieja). Historias = intentos totales.
 *    Se muestra arriba del Plan de clase, en el calendario (🔎 Seguimiento) y en “Subir plan”.
 *  · ClassCloseModal → 🏁 Terminar clase (Modo clase): Completo · Más corto · No se hizo + nota.
 *    Se guarda en el plan de clase como `closing` (TT.upsertClassPlan → nube con fusión).
 *  · fuReport → reporte para el Claude del teacher (después de la práctica, antes de planificar).
 * Regla de refuerzo (elegida por la usuaria): más de 1 alumno bajo 75 %. Prefijo fu* (ámbito global). */
const FU_MIN = 75;
const FU_DN = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const FU_MN = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const FU_CLOSE = [[1, '✓ Completo', 'Se hizo como estaba planeado', '#43A047', '#E8F5E9'], [2, '✂ Más corto', 'Se hizo, pero con menos tiempo o menos pasos', '#FB8C00', '#FFF4E5'], [3, '✗ No se hizo', 'Queda pendiente para la próxima', '#E53935', '#FDECEA']];
const FU_CRIT = { participation: 'Participación', speaking: 'Lectura en voz alta', attention: 'Atención', comprehension: 'Comprensión', topic: 'Tema', listening: 'Listening' };
const FU_LV = { 5: '⭐', 4: '👍', 3: '🙂', 2: '🤝' };
function fuPeru(iso) { if (!iso) return ''; const t = Date.parse(iso); if (!isFinite(t)) return String(iso).slice(0, 10); return new Date(t - 5 * 3600000).toISOString().slice(0, 10); }
function fuP(s) { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); }
function fuY(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function fuDay(s) { if (!s) return ''; const d = fuP(s); return FU_DN[d.getDay()] + ' ' + d.getDate() + ' ' + FU_MN[d.getMonth()]; }
function fuToday() { return new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10); }
function fuFirst(n) { return String(n || '').split(' ')[0]; }
/* Último plan de clase del grupo ANTES de una fecha */
function fuLastPlan(groupId, beforeDate) {
  const TT = window.JUCUM_TT; if (!TT || !groupId) return null;
  return TT.getClassPlans().filter(p => p.groupId === groupId && p.date && p.date < beforeDate).sort((a, b) => String(b.date).localeCompare(String(a.date)))[0] || null;
}
function fuNextClass(plan) {
  const TT = window.JUCUM_TT; const PI = window.JUCUM_PLANIMPORT;
  const nx = TT.getClassPlans().filter(p => p.groupId === plan.groupId && p.date && p.date > plan.date).sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];
  if (nx) return nx.date;
  const meta = PI && PI.groupMeta ? PI.groupMeta(plan.groupId) : null;
  if (meta && meta.days.length) { const d0 = fuP(plan.date); for (let i = 1; i <= 7; i++) { const d = new Date(d0); d.setDate(d0.getDate() + i); if (meta.days.includes(d.getDay())) return fuY(d); } }
  const d = fuP(plan.date); d.setDate(d.getDate() + 7); return fuY(d);
}
function fuActName(catalog, m) {
  for (const lv of Object.keys(catalog || {})) { const mod = (catalog[lv] || []).find(x => x.id === m.moduleId); if (mod) { const a = (mod.activities || []).find(x => x.id === m.activityId); if (a) return { a, mod }; } }
  return null;
}
function fuLabel(m, a) {
  if (m.label) return m.label;
  if (!a) return m.name || m.activityId;
  if (a.type === 'quizlet' && m.quizKey) return 'Quizlet · ' + ({ vocabulario: 'Vocabulario', vocabulario2: 'Vocabulario 2', traducir: 'Traducir', ordenar: 'Ordenar' }[m.quizKey] || m.quizKey);
  return a.name + (a.group ? ' · ' + a.group.replace(/^(T\d+)\s*·\s*/, '$1 ') : '');
}
const FU_NOGRADE = ['story', 'quizlet', 'summary', 'dialog'];
/* ── 🏠 EN-CASA-REAL-V1 (30-oct-2026, «Propuesta - Seguimiento unificado» Falla 1 + P1 + P4) ──
 * La práctica de una clase = los sets del grupo que EMPIEZAN entre el día de esa clase y la próxima clase, con SUS
 * fechas reales (antes: «hasta el día antes de la próxima», sin tope al final y mezclando el set anterior).
 * Celdas = JUCUM_SEG (nube, la MISMA función del 📊 Avance). Prohibido volver a calcular «lo hizo» aquí.
 * PRACTICE-DAYS-V1 sigue vigente: JUCUM_SEG toma el día real de daily_sessions (día Perú del intento), no la última fecha de progress. */
function fuAdd(s, n) { const d = fuP(s); d.setDate(d.getDate() + n); return fuY(d); }
function fuStamp(p) { return String((p && (p.savedAt || p.updatedAt || p.createdAt)) || ''); }
function fuDates(p) { return ((p && p.dates) || []).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(String(d))).map(String).sort(); }
function fuClassSets(plan, next, plans) {
  const TT = window.JUCUM_TT; if (!plan) return [];
  const by = {};
  (plans || (TT ? TT.getPracticePlans() : [])).filter(p => p && !p._deleted && p.groupId === plan.groupId && p.assignToStudents !== false).forEach(p => {
    const ds = fuDates(p); if (!ds.length || ds[0] < plan.date || ds[0] >= next) return;
    const k = (p.title || '') + '|' + ds[0] + '|' + ds[ds.length - 1];
    if (!by[k] || fuStamp(p) > fuStamp(by[k])) by[k] = p;
  });
  return Object.values(by).sort((a, b) => fuDates(a)[0].localeCompare(fuDates(b)[0]));
}
function fuHome(plan, plans) {
  const next = fuNextClass(plan), sets = fuClassSets(plan, next, plans);
  if (!sets.length) return { next, sets, from: plan.date, to: fuAdd(next, -1) };
  const all = sets.reduce((o, p) => o.concat(fuDates(p)), []).sort();
  return { next, sets, from: all[0], to: all[all.length - 1] };
}
/* Clases del grupo hasta hoy, una por día (si hay duplicadas gana la más nueva) */
function fuClassList(groupId) {
  const TT = window.JUCUM_TT; if (!TT || !groupId) return [];
  const t = fuToday(), by = {};
  TT.getClassPlans().filter(p => p.groupId === groupId && p.date && p.date <= t).forEach(p => { if (!by[p.date] || fuStamp(p) > fuStamp(by[p.date])) by[p.date] = p; });
  return Object.values(by).sort((a, b) => String(a.date).localeCompare(String(b.date)));
}
/* Modo clase: abre en la clase más reciente cuya práctica sigue abierta o cerró ayer */
function fuPickPlan(plan) {
  if (!plan) return null; const t = fuToday();
  const list = fuClassList(plan.groupId).reverse();
  for (const p of list.slice(0, 6)) { const h = fuHome(p); if (h.sets.length && h.from <= t && t <= fuAdd(h.to, 1)) return p; }
  return fuLastPlan(plan.groupId, plan.date) || list[0] || null;
}
function fuSegCell(c) {
  if (!c) return { st: 'skip' };
  if (c.s === 'ok') return { st: 'ok', pct: c.sc, day: c.d };
  if (c.s === 'low') return { st: 'lo', pct: c.sc, day: c.d };
  if (c.s === 'late' || c.s === 'prev' || c.s === 'mod') return { st: 'other', day: c.d, mod: c.s === 'mod' };
  return { st: 'no' };
}
/* ── Todos los datos del seguimiento de UNA clase · SF = datos de la nube (JUCUM_SEG.load); sin SF no hay celdas ── */
function fuData(plan, SF) {
  const D = window.JUCUM_DATA; const TT = window.JUCUM_TT; const A = window.JUCUM_ATT; const E = window.JUCUM_EVAL; const S = window.JUCUM_SEG;
  if (!plan || !D || !TT) return null;
  const group = (D.GROUPS || []).find(g => g.id === plan.groupId) || null;
  const students = S ? S.groupStudents(plan.groupId, null) : (D.STUDENTS || []).filter(s => s.group === plan.groupId && s.active !== false && !s.closedAt);
  const day = plan.date; const H = fuHome(plan, SF ? SF.plans : null); const next = H.next; const until = H.to;
  const today = fuToday(); const open = today <= H.to; const ready = !!(SF && S);
  const prog = {}; students.forEach(s => { prog[s.id] = D.getStudentProgress(s.id) || { completed: {} }; });
  const entry = (s, m) => (prog[s.id].completed || {})[m.moduleId + ':' + m.activityId] || null;
  /* Asistencia */
  const att = A ? A.getDay(day) : {};
  const attTaken = students.some(s => att[s.id]);
  const absent = students.filter(s => att[s.id] && att[s.id].status === 'falto');
  const present = students.filter(s => att[s.id] && att[s.id].status !== 'falto');
  /* EN CLASE: materiales del plan (bloques + lista) hechos ESE día — nube */
  const mats = []; const pushM = m => { if (m && m.moduleId && m.activityId && !mats.some(x => x.activityId === m.activityId && (x.quizKey || null) === (m.quizKey || null))) mats.push(m); };
  (plan.blocks || []).forEach(b => (b.mats || []).forEach(m => pushM({ moduleId: m.moduleId || plan.moduleId, activityId: m.activityId, quizKey: m.quizKey || null })));
  (plan.materials || []).forEach(m => pushM(m));
  const clsEv = ready ? students.map(s => S.evalSet({ id: 'fu-' + plan.id, dates: [day], activities: mats }, s, SF)) : [];
  const quizDone = (s, m) => (((SF && SF.days) || {})[String(s.id)] || {})[m.moduleId + ':' + m.activityId] || [];
  const classRows = !ready ? [] : mats.map(m => { const f = fuActName(D.MODULE_CATALOG, m); const a = f && f.a; const quiz = (a ? a.type : m.type) === 'quizlet' || m.activityId === 'quizlet';
    return { label: fuLabel(m, a), type: a ? a.type : m.type, cells: students.map((s, i) => {
      if (att[s.id] && att[s.id].status === 'falto') return { st: 'na' };
      if (quiz) return quizDone(s, m).indexOf(day) >= 0 ? { st: 'ok', day } : { st: 'no' };
      const ev = clsEv[i]; const c = ev ? ev.cells.find(x => x.k === m.moduleId + ':' + m.activityId) : null; return c ? fuSegCell(c) : { st: 'no' }; }) };
  }).filter(r => r.cells.some(c => c.st === 'ok' || c.st === 'lo'));
  /* EN CASA: el/los set(s) de ESTA clase, con sus fechas reales — misma evaluación que el 📊 Avance */
  const homeEv = ready ? H.sets.map(p => S.evalGroupSet((SF.plans || []).find(x => x.id === p.id) || p, SF)).filter(Boolean) : [];
  const homeRows = [];
  homeEv.forEach(G => G.acts.forEach(x => { if (homeRows.some(r => r.k === x.k)) return; const f = fuActName(D.MODULE_CATALOG, x.a);
    homeRows.push({ k: x.k, label: x.a.label || fuLabel(x.a, f && f.a), type: x.type, cells: students.map(s => { const row = G.rows.find(y => String(y.st.id) === String(s.id)); const c = row ? row.ev.cells.find(z => z.k === x.k && !z.carried) : null; return row ? fuSegCell(c) : { st: 'skip' }; }) }); }));
  /* Historias y diálogos: veces trabajadas (intentos) */
  const homeM = []; H.sets.forEach(p => (p.activities || []).forEach(m => { if (m.moduleId && m.activityId) homeM.push(m); }));
  const storyM = []; [...mats, ...homeM].forEach(m => { const f = fuActName(D.MODULE_CATALOG, m); if (f && f.a.type === 'story' && !storyM.some(x => x.activityId === m.activityId)) storyM.push({ ...m, label: f.a.name }); });
  const stories = storyM.map(m => ({ label: m.label, counts: students.map(s => { const e = entry(s, m); return e ? (e.attempts || 1) : 0; }) }));
  /* Evaluación del teacher en clase */
  const evals = {}; if (E) students.forEach(s => { (E.getEvaluations(s.id) || []).filter(e => (e.kind === 'clase' || !e.kind) && fuPeru(e.date) === day).forEach(e => { Object.keys(e.ratings || {}).forEach(k => { (evals[k] = evals[k] || []).push([fuFirst(s.fullName || s.username), e.ratings[k]]); }); }); });
  /* Cierre */
  const closing = plan.closing || null;
  /* Alertas y pendientes */
  const alerts = []; const pend = [];
  [...classRows, ...homeRows].forEach(r => { const low = r.cells.map((c, i) => [c, students[i]]).filter(([c]) => c.st === 'lo'); if (low.length > 1) { const t = r.label + ': ' + low.length + ' alumnos bajo la nota mínima (' + low.map(([c, s]) => fuFirst(s.fullName || s.username) + ' ' + c.pct).join(', ') + ')'; if (!alerts.includes(t)) { alerts.push(t); pend.push('Refuerzo ' + r.label + ': ' + low.map(([, s]) => fuFirst(s.fullName || s.username)).join(', ')); } } });
  const zero = !ready ? [] : students.filter((s, i) => (att[s.id] && att[s.id].status === 'falto') && homeRows.some(r => r.cells[i].st === 'no') && homeRows.every(r => r.cells[i].st === 'no' || r.cells[i].st === 'skip'));
  zero.forEach(s => { alerts.push(fuFirst(s.fullName || s.username) + ' no vino a clase y no practicó en casa'); pend.push(fuFirst(s.fullName || s.username) + ': ponerse al día (faltó y no practicó)'); });
  if (closing && closing.blocks) (plan.blocks || []).forEach(b => { const v = closing.blocks[b.id]; const why = (closing.why || {})[b.id]; if (v === 3) pend.push(b.title + ' (no se hizo' + (why ? ': ' + why : '') + ')'); if (v === 2) pend.push(b.title + ' (se hizo más corto' + (why ? ': ' + why : '') + ')'); });
  const homeDone = homeRows.reduce((n, r) => n + r.cells.filter(c => c.st === 'ok' || c.st === 'lo').length, 0), homeTotal = homeRows.reduce((n, r) => n + r.cells.filter(c => c.st !== 'skip').length, 0);
  return { plan, group, students, day, next, until, open, ready, homeFrom: H.from, homeTo: H.to, attTaken, absent, present, classRows, homeRows, sets: H.sets, stories, evals, closing, alerts, pend, homeDone, homeTotal };
}
function fuReport(plan, SF) {
  const F = fuData(plan, SF); if (!F || !F.ready) return '';
  const nm = s => fuFirst(s.fullName || s.username); const L = [];
  L.push('REPORTE DE SEGUIMIENTO · JUCUM English Center');
  L.push('Grupo: ' + (F.group ? F.group.name : '—'));
  L.push('Módulo: ' + (plan.moduleName || '—') + ' · ' + (plan.sessionLabel || '') + ' (' + fuDay(F.day) + ')');
  L.push('Período: clase ' + fuDay(F.day) + ' + práctica en casa ' + (F.sets.length ? fuDay(F.homeFrom) + ' → ' + fuDay(F.homeTo) + (F.open ? ' (la práctica en casa sigue abierta)' : '') : '(no hubo set de práctica)'));
  L.push('Datos reales de la plataforma (nube). Solo cuenta lo hecho dentro de las fechas. Regla de refuerzo: más de 1 alumno bajo la nota mínima.', '');
  L.push('1. ASISTENCIA', F.attTaken ? '- ' + F.present.length + ' de ' + F.students.length + (F.absent.length ? '. Faltó: ' + F.absent.map(nm).join(', ') + '.' : '. Vinieron todos.') : '- No se tomó asistencia.');
  if (F.attTaken && window.JUCUM_ATT) { const ad = window.JUCUM_ATT.getDay(F.day) || {}; const pp = F.present.map(s => [s, (ad[s.id] && ad[s.id].participation) || 0]); if (pp.some(x => x[1])) L.push('- Participación: ' + pp.filter(x => x[1]).sort((a, b) => b[1] - a[1]).map(([s, n]) => nm(s) + ' ' + n).join(' · ') + (pp.some(x => !x[1]) ? ' (no participó: ' + pp.filter(x => !x[1]).map(([s]) => nm(s)).join(', ') + ')' : '')); }
  L.push('');
  L.push('2. LO PLANEADO EN CLASE (cierre del teacher)');
  const cl = ['', 'completo', 'más corto', 'no se hizo'];
  (plan.blocks || []).forEach(b => { const v = F.closing && F.closing.blocks ? F.closing.blocks[b.id] : 0; const why = F.closing && F.closing.why ? F.closing.why[b.id] : ''; L.push('- ' + b.title + ' (' + b.mins + ' min): ' + (cl[v] || 'sin marcar') + (why && v > 1 ? ' — ' + why : '')); });
  if (!F.closing) L.push('  (La clase no se cerró con 🏁 Terminar clase.)');
  L.push('', '3. EN CLASE · resultados por alumno');
  if (!F.classRows.length) L.push('- Ningún material de la clase registró actividad ese día.');
  F.classRows.forEach(r => { const done = r.cells.map((c, i) => [c, F.students[i]]).filter(([c]) => c.st === 'ok' || c.st === 'lo'); const g = done.filter(([c]) => c.pct != null); L.push('- ' + r.label + ': ' + (g.length ? g.map(([c, s]) => nm(s) + ' ' + c.pct).join(' · ') + ' (promedio ' + Math.round(g.reduce((a, [c]) => a + c.pct, 0) / g.length) + ')' : done.length + ' lo hicieron')); });
  L.push('', '4. EN CASA · práctica' + (F.sets.length ? ' (' + fuDay(F.homeFrom) + ' → ' + fuDay(F.homeTo) + ')' : ''));
  if (!F.homeRows.length) L.push('- No hubo set de práctica para esos días.');
  F.homeRows.forEach(r => { const pairs = r.cells.map((c, i) => [c, F.students[i]]).filter(([c]) => c.st !== 'skip'); const done = pairs.filter(([c]) => c.st === 'ok' || c.st === 'lo'); const miss = pairs.filter(([c]) => c.st === 'no'); const oth = pairs.filter(([c]) => c.st === 'other'); const g = done.filter(([c]) => c.pct != null); const low = pairs.filter(([c]) => c.st === 'lo');
    L.push('- ' + r.label + ': ' + done.length + '/' + pairs.length + (g.length ? ' · promedio ' + Math.round(g.reduce((a, [c]) => a + c.pct, 0) / g.length) : '') + (low.length ? ' · bajo la nota mínima: ' + low.map(([c, s]) => nm(s) + ' ' + c.pct).join(', ') + (low.length > 1 ? ' → REFUERZO' : '') : '') + (oth.length ? ' (lo hizo otro día: ' + oth.map(([, s]) => nm(s)).join(', ') + ')' : '') + (miss.length ? ' (no lo hicieron: ' + miss.map(([, s]) => nm(s)).join(', ') + ')' : '')); });
  L.push('', '5. HISTORIAS Y DIÁLOGOS · veces trabajadas');
  if (!F.stories.length) L.push('- (sin historias en esta clase)');
  F.stories.forEach(r => L.push('- ' + r.label + ': ' + r.counts.map((n, i) => [n, F.students[i]]).sort((a, b) => b[0] - a[0]).map(([n, s]) => nm(s) + ' ' + n).join(' · ')));
  const ek = Object.keys(F.evals);
  L.push('', '6. EVALUACIÓN DEL TEACHER EN CLASE'); if (!ek.length) L.push('- (no se evaluó)');
  ek.forEach(k => L.push('- ' + (FU_CRIT[k] || k) + ': ' + F.evals[k].map(([n, v]) => (FU_LV[v] || v) + ' ' + n).join(' · ')));
  L.push('', '7. PENDIENTES PARA LA PRÓXIMA CLASE'); const nb = plan.nextBox || null; const carry = (plan.carry || []).filter(Boolean);
  if (!F.pend.length && !(nb && (carry.length || (nb.notes || []).length))) L.push('- (ninguno)'); F.pend.forEach(p => L.push('- ' + p));
  if (nb) { carry.forEach((c, i) => L.push('- [' + ((nb.done || {})[i] ? 'listo' : 'pendiente') + '] ' + ((nb.edit || {})[i] != null ? nb.edit[i] : c))); (nb.notes || []).forEach(n => L.push('- Apunte del teacher: ' + n.t)); }
  if (F.closing && F.closing.note) L.push('', '8. NOTAS DEL TEACHER', '- ' + F.closing.note);
  return L.join('\n');
}
/* ── UI ── marcas = las mismas del 📊 Avance (P2) */
const FU_CELL = { ok:{ bg:'#2EA84B', fg:'#fff', bd:'none' }, lo:{ bg:'#FBE3DC', fg:'#A3361F', bd:'1px solid #F0A898' }, other:{ bg:'#F2C14E', fg:'#6B4E00', bd:'none' }, no:{ bg:'#EFEDE6', fg:'#B8B2A2', bd:'1px dashed #DAD5C6' }, na:{ bg:'#F7F5EF', fg:'#B0A994', bd:'1px solid #EEE9DC' }, skip:{ bg:'transparent', fg:'#B8B2A2', bd:'none' } };
function fuShort(s) { if (!s) return ''; const d = fuP(s); return FU_DN[d.getDay()] + ' ' + d.getDate(); }
function fuCell(c, w) {
  const v = FU_CELL[c && c.st] || FU_CELL.no;
  const txt = !c ? '' : c.st === 'ok' ? '✓' + (c.pct != null ? ' ' + c.pct + '%' : '') : c.st === 'lo' ? c.pct + '%' : c.st === 'other' ? (c.mod ? '≠ otro módulo' : '✓ ' + fuShort(c.day)) : c.st === 'na' ? 'faltó' : c.st === 'skip' ? '—' : '';
  const tip = !c ? '' : c.st === 'ok' ? 'hecha' + (c.day ? ' el ' + fuDay(c.day) : '') : c.st === 'lo' ? 'la hizo con ' + c.pct + '% (no aprobó)' : c.st === 'other' ? (c.mod ? 'hizo el mismo material de otro módulo' : 'la hizo otro día (' + fuDay(c.day) + '): no cuenta aquí') : c.st === 'na' ? 'no vino a clase' : c.st === 'skip' ? 'no se le pidió (ya lo tenía aprobado)' : 'pendiente';
  return <span title={tip} style={{display:'inline-flex', alignItems:'center', justifyContent:'center', minWidth: w || 64, height:24, borderRadius:6, padding:'0 7px', background:v.bg, color:v.fg, border:v.bd, boxSizing:'border-box', fontSize:10.5, fontWeight:900, whiteSpace:'nowrap'}}>{txt}</span>;
}
const fuSrc = { display:'flex', gap:8, alignItems:'flex-start', background:'#EEF2FC', border:'1px solid #C9D4F0', borderRadius:10, padding:'8px 11px', fontSize:12, fontWeight:700, color:'#1F3A8A', lineHeight:1.45 };
const fuChip = (bg, c) => ({ display:'inline-flex', alignItems:'center', gap:5, fontSize:11.5, fontWeight:800, background:bg, color:c, borderRadius:20, padding:'4px 10px', whiteSpace:'nowrap' });
const fuBtn = { border:'1.5px solid #D6DEEA', background:'#fff', color:'#33415C', borderRadius:10, padding:'7px 12px', fontFamily:'inherit', fontWeight:800, fontSize:12.5, cursor:'pointer', whiteSpace:'nowrap' };
const fuBtnP = { ...fuBtn, border:'none', background:'linear-gradient(135deg,#3F5BB8,#0D1B5A)', color:'#fff' };
const fuNav = { ...fuBtn, minHeight:38, padding:'7px 13px' };
function FuTable({ rows, students }) {
  if (!rows.length) return null;
  return (
    <div style={{overflowX:'auto', overflowY:'hidden'}}>
      <table style={{borderCollapse:'collapse', width:'100%', minWidth: Math.max(320, 130 + rows.length * 96)}}>
        <thead><tr><th style={{fontSize:10.5, fontWeight:800, color:'#8a7f6a', textAlign:'left', padding:'4px'}}>Alumno</th>{rows.map((r, i) => <th key={i} style={{fontSize:10.5, fontWeight:800, color:'#5B3FA0', padding:'4px', textAlign:'center', lineHeight:1.25, verticalAlign:'bottom'}}>{r.label}</th>)}</tr></thead>
        <tbody>{students.map((s, si) => <tr key={s.id}><td style={{fontWeight:800, fontSize:12.5, padding:'5px 4px', borderTop:'1px solid #F2ECDD', whiteSpace:'nowrap'}}>{(s.fullName || s.username || '').split(' ').slice(0, 2).join(' ')}</td>{rows.map((r, i) => <td key={i} style={{textAlign:'center', borderTop:'1px solid #F2ECDD', padding:'4px'}}>{fuCell(r.cells[si])}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
function FuReportBox({ plan, SF }) {
  const [copied, setCopied] = React.useState(false);
  const txt = fuReport(plan, SF);
  if (!txt) return <div style={{fontSize:12.5, color:'#8a7f6a', fontWeight:800}}>Cargando la práctica desde la nube para armar el reporte…</div>;
  return (
    <div style={{display:'flex', flexDirection:'column', gap:8}}>
      <div style={{fontSize:12.5, color:'#7a705c', fontWeight:700, lineHeight:1.5}}><b>Para qué sirve:</b> pégalo en tu chat de Claude <b>antes de planificar la siguiente clase</b>, cuando los alumnos ya practicaron en casa. Así tu Claude sabe qué se hizo, qué faltó y cómo le fue a cada alumno.</div>
      <pre style={{fontFamily:'ui-monospace,Menlo,monospace', fontSize:12, background:'#0F172A', color:'#E2E8F0', borderRadius:12, padding:14, whiteSpace:'pre-wrap', lineHeight:1.55, maxHeight:480, overflow:'auto', margin:0}}>{txt}</pre>
      <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
        <button onClick={() => { try { navigator.clipboard.writeText(txt).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }); } catch (e) { window.prompt('Copia el reporte:', txt); } }} style={fuBtnP}>{copied ? '✓ Copiado' : 'Copiar reporte'}</button>
        <button onClick={() => { const b = new Blob([txt], { type:'text/plain' }); const u = URL.createObjectURL(b); const l = document.createElement('a'); l.href = u; l.download = 'Seguimiento - ' + (plan.sessionLabel || 'clase') + ' - ' + plan.date + '.txt'; l.click(); setTimeout(() => URL.revokeObjectURL(u), 2000); }} style={fuBtn}>⬇ Descargar .txt</button>
      </div>
    </div>
  );
}
/* where: 'plan' (arriba del plan de clase) · 'cal' (calendario) · 'class' (Modo clase) · 'full'
 * CLASE-SELECTOR-V1 (30-oct): ‹ › para pasar a otra clase del grupo; cada clase muestra SU práctica en casa. */
function FollowUpPanel({ plan, where, onAddPending, startOpen }) {
  const S = window.JUCUM_SEG;
  const [open, setOpen] = React.useState(!!startOpen);
  const [rep, setRep] = React.useState(false);
  const [curId, setCurId] = React.useState(null);
  React.useEffect(() => { setCurId(null); }, [plan && plan.id]);
  const list = plan ? fuClassList(plan.groupId) : [];
  const base = plan ? (list.find(p => p.date === plan.date) || plan) : null;
  if (base && !list.some(p => p.id === base.id)) { list.push(base); list.sort((a, b) => String(a.date).localeCompare(String(b.date))); }
  const cur = (curId && list.find(p => p.id === curId)) || base;
  const idx = cur ? list.findIndex(p => p.id === cur.id) : -1;
  const ids = plan && S ? S.groupStudents(plan.groupId, null).map(s => s.id) : [];
  const since = S && cur ? (() => { const d45 = S.addD(S.today(), -45); return cur.date < d45 ? cur.date : d45; })() : '';
  const seg = window.useSegFacts ? window.useSegFacts({ ids, groups: [], since }) : { F: null };
  const SF = seg.F;
  const F = React.useMemo(() => fuData(cur, SF), [cur && cur.id, cur && cur.closing && cur.closing.at, SF && SF.at]);
  if (!plan) return where === 'plan' ? null : <div className="scard" style={{fontSize:13, color:'#8a7f6a', fontWeight:700}}>Este grupo aún no tiene clases anteriores guardadas.</div>;
  if (!F) return null;
  const nm = s => fuFirst(s.fullName || s.username);
  const head = where === 'plan' ? '🔎 Antes de planificar: seguimiento de la clase' : where === 'cal' ? '🔎 Seguimiento de esta clase' : where === 'class' ? '📊 Seguimiento por clase' : '🔎 Seguimiento por clase';
  const prev = idx > 0 ? list[idx - 1] : null, nxt = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null;
  const homeTxt = F.sets.length ? fuDay(F.homeFrom) + ' → ' + fuDay(F.homeTo) : null;
  return (
    <div className="scard" style={{marginBottom:16, border:'2px solid #9FB0DA', display:'flex', flexDirection:'column', gap:10}}>
      <div style={{display:'flex', alignItems:'center', gap:10, flexWrap:'wrap'}}>
        <div className="sec-title" style={{flex:1, minWidth:200}}>{head}</div>
        <button onClick={() => setRep(r => !r)} style={fuBtn}>📤 {rep ? 'Ocultar reporte' : 'Reporte para tu Claude'}</button>
        <button onClick={() => setOpen(o => !o)} style={open ? fuBtn : fuBtnP}>{open ? '▲ Ocultar' : '▼ Ver todo'}</button>
      </div>
      {list.length > 1 && (
        <div style={{display:'flex', gap:6, flexWrap:'wrap', alignItems:'center'}}>
          <button type="button" disabled={!prev} onClick={() => prev && setCurId(prev.id)} style={{...fuNav, opacity: prev ? 1 : .4, cursor: prev ? 'pointer' : 'default'}}>‹ {prev ? fuDay(prev.date) : ''}</button>
          <span style={{...fuNav, background:'#0D1B5A', borderColor:'#0D1B5A', color:'#fff', cursor:'default', display:'inline-flex', alignItems:'center'}}>{fuDay(cur.date)}{cur.sessionLabel ? ' · ' + cur.sessionLabel : ''}</span>
          <button type="button" disabled={!nxt} onClick={() => nxt && setCurId(nxt.id)} style={{...fuNav, opacity: nxt ? 1 : .4, cursor: nxt ? 'pointer' : 'default'}}>{nxt ? fuDay(nxt.date) : ''} ›</button>
        </div>)}
      <div style={{display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', fontSize:12.5, color:'#7a705c', fontWeight:700}}>
        <span style={{flex:1, minWidth:220}}>🏫 Clase {fuDay(F.day)} · 🏠 {homeTxt ? 'práctica ' + homeTxt + (F.open ? ' · en curso' : ' · cerrada') : 'sin set de práctica para esta clase'}</span>
        {window.SegAgo && <SegAgo F={SF} busy={seg.busy} err={seg.err} onReload={seg.reload} />}
      </div>
      <div style={{display:'flex', gap:7, flexWrap:'wrap'}}>
        {F.attTaken ? <span style={fuChip('#E8F5E9', '#1B5E20')}>🏫 Asistieron {F.present.length} de {F.students.length}</span> : <span style={fuChip('#ECEFF1', '#546E7A')}>🏫 Sin asistencia</span>}
        {!F.ready ? <span style={fuChip('#EEF2FC', '#1F3A8A')}>🏠 Cargando la práctica desde la nube…</span> : F.homeTotal > 0 ? <span style={fuChip('#EEF2FC', '#1F3A8A')}>🏠 Práctica en casa: {F.homeDone} de {F.homeTotal} hechas</span> : <span style={fuChip('#ECEFF1', '#546E7A')}>🏠 Sin set de práctica</span>}
        {F.closing ? <span style={fuChip('#E8F5E9', '#1B5E20')}>🏁 Clase terminada</span> : (F.day <= fuToday() ? <span style={fuChip('#FFF4E5', '#7A4A00')}>🏁 Sin cierre</span> : null)}
      </div>
      {F.alerts.length > 0 && <div style={{display:'flex', gap:9, background:'#FFF4E5', border:'1px solid #FFCC80', borderRadius:10, padding:'9px 12px', fontSize:12.5, fontWeight:700, color:'#7A4A00', lineHeight:1.45}}>⚠<div>{F.alerts.map((a, i) => <div key={i}>{a}</div>)}</div></div>}
      {F.pend.length > 0 && (
        <div style={{display:'flex', flexDirection:'column', gap:6}}>
          <div style={{fontSize:12.5, fontWeight:800, color:'#0D1B5A'}}>Pendientes: <span style={{fontWeight:700, color:'#444'}}>{F.pend.join(' · ')}</span></div>
          {where === 'plan' && onAddPending && <div><button onClick={() => onAddPending(F.pend)} style={fuBtn}>＋ Agregar los pendientes como bloque</button></div>}
        </div>)}
      {rep && <FuReportBox plan={cur} SF={SF} />}
      {open && (
        <div style={{display:'flex', flexDirection:'column', gap:14}}>
          <div style={{display:'flex', flexDirection:'column', gap:9, border:'1px solid #E3DCC9', borderRadius:12, padding:12}}>
            <b style={{fontFamily:"'Fredoka',sans-serif", fontSize:15.5}}>🏫 En clase · {fuDay(F.day)}</b>
            <div style={fuSrc}>📍 <span><b>De dónde sale:</b> la asistencia que tomaste y los materiales del plan que los alumnos hicieron <b>ese día</b> (datos de la nube). Story, Resumen y Quizlet no llevan nota: ✓ = lo hizo.</span></div>
            {F.absent.length > 0 && <div style={{fontSize:12.5, fontWeight:700, color:'#8E1B1B'}}>Faltó: {F.absent.map(nm).join(', ')}</div>}
            {!F.ready ? <div style={{fontSize:12.5, color:'#8a7f6a', fontWeight:800}}>Cargando desde la nube…</div> : F.classRows.length ? <FuTable rows={F.classRows} students={F.students} /> : <div style={{fontSize:12.5, color:'#999', fontWeight:700}}>Ningún material de la clase registró actividad ese día.</div>}
            <div style={{display:'flex', gap:10, flexWrap:'wrap', alignItems:'center', fontSize:11, color:'#6B7280', fontWeight:800}}>{fuCell({ st:'ok' }, 30)} hecha ese día {fuCell({ st:'lo', pct:60 }, 30)} nota baja {fuCell({ st:'other', day:F.day }, 30)} la hizo otro día {fuCell({ st:'no' }, 30)} no la hizo {fuCell({ st:'na' }, 30)}</div>
            {F.closing && <div style={{fontSize:12.5, color:'#555', lineHeight:1.5}}><b>Al terminar marcaste:</b> {(cur.blocks || []).map(b => { const v = F.closing.blocks ? F.closing.blocks[b.id] : 0; return (v === 1 ? '✓ ' : v === 2 ? '✂ ' : v === 3 ? '✗ ' : '· ') + b.title; }).join(' · ')}</div>}
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:9, border:'1px solid #E3DCC9', borderRadius:12, padding:12}}>
            <b style={{fontFamily:"'Fredoka',sans-serif", fontSize:15.5}}>🏠 Práctica en casa{homeTxt ? ' · ' + homeTxt : ''}</b>
            <div style={fuSrc}>📍 <span><b>De dónde sale:</b> el set de práctica de <b>esta</b> clase, con sus fechas reales. Es la misma tabla del 📊 Avance: solo cuenta lo hecho dentro de esas fechas. Toca un nombre para ver su seguimiento.</span></div>
            {F.sets.length && window.PracticeSetProgress ? F.sets.map(p => <PracticeSetProgress key={p.id} plan={p} embed />) : <div style={{fontSize:12.5, color:'#999', fontWeight:700}}>No hubo set de práctica para esta clase.</div>}
          </div>
          {window.RhythmPanel && <RhythmPanel groupId={cur.groupId} />}
          {F.stories.length > 0 && (
            <div style={{display:'flex', flexDirection:'column', gap:8, border:'1px solid #E3DCC9', borderRadius:12, padding:12}}>
              <b style={{fontFamily:"'Fredoka',sans-serif", fontSize:15.5}}>📖 Historias y diálogos · veces trabajadas (clase + casa)</b>
              <div style={{overflowX:'auto', overflowY:'hidden'}}><table style={{borderCollapse:'collapse', width:'100%', minWidth:360}}><thead><tr><th style={{fontSize:10.5, color:'#8a7f6a', textAlign:'left', padding:4}}></th>{F.students.map(s => <th key={s.id} style={{fontSize:10.5, color:'#8a7f6a', padding:4}}>{nm(s)}</th>)}</tr></thead>
                <tbody>{F.stories.map((r, i) => <tr key={i}><td style={{fontSize:12.5, fontWeight:800, padding:'5px 4px', borderTop:'1px solid #F2ECDD'}}>{r.label}</td>{r.counts.map((n, k) => <td key={k} style={{textAlign:'center', borderTop:'1px solid #F2ECDD', fontWeight:800, fontSize:14, color: n < 3 ? '#C0392B' : '#1F3A8A'}}>{n}</td>)}</tr>)}</tbody></table></div>
            </div>)}
        </div>)}
    </div>
  );
}
function FollowUpModal({ plan, onClose }) {
  return (
    <div onClick={onClose} style={{position:'fixed', inset:0, background:'rgba(0,0,0,.42)', zIndex:80, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'30px 14px', overflowY:'auto'}}>
      <div onClick={e => e.stopPropagation()} style={{background:'#F5F7FB', borderRadius:18, padding:16, maxWidth:1000, width:'100%'}}>
        <FollowUpPanel plan={plan} where="cal" startOpen />
        <button onClick={onClose} style={{...fuBtn, width:'100%'}}>Cerrar</button>
      </div>
    </div>
  );
}
/* 🏁 Terminar clase */
function ClassCloseModal({ plan, onClose, onSaved, onOpenRoster, onOpenEval }) {
  const TT = window.JUCUM_TT; const A = window.JUCUM_ATT; const D = window.JUCUM_DATA;
  const prev = plan.closing || {};
  const [marks, setMarks] = React.useState(prev.blocks || {});
  const [why, setWhy] = React.useState(prev.why || {});
  const [note, setNote] = React.useState(prev.note || '');
  const students = (D.STUDENTS || []).filter(s => s.group === plan.groupId && s.active !== false);
  const att = A ? A.getDay(plan.date) : {};
  const attOk = students.some(s => att[s.id]); const nPres = students.filter(s => att[s.id] && att[s.id].status !== 'falto').length;
  const evalOk = window.JUCUM_EVAL ? students.some(s => (window.JUCUM_EVAL.getEvaluations(s.id) || []).some(e => fuPeru(e.date) === plan.date)) : false;
  const save = () => {
    const closing = { at: new Date().toISOString(), blocks: marks, why, note: note.trim() };
    const all = TT.getClassPlans(); const cur = all.find(p => p.id === plan.id) || plan;
    TT.upsertClassPlan({ ...cur, closing });
    onSaved && onSaved({ ...cur, closing });
  };
  return (
    <div onClick={onClose} style={{position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:90, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'30px 14px', overflowY:'auto'}}>
      <div onClick={e => e.stopPropagation()} style={{background:'#fff', borderRadius:18, padding:'18px 20px', maxWidth:720, width:'100%', display:'flex', flexDirection:'column', gap:12, border:'2px solid #FFC107'}}>
        <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:20}}>🏁 Terminar la clase · {plan.sessionLabel}</div>
        <div style={{display:'flex', gap:8, flexWrap:'wrap', alignItems:'center'}}>
          {attOk ? <span style={fuChip('#E8F5E9', '#1B5E20')}>✓ Asistencia tomada · {nPres} de {students.length}</span> : <button onClick={onOpenRoster} style={{...fuBtn, borderColor:'#F0C28A', color:'#9C5D00'}}>⚠ Falta tomar asistencia →</button>}
          {evalOk ? <span style={fuChip('#E8F5E9', '#1B5E20')}>✓ Clase evaluada</span> : <button onClick={onOpenEval} style={{...fuBtn, borderColor:'#F0C28A', color:'#9C5D00'}}>Evaluar la clase (opcional) →</button>}
        </div>
        {window.PzCloseSummary && <PzCloseSummary students={students.filter(s => !s.closedAt)} date={plan.date} />}
        <div style={{fontSize:12.5, fontWeight:800, color:'#0D1B5A'}}>1 · ¿Qué pasó con cada bloque que planeaste?</div>
        <div style={{fontSize:12, color:'#7a705c', fontWeight:700, marginTop:-6}}>Un toque por bloque. Lo que no se hizo pasa solo a “Pendientes” del próximo plan y al reporte para tu Claude.</div>
        {(plan.blocks || []).map(b => { const v = marks[b.id] || 0; return (
          <div key={b.id} style={{border:'1px solid #E3DCC9', borderRadius:12, padding:'10px 12px', display:'flex', flexDirection:'column', gap:8}}>
            <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}><span style={{fontSize:16}}>{b.emoji}</span><b style={{flex:1, fontSize:13.5}}>{b.title}</b><span style={{fontSize:11.5, color:'#8a7f6a', fontWeight:700}}>{b.mins} min planeados</span></div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:7}}>
              {FU_CLOSE.map(([k, l, s, c, bg]) => <button key={k} onClick={() => setMarks(m => ({ ...m, [b.id]: m[b.id] === k ? 0 : k }))} style={{border:'2px solid ' + (v === k ? c : '#E3DCC9'), background: v === k ? bg : '#fff', borderRadius:11, padding:'8px 6px', fontFamily:'inherit', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:2}}><b style={{fontSize:13}}>{l}</b><span style={{fontSize:10.5, color:'#8a7f6a', fontWeight:700, lineHeight:1.3, textAlign:'center'}}>{s}</span></button>)}
            </div>
            {v > 1 && <input value={why[b.id] || ''} onChange={e => setWhy(w => ({ ...w, [b.id]: e.target.value }))} placeholder="¿Por qué? (opcional)" style={{border:'1px solid #E3DCC9', borderRadius:9, padding:'7px 10px', fontFamily:'inherit', fontSize:13}} />}
          </div>); })}
        <div style={{fontSize:12.5, fontWeight:800, color:'#0D1B5A'}}>2 · Nota para la próxima clase (opcional)</div>
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Ej.: empezar repasando el paso 3" style={{border:'1px solid #E3DCC9', borderRadius:9, padding:'8px 10px', fontFamily:'inherit', fontSize:13}} />
        <div style={{display:'flex', gap:8, flexWrap:'wrap', alignItems:'center'}}>
          <button onClick={save} style={{...fuBtnP, background:'linear-gradient(135deg,#2E7D32,#1B5E20)', fontSize:13.5, padding:'9px 15px'}}>✓ Guardar y terminar la clase</button>
          <button onClick={onClose} style={fuBtn}>Volver a la clase</button>
          <span style={{fontSize:11.5, color:'#8a7f6a', fontWeight:700}}>Se puede corregir después desde el calendario.</span>
        </div>
      </div>
    </div>
  );
}
Object.assign(window, { FollowUpPanel, FollowUpModal, ClassCloseModal, fuLastPlan, fuPickPlan, fuReport, fuData });
