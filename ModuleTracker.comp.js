/* Seguimiento por MÓDULO · perfil del alumno (vista del profesor)
 * ─────────────────────────────────────────────────────────────────────
 * Reemplaza al viejo ModuleChecklist, que volcaba TODAS las actividades de
 * todos los módulos activos en una sola lista interminable. Ahora:
 *   · manda el MÓDULO ACTUAL (el activo del grupo, o el que tiene pendientes);
 *   · los demás módulos se ven solo si el profesor los elige (selector arriba);
 *   · las actividades van agrupadas por TEMA (campo "group" del catálogo);
 *   · muestra EN VIVO en qué actividad está el alumno ahora mismo (live.js).
 */
const MT_ICO = { story:'📗', reading:'📖', listening:'🎧', grammar:'📝', summary:'📚', quizlet:'🃏', exam:'🎓' };
const MT_BASE_BLOCK = '📚 Comprensión y vocabulario';

function mtScoreOf(e) {
  if (!e || typeof e.score !== 'number') return null;
  return e.score > 10 ? Math.round(e.score) : Math.round(e.score * 10);
}
function mtDate(d) {
  if (!d) return null;
  try { return new Date(d).toLocaleDateString('es-PE', { day:'numeric', month:'short' }); } catch (e) { return null; }
}
function mtTeacherUrl(mod, a) {
  if (!a || !a.url) return null;
  return a.url + (a.url.includes('?') ? '&' : '?') + 'jucum_teacher=1&jucum_mod=' + encodeURIComponent(mod.id) + '&jucum_act=' + encodeURIComponent(a.id);
}

function MTRing({ pct, color, size }) {
  const s = size || 58;
  return (
    <div style={{width:s, height:s, borderRadius:'50%', flexShrink:0, background:`conic-gradient(${color} ${Math.max(0,Math.min(100,pct))*3.6}deg, #ECE9E0 0deg)`, display:'grid', placeItems:'center'}}>
      <div style={{width:s-13, height:s-13, borderRadius:'50%', background:'#fff', display:'grid', placeItems:'center', whiteSpace:'nowrap', lineHeight:1, fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:Math.round(s*0.26), color:'#2A2A2A'}}>{pct}%</div>
    </div>
  );
}

/* Presencia en vivo de UN alumno (null si no está practicando) */
function useLiveRow(studentId) {
  const [row, setRow] = React.useState(null);
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    if (!window.JUCUM_LIVE || !studentId) return;
    const stop = window.JUCUM_LIVE.subscribe(rows => setRow(rows.find(r => r.user_id === studentId) || null), 12000);
    const t = setInterval(() => setTick(x => x + 1), 15000);
    return () => { stop(); clearInterval(t); };
  }, [studentId]);
  return row;
}

function ModuleTracker({ stu, group }) {
  const D = window.JUCUM_DATA;
  const settings = D.getGroupSettings(group.id);
  const mods = D.MODULE_CATALOG[group.level] || [];
  const progress = D.getStudentProgress(stu.id);
  const completed = progress.completed || {};
  const activeIds = (settings.activeModuleIds && settings.activeModuleIds.length)
    ? settings.activeModuleIds : (settings.activeModuleId ? [settings.activeModuleId] : []);
  const live = useLiveRow(stu.id);
  const cls = window.JUCUM_LIVE ? window.JUCUM_LIVE.classify(live) : { phase:'off', fresh:false };
  const [sel, setSel] = React.useState(null);
  const [openBlocks, setOpenBlocks] = React.useState(null);
  const [onlyPending, setOnlyPending] = React.useState(false);

  const stats = mods.map(m => {
    const acts = m.activities || [];
    const done = acts.filter(a => completed[`${m.id}:${a.id}`]);
    let last = null;
    done.forEach(a => { const d = completed[`${m.id}:${a.id}`].date; if (d && (!last || d > last)) last = d; });
    return { mod:m, total:acts.length, done:done.length, pct: acts.length ? Math.round(done.length/acts.length*100) : 0,
             active: activeIds.includes(m.id), last };
  });
  // Orden cronológico (como la ruta del alumno): el actual se señala, no se reordena.
  if (!stats.length) return null;

  // Módulo que manda: el activo con pendientes → el activo → donde está en vivo → el último con avance
  const liveMod = live && cls.fresh ? live.module_id : null;
  const def = stats.find(s => s.mod.id === liveMod)
    || stats.find(s => s.active && s.done < s.total)
    || stats.find(s => s.active)
    || [...stats].reverse().find(s => s.done > 0)
    || stats[0];
  const cur = stats.find(s => s.mod.id === sel) || def;
  const mod = cur.mod;
  const level = D.LEVELS[group.level] || { color:'#F9A825', dark:'#E65100' };
  const ringColor = cur.pct >= 85 ? '#2EA84B' : cur.pct >= 50 ? '#F9A825' : cur.pct > 0 ? '#EF6C00' : '#BDBDBD';

  // Bloques por tema (campo "group" del catálogo vivo)
  const blocks = [];
  (mod.activities || []).forEach(a => {
    const key = a.group || MT_BASE_BLOCK;
    let b = blocks.find(x => x.key === key);
    if (!b) blocks.push(b = { key, items: [] });
    b.items.push(a);
  });
  blocks.forEach(b => {
    b.done = b.items.filter(a => completed[`${mod.id}:${a.id}`]).length;
    b.hasLive = !!(liveMod === mod.id && b.items.some(a => a.id === live.activity_id));
  });
  const firstPending = blocks.find(b => b.hasLive) || blocks.find(b => b.done < b.items.length);
  const isOpen = (k) => openBlocks ? openBlocks.includes(k) : (firstPending ? k === firstPending.key : true);
  const toggleBlock = (k) => {
    const base = openBlocks || (firstPending ? [firstPending.key] : blocks.map(b => b.key));
    setOpenBlocks(base.includes(k) ? base.filter(x => x !== k) : base.concat(k));
  };

  const pend = cur.total - cur.done;
  const liveHere = liveMod === mod.id && cls.fresh;

  return (
    <div className="scard" style={{marginTop:18}}>
      <div className="sec-head">
        <div className="sec-title">📦 Avance por módulo</div>
        <span className="sec-meta">se muestra el módulo actual · toca otro para verlo</span>
      </div>

      {/* Ruta de módulos — igual que "Mi ruta" del alumno: el actual señalado, el resto a un toque */}
      {(() => {
        const useEmoji = group.level === 'a1' || group.level === 'a2';
        let lastCur = -1;
        stats.forEach((s, i) => { if (s.active) lastCur = i; });
        if (lastCur < 0) lastCur = stats.findIndex(s => s.mod.id === mod.id);
        return (
          <div style={{background:'#fff', border:'1px solid var(--border)', borderRadius:16, padding:'12px 8px 4px', marginBottom:12}}>
            <div style={{fontSize:11, fontWeight:800, letterSpacing:'.06em', textTransform:'uppercase', color:'#A8A8A8', margin:'0 10px 2px'}}>
              🗺️ Ruta del alumno · Módulo {lastCur + 1} de {stats.length} · toca uno para verlo
            </div>
            <div style={{display:'flex', overflowX:'auto', padding:'16px 6px 8px', gap:0}}>
              {stats.map((s, i) => {
                const on = s.mod.id === mod.id;
                const full = s.total > 0 && s.done >= s.total;
                const isCur = i === lastCur && !full;
                const hasLive = liveMod === s.mod.id && cls.fresh;
                const face = full ? '✓' : (useEmoji && s.mod.emoji ? s.mod.emoji : (i + 1));
                const ring = full ? '#2EA84B' : `conic-gradient(#2EA84B ${s.pct * 3.6}deg, #E3E9F8 0deg)`;
                return (
                  <button key={s.mod.id} onClick={() => { setSel(s.mod.id); setOpenBlocks(null); }} title={`${s.done}/${s.total} actividades`}
                    style={{flex:'none', width:108, display:'flex', flexDirection:'column', alignItems:'center', gap:7, position:'relative', cursor:'pointer', background:'none', border:'none', fontFamily:'inherit', padding:0}}>
                    {isCur && <span style={{position:'absolute', top:-14, fontSize:9, fontWeight:800, background:'#1F3A8A', color:'#fff', padding:'2px 7px', borderRadius:10, whiteSpace:'nowrap', zIndex:2}}>Aquí va</span>}
                    {hasLive && <span title="Está practicando en este módulo" style={{position:'absolute', top:-2, right:26, width:16, height:16, borderRadius:'50%', background:'#E53935', border:'2px solid #fff', zIndex:3, animation:'mtPulse 1.4s infinite'}}></span>}
                    {i < stats.length - 1 && <span style={{position:'absolute', top:24, left:78, width:54, height:3, background: full ? '#2EA84B' : 'var(--border)', borderRadius:2, zIndex:0}}></span>}
                    <span style={{width:48, height:48, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:ring, zIndex:1,
                      border: isCur ? '3px solid #1F3A8A' : '3px solid #fff', boxShadow: on ? '0 0 0 4px rgba(242,148,30,.35)' : 'none'}}>
                      <span style={{width:34, height:34, borderRadius:'50%', background: full ? 'transparent' : '#fff', color: full ? '#fff' : '#1F3A8A',
                        display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Fredoka',sans-serif", fontWeight:700, fontSize:(useEmoji && !full) ? 17 : 15}}>{face}</span>
                    </span>
                    <span style={{fontSize:10.5, fontWeight:800, color:'#6B6B6B', textAlign:'center', lineHeight:1.2, maxWidth:98}}>
                      M{i + 1}<br/>{s.mod.name}
                      <span style={{display:'block', color: full ? '#2EA84B' : '#8A8A8A', fontSize:9.5, marginTop:1}}>{s.pct}% completado</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Cabecera del módulo elegido */}
      <div style={{display:'flex', alignItems:'center', gap:14, padding:'12px 14px', borderRadius:14, background:'#FBFAF7', border:'1px solid var(--border)'}}>
        <MTRing pct={cur.pct} color={ringColor} size={62} />
        <div style={{flex:1, minWidth:0}}>
          <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
            <b style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:17}}>{mod.emoji || '📦'} {mod.name}</b>
            {cur.active
              ? <span style={{fontSize:10.5, fontWeight:800, whiteSpace:'nowrap', color:'#1B5E20', background:'#E8F5E9', border:'1px solid #A5D6A7', borderRadius:10, padding:'2px 8px'}}>MÓDULO ACTIVO</span>
              : <span style={{fontSize:10.5, fontWeight:800, whiteSpace:'nowrap', color:'#8A6D1A', background:'#FFF3D6', border:'1px solid #F0C66B', borderRadius:10, padding:'2px 8px'}}>NO ACTIVO</span>}
          </div>
          <div style={{display:'flex', gap:14, flexWrap:'wrap', marginTop:5, fontSize:12.5, fontWeight:700, color:'var(--text-soft)'}}>
            <span>✅ {cur.done} {cur.done === 1 ? 'hecha' : 'hechas'}</span>
            <span style={{color: pend ? '#B26A00' : '#2E7D32'}}>{pend ? `⬜ ${pend} ${pend === 1 ? 'pendiente' : 'pendientes'}` : '🎉 módulo completo'}</span>
            {cur.last && <span>🗓 última: {mtDate(cur.last)}</span>}
          </div>
        </div>
        <button onClick={() => setOnlyPending(v => !v)} style={{cursor:'pointer', borderRadius:20, padding:'7px 13px', fontWeight:800, fontSize:12, fontFamily:'inherit',
          border:'1.5px solid ' + (onlyPending ? '#B26A00' : 'var(--border)'), background: onlyPending ? '#FFF3D6' : '#fff', color: onlyPending ? '#8A6D1A' : '#666'}}>
          {onlyPending ? '👀 viendo pendientes' : 'Ver solo pendientes'}
        </button>
      </div>

      {/* En vivo */}
      {liveHere && (() => {
        const a = (mod.activities || []).find(x => x.id === live.activity_id);
        const doneNow = cls.phase === 'done';
        return (
          <div style={{display:'flex', alignItems:'center', gap:10, marginTop:10, padding:'11px 14px', borderRadius:14,
            background: doneNow ? '#E8F5E9' : '#FFEBEE', border:'1.5px solid ' + (doneNow ? '#A5D6A7' : '#FFCDD2')}}>
            <span style={{width:10, height:10, borderRadius:'50%', background: doneNow ? '#2E7D32' : '#E53935', animation:'mtPulse 1.4s infinite'}}></span>
            <div style={{flex:1, fontSize:13, fontWeight:800, color: doneNow ? '#1B5E20' : '#B71C1C'}}>
              {doneNow ? '✅ Acaba de terminar' : cls.phase === 'paused' ? '⏸ Está en la actividad, pero sin moverse' : '🔴 Practicando ahora mismo'}
              <span style={{fontWeight:700, color:'var(--text)'}}> · {a ? a.name : live.activity_id}</span>
            </div>
            <span style={{fontSize:12, fontWeight:800, color:'#555'}}>{cls.elapsedMin} min{live.score != null ? ` · ${live.score}%` : ''}</span>
          </div>
        );
      })()}

      {/* Bloques por tema */}
      <div style={{display:'grid', gap:9, marginTop:12}}>
        {blocks.map(b => {
          const open = isOpen(b.key);
          const full = b.done === b.items.length;
          const items = onlyPending ? b.items.filter(a => !completed[`${mod.id}:${a.id}`]) : b.items;
          if (onlyPending && !items.length) return null;
          return (
            <div key={b.key} style={{border:'1px solid ' + (b.hasLive ? '#FFCDD2' : 'var(--border)'), borderRadius:13, overflow:'hidden', background:'#fff'}}>
              <button onClick={() => toggleBlock(b.key)} style={{width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 13px', cursor:'pointer',
                border:'none', background: full ? '#F4FAF5' : b.hasLive ? '#FFF6F6' : '#FAFAF6', fontFamily:'inherit', textAlign:'left'}}>
                <span style={{fontSize:12, color:'var(--text-soft)', width:12}}>{open ? '▾' : '▸'}</span>
                <b style={{flex:1, fontSize:13.5, color: full ? '#1B5E20' : 'var(--text)'}}>{b.key}</b>
                {b.hasLive && <span style={{fontSize:10.5, fontWeight:800, whiteSpace:'nowrap', color:'#B71C1C', background:'#FFEBEE', border:'1px solid #FFCDD2', borderRadius:10, padding:'2px 8px'}}>EN VIVO</span>}
                <span style={{fontSize:11.5, fontWeight:800, whiteSpace:'nowrap', color: full ? '#2E7D32' : '#8A8A8A'}}>{b.done}/{b.items.length}</span>
                <span style={{width:64, height:7, borderRadius:5, background:'#ECE9E0', overflow:'hidden'}}>
                  <span style={{display:'block', height:'100%', width:Math.round(b.done/b.items.length*100)+'%', background: full ? '#2EA84B' : level.color}}></span>
                </span>
              </button>
              {open && (
                <div style={{display:'grid', gap:6, padding:'9px 11px 11px'}}>
                  {items.map(a => {
                    const e = completed[`${mod.id}:${a.id}`];
                    const sc = mtScoreOf(e);
                    const ok = e && (!D.entryPassed || D.entryPassed(e, group.level, group.id));
                    const here = liveHere && live.activity_id === a.id;
                    const url = mtTeacherUrl(mod, a);
                    return (
                      <div key={a.id} style={{display:'flex', alignItems:'center', gap:9, padding:'9px 11px', borderRadius:11,
                        background: here ? '#FFF6F6' : e ? (ok ? '#F4FAF5' : '#FFFBF0') : '#FAFAFA',
                        border:'1px solid ' + (here ? '#FFCDD2' : e ? (ok ? '#CDEBD2' : '#F0C66B') : '#EEEEEE')}}>
                        <span style={{fontSize:15, width:20, textAlign:'center'}}>{here ? '🔴' : e ? (ok ? '✅' : '⚠️') : '⬜'}</span>
                        <span style={{fontSize:13, width:20, textAlign:'center', opacity:.75}}>{MT_ICO[a.type] || '📄'}</span>
                        <span style={{flex:1, minWidth:0, fontWeight:700, fontSize:13, color: e ? 'var(--text)' : '#9E9E9E'}}>{a.name}</span>
                        {here && <span style={{fontSize:10.5, fontWeight:800, whiteSpace:'nowrap', color:'#B71C1C'}}>ahora · {cls.elapsedMin} min</span>}
                        {sc != null && <span style={{fontWeight:800, fontSize:12.5, color: sc >= 85 ? '#2E7D32' : sc >= 75 ? '#1565C0' : sc >= 50 ? '#B26A00' : '#C62828'}}>{sc}%</span>}
                        {e && e.minutes ? <span style={{color:'#999', fontSize:11.5, fontWeight:700}}>{Math.round(e.minutes)}m</span> : null}
                        {e && e.date ? <span style={{color:'#B0B0B0', fontSize:11}}>{mtDate(e.date)}</span> : null}
                        {!e && !here && <span style={{color:'#BBB', fontSize:11.5, fontWeight:700}}>pendiente</span>}
                        {url && <a href={url} target="_blank" rel="noopener" title="Abrir el material como profesor"
                          style={{fontSize:11, fontWeight:800, color:'#1F3A8A', textDecoration:'none', border:'1px solid #C5CAE9', background:'#F3F5FD', borderRadius:9, padding:'2px 7px'}}>abrir</a>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{fontSize:11, color:'var(--text-soft)', fontWeight:700, marginTop:9}}>
        ✅ aprobada · ⚠️ hecha por debajo del umbral · ⬜ pendiente · 🔴 practicándola en este momento
      </div>
      <style>{`@keyframes mtPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.82)}}`}</style>
    </div>
  );
}

Object.assign(window, { ModuleTracker, MTRing, useLiveRow });
