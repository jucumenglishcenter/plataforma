/* Bloque S · Retención y análisis de abandono
 * Mide altas/bajas y calcula un RIESGO DE ABANDONO real por alumno combinando
 * señales objetivas (inactividad, asistencia, satisfacción, pagos, progreso).
 * Genera un análisis de los factores dominantes y recomendaciones accionables.
 *
 * Bajas: registro en localStorage 'jucum_churn_v1' = [{studentId, name, level,
 *        groupId, reason, date}]. La administración marca el retiro y su motivo.
 */
(function () {
  const CHURN_KEY = 'jucum_churn_v1';
  const load = () => { try { const a = JSON.parse(localStorage.getItem(CHURN_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } };
  const save = (a) => localStorage.setItem(CHURN_KEY, JSON.stringify(a));

  const REASONS = [
    { k:'tiempo',        l:'Falta de tiempo' },
    { k:'economico',     l:'Motivo económico' },
    { k:'desmotivado',   l:'Desmotivación / no veía avance' },
    { k:'dificultad',    l:'Le resultó muy difícil' },
    { k:'horario',       l:'Horario incompatible' },
    { k:'mudanza',       l:'Viaje / mudanza' },
    { k:'insatisfecho',  l:'Inconforme con la enseñanza' },
    { k:'sin_contacto',  l:'Dejó de venir sin avisar' },
    { k:'otro',          l:'Otro' },
  ];
  const reasonLabel = (k) => (REASONS.find(r => r.k === k) || {}).l || k;

  /* Última encuesta del alumno */
  function lastSurvey(sid) {
    try { const a = (JSON.parse(localStorage.getItem('jucum_surveys_v1') || '{}')[sid]) || []; return a[a.length - 1] || null; } catch { return null; }
  }

  /* Riesgo de abandono (0-100) con los factores que lo explican */
  function riskOf(student) {
    const D = window.JUCUM_DATA;
    const factors = [];
    let score = 0;
    const add = (pts, key, txt) => { score += pts; factors.push({ key, txt, pts }); };

    const inactive = student.lastActiveDays || 0;
    if (inactive >= 14) add(35, 'inactividad', `${inactive} días sin practicar`);
    else if (inactive >= 7) add(25, 'inactividad', `${inactive} días sin practicar`);
    else if (inactive >= 4) add(15, 'inactividad', `${inactive} días sin practicar`);

    // asistencia
    try {
      const sum = window.JUCUM_ATT ? window.JUCUM_ATT.getStudentSummary(student.id) : null;
      if (sum && sum.total > 0) {
        if (sum.pct < 50) add(30, 'asistencia', `Asistencia ${sum.pct}%`);
        else if (sum.pct < 70) add(20, 'asistencia', `Asistencia ${sum.pct}%`);
        if (sum.streakAbsent >= 2) add(10, 'asistencia', `${sum.streakAbsent} faltas seguidas`);
      }
    } catch {}

    // satisfacción (encuesta)
    const sv = lastSurvey(student.id);
    if (sv) {
      if (sv.continue_plan === 'no') add(30, 'intencion', 'Dijo que piensa dejarlo');
      else if (sv.continue_plan === 'no_se') add(18, 'intencion', 'No está seguro de continuar');
      if (typeof sv.satisfaction === 'number' && sv.satisfaction <= 2) add(20, 'satisfaccion', `Satisfacción baja (${sv.satisfaction}/5)`);
      if (sv.recommend === 'no') add(10, 'satisfaccion', 'No nos recomendaría');
    }

    // pagos
    try {
      const st = window.JUCUM_PAY ? window.JUCUM_PAY.getAccountStatus(student) : null;
      if (st && st.enforced) {
        if (st.state === 'bloqueado') add(20, 'pago', 'Pago vencido (bloqueado)');
        else if (st.state === 'por_vencer') add(8, 'pago', 'Pago por vencer');
        if (st.rejected) add(6, 'pago', 'Pago rechazado sin regularizar');
      }
    } catch {}

    // progreso / dominio
    try {
      const r = D.getStudentReadiness(student);
      if (r.overall < 40) add(12, 'progreso', `Cumplimiento bajo (${r.overall}%)`);
      const tr = D.getStudentTrends(student);
      const down = Object.values(tr).filter(t => t && t.dir === 'down').length;
      if (down >= 1) add(8, 'progreso', 'Su dominio viene bajando');
    } catch {}

    score = Math.min(100, score);
    const level = score >= 55 ? 'alto' : score >= 30 ? 'medio' : 'bajo';
    return { score, level, factors };
  }

  /* Enrolamiento (proxy): createdAt del alumno o startDate del grupo */
  function enrollMonth(student) {
    const D = window.JUCUM_DATA;
    if (student.createdAt) return String(student.createdAt).slice(0, 7);
    const g = (D.GROUPS || []).find(x => x.id === student.group);
    return g && g.startDate ? String(g.startDate).slice(0, 7) : null;
  }

  function thisMonth() { return new Date().toISOString().slice(0, 7); }

  /* Altas y bajas + tasa de retención */
  function altasBajas() {
    const D = window.JUCUM_DATA;
    const mes = thisMonth();
    const activos = D.STUDENTS.length;
    const altasMes = D.STUDENTS.filter(s => enrollMonth(s) === mes).length;
    const churn = load();
    const bajasMes = churn.filter(c => String(c.date).slice(0, 7) === mes).length;
    const bajasTotal = churn.length;
    const base = activos + bajasTotal;
    const retencion = base ? Math.round(activos / base * 100) : 100;
    return { activos, altasMes, bajasMes, bajasTotal, retencion, churn };
  }

  function markWithdrawn(student, reason, note) {
    const D = window.JUCUM_DATA;
    const g = (D.GROUPS || []).find(x => x.id === student.group);
    const arr = load();
    arr.unshift({ studentId: student.id, name: student.fullName, level: student.level, groupId: student.group, groupName: g ? g.name : '', reason, note: note || '', date: new Date().toISOString() });
    save(arr);
    if (window.JUCUM_SB) { try { window.JUCUM_SB.update('users', student.id, { status: 'retirado' }).catch(()=>{}); } catch {} }
  }

  /* Análisis: factores dominantes entre los en-riesgo + motivos de baja reales,
   * con recomendaciones específicas mapeadas a lo que los datos muestran. */
  function analyze() {
    const D = window.JUCUM_DATA;
    const risks = D.STUDENTS.map(s => ({ s, r: riskOf(s) }));
    const enRiesgo = risks.filter(x => x.r.level !== 'bajo');
    const factorCount = {};
    enRiesgo.forEach(x => x.r.factors.forEach(f => { factorCount[f.key] = (factorCount[f.key] || 0) + 1; }));
    const churn = load();
    const reasonCount = {};
    churn.forEach(c => { reasonCount[c.reason] = (reasonCount[c.reason] || 0) + 1; });

    const N = Math.max(1, enRiesgo.length);
    const pct = (k) => Math.round((factorCount[k] || 0) / N * 100);

    const findings = [];
    const recs = [];

    if (pct('inactividad') >= 30) {
      findings.push(`El ${pct('inactividad')}% de los alumnos en riesgo dejó de practicar varios días. La inactividad es el predictor más temprano de abandono.`);
      recs.push({ t:'Intervención temprana por inactividad', b:'Que la administración contacte al alumno al 3.er día sin práctica (no esperar a la semana). Un mensaje personal "te notamos ausente, ¿todo bien?" recupera más que cualquier recordatorio automático. Registra el resultado del contacto.' });
    }
    if (pct('asistencia') >= 30) {
      findings.push(`El ${pct('asistencia')}% tiene asistencia baja o faltas seguidas. Faltar a clase desconecta al alumno del grupo y del hábito.`);
      recs.push({ t:'Reenganche tras 2 faltas', b:'Protocolo fijo: a la 2.ª falta consecutiva, llamada (no solo WhatsApp) para entender el motivo y ofrecer recuperación. Lleva un registro de motivos: distingue "no puede" (horario) de "no quiere" (motivación).' });
    }
    if (pct('intencion') >= 20 || pct('satisfaccion') >= 20) {
      findings.push(`Hay alumnos que ya expresaron dudas sobre continuar o baja satisfacción en la encuesta. Son señales explícitas: actúa antes de que se concreten.`);
      recs.push({ t:'Conversación de valor con los insatisfechos', b:'Reúnete 5 min con cada alumno que marcó "no sé / pienso dejarlo": pregunta qué esperaba vs. qué recibe, y muéstrale su propia "Mi evolución" (cuánto avanzó). Percibir progreso concreto es el principal antídoto contra la deserción.' });
    }
    if (pct('progreso') >= 25) {
      findings.push(`El ${pct('progreso')}% en riesgo tiene cumplimiento bajo o dominio que viene cayendo. El alumno que "no entiende" o "no avanza" se frustra y se va.`);
      recs.push({ t:'Apoyo académico dirigido', b:'Usa "Recomendado esta semana" para asignar práctica enfocada en su competencia más floja, y considera tareas personales de refuerzo. Avances pequeños y visibles reconstruyen la motivación.' });
    }
    if (pct('pago') >= 20 || (reasonCount.economico || 0) > 0) {
      findings.push(`Aparecen fricciones de pago entre los alumnos en riesgo${reasonCount.economico?' y ya hubo bajas por motivo económico':''}.`);
      recs.push({ t:'Reducir la fricción económica', b:'Ofrece alternativas antes de perder al alumno: fraccionar el pago, plan por módulo en vez de mensual, o una semana de gracia con compromiso. Confirma los vouchers rápido para no bloquear por error a quien sí pagó.' });
    }

    // Recomendaciones estructurales (siempre relevantes, no superficiales)
    recs.push({ t:'Blindar los primeros 21 días', b:'La mayoría de las deserciones ocurren al inicio, antes de formar el hábito. Aprovecha la semana de adaptación: acompañamiento cercano, una meta diaria muy pequeña (10 min) y un primer logro temprano. Un alumno que practica 3 semanas seguidas rara vez se va.' });
    recs.push({ t:'Pertenencia al grupo', b:'El vínculo social retiene más que el contenido. Refuerza el Top de constancia, reconoce públicamente las "semanas perfectas" y fomenta el foro. Quien se siente parte de un grupo no quiere quedarse atrás.' });
    recs.push({ t:'Entrevista de salida obligatoria', b:'Cuando un alumno se retira, registra SIEMPRE el motivo real (no "otro"). Sin datos de salida fieles, las decisiones son adivinanzas. Esa información es la que te dirá, en 2-3 meses, dónde está la fuga real.' });

    const topReasons = Object.entries(reasonCount).sort((a,b)=>b[1]-a[1]).map(([k,n]) => ({ reason: reasonLabel(k), n }));

    return {
      total: D.STUDENTS.length, enRiesgo: enRiesgo.length,
      alto: risks.filter(x=>x.r.level==='alto').length,
      medio: risks.filter(x=>x.r.level==='medio').length,
      factorPct: { inactividad:pct('inactividad'), asistencia:pct('asistencia'), intencion:pct('intencion'), satisfaccion:pct('satisfaccion'), progreso:pct('progreso'), pago:pct('pago') },
      topReasons, findings, recs, risks,
    };
  }

  window.JUCUM_RETENTION = { riskOf, altasBajas, markWithdrawn, analyze, REASONS, reasonLabel, lastSurvey };
})();
