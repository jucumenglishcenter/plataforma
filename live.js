/* JUCUM EC · Presencia EN VIVO (window.JUCUM_LIVE)
 * ─────────────────────────────────────────────────────────────────────
 * Fuente: tabla live_presence (script 26). La escribe jucum-connect.js
 * desde CADA material: al entrar, cada 20 s, al terminar y al salir.
 * Aquí solo se LEE, para el tablero "Clase en vivo" y para el seguimiento
 * del perfil del alumno.
 *
 * Si la tabla todavía no existe (script 26 sin ejecutar), degrada solo a
 * daily_sessions: se sigue viendo quién practica, pero con ~2 min de
 * retraso y sin el momento exacto de "inicié / finalicé".
 *
 * 🕐 Todo se calcula por DIFERENCIA de tiempo (ms), nunca por día local:
 *    no hay cortes de día aquí, así que no depende de la zona horaria.
 */
(function () {
  var FRESH_MS  = 75 * 1000;        // heartbeat cada 20 s → sigue dentro
  var STALE_MS  = 3 * 60 * 1000;    // sin latido = ya salió del material
  var DONE_MS   = 10 * 60 * 1000;   // "acaba de terminar" se muestra 10 min
  var BUB_START = 75 * 1000;        // burbuja "¡Ya inicié mi práctica!"
  var BUB_DONE  = 100 * 1000;       // burbuja "¡Ya finalicé mi práctica!"
  var WINDOW_MS = 5 * 3600 * 1000;  // ventana que se trae de la nube: cubre toda la clase

  var degraded = false;             // true = sin tabla live_presence
  var lastRows = [];
  var lastAt = 0;

  function ms(ts) { var t = Date.parse(ts || ''); return isNaN(t) ? 0 : t; }

  function normalize(r) {
    return {
      user_id: r.user_id,
      group_id: r.group_id || '',
      module_id: r.module_id || '',
      activity_id: r.activity_id || '',
      kind: r.kind || '',
      material_name: r.material_name || '',
      part: r.part == null ? null : Number(r.part),
      state: r.state || 'active',
      score: r.score == null ? null : Number(r.score),
      minutes: Number(r.minutes || 0),
      exam: !!r.exam,
      startedMs: ms(r.started_at) || ms(r.updated_at),
      updatedMs: ms(r.updated_at),
      key: (r.module_id || '') + ':' + (r.activity_id || ''),
    };
  }

  /* Estado visible de un alumno a partir de su fila de presencia.
   * phase: start | working | paused | done | finished | gone · bubble: texto o null
   *   done     = acaba de terminar (10 min, con burbuja y festejo)
   *   finished = ya practicó y sigue contando como PRESENTE el resto de la clase
   *              (antes caía en "no entran a practicar" y los alumnos se preocupaban)
   *   gone     = entró pero se fue SIN terminar */
  function classify(row, now) {
    now = now || Date.now();
    if (!row) return { phase: 'off', bubble: null, elapsedMin: 0, fresh: false };
    var age = now - row.updatedMs;
    var since = now - row.startedMs;
    // ⏱️ Minutos REALES de práctica: los manda el material en cada latido
    // (activeSec, que se pausa con pestaña oculta o sin interacción). El reloj
    // de pared ya NO se usa como mínimo: inflaba el tiempo de quien dejaba la
    // pestaña abierta y hacía que muchos “marquen lo mismo”.
    var elapsedMin = (row.minutes != null) ? row.minutes : Math.floor(since / 60000);
    if (row.state === 'done') {
      return {
        phase: age <= DONE_MS ? 'done' : 'finished',
        bubble: age <= BUB_DONE ? '¡Ya finalicé mi práctica!' : null,
        elapsedMin: row.minutes || elapsedMin, fresh: true, completed: true,
      };
    }
    if (row.state === 'left' || age > STALE_MS) {
      return { phase: 'gone', bubble: null, elapsedMin: row.minutes || elapsedMin, fresh: false, completed: false };
    }
    if (row.state === 'paused' || age > FRESH_MS) {
      return { phase: 'paused', bubble: null, elapsedMin: elapsedMin, fresh: true };
    }
    if (since <= BUB_START) {
      return { phase: 'start', bubble: '¡Ya inicié mi práctica!', elapsedMin: elapsedMin, fresh: true };
    }
    return { phase: 'working', bubble: null, elapsedMin: elapsedMin, fresh: true };
  }

  function client() {
    try { return (window.JUCUM_SB && window.JUCUM_SB.getClient) ? window.JUCUM_SB.getClient() : null; }
    catch (e) { return null; }
  }

  /* Plan B: minutos de hoy por actividad (daily_sessions). Sin momento exacto
   * de inicio/fin, pero al menos muestra quién está practicando. */
  function fallback(sb) {
    var day = new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10); // día de Perú
    return sb.from('daily_sessions').select('*').eq('day', day).then(function (r) {
      var since = Date.now() - WINDOW_MS;
      return ((r && r.data) || [])
        .filter(function (x) { return ms(x.updated_at) >= since; })
        .map(function (x) {
          return normalize({
            user_id: x.user_id, module_id: x.module_id, activity_id: x.activity_id,
            kind: x.kind, minutes: x.minutes, state: 'active',
            started_at: x.updated_at, updated_at: x.updated_at,
          });
        });
    }, function () { return []; });
  }

  function fetchLive() {
    var sb = client();
    if (!sb) return Promise.resolve([]);
    if (degraded) return fallback(sb).then(cache);
    var since = new Date(Date.now() - WINDOW_MS).toISOString();
    return sb.from('live_presence').select('*').gt('updated_at', since).then(function (r) {
      if (r && r.error) {
        var m = (r.error.message || '') + (r.error.code || '');
        if (/does not exist|schema cache|42P01|PGRST205/i.test(m)) { degraded = true; return fallback(sb).then(cache); }
        return lastRows;
      }
      return cache(((r && r.data) || []).map(normalize));
    }, function () { return lastRows; });
  }

  function cache(rows) { lastRows = rows || []; lastAt = Date.now(); return lastRows; }

  /* Sondeo con pausa automática cuando la pestaña no se ve (no gasta datos). */
  function subscribe(cb, everyMs) {
    var stop = false, timer = null;
    var wait = everyMs || 12000;
    function tick() {
      if (stop) return;
      if (document.visibilityState === 'hidden') { timer = setTimeout(tick, wait); return; }
      fetchLive().then(function (rows) { if (!stop) cb(rows, { degraded: degraded, at: lastAt }); })
        .catch(function () {})
        .then(function () { if (!stop) timer = setTimeout(tick, wait); });
    }
    tick();
    return function () { stop = true; if (timer) clearTimeout(timer); };
  }

  window.JUCUM_LIVE = {
    fetch: fetchLive, subscribe: subscribe, classify: classify,
    isDegraded: function () { return degraded; },
    cached: function () { return lastRows; },
    FRESH_MS: FRESH_MS, STALE_MS: STALE_MS, DONE_MS: DONE_MS,
  };
})();
