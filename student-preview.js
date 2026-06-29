/* student-preview.js · "👁 Ver como alumno (en vivo)" — v2
 * ───────────────────────────────────────────────────────────────────────────
 * Se abre desde el DETALLE DE UN GRUPO (Mis grupos → entrar a un grupo →
 * botón "👁 Ver como alumno"). Muestra la plataforma REAL tal como la vive un
 * alumno de ESE grupo, EN VIVO. Llama a window.JUCUM_STUDENT_PREVIEW.open(groupId).
 *
 * NOVEDADES v2 (respecto a la versión anterior):
 *   1) ALUMNOS REALES — además de "vista general" y los casos de ejemplo, ahora
 *      eliges a un alumno REAL del grupo (en ORDEN ALFABÉTICO) y ves SU pantalla
 *      de verdad: su práctica del día, sus tareas, su avance — exactamente lo
 *      que él recibe. Se acabó el ver prácticas que no le dejaste.
 *   2) SOLO LECTURA REFORZADO — al mirar a un alumno real NO se consume su cupo
 *      de avisos del día ni se marca nada como visto: se bloquean en localStorage
 *      solo sus claves de "visto/descartado/onboarding" mientras lo miras. El
 *      alumno volverá a ver sus anuncios igual. Nada se escribe en la nube.
 *   3) EN VIVO — relee el avance de la nube al entrar, al volver a la pestaña y
 *      cada 15 s, así lo que dejas (tarea, evaluación, módulo) aparece sin recargar.
 *   4) 📱 Celular / 💻 Web — un botón para ver cómo se adapta en cada dispositivo.
 *
 * SEGURO: no crea cuentas, no toca el login, no escribe en Supabase, el alumno
 * (cuando es de ejemplo) es ficticio. Al pulsar "✕ Salir" desaparece sin rastro.
 * Solo lo ven profesor / dev / admin.
 *
 * Carga como <script src="student-preview.js"> DESPUÉS de App.comp.js.
 */
(function () {
  'use strict';

  var SYN = 'preview-';
  var PROG_KEY = 'jucum_student_progress_v1';
  var syncSaved = null, sbSaved = null, notifSaved = null, paySaved = null, surveySaved = null, dropSaved = null;

  // candado de cupos: bloquea SOLO las claves de "visto/descartado" del alumno mirado
  var origSetItem = null, guardSid = null;
  // claves "visto" sembradas en local SOLO para limpiar la vista del alumno real; se borran al salir
  var previewSeededKeys = [];

  function readUser() { try { return JSON.parse(localStorage.getItem('jucum_user') || 'null'); } catch (e) { return null; } }
  function isStaff(u) { return !!(u && (u.role === 'teacher' || u.role === 'dev' || u.role === 'admin')); }
  function D() { return window.JUCUM_DATA; }

  /* ── alumnos REALES del grupo, en ORDEN ALFABÉTICO ─────────────────── */
  function realStudents(gid) {
    var d = D(); if (!d || !d.STUDENTS) return [];
    return d.STUDENTS
      .filter(function (s) { return s && s.group === gid && !s._preview; })
      .slice()
      .sort(function (a, b) {
        return String(a.fullName || a.username || '').localeCompare(
               String(b.fullName || b.username || ''), 'es', { sensitivity: 'base' });
      });
  }

  /* ── alumno sintético (solo para "vista general" y casos de ejemplo) ── */
  function injectStudent(gid) {
    var d = D(); if (!d) return null;
    var g = (d.GROUPS || []).find(function (x) { return x.id === gid; });
    if (!g) return null;
    removeStudents();
    var s = {
      id: SYN + gid, username: 'demo', fullName: 'Alumno del grupo',
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

  /* ── progreso local del sintético (clave real, solo su id) ─────────── */
  function writeProgress(sid, obj) {
    try { var all = JSON.parse(localStorage.getItem(PROG_KEY) || '{}'); all[sid] = obj; localStorage.setItem(PROG_KEY, JSON.stringify(all)); } catch (e) {}
  }
  function clearProgress(sid) {
    try { var all = JSON.parse(localStorage.getItem(PROG_KEY) || '{}'); if (all[sid] != null) { delete all[sid]; localStorage.setItem(PROG_KEY, JSON.stringify(all)); } } catch (e) {}
  }

  /* ── casos de ejemplo (synthetic) — solo para demostraciones en clase ─ */
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
      if (mod && acts[0]) completed[mod.id + ':' + acts[0].id] = { score: null, minutes: 7, date: iso(6) };
      var reading = acts.find(function (a) { return a.type === 'reading'; });
      if (mod && reading) completed[mod.id + ':' + reading.id] = { score: 55, minutes: 6, date: iso(6) };
      Object.assign(stu, { streak: 0, totalMinutes: 26, avgScore: 55, completedModules: 0, lastActiveDays: 6, achievements: ['first'] });
      writeProgress(sid, { completed: completed, todayMinutes: 0, lastDay: day(6) });

    } else { // 'top'
      acts.forEach(function (a, i) {
        if (i >= acts.length - 1) return;
        var part = (a.type === 'story' || a.type === 'summary' || a.type === 'quizlet');
        completed[mod.id + ':' + a.id] = { score: part ? null : (90 + (i % 7)), minutes: 6 + (i % 4), date: iso(Math.max(0, 4 - Math.floor(i / 3))) };
      });
      Object.assign(stu, { streak: 14, totalMinutes: 540, avgScore: 94, completedModules: 1, lastActiveDays: 0, achievements: ['first', 'streak', 'minutes', 'modules', 'literal'] });
      writeProgress(sid, { completed: completed, todayMinutes: target + 6, lastDay: day(0) });
    }
  }

  /* ── candado de cupos: NO consumir los avisos del día del alumno real ─
   * Mientras miras a un alumno REAL, anulamos SOLO las escrituras de
   * "visto/descartado/onboarding" que lleven su id. Así el alumno volverá a
   * ver sus anuncios (cartel de tarea, vocabulario, onboarding) las veces que
   * le corresponden. El resto de escrituras (p.ej. el caché de avance que baja
   * de la nube) pasan normales. Se restaura el setItem original al salir. */
  function isQuotaKey(k, sid) {
    return typeof k === 'string' && !!sid && k.indexOf(sid) >= 0 &&
      /(onboarded|taskcartel|cartel|vocab_dismiss|survey|dropexp|reminder|seen|dismiss)/i.test(k);
  }
  function quotaGuardOn(sid) {
    guardSid = sid;
    if (origSetItem) return;
    origSetItem = Storage.prototype.setItem;
    var orig = origSetItem;
    Storage.prototype.setItem = function (k, v) {
      try { if (this === window.localStorage && guardSid && isQuotaKey(k, guardSid)) return; } catch (e) {}
      return orig.apply(this, arguments);
    };
  }
  function quotaGuardOff() {
    guardSid = null;
    if (origSetItem) { Storage.prototype.setItem = origSetItem; origSetItem = null; }
  }

  /* ── ocultar carteles que NO son parte de la pantalla habitual del alumno real ──
   * Escribe SOLO en el localStorage del PROFESOR (no en la nube, no en el del alumno)
   * para que, al verlo, no salte el Onboarding (que el alumno ya pasó). Se limpia al
   * salir, así que no deja rastro. Usa el setItem nativo para no chocar con el candado. */
  function rawSet(k, v) { try { (origSetItem || Storage.prototype.setItem).call(localStorage, k, v); } catch (e) {} }
  function suppressNagsReal(sid) {
    var k = 'jucum_onboarded_' + sid;
    rawSet(k, '1');
    if (previewSeededKeys.indexOf(k) < 0) previewSeededKeys.push(k);
  }

  /* ── candado de escritura en la nube + blindaje de pagos ───────────── */
  function gate(on) {
    window.JUCUM_PREVIEW = on;
    if (on) {
      if (window.JUCUM_SYNC && !syncSaved) {
        syncSaved = window.JUCUM_SYNC;
        // anula toda escritura a la nube: push*, mark* (leídas), *Db (calificar/borrar).
        // refreshProgress y demás LECTURAS se conservan para que la vista siga en vivo.
        var w = {}; for (var k in syncSaved) { w[k] = (typeof syncSaved[k] === 'function' && (/^push/i.test(k) || /^mark/i.test(k) || /Db$/.test(k))) ? function () {} : syncSaved[k]; }
        window.JUCUM_SYNC = w;
      }
      if (window.JUCUM_NOTIF && !notifSaved) {
        notifSaved = window.JUCUM_NOTIF;
        var n = Object.assign({}, notifSaved);
        // mirar no debe crear, marcar como leídas ni borrar las notificaciones del alumno.
        ['pushNotif', 'markRead', 'markAllRead', 'clearNotifs'].forEach(function (m) { if (typeof n[m] === 'function') n[m] = function () {}; });
        window.JUCUM_NOTIF = n;
      }
      if (window.JUCUM_SB && !sbSaved) { sbSaved = window.JUCUM_SB; var sb = Object.assign({}, sbSaved); ['insert', 'update', 'remove', 'upsert'].forEach(function (m) { if (typeof sb[m] === 'function') sb[m] = function () { return Promise.resolve(null); }; }); window.JUCUM_SB = sb; }
      if (window.JUCUM_PAY && !paySaved) {
        paySaved = window.JUCUM_PAY;
        var p = Object.assign({}, paySaved);
        p.getAccountStatus = function () { return { state: 'al_dia', blocked: false, daysLeft: null, payDay: 5 }; };
        if (typeof p.pendingConfirmCelebration === 'function') p.pendingConfirmCelebration = function () { return null; };
        window.JUCUM_PAY = p;
      }
      // La encuesta de satisfacción no es parte del "panel": no debe bloquear la vista
      // del profesor (y nunca debe registrarse a su nombre). Se restaura al salir.
      if (window.JUCUM_SURVEY && !surveySaved) {
        surveySaved = window.JUCUM_SURVEY;
        var sv = Object.assign({}, surveySaved);
        sv.isSurveyDue = function () { return false; };
        window.JUCUM_SURVEY = sv;
      }
      // La "explicación de bajada" se calcula contra una línea base del PROPIO dispositivo
      // del alumno; en el del profesor no existe, así que saldría un aviso engañoso. La
      // silenciamos durante la previsualización (lectura pura) y restauramos al salir.
      if (window.JUCUM_DATA && !dropSaved) {
        dropSaved = { g: window.JUCUM_DATA.getDropExplanation, a: window.JUCUM_DATA.ackDropExplanation };
        window.JUCUM_DATA.getDropExplanation = function () { return null; };
        window.JUCUM_DATA.ackDropExplanation = function () {};
      }
    } else {
      if (syncSaved) { window.JUCUM_SYNC = syncSaved; syncSaved = null; }
      if (notifSaved) { window.JUCUM_NOTIF = notifSaved; notifSaved = null; }
      if (sbSaved) { window.JUCUM_SB = sbSaved; sbSaved = null; }
      if (paySaved) { window.JUCUM_PAY = paySaved; paySaved = null; }
      if (surveySaved) { window.JUCUM_SURVEY = surveySaved; surveySaved = null; }
      if (dropSaved) { window.JUCUM_DATA.getDropExplanation = dropSaved.g; window.JUCUM_DATA.ackDropExplanation = dropSaved.a; dropSaved = null; }
    }
  }

  /* ── estilos ───────────────────────────────────────────────────────── */
  var overlayStyle = { position: 'fixed', inset: 0, zIndex: 2147483601, display: 'flex', flexDirection: 'column', background: 'var(--bg-tint,#FAFAF6)' };
  var bannerStyle = { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', padding: '9px 16px', color: '#fff', background: 'linear-gradient(135deg,#1F3A8A,#2E5BB8)', fontFamily: "'Nunito',sans-serif", fontSize: 13.5, boxShadow: '0 2px 12px rgba(0,0,0,0.18)' };
  var liveStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 800, color: '#0E4B16', background: '#9FF3B6', padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap' };
  var selStyle = { fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 13, padding: '6px 10px', borderRadius: 10, border: '2px solid rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.16)', color: '#fff', cursor: 'pointer', maxWidth: 240 };
  var exitStyle = { border: 'none', cursor: 'pointer', fontFamily: "'Fredoka','Nunito',sans-serif", fontWeight: 600, fontSize: 13, color: '#1F3A8A', background: '#fff', borderRadius: 999, padding: '8px 15px', whiteSpace: 'nowrap' };
  var noteStyle = { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px', background: '#DCE6FA', color: '#22335c', fontSize: 12, fontWeight: 700, borderBottom: '1px solid #C2D2F0', lineHeight: 1.45 };
  var segWrap = { display: 'inline-flex', gap: 4, background: 'rgba(255,255,255,0.14)', padding: 3, borderRadius: 999 };
  function segBtn(on) { return { border: 'none', cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 12.5, padding: '6px 12px', borderRadius: 999, whiteSpace: 'nowrap', color: on ? '#1F3A8A' : '#fff', background: on ? '#fff' : 'transparent' }; }

  var levelTag = { 'pre-a1': '💛 Pre-A1', 'a1': '💙 A1', 'a2': '💚 A2' };

  /* ── componente raíz (sin launcher; se abre por API) ───────────────── */
  function JucumPreviewRoot() {
    var h = React.createElement;
    var sa = React.useState(false); var active = sa[0], setActive = sa[1];
    var sg = React.useState(null); var gid = sg[0], setGid = sg[1];
    var sw = React.useState('general'); var who = sw[0], setWho = sw[1];
    var sd = React.useState('phone'); var device = sd[0], setDevice = sd[1];
    var enterRef = React.useRef(null);

    function isSynthetic(w) { return w === 'general' || w.indexOf('ex:') === 0; }
    function viewedSid(w) { return isSynthetic(w) ? (SYN + gid) : w; }

    // Prepara el estado de datos para "ver como W" en el grupo G (sin tocar al alumno real)
    function apply(g, w) {
      removeStudents(); clearProgress(SYN + g);
      try { localStorage.removeItem('jucum_onboarded_' + (SYN + g)); } catch (e) {}
      if (isSynthetic(w)) {
        quotaGuardOff();                         // sintético: no hace falta candado
        injectStudent(g);
        if (w.indexOf('ex:') === 0) seedScenario(g, w.slice(3));   // caso de ejemplo
        else writeProgress(SYN + g, { completed: {}, todayMinutes: 0, lastDay: null }); // vista general (limpia)
        try { localStorage.setItem('jucum_onboarded_' + (SYN + g), '1'); } catch (e) {}
      } else {
        quotaGuardOn(w);                         // alumno REAL: protege su cupo de avisos
        suppressNagsReal(w);                     // y oculta el onboarding (ya lo hizo)
      }
    }

    function refreshLive() {
      try {
        if (window.JUCUM_SYNC && window.JUCUM_SYNC.refreshProgress) {
          window.JUCUM_SYNC.refreshProgress().catch(function () {});
        }
      } catch (e) {}
    }

    enterRef.current = function (g) {
      var groups = (D() && D().GROUPS) || [];
      var target = g && groups.some(function (x) { return x.id === g; }) ? g : (groups[0] && groups[0].id);
      if (!target) { alert('Este grupo aún no está disponible para previsualizar.'); return; }
      gate(true);
      var reals = realStudents(target);
      var startWho = reals.length ? reals[0].id : 'general';   // arranca en el 1er alumno real (A–Z)
      apply(target, startWho);
      try { document.body.style.overflow = 'hidden'; } catch (e) {}
      setGid(target); setWho(startWho); setActive(true);
      refreshLive();
    };

    React.useEffect(function () {
      window.JUCUM_STUDENT_PREVIEW = {
        open: function (g) { if (!isStaff(readUser())) return; if (enterRef.current) enterRef.current(g); },
        isActive: function () { return active; }
      };
    }, [active]);

    // EN VIVO: refresca el avance al volver a la pestaña y cada 15 s
    React.useEffect(function () {
      if (!active) return;
      var onVis = function () { if (document.visibilityState === 'visible') refreshLive(); };
      var iv = setInterval(function () { if (document.visibilityState === 'visible') refreshLive(); }, 15000);
      window.addEventListener('focus', refreshLive);
      document.addEventListener('visibilitychange', onVis);
      return function () {
        clearInterval(iv);
        window.removeEventListener('focus', refreshLive);
        document.removeEventListener('visibilitychange', onVis);
      };
    }, [active, gid, who]);

    function exit() {
      gate(false); quotaGuardOff();
      removeStudents(); clearProgress(SYN + gid);
      // borra cualquier clave sintética de "visto" del día que dejara un caso de ejemplo
      try {
        var rm = [];
        for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(SYN + gid) >= 0) rm.push(k); }
        rm.forEach(function (k) { localStorage.removeItem(k); });
      } catch (e) {}
      // borra las marcas "visto" que sembramos para limpiar la vista del alumno real
      previewSeededKeys.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
      previewSeededKeys = [];
      try { document.body.style.overflow = ''; } catch (e) {}
      setActive(false); setGid(null); setWho('general');
    }

    function pickGroup(ng) {
      quotaGuardOff(); clearProgress(SYN + gid); removeStudents();
      var reals = realStudents(ng);
      var w = reals.length ? reals[0].id : 'general';
      apply(ng, w); setGid(ng); setWho(w); refreshLive();
    }
    function pickWho(nw) { apply(gid, nw); setWho(nw); refreshLive(); }

    if (!active) return null;

    var d = D() || {}; var groups = d.GROUPS || [];
    var g = groups.find(function (x) { return x.id === gid; }) || {};
    var reals = realStudents(gid);
    var sid = viewedSid(who);
    var realName = (reals.find(function (s) { return s.id === who; }) || {}).fullName;
    var user = { studentId: sid, role: 'student', fullName: isSynthetic(who) ? 'Alumno del grupo' : (realName || 'Alumno') };
    var canRender = (typeof StudentDashboard === 'function') && g && g.id;

    // opciones del selector de alumno: general · alumnos reales (A–Z) · casos de ejemplo
    var opts = [];
    opts.push(h('option', { key: 'general', value: 'general', style: { color: '#1F3A8A' } }, '👁 Vista general del grupo'));
    if (reals.length) {
      opts.push(h('optgroup', { key: 'reales', label: 'Alumnos del grupo (A–Z)' },
        reals.map(function (s) { return h('option', { key: s.id, value: s.id, style: { color: '#1F3A8A' } }, s.fullName || s.username); })
      ));
    }
    opts.push(h('optgroup', { key: 'demos', label: 'Casos de ejemplo (demo)' },
      h('option', { key: 'ex:nuevo', value: 'ex:nuevo', style: { color: '#1F3A8A' } }, '🌱 Recién empieza'),
      h('option', { key: 'ex:poco', value: 'ex:poco', style: { color: '#1F3A8A' } }, '🐢 Practica poco'),
      h('option', { key: 'ex:top', value: 'ex:top', style: { color: '#1F3A8A' } }, '🔥 El que más practica')
    ));

    var stageWrap = device === 'phone'
      ? { maxWidth: 390, margin: '0 auto', padding: '14px 12px 40px' }
      : { maxWidth: 1000, margin: '0 auto', padding: '14px 16px 40px' };

    return h('div', { style: overlayStyle },
      h('div', { style: bannerStyle },
        h('span', { style: { fontWeight: 800, fontFamily: "'Fredoka',sans-serif" } }, '👁 Ver como alumno'),
        h('span', { style: liveStyle }, '● EN VIVO'),
        h('select', { value: gid, onChange: function (e) { pickGroup(e.target.value); }, style: selStyle, title: 'Cambiar de grupo' },
          groups.map(function (gg) { return h('option', { key: gg.id, value: gg.id, style: { color: '#1F3A8A' } }, (levelTag[gg.level] || '📘') + '  ' + gg.name); })
        ),
        h('select', { value: who, onChange: function (e) { pickWho(e.target.value); }, style: selStyle, title: 'Ver como…' }, opts),
        h('span', { style: segWrap },
          h('button', { onClick: function () { setDevice('phone'); }, style: segBtn(device === 'phone') }, '📱 Celular'),
          h('button', { onClick: function () { setDevice('web'); }, style: segBtn(device === 'web') }, '💻 Web')
        ),
        h('span', { style: { flex: 1, minWidth: 6 } }),
        h('button', { onClick: exit, style: exitStyle }, '✕ Salir')
      ),
      h('div', { style: noteStyle }, '🔒 Solo lectura — no marca nada como visto ni gasta los avisos del día del alumno. Sale sin dejar rastro.'),
      h('div', { style: { flex: 1, overflow: 'auto' } },
        h('div', { style: stageWrap, className: device === 'phone' ? 'jucum-prevphone' : undefined },
          h('div', { key: gid + '|' + who + '|' + device },
            canRender
              ? h(StudentDashboard, { user: user, onLogout: exit })
              : h('div', { style: { padding: 40, fontFamily: 'Nunito,sans-serif', color: '#777' } }, 'Cargando la vista del alumno…')
          )
        )
      )
    );
  }

  /* ── montaje ───────────────────────────────────────────────────────── */
  /* Vista 📱 Celular fiel: los @media de la plataforma dependen del ANCHO DEL NAVEGADOR,
   * no del contenedor; al solo angostar la columna se vería el layout de escritorio
   * apretado. Forzamos las rejillas multicolumna a 1 columna dentro de la previsualización. */
  function injectPhoneCss() {
    if (document.getElementById('jucum-prevphone-css')) return;
    var st = document.createElement('style'); st.id = 'jucum-prevphone-css';
    st.textContent = '.jucum-prevphone .two-col{grid-template-columns:1fr!important}.jucum-prevphone .gami-row{grid-template-columns:1fr!important}.jucum-prevphone .kpi-grid{grid-template-columns:repeat(2,1fr)!important}.jucum-prevphone .medal-grid{grid-template-columns:repeat(2,1fr)!important}.jucum-prevphone .welcome{flex-direction:column!important;align-items:flex-start!important}.jucum-prevphone .app-header{height:auto!important;flex-wrap:wrap!important;gap:8px!important;padding:10px 12px!important}';
    document.head.appendChild(st);
  }

  function mount() {
    if (!window.React || !window.ReactDOM || !document.body) { setTimeout(mount, 200); return; }
    if (document.getElementById('jucum-preview-host')) return;
    injectPhoneCss();
    var host = document.createElement('div'); host.id = 'jucum-preview-host'; document.body.appendChild(host);
    try { ReactDOM.createRoot(host).render(React.createElement(JucumPreviewRoot)); }
    catch (e) { console.warn('student-preview:', e && e.message); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
