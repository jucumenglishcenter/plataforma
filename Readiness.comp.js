/* Bloque I · Preparación para el examen · 4 CRITERIOS (jul-2026)
 * Tarjeta compartida por el alumno (su preparación) y el profesor (ficha del alumno).
 *   1) 📚 Prácticas realizadas — cuánto del material del módulo activo completó
 *   2) ⏱️ Práctica diaria      — constancia desde que se ABRIÓ el módulo
 *   3) 🎯 Nivel de acierto     — calidad (notas) de lo que ya practicó
 *   4) 📝 Tareas cumplidas     — 100% si no se dejaron tareas
 * El detalle por competencia (auditiva/lectora/gramática) queda a un clic.
 */

function CompBar({ icon, label, value, detail, weight }) {
  const has = typeof value === 'number';
  const v = has ? value : 0;
  const color = !has ? '#BDBDBD' : v >= 75 ? '#2EA84B' : v >= 50 ? '#F9A825' : '#E53935';
  return (
    <div style={{marginBottom:11}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:8, fontSize:12.5, fontWeight:700, marginBottom:4, color:'var(--text)'}}>
        <span>{icon} {label}{weight ? <span style={{fontSize:10.5, fontWeight:800, color:'#9A9A9A'}}> · vale {Math.round(weight*100)}%</span> : null}</span>
        <span style={{color, fontWeight:800}}>{has ? v + '%' : '—'}</span>
      </div>
      <div style={{height:9, background:'#ECE9E0', borderRadius:6, overflow:'hidden'}}>
        <div style={{height:'100%', width:v + '%', background:color, borderRadius:6, transition:'width .5s'}}></div>
      </div>
      {detail && <div style={{fontSize:11, color:'var(--text-soft)', fontWeight:600, marginTop:3}}>{detail}</div>}
    </div>
  );
}

function ReadinessCard({ student, forTeacher }) {
  const { getStudentReadiness, COMPETENCIES } = window.JUCUM_DATA;
  const r = getStudentReadiness(student);
  const apt = r.apt;
  const [showComp, setShowComp] = React.useState(false);
  const pillars = r.pillars || [];
  // Detalle por competencia (Speaking es opcional en Pre-A1: no se exige)
  const comps = COMPETENCIES.filter(c => !(c.optionalLevels || []).includes(student.level));
  const showSpeakingNote = comps.some(c => c.key === 'speaking');
  const barColor = apt ? '#2EA84B' : r.overall >= 50 ? '#F9A825' : '#E53935';

  return (
    <div className="scard">
      <div className="sec-head">
        <div className="sec-title">🎓 {forTeacher ? 'Preparación para el examen' : '¿Listo para tu examen?'}</div>
        <span className="mm-chip" style={{background: apt ? '#E8F5E9' : '#FFF8E1', color: apt ? '#2E7D32' : '#E65100'}}>
          {apt ? '✓ Apto' : `Falta ${r.threshold - r.overall}%`}
        </span>
      </div>

      {/* Cumplimiento general */}
      <div style={{display:'flex', alignItems:'center', gap:14, marginBottom:14}}>
        <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:700, fontSize:34, color:barColor, lineHeight:1}}>{r.overall}%</div>
        <div style={{flex:1}}>
          <div style={{height:12, background:'#ECE9E0', borderRadius:7, overflow:'hidden', position:'relative'}}>
            <div style={{height:'100%', width:r.overall + '%', background:barColor, borderRadius:7, transition:'width .6s'}}></div>
            <div style={{position:'absolute', top:-2, bottom:-2, left:'75%', width:2, background:'#1F3A8A'}} title="Mínimo 75%"></div>
          </div>
          <div style={{fontSize:11, color:'var(--text-soft)', fontWeight:700, marginTop:4}}>Cumplimiento general · mínimo 75% (línea azul)</div>
        </div>
      </div>

      {typeof r.daysInactive === 'number' && r.daysInactive >= 7 &&
        <div style={{fontSize:11.5, fontWeight:800, color:'#C62828', background:'#FFEBEE', border:'1px solid #FFCDD2', borderRadius:10, padding:'6px 10px', marginBottom:11}}>
          ⚠ {r.daysInactive} días sin practicar — la preparación baja mientras no retome.
        </div>}

      {/* Los 4 criterios */}
      {pillars.map(p => <CompBar key={p.key} icon={p.icon} label={p.label} value={p.value} detail={p.detail} weight={p.weight} />)}

      <button onClick={() => setShowComp(v => !v)} style={{marginTop:2, cursor:'pointer', border:'1.5px solid var(--border)', background:'#fff',
        borderRadius:20, padding:'7px 13px', fontFamily:'inherit', fontWeight:800, fontSize:11.5, color:'#666'}}>
        {showComp ? 'Ocultar detalle por competencia' : '🔎 Ver detalle por competencia'}
      </button>

      {showComp && (
        <div style={{marginTop:12, paddingTop:12, borderTop:'1px dashed var(--border)'}}>
          <div style={{fontSize:11, fontWeight:800, letterSpacing:'.06em', textTransform:'uppercase', color:'#A8A8A8', marginBottom:8}}>
            Cómo va por competencia (informativo)
          </div>
          {comps.map(c => <CompBar key={c.key} icon={c.icon} label={c.label} value={r.competencies[c.key]} />)}
          {showSpeakingNote &&
            <div style={{fontSize:11, color:'var(--text-soft)', margin:'-2px 0 6px', lineHeight:1.45}}>
              {forTeacher
                ? '🗣️ El Speaking no tiene material en la plataforma: se practica por tareas y su % sale de tu evaluación presencial (estrellas de Speaking).'
                : '🗣️ Tu Speaking se practica con las tareas; la nota la pone tu profesor en clase. ¡Tú sigue practicando! 💪'}
            </div>}
        </div>
      )}

      <div style={{marginTop:12, padding:'10px 12px', borderRadius:10, fontSize:12.5, lineHeight:1.5,
                   background: apt ? '#E8F5E9' : '#FFF8E1', border:'1px solid ' + (apt ? '#A5D6A7' : '#FFE082'),
                   color: apt ? '#1B5E20' : '#7A4E00'}}>
        {forTeacher
          ? (apt
              ? 'El alumno alcanza el mínimo. Aun así, tú tienes la última palabra para habilitar el examen.'
              : 'Por debajo del 75%. La plataforma lo marca como no apto, pero puedes habilitarle el examen igual si lo decides.')
          : (apt
              ? '¡Vas listo! 🎉 Mantén tu constancia. Tu profesor habilitará tu examen cuando corresponda.'
              : 'Aún no llegas al 75% para rendir tu examen de avance. Sube completando las prácticas del módulo, practicando un poco CADA día y entregando tus tareas. 💪')}
      </div>
    </div>
  );
}

Object.assign(window, { ReadinessCard, CompBar });
