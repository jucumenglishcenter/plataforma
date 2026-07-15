/* Bloque J · Exámenes — UI profesor + alumno
 * Profesor: define exámenes (varias partes/competencias con su HTML), abre el
 * "momento" para un grupo/alumnos, ve preparación (apto ≥75%), habilita a quien
 * decida pese a no llegar (última palabra), y registra resultado.
 * Alumno: ve su examen solo cuando está abierto y es apto/habilitado; abre cada
 * parte; sube material (ej. audio de Speaking); ve su resultado.
 */

const { useState: exUseState } = React;

function compLabel(key) {
  const c = (window.JUCUM_DATA.COMPETENCIES || []).find(x => x.key === key);
  return c ? `${c.icon} ${c.label}` : '📑 ' + key;
}
const COMP_OPTIONS = [
  { key:'listening', l:'🎧 Comprensión auditiva' },
  { key:'reading',   l:'📖 Comprensión lectora' },
  { key:'grammar',   l:'📝 Gramática' },
  { key:'speaking',  l:'🗣️ Speaking' },
  { key:'writing',   l:'✍️ Writing' },
  { key:'other',     l:'📑 Otra' },
];

/* ═══════════════ PROFESOR ═══════════════ */

/* Mini-diagnóstico por alumno (competencias más débiles) para crear estrategias */
function examDiagnosis(student, r) {
  const D = window.JUCUM_DATA;
  const comps = (D.COMPETENCIES || []).map(c => ({ c, v: r.competencies?.[c.key] }))
    .filter(x => typeof x.v === 'number').sort((a,b) => a.v - b.v);
  if (comps.length === 0) return 'Sin datos suficientes para diagnosticar.';
  const weak = comps.filter(x => x.v < 60).slice(0,2);
  if (weak.length === 0) return `Domina bien sus competencias (más baja: ${comps[0].c.label} ${comps[0].v}%). Reforzar para perfeccionar.`;
  return `Reforzar ${weak.map(x => `${x.c.label} (${x.v}%)`).join(' y ')}. Sugerir práctica enfocada antes del próximo examen.`;
}

function TeacherExams({ onBack, canDefine, hideBack }) {
  const { LEVELS } = window.JUCUM_DATA;
  const X = window.JUCUM_EXAMS;
  const [tab, setTab] = exUseState('modules');
  const [editing, setEditing] = exUseState(null); // 'new' | exam
  const [opening, setOpening] = exUseState(false);
  const [demoOpen, setDemoOpen] = exUseState(false);
  const [tick, setTick] = exUseState(0);
  const refresh = () => setTick(t => t + 1);

  const exams = X.getExams();
  const windows = X.getWindows();

  return (
    <main>
      {!hideBack && <button className="back-btn" onClick={onBack}>← Volver al panel</button>}
      <div className="welcome teacher">
        <div className="welcome-text">
          <div className="eyebrow">🎓 Exámenes</div>
          <h1>Exámenes de avance</h1>
          <p>{canDefine ? 'Define tus exámenes (un HTML por competencia). La plataforma marca apto al 75%.' : 'Abre el examen para tu grupo cuando toque, califica y comparte resultados. Solo Desarrollo define el contenido.'}</p>
        </div>
        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          {canDefine && <button className="btn-settings" onClick={() => setEditing('new')}>+ Definir examen</button>}
          <button className="btn-settings" onClick={() => setOpening(true)} disabled={exams.length===0}>📅 Abrir examen</button>
          <button className="btn-settings" onClick={() => setDemoOpen(true)}>🧪 Examen de prueba</button>
        </div>
      </div>

      <div className="mm-tabs">
        <button className={`mm-tab ${tab==='modules'?'on':''}`} onClick={() => setTab('modules')}>📚 Por módulo</button>
        <button className={`mm-tab ${tab==='windows'?'on':''}`} onClick={() => setTab('windows')}>📅 Aperturas <span className="mm-count">{windows.length}</span></button>
        {canDefine && <button className={`mm-tab ${tab==='define'?'on':''}`} onClick={() => setTab('define')}>📑 Definidos <span className="mm-count">{exams.length}</span></button>}
        {canDefine && <button className={`mm-tab ${tab==='weights'?'on':''}`} onClick={() => setTab('weights')}>⚖️ Peso examen</button>}
      </div>

      <ExamReadyBanner />

      {tab === 'modules' ? <ModuleExamPanel onChange={refresh} /> : tab === 'weights' && canDefine ? <ModuleWeightPanel /> : tab === 'define' && canDefine ? (
        exams.length === 0
          ? <div className="scard"><div className="empty-state"><div className="icon">📑</div>Aún no defines exámenes. Crea el primero.</div></div>
          : <div className="mm-list">
              {exams.map(e => (
                <div key={e.id} className="scard mm-card">
                  <div className="mm-emoji">📑</div>
                  <div className="mm-info">
                    <div className="mm-name">{e.title}</div>
                    <div className="mm-meta">{LEVELS[e.level]?.code || e.level} · {(e.parts||[]).length} parte{(e.parts||[]).length===1?'':'s'} · {(e.moduleIds||[]).length} módulo(s)</div>
                    <div className="mm-topics">{(e.parts||[]).map((p,i) => <span key={i} className="mm-chip">{compLabel(p.competency)}</span>)}</div>
                  </div>
                  <div className="mm-actions">
                    <button className="att-btn" onClick={() => setEditing(e)}>✏️ Editar</button>
                    <button className="att-btn" style={{borderColor:'#EF9A9A',color:'#C62828'}} onClick={() => { if (confirm('¿Eliminar este examen y sus ventanas?')) { X.deleteExam(e.id); refresh(); } }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
      ) : (
        windows.length === 0
          ? <div className="scard"><div className="empty-state"><div className="icon">📅</div>No has abierto ningún examen. Usa “Abrir examen”.</div></div>
          : <div style={{display:'flex', flexDirection:'column', gap:14}}>
              {windows.map(w => <WindowCard key={w.id} w={w} onChange={refresh} />)}
            </div>
      )}

      {editing && <ExamForm exam={editing==='new'?null:editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
      {opening && <WindowForm onClose={() => setOpening(false)} onSaved={() => { setOpening(false); setTab('windows'); refresh(); }} />}
      {demoOpen && <DemoExamModal onClose={() => setDemoOpen(false)} onDone={() => { setDemoOpen(false); setTab('windows'); refresh(); }} />}
    </main>
  );
}

/* Aviso al profesor: grupos cuyo cumplimiento cruzó el 75% → listos para examen */
function ExamReadyBanner() {
  const X = window.JUCUM_EXAMS;
  const ready = (X.groupsReadyForExam ? X.groupsReadyForExam() : []).filter(g => g.crossed);
  if (ready.length === 0) return null;
  return (
    <div className="scard" style={{margin:'14px 0', background:'#E8F5E9', borderColor:'#A5D6A7'}}>
      <div className="sec-head"><div className="sec-title" style={{color:'#2E7D32'}}>🎯 Listos para examen</div></div>
      <div style={{fontSize:13, lineHeight:1.55, color:'#1B5E20'}}>
        {ready.map(g => (
          <div key={g.group.id} style={{display:'flex', alignItems:'center', gap:10, marginBottom:6, flexWrap:'wrap'}}>
            <span><b>{g.group.name}</b>: {g.ready}/{g.total} alumnos superaron el 75% (promedio {g.pct}%).</span>
            <button className="att-btn" onClick={() => { const n = window.JUCUM_EXAMS.notifyExamSoon(g.group.id); alert(`🔔 Aviso enviado a ${n} alumno(s) de ${g.group.name}: su examen se acerca (recordándoles el 75%).`); }}>🔔 Avisar examen próximo</button>
          </div>
        ))}
        <div style={{marginTop:6}}>Este grupo ya invirtió el trabajo y la constancia necesarios. Es buen momento para tomarles un examen y que <b>demuestren cuánto del módulo dominan</b> — una oportunidad para que ellos (y sus familias) vean su avance reflejado. 💪</div>
      </div>
    </div>
  );
}

function WindowCard({ w, onChange }) {
  const { STUDENTS, GROUPS, LEVELS, getStudentReadiness } = window.JUCUM_DATA;
  const X = window.JUCUM_EXAMS;
  const exam = X.getExam(w.examId);
  const group = GROUPS.find(g => g.id === w.groupId);
  const recips = X.recipientsOfWindow(w, STUDENTS);
  const [grading, setGrading] = exUseState(null);
  const closed = w.closesAt && new Date(w.closesAt) < new Date();

  /* 🔎 Avance EN VIVO desde la nube: notas por parte + salidas de pestaña (part 99) */
  const [live, setLive] = exUseState(null);
  const [liveBusy, setLiveBusy] = exUseState(false);
  const loadLive = async () => {
    const S = window.JUCUM_SYNC;
    if (!S || !S.fetchModuleProgress) { alert('Sin conexión con la nube.'); return; }
    setLiveBusy(true);
    try {
      const rows = await S.fetchModuleProgress('exam-' + w.examId);
      const parts = await S.fetchModuleParts('exam-' + w.examId);
      const by = {};
      rows.forEach(r0 => { by[r0.user_id] = by[r0.user_id] || { parts:{}, focus:null }; by[r0.user_id].parts[r0.activity_id] = { score: r0.score, minutes: r0.minutes }; });
      parts.forEach(p => { by[p.user_id] = by[p.user_id] || { parts:{}, focus:null }; if (Number(p.part) === 99) by[p.user_id].focus = p.score; });
      setLive(by);
    } catch (e) { alert('No se pudo leer el avance del examen.'); }
    setLiveBusy(false);
  };
  const liveSug = (sid) => {
    if (!live || !live[sid] || !exam) return null;
    const map = {};
    Object.entries(live[sid].parts).forEach(([k, v]) => { if (typeof v.score === 'number') map[k] = v.score; });
    return X.suggestedGrade(exam, map);
  };

  return (
    <div className="scard">
      <div className="sec-head">
        <div className="sec-title">📑 {exam?.title || 'Examen'}</div>
        <button className="att-btn" style={{borderColor:'#EF9A9A',color:'#C62828'}} onClick={() => { if (confirm('¿Eliminar esta apertura de examen?')) { X.deleteWindow(w.id); onChange(); } }}>🗑</button>
      </div>
      <div className="mm-meta" style={{marginBottom:10}}>
        {group ? `${LEVELS[group.level]?.emoji||''} ${group.name}` : 'grupo'} · {recips.length} alumno(s)
        {w.closesAt && <span style={{color: closed?'#C62828':'#E65100', fontWeight:800}}> · ⏰ {closed?'Cerró':'Cierra'} {new Date(w.closesAt).toLocaleString('es-PE',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span>}
      </div>

      <div className="row-flex" style={{marginBottom:12}}>
        <button className={`preset ${w.isOpen?'on':''}`} onClick={() => { X.setWindowOpen(w.id, true); onChange(); }}>🟢 Abierto</button>
        <button className={`preset ${!w.isOpen?'on':''}`} onClick={() => { X.setWindowOpen(w.id, false); onChange(); }}>⚪ Cerrado</button>
        <span className="settings-hint" style={{margin:0}}>{w.isOpen ? 'Los alumnos aptos (o habilitados) ya pueden verlo.' : 'Oculto para los alumnos.'}</span>
      </div>

      <div className="row-flex" style={{marginBottom:12}}>
        {w.published
          ? <><span className="mm-chip" style={{background:'#E8F5E9',color:'#2E7D32'}}>✅ Resultados compartidos</span><button className="att-btn" onClick={()=>{ X.unpublishResults(w.id); onChange(); }}>Ocultar resultados</button></>
          : <button className="btn-save" onClick={()=>{ if(confirm('¿Compartir las notas con los alumnos? Recibirán su resultado y retroalimentación.')){ X.publishResults(w.id); onChange(); } }}>📤 Compartir resultados</button>}
        <span className="settings-hint" style={{margin:0}}>{w.published ? 'Los alumnos ya ven su nota.' : 'Calificas en privado; comparte cuando decidas.'}</span>
      </div>

      <div className="row-flex" style={{marginBottom:12}}>
        <button className="att-btn" onClick={loadLive} disabled={liveBusy}>🔎 {liveBusy ? 'Consultando…' : live ? 'Actualizar avance en vivo' : 'Ver avance en vivo'}</button>
        <span className="settings-hint" style={{margin:0}}>{live ? 'Notas por parte + salidas de pestaña (⚠), leídas de la nube.' : 'Lee de la nube qué partes rindió cada alumno y si salió de la pestaña.'}</span>
      </div>

      <div className="sm-list">
        {[...recips].sort((a,b) => {
          const ga = (w.results||{})[a.id], gb = (w.results||{})[b.id];
          const va = typeof ga?.grade==='number' ? ga.grade : (ga?.passed ? 1 : -1);
          const vb = typeof gb?.grade==='number' ? gb.grade : (gb?.passed ? 1 : -1);
          return vb - va;
        }).map((s, rank) => {
          const r = getStudentReadiness(s);
          const overridden = (w.allowOverrides||[]).includes(s.id);
          const canTake = r.apt || overridden;
          const res = (w.results||{})[s.id];
          const sub = (w.submissions||{})[s.id];
          const level = LEVELS[s.level];
          const diag = examDiagnosis(s, r);
          return (
            <div key={s.id} className="sm-row" style={{flexWrap:'wrap'}}>
              {res && <span style={{fontWeight:800, color:'#888', width:22, textAlign:'center'}}>{rank+1}</span>}
              <div className="st-ava" style={{background:`linear-gradient(135deg,${level.color}80,${level.dark})`}}>{s.fullName.split(' ').map(n=>n[0]).slice(0,2).join('')}</div>
              <div className="sm-info">
                <div className="sm-name">{s.fullName}</div>
                <div className="sm-meta">Preparación {r.overall}% · {r.apt ? '✅ apto' : '⚠ no apto'}{sub ? ' · entregó material' : ''}</div>
                {live && (() => {
                  const lv = live[s.id];
                  if (!lv) return <div className="sm-meta" style={{color:'#A8A8A8'}}>🕒 examen sin iniciar</div>;
                  const sug = liveSug(s.id);
                  return (
                    <div className="sm-meta" style={{color:'#1B5E20', fontWeight:700}}>
                      {(exam?.parts||[]).map((p,i) => { const e2 = lv.parts[p.competency]; const ic = (compLabel(p.competency)||'📑').split(' ')[0]; return <span key={i} style={{marginRight:8}}>{ic} {e2 && typeof e2.score==='number' ? e2.score+'%' : '—'}</span>; })}
                      {sug != null && <span style={{color:'#1565C0'}}>→ sugerida {sug}/100</span>}
                      <span style={{marginLeft:8, color: lv.focus>0 ? '#C62828' : '#2E7D32'}}>{lv.focus>0 ? `⚠ salió ${lv.focus}× de la pestaña` : '✓ sin salidas'}</span>
                    </div>
                  );
                })()}
                {res && <div className="sm-meta" style={{color:'#1565C0'}}>🧩 {diag}</div>}
              </div>
              {res
                ? <span className="mm-chip" style={{background: res.passed?'#E8F5E9':'#FFEBEE', color: res.passed?'#2E7D32':'#C62828'}}>{res.passed?'Aprobó':'Reprobó'}{typeof res.grade==='number'?` · ${res.grade}`:''}</span>
                : <label className="check-row" title="Habilitar pese a no llegar al 75%"><input type="checkbox" checked={canTake} disabled={r.apt} onChange={() => { X.toggleOverride(w.id, s.id); onChange(); }} /><span style={{fontSize:12}}>{r.apt ? 'Apto' : 'Habilitar'}</span></label>}
              <button className="att-btn" onClick={() => setGrading(s)}>📊 Resultado</button>
              {sub && sub.attachments?.length > 0 && (
                <div className="att-list" style={{flexBasis:'100%', marginTop:8}}>
                  {sub.attachments.map((a,i) => <window.TaskAttachmentChip key={i} att={a} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {grading && <ExamGradeModal w={w} student={grading} suggested={liveSug(grading.id)} onClose={() => { setGrading(null); onChange(); }} />}
    </div>
  );
}

function ExamGradeModal({ w, student, suggested, onClose }) {
  const res = (w.results||{})[student.id] || {};
  const [grade, setGrade] = exUseState(typeof res.grade==='number' ? res.grade : (typeof suggested==='number' ? suggested : 75));
  const [withGrade, setWithGrade] = exUseState(typeof res.grade==='number' || true);
  const [passed, setPassed] = exUseState(res.passed ?? true);
  const [feedback, setFeedback] = exUseState(res.feedback || '');
  const save = () => { window.JUCUM_EXAMS.gradeExam(w.id, student.id, withGrade?grade:null, passed, feedback.trim()); onClose(); };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" style={{maxWidth:520}} onClick={e=>e.stopPropagation()}>
        <div className="modal-head"><div className="modal-title">📊 Resultado · {student.fullName}</div><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div className="settings-block">
            <div className="preset-row">
              <button className={`preset ${passed?'on':''}`} onClick={()=>setPassed(true)}>✅ Aprobó</button>
              <button className={`preset ${!passed?'on':''}`} onClick={()=>setPassed(false)}>❌ Reprobó</button>
            </div>
          </div>
          <div className="settings-block">
            <label className="check-row"><input type="checkbox" checked={withGrade} onChange={e=>setWithGrade(e.target.checked)} /><span>Ponerle nota</span></label>
            {withGrade && <div className="row-flex" style={{marginTop:8}}><input type="range" min="0" max="100" value={grade} onChange={e=>setGrade(parseInt(e.target.value))} className="slider-input" /><div className="target-val">{grade}<span>/100</span></div></div>}
            {typeof suggested === 'number' && <div className="settings-hint" style={{marginTop:6}}>🔎 Nota sugerida por sus partes rendidas: <b>{suggested}/100</b> (usa “Ver avance en vivo” para actualizarla).</div>}
          </div>
          <div className="settings-block">
            <div className="settings-label">Retroalimentación</div>
            <textarea className="eval-textarea" rows={3} value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="Comentarios para el alumno…" />
          </div>
          <div className="modal-actions"><button className="btn-cancel" onClick={onClose}>Cancelar</button><button className="btn-save" onClick={save}>💾 Enviar resultado</button></div>
        </div>
      </div>
    </div>
  );
}

function ExamForm({ exam, onClose, onSaved }) {
  const { LEVELS, MODULE_CATALOG } = window.JUCUM_DATA;
  const [title, setTitle] = exUseState(exam?.title || '');
  const [level, setLevel] = exUseState(exam?.level || 'pre-a1');
  const [moduleIds, setModuleIds] = exUseState(exam?.moduleIds || []);
  const [parts, setParts] = exUseState(exam?.parts?.length ? exam.parts.map(p=>({...p})) : [{ competency:'listening', name:'', url:'' }]);
  const [err, setErr] = exUseState('');
  const mods = MODULE_CATALOG[level] || [];

  const toggleMod = (id) => setModuleIds(m => m.includes(id) ? m.filter(x=>x!==id) : [...m, id]);
  const setPart = (i,k,v) => { const n=[...parts]; n[i]={...n[i],[k]:v}; setParts(n); };
  const addPart = () => setParts([...parts, { competency:'reading', name:'', url:'' }]);
  const delPart = (i) => setParts(parts.filter((_,j)=>j!==i));

  const save = () => {
    if (!title.trim()) { setErr('Ponle un título al examen.'); return; }
    if (parts.some(p => !p.url.trim())) { setErr('Cada parte necesita la URL de su HTML.'); return; }
    const data = { level, title: title.trim(), moduleIds,
      parts: parts.map(p => ({ competency:p.competency, name:(p.name||'').trim()||compLabel(p.competency), url:p.url.trim() })) };
    if (exam) window.JUCUM_EXAMS.updateExam(exam.id, data); else window.JUCUM_EXAMS.createExam(data);
    onSaved();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" style={{maxWidth:680}} onClick={e=>e.stopPropagation()}>
        <div className="modal-head"><div className="modal-title">{exam?'✏️ Editar examen':'📑 Nuevo examen'}</div><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          {err && <div className="err" style={{marginBottom:12}}>⚠ {err}</div>}
          <div className="settings-block">
            <div className="settings-label">Título</div>
            <input className="input-text" style={{width:'100%'}} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ej: Examen de avance · Módulo 1" />
          </div>
          <div className="settings-block">
            <div className="settings-label">Nivel</div>
            <div className="preset-row">
              {Object.entries(LEVELS).map(([k,lv]) => <button key={k} className={`preset ${level===k?'on':''}`} onClick={()=>{ setLevel(k); setModuleIds([]); }}>{lv.emoji} {lv.code}</button>)}
            </div>
          </div>
          <div className="settings-block">
            <div className="settings-label">Módulos que cubre (uno o varios)</div>
            <div style={{display:'grid', gap:6}}>
              {mods.map(m => <label key={m.id} className="check-row"><input type="checkbox" checked={moduleIds.includes(m.id)} onChange={()=>toggleMod(m.id)} /><span>{m.emoji} {m.name}</span></label>)}
              {mods.length===0 && <div className="settings-hint">Ese nivel no tiene módulos.</div>}
            </div>
          </div>
          <div className="settings-block">
            <div className="settings-label">Partes del examen (un HTML por competencia · peso opcional)</div>
            <div className="settings-hint" style={{marginBottom:6}}>Si dejas los pesos vacíos, todas las partes valen igual. Si los llenas, se reparten proporcionalmente.</div>
            <div className="mm-acts">
              {parts.map((p,i) => (
                <div key={i} className="mm-act-row" style={{gridTemplateColumns:'170px 1fr 1.2fr 90px auto'}}>
                  <select className="input-text" value={p.competency} onChange={e=>setPart(i,'competency',e.target.value)}>
                    {COMP_OPTIONS.map(c => <option key={c.key} value={c.key}>{c.l}</option>)}
                  </select>
                  <input className="input-text" placeholder="Nombre (opcional)" value={p.name} onChange={e=>setPart(i,'name',e.target.value)} />
                  <input className="input-text" placeholder="URL del HTML (GitHub Pages)" value={p.url} onChange={e=>setPart(i,'url',e.target.value)} />
                  <input className="input-text" type="number" min="0" max="100" placeholder="Peso %" title="Peso de esta parte (%)" value={p.weight ?? ''} onChange={e=>setPart(i,'weight', e.target.value===''?'':parseInt(e.target.value)||0)} />
                  <button type="button" className="att-btn" style={{borderColor:'#EF9A9A',color:'#C62828'}} onClick={()=>delPart(i)}>✕</button>
                </div>
              ))}
            </div>
            <div className="mm-add-row"><button type="button" className="att-btn" onClick={addPart}>+ Agregar parte</button></div>
          </div>
          <div className="modal-actions"><button className="btn-cancel" onClick={onClose}>Cancelar</button><button className="btn-save" onClick={save}>{exam?'💾 Guardar':'📑 Crear examen'}</button></div>
        </div>
      </div>
    </div>
  );
}

function WindowForm({ onClose, onSaved }) {
  const { GROUPS, STUDENTS, LEVELS } = window.JUCUM_DATA;
  const X = window.JUCUM_EXAMS;
  const exams = X.getExams();
  const [examId, setExamId] = exUseState(exams[0]?.id || '');
  const [groupId, setGroupId] = exUseState(GROUPS[0]?.id || '');
  const [mode, setMode] = exUseState('group');
  const [picked, setPicked] = exUseState([]);
  const [closesAt, setClosesAt] = exUseState('');
  const [openNow, setOpenNow] = exUseState(true);
  const [err, setErr] = exUseState('');
  const groupStudents = STUDENTS.filter(s => s.group === groupId);

  const save = () => {
    if (!examId) { setErr('Elige un examen.'); return; }
    if (mode==='students' && picked.length===0) { setErr('Elige al menos un alumno.'); return; }
    X.createWindow({ examId, groupId, targetStudentIds: mode==='students'?picked:[], isOpen: openNow, closesAt: closesAt?new Date(closesAt).toISOString():null });
    onSaved();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" style={{maxWidth:600}} onClick={e=>e.stopPropagation()}>
        <div className="modal-head"><div className="modal-title">📅 Abrir examen</div><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          {err && <div className="err" style={{marginBottom:12}}>⚠ {err}</div>}
          <div className="settings-block">
            <div className="settings-label">Examen</div>
            <select className="input-text" style={{width:'100%'}} value={examId} onChange={e=>setExamId(e.target.value)}>
              {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
          </div>
          <div className="settings-block">
            <div className="settings-label">Grupo</div>
            <select className="input-text" style={{width:'100%'}} value={groupId} onChange={e=>{ setGroupId(e.target.value); setPicked([]); }}>
              {GROUPS.map(g => <option key={g.id} value={g.id}>{LEVELS[g.level]?.emoji} {g.name}</option>)}
            </select>
          </div>
          <div className="settings-block">
            <div className="settings-label">¿A quién?</div>
            <div className="preset-row">
              <button className={`preset ${mode==='group'?'on':''}`} onClick={()=>setMode('group')}>👥 Todo el grupo</button>
              <button className={`preset ${mode==='students'?'on':''}`} onClick={()=>setMode('students')}>🎯 Alumnos puntuales</button>
            </div>
            {mode==='students' && <div style={{marginTop:10, display:'grid', gap:6, maxHeight:200, overflowY:'auto'}}>
              {groupStudents.map(s => <label key={s.id} className="check-row"><input type="checkbox" checked={picked.includes(s.id)} onChange={()=>setPicked(p=>p.includes(s.id)?p.filter(x=>x!==s.id):[...p,s.id])} /><span>{s.fullName}</span></label>)}
            </div>}
          </div>
          <div className="settings-block">
            <div className="settings-label">Cierre automático (opcional)</div>
            <input type="datetime-local" className="input-text" value={closesAt} onChange={e=>setClosesAt(e.target.value)} />
          </div>
          <div className="settings-block">
            <label className="check-row"><input type="checkbox" checked={openNow} onChange={e=>setOpenNow(e.target.checked)} /><span>Abrir ahora (visible para los alumnos aptos de inmediato)</span></label>
          </div>
          <div className="modal-actions"><button className="btn-cancel" onClick={onClose}>Cancelar</button><button className="btn-save" onClick={save}>📅 Abrir examen</button></div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ ALUMNO ═══════════════ */
function StudentExams({ user, onBack }) {
  const { STUDENTS } = window.JUCUM_DATA;
  const X = window.JUCUM_EXAMS;
  const student = STUDENTS.find(s => s.id === user.studentId) || STUDENTS[0];
  const [tick, setTick] = exUseState(0);
  const windows = X.openWindowsForStudent(student);

  return (
    <main>
      <button className="back-btn" onClick={onBack}>← Volver al panel</button>
      <div className="welcome">
        <div className="welcome-text">
          <div className="eyebrow">🎓 Examen</div>
          <h1>Mi examen de avance</h1>
          <p>Tu examen aparece aquí cuando el profesor lo habilita y alcanzas tu preparación.</p>
        </div>
      </div>

      <ModuleResultsBlock student={student} />

      {windows.length === 0 ? (
        <>
          <div className="scard" style={{marginTop:18}}><div className="empty-state"><div className="icon">🎓</div>Por ahora no tienes ningún examen habilitado. Tu profesor lo abrirá cuando corresponda — sigue practicando para llegar listo.</div></div>
          <div style={{marginTop:14}}><window.ReadinessCard student={student} /></div>
        </>
      ) : (
        <div style={{marginTop:18, display:'flex', flexDirection:'column', gap:14}}>
          {windows.map(w => <StudentExamCard key={w.id} w={w} student={student} onChange={()=>setTick(t=>t+1)} />)}
        </div>
      )}
    </main>
  );
}

function StudentExamCard({ w, student, onChange }) {
  const X = window.JUCUM_EXAMS;
  const exam = X.getExam(w.examId);
  const canTake = X.canTakeWindow(student, w);
  const res = w.published ? (w.results||{})[student.id] : null;
  const sub = (w.submissions||{})[student.id];
  const [attachments, setAttachments] = exUseState(sub?.attachments || []);
  if (!exam) return null;

  if (!canTake) {
    return (
      <div className="scard">
        <div className="sec-head"><div className="sec-title">🔒 {exam.title}</div><span className="mm-chip" style={{background:'#FFF8E1',color:'#E65100'}}>Aún no habilitado</span></div>
        <div className="fpost-body" style={{marginBottom:10}}>Tu examen está abierto, pero todavía no alcanzas el <b>75% de cumplimiento</b> para rendirlo. La preparación sube con la <b>constancia</b>: practica cada día y entrega tus tareas. ¡Tú puedes! 💪</div>
        <window.ReadinessCard student={student} />
      </div>
    );
  }

  return (
    <div className="scard">
      <div className="sec-head">
        <div className="sec-title">🎓 {exam.title}</div>
        {res
          ? <span className="mm-chip" style={{background: res.passed?'#E8F5E9':'#FFEBEE', color: res.passed?'#2E7D32':'#C62828'}}>{res.passed?'Aprobaste':'No aprobaste'}{typeof res.grade==='number'?` · ${res.grade}/100`:''}</span>
          : <span className="mm-chip" style={{background:'#E8F5E9',color:'#2E7D32'}}>✓ Habilitado</span>}
      </div>

      {res && res.feedback && <div className="eval-feedback" style={{marginBottom:10}}><div className="eval-fb-lbl">📝 Del profesor</div><div className="eval-fb-text">{res.feedback}</div></div>}

      {!res && (
        <div style={{background:'#FFF5F5', border:'1.5px solid #F2B8B5', borderRadius:12, padding:'11px 14px', marginBottom:12, fontSize:12.5, lineHeight:1.6, color:'#8C1D18', fontWeight:700}}>
          📵 <b>Al rendir:</b> quédate SOLO en la pestaña del examen — cada salida queda <b>registrada</b> y tu profesor la verá. 💾 Tus respuestas escritas se guardan solas: si se corta el internet, vuelve a abrir desde aquí (mismo equipo) y continúas. 1️⃣ Vale tu <b>primer intento</b>. ¡Éxito! 💪
        </div>
      )}

      <div className="al-items">
        {(exam.parts||[]).map((p,i) => {
          const href = X.examPartLink(p, exam.id, student.id);
          return (
            <a key={i} className={`al-item ${href?'open':'locked'}`} href={href||undefined} target={href?'_blank':undefined} rel="noreferrer">
              <span className="al-num">{i+1}</span>
              <span className="al-name">{p.name || compLabel(p.competency)}</span>
              {href ? <span className="al-arr">↗</span> : <span className="al-score" style={{background:'#EEE',color:'#999'}}>sin URL</span>}
            </a>
          );
        })}
      </div>

      <div style={{marginTop:12, paddingTop:12, borderTop:'1px dashed var(--border)'}}>
        <div className="eval-fb-lbl">Subir material (opcional · ej. audio de tu Speaking)</div>
        <window.TaskFilePicker attachments={attachments} setAttachments={setAttachments} allowRecord={true} />
        <div style={{display:'flex', justifyContent:'flex-end', marginTop:10}}>
          <button className="btn-save" onClick={() => { X.submitExam(w.id, student.id, { attachments }); onChange(); }}>{sub?'🔄 Actualizar entrega':'📨 Enviar material'}</button>
        </div>
        {!res && <div className="settings-hint" style={{marginTop:8}}>Al terminar, tu resultado será enviado por el profesor más adelante.</div>}
      </div>
    </div>
  );
}

/* Panel del profesor: peso del examen en la nota final por módulo */
function ModuleWeightPanel() {
  const { LEVELS, MODULE_CATALOG, getModuleExamWeight, setModuleExamWeight } = window.JUCUM_DATA;
  const [level, setLevel] = exUseState('pre-a1');
  const [, setTick] = exUseState(0);
  const mods = MODULE_CATALOG[level] || [];
  return (
    <div className="scard">
      <div className="sec-head"><div className="sec-title">⚖️ Peso del examen en la nota final</div><span className="sec-meta">Por módulo · el resto es práctica</span></div>
      <div className="settings-hint" style={{marginBottom:12}}>Define cuánto pesa el examen en la <b>nota final</b> de cada módulo; el resto es el <b>cumplimiento</b> (práctica diaria). Recomendado <b>35%</b> — valoramos más la práctica constante.</div>
      <div className="preset-row" style={{marginBottom:14}}>
        {Object.entries(LEVELS).map(([k,lv])=><button key={k} className={`preset ${level===k?'on':''}`} onClick={()=>setLevel(k)}>{lv.emoji} {lv.code}</button>)}
      </div>
      <div style={{display:'grid', gap:12}}>
        {mods.map(m=>{
          const w = getModuleExamWeight(m.id);
          return (
            <div key={m.id} className="row-flex" style={{gap:12}}>
              <span style={{fontSize:22}}>{m.emoji}</span>
              <div style={{flex:1, minWidth:120}}>
                <div style={{fontWeight:700, fontSize:13}}>{m.name}</div>
                <div className="settings-hint" style={{margin:0}}>Examen {w}% · Práctica {100-w}%</div>
              </div>
              <input type="range" min="0" max="100" step="5" value={w} className="slider-input" style={{maxWidth:170}} onChange={e=>{ setModuleExamWeight(m.id, parseInt(e.target.value)); setTick(t=>t+1); }} />
              <div className="target-val" style={{minWidth:64, fontSize:18}}>{w}<span>%</span></div>
            </div>
          );
        })}
        {mods.length===0 && <div className="settings-hint">Ese nivel no tiene módulos.</div>}
      </div>
    </div>
  );
}

/* Bloque del alumno: resultados y nota final por módulo */
function ModuleResultsBlock({ student }) {
  const { MODULE_CATALOG, getModuleFinalGrade } = window.JUCUM_DATA;
  const mods = MODULE_CATALOG[student.level] || [];
  if (!mods.length) return null;
  return (
    <div className="scard" style={{marginTop:18}}>
      <div className="sec-head">
        <div className="sec-title">📋 Mis resultados por módulo</div>
        <span className="sec-meta">Nota final = práctica + examen · ✅ ≥75%</span>
      </div>
      <div style={{display:'grid', gap:10}}>
        {mods.map(m => {
          const g = getModuleFinalGrade(student, m);
          // Solo hay veredicto (Aprobado/No aprobado) si YA rindió un examen.
          // Sin examen publicado, el módulo está "en progreso", nunca "no aprobado".
          const hasVerdict = g.hasExam;
          const color = !hasVerdict ? '#E68A00' : (g.approved ? '#2EA84B' : '#C62828');
          const badgeBg = !hasVerdict ? '#FFF8E1' : (g.approved ? '#E8F5E9' : '#FFEBEE');
          const badgeTxt = !hasVerdict ? '⏳ Pendiente' : (g.approved ? '✓ Aprobado' : '✗ No aprob.');
          return (
            <div key={m.id} className="modres" style={{borderLeft:`4px solid ${color}`}}>
              <div className="modres-emo">{m.emoji}</div>
              <div className="modres-info">
                <div className="modres-name">{m.name}</div>
                <div className="modres-sub">Avance {g.stats.cumplimiento}% · {g.hasExam ? `Examen ${g.exam.grade}/100` : 'Examen no rendido aún'} · peso examen {g.examWeight}%</div>
                <div className="modres-bar"><span style={{width:g.finalPct+'%', background:color}}></span></div>
              </div>
              <div className="modres-final">
                <div className="modres-pct" style={{color}}>{g.finalPct}%</div>
                <div className="modres-badge" style={{background: badgeBg, color}}>{badgeTxt}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="settings-hint" style={{marginTop:10}}>La <b>nota final</b> de cada módulo combina tu <b>cumplimiento</b> (práctica diaria y temas cubiertos) con la nota de tu <b>examen</b>. Como valoramos más la práctica, el examen pesa solo una parte. Llega al <b>75%</b> para aprobar. 💪</div>
    </div>
  );
}

Object.assign(window, { TeacherExams, StudentExams, WindowCard, ExamGradeModal, ExamForm, WindowForm, DemoExamModal, StudentExamCard, ModuleWeightPanel, ModuleResultsBlock, ModuleExamPanel, ModuleExamRow });

/* 🧪 Modal: crea el examen de prueba para un grupo (ideal: tu grupo de prueba) */
function DemoExamModal({ onClose, onDone }) {
  const { GROUPS, LEVELS } = window.JUCUM_DATA;
  const X = window.JUCUM_EXAMS;
  const [groupId, setGroupId] = exUseState(GROUPS[0]?.id || '');
  const [err, setErr] = exUseState('');
  const go = () => {
    const r = X.createDemoExam(groupId);
    if (!r) { setErr('Ese grupo no tiene un módulo con materiales para armar la prueba.'); return; }
    alert(`🧪 Examen de prueba creado y ABIERTO para ${r.students} alumno(s) — todos habilitados, sin exigir el 75%.\n📣 Anunciado para el ${new Date(r.date + 'T12:00:00Z').toLocaleDateString('es-PE', {weekday:'long', day:'numeric', month:'long'})}: verán la cuenta regresiva en su panel.\n\nCuando termines la prueba, elimina la apertura (🗑 en Aperturas) y el examen 🧪.`);
    onDone();
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" style={{maxWidth:520}} onClick={e=>e.stopPropagation()}>
        <div className="modal-head"><div className="modal-title">🧪 Examen de prueba</div><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          {err && <div className="err" style={{marginBottom:12}}>⚠ {err}</div>}
          <div className="settings-hint" style={{marginBottom:12}}>Arma un examen con <b>materiales reales del primer módulo</b> del nivel del grupo (listening + reading + gramática), lo <b>abre de inmediato para todos</b> (sin exigir el 75%) y lo <b>anuncia para dentro de 3 días</b> — así pruebas completo: cuenta regresiva, reglas, guardado automático, registro de salidas de pestaña y avance en vivo. No toca el dominio ni el avance normal de los alumnos.</div>
          <div className="settings-block">
            <div className="settings-label">Grupo (usa tu grupo de prueba)</div>
            <select className="input-text" style={{width:'100%'}} value={groupId} onChange={e=>setGroupId(e.target.value)}>
              {GROUPS.map(g => <option key={g.id} value={g.id}>{LEVELS[g.level]?.emoji} {g.name}</option>)}
            </select>
          </div>
          <div className="modal-actions"><button className="btn-cancel" onClick={onClose}>Cancelar</button><button className="btn-save" onClick={go}>🧪 Crear y abrir</button></div>
        </div>
      </div>
    </div>
  );
}

/* ═══ Panel del profesor: exámenes por módulo (anunciar + publicar) ═══ */
function ModuleExamPanel({ onChange }) {
  const { GROUPS, LEVELS, MODULE_CATALOG } = window.JUCUM_DATA;
  const [groupId, setGroupId] = exUseState(GROUPS[0]?.id || '');
  const [, setTick] = exUseState(0);
  const refresh = () => { setTick(t => t + 1); onChange && onChange(); };
  const group = GROUPS.find(g => g.id === groupId);
  const mods = group ? (MODULE_CATALOG[group.level] || []) : [];
  if (!GROUPS.length) return <div className="scard"><div className="empty-state"><div className="icon">👥</div>No hay grupos todavía.</div></div>;
  return (
    <div className="scard">
      <div className="sec-head">
        <div className="sec-title">📅 Exámenes por módulo</div>
        <span className="sec-meta">Anuncia la fecha · publica cuando toque</span>
      </div>
      <div className="settings-hint" style={{marginBottom:10}}>Desarrollo sube el examen de cada módulo. Tú solo lo <b>anuncias</b> (con fecha → les llega aviso) y lo <b>publicas</b> (lo abre para el grupo).</div>
      <div className="preset-row" style={{flexWrap:'wrap', marginBottom:14}}>
        {GROUPS.map(g => <button key={g.id} className={`preset ${groupId===g.id?'on':''}`} onClick={()=>setGroupId(g.id)}>{LEVELS[g.level]?.emoji} {g.name}</button>)}
      </div>
      {mods.length===0 ? <div className="settings-hint">Este grupo no tiene módulos.</div> : (
        <div style={{display:'flex', flexDirection:'column', gap:10}}>
          {mods.map(m => <ModuleExamRow key={m.id} module={m} group={group} onChange={refresh} />)}
        </div>
      )}
    </div>
  );
}

function ModuleExamRow({ module, group, onChange }) {
  const X = window.JUCUM_EXAMS;
  const exam = X.examForModule(module.id, group.level);
  const win = exam ? X.windowForExamGroup(exam.id, group.id) : null;
  const ann = X.getAnnouncement(group.id, module.id);
  const [date, setDate] = exUseState(ann?.date || '');
  const isOpen = !!(win && win.isOpen);

  const doAnnounce = () => {
    const n = X.announceExam(group.id, module.id, exam?.id || null, date || null);
    alert(`📣 Aviso enviado a ${n} alumno(s) de ${group.name}.` + (date ? ` Fecha: ${new Date(date+'T00:00:00').toLocaleDateString('es-PE')}` : ''));
    onChange();
  };
  const doPublish = () => {
    if (!exam) return;
    if (win) X.setWindowOpen(win.id, true);
    else X.createWindow({ examId: exam.id, groupId: group.id, isOpen: true });
    onChange();
  };
  const doClose = () => { if (win) { X.setWindowOpen(win.id, false); onChange(); } };

  return (
    <div style={{border:'1px solid var(--border)', borderRadius:12, padding:'12px 14px'}}>
      <div style={{display:'flex', alignItems:'center', gap:10, marginBottom: exam ? 10 : 0}}>
        <span style={{fontSize:22}}>{module.emoji}</span>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:14}}>{module.name}</div>
          <div className="settings-hint" style={{margin:0}}>
            {exam ? <>Examen: <b>{exam.title}</b></> : <span style={{color:'#C62828'}}>⏳ Desarrollo aún no subió el examen de este módulo</span>}
          </div>
        </div>
        {exam && <span className="mm-chip" style={{background: isOpen?'#E8F5E9':'#FAFAF6', color: isOpen?'#2E7D32':'#777'}}>{isOpen?'🟢 Publicado':'⚪ Sin publicar'}</span>}
      </div>

      {exam && (
        <div style={{display:'grid', gap:10}}>
          <div className="row-flex" style={{gap:8, flexWrap:'wrap'}}>
            <span style={{fontSize:12, fontWeight:800, color:'#1F3A8A', minWidth:78}}>1 · Anuncio</span>
            <input type="date" className="input-text" style={{width:170}} value={date} onChange={e=>setDate(e.target.value)} />
            <button className="att-btn" onClick={doAnnounce}>📣 {ann?'Re-anunciar':'Anunciar a los alumnos'}</button>
            {ann && <span className="settings-hint" style={{margin:0}}>✓ Anunciado{ann.date?` para ${new Date(ann.date+'T00:00:00').toLocaleDateString('es-PE')}`:''}</span>}
          </div>
          <div className="row-flex" style={{gap:8, flexWrap:'wrap'}}>
            <span style={{fontSize:12, fontWeight:800, color:'#1F3A8A', minWidth:78}}>2 · Publicar</span>
            <button className={`preset ${isOpen?'on':''}`} onClick={doPublish}>🟢 Publicar examen</button>
            <button className={`preset ${!isOpen?'on':''}`} onClick={doClose} disabled={!win}>⚪ Despublicar</button>
            <span className="settings-hint" style={{margin:0}}>{isOpen?'Los alumnos aptos ya lo ven.':'Aún oculto para los alumnos.'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
