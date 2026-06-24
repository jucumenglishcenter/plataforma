/* Student dashboard — Bloque A · with active module + daily target + activity checklist */

/* ════════ Recordatorio suave de vocabulario (2–3x al día · ≤5 min) ════════
 * Krashen/decisión del teacher: el vocabulario se asienta con repasos cortos y
 * frecuentes. NO es obligatorio ni bloquea nada — un empujón amable, descartable
 * por hoy, con acceso directo al Quizlet del módulo activo. */
function VocabReminder({ student, settings, onGo }) {
  const D = window.JUCUM_DATA;
  const today = new Date().toISOString().slice(0, 10);
  const dismissKey = `jucum_vocab_dismiss_${student.id}_${today}`;
  const [hidden, setHidden] = React.useState(() => { try { return localStorage.getItem(dismissKey) === '1'; } catch { return false; } });
  if (hidden) return null;
  // módulo activo → su actividad de vocabulario (quizlet)
  const mods = D.MODULE_CATALOG[student.level] || [];
  const activeIds = (settings && (settings.activeModuleIds || (settings.activeModuleId ? [settings.activeModuleId] : []))) || [];
  const mod = mods.find(m => activeIds.includes(m.id)) || mods[0];
  const vocab = mod && (mod.activities || []).find(a => a.type === 'quizlet');
  if (!mod || !vocab) return null;
  const dismiss = () => { try { localStorage.setItem(dismissKey, '1'); } catch {} setHidden(true); };
  return (
    <div className="scard" style={{marginTop:18, padding:0, overflow:'hidden', borderColor:'#CDB8E6'}}>
      <div style={{display:'flex', alignItems:'center', gap:12, padding:'13px 15px', background:'#F4EEFB'}}>
        <span style={{fontSize:22, flexShrink:0}}>🗂️</span>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:14.5, color:'#4A2E73'}}>Vocabulario del día</div>
          <div style={{fontSize:12, color:'#6b6453', fontWeight:700, marginTop:1, lineHeight:1.4}}>Repásalo <b>2–3 veces al día</b>, 5 minutos cada vez. Corto y frecuente = se queda. 🧠</div>
        </div>
        <button type="button" onClick={() => onGo(vocab, mod)} style={{flexShrink:0, border:'none', cursor:'pointer', fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:13, color:'#fff', background:'linear-gradient(135deg,#8B5FBF,#6C4FB0)', borderRadius:12, padding:'9px 15px', whiteSpace:'nowrap'}}>Repasar · 5 min →</button>
        <button type="button" onClick={dismiss} title="Ocultar por hoy" aria-label="Ocultar por hoy" style={{flexShrink:0, border:'none', background:'none', cursor:'pointer', color:'#9C8FB5', fontSize:18, lineHeight:1, padding:'4px 2px'}}>×</button>
      </div>
    </div>
  );
}

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
  const [view, setView] = React.useState(() => (window.JUCUM_NAV ? window.JUCUM_NAV.load('student', 'dashboard') : 'dashboard'));
  React.useEffect(() => { if (window.JUCUM_NAV) window.JUCUM_NAV.save('student', view); }, [view]);
  const [showOnb, setShowOnb] = React.useState(() => !localStorage.getItem(`jucum_onboarded_${user.studentId}`));
  const [surveyDue, setSurveyDue] = React.useState(false);
  React.useEffect(() => {
    try { if (window.JUCUM_SURVEY) setSurveyDue(window.JUCUM_SURVEY.isSurveyDue(student)); } catch {}
  }, [student && student.id]);
  const [alertKind, setAlertKind] = React.useState(null);
  // PASO 3 · explicación al bajar (solo en una caída real corregible)
  const [dropExp, setDropExp] = React.useState(null);
  React.useEffect(() => {
    try {
      const D = window.JUCUM_DATA;
      const e = D.getDropExplanation(student);
      if (e) setDropExp(e); else D.ackDropExplanation(student);
    } catch {}
  }, [student.id]);
  const [fTick, setFTick] = React.useState(0);
  React.useEffect(() => {
    const onStorage = (e) => { if (e.key && (e.key.startsWith('jucum_forum') || e.key.startsWith('jucum_likes'))) setFTick(t => t + 1); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  // Avance en vivo: al volver a la pestaña (o cada 20 s) releemos SOLO el avance
  // de la nube — así lo que el alumno acaba de practicar en otra pestaña aparece
  // como completado y sus puntos suben sin recargar toda la plataforma.
  const [, setPTick] = React.useState(0);
  React.useEffect(() => {
    if (!window.JUCUM_SYNC || !window.JUCUM_SYNC.refreshProgress) return;
    let alive = true;
    const refresh = () => window.JUCUM_SYNC.refreshProgress().then(ok => { if (ok && alive) setPTick(t => t + 1); }).catch(() => {});
    refresh();
    const onVis = () => { if (document.visibilityState === 'visible') refresh(); };
    const iv = setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 20000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVis);
    return () => { alive = false; clearInterval(iv); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', onVis); };
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
      {!showOnb && !celebrate && !alertKind && dropExp && <DropExplainModal exp={dropExp} student={student} onClose={() => { try { window.JUCUM_DATA.ackDropExplanation(student); } catch {} setDropExp(null); }} onGo={() => { setDropExp(null); setView('dashboard'); }} />}
      <header className="app-header">
        <div className="app-logo">
          <img src={window.JUCUM_LOGO || 'logo-jucum.png'} alt="JUCUM EC" />
          <div className="pgtitle">Mi panel de aprendizaje</div>
        </div>
        <div className="app-right">
          <span className="role-pill s">🎓 Alumno</span>
          <a className={`nav-link ${view==='practica'?'active':''}`} href="#" onClick={(e)=>{e.preventDefault();setView('practica');}}>📚 Mi práctica</a>
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
      ) : view === 'practica' ? (
        <StudentPractice student={student} settings={settings} onBack={() => setView('dashboard')} />
      ) : (
      <main>
        <div className="welcome" data-level={student.level} style={{background:'linear-gradient(135deg,'+level.color+','+level.dark+')'}}>
          <div className="welcome-text">
            <div className="eyebrow" style={{color:'#fff', opacity:1, textShadow:'0 1px 3px rgba(0,0,0,.4)'}}>{level.emoji} {level.code} · {group.name}</div>
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

        {/* — Neuro + (Racha fusionada con Meta de hoy) — */}
        <div className="two-col" style={{gridTemplateColumns:'1.4fr 1fr', marginTop:18}}>
          <MascotCard student={student} />
          <DayCard student={student} streak={student.streak} todayMin={todayMin} target={targetMin} />
        </div>

        {/* — Campeones de la semana (protagonista) + Top del grupo (simple) — */}
        <div className="two-col" style={{gridTemplateColumns:'1.35fr 1fr', marginTop:18}}>
          <WeekChampionsCard student={student} />
          <GroupTopSimple student={student} onSeeTop={() => setView('practica')} />
        </div>

        {/* — CTA: todo el material vive en "Mi práctica" — */}
        <button type="button" onClick={() => setView('practica')} style={{marginTop:18, width:'100%', border:'none', cursor:'pointer', fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:20, color:'#fff', background:'linear-gradient(135deg,#F4A02C,#E07A12)', borderRadius:18, padding:18, display:'flex', alignItems:'center', justifyContent:'center', gap:12, boxShadow:'0 10px 24px rgba(224,122,18,.32)'}}>▶ Empieza a practicar →</button>
        <div style={{textAlign:'center', fontSize:12, color:'var(--text-mute,#A8A8A8)', fontWeight:700, marginTop:9}}>Todo tu material y tus repasos de hoy en un solo lugar</div>

        {/* ── Recordatorio suave de vocabulario (2–3x al día) ── */}
        <VocabReminder student={student} settings={settings} onGo={(vocab, mod) => {
          const href = vocab && vocab.url ? linkFor(vocab, mod, student.id) : null;
          if (href) window.location.href = href; else setView('practica');
        }} />

        {/* ── Motivación: no pierdas tu avance ── */}
        <AchievementWarning student={student} />

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
              // Resúmenes/Quizlet = baja exigencia: hechos cuentan como ✓ (no se exige umbral)
              const lowStakes = a.type === 'summary' || a.type === 'quizlet';
              const passed = done ? (D.entryPassed(done, lvl, grp) || lowStakes) : false;
              const prevDone = i === 0 || progress.completed[`${mod.id}:${mod.activities[i-1].id}`];
              const teacherOpen = freeUnlock || unlockMode === 'free' ||
                (unlockMode === 'custom' && enabledSet.has(`${mod.id}:${a.id}`));
              const alwaysOpen = a.open === true; // marcado en el catálogo ("open": true)
              const locked = !done && !prevDone && !teacherOpen && !alwaysOpen;
              // PASO 5 · ★ estructura latente: aprobó la previa pero el Transform madura con reposo
              const lg = D.latentGate(mod, a, i, progress, lvl);
              const latentLocked = !done && !teacherOpen && lg.latent && !lg.ready && prevDone;
              // PASO 2 · hecho pero bajo el umbral → "a mejorar" (redo), no cuenta como ✓
              const status = done ? (passed ? 'done' : 'redo') : latentLocked ? 'latent' : locked ? 'locked' : 'open';
              return { a, i, done, passed, status, latent: latentLocked ? lg : null };
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

/* Juegos de Quizlet de una actividad quizlet, leídos del catálogo.
 * Links opcionales: quizVocabulario · quizVocabulario2 · quizTraducir · quizOrdenar.
 * Solo se muestran los que tengan link. Si hay 2 vocabularios → 4 opciones. */
function quizletGames(a) {
  const defs = [
    { key:'vocabulario',  ico:'📚', label:'Vocabulario',           sub:'Tarjetas · aprende las palabras', url:a.quizVocabulario },
    { key:'vocabulario2', ico:'📒', label:'Vocabulario · Parte 2', sub:'Tarjetas · segunda mitad',        url:a.quizVocabulario2 },
    { key:'traducir',     ico:'🔁', label:'Traducir',              sub:'EN ↔ ES · empareja',              url:a.quizTraducir },
    { key:'ordenar',      ico:'🔢', label:'Ordenar',               sub:'Arma la oración',                 url:a.quizOrdenar },
  ];
  // Compatibilidad: si solo existe a.url (un único link), trátalo como Vocabulario.
  if (!defs.some(g => g.url) && a.url) defs[0].url = a.url;
  const games = defs.filter(g => g.url);
  // Con 2 vocabularios, renombra el primero a "Parte 1".
  if (games.some(g => g.key === 'vocabulario2')) {
    const g1 = games.find(g => g.key === 'vocabulario');
    if (g1) { g1.label = 'Vocabulario · Parte 1'; g1.sub = 'Tarjetas · primera mitad'; }
  }
  return games;
}

/* Bloque Quizlet del alumno · se toca y abre un panel con los juegos disponibles.
 * Abrir cualquier juego cuenta como participación ✓ (baja exigencia, no califica). */
function QuizletRow({ it, mod, studentId }) {
  const { a, i, done, status } = it;
  const [open, setOpen] = React.useState(false);
  const games = quizletGames(a);

  if (status === 'locked') {
    return (
      <div className="al-item locked" style={{cursor:'default'}}>
        <span className="al-num">🔒</span>
        <span className="al-ico">🃏</span>
        <span className="al-name">{a.name}</span>
      </div>
    );
  }
  if (games.length === 0) {
    return (
      <div className="al-item open" style={{opacity:.65, cursor:'default'}} title="Aún no se han cargado los links de Quizlet. Pronto los activaremos.">
        <span className="al-num">{i+1}</span>
        <span className="al-ico">🃏</span>
        <span className="al-name">{a.name}</span>
        <span className="al-score" style={{background:'#EEEAE0', color:'#8A7F6A'}}>📚 En preparación</span>
      </div>
    );
  }
  const openGame = (g) => {
    try { window.JUCUM_DATA.markActivityComplete(studentId, mod.id, a.id, null, 0, { quizlet: g.key }); } catch (e) {}
    window.open(g.url, '_blank', 'noopener');
    setOpen(false);
  };
  return (
    <>
      <div className={`al-item ${status==='done'?'done':'open'}`} onClick={() => setOpen(o => !o)} style={{cursor:'pointer'}}>
        <span className="al-num">{status==='done' ? '✓' : '🃏'}</span>
        <span className="al-ico">🃏</span>
        <span className="al-name">{a.name}<span style={{display:'block', fontSize:10.5, color:'var(--ld)', fontWeight:800, marginTop:1}}>Toca para elegir el juego</span></span>
        <span className="al-score" style={{background:'var(--ll)', color:'var(--lbt)', border:'1.5px solid var(--lm)'}}>{games.length} juego{games.length>1?'s':''}</span>
        <span className="al-arr">{open ? '▾' : '→'}</span>
      </div>
      {open && (
        <div style={{background:'#fff', border:'1.5px solid var(--lm)', borderRadius:14, boxShadow:'var(--shadow-sm)', overflow:'hidden', margin:'2px 0 4px'}}>
          <div style={{background:'var(--lg)', color:'#fff', padding:'10px 14px', display:'flex', alignItems:'center', gap:9}}>
            <span style={{fontSize:18}}>🃏</span>
            <div><div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:14}}>Quizlet · elige el juego</div><div style={{fontSize:11, opacity:.92, fontWeight:700}}>{a.name.replace(/^Quizlet\s*·?\s*/i,'') || 'Vocabulario'}</div></div>
          </div>
          <div style={{padding:11, display:'flex', flexDirection:'column', gap:8}}>
            {games.map(g => (
              <button key={g.key} type="button" onClick={() => openGame(g)}
                style={{display:'flex', alignItems:'center', gap:12, textAlign:'left', cursor:'pointer', border:'1.5px solid var(--lm)', background:'var(--ll)', borderRadius:10, padding:'11px 13px', font:'inherit', width:'100%'}}>
                <span style={{fontSize:21}}>{g.ico}</span>
                <span style={{flex:1, fontWeight:800, fontSize:13.5, color:'var(--ld)'}}>{g.label}<span style={{display:'block', fontSize:11, color:'var(--text-soft)', fontWeight:700, marginTop:1}}>{g.sub}</span></span>
                <span style={{color:'var(--lp)', fontWeight:900, fontSize:15}}>▸</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function ChecklistRow({ it, mod, studentId }) {
  const { a, i, done, passed, status } = it;
  // Quizlet: en vez de un link directo, abre un panel con sus juegos.
  if (a.type === 'quizlet') return <QuizletRow it={it} mod={mod} studentId={studentId} />;
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
  // PASO 5 · ★ estructura latente — aprobó la previa, pero esta práctica madura con reposo
  if (status === 'latent') {
    const li = it.latent || {};
    return (
      <div className="al-item" style={{cursor:'default', background:'#F1FBF4', borderColor:'#BFE6CB'}}
           title={`Estructura que se asienta mejor con reposo. Se activará ${li.availableOn ? 'el ' + li.availableOn : 'pronto'}.`}>
        <span className="al-num" style={{background:'#E3F4E8', color:'#2E7D32', borderColor:'#A5D6A7'}}>🌱</span>
        <span className="al-ico">{typeIcon(a.type)}</span>
        <span className="al-name">{a.name}</span>
        <PhaseTags a={a} />
        <span className="al-score" style={{background:'#E3F4E8', color:'#2E7D32', whiteSpace:'nowrap'}}>🌱 {li.daysLeft != null ? `en ${li.daysLeft} día${li.daysLeft===1?'':'s'}` : 'madurando'}</span>
      </div>
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
  const [open, setOpen] = React.useState(false); // solo aparece el tema; el alumno hace clic para ver sus actividades
  return (
    <div className={`tg ${allDone ? 'tg-done' : ''}`}>
      <button type="button" className="tg-head" onClick={() => setOpen(!open)}>
        <span className={`tg-num ${allDone ? 'done' : ''}`}>{allDone ? '✓' : num}</span>
        <span className="tg-tema">Tema</span>
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

function StreakCard({ streak, student }) {
  const flameSize = streak >= 7 ? 'huge' : streak >= 3 ? 'big' : streak > 0 ? 'med' : 'cold';
  const best = (student && window.JUCUM_DATA.getBestStreak) ? window.JUCUM_DATA.getBestStreak(student) : 0;
  const toBeat = best > streak ? best - streak : 0;
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
      {best > 0 && (
        <div style={{marginTop:12, display:'flex', alignItems:'center', gap:10, background:'#FFF8EC', border:'1px solid #F3DFB6', borderRadius:12, padding:'10px 13px'}}>
          <span style={{fontSize:20}}>🏆</span>
          <div style={{flex:1, textAlign:'left'}}>
            <div style={{fontSize:12.5, fontWeight:800, color:'#9c5d00'}}>Tu récord: {best} {best===1?'día':'días'}</div>
            <div style={{fontSize:11.5, color:'#B26A00', fontWeight:700}}>{toBeat > 0 ? `Te faltan ${toBeat} para superarlo · ¡tú puedes!` : '¡Estás en tu mejor racha! 🎉'}</div>
          </div>
        </div>
      )}
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

/* PASO 3 · Repaso espaciado — tarjetas "🔁 Repaso de hoy" + resultado antes→ahora.
 * Estilo morado del repaso (coherente con la demo aprobada). */
function ReviewSection({ student }) {
  const D = window.JUCUM_DATA;
  const { MODULE_CATALOG } = D;
  const due = D.getDueReviews ? D.getDueReviews(student) : [];
  const [result, setResult] = React.useState(() => D.getLastReviewResult ? D.getLastReviewResult(student) : null);
  if (!due.length && !result) return null;

  const goReview = (it) => {
    const mod = (MODULE_CATALOG[student.level] || []).find(m => m.id === it.moduleId);
    const a = mod && (mod.activities || []).find(x => x.id === it.activityId);
    const href = a ? linkFor(a, mod, student.id) : null;
    if (href) window.location.href = href;
  };
  const dismissResult = () => {
    if (result) D.markReviewResultSeen(student.id, result.moduleId, result.activityId);
    setResult(null);
  };

  return (
    <div className="scard" style={{padding:0, overflow:'hidden', borderColor:'#C3B4E4'}}>
      <div style={{padding:'12px 15px', display:'flex', alignItems:'center', gap:11, background:'#EFEAF9', borderBottom:'1px solid #D9CEEC'}}>
        <span style={{fontSize:20}}>🧠</span>
        <div style={{flex:1, fontSize:12.8, fontWeight:700, color:'#5B3FA0', lineHeight:1.4}}>Repásalo antes de que se enfríe — la <b>curva del olvido</b> lo trae de vuelta justo a tiempo</div>
        <span style={{fontSize:11, fontWeight:700, color:'#7E6CA8', whiteSpace:'nowrap'}}>Curva del olvido</span>
      </div>
      <div style={{padding:'12px 13px', display:'flex', flexDirection:'column', gap:9}}>

      {result && (() => {
        const up = result.dir === 'up', flat = result.dir === 'flat';
        const col = up ? '#2EA84B' : flat ? '#7a7466' : '#C0392B';
        const bg = up ? '#E8F5E9' : flat ? '#F4F2EA' : '#FEF1EF';
        const bd = up ? '#A5D6A7' : flat ? '#E3DDD0' : '#F1B0AA';
        const fromA = result.total ? Math.round(result.prevPct/100*result.total)+'/'+result.total : result.prevPct+'%';
        const toA = result.total ? Math.round(result.currPct/100*result.total)+'/'+result.total : result.currPct+'%';
        const label = up ? `Mejoró (+${result.delta} acierto${result.delta===1?'':'s'})` : flat ? 'Se mantiene' : `Bajó (${result.delta})`;
        return (
          <div style={{border:'1px solid '+bd, background:bg, borderRadius:11, padding:'13px 15px'}}>
            <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:10}}>
              <span style={{fontSize:18}}>{up ? '✅' : flat ? '➡️' : '⚠️'}</span>
              <div style={{flex:1, fontWeight:800, fontSize:14, color:'var(--text)'}}>{result.name} — {label}</div>
              <button type="button" onClick={dismissResult} style={{border:'none', background:'transparent', cursor:'pointer', fontSize:18, color:'#9a9a9a', lineHeight:1}}>✕</button>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:12, flexWrap:'wrap'}}>
              <span style={{fontSize:12, fontWeight:800, color:'var(--text-soft, #6B6B6B)'}}>Antes</span>
              <span style={{fontFamily:"'Fredoka',sans-serif", fontWeight:700, fontSize:20, color:'#A8A8A8', textDecoration:'line-through'}}>{fromA}</span>
              <span style={{fontSize:18, color:col}}>→</span>
              <span style={{fontSize:12, fontWeight:800, color:'var(--text-soft, #6B6B6B)'}}>Ahora</span>
              <span style={{fontFamily:"'Fredoka',sans-serif", fontWeight:700, fontSize:20, color:col}}>{toA}</span>
              <span style={{marginLeft:'auto', fontSize:13, fontWeight:800, color:'#fff', background:col, padding:'4px 12px', borderRadius:16}}>{up?'+':''}{result.delta} {up?'↑':flat?'→':'↓'}</span>
            </div>
            {!up && !flat && <div style={{marginTop:9, fontSize:12.5, color:'#A33227', fontWeight:600}}>Lo reprogramamos <b>más pronto</b> (en 3 días) para reforzarlo.</div>}
          </div>
        );
      })()}

        {due.map((it, i) => (
          <button key={i} type="button" onClick={() => goReview(it)} className="al-item open" style={{width:'100%', textAlign:'left', font:'inherit', cursor:'pointer'}}>
            <span className="al-num" style={{background:'#EEE7F9', color:'#6C4FB0', borderColor:'#D6C9EC'}}>🔁</span>
            <span className="al-ico">{typeIcon(it.type)}</span>
            <span className="al-name">{it.name}<span style={{display:'block', fontSize:11, fontWeight:700, color:'var(--text-soft)', marginTop:1}}>{it.daysAgo != null ? `Hace ${it.daysAgo} día${it.daysAgo===1?'':'s'}` : 'Toca repasar'} · {it.refTotal ? Math.round(it.refPct/100*it.refTotal)+'/'+it.refTotal : it.refPct+'%'} · a ver si lo mantienes</span></span>
            <span className="al-score" style={{background:'#EEE7F9', color:'#6C4FB0'}}>{it.overdue > 1 ? `Hace ${it.overdue}d` : 'Hoy'}</span>
            <span className="al-arr">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* PASO 3 · Modal "tu posición cambió" — tono positivo 🌱, solo en caída real. */
function DropExplainModal({ exp, student, onClose, onGo }) {
  const n = exp.toImprove || 0;
  const why = exp.init
    ? <>Ahora una práctica solo suma cuando la <b>apruebas</b> (no solo por hacerla).{n>0 && <> Tienes <b>{n} práctica{n===1?'':'s'} por debajo del nivel</b>, así que tu avance se ajustó.</>}</>
    : exp.reasons.includes('passed')
      ? <>Ahora una práctica solo cuenta cuando la <b>apruebas</b>.{n>0 && <> Tienes <b>{n} por debajo del nivel</b>,</>} por eso tu avance bajó.</>
      : exp.reasons.includes('band')
        ? <>Tu dominio pasó de <b>{exp.fromBand}</b> a <b>{exp.toBand}</b>. Con repaso lo recuperas.</>
        : <>Dejaste de practicar y perdiste algún logro. Se recupera practicando.</>;
  return (
    <div style={{position:'fixed', inset:0, background:'rgba(20,36,89,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:120, padding:20}} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{maxWidth:380, width:'100%', background:'#fff', borderRadius:22, overflow:'hidden', boxShadow:'0 20px 50px rgba(31,58,138,.3)'}}>
        <div style={{height:30, background:'#152459'}}></div>
        <div style={{padding:'24px 22px 22px', textAlign:'center'}}>
          <div style={{fontSize:42}}>🌱</div>
          <h3 style={{fontFamily:"'Fredoka',sans-serif", fontSize:19, margin:'10px 0 0'}}>Tu posición cambió</h3>
          <div style={{margin:'14px 0', background:'#FEF1EF', border:'1px solid #F1B0AA', borderRadius:12, padding:'13px 15px', textAlign:'left', fontSize:13, color:'#A33227', lineHeight:1.5}}>
            <b>¿Por qué?</b> {why}
          </div>
          <div style={{background:'#E8F5E9', border:'1px solid #A5D6A7', borderRadius:12, padding:'13px 15px', textAlign:'left', fontSize:13, color:'#1B5E20', lineHeight:1.5, marginBottom:16}}>
            <b>¿Cómo recuperarte?</b> {n>0 ? <>Repite {n>1?'esas '+n:'esa'} práctica{n===1?'':'s'} hasta aprobarla{n===1?'':'s'} y haz tus repasos del día. En cuanto suban tus notas, <b>vuelves a subir</b>. 💪</> : <>Sigue practicando y haz tus repasos del día. Tu avance se recupera solo. 💪</>}
          </div>
          <button type="button" onClick={onGo} style={{width:'100%', fontFamily:'inherit', fontWeight:800, fontSize:15, border:'none', borderRadius:24, padding:13, background:'#1F3A8A', color:'#fff', cursor:'pointer'}}>Lo entendí · Voy a mejorar</button>
          <div style={{fontSize:11.5, color:'#A8A8A8', marginTop:10}}>Este aviso solo aparece cuando tu posición baja de verdad.</div>
        </div>
      </div>
    </div>
  );
}

/* ════════ PASO 4 · Anillo de meta compacto (encabezado de Mi práctica) ════════ */
function MiniRing({ done, target }) {
  const pct = Math.min(100, Math.round((done / Math.max(1, target)) * 100));
  const C = 113, off = C * (1 - Math.min(1, done / Math.max(1, target)));
  const met = done >= target;
  return (
    <div style={{display:'flex', alignItems:'center', gap:10, background:'#fff', border:'1px solid var(--border)', borderRadius:14, padding:'8px 13px'}}>
      <div style={{position:'relative', width:42, height:42}}>
        <svg width="42" height="42" style={{transform:'rotate(-90deg)'}}>
          <circle cx="21" cy="21" r="18" fill="none" stroke="#ECE9E0" strokeWidth="6"></circle>
          <circle cx="21" cy="21" r="18" fill="none" stroke="#2EA84B" strokeWidth="6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off}></circle>
        </svg>
        <span style={{position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:met?15:12, fontWeight:800, color:'#1B5E20', fontFamily:"'Fredoka',sans-serif"}}>{met ? '✓' : done + "'"}</span>
      </div>
      <div>
        <b style={{fontSize:13, fontFamily:"'Fredoka',sans-serif", color:'#1B5E20', display:'block', lineHeight:1}}>{done} min</b>
        <span style={{fontSize:10.5, fontWeight:800, color:'var(--text-mute,#A8A8A8)', textTransform:'uppercase'}}>{met ? 'meta de hoy ✓' : (target - done) + ' min restantes'}</span>
      </div>
    </div>
  );
}

/* ════════ Liga semanal + tarjetas del panel rediseñado ════════ */
const LG_SCENES = {
  'theme-gold': 'repeating-conic-gradient(from 0deg at 50% -4%, rgba(255,214,120,.16) 0deg 6deg, transparent 6deg 14deg), radial-gradient(circle at 50% -8%, rgba(255,216,110,.7), transparent 56%), linear-gradient(160deg,#6E5214,#2C2006)',
  'theme-mountains': 'radial-gradient(ellipse 85% 46% at 16% 118%, #34204C 0 70%, transparent 71%), radial-gradient(ellipse 78% 44% at 86% 115%, #5A386F 0 70%, transparent 71%), radial-gradient(circle at 50% 50%, #FFE7A8 0 6%, rgba(255,180,120,.55) 7%, transparent 17%), linear-gradient(180deg,#FF9266 0%,#FF6F9C 42%,#7A4D9E 100%)',
  'theme-night': 'radial-gradient(ellipse 95% 34% at 50% 126%, #131132 0 72%, transparent 73%), radial-gradient(1.4px 1.4px at 18% 26%, #fff, transparent), radial-gradient(1.6px 1.6px at 62% 15%, #fff, transparent), radial-gradient(1.3px 1.3px at 80% 33%, #cfe, transparent), radial-gradient(1.6px 1.6px at 38% 20%, #fff, transparent), radial-gradient(1.3px 1.3px at 28% 44%, #fff, transparent), radial-gradient(circle at 76% 24%, #FBF4D0 0 5%, rgba(251,244,208,.35) 6%, transparent 13%), linear-gradient(180deg,#23266C 0%,#0B0B24 100%)',
  'theme-aurora': 'radial-gradient(ellipse 95% 34% at 50% 122%, #06131C 0 72%, transparent 73%), radial-gradient(ellipse 52% 42% at 26% 4%, rgba(80,240,180,.55), transparent 60%), radial-gradient(ellipse 46% 40% at 74% 12%, rgba(130,140,255,.5), transparent 60%), radial-gradient(ellipse 42% 32% at 50% 0%, rgba(120,255,210,.4), transparent 60%), linear-gradient(180deg,#0C3242 0%,#07151F 100%)',
  'theme-ocean': 'radial-gradient(ellipse 130% 30% at 50% 130%, rgba(120,225,255,.55) 0 60%, transparent 61%), radial-gradient(ellipse 130% 26% at 50% 119%, rgba(70,180,235,.5) 0 60%, transparent 61%), radial-gradient(circle at 50% 28%, rgba(255,240,200,.65) 0 5%, transparent 15%), linear-gradient(180deg,#0E6CA0 0%,#062236 100%)',
  'theme-party': 'radial-gradient(3px 3px at 12% 20%, #FFD54F, transparent), radial-gradient(3px 3px at 30% 52%, #FF6F9C, transparent), radial-gradient(3px 3px at 52% 14%, #5AD6FF, transparent), radial-gradient(3px 3px at 70% 40%, #7CFFB2, transparent), radial-gradient(3px 3px at 86% 22%, #FFB347, transparent), radial-gradient(3px 3px at 22% 78%, #C78BFF, transparent), radial-gradient(3px 3px at 64% 74%, #FF8AD0, transparent), radial-gradient(3px 3px at 90% 64%, #9CFF7C, transparent), linear-gradient(160deg,#2A2F86,#15184A)',
};
const LG_SCENE_META = [['theme-gold','🏆','Oro'],['theme-mountains','🏔️','Montañas'],['theme-night','🌙','Noche'],['theme-aurora','🌌','Aurora'],['theme-ocean','🌊','Océano'],['theme-party','🎉','Fiesta']];
const LG_EMOJIS = [['🦁','León'],['🦊','Zorro'],['🐯','Tigre'],['🐼','Panda'],['🦄','Unicornio'],['🐲','Dragón'],['🦅','Águila'],['🦉','Búho'],['🐙','Pulpo'],['🦖','Dino'],['🐧','Pingüino'],['🐺','Lobo'],['🦋','Mariposa'],['🐬','Delfín'],['🦈','Tiburón'],['🐝','Abeja'],['🚀','Cohete'],['⚡','Rayo'],['🔥','Fuego'],['🌟','Estrella'],['👑','Corona'],['💎','Diamante'],['🎯','Diana'],['🏆','Trofeo']];
const LG_AVA = {1:{a:58,e:30,b:60,bg:'linear-gradient(#F4B400,#D49A00)',ab:'#C99700',ring:'0 0 0 4px rgba(244,180,0,.35),0 4px 14px rgba(0,0,0,.3)'},2:{a:46,e:23,b:46,bg:'linear-gradient(#B8BCC4,#8E939C)',ab:'#8E939C',ring:'0 3px 10px rgba(0,0,0,.25)'},3:{a:44,e:22,b:34,bg:'linear-gradient(#D98C4A,#B06A2C)',ab:'#B06A2C',ring:'0 3px 10px rgba(0,0,0,.25)'}};
const lgIni = (s) => (s.fullName || '?').split(' ').map(w => w[0]).slice(0,2).join('');

/* Fusión Racha (protagonista) + Meta de hoy (secundaria) */
function DayCard({ student, streak, todayMin, target }) {
  const D = window.JUCUM_DATA;
  const best = (student && D.getBestStreak) ? D.getBestStreak(student) : 0;
  const toBeat = best > streak ? best - streak : 0;
  const flame = streak>=7?'🔥🔥🔥':streak>=3?'🔥🔥':streak>0?'🔥':'❄️';
  const met = todayMin>=target;
  const pct = Math.min(100, Math.round(todayMin/Math.max(1,target)*100));
  const tip = streak>=7?'¡Imparable! Sigue así.':streak>=3?'¡Vas muy bien! No la rompas hoy.':streak>0?'Construye tu hábito día a día.':'Practica hoy para empezar tu racha.';
  return (
    <div className="scard" style={{borderTop:'4px solid #F4B400', display:'flex', flexDirection:'column'}}>
      <div style={{textAlign:'center', fontSize:10.5, fontWeight:800, letterSpacing:'.08em', textTransform:'uppercase', color:'#C28A00'}}>🔥 Tu constancia</div>
      <div style={{fontSize:30, textAlign:'center', lineHeight:1, marginTop:4}}>{flame}</div>
      <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:700, fontSize:52, color:'#E58A00', textAlign:'center', lineHeight:.95}}>{streak}</div>
      <div style={{textAlign:'center', fontWeight:800, color:'#B26A00', fontSize:13, marginTop:2}}>{streak===1?'día seguido':'días seguidos'}</div>
      <div style={{textAlign:'center', fontSize:12, fontWeight:700, color:'var(--text-soft,#6B6B6B)', marginTop:8}}>{tip}</div>
      {best>0 && <div style={{display:'flex',alignItems:'center',gap:9,background:'#FFF8EC',border:'1px solid #F3DFB6',borderRadius:11,padding:'8px 11px',marginTop:12}}>
        <span style={{fontSize:19}}>🏆</span>
        <div style={{flex:1,textAlign:'left'}}><div style={{fontSize:12,fontWeight:800,color:'#9c5d00'}}>Tu récord: {best} {best===1?'día':'días'}</div>
        <div style={{fontSize:11,color:'#B26A00',fontWeight:700}}>{toBeat>0?`Te faltan ${toBeat} para superarlo · ¡tú puedes!`:'¡Estás en tu mejor racha! 🎉'}</div></div>
      </div>}
      <div style={{marginTop:13, borderTop:'1px dashed var(--border)', paddingTop:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:12,fontWeight:800,marginBottom:6}}>
          <span style={{color:'#1B5E20'}}>🎯 Meta de hoy</span><span style={{color:'#1B5E20'}}>{todayMin} / {target} min</span>
        </div>
        <div style={{height:11,background:'#E9EFE9',borderRadius:7,overflow:'hidden'}}><span style={{display:'block',height:'100%',width:pct+'%',background:'linear-gradient(90deg,#43C463,#2EA84B)',borderRadius:7}}></span></div>
        <div style={{fontSize:11,fontWeight:700,color:'var(--text-soft,#6B6B6B)',marginTop:5}}>{met?<>🎉 <b>¡Meta cumplida!</b> Sigue si quieres más XP.</>:<>Te faltan <b>{target-todayMin} min</b> para tu meta.</>}</div>
      </div>
    </div>
  );
}

/* Top del grupo (simple) por XP de la semana — los próximos campeones */
function GroupTopSimple({ student, onSeeTop }) {
  const { getWeeklyRanking } = window.JUCUM_DATA;
  const ranking = getWeeklyRanking(student.group) || [];
  const myIdx = ranking.findIndex(r => r.student.id === student.id);
  const me = myIdx>=0 ? ranking[myIdx] : null;
  const ranked = me && me.xp>0;
  return (
    <div className="scard" style={{padding:16}}>
      <div style={{fontSize:10.5,fontWeight:800,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text-soft,#6B6B6B)',marginBottom:10}}>🏅 Top del grupo · esta semana</div>
      {!ranked ? (
        <div style={{background:'#F6F8FD',borderRadius:10,padding:14,fontSize:12.5,fontWeight:700,textAlign:'center',lineHeight:1.5,color:'var(--text-soft,#6B6B6B)'}}>🏁 Aún no estás en el ranking. Completa tu primera práctica para <b>entrar y competir</b>.</div>
      ) : (<>
        <div style={{display:'flex',flexDirection:'column',gap:5}}>
          {ranking.slice(0,5).map((r,i)=>{const next=i<3;const isMe=r.student.id===student.id;
            return (<div key={r.student.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:10,fontSize:13,background:next?'linear-gradient(90deg,#FFF6DD,#FFFDF5)':'#F6F8FD',border:next?'1px solid #F1DDA0':(isMe?'1px solid #C9D6F0':'1px solid transparent')}}>
              <span style={{fontWeight:800,width:22,color:next?'#C28A00':'var(--text-soft,#6B6B6B)'}}>{i+1}°</span>
              <span style={{flex:1,fontWeight:700,color:'#2A3550'}}>{isMe?'Tú':r.student.fullName.split(' ')[0]+' '+((r.student.fullName.split(' ')[1]||'')[0]||'')+'.'}</span>
              {next && <span style={{fontSize:9.5,fontWeight:800,color:'#fff',background:'#E0A400',padding:'2px 7px',borderRadius:10,textTransform:'uppercase',letterSpacing:'.04em'}}>próx. campeón</span>}
              <span style={{fontWeight:800,color:'var(--text-soft,#6B6B6B)',fontSize:12}}>{(r.xp||0).toLocaleString()} XP</span>
            </div>);})}
        </div>
        <div style={{fontSize:11,color:'var(--text-mute,#A8A8A8)',fontWeight:700,textAlign:'center',marginTop:10}}>✨ El <b style={{color:'#C28A00'}}>Top 3</b> serán los próximos campeones si siguen así</div>
        {onSeeTop && <button onClick={onSeeTop} style={{marginTop:10,width:'100%',border:'none',background:'#F6F8FD',color:'#1F3A8A',fontFamily:'inherit',fontWeight:800,fontSize:12,padding:'9px',borderRadius:10,cursor:'pointer'}}>Ver mi práctica →</button>}
      </>)}
    </div>
  );
}

/* Campeones de la semana (protagonista) + botón Reclamar premio */
function WeekChampionsCard({ student }) {
  const D = window.JUCUM_DATA;
  const [, force] = React.useReducer(x=>x+1,0);
  const [modal, setModal] = React.useState(false);
  React.useEffect(()=>{ if(D.loadLeagueFromCloud) D.loadLeagueFromCloud().then(()=>force()); }, []); // eslint-disable-line
  const champ = D.getWeekChampions(student.group);
  const champions = champ.champions || [];
  const myRank = D.championRank(student);
  const sceneBg = LG_SCENES[champ.scenario] || LG_SCENES['theme-gold'];
  const champ1 = champions.find(c=>c.rank===1);
  const myEmoji = myRank ? D.getChampionEmoji(student.group, student.id) : '';
  const podMap = [2,1,3];
  return (
    <div className="scard" style={{padding:0, overflow:'hidden', border:'none', boxShadow:'0 10px 30px rgba(20,36,89,.16)'}}>
      <div style={{background:sceneBg, color:'#fff', padding:'15px 16px 18px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontWeight:600,fontSize:16,textShadow:'0 1px 4px rgba(0,0,0,.45)'}}>🏆 Campeones de la semana</div>
          <span style={{fontSize:10,fontWeight:800,background:'rgba(0,0,0,.28)',padding:'3px 10px',borderRadius:20,textShadow:'0 1px 2px rgba(0,0,0,.4)'}}>Hasta el lunes</span>
        </div>
        {champions.length===0 ? (
          <div style={{marginTop:14,background:'rgba(0,0,0,.22)',borderRadius:12,padding:16,fontSize:12.5,fontWeight:700,textAlign:'center',lineHeight:1.5,textShadow:'0 1px 2px rgba(0,0,0,.4)'}}>🏁 Aún no hay campeones. ¡Practica esta semana y el lunes se corona el primer podio!</div>
        ) : (
          <div style={{display:'flex',alignItems:'flex-end',justifyContent:'center',gap:10,margin:'16px 0 4px'}}>
            {podMap.map(rk=>{const c=champions.find(x=>x.rank===rk);if(!c)return <div key={rk} style={{width:60}} />;const A=LG_AVA[rk];const isMe=c.student.id===student.id;
              return (<div key={rk} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5}}>
                <div style={{position:'relative',width:A.a,height:A.a,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:c.emoji?A.e:A.a*0.4,color:'#fff',background:c.emoji?'rgba(255,255,255,.16)':A.ab,border:'2.5px solid rgba(255,255,255,.6)',boxShadow:(isMe?'0 0 0 3px #fff,':'')+A.ring}}>
                  {rk===1 && <span style={{position:'absolute',top:-17,left:'50%',transform:'translateX(-50%)',fontSize:18}}>👑</span>}
                  {c.emoji||lgIni(c.student)}
                </div>
                <div style={{width:A.a+6,height:A.b,background:A.bg,borderRadius:'8px 8px 0 0',display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:6,fontFamily:"'Fredoka',sans-serif",fontWeight:700,fontSize:17,color:'rgba(0,0,0,.45)'}}>{rk}</div>
                <div style={{fontSize:11,fontWeight:800,color:isMe?'#FFE08A':'#fff',textShadow:'0 1px 3px rgba(0,0,0,.5)'}}>{isMe?'Tú':c.student.fullName.split(' ')[0]}</div>
              </div>);})}
          </div>
        )}
        {champions.length>0 && (myRank>0 ? (myEmoji ? (
          <div style={{marginTop:14,background:'rgba(255,255,255,.92)',borderRadius:12,padding:'11px 13px',display:'flex',alignItems:'center',gap:10,color:'#3a2a00'}}>
            <span style={{fontSize:30}}>{myEmoji}</span>
            <div style={{flex:1}}><div style={{fontSize:12.5,fontWeight:800,color:'#9c5d00'}}>🎉 Premio reclamado</div><div style={{fontSize:11,color:'#B26A00',fontWeight:700}}>Todos te ven así · fijo hasta el lunes</div></div>
            <button onClick={()=>setModal(true)} style={{border:'none',background:'rgba(0,0,0,.08)',color:'#9c5d00',fontWeight:800,fontSize:11,padding:'6px 10px',borderRadius:14,cursor:'pointer'}}>Cambiar</button>
          </div>
        ) : (
          <button onClick={()=>setModal(true)} style={{display:'block',width:'100%',marginTop:14,border:'none',cursor:'pointer',fontFamily:"'Fredoka',sans-serif",fontWeight:600,fontSize:15,color:'#3a2a00',background:'linear-gradient(135deg,#FFD75E,#F4B400)',borderRadius:13,padding:13,boxShadow:'0 6px 16px rgba(244,180,0,.4)'}}>🎁 Reclama tu premio de campeón →</button>
        )) : (
          <div style={{marginTop:14,background:'rgba(255,255,255,.14)',border:'1px solid rgba(255,255,255,.28)',borderRadius:12,padding:'11px 13px',fontSize:12,fontWeight:700,lineHeight:1.45,textShadow:'0 1px 2px rgba(0,0,0,.4)'}}>🏆 Estos son los <b style={{color:'#FFE08A'}}>campeones de la semana</b>{champ1?<> y el escenario que eligió <b style={{color:'#FFE08A'}}>{champ1.student.fullName.split(' ')[0]}</b></>:''}. ¡Practica mucho para ser el próximo en <b style={{color:'#FFE08A'}}>reclamar este premio</b> 🎁!</div>
        ))}
      </div>
      {modal && <ChampionRewardModal student={student} myRank={myRank} onClose={()=>setModal(false)} onSaved={()=>{setModal(false);force();}} />}
    </div>
  );
}

function ChampionRewardModal({ student, myRank, onClose, onSaved }) {
  const D = window.JUCUM_DATA;
  const champ = D.getWeekChampions(student.group);
  const champions = champ.champions || [];
  const [pick, setPick] = React.useState(D.getChampionEmoji(student.group, student.id) || '🦁');
  const [sc, setSc] = React.useState(D.getLeagueScenario(student.group));
  const isOne = myRank===1;
  const previewScene = isOne ? sc : champ.scenario;
  const save = ()=>{ D.setChampionEmoji(student.group, student.id, pick); if(isOne) D.setLeagueScenario(student.group, sc); onSaved(); };
  const mini = (highlightMe)=>{ const podMap=[2,1,3];
    return (<div style={{borderRadius:11,overflow:'hidden'}}>
      <div style={{fontSize:10,fontWeight:800,textAlign:'center',padding:5,color:'#fff',background:'rgba(0,0,0,.25)',textShadow:'0 1px 2px rgba(0,0,0,.4)'}}>{highlightMe?'👁️ En tu panel':'En el de tus compañeros'}</div>
      <div style={{display:'flex',alignItems:'flex-end',justifyContent:'center',gap:6,padding:'6px 4px 9px',background:LG_SCENES[previewScene]}}>
        {podMap.map(rk=>{const c=champions.find(x=>x.rank===rk);if(!c)return <div key={rk} style={{width:24}}/>;const isMe=c.student.id===student.id;const em=isMe?pick:c.emoji;const z={1:{a:30,b:26},2:{a:24,b:20},3:{a:23,b:15}}[rk];const ab={1:'#C99700',2:'#8E939C',3:'#B06A2C'}[rk];const bg={1:'linear-gradient(#F4B400,#D49A00)',2:'linear-gradient(#B8BCC4,#8E939C)',3:'linear-gradient(#D98C4A,#B06A2C)'}[rk];
          return (<div key={rk} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
            <div style={{width:z.a,height:z.a,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,color:'#fff',fontSize:em?z.a*0.55:z.a*0.42,background:em?'rgba(255,255,255,.18)':ab,border:'2px solid rgba(255,255,255,.6)',boxShadow:(isMe&&highlightMe)?'0 0 0 2px #fff':'none'}}>{em||lgIni(c.student)}</div>
            <div style={{width:z.a+4,height:z.b,background:bg,borderRadius:'5px 5px 0 0',display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:3,fontFamily:"'Fredoka',sans-serif",fontWeight:700,fontSize:11,color:'rgba(0,0,0,.45)'}}>{rk}</div>
            <div style={{fontSize:8.5,fontWeight:800,color:(isMe&&highlightMe)?'#FFE08A':'#fff',textShadow:'0 1px 2px rgba(0,0,0,.5)'}}>{isMe?'Tú':c.student.fullName.split(' ')[0]}</div>
          </div>);})}
      </div>
    </div>);
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{maxWidth:500}} onClick={e=>e.stopPropagation()}>
        <div className="modal-head" style={{background:LG_SCENES[previewScene]}}>
          <div className="modal-title" style={{color:'#fff'}}>🎁 Reclama tu premio</div>
          <div className="modal-date" style={{color:'rgba(255,255,255,.9)'}}>Quedaste {myRank}.° — mira cómo te verán todos mientras eliges.</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{background:'#F4F7FD',border:'1px solid var(--border)',borderRadius:13,padding:12,marginBottom:16}}>
            <div style={{fontSize:10.5,fontWeight:800,textTransform:'uppercase',letterSpacing:'.05em',color:'var(--text-soft,#6B6B6B)',textAlign:'center',marginBottom:9}}>✨ Vista previa en vivo</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>{mini(true)}{mini(false)}</div>
          </div>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontWeight:600,fontSize:14,color:'#9c5d00'}}>🎭 Tu emoji de avatar</div>
          <div style={{fontSize:12,fontWeight:700,color:'#B26A00',margin:'2px 0 10px'}}>Será tu cara en el podio. <b>Solo tú</b> cambias el tuyo.</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:7}}>
            {LG_EMOJIS.map(([e,l])=> <button key={e} title={l} onClick={()=>setPick(e)} style={{aspectRatio:'1',minWidth:0,border:pick===e?'1.5px solid #F4B400':'1.5px solid var(--border)',background:pick===e?'#FFF4D6':'#fff',boxShadow:pick===e?'0 0 0 2px rgba(244,180,0,.25)':'none',borderRadius:9,fontSize:18,cursor:'pointer'}}>{e}</button>)}
          </div>
          {isOne && <><div style={{borderTop:'1px solid #EEE',margin:'16px 0 14px'}}></div>
            <div style={{fontFamily:"'Fredoka',sans-serif",fontWeight:600,fontSize:14,color:'#1F3A8A'}}>👑 Escenario del grupo</div>
            <div style={{fontSize:12,fontWeight:700,color:'#6E59A8',margin:'2px 0 8px'}}>Como 1.°, tú eliges el fondo. <b>Todo el grupo lo verá.</b></div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:7}}>
              {LG_SCENE_META.map(([k,em,l])=>{const on=sc===k;return <button key={k} onClick={()=>setSc(k)} style={{position:'relative',height:50,borderRadius:10,border:on?'2px solid #1F3A8A':'2px solid transparent',boxShadow:on?'0 0 0 2px rgba(31,58,138,.3)':'none',cursor:'pointer',overflow:'hidden',background:LG_SCENES[k],color:'#fff',fontFamily:'inherit',fontWeight:800,fontSize:9.5,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',padding:'0 0 4px',textShadow:'0 1px 2px rgba(0,0,0,.6)'}}>{on&&<span style={{position:'absolute',top:2,right:4,fontSize:10}}>✓</span>}<span style={{fontSize:15}}>{em}</span>{l}</button>;})}
            </div></>}
          <div style={{display:'flex',alignItems:'center',gap:10,marginTop:14,background:'#FFFDF6',border:'1px solid #F0C66B',borderRadius:11,padding:'9px 12px'}}>
            <span style={{fontSize:26}}>{pick}</span>
            <div style={{fontSize:12.5,fontWeight:800,color:'#9c5d00'}}>Tu avatar de campeón<small style={{display:'block',fontWeight:700,color:'#B26A00',fontSize:11}}>{(LG_EMOJIS.find(x=>x[0]===pick)||[null,''])[1]} — elegido</small></div>
            <button onClick={save} style={{marginLeft:'auto',border:'none',background:'#F4B400',color:'#3a2a00',fontFamily:"'Fredoka',sans-serif",fontWeight:600,fontSize:13,padding:'9px 18px',borderRadius:16,cursor:'pointer'}}>Guardar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Top del grupo — podio competitivo + 4.°/5.° + a quién perseguir */
function Podium({ student, onSeeTop }) {
  const { getComplianceRanking } = window.JUCUM_DATA;
  const ranking = getComplianceRanking(student.group) || [];
  const myIdx = ranking.findIndex(r => r.student.id === student.id);
  const me = myIdx >= 0 ? ranking[myIdx] : null;
  // Entra al ranking si tiene dominio O ya ganó XP (p.ej. por tiempo de lectura).
  const ranked = me && (me.score > 0 || me.xp > 0);
  const ini = (s) => (s.fullName || '?').split(' ').map(w => w[0]).slice(0,2).join('');
  const podMap = [['p2',1],['p1',0],['p3',2]]; // visual: 2.° izq · 1.° centro · 3.° der
  const barH = { p1:62, p2:46, p3:34 }, barBg = { p1:'linear-gradient(#F4B400,#D49A00)', p2:'linear-gradient(#B8BCC4,#8E939C)', p3:'linear-gradient(#D98C4A,#B06A2C)' }, avaBg = { p1:'#C99700', p2:'#8E939C', p3:'#B06A2C' };
  const ahead = myIdx > 0 ? ranking[myIdx - 1] : null;
  return (
    <div className="scard" style={{background:'linear-gradient(150deg,#21408F,#152459)', border:'none', color:'#fff', position:'relative', overflow:'hidden'}}>
      <div style={{position:'absolute', top:-30, right:-30, width:120, height:120, background:'radial-gradient(circle,rgba(244,180,0,.4),transparent 70%)'}}></div>
      <div style={{fontSize:11, fontWeight:800, letterSpacing:'.06em', textTransform:'uppercase', color:'rgba(255,255,255,.6)'}}>Top de tu grupo</div>
      {!ranked ? (
        <div style={{position:'relative', zIndex:1, marginTop:12, background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.16)', borderRadius:12, padding:16, fontSize:13, fontWeight:700, lineHeight:1.5, textAlign:'center'}}>
          🏁 Aún no estás en el ranking.<br/>Completa tu primera práctica para <b>entrar y competir</b>.
        </div>
      ) : (
        <>
          <div style={{display:'flex', alignItems:'flex-end', justifyContent:'center', gap:8, margin:'14px 0 12px', position:'relative', zIndex:1}}>
            {podMap.map(([cls, idx]) => {
              const r = ranking[idx]; if (!r) return null;
              const isMe = r.student.id === student.id;
              return (
                <div key={cls} style={{display:'flex', flexDirection:'column', alignItems:'center', gap:5}}>
                  <div style={{width:34, height:34, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:12, color:'#fff', background:avaBg[cls], border:'2px solid rgba(255,255,255,.5)', boxShadow:isMe?'0 0 0 3px rgba(244,180,0,.6)':'none'}}>{ini(r.student)}</div>
                  <div style={{width:54, height:barH[cls], background:barBg[cls], borderRadius:'8px 8px 0 0', display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:6, fontFamily:"'Fredoka',sans-serif", fontWeight:700, fontSize:16, color:'rgba(0,0,0,.5)'}}>{idx+1}</div>
                  <div style={{fontSize:10.5, fontWeight:800, color:'rgba(255,255,255,.85)'}}>{isMe ? 'Tú' : r.student.fullName.split(' ')[0]}</div>
                </div>
              );
            })}
          </div>
          {ranking.length > 3 && (
            <div style={{position:'relative', zIndex:1, display:'flex', flexDirection:'column', gap:5, marginBottom:10}}>
              {ranking.slice(3,5).map((r, i) => (
                <div key={r.student.id} style={{display:'flex', alignItems:'center', gap:10, background:r.student.id===student.id?'rgba(244,180,0,.18)':'rgba(255,255,255,.08)', borderRadius:9, padding:'7px 11px', fontSize:12.5}}>
                  <span style={{fontWeight:800, color:'rgba(255,255,255,.6)', width:18}}>{i+4}°</span>
                  <span style={{flex:1, fontWeight:700}}>{r.student.id===student.id?'Tú':r.student.fullName}</span>
                  <span style={{fontWeight:800, color:'rgba(255,255,255,.7)', fontSize:11.5}}>{r.score}%</span>
                </div>
              ))}
            </div>
          )}
          <div style={{display:'flex', alignItems:'center', gap:10, background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.16)', borderRadius:12, padding:'9px 12px', position:'relative', zIndex:1}}>
            <span style={{fontSize:18}}>🎯</span>
            <div style={{flex:1, fontSize:12, fontWeight:700, lineHeight:1.35}}>
              {myIdx === 0 ? <>¡Vas <b style={{color:'#F4B400'}}>1.°</b>! Mantén el ritmo para no perderlo.</>
                : ahead ? <>Te falta poco para alcanzar a <b style={{color:'#F4B400'}}>{ahead.student.fullName.split(' ')[0]}</b> y subir al <b style={{color:'#F4B400'}}>{myIdx}.°</b></>
                : <>Sigue practicando para subir.</>}
            </div>
            {onSeeTop && <button onClick={onSeeTop} style={{fontSize:11.5, fontWeight:800, background:'#fff', color:'#1F3A8A', borderRadius:16, padding:'6px 12px', border:'none', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap'}}>Ver el top →</button>}
          </div>
        </>
      )}
    </div>
  );
}

/* Ruta de módulos — mapa con desbloqueo secuencial (escala a 7+) */
function ModuleRoute({ student, selectedId, onSelect }) {
  const route = window.JUCUM_DATA.getModuleRoute(student);
  const curIdx = (route.find(x => x.state === 'cur') || route[0] || {}).idx || 0;
  const colors = { done:{bg:'#2EA84B',fg:'#fff'}, cur:{bg:'#1F3A8A',fg:'#fff'}, lock:{bg:'#E7E2D6',fg:'#A8A8A8'} };
  return (
    <div style={{background:'#fff', border:'1px solid var(--border)', borderRadius:16, padding:'14px 8px 6px', marginTop:4}}>
      <div style={{fontSize:11, fontWeight:800, letterSpacing:'.06em', textTransform:'uppercase', color:'var(--text-mute,#A8A8A8)', margin:'0 10px 4px'}}>🗺️ Tu ruta · Módulo {curIdx + 1} de {route.length} · toca un módulo para ver su contenido</div>
      <div style={{display:'flex', overflowX:'auto', padding:'14px 6px 10px', gap:0}}>
        {route.map((x, i) => {
          const c = colors[x.state]; const sel = x.mod.id === selectedId;
          return (
            <button key={x.mod.id} onClick={() => onSelect(x.mod.id)} style={{flex:'none', width:108, display:'flex', flexDirection:'column', alignItems:'center', gap:8, position:'relative', cursor:'pointer', background:'none', border:'none', fontFamily:'inherit', padding:0}}>
              {x.state === 'cur' && <span style={{position:'absolute', top:-13, fontSize:9, fontWeight:800, background:'#1F3A8A', color:'#fff', padding:'2px 7px', borderRadius:10, whiteSpace:'nowrap', zIndex:2}}>Aquí vas</span>}
              {x.hasReview && <span style={{position:'absolute', top:-3, right:24, width:21, height:21, borderRadius:'50%', background:'#5B3FA0', color:'#fff', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center', zIndex:3, border:'2px solid #fff'}}>🔁</span>}
              {i < route.length - 1 && <span style={{position:'absolute', top:23, left:77, width:56, height:3, background:x.state==='done'?'#2EA84B':'var(--border)', borderRadius:2, zIndex:0}}></span>}
              <span style={{width:46, height:46, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Fredoka',sans-serif", fontWeight:700, fontSize:16, zIndex:1, border:'3px solid #fff', background:c.bg, color:c.fg, boxShadow: sel ? '0 0 0 4px rgba(242,148,30,.35)' : (x.state==='cur' ? '0 0 0 4px rgba(31,58,138,.16)' : 'none')}}>{x.state==='done'?'✓':x.state==='lock'?'🔒':i+1}</span>
              <span style={{fontSize:10.5, fontWeight:800, color:x.state==='lock'?'var(--text-mute,#A8A8A8)':'var(--text-soft,#6B6B6B)', textAlign:'center', lineHeight:1.2, maxWidth:98}}>M{i+1}<br/>{x.mod.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* Mensaje inteligente de la meta (según el día del alumno) */
function MetaSmartMessage({ metaMet, hasPending, minsLeft, onReview }) {
  if (metaMet && hasPending) {
    return <div style={{display:'flex', alignItems:'center', gap:11, background:'#E8F5E9', border:'1px solid #A5D6A7', borderRadius:14, padding:'12px 15px', fontSize:13, fontWeight:700, color:'#1B5E20', lineHeight:1.4, marginTop:14}}><span style={{fontSize:20}}>🎉</span><div>¡Cumpliste tu meta! Pero aún te quedan prácticas de hoy. El repaso rinde más el mismo día — <b>termínalas</b> 💪</div></div>;
  }
  if (!metaMet && !hasPending) {
    return <div style={{display:'flex', alignItems:'center', gap:11, background:'#FFF7E8', border:'1px solid #F0C66B', borderRadius:14, padding:'12px 15px', fontSize:13, fontWeight:700, color:'#9c5d00', lineHeight:1.4, marginTop:14}}><span style={{fontSize:20}}>🔁</span><div>Ya terminaste lo de hoy 🙌 Te faltan <b>{minsLeft} min</b> de meta — refuerza con un repaso para fijar lo aprendido.</div>{onReview && <button onClick={onReview} style={{marginLeft:'auto', fontSize:12, fontWeight:800, color:'#fff', background:'#F9A825', borderRadius:16, padding:'7px 13px', border:'none', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap'}}>Empezar repaso</button>}</div>;
  }
  if (!metaMet) {
    return <div style={{display:'flex', alignItems:'center', gap:11, background:'#EDF1FB', border:'1px solid #C9D6F0', borderRadius:14, padding:'12px 15px', fontSize:13, fontWeight:700, color:'#152459', lineHeight:1.4, marginTop:14}}><span style={{fontSize:20}}>🎯</span><div>Te faltan <b>{minsLeft} min</b> para tu meta. Sigue con tu práctica de hoy 💪</div></div>;
  }
  return null;
}

/* ════════ PASO 5 · "Refuerzo" · práctica extra OPCIONAL ════════
 * Bloque al final de "Mi práctica". Ofrece repetir actividades YA aprobadas
 * para fijar lo aprendido. Es opcional: se enmarca distinto (no obligatorio,
 * no cuenta para el desbloqueo). Se realza cuando al alumno le falta meta y ya
 * no tiene pendientes obligatorios — así completa su meta repasando. */
function RefuerzoSection({ student, highlight }) {
  const D = window.JUCUM_DATA;
  const items = (D.getRefuerzo ? D.getRefuerzo(student, 3) : []);
  if (!items.length) return null;
  const mods = D.MODULE_CATALOG[student.level] || [];
  const go = (it) => {
    const mod = mods.find(m => m.id === it.moduleId);
    const a = mod && (mod.activities || []).find(x => x.id === it.activityId);
    const href = a ? linkFor(a, mod, student.id) : null;
    if (href) window.location.href = href;
  };
  return (
    <div style={{marginTop:24}}>
      <div style={{display:'flex', alignItems:'center', gap:8, margin:'0 2px 10px'}}>
        <span style={{fontSize:17}}>💪</span>
        <h2 style={{fontFamily:"'Fredoka',sans-serif", fontSize:17, margin:0}}>Refuerzo <span style={{fontSize:12.5, fontWeight:700, color:'var(--text-soft)'}}>· opcional</span></h2>
      </div>
      <div className="scard" style={{padding:0, overflow:'hidden', borderColor: highlight ? '#9BC9F0' : '#E6DEC9', borderStyle:'dashed'}}>
        <div style={{padding:'12px 15px', display:'flex', alignItems:'center', gap:11, background: highlight ? '#EDF3FC' : '#FBF8F0', borderBottom:'1px dashed ' + (highlight ? '#9BC9F0' : '#E6DEC9')}}>
          <span style={{fontSize:20}}>{highlight ? '🎯' : '✨'}</span>
          <div style={{fontSize:12.8, fontWeight:700, color: highlight ? '#1B3B6F' : 'var(--text-soft)', lineHeight:1.4}}>
            {highlight
              ? <>¿Te falta meta y ya no tienes pendientes? <b>Refuerza</b> lo que más te costó — cuenta para tu meta y fija lo aprendido.</>
              : <>Practica de más, cuando quieras. Repetir lo aprendido lo asienta para siempre 🧠</>}
          </div>
        </div>
        <div style={{padding:'10px 13px', display:'flex', flexDirection:'column', gap:7}}>
          {items.map((it, i) => (
            <button key={i} type="button" onClick={() => go(it)} className="al-item open" style={{width:'100%', textAlign:'left', font:'inherit', cursor:'pointer'}}>
              <span className="al-num" style={{background:'#EFE7F7', color:'#6C4FB0', borderColor:'#D6C9EC'}}>↻</span>
              <span className="al-ico">{typeIcon(it.type)}</span>
              <span className="al-name">{it.name}<span style={{display:'block', fontSize:11, fontWeight:700, color:'var(--text-soft)', marginTop:1}}>{it.moduleName}{it.group ? ' · ' + it.group : ''}</span></span>
              <span className="al-score" style={{background:'#F0ECE0', color:'#8A7F6A'}}>{it.pct}%</span>
              <span className="al-arr">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Encabezado de sección de "Mi práctica" — chip de color + título + línea fina.
 * Da identidad de color a cada bloque (práctica/repaso/actividades) de forma sutil. */
function PracHead({ emoji, title, color, tint, line }) {
  return (
    <div style={{display:'flex', alignItems:'center', gap:10, margin:'26px 2px 12px', paddingBottom:8, borderBottom:`1.5px solid ${line}`}}>
      <span style={{fontSize:17, width:32, height:32, borderRadius:9, background:tint, display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>{emoji}</span>
      <h2 style={{fontFamily:"'Fredoka',sans-serif", fontSize:17, margin:0, color}}>{title}</h2>
    </div>
  );
}

/* ════════ Vista "Mi práctica" — ruta + temas + repaso + por mejorar ════════ */
function StudentPractice({ student, settings, onBack }) {
  const D = window.JUCUM_DATA;
  const { MODULE_CATALOG, getStudentProgress, getModuleRoute, getFocusModuleId, getDueReviews } = D;
  const progress = getStudentProgress(student.id);
  const route = getModuleRoute(student);
  const [selectedId, setSelectedId] = React.useState(() => getFocusModuleId(student));
  const sel = route.find(x => x.mod.id === selectedId) || route.find(x => x.state === 'cur') || route[0];
  const due = getDueReviews(student) || [];
  const improve = D.getActivitiesToImprove(student) || [];
  const showReview = due.length > 0 || !!(D.getLastReviewResult && D.getLastReviewResult(student));
  const targetMin = settings.dailyTargetMin || 15;
  const todayMin = progress.todayMinutes || 0;
  const metaMet = todayMin >= targetMin;
  const totalPendingActs = route.reduce((n, x) => n + (x.state !== 'lock' ? (x.total - x.doneCount) : 0), 0);
  const hasPending = due.length > 0 || improve.length > 0 || totalPendingActs > 0;

  // repaso de un módulo YA terminado (curva del olvido) → banner destacado
  const doneIds = new Set(route.filter(x => x.state === 'done').map(x => x.mod.id));
  const pastReview = due.find(d => doneIds.has(d.moduleId));

  const goReviewModule = (modId) => { setSelectedId(modId); };

  const selMod = sel ? sel.mod : null;

  return (
    <main>
      <div style={{display:'flex', alignItems:'center', gap:14, marginBottom:4}}>
        <button className="back-btn" onClick={onBack} style={{marginBottom:0}}>← Mi panel</button>
        <div style={{flex:1}}>
          <h1 style={{fontFamily:"'Fredoka',sans-serif", fontSize:24, margin:0}}>Mi práctica</h1>
          <div style={{fontSize:12.5, color:'var(--text-soft)', fontWeight:700}}>Sigue tu ruta de módulos</div>
        </div>
        <MiniRing done={todayMin} target={targetMin} />
      </div>

      <MetaSmartMessage metaMet={metaMet} hasPending={hasPending} minsLeft={Math.max(0, targetMin - todayMin)} onReview={pastReview ? () => goReviewModule(pastReview.moduleId) : null} />

      {/* ── 1) Tu ruta de módulos ── */}
      <div style={{marginTop:16}}>
        <ModuleRoute student={student} selectedId={selectedId} onSelect={setSelectedId} />
      </div>

      {/* ── 2) Tu práctica de hoy ── */}
      <PracHead emoji="🎯" title="Tu práctica de hoy" color="#1B3B6F" tint="#E4EDFB" line="#D2E0F5" />
      <div style={{marginTop:10}}><TodayPracticeCard student={student} /></div>
      {(() => {
        const dps = window.JUCUM_TT ? window.JUCUM_TT.getActiveDirectedForStudent(student) : [];
        return dps.length ? <div style={{marginTop:14, display:'flex', flexDirection:'column', gap:12}}>{dps.map(dp => <DirectedPracticeCard key={dp.id} dp={dp} student={student} />)}</div> : null;
      })()}

      {/* ── 3) Tu repaso de hoy ── */}
      {showReview && (
        <>
          <PracHead emoji="🔁" title="Tu repaso de hoy" color="#5B3FA0" tint="#ECE5F8" line="#DCD0F0" />
          <ReviewSection student={student} />
        </>
      )}

      {/* ── 4) Actividades del módulo (con aviso "por mejorar" como entrada) ── */}
      <PracHead emoji="📚" title="Actividades" color="#9C5D00" tint="#FCEFD0" line="#F0DDB0" />
      <ImproveBanner student={student} onGo={(it) => {
        const mod = (MODULE_CATALOG[student.level] || []).find(m => m.id === it.moduleId);
        const a = mod && (mod.activities || []).find(x => x.id === it.activityId);
        const href = a ? linkFor(a, mod, student.id) : null;
        if (href) window.location.href = href;
      }} />

      {selMod && (
        <div style={{marginTop:14}}>
          {sel.state === 'lock' ? (
            <div className="scard" style={{display:'flex', alignItems:'center', gap:12, color:'var(--text-soft)'}}>
              <span style={{fontSize:24}}>🔒</span>
              <div style={{fontSize:13.5, fontWeight:700}}>{sel.placeholder
                ? <>El módulo <b>{selMod.name}</b> aún no está disponible — llegará más adelante en tu ruta.</>
                : <>El módulo <b>{selMod.name}</b> se desbloquea cuando termines el anterior. Sigue tu ruta paso a paso.</>}</div>
            </div>
          ) : (
            <div className="scard">
              {sel.state === 'done' && (
                <div style={{display:'flex', alignItems:'center', gap:11, background:'#E8F5E9', border:'1px solid #A5D6A7', borderRadius:12, padding:'11px 14px', marginBottom:14, fontSize:13, fontWeight:700, color:'#1B5E20'}}>
                  <span style={{fontSize:20}}>✅</span><div><b>{selMod.name}</b> · completado.{sel.hasReview ? ' Tienes un repaso pendiente de este módulo 👇' : ' Sus repasos vuelven según la curva del olvido.'}</div>
                </div>
              )}
              <ModuleProgress mod={selMod} progress={progress} pct={sel.total?Math.round(sel.doneCount/sel.total*100):0} doneCount={sel.doneCount} studentId={student.id} freeUnlock={settings.unlockMode === 'free'} unlockMode={settings.unlockMode} unlockedActivities={settings.unlockedActivities} />
            </div>
          )}
        </div>
      )}

      {/* ── 5) Refuerzo opcional — realzado si falta meta y no hay pendientes ── */}
      <RefuerzoSection student={student} highlight={!metaMet && !hasPending} />
    </main>
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
  // Instructivo "Cómo practicar hoy" — del set asignado por el profe (si lo trae)
  const plansToday = (TT.getPracticePlansForStudentOnDate ? TT.getPracticePlansForStudentOnDate(student, new Date().toISOString().slice(0,10)) : [])
    .filter(p => p.assignToStudents !== false);
  const planWithGuide = plansToday.find(p => p.guide && p.guide.steps && p.guide.steps.length);
  const openGuide = () => {
    if (!window.JUCUM_GUIDE) return;
    let g = planWithGuide ? planWithGuide.guide : window.JUCUM_GUIDE.build(student.level, items.map(it => ({ moduleId: it.moduleId, activityId: it.activityId, label: it.label, type: it.type })), '', { title: 'Cómo practicar hoy' });
    // resolver links de cada paso a su material
    const links = (g.steps || []).map(s => {
      const mod = mods.find(m => m.id === s.moduleId);
      const a = mod && (mod.activities || []).find(x => x.id === s.activityId);
      return (mod && a) ? linkFor(a, mod, student.id) : null;
    });
    window.JUCUM_GUIDE.openOverlay(g, { links, studentName: (student.fullName || '').split(' ')[0] });
  };
  return (
    <div className="scard" style={{padding:0, overflow:'hidden', borderColor:'#90CAF9'}}>
      <div style={{padding:'12px 15px', display:'flex', alignItems:'center', gap:11, background:'#EAF3FE', borderBottom:'1px solid #C5DEF7'}}>
        <span style={{fontSize:20}}>🗓️</span>
        <div style={{flex:1, fontSize:12.8, fontWeight:700, color:'#1B3B6F', lineHeight:1.4}}>
          {isGeneric ? 'Tu plan recomendado para hoy' : 'Lo que tu profesor te dejó para hoy'}
        </div>
        <span style={{fontSize:11, fontWeight:700, color:'#5B7BA8', whiteSpace:'nowrap', textTransform:'capitalize'}}>{dayName}</span>
      </div>
      {window.JUCUM_GUIDE && (
        <button onClick={openGuide} style={{display:'flex', alignItems:'center', gap:11, width:'100%', textAlign:'left', cursor:'pointer', border:'none', borderBottom:'1px solid #E7DFF5', background:'linear-gradient(120deg,#F3EEFC,#FBFAFF)', padding:'12px 15px', font:'inherit'}}>
          <span style={{fontSize:22}}>📋</span>
          <div style={{flex:1}}>
            <div style={{fontWeight:800, fontSize:13.5, color:'#4A2E86'}}>Cómo practicar hoy</div>
            <div style={{fontSize:11.5, fontWeight:700, color:'#7A66B0', marginTop:1}}>Abre el instructivo con los pasos en orden</div>
          </div>
          <span style={{fontSize:12, fontWeight:800, color:'#fff', background:'#6C4FB0', borderRadius:16, padding:'6px 12px', whiteSpace:'nowrap'}}>Ver →</span>
        </button>
      )}
      <div className="next-row" style={{padding:'12px 13px'}}>
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
