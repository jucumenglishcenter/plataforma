/* Bloque Q · Recomendado esta semana (profesor)
 * Para un grupo: sugiere qué practicar esta semana según dónde están los alumnos:
 *  - la competencia más floja del grupo
 *  - las próximas actividades del módulo activo que la mayoría aún no hace
 *  - alumnos que necesitan atención (inactivos o por debajo)
 * Todo se deriva de los datos reales (progreso, dominio, readiness).
 */
function WeeklyPlan({ groupId }) {
  const D = window.JUCUM_DATA;
  const group = D.GROUPS.find(g => g.id === groupId);
  if (!group) return null;
  const members = D.STUDENTS.filter(s => s.group === groupId);
  if (members.length === 0) return null;

  // competencia más floja del grupo
  const comps = D.COMPETENCIES;
  const compAvg = comps.map(c => {
    const vals = members.map(s => D.getStudentReadiness(s).competencies[c.key]).filter(v => typeof v === 'number');
    return { c, avg: vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : null };
  }).filter(x => x.avg != null).sort((a,b) => a.avg - b.avg);
  const weakest = compAvg[0];

  // módulo activo + próximas actividades que la mayoría no ha hecho
  const settings = D.getGroupSettings(groupId);
  const activeIds = (settings.activeModuleIds && settings.activeModuleIds.length) ? settings.activeModuleIds : (settings.activeModuleId ? [settings.activeModuleId] : []);
  const mods = (D.MODULE_CATALOG[group.level] || []).filter(m => activeIds.includes(m.id));
  const pending = [];
  mods.forEach(m => (m.activities||[]).forEach(a => {
    const done = members.filter(s => (D.getStudentProgress(s.id).completed||{})[`${m.id}:${a.id}`]).length;
    const ratio = done / members.length;
    if (ratio < 0.6) pending.push({ mod:m, act:a, donePct: Math.round(ratio*100) });
  }));
  pending.sort((a,b) => a.donePct - b.donePct);
  const topPending = pending.slice(0, 4);

  // alumnos que necesitan atención
  const attention = members.map(s => ({ s, r: D.getStudentReadiness(s) }))
    .filter(x => (x.s.lastActiveDays||0) >= 4 || x.r.overall < 50)
    .sort((a,b) => a.r.overall - b.r.overall).slice(0, 5);

  const typeIco = (t) => ({ story:'📗', reading:'📖', listening:'🎧', grammar:'📝', summary:'📚' })[t] || '📄';

  return (
    <div className="scard" style={{marginBottom:16, background:'#F5F8FF', borderColor:'#C9D4F0'}}>
      <div className="sec-head">
        <div className="sec-title">📌 Recomendado esta semana</div>
        <span className="sec-meta">Para {group.name}</span>
      </div>

      {weakest && (
        <div style={{marginBottom:12, fontSize:13.5, lineHeight:1.5}}>
          🎯 El grupo está más flojo en <b>{weakest.c.icon} {weakest.c.label}</b> (promedio {weakest.avg}%).
          Dedica unos minutos de clase a reforzarla y deja práctica de esta competencia.
        </div>
      )}

      {topPending.length > 0 ? (
        <>
          <div style={{fontWeight:800, fontSize:12.5, color:'var(--text-soft)', marginBottom:6}}>Prácticas para dejar esta semana (la mayoría aún no las hace):</div>
          <div className="al-items">
            {topPending.map((p,i) => (
              <div key={i} className="sm-row" style={{padding:'8px 10px'}}>
                <span style={{fontSize:16}}>{typeIco(p.act.type)}</span>
                <div className="sm-info">
                  <div className="sm-name" style={{fontSize:13}}>{p.act.name}</div>
                  <div className="sm-meta">{p.mod.name}{p.act.group?` · ${p.act.group}`:''}</div>
                </div>
                <span className="mm-chip" style={{background:'#FFF8E1', color:'#E65100'}}>{p.donePct}% lo hizo</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="settings-hint">¡El grupo va al día con las actividades del módulo activo! Buen momento para reforzar lo más flojo o avanzar al siguiente módulo.</div>
      )}

      {attention.length > 0 && (
        <div style={{marginTop:12, paddingTop:12, borderTop:'1px dashed var(--border)'}}>
          <div style={{fontWeight:800, fontSize:12.5, color:'#C62828', marginBottom:6}}>⚠ Alumnos que necesitan un empujón:</div>
          <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
            {attention.map(x => (
              <span key={x.s.id} className="mm-chip" style={{background:'#FFEBEE', color:'#C62828'}}>
                {x.s.fullName} · {x.r.overall}%{(x.s.lastActiveDays||0)>=4?` · ${x.s.lastActiveDays}d sin practicar`:''}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { WeeklyPlan });
