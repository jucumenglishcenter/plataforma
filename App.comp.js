/* App root — auth + role routing.
 * When Supabase is present, bootstraps the real roster (users + groups)
 * into window.JUCUM_DATA before rendering, so every component keeps working
 * with live data instead of the local demo seed.
 */

function App() {
  const [user, setUser] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('jucum_user') || 'null'); }
    catch { return null; }
  });
  const DEMO = !!(window.JUCUM_DEMO && window.JUCUM_DEMO.isDemo());
  const [ready, setReady] = React.useState(!window.JUCUM_SB || DEMO); // local/demo = ready immediately
  const [bootErr, setBootErr] = React.useState('');

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

        // Map groups → expected shape, keep settings inline
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

        // Map student users → expected shape
        const students = users.filter(u => u.role === 'student').map(u => ({
          id: u.id, username: u.username, fullName: u.full_name,
          level: u.level, group: u.group_id, starred: u.starred || false,
          completedModules: 0, avgScore: 0, streak: 0,
          lastActiveDays: 0, totalMinutes: 0, achievements: [],
        }));
        window.JUCUM_DATA.STUDENTS.length = 0;
        students.forEach(s => window.JUCUM_DATA.STUDENTS.push(s));

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

  if (!user) return <Login onLogin={onLogin} />;
  if (user.role === 'admin') return <AdminDashboard user={user} onLogout={onLogout} />;
  if (user.role === 'dev') return <DevDashboard user={user} onLogout={onLogout} />;
  if (user.role === 'teacher') return <TeacherDashboard onLogout={onLogout} user={user} />;
  return <StudentDashboard user={user} onLogout={onLogout} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
