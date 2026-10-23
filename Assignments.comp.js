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
  return !!(s && (s.docset || (s.resource && (s.resource.url || s.resource.label)) || (s.focus && s.focus.length) || (s.steps && s.steps.length) || (s.materials && s.materials.length)));
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

/* ═══════ 📄 TAREA DESDE DOCUMENTO · TASK-IMPORT-V1 (09-oct-2026) ═══════
 * Igual que “Subir plan del teacher”: el teacher elige el grupo y sube su .pdf/.docx/.txt; la plataforma
 * lee título, fecha de entrega, pasos numerados, material del catálogo y enlaces, y abre el formulario de
 * siempre ya lleno para Guardar = publicar en el grupo. El texto va TAL CUAL (no se traduce ni resume). */
function tiParse(lines, groupId, fileName) {
  const D = window.JUCUM_DATA; const PI = window.JUCUM_PLANIMPORT;
  const meta = PI.groupMeta(groupId) || { days: [], start: '', next: [] };
  const g = (D.GROUPS || []).find(x => x.id === groupId) || {}; const mods = (D.MODULE_CATALOG[g.level] || []);
  const cmid = D.getClassModuleId ? D.getClassModuleId(groupId) : null; const mod = mods.find(m => m.id === cmid) || mods[0] || null;
  const today = new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10);
  const L = lines.map(l => String(l).trim()).filter(Boolean).filter(l => !/^jucum english center$/i.test(l));
  const notes = []; const used = new Set();
  /* Título */
  let ti = L.findIndex(l => /^(tarea|homework|assignment|task)\b/i.test(l));
  if (ti < 0) ti = L.findIndex(l => !/^(pre-?a1|a1|a2)\b/i.test(l) && l.length < 120);
  let title = ti >= 0 ? L[ti].replace(/^(tarea|homework|assignment|task)\s*[:·\-–]\s*/i, '').trim() : ''; if (ti >= 0) used.add(ti);
  if (!title && ti >= 0) title = L[ti]; if (!title) { title = String(fileName || 'Tarea').replace(/\.[a-z0-9]+$/i, ''); notes.push('el título'); }
  /* Fecha de entrega */
  let due = '', dueHow = '';
  const di = L.findIndex(l => /(entrega|fecha\s+l[ií]mite|plazo|due|deadline|para el|hasta el|entregar)/i.test(l));
  if (di >= 0) { const r = PI.jRange([L[di]], today); if (r) { due = r.to; dueHow = 'doc'; used.add(di); }
    const tm = L[di].match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?)/i) || L[di].match(/\b(\d{1,2}):(\d{2})\b/);
    if (due && tm) { let h = +tm[1]; const mi = tm[2] || '00'; const ap = (tm[3] || '').toLowerCase().replace(/[^ap]/g, ''); if (ap === 'p' && h < 12) h += 12; if (ap === 'a' && h === 12) h = 0; due += 'T' + String(h).padStart(2, '0') + ':' + mi; } }
  if (!due) { const nx = (meta.next || []).find(d => d > today) || meta.next[0]; if (nx) { due = nx; dueHow = 'next'; } notes.push('la fecha de entrega'); }
  if (due && due.length === 10) due += 'T' + (dueHow === 'next' && meta.start ? meta.start : '23:59');
  /* Pasos numerados o con viñeta */
  const steps = []; L.forEach((l, i) => { const m = l.match(/^(?:\d+[.)]|[-•·*])\s+(.+)$/); if (m && !used.has(i)) { steps.push({ es: m[1], en: '' }); used.add(i); } });
  /* Enlaces y material del catálogo */
  const urls = []; L.forEach(l => (l.match(/https?:\/\/[^\s)]+/g) || []).forEach(u => urls.push(u)));
  /* El material NOMBRADO gana a lo que solo sale de un verbo (“graba tu audio” ≠ listening si dice “Story 2”) */
  const KW = { story: /\b(story|stories|historia|di[aá]logo|dialog)/i, quizlet: /quizlet|vocabulario/i, grammar: /\b(P[123]|fill|identif|transform|gram[aá]tica|pr[aá]ctica\s*[123])\b/i, summary: /resumen|summary/i, reading: /\b(reading|lectura)\b/i, listening: /\b(listening|comprensi[oó]n auditiva)\b/i };
  const found = []; if (mod && PI.matchJ) L.forEach((l, li) => PI.matchJ(mod, l, null).forEach(x => { const kw = KW[x.a.type] && KW[x.a.type].test(l); const sc = (kw ? 3 : 0) + (li === ti ? 1 : 0); const k = found.find(f => f.a.id === x.a.id && f.quizKey === x.quizKey); if (k) { k.sc = Math.max(k.sc, sc); k.kw = k.kw || kw; } else found.push({ ...x, sc, kw, li }); }));
  found.sort((a, b) => b.sc - a.sc || a.li - b.li);
  if (found.some(f => f.kw)) { for (let i = found.length - 1; i >= 0; i--) if (!found[i].kw) found.splice(i, 1); }
  const attachments = []; let gradable = /calific|nota|puntaje|graded|score/i.test(L.join(' '));
  if (found.length) { const f = found[0]; const a = f.a; let url = a.url || '';
    if (a.type === 'quizlet') { const q = { vocabulario: a.quizVocabulario, vocabulario2: a.quizVocabulario2, traducir: a.quizTraducir, ordenar: a.quizOrdenar }; url = q[f.quizKey] || a.quizVocabulario || a.quizTraducir || a.quizOrdenar || url; }
    if (url) { attachments.push({ kind: 'link', url, linkType: a.type === 'quizlet' ? 'ext' : 'jucum', name: a.name }); if (f.kw && ['grammar', 'reading', 'listening'].includes(a.type)) gradable = true; } }
  else if (urls.length) attachments.push({ kind: 'link', url: urls[0], linkType: /jucumenglishcenter\.github\.io/i.test(urls[0]) ? 'jucum' : 'ext', name: urls[0] });
  if (!attachments.length) notes.push('el enlace de la actividad');
  const plain = L.filter((l, i) => !used.has(i)).join('\n');
  const structured = { resource: { label: found.length ? found[0].a.name : '', url: attachments[0] ? attachments[0].url : '' }, focus: [], steps, materials: found.slice(1).map(f => f.a.name) };
  return { title, description: buildTaskDescription(plain, structured), dueAt: due ? new Date(due).toISOString() : null, groupId, targetStudentIds: [], gradable, attachments, _file: fileName, _notes: notes };
}
function TaskImportModal({ onClose, onParsed, onDocSets }) {
  const { GROUPS } = window.JUCUM_DATA;
  const [gid, setGid] = tUseState(() => { let v = ''; try { v = localStorage.getItem('jucum_planner_group_v1') || ''; } catch (e) {} return (GROUPS.find(g => g.id === v) || GROUPS[0] || {}).id || ''; });
  const [busy, setBusy] = tUseState(false); const [err, setErr] = tUseState('');
  const fileRef = tUseRef(null);
  const read = async (f) => {
    if (!f) return; if (!gid) { setErr('Elige primero el grupo.'); return; }
    setBusy(true); setErr('');
    try { const PI = window.JUCUM_PLANIMPORT; const r = await PI.readFile(f); const lines = PI.jLines(r); if (!lines.length) throw new Error('El documento no trae texto.');
      /* DOCSETS-V1: si trae bloques “Step N: … • Practice X of Y”, se convierte en sets interactivos */
      const DSd = window.JUCUM_DOCSETS && onDocSets ? window.JUCUM_DOCSETS.detect(lines) : null;
      if (DSd && DSd.sets.length) { setBusy(false); onDocSets({ doc: DSd, groupId: gid, fileName: f.name }); return; }
      onParsed(tiParse(lines, gid, f.name)); }
    catch (e) { setErr(e && e.message ? e.message : 'No pude leer el documento.'); }
    setBusy(false);
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" style={{maxWidth:560}} onClick={e => e.stopPropagation()}>
        <div className="modal-head"><div className="modal-title">📄 Subir tarea desde un documento</div><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          {err && <div className="err" style={{marginBottom:12}}>⚠ {err}</div>}
          <div className="settings-block"><div className="settings-label">1 · ¿Para qué grupo?</div>
            {window.GroupPicker ? <GroupPicker value={gid} onChange={e => setGid(e.target.value)} /> : <select className="input-text" style={{width:'100%'}} value={gid} onChange={e => setGid(e.target.value)}>{GROUPS.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>}
          </div>
          <div className="settings-block"><div className="settings-label">2 · Tu documento (.pdf · .docx · .txt)</div>
            <div onClick={() => !busy && fileRef.current && fileRef.current.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); read(e.dataTransfer.files[0]); }} style={{border:'2px dashed #9FB0DA', borderRadius:14, padding:'22px 14px', textAlign:'center', cursor:'pointer', background:'#F7F9FE', fontWeight:800, color:'#3F5BB8', fontSize:14}}>{busy ? 'Leyendo…' : '📎 Toca o arrastra el archivo aquí'}</div>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" style={{display:'none'}} onChange={e => { read(e.target.files[0]); e.target.value = ''; }} />
          </div>
          <div className="settings-hint" style={{lineHeight:1.55}}>Si tu hoja trae bloques <b>“Step 1: … • Practice 1 of 2”</b>, la convierto en <b>sets interactivos</b> y eliges cuál va 🏫 en clase y cuál 🏠 para casa. Si no, leo el <b>título</b>, la <b>fecha de entrega</b> (“Entrega: viernes 10 oct, 8 pm”), los <b>pasos</b> numerados y el <b>material</b> de la plataforma que nombres (Story 2, P1, Quizlet Traducir…) o un enlace. Si no dice fecha, propongo la próxima clase del grupo. Luego revisas y pulsas Guardar.</div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════ PROFESOR ═══════════════════════ */
function Wrap0({ embedded, children }) { return embedded ? <div>{children}</div> : <main>{children}</main>; }
/* 📋 Tareas ordenadas por grupo · TASKS-BY-GROUP-V1 (23-oct-2026) — aprobado en “Espejo - Tareas por grupo.html”.
 * Primero se elige el grupo (GroupPicker, compartido con el Planificador), luego sus tareas con 4 filtros
 * (por revisar · en curso · para clase · cerradas), los sets de un mismo documento juntos, un botón principal
 * por fila + menú ⋯, y selección múltiple para duplicar · pasar a otro grupo · cambiar fecha · eliminar. */
function tbgInfo(a, T, STUDENTS) {
  const X = window.JUCUM_DOCSETS, ds = X && X.isDocset(a) ? X.meta(a) : null;
  const subs = T.submissionsFor(a.id), ids = Object.keys(subs);
  let rev = 0;
  ids.forEach(k => { const sb = subs[k]; if (ds) { const z = X.unpack(sb && sb.text); rev += z ? X.nRev(z.res) : 0; } else if (a.gradable && sb && sb.status !== 'graded') rev += 1; });
  const now = Date.now(); let st;
  if (ds && ds.mode === 'class') st = X.liveState(ds) === 'closed' ? 'closed' : 'cls';
  else st = (a.dueAt && new Date(a.dueAt).getTime() < now) ? 'closed' : 'open';
  return { ds, nSub: ids.length, recips: T.recipientsOf(a, STUDENTS).length, rev, st, doc: ds ? (ds.docTitle || ds.file || '') : '' };
}
function TaskMoreMenu({ items }) {
  const [open, setOpen] = tUseState(false); const ref = tUseRef(null);
  React.useEffect(() => { if (!open) return; const off = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener('mousedown', off); return () => document.removeEventListener('mousedown', off); }, [open]);
  return (
    <div ref={ref} style={{position:'relative', flex:'none'}} onClick={e => e.stopPropagation()}>
      <button className="att-btn" title="Más opciones" style={{width:38, padding:'6px 0', fontSize:16, lineHeight:1}} onClick={() => setOpen(o => !o)}>⋯</button>
      {open && <div style={{position:'absolute', right:0, top:'calc(100% + 4px)', background:'#fff', border:'1px solid #E2DED3', borderRadius:12, boxShadow:'0 12px 30px rgba(0,0,0,.16)', padding:6, zIndex:60, minWidth:230}}>
        {items.filter(Boolean).map((it, i) => <button key={i} onClick={() => { setOpen(false); it.on(); }} style={{display:'block', width:'100%', textAlign:'left', border:'none', background:'none', padding:'8px 10px', borderRadius:8, fontWeight:800, fontSize:13, cursor:'pointer', fontFamily:'inherit', color: it.danger ? '#C62828' : '#333', whiteSpace:'nowrap'}} onMouseEnter={e => e.currentTarget.style.background = '#F3F1EA'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>{it.t}</button>)}
      </div>}
    </div>);
}
function TaskDateModal({ tasks, onClose, onDone }) {
  const X = window.JUCUM_DOCSETS;
  const toLocal = (d) => { const p = n => String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
  const isCls = a => !!(X && X.isClass(a));
  const home = tasks.filter(a => !isCls(a)), cls = tasks.filter(isCls);
  const base = home[0] && home[0].dueAt ? new Date(home[0].dueAt) : new Date(Date.now() + 86400000);
  const [due, setDue] = tUseState(toLocal(base)); const [busy, setBusy] = tUseState(false); const [err, setErr] = tUseState('');
  const shift = (days) => { const d = new Date(Math.max(Date.now(), base.getTime())); d.setDate(d.getDate() + days); setDue(toLocal(d)); };
  const run = async () => {
    if (!due) return; setBusy(true); setErr(''); const iso = new Date(due).toISOString(); let fail = 0;
    for (const a of home) {
      try { if (X && X.isDocset(a)) { const u = await X.patch(a, d => { d.dueAt = iso; }); if (u && u._synced === false) fail++; X.notifyGroup(a, '⏰ Tu profe cambió el plazo', `“${a.title}” · ahora hasta ${new Date(iso).toLocaleString('es-PE', { weekday:'short', day:'numeric', month:'short', hour:'numeric', minute:'2-digit' })}.`, 'tasks'); }
        else { const r = await window.JUCUM_TASKS.updateAssignment(a.id, { dueAt: iso }); if (r && r.synced === false) fail++; } } catch (e) { fail++; }
    }
    setBusy(false); if (fail) { setErr(fail + ' no se pudo(ieron) subir: se reintenta solo al abrir Tareas.'); return; } onDone();
  };
  return (
    <div className="modal-backdrop" onClick={busy ? undefined : onClose}>
      <div className="modal settings-modal" style={{maxWidth:520}} onClick={e => e.stopPropagation()}>
        <div className="modal-head"><div className="modal-title">⏰ Cambiar fecha de entrega</div><button className="modal-close" onClick={onClose} disabled={busy}>✕</button></div>
        <div className="modal-body">
          <div style={{fontSize:13, fontWeight:700, color:'#555', marginBottom:12, lineHeight:1.5}}>{home.length} tarea{home.length === 1 ? '' : 's'}: {home.slice(0, 3).map(a => a.title).join(' · ')}{home.length > 3 ? ' …' : ''}</div>
          {cls.length > 0 && <div className="settings-hint" style={{marginBottom:10}}>🏫 {cls.length} de clase no cambian aquí: su tiempo se maneja en ▶ Modo clase (＋min, hasta una hora, cerrar ya).</div>}
          {home.length > 0 ? <>
            <div style={{display:'flex', gap:6, flexWrap:'wrap', marginBottom:10}}>
              <button className="preset" onClick={() => shift(1)}>＋1 día</button><button className="preset" onClick={() => shift(2)}>＋2 días</button><button className="preset" onClick={() => shift(7)}>＋1 semana</button>
            </div>
            <input type="datetime-local" className="input-text" value={due} onChange={e => setDue(e.target.value)} />
            <div className="settings-hint" style={{marginTop:8}}>Si ya había cerrado, se vuelve a abrir. Los alumnos reciben el aviso en la campanita.</div>
          </> : null}
          {err && <div className="err" style={{marginTop:10}}>⚠ {err}</div>}
          <div className="modal-actions"><button className="btn-cancel" onClick={onClose} disabled={busy}>Cancelar</button>{home.length > 0 && <button className="btn-save" disabled={busy || !due} onClick={run}>{busy ? 'Guardando…' : '✓ Guardar fecha'}</button>}</div>
        </div>
      </div>
    </div>);
}
function TeacherAssignments({ onBack, embedded, groupId: gidProp, onGroupChange }) {
  const { STUDENTS, GROUPS, LEVELS } = window.JUCUM_DATA;
  const T = window.JUCUM_TASKS;
  const [creating, setCreating] = tUseState(false);
  const [editing, setEditing] = tUseState(null);
  const [importing, setImporting] = tUseState(false);
  const [prefill, setPrefill] = tUseState(null);
  const [dupping, setDupping] = tUseState(null);   // ⧉ TASK-DUP-V1: tarea a duplicar
  const [docSets, setDocSets] = tUseState(null);   // ✍️ DOCSETS-V1: sets leídos del documento
  const [viewing, setViewing] = tUseState(null); // assignment
  const [tick, setTick] = tUseState(0);
  const [retrying, setRetrying] = tUseState(false);
  const refresh = () => setTick(t => t + 1);
  /* TASKS-BY-GROUP-V1 */
  const [gidOwn, setGidOwn] = tUseState(() => { let v = ''; try { v = localStorage.getItem('jucum_planner_group_v1') || ''; } catch (e) {} return (GROUPS.find(g => g.id === v) || {}).id || ''; });
  const gid = (gidProp !== undefined && GROUPS.some(g => g.id === gidProp)) ? gidProp : gidOwn;
  const setGid = (id) => { setGidOwn(id); setSel([]); setFilt(null); if (onGroupChange) onGroupChange(id); else { try { if (window.JUCUM_STORE) window.JUCUM_STORE.set('jucum_planner_group_v1', id); else localStorage.setItem('jucum_planner_group_v1', id); } catch (e) {} } };
  const [filt, setFilt] = tUseState(null);
  const [sel, setSel] = tUseState([]);
  const [fold, setFold] = tUseState({});
  const [bulkDup, setBulkDup] = tUseState(null);   // { tasks, move }
  const [dating, setDating] = tUseState(null);
  React.useEffect(() => {
    if (window.JUCUM_SYNC && window.JUCUM_SYNC.refreshTasks) {
      window.JUCUM_SYNC.refreshTasks().then(refresh).catch(() => {});
    }
  }, []);

  const assignments = T.getAssignments();
  // Tareas que quedaron guardadas solo en este equipo (su subida no se confirmó)
  const pend = assignments.filter(a => a && a.pendingSync);
  const reintentar = async () => {
    setRetrying(true);
    try { if (T.retryPending) await T.retryPending(); } catch (e) {}
    setRetrying(false); refresh();
  };

  if (viewing && window.JUCUM_DOCSETS && window.JUCUM_DOCSETS.isDocset(viewing) && window.DocSetResults) return (
    <Wrap0 embedded={embedded}><button className="back-btn" onClick={() => { setViewing(null); refresh(); }}>← Tareas</button><DocSetResults a={viewing} /></Wrap0>);
  if (viewing) return <TeacherSubmissions assignment={viewing} onBack={() => { setViewing(null); refresh(); }} />;

  const Wrap = embedded ? 'div' : 'main';
  return (
    <Wrap>
      {!embedded && <button className="back-btn" onClick={onBack}>← Volver al panel</button>}
      {embedded ? (
        <div className="scard" style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:14}}>
          <div className="settings-hint" style={{margin:0}}>Asigna <b>tareas</b> a un grupo o a alumnos puntuales. Ellos entregan adjuntando archivos y ganan XP. Calificar es opcional.</div>
          <div style={{display:'flex', gap:8, flexWrap:'wrap', flexShrink:0}}>
            {window.JUCUM_PLANIMPORT && <button onClick={() => setImporting(true)} style={{border:'none', cursor:'pointer', fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:14, color:'#fff', background:'linear-gradient(135deg,#3F5BB8,#0D1B5A)', borderRadius:12, padding:'10px 18px', boxShadow:'0 4px 12px rgba(13,27,90,.25)', whiteSpace:'nowrap'}}>📄 Subir tarea (documento)</button>}
            <button onClick={() => setCreating(true)} style={{border:'none', cursor:'pointer', fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:14, color:'#fff', background:'linear-gradient(135deg,#7B5FC4,#5A3FA0)', borderRadius:12, padding:'10px 18px', boxShadow:'0 4px 12px rgba(108,79,176,.3)', whiteSpace:'nowrap'}}>＋ Nueva tarea</button>
          </div>
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

      {pend.length > 0 && (
        <div className="scard" style={{marginTop:14, background:'#FFF8E1', borderColor:'#F0C66B', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap'}}>
          <div style={{flex:1, minWidth:230, fontSize:13.5, fontWeight:700, color:'#7A4E00', lineHeight:1.55}}>
            ⏳ {pend.length === 1 ? 'Hay 1 tarea guardada' : `Hay ${pend.length} tareas guardadas`} solo en este equipo: <b>tus alumnos todavía no {pend.length === 1 ? 'la ven' : 'las ven'}</b>. Revisa tu internet y súbe{pend.length === 1 ? 'la' : 'las'} — también se reintenta solo cada vez que abres Tareas.
          </div>
          <button className="att-btn" disabled={retrying} onClick={reintentar} style={{borderColor:'#F0C66B', color:'#7A4E00', fontWeight:800, flexShrink:0}}>{retrying ? 'Subiendo…' : '🔄 Reintentar subida'}</button>
        </div>
      )}

      {(() => {
        const GP = window.GroupPicker;
        const group = GROUPS.find(g => g.id === gid);
        const lvOf = g => (LEVELS[g.level] || { color:'#B0AC9E', dark:'#5b5648', code:'?' });
        const infoAll = {}; assignments.forEach(a => { infoAll[a.id] = tbgInfo(a, T, STUDENTS); });
        const revByG = {}; assignments.forEach(a => { if (infoAll[a.id].rev) revByG[a.groupId] = (revByG[a.groupId] || 0) + infoAll[a.id].rev; });
        const pickerEl = GP ? <GP value={gid} onChange={e => setGid(e.target.value)} placeholder="— Elige el grupo —" /> :
          <select className="input-text" value={gid} onChange={e => setGid(e.target.value)}><option value="">— Elige el grupo —</option>{GROUPS.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>;
        if (!group) {
          const pend = GROUPS.filter(g => revByG[g.id] && !g.finishedAt);
          return (<>
            <div className="scard" style={{marginTop:16, textAlign:'center', padding:'28px 18px'}}>
              <div style={{fontSize:38}}>📋</div>
              <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:21, margin:'6px 0 4px'}}>¿De qué grupo quieres ver las tareas?</div>
              <div className="settings-hint" style={{marginBottom:14}}>Elige el grupo y verás solo sus tareas, ordenadas. Se recuerda para la próxima vez.</div>
              <div style={{display:'flex', justifyContent:'center'}}><div style={{width:'min(440px,100%)', textAlign:'left'}}>{pickerEl}</div></div>
            </div>
            {pend.length > 0 && <>
              <div style={{display:'flex', alignItems:'center', gap:8, margin:'18px 0 8px', fontSize:11.5, fontWeight:900, letterSpacing:'.07em', textTransform:'uppercase', color:'#8A5A00', whiteSpace:'nowrap'}}>🟨 Tienen algo por revisar<i style={{flex:1, height:1, background:'#E2DED3'}}></i></div>
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))', gap:8}}>
                {pend.map(g => <button key={g.id} onClick={() => setGid(g.id)} style={{display:'flex', alignItems:'center', gap:10, border:'1px solid var(--border)', borderLeft:'5px solid ' + lvOf(g).color, background:'#fff', borderRadius:12, padding:'9px 12px', cursor:'pointer', fontFamily:'inherit', textAlign:'left'}}>
                  <span style={{flex:1, minWidth:0}}><b style={{fontSize:13.5, display:'block'}}>{g.name}</b><small style={{color:'#8a7f6a', fontWeight:700}}>{g.schedule || ''}</small></span>
                  <span style={{fontSize:10.5, fontWeight:900, borderRadius:10, padding:'1px 7px', background:'#FFE7A8', color:'#7A4E00', whiteSpace:'nowrap'}}>🟨 {revByG[g.id]}</span></button>)}
              </div></>}
          </>);
        }
        const mine = assignments.filter(a => a.groupId === gid);
        const F = { rev: mine.filter(a => infoAll[a.id].rev), curso: mine.filter(a => infoAll[a.id].st !== 'closed'), cls: mine.filter(a => infoAll[a.id].st === 'cls'), cerr: mine.filter(a => infoAll[a.id].st === 'closed') };
        const nRevAll = mine.reduce((n, a) => n + infoAll[a.id].rev, 0);
        const f = filt || (F.rev.length ? 'rev' : 'curso');
        const LAB = { rev: ['🟨', 'Por revisar', F.rev.length], curso: ['🟢', 'En curso', F.curso.length], cls: ['🏫', 'Para clase', F.cls.length], cerr: ['✓', 'Cerradas', F.cerr.length] };
        const shown = F[f];
        const isSel = id => sel.includes(id);
        const tgl = id => setSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
        const selTasks = assignments.filter(a => sel.includes(a.id));
        const delMany = (list) => { if (!confirm(list.length > 1 ? `¿Eliminar ${list.length} tareas y sus entregas?` : '¿Eliminar esta tarea y sus entregas?')) return; list.forEach(a => T.deleteAssignment(a.id)); setSel([]); refresh(); };
        const ck = (a) => <input type="checkbox" checked={isSel(a.id)} onChange={() => tgl(a.id)} onClick={e => e.stopPropagation()} style={{width:19, height:19, accentColor:'#1F3A8A', flex:'none', cursor:'pointer'}} />;
        const kindChip = (a, i) => i.ds ? (i.ds.mode === 'class' ? <span className="mm-chip" style={{background:'#F3E5F5', color:'#6A1B9A', whiteSpace:'nowrap'}}>🏫 En clase · {i.ds.planDate}{window.JUCUM_DOCSETS.liveState(i.ds) === 'open' ? ' · ● en vivo' : ''}</span> : <span className="mm-chip" style={{background:'#FFF3E0', color:'#BF360C', whiteSpace:'nowrap'}}>🏠 Para casa</span>) : null;
        const metaEl = (a, i) => { const due = taskDueLabel(a.dueAt); const targeted = (a.targetStudentIds || []).length > 0; return (
          <div className="mm-meta">
            {targeted ? `${i.recips} alumno${i.recips === 1 ? '' : 's'} puntual${i.recips === 1 ? '' : 'es'} · ` : ''}
            {i.st === 'cls' && i.nSub === 0 ? <span>⏳ te espera en ▶ Modo clase</span> : <><b>{i.nSub}/{i.recips}</b> entregada{i.nSub === 1 ? '' : 's'}</>}
            {due && i.ds?.mode !== 'class' && <span style={{color: due.late ? '#8a7f6a' : '#E65100', fontWeight:800}}> · ⏰ {due.txt}</span>}
            {i.rev > 0 && <> · <span className="mm-chip" style={{background:'#FFF8E1', color:'#8A5A00', whiteSpace:'nowrap'}}>🟨 {i.rev} por revisar</span></>}
          </div>); };
        const mainBtn = (a, i) => i.rev ? <button className="btn-save" style={{padding:'8px 14px', fontSize:12.5, whiteSpace:'nowrap'}} onClick={() => setViewing(a)}>Revisar {i.rev} →</button>
          : <button className="att-btn" style={{whiteSpace:'nowrap'}} onClick={() => setViewing(a)}>{i.st === 'cls' ? '📊 Ver avance' : 'Ver entregas →'}</button>;
        const menuEl = (a, i) => <TaskMoreMenu items={[
          { t: '✏️ Editar', on: () => setEditing(a) },
          i.ds?.mode !== 'class' && { t: '⏰ Cambiar fecha de entrega', on: () => setDating([a]) },
          { t: '⧉ Duplicar (este u otros grupos)', on: () => setDupping(a) },
          { t: '➜ Pasar a otro grupo', on: () => setBulkDup({ tasks: [a], move: true }) },
          { t: '🗑 Eliminar', danger: true, on: () => delMany([a]) }]} />;
        const card = (a) => { const i = infoAll[a.id]; return (
          <div key={a.id} className="scard mm-card" style={{cursor:'pointer', flexWrap:'wrap'}} onClick={() => setViewing(a)}>
            {ck(a)}
            <div className="mm-emoji" style={{fontSize:26}}>{i.ds ? (i.ds.mode === 'class' ? '🏫' : '✍️') : '📝'}</div>
            <div className="mm-info" style={{minWidth:200}}>
              <div className="mm-name">{a.title} {kindChip(a, i)} {a.gradable && !i.ds && <span className="mm-chip" style={{background:'#E3E9F8', color:'#1F3A8A'}}>calificable</span>} {a.pendingSync && <span className="mm-chip" style={{background:'#FFF8E1', color:'#7A4E00'}}>⏳ sin subir</span>}</div>
              {metaEl(a, i)}
            </div>
            <div className="mm-actions" style={{alignItems:'center'}} onClick={e => e.stopPropagation()}>{mainBtn(a, i)}{menuEl(a, i)}</div>
          </div>); };
        const pack = (doc, list) => { const k = gid + '|' + doc, op = !fold[k], all = list.every(a => isSel(a.id)), rv = list.reduce((n, a) => n + infoAll[a.id].rev, 0), nc = list.filter(a => infoAll[a.id].ds.mode === 'class').length;
          const sorted = list.slice().sort((p, q) => String(infoAll[p.id].ds.step).localeCompare(String(infoAll[q.id].ds.step), undefined, { numeric: true }));
          return (
            <div key={k} className="scard" style={{padding:0, overflow:'hidden'}}>
              <div onClick={() => setFold(o => ({ ...o, [k]: op }))} style={{display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'#F6F8FD', cursor:'pointer', flexWrap:'wrap'}}>
                <input type="checkbox" checked={all} onClick={e => e.stopPropagation()} onChange={() => setSel(p => all ? p.filter(x => !list.some(a => a.id === x)) : [...new Set([...p, ...list.map(a => a.id)])])} style={{width:19, height:19, accentColor:'#1F3A8A', cursor:'pointer'}} />
                <span style={{fontSize:26}}>📄</span>
                <div style={{flex:1, minWidth:200}}>
                  <div className="mm-name">{doc} <span style={{color:'#8a7f6a', fontWeight:700, fontSize:12.5}}>· documento · {list.length} set{list.length === 1 ? '' : 's'}</span></div>
                  <div style={{display:'flex', gap:6, flexWrap:'wrap', marginTop:3}}>
                    {nc > 0 && <span className="mm-chip" style={{background:'#F3E5F5', color:'#6A1B9A', whiteSpace:'nowrap'}}>🏫 {nc} en clase</span>}
                    {list.length - nc > 0 && <span className="mm-chip" style={{background:'#FFF3E0', color:'#BF360C', whiteSpace:'nowrap'}}>🏠 {list.length - nc} para casa</span>}
                    {rv > 0 && <span className="mm-chip" style={{background:'#FFF8E1', color:'#8A5A00', whiteSpace:'nowrap'}}>🟨 {rv} por revisar</span>}
                  </div>
                </div>
                <button className="att-btn" style={{borderColor:'#9FB0DA', color:'#3F5BB8', whiteSpace:'nowrap'}} onClick={e => { e.stopPropagation(); setBulkDup({ tasks: sorted, move: false }); }}>⧉ Duplicar documento</button>
                <span style={{fontWeight:900, color:'#1F3A8A', fontSize:14}}>{op ? '▾' : '▸'}</span>
              </div>
              {op && sorted.map(a => { const i = infoAll[a.id]; return (
                <div key={a.id} onClick={() => setViewing(a)} style={{display:'flex', alignItems:'center', gap:12, padding:'10px 14px 10px 18px', borderTop:'1px solid #EEF0F6', flexWrap:'wrap', cursor:'pointer', background:'#fff'}}>
                  {ck(a)}<span style={{fontSize:19}}>{i.ds.mode === 'class' ? '🏫' : '🏠'}</span>
                  <div style={{flex:1, minWidth:200}}>
                    <div style={{fontWeight:800, fontSize:13.8}}>{a.title} {a.pendingSync && <span className="mm-chip" style={{background:'#FFF8E1', color:'#7A4E00'}}>⏳ sin subir</span>}</div>
                    {metaEl(a, i)}
                  </div>
                  <div className="mm-actions" style={{alignItems:'center'}} onClick={e => e.stopPropagation()}>{mainBtn(a, i)}{menuEl(a, i)}</div>
                </div>); })}
            </div>); };
        const out = [], seen = {};
        shown.forEach(a => { const d = infoAll[a.id].doc; if (d) { if (seen[d]) return; seen[d] = 1; out.push(pack(d, shown.filter(x => infoAll[x.id].doc === d))); } else out.push(card(a)); });
        const allSel = shown.length > 0 && shown.every(a => isSel(a.id));
        const L = lvOf(group);
        return (<>
          <div className="scard" style={{marginTop:16, display:'flex', gap:14, alignItems:'center', flexWrap:'wrap', borderLeft:'6px solid ' + L.color}}>
            <div style={{flex:'1 1 260px', maxWidth:480, minWidth:0}}>{pickerEl}</div>
            <div className="settings-hint" style={{margin:0}}>{mine.length} tarea{mine.length === 1 ? '' : 's'} en este grupo</div>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:8, margin:'12px 0 4px'}}>
            {Object.keys(LAB).map(k => { const on = f === k; return (
              <button key={k} onClick={() => { setFilt(k); setSel([]); }} style={{border:'1.5px solid ' + (on ? '#1F3A8A' : 'var(--border)'), background: on ? '#EEF2FC' : '#fff', borderRadius:14, padding:'10px 12px', cursor:'pointer', textAlign:'left', fontFamily:'inherit', boxShadow: on ? '0 2px 8px rgba(31,58,138,.15)' : 'none'}}>
                <b style={{display:'block', fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:23, lineHeight:1.1, color: k === 'rev' && LAB.rev[2] ? '#B26A00' : 'inherit'}}>{LAB[k][0]} {LAB[k][2]}</b>
                <span style={{fontSize:12, fontWeight:800, color: on ? '#1F3A8A' : '#6f6f6f'}}>{LAB[k][1]}{k === 'rev' && nRevAll ? ` · ${nRevAll} respuesta${nRevAll === 1 ? '' : 's'}` : ''}</span>
              </button>); })}
          </div>
          {sel.length > 0 && (
            <div style={{position:'sticky', top:10, zIndex:40, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', background:'#1F3A8A', color:'#fff', borderRadius:14, padding:'10px 14px', margin:'10px 0', fontWeight:800, fontSize:13.5, boxShadow:'0 8px 20px rgba(13,27,90,.3)'}}>
              ☑ {sel.length} seleccionada{sel.length === 1 ? '' : 's'}<span style={{flex:1}}></span>
              <button className="att-btn" style={{background:'#fff', color:'#1F3A8A', whiteSpace:'nowrap'}} onClick={() => setBulkDup({ tasks: selTasks, move: false })}>⧉ Duplicar</button>
              <button className="att-btn" style={{background:'#fff', color:'#1F3A8A', whiteSpace:'nowrap'}} onClick={() => setBulkDup({ tasks: selTasks, move: true })}>➜ Pasar a otro grupo</button>
              <button className="att-btn" style={{background:'#fff', color:'#1F3A8A', whiteSpace:'nowrap'}} onClick={() => setDating(selTasks)}>⏰ Cambiar fecha</button>
              <button className="att-btn" style={{background:'#fff', color:'#C62828'}} onClick={() => delMany(selTasks)}>🗑</button>
              <button className="att-btn" style={{background:'#fff', color:'#555'}} onClick={() => setSel([])}>✕</button>
            </div>)}
          <div style={{display:'flex', alignItems:'center', gap:8, margin:'18px 0 8px', fontSize:11.5, fontWeight:900, letterSpacing:'.07em', textTransform:'uppercase', color:'#6f6f6f'}}>
            {LAB[f][0]} {LAB[f][1]}<i style={{flex:1, height:1, background:'#E2DED3'}}></i>
            {shown.length > 0 && <label style={{textTransform:'none', letterSpacing:0, fontSize:12, display:'flex', gap:6, alignItems:'center', cursor:'pointer'}}><input type="checkbox" checked={allSel} onChange={() => setSel(allSel ? [] : shown.map(a => a.id))} style={{width:17, height:17, accentColor:'#1F3A8A'}} /> Marcar todas</label>}
          </div>
          {shown.length ? <div className="mm-list">{out}</div> : (
            <div className="scard"><div className="empty-state"><div className="icon">{f === 'rev' ? '🎉' : '📝'}</div>{f === 'rev' ? 'Nada por revisar en este grupo.' : f === 'cerr' ? 'Aún no hay tareas cerradas.' : f === 'cls' ? 'No hay actividades para clase. Súbelas desde 📄 Subir tarea (documento).' : 'No hay tareas en curso. Sube un documento o crea una tarea.'}</div></div>)}
        </>);
      })()}

      {creating && <AssignmentForm prefill={gid ? { groupId: gid } : null} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); refresh(); }} />}
      {importing && <TaskImportModal onClose={() => setImporting(false)} onParsed={pf => { setImporting(false); setPrefill(pf); }} onDocSets={d => { setImporting(false); setDocSets(d); }} />}
      {docSets && window.DocSetReview && <DocSetReview doc={docSets.doc} groupId={docSets.groupId} fileName={docSets.fileName} onClose={() => setDocSets(null)} onDone={() => { setDocSets(null); refresh(); }} />}
      {prefill && <AssignmentForm prefill={prefill} onClose={() => setPrefill(null)} onSaved={() => { setPrefill(null); refresh(); }} />}
      {editing && <AssignmentForm initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
      {dupping && <DuplicateTaskModal task={dupping} onClose={() => setDupping(null)} onDone={() => { setDupping(null); refresh(); }} onEditCopy={pf => { setDupping(null); setPrefill(pf); }} />}
      {bulkDup && <DuplicateTaskModal task={bulkDup.tasks[0]} tasks={bulkDup.tasks} move={bulkDup.move} onClose={() => setBulkDup(null)} onDone={() => { setBulkDup(null); setSel([]); refresh(); }} onEditCopy={pf => { setBulkDup(null); setPrefill(pf); }} />}
      {dating && <TaskDateModal tasks={dating} onClose={() => setDating(null)} onDone={() => { setDating(null); setSel([]); refresh(); }} />}
    </Wrap>
  );
}

/* ═══ ⧉ Duplicar / migrar una tarea · TASK-DUP-V1 (20-oct-2026) ═══
 * Copia la tarea (título, instrucciones, link, material ya subido, calificable)
 * a UNO o VARIOS grupos a la vez, incluido el mismo grupo para reprogramarla.
 * Cada copia es una tarea NUEVA (id propio, sin entregas) y avisa a sus alumnos.
 * Alumnos puntuales solo se conservan en el mismo grupo; en otro grupo va a todos. */
function taskCopyData(a, groupId, dueIso) {
  const same = groupId === a.groupId;
  return {
    groupId,
    targetStudentIds: same ? [...(a.targetStudentIds || [])] : [],
    title: a.title || '',
    description: (window.JUCUM_DOCSETS && window.JUCUM_DOCSETS.isDocset(a)) ? window.JUCUM_DOCSETS.describe({ ...window.JUCUM_DOCSETS.meta(a), live: {}, ...(window.JUCUM_DOCSETS.meta(a).mode === 'home' ? { dueAt: dueIso || null } : {}) }) : (a.description || ''),
    dueAt: dueIso || null,
    gradable: !!a.gradable,
    xp: typeof a.xp === 'number' ? a.xp : 40,
    attachments: (a.attachments || []).filter(x => x && !x.pending).map(x => ({ ...x })),
  };
}
function DuplicateTaskModal({ task, tasks, move, onClose, onDone, onEditCopy }) {
  const many = (tasks && tasks.length) ? tasks : [task];   // TASKS-BY-GROUP-V1: varias a la vez · move = pasar a otro grupo
  const { GROUPS, LEVELS } = window.JUCUM_DATA;
  const toLocalInput = (iso) => { if (!iso) return ''; const d = new Date(iso); const p = n => String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
  const srcGroup = GROUPS.find(g => g.id === task.groupId);
  const list = (typeof gpSort === 'function' ? gpSort(GROUPS) : GROUPS.slice()).filter(g => !g.finishedAt || g.id === task.groupId);
  const [picked, setPicked] = tUseState([]);
  const [q, setQ] = tUseState('');
  const [due, setDue] = tUseState(() => (task.dueAt && new Date(task.dueAt) > new Date()) ? toLocalInput(task.dueAt) : '');
  const [busy, setBusy] = tUseState(false);
  const [result, setResult] = tUseState(null);   // { ok:[nombres], fail:[nombres] }
  const toggle = (id) => setPicked(p => move ? [id] : p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const shown = list.filter(g => !q || norm(g.name + ' ' + (g.schedule || '') + ' ' + (LEVELS[g.level]?.name || g.level)).includes(norm(q)));
  const targeted = (task.targetStudentIds || []).length > 0;
  const dueIso = due ? new Date(due).toISOString() : null;
  const gName = id => (GROUPS.find(g => g.id === id) || {}).name || 'grupo';
  const sameLevel = srcGroup ? list.filter(g => g.level === srcGroup.level && !g.finishedAt).map(g => g.id) : [];

  const run = async () => {
    if (!picked.length) return;
    setBusy(true);
    const ok = [], fail = [];
    for (const gid of picked) {
      for (const t of many) {
        try {
          const nSub = Object.keys(window.JUCUM_TASKS.submissionsFor(t.id) || {}).length;
          if (move && !nSub && gid !== t.groupId) {   // sin entregas → se MUEVE (misma tarea)
            const data = { groupId: gid, targetStudentIds: [] }; if (dueIso) data.dueAt = dueIso;
            if (window.JUCUM_DOCSETS && window.JUCUM_DOCSETS.isDocset(t)) data.description = taskCopyData(t, gid, dueIso || t.dueAt).description;
            const r = await window.JUCUM_TASKS.updateAssignment(t.id, data);
            (r && r.synced === false ? fail : ok).push(gName(gid));
          } else {
            const r = await window.JUCUM_TASKS.createAssignment(taskCopyData(t, gid, dueIso || (many.length > 1 ? t.dueAt && new Date(t.dueAt) > new Date() ? t.dueAt : null : null)));
            (r && r.synced === false ? fail : ok).push(gName(gid));
          }
        } catch (e) { fail.push(gName(gid)); }
      }
    }
    setBusy(false);
    if (!fail.length) { onDone(); return; }
    setResult({ ok, fail });
  };
  const editFirst = () => {
    const gid = picked[0];
    onEditCopy({ ...taskCopyData(task, gid, dueIso), _dup: true, _srcGroup: srcGroup ? srcGroup.name : '' });
  };

  return (
    <div className="modal-backdrop" onClick={busy ? undefined : onClose}>
      <div className="modal settings-modal" style={{maxWidth:560}} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{move ? '➜ Pasar a otro grupo' : many.length > 1 ? `⧉ Duplicar ${many.length} tareas` : '⧉ Duplicar tarea'}</div>
          <button className="modal-close" onClick={onClose} disabled={busy}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{background:'#EEF2FC', border:'1px solid #C9D4F0', borderRadius:10, padding:'10px 13px', marginBottom:14}}>
            <div style={{fontWeight:800, fontSize:14, color:'#1F3A8A'}}>📝 {many.length > 1 ? many.slice(0, 3).map(t => t.title).join(' · ') + (many.length > 3 ? ' …' : '') : task.title}</div>
            <div style={{fontSize:12.5, fontWeight:700, color:'#5A6A90', marginTop:3}}>Original en {srcGroup ? `${LEVELS[srcGroup.level]?.emoji || ''} ${srcGroup.name}` : 'grupo'}{targeted ? ` · ${(task.targetStudentIds || []).length} alumno(s) puntual(es)` : ''}</div>
          </div>

          {result ? (
            <div style={{background:'#FFF8E1', border:'1.5px solid #F0C66B', borderRadius:12, padding:'12px 15px', fontSize:13, color:'#7A4E00', fontWeight:700, lineHeight:1.6}}>
              {result.ok.length > 0 && <div>✅ Publicada en: {result.ok.join(' · ')}</div>}
              <div>⏳ Guardada solo en este equipo (sin internet): <b>{result.fail.join(' · ')}</b>. Esos alumnos aún no la ven; se reintenta sola al abrir Tareas o con “🔄 Reintentar subida”.</div>
            </div>
          ) : (
            <>
              <div className="settings-block">
                <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:8}}>
                  <div className="settings-label" style={{margin:0, flex:1}}>{move ? '¿A qué grupo?' : '¿En qué grupo(s)?'}</div>
                  {!move && sameLevel.length > 1 && <button type="button" className="preset" onClick={() => setPicked(sameLevel)}>Todos los de {LEVELS[srcGroup.level]?.name || 'este nivel'}</button>}
                  {picked.length > 0 && <button type="button" className="preset" onClick={() => setPicked([])}>Quitar todos</button>}
                </div>
                {list.length > 6 && <input className="input-text" style={{width:'100%', marginBottom:8}} value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar grupo, día u horario…" />}
                <div style={{display:'grid', gap:6, maxHeight:260, overflowY:'auto'}}>
                  {shown.filter(g => !move || g.id !== task.groupId).map(g => (
                    <label key={g.id} className="check-row" style={picked.includes(g.id) ? {background:'#EEF2FC', borderRadius:8} : null}>
                      <input type={move ? 'radio' : 'checkbox'} name="dupdest" checked={picked.includes(g.id)} onChange={() => toggle(g.id)} />
                      <span>{LEVELS[g.level]?.emoji} <b>{g.name}</b>{g.id === task.groupId && <span style={{color:'#3F5BB8', fontWeight:800}}> · este mismo grupo (reprogramar)</span>}{g.finishedAt && <span style={{color:'var(--text-soft)'}}> · finalizado</span>}</span>
                    </label>
                  ))}
                  {shown.length === 0 && <div className="settings-hint">Ningún grupo coincide.</div>}
                </div>
                {targeted && picked.some(id => id !== task.groupId) && <div className="settings-hint" style={{marginTop:8}}>En otros grupos la copia va a <b>todo el grupo</b> (los alumnos puntuales solo existen en el original).</div>}
              </div>

              <div className="settings-block">
                <div className="settings-label">Nueva fecha y hora de cierre (opcional)</div>
                <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
                  <input type="datetime-local" className="input-text" value={due} onChange={e => setDue(e.target.value)} />
                  {due && <button type="button" className="preset" onClick={() => setDue('')}>Sin fecha</button>}
                </div>
                <div className="settings-hint">Se aplica a todas las copias. Si cada grupo cierra distinto, duplica en uno y usa “Revisar antes”, o edita cada copia después.</div>
              </div>

              {move && <div style={{background:'#EEF2FC', borderRadius:10, padding:'9px 12px', marginBottom:10, fontSize:12.5, fontWeight:700, color:'#1F3A8A', lineHeight:1.5}}>➜ Se <b>mueve</b> si nadie la ha entregado. Si ya tiene entregas, se crea una copia en el otro grupo y la original se queda aquí con sus notas.</div>}
              {many.some(t => window.JUCUM_DOCSETS && window.JUCUM_DOCSETS.isClass(t)) && <div className="settings-hint" style={{marginBottom:8}}>🏫 Las de clase quedan para el mismo día del plan; cámbialo luego en ✏️ Editar o súbelas otra vez si ese grupo tiene clase otro día.</div>}
              {!move && <div className="settings-hint" style={{marginBottom:12}}>Cada copia es una tarea <b>nueva</b>: sin entregas, con el mismo título, instrucciones, link y material. Sus alumnos reciben el aviso en la campanita.</div>}
            </>
          )}

          <div className="modal-actions" style={{flexWrap:'wrap'}}>
            {result ? (
              <button className="btn-save" onClick={onDone}>Entendido</button>
            ) : (
              <>
                <button className="btn-cancel" onClick={onClose} disabled={busy}>Cancelar</button>
                {picked.length === 1 && many.length === 1 && !move && <button className="btn-cancel" onClick={editFirst} disabled={busy} style={{borderColor:'#9FB0DA', color:'#3F5BB8'}}>✏️ Revisar antes de publicar</button>}
                <button className="btn-save" disabled={busy || !picked.length} onClick={run}>{busy ? (move ? 'Pasando…' : 'Duplicando…') : move ? '➜ Pasar' : picked.length > 1 ? `⧉ Duplicar en ${picked.length} grupos` : '⧉ Duplicar'}</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── formulario de nueva tarea ── */
function AssignmentForm({ onClose, onSaved, initial, prefill }) {
  const { GROUPS, STUDENTS, LEVELS } = window.JUCUM_DATA;
  const P0 = initial || prefill || null;
  const initLink = (P0 && (P0.attachments || []).find(x => x.kind === 'link')) || null;
  const toLocalInput = (iso) => { if (!iso) return ''; const d = new Date(iso); const p = n => String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
  const initMeta = parseTaskMeta(P0 || {});
  const [title, setTitle] = tUseState(P0?.title || '');
  const [desc, setDesc] = tUseState(initMeta.plain);
  const [structured, setStructured] = tUseState(initMeta.structured || emptyStructured());
  const [showStruct, setShowStruct] = tUseState(hasStructured(initMeta.structured));
  const [preview, setPreview] = tUseState(false);
  const [due, setDue] = tUseState(toLocalInput(P0?.dueAt));
  const [groupId, setGroupId] = tUseState(P0?.groupId || GROUPS[0]?.id || '');
  const [mode, setMode] = tUseState((P0?.targetStudentIds || []).length > 0 ? 'students' : 'group');
  const [picked, setPicked] = tUseState(P0?.targetStudentIds || []);
  const [gradable, setGradable] = tUseState(!!P0?.gradable);
  const [attachments, setAttachments] = tUseState((P0?.attachments || []).filter(x => x.kind !== 'link'));
  const [linkUrl, setLinkUrl] = tUseState(initLink?.url || '');
  const [linkType, setLinkType] = tUseState(initLink?.linkType || 'jucum');
  const [err, setErr] = tUseState('');
  const [warn, setWarn] = tUseState('');
  const [retry, setRetry] = tUseState(false);
  const reintentar = async () => {
    setRetry(true);
    let quedan = 1;
    try { quedan = window.JUCUM_TASKS.retryPending ? await window.JUCUM_TASKS.retryPending() : 1; } catch (e) {}
    setRetry(false);
    if (!quedan) { setWarn(''); onSaved(); }
  };

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
    let r;
    try {
      r = initial ? await window.JUCUM_TASKS.updateAssignment(initial.id, data)
                  : await window.JUCUM_TASKS.createAssignment(data);
    } catch (e) { setErr('No se pudo guardar: ' + (e && e.message ? e.message : 'inténtalo de nuevo')); return; }
    // La nube no confirmó → NO cerramos en silencio: los alumnos no la verían.
    if (r && r.synced === false) { setWarn(r.error || 'la nube no respondió'); return; }
    onSaved();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" style={{maxWidth:640}} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{initial ? '✏️ Editar tarea' : prefill && prefill._dup ? '⧉ Copia de la tarea' : prefill ? '📄 Tarea leída del documento' : '📝 Nueva tarea'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {err && <div className="err" style={{marginBottom:12}}>⚠ {err}</div>}
          {prefill && prefill._dup && <div style={{background:'#EEF2FC', border:'1px solid #C9D4F0', borderRadius:10, padding:'9px 12px', fontSize:12.8, fontWeight:700, color:'#1F3A8A', lineHeight:1.5, marginBottom:12}}>⧉ Copia de una tarea{prefill._srcGroup ? <> de <b>{prefill._srcGroup}</b></> : ''}. Cambia lo que necesites (grupo, fecha, instrucciones) y pulsa <b>Asignar tarea</b>: se crea como tarea nueva, la original no se toca.</div>}
          {prefill && !prefill._dup && <div style={{background:'#EEF2FC', border:'1px solid #C9D4F0', borderRadius:10, padding:'9px 12px', fontSize:12.8, fontWeight:700, color:'#1F3A8A', lineHeight:1.5, marginBottom:12}}>📄 Leí <b>{prefill._file}</b>. Tu texto quedó tal cual. Revisa lo que marqué en {(prefill._notes || []).length ? <b>{prefill._notes.join(' · ')}</b> : 'los campos'} y pulsa <b>Guardar</b>: la tarea se publica en el grupo.</div>}

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

          {warn && (
            <div style={{background:'#FFF8E1', border:'1.5px solid #F0C66B', borderRadius:12, padding:'12px 15px', fontSize:13, color:'#7A4E00', fontWeight:700, lineHeight:1.6, marginBottom:12}}>
              ⏳ La tarea quedó guardada en este equipo, pero <b>no llegó a la nube</b> ({warn}): tus alumnos aún no la ven.<br />Revisa tu internet y toca “Reintentar subida”. Si cierras, la plataforma lo reintenta sola cada vez que abras Tareas.
            </div>
          )}
          <div className="modal-actions">
            {warn ? (
              <>
                <button className="btn-cancel" onClick={onSaved}>Cerrar</button>
                <button className="btn-save" disabled={retry} onClick={reintentar}>{retry ? 'Subiendo…' : '🔄 Reintentar subida'}</button>
              </>
            ) : (
              <>
                <button className="btn-cancel" onClick={onClose}>Cancelar</button>
                <button className="btn-save" onClick={save}>{initial ? '💾 Guardar cambios' : '📨 Asignar tarea'}</button>
              </>
            )}
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
  const [dupping, setDupping] = tUseState(false);
  const [dupEdit, setDupEdit] = tUseState(null);
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
        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          <button className="btn-settings" onClick={() => setDupping(true)}>⧉ Duplicar</button>
          <button className="btn-settings" onClick={() => setEditing(true)}>✏️ Editar tarea</button>
        </div>
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
      {dupping && <DuplicateTaskModal task={a} onClose={() => setDupping(false)} onDone={() => setDupping(false)} onEditCopy={pf => { setDupping(false); setDupEdit(pf); }} />}
      {dupEdit && <AssignmentForm prefill={dupEdit} onClose={() => setDupEdit(null)} onSaved={() => setDupEdit(null)} />}
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
          {list.map(a => (window.JUCUM_DOCSETS && window.JUCUM_DOCSETS.isDocset(a) && window.DocSetTaskCard)
            ? <DocSetTaskCard key={a.id} a={a} student={student} onChange={() => setTick(t=>t+1)} />
            : <StudentTaskCard key={a.id} a={a} student={student} onChange={() => setTick(t=>t+1)} />)}
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

  const onActivityDone = async (score) => {
    if (closed) { onChange(); return; }
    // OJO: hay que ESPERAR la entrega antes de calificar. Sin el await, la nota
    // automática del material se perdía (la entrega todavía no existía).
    try { await window.JUCUM_TASKS.submitAssignment(a.id, student.id, { text: typeof score === 'number' ? `Actividad completada (${score}%).` : 'Actividad completada.', attachments: [] }); } catch (e) {}
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
        <div style={{display:'flex', alignItems:'center', gap:6, flexWrap:'wrap'}}>
          {sub && sub.pendingSync && <span className="mm-chip" style={{background:'#FFF8E1', color:'#7A4E00'}}>⏳ sin enviar</span>}
          <span className="mm-chip" style={{background:statusPill.bg, color:statusPill.c}}>{statusPill.t}</span>
        </div>
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

Object.assign(window, { TeacherAssignments, StudentAssignments, TaskAttachmentChip, TaskFilePicker, AssignmentForm, DuplicateTaskModal, TeacherSubmissions, GradeModal, StudentTaskCard, TaskActivityPanel });
