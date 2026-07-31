/* 📋 EVALUACIÓN EN CLASE (modo clase · profesor)
 * Fila compacta por alumno con 5 criterios de 3 estados (👍 bien · 😐 regular ·
 * 👎 falta). Se guarda como evaluación presencial (la misma que ya ve el alumno
 * en su perfil) y otorga XP real (bono, sincronizado con la nube).
 * Diseñado para marcarse durante la clase: un toque por criterio, sin formularios.
 */
const CE_CRIT = [
  { key:'attention',     ico:'👀', label:'Atención',   desc:'¿Siguió la explicación sin que haya que repetirla?' },
  { key:'speaking',      ico:'🗣️', label:'Lectura',    desc:'Lectura en voz alta / pronunciación' },
  { key:'comprehension', ico:'📖', label:'Comprensión', desc:'Entendió lo leído / escuchado' },
  { key:'knowledge',     ico:'🧠', label:'Tema',       desc:'Conocimiento del tema de la clase' },
  { key:'participation', ico:'🙋', label:'Participa',  desc:'Participa y pregunta' },
];
const CE_STATES = [
  { v:null, ico:'·',  bg:'#F7F6F2', fg:'#C4C4C4', bd:'#E8E5DC', txt:'sin marcar', stars:null, xp:0 },
  { v:2,    ico:'👍', bg:'#E8F5E9', fg:'#2E7D32', bd:'#A5D6A7', txt:'bien',       stars:5,    xp:12 },
  { v:1,    ico:'😐', bg:'#FFF8E1', fg:'#B26A00', bd:'#F0C66B', txt:'regular',    stars:3,    xp:7 },
  { v:0,    ico:'👎', bg:'#FFEBEE', fg:'#C62828', bd:'#FFCDD2', txt:'falta',      stars:1,    xp:3 },
];
function ceState(i) { return CE_STATES[((i % CE_STATES.length) + CE_STATES.length) % CE_STATES.length]; }
function ceXP(marks) { return Object.values(marks || {}).reduce((s, i) => s + ceState(i).xp, 0); }
function ceEvaluatedToday(studentId) {
  try {
    const today = new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10);
    return (window.JUCUM_EVAL.getEvaluations(studentId) || [])
      .some(e => String(e.date || '').slice(0, 10) === today);
  } catch (e) { return false; }
}

function ClassEvaluate({ groupId, planLabel, onClose }) {
  const D = window.JUCUM_DATA;
  const students = (D.STUDENTS || []).filter(s => s.group === groupId);
  const group = (D.GROUPS || []).find(g => g.id === groupId);
  const [marks, setMarks] = React.useState({});   // { studentId: { crit: stateIndex } }
  const [note, setNote] = React.useState('');
  const [saved, setSaved] = React.useState(null);

  const bump = (sid, key) => setMarks(m => {
    const cur = (m[sid] || {})[key] || 0;
    return { ...m, [sid]: { ...(m[sid] || {}), [key]: (cur + 1) % CE_STATES.length } };
  });
  const setAll = (sid, idx) => setMarks(m => {
    const row = {}; CE_CRIT.forEach(c => row[c.key] = idx);
    return { ...m, [sid]: row };
  });

  const marked = students.filter(s => Object.values(marks[s.id] || {}).some(i => ceState(i).v != null));
  const totalXP = marked.reduce((s, st) => s + ceXP(marks[st.id]), 0);

  const save = () => {
    if (!marked.length) return;
    marked.forEach(st => {
      const row = marks[st.id] || {};
      const ratings = {};
      CE_CRIT.forEach(c => { const s = ceState(row[c.key] || 0); if (s.stars != null) ratings[c.key] = s.stars; });
      const xp = ceXP(row);
      try {
        window.JUCUM_EVAL.saveEvaluation(st.id, {
          teacherName: 'Profesor', ratings,
          feedback: (note ? note + ' · ' : '') + '📋 Evaluación de clase' + (planLabel ? ` · ${planLabel}` : ''),
          attachments: [], kind: 'clase',
        });
      } catch (e) {}
      if (xp > 0 && D.addBonusXP) D.addBonusXP(st.id, xp);
      if (window.JUCUM_NOTIF) {
        const best = CE_CRIT.filter(c => ceState(row[c.key] || 0).v === 2).map(c => c.label);
        window.JUCUM_NOTIF.pushNotif(st.id, {
          type: 'teacher-feedback',
          title: `📋 Tu profesor te evaluó en clase (+${xp} XP)`,
          body: best.length ? `Destacaste en: ${best.join(' · ')}. ¡Sigue así!` : 'Revisa tu evaluación en tu perfil y sigue practicando. 💪',
        });
      }
    });
    setSaved({ n: marked.length, xp: totalXP });
    setMarks({});
    setTimeout(() => setSaved(null), 6000);
  };

  return (
    <div className="scard" style={{marginBottom:16, borderColor:'#C9D6F5'}}>
      <div className="sec-head">
        <div className="sec-title">📋 Evaluación de la clase · {group ? group.name : ''}</div>
        <span className="sec-meta">un toque por criterio: 👍 bien · 😐 regular · 👎 falta</span>
      </div>

      {saved && (
        <div style={{fontSize:12.5, fontWeight:800, color:'#1B5E20', background:'#E8F5E9', border:'1px solid #A5D6A7', borderRadius:11, padding:'9px 12px', marginBottom:10}}>
          ✅ Guardado para {saved.n} alumno(s) · +{saved.xp} XP repartidos. Aparece en su perfil como evaluación presencial.
        </div>
      )}

      <div style={{display:'flex', alignItems:'center', gap:9, flexWrap:'wrap', marginBottom:9}}>
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Nota de la clase (opcional, se guarda en todas)"
          style={{flex:'1 1 240px', minWidth:180, padding:'8px 11px', border:'1.5px solid var(--border)', borderRadius:10, fontFamily:'inherit', fontSize:12.5, fontWeight:600}} />
        <span style={{fontSize:12, fontWeight:800, color:'#1F3A8A', background:'#E3E9F8', borderRadius:12, padding:'5px 11px', whiteSpace:'nowrap'}}>
          {marked.length} marcado(s) · +{totalXP} XP
        </span>
        <button onClick={save} disabled={!marked.length} style={{cursor: marked.length ? 'pointer' : 'not-allowed', fontFamily:'inherit', fontWeight:800, fontSize:12.5,
          border:'none', borderRadius:22, padding:'9px 16px', background: marked.length ? '#1F3A8A' : '#DDD', color:'#fff'}}>💾 Guardar evaluación</button>
        {onClose && <button onClick={onClose} style={{cursor:'pointer', fontFamily:'inherit', fontWeight:800, fontSize:12.5, border:'1.5px solid var(--border)', background:'#fff', color:'#666', borderRadius:22, padding:'9px 14px'}}>Cerrar</button>}
      </div>

      {/* Cabecera de criterios */}
      <div style={{display:'flex', alignItems:'center', gap:6, padding:'0 4px 5px', fontSize:10, fontWeight:800, letterSpacing:'.04em', textTransform:'uppercase', color:'#A8A8A8'}}>
        <span style={{flex:1, minWidth:120}}>Alumno</span>
        {CE_CRIT.map(c => <span key={c.key} title={`${c.label} — ${c.desc}`} style={{width:44, textAlign:'center', fontSize:15}}>{c.ico}</span>)}
        <span style={{width:52, textAlign:'right'}}>XP</span>
      </div>

      <div style={{display:'grid', gap:4, maxHeight:420, overflowY:'auto'}}>
        {students.length === 0 && <div className="empty-state" style={{padding:'18px 0'}}><div className="icon">👥</div>Este grupo aún no tiene alumnos.</div>}
        {students.map(st => {
          const row = marks[st.id] || {};
          const xp = ceXP(row);
          const done = ceEvaluatedToday(st.id);
          return (
            <div key={st.id} style={{display:'flex', alignItems:'center', gap:6, padding:'6px 8px', borderRadius:10, background: xp ? '#F7FAFF' : '#FCFCFA', border:'1px solid ' + (xp ? '#C9D6F5' : 'var(--border)')}}>
              <div style={{flex:1, minWidth:120, overflow:'hidden'}}>
                <div style={{fontWeight:800, fontSize:12.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{st.fullName}</div>
                <button onClick={() => setAll(st.id, 1)} title="Marcar todo como 👍 bien"
                  style={{marginTop:1, cursor:'pointer', border:'none', background:'none', padding:0, fontFamily:'inherit', fontSize:10.5, fontWeight:800, color:'#2E7D32'}}>
                  todo 👍{done ? <span style={{color:'#9A9A9A', fontWeight:700}}> · ya evaluado hoy</span> : ''}
                </button>
              </div>
              {CE_CRIT.map(c => {
                const s = ceState(row[c.key] || 0);
                return (
                  <button key={c.key} onClick={() => bump(st.id, c.key)} title={`${c.label} · ${s.txt} (toca para cambiar)`}
                    style={{width:44, height:32, cursor:'pointer', fontFamily:'inherit', fontSize:15, lineHeight:1,
                      background:s.bg, color:s.fg, border:'1.5px solid ' + s.bd, borderRadius:9}}>{s.ico}</button>
                );
              })}
              <span style={{width:52, textAlign:'right', fontSize:11.5, fontWeight:800, color: xp ? '#1F3A8A' : '#C4C4C4'}}>{xp ? '+' + xp : '—'}</span>
            </div>
          );
        })}
      </div>

      <div style={{fontSize:11, color:'var(--text-soft)', fontWeight:700, marginTop:8, lineHeight:1.6}}>
        {CE_CRIT.map(c => `${c.ico} ${c.label}`).join('  ·  ')}
        <br/>Se guarda como <b>evaluación presencial</b> en el perfil de cada alumno y suma XP a su nivel y a la liga semanal: 👍 12 · 😐 7 · 👎 3 por criterio.
      </div>
    </div>
  );
}

Object.assign(window, { ClassEvaluate, CE_CRIT });
