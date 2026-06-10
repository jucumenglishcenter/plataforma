/* JUCUM EC · Persistent student navigation bar
 * Drop this into any activity HTML (story/reading/listening/...).
 * It reads the logged-in user from localStorage and injects a top bar with
 * navigation back to the platform, profile, forum (future), and logout.
 *
 * Usage:  <script src="../students/student-nav.js"></script>
 */
(function () {
  const user = JSON.parse(localStorage.getItem('jucum_user') || 'null');
  if (!user) return; // no session → don't inject anything (e.g. designer viewing kit alone)

  // For students: pin to their level and remove dev-only level switcher
  if (user.role === 'student' && user.level) {
    document.documentElement.setAttribute('data-level', user.level);
    document.body.setAttribute('data-level', user.level);
    document.body.classList.add('jec-is-student');
    // Permanent kill of any .lvl-switch via CSS + DOM watcher
    const cssHide = document.createElement('style');
    cssHide.textContent = '.jec-is-student .lvl-switch{display:none!important;visibility:hidden!important;}';
    document.head.appendChild(cssHide);
    const killSwitch = () => {
      document.querySelectorAll('.lvl-switch').forEach(el => el.remove());
    };
    killSwitch();
    // Re-run repeatedly because React may re-render the switch after this script ran
    new MutationObserver(killSwitch).observe(document.documentElement, { childList: true, subtree: true });
  }

  // Path back to the platform (depends on caller's depth)
  // All activity kits live one level deep under ui_kits/<kit>/index.html
  // The platform is at ui_kits/students/index.html → so "../students/index.html"
  const platformHref = '../students/index.html';
  const logoSrc      = 'logo-jucum.png';

  const name = user.name || (user.role === 'teacher' ? 'Profesor' : 'Alumno');
  const firstName = name.split(' ')[0];
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  const isTeacher = user.role === 'teacher';

  // ── Styles ─────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    :root { --jec-nav-h: 56px; }
    body { padding-top: var(--jec-nav-h) !important; }
    #jec-nav {
      position: fixed; top: 0; left: 0; right: 0; height: var(--jec-nav-h);
      background: #fff; border-bottom: 1.5px solid #E8E5DC;
      display: flex; align-items: center; gap: 12px;
      padding: 0 18px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.07), 0 2px 6px rgba(0,0,0,0.10);
      z-index: 9999;
      font-family: 'Nunito', system-ui, sans-serif;
    }
    #jec-nav .jec-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; flex-shrink: 0; }
    #jec-nav .jec-brand img { height: 36px; width: auto; }
    #jec-nav .jec-brand .jec-pt { font-family: 'Fredoka', sans-serif; font-weight: 600; font-size: 13px; color: #2A2A2A; }
    @media (max-width: 600px) { #jec-nav .jec-brand .jec-pt { display: none; } }
    #jec-nav .jec-links { display: flex; gap: 4px; margin-left: 12px; }
    #jec-nav .jec-link {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 6px 12px; border-radius: 8px;
      text-decoration: none; color: #555;
      font-size: 12.5px; font-weight: 700;
      transition: all 0.15s;
      border: none; background: transparent; cursor: pointer; font-family: inherit;
    }
    #jec-nav .jec-link:hover { background: #FAFAF6; color: #1F3A8A; }
    #jec-nav .jec-link.primary { background: linear-gradient(135deg, #1F3A8A, #0D1B5A); color: #fff; }
    #jec-nav .jec-link.primary:hover { box-shadow: 0 3px 10px rgba(31,58,138,0.35); }
    #jec-nav .jec-spacer { flex: 1; }
    #jec-nav .jec-user {
      display: flex; align-items: center; gap: 8px;
      padding: 4px 12px 4px 4px;
      background: #FAFAF6; border: 1px solid #E8E5DC; border-radius: 24px;
      font-size: 12px; font-weight: 700;
    }
    #jec-nav .jec-ava {
      width: 28px; height: 28px; border-radius: 50%;
      background: linear-gradient(135deg, #E11930, #B71C1C);
      color: #fff; font-family: 'Fredoka', sans-serif; font-weight: 600; font-size: 12px;
      display: flex; align-items: center; justify-content: center;
    }
    #jec-nav .jec-ava.teacher { background: linear-gradient(135deg, #3F5BB8, #0D1B5A); }
    #jec-nav .jec-logout {
      background: none; border: none; cursor: pointer;
      color: #777; font-size: 14px; padding: 2px 6px;
    }
    #jec-nav .jec-logout:hover { color: #C62828; }

    #jec-toast {
      position: fixed; bottom: 18px; left: 50%; transform: translateX(-50%);
      background: #1F3A8A; color: #fff; padding: 10px 18px;
      border-radius: 22px; font-size: 12.5px; font-weight: 700;
      box-shadow: 0 4px 14px rgba(0,0,0,0.30);
      z-index: 10000; opacity: 0; pointer-events: none;
      transition: opacity 0.25s, transform 0.25s;
      font-family: 'Nunito', sans-serif;
    }
    #jec-toast.show { opacity: 1; transform: translate(-50%, -6px); }
  `;
  document.head.appendChild(style);

  // ── Bar markup ─────────────────────────────────────────────────────
  const bar = document.createElement('nav');
  bar.id = 'jec-nav';
  bar.innerHTML = `
    <a href="${platformHref}" class="jec-brand" title="Volver al panel">
      <img src="${logoSrc}" alt="JUCUM EC" />
      <span class="jec-pt">JUCUM English Center</span>
    </a>
    <div class="jec-links">
      <a href="${platformHref}" class="jec-link primary">${isTeacher ? '👨‍🏫 Panel del profesor' : '🏠 Mi panel'}</a>
      ${isTeacher ? '' : '<button class="jec-link" data-action="profile">👤 Mi perfil</button>'}
      <button class="jec-link" data-action="forum">💬 Foro</button>
      <button class="jec-link" data-action="help">❓ Ayuda</button>
    </div>
    <div class="jec-spacer"></div>
    <div class="jec-user">
      <div class="jec-ava ${isTeacher ? 'teacher' : ''}">${initials}</div>
      <span>${firstName}</span>
      <button class="jec-logout" title="Cerrar sesión">⎋</button>
    </div>
  `;
  document.body.insertBefore(bar, document.body.firstChild);

  // ── Toast (for placeholder actions like Foro / Mi perfil) ─────────
  const toast = document.createElement('div');
  toast.id = 'jec-toast';
  document.body.appendChild(toast);
  function showToast(msg, ms = 2200) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('show'), ms);
  }

  // ── Action handlers ────────────────────────────────────────────────
  bar.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const action = btn.dataset.action;
      if (action === 'profile')  showToast('👤 Mi perfil — abre tu panel para ver tu progreso.');
      if (action === 'forum')    showToast('💬 Foro — próximamente (Bloque F).');
      if (action === 'help')     showToast('❓ Si necesitas ayuda, pregunta a tu profesor.');
    });
  });
  bar.querySelector('.jec-logout').addEventListener('click', () => {
    if (confirm('¿Cerrar sesión?')) {
      localStorage.removeItem('jucum_user');
      window.location.href = platformHref;
    }
  });
})();
