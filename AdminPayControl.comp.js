/* 🚦 Control de pagos — panel de la ADMINISTRADORA (script 30 · motor pay-gate.js)
 * Aprobado en "Espejo - Gestion de pagos v2.html" (01-oct-2026).
 * Inicio (próximos cobros) · Deudores · Grupos y fechas · Por alumno · Ajustes · Bitácora.
 * Todo en día PERÚ. Nada aquí bloquea a nadie si el interruptor general está apagado. */

const PC_ST = {
  off:['Control apagado','#6B7280','#F1F3F6'], ok:['Al día','#2E7D32','#E8F5E9'], pre:['Paga pronto','#1565C0','#E3F2FD'],
  ex:['Exonerado','#546E7A','#ECEFF1'], rev:['En revisión','#1565C0','#E3F2FD'], pr:['Prórroga','#6A1B9A','#F3E5F5'],
  mark:['Deudor · aviso sin enviar','#B45300','#FFF3E0'], av:['Aviso de pausa','#E65100','#FFE0B2'], cl:['En pausa por pago','#C62828','#FFEBEE'],
  nod:['Sin día de pago','#6B7280','#F1F3F6'],
};
const pcOwe = (k) => k === 'mark' || k === 'av' || k === 'cl';
const pcToday = () => window.JUCUM_PAYGATE.peruToday();
function pcFmt(iso, long) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const DW = ['dom','lun','mar','mié','jue','vie','sáb'], MO = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return (long ? DW[dt.getUTCDay()] + ' ' : '') + d + '-' + MO[m - 1];
}
function pcPhone(s) { let p = String(s.phone || '').replace(/\D/g, ''); if (p.length === 9) p = '51' + p; return p.length >= 11 ? p : ''; }
function PcChip({ k }) { const [l, c, bg] = PC_ST[k] || PC_ST.off; return <span className="mm-chip" style={{background:bg, color:c, display:'inline-flex', alignItems:'center', gap:6}}><span style={{width:8, height:8, borderRadius:'50%', background:c}}></span>{l}</span>; }
function pcSub(g) {
  switch (g.k) {
    case 'ok': return g.next ? 'Próximo pago ' + pcFmt(g.next, true) : (g.auto === false ? 'Solo se avisa a los marcados a mano' : '');
    case 'pre': return g.left === 0 ? 'Vence HOY' : 'Vence ' + pcFmt(g.due, true);
    case 'av': return (g.due ? 'Venció el ' + pcFmt(g.due) + ' · ' : '') + 'se pausa ' + pcFmt(g.close, true);
    case 'cl': return g.manual && !g.since ? 'Pausado a mano' : 'Desde el ' + pcFmt(g.since);
    case 'mark': return 'El alumno todavía NO ve nada';
    case 'pr': return 'Hasta el ' + pcFmt(g.until);
    case 'rev': return 'Subió su captura · sigue practicando';
    case 'ex': return 'Nunca recibe avisos';
    case 'nod': return 'Define el día de pago del grupo';
    default: return '';
  }
}

function PcModal({ title, children, onClose, onOk, okLabel, okStyle, busy, err }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" style={{maxWidth:470}} onClick={e => e.stopPropagation()}>
        <div className="modal-head"><div className="modal-title">{title}</div><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          {children}
          {err && <div className="err" style={{marginTop:10}}>⚠ {err}</div>}
          <div className="modal-actions"><button className="btn-cancel" onClick={onClose}>Cancelar</button>{onOk && <button className="btn-save" disabled={busy} style={okStyle} onClick={onOk}>{busy ? 'Guardando…' : (okLabel || 'Confirmar')}</button>}</div>
        </div>
      </div>
    </div>
  );
}

function AdminPayControl({ onChange }) {
  const D = window.JUCUM_DATA; const P = window.JUCUM_PAY; const PG = window.JUCUM_PAYGATE;
  const [tick, setTick] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState('deudores');
  const [filter, setFilter] = React.useState('deben');
  const [dlg, setDlg] = React.useState(null);
  const [log, setLog] = React.useState([]);
  const bump = () => { setTick(t => t + 1); onChange && onChange(); };
  const reload = () => { setLoading(true); P.gateLoad().then(() => P.gateLogList(80)).then(l => { setLog(l); setLoading(false); setTick(t => t + 1); }); };
  React.useEffect(reload, []);

  if (!PG) return <div className="scard" style={{marginTop:16}}><div className="err">Falta el archivo pay-gate.js en el servidor.</div></div>;
  if (loading && !P.gateReady()) return <div className="scard" style={{marginTop:16}}><div className="settings-hint">Cargando el control de pagos…</div></div>;
  if (!P.gateReady()) return (
    <div className="scard" style={{marginTop:16, borderLeft:'5px solid #C62828'}}>
      <div className="sec-title" style={{color:'#C62828'}}>No se pudo leer el control de pagos</div>
      <div className="settings-hint" style={{marginTop:6}}>¿Ya se ejecutó el <b>script 30</b> en Supabase? Mientras no se lea, <b>nadie recibe avisos ni pausa</b> (protección). Detalle: {P.gateError()}</div>
      <button className="att-btn" style={{marginTop:10}} onClick={reload}>↻ Reintentar</button>
    </div>
  );

  const ctl = P.gateCtl();
  const today = pcToday();
  const auto = !!(ctl.autoFrom && today >= ctl.autoFrom);
  const isFin = (gid) => !!(window.JUCUM_GRAD && window.JUCUM_GRAD.isFinished(gid));
  const groups = D.GROUPS.filter(g => !isFin(g.id)).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const students = D.STUDENTS.filter(s => !s.closedAt && !isFin(s.group) && !(window.JUCUM_GRAD && window.JUCUM_GRAD.isGraduated && window.JUCUM_GRAD.isGraduated(s.id)));
  const rows = students.map(s => ({ s, g: P.gateStatus(s), r: P.gateRow(s.id) || {}, a: P.amountFor(s) }));
  const gname = (gid) => (D.GROUPS.find(g => g.id === gid) || {}).name || 'Sin grupo';
  const marked = rows.filter(x => x.g.k === 'mark');
  const run = async (fn) => { const r = await fn(); if (r && r.ok === false) { alert('No se pudo guardar: ' + (r.error || '')); } bump(); P.gateLogList(80).then(setLog); };

  /* ── acciones ── */
  const act = {
    mark: (s) => run(() => P.gateSet(s.id, { debtor: true, notice_start: null }, 'marcó deudor', '')),
    unmark: (s) => run(() => P.gateSet(s.id, { debtor: false, notice_start: null, closed_manual: false }, 'quitó marca', 'Ya no es deudor')),
    notice: (list) => setDlg({ kind: 'notice', list }),
    paid: (x) => setDlg({ kind: 'paid', x }),
    pror: (x) => setDlg({ kind: 'pror', x }),
    pause: (x) => setDlg({ kind: 'pause', x }),
    reopen: (x) => setDlg({ kind: 'reopen', x }),
    emerg: (x) => setDlg({ kind: 'emerg', x }),
    edit: (x) => setDlg({ kind: 'edit', x }),
  };

  /* ── encabezado: interruptor + modo ── */
  const head = !ctl.on ? (
    <div className="scard" style={{marginTop:16, borderLeft:'5px solid #9E9E9E'}}>
      <div className="row-flex" style={{justifyContent:'space-between', gap:10, flexWrap:'wrap'}}>
        <div style={{flex:1, minWidth:240}}><div className="sec-title">⚪ Control de pagos APAGADO</div><div className="settings-hint" style={{marginTop:4}}>Nadie ve avisos ni pausa. Puedes marcar deudores y preparar todo; al activarlo, <b>solo</b> los marcados a los que les envíes el aviso lo verán{ctl.autoFrom ? <> (y desde el {pcFmt(ctl.autoFrom, true)}, todos según su fecha)</> : null}.</div></div>
        <button className="btn-save" onClick={() => setDlg({ kind: 'power', on: true })}>Activar control</button>
      </div>
    </div>
  ) : (
    <div className="scard" style={{marginTop:16, borderLeft:`5px solid ${auto ? '#F9A825' : '#2EA84B'}`}}>
      <div className="row-flex" style={{justifyContent:'space-between', gap:10, flexWrap:'wrap'}}>
        <div style={{flex:1, minWidth:240}}>
          <div className="sec-title">{auto ? '🟡 Avisos para TODOS según su fecha de pago' : '🟢 Solo deudores marcados por ti'}</div>
          <div className="settings-hint" style={{marginTop:4}}>{auto ? 'Si pasa el día de pago sin pago registrado, el aviso empieza solo. Grupos sin día de pago: nadie recibe avisos automáticos.' : <>Solo ven aviso los alumnos que marcas y a los que les <b>envías</b> el aviso. {ctl.autoFrom ? <>Desde el <b>{pcFmt(ctl.autoFrom, true)}</b>: para todos.</> : 'El aviso automático para todos aún no tiene fecha (Ajustes).'}</>}</div>
        </div>
        <button className="att-btn" onClick={() => setDlg({ kind: 'power', on: false })}>Apagar</button>
      </div>
    </div>
  );

  /* ── próximos cobros (cartel del panel principal) ── */
  const cobros = (
    <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:10, marginTop:12}}>
      {groups.map(g => {
        const gc = (ctl.groups || {})[g.id] || {};
        const lvl = D.LEVELS[g.level] || { color:'#90A4AE', emoji:'📘' };
        const mine = rows.filter(x => x.s.group === g.id);
        const debe = mine.filter(x => pcOwe(x.g.k)).length;
        const soon = mine.filter(x => x.g.k === 'pre').length;
        if (!gc.payDay) return (
          <div key={g.id} className="scard" style={{padding:12, borderLeft:`6px solid ${lvl.color}`}}>
            <div style={{fontWeight:800, fontSize:14}}>{lvl.emoji} {g.name}</div>
            <div style={{fontFamily:"'Fredoka',sans-serif", fontSize:18, color:'#B45300', margin:'4px 0'}}>Falta el día de pago</div>
            <div className="settings-hint" style={{margin:0}}>Sin día no hay avisos automáticos.{debe ? <> · <b style={{color:'#C62828'}}>{debe} debe{debe > 1 ? 'n' : ''}</b></> : null}</div>
            <button className="att-btn" style={{marginTop:8}} onClick={() => setTab('grupos')}>Definir día</button>
          </div>
        );
        const nx = PG.lastDue(today, gc.payDay) === today ? today : PG.nextDue(today, gc.payDay);
        const dl = PG.diff(nx, today);
        return (
          <div key={g.id} className="scard" style={{padding:12, borderLeft:`6px solid ${lvl.color}`}}>
            <div className="row-flex" style={{justifyContent:'space-between'}}><span style={{fontWeight:800, fontSize:14}}>{lvl.emoji} {g.name}</span><span className="settings-hint" style={{margin:0}}>cada {gc.payDay}</span></div>
            <div style={{fontFamily:"'Fredoka',sans-serif", fontSize:22, fontWeight:600, color: dl <= 3 ? '#E65100' : '#0D1B5A', margin:'4px 0'}}>{dl === 0 ? 'Hoy' : `En ${dl} día${dl > 1 ? 's' : ''}`}</div>
            <div className="settings-hint" style={{margin:0}}>{pcFmt(nx, true)}{soon ? ` · ${soon} por pagar pronto` : ''} · {debe ? <b style={{color:'#C62828'}}>{debe} debe{debe > 1 ? 'n' : ''}</b> : 'nadie debe'}</div>
          </div>
        );
      })}
    </div>
  );

  const cnt = (f) => rows.filter(f).length;
  const porCobrar = rows.filter(x => pcOwe(x.g.k)).reduce((a, x) => a + (x.a.amount || 0), 0);
  const kpis = (
    <div className="row-flex" style={{gap:8, flexWrap:'wrap', marginTop:12}}>
      {[['Deben', cnt(x => pcOwe(x.g.k)), '#C62828'], ['En aviso', cnt(x => x.g.k === 'av'), '#E65100'], ['En pausa', cnt(x => x.g.k === 'cl'), '#8E1B1B'], ['En revisión', cnt(x => x.g.k === 'rev'), '#1565C0'], ['Por cobrar', `${P.getConfig().currency} ${porCobrar}`, '#0D1B5A']].map(([t, n, c]) => (
        <div key={t} className="scard" style={{padding:'8px 14px', minWidth:110}}><div style={{fontFamily:"'Fredoka',sans-serif", fontSize:20, fontWeight:600, color:c}}>{n}</div><div className="settings-hint" style={{margin:0}}>{t}</div></div>
      ))}
    </div>
  );

  const cta = marked.length > 0 && (
    <div className="scard" style={{marginTop:12, background:'#FFF3E0', borderColor:'#FFB74D'}}>
      <div className="row-flex" style={{justifyContent:'space-between', gap:10, flexWrap:'wrap'}}>
        <div><b style={{color:'#7A3A00'}}>{marked.length} deudor{marked.length > 1 ? 'es' : ''} marcado{marked.length > 1 ? 's' : ''} sin aviso</b><div style={{fontSize:12.5, color:'#7A3A00', fontWeight:700}}>{marked.map(x => x.s.fullName).join(' · ')}</div></div>
        <button className="btn-save" style={{background:'#E65100'}} onClick={() => act.notice(marked.map(x => x.s))}>Revisar y enviar aviso</button>
      </div>
    </div>
  );

  /* ── pestaña DEUDORES ── */
  const FL = { deben: x => pcOwe(x.g.k), ok: x => ['ok','pre','ex','rev','pr','off'].includes(x.g.k), nod: x => x.g.k === 'nod', todos: () => true };
  const deudores = (
    <>
      <div className="mm-tabs" style={{marginTop:12}}>
        {[['deben','Deben'], ['ok','Al día / revisión'], ['nod','Sin día de pago'], ['todos','Todos']].map(([k, t]) => <button key={k} className={`mm-tab ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>{t} <span className="mm-count">{cnt(FL[k])}</span></button>)}
      </div>
      {groups.map(gr => {
        const list = rows.filter(x => x.s.group === gr.id && FL[filter](x)).sort((a, b) => a.s.fullName.localeCompare(b.s.fullName, 'es'));
        if (!list.length) return null;
        const gc = (ctl.groups || {})[gr.id] || {};
        return (
          <div key={gr.id} style={{marginTop:12}}>
            <div style={{fontWeight:800, fontSize:13.5, color:'#0D1B5A', margin:'0 0 6px'}}>{gr.name} <span className="settings-hint" style={{margin:0, fontWeight:600}}>· {gc.payDay ? 'paga cada ' + gc.payDay : 'día de pago sin definir'}</span></div>
            <div style={{display:'flex', flexDirection:'column', gap:6}}>
              {list.map(x => { const { s, g, a } = x; const k = g.k; const ph = pcPhone(s); return (
                <div key={s.id} className="scard" style={{padding:'10px 12px', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))', gap:10, alignItems:'center'}}>
                  <div><div style={{fontWeight:800, fontSize:13.5}}>{s.fullName}</div><div className="settings-hint" style={{margin:0}}>{P.getConfig().currency} {a.amount || '—'}{a.special ? ' · especial' : ''}{x.r.join_date ? ' · empezó ' + pcFmt(x.r.join_date) : ''}</div></div>
                  <div><PcChip k={k} /><div className="settings-hint" style={{margin:'3px 0 0'}}>{pcSub(g)}</div></div>
                  <div className="row-flex" style={{gap:5, flexWrap:'wrap', justifyContent:'flex-end'}}>
                    {k !== 'ex' && <button className="att-btn" style={{borderColor:'#A5D6A7', color:'#2E7D32'}} onClick={() => act.paid(x)}>Pagó</button>}
                    {!['mark','av','cl','ex'].includes(k) && <button className="att-btn" style={{borderColor:'#FFCC80', color:'#B45300'}} onClick={() => act.mark(s)}>Marcar deudor</button>}
                    {k === 'mark' && <button className="att-btn" style={{background:'#E65100', color:'#fff', borderColor:'#E65100'}} onClick={() => act.notice([s])}>Enviar aviso</button>}
                    {(k === 'mark' || (k === 'av' && g.manual)) && <button className="att-btn" onClick={() => act.unmark(s)}>{k === 'mark' ? 'Quitar marca' : 'Deshacer'}</button>}
                    {['mark','av','nod','pre'].includes(k) && <button className="att-btn" style={{borderColor:'#CE93D8', color:'#6A1B9A'}} onClick={() => act.pror(x)}>Prórroga</button>}
                    {k === 'av' && <button className="att-btn" style={{borderColor:'#EF9A9A', color:'#C62828'}} onClick={() => act.pause(x)}>Pausar ya</button>}
                    {k === 'cl' && <button className="att-btn" style={{borderColor:'#90CAF9', color:'#1565C0'}} onClick={() => act.reopen(x)}>Reabrir</button>}
                    {k === 'cl' && <button className="att-btn" onClick={() => act.emerg(x)}>Ver avance</button>}
                    {ph && ['mark','av','cl'].includes(k) && <a className="att-btn" href={`https://wa.me/${ph}?text=${encodeURIComponent(`Hola ${s.fullName.split(' ')[0]}, te escribimos de JUCUM English Center: tu pago está pendiente. Por favor regístralo en la plataforma (💳 Pagos) o comunícate con nosotros. ¡Gracias!`)}`} target="_blank" rel="noopener" onClick={() => P.gateLog(s.id, 'whatsapp', 'Mensaje de pago por WhatsApp')}>WhatsApp</a>}
                    <button className="att-btn" onClick={() => act.edit(x)}>Editar</button>
                  </div>
                </div>
              ); })}
            </div>
          </div>
        );
      })}
      {cnt(FL[filter]) === 0 && <div className="scard" style={{marginTop:12}}><div className="empty-state"><div className="icon">✅</div>{filter === 'deben' ? 'Nadie debe en este momento.' : 'Sin alumnos en esta categoría.'}</div></div>}
    </>
  );

  /* ── pestaña GRUPOS Y FECHAS ── */
  const saveGroup = (gid, patch) => { const cur = (ctl.groups || {})[gid] || {}; run(() => P.gateSetControl({ groups: { [gid]: { ...cur, ...patch } } }, `${gname(gid)}: ${Object.entries(patch).map(([k, v]) => (k === 'payDay' ? 'día de pago ' : 'inicio del módulo ') + (v || 'sin definir')).join(' · ')}`)); };
  const gruposTab = (
    <div className="scard" style={{marginTop:12}}>
      <div className="sec-head"><div className="sec-title">📅 Día de pago y fechas del módulo</div></div>
      <div className="settings-hint">La fecha de inicio del módulo <b>no</b> es la de pago (para empezar ya pagaron). Las fechas cambian por módulo: todo se edita aquí. Sin día de pago, ese grupo no recibe avisos automáticos.</div>
      <div style={{display:'flex', flexDirection:'column', gap:8, marginTop:10}}>
        {groups.map(g => { const gc = (ctl.groups || {})[g.id] || {}; return (
          <div key={g.id} className="row-flex" style={{gap:12, flexWrap:'wrap', borderTop:'1px dashed var(--border)', paddingTop:8}}>
            <div style={{fontWeight:800, minWidth:180, flex:1}}>{g.name}<div className="settings-hint" style={{margin:0}}>{g.schedule || ''}</div></div>
            <label className="row-flex" style={{gap:6}}><span className="settings-hint" style={{margin:0}}>Paga cada</span><input type="number" min="1" max="31" className="input-text" style={{width:70}} defaultValue={gc.payDay || ''} placeholder="—" onBlur={e => { const v = e.target.value ? Math.max(1, Math.min(31, parseInt(e.target.value) || 1)) : null; if (v !== (gc.payDay || null)) saveGroup(g.id, { payDay: v }); }} /></label>
            <label className="row-flex" style={{gap:6}}><span className="settings-hint" style={{margin:0}}>Inicio del módulo</span><input type="date" className="input-text" defaultValue={gc.start || ''} onBlur={e => { if ((e.target.value || '') !== (gc.start || '')) saveGroup(g.id, { start: e.target.value || '' }); }} /></label>
          </div>
        ); })}
      </div>
    </div>
  );

  /* ── pestaña POR ALUMNO ── */
  const alumnosTab = (
    <div className="scard" style={{marginTop:12}}>
      <div className="sec-head"><div className="sec-title">👤 Monto, día y fecha de inicio por alumno</div></div>
      <div className="settings-hint">“General” = monto del nivel y día del grupo. “Especial” se pone a mano (ej.: ingresó en un módulo avanzado o después del inicio de clases).</div>
      <div style={{display:'flex', flexDirection:'column', gap:6, marginTop:10}}>
        {rows.sort((a, b) => gname(a.s.group).localeCompare(gname(b.s.group), 'es') || a.s.fullName.localeCompare(b.s.fullName, 'es')).map(x => (
          <div key={x.s.id} className="row-flex" style={{gap:10, flexWrap:'wrap', borderTop:'1px dashed var(--border)', paddingTop:6}}>
            <div style={{flex:1, minWidth:180}}><b>{x.s.fullName}</b><div className="settings-hint" style={{margin:0}}>{gname(x.s.group)}</div></div>
            <span className="settings-hint" style={{margin:0, minWidth:110}}>{P.getConfig().currency} {x.a.amount || '—'} <span className="mm-chip" style={{background: x.a.special ? '#F3E5F5' : '#ECEFF1', color: x.a.special ? '#6A1B9A' : '#455A64'}}>{x.a.special ? 'especial' : 'general'}</span></span>
            <span className="settings-hint" style={{margin:0, minWidth:90}}>día {x.g.payDay || '—'}{x.r.pay_day ? ' (propio)' : ''}</span>
            <span className="settings-hint" style={{margin:0, minWidth:110}}>{x.r.join_date ? 'empezó ' + pcFmt(x.r.join_date) : ''}{x.r.exempt ? ' · exonerado' : ''}</span>
            <button className="att-btn" onClick={() => act.edit(x)}>Editar</button>
          </div>
        ))}
      </div>
    </div>
  );

  /* ── pestaña AJUSTES ── */
  const ajustesTab = <PcSettings ctl={ctl} rows={rows} onSave={(patch, detail) => run(() => P.gateSetControl(patch, detail))} />;

  /* ── pestaña BITÁCORA ── */
  const nameOf = (sid) => (D.STUDENTS.find(s => s.id === sid) || {}).fullName || '';
  const bitacoraTab = (
    <div className="scard" style={{marginTop:12}}>
      <div className="sec-head"><div className="sec-title">📜 Bitácora · quién hizo qué</div><button className="att-btn" onClick={() => P.gateLogList(200).then(setLog)}>↻</button></div>
      {log.length === 0 ? <div className="settings-hint">Aún no hay acciones.</div> : (
        <div style={{display:'flex', flexDirection:'column', gap:4, maxHeight:'55vh', overflowY:'auto'}}>
          {log.map(l => <div key={l.id} style={{fontSize:12.5, borderTop:'1px solid var(--border)', padding:'5px 0'}}><b>{new Date(l.at).toLocaleString('es-PE', { timeZone:'America/Lima', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</b> · {l.who} · <b>{l.action}</b>{l.student_id ? ' · ' + nameOf(l.student_id) : ''}{l.detail ? ' · ' + l.detail : ''}</div>)}
        </div>
      )}
    </div>
  );

  return (
    <>
      {head}
      {cobros}
      {kpis}
      {cta}
      <div className="mm-tabs" style={{marginTop:14, flexWrap:'wrap'}}>
        {[['deudores','💳 ¿Quién no ha pagado?'], ['grupos','📅 Grupos y fechas'], ['alumnos','👤 Por alumno'], ['ajustes','⚙️ Ajustes'], ['bitacora','📜 Bitácora']].map(([k, t]) => <button key={k} className={`mm-tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{t}</button>)}
      </div>
      {tab === 'grupos' ? gruposTab : tab === 'alumnos' ? alumnosTab : tab === 'ajustes' ? ajustesTab : tab === 'bitacora' ? bitacoraTab : deudores}
      {dlg && <PcDialog dlg={dlg} ctl={ctl} onClose={() => setDlg(null)} onDone={() => { setDlg(null); bump(); P.gateLogList(80).then(setLog); }} />}
    </>
  );
}

function PcSettings({ ctl, rows, onSave }) {
  const P = window.JUCUM_PAY; const PG = window.JUCUM_PAYGATE;
  const [av, setAv] = React.useState(ctl.avDays);
  const [pre, setPre] = React.useState(ctl.preDays);
  const [from, setFrom] = React.useState(ctl.autoFrom || '');
  const [prov, setProv] = React.useState(ctl.prov !== false);
  const [confirm, setConfirm] = React.useState(null);
  // Vista previa: quién quedaría con aviso/pausa con la fecha elegida (simulado ese día o hoy)
  const preview = () => {
    if (!from) return [];
    const day = from > pcToday() ? from : pcToday();
    const sim = { ...ctl, on: true, autoFrom: from, avDays: av };
    return rows.filter(x => { const k = PG.classify(sim, x.r, P.getAllPayments().filter(p => p.studentId === x.s.id), x.s.group, day).k; return k === 'av' || k === 'cl'; }).map(x => x.s.fullName);
  };
  const save = () => {
    const changedFrom = (from || '') !== (ctl.autoFrom || '');
    if (changedFrom && from) { setConfirm(preview()); return; }
    onSave({ avDays: av, preDays: pre, autoFrom: from, prov }, `Ajustes: aviso ${av} días · recordatorio ${pre} días · para todos desde ${from || 'sin fecha'}${prov ? '' : ' · captura NO mantiene acceso'}`);
  };
  return (
    <div className="scard" style={{marginTop:12}}>
      <div className="sec-head"><div className="sec-title">⚙️ Ajustes del control</div></div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:14}}>
        <div><div className="settings-label">Días de aviso antes de pausar</div><div className="settings-hint">Para todos. Recomendado: 2.</div><input type="number" min="1" max="10" className="input-text" style={{width:80}} value={av} onChange={e => setAv(Math.max(1, Math.min(10, parseInt(e.target.value) || 2)))} /></div>
        <div><div className="settings-label">Recordatorio amable (barra azul)</div><div className="settings-hint">Días antes del pago. No bloquea. 0 = sin recordatorio.</div><input type="number" min="0" max="10" className="input-text" style={{width:80}} value={pre} onChange={e => setPre(Math.max(0, Math.min(10, parseInt(e.target.value) || 0)))} /></div>
        <div><div className="settings-label">Avisos para TODOS desde</div><div className="settings-hint">Antes de esa fecha solo cuentan los deudores que marcas. Solo cobros con fecha desde ese día; vacío = nunca automático.</div><input type="date" className="input-text" value={from} onChange={e => setFrom(e.target.value)} />{from && <button className="att-btn" style={{marginLeft:6}} onClick={() => setFrom('')}>Quitar</button>}</div>
        <div><div className="settings-label">Si sube su captura</div><label className="check-row"><input type="checkbox" checked={prov} onChange={e => setProv(e.target.checked)} /><span>Sigue practicando mientras se revisa (hasta 7 días)</span></label></div>
      </div>
      <div className="settings-hint" style={{marginTop:10}}>Regla fija: en el automático no se cobra en los primeros 28 días desde que el alumno empezó (su inscripción cubre ese mes). Para otra fecha, edita “Pagado hasta” al registrar su pago.</div>
      <div className="modal-actions"><button className="btn-save" onClick={save}>💾 Guardar ajustes</button></div>
      {confirm && (
        <PcModal title="Activar avisos para todos" onClose={() => setConfirm(null)} okLabel="Sí, guardar" onOk={() => { setConfirm(null); onSave({ avDays: av, preDays: pre, autoFrom: from, prov }, `Avisos para todos desde ${from} (${confirm.length} alumno(s) recibirían aviso)`); }}>
          <div className="settings-hint">Desde el <b>{pcFmt(from, true)}</b>, con los pagos registrados hoy, recibirían aviso de pausa <b>{confirm.length}</b> alumno{confirm.length === 1 ? '' : 's'}:</div>
          <div style={{maxHeight:200, overflowY:'auto', fontSize:13, margin:'8px 0'}}>{confirm.length ? confirm.map(n => <div key={n}>• {n}</div>) : <i>Nadie.</i>}</div>
          <div className="settings-hint">Si alguien ya pagó fuera de la plataforma, regístrale el pago antes de esa fecha.</div>
        </PcModal>
      )}
    </div>
  );
}

function PcDialog({ dlg, ctl, onClose, onDone }) {
  const D = window.JUCUM_DATA; const P = window.JUCUM_PAY; const PG = window.JUCUM_PAYGATE;
  const today = pcToday();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');
  const x = dlg.x || {}; const s = x.s; const g = x.g || {}; const r = x.r || {};
  const cur = P.getConfig().currency;
  // valores de los formularios
  const coverDue = g.k === 'pre' ? g.due : (g.payDay ? PG.lastDue(today, g.payDay) : today);
  const defUntil = g.payDay ? PG.addDays(PG.nextDue(coverDue, g.payDay), -1) : PG.addDays(today, 30);
  const [f, setF] = React.useState(() => ({
    amount: x.a ? x.a.amount || '' : '', until: defUntil, medio: 'Efectivo en oficina',
    pror: PG.addDays(today, 7), why: '', tv: false,
    join: r.join_date || '', amtMode: x.a && x.a.special ? 'e' : 'g', amt: r.amount != null ? r.amount : (x.a ? x.a.amount : ''), amtWhy: r.amount_why || '',
    dayMode: r.pay_day ? 'e' : 'g', day: r.pay_day || '', exempt: !!r.exempt,
  }));
  const up = (k, v) => setF(o => ({ ...o, [k]: v }));
  const go = async (fn) => { setBusy(true); setErr(''); try { const res = await fn(); if (res && res.ok === false) { setErr(res.error || 'No se pudo guardar.'); setBusy(false); return; } onDone(); } catch (e) { setErr(e.message || String(e)); setBusy(false); } };
  const gcfg = s ? ((ctl.groups || {})[s.group] || {}) : {};

  if (dlg.kind === 'power') return (
    <PcModal title={dlg.on ? 'Activar control de pagos' : 'Apagar control de pagos'} onClose={onClose} busy={busy} err={err} okLabel={dlg.on ? 'Activar' : 'Apagar'} onOk={() => go(() => P.gateSetControl({ on: dlg.on }, dlg.on ? 'Control de pagos ACTIVADO' : 'Control de pagos APAGADO'))}>
      <div className="settings-hint">{dlg.on ? <>Desde ahora, solo los alumnos a los que les <b>envíes el aviso</b> lo verán{ctl.autoFrom ? <>, y desde el <b>{pcFmt(ctl.autoFrom, true)}</b> todos según su fecha de pago</> : null}. Nadie más ve nada.</> : 'Nadie verá avisos ni pausa (todos practican normal). Las marcas se conservan para cuando lo vuelvas a activar.'}</div>
    </PcModal>
  );

  if (dlg.kind === 'notice') return (
    <PcModal title={`Enviar aviso de ${ctl.avDays} días`} onClose={onClose} busy={busy} err={err} okLabel="Sí, enviar aviso" okStyle={{background:'#E65100'}} onOk={() => go(async () => {
      for (const st of dlg.list) {
        const res = await P.gateSet(st.id, { debtor: true, notice_start: today }, 'envió aviso', `Aviso de ${ctl.avDays} días · se pausa el ${pcFmt(PG.addDays(today, ctl.avDays))}`);
        if (!res.ok) return res;
        if (ctl.on && window.JUCUM_NOTIF) window.JUCUM_NOTIF.pushNotif(st.id, { type:'payment', link:'payments', title:'⏳ Tu pago está pendiente', body:`Registra tu pago o comunícate con administración (${P.ATTN_PHONE}). Si no, tu plataforma se pondrá en pausa el ${pcFmt(PG.addDays(today, ctl.avDays), true)}.` });
      }
      return { ok: true };
    })}>
      <div className="settings-hint">Solo estos <b>{dlg.list.length}</b> alumno{dlg.list.length > 1 ? 's' : ''} verán el aviso. Nadie más:</div>
      <div style={{fontSize:13.5, margin:'8px 0', maxHeight:220, overflowY:'auto'}}>{dlg.list.map(st => <div key={st.id}>• <b>{st.fullName}</b> · {(D.GROUPS.find(g2 => g2.id === st.group) || {}).name || ''}</div>)}</div>
      <div className="settings-hint">Si no regularizan, su plataforma se pausa el <b>{pcFmt(PG.addDays(today, ctl.avDays), true)}</b> a las 00:00 (hora Perú).</div>
      {!ctl.on && <div className="err" style={{marginTop:8}}>El control está APAGADO: el aviso queda guardado, pero los alumnos lo verán recién cuando lo actives.</div>}
    </PcModal>
  );

  if (dlg.kind === 'paid') return (
    <PcModal title={`Registrar pago · ${s.fullName}`} onClose={onClose} busy={busy} err={err} okLabel="Guardar pago" okStyle={{background:'#2E7D32'}} onOk={() => go(async () => {
      if (!f.until) return { ok: false, error: 'Indica hasta cuándo cubre el pago.' };
      P.registerManualPayment(s.id, { dni: s.dni || '', mode: 'mensual', level: s.level, period: coverDue.slice(0, 7), amount: f.amount === '' ? null : Number(f.amount), note: f.medio + ' · cubre hasta ' + f.until });
      return P.gateSet(s.id, { debtor: false, notice_start: null, closed_manual: false, extension_until: null, paid_until: f.until }, 'pagó', `${cur} ${f.amount || '—'} · ${f.medio} · cubre hasta ${pcFmt(f.until)}`);
    })}>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
        <div className="settings-block" style={{paddingTop:0}}><div className="settings-label">Monto ({cur})</div><input type="number" min="0" className="input-text" style={{width:'100%'}} value={f.amount} onChange={e => up('amount', e.target.value)} />{x.a && x.a.special && <div className="settings-hint">Monto especial{x.a.why ? ': ' + x.a.why : ''}</div>}</div>
        <div className="settings-block" style={{paddingTop:0}}><div className="settings-label">Cubre hasta</div><input type="date" className="input-text" style={{width:'100%'}} value={f.until} onChange={e => up('until', e.target.value)} /></div>
      </div>
      <div className="settings-block"><div className="settings-label">Medio</div><select className="input-text" style={{width:'100%'}} value={f.medio} onChange={e => up('medio', e.target.value)}><option>Efectivo en oficina</option><option>Yape / Plin</option><option>Transferencia</option><option>Pago por módulo</option><option>Pago total</option></select></div>
      <div className="settings-hint">Se quita el aviso o la pausa al instante y el alumno recibe la confirmación.</div>
    </PcModal>
  );

  if (dlg.kind === 'pror') return (
    <PcModal title={`Prórroga · ${s.fullName}`} onClose={onClose} busy={busy} err={err} okLabel="Dar prórroga" okStyle={{background:'#6A1B9A'}} onOk={() => go(() => P.gateSet(s.id, { extension_until: f.pror, notice_start: null, closed_manual: false, note: f.why }, 'prórroga', `hasta ${pcFmt(f.pror)}${f.why ? ' · ' + f.why : ''}`))}>
      <div className="settings-block" style={{paddingTop:0}}><div className="settings-label">Puede pagar hasta</div><input type="date" className="input-text" value={f.pror} min={today} onChange={e => up('pror', e.target.value)} /></div>
      <div className="settings-block"><div className="settings-label">Motivo (opcional)</div><input className="input-text" style={{width:'100%'}} value={f.why} onChange={e => up('why', e.target.value)} placeholder="Ej.: cobra la quincena" /></div>
      <div className="settings-hint">Mientras dure no ve avisos. {r.debtor ? 'Sigue marcado como deudor: al terminar la prórroga tendrás que volver a enviarle el aviso.' : 'Si no paga, el aviso vuelve a correr al terminar.'}</div>
    </PcModal>
  );

  if (dlg.kind === 'pause') return (
    <PcModal title={`Pausar ahora · ${s.fullName}`} onClose={onClose} busy={busy} err={err} okLabel="Pausar" okStyle={{background:'#C62828'}} onOk={() => go(() => P.gateSet(s.id, { closed_manual: true }, 'pausó a mano', ''))}>
      <div className="settings-hint">Se pausa sin esperar el fin del aviso. Su avance queda guardado.</div>
    </PcModal>
  );

  if (dlg.kind === 'reopen') return (
    <PcModal title={`Reabrir · ${s.fullName}`} onClose={onClose} busy={busy} err={err} okLabel="Reabrir" onOk={() => go(() => P.gateSet(s.id, { closed_manual: false, debtor: false, notice_start: null, extension_until: PG.addDays(today, 3) }, 'reabrió', 'Prórroga de 3 días'))}>
      <div className="settings-hint">Vuelve a practicar y se le da una prórroga de 3 días (hasta el {pcFmt(PG.addDays(today, 3), true)}) para pagar. Si ya pagó, usa mejor <b>Pagó</b>.</div>
    </PcModal>
  );

  if (dlg.kind === 'emerg') {
    if (dlg.open && window.StudentReport) return (
      <div className="modal-backdrop" onClick={onClose}><div className="modal" style={{maxWidth:980, width:'96vw', maxHeight:'92vh', overflowY:'auto'}} onClick={e => e.stopPropagation()}><StudentReport student={s} onBack={onClose} forTeacher /></div></div>
    );
    return (
      <PcModal title={`Ver avance · ${s.fullName}`} onClose={onClose} busy={busy} err={err} okLabel="Abrir avance" onOk={async () => {
        if (!f.why.trim()) { setErr('Escribe el motivo (queda en la bitácora).'); return; }
        setBusy(true);
        if (f.tv) { const res = await P.gateSet(s.id, { teacher_allow: (r.teacher_allow == null ? 1 : r.teacher_allow) + 1 }, 'vista extra al profesor', f.why); if (!res.ok) { setErr(res.error); setBusy(false); return; } }
        P.gateLog(s.id, 'vio avance (emergencia)', f.why);
        setBusy(false); dlg.open = true; setF(o => ({ ...o }));
      }}>
        <div className="settings-hint">Está en pausa por pago. Tú siempre puedes ver su avance; queda registrado en la bitácora.</div>
        <div className="settings-block"><div className="settings-label">Motivo</div><input className="input-text" style={{width:'100%'}} value={f.why} onChange={e => up('why', e.target.value)} placeholder="Ej.: reunión con el apoderado" /></div>
        <label className="check-row"><input type="checkbox" checked={f.tv} onChange={e => up('tv', e.target.checked)} /><span>Dar también <b>1 vista más</b> al profesor ({Math.max(0, (r.teacher_allow == null ? 1 : r.teacher_allow) - (r.teacher_views || 0))} disponible{((r.teacher_allow == null ? 1 : r.teacher_allow) - (r.teacher_views || 0)) === 1 ? '' : 's'} ahora)</span></label>
      </PcModal>
    );
  }

  if (dlg.kind === 'edit') return (
    <PcModal title={`${s.fullName} · pago`} onClose={onClose} busy={busy} err={err} okLabel="Guardar" onOk={() => go(() => {
      const patch = {
        join_date: f.join || null,
        amount: f.amtMode === 'e' && f.amt !== '' ? Number(f.amt) : null,
        amount_why: f.amtMode === 'e' ? f.amtWhy : '',
        pay_day: f.dayMode === 'e' && f.day ? Math.max(1, Math.min(31, parseInt(f.day) || 1)) : null,
        exempt: !!f.exempt,
      };
      return P.gateSet(s.id, patch, 'editó', `inicio ${patch.join_date ? pcFmt(patch.join_date) : '—'} · ${patch.amount != null ? cur + ' ' + patch.amount + ' (especial)' : 'monto general'} · ${patch.pay_day ? 'día ' + patch.pay_day : 'día del grupo'}${patch.exempt ? ' · exonerado' : ''}`);
    })}>
      <div className="settings-block" style={{paddingTop:0}}><div className="settings-label">Fecha en que empezó</div><div className="settings-hint">Para quien ingresó después del inicio de clases. Vacío = como su grupo.</div><input type="date" className="input-text" value={f.join} onChange={e => up('join', e.target.value)} /></div>
      <div className="settings-block"><div className="settings-label">Monto</div>
        <label className="check-row"><input type="radio" checked={f.amtMode === 'g'} onChange={() => up('amtMode', 'g')} /><span>General del nivel ({cur} {(P.getConfig().amounts[s.level] || {}).mensual || 0})</span></label>
        <label className="check-row"><input type="radio" checked={f.amtMode === 'e'} onChange={() => up('amtMode', 'e')} /><span>Especial {cur} <input type="number" min="0" className="input-text" style={{width:90}} value={f.amt} onChange={e => { up('amt', e.target.value); up('amtMode', 'e'); }} /></span></label>
        {f.amtMode === 'e' && <input className="input-text" style={{width:'100%', marginTop:6}} value={f.amtWhy} onChange={e => up('amtWhy', e.target.value)} placeholder="Motivo: ingresó en un módulo avanzado…" />}
      </div>
      <div className="settings-block"><div className="settings-label">Día de pago</div>
        <label className="check-row"><input type="radio" checked={f.dayMode === 'g'} onChange={() => up('dayMode', 'g')} /><span>El del grupo ({gcfg.payDay ? 'cada ' + gcfg.payDay : 'sin definir'})</span></label>
        <label className="check-row"><input type="radio" checked={f.dayMode === 'e'} onChange={() => up('dayMode', 'e')} /><span>Día propio: <input type="number" min="1" max="31" className="input-text" style={{width:70}} value={f.day} onChange={e => { up('day', e.target.value); up('dayMode', 'e'); }} /></span></label>
      </div>
      <label className="check-row"><input type="checkbox" checked={f.exempt} onChange={e => up('exempt', e.target.checked)} /><span>Exonerado (beca / convenio): nunca recibe avisos</span></label>
    </PcModal>
  );
  return null;
}

/* 🔒 Profesor: alumno en pausa por pago. Una sola vista (teacher_allow) con aviso previo. */
function TeacherPayLock({ student, onBack, onUnlock }) {
  const P = window.JUCUM_PAY;
  const r = P.gateRow(student.id) || {};
  const allow = r.teacher_allow == null ? 1 : r.teacher_allow;
  const left = Math.max(0, allow - (r.teacher_views || 0));
  const [ask, setAsk] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const use = async () => {
    setBusy(true);
    const res = await P.gateSet(student.id, { teacher_views: (r.teacher_views || 0) + 1 }, 'profesor usó su vista', '');
    setBusy(false);
    if (!res.ok) { alert('No se pudo registrar: ' + res.error); return; }
    onUnlock();
  };
  return (
    <>
      <button className="back-btn" onClick={onBack}>← Volver al grupo</button>
      <div className="scard" style={{margin:'24px auto', maxWidth:540, textAlign:'center', borderTop:'5px solid #6B7280'}}>
        <div style={{fontSize:46}}>🔒</div>
        <h1 style={{fontFamily:"'Fredoka',sans-serif", fontSize:22, margin:'6px 0'}}>{student.fullName}</h1>
        <div className="settings-hint">Su acceso está <b>en pausa por pago</b>. Su avance está oculto mientras no regularice. Para cualquier consulta, habla con administración.</div>
        {left > 0
          ? <button className="btn-soft" style={{marginTop:14}} onClick={() => setAsk(true)}>👁 Ver su avance (1 vez)</button>
          : <div className="settings-hint" style={{marginTop:14}}>Ya usaste tu vista. Si es urgente, administración puede darte otra.</div>}
      </div>
      {ask && (
        <PcModal title={`Ver avance · ${student.fullName}`} onClose={() => setAsk(false)} busy={busy} okLabel="Ver esta vez" onOk={use}>
          <div className="settings-hint">Puedes ver su seguimiento <b>solo esta vez</b>. Si el alumno no regulariza su pago, después ya no podrás verlo. Para casos urgentes, pide acceso a administración.</div>
        </PcModal>
      )}
    </>
  );
}

Object.assign(window, { AdminPayControl, PcSettings, PcDialog, PcModal, PcChip, TeacherPayLock, pcFmt });
