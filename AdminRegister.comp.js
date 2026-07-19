/* Bloque R · Registro de alumnos — UI de la administradora
 * RegisterStudentForm : alta manual (nombre, correo, edad, DNI, apoderado si es
 *                       menor, grupo, modo de pago, voucher).
 * InscripcionesView   : inscripciones del link de autoregistro → aprobar/rechazar.
 */
const { useState: rgUseState } = React;

/* 🧾 El voucher ya NO viaja en el caché local (los base64 pesaban megas y
 * llenaban el cupo de localStorage → se congelaba el seguimiento). Se trae de
 * la nube recién al hacer clic y se muestra en un modal. */
function VoucherLink({ reg }) {
  const [busy, setBusy] = rgUseState(false);
  const [data, setData] = rgUseState(reg.voucher || null);
  const [open, setOpen] = rgUseState(false);
  const view = async () => {
    if (!data) {
      setBusy(true);
      const v = await window.JUCUM_REG.fetchVoucher(reg.id);
      setBusy(false);
      if (!v) { alert('No se pudo cargar el voucher desde la nube.'); return; }
      setData(v);
      setOpen(true);
    } else setOpen(true);
  };
  return (
    <>
      <button className="att-btn" onClick={view} disabled={busy}>🧾 {busy ? 'Cargando…' : 'Ver voucher'}</button>
      {open && data && (
        <div className="modal-backdrop" onClick={()=>setOpen(false)}>
          <div className="modal settings-modal" style={{maxWidth:520}} onClick={e=>e.stopPropagation()}>
            <div className="modal-head"><div className="modal-title">🧾 Voucher · {reg.fullName}</div><button className="modal-close" onClick={()=>setOpen(false)}>✕</button></div>
            <div className="modal-body" style={{textAlign:'center'}}>
              {data.indexOf('data:image') === 0
                ? <img src={data} alt="voucher" style={{maxWidth:'100%', maxHeight:'70vh', borderRadius:10, border:'1px solid #E4DFD3'}} />
                : <a className="btn-save" href={data} download={`voucher-${(reg.fullName||'alumno').replace(/\s+/g,'-')}.pdf`}>⬇ Descargar PDF</a>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const PAY_MODES = [
  { k:'mensual', l:'Mensual' },
  { k:'modulo',  l:'Por módulo' },
  { k:'total',   l:'Paquete completo' },
];

function RegisterStudentForm({ onClose, onDone, prefill }) {
  const D = window.JUCUM_DATA;
  const [f, setF] = rgUseState({
    fullName: prefill?.fullName || '', email: prefill?.email || '', age: prefill?.age || '',
    dni: prefill?.dni || '', guardianName: prefill?.guardianName || '', guardianDni: prefill?.guardianDni || '',
    phone: prefill?.phone || '', level: 'pre-a1', group: '', payMode: 'mensual', voucher: prefill?.voucher || null,
  });
  const [err, setErr] = rgUseState('');
  const [busy, setBusy] = rgUseState(false);
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const isMinor = f.age !== '' && Number(f.age) < 18;
  const groups = D.GROUPS.filter(g => g.level === f.level);
  const username = f.fullName ? window.JUCUM_REG.usernameFrom(f.fullName) : '';

  const submit = async () => {
    if (!f.fullName.trim()) { setErr('El nombre completo es obligatorio.'); return; }
    if (!f.dni.trim()) { setErr('El DNI es obligatorio.'); return; }
    if (isMinor && !f.guardianName.trim()) { setErr('Para menores de edad, indica el nombre del apoderado.'); return; }
    if (!f.group) { setErr('Asigna un grupo.'); return; }
    setBusy(true);
    const stu = await window.JUCUM_REG.createStudentDirect({ ...f, age: f.age ? Number(f.age) : null });
    setBusy(false);
    if (stu) onDone(stu, username);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" style={{maxWidth:600}} onClick={e=>e.stopPropagation()}>
        <div className="modal-head"><div className="modal-title">➕ Registrar alumno</div><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          {err && <div className="err" style={{marginBottom:12}}>⚠ {err}</div>}
          <div className="settings-block">
            <div className="settings-label">🧑‍💼 Nombre completo</div>
            <input className="input-text" style={{width:'100%'}} value={f.fullName} onChange={e=>set('fullName', e.target.value)} placeholder="Ej: Ana Pérez García" />
            {username && <div className="settings-hint">Usuario que se creará: <b>{username}</b> · contraseña inicial <b>1234</b></div>}
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
            <div className="settings-block"><div className="settings-label">📧 Correo electrónico</div><input className="input-text" style={{width:'100%'}} type="email" value={f.email} onChange={e=>set('email', e.target.value)} /></div>
            <div className="settings-block"><div className="settings-label">🙍 Edad</div><input className="input-text" style={{width:'100%'}} type="number" min="3" max="99" value={f.age} onChange={e=>set('age', e.target.value)} /></div>
          </div>
          <div className="settings-block"><div className="settings-label">✏️ Número de DNI</div><input className="input-text" style={{width:'100%'}} value={f.dni} onChange={e=>set('dni', e.target.value)} /></div>
          {isMinor && (
            <div style={{display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:12, padding:'10px 12px', background:'#FFF8E8', border:'1px solid #F4C430', borderRadius:10, marginBottom:12}}>
              <div><div className="settings-label">👨‍👩‍👧 Nombre del apoderado</div><input className="input-text" style={{width:'100%'}} value={f.guardianName} onChange={e=>set('guardianName', e.target.value)} /></div>
              <div><div className="settings-label">DNI del apoderado</div><input className="input-text" style={{width:'100%'}} value={f.guardianDni} onChange={e=>set('guardianDni', e.target.value)} /></div>
            </div>
          )}
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
            <div className="settings-block">
              <div className="settings-label">Nivel</div>
              <div className="preset-row">{Object.entries(D.LEVELS).map(([k,lv]) => <button key={k} className={`preset ${f.level===k?'on':''}`} onClick={()=>{set('level',k);set('group','');}}>{lv.emoji} {lv.code}</button>)}</div>
            </div>
            <div className="settings-block">
              <div className="settings-label">Grupo</div>
              <select className="input-text" style={{width:'100%'}} value={f.group} onChange={e=>set('group', e.target.value)}>
                <option value="">— Elegir grupo —</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name} · {g.schedule}</option>)}
              </select>
            </div>
          </div>
          <div className="settings-block">
            <div className="settings-label">💳 Modo de pago</div>
            <div className="preset-row">{PAY_MODES.map(m => <button key={m.k} className={`preset ${f.payMode===m.k?'on':''}`} onClick={()=>set('payMode', m.k)}>{m.l}</button>)}</div>
          </div>
          <div className="settings-block">
            <div className="settings-label">🧾 Voucher de pago (opcional)</div>
            {f.voucher
              ? <div className="row-flex"><img src={f.voucher} alt="voucher" style={{height:48, borderRadius:6}} /><button className="att-btn" onClick={()=>set('voucher', null)}>Quitar</button></div>
              : <input type="file" accept="image/*,application/pdf" onChange={e=>window.JUCUM_REG.compressVoucherFile(e.target.files[0], (v,err)=>{ if(err){alert(err);return;} set('voucher', v); })} />}
          </div>
          <div className="modal-actions"><button className="btn-cancel" onClick={onClose}>Cancelar</button><button className="btn-save" onClick={submit} disabled={busy}>{busy?'Creando…':'➕ Crear alumno'}</button></div>
        </div>
      </div>
    </div>
  );
}

function InscripcionesView() {
  const D = window.JUCUM_DATA; const R = window.JUCUM_REG;
  const [, setTick] = rgUseState(0);
  const [copied, setCopied] = rgUseState(false);
  const regLink = (location.origin && location.origin !== 'null' ? location.origin : 'https://jucum-english-center.netlify.app') + location.pathname.replace(/[^/]*$/, '') + 'registro.html';
  const refresh = () => setTick(t => t + 1);
  const [approving, setApproving] = rgUseState(null);
  const pend = R.listRegistrations('pendiente');
  const done = R.listRegistrations().filter(r => r.status !== 'pendiente');

  return (
    <main>
      <div className="welcome teacher">
        <div className="welcome-text">
          <div className="eyebrow t">📝 Inscripciones</div>
          <h1>{pend.length} por revisar</h1>
          <p>Solicitudes del link de autoregistro. Revisa el voucher, asigna grupo y aprueba para crear la cuenta del alumno.</p>
        </div>
      </div>

      <div className="scard" style={{marginTop:18, background:'#EEF2FB', borderColor:'#C9D4F0'}}>
        <div className="sec-head"><div className="sec-title">🔗 Link de autoregistro</div></div>
        <div className="settings-hint" style={{marginBottom:8}}>Comparte este link con quien quiera inscribirse. Llenan sus datos y suben su voucher, y aparecen aquí abajo para aprobar.</div>
        <div className="row-flex" style={{gap:8, flexWrap:'wrap'}}>
          <input className="input-text" readOnly value={regLink} onFocus={e=>e.target.select()} style={{flex:1, minWidth:240, fontSize:13}} />
          <button className="btn-save" onClick={()=>{ try{ navigator.clipboard.writeText(regLink); setCopied(true); setTimeout(()=>setCopied(false),1500);}catch(e){} }}>{copied?'✅ Copiado':'📋 Copiar link'}</button>
          <a className="att-btn" href={regLink} target="_blank" rel="noreferrer">Abrir</a>
        </div>
      </div>

      <div className="scard" style={{marginTop:14}}>
        <div className="sec-head"><div className="sec-title">Pendientes</div></div>
        {pend.length === 0 ? <div className="empty-state"><div className="icon">📝</div>No hay inscripciones pendientes. Comparte el link de registro con tus alumnos.</div> : (
          <div className="sm-list">
            {pend.map(r => (
              <div key={r.id} className="sm-row" style={{flexWrap:'wrap'}}>
                <div className="sm-info">
                  <div className="sm-name">{r.fullName} · {r.age?`${r.age} años`:''}</div>
                  <div className="sm-meta">DNI {r.dni||'—'} · {r.email||'sin correo'} · pago {window.JUCUM_PAY?.labelMode(r.payMode)||r.payMode||'—'}{r.guardianName?` · apoderado: ${r.guardianName}`:''}</div>
                </div>
                {(r.voucher || r.voucherRef) && <VoucherLink reg={r} />}
                <button className="att-btn" style={{borderColor:'#EF9A9A',color:'#C62828'}} onClick={()=>{ if(confirm('¿Rechazar esta inscripción?')){ R.rejectRegistration(r.id); refresh(); } }}>Rechazar</button>
                <button className="btn-save" onClick={()=>setApproving(r)}>✓ Aprobar y asignar grupo</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {done.length > 0 && (
        <div className="scard" style={{marginTop:14}}>
          <div className="sec-head"><div className="sec-title">Historial</div></div>
          <div className="sm-list">
            {done.slice(0,10).map(r => (
              <div key={r.id} className="sm-row">
                <div className="sm-info"><div className="sm-name">{r.fullName}</div><div className="sm-meta">{new Date(r.createdAt).toLocaleDateString('es-PE')}</div></div>
                <span className="mm-chip" style={{background: r.status==='aprobado'?'#E8F5E9':'#FFEBEE', color: r.status==='aprobado'?'#2E7D32':'#C62828'}}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {approving && <ApproveModal reg={approving} onClose={()=>setApproving(null)} onDone={()=>{ setApproving(null); refresh(); }} />}
    </main>
  );
}

function ApproveModal({ reg, onClose, onDone }) {
  const D = window.JUCUM_DATA;
  const [level, setLevel] = rgUseState(reg.level || 'pre-a1');
  const [group, setGroup] = rgUseState('');
  const [busy, setBusy] = rgUseState(false);
  const groups = D.GROUPS.filter(g => g.level === level);
  const approve = async () => {
    if (!group) return;
    setBusy(true);
    const stu = await window.JUCUM_REG.approveRegistration(reg.id, { group, level });
    setBusy(false);
    if (stu) { alert(`✅ ${reg.fullName} inscrito. Usuario: ${stu.username} · contraseña 1234.`); onDone(); }
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" style={{maxWidth:460}} onClick={e=>e.stopPropagation()}>
        <div className="modal-head"><div className="modal-title">✓ Aprobar inscripción</div><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div className="settings-hint" style={{marginBottom:12}}>{reg.fullName} · DNI {reg.dni||'—'}</div>
          <div className="settings-block">
            <div className="settings-label">Nivel</div>
            <div className="preset-row">{Object.entries(D.LEVELS).map(([k,lv]) => <button key={k} className={`preset ${level===k?'on':''}`} onClick={()=>{setLevel(k);setGroup('');}}>{lv.emoji} {lv.code}</button>)}</div>
          </div>
          <div className="settings-block">
            <div className="settings-label">Grupo</div>
            <select className="input-text" style={{width:'100%'}} value={group} onChange={e=>setGroup(e.target.value)}>
              <option value="">— Elegir grupo —</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name} · {g.schedule}</option>)}
            </select>
          </div>
          <div className="modal-actions"><button className="btn-cancel" onClick={onClose}>Cancelar</button><button className="btn-save" onClick={approve} disabled={busy||!group}>{busy?'Creando…':'✓ Crear alumno'}</button></div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { RegisterStudentForm, InscripcionesView, ApproveModal });
