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
    id: 'as-' + Date.now(),
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

function deleteAssignment(id) {
  saveAssignments(loadAssignments().filter(a => a.id !== id));
  const subs = loadSubmissions(); delete subs[id]; saveSubmissions(subs);
  if (window.JUCUM_SYNC && window.JUCUM_SYNC.deleteAssignmentDb) window.JUCUM_SYNC.deleteAssignmentDb(id);
}

function getSubmission(assignmentId, studentId) {
  return (loadSubmissions()[assignmentId] || {})[studentId] || null;
}
function submissionsFor(assignmentId) {
  return loadSubmissions()[assignmentId] || {};
}

function submitAssignment(assignmentId, studentId, payload) {
  const subs = loadSubmissions();
  subs[assignmentId] = subs[assignmentId] || {};
  const prev = subs[assignmentId][studentId];
  const sub = {
    id: prev?.id || ('sub-' + Date.now()),
    submittedAt: new Date().toISOString(),
    text: payload.text || '',
    attachments: payload.attachments || [],
    status: prev?.status === 'graded' ? 'graded' : 'submitted',
    grade: prev?.grade ?? null,
    feedback: prev?.feedback ?? null,
    gradedAt: prev?.gradedAt ?? null,
  };
  subs[assignmentId][studentId] = sub;
  saveSubmissions(subs);
  if (window.JUCUM_SYNC && window.JUCUM_SYNC.pushSubmission) window.JUCUM_SYNC.pushSubmission(assignmentId, studentId, sub);
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
  getAssignments, assignmentsForStudent, recipientsOf, createAssignment, deleteAssignment,
  getSubmission, submissionsFor, submitAssignment, gradeSubmission,
};
