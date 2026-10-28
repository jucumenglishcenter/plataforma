/* 📅 seguimiento.js · SEGUIMIENTO-V1 (28-oct-2026) — aprobado por la usuaria en
 * «Propuesta - Avance de la practica.html» (A–E) y «Propuesta - Seguimiento del alumno.html» (3A + extender + 2B).
 *
 * UNA SOLA función decide si un alumno CUMPLIÓ un set de práctica o una tarea (evalSet / evalTask).
 * La usan TODOS: 📅 Mi seguimiento (alumno), la ficha del alumno (profesor), 📊 Avance de un set,
 * los avisos de Inicio del profesor, la etiqueta del calendario, la 🚨 alerta del alumno y el cierre del set.
 * Prohibido volver a calcular «cumplió / no cumplió» en otro archivo.
 *
 * Fuente = NUBE, filtrada por los alumnos pedidos (REST directo, como jucum-connect: no depende de la librería):
 *   progress (nota) · daily_sessions (DÍA PERÚ real de cada práctica, una fila por día y material) ·
 *   app_settings.practice_plans + pass_threshold · assignments + submissions.
 * Mientras la nube no responde NO hay resultado (null → «Cargando…»): nunca un estado provisional
 * con datos solo locales (lección del bug de racha de Abraham, 27-oct).
 *
 * Reglas (aprobadas):
 *  · Actividad HECHA = la practicó un día entre el 1.er y el último día del set (día Perú del intento real)
 *    y, si tiene nota, la tiene aprobada (umbral del grupo/nivel). Story, Resumen y Diálogo no piden nota.
 *    El Quizlet no cuenta. Hecha solo antes o después de esas fechas = «otro día» (no cuenta).
 *  · Set CUMPLIDO = todas sus actividades hechas · A MEDIAS = cerró con una parte · NO CUMPLIDO = cerró sin nada ·
 *    lo que aún no cierra = EN CURSO (nunca fallado).
 *  · Tarea CUMPLIDA = entregada antes del cierre (y aprobada si tiene nota) · tarde = a medias.
 *  · Solo sets «👥 asignados a alumnos». Los de 🏫 clase (documento) no son tarea. */
(function () {
  'use strict';
  if (window.JUCUM_SEG) return;
  var NOGRADE = { story: 1, summary: 1, quizlet: 1, dialog: 1 };
  var MIN_OF = { story: 15, reading: 15, listening: 14, grammar: 12, summary: 8 };   // = instructivo oficial (practice-guide.js)
  var DEF_THR = { 'pre-a1': 75, a1: 78, a2: 85 };
  var OUT_ST = { retirado: 1, retirada: 1, retired: 1, inactivo: 1, inactiva: 1, inactive: 1, baja: 1, withdrawn: 1 };
  var DOW = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  var MON = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  function J() { return window.JUCUM_DAY; }
  function today() { return J().today(); }
  function addD(s, n) { return J().add(s, n); }
  function diff(a, b) { return Math.round((J().parse(b) - J().parse(a)) / 864e5); }   // b − a en días
  function endMs(day) { return Date.parse(day + 'T23:59:59-05:00'); }                   // fin del día (Perú)
  function eveMs(day) { return Date.parse(addD(day, -1) + 'T19:00:00-05:00'); }          // 7 pm de la víspera
  function fmtDay(d) { if (!d) return ''; var x = J().parse(d); return DOW[x.getDay()] + ' ' + x.getDate() + ' ' + MON[x.getMonth()]; }
  function pct(v) { return (typeof v === 'number' && isFinite(v)) ? Math.max(0, Math.min(100, Math.round(v))) : null; }
  function uniq(a) { var s = {}, o = []; (a || []).forEach(function (x) { if (x != null && x !== '' && !s[x]) { s[x] = 1; o.push(String(x)); } }); return o; }
  function chunk(a, n) { var o = []; for (var i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; }
  function D() { return window.JUCUM_DATA || {}; }

  /* ── nube ── */
  function rest(path) {
    var c = window.JUCUM_CONFIG || {};
    if (!c.SUPABASE_URL || !c.SUPABASE_ANON_KEY) return Promise.reject(new Error('sin conexión a la nube'));
    return fetch(c.SUPABASE_URL + '/rest/v1/' + path, { headers: { apikey: c.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + c.SUPABASE_ANON_KEY }, cache: 'no-store' })
      .then(function (r) { if (!r.ok) return r.text().then(function (t) { throw new Error('nube ' + r.status + ' ' + String(t).slice(0, 120)); }); return r.json(); });
  }
  function paged(path) {   // Supabase corta en 1000 filas: se pagina SIEMPRE (orden estable en path)
    var PAGE = 1000, all = [];
    function page(off) { return rest(path + '&limit=' + PAGE + '&offset=' + off).then(function (rows) { rows = rows || []; all = all.concat(rows); return rows.length < PAGE ? all : page(off + PAGE); }); }
    return page(0);
  }
  /* Tarea 🏫 de clase (documento): «mode":"class"» dentro del bloque oculto (codificado con encodeURIComponent). */
  var CLASS_LIKE = encodeURIComponent('*' + encodeURIComponent('"mode":"class"') + '*');
  function stamp(r) { return String((r && (r.savedAt || r.updatedAt || r.createdAt)) || ''); }
  function mergePlans(cloud, local) {   // misma regla que teacher-tools (cloudMerge): por id, gana la marca más nueva
    var m = {}, o = [];
    (cloud || []).forEach(function (r) { if (r && r.id) m[r.id] = r; });
    (local || []).forEach(function (r) { if (r && r.id && (!m[r.id] || stamp(r) > stamp(m[r.id]))) m[r.id] = r; });
    Object.keys(m).forEach(function (k) { if (!m[k]._deleted) o.push(m[k]); });
    var TT = window.JUCUM_TT;
    return TT && TT.fixPlanRL ? o.map(function (p) { try { return TT.fixPlanRL(p); } catch (e) { return p; } }) : o;
  }
  function localRawPlans() { try { var v = JSON.parse(localStorage.getItem('jucum_practice_plans_v1') || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }

  function fetchFacts(ids, since, groups) {
    ids = uniq(ids); groups = uniq(groups);
    var F = { at: 0, since: since, ids: ids, groups: groups, plans: [], tasks: [], thr: null, prog: {}, days: {}, dayAct: {}, subs: {} };
    var jobs = [], cloudPlans = null;
    jobs.push(rest('app_settings?select=key,value&key=in.(practice_plans,pass_threshold)').then(function (rows) {
      (rows || []).forEach(function (r) {
        if (r.key === 'practice_plans' && Array.isArray(r.value)) cloudPlans = r.value;
        if (r.key === 'pass_threshold' && r.value && typeof r.value === 'object') F.thr = r.value;
      });
    }));
    chunk(ids, 40).forEach(function (c) {
      var inl = 'in.(' + c.join(',') + ')';
      jobs.push(paged('progress?select=user_id,module_id,activity_id,score,completed_at&user_id=' + inl + '&order=user_id,module_id,activity_id').then(function (rows) {
        rows.forEach(function (r) { var u = F.prog[r.user_id] = F.prog[r.user_id] || {}; u[r.module_id + ':' + r.activity_id] = { score: r.score, day: J().of(r.completed_at) }; });
      }));
      jobs.push(paged('daily_sessions?select=user_id,day,module_id,activity_id&user_id=' + inl + '&day=gte.' + since + '&order=user_id,day,module_id,activity_id').then(function (rows) {
        rows.forEach(function (r) {
          if (!r.day || !r.module_id || !r.activity_id) return;
          var k = r.module_id + ':' + r.activity_id, d = String(r.day);
          var u = F.days[r.user_id] = F.days[r.user_id] || {}; (u[k] = u[k] || []).push(d);
          var a = F.dayAct[r.user_id] = F.dayAct[r.user_id] || {}; (a[d] = a[d] || {})[k] = 1;
        });
      }));
      jobs.push(paged('submissions?select=assignment_id,student_id,submitted_at,status,grade&student_id=' + inl + '&order=id').then(function (rows) {
        rows.forEach(function (r) { if (String(r.status || '') === 'draft') return; (F.subs[r.student_id] = F.subs[r.student_id] || {})[r.assignment_id] = { at: r.submitted_at, status: r.status, grade: r.grade }; });
      }));
    });
    if (groups.length) {
      var gin = 'in.(' + groups.join(',') + ')', cls = {}, list = [];
      jobs.push(paged('assignments?select=id&group_id=' + gin + '&description=like.' + CLASS_LIKE + '&order=id').then(function (rows) { rows.forEach(function (r) { cls[r.id] = 1; }); }));
      jobs.push(paged('assignments?select=id,group_id,target_student_ids,title,due_at,gradable&group_id=' + gin + '&order=id').then(function (rows) { list = rows; }));
      jobs.push(Promise.all(jobs.slice(-2)).then(function () {
        F.tasks = list.filter(function (a) { return a.due_at && !cls[a.id]; }).map(function (a) {
          return { id: a.id, groupId: a.group_id, targets: Array.isArray(a.target_student_ids) ? a.target_student_ids.map(String) : [], title: a.title || 'Tarea', dueAt: a.due_at, gradable: !!a.gradable };
        });
      }));
    }
    return Promise.all(jobs).then(function () {
      Object.keys(F.days).forEach(function (u) { Object.keys(F.days[u]).forEach(function (k) { F.days[u][k].sort(); }); });
      F.plans = mergePlans(cloudPlans || [], localRawPlans());
      F.at = Date.now();
      return F;
    });
  }

  /* ── caché en memoria (nada en localStorage) ── */
  var CACHE = {};
  function ckey(o) { return uniq(o.ids).sort().join(',') + '|' + uniq(o.groups).sort().join(','); }
  function peek(o) {   // lo ya traído de la nube (fresco), sin pedir nada
    o = o || {}; var since = o.since || addD(today(), -45), c = CACHE[ckey(o)];
    return c && c.F && c.F.since <= since && Date.now() - c.F.at < (o.ttl || 120000) ? c.F : null;
  }
  function load(o) {
    o = o || {};
    var since = o.since || addD(today(), -45), key = ckey(o), c = CACHE[key];
    if (!o.force && peek(o)) return Promise.resolve(c.F);
    if (c && c.p && c.since <= since && (!o.force || Date.now() - c.t0 < 5000)) return c.p;   // ya hay una consulta en vuelo
    var p = fetchFacts(o.ids, since, o.groups).then(function (F) { CACHE[key] = { F: F }; return F; }, function (e) { if (CACHE[key] && CACHE[key].p === p) CACHE[key] = { F: CACHE[key].F }; throw e; });
    CACHE[key] = { F: c && c.F, p: p, since: since, t0: Date.now() };
    return p;
  }
  function invalidate() { CACHE = {}; try { window.dispatchEvent(new Event('jucum-seg-change')); } catch (e) {} }

  /* ── catálogo / alumnos ── */
  function findAct(level, mid, aid) {
    var cat = D().MODULE_CATALOG || {}, lvls = [level].concat(Object.keys(cat));
    for (var i = 0; i < lvls.length; i++) {
      var m = (cat[lvls[i]] || []).find(function (x) { return x.id === mid; });
      if (m) { var a = (m.activities || []).find(function (x) { return x.id === aid; }); return { mod: m, a: a || null }; }
    }
    return null;
  }
  function typeOf(a, level) { if (a.type) return a.type; var f = findAct(level, a.moduleId, a.activityId); return f && f.a ? f.a.type : ''; }
  function actName(a, level) { var f = findAct(level, a.moduleId, a.activityId); return a.label || (f && f.a ? f.a.name : a.activityId); }
  function modName(level, mid) { var f = findAct(level, mid, ''); return f ? f.mod.name : mid; }
  function thrFor(F, st) {
    var t = (F && F.thr) || {};
    if (t.__groups && t.__groups[st.group] != null) return t.__groups[st.group];
    if (t[st.level] != null) return t[st.level];
    return DEF_THR[st.level] != null ? DEF_THR[st.level] : 75;
  }
  function isOut(s) {
    if (OUT_ST[String(s.status || '').toLowerCase()]) return true;
    if (s.closedAt) return true;
    try { var G = window.JUCUM_GRAD; if (G && G.isGraduated && G.isGraduated(s.id)) return true; } catch (e) {}
    return false;
  }
  function joined(s) { return s && s.createdAt ? J().of(s.createdAt) : ''; }
  function sName(s) { return (s && (s.fullName || s.name || s.username)) || 'Alumno'; }

  /* ── sets ── */
  function range(p) {
    var ds = ((p && p.dates) || []).filter(function (d) { return /^\d{4}-\d{2}-\d{2}$/.test(String(d)); }).map(String).sort();
    return ds.length ? { from: ds[0], to: ds[ds.length - 1], ndays: diff(ds[0], ds[ds.length - 1]) + 1 } : null;
  }
  function assigned(p) { return !!p && p.assignToStudents !== false && !!range(p); }
  function setActs(p, sid, level) {
    var seen = {}, out = [];
    function add(a, carried) {
      if (!a || !a.moduleId || !a.activityId) return;
      var t = typeOf(a, level); if (t === 'quizlet' || a.activityId === 'quizlet') return;   // el Quizlet no cuenta
      var k = a.moduleId + ':' + a.activityId; if (seen[k]) return; seen[k] = 1;
      out.push({ a: a, k: k, type: t, carried: !!carried });
    }
    ((p && p.activities) || []).forEach(function (a) { add(a, false); });
    if (sid && p && p.carry && Array.isArray(p.carry[sid])) p.carry[sid].forEach(function (a) { add(a, true); });
    return out;
  }
  function elsewhere(dact, a, r, level) {
    var out = [];
    Object.keys(dact || {}).forEach(function (d) {
      if (d < r.from || d > r.to) return;
      Object.keys(dact[d]).forEach(function (k) {
        var i = k.lastIndexOf(':'), mid = k.slice(0, i);
        if (k.slice(i + 1) !== a.activityId || mid === a.moduleId || out.some(function (x) { return x.moduleId === mid; })) return;
        out.push({ moduleId: mid, name: modName(level, mid), day: d });
      });
    });
    return out;
  }
  /* ⭐ LA función: ¿cumplió este alumno este set? */
  function evalSet(p, st, F, day) {
    var r = range(p); if (!r || !st) return null;
    var t = day || today(), uid = String(st.id), prog = (F.prog || {})[uid] || {}, days = (F.days || {})[uid] || {}, dact = (F.dayAct || {})[uid] || {};
    var thr = thrFor(F, st), cells = [];
    setActs(p, uid, st.level).forEach(function (x) {
      var a = x.a, e = prog[x.k] || null;
      var pd = (days[x.k] || []).slice(); if (e && e.day && pd.indexOf(e.day) < 0) pd.push(e.day); pd.sort();
      var sc = e ? pct(e.score) : null;
      var passed = !!e && (NOGRADE[x.type] || sc == null || sc >= thr);
      /* «solo para quien aún no lo aprobó»: si ya lo tenía aprobado antes del set, ni lo vio → no se le pide */
      if (a.onlyPending && !x.carried && passed && e.day && e.day < r.from && !pd.some(function (d) { return d >= r.from; })) return;
      var c = { k: x.k, a: a, type: x.type, name: actName(a, st.level), carried: x.carried, sc: NOGRADE[x.type] ? null : sc, min: MIN_OF[x.type] || 10, s: 'pend', d: null };
      var inWin = pd.filter(function (d) { return d >= r.from && d <= r.to; });
      if (e && inWin.length) { c.s = passed ? 'ok' : 'low'; c.d = inWin[inWin.length - 1]; }
      else {
        var wm = elsewhere(dact, a, r, st.level);
        if (wm.length) { c.s = 'mod'; c.wm = wm; c.d = wm[0].day; c.late = !!e && pd.some(function (d) { return d > r.to; }); }
        else if (e) { var late = pd.filter(function (d) { return d > r.to; }); c.s = late.length ? 'late' : 'prev'; c.d = late.length ? late[late.length - 1] : (pd[pd.length - 1] || null); }
      }
      cells.push(c);
    });
    if (!cells.length) return null;
    var n = function (s) { return cells.filter(function (c) { return c.s === s; }).length; };
    var ok = n('ok'), low = n('low'), late = cells.filter(function (c) { return c.s === 'late' || c.late; }).length;
    var phase = t < r.from ? 'fut' : t > r.to ? 'closed' : 'open';
    var state = ok === cells.length ? 'ok' : phase === 'fut' ? 'fut' : phase === 'open' ? 'run' : (ok + low + late > 0 ? 'half' : 'no');
    var missing = cells.filter(function (c) { return c.s !== 'ok'; });
    return { kind: 'set', id: p.id, plan: p, title: p.title || 'Práctica', from: r.from, to: r.to, ndays: r.ndays, phase: phase, state: state,
      cells: cells, total: cells.length, done: ok, low: low, late: late, started: ok + low + late > 0, missing: missing,
      minLeft: missing.reduce(function (s, c) { return s + c.min; }, 0), day: r.from };
  }
  /* ⭐ LA función para tareas */
  function evalTask(tk, st, F, nowMs) {
    if (!tk || !tk.dueAt || !st) return null;
    var now = nowMs || Date.now(), due = Date.parse(tk.dueAt); if (!isFinite(due)) return null;
    var sub = ((F.subs || {})[String(st.id)] || {})[tk.id] || null, thr = thrFor(F, st);
    var g = sub ? pct(sub.grade) : null, state, note;
    if (sub) {
      var at = Date.parse(sub.at);
      if (isFinite(at) && at > due) { state = 'half'; note = 'la entregó tarde (' + fmtDay(J().of(at)) + ')' + (g != null ? ' · nota ' + g : ''); }
      else if (g != null && String(sub.status) === 'graded' && g < thr) { state = 'half'; note = 'nota ' + g + ' · no aprobó'; }
      else { state = 'ok'; note = g != null ? 'nota ' + g : 'entregada'; }
    } else { state = now > due ? 'no' : 'run'; note = now > due ? 'no la entregó' : 'por entregar'; }
    return { kind: 'task', id: tk.id, title: tk.title, day: J().of(due), to: J().of(due), due: tk.dueAt, phase: now > due ? 'closed' : 'open', state: state, note: note, grade: g, total: 1, done: state === 'ok' ? 1 : 0 };
  }
  /* Todo lo que le dejaron a UN alumno (sets de su grupo + tareas), ya evaluado */
  function studentItems(st, F, day) {
    if (!st || !F) return [];
    var t = day || today(), j = joined(st), out = [];
    (F.plans || []).forEach(function (p) {
      if (p.groupId !== st.group || !assigned(p)) return;
      var r = range(p); if (j && r.to < j) return;   // aún no era del grupo
      var ev = evalSet(p, st, F, t); if (ev) out.push(ev);
    });
    (F.tasks || []).forEach(function (tk) {
      if (tk.groupId !== st.group || (tk.targets.length && tk.targets.indexOf(String(st.id)) < 0)) return;
      var ev = evalTask(tk, st, F); if (ev && !(j && ev.day < j)) out.push(ev);
    });
    return out.sort(function (a, b) { return a.day < b.day ? -1 : a.day > b.day ? 1 : 0; });
  }
  /* ── grupo (📊 Avance · Inicio · calendario) ── */
  function groupStudents(gid, toDay) {
    return (D().STUDENTS || []).filter(function (s) { return s.group === gid && !isOut(s) && !(toDay && joined(s) && joined(s) > toDay); })
      .sort(function (a, b) { return sName(a).localeCompare(sName(b)); });
  }
  function evalGroupSet(p, F, day) {
    var r = range(p); if (!r) return null;
    var t = day || today(), studs = groupStudents(p.groupId, r.to);
    var g = D().GROUPS ? (D().GROUPS || []).find(function (x) { return x.id === p.groupId; }) : null;
    var acts = setActs(p, null, g ? g.level : '');
    var rows = studs.map(function (s) { return { st: s, ev: evalSet(p, s, F, t) }; }).filter(function (x) { return x.ev; });
    var full = rows.filter(function (x) { return x.ev.state === 'ok'; }).length, none = rows.filter(function (x) { return !x.ev.started; }).length;
    var col = acts.map(function (x) { return rows.filter(function (y) { var c = y.ev.cells.find(function (z) { return z.k === x.k; }); return c && c.s === 'ok'; }).length; });
    var mn = Math.min.apply(null, col.length ? col : [0]), mx = Math.max.apply(null, col.length ? col : [0]);
    var hard = col.length > 1 && mn !== mx ? col.indexOf(mn) : -1;
    return { plan: p, title: p.title || 'Práctica', groupId: p.groupId, group: g, from: r.from, to: r.to, ndays: r.ndays,
      phase: t < r.from ? 'fut' : t > r.to ? 'closed' : 'open', acts: acts, rows: rows, n: rows.length, full: full, none: none,
      part: rows.length - full - none, started: rows.length - none, col: col, hard: hard,
      missingRows: rows.filter(function (x) { return x.ev.state !== 'ok'; }) };
  }
  function endsTxt(to, t) { return to === t ? 'cierra hoy' : to === addD(t, 1) ? 'cierra mañana' : to < t ? 'ya cerró' : 'cierra el ' + fmtDay(to); }
  function alertOf(G, day) {
    var t = day || today(); if (!G || G.phase !== 'open' || !G.n) return null;
    var miss = G.n - G.full;
    if (miss > 0 && (G.to === t || G.to === addD(t, 1))) return { k: 'end', ic: '⏰', t: G.to === t ? 'Termina hoy' : 'Termina mañana', card: 'amb', tone: miss / G.n > 0.5 ? 'red' : 'amb' };
    var el = diff(G.from, t);
    if (el >= 1 && G.started === 0) return { k: 'none', ic: '🚫', t: 'Nadie lo empezó', card: 'red', tone: 'red' };
    if (el >= G.ndays / 2 && G.full / G.n < 0.7) return { k: 'most', ic: '⚠', t: 'La mayoría no lo hace', card: 'red', tone: 'amb' };
    return null;
  }
  function chipOf(G, day) {
    var t = day || today(); if (!G || !G.n || G.phase === 'fut') return null;
    var rate = G.full / G.n;
    if (G.phase === 'closed') return { tone: rate >= 0.7 ? 'grn' : rate >= 0.4 ? 'amb' : 'red', txt: '🏁 ' + G.full + '/' + G.n + ' · cerró' };
    var al = alertOf(G, t);
    if (al) return { tone: al.tone, txt: G.full + '/' + G.n + ' · ' + (al.k === 'end' ? endsTxt(G.to, t) : al.k === 'none' ? 'nadie lo empezó' : 'va lento') };
    return { tone: 'grn', txt: G.full + '/' + G.n + ' · va bien' };
  }
  function nextSetOf(p, plans) {
    var r = range(p); if (!r) return null;
    return (plans || []).filter(function (x) { return x.id !== p.id && x.groupId === p.groupId && assigned(x) && range(x).from > r.to; })
      .sort(function (a, b) { return range(a).from < range(b).from ? -1 : 1; })[0] || null;
  }
  /* Sets que interesan HOY al profesor: abiertos o cerrados hace ≤ 3 días (cierre E) */
  function relevantPlans(plans, day) {
    var t = day || today();
    return (plans || []).filter(function (p) { if (!assigned(p)) return false; var r = range(p); return r.from <= t && r.to >= addD(t, -3); });
  }
  function sinceFor(plans, day) {
    var t = day || today(), s = addD(t, -14);
    (plans || []).forEach(function (p) { var r = range(p); if (r && r.from < s) s = r.from; });
    return s;
  }
  /* 🚨 2B · alerta del alumno: desde las 7 pm de la víspera del cierre hasta que termine (o cierre) */
  function alarmFor(st, F, nowMs) {
    var now = nowMs || Date.now(), t = J().of(now);
    return studentItems(st, F, t).filter(function (x) { return x.kind === 'set' && x.phase === 'open' && x.state !== 'ok' && !x.plan.noAlarm && now >= eveMs(x.to) && now <= endMs(x.to); })
      .sort(function (a, b) { return a.to < b.to ? -1 : 1; })[0] || null;
  }

  /* ── acciones del profesor (escriben el set con savedAt → la fusión sin pérdidas lo respeta) ── */
  function TT() { return window.JUCUM_TT; }
  function notify(ids, title, body) {
    var N = window.JUCUM_NOTIF; if (!N) return 0; var n = 0;
    (ids || []).forEach(function (x) { try { N.pushNotif(x.id, { type: 'daily-reminder', link: 'practica', title: title, body: body + (x.miss && x.miss.length ? ' Te falta: ' + x.miss.join(' · ') + '.' : '') }); n++; } catch (e) {} });
    return n;
  }
  function missList(G) { return G.missingRows.map(function (x) { return { id: x.st.id, name: sName(x.st), miss: x.ev.missing.map(function (c) { return c.name; }) }; }); }
  function remindText(G, day) { var t = day || today(); return '⏰ Tu práctica «' + G.title + '» ' + endsTxt(G.to, t) + '. ¡' + (G.to <= addD(t, 1) ? 'Termínala hoy' : 'No la dejes para el final') + '! 💪'; }
  function remind(G, text) {
    var n = notify(missList(G), '⏰ Recordatorio de tu práctica', text || remindText(G));
    try { TT().updatePracticePlan(G.plan.id, { remindedAt: new Date().toISOString(), remindedN: n }); } catch (e) {}
    invalidate(); return n;
  }
  function extend(G, newTo, avisar) {
    var p = G.plan, r = range(p); if (!r || !newTo || newTo <= r.to) return false;
    var ds = (p.dates || []).slice(); for (var d = addD(r.to, 1); d <= newTo; d = addD(d, 1)) ds.push(d);
    try { TT().updatePracticePlan(p.id, { dates: ds, extendedAt: new Date().toISOString(), extendedFrom: r.to }); } catch (e) { return false; }
    if (avisar) notify(missList(G), '⏳ Tu práctica sigue abierta', '«' + G.title + '» ahora cierra el ' + fmtDay(newTo) + '. ¡Aprovecha para terminarla! 💪');
    invalidate(); return true;
  }
  function setAlarm(p, on) { try { TT().updatePracticePlan(p.id, { noAlarm: !on }); } catch (e) { return false; } invalidate(); return true; }
  /* E · «➡ Pasar lo pendiente al próximo set»: solo a quienes no lo terminaron, en `carry` del set siguiente */
  function carryToNext(G, plans) {
    var nx = nextSetOf(G.plan, plans); if (!nx) return null;
    var carry = Object.assign({}, nx.carry || {}), n = 0;
    G.missingRows.forEach(function (x) {
      var add = x.ev.cells.filter(function (c) { return c.s === 'pend' || c.s === 'low' || c.s === 'mod'; })
        .map(function (c) { return { moduleId: c.a.moduleId, activityId: c.a.activityId, label: c.name, type: c.type, from: G.plan.id }; });
      if (!add.length) return;
      var cur = (carry[x.st.id] || []).slice();
      add.forEach(function (a) { if (!cur.some(function (b) { return b.moduleId === a.moduleId && b.activityId === a.activityId; })) cur.push(a); });
      carry[x.st.id] = cur; n++;
    });
    try {
      TT().updatePracticePlan(nx.id, { carry: carry });
      TT().updatePracticePlan(G.plan.id, { carriedTo: nx.id, carriedAt: new Date().toISOString(), carriedN: n });
    } catch (e) { return null; }
    invalidate(); return { next: nx, n: n };
  }

  var SEEN_KEY = 'jucum_seg_cierre_visto_v1';   // clave chica: ids de cierres ya vistos en Inicio
  function seenClose(id) { try { return (JSON.parse(localStorage.getItem(SEEN_KEY) || '[]') || []).indexOf(id) >= 0; } catch (e) { return false; } }
  function markSeenClose(id) { try { var a = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]') || []; if (a.indexOf(id) < 0) a.push(id); a = a.slice(-60); if (window.JUCUM_STORE) window.JUCUM_STORE.setJSON(SEEN_KEY, a); else localStorage.setItem(SEEN_KEY, JSON.stringify(a)); } catch (e) {} }

  window.JUCUM_SEG = {
    load: load, peek: peek, invalidate: invalidate, fetchFacts: fetchFacts,
    evalSet: evalSet, evalTask: evalTask, studentItems: studentItems, evalGroupSet: evalGroupSet, groupStudents: groupStudents,
    alertOf: alertOf, chipOf: chipOf, alarmFor: alarmFor, nextSetOf: nextSetOf, relevantPlans: relevantPlans, sinceFor: sinceFor,
    remind: remind, remindText: remindText, extend: extend, setAlarm: setAlarm, carryToNext: carryToNext, missList: missList,
    range: range, assigned: assigned, setActs: setActs, isOut: isOut, sName: sName, fmtDay: fmtDay, endsTxt: endsTxt, endMs: endMs, eveMs: eveMs, diff: diff, addD: addD, today: today,
    seenClose: seenClose, markSeenClose: markSeenClose, MIN_OF: MIN_OF, NOGRADE: NOGRADE
  };
})();
