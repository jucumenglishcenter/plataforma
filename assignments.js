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
function saveAssignments(arr) { localStorage.setItem(ASSIGN_KEY, JSON.stringify(arr)); }
function loadSubmissions() {
  try { return JSON.parse(localStorage.getItem(SUBMIT_KEY) || '{}'); } catch { return {}; }
}
function saveSubmissions(obj) { localStorage.setItem(SUBMIT_KEY, JSON.stringify(obj)); }

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

function createAssignment(data) {
  const arr = loadAssignments();
  const a = {
    id: 'as-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    date: new Date().toISOString(),
    xp: 40,
    attachments: [],
    targetStudentIds: [],
    gradable: false,
    ...data,
  };
  arr.unshift(a);
  saveAssignments(arr);
  if (window.JUCUM_SYNC && window.JUCUM_SYNC.pushAssignment) window.JUCUM_SYNC.pushAssignment(a);
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

function updateAssignment(id, data) {
  const arr = loadAssignments();
  const i = arr.findIndex(a => a.id === id);
  if (i < 0) return;
  arr[i] = { ...arr[i], ...data };
  saveAssignments(arr);
  if (window.JUCUM_SYNC && window.JUCUM_SYNC.pushAssignment) window.JUCUM_SYNC.pushAssignment(arr[i]);
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
