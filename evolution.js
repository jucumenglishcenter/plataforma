/* Bloque O · "Mi evolución" — cálculos
 * Reconstruye la trayectoria del alumno desde su historial real (notas + fechas):
 *  - weeklySeries: % de dominio por semana, por competencia y general (la curva)
 *  - beforeNow: primer nivel medido vs nivel actual, por competencia
 *  - milestones: hitos del viaje (primer Story, módulo completado, examen, racha…)
 * No guarda nada nuevo: todo se deriva de jucum_student_progress + evaluaciones + exámenes.
 */
(function () {
  const COMP_TYPES = {
    listening: ['listening'], reading: ['reading'],
    grammar: ['grammar', 'summary'], speaking: ['story'],
  };

  function compOf(type) {
    for (const k in COMP_TYPES) if (COMP_TYPES[k].includes(type)) return k;
    return null;
  }
  function weekStart(d) {
    const x = new Date(d); const day = (x.getDay() + 6) % 7;
    x.setHours(0,0,0,0); x.setDate(x.getDate() - day); return x;
  }
  function fmtWeek(d) { return d.toISOString().slice(0,10); }

  /* mapa actId→{type,comp} y total por competencia para el nivel del alumno */
  function levelMaps(student) {
    const D = window.JUCUM_DATA;
    const mods = (D.MODULE_CATALOG[student.level] || []);
    const typeByKey = {}; const totalByComp = { listening:0, reading:0, grammar:0, speaking:0 };
    mods.forEach(m => (m.activities||[]).forEach(a => {
      typeByKey[`${m.id}:${a.id}`] = a.type;
      const c = compOf(a.type); if (c) totalByComp[c]++;
    }));
    return { typeByKey, totalByComp, mods };
  }

  /* Lista de eventos {date, comp, pct} a partir del historial con nota */
  function gradedEvents(student) {
    const D = window.JUCUM_DATA;
    const prog = D.getStudentProgress(student.id);
    const completed = prog.completed || {};
    const { typeByKey } = levelMaps(student);
    const evs = [];
    Object.entries(completed).forEach(([key, e]) => {
      if (!e || !e.date) return;
      const comp = compOf(typeByKey[key]);
      if (!comp) return;
      const pct = typeof e.score === 'number' ? (e.score > 10 ? Math.min(100, e.score) : Math.min(100, e.score/10*100)) : 70;
      evs.push({ date: new Date(e.date), comp, pct, key });
    });
    // evaluaciones de speaking del profesor
    try {
      const evals = (JSON.parse(localStorage.getItem('jucum_evaluations_v1')||'{}')[student.id]) || [];
      evals.forEach(ev => { if (ev.ratings && typeof ev.ratings.speaking === 'number' && ev.date) evs.push({ date:new Date(ev.date), comp:'speaking', pct: ev.ratings.speaking/5*100 }); });
    } catch {}
    evs.sort((a,b) => a.date - b.date);
    return evs;
  }

  function enrollDate(student) {
    const D = window.JUCUM_DATA;
    const g = (D.GROUPS||[]).find(x => x.id === student.group);
    if (g && g.startDate) return new Date(g.startDate);
    const evs = gradedEvents(student);
    return evs.length ? evs[0].date : new Date();
  }

  /* Curva: por cada semana desde la matrícula, dominio acumulado por competencia */
  function weeklySeries(student) {
    const evs = gradedEvents(student);
    const { totalByComp } = levelMaps(student);
    const start = weekStart(enrollDate(student));
    const now = weekStart(new Date());
    const weeks = [];
    for (let d = new Date(start); d <= now; d.setDate(d.getDate()+7)) weeks.push(new Date(d));
    if (weeks.length === 0) weeks.push(new Date(now));

    const comps = ['listening','reading','grammar','speaking'];
    const series = { listening:[], reading:[], grammar:[], speaking:[], overall:[] };
    weeks.forEach((wk, i) => {
      const cutoff = new Date(wk); cutoff.setDate(cutoff.getDate()+7);
      const vals = {};
      comps.forEach(c => {
        const upto = evs.filter(e => e.comp === c && e.date < cutoff);
        if (upto.length === 0) { vals[c] = null; return; }
        const quality = upto.reduce((s,e)=>s+e.pct,0)/upto.length/100;
        const doneKeys = new Set(upto.filter(e=>e.key).map(e=>e.key));
        const coverage = totalByComp[c] ? Math.min(1, doneKeys.size/totalByComp[c]) : (upto.length?1:0);
        vals[c] = Math.round(coverage * (0.55 + 0.45*quality) * 100);
        series[c].push({ week: fmtWeek(wk), label: `Sem ${i+1}`, pct: vals[c] });
      });
      const present = comps.map(c=>vals[c]).filter(v=>typeof v==='number');
      if (present.length) series.overall.push({ week: fmtWeek(wk), label:`Sem ${i+1}`, pct: Math.round(present.reduce((a,b)=>a+b,0)/present.length) });
    });
    return { series, weeks: weeks.length };
  }

  /* "De dónde partí → dónde estoy" por competencia */
  function beforeNow(student) {
    const { series } = weeklySeries(student);
    const D = window.JUCUM_DATA;
    const r = D.getStudentReadiness ? D.getStudentReadiness(student) : { competencies:{} };
    const out = {};
    ['listening','reading','grammar','speaking'].forEach(c => {
      const arr = series[c] || [];
      if (arr.length === 0) { out[c] = null; return; }
      const first = arr[0].pct;
      const now = (r.competencies && typeof r.competencies[c]==='number') ? r.competencies[c] : arr[arr.length-1].pct;
      out[c] = { first, now, delta: now - first, spark: arr.map(p=>p.pct) };
    });
    return out;
  }

  /* Hitos del viaje */
  function milestones(student) {
    const D = window.JUCUM_DATA;
    const prog = D.getStudentProgress(student.id);
    const completed = prog.completed || {};
    const { mods } = levelMaps(student);
    const out = [];
    // primer actividad
    const dated = Object.values(completed).filter(e=>e&&e.date).map(e=>new Date(e.date)).sort((a,b)=>a-b);
    if (dated.length) out.push({ date: dated[0], icon:'🚀', title:'Tu primer paso', body:'Completaste tu primera actividad. ¡Así empieza todo!' });
    // módulos completados
    mods.forEach(m => {
      const acts = m.activities||[];
      if (acts.length && acts.every(a => completed[`${m.id}:${a.id}`])) {
        const last = acts.map(a=>new Date(completed[`${m.id}:${a.id}`].date)).sort((a,b)=>b-a)[0];
        out.push({ date:last, icon:'📦', title:`Módulo completado: ${m.name}`, body:'Cubriste todas las actividades de este módulo.' });
      }
    });
    // exámenes aprobados
    try {
      const wins = JSON.parse(localStorage.getItem('jucum_exam_windows_v1')||'[]');
      const exams = JSON.parse(localStorage.getItem('jucum_exams_v1')||'[]');
      wins.forEach(w => { const res=(w.results||{})[student.id]; if(res&&res.passed&&res.gradedAt){ const ex=exams.find(e=>e.id===w.examId); out.push({ date:new Date(res.gradedAt), icon:'🎓', title:`Aprobaste: ${ex?ex.title:'examen'}`, body: typeof res.grade==='number'?`Nota ${res.grade}/100.`:'¡Felicitaciones!' }); }});
    } catch {}
    // racha
    if (student.streak >= 7) out.push({ date:new Date(), icon:'🔥', title:`Racha de ${student.streak} días`, body:'Tu constancia es tu superpoder.' });
    // encuesta
    try { const sv=(JSON.parse(localStorage.getItem('jucum_surveys_v1')||'{}')[student.id])||[]; if(sv.length) out.push({ date:new Date(sv[0].date), icon:'💬', title:'Diste tu opinión', body:'Gracias por ayudarnos a mejorar.' }); } catch {}
    out.sort((a,b)=>a.date-b.date);
    return out;
  }

  window.JUCUM_EVO = { weeklySeries, beforeNow, milestones, enrollDate };
})();
