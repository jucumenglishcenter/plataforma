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
/* ── Todos los datos del seguimiento de UNA clase ── */
function fuData(plan) {
  const D = window.JUCUM_DATA; const TT = window.JUCUM_TT; const A = window.JUCUM_ATT; const E = window.JUCUM_EVAL;
  if (!plan || !D || !TT) return null;
  const group = (D.GROUPS || []).find(g => g.id === plan.groupId) || null;
  const students = (D.STUDENTS || []).filter(s => s.group === plan.groupId && s.active !== false && !s.closedAt);
  const day = plan.date; const next = fuNextClass(plan); const until = (() => { const d = fuP(next); d.setDate(d.getDate() - 1); return fuY(d); })();
  const today = fuToday(); const open = today <= until;
  const prog = {}; students.forEach(s => { prog[s.id] = D.getStudentProgress(s.id) || { completed: {} }; });
  const entry = (s, m) => (prog[s.id].completed || {})[m.moduleId + ':' + m.activityId] || null;
  const cell = (s, m, a, test) => {
    const e = entry(s, m); if (!e || !e.date) return { st: 'no' }; const dd = fuPeru(e.date); if (!test(dd)) return { st: 'no' };
    const noGrade = FU_NOGRADE.includes(a ? a.type : m.type); const pct = D.scorePct ? D.scorePct(e.score) : (typeof e.score === 'number' ? Math.round(e.score) : null);
    const ok = noGrade || pct == null ? true : (D.entryPassed ? D.entryPassed(e, s.level, s.group) : pct >= FU_MIN);
    return { st: ok ? 'ok' : 'lo', pct: noGrade ? null : pct, day: dd };
  };
  /* Asistencia */
  const att = A ? A.getDay(day) : {};
  const attTaken = students.some(s => att[s.id]);
  const absent = students.filter(s => att[s.id] && att[s.id].status === 'falto');
  const present = students.filter(s => att[s.id] && att[s.id].status !== 'falto');
  /* EN CLASE: materiales del plan (bloques + lista), hechos ESE día */
  const mats = []; const pushM = m => { if (m && m.moduleId && m.activityId && !mats.some(x => x.activityId === m.activityId && (x.quizKey || null) === (m.quizKey || null))) mats.push(m); };
  (plan.blocks || []).forEach(b => (b.mats || []).forEach(m => pushM({ moduleId: m.moduleId || plan.moduleId, activityId: m.activityId, quizKey: m.quizKey || null })));
  (plan.materials || []).forEach(m => pushM(m));
  const classRows = mats.map(m => { const f = fuActName(D.MODULE_CATALOG, m); const a = f && f.a; return { label: fuLabel(m, a), type: a ? a.type : m.type, cells: students.map(s => (att[s.id] && att[s.id].status === 'falto') ? { st: 'na' } : cell(s, m, a, dd => dd === day)) }; }).filter(r => r.cells.some(c => c.st !== 'no' && c.st !== 'na'));
  /* EN CASA: sets de práctica del grupo con días en [clase, día antes de la próxima] */
  const sets = TT.getPracticePlans().filter(p => p.groupId === plan.groupId && p.assignToStudents !== false && (p.dates || []).some(d => d >= day && d <= until));
  const homeM = []; sets.forEach(p => (p.activities || []).forEach(m => { if (m.moduleId && m.activityId && !homeM.some(x => x.activityId === m.activityId && (x.quizKey || null) === (m.quizKey || null))) homeM.push(m); }));
  const homeRows = homeM.map(m => { const f = fuActName(D.MODULE_CATALOG, m); const a = f && f.a; return { label: fuLabel(m, a), type: a ? a.type : m.type, cells: students.map(s => cell(s, m, a, dd => dd >= day)) }; });
  /* Historias y diálogos: veces trabajadas (intentos) */
  const storyM = []; [...mats, ...homeM].forEach(m => { const f = fuActName(D.MODULE_CATALOG, m); if (f && f.a.type === 'story' && !storyM.some(x => x.activityId === m.activityId)) storyM.push({ ...m, label: f.a.name }); });
  const stories = storyM.map(m => ({ label: m.label, counts: students.map(s => { const e = entry(s, m); return e ? (e.attempts || 1) : 0; }) }));
  /* Evaluación del teacher en clase */
  const evals = {}; if (E) students.forEach(s => { (E.getEvaluations(s.id) || []).filter(e => (e.kind === 'clase' || !e.kind) && fuPeru(e.date) === day).forEach(e => { Object.keys(e.ratings || {}).forEach(k => { (evals[k] = evals[k] || []).push([fuFirst(s.fullName || s.username), e.ratings[k]]); }); }); });
  /* Cierre */
  const closing = plan.closing || null;
  /* Alertas y pendientes */
  const alerts = []; const pend = [];
  [...classRows, ...homeRows].forEach(r => { const low = r.cells.map((c, i) => [c, students[i]]).filter(([c]) => c.st === 'lo' || (c.pct != null && c.pct < FU_MIN)); if (low.length > 1) { const t = r.label + ': ' + low.length + ' alumnos bajo ' + FU_MIN + ' % (' + low.map(([c, s]) => fuFirst(s.fullName || s.username) + ' ' + c.pct).join(', ') + ')'; if (!alerts.includes(t)) { alerts.push(t); pend.push('Refuerzo ' + r.label + ': ' + low.map(([, s]) => fuFirst(s.fullName || s.username)).join(', ')); } } });
  const zero = students.filter((s, i) => (att[s.id] && att[s.id].status === 'falto') && homeRows.length && homeRows.every(r => r.cells[i].st === 'no'));
  zero.forEach(s => { alerts.push(fuFirst(s.fullName || s.username) + ' no vino a clase y no practicó en casa'); pend.push(fuFirst(s.fullName || s.username) + ': ponerse al día (faltó y no practicó)'); });
  if (closing && closing.blocks) (plan.blocks || []).forEach(b => { const v = closing.blocks[b.id]; const why = (closing.why || {})[b.id]; if (v === 3) pend.push(b.title + ' (no se hizo' + (why ? ': ' + why : '') + ')'); if (v === 2) pend.push(b.title + ' (se hizo más corto' + (why ? ': ' + why : '') + ')'); });
  const homeDone = homeRows.reduce((n, r) => n + r.cells.filter(c => c.st !== 'no').length, 0), homeTotal = homeRows.length * students.length;
  return { plan, group, students, day, next, until, open, attTaken, absent, present, classRows, homeRows, sets, stories, evals, closing, alerts, pend, homeDone, homeTotal };
}
function fuReport(plan) {
  const F = fuData(plan); if (!F) return '';
  const nm = s => fuFirst(s.fullName || s.username); const L = [];
  L.push('REPORTE DE SEGUIMIENTO · JUCUM English Center');
  L.push('Grupo: ' + (F.group ? F.group.name : '—'));
  L.push('Módulo: ' + (plan.moduleName || '—') + ' · ' + (plan.sessionLabel || '') + ' (' + fuDay(F.day) + ')');
  L.push('Período: clase ' + fuDay(F.day) + ' + práctica en casa ' + fuDay(F.day) + ' → ' + fuDay(F.until) + (F.open ? ' (la práctica en casa sigue abierta)' : ''));
  L.push('Datos reales de la plataforma. Regla de refuerzo: más de 1 alumno bajo ' + FU_MIN + ' %.', '');
  L.push('1. ASISTENCIA', F.attTaken ? '- ' + F.present.length + ' de ' + F.students.length + (F.absent.length ? '. Faltó: ' + F.absent.map(nm).join(', ') + '.' : '. Vinieron todos.') : '- No se tomó asistencia.', '');
  L.push('2. LO PLANEADO EN CLASE (cierre del teacher)');
  const cl = ['', 'completo', 'más corto', 'no se hizo'];
  (plan.blocks || []).forEach(b => { const v = F.closing && F.closing.blocks ? F.closing.blocks[b.id] : 0; const why = F.closing && F.closing.why ? F.closing.why[b.id] : ''; L.push('- ' + b.title + ' (' + b.mins + ' min): ' + (cl[v] || 'sin marcar') + (why && v > 1 ? ' — ' + why : '')); });
  if (!F.closing) L.push('  (La clase no se cerró con 🏁 Terminar clase.)');
  L.push('', '3. EN CLASE · resultados por alumno');
  if (!F.classRows.length) L.push('- Ningún material de la clase registró actividad ese día.');
  F.classRows.forEach(r => { const done = r.cells.map((c, i) => [c, F.students[i]]).filter(([c]) => c.st === 'ok' || c.st === 'lo'); const g = done.filter(([c]) => c.pct != null); L.push('- ' + r.label + ': ' + (g.length ? g.map(([c, s]) => nm(s) + ' ' + c.pct).join(' · ') + ' (promedio ' + Math.round(g.reduce((a, [c]) => a + c.pct, 0) / g.length) + ')' : done.length + ' lo hicieron')); });
  L.push('', '4. EN CASA · práctica (' + fuDay(F.day) + ' → ' + fuDay(F.until) + ')');
  if (!F.homeRows.length) L.push('- No hubo set de práctica para esos días.');
  F.homeRows.forEach(r => { const pairs = r.cells.map((c, i) => [c, F.students[i]]); const done = pairs.filter(([c]) => c.st !== 'no'); const miss = pairs.filter(([c]) => c.st === 'no'); const g = done.filter(([c]) => c.pct != null); const low = g.filter(([c]) => c.pct < FU_MIN);
    L.push('- ' + r.label + ': ' + done.length + '/' + F.students.length + (g.length ? ' · promedio ' + Math.round(g.reduce((a, [c]) => a + c.pct, 0) / g.length) : '') + (low.length ? ' · bajo ' + FU_MIN + ': ' + low.map(([c, s]) => nm(s) + ' ' + c.pct).join(', ') + (low.length > 1 ? ' → REFUERZO' : '') : '') + (miss.length ? ' (no lo hicieron: ' + miss.map(([, s]) => nm(s)).join(', ') + ')' : '')); });
  L.push('', '5. HISTORIAS Y DIÁLOGOS · veces trabajadas');
  if (!F.stories.length) L.push('- (sin historias en esta clase)');
  F.stories.forEach(r => L.push('- ' + r.label + ': ' + r.counts.map((n, i) => [n, F.students[i]]).sort((a, b) => b[0] - a[0]).map(([n, s]) => nm(s) + ' ' + n).join(' · ')));
  const ek = Object.keys(F.evals);
  L.push('', '6. EVALUACIÓN DEL TEACHER EN CLASE'); if (!ek.length) L.push('- (no se evaluó)');
  ek.forEach(k => L.push('- ' + (FU_CRIT[k] || k) + ': ' + F.evals[k].map(([n, v]) => (FU_LV[v] || v) + ' ' + n).join(' · ')));
  L.push('', '7. PENDIENTES PARA LA PRÓXIMA CLASE'); if (!F.pend.length) L.push('- (ninguno)'); F.pend.forEach(p => L.push('- ' + p));
  if (F.closing && F.closing.note) L.push('', '8. NOTAS DEL TEACHER', '- ' + F.closing.note);
  return L.join('\n');
}
/* ── UI ── */
function fuDot(c) {
  const z = 15;
  if (!c || c.st === 'na') return <span title="no vino" style={{display:'inline-block', width:z, height:z, borderRadius:'50%', background:'#ECEFF1'}}></span>;
  const dot = c.st === 'ok' ? <span style={{display:'inline-block', width:z, height:z, borderRadius:'50%', background:'#43A047', position:'relative'}}><span style={{position:'absolute', left:5, top:2, width:4, height:7, border:'solid #fff', borderWidth:'0 2px 2px 0', transform:'rotate(45deg)'}}></span></span>
    : c.st === 'lo' ? <span style={{display:'inline-block', width:z, height:z, borderRadius:'50%', background:'linear-gradient(90deg,#FB8C00 50%,#FFE0B2 50%)'}}></span>
    : <span style={{display:'inline-block', width:z, height:z, borderRadius:'50%', border:'2.5px solid #E53935', boxSizing:'border-box'}}></span>;
  return <span style={{display:'inline-flex', flexDirection:'column', alignItems:'center', gap:1, fontSize:10.5, fontWeight:800, color:'#6B7280'}}>{dot}{c.pct != null ? c.pct : ''}{c.day ? <span style={{color:'#9AA3B2', fontWeight:700}}>{FU_DN[fuP(c.day).getDay()]}</span> : null}</span>;
}
const fuSrc = { display:'flex', gap:8, alignItems:'flex-start', background:'#EEF2FC', border:'1px solid #C9D4F0', borderRadius:10, padding:'8px 11px', fontSize:12, fontWeight:700, color:'#1F3A8A', lineHeight:1.45 };
const fuChip = (bg, c) => ({ display:'inline-flex', alignItems:'center', gap:5, fontSize:11.5, fontWeight:800, background:bg, color:c, borderRadius:20, padding:'4px 10px', whiteSpace:'nowrap' });
const fuBtn = { border:'1.5px solid #D6DEEA', background:'#fff', color:'#33415C', borderRadius:10, padding:'7px 12px', fontFamily:'inherit', fontWeight:800, fontSize:12.5, cursor:'pointer', whiteSpace:'nowrap' };
const fuBtnP = { ...fuBtn, border:'none', background:'linear-gradient(135deg,#3F5BB8,#0D1B5A)', color:'#fff' };
function FuTable({ rows, students }) {
  if (!rows.length) return null;
  return (
    <div style={{overflowX:'auto', overflowY:'hidden'}}>
      <table style={{borderCollapse:'collapse', width:'100%', minWidth: Math.max(320, 110 + rows.length * 90)}}>
        <thead><tr><th style={{fontSize:10.5, fontWeight:800, color:'#8a7f6a', textAlign:'left', padding:'4px'}}>Alumno</th>{rows.map((r, i) => <th key={i} style={{fontSize:10.5, fontWeight:800, color:'#8a7f6a', padding:'4px', textAlign:'center', lineHeight:1.25, verticalAlign:'bottom'}}>{r.label}</th>)}</tr></thead>
        <tbody>{students.map((s, si) => <tr key={s.id}><td style={{fontWeight:800, fontSize:12.5, padding:'5px 4px', borderTop:'1px solid #F2ECDD', whiteSpace:'nowrap'}}>{(s.fullName || s.username || '').split(' ').slice(0, 2).join(' ')}</td>{rows.map((r, i) => <td key={i} style={{textAlign:'center', borderTop:'1px solid #F2ECDD', padding:'4px'}}>{fuDot(r.cells[si])}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
function FuReportBox({ plan }) {
  const [copied, setCopied] = React.useState(false);
  const txt = fuReport(plan);
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
/* where: 'plan' (arriba del plan de clase) · 'cal' (calendario) · 'full' (pestaña completa) */
function FollowUpPanel({ plan, where, onAddPending, startOpen }) {
  const [open, setOpen] = React.useState(!!startOpen);
  const [rep, setRep] = React.useState(false);
  const F = React.useMemo(() => fuData(plan), [plan && plan.id, plan && plan.closing && plan.closing.at]);
  if (!plan) return where === 'plan' ? null : <div className="scard" style={{fontSize:13, color:'#8a7f6a', fontWeight:700}}>Este grupo aún no tiene clases anteriores guardadas.</div>;
  if (!F) return null;
  const nm = s => fuFirst(s.fullName || s.username);
  const head = where === 'plan' ? '🔎 Antes de planificar: desde la última clase' : where === 'cal' ? '🔎 Seguimiento de esta clase' : '🔎 Desde la última clase';
  return (
    <div className="scard" style={{marginBottom:16, border:'2px solid #9FB0DA', display:'flex', flexDirection:'column', gap:10}}>
      <div style={{display:'flex', alignItems:'center', gap:10, flexWrap:'wrap'}}>
        <div className="sec-title" style={{flex:1, minWidth:200}}>{head}</div>
        <button onClick={() => setRep(r => !r)} style={fuBtn}>📤 {rep ? 'Ocultar reporte' : 'Reporte para tu Claude'}</button>
        <button onClick={() => setOpen(o => !o)} style={open ? fuBtn : fuBtnP}>{open ? '▲ Ocultar' : '▼ Ver todo'}</button>
      </div>
      <div style={{fontSize:12.5, color:'#7a705c', fontWeight:700}}>{plan.sessionLabel} · {fuDay(F.day)} + práctica en casa {fuDay(F.day)} → {fuDay(F.until)}{F.open ? ' · se actualiza sola mientras los alumnos practican' : ''}</div>
      <div style={{display:'flex', gap:7, flexWrap:'wrap'}}>
        {F.attTaken ? <span style={fuChip('#E8F5E9', '#1B5E20')}>🏫 Asistieron {F.present.length} de {F.students.length}</span> : <span style={fuChip('#ECEFF1', '#546E7A')}>🏫 Sin asistencia</span>}
        {F.homeTotal > 0 ? <span style={fuChip('#EEF2FC', '#1F3A8A')}>🏠 Práctica en casa: {F.homeDone} de {F.homeTotal} hechas</span> : <span style={fuChip('#ECEFF1', '#546E7A')}>🏠 Sin set de práctica</span>}
        {F.closing ? <span style={fuChip('#E8F5E9', '#1B5E20')}>🏁 Clase terminada</span> : (F.day <= fuToday() ? <span style={fuChip('#FFF4E5', '#7A4A00')}>🏁 Sin cierre</span> : null)}
      </div>
      {F.alerts.length > 0 && <div style={{display:'flex', gap:9, background:'#FFF4E5', border:'1px solid #FFCC80', borderRadius:10, padding:'9px 12px', fontSize:12.5, fontWeight:700, color:'#7A4A00', lineHeight:1.45}}>⚠<div>{F.alerts.map((a, i) => <div key={i}>{a}</div>)}</div></div>}
      {F.pend.length > 0 && (
        <div style={{display:'flex', flexDirection:'column', gap:6}}>
          <div style={{fontSize:12.5, fontWeight:800, color:'#0D1B5A'}}>Pendientes: <span style={{fontWeight:700, color:'#444'}}>{F.pend.join(' · ')}</span></div>
          {where === 'plan' && onAddPending && <div><button onClick={() => onAddPending(F.pend)} style={fuBtn}>＋ Agregar los pendientes como bloque</button></div>}
        </div>)}
      {rep && <FuReportBox plan={plan} />}
      {open && (
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))', gap:14, alignItems:'start'}}>
          <div style={{display:'flex', flexDirection:'column', gap:9, border:'1px solid #E3DCC9', borderRadius:12, padding:12}}>
            <b style={{fontFamily:"'Fredoka',sans-serif", fontSize:15.5}}>🏫 En clase · {fuDay(F.day)}</b>
            <div style={fuSrc}>📍 <span><b>De dónde sale:</b> la asistencia que tomaste y los materiales del plan que los alumnos hicieron <b>ese día</b>. Las Story y el Quizlet no llevan nota: ✓ = lo hizo.</span></div>
            {F.absent.length > 0 && <div style={{fontSize:12.5, fontWeight:700, color:'#8E1B1B'}}>Faltó: {F.absent.map(nm).join(', ')}</div>}
            {F.classRows.length ? <FuTable rows={F.classRows} students={F.students} /> : <div style={{fontSize:12.5, color:'#999', fontWeight:700}}>Ningún material de la clase registró actividad ese día.</div>}
            {F.closing && <div style={{fontSize:12.5, color:'#555', lineHeight:1.5}}><b>Al terminar marcaste:</b> {(plan.blocks || []).map(b => { const v = F.closing.blocks ? F.closing.blocks[b.id] : 0; return (v === 1 ? '✓ ' : v === 2 ? '✂ ' : v === 3 ? '✗ ' : '· ') + b.title; }).join(' · ')}</div>}
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:9, border:'1px solid #E3DCC9', borderRadius:12, padding:12}}>
            <b style={{fontFamily:"'Fredoka',sans-serif", fontSize:15.5}}>🏠 En casa · {fuDay(F.day)} → {fuDay(F.until)}</b>
            <div style={fuSrc}>📍 <span><b>De dónde sale:</b> los sets de práctica que publicaste para esos días. Solo cuenta lo hecho <b>desde la clase</b>; debajo de cada marca, la nota y el día.</span></div>
            {F.homeRows.length ? <FuTable rows={F.homeRows} students={F.students} /> : <div style={{fontSize:12.5, color:'#999', fontWeight:700}}>No hubo set de práctica para esos días.</div>}
            <div style={{display:'flex', gap:12, flexWrap:'wrap', fontSize:11, color:'#6B7280', fontWeight:800}}><span>{fuDot({ st:'ok' })} hecho / aprobado</span><span>{fuDot({ st:'lo' })} nota baja</span><span>{fuDot({ st:'no' })} no lo hizo</span></div>
          </div>
          {window.RhythmPanel && <RhythmPanel groupId={plan.groupId} />}
          {F.stories.length > 0 && (
            <div style={{display:'flex', flexDirection:'column', gap:8, border:'1px solid #E3DCC9', borderRadius:12, padding:12, gridColumn:'1 / -1'}}>
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
Object.assign(window, { FollowUpPanel, FollowUpModal, ClassCloseModal, fuLastPlan, fuReport, fuData });
