/* ════════════════════════════════════════════════════════════════════
   JUCUM English Center · Configuración de Supabase
   ════════════════════════════════════════════════════════════════════

   👉 PASO ÚNICO: pega tu "Publishable key" entre las comillas de SUPABASE_ANON_KEY.

   Cómo obtenerla:
     1. En Supabase: Settings (⚙️) → API Keys
     2. Sección "Publishable key" → fila "default"
     3. Click en copiar 📋 (empieza con  sb_publishable_... )
     4. Pégalo abajo entre las comillas

   ⚠️ NO uses la "Secret key" (sb_secret_...). Esa es privada.
   La URL ya está puesta. NO cambies nada más.
   ════════════════════════════════════════════════════════════════════ */

window.JUCUM_CONFIG = {
  // Tu Project URL (ya configurada)
  SUPABASE_URL: 'https://dwwzkzuonltaavzhvilu.supabase.co',

  // 👇 PEGA TU PUBLISHABLE KEY AQUÍ (empieza con sb_publishable_...)
  SUPABASE_ANON_KEY: 'sb_publishable_6pruJuV5P2cMVWqd8Wt8gg_UAtuEj_m',

  // Dominio técnico interno para el login con usuario (no es un correo real)
  // El alumno escribe "leo.cruz" → internamente se usa "leo.cruz@jucum.local"
  USER_EMAIL_DOMAIN: 'jucum.local',

  // Bucket de Storage para audios/videos de evaluaciones
  STORAGE_BUCKET: 'attachments',
};

// Verificación: avisa si la key aún no fue pegada
if (window.JUCUM_CONFIG.SUPABASE_ANON_KEY === 'PEGA_TU_PUBLISHABLE_KEY_AQUI') {
  console.warn('⚠️ Falta pegar la Publishable key en config.js');
}

/* ════════════════════════════════════════════════════════════════════
   🗄️ JUCUM_BIG · los datos pesados YA NO viven en localStorage
   ════════════════════════════════════════════════════════════════════
   El navegador da solo ~5 MB de localStorage por sitio, y ese cupo es lo
   que se llenaba (notificaciones y progreso de TODOS los alumnos en el
   equipo del profesor) hasta que dejaba de guardar planes y sets.

   Dónde vive cada cosa a partir de ahora:
     • Supabase  → la VERDAD. Todo lo importante ya se guarda ahí y por eso
                   se ve igual en cualquier equipo. Nada de esto lo cambia.
     • IndexedDB → la copia local para trabajar rápido y sin internet.
                   Es el almacén GRANDE del navegador (cientos de MB, no 5).
     • localStorage → solo las claves chiquitas (sesión, preferencias).
     • Netlify   → solo publica la página; no guarda datos.

   Cómo funciona sin tocar el resto del código: interceptamos getItem/
   setItem/removeItem SOLO para las claves pesadas de la lista. Al arrancar
   se traen de IndexedDB a memoria (y se migra lo que hubiera en
   localStorage, liberando ese espacio). Las lecturas siguen siendo
   instantáneas; las escrituras se copian a IndexedDB en segundo plano.
   Si el navegador no soporta IndexedDB, todo sigue como antes.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  if (window.JUCUM_BIG) return;
  var HEAVY = {
    jucum_student_progress_v1: 1, jucum_notifs_v1: 1, jucum_submissions_v1: 1,
    jucum_assignments_v1: 1, jucum_registrations_v1: 1, jucum_payments_v1: 1,
    jucum_class_log_v1: 1, jucum_teacher_notes_v1: 1, jucum_forum_v1: 1,
    jucum_evaluations_v1: 1, jucum_messages_v1: 1, jucum_forum_flags_v1: 1,
    jucum_attendance_v1: 1, jucum_diagnostics_v1: 1, jucum_error_reports_v1: 1
  };
  var LS = window.localStorage;
  if (!LS || !window.Storage || !window.indexedDB) { window.JUCUM_BIG = { ok: false, ready: Promise.resolve(false) }; return; }

  var P = window.Storage.prototype;
  var nGet = P.getItem, nSet = P.setItem, nDel = P.removeItem, nClear = P.clear;
  var mem = Object.create(null);     // clave → string | null (null = borrada)
  var have = Object.create(null);    // la memoria manda para esta clave
  var dirty = Object.create(null), db = null, listo = false, timer = null, resolver;
  var pre = Object.create(null);      // claves escritas ANTES de que IndexedDB estuviera listo
  var ready = new Promise(function (r) { resolver = r; });

  var DB = 'jucum_big', ST = 'kv';
  function open() {
    return new Promise(function (res, rej) {
      var rq;
      try { rq = indexedDB.open(DB, 1); } catch (e) { rej(e); return; }
      rq.onupgradeneeded = function () { try { rq.result.createObjectStore(ST); } catch (e) {} };
      rq.onsuccess = function () { res(rq.result); };
      rq.onerror = function () { rej(rq.error || new Error('idb')); };
      rq.onblocked = function () { rej(new Error('idb bloqueado')); };
      setTimeout(function () { rej(new Error('idb lento')); }, 4000);
    });
  }
  function readAll(d) {
    return new Promise(function (res, rej) {
      try {
        var out = {}, rq = d.transaction(ST, 'readonly').objectStore(ST).openCursor();
        rq.onsuccess = function () { var c = rq.result; if (!c) { res(out); return; } out[c.key] = c.value; c.continue(); };
        rq.onerror = function () { rej(rq.error || new Error('idb read')); };
      } catch (e) { rej(e); }
    });
  }
  function flush() {
    timer = null;
    if (!db) return;
    var keys = Object.keys(dirty);
    if (!keys.length) return;
    dirty = Object.create(null);
    try {
      var st = db.transaction(ST, 'readwrite').objectStore(ST);
      keys.forEach(function (k) {
        var v = mem[k];
        if (v == null) { try { st.delete(k); } catch (e) {} }
        else { try { st.put(v, k); } catch (e) {} }
      });
    } catch (e) { keys.forEach(function (k) { dirty[k] = 1; }); }
  }
  function queue(k) { dirty[k] = 1; if (!timer) timer = setTimeout(flush, 400); }

  P.getItem = function (k) {
    if (this === LS && HEAVY[k] === 1 && have[k]) return mem[k] == null ? null : mem[k];
    return nGet.call(this, k);
  };
  P.setItem = function (k, v) {
    if (this === LS && HEAVY[k] === 1) {
      mem[k] = String(v); have[k] = 1; queue(k);
      // Antes de que IndexedDB esté listo también dejamos la copia de siempre,
      // por si el navegador cierra la pestaña en ese primer segundo.
      if (!listo) { pre[k] = 1; try { nSet.call(this, k, mem[k]); } catch (e) {} }
      return;
    }
    return nSet.call(this, k, v);
  };
  P.removeItem = function (k) {
    if (this === LS && HEAVY[k] === 1) { mem[k] = null; have[k] = 1; queue(k); }
    return nDel.call(this, k);
  };
  P.clear = function () {
    if (this === LS) { Object.keys(HEAVY).forEach(function (k) { mem[k] = null; have[k] = 1; queue(k); }); }
    return nClear.call(this);
  };

  /* 🛟 Fusión de rescate ───────────────────────────────────────────────
   * Durante el primer segundo (mientras IndexedDB abre) las lecturas de una
   * clave pesada devuelven vacío. Si en ese instante el código lee-modifica-
   * escribe (crear una tarea, entregar, calificar), guardaba una lista con UN
   * solo elemento y borraba todo lo anterior: así "desaparecía la tarea de
   * antes". Aquí recuperamos lo que faltaba: lo NUEVO siempre manda, y solo
   * se devuelven las entradas que ese guardado a medias se dejó fuera. */
  function mezcla(v, n, nivel) {
    nivel = nivel || 0;
    if (Array.isArray(v) && Array.isArray(n)) {
      var conId = function (x) { return x && typeof x === 'object' && x.id; };
      if (!v.every(conId) || !n.every(conId)) return n;
      var vistos = Object.create(null);
      n.forEach(function (x) { vistos[x.id] = 1; });
      return n.concat(v.filter(function (x) { return !vistos[x.id]; }));
    }
    if (v && n && typeof v === 'object' && typeof n === 'object' && !Array.isArray(v) && !Array.isArray(n)) {
      var out = {};
      Object.keys(v).forEach(function (k) { out[k] = v[k]; });
      Object.keys(n).forEach(function (k) { out[k] = (nivel < 2 && Object.prototype.hasOwnProperty.call(out, k)) ? mezcla(out[k], n[k], nivel + 1) : n[k]; });
      return out;
    }
    return n;
  }
  function fusiona(viejoStr, nuevoStr) {
    try { return JSON.stringify(mezcla(JSON.parse(viejoStr), JSON.parse(nuevoStr))); }
    catch (e) { return nuevoStr; }
  }

  open().then(function (d) {
    db = d;
    return readAll(d);
  }).then(function (rec) {
    var migradas = 0;
    Object.keys(HEAVY).forEach(function (k) {
      if (have[k]) {
        // Se escribió antes de que IndexedDB estuviera listo: ese guardado pudo
        // salir INCOMPLETO (la lectura devolvía vacío). Se fusiona con lo que
        // ya estaba guardado en vez de reemplazarlo.
        if (pre[k] && typeof rec[k] === 'string' && rec[k] !== mem[k]) mem[k] = fusiona(rec[k], mem[k]);
        queue(k); return;                                   // memoria manda, pero sin perder lo anterior
      }
      if (typeof rec[k] === 'string') { mem[k] = rec[k]; have[k] = 1; return; }
      var viejo = null; try { viejo = nGet.call(LS, k); } catch (e) {}
      if (viejo != null) { mem[k] = viejo; have[k] = 1; queue(k); migradas++; }
    });
    listo = true;
    // Libera el cupo de localStorage: esos datos ya están en IndexedDB.
    Object.keys(HEAVY).forEach(function (k) { try { nDel.call(LS, k); } catch (e) {} });
    flush();
    try { if (migradas) console.info('JUCUM_BIG: ' + migradas + ' datos mudados a IndexedDB (localStorage liberado)'); } catch (e) {}
    resolver(true);
  }).catch(function (e) {
    // Sin IndexedDB: se sigue usando localStorage como siempre.
    try { console.warn('JUCUM_BIG no disponible, sigo en localStorage:', e && e.message); } catch (e2) {}
    Object.keys(mem).forEach(function (k) { if (mem[k] != null) { try { nSet.call(LS, k, mem[k]); } catch (e3) {} } });
    mem = Object.create(null); have = Object.create(null);
    resolver(false);
  });

  window.JUCUM_BIG = {
    ok: true, ready: ready, keys: HEAVY,
    isBig: function (k) { return HEAVY[k] === 1; },
    flush: flush,
    bytes: function () { var t = 0; Object.keys(mem).forEach(function (k) { if (mem[k]) t += (k.length + mem[k].length) * 2; }); return t; }
  };
})();

/* ════════════════════════════════════════════════════════════════════
   🗄️ JUCUM_STORE · guardado a prueba de "cupo lleno"
   ════════════════════════════════════════════════════════════════════
   El navegador solo da ~5 MB de localStorage por sitio. Cuando se llena,
   TODA escritura lanza error: en el panel del profesor eso se veía como
   "no puedo guardar mis sets de práctica" y "hay botones que no hacen
   nada" (el error corta el clic a la mitad y la copia a la nube nunca
   llegaba a enviarse). Aquí centralizamos el guardado:
     1. intenta guardar,
     2. si no entra, libera espacio recuperable (caché de arranque,
        notificaciones viejas, bitácora antigua, adjuntos en base64),
     3. reintenta, y si aun así no entra AVISA en pantalla — nunca revienta
        el botón, así la copia en la nube siempre se envía.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  if (window.JUCUM_STORE) return;
  var avisado = false;

  function bytes() {
    var t = 0;
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); t += (k.length + (localStorage.getItem(k) || '').length) * 2; } } catch (e) {}
    return t;
  }
  function delPrefix(p) {
    var n = 0;
    try { for (var i = localStorage.length - 1; i >= 0; i--) { var k = localStorage.key(i); if (k && k.indexOf(p) === 0) { localStorage.removeItem(k); n++; } } } catch (e) {}
    return n;
  }
  /* Notificaciones: el equipo del profesor se bajaba las de TODOS los alumnos
   * (llegó a 3.3 MB). Deja las más recientes por persona y bota las leídas viejas. */
  function pruneNotifs(porUsuario) {
    try {
      var all = JSON.parse(localStorage.getItem('jucum_notifs_v1') || 'null');
      if (!all || typeof all !== 'object') return;
      var corte = Date.now() - 30 * 86400000, max = porUsuario || 25;
      Object.keys(all).forEach(function (u) {
        var arr = Array.isArray(all[u]) ? all[u] : [];
        arr = arr.filter(function (n) { return !(n.read && n.date && Date.parse(n.date) < corte); });
        arr.sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
        all[u] = arr.slice(0, max);
        if (!all[u].length) delete all[u];
      });
      localStorage.setItem('jucum_notifs_v1', JSON.stringify(all));
    } catch (e) {}
  }
  function trimArray(key, max) {
    try {
      var a = JSON.parse(localStorage.getItem(key) || 'null');
      if (Array.isArray(a) && a.length > max) localStorage.setItem(key, JSON.stringify(a.slice(-max)));
    } catch (e) {}
  }
  /* Quita fotos/adjuntos en base64 (la nube ya los tiene) */
  function stripHeavy(node) {
    if (Array.isArray(node)) { node.forEach(stripHeavy); return; }
    if (node && typeof node === 'object') {
      if (typeof node.dataUrl === 'string') { delete node.dataUrl; if (!node.url) node.pending = true; }
      if (typeof node.voucher === 'string' && node.voucher.slice(0, 5) === 'data:') { node.voucher = null; node.voucherRef = true; }
      Object.keys(node).forEach(function (k) { stripHeavy(node[k]); });
    }
  }
  function purgeKey(k) {
    try { var v = JSON.parse(localStorage.getItem(k) || 'null'); if (v) { stripHeavy(v); localStorage.setItem(k, JSON.stringify(v)); } } catch (e) {}
  }
  /* Libera en orden: primero lo 100% recuperable, al final lo pesado. */
  function freeSpace(nivel) {
    delPrefix('jucum_jsc1_');                 // caché de arranque (se regenera solo)
    delPrefix('jucum_examdraft_');            // borradores de exámenes ya rendidos
    pruneNotifs(nivel > 1 ? 10 : 25);
    trimArray('jucum_class_log_v1', nivel > 1 ? 150 : 400);
    trimArray('jucum_teacher_notes_v1', 400);
    if (nivel > 1) { ['jucum_submissions_v1', 'jucum_registrations_v1', 'jucum_payments_v1', 'jucum_assignments_v1'].forEach(purgeKey); }
  }
  function aviso() {
    if (avisado || !document.body) return;
    avisado = true;
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:1000000;background:#FFF3CD;border:1.5px solid #F0C66B;color:#7A4E00;padding:12px 18px;border-radius:14px;font:700 13px system-ui,sans-serif;max-width:92vw;box-shadow:0 8px 24px rgba(0,0,0,.18);text-align:center;line-height:1.5;';
    d.innerHTML = '⚠️ La memoria de este navegador está llena, por eso algo no se guardó en el equipo.<br>Tu trabajo SÍ se envió a la nube. Cierra y vuelve a abrir la plataforma para liberar espacio.';
    document.body.appendChild(d);
    setTimeout(function () { try { d.remove(); } catch (e) {} }, 12000);
  }
  /* Guarda sin lanzar error nunca. Devuelve true/false. */
  function set(key, str) {
    try { localStorage.setItem(key, str); return true; } catch (e) {}
    try { freeSpace(1); localStorage.setItem(key, str); return true; } catch (e) {}
    try { freeSpace(2); localStorage.setItem(key, str); return true; } catch (e) {}
    try { console.warn('JUCUM_STORE: sin espacio para', key); } catch (e) {}
    aviso();
    return false;
  }
  function setJSON(key, value) { try { return set(key, JSON.stringify(value)); } catch (e) { return false; } }

  window.JUCUM_STORE = { set: set, setJSON: setJSON, freeSpace: freeSpace, pruneNotifs: pruneNotifs, bytes: bytes };
  // Higiene al arrancar: las notificaciones no deben crecer sin límite.
  try { pruneNotifs(25); } catch (e) {}
})();
