/* Pagos — vista del alumno: registrar pago, ver estado y medios de pago. */

function payDownscale(file, max, q) {
  return new Promise((res) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      try { res(c.toDataURL('image/jpeg', q)); } catch { res(null); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); res(null); };
    img.src = url;
  });
}

function PayMethodRow({ label, value }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => { try { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} };
  return (
    <div className="paym-row">
      <div className="paym-label">{label}</div>
      <div className="paym-value">{value}</div>
      <button className="paym-copy" onClick={copy}>{copied ? '✓ Copiado' : 'Copiar'}</button>
    </div>
  );
}

function PaymentMethods() {
  const M = window.JUCUM_PAY.PAYMENT_METHODS;
  return (
    <div className="scard" style={{marginTop:18}}>
      <div className="sec-head"><div className="sec-title">🏦 Medios de pago</div><span className="sec-meta">{M.titular}</span></div>
      <div className="paym-list">
        <PayMethodRow label="📱 Yape" value={M.yape} />
        <PayMethodRow label="🏦 BCP · Cuenta" value={M.bcp} />
        <PayMethodRow label="🔢 CCI (interbancario)" value={M.cci} />
      </div>
      <div className="settings-hint" style={{marginTop:10}}>Titular: <b>{M.titular}</b>. Tras pagar, registra tu pago aquí y adjunta tu captura. ¿Dudas? {M.phone}.</div>
    </div>
  );
}

function StudentPayments({ user, onBack, focusRegister }) {
  const D = window.JUCUM_DATA; const P = window.JUCUM_PAY;
  const student = D.STUDENTS.find(s => s.id === user.studentId) || D.STUDENTS[0];
  const cfg = P.getConfig();
  const [, setTick] = React.useState(0);
  const status = P.getAccountStatus(student);
  const mine = P.getStudentPayments(student.id);

  const isA1A2 = student.level === 'a1' || student.level === 'a2';
  const [dni, setDni] = React.useState('');
  const [mode, setMode] = React.useState('mensual');
  const [shot, setShot] = React.useState(null);
  const [err, setErr] = React.useState('');
  const [done, setDone] = React.useState(false);

  const amounts = cfg.amounts[student.level] || {};
  const amount = mode === 'modulo' ? amounts.modulo : mode === 'mensual' ? amounts.mensual : null;

  const onFile = (e) => { const f = e.target.files[0]; if (!f) return; payDownscale(f, 1000, 0.7).then(setShot); };
  const submit = () => {
    if (!/^\d{8}$/.test(dni.trim())) { setErr('Ingresa un DNI válido (8 dígitos) para la boleta.'); return; }
    if (!shot) { setErr('Adjunta la captura de tu pago.'); return; }
    P.registerPayment(student.id, { dni: dni.trim(), mode, level: student.level, amount, screenshot: shot });
    setDone(true); setErr(''); setDni(''); setShot(null); setTick(t => t + 1);
  };

  const stateMeta = {
    al_dia:     { ico:'✅', color:'#2E7D32', bg:'#E8F5E9', title:'Estás al día', msg:'Tu cuenta está activa. ¡Gracias por tu puntualidad!' },
    en_revision:{ ico:'🕒', color:'#E65100', bg:'#FFF3E0', title:'Pago en revisión', msg:`Tu pago fue registrado. El administrador lo confirmará a la brevedad. Si en 2 días no recibes confirmación, comunícate al ${status.phone}.` },
    por_vencer: { ico:'⏳', color:'#E65100', bg:'#FFF8E1', title:'Pago pendiente', msg:`Tienes ${status.daysLeft} día${status.daysLeft===1?'':'s'} para regularizar tu pago. Pasado ese plazo tu cuenta se bloqueará.` },
    bloqueado:  { ico:'🔒', color:'#C62828', bg:'#FFEBEE', title:'Cuenta bloqueada', msg:'Tu cuenta está bloqueada por falta de pago. Registra tu pago para reactivarla.' },
  }[status.state];

  return (
    <main>
      <button className="back-btn" onClick={onBack}>← Volver al panel</button>
      <div className="welcome" style={{background:'linear-gradient(135deg,#1F3A8A,#0D1B5A)'}}>
        <div className="welcome-text">
          <div className="eyebrow t">💳 Pagos</div>
          <h1>Mi estado de pago</h1>
          <p>Registra tu pago, adjunta tu captura y consulta si estás al día.</p>
        </div>
      </div>

      {/* Estado */}
      <div className="scard" style={{marginTop:18, borderLeft:`5px solid ${stateMeta.color}`}}>
        <div className="row-flex" style={{gap:14}}>
          <div style={{fontSize:38}}>{stateMeta.ico}</div>
          <div style={{flex:1, minWidth:180}}>
            <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:18, color:stateMeta.color}}>{stateMeta.title}</div>
            <div style={{fontSize:13, color:'var(--text)', lineHeight:1.5, marginTop:3}}>{stateMeta.msg}</div>
          </div>
          {status.state === 'por_vencer' && <div className="target-val" style={{fontSize:26, color:'#C62828', minWidth:90}}>{status.daysLeft}<span>días</span></div>}
        </div>
        <div className="settings-hint" style={{marginTop:10}}>📅 El pago está fijado para el <b>día {status.payDay} de cada mes</b>, igual para todos — no depende de la fecha en que cada alumno se inscribió. Agradecemos tu comprensión y puntualidad para que la academia siga creciendo contigo. 💙</div>
        {status.rejected && <div className="forum-muted" style={{marginTop:10, marginBottom:0}}>⚠️ Tu último pago no pudo confirmarse. Vuelve a registrarlo con la captura correcta.</div>}
      </div>

      {/* Registrar pago */}
      <div className="scard" style={{marginTop:18}} id="pay-register">
        <div className="sec-head"><div className="sec-title">📝 Registrar mi pago</div></div>
        {done ? (
          <div className="diag-block ok" style={{margin:0}}>
            <div className="diag-h">✅ ¡Pago registrado!</div>
            <div className="diag-it-body">Tu pago quedó <b>registrado y en revisión</b>. El administrador lo confirmará a la brevedad posible. Si en <b>2 días</b> no recibes la confirmación, comunícate al <b>{status.phone}</b> para solicitarla. ¡Gracias! 💙</div>
            <button className="btn-soft" style={{marginTop:10}} onClick={() => { setDone(false); setTick(t => t + 1); }}>Registrar otro pago</button>
          </div>
        ) : (
          <>
            {err && <div className="err" style={{marginBottom:12}}>⚠ {err}</div>}
            <div className="settings-block" style={{paddingTop:0}}>
              <div className="settings-label">DNI para la boleta</div>
              <div className="settings-hint">Con este DNI se emitirá tu boleta.</div>
              <input className="input-text" style={{width:'100%', maxWidth:240}} value={dni} onChange={e => setDni(e.target.value.replace(/\D/g,'').slice(0,8))} placeholder="8 dígitos" inputMode="numeric" />
            </div>
            <div className="settings-block">
              <div className="settings-label">Modalidad de pago</div>
              <div className="module-picker">
                <button className={`mp-btn ${mode==='mensual'?'on':''}`} onClick={() => setMode('mensual')}>
                  <span className="mp-emo">🗓️</span><span className="mp-name">Mensual</span>
                  {amounts.mensual > 0 && <span className="mp-count">{cfg.currency} {amounts.mensual}</span>}
                </button>
                {isA1A2 && (
                  <button className={`mp-btn ${mode==='modulo'?'on':''}`} onClick={() => setMode('modulo')}>
                    <span className="mp-emo">📦</span><span className="mp-name">Por módulo <span style={{fontWeight:600, color:'var(--text-soft)'}}>(solo A1 y A2)</span></span>
                    {amounts.modulo > 0 && <span className="mp-count">{cfg.currency} {amounts.modulo}</span>}
                  </button>
                )}
                <button className={`mp-btn ${mode==='total'?'on':''}`} onClick={() => setMode('total')}>
                  <span className="mp-emo">💯</span><span className="mp-name">Pago total</span>
                </button>
              </div>
              {mode === 'total' && <div className="settings-hint" style={{marginTop:8}}>El <b>pago total</b> es válido durante los <b>primeros {cfg.totalMonths} meses</b> de apertura del módulo. Si ya pagaste tu primer mes, el administrador descontará ese monto del total. Adjunta tu captura y lo verificamos.</div>}
            </div>
            <div className="settings-block">
              <div className="settings-label">Captura de tu pago</div>
              <div className="settings-hint">Sube la foto/screenshot de tu operación (Yape, transferencia, etc.).</div>
              <input type="file" accept="image/*" onChange={onFile} />
              {shot && <div style={{marginTop:10}}><img src={shot} alt="captura" style={{maxWidth:220, borderRadius:10, border:'1px solid var(--border)'}} /></div>}
            </div>
            <div className="modal-actions" style={{borderTop:'none'}}>
              <button className="btn-save" onClick={submit}>📨 Registrar pago</button>
            </div>
          </>
        )}
      </div>

      <PaymentMethods />

      {/* Historial */}
      <div className="scard" style={{marginTop:18}}>
        <div className="sec-head"><div className="sec-title">📋 Mis pagos</div><span className="sec-meta">{mine.length} registro{mine.length===1?'':'s'}</span></div>
        {mine.length === 0 ? <div className="empty-state"><div className="icon">🧾</div>Aún no has registrado pagos.</div> : (
          <div className="sm-list">
            {mine.map(p => {
              const meta = p.status === 'confirmado' ? {l:'✅ Confirmado', c:'#2E7D32', bg:'#E8F5E9'} : p.status === 'rechazado' ? {l:'⚠️ No confirmado', c:'#C62828', bg:'#FFEBEE'} : {l:'🕒 Por confirmar', c:'#E65100', bg:'#FFF3E0'};
              return (
                <div key={p.id} className="sm-row">
                  <div className="sm-info">
                    <div className="sm-name">{P.labelMode(p.mode)} · {p.period}</div>
                    <div className="sm-meta">DNI {p.dni} · {new Date(p.registeredAt).toLocaleDateString('es-PE',{day:'numeric',month:'short',year:'numeric'})}{p.amount?` · ${cfg.currency} ${p.amount}`:''}</div>
                  </div>
                  <span className="mm-chip" style={{background:meta.bg, color:meta.c}}>{meta.l}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

/* Barra de recordatorio (fija, no intrusiva) durante los 7 días de gracia */
function PayReminderBar({ status, onGo }) {
  return (
    <div className="pay-reminder" onClick={onGo}>
      <span>⏳ Recordatorio de pago: te queda{status.daysLeft===1?'':'n'} <b>{status.daysLeft} día{status.daysLeft===1?'':'s'}</b> para regularizar tu pago (día {status.payDay} de cada mes).</span>
      <button className="pay-reminder-btn">Registrar pago →</button>
    </div>
  );
}

/* Pantalla de bloqueo: dirige Únicamente a registrar el pago */
function PayBlockGate({ status, onGo }) {
  return (
    <main>
      <div className="scard" style={{margin:'40px auto', maxWidth:560, textAlign:'center', borderTop:'5px solid #C62828'}}>
        <div style={{fontSize:56}}>🔒</div>
        <h1 style={{fontFamily:"'Fredoka',sans-serif", color:'#C62828', fontSize:24, margin:'8px 0'}}>Tu cuenta está bloqueada</h1>
        <p style={{fontSize:14, lineHeight:1.6, color:'var(--text)'}}>Pasaron más de 7 días del día de pago (día {status.payDay}) sin registrar tu pago, por eso tu cuenta se bloqueó temporalmente y no puedes avanzar.</p>
        <p style={{fontSize:14, lineHeight:1.6, color:'var(--text)', marginTop:8}}>Para reactivarla, <b>registra tu pago</b> aquí mismo. En cuanto el administrador lo confirme, recuperas tu acceso. ¡Gracias por tu comprensión! 💙</p>
        <button className="btn-save" style={{marginTop:16}} onClick={onGo}>💳 Ir a registrar mi pago</button>
      </div>
    </main>
  );
}

/* Felicitación de pago confirmado (aparece una vez al entrar y desaparece) */
function PayCelebration({ payment, onClose }) {
  return (
    <div className="onb-backdrop" onClick={onClose}>
      <div className="onb-card" onClick={e=>e.stopPropagation()} style={{borderTop:'6px solid #2EA84B'}}>
        <button className="onb-skip" onClick={onClose}>Cerrar</button>
        <div className="onb-ico">✅</div>
        <div className="onb-title" style={{color:'#2E7D32'}}>¡Pago confirmado!</div>
        <div className="onb-body">Tu pago fue confirmado correctamente. ¡Gracias por tu puntualidad! Ya puedes seguir practicando con toda tranquilidad. Sigamos creciendo juntos. 🚀</div>
        <div className="onb-actions"><button className="btn-save" onClick={onClose}>¡A practicar! 💪</button></div>
      </div>
    </div>
  );
}

Object.assign(window, { StudentPayments, PaymentMethods, PayMethodRow, payDownscale, PayReminderBar, PayBlockGate, PayCelebration });