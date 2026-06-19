/* Bloque S · Retención — UI (panel de administración)
 * KPIs de altas/bajas + riesgo de abandono + análisis y recomendaciones reales.
 * StudentDataModal: ventanita en la misma página con los datos del alumno
 * (incluye si es INDEPENDIENTE o cuenta con APODERADO).
 */
const { useState: reUseState } = React;

/* ¿Independiente o con apoderado? (derivado de edad / datos del apoderado) */
function guardianInfo(s) {
  const minor = typeof s.age === 'number' && s.age < 18;
  const hasG = !!(s.guardianName && String(s.guardianName).trim());
  if (hasG || minor) return { independent: false, label: hasG ? `Con apoderado: ${s.guardianName}` : 'Con apoderado', icon:'👨‍👩‍👧' };
  return { independent: true, label: 'Alumno independiente', icon:'🧍' };
}

function StudentDataModal({ student, onClose }) {
  const D = window.JUCUM_DATA;
  const g = D.GROUPS.find(x => x.id === student.group);
  const lvl = D.LEVELS[student.level];
  const r = D.getStudentReadiness(student);
  const risk = window.JUCUM_RETENTION.riskOf(student);
  const gi = guardianInfo(student);
  const att = window.JUCUM_ATT ? window.JUCUM_ATT.getStudentSummary(student.id) : null;
  const pay = window.JUCUM_PAY ? window.JUCUM_PAY.getAccountStatus(student) : null;
  const riskColor = risk.level==='alto'?'#C62828':risk.level==='medio'?'#E65100':'#2E7D32';
  const Row = ({ k, v }) => (<div style={{display:'flex', justifyContent:'space-between', gap:12, padding:'7px 0', borderBottom:'1px solid #F0EDE4', fontSize:13.5}}><span style={{color:'var(--text-soft)', fontWeight:700}}>{k}</span><span style={{textAlign:'right'}}>{v}</span></div>);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" style={{maxWidth:520}} onClick={e=>e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{student.fullName}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{display:'flex', gap:8, flexWrap:'wrap', marginBottom:12}}>
            <span className="mm-chip" style={{background:'#EEF2FB', color:'#1F3A8A'}}>{lvl?.emoji} {lvl?.code}</span>
            <span className="mm-chip" style={{background:'#F0F0EA', color:'#555'}}>{g?.name || 'sin grupo'}</span>
            <span className="mm-chip" style={{background: gi.independent?'#E8F5E9':'#FFF8E1', color: gi.independent?'#2E7D32':'#7A4E00'}}>{gi.icon} {gi.independent?'Independiente':'Con apoderado'}</span>
            <span className="mm-chip" style={{background: risk.level==='bajo'?'#E8F5E9':risk.level==='medio'?'#FFF8E1':'#FFEBEE', color:riskColor}}>Riesgo {risk.level} ({risk.score})</span>
          </div>

          <div className="settings-block">
            <div className="settings-label">🧑‍💼 Datos personales</div>
            <Row k="Usuario" v={'@'+student.username} />
            <Row k="Correo" v={student.email || '—'} />
            <Row k="Edad" v={student.age != null ? student.age + ' años' : '—'} />
            <Row k="DNI" v={student.dni || '—'} />
            <Row k="Apoderado" v={gi.independent ? '— (independiente)' : (student.guardianName || 'Sí') + (student.guardianDni?` · DNI ${student.guardianDni}`:'')} />
            <Row k="Teléfono" v={student.phone || '—'} />
          </div>

          <div className="settings-block">
            <div className="settings-label">📊 Estado</div>
            <Row k="Cumplimiento" v={<b>{r.overall}%</b>} />
            <Row k="Asistencia" v={att && att.total ? `${att.pct}% (${att.asistio} asist · ${att.falto} faltas)` : 'sin registro'} />
            <Row k="Pago" v={pay ? (pay.state==='al_dia'?'✅ Al día':pay.state==='en_revision'?'🕒 En revisión':pay.state==='por_vencer'?`⏳ Por vencer (${pay.daysLeft}d)`:'🔒 Bloqueado') : '—'} />
            <Row k="Última práctica" v={(student.lastActiveDays||0)===0?'Hoy':`hace ${student.lastActiveDays}d`} />
          </div>

          {risk.factors.length > 0 && (
            <div className="settings-block">
              <div className="settings-label">⚠ Señales de riesgo</div>
              <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
                {risk.factors.map((f,i) => <span key={i} className="mm-chip" style={{background:'#FFF3E0', color:'#E65100'}}>{f.txt}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RetentionView() {
  const D = window.JUCUM_DATA; const RET = window.JUCUM_RETENTION;
  const ab = RET.altasBajas();
  const an = RET.analyze();
  const [open, setOpen] = reUseState(null);
  const [withdraw, setWithdraw] = reUseState(null);
  const [, setTick] = reUseState(0);
  const atRisk = an.risks.filter(x => x.r.level !== 'bajo').sort((a,b) => b.r.score - a.r.score);

  return (
    <main>
      <div className="welcome teacher">
        <div className="welcome-text">
          <div className="eyebrow t">📉 Retención</div>
          <h1>Altas, bajas y riesgo de abandono</h1>
          <p>Tasa de retención <b>{ab.retencion}%</b> · {ab.activos} activos · +{ab.altasMes} este mes · −{ab.bajasMes} bajas este mes</p>
        </div>
      </div>

      <div className="kpi-grid" style={{marginTop:16}}>
        <div className="kpi"><div className="kpi-ico">🟢</div><div className="kpi-num">{ab.activos}</div><div className="kpi-lbl">Activos</div></div>
        <div className="kpi"><div className="kpi-ico">➕</div><div className="kpi-num">{ab.altasMes}</div><div className="kpi-lbl">Nuevos (mes)</div></div>
        <div className="kpi"><div className="kpi-ico">➖</div><div className="kpi-num">{ab.bajasMes}</div><div className="kpi-lbl">Bajas (mes)</div></div>
        <div className="kpi"><div className="kpi-ico">⚠</div><div className="kpi-num" style={{color:'#C62828'}}>{an.alto}</div><div className="kpi-lbl">Riesgo alto</div></div>
        <div className="kpi"><div className="kpi-ico">🟡</div><div className="kpi-num" style={{color:'#E65100'}}>{an.medio}</div><div className="kpi-lbl">Riesgo medio</div></div>
      </div>

      {/* Análisis */}
      <div className="scard" style={{marginTop:16}}>
        <div className="sec-head"><div className="sec-title">🔎 Qué dicen los datos</div></div>
        {an.findings.length === 0 ? <div className="settings-hint">Sin señales de alarma por ahora. Mantén el acompañamiento y la constancia del grupo.</div> : (
          <ul style={{margin:0, paddingLeft:18, lineHeight:1.6, fontSize:13.5}}>
            {an.findings.map((f,i) => <li key={i} style={{marginBottom:6}}>{f}</li>)}
          </ul>
        )}
        {an.topReasons.length > 0 && (
          <div style={{marginTop:10, paddingTop:10, borderTop:'1px dashed var(--border)'}}>
            <div style={{fontWeight:800, fontSize:12.5, color:'var(--text-soft)', marginBottom:6}}>Motivos de baja registrados:</div>
            <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
              {an.topReasons.map((r,i) => <span key={i} className="mm-chip" style={{background:'#FFEBEE', color:'#C62828'}}>{r.reason} · {r.n}</span>)}
            </div>
          </div>
        )}
      </div>

      {/* Recomendaciones */}
      <div className="scard" style={{marginTop:14}}>
        <div className="sec-head"><div className="sec-title">✅ Recomendaciones para reducir el abandono</div></div>
        <div style={{display:'grid', gap:10}}>
          {an.recs.map((r,i) => (
            <div key={i} style={{padding:'10px 12px', border:'1px solid #C9D4F0', borderRadius:10, background:'#F5F8FF'}}>
              <div style={{fontWeight:800, fontSize:13.5, color:'#1F3A8A', marginBottom:3}}>{i+1}. {r.t}</div>
              <div style={{fontSize:13, lineHeight:1.55, color:'var(--text)'}}>{r.b}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Alumnos en riesgo */}
      <div className="scard" style={{marginTop:14}}>
        <div className="sec-head"><div className="sec-title">🚨 Alumnos en riesgo</div><span className="sec-meta">Clic para ver sus datos</span></div>
        {atRisk.length === 0 ? <div className="empty-state">Ningún alumno en riesgo ahora mismo. 🎉</div> : (
          <div className="sm-list">
            {atRisk.map(({ s, r }) => {
              const lvl = D.LEVELS[s.level];
              return (
                <div key={s.id} className="sm-row" style={{flexWrap:'wrap', cursor:'pointer'}} onClick={()=>setOpen(s)}>
                  <div className="st-ava" style={{background:`linear-gradient(135deg,${lvl.color}80,${lvl.dark})`}}>{s.fullName.split(' ').map(n=>n[0]).slice(0,2).join('')}</div>
                  <div className="sm-info">
                    <div className="sm-name">{s.fullName}</div>
                    <div className="sm-meta">{r.factors.slice(0,3).map(f=>f.txt).join(' · ') || 'señales leves'}</div>
                  </div>
                  <span className="mm-chip" style={{background: r.level==='alto'?'#FFEBEE':'#FFF8E1', color: r.level==='alto'?'#C62828':'#E65100'}}>Riesgo {r.level}</span>
                  <button className="att-btn" onClick={(e)=>{ e.stopPropagation(); setWithdraw(s); }}>Marcar baja</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {open && <StudentDataModal student={open} onClose={()=>setOpen(null)} />}
      {withdraw && <WithdrawModal student={withdraw} onClose={()=>setWithdraw(null)} onDone={()=>{ setWithdraw(null); setTick(t=>t+1); }} />}
    </main>
  );
}

function WithdrawModal({ student, onClose, onDone }) {
  const RET = window.JUCUM_RETENTION;
  const [reason, setReason] = reUseState('');
  const [note, setNote] = reUseState('');
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" style={{maxWidth:440}} onClick={e=>e.stopPropagation()}>
        <div className="modal-head"><div className="modal-title">Registrar baja · {student.fullName}</div><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div className="settings-hint" style={{marginBottom:10}}>Registrar el <b>motivo real</b> es clave: es lo que te dirá, con el tiempo, dónde está la verdadera fuga de alumnos.</div>
          <div className="settings-block">
            <div className="settings-label">Motivo</div>
            <select className="input-text" style={{width:'100%'}} value={reason} onChange={e=>setReason(e.target.value)}>
              <option value="">— Elegir motivo —</option>
              {RET.REASONS.map(r => <option key={r.k} value={r.k}>{r.l}</option>)}
            </select>
          </div>
          <div className="settings-block">
            <div className="settings-label">Detalle (opcional)</div>
            <textarea className="eval-textarea" rows={2} value={note} onChange={e=>setNote(e.target.value)} placeholder="Lo que comentó el alumno…" />
          </div>
          <div className="modal-actions"><button className="btn-cancel" onClick={onClose}>Cancelar</button><button className="btn-save" disabled={!reason} onClick={()=>{ RET.markWithdrawn(student, reason, note); onDone(); }}>Registrar baja</button></div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { RetentionView, StudentDataModal, WithdrawModal, guardianInfo });
