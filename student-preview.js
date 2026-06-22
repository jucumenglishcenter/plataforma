/* student-preview.js · "👁 Ver como alumno (demostración)"
 * ───────────────────────────────────────────────────────────────────────────
 * Botón flotante (abajo a la DERECHA), visible SOLO para profesor / dev / admin.
 * Abre la plataforma REAL tal como la vive un alumno de un grupo, con:
 *   · Selector de GRUPO (cambia al vuelo).
 *   · Selector de ESCENARIO de alumno para tus demostraciones en clase:
 *       🌱 Recién empieza   · 🐢 Practica poco   · 🔥 El que más practica
 *     Cada escenario alimenta el dashboard real (racha, meta del día, práctica
 *     que toca, recomendaciones, “a mejorar”, ranking del grupo, alertas…).
 *
 * Seguridad:
 *   · NO crea cuentas ni toca el login (tu sesión de profesor queda intacta).
 *   · NO escribe en Supabase (se anulan las escrituras y se restauran al salir).
 *   · El alumno es ficticio; al salir se elimina y se limpia todo rastro local.
 * Carga como <script src="student-preview.js"> DESPUÉS de App.comp.js.
 */
(function () {
  'use strict';

  var SYN = 'preview-';
  var PROG_KEY = 'jucum_student_progress_v1';
  var syncSaved = null, sbSaved = null, notifSaved = null, paySaved = null;

  function readUser() { try { return JSON.parse(localStorage.getItem('jucum_user') || 'null'); } catch (e) { return null; } }
  function isStaff(u) { return !!(u && (u.role === 'teacher' || u.role === 'dev' || u.role === 'admin')); }
  function D() { return window.JUCUM_DATA; }

  /* ── alumno sintético ──────────────────────────────────────────────── */
  function injectStudent(gid) {
    var d = D(); if (!d) return null;
    var g = (d.GROUPS || []).find(function (x) { return x.id === gid; });
    if (!g) return null;
    removeStudents();
    var s = {
      id: SYN + gid, username: 'demo', fullName: 'Alumno Demostración',
      level: g.level, group: gid, starred: false,
      completedModules: 0, avgScore: 0, streak: 0, lastActiveDays: 0,
      totalMinutes: 0, achievements: [], _preview: true
    };
    d.STUDENTS.push(s);
    return s;
  }
  function removeStudents() {
    var d = D(); if (!d || !d.STUDENTS) return;
    for (var i = d.STUDENTS.length - 1; i >= 0; i--) {
      if (d.STUDENTS[i] && d.STUDENTS[i]._preview) d.STUDENTS.splice(i, 1);
    }
  }

  /* ── progreso local del alumno-demo (clave real, solo su id) ───────── */
  function writeProgress(sid, obj) {
    try { var all = JSON.parse(localStorage.getItem(PROG_KEY) || '{}'); all[sid] = obj; localStorage.setItem(PROG_KEY, JSON.stringify(all)); } catch (e) {}
  }
  function clearProgress(sid) {
    try { var all = JSON.parse(localStorage.getItem(PROG_KEY) || '{}'); if (all[sid] != null) { delete all[sid]; localStorage.setItem(PROG_KEY, JSON.stringify(all)); } } catch (e) {}
  }

  /* ── escenarios: alimentan stats + progreso para que el dashboard real
   *    muestre cada caso de alumno ─────────────────────────────────────── */
  function seedScenario(gid, scenario) {
    var d = D(); if (!d) return;
    var g = (d.GROUPS || []).find(function (x) { return x.id === gid; }); if (!g) return;
    var sid = SYN + gid;
    var stu = d.STUDENTS.find(function (s) { return s.id === sid; }); if (!stu) return;

    var settings = d.getGroupSettings ? d.getGroupSettings(gid) : {};
    var mods = (d.MODULE_CATALOG && d.MODULE_CATALOG[g.level]) || [];
    var activeIds = (settings.activeModuleIds && settings.activeModuleIds.length) ? settings.activeModuleIds : (settings.activeModuleId ? [settings.activeModuleId] : []);
    var mod = mods.find(function (m) { return activeIds.indexOf(m.id) >= 0; }) || mods[0];
    var acts = (mod && mod.activities) || [];
    var target = (settings.dailyTargetMin || 15);
    var now = Date.now();
    function iso(daysAgo) { return new Date(now - daysAgo * 86400000).toISOString().slice(0, 19); }
    function day(daysAgo) { return new Date(now - daysAgo * 86400000).toISOString().slice(0, 10); }
    var completed = {};

    if (scenario === 'nuevo') {
      Object.assign(stu, { streak: 0, totalMinutes: 0, avgScore: 0, completedModules: 0, lastActiveDays: 0, achievements: [] });
      writeProgress(sid, { completed: {}, todayMinutes: 0, lastDay: null });

    } else if (scenario === 'poco') {
      // Hizo lo primero hace ~6 días y con nota baja → inactivo + "a mejorar".
      if (mod && acts[0]) completed[mod.id + ':' + acts[0].id] = { score: null, minutes: 7, date: iso(6) };
      var reading = acts.find(function (a) { return a.type === 'reading'; });
      if (mod && reading) completed[mod.id + ':' + reading.id] = { score: 55, minutes: 6, date: iso(6) };
      Object.assign(stu, { streak: 0, totalMinutes: 26, avgScore: 55, completedModules: 0, lastActiveDays: 6, achievements: ['first'] });
      writeProgress(sid, { completed: completed, todayMinutes: 0, lastDay: day(6) });

    } else { // 'top'
      acts.forEach(function (a, i) {
        if (i >= acts.length - 1) return;                 // deja la última pendiente (siguiente recomendada)
        var part = (a.type === 'story' || a.type === 'summary' || a.type === 'quizlet');
        completed[mod.id + ':' + a.id] = { score: part ? null : (90 + (i % 7)), minutes: 6 + (i % 4), date: iso(Math.max(0, 4 - Math.floor(i / 3))) };
      });
      Object.assign(stu, { streak: 14, totalMinutes: 540, avgScore: 94, completedModules: 1, lastActiveDays: 0, achievements: ['first', 'streak', 'minutes', 'modules', 'literal'] });
      writeProgress(sid, { completed: completed, todayMinutes: target + 6, lastDay: day(0) });
    }
    // que no salte el onboarding ni alertas viejas mientras demuestras
    try { localStorage.setItem('jucum_onboarded_' + sid, '1'); } catch (e) {}
  }

  /* ── candado de escritura + blindaje de pagos ──────────────────────── */
  function gate(on) {
    window.JUCUM_PREVIEW = on;
    if (on) {
      if (window.JUCUM_SYNC && !syncSaved) {
        syncSaved = window.JUCUM_SYNC;
        var w = {}; for (var k in syncSaved) { w[k] = (typeof syncSaved[k] === 'function' && /^push/i.test(k)) ? function () {} : syncSaved[k]; }
        window.JUCUM_SYNC = w;
      }
      if (window.JUCUM_NOTIF && !notifSaved) { notifSaved = window.JUCUM_NOTIF; var n = Object.assign({}, notifSaved); if (typeof n.pushNotif === 'function') n.pushNotif = function () {}; window.JUCUM_NOTIF = n; }
      if (window.JUCUM_SB && !sbSaved) { sbSaved = window.JUCUM_SB; var sb = Object.assign({}, sbSaved); ['insert', 'update', 'remove', 'upsert'].forEach(function (m) { if (typeof sb[m] === 'function') sb[m] = function () { return Promise.resolve(null); }; }); window.JUCUM_SB = sb; }
      // El alumno-demo nunca está bloqueado por pagos (para no tapar el panel)
      if (window.JUCUM_PAY && !paySaved) {
        paySaved = window.JUCUM_PAY;
        var p = Object.assign({}, paySaved);
        p.getAccountStatus = function () { return { state: 'al_dia', blocked: false, daysLeft: null, payDay: 5 }; };
        if (typeof p.pendingConfirmCelebration === 'function') p.pendingConfirmCelebration = function () { return null; };
        window.JUCUM_PAY = p;
      }
    } else {
      if (syncSaved) { window.JUCUM_SYNC = syncSaved; syncSaved = null; }
      if (notifSaved) { window.JUCUM_NOTIF = notifSaved; notifSaved = null; }
      if (sbSaved) { window.JUCUM_SB = sbSaved; sbSaved = null; }
      if (paySaved) { window.JUCUM_PAY = paySaved; paySaved = null; }
    }
  }

  /* ── estilos ───────────────────────────────────────────────────────── */
  var launcherStyle = {
    position: 'fixed', right: 18, bottom: 18, zIndex: 2147483600,
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '12px 19px', border: 'none', borderRadius: 999, cursor: 'pointer',
    fontFamily: "'Fredoka','Nunito',sans-serif", fontWeight: 600, fontSize: 14.5,
    color: '#fff', background: 'linear-gradient(135deg,#1F3A8A,#2E5BB8)',
    boxShadow: '0 8px 24px rgba(31,58,138,0.4)'
  };
  var overlayStyle = { position: 'fixed', inset: 0, zIndex: 2147483601, display: 'flex', flexDirection: 'column', background: 'var(--bg-tint,#FAFAF6)' };
  var bannerStyle = { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '9px 16px', color: '#fff', background: 'linear-gradient(135deg,#1F3A8A,#2E5BB8)', fontFamily: "'Nunito',sans-serif", fontSize: 13.5, boxShadow: '0 2px 12px rgba(0,0,0,0.18)' };
  var selStyle = { fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 13.5, padding: '6px 11px', borderRadius: 10, border: '2px solid rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.16)', color: '#fff', cursor: 'pointer' };
  var exitStyle = { border: 'none', cursor: 'pointer', fontFamily: "'Fredoka','Nunito',sans-serif", fontWeight: 600, fontSize: 13, color: '#1F3A8A', background: '#fff', borderRadius: 999, padding: '8px 15px', whiteSpace: 'nowrap' };
  var segWrap = { display: 'inline-flex', gap: 4, background: 'rgba(255,255,255,0.14)', padding: 3, borderRadius: 999 };
  function segBtn(on) { return { border: 'none', cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 12.5, padding: '6px 12px', borderRadius: 999, whiteSpace: 'nowrap', color: on ? '#1F3A8A' : '#fff', background: on ? '#fff' : 'transparent' }; }

  var SCEN = [
    { k: 'nuevo', t: '🌱 Recién empieza' },
    { k: 'poco', t: '🐢 Practica poco' },
    { k: 'top', t: '🔥 El que más practica' }
  ];
  var levelTag = { 'pre-a1': '💛 Pre-A1', 'a1': '💙 A1', 'a2': '💚 A2' };

  /* ── componente raíz ───────────────────────────────────────────────── */
  function JucumPreviewRoot() {
    var h = React.createElement;
    var st = React.useState(isStaff(readUser())); var staff = st[0], setStaff = st[1];
    var sa = React.useState(false); var active = sa[0], setActive = sa[1];
    var sg = React.useState(null); var gid = sg[0], setGid = sg[1];
    var sc = React.useState('nuevo'); var scen = sc[0], setScen = sc[1];

    React.useEffect(function () {
      var t = setInterval(function () { setStaff(isStaff(readUser())); }, 1500);
      var onS = function () { setStaff(isStaff(readUser())); };
      window.addEventListener('storage', onS);
      return function () { clearInterval(t); window.removeEventListener('storage', onS); };
    }, []);

    function apply(g, s) { injectStudent(g); seedScenario(g, s); }
    function enter() {
      var groups = (D() && D().GROUPS) || [];
      if (!groups.length) { alert('Aún no hay grupos creados.\nCrea al menos un grupo en ⚙️ Grupos para previsualizar la vista del alumno.'); return; }
      var g = groups[0].id;
      gate(true); apply(g, 'nuevo');
      try { document.body.style.overflow = 'hidden'; } catch (e) {}
      setGid(g); setScen('nuevo'); setActive(true);
    }
    function exit() {
      var sid = SYN + gid;
      gate(false); removeStudents(); clearProgress(sid);
      try { localStorage.removeItem('jucum_onboarded_' + sid); } catch (e) {}
      try { document.body.style.overflow = ''; } catch (e) {}
      setActive(false); setGid(null);
    }
    function pickGroup(ng) { clearProgress(SYN + gid); apply(ng, scen); setGid(ng); }
    function pickScen(ns) { apply(gid, ns); setScen(ns); }

    if (!staff) return null;
    if (!active) return h('button', { onClick: enter, style: launcherStyle, title: 'Ver la app como un alumno de cualquier grupo' }, '👁 Ver como alumno');

    var d = D() || {}; var groups = d.GROUPS || [];
    var g = groups.find(function (x) { return x.id === gid; }) || {};
    var user = { studentId: SYN + gid, role: 'student', fullName: 'Alumno Demostración' };
    var canRender = (typeof StudentDashboard === 'function') && g && g.id;

    return h('div', { style: overlayStyle },
      h('div', { style: bannerStyle },
        h('span', { style: { fontWeight: 800, fontFamily: "'Fredoka',sans-serif" } }, '👁 DEMOSTRACIÓN'),
        h('select', { value: gid, onChange: function (e) { pickGroup(e.target.value); }, style: selStyle, title: 'Cambiar de grupo' },
          groups.map(function (gg) { return h('option', { key: gg.id, value: gg.id, style: { color: '#1F3A8A' } }, (levelTag[gg.level] || '📘') + '  ' + gg.name); })
        ),
        h('span', { style: segWrap },
          SCEN.map(function (s) { return h('button', { key: s.k, onClick: function () { pickScen(s.k); }, style: segBtn(scen === s.k) }, s.t); })
        ),
        h('span', { style: { flex: 1, minWidth: 6 } }),
        h('button', { onClick: exit, style: exitStyle }, '✕ Salir')
      ),
      h('div', { style: { flex: 1, overflow: 'auto' } },
        h('div', { key: gid + '|' + scen },
          canRender
            ? h(StudentDashboard, { user: user, onLogout: exit })
            : h('div', { style: { padding: 40, fontFamily: 'Nunito,sans-serif', color: '#777' } }, 'Cargando la vista del alumno…')
        )
      )
    );
  }

  /* ── montaje ───────────────────────────────────────────────────────── */
  function mount() {
    if (!window.React || !window.ReactDOM || !document.body) { setTimeout(mount, 200); return; }
    if (document.getElementById('jucum-preview-host')) return;
    var host = document.createElement('div'); host.id = 'jucum-preview-host'; document.body.appendChild(host);
    try { ReactDOM.createRoot(host).render(React.createElement(JucumPreviewRoot)); }
    catch (e) { console.warn('student-preview:', e && e.message); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
