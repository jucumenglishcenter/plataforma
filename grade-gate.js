/* ════════════════════════════════════════════════════════════════════
   ⏳ JUCUM · Nota en espera (grade-gate)
   ────────────────────────────────────────────────────────────────────
   POR QUÉ EXISTE (12-ago-2026)
   El conector congela la NOTA 30 min en el mismo ejercicio (regla
   anti-memorización, decisión pedagógica de la usuaria: se queda). El
   problema no era la regla, era el SILENCIO: el alumno repetía, sacaba
   100% y su nota seguía en 53% sin que nadie se lo dijera — y en el
   panel se veía igual que "no lo hizo".

   Ahora, al tocar el material en la plataforma, si su nota está en
   espera sale un aviso con la CUENTA REGRESIVA y un botón
   "Practicar de todas formas" (nunca se le impide practicar).

   CÓMO SABE LA PLATAFORMA CUÁNTO FALTA
   El ancla de la ventana vive en el localStorage del MATERIAL
   (github.io) y la plataforma vive en otro dominio: no puede leerlo.
   Por eso jucum-connect.js espeja el ancla en la nube como una fila
   activity_parts con part = 95 (banda reservada ≥90 que las vistas de
   historias/audios ya filtran). Aquí solo se LEE.

   Falla siempre ABIERTO: sin nube, sin datos o ante cualquier error se
   abre el material con normalidad.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  if (window.JUCUM_GATE) return;

  var WINDOW_MS = 30 * 60 * 1000;      // debe coincidir con GRADE_WINDOW_MS del conector
  var ANCHOR_PART = 95;
  var CACHE_KEY = 'jucum_gate_v1';
  var anchors = {};                     // 'mod|act' → { ts, score }
  var loadedFor = null;

  function SB() { try { return window.JUCUM_SB && window.JUCUM_SB.getClient(); } catch (e) { return null; } }
  function key(mod, act) { return String(mod) + '|' + String(act); }
  function save() {
    try {
      var d = JSON.stringify({ uid: loadedFor, a: anchors });
      if (window.JUCUM_STORE) window.JUCUM_STORE.set(CACHE_KEY, d); else localStorage.setItem(CACHE_KEY, d);
    } catch (e) {}
  }
  function restore(uid) {
    try {
      var d = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (d && d.uid === uid && d.a) anchors = d.a;
    } catch (e) {}
  }
  function prune() {
    var now = Date.now();
    Object.keys(anchors).forEach(function (k) { if (!anchors[k] || now - anchors[k].ts > WINDOW_MS) delete anchors[k]; });
  }

  /* Trae las anclas vivas del alumno (una consulta liviana). */
  function load(studentId) {
    if (!studentId) return Promise.resolve();
    if (loadedFor !== studentId) { anchors = {}; loadedFor = studentId; }
    var sb = SB();
    if (!sb) { restore(studentId); prune(); return Promise.resolve(); }
    var desde = new Date(Date.now() - WINDOW_MS).toISOString();
    return sb.from('activity_parts').select('module_id,activity_id,score,completed_at')
      .eq('user_id', studentId).eq('part', ANCHOR_PART).gte('completed_at', desde)
      .then(function (r) {
        if (r && r.error) return;
        anchors = {};
        ((r && r.data) || []).forEach(function (x) {
          var ts = Date.parse(x.completed_at || '');
          if (ts) anchors[key(x.module_id, x.activity_id)] = { ts: ts, score: x.score };
        });
        prune(); save();
      }, function () {});
  }

  function leftMs(mod, act) {
    prune();
    var a = anchors[key(mod, act)];
    if (!a || !a.ts) return 0;
    return Math.max(0, a.ts + WINDOW_MS - Date.now());
  }
  function infoFor(href) {
    try {
      var u = new URL(href, location.href);
      var p = u.searchParams;
      if (p.get('jucum_exam') === '1') return null;            // exámenes nunca se avisan
      var mod = p.get('jucum_mod'), act = p.get('jucum_act');
      if (!mod || !act) return null;
      var left = leftMs(mod, act);
      if (left <= 0) return null;
      return { left: left, mod: mod, act: act, score: (anchors[key(mod, act)] || {}).score };
    } catch (e) { return null; }
  }
  function fmt(ms) {
    var s = Math.max(0, Math.ceil(ms / 1000));
    return String(Math.floor(s / 60)) + ':' + String(s % 60).padStart(2, '0');
  }

  /* ── El aviso (DOM plano: lo usan varias pantallas y también fuera de React) ── */
  var openEl = null;
  function close() { if (openEl && openEl.parentNode) openEl.parentNode.removeChild(openEl); openEl = null; }

  function show(href, info) {
    close();
    var wrap = document.createElement('div');
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-label', 'Tu nota está en espera');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(18,22,32,.52);display:flex;align-items:center;justify-content:center;padding:18px;animation:jgFade .18s ease';
    var card = document.createElement('div');
    card.style.cssText = 'background:#fff;border-radius:20px;max-width:410px;width:100%;padding:20px 22px 18px;box-shadow:0 18px 50px rgba(0,0,0,.28);text-align:center;font-family:inherit;max-height:94vh;overflow:auto';
    var nota = (info.score == null ? null : Math.round(info.score));

    card.innerHTML =
      '<div style="font-size:34px;line-height:1">⏳</div>' +
      '<h3 style="margin:6px 0 6px;font-size:19px;color:#1B3B6F;font-weight:800">Tu nota está en espera</h3>' +
      '<p style="margin:0 0 12px;font-size:13.5px;line-height:1.55;color:#4A5568">' +
        (nota == null ? 'Hace un rato registraste una nota en este mismo ejercicio.'
                      : 'Hace un rato registraste <b>' + nota + '%</b> en este mismo ejercicio.') +
        ' Para que tu nota muestre lo que <b>aprendiste</b> y no lo que acabas de memorizar, la nota nueva se puede guardar recién cuando termine esta cuenta:' +
      '</p>' +
      '<div id="jgBox" style="background:linear-gradient(135deg,#E4EDFB,#F2F7FF);border:2px solid #C7DBF5;border-radius:16px;padding:12px;margin-bottom:12px">' +
        '<div id="jgTime" style="font-size:36px;font-weight:800;color:#1B3B6F;letter-spacing:.02em;font-variant-numeric:tabular-nums">' + fmt(info.left) + '</div>' +
        '<div id="jgLbl" style="font-size:11.5px;font-weight:700;color:#3C6AA8;text-transform:uppercase;letter-spacing:.05em">minutos para tu nota nueva</div>' +
      '</div>' +
      '<div style="background:#F2FAF3;border:1.5px solid #BFE3C3;border-radius:14px;padding:10px 12px;margin-bottom:13px;font-size:12.5px;line-height:1.5;color:#2E5B33;text-align:left">' +
        '<b>Igual puedes practicar ahora</b> 💪 Tu tiempo del día, tu racha y tu experiencia se suman normalmente. Lo único que espera es la nota.' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:9px">' +
        '<button id="jgGo" style="font-family:inherit;font-size:14.5px;font-weight:800;color:#fff;background:#1B3B6F;border:none;border-radius:14px;padding:12px 18px;cursor:pointer">Practicar de todas formas</button>' +
        '<button id="jgNo" style="font-family:inherit;font-size:13.5px;font-weight:700;color:#5A6B85;background:#fff;border:1.5px solid #DCE3EC;border-radius:14px;padding:10px 18px;cursor:pointer">Vuelvo después</button>' +
      '</div>' +
      '<div id="jgTip" style="margin-top:11px;font-size:11.5px;color:#8A93A3;line-height:1.45">💡 Mientras tanto puedes hacer otra actividad y volver a esta cuando termine la cuenta.</div>';

    wrap.appendChild(card);
    document.body.appendChild(wrap);
    openEl = wrap;

    var t = setInterval(function () {
      var left = leftMs(info.mod, info.act);
      var el = document.getElementById('jgTime');
      if (!el) { clearInterval(t); return; }
      el.textContent = fmt(left);
      if (left <= 0) {
        clearInterval(t);
        var box = document.getElementById('jgBox'), lbl = document.getElementById('jgLbl'), tip = document.getElementById('jgTip');
        if (box) box.style.cssText = 'background:linear-gradient(135deg,#E8F6E9,#F3FBF4);border:2px solid #A8D5AC;border-radius:16px;padding:14px 12px;margin-bottom:14px';
        el.textContent = '¡Ya puedes!';
        el.style.color = '#2E7D32'; el.style.fontSize = '26px';
        if (lbl) { lbl.textContent = 'tu nota se registrará normalmente'; lbl.style.color = '#3E7A43'; }
        if (tip) tip.textContent = '';
        var go = document.getElementById('jgGo');
        if (go) go.textContent = 'Practicar ahora';
      }
    }, 1000);

    function done() { clearInterval(t); close(); }
    card.querySelector('#jgGo').onclick = function () { done(); location.href = href; };
    card.querySelector('#jgNo').onclick = done;
    wrap.onclick = function (e) { if (e.target === wrap) done(); };
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { done(); document.removeEventListener('keydown', esc); }
    });
  }

  /* Abrir un material pasando por el aviso. Úsalo en vez de location.href. */
  function go(href) {
    if (!href) return;
    var info = null;
    try { info = infoFor(href); } catch (e) { info = null; }
    if (!info) { location.href = href; return; }
    show(href, info);
  }

  /* Los enlaces <a> del panel se interceptan solos (sin tocar cada pantalla). */
  document.addEventListener('click', function (ev) {
    try {
      var a = ev.target && ev.target.closest && ev.target.closest('a[href]');
      if (!a || a.target === '_blank') return;
      var href = a.getAttribute('href') || '';
      if (href.indexOf('jucum_uid=') < 0) return;
      var info = infoFor(a.href);
      if (!info) return;
      ev.preventDefault(); ev.stopPropagation();
      show(a.href, info);
    } catch (e) {}
  }, true);

  try {
    var st = document.createElement('style');
    st.textContent = '@keyframes jgFade{from{opacity:0}to{opacity:1}}';
    document.head.appendChild(st);
  } catch (e) {}

  window.JUCUM_GATE = { load: load, leftMs: leftMs, go: go, fmt: fmt, infoFor: infoFor, WINDOW_MS: WINDOW_MS };
})();
