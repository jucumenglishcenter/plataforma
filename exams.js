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
    allowOverrides: [], results: {}, submissions: {}, published: false, ...data,
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
  // Si los resultados YA están publicados, notifica el cambio al alumno;
  // si no, el profesor califica en privado y luego pulsa "Compartir resultados".
  if (w.published && window.JUCUM_NOTIF) notifyResult(studentId, w.results[studentId]);
}

function notifyResult(studentId, res) {
  if (!window.JUCUM_NOTIF || !res) return;
  window.JUCUM_NOTIF.pushNotif(studentId, {
    type: 'teacher-feedback',
    title: res.passed ? '🎉 ¡Aprobaste tu examen!' : '📋 Resultado de tu examen',
    body: (typeof res.grade === 'number' ? `Obtuviste ${res.grade}/100. ` : '') + (res.feedback || (res.passed ? '¡Felicitaciones!' : 'Revisa la retroalimentación.')),
    link: 'exam',
  });
}

/* El profesor comparte los resultados con los alumnos cuando lo decide */
function publishResults(windowId) {
  const w = loadWindows().find(x => x.id === windowId);
  if (!w) return;
  w.published = true;
  saveWindow(w);
  Object.entries(w.results || {}).forEach(([sid, res]) => notifyResult(sid, res));
}
function unpublishResults(windowId) {
  const w = loadWindows().find(x => x.id === windowId);
  if (!w) return;
  w.published = false;
  saveWindow(w);
}

/* Peso de una parte (por defecto reparte igual entre las partes) */
function partWeight(exam, idx) {
  const parts = exam?.parts || [];
  const explicit = parts.map(p => (typeof p.weight === 'number' ? p.weight : null));
  const anySet = explicit.some(w => w != null && w > 0);
  if (!anySet) return parts.length ? Math.round(100 / parts.length) : 0;
  const sum = explicit.reduce((a, w) => a + (w || 0), 0) || 1;
  return Math.round((explicit[idx] || 0) / sum * 100);
}

/* Link de una parte del examen (modo examen: sin cooldown, no registra práctica) */
function examPartLink(part, examId, studentId) {
  if (!part.url) return null;
  const sep = part.url.includes('?') ? '&' : '?';
  return `${part.url}${sep}jucum_exam=1&jucum_uid=${encodeURIComponent(studentId)}&jucum_mod=${encodeURIComponent('exam-' + examId)}&jucum_act=${encodeURIComponent(part.competency)}`;
}

/* Grupos cuyo promedio de cumplimiento cruzó el 75% → listos para examen.
 * Devuelve [{ group, ready, total, pct }] para avisar al profesor. */
function groupsReadyForExam() {
  const D = window.JUCUM_DATA;
  if (!D) return [];
  return (D.GROUPS || []).map(g => {
    const members = D.STUDENTS.filter(s => s.group === g.id);
    if (!members.length) return null;
    const readies = members.map(s => D.getStudentReadiness(s));
    const ready = readies.filter(r => r.overall >= 75).length;
    const pct = Math.round(readies.reduce((a, r) => a + r.overall, 0) / members.length);
    return { group: g, ready, total: members.length, pct, crossed: ready / members.length >= 0.6 };
  }).filter(Boolean);
}

/* El profesor avisa a un grupo que su examen está próximo (recordando el 75%) */
function notifyExamSoon(groupId) {
  const D = window.JUCUM_DATA;
  if (!D || !window.JUCUM_NOTIF) return 0;
  const members = D.STUDENTS.filter(s => s.group === groupId);
  members.forEach(s => {
    const r = D.getStudentReadiness(s);
    const apt = r.overall >= 75;
    window.JUCUM_NOTIF.pushNotif(s.id, {
      type: 'assignment',
      title: '🎓 ¡Tu examen se acerca!',
      body: apt
        ? `Vas listo (${r.overall}% de cumplimiento). Repasa y prepárate para demostrar cuánto dominas. ¡Tú puedes!`
        : `Pronto rendirás tu examen de avance. Recuerda: necesitas al menos 75% de cumplimiento para ser apto (vas en ${r.overall}%). Practica con constancia esta semana.`,
      link: 'exam',
    });
  });
  return members.length;
}

/* ── Panel por módulo (profesor): anuncio con fecha + publicación ──────
 * Correlación: Desarrollo DEFINE el examen (createExam, ligado a moduleIds).
 * El profesor solo lo ANUNCIA (con fecha → notifica a los alumnos) y luego lo
 * PUBLICA (abre la ventana para el grupo). */
const EANN_KEY = 'jucum_exam_announce_v1';
function loadAnn() { try { return JSON.parse(localStorage.getItem(EANN_KEY) || '{}'); } catch { return {}; } }
function saveAnn(a) { localStorage.setItem(EANN_KEY, JSON.stringify(a)); }
function getAnnouncement(groupId, moduleId) { return loadAnn()[groupId + ':' + moduleId] || null; }

/* Examen DEFINIDO (por Desarrollo) que cubre este módulo */
function examForModule(moduleId, level) {
  return loadExams().find(e => (e.moduleIds || []).includes(moduleId) && (!level || e.level === level)) || null;
}
/* Ventana de examen (grupo completo) para un examen + grupo */
function windowForExamGroup(examId, groupId) {
  return loadWindows().find(w => w.examId === examId && w.groupId === groupId && !((w.targetStudentIds || []).length)) || null;
}

/* ETAPA 1 · Anunciar: avisa a los alumnos del grupo cuándo será su examen */
function announceExam(groupId, moduleId, examId, dateStr) {
  const D = window.JUCUM_DATA; if (!D) return 0;
  const ann = loadAnn();
  ann[groupId + ':' + moduleId] = { date: dateStr || null, examId: examId || null, announcedAt: new Date().toISOString() };
  saveAnn(ann);
  const group = D.GROUPS.find(g => g.id === groupId);
  const mod = (D.MODULE_CATALOG[group?.level] || []).find(m => m.id === moduleId);
  const modName = mod?.name || 'tu módulo';
  const fecha = dateStr ? new Date(dateStr + 'T00:00:00').toLocaleDateString('es-PE', { weekday:'long', day:'numeric', month:'long' }) : null;
  const members = D.STUDENTS.filter(s => s.group === groupId);
  members.forEach(s => {
    const r = D.getStudentReadiness(s);
    const apt = r.overall >= 75;
    if (window.JUCUM_NOTIF) window.JUCUM_NOTIF.pushNotif(s.id, {
      type: 'assignment',
      title: '📣 Examen programado',
      body: `Tu examen de "${modName}"${fecha ? ` será el ${fecha}` : ' se acerca'}. ` +
        (apt ? '¡Vas listo! Repasa y prepárate. 💪' : `Recuerda: necesitas 75% de cumplimiento para rendirlo (vas en ${r.overall}%). Practica con constancia esta semana.`),
      link: 'exam',
    });
  });
  return members.length;
}
function cancelAnnouncement(groupId, moduleId) {
  const a = loadAnn(); delete a[groupId + ':' + moduleId]; saveAnn(a);
}

window.JUCUM_EXAMS = {
  getExams, getExam, createExam, updateExam, deleteExam,
  getWindows, createWindow, saveWindow, deleteWindow, recipientsOfWindow,
  openWindowsForStudent, canTakeWindow, toggleOverride, setWindowOpen,
  submitExam, gradeExam, publishResults, unpublishResults, partWeight,
  groupsReadyForExam, notifyExamSoon, examPartLink,
  examForModule, windowForExamGroup, getAnnouncement, announceExam, cancelAnnouncement,
};
