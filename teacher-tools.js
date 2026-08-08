/* JUCUM EC — Herramientas del profesor
 * Práctica del día (por grupo/día), bitácora de clase (qué material usó y cuánto
 * tiempo), notas por alumno / observaciones de clase, y recordatorios personales.
 * localStorage como caché; Supabase best-effort para la bitácora (la escriben
 * los materiales vía jucum-connect, por eso necesita nube) y el resto.
 */
(function () {
  const DP_KEY  = 'jucum_daily_practice_v1';   // { [groupId]: { [weekday]: [items] } }  (LEGADO)
  const DPR_KEY = 'jucum_directed_practice_v1'; // [ {id, groupId, openDate, dueDate, activities, bonusXp, createdAt} ]
  const PP_KEY  = 'jucum_practice_plans_v1';    // [ {id, groupId, title, activities, dates:[yyyy-mm-dd], assignToStudents, bonusXp, note, createdAt} ]
  const CP_KEY  = 'jucum_class_plans_v1';        // planes de CLASE (sesión minuto a minuto) por fecha — escritos por el PlannerHub
  const CL_KEY  = 'jucum_class_log_v1';         // array de usos de material en clase
  const NOTE_KEY= 'jucum_teacher_notes_v1';     // array de notas
  const REM_KEY = 'jucum_teacher_reminders_v1'; // array de recordatorios

  const j = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch { return d; } };
  /* 🛡️ Guardado a prueba de "cupo lleno": si el navegador ya no tiene espacio,
   * ANTES esto lanzaba error y cortaba el clic a la mitad — el plan no se
   * guardaba y el botón parecía muerto ("no puedo guardar mis sets"). Ahora
   * libera espacio y sigue: la copia a la nube (cloudSetting) siempre se envía. */
  const w = (k, v) => { try { if (window.JUCUM_STORE) return window.JUCUM_STORE.setJSON(k, v); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { try { console.warn('teacher-tools: no se pudo guardar', k, e && e.name); } catch (e2) {} } };

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
  /* Lo que el alumno debe practicar en una FECHA concreta (hoy por defecto).
   * Orden de resolución — meticuloso para NO duplicar ni arrastrar memoria vieja:
   *   1) Plan de práctica del profesor cuya lista de fechas incluya ESTA fecha
   *      (y que esté marcado para asignar a alumnos). Sin repetición fantasma:
   *      solo aparece en los días que el profe eligió.
   *   2) (Legado) práctica por día de la semana, si aún existe configurada.
   *   3) Recomendación automática SOLO si no hay nada definido para esa fecha. */
  /* Día en hora PERÚ (UTC−5), nunca UTC/local: UTC cambia de día ~7 PM de Perú
   * y la "práctica de hoy" saltaba al plan de mañana por la tarde-noche. */
  function todayStr() { return new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10); }
  function getTodayPracticeForStudent(student, dateStr) {
    if (!student) return { items: [], isGeneric: true, source: 'none' };
    const date = dateStr || todayStr();
    // 1) plan por fecha explícita (fuente principal)
    const plans = getPracticePlansForStudentOnDate(student, date).filter(p => p.assignToStudents !== false);
    if (plans.length) {
      const seen = new Set(); const items = [];
      plans.forEach(p => (p.activities || []).forEach(a => {
        const k = `${a.moduleId}:${a.activityId}:${a.label}`;
        if (seen.has(k)) return; seen.add(k); items.push(a);
      }));
      if (items.length) return { items, isGeneric: false, source: 'plan', planTitle: plans[0].title, planId: plans[0].id };
    }
    // 2) legado: práctica por día de la semana (solo si el profe la dejó así)
    const wd = new Date(date + 'T12:00:00').getDay();
    const set = getDailyPractice(student.group, wd);
    if (set && set.length) return { items: set, isGeneric: false, source: 'weekday' };
    // 3) recomendación automática (último recurso, nunca sobre un plan definido).
    //    Se CONGELA por alumno+día: si se recalculara en cada visita, al completar
    //    una actividad la lista cambiaría y el alumno nunca vería sus ✓ del día.
    return { items: frozenGeneric(student, date), isGeneric: true, source: 'generic' };
  }
  /* Set genérico del día congelado en este equipo. Clave chica (solo texto):
   * guarda únicamente el día actual, no acumula histórico. */
  const TODAYSET_KEY = 'jucum_today_set_v1';
  function frozenGeneric(student, date) {
    let all = {};
    try { all = JSON.parse(localStorage.getItem(TODAYSET_KEY) || '{}'); } catch {}
    const k = student.id + ':' + date;
    if (Array.isArray(all[k]) && all[k].length) return all[k];
    const items = genericPractice(student);
    try {
      const fresh = {};
      Object.keys(all).forEach(kk => { if (kk.slice(-10) === date) fresh[kk] = all[kk]; }); // conserva a otros alumnos del MISMO día (equipos compartidos)
      fresh[k] = items;
      if (window.JUCUM_STORE) window.JUCUM_STORE.setJSON(TODAYSET_KEY, fresh);
      else localStorage.setItem(TODAYSET_KEY, JSON.stringify(fresh));
    } catch {}
    return items;
  }
  /* Recomendación automática: SOLO cuando el profe no definió plan para esa fecha.
   * Se basa en (a) lo último que se trabajó en clase (bitácora) para sugerir su
   * práctica de casa (P1/P2), y (b) el avance del alumno en su módulo activo.
   * No acumula: devuelve un set corto y enfocado. */
  function genericPractice(student) {
    const D = window.JUCUM_DATA;
    const out = []; const seen = new Set();
    const push = (it) => { const k = `${it.moduleId}:${it.activityId}`; if (seen.has(k)) return; seen.add(k); out.push(it); };
    try {
      const settings = D.getGroupSettings(student.group);
      const mods = D.MODULE_CATALOG[student.level] || [];
      const activeIds = settings.activeModuleIds || (settings.activeModuleId ? [settings.activeModuleId] : []);
      const prog = D.getStudentProgress(student.id);
      // 🔧 Multi-módulo: recomienda desde el primer módulo ACTIVO con pendientes
      // (antes tomaba siempre el primero de la lista, aunque ya estuviera terminado).
      const activeMods = mods.filter(m => activeIds.includes(m.id));
      const mod = activeMods.find(m => (m.activities || []).some(a => !prog.completed[`${m.id}:${a.id}`])) || activeMods[0] || mods[0];
      // (a) lo que se vio en clase recientemente con este grupo → su práctica de casa
      const log = (getClassLogForGroupRecent(student.group, 4) || []);
      log.forEach(e => {
        if (!e.moduleId) return;
        const m = mods.find(x => x.id === e.moduleId); if (!m) return;
        // si lo de clase fue gramática, sugiere su P1/P2 de casa del mismo tema (group)
        const seenAct = (m.activities || []).find(a => a.id === e.activityId);
        const topic = seenAct && seenAct.group;
        const home = (m.activities || []).find(a => a.type === 'grammar' && (!topic || a.group === topic)
          && !D.entryPassed(prog.completed[`${m.id}:${a.id}`], student.level, student.group));
        if (home) push({ moduleId: m.id, activityId: home.id, label: `Tarea de lo visto en clase: ${home.name}${topic ? ' · ' + topic : ''}`, type: home.type });
      });
      // (b) continúa el módulo activo donde se quedó
      if (mod) {
        const next = (mod.activities || []).find(a => !prog.completed[`${mod.id}:${a.id}`]) || mod.activities[0];
        if (next) push({ moduleId: mod.id, activityId: next.id, label: `Continúa tu módulo: ${next.name}`, type: next.type });
        const read = (mod.activities || []).find(a => a.type === 'story' || a.type === 'reading');
        if (read && out.length < 3) push({ moduleId: mod.id, activityId: read.id, label: 'Lee con calma tu Story (cuenta por tiempo)', type: read.type });
      }
    } catch {}
    if (!out.length) out.push({ moduleId: null, activityId: null, label: 'Practica al menos 15 minutos hoy en una actividad de tu módulo.', type: 'grammar' });
    return out.slice(0, 3);
  }

  /* ── 🛡️ Sincronía SIN PÉRDIDAS (fix jul-2026: “los planes de clase desaparecen”) ──
   * Antes `cloudLoadAll()` PISABA el localStorage con lo que hubiera en la nube.
   * Si la escritura a la nube fallaba (sin internet un momento), si el profesor
   * guardaba mientras la carga estaba en vuelo, o si otro equipo tenía una copia
   * vieja del arreglo completo, el plan recién creado desaparecía.
   * Ahora se FUSIONA por id (gana la versión con marca de tiempo más nueva) y los
   * borrados viajan como lápida (_deleted) para que sí se propaguen. */
  function nowISO() { return new Date().toISOString(); }
  function stampOf(r) { return String((r && (r.savedAt || r.updatedAt || r.createdAt)) || ''); }
  function mergeById(local, cloud) {
    const out = new Map();
    (Array.isArray(cloud) ? cloud : []).forEach(r => { if (r && r.id) out.set(r.id, r); });
    (Array.isArray(local) ? local : []).forEach(r => {
      if (!r || !r.id) return;
      const prev = out.get(r.id);
      if (!prev || stampOf(r) >= stampOf(prev)) out.set(r.id, r);
    });
    const cut = new Date(Date.now() - 60 * 86400000).toISOString();   // lápidas viejas fuera
    return Array.from(out.values()).filter(r => !(r._deleted && String(r._deleted) < cut));
  }
  function alive(a) { return (Array.isArray(a) ? a : []).filter(r => r && !r._deleted); }
  function tombstone(a, id) {
    const t = nowISO();
    return (Array.isArray(a) ? a : []).map(r => (r && r.id === id) ? { ...r, _deleted: t, savedAt: t } : r);
  }
  async function cloudMerge(key, lsKey) {
    if (!window.JUCUM_SB) return;
    let cloud = null;
    try {
      const { data } = await window.JUCUM_SB.getClient().from('app_settings').select('value').eq('key', key).maybeSingle();
      cloud = (data && Array.isArray(data.value)) ? data.value : null;
    } catch (e) { return; }        // sin nube: JAMÁS se toca lo local
    if (cloud == null) { const localOnly = j(lsKey, []); if (localOnly.length) cloudSetting(key, localOnly); return; }
    const merged = mergeById(j(lsKey, []), cloud);
    w(lsKey, merged);
    if (JSON.stringify(merged) !== JSON.stringify(cloud)) cloudSetting(key, merged);   // la nube converge
  }

  /* ── Planes de práctica por FECHAS explícitas (el profe elige los días) ── */
  function rawPP() { return j(PP_KEY, []); }
  function getPracticePlans() { return alive(rawPP()); }
  function savePracticePlans(a) { w(PP_KEY, a); cloudSetting('practice_plans', a); }
  function addPracticePlan(pp) {
    const all = rawPP();
    const e = { id: 'pp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
      groupId: pp.groupId || null,
      title: pp.title || 'Práctica',
      activities: pp.activities || [],            // [{moduleId, activityId, label, type, location}]
      dates: Array.from(new Set(pp.dates || [])).sort(),  // fechas yyyy-mm-dd elegidas por el profe
      assignToStudents: pp.assignToStudents !== false,    // true: actualiza la práctica del alumno
      bonusXp: pp.bonusXp != null ? pp.bonusXp : 0,
      note: pp.note || '',
      guide: pp.guide || null,                            // instructivo editado (cómo practicar) — antes se perdía al guardar
      createdAt: nowISO(), savedAt: nowISO() };
    all.unshift(e); savePracticePlans(all); return e.id;
  }
  function updatePracticePlan(id, partial) { const a = rawPP(); const i = a.findIndex(x => x.id === id); if (i >= 0) { a[i] = { ...a[i], ...partial, dates: partial.dates ? Array.from(new Set(partial.dates)).sort() : a[i].dates, savedAt: nowISO() }; savePracticePlans(a); } }
  function deletePracticePlan(id) { savePracticePlans(tombstone(rawPP(), id)); }
  function getPracticePlansForDay(date) { return getPracticePlans().filter(p => (p.dates || []).includes(date)); }
  function getPracticePlansForStudentOnDate(student, date) { return getPracticePlans().filter(p => p.groupId === student.group && (p.dates || []).includes(date)); }

  /* ── Instructivos de práctica FAVORITOS (plantillas con nombre) ── */
  const GFAV_KEY = 'jucum_practice_guide_favs_v1';
  function getGuideFavs() { return alive(j(GFAV_KEY, [])); }
  function saveGuideFavs(a) { w(GFAV_KEY, a); cloudSetting('practice_guide_favs', a); }
  function addGuideFav(name, guide) {
    const all = j(GFAV_KEY, []);
    const e = { id: 'gf-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5), name: name || 'Instructivo', level: guide ? guide.level : '', guide: guide, createdAt: nowISO(), savedAt: nowISO() };;
    all.unshift(e); saveGuideFavs(all); return e;
  }
  function deleteGuideFav(id) { saveGuideFavs(tombstone(j(GFAV_KEY, []), id)); }

  /* ── Planes de CLASE por fecha (sesión minuto a minuto) ── */
  function rawCP() { return j(CP_KEY, []); }
  function getClassPlans() { return alive(rawCP()); }
  function saveClassPlans(a) { w(CP_KEY, a); cloudSetting('class_plans', a); }
  function upsertClassPlan(plan) {
    const all = rawCP();
    const rec = { ...plan, id: plan.id || 'cp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5), savedAt: nowISO() };
    delete rec._deleted;
    const i = all.findIndex(x => x.id === rec.id); if (i >= 0) all[i] = rec; else all.unshift(rec);
    saveClassPlans(all); return rec.id;
  }
  function deleteClassPlan(id) { saveClassPlans(tombstone(rawCP(), id)); }
  function getClassPlansForDay(date) { return getClassPlans().filter(p => p.date === date); }

  /* ── Plantillas reutilizables (clase / práctica) · con nombre + nivel ──
   * Sincronizadas a la nube (sobreviven cambio de equipo/redepliegue). */
  const TPL_KEY = 'jucum_planner_templates_v1';
  function rawTPL() { return j(TPL_KEY, []); }
  function getTemplates() { return alive(rawTPL()); }
  function saveTemplates(a) { w(TPL_KEY, a); cloudSetting('planner_templates', a); }
  function addTemplate(t) {
    const all = rawTPL();
    const rec = { id: 'tpl-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
      kind: t.kind || 'class', name: t.name || 'Plantilla', level: t.level || null,
      payload: t.payload || {}, createdAt: nowISO(), savedAt: nowISO() };
    all.unshift(rec); saveTemplates(all); return rec.id;
  }
  function updateTemplate(id, patch) { const a = rawTPL(); const i = a.findIndex(x => x.id === id); if (i >= 0) { a[i] = { ...a[i], ...patch, savedAt: nowISO() }; saveTemplates(a); } }
  function deleteTemplate(id) { saveTemplates(tombstone(rawTPL(), id)); }

  /* Lo planeado para un día (clase + práctica) — usado por el calendario del hub */
  function getPlannedForDay(date) {
    return { classPlans: getClassPlansForDay(date), practicePlans: getPracticePlansForDay(date) };
  }
  function getClassLogForGroupRecent(groupId, days) {
    const cut = new Date(Date.now() - (days || 4) * 86400000).toISOString().slice(0, 10);
    return getClassLog().filter(e => (!groupId || e.groupId === groupId) && e.date >= cut)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  /* ── Práctica dirigida (bloque con ventana de días + bono) ───────── */
  function getDirectedAll() { return alive(j(DPR_KEY, [])); }
  function saveDirected(a) { w(DPR_KEY, a); cloudSetting('directed_practice', a); }
  function addDirected(dp) {
    const all = j(DPR_KEY, []);
    const e = { id: 'dp-' + Date.now() + '-' + Math.random().toString(36).slice(2,5),
      groupId: dp.groupId || null,
      openDate: dp.openDate || new Date().toISOString().slice(0,10),
      dueDate: dp.dueDate || null,
      activities: dp.activities || [],          // [{moduleId, activityId, label, type}]
      bonusXp: dp.bonusXp != null ? dp.bonusXp : 30,
      title: dp.title || 'Práctica dirigida',
      createdAt: nowISO(), savedAt: nowISO() };
    all.unshift(e); saveDirected(all); return e.id;
  }
  function updateDirected(id, partial) { const a = j(DPR_KEY, []); const i = a.findIndex(x => x.id === id); if (i >= 0) { a[i] = { ...a[i], ...partial, savedAt: nowISO() }; saveDirected(a); } }
  function deleteDirected(id) { saveDirected(tombstone(j(DPR_KEY, []), id)); }
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
        const sc = typeof e.score === 'number' ? Math.max(0, Math.min(100, Math.round(e.score))) : 100;
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
    const e = { id:'nt-'+Date.now()+'-'+Math.random().toString(36).slice(2,5), date: note.date || new Date().toISOString(),
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
    // 🛡️ Estos cuatro se FUSIONAN (no se pisan): planes y plantillas nunca se pierden.
    await cloudMerge('directed_practice', DPR_KEY);
    await cloudMerge('practice_plans', PP_KEY);
    await cloudMerge('practice_guide_favs', GFAV_KEY);
    await cloudMerge('class_plans', CP_KEY);
    await cloudMerge('planner_templates', TPL_KEY);
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
    getPracticePlans, addPracticePlan, updatePracticePlan, deletePracticePlan, getPracticePlansForDay, getPracticePlansForStudentOnDate,
    getGuideFavs, addGuideFav, deleteGuideFav,
    getClassPlans, upsertClassPlan, deleteClassPlan, getClassPlansForDay, getPlannedForDay, getClassLogForGroupRecent,
    getTemplates, addTemplate, updateTemplate, deleteTemplate,
    getDirectedAll, addDirected, updateDirected, deleteDirected, getDirectedForGroup, directedStatusForStudent, getActiveDirectedForStudent,
    getClassLog, logClassMaterial, deleteClassEntry, getClassLogForMonth, getClassLogForDay, cloudLoadClassLog, cloudLoadAll,
    addNote, updateNote, deleteNote, getStudentNotes, getGeneralNotes, getNotes,
    getReminders, addReminder, toggleReminder, deleteReminder,
    teacherMaterialLink,
  };
})();
