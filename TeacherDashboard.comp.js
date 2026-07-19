/* Teacher dashboard.
 * Views:  groups   — overview of all groups + KPIs
 *         group    — students in a single group with progress
 *         student  — detailed view of one student
 */

function TeacherDashboard({ onLogout, user }) {
  const { STUDENTS, GROUPS, LEVELS, ACHIEVEMENT_DEFS, ACTIVITY_LOG, getStudentMastery } = window.JUCUM_DATA;
  const [view, setView] = React.useState(() => {
    const s = window.JUCUM_NAV && window.JUCUM_NAV.load('teacher', null);
    if (!s || !s.kind) return { kind:'groups' };
    if (s.kind === 'group'   && !GROUPS.some(g => g.id === s.id))    return { kind:'groups' };
    if (s.kind === 'student' && !STUDENTS.some(st => st.id === s.id)) return { kind:'groups' };
    return s;
  });
  React.useEffect(() => { if (window.JUCUM_NAV) window.JUCUM_NAV.save('teacher', view); }, [view]);
  // Avance en vivo de los alumnos: releemos el progreso de la nube al volver a la
  // pestaña y cada 30 s, para ver puntos y materiales completados sin recargar.
  const [, setLiveTick] = React.useState(0);
  React.useEffect(() => {
    if (!window.JUCUM_SYNC || !window.JUCUM_SYNC.refreshProgress) return;
    let alive = true;
    const refresh = () => window.JUCUM_SYNC.refreshProgress().then(ok => { if (ok && alive) setLiveTick(t => t + 1); }).catch(() => {});
    refresh();
    const onVis = () => { if (document.visibilityState === 'visible') refresh(); };
    const iv = setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 15000); // ⚡ en vivo: 15 s (prácticas en clase)
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVis);
    return () => { alive = false; clearInterval(iv); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', onVis); };
  }, []);
  const teacherName = (user && user.name && user.name !== 'Profesor' && user.name !== 'Profesor JUCUM') ? user.name : 'Joe Miller';
  React.useEffect(() => { window.JUCUM_TEACHER_NAME = teacherName; }, [teacherName]);

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
          <img src={window.JUCUM_LOGO || 'logo-jucum.png'} alt="JUCUM EC" />
          <div className="pgtitle">Panel del Profesor</div>
        </div>
        <div className="app-right">
          <span className="role-pill t">👨‍🏫 Profesor</span>
          <a className={`nav-link ${['groups','group','student'].includes(view.kind)?'active':''}`} href="#" onClick={(e)=>{e.preventDefault();setView({kind:'groups'});}}>👥 Mis grupos</a>
          <a className={`nav-link ${view.kind==='planner'?'active':''}`} href="#" onClick={(e)=>{e.preventDefault();setView({kind:'planner'});}}>🗓️ Planificar</a>
          <a className={`nav-link ${(view.kind==='assess'||view.kind==='evaluate'||view.kind==='exams')?'active':''}`} href="#" onClick={(e)=>{e.preventDefault();setView({kind:'assess'});}}>📊 Evaluación</a>
          <a className={`nav-link ${view.kind==='materials-review'?'active':''}`} href="#" onClick={(e)=>{e.preventDefault();setView({kind:'materials-review'});}}>📚 Materiales</a>
          <a className={`nav-link ${view.kind==='messages'?'active':''}`} href="#" onClick={(e)=>{e.preventDefault();setView({kind:'messages'});}} style={{position:'relative'}}>💬 Chats{(() => { const n = window.JUCUM_MSG ? window.JUCUM_MSG.unreadForTeacher() : 0; return n > 0 ? <span className="nav-dot">{n > 9 ? '9+' : n}</span> : null; })()}</a>
          <TeacherForumNav onOpen={(gid)=>setView({kind:'forum', group:gid})} />
          <NotifBell userId="teacher" />
          <div className="user-pill">
            <div className="ava" style={{background:'linear-gradient(135deg,#3F5BB8,#0D1B5A)'}}>{(teacherName.split(' ').map(n=>n[0]).slice(0,2).join('')||'JM').toUpperCase()}</div>
            <span>{teacherName}</span>
          </div>
          <button className="logout-btn" onClick={onLogout} title="Cerrar sesión">⎋ Salir</button>
        </div>
      </header>

      {view.kind === 'assess' ? (
        <TeacherAssessment onBack={() => setView({kind:'groups'})} initialTab={view.tab} />
      ) : view.kind === 'messages' ? (
        <TeacherMessages onBack={() => setView({kind:'groups'})} initialOpen={view.open} />
      ) : view.kind === 'planner' ? (
        <ClassPlanner onBack={() => setView({kind:'groups'})} onGoExams={(gid) => setView({kind:'exams', group: gid})} />
      ) : view.kind === 'evaluate' ? (
        <TeacherEvaluate onBack={() => setView({kind:'groups'})} />
      ) : view.kind === 'tasks' ? (
        <TeacherPractice onBack={() => setView({kind:'groups'})} />
      ) : view.kind === 'attendance' ? (
        <TeacherAttendance onBack={() => setView({kind:'groups'})} />
      ) : view.kind === 'manage' ? (
        <ManageGroups onBack={() => setView({kind:'groups'})} />
      ) : view.kind === 'modules' ? (
        <ManageModules onBack={() => setView({kind:'groups'})} />
      ) : view.kind === 'materials' ? (
        <TeacherMaterials onBack={() => setView({kind:'groups'})} />
      ) : view.kind === 'materials-review' ? (
        <MaterialsReview onBack={() => setView({kind:'groups'})} />
      ) : view.kind === 'class' ? (
        <TeacherClass onBack={() => setView({kind:'groups'})} />
      ) : view.kind === 'students' ? (
        <ManageStudents onBack={() => setView({kind:'groups'})} />
      ) : view.kind === 'promote' ? (
        <LevelPromotion onBack={() => setView({kind:'groups'})} />
      ) : view.kind === 'exams' ? (
        window.TeacherExamsFolders
          ? <TeacherExamsFolders onBack={() => setView({kind:'groups'})} initialGroup={view.group} />
          : <TeacherExams onBack={() => setView({kind:'groups'})} />
      ) : view.kind === 'forum' ? (
        <>
          <button className="back-btn" onClick={() => setView({kind:'groups'})} style={{padding:'10px 28px 0'}}>← Volver al panel</button>
          <Forum user={{ role:'teacher' }} groupOverride={view.group} />
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
            teacherName={teacherName}
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
            onContact={(sid) => setView({kind:'messages', open: sid})}
            onBack={() => { const stu = STUDENTS.find(s => s.id === view.id); setView({kind:'group', id:stu.group}); }}
          />
        )}
      </main>
      )}
    </>
  );
}

/* ─── Groups overview ─────────────────────────────────────────────── */

/* Menú unificado "Evaluación": junta Evaluación presencial + Exámenes de avance
 * (pedido del teacher — antes eran dos entradas separadas "Evaluar" y "Exámenes"). */
function TeacherAssessment({ onBack, canDefine, initialTab }) {
  const [tab, setTab] = React.useState(initialTab === 'exams' ? 'exams' : 'eval');
  const CARDS = [
    { k:'eval',   ico:'🗣️', title:'Evaluación presencial', sub:'Speaking · Listening · Comprehension + audio/video' },
    { k:'exams',  ico:'🎓', title:'Exámenes de avance',   sub:'Define, abre ventana y califica' },
    { k:'tareas', ico:'📝', title:'Calificar tareas',     sub:'Revisa y pon nota a lo que entregaron' },
    { k:'notas',  ico:'📊', title:'Preparación y notas',  sub:'Quién está listo (≥75%) + boletín por alumno' },
  ];
  return (
    <div>
      <div style={{display:'flex', alignItems:'center', gap:14, flexWrap:'wrap', padding:'14px 28px 0'}}>
        <button className="back-btn" style={{margin:0}} onClick={onBack}>← Volver al panel</button>
      </div>
      <div style={{maxWidth:1100, margin:'0 auto', padding:'10px 24px 0'}}>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(215px,1fr))', gap:12}}>
          {CARDS.map(c => (
            <button key={c.k} onClick={() => setTab(c.k)} style={{textAlign:'left', cursor:'pointer', fontFamily:'inherit', background: tab === c.k ? '#F4F7FE' : '#fff', border:'1px solid ' + (tab === c.k ? '#1F3A8A' : 'var(--border)'), borderTop:'3.5px solid #1F3A8A', borderRadius:14, padding:'13px 15px', boxShadow: tab === c.k ? '0 4px 14px rgba(31,58,138,.18)' : '0 2px 4px rgba(0,0,0,.06)'}}>
              <div style={{fontSize:22}}>{c.ico}</div>
              <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:14.5, margin:'4px 0 2px'}}>{c.title}</div>
              <div style={{fontSize:11.5, color:'var(--text-soft)', fontWeight:600, lineHeight:1.35}}>{c.sub}</div>
            </button>
          ))}
        </div>
      </div>
      {tab === 'eval' ? <TeacherEvaluate onBack={onBack} hideBack />
        : tab === 'exams' ? (window.TeacherExamsFolders ? <TeacherExamsFolders onBack={onBack} hideBack canDefine={canDefine} /> : <TeacherExams onBack={onBack} canDefine={canDefine} hideBack />)
        : tab === 'tareas' ? (window.TeacherPractice ? <TeacherPractice onBack={onBack} only="tasks" /> : <main><div className="empty-state">Falta el módulo de tareas.</div></main>)
        : <PrepNotas />}
    </div>
  );
}

/* Preparación y notas — EL desglose completo del examen en un solo lugar:
 * resumen de aptos, examen anunciado, ventana(s) de examen del grupo con su
 * avance en vivo (auto-cargado), y cada alumno con su 🎓 preparación a la vista
 * (ordenados: los más listos primero) + su boletín al expandir. */
function PrepNotas() {
  const { GROUPS, STUDENTS, LEVELS, MODULE_CATALOG, getStudentReadiness } = window.JUCUM_DATA;
  const X = window.JUCUM_EXAMS;
  const [gid, setGid] = React.useState(GROUPS[0] ? GROUPS[0].id : null);
  const [openId, setOpenId] = React.useState(null);
  const [, setTick] = React.useState(0);
  const refresh = () => setTick(t => t + 1);
  const g = GROUPS.find(x => x.id === gid);
  const level = g ? LEVELS[g.level] : null;
  const members = STUDENTS.filter(s => s.group === gid);
  // 🎓 preparación por alumno, ordenados: los más listos primero
  const rows = members.map(s => ({ s, r: getStudentReadiness(s) })).sort((a, b) => b.r.overall - a.r.overall);
  const aptos = rows.filter(x => x.r.apt).length;
  // 📣 examen anunciado más próximo del grupo
  let ann = null;
  if (g && X && X.getAnnouncement) (MODULE_CATALOG[g.level] || []).forEach(m => {
    const a = X.getAnnouncement(g.id, m.id);
    if (a && a.date && (!ann || a.date < ann.date)) ann = { ...a, mod: m };
  });
  // 📅 ventanas de examen del grupo (avance en vivo auto-cargado aquí mismo)
  const wins = (X && X.getWindows ? X.getWindows() : []).filter(w => w.groupId === gid && !((w.targetStudentIds || []).length));
  return (
    <main>
      <div className="tt-toolbar" style={{marginTop:14}}>
        <span className="tt-sort-lab">Grupo</span>
        <select value={gid || ''} onChange={e => { setGid(e.target.value); setOpenId(null); }} style={{fontFamily:'inherit', fontWeight:800, fontSize:13, border:'1.5px solid var(--border)', borderRadius:10, padding:'8px 11px', cursor:'pointer', background:'#fff'}}>
          {GROUPS.map(x => <option key={x.id} value={x.id}>{LEVELS[x.level].code} · {x.name}</option>)}
        </select>
        <span className="tt-sort-lab" style={{marginLeft:'auto'}}>{members.length} alumno{members.length === 1 ? '' : 's'}</span>
      </div>

      <div className="scard" style={{marginTop:12, display:'flex', gap:14, alignItems:'center', flexWrap:'wrap', padding:'12px 16px'}}>
        <span style={{fontWeight:800, fontSize:13.5, color: aptos > 0 ? '#2E7D32' : '#B26A00'}}>🎓 <b>{aptos}</b>/{members.length} aptos para examen (≥75%)</span>
        <span style={{fontSize:12.5, fontWeight:700, color:'var(--text-soft)'}}>
          {ann
            ? <>📣 Examen anunciado: <b>{ann.mod.name}</b> · {ann.date ? new Date(ann.date + 'T12:00:00Z').toLocaleDateString('es-PE', { weekday:'long', day:'numeric', month:'long' }) : 'sin fecha'}</>
            : <>📣 Sin examen anunciado — anúncialo en “Exámenes de avance → Por módulo”.</>}
        </span>
      </div>

      {wins.map(w => <div key={w.id} style={{marginTop:12}}>{window.WindowCard ? <WindowCard w={w} onChange={refresh} /> : null}</div>)}

      <div style={{display:'flex', flexDirection:'column', gap:8, marginTop:12}}>
        {rows.map(({ s, r }) => (
          <div key={s.id} style={{border:'1px solid var(--border)', borderRadius:12, background:'#fff', overflow:'hidden'}}>
            <button onClick={() => setOpenId(openId === s.id ? null : s.id)} style={{display:'flex', alignItems:'center', gap:10, width:'100%', textAlign:'left', cursor:'pointer', border:'none', background:'none', padding:'11px 14px', fontFamily:'inherit'}}>
              <div className="st-ava" style={{background:`linear-gradient(135deg,${level ? level.color : '#999'}80,${level ? level.dark : '#666'})`}}>{s.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
              <div style={{flex:1, minWidth:0}}><div style={{fontWeight:800, fontSize:13.5}}>{s.fullName}</div><div style={{fontSize:11.5, color:'var(--text-soft)', fontWeight:600}}>@{s.username}</div></div>
              <span className="mm-chip" style={{background: r.apt ? '#E8F5E9' : '#FFF8E1', color: r.apt ? '#2E7D32' : '#E65100', flexShrink:0}}>{r.apt ? `✓ apto · ${r.overall}%` : `🎓 ${r.overall}%`}</span>
              <span style={{fontSize:12, color:'#1F3A8A', fontWeight:800}}>{openId === s.id ? '▲ Cerrar' : '▼ Detalle'}</span>
            </button>
            {openId === s.id && (
              <div style={{padding:'0 14px 14px'}}>
                {window.ReadinessCard ? <ReadinessCard student={s} forTeacher /> : <div className="empty-state">Sin módulo de preparación.</div>}
                <div style={{marginTop:12}}>{window.GradesRecord ? <GradesRecord student={s} forTeacher /> : null}</div>
              </div>
            )}
          </div>
        ))}
        {members.length === 0 && <div className="empty-state">Este grupo no tiene alumnos.</div>}
      </div>
    </main>
  );
}

function GroupsView({ stats, onSelectGroup, teacherName }) {
  const { GROUPS, STUDENTS, LEVELS, getStudentMastery } = window.JUCUM_DATA;
  return (
    <>
      <div className="welcome teacher">
        <div className="welcome-text">
          <div className="eyebrow t">👨‍🏫 Hola, {teacherName || 'Joe Miller'}</div>
          <h1>{stats.totalStudents} alumnos · 4 grupos activos</h1>
          <p><b>{stats.activeToday}</b> alumnos practicaron hoy · Dominio general <b>{stats.avgMastery}%</b></p>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-ico">👥</div><div className="kpi-num">{stats.totalStudents}</div><div className="kpi-lbl">Total alumnos</div></div>
        <div className="kpi"><div className="kpi-ico">🟢</div><div className="kpi-num">{stats.activeToday}</div><div className="kpi-lbl">Practicaron hoy</div></div>
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
                <span className="gcard-pill" style={{background:'linear-gradient(135deg,'+level.color+','+level.dark+')', color:'#fff', border:'none'}}>{level.emoji} {level.code}</span>
                <span className="gcard-count">{members.length} alumnos</span>
              </div>
              <div className="gcard-name">{g.name}</div>
              <div className="gcard-sched">⏰ {g.schedule}</div>
              <div className="gcard-stats">
                <div><b style={{color:level.dark}}>{groupAvg}%</b> dominio</div>
                <div><b style={{color:'#2E7D32'}}>{activeNow}</b> practicando</div>
                {inactive > 0 && <div><b style={{color:'#C62828'}}>{inactive}</b> sin practicar 7d+</div>}
              </div>
              {(() => {
                if (!window.JUCUM_DATA.getWeekChampions) return null;
                const champ1 = (window.JUCUM_DATA.getWeekChampions(g.id).champions || []).find(c => c.rank === 1);
                return (
                  <div style={{display:'flex',alignItems:'center',gap:7,marginTop:9,padding:'7px 10px',borderRadius:9,background:'linear-gradient(120deg,#FFF7E0,#FFFDF6)',border:'1px solid #F0D89A'}}>
                    <span style={{fontSize:15}}>🏆</span>
                    {champ1 ? (
                      <span style={{fontSize:12,fontWeight:700,color:'#9c5d00'}}>Campeón: <b style={{fontWeight:800}}>{champ1.emoji ? champ1.emoji + ' ' : ''}{champ1.student.fullName.split(' ')[0]} {(champ1.student.fullName.split(' ')[1]||'')[0]||''}.</b></span>
                    ) : (
                      <span style={{fontSize:12,fontWeight:700,color:'#B6852B'}}>Sin campeón aún esta semana</span>
                    )}
                  </div>
                );
              })()}
              <div className="gcard-go">Ver alumnos →</div>
            </div>
          );
        })}
      </div>

      {window.TutorialAdminCard && <TutorialAdminCard />}
    </>
  );
}

/* ─── Group detail (one group, students inside) ───────────────────── */

/* 🏆 Campeones de la semana del grupo — vista del profesor (podio Top 3 + escenario del #1) */
const TCH_SCENES = {
  'theme-gold': 'repeating-conic-gradient(from 0deg at 50% -4%, rgba(255,214,120,.16) 0deg 6deg, transparent 6deg 14deg), radial-gradient(circle at 50% -8%, rgba(255,216,110,.7), transparent 56%), linear-gradient(160deg,#6E5214,#2C2006)',
  'theme-mountains': 'radial-gradient(ellipse 85% 46% at 16% 118%, #34204C 0 70%, transparent 71%), radial-gradient(ellipse 78% 44% at 86% 115%, #5A386F 0 70%, transparent 71%), radial-gradient(circle at 50% 50%, #FFE7A8 0 6%, rgba(255,180,120,.55) 7%, transparent 17%), linear-gradient(180deg,#FF9266 0%,#FF6F9C 42%,#7A4D9E 100%)',
  'theme-night': 'radial-gradient(ellipse 95% 34% at 50% 126%, #131132 0 72%, transparent 73%), radial-gradient(1.4px 1.4px at 18% 26%, #fff, transparent), radial-gradient(1.6px 1.6px at 62% 15%, #fff, transparent), radial-gradient(circle at 76% 24%, #FBF4D0 0 5%, transparent 13%), linear-gradient(180deg,#23266C 0%,#0B0B24 100%)',
  'theme-aurora': 'radial-gradient(ellipse 95% 34% at 50% 122%, #06131C 0 72%, transparent 73%), radial-gradient(ellipse 52% 42% at 26% 4%, rgba(80,240,180,.55), transparent 60%), radial-gradient(ellipse 46% 40% at 74% 12%, rgba(130,140,255,.5), transparent 60%), linear-gradient(180deg,#0C3242 0%,#07151F 100%)',
  'theme-ocean': 'radial-gradient(ellipse 130% 30% at 50% 130%, rgba(120,225,255,.55) 0 60%, transparent 61%), radial-gradient(ellipse 130% 26% at 50% 119%, rgba(70,180,235,.5) 0 60%, transparent 61%), linear-gradient(180deg,#0E6CA0 0%,#062236 100%)',
  'theme-party': 'radial-gradient(3px 3px at 12% 20%, #FFD54F, transparent), radial-gradient(3px 3px at 30% 52%, #FF6F9C, transparent), radial-gradient(3px 3px at 70% 40%, #7CFFB2, transparent), radial-gradient(3px 3px at 86% 22%, #FFB347, transparent), linear-gradient(160deg,#2A2F86,#15184A)',
};
function TeacherChampions({ groupId, levelColor }) {
  const D = window.JUCUM_DATA;
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => { if (D.loadLeagueFromCloud) D.loadLeagueFromCloud().then(() => force()); }, [groupId]); // eslint-disable-line
  if (!D.getWeekChampions) return null;
  const champ = D.getWeekChampions(groupId);
  const champions = champ.champions || [];
  const sceneBg = TCH_SCENES[champ.scenario] || TCH_SCENES['theme-gold'];
  const ini = (s) => (s.fullName || '?').split(' ').map(w => w[0]).slice(0, 2).join('');
  const sz = { 1:{a:50,e:26,b:48,bg:'linear-gradient(#F4B400,#D49A00)',ab:'#C99700'}, 2:{a:40,e:20,b:36,bg:'linear-gradient(#B8BCC4,#8E939C)',ab:'#8E939C'}, 3:{a:38,e:19,b:26,bg:'linear-gradient(#D98C4A,#B06A2C)',ab:'#B06A2C'} };
  const podMap = [2, 1, 3];
  return (
    <div className="scard" style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
      <div style={{ background: sceneBg, color: '#fff', padding: '14px 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: 15, textShadow: '0 1px 4px rgba(0,0,0,.45)' }}>🏆 Campeones de la semana</div>
          <span style={{ fontSize: 10, fontWeight: 800, background: 'rgba(0,0,0,.28)', padding: '3px 10px', borderRadius: 20 }}>de este grupo · hasta el lunes</span>
        </div>
        {champions.length === 0 ? (
          <div style={{ marginTop: 12, background: 'rgba(0,0,0,.2)', borderRadius: 10, padding: 14, fontSize: 12.5, fontWeight: 700, textAlign: 'center', textShadow: '0 1px 2px rgba(0,0,0,.4)' }}>🏁 Aún no hay campeones. Se corona al Top 3 por XP cuando cierre la semana.</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 14, margin: '14px 0 2px' }}>
            {podMap.map(rk => { const c = champions.find(x => x.rank === rk); if (!c) return <div key={rk} style={{ width: 50 }} />; const z = sz[rk];
              return (
                <div key={rk} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <div style={{ position: 'relative', width: z.a, height: z.a, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: c.emoji ? z.e : z.a * 0.4, color: '#fff', background: c.emoji ? 'rgba(255,255,255,.16)' : z.ab, border: '2.5px solid rgba(255,255,255,.6)' }}>
                    {rk === 1 && <span style={{ position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)', fontSize: 17 }}>👑</span>}
                    {c.emoji || ini(c.student)}
                  </div>
                  <div style={{ width: z.a + 6, height: z.b, background: z.bg, borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 5, fontFamily: "'Fredoka',sans-serif", fontWeight: 700, fontSize: 15, color: 'rgba(0,0,0,.45)' }}>{rk}</div>
                  <div style={{ fontSize: 11.5, fontWeight: 800, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,.5)' }}>{c.student.fullName.split(' ')[0]} {(c.student.fullName.split(' ')[1] || '')[0] || ''}.</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.85)' }}>{(c.xp || 0).toLocaleString()} XP</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* Panel SIEMPRE visible para prender/apagar módulos del grupo sin entrar a un modal */
function GroupModulesQuick({ groupId }) {
  const { MODULE_CATALOG, getGroupSettings, setGroupSettings, GROUPS } = window.JUCUM_DATA;
  const group = GROUPS.find(g => g.id === groupId);
  const modules = MODULE_CATALOG[group.level] || [];
  const [s, setS] = React.useState(() => getGroupSettings(groupId));
  const toggle = (id) => {
    const set = new Set(s.activeModuleIds || []);
    if (set.has(id)) set.delete(id); else set.add(id);
    const ids = modules.filter(x => set.has(x.id)).map(x => x.id);
    const next = { ...s, activeModuleIds: ids, activeModuleId: ids[0] || null };
    setS(next); setGroupSettings(groupId, next);
  };
  const activeCount = (s.activeModuleIds || []).length;

  return (
    <div className="scard" style={{marginBottom:16}}>
      <div className="sec-head">
        <div className="sec-title">📦 Módulos del grupo</div>
        <span className="sec-meta">{activeCount} activo{activeCount===1?'':'s'} · prende/apaga al instante</span>
      </div>
      {modules.length === 0 ? <div className="settings-hint">Este nivel no tiene módulos cargados.</div> : (
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:10}}>
          {modules.map(m => {
            const on = (s.activeModuleIds || []).includes(m.id);
            return (
              <div key={m.id} style={{display:'flex',alignItems:'center',gap:11,padding:'11px 14px',border:'1.5px solid '+(on?'#A5D6A7':'#E6E3DA'),borderRadius:10,background:on?'#F0FAF1':'#fff'}}>
                <span style={{fontSize:20}}>{m.emoji}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"'Fredoka',sans-serif",fontWeight:600,fontSize:13,color:'var(--text)'}}>{m.name}</div>
                  <div style={{fontSize:11,color:on?'#2E7D32':'var(--text-soft)',fontWeight:700,marginTop:1}}>{on ? '🟢 Activo' : '⚪ Apagado'} · {m.activities.length} act.</div>
                </div>
                <button type="button" onClick={()=>toggle(m.id)} aria-label={on?'Apagar':'Prender'}
                        style={{width:48,height:27,borderRadius:14,border:'none',cursor:'pointer',background:on?'#2EA84B':'#CFCFC8',position:'relative',transition:'background .15s',flexShrink:0,padding:0}}>
                  <span style={{position:'absolute',top:3,left:on?24:3,width:21,height:21,borderRadius:'50%',background:'#fff',transition:'left .15s',boxShadow:'0 1px 3px rgba(0,0,0,0.3)'}}></span>
                </button>
              </div>
            );
          })}
        </div>
      )}
      {activeCount === 0 && <div className="settings-hint" style={{marginTop:8,color:'#C62828',fontWeight:700}}>⚠ Sin módulos activos, los alumnos no verán actividades.</div>}
    </div>
  );
}

function GroupDetail({ groupId, onBack, onSelectStudent }) {
  const { GROUPS, STUDENTS, LEVELS, getStudentMastery, getStudentReadiness } = window.JUCUM_DATA;
  const group = GROUPS.find(g => g.id === groupId);
  const level = LEVELS[group.level];
  const members = STUDENTS.filter(s => s.group === groupId);
  const [showSettings, setShowSettings] = React.useState(false);
  const [showReport, setShowReport] = React.useState(false);
  React.useEffect(() => { document.body.setAttribute('data-level', group.level); return () => document.body.removeAttribute('data-level'); }, [group.level]);

  const groupAvg = members.length ? Math.round(members.reduce((s,x)=>s+getStudentMastery(x).pct,0)/members.length) : 0;
  const aptCount = members.filter(s => getStudentReadiness(s).apt).length;
  const [q, setQ] = React.useState('');
  const [sortKey, setSortKey] = React.useState('dominio');
  const [deleting, setDeleting] = React.useState(null);
  const SORTS = {
    dominio:        (a,b)=>getStudentMastery(b).pct - getStudentMastery(a).pct,
    examen:         (a,b)=>getStudentReadiness(b).overall - getStudentReadiness(a).overall,
    practica_mas:   (a,b)=>(b.totalMinutes||0) - (a.totalMinutes||0),
    practica_menos: (a,b)=>(a.totalMinutes||0) - (b.totalMinutes||0),
    racha:          (a,b)=>(b.streak||0) - (a.streak||0),
    az:             (a,b)=>a.fullName.localeCompare(b.fullName,'es'),
  };
  const shown = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...members]
      .filter(s => !needle || (s.fullName + ' ' + s.username).toLowerCase().includes(needle))
      .sort(SORTS[sortKey] || SORTS.dominio);
  }, [members, q, sortKey]);

  if (showReport) return <GroupReport groupId={groupId} onBack={() => setShowReport(false)} />;

  return (
    <>
      <button className="back-btn" onClick={onBack}>← Volver a grupos</button>
      <div className="welcome group">
        <div className="welcome-text">
          <div className="eyebrow">{level.emoji} {level.code} · {group.schedule}</div>
          <h1>{group.name}</h1>
          <p>{members.length} alumnos · dominio del grupo <b>{groupAvg}%</b> · 🎓 <b>{aptCount}</b> apto{aptCount===1?'':'s'} para examen · iniciado el {group.startDate}</p>
        </div>
        <button className="btn-settings" onClick={() => setShowSettings(true)}>⚙️ Configurar grupo</button>
        <button className="btn-settings" onClick={() => setShowReport(true)} style={{marginLeft:8}}>📄 Reporte PDF</button>
        <button className="btn-settings" onClick={() => { if (window.JUCUM_STUDENT_PREVIEW) window.JUCUM_STUDENT_PREVIEW.open(groupId); }} style={{marginLeft:8}} title="Ver la app tal como la ve un alumno de este grupo (demostración)">👁 Ver como alumno</button>
      </div>

      <GroupModulesQuick groupId={groupId} />

      <TeacherChampions groupId={groupId} levelColor={level.dark} />

      <WeeklyPlan groupId={groupId} />

      <div className="tt-toolbar">
        <label className="tt-search">
          <span aria-hidden="true">🔍</span>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar alumno por nombre o usuario…" />
        </label>
        <div className="tt-sort">
          <span className="tt-sort-lab">Ordenar</span>
          <select value={sortKey} onChange={e=>setSortKey(e.target.value)}>
            <option value="practica_mas">🔥 Practica más</option>
            <option value="practica_menos">💤 Practica menos</option>
            <option value="dominio">Dominio ↓</option>
            <option value="examen">🎓 Preparación examen ↓</option>
            <option value="racha">Racha ↓</option>
            <option value="az">A → Z</option>
          </select>
        </div>
      </div>
      <div className="tt-count">{shown.length} de {members.length} alumno{members.length===1?'':'s'}{q ? ` · filtrando «${q}»` : ''}</div>

      <div className="student-table">
        <div className="st-head">
          <div className="col-name">Alumno</div>
          <div className="col-mod">Módulos</div>
          <div className="col-avg" title="Dominio = qué tan bien hizo lo que hizo (cobertura × aciertos × constancia). El número 🎓 es la Preparación para el examen: castiga más la inactividad y exige ≥60% del módulo.">Dominio · 🎓</div>
          <div className="col-streak">Racha</div>
          <div className="col-time">Tiempo</div>
          <div className="col-last">🏆 Logros</div>
          <div className="col-status">Última práctica</div>
          <div></div>
        </div>
        {shown.map((s, i) => <StudentRow key={s.id} stu={s} rank={i+1} level={level} onClick={() => onSelectStudent(s.id)} onDelete={() => setDeleting(s)} />)}
        {shown.length === 0 && <div style={{padding:'26px',textAlign:'center',color:'#999',fontWeight:700}}>Sin resultados para «{q}»</div>}
      </div>

      {deleting && window.TeacherPasswordGate && (
        <TeacherPasswordGate
          danger
          title="🗑️ Eliminar alumno"
          message={`Vas a eliminar a ${deleting.fullName} (@${deleting.username}). Esto borra PARA SIEMPRE su cuenta y acceso, todo su progreso, XP y racha, sus tareas y notas, y su historial de práctica. Esta acción NO se puede deshacer. Ingresa tu contraseña de profesor para confirmar.`}
          confirmLabel="🗑️ Eliminar definitivamente"
          onConfirm={() => {
            const { STUDENTS, saveStudents } = window.JUCUM_DATA;
            const i = STUDENTS.findIndex(x => x.id === deleting.id);
            if (i >= 0) { STUDENTS.splice(i, 1); saveStudents(STUDENTS); }
            if (window.JUCUM_SB) window.JUCUM_SB.remove('users', deleting.id).catch(() => {});
            setDeleting(null); setQ(x => x + '');
          }}
          onClose={() => setDeleting(null)}
        />
      )}

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
  const { updateGroup, passThreshold, getPassThresholds, setPassThreshold, setGroupThreshold, getGroupThreshold } = window.JUCUM_DATA;
  const [info, setInfo] = React.useState({ name: group.name, schedule: group.schedule, startDate: group.startDate });
  const levelBase = getPassThresholds()[group.level];                 // estándar del nivel
  const [ownThr, setOwnThr] = React.useState(() => getGroupThreshold(groupId) != null);  // ¿override propio?
  const [thr, setThr] = React.useState(() => { const g = getGroupThreshold(groupId); return g != null ? g : levelBase; });
  const save = () => {
    setGroupSettings(groupId, s);
    if (setGroupThreshold) setGroupThreshold(groupId, ownThr ? thr : null);  // null = vuelve a heredar
    if (updateGroup && (info.name !== group.name || info.schedule !== group.schedule || info.startDate !== group.startDate)) {
      updateGroup(groupId, { name: info.name, schedule: info.schedule, startDate: info.startDate });
    }
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
            <div className="settings-label">✏️ Información del grupo</div>
            <div className="settings-hint">Cambios simples como nombre, horario o fecha de inicio.</div>
            <div style={{display:'grid', gap:8, marginTop:6}}>
              <input className="input-text" value={info.name} onChange={e=>setInfo({...info, name:e.target.value})} placeholder="Nombre del grupo" />
              <input className="input-text" value={info.schedule} onChange={e=>setInfo({...info, schedule:e.target.value})} placeholder="Horario (ej: Lun y Mié 6–8pm)" />
              <div className="row-flex"><span className="settings-hint" style={{margin:0}}>Inicio:</span><input type="date" className="input-text" value={info.startDate || ''} onChange={e=>setInfo({...info, startDate:e.target.value})} /></div>
            </div>
          </div>

          <div className="settings-block">
            <div className="settings-label">📦 Módulos activos del grupo</div>
            <div className="settings-hint">Prende los módulos que este grupo verá ahora. Puedes tener <b>varios activos a la vez</b> — cada grupo a su ritmo.</div>
            <div className="module-picker">
              {modules.map(m => {
                const on = (s.activeModuleIds || []).includes(m.id);
                const toggle = () => {
                  const set = new Set(s.activeModuleIds || []);
                  if (on) set.delete(m.id); else set.add(m.id);
                  const ids = modules.filter(x => set.has(x.id)).map(x => x.id);
                  setS({...s, activeModuleIds: ids, activeModuleId: ids[0] || null});
                };
                return (
                  <div key={m.id} style={{display:'flex',alignItems:'center',gap:11,padding:'11px 14px',border:'1.5px solid '+(on?'#A5D6A7':'#E6E3DA'),borderRadius:10,background:on?'#F0FAF1':'#fff'}}>
                    <span style={{fontSize:20}}>{m.emoji}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:"'Fredoka',sans-serif",fontWeight:600,fontSize:13,color:'var(--text)'}}>{m.name}</div>
                      <div style={{fontSize:11,color:'var(--text-soft)',fontWeight:700,marginTop:1}}>{m.activities.length} actividades · {on ? '🟢 Activo' : '⚪ Apagado'}</div>
                    </div>
                    <button type="button" onClick={toggle} aria-label={on?'Apagar módulo':'Prender módulo'}
                            style={{width:48,height:27,borderRadius:14,border:'none',cursor:'pointer',background:on?'#2EA84B':'#CFCFC8',position:'relative',transition:'background .15s',flexShrink:0,padding:0}}>
                      <span style={{position:'absolute',top:3,left:on?24:3,width:21,height:21,borderRadius:'50%',background:'#fff',transition:'left .15s',boxShadow:'0 1px 3px rgba(0,0,0,0.3)'}}></span>
                    </button>
                  </div>
                );
              })}
            </div>
            {(s.activeModuleIds || []).length === 0 && <div className="settings-hint" style={{marginTop:8,color:'#C62828',fontWeight:700}}>⚠ Sin módulos activos, el alumno no verá actividades.</div>}
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
            <div className="settings-label">✅ Umbral de aprobación · {group.name}</div>
            <div className="settings-hint">Nota mínima para que una práctica cuente como <b>aprobada</b>. Por debajo queda "a mejorar": da pocos puntos y <b>no marca completado</b> (frena el farmeo).</div>
            <label style={{display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background: ownThr ? '#FFF8E8' : '#F4F1EA', border:'1px solid '+(ownThr?'#F0C66B':'#E3DDD0'), borderRadius:10, cursor:'pointer', marginBottom: ownThr ? 12 : 0}}>
              <input type="checkbox" checked={ownThr} onChange={e => { const on = e.target.checked; setOwnThr(on); if (on && thr == null) setThr(levelBase); else if (!on) setThr(levelBase); }} style={{width:18, height:18}} />
              <span style={{flex:1, fontSize:13, fontWeight:700, color:'var(--text)'}}>Usar umbral propio para este grupo</span>
              {!ownThr && <span style={{fontSize:12, fontWeight:800, color:'#8A7F6A'}}>Hereda del nivel {group.level.toUpperCase()}: {levelBase}%</span>}
            </label>
            {ownThr ? (
              <>
                <div className="row-flex">
                  <input type="range" min="50" max="100" step="1" value={thr}
                         onChange={e => setThr(parseInt(e.target.value))} className="slider-input" />
                  <div className="target-val">{thr}<span>%</span></div>
                </div>
                <div className="preset-row">
                  {[75, 78, 85, 90].map(v => (
                    <button key={v} className={`preset ${thr === v ? 'on' : ''}`} onClick={() => setThr(v)}>{v}%</button>
                  ))}
                </div>
                <div className="settings-hint" style={{marginTop:8}}>Base del nivel {group.level.toUpperCase()}: <b>{levelBase}%</b>. Útil si este grupo va a otro ritmo (módulo distinto, nivelación). Al guardar, el ranking se recalcula al instante.</div>
              </>
            ) : (
              <div className="settings-hint" style={{marginTop:8}}>Este grupo usa el estándar del nivel ({levelBase}%). Recomendado: mantén la herencia salvo que el grupo lo necesite.</div>
            )}
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
              // 🔧 Multi-módulo: antes solo listaba el primer módulo activo — no se
              // podían habilitar actividades de los demás módulos activos del grupo.
              const ids = (s.activeModuleIds && s.activeModuleIds.length) ? s.activeModuleIds : (s.activeModuleId ? [s.activeModuleId] : []);
              const activeMods = modules.filter(m => ids.includes(m.id));
              if (!activeMods.length) return <div className="settings-hint">Primero elige el módulo activo arriba.</div>;
              const list = s.unlockedActivities || [];
              const toggle = (key) => setS({...s, unlockedActivities: list.includes(key) ? list.filter(k => k !== key) : [...list, key]});
              return (
                <div style={{marginTop: 10, display: 'grid', gap: 6}}>
                  {activeMods.map(mod => (
                    <React.Fragment key={mod.id}>
                      {activeMods.length > 1 && <div style={{fontWeight:800, fontSize:12.5, color:'#666', marginTop:6}}>{mod.emoji ? mod.emoji + ' ' : ''}{mod.name}</div>}
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
                    </React.Fragment>
                  ))}
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
  // 🔧 BUG (jul-2026): aquí solo se mostraba el PRIMER módulo activo
  // (settings.activeModuleId) — si el grupo tenía varios módulos activos, lo que
  // el alumno completaba en los demás NO aparecía en el panel del profesor
  // (aunque sí estaba registrado y se veía en el perfil del alumno). Ahora se
  // lista CADA módulo activo (igual que la vista del alumno) y además cualquier
  // módulo no activo donde el alumno tenga avance — su trabajo nunca queda invisible.
  const activeIds = (settings.activeModuleIds && settings.activeModuleIds.length)
    ? settings.activeModuleIds
    : (settings.activeModuleId ? [settings.activeModuleId] : []);
  let activeMods = mods.filter(m => activeIds.includes(m.id));
  if (!activeMods.length && mods.length) activeMods = [mods[0]];
  const progress = getStudentProgress(stu.id);
  const doneKeys = Object.keys(progress.completed || {});
  const extraMods = mods.filter(m => !activeMods.includes(m) && doneKeys.some(k => k.indexOf(m.id + ':') === 0));
  const shown = [...activeMods.map(m => ({mod: m, extra: false})), ...extraMods.map(m => ({mod: m, extra: true}))];
  if (!shown.length) return null;
  return (
    <>
      {shown.map(({mod, extra}) => {
        const doneCount = mod.activities.filter(a => progress.completed[`${mod.id}:${a.id}`]).length;
        return (
          <div key={mod.id} className="scard" style={{marginTop:18}}>
            <div className="sec-head">
              <div className="sec-title">📦 Avance en “{mod.name}”{extra && <span style={{marginLeft:8, fontSize:11, fontWeight:800, color:'#8A6D1A', background:'#FFF3D6', border:'1px solid #F0C66B', borderRadius:10, padding:'2px 8px'}}>módulo no activo · tiene avance</span>}</div>
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
      })}
    </>
  );
}

function StudentRow({ stu, rank, level, onClick, onDelete }) {
  const m = window.JUCUM_DATA.getStudentMastery(stu);
  const mastery = m.pct;
  // 🎓 Preparación para el examen (métrica distinta al dominio: castiga más la
  // inactividad y exige cubrir ≥60% del módulo). Visible por alumno, sin abrir su ficha.
  const r = window.JUCUM_DATA.getStudentReadiness(stu);
  // ✅ "Al día" = terminó TODO lo asignado: que no practique no es una alerta
  // (era la causa de "primeros lugares con 9 días sin conectarse": los mejores
  // terminan todo y ya no tienen nada nuevo que completar).
  const upToDate = m.total > 0 && m.done >= m.total;
  const status = (stu.lastActiveDays == null) ? {label:'⚪ Sin práctica aún',cls:'na'}
              : stu.lastActiveDays === 0 ? {label:'🟢 Practicó hoy',cls:'ok'}
              : upToDate ? {label:`✅ Al día (hace ${stu.lastActiveDays}d)`,cls:'ok'}
              : stu.lastActiveDays <= 2 ? {label:`🟢 practicó hace ${stu.lastActiveDays}d`,cls:'ok'}
              : stu.lastActiveDays <= 6 ? {label:`🟡 sin practicar ${stu.lastActiveDays}d`,cls:'warn'}
              : {label:`🔴 sin practicar ${stu.lastActiveDays}d`,cls:'bad'};
  // 📶 Conexión real (si está registrada) — puede diferir de la práctica
  const conn = (stu.lastSeenDays == null) ? null
             : stu.lastSeenDays === 0 ? '📶 entró hoy'
             : `📶 entró hace ${stu.lastSeenDays}d`;
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
      <div className={`col-avg ${mastery >= 85 ? 'high' : mastery >= 70 ? 'mid' : mastery > 0 ? 'low' : 'na'}`}
           title={`Dominio = lo hecho (${m.done}/${m.total}) × aciertos (${m.quality}%) × constancia (${m.active7}/7 días activos)` + (m.active7 === 0 && mastery > 0 ? ' · incluye −15% por no practicar esta semana' : '') + ` · 🎓 Preparación examen: ${r.overall}% (${r.apt ? 'apto' : 'aún no apto'})`}>
        <div>{mastery > 0 ? `${mastery}%` : '—'}</div>
        <div style={{fontSize:10, fontWeight:800, marginTop:2, color: r.apt ? '#2E7D32' : r.overall >= 50 ? '#B26A00' : '#C62828'}}>{r.apt ? '🎓 listo' : `🎓 ${r.overall}%`}</div>
      </div>
      <div className="col-streak">{stu.streak > 0 ? `🔥 ${stu.streak}` : '—'}</div>
      <div className="col-time">{Math.floor(stu.totalMinutes/60) > 0 ? `${Math.floor(stu.totalMinutes/60)}h ${stu.totalMinutes%60}m` : `${stu.totalMinutes}m`}</div>
      <div className="col-last">{stu.achievements.length} 🏆</div>
      <div className={`col-status ${status.cls}`} style={status.cls === 'na' ? {color:'#A8A8A8'} : undefined}>
        <div>{status.label}</div>
        {conn && <div style={{fontSize:10.5,fontWeight:700,color:'#8B8B8B',marginTop:2}}>{conn}</div>}
      </div>
      {onDelete ? <button className="row-del" title="Eliminar alumno" onClick={(e) => { e.stopPropagation(); onDelete(); }}>🗑️</button> : <span></span>}
    </div>
  );
}

/* ─── Student detail view ──────────────────────────────────────────── */

function StudentDetail({ studentId, onBack, onContact }) {
  const { STUDENTS, GROUPS, LEVELS, ACHIEVEMENT_DEFS, ACTIVITY_LOG, getStudentMastery } = window.JUCUM_DATA;
  const stu = STUDENTS.find(s => s.id === studentId);
  const mastery = getStudentMastery(stu);
  const [resetting, setResetting] = React.useState(false);
  const Gate = window.TeacherPasswordGate;
  const [showReport, setShowReport] = React.useState(false);
  const doReset = () => {
    if (window.JUCUM_SB) window.JUCUM_SB.update('users', stu.id, { password: '1234' }).catch(e => console.warn(e.message));
    setResetting(false);
    alert(`✅ Contraseña de ${stu.fullName} reseteada a "1234".\n\n⚠ IMPORTANTE: pídele que al ingresar la cambie por una que pueda recordar, y que la anote en un lugar seguro para no volver a tener problemas.`);
  };
  const group = GROUPS.find(g => g.id === stu.group);
  const level = LEVELS[stu.level];
  const myLog = window.JUCUM_DATA.getStudentLog ? window.JUCUM_DATA.getStudentLog(stu.id) : ACTIVITY_LOG.filter(a => a.studentId === stu.id);
  React.useEffect(() => { document.body.setAttribute('data-level', stu.level); return () => document.body.removeAttribute('data-level'); }, [stu.level]);

  if (showReport) return <StudentReport student={stu} onBack={() => setShowReport(false)} forTeacher />;

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
          <button className="btn-soft" onClick={() => setShowReport(true)}>📄 Reporte de avance</button>
          <button className="btn-soft" onClick={() => onContact && onContact(stu.id)}>💬 Contactar</button>
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
        <div className="kpi"><div className="kpi-ico">📅</div><div className="kpi-num">{stu.lastActiveDays == null ? '—' : stu.lastActiveDays === 0 ? 'Hoy' : `${stu.lastActiveDays}d`}</div><div className="kpi-lbl">Última práctica</div></div>
        <div className="kpi" title="Última vez que entró a la plataforma. Se registra desde esta actualización (script 22); — = aún sin dato."><div className="kpi-ico">📶</div><div className="kpi-num">{stu.lastSeenDays == null ? '—' : stu.lastSeenDays === 0 ? 'Hoy' : `${stu.lastSeenDays}d`}</div><div className="kpi-lbl">Última conexión</div></div>
      </div>

      <ModuleChecklist stu={stu} group={group} />

      <div style={{marginTop:18}}><ReadinessCard student={stu} forTeacher /></div>

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

      {window.TeacherStudentNotes && <TeacherStudentNotes studentId={stu.id} />}

      <StudentPartsCard studentId={stu.id} />

      <div className="scard" style={{marginTop:18}}>
        <div className="sec-head">
          <div className="sec-title">Historial de actividad</div>
          <span className="sec-meta">{myLog.length} {myLog.length === 1 ? 'evento' : 'eventos'}</span>
        </div>
        {myLog.length > 0
          ? <ActivityByDay events={myLog} />
          : <div className="empty-state"><div className="icon">📭</div>Sin actividad registrada todavía.</div>}
      </div>

      <div style={{marginTop:18}}><GradesRecord student={stu} forTeacher /></div>

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
  // ✅ Al día = terminó todo lo asignado → no practicar no es una alerta.
  const _m = window.JUCUM_DATA.getStudentMastery(stu);
  const upToDate = _m.total > 0 && _m.done >= _m.total;
  const conn = stu.lastSeenDays;   // 📶 conexión real (null = sin dato)

  if (stu.avgScore >= 90) strengths.push({title:'Comprensión sobresaliente', body:`Promedio de ${stu.avgScore}% — entre los mejores del grupo.`});
  else if (stu.avgScore >= 85) strengths.push({title:'Alto rendimiento', body:`${stu.avgScore}% de promedio — dominio sólido del contenido.`});
  if (stu.streak >= 7)  strengths.push({title:'Disciplina excepcional', body:`Racha activa de ${stu.streak} días. Es la clave del progreso bilingüe.`});
  else if (stu.streak >= 3) strengths.push({title:'Constante', body:`${stu.streak} días de práctica seguidos.`});
  if (stu.totalMinutes >= 500) strengths.push({title:'Dedicación alta', body:`${Math.floor(stu.totalMinutes/60)}h ${stu.totalMinutes%60}m de práctica acumulada.`});
  if (stu.achievements.includes('perfect'))  strengths.push({title:'Perfección alcanzada', body:'Completó al menos un quiz sin errores.'});
  if (stu.avgScore >= 92) strengths.push({title:'Pensamiento crítico', body:'Promedio muy alto — capta mensajes implícitos del autor.'});
  if (stu.completedModules >= 2) strengths.push({title:'Avance sólido', body:`Ya completó ${stu.completedModules} módulos.`});
  if (upToDate && stu.lastActiveDays >= 3) strengths.push({title:'Al día con lo asignado', body:`Terminó todas las actividades desbloqueadas — su última práctica fue hace ${stu.lastActiveDays} días porque no tiene pendientes. Para que siga practicando, actívale el siguiente módulo o sugiérele el refuerzo.`});

  if (!upToDate && stu.lastActiveDays >= 14) weaknesses.push({title:'Inactividad crítica', body:`Sin practicar hace ${stu.lastActiveDays} días. Riesgo de pérdida de hábito y olvido del vocabulario.`});
  else if (!upToDate && stu.lastActiveDays >= 7) weaknesses.push({title:'Práctica irregular', body:`Lleva ${stu.lastActiveDays} días sin practicar. La adquisición bilingüe necesita exposición diaria.`});
  if (!upToDate && conn != null && conn <= 2 && stu.lastActiveDays >= 5) weaknesses.push({title:'Entra pero no practica', body:`Se conectó ${conn === 0 ? 'hoy' : `hace ${conn} días`} pero su última práctica fue hace ${stu.lastActiveDays}. Puede estar bloqueado con una actividad — conversarlo.`});
  if (stu.avgScore > 0 && stu.avgScore < 60) weaknesses.push({title:'Comprensión general baja', body:`Promedio de ${stu.avgScore}%. Probable dificultad con vocabulario básico o estructuras del nivel.`});
  else if (stu.avgScore > 0 && stu.avgScore < 70) weaknesses.push({title:'Comprensión irregular', body:`Promedio de ${stu.avgScore}% — entiende lo literal pero falla en inferencias.`});
  if (stu.totalMinutes < 60 && stu.lastActiveDays >= 3) weaknesses.push({title:'Exposición muy baja', body:`Solo ${stu.totalMinutes} min totales de práctica. Krashen necesita volumen de input.`});
  if (stu.completedModules === 0 && stu.totalMinutes > 30) weaknesses.push({title:'No completa módulos', body:'Empieza pero no termina. Sugerir cerrar cada módulo antes de pasar al siguiente.'});
  if (stu.avgScore > 0 && stu.avgScore < 75 && stu.completedModules >= 1) weaknesses.push({title:'Inferencia pendiente', body:'Aún le cuesta deducir lo no explícito — reforzar preguntas inferenciales.'});
  if (stu.avgScore >= 80 && stu.avgScore < 90) weaknesses.push({title:'Pensamiento crítico pendiente', body:'Domina lo literal pero aún no capta del todo el mensaje del autor.'});
  if (!upToDate && stu.streak === 0 && stu.lastActiveDays >= 2) weaknesses.push({title:'Sin racha', body:'No mantiene continuidad. La práctica espaciada > sesiones intensas esporádicas.'});

  if (!upToDate && stu.lastActiveDays >= 7) plan.push({priority:'🔴', title:'Re-engagement inmediato', body:'Contactarlo por WhatsApp. Revisar si hay barreras (acceso, motivación, dificultad).'});
  if (stu.avgScore > 0 && stu.avgScore < 70) {
    plan.push({priority:'🔴', title:'Refuerzo de vocabulario', body:'Sesiones diarias de 10 min en Quizlet — set "Vocabulario 1" del nivel.'});
    plan.push({priority:'🟡', title:'Reescuchar listening', body:'Cada actividad puede oírse varias veces — sugerirle bajar la velocidad a 0.6×.'});
  }
  if (stu.avgScore > 0 && stu.avgScore < 78) {
    plan.push({priority:'🟡', title:'Trabajar inferencias', body:'Leer Story 4 del módulo y hacer las 3 preguntas inferenciales del quiz — explicar cómo se deduce cada respuesta.'});
  }
  if (stu.avgScore >= 80 && stu.avgScore < 90) {
    plan.push({priority:'🟢', title:'Pensamiento crítico', body:'Discutir el mensaje de cada historia en clase. "¿Qué quiere decir el autor con esto?"'});
  }
  if (stu.completedModules === 0) plan.push({priority:'🟡', title:'Cerrar primer módulo', body:'Animarlo a completar Personal Identity al 100%. Refuerzo positivo al desbloquear el primer logro.'});
  if (!upToDate && stu.streak === 0) plan.push({priority:'🟡', title:'Construir hábito', body:'Meta: 10 min diarios durante 7 días. Después del 7º día el hábito se automatiza.'});
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
/* Detalle POR PARTE: qué historia/audio (1-4) hizo el alumno dentro de cada
 * material (Stories, Comprensión lectora, Comprensión auditiva). Lee la tabla
 * activity_parts de la nube (la llena el conector jucum-connect.js). */
function StudentPartsCard({ studentId }) {
  const [parts, setParts] = React.useState(null);
  React.useEffect(() => {
    let alive = true;
    if (window.JUCUM_SYNC && window.JUCUM_SYNC.fetchActivityParts) {
      window.JUCUM_SYNC.fetchActivityParts(studentId).then(r => { if (alive) setParts(r || []); }).catch(() => { if (alive) setParts([]); });
    } else setParts([]);
    return () => { alive = false; };
  }, [studentId]);
  if (!parts) return null; // cargando
  if (!parts.length) return (
    <div className="scard" style={{marginTop:18}}>
      <div className="sec-head">
        <div className="sec-title">📍 Detalle por historia / audio</div>
        <span className="sec-meta">qué parte exacta hizo</span>
      </div>
      <div style={{fontSize:12.5, color:'var(--text-soft)', fontWeight:600, lineHeight:1.5, background:'#FAFAF6', border:'1px dashed var(--border)', borderRadius:10, padding:'12px 14px'}}>
        Aún no hay registro por historia para este alumno. Aparecerá automáticamente cuando practique una <b>Comprensión lectora</b>, <b>auditiva</b> o <b>Story</b> con los materiales actualizados (indica Historia/Audio #1–4 y su nota).
      </div>
    </div>
  );
  const META = {
    reading:   { ico:'📚', label:'Comprensión lectora', unit:'Historia' },
    listening: { ico:'🎧', label:'Comprensión auditiva', unit:'Audio' },
    story:     { ico:'📖', label:'Stories y Diálogos', unit:'Historia' },
  };
  const groups = {};
  parts.forEach(p => { const k = p.module_id + '|' + p.activity_id; (groups[k] = groups[k] || []).push(p); });
  return (
    <div className="scard" style={{marginTop:18}}>
      <div className="sec-head">
        <div className="sec-title">📍 Detalle por historia / audio</div>
        <span className="sec-meta">qué parte exacta hizo</span>
      </div>
      {Object.keys(groups).map(k => {
        const rows = groups[k];
        const actId = k.split('|')[1];
        const m = META[actId] || { ico:'📄', label: actId, unit:'Parte' };
        const maxPart = Math.max(4, ...rows.map(r => r.part));
        const byPart = {}; rows.forEach(r => { byPart[r.part] = r; });
        return (
          <div key={k} style={{border:'1px solid var(--border)', borderRadius:12, padding:'11px 13px', marginBottom:10}}>
            <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:9}}>
              <span style={{fontSize:18}}>{m.ico}</span>
              <b style={{flex:1, fontSize:13.5}}>{m.label}</b>
              <span style={{fontSize:11, fontWeight:800, color:'#1F3A8A', background:'#E3E9F8', borderRadius:11, padding:'2px 9px'}}>{rows.length}/{maxPart} {m.unit.toLowerCase()}s</span>
            </div>
            <div style={{display:'grid', gridTemplateColumns:`repeat(${maxPart},1fr)`, gap:8}}>
              {Array.from({length: maxPart}, (_, i) => i + 1).map(n => {
                const r = byPart[n];
                return (
                  <div key={n} style={{border:'1.5px solid ' + (r ? '#A5D6A7' : 'var(--border)'), borderRadius:10, padding:'9px 6px', textAlign:'center', background: r ? '#F0FAF1' : '#FAFAF6', opacity: r ? 1 : .5}}>
                    <div style={{fontSize:10.5, fontWeight:800, color: r ? '#2E7D32' : 'var(--text-soft)'}}>{m.unit} {n}</div>
                    <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:13, marginTop:3}}>{r ? (r.score != null ? r.score + '%' : '✓') : '🔒'}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
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
    // 🔧 Día en hora de PERÚ: antes comparaba contra la fecha local/UTC del navegador
    // y podía salir "Hace -1 días" para actividades hechas hoy.
    const todayP = new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10);
    const diff = Math.round((Date.parse(todayP) - Date.parse(d)) / 86400000);
    const date = new Date(d + 'T12:00:00');
    const dateLabel = date.toLocaleDateString('es-PE', { weekday:'long', day:'numeric', month:'long' });
    if (diff === 0) return `Hoy · ${dateLabel}`;
    if (diff === 1) return `Ayer · ${dateLabel}`;
    if (diff > 1 && diff < 7) return `Hace ${diff} días · ${dateLabel}`;
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

/* Botón "Foro" del profesor con desplegable por grupo + punto rojo de no-leídos */
function TeacherForumNav({ onOpen }) {
  const { GROUPS, LEVELS } = window.JUCUM_DATA;
  const F = window.JUCUM_FORUM;
  const [open, setOpen] = React.useState(false);
  const [, setTick] = React.useState(0);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const onStorage = (e) => { if (e.key && (e.key.startsWith('jucum_forum') || e.key.startsWith('jucum_likes'))) setTick(t => t + 1); };
    const onClickOut = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    window.addEventListener('storage', onStorage);
    document.addEventListener('mousedown', onClickOut);
    return () => { window.removeEventListener('storage', onStorage); document.removeEventListener('mousedown', onClickOut); };
  }, []);
  const counts = GROUPS.map(g => ({ g, n: F ? F.forumUnreadCount('teacher', g.id) : 0 }));
  const totalUnread = counts.reduce((s, c) => s + c.n, 0);
  return (
    <div className="foro-dd" ref={ref}>
      <a className="nav-link" href="#" onClick={(e)=>{e.preventDefault();setOpen(o=>!o);}} style={{position:'relative'}}>
        💬 Foro ▾{totalUnread > 0 && <span className="nav-dot">{totalUnread > 9 ? '9+' : totalUnread}</span>}
      </a>
      {open && (
        <div className="foro-menu">
          <div className="foro-menu-head">Foros por grupo</div>
          {counts.map(({ g, n }) => (
            <button key={g.id} className="foro-menu-item" onClick={() => { setOpen(false); onOpen(g.id); }}>
              <span className="foro-menu-emo">{LEVELS[g.level].emoji}</span>
              <span className="foro-menu-name">{g.name}</span>
              {n > 0
                ? <span className="foro-menu-badge">{n > 9 ? '9+' : n} nuevo{n === 1 ? '' : 's'}</span>
                : <span className="foro-menu-none">al día</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { TeacherDashboard, TeacherForumNav, GroupsView, GroupDetail, GroupSettingsModal, StudentDetail, DiagnoseStudent, ActivityByDay, PracticeChart, BreakdownRow, DetailModal, StudentRow });
