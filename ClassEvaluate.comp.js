/* 📋 EVALUACIÓN EN CLASE (modo clase · profesor)
 * ─────────────────────────────────────────────────────────────────────
 * 1) El profesor ELIGE qué se evalúa hoy (no todas las clases se trabaja todo).
 * 2) Escala amable de 4 niveles, con DOS niveles de bueno:
 *      ⭐ Excelente · 👍 Bien · 🙂 En proceso · 🤝 Necesita apoyo
 *    (nada de "mal": el nivel más bajo indica acompañamiento, y también da XP).
 * 3) Un solo toque directo al nivel (sin ciclar) y un recordatorio en pantalla
 *    de lo último marcado, para no perder el hilo mientras se da la clase.
 * Se guarda como evaluación presencial en el perfil del alumno y otorga XP.
 */
const CE_CRIT = [
  { key:'attention',     ico:'👀', label:'Atención',    desc:'Siguió la explicación sin que haya que repetirla' },
  { key:'speaking',      ico:'🗣️', label:'Lectura',     desc:'Lectura en voz alta y pronunciación' },
  { key:'comprehension', ico:'📖', label:'Comprensión', desc:'Entendió lo leído o escuchado' },
  { key:'knowledge',     ico:'🧠', label:'Tema',        desc:'Conocimiento del tema de la clase' },
  { key:'participation', ico:'🙋', label:'Participa',   desc:'Participa, pregunta y responde' },
  { key:'listening',     ico:'🎧', label:'Listening',   desc:'Comprensión auditiva en conversación' },
];
/* Niveles: stars alimenta la competencia (1-5) · xp es el bono */
const CE_LV = [
  { v:'exc',  ico:'⭐', label:'Excelente',      stars:5, xp:15, bg:'#E8F5E9', fg:'#1B5E20', bd:'#81C784' },
  { v:'good', ico:'👍', label:'Bien',           stars:4, xp:12, bg:'#F1F8E9', fg:'#33691E', bd:'#C5E1A5' },
  { v:'proc', ico:'🙂', label:'En proceso',     stars:3, xp:8,  bg:'#FFF8E1', fg:'#8A6D1A', bd:'#F0C66B' },
  { v:'help', ico:'🤝', label:'Necesita apoyo', stars:2, xp:5,  bg:'#EEF2FF', fg:'#283593', bd:'#B3BEE8' },
];
const ceLv = (v) => CE_LV.find(l => l.v === v) || null;
function ceXP(row) { return Object.values(row || {}).reduce((s, v) => s + (ceLv(v) ? ceLv(v).xp : 0), 0); }
const CE_PICK_KEY = 'jucum_class_eval_crit_v1';

function ClassEvaluate({ groupId, planLabel, onClose }) {
  const D = window.JUCUM_DATA;
  const students = (D.STUDENTS || []).filter(s => s.group === groupId);
  const group = (D.GROUPS || []).find(g => g.id === groupId);
  const [picked, setPicked] = React.useState(() => {
    try { const a = JSON.parse(localStorage.getItem(CE_PICK_KEY) || 'null'); if (Array.isArray(a) && a.length) return a; } catch (e) {}
    return ['attention', 'comprehension', 'participation'];
  });
  const [pickOpen, setPickOpen] = React.useState(false);
  const [marks, setMarks] = React.useState({});     // { studentId: { crit: 'exc' } }
  const [last, setLast] = React.useState(null);     // recordatorio de lo último marcado
  const [note, setNote] = React.useState('');
  const [saved, setSaved] = React.useState(null);

  const crits = CE_CRIT.filter(c => picked.includes(c.key));
  const togglePick = (key) => {
    const next = picked.includes(key) ? picked.filter(k => k !== key) : picked.concat(key);
    setPicked(next);
    try { localStorage.setItem(CE_PICK_KEY, JSON.stringify(next)); } catch (e) {}
  };
  const mark = (st, crit, lv) => {
    setMarks(m => {
      const row = { ...(m[st.id] || {}) };
      if (row[crit.key] === lv.v) delete row[crit.key]; else row[crit.key] = lv.v;   // volver a tocar = quitar
      return { ...m, [st.id]: row };
    });
    setLast({ name: st.fullName, crit, lv, off: (marks[st.id] || {})[crit.key] === lv.v });
  };
  const fillRow = (st, lv) => {
    setMarks(m => { const row = {}; crits.forEach(c => row[c.key] = lv.v); return { ...m, [st.id]: row }; });
    setLast({ name: st.fullName, crit: { ico:'✳️', label:'todos los criterios' }, lv, off:false });
  };
  const fillCol = (crit, lv) => {
    setMarks(m => { const next = { ...m }; students.forEach(s => next[s.id] = { ...(next[s.id] || {}), [crit.key]: lv.v }); return next; });
    setLast({ name:'todo el grupo', crit, lv, off:false });
  };

  const marked = students.filter(s => Object.keys(marks[s.id] || {}).length > 0);
  const totalXP = marked.reduce((s, st) => s + ceXP(marks[st.id]), 0);

  const save = () => {
    if (!marked.length) return;
    marked.forEach(st => {
      const row = marks[st.id] || {};
      const ratings = {}; const detalle = [];
      crits.forEach(c => {
        const lv = ceLv(row[c.key]);
        if (!lv) return;
        ratings[c.key] = lv.stars;
        detalle.push(`${c.ico} ${c.label}: ${lv.label}`);
      });
      if (!Object.keys(ratings).length) return;
      const xp = ceXP(row);
      try {
        window.JUCUM_EVAL.saveEvaluation(st.id, {
          teacherName:'Profesor', ratings,
          feedback:(note ? note + ' · ' : '') + '📋 Clase' + (planLabel ? ` · ${planLabel}` : '') + ' · ' + detalle.join(' · '),
          attachments:[], kind:'clase',
        });
      } catch (e) {}
      if (xp > 0 && D.addBonusXP) D.addBonusXP(st.id, xp);
      if (window.JUCUM_NOTIF) {
        const best = crits.filter(c => row[c.key] === 'exc').map(c => c.label);
        window.JUCUM_NOTIF.pushNotif(st.id, {
          type:'teacher-feedback', title:`📋 Tu profesor te evaluó en clase (+${xp} XP)`,
          body: best.length ? `¡Excelente en ${best.join(' · ')}! Sigue así. 🌟` : 'Revisa tu evaluación en tu perfil. Vas avanzando. 💪',
        });
      }
    });
    setSaved({ n: marked.length, xp: totalXP });
    setMarks({}); setLast(null);
    setTimeout(() => setSaved(null), 6000);
  };

  const cellW = crits.length <= 3 ? 128 : crits.length === 4 ? 104 : 92;

  return (
    <div className="scard" style={{marginBottom:16, borderColor:'#C9D6F5'}}>
      <div className="sec-head">
        <div className="sec-title">📋 Evaluación de la clase · {group ? group.name : ''}</div>
        <span className="sec-meta">un toque en el nivel · volver a tocarlo lo quita</span>
      </div>

      {/* Qué se evalúa HOY */}
      <div style={{display:'flex', alignItems:'center', gap:7, flexWrap:'wrap', marginBottom:9}}>
        <span style={{fontSize:11, fontWeight:800, letterSpacing:'.05em', textTransform:'uppercase', color:'#A8A8A8'}}>Hoy evalúo:</span>
        {crits.map(c => (
          <span key={c.key} title={c.desc} style={{display:'inline-flex', alignItems:'center', gap:5, fontSize:12, fontWeight:800, color:'#1F3A8A', background:'#E3E9F8', border:'1px solid #B3BEE8', borderRadius:16, padding:'4px 10px', whiteSpace:'nowrap'}}>
            {c.ico} {c.label}
            <button onClick={() => togglePick(c.key)} title="Quitar de esta clase" style={{cursor:'pointer', border:'none', background:'none', padding:0, color:'#7A88B8', fontWeight:800, fontSize:13, lineHeight:1, fontFamily:'inherit'}}>×</button>
          </span>
        ))}
        <button onClick={() => setPickOpen(v => !v)} style={{cursor:'pointer', border:'1.5px dashed #B3BEE8', background:'#fff', color:'#1F3A8A', borderRadius:16, padding:'4px 11px', fontFamily:'inherit', fontWeight:800, fontSize:12, whiteSpace:'nowrap'}}>
          {pickOpen ? 'listo' : '+ elegir criterios'}
        </button>
      </div>

      {pickOpen && (
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(215px,1fr))', gap:5, border:'1.5px solid #C9D6F5', background:'#F7FAFF', borderRadius:12, padding:'10px 11px', marginBottom:10}}>
          {CE_CRIT.map(c => {
            const on = picked.includes(c.key);
            return (
              <label key={c.key} style={{display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:'6px 9px', borderRadius:10, background: on ? '#E8F0FE' : '#fff', border:'1px solid ' + (on ? '#9FB0DA' : 'var(--border)')}}>
                <input type="checkbox" checked={on} onChange={() => togglePick(c.key)} />
                <span style={{fontSize:14}}>{c.ico}</span>
                <span style={{minWidth:0}}>
                  <b style={{fontSize:12}}>{c.label}</b>
                  <span style={{display:'block', fontSize:10.5, fontWeight:600, color:'var(--text-soft)', lineHeight:1.3}}>{c.desc}</span>
                </span>
              </label>
            );
          })}
        </div>
      )}

      {/* Recordatorio de lo último marcado */}
      <div style={{display:'flex', alignItems:'center', gap:9, flexWrap:'wrap', marginBottom:9}}>
        <div style={{flex:'1 1 260px', minWidth:200, fontSize:12, fontWeight:800, borderRadius:11, padding:'8px 12px',
          background: last ? (last.off ? '#F5F5F0' : ceLv(last.lv.v).bg) : '#FAFAF6',
          border:'1.5px solid ' + (last ? (last.off ? 'var(--border)' : ceLv(last.lv.v).bd) : 'var(--border)'),
          color: last ? (last.off ? '#8A8A8A' : ceLv(last.lv.v).fg) : '#9A9A9A'}}>
          {last
            ? <>{last.off ? '↩ Quitado: ' : '✔ Marcado: '}<b>{last.name}</b> · {last.crit.ico} {last.crit.label} → {last.lv.ico} {last.lv.label}{!last.off && ` (+${last.lv.xp} XP)`}</>
            : <>Marca a tus alumnos: cada columna es un criterio y cada botón un nivel. Aquí verás qué acabas de marcar.</>}
        </div>
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Nota de la clase (opcional)"
          style={{flex:'1 1 180px', minWidth:150, padding:'8px 11px', border:'1.5px solid var(--border)', borderRadius:10, fontFamily:'inherit', fontSize:12.5, fontWeight:600}} />
        <span style={{fontSize:12, fontWeight:800, color:'#1F3A8A', background:'#E3E9F8', borderRadius:12, padding:'6px 11px', whiteSpace:'nowrap'}}>{marked.length} alumno(s) · +{totalXP} XP</span>
        <button onClick={save} disabled={!marked.length} style={{cursor: marked.length ? 'pointer' : 'not-allowed', fontFamily:'inherit', fontWeight:800, fontSize:12.5,
          border:'none', borderRadius:22, padding:'9px 16px', background: marked.length ? '#1F3A8A' : '#DDD', color:'#fff', whiteSpace:'nowrap'}}>💾 Guardar</button>
        {onClose && <button onClick={onClose} style={{cursor:'pointer', fontFamily:'inherit', fontWeight:800, fontSize:12.5, border:'1.5px solid var(--border)', background:'#fff', color:'#666', borderRadius:22, padding:'9px 14px'}}>Cerrar</button>}
      </div>

      {saved && (
        <div style={{fontSize:12.5, fontWeight:800, color:'#1B5E20', background:'#E8F5E9', border:'1px solid #A5D6A7', borderRadius:11, padding:'9px 12px', marginBottom:10}}>
          ✅ Guardado para {saved.n} alumno(s) · +{saved.xp} XP. Ya aparece en su perfil como evaluación presencial.
        </div>
      )}

      {!crits.length ? (
        <div className="empty-state" style={{padding:'20px 0'}}><div className="icon">🎯</div>Elige arriba qué vas a evaluar en esta clase.</div>
      ) : !students.length ? (
        <div className="empty-state" style={{padding:'20px 0'}}><div className="icon">👥</div>Este grupo aún no tiene alumnos.</div>
      ) : (
        <div style={{overflowX:'auto'}}>
          {/* Cabecera: criterio + relleno rápido de columna */}
          <div style={{display:'flex', gap:8, alignItems:'flex-end', padding:'0 4px 6px', minWidth:'fit-content'}}>
            <span style={{flex:'1 1 150px', minWidth:130, fontSize:10, fontWeight:800, letterSpacing:'.04em', textTransform:'uppercase', color:'#A8A8A8'}}>Alumno</span>
            {crits.map(c => (
              <span key={c.key} style={{width:cellW, flexShrink:0, textAlign:'center'}}>
                <span title={c.desc} style={{display:'block', fontSize:11.5, fontWeight:800, color:'#33333C', whiteSpace:'nowrap'}}>{c.ico} {c.label}</span>
                <span style={{display:'flex', justifyContent:'center', gap:3, marginTop:2}}>
                  {CE_LV.map(lv => (
                    <button key={lv.v} onClick={() => fillCol(c, lv)} title={`Poner "${lv.label}" a todo el grupo en ${c.label}`}
                      style={{cursor:'pointer', border:'none', background:'none', padding:0, fontSize:9.5, opacity:.55, fontFamily:'inherit'}}>{lv.ico}</button>
                  ))}
                </span>
              </span>
            ))}
            <span style={{width:46, flexShrink:0, fontSize:10, fontWeight:800, textTransform:'uppercase', color:'#A8A8A8', textAlign:'right'}}>XP</span>
          </div>

          <div style={{display:'grid', gap:4, maxHeight:430, overflowY:'auto', minWidth:'fit-content'}}>
            {students.map(st => {
              const row = marks[st.id] || {};
              const xp = ceXP(row);
              return (
                <div key={st.id} style={{display:'flex', gap:8, alignItems:'center', padding:'6px 8px', borderRadius:10,
                  background: xp ? '#F7FAFF' : '#FCFCFA', border:'1px solid ' + (xp ? '#C9D6F5' : 'var(--border)')}}>
                  <div style={{flex:'1 1 150px', minWidth:130, overflow:'hidden'}}>
                    <div style={{fontWeight:800, fontSize:12.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{st.fullName}</div>
                    <div style={{display:'flex', gap:5, marginTop:1}}>
                      {CE_LV.slice(0, 2).map(lv => (
                        <button key={lv.v} onClick={() => fillRow(st, lv)} title={`Marcar todo como ${lv.label}`}
                          style={{cursor:'pointer', border:'none', background:'none', padding:0, fontFamily:'inherit', fontSize:10, fontWeight:800, color:lv.fg}}>todo {lv.ico}</button>
                      ))}
                    </div>
                  </div>
                  {crits.map(c => (
                    <span key={c.key} style={{width:cellW, flexShrink:0, display:'flex', gap:3, justifyContent:'center'}}>
                      {CE_LV.map(lv => {
                        const on = row[c.key] === lv.v;
                        return (
                          <button key={lv.v} onClick={() => mark(st, c, lv)} title={`${st.fullName} · ${c.ico} ${c.label} → ${lv.ico} ${lv.label} (+${lv.xp} XP)`}
                            style={{width:cellW <= 92 ? 20 : cellW <= 104 ? 23 : 29, height:29, cursor:'pointer', fontFamily:'inherit', fontSize:on ? 15 : 13, lineHeight:1,
                              background: on ? lv.bg : '#fff', color: on ? lv.fg : '#C4C4C4', opacity: on ? 1 : .55,
                              border:'1.5px solid ' + (on ? lv.bd : 'var(--border)'), borderRadius:8,
                              boxShadow: on ? `0 0 0 2px ${lv.bg}` : 'none'}}>{lv.ico}</button>
                        );
                      })}
                    </span>
                  ))}
                  <span style={{width:46, flexShrink:0, textAlign:'right', fontSize:11.5, fontWeight:800, color: xp ? '#1F3A8A' : '#C4C4C4', whiteSpace:'nowrap'}}>{xp ? '+' + xp : '—'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{fontSize:11, color:'var(--text-soft)', fontWeight:700, marginTop:9, lineHeight:1.6}}>
        {CE_LV.map(lv => `${lv.ico} ${lv.label} +${lv.xp} XP`).join('  ·  ')}
        <br/>Todos los niveles suman XP (nadie pierde por aprender). Se guarda como <b>evaluación presencial</b> en el perfil del alumno.
      </div>
    </div>
  );
}

Object.assign(window, { ClassEvaluate, CE_CRIT, CE_LV });
