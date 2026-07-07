/* Mejora A · Activity tracker — connects real activity completion to progress.
 * Include in activity kits (story/reading/listening) AFTER student-nav.js.
 *
 * What it does:
 *  - Reads logged-in student + group settings to find the active module
 *  - Maps the current page (story/reading/listening) to the matching activity
 *  - Tracks active practice minutes on the page (piggyback on user events)
 *  - When the page detects completion (quiz finished event or 5+ min practice),
 *    calls markActivityComplete → updates progress + todayMinutes + notifies.
 *
 * Pages can explicitly signal completion + score:
 *    window.dispatchEvent(new CustomEvent('jucum:activity-complete', { detail: { score: 86 } }))
 *  (score in 0-100). Otherwise auto-completes at 70 (participation) after 5 active minutes.
 */
(function () {
  const user = JSON.parse(localStorage.getItem('jucum_user') || 'null');
  if (!user || user.role !== 'student') return;

  // page type from path: ui_kits/<kit>/index.html
  const m = window.location.pathname.match(/ui_kits\/(story|reading|listening)\//);
  if (!m) return;
  const pageType = m[1];

  // Día en horario de Perú (UTC−5): el "día de hoy" para los minutos debe cortar
  // a medianoche de Lima, no a medianoche UTC (~7 PM Perú).
  const peruDayStr = () => new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10);
  // Local copies of platform data helpers (data.js isn't loaded here)
  const SETTINGS_KEY = 'jucum_group_settings_v1';
  const PROGRESS_KEY = 'jucum_student_progress_v1';
  const NOTIF_KEY    = 'jucum_notifs_v1';

  function getSettings(groupId) {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')[groupId] || {}; } catch { return {}; }
  }
  function getProgress(sid) {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}')[sid] || { completed:{}, todayMinutes:0, lastDay:null }; } catch { return { completed:{}, todayMinutes:0, lastDay:null }; }
  }
  function saveProgress(sid, prog) {
    let all = {};
    try { all = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); } catch {}
    all[sid] = prog;
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
  }
  function pushNotif(sid, notif) {
    let all = {};
    try { all = JSON.parse(localStorage.getItem(NOTIF_KEY) || '{}'); } catch {}
    all[sid] = all[sid] || [];
    all[sid].unshift({ id:'n-'+Date.now(), date:new Date().toISOString(), read:false, ...notif });
    localStorage.setItem(NOTIF_KEY, JSON.stringify(all));
  }

  // Identify active module + the first incomplete activity of this page's type
  const settings  = getSettings(user.groupId);
  // 🔧 Multi-módulo: busca en TODOS los módulos activos del grupo (antes solo en
  // el primero — practicar un kit de otro módulo activo se acreditaba al equivocado).
  const activeIds = (Array.isArray(settings.activeModuleIds) && settings.activeModuleIds.length)
    ? settings.activeModuleIds
    : (settings.activeModuleId ? [settings.activeModuleId] : []);
  if (!activeIds.length) return;
  let moduleId = activeIds[0];

  let activityId = null;
  try {
    const catalog = JSON.parse(localStorage.getItem('jucum_module_catalog_cache') || 'null');
    const prog = getProgress(user.studentId);
    for (const mid of activeIds) {
      const mod = catalog?.[user.level]?.find(mm => mm.id === mid);
      if (!mod) continue;
      const candidates = mod.activities.filter(a => a.type === pageType);
      if (!candidates.length) continue;
      const pending = candidates.find(a => !prog.completed[`${mid}:${a.id}`]);
      if (pending) { moduleId = mid; activityId = pending.id; break; }
      if (!activityId) { moduleId = mid; activityId = candidates[0].id; }
    }
  } catch {}
  if (!activityId) activityId = pageType + '-auto'; // fallback key

  // ── Practice-minute tracking (active time only) ──
  let activeSeconds = 0;
  let lastActivity  = Date.now();
  let completed     = false;
  ['mousemove','mousedown','keydown','scroll','touchstart','click'].forEach(ev =>
    document.addEventListener(ev, () => { lastActivity = Date.now(); }, { passive:true })
  );
  setInterval(() => {
    if (Date.now() - lastActivity < 60000) activeSeconds++;   // count if active within last minute
    if (!completed && activeSeconds >= 300) complete(70);     // auto after 5 active minutes
  }, 1000);

  function complete(score) {
    if (completed) return;
    completed = true;
    const minutes = Math.max(1, Math.round(activeSeconds / 60));
    const prog = getProgress(user.studentId);
    const key = `${moduleId}:${activityId}`;
    const already = !!prog.completed[key];
    prog.completed[key] = { score, minutes, date: new Date().toISOString() };
    const today = peruDayStr();
    if (prog.lastDay !== today) { prog.todayMinutes = 0; prog.lastDay = today; }
    prog.todayMinutes += minutes;
    saveProgress(user.studentId, prog);
    if (!already) {
      pushNotif(user.studentId, {
        type: 'achievement',
        title: '✅ Actividad completada',
        body: `Registraste ${minutes} min de práctica${score ? ` · ${score}%` : ''}. ¡Sigue así!`,
      });
      toast(`✅ Práctica registrada · ${minutes} min`);
    }
  }

  // Explicit completion signal from quiz pages
  window.addEventListener('jucum:activity-complete', (e) => complete(e.detail?.score ?? 80));

  // Persist partial minutes when leaving the page
  window.addEventListener('beforeunload', () => {
    if (completed || activeSeconds < 60) return;
    const minutes = Math.round(activeSeconds / 60);
    const prog = getProgress(user.studentId);
    const today = peruDayStr();
    if (prog.lastDay !== today) { prog.todayMinutes = 0; prog.lastDay = today; }
    prog.todayMinutes += minutes;
    saveProgress(user.studentId, prog);
  });

  function toast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:#2EA84B;color:#fff;padding:11px 20px;border-radius:24px;font:700 13px Nunito,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,0.3);z-index:99999;';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }
})();
