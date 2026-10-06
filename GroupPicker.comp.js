/* 👥 GroupPicker + distintivo de nivel · marcador GROUP-PICKER-V1 (06-oct-2026)
 * Aprobado en "Espejo - Selector de grupos y nivel.html" (selector B + distintivo 1).
 *  - GroupPicker: reemplazo directo de <select> de grupo. onChange recibe {target:{value:id}}
 *    (igual que un select) para no tocar los manejadores existentes. Lista agrupada por nivel
 *    con su color, horario a la derecha, buscador, Esc/clic afuera cierra. Finalizados y
 *    grupos de prueba/pausa van al final, en su propia sección.
 *  - LevelRibbon: franja fija del color del nivel arriba de toda la pantalla.
 *  - LevelStamp: sello “Nivel A2 · grupo” (se pone en el encabezado de la pantalla).
 */
const GP_LV_ORDER = ['pre-a1', 'a1', 'a2'];
function gpLevel(lv) {
  const L = (window.JUCUM_DATA && window.JUCUM_DATA.LEVELS) || {};
  return L[lv] || { code: String(lv || '?').toUpperCase(), color: '#B0AC9E', dark: '#5b5648' };
}
function gpIsOther(g) { return /prueba|pausa/i.test(String(g && g.name || '')); }
function gpSection(g) { return g.finishedAt ? 'fin' : gpIsOther(g) ? 'otros' : (g.level || '?'); }
function gpSort(list) {
  return (list || []).slice().sort((a, b) => {
    const ia = GP_LV_ORDER.indexOf(a.level), ib = GP_LV_ORDER.indexOf(b.level);
    return (ia < 0 ? 9 : ia) - (ib < 0 ? 9 : ib) || String(a.name).localeCompare(String(b.name)) || String(a.schedule || '').localeCompare(String(b.schedule || ''));
  });
}
function gpFind(id) { return ((window.JUCUM_DATA && window.JUCUM_DATA.GROUPS) || []).find(g => g.id === id) || null; }

function GpChip({ level, small }) {
  const L = gpLevel(level);
  return <span style={{display:'inline-flex', alignItems:'center', borderRadius:7, padding: small ? '1px 6px' : '2px 8px', fontSize: small ? 10.5 : 11.5, fontWeight:900, whiteSpace:'nowrap', background:L.color + '1F', color:L.dark, border:'1px solid ' + L.color + '66', flex:'none'}}>{L.code}</span>;
}

function GroupPicker({ value, onChange, groups, allOption, placeholder, invalid, style }) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const boxRef = React.useRef(null);
  const inRef = React.useRef(null);
  const list = gpSort(groups || ((window.JUCUM_DATA && window.JUCUM_DATA.GROUPS) || []));
  const cur = list.find(g => g.id === value) || null;
  React.useEffect(() => {
    if (!open) return;
    const off = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', off); document.addEventListener('keydown', esc);
    setTimeout(() => { try { inRef.current && inRef.current.focus(); } catch (e) {} }, 30);
    return () => { document.removeEventListener('mousedown', off); document.removeEventListener('keydown', esc); };
  }, [open]);
  const pick = (id) => { setOpen(false); setQ(''); if (onChange) onChange({ target: { value: id } }); };
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const nq = norm(q);
  const shown = list.filter(g => !nq || norm(g.name + ' ' + (g.schedule || '') + ' ' + gpLevel(g.level).code).includes(nq));
  const sections = [...GP_LV_ORDER, ...[...new Set(shown.map(gpSection))].filter(s => !GP_LV_ORDER.includes(s) && s !== 'otros' && s !== 'fin'), 'otros', 'fin'];
  const isAll = allOption && value === allOption.value;
  const L = cur ? gpLevel(cur.level) : null;
  return (
    <div ref={boxRef} style={{position:'relative', minWidth:220, maxWidth:'100%', ...(style || {})}}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{width:'100%', display:'flex', alignItems:'center', gap:10, border:'1.5px solid ' + (invalid ? '#EF9A9A' : open ? '#3F5BB8' : '#E3DCC9'), borderRadius:12, padding:'7px 12px', background:'#fff', cursor:'pointer', fontFamily:'inherit', textAlign:'left', minHeight:44}}>
        {cur ? <GpChip level={cur.level} /> : null}
        <span style={{flex:1, minWidth:0, display:'flex', flexDirection:'column'}}>
          <b style={{fontSize:14, color: cur || isAll ? '#2A2A2A' : '#A8A08C', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{cur ? cur.name : isAll ? allOption.label : (placeholder || '— Elige el grupo —')}</b>
          {cur && cur.schedule ? <small style={{fontSize:12, color:'#8a7f6a', fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>⏰ {cur.schedule}{cur.finishedAt ? ' · 🎓 finalizado' : ''}</small> : null}
        </span>
        <span style={{color: L ? L.dark : '#8a7f6a', fontWeight:900, fontSize:12}}>{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div style={{position:'absolute', left:0, top:'calc(100% + 6px)', width:'max(100%, 340px)', maxWidth:'calc(100vw - 32px)', background:'#fff', border:'1px solid #D6DEEA', borderRadius:14, boxShadow:'0 14px 34px rgba(13,27,90,.22)', zIndex:500, padding:10, display:'flex', flexDirection:'column', gap:4, maxHeight:420, overflowY:'auto'}}>
          <input ref={inRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar grupo, día u horario…" style={{border:'1.5px solid #E3DCC9', borderRadius:9, padding:'8px 10px', fontFamily:'inherit', fontSize:13, marginBottom:4}} />
          {allOption && !nq && (
            <button type="button" onClick={() => pick(allOption.value)} style={gpOptStyle(isAll)}><b style={{fontSize:13.5}}>{allOption.label}</b></button>
          )}
          {sections.map(sec => {
            const items = shown.filter(g => gpSection(g) === sec);
            if (!items.length) return null;
            const SL = sec === 'fin' ? { code:'🎓 Finalizados', dark:'#8a7f6a', color:'#C9BFA6' } : sec === 'otros' ? { code:'Otros', dark:'#8a7f6a', color:'#C9BFA6' } : gpLevel(sec);
            return (
              <React.Fragment key={sec}>
                <div style={{display:'flex', alignItems:'center', gap:6, fontSize:10.5, fontWeight:900, letterSpacing:'.08em', textTransform:'uppercase', color:SL.dark, padding:'6px 6px 2px'}}>
                  <span style={{width:8, height:8, borderRadius:'50%', background:SL.color}}></span>{SL.code}
                </div>
                {items.map(g => {
                  const gl = gpLevel(g.level), on = g.id === value;
                  return (
                    <button type="button" key={g.id} onClick={() => pick(g.id)} style={gpOptStyle(on)}>
                      <span style={{width:10, height:10, borderRadius:'50%', background:gl.color, flex:'none'}}></span>
                      <b style={{fontSize:13.5, color:'#2A2A2A', minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{g.name}</b>
                      {(sec === 'fin' || sec === 'otros') && <GpChip level={g.level} small />}
                      <small style={{marginLeft:'auto', fontSize:12, color:'#8a7f6a', fontWeight:700, whiteSpace:'nowrap'}}>{g.schedule || ''}</small>
                    </button>
                  );
                })}
              </React.Fragment>
            );
          })}
          {!shown.length && <div style={{fontSize:12.5, color:'#8a7f6a', fontWeight:700, padding:'8px 6px'}}>Ningún grupo coincide con “{q}”.</div>}
        </div>
      )}
    </div>
  );
}
function gpOptStyle(on) {
  return {display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:9, cursor:'pointer', border:0, background: on ? '#EEF2FC' : 'transparent', fontFamily:'inherit', textAlign:'left', width:'100%', minHeight:40};
}

function LevelRibbon({ groupId }) {
  const g = gpFind(groupId);
  if (!g) return null;
  const L = gpLevel(g.level);
  return <div aria-hidden="true" style={{position:'fixed', top:0, left:0, right:0, height:6, background:L.color, zIndex:900, pointerEvents:'none'}}></div>;
}
function LevelStamp({ groupId }) {
  const g = gpFind(groupId);
  if (!g) return null;
  const L = gpLevel(g.level);
  const ink = g.level === 'pre-a1' ? '#3A2200' : '#fff';
  return (
    <div title={'Estás trabajando con ' + g.name} style={{display:'flex', alignItems:'center', gap:10, background:L.color, color:ink, borderRadius:14, padding:'8px 14px', boxShadow:'0 4px 12px rgba(0,0,0,.16)', flex:'none', maxWidth:'100%'}}>
      <span style={{fontFamily:"'Fredoka',sans-serif", fontWeight:700, fontSize:20, letterSpacing:'.02em', whiteSpace:'nowrap'}}>Nivel {L.code}</span>
      <span style={{width:1, alignSelf:'stretch', background:ink, opacity:.35}}></span>
      <span style={{display:'flex', flexDirection:'column', minWidth:0}}>
        <b style={{fontSize:12.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{g.name}</b>
        {g.schedule ? <small style={{fontSize:11.5, fontWeight:700, opacity:.92, whiteSpace:'nowrap'}}>⏰ {g.schedule}</small> : null}
      </span>
    </div>
  );
}

Object.assign(window, { GroupPicker, LevelRibbon, LevelStamp, gpSortGroups: gpSort });
