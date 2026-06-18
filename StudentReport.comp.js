/* Bloque L · Reporte de avance individual (exportable / imprimible)
 * Para entregar a alumnos y padres. Reúne práctica del mes, competencias con
 * comparación inicio↔ahora, cumplimiento, notas, evaluaciones, y un diagnóstico
 * con fortalezas + áreas a mejorar (recomendaciones de hábito/planificación) +
 * cierre motivador. Imprimible a PDF.
 */

function srGradeColor(g) {
  if (typeof g !== 'number') return '#9E9E9E';
  return g >= 85 ? '#2E7D32' : g >= 70 ? '#1565C0' : g >= 50 ? '#E65100' : '#C62828';
}

/* Genera el diagnóstico a partir de TODA la info del alumno */
function buildDiagnosis(student, D) {
  const r = D.getStudentReadiness(student);
  const trends = D.getStudentTrends(student);
  const month = D.getStudentMonthlyPractice(student);
  const grades = D.getStudentGrades(student);
  const strengths = [];
  const improvements = [];

  const compRec = {
    listening: 'Escuchar 10 min al día (canciones/diálogos) y repetir los audios a 0.75× de velocidad.',
    reading: 'Leer una Story corta cada día y resumirla en una sola frase en inglés.',
    grammar: 'Repasar el resumen del tema más débil y rehacer su “Fill in” e “Identification”.',
    speaking: 'Grabarse leyendo en voz alta 5 min al día y volver a escucharse.',
  };

  // Fortalezas
  if (month.pct >= 80) strengths.push({ t:'Constancia ejemplar', b:`Practicó ${month.daysStudied} de ~${month.targetDays} días esperados este mes. La constancia es la base del avance.` });
  else if (student.streak >= 3) strengths.push({ t:'Hábito en formación', b:`Lleva una racha de ${student.streak} días. Va construyendo el hábito — lo más difícil ya empezó.` });
  D.COMPETENCIES.forEach(c => {
    const v = r.competencies[c.key];
    if (typeof v === 'number' && v >= 75) strengths.push({ t:`Buen dominio · ${c.label}`, b:`${v}% en ${c.label.toLowerCase()}. Siga alimentando esta fortaleza para no perderla.` });
    const tr = trends[c.key];
    if (tr && tr.dir === 'up') strengths.push({ t:`Progreso en ${c.label}`, b:`Mejoró de ${tr.first}% a ${tr.last}% (+${tr.delta}). El esfuerzo se nota.` });
  });
  if (r.taskCompliance != null && r.taskCompliance >= 80) strengths.push({ t:'Responsable con sus tareas', b:`Cumplió el ${r.taskCompliance}% de las tareas asignadas.` });
  const exPassed = grades.filter(g => g.kind==='exam' && g.passed).length;
  if (exPassed > 0) strengths.push({ t:'Resultados en exámenes', b:`Aprobó ${exPassed} examen(es). Evidencia clara de su avance.` });
  if (student.completedModules >= 1) strengths.push({ t:'Módulos completados', b:`Ya cerró ${student.completedModules} módulo(s) por completo.` });

  // Áreas a mejorar + recomendaciones
  if (month.pct < 60) improvements.push({ t:'Planificación y hábito de práctica', b:`Practicó ${month.daysStudied} de ~${month.targetDays} días esperados (${month.pct}%). Recomendación: fijar un horario estable (el mismo momento cada día) y empezar con solo 10 min — lo difícil es arrancar; el hábito se asienta en ~3 semanas.`, prio:'🔴' });
  D.COMPETENCIES.forEach(c => {
    const v = r.competencies[c.key];
    const tr = trends[c.key];
    if (typeof v === 'number' && v < 60) improvements.push({ t:`Reforzar ${c.label}`, b:`Va en ${v}%. ${compRec[c.key] || 'Practicar esta competencia con más frecuencia.'}`, prio: v < 40 ? '🔴' : '🟡' });
    else if (tr && tr.dir === 'down') improvements.push({ t:`Atención · ${c.label} bajó`, b:`Pasó de ${tr.first}% a ${tr.last}% (${tr.delta}). Conviene repasar este tema antes de seguir avanzando.`, prio:'🟡' });
  });
  if (r.taskCompliance != null && r.taskCompliance < 60) improvements.push({ t:'Entrega de tareas', b:`Cumplió el ${r.taskCompliance}% de sus tareas. Recomendación: revisar las pendientes y avisar al profesor si algo no se entiende.`, prio:'🟡' });

  // Cierre
  const closing = r.apt
    ? '¡Vas por muy buen camino! Tu preparación ya alcanza el nivel para tu examen. Mantén tu constancia y sigue alimentando tus fortalezas — el progreso se cuida día a día.'
    : 'Tienes todo para lograrlo. Tu avance depende sobre todo de la constancia: practicar un poco cada día rinde más que mucho de golpe. Apóyate en las recomendaciones de arriba y verás los resultados. ¡Confiamos en ti!';

  return { r, trends, month, grades, strengths, improvements, closing };
}

function TrendBadge({ tr }) {
  if (!tr || tr.dir === 'na') return <span style={{fontSize:11, color:'#9E9E9E', fontWeight:700}}>sin datos suficientes</span>;
  const map = { up:{c:'#2E7D32', a:'▲', t:`+${tr.delta}`}, down:{c:'#C62828', a:'▼', t:`${tr.delta}`}, flat:{c:'#757575', a:'▬', t:'estable'} };
  const m = map[tr.dir];
  return <span style={{fontSize:11.5, color:m.c, fontWeight:800}}>{m.a} {m.t} <span style={{color:'#9E9E9E', fontWeight:600}}>({tr.first}%→{tr.last}%)</span></span>;
}

function StudentReport({ student, onBack, forTeacher }) {
  const D = window.JUCUM_DATA;
  const group = D.GROUPS.find(g => g.id === student.group);
  const level = D.LEVELS[student.level];
  const dx = buildDiagnosis(student, D);
  const today = new Date().toLocaleDateString('es-PE', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const monthName = new Date().toLocaleDateString('es-PE', { month:'long' });
  const nums = dx.grades.map(g => g.grade).filter(g => typeof g === 'number');
  const avgGrade = nums.length ? Math.round(nums.reduce((a,b)=>a+b,0)/nums.length) : null;

  return (
    <main className="report-page">
      <div className="no-print" style={{display:'flex', gap:10, alignItems:'center', marginBottom:16}}>
        <button className="back-btn" onClick={onBack} style={{marginBottom:0}}>← Volver</button>
        <div style={{flex:1}}></div>
        <button className="btn-save" onClick={() => window.print()}>🖨 Imprimir / Guardar PDF</button>
      </div>

      <div className="report-head">
        <img src="logo-jucum.png" alt="JUCUM EC" style={{height:64}} />
        <div>
          <div className="report-title">Reporte de avance</div>
          <div className="report-sub">{level.emoji} {student.fullName} · {level.code} · {group?.name || ''}</div>
          <div className="report-date">Generado el {today}</div>
        </div>
      </div>

      {/* Práctica del mes */}
      <div className="report-stats">
        <div className="rstat"><b style={{color: dx.month.pct>=70?'#2E7D32':dx.month.pct>=40?'#E65100':'#C62828'}}>{dx.month.daysStudied}/{dx.month.targetDays}</b> días practicados en {monthName}</div>
        <div className="rstat"><b>{dx.month.pct}%</b> de la meta de práctica</div>
        <div className="rstat"><b>{Math.floor(dx.month.minutes/60)}h {dx.month.minutes%60}m</b> este mes</div>
        <div className="rstat"><b>{student.streak}</b> días de racha</div>
        <div className="rstat"><b style={{color: dx.r.apt?'#2E7D32':'#E65100'}}>{dx.r.overall}%</b> cumplimiento general {dx.r.apt?'· apto':'· falta 75%'}</div>
      </div>

      {/* Competencias con comparación inicio↔ahora */}
      <div className="scard" style={{marginTop:8}}>
        <div className="sec-head"><div className="sec-title">Competencias · ahora vs. al inicio</div></div>
        {D.COMPETENCIES.map(c => {
          const v = dx.r.competencies[c.key];
          const has = typeof v === 'number';
          const color = !has ? '#BDBDBD' : v>=75?'#2EA84B':v>=50?'#F9A825':'#E53935';
          return (
            <div key={c.key} style={{marginBottom:12}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:12.5, fontWeight:700, marginBottom:4}}>
                <span>{c.icon} {c.label}</span>
                <span style={{display:'flex', gap:10, alignItems:'center'}}><TrendBadge tr={dx.trends[c.key]} /> <span style={{color, fontWeight:800}}>{has?v+'%':'—'}</span></span>
              </div>
              <div style={{height:9, background:'#ECE9E0', borderRadius:6, overflow:'hidden'}}><div style={{height:'100%', width:(has?v:0)+'%', background:color, borderRadius:6}}></div></div>
            </div>
          );
        })}
        <div style={{fontSize:11.5, color:'#777', marginTop:4}}>El cumplimiento general combina práctica (70%) y tareas (30%). Cada competencia sube con la constancia, no por hacer algo una sola vez.</div>
      </div>

      {/* Notas registradas */}
      <div className="scard" style={{marginTop:14}}>
        <div className="sec-head"><div className="sec-title">Notas registradas</div><span className="sec-meta">{dx.grades.length} registro(s){avgGrade!=null?` · promedio ${avgGrade}/100`:''}</span></div>
        {dx.grades.length === 0 ? <div style={{fontSize:12.5, color:'#777'}}>Aún no hay notas registradas.</div> : (
          <table className="report-table">
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Detalle</th><th>Resultado</th></tr></thead>
            <tbody>
              {dx.grades.slice(0,12).map((g,i) => (
                <tr key={i}>
                  <td>{g.date ? new Date(g.date).toLocaleDateString('es-PE',{day:'numeric',month:'short'}) : '—'}</td>
                  <td>{g.icon} {g.kind==='exam'?'Examen':g.kind==='task'?'Tarea':'Evaluación'}</td>
                  <td>{g.title}{g.kind==='exam'&&typeof g.passed==='boolean'?` · ${g.passed?'Aprobó':'Reprobó'}`:''}</td>
                  <td style={{fontWeight:800, color:srGradeColor(g.grade)}}>{typeof g.grade==='number'?`${g.grade}/100`:(g.stars?g.stars.map(s=>`${s.v}/5`).join(' '):'—')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Diagnóstico */}
      <div className="two-col" style={{marginTop:14}}>
        <div className="scard">
          <div className="sec-head"><div className="sec-title">⭐ Fortalezas y logros</div></div>
          {dx.strengths.length === 0 ? <div style={{fontSize:12.5,color:'#777'}}>Aún estamos reuniendo evidencia. ¡A practicar para construirla!</div> :
            <div className="diag"><div className="diag-block ok">{dx.strengths.map((s,i) => <div className="diag-item" key={i}><div className="diag-it-title">{s.t}</div><div className="diag-it-body">{s.b}</div></div>)}</div></div>}
        </div>
        <div className="scard">
          <div className="sec-head"><div className="sec-title">📚 Áreas a mejorar y recomendaciones</div></div>
          {dx.improvements.length === 0 ? <div style={{fontSize:12.5,color:'#2E7D32',fontWeight:700}}>¡Sin áreas críticas! Mantén tu ritmo y sigue alimentando tus fortalezas.</div> :
            <div className="diag"><div className="diag-block sug">{dx.improvements.map((s,i) => <div className="diag-item" key={i}><div className="diag-it-title"><span className="prio">{s.prio}</span> {s.t}</div><div className="diag-it-body">{s.b}</div></div>)}</div></div>}
        </div>
      </div>

      {/* Cierre */}
      <div className="scard" style={{marginTop:14, background:'#F0F7FF', borderColor:'#90CAF9'}}>
        <div className="sec-head"><div className="sec-title">💬 Mensaje para el alumno y su familia</div></div>
        <div style={{fontSize:13.5, lineHeight:1.6, color:'#0D47A1'}}>{dx.closing}</div>
      </div>

      <div className="report-foot">
        JUCUM English Center · Tingo María, Perú · Reporte generado desde la plataforma de seguimiento · {today}
      </div>
    </main>
  );
}

Object.assign(window, { StudentReport, TrendBadge });
