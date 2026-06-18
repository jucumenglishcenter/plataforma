/* Teacher dashboard.
 * Views:  groups   — overview of all groups + KPIs
 *         group    — students in a single group with progress
 *         student  — detailed view of one student
 */

function TeacherDashboard({ onLogout }) {
  const { STUDENTS, GROUPS, LEVELS, ACHIEVEMENT_DEFS, ACTIVITY_LOG, getStudentMastery } = window.JUCUM_DATA;
  const [view, setView] = React.useState({ kind:'groups' });

  // Reset palette
  React.useEffect(() => { document.body.removeAttribute('data-level'); }, []);

  const totalStudents = STUDENTS.length;
  const activeToday = STUDENTS.filter(s => s.lastActiveDays === 0).length;
  const avgMastery = STUDENTS.length ? Math.round(STUDENTS.reduce((s, x) => s + getStudentMastery(x).pct, 0) / STUDENTS.length) : 0;

  /* ─── header is shared ─── */
  return (
    <>
      <header className="app-header">
        <div className="app-logo">
          <img src="../../assets/logo-jucum.png" alt="JUCUM EC" />
          <div className="pgtitle">Panel del Profesor</div>
        </div>
        <div className="app-right">
          <span className="role-pill t">👨‍🏫 Profesor</span>
          <a className="nav-link" href="#" onClick={(e)=>{e.preventDefault();setView({kind:'forum'});}}>💬 Foro</a>
          <a className="nav-link" href="#" onClick={(e)=>{e.preventDefault();setView({kind:'evaluate'});}}>📊 Evaluar</a>
          <a className="nav-link" href="#" onClick={(e)=>{e.preventDefault();setView({kind:'modules'});}}>📦 Módulos</a>
          <a className="nav-link" href="#" onClick={(e)=>{e.preventDefault();setView({kind:'manage'});}}>⚙️ Grupos</a>
          <a className="nav-link" href="#" onClick={(e)=>{e.preventDefault();setView({kind:'students'});}}>👥 Alumnos</a>
          <a className="nav-link" href="#" onClick={(e)=>{e.preventDefault();setView({kind:'promote'});}}>🎓 Avance</a>
          <NotifBell userId="teacher" />
          <div className="user-pill">
            <div className="ava" style={{background:'linear-gradient(135deg,#3F5BB8,#0D1B5A)'}}>P</div>
            <span>Profesor</span>
          </div>
          <button className="logout-btn" onClick={onLogout} title="Cerrar sesión">⎋ Salir</button>
        </div>
      </header>

      {view.kind === 'evaluate' ? (
        <TeacherEvaluate onBack={() => setView({kind:'groups'})} />
      ) : view.kind === 'manage' ? (
        <ManageGroups onBack={() => setView({kind:'groups'})} />
      ) : view.kind === 'modules' ? (
        <ManageModules onBack={() => setView({kind:'groups'})} />
      ) : view.kind === 'students' ? (
        <ManageStudents onBack={() => setView({kind:'groups'})} />
      ) : view.kind === 'promote' ? (
        <LevelPromotion onBack={() => setView({kind:'groups'})} />
      ) : view.kind === 'forum' ? (
        <>
          <button className="back-btn" onClick={() => setView({kind:'groups'})} style={{padding:'10px 28px 0'}}>← Volver al panel</button>
          <Forum user={{ role:'teacher' }} />
        </>
      ) : (
      <main>
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <a onClick={() => setView({kind:'groups'})}>Grupos</a>
          {view.kind === 'group' && <><span>›</span><a onClick={() => setView({kind:'group', id:view.id})}>{GROUPS.find(g => g.id === view.id)?.name}</a></>}
          {view.kind === 'student' && (() => {
            const stu = STUDENTS.find(s => s.id === view.id);
            const g = GROUPS.find(gr => gr.id === stu.group);
            return <><span>›</span><a onClick={() => setView({kind:'group', id:g.id})}>{g.name}</a><span>›</span><a>{stu.fullName}</a></>;
          })()}
        </div>

        {view.kind === 'groups' && (
          <GroupsView
            stats={{ totalStudents, activeToday, avgMastery }}
            onSelectGroup={(id) => setView({kind:'group', id})}
          />
        )}
        {view.kind === 'group' && (
          <GroupDetail
            groupId={view.id}
            onBack={() => setView({kind:'groups'})}
            onSelectStudent={(id) => setView({kind:'student', id})}
          />
        )}
        {view.kind === 'student' && (
          <StudentDetail
            studentId={view.id}
            onBack={() => { const stu = STUDENTS.find(s => s.id === view.id); setView({kind:'group', id:stu.group}); }}
          />
        )}
      </main>
      )}
    </>
  );
}

/* ─── Groups overview ─────────────────────────────────────────────── */

function GroupsView({ stats, onSelectGroup }) {
  const { GROUPS, STUDENTS, LEVELS, getStudentMastery } = window.JUCUM_DATA;
  return (
    <>
      <div className="welcome teacher">
        <div className="welcome-text">
          <div className="eyebrow t">👨‍🏫 Panel general</div>
          <h1>{stats.totalStudents} alumnos · 4 grupos activos</h1>
          <p><b>{stats.activeToday}</b> alumnos activos hoy · Dominio general <b>{stats.avgMastery}%</b></p>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-ico">👥</div><div className="kpi-num">{stats.totalStudents}</div><div className="kpi-lbl">Total alumnos</div></div>
        <div className="kpi"><div className="kpi-ico">🟢</div><div className="kpi-num">{stats.activeToday}</div><div className="kpi-lbl">Activos hoy</div></div>
        <div className="kpi"><div className="kpi-ico">📊</div><div className="kpi-num">{stats.avgMastery}%</div><div className="kpi-lbl">Dominio</div></div>
        <div className="kpi"><div className="kpi-ico">🎯</div><div className="kpi-num">4</div><div className="kpi-lbl">Grupos</div></div>
      </div>

      <div className="sec-head" style={{marginTop:18}}>
        <div className="sec-title">Mis grupos</div>
        <span className="sec-meta">Click para ver los alumnos</span>
      </div>

      <div className="groups-grid">
        {GROUPS.map(g => {
          const level = LEVELS[g.level];
          const members = STUDENTS.filter(s => s.group === g.id);
          const groupAvg = members.length ? Math.round(members.reduce((s,x)=>s+getStudentMastery(x).pct,0)/members.length) : 0;
          const activeNow = members.filter(s => s.lastActiveDays <= 1).length;
          const inactive = members.filter(s => s.lastActiveDays >= 7).length;
          return (
            <div key={g.id} className={`gcard lvl-${g.level}`} onClick={() => onSelectGroup(g.id)}>
              <div className="gcard-head">
                <span className="gcard-pill">{level.emoji} {level.code}</span>
                <span className="gcard-count">{members.length} alumnos</span>
              </div>
              <div className="gcard-name">{g.name}</div>
              <div className="gcard-sched">⏰ {g.schedule}</div>
              <div className="gcard-stats">
                <div><b style={{color:level.dark}}>{groupAvg}%</b> dominio</div>
                <div><b style={{color:'#2E7D32'}}>{activeNow}</b> activos</div>
                {inactive > 0 && <div><b style={{color:'#C62828'}}>{inactive}</b> ausentes</div>}
              </div>
              <div className="gcard-go">Ver alumnos →</div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ─── Group detail (one group, students inside) ───────────────────── */

function GroupDetail({ groupId, onBack, onSelectStudent }) {
  const { GROUPS, STUDENTS, LEVELS, getStudentMastery } = window.JUCUM_DATA;
  const group = GROUPS.find(g => g.id === groupId);
  const level = LEVELS[group.level];
  const members = STUDENTS.filter(s => s.group === groupId);
  const [showSettings, setShowSettings] = React.useState(false);
  const [showReport, setShowReport] = React.useState(false);
  React.useEffect(() => { document.body.setAttribute('data-level', group.level); return () => document.body.removeAttribute('data-level'); }, [group.level]);

  const groupAvg = Math.round(members.reduce((s,x)=>s+getStudentMastery(x).pct,0)/members.length);
  const sorted = [...members].sort((a, b) => getStudentMastery(b).pct - getStudentMastery(a).pct);

  if (showReport) return <GroupReport groupId={groupId} onBack={() => setShowReport(false)} />;

  return (
    <>
      <button className="back-btn" onClick={onBack}>← Volver a grupos</button>
      <div className="welcome group">
        <div className="welcome-text">
          <div className="eyebrow">{level.emoji} {level.code} · {group.schedule}</div>
          <h1>{group.name}</h1>
          <p>{members.length} alumnos · dominio del grupo <b>{groupAvg}%</b> · iniciado el {group.startDate}</p>
        </div>
        <button className="btn-settings" onClick={() => setShowSettings(true)}>⚙️ Configurar grupo</button>
        <button className="btn-settings" onClick={() => setShowReport(true)} style={{marginLeft:8}}>📄 Reporte PDF</button>
      </div>

      <div className="student-table">
        <div className="st-head">
          <div className="col-name">Alumno</div>
          <div className="col-mod">Módulos</div>
          <div className="col-avg">Dominio</div>
          <div className="col-streak">Racha</div>
          <div className="col-time">Tiempo</div>
          <div className="col-last">Última actividad</div>
          <div className="col-status">Estado</div>
        </div>
        {sorted.map((s, i) => <StudentRow key={s.id} stu={s} rank={i+1} level={level} onClick={() => onSelectStudent(s.id)} />)}
      </div>

      {showSettings && <GroupSettingsModal groupId={groupId} level={level} onClose={() => setShowSettings(false)} />}
    </>
  );
}

/* ─── Group settings modal (Bloque B) ─── */
function GroupSettingsModal({ groupId, level, onClose }) {
  const { MODULE_CATALOG, getGroupSettings, setGroupSettings, GROUPS } = window.JUCUM_DATA;
  const group = GROUPS.find(g => g.id === groupId);
  const modules = MODULE_CATALOG[group.level] || [];
  const [s, setS] = React.useState(() => getGroupSettings(groupId));
  const save = () => {
    setGroupSettings(groupId, s);
    onClose();
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">⚙️ Configurar grupo</div>
          <div className="modal-date">{group.name}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">

          <div className="settings-block">
            <div className="settings-label">📦 Módulo activo</div>
            <div className="settings-hint">Los alumnos verán este módulo en su panel principal.</div>
            <div className="module-picker">
              {modules.map(m => (
                <button key={m.id}
                        className={`mp-btn ${s.activeModuleId === m.id ? 'on' : ''}`}
                        onClick={() => setS({...s, activeModuleId: m.id})}>
                  <span className="mp-emo">{m.emoji}</span>
                  <span className="mp-name">{m.name}</span>
                  <span className="mp-count">{m.activities.length} actividades</span>
                </button>
              ))}
            </div>
          </div>

          <div className="settings-block">
            <div className="settings-label">⏰ Fecha límite para terminar el módulo</div>
            <div className="settings-hint">Opcional. Los alumnos verán cuántos días les quedan.</div>
            <div className="row-flex">
              <input type="date" value={s.deadline || ''} onChange={e => setS({...s, deadline: e.target.value || null})} className="input-text" />
              {s.deadline && <button className="btn-soft" onClick={() => setS({...s, deadline: null})}>Quitar</button>}
            </div>
          </div>

          <div className="settings-block">
            <div className="settings-label">🎯 Meta diaria de práctica</div>
            <div className="settings-hint">Minutos que cada alumno debe practicar al día. Variable — puedes cambiarla cuando quieras.</div>
            <div className="row-flex">
              <input type="range" min="5" max="60" step="5" value={s.dailyTargetMin}
                     onChange={e => setS({...s, dailyTargetMin: parseInt(e.target.value)})}
                     className="slider-input" />
              <div className="target-val">{s.dailyTargetMin} <span>min</span></div>
            </div>
            <div className="preset-row">
              {[10, 15, 20, 30].map(v => (
                <button key={v} className={`preset ${s.dailyTargetMin === v ? 'on' : ''}`} onClick={() => setS({...s, dailyTargetMin: v})}>{v} min</button>
              ))}
            </div>
          </div>

          <div className="settings-block">
            <div className="settings-label">🔓 Desbloqueo de actividades</div>
            <div className="settings-hint">Secuencial: cada actividad se abre al completar la anterior. Personalizado: tú eliges cuáles habilitar (el avance secuencial sigue funcionando). Libre: todas abiertas.</div>
            <div className="preset-row">
              <button className={`preset ${(s.unlockMode || 'sequential') === 'sequential' ? 'on' : ''}`}
                      onClick={() => setS({...s, unlockMode: 'sequential'})}>🔒 Secuencial</button>
              <button className={`preset ${s.unlockMode === 'custom' ? 'on' : ''}`}
                      onClick={() => setS({...s, unlockMode: 'custom'})}>🎛 Personalizado</button>
              <button className={`preset ${s.unlockMode === 'free' ? 'on' : ''}`}
                      onClick={() => setS({...s, unlockMode: 'free'})}>🔓 Libre</button>
            </div>
            {s.unlockMode === 'custom' && (() => {
              const mod = modules.find(m => m.id === s.activeModuleId);
              if (!mod) return <div className="settings-hint">Primero elige el módulo activo arriba.</div>;
              const list = s.unlockedActivities || [];
              const toggle = (key) => setS({...s, unlockedActivities: list.includes(key) ? list.filter(k => k !== key) : [...list, key]});
              return (
                <div style={{marginTop: 10, display: 'grid', gap: 6}}>
                  {mod.activities.map((a, i) => {
                    const key = `${mod.id}:${a.id}`;
                    return (
                      <label key={key} className="check-row">
                        <input type="checkbox" checked={i === 0 || list.includes(key)} disabled={i === 0}
                               onChange={() => toggle(key)} />
                        <span>{i + 1}. {a.name}{i === 0 ? ' (siempre abierta)' : ''}</span>
                      </label>
                    );
                  })}
                  <div className="settings-hint">Además de lo marcado, cada actividad completada desbloquea la siguiente automáticamente.</div>
                </div>
              );
            })()}
          </div>

          <div className="settings-block">
            <div className="settings-label">⏸ Estado del módulo</div>
            <div className="row-flex">
              <label className="check-row">
                <input type="checkbox" checked={!s.isPaused} onChange={e => setS({...s, isPaused: !e.target.checked})} />
                <span>Módulo activo (los alumnos pueden practicar)</span>
              </label>
            </div>
          </div>

          <div className="modal-actions">
            <button className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button className="btn-save" onClick={save}>💾 Guardar configuración</button>
          </div>

        </div>
      </div>
    </div>
  );
}

/* Per-activity progress of the student's active module (teacher view) */
function ModuleChecklist({ stu, group }) {
  const { MODULE_CATALOG, getGroupSettings, getStudentProgress } = window.JUCUM_DATA;
  const settings = getGroupSettings(group.id);
  const mods = MODULE_CATALOG[group.level] || [];
  const mod = mods.find(m => m.id === settings.activeModuleId) || mods[0];
  if (!mod) return null;
  const progress = getStudentProgress(stu.id);
  const doneCount = mod.activities.filter(a => progress.completed[`${mod.id}:${a.id}`]).length;
  return (
    <div className="scard" style={{marginTop:18}}>
      <div className="sec-head">
        <div className="sec-title">📦 Avance en “{mod.name}”</div>
        <span className="sec-meta">{doneCount}/{mod.activities.length} actividades · {mod.activities.length ? Math.round((doneCount/mod.activities.length)*100) : 0}%</span>
      </div>
      <div style={{display:'grid', gap:8}}>
        {mod.activities.map((a, i) => {
          const e = progress.completed[`${mod.id}:${a.id}`];
          const score = e && typeof e.score === 'number' ? (e.score > 10 ? Math.round(e.score) : Math.round(e.score * 10)) : null;
          return (
            <div key={a.id} style={{display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:12, background: e ? '#F0F9F1' : '#FAFAFA', border: '1px solid ' + (e ? '#CDEBD2' : '#EEEEEE')}}>
              <span style={{fontSize:17}}>{e ? '✅' : '⬜'}</span>
              <span style={{flex:1, fontWeight:700, color: e ? '#1B5E20' : '#9E9E9E'}}>{i + 1}. {a.name}</span>
              {e && score !== null && <span style={{fontWeight:800, color: score >= 85 ? '#2E7D32' : score >= 70 ? '#B58500' : '#C62828'}}>{score}%</span>}
              {e && e.minutes ? <span style={{color:'#888', fontSize:13}}>{Math.round(e.minutes)} min</span> : null}
              {e && e.date ? <span style={{color:'#AAA', fontSize:12}}>{new Date(e.date).toLocaleDateString('es-PE', {day:'numeric', month:'short'})}</span> : null}
              {!e && <span style={{color:'#BBB', fontSize:13}}>Pendiente</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StudentRow({ stu, rank, level, onClick }) {
  const mastery = window.JUCUM_DATA.getStudentMastery(stu).pct;
  const status = stu.lastActiveDays === 0 ? {label:'🟢 Hoy',cls:'ok'}
              : stu.lastActiveDays <= 2 ? {label:`🟢 hace ${stu.lastActiveDays}d`,cls:'ok'}
              : stu.lastActiveDays <= 6 ? {label:`🟡 hace ${stu.lastActiveDays}d`,cls:'warn'}
              : {label:`🔴 hace ${stu.lastActiveDays}d`,cls:'bad'};
  return (
    <div className="st-row" onClick={onClick}>
      <div className="col-name">
        <div className="st-ava" style={{background:`linear-gradient(135deg,${level.color}80,${level.dark})`}}>
          {stu.fullName.split(' ').map(n=>n[0]).slice(0,2).join('')}
        </div>
        <div>
          <div className="st-name">{stu.starred && '⭐ '}{stu.fullName}</div>
          <div className="st-user">@{stu.username}</div>
        </div>
      </div>
      <div className="col-mod">{stu.completedModules}</div>
      <div className={`col-avg ${mastery >= 85 ? 'high' : mastery >= 70 ? 'mid' : mastery > 0 ? 'low' : 'na'}`}>
        {mastery > 0 ? `${mastery}%` : '—'}
      </div>
      <div className="col-streak">{stu.streak > 0 ? `🔥 ${stu.streak}` : '—'}</div>
      <div className="col-time">{Math.floor(stu.totalMinutes/60) > 0 ? `${Math.floor(stu.totalMinutes/60)}h ${stu.totalMinutes%60}m` : `${stu.totalMinutes}m`}</div>
      <div className="col-last">{stu.achievements.length} 🏆</div>
      <div className={`col-status ${status.cls}`}>{status.label}</div>
    </div>
  );
}

/* ─── Student detail view ──────────────────────────────────────────── */

function StudentDetail({ studentId, onBack }) {
  const { STUDENTS, GROUPS, LEVELS, ACHIEVEMENT_DEFS, ACTIVITY_LOG, getStudentMastery } = window.JUCUM_DATA;
  const stu = STUDENTS.find(s => s.id === studentId);
  const mastery = getStudentMastery(stu);
  const [resetting, setResetting] = React.useState(false);
  const Gate = window.TeacherPasswordGate;
  const doReset = () => {
    if (window.JUCUM_SB) window.JUCUM_SB.update('users', stu.id, { password: '1234' }).catch(e => console.warn(e.message));
    setResetting(false);
    alert(`Contraseña de ${stu.fullName} reseteada a "1234".`);
  };
  const group = GROUPS.find(g => g.id === stu.group);
  const level = LEVELS[stu.level];
  const myLog = window.JUCUM_DATA.getStudentLog ? window.JUCUM_DATA.getStudentLog(stu.id) : ACTIVITY_LOG.filter(a => a.studentId === stu.id);
  React.useEffect(() => { document.body.setAttribute('data-level', stu.level); return () => document.body.removeAttribute('data-level'); }, [stu.level]);

  return (
    <>
      <button className="back-btn" onClick={onBack}>← Volver al grupo</button>

      <div className="student-hero">
        <div className="sh-ava" style={{background:`linear-gradient(135deg,${level.color}80,${level.dark})`}}>
          {stu.fullName.split(' ').map(n=>n[0]).slice(0,2).join('')}
        </div>
        <div className="sh-info">
          <div className="eyebrow" style={{color:level.dark}}>{level.emoji} {level.code} · {group.name}</div>
          <h1>{stu.starred && '⭐ '}{stu.fullName}</h1>
          <div className="sh-user">@{stu.username} · {group.schedule}</div>
        </div>
        <div className="sh-actions">
          <button className="btn-soft">📧 Contactar</button>
          <button className="btn-soft" onClick={() => setResetting(true)}>🔑 Resetear contraseña</button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-ico">📦</div><div className="kpi-num">{stu.completedModules}</div><div className="kpi-lbl">Módulos completos</div></div>
        <div className="kpi" title={`Cobertura ${mastery.coverage}% · aciertos ${mastery.quality}% · ${mastery.active7}/7 días activos`}><div className="kpi-ico">🎯</div><div className="kpi-num">{mastery.pct}%</div><div className="kpi-lbl">Dominio</div></div>
        <div className="kpi"><div className="kpi-ico">📊</div><div className="kpi-num">{stu.avgScore || '—'}{stu.avgScore?'%':''}</div><div className="kpi-lbl">Aciertos</div></div>
        <div className="kpi"><div className="kpi-ico">🔥</div><div className="kpi-num">{stu.streak}</div><div className="kpi-lbl">Racha (días)</div></div>
        <div className="kpi"><div className="kpi-ico">⏱️</div><div className="kpi-num">{Math.floor(stu.totalMinutes/60)}h {stu.totalMinutes%60}m</div><div className="kpi-lbl">Tiempo total</div></div>
        <div className="kpi"><div className="kpi-ico">🏆</div><div className="kpi-num">{stu.achievements.length}</div><div className="kpi-lbl">Logros</div></div>
        <div className="kpi"><div className="kpi-ico">📅</div><div className="kpi-num">{stu.lastActiveDays === 0 ? 'Hoy' : `${stu.lastActiveDays}d`}</div><div className="kpi-lbl">Última conexión</div></div>
      </div>

      <ModuleChecklist stu={stu} group={group} />

      <div className="two-col">
        <div className="scard">
          <PracticeChart stu={stu} level={level} />
        </div>

        <div className="scard">
          <div className="sec-head">
            <div className="sec-title">Diagnóstico del profesor</div>
            <span className="sec-meta">Auto-generado</span>
          </div>
          <DiagnoseStudent stu={stu} />
        </div>
      </div>

      <div className="scard" style={{marginTop:18}}>
        <div className="sec-head">
          <div className="sec-title">Historial de actividad</div>
          <span className="sec-meta">{myLog.length} {myLog.length === 1 ? 'evento' : 'eventos'}</span>
        </div>
        {myLog.length > 0
          ? <ActivityByDay events={myLog} />
          : <div className="empty-state"><div className="icon">📭</div>Sin actividad registrada todavía.</div>}
      </div>

      <div className="scard" style={{marginTop:18}}>
        <div className="sec-head">
          <div className="sec-title">📊 Evaluaciones presenciales</div>
        </div>
        <StudentEvaluations studentId={stu.id} isStudent={false} />
      </div>

      {resetting && Gate && (
        <Gate
          title="Confirmar reset de contraseña"
          message={`Vas a resetear la contraseña de ${stu.fullName} a "1234". Ingresa tu contraseña de profesor para confirmar.`}
          confirmLabel="🔑 Resetear a 1234"
          onConfirm={doReset}
          onClose={() => setResetting(false)}
        />
      )}
    </>
  );
}

function DiagnoseStudent({ stu }) {
  const strengths = [];
  const weaknesses = [];
  const plan = [];

  if (stu.avgScore >= 90) strengths.push({title:'Comprensión sobresaliente', body:`Promedio de ${stu.avgScore}% — entre los mejores del grupo.`});
  else if (stu.avgScore >= 85) strengths.push({title:'Alto rendimiento', body:`${stu.avgScore}% de promedio — dominio sólido del contenido.`});
  if (stu.streak >= 7)  strengths.push({title:'Disciplina excepcional', body:`Racha activa de ${stu.streak} días. Es la clave del progreso bilingüe.`});
  else if (stu.streak >= 3) strengths.push({title:'Constante', body:`${stu.streak} días de práctica seguidos.`});
  if (stu.totalMinutes >= 500) strengths.push({title:'Dedicación alta', body:`${Math.floor(stu.totalMinutes/60)}h ${stu.totalMinutes%60}m de práctica acumulada.`});
  if (stu.achievements.includes('perfect'))  strengths.push({title:'Perfección alcanzada', body:'Completó al menos un quiz sin errores.'});
  if (stu.achievements.includes('critical')) strengths.push({title:'Pensamiento crítico', body:'Lee entre líneas — capta mensajes implícitos del autor.'});
  if (stu.completedModules >= 2) strengths.push({title:'Avance sólido', body:`Ya completó ${stu.completedModules} módulos.`});

  if (stu.lastActiveDays >= 14) weaknesses.push({title:'Inactividad crítica', body:`Sin conectarse hace ${stu.lastActiveDays} días. Riesgo de pérdida de hábito y olvido del vocabulario.`});
  else if (stu.lastActiveDays >= 7) weaknesses.push({title:'Conexión irregular', body:`Lleva ${stu.lastActiveDays} días sin entrar. La adquisición bilingüe necesita exposición diaria.`});
  if (stu.avgScore > 0 && stu.avgScore < 60) weaknesses.push({title:'Comprensión general baja', body:`Promedio de ${stu.avgScore}%. Probable dificultad con vocabulario básico o estructuras del nivel.`});
  else if (stu.avgScore > 0 && stu.avgScore < 70) weaknesses.push({title:'Comprensión irregular', body:`Promedio de ${stu.avgScore}% — entiende lo literal pero falla en inferencias.`});
  if (stu.totalMinutes < 60 && stu.lastActiveDays >= 3) weaknesses.push({title:'Exposición muy baja', body:`Solo ${stu.totalMinutes} min totales de práctica. Krashen necesita volumen de input.`});
  if (stu.completedModules === 0 && stu.totalMinutes > 30) weaknesses.push({title:'No completa módulos', body:'Empieza pero no termina. Sugerir cerrar cada módulo antes de pasar al siguiente.'});
  if (!stu.achievements.includes('inferential') && stu.completedModules >= 1) weaknesses.push({title:'Inferencia pendiente', body:'No ha desbloqueado el logro de inferencia. Le cuesta deducir lo no explícito.'});
  if (!stu.achievements.includes('critical') && stu.avgScore >= 80) weaknesses.push({title:'Pensamiento crítico pendiente', body:'Domina lo literal pero aún no capta el mensaje del autor.'});
  if (stu.streak === 0 && stu.lastActiveDays >= 2) weaknesses.push({title:'Sin racha', body:'No mantiene continuidad. La práctica espaciada > sesiones intensas esporádicas.'});

  if (stu.lastActiveDays >= 7) plan.push({priority:'🔴', title:'Re-engagement inmediato', body:'Contactarlo por WhatsApp. Revisar si hay barreras (acceso, motivación, dificultad).'});
  if (stu.avgScore > 0 && stu.avgScore < 70) {
    plan.push({priority:'🔴', title:'Refuerzo de vocabulario', body:'Sesiones diarias de 10 min en Quizlet — set "Vocabulario 1" del nivel.'});
    plan.push({priority:'🟡', title:'Reescuchar listening', body:'Cada actividad puede oírse varias veces — sugerirle bajar la velocidad a 0.6×.'});
  }
  if (!stu.achievements.includes('inferential')) {
    plan.push({priority:'🟡', title:'Trabajar inferencias', body:'Leer Story 4 del módulo y hacer las 3 preguntas inferenciales del quiz — explicar cómo se deduce cada respuesta.'});
  }
  if (!stu.achievements.includes('critical') && stu.avgScore >= 80) {
    plan.push({priority:'🟢', title:'Pensamiento crítico', body:'Discutir el mensaje de cada historia en clase. "¿Qué quiere decir el autor con esto?"'});
  }
  if (stu.completedModules === 0) plan.push({priority:'🟡', title:'Cerrar primer módulo', body:'Animarlo a completar Personal Identity al 100%. Refuerzo positivo al desbloquear el primer logro.'});
  if (stu.streak === 0) plan.push({priority:'🟡', title:'Construir hábito', body:'Meta: 10 min diarios durante 7 días. Después del 7º día el hábito se automatiza.'});
  if (stu.avgScore >= 85 && stu.avgScore < 95) plan.push({priority:'🟢', title:'Empuje a la excelencia', body:'Está cerca del 95%. Retar con preguntas críticas y Stories del siguiente módulo.'});
  if (stu.avgScore >= 90 && stu.completedModules >= 1) plan.push({priority:'🟢', title:'Listo para avance', body:'Considerar promoverlo al módulo siguiente o nivel A1/A2 si aplica.'});
  if (stu.totalMinutes < 60 && stu.lastActiveDays >= 3) plan.push({priority:'🔴', title:'Sesión de onboarding', body:'Sentarse con el alumno 15 min y recorrer la plataforma juntos. La barrera puede ser técnica.'});

  if (strengths.length === 0 && weaknesses.length === 0 && plan.length === 0) {
    return <div className="empty-state"><div className="icon">🌱</div>Datos insuficientes para diagnosticar.</div>;
  }
  return (
    <div className="diag">
      {strengths.length > 0 && (
        <div className="diag-block ok">
          <div className="diag-h">⭐ Fortalezas <span className="diag-count">{strengths.length}</span></div>
          {strengths.map((s,i) => (
            <div className="diag-item" key={i}>
              <div className="diag-it-title">{s.title}</div>
              <div className="diag-it-body">{s.body}</div>
            </div>
          ))}
        </div>
      )}
      {weaknesses.length > 0 && (
        <div className="diag-block bad">
          <div className="diag-h">❌ Debilidades <span className="diag-count">{weaknesses.length}</span></div>
          {weaknesses.map((s,i) => (
            <div className="diag-item" key={i}>
              <div className="diag-it-title">{s.title}</div>
              <div className="diag-it-body">{s.body}</div>
            </div>
          ))}
        </div>
      )}
      {plan.length > 0 && (
        <div className="diag-block sug">
          <div className="diag-h">📚 Plan de estudio <span className="diag-count">{plan.length}</span></div>
          {plan.map((s,i) => (
            <div className="diag-item" key={i}>
              <div className="diag-it-title"><span className="prio">{s.priority}</span>{s.title}</div>
              <div className="diag-it-body">{s.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* 14-day practice chart with click-to-breakdown */
function PracticeChart({ stu, level }) {
  const { dailyData } = window.JUCUM_DATA;
  const days = React.useMemo(() => dailyData(stu), [stu.id]);
  const [selected, setSelected] = React.useState(null);
  const [modal, setModal] = React.useState(null); // { category, ico, items, date }
  const max = Math.max(...days.map(d => d.total), 30);
  const activeDays = days.filter(d => d.total > 0).length;
  const totalMin = days.reduce((s, d) => s + d.total, 0);

  const DAYNAMES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const fmtDate = (d) => {
    const dt = new Date(d + 'T12:00:00');
    return `${DAYNAMES[dt.getDay()]} ${dt.getDate()}`;
  };
  const fmtFull = (d) => new Date(d + 'T12:00:00').toLocaleDateString('es-PE', { weekday:'long', day:'numeric', month:'long' });

  const sel = selected !== null ? days[selected] : null;

  const openCat = (cat, ico, items) => setModal({ category:cat, ico, items, date: fmtFull(sel.date) });
  return (
    <>
      <div className="sec-head">
        <div className="sec-title">Práctica · últimos 14 días</div>
        <span className="sec-meta">{activeDays}/14 días · {totalMin} min</span>
      </div>

      <div className="chart-wrap">
        <div className="chart-yaxis">
          <span>{max}m</span>
          <span>{Math.floor(max/2)}m</span>
          <span>0</span>
        </div>
        <div className="chart-bars">
          {days.map((d, i) => {
            const h = d.total ? Math.max(4, (d.total / max) * 100) : 2;
            const isToday = i === days.length - 1;
            const isSel = selected === i;
            return (
              <div key={i} className={`chart-col ${isSel?'sel':''} ${d.total===0?'empty':''}`}
                   onClick={() => setSelected(selected === i ? null : i)}>
                <div className="chart-tip">{d.total}m</div>
                <div className="chart-bar-wrap">
                  {d.total > 0 ? (
                    <div className="chart-bar-stack" style={{height:h+'%'}}>
                      {d.reading   > 0 && <div className="seg reading"   style={{flex:d.reading}}   title={`Lectura ${d.reading}m`}></div>}
                      {d.listening > 0 && <div className="seg listening" style={{flex:d.listening}} title={`Listening ${d.listening}m`}></div>}
                      {d.grammar   > 0 && <div className="seg grammar"   style={{flex:d.grammar}}   title={`Gramática ${d.grammar}m`}></div>}
                      {d.story     > 0 && <div className="seg story"     style={{flex:d.story}}     title={`Story ${d.story}m`}></div>}
                    </div>
                  ) : <div className="chart-empty"></div>}
                </div>
                <div className={`chart-label ${isToday?'today':''}`}>{fmtDate(d.date).split(' ')[0]}<br/><b>{fmtDate(d.date).split(' ')[1]}</b></div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="chart-legend">
        <span className="lg-it"><span className="dot reading"></span>Lectura</span>
        <span className="lg-it"><span className="dot listening"></span>Listening</span>
        <span className="lg-it"><span className="dot grammar"></span>Gramática</span>
        <span className="lg-it"><span className="dot story"></span>Story</span>
      </div>

      {sel ? (
        <div className="chart-detail">
          <div className="cd-head">
            <div className="cd-date">📅 {fmtDate(sel.date)} · {new Date(sel.date+'T12:00:00').toLocaleDateString('es-PE',{day:'numeric',month:'long'})}</div>
            <div className="cd-tot"><b>{sel.total} min</b></div>
          </div>
          {sel.total > 0 ? (
            <div className="cd-rows">
              <BreakdownRow ico="📖" label="Lectura"   minutes={sel.reading}   total={sel.total} cls="reading"   onClick={()=>openCat('Lectura',   '📖', sel.details.reading)} />
              <BreakdownRow ico="🎧" label="Listening" minutes={sel.listening} total={sel.total} cls="listening" onClick={()=>openCat('Listening', '🎧', sel.details.listening)} />
              <BreakdownRow ico="📝" label="Gramática" minutes={sel.grammar}   total={sel.total} cls="grammar"   onClick={()=>openCat('Gramática', '📝', sel.details.grammar)} />
              <BreakdownRow ico="📗" label="Story"     minutes={sel.story}     total={sel.total} cls="story"     onClick={()=>openCat('Story',     '📗', sel.details.story)} />
              <div className="cd-summary">
                <b>Énfasis del día:</b> {(() => {
                  const top = [['reading','Lectura',sel.reading],['listening','Listening',sel.listening],['grammar','Gramática',sel.grammar],['story','Story',sel.story]].sort((a,b)=>b[2]-a[2])[0];
                  return top[2] > 0 ? `${top[1]} (${Math.round(top[2]/sel.total*100)}% del tiempo)` : 'sin práctica';
                })()}
              </div>
              <div className="cd-hint">💡 Haz clic en cualquier categoría para ver qué practicó específicamente.</div>
            </div>
          ) : (
            <div className="cd-empty">📭 Sin práctica este día.</div>
          )}
        </div>
      ) : (
        <div className="chart-hint">💡 Haz clic en cualquier barra para ver el desglose del día.</div>
      )}

      {modal && <DetailModal {...modal} onClose={()=>setModal(null)} />}
    </>
  );
}

function BreakdownRow({ ico, label, minutes, total, cls, onClick }) {
  const pct = total ? Math.round((minutes/total)*100) : 0;
  return (
    <div className={`bd-row ${minutes>0?'clickable':''}`} onClick={minutes>0?onClick:undefined}>
      <span className="bd-ico">{ico}</span>
      <span className="bd-label">{label}</span>
      <div className="bd-bar"><div className={`bd-fill ${cls}`} style={{width:pct+'%'}}></div></div>
      <span className="bd-val">{minutes} min</span>
      <span className="bd-pct">{pct}%</span>
      {minutes>0 && <span className="bd-go">›</span>}
    </div>
  );
}

function DetailModal({ category, ico, items, date, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title"><span style={{fontSize:'20px'}}>{ico}</span> {category}</div>
          <div className="modal-date">📅 {date}</div>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <div className="modal-body">
          {items.length === 0 ? <div className="cd-empty">Sin actividad en esta categoría.</div> :
            items.map((it, i) => (
              <div key={i} className="modal-item">
                <div className="mi-head">
                  <div className="mi-name">{it.item}</div>
                  <div className="mi-time">{it.minutes} min</div>
                </div>
                <div className="mi-meta">
                  <span className="mi-mod">📦 {it.module}</span>
                  {it.score !== undefined && (
                    typeof it.max === 'number' && it.max > 1
                      ? <span className={`mi-score ${it.score/it.max>=0.85?'high':it.score/it.max>=0.7?'mid':'low'}`}>{it.score}/{it.max}</span>
                      : <span className={`mi-score ${it.score>=0.85?'high':it.score>=0.7?'mid':'low'}`}>{Math.round(it.score*100)}%</span>
                  )}
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
/* Group activity events by calendar day, newest first */
function ActivityByDay({ events }) {
  const groups = {};
  for (const ev of events) {
    const day = ev.date.split(' ')[0]; // "2026-05-13"
    if (!groups[day]) groups[day] = [];
    groups[day].push(ev);
  }
  const days = Object.keys(groups).sort((a, b) => b.localeCompare(a));
  const fmtDay = (d) => {
    const today = new Date();
    const date = new Date(d + 'T12:00:00');
    const diff = Math.floor((today - date) / 86400000);
    const dateLabel = date.toLocaleDateString('es-PE', { weekday:'long', day:'numeric', month:'long' });
    if (diff === 0) return `Hoy · ${dateLabel}`;
    if (diff === 1) return `Ayer · ${dateLabel}`;
    if (diff < 7) return `Hace ${diff} días · ${dateLabel}`;
    return dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
  };
  return (
    <div className="day-list">
      {days.map(day => (
        <div className="day-block" key={day}>
          <div className="day-head">{fmtDay(day)} <span className="day-count">{groups[day].length} {groups[day].length === 1 ? 'evento' : 'eventos'}</span></div>
          <div className="act-list">
            {groups[day].map((a, i) => <ActivityRow key={i} act={a} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { TeacherDashboard, GroupsView, GroupDetail, GroupSettingsModal, StudentDetail, DiagnoseStudent, ActivityByDay, PracticeChart, BreakdownRow, DetailModal, StudentRow });
