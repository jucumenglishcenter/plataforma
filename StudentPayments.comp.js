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

  const modes = P.modesFor ? P.modesFor(student.level) : ['mensual'];
  const [dni, setDni] = React.useState('');
  const [mode, setMode] = React.useState(() => (P.modeOf ? P.modeOf(student) : 'mensual'));
  const [shot, setShot] = React.useState(null);
  const [err, setErr] = React.useState('');
  const [done, setDone] = React.useState(false);
  const [reopened, setReopened] = React.useState(false);

  const priceOf = (m) => P.priceFor ? P.priceFor(student, m) : ((cfg.amounts[student.level] || {})[m] || null);
  const amount = priceOf(mode);
  const MODE_INFO = {
    mensual: { emo:'🗓️', name:'Mensual', hint:'Pagas cada mes, el día de pago de tu grupo.' },
    modulo:  { emo:'📦', name:'Por módulo', hint:'Un solo pago por todo el módulo (2 meses).' },
    total:   { emo:'💯', name: student.level === 'pre-a1' ? 'Curso completo' : 'Paquete completo', hint: student.level === 'pre-a1' ? 'Todo el curso en un solo pago.' : 'Todo el nivel en un solo pago.' },
  };

  const onFile = (e) => { const f = e.target.files[0]; if (!f) return; payDownscale(f, 1000, 0.7).then(setShot); };
  const submit = () => {
    if (!/^\d{8}$/.test(dni.trim())) { setErr('Ingresa un DNI válido (8 dígitos) para la boleta.'); return; }
    if (!shot) { setErr('Adjunta la captura de tu pago.'); return; }
    setReopened(status.state === 'aviso' || status.state === 'bloqueado');
    P.registerPayment(student.id, { dni: dni.trim(), mode, level: student.level, amount, screenshot: shot });
    setDone(true); setErr(''); setDni(''); setShot(null); setTick(t => t + 1);
    if (P.gateLoad) setTimeout(() => P.gateLoad().then(() => setTick(t => t + 1)), 1500);
  };

  const stateMeta = {
    al_dia:     { ico:'✅', color:'#2E7D32', bg:'#E8F5E9', title:'Estás al día', msg:'Tu cuenta está activa. ¡Gracias por tu puntualidad!' },
    en_revision:{ ico:'🕒', color:'#1565C0', bg:'#E3F2FD', title:'Pago en revisión', msg:`Recibimos tu pago y administración lo está revisando. Mientras tanto sigues practicando con normalidad. Si en 2 días no recibes confirmación, escríbenos al ${status.phone}.` },
    por_vencer: { ico:'📅', color:'#1565C0', bg:'#E3F2FD', title:'Tu pago vence pronto', msg:`Tu pago vence ${status.daysLeft===0?'hoy':`en ${status.daysLeft} día${status.daysLeft===1?'':'s'}`}. Si ya pagaste, regístralo aquí.` },
    aviso:      { ico:'⏳', color:'#E65100', bg:'#FFF3E0', title: status.reason ? 'Tu pago no se pudo aprobar' : 'Tu pago está pendiente', msg:`${status.reason ? status.reason + '. ' : ''}Registra tu pago o comunícate con administración. Si no, tu plataforma se pondrá en pausa ${payFmtDay(status.closeDate)}.` },
    bloqueado:  { ico:'⏸️', color:'#C62828', bg:'#FFEBEE', title:'Tu acceso está en pausa', msg:`${status.reason ? status.reason + '. ' : 'Tu pago está pendiente. '}Registra tu pago aquí o escríbenos: mientras administración lo revisa vuelves a practicar. Todo tu avance está guardado.` },
  }[status.state] || { ico:'✅', color:'#2E7D32', bg:'#E8F5E9', title:'Estás al día', msg:'' };

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
          {(status.state === 'aviso' || status.state === 'por_vencer') && <div className="target-val" style={{fontSize:26, color:stateMeta.color, minWidth:90}}>{status.daysLeft}<span>días</span></div>}
        </div>
        {status.payDay ? <div className="settings-hint" style={{marginTop:10}}>📅 Tu pago es el <b>día {status.payDay} de cada mes</b>{status.amount ? <> · monto <b>{cfg.currency} {status.amount}</b></> : null}. Agradecemos tu puntualidad para que la academia siga creciendo contigo. 💙</div> : null}
        {(status.state === 'aviso' || status.state === 'bloqueado') && <div className="row-flex" style={{gap:8, marginTop:10, flexWrap:'wrap'}}><a className="btn-soft" href={payWaLink(student)} target="_blank" rel="noopener">💬 Escribir a administración</a></div>}
        {status.rejected && <div className="forum-muted" style={{marginTop:10, marginBottom:0}}>⚠️ Tu último pago no pudo confirmarse. Vuelve a registrarlo con la captura correcta.</div>}
      </div>

      {/* Registrar pago */}
      <div className="scard" style={{marginTop:18}} id="pay-register">
        <div className="sec-head"><div className="sec-title">📝 Registrar mi pago</div></div>
        {done ? (
          <div className="diag-block ok" style={{margin:0}}>
            <div className="diag-h">✅ ¡Pago registrado!</div>
            <div className="diag-it-body">Tu pago quedó <b>registrado y en revisión</b>.{reopened ? <> <b>Tu plataforma se reabrió</b> mientras administración lo revisa.</> : null} Si administración no lo aprueba (por ejemplo, si el monto no está completo), te avisaremos. Si en <b>2 días</b> no recibes la confirmación, comunícate al <b>{status.phone}</b>. ¡Gracias! 💙</div>
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
              <div className="settings-label">¿Cómo vas a pagar?</div>
              <div className="module-picker">
                {modes.map(m => (
                  <button key={m} className={`mp-btn ${mode===m?'on':''}`} onClick={() => setMode(m)}>
                    <span className="mp-emo">{MODE_INFO[m].emo}</span><span className="mp-name">{MODE_INFO[m].name}</span>
                    <span className="mp-count">{priceOf(m) ? `${cfg.currency} ${priceOf(m)}` : 'Consultar'}</span>
                  </button>
                ))}
              </div>
              <div className="settings-hint" style={{marginTop:8}}>{MODE_INFO[mode].hint} Administración revisa tu captura y aprueba el monto.</div>
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

/* 🚦 Utilidades del control de pagos (día Perú, WhatsApp de administración) */
function payFmtDay(iso) {
  if (!iso) return 'pronto';
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const DW = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'], MO = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `el ${DW[dt.getUTCDay()]} ${d}-${MO[m - 1]}`;
}
function payWaLink(student) {
  const ph = String((window.JUCUM_PAY && window.JUCUM_PAY.ATTN_PHONE) || '+51 935 972 183').replace(/\D/g, '');
  const g = (() => { try { return (window.JUCUM_DATA.GROUPS.find(x => x.id === student.group) || {}).name || ''; } catch { return ''; } })();
  const txt = `Hola, soy ${student.fullName}${g ? ' del grupo ' + g : ''}. Quiero regularizar mi pago de la plataforma JUCUM.`;
  return `https://wa.me/${ph}?text=${encodeURIComponent(txt)}`;
}

/* Barra fija: recordatorio amable (azul) o aviso con cuenta regresiva (naranja) */
function PayReminderBar({ status, onGo }) {
  const av = status.state === 'aviso';
  return (
    <div className="pay-reminder" onClick={onGo} style={av ? {background:'#FFE0B2', color:'#7A3A00', borderColor:'#FFB74D'} : {background:'#E3F2FD', color:'#0D47A1', borderColor:'#90CAF9'}}>
      {av
        ? <span>⏳ Tu pago está pendiente: tu plataforma se pondrá <b>en pausa {payFmtDay(status.closeDate)}</b>. Registra tu pago o comunícate con administración.</span>
        : <span>📅 Recordatorio: tu pago vence <b>{status.daysLeft === 0 ? 'hoy' : payFmtDay(status.dueDate)}</b>. Si ya pagaste, regístralo.</span>}
      <button className="pay-reminder-btn">Registrar pago →</button>
    </div>
  );
}

/* Ventana del aviso: aparece UNA vez al día (día Perú) mientras dure el aviso */
function PayNoticeModal({ status, student, onGo, onClose }) {
  return (
    <div className="onb-backdrop" onClick={onClose}>
      <div className="onb-card" onClick={e => e.stopPropagation()} style={{borderTop:'6px solid #E65100'}}>
        <div className="onb-ico">⏳</div>
        <div className="onb-title" style={{color:'#B45300'}}>{status.reason ? 'Tu pago no se pudo aprobar' : 'Tu pago está pendiente'}</div>
        <div className="onb-body">{status.reason ? <><b>{status.reason}.</b> </> : null}Registra tu pago o comunícate con administración. Si no, tu plataforma se pondrá <b>en pausa {payFmtDay(status.closeDate)}</b> y no podrás practicar ni dar exámenes hasta regularizarlo.</div>
        <div style={{textAlign:'center', margin:'4px 0 10px'}}><span style={{display:'inline-block', background:'#FFF3E0', borderRadius:12, padding:'8px 16px', fontFamily:"'Fredoka',sans-serif", fontSize:28, fontWeight:600, color:'#B45300'}}>{status.daysLeft}<span style={{fontSize:12, marginLeft:4}}>día{status.daysLeft===1?'':'s'}</span></span></div>
        <div className="onb-actions" style={{flexWrap:'wrap', gap:8}}>
          <button className="btn-save" onClick={onGo}>💳 Registrar mi pago</button>
          <a className="btn-soft" href={payWaLink(student)} target="_blank" rel="noopener">💬 Escribir a administración</a>
          <button className="btn-cancel" onClick={onClose}>Entendido</button>
        </div>
      </div>
    </div>
  );
}

/* Pantalla de PAUSA: se ve en Inicio/Mi práctica/Tareas/Examen/Foro/Hablemos.
 * Mi avance, Boletín, Perfil y Pagos siguen abiertos (pedido de la usuaria). */
function PayBlockGate({ status, student, onGo, setView }) {
  const m = (() => { try { return window.JUCUM_DATA.getStudentMastery(student); } catch { return null; } })();
  return (
    <main>
      <div className="scard" style={{margin:'28px auto 14px', maxWidth:560, textAlign:'center', borderTop:'5px solid #C62828'}}>
        <div style={{fontSize:50}}>⏸️</div>
        <h1 style={{fontFamily:"'Fredoka',sans-serif", color:'#C62828', fontSize:24, margin:'8px 0'}}>Tu acceso está en pausa</h1>
        <p style={{fontSize:14, lineHeight:1.6, color:'var(--text)'}}>Tu pago está pendiente. Mientras tanto <b>tu avance no se registra</b> y los exámenes están en pausa. Todo lo que lograste está guardado.</p>
        <div className="row-flex" style={{gap:8, justifyContent:'center', flexWrap:'wrap', marginTop:14}}>
          <button className="btn-save" onClick={onGo}>💳 Registrar mi pago</button>
          {student && <a className="btn-soft" href={payWaLink(student)} target="_blank" rel="noopener">💬 Escribir a administración</a>}
        </div>
        <div className="settings-hint" style={{marginTop:12}}>Administración: {status.phone} · Av. Amazonas 934, Tingo María</div>
      </div>
      {student && (
        <div className="scard" style={{margin:'0 auto', maxWidth:560}}>
          <div className="sec-head"><div className="sec-title">🌱 Te está esperando</div></div>
          {student.streak > 0 && <div style={{fontSize:14, margin:'4px 0'}}>🔥 Tu racha de <b>{student.streak} día{student.streak===1?'':'s'}</b> — vuelve pronto para no perderla.</div>}
          {m && m.total > 0 && <div style={{fontSize:14, margin:'4px 0'}}>📚 Llevas <b>{m.done} de {m.total}</b> actividades de tu módulo. ¡Te falta poco!</div>}
          {setView && <div className="row-flex" style={{gap:8, marginTop:10, flexWrap:'wrap'}}>
            <button className="btn-soft" onClick={() => setView('avance')}>📈 Ver mi avance</button>
            {window.StudentBoletin && <button className="btn-soft" onClick={() => setView('boletin')}>📔 Mi boletín</button>}
          </div>}
        </div>
      )}
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

Object.assign(window, { StudentPayments, PaymentMethods, PayMethodRow, payDownscale, PayReminderBar, PayBlockGate, PayCelebration, PayNoticeModal, payFmtDay, payWaLink });