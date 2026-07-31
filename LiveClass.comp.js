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
  const tone = phase === 'done' ? '#2E7D32' : phase === 'paused' ? '#B26A00' : off ? '#BDBDBD' : '#E53935';
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
          {phase === 'done' && <span style={{position:'absolute', right:-4*k, top:-4*k, fontSize:14*k}}>✅</span>}
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
          {phase === 'done' ? (score != null ? `${score}%` : 'terminó') : `${mins} min`}
        </div>
      )}
    </div>
  );
}

/* ── Mesa (actividad) ────────────────────────────────────────────────── */
function LCZone({ zone, scale, level }) {
  const k = scale || 1;
  const busy = zone.people.length > 0;
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
        <span style={{fontSize:10.5*k, fontWeight:800, borderRadius:11, padding:`${2*k}px ${8*k}px`, whiteSpace:'nowrap',
          background: busy ? '#FFEBEE' : '#F1F0EB', color: busy ? '#B71C1C' : '#9A9A9A', border:'1px solid ' + (busy ? '#FFCDD2' : 'var(--border)')}}>
          {zone.people.length ? `👤 ${zone.people.length}` : 'vacía'}
        </span>
      </div>
      <div style={{minHeight:96*k, display:'flex', flexWrap:'wrap', gap:6*k, padding:`${8*k}px ${10*k}px ${12*k}px`, alignItems:'flex-end',
        background:'repeating-linear-gradient(135deg, rgba(0,0,0,0.014) 0 10px, transparent 10px 20px)'}}>
        {zone.people.length === 0
          ? <div style={{width:'100%', textAlign:'center', fontSize:11.5*k, fontWeight:700, color:'#C4C4C4', alignSelf:'center'}}>nadie aquí ahora</div>
          : zone.people.map(p => <LCChar key={p.student.id} student={p.student} phase={p.phase} bubble={p.bubble} mins={p.elapsedMin} score={p.score} scale={k} />)}
      </div>
    </div>
  );
}

/* ── Tablero ─────────────────────────────────────────────────────────── */
function LiveClassroom({ groupId, embedded }) {
  const D = window.JUCUM_DATA;
  const GROUPS = D.GROUPS || [];
  const [gid, setGid] = React.useState(groupId || (GROUPS[0] && GROUPS[0].id) || '');
  const [rows, setRows] = React.useState(null);
  const [meta, setMeta] = React.useState({ degraded:false, at:0 });
  const [big, setBig] = React.useState(false);
  const [showEmpty, setShowEmpty] = React.useState(false);
  const [, setTick] = React.useState(0);

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
  const waiting = [];
  let nWorking = 0, nDone = 0;
  members.forEach(st => {
    const r = byId[st.id];
    const c = window.JUCUM_LIVE ? window.JUCUM_LIVE.classify(r, now) : { phase:'off', bubble:null, elapsedMin:0 };
    if (!r || c.phase === 'off' || c.phase === 'gone') { waiting.push({ student: st, phase:'off' }); return; }
    const p = { student: st, phase: c.phase, bubble: c.bubble, elapsedMin: c.elapsedMin, score: r.score };
    if (c.phase === 'done') nDone++; else nWorking++;
    const z = r.exam ? examZone : (zoneBy[r.module_id + ':' + r.activity_id] || extra);
    if (z === extra) { z.people.push(p); if (!extra.sub2) extra.sub2 = r.material_name || r.activity_id; }
    else z.people.push(p);
  });
  if (extra.people.length) zones.push(extra);
  if (examZone.people.length) zones.unshift(examZone);

  const busy = zones.filter(z => z.people.length).sort((a, b) => b.people.length - a.people.length);
  const idle = zones.filter(z => !z.people.length);
  const ago = meta.at ? Math.max(0, Math.round((now - meta.at) / 1000)) : null;

  return (
    <div style={{marginTop: embedded ? 0 : 12}}>
      {/* Barra superior */}
      <div style={{display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:12}}>
        <span style={{display:'inline-flex', alignItems:'center', gap:7, background:'#B71C1C', color:'#fff', borderRadius:22, padding:'7px 14px', fontWeight:800, fontSize:12.5}}>
          <span style={{width:9, height:9, borderRadius:'50%', background:'#fff', animation:'lcPulse 1.3s infinite'}}></span> EN VIVO
        </span>
        <div style={{display:'flex', gap:7, flexWrap:'wrap'}}>
          {GROUPS.map(g => {
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
        <span style={{fontSize:12, fontWeight:800, color:'#2E7D32'}}>✅ {nDone} terminaron</span>
        <span style={{fontSize:12, fontWeight:800, color:'#9A9A9A'}}>💤 {waiting.length} sin entrar</span>
        <button onClick={() => setBig(v => !v)} style={{cursor:'pointer', borderRadius:20, padding:'6px 12px', fontWeight:800, fontSize:12, fontFamily:'inherit',
          border:'1.5px solid ' + (big ? '#1F3A8A' : 'var(--border)'), background: big ? '#EEF2FF' : '#fff', color: big ? '#1F3A8A' : '#777'}}>
          {big ? '🔎 tamaño normal' : '📽 modo proyector'}
        </button>
      </div>

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
          {busy.length === 0 && (
            <div style={{textAlign:'center', padding:'22px 16px', borderRadius:16, border:'1.5px dashed var(--border)', background:'#FCFCFA', marginBottom:12}}>
              <div style={{fontSize:30}}>🪑</div>
              <div style={{fontWeight:800, fontSize:14, marginTop:5}}>Nadie está practicando en este momento</div>
              <div style={{fontSize:12.5, color:'var(--text-soft)', fontWeight:700, marginTop:3}}>En cuanto un alumno abra un material, su personaje aparecerá en la mesa correspondiente.</div>
            </div>
          )}

          <div style={{display:'grid', gap:12, gridTemplateColumns:`repeat(auto-fill, minmax(${big ? 380 : 290}px, 1fr))`}}>
            {busy.map(z => <LCZone key={z.key} zone={z} scale={k} level={level} />)}
            {showEmpty && idle.map(z => <LCZone key={z.key} zone={z} scale={k} level={level} />)}
          </div>

          {idle.length > 0 && (
            <button onClick={() => setShowEmpty(v => !v)} style={{marginTop:11, cursor:'pointer', borderRadius:20, padding:'8px 14px', fontWeight:800, fontSize:12, fontFamily:'inherit',
              border:'1.5px solid var(--border)', background:'#fff', color:'#777'}}>
              {showEmpty ? `Ocultar las ${idle.length} actividades vacías` : `Ver las ${idle.length} actividades vacías`}
            </button>
          )}

          {/* Sala de espera */}
          <div style={{marginTop:14, borderRadius:16, border:'1.5px solid var(--border)', background:'#FAFAF6', padding:'11px 13px 14px'}}>
            <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:6}}>
              <b style={{fontSize:13}}>🛋️ Todavía no entran a practicar</b>
              <span style={{fontSize:11, fontWeight:800, color:'#9A9A9A'}}>{waiting.length} de {members.length}</span>
            </div>
            {waiting.length === 0
              ? <div style={{fontSize:12.5, fontWeight:800, color:'#2E7D32'}}>🎉 ¡Todo el grupo está trabajando!</div>
              : <div style={{display:'flex', flexWrap:'wrap', gap:4}}>
                  {waiting.map(w => <LCChar key={w.student.id} student={w.student} phase="off" bubble={null} mins={0} score={null} scale={k * 0.92} />)}
                </div>}
          </div>
        </>
      )}

      <div style={{fontSize:11, color:'var(--text-soft)', fontWeight:700, marginTop:10}}>
        Se actualiza solo cada 10 s{ago != null ? ` · última lectura hace ${ago}s` : ''} · 🔴 practicando · ⏸ dentro pero sin moverse · ✅ terminó (se queda 10 min)
      </div>
      <style>{`@keyframes lcPulse{0%,100%{opacity:1}50%{opacity:.25}}@keyframes lcBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}@keyframes lcHop{0%{transform:translateY(0)}35%{transform:translateY(-9px)}100%{transform:translateY(0)}}@keyframes lcPop{0%{transform:translate(-50%,6px) scale(.8);opacity:0}100%{transform:translate(-50%,0) scale(1);opacity:1}}`}</style>
    </div>
  );
}

Object.assign(window, { LiveClassroom, LCChar, LCZone });
