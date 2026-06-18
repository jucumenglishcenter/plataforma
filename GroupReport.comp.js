/* Mejora F · Group report (print-to-PDF friendly view) */

const { useState: rpUseState } = React;

function GroupReport({ groupId, onBack }) {
  const { GROUPS, STUDENTS, LEVELS, MODULE_CATALOG, getStudentProgress, getStudentXP, getStudentMastery } = window.JUCUM_DATA;
  const group = GROUPS.find(g => g.id === groupId);
  const level = LEVELS[group.level];
  const members = STUDENTS.filter(s => s.group === groupId).sort((a,b) => getStudentMastery(b).pct - getStudentMastery(a).pct);
  const mods = MODULE_CATALOG[group.level] || [];
  const totalActs = mods.reduce((s,m) => s + m.activities.length, 0);
  const groupAvg = members.length ? Math.round(members.reduce((s,x)=>s+getStudentMastery(x).pct,0)/members.length) : 0;
  const today = new Date().toLocaleDateString('es-PE', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  return (
    <main className="report-page">
      <div className="no-print" style={{display:'flex',gap:10,alignItems:'center',marginBottom:16}}>
        <button className="back-btn" onClick={onBack} style={{marginBottom:0}}>← Volver</button>
        <div style={{flex:1}}></div>
        <button className="btn-save" onClick={() => window.print()}>🖨 Imprimir / Guardar PDF</button>
      </div>

      <div className="report-head">
        <img src="logo-jucum.png" alt="JUCUM EC" style={{height:64}} />
        <div>
          <div className="report-title">Reporte de grupo</div>
          <div className="report-sub">{level.emoji} {group.name} · {group.schedule}</div>
          <div className="report-date">Generado el {today}</div>
        </div>
      </div>

      <div className="report-stats">
        <div className="rstat"><b>{members.length}</b> alumnos</div>
        <div className="rstat"><b>{groupAvg}%</b> dominio del grupo</div>
        <div className="rstat"><b>{members.filter(s => s.lastActiveDays <= 1).length}</b> activos esta semana</div>
        <div className="rstat"><b>{members.filter(s => s.lastActiveDays >= 7).length}</b> requieren atención</div>
      </div>

      <table className="report-table">
        <thead>
          <tr>
            <th>#</th><th>Alumno</th><th>Usuario</th><th>Progreso</th><th>Dominio</th><th>Aciertos</th><th>Racha</th><th>Tiempo</th><th>Última conexión</th>
          </tr>
        </thead>
        <tbody>
          {members.map((s, i) => {
            const prog = getStudentProgress(s.id);
            const done = mods.reduce((acc,m) => acc + m.activities.filter(a => prog.completed[`${m.id}:${a.id}`]).length, 0);
            const pct = totalActs ? Math.round((done/totalActs)*100) : 0;
            const mastery = getStudentMastery(s).pct;
            return (
              <tr key={s.id}>
                <td>{i+1}</td>
                <td className="rt-name">{s.starred && '⭐ '}{s.fullName}</td>
                <td>@{s.username}</td>
                <td>{done}/{totalActs} ({pct}%)</td>
                <td className={mastery >= 85 ? 'rt-high' : mastery >= 70 ? 'rt-mid' : mastery > 0 ? 'rt-low' : ''}>{mastery > 0 ? mastery + '%' : '—'}</td>
                <td className={s.avgScore >= 85 ? 'rt-high' : s.avgScore >= 70 ? 'rt-mid' : s.avgScore > 0 ? 'rt-low' : ''}>{s.avgScore > 0 ? s.avgScore + '%' : '—'}</td>
                <td>{s.streak > 0 ? `🔥 ${s.streak}` : '—'}</td>
                <td>{Math.floor(s.totalMinutes/60)}h {s.totalMinutes%60}m</td>
                <td>{s.lastActiveDays === 0 ? 'Hoy' : `hace ${s.lastActiveDays}d`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="report-foot">
        JUCUM English Center · Tingo María, Perú · Reporte generado desde la plataforma de seguimiento
      </div>
    </main>
  );
}

Object.assign(window, { GroupReport });
