/* 🎓 Grupos finalizados + alumnos egresados + encuesta de cierre (28-sep-2026)
 * - Un grupo finalizado tiene groups.finished_at (script 28). Sus alumnos NO se mueven:
 *   el avance vive en su cuenta. Al entrar ven la pantalla de cierre (StudentGraduated).
 * - Excepciones por alumno: groups.finished_keep = ids que siguen ACTIVOS (recuperación).
 *   "Pasa a otro grupo" = misma cuenta, se cambia group_id (y level) — nunca cuenta nueva.
 * - Encuesta de cierre = tabla exit_surveys (1 fila por alumno, id 'ex-<uid>').
 *   Respuesta "si"/"tal_vez" → lista 🙋 Interesados en continuar + campanita del teacher.
 * Solo claves chiquitas en localStorage (la respuesta propia del alumno). */
(function () {
  var CONTACT = {
    phone: '51935972183', phoneLabel: '935 972 183',
    address: 'Av. Amazonas 934, Tingo María',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Av. Amazonas 934, Tingo María, Perú'),
  };
  var MY_KEY = 'jucum_exit_survey_v1';
  var NEXT = { 'pre-a1': 'A1', 'a1': 'A2', 'a2': 'B1' };
  var QUOTES = [
    ['Little by little, every day.', 'Poco a poco, cada día. Tu esfuerzo de hoy es el inglés de mañana.'],
    ['Every day you practice, you get a little better.', 'Cada día que practicas con esfuerzo, mejoras un poco más.'],
    ['You started. You finished. Now keep going!', 'Empezaste, terminaste… ¡ahora sigue creciendo!'],
    ['Small steps make big journeys.', 'Los pasos pequeños hacen grandes caminos.'],
    ['Your English grows with you.', 'Tu inglés crece contigo, con cada día de esfuerzo.'],
    ['Don\u2019t stop now \u2014 the best is coming.', 'No te detengas ahora: lo mejor está por venir.'],
  ];

  function D() { return window.JUCUM_DATA || {}; }
  function SBc() { return window.JUCUM_SB && window.JUCUM_SB.getClient ? window.JUCUM_SB.getClient() : null; }
  function grp(id) { return (D().GROUPS || []).find(function (g) { return g.id === id; }) || null; }
  function stu(id) { return (D().STUDENTS || []).find(function (s) { return s.id === id; }) || null; }

  function isFinished(g) { if (typeof g === 'string') g = grp(g); return !!(g && g.finishedAt); }
  function keepList(g) { return Array.isArray(g && g.finishedKeep) ? g.finishedKeep : []; }
  function failedList(g) { if (typeof g === 'string') g = grp(g); return Array.isArray(g && g.finishedFailed) ? g.finishedFailed : []; }
  /* ❌ Reprobó (29-sep): egresado con vista de cierre “volver a intentarlo” */
  function isFailed(studentId) {
    var s = stu(studentId); if (!s) return false;
    var g = grp(s.group);
    return isFinished(g) && failedList(g).indexOf(s.id) >= 0;
  }
  function isGraduated(studentId) {
    var s = stu(studentId); if (!s) return false;
    var g = grp(s.group);
    return isFinished(g) && keepList(g).indexOf(s.id) < 0;
  }
  function nextLevel(level) { return NEXT[level] || ''; }
  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(String(iso).slice(0, 10) + 'T12:00:00Z');
    return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  }
  function colErr(e) {
    var m = String((e && e.message) || e || '');
    return /finished_|exit_surveys|column|relation|schema cache/i.test(m)
      ? 'Falta ejecutar el script 28 en Supabase (SQL Editor). ' + m : m;
  }

  /* ⏸ Cierre de avance POR ALUMNO (A1/A2, inscripción por módulo · 29-sep · script 29):
   * users.closed_at / closed_module / closed_msg / closed_reason. Siempre a mano, reversible. */
  function isClosed(studentId) { var s = stu(studentId); return !!(s && s.closedAt); }
  /* PAUSA-SIN-GRUPO-V1 (09-oct · script 33): al cerrar, el alumno sale AUTOMÁTICAMENTE de su grupo y
   * queda SIN grupo (área de espera = group_id null). Misma cuenta → todo su avance intacto.
   * users.closed_group recuerda de dónde salió; al reabrir vuelve solo a ese grupo.
   * NO existe un «grupo de pausa»: no crear uno. homeGroup() = su grupo real (insignias, notas, vitrinas). */
  function homeGroup(s) { if (typeof s === 'string') s = stu(s); return s ? (s.closedGroup || s.group) : null; }
  async function closeStudent(studentId, o) {
    var s = stu(studentId); if (!s) return { ok: false, error: 'Alumno no encontrado' };
    var today = new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10);
    var patch = { closed_at: today, closed_module: o.moduleId || null, closed_msg: o.msg || null, closed_reason: o.reason || null };
    var from = s.closedGroup || s.group, moved = false, warn = '';
    if (from) { patch.closed_group = from; patch.group_id = null; moved = true; }
    var sb = SBc();
    if (sb) {
      var r = await sb.from('users').update(patch).eq('id', studentId);
      if (r.error && moved && /closed_group|column|schema cache/i.test(String(r.error.message || ''))) {
        delete patch.closed_group; delete patch.group_id; moved = false;
        warn = 'Falta ejecutar el script 33 en Supabase: el alumno quedó cerrado pero en su grupo.';
        r = await sb.from('users').update(patch).eq('id', studentId);
      }
      if (r.error) return { ok: false, error: colErr29(r.error) };
    }
    Object.assign(s, { closedAt: today, closedModule: o.moduleId || '', closedMsg: o.msg || '', closedReason: o.reason || '' });
    if (moved) { s.closedGroup = from; s.group = null; }
    return { ok: true, moved: moved, warn: warn };
  }
  async function reopenStudent(studentId) {
    var s = stu(studentId); if (!s) return { ok: false };
    var sb = SBc();
    var back = s.closedGroup && grp(s.closedGroup) ? s.closedGroup : null;
    var patch = { closed_at: null, closed_module: null, closed_msg: null, closed_reason: null };
    if (back) { patch.group_id = back; patch.closed_group = null; }
    if (sb) { var r = await sb.from('users').update(patch).eq('id', studentId); if (r.error) return { ok: false, error: colErr29(r.error) }; }
    Object.assign(s, { closedAt: null, closedModule: '', closedMsg: '', closedReason: '' });
    if (back) { s.group = back; s.closedGroup = ''; }
    return { ok: true, back: back };
  }
  function colErr29(e) {
    var m = String((e && e.message) || e || '');
    return /closed_|column|schema cache/i.test(m) ? 'Falta ejecutar el script 29 en Supabase (SQL Editor). ' + m : m;
  }

  /* groupId, { label, date:'yyyy-mm-dd', msg, msgFail, keep:[ids], failed:[ids], moves:{ studentId: groupId } }
   * failed = reprobaron (se quedan con vista de cierre o, si están en moves, se integran al grupo nuevo). */
  async function finishGroup(groupId, o) {
    var sb = SBc(); var g = grp(groupId); if (!g) return { ok: false, error: 'Grupo no encontrado' };
    var patch = { finished_at: o.date, finished_label: o.label || null, finished_msg: o.msg || null, finished_keep: o.keep || [],
      finished_failed: o.failed || [], finished_msg_fail: o.msgFail || null };
    if (sb) {
      var r = await sb.from('groups').update(patch).eq('id', groupId);
      if (r.error) return { ok: false, error: colErr(r.error) };
    }
    Object.assign(g, { finishedAt: o.date, finishedLabel: o.label || '', finishedMsg: o.msg || '', finishedKeep: o.keep || [],
      finishedFailed: o.failed || [], finishedMsgFail: o.msgFail || '' });
    var moves = o.moves || {}, fails = [];
    for (var sid in moves) {
      var to = grp(moves[sid]); var s = stu(sid); if (!to || !s) continue;
      if (sb) { var u = await sb.from('users').update({ group_id: to.id, level: to.level }).eq('id', sid); if (u.error) { fails.push(s.fullName); continue; } }
      s.group = to.id; s.level = to.level;
      var rep = (o.failed || []).indexOf(sid) >= 0;
      try { if (window.JUCUM_NOTIF) window.JUCUM_NOTIF.pushNotif(sid, { type: 'achievement', title: rep ? '💪 ¡Nueva oportunidad!' : '🎉 ¡Nuevo grupo!', body: 'Ahora estás en ' + to.name + '. Tu avance anterior sigue guardado.' + (rep ? ' ¡Esta vez lo logras!' : '') }); } catch (e) {}
    }
    return { ok: true, fails: fails };
  }
  async function reopenGroup(groupId) {
    var sb = SBc(); var g = grp(groupId); if (!g) return { ok: false };
    if (sb) { var r = await sb.from('groups').update({ finished_at: null, finished_label: null, finished_msg: null, finished_keep: [], finished_failed: [], finished_msg_fail: null }).eq('id', groupId); if (r.error) return { ok: false, error: colErr(r.error) }; }
    Object.assign(g, { finishedAt: null, finishedLabel: '', finishedMsg: '', finishedKeep: [], finishedFailed: [], finishedMsgFail: '' });
    return { ok: true };
  }

  /* ── Encuesta de cierre ── */
  function myCached(studentId) { try { var o = JSON.parse(localStorage.getItem(MY_KEY) || '{}'); return o[studentId] || null; } catch (e) { return null; } }
  function setMyCached(studentId, rec) {
    try { var o = {}; o[studentId] = rec; var v = JSON.stringify(o);
      if (window.JUCUM_STORE) window.JUCUM_STORE.set(MY_KEY, v); else localStorage.setItem(MY_KEY, v); } catch (e) {}
  }
  async function loadMySurvey(studentId) {
    var sb = SBc(); if (!sb) return myCached(studentId);
    try { var r = await sb.from('exit_surveys').select('*').eq('id', 'ex-' + studentId).maybeSingle();
      if (!r.error && r.data) { setMyCached(studentId, r.data); return r.data; } } catch (e) {}
    return myCached(studentId);
  }
  /* data = { rating 1-5, liked:[], improve, wants:'si'|'tal_vez'|'no', schedule:[] } */
  async function saveSurvey(studentId, data) {
    var s = stu(studentId); var g = s ? grp(s.group) : null;
    var prev = myCached(studentId);
    var row = {
      id: 'ex-' + studentId, student_id: studentId, student_name: s ? s.fullName : '',
      group_id: g ? g.id : null, group_name: g ? g.name : '', level: s ? s.level : null,
      finished_label: g ? (g.finishedLabel || '') : '',
      result: isFailed(studentId) ? 'reprobo' : 'aprobo',
      rating: data.rating || null, liked: data.liked || [], improve: data.improve || '',
      wants: data.wants || null, schedule: data.schedule || [],
      status: (prev && prev.status && prev.status !== 'no_continuara') ? prev.status : 'nuevo',
      updated_at: new Date().toISOString(),
    };
    if (data.wants === 'no') row.status = 'no_continuara';
    if (s && s.closedAt) {
      var mods = ((D().MODULE_CATALOG || {})[s.level]) || [];
      var ci = mods.findIndex(function (m) { return m.id === s.closedModule; });
      row.result = 'cerrado';
      if (s.level === 'a1' || s.level === 'a2') {
        /* ⭕ 29-sep-2026 · A1/A2 sin números: lo conseguido / lo que falta por nombre */
        var B = window.JUCUM_BADGES, bl = (B && B.enabledFor(s)) ? B.list(s) : [];
        var nm = function (m) { return String(m.name || '').split(/,|&| - /)[0].trim(); };
        var gotN = bl.filter(function (b) { return b.earned; }).map(function (b) { return nm(b.mod); });
        var misN = bl.filter(function (b) { return !b.earned; }).map(function (b) { return nm(b.mod); });
        row.finished_label = bl.length ? ((gotN.length ? 'Consiguió ' + gotN.join(', ') : 'Sin módulos conseguidos') + (misN.length ? ' · le falta ' + misN.join(', ') : '')) : (ci >= 0 ? 'Cursaba ' + nm(mods[ci]) : 'Avance cerrado');
      } else
      row.finished_label = ci >= 0 ? ('Hasta M' + (ci + 1) + (mods[ci + 1] ? ' · retomar M' + (ci + 2) : '')) : 'Avance cerrado';
    }
    var sb = SBc(); var ok = true, err = '';
    if (sb) { var r = await sb.from('exit_surveys').upsert(row); if (r.error) { ok = false; err = colErr(r.error); } }
    if (ok) {
      setMyCached(studentId, row);
      var wasLead = prev && (prev.wants === 'si' || prev.wants === 'tal_vez');
      if ((row.wants === 'si' || row.wants === 'tal_vez') && !wasLead && window.JUCUM_NOTIF) {
        try { window.JUCUM_NOTIF.pushNotif('teacher', { type: 'lead', link: 'leads',
          title: '🙋 ' + row.student_name + ' quiere continuar',
          body: (row.group_name || '') + (row.schedule.length ? ' · ' + row.schedule.join(', ') : '') + (row.wants === 'tal_vez' ? ' · pide más información' : '') }); } catch (e) {}
      }
    }
    return { ok: ok, error: err, row: row };
  }
  async function loadAllSurveys() {
    var sb = SBc(); if (!sb) return { ok: false, rows: [], error: 'Sin conexión' };
    var r = await sb.from('exit_surveys').select('*').order('updated_at', { ascending: false });
    if (r.error) return { ok: false, rows: [], error: colErr(r.error) };
    return { ok: true, rows: r.data || [] };
  }
  async function setLeadStatus(id, status) {
    var sb = SBc(); if (!sb) return { ok: false };
    var r = await sb.from('exit_surveys').update({ status: status }).eq('id', id);
    return { ok: !r.error, error: r.error ? colErr(r.error) : '' };
  }
  function waLink(text) { return 'https://wa.me/' + CONTACT.phone + (text ? '?text=' + encodeURIComponent(text) : ''); }

  window.JUCUM_GRAD = {
    CONTACT: CONTACT, QUOTES: QUOTES, isFinished: isFinished, isGraduated: isGraduated, keepList: keepList,
    failedList: failedList, isFailed: isFailed, isClosed: isClosed, closeStudent: closeStudent, reopenStudent: reopenStudent,
    nextLevel: nextLevel, fmtDate: fmtDate, finishGroup: finishGroup, reopenGroup: reopenGroup,
    loadMySurvey: loadMySurvey, saveSurvey: saveSurvey, loadAllSurveys: loadAllSurveys, setLeadStatus: setLeadStatus,
    myCached: myCached, waLink: waLink,
  };
})();
