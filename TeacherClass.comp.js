/* Área "Clase" del profesor:
 *  · Práctica del día  — deja por grupo y día qué deben practicar los alumnos
 *  · Materiales        — abre cualquier material sin restricción (registra uso)
 *  · Bitácora          — calendario de lo que trabajó en clase (auto + manual)
 *  · Notas             — por alumno y observaciones generales de clase
 *  · Recordatorios     — personales, por grupo o generales
 */
const WD_NAMES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const WD_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const typeIco = (t) => ({ story:'📗', reading:'📖', listening:'🎧', grammar:'📝', summary:'📚', quizlet:'🃏' })[t] || '📄';
/* Etiqueta compacta P1/P2/P3 + 🏠/🏫 (metodología del teacher) */
function MethodTags({ a }) {
  const D = window.JUCUM_DATA;
  const meta = D.activityMeta ? D.activityMeta(a) : null;
  if (!meta || (!meta.phase && !meta.location)) return null;
  const loc = meta.location ? D.LOCATION_LABEL[meta.location] : null;
  return (
    <span style={{display:'inline-flex',gap:5,alignItems:'center',marginLeft:6}}>
      {meta.phase && <span style={{fontSize:10,fontWeight:800,padding:'1px 6px',borderRadius:8,background:'#EDEAF7',color:'#5B3FA0'}}>{meta.phase}</span>}
      {loc && <span title={loc.txt} style={{fontSize:10,fontWeight:800,padding:'1px 6px',borderRadius:8,background:loc.bg,color:loc.fg,whiteSpace:'nowrap'}}>{loc.ico} {loc.txt}</span>}
    </span>
  );
}

function TeacherClass({ onBack }) {
  const { GROUPS, LEVELS } = window.JUCUM_DATA;
  const [tab, setTab] = React.useState('daily');
  const [, setTick] = React.useState(0);
  const refresh = () => setTick(t => t + 1);
  React.useEffect(() => { if (window.JUCUM_TT) window.JUCUM_TT.cloudLoadAll().then(refresh); }, []);

  return (
    <main>
      <button className="back-btn" onClick={onBack}>← Volver al panel</button>
      <div className="welcome teacher">
        <div className="welcome-text">
          <div className="eyebrow t">🏫 Clase</div>
          <h1>Mi clase del día a día</h1>
          <p>Deja la práctica del día, abre materiales para enseñar, lleva tu bitácora y anota cómo va cada alumno.</p>
        </div>
      </div>

      <div className="mm-tabs" style={{flexWrap:'wrap'}}>
        <button className={`mm-tab ${tab==='daily'?'on':''}`} onClick={()=>setTab('daily')}>📅 Práctica del día</button>
        <button className={`mm-tab ${tab==='directed'?'on':''}`} onClick={()=>setTab('directed')}>📌 Práctica dirigida</button>
        <button className={`mm-tab ${tab==='seq'?'on':''}`} onClick={()=>setTab('seq')}>🧭 Secuencia de clase</button>
        <button className={`mm-tab ${tab==='materials'?'on':''}`} onClick={()=>setTab('materials')}>📚 Materiales</button>
        <button className={`mm-tab ${tab==='log'?'on':''}`} onClick={()=>setTab('log')}>📆 Bitácora</button>
        <button className={`mm-tab ${tab==='notes'?'on':''}`} onClick={()=>setTab('notes')}>📝 Notas</button>
        <button className={`mm-tab ${tab==='reminders'?'on':''}`} onClick={()=>setTab('reminders')}>🔔 Recordatorios</button>
      </div>

      {tab==='daily' ? <DailyPracticePanel onChange={refresh} />
        : tab==='directed' ? <DirectedPracticePanel onChange={refresh} />
        : tab==='seq' ? <ClassSequencePanel />
        : tab==='materials' ? <TeacherMaterialsBrowser />
        : tab==='log' ? <ClassLogPanel onChange={refresh} />
        : tab==='notes' ? <TeacherNotesPanel onChange={refresh} />
        : <RemindersPanel onChange={refresh} />}
    </main>
  );
}

/* ── 0 · Secuencia de clase (guía de metodología) ─────────────────── */
function ClassSequencePanel() {
  const D = window.JUCUM_DATA;
  const seq = D.CLASS_SEQUENCE || [];
  const stepBg = { 1:'#2EA84B', 2:'#2196F3', 3:'#7B1FA2', 4:'#F9A825', 5:'#E11930' };
  return (
    <div>
      <div className="scard" style={{marginBottom:14}}>
        <div className="settings-hint">Tu secuencia fija para una clase en vivo. La plataforma la respeta: el orden de las prácticas y dónde se hace cada una sigue esta lógica. <b>Pre-A1 no incluye Writing.</b></div>
      </div>
      <div className="scard" style={{marginBottom:14}}>
        <div className="sec-head"><div className="sec-title">🧭 Orden de la clase</div><span className="sec-meta">{seq.length} pasos</span></div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {seq.map(s => (
            <div key={s.step} style={{display:'flex',gap:13,alignItems:'flex-start',padding:'12px 14px',border:'1px solid var(--line,#E8E5DC)',borderLeft:`5px solid ${stepBg[s.step]}`,borderRadius:12,background:'#fff'}}>
              <span style={{flexShrink:0,width:30,height:30,borderRadius:9,background:stepBg[s.step],color:'#fff',fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center'}}>{s.step}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:15}}>{s.ico} {s.name}</div>
                <div style={{fontSize:13.5,color:'var(--text-soft,#5C5C66)',lineHeight:1.45,marginTop:2}}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="scard">
        <div className="sec-head"><div className="sec-title">📍 Dónde se hace cada práctica</div></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {[
            { p:'P1', n:'Fill-In', loc:'home' },
            { p:'P2', n:'Identify', loc:'home' },
            { p:'P3', n:'Transform', loc:'class' },
            { p:'GS', n:'Grammar Summary', loc:'home+class' },
          ].map(x => {
            const loc = D.LOCATION_LABEL[x.loc];
            return (
              <div key={x.p} style={{display:'flex',alignItems:'center',gap:9,padding:'11px 13px',border:'1px solid var(--line,#E8E5DC)',borderRadius:11,background:'#fff'}}>
                <span style={{fontSize:11,fontWeight:800,padding:'2px 7px',borderRadius:8,background:'#EDEAF7',color:'#5B3FA0'}}>{x.p}</span>
                <span style={{fontWeight:700,fontSize:13.5,flex:1}}>{x.n}</span>
                <span style={{fontSize:11,fontWeight:800,padding:'2px 8px',borderRadius:8,background:loc.bg,color:loc.fg,whiteSpace:'nowrap'}}>{loc.ico} {loc.txt}</span>
              </div>
            );
          })}
        </div>
        <div className="settings-hint" style={{marginTop:12}}>P2 puede arrancarse en clase; los sobrantes de P3 quedan como práctica opcional en casa. El diálogo nunca se manda de tarea.</div>
      </div>
    </div>
  );
}

/* ── 1 · Práctica del día ──────────────────────────────────────────── */
/* ── Práctica dirigida (bloque con ventana de días + bono) ── */
function DirectedPracticePanel({ onChange }) {
  const { GROUPS, LEVELS, MODULE_CATALOG } = window.JUCUM_DATA;
  const TT = window.JUCUM_TT;
  const [groupId, setGroupId] = React.useState(GROUPS[0]?.id || '');
  const today = new Date().toISOString().slice(0,10);
  const [openDate, setOpenDate] = React.useState(today);
  const [dueDate, setDueDate] = React.useState('');
  const [picked, setPicked] = React.useState([]);
  const [bonus, setBonus] = React.useState(30);
  const [, setTick] = React.useState(0);
  const group = GROUPS.find(g => g.id === groupId);
  const mods = group ? (MODULE_CATALOG[group.level] || []) : [];
  const list = TT.getDirectedForGroup(groupId);

  const isPicked = (mid, aid) => picked.some(p => p.moduleId===mid && p.activityId===aid);
  const togglePick = (mod, a) => setPicked(p => isPicked(mod.id, a.id)
    ? p.filter(x => !(x.moduleId===mod.id && x.activityId===a.id))
    : [...p, { moduleId:mod.id, activityId:a.id, label:`${a.name}${a.group?' · '+a.group:''}`, type:a.type }]);
  const create = () => {
    if (!groupId || picked.length===0) return;
    TT.addDirected({ groupId, openDate, dueDate: dueDate||null, activities:picked, bonusXp:parseInt(bonus)||0 });
    setPicked([]); setDueDate(''); setBonus(30); setTick(t=>t+1); onChange && onChange();
  };
  const remove = (id) => { if (confirm('¿Eliminar esta práctica dirigida?')) { TT.deleteDirected(id); setTick(t=>t+1); onChange && onChange(); } };
  const fmt = (d) => d ? new Date(d+'T12:00:00').toLocaleDateString('es-PE',{day:'numeric',month:'short'}) : '—';

  return (
    <div>
      <div className="scard" style={{marginBottom:14}}>
        <div className="settings-hint" style={{marginBottom:10}}>Crea un <b>bloque de práctica</b> que dura varios días: elige grupo, fechas de <b>apertura</b> y <b>cierre</b>, y marca las actividades. El alumno la ve en su panel con su reloj, la hace a su ritmo y gana un <b>bono</b> si la termina a tiempo y aprobada.</div>
        <div className="row-flex" style={{gap:10, flexWrap:'wrap', alignItems:'flex-end'}}>
          <div><div className="settings-label">Grupo</div><select className="input-text" style={{maxWidth:240}} value={groupId} onChange={e=>{setGroupId(e.target.value); setPicked([]);}}>{GROUPS.map(g => <option key={g.id} value={g.id}>{LEVELS[g.level]?.emoji} {g.name}</option>)}</select></div>
          <div><div className="settings-label">Abre</div><input type="date" className="input-text" style={{maxWidth:160}} value={openDate} onChange={e=>setOpenDate(e.target.value)} /></div>
          <div><div className="settings-label">Vence</div><input type="date" className="input-text" style={{maxWidth:160}} value={dueDate} onChange={e=>setDueDate(e.target.value)} /></div>
          <div><div className="settings-label">Bono XP</div><input type="number" min="0" className="input-text" style={{maxWidth:90}} value={bonus} onChange={e=>setBonus(e.target.value)} /></div>
        </div>
      </div>

      <div className="scard" style={{marginBottom:14}}>
        <div className="sec-head"><div className="sec-title">📝 Actividades del bloque</div><span className="sec-meta">{picked.length} elegida{picked.length===1?'':'s'}</span></div>
        {mods.length===0 ? <div className="settings-hint">Este grupo no tiene módulos en su nivel.</div> : (
          <div style={{display:'grid', gap:8}}>
            {mods.map(mod => <DPPickModule key={mod.id} mod={mod} isPicked={isPicked} togglePick={togglePick} />)}
          </div>
        )}
        <div style={{display:'flex', justifyContent:'flex-end', marginTop:14}}>
          <button className="btn-save" disabled={picked.length===0} style={picked.length===0?{opacity:.5}:undefined} onClick={create}>Crear práctica dirigida</button>
        </div>
      </div>

      <div className="scard">
        <div className="sec-head"><div className="sec-title">📌 Prácticas dirigidas de {group?.name||''}</div><span className="sec-meta">{list.length}</span></div>
        {list.length===0 ? <div className="empty-state"><div className="icon">📌</div>Aún no creaste ninguna para este grupo.</div> : (
          <div className="sm-list">
            {list.map(d => {
              const todayS = new Date().toISOString().slice(0,10);
              const st = d.openDate>todayS ? {t:'Próxima',c:'#7B1FA2'} : (d.dueDate && d.dueDate<todayS ? {t:'Cerrada',c:'#C0392B'} : {t:'Activa',c:'#B26A00'});
              return (
                <div key={d.id} className="sm-row">
                  <span style={{fontSize:18}}>📌</span>
                  <div className="sm-info">
                    <div className="sm-name">{(d.activities||[]).length} actividad{(d.activities||[]).length===1?'':'es'} · 🎁 +{d.bonusXp} XP</div>
                    <div className="sm-meta">Abre {fmt(d.openDate)} · vence {fmt(d.dueDate)} · <span style={{color:st.c,fontWeight:800}}>{st.t}</span></div>
                  </div>
                  <button className="ftool del" onClick={()=>remove(d.id)}>🗑</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
function DPPickModule({ mod, isPicked, togglePick }) {
  const [open, setOpen] = React.useState(false);
  const n = (mod.activities||[]).filter(a => isPicked(mod.id, a.id)).length;
  return (
    <div className="tg">
      <button type="button" className="tg-head" onClick={()=>setOpen(o=>!o)}>
        <span className="tg-num">{mod.emoji}</span>
        <span className="tg-name">{mod.name}</span>
        {n>0 && <span className="tg-meta">{n} elegida{n===1?'':'s'}</span>}
        <span className={`tg-arr ${open?'open':''}`}>▾</span>
      </button>
      {open && <div className="tg-items">
        {(mod.activities||[]).map(a => (
          <label key={a.id} className="check-row" style={{padding:'5px 4px'}}>
            <input type="checkbox" checked={isPicked(mod.id,a.id)} onChange={()=>togglePick(mod,a)} />
            <span>{typeIco(a.type)} {a.name}{a.group?<span style={{color:'var(--text-soft)'}}> · {a.group}</span>:''}<MethodTags a={a} /></span>
          </label>
        ))}
      </div>}
    </div>
  );
}

function DailyPracticePanel({ onChange }) {
  const { GROUPS, LEVELS, MODULE_CATALOG } = window.JUCUM_DATA;
  const TT = window.JUCUM_TT;
  const [groupId, setGroupId] = React.useState(GROUPS[0]?.id || '');
  const [wd, setWd] = React.useState(new Date().getDay());
  const group = GROUPS.find(g => g.id === groupId);
  const mods = group ? (MODULE_CATALOG[group.level] || []) : [];
  const items = TT.getDailyPractice(groupId, wd);
  const has = (mid, aid) => items.some(it => it.moduleId === mid && it.activityId === aid);
  const toggle = (mod, a) => {
    let next;
    if (has(mod.id, a.id)) next = items.filter(it => !(it.moduleId === mod.id && it.activityId === a.id));
    else next = [...items, { moduleId: mod.id, activityId: a.id, label: `${mod.name} · ${a.name}`, type: a.type }];
    TT.setDailyPractice(groupId, wd, next); onChange();
  };
  const clearDay = () => { TT.setDailyPractice(groupId, wd, []); onChange(); };

  return (
    <div>
      <div className="scard" style={{marginBottom:14}}>
        <div className="settings-hint" style={{marginBottom:10}}>Elige el <b>grupo</b> y el <b>día</b>, y marca las actividades que quieres dejar para que tus alumnos practiquen ese día. Si no dejas nada, verán una recomendación genérica automática.</div>
        <div className="row-flex" style={{gap:10, flexWrap:'wrap'}}>
          <select className="input-text" style={{maxWidth:260}} value={groupId} onChange={e=>setGroupId(e.target.value)}>
            {GROUPS.map(g => <option key={g.id} value={g.id}>{LEVELS[g.level]?.emoji} {g.name}</option>)}
          </select>
          <div className="preset-row" style={{flexWrap:'wrap'}}>
            {WD_SHORT.map((d, i) => <button key={i} className={`preset ${wd===i?'on':''}`} onClick={()=>setWd(i)}>{d}</button>)}
          </div>
        </div>
      </div>

      <div className="scard">
        <div className="sec-head">
          <div className="sec-title">📅 {WD_NAMES[wd]} · {group?.name}</div>
          <span className="sec-meta">{items.length} actividad{items.length===1?'':'es'} seleccionada{items.length===1?'':'s'}</span>
        </div>
        {items.length > 0 && (
          <div className="al-items" style={{marginBottom:12}}>
            {items.map((it,i) => <div key={i} className="al-item done"><span className="al-num">✓</span><span className="al-ico">{typeIco(it.type)}</span><span className="al-name">{it.label}</span><button className="ftool sm" onClick={()=>toggle({id:it.moduleId,name:''},{id:it.activityId})}>✕</button></div>)}
            <button className="att-btn" style={{alignSelf:'flex-start'}} onClick={clearDay}>Limpiar el día</button>
          </div>
        )}
        {mods.length === 0 ? <div className="settings-hint">Este grupo no tiene módulos en su nivel.</div> : (
          <div style={{display:'grid', gap:8}}>
            {mods.map(mod => <DPModule key={mod.id} mod={mod} has={has} toggle={toggle} />)}
          </div>
        )}
      </div>
    </div>
  );
}
function DPModule({ mod, has, toggle }) {
  const [open, setOpen] = React.useState(false);
  const n = (mod.activities||[]).filter(a => has(mod.id, a.id)).length;
  return (
    <div className="tg">
      <button type="button" className="tg-head" onClick={()=>setOpen(o=>!o)}>
        <span className="tg-num">{mod.emoji}</span>
        <span className="tg-name">{mod.name}</span>
        {n>0 && <span className="tg-meta">{n} elegida{n===1?'':'s'}</span>}
        <span className={`tg-arr ${open?'open':''}`}>▾</span>
      </button>
      {open && <div className="tg-items">
        {(mod.activities||[]).map(a => (
          <label key={a.id} className="check-row" style={{padding:'5px 4px'}}>
            <input type="checkbox" checked={has(mod.id,a.id)} onChange={()=>toggle(mod,a)} />
            <span>{typeIco(a.type)} {a.name}{a.group?<span style={{color:'var(--text-soft)'}}> · {a.group}</span>:''}<MethodTags a={a} /></span>
          </label>
        ))}
      </div>}
    </div>
  );
}

/* ── 2 · Materiales (acceso libre del profesor, registra uso) ─────── */
function TeacherMaterialsBrowser() {
  const { GROUPS, LEVELS, MODULE_CATALOG } = window.JUCUM_DATA;
  const TT = window.JUCUM_TT;
  const [groupId, setGroupId] = React.useState(GROUPS[0]?.id || '');
  const group = GROUPS.find(g => g.id === groupId);
  const mods = group ? (MODULE_CATALOG[group.level] || []) : [];
  return (
    <div>
      <div className="scard" style={{marginBottom:14}}>
        <div className="settings-hint" style={{marginBottom:10}}>Abre cualquier material para tu clase, <b>sin restricciones</b>. Si te quedas más de <b>5 minutos</b> en uno, se registra solo en tu <b>bitácora</b> (así sabemos qué trabajaste y cuánto). Elige el grupo con el que estás dando clase:</div>
        <select className="input-text" style={{maxWidth:280}} value={groupId} onChange={e=>setGroupId(e.target.value)}>
          {GROUPS.map(g => <option key={g.id} value={g.id}>{LEVELS[g.level]?.emoji} {g.name}</option>)}
        </select>
      </div>
      {mods.length === 0 ? <div className="scard"><div className="settings-hint">Sin módulos en este nivel.</div></div> :
        mods.map(mod => (
          <div key={mod.id} className="scard" style={{marginBottom:12}}>
            <div className="sec-head"><div className="sec-title">{mod.emoji} {mod.name}</div><span className="sec-meta">{(mod.activities||[]).length} materiales</span></div>
            <div className="al-items">
              {(mod.activities||[]).map(a => {
                const href = TT.teacherMaterialLink(a, mod, groupId);
                return (
                  <a key={a.id} className={`al-item ${href?'open':'locked'}`} href={href||undefined} target={href?'_blank':undefined} rel="noreferrer">
                    <span className="al-ico">{typeIco(a.type)}</span>
                    <span className="al-name">{a.name}{a.group?<span style={{color:'var(--text-soft)',fontWeight:600}}> · {a.group}</span>:''}<MethodTags a={a} /></span>
                    {href ? <span className="al-arr">↗</span> : <span className="al-score" style={{background:'#EEE',color:'#999'}}>sin URL</span>}
                  </a>
                );
              })}
            </div>
          </div>
        ))
      }
    </div>
  );
}

/* ── 3 · Bitácora (calendario mensual + detalle del día) ──────────── */
function ClassLogPanel({ onChange }) {
  const { GROUPS, LEVELS } = window.JUCUM_DATA;
  const TT = window.JUCUM_TT;
  const today = new Date();
  const [ym, setYm] = React.useState(today.toISOString().slice(0,7));
  const [selDay, setSelDay] = React.useState(today.toISOString().slice(0,10));
  const [adding, setAdding] = React.useState(false);
  const entries = TT.getClassLogForMonth(ym);
  const byDay = {}; entries.forEach(e => { (byDay[e.date] = byDay[e.date] || []).push(e); });

  const [y, m] = ym.split('-').map(Number);
  const first = new Date(y, m-1, 1);
  const startWd = first.getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells = [];
  for (let i=0;i<startWd;i++) cells.push(null);
  for (let d=1; d<=daysInMonth; d++) cells.push(`${ym}-${String(d).padStart(2,'0')}`);

  const shiftMonth = (delta) => { const dt = new Date(y, m-1+delta, 1); setYm(dt.toISOString().slice(0,7)); };
  const dayEntries = TT.getClassLogForDay(selDay);
  const monthMin = entries.reduce((s,e)=>s+(e.minutes||0),0);

  return (
    <div>
      <div className="scard">
        <div className="sec-head">
          <div className="sec-title">📆 {first.toLocaleDateString('es-PE',{month:'long',year:'numeric'})}</div>
          <div className="row-flex" style={{gap:6}}>
            <span className="sec-meta">{entries.length} usos · {Math.floor(monthMin/60)}h {monthMin%60}m</span>
            <button className="att-btn" onClick={()=>shiftMonth(-1)}>‹</button>
            <button className="att-btn" onClick={()=>shiftMonth(1)}>›</button>
          </div>
        </div>
        <div className="cal-grid">
          {WD_SHORT.map(d => <div key={d} className="cal-h">{d}</div>)}
          {cells.map((date, i) => {
            if (!date) return <div key={i} className="cal-cell empty"></div>;
            const es = byDay[date] || [];
            const mins = es.reduce((s,e)=>s+(e.minutes||0),0);
            const dnum = Number(date.slice(8));
            return (
              <button key={i} className={`cal-cell ${selDay===date?'sel':''} ${es.length?'has':''} ${date===today.toISOString().slice(0,10)?'today':''}`} onClick={()=>setSelDay(date)}>
                <span className="cal-num">{dnum}</span>
                {es.length>0 && <span className="cal-dot">{es.length} · {mins}m</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="scard" style={{marginTop:14}}>
        <div className="sec-head">
          <div className="sec-title">{new Date(selDay+'T12:00:00').toLocaleDateString('es-PE',{weekday:'long',day:'numeric',month:'long'})}</div>
          <button className="att-btn" onClick={()=>setAdding(true)}>+ Registrar manual</button>
        </div>
        {dayEntries.length === 0 ? <div className="empty-state"><div className="icon">📭</div>Sin materiales registrados este día. Se registran solos al usar un material desde “Materiales”.</div> : (
          <div className="sm-list">
            {dayEntries.map(e => {
              const g = GROUPS.find(g=>g.id===e.groupId);
              const fromTo = (e.from && e.to) ? `${new Date(e.from).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'})}–${new Date(e.to).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'})}` : '';
              return (
                <div key={e.id} className="sm-row">
                  <span style={{fontSize:18}}>{typeIco(e.type)}</span>
                  <div className="sm-info">
                    <div className="sm-name">{e.materialName}</div>
                    <div className="sm-meta">{g?`${g.name} · `:''}{e.minutes} min{fromTo?` · ${fromTo}`:''}{e.source==='auto'?' · auto':''}</div>
                  </div>
                  <button className="ftool del" onClick={()=>{ TT.deleteClassEntry(e.id); onChange(); }}>🗑</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {adding && <ManualLogModal date={selDay} onClose={()=>setAdding(false)} onSaved={()=>{ setAdding(false); onChange(); }} />}
    </div>
  );
}
function ManualLogModal({ date, onClose, onSaved }) {
  const { GROUPS, LEVELS } = window.JUCUM_DATA;
  const [groupId, setGroupId] = React.useState(GROUPS[0]?.id||'');
  const [name, setName] = React.useState('');
  const [minutes, setMinutes] = React.useState(20);
  const save = () => { if(!name.trim()) return; window.JUCUM_TT.logClassMaterial({ date, groupId, materialName:name.trim(), minutes:parseInt(minutes)||0, source:'manual' }); onSaved(); };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" style={{maxWidth:460}} onClick={e=>e.stopPropagation()}>
        <div className="modal-head"><div className="modal-title">📆 Registrar en bitácora</div><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div className="settings-block" style={{paddingTop:0}}><div className="settings-label">Grupo</div><select className="input-text" style={{width:'100%'}} value={groupId} onChange={e=>setGroupId(e.target.value)}>{GROUPS.map(g=><option key={g.id} value={g.id}>{LEVELS[g.level]?.emoji} {g.name}</option>)}</select></div>
          <div className="settings-block"><div className="settings-label">¿Qué trabajaste?</div><input className="input-text" style={{width:'100%'}} value={name} onChange={e=>setName(e.target.value)} placeholder="Ej: Story 2 · Past Simple" /></div>
          <div className="settings-block"><div className="settings-label">Minutos</div><input type="number" min="1" className="input-text" style={{width:100}} value={minutes} onChange={e=>setMinutes(e.target.value)} /></div>
          <div className="modal-actions"><button className="btn-cancel" onClick={onClose}>Cancelar</button><button className="btn-save" onClick={save}>Guardar</button></div>
        </div>
      </div>
    </div>
  );
}

/* ── 4 · Notas (por alumno + observaciones de clase) ──────────────── */
function TeacherNotesPanel({ onChange }) {
  const { STUDENTS, GROUPS, LEVELS } = window.JUCUM_DATA;
  const TT = window.JUCUM_TT;
  const [mode, setMode] = React.useState('student');
  const [q, setQ] = React.useState('');
  const [sel, setSel] = React.useState(null);
  const [text, setText] = React.useState('');
  const [genGroup, setGenGroup] = React.useState('all');

  const results = q ? STUDENTS.filter(s => s.fullName.toLowerCase().includes(q.toLowerCase()) || (s.username||'').includes(q.toLowerCase())).slice(0,8) : [];
  const addStudentNote = () => { if(!sel||!text.trim()) return; TT.addNote({ studentId:sel.id, groupId:sel.group, text:text.trim() }); setText(''); onChange(); };
  const addGeneralNote = () => { if(!text.trim()) return; TT.addNote({ groupId: genGroup==='all'?null:genGroup, text:text.trim() }); setText(''); onChange(); };

  return (
    <div>
      <div className="preset-row" style={{marginBottom:14}}>
        <button className={`preset ${mode==='student'?'on':''}`} onClick={()=>{setMode('student');setText('');}}>👤 Por alumno</button>
        <button className={`preset ${mode==='general'?'on':''}`} onClick={()=>{setMode('general');setText('');setSel(null);}}>📋 Observaciones de clase</button>
      </div>

      {mode==='student' ? (
        <div className="scard">
          <div className="sec-head"><div className="sec-title">👤 Notas por alumno</div></div>
          <input className="input-text" style={{width:'100%', maxWidth:340}} placeholder="🔍 Busca al alumno por nombre o usuario…" value={q} onChange={e=>{setQ(e.target.value);setSel(null);}} />
          {!sel && results.length>0 && (
            <div className="sm-list" style={{marginTop:10}}>
              {results.map(s => <button key={s.id} className="eval-student-row" onClick={()=>{setSel(s);setQ(s.fullName);}}><div className="eval-st-info"><div className="eval-st-name">{s.fullName}</div><div className="eval-st-meta">@{s.username} · {LEVELS[s.level]?.code}</div></div><span className="eval-st-cta">Elegir →</span></button>)}
            </div>
          )}
          {sel && (
            <div style={{marginTop:12}}>
              <div className="cd-summary" style={{marginBottom:10}}>📝 Anotando sobre <b>{sel.fullName}</b> · {GROUPS.find(g=>g.id===sel.group)?.name||''}</div>
              <textarea className="eval-textarea" rows={3} value={text} onChange={e=>setText(e.target.value)} placeholder="¿Qué le falla? ¿Qué va bien? ¿En qué necesita apoyo? (para recordarte cómo va)" />
              <div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}><button className="btn-save" onClick={addStudentNote}>Guardar nota</button></div>
              <NoteList notes={TT.getStudentNotes(sel.id)} onChange={onChange} />
            </div>
          )}
        </div>
      ) : (
        <div className="scard">
          <div className="sec-head"><div className="sec-title">📋 Observaciones de clase</div></div>
          <div className="row-flex" style={{gap:8, marginBottom:10, flexWrap:'wrap'}}>
            <select className="input-text" style={{maxWidth:240}} value={genGroup} onChange={e=>setGenGroup(e.target.value)}>
              <option value="all">General (todos)</option>
              {GROUPS.map(g=><option key={g.id} value={g.id}>{LEVELS[g.level]?.emoji} {g.name}</option>)}
            </select>
          </div>
          <textarea className="eval-textarea" rows={3} value={text} onChange={e=>setText(e.target.value)} placeholder="Observaciones de la clase de hoy: qué se vio, qué reforzar la próxima, acuerdos…" />
          <div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}><button className="btn-save" onClick={addGeneralNote}>Guardar observación</button></div>
          <NoteList notes={TT.getGeneralNotes(genGroup==='all'?null:genGroup)} onChange={onChange} showGroup />
        </div>
      )}
    </div>
  );
}
function NoteList({ notes, onChange, showGroup }) {
  const { GROUPS } = window.JUCUM_DATA;
  if (!notes || notes.length===0) return <div className="settings-hint" style={{marginTop:12}}>Aún no hay notas.</div>;
  return (
    <div style={{marginTop:14, display:'flex', flexDirection:'column', gap:8}}>
      {notes.map(n => (
        <div key={n.id} className="eval-card" style={{borderLeftColor:'#F9A825'}}>
          <div className="eval-card-head" style={{marginBottom:6, paddingBottom:6}}>
            <div className="eval-card-date">{new Date(n.date).toLocaleDateString('es-PE',{day:'numeric',month:'long',year:'numeric'})}{showGroup && n.groupId?` · ${GROUPS.find(g=>g.id===n.groupId)?.name||''}`:''}</div>
            <button className="eval-del" onClick={()=>{ window.JUCUM_TT.deleteNote(n.id); onChange(); }}>🗑</button>
          </div>
          <div className="fpost-body">{n.text}</div>
        </div>
      ))}
    </div>
  );
}

/* ── 5 · Recordatorios ────────────────────────────────────────────── */
function RemindersPanel({ onChange }) {
  const { GROUPS, LEVELS } = window.JUCUM_DATA;
  const TT = window.JUCUM_TT;
  const [scope, setScope] = React.useState('all');
  const [text, setText] = React.useState('');
  const [due, setDue] = React.useState('');
  const [remGroup, setRemGroup] = React.useState('');
  const reminders = TT.getReminders(scope);
  const add = () => { if(!text.trim()) return; TT.addReminder({ text:text.trim(), due:due||null, groupId:remGroup||null }); setText(''); setDue(''); onChange(); };

  return (
    <div>
      <div className="scard" style={{marginBottom:14}}>
        <div className="sec-head"><div className="sec-title">🔔 Nuevo recordatorio</div></div>
        <textarea className="eval-textarea" rows={2} value={text} onChange={e=>setText(e.target.value)} placeholder="Ej: Traer flashcards de vocabulario para el grupo del viernes" />
        <div className="row-flex" style={{gap:8, marginTop:8, flexWrap:'wrap'}}>
          <select className="input-text" style={{maxWidth:220}} value={remGroup} onChange={e=>setRemGroup(e.target.value)}>
            <option value="">General (sin grupo)</option>
            {GROUPS.map(g=><option key={g.id} value={g.id}>{LEVELS[g.level]?.emoji} {g.name}</option>)}
          </select>
          <input type="date" className="input-text" style={{maxWidth:170}} value={due} onChange={e=>setDue(e.target.value)} />
          <button className="btn-save" onClick={add}>Agregar</button>
        </div>
      </div>

      <div className="scard">
        <div className="sec-head">
          <div className="sec-title">Mis recordatorios</div>
          <select className="input-text" style={{maxWidth:200}} value={scope} onChange={e=>setScope(e.target.value)}>
            <option value="all">Todos</option>
            {GROUPS.map(g=><option key={g.id} value={g.id}>{LEVELS[g.level]?.emoji} {g.name}</option>)}
          </select>
        </div>
        {reminders.length===0 ? <div className="empty-state"><div className="icon">🔔</div>Sin recordatorios.</div> : (
          <div className="sm-list">
            {reminders.map(r => {
              const g = GROUPS.find(g=>g.id===r.groupId);
              const overdue = r.due && !r.done && r.due < new Date().toISOString().slice(0,10);
              return (
                <div key={r.id} className="sm-row" style={{opacity:r.done?0.55:1}}>
                  <input type="checkbox" checked={r.done} onChange={()=>{ TT.toggleReminder(r.id); onChange(); }} style={{width:18,height:18}} />
                  <div className="sm-info">
                    <div className="sm-name" style={{textDecoration:r.done?'line-through':'none'}}>{r.text}</div>
                    <div className="sm-meta">{g?`${g.name}`:'General'}{r.due?` · 📅 ${r.due}`:''}{overdue?' · ⚠️ vencido':''}</div>
                  </div>
                  <button className="ftool del" onClick={()=>{ TT.deleteReminder(r.id); onChange(); }}>🗑</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* Notas compactas sobre un alumno (para el detalle del alumno del profesor) */
function TeacherStudentNotes({ studentId }) {
  const TT = window.JUCUM_TT; const D = window.JUCUM_DATA;
  const [, setT] = React.useState(0); const refresh = () => setT(t => t + 1);
  const [text, setText] = React.useState('');
  const s = D.STUDENTS.find(x => x.id === studentId);
  const add = () => { if (!text.trim()) return; TT.addNote({ studentId, groupId: s && s.group, text: text.trim() }); setText(''); refresh(); };
  return (
    <div className="scard" style={{marginTop:18}}>
      <div className="sec-head"><div className="sec-title">📝 Mis notas sobre el alumno</div><span className="sec-meta">Privadas · para recordar cómo va</span></div>
      <textarea className="eval-textarea" rows={2} value={text} onChange={e=>setText(e.target.value)} placeholder="¿Qué le falla? ¿Qué va bien? ¿En qué necesita apoyo?" />
      <div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}><button className="btn-save" onClick={add}>Guardar nota</button></div>
      <NoteList notes={TT.getStudentNotes(studentId)} onChange={refresh} />
    </div>
  );
}

Object.assign(window, { TeacherClass, ClassSequencePanel, DirectedPracticePanel, DPPickModule, DailyPracticePanel, TeacherMaterialsBrowser, ClassLogPanel, TeacherNotesPanel, RemindersPanel, NoteList, TeacherStudentNotes });
