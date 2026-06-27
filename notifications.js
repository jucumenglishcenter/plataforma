/* Bloque E · Notifications
 * Single localStorage store: { [studentId]: [ {id, type, title, body, date, read, link} ] }
 * Types: achievement, teacher-feedback, module-activated, daily-reminder, forum-reply
 * Auto-syncs across tabs via storage events.
 */

const NOTIF_KEY = 'jucum_notifs_v1';

function loadNotifs() {
  try { return JSON.parse(localStorage.getItem(NOTIF_KEY) || '{}'); }
  catch { return {}; }
}
function saveNotifs(data) { localStorage.setItem(NOTIF_KEY, JSON.stringify(data)); }

function getNotifs(userId) {
  const all = loadNotifs();
  return (all[userId] || []).sort((a, b) => b.date.localeCompare(a.date));
}
function pushNotif(userId, notif) {
  const all = loadNotifs();
  all[userId] = all[userId] || [];
  all[userId].unshift({
    id: 'n-' + Date.now() + '-' + Math.random().toString(36).slice(2,5),
    date: new Date().toISOString(),
    read: false,
    ...notif,
  });
  if (all[userId].length > 50) all[userId] = all[userId].slice(0, 50);
  saveNotifs(all);
  // Sonido solo si la notificación es para el usuario logueado (debounced en sounds.js)
  try {
    const u = JSON.parse(localStorage.getItem('jucum_user') || 'null');
    const myId = u ? (u.studentId || (u.role === 'teacher' ? 'teacher' : u.role === 'admin' ? 'admin' : null)) : null;
    if (myId && userId === myId && window.JUCUM_SOUND) window.JUCUM_SOUND.notify();
  } catch {}
  if (window.JUCUM_SYNC) window.JUCUM_SYNC.pushNotif(userId, notif);
}
function markRead(userId, notifId) {
  const all = loadNotifs();
  const n = (all[userId] || []).find(n => n.id === notifId);
  if (n) { n.read = true; saveNotifs(all); if (window.JUCUM_SYNC) window.JUCUM_SYNC.markNotifRead(notifId); }
}
function markAllRead(userId) {
  const all = loadNotifs();
  (all[userId] || []).forEach(n => n.read = true);
  saveNotifs(all);
  if (window.JUCUM_SYNC) window.JUCUM_SYNC.markAllNotifRead(userId);
}
function clearNotifs(userId) {
  const all = loadNotifs();
  all[userId] = [];
  saveNotifs(all);
}
function unreadCount(userId) {
  return getNotifs(userId).filter(n => !n.read).length;
}

function seedSampleNotifs() {
  if (window.JUCUM_SB) return; // cloud mode: notifications come from Supabase
  if (localStorage.getItem(NOTIF_KEY)) return;
  const now = Date.now();
  const seeded = {
    s01: [
      { id:'n-s1', type:'achievement', title:'¡Logro desbloqueado!', body:'🌱 Primera Respuesta', date:new Date(now - 86400000*2).toISOString(), read:true },
      { id:'n-s2', type:'module-activated', title:'Nuevo módulo disponible', body:'Tu profesor activó "Personal Identity". ¡Empieza ya!', date:new Date(now - 86400000).toISOString(), read:true },
      { id:'n-s3', type:'teacher-feedback', title:'Evaluación recibida', body:'El profesor te evaluó: 4/5 en Speaking. Lee su retroalimentación.', date:new Date(now - 3600000*8).toISOString(), read:false },
      { id:'n-s4', type:'daily-reminder', title:'¿Listo para tu meta de hoy?', body:'Te faltan 7 min para tu meta diaria.', date:new Date(now - 3600000*2).toISOString(), read:false },
      { id:'n-s5', type:'forum-reply', title:'Sofía respondió tu pregunta', body:'"Hola Leo! There is es para una sola cosa…"', date:new Date(now - 3600000*7).toISOString(), read:false, link:'forum' },
    ],
  };
  saveNotifs(seeded);
}
seedSampleNotifs();

window.JUCUM_NOTIF = { getNotifs, pushNotif, markRead, markAllRead, clearNotifs, unreadCount };
