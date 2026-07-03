/* 📚 Materiales · Revisión (vista profesor)
 * Tablero de QA por NIVEL (Pre-A1 / A1 / A2). Recorre todo el catálogo
 * (módulo → tema → actividad), abre cada material en un visor para revisarlo,
 * y por cada uno permite: marcar estado (Sin revisar / OK / Por corregir),
 * seguir un checklist de calidad por tipo, y dejar observaciones editables.
 * Cualquier observación se puede ENVIAR A SOPORTE (bandeja 🐞 del panel dev).
 * Estado y notas se guardan en la nube (app_settings 'material_reviews'),
 * así se ven desde cualquier dispositivo. No afecta el progreso de alumnos.
 */

const { useState: mrState, useEffect: mrEffect, useMemo: mrMemo, useRef: mrRef } = React;

const MR_TYPE = {
  story:     { ico:'📗', label:'Story / Diálogo' },
  reading:   { ico:'📖', label:'Comprensión lectora' },
  listening: { ico:'🎧', label:'Comprensión auditiva' },
  summary:   { ico:'📚', label:'Resumen de gramática' },
  grammar:   { ico:'📝', label:'Práctica de gramática' },
  quizlet:   { ico:'🃏', label:'Quizlet' },
  exam:      { ico:'📑', label:'Examen' },
};
const mrIco = (t) => (MR_TYPE[t] || {}).ico || '📄';

const MR_STATUS = {
  pendiente: { chip:'Sin revisar',  ico:'⬜', bg:'#F1EEE8', fg:'#8A7F6A', bd:'#E3DDD0' },
  ok:        { chip:'Revisado · OK', ico:'✅', bg:'#E8F5E9', fg:'#2E7D32', bd:'#A5D6A7' },
  fix:       { chip:'Por corregir',  ico:'⚠️', bg:'#FFF1E6', fg:'#C2410C', bd:'#F4C7A1' },
};

/* Checklist de calidad por tipo — basado en la metodología JUCUM. */
const MR_CHECKLIST = {
  story: [
    'Cuenta TIEMPO de lectura (no pide nota) y da XP progresivo',
    'Traducción español ↔ inglés disponible',
    'Audio sincronizado con el texto (si aplica)',
    'Botón 🐞 de reporte visible',
    'Conector jucum-connect al final',
  ],
  reading: [
    'Quiz CON nota — dispara jucum:done con score real 0–100',
    'Preguntas de comprensión + al menos una inferencial',
    'Indica Historia #1–4 si tiene varias lecturas',
    'Botón 🐞 de reporte visible',
    'Conector jucum-connect al final',
  ],
  listening: [
    'Audio reproducible + control de velocidad',
    'Quiz CON nota — dispara jucum:done con score real',
    'Indica Audio #1–4 si tiene varios',
    'Botón 🐞 de reporte visible',
    'Conector jucum-connect al final',
  ],
  summary: [
    'MCQ de auto-chequeo (no exige umbral, no alimenta el dominio)',
    'Explica la estructura con ejemplos y traducción',
    'Coherente con las prácticas P1/P2/P3 del tema',
    'Botón 🐞 de reporte visible',
  ],
  grammar: [
    'Quiz CON nota real (pct = score / total × 100)',
    'Instrucciones claras del tipo (Fill in / Identification / Transform)',
    'Transform de tema trigger marcado latente 🌱 (solo A1 / A2)',
    'Botón 🐞 de reporte visible',
    'Conector jucum-connect al final',
  ],
  quizlet: [
    'Set de Quizlet embebido y correcto',
    'Participación de baja exigencia (no alimenta el dominio)',
    'Botón 🐞 de reporte visible',
  ],
  exam: [
    'Cobertura del módulo correcta',
    'Dispara nota real al terminar',
    'Botón 🐞 de reporte visible',
  ],
};
const mrChecklist = (t) => MR_CHECKLIST[t] || ['Contenido correcto y sin errores', 'Botón 🐞 de reporte visible'];

/* Enlace del material en modo profesor (libre, sin registrar progreso). */
function mrLink(a, mod) {
  if (!a || !a.url) return null;
  const sep = a.url.includes('?') ? '&' : '?';
  return `${a.url}${sep}jucum_teacher=1&jucum_mod=${encodeURIComponent(mod.id)}&jucum_act=${encodeURIComponent(a.id)}`;
}

/* Aplana el nivel a una lista ordenada de materiales para navegar 1×1. */
function mrFlatten(levelKey, MODULE_CATALOG) {
  const out = [];
  (MODULE_CATALOG[levelKey] || []).forEach(mod => {
    (mod.activities || []).forEach(a => {
      out.push({ mod, a, key: `${levelKey}:${mod.id}:${a.id}`, tema: a.group || null });
    });
  });
  return out;
}

/* ── Chip de estado ─────────────────────────────────────────────── */
function MrChip({ status, small }) {
  const s = MR_STATUS[status] || MR_STATUS.pendiente;
  return (
    <span style={{display:'inline-flex', alignItems:'center', gap:4, fontSize: small?10.5:11.5, fontWeight:800,
      background:s.bg, color:s.fg, border:`1px solid ${s.bd}`, borderRadius:20, padding: small?'2px 8px':'3px 10px', whiteSpace:'nowrap'}}>
      <span>{s.ico}</span>{s.chip}
    </span>
  );
}

/* ── Fila de actividad ──────────────────────────────────────────── */
function MrRow({ mod, a, levelKey, review, onOpen }) {
  const st = (review && review.status) || 'pendiente';
  const hasUrl = !!a.url;
  const hasNote = !!(review && review.note && review.note.trim());
  const meta = window.JUCUM_DATA.activityMeta ? window.JUCUM_DATA.activityMeta(a) : {};
  const loc = meta.location ? (window.JUCUM_DATA.LOCATION_LABEL || {})[meta.location] : null;
  return (
    <button onClick={onOpen} style={{display:'flex', alignItems:'center', gap:10, width:'100%', textAlign:'left', cursor:'pointer',
      fontFamily:'inherit', background:'#fff', border:'1px solid var(--border)', borderLeft:`3px solid ${MR_STATUS[st].fg}`,
      borderRadius:11, padding:'10px 13px'}}>
      <span style={{fontSize:18, flexShrink:0}}>{mrIco(a.type)}</span>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontWeight:700, fontSize:13.5, color:'var(--text)', lineHeight:1.25, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{a.name}</div>
        <div style={{display:'flex', alignItems:'center', gap:7, marginTop:3, flexWrap:'wrap'}}>
          {meta.phase && <span style={{fontSize:10, fontWeight:800, color:'#5B4B8A', background:'#EFEAF8', borderRadius:6, padding:'1px 6px'}}>{meta.phase}</span>}
          {loc && <span style={{fontSize:10, fontWeight:800, color:loc.fg, background:loc.bg, borderRadius:6, padding:'1px 6px'}}>{loc.ico} {loc.txt}</span>}
          {a.latent && <span style={{fontSize:10, fontWeight:800, color:'#2E7D32', background:'#E8F5E9', borderRadius:6, padding:'1px 6px'}}>🌱 latente</span>}
          {hasNote && <span style={{fontSize:10.5, fontWeight:700, color:'#B26A00'}}>📝 con nota</span>}
        </div>
      </div>
      {!hasUrl && <span style={{fontSize:10.5, fontWeight:800, color:'#8A7F6A', background:'#EEEAE0', borderRadius:20, padding:'3px 9px', whiteSpace:'nowrap'}}>📦 en preparación</span>}
      <MrChip status={st} small />
      <span style={{color:'#C7BEAE', fontWeight:800, flexShrink:0}}>›</span>
    </button>
  );
}

/* ── Módulo colapsable ──────────────────────────────────────────── */
function MrModule({ mod, levelKey, reviews, defaultOpen, filterFn, onOpen }) {
  const [open, setOpen] = mrState(!!defaultOpen);
  const acts = (mod.activities || []).filter(a => filterFn(mod, a));
  if (acts.length === 0) return null;

  // agrupar consecutivas por tema
  const segments = [];
  acts.forEach(a => {
    const g = a.group || null;
    const last = segments[segments.length - 1];
    if (last && last.tema === g) last.items.push(a); else segments.push({ tema: g, items: [a] });
  });
  const withUrl = acts.filter(a => a.url).length;
  const fixCount = acts.filter(a => (reviews[`${levelKey}:${mod.id}:${a.id}`] || {}).status === 'fix').length;
  let temaN = 0;

  return (
    <div className="scard" style={{padding:14}}>
      <div className="sec-head" style={{cursor:'pointer', marginBottom: open ? 12 : 0}} onClick={() => setOpen(o => !o)}>
        <div className="sec-title" style={{fontSize:15}}>{mod.emoji} {mod.name}</div>
        <span className="sec-meta" style={{display:'flex', alignItems:'center', gap:8}}>
          {fixCount > 0 && <span style={{fontSize:11, fontWeight:800, color:'#C2410C', background:'#FFF1E6', border:'1px solid #F4C7A1', borderRadius:20, padding:'2px 9px'}}>⚠️ {fixCount} por corregir</span>}
          {acts.length} act. · {withUrl} con material
          <span style={{marginLeft:2, transition:'transform .15s', transform: open?'rotate(180deg)':'none', display:'inline-block'}}>▾</span>
        </span>
      </div>
      {open && (
        <div style={{display:'flex', flexDirection:'column', gap:8}}>
          {segments.map((seg, si) => {
            const rows = seg.items.map(a => (
              <MrRow key={a.id} mod={mod} a={a} levelKey={levelKey}
                     review={reviews[`${levelKey}:${mod.id}:${a.id}`]} onOpen={() => onOpen(mod, a)} />
            ));
            if (!seg.tema) return <div key={'s'+si} style={{display:'flex', flexDirection:'column', gap:8}}>{rows}</div>;
            temaN++;
            return (
              <div key={'s'+si} style={{border:'1px solid var(--border-soft,#F0EDE4)', borderRadius:12, padding:'10px 11px', background:'#FBFAF6'}}>
                <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:8}}>
                  <span style={{width:20, height:20, borderRadius:'50%', background:'#1F3A8A', color:'#fff', fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>{temaN}</span>
                  <span style={{fontWeight:800, fontSize:12.5, color:'var(--text)'}}>{seg.tema}</span>
                  <span style={{marginLeft:'auto', fontSize:11, fontWeight:700, color:'var(--text-soft)'}}>{seg.items.length}</span>
                </div>
                <div style={{display:'flex', flexDirection:'column', gap:8}}>{rows}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Visor de revisión (pantalla completa) ──────────────────────── */
function MrDrawer({ list, index, setIndex, reviews, bump, onClose, who }) {
  const item = list[index];
  const { mod, a, key } = item;
  const review = reviews[key] || {};
  const status = review.status || 'pendiente';
  const url = mrLink(a, mod);
  const [note, setNote] = mrState(review.note || '');
  const [saved, setSaved] = mrState('');
  const [sending, setSending] = mrState(false);
  const D = window.JUCUM_DATA;
  const reviewer = who || window.JUCUM_TEACHER_NAME || 'Profesor';
  const checklist = mrChecklist(a.type);
  const checked = review.checklist || {};

  // al cambiar de material, recargar la nota y reiniciar avisos
  mrEffect(() => { setNote((reviews[key] || {}).note || ''); setSaved(''); }, [key]);
  // navegación con teclado
  mrEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' && index < list.length - 1) setIndex(index + 1);
      else if (e.key === 'ArrowLeft' && index > 0) setIndex(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, list.length]);

  const flash = (t) => { setSaved(t); setTimeout(() => setSaved(''), 1800); };
  const setStatus = (s) => { D.setMaterialReview(key, { status: s, reviewer }); bump(); flash('Estado guardado'); };
  const saveNote = () => { D.setMaterialReview(key, { note }); bump(); flash('Nota guardada'); };
  const toggleCheck = (i) => { const next = { ...checked, [i]: !checked[i] }; D.setMaterialReview(key, { checklist: next }); bump(); };
  const sendSupport = async () => {
    const msg = note.trim();
    if (!msg) { flash('Escribe la observación primero'); return; }
    setSending(true);
    D.setMaterialReview(key, { note, status: status === 'pendiente' ? 'fix' : status, reviewer });
    const r = await D.sendMaterialReport({ level: key.split(':')[0], module: mod, activity: a, url: a.url, message: msg, reviewer });
    setSending(false);
    if (r && r.ok) { D.setMaterialReview(key, { sentToSupport: new Date().toISOString() }); bump(); flash('📨 Enviado a soporte'); }
    else alert('No se pudo enviar: ' + ((r && r.reason) || 'sin conexión con la nube'));
  };

  const sentAt = review.sentToSupport ? new Date(review.sentToSupport).toLocaleDateString('es-PE', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : null;
  const lvlLabel = ((D.LEVELS || {})[key.split(':')[0]] || {}).code || key.split(':')[0];

  return (
    <div style={{position:'fixed', inset:0, background:'#F4F1EA', zIndex:200, display:'flex', flexDirection:'column'}}>
      {/* header */}
      <div style={{display:'flex', alignItems:'center', gap:12, padding:'10px 16px', background:'#fff', borderBottom:'1.5px solid var(--border)', flexShrink:0}}>
        <button onClick={onClose} className="btn-soft" style={{padding:'7px 13px'}}>✕ Cerrar</button>
        <div style={{display:'flex', alignItems:'center', gap:5}}>
          <button className="btn-soft" style={{padding:'7px 11px', opacity: index>0?1:.4}} disabled={index<=0} onClick={() => setIndex(index-1)} title="Anterior (←)">←</button>
          <span style={{fontSize:11.5, fontWeight:800, color:'var(--text-soft)', minWidth:64, textAlign:'center'}}>{index+1} / {list.length}</span>
          <button className="btn-soft" style={{padding:'7px 11px', opacity: index<list.length-1?1:.4}} disabled={index>=list.length-1} onClick={() => setIndex(index+1)} title="Siguiente (→)">→</button>
        </div>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:15, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{mrIco(a.type)} {a.name}</div>
          <div style={{fontSize:11.5, fontWeight:700, color:'var(--text-soft)'}}>{lvlLabel} · {mod.emoji} {mod.name}{a.group ? ' · ' + a.group : ''} · {(MR_TYPE[a.type]||{}).label || a.type}</div>
        </div>
        <MrChip status={status} />
        {url && <a href={url} target="_blank" rel="noopener" className="btn-soft" style={{padding:'7px 13px', textDecoration:'none', color:'#1F3A8A', borderColor:'#C9D6F0', background:'#F4F7FE'}}>↗ Pestaña nueva</a>}
      </div>

      {/* body */}
      <div style={{flex:1, display:'flex', minHeight:0}}>
        {/* visor */}
        <div style={{flex:'1 1 auto', minWidth:0, background:'#fff', borderRight:'1.5px solid var(--border)', position:'relative'}}>
          {url ? (
            <iframe key={key} src={url} title={a.name} allow="autoplay; fullscreen; microphone"
                    style={{width:'100%', height:'100%', border:'none', display:'block'}} />
          ) : (
            <div style={{height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, padding:30,
              background:'repeating-linear-gradient(45deg,#FBFAF6,#FBFAF6 12px,#F4F1EA 12px,#F4F1EA 24px)', textAlign:'center'}}>
              <div style={{fontSize:44}}>📦</div>
              <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:18, color:'var(--text)'}}>Material en preparación</div>
              <div style={{fontSize:13, fontWeight:600, color:'var(--text-soft)', maxWidth:360, lineHeight:1.5}}>Esta actividad todavía no tiene una URL cargada. Súbela en <b>📦 Módulos</b> (pega la URL de GitHub). Igual puedes dejar una nota o enviarla a soporte.</div>
            </div>
          )}
        </div>

        {/* panel de revisión */}
        <div style={{flex:'0 0 400px', maxWidth:'42vw', overflowY:'auto', padding:'16px 16px 40px', display:'flex', flexDirection:'column', gap:16}}>
          {/* estado */}
          <div>
            <div className="mr-lbl">Estado de revisión</div>
            <div style={{display:'flex', gap:7}}>
              {['pendiente','ok','fix'].map(s => {
                const on = status === s; const m = MR_STATUS[s];
                return (
                  <button key={s} onClick={() => setStatus(s)} style={{flex:1, cursor:'pointer', fontFamily:'inherit', fontWeight:800, fontSize:11.5,
                    borderRadius:10, padding:'9px 6px', border:`1.5px solid ${on?m.fg:'var(--border)'}`, background:on?m.bg:'#fff', color:on?m.fg:'var(--text-soft)'}}>
                    <div style={{fontSize:16}}>{m.ico}</div>{m.chip}
                  </button>
                );
              })}
            </div>
          </div>

          {/* checklist */}
          <div>
            <div className="mr-lbl">Checklist de calidad · {(MR_TYPE[a.type]||{}).label || a.type}</div>
            <div style={{display:'flex', flexDirection:'column', gap:6}}>
              {checklist.map((c, i) => (
                <label key={i} style={{display:'flex', alignItems:'flex-start', gap:9, cursor:'pointer', fontSize:12.5, fontWeight:600, color:'var(--text)',
                  background:'#fff', border:'1px solid var(--border)', borderRadius:10, padding:'8px 11px', lineHeight:1.4}}>
                  <input type="checkbox" checked={!!checked[i]} onChange={() => toggleCheck(i)} style={{width:17, height:17, marginTop:1, flexShrink:0, accentColor:'#2E7D32'}} />
                  <span>{c}</span>
                </label>
              ))}
            </div>
          </div>

          {/* observaciones */}
          <div>
            <div className="mr-lbl">Observaciones / pendientes</div>
            <textarea value={note} onChange={e => setNote(e.target.value)} onBlur={saveNote} rows={4}
              placeholder="Anota lo que hay que corregir o mejorar en este material…"
              style={{width:'100%', border:'1px solid var(--border)', borderRadius:11, padding:'10px 12px', fontFamily:"'Nunito',sans-serif",
                fontSize:13.5, fontWeight:600, color:'var(--text)', resize:'vertical', boxSizing:'border-box'}} />
            <div style={{display:'flex', alignItems:'center', gap:9, marginTop:9, flexWrap:'wrap'}}>
              <button onClick={sendSupport} disabled={sending} style={{cursor:'pointer', fontFamily:'inherit', fontWeight:800, fontSize:12.5,
                border:'none', borderRadius:10, padding:'9px 15px', color:'#fff', background: sending ? '#9AA0A6' : 'linear-gradient(135deg,#F06A78,#E0556A)', boxShadow:'0 2px 8px rgba(224,85,106,.25)'}}>
                {sending ? 'Enviando…' : '📨 Enviar a soporte'}
              </button>
              <button onClick={saveNote} className="btn-soft" style={{padding:'9px 14px', fontSize:12.5}}>💾 Guardar nota</button>
              {saved && <span style={{fontSize:12, fontWeight:800, color:'#2E7D32'}}>{saved}</span>}
            </div>
            {sentAt && <div style={{fontSize:11.5, fontWeight:700, color:'var(--text-soft)', marginTop:8}}>Última vez enviado a soporte: {sentAt} · aparece en <b>🐞 Reportes</b> del panel de desarrollo.</div>}
            <div style={{fontSize:11.5, fontWeight:600, color:'var(--text-soft)', marginTop:8, lineHeight:1.5, background:'#FBFAF6', border:'1px dashed var(--border)', borderRadius:10, padding:'9px 11px'}}>
              💡 La nota se guarda en la nube (la ves desde cualquier equipo). <b>Enviar a soporte</b> crea un reporte editable en la bandeja 🐞 para que quien corrige el material lo tome.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Vista principal ────────────────────────────────────────────── */
function MaterialsReview({ onBack, who }) {
  const D = window.JUCUM_DATA;
  const { MODULE_CATALOG, LEVELS } = D;
  const levelKeys = Object.keys(LEVELS);
  const [tab, setTab] = mrState(levelKeys[0]);
  const [filter, setFilter] = mrState('all'); // all · pendiente · ok · fix · prep
  const [openIdx, setOpenIdx] = mrState(null); // índice en la lista aplanada, o null
  const [, setTick] = mrState(0);
  const bump = () => setTick(t => t + 1);

  // cargar revisiones de la nube al entrar
  mrEffect(() => { if (D.loadMaterialReviewsFromCloud) D.loadMaterialReviewsFromCloud().then(() => bump()); }, []);

  const reviews = D.getMaterialReviews ? D.getMaterialReviews() : {};
  const flat = mrMemo(() => mrFlatten(tab, MODULE_CATALOG), [tab, MODULE_CATALOG]);

  const statusOf = (mod, a) => (reviews[`${tab}:${mod.id}:${a.id}`] || {}).status || 'pendiente';
  const filterFn = (mod, a) => {
    if (filter === 'all') return true;
    if (filter === 'prep') return !a.url;
    return statusOf(mod, a) === filter;
  };

  // resumen por nivel
  const counts = mrMemo(() => {
    const c = { total: flat.length, ready: 0, prep: 0, ok: 0, fix: 0, pend: 0 };
    flat.forEach(({ mod, a }) => {
      if (a.url) c.ready++; else c.prep++;
      const s = statusOf(mod, a);
      if (s === 'ok') c.ok++; else if (s === 'fix') c.fix++; else c.pend++;
    });
    return c;
  }, [flat, reviews]);

  const openMaterial = (mod, a) => { const i = flat.findIndex(x => x.mod.id === mod.id && x.a.id === a.id); if (i >= 0) setOpenIdx(i); };

  const FILTERS = [
    ['all',      `Todos ${counts.total}`],
    ['fix',      `⚠️ Por corregir ${counts.fix}`],
    ['pend',     `⬜ Sin revisar ${counts.pend}`],
    ['ok',       `✅ OK ${counts.ok}`],
    ['prep',     `📦 En preparación ${counts.prep}`],
  ];
  // el chip 'pend' filtra por 'pendiente'
  const applyFilter = (k) => setFilter(k === 'pend' ? 'pendiente' : k);
  const activeFilterKey = filter === 'pendiente' ? 'pend' : filter;

  return (
    <main>
      <button className="back-btn" onClick={onBack}>← Volver al panel</button>
      <div className="welcome teacher">
        <div className="welcome-text">
          <div className="eyebrow">📚 Materiales</div>
          <h1>Revisión de materiales</h1>
          <p>Recorre todo el catálogo de cada nivel, abre cada material para revisarlo, márcalo como <b>OK</b> o <b>por corregir</b>, deja notas y envía lo que haya que arreglar a soporte.</p>
        </div>
      </div>

      {/* pestañas de nivel */}
      <div className="mm-tabs">
        {levelKeys.map(k => {
          const lv = LEVELS[k];
          const fixN = mrFlatten(k, MODULE_CATALOG).filter(({ mod, a }) => (reviews[`${k}:${mod.id}:${a.id}`] || {}).status === 'fix').length;
          return (
            <button key={k} className={`mm-tab ${tab===k?'on':''}`} onClick={() => { setTab(k); setFilter('all'); }} style={{position:'relative'}}>
              {lv.emoji} {lv.code} <span className="mm-count">{(MODULE_CATALOG[k]||[]).length}</span>
              {fixN > 0 && <span style={{position:'absolute', top:-6, right:-6, background:'#E0556A', color:'#fff', fontSize:10, fontWeight:800, borderRadius:20, minWidth:18, height:18, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px', border:'2px solid #fff'}}>{fixN}</span>}
            </button>
          );
        })}
      </div>

      {/* resumen */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:10, margin:'2px 0 14px'}}>
        <MrStat n={counts.total} label="materiales" ico="📚" />
        <MrStat n={counts.ready} label="con material" ico="🔗" fg="#1565C0" />
        <MrStat n={counts.prep} label="en preparación" ico="📦" fg="#8A7F6A" />
        <MrStat n={counts.ok} label="revisados · OK" ico="✅" fg="#2E7D32" />
        <MrStat n={counts.fix} label="por corregir" ico="⚠️" fg="#C2410C" />
      </div>

      {/* filtros */}
      <div style={{display:'flex', gap:7, flexWrap:'wrap', marginBottom:14}}>
        {FILTERS.map(([k, l]) => {
          const on = activeFilterKey === k;
          return (
            <button key={k} onClick={() => applyFilter(k)} style={{border:'1.5px solid ' + (on?'#1F3A8A':'var(--border)'), background:on?'#1F3A8A':'#fff',
              color:on?'#fff':'var(--text-soft)', fontFamily:'inherit', fontWeight:800, fontSize:12, borderRadius:18, padding:'6px 13px', cursor:'pointer'}}>{l}</button>
          );
        })}
      </div>

      {/* módulos */}
      <div style={{display:'flex', flexDirection:'column', gap:12}}>
        {(MODULE_CATALOG[tab] || []).length === 0
          ? <div className="scard"><div className="empty-state">Sin módulos en este nivel.</div></div>
          : (() => {
              const mods = (MODULE_CATALOG[tab] || []);
              const rendered = mods.map(m => (
                <MrModule key={m.id} mod={m} levelKey={tab} reviews={reviews}
                          defaultOpen={mods.length === 1 || filter !== 'all'} filterFn={filterFn} onOpen={openMaterial} />
              )).filter(Boolean);
              return rendered.length ? rendered : <div className="scard"><div className="empty-state">Nada en este filtro para {LEVELS[tab].code}.</div></div>;
            })()}
      </div>

      {openIdx !== null && flat[openIdx] && (
        <MrDrawer list={flat} index={openIdx} setIndex={setOpenIdx} reviews={reviews} bump={bump} onClose={() => setOpenIdx(null)} who={who} />
      )}

      <style>{`.mr-lbl{font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--text-soft);margin-bottom:8px;}`}</style>
    </main>
  );
}

function MrStat({ n, label, ico, fg }) {
  return (
    <div className="scard" style={{padding:'12px 14px', display:'flex', alignItems:'center', gap:11}}>
      <span style={{fontSize:20}}>{ico}</span>
      <div>
        <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:21, lineHeight:1, color: fg || 'var(--text)'}}>{n}</div>
        <div style={{fontSize:11, fontWeight:700, color:'var(--text-soft)', marginTop:2}}>{label}</div>
      </div>
    </div>
  );
}

Object.assign(window, { MaterialsReview, MrModule, MrDrawer, MrRow });
