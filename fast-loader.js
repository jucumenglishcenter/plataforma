/* fast-loader.js · Carga rápida de la plataforma JUCUM
 * ───────────────────────────────────────────────────────────────────────────
 * La plataforma está escrita en JSX (React) y el navegador no entiende JSX:
 * hay que compilarlo. Este archivo decide de dónde sale el código ya compilado,
 * del más rápido al más lento:
 *   1. Caché del propio equipo (IndexedDB) → visita normal: directo, sin red.
 *   2. app-build.js → código YA COMPILADO que se sube con cada entrega
 *      (lo genera herramientas/compilar-plataforma.js). Tras una actualización,
 *      el celular baja SOLO esto (un archivo) y entra.
 *   3. Babel en el navegador → solo para un archivo que no esté en app-build.js
 *      (p. ej. alguien editó un .comp.js sin volver a compilar). Funciona igual,
 *      solo que más lento (así funcionaba TODO antes del 13-oct-2026).
 * Si algo falla (caché lleno, red, etc.) cae al modo clásico con Babel:
 * la página NUNCA queda en blanco por culpa del loader.
 *
 * ⚡ 13-oct-2026 · CARGA-RAPIDA-V1 — medido antes del cambio: cada actualización
 * obligaba a CADA celular a bajar Babel (3 MB) + las 49 fuentes (1.6 MB) y a
 * compilarlas (10-30 s en un celular), porque el ?v= de TODOS los archivos
 * cambiaba a la vez. Ahora: ?v= = huella del CONTENIDO de cada archivo (solo se
 * renueva lo que cambió) + app-build.js precompilado + los datos de la nube
 * empiezan a bajar YA (JUCUM_SYNC.prefetch), en paralelo con el código.
 */
(function () {
  'use strict';
  var LIST = window.__JUCUM_APP_SCRIPTS || [];
  var BUILD = window.__JUCUM_APP_BUILD || '';
  var PREFIX = 'jucum_jsc1_';
  var BABEL_SRC = 'https://cdn.jsdelivr.net/npm/@babel/standalone@7.29.0/babel.min.js';
  var BABEL_SRI = 'sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y';
  var BOOT = window.__JUCUM_BOOT = window.__JUCUM_BOOT || {};
  function mark(k) { try { BOOT[k] = Math.round(performance.now()); } catch (e) {} }

  /* 🚀 Los datos de la nube empiezan a viajar YA, mientras se prepara el código
   * (solo lectura; App los toma con JUCUM_SYNC.roster()/hydrate()). */
  try { if (window.JUCUM_SYNC && window.JUCUM_SYNC.prefetch && window.JUCUM_SYNC.prefetch()) mark('datos'); } catch (e) {}

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
    if (arrancado) return;
    arrancado = true;
    console.warn('fast-loader → modo clásico:', err && err.message);
    loadBabel().then(function () {
      LIST.forEach(function (src) {
        var s = document.createElement('script');
        s.type = 'text/babel'; s.src = src; s.async = false;
        document.body.appendChild(s);
      });
      try { window.Babel.transformScriptTags(); } catch (e) { console.error(e); }
      setTimeout(unmountSplash, 400);
      scheduleHealCheck();
    }, function () { unmountSplash(); });
  }

  /* ── Auto-reparación de pantalla en blanco ────────────────────────
   * Si un despliegue dejó un script CACHEADO a medias, la app puede arrancar en
   * blanco. Ctrl+Shift+R no arregla esto (no borra el caché del loader). Aquí
   * lo detectamos: si a los 7 s no hay nada montado en #root, limpiamos el caché de
   * compilado (localStorage + IndexedDB) y recargamos UNA sola vez (guardia en
   * sessionStorage evita bucles). Así ningún alumno queda atascado. */
  var HEAL_KEY = 'jucum_selfheal_v2';
  function clearCompiledCache() {
    try {
      for (var i = localStorage.length - 1; i >= 0; i--) {
        var k = localStorage.key(i);
        if (k && k.indexOf(PREFIX) === 0) localStorage.removeItem(k);
      }
    } catch (e) {}
  }
  function clearIDBCode(cb) {
    var done = false;
    function fin() { if (!done) { done = true; cb(); } }
    try {
      var rq = indexedDB.open(DB_NAME, 1);
      rq.onupgradeneeded = function () { try { rq.result.createObjectStore(STORE); } catch (e) {} };
      rq.onsuccess = function () {
        try { var tx = rq.result.transaction(STORE, 'readwrite'); tx.objectStore(STORE).clear(); tx.oncomplete = fin; tx.onerror = fin; tx.onabort = fin; }
        catch (e) { fin(); }
      };
      rq.onerror = fin; rq.onblocked = fin;
    } catch (e) { fin(); }
    setTimeout(fin, 1500);
  }
  function appMounted() {
    var r = document.getElementById('root');
    return !!(r && r.children.length > 0 && (r.textContent || '').replace(/\s/g, '').length > 0);
  }
  function selfHeal(reason) {
    try { if (sessionStorage.getItem(HEAL_KEY) === '1') return false; } catch (e) {}  // ya se intentó → no repetir
    try { sessionStorage.setItem(HEAL_KEY, '1'); } catch (e) {}
    try { console.warn('fast-loader auto-reparación (' + reason + '): limpio caché y recargo'); } catch (e) {}
    clearCompiledCache();
    clearIDBCode(function () {
      try { var u = new URL(location.href); u.searchParams.set('_heal', Date.now().toString()); location.replace(u.toString()); }
      catch (e) { location.reload(); }
    });
    return true;
  }
  function scheduleHealCheck() {
    setTimeout(function () {
      if (appMounted()) { try { sessionStorage.removeItem(HEAL_KEY); } catch (e) {} return; }  // arrancó bien → permite reparar en el futuro
      selfHeal('pantalla-en-blanco');
    }, 7000);
  }
  // Un error JS ANTES de que monte la app suele ser un script cacheado roto:
  // reparamos rápido (con un respiro por si la app monta justo después).
  // (Un app-build.js roto NO cuenta: ese caso ya cae solo a Babel.)
  window.addEventListener('error', function (ev) {
    if (ev && ev.filename && String(ev.filename).indexOf('app-build.js') >= 0) return;
    if (ev && (ev.message || ev.error) && !appMounted()) {
      setTimeout(function () { if (!appMounted()) selfHeal('error-arranque'); }, 600);
    }
  }, true);

  /* ── 📦 Caché del compilado en IndexedDB (no en localStorage) ──────
   * Guardar ~3 MB de código compilado en localStorage se comía la mayor parte
   * del cupo de ~5 MB del navegador: al profesor ya no le entraban sus planes
   * ni sus sets de práctica (las escrituras fallaban). IndexedDB tiene un
   * espacio MUCHO mayor y no compite con los datos de la plataforma.
   * Si el navegador no lo soporta, se usa el modo anterior (localStorage). */
  var DB_NAME = 'jucum_jsc', STORE = 'code';
  function idbOpen() {
    return new Promise(function (res, rej) {
      if (!window.indexedDB) { rej(new Error('sin indexedDB')); return; }
      var rq;
      try { rq = indexedDB.open(DB_NAME, 1); } catch (e) { rej(e); return; }
      rq.onupgradeneeded = function () { try { rq.result.createObjectStore(STORE); } catch (e) {} };
      rq.onsuccess = function () { res(rq.result); };
      rq.onerror = function () { rej(rq.error || new Error('idb')); };
      rq.onblocked = function () { rej(new Error('idb bloqueado')); };
      setTimeout(function () { rej(new Error('idb lento')); }, 3000);
    });
  }
  function idbAll(db) {
    return new Promise(function (res, rej) {
      try {
        var out = {}, rq = db.transaction(STORE, 'readonly').objectStore(STORE).openCursor();
        rq.onsuccess = function () { var c = rq.result; if (!c) { res(out); return; } out[c.key] = c.value; c.continue(); };
        rq.onerror = function () { rej(rq.error || new Error('idb read')); };
      } catch (e) { rej(e); }
    });
  }
  function idbPut(db, k, v) { try { db.transaction(STORE, 'readwrite').objectStore(STORE).put(v, k); } catch (e) {} }
  function idbDel(db, k) { try { db.transaction(STORE, 'readwrite').objectStore(STORE).delete(k); } catch (e) {} }

  /* 🩹 26-sep-2026 · Lo compilado AQUÍ con Babel guarda el ETag de su fuente: si un
   * despliegue se subió en VARIOS commits, el index nuevo pudo compilar un .comp.js
   * VIEJO. Tras arrancar se compara el ETag con el del servidor (HEAD, liviano) y se
   * descarta lo desactualizado → la siguiente carga recompila. Lo que viene de
   * app-build.js (marca p:1) no se revisa: su clave lleva la huella de la fuente
   * exacta con la que se compiló, así que no puede quedar desfasado. */
  function verifyFresh(db, etags) {
    var stale = 0, pend = 0;
    Object.keys(etags).forEach(function (src) {
      if (LIST.indexOf(src) < 0) return;
      pend++;
      fetch(src, { method: 'HEAD', cache: 'no-cache' }).then(function (r) {
        var e = r.ok ? (r.headers.get('etag') || '') : null;
        if (e === null) return;
        if (!etags[src] || (e && e.replace(/^W\//, '') !== etags[src].replace(/^W\//, ''))) { idbDel(db, src); stale++; }
      }).catch(function () {}).then(function () {
        if (--pend === 0 && stale) { try { console.info('fast-loader: ' + stale + ' archivo(s) desactualizado(s) → se recompilan en la próxima carga'); } catch (e) {} }
      });
    });
  }

  /* ── 📦 Código precompilado (app-build.js) ─────────────────────────
   * window.__JUCUM_PRE = { "<archivo>?v=<huella>": "<código ya compilado>", … }
   * Se baja SOLO si al caché del equipo le falta algo (tras una actualización o
   * en un equipo nuevo) y una sola vez por carga. Es texto: aunque estuviera
   * desactualizado no ejecuta nada por sí solo — cada entrada se usa únicamente
   * si su clave coincide EXACTO con la que pide index.html. */
  var buildP = null;
  function loadBuild() {
    if (buildP) return buildP;
    buildP = new Promise(function (res) {
      if (!BUILD) { res({}); return; }
      var done = false;
      function fin() { if (done) return; done = true; var m = window.__JUCUM_PRE; res((m && typeof m === 'object') ? m : {}); }
      var s = document.createElement('script');
      s.src = BUILD; s.async = true;
      s.onload = fin; s.onerror = fin;
      (document.head || document.documentElement).appendChild(s);
      setTimeout(fin, 25000);
    });
    return buildP;
  }
  function hasCode(v) { return !!(v && (typeof v === 'string' || typeof v.c === 'string')); }

  var arrancado = false;
  function boot() {
    prune();                                  // limpia claves viejas del modo anterior
    // Espera a que los datos pesados terminen de mudarse a IndexedDB (JUCUM_BIG),
    // así la app lee los valores ya migrados y no una copia a medias.
    var big = (window.JUCUM_BIG && window.JUCUM_BIG.ready) || Promise.resolve(false);
    var bigWait = Promise.race([big, new Promise(function (r) { setTimeout(r, 4500); })]).then(null, function () {});
    // ⚡ La lectura del caché de código va EN PARALELO con esa espera (antes, en fila).
    var cacheP = idbOpen().then(function (db) {
      return idbAll(db).then(function (all) { return { db: db, all: all }; });
    }).then(null, function () { return null; });
    // Si al caché le falta algo, el precompilado empieza a bajar de una vez.
    cacheP.then(function (r) {
      if (!r || LIST.some(function (s) { return !hasCode(r.all[s]); })) loadBuild();
    });
    Promise.all([bigWait, cacheP]).then(function (rs) {
      var r = rs[1];
      try { if (r) startIDB(r.db, r.all); else startLS(); }
      catch (e) { if (!arrancado) startLS(); }
    });
  }
  function startIDB(db, all) {
    clearCompiledCache();                     // migración: libera los ~3 MB de localStorage
    Object.keys(all).forEach(function (k) { if (LIST.indexOf(k) < 0) { idbDel(db, k); delete all[k]; } });
    var etags = {}, codes = {};
    Object.keys(all).forEach(function (k) {
      var v = all[k];
      if (v && typeof v === 'object' && typeof v.c === 'string') { codes[k] = v.c; if (!v.p) etags[k] = v.e || ''; }
      else if (typeof v === 'string') { codes[k] = v; etags[k] = ''; }
    });
    run(codes, function (src, code, etag, pre) { idbPut(db, src, pre ? { c: code, e: '', p: 1 } : { c: code, e: etag || '' }); });
    setTimeout(function () { verifyFresh(db, etags); }, 6000);
  }
  function startLS() {
    var cached = {};
    LIST.forEach(function (s) { var c = getCache(s); if (c) cached[s] = c; });
    // Lo precompilado no se copia a localStorage (cupo chico): el navegador ya
    // guarda app-build.js en su propio caché.
    run(cached, function (src, code, etag, pre) { if (!pre) setCache(src, code); });
  }

  function run(cacheMap, put) {
    if (arrancado) return;
    arrancado = true;
    mark('cache');
    var missing = LIST.filter(function (s) { return !cacheMap[s]; });
    if (!missing.length) return go();         // 🚀 visita normal: sin red, sin compilar
    loadBuild().then(function (pre) {
      missing.forEach(function (src) {
        var c = pre[src];
        if (typeof c === 'string' && c) { cacheMap[src] = c; try { put(src, c, '', true); } catch (e) {} }
      });
      try { window.__JUCUM_PRE = null; } catch (e) {}   // libera la memoria
      mark('precompilado');
      var still = LIST.filter(function (s) { return !cacheMap[s]; });
      if (!still.length) return go();
      compile(still);
    });

    function go() {
      try { LIST.forEach(function (src) { exec(cacheMap[src], src); }); }
      catch (e) { arrancado = false; return fallback(e); }
      mark('codigo');
      unmountSplash();
      scheduleHealCheck();
    }
    // Solo lo que no estaba ni en el caché ni en app-build.js se compila aquí.
    function compile(still) {
      try { console.info('fast-loader: compilando ' + still.length + ' archivo(s) con Babel (no estaban en app-build.js): ' + still.map(function (s) { return s.split('?')[0]; }).join(', ')); } catch (e) {}
      var fetches = still.map(function (src) {
        return fetch(src, { cache: 'no-cache' }).then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status + ' en ' + src);
          var et = r.headers.get('etag') || '';
          return r.text().then(function (t) { return { src: src, t: t, e: et }; });
        });
      });
      Promise.all([loadBabel(), Promise.all(fetches)]).then(function (rs) {
        rs[1].forEach(function (f) {
          var out = window.Babel.transform(f.t, {
            presets: ['react'],
            sourceType: 'script',
            filename: f.src.split('?')[0],
          }).code;
          cacheMap[f.src] = out;
          try { put(f.src, out, f.e, false); } catch (e) {}
        });
        mark('babel');
        go();
      }).catch(function (e) { arrancado = false; fallback(e); });
    }
  }

  if (document.body) boot(); else document.addEventListener('DOMContentLoaded', boot);
})();
