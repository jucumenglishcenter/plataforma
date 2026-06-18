/* Bloque G · Tareas — UI profesor + alumno
 * - TeacherAssignments : crea tareas, ve entregas, califica (opcional)
 * - StudentAssignments : ve sus tareas, adjunta y entrega (gana XP)
 * Reusa estilos existentes (scard, eval-*, att-*, modal, settings-*, mp-btn).
 */

const { useState: tUseState, useRef: tUseRef } = React;

/* ── helpers de fecha ── */
function taskDueLabel(dueAt) {
  if (!dueAt) return null;
  const d = new Date(dueAt);
  const diff = d - new Date();
  const fmt = d.toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  if (diff < 0) return { txt: `Cerró ${fmt}`, late: true };
  const days = Math.ceil(diff / 86400000);
  return { txt: `Cierra ${fmt}${days <= 3 ? ` · ${days}d` : ''}`, late: false, soon: days <= 1 };
}

/* ── chip de adjunto (audio/video/archivo) ── */
function TaskAttachmentChip({ att, onRemove }) {
  const sizeMB = att.size ? (att.size / 1024 / 1024).toFixed(1) + 'MB' : '';
  const src = att.url || att.dataUrl;
  const ico = att.kind === 'audio' ? '🎙' : att.kind === 'video' ? '🎬' : '📄';
  return (
    <div className="att-chip">
      <span className="att-ico">{ico}</span>
      <div className="att-info">
        <div className="att-name">{att.name}</div>
        <div className="att-meta">{sizeMB}</div>
      </div>
      {att.kind === 'audio' && src && <audio controls src={src} style={{height:30}} />}
      {att.kind === 'video' && src && <video controls src={src} style={{height:78,maxWidth:140,borderRadius:6}} />}
      {att.kind === 'file' && src && <a className="att-btn" href={src} target="_blank" rel="noreferrer" download={att.name}>Abrir</a>}
      {onRemove && <button className="att-remove" onClick={onRemove} title="Quitar">✕</button>}
    </div>
  );
}

/* ── selector de archivos (subir + grabar audio) ── */
function TaskFilePicker({ attachments, setAttachments, allowRecord }) {
  const fileRef = tUseRef(null);
  const [recording, setRecording] = tUseState(null);
  const [err, setErr] = tUseState('');

  const onFile = async (e) => {
    setErr('');
    const f = e.target.files?.[0]; if (!f) return;
    const kind = f.type.startsWith('audio') ? 'audio' : f.type.startsWith('video') ? 'video' : 'file';
    try {
      const dataUrl = await window.JUCUM_EVAL.fileToDataUrl(f);
      setAttachments(a => [...a, { kind, dataUrl, name: f.name, size: f.size }]);
    } catch (er) { setErr(er.message); }
    e.target.value = '';
  };
  const startRec = async () => {
    setErr('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks = [];
      mr.ondataavailable = ev => ev.data.size > 0 && chunks.push(ev.data);
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => setAttachments(a => [...a, {
          kind: 'audio', dataUrl: reader.result,
          name: `Grabación ${new Date().toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'})}.webm`,
          size: blob.size,
        }]);
        reader.readAsDataURL(blob);
        setRecording(null);
      };
      mr.start();
      setRecording({ mr });
    } catch (e2) { setErr('No se pudo acceder al micrófono: ' + e2.message); }
  };

  return (
    <div>
      {err && <div className="err" style={{marginBottom:8}}>⚠ {err}</div>}
      <div className="att-actions">
        <button type="button" className="att-btn" onClick={() => fileRef.current?.click()}>📁 Subir archivo</button>
        <input ref={fileRef} type="file" accept="audio/*,video/*,image/*,application/pdf" hidden onChange={onFile} />
        {allowRecord && (!recording
          ? <button type="button" className="att-btn rec" onClick={startRec}>🎙 Grabar audio</button>
          : <button type="button" className="att-btn rec-on" onClick={() => recording.mr.stop()}>⏹ Detener · grabando…</button>)}
      </div>
      <div className="att-hint" style={{marginTop:2}}>Audio, video, imagen o PDF. <b>Máx 50MB por archivo.</b></div>
      {attachments.length > 0 && (
        <div className="att-list" style={{marginTop:8}}>
          {attachments.map((a, i) => <TaskAttachmentChip key={i} att={a} onRemove={() => setAttachments(arr => arr.filter((_, j) => j !== i))} />)}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════ PROFESOR ═══════════════════════ */
function TeacherAssignments({ onBack }) {
  const { STUDENTS, GROUPS, LEVELS } = window.JUCUM_DATA;
  const T = window.JUCUM_TASKS;
  const [creating, setCreating] = tUseState(false);
  const [viewing, setViewing] = tUseState(null); // assignment
  const [tick, setTick] = tUseState(0);
  const refresh = () => setTick(t => t + 1);

  const assignments = T.getAssignments();

  if (viewing) return <TeacherSubmissions assignment={viewing} onBack={() => { setViewing(null); refresh(); }} />;

  return (
    <main>
      <button className="back-btn" onClick={onBack}>← Volver al panel</button>
      <div className="welcome teacher">
        <div className="welcome-text">
          <div className="eyebrow">📝 Tareas</div>
          <h1>Asignaciones</h1>
          <p>Asigna tareas a un grupo o a alumnos puntuales. Ellos entregan adjuntando archivos y ganan XP. Calificar es opcional.</p>
        </div>
        <button className="btn-settings" onClick={() => setCreating(true)}>+ Nueva tarea</button>
      </div>

      {assignments.length === 0 ? (
        <div className="scard" style={{marginTop:18}}><div className="empty-state"><div className="icon">📝</div>Aún no has creado tareas. Crea la primera.</div></div>
      ) : (
        <div className="mm-list" style={{marginTop:18}}>
          {assignments.map(a => {
            const recips = T.recipientsOf(a, STUDENTS);
            const subs = T.submissionsFor(a.id);
            const nSub = Object.keys(subs).length;
            const group = GROUPS.find(g => g.id === a.groupId);
            const due = taskDueLabel(a.dueAt);
            const targeted = (a.targetStudentIds || []).length > 0;
            return (
              <div key={a.id} className="scard mm-card" style={{cursor:'pointer'}} onClick={() => setViewing(a)}>
                <div className="mm-emoji">📝</div>
                <div className="mm-info">
                  <div className="mm-name">{a.title} {a.gradable && <span className="mm-chip" style={{background:'#E3E9F8',color:'#1F3A8A'}}>calificable</span>}</div>
                  <div className="mm-meta">
                    {targeted ? `${recips.length} alumno${recips.length===1?'':'s'} puntual${recips.length===1?'':'es'}` : (group ? `${LEVELS[group.level]?.emoji||''} ${group.name}` : 'grupo')}
                    {' · '}<b>{nSub}/{recips.length}</b> entregada{nSub===1?'':'s'}
                    {due && <span style={{color: due.late ? '#C62828' : '#E65100', fontWeight:800}}> · ⏰ {due.txt}</span>}
                  </div>
                </div>
                <div className="mm-actions" onClick={e => e.stopPropagation()}>
                  <button className="att-btn" onClick={() => setViewing(a)}>Ver entregas →</button>
                  <button className="att-btn" style={{borderColor:'#EF9A9A',color:'#C62828'}} onClick={() => { if (confirm('¿Eliminar esta tarea y sus entregas?')) { T.deleteAssignment(a.id); refresh(); } }}>🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {creating && <AssignmentForm onClose={() => setCreating(false)} onSaved={() => { setCreating(false); refresh(); }} />}
    </main>
  );
}

/* ── formulario de nueva tarea ── */
function AssignmentForm({ onClose, onSaved }) {
  const { GROUPS, STUDENTS, LEVELS } = window.JUCUM_DATA;
  const [title, setTitle] = tUseState('');
  const [desc, setDesc] = tUseState('');
  const [due, setDue] = tUseState('');
  const [groupId, setGroupId] = tUseState(GROUPS[0]?.id || '');
  const [mode, setMode] = tUseState('group'); // 'group' | 'students'
  const [picked, setPicked] = tUseState([]);
  const [gradable, setGradable] = tUseState(false);
  const [attachments, setAttachments] = tUseState([]);
  const [err, setErr] = tUseState('');

  const groupStudents = STUDENTS.filter(s => s.group === groupId);
  const togglePick = (id) => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const save = () => {
    if (!title.trim()) { setErr('Ponle un título a la tarea.'); return; }
    if (mode === 'students' && picked.length === 0) { setErr('Elige al menos un alumno.'); return; }
    window.JUCUM_TASKS.createAssignment({
      groupId,
      targetStudentIds: mode === 'students' ? picked : [],
      title: title.trim(),
      description: desc.trim(),
      dueAt: due ? new Date(due).toISOString() : null,
      gradable,
      attachments,
    });
    onSaved();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" style={{maxWidth:640}} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">📝 Nueva tarea</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {err && <div className="err" style={{marginBottom:12}}>⚠ {err}</div>}

          <div className="settings-block">
            <div className="settings-label">Título</div>
            <input className="input-text" style={{width:'100%'}} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Lee la Story 1 en voz alta y envía tu audio" />
          </div>
          <div className="settings-block">
            <div className="settings-label">Instrucciones (opcional)</div>
            <textarea className="eval-textarea" rows={3} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Detalles de lo que deben hacer y entregar…" />
          </div>

          <div className="settings-block">
            <div className="settings-label">Grupo</div>
            <select className="input-text" style={{width:'100%'}} value={groupId} onChange={e => { setGroupId(e.target.value); setPicked([]); }}>
              {GROUPS.map(g => <option key={g.id} value={g.id}>{LEVELS[g.level]?.emoji} {g.name}</option>)}
            </select>
          </div>

          <div className="settings-block">
            <div className="settings-label">¿A quién?</div>
            <div className="preset-row">
              <button className={`preset ${mode==='group'?'on':''}`} onClick={() => setMode('group')}>👥 Todo el grupo</button>
              <button className={`preset ${mode==='students'?'on':''}`} onClick={() => setMode('students')}>🎯 Alumnos puntuales</button>
            </div>
            {mode === 'students' && (
              <div style={{marginTop:10, display:'grid', gap:6, maxHeight:220, overflowY:'auto'}}>
                {groupStudents.map(s => (
                  <label key={s.id} className="check-row">
                    <input type="checkbox" checked={picked.includes(s.id)} onChange={() => togglePick(s.id)} />
                    <span>{s.fullName} <span style={{color:'var(--text-soft)'}}>@{s.username}</span></span>
                  </label>
                ))}
                {groupStudents.length === 0 && <div className="settings-hint">Ese grupo no tiene alumnos.</div>}
              </div>
            )}
          </div>

          <div className="settings-block">
            <div className="settings-label">Fecha y hora de cierre (opcional)</div>
            <input type="datetime-local" className="input-text" value={due} onChange={e => setDue(e.target.value)} />
          </div>

          <div className="settings-block">
            <label className="check-row">
              <input type="checkbox" checked={gradable} onChange={e => setGradable(e.target.checked)} />
              <span>Voy a calificar esta tarea (si lo dejas sin marcar, el alumno solo verá “Entregado”).</span>
            </label>
          </div>

          <div className="settings-block">
            <div className="settings-label">Material para el alumno (opcional)</div>
            <TaskFilePicker attachments={attachments} setAttachments={setAttachments} allowRecord={false} />
          </div>

          <div className="modal-actions">
            <button className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button className="btn-save" onClick={save}>📨 Asignar tarea</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── entregas de una tarea (profesor) ── */
function TeacherSubmissions({ assignment, onBack }) {
  const { STUDENTS, LEVELS } = window.JUCUM_DATA;
  const T = window.JUCUM_TASKS;
  const [tick, setTick] = tUseState(0);
  const [grading, setGrading] = tUseState(null); // student
  const recips = T.recipientsOf(assignment, STUDENTS);
  const subs = T.submissionsFor(assignment.id);
  const due = taskDueLabel(assignment.dueAt);

  return (
    <main>
      <button className="back-btn" onClick={onBack}>← Volver a tareas</button>
      <div className="welcome teacher">
        <div className="welcome-text">
          <div className="eyebrow">📝 Entregas</div>
          <h1>{assignment.title}</h1>
          <p>{Object.keys(subs).length}/{recips.length} entregadas{due && ` · ⏰ ${due.txt}`}{assignment.gradable ? ' · calificable' : ' · sin nota'}</p>
        </div>
      </div>

      {assignment.description && <div className="scard" style={{marginTop:18}}><div className="eval-fb-lbl">Instrucciones</div><div className="fpost-body">{assignment.description}</div></div>}

      <div className="scard" style={{marginTop:14}}>
        <div className="sec-head"><div className="sec-title">Alumnos</div></div>
        <div className="sm-list">
          {recips.map(s => {
            const sub = subs[s.id];
            const level = LEVELS[s.level];
            const status = !sub ? {t:'Pendiente', c:'#C62828', bg:'#FFEBEE'}
              : sub.status === 'graded' ? {t:`Calificado${typeof sub.grade==='number'?` · ${sub.grade}/100`:''}`, c:'#1565C0', bg:'#E3F2FD'}
              : {t:'Entregado', c:'#2E7D32', bg:'#E8F5E9'};
            return (
              <div key={s.id} className="sm-row" style={{flexWrap:'wrap'}}>
                <div className="st-ava" style={{background:`linear-gradient(135deg,${level.color}80,${level.dark})`}}>
                  {s.fullName.split(' ').map(n=>n[0]).slice(0,2).join('')}
                </div>
                <div className="sm-info">
                  <div className="sm-name">{s.fullName}</div>
                  <div className="sm-meta">@{s.username}{sub ? ` · entregó ${new Date(sub.submittedAt).toLocaleDateString('es-PE',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}` : ''}</div>
                </div>
                <span className="mm-chip" style={{background:status.bg, color:status.c}}>{status.t}</span>
                {sub && <button className="att-btn" onClick={() => setGrading(s)}>{assignment.gradable ? '📊 Calificar' : '👁 Ver'}</button>}
                {sub && sub.attachments?.length > 0 && (
                  <div className="att-list" style={{flexBasis:'100%', marginTop:8}}>
                    {sub.attachments.map((a, i) => <TaskAttachmentChip key={i} att={a} />)}
                    {sub.text && <div className="fpost-body sm" style={{marginTop:4}}>“{sub.text}”</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {grading && <GradeModal assignment={assignment} student={grading} sub={subs[grading.id]} onClose={() => { setGrading(null); setTick(t=>t+1); }} />}
    </main>
  );
}

function GradeModal({ assignment, student, sub, onClose }) {
  const [grade, setGrade] = tUseState(typeof sub?.grade === 'number' ? sub.grade : 80);
  const [withGrade, setWithGrade] = tUseState(assignment.gradable);
  const [feedback, setFeedback] = tUseState(sub?.feedback || '');
  const save = () => {
    window.JUCUM_TASKS.gradeSubmission(assignment.id, student.id, withGrade ? grade : null, feedback.trim());
    onClose();
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" style={{maxWidth:520}} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">📊 {assignment.gradable ? 'Calificar' : 'Retroalimentar'} · {student.fullName}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {sub?.attachments?.length > 0 && (
            <div className="att-list" style={{marginBottom:12}}>
              {sub.attachments.map((a, i) => <TaskAttachmentChip key={i} att={a} />)}
            </div>
          )}
          {sub?.text && <div className="fpost-body" style={{marginBottom:12}}>“{sub.text}”</div>}

          <div className="settings-block">
            <label className="check-row"><input type="checkbox" checked={withGrade} onChange={e => setWithGrade(e.target.checked)} /><span>Ponerle nota (si no, solo retroalimentación)</span></label>
          </div>
          {withGrade && (
            <div className="settings-block">
              <div className="settings-label">Nota (sobre 100)</div>
              <div className="row-flex">
                <input type="range" min="0" max="100" value={grade} onChange={e => setGrade(parseInt(e.target.value))} className="slider-input" />
                <div className="target-val">{grade}<span>/100</span></div>
              </div>
            </div>
          )}
          <div className="settings-block">
            <div className="settings-label">Retroalimentación</div>
            <textarea className="eval-textarea" rows={4} value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Comentarios para el alumno…" />
          </div>
          <div className="modal-actions">
            <button className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button className="btn-save" onClick={save}>💾 Enviar al alumno</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════ ALUMNO ═══════════════════════ */
function StudentAssignments({ user, onBack }) {
  const { STUDENTS } = window.JUCUM_DATA;
  const T = window.JUCUM_TASKS;
  const student = STUDENTS.find(s => s.id === user.studentId) || STUDENTS[0];
  const [tick, setTick] = tUseState(0);
  const list = T.assignmentsForStudent(student);
  const pending = list.filter(a => !T.getSubmission(a.id, student.id));
  const doneList = list.filter(a => T.getSubmission(a.id, student.id));

  return (
    <main>
      <button className="back-btn" onClick={onBack}>← Volver al panel</button>
      <div className="welcome">
        <div className="welcome-text">
          <div className="eyebrow">📝 Tareas</div>
          <h1>Mis tareas</h1>
          <p>{pending.length} pendiente{pending.length===1?'':'s'} · {doneList.length} entregada{doneList.length===1?'':'s'}. Entregar suma <b>XP</b>.</p>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="scard" style={{marginTop:18}}><div className="empty-state"><div className="icon">🎉</div>No tienes tareas asignadas por ahora.</div></div>
      ) : (
        <div style={{marginTop:18, display:'flex', flexDirection:'column', gap:12}}>
          {list.map(a => <StudentTaskCard key={a.id} a={a} student={student} onChange={() => setTick(t=>t+1)} />)}
        </div>
      )}
    </main>
  );
}

function StudentTaskCard({ a, student, onChange }) {
  const T = window.JUCUM_TASKS;
  const sub = T.getSubmission(a.id, student.id);
  const due = taskDueLabel(a.dueAt);
  const [open, setOpen] = tUseState(!sub);
  const [text, setText] = tUseState(sub?.text || '');
  const [attachments, setAttachments] = tUseState(sub?.attachments || []);
  const [saving, setSaving] = tUseState(false);

  const submit = async () => {
    if (attachments.length === 0 && !text.trim()) { alert('Adjunta un archivo o escribe algo antes de entregar.'); return; }
    setSaving(true);
    try { await Promise.resolve(window.JUCUM_TASKS.submitAssignment(a.id, student.id, { text: text.trim(), attachments })); }
    finally { setSaving(false); }
    if (window.JUCUM_NOTIF) window.JUCUM_NOTIF.pushNotif(student.id, { type:'achievement', title:'✅ Tarea entregada', body:`Entregaste "${a.title}". ¡+XP por tu esfuerzo!` });
    onChange();
  };

  const statusPill = sub
    ? (sub.status === 'graded'
        ? { t: `Calificado${typeof sub.grade==='number'?` · ${sub.grade}/100`:''}`, c:'#1565C0', bg:'#E3F2FD' }
        : { t: 'Entregado', c:'#2E7D32', bg:'#E8F5E9' })
    : { t: due?.late ? 'Cerrada' : 'Pendiente', c: due?.late ? '#C62828' : '#E65100', bg: due?.late ? '#FFEBEE' : '#FFF8E1' };

  return (
    <div className="scard">
      <div className="sec-head" style={{cursor:'pointer'}} onClick={() => setOpen(o => !o)}>
        <div className="sec-title" style={{fontSize:15}}>📝 {a.title}</div>
        <span className="mm-chip" style={{background:statusPill.bg, color:statusPill.c}}>{statusPill.t}</span>
      </div>
      {due && <div className="mm-meta" style={{marginTop:-6, marginBottom:8, color: due.late ? '#C62828' : '#E65100', fontWeight:800}}>⏰ {due.txt}</div>}
      {a.description && <div className="fpost-body" style={{marginBottom:10}}>{a.description}</div>}
      {a.attachments?.length > 0 && (
        <div className="att-list" style={{marginBottom:10}}>
          {a.attachments.map((x, i) => <TaskAttachmentChip key={i} att={x} />)}
        </div>
      )}

      {sub && sub.status === 'graded' && sub.feedback && (
        <div className="eval-feedback"><div className="eval-fb-lbl">📝 Retroalimentación del profesor</div><div className="eval-fb-text">{sub.feedback}</div></div>
      )}

      {open && (
        <div style={{marginTop:10, paddingTop:10, borderTop:'1px dashed var(--border)'}}>
          <div className="eval-fb-lbl">{sub ? 'Tu entrega (puedes reemplazarla mientras no esté calificada)' : 'Tu entrega'}</div>
          <textarea className="eval-textarea" rows={2} value={text} onChange={e => setText(e.target.value)} placeholder="Comentario (opcional)…" style={{marginBottom:8}} />
          {(!sub || sub.status !== 'graded') ? (
            <>
              <TaskFilePicker attachments={attachments} setAttachments={setAttachments} allowRecord={true} />
              <div style={{display:'flex', justifyContent:'flex-end', marginTop:10}}>
                <button className="btn-save" onClick={submit} disabled={saving}>{saving ? 'Enviando…' : (sub ? '🔄 Reemplazar entrega' : '📨 Entregar tarea')}</button>
              </div>
            </>
          ) : (
            <div className="att-list">{(sub.attachments||[]).map((x,i) => <TaskAttachmentChip key={i} att={x} />)}</div>
          )}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { TeacherAssignments, StudentAssignments, TaskAttachmentChip, TaskFilePicker, AssignmentForm, TeacherSubmissions, GradeModal, StudentTaskCard });
