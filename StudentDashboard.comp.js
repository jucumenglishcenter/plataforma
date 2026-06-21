/* Student dashboard — Bloque A · with active module + daily target + activity checklist */

function StudentDashboard({ user, onLogout }) {
  const { STUDENTS, GROUPS, LEVELS, MODULE_CATALOG, ACHIEVEMENT_DEFS, getGroupSettings, getStudentProgress, getStudentXP, getStudentLevel, MEDAL_RARITY, RARITY_STYLE, earnedMedals, entryPassed } = window.JUCUM_DATA;
  const student = STUDENTS.find(s => s.id === user.studentId) || STUDENTS[0];
  const group = student ? GROUPS.find(g => g.id === student.group) : null;
  const level = student ? LEVELS[student.level] : null;
  // Blindaje: si el alumno no tiene grupo/nivel válido, mensaje amable (no pantalla en blanco).
  if (!student || !group || !level) {
    return <StudentNoGroup onLogout={onLogout} student={student} />;
  }
  const settings = getGroupSettings(student.group);
  const progress = getStudentProgress(student.id);
  const allModules = MODULE_CATALOG[student.level] || [];
  const activeIds = (settings.activeModuleIds && settings.activeModuleIds.length)
    ? settings.activeModuleIds
    : (settings.activeModuleId ? [settings.activeModuleId] : []);
  const activeModules = allModules.filter(m => activeIds.includes(m.id));
  const activeModule = activeModules[0] || allModules[0];
  const [view, setView] = React.useState('dashboard');
  const [showOnb, setShowOnb] = React.useState(() => !localStorage.getItem(`jucum_onboarded_${user.studentId}`));
  const [surveyDue, setSurveyDue] = React.useState(false);
  React.useEffect(() => {
    try { if (window.JUCUM_SURVEY) setSurveyDue(window.JUCUM_SURVEY.isSurveyDue(student)); } catch {}
  }, [student && student.id]);
  const [alertKind, setAlertKind] = React.useState(null);
  const [fTick, setFTick] = React.useState(0);
  React.useEffect(() => {
    const onStorage = (e) => { if (e.key && (e.key.startsWith('jucum_forum') || e.key.startsWith('jucum_likes'))) setFTick(t => t + 1); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  const forumUnread = window.JUCUM_FORUM ? window.JUCUM_FORUM.forumUnreadCount(student.id, student.group) : 0;
  const openForum = () => {
    if (window.JUCUM_FORUM) window.JUCUM_FORUM.markForumSeen(student.id, student.group);
    setFTick(t => t + 1);
    setView('forum');
  };
  const P = window.JUCUM_PAY;
  const acct = P ? P.getAccountStatus(student) : { state:'al_dia', blocked:false, daysLeft:null, payDay:5 };
  const [celebrate, setCelebrate] = React.useState(() => P ? P.pendingConfirmCelebration(student.id) : null);
  const closeCelebrate = () => { if (celebrate && P) P.markCelebrationSeen(celebrate.id); setCelebrate(null); };

  // Gamification stats
  const xp = getStudentXP(student);
  const xpInfo = getStudentLevel(xp);

  React.useEffect(() => {
    document.body.setAttribute('data-level', student.level);
    try { if (window.JUCUM_ATT) window.JUCUM_ATT.maybeGrantWeeklyReward(student); } catch {}
  }, [student.level]);

  // Practice reminder — fires once per day if behind on daily target
  React.useEffect(() => {
    if (!window.JUCUM_NOTIF) return;
    const todayKey = `jucum_reminded_${student.id}_${new Date().toISOString().slice(0,10)}`;
    if (localStorage.getItem(todayKey)) return;
    const todayMin = progress.todayMinutes || 0;
    const targetMin = settings.dailyTargetMin || 15;
    if (todayMin < targetMin) {
      const missing = targetMin - todayMin;
      window.JUCUM_NOTIF.pushNotif(student.id, {
        type: 'daily-reminder',
        title: '🎯 Tu meta diaria te espera',
        body: todayMin === 0
          ? `Aún no has practicado hoy. Necesitas ${targetMin} min para cumplir tu meta.`
          : `Llevas ${todayMin} min — te faltan ${missing} min para tu meta de hoy.`,
      });
      localStorage.setItem(todayKey, '1');
    }
    // Streak warning — practiced yesterday but not today, after 6pm
    const now = new Date();
    if (student.streak > 0 && todayMin === 0 && now.getHours() >= 18) {
      const streakKey = `jucum_streak_warn_${student.id}_${now.toISOString().slice(0,10)}`;
      if (!localStorage.getItem(streakKey)) {
        window.JUCUM_NOTIF.pushNotif(student.id, {
          type: 'streak',
          title: '🔥 Tu racha está en peligro',
          body: `Lleva ${student.streak} día${student.streak === 1 ? '' : 's'} seguidos. Practica antes de medianoche para no perderla.`,
        });
        localStorage.setItem(streakKey, '1');
      }
    }
  }, [student.id, progress.todayMinutes, settings.dailyTargetMin]);

  // Alarma visual + sonora (1 vez al día): inactividad o racha en peligro
  React.useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const key = `jucum_alert_${student.id}_${today}`;
    if (localStorage.getItem(key)) return;
    let kind = null;
    if (student.lastActiveDays >= 3) kind = 'inactive';
    else if (student.streak >= 1 && (progress.todayMinutes || 0) === 0 && new Date().getHours() >= 18) kind = 'streak';
    if (!kind) return;
    setAlertKind(kind);
    localStorage.setItem(key, '1');
    if (window.JUCUM_SOUND) window.JUCUM_SOUND.alert();
  }, [student.id]);

  const activities = activeModule?.activities || [];
  const doneCount = activities.filter(a => entryPassed(progress.completed[`${activeModule?.id}:${a.id}`], student.level, student.group)).length;
  const pctModule = activities.length ? Math.round((doneCount/activities.length)*100) : 0;

  const todayMin = progress.todayMinutes || 0;
  const targetMin = settings.dailyTargetMin || 15;

  let deadlineLabel = null;
  if (settings.deadline) {
    const d = new Date(settings.deadline + 'T23:59:59');
    const diff = Math.ceil((d - new Date()) / 86400000);
    deadlineLabel = diff < 0 ? `⏰ Vencido hace ${-diff}d` : diff === 0 ? '⏰ Vence hoy' : `⏰ Vence en ${diff}d`;
  }

  return (
    <>
      {showOnb && <Onboarding studentId={user.studentId} onClose={() => setShowOnb(false)} />}
      {!showOnb && surveyDue && <SurveyModal student={student} onDone={() => setSurveyDue(false)} />}
      {!showOnb && celebrate && <PayCelebration payment={celebrate} onClose={closeCelebrate} />}
      {!showOnb && !celebrate && alertKind && <StudentAlertModal kind={alertKind} student={student} onClose={() => setAlertKind(null)} />}
      <header className="app-header">
        <div className="app-logo">
          <img src={window.JUCUM_LOGO || 'logo-jucum.png'} alt="JUCUM EC" />
          <div className="pgtitle">Mi panel de aprendizaje</div>
        </div>
        <div className="app-right">
          <span className="role-pill s">🎓 Alumno</span>
          <a className={`nav-link ${view==='profile'?'active':''}`} href="#" onClick={(e)=>{e.preventDefault();setView('profile');}}>👤 Mi perfil</a>
          <a className={`nav-link ${view==='forum'?'active':''}`} href="#" onClick={(e)=>{e.preventDefault();openForum();}} style={{position:'relative'}}>💬 Foro{forumUnread > 0 && <span className="nav-dot">{forumUnread > 9 ? '9+' : forumUnread}</span>}</a>
          <a className={`nav-link ${view==='tasks'?'active':''}`} href="#" onClick={(e)=>{e.preventDefault();setView('tasks');}}>📝 Tareas</a>
          <a className={`nav-link ${view==='exam'?'active':''}`} href="#" onClick={(e)=>{e.preventDefault();setView('exam');}}>🎓 Examen</a>
          <a className={`nav-link ${(view==='diagnosis'||view==='report'||view==='avance')?'active':''}`} href="#" onClick={(e)=>{e.preventDefault();setView('avance');}}>📈 Mi avance</a>
          <a className={`nav-link ${view==='payments'?'active':''}`} href="#" onClick={(e)=>{e.preventDefault();setView('payments');}} style={{position:'relative', color:(acct.blocked||acct.state==='por_vencer')?'#C62828':undefined}}>💳 Pagos{(acct.blocked||acct.state==='por_vencer') && <span className="nav-dot">!</span>}</a>
          <NotifBell userId={student.id} onNotifClick={(n) => { if (n.link === 'forum') setView('forum'); else if (n.link === 'tasks') setView('tasks'); else if (n.link === 'exam') setView('exam'); }} />
          <div className="user-pill">
            <div className="ava" style={{background:`linear-gradient(135deg,${level.color}80,${level.dark})`}}>
              {student.fullName.split(' ').map(n=>n[0]).slice(0,2).join('')}
            </div>
            <span>{student.fullName.split(' ')[0]}</span>
          </div>
          <button className="logout-btn" onClick={onLogout} title="Cerrar sesión">⎋ Salir</button>
        </div>
      </header>

      {acct.state === 'por_vencer' && view !== 'payments' && <PayReminderBar status={acct} onGo={() => setView('payments')} />}

      {acct.blocked && view !== 'payments' ? (
        <PayBlockGate status={acct} onGo={() => setView('payments')} />
      ) : view === 'payments' ? (
        <StudentPayments user={user} onBack={() => setView('dashboard')} />
      ) : view === 'profile' ? (
        <StudentProfile user={user} onBack={() => setView('dashboard')} />
      ) : view === 'tasks' ? (
        <StudentAssignments user={user} onBack={() => setView('dashboard')} />
      ) : view === 'exam' ? (
        <StudentExams user={user} onBack={() => setView('dashboard')} />
      ) : (view === 'avance' || view === 'report' || view === 'diagnosis') ? (
        <StudentAvance user={user} student={student} onBack={() => setView('dashboard')} />
      ) : view === 'forum' ? (
        <>
          <button className="back-btn" onClick={() => setView('dashboard')} style={{padding:'10px 28px 0'}}>← Volver al panel</button>
          <Forum user={user} groupOverride={student.group} />
        </>
      ) : (
      <main>
        <div className="welcome">
          <div className="welcome-text">
            <div className="eyebrow">{level.emoji} {level.code} · {group.name}</div>
            <h1>¡Hola, {student.fullName.split(' ')[0]}!</h1>
            <p>{student.streak > 0
              ? <>Racha de <b>{student.streak} {student.streak === 1 ? 'día' : 'días'}</b> 🔥 ¡No la rompas hoy!</>
              : 'Hoy es buen día para retomar la práctica 🌱'}</p>
          </div>
          <div className="welcome-streak">
            <div className="streak-num">{student.streak}</div>
            <div className="streak-lbl">días<br/>seguidos</div>
          </div>
        </div>

        {/* — Práctica dirigida: bloque con ventana de días (si hay) — */}
        {(() => {
          const dps = window.JUCUM_TT ? window.JUCUM_TT.getActiveDirectedForStudent(student) : [];
          return dps.length ? <div style={{marginTop:18, display:'flex', flexDirection:'column', gap:12}}>{dps.map(dp => <DirectedPracticeCard key={dp.id} dp={dp} student={student} />)}</div> : null;
        })()}

        {/* — PASO 2 · Aviso amable "por mejorar" (nunca el 🚩 rojo del profesor) — */}
        <ImproveBanner student={student} onGo={(it) => {
          const mod = (MODULE_CATALOG[student.level] || []).find(m => m.id === it.moduleId);
          const a = mod && (mod.activities || []).find(x => x.id === it.activityId);
          const href = a ? linkFor(a, mod, student.id) : null;
          if (href) window.location.href = href;
        }} />

        {/* — Mascota Neuro: al inicio, da la bienvenida y refleja su ánimo — */}
        <div style={{marginTop:18}}><MascotCard student={student} /></div>

        {/* ════════ ZONA 1 · HOY ════════ */}
        {/* Lo primero que ve el alumno: su práctica del día y su meta. */}
        <div style={{marginTop:18}}><TodayPracticeCard student={student} /></div>

        <div className="two-col" style={{gridTemplateColumns:'1fr 2fr'}}>
          <div className="scard daily-card">
            <div className="sec-head"><div className="sec-title">Meta de hoy</div></div>
            <DailyRing done={todayMin} target={targetMin} levelColor={level.color} dark={level.dark} />
            <div className="daily-msg">
              {todayMin >= targetMin
                ? <>🎉 <b>¡Meta cumplida!</b> Sigue si quieres más XP.</>
                : <>Te faltan <b>{targetMin - todayMin} min</b> para tu meta de hoy.</>}
            </div>
          </div>

          {/* ════════ ZONA 2 · MI MÓDULO ════════ */}
          <div className="scard">
            <div className="sec-head">
              <div className="sec-title">{activeModules.length > 1 ? 'Mis módulos activos' : 'Mi módulo activo'}</div>
              {deadlineLabel && <span className={`deadline ${settings.deadline && new Date(settings.deadline) < new Date() ? 'late' : ''}`}>{deadlineLabel}</span>}
            </div>
            {activeModules.length === 0 ? (
              <div className="empty-state"><div className="icon">📦</div>El profesor aún no activa ningún módulo.</div>
            ) : activeModules.map((mod, mi) => {
              const acts = mod.activities || [];
              const dc = acts.filter(a => entryPassed(progress.completed[`${mod.id}:${a.id}`], student.level, student.group)).length;
              const pc = acts.length ? Math.round((dc/acts.length)*100) : 0;
              return (
                <div key={mod.id} style={mi > 0 ? {marginTop:16, paddingTop:16, borderTop:'1px dashed var(--border)'} : undefined}>
                  <ModuleProgress mod={mod} progress={progress} pct={pc} doneCount={dc} studentId={student.id} freeUnlock={settings.unlockMode === 'free'} unlockMode={settings.unlockMode} unlockedActivities={settings.unlockedActivities} />
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Motivación: no pierdas tu avance + compite sano ── */}
        <AchievementWarning student={student} />

        <div className="gami-row" style={{gridTemplateColumns:'1fr 1fr', marginTop:18}}>
          <StreakCard streak={student.streak} />
          <RankCard student={student} groupName={group.name} />
        </div>

        <ProgressExplainer studentId={student.id} />

        {/* Acceso a lo "acumulado" (nivel, medallas, liga) → Mi perfil */}
        <div className="scard" style={{marginTop:18}}>
          <button type="button" onClick={()=>setView('profile')} style={{display:'flex',alignItems:'center',gap:11,width:'100%',border:'none',background:'none',cursor:'pointer',textAlign:'left',padding:0,fontFamily:'inherit'}}>
            <span style={{fontSize:24}}>🏅</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Fredoka',sans-serif",fontWeight:600,fontSize:15,color:'var(--text)'}}>Tu nivel, medallas y liga semanal</div>
              <div style={{fontSize:12,color:'var(--text-soft)',fontWeight:600}}>Míralas en Mi perfil</div>
            </div>
            <span style={{color:'var(--lp)',fontWeight:800,fontSize:20}}>→</span>
          </button>
        </div>
      </main>
      )}
    </>
  );
}

function DailyRing({ done, target, levelColor, dark }) {
  const pct = Math.min(100, Math.round((done/target)*100));
  const deg = (pct/100) * 360;
  const ringStyle = { background: `conic-gradient(${levelColor} 0deg, ${levelColor} ${deg}deg, #EEE ${deg}deg 360deg)` };
  return (
    <div className="ring-wrap">
      <div className="ring-outer" style={ringStyle}>
        <div className="ring-inner">
          <div className="ring-num">{done}<span>min</span></div>
          <div className="ring-meta">de {target}</div>
          <div className="ring-pct" style={{color:dark}}>{pct}%</div>
        </div>
      </div>
    </div>
  );
}

function ModuleProgress({ mod, progress, pct, doneCount, studentId, freeUnlock, unlockMode, unlockedActivities }) {
  return (
    <>
      <div className="cur-module">
        <div className="cm-ico">{mod.emoji}</div>
        <div className="cm-body">
          <div className="cm-name">{mod.name}</div>
          <div className="cm-sub">{doneCount} de {mod.activities.length} actividades · {pct}%</div>
          <div className="cm-progress">
            <div className="cm-bar"><div className="cm-fill" style={{width:pct+'%'}}></div></div>
            <div className="cm-pct">{pct}%</div>
          </div>
        </div>
      </div>
      <div className="activity-list">
        <div className="al-head">
          <span>Actividades del módulo</span>
          <span className="al-meta">{doneCount}/{mod.activities.length}</span>
        </div>
        <div className="al-items">
          {(() => {
            // status per activity: sequential unlock always applies; 'free' opens all,
            // 'custom' additionally opens the teacher-enabled checklist
            const enabledSet = new Set(unlockedActivities || []);
            const D = window.JUCUM_DATA;
            const stu = D.STUDENTS.find(s => s.id === studentId);
            const lvl = stu ? stu.level : 'pre-a1';
            const grp = stu ? stu.group : null;
            const items = mod.activities.map((a, i) => {
              const done = progress.completed[`${mod.id}:${a.id}`];
              const passed = done ? D.entryPassed(done, lvl, grp) : false;
              const prevDone = i === 0 || progress.completed[`${mod.id}:${mod.activities[i-1].id}`];
              const teacherOpen = freeUnlock || unlockMode === 'free' ||
                (unlockMode === 'custom' && enabledSet.has(`${mod.id}:${a.id}`));
              const alwaysOpen = a.open === true; // marcado en el catálogo ("open": true)
              const locked = !done && !prevDone && !teacherOpen && !alwaysOpen;
              // PASO 2 · hecho pero bajo el umbral → "a mejorar" (redo), no cuenta como ✓
              const status = done ? (passed ? 'done' : 'redo') : locked ? 'locked' : 'open';
              return { a, i, done, passed, status };
            });
            // group consecutive items that share a.group into expandable topics
            const segments = [];
            items.forEach(it => {
              const g = it.a.group || null;
              const last = segments[segments.length - 1];
              if (last && last.group === g) last.items.push(it);
              else segments.push({ group: g, items: [it] });
            });
            let topicNum = 0;
            return segments.map((seg, si) => {
              if (!seg.group) return seg.items.map(it => <ChecklistRow key={it.a.id} it={it} mod={mod} studentId={studentId} />);
              topicNum++;
              return <TopicGroup key={'g'+si} num={topicNum} name={seg.group} items={seg.items} mod={mod} studentId={studentId} />;
            });
          })()}
        </div>
      </div>
    </>
  );
}

function ChecklistRow({ it, mod, studentId }) {
  const { a, i, done, passed, status } = it;
  const href = status !== 'locked' ? linkFor(a, mod, studentId) : null;
  // Abierto pero sin material configurado todavía → "en preparación" (no es clic).
  if (status !== 'locked' && !done && !href) {
    return (
      <div className="al-item open" style={{opacity:.65, cursor:'default'}} title="Este material aún no está disponible. Pronto lo activaremos.">
        <span className="al-num">{i+1}</span>
        <span className="al-ico">{typeIcon(a.type)}</span>
        <span className="al-name">{a.name}</span>
        <span className="al-score" style={{background:'#EEEAE0', color:'#8A7F6A'}}>📚 En preparación</span>
      </div>
    );
  }
  // PASO 2 · "a mejorar" — hecho bajo el umbral: no marca ✓, invita a repetir.
  if (status === 'redo') {
    const pct = typeof done.score === 'number' ? (done.score > 10 ? Math.round(done.score) : Math.round(done.score*10)) : null;
    return (
      <a href={href || undefined} className="al-item open"
         style={{background:'#FFF7E8', borderColor:'#F0C66B'}}
         title="Tu nota quedó bajo el umbral de aprobación. Repítela para aprobar y ganar tus puntos.">
        <span className="al-num" style={{background:'#F9A825', color:'#fff', borderColor:'#c98a00'}}>!</span>
        <span className="al-ico">{typeIcon(a.type)}</span>
        <span className="al-name">{a.name}</span>
        <PhaseTags a={a} />
        {pct != null && <span className="al-score" style={{background:'#FDEBEA', color:'#C0392B'}}>{pct}%</span>}
        <span style={{fontSize:11, fontWeight:800, color:'#fff', background:'#F9A825', padding:'3px 10px', borderRadius:13, whiteSpace:'nowrap'}}>🔁 Repetir</span>
      </a>
    );
  }
  return (
    <a href={status!=='locked' ? (href || undefined) : undefined}
       className={`al-item ${status}`}>
      <span className="al-num">{status==='done' ? '✓' : status==='locked' ? '🔒' : i+1}</span>
      <span className="al-ico">{typeIcon(a.type)}</span>
      <span className="al-name">{a.name}</span>
      <PhaseTags a={a} />
      {done && <span className="al-score">{done.score}{typeof done.score === 'number' && done.score <= 10 ? '' : '%'}</span>}
      {status==='open' && <span className="al-arr">→</span>}
    </a>
  );
}

/* Tema numerado expandible — replica el patrón "Práctica de Gramática → Temas del módulo" */
function TopicGroup({ num, name, items, mod, studentId }) {
  const doneCount = items.filter(it => it.passed).length;
  const allDone = doneCount === items.length;
  const anyOpen = items.some(it => it.status === 'open' || it.status === 'redo');
  const [open, setOpen] = React.useState(anyOpen);
  return (
    <div className={`tg ${allDone ? 'tg-done' : ''}`}>
      <button type="button" className="tg-head" onClick={() => setOpen(!open)}>
        <span className={`tg-num ${allDone ? 'done' : ''}`}>{allDone ? '✓' : num}</span>
        <span className="tg-name">{name}</span>
        <span className="tg-meta">{doneCount}/{items.length}</span>
        <span className={`tg-arr ${open ? 'open' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="tg-items">
          {items.map(it => <ChecklistRow key={it.a.id} it={it} mod={mod} studentId={studentId} />)}
        </div>
      )}
    </div>
  );
}

function typeIcon(t) { return { story:'📗', reading:'📖', listening:'🎧', grammar:'📝', summary:'📚', quizlet:'🃏' }[t] || '📄'; }
/* Tarjeta de práctica dirigida en el panel del alumno (ventana + avance + estados) */
function DirectedPracticeCard({ dp, student }) {
  const D = window.JUCUM_DATA, TT = window.JUCUM_TT;
  const mods = D.MODULE_CATALOG[student.level] || [];
  const prog = D.getStudentProgress(student.id);
  const st = TT.directedStatusForStudent(dp, student);
  const fmt = (d) => d ? new Date(d+'T12:00:00').toLocaleDateString('es-PE',{day:'numeric',month:'short'}) : '—';
  const pct = st.total ? Math.round(st.done/st.total*100) : 0;
  const theme = st.state==='completed' ? {bg:'linear-gradient(120deg,#E8F5E9,#F4FBF4)',bd:'#A5D6A7',bar:'#2EA84B',badge:'#2E7D32',badgeBg:'#E8F5E9'}
    : st.state==='overdue' ? {bg:'linear-gradient(120deg,#FBE9E9,#FEF6F5)',bd:'#F1B0AA',bar:'#E08A82',badge:'#C0392B',badgeBg:'#FDEBEA'}
    : {bg:'linear-gradient(120deg,#FFF6E0,#FFFDF6)',bd:'#F0C66B',bar:'#F9A825',badge:'#B26A00',badgeBg:'#FFF3D6'};
  const stateLabel = st.state==='completed' ? `${st.done}/${st.total} · completada ✓`
    : st.state==='overdue' ? `${st.done}/${st.total} · vencida`
    : `${st.done}/${st.total} · ${st.daysLeft!=null ? (st.daysLeft<=0?'vence hoy':`te quedan ${st.daysLeft} día${st.daysLeft===1?'':'s'}`) : 'en progreso'}`;
  const winLabel = st.state==='completed' ? 'Completada a tiempo' : `Abrió ${fmt(dp.openDate)} · vence ${fmt(dp.dueDate)}`;
  const ico = st.state==='completed' ? '🎉' : st.state==='overdue' ? '⏰' : '📌';
  return (
    <div className="scard" style={{padding:0, overflow:'hidden', borderColor:theme.bd}}>
      <div style={{padding:'14px 16px', display:'flex', alignItems:'center', gap:12, background:theme.bg, borderBottom:`1px solid ${theme.bd}`}}>
        <span style={{fontSize:24}}>{ico}</span>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:15.5}}>{dp.title || 'Práctica dirigida'}</div>
          <div style={{fontSize:12.5, color:'var(--text-soft)', fontWeight:700, marginTop:1}}>{winLabel}</div>
        </div>
        <span style={{fontSize:11.5, fontWeight:800, padding:'5px 11px', borderRadius:20, whiteSpace:'nowrap', color:theme.badge, background:theme.badgeBg, border:`1px solid ${theme.bd}`}}>{stateLabel}</span>
      </div>
      <div style={{height:9, background:'#EFE9DB'}}><div style={{height:'100%', width:pct+'%', background:theme.bar, transition:'width .4s'}}></div></div>
      <div style={{padding:'12px 14px', display:'flex', flexDirection:'column', gap:7}}>
        {(dp.activities||[]).map((it, idx) => {
          const mod = mods.find(m=>m.id===it.moduleId);
          const a = mod && (mod.activities||[]).find(x=>x.id===it.activityId);
          const done = !!(prog.completed && prog.completed[`${it.moduleId}:${it.activityId}`]);
          const href = a ? linkFor(a, mod, student.id) : null;
          const Tag = href ? 'a' : 'div';
          return (
            <Tag key={idx} href={href||undefined} className={`al-item ${done?'done':'open'}`}>
              <span className="al-num">{done?'✓':idx+1}</span>
              <span className="al-ico">{typeIcon(it.type)}</span>
              <span className="al-name">{it.label || (a&&a.name) || 'Actividad'}</span>
              {!done && href && <span className="al-arr">→</span>}
            </Tag>
          );
        })}
      </div>
      {st.state==='completed' && dp.bonusXp>0 && st.onTime ? (
        <div style={{padding:'11px 14px', borderTop:'1px dashed #A5D6A7', display:'flex', alignItems:'center', gap:9, fontSize:12.5}}>
          <span style={{fontSize:18}}>🎁</span>
          <span style={{flex:1, fontWeight:700, color:'#1B5E20'}}>¡Bono ganado! Terminaste a tiempo y aprobado</span>
          <span style={{fontWeight:800, color:'#1B5E20', background:'#fff', border:'1px solid #A5D6A7', padding:'3px 10px', borderRadius:14}}>+{dp.bonusXp} XP</span>
        </div>
      ) : st.state==='overdue' ? (
        <div style={{padding:'10px 14px', borderTop:'1px dashed #F1B0AA', fontSize:12, color:'var(--text-soft)'}}>No se bloquea: puedes terminarla, pero ya no cuenta para el bono.</div>
      ) : dp.bonusXp>0 ? (
        <div style={{padding:'11px 14px', borderTop:`1px dashed ${theme.bd}`, display:'flex', alignItems:'center', gap:9, fontSize:12.5}}>
          <span style={{fontSize:18}}>🎁</span>
          <span style={{flex:1, fontWeight:700, color:theme.badge}}>Bono por terminar a tiempo y aprobado</span>
          <span style={{fontWeight:800, color:theme.badge, background:'#fff', border:`1px solid ${theme.bd}`, padding:'3px 10px', borderRadius:14}}>+{dp.bonusXp} XP</span>
        </div>
      ) : null}
    </div>
  );
}
/* Etiqueta P1/P2/P3 + 🏠Casa/🏫Clase según la metodología del teacher */
function PhaseTags({ a }) {
  const D = window.JUCUM_DATA;
  const meta = D.activityMeta ? D.activityMeta(a) : null;
  if (!meta || (!meta.phase && !meta.location)) return null;
  const loc = meta.location ? D.LOCATION_LABEL[meta.location] : null;
  return (
    <span className="phase-tags" style={{display:'inline-flex',gap:5,alignItems:'center',flexShrink:0}}>
      {meta.phase && <span style={{fontSize:10.5,fontWeight:800,letterSpacing:'.02em',padding:'2px 7px',borderRadius:9,background:'#EDEAF7',color:'#5B3FA0'}}>{meta.phase}</span>}
      {loc && <span title={loc.txt} style={{fontSize:10.5,fontWeight:800,letterSpacing:'.02em',padding:'2px 7px',borderRadius:9,background:loc.bg,color:loc.fg,whiteSpace:'nowrap'}}>{loc.ico} {loc.txt}</span>}
    </span>
  );
}
function linkFor(a, mod, studentId) {
  // a.url = la URL real del material en GitHub Pages (se configura por actividad
  // al importar el catálogo). Sin url, el material aún NO está disponible: no
  // generamos enlace para no mandar al alumno a una página inexistente (404).
  if (!a.url) return null;
  const base = a.url;
  // Adjunta la identidad para que jucum-connect.js registre el progreso
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}jucum_uid=${encodeURIComponent(studentId)}&jucum_mod=${encodeURIComponent(mod.id)}&jucum_act=${encodeURIComponent(a.id)}&jucum_kind=${encodeURIComponent(a.type||'')}`;
}

/* ─── Bloque C · gamification components ─── */
function XpCard({ xp, xpInfo, student }) {
  return (
    <div className="gami-card xp-card" style={{background:`linear-gradient(135deg,${xpInfo.tier.bg},#fff)`,borderTopColor:xpInfo.tier.color}}>
      <div className="gami-eyebrow" style={{color:xpInfo.tier.color}}>{xpInfo.tier.emoji} {xpInfo.tier.name.toUpperCase()}</div>
      <div className="xp-level-row">
        <div className="xp-level-badge" style={{background:xpInfo.tier.color}}>
          <span className="xp-lvl-lbl">Nivel</span>
          <span className="xp-lvl-num">{xpInfo.level}</span>
        </div>
        <div className="xp-info">
          <div className="xp-total">{xpInfo.totalXP.toLocaleString()} <span>XP</span></div>
          <div className="xp-meta">{xpInfo.currentXP} / {xpInfo.nextNeeded} para nivel {xpInfo.level + 1}</div>
        </div>
      </div>
      <div className="xp-bar"><div className="xp-fill" style={{width:xpInfo.pct+'%',background:`linear-gradient(90deg,${xpInfo.tier.color},${xpInfo.tier.color}cc)`}}></div></div>
      <div className="xp-pct">{xpInfo.pct}% al siguiente nivel</div>
    </div>
  );
}

function StreakCard({ streak }) {
  const flameSize = streak >= 7 ? 'huge' : streak >= 3 ? 'big' : streak > 0 ? 'med' : 'cold';
  return (
    <div className={`gami-card streak-card s-${flameSize}`}>
      <div className="gami-eyebrow">🔥 Racha activa</div>
      <div className="streak-flame">
        <span className="flame">{streak >= 7 ? '🔥🔥🔥' : streak >= 3 ? '🔥🔥' : streak > 0 ? '🔥' : '❄️'}</span>
      </div>
      <div className="streak-big">{streak}</div>
      <div className="streak-lbl-big">{streak === 1 ? 'día seguido' : 'días seguidos'}</div>
      <div className="streak-tip">
        {streak >= 7 ? '¡Imparable! Sigue así.' :
         streak >= 3 ? '¡Vas muy bien! No la rompas hoy.' :
         streak > 0  ? 'Construye tu hábito día a día.' :
                       'Practica hoy para empezar tu racha.'}
      </div>
    </div>
  );
}

function RankCard({ student, groupName }) {
  const { getComplianceRanking } = window.JUCUM_DATA;
  const ranking = getComplianceRanking(student.group);
  const myRank = ranking.findIndex(r => r.student.id === student.id) + 1;
  const myScore = ranking[myRank - 1]?.score || 0;
  const top5 = ranking.slice(0, 5);
  const medalE = ['🥇','🥈','🥉','🏅','🏅'];
  return (
    <div className="gami-card rank-card">
      <div className="gami-eyebrow">🏅 Top del grupo · constancia</div>
      <div className="rank-mine">
        <div className="rank-mine-pos">#{myRank}</div>
        <div>
          <div className="rank-mine-lbl">Tu cumplimiento</div>
          <div className="rank-mine-xp">{myScore}% de dominio</div>
        </div>
      </div>
      <div className="rank-podium">
        {top5.map((r, i) => (
          <div key={r.student.id} className={`rank-row ${r.student.id===student.id?'me':''}`}>
            <span className="rank-emo">{medalE[i]}</span>
            <span className="rank-name">{r.student.fullName.split(' ')[0]}</span>
            <span className="rank-xp">{r.score}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* PASO 2 · Aviso amable para el alumno: actividades por mejorar (repetir para aprobar).
 * NUNCA muestra el 🚩 rojo (ese es solo del profesor): tono positivo y accionable. */
function ImproveBanner({ student, onGo }) {
  const { getActivitiesToImprove, passThreshold } = window.JUCUM_DATA;
  const items = getActivitiesToImprove ? getActivitiesToImprove(student) : [];
  if (!items.length) return null;
  const thr = passThreshold(student.level, student.group);
  const top = items.slice(0, 3);
  return (
    <div style={{marginTop:18, border:'1px solid #F0C66B', background:'linear-gradient(120deg,#FFF8E8,#FFFdf6)', borderRadius:14, padding:'14px 16px'}}>
      <div style={{display:'flex', alignItems:'center', gap:9, marginBottom:8}}>
        <span style={{fontSize:20}}>🔁</span>
        <div style={{flex:1}}>
          <div style={{fontWeight:800, color:'#9c5d00', fontSize:14.5}}>Tienes {items.length} práctica{items.length===1?'':'s'} por mejorar</div>
          <div style={{fontSize:12.5, color:'#B26A00', fontWeight:600}}>Repítelas para aprobar (umbral {thr}%) y ganar tus puntos completos. ¡Tú puedes! 🌱</div>
        </div>
      </div>
      <div style={{display:'flex', flexDirection:'column', gap:7}}>
        {top.map((it, i) => (
          <button key={i} type="button" onClick={() => onGo && onGo(it)}
            style={{display:'flex', alignItems:'center', gap:10, textAlign:'left', cursor:'pointer', background:'#fff', border:'1px solid #F0C66B', borderRadius:10, padding:'9px 12px', fontFamily:'inherit'}}>
            <span style={{fontSize:16}}>{typeIcon(it.type)}</span>
            <span style={{flex:1, fontWeight:700, fontSize:13, color:'var(--text)'}}>{it.name}</span>
            <span style={{fontSize:11, fontWeight:800, color:'#C0392B', background:'#FDEBEA', padding:'2px 8px', borderRadius:9}}>{it.pct}%</span>
            <span style={{fontSize:11, fontWeight:800, color:'#fff', background:'#F9A825', padding:'3px 10px', borderRadius:13}}>Repetir</span>
          </button>
        ))}
        {items.length > top.length && (
          <div style={{fontSize:12, color:'#B26A00', fontWeight:700, paddingLeft:2}}>+{items.length - top.length} más por mejorar</div>
        )}
      </div>
    </div>
  );
}

function AchievementWarning({ student }) {
  const { getAchievementAlert } = window.JUCUM_DATA;
  const alert = getAchievementAlert(student);
  React.useEffect(() => {
    if (!alert || !window.JUCUM_NOTIF) return;
    const today = new Date().toISOString().slice(0,10);
    const key = 'jucum_ach_warn_' + student.id;
    if (localStorage.getItem(key) === today) return;
    localStorage.setItem(key, today);
    window.JUCUM_NOTIF.pushNotif(student.id, {
      type: 'achievement',
      title: '⚠️ Tus logros están en peligro',
      body: `Hace ${alert.days} días no practicas. ${alert.lost > 0 ? `Ya empezaste a perder ${alert.lost} logro${alert.lost===1?'':'s'}.` : `${alert.atRisk} logro${alert.atRisk===1?'':'s'} en riesgo.`} ¡Practica hoy para recuperarlos!`,
      link: 'dashboard',
    });
  }, [alert && alert.days]);
  if (!alert) return null;
  return (
    <div className="ach-warn">
      <span className="ach-warn-ico">⚠️</span>
      <div className="ach-warn-text">
        <b>Hace {alert.days} días no practicas — tus logros están en peligro.</b>
        {alert.lost > 0
          ? <> Ya empezaste a perder <b>{alert.lost}</b> logro{alert.lost===1?'':'s'} y otros se están debilitando. Practica hoy para recuperarlos — cada día sin practicar pierdes más.</>
          : <> Tienes <b>{alert.atRisk}</b> logro{alert.atRisk===1?'':'s'} debilitándose. Practica hoy y vuelven a brillar.</>}
      </div>
    </div>
  );
}

function MedalShowcase({ student, defs }) {
  const { medalProgress } = window.JUCUM_DATA;
  return (
    <div className="medal-grid">
      {Object.entries(defs).map(([key, def]) => {
        const p = medalProgress(student, key);
        const ringColor = p.lost ? '#C62828' : def.color;
        const ringBg = `conic-gradient(${ringColor} ${p.pct}%, #ECE9E0 ${p.pct}%)`;
        const cls = p.done ? (p.fading ? 'unlocked fading' : 'unlocked') : (p.lost ? 'locked lost' : 'locked');
        return (
          <div key={key} className={`medal ${cls}`}
               style={{'--ring':def.color,'--ringDark':def.colorDark,'--glow':def.glow}}>
            <div className="medal-ring" style={{background:ringBg}}>
              <div className="medal-inner">
                <span className="medal-ico" style={p.done?undefined:{filter:'grayscale(0.7)',opacity:0.5}}>{def.icon}</span>
              </div>
              {p.lost && <span className="medal-risk-badge">⚠️</span>}
            </div>
            <div className="medal-name">{def.name}</div>
            <div className="medal-desc">{def.how}</div>
            {p.done ? (
              p.fading
                ? <div className="medal-rarity" style={{color:'#E65100'}}>⚠️ En riesgo — ¡practica!</div>
                : <div className="medal-rarity done" style={{color:def.colorDark}}>✓ ¡Conseguida!</div>
            ) : p.lost ? (
              <div className="medal-prog">
                <div className="medal-lost-txt">💔 En peligro por no practicar</div>
                <span className="medal-prog-txt">Practica para recuperarla</span>
              </div>
            ) : (
              <div className="medal-prog">
                <div className="medal-prog-bar"><span style={{width:p.pct+'%', background:def.color}}></span></div>
                <span className="medal-prog-txt">{p.current}/{p.goal}{def.unit||''} · te falta {p.remaining}{def.unit||''}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ActivityRow({ act }) {
  const ICONS = { reading:'📖', listening:'🎧', grammar:'📝', story:'📗', achievement:'🏆' };
  const COLORS = { reading:'#1565C0', listening:'#E65100', grammar:'#7B1FA2', story:'#2E7D32', achievement:'#F57C00' };
  return (
    <div className="act-row">
      <div className="act-ico" style={{background:COLORS[act.type]+'22',color:COLORS[act.type]}}>{ICONS[act.type]}</div>
      <div className="act-body">
        <div className="act-line"><b>{act.detail}</b>{act.module && <span className="act-mod"> · {act.module}</span>}</div>
        <div className="act-meta">{act.date}</div>
      </div>
      {act.score !== undefined && (
        <div className={`act-score ${act.score/act.max >= 0.85 ? 'high' : act.score/act.max >= 0.7 ? 'mid' : 'low'}`}>
          {act.score}/{act.max}
        </div>
      )}
    </div>
  );
}

/* Alarma reflexiva (1 vez al día) — inactividad o racha en peligro.
 * Visual rojo + sonido (sounds.js). Mensajes pensados para que el alumno
 * entienda que avanzar/seguir con nosotros depende de SU constancia. */
function StudentAlertModal({ kind, student, onClose }) {
  const data = kind === 'inactive'
    ? {
        ico: '⚠️',
        title: `Hace ${student.lastActiveDays} días que no practicas`,
        body: 'El inglés que ganaste se desvanece sin práctica. Y algo importante: para rendir tu examen de avance de módulo necesitas mantener tu constancia. Si te sigues alejando, no podrás dar tu examen ni continuar avanzando con nosotros. Hoy puedes cambiarlo — bastan 10 minutos para retomar el camino. 💪',
        cta: '🚀 Practicar ahora',
      }
    : {
        ico: '🔥',
        title: `Tu racha de ${student.streak} día${student.streak === 1 ? '' : 's'} está en peligro`,
        body: 'Pasar al siguiente nivel depende de TU práctica constante, no de la suerte. Cada día que practicas te acerca a tu examen; cada día que lo dejas, retrocedes. Si quieres seguir avanzando con nosotros, no sueltes justo hoy: dedícale unos minutos y mantén el fuego encendido. 🔥',
        cta: '✅ No romper mi racha',
      };
  return (
    <div className="onb-backdrop" onClick={onClose}>
      <div className="onb-card" onClick={e => e.stopPropagation()} style={{borderTop:'6px solid #E11930'}}>
        <button className="onb-skip" onClick={onClose}>Cerrar</button>
        <div className="onb-ico" style={{filter:'drop-shadow(0 0 12px rgba(225,25,48,0.55))'}}>{data.ico}</div>
        <div className="onb-title" style={{color:'#C62828'}}>{data.title}</div>
        <div className="onb-body">{data.body}</div>
        <div className="onb-actions">
          <button className="btn-save" onClick={onClose}>{data.cta}</button>
        </div>
      </div>
    </div>
  );
}

function ProgressExplainer({ studentId }) {
  const key = 'jucum_explainer_dismissed_' + studentId;
  const [open, setOpen] = React.useState(false); // por defecto plegado: aparece como enlace discreto
  const [expanded, setExpanded] = React.useState(false);
  if (!open) return (
    <div style={{marginTop:18, textAlign:'right'}}>
      <button className="att-btn" onClick={() => setExpanded(e => !e)} style={{fontSize:12}}>❔ ¿Cómo funciona mi avance?</button>
      {expanded && <div style={{marginTop:8}}><ExplainerBody /></div>}
    </div>
  );
  return (
    <div className="scard" style={{marginTop:18, background:'#FFF8E8', borderColor:'#F4C430'}}>
      <div className="sec-head">
        <div className="sec-title">📣 ¿Cómo crece (o baja) tu avance?</div>
        <button className="modal-close" onClick={() => { try { localStorage.setItem(key, '1'); } catch {} setOpen(false); }}>✕</button>
      </div>
      <ExplainerBody />
      <div style={{marginTop:10, fontSize:12, color:'#7A5C00'}}>Puedes volver a leer esto cuando quieras con el botón “❔ ¿Cómo funciona mi avance?”.</div>
    </div>
  );
}

function ExplainerBody() {
  return (
    <div style={{fontSize:13.5, lineHeight:1.65, color:'var(--text)'}}>
      <p style={{margin:'0 0 10px'}}>Tu <b>barra de avance no es fija: sube y baja según tu constancia.</b> No basta con hacer una actividad una vez — lo que más cuenta es <b>practicar un poco cada día</b>.</p>
      <div style={{display:'grid', gap:8}}>
        <div style={{display:'flex', gap:10, alignItems:'flex-start'}}><span style={{fontSize:18}}>📈</span><div><b>Sube</b> cuando practicas seguido, avanzas en los temas del módulo y entregas tus tareas.</div></div>
        <div style={{display:'flex', gap:10, alignItems:'flex-start'}}><span style={{fontSize:18}}>📉</span><div><b>Baja</b> si dejas de practicar varios días: a los 4 días empieza a bajar, y más aún a los 7 o más.</div></div>
        <div style={{display:'flex', gap:10, alignItems:'flex-start'}}><span style={{fontSize:18}}>🎯</span><div>Para estar <b>listo para tu examen</b> necesitas llegar al <b>75%</b> y haber cubierto la mayoría de los temas — no solo unas pocas actividades.</div></div>
        <div style={{display:'flex', gap:10, alignItems:'flex-start'}}><span style={{fontSize:18}}>🌱</span><div>Empezar un hábito cuesta. Si te cuesta arrancar, hazlo <b>fácil</b>: 10 minutos al día, siempre a la misma hora. ¡Tú puedes!</div></div>
      </div>
    </div>
  );
}

/* Propuesta de práctica del día (genérica o la que dejó el profesor) */
function TodayPracticeCard({ student }) {
  const TT = window.JUCUM_TT; if (!TT) return null;
  const { items, isGeneric } = TT.getTodayPracticeForStudent(student);
  const D = window.JUCUM_DATA;
  const mods = D.MODULE_CATALOG[student.level] || [];
  const dayName = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'][new Date().getDay()];
  if (!items || !items.length) return null;
  return (
    <div className="scard" style={{background:'#F0F7FF', borderColor:'#90CAF9'}}>
      <div className="sec-head">
        <div className="sec-title">🗓️ Tu práctica de hoy</div>
        <span className="sec-meta">{isGeneric ? 'Sugerencia del día' : '⭐ Dejada por tu profesor'} · {dayName}</span>
      </div>
      <div className="next-row">
        {items.map((it, i) => {
          const mod = mods.find(m => m.id === it.moduleId);
          const a = mod && (mod.activities || []).find(x => x.id === it.activityId);
          const href = (mod && a) ? linkFor(a, mod, student.id) : null;
          const inner = (<>
            <span className="next-ico">{typeIcon(it.type)}</span>
            <div className="next-info"><b>{it.label}</b><span>{isGeneric ? 'Recomendado para ti' : 'Indicado por tu profesor'}</span></div>
            {href && <span className="next-arr">→</span>}
          </>);
          return href
            ? <a key={i} className="next-card" href={href}>{inner}</a>
            : <div key={i} className="next-card" style={{cursor:'default'}}>{inner}</div>;
        })}
      </div>
    </div>
  );
}

/* Pantalla amable cuando el alumno aún no tiene grupo/nivel asignado. */
function StudentNoGroup({ onLogout, student }) {
  return (
    <>
      <header className="app-header">
        <div className="app-logo">
          <img src={window.JUCUM_LOGO || 'logo-jucum.png'} alt="JUCUM EC" />
          <div className="pgtitle">Mi panel de aprendizaje</div>
        </div>
        <div className="app-right">
          <span className="role-pill s">🎓 Alumno</span>
          <button className="logout-btn" onClick={onLogout} title="Cerrar sesión">⎂ Salir</button>
        </div>
      </header>
      <main>
        <div className="scard" style={{marginTop:24, textAlign:'center', padding:'44px 24px'}}>
          <div style={{fontSize:52, marginBottom:12}}>🎒</div>
          <div className="sec-title" style={{justifyContent:'center', display:'flex'}}>
            {student && student.fullName ? `¡Hola, ${student.fullName.split(' ')[0]}!` : '¡Hola!'}
          </div>
          <p style={{marginTop:12, color:'var(--text-soft)', maxWidth:460, margin:'12px auto 0', lineHeight:1.6}}>
            Tu cuenta está activa, pero todavía <b>no estás asignado/a a ningún grupo</b>.
            Pídele a tu profesor que te agregue a tu grupo para ver tus módulos y
            empezar a practicar. 🌱
          </p>
        </div>
      </main>
    </>
  );
}

/* Une "¿Cómo voy?" + "Mi reporte" en una sola entrada con sub-pestañas. */
function StudentAvance({ user, student, onBack }) {
  const [tab, setTab] = React.useState('diag');
  const tabs = (
    <div className="mm-tabs" style={{margin:'0 0 4px'}}>
      <button className={`mm-tab ${tab==='diag'?'on':''}`} onClick={()=>setTab('diag')}>📈 ¿Cómo voy?</button>
      <button className={`mm-tab ${tab==='report'?'on':''}`} onClick={()=>setTab('report')}>📄 Mi reporte</button>
    </div>
  );
  return tab === 'diag'
    ? <StudentDiagnosis user={user} onBack={onBack} topTabs={tabs} />
    : <StudentReport student={student} onBack={onBack} topTabs={tabs} />;
}

/* Sección plegable reutilizable — agrupa lo secundario sin saturar el panel. */
function Collapsible({ title, meta, defaultOpen, children }) {
  const [open, setOpen] = React.useState(!!defaultOpen);
  return (
    <div className="collapse" style={{marginTop:18}}>
      <button type="button" className="collapse-head" onClick={() => setOpen(o => !o)}>
        <span className="collapse-title">{title}</span>
        {meta && <span className="collapse-meta">{meta}</span>}
        <span className={`collapse-arr ${open ? 'open' : ''}`}>▾</span>
      </button>
      {open && <div className="collapse-body">{children}</div>}
    </div>
  );
}

Object.assign(window, { StudentDashboard, DirectedPracticeCard, ActivityRow, DailyRing, ModuleProgress, XpCard, StreakCard, RankCard, MedalShowcase, AchievementWarning, ImproveBanner, StudentAlertModal, ProgressExplainer, ExplainerBody, TodayPracticeCard, Collapsible, StudentAvance, StudentNoGroup });
