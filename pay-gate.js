/* JUCUM EC — 💳 Control de pagos · MOTOR ÚNICO (script 30) · PAYGATE-V1
 * Lo usan la plataforma (payments.js) y los materiales (jucum-connect.js).
 * Decide la fase de pago de UN alumno con: control general (app_settings
 * 'payment_control'), su fila de pay_status y sus pagos. Todo en día PERÚ.
 *
 * REGLAS DE SEGURIDAD (pedido de la usuaria: jamás avisar a quien no es deudor):
 *  1. Interruptor general apagado (ctl.on=false, valor por defecto) → nadie ve nada.
 *  2. Antes de ctl.autoFrom solo cuentan los marcados A MANO (debtor=true) y
 *     solo después de que la administradora ENVÍE el aviso (notice_start).
 *  3. Automático: solo grupos con día de pago definido, solo cobros con fecha
 *     ≥ autoFrom y nunca en los primeros 28 días desde que el alumno empezó.
 *  4. Quien subió su captura (por confirmar) sigue practicando mientras se revisa.
 *  5. Si algo no se puede leer (sin red, sin tabla) quien llama trata el
 *     resultado como 'off' → todo normal.
 * V2 (05-oct-2026 · PAYGATE-V2): grupos que no cobran (groups[gid].off), pago
 * rechazado/incompleto por la administradora (row.rejected → pausa, salvo plazo),
 * plazo individual (extension_until) o de GRUPO (groups[gid].pror).
 * Fases: off · ok · ex (exonerado) · pr (prórroga) · rev (en revisión) ·
 *        mark (marcado, aviso sin enviar: el alumno NO ve nada) · nod (grupo sin día) ·
 *        pre (recordatorio amable) · av (aviso con cuenta regresiva) · cl (en pausa)
 */
(function () {
  var DEF = { on: false, avDays: 2, preDays: 3, autoFrom: '', prov: true, groups: {} };
  function peruToday() { return new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10); }
  function peruDayOf(iso) { if (!iso) return ''; var t = Date.parse(iso); return isNaN(t) ? String(iso).slice(0, 10) : new Date(t - 5 * 3600000).toISOString().slice(0, 10); }
  function pd(s) { var a = String(s).split('-').map(Number); return Date.UTC(a[0], a[1] - 1, a[2]); }
  function iso(t) { return new Date(t).toISOString().slice(0, 10); }
  function addDays(s, n) { return iso(pd(s) + n * 864e5); }
  function diff(a, b) { return Math.round((pd(a) - pd(b)) / 864e5); }
  function onDay(y, m, d) { var last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); return iso(Date.UTC(y, m, Math.min(d, last))); }
  function lastDue(today, day) { var y = +today.slice(0, 4), m = +today.slice(5, 7) - 1; var c = onDay(y, m, day); if (c <= today) return c; m--; if (m < 0) { m = 11; y--; } return onDay(y, m, day); }
  function nextDue(today, day) { var y = +today.slice(0, 4), m = +today.slice(5, 7) - 1; var c = onDay(y, m, day); if (c > today) return c; m++; if (m > 11) { m = 0; y++; } return onDay(y, m, day); }
  function cfg(c) { var o = {}; for (var k in DEF) o[k] = DEF[k]; if (c) for (var j in c) o[j] = c[j]; o.avDays = Math.max(1, Math.min(10, parseInt(o.avDays, 10) || 2)); o.preDays = Math.max(0, Math.min(10, parseInt(o.preDays, 10) || 0)); o.groups = o.groups || {}; return o; }
  function R(k, x) { var o = { k: k }; if (x) for (var j in x) o[j] = x[j]; return o; }

  /* pays: [{status, period, registeredAt|registered_at, confirmedAt|confirmed_at}] */
  function classify(ctl, row, pays, gid, today) {
    var c = cfg(ctl); row = row || {}; today = today || peruToday();
    var g = c.groups[gid] || {};
    var r = core(c, row, pays || [], g, today);
    // Plazo de GRUPO: solo protege a quien debe (aviso / pausa)
    if ((r.k === 'av' || r.k === 'cl') && g.pror && today <= g.pror) return R('pr', { payDay: r.payDay, avDays: r.avDays, until: g.pror, group: true, reason: row.rejected || '' });
    return r;
  }
  function core(c, row, pays, g, today) {
    var payDay = parseInt(row.pay_day, 10) || parseInt(g.payDay, 10) || null;
    var base = { payDay: payDay, avDays: c.avDays };
    if (!c.on) return R('off', base);
    if (row.exempt || g.off) return R('ex', base);
    if (row.extension_until && today <= row.extension_until) return R('pr', Object.assign(base, { until: row.extension_until, reason: row.rejected || '' }));
    var regAt = function (p) { return peruDayOf(p.registeredAt || p.registered_at); };
    if (c.prov && pays.some(function (p) { return p.status === 'por_confirmar' && diff(today, regAt(p)) <= 7; })) return R('rev', base);
    if (row.closed_manual) return R('cl', Object.assign(base, { manual: true }));
    if (row.rejected) return R('cl', Object.assign(base, { reason: row.rejected, since: row.extension_until ? addDays(row.extension_until, 1) : '' }));
    if (row.debtor) {
      if (!row.notice_start) return R('mark', base);
      var close = addDays(row.notice_start, c.avDays);
      return today < close ? R('av', Object.assign(base, { close: close, left: diff(close, today), manual: true })) : R('cl', Object.assign(base, { since: close, manual: true }));
    }
    if (!c.autoFrom || today < c.autoFrom) return R('ok', Object.assign(base, { auto: false }));
    if (!payDay) return R('nod', base);
    var join = row.join_date || g.start || '';
    var counts = function (d) { return d >= c.autoFrom && !(join && d < addDays(join, 28)); };
    var paidFor = function (d) {
      if (row.paid_until && row.paid_until >= d) return true;
      var from = addDays(d, -20), mo = d.slice(0, 7);
      return pays.some(function (p) { return p.status === 'confirmado' && (p.period === mo || regAt(p) >= from); });
    };
    var cur = lastDue(today, payDay);
    if (counts(cur) && !paidFor(cur)) {
      var cl = addDays(cur, c.avDays);
      return today < cl ? R('av', Object.assign(base, { due: cur, close: cl, left: diff(cl, today) })) : R('cl', Object.assign(base, { due: cur, since: cl }));
    }
    var nx = nextDue(today, payDay), left = diff(nx, today);
    if (left <= c.preDays && counts(nx) && !paidFor(nx)) return R('pre', Object.assign(base, { due: nx, left: left }));
    return R('ok', Object.assign(base, { next: nx, paidUntil: row.paid_until || null }));
  }

  /* Para materiales (sin supabase-js): lee por REST. Cualquier error → rechaza (= normal). */
  function checkRest(url, key, uid) {
    var H = { apikey: key, Authorization: 'Bearer ' + key };
    var get = function (p) { return fetch(url + '/rest/v1/' + p, { headers: H }).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); }); };
    var u = encodeURIComponent(uid);
    return Promise.all([
      get('app_settings?key=eq.payment_control&select=value'),
      get('pay_status?student_id=eq.' + u),
      get('payments?student_id=eq.' + u + '&select=status,period,registered_at,confirmed_at'),
      get('users?id=eq.' + u + '&select=group_id'),
    ]).then(function (a) {
      var ctl = a[0] && a[0][0] && a[0][0].value;
      if (!ctl) return R('off');
      return classify(ctl, a[1] && a[1][0], a[2] || [], a[3] && a[3][0] && a[3][0].group_id);
    });
  }

  function addMonths(s, n) { var y = +s.slice(0, 4), m = +s.slice(5, 7) - 1 + n, d = +s.slice(8, 10); y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return onDay(y, m, d); }

  window.JUCUM_PAYGATE = { classify: classify, checkRest: checkRest, cfg: cfg, peruToday: peruToday, peruDayOf: peruDayOf, addDays: addDays, addMonths: addMonths, diff: diff, lastDue: lastDue, nextDue: nextDue, DEF: DEF, VERSION: 'PAYGATE-V2' };
})();
