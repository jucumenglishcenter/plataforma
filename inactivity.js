/* Inactivity tracker for students.
 *  - After 7 min of no activity → show warning modal
 *  - After 6 more min (13 total) → auto-logout
 *  - Practice time only counts when active
 * Tracks: mousemove, mousedown, keydown, scroll, touchstart, click.
 */
(function () {
  const user = JSON.parse(localStorage.getItem('jucum_user') || 'null');
  if (!user || user.role !== 'student') return;

  const WARN_MS   = 7 * 60 * 1000;  // 7 min → warning
  const LOGOUT_MS = 6 * 60 * 1000;  // +6 min after warning → logout
  let lastActive  = Date.now();
  let warned      = false;
  let warnTimer, logoutTimer, countTimer;
  let modal       = null;

  /* Practice time counter — increments only while active */
  let activeSeconds = 0;
  let lastTick = Date.now();
  const tick = () => {
    const now = Date.now();
    const dt  = (now - lastTick) / 1000;
    lastTick  = now;
    if (now - lastActive < WARN_MS) activeSeconds += dt;
    // Persist every 30s to avoid losing time on accidental close
    if (Math.floor(activeSeconds) % 30 === 0 && activeSeconds > 0) {
      const key = `jucum_session_minutes_${user.studentId}_${new Date().toISOString().slice(0,10)}`;
      localStorage.setItem(key, String(Math.floor(activeSeconds / 60)));
    }
  };
  countTimer = setInterval(tick, 1000);

  const showWarning = () => {
    if (modal) return;
    modal = document.createElement('div');
    modal.id = 'jec-inactive-modal';
    modal.innerHTML = `
      <div class="jec-im-card">
        <div class="jec-im-ico">😴</div>
        <div class="jec-im-title">¿Sigues ahí?</div>
        <div class="jec-im-body">No detectamos actividad en los últimos 7 minutos.<br>
          Te llevaremos a tu <b>panel principal</b> en <b id="jec-im-count">6:00</b> si no respondes.<br>
          <span style="font-size:11.5px;color:#777;">(No te preocupes: <b>no cerramos tu sesión</b>. El tiempo inactivo no cuenta como práctica.)</span>
        </div>
        <button id="jec-im-resume" class="jec-im-btn">Sí, sigo aquí ✓</button>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('jec-im-resume').onclick = () => {
      lastActive = Date.now();
      resetTimers();
    };
    let secs = LOGOUT_MS / 1000;
    const countDown = () => {
      const m = Math.floor(secs/60), s = String(secs%60).padStart(2,'0');
      const el = document.getElementById('jec-im-count');
      if (el) el.textContent = `${m}:${s}`;
      secs--;
      if (secs >= 0) setTimeout(countDown, 1000);
    };
    countDown();
  };

  const hideWarning = () => {
    if (modal) { modal.remove(); modal = null; }
  };

  // Inactividad en la PLATAFORMA: no cerramos sesión (eso solo pasa dentro de
  // los materiales de práctica). Simplemente devolvemos al alumno a su panel
  // principal recargando la plataforma (vuelve al dashboard, sin perder login).
  const goToPanel = () => {
    hideWarning();
    window.location.href = 'index.html';
  };

  const resetTimers = () => {
    warned = false;
    hideWarning();
    clearTimeout(warnTimer);
    clearTimeout(logoutTimer);
    warnTimer = setTimeout(() => {
      warned = true;
      showWarning();
      logoutTimer = setTimeout(goToPanel, LOGOUT_MS);
    }, WARN_MS);
  };

  const onActivity = () => {
    lastActive = Date.now();
    if (warned) return; // wait for explicit confirmation via button
    resetTimers();
  };

  ['mousemove','mousedown','keydown','scroll','touchstart','click'].forEach(ev =>
    document.addEventListener(ev, onActivity, { passive: true })
  );
  resetTimers();

  // Styles
  const css = document.createElement('style');
  css.textContent = `
    #jec-inactive-modal{position:fixed;inset:0;background:rgba(15,23,42,0.72);backdrop-filter:blur(5px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;}
    #jec-inactive-modal .jec-im-card{background:#fff;border-radius:18px;padding:34px 30px 26px;max-width:380px;width:100%;text-align:center;box-shadow:0 14px 48px rgba(0,0,0,0.4);font-family:'Nunito',sans-serif;}
    #jec-inactive-modal .jec-im-ico{font-size:58px;margin-bottom:8px;animation:jecBounce 1.5s ease-in-out infinite;}
    @keyframes jecBounce{0%,100%{transform:translateY(0);}50%{transform:translateY(-6px);}}
    #jec-inactive-modal .jec-im-title{font-family:'Fredoka',sans-serif;font-weight:600;font-size:22px;color:#1F3A8A;margin-bottom:10px;}
    #jec-inactive-modal .jec-im-body{font-size:13.5px;line-height:1.6;color:#444;margin-bottom:18px;}
    #jec-inactive-modal #jec-im-count{font-family:ui-monospace,Menlo,monospace;font-weight:800;color:#E11930;font-size:16px;}
    #jec-inactive-modal .jec-im-btn{padding:12px 28px;border:none;border-radius:24px;background:linear-gradient(135deg,#1F3A8A,#0D1B5A);color:#fff;font-family:inherit;font-weight:800;font-size:13.5px;letter-spacing:0.04em;cursor:pointer;box-shadow:0 2px 6px rgba(31,58,138,0.3);}
    #jec-inactive-modal .jec-im-btn:hover{transform:translateY(-1px);box-shadow:0 4px 14px rgba(31,58,138,0.4);}
  `;
  document.head.appendChild(css);
})();
