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
        <button className={`mm-tab ${screen === 'tareas' ? 'on' : ''}`} onClick={() => setScreen('tareas')}>📋 Tareas</button>
        <button className={`mm-tab ${screen === 'saved' ? 'on' : ''}`} onClick={() => setScreen('saved')}>📁 Guardados</button>
      </div>

      {screen === 'calendar' && (
        <CalendarHub cursor={cursor} setCursor={setCursor} selDate={selDate} setSelDate={setSelDate}
          onNewClass={goNewClass} onNewPractice={goNewPractice} onEditClass={(p) => { setEditPlan(p); setScreen('class'); }}
          onEditPractice={(p) => { setEditPractice(p); setScreen('practice'); }} onClassMode={goClassMode} onOpenTasks={() => setScreen('tareas')} refreshKey={tick} onChange={refresh} />
      )}
      {screen === 'class' && (
        <ClassPlanEditor key={editPlan ? editPlan.id || 'tpl' : 'new'} date={selDate} initial={editPlan} defaultGroupId={defaultGroup} onClassMode={goClassMode} onSaved={() => { refresh(); setScreen('calendar'); }} onCancel={() => setScreen('calendar')} />
      )}
      {screen === 'classmode' && (
        <ClassMode plan={classModePlan} onBack={() => setScreen('calendar')} />
      )}
      {screen === 'practice' && (
        <PracticePlanEditor key={editPractice ? editPractice.id || 'tpl' : 'new'} date={selDate} initial={editPractice} defaultGroupId={defaultGroup} onSaved={() => { refresh(); setScreen('calendar'); }} onCancel={() => setScreen('calendar')} />
      )}
      {screen === 'tareas' && (
        <TeacherAssignments embedded onBack={() => setScreen('calendar')} />
      )}
      {screen === 'saved' && (
        <SavedItems onOpenClass={(p) => { setEditPlan(p); setScreen('class'); }} onOpenPractice={(p) => { setEditPractice(p); setScreen('practice'); }} onChange={refresh} refreshKey={tick} />
      )}
    </main>
  );
}

/* ════════ Calendario mensual ════════ */
function CalendarHub({ cursor, setCursor, selDate, setSelDate, onNewClass, onNewPractice, onEditClass, onEditPractice, onClassMode, onOpenTasks, refreshKey, onChange }) {
  const TT = window.JUCUM_TT;
  const { GROUPS } = window.JUCUM_DATA;
  const [groupId, setGroupId] = React.useState(GROUPS[0] ? GROUPS[0].id : null);
  const [summaryDate, setSummaryDate] = React.useState(null);   // ✅ resumen de la clase realizada
  const [dupPlan, setDupPlan] = React.useState(null);           // ⧉ duplicar plan a otro grupo
  const cells = monthMatrix(cursor.y, cursor.m);
  const prevM = () => setCursor(c => { const d = new Date(c.y, c.m - 1, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const nextM = () => setCursor(c => { const d = new Date(c.y, c.m + 1, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const day = (dstr) => { const p = TT.getPlannedForDay(dstr); return { classPlans: p.classPlans.filter(x => !groupId || x.groupId === groupId), practicePlans: p.practicePlans.filter(x => !groupId || x.groupId === groupId) }; };
  const logFor = (dstr) => (TT.getClassLogForDay ? TT.getClassLogForDay(dstr) : []).filter(e => !groupId || e.groupId === groupId);
  const tasksFor = (dstr) => (window.JUCUM_TASKS ? window.JUCUM_TASKS.getAssignments() : []).filter(a => a.dueAt && ymd(new Date(a.dueAt)) === dstr && (!groupId || a.groupId === groupId));

  const sel = day(selDate); const selLog = logFor(selDate); const selTasks = tasksFor(selDate);

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
                  {tasksFor(dstr).length > 0 && <span title="Tarea (cierre)" style={dot('#E65100')}>📋</span>}
                  {nLog > 0 && <span title="Realizado en clase" style={dot('#2E7D32')}>✅</span>}
                </span>
              </button>
            );
          })}
        </div>
        <div style={{display:'flex', gap:14, flexWrap:'wrap', marginTop:11, fontSize:11.5, fontWeight:700, color:'#8a7f6a'}}>
          <span>📘 Plan de clase</span><span>📝 Set de práctica</span><span>📋 Tarea (cierre)</span><span>✅ Realizado (bitácora)</span>
        </div>
      </div>

      {/* Detalle del día seleccionado */}
      <div className="scard" style={{marginTop:16}}>
        <div style={{display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:10}}>
          <div className="sec-title" style={{flex:1, textTransform:'capitalize'}}>{(() => { const d = parseYMD(selDate); return `${DOW_ES[d.getDay()]} ${d.getDate()} de ${MONTHS_ES[d.getMonth()]}`; })()}</div>
          <button onClick={() => onNewClass(selDate, groupId)} style={{...btnGhost, padding:'7px 12px'}}>＋ Plan de clase</button>
          <button onClick={() => onNewPractice(selDate, groupId)} style={{...btnPrimary, padding:'7px 12px', fontSize:13}}>＋ Set de práctica</button>
          {onOpenTasks && <button onClick={() => onOpenTasks()} style={{...btnGhost, padding:'7px 12px', borderColor:'#F0C28A', color:'#E65100'}}>＋ Tarea</button>}
        </div>

        {sel.classPlans.length === 0 && sel.practicePlans.length === 0 && selLog.length === 0 && selTasks.length === 0 && (
          <div className="empty-state" style={{padding:'22px 0'}}><div className="icon">🗓️</div>Nada planeado para este día. Agrega un plan de clase, un set de práctica o una tarea.</div>
        )}

        {selTasks.map(t => {
          const dd = new Date(t.dueAt);
          const hh = dd.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
          const closed = dd < new Date();
          return (
            <DayRow key={t.id} icon="📋" tint="#FFF4E5" border="#F0C28A" title={`${t.title}${closed ? ' · cerrada' : ''}`}
              sub={`Tarea · cierra ${hh}${t.gradable ? ' · calificable' : ''}`}
              onOpen={() => onOpenTasks && onOpenTasks()} />
          );
        })}

        {sel.classPlans.map(p => (
          <DayRow key={p.id} icon="📘" tint="#EEF2FC" border="#C9D6F5" title={`${p.moduleName} · ${p.sessionLabel}`}
            sub={`Plan de clase · ${p.lengthMin} min · ${(p.blocks || []).length} bloques`}
            onPlay={() => onClassMode(p)} onOpen={() => onEditClass(p)} onDup={() => setDupPlan(p)} onDelete={() => { TT.deleteClassPlan(p.id); onChange(); }} />
        ))}
        {sel.practicePlans.map(p => (
          <DayRow key={p.id} icon="📝" tint="#F4EEFB" border="#D9CEEC" title={p.title}
            sub={`${(p.activities || []).length} actividad(es) · ${p.assignToStudents !== false ? '👥 asignado a alumnos' : '🙋 solo para mí'} · ${(p.dates || []).length} día(s)`}
            onOpen={() => onEditPractice(p)} onDelete={() => { TT.deletePracticePlan(p.id); onChange(); }} />
        ))}
        {selLog.length > 0 && (
          <div style={{marginTop:10, borderTop:'1px dashed #E3DCC9', paddingTop:10}}>
            <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:7, flexWrap:'wrap'}}>
              <div style={{fontSize:12, fontWeight:800, color:'#2E7D32', flex:1}}>✅ Realizado en clase (registro automático)</div>
              <button onClick={() => setSummaryDate(selDate)} style={{...btnGhost, padding:'5px 11px', fontSize:12, borderColor:'#9FD3A4', color:'#2E7D32'}}>👁️ Ver resumen de la clase</button>
            </div>
            <button onClick={() => setSummaryDate(selDate)} style={{display:'block', width:'100%', textAlign:'left', cursor:'pointer', border:'1px solid #BFE3C4', background:'#F3FAF4', borderRadius:11, padding:'9px 11px', font:'inherit'}}>
              {selLog.map(e => (
                <span key={e.id} style={{display:'flex', alignItems:'center', gap:11, padding:'4px 0'}}>
                  <span style={{fontSize:11, fontWeight:800, color:'#2E7D32', background:'#E6F4E8', border:'1px solid #BFE3C4', borderRadius:7, padding:'3px 8px', whiteSpace:'nowrap'}}>⏰ {fmtLogClock(e.from)}</span>
                  <span style={{flex:1, minWidth:0, fontWeight:700, fontSize:12.5, color:'#2b2b2b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{e.materialName}</span>
                  <span style={{fontSize:12, color:'#7a8a7c', fontWeight:800, whiteSpace:'nowrap'}}>{e.minutes} min</span>
                </span>
              ))}
              <span style={{display:'block', fontSize:11.5, color:'#5a8a5f', fontWeight:700, marginTop:5}}>👆 Toca para ver el plan dado, la asistencia y los comentarios — y duplicar la clase a otro grupo.</span>
            </button>
          </div>
        )}
      </div>
      {summaryDate && <ClassSummaryModal date={summaryDate} groupId={groupId} onClose={() => setSummaryDate(null)} onDuplicate={(p) => { setSummaryDate(null); setDupPlan(p); }} />}
      {dupPlan && <DuplicateClassModal plan={dupPlan} onClose={() => setDupPlan(null)} onDone={() => { setDupPlan(null); onChange(); }} />}
    </>
  );
}

/* ════════ Resumen de la clase realizada (plan dado · asistencia · comentarios) ════════ */
function ClassSummaryModal({ date, groupId, onClose, onDuplicate }) {
  const TT = window.JUCUM_TT; const A = window.JUCUM_ATT;
  const { STUDENTS, GROUPS } = window.JUCUM_DATA;
  const group = (GROUPS || []).find(g => g.id === groupId) || null;
  const planned = TT.getPlannedForDay ? TT.getPlannedForDay(date) : { classPlans: [] };
  const classPlans = (planned.classPlans || []).filter(p => !groupId || p.groupId === groupId);
  const log = (TT.getClassLogForDay ? TT.getClassLogForDay(date) : []).filter(e => !groupId || e.groupId === groupId);
  const students = (STUDENTS || []).filter(s => !groupId || s.group === groupId);
  const att = students.map(s => ({ s, st: (A && A.getStudentRecord(date, s.id) || {}).status || null }));
  const present = att.filter(a => a.st === 'asistio' || a.st === 'tarde').length;
  const marked = att.filter(a => a.st).length;
  // Comentarios de clase de ese día (notas con fecha = ese día, de este grupo o de sus alumnos)
  const sIds = new Set(students.map(s => s.id));
  const notes = (TT.getNotes ? TT.getNotes() : []).filter(n => String(n.date).slice(0,10) === date && (n.groupId === groupId || (n.studentId && sIds.has(n.studentId)) || (!n.groupId && !n.studentId)));
  const generalNotes = notes.filter(n => !n.studentId);
  const studentNotes = notes.filter(n => n.studentId);
  const ATT_META = { asistio:{l:'P',c:'#2E7D32'}, tarde:{l:'T',c:'#F2820D'}, falto:{l:'A',c:'#C0392B'} };
  const totalMin = log.reduce((a,e) => a + (e.minutes || 0), 0);
  const sName = (id) => { const st = students.find(x => x.id === id); return st ? (st.fullName || st.username) : 'Alumno'; };

  return (
    <div onClick={onClose} style={{position:'fixed', inset:0, zIndex:1000, background:'rgba(15,23,42,0.5)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16}}>
      <div onClick={e => e.stopPropagation()} style={{background:'#fff', borderRadius:18, width:'100%', maxWidth:620, maxHeight:'88vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 60px rgba(0,0,0,0.35)'}}>
        <div style={{padding:'16px 20px 13px', borderBottom:'1.5px solid #E3DCC9', position:'relative'}}>
          <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:18, lineHeight:1.2, color:'#2E7D32', display:'flex', alignItems:'center', gap:9}}>✅ Resumen de la clase</div>
          <div style={{fontSize:12, color:'#8a7f6a', fontWeight:700, marginTop:3, textTransform:'capitalize'}}>{fmtDateLong(date)}{group ? ' · ' + group.name : ''}</div>
          <button onClick={onClose} style={{position:'absolute', top:14, right:14, width:32, height:32, borderRadius:'50%', border:'none', background:'#FAFAF6', color:'#8a7f6a', fontSize:14, fontWeight:800, cursor:'pointer'}}>✕</button>
        </div>
        <div style={{padding:'14px 20px 18px', overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:16}}>
          {/* Plan dado */}
          <div>
            <div style={lblStyle}>📘 Plan de clase {classPlans.length ? '(lo que se preparó)' : ''}</div>
            {classPlans.length === 0 ? <div style={mutedStyle}>No había un plan de clase agendado para este día (solo bitácora de materiales).</div>
              : classPlans.map(p => (
              <div key={p.id} style={{border:'1px solid #C9D6F5', background:'#EEF2FC', borderRadius:11, padding:'10px 12px', marginBottom:8}}>
                <div style={{fontWeight:800, fontSize:13.5, marginBottom:6}}>{p.moduleName} · {p.sessionLabel} <span style={{fontSize:11, color:'#8a7f6a', fontWeight:700}}>· {p.lengthMin} min</span></div>
                {withClock(p.blocks || [], p.startTime).map(b => (
                  <div key={b.id} style={{display:'flex', alignItems:'center', gap:9, fontSize:12.5, color:'#3a4a66', padding:'2px 0'}}>
                    <span style={{fontWeight:800, color:'#1F3A8A', whiteSpace:'nowrap', fontSize:11.5}}>{b.from}–{b.to}</span>
                    <span>{b.emoji}</span><span style={{flex:1, fontWeight:700}}>{b.title}</span>
                    <span style={{color:'#999', fontWeight:700}}>{b.mins}′</span>
                  </div>
                ))}
                <div style={{marginTop:8}}><button onClick={() => onDuplicate(p)} style={{...btnGhost, padding:'6px 12px', fontSize:12, borderColor:'#9FB0DA', color:'#3F5BB8'}}>⧉ Duplicar esta clase a otro grupo</button></div>
              </div>
            ))}
          </div>
          {/* Materiales usados (bitácora) */}
          <div>
            <div style={lblStyle}>📎 Materiales usados (bitácora automática){totalMin ? ` · ${totalMin} min en total` : ''}</div>
            {log.length === 0 ? <div style={mutedStyle}>No se registraron materiales abiertos en clase este día.</div>
              : log.map(e => (
              <div key={e.id} style={{display:'flex', alignItems:'center', gap:9, fontSize:12.5, color:'#555', padding:'4px 0', borderBottom:'1px solid #F2ECDD'}}>
                <span style={{fontWeight:800, color:'#2E7D32', whiteSpace:'nowrap', fontSize:11.5}}>⏰ {fmtLogClock(e.from)}</span>
                <span style={{flex:1, fontWeight:700}}>{e.materialName}</span>
                <span style={{color:'#999', fontWeight:700}}>{e.minutes}′</span>
              </div>
            ))}
          </div>
          {/* Asistencia */}
          <div>
            <div style={lblStyle}>📝 Asistencia · {present}/{students.length} presentes{marked < students.length ? ` · ${students.length - marked} sin marcar` : ''}</div>
            {students.length === 0 ? <div style={mutedStyle}>Este grupo no tiene alumnos.</div>
              : <div style={{display:'flex', flexDirection:'column', gap:5}}>
              {att.map(({ s, st }) => {
                const ini = (s.fullName || s.username || '?').split(' ').map(x => x[0]).slice(0,2).join('').toUpperCase();
                const m = ATT_META[st];
                return (
                  <div key={s.id} style={{display:'flex', alignItems:'center', gap:9, padding:'3px 0'}}>
                    <span style={{width:28, height:28, borderRadius:'50%', background:'#FCEFD8', color:'#C77B12', fontWeight:800, fontSize:11, display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>{ini}</span>
                    <span style={{flex:1, fontWeight:700, fontSize:12.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{s.fullName || s.username}</span>
                    {m ? <span style={{width:24, height:24, borderRadius:7, background:m.c, color:'#fff', fontWeight:900, fontSize:11.5, display:'inline-flex', alignItems:'center', justifyContent:'center'}}>{m.l}</span>
                       : <span style={{fontSize:10.5, color:'#b0a88f', fontWeight:800}}>sin marcar</span>}
                  </div>
                );
              })}
            </div>}
          </div>
          {/* Comentarios */}
          <div>
            <div style={lblStyle}>💬 Comentarios de la clase</div>
            {generalNotes.length === 0 && studentNotes.length === 0 ? <div style={mutedStyle}>No anotaste comentarios este día. Puedes anotarlos desde 👥 en el modo clase.</div> : null}
            {generalNotes.map(n => (
              <div key={n.id} style={{fontSize:13, color:'#7a5e1f', background:'#FFFDE7', border:'1px solid #FBC02D', borderRadius:9, padding:'9px 11px', fontWeight:600, marginBottom:7}}>{n.text}</div>
            ))}
            {studentNotes.map(n => (
              <div key={n.id} style={{display:'flex', gap:8, fontSize:12.5, color:'#555', padding:'3px 0'}}>
                <span style={{fontWeight:800, color:'#1F3A8A', flexShrink:0}}>✎ {sName(n.studentId).split(' ')[0]}:</span>
                <span style={{flex:1}}>{n.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:'flex', gap:10, justifyContent:'space-between', alignItems:'center', padding:'13px 20px', borderTop:'1.5px solid #E3DCC9', flexWrap:'wrap'}}>
          {classPlans[0] ? <button onClick={() => onDuplicate(classPlans[0])} style={{...btnGhost, padding:'8px 14px', fontSize:12.5, borderColor:'#9FB0DA', color:'#3F5BB8'}}>⧉ Duplicar la clase a otro grupo</button> : <span />}
          <button onClick={onClose} style={{...btnGhost, padding:'8px 16px', fontSize:12.5}}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

/* ════════ Duplicar un plan de clase a otro grupo ════════ */
function DuplicateClassModal({ plan, onClose, onDone }) {
  const TT = window.JUCUM_TT;
  const { GROUPS, MODULE_CATALOG } = window.JUCUM_DATA;
  const others = (GROUPS || []).filter(g => g.id !== plan.groupId);
  const [gid, setGid] = React.useState(others[0] ? others[0].id : (plan.groupId || null));
  const [date, setDate] = React.useState(plan.date || todayYMD());
  const dup = () => {
    const g = (GROUPS || []).find(x => x.id === gid);
    const lvl = (g && g.level) || plan.level;
    const copy = { ...plan, id: undefined, groupId: gid, level: lvl, date,
      blocks: (plan.blocks || []).map(b => ({ ...b, id: 'b_' + Math.random().toString(36).slice(2,7) })) };
    TT.upsertClassPlan(copy);
    alert('⧉ Clase duplicada al grupo seleccionado el ' + date + '. Ábrela en su calendario para ajustar lo que quieras (no se tocó el original).');
    onDone();
  };
  return (
    <div onClick={onClose} style={{position:'fixed', inset:0, zIndex:1001, background:'rgba(15,23,42,0.55)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16}}>
      <div onClick={e => e.stopPropagation()} style={{background:'#fff', borderRadius:18, width:'100%', maxWidth:440, boxShadow:'0 24px 60px rgba(0,0,0,0.35)'}}>
        <div style={{padding:'16px 20px 13px', borderBottom:'1.5px solid #E3DCC9', position:'relative'}}>
          <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:18, color:'#3F5BB8'}}>⧉ Duplicar a otro grupo</div>
          <div style={{fontSize:12, color:'#8a7f6a', fontWeight:700, marginTop:3}}>{plan.moduleName} · {plan.sessionLabel}</div>
          <button onClick={onClose} style={{position:'absolute', top:14, right:14, width:32, height:32, borderRadius:'50%', border:'none', background:'#FAFAF6', color:'#8a7f6a', fontSize:14, fontWeight:800, cursor:'pointer'}}>✕</button>
        </div>
        <div style={{padding:'16px 20px 6px'}}>
          {others.length === 0 ? <div style={mutedStyle}>No tienes otro grupo al que duplicar todavía.</div> : (
            <>
              <Field label="Grupo destino"><select value={gid || ''} onChange={e => setGid(e.target.value)} style={selStyle}>{others.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>
              <div style={{height:12}} />
              <Field label="Fecha en ese grupo"><input type="date" value={date} onChange={e => setDate(e.target.value)} style={selStyle} /></Field>
              <div style={{fontSize:11.5, color:'#8a7f6a', fontWeight:700, margin:'10px 0 2px'}}>Se crea una <b>copia idéntica</b> (secuencia y materiales). El original no se modifica.</div>
            </>
          )}
        </div>
        <div style={{display:'flex', gap:10, justifyContent:'flex-end', padding:'13px 20px', borderTop:'1.5px solid #E3DCC9'}}>
          <button onClick={onClose} style={{...btnGhost, padding:'9px 16px', fontSize:12.5}}>Cancelar</button>
          {others.length > 0 && <button onClick={dup} style={{...btnPrimary, padding:'9px 18px', fontSize:13, background:'linear-gradient(135deg,#3F5BB8,#0D1B5A)'}}>⧉ Duplicar aquí</button>}
        </div>
      </div>
    </div>
  );
}

function DayRow({ icon, tint, border, title, sub, onOpen, onDelete, onPlay, onDup }) {
  return (
    <div style={{display:'flex', alignItems:'center', gap:11, border:'1px solid ' + border, background: tint, borderRadius:11, padding:'10px 12px', marginBottom:8, flexWrap:'wrap'}}>
      <span style={{fontSize:19}}>{icon}</span>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontWeight:800, fontSize:13.5}}>{title}</div>
        <div style={{fontSize:11.5, color:'#8a7f6a', fontWeight:700}}>{sub}</div>
      </div>
      {onPlay && <button onClick={onPlay} style={{...btnPrimary, padding:'6px 12px', fontSize:12.5, background:'linear-gradient(135deg,#3F5BB8,#0D1B5A)'}}>▶ Modo clase</button>}
      <button onClick={onOpen} style={{...btnGhost, padding:'6px 12px', fontSize:12.5}}>Abrir</button>
      {onDup && <button onClick={onDup} title="Duplicar a otro grupo" style={{...btnGhost, padding:'6px 12px', fontSize:12.5, borderColor:'#9FB0DA', color:'#3F5BB8'}}>⧉ Duplicar</button>}
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
    if (asTemplate) {
      const name = window.prompt('Nombre para esta plantilla de clase:', plan.moduleName + ' · ' + cfg.sessionLabel);
      if (!name) return;
      const payload = { ...plan, groupId: cfg.groupId, sessionLabel: cfg.sessionLabel, startTime: cfg.startTime, lengthMin: totalMin, date: undefined, id: undefined };
      TT.addTemplate({ kind: 'class', name: name.trim(), level: cfg.level, payload });
      alert('⭐ Plantilla "' + name.trim() + '" guardada. La encuentras en 📁 Guardados.');
      return;
    }
    const rec = { ...plan, groupId: cfg.groupId, date: cfg.date || date, sessionLabel: cfg.sessionLabel, startTime: cfg.startTime, lengthMin: totalMin, id: initial && !initial._tpl ? initial.id : undefined };
    TT.upsertClassPlan(rec); alert('✅ Plan de clase guardado en el calendario'); onSaved();
  };
  const printPlan = () => printClassPlan(plan, cfg, totalMin);

  return (
    <>
      <div className="scard">
        <div className="sec-head"><div className="sec-title">📘 Plan de clase · {fmtDateLong(cfg.date || date)}</div></div>
        {initial && !initial._tpl && (
          <div style={{display:'flex', alignItems:'center', gap:9, background:'#EEF2FC', border:'1px solid #C9D6F5', borderRadius:11, padding:'9px 13px', margin:'4px 0 10px', fontSize:12.5, fontWeight:700, color:'#1F3A8A'}}>
            ✏️ Estás <b>editando un plan guardado</b>. Cambia lo que quieras abajo y pulsa <b>💾 Guardar</b> — se actualiza en su mismo día (no se duplica).
          </div>
        )}
        {initial && initial._tpl && (
          <div style={{display:'flex', alignItems:'center', gap:9, background:'#FBF7FF', border:'1px solid #E2D5F3', borderRadius:11, padding:'9px 13px', margin:'4px 0 10px', fontSize:12.5, fontWeight:700, color:'#5B3FA0'}}>
            ⭐ Partiste de una <b>plantilla</b>. Ajusta la fecha y el grupo, y guárdalo para agendarlo en el calendario.
          </div>
        )}
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
          <button onClick={() => { if (plan && !window.confirm('¿Regenerar desde cero? Se perderán los cambios que hiciste a los bloques.')) return; generate(); }} style={{...btnPrimary, background:'linear-gradient(135deg,#3F5BB8,#0D1B5A)'}}>⚡ {plan ? 'Regenerar' : 'Generar plan'}</button>
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
  const [reviewOn, setReviewOn] = React.useState(false);
  const [reviewModId, setReviewModId] = React.useState(null);
  const [reviewTema, setReviewTema] = React.useState('');
  const [dates, setDates] = React.useState(() => initial ? initial.dates.slice() : (date ? [date] : []));
  const [assign, setAssign] = React.useState(initial ? initial.assignToStudents !== false : true);
  const [note, setNote] = React.useState(initial ? initial.note : '');
  const [guide, setGuide] = React.useState(() => (initial && initial.guide) ? initial.guide : null);
  const [favTick, setFavTick] = React.useState(0);
  const lang = (guide && guide.lang) || 'es';
  const setLang = (lg) => setGuide(g => g ? { ...g, lang: lg } : g);
  const regenGuide = () => setGuide(window.JUCUM_GUIDE.build(level, picked, mod ? mod.name : '', { title, note, lang }));
  const previewGuide = () => { const g = guide || window.JUCUM_GUIDE.build(level, picked, mod ? mod.name : '', { title, note, lang }); if (!guide) setGuide(g); window.JUCUM_GUIDE.openOverlay(g, {}); };
  const updateStep = (i, patch) => setGuide(g => ({ ...g, steps: g.steps.map((s, k) => k === i ? { ...s, ...patch } : s) }));
  const allTemas = Array.from(new Set(mods.flatMap(m => (m.activities || []).map(a => a.group).filter(Boolean))));
  const focusText = (s) => {
    if (s.type === 'story') { const a = []; if (s.storyNo) a.push('Historia #' + s.storyNo); if (s.dialogNo) a.push('Diálogo #' + s.dialogNo); return a.join(' · '); }
    if (s.type === 'reading') { return s.storyNo ? ('Historia #' + s.storyNo) : ''; }
    if (s.type === 'summary' || s.type === 'grammar') { return s.tema ? ('Tema: ' + s.tema) : ''; }
    return '';
  };
  const setStepMeta = (i, patch) => setGuide(g => ({ ...g, steps: g.steps.map((s, k) => { if (k !== i) return s; const ns = { ...s, ...patch }; ns.focus = focusText(ns); return ns; }) }));
  const moveStep = (i, dir) => setGuide(g => { const arr = g.steps.slice(); const j = i + dir; if (j < 0 || j >= arr.length) return g; const t = arr[i]; arr[i] = arr[j]; arr[j] = t; return { ...g, steps: arr }; });
  const delStep = (i) => setGuide(g => ({ ...g, steps: g.steps.filter((_, k) => k !== i) }));
  const loadFav = (favId) => { const f = (TT.getGuideFavs() || []).find(x => x.id === favId); if (!f) return; const g = JSON.parse(JSON.stringify(f.guide)); g.title = title; g.note = note; g.moduleName = mod ? mod.name : g.moduleName; setGuide(g); };
  const saveFav = () => { const g = guide || window.JUCUM_GUIDE.build(level, picked, mod ? mod.name : '', { title, note, lang }); if (!guide) setGuide(g); const name = window.prompt('Ponle un nombre a este instructivo favorito (para reconocerlo después):', title || 'Mi instructivo'); if (!name) return; TT.addGuideFav(name.trim(), g); setFavTick(t => t + 1); alert('⭐ Guardado en favoritos como “' + name.trim() + '”'); };
  const delFav = (id) => { if (window.confirm('¿Borrar este instructivo favorito?')) { TT.deleteGuideFav(id); setFavTick(t => t + 1); } };
  const cur = new Date(); const [pcur, setPcur] = React.useState({ y: cur.getFullYear(), m: cur.getMonth() });

  const [actTypeFilter, setActTypeFilter] = React.useState('all');
  const [collapsedTopics, setCollapsedTopics] = React.useState({});
  const isPicked = (m, a) => picked.some(p => p.moduleId === m.id && p.activityId === a.id);
  const togglePick = (m, a) => setPicked(arr => isPicked(m, a) ? arr.filter(p => !(p.moduleId === m.id && p.activityId === a.id)) : [...arr, { moduleId: m.id, activityId: a.id, label: a.name, type: a.type, group: a.group || null }]);
  const togglePickReview = (m, a) => setPicked(arr => isPicked(m, a) ? arr.filter(p => !(p.moduleId === m.id && p.activityId === a.id)) : [...arr, { moduleId: m.id, activityId: a.id, label: a.name, type: a.type, group: a.group || null, review: true, moduleName: m.name }]);
  const reviewMod = mods.find(m => m.id === reviewModId) || null;
  const reviewTemas = reviewMod ? Array.from(new Set((reviewMod.activities || []).map(a => a.group).filter(Boolean))) : [];
  const toggleDate = (dstr) => setDates(arr => arr.includes(dstr) ? arr.filter(x => x !== dstr) : [...arr, dstr].sort());
  const addWeek = (offset) => { const base = parseYMD(date || todayYMD()); const out = new Set(dates); for (let i = 0; i < 7; i++) { const d = new Date(base); d.setDate(base.getDate() + offset * 7 + i); out.add(ymd(d)); } setDates(Array.from(out).sort()); };

  const save = () => {
    if (!picked.length) { alert('Elige al menos una actividad.'); return; }
    if (!dates.length) { alert('Elige al menos un día en el calendario.'); return; }
    const finalGuide = guide || window.JUCUM_GUIDE.build(level, picked, mod ? mod.name : '', { title, note, lang });
    const rec = { groupId, title, activities: picked, dates, assignToStudents: assign, note, guide: finalGuide };
    if (initial && !initial._tpl) { TT.updatePracticePlan(initial.id, rec); alert('✅ Set de práctica actualizado'); }
    else { TT.addPracticePlan(rec); alert(assign ? '✅ Set guardado y asignado a los alumnos en esos días' : '✅ Set guardado (solo para ti)'); }
    onSaved();
  };
  const saveAsTemplate = () => {
    if (!picked.length) { alert('Elige al menos una actividad antes de guardar la plantilla.'); return; }
    const name = window.prompt('Nombre para esta plantilla de práctica:', title);
    if (!name) return;
    const finalGuide = guide || window.JUCUM_GUIDE.build(level, picked, mod ? mod.name : '', { title, note, lang });
    TT.addTemplate({ kind: 'practice', name: name.trim(), level, payload: { title, activities: picked, assignToStudents: assign, note, guide: finalGuide, dates: [] } });
    alert('⭐ Plantilla "' + name.trim() + '" guardada. La encuentras en 📁 Guardados.');
  };
  const printSet = () => printPracticeSet({ title, group, level, picked, dates, mod }, MODULE_CATALOG);

  const cells = monthMatrix(pcur.y, pcur.m);
  const prevM = () => setPcur(c => { const d = new Date(c.y, c.m - 1, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const nextM = () => setPcur(c => { const d = new Date(c.y, c.m + 1, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  return (
    <>
      <div className="scard">
        <div className="sec-head"><div className="sec-title">📝 Set de práctica</div></div>
        {initial && !initial._tpl && (
          <div style={{display:'flex', alignItems:'center', gap:9, background:'#F4EEFB', border:'1px solid #D9CEEC', borderRadius:11, padding:'9px 13px', margin:'4px 0 4px', fontSize:12.5, fontWeight:700, color:'#5B3FA0'}}>
            ✏️ Estás <b>editando un set guardado</b>. Cambia actividades, días o destino y pulsa <b>💾 Guardar</b> — se actualiza el mismo set.
          </div>
        )}
        {initial && initial._tpl && (
          <div style={{display:'flex', alignItems:'center', gap:9, background:'#FBF7FF', border:'1px solid #E2D5F3', borderRadius:11, padding:'9px 13px', margin:'4px 0 4px', fontSize:12.5, fontWeight:700, color:'#5B3FA0'}}>
            ⭐ Partiste de una <b>plantilla</b>. Elige los <b>días</b> y guárdalo para asignarlo.
          </div>
        )}
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:14, marginTop:6}}>
          <Field label="Título"><input value={title} onChange={e => setTitle(e.target.value)} style={selStyle} /></Field>
          <Field label="Grupo"><select value={groupId || ''} onChange={e => { setGroupId(e.target.value); const g = GROUPS.find(x => x.id === e.target.value); const lv = g ? g.level : level; const m = (MODULE_CATALOG[lv] || [])[0]; setModuleId(m ? m.id : null); setPicked([]); }} style={selStyle}>{GROUPS.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>
          <Field label="Módulo (puedes elegir uno pasado)"><select value={moduleId || ''} onChange={e => setModuleId(e.target.value)} style={selStyle}>{mods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
        </div>
      </div>

      {/* 1 · Actividades */}
      <div className="scard" style={{marginTop:16}}>
        <div className="sec-head"><div className="sec-title">1 · Elige las actividades</div></div>
        <div style={{fontSize:12, color:'#8a7f6a', fontWeight:700, marginBottom:8}}>Tip: cambia el <b>Módulo</b> arriba (incluso uno pasado) y sigue marcando — se acumulan de varios módulos.</div>
        {(() => {
          const all = mod ? (mod.activities || []) : [];
          const typesPresent = Array.from(new Set(all.map(a => a.type)));
          const TLAB = { story:'📗 Stories', reading:'📖 Comprensión', listening:'🎧 Listening', summary:'📚 Resúmenes', grammar:'📝 Gramática', quizlet:'🃏 Quizlet' };
          const pillStyle = (on) => ({ border:'1.5px solid ' + (on ? '#3F5BB8' : '#E3DCC9'), background: on ? '#3F5BB8' : '#fff', color: on ? '#fff' : '#6b6453', fontFamily:'inherit', fontWeight:800, fontSize:12, borderRadius:18, padding:'6px 12px', cursor:'pointer' });
          const filtered = all.filter(a => actTypeFilter === 'all' || a.type === actTypeFilter);
          const topicGroups = [];
          filtered.forEach(a => { const key = a.group || 'General del módulo'; let g = topicGroups.find(x => x.key === key); if (!g) { g = { key, items: [] }; topicGroups.push(g); } g.items.push(a); });
          return (
            <>
              <div style={{display:'flex', gap:7, flexWrap:'wrap', marginBottom:10}}>
                <button onClick={() => setActTypeFilter('all')} style={pillStyle(actTypeFilter === 'all')}>Todas</button>
                {typesPresent.map(t => <button key={t} onClick={() => setActTypeFilter(t)} style={pillStyle(actTypeFilter === t)}>{TLAB[t] || t}</button>)}
              </div>
              <div style={{display:'flex', flexDirection:'column', gap:8}}>
                {topicGroups.map(g => {
                  const collapsed = !!collapsedTopics[g.key];
                  const pickedN = g.items.filter(a => isPicked(mod, a)).length;
                  return (
                    <div key={g.key} style={{border:'1px solid #E3DCC9', borderRadius:11, overflow:'hidden'}}>
                      <button onClick={() => setCollapsedTopics(c => ({ ...c, [g.key]: !c[g.key] }))} style={{display:'flex', alignItems:'center', gap:9, width:'100%', textAlign:'left', cursor:'pointer', border:'none', background:'#FBF7FF', padding:'10px 12px', font:'inherit'}}>
                        <span style={{flex:1, fontWeight:800, fontSize:13, color:'#54243F'}}>{g.key}</span>
                        {pickedN > 0 && <span style={{fontSize:11, fontWeight:800, color:'#1F3A8A', background:'#E3E9F8', borderRadius:11, padding:'2px 9px'}}>{pickedN} ✓</span>}
                        <span style={{fontSize:11, fontWeight:800, color:'#8a7f6a'}}>{g.items.length}</span>
                        <span style={{fontSize:12, color:'#8a7f6a', transform: collapsed ? 'none' : 'rotate(180deg)', display:'inline-block'}}>▾</span>
                      </button>
                      {!collapsed && <div style={{display:'flex', flexDirection:'column', gap:7, padding:'8px 10px'}}>
                        {g.items.map(a => {
                          const on = isPicked(mod, a);
                          return (
                            <button key={a.id} onClick={() => togglePick(mod, a)} style={{display:'flex', alignItems:'center', gap:10, textAlign:'left', cursor:'pointer', border:'1px solid ' + (on ? '#9FB0DA' : '#E3DCC9'), background: on ? '#EEF2FC' : '#fff', borderRadius:10, padding:'9px 12px', font:'inherit'}}>
                              <span style={{width:20, height:20, borderRadius:6, border:'2px solid ' + (on ? '#3F5BB8' : '#cdc4ad'), background: on ? '#3F5BB8' : '#fff', color:'#fff', fontSize:13, fontWeight:900, display:'inline-flex', alignItems:'center', justifyContent:'center'}}>{on ? '✓' : ''}</span>
                              <span style={{fontSize:15}}>{typeIcon(a.type)}</span>
                              <span style={{flex:1, fontWeight:700, fontSize:13}}>{a.name}</span>
                              {!a.url && <span style={{fontSize:10.5, fontWeight:800, color:'#9C5D00', background:'#FFF3E0', borderRadius:20, padding:'2px 8px'}}>sin archivo</span>}
                            </button>
                          );
                        })}
                      </div>}
                    </div>
                  );
                })}
                {topicGroups.length === 0 && <div style={{padding:'16px', textAlign:'center', color:'#999', fontWeight:700, fontSize:12.5}}>Sin actividades de este tipo en el módulo.</div>}
              </div>
            </>
          );
        })()}
        <div style={{marginTop:9, fontSize:12, fontWeight:700, color:'#6b6453'}}>{picked.length} actividad(es) elegida(s)</div>
      </div>

      {/* 1b · Repaso de otro módulo (opcional) */}
      <div className="scard" style={{marginTop:16}}>
        <button onClick={() => setReviewOn(v => !v)} style={{display:'flex', alignItems:'center', gap:11, width:'100%', textAlign:'left', cursor:'pointer', border:'none', background:'transparent', font:'inherit', padding:0}}>
          <span style={{width:24, height:24, borderRadius:7, background: reviewOn ? '#E67E00' : '#F0E6D4', color:'#fff', fontSize:15, fontWeight:900, display:'inline-flex', alignItems:'center', justifyContent:'center'}}>{reviewOn ? '✓' : '＋'}</span>
          <div style={{flex:1}}>
            <div className="sec-title" style={{margin:0}}>🔁 Integrar repaso de otro módulo</div>
            <div style={{fontSize:12, color:'#8a7f6a', fontWeight:700}}>¿Notas un tema de un módulo anterior que aún no dominan? Agrégalo aquí. Al alumno le saldrá “Repasamos nuevamente el módulo…”.</div>
          </div>
        </button>

        {reviewOn && (
          <div style={{marginTop:13, borderTop:'1px dashed #E3DCC9', paddingTop:13}}>
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12}}>
              <Field label="1) Módulo a repasar">
                <select value={reviewModId || ''} onChange={e => { setReviewModId(e.target.value); setReviewTema(''); }} style={selStyle}>
                  <option value="">— Elige un módulo —</option>
                  {mods.filter(m => m.id !== moduleId).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </Field>
              <Field label="2) Tema">
                <select value={reviewTema} onChange={e => setReviewTema(e.target.value)} disabled={!reviewMod} style={{...selStyle, opacity: reviewMod ? 1 : .6}}>
                  <option value="">— Todos los temas —</option>
                  {reviewTemas.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>
            {reviewMod && (
              <div style={{marginTop:12}}>
                <div style={{fontSize:11.5, fontWeight:800, color:'#8a7f6a', textTransform:'uppercase', letterSpacing:'.03em', marginBottom:6}}>3) Material a practicar</div>
                <div style={{display:'flex', flexDirection:'column', gap:7}}>
                  {(reviewMod.activities || []).filter(a => !reviewTema || a.group === reviewTema).map(a => {
                    const on = isPicked(reviewMod, a);
                    return (
                      <button key={a.id} onClick={() => togglePickReview(reviewMod, a)} style={{display:'flex', alignItems:'center', gap:10, textAlign:'left', cursor:'pointer', border:'1px solid ' + (on ? '#F2C99A' : '#E3DCC9'), background: on ? '#FFF6EC' : '#fff', borderRadius:10, padding:'9px 12px', font:'inherit'}}>
                        <span style={{width:20, height:20, borderRadius:6, border:'2px solid ' + (on ? '#E67E00' : '#cdc4ad'), background: on ? '#E67E00' : '#fff', color:'#fff', fontSize:13, fontWeight:900, display:'inline-flex', alignItems:'center', justifyContent:'center'}}>{on ? '✓' : ''}</span>
                        <span style={{fontSize:15}}>{typeIcon(a.type)}</span>
                        <span style={{flex:1, fontWeight:700, fontSize:13}}>{a.name}{a.group ? <span style={{display:'block', fontSize:11, color:'#8a7f6a', fontWeight:700}}>{a.group}</span> : null}</span>
                        {!a.url && <span style={{fontSize:10.5, fontWeight:800, color:'#9C5D00', background:'#FFF3E0', borderRadius:20, padding:'2px 8px'}}>sin archivo</span>}
                      </button>
                    );
                  })}
                </div>
                <div style={{marginTop:9, fontSize:12, fontWeight:700, color:'#9c4a00'}}>{picked.filter(p => p.review).length} material(es) de repaso agregado(s)</div>
              </div>
            )}
          </div>
        )}
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

      {/* 3 · Instructivo (cómo practicar) — documento de pasos que ve el alumno */}
      <div className="scard" style={{marginTop:16}}>
        <div className="sec-head"><div className="sec-title">3 · Instructivo · cómo practicar</div></div>
        <div style={{fontSize:12.5, color:'#8a7f6a', fontWeight:700, margin:'2px 0 10px'}}>Trae los <b>pasos oficiales por nivel</b> ya cargados. Genera, edítalos a tu gusto y guárdalos como <b>favoritos</b> (con un nombre) para reutilizarlos.</div>

        {/* Favoritos */}
        {(() => { const favs = TT.getGuideFavs ? TT.getGuideFavs() : []; void favTick; return (
          <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', background:'#FBF7FF', border:'1px solid #E2D5F3', borderRadius:11, padding:'10px 12px', marginBottom:12}}>
            <span style={{fontSize:16}}>⭐</span>
            <span style={{fontSize:12.5, fontWeight:800, color:'#5B3FA0'}}>Plantillas favoritas:</span>
            {favs.length === 0
              ? <span style={{fontSize:12, fontWeight:700, color:'#9b8fc0'}}>aún no tienes — genera y guarda una abajo</span>
              : <select onChange={e => { if (e.target.value) loadFav(e.target.value); e.target.value=''; }} defaultValue="" style={{...selStyle, width:'auto', minWidth:200, flex:1, maxWidth:320}}>
                  <option value="">＋ Usar una plantilla favorita…</option>
                  {favs.map(f => <option key={f.id} value={f.id}>{f.name}{f.level ? ' · ' + f.level.toUpperCase() : ''}</option>)}
                </select>}
            {favs.length > 0 && <details style={{position:'relative'}}>
              <summary style={{listStyle:'none', cursor:'pointer', fontSize:11.5, fontWeight:800, color:'#8a7f6a'}}>administrar</summary>
              <div style={{position:'absolute', right:0, top:'120%', zIndex:5, background:'#fff', border:'1px solid #E3DCC9', borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,.14)', padding:8, width:240}}>
                {favs.map(f => <div key={f.id} style={{display:'flex', alignItems:'center', gap:8, padding:'5px 4px', borderTop:'1px solid #F2EEE3'}}><span style={{flex:1, fontSize:12, fontWeight:700}}>{f.name}</span><button onClick={() => loadFav(f.id)} style={{...iconBtn, width:'auto', padding:'2px 7px', fontSize:11}}>usar</button><button onClick={() => delFav(f.id)} style={{...iconBtn, width:'auto', padding:'2px 7px', fontSize:11, color:'#C0392B', borderColor:'#E2B6AE'}}>✕</button></div>)}
              </div>
            </details>}
          </div>
        ); })()}

        {!guide ? (
          <div style={{display:'flex', alignItems:'center', gap:12, background:'#FBFAF5', border:'1px dashed #D8CEB4', borderRadius:12, padding:'16px 16px'}}>
            <span style={{fontSize:26}}>📋</span>
            <div style={{flex:1, fontSize:13, fontWeight:700, color:'#6b6453'}}>Aún no has generado el instructivo. Elige las actividades arriba y genera los pasos oficiales del nivel.</div>
            <button onClick={regenGuide} disabled={!picked.length} style={{...btnPrimary, background: picked.length ? 'linear-gradient(135deg,#3F5BB8,#0D1B5A)' : '#bbb', opacity: picked.length ? 1 : .6}}>⚡ Generar instructivo</button>
          </div>
        ) : (
          <>
            <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:12, background:'#F4F7FD', border:'1px solid #D8E3F5', borderRadius:11, padding:'9px 12px'}}>
              <span style={{fontSize:12.5, fontWeight:800, color:'#1F3A8A'}}>🌐 Idioma de las instrucciones:</span>
              {[['es','Español'],['en','English'],['par','Paralelo (EN + ES)']].map(([k, lbl]) => (
                <button key={k} onClick={() => setLang(k)} style={{border:'1.5px solid ' + (lang === k ? '#1F3A8A' : '#C9D6F0'), background: lang === k ? '#1F3A8A' : '#fff', color: lang === k ? '#fff' : '#3A4A66', fontFamily:'inherit', fontWeight:800, fontSize:12, padding:'6px 12px', borderRadius:18, cursor:'pointer'}}>{lbl}</button>
              ))}
            </div>
            {lang === 'par' && <div style={{fontSize:11.5, color:'#8a7f6a', fontWeight:700, margin:'2px 0 10px'}}>En “Paralelo”, el alumno verá la instrucción en <b>inglés</b> y debajo, sutil, su <b>traducción</b> al español.</div>}
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
              {guide.steps.map((s, i) => (
                <div key={i} style={{border:'1px solid #E3DCC9', borderRadius:12, padding:'11px 13px', background:'#fff'}}>
                  <div style={{display:'flex', alignItems:'center', gap:9, marginBottom:7}}>
                    <span style={{width:22, height:22, flexShrink:0, borderRadius:7, background:'#1F3A8A', color:'#fff', fontWeight:800, fontSize:12, display:'inline-flex', alignItems:'center', justifyContent:'center'}}>{i + 1}</span>
                    <div style={{flex:1, fontWeight:800, fontSize:13.5}}>{s.emoji} {s.title} {s.group ? <span style={{fontSize:11, color:'#6C4FB0', fontWeight:800}}>· {s.group}</span> : null} {s.review ? <span style={{fontSize:10, color:'#fff', background:'#E67E00', borderRadius:8, padding:'2px 7px', fontWeight:800}}>🔁 repaso {s.reviewModule || ''}</span> : null}</div>
                    <button title="Subir" onClick={() => moveStep(i, -1)} disabled={i === 0} style={{...iconBtn, opacity: i === 0 ? .4 : 1}}>↑</button>
                    <button title="Bajar" onClick={() => moveStep(i, 1)} disabled={i === guide.steps.length - 1} style={{...iconBtn, opacity: i === guide.steps.length - 1 ? .4 : 1}}>↓</button>
                    <button title="Quitar" onClick={() => delStep(i)} style={{...iconBtn, color:'#C0392B', borderColor:'#E2B6AE'}}>🗑️</button>
                  </div>

                  {/* Controles según el tipo: tema (resumen/práctica) · nº historia/diálogo (story/lectura) */}
                  {(s.type === 'summary' || s.type === 'grammar') && (
                    <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:8, flexWrap:'wrap'}}>
                      <span style={{fontSize:11.5, fontWeight:800, color:'#6C4FB0'}}>📚 Tema:</span>
                      <select value={s.tema || ''} onChange={e => setStepMeta(i, { tema: e.target.value || null, group: e.target.value || s.group })} style={{...selStyle, width:'auto', minWidth:180}}>
                        <option value="">— Sin tema específico —</option>
                        {allTemas.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  )}
                  {(s.type === 'story' || s.type === 'reading') && (
                    <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:8, flexWrap:'wrap'}}>
                      <span style={{fontSize:11.5, fontWeight:800, color:'#6C4FB0'}}>📖 ¿Qué leer?:</span>
                      <select value={s.storyNo || ''} onChange={e => setStepMeta(i, { storyNo: e.target.value ? Number(e.target.value) : null })} style={{...selStyle, width:'auto'}}>
                        <option value="">Historia —</option>
                        {[1,2,3,4].map(n => <option key={n} value={n}>Historia #{n}</option>)}
                      </select>
                      {s.type === 'story' && (
                        <select value={s.dialogNo || ''} onChange={e => setStepMeta(i, { dialogNo: e.target.value ? Number(e.target.value) : null })} style={{...selStyle, width:'auto'}}>
                          <option value="">Diálogo —</option>
                          {[1,2,3,4].map(n => <option key={n} value={n}>Diálogo #{n}</option>)}
                        </select>
                      )}
                    </div>
                  )}

                  {lang !== 'par' ? (<>
                    <div style={{fontSize:10.5, fontWeight:800, color:'#8a7f6a', textTransform:'uppercase', letterSpacing:'.03em', marginBottom:3}}>Pasos · {lang === 'en' ? 'English' : 'Español'} (uno por línea)</div>
                    <textarea value={((lang === 'en' ? s.linesEn : s.linesEs) || []).join('\n')} onChange={e => updateStep(i, lang === 'en' ? { linesEn: e.target.value.split('\n').filter(x => x.trim() !== '') } : { linesEs: e.target.value.split('\n').filter(x => x.trim() !== '') })} rows={Math.max(2, ((lang === 'en' ? s.linesEn : s.linesEs) || []).length)} style={{width:'100%', border:'1px solid #E3DCC9', borderRadius:9, padding:'8px 10px', fontSize:12.5, fontFamily:'inherit', fontWeight:600, lineHeight:1.5, resize:'vertical', color:'#444'}} />
                    <div style={{display:'flex', alignItems:'center', gap:8, marginTop:7}}>
                      <span style={{fontSize:12, fontWeight:800, color:'#9c6a00'}}>📌</span>
                      <input value={(lang === 'en' ? s.noteEn : s.noteEs) || ''} onChange={e => updateStep(i, lang === 'en' ? { noteEn: e.target.value } : { noteEs: e.target.value })} placeholder="Nota del paso (opcional)" style={{flex:1, border:'1px solid #F2DFB0', background:'#FFFDF7', borderRadius:8, padding:'6px 9px', fontSize:12, fontFamily:'inherit', fontWeight:700, color:'#9c6a00'}} />
                    </div>
                  </>) : (<>
                    <div style={{fontSize:10.5, fontWeight:800, color:'#8a7f6a', textTransform:'uppercase', letterSpacing:'.03em', marginBottom:3}}>Pasos · English (uno por línea)</div>
                    <textarea value={(s.linesEn || []).join('\n')} onChange={e => updateStep(i, { linesEn: e.target.value.split('\n').filter(x => x.trim() !== '') })} rows={Math.max(2, (s.linesEn || []).length)} style={{width:'100%', border:'1px solid #E3DCC9', borderRadius:9, padding:'8px 10px', fontSize:12.5, fontFamily:'inherit', fontWeight:600, lineHeight:1.5, resize:'vertical', color:'#444'}} />
                    <div style={{fontSize:10.5, fontWeight:800, color:'#8a7f6a', textTransform:'uppercase', letterSpacing:'.03em', margin:'8px 0 3px'}}>Traducción · Español</div>
                    <textarea value={(s.linesEs || []).join('\n')} onChange={e => updateStep(i, { linesEs: e.target.value.split('\n').filter(x => x.trim() !== '') })} rows={Math.max(2, (s.linesEs || []).length)} style={{width:'100%', border:'1px solid #E3DCC9', borderRadius:9, padding:'8px 10px', fontSize:12.5, fontFamily:'inherit', fontWeight:600, lineHeight:1.5, resize:'vertical', color:'#777', fontStyle:'italic'}} />
                  </>)}
                </div>
              ))}
            </div>
            <div style={{display:'flex', gap:10, flexWrap:'wrap', marginTop:12}}>
              <button onClick={previewGuide} style={{...btnGhost, borderColor:'#9FB0DA', color:'#3F5BB8'}}>👁️ Ver como lo verá el alumno</button>
              <button onClick={saveFav} style={{...btnGhost, borderColor:'#C9A8E8', color:'#5B3FA0'}}>⭐ Guardar como favorito</button>
              <button onClick={regenGuide} style={btnGhost}>↺ Restaurar pasos oficiales</button>
            </div>
          </>
        )}
      </div>

      {/* 4 · Destino */}
      <div className="scard" style={{marginTop:16}}>
        <div className="sec-head"><div className="sec-title">4 · ¿Cómo se usa?</div></div>
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
          <button onClick={saveAsTemplate} style={{...btnGhost, borderColor:'#C9A8E8', color:'#5B3FA0'}}>⭐ Plantilla</button>
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
  const { GROUPS, MODULE_CATALOG } = window.JUCUM_DATA;
  const [fGroup, setFGroup] = React.useState('all');
  const [fLevel, setFLevel] = React.useState('all');
  const gName = (id) => { const g = GROUPS.find(x => x.id === id); return g ? g.name : (id === 'g1' ? 'Grupo' : '—'); };
  const gLevel = (id) => { const g = GROUPS.find(x => x.id === id); return g ? g.level : null; };
  const levels = Object.keys(MODULE_CATALOG);

  let classPlans = TT.getClassPlans().slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  let practicePlans = TT.getPracticePlans().slice().sort((a, b) => String((b.dates || [])[0] || '').localeCompare(String((a.dates || [])[0] || '')));
  let templates = (TT.getTemplates ? TT.getTemplates() : []);
  if (fGroup !== 'all') { classPlans = classPlans.filter(p => p.groupId === fGroup); practicePlans = practicePlans.filter(p => p.groupId === fGroup); }
  if (fLevel !== 'all') {
    classPlans = classPlans.filter(p => (p.level || gLevel(p.groupId)) === fLevel);
    practicePlans = practicePlans.filter(p => gLevel(p.groupId) === fLevel);
    templates = templates.filter(t => !t.level || t.level === fLevel);
  }
  const classTpls = templates.filter(t => t.kind === 'class');
  const pracTpls = templates.filter(t => t.kind === 'practice');

  const dupClass = (p) => { const copy = { ...p, id: undefined, date: todayYMD(), sessionLabel: (p.sessionLabel || 'Sesión') + ' (copia)' }; TT.upsertClassPlan(copy); onChange(); alert('📋 Plan duplicado para hoy. Ábrelo para ajustar fecha y grupo.'); };
  const dupPractice = (p) => { const copy = { ...p, title: (p.title || 'Práctica') + ' (copia)', dates: [] }; const id = TT.addPracticePlan(copy); onChange(); onOpenPractice({ ...TT.getPracticePlans().find(x => x.id === id) }); };
  const useTpl = (t) => { if (t.kind === 'class') onOpenClass({ ...t.payload, _tpl: true, id: undefined }); else onOpenPractice({ ...t.payload, _tpl: true, id: undefined }); };
  const dupTpl = (t) => { TT.addTemplate({ kind: t.kind, name: t.name + ' (copia)', level: t.level, payload: t.payload }); onChange(); };
  const renameTpl = (t) => { const n = window.prompt('Nuevo nombre de la plantilla:', t.name); if (n && n.trim()) { TT.updateTemplate(t.id, { name: n.trim() }); onChange(); } };
  const setTplLevel = (t, lv) => { TT.updateTemplate(t.id, { level: lv || null }); onChange(); };

  const Row = ({ icon, tint, title, sub, children }) => (
    <div style={{display:'flex', alignItems:'center', gap:11, border:'1px solid #E3DCC9', borderRadius:11, padding:'10px 13px', background: tint || '#FCFAF4', marginBottom:8, flexWrap:'wrap'}}>
      <span style={{fontSize:19}}>{icon}</span>
      <div style={{flex:1, minWidth:140}}><div style={{fontWeight:800, fontSize:13.5}}>{title}</div><div style={{fontSize:11.5, color:'#8a7f6a', fontWeight:700}}>{sub}</div></div>
      <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>{children}</div>
    </div>
  );
  const Lvl = ({ lv }) => lv ? <span style={{fontSize:10, fontWeight:800, color:'#fff', background:'#3F5BB8', borderRadius:10, padding:'2px 7px', marginLeft:6}}>{lv.toUpperCase()}</span> : null;
  const mini = { ...btnGhost, padding:'5px 10px', fontSize:12 };

  return (
    <>
      <div className="scard" style={{marginBottom:16}}>
        <div style={{display:'flex', alignItems:'center', gap:9, flexWrap:'wrap'}}>
          <span style={{fontSize:12, fontWeight:800, color:'#8a7f6a', textTransform:'uppercase', letterSpacing:'.03em'}}>🔎 Filtrar</span>
          <select value={fGroup} onChange={e => setFGroup(e.target.value)} style={{...selStyle, width:'auto', minWidth:150}}>
            <option value="all">Todos los grupos</option>
            {GROUPS.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select value={fLevel} onChange={e => setFLevel(e.target.value)} style={{...selStyle, width:'auto', minWidth:120}}>
            <option value="all">Todos los niveles</option>
            {levels.map(lv => <option key={lv} value={lv}>{lv.toUpperCase()}</option>)}
          </select>
          <span style={{fontSize:11.5, color:'#A8A8A8', fontWeight:700}}>Aquí ves TODO lo que has hecho, de cualquier grupo o fecha.</span>
        </div>
      </div>

      <div className="scard" style={{marginBottom:16}}>
        <div className="sec-head"><div className="sec-title">📘 Planes de clase <span style={{fontSize:12, color:'#8a7f6a'}}>({classPlans.length})</span></div></div>
        {classPlans.length === 0 ? <div className="empty-state" style={{padding:'16px 0'}}><div className="icon">📭</div>Sin planes de clase con este filtro.</div>
          : classPlans.map(p => <Row key={p.id} icon="📘" tint="#EEF2FC" title={<>{p.moduleName} · {p.sessionLabel}<Lvl lv={p.level} /></>} sub={`${gName(p.groupId)} · ${p.date || 's/fecha'} · ${p.lengthMin} min`}>
              <button onClick={() => onOpenClass(p)} style={mini}>Abrir</button>
              <button onClick={() => dupClass(p)} style={mini}>⧉ Duplicar</button>
              <button onClick={() => { if (window.confirm('¿Eliminar este plan de clase?')) { TT.deleteClassPlan(p.id); onChange(); } }} style={{...iconBtn, color:'#C0392B'}}>×</button>
            </Row>)}
      </div>

      <div className="scard" style={{marginBottom:16}}>
        <div className="sec-head"><div className="sec-title">📝 Sets de práctica <span style={{fontSize:12, color:'#8a7f6a'}}>({practicePlans.length})</span></div></div>
        {practicePlans.length === 0 ? <div className="empty-state" style={{padding:'16px 0'}}><div className="icon">📭</div>Sin sets de práctica con este filtro.</div>
          : practicePlans.map(p => <Row key={p.id} icon="📝" tint="#F4EEFB" title={p.title} sub={`${gName(p.groupId)} · ${(p.activities || []).length} act. · ${(p.dates || []).length} día(s) · ${p.assignToStudents !== false ? '👥 alumnos' : '🙋 solo tú'}`}>
              <button onClick={() => onOpenPractice(p)} style={mini}>Abrir</button>
              <button onClick={() => dupPractice(p)} style={mini}>⧉ Duplicar</button>
              <button onClick={() => { if (window.confirm('¿Eliminar este set de práctica?')) { TT.deletePracticePlan(p.id); onChange(); } }} style={{...iconBtn, color:'#C0392B'}}>×</button>
            </Row>)}
      </div>

      <div className="scard" style={{marginBottom:16}}>
        <div className="sec-head"><div className="sec-title">⭐ Plantillas de clase <span style={{fontSize:12, color:'#8a7f6a'}}>({classTpls.length})</span></div></div>
        {classTpls.length === 0 ? <div className="empty-state" style={{padding:'16px 0'}}><div className="icon">📭</div>Guarda un plan como plantilla (botón ⭐ en el editor) para reutilizarlo.</div>
          : classTpls.map(t => <Row key={t.id} icon="⭐" tint="#FBF7FF" title={<>{t.name}<Lvl lv={t.level} /></>} sub={`Plantilla de clase · ${(t.payload.blocks || []).length} bloques · ${t.payload.lengthMin || '—'} min`}>
              <button onClick={() => useTpl(t)} style={{...mini, borderColor:'#9FB0DA', color:'#3F5BB8'}}>Usar</button>
              <button onClick={() => dupTpl(t)} style={mini}>⧉ Duplicar</button>
              <button onClick={() => renameTpl(t)} style={mini}>✎ Renombrar</button>
              <select value={t.level || ''} onChange={e => setTplLevel(t, e.target.value)} style={{...selStyle, width:'auto', padding:'4px 7px', fontSize:11}}><option value="">Nivel —</option>{levels.map(lv => <option key={lv} value={lv}>{lv.toUpperCase()}</option>)}</select>
              <button onClick={() => { if (window.confirm('¿Eliminar esta plantilla?')) { TT.deleteTemplate(t.id); onChange(); } }} style={{...iconBtn, color:'#C0392B'}}>×</button>
            </Row>)}
      </div>

      <div className="scard">
        <div className="sec-head"><div className="sec-title">⭐ Plantillas de práctica <span style={{fontSize:12, color:'#8a7f6a'}}>({pracTpls.length})</span></div></div>
        {pracTpls.length === 0 ? <div className="empty-state" style={{padding:'16px 0'}}><div className="icon">📭</div>Guarda un set como plantilla (botón ⭐ en el editor) para reutilizarlo.</div>
          : pracTpls.map(t => <Row key={t.id} icon="⭐" tint="#FBF7FF" title={<>{t.name}<Lvl lv={t.level} /></>} sub={`Plantilla de práctica · ${(t.payload.activities || []).length} actividad(es)`}>
              <button onClick={() => useTpl(t)} style={{...mini, borderColor:'#C9A8E8', color:'#5B3FA0'}}>Usar</button>
              <button onClick={() => dupTpl(t)} style={mini}>⧉ Duplicar</button>
              <button onClick={() => renameTpl(t)} style={mini}>✎ Renombrar</button>
              <select value={t.level || ''} onChange={e => setTplLevel(t, e.target.value)} style={{...selStyle, width:'auto', padding:'4px 7px', fontSize:11}}><option value="">Nivel —</option>{levels.map(lv => <option key={lv} value={lv}>{lv.toUpperCase()}</option>)}</select>
              <button onClick={() => { if (window.confirm('¿Eliminar esta plantilla?')) { TT.deleteTemplate(t.id); onChange(); } }} style={{...iconBtn, color:'#C0392B'}}>×</button>
            </Row>)}
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
function fmtLogClock(v) { if (!v) return '—'; const m = String(v).match(/(\d{1,2}):(\d{2})/); if (!m) return String(v); let h = +m[1]; const ap = h >= 12 ? 'p. m.' : 'a. m.'; h = h % 12 || 12; return `${h}:${m[2]} ${ap}`; }
const lblStyle = { fontSize:10.5, fontWeight:800, letterSpacing:'0.06em', textTransform:'uppercase', color:'#8a7f6a', marginBottom:7 };
const mutedStyle = { fontSize:12.5, color:'#a8a29a', fontWeight:700, fontStyle:'italic' };
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
