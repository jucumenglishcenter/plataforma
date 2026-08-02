/* 🟢 CLASE EN VIVO · tablero visual del profesor
 * ─────────────────────────────────────────────────────────────────────
 * Cada actividad del módulo activo es una MESA del salón. Cuando un alumno
 * abre un material, su personaje aparece dentro de esa mesa y dice
 * "¡Ya inicié mi práctica!"; al terminar dice "¡Ya finalicé mi práctica!"
 * y se queda con su nota unos minutos.
 *
 * Datos: window.JUCUM_LIVE (tabla live_presence · script 26). El conector
 * jucum-connect.js la escribe desde cada material; aquí solo se lee cada 10 s.
 */
const LC_ICO = { story:'📗', reading:'📖', listening:'🎧', grammar:'📝', summary:'📚', quizlet:'🃏', exam:'🎓' };
const LC_SKINS = [
  { body:'#1F3A8A', head:'#3D5BC4' }, { body:'#C2185B', head:'#E5548A' },
  { body:'#00796B', head:'#2CA396' }, { body:'#E65100', head:'#F58A2E' },
  { body:'#5B3FA0', head:'#8266C9' }, { body:'#2E7D32', head:'#57AB5B' },
  { body:'#B26A00', head:'#DFA02E' }, { body:'#0277BD', head:'#3AA1DD' },
];
function lcSkin(id) {
  let h = 0; const s = String(id || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return LC_SKINS[h % LC_SKINS.length];
}
function lcInitials(name) {
  return String(name || '?').trim().split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase();
}
function lcFirst(name) {
  const p = String(name || '').trim().split(/\s+/);
  return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : (p[0] || '—');
}

/* ── Personaje ───────────────────────────────────────────────────────── */
function LCChar({ student, phase, bubble, mins, score, scale, onClick }) {
  const k = scale || 1;
  const skin = lcSkin(student.id);
  const off = phase === 'off' || phase === 'gone';
  const fin = phase === 'finished';   // ya practicó: se queda en su mesa, en calma
  const tone = (phase === 'done' || fin) ? '#2E7D32' : phase === 'paused' ? '#B26A00' : off ? '#BDBDBD' : '#E53935';
  const anim = phase === 'working' || phase === 'start' ? 'lcBob 2.4s ease-in-out infinite'
             : phase === 'done' ? 'lcHop .9s ease-out 2' : 'none';
  return (
    <div onClick={onClick || null} title={onClick ? 'Ver qué practicó ' + lcFirst(student.fullName) : null}
      style={{width: 92*k, flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', position:'relative', paddingTop: bubble ? 44*k : 8*k, opacity: off ? .5 : 1, cursor: onClick ? 'pointer' : 'default'}}>
      {bubble && (
        <div style={{position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:'max-content', maxWidth:150*k, textAlign:'center', lineHeight:1.25, zIndex:3,
          background: phase === 'done' ? '#E8F5E9' : '#FFFFFF', border:'1.5px solid ' + (phase === 'done' ? '#A5D6A7' : '#FFCDD2'),
          color: phase === 'done' ? '#1B5E20' : '#B71C1C', borderRadius:14, padding:`${5*k}px ${10*k}px`,
          fontSize:11*k, fontWeight:800, boxShadow:'0 3px 10px rgba(0,0,0,0.12)', animation:'lcPop .35s ease-out'}}>
          {bubble}
          <span style={{position:'absolute', bottom:-5*k, left:'50%', width:8*k, height:8*k, marginLeft:-4*k, transform:'rotate(45deg)',
            background: phase === 'done' ? '#E8F5E9' : '#FFFFFF', borderRight:'1.5px solid ' + (phase === 'done' ? '#A5D6A7' : '#FFCDD2'),
            borderBottom:'1.5px solid ' + (phase === 'done' ? '#A5D6A7' : '#FFCDD2')}}></span>
        </div>
      )}
      <div style={{animation:anim, display:'flex', flexDirection:'column', alignItems:'center'}}>
        <div style={{position:'relative'}}>
          <div style={{width:38*k, height:38*k, borderRadius:'50%', background:`linear-gradient(150deg, ${skin.head}, ${skin.body})`,
            border:`${2.5*k}px solid #fff`, boxShadow:`0 0 0 ${2*k}px ${tone}`, display:'grid', placeItems:'center',
            color:'#fff', fontWeight:800, fontSize:13*k, fontFamily:"'Fredoka',sans-serif", filter: off ? 'grayscale(1)' : 'none'}}>
            {lcInitials(student.fullName)}
          </div>
          {(phase === 'done' || fin) && <span style={{position:'absolute', right:-4*k, top:-4*k, fontSize:14*k}}>✅</span>}
          {phase === 'paused' && <span style={{position:'absolute', right:-4*k, top:-4*k, fontSize:13*k}}>⏸</span>}
        </div>
        <div style={{width:34*k, height:24*k, marginTop:-3*k, borderRadius:`${12*k}px ${12*k}px ${7*k}px ${7*k}px`,
          background:`linear-gradient(180deg, ${skin.head}, ${skin.body})`, filter: off ? 'grayscale(1)' : 'none'}}></div>
      </div>
      <div style={{marginTop:5*k, fontSize:11*k, fontWeight:800, color:'#33333C', maxWidth:92*k, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textAlign:'center'}}>
        {lcFirst(student.fullName)}
      </div>
      {!off && (
        <div style={{marginTop:2*k, fontSize:10*k, fontWeight:800, color:tone}}>
          {(phase === 'done' || fin) ? (score != null ? `${score}% · ${mins}m` : `terminó · ${mins}m`) : `${mins} min`}
        </div>
      )}
    </div>
  );
}

/* ── Mesa (actividad) ────────────────────────────────────────────────── */
function LCZone({ zone, scale, level, onSelect }) {
  const k = scale || 1;
  const busy = zone.people.length > 0;
  const nDone = zone.people.filter(p => p.phase === 'done' || p.phase === 'finished').length;
  const nNow = zone.people.length - nDone;
  const isStory = zone.icon === '📗';
  return (
    <div style={{borderRadius:16, border:'1.5px solid ' + (busy ? '#FFCDD2' : 'var(--border)'), background: busy ? '#FFFDFD' : '#FCFCFA',
      boxShadow: busy ? '0 4px 16px rgba(229,57,53,0.10)' : 'none', display:'flex', flexDirection:'column'}}>
      <div style={{display:'flex', alignItems:'center', gap:8, padding:`${9*k}px ${12*k}px`, borderBottom:'1px dashed var(--border)', borderRadius:'14px 14px 0 0',
        background: busy ? '#FFF6F6' : '#F8F7F3'}}>
        <span style={{fontSize:15*k}}>{zone.icon}</span>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontWeight:800, fontSize:12.5*k, color:'#2A2A2A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{zone.name}</div>
          {zone.sub && <div style={{fontSize:10.5*k, fontWeight:700, color:'var(--text-soft)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{zone.sub}</div>}
        </div>
        <span style={{display:'flex', gap:4*k, flexShrink:0}}>
          {nNow > 0 && <span style={{fontSize:10.5*k, fontWeight:800, borderRadius:11, padding:`${2*k}px ${8*k}px`, whiteSpace:'nowrap', background:'#FFEBEE', color:'#B71C1C', border:'1px solid #FFCDD2'}}>{isStory ? '📗 leyendo' : '🔴 en curso'} {nNow}</span>}
          {nDone > 0 && <span style={{fontSize:10.5*k, fontWeight:800, borderRadius:11, padding:`${2*k}px ${8*k}px`, whiteSpace:'nowrap', background:'#E8F5E9', color:'#2E7D32', border:'1px solid #A5D6A7'}}>✅ {nDone}</span>}
          {!busy && <span style={{fontSize:10.5*k, fontWeight:800, borderRadius:11, padding:`${2*k}px ${8*k}px`, whiteSpace:'nowrap', background:'#F1F0EB', color:'#9A9A9A', border:'1px solid var(--border)'}}>vacía</span>}
        </span>
      </div>
      <div style={{minHeight:96*k, display:'flex', flexWrap:'wrap', gap:6*k, padding:`${8*k}px ${10*k}px ${12*k}px`, alignItems:'flex-end',
        background:'repeating-linear-gradient(135deg, rgba(0,0,0,0.014) 0 10px, transparent 10px 20px)'}}>
        {zone.people.length === 0
          ? <div style={{width:'100%', textAlign:'center', fontSize:11.5*k, fontWeight:700, color:'#C4C4C4', alignSelf:'center'}}>nadie aquí aún</div>
          : zone.people.map(p => <LCChar key={p.student.id} student={p.student} phase={p.phase} bubble={p.bubble} mins={p.elapsedMin} score={p.score} scale={k} onClick={onSelect ? () => onSelect(p.student) : null} />)}
      </div>
    </div>
  );
}

/* ── 👁 Ventana flotante: qué practicó el alumno ─────────────────────
 * Se abre al tocar un personaje o un nombre. Solo lee lo ya sincronizado. */
function lcResolve(D, modId, actId) {
  const cat = D.MODULE_CATALOG || {};
  for (const lv of Object.keys(cat)) {
    const m = (cat[lv] || []).find(x => x.id === modId);
    if (m) return { mod: m, act: (m.activities || []).find(x => x.id === actId) || null };
  }
  return { mod: null, act: null };
}
const LC_DAY = (iso) => { const t = Date.parse(iso || ''); return t ? new Date(t - 5 * 3600000).toISOString().slice(0, 10) : null; };
/* Nombre legible cuando la actividad ya no está en el catálogo (módulos viejos) */
function lcActFallback(aid) {
  const m = /^t(\d+)-(fill|id|tr)$/.exec(aid);
  if (m) return { name: `T${m[1]} · ${({ fill:'Fill in', id:'Identification', tr:'Transform' })[m[2]]}`, ico:'📝' };
  if (/^sum-/.test(aid)) return { name:'Resumen de gramática · ' + aid.slice(4), ico:'📚' };
  if (aid === 'story') return { name:'Stories y Diálogos', ico:'📗' };
  if (aid === 'reading') return { name:'Comprensión lectora', ico:'📖' };
  if (aid === 'listening') return { name:'Comprensión auditiva', ico:'🎧' };
  if (/quizlet/.test(aid)) return { name:'Quizlet', ico:'🃏' };
  return { name: aid, ico:'📄' };
}
const LC_HOUR = (iso) => { const t = Date.parse(iso || ''); if (!t) return ''; const d = new Date(t - 5 * 3600000); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); };
function StudentDayModal({ student, live, onClose }) {
  const D = window.JUCUM_DATA;
  const completed = (D.getStudentProgress(student.id) || {}).completed || {};
  const today = LC_DAY(new Date().toISOString());
  const all = Object.keys(completed).map(k => {
    const i = k.indexOf(':');
    const mid = k.slice(0, i), aid = k.slice(i + 1);
    const e = completed[k] || {};
    const r = lcResolve(D, mid, aid);
    const fb = r.act ? null : lcActFallback(aid);
    const sc = (typeof e.score === 'number') ? (e.score > 10 ? Math.round(e.score) : Math.round(e.score * 10)) : null;
    return { k, e, day: LC_DAY(e.date), hour: LC_HOUR(e.date), sc,
             name: r.act ? r.act.name : fb.name, ico: r.act ? (LC_ICO[r.act.type] || '📄') : fb.ico,
             modName: r.mod ? `${r.mod.emoji || '📦'} ${r.mod.name}` : 'módulo anterior',
             isStory: (r.act && r.act.type === 'story') || (!r.act && aid === 'story') };
  }).filter(x => x.day).sort((a, b) => String(b.e.date).localeCompare(String(a.e.date)));
  const hoy = all.filter(x => x.day === today);
  const antes = all.filter(x => x.day !== today).slice(0, 3);
  const skin = lcSkin(student.id);
  const cls = window.JUCUM_LIVE ? window.JUCUM_LIVE.classify(live) : { phase:'off', elapsedMin:0 };
  const ph = CB_PHASE[live ? cls.phase : 'off'] || CB_PHASE.off;
  const zr = live ? lcResolve(D, live.module_id, live.activity_id) : { act:null };
  const fmtD = (d) => { try { return new Date(d + 'T12:00:00').toLocaleDateString('es-PE', { weekday:'short', day:'numeric', month:'short' }); } catch (e) { return d; } };
  const Row = ({ x }) => (
    <div style={{display:'flex', alignItems:'center', gap:8, padding:'6px 10px', borderRadius:10, background:'#FCFCFA', border:'1px solid var(--border)'}}>
      <span style={{fontSize:11, fontWeight:800, color:'#9A9A9A', width:38, flexShrink:0}}>{x.hour}</span>
      <span style={{fontSize:14, flexShrink:0}}>{x.ico}</span>
      <span style={{flex:1, minWidth:0}}>
        <span style={{display:'block', fontWeight:800, fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{x.name}</span>
        <span style={{display:'block', fontSize:10.5, fontWeight:700, color:'var(--text-soft)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{x.modName}</span>
      </span>
      {x.e.minutes ? <span style={{fontSize:11, fontWeight:800, color:'#666', whiteSpace:'nowrap'}}>{Math.round(x.e.minutes)}m</span> : null}
      <span style={{fontSize:11.5, fontWeight:800, whiteSpace:'nowrap', color: x.isStory ? '#1F3A8A' : x.sc == null ? '#B5B5B5' : x.sc >= 75 ? '#2E7D32' : x.sc >= 50 ? '#B26A00' : '#C62828'}}>
        {x.isStory ? '📗 leído' : x.sc != null ? x.sc + '%' : '✓'}
      </span>
    </div>
  );
  return (
    <div onClick={onClose} style={{position:'fixed', inset:0, zIndex:1002, background:'rgba(15,23,42,0.55)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16}}>
      <div onClick={e => e.stopPropagation()} style={{background:'#fff', borderRadius:18, width:'100%', maxWidth:470, boxShadow:'0 24px 60px rgba(0,0,0,0.35)', display:'flex', flexDirection:'column', maxHeight:'84vh'}}>
        <div style={{display:'flex', alignItems:'center', gap:11, padding:'14px 18px 12px', borderBottom:'1.5px solid var(--border)', position:'relative'}}>
          <div style={{width:40, height:40, borderRadius:'50%', flexShrink:0, background:`linear-gradient(150deg, ${skin.head}, ${skin.body})`, display:'grid', placeItems:'center', color:'#fff', fontWeight:800, fontSize:14, fontFamily:"'Fredoka',sans-serif"}}>{lcInitials(student.fullName)}</div>
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:16, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{student.fullName}</div>
            <div style={{fontSize:11.5, fontWeight:800, color: ph.c}}>{ph.ico} {ph.txt}{live && cls.phase !== 'off' && zr.act ? ` · ${zr.act.name}` : ''}{live && (cls.phase === 'working' || cls.phase === 'paused' || cls.phase === 'start') ? ` · ${cls.elapsedMin} min` : ''}</div>
          </div>
          <button onClick={onClose} style={{position:'absolute', top:12, right:12, width:30, height:30, borderRadius:'50%', border:'none', background:'#FAFAF6', color:'#8a7f6a', fontSize:13, fontWeight:800, cursor:'pointer'}}>✕</button>
        </div>
        <div style={{padding:'12px 16px 14px', overflowY:'auto'}}>
          <div style={{fontSize:11, fontWeight:800, letterSpacing:'.05em', textTransform:'uppercase', color:'#A8A8A8', marginBottom:6}}>Hoy · {hoy.length ? `${hoy.length} práctica(s)` : 'sin prácticas registradas'}</div>
          {hoy.length
            ? <div style={{display:'grid', gap:4}}>{hoy.map(x => <Row key={x.k} x={x} />)}</div>
            : <div style={{fontSize:12, fontWeight:700, color:'var(--text-soft)', background:'#FAFAF6', border:'1px dashed var(--border)', borderRadius:10, padding:'9px 12px'}}>Todavía no registra prácticas hoy. Aquí aparecerán apenas termine una actividad.</div>}
          {antes.length > 0 && (
            <>
              <div style={{fontSize:11, fontWeight:800, letterSpacing:'.05em', textTransform:'uppercase', color:'#A8A8A8', margin:'11px 0 6px'}}>Anteriores</div>
              <div style={{display:'grid', gap:4}}>
                {antes.map(x => (
                  <div key={x.k} style={{display:'flex', alignItems:'center', gap:8, padding:'5px 10px', borderRadius:10, background:'#FAFAF8', border:'1px solid #F0EDE4', opacity:.85}}>
                    <span style={{fontSize:10.5, fontWeight:800, color:'#B0B0B0', width:74, flexShrink:0}}>{fmtD(x.day)}</span>
                    <span style={{fontSize:13, flexShrink:0}}>{x.ico}</span>
                    <span style={{flex:1, minWidth:0, fontWeight:800, fontSize:11.5, color:'#6B6B6B', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{x.name}</span>
                    <span style={{fontSize:11, fontWeight:800, color:'#9A9A9A'}}>{x.isStory ? '📗' : x.sc != null ? x.sc + '%' : '✓'}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── 📋 Tablero de la clase ───────────────────────────────────────────
 * Compacto: una línea por alumno con si ENTRÓ, si TERMINÓ, su tiempo y nota,
 * y un registro de PARTICIPACIÓN de un toque (👍 12 XP · 😐 7 · 👎 3) que se
 * guarda en su perfil como evaluación presencial. */
const CB_LV = [
  { v:'exc',  ico:'⭐', label:'Excelente',      stars:5, xp:15, bg:'#E8F5E9', fg:'#1B5E20', bd:'#81C784' },
  { v:'good', ico:'👍', label:'Bien',           stars:4, xp:12, bg:'#F1F8E9', fg:'#33691E', bd:'#C5E1A5' },
  { v:'proc', ico:'🙂', label:'En proceso',     stars:3, xp:8,  bg:'#FFF8E1', fg:'#8A6D1A', bd:'#F0C66B' },
  { v:'help', ico:'🤝', label:'Necesita apoyo', stars:2, xp:5,  bg:'#EEF2FF', fg:'#283593', bd:'#B3BEE8' },
];
const cbLv = (v) => CB_LV.find(l => l.v === v) || null;
const CB_PHASE = {
  working:  { ico:'🔴', txt:'practicando',  c:'#B71C1C' },
  start:    { ico:'🔴', txt:'recién entró', c:'#B71C1C' },
  practiced:{ ico:'✔', txt:'practicó hoy', c:'#2E7D32' },
  paused:   { ico:'⏸',  txt:'sin moverse',  c:'#B26A00' },
  done:     { ico:'✅', txt:'terminó ahora', c:'#2E7D32' },
  finished: { ico:'✅', txt:'ya terminó',   c:'#2E7D32' },
  gone:     { ico:'↩️', txt:'se fue',       c:'#B26A00' },
  off:      { ico:'💤', txt:'no ha entrado', c:'#9A9A9A' },
};

function ClassBoard({ roster, groupId, onSelect }) {
  const D = window.JUCUM_DATA;
  const [open, setOpen] = React.useState(true);
  const [marks, setMarks] = React.useState({});
  const [saved, setSaved] = React.useState({});
  const [msg, setMsg] = React.useState(null);
  const [last, setLast] = React.useState(null);
  const setMark = (e, lv) => {
    setMarks(m => {
      const cur = m[e.student.id];
      const next = { ...m };
      if (cur === lv.v) delete next[e.student.id]; else next[e.student.id] = lv.v;
      return next;
    });
    setLast({ name: lcFirst(e.student.fullName), lv, off: marks[e.student.id] === lv.v });
  };
  const st = (sid) => cbLv(marks[sid]);
  const pend = roster.filter(e => st(e.student.id));
  const totalXP = pend.reduce((s, e) => s + st(e.student.id).xp, 0);
  const order = { working:0, start:0, paused:1, done:2, finished:3, practiced:4, gone:5, off:6 };
  const list = roster.slice().sort((a, b) => (order[a.phase] ?? 9) - (order[b.phase] ?? 9) || a.student.fullName.localeCompare(b.student.fullName));
  const nIn = roster.filter(e => e.phase !== 'off').length;
  const nFin = roster.filter(e => e.phase === 'done' || e.phase === 'finished').length;

  const save = () => {
    if (!pend.length) return;
    pend.forEach(e => {
      const s = st(e.student.id);
      try {
        window.JUCUM_EVAL.saveEvaluation(e.student.id, {
          teacherName:'Profesor', ratings:{ participation: s.stars },
          feedback:`🙋 Participación en clase: ${s.label}` + (e.actName ? ` · practicó ${e.actName}` : ''),
          attachments:[], kind:'clase',
        });
      } catch (err) {}
      if (s.xp > 0 && D.addBonusXP) D.addBonusXP(e.student.id, s.xp);
      if (window.JUCUM_NOTIF) window.JUCUM_NOTIF.pushNotif(e.student.id, {
        type:'teacher-feedback', title:`🙋 Tu profesor registró tu participación (+${s.xp} XP)`,
        body:`Participación de hoy: ${s.label}. ¡Sigue así! 💪`,
      });
    });
    const ok = {}; pend.forEach(e => ok[e.student.id] = true);
    setSaved(p => ({ ...p, ...ok }));
    setMsg(`✅ Participación guardada para ${pend.length} alumno(s) · +${totalXP} XP`);
    setMarks({}); setLast(null);
    setTimeout(() => setMsg(null), 6000);
  };

  return (
    <div style={{marginTop:14, borderRadius:16, border:'1.5px solid #C9D6F5', background:'#F9FBFF', padding:'11px 13px 13px'}}>
      <div style={{display:'flex', alignItems:'center', gap:9, flexWrap:'wrap'}}>
        <b style={{fontSize:13}}>📋 Tablero de la clase</b>
        <span style={{fontSize:11.5, fontWeight:800, color:'#1F3A8A', whiteSpace:'nowrap'}}>{nIn} entraron · {nFin} terminaron · {roster.length - nIn} sin entrar</span>
        <div style={{flex:1}}></div>
        {pend.length > 0 && <span style={{fontSize:11.5, fontWeight:800, color:'#1F3A8A', background:'#E3E9F8', borderRadius:12, padding:'4px 10px', whiteSpace:'nowrap'}}>{pend.length} · +{totalXP} XP</span>}
        {pend.length > 0 && <button onClick={save} style={{cursor:'pointer', border:'none', background:'#1F3A8A', color:'#fff', borderRadius:20, padding:'7px 14px', fontFamily:'inherit', fontWeight:800, fontSize:12}}>💾 Guardar participación</button>}
        <button onClick={() => setOpen(v => !v)} style={{cursor:'pointer', border:'1.5px solid var(--border)', background:'#fff', color:'#666', borderRadius:20, padding:'6px 12px', fontFamily:'inherit', fontWeight:800, fontSize:11.5}}>{open ? 'Ocultar' : 'Ver'}</button>
      </div>
      {msg && <div style={{fontSize:12, fontWeight:800, color:'#1B5E20', background:'#E8F5E9', border:'1px solid #A5D6A7', borderRadius:10, padding:'7px 11px', marginTop:8}}>{msg}</div>}
      {open && (
        <div style={{fontSize:11.5, fontWeight:800, borderRadius:10, padding:'6px 11px', marginTop:8,
          background: last ? (last.off ? '#F5F5F0' : last.lv.bg) : '#F1F5FD', border:'1px solid ' + (last ? (last.off ? 'var(--border)' : last.lv.bd) : '#D8E1F5'),
          color: last ? (last.off ? '#8A8A8A' : last.lv.fg) : '#5B6B8C'}}>
          {last
            ? <>{last.off ? '↩ Quitado: ' : '✔ Marcado: '}<b>{last.name}</b> · 🙋 Participación → {last.lv.ico} {last.lv.label}{!last.off && ` (+${last.lv.xp} XP)`}</>
            : <>🙋 Registro de <b>participación</b> de la clase: {CB_LV.map(l => `${l.ico} ${l.label}`).join(' · ')}</>}
        </div>
      )}
      {open && (
        <div style={{display:'grid', gap:3, marginTop:9, maxHeight:340, overflowY:'auto'}}>
          {list.map(e => {
            const ph = CB_PHASE[e.phase] || CB_PHASE.off;
            return (
              <div key={e.student.id} style={{display:'flex', alignItems:'center', gap:8, padding:'5px 9px', borderRadius:9, background:'#fff', border:'1px solid var(--border)'}}>
                <span style={{fontSize:13, width:18, textAlign:'center'}}>{ph.ico}</span>
                <span onClick={onSelect ? () => onSelect(e.student) : null} title={onSelect ? 'Ver qué practicó' : null}
                  style={{flex:'1 1 120px', minWidth:90, fontWeight:800, fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', cursor: onSelect ? 'pointer' : 'default', textDecoration: onSelect ? 'underline dotted 1px' : 'none', textUnderlineOffset:3}}>{lcFirst(e.student.fullName)}</span>
                <span style={{flex:'1 1 130px', minWidth:0, fontSize:11, fontWeight:700, color:'var(--text-soft)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                  {e.actName || '—'}{e.actName && !e.inPlan ? ' ⚠' : ''}{e.exam ? ' 🎓' : ''}
                </span>
                <span style={{width:96, flexShrink:0, fontSize:10.5, fontWeight:800, color:ph.c, textAlign:'right', whiteSpace:'nowrap'}} title={e.phase === 'gone' ? 'Entró y salió sin terminar' : e.phase === 'paused' ? 'Dentro de la actividad pero sin moverse' : ph.txt}>{ph.txt}</span>
                <span style={{width:42, flexShrink:0, fontSize:11, fontWeight:800, color:'#666', textAlign:'right', whiteSpace:'nowrap'}}>{e.phase !== 'off' ? e.elapsedMin + 'm' : '—'}</span>
                <span style={{width:38, flexShrink:0, fontSize:11, fontWeight:800, textAlign:'right', whiteSpace:'nowrap', color: e.score != null ? (e.score >= 75 ? '#2E7D32' : '#B26A00') : '#C4C4C4'}}>{e.score != null ? e.score + '%' : '—'}</span>
                <span style={{display:'flex', gap:3, flexShrink:0}}>
                  {CB_LV.map(lv => {
                    const on = marks[e.student.id] === lv.v;
                    return (
                      <button key={lv.v} onClick={() => setMark(e, lv)} title={`${e.student.fullName} · 🙋 Participación → ${lv.ico} ${lv.label} (+${lv.xp} XP)`}
                        style={{width:26, height:26, cursor:'pointer', fontFamily:'inherit', fontSize:on ? 14 : 12, lineHeight:1,
                          background: on ? lv.bg : '#fff', color: on ? lv.fg : '#C4C4C4', opacity: on ? 1 : .5,
                          border:'1.5px solid ' + (on ? lv.bd : 'var(--border)'), borderRadius:7}}>{lv.ico}</button>
                    );
                  })}
                </span>
                {saved[e.student.id] && <span title="Participación guardada" style={{fontSize:11, fontWeight:800, color:'#2E7D32'}}>✓</span>}
              </div>
            );
          })}
        </div>
      )}
      {open && <div style={{fontSize:10.5, color:'var(--text-soft)', fontWeight:700, marginTop:7}}>Participación: {CB_LV.map(l => `${l.ico} +${l.xp} XP`).join(' · ')} — se guarda en el perfil del alumno. ⚠ = practicó algo fuera del plan.</div>}
    </div>
  );
}

/* ── Tablero ─────────────────────────────────────────────────────────── */
function LiveClassroom({ groupId, embedded, lockGroup, focusKeys, planId }) {
  const D = window.JUCUM_DATA;
  const GROUPS = D.GROUPS || [];
  const [gid, setGid] = React.useState(groupId || (GROUPS[0] && GROUPS[0].id) || '');
  const [rows, setRows] = React.useState(null);
  const [meta, setMeta] = React.useState({ degraded:false, at:0 });
  const [big, setBig] = React.useState(false);
  const [showEmpty, setShowEmpty] = React.useState(false);
  const [pickOpen, setPickOpen] = React.useState(false);
  const [inspect, setInspect] = React.useState(null);   // 👁 alumno en la ventana flotante
  const [, setTick] = React.useState(0);
  React.useEffect(() => { if (groupId) setGid(groupId); }, [groupId]);

  /* Actividades que SE TRABAJAN en esta clase (las elige el profesor).
   * Vacío = todas. Se recuerdan por plan (o por grupo si no hay plan). */
  const FOCUS_KEY = 'jucum_live_focus_v1';
  const focusSlot = planId || ('g:' + (groupId || gid));
  const [focus, setFocus] = React.useState(() => {
    try {
      const all = JSON.parse(localStorage.getItem(FOCUS_KEY) || '{}');
      if (Array.isArray(all[focusSlot])) return all[focusSlot];
    } catch (e) {}
    return Array.isArray(focusKeys) ? focusKeys : [];
  });
  const saveFocus = (arr) => {
    setFocus(arr);
    try {
      const all = JSON.parse(localStorage.getItem(FOCUS_KEY) || '{}');
      all[focusSlot] = arr; localStorage.setItem(FOCUS_KEY, JSON.stringify(all));
    } catch (e) {}
  };

  React.useEffect(() => {
    if (!window.JUCUM_LIVE) { setRows([]); return; }
    const stop = window.JUCUM_LIVE.subscribe((r, m) => { setRows(r); setMeta(m); }, 10000);
    const t = setInterval(() => setTick(x => x + 1), 1000);
    return () => { stop(); clearInterval(t); };
  }, []);

  const group = GROUPS.find(g => g.id === gid) || GROUPS[0];
  if (!group) return <div className="empty-state"><div className="icon">🏫</div>Aún no hay grupos creados.</div>;
  const level = D.LEVELS[group.level] || { color:'#F9A825', dark:'#E65100' };
  const settings = D.getGroupSettings(group.id);
  const activeIds = (settings.activeModuleIds && settings.activeModuleIds.length)
    ? settings.activeModuleIds : (settings.activeModuleId ? [settings.activeModuleId] : []);
  const mods = (D.MODULE_CATALOG[group.level] || []).filter(m => activeIds.includes(m.id));
  const members = (D.STUDENTS || []).filter(s => s.group === group.id);
  const k = big ? 1.35 : 1;
  const now = Date.now();

  // Mesas = actividades de los módulos activos
  const zones = [];
  const zoneBy = {};
  mods.forEach(m => (m.activities || []).forEach(a => {
    const z = { key: `${m.id}:${a.id}`, icon: LC_ICO[a.type] || '📄', name: a.name,
                sub: mods.length > 1 ? `${m.emoji || '📦'} ${m.name}` : (a.group || ''), people: [] };
    zones.push(z); zoneBy[z.key] = z;
  }));
  const extra = { key:'__extra', icon:'📌', name:'Otra actividad', sub:'fuera del módulo activo', people:[] };
  const examZone = { key:'__exam', icon:'🎓', name:'Rindiendo examen', sub:'no cuenta como práctica', people:[] };

  const byId = {}; (rows || []).forEach(r => { byId[r.user_id] = r; });
  /* ¿Practicó HOY (día Perú) aunque su presencia ya no esté? La fila única de
   * presencia se pisa con cada material; las notas del día no mienten. Así un
   * alumno que SÍ practicó jamás cae en "no entran a practicar". */
  const todayPeru = new Date(now - 5 * 3600000).toISOString().slice(0, 10);
  const practicedToday = (sid) => {
    try {
      const c = (D.getStudentProgress(sid) || {}).completed || {};
      return Object.values(c).some(e => {
        const t = Date.parse((e && e.date) || '');
        return t && new Date(t - 5 * 3600000).toISOString().slice(0, 10) === todayPeru;
      });
    } catch (e) { return false; }
  };
  const roster = [];                  // 📋 tablero de la clase (todos los alumnos)
  const waiting = [];                 // todavía no entran
  const practiced = [];               // sin presencia AHORA, pero con práctica hoy
  const leftEarly = [];               // entraron y salieron sin terminar (y sin nota hoy)
  let nWorking = 0, nDone = 0;
  members.forEach(st => {
    const r = byId[st.id];
    const c = window.JUCUM_LIVE ? window.JUCUM_LIVE.classify(r, now) : { phase:'off', bubble:null, elapsedMin:0 };
    const act = r ? (zoneBy[r.module_id + ':' + r.activity_id] || null) : null;
    const entry = { student: st, phase: r ? c.phase : 'off', elapsedMin: c.elapsedMin || 0,
                    score: r ? r.score : null, actName: act ? act.name : (r ? (r.material_name || r.activity_id) : null),
                    exam: r ? r.exam : false, inPlan: r ? (!focus.length || focus.includes(r.module_id + ':' + r.activity_id)) : true };
    roster.push(entry);
    if (!r || c.phase === 'off') {
      if (practicedToday(st.id)) { entry.phase = 'practiced'; practiced.push(entry); }
      else waiting.push({ student: st, phase:'off' });
      return;
    }
    if (c.phase === 'gone') {
      if (practicedToday(st.id)) { entry.phase = 'practiced'; practiced.push(entry); }
      else leftEarly.push(entry);
      return;
    }
    const p = { student: st, phase: c.phase, bubble: c.bubble, elapsedMin: c.elapsedMin, score: r.score };
    if (c.phase === 'done' || c.phase === 'finished') nDone++; else nWorking++;
    const z = r.exam ? examZone : (zoneBy[r.module_id + ':' + r.activity_id] || extra);
    if (z === extra) { z.people.push(p); if (!extra.sub2) extra.sub2 = r.material_name || r.activity_id; }
    else z.people.push(p);
  });
  if (extra.people.length) zones.push(extra);
  if (examZone.people.length) zones.unshift(examZone);

  const busyAll = zones.filter(z => z.people.length).sort((a, b) => b.people.length - a.people.length);
  const isSpecial = (z) => z.key === '__extra' || z.key === '__exam';
  const inFocus = (z) => !focus.length || focus.includes(z.key) || isSpecial(z);
  const busy = busyAll.filter(inFocus);
  const outside = busyAll.filter(z => !inFocus(z));               // practicando algo fuera del plan
  const idle = zones.filter(z => !z.people.length && (!focus.length || focus.includes(z.key)));
  const showIdleAlways = focus.length > 0;                        // si el profe eligió, sus mesas se ven siempre
  const ago = meta.at ? Math.max(0, Math.round((now - meta.at) / 1000)) : null;
  const allActs = [];
  mods.forEach(m => (m.activities || []).forEach(a => allActs.push({ key: `${m.id}:${a.id}`, mod: m, act: a })));

  return (
    <div style={{marginTop: embedded ? 0 : 12}}>
      {/* Barra superior */}
      <div style={{display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:12}}>
        <span style={{display:'inline-flex', alignItems:'center', gap:7, background:'#B71C1C', color:'#fff', borderRadius:22, padding:'7px 14px', fontWeight:800, fontSize:12.5}}>
          <span style={{width:9, height:9, borderRadius:'50%', background:'#fff', animation:'lcPulse 1.3s infinite'}}></span> EN VIVO
        </span>
        <div style={{display:'flex', gap:7, flexWrap:'wrap'}}>
          {lockGroup
            ? <span style={{display:'inline-flex', alignItems:'center', gap:6, borderRadius:20, padding:'6px 12px', fontWeight:800, fontSize:12,
                border:'1.5px solid ' + ((D.LEVELS[group.level] || {}).dark || '#333'), background:'#fff', color:(D.LEVELS[group.level] || {}).dark || '#333'}}>
                {(D.LEVELS[group.level] || {}).emoji} {group.name} <span style={{fontSize:10, color:'#9A9A9A'}}>· grupo de la clase</span>
              </span>
            : GROUPS.map(g => {
            const on = g.id === group.id;
            const lv = D.LEVELS[g.level] || {};
            return (
              <button key={g.id} onClick={() => setGid(g.id)} style={{cursor:'pointer', borderRadius:20, padding:'6px 12px', fontWeight:800, fontSize:12, fontFamily:'inherit',
                border:'1.5px solid ' + (on ? (lv.dark || '#333') : 'var(--border)'), background: on ? (lv.dark || '#333') : '#fff', color: on ? '#fff' : '#777'}}>
                {lv.emoji} {g.name}
              </button>
            );
          })}
        </div>
        <div style={{flex:1}}></div>
        <span style={{fontSize:12, fontWeight:800, color:'#B71C1C'}}>🔴 {nWorking} practicando</span>
        <span style={{fontSize:12, fontWeight:800, color:'#2E7D32'}}>✅ {nDone} ya terminaron</span>
        {practiced.length > 0 && <span style={{fontSize:12, fontWeight:800, color:'#2E7D32'}}>✔ {practiced.length} practicaron hoy</span>}
        <span style={{fontSize:12, fontWeight:800, color:'#9A9A9A'}}>💤 {waiting.length} sin entrar</span>
        <button onClick={() => setPickOpen(v => !v)} style={{cursor:'pointer', borderRadius:20, padding:'6px 12px', fontWeight:800, fontSize:12, fontFamily:'inherit',
          border:'1.5px solid ' + (focus.length ? '#1F3A8A' : 'var(--border)'), background: focus.length ? '#EEF2FF' : '#fff', color: focus.length ? '#1F3A8A' : '#777'}}>
          ⚙️ Actividades de la clase{focus.length ? ` (${focus.length})` : ''}
        </button>
        <button onClick={() => setBig(v => !v)} style={{cursor:'pointer', borderRadius:20, padding:'6px 12px', fontWeight:800, fontSize:12, fontFamily:'inherit',
          border:'1.5px solid ' + (big ? '#1F3A8A' : 'var(--border)'), background: big ? '#EEF2FF' : '#fff', color: big ? '#1F3A8A' : '#777'}}>
          {big ? '🔎 tamaño normal' : '📽 modo proyector'}
        </button>
      </div>

      {pickOpen && (
        <div style={{border:'1.5px solid #C9D6F5', background:'#F7FAFF', borderRadius:14, padding:'11px 13px', marginBottom:12}}>
          <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:8}}>
            <b style={{fontSize:12.5, flex:1}}>¿Qué actividades estamos trabajando en esta clase?</b>
            {Array.isArray(focusKeys) && focusKeys.length > 0 &&
              <button onClick={() => saveFocus(focusKeys)} style={{cursor:'pointer', border:'1.5px solid #C9D6F5', background:'#fff', color:'#1F3A8A', borderRadius:16, padding:'5px 11px', fontFamily:'inherit', fontWeight:800, fontSize:11}}>📘 las del plan ({focusKeys.length})</button>}
            <button onClick={() => saveFocus(allActs.map(x => x.key))} style={{cursor:'pointer', border:'1.5px solid var(--border)', background:'#fff', color:'#666', borderRadius:16, padding:'5px 11px', fontFamily:'inherit', fontWeight:800, fontSize:11}}>Todas</button>
            <button onClick={() => saveFocus([])} style={{cursor:'pointer', border:'1.5px solid var(--border)', background:'#fff', color:'#666', borderRadius:16, padding:'5px 11px', fontFamily:'inherit', fontWeight:800, fontSize:11}}>Quitar filtro</button>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(230px,1fr))', gap:5, maxHeight:230, overflowY:'auto'}}>
            {allActs.map(x => {
              const on = focus.includes(x.key);
              return (
                <label key={x.key} style={{display:'flex', alignItems:'center', gap:7, cursor:'pointer', padding:'6px 9px', borderRadius:10,
                  background: on ? '#E8F0FE' : '#fff', border:'1px solid ' + (on ? '#9FB0DA' : 'var(--border)')}}>
                  <input type="checkbox" checked={on} onChange={() => saveFocus(on ? focus.filter(k => k !== x.key) : focus.concat(x.key))} />
                  <span style={{fontSize:13}}>{LC_ICO[x.act.type] || '📄'}</span>
                  <span style={{fontSize:11.5, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{x.act.name}</span>
                </label>
              );
            })}
            {!allActs.length && <div style={{fontSize:12, fontWeight:700, color:'var(--text-soft)'}}>Este grupo no tiene módulos activos.</div>}
          </div>
          <div style={{fontSize:11, color:'var(--text-soft)', fontWeight:700, marginTop:7}}>Las elegidas se muestran siempre (aunque nadie esté dentro). Quien practique otra cosa aparece abajo, en “fuera del plan”.</div>
        </div>
      )}

      {meta.degraded && (
        <div style={{fontSize:12, fontWeight:700, color:'#8A6D1A', background:'#FFF8E1', border:'1.5px solid #F0C66B', borderRadius:12, padding:'9px 13px', marginBottom:11, lineHeight:1.5}}>
          ⚠ Modo básico: se ve quién practica pero con ~2 min de retraso y sin los avisos de “inicié / finalicé”.
          Ejecuta el <b>script 26</b> en Supabase para el seguimiento segundo a segundo.
        </div>
      )}

      {rows === null ? (
        <div className="empty-state"><div className="icon">📡</div>Conectando con la clase…</div>
      ) : !mods.length ? (
        <div className="empty-state"><div className="icon">📦</div>Este grupo no tiene módulos activos. Actívalos en <b>Gestionar módulos</b> para ver sus mesas de trabajo.</div>
      ) : (
        <>
          {busy.length === 0 && outside.length === 0 && (
            <div style={{textAlign:'center', padding:'22px 16px', borderRadius:16, border:'1.5px dashed var(--border)', background:'#FCFCFA', marginBottom:12}}>
              <div style={{fontSize:30}}>🪑</div>
              <div style={{fontWeight:800, fontSize:14, marginTop:5}}>Nadie está practicando en este momento</div>
              <div style={{fontSize:12.5, color:'var(--text-soft)', fontWeight:700, marginTop:3}}>En cuanto un alumno abra un material, su personaje aparecerá en la mesa correspondiente.</div>
            </div>
          )}

          <div style={{display:'grid', gap:12, gridTemplateColumns:`repeat(auto-fill, minmax(${big ? 380 : 290}px, 1fr))`}}>
            {busy.map(z => <LCZone key={z.key} zone={z} scale={k} level={level} onSelect={setInspect} />)}
            {(showIdleAlways || showEmpty) && idle.map(z => <LCZone key={z.key} zone={z} scale={k} level={level} onSelect={setInspect} />)}
          </div>

          {outside.length > 0 && (
            <>
              <div style={{fontSize:11, fontWeight:800, letterSpacing:'.05em', textTransform:'uppercase', color:'#B26A00', margin:'14px 0 7px'}}>
                ⚠ Practicando algo fuera del plan de clase
              </div>
              <div style={{display:'grid', gap:12, gridTemplateColumns:`repeat(auto-fill, minmax(${big ? 380 : 290}px, 1fr))`}}>
                {outside.map(z => <LCZone key={z.key} zone={z} scale={k} level={level} onSelect={setInspect} />)}
              </div>
            </>
          )}

          {!showIdleAlways && idle.length > 0 && (
            <button onClick={() => setShowEmpty(v => !v)} style={{marginTop:11, cursor:'pointer', borderRadius:20, padding:'8px 14px', fontWeight:800, fontSize:12, fontFamily:'inherit',
              border:'1.5px solid var(--border)', background:'#fff', color:'#777'}}>
              {showEmpty ? `Ocultar las ${idle.length} actividades vacías` : `Ver las ${idle.length} actividades vacías`}
            </button>
          )}

          {/* 📋 Tablero de la clase: quién entró, quién terminó y su participación */}
          <ClassBoard roster={roster} groupId={group.id} onSelect={setInspect} />

          {/* Sala de espera — solo quienes AÚN no entran (los que ya practicaron se quedan en su mesa) */}
          <div style={{marginTop:14, borderRadius:16, border:'1.5px solid var(--border)', background:'#FAFAF6', padding:'11px 13px 14px'}}>
            <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap'}}>
              <b style={{fontSize:13}}>🛋️ Todavía no entran a practicar</b>
              <span style={{fontSize:11, fontWeight:800, color:'#9A9A9A'}}>{waiting.length} de {members.length}</span>
              {leftEarly.length > 0 && <span style={{fontSize:11, fontWeight:800, color:'#B26A00', background:'#FFF8E1', border:'1px solid #F0C66B', borderRadius:11, padding:'2px 9px'}}>
                ⚠ {leftEarly.length} entró y salió sin terminar: {leftEarly.map(e => lcFirst(e.student.fullName)).join(', ')}</span>}
            </div>
            {practiced.length > 0 && (
              <div style={{fontSize:11.5, fontWeight:800, color:'#1B5E20', background:'#E8F5E9', border:'1px solid #A5D6A7', borderRadius:11, padding:'6px 11px', marginBottom:7, lineHeight:1.5}}>
                ✔ Ya practicaron hoy (aunque ahora no están dentro): {practiced.map(e => lcFirst(e.student.fullName)).join(', ')}
              </div>
            )}
            {waiting.length === 0
              ? <div style={{fontSize:12.5, fontWeight:800, color:'#2E7D32'}}>🎉 ¡Todo el grupo entró a practicar!</div>
              : <div style={{display:'flex', flexWrap:'wrap', gap:4}}>
                  {waiting.map(w => <LCChar key={w.student.id} student={w.student} phase="off" bubble={null} mins={0} score={null} scale={k * 0.92} onClick={() => setInspect(w.student)} />)}
                </div>}
          </div>
        </>
      )}

      {inspect && <StudentDayModal student={inspect} live={byId[inspect.id] || null} onClose={() => setInspect(null)} />}
      <div style={{fontSize:11, color:'var(--text-soft)', fontWeight:700, marginTop:10}}>
        Se actualiza solo cada 10 s{ago != null ? ` · última lectura hace ${ago}s` : ''} · 🔴 practicando · ⏸ dentro pero sin moverse · ✅ ya terminó (se queda en su mesa el resto de la clase) · <b>toca un personaje o un nombre para ver qué practicó</b>
        <br/><b>📗 Stories:</b> no tienen nota — se miden por tiempo de lectura: a los <b>4 minutos</b> leyendo cuentan como terminadas (✅) y el tiempo sigue sumando hasta 30 min.
      </div>
      <style>{`@keyframes lcPulse{0%,100%{opacity:1}50%{opacity:.25}}@keyframes lcBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}@keyframes lcHop{0%{transform:translateY(0)}35%{transform:translateY(-9px)}100%{transform:translateY(0)}}@keyframes lcPop{0%{transform:translate(-50%,6px) scale(.8);opacity:0}100%{transform:translate(-50%,0) scale(1);opacity:1}}`}</style>
    </div>
  );
}

Object.assign(window, { LiveClassroom, LCChar, LCZone, ClassBoard, StudentDayModal });
