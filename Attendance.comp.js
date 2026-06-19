/* Bloque M · Asistencia — UI
 * TeacherAttendance : el profesor elige grupo + fecha y marca asistió/faltó/justificó
 *                     + participación (0–3) por alumno.
 * AdminAttendance   : seguimiento — alumnos con faltas/tendencia negativa primero,
 *                     para que la administración llame.
 * StudentAttendance : el alumno ve su asistencia + estado de "semana perfecta".
 */
const { useState: atUseState } = React;

const STATUS = {
  asistio:   { label:'Asistió',    icon:'✅', color:'#2E7D32', bg:'#E8F5E9' },
  falto:     { label:'Faltó',      icon:'❌', color:'#C62828', bg:'#FFEBEE' },
  justifico: { label:'Justificó',  icon:'📝', color:'#E65100', bg:'#FFF8E1' },
};

/* ═══════════ PROFESOR ═══════════ */
function TeacherAttendance({ onBack }) {
  const { GROUPS, STUDENTS, LEVELS } = window.JUCUM_DATA;
  const A = window.JUCUM_ATT;
  const [groupId, setGroupId] = atUseState(GROUPS[0]?.id || '');
  const [date, setDate] = atUseState(A.todayStr());
  const [, setTick] = atUseState(0);
  const refresh = () => setTick(t => t + 1);
  const members = STUDENTS.filter(s => s.group === groupId);
  const group = GROUPS.find(g => g.id === groupId);

  const setStatus = (sid, status) => { A.setAttendance(date, groupId, sid, status); refresh(); };
  const setPart = (sid, p) => { const r = A.getStudentRecord(date, sid); A.setAttendance(date, groupId, sid, r?.status || 'asistio', p); refresh(); };
  const markAll = (status) => { members.forEach(s => A.setAttendance(date, groupId, s.id, status)); refresh(); };

  const marked = members.filter(s => A.getStudentRecord(date, s.id)).length;

  return (
    <main>
      <button className="back-btn" onClick={onBack}>← Volver al panel</button>
      <div className="welcome teacher">
        <div className="welcome-text">
          <div className="eyebrow t">📋 Asistencia</div>
          <h1>Lista del día</h1>
          <p>Marca quién asistió, faltó o justificó, y su participación en clase. La administración lo verá para el seguimiento.</p>
        </div>
      </div>

      <div className="scard" style={{marginTop:18}}>
        <div className="row-flex" style={{gap:12, flexWrap:'wrap', alignItems:'flex-end'}}>
          <div>
            <div className="settings-label">Grupo</div>
            <select className="input-text" value={groupId} onChange={e=>setGroupId(e.target.value)}>
              {GROUPS.map(g => <option key={g.id} value={g.id}>{LEVELS[g.level]?.emoji} {g.name}</option>)}
            </select>
          </div>
          <div>
            <div className="settings-label">Fecha</div>
            <input type="date" className="input-text" value={date} max={A.todayStr()} onChange={e=>setDate(e.target.value)} />
          </div>
          <div style={{flex:1}}></div>
          <div style={{display:'flex', gap:6}}>
            <button className="att-btn" onClick={()=>markAll('asistio')}>✅ Todos asistieron</button>
            <button className="att-btn" onClick={()=>markAll('falto')}>❌ Todos faltaron</button>
          </div>
        </div>
        <div className="settings-hint" style={{marginTop:8}}>{marked}/{members.length} marcados · {group?.name}</div>
      </div>

      <div className="scard" style={{marginTop:14}}>
        <div className="sm-list">
          {members.length === 0 ? <div className="empty-state">Este grupo no tiene alumnos.</div> :
            members.map(s => {
              const r = A.getStudentRecord(date, s.id);
              const level = LEVELS[s.level];
              return (
                <div key={s.id} className="sm-row" style={{flexWrap:'wrap'}}>
                  <div className="st-ava" style={{background:`linear-gradient(135deg,${level.color}80,${level.dark})`}}>{s.fullName.split(' ').map(n=>n[0]).slice(0,2).join('')}</div>
                  <div className="sm-info"><div className="sm-name">{s.fullName}</div><div className="sm-meta">@{s.username}</div></div>
                  <div style={{display:'flex', gap:5}}>
                    {Object.entries(STATUS).map(([k, v]) => (
                      <button key={k} onClick={()=>setStatus(s.id, k)} title={v.label}
                        style={{border:'2px solid '+(r?.status===k?v.color:'#E5E1D6'), background:r?.status===k?v.bg:'#fff', color:r?.status===k?v.color:'#999',
                                borderRadius:9, padding:'6px 10px', fontWeight:800, fontSize:12.5, cursor:'pointer'}}>{v.icon} {v.label}</button>
                    ))}
                  </div>
                  {r?.status === 'asistio' && (
                    <div style={{display:'flex', alignItems:'center', gap:4, marginLeft:8}} title="Participación en clase">
                      <span style={{fontSize:11, fontWeight:700, color:'#888'}}>Participó:</span>
                      {[0,1,2,3].map(p => (
                        <button key={p} onClick={()=>setPart(s.id, p)}
                          style={{width:26, height:26, borderRadius:7, border:'2px solid '+((r?.participation||0)>=p&&p>0?'#1F8A5B':'#E5E1D6'),
                                  background:(r?.participation||0)>=p&&p>0?'#E8F5E9':'#fff', color:(r?.participation||0)>=p&&p>0?'#1F8A5B':'#bbb',
                                  fontWeight:800, cursor:'pointer', fontSize:12}}>{p===0?'–':p}</button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </main>
  );
}

/* ═══════════ ADMIN (seguimiento) ═══════════ */
function AdminAttendance() {
  const { GROUPS, STUDENTS, LEVELS } = window.JUCUM_DATA;
  const A = window.JUCUM_ATT;
  const [open, setOpen] = atUseState(null);
  const [groupId, setGroupId] = atUseState('all');
  const list = (groupId === 'all' ? STUDENTS : STUDENTS.filter(s => s.group === groupId))
    .map(s => ({ s, sum: A.getStudentSummary(s.id, 60) }))
    .filter(x => x.sum.total > 0)
    .sort((a, b) => {
      // prioridad: faltas consecutivas, luego menor % asistencia
      if (b.sum.streakAbsent !== a.sum.streakAbsent) return b.sum.streakAbsent - a.sum.streakAbsent;
      return (a.sum.pct ?? 100) - (b.sum.pct ?? 100);
    });

  const atRisk = list.filter(x => x.sum.streakAbsent >= 2 || (x.sum.pct != null && x.sum.pct < 70));

  return (
    <main>
      <div className="welcome teacher">
        <div className="welcome-text">
          <div className="eyebrow t">📋 Asistencia · seguimiento</div>
          <h1>Seguimiento de alumnos</h1>
          <p><b>{atRisk.length}</b> alumno(s) requieren atención por faltas o baja asistencia. Llámalos para reengancharlos.</p>
        </div>
      </div>

      {atRisk.length > 0 && (
        <div className="scard" style={{marginTop:18, background:'#FFEBEE', borderColor:'#EF9A9A'}}>
          <div className="sec-head"><div className="sec-title" style={{color:'#C62828'}}>⚠ Atención prioritaria</div></div>
          <div className="settings-hint" style={{color:'#7A1212'}}>Estos alumnos muestran una tendencia negativa. Conviene contactarlos pronto antes de que abandonen.</div>
        </div>
      )}

      <div className="scard" style={{marginTop:14}}>
        <div className="row-flex" style={{marginBottom:12}}>
          <select className="input-text" value={groupId} onChange={e=>setGroupId(e.target.value)}>
            <option value="all">Todos los grupos</option>
            {GROUPS.map(g => <option key={g.id} value={g.id}>{LEVELS[g.level]?.emoji} {g.name}</option>)}
          </select>
        </div>
        <div className="sm-list">
          {list.length === 0 ? <div className="empty-state"><div className="icon">📋</div>Aún no hay asistencia registrada.</div> :
            list.map(({ s, sum }) => {
              const level = LEVELS[s.level];
              const risk = sum.streakAbsent >= 2 || (sum.pct != null && sum.pct < 70);
              const group = GROUPS.find(g => g.id === s.group);
              return (
                <div key={s.id} className="sm-row" style={{flexWrap:'wrap', background: risk?'#FFF6F6':undefined, cursor:'pointer'}} onClick={()=>setOpen(s)}>
                  <div className="st-ava" style={{background:`linear-gradient(135deg,${level.color}80,${level.dark})`}}>{s.fullName.split(' ').map(n=>n[0]).slice(0,2).join('')}</div>
                  <div className="sm-info">
                    <div className="sm-name">{risk && '⚠ '}{s.fullName}</div>
                    <div className="sm-meta">{group?.name} · {sum.asistio} asistencias · {sum.falto} faltas · {sum.justifico} justificadas</div>
                  </div>
                  {sum.streakAbsent >= 2 && <span className="mm-chip" style={{background:'#FFEBEE', color:'#C62828'}}>{sum.streakAbsent} faltas seguidas</span>}
                  <span className="mm-chip" style={{background: sum.pct>=85?'#E8F5E9':sum.pct>=70?'#FFF8E1':'#FFEBEE', color: sum.pct>=85?'#2E7D32':sum.pct>=70?'#E65100':'#C62828'}}>{sum.pct}% asistencia</span>
                </div>
              );
            })}
        </div>
      </div>
      {open && window.StudentDataModal && <window.StudentDataModal student={open} onClose={()=>setOpen(null)} />}
    </main>
  );
}

/* ═══════════ ALUMNO ═══════════ */
function StudentAttendanceCard({ student }) {
  const A = window.JUCUM_ATT;
  const sum = A.getStudentSummary(student.id, 60);
  const wk = A.getWeekAttendance(student.id);
  const hist = A.getStudentHistory(student.id, 8);
  if (sum.total === 0) return null;

  return (
    <div className="scard">
      <div className="sec-head">
        <div className="sec-title">📋 Mi asistencia</div>
        {wk.perfect
          ? <span className="mm-chip" style={{background:'#E8F5E9', color:'#2E7D32'}}>🏆 Semana perfecta</span>
          : wk.classes > 0 ? <span className="mm-chip" style={{background:'#FFF8E1', color:'#E65100'}}>Esta semana: {wk.missed ? 'tienes una falta' : 'vas bien'}</span> : null}
      </div>

      <div style={{display:'flex', gap:10, flexWrap:'wrap', marginBottom:12}}>
        <div className="rstat" style={{padding:'8px 14px'}}><b style={{color: sum.pct>=85?'#2E7D32':sum.pct>=70?'#E65100':'#C62828'}}>{sum.pct}%</b> asistencia</div>
        <div className="rstat" style={{padding:'8px 14px'}}><b>{sum.asistio}</b> asistencias</div>
        <div className="rstat" style={{padding:'8px 14px'}}><b>{sum.falto}</b> faltas</div>
      </div>

      <div style={{padding:'10px 12px', borderRadius:10, fontSize:12.5, lineHeight:1.5, background:'#FFF8E8', border:'1px solid #F4C430', color:'#7A5C00'}}>
        🏆 <b>Asiste toda la semana</b> y mantente al día en tus prácticas para ganar <b>+120 XP</b> y subir en el Top. ¡La asistencia te hace más competitivo!
      </div>

      <div className="al-items" style={{marginTop:12}}>
        {hist.map((h, i) => {
          const v = STATUS[h.status] || STATUS.asistio;
          return (
            <div key={i} className="sm-row" style={{padding:'8px 10px'}}>
              <span style={{fontSize:16}}>{v.icon}</span>
              <div className="sm-info"><div className="sm-name" style={{fontSize:13}}>{new Date(h.date+'T12:00').toLocaleDateString('es-PE',{weekday:'long', day:'numeric', month:'long'})}</div></div>
              <span className="mm-chip" style={{background:v.bg, color:v.color}}>{v.label}{h.status==='asistio'&&h.participation>0?` · participó ${h.participation}/3`:''}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { TeacherAttendance, AdminAttendance, StudentAttendanceCard });
