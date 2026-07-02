/* fast-loader.js · Carga rápida de la plataforma JUCUM
 * ───────────────────────────────────────────────────────────────────────────
 * Antes: cada visita descargaba Babel (~2 MB) y compilaba ~40 archivos React
 * en el navegador → ese era el tiempo de espera largo.
 * Ahora: la PRIMERA visita compila una sola vez y guarda el resultado ya
 * compilado en el navegador (localStorage). Las siguientes visitas saltan
 * Babel por completo: ejecutan directo el código cacheado.
 * Cuando subimos una versión nueva (?v= cambia), se recompila 1 vez y listo.
 * Si algo falla (caché lleno, red, etc.) cae al modo clásico con Babel:
 * la página NUNCA queda en blanco por culpa del loader.
 */
(function () {
  'use strict';
  var LIST = window.__JUCUM_APP_SCRIPTS || [];
  var PREFIX = 'jucum_jsc1_';
  var BABEL_SRC = 'https://unpkg.com/@babel/standalone@7.29.0/babel.min.js';
  var BABEL_SRI = 'sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y';

  /* Splash mínimo mientras arranca (se quita solo) */
  var splash = document.createElement('div');
  splash.id = 'jec-boot';
  splash.innerHTML = '<div style="text-align:center;"><div style="font-size:44px;">🧠</div><div style="margin-top:10px;font:800 14px system-ui,sans-serif;color:#1F3A8A;">Cargando JUCUM English Center…</div></div>';
  splash.style.cssText = 'position:fixed;inset:0;background:#FBFAF7;z-index:99990;display:flex;align-items:center;justify-content:center;';
  function mountSplash() { if (document.body && !document.getElementById('jec-boot')) document.body.appendChild(splash); }
  function unmountSplash() { try { splash.remove(); } catch (e) {} }
  if (document.body) mountSplash(); else document.addEventListener('DOMContentLoaded', mountSplash);

  function getCache(src) { try { return localStorage.getItem(PREFIX + src); } catch (e) { return null; } }
  function setCache(src, code) {
    try { localStorage.setItem(PREFIX + src, code); }
    catch (e) {
      // Cuota llena: limpia SOLO el caché del loader y reintenta una vez
      try {
        for (var i = localStorage.length - 1; i >= 0; i--) {
          var k = localStorage.key(i);
          if (k && k.indexOf(PREFIX) === 0) localStorage.removeItem(k);
        }
        localStorage.setItem(PREFIX + src, code);
      } catch (e2) { /* sigue sin caché, no pasa nada */ }
    }
  }
  /* Borra cachés de versiones anteriores (solo claves del loader) */
  function prune() {
    try {
      for (var i = localStorage.length - 1; i >= 0; i--) {
        var k = localStorage.key(i);
        if (k && k.indexOf(PREFIX) === 0) {
          var src = k.slice(PREFIX.length);
          if (LIST.indexOf(src) < 0) localStorage.removeItem(k);
        }
      }
    } catch (e) {}
  }

  function exec(code, name) {
    var s = document.createElement('script');
    s.setAttribute('data-compiled-from', name);
    s.text = code + '\n//# sourceURL=' + name.split('?')[0];
    document.body.appendChild(s);   // inline → se ejecuta AL INSTANTE, en orden
  }
  function loadBabel() {
    return new Promise(function (res, rej) {
      if (window.Babel) return res();
      var b = document.createElement('script');
      b.src = BABEL_SRC; b.integrity = BABEL_SRI; b.crossOrigin = 'anonymous';
      b.onload = function () { res(); };
      b.onerror = function () { rej(new Error('No se pudo cargar Babel')); };
      document.head.appendChild(b);
    });
  }
  /* Modo clásico (idéntico a como funcionaba antes) por si algo sale mal */
  function fallback(err) {
    console.warn('fast-loader → modo clásico:', err && err.message);
    loadBabel().then(function () {
      LIST.forEach(function (src) {
        var s = document.createElement('script');
        s.type = 'text/babel'; s.src = src; s.async = false;
        document.body.appendChild(s);
      });
      try { window.Babel.transformScriptTags(); } catch (e) { console.error(e); }
      setTimeout(unmountSplash, 400);
    }, function () { unmountSplash(); });
  }

  function boot() {
    prune();
    var cached = LIST.map(getCache);
    var allCached = cached.every(function (c) { return !!c; });

    if (allCached) {
      // 🚀 Visita normal: sin Babel, sin compilar — directo
      try { LIST.forEach(function (src, i) { exec(cached[i], src); }); }
      catch (e) { return fallback(e); }
      unmountSplash();
      return;
    }

    // Primera visita (o versión nueva): compila una vez y guarda
    var fetches = LIST.map(function (src, i) {
      if (cached[i]) return Promise.resolve(null);
      return fetch(src).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status + ' en ' + src);
        return r.text();
      });
    });
    Promise.all([loadBabel(), Promise.all(fetches)]).then(function (rs) {
      var sources = rs[1];
      var codes = LIST.map(function (src, i) {
        if (cached[i]) return cached[i];
        var out = window.Babel.transform(sources[i], {
          presets: ['react'],
          sourceType: 'script',
          filename: src.split('?')[0],
        }).code;
        setCache(src, out);
        return out;
      });
      codes.forEach(function (code, i) { exec(code, LIST[i]); });
      unmountSplash();
    }).catch(fallback);
  }

  if (document.body) boot(); else document.addEventListener('DOMContentLoaded', boot);
})();
