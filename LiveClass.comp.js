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
function LCChar({ student, phase, bubble, mins, score, scale }) {
  const k = scale || 1;
  const skin = lcSkin(student.id);
  const off = phase === 'off' || phase === 'gone';
  const fin = phase === 'finished';   // ya practicó: se queda en su mesa, en calma
  const tone = (phase === 'done' || fin) ? '#2E7D32' : phase === 'paused' ? '#B26A00' : off ? '#BDBDBD' : '#E53935';
  const anim = phase === 'working' || phase === 'start' ? 'lcBob 2.4s ease-in-out infinite'
             : phase === 'done' ? 'lcHop .9s ease-out 2' : 'none';
  return (
    <div style={{width: 92*k, flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', position:'relative', paddingTop: bubble ? 44*k : 8*k, opacity: off ? .5 : 1}}>
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
function LCZone({ zone, scale, level }) {
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
          : zone.people.map(p => <LCChar key={p.student.id} student={p.student} phase={p.phase} bubble={p.bubble} mins={p.elapsedMin} score={p.score} scale={k} />)}
      </div>
    </div>
  );
}

/* ── 📋 Tablero de la clase ───────────────────────────────────────────
 * Compacto: una línea por alumno con si ENTRÓ, si TERMINÓ, su tiempo y nota,
 * y un registro de PARTICIPACIÓN de un toque (👍 12 XP · 😐 7 · 👎 3) que se
 * guarda en su perfil como evaluación presencial. */
const CB_STATES = [
  { v:null, ico:'·',  bg:'#F7F6F2', fg:'#C4C4C4', bd:'#E8E5DC', stars:null, xp:0,  txt:'sin marcar' },
  { v:2,    ico:'👍', bg:'#E8F5E9', fg:'#2E7D32', bd:'#A5D6A7', stars:5,    xp:12, txt:'participó bien' },
  { v:1,    ico:'😐', bg:'#FFF8E1', fg:'#B26A00', bd:'#F0C66B', stars:3,    xp:7,  txt:'participó poco' },
  { v:0,    ico:'👎', bg:'#FFEBEE', fg:'#C62828', bd:'#FFCDD2', stars:1,    xp:3,  txt:'no participó' },
];
const CB_PHASE = {
  working:  { ico:'🔴', txt:'practicando',  c:'#B71C1C' },
  start:    { ico:'🔴', txt:'recién entró', c:'#B71C1C' },
  paused:   { ico:'⏸',  txt:'sin moverse',  c:'#B26A00' },
  done:     { ico:'✅', txt:'terminó ahora', c:'#2E7D32' },
  finished: { ico:'✅', txt:'ya terminó',   c:'#2E7D32' },
  gone:     { ico:'↩️', txt:'se fue',       c:'#B26A00' },
  off:      { ico:'💤', txt:'no ha entrado', c:'#9A9A9A' },
};

function ClassBoard({ roster, groupId }) {
  const D = window.JUCUM_DATA;
  const [open, setOpen] = React.useState(true);
  const [marks, setMarks] = React.useState({});
  const [saved, setSaved] = React.useState({});
  const [msg, setMsg] = React.useState(null);
  const bump = (sid) => setMarks(m => ({ ...m, [sid]: ((m[sid] || 0) + 1) % CB_STATES.length }));
  const st = (sid) => CB_STATES[marks[sid] || 0];
  const pend = roster.filter(e => st(e.student.id).stars != null);
  const totalXP = pend.reduce((s, e) => s + st(e.student.id).xp, 0);
  const order = { working:0, start:0, paused:1, done:2, finished:3, gone:4, off:5 };
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
          feedback:`🙋 Participación en clase: ${s.txt}` + (e.actName ? ` · practicó ${e.actName}` : ''),
          attachments:[], kind:'clase',
        });
      } catch (err) {}
      if (s.xp > 0 && D.addBonusXP) D.addBonusXP(e.student.id, s.xp);
      if (window.JUCUM_NOTIF) window.JUCUM_NOTIF.pushNotif(e.student.id, {
        type:'teacher-feedback', title:`🙋 Tu profesor registró tu participación (+${s.xp} XP)`, body:`${s.txt.charAt(0).toUpperCase() + s.txt.slice(1)}. ¡Sigue así! 💪`,
      });
    });
    const ok = {}; pend.forEach(e => ok[e.student.id] = true);
    setSaved(p => ({ ...p, ...ok }));
    setMsg(`✅ Participación guardada para ${pend.length} alumno(s) · +${totalXP} XP`);
    setMarks({});
    setTimeout(() => setMsg(null), 6000);
  };

  return (
    <div style={{marginTop:14, borderRadius:16, border:'1.5px solid #C9D6F5', background:'#F9FBFF', padding:'11px 13px 13px'}}>
      <div style={{display:'flex', alignItems:'center', gap:9, flexWrap:'wrap'}}>
        <b style={{fontSize:13}}>📋 Tablero de la clase</b>
        <span style={{fontSize:11.5, fontWeight:800, color:'#1F3A8A', whiteSpace:'nowrap'}}>{nIn} entraron · {nFin} terminaron · {roster.length - nIn} sin entrar</span>
        <div style={{flex:1}}></div>
        {pend.length > 0 && <span style={{fontSize:11.5, fontWeight:800, color:'#1F3A8A', background:'#E3E9F8', borderRadius:12, padding:'4px 10px'}}>{pend.length} · +{totalXP} XP</span>}
        {pend.length > 0 && <button onClick={save} style={{cursor:'pointer', border:'none', background:'#1F3A8A', color:'#fff', borderRadius:20, padding:'7px 14px', fontFamily:'inherit', fontWeight:800, fontSize:12}}>💾 Guardar participación</button>}
        <button onClick={() => setOpen(v => !v)} style={{cursor:'pointer', border:'1.5px solid var(--border)', background:'#fff', color:'#666', borderRadius:20, padding:'6px 12px', fontFamily:'inherit', fontWeight:800, fontSize:11.5}}>{open ? 'Ocultar' : 'Ver'}</button>
      </div>
      {msg && <div style={{fontSize:12, fontWeight:800, color:'#1B5E20', background:'#E8F5E9', border:'1px solid #A5D6A7', borderRadius:10, padding:'7px 11px', marginTop:8}}>{msg}</div>}
      {open && (
        <div style={{display:'grid', gap:3, marginTop:9, maxHeight:340, overflowY:'auto'}}>
          {list.map(e => {
            const ph = CB_PHASE[e.phase] || CB_PHASE.off;
            const s = st(e.student.id);
            return (
              <div key={e.student.id} style={{display:'flex', alignItems:'center', gap:8, padding:'5px 9px', borderRadius:9, background:'#fff', border:'1px solid var(--border)'}}>
                <span style={{fontSize:13, width:18, textAlign:'center'}}>{ph.ico}</span>
                <span style={{flex:'1 1 120px', minWidth:90, fontWeight:800, fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{lcFirst(e.student.fullName)}</span>
                <span style={{flex:'1 1 130px', minWidth:0, fontSize:11, fontWeight:700, color:'var(--text-soft)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                  {e.actName || '—'}{e.actName && !e.inPlan ? ' ⚠' : ''}{e.exam ? ' 🎓' : ''}
                </span>
                <span style={{width:96, flexShrink:0, fontSize:10.5, fontWeight:800, color:ph.c, textAlign:'right', whiteSpace:'nowrap'}} title={e.phase === 'gone' ? 'Entró y salió sin terminar' : e.phase === 'paused' ? 'Dentro de la actividad pero sin moverse' : ph.txt}>{ph.txt}</span>
                <span style={{width:42, flexShrink:0, fontSize:11, fontWeight:800, color:'#666', textAlign:'right', whiteSpace:'nowrap'}}>{e.phase !== 'off' ? e.elapsedMin + 'm' : '—'}</span>
                <span style={{width:38, flexShrink:0, fontSize:11, fontWeight:800, textAlign:'right', whiteSpace:'nowrap', color: e.score != null ? (e.score >= 75 ? '#2E7D32' : '#B26A00') : '#C4C4C4'}}>{e.score != null ? e.score + '%' : '—'}</span>
                <button onClick={() => bump(e.student.id)} title={`Participación · ${s.txt} (toca para cambiar)`}
                  style={{width:40, height:28, cursor:'pointer', fontFamily:'inherit', fontSize:14, lineHeight:1, background:s.bg, color:s.fg, border:'1.5px solid ' + s.bd, borderRadius:8}}>{s.ico}</button>
                {saved[e.student.id] && <span title="Participación guardada" style={{fontSize:11, fontWeight:800, color:'#2E7D32'}}>✓</span>}
              </div>
            );
          })}
        </div>
      )}
      {open && <div style={{fontSize:10.5, color:'var(--text-soft)', fontWeight:700, marginTop:7}}>Participación: 👍 12 XP · 😐 7 · 👎 3 — se guarda en el perfil del alumno. ⚠ = practicó algo fuera del plan.</div>}
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
  const roster = [];                  // 📋 tablero de la clase (todos los alumnos)
  const waiting = [];                 // todavía no entran
  const leftEarly = [];               // entraron y salieron sin terminar
  let nWorking = 0, nDone = 0;
  members.forEach(st => {
    const r = byId[st.id];
    const c = window.JUCUM_LIVE ? window.JUCUM_LIVE.classify(r, now) : { phase:'off', bubble:null, elapsedMin:0 };
    const act = r ? (zoneBy[r.module_id + ':' + r.activity_id] || null) : null;
    const entry = { student: st, phase: r ? c.phase : 'off', elapsedMin: c.elapsedMin || 0,
                    score: r ? r.score : null, actName: act ? act.name : (r ? (r.material_name || r.activity_id) : null),
                    exam: r ? r.exam : false, inPlan: r ? (!focus.length || focus.includes(r.module_id + ':' + r.activity_id)) : true };
    roster.push(entry);
    if (!r || c.phase === 'off') { waiting.push({ student: st, phase:'off' }); return; }
    if (c.phase === 'gone') { leftEarly.push(entry); return; }   // no ocupa mesa: se fue sin terminar
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
            {busy.map(z => <LCZone key={z.key} zone={z} scale={k} level={level} />)}
            {(showIdleAlways || showEmpty) && idle.map(z => <LCZone key={z.key} zone={z} scale={k} level={level} />)}
          </div>

          {outside.length > 0 && (
            <>
              <div style={{fontSize:11, fontWeight:800, letterSpacing:'.05em', textTransform:'uppercase', color:'#B26A00', margin:'14px 0 7px'}}>
                ⚠ Practicando algo fuera del plan de clase
              </div>
              <div style={{display:'grid', gap:12, gridTemplateColumns:`repeat(auto-fill, minmax(${big ? 380 : 290}px, 1fr))`}}>
                {outside.map(z => <LCZone key={z.key} zone={z} scale={k} level={level} />)}
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
          <ClassBoard roster={roster} groupId={group.id} />

          {/* Sala de espera — solo quienes AÚN no entran (los que ya practicaron se quedan en su mesa) */}
          <div style={{marginTop:14, borderRadius:16, border:'1.5px solid var(--border)', background:'#FAFAF6', padding:'11px 13px 14px'}}>
            <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap'}}>
              <b style={{fontSize:13}}>🛋️ Todavía no entran a practicar</b>
              <span style={{fontSize:11, fontWeight:800, color:'#9A9A9A'}}>{waiting.length} de {members.length}</span>
              {leftEarly.length > 0 && <span style={{fontSize:11, fontWeight:800, color:'#B26A00', background:'#FFF8E1', border:'1px solid #F0C66B', borderRadius:11, padding:'2px 9px'}}>
                ⚠ {leftEarly.length} entró y salió sin terminar: {leftEarly.map(e => lcFirst(e.student.fullName)).join(', ')}</span>}
            </div>
            {waiting.length === 0
              ? <div style={{fontSize:12.5, fontWeight:800, color:'#2E7D32'}}>🎉 ¡Todo el grupo entró a practicar!</div>
              : <div style={{display:'flex', flexWrap:'wrap', gap:4}}>
                  {waiting.map(w => <LCChar key={w.student.id} student={w.student} phase="off" bubble={null} mins={0} score={null} scale={k * 0.92} />)}
                </div>}
          </div>
        </>
      )}

      <div style={{fontSize:11, color:'var(--text-soft)', fontWeight:700, marginTop:10}}>
        Se actualiza solo cada 10 s{ago != null ? ` · última lectura hace ${ago}s` : ''} · 🔴 practicando · ⏸ dentro pero sin moverse · ✅ ya terminó (se queda en su mesa el resto de la clase)
        <br/><b>📗 Stories:</b> no tienen nota — se miden por tiempo de lectura: a los <b>4 minutos</b> leyendo cuentan como terminadas (✅) y el tiempo sigue sumando hasta 30 min.
      </div>
      <style>{`@keyframes lcPulse{0%,100%{opacity:1}50%{opacity:.25}}@keyframes lcBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}@keyframes lcHop{0%{transform:translateY(0)}35%{transform:translateY(-9px)}100%{transform:translateY(0)}}@keyframes lcPop{0%{transform:translate(-50%,6px) scale(.8);opacity:0}100%{transform:translate(-50%,0) scale(1);opacity:1}}`}</style>
    </div>
  );
}

Object.assign(window, { LiveClassroom, LCChar, LCZone, ClassBoard });
