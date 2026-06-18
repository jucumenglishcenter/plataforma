/* Bloque J · Exámenes
 * Definiciones (catálogo) + ventanas (el profe "abre el momento").
 * localStorage como caché; JUCUM_SYNC a la nube.
 *
 * exams:   [ { id, level, moduleIds:[], title, parts:[{competency,name,url}], date } ]
 * windows: [ { id, examId, groupId, targetStudentIds:[], isOpen, closesAt,
 *             allowOverrides:[], results:{[sid]:{grade,passed,feedback,gradedAt}},
 *             submissions:{[sid]:{attachments,submittedAt}}, date } ]
 */

const EXAMS_KEY = 'jucum_exams_v1';
const EWIN_KEY  = 'jucum_exam_windows_v1';

function loadExams() { try { const a = JSON.parse(localStorage.getItem(EXAMS_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } }
function saveExams(a) { localStorage.setItem(EXAMS_KEY, JSON.stringify(a)); }
function loadWindows() { try { const a = JSON.parse(localStorage.getItem(EWIN_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } }
function saveWindows(a) { localStorage.setItem(EWIN_KEY, JSON.stringify(a)); }

function getExams() { return loadExams().sort((a, b) => (b.date || '').localeCompare(a.date || '')); }
function getExam(id) { return loadExams().find(e => e.id === id) || null; }

function createExam(data) {
  const arr = loadExams();
  const e = { id: 'ex-' + Date.now(), date: new Date().toISOString(), moduleIds: [], parts: [], ...data };
  arr.unshift(e);
  saveExams(arr);
  if (window.JUCUM_SYNC && window.JUCUM_SYNC.pushExam) window.JUCUM_SYNC.pushExam(e);
  return e.id;
}
function updateExam(id, patch) {
  const arr = loadExams();
  const i = arr.findIndex(e => e.id === id);
  if (i < 0) return;
  arr[i] = { ...arr[i], ...patch };
  saveExams(arr);
  if (window.JUCUM_SYNC && window.JUCUM_SYNC.pushExam) window.JUCUM_SYNC.pushExam(arr[i]);
}
function deleteExam(id) {
  saveExams(loadExams().filter(e => e.id !== id));
  saveWindows(loadWindows().filter(w => w.examId !== id));
  if (window.JUCUM_SYNC && window.JUCUM_SYNC.deleteExamDb) window.JUCUM_SYNC.deleteExamDb(id);
}

function getWindows() { return loadWindows().sort((a, b) => (b.date || '').localeCompare(a.date || '')); }

function saveWindow(w) {
  const arr = loadWindows();
  const i = arr.findIndex(x => x.id === w.id);
  if (i >= 0) arr[i] = w; else arr.unshift(w);
  saveWindows(arr);
  if (window.JUCUM_SYNC && window.JUCUM_SYNC.pushWindow) window.JUCUM_SYNC.pushWindow(w);
  return w;
}
function createWindow(data) {
  const w = {
    id: 'ew-' + Date.now(), date: new Date().toISOString(),
    targetStudentIds: [], isOpen: false, closesAt: null,
    allowOverrides: [], results: {}, submissions: {}, ...data,
  };
  // notificar si se abre de una vez
  saveWindow(w);
  if (w.isOpen) notifyWindowOpened(w);
  return w.id;
}
function deleteWindow(id) {
  saveWindows(loadWindows().filter(w => w.id !== id));
  if (window.JUCUM_SYNC && window.JUCUM_SYNC.deleteWindowDb) window.JUCUM_SYNC.deleteWindowDb(id);
}

function recipientsOfWindow(w, STUDENTS) {
  const targeted = (w.targetStudentIds || []).length > 0;
  return targeted ? STUDENTS.filter(s => w.targetStudentIds.includes(s.id)) : STUDENTS.filter(s => s.group === w.groupId);
}

function notifyWindowOpened(w) {
  if (!window.JUCUM_NOTIF || !window.JUCUM_DATA) return;
  const exam = getExam(w.examId);
  const recips = recipientsOfWindow(w, window.JUCUM_DATA.STUDENTS);
  recips.forEach(s => {
    const apt = canTakeWindow(s, w);
    window.JUCUM_NOTIF.pushNotif(s.id, {
      type: 'assignment',
      title: apt ? '🎓 ¡Tu examen está habilitado!' : '🎓 Examen abierto',
      body: apt ? `"${exam?.title || 'Examen'}" ya está disponible. ¡Mucho éxito!`
                : `"${exam?.title || 'Examen'}" está abierto, pero aún no llegas al 75% de cumplimiento para rendirlo.`,
      link: 'exam',
    });
  });
}

/* Ventanas abiertas y vigentes que le tocan a un alumno */
function openWindowsForStudent(student) {
  return loadWindows().filter(w => {
    if (!w.isOpen) return false;
    if (w.closesAt && new Date(w.closesAt) < new Date()) return false;
    const targeted = (w.targetStudentIds || []).length > 0;
    return targeted ? w.targetStudentIds.includes(student.id) : (w.groupId === student.group);
  });
}

/* ¿Puede rendir? apto (≥75%) o habilitado por el profesor */
function canTakeWindow(student, w) {
  if ((w.allowOverrides || []).includes(student.id)) return true;
  const r = window.JUCUM_DATA ? window.JUCUM_DATA.getStudentReadiness(student) : { apt: false };
  return !!r.apt;
}

function toggleOverride(windowId, studentId) {
  const w = loadWindows().find(x => x.id === windowId);
  if (!w) return;
  const set = new Set(w.allowOverrides || []);
  if (set.has(studentId)) set.delete(studentId); else set.add(studentId);
  w.allowOverrides = Array.from(set);
  saveWindow(w);
}
function setWindowOpen(windowId, isOpen) {
  const w = loadWindows().find(x => x.id === windowId);
  if (!w) return;
  const was = w.isOpen;
  w.isOpen = isOpen;
  saveWindow(w);
  if (isOpen && !was) notifyWindowOpened(w);
}

function submitExam(windowId, studentId, payload) {
  const w = loadWindows().find(x => x.id === windowId);
  if (!w) return;
  w.submissions = w.submissions || {};
  w.submissions[studentId] = { attachments: payload.attachments || [], submittedAt: new Date().toISOString() };
  saveWindow(w);
  if (window.JUCUM_NOTIF) window.JUCUM_NOTIF.pushNotif('teacher', { type:'assignment', title:'📥 Entrega de examen', body:'Un alumno envió material de su examen.', link:'exam' });
}

function gradeExam(windowId, studentId, grade, passed, feedback) {
  const w = loadWindows().find(x => x.id === windowId);
  if (!w) return;
  w.results = w.results || {};
  w.results[studentId] = { grade: (typeof grade === 'number' ? grade : null), passed: !!passed, feedback: feedback || '', gradedAt: new Date().toISOString() };
  saveWindow(w);
  if (window.JUCUM_NOTIF) window.JUCUM_NOTIF.pushNotif(studentId, {
    type: 'teacher-feedback',
    title: passed ? '🎉 ¡Aprobaste tu examen!' : '📋 Resultado de tu examen',
    body: (typeof grade === 'number' ? `Obtuviste ${grade}/100. ` : '') + (feedback || (passed ? '¡Felicitaciones!' : 'Revisa la retroalimentación.')),
    link: 'exam',
  });
}

/* Link de una parte del examen (modo examen: sin cooldown, no registra práctica) */
function examPartLink(part, examId, studentId) {
  if (!part.url) return null;
  const sep = part.url.includes('?') ? '&' : '?';
  return `${part.url}${sep}jucum_exam=1&jucum_uid=${encodeURIComponent(studentId)}&jucum_mod=${encodeURIComponent('exam-' + examId)}&jucum_act=${encodeURIComponent(part.competency)}`;
}

window.JUCUM_EXAMS = {
  getExams, getExam, createExam, updateExam, deleteExam,
  getWindows, createWindow, saveWindow, deleteWindow, recipientsOfWindow,
  openWindowsForStudent, canTakeWindow, toggleOverride, setWindowOpen,
  submitExam, gradeExam, examPartLink,
};
