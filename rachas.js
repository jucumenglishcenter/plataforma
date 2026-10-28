/* rachas.js · RACHA-AMABLE-V1 (propuesta 26-oct-2026, aprobada por la usuaria)
 * Motor PURO de la racha (sin red ni localStorage): lo usan el espejo y, al entregar, la plataforma.
 *  · El día CUENTA si el alumno llega a la meta de minutos de su grupo (groups.daily_target_min, 15 por defecto).
 *  · Domingo libre: si llega a la meta suma; si no, no corta.
 *  · 1 escudo 🛡 por semana (lunes a domingo), automático: cubre UN día sin meta (no el de hoy).
 *  · XP de racha por día cumplido (+10 días 1–2 · +20 días 3–6 · +30 desde el 7.º): se GANA y se queda.
 * Entrada: mins = { 'aaaa-mm-dd': minutos del día (día Perú) }, goal, today ('aaaa-mm-dd' Perú). */
(function () {
  'use strict';
  if (window.JUCUM_STREAK) return;
  var WINDOW_DAYS = 120;
  function addD(s, n) { return new Date(Date.parse(s + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10); } // día-ok (aritmética UTC de fechas)
  function dow(s) { return new Date(s + 'T12:00:00Z').getUTCDay(); }
  function monday(s) { return addD(s, -((dow(s) + 6) % 7)); }
  function perDay(n) { return n >= 7 ? 30 : n >= 3 ? 20 : 10; }
  function peruToday() { return new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10); }
  /* RACHA-PREVIA-V1 (27-oct, caso Abraham 41 → 1): los días ANTES de `since` (el día del cambio) se cuentan
   * con la regla vieja (cualquier práctica registrada); la meta del grupo rige desde `since` en adelante. */
  function compute(mins, goal, today, since) {
    mins = mins || {}; goal = goal > 0 ? goal : 15; today = today || peruToday();
    var keys = Object.keys(mins).filter(function (k) { return k <= today; }).sort();
    var out = { streak: 0, best: 0, days: [], goal: goal, today: today, todayMin: mins[today] || 0, todayCounts: (mins[today] || 0) >= goal || !!(since && today < since && Object.prototype.hasOwnProperty.call(mins, today)),
      shieldLeft: 1, shieldUsedOn: null, xpDays: {}, xpTotal: 0, isSunday: dow(today) === 0 };
    if (!keys.length) return out;
    var d = keys[0] < addD(today, -WINDOW_DAYS) ? addD(today, -WINDOW_DAYS) : keys[0];
    var cur = 0, best = 0, used = {};
    while (d <= today) {
      var m = mins[d] || 0, st, old = since && d < since && Object.prototype.hasOwnProperty.call(mins, d);
      if (m >= goal || old) { cur++; st = 'on'; out.xpDays[d] = perDay(cur); out.xpTotal += perDay(cur); }
      else if (d === today) st = dow(d) === 0 ? 'free' : 'pending';
      else if (since && d < since) { st = cur > 0 ? 'broke' : 'off'; cur = 0; }   // antes del cambio: regla vieja (sin escudo ni domingo libre)
      else if (dow(d) === 0) st = 'free';
      else if (cur > 0 && !used[monday(d)]) { used[monday(d)] = d; st = 'shield'; }
      else { st = cur > 0 ? 'broke' : 'off'; cur = 0; }
      if (cur > best) best = cur;
      out.days.push({ d: d, m: m, st: st, streak: cur, dow: dow(d) });
      d = addD(d, 1);
    }
    var tw = monday(today);
    out.streak = cur; out.best = best; out.shieldLeft = used[tw] ? 0 : 1; out.shieldUsedOn = used[tw] || null;
    out.left = Math.max(0, goal - out.todayMin);
    return out;
  }
  /* Racha de HOY (la vieja): días seguidos con CUALQUIER práctica, terminando hoy o ayer. Solo para comparar. */
  function legacy(mins, today) {
    today = today || peruToday(); var d = mins[today] != null ? today : addD(today, -1), n = 0;
    while (mins[d] != null) { n++; d = addD(d, -1); }
    return n;
  }
  window.JUCUM_STREAK = { VERSION: 'RACHA-AMABLE-V1', compute: compute, legacy: legacy, perDay: perDay, addD: addD, dow: dow, monday: monday, peruToday: peruToday };
})();
