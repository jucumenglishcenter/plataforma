/* Bloque G · Tareas / Asignaciones
 * localStorage es el caché síncrono que lee la UI; la nube (JUCUM_SYNC) es la
 * fuente de verdad. Espejo del patrón de forum.js / evaluations.js.
 *
 * assignments: [ { id, groupId, targetStudentIds:[], title, description,
 *                  dueAt, gradable, attachments:[], xp, date } ]
 * submissions: { [assignmentId]: { [studentId]: { id, submittedAt, text,
 *                  attachments:[], status:'submitted'|'graded', grade, feedback, gradedAt } } }
 */

const ASSIGN_KEY = 'jucum_assignments_v1';
const SUBMIT_KEY = 'jucum_submissions_v1';

function loadAssignments() {
  try { const a = JSON.parse(localStorage.getItem(ASSIGN_KEY) || '[]'); return Array.isArray(a) ? a : []; }
  catch { return []; }
}
function saveAssignments(arr) { _jucumSafeSet(ASSIGN_KEY, arr); }
function loadSubmissions() {
  try { return JSON.parse(localStorage.getItem(SUBMIT_KEY) || '{}'); } catch { return {}; }
}
function saveSubmissions(obj) { _jucumSafeSet(SUBMIT_KEY, obj); }

/* Quita cualquier base64 (dataUrl) de un árbol de datos — deja solo metadatos. */
function _jucumStripDataUrls(node) {
  if (Array.isArray(node)) { node.forEach(_jucumStripDataUrls); return; }
  if (node && typeof node === 'object') {
    if (typeof node.dataUrl === 'string' && !node.url) { delete node.dataUrl; node.pending = true; }
    else if (node.dataUrl) { delete node.dataUrl; }
    Object.keys(node).forEach(k => _jucumStripDataUrls(node[k]));
  }
}
function _jucumPurge(key) {
  try { const v = JSON.parse(localStorage.getItem(key) || 'null'); if (v) { _jucumStripDataUrls(v); localStorage.setItem(key, JSON.stringify(v)); } } catch (e) {}
}
/* Guarda en localStorage; si el cupo está lleno (base64 viejo), purga y reintenta.
 * Esto repara solo el almacenamiento que antes quedaba lleno y bloqueaba guardar. */
function _jucumSafeSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); return; }
  catch (e) {
    try { _jucumPurge(ASSIGN_KEY); _jucumPurge(SUBMIT_KEY); } catch (e2) {}
    try { const light = JSON.parse(JSON.stringify(val)); _jucumStripDataUrls(light); localStorage.setItem(key, JSON.stringify(light)); }
    catch (e3) { /* sin espacio aún: la nube (Supabase) ya guardó lo importante */ }
  }
}

/* ⏳ ESTADO DE SUBIDA (ago-2026) ─────────────────────────────────
 * Bug reportado: "dejé una tarea y mis alumnos no la ven; además les
 * desaparece la anterior". La subida a la nube era A CIEGAS: si fallaba (sin
 * internet, adjunto pesado, nube lenta) la tarea quedaba SOLO en el equipo de
 * la profesora — y la siguiente lectura de la nube la borraba también de ahí.
 * Ahora cada tarea/entrega nace con pendingSync:true y solo se le quita
 * cuando la nube CONFIRMA. Lo pendiente se reintenta al abrir Tareas
 * (pullTasks, en supabase-sync.js) y con el botón “Reintentar subida”. */
const TASK_TOMB_KEY = 'jucum_tasks_tomb_v1';
function taskTombs() { try { const o = JSON.parse(localStorage.getItem(TASK_TOMB_KEY) || '{}'); return (o && typeof o === 'object') ? o : {}; } catch (e) { return {}; } }
function addTaskTomb(id) {
  const o = taskTombs(); o[id] = Date.now();
  if (window.JUCUM_STORE) window.JUCUM_STORE.setJSON(TASK_TOMB_KEY, o);
  else { try { localStorage.setItem(TASK_TOMB_KEY, JSON.stringify(o)); } catch (e) {} }
}
/* Sube y DEVUELVE si la nube confirmó. (Si el equipo tiene cacheada una
 * versión vieja de supabase-sync que no devuelve nada, se asume subido.) */
async function pushTaskSafe(a) {
  const S = window.JUCUM_SYNC;
  if (!S || !S.pushAssignment) return { ok: false, msg: 'este equipo no está conectado a la nube' };
  try { const r = await S.pushAssignment(a); return (r === undefined || r.ok) ? { ok: true } : { ok: false, msg: (r.error && (r.error.message || r.error.hint)) || 'la nube rechazó el guardado' }; }
  catch (e) { return { ok: false, msg: (e && e.message) || 'sin internet' }; }
}
async function pushSubSafe(assignmentId, studentId, sub) {
  const S = window.JUCUM_SYNC;
  if (!S || !S.pushSubmission) return { ok: false, msg: 'este equipo no está conectado a la nube' };
  try { const r = await S.pushSubmission(assignmentId, studentId, sub); return (r === undefined || r.ok) ? { ok: true } : { ok: false, msg: (r.error && r.error.message) || 'la nube rechazó la entrega' }; }
  catch (e) { return { ok: false, msg: (e && e.message) || 'sin internet' }; }
}
function markSynced(id) {
  const arr = loadAssignments(); const i = arr.findIndex(a => a && a.id === id);
  if (i < 0 || !arr[i].pendingSync) return;
  delete arr[i].pendingSync; saveAssignments(arr);
}
function markSubSynced(assignmentId, studentId) {
  const subs = loadSubmissions(); const s = (subs[assignmentId] || {})[studentId];
  if (!s || !s.pendingSync) return;
  delete s.pendingSync; saveSubmissions(subs);
}
/* Cuántas cosas están guardadas SOLO en este equipo */
function pendingCount() {
  let n = loadAssignments().filter(a => a && a.pendingSync).length;
  const subs = loadSubmissions();
  Object.keys(subs).forEach(aid => Object.keys(subs[aid] || {}).forEach(sid => { if (subs[aid][sid] && subs[aid][sid].pendingSync) n++; }));
  return n;
}
/* Reintenta TODO lo pendiente. Devuelve cuántas quedaron sin subir. */
async function retryPending() {
  for (const a of loadAssignments().filter(x => x && x.pendingSync)) {
    const r = await pushTaskSafe(a);
    if (r.ok) { markSynced(a.id); notifyRecipients(a, !!a.editedAt); }
  }
  const subs = loadSubmissions();
  for (const aid of Object.keys(subs)) {
    for (const sid of Object.keys(subs[aid] || {})) {
      const s = subs[aid][sid];
      if (!s || !s.pendingSync) continue;
      const r = await pushSubSafe(aid, sid, s);
      if (!r.ok) continue;
      if (s.status === 'graded' && window.JUCUM_SYNC && window.JUCUM_SYNC.gradeSubmissionDb) { try { await window.JUCUM_SYNC.gradeSubmissionDb(aid, sid, s); } catch (e) {} }
      markSubSynced(aid, sid);
    }
  }
  return pendingCount();
}
/* Aviso de campanita a los destinatarios (solo cuando la tarea YA está en la
 * nube: avisar de una tarea que el alumno no puede abrir solo confunde). */
function notifyRecipients(a, editada) {
  if (!window.JUCUM_NOTIF || !window.JUCUM_DATA) return;
  const dueTxt = a.dueAt ? ` · cierra ${new Date(a.dueAt).toLocaleDateString('es-PE',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}` : '';
  recipientsOf(a, window.JUCUM_DATA.STUDENTS).forEach(s => window.JUCUM_NOTIF.pushNotif(s.id, {
    type: 'assignment',
    title: editada ? '✏️ Tarea actualizada' : '📝 Nueva tarea asignada',
    body: editada ? `"${a.title}" cambió. Revísala en Tareas.` : `"${a.title}"${dueTxt}. Entrégala desde la pestaña Tareas.`,
    link: 'tasks',
  }));
}

/* Todas las tareas, más recientes primero */
function getAssignments() {
  return loadAssignments().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

/* Tareas que le tocan a un alumno: las de su grupo (sin alumnos puntuales)
 * o aquellas donde está explícitamente en targetStudentIds. */
function assignmentsForStudent(student) {
  return getAssignments().filter(a => {
    const targeted = Array.isArray(a.targetStudentIds) && a.targetStudentIds.length > 0;
    if (targeted) return a.targetStudentIds.includes(student.id);
    return a.groupId === student.group;
  });
}

/* Alumnos a los que va dirigida una tarea (ids) */
function recipientsOf(a, STUDENTS) {
  const targeted = Array.isArray(a.targetStudentIds) && a.targetStudentIds.length > 0;
  if (targeted) return STUDENTS.filter(s => a.targetStudentIds.includes(s.id));
  return STUDENTS.filter(s => s.group === a.groupId);
}

async function createAssignment(data) {
  // Sube a Storage cualquier adjunto del profesor (no guardar base64 en local).
  let atts = data.attachments || [];
  if (window.JUCUM_SYNC && window.JUCUM_SYNC.uploadAttachments) {
    try { atts = await window.JUCUM_SYNC.uploadAttachments('tareas-material', atts); } catch (e) {}
  }
  const lightAtts = (atts || []).map(x => (x && x.dataUrl && !x.url && (x.size || 0) >= 800 * 1024) ? { kind: x.kind, name: x.name, size: x.size, pending: true } : x);
  const arr = loadAssignments();
  const a = {
    id: 'as-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    date: new Date().toISOString(),
    xp: 40,
    targetStudentIds: [],
    gradable: false,
    ...data,
    attachments: lightAtts,
    savedAt: new Date().toISOString(),
    pendingSync: true,
  };
  arr.unshift(a);
  saveAssignments(arr);
  const r = await pushTaskSafe({ ...a, attachments: atts });
  if (r.ok) { markSynced(a.id); notifyRecipients(a, false); }
  return { id: a.id, synced: r.ok, error: r.msg };
}

async function updateAssignment(id, data) {
  let atts = data.attachments;
  if (atts && window.JUCUM_SYNC && window.JUCUM_SYNC.uploadAttachments) {
    try { atts = await window.JUCUM_SYNC.uploadAttachments('tareas-material', atts); } catch (e) {}
  }
  const lightAtts = atts ? (atts || []).map(x => (x && x.dataUrl && !x.url && (x.size || 0) >= 800 * 1024) ? { kind: x.kind, name: x.name, size: x.size, pending: true } : x) : undefined;
  const arr = loadAssignments();
  const i = arr.findIndex(a => a.id === id);
  if (i < 0) return;
  arr[i] = { ...arr[i], ...data, ...(lightAtts ? { attachments: lightAtts } : {}), editedAt: new Date().toISOString(), savedAt: new Date().toISOString(), pendingSync: true };
  saveAssignments(arr);
  const r = await pushTaskSafe({ ...arr[i], ...(atts ? { attachments: atts } : {}) });
  if (r.ok) { markSynced(id); notifyRecipients(arr[i], true); }
  return { id, synced: r.ok, error: r.msg };
}

function deleteAssignment(id) {
  addTaskTomb(id);                                    // lápida: que la nube no la resucite
  saveAssignments(loadAssignments().filter(a => a.id !== id));
  const subs = loadSubmissions(); delete subs[id]; saveSubmissions(subs);  if (window.JUCUM_SYNC && window.JUCUM_SYNC.deleteAssignmentDb) window.JUCUM_SYNC.deleteAssignmentDb(id);
}

function getSubmission(assignmentId, studentId) {
  return (loadSubmissions()[assignmentId] || {})[studentId] || null;
}
function submissionsFor(assignmentId) {
  return loadSubmissions()[assignmentId] || {};
}

async function submitAssignment(assignmentId, studentId, payload) {
  // 1) Subir adjuntos a Supabase Storage ANTES de guardar. Evita reventar el
  //    cupo de localStorage con audios/archivos en base64 (la causa de que la
  //    entrega fallara). Tras subir, cada adjunto queda como { url } liviano.
  let atts = payload.attachments || [];
  if (window.JUCUM_SYNC && window.JUCUM_SYNC.uploadAttachments) {
    try { atts = await window.JUCUM_SYNC.uploadAttachments('tareas/' + studentId, atts); } catch (e) {}
  }
  // 2) Nunca guardar base64 pesado en localStorage. Si un adjunto no llegó a la
  //    nube y es grande, se guarda solo su metadato (pendiente).
  const lightAtts = (atts || []).map(a => {
    if (!a) return a;
    if (a.url) return a;
    if (a.dataUrl && (a.size || 0) < 800 * 1024) return a;
    return { kind: a.kind, name: a.name, size: a.size, pending: true };
  });
  const subs = loadSubmissions();
  subs[assignmentId] = subs[assignmentId] || {};
  const prev = subs[assignmentId][studentId];
  const sub = {
    id: prev?.id || ('sub-' + Date.now()),
    submittedAt: new Date().toISOString(),
    text: payload.text || '',
    attachments: lightAtts,
    status: prev?.status === 'graded' ? 'graded' : 'submitted',
    grade: prev?.grade ?? null,
    feedback: prev?.feedback ?? null,
    gradedAt: prev?.gradedAt ?? null,
    pendingSync: true,
  };
  subs[assignmentId][studentId] = sub;
  try { saveSubmissions(subs); }
  catch (e) {
    sub.attachments = lightAtts.map(a => (a && a.url) ? a : { kind: a && a.kind, name: a && a.name, size: a && a.size, pending: true });
    subs[assignmentId][studentId] = sub;
    try { saveSubmissions(subs); } catch (e2) {}
  }
  const r = await pushSubSafe(assignmentId, studentId, { ...sub, attachments: atts });
  if (r.ok) markSubSynced(assignmentId, studentId);
  else sub.syncError = r.msg;
  // Avisar al profesor (solo si es una primera entrega)
  if (!prev && window.JUCUM_NOTIF) {
    window.JUCUM_NOTIF.pushNotif('teacher', {
      type: 'assignment',
      title: '📥 Nueva entrega',
      body: 'Un alumno entregó una tarea. Revísala en Tareas.',
      link: 'tasks',
    });
  }
  return sub;
}

function gradeSubmission(assignmentId, studentId, grade, feedback) {
  const subs = loadSubmissions();
  const sub = (subs[assignmentId] || {})[studentId];
  if (!sub) return;
  sub.status = 'graded';
  sub.grade = (typeof grade === 'number') ? grade : null;
  sub.feedback = feedback || '';
  sub.gradedAt = new Date().toISOString();
  sub.pendingSync = true;
  saveSubmissions(subs);
  if (window.JUCUM_SYNC && window.JUCUM_SYNC.gradeSubmissionDb) {
    Promise.resolve(window.JUCUM_SYNC.gradeSubmissionDb(assignmentId, studentId, sub))
      .then(r => { if (!r || r.ok) markSubSynced(assignmentId, studentId); })
      .catch(() => {});
  }
  if (window.JUCUM_NOTIF) {
    window.JUCUM_NOTIF.pushNotif(studentId, {
      type: 'teacher-feedback',
      title: '✅ Tarea calificada',
      body: (typeof grade === 'number' ? `Tu tarea recibió ${grade}/100. ` : '') + 'Revisa la retroalimentación en Tareas.',
      link: 'tasks',
    });
  }
}

window.JUCUM_TASKS = {
  getAssignments, assignmentsForStudent, recipientsOf, createAssignment, updateAssignment, deleteAssignment,
  getSubmission, submissionsFor, submitAssignment, gradeSubmission,
  markSynced, markSubSynced, pendingCount, retryPending,
};
