/* JUCUM EC — Herramientas del profesor
 * Práctica del día (por grupo/día), bitácora de clase (qué material usó y cuánto
 * tiempo), notas por alumno / observaciones de clase, y recordatorios personales.
 * localStorage como caché; Supabase best-effort para la bitácora (la escriben
 * los materiales vía jucum-connect, por eso necesita nube) y el resto.
 */
(function () {
  const DP_KEY  = 'jucum_daily_practice_v1';   // { [groupId]: { [weekday]: [items] } }
  const DPR_KEY = 'jucum_directed_practice_v1'; // [ {id, groupId, openDate, dueDate, activities, bonusXp, createdAt} ]
  const CL_KEY  = 'jucum_class_log_v1';         // array de usos de material en clase
  const NOTE_KEY= 'jucum_teacher_notes_v1';     // array de notas
  const REM_KEY = 'jucum_teacher_reminders_v1'; // array de recordatorios

  const j = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch { return d; } };
  const w = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  /* ── Práctica del día ───────────────────────────────────────────── */
  function getDailyAll() { return j(DP_KEY, {}); }
  function getDailyPractice(groupId, weekday) {
    const all = getDailyAll();
    return (all[groupId] && all[groupId][weekday]) || [];
  }
  function setDailyPractice(groupId, weekday, items) {
    const all = getDailyAll();
    all[groupId] = all[groupId] || {};
    all[groupId][weekday] = items;
    w(DP_KEY, all);
    cloudSetting('daily_practice', all);
  }
  /* Lo que el alumno puede practicar HOY: lo que dejó el profesor para su grupo
   * en el día de la semana actual; si no hay nada, una sugerencia genérica. */
  function getTodayPracticeForStudent(student) {
    const wd = new Date().getDay();
    const set = getDailyPractice(student.group, wd);
    if (set && set.length) return { items: set, isGeneric: false };
    return { items: genericPractice(student), isGeneric: true };
  }
  function genericPractice(student) {
    const D = window.JUCUM_DATA;
    const out = [];
    try {
      const settings = D.getGroupSettings(student.group);
      const mods = D.MODULE_CATALOG[student.level] || [];
      const activeIds = settings.activeModuleIds || (settings.activeModuleId ? [settings.activeModuleId] : []);
      const mod = mods.find(m => activeIds.includes(m.id)) || mods[0];
      const prog = D.getStudentProgress(student.id);
      if (mod) {
        const next = (mod.activities || []).find(a => !prog.completed[`${mod.id}:${a.id}`]) || mod.activities[0];
        if (next) out.push({ moduleId: mod.id, activityId: next.id, label: `Continúa tu módulo: ${next.name}`, type: next.type });
        const listen = (mod.activities || []).find(a => a.type === 'listening');
        if (listen) out.push({ moduleId: mod.id, activityId: listen.id, label: '10 min de comprensión auditiva (listening)', type: 'listening' });
        const read = (mod.activities || []).find(a => a.type === 'reading' || a.type === 'story');
        if (read) out.push({ moduleId: mod.id, activityId: read.id, label: 'Lee con calma una historia o lectura', type: read.type });
      }
    } catch {}
    if (!out.length) out.push({ moduleId: null, activityId: null, label: 'Practica al menos 15 minutos hoy en cualquier actividad de tu módulo.', type: 'grammar' });
    return out;
  }

  /* ── Práctica dirigida (bloque con ventana de días + bono) ───────── */
  function getDirectedAll() { return j(DPR_KEY, []); }
  function saveDirected(a) { w(DPR_KEY, a); cloudSetting('directed_practice', a); }
  function addDirected(dp) {
    const all = getDirectedAll();
    const e = { id: 'dp-' + Date.now() + '-' + Math.random().toString(36).slice(2,5),
      groupId: dp.groupId || null,
      openDate: dp.openDate || new Date().toISOString().slice(0,10),
      dueDate: dp.dueDate || null,
      activities: dp.activities || [],          // [{moduleId, activityId, label, type}]
      bonusXp: dp.bonusXp != null ? dp.bonusXp : 30,
      title: dp.title || 'Práctica dirigida',
      createdAt: new Date().toISOString() };
    all.unshift(e); saveDirected(all); return e.id;
  }
  function updateDirected(id, partial) { const a = getDirectedAll(); const i = a.findIndex(x => x.id === id); if (i >= 0) { a[i] = { ...a[i], ...partial }; saveDirected(a); } }
  function deleteDirected(id) { saveDirected(getDirectedAll().filter(d => d.id !== id)); }
  function getDirectedForGroup(groupId) { return getDirectedAll().filter(d => d.groupId === groupId).sort((a,b)=>String(b.openDate).localeCompare(String(a.openDate))); }
  /* Estado de un bloque para un alumno, calculado desde su progreso real. */
  function directedStatusForStudent(dp, student) {
    const D = window.JUCUM_DATA;
    const prog = D.getStudentProgress(student.id);
    const acts = dp.activities || [];
    const total = acts.length;
    const thr = D.passThreshold ? D.passThreshold(student.level, student.group) : 0;
    let done = 0, passed = 0, lastDate = null;
    acts.forEach(a => {
      const e = prog.completed && prog.completed[`${a.moduleId}:${a.activityId}`];
      if (e) {
        done++;
        const sc = typeof e.score === 'number' ? (e.score > 10 ? e.score : e.score * 10) : 100;
        if (sc >= thr) passed++;
        if (e.date && (!lastDate || e.date > lastDate)) lastDate = e.date;
      }
    });
    const today = new Date().toISOString().slice(0,10);
    const overdue = !!dp.dueDate && today > dp.dueDate;
    const upcoming = !!dp.openDate && today < dp.openDate;
    const allPassed = total > 0 && passed >= total;
    const onTime = allPassed && (!dp.dueDate || (lastDate && lastDate <= dp.dueDate));
    let state = 'active';
    if (upcoming) state = 'upcoming';
    else if (onTime) state = 'completed';
    else if (overdue) state = 'overdue';
    const daysLeft = dp.dueDate ? Math.ceil((new Date(dp.dueDate + 'T23:59:59') - new Date()) / 86400000) : null;
    return { done, passed, total, state, daysLeft, onTime, bonusXp: dp.bonusXp };
  }
  /* Bloques visibles para el alumno (ya abiertos), más recientes primero. */
  function getActiveDirectedForStudent(student) {
    if (!student) return [];
    const today = new Date().toISOString().slice(0,10);
    return getDirectedForGroup(student.group).filter(d => !d.openDate || today >= d.openDate);
  }

  /* ── Bitácora de clase (qué trabajó el profesor y cuánto tiempo) ──── */
  function getClassLog() { return j(CL_KEY, []); }
  function saveClassLog(a) { w(CL_KEY, a); }
  function logClassMaterial(entry) {
    const arr = getClassLog();
    const e = { id: 'cl-' + Date.now() + '-' + Math.random().toString(36).slice(2,5),
      date: entry.date || new Date().toISOString().slice(0,10),
      from: entry.from || null, to: entry.to || null, minutes: entry.minutes || 0,
      groupId: entry.groupId || null, materialName: entry.materialName || 'Material',
      moduleId: entry.moduleId || null, activityId: entry.activityId || null,
      type: entry.type || '', source: entry.source || 'manual', ...entry };
    arr.unshift(e); saveClassLog(arr);
    cloudUpsert('teacher_class_log', mapClassRow(e));
    return e.id;
  }
  function deleteClassEntry(id) { saveClassLog(getClassLog().filter(e => e.id !== id)); cloudDelete('teacher_class_log', id); }
  function getClassLogForMonth(ym) { return getClassLog().filter(e => String(e.date).slice(0,7) === ym); }
  function getClassLogForDay(date) { return getClassLog().filter(e => e.date === date).sort((a,b)=>String(a.from).localeCompare(String(b.from))); }
  function mapClassRow(e) {
    return { id: e.id, date: e.date, started_at: e.from, ended_at: e.to, minutes: e.minutes,
      group_id: e.groupId, material_name: e.materialName, module_id: e.moduleId,
      activity_id: e.activityId, type: e.type, source: e.source };
  }
  async function cloudLoadClassLog() {
    if (!window.JUCUM_SB) return;
    try {
      const rows = await window.JUCUM_SB.all('teacher_class_log');
      if (Array.isArray(rows)) saveClassLog(rows.map(r => ({ id:r.id, date:r.date, from:r.started_at, to:r.ended_at,
        minutes:r.minutes, groupId:r.group_id, materialName:r.material_name, moduleId:r.module_id,
        activityId:r.activity_id, type:r.type, source:r.source })).sort((a,b)=>String(b.date).localeCompare(String(a.date))));
    } catch (e) {}
  }

  /* ── Notas (por alumno / observaciones de clase) ─────────────────── */
  function getNotes() { return j(NOTE_KEY, []); }
  function saveNotes(a) { w(NOTE_KEY, a); }
  function addNote(note) {
    const arr = getNotes();
    const e = { id:'nt-'+Date.now()+'-'+Math.random().toString(36).slice(2,5), date:new Date().toISOString(),
      studentId: note.studentId || null, groupId: note.groupId || null,
      kind: note.studentId ? 'student' : 'general', text: note.text || '', tag: note.tag || 'nota' };
    arr.unshift(e); saveNotes(arr); cloudUpsert('teacher_notes', mapNoteRow(e));
    return e.id;
  }
  function updateNote(id, text) { const a=getNotes(); const n=a.find(x=>x.id===id); if(n){ n.text=text; saveNotes(a); cloudUpsert('teacher_notes', mapNoteRow(n)); } }
  function deleteNote(id) { saveNotes(getNotes().filter(n=>n.id!==id)); cloudDelete('teacher_notes', id); }
  function getStudentNotes(studentId) { return getNotes().filter(n => n.studentId === studentId); }
  function getGeneralNotes(groupId) { return getNotes().filter(n => n.kind === 'general' && (!groupId || n.groupId === groupId || !n.groupId)); }
  function mapNoteRow(e) { return { id:e.id, created_at:e.date, student_id:e.studentId, group_id:e.groupId, kind:e.kind, text:e.text, tag:e.tag }; }

  /* ── Recordatorios personales del profesor ───────────────────────── */
  function getReminders(scope) {
    const all = j(REM_KEY, []);
    if (!scope || scope === 'all') return all.sort(remSort);
    return all.filter(r => r.groupId === scope || !r.groupId).sort(remSort);
  }
  function remSort(a,b){ if(a.done!==b.done) return a.done?1:-1; return String(a.due||'9999').localeCompare(String(b.due||'9999')); }
  function addReminder(rem) {
    const all = j(REM_KEY, []);
    const e = { id:'rm-'+Date.now()+'-'+Math.random().toString(36).slice(2,5), date:new Date().toISOString(),
      groupId: rem.groupId || null, text: rem.text || '', due: rem.due || null, done:false };
    all.unshift(e); w(REM_KEY, all); cloudUpsert('teacher_reminders', mapRemRow(e));
    return e.id;
  }
  function toggleReminder(id) { const a=j(REM_KEY,[]); const r=a.find(x=>x.id===id); if(r){ r.done=!r.done; w(REM_KEY,a); cloudUpsert('teacher_reminders', mapRemRow(r)); } }
  function deleteReminder(id) { w(REM_KEY, j(REM_KEY,[]).filter(r=>r.id!==id)); cloudDelete('teacher_reminders', id); }
  function mapRemRow(e){ return { id:e.id, created_at:e.date, group_id:e.groupId, text:e.text, due:e.due, done:e.done }; }

  /* ── Nube (best-effort, no rompe si la tabla no existe) ──────────── */
  function cloudUpsert(table, row) { if(!window.JUCUM_SB) return; try { window.JUCUM_SB.getClient().from(table).upsert(row, { onConflict:'id' }).then(()=>{},()=>{}); } catch(e){} }
  function cloudDelete(table, id) { if(!window.JUCUM_SB) return; try { window.JUCUM_SB.getClient().from(table).delete().eq('id', id).then(()=>{},()=>{}); } catch(e){} }
  function cloudSetting(key, value) { if(!window.JUCUM_SB) return; try { window.JUCUM_SB.getClient().from('app_settings').upsert({ key, value }, { onConflict:'key' }).then(()=>{},()=>{}); } catch(e){} }
  async function cloudLoadAll() {
    await cloudLoadClassLog();
    if (!window.JUCUM_SB) return;
    try { const { data } = await window.JUCUM_SB.getClient().from('app_settings').select('value').eq('key','daily_practice').maybeSingle(); if (data && data.value) w(DP_KEY, data.value); } catch(e){}
    try { const { data } = await window.JUCUM_SB.getClient().from('app_settings').select('value').eq('key','directed_practice').maybeSingle(); if (data && Array.isArray(data.value)) w(DPR_KEY, data.value); } catch(e){}
    try { const rows = await window.JUCUM_SB.all('teacher_notes'); if (Array.isArray(rows)) saveNotes(rows.map(r=>({ id:r.id, date:r.created_at, studentId:r.student_id, groupId:r.group_id, kind:r.kind, text:r.text, tag:r.tag })).sort((a,b)=>String(b.date).localeCompare(String(a.date)))); } catch(e){}
    try { const rows = await window.JUCUM_SB.all('teacher_reminders'); if (Array.isArray(rows)) w(REM_KEY, rows.map(r=>({ id:r.id, date:r.created_at, groupId:r.group_id, text:r.text, due:r.due, done:r.done }))); } catch(e){}
  }

  /* Link a un material en MODO PROFESOR (sin restricción; registra uso de clase) */
  function teacherMaterialLink(activity, mod, groupId) {
    const base = activity.url || null; // sin url real → material aún no disponible
    if (!base) return null;
    const sep = base.includes('?') ? '&' : '?';
    const name = encodeURIComponent(`${mod ? mod.name + ' · ' : ''}${activity.name}`);
    return `${base}${sep}jucum_teacher=1&jucum_uid=teacher&jucum_group=${encodeURIComponent(groupId||'')}&jucum_mod=${encodeURIComponent(mod?mod.id:'')}&jucum_act=${encodeURIComponent(activity.id)}&jucum_kind=${encodeURIComponent(activity.type||'')}&jucum_name=${name}`;
  }

  cloudLoadAll();

  window.JUCUM_TT = {
    getDailyPractice, setDailyPractice, getTodayPracticeForStudent, genericPractice,
    getDirectedAll, addDirected, updateDirected, deleteDirected, getDirectedForGroup, directedStatusForStudent, getActiveDirectedForStudent,
    getClassLog, logClassMaterial, deleteClassEntry, getClassLogForMonth, getClassLogForDay, cloudLoadClassLog, cloudLoadAll,
    addNote, updateNote, deleteNote, getStudentNotes, getGeneralNotes, getNotes,
    getReminders, addReminder, toggleReminder, deleteReminder,
    teacherMaterialLink,
  };
})();
