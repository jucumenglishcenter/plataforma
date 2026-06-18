/* Bloque K · Registro de notas (boletín consolidado)
 * Junta exámenes, tareas calificadas y evaluaciones presenciales como
 * evidencia del avance. Lo usan el alumno (sus notas) y el profesor (ficha).
 */

function gradeColor(g) {
  if (typeof g !== 'number') return '#9E9E9E';
  return g >= 85 ? '#2E7D32' : g >= 70 ? '#1565C0' : g >= 50 ? '#E65100' : '#C62828';
}
function gradeBg(g) {
  if (typeof g !== 'number') return '#F5F5F0';
  return g >= 85 ? '#E8F5E9' : g >= 70 ? '#E3F2FD' : g >= 50 ? '#FFF8E1' : '#FFEBEE';
}
const KIND_LABEL = { exam:'Examen', task:'Tarea', eval:'Evaluación' };

function GradesRecord({ student, forTeacher }) {
  const { getStudentGrades } = window.JUCUM_DATA;
  const grades = getStudentGrades(student);
  const nums = grades.map(g => g.grade).filter(g => typeof g === 'number');
  const avg = nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : null;
  const exams = grades.filter(g => g.kind === 'exam');
  const passed = exams.filter(g => g.passed === true).length;

  return (
    <div className="scard">
      <div className="sec-head">
        <div className="sec-title">📋 Registro de notas</div>
        <span className="sec-meta">{grades.length} registro{grades.length===1?'':'s'}{avg!=null?` · promedio ${avg}/100`:''}</span>
      </div>

      {grades.length === 0 ? (
        <div className="empty-state"><div className="icon">📋</div>{forTeacher ? 'Aún no hay notas registradas para este alumno.' : 'Aún no tienes notas registradas. Aparecerán aquí cuando rindas exámenes o el profesor califique tus tareas.'}</div>
      ) : (
        <>
          {/* resumen */}
          <div style={{display:'flex', gap:10, flexWrap:'wrap', marginBottom:12}}>
            {avg != null && <div className="rstat" style={{padding:'8px 14px'}}><b style={{color:gradeColor(avg)}}>{avg}</b> promedio</div>}
            {exams.length > 0 && <div className="rstat" style={{padding:'8px 14px'}}><b style={{color:'#1565C0'}}>{passed}/{exams.length}</b> exámenes aprobados</div>}
            <div className="rstat" style={{padding:'8px 14px'}}><b>{grades.length}</b> notas</div>
          </div>

          <div className="sm-list">
            {grades.map((g, i) => (
              <div key={i} className="sm-row" style={{flexWrap:'wrap', alignItems:'flex-start'}}>
                <div style={{width:34, height:34, borderRadius:9, background:gradeBg(g.grade), display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0}}>{g.icon}</div>
                <div className="sm-info">
                  <div className="sm-name">{g.title} <span className="mm-chip" style={{background:'#EEE', color:'#666', marginLeft:4}}>{KIND_LABEL[g.kind]}</span></div>
                  <div className="sm-meta">
                    {g.date ? new Date(g.date).toLocaleDateString('es-PE',{day:'numeric',month:'short',year:'numeric'}) : '—'}
                    {g.kind === 'exam' && typeof g.passed === 'boolean' && <span style={{color: g.passed?'#2E7D32':'#C62828', fontWeight:800}}> · {g.passed?'Aprobó':'Reprobó'}</span>}
                    {g.stars && g.stars.length > 0 && <span> · {g.stars.map(s => `${s.k[0].toUpperCase()+s.k.slice(1,3)} ${s.v}/5`).join(' · ')}</span>}
                  </div>
                  {g.feedback && <div className="fpost-body sm" style={{marginTop:4, color:'var(--text-soft)'}}>“{g.feedback}”</div>}
                </div>
                <span style={{fontFamily:"'Fredoka',sans-serif", fontWeight:700, fontSize:18, padding:'4px 12px', borderRadius:9, background:gradeBg(g.grade), color:gradeColor(g.grade), flexShrink:0}}>
                  {typeof g.grade === 'number' ? `${g.grade}` : '—'}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

Object.assign(window, { GradesRecord });
