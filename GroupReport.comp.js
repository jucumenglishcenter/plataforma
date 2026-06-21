/* Mejora F · Group report (print-to-PDF friendly view) */

const { useState: rpUseState } = React;

function GroupReport({ groupId, onBack }) {
  const { GROUPS, STUDENTS, LEVELS, MODULE_CATALOG, getStudentProgress, getStudentXP, getStudentMastery, entryPassed, getFarmingFlag, passThreshold, getRetention } = window.JUCUM_DATA;
  const group = GROUPS.find(g => g.id === groupId);
  const level = LEVELS[group.level];
  const members = STUDENTS.filter(s => s.group === groupId).sort((a,b) => getStudentMastery(b).pct - getStudentMastery(a).pct);
  const mods = MODULE_CATALOG[group.level] || [];
  const totalActs = mods.reduce((s,m) => s + m.activities.length, 0);
  const groupAvg = members.length ? Math.round(members.reduce((s,x)=>s+getStudentMastery(x).pct,0)/members.length) : 0;
  const today = new Date().toLocaleDateString('es-PE', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const thr = passThreshold(group.level, group.id);
  const flagged = members.map(s => ({ s, flag: getFarmingFlag(s) })).filter(x => x.flag);

  return (
    <main className="report-page">
      <div className="no-print" style={{display:'flex',gap:10,alignItems:'center',marginBottom:16}}>
        <button className="back-btn" onClick={onBack} style={{marginBottom:0}}>← Volver</button>
        <div style={{flex:1}}></div>
        <button className="btn-save" onClick={() => window.print()}>🖨 Imprimir / Guardar PDF</button>
      </div>

      <div className="report-head">
        <img src={window.JUCUM_LOGO || 'logo-jucum.png'} alt="JUCUM EC" style={{height:64}} />
        <div>
          <div className="report-title">Reporte de grupo</div>
          <div className="report-sub">{level.emoji} {group.name} · {group.schedule}</div>
          <div className="report-date">Generado el {today} · umbral de aprobación {thr}%</div>
        </div>
      </div>

      <div className="report-stats">
        <div className="rstat"><b>{members.length}</b> alumnos</div>
        <div className="rstat"><b>{groupAvg}%</b> dominio del grupo</div>
        <div className="rstat"><b>{members.filter(s => s.lastActiveDays <= 1).length}</b> activos esta semana</div>
        <div className="rstat"><b>{members.filter(s => s.lastActiveDays >= 7).length}</b> requieren atención</div>
      </div>

      {flagged.length > 0 && (
        <div style={{margin:'0 0 18px', border:'1px solid #F1B0AA', background:'#FEF7F6', borderRadius:12, padding:'14px 16px'}}>
          <div style={{fontWeight:800, color:'#A33227', fontSize:14, display:'flex', alignItems:'center', gap:8, marginBottom:8}}>
            🚩 Alerta "rápido y mal" · {flagged.length} alumno{flagged.length===1?'':'s'} <span style={{fontWeight:600, fontSize:11.5, color:'#9c5d00'}}>(solo visible para ti)</span>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:7}}>
            {flagged.map(({s, flag}) => (
              <div key={s.id} style={{fontSize:12.8, color:'#7d2218', lineHeight:1.5}}>
                <b>{s.fullName}</b> — hizo <b>{flag.count}</b> actividades el mismo día ({flag.day}) con promedio <b>{flag.avg}%</b> y <b>{flag.failed} reprobada{flag.failed===1?'':'s'}</b> (umbral {thr}%). Sugerencia: pedir que repita las que están en rojo para aprobar.
              </div>
            ))}
          </div>
        </div>
      )}

      <table className="report-table">
        <thead>
          <tr>
            <th>#</th><th>Alumno</th><th>Usuario</th><th>Progreso</th><th>Dominio</th><th>Aciertos</th><th>Retención</th><th>Racha</th><th>Tiempo</th><th>Última conexión</th>
          </tr>
        </thead>
        <tbody>
          {members.map((s, i) => {
            const prog = getStudentProgress(s.id);
            const done = mods.reduce((acc,m) => acc + m.activities.filter(a => entryPassed(prog.completed[`${m.id}:${a.id}`], s.level, s.group)).length, 0);
            const pct = totalActs ? Math.round((done/totalActs)*100) : 0;
            const mastery = getStudentMastery(s).pct;
            const flag = getFarmingFlag(s);
            const ret = getRetention ? getRetention(s) : { dir:'none', count:0 };
            const retCell = ret.dir === 'none'
              ? <span style={{color:'#A8A8A8'}}>—</span>
              : ret.dir === 'up'
                ? <span style={{fontWeight:800, color:'#2E7D32'}}>📈 +{ret.delta}</span>
                : ret.dir === 'down'
                  ? <span style={{fontWeight:800, color:'#C0392B'}}>📉 {ret.delta}</span>
                  : <span style={{fontWeight:800, color:'#7a7466'}}>➡️</span>;
            return (
              <tr key={s.id} style={flag ? {background:'#FEF7F6'} : null}>
                <td>{i+1}</td>
                <td className="rt-name">{flag ? '🚩 ' : (s.starred ? '⭐ ' : '')}{s.fullName}</td>
                <td>@{s.username}</td>
                <td>{done}/{totalActs} ({pct}%){flag ? <span style={{color:'#C0392B',fontWeight:800,fontSize:11}}> · rápido y mal</span> : null}</td>
                <td className={mastery >= 85 ? 'rt-high' : mastery >= 70 ? 'rt-mid' : mastery > 0 ? 'rt-low' : ''}>{mastery > 0 ? mastery + '%' : '—'}</td>
                <td className={s.avgScore >= 85 ? 'rt-high' : s.avgScore >= 70 ? 'rt-mid' : s.avgScore > 0 ? 'rt-low' : ''}>{s.avgScore > 0 ? s.avgScore + '%' : '—'}</td>
                <td title={ret.count ? `${ret.count} práctica(s) repasada(s): ${ret.from}% → ${ret.to}%` : 'Sin repasos aún'}>{retCell}</td>
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
