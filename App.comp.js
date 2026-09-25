/* App root — auth + role routing.
 * When Supabase is present, bootstraps the real roster (users + groups)
 * into window.JUCUM_DATA before rendering, so every component keeps working
 * with live data instead of the local demo seed.
 */

/* Vuelca el roster de la nube (groups + users) en window.JUCUM_DATA.
 * Se usa al arrancar y en cada refresco: así un cambio de grupo o de nivel
 * hecho por la profesora llega al alumno sin que tenga que volver a entrar. */
function applyRoster(groups, users) {
  window.JUCUM_DATA.GROUPS.length = 0;
  groups.forEach(g => window.JUCUM_DATA.GROUPS.push({
    id: g.id, level: g.level, name: g.name, schedule: g.schedule,
    startDate: g.start_date, _settings: {
      activeModuleId: g.active_module_id, deadline: g.deadline,
      dailyTargetMin: g.daily_target_min ?? 15, isPaused: g.is_paused,
      unlockMode: g.unlock_mode || 'sequential',
      unlockedActivities: g.unlocked_activities || [],
      activeModuleIds: g.active_module_ids || (g.active_module_id ? [g.active_module_id] : []),
    },
  }));
  const students = users.filter(u => u.role === 'student').map(u => ({
    id: u.id, username: u.username, fullName: u.full_name,
    level: u.level, group: u.group_id, starred: u.starred || false,
    email: u.email || null, age: u.age ?? null, dni: u.dni || null,
    guardianName: u.guardian_name || null, guardianDni: u.guardian_dni || null,
    phone: u.phone || null, payMode: u.pay_mode || null,
    source: u.source || null, createdAt: u.created_at || null, status: u.status || null,
    completedModules: 0, avgScore: 0, streak: 0,
    lastActiveDays: 0, totalMinutes: 0, achievements: [],
    lastSeenAt: u.last_seen_at || null,   // 📶 último ingreso real (script 22)
  }));
  window.JUCUM_DATA.STUDENTS.length = 0;
  students.forEach(s => window.JUCUM_DATA.STUDENTS.push(s));
}

function App() {
  const [user, setUser] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('jucum_user') || 'null'); }
    catch { return null; }
  });
  const DEMO = !!(window.JUCUM_DEMO && window.JUCUM_DEMO.isDemo());
  const [ready, setReady] = React.useState(!window.JUCUM_SB || DEMO); // local/demo = ready immediately
  const [bootErr, setBootErr] = React.useState('');
  const [staleMsg, setStaleMsg] = React.useState(false); // sesión de una cuenta que ya no existe
  // Modo mantenimiento (lo activa el dev). Se consulta a la nube y se sondea.
  const [maint, setMaint] = React.useState(() => (window.JUCUM_DATA.getMaintenance ? window.JUCUM_DATA.getMaintenance() : { active:false }));
  const [staffAccess, setStaffAccess] = React.useState(false); // “acceso del equipo” desde la pantalla de mantenimiento
  React.useEffect(() => {
    let alive = true;
    const D = window.JUCUM_DATA;
    if (!D.loadMaintenanceFromCloud) return;
    const pull = () => D.loadMaintenanceFromCloud().then(v => { if (alive && v) setMaint(v); }).catch(() => {});
    pull();
    const iv = setInterval(() => { if (document.visibilityState === 'visible') pull(); }, 20000);
    const onVis = () => { if (document.visibilityState === 'visible') pull(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', pull);
    return () => { alive = false; clearInterval(iv); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', pull); };
  }, []);

  // 📶 Conexión real: mientras un ALUMNO tenga la app abierta, sella su
  // last_seen_at (al entrar, al volver a la pestaña y cada 10 min). Así el
  // profesor ve la última conexión de verdad, no la última práctica.
  React.useEffect(() => {
    if (!user || user.role !== 'student' || !user.studentId) return;
    if (!window.JUCUM_SB || !window.JUCUM_SB.touchLastSeen || DEMO) return;
    const touch = () => window.JUCUM_SB.touchLastSeen(user.studentId);
    touch();
    const iv = setInterval(() => { if (document.visibilityState === 'visible') touch(); }, 10 * 60000);
    const onVis = () => { if (document.visibilityState === 'visible') touch(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', onVis); };
  }, [user]);

  // Bootstrap real roster from Supabase (se omite en modo demostración)
  React.useEffect(() => {
    if (!window.JUCUM_SB || DEMO) { if (DEMO && window.JUCUM_DEMO) { try { window.JUCUM_DEMO.seedAll(); } catch {} } return; }
    (async () => {
      try {
        const sb = window.JUCUM_SB.getClient();
        const [{ data: groups, error: gE }, { data: users, error: uE }] = await Promise.all([
          sb.from('groups').select('*'),
          sb.from('users').select('*'),
        ]);
        if (gE) throw gE; if (uE) throw uE;

        // Roster (grupos + alumnos) → window.JUCUM_DATA
        applyRoster(groups, users);
        /* 🔐 25-sep-2026 · Sesión de una cuenta BORRADA (p. ej. al pasar a un alumno de
         * Pre-A1 a A1 se le creó una cuenta nueva): el equipo seguía con el id viejo y el
         * panel mostraba al PRIMER alumno de la lista (caso Yoel → “perfil de Dylan”).
         * Si la cuenta ya no existe, se cierra la sesión y se pide entrar de nuevo. */
        try {
          const cur = JSON.parse(localStorage.getItem('jucum_user') || 'null');
          if (cur && cur.role === 'student' && cur.studentId && users.length && !users.some(x => x.id === cur.studentId)) {
            localStorage.removeItem('jucum_user');
            if (window.JUCUM_NAV) window.JUCUM_NAV.clearAll();
            setUser(null); setStaleMsg(true);
          }
        } catch (e) {}

        // Hydrate localStorage cache from cloud (settings, progress, notifs, evals, forum)
        if (window.JUCUM_SYNC) {
          try { await window.JUCUM_SYNC.hydrate(groups, users); } catch (e) { console.warn('hydrate:', e.message); }
          // Module catalog: load from cloud, or seed cloud with the local catalog on first run
          try {
            const rows = await window.JUCUM_SYNC.fetchModules();
            const CAT = window.JUCUM_DATA.MODULE_CATALOG;
            const seedM1 = (CAT['pre-a1'] || []).find(m => m.id === 'pa1-m1');
            if (rows && rows.length > 0) {
              Object.keys(CAT).forEach(k => CAT[k].length = 0);
              // De-dup: la tabla en la nube puede traer el MISMO módulo repetido
              // (mismo nombre, distinto id) si se importó dos veces. Conservamos
              // una sola copia por nombre (la más completa), reapuntamos los
              // grupos que tuvieran activada la copia descartada y borramos las
              // filas sobrantes de la nube para que no vuelvan a aparecer.
              const seenMod = {};   // `${level}::${nombre}` -> módulo conservado
              const dupRemap = {};  // idDescartado -> idConservado
              rows.forEach(r => {
                const mod = { id:r.id, name:r.name, emoji:r.emoji, topics:r.topics||[], activities:r.activities||[] };
                const key = r.level + '::' + String(r.name || '').trim().toLowerCase();
                const prev = seenMod[key];
                if (!prev) {
                  seenMod[key] = mod;
                  CAT[r.level] = CAT[r.level] || [];
                  CAT[r.level].push(mod);
                  return;
                }
                const keep = (mod.activities.length > prev.activities.length) ? mod : prev;
                const drop = (keep === mod) ? prev : mod;
                if (keep === mod) {
                  const arr = CAT[r.level]; arr[arr.indexOf(prev)] = mod; seenMod[key] = mod;
                }
                dupRemap[drop.id] = keep.id;
              });
              const dupIds = Object.keys(dupRemap);
              if (dupIds.length) {
                (window.JUCUM_DATA.GROUPS || []).forEach(g => {
                  const st = window.JUCUM_DATA.getGroupSettings(g.id);
                  const ids = (st.activeModuleIds && st.activeModuleIds.length) ? st.activeModuleIds : (st.activeModuleId ? [st.activeModuleId] : []);
                  if (ids.some(id => dupRemap[id])) {
                    const next = [...new Set(ids.map(id => dupRemap[id] || id))];
                    window.JUCUM_DATA.setGroupSettings(g.id, { activeModuleIds: next });
                  }
                });
                if (window.JUCUM_SYNC.deleteModuleDb) dupIds.forEach(id => { try { window.JUCUM_SYNC.deleteModuleDb(id); } catch {} });
              }
              // One-time upgrade: if the cloud copy of M1 has no URLs but the
              // built-in seed does, replace it with the URL-loaded seed.
              const cloudM1 = (CAT['pre-a1'] || []).find(m => m.id === 'pa1-m1');
              if (cloudM1 && seedM1 && !(cloudM1.activities||[]).some(a => a.url) && seedM1.activities.some(a => a.url)) {
                const i = CAT['pre-a1'].indexOf(cloudM1);
                CAT['pre-a1'][i] = seedM1;
                window.JUCUM_SYNC.pushModule('pre-a1', seedM1, i);
              }
            } else if (rows) {
              // table empty → seed it with the built-in catalog
              Object.entries(CAT).forEach(([lvl, mods]) =>
                mods.forEach((m, i) => window.JUCUM_SYNC.pushModule(lvl, m, i)));
            }
            try { localStorage.setItem('jucum_module_catalog_cache', JSON.stringify(CAT)); } catch {}
          } catch (e) { console.warn('modules:', e.message); }
          // Real stats (minutes, avg score, streak, completed modules) from progress
          try { window.JUCUM_SYNC.computeStats(); } catch (e) { console.warn('stats:', e.message); }
        }

        setReady(true);
      } catch (e) {
        setBootErr('No se pudieron cargar los datos: ' + e.message);
        setReady(true);
      }
    })();
  }, []);

  /* 🔄 22-sep-2026 · Cambio de grupo o de nivel SIN volver a entrar.
   * El roster se leía UNA sola vez al arrancar y la sesión (jucum_user) guarda
   * el nivel y el grupo del momento del ingreso: si la profesora movía a un
   * alumno de grupo/nivel, él seguía viendo el anterior hasta cerrar sesión.
   * Ahora volvemos a leer groups+users al volver a la pestaña (máximo una vez
   * por minuto, y cada 5 min con la pestaña visible) y si su fila cambió,
   * actualizamos también la sesión. */
  const [, setRosterTick] = React.useState(0);
  React.useEffect(() => {
    if (!window.JUCUM_SB || DEMO || !ready) return;
    let alive = true, last = Date.now(), busy = false;
    const refresh = async () => {
      if (!alive || busy || document.visibilityState !== 'visible') return;
      if (Date.now() - last < 60000) return;
      busy = true; last = Date.now();
      try {
        const sb = window.JUCUM_SB.getClient();
        const [{ data: groups, error: gE }, { data: users, error: uE }] = await Promise.all([
          sb.from('groups').select('*'),
          sb.from('users').select('*'),
        ]);
        if (!alive || gE || uE || !groups || !users) return;
        applyRoster(groups, users);
        if (window.JUCUM_SYNC) { try { window.JUCUM_SYNC.computeStats(); } catch (e) {} }
        setUser(u => {
          if (!u || u.role !== 'student' || !u.studentId) return u;
          const row = users.find(x => x.id === u.studentId);
          if (!row && users.length) {   // la cuenta fue borrada/migrada → fuera la sesión vieja
            try { localStorage.removeItem('jucum_user'); if (window.JUCUM_NAV) window.JUCUM_NAV.clearAll(); } catch (e) {}
            setStaleMsg(true);
            return null;
          }
          if (!row || (row.level === u.level && row.group_id === u.groupId)) return u;
          const next = { ...u, level: row.level, groupId: row.group_id };
          try { localStorage.setItem('jucum_user', JSON.stringify(next)); } catch (e) {}
          return next;
        });
        setRosterTick(t => t + 1);
      } catch (e) { /* sin conexión: se queda con lo que ya tenía */ }
      finally { busy = false; }
    };
    const onVis = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', refresh);
    const iv = setInterval(refresh, 5 * 60000);
    return () => { alive = false; clearInterval(iv); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', refresh); };
  }, [ready]);

  const onLogin = (u) => { setUser(u); localStorage.setItem('jucum_user', JSON.stringify(u)); };
  const onLogout = () => {
    if (window.JUCUM_NAV) window.JUCUM_NAV.clearAll();
    setUser(null);
    localStorage.removeItem('jucum_user');
    document.body.removeAttribute('data-level');
  };

  if (!ready) {
    return (
      <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14,fontFamily:'Nunito,sans-serif',color:'#777'}}>
        <img src={window.JUCUM_LOGO || 'logo-jucum.png'} alt="JUCUM EC" style={{height:80}} />
        <div style={{fontWeight:700}}>Conectando con la base de datos…</div>
      </div>
    );
  }
  if (bootErr) {
    return <div style={{padding:40,fontFamily:'Nunito,sans-serif',color:'#C62828',textAlign:'center'}}>⚠ {bootErr}<br/><button onClick={()=>location.reload()} style={{marginTop:14,padding:'10px 20px',borderRadius:20,border:'none',background:'#1F3A8A',color:'#fff',fontWeight:800,cursor:'pointer'}}>Reintentar</button></div>;
  }

  if (!user) {
    // Durante el mantenimiento, los visitantes ven la pantalla de mantenimiento.
    // El equipo entra por un acceso discreto que revela el login (para que el
    // dev pueda iniciar sesión y desactivarlo).
    if (maint.active && !staffAccess) return <MaintenanceScreen maint={maint} onStaff={() => setStaffAccess(true)} />;
    if (staleMsg) return (
      <>
        <div style={{background:'#FFF4D6', borderBottom:'1px solid #F0C66B', color:'#6B4200', fontFamily:'Nunito,sans-serif', fontWeight:800, fontSize:14, textAlign:'center', padding:'12px 16px'}}>
          Tu cuenta se actualizó (nuevo nivel o grupo). Vuelve a entrar con tu usuario y contraseña.
        </div>
        <Login onLogin={(u) => { setStaleMsg(false); onLogin(u); }} />
      </>
    );
    return <Login onLogin={onLogin} />;
  }
  // Con sesión iniciada: el dev SIEMPRE pasa (puede trabajar y apagar el modo).
  // Cualquier otro rol queda bloqueado mientras el mantenimiento esté activo.
  if (maint.active && user.role !== 'dev') return <MaintenanceScreen maint={maint} user={user} onLogout={onLogout} />;
  if (user.role === 'admin') return <AdminDashboard user={user} onLogout={onLogout} />;
  if (user.role === 'dev') return <DevDashboard user={user} onLogout={onLogout} />;
  if (user.role === 'teacher') return <TeacherDashboard onLogout={onLogout} user={user} />;
  return <StudentDashboard user={user} onLogout={onLogout} />;
}

/* Pantalla que ve todo el mundo (menos el dev) mientras el mantenimiento está activo. */
function MaintenanceScreen({ maint, user, onLogout, onStaff }) {
  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:18,fontFamily:'Nunito,sans-serif',color:'#3A3340',background:'#F4EFE9',textAlign:'center',padding:'40px 22px'}}>
      <img src={window.JUCUM_LOGO || 'logo-jucum.png'} alt="JUCUM EC" style={{height:78}} />
      <div style={{fontSize:46,lineHeight:1}}>🛠️</div>
      <div style={{fontFamily:"'Fredoka',sans-serif",fontWeight:700,fontSize:24,letterSpacing:'-.01em'}}>Página en mantenimiento</div>
      <div style={{fontSize:15,fontWeight:600,color:'#6B6B6B',maxWidth:440,lineHeight:1.55}}>{maint.message || 'Estamos haciendo mejoras. Volvemos en un ratito 💛'}</div>
      {user ? (
        <button onClick={onLogout} style={{marginTop:8,padding:'11px 22px',borderRadius:22,border:'1px solid #E0D6CF',background:'#fff',color:'#6B6B6B',fontWeight:800,fontSize:13.5,cursor:'pointer'}}>⏋ Cerrar sesión</button>
      ) : (
        <button onClick={onStaff} style={{marginTop:8,padding:'9px 18px',borderRadius:22,border:'none',background:'transparent',color:'#B7AEB4',fontWeight:700,fontSize:12.5,cursor:'pointer',textDecoration:'underline'}}>Acceso del equipo</button>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
