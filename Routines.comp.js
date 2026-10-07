/* ⚡ Rutinas A/B/C + 🧭 Ritmo de gramática · ROUTINES-V1 (07-oct-2026)
 * Aprobado en “Espejo - Atajos y recordatorios.html” (pedido del teacher Joseph, reporte 5-oct).
 *  · Rutinas por TIPO de bloque (story · dial · quiz · sum · gram) y por NIVEL. Se guardan como
 *    plantillas de teacher-tools (kind:'routine', una por nivel+tipo → nube con fusión). Si el teacher
 *    no guardó nada, se usan las precargadas (sus “Steps for practices” + sus PDF de clase).
 *  · En el plan de clase, cada bloque muestra A/B/C; aplicar una llena los pasos tal cual y marca
 *    block.routine = {type, letter, name}. “usada <día>” = último plan del grupo que la usó; ★ sugerida
 *    = la que más tiempo lleva sin usarse. Nunca bloquea (repetir a propósito está permitido).
 *  · Ritmo: secuencia Resumen → P1 → P2 → P3 por tema. “La clase va en” = paso más avanzado que pidió
 *    un set del grupo (últimos 14 días, ya iniciado). Fuera del ritmo = le falta aprobar un paso ANTERIOR.
 *    Recordatorio automático en el equipo del alumno: 1 por día y 2 por paso como máximo
 *    (localStorage jucum_rhythm_rem_v1, clave chiquita); apagable por grupo (settings.gramRemind=false).
 * Prefijo rt* (ámbito global compartido). */
const RT_TYPES = [['story', '📖', 'Story'], ['dial', '💬', 'Diálogo'], ['quiz', '🗂️', 'Quizlet'], ['sum', '🧠', 'Resumen'], ['gram', '✍️', 'Práctica P1/P2/P3']];
const RT_GRAM_ES = ['Completa las preguntas de práctica.', 'Revisa la información de gramática de las preguntas que respondiste mal.', 'Mejora tu puntaje repitiendo el ejercicio tras esperar 8–12 h (así evitas depender de la memoria de corto plazo).'];
function rtSeed(level, type) {
  const pre = level === 'pre-a1';
  const S = {
    story: [['A', '1.ª vez · formato paralelo', pre ? ['Lee la traducción ES (idea general)', 'Sincroniza el audio en inglés con el texto en español', 'Haz todo ese proceso dos veces'] : ['Lee la traducción ES (idea general)', 'Escucha la historia en inglés y sincroniza el audio con la traducción en español']],
      ['B', '2.ª vez · inglés con apoyo', ['Sincroniza el audio en inglés con el texto en inglés, mira el texto en español para mejorar tu comprensión', 'Escucha + lee en voz alta (por turnos)']],
      ['C', 'Estructura · S / V / C', ['Selecciona un párrafo y frase por frase divide cada oración en inglés en tres partes básicas: Sujeto / Verbo / Complemento – Objeto', 'Haz lo mismo con la traducción al español', 'Empareja las partes en inglés con las partes en español']]],
    dial: [['A', 'Presentación', ['Lee la traducción ES (idea general)', 'Sincroniza el audio en inglés con el texto en inglés, mira el texto en español para mejorar tu comprensión']], ['B', 'Lectura en parejas', ['Lectura en parejas (con y sin español)']], ['C', 'Simulación con IA', ['Pega el diálogo en una IA y practícalo (una pasada)']]],
    quiz: [['A', 'Tarjetas', ['En modo "Tarjetas de estudio"']], ['B', 'Quizlet Live', ['Quizlet Live en equipos']], ['C', 'Reto contra el reloj', ['Ordena oraciones de 4 a 6 bloques (2–5 min)']]],
    sum: [['A', 'Repaso del paso', ['Repaso del Paso 4', 'MCQ de autochequeo 4 y 5']], ['B', 'Lectura previa', ['Lee el resumen antes de la clase', 'Anota tus dudas para la clase']]],
    gram: [['A', 'Práctica estándar', RT_GRAM_ES], ['B', 'Modelado en clase', ['Inicio de la práctica como ejemplo, en voz alta', 'Los alumnos terminan en casa']]]
  };
  return (S[type] || []).map(([letter, name, steps]) => ({ letter, name, steps: steps.slice() }));
}
function rtTpl(level, type) { const TT = window.JUCUM_TT; return ((TT && TT.getTemplates) ? TT.getTemplates() : []).find(t => t.kind === 'routine' && t.level === level && t.payload && t.payload.type === type) || null; }
function rtList(level, type) { const t = rtTpl(level, type); return t && Array.isArray(t.payload.list) && t.payload.list.length ? t.payload.list : rtSeed(level, type); }
function rtSave(level, type, list) {
  const TT = window.JUCUM_TT; const clean = list.map((r, i) => ({ letter: String.fromCharCode(65 + i), name: String(r.name || '').trim() || 'Rutina ' + String.fromCharCode(65 + i), steps: (r.steps || []).map(s => String(s).trim()).filter(Boolean) })).filter(r => r.steps.length);
  const t = rtTpl(level, type); const payload = { type, list: clean };
  if (t) TT.updateTemplate(t.id, { payload }); else TT.addTemplate({ kind: 'routine', name: 'Rutinas ' + type + ' ' + String(level).toUpperCase(), level, payload });
  return clean;
}
/* Tipo de bloque según su material o su título */
function rtTypeOf(b, catalog) {
  const t = String(b.title || ''); const types = (b.mats || []).map(m => { for (const lv of Object.keys(catalog || {})) { const mm = (catalog[lv] || []).find(x => x.id === m.moduleId); const a = mm && (mm.activities || []).find(x => x.id === m.activityId); if (a) return a.type; } return null; });
  if (/di[aá]logo|dialogue/i.test(t)) return 'dial';
  if (types.includes('quizlet') || /quizlet|vocabulario/i.test(t)) return 'quiz';
  if (types.includes('summary') || /repaso de gram|resumen|summary/i.test(t)) return 'sum';
  if (types.includes('grammar') || /\bP[123]\b|pr[aá]ctica.*gram|fill|identif|transform/i.test(t)) return 'gram';
  if (types.includes('story') || /story|historia|lectura/i.test(t)) return 'story';
  return null;
}
function rtLastUse(groupId, beforeDate, type) {
  const TT = window.JUCUM_TT; const out = {};
  TT.getClassPlans().filter(p => p.groupId === groupId && p.date && p.date < beforeDate).forEach(p => (p.blocks || []).forEach(b => { if (b.routine && b.routine.type === type) { const k = b.routine.letter; if (!out[k] || out[k] < p.date) out[k] = p.date; } }));
  return out;
}
const RT_DN = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'], RT_MN = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function rtDay(s) { const [y, m, d] = String(s).split('-').map(Number); const x = new Date(y, m - 1, d); return RT_DN[x.getDay()] + ' ' + d + ' ' + RT_MN[m - 1]; }
/* Fila A/B/C dentro de un bloque del plan de clase */
function RoutinePicker({ block, level, groupId, date, onApply }) {
  const D = window.JUCUM_DATA; const type = rtTypeOf(block, D.MODULE_CATALOG); if (!type) return null;
  const list = rtList(level, type); if (!list.length) return null;
  const used = rtLastUse(groupId, date, type);
  const last = Object.keys(used).sort((a, b) => used[b].localeCompare(used[a]))[0];
  const sug = (list.find(r => !used[r.letter]) || list.slice().sort((a, b) => String(used[a.letter] || '').localeCompare(String(used[b.letter] || '')))[0] || {}).letter;
  const cur = block.routine && block.routine.type === type ? block.routine.letter : null;
  const apply = r => { const has = (block.steps || []).some(s => String(s).trim()); const same = has && JSON.stringify(block.steps.filter(s => String(s).trim())) === JSON.stringify(r.steps); if (has && !same && !window.confirm('¿Cambiar los pasos de este bloque por la rutina ' + r.letter + ' · ' + r.name + '?')) return; onApply({ steps: r.steps.slice(), routine: { type, letter: r.letter, name: r.name } }); };
  return (
    <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))', gap:7, marginTop:8}}>
      {list.map(r => { const on = cur === r.letter; const u = used[r.letter];
        return (
          <button key={r.letter} onClick={() => apply(r)} style={{border:'2px solid ' + (on ? '#3F5BB8' : '#E3DCC9'), background: on ? '#EEF2FC' : '#fff', borderRadius:11, padding:'7px 10px', textAlign:'left', fontFamily:'inherit', cursor:'pointer', display:'flex', flexDirection:'column', gap:2}}>
            <b style={{fontSize:12.5, color:'#0D1B5A'}}>{r.letter} · {r.name}</b>
            <span style={{fontSize:10.5, fontWeight:900, borderRadius:6, padding:'1px 6px', alignSelf:'flex-start', whiteSpace:'nowrap', background: u ? '#FFF4E5' : '#E8F5E9', color: u ? '#9C5D00' : '#1B5E20'}}>{u ? 'usada ' + rtDay(u) + (r.letter === last ? ' (última)' : '') : (r.letter === sug ? '★ sugerida' : 'no usada aún')}</span>
          </button>); })}
    </div>
  );
}
/* ⭐ Mis rutinas (pestaña del Planificador) */
function RoutinesManager({ defaultLevel }) {
  const D = window.JUCUM_DATA; const levels = Object.keys(D.MODULE_CATALOG || {});
  const [lv, setLv] = React.useState(defaultLevel && levels.includes(defaultLevel) ? defaultLevel : levels[0]);
  const [ty, setTy] = React.useState('story');
  const [list, setList] = React.useState(() => rtList(lv, 'story').map(r => ({ ...r, text: r.steps.join('\n') })));
  const [saved, setSaved] = React.useState('');
  const load = (l, t) => { setLv(l); setTy(t); setList(rtList(l, t).map(r => ({ ...r, text: r.steps.join('\n') }))); setSaved(''); };
  const upd = (i, p) => { setSaved(''); setList(ls => ls.map((r, k) => k === i ? { ...r, ...p } : r)); };
  const save = () => { const out = rtSave(lv, ty, list.map(r => ({ name: r.name, steps: String(r.text || '').split(/\r?\n/).map(x => x.replace(/^\s*(?:[-•·*]|\d+[.)])\s+/, '')) }))); setList(out.map(r => ({ ...r, text: r.steps.join('\n') }))); setSaved('✓ Guardadas en la nube'); };
  const custom = !!rtTpl(lv, ty);
  const btn = on => ({ border: on ? 'none' : '1.5px solid #D6DEEA', background: on ? 'linear-gradient(135deg,#3F5BB8,#0D1B5A)' : '#fff', color: on ? '#fff' : '#33415C', borderRadius:10, padding:'7px 12px', fontFamily:'inherit', fontWeight:800, fontSize:12.5, cursor:'pointer', whiteSpace:'nowrap' });
  return (
    <div className="scard" style={{display:'flex', flexDirection:'column', gap:12}}>
      <div className="sec-title">⭐ Mis rutinas</div>
      <div style={{fontSize:12.5, color:'#7a705c', fontWeight:700, lineHeight:1.5}}>Escríbelas una sola vez, con tus palabras. En el plan de clase, cada bloque te ofrece sus rutinas A · B · C y te sugiere ★ la que no usaste hace más tiempo.</div>
      <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>{RT_TYPES.map(([k, e, l]) => <button key={k} onClick={() => load(lv, k)} style={btn(k === ty)}>{e} {l}</button>)}</div>
      <div style={{display:'flex', gap:6, flexWrap:'wrap', alignItems:'center'}}><span style={{fontSize:12, fontWeight:800, color:'#8a7f6a'}}>Nivel:</span>{levels.map(l => <button key={l} onClick={() => load(l, ty)} style={{...btn(l === lv), padding:'5px 10px'}}>{l.toUpperCase()}</button>)}<span style={{fontSize:11.5, fontWeight:700, color: custom ? '#2E7D32' : '#8a7f6a'}}>{custom ? '· tus rutinas' : '· precargadas de tus “Steps for practices” (revísalas y guarda)'}</span></div>
      {list.map((r, i) => (
        <div key={i} style={{border:'1px solid #E3DCC9', borderRadius:12, padding:'10px 12px', background:'#FCFAF4', display:'flex', flexDirection:'column', gap:6}}>
          <div style={{display:'flex', gap:8, alignItems:'center'}}><b style={{fontSize:13.5}}>{String.fromCharCode(65 + i)} ·</b><input value={r.name} onChange={e => upd(i, { name: e.target.value })} placeholder="Nombre de la rutina…" style={{flex:1, border:'1px solid #E3DCC9', borderRadius:8, padding:'6px 9px', fontFamily:'inherit', fontWeight:800, fontSize:13}} /><button onClick={() => { if (window.confirm('¿Quitar esta rutina?')) { setSaved(''); setList(ls => ls.filter((_, k) => k !== i)); } }} style={{border:'1px solid #F0C0BA', background:'#fff', color:'#C0392B', borderRadius:8, padding:'4px 9px', cursor:'pointer', fontWeight:800}}>✕</button></div>
          <textarea value={r.text} onChange={e => upd(i, { text: e.target.value })} rows={Math.max(2, String(r.text || '').split('\n').length + 1)} placeholder="Un paso por línea (puedes pegar varias líneas)" style={{width:'100%', border:'1px solid #E3DCC9', borderRadius:8, padding:'7px 9px', fontFamily:'inherit', fontSize:12.5, lineHeight:1.5, resize:'vertical'}} />
        </div>))}
      <div style={{display:'flex', gap:8, flexWrap:'wrap', alignItems:'center'}}>
        <button onClick={() => { setSaved(''); setList(ls => [...ls, { name: '', text: '' }]); }} style={btn(false)}>＋ Agregar rutina {String.fromCharCode(65 + list.length)}</button>
        <button onClick={save} style={btn(true)}>💾 Guardar mis rutinas</button>
        {saved && <span style={{fontSize:12.5, fontWeight:800, color:'#2E7D32'}}>{saved}</span>}
      </div>
    </div>
  );
}
/* ════════ 🧭 Ritmo de gramática ════════ */
function rtStepOf(a) { if (!a) return -1; if (a.type === 'summary') return 0; if (a.type !== 'grammar') return -1; const s = (a.id || '') + ' ' + (a.name || ''); if (/-fill\b|fill/i.test(s)) return 1; if (/-id\b|identif/i.test(s)) return 2; if (/-tr\b|transform/i.test(s)) return 3; return -1; }
const RT_STEP = ['Resumen', 'P1 Fill in', 'P2 Identify', 'P3 Transform'];
function rtToday() { return new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10); }
/* Por tema: paso actual del grupo y los pasos del catálogo */
function rtGroupRhythm(groupId) {
  const D = window.JUCUM_DATA; const TT = window.JUCUM_TT; if (!D || !TT) return [];
  const today = rtToday(); const from = (() => { const d = new Date(Date.now() - 5 * 3600000 - 14 * 86400000); return d.toISOString().slice(0, 10); })();
  const themes = {};
  TT.getPracticePlans().filter(p => p.groupId === groupId && p.assignToStudents !== false && (p.dates || []).some(d => d <= today && d >= from)).forEach(p => {
    const start = (p.dates || []).filter(d => d <= today).sort()[0];
    (p.activities || []).forEach(m => { let mod = null; for (const lv of Object.keys(D.MODULE_CATALOG)) { mod = (D.MODULE_CATALOG[lv] || []).find(x => x.id === m.moduleId); if (mod) break; }
      const a = mod && (mod.activities || []).find(x => x.id === m.activityId); const st = rtStepOf(a); if (st < 0 || !a.group) return;
      const k = mod.id + '|' + a.group; const t = themes[k] = themes[k] || { mod, group: a.group, cur: -1, since: start };
      if (st > t.cur) { t.cur = st; t.since = start; } });
  });
  return Object.values(themes).filter(t => t.cur > 0).map(t => { const acts = (t.mod.activities || []).filter(a => a.group === t.group); const steps = [0, 1, 2, 3].map(i => acts.find(a => rtStepOf(a) === i) || null); return { ...t, steps }; });
}
function rtStudentState(student, th) {
  const D = window.JUCUM_DATA; const prog = D.getStudentProgress(student.id) || { completed: {} };
  return th.steps.map((a, i) => { if (!a) return 'none'; const e = (prog.completed || {})[th.mod.id + ':' + a.id]; const done = e && (a.type === 'summary' || D.entryPassed(e, student.level, student.group)); if (done) return 'ok'; if (i < th.cur) return 'behind'; if (i === th.cur) return 'cur'; return 'wait'; });
}
function rtDaysSince(s) { if (!s) return 0; return Math.max(0, Math.round((Date.parse(rtToday()) - Date.parse(s)) / 86400000)); }
function rtReminderText(student, th, i) { const a = th.steps[i]; return { type: 'daily-reminder', title: '🧭 Tu clase ya va en ' + RT_STEP[th.cur], body: 'Te falta ' + RT_STEP[i] + ' · ' + th.group.replace(/^T\d+\s*·\s*/, '') + '. Son unos minutos y así llegas listo a la próxima clase. 💪', link: 'practice' }; }
/* Panel del profesor (dentro del seguimiento) */
function RhythmPanel({ groupId }) {
  const D = window.JUCUM_DATA; const [tick, setTick] = React.useState(0); const [sent, setSent] = React.useState({});
  const ths = rtGroupRhythm(groupId); if (!ths.length) return null;
  const students = (D.STUDENTS || []).filter(s => s.group === groupId && s.active !== false && !s.closedAt);
  const gs = D.getGroupSettings(groupId) || {}; const auto = gs.gramRemind !== false;
  const dot = st => { const z = 15; if (st === 'ok') return <span style={{display:'inline-block', width:z, height:z, borderRadius:'50%', background:'#43A047'}}></span>; if (st === 'behind') return <span style={{display:'inline-block', width:z, height:z, borderRadius:'50%', border:'2.5px solid #E53935', boxSizing:'border-box'}}></span>; if (st === 'cur') return <span style={{display:'inline-block', width:z, height:z, borderRadius:'50%', border:'2.5px solid #FB8C00', background:'#FFF4E5', boxSizing:'border-box'}}></span>; if (st === 'none') return <span style={{color:'#ccc'}}>—</span>; return <span style={{display:'inline-block', width:z, height:z, borderRadius:'50%', border:'2px dashed #C9C3B3', boxSizing:'border-box'}}></span>; };
  return (
    <div style={{display:'flex', flexDirection:'column', gap:9, border:'1px solid #E3DCC9', borderRadius:12, padding:12, gridColumn:'1 / -1'}}>
      <div style={{display:'flex', alignItems:'center', gap:10, flexWrap:'wrap'}}>
        <b style={{fontFamily:"'Fredoka',sans-serif", fontSize:15.5, flex:1}}>🧭 Ritmo de gramática</b>
        <label style={{display:'flex', alignItems:'center', gap:7, fontSize:12.5, fontWeight:800, cursor:'pointer'}}><input type="checkbox" checked={auto} onChange={e => { D.setGroupSettings(groupId, { gramRemind: e.target.checked }); setTick(t => t + 1); }} /> Recordatorios automáticos {auto ? 'activados' : 'apagados'}</label>
      </div>
      <div style={{fontSize:12, color:'#7a705c', fontWeight:700}}>Fuera del ritmo = le falta aprobar un paso <b>anterior</b> al que va la clase. Avisos automáticos: máximo 1 por día y 2 por paso.</div>
      {ths.map(th => (
        <div key={th.mod.id + th.group} style={{overflowX:'auto', overflowY:'hidden'}}>
          <div style={{fontSize:12.5, fontWeight:800, color:'#1F3A8A', margin:'4px 0'}}>{th.group} · la clase va en <b>{RT_STEP[th.cur]}</b> (desde {rtDay(th.since)})</div>
          <table style={{borderCollapse:'collapse', width:'100%', minWidth:440}}>
            <thead><tr><th style={{fontSize:10.5, color:'#8a7f6a', textAlign:'left', padding:4}}>Alumno</th>{RT_STEP.map((s, i) => <th key={i} style={{fontSize:10.5, color: i === th.cur ? '#3F5BB8' : '#8a7f6a', padding:4}}>{s}{i === th.cur ? ' ▶' : ''}</th>)}<th></th></tr></thead>
            <tbody>{students.map(s => { const st = rtStudentState(s, th); const behind = st.indexOf('behind'); const key = s.id + th.group;
              return <tr key={s.id}><td style={{fontWeight:800, fontSize:12.5, padding:'5px 4px', borderTop:'1px solid #F2ECDD', whiteSpace:'nowrap'}}>{(s.fullName || s.username || '').split(' ').slice(0, 2).join(' ')}</td>{st.map((x, i) => <td key={i} style={{textAlign:'center', borderTop:'1px solid #F2ECDD'}}>{dot(x)}</td>)}
                <td style={{borderTop:'1px solid #F2ECDD', textAlign:'right'}}>{behind >= 0 ? (sent[key] ? <span style={{fontSize:11.5, fontWeight:800, color:'#2E7D32'}}>✓ enviado</span> : <button onClick={() => { if (window.JUCUM_NOTIF) window.JUCUM_NOTIF.pushNotif(s.id, rtReminderText(s, th, behind)); setSent(x => ({ ...x, [key]: 1 })); }} style={{border:'1.5px solid #D6DEEA', background:'#fff', borderRadius:9, padding:'3px 9px', fontSize:11.5, fontWeight:800, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap'}}>🔔 Recordar</button>) : <span style={{fontSize:11, color:'#8a7f6a', fontWeight:700}}>{st.includes('cur') ? 'en el paso actual' : 'al día'}</span>}</td></tr>; })}</tbody>
          </table>
        </div>))}
      <div style={{display:'flex', gap:12, flexWrap:'wrap', fontSize:11, color:'#6B7280', fontWeight:800}}><span>{dot('ok')} aprobado</span><span>{dot('behind')} le falta un paso anterior</span><span>{dot('cur')} paso actual, en plazo</span><span>{dot('wait')} todavía no toca</span></div>
    </div>
  );
}
/* Alumno: aviso en su inicio + recordatorio automático (1/día, 2 por paso) */
const RT_REM_KEY = 'jucum_rhythm_rem_v1';
function StudentRhythmNotice({ student }) {
  const D = window.JUCUM_DATA;
  const gs = (D && student && D.getGroupSettings(student.group)) || {};
  const ths = (D && student) ? rtGroupRhythm(student.group) : [];
  const items = []; ths.forEach(th => { const st = rtStudentState(student, th); st.forEach((x, i) => { if (x === 'behind') items.push({ th, i }); }); });
  React.useEffect(() => {
    if (!items.length || gs.gramRemind === false || !window.JUCUM_NOTIF) return;
    if (window.JUCUM_PV_EMBED && window.JUCUM_PV_EMBED.user && window.JUCUM_PV_EMBED.user()) return;
    let all = {}; try { all = JSON.parse(localStorage.getItem(RT_REM_KEY) || '{}'); } catch (e) {}
    const me = all[student.id] = all[student.id] || {}; const today = rtToday();
    if (Object.values(me).some(r => r && r.last === today)) return;
    const it = items.find(x => { const r = me[x.th.mod.id + ':' + x.th.steps[x.i].id]; return !r || (r.n || 0) < 2; }); if (!it) return;
    const k = it.th.mod.id + ':' + it.th.steps[it.i].id; me[k] = { n: ((me[k] && me[k].n) || 0) + 1, last: today };
    Object.keys(all[student.id]).forEach(x => { const [, act] = x.split(':'); if (!items.some(y => y.th.steps[y.i].id === act)) delete all[student.id][x]; });
    try { if (window.JUCUM_STORE) window.JUCUM_STORE.setJSON(RT_REM_KEY, all); else localStorage.setItem(RT_REM_KEY, JSON.stringify(all)); } catch (e) {}
    try { window.JUCUM_NOTIF.pushNotif(student.id, rtReminderText(student, it.th, it.i)); } catch (e) {}
  }, [student && student.id, items.length]);
  if (!items.length) return null;
  const it = items[0]; const a = it.th.steps[it.i];
  const href = (typeof linkFor === 'function') ? linkFor(a, it.th.mod, student.id) : (a.url || null);
  return (
    <div style={{display:'flex', gap:10, alignItems:'flex-start', border:'1px solid #FFE0A3', background:'#FFF8E6', borderRadius:14, padding:'11px 13px', margin:'10px 0', color:'#5D4200', fontSize:13, lineHeight:1.45}}>
      <span style={{fontSize:20}}>🧭</span>
      <div style={{flex:1}}>
        <b>Tu clase ya va en {RT_STEP[it.th.cur]}</b><br />Te falta <b>{RT_STEP[it.i]} · {it.th.group.replace(/^T\d+\s*·\s*/, '')}</b>. Son unos minutos y así llegas listo a la próxima clase. 💪{items.length > 1 ? ' (y ' + (items.length - 1) + ' más)' : ''}
        {href && <div style={{marginTop:8}}><a href={href} target="_blank" rel="noopener" style={{display:'inline-block', background:'linear-gradient(135deg,#3F5BB8,#1F3A8A)', color:'#fff', borderRadius:10, padding:'7px 13px', fontWeight:800, fontSize:12.5, textDecoration:'none'}}>▶ Hacer {RT_STEP[it.i].split(' ')[0]} ahora</a></div>}
      </div>
    </div>
  );
}
window.JUCUM_RT_SAVE = rtSave;
Object.assign(window, { RoutinePicker, RoutinesManager, RhythmPanel, StudentRhythmNotice, rtTypeOf, rtList, rtGroupRhythm });
