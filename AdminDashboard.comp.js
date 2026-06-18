/* Panel del Administrador (rol 'admin', entra por la pestaña Profesor).
 * Lista de alumnos + pagos + inscripciones, confirma/rechaza pagos, configura
 * montos y día de pago (con excepciones), y puede cambiar su contraseña.
 */
function AdminDashboard({ user, onLogout }) {
  const D = window.JUCUM_DATA; const P = window.JUCUM_PAY;
  const [view, setView] = React.useState('payments');
  const [, setTick] = React.useState(0);
  const refresh = () => setTick(t => t + 1);

  React.useEffect(() => { document.body.removeAttribute('data-level'); }, []);
  // Recarga de la nube al entrar (por si hay pagos nuevos desde otros equipos)
  React.useEffect(() => { if (P.cloudLoad) P.cloudLoad().then(refresh); }, []);

  const payments = P.getAllPayments();
  const pending = payments.filter(p => p.status === 'por_confirmar');

  return (
    <>
      <header className="app-header">
        <div className="app-logo">
          <img src="logo-jucum.png" alt="JUCUM EC" />
          <div className="pgtitle">Administración</div>
        </div>
        <div className="app-right">
          <span className="role-pill t">🛠️ Administrador</span>
          <a className="nav-link" href="#" onClick={(e)=>{e.preventDefault();setView('payments');}} style={{position:'relative'}}>💳 Pagos{pending.length > 0 && <span className="nav-dot">{pending.length > 9 ? '9+' : pending.length}</span>}</a>
          <a className="nav-link" href="#" onClick={(e)=>{e.preventDefault();setView('students');}}>👥 Alumnos</a>
          <a className="nav-link" href="#" onClick={(e)=>{e.preventDefault();setView('config');}}>⚙️ Configuración</a>
          <a className="nav-link" href="#" onClick={(e)=>{e.preventDefault();setView('account');}}>🔑 Mi cuenta</a>
          <NotifBell userId="admin" onNotifClick={(n)=> n.link==='payments' && setView('payments')} />
          <div className="user-pill"><div className="ava" style={{background:'linear-gradient(135deg,#5C6BC0,#283593)'}}>A</div><span>Admin</span></div>
          <button className="logout-btn" onClick={onLogout} title="Cerrar sesión">⎋ Salir</button>
        </div>
      </header>

      {view === 'students' ? <AdminStudents onChange={refresh} />
        : view === 'config' ? <AdminConfig onChange={refresh} />
        : view === 'account' ? <AdminAccount user={user} />
        : <AdminPayments onChange={refresh} />}
    </>
  );
}

function AdminPayments({ onChange }) {
  const D = window.JUCUM_DATA; const P = window.JUCUM_PAY;
  const cfg = P.getConfig();
  const payments = P.getAllPayments();
  const [filter, setFilter] = React.useState('por_confirmar');
  const [shot, setShot] = React.useState(null);
  const nameOf = (sid) => (D.STUDENTS.find(s => s.id === sid) || {}).fullName || sid;
  const groupOf = (sid) => { const s = D.STUDENTS.find(s => s.id === sid); const g = s && D.GROUPS.find(g => g.id === s.group); return g ? g.name : ''; };
  const list = payments.filter(p => filter === 'todos' ? true : p.status === filter);
  const counts = {
    por_confirmar: payments.filter(p => p.status === 'por_confirmar').length,
    confirmado: payments.filter(p => p.status === 'confirmado').length,
    rechazado: payments.filter(p => p.status === 'rechazado').length,
  };

  return (
    <main>
      <div className="welcome teacher">
        <div className="welcome-text">
          <div className="eyebrow t">💳 Pagos</div>
          <h1>Registro de pagos</h1>
          <p><b>{counts.por_confirmar}</b> por confirmar · {counts.confirmado} confirmados · {counts.rechazado} rechazados</p>
        </div>
      </div>

      <div className="mm-tabs">
        <button className={`mm-tab ${filter==='por_confirmar'?'on':''}`} onClick={()=>setFilter('por_confirmar')}>🕒 Por confirmar <span className="mm-count">{counts.por_confirmar}</span></button>
        <button className={`mm-tab ${filter==='confirmado'?'on':''}`} onClick={()=>setFilter('confirmado')}>✅ Confirmados <span className="mm-count">{counts.confirmado}</span></button>
        <button className={`mm-tab ${filter==='rechazado'?'on':''}`} onClick={()=>setFilter('rechazado')}>⚠️ Rechazados <span className="mm-count">{counts.rechazado}</span></button>
        <button className={`mm-tab ${filter==='todos'?'on':''}`} onClick={()=>setFilter('todos')}>Todos</button>
      </div>

      {list.length === 0 ? <div className="scard"><div className="empty-state"><div className="icon">🧾</div>Sin pagos en esta categoría.</div></div> : (
        <div style={{display:'flex', flexDirection:'column', gap:10}}>
          {list.map(p => {
            const meta = p.status === 'confirmado' ? {l:'✅ Confirmado', c:'#2E7D32', bg:'#E8F5E9'} : p.status === 'rechazado' ? {l:'⚠️ Rechazado', c:'#C62828', bg:'#FFEBEE'} : {l:'🕒 Por confirmar', c:'#E65100', bg:'#FFF3E0'};
            return (
              <div key={p.id} className="scard" style={{padding:14}}>
                <div className="row-flex" style={{gap:12, flexWrap:'wrap'}}>
                  <div style={{flex:1, minWidth:200}}>
                    <div style={{fontWeight:800, fontSize:14}}>{nameOf(p.studentId)} <span style={{fontWeight:600, color:'var(--text-soft)', fontSize:12}}>· {groupOf(p.studentId)}</span></div>
                    <div className="sm-meta">{P.labelMode(p.mode)} · DNI {p.dni} · periodo {p.period}{p.amount?` · ${cfg.currency} ${p.amount}`:''}</div>
                    <div className="sm-meta">Registrado {new Date(p.registeredAt).toLocaleString('es-PE',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}{p.confirmedAt?` · confirmado ${new Date(p.confirmedAt).toLocaleDateString('es-PE')}`:''}</div>
                  </div>
                  <span className="mm-chip" style={{background:meta.bg, color:meta.c}}>{meta.l}</span>
                </div>
                <div className="row-flex" style={{gap:8, marginTop:10}}>
                  {p.screenshot && <button className="att-btn" onClick={()=>setShot(p.screenshot)}>🖼️ Ver captura</button>}
                  {p.status !== 'confirmado' && <button className="att-btn" style={{borderColor:'#A5D6A7', color:'#2E7D32'}} onClick={()=>{ P.confirmPayment(p.id); onChange(); }}>✅ Confirmar</button>}
                  {p.status !== 'rechazado' && <button className="att-btn" style={{borderColor:'#EF9A9A', color:'#C62828'}} onClick={()=>{ const note = prompt('Motivo (opcional) para el alumno:', 'Revisa los datos e inténtalo de nuevo.'); if (note!==null){ P.rejectPayment(p.id, note); onChange(); } }}>⚠️ Rechazar</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {shot && (
        <div className="modal-backdrop" onClick={()=>setShot(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:560}}>
            <div className="modal-head"><div className="modal-title">🖼️ Captura del pago</div><button className="modal-close" onClick={()=>setShot(null)}>✕</button></div>
            <div className="modal-body"><img src={shot} alt="captura" style={{width:'100%', borderRadius:10}} /></div>
          </div>
        </div>
      )}
    </main>
  );
}

function AdminStudents({ onChange }) {
  const D = window.JUCUM_DATA; const P = window.JUCUM_PAY;
  const [q, setQ] = React.useState('');
  const students = D.STUDENTS.filter(s => !q || s.fullName.toLowerCase().includes(q.toLowerCase()) || (s.username||'').includes(q.toLowerCase()));
  const cfg = P.getConfig();
  return (
    <main>
      <div className="welcome teacher">
        <div className="welcome-text">
          <div className="eyebrow t">👥 Alumnos</div>
          <h1>{D.STUDENTS.length} alumnos</h1>
          <p>Estado de pago e inscripción de cada alumno.</p>
        </div>
      </div>
      <input className="input-text" style={{width:'100%', maxWidth:320, margin:'16px 0'}} placeholder="🔍 Buscar alumno…" value={q} onChange={e=>setQ(e.target.value)} />
      <div className="student-table">
        <div className="st-head" style={{gridTemplateColumns:'2fr 1fr 1.2fr 1.2fr 1fr'}}>
          <div>Alumno</div><div>Nivel</div><div>Inscripción</div><div>Estado de pago</div><div>Último pago</div>
        </div>
        {students.map(s => {
          const st = P.getAccountStatus(s);
          const g = D.GROUPS.find(g => g.id === s.group);
          const last = P.getStudentPayments(s.id).find(p => p.status === 'confirmado');
          const sm = { al_dia:{l:'✅ Al día',c:'#2E7D32'}, en_revision:{l:'🕒 En revisión',c:'#E65100'}, por_vencer:{l:`⏳ ${st.daysLeft}d para vencer`,c:'#E65100'}, bloqueado:{l:'🔒 Bloqueado',c:'#C62828'} }[st.state];
          return (
            <div key={s.id} className="st-row" style={{gridTemplateColumns:'2fr 1fr 1.2fr 1.2fr 1fr', cursor:'default'}}>
              <div className="col-name"><div className="st-name">{s.fullName}</div><div className="st-user">@{s.username}</div></div>
              <div>{D.LEVELS[s.level]?.code}</div>
              <div style={{fontSize:12}}>{g?.startDate || '—'}<div className="st-user">{g?.name || ''}</div></div>
              <div style={{color:sm.c, fontWeight:700, fontSize:12.5}}>{sm.l}</div>
              <div style={{fontSize:12}}>{last ? new Date(last.confirmedAt).toLocaleDateString('es-PE',{day:'numeric',month:'short'}) : '—'}</div>
            </div>
          );
        })}
      </div>
      <div className="settings-hint" style={{marginTop:10}}>La inscripción a módulos (niveles A1 y A2) y más datos administrativos se ampliarán próximamente.</div>
    </main>
  );
}

function AdminConfig({ onChange }) {
  const P = window.JUCUM_PAY; const D = window.JUCUM_DATA;
  const [cfg, setCfg] = React.useState(() => P.getConfig());
  const [savedMsg, setSavedMsg] = React.useState('');
  const setAmount = (lvl, key, val) => setCfg(c => ({ ...c, amounts: { ...c.amounts, [lvl]: { ...(c.amounts[lvl]||{}), [key]: Math.max(0, parseInt(val)||0) } } }));
  const save = () => { P.setConfig(cfg); setSavedMsg('✓ Configuración guardada y sincronizada.'); setTimeout(()=>setSavedMsg(''), 2500); onChange && onChange(); };

  const [excSid, setExcSid] = React.useState('');
  const [excDay, setExcDay] = React.useState(5);
  const addException = () => { if (!excSid) return; setCfg(c => ({ ...c, exceptions: { ...c.exceptions, [excSid]: Math.max(1, Math.min(28, parseInt(excDay)||5)) } })); };
  const delException = (sid) => setCfg(c => { const e={...c.exceptions}; delete e[sid]; return {...c, exceptions:e}; });
  const nameOf = (sid) => (D.STUDENTS.find(s => s.id === sid) || {}).fullName || sid;

  const LV = [['pre-a1','Pre-A1',['mensual']], ['a1','A1',['mensual','modulo']], ['a2','A2',['mensual','modulo']]];

  return (
    <main>
      <div className="welcome teacher">
        <div className="welcome-text"><div className="eyebrow t">⚙️ Configuración</div><h1>Montos y día de pago</h1><p>Define lo que pagan los alumnos y la fecha de pago.</p></div>
      </div>

      <div className="scard" style={{marginTop:18, borderLeft:`5px solid ${cfg.enforce?'#2EA84B':'#9E9E9E'}`}}>
        <div className="sec-head"><div className="sec-title">🚦 Control de pagos</div></div>
        <label className="check-row"><input type="checkbox" checked={!!cfg.enforce} onChange={e=>setCfg(c=>({...c, enforce:e.target.checked}))} /><span><b>Activar control de pagos</b> (recordatorio de 7 días + bloqueo por falta de pago)</span></label>
        <div className="settings-hint" style={{marginTop:6}}>{cfg.enforce ? '🟢 Activo: los alumnos sin pago al día verán el recordatorio y, pasados 7 días del día de pago, se bloquearán hasta registrar su pago.' : '⚪ Apagado: nadie se bloquea. Actívalo cuando ya hayas definido los montos y comunicado las fechas a los alumnos.'}</div>
      </div>

      <div className="scard" style={{marginTop:18}}>
        <div className="sec-head"><div className="sec-title">📅 Día de pago</div></div>
        <div className="settings-hint">Un día fijo del mes, igual para todos (1–28). Las excepciones por alumno se definen más abajo.</div>
        <div className="row-flex" style={{marginTop:8}}>
          <input type="number" min="1" max="28" className="input-text" style={{width:90}} value={cfg.payDay} onChange={e=>setCfg(c=>({...c, payDay:Math.max(1,Math.min(28,parseInt(e.target.value)||1))}))} />
          <span className="settings-hint" style={{margin:0}}>de cada mes</span>
        </div>
      </div>

      <div className="scard" style={{marginTop:18}}>
        <div className="sec-head"><div className="sec-title">💰 Montos por nivel</div><span className="sec-meta">Moneda {cfg.currency}</span></div>
        <div style={{display:'grid', gap:14}}>
          {LV.map(([lvl, label, modes]) => (
            <div key={lvl} className="row-flex" style={{gap:14, flexWrap:'wrap', borderTop:'1px dashed var(--border)', paddingTop:12}}>
              <div style={{fontWeight:800, minWidth:70}}>{label}</div>
              {modes.map(mk => (
                <div key={mk} className="row-flex" style={{gap:6}}>
                  <span className="settings-hint" style={{margin:0}}>{mk==='mensual'?'Mensual':'Por módulo'} {cfg.currency}</span>
                  <input type="number" min="0" className="input-text" style={{width:90}} value={(cfg.amounts[lvl]||{})[mk] || 0} onChange={e=>setAmount(lvl, mk, e.target.value)} />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="settings-hint" style={{marginTop:10}}>“Por módulo” solo aplica a A1 y A2. El “pago total” se valida manualmente (válido los primeros {cfg.totalMonths} meses; descuenta el primer mes ya pagado).</div>
      </div>

      <div className="scard" style={{marginTop:18}}>
        <div className="sec-head"><div className="sec-title">🎯 Excepciones de día de pago</div></div>
        <div className="settings-hint">Para un alumno con un día de pago distinto al general.</div>
        <div className="row-flex" style={{marginTop:8, gap:8, flexWrap:'wrap'}}>
          <select className="input-text" style={{maxWidth:240}} value={excSid} onChange={e=>setExcSid(e.target.value)}>
            <option value="">Elige alumno…</option>
            {D.STUDENTS.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
          </select>
          <input type="number" min="1" max="28" className="input-text" style={{width:80}} value={excDay} onChange={e=>setExcDay(e.target.value)} />
          <button className="att-btn" onClick={addException}>+ Agregar</button>
        </div>
        {Object.keys(cfg.exceptions||{}).length > 0 && (
          <div className="sm-list" style={{marginTop:10}}>
            {Object.entries(cfg.exceptions).map(([sid, day]) => (
              <div key={sid} className="muted-row"><b>{nameOf(sid)}</b><span className="muted-until">Día {day}</span><button className="att-btn" onClick={()=>delException(sid)}>Quitar</button></div>
            ))}
          </div>
        )}
      </div>

      <div className="modal-actions" style={{maxWidth:1100, margin:'14px auto 0'}}>
        {savedMsg && <span className="pwd-ok" style={{marginRight:'auto'}}>{savedMsg}</span>}
        <button className="btn-save" onClick={save}>💾 Guardar configuración</button>
      </div>
    </main>
  );
}

function AdminAccount({ user }) {
  const [cur, setCur] = React.useState('');
  const [pw1, setPw1] = React.useState('');
  const [pw2, setPw2] = React.useState('');
  const [msg, setMsg] = React.useState('');
  const [err, setErr] = React.useState('');
  const change = async () => {
    setErr(''); setMsg('');
    if (pw1.length < 4) { setErr('La nueva contraseña debe tener al menos 4 caracteres.'); return; }
    if (pw1 !== pw2) { setErr('Las contraseñas no coinciden.'); return; }
    if (window.JUCUM_SB) {
      try {
        const uname = user.username || 'admi';
        const sb = window.JUCUM_SB.getClient();
        const { data } = await sb.from('users').select('password').eq('username', uname).maybeSingle();
        if (!data || data.password !== cur) { setErr('Tu contraseña actual no es correcta.'); return; }
        await sb.from('users').update({ password: pw1 }).eq('username', uname);
        setMsg('✓ Contraseña actualizada.'); setCur(''); setPw1(''); setPw2('');
      } catch (e) { setErr('Error: ' + e.message); }
    } else { setMsg('✓ (modo local) Contraseña actualizada.'); setCur(''); setPw1(''); setPw2(''); }
  };
  return (
    <main>
      <div className="welcome teacher"><div className="welcome-text"><div className="eyebrow t">🔑 Mi cuenta</div><h1>Cambiar contraseña</h1><p>Usuario administrativo: <b>{user.username || 'admi'}</b></p></div></div>
      <div className="scard" style={{marginTop:18, maxWidth:440}}>
        {err && <div className="err" style={{marginBottom:12}}>⚠ {err}</div>}
        {msg && <div className="pwd-ok" style={{marginBottom:12}}>{msg}</div>}
        <div className="field"><label>Contraseña actual</label><input type="password" className="input-text" style={{width:'100%'}} value={cur} onChange={e=>setCur(e.target.value)} /></div>
        <div className="field"><label>Nueva contraseña</label><input type="password" className="input-text" style={{width:'100%'}} value={pw1} onChange={e=>setPw1(e.target.value)} /></div>
        <div className="field"><label>Repite la nueva contraseña</label><input type="password" className="input-text" style={{width:'100%'}} value={pw2} onChange={e=>setPw2(e.target.value)} /></div>
        <button className="btn-save" style={{marginTop:8}} onClick={change}>🔑 Actualizar contraseña</button>
      </div>
    </main>
  );
}

Object.assign(window, { AdminDashboard, AdminPayments, AdminStudents, AdminConfig, AdminAccount });
