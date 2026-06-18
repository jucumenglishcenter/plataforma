/* Bloque I · Preparación para el examen (competencias)
 * Tarjeta compartida por el alumno (su preparación) y el profesor (ficha del alumno).
 * Las barras suben con la constancia; "apto" = overall ≥ 75%.
 */

function CompBar({ icon, label, value }) {
  const has = typeof value === 'number';
  const v = has ? value : 0;
  const color = !has ? '#BDBDBD' : v >= 75 ? '#2EA84B' : v >= 50 ? '#F9A825' : '#E53935';
  return (
    <div style={{marginBottom:10}}>
      <div style={{display:'flex', justifyContent:'space-between', fontSize:12.5, fontWeight:700, marginBottom:4, color:'var(--text)'}}>
        <span>{icon} {label}</span>
        <span style={{color}}>{has ? v + '%' : '—'}</span>
      </div>
      <div style={{height:9, background:'#ECE9E0', borderRadius:6, overflow:'hidden'}}>
        <div style={{height:'100%', width:v + '%', background:color, borderRadius:6, transition:'width .5s'}}></div>
      </div>
    </div>
  );
}

function ReadinessCard({ student, forTeacher }) {
  const { getStudentReadiness, COMPETENCIES } = window.JUCUM_DATA;
  const r = getStudentReadiness(student);
  const apt = r.apt;
  const barColor = apt ? '#2EA84B' : r.overall >= 50 ? '#F9A825' : '#E53935';

  return (
    <div className="scard">
      <div className="sec-head">
        <div className="sec-title">🎓 {forTeacher ? 'Preparación para el examen' : '¿Listo para tu examen?'}</div>
        <span className="mm-chip" style={{background: apt ? '#E8F5E9' : '#FFF8E1', color: apt ? '#2E7D32' : '#E65100'}}>
          {apt ? '✓ Apto' : `Falta ${r.threshold - r.overall}%`}
        </span>
      </div>

      {/* Overall */}
      <div style={{display:'flex', alignItems:'center', gap:14, marginBottom:14}}>
        <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:700, fontSize:34, color:barColor, lineHeight:1}}>{r.overall}%</div>
        <div style={{flex:1}}>
          <div style={{height:12, background:'#ECE9E0', borderRadius:7, overflow:'hidden', position:'relative'}}>
            <div style={{height:'100%', width:r.overall + '%', background:barColor, borderRadius:7, transition:'width .6s'}}></div>
            {/* marca del 75% */}
            <div style={{position:'absolute', top:-2, bottom:-2, left:'75%', width:2, background:'#1F3A8A'}} title="Mínimo 75%"></div>
          </div>
          <div style={{fontSize:11, color:'var(--text-soft)', fontWeight:700, marginTop:4}}>Cumplimiento general · mínimo 75% (línea azul)</div>
        </div>
      </div>

      <div style={{display:'flex', gap:8, flexWrap:'wrap', marginBottom:12, fontSize:11.5, fontWeight:700}}>
        <span className="mm-chip" style={{background:'#F0F0EA', color:'#555'}}>📈 Avance del módulo: {r.coverage ?? 0}%</span>
        {typeof r.daysInactive === 'number' && r.daysInactive >= 4 &&
          <span className="mm-chip" style={{background:'#FFEBEE', color:'#C62828'}}>⚠ {r.daysInactive} días sin practicar</span>}
        {r.coverage != null && r.coverage < 60 &&
          <span className="mm-chip" style={{background:'#FFF8E1', color:'#E65100'}}>Aún no cubre la mayoría de los temas</span>}
      </div>

      {COMPETENCIES.map(c => <CompBar key={c.key} icon={c.icon} label={c.label} value={r.competencies[c.key]} />)}

      {r.taskCompliance != null && <CompBar icon="📝" label="Cumplimiento de tareas" value={r.taskCompliance} />}

      <div style={{marginTop:6, padding:'10px 12px', borderRadius:10, fontSize:12.5, lineHeight:1.5,
                   background: apt ? '#E8F5E9' : '#FFF8E1', border:'1px solid ' + (apt ? '#A5D6A7' : '#FFE082'),
                   color: apt ? '#1B5E20' : '#7A4E00'}}>
        {forTeacher
          ? (apt
              ? 'El alumno alcanza el mínimo. Aun así, tú tienes la última palabra para habilitar el examen.'
              : 'Por debajo del 75%. La plataforma lo marca como no apto, pero puedes habilitarle el examen igual si lo decides.')
          : (apt
              ? '¡Vas listo! 🎉 Mantén tu constancia. Tu profesor habilitará tu examen cuando corresponda.'
              : `Aún no llegas al 75% para rendir tu examen de avance. Tu preparación sube con la CONSTANCIA: practica cada día y entrega tus tareas. Sigue así y lo lograrás. 💪`)}
      </div>
    </div>
  );
}

Object.assign(window, { ReadinessCard, CompBar });
