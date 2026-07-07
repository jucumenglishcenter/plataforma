/* Panel del Desarrollador (rol 'dev').
 * Reúne lo técnico/estructural que antes saturaba al profesor:
 *   módulos (contenido), grupos (estructura), exámenes (definir/subir),
 *   alumnos (alta/baja), promoción de nivel.
 * Resalta la sección activa (clase .active en el nav).
 */
function DevDashboard({ user, onLogout }) {
  const [view, setView] = React.useState(() => (window.JUCUM_NAV ? window.JUCUM_NAV.load('dev', 'modules') : 'modules'));
  React.useEffect(() => { if (window.JUCUM_NAV) window.JUCUM_NAV.save('dev', view); }, [view]);
  React.useEffect(() => { document.body.removeAttribute('data-level'); }, []);
  // 🐞 reportes nuevos (badge en el menú; se refresca solo)
  const [reportsNew, setReportsNew] = React.useState(0);
  React.useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        if (!window.JUCUM_SB) return;
        const sb = window.JUCUM_SB.getClient();
        const { data } = await sb.from('error_reports').select('id,status');
        if (alive && data) setReportsNew(data.filter(r => r.status === 'nuevo').length);
      } catch (e) {}
    };
    load();
    const iv = setInterval(load, 30000);
    return () => { alive = false; clearInterval(iv); };
  }, [view]);

  const NAV = [
    { k:'modules',  label:'📦 Módulos' },
    { k:'manage',   label:'⚙️ Grupos' },
    { k:'exams',    label:'📑 Exámenes' },
    { k:'students', label:'👥 Alumnos' },
    { k:'promote',  label:'🎓 Promoción' },
    { k:'retencion',label:'📉 Retención' },
    { k:'materials',label:'📚 Materiales' },
    { k:'reports',  label:'🐞 Reportes' },
    { k:'maint',    label:'🛠️ Mantenimiento' },
  ];

  return (
    <>
      <header className="app-header">
        <div className="app-logo">
          <img src={window.JUCUM_LOGO || 'logo-jucum.png'} alt="JUCUM EC" />
          <div className="pgtitle">Desarrollo · Plataforma</div>
        </div>
        <div className="app-right">
          <span className="role-pill t">🧑‍💻 Desarrollador</span>
          {NAV.map(n => (
            <a key={n.k} className={`nav-link ${view===n.k?'active':''}`} href="#" style={{position:'relative'}}
               onClick={(e)=>{e.preventDefault();setView(n.k);}}>{n.label}{n.k==='reports' && reportsNew > 0 && <span className="nav-dot">{reportsNew > 9 ? '9+' : reportsNew}</span>}</a>
          ))}
          <div className="user-pill"><div className="ava" style={{background:'linear-gradient(135deg,#455A64,#212121)'}}>D</div><span>Dev</span></div>
          <button className="logout-btn" onClick={onLogout} title="Cerrar sesión">⎋ Salir</button>
        </div>
      </header>

      {view === 'modules'  ? <ManageModules onBack={() => setView('modules')} />
       : view === 'manage'   ? <ManageGroups onBack={() => setView('manage')} />
       : view === 'exams'    ? <TeacherExams canDefine onBack={() => setView('exams')} />
       : view === 'students' ? <ManageStudents onBack={() => setView('students')} />
       : view === 'promote'  ? <LevelPromotion onBack={() => setView('promote')} />
       : view === 'retencion' ? <RetentionView />
       : view === 'materials' ? <MaterialsReview onBack={() => setView('materials')} who="Soporte" />
       : view === 'reports'  ? <ErrorReportsPanel onCountChange={setReportsNew} />
       : view === 'maint'    ? <MaintenancePanel />
       : <ManageModules onBack={() => setView('modules')} />}
    </>
  );
}

/* Panel del dev: cerrar/abrir la plataforma para todos (modo mantenimiento). */
function MaintenancePanel() {
  const D = window.JUCUM_DATA;
  const [m, setM] = React.useState(() => D.getMaintenance());
  const [msg, setMsg] = React.useState(m.message || '');
  const [saved, setSaved] = React.useState('');
  // Refresca por si otro dispositivo cambió el estado.
  React.useEffect(() => { if (D.loadMaintenanceFromCloud) D.loadMaintenanceFromCloud().then(v => { if (v) { setM(v); setMsg(v.message || ''); } }); }, []);

  const flash = (t) => { setSaved(t); setTimeout(() => setSaved(''), 2200); };
  const toggle = () => {
    const next = D.setMaintenance({ active: !m.active, message: msg });
    setM(next);
    flash(next.active ? 'Página cerrada — los alumnos ya no pueden entrar.' : 'Página reabierta — acceso restablecido.');
  };
  const saveMsg = () => { const next = D.setMaintenance({ message: msg }); setM(next); flash('Mensaje guardado.'); };

  const on = m.active;
  return (
    <main className="page" style={{maxWidth:720, margin:'0 auto', padding:'26px 20px'}}>
      <div className="scard" style={{padding:0, overflow:'hidden', borderTop:`4px solid ${on ? '#E0556A' : '#2EA84B'}`}}>
        <div style={{padding:'20px 22px', borderBottom:'1px solid #ECE2DC', display:'flex', alignItems:'center', gap:13}}>
          <div style={{fontSize:30, lineHeight:1}}>{on ? '🔴' : '🟢'}</div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:700, fontSize:19}}>Modo mantenimiento</div>
            <div style={{fontSize:13, fontWeight:600, color:'#6B6B6B'}}>
              {on ? 'La página está CERRADA. Solo tú (desarrollador) puedes usarla.' : 'La página está ABIERTA. Todos pueden usarla con normalidad.'}
            </div>
          </div>
          <span style={{fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'.05em', padding:'5px 12px', borderRadius:20, color:'#fff', background: on ? '#E0556A' : '#2EA84B'}}>{on ? 'Cerrada' : 'Abierta'}</span>
        </div>

        <div style={{padding:'22px'}}>
          <button onClick={toggle} style={{width:'100%', border:'none', borderRadius:14, padding:'16px', fontFamily:"'Fredoka',sans-serif", fontWeight:700, fontSize:17, cursor:'pointer', color:'#fff', background: on ? 'linear-gradient(135deg,#43C463,#2EA84B)' : 'linear-gradient(135deg,#F06A78,#E0556A)', boxShadow:'0 4px 14px rgba(0,0,0,.12)'}}>
            {on ? '✅ Desactivar — reabrir la página' : '🛠️ Activar — cerrar la página por mantenimiento'}
          </button>
          {saved && <div style={{marginTop:12, fontSize:13, fontWeight:700, color: on ? '#C0344A' : '#1B5E20', textAlign:'center'}}>{saved}</div>}

          <div style={{marginTop:22}}>
            <label style={{display:'block', fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'.05em', color:'#6B6B6B', marginBottom:7}}>Mensaje que verán los alumnos</label>
            <textarea value={msg} onChange={(e)=>setMsg(e.target.value)} rows={3}
              style={{width:'100%', border:'1px solid #E0D6CF', borderRadius:11, padding:'11px 13px', fontFamily:"'Nunito',sans-serif", fontSize:14, fontWeight:600, color:'#3A3340', resize:'vertical', boxSizing:'border-box'}} />
            <button onClick={saveMsg} style={{marginTop:9, padding:'9px 18px', borderRadius:11, border:'1px solid #E0D6CF', background:'#fff', color:'#3A3340', fontWeight:800, fontSize:13, cursor:'pointer'}}>Guardar mensaje</button>
          </div>

          <div style={{marginTop:20, background:'#FBF7F4', border:'1px solid #ECE2DC', borderRadius:11, padding:'13px 15px', fontSize:12.5, fontWeight:600, color:'#6B6B6B', lineHeight:1.55}}>
            ℹ️ Al activarlo, los alumnos y profesores que estén dentro verán la pantalla de mantenimiento en pocos segundos (sin recargar). Tú sigues trabajando normalmente. Recuerda <b>desactivarlo</b> al terminar.
          </div>
        </div>
      </div>
    </main>
  );
}

/* 🐞 Bandeja de reportes de error enviados desde los materiales (botón 🐞).
 * Filtra por estado, muestra alumno + material + parte exacta, y permite
 * marcarlos en revisión / resueltos, reabrirlos o borrarlos. */
function ErrorReportsPanel({ onCountChange }) {
  const [rows, setRows] = React.useState(null);   // null = cargando
  const [filter, setFilter] = React.useState('abiertos'); // abiertos · nuevo · revisando · resuelto · todos
  const [whoF, setWhoF] = React.useState('all'); // all · teacher · student
  const [busyId, setBusyId] = React.useState(null);
  const [err, setErr] = React.useState('');
  const D = window.JUCUM_DATA;
  const sb = () => (window.JUCUM_SB ? window.JUCUM_SB.getClient() : null);

  const load = React.useCallback(async () => {
    const c = sb();
    if (!c) { setRows([]); setErr('Sin conexión con la nube — los reportes viven en Supabase.'); return; }
    try {
      const { data, error } = await c.from('error_reports').select('*');
      if (error) throw error;
      const list = (data || []).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      setRows(list); setErr('');
      if (onCountChange) onCountChange(list.filter(r => r.status === 'nuevo').length);
    } catch (e) {
      setRows([]);
      setErr(/error_reports/.test(e.message || '') ? 'Falta correr el script SQL 21 (error_reports) en Supabase.' : ('No se pudo cargar: ' + e.message));
    }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const setStatus = async (r, status) => {
    setBusyId(r.id);
    try {
      const c = sb(); if (!c) throw new Error('sin nube');
      const patch = { status, resolved_at: status === 'resuelto' ? new Date().toISOString() : null };
      const { error } = await c.from('error_reports').update(patch).eq('id', r.id);
      if (error) throw error;
      await load();
    } catch (e) { alert('No se pudo actualizar: ' + e.message); }
    setBusyId(null);
  };
  const remove = async (r) => {
    if (!confirm('¿Borrar este reporte definitivamente?')) return;
    setBusyId(r.id);
    try { const c = sb(); const { error } = await c.from('error_reports').delete().eq('id', r.id); if (error) throw error; await load(); }
    catch (e) { alert('No se pudo borrar: ' + e.message); }
    setBusyId(null);
  };

  const nameOf = (uid) => { const s = (D.STUDENTS || []).find(x => x.id === uid); return s ? s.fullName : null; };
  const groupOf = (gid) => { const g = (D.GROUPS || []).find(x => x.id === gid); return g ? g.name : null; };
  const KIND_LABEL = { story:'📗 Story', reading:'📖 Comprensión lectora', listening:'🎧 Comprensión auditiva', grammar:'📝 Gramática', summary:'📚 Resumen', quizlet:'🃏 Quizlet' };
  const kindLabel = (k) => { k = String(k || '').toLowerCase(); for (const key of Object.keys(KIND_LABEL)) if (k.includes(key)) return KIND_LABEL[key]; return k ? ('📄 ' + k) : '📄 Material'; };
  const partLabel = (r) => r.part == null ? null : ((/listening|audio/.test(String(r.material_kind || '').toLowerCase()) ? 'Audio' : 'Historia') + ' #' + r.part);
  const fmtDate = (iso) => { try { return new Date(iso).toLocaleString('es-PE', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }); } catch (e) { return ''; } };
  const ST = {
    nuevo:     { label:'🔴 Nuevo',       bg:'#FDECEC', fg:'#C0392B' },
    revisando: { label:'👀 En revisión', bg:'#FFF3D6', fg:'#92510F' },
    resuelto:  { label:'✅ Resuelto',    bg:'#E8F5E9', fg:'#2E7D32' },
  };

  const shown = (rows || []).filter(r =>
    (whoF === 'all' ? true : whoF === 'teacher' ? r.reporter === 'teacher' : r.reporter !== 'teacher') &&
    (filter === 'todos' ? true :
     filter === 'abiertos' ? r.status !== 'resuelto' :
     r.status === filter));
  const counts = { nuevo:0, revisando:0, resuelto:0 };
  (rows || []).forEach(r => { if (counts[r.status] != null) counts[r.status]++; });

  return (
    <main className="page" style={{maxWidth:880, margin:'0 auto', padding:'26px 20px'}}>
      <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:14, flexWrap:'wrap'}}>
        <div style={{flex:1, minWidth:220}}>
          <h1 style={{fontFamily:"'Fredoka',sans-serif", fontSize:23, margin:0}}>🐞 Reportes de los materiales</h1>
          <div style={{fontSize:12.5, color:'var(--text-soft)', fontWeight:700}}>Reportes del botón 🐞 en los materiales — de alumnos y del profesor (desde 📚 Materiales) · {counts.nuevo} nuevo{counts.nuevo===1?'':'s'} · {counts.revisando} en revisión · {counts.resuelto} resuelto{counts.resuelto===1?'':'s'}</div>
        </div>
        <button className="btn-soft" onClick={load}>↻ Actualizar</button>
      </div>

      <div style={{display:'flex', gap:7, flexWrap:'wrap', marginBottom:14}}>
        {[['abiertos','📥 Abiertos'],['nuevo','🔴 Nuevos'],['revisando','👀 En revisión'],['resuelto','✅ Resueltos'],['todos','Todos']].map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{border:'1.5px solid ' + (filter===k?'#1F3A8A':'var(--border)'), background:filter===k?'#1F3A8A':'#fff', color:filter===k?'#fff':'var(--text-soft)', fontFamily:'inherit', fontWeight:800, fontSize:12, borderRadius:18, padding:'6px 13px', cursor:'pointer'}}>{l}</button>
        ))}
      </div>

      <div style={{display:'flex', alignItems:'center', gap:7, flexWrap:'wrap', marginBottom:14}}>
        <span style={{fontSize:11.5, fontWeight:800, color:'var(--text-mute,#A8A8A8)', textTransform:'uppercase', letterSpacing:'.05em'}}>Quién reporta</span>
        {[['all','Todos'],['teacher','👨‍🏫 Profesor'],['student','👩‍🎓 Alumnos']].map(([k,l]) => {
          const n = k==='all' ? (rows||[]).length : (rows||[]).filter(r => k==='teacher' ? r.reporter==='teacher' : r.reporter!=='teacher').length;
          return <button key={k} onClick={() => setWhoF(k)} style={{border:'1.5px solid ' + (whoF===k?'#0D6E4F':'var(--border)'), background:whoF===k?'#0D6E4F':'#fff', color:whoF===k?'#fff':'var(--text-soft)', fontFamily:'inherit', fontWeight:800, fontSize:12, borderRadius:18, padding:'6px 13px', cursor:'pointer'}}>{l} {n}</button>;
        })}
      </div>

      {err && <div style={{background:'#FFF3D6', border:'1.5px solid #F0C66B', borderRadius:12, padding:'12px 15px', fontSize:13, fontWeight:700, color:'#92510F', marginBottom:12}}>⚠ {err}</div>}
      {rows === null && <div style={{padding:30, textAlign:'center', color:'#999', fontWeight:700}}>Cargando reportes…</div>}
      {rows !== null && shown.length === 0 && !err && (
        <div style={{padding:'38px 20px', textAlign:'center', color:'#999', fontWeight:700, background:'#fff', border:'1.5px dashed var(--border)', borderRadius:14}}>
          <div style={{fontSize:38, marginBottom:6}}>🎉</div>
          {filter === 'abiertos' ? 'Sin reportes pendientes. Cuando un alumno toque 🐞 en su material —o el profesor envíe algo desde 📚 Materiales— aparecerá aquí.' : 'Nada en este filtro.'}
        </div>
      )}

      <div style={{display:'flex', flexDirection:'column', gap:10}}>
        {shown.map(r => {
          const st = ST[r.status] || ST.nuevo;
          const who = r.reporter === 'teacher' ? '👨‍🏫 Profesor' : (nameOf(r.user_id) || (r.user_id ? ('Alumno ' + r.user_id) : 'Anónimo (fuera de la plataforma)'));
          const grp = groupOf(r.group_id);
          const part = partLabel(r);
          return (
            <div key={r.id} style={{background:'#fff', border:'1px solid var(--border)', borderLeft:'4px solid ' + st.fg, borderRadius:13, padding:'13px 16px', opacity: busyId === r.id ? .55 : 1}}>
              <div style={{display:'flex', alignItems:'center', gap:9, flexWrap:'wrap', marginBottom:7}}>
                <span style={{fontSize:11, fontWeight:800, background:st.bg, color:st.fg, borderRadius:11, padding:'3px 10px'}}>{st.label}</span>
                <span style={{fontWeight:800, fontSize:13.5}}>{who}</span>
                {grp && <span style={{fontSize:11, fontWeight:700, color:'var(--text-soft)'}}>· {grp}</span>}
                <span style={{marginLeft:'auto', fontSize:11, fontWeight:700, color:'var(--text-mute,#A8A8A8)'}}>{fmtDate(r.created_at)}</span>
              </div>
              <div style={{fontSize:12.5, fontWeight:700, color:'#1F3A8A', marginBottom:6}}>
                {kindLabel(r.material_kind)}{r.material_name ? ' · ' + r.material_name : ''}{part ? ' · ' + part : ''}
                <span style={{color:'var(--text-mute,#A8A8A8)', fontWeight:600}}> · {r.module_id}{r.activity_id ? ' / ' + r.activity_id : ''}</span>
              </div>
              <div style={{fontSize:13.5, lineHeight:1.55, color:'var(--text,#2A2A2A)', fontWeight:600, background:'#FAFAF6', border:'1px solid var(--border-soft,#F0EDE4)', borderRadius:10, padding:'9px 12px', whiteSpace:'pre-wrap'}}>{r.message}</div>
              <div style={{display:'flex', gap:7, flexWrap:'wrap', marginTop:10}}>
                {r.url && <a href={r.url} target="_blank" rel="noopener" style={{fontSize:12, fontWeight:800, color:'#1F3A8A', border:'1.5px solid #C9D6F0', background:'#F4F7FE', borderRadius:16, padding:'6px 13px', textDecoration:'none'}}>🔗 Abrir el material</a>}
                {r.status === 'nuevo' && <button className="btn-soft" style={{padding:'6px 13px', fontSize:12}} onClick={() => setStatus(r, 'revisando')}>👀 En revisión</button>}
                {r.status !== 'resuelto' && <button className="btn-soft" style={{padding:'6px 13px', fontSize:12, background:'#E8F5E9', borderColor:'#A5D6A7', color:'#2E7D32'}} onClick={() => setStatus(r, 'resuelto')}>✅ Marcar resuelto</button>}
                {r.status === 'resuelto' && <button className="btn-soft" style={{padding:'6px 13px', fontSize:12}} onClick={() => setStatus(r, 'nuevo')}>↩ Reabrir</button>}
                <button className="btn-soft" style={{padding:'6px 13px', fontSize:12, color:'#C0392B', borderColor:'#F0C9C9', marginLeft:'auto'}} onClick={() => remove(r)}>🗑 Borrar</button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

Object.assign(window, { DevDashboard });
