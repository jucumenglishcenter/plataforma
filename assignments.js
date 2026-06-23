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
  };
  arr.unshift(a);
  saveAssignments(arr);
  if (window.JUCUM_SYNC && window.JUCUM_SYNC.pushAssignment) window.JUCUM_SYNC.pushAssignment({ ...a, attachments: atts });
  // Notificar a los destinatarios
  if (window.JUCUM_NOTIF && window.JUCUM_DATA) {
    const recipients = recipientsOf(a, window.JUCUM_DATA.STUDENTS);
    const dueTxt = a.dueAt ? ` · cierra ${new Date(a.dueAt).toLocaleDateString('es-PE',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}` : '';
    recipients.forEach(s => window.JUCUM_NOTIF.pushNotif(s.id, {
      type: 'assignment',
      title: '📝 Nueva tarea asignada',
      body: `"${a.title}"${dueTxt}. Entrégala desde la pestaña Tareas.`,
      link: 'tasks',
    }));
  }
  return a.id;
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
  arr[i] = { ...arr[i], ...data, ...(lightAtts ? { attachments: lightAtts } : {}) };
  saveAssignments(arr);
  if (window.JUCUM_SYNC && window.JUCUM_SYNC.pushAssignment) window.JUCUM_SYNC.pushAssignment({ ...arr[i], ...(atts ? { attachments: atts } : {}) });
  // Avisar a los destinatarios que la tarea cambió
  if (window.JUCUM_NOTIF && window.JUCUM_DATA) {
    const recipients = recipientsOf(arr[i], window.JUCUM_DATA.STUDENTS);
    recipients.forEach(s => window.JUCUM_NOTIF.pushNotif(s.id, {
      type: 'assignment',
      title: '✏️ Tarea actualizada',
      body: `"${arr[i].title}" cambió. Revísala en Tareas.`,
      link: 'tasks',
    }));
  }
  return id;
}

function deleteAssignment(id) {
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
  };
  subs[assignmentId][studentId] = sub;
  try { saveSubmissions(subs); }
  catch (e) {
    sub.attachments = lightAtts.map(a => (a && a.url) ? a : { kind: a && a.kind, name: a && a.name, size: a && a.size, pending: true });
    subs[assignmentId][studentId] = sub;
    try { saveSubmissions(subs); } catch (e2) {}
  }
  if (window.JUCUM_SYNC && window.JUCUM_SYNC.pushSubmission) window.JUCUM_SYNC.pushSubmission(assignmentId, studentId, { ...sub, attachments: atts });
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
  saveSubmissions(subs);
  if (window.JUCUM_SYNC && window.JUCUM_SYNC.gradeSubmissionDb) window.JUCUM_SYNC.gradeSubmissionDb(assignmentId, studentId, sub);
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
};
