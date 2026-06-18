/* "¿Cómo voy?" — diagnóstico del alumno (vista propia, tono motivador).
 * Reutiliza los cálculos reales de data.js: readiness por competencia, dominio,
 * tendencias, práctica del mes y ranking del grupo.
 */
const DIAG_RECS = {
  listening: { t:'Mejora tu listening',            b:'Vuelve a escuchar cada audio 2–3 veces; si hace falta baja la velocidad. Repite los listenings de tu módulo.' },
  reading:   { t:'Refuerza tu comprensión lectora', b:'Lee con calma las stories y vuelve a responder las preguntas. Subraya las pistas del texto antes de elegir.' },
  grammar:   { t:'Trabaja tu gramática',           b:'Repasa los resúmenes de gramática y rehaz las prácticas (Fill in · Identification · Transform).' },
  speaking:  { t:'Practica tu speaking',           b:'Lee en voz alta los diálogos y grábate. Aprovecha las evaluaciones de Speaking del profesor.' },
};

function StudentDiagnosis({ user, onBack }) {
  const D = window.JUCUM_DATA;
  const student = D.STUDENTS.find(s => s.id === user.studentId) || D.STUDENTS[0];
  const r = D.getStudentReadiness(student);
  const mastery = D.getStudentMastery(student);
  const trends = D.getStudentTrends(student);
  const monthly = D.getStudentMonthlyPractice(student);
  const COMPS = D.COMPETENCIES;
  const level = D.LEVELS[student.level];

  const ranking = D.getComplianceRanking(student.group);
  const myRank = ranking.findIndex(x => x.student.id === student.id) + 1;
  const groupAvg = ranking.length ? Math.round(ranking.reduce((s, x) => s + x.score, 0) / ranking.length) : 0;

  const compRows = COMPS
    .map(c => ({ ...c, val: r.competencies[c.key], dir: (trends[c.key] || {}).dir }))
    .filter(c => typeof c.val === 'number');
  const strengths = compRows.filter(c => c.val >= 80).sort((a, b) => b.val - a.val);
  const weaknesses = compRows.filter(c => c.val < 65).sort((a, b) => a.val - b.val);
  const weakest = compRows.slice().sort((a, b) => a.val - b.val)[0];

  const recs = [];
  weaknesses.forEach(c => recs.push(DIAG_RECS[c.key] || { t:`Refuerza ${c.label}`, b:'Dedícale práctica extra esta semana.' }));
  if (monthly.daysStudied < monthly.targetDays) recs.push({ t:'Gana constancia', b:`Llevas ${monthly.daysStudied} de ~${monthly.targetDays} días ideales este mes. Practicar casi a diario es lo que más sube tu nivel.` });
  if (!recs.length) recs.push({ t:'¡Vas muy bien!', b:'Mantén tu ritmo y reta tu nivel con actividades nuevas o ayudando en el foro.' });

  const dirIco = (d) => d === 'up' ? '📈' : d === 'down' ? '📉' : d === 'flat' ? '➡️' : '';
  const valColor = (v) => v >= 80 ? '#2E7D32' : v >= 65 ? '#E65100' : '#C62828';

  const goals = [
    { ico:'📅', t:'Practica al menos 5 de 7 días', sub:`Vas ${mastery.active7}/7 esta semana`, done: mastery.active7 >= 5 },
    weakest && { ico: weakest.icon, t:`Sube tu ${weakest.label} a 70%+`, sub:`Ahora está en ${weakest.val}%`, done: weakest.val >= 70 },
    { ico:'🎯', t:'Llega al 75% de cumplimiento', sub:`Tu cumplimiento es ${r.overall}%`, done: r.overall >= 75 },
  ].filter(Boolean);

  const moodIco = r.overall >= 75 ? '🌟' : r.overall >= 50 ? '💪' : '🌱';
  const moodMsg = r.overall >= 75
    ? '¡Vas excelente! Estás en camino (o ya listo) para tu examen.'
    : r.overall >= 50
      ? 'Vas por buen camino. Con un poco más de constancia llegas al 75%.'
      : 'Estás empezando. Cada día de práctica cuenta — ¡tú puedes!';

  return (
    <main>
      <button className="back-btn" onClick={onBack}>← Volver al panel</button>
      <div className="welcome" style={{background:`linear-gradient(135deg,${level.color},${level.dark})`}}>
        <div className="welcome-text">
          <div className="eyebrow">{level.emoji} {level.code} · 📈 ¿Cómo voy?</div>
          <h1>{moodIco} {moodMsg}</h1>
          <p>Cumplimiento general <b>{r.overall}%</b> · dominio <b>{mastery.pct}%</b> · {r.apt ? <b>✅ listo para examen</b> : 'sigue sumando para tu examen'}</p>
        </div>
        <div className="welcome-streak">
          <div className="streak-num">{r.overall}%</div>
          <div className="streak-lbl">cumpli-<br/>miento</div>
        </div>
      </div>

      {/* Competencias */}
      <div className="scard" style={{marginTop:18}}>
        <div className="sec-head"><div className="sec-title">🎯 Tus habilidades</div><span className="sec-meta">Sube con la práctica constante</span></div>
        <div style={{display:'grid', gap:10}}>
          {compRows.length === 0 && <div className="empty-state"><div className="icon">🌱</div>Practica algunas actividades para ver tu diagnóstico.</div>}
          {compRows.map(c => (
            <div key={c.key} className="row-flex" style={{gap:12}}>
              <span style={{fontSize:20, width:24, textAlign:'center'}}>{c.icon}</span>
              <div style={{flex:1, minWidth:120}}>
                <div style={{fontWeight:700, fontSize:13, display:'flex', gap:6, alignItems:'center'}}>{c.label} <span style={{fontSize:12}}>{dirIco(c.dir)}</span></div>
                <div className="modres-bar" style={{marginTop:5}}><span style={{width:c.val+'%', background:valColor(c.val)}}></span></div>
              </div>
              <div className="target-val" style={{minWidth:64, fontSize:18, color:valColor(c.val), background:'#FAFAF6', borderColor:'var(--border)'}}>{c.val}<span>%</span></div>
            </div>
          ))}
        </div>
      </div>

      {/* Fortalezas / Debilidades */}
      <div className="two-col">
        <div className="scard">
          <div className="sec-head"><div className="sec-title">⭐ Tus fortalezas</div></div>
          {strengths.length === 0
            ? <div className="settings-hint">Aún no destacas en una habilidad — ¡pronto lo harás con práctica!</div>
            : <div className="diag"><div className="diag-block ok">{strengths.map(c => <div className="diag-item" key={c.key}><div className="diag-it-title">{c.icon} {c.label} · {c.val}%</div><div className="diag-it-body">Dominas esta habilidad. ¡Sigue así!</div></div>)}</div></div>}
        </div>
        <div className="scard">
          <div className="sec-head"><div className="sec-title">🎯 A reforzar</div></div>
          {weaknesses.length === 0
            ? <div className="settings-hint">No tienes debilidades marcadas. ¡Muy bien!</div>
            : <div className="diag"><div className="diag-block bad">{weaknesses.map(c => <div className="diag-item" key={c.key}><div className="diag-it-title">{c.icon} {c.label} · {c.val}%</div><div className="diag-it-body">Necesita más práctica. Mira las recomendaciones abajo.</div></div>)}</div></div>}
        </div>
      </div>

      {/* Comparación con el grupo */}
      <div className="scard" style={{marginTop:18}}>
        <div className="sec-head"><div className="sec-title">👥 Tú vs. tu grupo</div><span className="sec-meta">Puesto #{myRank} de {ranking.length}</span></div>
        <div className="row-flex" style={{gap:16, flexWrap:'wrap'}}>
          <div style={{flex:1, minWidth:200}}>
            <div className="settings-hint" style={{margin:'0 0 4px'}}>Tu cumplimiento</div>
            <div className="modres-bar" style={{height:12}}><span style={{width:mastery.pct+'%', background:level.color}}></span></div>
            <div style={{fontWeight:800, color:level.dark, marginTop:3}}>{mastery.pct}%</div>
          </div>
          <div style={{flex:1, minWidth:200}}>
            <div className="settings-hint" style={{margin:'0 0 4px'}}>Promedio del grupo</div>
            <div className="modres-bar" style={{height:12}}><span style={{width:groupAvg+'%', background:'#9E9E9E'}}></span></div>
            <div style={{fontWeight:800, color:'#616161', marginTop:3}}>{groupAvg}%</div>
          </div>
        </div>
        <div className="cd-summary" style={{marginTop:12}}>
          {mastery.pct >= groupAvg
            ? <><b>¡Vas por encima del promedio de tu grupo!</b> Eres un ejemplo de constancia. 🎉</>
            : <><b>Estás un poco por debajo del promedio.</b> Con práctica diaria alcanzas y superas a tu grupo. 💪</>}
        </div>
      </div>

      {/* Metas de la semana */}
      <div className="scard" style={{marginTop:18}}>
        <div className="sec-head"><div className="sec-title">🏁 Tus metas de la semana</div></div>
        <div className="masc-helps"><ul>
          {goals.map((g, i) => (
            <li key={i} className={g.done ? 'ok' : ''} style={{display:'flex', gap:8, alignItems:'center'}}>
              <span style={{fontSize:16}}>{g.done ? '✓' : g.ico}</span>
              <span style={{flex:1}}><b>{g.t}</b><br/><span style={{fontWeight:600, opacity:0.8, fontSize:11.5}}>{g.sub}</span></span>
            </li>
          ))}
        </ul></div>
      </div>

      {/* Recomendaciones */}
      <div className="scard" style={{marginTop:18}}>
        <div className="sec-head"><div className="sec-title">💡 Recomendaciones para ti</div></div>
        <div className="diag"><div className="diag-block sug">
          {recs.map((rec, i) => (
            <div className="diag-item" key={i}>
              <div className="diag-it-title">{rec.t}</div>
              <div className="diag-it-body">{rec.b}</div>
            </div>
          ))}
        </div></div>
      </div>
    </main>
  );
}

Object.assign(window, { StudentDiagnosis });
