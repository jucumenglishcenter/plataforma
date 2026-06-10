/* Bloque D · Evaluation system
 * Teacher evaluates students in-class on Speaking / Listening / Comprehension
 * with star ratings, written feedback, and optional audio/video attachments.
 * Persisted to localStorage. Students see evaluations in their profile.
 */

const EVAL_KEY = 'jucum_evaluations_v1';

/* All evaluations: { [studentId]: [ { id, date, ratings, feedback, attachments: [{ kind, dataUrl, name, size }], teacherName } ] } */
function getEvaluations(studentId) {
  let all = {};
  try { all = JSON.parse(localStorage.getItem(EVAL_KEY) || '{}'); } catch {}
  return (all[studentId] || []).sort((a, b) => b.date.localeCompare(a.date));
}

function saveEvaluation(studentId, evaluation) {
  let all = {};
  try { all = JSON.parse(localStorage.getItem(EVAL_KEY) || '{}'); } catch {}
  all[studentId] = all[studentId] || [];
  all[studentId].unshift({
    id: 'eval-' + Date.now(),
    date: new Date().toISOString(),
    ...evaluation,
  });
  localStorage.setItem(EVAL_KEY, JSON.stringify(all));
  if (window.JUCUM_SYNC) window.JUCUM_SYNC.pushEvaluation(studentId, evaluation);
  return all[studentId];
}

function deleteEvaluation(studentId, evalId) {
  let all = {};
  try { all = JSON.parse(localStorage.getItem(EVAL_KEY) || '{}'); } catch {}
  if (!all[studentId]) return;
  all[studentId] = all[studentId].filter(e => e.id !== evalId);
  localStorage.setItem(EVAL_KEY, JSON.stringify(all));
}

/* Helper: convert File to data URL (with size cap) */
function fileToDataUrl(file, maxBytes = 5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    if (file.size > maxBytes) {
      reject(new Error(`El archivo pesa ${(file.size/1024/1024).toFixed(1)}MB. Máximo ${maxBytes/1024/1024}MB.`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

window.JUCUM_EVAL = { getEvaluations, saveEvaluation, deleteEvaluation, fileToDataUrl };
