/* 🏅 Insignias de módulo · A1 / A2 (29-sep-2026)
 * Una insignia = el alumno APROBÓ el examen del módulo (nota oficial ≥ nota mínima del grupo,
 * o nota manual aprobada). Si el módulo no tiene examen, cuenta haber completado el 100%
 * de sus actividades. No escribe nada en Supabase: se calcula con las notas que ya existen.
 * Celebración: una vez por insignia (marca chiquita en localStorage) + notificación de ánimo.
 * Aprobado en "Propuesta - Insignias de modulo y cierre de avance.html" (estilo A dorado). */
(function () {
  var LEVELS_ON = { a1: true, a2: true };
  var SEEN_KEY = 'jucum_badges_seen_v1';

  function D() { return window.JUCUM_DATA || {}; }
  function enabledFor(student) { return !!(student && LEVELS_ON[student.level]); }

  function examScore(student, mod) {
    var F = window.JUCUM_EXAMFLOW, X = window.JUCUM_EXAMS;
    if (!F || !X || !F.infoForModule) return null;
    var inf; try { inf = F.infoForModule(student, mod); } catch (e) { return null; }
    var exam = inf && inf.exam; if (!exam) return null;
    var min = F.minGradeFor ? F.minGradeFor(student.group) : 75;
    var win = X.windowForExamGroup ? X.windowForExamGroup(exam.id, student.group) : null;
    var man = (win && win.results) ? win.results[student.id] : null;
    if (man && typeof man.grade === 'number') return { exam: exam, score: man.grade, passed: man.grade >= min, date: man.date || null };
    if (man && man.passed) return { exam: exam, score: null, passed: true, date: man.date || null };
    var comp = ((D().getStudentProgress && D().getStudentProgress(student.id)) || {}).completed || {};
    var pre = 'exam-' + exam.id + ':';
    var rows = Object.keys(comp).filter(function (k) { return k.indexOf(pre) === 0; }).map(function (k) {
      var part = k.split(':').slice(1).join(':');
      return { score: (comp[k] || {}).score, date: (comp[k] || {}).date, part: F.canonPart ? F.canonPart(exam, part) : part };
    }).filter(function (r) { return typeof r.score === 'number'; });
    if (!rows.length) return { exam: exam, score: null, passed: false };
    var ret = F.getRet ? F.getRet(student.group, mod.id) : null;
    var desde = F.examDesde ? F.examDesde(exam) : null;
    var of = F.notaOficialPartes ? F.notaOficialPartes(rows, ret, desde) : (F.notaOficial ? F.notaOficial(rows, ret, desde) : null);
    if (!of) return { exam: exam, score: null, passed: false };
    var sc = of.score;
    if (F.notaExamen) { var adj = F.notaExamen(exam, of); if (adj && adj.parcial) sc = adj.score; }
    return { exam: exam, score: sc, passed: sc >= min, date: of.date || null };
  }

  function allActsDone(student, mod) {
    var d = D(); var comp = ((d.getStudentProgress && d.getStudentProgress(student.id)) || {}).completed || {};
    var acts = mod.activities || []; if (!acts.length) return null;
    var last = null;
    for (var i = 0; i < acts.length; i++) {
      var e = comp[mod.id + ':' + acts[i].id];
      var ok = e && (d.entryPassed ? d.entryPassed(e, student.level, student.group) : true);
      if (!ok) return null;
      if (e.date && (!last || e.date > last)) last = e.date;
    }
    return { date: last };
  }

  /* [{ mod, index, earned, score, date, via:'exam'|'acts' }] para todo el nivel */
  function list(student) {
    if (!enabledFor(student)) return [];
    if (student.closedGroup && student.closedGroup !== student.group) student = Object.assign({}, student, { group: student.closedGroup });  // PAUSA-GRUPO-V1: notas con su grupo real
    var mods = (D().MODULE_CATALOG || {})[student.level] || [];
    return mods.map(function (m, i) {
      var ex = examScore(student, m);
      if (ex) return { mod: m, index: i, earned: !!ex.passed, score: ex.score, date: ex.date, via: 'exam' };
      var a = allActsDone(student, m);
      return { mod: m, index: i, earned: !!a, score: null, date: a ? a.date : null, via: 'acts' };
    });
  }
  function earnedIds(student) { return list(student).filter(function (b) { return b.earned; }).map(function (b) { return b.mod.id; }); }

  function seen(uid) { try { var o = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}'); return Array.isArray(o[uid]) ? o[uid] : []; } catch (e) { return []; } }
  function markSeen(uid, modId) {
    try {
      var o = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}'); if (!o || typeof o !== 'object') o = {};
      var a = Array.isArray(o[uid]) ? o[uid] : []; if (a.indexOf(modId) < 0) a.push(modId); o[uid] = a;
      var v = JSON.stringify(o);
      if (window.JUCUM_STORE) window.JUCUM_STORE.set(SEEN_KEY, v); else localStorage.setItem(SEEN_KEY, v);
    } catch (e) {}
  }
  /* Insignias ganadas que este equipo aún no celebró (en orden de módulo) */
  function pending(student) {
    var s = seen(student.id);
    return list(student).filter(function (b) { return b.earned && s.indexOf(b.mod.id) < 0; });
  }

  function cheer(n, total, name, levelCode) {
    if (n >= total) return { t: '🏆 ¡Nivel ' + levelCode + ' completo!', b: 'Juntaste las ' + total + ' insignias. ¡Eres imparable!' };
    if (n === 1) return { t: '🏅 ¡Tu primera insignia!', b: 'Conseguiste ' + name + '. Así empieza tu colección.' };
    if (n * 2 > total && (n - 1) * 2 <= total) return { t: '🌟 ¡Más de la mitad!', b: 'Llevas ' + n + ' de ' + total + ' insignias de ' + levelCode + '. ¡Ya casi!' };
    return { t: '🏅 ¡Ya van ' + n + '!', b: name + ' se suma a tu colección. Cada día con esfuerzo mejoras más.' };
  }
  /* Llamar al cerrar la celebración de UNA insignia: marca vista + notificación de ánimo (sin duplicar) */
  function celebrated(student, badge) {
    markSeen(student.id, badge.mod.id);
    try {
      var N = window.JUCUM_NOTIF; if (!N) return;
      var all = list(student); var total = Math.max(all.length, (D().getLevelOutline ? D().getLevelOutline(student.level).length : 0));   // 5 módulos del nivel aunque falten en el catálogo
      var n = all.filter(function (b) { return b.earned && b.index <= badge.index; }).length;
      var lv = ((D().LEVELS || {})[student.level] || {}).code || '';
      var c = cheer(n, total, badge.mod.name, lv);
      var dup = (N.getNotifs(student.id) || []).some(function (x) { return x && x.type === 'badge' && String(x.body || '').indexOf(badge.mod.name) >= 0; });
      if (!dup) N.pushNotif(student.id, { type: 'badge', title: c.t, body: c.b + ' (M' + (badge.index + 1) + ' · ' + badge.mod.name + ')' });
      if (window.JUCUM_DATA && window.JUCUM_DATA.addBonusXP) { try { window.JUCUM_DATA.addBonusXP(student.id, 20, 'Insignia ' + badge.mod.name); } catch (e) {} }
    } catch (e) {}
  }

  window.JUCUM_BADGES = { enabledFor: enabledFor, list: list, earnedIds: earnedIds, pending: pending, celebrated: celebrated, markSeen: markSeen };
})();
