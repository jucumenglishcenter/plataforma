/* Panel del Administrador (rol 'admin').
 * Estructura:
 *   💳 Gestión de pagos  → montos/día, confirmar pagos, avisos a grupos, registro manual
 *   👥 Registro de alumnos → todos los alumnos (origen + fecha + grupo), avance, reset, eliminar, enlace de autoregistro
 *   📋 Asistencia
 *   🔑 Mi cuenta
 *   ❓ Necesitas ayuda → tutorial guiado (AdminTutorial)
 */
function AdminDashboard({ user, onLogout }) {
  const D = window.JUCUM_DATA; const P = window.JUCUM_PAY;
  const [view, setView] = React.useState(() => (window.JUCUM_NAV ? window.JUCUM_NAV.load('admin', 'pagos') : 'pagos'));
  React.useEffect(() => { if (window.JUCUM_NAV) window.JUCUM_NAV.save('admin', view); }, [view]);
  const [, setTick] = React.useState(0);
  const refresh = () => setTick(t => t + 1);
  const [helpOpen, setHelpOpen] = React.useState(false);

  React.useEffect(() => { document.body.removeAttribute('data-level'); }, []);
  React.useEffect(() => { if (P.cloudLoad) P.cloudLoad().then(refresh); }, []);
  React.useEffect(() => { if (window.JUCUM_REG && window.JUCUM_REG.cloudLoadRegistrations) window.JUCUM_REG.cloudLoadRegistrations().then(refresh); }, []);

  const payments = P.getAllPayments();
  const pending = payments.filter(p => p.status === 'por_confirmar');

  return (
    <>
      <header className="app-header">
        <div className="app-logo">
          <img src={window.JUCUM_LOGO || 'logo-jucum.png'} alt="JUCUM EC" />
          <div className="pgtitle">Administración</div>
        </div>
        <div className="app-right">
          <span className="role-pill t">🛠️ Administrador</span>
          <a data-tut="admin-pagos" className={`nav-link ${view==='pagos'?'active':''}`} href="#" onClick={(e)=>{e.preventDefault();setView('pagos');}} style={{position:'relative'}}>💳 Gestión de pagos{pending.length > 0 && <span className="nav-dot">{pending.length > 9 ? '9+' : pending.length}</span>}</a>
          <a data-tut="admin-registro" className={`nav-link ${view==='registro'?'active':''}`} href="#" onClick={(e)=>{e.preventDefault();setView('registro');}}>👥 Registro de alumnos</a>
          <a data-tut="admin-attendance" className={`nav-link ${view==='attendance'?'active':''}`} href="#" onClick={(e)=>{e.preventDefault();setView('attendance');}}>📋 Asistencia</a>
          <a className={`nav-link ${view==='account'?'active':''}`} href="#" onClick={(e)=>{e.preventDefault();setView('account');}}>🔑 Mi cuenta</a>
          <button data-tut="admin-help" className="help-btn" onClick={()=>setHelpOpen(true)} title="Ver el tutorial del panel">❓ Necesitas ayuda</button>
          <span data-tut="admin-bell"><NotifBell userId="admin" onNotifClick={(n)=> n.link==='payments' && setView('pagos')} /></span>
          <div className="user-pill"><div className="ava" style={{background:'linear-gradient(135deg,#5C6BC0,#283593)'}}>A</div><span>Admin</span></div>
          <button className="logout-btn" onClick={onLogout} title="Cerrar sesión">⎋ Salir</button>
        </div>
      </header>

      {view === 'registro' ? <AdminRoster onChange={refresh} />
        : view === 'attendance' ? <AdminAttendance />
        : view === 'account' ? <AdminAccount user={user} />
        : <AdminGestionPagos onChange={refresh} />}

      {window.AdminTutorial && <AdminTutorial open={helpOpen} onClose={()=>setHelpOpen(false)} />}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * Puerta de confirmación con la contraseña de la ADMINISTRADORA.
 * Opcionalmente pide una nueva contraseña (para el reset de alumnos).
 * ═══════════════════════════════════════════════════════════════════ */
function AdminPasswordGate({ title, message, confirmLabel, onConfirm, onClose, danger, withNewPassword }) {
  const [pwd, setPwd] = React.useState('');
  const [newPwd, setNewPwd] = React.useState('');
  const [err, setErr] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const submit = async () => {
    if (!pwd) { setErr('Ingresa tu contraseña de administradora.'); return; }
    setBusy(true); setErr('');
    let ok = false;
    if (window.JUCUM_SB?.verifyAdminPassword) ok = await window.JUCUM_SB.verifyAdminPassword(pwd);
    else { const c = window.JUCUM_DATA?.DEMO_CREDS?.admin?.password || '1234'; ok = pwd === c; }
    setBusy(false);
    if (!ok) { setErr('Contraseña incorrecta. La acción no se realizó.'); return; }
    onConfirm(withNewPassword ? (newPwd.trim() || '1234') : undefined);
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" style={{maxWidth:440}} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{danger ? '⚠️' : '🔐'} {title}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className={danger ? 'err' : 'settings-hint'} style={{marginBottom:12, lineHeight:1.5}}>{message}</div>
          {withNewPassword && (
            <div className="settings-block" style={{paddingTop:0}}>
              <div className="settings-label">Nueva contraseña del alumno</div>
              <div className="settings-hint">Déjalo vacío para volver a la contraseña inicial <b>1234</b>.</div>
              <input type="text" className="input-text" style={{width:'100%'}} placeholder="1234" value={newPwd} onChange={e=>setNewPwd(e.target.value)} />
            </div>
          )}
          {err && <div className="err" style={{marginBottom:12}}>⚠ {err}</div>}
          <div className="settings-label" style={{marginBottom:3}}>Tu contraseña de administradora</div>
          <input type="password" className="input-text" autoFocus placeholder="Contraseña de administradora"
                 value={pwd} onChange={e => setPwd(e.target.value)}
                 onKeyDown={e => { if (e.key === 'Enter') submit(); }} style={{width:'100%'}} />
          <div className="modal-actions">
            <button className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button className="btn-save" onClick={submit} disabled={busy} style={danger ? {background:'linear-gradient(135deg,#E11930,#B71C1C)'} : undefined}>{busy ? 'Verificando…' : (confirmLabel || 'Confirmar')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * Registrar un pago de forma individual (en nombre del alumno).
 * ═══════════════════════════════════════════════════════════════════ */
function ManualPaymentModal({ student, onClose, onDone }) {
  const D = window.JUCUM_DATA; const P = window.JUCUM_PAY;
  const cfg = P.getConfig();
  const [mode, setMode] = React.useState(student.payMode || 'mensual');
  const [period, setPeriod] = React.useState(P.currentPeriod());
  const suggested = (cfg.amounts[student.level] || {})[mode] || 0;
  const [amount, setAmount] = React.useState(suggested || '');
  const [note, setNote] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { setAmount((cfg.amounts[student.level] || {})[mode] || ''); }, [mode]);
  const MODES = [{k:'mensual',l:'Mensual'},{k:'modulo',l:'Por módulo'},{k:'total',l:'Pago total'}];
  const save = () => {
    setBusy(true);
    P.registerManualPayment(student.id, {
      dni: student.dni || '', mode, level: student.level, period,
      amount: amount === '' ? null : parseInt(amount) || 0, note,
    });
    setBusy(false);
    onDone && onDone();
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" style={{maxWidth:460}} onClick={e=>e.stopPropagation()}>
        <div className="modal-head"><div className="modal-title">💳 Registrar pago · {student.fullName}</div><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div className="settings-hint" style={{marginBottom:12}}>El pago quedará <b>confirmado</b> de inmediato (lo registras tú, en nombre del alumno). El alumno recibirá un aviso.</div>
          <div className="settings-block" style={{paddingTop:0}}>
            <div className="settings-label">Modalidad</div>
            <div className="preset-row">{MODES.map(m => <button key={m.k} className={`preset ${mode===m.k?'on':''}`} onClick={()=>setMode(m.k)}>{m.l}</button>)}</div>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
            <div className="settings-block"><div className="settings-label">Periodo (mes)</div><input type="month" className="input-text" style={{width:'100%'}} value={period} onChange={e=>setPeriod(e.target.value)} /></div>
            <div className="settings-block"><div className="settings-label">Monto ({cfg.currency})</div><input type="number" min="0" className="input-text" style={{width:'100%'}} value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0" /></div>
          </div>
          <div className="settings-block"><div className="settings-label">Nota (opcional)</div><input className="input-text" style={{width:'100%'}} value={note} onChange={e=>setNote(e.target.value)} placeholder="Ej: pagó en efectivo en recepción" /></div>
          <div className="modal-actions"><button className="btn-cancel" onClick={onClose}>Cancelar</button><button className="btn-save" onClick={save} disabled={busy}>{busy?'Registrando…':'✅ Registrar y confirmar'}</button></div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * REGISTRO DE ALUMNOS — todos los alumnos, con origen + fecha + grupo,
 * avance individual, reset/eliminar (con contraseña de admin) y el enlace
 * de autoregistro.
 * ═══════════════════════════════════════════════════════════════════ */
function originOf(s, regByKey) {
  if (s.source === 'self') return { l:'🔗 Por enlace', c:'#0D6E4F', bg:'#E7F6EE' };
  if (s.source === 'admin') return { l:'✍️ Creado por ti', c:'#1F3A8A', bg:'#EAF0FB' };
  // Derivación para alumnos antiguos sin 'source': ¿hay una inscripción suya?
  const key = (s.dni && String(s.dni).trim()) || (s.fullName || '').trim().toLowerCase();
  if (key && regByKey && regByKey[key]) return { l:'🔗 Por enlace', c:'#0D6E4F', bg:'#E7F6EE' };
  return { l:'✍️ Creado por ti', c:'#1F3A8A', bg:'#EAF0FB' };
}

function AdminRoster({ onChange }) {
  const D = window.JUCUM_DATA; const P = window.JUCUM_PAY;
  const [q, setQ] = React.useState('');
  const [groupF, setGroupF] = React.useState('all');
  const [originF, setOriginF] = React.useState('all');
  const [sort, setSort] = React.useState('fecha');   // fecha · nombre
  const [reg, setReg] = React.useState(false);
  const [viewing, setViewing] = React.useState(null);  // alumno → reporte de avance
  const [paying, setPaying] = React.useState(null);
  const [contacting, setContacting] = React.useState(null);
  const [notifying, setNotifying] = React.useState(null);
  const [resetting, setResetting] = React.useState(null);
  const [deleting, setDeleting] = React.useState(null);
  const [, setT] = React.useState(0);
  const bump = () => { setT(t => t + 1); onChange && onChange(); };

  // Mapa de inscripciones (para derivar origen de alumnos antiguos)
  const regByKey = React.useMemo(() => {
    const m = {};
    try {
      (window.JUCUM_REG ? window.JUCUM_REG.listRegistrations() : []).forEach(r => {
        const k1 = r.dni && String(r.dni).trim(); if (k1) m[k1] = true;
        const k2 = (r.fullName || '').trim().toLowerCase(); if (k2) m[k2] = true;
      });
    } catch (e) {}
    return m;
  }, [D.STUDENTS.length]);

  const regLink = (location.origin && location.origin !== 'null' ? location.origin : 'https://jucum-english-center.netlify.app') + location.pathname.replace(/[^/]*$/, '') + 'registro.html';
  const [copied, setCopied] = React.useState(false);

  let list = D.STUDENTS.filter(s => {
    if (q) {
      const needle = q.toLowerCase();
      const hay = [s.fullName, s.username, s.dni, s.email, s.phone, s.guardianName, s.guardianDni].filter(Boolean).map(x => String(x).toLowerCase());
      if (!hay.some(h => h.includes(needle))) return false;
    }
    if (groupF !== 'all' && s.group !== groupF) return false;
    if (originF !== 'all') { const o = (originOf(s, regByKey).l.includes('enlace')) ? 'self' : 'admin'; if (o !== originF) return false; }
    return true;
  });
  const dateVal = (s) => s.createdAt ? Date.parse(s.createdAt) : 0;
  list = [...list].sort((a,b) => sort === 'nombre' ? a.fullName.localeCompare(b.fullName,'es') : (dateVal(b) - dateVal(a)));

  const groupsSorted = [...D.GROUPS].sort((a,b) => a.name.localeCompare(b.name,'es'));
  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('es-PE',{day:'numeric',month:'short',year:'numeric'}) : '—';

  if (viewing) {
    return <StudentReport student={viewing} onBack={()=>setViewing(null)} forTeacher />;
  }

  return (
    <main>
      <div className="welcome teacher">
        <div className="welcome-text">
          <div className="eyebrow t">👥 Registro de alumnos</div>
          <h1>{D.STUDENTS.length} alumnos</h1>
          <p>Todos tus alumnos con su origen y fecha de inscripción. Toca a un alumno para ver su avance completo.</p>
        </div>
        <button className="btn-settings" onClick={()=>setReg(true)}>➕ Registrar alumno</button>
        <button className="btn-settings" style={{marginLeft:8, background:'#455A64'}} onClick={()=>exportRosterCSV(list, D, regByKey)}>⬇️ Exportar CSV</button>
      </div>

      {/* Enlace de autoregistro */}
      <div className="scard" style={{marginTop:18, background:'#EEF2FB', borderColor:'#C9D4F0'}}>
        <div className="sec-head"><div className="sec-title">🔗 Enlace de autoregistro</div></div>
        <div className="settings-hint" style={{marginBottom:8}}>Comparte este enlace (por WhatsApp, por ejemplo) para que los alumnos se inscriban solos. Aparecerán en esta lista con la etiqueta <b>🔗 Por enlace</b>.</div>
        <div className="row-flex" style={{gap:8, flexWrap:'wrap'}}>
          <input className="input-text" readOnly value={regLink} onFocus={e=>e.target.select()} style={{flex:1, minWidth:240, fontSize:13}} />
          <button className="btn-save" onClick={()=>{ try{ navigator.clipboard.writeText(regLink); setCopied(true); setTimeout(()=>setCopied(false),1500);}catch(e){} }}>{copied?'✅ Copiado':'📋 Copiar enlace'}</button>
          <a className="att-btn" href={regLink} target="_blank" rel="noreferrer">Abrir</a>
        </div>
      </div>

      {/* Controles */}
      <div className="tt-toolbar">
        <div className="tt-search"><span>🔍</span><input placeholder="Buscar por nombre, usuario, DNI, teléfono…" value={q} onChange={e=>setQ(e.target.value)} /></div>
        <div className="tt-sort">
          <span className="tt-sort-lab">Grupo</span>
          <select value={groupF} onChange={e=>setGroupF(e.target.value)}>
            <option value="all">Todos</option>
            {groupsSorted.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div className="tt-sort">
          <span className="tt-sort-lab">Origen</span>
          <select value={originF} onChange={e=>setOriginF(e.target.value)}>
            <option value="all">Todos</option>
            <option value="admin">✍️ Creados por ti</option>
            <option value="self">🔗 Por enlace</option>
          </select>
        </div>
        <div className="tt-sort">
          <span className="tt-sort-lab">Ordenar</span>
          <select value={sort} onChange={e=>setSort(e.target.value)}>
            <option value="fecha">Fecha de inscripción</option>
            <option value="nombre">Nombre (A–Z)</option>
          </select>
        </div>
      </div>
      <div className="tt-count">{list.length} alumno{list.length===1?'':'s'} mostrado{list.length===1?'':'s'}</div>

      <div className="roster-list" style={{marginTop:12, display:'flex', flexDirection:'column', gap:8}}>
        {list.length === 0 ? <div className="scard"><div className="empty-state"><div className="icon">👥</div>No hay alumnos con estos filtros.</div></div> : list.map(s => {
          const o = originOf(s, regByKey);
          const g = D.GROUPS.find(g => g.id === s.group);
          const lvl = D.LEVELS[s.level] || { code:'—', color:'#9AA', dark:'#667' };
          const st = P.getAccountStatus(s);
          const sm = { al_dia:{l:'✅ Al día',c:'#2E7D32'}, en_revision:{l:'🕒 En revisión',c:'#E65100'}, por_vencer:{l:`⏳ ${st.daysLeft}d`,c:'#E65100'}, bloqueado:{l:'🔒 Bloqueado',c:'#C62828'} }[st.state] || {l:'—',c:'#999'};
          const active = (s.totalMinutes||0) > 0;
          return (
            <div key={s.id} className="scard roster-row" style={{padding:'12px 14px'}}>
              <div className="row-flex" style={{gap:12, flexWrap:'wrap', alignItems:'center'}}>
                <div className="st-ava" style={{background:`linear-gradient(135deg,${lvl.color}80,${lvl.dark})`, width:40, height:40}}>{s.fullName.split(' ').map(n=>n[0]).slice(0,2).join('')}</div>
                <div style={{flex:1, minWidth:180}}>
                  <div style={{fontWeight:800, fontSize:14}}>{s.fullName} <span style={{fontWeight:600, color:'var(--text-soft)', fontSize:12}}>@{s.username}</span></div>
                  <div className="sm-meta">{lvl.code} · {g?.name || '⚠ sin grupo'} · inscrito {fmtDate(s.createdAt)}</div>
                </div>
                <span className="mm-chip" style={{background:o.bg, color:o.c}}>{o.l}</span>
                <div style={{textAlign:'center', minWidth:64}}>
                  <div style={{fontSize:13, fontWeight:800, color:'#FF6F00'}}>🔥 {s.streak||0}</div>
                  <div className="st-user">racha</div>
                </div>
                <div style={{textAlign:'center', minWidth:56}}>
                  <div style={{fontSize:13, fontWeight:800, color: active ? (s.avgScore>=70?'#2E7D32':s.avgScore>=40?'#E65100':'#C62828') : '#9AA'}}>{active ? (s.avgScore||0)+'%' : '—'}</div>
                  <div className="st-user">prom.</div>
                </div>
                <span className="mm-chip" style={{background:'#F3F3EE', color:sm.c}}>{sm.l}</span>
              </div>
              <div className="row-flex" style={{gap:6, marginTop:10, flexWrap:'wrap'}}>
                <button className="att-btn" style={{borderColor:'#90CAF9', color:'#1565C0'}} onClick={()=>setViewing(s)}>📊 Ver avance</button>
                <button className="att-btn" onClick={()=>setPaying(s)}>💳 Registrar pago</button>
                <button className="att-btn" onClick={()=>setNotifying(s)}>🔔 Avisar pago</button>
                <button className="att-btn" onClick={()=>setContacting(s)}>📞 Contactos</button>
                <button className="att-btn" onClick={()=>setResetting(s)}>🔑 Restablecer contraseña</button>
                <button className="att-btn" style={{borderColor:'#EF9A9A', color:'#C62828', marginLeft:'auto'}} onClick={()=>setDeleting(s)}>🗑 Eliminar</button>
              </div>
            </div>
          );
        })}
      </div>

      {reg && <RegisterStudentForm onClose={()=>setReg(false)} onDone={(stu, u)=>{ setReg(false); alert(`✅ ${stu.fullName} registrado. Usuario: ${stu.username||u} · contraseña 1234.`); bump(); }} />}
      {paying && <ManualPaymentModal student={paying} onClose={()=>setPaying(null)} onDone={()=>{ setPaying(null); bump(); }} />}
      {contacting && <ContactLogModal student={contacting} onClose={()=>setContacting(null)} />}
      {notifying && <NotifyPaymentModal student={notifying} onClose={()=>setNotifying(null)} onDone={()=>setNotifying(null)} />}

      {resetting && (
        <AdminPasswordGate
          title="Restablecer contraseña"
          withNewPassword
          message={`Vas a cambiar la contraseña de ${resetting.fullName} (@${resetting.username}). El alumno deberá usar la nueva contraseña para entrar. Confirma con tu contraseña de administradora.`}
          confirmLabel="🔑 Restablecer contraseña"
          onClose={()=>setResetting(null)}
          onConfirm={(newPwd)=>{
            if (window.JUCUM_SB) window.JUCUM_SB.update('users', resetting.id, { password: newPwd }).catch(e=>console.warn(e.message));
            const nm = resetting.fullName;
            setResetting(null);
            alert(`✅ Contraseña de ${nm} restablecida a "${newPwd}".\n\nPídele que al entrar la cambie por una que recuerde y la anote en un lugar seguro.`);
          }}
        />
      )}

      {deleting && (
        <AdminPasswordGate
          danger
          title="Eliminar alumno"
          message={`Vas a eliminar a ${deleting.fullName} (@${deleting.username}). Esto borra PARA SIEMPRE su cuenta y acceso, su progreso, XP y racha, sus tareas, notas y su historial. Esta acción NO se puede deshacer. Confirma con tu contraseña de administradora.`}
          confirmLabel="🗑️ Eliminar definitivamente"
          onClose={()=>setDeleting(null)}
          onConfirm={()=>{
            const idx = D.STUDENTS.findIndex(x => x.id === deleting.id);
            if (idx >= 0) { D.STUDENTS.splice(idx, 1); if (D.saveStudents) D.saveStudents(D.STUDENTS); }
            if (window.JUCUM_SB) window.JUCUM_SB.remove('users', deleting.id).catch(e=>console.warn('delStudent:', e.message));
            setDeleting(null);
            bump();
          }}
        />
      )}
    </main>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * GESTIÓN DE PAGOS — pagos + configuración + avisos a grupos + registro manual
 * ═══════════════════════════════════════════════════════════════════ */
/* ═════════════════════════════════════════════════
 * Aviso INDIVIDUAL de pago a un solo alumno.
 * ═════════════════════════════════════════════════ */
function NotifyPaymentModal({ student, onClose, onDone }) {
  const P = window.JUCUM_PAY;
  const [body, setBody] = React.useState('Te recordamos que tu pago está pendiente. Por favor comunícate con nosotros o registra tu pago directamente en la plataforma (sección 💳 Pagos). ¡Gracias!');
  const [sent, setSent] = React.useState(false);
  const send = () => { P.notifyPaymentIndividual(student.id, { body }); setSent(true); setTimeout(()=>{ onDone && onDone(); }, 900); };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" style={{maxWidth:440}} onClick={e=>e.stopPropagation()}>
        <div className="modal-head"><div className="modal-title">🔔 Avisar pago · {student.fullName}</div><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div className="settings-hint" style={{marginBottom:10}}>Llega a la campanita 🔔 del alumno, con enlace a Pagos.</div>
          <textarea className="eval-textarea" rows={4} value={body} onChange={e=>setBody(e.target.value)} style={{width:'100%'}} />
          <div className="modal-actions">
            {sent ? <span className="pwd-ok" style={{marginRight:'auto'}}>✅ Aviso enviado.</span> : <span />}
            <button className="btn-cancel" onClick={onClose}>Cerrar</button>
            <button className="btn-save" onClick={send} disabled={sent}>🔔 Enviar aviso</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════
 * Registro de CONTACTOS (llamadas, WhatsApp, etc.).
 * Guardado en `contact_logs` (script 24).
 * ═════════════════════════════════════════════════ */
async function loadContactLogs(studentId) {
  if (!window.JUCUM_SB) return [];
  try {
    const sb = window.JUCUM_SB.getClient();
    const { data, error } = await sb.from('contact_logs').select('*').eq('student_id', studentId).order('contacted_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (e) { console.warn('contact_logs load:', e.message); return []; }
}

function ContactLogModal({ student, onClose }) {
  const [logs, setLogs] = React.useState(null);
  const [method, setMethod] = React.useState('llamada');
  const [subject, setSubject] = React.useState('pago');
  const [outcome, setOutcome] = React.useState('contactado');
  const [note, setNote] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const reload = React.useCallback(() => loadContactLogs(student.id).then(setLogs), [student.id]);
  React.useEffect(() => { reload(); }, [reload]);

  const METHODS = [['llamada','📞 Llamada'],['whatsapp','💬 WhatsApp'],['presencial','🏫 Presencial'],['otro','✏️ Otro']];
  const SUBJECTS = [['pago','💳 Pago'],['asistencia','📋 Asistencia'],['progreso','📊 Progreso'],['otro','• Otro']];
  const OUTCOMES = [['contactado','✅ Contactado'],['no_contesta','📵 No contesta'],['pendiente','🕒 Pendiente'],['resuelto','🎉 Resuelto']];

  const save = async () => {
    if (!window.JUCUM_SB) { alert('Se necesita conexión con Supabase.'); return; }
    setBusy(true);
    try {
      const row = {
        id: 'ct-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        student_id: student.id, method, subject, outcome, note: note.trim() || null,
        created_by: (JSON.parse(localStorage.getItem('jucum_user')||'{}').username) || 'admi',
      };
      await window.JUCUM_SB.insert('contact_logs', row);
      setNote('');
      await reload();
    } catch (e) { alert('Error al guardar: ' + e.message); }
    setBusy(false);
  };

  const del = async (id) => {
    if (!confirm('¿Eliminar este contacto?')) return;
    try { await window.JUCUM_SB.remove('contact_logs', id); await reload(); } catch (e) { alert(e.message); }
  };

  const label = (arr, k) => (arr.find(x => x[0] === k) || [null, k])[1];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" style={{maxWidth:600}} onClick={e=>e.stopPropagation()}>
        <div className="modal-head"><div className="modal-title">📞 Contactos · {student.fullName}</div><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div className="scard" style={{padding:12, background:'#F7F7F2', boxShadow:'none'}}>
            <div className="settings-hint" style={{marginTop:0}}>Anota una llamada, mensaje o conversación presencial. Queda guardado con fecha y quién la registró.</div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginTop:8}}>
              <select className="input-text" value={method} onChange={e=>setMethod(e.target.value)}>{METHODS.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select>
              <select className="input-text" value={subject} onChange={e=>setSubject(e.target.value)}>{SUBJECTS.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select>
              <select className="input-text" value={outcome} onChange={e=>setOutcome(e.target.value)}>{OUTCOMES.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select>
            </div>
            <textarea className="eval-textarea" rows={2} value={note} onChange={e=>setNote(e.target.value)} placeholder="Detalles (opcional): p.ej. 'la mamá se comprometió a pagar el viernes'" style={{width:'100%', marginTop:8}} />
            <div className="modal-actions" style={{marginTop:6}}><button className="btn-save" onClick={save} disabled={busy}>{busy?'Guardando…':'➕ Registrar contacto'}</button></div>
          </div>

          <div style={{marginTop:14}}>
            <div className="sec-title" style={{fontSize:13, marginBottom:8}}>Historial ({logs === null ? '…' : logs.length})</div>
            {logs === null ? <div className="settings-hint">Cargando…</div> :
              logs.length === 0 ? <div className="empty-state" style={{padding:14}}><div className="icon">📞</div>Aún no hay contactos registrados.</div> :
              <div className="sm-list" style={{maxHeight:260, overflowY:'auto'}}>
                {logs.map(l => (
                  <div key={l.id} className="muted-row" style={{display:'block', padding:'10px 12px'}}>
                    <div className="row-flex" style={{gap:6, flexWrap:'wrap'}}>
                      <span className="mm-chip">{label(METHODS,l.method)}</span>
                      <span className="mm-chip">{label(SUBJECTS,l.subject)}</span>
                      <span className="mm-chip">{label(OUTCOMES,l.outcome)}</span>
                      <span className="muted-until" style={{marginLeft:'auto'}}>{new Date(l.contacted_at).toLocaleString('es-PE',{day:'numeric',month:'short',year:'2-digit',hour:'2-digit',minute:'2-digit'})}</span>
                      <button className="att-btn" style={{padding:'2px 8px', fontSize:11, borderColor:'#EF9A9A', color:'#C62828'}} onClick={()=>del(l.id)}>🗑</button>
                    </div>
                    {l.note && <div style={{marginTop:6, fontSize:13, color:'var(--text-soft)'}}>{l.note}</div>}
                    {l.created_by && <div className="st-user" style={{marginTop:4}}>por @{l.created_by}</div>}
                  </div>
                ))}
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════
 * Exportar el registro visible a CSV (Excel).
 * ═════════════════════════════════════════════════ */
function exportRosterCSV(list, D, regByKey) {
  const P = window.JUCUM_PAY;
  const rows = [['Nombre','Usuario','DNI','Correo','Teléfono','Apoderado','DNI apoderado','Nivel','Grupo','Origen','Fecha de inscripción','Racha (días)','Promedio (%)','Estado de pago']];
  list.forEach(s => {
    const g = D.GROUPS.find(g => g.id === s.group);
    const lvl = (D.LEVELS[s.level] || {}).code || s.level || '';
    const o = originOf(s, regByKey).l.includes('enlace') ? 'Por enlace' : 'Creado por ti';
    const st = P.getAccountStatus(s).state || '';
    const fecha = s.createdAt ? new Date(s.createdAt).toISOString().slice(0,10) : '';
    rows.push([s.fullName||'', s.username||'', s.dni||'', s.email||'', s.phone||'', s.guardianName||'', s.guardianDni||'', lvl, g?.name||'', o, fecha, s.streak||0, s.avgScore||0, st]);
  });
  const csv = rows.map(r => r.map(c => { const v = String(c==null?'':c); return /[,";\n]/.test(v) ? '"'+v.replace(/"/g,'""')+'"' : v; }).join(',')).join('\n');
  const blob = new Blob(['\uFEFF'+csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'alumnos-jucum-'+new Date().toISOString().slice(0,10)+'.csv';
  document.body.appendChild(a); a.click(); a.remove();
}

/* ═════════════════════════════════════════════════
 * Constancia de pago imprimible.
 * ═════════════════════════════════════════════════ */
function printReceipt(payment) {
  const D = window.JUCUM_DATA; const P = window.JUCUM_PAY;
  const s = D.STUDENTS.find(x => x.id === payment.studentId) || {};
  const cfg = P.getConfig();
  const num = 'REC-' + payment.id.replace(/^pay-/, '').slice(0, 14);
  const cur = cfg.currency || 'PEN';
  const amount = payment.amount || (cfg.amounts[s.level]||{})[payment.mode] || 0;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Constancia ${num}</title>
  <style>body{font-family:'Nunito',system-ui,sans-serif;color:#1a1a1a;padding:40px;max-width:640px;margin:0 auto}
  h1{margin:0;font-size:22px;color:#1F3A8A}.brand{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1F3A8A;padding-bottom:14px}
  .num{font-size:12px;color:#666;text-align:right}.big{font-size:34px;font-weight:900;color:#2E7D32;margin:22px 0}
  table{width:100%;border-collapse:collapse;margin-top:18px}td{padding:8px 4px;border-bottom:1px dashed #ddd;font-size:14px}
  td.k{color:#666;width:40%}small{color:#888}.footer{margin-top:36px;font-size:12px;color:#666;text-align:center;border-top:1px solid #eee;padding-top:14px}
  @media print{body{padding:14px}}</style></head><body>
  <div class="brand"><div><h1>JUCUM English Center</h1><small>Constancia de pago</small></div><div class="num"><b>N° ${num}</b><br>${new Date(payment.confirmedAt||payment.registeredAt).toLocaleDateString('es-PE',{day:'numeric',month:'long',year:'numeric'})}</div></div>
  <div class="big">${cur} ${amount.toLocaleString('es-PE')}</div>
  <table><tbody>
    <tr><td class="k">Alumno</td><td><b>${s.fullName||''}</b></td></tr>
    <tr><td class="k">DNI</td><td>${payment.dni||s.dni||'—'}</td></tr>
    <tr><td class="k">Nivel · Grupo</td><td>${(D.LEVELS[s.level]||{}).code||''} · ${(D.GROUPS.find(g=>g.id===s.group)||{}).name||''}</td></tr>
    <tr><td class="k">Concepto</td><td>${P.labelMode(payment.mode)}${payment.period?' · periodo '+payment.period:''}</td></tr>
    <tr><td class="k">Estado</td><td><b style="color:#2E7D32">✅ Confirmado</b></td></tr>
    ${payment.note?`<tr><td class="k">Nota</td><td>${payment.note}</td></tr>`:''}
  </tbody></table>
  <div class="footer">Documento generado automáticamente · JUCUM English Center<br>Gracias por su pago 🙏</div>
  <script>setTimeout(function(){window.print();},300);<\/script>
  </body></html>`;
  const w = window.open('', '_blank', 'width=760,height=900');
  if (!w) { alert('Habilita las ventanas emergentes para imprimir la constancia.'); return; }
  w.document.write(html); w.document.close();
}

/* ═════════════════════════════════════════════════
 * Reporte por grupo — al día vs. bloqueado por grupo.
 * ═════════════════════════════════════════════════ */
function AdminGroupPaymentReport() {
  const P = window.JUCUM_PAY; const D = window.JUCUM_DATA;
  const [notifying, setNotifying] = React.useState(null);
  const report = P.getGroupPaymentReport();
  const badge = { al_dia:{l:'✅ Al día',c:'#2E7D32', bg:'#E8F5E9'}, en_revision:{l:'🕒 En revisión',c:'#E65100', bg:'#FFF3E0'}, por_vencer:{l:'⏳ Por vencer',c:'#E65100', bg:'#FFF3E0'}, bloqueado:{l:'🔒 Bloqueado',c:'#C62828', bg:'#FFEBEE'} };
  return (
    <div style={{marginTop:16}}>
      <div className="settings-hint" style={{marginBottom:10}}>Estado de pago por grupo. Los grupos con más pendientes aparecen primero. Toca a un alumno para avisarle directamente.</div>
      {report.length === 0 && <div className="scard"><div className="empty-state"><div className="icon">📊</div>Aún no hay grupos.</div></div>}
      {report.map(({ group, total, alDia, enRevision, porVencer, bloqueado, rows }) => {
        const pending = bloqueado + porVencer;
        return (
          <div key={group.id} className="scard" style={{marginBottom:12, borderLeft:`5px solid ${pending?'#C62828':'#2E7D32'}`}}>
            <div className="sec-head">
              <div className="sec-title">{(D.LEVELS[group.level]||{}).emoji||'📘'} {group.name}</div>
              <span className="sec-meta">{total} alumno{total===1?'':'s'}</span>
            </div>
            <div className="row-flex" style={{gap:6, flexWrap:'wrap', marginBottom:10}}>
              <span className="mm-chip" style={{background:badge.al_dia.bg, color:badge.al_dia.c}}>✅ {alDia} al día</span>
              {enRevision>0 && <span className="mm-chip" style={{background:badge.en_revision.bg, color:badge.en_revision.c}}>🕒 {enRevision} en revisión</span>}
              {porVencer>0 && <span className="mm-chip" style={{background:badge.por_vencer.bg, color:badge.por_vencer.c}}>⏳ {porVencer} por vencer</span>}
              {bloqueado>0 && <span className="mm-chip" style={{background:badge.bloqueado.bg, color:badge.bloqueado.c}}>🔒 {bloqueado} bloqueado{bloqueado===1?'':'s'}</span>}
            </div>
            {pending > 0 && (
              <div className="sm-list" style={{marginTop:2}}>
                {rows.filter(r => r.status.state === 'bloqueado' || r.status.state === 'por_vencer').map(({student, status}) => {
                  const m = badge[status.state] || {l:'—', c:'#999', bg:'#F3F3EE'};
                  return (
                    <div key={student.id} className="muted-row">
                      <b>{student.fullName}</b>
                      <span className="mm-chip" style={{background:m.bg, color:m.c, marginLeft:'auto'}}>{m.l}{status.daysLeft!=null?` · ${status.daysLeft}d`:''}</span>
                      <button className="att-btn" onClick={()=>setNotifying(student)}>🔔 Avisar</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      {notifying && <NotifyPaymentModal student={notifying} onClose={()=>setNotifying(null)} onDone={()=>setNotifying(null)} />}
    </div>
  );
}

function AdminGestionPagos({ onChange }) {
  const P = window.JUCUM_PAY;
  const payments = P.getAllPayments();
  const pendCount = payments.filter(p => p.status === 'por_confirmar').length;
  const [tab, setTab] = React.useState('registro');   // registro · config · avisos · grupos
  return (
    <main>
      <div className="welcome teacher">
        <div className="welcome-text"><div className="eyebrow t">💳 Gestión de pagos</div><h1>Pagos y configuración</h1><p>Confirma pagos, define montos y fechas, avisa a los grupos y registra pagos individuales — todo en un solo lugar.</p></div>
      </div>

      <div className="mm-tabs" style={{flexWrap:'wrap'}}>
        <button className={`mm-tab ${tab==='registro'?'on':''}`} onClick={()=>setTab('registro')}>🧾 Registro de pagos{pendCount>0 && <span className="mm-count">{pendCount}</span>}</button>
        <button className={`mm-tab ${tab==='config'?'on':''}`} onClick={()=>setTab('config')}>⚙️ Configuración</button>
        <button className={`mm-tab ${tab==='avisos'?'on':''}`} onClick={()=>setTab('avisos')}>📣 Avisos de pago</button>
        <button className={`mm-tab ${tab==='grupos'?'on':''}`} onClick={()=>setTab('grupos')}>📊 Reporte por grupo</button>
      </div>

      {tab === 'config' ? <AdminConfigBody onChange={onChange} />
        : tab === 'avisos' ? <AdminPaymentNotices />
        : tab === 'grupos' ? <AdminGroupPaymentReport />
        : <AdminPaymentsBody onChange={onChange} />}
    </main>
  );
}

function AdminPaymentsBody({ onChange }) {
  const D = window.JUCUM_DATA; const P = window.JUCUM_PAY;
  const cfg = P.getConfig();
  const payments = P.getAllPayments();
  const [filter, setFilter] = React.useState('por_confirmar');
  const [shot, setShot] = React.useState(null);
  const [paying, setPaying] = React.useState(null);
  const nameOf = (sid) => (D.STUDENTS.find(s => s.id === sid) || {}).fullName || null;
  const groupOf = (sid) => { const s = D.STUDENTS.find(s => s.id === sid); const g = s && D.GROUPS.find(g => g.id === s.group); return g ? g.name : ''; };
  const list = payments.filter(p => filter === 'todos' ? true : p.status === filter);
  const counts = {
    por_confirmar: payments.filter(p => p.status === 'por_confirmar').length,
    confirmado: payments.filter(p => p.status === 'confirmado').length,
    rechazado: payments.filter(p => p.status === 'rechazado').length,
  };
  return (
    <>
      <div className="row-flex" style={{justifyContent:'space-between', margin:'16px 0 4px', flexWrap:'wrap', gap:10}}>
        <div className="settings-hint" style={{margin:0}}><b style={{color:'#E65100'}}>{counts.por_confirmar}</b> por confirmar · {counts.confirmado} confirmados · {counts.rechazado} rechazados</div>
        <button className="att-btn" style={{borderColor:'#90CAF9', color:'#1565C0'}} onClick={()=>setPaying('pick')}>💳 Registrar pago de un alumno</button>
      </div>

      <div className="mm-tabs" style={{marginTop:8}}>
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
                    <div style={{fontWeight:800, fontSize:14}}>{nameOf(p.studentId) || `Alumno · DNI ${p.dni||'—'}`} <span style={{fontWeight:600, color:'var(--text-soft)', fontSize:12}}>· {groupOf(p.studentId)}</span></div>
                    <div className="sm-meta">{P.labelMode(p.mode)} · DNI {p.dni||'—'} · periodo {p.period}{p.amount?` · ${cfg.currency} ${p.amount}`:''}{p.byAdmin?' · registrado por administración':''}</div>
                    <div className="sm-meta">Registrado {new Date(p.registeredAt).toLocaleString('es-PE',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}{p.confirmedAt?` · confirmado ${new Date(p.confirmedAt).toLocaleDateString('es-PE')}`:''}</div>
                  </div>
                  <span className="mm-chip" style={{background:meta.bg, color:meta.c}}>{meta.l}</span>
                </div>
                <div className="row-flex" style={{gap:8, marginTop:10}}>
                  {p.screenshot && <button className="att-btn" onClick={()=>setShot(p.screenshot)}>🖼️ Ver captura</button>}
                  {p.status === 'confirmado' && <button className="att-btn" style={{borderColor:'#90CAF9', color:'#1565C0'}} onClick={()=>printReceipt(p)}>🖶 Imprimir constancia</button>}
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

      {paying === 'pick' && <PickStudentModal onClose={()=>setPaying(null)} onPick={(s)=>setPaying(s)} />}
      {paying && paying !== 'pick' && <ManualPaymentModal student={paying} onClose={()=>setPaying(null)} onDone={()=>{ setPaying(null); onChange(); }} />}
    </>
  );
}

function PickStudentModal({ onClose, onPick }) {
  const D = window.JUCUM_DATA;
  const [q, setQ] = React.useState('');
  const list = D.STUDENTS.filter(s => !q || s.fullName.toLowerCase().includes(q.toLowerCase()) || (s.username||'').includes(q.toLowerCase())).sort((a,b)=>a.fullName.localeCompare(b.fullName,'es'));
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" style={{maxWidth:480}} onClick={e=>e.stopPropagation()}>
        <div className="modal-head"><div className="modal-title">Elige el alumno</div><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <input className="input-text" style={{width:'100%', marginBottom:10}} placeholder="🔍 Buscar…" value={q} onChange={e=>setQ(e.target.value)} autoFocus />
          <div className="sm-list" style={{maxHeight:'50vh', overflowY:'auto'}}>
            {list.map(s => { const g = D.GROUPS.find(g=>g.id===s.group); return (
              <button key={s.id} className="eval-student-row" onClick={()=>onPick(s)}>
                <div className="eval-st-info"><div className="eval-st-name">{s.fullName}</div><div className="eval-st-meta">@{s.username} · {g?.name || 'sin grupo'}</div></div>
                <span className="eval-st-cta">Registrar pago →</span>
              </button>
            ); })}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminPaymentNotices() {
  const D = window.JUCUM_DATA; const P = window.JUCUM_PAY;
  const [sel, setSel] = React.useState([]);
  const [body, setBody] = React.useState('Te recordamos que tu pago está pendiente. Por favor comunícate con nosotros o registra tu pago directamente en la plataforma (sección 💳 Pagos). ¡Gracias!');
  const [sent, setSent] = React.useState('');
  const groupsSorted = [...D.GROUPS].sort((a,b) => a.name.localeCompare(b.name,'es'));
  const toggle = (id) => setSel(s => s.includes(id) ? s.filter(x=>x!==id) : [...s, id]);
  const allIds = groupsSorted.map(g=>g.id);
  const targetCount = D.STUDENTS.filter(s => sel.includes(s.group)).length;
  const send = () => {
    if (!sel.length) return;
    const n = P.notifyPaymentToGroups(sel, { body });
    setSent(`✅ Aviso enviado a ${n} alumno${n===1?'':'s'} de ${sel.length} grupo${sel.length===1?'':'s'}.`);
    setTimeout(()=>setSent(''), 4000);
    setSel([]);
  };
  return (
    <>
      <div className="scard" style={{marginTop:16}}>
        <div className="sec-head"><div className="sec-title">📣 Avisar de pago a los grupos</div></div>
        <div className="settings-hint">Envía un recordatorio de pago (llega a la campanita 🔔 de cada alumno, con enlace a Pagos) a los grupos que elijas.</div>
        <div className="row-flex" style={{gap:8, margin:'10px 0', flexWrap:'wrap'}}>
          <button className="att-btn" onClick={()=>setSel(allIds)}>Seleccionar todos</button>
          <button className="att-btn" onClick={()=>setSel([])}>Quitar selección</button>
        </div>
        <div className="mg-list" style={{marginTop:4}}>
          {groupsSorted.map(g => {
            const lvl = D.LEVELS[g.level] || {emoji:'📘', code:'—'};
            const n = D.STUDENTS.filter(s=>s.group===g.id).length;
            const on = sel.includes(g.id);
            return (
              <button key={g.id} className="mp-btn" onClick={()=>toggle(g.id)} style={on?{borderColor:'#1F3A8A', background:'#EEF2FB'}:undefined}>
                <span style={{fontSize:16}}>{on?'☑️':'⬜'}</span>
                <span className="mp-emo">{lvl.emoji}</span>
                <span className="mp-name">{g.name}</span>
                <span className="mp-count">{n} alumno{n===1?'':'s'}</span>
              </button>
            );
          })}
          {groupsSorted.length === 0 && <div className="settings-hint">Aún no hay grupos.</div>}
        </div>
      </div>

      <div className="scard" style={{marginTop:14}}>
        <div className="sec-head"><div className="sec-title">✍️ Mensaje</div></div>
        <textarea className="eval-textarea" rows={3} value={body} onChange={e=>setBody(e.target.value)} style={{width:'100%'}} />
        <div className="modal-actions" style={{justifyContent:'space-between'}}>
          {sent ? <span className="pwd-ok">{sent}</span> : <span className="settings-hint" style={{margin:0}}>{sel.length ? `Se enviará a ${targetCount} alumno${targetCount===1?'':'s'}.` : 'Elige al menos un grupo.'}</span>}
          <button className="btn-save" onClick={send} disabled={!sel.length}>📣 Enviar aviso</button>
        </div>
      </div>
    </>
  );
}

function AdminConfigBody({ onChange }) {
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
    <>
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
    </>
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

Object.assign(window, { AdminDashboard, AdminGestionPagos, AdminRoster, AdminConfigBody, AdminPaymentsBody, AdminPaymentNotices, AdminGroupPaymentReport, AdminAccount, AdminPasswordGate, ManualPaymentModal, NotifyPaymentModal, ContactLogModal, PickStudentModal, originOf, exportRosterCSV, printReceipt });
