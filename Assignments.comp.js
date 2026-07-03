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

/* ── instrucciones ESTRUCTURADAS · se guardan embebidas en description ──
 * Mantienen 100% de compatibilidad: description sigue llevando el texto legible
 * (fallback en nube y tareas antiguas) + un bloque JSON al final que la UI lee. */
function parseTaskMeta(a) {
  const desc = (a && a.description) || '';
  const m = desc.match(/<!--JUCUM_TASK:([\s\S]*?)-->/);
  let structured = null;
  if (m) { try { structured = JSON.parse(decodeURIComponent(m[1])); } catch (e) {} }
  const plain = desc.replace(/<!--JUCUM_TASK:[\s\S]*?-->/, '').trim();
  return { structured, plain };
}
function hasStructured(s) {
  return !!(s && ((s.resource && (s.resource.url || s.resource.label)) || (s.focus && s.focus.length) || (s.steps && s.steps.length) || (s.materials && s.materials.length)));
}
function buildTaskDescription(plain, structured) {
  let d = (plain || '').trim();
  if (hasStructured(structured)) d += (d ? '\n\n' : '') + '<!--JUCUM_TASK:' + encodeURIComponent(JSON.stringify(structured)) + '-->';
  return d;
}
const emptyStructured = () => ({ resource: { label: '', url: '' }, focus: [], steps: [], materials: [] });

/* ── conmutador de idioma ES / EN / Paralelo ── */
function TaskLangToggle({ lang, setLang }) {
  return (
    <div style={{display:'flex', alignItems:'center', gap:7, flexWrap:'wrap'}}>
      <span style={{fontSize:11.5, fontWeight:800, color:'#1F3A8A'}}>🌐 Idioma:</span>
      {[['es','Español'],['en','English'],['par','Paralelo']].map(([k, lbl]) => (
        <button key={k} onClick={() => setLang(k)} style={{border:'1.5px solid ' + (lang === k ? '#1F3A8A' : '#C9D6F0'), background: lang === k ? '#1F3A8A' : '#fff', color: lang === k ? '#fff' : '#3A4A66', fontFamily:'inherit', fontWeight:800, fontSize:11.5, padding:'5px 11px', borderRadius:16, cursor:'pointer'}}>{lbl}</button>
      ))}
    </div>
  );
}

/* ── cuerpo de instrucciones estructuradas (profesor y alumno) ── */
function TaskInstructions({ plain, structured, lang }) {
  const s = structured || {};
  const L = lang || 'par';
  return (
    <div style={{display:'flex', flexDirection:'column', gap:14}}>
      {plain && <div className="fpost-body" style={{whiteSpace:'pre-wrap'}}><span style={{whiteSpace:'pre-wrap'}}>{plain}</span></div>}
      {s.resource && (s.resource.url || s.resource.label) && (
        <div>
          <div className="eval-fb-lbl">🔗 Recurso principal</div>
          <a href={s.resource.url || '#'} target="_blank" rel="noreferrer" style={{display:'flex', alignItems:'center', gap:11, textDecoration:'none', border:'1.5px solid #C9D6F5', background:'#EEF2FC', borderRadius:11, padding:'11px 13px'}}>
            <span style={{fontSize:20}}>🌐</span>
            <span style={{flex:1, minWidth:0}}>
              <span style={{display:'block', fontWeight:800, fontSize:13.5, color:'#1F3A8A'}}>{s.resource.label || s.resource.url}</span>
              {s.resource.url && <span style={{display:'block', fontSize:11, color:'#7488b5', fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{s.resource.url}</span>}
            </span>
            <span style={{color:'#3F5BB8', fontWeight:900}}>Abrir ▸</span>
          </a>
        </div>
      )}
      {s.focus && s.focus.length > 0 && (
        <div>
          <div className="eval-fb-lbl">🎯 Enfócate en</div>
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            {s.focus.map((f, i) => (
              <div key={i} style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
                <span style={{fontWeight:800, fontSize:13, color:'#2b2b2b', minWidth:130}}>{f.label}</span>
                <span style={{display:'flex', gap:5, flexWrap:'wrap'}}>
                  {(f.items || []).map((it, j) => <span key={j} style={{fontSize:11, fontWeight:800, color:'#5B3FA0', background:'#F4EEFB', border:'1px solid #D9CEEC', borderRadius:14, padding:'3px 10px'}}>{it}</span>)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {s.steps && s.steps.length > 0 && (
        <div>
          <div className="eval-fb-lbl">📝 Qué hacer</div>
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            {s.steps.map((st, i) => (
              <div key={i} style={{display:'flex', gap:10, border:'1px solid var(--border)', borderRadius:11, padding:'10px 12px', background:'#fff'}}>
                <span style={{width:24, height:24, flexShrink:0, borderRadius:7, background:'#1F3A8A', color:'#fff', fontWeight:800, fontSize:12.5, display:'inline-flex', alignItems:'center', justifyContent:'center'}}>{i + 1}</span>
                <div style={{flex:1}}>
                  {L !== 'es' && st.en && <div style={{fontWeight:700, fontSize:13.5, color:'#2b2b2b', lineHeight:1.5}}>{st.en}</div>}
                  {L !== 'en' && st.es && <div style={{fontFamily:"'Atkinson Hyperlegible',sans-serif", fontStyle:'italic', fontSize: L === 'par' ? 12.5 : 13.5, color: L === 'par' ? '#8a7f6a' : '#444', lineHeight:1.5, marginTop: L === 'par' ? 3 : 0}}>{st.es}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {s.materials && s.materials.length > 0 && (
        <div>
          <div className="eval-fb-lbl">📎 Material de apoyo</div>
          <div style={{display:'flex', flexDirection:'column', gap:6}}>
            {s.materials.map((m, i) => (
              <div key={i} style={{display:'flex', alignItems:'center', gap:9, border:'1px solid var(--border)', borderRadius:10, padding:'8px 11px', background:'#FCFAF4'}}>
                <span style={{fontSize:16}}>📄</span>
                <span style={{flex:1, fontWeight:700, fontSize:12.5, color:'#444'}}>{typeof m === 'string' ? m : m.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── pasos genéricos de “cómo entregar” ── */
function HowToSubmit() {
  return (
    <ol style={{margin:0, paddingLeft:18, fontSize:13, lineHeight:1.65, color:'#444'}}>
      <li>Realiza el ejercicio en el recurso indicado (o según las instrucciones).</li>
      <li>Adjunta tu evidencia: <b>foto, PDF, captura</b> o <b>audio</b> (máx. 50&nbsp;MB por archivo). Puedes añadir un comentario.</li>
      <li>Pulsa <b>📨 Entregar tarea</b>: verás <b>“Entregado”</b> y ganas <b>XP</b>.</li>
      <li>Mientras no esté calificada puedes <b>reemplazar tu entrega</b>. Si cierra el plazo, ya no se puede enviar.</li>
    </ol>
  );
}

/* ── vista previa: cómo le llega la tarea al alumno ── */
function StudentTaskPreview({ assignment, onClose }) {
  const { structured, plain } = parseTaskMeta(assignment);
  const due = taskDueLabel(assignment.dueAt);
  const [lang, setLang] = tUseState('par');
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{maxWidth:620}} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">👁️ Vista previa del alumno</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{background:'linear-gradient(135deg,#1F3A8A,#0D1B5A)', color:'#fff', borderRadius:14, padding:'15px 17px'}}>
            <div style={{fontSize:10.5, fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', opacity:0.8}}>📝 Tarea</div>
            <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:18, lineHeight:1.2, margin:'3px 0 5px'}}>{assignment.title}</div>
            <div style={{display:'inline-flex', alignItems:'center', gap:6, fontSize:12, fontWeight:800, background:'rgba(255,255,255,0.16)', borderRadius:14, padding:'4px 11px'}}>⏰ {due ? due.txt : 'Sin fecha de cierre'}{assignment.gradable ? ' · calificable' : ' · sin nota'}</div>
          </div>
          {hasStructured(structured) && <div style={{margin:'2px 0'}}><TaskLangToggle lang={lang} setLang={setLang} /></div>}
          <TaskInstructions plain=<span style={{whiteSpace:'pre-wrap'}}>{plain}</span> structured={structured} lang={lang} />
          <div style={{borderTop:'1px dashed var(--border)', paddingTop:12}}>
            <div className="eval-fb-lbl">📥 Cómo entregar</div>
            <HowToSubmit />
          </div>
        </div>
        <div className="modal-actions"><button className="btn-cancel" onClick={onClose}>Cerrar vista previa</button></div>
      </div>
    </div>
  );
}

/* ── editor de instrucciones estructuradas (dentro del formulario) ── */
function StructuredEditor({ value, onChange }) {
  const s = value || emptyStructured();
  const set = (patch) => onChange({ ...s, ...patch });
  const setStep = (i, k, v) => set({ steps: s.steps.map((x, j) => j === i ? { ...x, [k]: v } : x) });
  const setFocus = (i, k, v) => set({ focus: s.focus.map((x, j) => j === i ? { ...x, [k]: (k === 'items' ? v.split(',').map(t => t.trim()).filter(Boolean) : v) } : x) });
  return (
    <div style={{display:'flex', flexDirection:'column', gap:14}}>
      <div>
        <div className="settings-label">🔗 Recurso principal</div>
        <input className="input-text" style={{width:'100%', marginBottom:7}} value={s.resource.label} onChange={e => set({ resource: { ...s.resource, label: e.target.value } })} placeholder="Nombre del recurso (ej: Ejercicios de gramática · ego4u.com)" />
        <input className="input-text" style={{width:'100%'}} value={s.resource.url} onChange={e => set({ resource: { ...s.resource, url: e.target.value } })} placeholder="https://…" />
      </div>
      <div>
        <div className="settings-label">🎯 Enfócate en</div>
        {s.focus.map((f, i) => (
          <div key={i} style={{display:'flex', gap:7, marginBottom:6, alignItems:'center'}}>
            <input className="input-text" style={{flex:'0 0 38%'}} value={f.label} onChange={e => setFocus(i, 'label', e.target.value)} placeholder="Tema (ej: Present Progressive)" />
            <input className="input-text" style={{flex:1}} value={(f.items || []).join(', ')} onChange={e => setFocus(i, 'items', e.target.value)} placeholder="positive, negative, questions" />
            <button type="button" onClick={() => set({ focus: s.focus.filter((_, j) => j !== i) })} style={{...sqBtn, color:'#C0392B'}}>×</button>
          </div>
        ))}
        <button type="button" onClick={() => set({ focus: [...s.focus, { label: '', items: [] }] })} style={dashBtn}>+ tema</button>
      </div>
      <div>
        <div className="settings-label">📝 Pasos (English / Español)</div>
        <div className="settings-hint">Se muestran numerados. En modo “Paralelo” el alumno ve el inglés con su traducción debajo.</div>
        {s.steps.map((st, i) => (
          <div key={i} style={{display:'flex', gap:7, marginBottom:7, alignItems:'flex-start'}}>
            <span style={{width:24, height:24, flexShrink:0, marginTop:4, borderRadius:7, background:'#1F3A8A', color:'#fff', fontWeight:800, fontSize:12, display:'inline-flex', alignItems:'center', justifyContent:'center'}}>{i + 1}</span>
            <div style={{flex:1, display:'flex', flexDirection:'column', gap:5}}>
              <input className="input-text" value={st.en} onChange={e => setStep(i, 'en', e.target.value)} placeholder="English…" />
              <input className="input-text" value={st.es} onChange={e => setStep(i, 'es', e.target.value)} placeholder="Español…" />
            </div>
            <button type="button" onClick={() => set({ steps: s.steps.filter((_, j) => j !== i) })} style={{...sqBtn, marginTop:4, color:'#C0392B'}}>×</button>
          </div>
        ))}
        <button type="button" onClick={() => set({ steps: [...s.steps, { en: '', es: '' }] })} style={dashBtn}>+ paso</button>
      </div>
      <div>
        <div className="settings-label">📎 Material de apoyo (un nombre por línea)</div>
        <textarea className="eval-textarea" rows={2} value={(s.materials || []).map(m => typeof m === 'string' ? m : m.name).join('\n')} onChange={e => set({ materials: e.target.value.split('\n').map(t => t.trim()).filter(Boolean) })} placeholder="Sentence Patterns – Comparison Chart.pdf" />
      </div>
    </div>
  );
}
const sqBtn = { width:30, height:30, flexShrink:0, border:'1px solid var(--border)', background:'#fff', borderRadius:7, cursor:'pointer', fontWeight:800, fontSize:14 };
const dashBtn = { border:'1.5px dashed #9FB0DA', background:'none', color:'#3F5BB8', borderRadius:9, padding:'7px 13px', fontWeight:800, fontSize:12.5, cursor:'pointer' };

/* ── chip de adjunto (audio/video/archivo) ── */
function TaskAttachmentChip({ att, onRemove }) {
  if (att.kind === 'link') {
    return (
      <div className="att-chip">
        <span className="att-ico">🔗</span>
        <div className="att-info">
          <div className="att-name">{att.linkType === 'ext' ? 'Enlace externo' : 'Material JUCUM'}</div>
          <div className="att-meta" style={{maxWidth:260, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{att.url}</div>
        </div>
        <a className="att-btn" href={att.url} target="_blank" rel="noreferrer">Abrir</a>
        {onRemove && <button className="att-remove" onClick={onRemove} title="Quitar">✕</button>}
      </div>
    );
  }
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
function TeacherAssignments({ onBack, embedded }) {
  const { STUDENTS, GROUPS, LEVELS } = window.JUCUM_DATA;
  const T = window.JUCUM_TASKS;
  const [creating, setCreating] = tUseState(false);
  const [editing, setEditing] = tUseState(null);
  const [viewing, setViewing] = tUseState(null); // assignment
  const [tick, setTick] = tUseState(0);
  const refresh = () => setTick(t => t + 1);
  React.useEffect(() => {
    if (window.JUCUM_SYNC && window.JUCUM_SYNC.refreshTasks) {
      window.JUCUM_SYNC.refreshTasks().then(refresh).catch(() => {});
    }
  }, []);

  const assignments = T.getAssignments();

  if (viewing) return <TeacherSubmissions assignment={viewing} onBack={() => { setViewing(null); refresh(); }} />;

  const Wrap = embedded ? 'div' : 'main';
  return (
    <Wrap>
      {!embedded && <button className="back-btn" onClick={onBack}>← Volver al panel</button>}
      {embedded ? (
        <div className="scard" style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:14}}>
          <div className="settings-hint" style={{margin:0}}>Asigna <b>tareas</b> a un grupo o a alumnos puntuales. Ellos entregan adjuntando archivos y ganan XP. Calificar es opcional.</div>
          <button onClick={() => setCreating(true)} style={{flexShrink:0, border:'none', cursor:'pointer', fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:14, color:'#fff', background:'linear-gradient(135deg,#7B5FC4,#5A3FA0)', borderRadius:12, padding:'10px 18px', boxShadow:'0 4px 12px rgba(108,79,176,.3)', whiteSpace:'nowrap'}}>＋ Nueva tarea</button>
        </div>
      ) : (
        <div className="welcome teacher">
          <div className="welcome-text">
            <div className="eyebrow">📝 Tareas</div>
            <h1>Asignaciones</h1>
            <p>Asigna tareas a un grupo o a alumnos puntuales. Ellos entregan adjuntando archivos y ganan XP. Calificar es opcional.</p>
          </div>
          <button className="btn-settings" onClick={() => setCreating(true)}>+ Nueva tarea</button>
        </div>
      )}

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
                  <button className="att-btn" onClick={() => setEditing(a)}>✏️ Editar</button>
                  <button className="att-btn" onClick={() => setViewing(a)}>Ver entregas →</button>
                  <button className="att-btn" style={{borderColor:'#EF9A9A',color:'#C62828'}} onClick={() => { if (confirm('¿Eliminar esta tarea y sus entregas?')) { T.deleteAssignment(a.id); refresh(); } }}>🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {creating && <AssignmentForm onClose={() => setCreating(false)} onSaved={() => { setCreating(false); refresh(); }} />}
      {editing && <AssignmentForm initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
    </Wrap>
  );
}

/* ── formulario de nueva tarea ── */
function AssignmentForm({ onClose, onSaved, initial }) {
  const { GROUPS, STUDENTS, LEVELS } = window.JUCUM_DATA;
  const initLink = (initial && (initial.attachments || []).find(x => x.kind === 'link')) || null;
  const toLocalInput = (iso) => { if (!iso) return ''; const d = new Date(iso); const p = n => String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
  const initMeta = parseTaskMeta(initial || {});
  const [title, setTitle] = tUseState(initial?.title || '');
  const [desc, setDesc] = tUseState(initMeta.plain);
  const [structured, setStructured] = tUseState(initMeta.structured || emptyStructured());
  const [showStruct, setShowStruct] = tUseState(hasStructured(initMeta.structured));
  const [preview, setPreview] = tUseState(false);
  const [due, setDue] = tUseState(toLocalInput(initial?.dueAt));
  const [groupId, setGroupId] = tUseState(initial?.groupId || GROUPS[0]?.id || '');
  const [mode, setMode] = tUseState((initial?.targetStudentIds || []).length > 0 ? 'students' : 'group');
  const [picked, setPicked] = tUseState(initial?.targetStudentIds || []);
  const [gradable, setGradable] = tUseState(!!initial?.gradable);
  const [attachments, setAttachments] = tUseState((initial?.attachments || []).filter(x => x.kind !== 'link'));
  const [linkUrl, setLinkUrl] = tUseState(initLink?.url || '');
  const [linkType, setLinkType] = tUseState(initLink?.linkType || 'jucum');
  const [err, setErr] = tUseState('');

  const groupStudents = STUDENTS.filter(s => s.group === groupId);
  const togglePick = (id) => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const save = async () => {
    if (!title.trim()) { setErr('Ponle un título a la tarea.'); return; }
    if (mode === 'students' && picked.length === 0) { setErr('Elige al menos un alumno.'); return; }
    const finalAtt = [...attachments];
    if (linkUrl.trim()) finalAtt.unshift({ kind: 'link', url: linkUrl.trim(), linkType, name: linkUrl.trim() });
    const data = {
      groupId,
      targetStudentIds: mode === 'students' ? picked : [],
      title: title.trim(),
      description: buildTaskDescription(desc, showStruct ? structured : null),
      dueAt: due ? new Date(due).toISOString() : null,
      gradable,
      attachments: finalAtt,
    };
    setErr('');
    try {
      if (initial) await window.JUCUM_TASKS.updateAssignment(initial.id, data);
      else await window.JUCUM_TASKS.createAssignment(data);
    } catch (e) { setErr('No se pudo guardar: ' + (e && e.message ? e.message : 'inténtalo de nuevo')); return; }
    onSaved();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" style={{maxWidth:640}} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{initial ? '✏️ Editar tarea' : '📝 Nueva tarea'}</div>
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
            <textarea className="eval-textarea" rows={5} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Una introducción breve o el contexto de la tarea…" />
          </div>

          <div className="settings-block">
            <div style={{display:'flex', alignItems:'center', gap:10, flexWrap:'wrap'}}>
              <div className="settings-label" style={{margin:0, flex:1}}>📋 Instrucciones estructuradas <span style={{fontSize:11, fontWeight:700, color:'var(--text-soft)'}}>(como las prácticas)</span></div>
              <button type="button" className={`preset ${showStruct ? 'on' : ''}`} onClick={() => setShowStruct(v => !v)}>{showStruct ? '✓ Activadas' : '+ Activar'}</button>
            </div>
            <div className="settings-hint">Recurso, foco, pasos numerados (EN/ES) y material — ordenado y fácil de leer para el alumno.</div>
            {showStruct && (
              <div style={{marginTop:12, borderTop:'1px dashed var(--border)', paddingTop:14}}>
                <StructuredEditor value={structured} onChange={setStructured} />
                <button type="button" onClick={() => setPreview(true)} style={{marginTop:14, border:'none', cursor:'pointer', fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:13.5, color:'#fff', background:'linear-gradient(135deg,#3F5BB8,#0D1B5A)', borderRadius:11, padding:'9px 16px'}}>👁️ Vista previa · cómo lo verá el alumno</button>
              </div>
            )}
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
            <div className="settings-label">🔗 Link de actividad (opcional)</div>
            <input className="input-text" style={{width:'100%'}} value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://… material JUCUM o web externa" />
            <div className="preset-row" style={{marginTop:8}}>
              <button className={`preset ${linkType==='jucum'?'on':''}`} onClick={() => setLinkType('jucum')}>🟢 Material JUCUM · nota automática</button>
              <button className={`preset ${linkType==='ext'?'on':''}`} onClick={() => setLinkType('ext')}>🟠 Enlace externo · entrega con captura</button>
            </div>
            <div className="settings-hint">El alumno lo abre dentro de la plataforma. Si es material JUCUM, la nota se registra sola; si es externo, el alumno entrega una captura de su resultado.</div>
          </div>

          <div className="settings-block">
            <div className="settings-label">Material para el alumno (opcional)</div>
            <TaskFilePicker attachments={attachments} setAttachments={setAttachments} allowRecord={false} />
          </div>

          <div className="modal-actions">
            <button className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button className="btn-save" onClick={save}>{initial ? '💾 Guardar cambios' : '📨 Asignar tarea'}</button>
          </div>
        </div>
      </div>
      {preview && <StudentTaskPreview assignment={{ title: title || 'Tarea', dueAt: due ? new Date(due).toISOString() : null, gradable, description: buildTaskDescription(desc, structured) }} onClose={() => setPreview(false)} />}
    </div>
  );
}

/* ── entregas de una tarea (profesor) ── */
function TeacherSubmissions({ assignment, onBack }) {
  const { STUDENTS, LEVELS } = window.JUCUM_DATA;
  const T = window.JUCUM_TASKS;
  const [tick, setTick] = tUseState(0);
  const [grading, setGrading] = tUseState(null); // student
  const [editing, setEditing] = tUseState(false);
  const [preview, setPreview] = tUseState(false);
  const [lang, setLang] = tUseState('par');
  const a = T.getAssignments().find(x => x.id === assignment.id) || assignment;
  const recips = T.recipientsOf(a, STUDENTS);
  const subs = T.submissionsFor(a.id);
  const due = taskDueLabel(a.dueAt);
  const { structured, plain } = parseTaskMeta(a);

  return (
    <main>
      <button className="back-btn" onClick={onBack}>← Volver a tareas</button>
      <div className="welcome teacher">
        <div className="welcome-text">
          <div className="eyebrow">📝 Entregas</div>
          <h1>{a.title}</h1>
          <p>{Object.keys(subs).length}/{recips.length} entregadas{due && ` · ⏰ ${due.txt}`}{a.gradable ? ' · calificable' : ' · sin nota'}</p>
        </div>
        <button className="btn-settings" onClick={() => setEditing(true)}>✏️ Editar tarea</button>
      </div>

      {(plain || hasStructured(structured)) && (
        <div className="scard" style={{marginTop:18}}>
          <div style={{display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:12}}>
            <div className="sec-title" style={{flex:1}}>📋 Instrucciones</div>
            {hasStructured(structured) && <TaskLangToggle lang={lang} setLang={setLang} />}
          </div>
          <TaskInstructions plain=<span style={{whiteSpace:'pre-wrap'}}>{plain}</span> structured={structured} lang={lang} />
          <div style={{display:'flex', gap:9, flexWrap:'wrap', marginTop:14, borderTop:'1px dashed var(--border)', paddingTop:13}}>
            <button onClick={() => setPreview(true)} style={{border:'none', cursor:'pointer', fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:13, color:'#fff', background:'linear-gradient(135deg,#3F5BB8,#0D1B5A)', borderRadius:11, padding:'9px 15px'}}>👁️ Vista previa · cómo lo verá el alumno</button>
            <button className="att-btn" onClick={() => setEditing(true)}>✏️ Editar instrucciones</button>
          </div>
        </div>
      )}

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
                {sub && <button className="att-btn" onClick={() => setGrading(s)}>{a.gradable ? '📊 Calificar' : '👁 Ver'}</button>}
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

      {grading && <GradeModal assignment={a} student={grading} sub={subs[grading.id]} onClose={() => { setGrading(null); setTick(t=>t+1); }} />}
      {editing && <AssignmentForm initial={a} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); setTick(t=>t+1); }} />}
      {preview && <StudentTaskPreview assignment={a} onClose={() => setPreview(false)} />}
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
  React.useEffect(() => {
    if (window.JUCUM_SYNC && window.JUCUM_SYNC.refreshTasks) {
      window.JUCUM_SYNC.refreshTasks().then(() => setTick(t => t + 1)).catch(() => {});
    }
  }, []);
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

/* ── Panel: abre el link de la actividad DENTRO de la plataforma ── */
function TaskActivityPanel({ a, link, student, onSubmitGrade, onCaptureAttach, onClose }) {
  const isJucum = link.linkType !== 'ext';
  const base = link.url || '';
  const sep = base.includes('?') ? '&' : '?';
  const src = isJucum
    ? `${base}${sep}jucum_uid=${encodeURIComponent(student.id)}&jucum_mod=tarea&jucum_act=${encodeURIComponent(a.id)}&jucum_group=${encodeURIComponent(student.group||'')}&jucum_name=${encodeURIComponent(a.title||'')}&jucum_kind=task`
    : base;
  const [captured, setCaptured] = tUseState(false);
  const [busy, setBusy] = tUseState(false);

  React.useEffect(() => {
    if (!isJucum) return;
    const onMsg = (e) => {
      const d = e.data;
      if (d && d.source === 'jucum-connect' && d.type === 'done' && String(d.act) === String(a.id)) {
        onSubmitGrade(typeof d.score === 'number' ? d.score : null);
        onClose();
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [a.id, isJucum]);

  const capture = async () => {
    setBusy(true);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream; await video.play();
      await new Promise(r => setTimeout(r, 350));
      const c = document.createElement('canvas');
      c.width = video.videoWidth || 1280; c.height = video.videoHeight || 720;
      c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
      const dataUrl = c.toDataURL('image/png');
      stream.getTracks().forEach(t => t.stop());
      onCaptureAttach({ kind: 'file', dataUrl, name: `Captura ${new Date().toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'})}.png` });
      setCaptured(true);
    } catch (e) { alert('No se pudo capturar la pantalla. Permite “Compartir” o sube tu captura manualmente.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{maxWidth:900, width:'96vw', padding:0, overflow:'hidden'}} onClick={e => e.stopPropagation()}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'#142447',color:'#fff'}}>
          <span>🔗</span>
          <span style={{flex:1,fontSize:12,fontFamily:'monospace',opacity:.85,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{link.url}</span>
          <a href={src} target="_blank" rel="noopener" style={{color:'#fff',fontSize:12,fontWeight:800,marginRight:4}}>↗ Pestaña</a>
          <button onClick={onClose} style={{border:'none',background:'rgba(255,255,255,.18)',color:'#fff',borderRadius:7,padding:'5px 11px',fontWeight:800,cursor:'pointer'}}>✕ Cerrar</button>
        </div>
        <iframe src={src} title="Actividad" style={{width:'100%',height:'60vh',border:0,background:'#fff',display:'block'}} referrerPolicy="no-referrer"></iframe>
        <div style={{padding:'11px 14px',background:'#FAF8F3',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          {isJucum ? (
            <>
              <span style={{flex:1,fontSize:12.5,color:'#555',fontWeight:700}}>🟢 Material JUCUM: al terminar, tu nota se registra sola. (Si no se cierra solo, pulsa “Terminé”.)</span>
              <button className="btn-save" onClick={() => { onSubmitGrade(null); onClose(); }}>✓ Terminé</button>
            </>
          ) : (
            <>
              <span style={{flex:1,fontSize:12.5,color:'#555',fontWeight:700}}>📋 Muestra dónde está tu nota y captura la pantalla — se adjunta a tu entrega.</span>
              <button className="btn-settings" onClick={capture} disabled={busy}>{busy ? 'Capturando…' : (captured ? '📸 Capturar otra' : '📸 Capturar y adjuntar')}</button>
              <button className="btn-save" onClick={onClose}>Cerrar y entregar</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StudentTaskCard({ a, student, onChange }) {
  const T = window.JUCUM_TASKS;
  const sub = T.getSubmission(a.id, student.id);
  const due = taskDueLabel(a.dueAt);
  const closed = !!(due && due.late);
  const [open, setOpen] = tUseState(!sub);
  const [text, setText] = tUseState(sub?.text || '');
  const [attachments, setAttachments] = tUseState(sub?.attachments || []);
  const [saving, setSaving] = tUseState(false);
  const [activity, setActivity] = tUseState(false);
  const [lang, setLang] = tUseState('par');
  const { structured, plain } = parseTaskMeta(a);
  const linkAtt = (a.attachments || []).find(x => x.kind === 'link');
  const fileAtts = (a.attachments || []).filter(x => x.kind !== 'link');

  const onActivityDone = (score) => {
    if (closed) { onChange(); return; }
    window.JUCUM_TASKS.submitAssignment(a.id, student.id, { text: typeof score === 'number' ? `Actividad completada (${score}%).` : 'Actividad completada.', attachments: [] });
    if (typeof score === 'number') window.JUCUM_TASKS.gradeSubmission(a.id, student.id, Math.round(score), 'Nota registrada automáticamente por el material.');
    if (window.JUCUM_NOTIF) window.JUCUM_NOTIF.pushNotif(student.id, { type:'achievement', title:'✅ Actividad completada', body:`Terminaste "${a.title}".` });
    onChange();
  };
  const onCaptureAttach = (att) => { setAttachments(arr => [...arr, att]); setOpen(true); };

  const submit = async () => {
    if (closed) { alert(`La entrega cerró (${due.txt}). Ya no puedes enviar esta tarea.`); return; }
    if (attachments.length === 0 && !text.trim()) { alert('Adjunta un archivo o escribe algo antes de entregar.'); return; }
    setSaving(true);
    try { await Promise.resolve(window.JUCUM_TASKS.submitAssignment(a.id, student.id, { text: text.trim(), attachments })); }
    catch (e) { alert('No se pudo entregar: ' + (e && e.message ? e.message : 'inténtalo de nuevo')); setSaving(false); return; }
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
      {(plain || hasStructured(structured)) && (
        <div style={{marginBottom:10}}>
          {hasStructured(structured) && <div style={{marginBottom:10}}><TaskLangToggle lang={lang} setLang={setLang} /></div>}
          <TaskInstructions plain=<span style={{whiteSpace:'pre-wrap'}}>{plain}</span> structured={structured} lang={lang} />
        </div>
      )}
      {fileAtts.length > 0 && (
        <div className="att-list" style={{marginBottom:10}}>
          {fileAtts.map((x, i) => <TaskAttachmentChip key={i} att={x} />)}
        </div>
      )}
      {linkAtt && (!sub || sub.status !== 'graded') && (
        <div style={{display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', margin:'4px 0 10px'}}>
          <button className="btn-save" onClick={() => setActivity(true)}>▶ Abrir actividad aquí</button>
          <span className="mm-meta" style={{margin:0}}>{linkAtt.linkType === 'ext' ? '🟠 Enlace externo · entrega una captura' : '🟢 Material JUCUM · nota automática'}</span>
        </div>
      )}
      {activity && linkAtt && <TaskActivityPanel a={a} link={linkAtt} student={student} onSubmitGrade={onActivityDone} onCaptureAttach={onCaptureAttach} onClose={() => setActivity(false)} />}

      {sub && sub.status === 'graded' && sub.feedback && (
        <div className="eval-feedback"><div className="eval-fb-lbl">📝 Retroalimentación del profesor</div><div className="eval-fb-text">{sub.feedback}</div></div>
      )}

      {open && (
        <div style={{marginTop:10, paddingTop:10, borderTop:'1px dashed var(--border)'}}>
          {closed ? (
            <>
              <div style={{background:'#FFEBEE', border:'1px solid #EF9A9A', borderRadius:10, padding:'10px 13px', fontSize:13, color:'#C62828', fontWeight:800}}>
                ⏰ La entrega cerró ({due.txt}). Ya no puedes enviar, pero puedes ver la tarea{sub ? ' y tu entrega' : ''}.
              </div>
              {sub && sub.text && <div className="fpost-body" style={{marginTop:8}}>{sub.text}</div>}
              {sub && (sub.attachments||[]).length > 0 && <div className="att-list" style={{marginTop:8}}>{(sub.attachments||[]).map((x,i) => <TaskAttachmentChip key={i} att={x} />)}</div>}
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { TeacherAssignments, StudentAssignments, TaskAttachmentChip, TaskFilePicker, AssignmentForm, TeacherSubmissions, GradeModal, StudentTaskCard, TaskActivityPanel });
