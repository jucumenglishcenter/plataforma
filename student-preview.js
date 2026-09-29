/* student-preview.js · "👁 Ver como alumno (en vivo)" — v3 (29-sep-2026)
 * ───────────────────────────────────────────────────────────────────────────
 * Se abre desde el DETALLE DE UN GRUPO (botón "👁 Ver como alumno") →
 * window.JUCUM_STUDENT_PREVIEW.open(groupId).
 *
 * v3 · PANTALLA LITERAL DEL ALUMNO: antes se dibujaba StudentDashboard dentro de
 * una columna del panel del profesor → los @media, la barra lateral, el menú ☰ y
 * el “Mi recorrido” de egresados/cerrados NO salían como en el equipo del alumno
 * (se veía “el panel normal”). Ahora la plataforma COMPLETA corre dentro de un
 * <iframe> del tamaño real (📱 390×844 · 💻 ancho completo) con
 * ?jucum_pv=<alumno>&jucum_pvg=<grupo>: App.comp.js enruta como si ese alumno
 * hubiera iniciado sesión (JUCUM_PV_EMBED.user()) → misma rueda, mismos avisos,
 * misma pantalla de egresado. Se puede navegar dentro como él.
 *
 * SOLO LECTURA (dentro del iframe): se anulan las escrituras a la nube (push*,
 * mark*, *Db, insert/update/upsert/remove, last_seen), las notificaciones, y el
 * cupo de avisos “visto/descartado” del alumno. EN VIVO: relee el avance cada 15 s.
 * Solo profesor / dev / admin. “✕ Salir” limpia todo rastro local.
 *
 * Carga como <script src="student-preview.js"> ANTES de fast-loader (App.comp.js).
 */
(function () {
  'use strict';

  var SYN = 'preview-';
  var PROG_KEY = 'jucum_student_progress_v1';
  var syncSaved = null, sbSaved = null, notifSaved = null, paySaved = null, surveySaved = null, dropSaved = null;
  var origSetItem = null, guardSid = null;

  function readUser() { try { return JSON.parse(localStorage.getItem('jucum_user') || 'null'); } catch (e) { return null; } }
  function isStaff(u) { return !!(u && (u.role === 'teacher' || u.role === 'dev' || u.role === 'admin')); }
  function D() { return window.JUCUM_DATA; }
  function isSynthetic(w) { return w === 'general' || String(w).indexOf('ex:') === 0; }

  /* ¿Esta página es la vista embebida (iframe) de la previsualización? */
  var PV = (function () {
    try {
      if (window.parent === window) return null;
      var q = new URLSearchParams(location.search);
      var w = q.get('jucum_pv'); if (!w) return null;
      return { who: w, gid: q.get('jucum_pvg') || '' };
    } catch (e) { return null; }
  })();

  function realStudents(gid) {
    var d = D(); if (!d || !d.STUDENTS) return [];
    return d.STUDENTS
      .filter(function (s) { return s && s.group === gid && !s._preview; })
      .slice()
      .sort(function (a, b) {
        return String(a.fullName || a.username || '').localeCompare(String(b.fullName || b.username || ''), 'es', { sensitivity: 'base' });
      });
  }

  /* ── alumno sintético (vista general / casos de ejemplo) ── */
  function injectStudent(gid) {
    var d = D(); if (!d) return null;
    var g = (d.GROUPS || []).find(function (x) { return x.id === gid; });
    if (!g) return null;
    var ex = d.STUDENTS.find(function (s) { return s.id === SYN + gid; });
    if (ex) return ex;
    var s = { id: SYN + gid, username: 'demo', fullName: 'Alumno del grupo', level: g.level, group: gid, starred: false,
      completedModules: 0, avgScore: 0, streak: 0, lastActiveDays: 0, totalMinutes: 0, achievements: [], _preview: true };
    d.STUDENTS.push(s);
    return s;
  }
  function writeProgress(sid, obj) {
    try { var all = JSON.parse(localStorage.getItem(PROG_KEY) || '{}'); all[sid] = obj; localStorage.setItem(PROG_KEY, JSON.stringify(all)); } catch (e) {}
  }
  function clearProgress(sid) {
    try { var all = JSON.parse(localStorage.getItem(PROG_KEY) || '{}'); if (all[sid] != null) { delete all[sid]; localStorage.setItem(PROG_KEY, JSON.stringify(all)); } } catch (e) {}
  }

  function seedScenario(gid, scenario) {
    var d = D(); if (!d) return;
    var g = (d.GROUPS || []).find(function (x) { return x.id === gid; }); if (!g) return;
    var sid = SYN + gid;
    var stu = d.STUDENTS.find(function (s) { return s.id === sid; }); if (!stu) return;
    var settings = d.getGroupSettings ? d.getGroupSettings(gid) : {};
    var mods = (d.MODULE_CATALOG && d.MODULE_CATALOG[g.level]) || [];
    var activeIds = (settings.activeModuleIds && settings.activeModuleIds.length) ? settings.activeModuleIds : (settings.activeModuleId ? [settings.activeModuleId] : []);
    var clsId = d.getClassModuleId ? d.getClassModuleId(gid) : null;
    var mod = mods.find(function (m) { return m.id === clsId; }) || mods.find(function (m) { return activeIds.indexOf(m.id) >= 0; }) || mods[0];
    var acts = (mod && mod.activities) || [];
    var target = (settings.dailyTargetMin || 15);
    var now = Date.now();
    function iso(daysAgo) { return new Date(now - daysAgo * 86400000).toISOString().slice(0, 19); }
    function day(daysAgo) { return new Date(now - 5 * 3600000 - daysAgo * 86400000).toISOString().slice(0, 10); } // día Perú
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
    } else {
      acts.forEach(function (a, i) {
        if (i >= acts.length - 1) return;
        var part = (a.type === 'story' || a.type === 'summary' || a.type === 'quizlet');
        completed[mod.id + ':' + a.id] = { score: part ? null : (90 + (i % 7)), minutes: 6 + (i % 4), date: iso(Math.max(0, 4 - Math.floor(i / 3))) };
      });
      Object.assign(stu, { streak: 14, totalMinutes: 540, avgScore: 94, completedModules: 1, lastActiveDays: 0, achievements: ['first', 'streak', 'minutes', 'modules', 'literal'] });
      writeProgress(sid, { completed: completed, todayMinutes: target + 6, lastDay: day(0) });
    }
  }

  /* ── candado de cupos del alumno REAL (visto/descartado/onboarding) ── */
  function isQuotaKey(k, sid) {
    return typeof k === 'string' && !!sid && k.indexOf(sid) >= 0 &&
      /(onboarded|taskcartel|cartel|vocab_dismiss|survey|dropexp|reminder|seen|dismiss|badges_seen|notif_seen|touch_)/i.test(k);
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
  function rawSet(k, v) { try { (origSetItem || Storage.prototype.setItem).call(localStorage, k, v); } catch (e) {} }

  /* ── candado de escritura en la nube + blindaje de pagos (solo dentro del iframe) ── */
  function gateOn() {
    window.JUCUM_PREVIEW = true;
    if (window.JUCUM_SYNC && !syncSaved) {
      syncSaved = window.JUCUM_SYNC;
      var w = {}; for (var k in syncSaved) { w[k] = (typeof syncSaved[k] === 'function' && (/^push/i.test(k) || /^mark/i.test(k) || /Db$/.test(k))) ? function () {} : syncSaved[k]; }
      window.JUCUM_SYNC = w;
    }
    if (window.JUCUM_NOTIF && !notifSaved) {
      notifSaved = window.JUCUM_NOTIF;
      var n = Object.assign({}, notifSaved);
      ['pushNotif', 'markRead', 'markAllRead', 'clearNotifs'].forEach(function (m) { if (typeof n[m] === 'function') n[m] = function () {}; });
      window.JUCUM_NOTIF = n;
    }
    if (window.JUCUM_SB && !sbSaved) {
      sbSaved = window.JUCUM_SB; var sb = Object.assign({}, sbSaved);
      ['insert', 'update', 'remove', 'upsert'].forEach(function (m) { if (typeof sb[m] === 'function') sb[m] = function () { return Promise.resolve(null); }; });
      sb.touchLastSeen = function () {};
      /* Candado GENERAL: cualquier módulo que escriba directo con getClient() (encuesta de cierre,
       * notificaciones por user_id, daily_sessions…) recibe un cliente de SOLO LECTURA. */
      var origGC = sbSaved.getClient;
      if (typeof origGC === 'function') {
        var fake = new Proxy(function () {}, {
          get: function (_, p) { if (p === 'then') return function (res, rej) { return Promise.resolve({ data: null, error: null }).then(res, rej); }; return function () { return fake; }; },
          apply: function () { return fake; }
        });
        var WR = { insert: 1, update: 1, upsert: 1, 'delete': 1 };
        sb.getClient = function () {
          var c = origGC.apply(sbSaved, arguments); if (!c) return c;
          return new Proxy(c, { get: function (t, p) {
            if (p === 'from') return function (tbl) {
              var q = t.from(tbl);
              return new Proxy(q, { get: function (qt, qp) { if (WR[qp]) return function () { return fake; }; var v = qt[qp]; return typeof v === 'function' ? v.bind(qt) : v; } });
            };
            var v = t[p]; return typeof v === 'function' ? v.bind(t) : v;
          } });
        };
      }
      window.JUCUM_SB = sb;
    }
    /* Egresados / avance cerrado: la encuesta y los cambios de estado no se guardan desde el visor */
    if (window.JUCUM_GRAD && !window.JUCUM_GRAD._pv) {
      var G = window.JUCUM_GRAD;
      G.saveSurvey = function (sid, data) { return Promise.resolve({ ok: true, error: '', row: Object.assign({ id: 'ex-' + sid, _preview: true }, data || {}) }); };
      ['closeStudent', 'reopenStudent', 'finishGroup', 'reopenGroup', 'setLeadStatus'].forEach(function (m) { if (typeof G[m] === 'function') G[m] = function () { return Promise.resolve({ ok: false, error: 'Vista de solo lectura' }); }; });
      G._pv = true;
    }
    if (window.JUCUM_PAY && !paySaved) {
      paySaved = window.JUCUM_PAY; var p = Object.assign({}, paySaved);
      p.getAccountStatus = function () { return { state: 'al_dia', blocked: false, daysLeft: null, payDay: 5 }; };
      if (typeof p.pendingConfirmCelebration === 'function') p.pendingConfirmCelebration = function () { return null; };
      window.JUCUM_PAY = p;
    }
    if (window.JUCUM_SURVEY && !surveySaved) {
      surveySaved = window.JUCUM_SURVEY; var sv = Object.assign({}, surveySaved);
      sv.isSurveyDue = function () { return false; };
      window.JUCUM_SURVEY = sv;
    }
    if (window.JUCUM_DATA && !dropSaved) {
      dropSaved = true;
      window.JUCUM_DATA.getDropExplanation = function () { return null; };
      window.JUCUM_DATA.ackDropExplanation = function () {};
    }
  }

  /* ═════════ MODO EMBEBIDO (dentro del iframe): App.comp.js pregunta aquí ═════════ */
  var pvReady = false, pvUser = null, pvTimer = null;
  function refreshLive() {
    try { if (syncSaved && syncSaved.refreshProgress) syncSaved.refreshProgress().catch(function () {}); } catch (e) {}
  }
  window.JUCUM_PV_EMBED = PV ? {
    who: PV.who, gid: PV.gid,
    /* Devuelve el “usuario alumno” a enrutar, o null si no corresponde (sin sesión de staff). */
    user: function () {
      if (!isStaff(readUser())) return null;
      var d = D(); if (!d || !d.GROUPS) return null;
      var gid = PV.gid, w = PV.who;
      if (!pvReady) {
        pvReady = true;
        gateOn();
        if (isSynthetic(w)) {
          clearProgress(SYN + gid);
          injectStudent(gid);
          if (w.indexOf('ex:') === 0) seedScenario(gid, w.slice(3));
          else writeProgress(SYN + gid, { completed: {}, todayMinutes: 0, lastDay: null });
          rawSet('jucum_onboarded_' + SYN + gid, '1');
        } else {
          rawSet('jucum_onboarded_' + w, '1');   // ya hizo su onboarding: que no salte aquí
          quotaGuardOn(w);
        }
        refreshLive();
        pvTimer = setInterval(function () { if (document.visibilityState === 'visible') refreshLive(); }, 15000);
      }
      if (isSynthetic(w)) injectStudent(gid);    // el roster se relee cada 5 min: re-inyectar si se perdió
      var sid = isSynthetic(w) ? SYN + gid : w;
      var s = (d.STUDENTS || []).find(function (x) { return x.id === sid; });
      if (!s) return null;
      if (!pvUser || pvUser.studentId !== sid) pvUser = { studentId: sid, role: 'student', fullName: s.fullName || 'Alumno', username: s.username, level: s.level, groupId: s.group, _preview: true };
      return pvUser;
    },
    exit: function () { try { window.parent.postMessage({ jucumPv: 'exit' }, location.origin); } catch (e) {} }
  } : null;
  if (PV) return;   // dentro del iframe no se monta el visor

  /* ═════════ VISOR (panel del profesor) ═════════ */
  var overlayStyle = { position: 'fixed', inset: 0, zIndex: 2147483601, display: 'flex', flexDirection: 'column', background: '#DCE3EE' };
  var bannerStyle = { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', padding: '9px 16px', color: '#fff', background: 'linear-gradient(135deg,#1F3A8A,#2E5BB8)', fontFamily: "'Nunito',sans-serif", fontSize: 13.5, boxShadow: '0 2px 12px rgba(0,0,0,0.18)' };
  var liveStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 800, color: '#0E4B16', background: '#9FF3B6', padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap' };
  var selStyle = { fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 13, padding: '6px 10px', borderRadius: 10, border: '2px solid rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.16)', color: '#fff', cursor: 'pointer', maxWidth: 240 };
  var exitStyle = { border: 'none', cursor: 'pointer', fontFamily: "'Fredoka','Nunito',sans-serif", fontWeight: 600, fontSize: 13, color: '#1F3A8A', background: '#fff', borderRadius: 999, padding: '8px 15px', whiteSpace: 'nowrap' };
  var noteStyle = { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px', background: '#DCE6FA', color: '#22335c', fontSize: 12, fontWeight: 700, borderBottom: '1px solid #C2D2F0', lineHeight: 1.45 };
  var segWrap = { display: 'inline-flex', gap: 4, background: 'rgba(255,255,255,0.14)', padding: 3, borderRadius: 999 };
  function segBtn(on) { return { border: 'none', cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 12.5, padding: '6px 12px', borderRadius: 999, whiteSpace: 'nowrap', color: on ? '#1F3A8A' : '#fff', background: on ? '#fff' : 'transparent' }; }
  var levelTag = { 'pre-a1': '💛 Pre-A1', 'a1': '💙 A1', 'a2': '💚 A2' };

  function JucumPreviewRoot() {
    var h = React.createElement;
    var sa = React.useState(false); var active = sa[0], setActive = sa[1];
    var sg = React.useState(null); var gid = sg[0], setGid = sg[1];
    var sw = React.useState('general'); var who = sw[0], setWho = sw[1];
    var sd = React.useState('phone'); var device = sd[0], setDevice = sd[1];
    var sl = React.useState(true); var loading = sl[0], setLoading = sl[1];
    var sr = React.useState(0); var reload = sr[0], setReload = sr[1];
    var viewed = React.useRef({});
    var enterRef = React.useRef(null);

    enterRef.current = function (g) {
      var groups = (D() && D().GROUPS) || [];
      var target = g && groups.some(function (x) { return x.id === g; }) ? g : (groups[0] && groups[0].id);
      if (!target) { alert('Este grupo aún no está disponible para previsualizar.'); return; }
      var reals = realStudents(target);
      var startWho = reals.length ? reals[0].id : 'general';
      try { document.body.style.overflow = 'hidden'; } catch (e) {}
      setGid(target); setWho(startWho); setLoading(true); setActive(true);
    };

    function cleanup() {
      try {
        var rm = [];
        for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(SYN) >= 0) rm.push(k); }
        rm.forEach(function (k) { localStorage.removeItem(k); });
        Object.keys(viewed.current).forEach(function (sid) { localStorage.removeItem('jucum_onboarded_' + sid); });
        var all = JSON.parse(localStorage.getItem(PROG_KEY) || '{}'); var hit = false;
        Object.keys(all).forEach(function (k) { if (k.indexOf(SYN) === 0) { delete all[k]; hit = true; } });
        if (hit) localStorage.setItem(PROG_KEY, JSON.stringify(all));
      } catch (e) {}
      viewed.current = {};
    }
    function exit() {
      cleanup();
      try { document.body.style.overflow = ''; } catch (e) {}
      setActive(false); setGid(null); setWho('general');
    }
    var exitRef = React.useRef(exit); exitRef.current = exit;

    React.useEffect(function () {
      window.JUCUM_STUDENT_PREVIEW = {
        open: function (g) { if (!isStaff(readUser())) return; if (enterRef.current) enterRef.current(g); },
        isActive: function () { return active; }
      };
    }, [active]);
    React.useEffect(function () {
      var onMsg = function (e) { if (e.origin === location.origin && e.data && e.data.jucumPv === 'exit') exitRef.current(); };
      window.addEventListener('message', onMsg);
      return function () { window.removeEventListener('message', onMsg); };
    }, []);

    if (!active) return null;

    var d = D() || {}; var groups = d.GROUPS || [];
    var reals = realStudents(gid);
    if (!isSynthetic(who)) viewed.current[who] = 1;

    var opts = [];
    opts.push(h('option', { key: 'general', value: 'general', style: { color: '#1F3A8A' } }, '👁 Vista general del grupo'));
    if (reals.length) opts.push(h('optgroup', { key: 'reales', label: 'Alumnos del grupo (A–Z)' },
      reals.map(function (s) { return h('option', { key: s.id, value: s.id, style: { color: '#1F3A8A' } }, (s.closedAt ? '⏸ ' : '') + (s.fullName || s.username)); })));
    opts.push(h('optgroup', { key: 'demos', label: 'Casos de ejemplo (demo)' },
      h('option', { key: 'ex:nuevo', value: 'ex:nuevo', style: { color: '#1F3A8A' } }, '🌱 Recién empieza'),
      h('option', { key: 'ex:poco', value: 'ex:poco', style: { color: '#1F3A8A' } }, '🐢 Practica poco'),
      h('option', { key: 'ex:top', value: 'ex:top', style: { color: '#1F3A8A' } }, '🔥 El que más practica')));

    var src = location.pathname + '?jucum_pv=' + encodeURIComponent(who) + '&jucum_pvg=' + encodeURIComponent(gid) + '&r=' + reload;
    var phone = device === 'phone';
    var frameBox = phone
      ? { width: 390, height: 'min(844px, calc(100% - 28px))', borderRadius: 38, border: '11px solid #1E2433', boxShadow: '0 14px 40px rgba(0,0,0,.3)', overflow: 'hidden', background: '#fff', position: 'relative', flex: 'none' }
      : { width: '100%', height: '100%', borderRadius: 10, overflow: 'hidden', background: '#fff', boxShadow: '0 8px 26px rgba(0,0,0,.16)', position: 'relative' };

    return h('div', { style: overlayStyle },
      h('div', { style: bannerStyle },
        h('span', { style: { fontWeight: 800, fontFamily: "'Fredoka',sans-serif" } }, '👁 Ver como alumno'),
        h('span', { style: liveStyle }, '● EN VIVO'),
        h('select', { value: gid, onChange: function (e) { var ng = e.target.value; var r = realStudents(ng); setGid(ng); setWho(r.length ? r[0].id : 'general'); setLoading(true); }, style: selStyle, title: 'Cambiar de grupo' },
          groups.map(function (gg) { return h('option', { key: gg.id, value: gg.id, style: { color: '#1F3A8A' } }, (levelTag[gg.level] || '📘') + '  ' + gg.name); })),
        h('select', { value: who, onChange: function (e) { setWho(e.target.value); setLoading(true); }, style: selStyle, title: 'Ver como…' }, opts),
        h('span', { style: segWrap },
          h('button', { onClick: function () { if (!phone) { setDevice('phone'); setLoading(true); } }, style: segBtn(phone) }, '📱 Celular'),
          h('button', { onClick: function () { if (phone) { setDevice('web'); setLoading(true); } }, style: segBtn(!phone) }, '💻 Web')),
        h('button', { onClick: function () { setReload(function (x) { return x + 1; }); setLoading(true); }, style: segBtn(false), title: 'Volver a cargar su pantalla' }, '↻'),
        h('span', { style: { flex: 1, minWidth: 6 } }),
        h('button', { onClick: exit, style: exitStyle }, '✕ Salir')),
      h('div', { style: noteStyle }, '🔒 Es SU pantalla real (mismo tamaño, menú y avisos; si tiene el avance cerrado o egresó, ves su “Mi recorrido”). Solo lectura: no guarda nada — ni encuesta, ni avisos vistos, ni conexión. Evita abrir materiales: se abrirían a su nombre.'),
      h('div', { style: { flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: phone ? '14px 12px' : '12px 14px' } },
        h('div', { style: frameBox },
          loading && h('div', { style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F7FF', fontFamily: 'Nunito,sans-serif', fontWeight: 800, color: '#5A6B86', fontSize: 14, zIndex: 1 } }, 'Abriendo la pantalla del alumno…'),
          h('iframe', { key: src + '|' + device, src: src, title: 'Pantalla del alumno', onLoad: function () { setTimeout(function () { setLoading(false); }, 400); }, style: { width: '100%', height: '100%', border: 0, display: 'block' } }))));
  }

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
