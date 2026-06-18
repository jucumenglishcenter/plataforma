/* JUCUM EC · Sonidos (Web Audio — sin archivos, funciona offline)
 * - notify(): campanita suave de notificación. Anti-repetición: máx 1 cada 4s
 *   (si llegan 5 notificaciones juntas NO suena 5 veces).
 * - alert(): sonido de alarma para racha en peligro / inactividad. Máx 1 cada 6s.
 * Los navegadores bloquean el audio hasta que el usuario interactúe; reanudamos
 * el contexto en el primer gesto. Si algo falla, falla en silencio.
 */
(function () {
  let ctx = null;
  function ac() {
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }

  // Desbloquear en el primer gesto del usuario
  const unlock = () => { ac(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });

  function tone(freq, startAt, dur, type, peak) {
    const c = ac(); if (!c) return;
    const t0 = c.currentTime + startAt;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak || 0.12, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain); gain.connect(c.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  let lastNotify = 0;
  function notify() {
    const now = Date.now();
    if (now - lastNotify < 4000) return; // anti-repetición
    lastNotify = now;
    // campanita ascendente, agradable
    tone(660, 0, 0.18, 'sine', 0.10);
    tone(880, 0.10, 0.22, 'sine', 0.10);
  }

  let lastAlert = 0;
  function alert() {
    const now = Date.now();
    if (now - lastAlert < 6000) return;
    lastAlert = now;
    // dos pulsos descendentes tipo alarma (más serio, llama la atención)
    tone(440, 0, 0.30, 'triangle', 0.16);
    tone(370, 0.34, 0.40, 'triangle', 0.16);
  }

  window.JUCUM_SOUND = { notify, alert };
})();
