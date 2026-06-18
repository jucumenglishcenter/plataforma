/* Bloque N · Encuesta de satisfacción
 * Aparece 3 semanas después de crear el perfil y luego cada 4 semanas.
 * Obligatoria (bloquea el panel) pero corta. Da XP al completar.
 * localStorage como caché; sincroniza a la nube vía JUCUM_SYNC.
 */
const SURVEY_KEY = 'jucum_surveys_v1';        // { [studentId]: [ {date, satisfaction, recommend, continue_plan, suggestion} ] }
const SURVEY_SEEN = 'jucum_firstseen_';       // primera vez que vemos al alumno (base si no hay fecha de alta)

const FIRST_DELAY_DAYS = 21;   // 3 semanas tras crear el perfil
const REPEAT_DAYS = 28;        // luego cada 4 semanas

function loadSurveys() { try { const o = JSON.parse(localStorage.getItem(SURVEY_KEY) || '{}'); return o && typeof o === 'object' ? o : {}; } catch { return {}; } }
function saveSurveys(o) { localStorage.setItem(SURVEY_KEY, JSON.stringify(o)); }

/* Fecha base: alta del alumno si existe, si no la primera vez que entró */
function baselineDate(student) {
  if (student && student.createdAt) return new Date(student.createdAt);
  const key = SURVEY_SEEN + student.id;
  let v = null;
  try { v = localStorage.getItem(key); } catch {}
  if (!v) { v = new Date().toISOString(); try { localStorage.setItem(key, v); } catch {} }
  return new Date(v);
}

function getResponses(studentId) { return loadSurveys()[studentId] || []; }

/* ¿Toca encuesta ahora? */
function isSurveyDue(student) {
  if (!student) return false;
  const resps = getResponses(student.id);
  const now = Date.now();
  if (resps.length === 0) {
    const base = baselineDate(student).getTime();
    return now - base >= FIRST_DELAY_DAYS * 86400000;
  }
  const last = new Date(resps[resps.length - 1].date).getTime();
  return now - last >= REPEAT_DAYS * 86400000;
}

function submitSurvey(student, data) {
  const all = loadSurveys();
  all[student.id] = all[student.id] || [];
  const rec = { date: new Date().toISOString(), ...data };
  all[student.id].push(rec);
  saveSurveys(all);
  // recompensa por dar su opinión
  try { if (window.JUCUM_DATA && window.JUCUM_DATA.addWeeklyXP) window.JUCUM_DATA.addWeeklyXP(student.id, 60); } catch {}
  if (window.JUCUM_SYNC && window.JUCUM_SYNC.pushSurvey) window.JUCUM_SYNC.pushSurvey(student.id, rec);
  return rec;
}

/* Resumen para la administración (detectar inconformidad / posible abandono) */
function getAllResponsesFlat() {
  const all = loadSurveys();
  const out = [];
  Object.entries(all).forEach(([sid, list]) => list.forEach(r => out.push({ studentId: sid, ...r })));
  return out.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

window.JUCUM_SURVEY = { isSurveyDue, submitSurvey, getResponses, getAllResponsesFlat };
