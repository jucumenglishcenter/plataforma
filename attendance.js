/* Bloque M · Asistencia + Participación
 * localStorage como caché; sincroniza a la nube vía JUCUM_SYNC.
 * Registro: { [date]: { [studentId]: { status, participation, note } } }
 *   status: 'asistio' | 'falto' | 'justifico'   ·  participation: 0..3
 */
const ATT_KEY = 'jucum_attendance_v1';

function loadAtt() { try { const o = JSON.parse(localStorage.getItem(ATT_KEY) || '{}'); return o && typeof o === 'object' ? o : {}; } catch { return {}; } }
function saveAtt(o) { localStorage.setItem(ATT_KEY, JSON.stringify(o)); }

function todayStr() { return new Date().toISOString().slice(0, 10); }

function getDay(date) { return loadAtt()[date] || {}; }
function getStudentRecord(date, studentId) { return getDay(date)[studentId] || null; }

function setAttendance(date, groupId, studentId, status, participation, note) {
  const all = loadAtt();
  all[date] = all[date] || {};
  all[date][studentId] = {
    status: status || 'asistio',
    participation: typeof participation === 'number' ? participation : (all[date][studentId]?.participation || 0),
    note: note != null ? note : (all[date][studentId]?.note || ''),
    groupId,
  };
  saveAtt(all);
  if (window.JUCUM_SYNC && window.JUCUM_SYNC.pushAttendance) window.JUCUM_SYNC.pushAttendance(date, groupId, studentId, all[date][studentId]);
}

/* Marca todo un grupo de una vez (status por defecto para los no marcados) */
function markGroupDefault(date, groupId, studentIds, status) {
  studentIds.forEach(sid => { if (!getStudentRecord(date, sid)) setAttendance(date, groupId, sid, status, 0, ''); });
}

/* Historial de un alumno: lista de { date, status, participation } ordenada desc */
function getStudentHistory(studentId, limit) {
  const all = loadAtt();
  const out = [];
  Object.keys(all).forEach(date => { const r = all[date][studentId]; if (r) out.push({ date, ...r }); });
  out.sort((a, b) => b.date.localeCompare(a.date));
  return limit ? out.slice(0, limit) : out;
}

/* Resumen de asistencia de un alumno (últimos N días con registro) */
function getStudentSummary(studentId, days) {
  const hist = getStudentHistory(studentId, days || 60);
  const total = hist.length;
  const asistio = hist.filter(h => h.status === 'asistio').length;
  const falto = hist.filter(h => h.status === 'falto').length;
  const justifico = hist.filter(h => h.status === 'justifico').length;
  const pct = total ? Math.round((asistio + justifico) / total * 100) : null;
  // faltas consecutivas recientes (sin justificar)
  let streakAbsent = 0;
  for (const h of hist) { if (h.status === 'falto') streakAbsent++; else break; }
  return { total, asistio, falto, justifico, pct, streakAbsent };
}

/* ¿Semana perfecta? asistió a todas las clases registradas de la semana actual
 * (lun-dom) y ninguna falta. Devuelve {perfect, classes}. */
function weekMondayStr() {
  const d = new Date(); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}
function getWeekAttendance(studentId) {
  const monday = weekMondayStr();
  const hist = getStudentHistory(studentId).filter(h => h.date >= monday);
  const classes = hist.length;
  const missed = hist.some(h => h.status === 'falto');
  return { classes, missed, perfect: classes > 0 && !missed };
}

/* Recompensa semanal por asistencia perfecta + al día en prácticas.
 * Se otorga una sola vez por semana (marca en localStorage). Da XP semanal e insignia visible. */
function maybeGrantWeeklyReward(student) {
  if (!student) return null;
  const monday = weekMondayStr();
  const flagKey = 'jucum_week_reward_' + student.id + '_' + monday;
  try { if (localStorage.getItem(flagKey)) return null; } catch {}
  const wk = getWeekAttendance(student.id);
  if (!wk.perfect) return null;
  // "al día en prácticas": constancia reciente alta
  const D = window.JUCUM_DATA;
  const m = D && D.getStudentMastery ? D.getStudentMastery(student) : { active7: 0 };
  const upToDate = (m.active7 || 0) >= 4;
  if (!upToDate) return null;
  try { localStorage.setItem(flagKey, '1'); } catch {}
  if (D && D.addWeeklyXP) D.addWeeklyXP(student.id, 120);
  if (window.JUCUM_NOTIF) window.JUCUM_NOTIF.pushNotif(student.id, {
    type: 'achievement',
    title: '🏆 ¡Semana perfecta!',
    body: 'Asististe a todas tus clases y estás al día en tus prácticas. +120 XP y un lugar más alto en el Top. ¡Sigue así!',
  });
  return { xp: 120, badge: 'week-perfect' };
}

window.JUCUM_ATT = {
  todayStr, getDay, getStudentRecord, setAttendance, markGroupDefault,
  getStudentHistory, getStudentSummary, getWeekAttendance, maybeGrantWeeklyReward,
};
