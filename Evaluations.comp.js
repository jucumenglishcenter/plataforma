/* Bloque D · Evaluation UI components
 * - TeacherEvaluate    : full screen, list of students from a group, click → form
 * - EvaluateForm       : 3 star ratings + written feedback + audio/video upload
 * - StarRating         : interactive 1-5 stars
 * - AttachmentChip     : preview of uploaded file
 * - StudentEvaluations : list shown in StudentDetail (teacher) and Student profile
 */

const { useState, useRef } = React;

const CRITERIA = [
  { key:'speaking',     label:'🗣 Speaking',       desc:'Pronunciación, fluidez y soltura al hablar' },
  { key:'listening',    label:'🎧 Listening',      desc:'Comprensión auditiva en conversación' },
  { key:'comprehension',label:'📖 Comprehension',  desc:'Comprensión lectora y de contexto' },
];

function StarRating({ value, onChange, color = '#F9A825' }) {
  return (
    <div className="stars-row">
      {[1,2,3,4,5].map(n => (
        <button
          key={n}
          type="button"
          className={`star-btn ${n <= value ? 'on' : ''}`}
          style={n <= value ? {color} : undefined}
          onClick={() => onChange(n)}
        >★</button>
      ))}
      <span className="stars-num">{value}/5</span>
    </div>
  );
}

function AttachmentChip({ att, onRemove }) {
  const sizeMB = (att.size / 1024 / 1024).toFixed(1);
  return (
    <div className="att-chip">
      <span className="att-ico">{att.kind === 'audio' ? '🎙' : '🎬'}</span>
      <div className="att-info">
        <div className="att-name">{att.name}</div>
        <div className="att-meta">{att.kind === 'audio' ? 'Audio' : 'Video'} · {sizeMB}MB</div>
      </div>
      {att.kind === 'audio' && <audio controls src={att.dataUrl} style={{height:28}} />}
      {att.kind === 'video' && <video controls src={att.dataUrl} style={{height:80,maxWidth:140,borderRadius:6}} />}
      {onRemove && <button className="att-remove" onClick={onRemove} title="Quitar">✕</button>}
    </div>
  );
}

function EvaluateForm({ student, onSave, onCancel }) {
  const [ratings, setRatings] = useState({ speaking: 3, listening: 3, comprehension: 3 });
  const [included, setIncluded] = useState({ speaking: true, listening: true, comprehension: true });
  const [feedback, setFeedback] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const recordRef = useRef(null);
  const [recording, setRecording] = useState(null); // { mediaRecorder, chunks, type }

  const onFile = async (kind, e) => {
    setErr('');
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const dataUrl = await window.JUCUM_EVAL.fileToDataUrl(f);
      setAttachments(arr => [...arr, { kind, dataUrl, name: f.name, size: f.size }]);
    } catch (er) {
      setErr(er.message);
    }
    e.target.value = '';
  };

  /* In-browser audio recording (no upload — record directly) */
  const startRecord = async () => {
    setErr('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks = [];
      mr.ondataavailable = e => e.data.size > 0 && chunks.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          setAttachments(arr => [...arr, {
            kind: 'audio',
            dataUrl: reader.result,
            name: `Grabación ${new Date().toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'})}.webm`,
            size: blob.size,
          }]);
        };
        reader.readAsDataURL(blob);
        setRecording(null);
      };
      mr.start();
      setRecording({ mr });
    } catch (e) {
      setErr('No se pudo acceder al micrófono: ' + e.message);
    }
  };
  const stopRecord = () => recording?.mr.stop();

  const save = () => {
    if (!feedback.trim()) { setErr('Escribe una retroalimentación antes de guardar.'); return; }
    const includedKeys = CRITERIA.filter(c => included[c.key]).map(c => c.key);
    if (includedKeys.length === 0) { setErr('Selecciona al menos una categoría para enviar.'); return; }
    setSaving(true);
    try {
      const finalRatings = {
        speaking: included.speaking ? ratings.speaking : null,
        listening: included.listening ? ratings.listening : null,
        comprehension: included.comprehension ? ratings.comprehension : null,
      };
      window.JUCUM_EVAL.saveEvaluation(student.id, {
        teacherName: 'Profesor',
        ratings: finalRatings,
        feedback: feedback.trim(),
        attachments,
      });
      // Notify student
      if (window.JUCUM_NOTIF) {
        const avgN = (includedKeys.reduce((s,k)=>s+ratings[k],0) / includedKeys.length).toFixed(1);
        window.JUCUM_NOTIF.pushNotif(student.id, {
          type: 'teacher-feedback',
          title: 'Evaluación recibida',
          body: `El profesor te evaluó (${includedKeys.length} categoría${includedKeys.length===1?'':'s'}, promedio ${avgN}/5). Revisa la retroalimentación.`,
        });
      }
      onSave();
    } catch (e) {
      setErr('Error al guardar: ' + e.message);
      setSaving(false);
    }
  };

  const includedKeys = CRITERIA.filter(c => included[c.key]).map(c => c.key);
  const avg = includedKeys.length ? (includedKeys.reduce((s,k)=>s+ratings[k],0) / includedKeys.length).toFixed(1) : '—';

  return (
    <div className="eval-form">
      <div className="eval-form-head">
        <button className="back-btn" onClick={onCancel}>← Volver a la lista</button>
        <div className="eval-form-title">
          <h2>Evaluar a {student.fullName}</h2>
          <div className="eval-form-sub">@{student.username} · {student.level.toUpperCase()}</div>
        </div>
      </div>

      {err && <div className="err" style={{marginBottom:14}}>⚠ {err}</div>}

      <div className="scard">
        <div className="sec-head"><div className="sec-title">Calificación</div><span className="sec-meta">Elige qué enviar · Promedio: <b>{avg}{avg==='—'?'':'/5'}</b></span></div>
        <div className="settings-hint" style={{marginBottom:6}}>Desmarca las categorías que no quieras enviar — solo se enviarán las marcadas (ej: solo Speaking).</div>
        {CRITERIA.map(c => {
          const on = included[c.key];
          return (
          <div key={c.key} className="crit-row" style={{opacity: on ? 1 : 0.55}}>
            <label className="check-row" style={{flex:1, alignItems:'flex-start'}}>
              <input type="checkbox" checked={on} onChange={e => setIncluded({...included, [c.key]: e.target.checked})} />
              <div className="crit-info">
                <div className="crit-label">{c.label}</div>
                <div className="crit-desc">{c.desc}</div>
              </div>
            </label>
            {on
              ? <StarRating value={ratings[c.key]} onChange={(v) => setRatings({...ratings, [c.key]:v})} />
              : <span className="crit-desc" style={{fontWeight:800, whiteSpace:'nowrap'}}>No se enviará</span>}
          </div>
        );})}
      </div>

      <div className="scard" style={{marginTop:14}}>
        <div className="sec-head"><div className="sec-title">Retroalimentación escrita</div></div>
        <textarea
          className="eval-textarea"
          placeholder="Escribe observaciones, áreas a mejorar y reconocimientos para el alumno..."
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          rows={5}
        />
        <div className="char-hint">{feedback.length} caracteres</div>
      </div>

      <div className="scard" style={{marginTop:14}}>
        <div className="sec-head">
          <div className="sec-title">Archivos adjuntos</div>
          <span className="sec-meta">{attachments.length} archivo{attachments.length === 1 ? '' : 's'}</span>
        </div>
        <div className="att-hint">Sube un audio o video con ejemplos de pronunciación, ejercicios corregidos, o explicaciones. <b>Máx 50MB por archivo.</b></div>

        <div className="att-actions">
          <button type="button" className="att-btn" onClick={() => audioRef.current?.click()}>📁 Subir audio</button>
          <input ref={audioRef} type="file" accept="audio/*" hidden onChange={e => onFile('audio', e)} />

          <button type="button" className="att-btn" onClick={() => videoRef.current?.click()}>🎬 Subir video</button>
          <input ref={videoRef} type="file" accept="video/*" hidden onChange={e => onFile('video', e)} />

          {!recording ? (
            <button type="button" className="att-btn rec" onClick={startRecord}>🎙 Grabar audio en vivo</button>
          ) : (
            <button type="button" className="att-btn rec-on" onClick={stopRecord}>⏹ Detener · grabando…</button>
          )}
        </div>

        {attachments.length > 0 && (
          <div className="att-list">
            {attachments.map((a, i) => (
              <AttachmentChip key={i} att={a} onRemove={() => setAttachments(arr => arr.filter((_,j) => j !== i))} />
            ))}
          </div>
        )}
      </div>

      <div className="eval-actions">
        <button className="btn-cancel" onClick={onCancel}>Cancelar</button>
        <button className="btn-save" onClick={save} disabled={saving}>{saving ? 'Guardando…' : '💾 Enviar evaluación'}</button>
      </div>
    </div>
  );
}

function TeacherEvaluate({ onBack }) {
  const { STUDENTS, GROUPS, LEVELS } = window.JUCUM_DATA;
  const [stage, setStage] = useState({ kind:'list' });
  const [refresh, setRefresh] = useState(0);

  return (
    <main>
      <button className="back-btn" onClick={onBack}>← Volver al panel</button>
      <div className="welcome teacher">
        <div className="welcome-text">
          <div className="eyebrow">📊 Evaluación presencial</div>
          <h1>Evalúa a tus alumnos</h1>
          <p>Califica Speaking, Listening y Comprehension. Adjunta audios o videos como retroalimentación personalizada.</p>
        </div>
      </div>

      {stage.kind === 'list' ? (
        <div className="eval-list">
          {GROUPS.map(g => {
            const level = LEVELS[g.level];
            const members = STUDENTS.filter(s => s.group === g.id);
            return (
              <div key={g.id} className="eval-group">
                <div className="eval-group-head">
                  <span className="gcard-pill" style={{background:level.color+'18',color:level.dark,borderColor:level.color+'55'}}>
                    {level.emoji} {level.code}
                  </span>
                  <span className="eval-group-name">{g.name}</span>
                  <span className="eval-group-count">{members.length} alumnos</span>
                </div>
                <div className="eval-students">
                  {members.map(s => {
                    const evals = window.JUCUM_EVAL.getEvaluations(s.id);
                    return (
                      <button key={s.id} className="eval-student-row" onClick={() => setStage({kind:'form', student:s})}>
                        <div className="st-ava" style={{background:`linear-gradient(135deg,${level.color}80,${level.dark})`}}>
                          {s.fullName.split(' ').map(n=>n[0]).slice(0,2).join('')}
                        </div>
                        <div className="eval-st-info">
                          <div className="eval-st-name">{s.fullName}</div>
                          <div className="eval-st-meta">@{s.username} · {evals.length} evaluacion{evals.length === 1 ? '' : 'es'} previa{evals.length === 1 ? '' : 's'}</div>
                        </div>
                        <span className="eval-st-cta">Evaluar →</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EvaluateForm
          student={stage.student}
          onCancel={() => setStage({kind:'list'})}
          onSave={() => { setStage({kind:'list'}); setRefresh(r => r+1); }}
        />
      )}
    </main>
  );
}

function StudentEvaluations({ studentId, isStudent = false }) {
  const evals = window.JUCUM_EVAL.getEvaluations(studentId);
  if (evals.length === 0) {
    return <div className="empty-state"><div className="icon">📋</div>{isStudent ? 'Aún no tienes evaluaciones del profesor.' : 'Este alumno aún no tiene evaluaciones registradas.'}</div>;
  }
  return (
    <div className="eval-feed">
      {evals.map(ev => <EvalCard key={ev.id} ev={ev} studentId={studentId} isStudent={isStudent} />)}
    </div>
  );
}

function EvalCard({ ev, studentId, isStudent }) {
  const present = CRITERIA.filter(c => typeof ev.ratings[c.key] === 'number');
  const avg = present.length ? (present.reduce((s,c) => s + ev.ratings[c.key], 0) / present.length).toFixed(1) : '—';
  const date = new Date(ev.date);
  const dateStr = date.toLocaleDateString('es-PE', { weekday:'long', day:'numeric', month:'long' });
  const timeStr = date.toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit' });
  const onDelete = () => {
    if (confirm('¿Eliminar esta evaluación?')) {
      window.JUCUM_EVAL.deleteEvaluation(studentId, ev.id);
      window.location.reload();
    }
  };
  return (
    <div className="eval-card">
      <div className="eval-card-head">
        <div>
          <div className="eval-card-date">📅 {dateStr} · {timeStr}</div>
          <div className="eval-card-teacher">por {ev.teacherName || 'Profesor'}</div>
        </div>
        <div className="eval-card-avg">
          <div className="eval-avg-num">{avg}</div>
          <div className="eval-avg-lbl">/5 promedio</div>
        </div>
        {!isStudent && <button className="eval-del" onClick={onDelete} title="Eliminar">✕</button>}
      </div>

      <div className="eval-ratings">
        {present.length === 0 ? (
          <div className="crit-desc">Sin calificación por categorías — revisa la retroalimentación.</div>
        ) : present.map(c => (
          <div key={c.key} className="eval-rating-row">
            <span className="eval-r-lbl">{c.label}</span>
            <span className="eval-r-stars">
              {[1,2,3,4,5].map(n => <span key={n} className={`eval-r-s ${n <= ev.ratings[c.key] ? 'on' : ''}`}>★</span>)}
            </span>
            <span className="eval-r-val">{ev.ratings[c.key]}/5</span>
          </div>
        ))}
      </div>

      {ev.feedback && (
        <div className="eval-feedback">
          <div className="eval-fb-lbl">📝 Retroalimentación</div>
          <div className="eval-fb-text">{ev.feedback}</div>
        </div>
      )}

      {ev.attachments?.length > 0 && (
        <div className="eval-attachments">
          <div className="eval-fb-lbl">📎 Adjuntos</div>
          <div className="att-list">
            {ev.attachments.map((a, i) => <AttachmentChip key={i} att={a} />)}
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { TeacherEvaluate, EvaluateForm, StarRating, AttachmentChip, StudentEvaluations, EvalCard });
