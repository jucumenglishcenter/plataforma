/* app-update.js · Auto-actualización de la plataforma JUCUM
 * ───────────────────────────────────────────────────────────────────────────
 * Resuelve de raíz el problema de "código viejo en caché" (la tarea/cambio no
 * aparece en la pestaña normal pero sí en incógnito). Funciona en TODA la
 * plataforma porque se carga una sola vez desde index.html.
 *
 * Cómo funciona:
 *  1. Lee la versión con la que se cargó esta sesión (el ?v= de config.js).
 *  2. Cada pocos minutos —y cuando el usuario vuelve a la pestaña— consulta el
 *     index.html del servidor (sin caché) y mira su ?v=.
 *  3. Si el servidor tiene una versión más nueva → muestra un aviso flotante
 *     "🔄 Hay una nueva versión · Actualizar". Al pulsar, recarga limpio.
 *  4. Además deja SIEMPRE un botón discreto "↻" abajo a la izquierda para que
 *     cualquiera fuerce la actualización si algo se ve raro (sin Ctrl+F5).
 *
 * No requiere mantenimiento: basta con que sigas subiendo index.html con un
 * ?v= nuevo en cada despliegue (como ya haces). Sin dependencias.
 */
(function () {
  'use strict';
  if (window.JUCUM_UPDATE) return; // evitar doble carga

  var POLL_MS = 4 * 60 * 1000;     // revisa cada 4 minutos
  var MIN_GAP_MS = 30 * 1000;      // no consultar más seguido que esto
  var lastCheck = 0;
  var running = readRunningVersion();
  var notified = false;

  /* Versión con la que se cargó la página (token ?v= de config.js en el DOM) */
  function readRunningVersion() {
    try {
      var scripts = document.getElementsByTagName('script');
      for (var i = 0; i < scripts.length; i++) {
        var src = scripts[i].getAttribute('src') || '';
        var m = src.match(/config\.js\?v=([^"'&\s]+)/);
        if (m) return m[1];
      }
    } catch (e) {}
    return null;
  }

  /* Versión publicada AHORA en el servidor (lee index.html sin caché) */
  function fetchServerVersion() {
    var url = 'index.html?_cb=' + Date.now();
    return fetch(url, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (html) {
        var m = html.match(/config\.js\?v=([^"'&\s]+)/);
        return m ? m[1] : null;
      })
      .catch(function () { return null; });
  }

  function check(force) {
    var now = Date.now();
    if (!force && now - lastCheck < MIN_GAP_MS) return;
    lastCheck = now;
    if (!running) { running = readRunningVersion(); }
    fetchServerVersion().then(function (server) {
      if (!server) return;
      if (!running) { running = server; return; }
      if (server !== running && !notified) { notified = true; showBanner(); }
    });
  }

  /* Recarga "dura": borra Cache Storage si existe y recarga el index (que es
     no-cache por _headers, así que trae los scripts con el ?v= nuevo). */
  function hardReload() {
    var go = function () {
      try {
        var u = new URL(window.location.href);
        u.searchParams.set('_u', Date.now().toString());
        window.location.replace(u.toString());
      } catch (e) { window.location.reload(); }
    };
    try {
      if (window.caches && caches.keys) {
        caches.keys().then(function (ks) {
          return Promise.all(ks.map(function (k) { return caches.delete(k); }));
        }).then(go, go);
        setTimeout(go, 1200); // por si caches tarda
      } else { go(); }
    } catch (e) { go(); }
  }

  /* ── UI ──────────────────────────────────────────────────────────────── */
  function el(tag, css, html) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function showBanner() {
    if (document.getElementById('jucum-update-banner')) return;
    var wrap = el('div', [
      'position:fixed', 'left:50%', 'bottom:22px', 'transform:translateX(-50%)',
      'z-index:2147483640', 'display:flex', 'align-items:center', 'gap:14px',
      'background:linear-gradient(135deg,#1F3A8A,#2E5BB8)', 'color:#fff',
      'padding:12px 16px 12px 18px', 'border-radius:14px',
      'box-shadow:0 10px 34px rgba(0,0,0,.30)', "font-family:'Nunito',system-ui,sans-serif",
      'font-size:14px', 'font-weight:700', 'max-width:92vw', 'animation:jucumUpIn .35s ease'
    ].join(';'));
    wrap.id = 'jucum-update-banner';
    wrap.appendChild(el('span', 'font-size:18px', '🔄'));
    wrap.appendChild(el('span', 'line-height:1.35',
      'Hay una <b>nueva versión</b> de la plataforma.<br><span style="opacity:.85;font-weight:600;font-size:12.5px">Actualiza para ver los últimos cambios.</span>'));
    var btn = el('button', [
      'border:none', 'cursor:pointer', "font-family:'Fredoka','Nunito',sans-serif",
      'font-weight:600', 'font-size:13.5px', 'color:#1F3A8A', 'background:#fff',
      'border-radius:999px', 'padding:9px 17px', 'white-space:nowrap', 'box-shadow:0 2px 8px rgba(0,0,0,.18)'
    ].join(';'), 'Actualizar ahora');
    btn.onclick = hardReload;
    wrap.appendChild(btn);
    var x = el('button', [
      'border:none', 'cursor:pointer', 'color:#fff', 'background:rgba(255,255,255,.16)',
      'border-radius:8px', 'width:28px', 'height:28px', 'font-size:14px', 'font-weight:800'
    ].join(';'), '✕');
    x.title = 'Recordar más tarde';
    x.onclick = function () { wrap.remove(); notified = false; };
    wrap.appendChild(x);
    document.body.appendChild(wrap);
  }

  /* Botón discreto siempre disponible para forzar actualización a mano. */
  function mountManualButton() {
    if (document.getElementById('jucum-update-fab')) return;
    var b = el('button', [
      'position:fixed', 'left:14px', 'bottom:14px', 'z-index:2147483630',
      'width:34px', 'height:34px', 'border-radius:50%', 'border:none', 'cursor:pointer',
      'background:rgba(31,58,138,.16)', 'color:#1F3A8A', 'font-size:16px', 'line-height:1',
      'box-shadow:0 1px 4px rgba(0,0,0,.12)', 'transition:background .15s,transform .15s',
      'display:flex', 'align-items:center', 'justify-content:center', 'padding:0'
    ].join(';'), '↻');
    b.id = 'jucum-update-fab';
    b.title = 'Actualizar la plataforma (buscar la última versión)';
    b.setAttribute('aria-label', 'Actualizar la plataforma');
    b.onmouseenter = function () { b.style.background = 'rgba(31,58,138,.30)'; b.style.transform = 'scale(1.08)'; };
    b.onmouseleave = function () { b.style.background = 'rgba(31,58,138,.16)'; b.style.transform = 'none'; };
    b.onclick = function () {
      b.style.pointerEvents = 'none'; b.textContent = '⏳';
      check(true);
      setTimeout(function () {
        if (notified) { b.textContent = '↻'; b.style.pointerEvents = ''; }
        else { hardReload(); } // sin versión nueva: recarga limpio igual
      }, 900);
    };
    document.body.appendChild(b);
  }

  function injectKeyframes() {
    if (document.getElementById('jucum-update-kf')) return;
    var s = document.createElement('style');
    s.id = 'jucum-update-kf';
    s.textContent = '@keyframes jucumUpIn{from{opacity:0;transform:translateX(-50%) translateY(14px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
    document.head.appendChild(s);
  }

  /* ── arranque ────────────────────────────────────────────────────────── */
  function start() {
    injectKeyframes();
    mountManualButton();
    setTimeout(function () { check(true); }, 4000);     // primer chequeo tras cargar
    setInterval(function () { check(false); }, POLL_MS);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') check(false);
    });
    window.addEventListener('focus', function () { check(false); });
  }

  window.JUCUM_UPDATE = { check: function () { check(true); }, reload: hardReload, running: function () { return running; } };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
