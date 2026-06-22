/* Planificador (profesor) · PASO 6 — HUB con calendario
 * Centro único de planificación: un calendario mensual donde cada día reúne
 *  · 📘 Plan de clase (sesión minuto a minuto)
 *  · 📝 Set de práctica (actividades para los alumnos, en las fechas que el profe elija)
 *  · ✅ Realizado (bitácora automática: qué material usó en clase)
 * Reemplaza las pestañas "Secuencia de clase" y "Bitácora" (fusionadas aquí).
 * Editable, guardable como plantilla e imprimible a PDF.
 */

/* ════════ Secuencia metodológica por nivel (para el plan de clase) ════════ */
function planBlueprint(level) {
  if (level === 'a2') {
    return [
      { emoji:'📖', title:'Story / Lectura', w:22, steps:['Escucha (solo inglés)','Lectura en voz alta · pronunciación','Identifica ideas que comprendes'] },
      { emoji:'🧠', title:'Repaso de gramática (Pasos 4–5)', w:13, steps:['Repaso del Paso 3','Tips clave del L2','MCQ de autochequeo'] },
      { emoji:'💬', title:'Diálogo · producción', w:20, steps:['Role-play en parejas','Corrección de pronunciación'] },
      { emoji:'✍️', title:'Práctica de gramática (P1/P2/P3)', w:20, steps:['P3 Transform en clase','Dudas resueltas al momento'] },
      { emoji:'📝', title:'Escritura (guiada / libre)', w:18, steps:['Producción con guía por estructura'] },
      { emoji:'✅', title:'Cierre + práctica para casa', w:7, steps:['Asignar set de la semana','Recordar lectura + repaso'] },
    ];
  }
  if (level === 'a1') {
    return [
      { emoji:'🗂️', title:'Repaso de vocabulario', w:12, steps:['Quizlet · combinar / traducir'] },
      { emoji:'📖', title:'Story / Lectura', w:24, steps:['Lee la traducción ES','Escucha + sigue la lectura','Lee en voz alta · pronunciación','Identifica lo que entiendes'] },
      { emoji:'🧠', title:'Repaso de gramática (Pasos 4–5)', w:14, steps:['Repaso del Paso 3','Tips clave del L2','MCQ de autochequeo'] },
      { emoji:'💬', title:'Diálogo · simulación', w:18, steps:['Práctica en parejas','Orden de palabras / estructura'] },
      { emoji:'✍️', title:'Práctica de gramática (P1/P2/P3)', w:20, steps:['Inicio de P2 como ejemplo','P3 Transform en clase'] },
      { emoji:'📝', title:'Escritura breve', w:7, steps:['Oraciones guiadas'] },
      { emoji:'✅', title:'Cierre + práctica para casa', w:5, steps:['Asignar set de la semana'] },
    ];
  }
  return [
    { emoji:'🗂️', title:'Repaso de vocabulario', w:18, steps:['Quizlet Live / combinar (grupo vs 1)','Traducir ES ↔ EN'] },
    { emoji:'📖', title:'Story / Lectura', w:26, steps:['Lee la traducción ES (idea general)','Escucha + sigue la lectura (puntuación = pausas)','Identifica lo que entiendes en inglés','Escucha + lee en voz alta (por turnos)'] },
    { emoji:'🧠', title:'Repaso de gramática (Pasos 4–5)', w:14, steps:['Repaso del Paso 3','Tips clave del L2 (con apoyo en español)','MCQ de autochequeo'] },
    { emoji:'💬', title:'Diálogo · simulación', w:18, steps:['Lectura en parejas (con y sin español)','Chequeo de comprensión'] },
    { emoji:'✍️', title:'Práctica de gramática (P1/P2/P3)', w:18, steps:['P3 Transform en clase','Apoyo en español permitido (Pre-A1)'] },
    { emoji:'✅', title:'Cierre + práctica para casa', w:6, steps:['Re-leer Story (20 min)','Práctica P2 del tema (20 min)','Quizlet · ordenar oraciones (15 min)'] },
  ];
}

function buildClassPlan(cfg, catalog) {
  const mods = catalog[cfg.level] || [];
  const mod = mods.find(m => m.id === cfg.moduleId) || mods[0] || null;
  const total = Math.max(40, cfg.lengthMin || 100);
  const bp = planBlueprint(cfg.level);
  const wsum = bp.reduce((a, b) => a + b.w, 0);
  let acc = 0;
  const blocks = bp.map((b, i) => {
    let mins = Math.round((b.w / wsum) * total / 5) * 5; if (mins < 5) mins = 5; acc += mins;
    return { id: 'b' + i + '_' + Math.random().toString(36).slice(2, 6), emoji: b.emoji, title: b.title, mins, steps: b.steps.slice() };
  });
  const diff = total - acc;
  if (blocks.length && diff !== 0) { let bi = 0; for (let i = 1; i < blocks.length; i++) if (blocks[i].mins > blocks[bi].mins) bi = i; blocks[bi].mins = Math.max(5, blocks[bi].mins + diff); }
  return { kind:'class', level: cfg.level, groupId: cfg.groupId || null, moduleId: mod ? mod.id : null, moduleName: mod ? mod.name : '—',
    themeGroup: cfg.themeGroup || '', lengthMin: total, date: cfg.date, startTime: cfg.startTime || '09:00',
    sessionLabel: cfg.sessionLabel || 'Sesión 1', emphasis: cfg.emphasis || 'Vocabulario · Story/Diálogo · Gramática',
    blocks, materials: defaultMaterials(mod, cfg.themeGroup) };
}

/* Materiales sugeridos para la clase: Story + lectura/listening + gramática del
 * tema (o del primer tema) + quizlet. El profe los ajusta y abre con un clic. */
function defaultMaterials(mod, themeGroup) {
  if (!mod) return [];
  const acts = mod.activities || [];
  const firstTopic = themeGroup || (acts.find(a => a.type === 'grammar' && a.group) || {}).group || null;
  const pick = a => {
    if (a.type === 'story' || a.type === 'reading' || a.type === 'listening' || a.type === 'quizlet') return true;
    if (a.type === 'summary' || a.type === 'grammar') return firstTopic ? a.group === firstTopic : true;
    return false;
  };
  return acts.filter(pick).map(a => {
    const base = { moduleId: mod.id, activityId: a.id, name: a.name, type: a.type, group: a.group || null, url: a.url || null };
    if (a.type === 'quizlet') { base.quizLinks = { vocabulario: a.quizVocabulario || '', traducir: a.quizTraducir || '', ordenar: a.quizOrdenar || '' }; }
    return base;
  }).sort((a, b) => matRank(a.type) - matRank(b.type));
}

function withClock(blocks, startHHMM) {
  let [h, m] = (startHHMM || '09:00').split(':').map(Number);
  let t = h * 60 + (m || 0);
  return blocks.map(b => { const from = t, to = t + (Number(b.mins) || 0); t = to;
    const fmt = x => String(Math.floor(x / 60) % 24).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0');
    return { ...b, from: fmt(from), to: fmt(to) }; });
}

/* ════════ Utilidades de fecha ════════ */
const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DOW_ES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
function ymd(d) { return d.toISOString().slice(0, 10); }
function parseYMD(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function monthMatrix(year, month) {        // month 0-11 → array of {date, inMonth}
  const first = new Date(year, month, 1);
  const start = new Date(first); start.setDate(1 - ((first.getDay() + 7) % 7));
  const cells = [];
  for (let i = 0; i < 42; i++) { const d = new Date(start); d.setDate(start.getDate() + i); cells.push({ date: d, inMonth: d.getMonth() === month }); if (i >= 34 && d.getMonth() !== month && d.getDay() === 6) break; }
  return cells;
}
const todayYMD = () => ymd(new Date());

/* ════════ HUB principal (export ClassPlanner — el nombre que usa el menú) ════════ */
function ClassPlanner({ onBack }) {
  const { MODULE_CATALOG, GROUPS } = window.JUCUM_DATA;
  const TT = window.JUCUM_TT;
  const [screen, setScreen] = React.useState('calendar');   // calendar | class | practice | saved
  const now = new Date();
  const [cursor, setCursor] = React.useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selDate, setSelDate] = React.useState(todayYMD());
  const [editPlan, setEditPlan] = React.useState(null);     // plan de clase en edición
  const [editPractice, setEditPractice] = React.useState(null);
  const [classModePlan, setClassModePlan] = React.useState(null);
  const [defaultGroup, setDefaultGroup] = React.useState(null);
  const [tick, setTick] = React.useState(0);
  const refresh = () => setTick(t => t + 1);

  const goNewClass = (date, gid) => { setEditPlan(null); setSelDate(date || selDate); if (gid !== undefined) setDefaultGroup(gid); setScreen('class'); };
  const goNewPractice = (date, gid) => { setEditPractice(null); setSelDate(date || selDate); if (gid !== undefined) setDefaultGroup(gid); setScreen('practice'); };
  const goClassMode = (plan) => { setClassModePlan(plan); setScreen('classmode'); };

  return (
    <main>
      <button className="back-btn" onClick={onBack}>← Volver al panel</button>
      <div className="welcome teacher">
        <div className="welcome-text">
          <div className="eyebrow">🗓️ Planificador</div>
          <h1>Calendario de clases y prácticas</h1>
          <p>Planea cada día: tu clase minuto a minuto y los sets de práctica para tus alumnos. Mira lo que ya diste y deja listas las próximas semanas.</p>
        </div>
      </div>

      <div className="mm-tabs" style={{flexWrap:'wrap'}}>
        <button className={`mm-tab ${screen === 'calendar' ? 'on' : ''}`} onClick={() => setScreen('calendar')}>📅 Calendario</button>
        <button className={`mm-tab ${screen === 'class' ? 'on' : ''}`} onClick={() => goNewClass()}>📘 Plan de clase</button>
        <button className={`mm-tab ${screen === 'practice' ? 'on' : ''}`} onClick={() => goNewPractice()}>📝 Set de práctica</button>
        <button className={`mm-tab ${screen === 'saved' ? 'on' : ''}`} onClick={() => setScreen('saved')}>📁 Guardados</button>
      </div>

      {screen === 'calendar' && (
        <CalendarHub cursor={cursor} setCursor={setCursor} selDate={selDate} setSelDate={setSelDate}
          onNewClass={goNewClass} onNewPractice={goNewPractice} onEditClass={(p) => { setEditPlan(p); setScreen('class'); }}
          onEditPractice={(p) => { setEditPractice(p); setScreen('practice'); }} onClassMode={goClassMode} refreshKey={tick} onChange={refresh} />
      )}
      {screen === 'class' && (
        <ClassPlanEditor date={selDate} initial={editPlan} defaultGroupId={defaultGroup} onClassMode={goClassMode} onSaved={() => { refresh(); setScreen('calendar'); }} onCancel={() => setScreen('calendar')} />
      )}
      {screen === 'classmode' && (
        <ClassMode plan={classModePlan} onBack={() => setScreen('calendar')} />
      )}
      {screen === 'practice' && (
        <PracticePlanEditor date={selDate} initial={editPractice} defaultGroupId={defaultGroup} onSaved={() => { refresh(); setScreen('calendar'); }} onCancel={() => setScreen('calendar')} />
      )}
      {screen === 'saved' && (
        <SavedItems onOpenClass={(p) => { setEditPlan(p); setScreen('class'); }} onOpenPractice={(p) => { setEditPractice(p); setScreen('practice'); }} onChange={refresh} refreshKey={tick} />
      )}
    </main>
  );
}

/* ════════ Calendario mensual ════════ */
function CalendarHub({ cursor, setCursor, selDate, setSelDate, onNewClass, onNewPractice, onEditClass, onEditPractice, onClassMode, refreshKey, onChange }) {
  const TT = window.JUCUM_TT;
  const { GROUPS } = window.JUCUM_DATA;
  const [groupId, setGroupId] = React.useState(GROUPS[0] ? GROUPS[0].id : null);
  const cells = monthMatrix(cursor.y, cursor.m);
  const prevM = () => setCursor(c => { const d = new Date(c.y, c.m - 1, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const nextM = () => setCursor(c => { const d = new Date(c.y, c.m + 1, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const day = (dstr) => { const p = TT.getPlannedForDay(dstr); return { classPlans: p.classPlans.filter(x => !groupId || x.groupId === groupId), practicePlans: p.practicePlans.filter(x => !groupId || x.groupId === groupId) }; };
  const logFor = (dstr) => (TT.getClassLogForDay ? TT.getClassLogForDay(dstr) : []).filter(e => !groupId || e.groupId === groupId);

  const sel = day(selDate); const selLog = logFor(selDate);

  return (
    <>
      <div className="scard">
        <div style={{display:'flex', alignItems:'center', gap:9, marginBottom:12, flexWrap:'wrap'}}>
          <span style={{fontSize:12, fontWeight:800, color:'#8a7f6a', textTransform:'uppercase', letterSpacing:'0.03em'}}>👥 Grupo</span>
          <select value={groupId || ''} onChange={e => setGroupId(e.target.value)} style={{...selStyle, width:'auto', minWidth:180, flex:'0 1 auto'}}>
            {GROUPS.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <span style={{fontSize:11.5, color:'#A8A8A8', fontWeight:700}}>Este calendario es de este grupo</span>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:12}}>
          <button onClick={prevM} style={navBtn}>‹</button>
          <div style={{flex:1, textAlign:'center', fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:17, textTransform:'capitalize'}}>{MONTHS_ES[cursor.m]} {cursor.y}</div>
          <button onClick={nextM} style={navBtn}>›</button>
        </div>
        <div className="cal-grid">
          {DOW_ES.map(d => <div key={d} className="cal-h">{d}</div>)}
          {cells.map((c, i) => {
            const dstr = ymd(c.date);
            const pl = day(dstr); const lg = logFor(dstr);
            const isToday = dstr === todayYMD(); const isSel = dstr === selDate;
            const nClass = pl.classPlans.length, nPrac = pl.practicePlans.length, nLog = lg.length;
            return (
              <button key={i} onClick={() => setSelDate(dstr)} style={{
                position:'relative', minHeight:62, border: isSel ? '2px solid #3F5BB8' : '1px solid #ECE4D2',
                background: c.inMonth ? (isToday ? '#EEF2FC' : '#fff') : '#F7F3E9', borderRadius:10, padding:'5px 6px',
                cursor:'pointer', textAlign:'left', opacity: c.inMonth ? 1 : 0.5, display:'flex', flexDirection:'column', gap:3 }}>
                <span style={{fontSize:12, fontWeight:800, color: isToday ? '#3F5BB8' : '#6b6453'}}>{c.date.getDate()}</span>
                <span style={{display:'flex', gap:3, flexWrap:'wrap'}}>
                  {nClass > 0 && <span title="Plan de clase" style={dot('#3F5BB8')}>📘</span>}
                  {nPrac > 0 && <span title="Set de práctica" style={dot('#6C4FB0')}>📝</span>}
                  {nLog > 0 && <span title="Realizado en clase" style={dot('#2E7D32')}>✅</span>}
                </span>
              </button>
            );
          })}
        </div>
        <div style={{display:'flex', gap:14, flexWrap:'wrap', marginTop:11, fontSize:11.5, fontWeight:700, color:'#8a7f6a'}}>
          <span>📘 Plan de clase</span><span>📝 Set de práctica</span><span>✅ Realizado (bitácora)</span>
        </div>
      </div>

      {/* Detalle del día seleccionado */}
      <div className="scard" style={{marginTop:16}}>
        <div style={{display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:10}}>
          <div className="sec-title" style={{flex:1, textTransform:'capitalize'}}>{(() => { const d = parseYMD(selDate); return `${DOW_ES[d.getDay()]} ${d.getDate()} de ${MONTHS_ES[d.getMonth()]}`; })()}</div>
          <button onClick={() => onNewClass(selDate, groupId)} style={{...btnGhost, padding:'7px 12px'}}>＋ Plan de clase</button>
          <button onClick={() => onNewPractice(selDate, groupId)} style={{...btnPrimary, padding:'7px 12px', fontSize:13}}>＋ Set de práctica</button>
        </div>

        {sel.classPlans.length === 0 && sel.practicePlans.length === 0 && selLog.length === 0 && (
          <div className="empty-state" style={{padding:'22px 0'}}><div className="icon">🗓️</div>Nada planeado para este día. Agrega un plan de clase o un set de práctica.</div>
        )}

        {sel.classPlans.map(p => (
          <DayRow key={p.id} icon="📘" tint="#EEF2FC" border="#C9D6F5" title={`${p.moduleName} · ${p.sessionLabel}`}
            sub={`Plan de clase · ${p.lengthMin} min · ${(p.blocks || []).length} bloques`}
            onPlay={() => onClassMode(p)} onOpen={() => onEditClass(p)} onDelete={() => { TT.deleteClassPlan(p.id); onChange(); }} />
        ))}
        {sel.practicePlans.map(p => (
          <DayRow key={p.id} icon="📝" tint="#F4EEFB" border="#D9CEEC" title={p.title}
            sub={`${(p.activities || []).length} actividad(es) · ${p.assignToStudents !== false ? '👥 asignado a alumnos' : '🙋 solo para mí'} · ${(p.dates || []).length} día(s)`}
            onOpen={() => onEditPractice(p)} onDelete={() => { TT.deletePracticePlan(p.id); onChange(); }} />
        ))}
        {selLog.length > 0 && (
          <div style={{marginTop:10, borderTop:'1px dashed #E3DCC9', paddingTop:10}}>
            <div style={{fontSize:12, fontWeight:800, color:'#2E7D32', marginBottom:6}}>✅ Realizado en clase (registro automático)</div>
            {selLog.map(e => (
              <div key={e.id} style={{display:'flex', alignItems:'center', gap:9, fontSize:12.5, color:'#555', padding:'4px 0'}}>
                <span style={{fontWeight:700, color:'#2E7D32', whiteSpace:'nowrap'}}>{e.from || '—'}</span>
                <span style={{flex:1}}>{e.materialName}</span>
                <span style={{color:'#999', fontWeight:700}}>{e.minutes}′</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function DayRow({ icon, tint, border, title, sub, onOpen, onDelete, onPlay }) {
  return (
    <div style={{display:'flex', alignItems:'center', gap:11, border:'1px solid ' + border, background: tint, borderRadius:11, padding:'10px 12px', marginBottom:8}}>
      <span style={{fontSize:19}}>{icon}</span>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontWeight:800, fontSize:13.5}}>{title}</div>
        <div style={{fontSize:11.5, color:'#8a7f6a', fontWeight:700}}>{sub}</div>
      </div>
      {onPlay && <button onClick={onPlay} style={{...btnPrimary, padding:'6px 12px', fontSize:12.5, background:'linear-gradient(135deg,#3F5BB8,#0D1B5A)'}}>▶ Modo clase</button>}
      <button onClick={onOpen} style={{...btnGhost, padding:'6px 12px', fontSize:12.5}}>Abrir</button>
      <button onClick={onDelete} title="Eliminar" style={{...iconBtn, color:'#C0392B'}}>×</button>
    </div>
  );
}

/* ════════ Editor de PLAN DE CLASE ════════ */
function ClassPlanEditor({ date, initial, onSaved, onCancel, onClassMode, defaultGroupId }) {
  const { MODULE_CATALOG, GROUPS } = window.JUCUM_DATA;
  const TT = window.JUCUM_TT;
  const [cfg, setCfg] = React.useState(() => {
    if (initial) return { level: initial.level, groupId: initial.groupId, moduleId: initial.moduleId, themeGroup: initial.themeGroup || '', lengthMin: initial.lengthMin, sessionLabel: initial.sessionLabel, startTime: initial.startTime || '09:00', emphasis: initial.emphasis, date: initial.date };
    const gid = defaultGroupId || (GROUPS[0] && GROUPS[0].id) || null;
    const grp = GROUPS.find(g => g.id === gid);
    const lvl = (grp && grp.level) || 'pre-a1'; const mods = MODULE_CATALOG[lvl] || [];
    return { level: lvl, groupId: gid, moduleId: mods[0] ? mods[0].id : null, themeGroup: '', lengthMin: 100, sessionLabel: 'Sesión 1', startTime: '09:00', emphasis: 'Vocabulario · Story/Diálogo · Gramática', date };
  });
  const [plan, setPlan] = React.useState(initial || null);
  const mods = MODULE_CATALOG[cfg.level] || [];
  const mod = mods.find(m => m.id === cfg.moduleId) || mods[0];
  const themes = mod ? Array.from(new Set((mod.activities || []).filter(a => a.group).map(a => a.group))) : [];
  const generate = () => setPlan(buildClassPlan({ ...cfg, date }, MODULE_CATALOG));

  const upd = (id, patch) => setPlan(p => ({ ...p, blocks: p.blocks.map(b => b.id === id ? { ...b, ...patch } : b) }));
  const move = (id, dir) => setPlan(p => { const i = p.blocks.findIndex(b => b.id === id); const j = i + dir; if (i < 0 || j < 0 || j >= p.blocks.length) return p; const bl = p.blocks.slice(); const t = bl[i]; bl[i] = bl[j]; bl[j] = t; return { ...p, blocks: bl }; });
  const delBlock = (id) => setPlan(p => ({ ...p, blocks: p.blocks.filter(b => b.id !== id) }));
  const addBlock = () => setPlan(p => ({ ...p, blocks: [...p.blocks, { id: 'b_' + Math.random().toString(36).slice(2, 7), emoji: '•', title: 'Nuevo bloque', mins: 10, steps: [] }] }));
  const updStep = (bid, si, val) => setPlan(p => ({ ...p, blocks: p.blocks.map(b => b.id === bid ? { ...b, steps: b.steps.map((s, k) => k === si ? val : s) } : b) }));
  const addStep = (bid) => setPlan(p => ({ ...p, blocks: p.blocks.map(b => b.id === bid ? { ...b, steps: [...b.steps, 'Nuevo paso'] } : b) }));
  const delStep = (bid, si) => setPlan(p => ({ ...p, blocks: p.blocks.map(b => b.id === bid ? { ...b, steps: b.steps.filter((_, k) => k !== si) } : b) }));
  const totalMin = plan ? plan.blocks.reduce((a, b) => a + (Number(b.mins) || 0), 0) : 0;

  const mats = plan ? (plan.materials || []) : [];
  const matOn = (a) => mats.some(m => m.activityId === a.id && m.moduleId === mod.id);
  const toggleMat = (a) => setPlan(p => { const has = (p.materials || []).some(m => m.activityId === a.id && m.moduleId === mod.id);
    return { ...p, materials: has ? p.materials.filter(m => !(m.activityId === a.id && m.moduleId === mod.id)) : [...(p.materials || []), { moduleId: mod.id, activityId: a.id, name: a.name, type: a.type, group: a.group || null, url: a.url || null, ...(a.type === 'quizlet' ? { quizLinks: { vocabulario: a.quizVocabulario || '', traducir: a.quizTraducir || '', ordenar: a.quizOrdenar || '' } } : {}) }] }; });
  const matObj = (a) => mats.find(m => m.activityId === a.id && m.moduleId === mod.id);
  const updateMat = (a, patch) => setPlan(p => ({ ...p, materials: (p.materials || []).map(m => (m.activityId === a.id && m.moduleId === mod.id) ? { ...m, ...patch } : m) }));

  const save = (asTemplate) => {
    if (!plan) return;
    const rec = { ...plan, groupId: cfg.groupId, date: cfg.date || date, sessionLabel: cfg.sessionLabel, startTime: cfg.startTime, lengthMin: totalMin, id: initial ? initial.id : undefined };
    if (asTemplate) { const tpls = loadLS(PLAN_TPL_KEY); tpls.unshift({ ...rec, id: 'tpl_' + Date.now(), isTemplate: true }); saveLS(PLAN_TPL_KEY, tpls); alert('✅ Guardado como plantilla reutilizable'); return; }
    TT.upsertClassPlan(rec); alert('✅ Plan de clase guardado en el calendario'); onSaved();
  };
  const printPlan = () => printClassPlan(plan, cfg, totalMin);

  return (
    <>
      <div className="scard">
        <div className="sec-head"><div className="sec-title">📘 Plan de clase · {fmtDateLong(cfg.date || date)}</div></div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))', gap:14, marginTop:6}}>
          <Field label="Fecha"><input type="date" value={cfg.date || date} onChange={e => setCfg(c => ({ ...c, date: e.target.value }))} style={selStyle} /></Field>
          <Field label="Grupo"><select value={cfg.groupId || ''} onChange={e => { const g = GROUPS.find(x => x.id === e.target.value); const lvl = g ? g.level : cfg.level; const m = (MODULE_CATALOG[lvl] || [])[0]; setCfg(c => ({ ...c, groupId: e.target.value, level: lvl, moduleId: m ? m.id : c.moduleId, themeGroup: '' })); }} style={selStyle}>{GROUPS.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>
          <Field label="Nivel"><select value={cfg.level} onChange={e => { const lvl = e.target.value; const m = (MODULE_CATALOG[lvl] || [])[0]; setCfg(c => ({ ...c, level: lvl, moduleId: m ? m.id : null, themeGroup: '' })); }} style={selStyle}>{Object.keys(MODULE_CATALOG).map(lv => <option key={lv} value={lv}>{lv.toUpperCase()}</option>)}</select></Field>
          <Field label="Módulo"><select value={cfg.moduleId || ''} onChange={e => setCfg(c => ({ ...c, moduleId: e.target.value, themeGroup: '' }))} style={selStyle}>{mods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
          <Field label="Tema / foco (opcional)"><select value={cfg.themeGroup} onChange={e => setCfg(c => ({ ...c, themeGroup: e.target.value }))} style={selStyle}><option value="">— Todo el módulo —</option>{themes.map(t => <option key={t} value={t}>{t}</option>)}</select></Field>
          <Field label="Sesión"><input value={cfg.sessionLabel} onChange={e => setCfg(c => ({ ...c, sessionLabel: e.target.value }))} style={selStyle} /></Field>
          <Field label="Duración (min)"><input type="number" min="40" max="180" step="5" value={cfg.lengthMin} onChange={e => setCfg(c => ({ ...c, lengthMin: Number(e.target.value) }))} style={selStyle} /></Field>
          <Field label="Hora de inicio"><input type="time" value={cfg.startTime} onChange={e => setCfg(c => ({ ...c, startTime: e.target.value }))} style={selStyle} /></Field>
        </div>
        <div style={{display:'flex', gap:10, marginTop:16, flexWrap:'wrap'}}>
          <button onClick={generate} style={{...btnPrimary, background:'linear-gradient(135deg,#3F5BB8,#0D1B5A)'}}>⚡ {plan ? 'Regenerar' : 'Generar plan'}</button>
          <button onClick={onCancel} style={btnGhost}>Cancelar</button>
        </div>
      </div>

      {plan && (
        <div className="scard" style={{marginTop:18}}>
          <div style={{display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:6}}>
            <div className="sec-title" style={{flex:1}}>📋 {plan.moduleName} · {cfg.sessionLabel}</div>
            <span style={{fontSize:12, fontWeight:800, padding:'5px 11px', borderRadius:20, background: totalMin === cfg.lengthMin ? '#E8F5E9' : '#FFF3E0', color: totalMin === cfg.lengthMin ? '#2E7D32' : '#9C5D00'}}>⏱️ {totalMin} / {cfg.lengthMin} min</span>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:10, marginTop:8}}>
            {withClock(plan.blocks, cfg.startTime).map((b, i) => (
              <div key={b.id} style={{border:'1px solid #E3DCC9', borderRadius:12, padding:'12px 13px', background:'#FCFAF4'}}>
                <div style={{display:'flex', alignItems:'center', gap:9, flexWrap:'wrap'}}>
                  <span style={{fontSize:12, fontWeight:800, color:'#1F3A8A', whiteSpace:'nowrap'}}>{b.from}–{b.to}</span>
                  <input value={b.emoji} onChange={e => upd(b.id, { emoji: e.target.value })} style={{width:34, textAlign:'center', border:'1px solid #E3DCC9', borderRadius:8, padding:'5px 2px', fontSize:14}} />
                  <input value={b.title} onChange={e => upd(b.id, { title: e.target.value })} style={{flex:1, minWidth:120, border:'1px solid #E3DCC9', borderRadius:8, padding:'6px 9px', fontWeight:700, fontSize:13.5}} />
                  <input type="number" min="5" step="5" value={b.mins} onChange={e => upd(b.id, { mins: Number(e.target.value) })} style={{width:58, border:'1px solid #E3DCC9', borderRadius:8, padding:'6px 7px', fontWeight:700, fontSize:13}} />
                  <span style={{fontSize:11, color:'#999', fontWeight:700}}>min</span>
                  <span style={{display:'inline-flex', gap:3}}>
                    <button onClick={() => move(b.id, -1)} disabled={i === 0} style={iconBtn}>↑</button>
                    <button onClick={() => move(b.id, 1)} disabled={i === plan.blocks.length - 1} style={iconBtn}>↓</button>
                    <button onClick={() => delBlock(b.id)} style={{...iconBtn, color:'#C0392B'}}>×</button>
                  </span>
                </div>
                <div style={{marginTop:8, paddingLeft:6, display:'flex', flexDirection:'column', gap:5}}>
                  {b.steps.map((s, si) => (
                    <div key={si} style={{display:'flex', alignItems:'center', gap:7}}>
                      <span style={{color:'#B0A88F', fontSize:12}}>•</span>
                      <input value={s} onChange={e => updStep(b.id, si, e.target.value)} style={{flex:1, border:'1px solid #EFE8D6', borderRadius:7, padding:'5px 8px', fontSize:12.5, color:'#555'}} />
                      <button onClick={() => delStep(b.id, si)} style={{...iconBtn, width:24, height:24, color:'#C0392B'}}>×</button>
                    </div>
                  ))}
                  <button onClick={() => addStep(b.id)} style={{alignSelf:'flex-start', border:'1px dashed #cdb86a', background:'none', color:'#8a7320', borderRadius:8, padding:'4px 10px', fontSize:11.5, fontWeight:700, cursor:'pointer', marginTop:2}}>+ paso</button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={addBlock} style={{marginTop:12, border:'1.5px dashed #9FB0DA', background:'none', color:'#3F5BB8', borderRadius:10, padding:'9px 14px', fontWeight:800, fontSize:13, cursor:'pointer', width:'100%'}}>+ Agregar bloque</button>

          <div style={{marginTop:18, borderTop:'1px dashed #E3DCC9', paddingTop:14}}>
            <div className="sec-title" style={{marginBottom:4}}>📎 Materiales para esta clase</div>
            <div style={{fontSize:12, color:'#8a7f6a', fontWeight:700, marginBottom:10}}>En el orden de tu secuencia (vocabulario → story → gramática…). Márcalos; en clase los abres con un clic (pestaña nueva) y se registran solos en tu bitácora.</div>
            <div style={{display:'flex', flexDirection:'column', gap:7}}>
              {(mod ? mod.activities.slice().sort((x, y) => matRank(x.type) - matRank(y.type)) : []).map(a => {
                const on = matOn(a); const mo = matObj(a) || {};
                return (
                  <div key={a.id} style={{border:'1px solid ' + (on ? '#9FB0DA' : '#E3DCC9'), background: on ? '#EEF2FC' : '#fff', borderRadius:10, overflow:'hidden'}}>
                    <div style={{display:'flex', alignItems:'center', gap:10, padding:'8px 11px'}}>
                      <button onClick={() => toggleMat(a)} style={{width:20, height:20, flexShrink:0, borderRadius:6, border:'2px solid ' + (on ? '#3F5BB8' : '#cdc4ad'), background: on ? '#3F5BB8' : '#fff', color:'#fff', fontSize:13, fontWeight:900, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center'}}>{on ? '✓' : ''}</button>
                      <span style={{fontSize:15}}>{typeIcon(a.type)}</span>
                      <span style={{flex:1, fontWeight:700, fontSize:13}}>{a.name}{a.group ? <span style={{display:'block', fontSize:11, color:'#8a7f6a', fontWeight:700}}>{a.group}</span> : null}</span>
                      {a.url
                        ? <button onClick={() => window.open(matLink({ moduleId: mod.id, activityId: a.id }, MODULE_CATALOG, cfg.groupId), '_blank')} style={{...btnGhost, padding:'5px 11px', fontSize:12}}>Abrir ▸</button>
                        : <span style={{fontSize:10.5, fontWeight:800, color:'#9C5D00', background:'#FFF3E0', borderRadius:20, padding:'2px 8px'}}>sin archivo</span>}
                    </div>
                    {a.type === 'quizlet' && on && (
                      <div style={{padding:'4px 11px 10px 40px', display:'flex', flexDirection:'column', gap:6, borderTop:'1px dashed #C9D6F5'}}>
                        <div style={{fontSize:11, fontWeight:800, color:'#6C4FB0'}}>Pega los 3 links de Quizlet (los que uses):</div>
                        {['vocabulario', 'traducir', 'ordenar'].map(k => (
                          <div key={k} style={{display:'flex', alignItems:'center', gap:7}}>
                            <span style={{fontSize:11, fontWeight:800, color:'#8a7f6a', minWidth:78, textTransform:'capitalize'}}>{k}</span>
                            <input value={(mo.quizLinks || {})[k] || ''} onChange={e => updateMat(a, { quizLinks: { ...(mo.quizLinks || {}), [k]: e.target.value } })} placeholder="https://quizlet.com/…" style={{flex:1, border:'1px solid #D9CEEC', borderRadius:7, padding:'5px 8px', fontSize:11.5}} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{display:'flex', gap:10, flexWrap:'wrap', marginTop:16}}>
            <button onClick={() => save(false)} style={btnPrimary}>💾 Guardar en el calendario</button>
            <button onClick={() => { if (onClassMode) onClassMode({ ...plan, groupId: cfg.groupId, startTime: cfg.startTime, sessionLabel: cfg.sessionLabel, date: cfg.date || date }); }} style={{...btnGhost, borderColor:'#9FB0DA', color:'#3F5BB8'}}>▶ Modo clase</button>
            <button onClick={() => save(true)} style={btnGhost}>⭐ Plantilla</button>
            <button onClick={printPlan} style={btnGhost}>🖨️ Imprimir / PDF</button>
          </div>
        </div>
      )}
    </>
  );
}

/* ════════ Editor de SET DE PRÁCTICA ════════ */
function PracticePlanEditor({ date, initial, onSaved, onCancel, defaultGroupId }) {
  const { MODULE_CATALOG, GROUPS } = window.JUCUM_DATA;
  const TT = window.JUCUM_TT;
  const g0 = GROUPS.find(g => g.id === defaultGroupId) || GROUPS[0] || {};
  const [groupId, setGroupId] = React.useState(initial ? initial.groupId : (g0.id || null));
  const group = GROUPS.find(x => x.id === groupId) || g0;
  const level = group.level || 'pre-a1';
  const mods = MODULE_CATALOG[level] || [];
  const [moduleId, setModuleId] = React.useState(initial && initial.activities[0] ? initial.activities[0].moduleId : (mods[0] ? mods[0].id : null));
  const mod = mods.find(m => m.id === moduleId) || mods[0];
  const [title, setTitle] = React.useState(initial ? initial.title : 'Práctica de la semana');
  const [picked, setPicked] = React.useState(() => initial ? initial.activities.slice() : []);
  const [dates, setDates] = React.useState(() => initial ? initial.dates.slice() : (date ? [date] : []));
  const [assign, setAssign] = React.useState(initial ? initial.assignToStudents !== false : true);
  const [note, setNote] = React.useState(initial ? initial.note : '');
  const cur = new Date(); const [pcur, setPcur] = React.useState({ y: cur.getFullYear(), m: cur.getMonth() });

  const isPicked = (m, a) => picked.some(p => p.moduleId === m.id && p.activityId === a.id);
  const togglePick = (m, a) => setPicked(arr => isPicked(m, a) ? arr.filter(p => !(p.moduleId === m.id && p.activityId === a.id)) : [...arr, { moduleId: m.id, activityId: a.id, label: a.name, type: a.type, group: a.group || null }]);
  const toggleDate = (dstr) => setDates(arr => arr.includes(dstr) ? arr.filter(x => x !== dstr) : [...arr, dstr].sort());
  const addWeek = (offset) => { const base = parseYMD(date || todayYMD()); const out = new Set(dates); for (let i = 0; i < 7; i++) { const d = new Date(base); d.setDate(base.getDate() + offset * 7 + i); out.add(ymd(d)); } setDates(Array.from(out).sort()); };

  const save = () => {
    if (!picked.length) { alert('Elige al menos una actividad.'); return; }
    if (!dates.length) { alert('Elige al menos un día en el calendario.'); return; }
    const rec = { groupId, title, activities: picked, dates, assignToStudents: assign, note };
    if (initial) { TT.updatePracticePlan(initial.id, rec); alert('✅ Set de práctica actualizado'); }
    else { TT.addPracticePlan(rec); alert(assign ? '✅ Set guardado y asignado a los alumnos en esos días' : '✅ Set guardado (solo para ti)'); }
    onSaved();
  };
  const printSet = () => printPracticeSet({ title, group, level, picked, dates, mod }, MODULE_CATALOG);

  const cells = monthMatrix(pcur.y, pcur.m);
  const prevM = () => setPcur(c => { const d = new Date(c.y, c.m - 1, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const nextM = () => setPcur(c => { const d = new Date(c.y, c.m + 1, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  return (
    <>
      <div className="scard">
        <div className="sec-head"><div className="sec-title">📝 Set de práctica</div></div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:14, marginTop:6}}>
          <Field label="Título"><input value={title} onChange={e => setTitle(e.target.value)} style={selStyle} /></Field>
          <Field label="Grupo"><select value={groupId || ''} onChange={e => { setGroupId(e.target.value); const g = GROUPS.find(x => x.id === e.target.value); const lv = g ? g.level : level; const m = (MODULE_CATALOG[lv] || [])[0]; setModuleId(m ? m.id : null); setPicked([]); }} style={selStyle}>{GROUPS.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>
          <Field label="Módulo"><select value={moduleId || ''} onChange={e => setModuleId(e.target.value)} style={selStyle}>{mods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
        </div>
      </div>

      {/* 1 · Actividades */}
      <div className="scard" style={{marginTop:16}}>
        <div className="sec-head"><div className="sec-title">1 · Elige las actividades</div></div>
        <div style={{display:'flex', flexDirection:'column', gap:7, marginTop:6}}>
          {(mod ? mod.activities : []).map(a => {
            const on = isPicked(mod, a);
            return (
              <button key={a.id} onClick={() => togglePick(mod, a)} style={{display:'flex', alignItems:'center', gap:10, textAlign:'left', cursor:'pointer', border:'1px solid ' + (on ? '#9FB0DA' : '#E3DCC9'), background: on ? '#EEF2FC' : '#fff', borderRadius:10, padding:'9px 12px', font:'inherit'}}>
                <span style={{width:20, height:20, borderRadius:6, border:'2px solid ' + (on ? '#3F5BB8' : '#cdc4ad'), background: on ? '#3F5BB8' : '#fff', color:'#fff', fontSize:13, fontWeight:900, display:'inline-flex', alignItems:'center', justifyContent:'center'}}>{on ? '✓' : ''}</span>
                <span style={{fontSize:15}}>{typeIcon(a.type)}</span>
                <span style={{flex:1, fontWeight:700, fontSize:13}}>{a.name}{a.group ? <span style={{display:'block', fontSize:11, color:'#8a7f6a', fontWeight:700}}>{a.group}</span> : null}</span>
                {!a.url && <span style={{fontSize:10.5, fontWeight:800, color:'#9C5D00', background:'#FFF3E0', borderRadius:20, padding:'2px 8px'}}>sin archivo</span>}
              </button>
            );
          })}
        </div>
        <div style={{marginTop:9, fontSize:12, fontWeight:700, color:'#6b6453'}}>{picked.length} actividad(es) elegida(s)</div>
      </div>

      {/* 2 · Días (multi-fecha) */}
      <div className="scard" style={{marginTop:16}}>
        <div className="sec-head"><div className="sec-title">2 · ¿Qué días aplica?</div></div>
        <div style={{fontSize:12.5, color:'#8a7f6a', fontWeight:700, margin:'2px 0 10px'}}>Toca los días que quieras (viernes, sábado, intercalados, lo que sea). Puedes dejar listas varias semanas.</div>
        <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:10}}>
          <button onClick={prevM} style={navBtn}>‹</button>
          <div style={{flex:1, textAlign:'center', fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:15, textTransform:'capitalize'}}>{MONTHS_ES[pcur.m]} {pcur.y}</div>
          <button onClick={nextM} style={navBtn}>›</button>
        </div>
        <div className="cal-grid">
          {DOW_ES.map(d => <div key={d} className="cal-h">{d}</div>)}
          {cells.map((c, i) => {
            const dstr = ymd(c.date); const on = dates.includes(dstr); const isToday = dstr === todayYMD();
            return (
              <button key={i} onClick={() => toggleDate(dstr)} style={{minHeight:40, border: on ? '2px solid #6C4FB0' : '1px solid #ECE4D2', background: on ? '#6C4FB0' : (c.inMonth ? (isToday ? '#F4EEFB' : '#fff') : '#F7F3E9'), color: on ? '#fff' : '#2b2b2b', borderRadius:9, cursor:'pointer', fontWeight:800, fontSize:13, opacity: c.inMonth ? 1 : 0.45}}>{c.date.getDate()}</button>
            );
          })}
        </div>
        <div style={{display:'flex', gap:8, flexWrap:'wrap', marginTop:10}}>
          <button onClick={() => addWeek(0)} style={chipBtn}>+ Esta semana</button>
          <button onClick={() => addWeek(1)} style={chipBtn}>+ Próxima semana</button>
          <button onClick={() => setDates([])} style={{...chipBtn, color:'#C0392B', borderColor:'#E2B6AE'}}>Limpiar</button>
          <span style={{marginLeft:'auto', fontSize:12, fontWeight:800, color:'#6C4FB0'}}>{dates.length} día(s) seleccionado(s)</span>
        </div>
      </div>

      {/* 3 · Destino */}
      <div className="scard" style={{marginTop:16}}>
        <div className="sec-head"><div className="sec-title">3 · ¿Cómo se usa?</div></div>
        <div style={{display:'flex', flexDirection:'column', gap:9, marginTop:6}}>
          <button onClick={() => setAssign(true)} style={destBtn(assign)}>
            <span style={{fontSize:18}}>👥</span><div><b>Asignar a los alumnos</b><div style={destSub}>Aparece como “Tu práctica de hoy” en su panel, solo en los días elegidos. Actualiza su sección de prácticas.</div></div>
            <span style={radio(assign)}>{assign ? '●' : ''}</span>
          </button>
          <button onClick={() => setAssign(false)} style={destBtn(!assign)}>
            <span style={{fontSize:18}}>🙋</span><div><b>Solo para mí</b><div style={destSub}>No toca a los alumnos. Genera la lista de archivos / PDF para que tú la uses en clase.</div></div>
            <span style={radio(!assign)}>{!assign ? '●' : ''}</span>
          </button>
        </div>
        <Field label="Nota para los alumnos (opcional)" style={{marginTop:12}}><input value={note} onChange={e => setNote(e.target.value)} placeholder="Ej: enfócate en la pronunciación" style={selStyle} /></Field>
        <div style={{display:'flex', gap:10, flexWrap:'wrap', marginTop:16}}>
          <button onClick={save} style={btnPrimary}>💾 Guardar set de práctica</button>
          <button onClick={printSet} style={btnGhost}>🖨️ Archivos / PDF</button>
          <button onClick={onCancel} style={btnGhost}>Cancelar</button>
        </div>
      </div>
    </>
  );
}

/* ════════ Modo clase · plan + materiales siempre a la vista ════════ */
function ClassMode({ plan, onBack }) {
  const { MODULE_CATALOG, STUDENTS, GROUPS } = window.JUCUM_DATA;
  const [rosterOpen, setRosterOpen] = React.useState(false);
  const [quizPick, setQuizPick] = React.useState(null);
  const [nowMs, setNowMs] = React.useState(Date.now());
  const timerKey = 'jucum_classtimer_' + (plan && (plan.id || (plan.date + '_' + plan.startTime)));
  const [timer, setTimer] = React.useState(() => { try { return JSON.parse(localStorage.getItem(timerKey) || 'null'); } catch { return null; } });
  React.useEffect(() => { const id = setInterval(() => setNowMs(Date.now()), 1000); return () => clearInterval(id); }, []);
  if (!plan) return (<main><button className="back-btn" onClick={onBack}>← Volver</button><div className="scard">No hay plan para mostrar.</div></main>);
  const blocks = withClock(plan.blocks || [], plan.startTime);
  const mats = (plan.materials || []).slice().sort((a, b) => matRank(a.type) - matRank(b.type));
  const group = (GROUPS || []).find(g => g.id === plan.groupId);
  const students = (STUDENTS || []).filter(s => s.group === plan.groupId);
  const startTimer = () => { const lengthMin = plan.lengthMin || 60; const t = { endMs: Date.now() + lengthMin * 60000, lengthMin }; try { localStorage.setItem(timerKey, JSON.stringify(t)); } catch {} setTimer(t); };
  const resetTimer = () => { try { localStorage.removeItem(timerKey); } catch {} setTimer(null); };
  const cd = timer ? liveCountdown(timer, nowMs) : null;
  const askTimer = () => { if (!timer) { const go = window.confirm('⏱️ ¿Activar el cronómetro de la clase ahora?\n\nAceptar: inicia el cronómetro y abre el material.\nCancelar: abre el material sin iniciar el cronómetro.'); if (go) startTimer(); } };
  const open = (m) => {
    if (m.type === 'quizlet') { setQuizPick(m); return; }
    askTimer();
    const link = matLink(m, MODULE_CATALOG, plan.groupId); if (link) window.open(link, '_blank'); else alert('Ese material aún no tiene archivo disponible.');
  };
  const openQuiz = (m, key) => {
    const url = (m.quizLinks || {})[key];
    if (!url) { alert('Aún no agregaste el link de “' + key + '”. Edita el plan de clase para pegarlo.'); return; }
    askTimer();
    window.open(url, '_blank'); setQuizPick(null);
  };
  return (
    <main>
      <button className="back-btn" onClick={onBack}>← Salir del modo clase</button>
      <div style={{background:'linear-gradient(135deg,#3F5BB8,#0D1B5A)', color:'#fff', borderRadius:16, padding:'18px 22px', margin:'4px 0 16px', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap'}}>
        <div style={{flex:1, minWidth:200}}>
          <div style={{fontSize:11, fontWeight:800, letterSpacing:'0.07em', textTransform:'uppercase', opacity:0.75}}>▶ Modo clase</div>
          <div style={{fontFamily:"'Fredoka',sans-serif", fontSize:22, fontWeight:600}}>{plan.moduleName} · {plan.sessionLabel}</div>
          <div style={{fontSize:13, opacity:0.9}}>{fmtDateLong(plan.date)} · {plan.lengthMin} min · los materiales abren en pestaña nueva</div>
        </div>
        {timer ? (
          <button onClick={() => { if (window.confirm('¿Reiniciar el cronómetro de la clase?')) resetTimer(); }} title="Clic para reiniciar" style={{background: cd.state === 'after' ? 'rgba(255,120,120,0.18)' : 'rgba(255,255,255,0.14)', border:'1px solid rgba(255,255,255,0.25)', borderRadius:14, padding:'12px 18px', textAlign:'center', minWidth:150, cursor:'pointer', color:'#fff', font:'inherit'}}>
            <div style={{fontSize:10.5, fontWeight:800, letterSpacing:'0.05em', textTransform:'uppercase', opacity:0.85}}>{cd.state === 'after' ? '✅ ' : '⏱️ '}{cd.label}</div>
            <div style={{fontFamily:"'Fredoka',sans-serif", fontSize:34, fontWeight:600, lineHeight:1.1, letterSpacing:'0.01em'}}>{cd.mmss}</div>
            {cd.state === 'during' && (
              <div style={{height:5, background:'rgba(255,255,255,0.22)', borderRadius:4, overflow:'hidden', marginTop:5}}><div style={{height:'100%', width:cd.pct + '%', background: cd.pct > 85 ? '#FF8A65' : '#7BE495', borderRadius:4, transition:'width 1s linear'}}></div></div>
            )}
          </button>
        ) : (
          <button onClick={startTimer} title="Iniciar el cronómetro de la clase" style={{background:'rgba(255,255,255,0.16)', border:'1px solid rgba(255,255,255,0.32)', borderRadius:14, padding:'12px 22px', textAlign:'center', minWidth:150, cursor:'pointer', color:'#fff', font:'inherit'}}>
            <div style={{fontSize:24, lineHeight:1}}>▶</div>
            <div style={{fontFamily:"'Fredoka',sans-serif", fontSize:15, fontWeight:600, marginTop:2}}>Iniciar cronómetro</div>
            <div style={{fontSize:11.5, opacity:0.85}}>{plan.lengthMin} min de clase</div>
          </button>
        )}
      </div>
      <div style={{display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:16, alignItems:'start'}}>
        <div className="scard">
          <div className="sec-title" style={{marginBottom:10}}>🕒 Secuencia de la sesión</div>
          <div style={{display:'flex', flexDirection:'column', gap:9}}>
            {blocks.map(b => (
              <div key={b.id} style={{border:'1px solid #E3DCC9', borderRadius:11, padding:'10px 12px', background:'#FCFAF4'}}>
                <div style={{display:'flex', alignItems:'center', gap:9}}>
                  <span style={{fontSize:12, fontWeight:800, color:'#1F3A8A', whiteSpace:'nowrap'}}>{b.from}–{b.to}</span>
                  <span style={{fontSize:15}}>{b.emoji}</span>
                  <span style={{fontWeight:800, fontSize:14, flex:1}}>{b.title}</span>
                  <span style={{fontSize:11, color:'#999', fontWeight:700}}>{b.mins}′</span>
                </div>
                {b.steps && b.steps.length > 0 && (
                  <ul style={{margin:'7px 0 0', paddingLeft:20, color:'#666', fontSize:12.5, lineHeight:1.5}}>{b.steps.map((s, i) => <li key={i}>{s}</li>)}</ul>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="scard" style={{position:'sticky', top:14}}>
          <div className="sec-title" style={{marginBottom:4}}>📎 Materiales</div>
          <div style={{fontSize:11.5, color:'#8a7f6a', fontWeight:700, marginBottom:10}}>Toca para abrir en clase. Se registra solo en tu bitácora.</div>
          {mats.length === 0 ? <div style={{fontSize:12.5, color:'#999', fontWeight:700}}>No marcaste materiales en este plan.</div>
            : <div style={{display:'flex', flexDirection:'column', gap:8}}>
                {mats.map((m, i) => (
                  <button key={i} onClick={() => open(m)} style={{display:'flex', alignItems:'center', gap:10, textAlign:'left', cursor:'pointer', border:'1px solid #C9D6F5', background:'#EEF2FC', borderRadius:11, padding:'10px 12px', font:'inherit', width:'100%'}}>
                    <span style={{fontSize:17}}>{typeIcon(m.type)}</span>
                    <span style={{flex:1, fontWeight:800, fontSize:13}}>{m.name}{m.type === 'quizlet' ? <span style={{display:'block', fontSize:11, color:'#6C4FB0', fontWeight:800}}>🎮 Elige: Vocabulario · Traducir · Ordenar</span> : m.group ? <span style={{display:'block', fontSize:11, color:'#8a7f6a', fontWeight:700}}>{m.group}</span> : null}</span>
                    <span style={{color:'#3F5BB8', fontWeight:900}}>▸</span>
                  </button>
                ))}
              </div>}
        </div>
      </div>

      {/* Selector de juego de Quizlet (3 links independientes) */}
      {quizPick && (
        <div onClick={() => setQuizPick(null)} style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.42)', zIndex:70, display:'flex', alignItems:'center', justifyContent:'center', padding:20}}>
          <div onClick={e => e.stopPropagation()} style={{background:'#fff', borderRadius:18, padding:'22px 24px', maxWidth:380, width:'100%', boxShadow:'0 18px 50px rgba(0,0,0,0.3)'}}>
            <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:18}}>🗂️ Quizlet · elige el juego</div>
            <div style={{fontSize:12.5, color:'#8a7f6a', margin:'2px 0 16px', fontWeight:700}}>{quizPick.name}</div>
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
              {[['vocabulario', '📚', 'Vocabulario'], ['traducir', '🔁', 'Traducir'], ['ordenar', '🔢', 'Ordenar']].map(([k, ico, label]) => {
                const url = (quizPick.quizLinks || {})[k];
                return (
                  <button key={k} onClick={() => openQuiz(quizPick, k)} style={{display:'flex', alignItems:'center', gap:12, textAlign:'left', cursor: url ? 'pointer' : 'not-allowed', border:'1.5px solid ' + (url ? '#6C4FB0' : '#E3DCC9'), background: url ? '#F4EEFB' : '#F7F5EF', borderRadius:12, padding:'13px 15px', font:'inherit', width:'100%', opacity: url ? 1 : 0.6}}>
                    <span style={{fontSize:22}}>{ico}</span>
                    <span style={{flex:1, fontWeight:800, fontSize:14, color:'#3a2e5c'}}>{label}{!url && <span style={{display:'block', fontSize:11, color:'#9C5D00', fontWeight:700}}>sin link — pégalo en el plan</span>}</span>
                    {url && <span style={{color:'#6C4FB0', fontWeight:900, fontSize:16}}>▸</span>}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setQuizPick(null)} style={{...btnGhost, marginTop:14, width:'100%'}}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Botón flotante · lista de alumnos del grupo */}
      <button onClick={() => setRosterOpen(o => !o)} title="Alumnos del grupo" style={{position:'fixed', right:22, bottom:22, zIndex:60, width:60, height:60, borderRadius:'50%', border:'none', cursor:'pointer', background: rosterOpen ? '#7a5a12' : 'linear-gradient(135deg,#FFC24B,#F2820D)', color:'#fff', fontSize:25, boxShadow:'0 6px 20px rgba(214,120,13,0.45)', display:'flex', alignItems:'center', justifyContent:'center'}}><span style={{filter:'drop-shadow(0 1px 1px rgba(0,0,0,0.35))'}}>{rosterOpen ? '✕' : '👥'}</span></button>
      {rosterOpen && <RosterPanel students={students} group={group} planDate={plan.date} onClose={() => setRosterOpen(false)} />}
    </main>
  );
}

function RosterPanel({ students, group, planDate, onClose }) {
  const D = window.JUCUM_DATA; const TT = window.JUCUM_TT; const A = window.JUCUM_ATT;
  const date = planDate || (A ? A.todayStr() : new Date().toISOString().slice(0, 10));
  const [noteFor, setNoteFor] = React.useState(null);
  const [txt, setTxt] = React.useState('');
  const [savedFor, setSavedFor] = React.useState(null);
  const [, force] = React.useState(0);
  const STATUS = [ { k:'asistio', label:'P', title:'Presente', on:'#2E7D32' }, { k:'tarde', label:'T', title:'Tarde', on:'#F2820D' }, { k:'falto', label:'A', title:'Ausente', on:'#C0392B' } ];
  const cur = (sid) => { const r = A && A.getStudentRecord(date, sid); return r ? r.status : null; };
  const mark = (s, st) => { if (A) A.setAttendance(date, s.group, s.id, st, (A.getStudentRecord(date, s.id) || {}).participation || 0); force(n => n + 1); };
  const saveNote = (s) => { if (txt.trim() && TT && TT.addNote) { TT.addNote({ studentId: s.id, groupId: s.group, text: txt.trim(), tag: 'clase' }); setSavedFor(s.id); setTimeout(() => setSavedFor(null), 1500); } setNoteFor(null); setTxt(''); };
  const present = students.filter(s => { const c = cur(s.id); return c === 'asistio' || c === 'tarde'; }).length;
  const marked = students.filter(s => cur(s.id)).length;
  return (
    <div style={{position:'fixed', right:22, bottom:92, zIndex:60, width:342, maxWidth:'calc(100vw - 44px)', maxHeight:'74vh', display:'flex', flexDirection:'column', background:'#fff', border:'1px solid #E3DCC9', borderRadius:16, boxShadow:'0 12px 36px rgba(0,0,0,0.2)', overflow:'hidden'}}>
      <div style={{display:'flex', alignItems:'center', gap:9, padding:'12px 15px', background:'linear-gradient(135deg,#F2820D,#D9690A)', color:'#fff'}}>
        <span style={{fontSize:18}}>👥</span>
        <div style={{flex:1, minWidth:0}}><div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:15}}>Mis alumnos</div><div style={{fontSize:11.5, opacity:0.9}}>{group ? group.name : 'Grupo'} · {present}/{students.length} presentes</div></div>
        <button onClick={onClose} style={{border:'none', background:'rgba(255,255,255,0.22)', color:'#fff', width:26, height:26, borderRadius:8, cursor:'pointer', fontSize:15, fontWeight:800}}>×</button>
      </div>
      <div style={{padding:'7px 14px', background:'#FFF7EC', borderBottom:'1px solid #F2E6CF', fontSize:11.5, fontWeight:800, color:'#8a6a1f'}}>📝 Asistencia del {fmtDateShort(date)} · {marked}/{students.length} marcados</div>
      <div style={{overflowY:'auto', padding:'8px 10px'}}>
        {students.length === 0 ? <div style={{padding:'18px 8px', textAlign:'center', color:'#999', fontSize:12.5, fontWeight:700}}>No hay alumnos en este grupo todavía.</div>
          : students.map(s => {
            const initials = (s.fullName || s.username || '?').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();
            const st = cur(s.id);
            return (
              <div key={s.id} style={{borderBottom:'1px solid #F2ECDD', padding:'8px 4px'}}>
                <div style={{display:'flex', alignItems:'center', gap:9}}>
                  <span style={{width:30, height:30, borderRadius:'50%', background:'#FCEFD8', color:'#C77B12', fontWeight:800, fontSize:11.5, display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>{initials}</span>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontWeight:800, fontSize:12.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{s.fullName || s.username}</div>
                  </div>
                  <span style={{display:'inline-flex', gap:3}}>
                    {STATUS.map(o => (
                      <button key={o.k} onClick={() => mark(s, o.k)} title={o.title} style={{width:26, height:26, borderRadius:7, border:'1.5px solid ' + (st === o.k ? o.on : '#E3DCC9'), background: st === o.k ? o.on : '#fff', color: st === o.k ? '#fff' : '#9a9a9a', fontWeight:900, fontSize:12, cursor:'pointer'}}>{o.label}</button>
                    ))}
                  </span>
                  <button onClick={() => { setNoteFor(noteFor === s.id ? null : s.id); setTxt(''); }} title="Anotar" style={{border:'1px solid #E3DCC9', background:'#fff', borderRadius:8, padding:'4px 8px', fontSize:12, fontWeight:800, color:'#6b5a1f', cursor:'pointer'}}>{savedFor === s.id ? '✓' : '✎'}</button>
                </div>
                {noteFor === s.id && (
                  <div style={{display:'flex', gap:6, marginTop:7}}>
                    <input autoFocus value={txt} onChange={e => setTxt(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveNote(s); }} placeholder="Nota rápida de clase…" style={{flex:1, border:'1px solid #E3DCC9', borderRadius:8, padding:'6px 9px', fontSize:12.5}} />
                    <button onClick={() => saveNote(s)} style={{...btnPrimary, padding:'6px 11px', fontSize:12}}>Guardar</button>
                  </div>
                )}
              </div>
            );
          })}
      </div>
      <div style={{padding:'7px 14px', borderTop:'1px solid #F2ECDD', fontSize:10.5, color:'#A8A8A8', fontWeight:700, textAlign:'center', display:'flex', justifyContent:'center', gap:11}}>
        <span><b style={{color:'#2E7D32'}}>P</b> presente</span><span><b style={{color:'#F2820D'}}>T</b> tarde</span><span><b style={{color:'#C0392B'}}>A</b> ausente</span><span>· ✎ nota</span>
      </div>
    </div>
  );
}

function computeCountdown(plan, nowMs) {
  if (!plan || !plan.date || !plan.startTime) return null;
  const [h, m] = String(plan.startTime).split(':').map(Number);
  const start = parseYMD(plan.date); start.setHours(h || 0, m || 0, 0, 0);
  const end = new Date(start.getTime() + (plan.lengthMin || 0) * 60000);
  const now = new Date(nowMs);
  if (now < start) return { state:'before', label:'Empieza en', mmss: fmtMMSS(Math.round((start - now) / 1000)), pct:0 };
  if (now >= end) return { state:'after', label:'Clase terminada', mmss:'00:00', pct:100 };
  const remain = Math.round((end - now) / 1000); const total = (plan.lengthMin || 1) * 60;
  return { state:'during', label:'Tiempo restante', mmss: fmtMMSS(remain), pct: Math.round((1 - remain / total) * 100) };
}
function fmtMMSS(s) { s = Math.max(0, s); const m = Math.floor(s / 60), ss = s % 60; if (m >= 60) { const h = Math.floor(m / 60); return h + 'h ' + String(m % 60).padStart(2, '0') + 'm'; } return String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0'); }
function liveCountdown(timer, nowMs) {
  const remain = Math.round((timer.endMs - nowMs) / 1000);
  const total = (timer.lengthMin || 1) * 60;
  if (remain <= 0) return { state:'after', label:'Clase terminada', mmss:'00:00', pct:100 };
  return { state:'during', label:'Tiempo restante', mmss: fmtMMSS(remain), pct: Math.round((1 - remain / total) * 100) };
}
const MAT_RANK = { quizlet:0, story:1, reading:2, listening:3, summary:4, grammar:5 };
function matRank(type) { return MAT_RANK[type] != null ? MAT_RANK[type] : 9; }
function QuizChips({ label, value, options, onPick }) {
  return (
    <div style={{display:'flex', alignItems:'center', gap:7, flexWrap:'wrap'}}>
      <span style={{fontSize:11, fontWeight:800, color:'#6C4FB0', minWidth:42}}>{label}</span>
      {options.map(o => (
        <button key={o} onClick={() => onPick(o)} style={{border:'1.5px solid ' + (value === o ? '#6C4FB0' : '#D9CEEC'), background: value === o ? '#6C4FB0' : '#fff', color: value === o ? '#fff' : '#6b6453', borderRadius:16, padding:'3px 11px', fontSize:11.5, fontWeight:800, cursor:'pointer'}}>{o}</button>
      ))}
    </div>
  );
}
function SavedItems({ onOpenClass, onOpenPractice, onChange, refreshKey }) {
  const TT = window.JUCUM_TT;
  const classPlans = TT.getClassPlans();
  const practicePlans = TT.getPracticePlans();
  const templates = loadLS(PLAN_TPL_KEY);
  const Row = ({ icon, title, sub, onOpen, onDel }) => (
    <div style={{display:'flex', alignItems:'center', gap:11, border:'1px solid #E3DCC9', borderRadius:11, padding:'10px 13px', background:'#FCFAF4', marginBottom:8}}>
      <span style={{fontSize:19}}>{icon}</span>
      <div style={{flex:1, minWidth:0}}><div style={{fontWeight:800, fontSize:13.5}}>{title}</div><div style={{fontSize:11.5, color:'#8a7f6a', fontWeight:700}}>{sub}</div></div>
      <button onClick={onOpen} style={{...btnGhost, padding:'6px 12px', fontSize:12.5}}>Abrir</button>
      {onDel && <button onClick={onDel} style={{...iconBtn, color:'#C0392B'}}>×</button>}
    </div>
  );
  return (
    <>
      <div className="scard" style={{marginBottom:16}}>
        <div className="sec-head"><div className="sec-title">📘 Planes de clase</div></div>
        {classPlans.length === 0 ? <div className="empty-state" style={{padding:'16px 0'}}><div className="icon">📭</div>Sin planes de clase aún.</div>
          : classPlans.map(p => <Row key={p.id} icon="📘" title={`${p.moduleName} · ${p.sessionLabel}`} sub={`${p.date || 's/fecha'} · ${p.lengthMin} min`} onOpen={() => onOpenClass(p)} onDel={() => { TT.deleteClassPlan(p.id); onChange(); }} />)}
      </div>
      <div className="scard" style={{marginBottom:16}}>
        <div className="sec-head"><div className="sec-title">📝 Sets de práctica</div></div>
        {practicePlans.length === 0 ? <div className="empty-state" style={{padding:'16px 0'}}><div className="icon">📭</div>Sin sets de práctica aún.</div>
          : practicePlans.map(p => <Row key={p.id} icon="📝" title={p.title} sub={`${(p.activities || []).length} act. · ${(p.dates || []).length} día(s) · ${p.assignToStudents !== false ? '👥 alumnos' : '🙋 solo tú'}`} onOpen={() => onOpenPractice(p)} onDel={() => { TT.deletePracticePlan(p.id); onChange(); }} />)}
      </div>
      <div className="scard">
        <div className="sec-head"><div className="sec-title">⭐ Plantillas de clase</div></div>
        {templates.length === 0 ? <div className="empty-state" style={{padding:'16px 0'}}><div className="icon">📭</div>Guarda un plan como plantilla para reutilizarlo.</div>
          : templates.map(p => <Row key={p.id} icon="⭐" title={`${p.moduleName} · ${p.sessionLabel}`} sub={`Plantilla · ${p.lengthMin} min`} onOpen={() => onOpenClass({ ...p, id: undefined })} onDel={() => { saveLS(PLAN_TPL_KEY, loadLS(PLAN_TPL_KEY).filter(x => x.id !== p.id)); onChange(); }} />)}
      </div>
    </>
  );
}

/* ════════ Impresión ════════ */
function printClassPlan(plan, cfg, totalMin) {
  if (!plan) return;
  const rows = withClock(plan.blocks, cfg.startTime).map(b => `<tr><td class="t">${b.from}–${b.to}</td><td class="m">${b.mins}'</td><td><div class="bt">${b.emoji} ${esc(b.title)}</div>${b.steps.length ? '<ul>' + b.steps.map(s => '<li>' + esc(s) + '</li>').join('') + '</ul>' : ''}</td></tr>`).join('');
  openPrint(`Plan de clase · ${esc(plan.moduleName)}`, `
    <h1>Plan de clase · ${esc(plan.moduleName)}</h1>
    <div class="meta">${plan.level.toUpperCase()} · ${esc(cfg.sessionLabel)} · ${cfg.date || ''}</div>
    <div class="chips"><span class="chip">⏱️ ${totalMin} min</span><span class="chip">🎯 ${esc(plan.emphasis)}</span>${plan.themeGroup ? '<span class="chip">📚 ' + esc(plan.themeGroup) + '</span>' : ''}</div>
    <table><tbody>${rows}</tbody></table>`);
}
function printPracticeSet(s, catalog) {
  const mod = s.mod;
  const rows = s.picked.map(a => {
    const full = (mod && (mod.activities || []).find(x => x.id === a.activityId)) || a;
    const link = full.url ? `<div class="lk">${full.url}</div>` : '<div class="lk muted">— material aún no disponible —</div>';
    return `<tr><td><div class="bt">${typeIconTxt(a.type)} ${esc(a.label)}</div>${a.group ? '<div class="sub">' + esc(a.group) + '</div>' : ''}${link}</td></tr>`;
  }).join('');
  const dl = s.dates.map(d => fmtDateShort(d)).join(' · ');
  openPrint(`Set de práctica · ${esc(s.title)}`, `
    <h1>📝 ${esc(s.title)}</h1>
    <div class="meta">${(s.group.name || '')} · ${s.level.toUpperCase()}</div>
    <div class="chips"><span class="chip">📅 ${dl || 'sin fechas'}</span><span class="chip">${s.picked.length} actividad(es)</span></div>
    <table><tbody>${rows}</tbody></table>`);
}
function openPrint(title, body) {
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${title}</title><style>
    *{box-sizing:border-box;} body{font-family:'Segoe UI',system-ui,sans-serif;color:#2b2b2b;margin:0;padding:32px 38px;}
    h1{font-size:22px;margin:0 0 2px;} .meta{color:#666;font-size:13px;margin-bottom:4px;}
    .chips{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 18px;} .chip{background:#F0EAD9;border:1px solid #E3DCC9;border-radius:20px;padding:5px 12px;font-size:12px;font-weight:700;color:#6b5a2f;}
    table{width:100%;border-collapse:collapse;} td{border-bottom:1px solid #eee;padding:11px 8px;vertical-align:top;font-size:13.5px;}
    td.t{white-space:nowrap;font-weight:700;color:#1F3A8A;width:96px;} td.m{white-space:nowrap;color:#999;width:42px;font-weight:700;}
    .bt{font-weight:800;font-size:14px;margin-bottom:3px;} .sub{color:#888;font-size:12px;margin-bottom:3px;} ul{margin:4px 0 0;padding-left:18px;color:#555;} li{margin:2px 0;}
    .lk{font-size:11px;color:#1565C0;word-break:break-all;} .lk.muted{color:#aaa;} @media print{body{padding:12px;}}
  </style></head><body>${body}<div style="margin-top:22px;color:#aaa;font-size:11px;border-top:1px solid #eee;padding-top:10px;">JUCUM English Center · planificador</div>
  <script>window.onload=function(){setTimeout(function(){window.print();},250);}<\/script></body></html>`);
  w.document.close();
}

/* ════════ Helpers UI / estilo ════════ */
const PLAN_TPL_KEY = 'jucum_plan_templates_v1';
function loadLS(k) { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } }
function saveLS(k, a) { try { localStorage.setItem(k, JSON.stringify(a)); } catch {} }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }
function fmtDateLong(s) { if (!s) return ''; const d = parseYMD(s); return `${DOW_ES[d.getDay()]} ${d.getDate()} de ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`; }
function fmtDateShort(s) { const d = parseYMD(s); return `${d.getDate()}/${d.getMonth() + 1}`; }
function typeIcon(t) { return ({ story:'📖', reading:'📕', listening:'🎧', grammar:'✍️', summary:'🧠', quizlet:'🗂️' })[t] || '•'; }
function typeIconTxt(t) { return typeIcon(t); }
/* Link directo a un material en MODO PROFESOR (abre sin restricción y registra
 * el uso de clase → alimenta la bitácora automática). */
function matLink(m, catalog, groupId) {
  let modObj = null, act = null;
  for (const lv of Object.keys(catalog)) { const mm = (catalog[lv] || []).find(x => x.id === m.moduleId); if (mm) { modObj = mm; act = (mm.activities || []).find(a => a.id === m.activityId); break; } }
  if (!act) return null;
  return (window.JUCUM_TT && window.JUCUM_TT.teacherMaterialLink) ? window.JUCUM_TT.teacherMaterialLink(act, modObj, groupId) : (act.url || null);
}

const selStyle = { width:'100%', border:'1px solid #E3DCC9', borderRadius:9, padding:'8px 10px', fontSize:13, fontFamily:'inherit', fontWeight:600, background:'#fff' };
const iconBtn = { width:28, height:28, border:'1px solid #E3DCC9', background:'#fff', borderRadius:7, cursor:'pointer', fontWeight:800, fontSize:13, color:'#666', display:'inline-flex', alignItems:'center', justifyContent:'center' };
const navBtn = { width:34, height:34, border:'1px solid #E3DCC9', background:'#fff', borderRadius:9, cursor:'pointer', fontWeight:900, fontSize:18, color:'#3F5BB8' };
const chipBtn = { border:'1.5px solid #cdb86a', background:'#fff', color:'#6b5a1f', borderRadius:20, padding:'6px 13px', fontWeight:800, fontSize:12, cursor:'pointer' };
const btnPrimary = { border:'none', cursor:'pointer', fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:14, color:'#fff', background:'linear-gradient(135deg,#2E7D32,#1B5E20)', borderRadius:11, padding:'10px 18px' };
const btnGhost = { border:'1.5px solid #cdb86a', cursor:'pointer', fontFamily:'inherit', fontWeight:800, fontSize:13, color:'#6b5a1f', background:'#fff', borderRadius:11, padding:'10px 16px' };
const destSub = { fontSize:11.5, color:'#8a7f6a', fontWeight:700, marginTop:2 };
const dot = () => ({ fontSize:11, lineHeight:1 });
function destBtn(on) { return { display:'flex', alignItems:'center', gap:11, textAlign:'left', cursor:'pointer', border:'2px solid ' + (on ? '#3F5BB8' : '#E3DCC9'), background: on ? '#EEF2FC' : '#fff', borderRadius:12, padding:'12px 14px', font:'inherit', width:'100%' }; }
function radio(on) { return { marginLeft:'auto', width:20, height:20, borderRadius:'50%', border:'2px solid ' + (on ? '#3F5BB8' : '#cdc4ad'), color:'#3F5BB8', fontSize:13, display:'inline-flex', alignItems:'center', justifyContent:'center' }; }

function Field({ label, children, style }) {
  return (<label style={{display:'flex', flexDirection:'column', gap:5, ...(style || {})}}><span style={{fontSize:11.5, fontWeight:800, color:'#8a7f6a', textTransform:'uppercase', letterSpacing:'0.03em'}}>{label}</span>{children}</label>);
}

Object.assign(window, { ClassPlanner });
