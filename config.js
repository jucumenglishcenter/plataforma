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
