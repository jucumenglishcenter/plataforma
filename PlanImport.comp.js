/* 📄 Subir el plan del teacher (PLAN-IMPORT-V2 · 07-oct-2026 · acepta los PDF en formato de la plataforma;
 *    el teacher elige grupo + día, la sesión y las fechas las pone la plataforma)
 * Pantalla del Planificador: elegir grupo → subir los .docx → “Lo que entendí” →
 * “Falta completar” → “Revisar y editar” → Publicar → “Reporte de vuelta”.
 * Toda la lógica vive en plan-import.js (window.JUCUM_PLANIMPORT). El Modo clase
 * NO se toca: el plan publicado usa los mismos campos que el editor de siempre.
 * Nombres con prefijo pi* (los .comp.js comparten el ámbito global). */
const piBox = { background:'#fff', border:'1px solid #E3DCC9', borderRadius:12, padding:'12px 14px' };
const piLbl = { fontSize:10.5, fontWeight:800, letterSpacing:'0.06em', textTransform:'uppercase', color:'#8a7f6a' };
const piIn = { border:'1px solid #E3DCC9', borderRadius:8, padding:'6px 9px', fontSize:13, fontFamily:'inherit', fontWeight:600, background:'#fff', minWidth:0 };
const piBtn = { border:'1.5px solid #cdb86a', cursor:'pointer', fontFamily:'inherit', fontWeight:800, fontSize:12.5, color:'#6b5a1f', background:'#fff', borderRadius:10, padding:'7px 12px', whiteSpace:'nowrap' };
const piBtnP = { border:'none', cursor:'pointer', fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:14, color:'#fff', background:'linear-gradient(135deg,#2E7D32,#1B5E20)', borderRadius:11, padding:'9px 16px', whiteSpace:'nowrap' };
const piBtnB = { ...piBtnP, background:'linear-gradient(135deg,#3F5BB8,#0D1B5A)' };
const piChip = (bg, c) => ({ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:800, background:bg, color:c, borderRadius:12, padding:'2px 9px', whiteSpace:'nowrap' });
const PI_DN = ['dom','lun','mar','mié','jue','vie','sáb'];
const PI_SEV = { need:['Falta','#C0392B','#FDECEA'], check:['Revisar','#E67E00','#FFF4E5'], opt:['Opcional','#78909C','#ECEFF1'], info:['Aviso','#3F5BB8','#EEF2FC'] };
function piIcon(t) { return ({ story:'📖', reading:'📕', listening:'🎧', grammar:'✍️', summary:'🧠', quizlet:'🗂️' })[t] || '•'; }
function piMark(v) {
  const z = 15;
  if (v === 1) return <span title="completo" style={{display:'inline-block', width:z, height:z, borderRadius:'50%', background:'#43A047', position:'relative', verticalAlign:'middle'}}><span style={{position:'absolute', left:5, top:2, width:4, height:7, border:'solid #fff', borderWidth:'0 2px 2px 0', transform:'rotate(45deg)'}}></span></span>;
  if (v > 0) return <span title="hecho, nota baja" style={{display:'inline-block', width:z, height:z, borderRadius:'50%', background:'linear-gradient(90deg,#FB8C00 50%,#FFE0B2 50%)', verticalAlign:'middle'}}></span>;
  return <span title="no lo hizo" style={{display:'inline-block', width:z, height:z, borderRadius:'50%', border:'2.5px solid #E53935', background:'#fff', verticalAlign:'middle', boxSizing:'border-box'}}></span>;
}

function PlanImport({ importId, startTab, onBack, onClassMode }) {
  const PI = window.JUCUM_PLANIMPORT;
  const [rec, setRec] = React.useState(() => (importId && PI ? PI.get(importId) : null));
  const [tab, setTab] = React.useState(startTab || 'read');
  if (!PI) return <div className="scard">Falta cargar plan-import.js.</div>;
  if (!rec) return <PiStart onBack={onBack} onOpen={(r) => { setRec(r); setTab('read'); }} />;
  return <PiReview rec={rec} setRec={setRec} tab={tab} setTab={setTab} onBack={() => setRec(null)} onExit={onBack} onClassMode={onClassMode} />;
}

/* ════════ Paso 1 · grupo + documentos ════════ */
function PiStart({ onBack, onOpen }) {
  const PI = window.JUCUM_PLANIMPORT; const D = window.JUCUM_DATA;
  const groups = (typeof groupsSorted === 'function' ? groupsSorted() : (D.GROUPS || [])).filter(g => !g.finishedAt);
  const [gid, setGid] = React.useState(null);
  const [day, setDay] = React.useState('');
  const meta = gid && PI.groupMeta ? PI.groupMeta(gid) : null;
  const dayEff = day || (meta && meta.next[0]) || '';
  const [what, setWhat] = React.useState('class');   // 'class' = plan + práctica · 'classOnly' = solo plan · 'practice' = solo práctica
  const [pFrom, setPFrom] = React.useState(''); const [pTo, setPTo] = React.useState('');
  const [files, setFiles] = React.useState([]);
  const [paste, setPaste] = React.useState('');
  const [showPaste, setShowPaste] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');
  const [, setTick] = React.useState(0);
  const drafts = PI.list().slice(0, 30);
  const gName = id => { const g = (D.GROUPS || []).find(x => x.id === id); return g ? g.name : '⚠ grupo inexistente'; };
  const addFiles = (fl) => setFiles(prev => { const out = prev.slice(); Array.from(fl || []).forEach(f => { if (!out.some(x => x.name === f.name)) out.push(f); }); return out; });
  const go = async () => {
    setErr(''); if (!gid) { setErr('Elige el grupo primero.'); return; }
    const src = files.slice(); if (paste.trim()) src.push(new File([paste], 'texto-pegado.txt', { type:'text/plain' }));
    if (!src.length) { setErr('Sube al menos el plan de clase o la práctica.'); return; }
    setBusy(true);
    try { const read = []; for (const f of src) read.push(await PI.readFile(f)); const r = PI.create(read, gid, what === 'practice' ? { practiceOnly: true, from: pFrom || '', to: pTo || pFrom || '' } : { date: dayEff, classOnly: what === 'classOnly' }); onOpen(r); }
    catch (e) { setErr(e && e.message ? e.message : 'No se pudo leer.'); }
    setBusy(false);
  };
  return (
    <>
      {drafts.length > 0 && <PiUploadsBar drafts={drafts} gName={gName} onOpen={onOpen} onChanged={() => setTick(t => t + 1)} />}
      <div className="scard" style={{marginBottom:16}}>
        <div className="sec-title" style={{marginBottom:4}}>1 · ¿Para qué grupo es este plan?</div>
        <div style={{fontSize:12, color:'#8a7f6a', fontWeight:700, marginBottom:10}}>Los materiales, los links de Quizlet y la práctica de los alumnos salen del módulo de este grupo.</div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:8}}>
          {groups.map(g => { const on = gid === g.id; const lvc = ({ 'pre-a1':'#F9A825', a1:'#2196F3', a2:'#2EA84B' })[g.level] || '#999';
            const n = (D.STUDENTS || []).filter(s => s.group === g.id && s.active !== false).length;
            const cm = D.getClassModuleId ? (D.MODULE_CATALOG[g.level] || []).find(m => m.id === D.getClassModuleId(g.id)) : null;
            return (
              <button key={g.id} onClick={() => { setGid(g.id); setDay(''); }} style={{textAlign:'left', cursor:'pointer', font:'inherit', border:'2px solid ' + (on ? '#3F5BB8' : '#E3DCC9'), borderLeft:'7px solid ' + lvc, borderRadius:12, background: on ? '#EEF2FC' : '#fff', padding:'9px 11px', display:'flex', flexDirection:'column', gap:2, boxShadow: on ? '0 0 0 3px #C9D6F5' : 'none'}}>
                <span style={{fontWeight:800, fontSize:13.5}}>{g.name}</span>
                <span style={{fontSize:11.5, color:'#8a7f6a', fontWeight:700}}>{String(g.level).toUpperCase()}{g.schedule ? ' · ' + g.schedule : ''} · {n} alumnos</span>
                {cm && <span style={{fontSize:11, color:'#3F5BB8', fontWeight:800}}>▶ En clase: {cm.name}</span>}
              </button>); })}
        </div>
        {meta && (
          <div style={{marginTop:12, borderTop:'1px dashed #E3DCC9', paddingTop:12, display:'flex', flexDirection:'column', gap:8}}>
            <div style={{display:'flex', gap:6, flexWrap:'wrap', alignItems:'center'}}>
              <b style={{fontSize:13}}>¿Qué vas a subir?</b>
              {[['class', '📘 Plan de clase + práctica'], ['classOnly', '📘 Solo plan de clase'], ['practice', '📝 Solo práctica']].map(([k, l]) => { const on = what === k; return <button key={k} onClick={() => setWhat(k)} style={{...piBtn, background: on ? '#3F5BB8' : '#fff', color: on ? '#fff' : '#3F5BB8', borderColor: on ? '#3F5BB8' : '#9FB0DA'}}>{l}</button>; })}
            </div>
            {what === 'practice' ? (<>
              <div style={{display:'flex', gap:6, flexWrap:'wrap', alignItems:'center'}}>
                <b style={{fontSize:13}}>📅 La practican</b>
                <span style={{fontSize:12, fontWeight:800, color:'#8a7f6a'}}>desde</span><input type="date" value={pFrom} onChange={e => { setPFrom(e.target.value); if (!pTo || pTo < e.target.value) setPTo(e.target.value); }} style={piIn} />
                <span style={{fontSize:12, fontWeight:800, color:'#8a7f6a'}}>hasta</span><input type="date" value={pTo} min={pFrom || ''} onChange={e => setPTo(e.target.value)} style={piIn} />
                {(pFrom || pTo) && <button onClick={() => { setPFrom(''); setPTo(''); }} style={{...piBtn, padding:'4px 9px', fontSize:11.5}}>Borrar</button>}
              </div>
              <div style={{fontSize:11.5, color:'#8a7f6a', fontWeight:700}}>Solo práctica: no se crea plan de clase ni sesión. {pFrom ? 'Se usan estos días (ganan a lo que diga el documento).' : 'Si lo dejas vacío, leo los días del documento; si no los trae, te los pregunto.'}</div>
            </>) : (<>
            <div style={{display:'flex', gap:6, flexWrap:'wrap', alignItems:'center'}}>
              <b style={{fontSize:13}}>Día de la clase:</b>
              {meta.next.map((d0, i) => { const on = dayEff === d0; return <button key={d0} onClick={() => setDay(d0)} style={{...piBtn, background: on ? '#3F5BB8' : '#fff', color: on ? '#fff' : '#3F5BB8', borderColor: on ? '#3F5BB8' : '#9FB0DA'}}>{d0 === meta.today ? 'Hoy · ' : ''}{PI.fmtDay(d0)}</button>; })}
              <input type="date" value={dayEff} onChange={e => setDay(e.target.value)} style={piIn} title="Otro día" />
            </div>
            {dayEff && <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
              <span style={piChip('#EEF2FC', '#1F3A8A')}>🔢 Sesión {meta.sessionFor(dayEff)} de este grupo</span>
              {meta.start && <span style={piChip('#EEF2FC', '#1F3A8A')}>🕒 {meta.start} (horario del grupo)</span>}
              {meta.days.length > 0 && what === 'class' && <span style={piChip('#EEF2FC', '#1F3A8A')}>📱 Práctica hasta el día antes de la próxima clase</span>}
              {what === 'classOnly' && <span style={piChip('#F4F1E8', '#5f5540')}>Sin práctica para los alumnos</span>}
            </div>}
            <div style={{fontSize:11.5, color:'#8a7f6a', fontWeight:700}}>La sesión y las fechas las pone la plataforma con el seguimiento del grupo. Los días de la práctica los puedes cambiar después.</div>
            </>)}
          </div>)}
      </div>
      <div className="scard">
        <div className="sec-title" style={{marginBottom:10}}>2 · Documentos del teacher</div>
        <label onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }} style={{display:'flex', flexDirection:'column', alignItems:'center', gap:6, border:'2.5px dashed #C9B87A', background:'#FFFBF2', borderRadius:14, padding:'20px 14px', textAlign:'center', cursor:'pointer'}}>
          <span style={{fontSize:28}}>⬆</span>
          <b style={{fontSize:14}}>Arrastra aquí los PDF del plan de clase y de la práctica, o toca para elegirlos</b>
          <span style={{fontSize:12, color:'#8a7f6a', fontWeight:700}}>“Plan de clase · …” y “Práctica de la semana” (también acepta los .docx de antes). Tu texto se copia tal cual. Se leen aquí mismo: no se envían a ningún servicio.</span>
          <input type="file" multiple accept=".pdf,.docx,.txt" onChange={e => addFiles(e.target.files)} style={{display:'none'}} />
        </label>
        {files.length > 0 && <div style={{display:'flex', flexDirection:'column', gap:6, marginTop:10}}>{files.map(f => (
          <div key={f.name} style={{display:'flex', alignItems:'center', gap:9, ...piBox, padding:'8px 11px'}}><span style={piChip('#EEF2FC', '#3F5BB8')}>{/\.pdf$/i.test(f.name) ? 'PDF' : /\.docx$/i.test(f.name) ? 'DOCX' : 'TXT'}</span><span style={{flex:1, fontWeight:700, fontSize:12.5, wordBreak:'break-word'}}>{f.name}</span><button onClick={() => setFiles(fs => fs.filter(x => x !== f))} style={{...piBtn, padding:'3px 8px', color:'#C0392B', borderColor:'#F0C0BA'}}>✕</button></div>))}</div>}
        <button onClick={() => setShowPaste(v => !v)} style={{...piBtn, marginTop:10, borderStyle:'dashed'}}>{showPaste ? 'Ocultar' : '📋 O pegar el texto del plan'}</button>
        {showPaste && <textarea value={paste} onChange={e => setPaste(e.target.value)} rows={7} placeholder="Pega aquí el texto del outline y/o de la práctica…" style={{...piIn, width:'100%', marginTop:8, resize:'vertical'}} />}
        {err && <div style={{marginTop:10, background:'#FDECEA', border:'1px solid #F3B9B2', color:'#8E1B1B', borderRadius:10, padding:'8px 11px', fontSize:12.5, fontWeight:800}}>⚠ {err}</div>}
        <div style={{display:'flex', gap:8, marginTop:12, flexWrap:'wrap', alignItems:'center'}}>
          <button onClick={go} disabled={busy} style={{...piBtnB, opacity: busy ? .6 : 1}}>{busy ? 'Leyendo…' : 'Leer documentos →'}</button>
          <span style={{fontSize:11.5, color:'#8a7f6a', fontWeight:700}}>Se guarda como borrador: los alumnos no ven nada hasta que publiques.</span>
        </div>
      </div>
    </>
  );
}

/* ════════ Revisión ════════ */
function PiReview({ rec, setRec, tab, setTab, onBack, onExit, onClassMode }) {
  const PI = window.JUCUM_PLANIMPORT; const D = window.JUCUM_DATA;
  const [savedAt, setSavedAt] = React.useState(null);
  const [cloud, setCloud] = React.useState(null);
  const [showOrig, setShowOrig] = React.useState(false);
  const group = (D.GROUPS || []).find(g => g.id === rec.groupId);
  const mod = (D.MODULE_CATALOG[rec.draft.level] || []).find(m => m.id === (rec.draft.answers.module || rec.draft.moduleId));
  const left = PI.gapsLeft(rec); const eff = PI.effective(rec.draft, rec.gaps);
  /* Cada cambio se guarda al momento (equipo + nube). Editar algo ya publicado lo
   * deja “con cambios sin publicar” hasta que se vuelva a publicar. */
  const update = (fn, opts) => {
    const r = JSON.parse(JSON.stringify(rec)); fn(r);
    if (opts && opts.redistribute) PI.distribute(r.draft, r.gaps);
    if (r.status === 'published' && !(opts && opts.keepStatus)) r.status = 'changed';
    setRec(PI.save(r)); setSavedAt(new Date().toTimeString().slice(0, 5));
  };
  const publish = async () => {
    if (!window.confirm('¿Publicar el plan?\n\n• El plan de clase queda en el calendario (▶ Modo clase).\n• Cada día de práctica aparece en “Tu práctica de hoy” de los alumnos del grupo.')) return;
    try { const r = PI.publish(rec); setRec(r); setCloud('checking'); setSavedAt(new Date().toTimeString().slice(0, 5)); const st = await PI.verifyCloud(r); setCloud(st); }
    catch (e) { window.alert('No se pudo publicar: ' + (e && e.message ? e.message : e)); }
  };
  const faltan = n => n === 1 ? 'falta 1 dato' : 'faltan ' + n + ' datos';
  const missing = (rec.gaps || []).filter(g => g.sev === 'need' && (rec.draft.answers || {})[g.id] === undefined);
  const [flash, setFlash] = React.useState(false);
  const tryPublish = () => { if (left) { setTab('gaps'); setFlash(true); setTimeout(() => setFlash(false), 1600); return; } publish(); };
  const status = rec.status === 'published' ? ['✔ Publicado', '#E8F5E9', '#1B5E20'] : rec.status === 'changed' ? ['Publicado · con cambios sin publicar', '#FFF4E5', '#9C5D00'] : left ? ['Borrador · ' + faltan(left), '#FDECEA', '#8E1B1B'] : ['Borrador · listo para publicar', '#EEF2FC', '#1F3A8A'];
  const TABS = [['read', '1 · Lo que entendí'], ['gaps', '2 · Falta completar' + (left ? ' (' + left + ')' : ' ✓')], ['edit', '3 · Revisar y editar'], ['report', '4 · Seguimiento y reporte']];
  return (
    <>
      <div style={{background:'linear-gradient(135deg,#3F5BB8,#0D1B5A)', color:'#fff', borderRadius:16, padding:'16px 20px', marginBottom:14, display:'flex', gap:14, alignItems:'center', flexWrap:'wrap'}}>
        <div style={{flex:1, minWidth:220}}>
          <div style={{fontSize:11, fontWeight:800, letterSpacing:'0.07em', textTransform:'uppercase', opacity:.75}}>{rec.draft.kind === 'practice' ? '📝 Solo práctica' : rec.draft.kind === 'classOnly' ? '📘 Solo plan de clase' : '📄 Plan del teacher'}</div>
          <div style={{fontFamily:"'Fredoka',sans-serif", fontSize:21, fontWeight:600}}>{mod ? mod.name : rec.draft.moduleName} · {rec.draft.sessionLabel}</div>
          <div style={{fontSize:12.5, opacity:.9}}>{group ? group.name : '⚠ grupo inexistente'} · {rec.draft.kind === 'practice' ? '📅 ' + window.JUCUM_GUIDE.fmtRange(eff.pFrom, eff.pTo) + ' (' + eff.practiceDays.length + ' día' + (eff.practiceDays.length === 1 ? '' : 's') + ')' : (eff.date ? PI.fmtDay(eff.date) : 'sin fecha') + (eff.startTime ? ' · ' + eff.startTime : '') + ' · próxima clase ' + (eff.next ? PI.fmtDay(eff.next) : '—')}</div>
        </div>
        <div style={{display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end'}}>
          <span style={piChip(status[1], status[2])}>{status[0]}</span>
          <span style={{fontSize:11, opacity:.85, fontWeight:700}}>{savedAt ? '✓ Guardado ' + savedAt : 'Guardado'} · v{(rec.versions || []).length}{cloud === 'checking' ? ' · comprobando la nube…' : cloud === 'cloud' ? ' · ✓ en la nube' : cloud === 'local' ? ' · ⚠ solo en este equipo (se reintenta solo)' : ''}</span>
        </div>
      </div>
      <div style={{display:'flex', gap:8, flexWrap:'wrap', marginBottom:14, alignItems:'center'}}>
        <button onClick={onBack} style={piBtn}>← Planes subidos</button>
        {TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} style={{...piBtn, background: tab === k ? '#3F5BB8' : '#fff', color: tab === k ? '#fff' : '#3F5BB8', borderColor:'#9FB0DA'}}>{l}</button>)}
        <span style={{flex:1}}></span>
        <button onClick={() => setShowOrig(true)} style={piBtn}>📄 Ver original</button>
        {rec.published && onClassMode && <button onClick={() => { const p = window.JUCUM_TT.getClassPlans().find(x => x.id === rec.published.classPlanId); if (p) onClassMode(p); }} style={piBtnB}>▶ Modo clase</button>}
        <button onClick={tryPublish} title={left ? 'Antes de publicar: ' + missing.map(g => g.t).join(' · ') : ''} style={{...piBtnP, opacity: left ? .55 : 1}}>{rec.published ? 'Volver a publicar' : 'Publicar plan'}</button>
      </div>
      {left > 0 && (
        <div style={{display:'flex', gap:10, alignItems:'flex-start', flexWrap:'wrap', background:'#FDECEA', border:'1.5px solid ' + (flash ? '#C0392B' : '#F3B9B2'), boxShadow: flash ? '0 0 0 4px #F8D2CD' : 'none', borderRadius:12, padding:'10px 13px', marginBottom:14, transition:'box-shadow .3s'}}>
          <span style={{fontSize:18}}>⚠</span>
          <div style={{flex:1, minWidth:220}}>
            <div style={{fontWeight:800, fontSize:13.5, color:'#8E1B1B'}}>Para publicar, {faltan(left)}:</div>
            <ul style={{margin:'4px 0 0 18px', padding:0, fontSize:12.8, color:'#5D1A12', lineHeight:1.5}}>{missing.map(g => <li key={g.id}><b>{g.t}</b></li>)}</ul>
          </div>
          {tab !== 'gaps' && <button onClick={() => setTab('gaps')} style={{...piBtn, borderColor:'#E7A79E', color:'#8E1B1B'}}>Completarlo ahora →</button>}
        </div>
      )}
      {tab === 'read' && <PiRead rec={rec} mod={mod} eff={eff} />}
      {tab === 'gaps' && <PiGaps rec={rec} update={update} setTab={setTab} />}
      {tab === 'edit' && <PiEdit rec={rec} mod={mod} eff={eff} update={update} />}
      {tab === 'report' && <PiReport rec={rec} />}
      {showOrig && (
        <div onClick={() => setShowOrig(false)} style={{position:'fixed', inset:0, background:'rgba(0,0,0,.42)', zIndex:80, display:'flex', alignItems:'center', justifyContent:'center', padding:20}}>
          <div onClick={e => e.stopPropagation()} style={{background:'#fff', borderRadius:18, padding:'18px 22px', maxWidth:720, width:'100%', maxHeight:'82vh', overflow:'auto'}}>
            <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:18, marginBottom:8}}>📄 Texto original</div>
            {(rec.text || []).map(t => <div key={t.name} style={{marginBottom:14}}><div style={piLbl}>{t.name}</div><pre style={{whiteSpace:'pre-wrap', fontFamily:'inherit', fontSize:12.5, lineHeight:1.5, color:'#333', margin:'6px 0 0'}}>{t.text}</pre></div>)}
            <button onClick={() => setShowOrig(false)} style={{...piBtn, width:'100%'}}>Cerrar</button>
          </div>
        </div>
      )}
    </>
  );
}

function PiRead({ rec, mod, eff }) {
  const PI = window.JUCUM_PLANIMPORT; const d = rec.draft;
  const actName = id => { const a = mod && (mod.activities || []).find(x => x.id === id); return a ? a.name : id; };
  const last = PI.lastClass(rec.groupId, eff.date || PI.peruToday());
  return (
    <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(340px,1fr))', gap:14}}>
      <div className="scard">
        <div className="sec-title" style={{marginBottom:8}}>Documentos</div>
        {d.fidelity && <div style={{background: d.fidelity.kept === d.fidelity.total ? '#E8F5E9' : '#FDECEA', border:'1px solid ' + (d.fidelity.kept === d.fidelity.total ? '#A5D6A7' : '#F3B9B2'), color: d.fidelity.kept === d.fidelity.total ? '#1B5E20' : '#8E1B1B', borderRadius:10, padding:'8px 11px', fontSize:12.5, fontWeight:800, marginBottom:8}}>{d.fidelity.kept === d.fidelity.total ? '✓' : '⚠'} Texto idéntico al documento · {d.fidelity.kept} de {d.fidelity.total} palabras</div>}
        {(d.mode === 'jucum' ? ['outline', 'practice'] : ['outline', 'practice', 'tracker']).map(k => <div key={k} style={{display:'flex', gap:8, alignItems:'center', fontSize:13, padding:'3px 0'}}>{rec.found[k] ? <span style={piChip('#E8F5E9', '#2E7D32')}>✓ leído</span> : <span style={piChip('#ECEFF1', '#607D8B')}>no subido</span>}<b>{(d.mode === 'jucum' ? { outline:'Plan de clase', practice:'Práctica de la semana' } : { outline:'Outline de la clase', practice:'Práctica fuera de clase', tracker:'Tracker del grupo' })[k]}</b></div>)}
        {(rec.unknown || []).length > 0 && <div style={{fontSize:12, color:'#9C5D00', fontWeight:700, marginTop:6}}>No reconocí: {rec.unknown.join(', ')}</div>}
        {d.ctx.length > 0 && <><div style={{...piLbl, margin:'12px 0 4px'}}>{d.mode === 'jucum' ? 'Del documento (solo lo ve el teacher)' : 'Contexto del tracker (solo lo ve el teacher)'}</div>{d.ctx.map((c, i) => <div key={i} style={{fontSize:12.5, padding:'3px 0', borderBottom:'1px solid #F2ECDD'}}><b style={{color:'#8a7f6a'}}>{c[0]}:</b> {c[1]}</div>)}</>}
      </div>
      {window.FollowUpPanel && <div style={{gridColumn:'1 / -1'}}><FollowUpPanel plan={window.fuLastPlan(rec.groupId, eff.date || PI.peruToday())} where="plan" /></div>}
      <div className="scard">
        <div className="sec-title" style={{marginBottom:8}}>Agenda → bloques de la clase</div>
        {d.blocks.length === 0 && <div style={{fontSize:12.5, color:'#999', fontWeight:700}}>Sin agenda (no se subió el outline).</div>}
        {d.blocks.map(b => (
          <div key={b.id} style={{borderTop:'1px dashed #E3DCC9', padding:'8px 0'}}>
            {d.mode !== 'jucum' && <div style={{fontSize:12, color:'#777', fontStyle:'italic'}}>“{b.en.slice(0, 200)}”</div>}
            <div style={{fontWeight:800, fontSize:13, marginTop:3}}>{b.emoji} {b.mins} min · {b.title}</div>
            {d.mode === 'jucum' && (b.steps || []).map((x, k) => <div key={k} style={{fontSize:12.5, color:'#444', paddingLeft:10}}>• {x}</div>)}
            {(b.mats || []).length > 0 && <div style={{display:'flex', gap:5, flexWrap:'wrap', marginTop:4}}>{b.mats.map((m, i) => <span key={i} style={piChip('#EEF2FC', '#3F5BB8')}>{actName(m.activityId)}{m.quizKey ? ' · ' + m.quizKey : ''}</span>)}</div>}
          </div>))}
      </div>
      <div className="scard">
        <div className="sec-title" style={{marginBottom:8}}>Práctica → “{d.mode === 'jucum' ? (d.setTitle || 'Práctica de la semana') : 'Tu práctica de hoy'}”</div>
        {d.mode === 'jucum' && window.JUCUM_GUIDE && <button onClick={() => window.JUCUM_GUIDE.openOverlay(window.JUCUM_PLANIMPORT.guideJ(d, mod || { name: d.moduleName }), {})} style={{...piBtnB, marginBottom:8}}>👁 Ver como lo verá el alumno</button>}
        {d.practice.map(p => (
          <div key={p.id} style={{borderTop:'1px dashed #E3DCC9', padding:'8px 0'}}>
            {d.mode !== 'jucum' && <div style={{fontSize:12, color:'#777', fontStyle:'italic'}}>“{p.en.slice(0, 200)}”</div>}
            <div style={{fontWeight:800, fontSize:13, marginTop:3}}>{p.emoji || piIcon(p.type)} {p.label}</div>
            {d.mode === 'jucum' && <>{(p.sub || []).map((x, k) => <div key={'s' + k} style={{fontSize:12.5, color:'#1F3A8A', fontWeight:800}}>{x}</div>)}{(p.steps || []).map((x, k) => <div key={k} style={{fontSize:12.5, color:'#444', paddingLeft:10}}>{k + 1}. {x}</div>)}{(p.tips || []).map((x, k) => <div key={'t' + k} style={{fontSize:12, color:'#9c6a00', paddingLeft:10}}>📌 {x}</div>)}{!p.activityId && <span style={piChip('#FFF4E5', '#9C5D00')}>sin material enlazado</span>}</>}
            {p.note && <div style={{fontSize:12.5, color:'#444', marginTop:2}}>{p.note}</div>}
            <div style={{display:'flex', gap:5, flexWrap:'wrap', marginTop:4}}>
              {p.onlyPending && <span style={piChip('#FCE4EC', '#AD1457')}>solo quienes no lo terminaron</span>}
              {p.prio ? <span style={piChip('#FFF4E5', '#9C5D00')}>prioridad</span> : null}
              {p.daily ? <span style={piChip('#ECEFF1', '#455A64')}>todos los días</span> : null}
              {!p.noteEs && <span style={piChip('#FFF4E5', '#9C5D00')}>instrucción por escribir</span>}
            </div>
          </div>))}
        {(d.notesPractice || []).length > 0 && <div style={{fontSize:11.5, color:'#8a7f6a', fontWeight:700, marginTop:8}}>Notas del documento guardadas: {d.notesPractice.length}</div>}
      </div>
    </div>
  );
}

function PiGaps({ rec, update, setTab }) {
  const d = rec.draft; const a = d.answers || {};
  const [vals, setVals] = React.useState({});
  const val = g => vals[g.id] !== undefined ? vals[g.id] : (a[g.id] !== undefined ? a[g.id] : g.sug);
  const set = (id, v) => setVals(s => ({ ...s, [id]: v }));
  const confirm = g => { const v = val(g); if (g.type === 'days' && (!Array.isArray(v) || !v.length)) { window.alert('Elige al menos un día.'); return; } update(r => { r.draft.answers[g.id] = v; if (g.id === 'days' || g.id === 'date' || g.id === 'past' || g.id === 'prange') r.draft.practice.forEach(p => { p.manual = false; }); }, { redistribute: ['days', 'date', 'past', 'prange'].includes(g.id) }); };
  const undo = g => update(r => { delete r.draft.answers[g.id]; }, { redistribute: ['days', 'date', 'past', 'prange'].includes(g.id) });
  const shown = (g, v) => g.type === 'range' && Array.isArray(v) ? window.JUCUM_GUIDE.fmtRange(v[0], v[1]) : Array.isArray(v) ? v.map(x => PI_DN[x]).join(' y ') : (g.optLabels && g.opts ? g.optLabels[g.opts.indexOf(v)] || v : (v === '' ? '(lo dejo para después)' : v));
  return (
    <div className="scard">
      <div style={{background:'#FFF8E1', border:'1px solid #FFE082', borderRadius:12, padding:'10px 13px', fontSize:13, color:'#5D4200', lineHeight:1.5, marginBottom:12}}>Cada dato viene con una <b>sugerencia</b> sacada del documento, del tracker o de la plataforma; solo confirma o corrige. Los marcados “Falta” no dejan publicar.</div>
      {(rec.gaps || []).length === 0 && <div className="empty-state" style={{padding:'18px 0'}}><div className="icon">✅</div>No falta nada.</div>}
      <div style={{display:'flex', flexDirection:'column', gap:10}}>
        {(rec.gaps || []).map(g => { const sv = PI_SEV[g.type === 'info' ? 'info' : g.sev] || PI_SEV.check; const done = a[g.id] !== undefined; const v = val(g);
          return (
            <div key={g.id} style={{...piBox, borderLeft:'6px solid ' + (done ? '#43A047' : sv[1]), opacity: done ? .85 : 1}}>
              <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}><span style={piChip(done ? '#E8F5E9' : sv[2], done ? '#2E7D32' : sv[1])}>{done ? '✓ listo' : sv[0]}</span><b style={{fontSize:14}}>{g.t}</b></div>
              {done ? (
                <div style={{display:'flex', gap:8, alignItems:'center', marginTop:6, flexWrap:'wrap'}}><span style={{fontWeight:800, fontSize:13, color:'#1F3A8A'}}>{shown(g, a[g.id])}</span><button onClick={() => undo(g)} style={{...piBtn, padding:'4px 9px'}}>Cambiar</button></div>
              ) : (<>
                <div style={{fontSize:12.5, color:'#555', lineHeight:1.5, margin:'5px 0 8px'}}>{g.why}</div>
                {g.type !== 'info' && (
                  <div style={{display:'flex', gap:8, flexWrap:'wrap', alignItems:'center'}}>
                    {g.type === 'select' && <select value={v} onChange={e => set(g.id, e.target.value)} style={piIn}>{g.opts.map((o, i) => <option key={o} value={o}>{(g.optLabels || g.opts)[i]}</option>)}</select>}
                    {g.type === 'days' && <span style={{display:'flex', gap:4, flexWrap:'wrap'}}>{[1, 2, 3, 4, 5, 6, 0].map(dd => { const on = Array.isArray(v) && v.includes(dd); return <button key={dd} onClick={() => set(g.id, on ? v.filter(x => x !== dd) : [...(Array.isArray(v) ? v : []), dd].sort())} style={{...piBtn, padding:'5px 9px', background: on ? '#3F5BB8' : '#fff', color: on ? '#fff' : '#6b5a1f', borderColor: on ? '#3F5BB8' : '#cdb86a'}}>{PI_DN[dd]}</button>; })}</span>}
                    {g.type === 'range' && <span style={{display:'flex', gap:6, alignItems:'center', flexWrap:'wrap'}}><span style={{fontSize:12, fontWeight:800, color:'#8a7f6a'}}>Desde</span><input type="date" value={(v || [])[0] || ''} onChange={e => set(g.id, [e.target.value, (v || [])[1] || e.target.value])} style={piIn} /><span style={{fontSize:12, fontWeight:800, color:'#8a7f6a'}}>hasta</span><input type="date" value={(v || [])[1] || ''} min={(v || [])[0] || ''} onChange={e => set(g.id, [(v || [])[0] || e.target.value, e.target.value])} style={piIn} /></span>}
                    {(g.type === 'time' || g.type === 'date') && <input type={g.type} value={v || ''} onChange={e => set(g.id, e.target.value)} style={piIn} />}
                    {g.type === 'url' && <input type="url" value={v || ''} onChange={e => set(g.id, e.target.value)} placeholder="https://…" style={{...piIn, flex:1, minWidth:220}} />}
                    {g.type === 'text' && <textarea value={v || ''} onChange={e => set(g.id, e.target.value)} rows={2} style={{...piIn, width:'100%', resize:'vertical'}} />}
                    <button onClick={() => confirm(g)} style={{...piBtnP, padding:'7px 13px', fontSize:13}}>Confirmar</button>
                    {g.type === 'url' && <button onClick={() => update(r => { r.draft.answers[g.id] = ''; })} style={piBtn}>Dejarlo para después</button>}
                  </div>)}
                {g.type === 'info' && (g.id === 'es' ? <button onClick={() => setTab('edit')} style={piBtn}>Ir a Revisar y editar →</button> : <button onClick={() => update(r => { r.draft.answers[g.id] = 'visto'; })} style={piBtn}>Entendido</button>)}
              </>)}
            </div>); })}
      </div>
    </div>
  );
}

function PiEdit({ rec, mod, eff, update }) {
  const d = rec.draft; const acts = (mod && mod.activities) || [];
  const total = d.blocks.reduce((s, b) => s + (Number(b.mins) || 0), 0);
  const actName = id => { const a = acts.find(x => x.id === id); return a ? a.name : id; };
  const [addAct, setAddAct] = React.useState('');
  const [dayOpen, setDayOpen] = React.useState(null);
  const mv = (i, dir) => update(r => { const b = r.draft.blocks; const k = i + dir; if (k < 0 || k >= b.length) return; [b[i], b[k]] = [b[k], b[i]]; });
  const restore = (i) => { const v = rec.versions[i]; if (!window.confirm('¿Volver a la versión ' + v.n + ' (' + v.label + ')? Antes guardo una copia de cómo está ahora.')) return; update(r => { const PI = window.JUCUM_PLANIMPORT; const keepAns = r.draft.answers; const r2 = PI.addVersion(r, 'Copia antes de volver a v' + v.n); r.versions = r2.versions; r.draft = JSON.parse(JSON.stringify(v.draft)); r.draft.answers = keepAns; }, { redistribute: true }); };
  const saveVer = () => update(r => { const r2 = window.JUCUM_PLANIMPORT.addVersion(r, 'Guardada por el teacher'); r.versions = r2.versions; }, { keepStatus: true });
  return (
    <>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(420px,100%),1fr))', gap:14, alignItems:'start'}}>
        {d.kind !== 'practice' && <div className="scard">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}><div className="sec-title">🕒 Bloques de la clase</div><span style={piChip(total === d.lengthMin ? '#E8F5E9' : '#FDECEA', total === d.lengthMin ? '#2E7D32' : '#C0392B')}>{total} / {d.lengthMin} min</span></div>
          {d.blocks.map((b, i) => (
            <div key={b.id} style={{border:'1px solid #E3DCC9', borderRadius:11, padding:'9px 10px', background:'#FCFAF4', marginBottom:8, display:'flex', flexDirection:'column', gap:6}}>
              <div style={{display:'flex', gap:6, alignItems:'center', flexWrap:'wrap'}}>
                <input value={b.emoji} onChange={e => update(r => { r.draft.blocks[i].emoji = e.target.value; })} style={{...piIn, width:38, textAlign:'center'}} />
                <input value={b.title} onChange={e => update(r => { r.draft.blocks[i].title = e.target.value; })} style={{...piIn, flex:1, minWidth:140, fontWeight:800}} />
              </div>
              <div style={{display:'flex', gap:6, alignItems:'center', flexWrap:'wrap'}}>
                <input type="number" min="0" step="5" value={b.mins} onChange={e => update(r => { r.draft.blocks[i].mins = Number(e.target.value); })} style={{...piIn, width:62}} /><span style={{fontSize:11, color:'#999', fontWeight:700}}>min</span>
                <button onClick={() => mv(i, -1)} style={{...piBtn, padding:'3px 7px'}}>▲</button><button onClick={() => mv(i, 1)} style={{...piBtn, padding:'3px 7px'}}>▼</button>
                <button onClick={() => { if (window.confirm('¿Quitar este bloque? Puedes recuperarlo desde Versiones.')) update(r => { r.draft.blocks.splice(i, 1); }); }} style={{...piBtn, padding:'3px 8px', color:'#C0392B', borderColor:'#F0C0BA'}}>✕</button>
              </div>
              <textarea value={(b.steps || []).join('\n')} onChange={e => update(r => { r.draft.blocks[i].steps = e.target.value.split('\n'); })} rows={Math.min(5, Math.max(2, (b.steps || []).length))} placeholder="Pasos (uno por línea)" style={{...piIn, width:'100%', resize:'vertical', fontSize:12.5}} />
              <div style={{display:'flex', gap:5, flexWrap:'wrap', alignItems:'center'}}>
                {(b.mats || []).map((m, j) => <span key={j} style={piChip('#EEF2FC', '#3F5BB8')}>{actName(m.activityId)}{m.quizKey ? ' · ' + m.quizKey : ''} <span onClick={() => update(r => { r.draft.blocks[i].mats.splice(j, 1); })} style={{cursor:'pointer', color:'#C0392B'}}>✕</span></span>)}
                <select value="" onChange={e => { const v = e.target.value; if (v) update(r => { (r.draft.blocks[i].mats = r.draft.blocks[i].mats || []).push({ activityId: v, quizKey: null }); }); }} style={{...piIn, fontSize:12, padding:'3px 6px'}}><option value="">＋ material…</option>{acts.map(a => <option key={a.id} value={a.id}>{a.name}{a.group ? ' · ' + a.group : ''}</option>)}</select>
              </div>
            </div>))}
          <button onClick={() => update(r => { r.draft.blocks.push({ id: 'b_' + Math.random().toString(36).slice(2, 7), emoji: '•', title: 'Nuevo bloque', mins: 10, steps: [], mats: [], en: '(agregado por el teacher)' }); })} style={piBtn}>＋ Agregar bloque</button>
        </div>}
        {d.kind === 'classOnly' && !d.practice.length ? <div className="scard" style={{fontSize:13, fontWeight:700, color:'#5f5540'}}>📘 Solo plan de clase: sin práctica para los alumnos. Si después quieres darles práctica, súbela aparte con “📝 Solo práctica”.</div> : <div className="scard">
          <div className="sec-title" style={{marginBottom:4}}>📝 {d.mode === 'jucum' ? (d.setTitle || 'Práctica de la semana') : 'Práctica diaria de los alumnos'}</div>
          <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', background:'#EEF2FC', border:'1px solid #C9D4F0', borderRadius:10, padding:'8px 11px', marginBottom:10}}>
            <b style={{fontSize:12.5, color:'#1F3A8A'}}>📅 Práctica en casa:</b>
            <span style={{fontSize:12, fontWeight:800, color:'#8a7f6a'}}>desde</span><input type="date" value={eff.pFrom || ''} onChange={e => { const f = e.target.value; if (!f) return; update(r => { r.draft.answers.prange = [f, (eff.pTo && eff.pTo >= f) ? eff.pTo : f]; }, { redistribute: true }); }} style={{...piIn, padding:'4px 7px'}} />
            <span style={{fontSize:12, fontWeight:800, color:'#8a7f6a'}}>hasta</span><input type="date" value={eff.pTo || ''} min={eff.pFrom || ''} onChange={e => { const t = e.target.value; if (!t) return; update(r => { r.draft.answers.prange = [eff.pFrom && eff.pFrom <= t ? eff.pFrom : t, t]; }, { redistribute: true }); }} style={{...piIn, padding:'4px 7px'}} />
            <span style={{fontSize:11.5, fontWeight:700, color:'#5f6b85'}}>{eff.pHow === 'doc' ? '· leído del documento' : eff.pHow === 'teacher' ? '· elegido por ti' : rec.draft.kind === 'practice' ? '· sugerido' : '· de la clase hasta el día antes de la próxima'} · {eff.practiceDays.length} día(s)</span>
            {eff.pHow === 'teacher' && <button onClick={() => update(r => { delete r.draft.answers.prange; }, { redistribute: true })} style={{...piBtn, padding:'3px 9px', fontSize:11.5}}>↺ Volver a lo automático</button>}
          </div>
          <div style={{fontSize:12, color:'#8a7f6a', fontWeight:700, marginBottom:10}}>Cada actividad sale <b>todos los días del rango</b>. Si quieres que una sea solo ciertos días, toca “Cambiar días”.</div>
          {!d.practice.length && <div style={{display:'flex', gap:9, background:'#FFF4E5', border:'1px solid #FFCC80', borderRadius:10, padding:'10px 12px', fontSize:12.5, fontWeight:700, color:'#7A4A00', lineHeight:1.45, marginBottom:6}}>⚠<span>{rec.found && rec.found.practice ? 'No encontré actividades en el PDF de la práctica. Agrégalas abajo desde el catálogo.' : 'Este plan no tiene práctica para los alumnos. Si quieres darles una, agrégala abajo o súbela aparte con “📝 Solo práctica”.'}</span></div>}
          <div style={{display:'flex', flexDirection:'column', gap:10}}>
            {d.practice.map((p, i) => { const all = eff.practiceDays.every(x => (p.days || []).includes(x)); const open = dayOpen === p.id; return (
              <div key={p.id} style={{border:'1px solid #E3DCC9', borderRadius:12, padding:'10px 12px', display:'flex', flexDirection:'column', gap:2}}>
                <div style={{display:'flex', gap:8, alignItems:'flex-start'}}>
                  <div style={{flex:1, minWidth:0}}>
                    <input value={p.label} onChange={e => update(r => { r.draft.practice[i].label = e.target.value; })} style={{...piIn, width:'100%', fontWeight:800, fontSize:12.5}} />
                    {d.mode === 'jucum' ? <>
                      <textarea value={(p.steps || []).join('\n')} onChange={e => update(r => { r.draft.practice[i].steps = e.target.value.split('\n'); })} rows={Math.min(6, Math.max(2, (p.steps || []).length))} placeholder="Pasos para el alumno (uno por línea)" style={{...piIn, width:'100%', fontSize:12, marginTop:4, resize:'vertical'}} />
                      <input value={(p.tips || []).join(' ')} onChange={e => update(r => { r.draft.practice[i].tips = e.target.value ? [e.target.value] : []; })} placeholder="📌 Consejo (opcional)" style={{...piIn, width:'100%', fontSize:12, marginTop:4}} />
                      <select value={p.activityId || ''} onChange={e => { const a = acts.find(x => x.id === e.target.value); update(r => { const q = r.draft.practice[i]; q.activityId = a ? a.id : null; q.type = a ? a.type : 'custom'; q.quizKey = a && a.type === 'quizlet' ? (q.quizKey || 'vocabulario') : null; }); }} style={{...piIn, fontSize:11.5, padding:'2px 5px', marginTop:4, borderColor: p.activityId ? '#E3DCC9' : '#F0C28A'}}><option value="">⚠ sin material (sin botón ▶)</option>{acts.map(a => <option key={a.id} value={a.id}>{a.name}{a.group ? ' · ' + a.group : ''}</option>)}</select>
                    </> : <textarea value={p.note} onChange={e => update(r => { r.draft.practice[i].note = e.target.value; r.draft.practice[i].noteEs = true; })} rows={2} placeholder="Instrucción para el alumno (español)" style={{...piIn, width:'100%', fontSize:12, marginTop:4, resize:'vertical', borderColor: p.noteEs ? '#E3DCC9' : '#F0C28A', background: p.noteEs ? '#fff' : '#FFF8EC'}} />}
                    <div style={{display:'flex', gap:6, flexWrap:'wrap', alignItems:'center', marginTop:4}}>
                      <span style={{fontSize:11, color:'#8a7f6a', fontWeight:700}}>{piIcon(p.type)} {actName(p.activityId)}{p.quizKey ? ' · ' + p.quizKey : ''}</span>
                      <select value={p.onlyPending ? 'pend' : 'all'} onChange={e => update(r => { r.draft.practice[i].onlyPending = e.target.value === 'pend'; })} style={{...piIn, fontSize:11.5, padding:'2px 5px'}}><option value="all">Para todos</option><option value="pend">Solo quienes no lo terminaron</option></select>
                      <label style={{fontSize:11.5, fontWeight:800, color:'#9C5D00', display:'flex', gap:4, alignItems:'center'}}><input type="checkbox" checked={!!p.prio} onChange={e => update(r => { r.draft.practice[i].prio = e.target.checked ? 1 : 0; })} /> prioridad</label>
                    </div>
                  </div>
                  <button onClick={() => { if (window.confirm('¿Quitar esta actividad? Si algún alumno ya la hizo, su nota y su XP se quedan.')) update(r => { r.draft.practice.splice(i, 1); }); }} title="Quitar" style={{...piBtn, padding:'3px 8px', color:'#C0392B', borderColor:'#F0C0BA'}}>✕</button>
                </div>
                <div style={{display:'flex', gap:6, flexWrap:'wrap', alignItems:'center', marginTop:6}}>
                  <span style={piChip(all ? '#E8F5E9' : '#FFF4E5', all ? '#1B5E20' : '#7A4A00')}>📅 {all ? 'Todos los días (' + eff.practiceDays.length + ')' : (p.days || []).length ? (p.days || []).slice().sort().map(x => window.JUCUM_PLANIMPORT.fmtDay(x)).join(' · ') : 'ningún día (no la verán)'}</span>
                  <button onClick={() => setDayOpen(open ? null : p.id)} style={{...piBtn, padding:'3px 9px', fontSize:11.5}}>{open ? 'Listo' : 'Cambiar días'}</button>
                  {!all && <button onClick={() => update(r => { const q = r.draft.practice[i]; q.manual = true; q.days = eff.practiceDays.slice(); })} style={{...piBtn, padding:'3px 9px', fontSize:11.5}}>Todos los días</button>}
                </div>
                {open && <div style={{display:'flex', gap:6, flexWrap:'wrap', marginTop:6}}>
                  {eff.practiceDays.map(day => { const on = (p.days || []).includes(day); return <button key={day} onClick={() => update(r => { const q = r.draft.practice[i]; q.manual = true; q.days = q.days || []; const k = q.days.indexOf(day); if (k < 0) q.days.push(day); else q.days.splice(k, 1); })} style={{...piBtn, padding:'4px 10px', fontSize:12, background: on ? '#3F5BB8' : '#fff', color: on ? '#fff' : '#3F5BB8', borderColor: on ? '#3F5BB8' : '#9FB0DA'}}>{on ? '✓ ' : ''}{window.JUCUM_PLANIMPORT.fmtDay(day)}</button>; })}
                </div>}
              </div>); })}
          </div>
          <div style={{display:'flex', gap:6, marginTop:10, flexWrap:'wrap'}}>
            <select value={addAct} onChange={e => setAddAct(e.target.value)} style={{...piIn, flex:1, minWidth:200}}><option value="">＋ Agregar otra actividad del módulo…</option>{acts.map(a => <option key={a.id} value={a.id}>{a.name}{a.group ? ' · ' + a.group : ''}</option>)}</select>
            <button onClick={() => { const a = acts.find(x => x.id === addAct); if (!a) return; update(r => { r.draft.practice.push({ id: 'p_' + Math.random().toString(36).slice(2, 7), moduleId: mod.id, activityId: a.id, type: a.type, quizKey: a.type === 'quizlet' ? 'vocabulario' : null, label: a.name, note: '', noteEs: true, en: '(agregado por el teacher)', onlyPending: false, prio: 0, daily: 1, ai: 0, days: eff.practiceDays.slice(), manual: true }); }); setAddAct(''); }} style={piBtn}>Agregar</button>
          </div>
        </div>}
      </div>
    </>
  );
}

function PiReport({ rec }) {
  const TT = window.JUCUM_TT;
  const cp = rec.published && rec.published.classPlanId ? TT.getClassPlans().find(p => p.id === rec.published.classPlanId) : null;
  if (!cp) return <div className="scard" style={{fontSize:13, color:'#8a7f6a', fontWeight:700}}>Publica el plan para ver su seguimiento. Al terminar la clase usa 🏁 Terminar clase en el Modo clase; después, aquí verás cómo les fue en clase y en casa, y el reporte para tu Claude.</div>;
  return window.FollowUpPanel ? <FollowUpPanel plan={cp} where="cal" startOpen /> : null;
}

/* UPLOADS-BAR (09-oct): los planes subidos ya no se listan completos — un selector arriba + Abrir + 🗑.
 * Borrar un borrador lo quita y listo; uno publicado también quita su plan de clase y su set de práctica. */
function PiUploadsBar({ drafts, gName, onOpen, onChanged }) {
  const PI = window.JUCUM_PLANIMPORT; const TT = window.JUCUM_TT;
  const [sel, setSel] = React.useState('');
  const r = drafts.find(x => x.id === sel) || null;
  const lab = x => { const e = PI.effective(x.draft, x.gaps); const left = PI.gapsLeft(x); return (x.status === 'published' ? '✅ ' : '📝 ') + (x.draft.kind === 'practice' ? '📝 ' + x.draft.sessionLabel + ' · ' + x.draft.moduleName : x.draft.moduleName + ' · ' + x.draft.sessionLabel) + ' — ' + gName(x.groupId) + ' · ' + (x.draft.kind === 'practice' ? window.JUCUM_GUIDE.fmtRange(e.pFrom, e.pTo) : (e.date ? PI.fmtDay(e.date) : 'sin fecha')) + ' · ' + (x.status === 'published' ? 'publicado' : (left ? 'borrador (faltan ' + left + ')' : 'borrador listo')); };
  const del = () => {
    if (!r) return; const pub = r.published && (r.published.classPlanId || Object.keys(r.published.practicePlanIds || {}).length);
    if (!window.confirm(pub ? '¿Eliminar “' + r.draft.moduleName + ' · ' + r.draft.sessionLabel + '”?\n\nEstá PUBLICADO: también se quitan del calendario su plan de clase y su set de práctica (los alumnos dejan de verlo).' : '¿Eliminar el borrador “' + r.draft.moduleName + ' · ' + r.draft.sessionLabel + '”?')) return;
    if (pub) { if (r.published.classPlanId) TT.deleteClassPlan(r.published.classPlanId); Object.values(r.published.practicePlanIds || {}).forEach(id => { try { TT.deletePracticePlan(id); } catch (e) {} }); }
    PI.remove(r.id); setSel(''); onChanged && onChanged();
  };
  const nDraft = drafts.filter(x => x.status !== 'published').length;
  return (
    <div className="scard" style={{marginBottom:16, display:'flex', gap:10, alignItems:'center', flexWrap:'wrap'}}>
      <b style={{fontSize:13.5, color:'#0D1B5A', whiteSpace:'nowrap'}}>🗂️ Planes subidos <span style={{fontSize:11.5, color:'#8a7f6a'}}>({drafts.length}{nDraft ? ' · ' + nDraft + ' sin publicar' : ''})</span></b>
      <select value={sel} onChange={e => setSel(e.target.value)} style={{...piIn, flex:1, minWidth:240, fontWeight:700}}>
        <option value="">Elige un plan para abrirlo o eliminarlo…</option>
        {drafts.map(x => <option key={x.id} value={x.id}>{lab(x)}</option>)}
      </select>
      <button disabled={!r} onClick={() => r && onOpen(r)} style={{...piBtn, opacity: r ? 1 : .5}}>{r && r.status !== 'published' ? 'Seguir editando' : 'Abrir'}</button>
      <button disabled={!r} onClick={del} title="Eliminar este plan subido" style={{...piBtn, opacity: r ? 1 : .5, color:'#C0392B', borderColor:'#F0C0BA'}}>🗑 Eliminar</button>
    </div>
  );
}
Object.assign(window, { PlanImport });
