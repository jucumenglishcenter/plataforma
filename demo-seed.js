/* demo-seed.js · DESACTIVADO
 * El "Modo demostración" se eliminó de la plataforma para que NUNCA vuelva a
 * interferir con el ingreso real (antes podía desconectar Supabase y dejar a
 * todos fuera). Este archivo queda como stub inofensivo por compatibilidad:
 *  - nunca activa demo
 *  - nunca desconecta la base
 *  - limpia cualquier marca antigua que hubiera quedado guardada
 */
(function () {
  try { localStorage.removeItem('jucum_demo_mode'); } catch (e) {}
  const noop = function () {};
  window.JUCUM_DEMO = { isDemo: function () { return false; }, enableDemo: noop, disableDemo: noop, seedAll: noop };
})();
