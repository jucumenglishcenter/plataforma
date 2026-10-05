/* 🚦 Control de pagos — panel de la ADMINISTRADORA · v3 "simple" (05-oct-2026)
 * Aprobado en "Espejo - Gestion de pagos v3 (simple).html".
 * UNA lista (por nivel, con color) + buscador + filtros. Cada fila muestra UNA acción;
 * todo lo demás vive en el panel del alumno (se abre al tocarlo).
 * Modalidades: Pre-A1 mensual o curso completo · A1/A2 mensual, módulo (2 meses) o completo.
 * La ADMINISTRADORA siempre aprueba: si un alumno sube su captura la plataforma se reabre;
 * si ella marca "No está completo"/"Rechazar" se pausa al instante, salvo que dé plazo
 * (a la persona o a todo el grupo). Motor: pay-gate.js (PAYGATE-V2). Todo en día PERÚ. */

const PC3_CSS = `
.pc3{display:flex;flex-direction:column;gap:14px;margin-top:14px;color:#24262B}
.pc3 button{font-family:inherit;cursor:pointer}
.pc3-top{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap}
.pc3-top h1{font-family:'Fredoka',sans-serif;font-weight:600;font-size:25px;color:#0D1B5A;line-height:1.15;margin:0}
.pc3-sum{font-size:14px;color:#4A4F5C;margin-top:4px}.pc3-sum b{color:#C62828}
.pc3-btns{display:flex;gap:8px;flex-wrap:wrap}
.pc3-b{border:1.5px solid #D9D6CC;background:#fff;border-radius:11px;padding:9px 14px;font-weight:800;font-size:13.5px;color:#2B2F38;display:inline-flex;align-items:center;gap:7px;white-space:nowrap;text-decoration:none}
.pc3-b:hover{background:#F2F0EA;color:#2B2F38}
.pc3-b:disabled{opacity:.45;cursor:not-allowed}
.pc3-b.pri{background:#1F3A8A;border-color:#1F3A8A;color:#fff}.pc3-b.pri:hover{background:#16306f}
.pc3-b.or{background:#E65100;border-color:#E65100;color:#fff}.pc3-b.or:hover{background:#c94700}
.pc3-b.gr{background:#2E7D32;border-color:#2E7D32;color:#fff}.pc3-b.gr:hover{background:#256628}
.pc3-b.rd{background:#C62828;border-color:#C62828;color:#fff}.pc3-b.rd:hover{background:#a82020}
.pc3-b.sm{padding:6px 11px;font-size:12.5px;border-radius:9px}
.pc3-b.lk{border:0;background:none;color:#1F3A8A;padding:6px 4px}.pc3-b.lk:hover{background:none;text-decoration:underline}
.pc3-off{background:#F2F1EC;border:1.5px solid #D9D6CC;border-radius:14px;padding:12px 14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.pc3-off .tx{flex:1;min-width:220px;font-size:13.5px;color:#4A4F5C}.pc3-off .tx b{display:block;font-size:14.5px;color:#24262B}
.pc3-todo{background:#FFF3E0;border:1.5px solid #FFCC80;border-radius:14px;padding:12px 14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.pc3-todo .tx{flex:1;min-width:220px;font-size:13.5px;color:#6B3500}.pc3-todo .tx b{display:block;font-size:15px;color:#7A3A00}
.pc3-bar{display:flex;flex-direction:column;gap:10px;background:#fff;border:1px solid #E6E3DA;border-radius:16px;padding:12px}
.pc3-search{display:flex;align-items:center;gap:8px;border:1.5px solid #D9D6CC;border-radius:11px;padding:0 12px;background:#FCFBF8}
.pc3-search:focus-within{border-color:#1F3A8A;background:#fff}
.pc3-search input{flex:1;border:0;background:none;font-family:inherit;font-size:15px;font-weight:700;padding:11px 0;outline:none;color:#222;min-width:0}
.pc3-frow{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.pc3-flbl{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#8A8F9C;min-width:56px}
.pc3-pill{border:1.5px solid #E1DED4;background:#fff;border-radius:20px;padding:6px 12px;font-weight:800;font-size:12.5px;color:#3A3F4B;display:inline-flex;gap:6px;align-items:center}
.pc3-pill .n{font-size:11px;color:#8A8F9C}
.pc3-pill.on{background:var(--c,#1F3A8A);border-color:var(--c,#1F3A8A);color:#fff}.pc3-pill.on .n{color:rgba(255,255,255,.85)}
.pc3-pill .dot{width:9px;height:9px;border-radius:50%;background:var(--c)}.pc3-pill.on .dot{background:#fff}
.pc3-in{border:1.5px solid #D9D6CC;border-radius:10px;padding:8px 10px;font-family:inherit;font-weight:700;font-size:13.5px;background:#fff;color:#222;max-width:100%}
.pc3-lvh{display:flex;align-items:center;gap:10px;margin:8px 2px 0}
.pc3-lvh .tag{font-family:'Fredoka',sans-serif;font-weight:600;font-size:13px;color:#fff;background:var(--c);border-radius:8px;padding:3px 10px}
.pc3-lvh .ln{flex:1;height:1px;background:#E1DED4}.pc3-lvh .ct{font-size:12px;font-weight:700;color:#8A8F9C}
.pc3-list{display:flex;flex-direction:column;background:#fff;border:1px solid #E6E3DA;border-radius:14px;overflow:hidden}
.pc3-row{display:grid;grid-template-columns:6px minmax(0,1fr) auto;align-items:center;gap:0 14px;padding:11px 14px 11px 0;border-top:1px solid #EFEDE6;cursor:pointer}
.pc3-row:first-child{border-top:0}.pc3-row:hover{background:#FAF9F5}
.pc3-row .lv{align-self:stretch;background:var(--c)}
.pc3-row .nm{font-weight:800;font-size:14.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pc3-row .gp{font-size:12px;color:#7A7F8C;font-weight:600;margin-top:2px;display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.pc3-row .rt{display:flex;align-items:center;gap:12px;justify-content:flex-end;flex-wrap:wrap}
.pc3-st{display:flex;flex-direction:column;align-items:flex-end;gap:1px;text-align:right}
.pc3-st .s{font-weight:800;font-size:13px;color:var(--c);display:flex;align-items:center;gap:6px}
.pc3-st .s i{width:8px;height:8px;border-radius:50%;background:var(--c)}
.pc3-st .d{font-size:11.5px;color:#7A7F8C;font-weight:600}
.pc3-mt{display:inline-block;font-size:11px;font-weight:800;border-radius:6px;padding:1px 7px;background:#EEF2FB;color:#1F3A8A}
.pc3-mt.modulo{background:#F5ECF8;color:#6A1B9A}.pc3-mt.total{background:#E6F4EA;color:#1B5E20}
.pc3-empty{padding:28px;text-align:center;color:#7A7F8C;font-weight:700;font-size:14px;background:#fff;border:1px dashed #D9D6CC;border-radius:14px}
.pc3-mode{font-size:12.5px;color:#4A4F5C;background:#fff;border:1px solid #E6E3DA;border-radius:12px;padding:9px 12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.pc3-mode i{width:9px;height:9px;border-radius:50%;flex:none}
.pc3-scrim{position:fixed;inset:0;background:rgba(20,24,40,.35);z-index:900}
.pc3-drawer{position:fixed;top:0;right:0;bottom:0;width:min(440px,100vw);background:#fff;z-index:901;box-shadow:-10px 0 30px rgba(0,0,0,.15);display:flex;flex-direction:column;color:#24262B}
.pc3-drawer button{font-family:inherit;cursor:pointer}
.pc3-dh{padding:16px 18px 12px;border-bottom:1px solid #EFEDE6;display:flex;gap:10px;align-items:flex-start}
.pc3-dh h2{font-family:'Fredoka',sans-serif;font-weight:600;font-size:20px;color:#0D1B5A;line-height:1.2;margin:0}
.pc3-dh .g{font-size:12.5px;color:#7A7F8C;font-weight:700;margin-top:4px;display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.pc3-lvb{font-family:'Fredoka',sans-serif;font-weight:600;font-size:12px;color:#fff;background:var(--c);border-radius:7px;padding:2px 8px}
.pc3-x{border:0;background:#F2F0EA;width:34px;height:34px;border-radius:50%;font-weight:800;font-size:15px;color:#555;flex:none}
.pc3-db{flex:1;overflow:auto;padding:16px 18px;display:flex;flex-direction:column;gap:16px}
.pc3-big{border-radius:14px;padding:14px;background:var(--bg);display:flex;flex-direction:column;gap:10px}
.pc3-big .s{font-family:'Fredoka',sans-serif;font-weight:600;font-size:18px;color:var(--c)}
.pc3-big p{font-size:13.5px;line-height:1.5;color:#33363D;margin:0}
.pc3-acts{display:flex;gap:8px;flex-wrap:wrap}
.pc3-sees{font-size:12.5px;color:#4A4F5C;background:#F6F5F0;border-radius:10px;padding:9px 11px;line-height:1.45}
.pc3-sec h3{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#8A8F9C;margin:0 0 8px}
.pc3-kv{display:flex;flex-direction:column;border:1px solid #EFEDE6;border-radius:12px;overflow:hidden}
.pc3-kv>div{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-top:1px solid #EFEDE6;font-size:13.5px}
.pc3-kv>div:first-child{border-top:0}
.pc3-kv span{color:#6B7080;font-weight:700}.pc3-kv b{font-weight:800;text-align:right}
.pc3-more{display:flex;flex-direction:column;gap:2px}
.pc3-more button,.pc3-more a{border:0;background:none;text-align:left;padding:9px 6px;font-weight:800;font-size:13.5px;color:#2B2F38;border-radius:8px;display:flex;justify-content:space-between;gap:8px;text-decoration:none}
.pc3-more button:hover,.pc3-more a:hover{background:#F6F5F0;color:#2B2F38}
.pc3-more small{font-weight:600;color:#8A8F9C;font-size:12px}
.pc3-more .rd{color:#C62828}
.pc3-hist{display:flex;flex-direction:column;gap:6px;font-size:12.5px;color:#4A4F5C}
.pc3-hist div{display:flex;gap:8px}.pc3-hist b{color:#24262B;min-width:56px;flex:none}
.pc3-modal{position:fixed;inset:0;z-index:950;background:rgba(20,24,40,.45);display:flex;align-items:center;justify-content:center;padding:16px;color:#24262B}
.pc3-modal button{font-family:inherit;cursor:pointer}
.pc3-mbox{background:#fff;border-radius:18px;width:100%;max-width:470px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 20px 50px rgba(0,0,0,.3)}
.pc3-mbox.wide{max-width:660px}
.pc3-mh{padding:16px 18px 6px;display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
.pc3-mh h3{font-family:'Fredoka',sans-serif;font-weight:600;font-size:19px;color:#0D1B5A;margin:0}
.pc3-mb{padding:6px 18px 4px;overflow:auto;display:flex;flex-direction:column;gap:12px;font-size:13.5px;line-height:1.5;color:#33363D}
.pc3-mf{padding:12px 18px 16px;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;align-items:center}
.pc3-fld{display:flex;flex-direction:column;gap:5px;font-size:12.5px;font-weight:800;color:#4A4F5C}
.pc3-fld .hint{font-weight:600;color:#8A8F9C;font-size:12px}
.pc3-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.pc3-names{display:flex;flex-direction:column;gap:4px;background:#FFF8EF;border-radius:10px;padding:10px 12px;font-weight:700;max-height:220px;overflow:auto}
.pc3-pick{display:flex;flex-direction:column;border:1px solid #EFEDE6;border-radius:12px;max-height:340px;overflow:auto}
.pc3-pick label{display:grid;grid-template-columns:auto 6px minmax(0,1fr) auto;gap:10px;align-items:center;padding:9px 12px;border-top:1px solid #EFEDE6;cursor:pointer;font-weight:800;font-size:13.5px}
.pc3-pick label:first-child{border-top:0}.pc3-pick label:hover{background:#FAF9F5}
.pc3-pick .lv{align-self:stretch;background:var(--c);border-radius:3px}
.pc3-pick small{font-weight:600;color:#8A8F9C;font-size:12px;display:block}
.pc3-pick input{width:18px;height:18px;accent-color:#E65100}
.pc3-seg{display:inline-flex;background:#EEECE5;border-radius:9px;padding:3px;gap:2px;flex-wrap:wrap;width:max-content;max-width:100%}
.pc3-seg button{border:0;background:none;font-weight:800;font-size:12.5px;padding:6px 11px;border-radius:7px;color:#6B7080}
.pc3-seg button.on{background:#fff;color:#1F3A8A;box-shadow:0 1px 3px rgba(0,0,0,.12)}
.pc3-hintbox{font-size:12.5px;color:#4A4F5C;background:#F6F5F0;border-radius:10px;padding:8px 10px}
.pc3-cfgrow{display:grid;grid-template-columns:6px minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 12px 10px 0;border:1px solid #EFEDE6;border-radius:12px;overflow:hidden}
.pc3-cfgrow .lv{align-self:stretch;background:var(--c)}
.pc3-cfgrow .nm{font-weight:800;font-size:13.5px}.pc3-cfgrow .nm small{display:block;font-weight:600;color:#8A8F9C;font-size:12px}
.pc3-cfgrow .ctl{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:700;color:#4A4F5C;flex-wrap:wrap;justify-content:flex-end}
.pc3-cfgrow.off{background:#FAFAF8}.pc3-cfgrow.off .nm{color:#8A8F9C}
.pc3-tabs{display:flex;gap:4px;border-bottom:1px solid #EFEDE6;margin:0 -18px;padding:0 18px;flex-wrap:wrap}
.pc3-tabs button{border:0;background:none;padding:10px 12px;font-weight:800;font-size:13px;color:#7A7F8C;border-bottom:2.5px solid transparent;margin-bottom:-1px}
.pc3-tabs button.on{color:#1F3A8A;border-color:#1F3A8A}
.pc3-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:#24262B;color:#fff;border-radius:12px;padding:11px 16px;font-weight:800;font-size:13.5px;z-index:990;box-shadow:0 8px 24px rgba(0,0,0,.25);display:flex;gap:10px;align-items:center;max-width:92vw}
.pc3-toast button{background:none;border:0;color:#FFC107;font-weight:800;font-family:inherit;cursor:pointer}
.pc3-err{background:#FDECEC;color:#8E1B1B;border-radius:10px;padding:8px 10px;font-weight:700;font-size:12.5px}
.pc3-shot{border-radius:12px;background:#EEF1F6;min-height:160px;display:flex;align-items:center;justify-content:center;color:#8A8F9C;font-weight:800;overflow:hidden}
.pc3-shot img{width:100%;display:block}
@media (max-width:640px){.pc3-row{grid-template-columns:6px minmax(0,1fr)}.pc3-row .rt{grid-column:2;justify-content:flex-start;margin-top:6px}.pc3-st{align-items:flex-start;text-align:left}.pc3-two{grid-template-columns:1fr}}
`;
function pcCss() { if (document.getElementById('pc3-css')) return; const s = document.createElement('style'); s.id = 'pc3-css'; s.textContent = PC3_CSS; document.head.appendChild(s); }

const pcToday = () => window.JUCUM_PAYGATE.peruToday();
function pcFmt(iso, long) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const DW = ['dom','lun','mar','mié','jue','vie','sáb'], MO = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return (long ? DW[dt.getUTCDay()] + ' ' : '') + d + ' ' + MO[m - 1];
}
function pcPhone(s) { let p = String(s.phone || '').replace(/\D/g, ''); if (p.length === 9) p = '51' + p; return p.length >= 11 ? p : ''; }
const pcNorm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const pcFirst = (s) => String(s.fullName || '').split(' ')[0];
const pcCur = () => window.JUCUM_PAY.getConfig().currency || 'S/';
function pcLv(level) { const L = (window.JUCUM_DATA.LEVELS || {})[level] || {}; return { n: L.code || level || '—', c: L.color || '#90A4AE' }; }
function PcMode({ m }) { return <span className={`pc3-mt ${m}`}>{window.JUCUM_PAY.MODE_LABEL[m] || m}</span>; }

/* Estado visible para la administradora (a partir de la fase del motor) */
function pcView(g, r) {
  const cur = pcCur();
  switch (g.k) {
    case 'ex': return { k: 'nc', l: 'No cobra', c: '#8A8F9C', bg: '#F2F1EC', d: '' };
    case 'rev': { const re = !!(r.debtor || r.rejected || r.notice_start || r.closed_manual); return { k: 'rev', l: re ? 'Reabierta · por aprobar' : 'Subió su captura', c: '#1565C0', bg: '#E8F1FC', d: 'Falta tu aprobación', reopened: re }; }
    case 'pr': return { k: 'pr', l: 'Con plazo', c: '#6A1B9A', bg: '#F5ECF8', d: (g.group ? 'Plazo del grupo hasta el ' : 'Hasta el ') + pcFmt(g.until, true) + (r.falta ? ` · falta ${cur} ${r.falta}` : '') };
    case 'cl': return { k: 'cl', l: 'En pausa', c: '#C62828', bg: '#FDECEC', d: g.reason || (g.since ? 'Desde el ' + pcFmt(g.since, true) : 'Pausado a mano') };
    case 'av': return { k: 'av', l: 'Avisado', c: '#E65100', bg: '#FFF1E5', d: 'Se pausa ' + (g.left === 1 ? 'mañana' : 'el ' + pcFmt(g.close, true)) };
    case 'mark': return { k: 'mark', l: 'Debe · sin avisar', c: '#A15C00', bg: '#FFF6E0', d: 'Todavía no ve nada' };
    case 'pre': return { k: 'ok', l: 'Paga pronto', c: '#1565C0', bg: '#E8F1FC', d: g.left === 0 ? 'Vence hoy' : 'Vence el ' + pcFmt(g.due, true) };
    case 'nod': return { k: 'ok', l: 'Al día', c: '#2E7D32', bg: '#EAF5EA', d: 'Grupo sin día de pago' };
    default: return { k: 'ok', l: 'Al día', c: '#2E7D32', bg: '#EAF5EA', d: r.paid_until ? 'Cubre hasta el ' + pcFmt(r.paid_until, true) : (g.payDay ? 'Paga el ' + g.payDay + ' de cada mes' : '') };
  }
}
const pcOwes = (k) => k === 'mark' || k === 'av' || k === 'cl';
const PC_SEES = {
  nc: 'No ve nada sobre pagos.', ok: 'Todo normal.',
  rev: 'Su plataforma está abierta mientras revisas. Si no apruebas el pago, se vuelve a pausar.',
  pr: 'Practica normal hasta la fecha del plazo. Si no regulariza, se pausa sola ese día.',
  mark: '<b>Todavía no ve nada.</b> Verá el aviso cuando se lo envíes.',
  av: 'Ve una ventana una vez al día y una barra naranja con la fecha de pausa.',
  cl: 'Ve “Tu acceso está en pausa”. Puede ver Mi avance y Boletín, pero no practicar ni dar exámenes.',
};

/* Hasta cuándo cubre un pago (sugerencia editable) */
function pcCoverFor(student, mode, row, payDay) {
  const PG = window.JUCUM_PAYGATE; const t = pcToday();
  const from = row && row.paid_until && row.paid_until > t ? row.paid_until : t;
  if (mode === 'modulo') return PG.addDays(PG.addMonths(from, 2), -1);
  if (mode === 'total') return PG.addDays(PG.addMonths(from, (window.JUCUM_PAY.getConfig().packMonths || {})[student.level] || 6), -1);
  if (!payDay) return PG.addDays(PG.addMonths(from, 1), -1);
  let nx = PG.nextDue(from, payDay);
  if (PG.diff(nx, from) <= ((window.JUCUM_PAY.gateCtl().preDays || 3) + 2)) nx = PG.nextDue(nx, payDay);
  return PG.addDays(nx, -1);
}

function PcM({ title, wide, onClose, foot, children }) {
  return (
    <div className="pc3-modal" onClick={onClose}>
      <div className={`pc3-mbox ${wide ? 'wide' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="pc3-mh"><h3>{title}</h3><button className="pc3-x" onClick={onClose}>✕</button></div>
        <div className="pc3-mb">{children}</div>
        <div className="pc3-mf">{foot}</div>
      </div>
    </div>
  );
}
function PcSeg({ value, options, onChange }) {
  return <div className="pc3-seg">{options.map(([v, l]) => <button key={v} type="button" className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>)}</div>;
}

/* Formulario común: modalidad + monto + cubre hasta */
function PcPayFields({ student, row, payDay, f, setF }) {
  const P = window.JUCUM_PAY;
  const modes = P.modesFor(student.level);
  const HINT = { mensual: 'Cubre hasta su próximo día de pago.', modulo: 'Cubre el módulo (2 meses). No recibe avisos mensuales mientras tanto.', total: 'Cubre todo el ' + (student.level === 'pre-a1' ? 'curso' : 'nivel') + '. No recibe avisos hasta esa fecha.' };
  const pick = (m) => setF(o => ({ ...o, mode: m, amount: P.priceFor(student, m) ?? '', until: pcCoverFor(student, m, row, payDay) }));
  return (
    <>
      <label className="pc3-fld">Modalidad<PcSeg value={f.mode} options={modes.map(m => [m, m === 'total' && student.level === 'pre-a1' ? 'Curso completo' : P.MODE_LABEL[m]])} onChange={pick} /></label>
      <div className="pc3-two">
        <label className="pc3-fld">Monto ({pcCur()})<input className="pc3-in" type="number" min="0" value={f.amount} placeholder="por definir" onChange={e => setF(o => ({ ...o, amount: e.target.value }))} /></label>
        <label className="pc3-fld">Cubre hasta<input className="pc3-in" type="date" value={f.until} onChange={e => setF(o => ({ ...o, until: e.target.value }))} /></label>
      </div>
      <div className="pc3-hintbox">{HINT[f.mode]}</div>
    </>
  );
}

/* 🧾 Revisar una captura: aprobar · no está completo · rechazar (exportado: también lo usa el Historial) */
function PcReviewDialog({ payment, student, onClose, onDone }) {
  pcCss();
  const P = window.JUCUM_PAY; const D = window.JUCUM_DATA;
  const [, setT] = React.useState(0);
  React.useEffect(() => { if (!P.gateReady()) P.gateLoad().then(() => setT(t => t + 1)); }, []);
  const row = P.gateRow(student.id) || {};
  const gc = (P.gateCtl().groups || {})[student.group] || {};
  const payDay = parseInt(row.pay_day, 10) || parseInt(gc.payDay, 10) || null;
  const m0 = P.modesFor(student.level).includes(payment.mode) ? payment.mode : 'mensual';
  const [f, setF] = React.useState(() => ({ mode: m0, amount: payment.amount ?? P.priceFor(student, m0) ?? '', until: pcCoverFor(student, m0, row, payDay) }));
  const [shot, setShot] = React.useState('loading');
  const [step, setStep] = React.useState('form');
  const [j, setJ] = React.useState({ expected: '', received: payment.amount ?? '', reason: '', plazo: 'no', days: 3 });
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');
  React.useEffect(() => { let a = true; P.fetchShot(payment.id).then(s => a && setShot(s || 'none')); return () => { a = false; }; }, [payment.id]);
  const gName = (D.GROUPS.find(g => g.id === student.group) || {}).name || '';
  const reopened = !!(row.debtor || row.rejected || row.notice_start || row.closed_manual);
  const go = async (fn) => { setBusy(true); setErr(''); const r = await fn(); setBusy(false); if (r && r.ok === false) { setErr(r.error || 'No se pudo guardar.'); return; } onDone && onDone(); };
  const approve = () => { if (!f.until) { setErr('Indica hasta cuándo cubre el pago.'); return; } go(() => P.approvePayment(payment.id, { mode: f.mode, amount: f.amount === '' ? null : Number(f.amount), until: f.until })); };
  const toReject = (kind) => { setJ(o => ({ ...o, kind, expected: f.amount || P.priceFor(student, f.mode) || '' })); setStep('reject'); };
  const reject = () => go(() => P.disapprovePayment(payment.id, { kind: j.kind, expected: j.expected, received: j.received, reason: j.reason, days: j.plazo === 'si' ? Math.max(1, parseInt(j.days, 10) || 3) : 0 }));
  const regAt = payment.registeredAt ? new Date(payment.registeredAt).toLocaleString('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

  if (step === 'reject') return (
    <PcM title={j.kind === 'inc' ? 'El pago no está completo' : 'No aprobar el pago'} onClose={onClose}
      foot={<><button className="pc3-b" onClick={() => setStep('form')}>Volver</button><button className="pc3-b rd" disabled={busy} onClick={reject}>{busy ? 'Guardando…' : 'Confirmar'}</button></>}>
      {j.kind === 'inc'
        ? <div className="pc3-two"><label className="pc3-fld">Debía pagar ({pcCur()})<input className="pc3-in" type="number" value={j.expected} onChange={e => setJ(o => ({ ...o, expected: e.target.value }))} /></label><label className="pc3-fld">Recibió ({pcCur()})<input className="pc3-in" type="number" value={j.received} placeholder="Ej.: 150" onChange={e => setJ(o => ({ ...o, received: e.target.value }))} /></label></div>
        : <label className="pc3-fld">Motivo <span className="hint">lo verá el alumno</span><input className="pc3-in" value={j.reason} placeholder="Ej.: la foto no se ve / el monto no coincide" onChange={e => setJ(o => ({ ...o, reason: e.target.value }))} /></label>}
      <div>Su plataforma <b>se pausa ahora</b>, a menos que le des días para regularizar.</div>
      <label className="pc3-fld">¿Qué hacemos?<PcSeg value={j.plazo} options={[['no', 'Pausar ahora'], ['si', 'Darle días de plazo']]} onChange={v => setJ(o => ({ ...o, plazo: v }))} /></label>
      {j.plazo === 'si' && <label className="pc3-fld">Días de plazo<input className="pc3-in" type="number" min="1" max="30" style={{ width: 90 }} value={j.days} onChange={e => setJ(o => ({ ...o, days: e.target.value }))} /></label>}
      {err && <div className="pc3-err">⚠ {err}</div>}
    </PcM>
  );
  return (
    <PcM title={`Captura de ${pcFirst(student)}`} wide onClose={onClose}
      foot={<>
        {window.sharePaymentWA && <button className="pc3-b" style={{ marginRight: 'auto' }} onClick={() => window.sharePaymentWA(payment, student.fullName, gName, pcCur())}>📲 Al grupo de WhatsApp</button>}
        <button className="pc3-b" style={{ color: '#B45300' }} onClick={() => toReject('inc')}>No está completo</button>
        <button className="pc3-b" style={{ color: '#C62828' }} onClick={() => toReject('rej')}>Rechazar</button>
        <button className="pc3-b gr" disabled={busy} onClick={approve}>{busy ? 'Guardando…' : 'Aprobar pago'}</button>
      </>}>
      <div className="pc3-shot">{shot === 'loading' ? 'Cargando captura…' : shot === 'none' ? 'Este pago no tiene captura.' : <img src={shot} alt="captura del pago" />}</div>
      <div>{student.fullName} · {gName}<br />Eligió <b>{P.labelMode(payment.mode)}</b>{payment.amount ? ` · ${pcCur()} ${payment.amount}` : ''} · DNI boleta {payment.dni || '—'} · {regAt}</div>
      {reopened && <div className="pc3-hintbox">Su plataforma está <b>abierta</b> hasta que decidas.</div>}
      <PcPayFields student={student} row={row} payDay={payDay} f={f} setF={setF} />
      {err && <div className="pc3-err">⚠ {err}</div>}
    </PcM>
  );
}

function AdminPayControl({ onChange }) {
  pcCss();
  const D = window.JUCUM_DATA; const P = window.JUCUM_PAY; const PG = window.JUCUM_PAYGATE;
  const [tick, setTick] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState('');
  const [fSt, setFSt] = React.useState('deben');
  const [fLv, setFLv] = React.useState('all');
  const [fMd, setFMd] = React.useState('all');
  const [fGr, setFGr] = React.useState('all');
  const [open, setOpen] = React.useState(null);
  const [dlg, setDlg] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const bump = () => { setTick(t => t + 1); onChange && onChange(); };
  const reload = () => { setLoading(true); P.gateLoad().then(() => { setLoading(false); setTick(t => t + 1); }); };
  React.useEffect(reload, []);
  const toastRef = React.useRef(null);
  const say = (msg, undo) => { clearTimeout(toastRef.current); setToast({ msg, undo }); toastRef.current = setTimeout(() => setToast(null), 5500); };

  if (!PG) return <div className="scard" style={{ marginTop: 16 }}><div className="err">Falta el archivo pay-gate.js en el servidor.</div></div>;
  if (loading && !P.gateReady()) return <div className="scard" style={{ marginTop: 16 }}><div className="settings-hint">Cargando pagos…</div></div>;
  if (!P.gateReady()) return (
    <div className="scard" style={{ marginTop: 16, borderLeft: '5px solid #C62828' }}>
      <div className="sec-title" style={{ color: '#C62828' }}>No se pudo leer el control de pagos</div>
      <div className="settings-hint" style={{ marginTop: 6 }}>¿Ya se ejecutaron los scripts 30 y 31 en Supabase? Mientras no se lea, <b>nadie recibe avisos ni pausa</b> (protección). Detalle: {P.gateError()}</div>
      <button className="att-btn" style={{ marginTop: 10 }} onClick={reload}>↻ Reintentar</button>
    </div>
  );

  const ctl = P.gateCtl();
  const today = pcToday();
  const sim = { ...ctl, on: true };
  const cfgPay = P.getConfig();
  const isFin = (gid) => !!(window.JUCUM_GRAD && window.JUCUM_GRAD.isFinished && window.JUCUM_GRAD.isFinished(gid));
  const isGrad = (sid) => !!(window.JUCUM_GRAD && window.JUCUM_GRAD.isGraduated && window.JUCUM_GRAD.isGraduated(sid));
  const groups = D.GROUPS.filter(g => !isFin(g.id));
  const gById = {}; groups.forEach(g => { gById[g.id] = g; });
  const paysBy = {}; P.getAllPayments().forEach(p => { (paysBy[p.studentId] = paysBy[p.studentId] || []).push(p); });
  const rows = D.STUDENTS.filter(s => !s.closedAt && gById[s.group] && !isGrad(s.id)).map(s => {
    const r = P.gateRow(s.id) || {};
    const g = P.isExemptGroup(s, cfgPay) ? { k: 'ex' } : PG.classify(sim, r, paysBy[s.id] || [], s.group);
    const mode = r.mode || s.payMode || 'mensual';
    return { s, r, g, v: pcView(g, r), mode, amount: P.priceFor(s, mode), pend: (paysBy[s.id] || []).find(p => p.status === 'por_confirmar') || null };
  });
  const byId = (sid) => rows.find(x => x.s.id === sid);

  /* ── acciones con "Deshacer" ── */
  const runRow = async (s, patch, action, detail, msg) => {
    const prev = P.gateRow(s.id) || {};
    const back = {}; Object.keys(patch).forEach(k => { back[k] = k in prev ? prev[k] : null; });
    const res = await P.gateSet(s.id, patch, action, detail);
    if (!res.ok) { say('No se pudo guardar: ' + res.error); return res; }
    bump(); say(msg, async () => { await P.gateSet(s.id, back, 'deshizo', action); bump(); });
    return res;
  };
  const clearRej = (r) => (r.rejected ? { rejected: '', falta: null } : {});
  const act = {
    mark: (x) => runRow(x.s, { debtor: true, notice_start: null }, 'marcó deudor', '', 'Marcado como deudor · aún no ve nada'),
    unmark: (x) => runRow(x.s, { debtor: false, notice_start: null, closed_manual: false, ...clearRej(x.r) }, 'quitó marca', '', 'Marca quitada'),
    pause: (x) => runRow(x.s, { closed_manual: true }, 'pausó a mano', '', 'Plataforma en pausa'),
    notice: (list) => setDlg({ kind: 'notice', list }),
    paid: (x) => setDlg({ kind: 'paid', x }),
    review: (x) => setDlg({ kind: 'review', x }),
    pror: (x) => setDlg({ kind: 'pror', x }),
    edit: (x) => setDlg({ kind: 'edit', x }),
    emerg: (x) => setDlg({ kind: 'emerg', x }),
  };
  const primary = (x) => {
    if (x.pend) return <button className="pc3-b sm pri" onClick={e => { e.stopPropagation(); act.review(x); }}>Revisar captura</button>;
    if (x.v.k === 'mark') return <button className="pc3-b sm or" onClick={e => { e.stopPropagation(); act.notice([x.s]); }}>Enviar aviso</button>;
    if (x.v.k === 'av' || x.v.k === 'cl') return <button className="pc3-b sm gr" onClick={e => { e.stopPropagation(); act.paid(x); }}>Registrar pago</button>;
    return null;
  };

  /* ── filtros ── */
  const FS = [['deben', 'Deben', k => pcOwes(k), '#C62828'], ['rev', 'Por revisar', k => k === 'rev', '#1565C0'], ['pr', 'Con plazo', k => k === 'pr', '#6A1B9A'], ['ok', 'Al día', k => k === 'ok', '#2E7D32'], ['all', 'Todos', k => k !== 'nc', '#24262B']];
  const fStFn = (FS.find(f => f[0] === fSt) || FS[0])[2];
  const base = rows.filter(x => x.v.k !== 'nc'
    && (fLv === 'all' || x.s.level === fLv) && (fGr === 'all' || x.s.group === fGr) && (fMd === 'all' || x.mode === fMd)
    && (!q || pcNorm(x.s.fullName + ' ' + (x.s.dni || '') + ' ' + (x.s.username || '')).includes(pcNorm(q))));
  const stFilter = (x) => fSt === 'rev' ? (x.v.k === 'rev' || !!x.pend) : fStFn(x.v.k);
  const shown = base.filter(stFilter);
  const debt = rows.filter(x => pcOwes(x.v.k));
  const porCobrar = debt.reduce((a, x) => a + (x.r.falta || x.amount || 0), 0);
  const pendN = rows.filter(x => x.pend).length;
  const marked = rows.filter(x => x.v.k === 'mark');
  const levels = Object.keys(D.LEVELS || {});
  const auto = !!(ctl.autoFrom && today >= ctl.autoFrom);
  const gSel = fGr !== 'all' ? (ctl.groups || {})[fGr] || {} : null;
  const sel = open ? byId(open) : null;

  return (
    <div className="pc3">
      {!ctl.on && (
        <div className="pc3-off"><div className="tx"><b>⚪ Control de pagos apagado</b>Ningún alumno ve avisos ni pausa. Puedes preparar todo (marcar deudores, montos, días de pago) y activarlo cuando quieras.</div><button className="pc3-b pri" onClick={() => setDlg({ kind: 'power', on: true })}>Activar</button></div>
      )}
      <div className="pc3-top">
        <div><h1>¿Quién no ha pagado?</h1><div className="pc3-sum">{debt.length ? <><b>{debt.length} alumno{debt.length > 1 ? 's' : ''} debe{debt.length > 1 ? 'n' : ''}</b> · {pcCur()} {porCobrar} por cobrar</> : 'Nadie debe en este momento.'}{pendN ? ` · ${pendN} captura${pendN > 1 ? 's' : ''} por revisar` : ''}</div></div>
        <div className="pc3-btns"><button className="pc3-b" onClick={() => setDlg({ kind: 'cfg', tab: 'grupos' })}>⚙ Configurar cobros</button><button className="pc3-b pri" onClick={() => setDlg({ kind: 'mark' })}>+ Marcar quién debe</button></div>
      </div>
      {marked.length > 0 && (
        <div className="pc3-todo"><div className="tx"><b>{marked.length} marcado{marked.length > 1 ? 's' : ''} como deudor{marked.length > 1 ? 'es' : ''}, todavía sin aviso</b>{marked.map(x => x.s.fullName).join(' · ')}</div><button className="pc3-b or" onClick={() => act.notice(marked.map(x => x.s))}>Avisar a {marked.length > 1 ? 'los ' + marked.length : 'este alumno'}</button></div>
      )}
      <div className="pc3-bar">
        <div className="pc3-search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A8F9C" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar alumno por nombre o DNI…" />
          {q && <button className="pc3-b lk" onClick={() => setQ('')}>Borrar</button>}
        </div>
        <div className="pc3-frow"><span className="pc3-flbl">Estado</span>{FS.map(([k, l, , c]) => <button key={k} className={`pc3-pill ${fSt === k ? 'on' : ''}`} style={{ '--c': c }} onClick={() => setFSt(k)}>{l} <span className="n">{base.filter(x => k === 'rev' ? (x.v.k === 'rev' || !!x.pend) : (FS.find(f => f[0] === k)[2])(x.v.k)).length}</span></button>)}</div>
        <div className="pc3-frow">
          <span className="pc3-flbl">Nivel</span>
          <button className={`pc3-pill ${fLv === 'all' ? 'on' : ''}`} onClick={() => { setFLv('all'); setFGr('all'); }}>Todos</button>
          {levels.map(l => { const L = pcLv(l); return <button key={l} className={`pc3-pill ${fLv === l ? 'on' : ''}`} style={{ '--c': L.c }} onClick={() => { setFLv(l); setFGr('all'); }}><span className="dot"></span>{L.n}</button>; })}
          <span style={{ flex: 1 }}></span>
          <select className="pc3-in" value={fMd} onChange={e => setFMd(e.target.value)}><option value="all">Todas las modalidades</option>{['mensual', 'modulo', 'total'].map(m => <option key={m} value={m}>{P.MODE_LABEL[m]}</option>)}</select>
          <select className="pc3-in" value={fGr} onChange={e => setFGr(e.target.value)}><option value="all">Todos los grupos</option>{groups.filter(g => fLv === 'all' || g.level === fLv).sort((a, b) => a.name.localeCompare(b.name, 'es')).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
          {gSel && <button className="pc3-b sm" onClick={() => setDlg({ kind: 'gplazo', gid: fGr })}>{gSel.pror && today <= gSel.pror ? 'Plazo del grupo hasta el ' + pcFmt(gSel.pror) : 'Dar plazo a este grupo'}</button>}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {levels.map(l => {
          const list = shown.filter(x => x.s.level === l).sort((a, b) => a.s.fullName.localeCompare(b.s.fullName, 'es'));
          if (!list.length) return null;
          const L = pcLv(l);
          return (
            <React.Fragment key={l}>
              <div className="pc3-lvh" style={{ '--c': L.c }}><span className="tag">{L.n}</span><span className="ln"></span><span className="ct">{list.length} alumno{list.length > 1 ? 's' : ''}</span></div>
              <div className="pc3-list">
                {list.map(x => (
                  <div key={x.s.id} className="pc3-row" onClick={() => setOpen(x.s.id)}>
                    <div className="lv" style={{ '--c': L.c }}></div>
                    <div style={{ minWidth: 0 }}><div className="nm">{x.s.fullName}</div><div className="gp">{(gById[x.s.group] || {}).name} · <PcMode m={x.mode} /> {x.amount ? `${pcCur()} ${x.amount}` : ''}{x.mode === 'mensual' && x.r.amount != null && x.r.amount !== '' ? ' (especial)' : ''}</div></div>
                    <div className="rt"><div className="pc3-st" style={{ '--c': x.v.c }}><span className="s"><i></i>{x.v.l}</span><span className="d">{x.v.d}</span></div>{primary(x)}</div>
                  </div>
                ))}
              </div>
            </React.Fragment>
          );
        })}
        {!shown.length && <div className="pc3-empty">{q ? `No hay alumnos con “${q}”.` : fSt === 'deben' ? 'Nadie debe con estos filtros. 🎉' : 'Sin alumnos con estos filtros.'}</div>}
      </div>

      <div className="pc3-mode">
        {auto
          ? <><i style={{ background: '#F9A825' }}></i><span><b>Avisos automáticos activos:</b> si pasa el día de pago sin pago aprobado, el aviso empieza solo. Grupos sin día de pago no reciben avisos.</span></>
          : <><i style={{ background: '#2EA84B' }}></i><span><b>Solo avisas tú:</b> únicamente ven aviso los alumnos que marcas y avisas. {ctl.autoFrom ? <>Desde el <b>{pcFmt(ctl.autoFrom, true)}</b>, todos según su día de pago.</> : 'Los avisos automáticos para todos aún no tienen fecha.'}</span></>}
        <button className="pc3-b lk" onClick={() => setDlg({ kind: 'cfg', tab: 'avisos' })}>Cambiar</button>
      </div>

      {sel && <PcDrawer x={sel} ctl={ctl} tick={tick} gName={(gById[sel.s.group] || {}).name || ''} gSched={(gById[sel.s.group] || {}).schedule || ''} act={act} onClose={() => setOpen(null)} />}
      {dlg && <PcDialogs dlg={dlg} setDlg={setDlg} rows={rows} ctl={ctl} groups={groups} say={say} bump={bump} onClose={() => setDlg(null)} />}
      {toast && <div className="pc3-toast"><span>{toast.msg}</span>{toast.undo && <button onClick={() => { const u = toast.undo; setToast(null); u(); }}>Deshacer</button>}</div>}
    </div>
  );
}

function PcDrawer({ x, ctl, tick, gName, gSched, act, onClose }) {
  const P = window.JUCUM_PAY;
  const { s, r, v, mode } = x;
  const L = pcLv(s.level); const cur = pcCur();
  const [hist, setHist] = React.useState(null);
  React.useEffect(() => {
    let a = true;
    try { window.JUCUM_SB.getClient().from('pay_log').select('*').eq('student_id', s.id).order('at', { ascending: false }).limit(15).then(({ data }) => { if (a) setHist(data || []); }); } catch (e) { setHist([]); }
    return () => { a = false; };
  }, [s.id, tick]);
  const gc = (ctl.groups || {})[s.group] || {};
  const payDay = parseInt(r.pay_day, 10) || parseInt(gc.payDay, 10) || null;
  const ph = pcPhone(s);
  let main;
  if (x.pend) main = <><p>Subió su captura ({P.labelMode(x.pend.mode)}). {v.reopened ? <>Su plataforma <b>se reabrió</b> mientras la revisas. </> : null}Si no la apruebas, se vuelve a pausar.</p><div className="pc3-acts"><button className="pc3-b pri" onClick={() => act.review(x)}>Revisar y aprobar</button></div></>;
  else if (v.k === 'mark') main = <><p>Lo marcaste como deudor. Envíale el aviso: tendrá {ctl.avDays} días para pagar antes de la pausa.</p><div className="pc3-acts"><button className="pc3-b or" onClick={() => act.notice([s])}>Enviar aviso</button><button className="pc3-b gr" onClick={() => act.paid(x)}>Ya pagó</button></div></>;
  else if (v.k === 'av') main = <><p>Ya tiene el aviso. Si no paga, su plataforma se pausa {v.d.replace('Se pausa ', '')} a las 00:00 (hora Perú).</p><div className="pc3-acts"><button className="pc3-b gr" onClick={() => act.paid(x)}>Registrar pago</button><button className="pc3-b" onClick={() => act.pror(x)}>Dar más días</button></div></>;
  else if (v.k === 'cl') main = <><p>{r.rejected ? r.rejected + '. ' : ''}Su plataforma está en pausa. Al registrar el pago vuelve a practicar al instante.</p><div className="pc3-acts"><button className="pc3-b gr" onClick={() => act.paid(x)}>Registrar pago</button><button className="pc3-b" onClick={() => act.pror(x)}>Dar más días</button></div></>;
  else if (v.k === 'pr') main = <><p>{r.rejected ? String(r.rejected).split(' · ')[0] + '. ' : ''}{v.d}{r.note ? ` (${r.note})` : ''}. Si no regulariza, la plataforma <b>se pausa sola</b> al terminar el plazo.</p><div className="pc3-acts"><button className="pc3-b gr" onClick={() => act.paid(x)}>Registrar pago</button><button className="pc3-b" onClick={() => act.pror(x)}>Dar más días</button></div></>;
  else main = <><p>{v.d || 'Sin pagos pendientes.'}</p><div className="pc3-acts"><button className="pc3-b gr" onClick={() => act.paid(x)}>Registrar pago</button></div></>;
  const more = [];
  if (v.k === 'ok' || v.k === 'rev') more.push(<button key="m" onClick={() => act.mark(x)}>Marcar que debe <small>no ve nada hasta que le envíes el aviso</small></button>);
  if (v.k === 'mark' || v.k === 'av' || (v.k === 'pr' && (r.debtor || r.rejected))) more.push(<button key="u" onClick={() => act.unmark(x)}>Quitar marca de deudor <small>vuelve a la normalidad</small></button>);
  if (v.k === 'av') more.push(<button key="p" className="rd" onClick={() => act.pause(x)}>Pausar ahora <small>sin esperar</small></button>);
  if (v.k === 'mark') more.push(<button key="pr" onClick={() => act.pror(x)}>Dar prórroga</button>);
  if (v.k === 'cl') more.push(<button key="e" onClick={() => act.emerg(x)}>Ver su avance <small>emergencia · queda registrado</small></button>);
  if (ph && (pcOwes(v.k) || v.k === 'pr')) more.push(<a key="w" href={`https://wa.me/${ph}?text=${encodeURIComponent(`Hola ${pcFirst(s)}, te escribimos de JUCUM English Center: tu pago está pendiente. Por favor regístralo en la plataforma (💳 Pagos) o comunícate con nosotros. ¡Gracias!`)}`} target="_blank" rel="noopener" onClick={() => P.gateLog(s.id, 'whatsapp', 'Mensaje de pago por WhatsApp')}>Escribirle por WhatsApp <small>mensaje listo</small></a>);
  return (
    <>
      <div className="pc3-scrim" onClick={onClose}></div>
      <aside className="pc3-drawer">
        <div className="pc3-dh"><div style={{ flex: 1, minWidth: 0 }}><h2>{s.fullName}</h2><div className="g"><span className="pc3-lvb" style={{ '--c': L.c }}>{L.n}</span>{gName}{gSched ? ' · ' + gSched : ''}</div></div><button className="pc3-x" onClick={onClose}>✕</button></div>
        <div className="pc3-db">
          <div className="pc3-big" style={{ '--c': v.c, '--bg': v.bg }}><div className="s">{v.l}</div>{main}</div>
          <div className="pc3-sees"><b>Qué ve el alumno:</b> <span dangerouslySetInnerHTML={{ __html: ctl.on ? (PC_SEES[x.pend && v.k !== 'rev' ? v.k : v.k] || '') : 'Nada: el control de pagos está apagado.' }}></span></div>
          {more.length > 0 && <div className="pc3-sec"><h3>Otras opciones</h3><div className="pc3-more">{more}</div></div>}
          <div className="pc3-sec"><h3>Su cobro</h3><div className="pc3-kv">
            <div><span>Modalidad</span><b><PcMode m={mode} /></b></div>
            <div><span>Monto</span><b>{x.amount ? `${cur} ${x.amount}` : 'Por definir'} {mode === 'mensual' ? 'al mes' : mode === 'modulo' ? 'por módulo' : 'en total'}{mode === 'mensual' && r.amount != null && r.amount !== '' ? ' · especial' : ''} <button className="pc3-b lk" onClick={() => act.edit(x)}>Cambiar</button></b></div>
            {r.paid_until && <div><span>Cubre hasta</span><b>{pcFmt(r.paid_until, true)}</b></div>}
            <div><span>Día de pago</span><b>{payDay ? `El ${payDay} de cada mes` : 'Sin definir'}{r.pay_day ? ' · propio' : ''} <button className="pc3-b lk" onClick={() => act.edit(x)}>Cambiar</button></b></div>
            <div><span>Empezó el</span><b>{r.join_date ? pcFmt(r.join_date, true) : 'Con su grupo'} <button className="pc3-b lk" onClick={() => act.edit(x)}>Cambiar</button></b></div>
            {r.amount_why && <div><span>Nota</span><b style={{ fontWeight: 700 }}>{r.amount_why}</b></div>}
          </div></div>
          <div className="pc3-sec"><h3>Historial</h3><div className="pc3-hist">
            {hist === null ? <div><span>Cargando…</span></div> : hist.length === 0 ? <div><span>Sin movimientos todavía.</span></div>
              : hist.map(h => <div key={h.id}><b>{new Date(h.at).toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'short' })}</b><span>{h.action}{h.detail ? ' · ' + h.detail : ''}{h.who ? ' · ' + h.who : ''}</span></div>)}
          </div></div>
        </div>
      </aside>
    </>
  );
}

function PcDialogs({ dlg, setDlg, rows, ctl, groups, say, bump, onClose }) {
  const D = window.JUCUM_DATA; const P = window.JUCUM_PAY; const PG = window.JUCUM_PAYGATE;
  const today = pcToday(); const cur = pcCur();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');
  const x = dlg.x || {}; const s = x.s; const r = x.r || {};
  const gc = s ? ((ctl.groups || {})[s.group] || {}) : {};
  const payDay = s ? (parseInt(r.pay_day, 10) || parseInt(gc.payDay, 10) || null) : null;
  const [f, setF] = React.useState(() => {
    if (!s) return {};
    const m = x.mode || 'mensual';
    return {
      mode: m, amount: P.priceFor(s, m) ?? '', until: pcCoverFor(s, m, r, payDay), medio: 'Efectivo en oficina',
      pror: PG.addDays(today, 7), why: '', tv: false,
      join: r.join_date || '', amtMode: r.amount != null && r.amount !== '' ? 'e' : 'g', amt: r.amount != null && r.amount !== '' ? r.amount : ((P.getConfig().amounts[s.level] || {}).mensual || ''), amtWhy: r.amount_why || '',
      dayMode: r.pay_day ? 'e' : 'g', day: r.pay_day || '', exempt: !!r.exempt,
    };
  });
  const up = (k, val) => setF(o => ({ ...o, [k]: val }));
  const done = (msg) => { setBusy(false); onClose(); bump(); if (msg) say(msg); };
  const go = async (fn, msg) => { setBusy(true); setErr(''); const res = await fn(); if (res && res.ok === false) { setErr(res.error || 'No se pudo guardar.'); setBusy(false); return; } done(msg); };
  const Cancel = <button className="pc3-b" onClick={onClose}>Cancelar</button>;
  const Err = err ? <div className="pc3-err">⚠ {err}</div> : null;
  const gName = (gid) => (D.GROUPS.find(g => g.id === gid) || {}).name || '';

  if (dlg.kind === 'review') return x.pend ? <PcReviewDialog payment={x.pend} student={s} onClose={onClose} onDone={() => done('Listo')} /> : null;

  if (dlg.kind === 'notice') {
    const list = dlg.list; const close = PG.addDays(today, ctl.avDays);
    const send = async () => {
      setBusy(true); setErr('');
      const backs = [];
      for (const st of list) {
        const prev = P.gateRow(st.id) || {};
        backs.push([st.id, { debtor: 'debtor' in prev ? prev.debtor : null, notice_start: prev.notice_start || null }]);
        const res = await P.gateSet(st.id, { debtor: true, notice_start: today }, 'envió aviso', `Aviso de ${ctl.avDays} días · se pausa el ${close}`);
        if (!res.ok) { setErr(res.error); setBusy(false); return; }
        if (ctl.on && window.JUCUM_NOTIF) window.JUCUM_NOTIF.pushNotif(st.id, { type: 'payment', link: 'payments', title: '⏳ Tu pago está pendiente', body: `Registra tu pago o comunícate con administración (${P.ATTN_PHONE}). Si no, tu plataforma se pondrá en pausa el ${pcFmt(close, true)}.` });
      }
      setBusy(false); onClose(); bump();
      say(`Aviso enviado a ${list.length} alumno${list.length > 1 ? 's' : ''}`, async () => { for (const [id, b] of backs) await P.gateSet(id, b, 'deshizo', 'aviso'); bump(); });
    };
    return (
      <PcM title={`Enviar aviso de ${ctl.avDays} días`} onClose={onClose} foot={<>{Cancel}<button className="pc3-b or" disabled={busy} onClick={send}>{busy ? 'Enviando…' : 'Sí, enviar aviso'}</button></>}>
        <div>Solo {list.length > 1 ? `estos ${list.length} alumnos verán` : 'este alumno verá'} el aviso. Nadie más:</div>
        <div className="pc3-names">{list.map(st => <span key={st.id}>{st.fullName} <span style={{ color: '#8A8F9C', fontWeight: 600 }}>· {pcLv(st.level).n} · {gName(st.group)}</span></span>)}</div>
        <div>Si no regulariza{list.length > 1 ? 'n' : ''}, la plataforma se pausa el <b>{pcFmt(close, true)}</b> a las 00:00 (hora Perú).</div>
        {!ctl.on && <div className="pc3-err">El control está apagado: el aviso queda guardado, pero lo verán recién cuando lo actives.</div>}
        {Err}
      </PcM>
    );
  }

  if (dlg.kind === 'paid') return (
    <PcM title={`Registrar pago · ${pcFirst(s)}`} onClose={onClose} foot={<>{Cancel}<button className="pc3-b gr" disabled={busy} onClick={() => { if (!f.until) { setErr('Indica hasta cuándo cubre el pago.'); return; } go(() => P.adminRecordPayment(s, { mode: f.mode, amount: f.amount, until: f.until, medio: f.medio }), 'Pago registrado'); }}>{busy ? 'Guardando…' : 'Guardar pago'}</button></>}>
      <PcPayFields student={s} row={r} payDay={payDay} f={f} setF={setF} />
      <label className="pc3-fld">¿Cómo pagó?<select className="pc3-in" value={f.medio} onChange={e => up('medio', e.target.value)}><option>Efectivo en oficina</option><option>Yape / Plin</option><option>Transferencia</option></select></label>
      <div style={{ color: '#4A4F5C' }}>Se quita cualquier aviso o pausa al instante.</div>
      {Err}
    </PcM>
  );

  if (dlg.kind === 'pror') return (
    <PcM title={`Dar más días · ${pcFirst(s)}`} onClose={onClose} foot={<>{Cancel}<button className="pc3-b pri" disabled={busy} onClick={() => go(() => P.gateSet(s.id, { extension_until: f.pror, closed_manual: false, note: f.why }, 'prórroga', `hasta ${f.pror}${f.why ? ' · ' + f.why : ''}`), 'Plazo guardado')}>{busy ? 'Guardando…' : 'Dar plazo'}</button></>}>
      <label className="pc3-fld">Puede pagar hasta<input className="pc3-in" type="date" min={today} value={f.pror} onChange={e => up('pror', e.target.value)} /></label>
      <label className="pc3-fld">Motivo <span className="hint">opcional</span><input className="pc3-in" value={f.why} placeholder="Ej.: cobra la quincena" onChange={e => up('why', e.target.value)} /></label>
      <div style={{ color: '#4A4F5C' }}>Mientras dure, practica normal. Si al terminar no regularizó, {r.notice_start || r.rejected ? 'se pausa solo' : 'vuelve a quedar como deudor'}.</div>
      {Err}
    </PcM>
  );

  if (dlg.kind === 'gplazo') {
    const g = (ctl.groups || {})[dlg.gid] || {};
    const aff = rows.filter(y => y.s.group === dlg.gid && (pcOwes(y.v.k) || y.v.k === 'pr'));
    const [d0] = [g.pror && g.pror >= today ? g.pror : PG.addDays(today, 3)];
    const val = f.gpl || d0;
    const save = (pror) => go(() => P.gateSetControl({ groups: { [dlg.gid]: { ...g, pror } } }, `${gName(dlg.gid)}: ${pror ? 'plazo del grupo hasta ' + pror : 'se quitó el plazo del grupo'}`), pror ? 'Plazo del grupo hasta el ' + pcFmt(pror) : 'Plazo del grupo quitado');
    return (
      <PcM title={`Plazo para ${gName(dlg.gid)}`} onClose={onClose} foot={<>{g.pror ? <button className="pc3-b" style={{ marginRight: 'auto' }} onClick={() => save(null)}>Quitar plazo</button> : null}{Cancel}<button className="pc3-b pri" disabled={busy} onClick={() => save(val)}>Dar plazo</button></>}>
        <div>Los alumnos de este grupo que deben siguen practicando hasta esa fecha. Si no regularizan, se pausan solos ese día.</div>
        <label className="pc3-fld">Plazo hasta<input className="pc3-in" type="date" min={today} value={val} onChange={e => up('gpl', e.target.value)} /></label>
        <div className="pc3-names">{aff.length ? aff.map(y => <span key={y.s.id}>{y.s.fullName}</span>) : <span style={{ color: '#8A8F9C' }}>Hoy nadie de este grupo debe. El plazo aplicará a quien quede debiendo.</span>}</div>
        {Err}
      </PcM>
    );
  }

  if (dlg.kind === 'edit') return (
    <PcM title={`Cobro de ${pcFirst(s)}`} onClose={onClose} foot={<>{Cancel}<button className="pc3-b pri" disabled={busy} onClick={() => {
      const patch = { amount: f.amtMode === 'e' && f.amt !== '' ? Number(f.amt) : null, amount_why: f.amtWhy || '', pay_day: f.dayMode === 'e' && f.day ? Math.max(1, Math.min(31, parseInt(f.day, 10) || 1)) : null, join_date: f.join || null, exempt: !!f.exempt };
      go(() => P.gateSet(s.id, patch, 'editó cobro', `${patch.amount != null ? cur + ' ' + patch.amount + ' (especial)' : 'monto del nivel'} · ${patch.pay_day ? 'día ' + patch.pay_day : 'día del grupo'}${patch.join_date ? ' · empezó ' + patch.join_date : ''}${patch.exempt ? ' · no cobra' : ''}`), 'Guardado');
    }}>{busy ? 'Guardando…' : 'Guardar'}</button></>}>
      <label className="pc3-fld">Monto mensual <span className="hint">para quien paga mensual</span><PcSeg value={f.amtMode} options={[['g', `Del nivel · ${cur} ${(P.getConfig().amounts[s.level] || {}).mensual || '—'}`], ['e', 'Otro monto']]} onChange={v => up('amtMode', v)} />{f.amtMode === 'e' && <input className="pc3-in" type="number" min="0" style={{ width: 120 }} value={f.amt} onChange={e => up('amt', e.target.value)} />}</label>
      <label className="pc3-fld">Día de pago<PcSeg value={f.dayMode} options={[['g', `Del grupo · ${gc.payDay ? 'el ' + gc.payDay : 'sin definir'}`], ['e', 'Otro día']]} onChange={v => up('dayMode', v)} />{f.dayMode === 'e' && <input className="pc3-in" type="number" min="1" max="31" style={{ width: 90 }} value={f.day} onChange={e => up('day', e.target.value)} />}</label>
      <label className="pc3-fld">Empezó el <span className="hint">solo si entró después del inicio de clases</span><input className="pc3-in" type="date" value={f.join} onChange={e => up('join', e.target.value)} /></label>
      <label className="pc3-fld">Nota <span className="hint">opcional</span><input className="pc3-in" value={f.amtWhy} placeholder="Ej.: ingresó en un módulo avanzado" onChange={e => up('amtWhy', e.target.value)} /></label>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 700 }}><input type="checkbox" checked={f.exempt} onChange={e => up('exempt', e.target.checked)} /> No cobra (beca / convenio)</label>
      {Err}
    </PcM>
  );

  if (dlg.kind === 'emerg') {
    if (dlg.open && window.StudentReport) return (
      <div className="modal-backdrop" onClick={onClose}><div className="modal" style={{ maxWidth: 980, width: '96vw', maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}><StudentReport student={s} onBack={onClose} forTeacher /></div></div>
    );
    const allow = r.teacher_allow == null ? 1 : r.teacher_allow; const left = Math.max(0, allow - (r.teacher_views || 0));
    return (
      <PcM title={`Ver avance · ${pcFirst(s)}`} onClose={onClose} foot={<>{Cancel}<button className="pc3-b pri" disabled={busy} onClick={async () => {
        if (!f.why.trim()) { setErr('Escribe el motivo (queda en el historial).'); return; }
        setBusy(true);
        if (f.tv) { const res = await P.gateSet(s.id, { teacher_allow: allow + 1 }, 'vista extra al profesor', f.why); if (!res.ok) { setErr(res.error); setBusy(false); return; } }
        P.gateLog(s.id, 'vio avance (emergencia)', f.why); setBusy(false); setDlg({ ...dlg, open: true });
      }}>Abrir avance</button></>}>
        <div>Está en pausa por pago. Tú siempre puedes ver su avance; queda registrado en su historial.</div>
        <label className="pc3-fld">Motivo<input className="pc3-in" value={f.why} placeholder="Ej.: reunión con el apoderado" onChange={e => up('why', e.target.value)} /></label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 700 }}><input type="checkbox" checked={f.tv} onChange={e => up('tv', e.target.checked)} /> Dar también 1 vista más al profesor ({left} disponible{left === 1 ? '' : 's'} ahora)</label>
        {Err}
      </PcM>
    );
  }

  if (dlg.kind === 'power') return (
    <PcM title={dlg.on ? 'Activar control de pagos' : 'Apagar control de pagos'} onClose={onClose} foot={<>{Cancel}<button className={`pc3-b ${dlg.on ? 'pri' : 'rd'}`} disabled={busy} onClick={() => go(() => P.gateSetControl({ on: dlg.on }, dlg.on ? 'Control de pagos ACTIVADO' : 'Control de pagos APAGADO'), dlg.on ? 'Control activado' : 'Control apagado')}>{dlg.on ? 'Activar' : 'Apagar'}</button></>}>
      <div>{dlg.on ? <>Desde ahora solo verán el aviso los alumnos a los que <b>se lo envíes</b>{ctl.autoFrom ? <>, y desde el <b>{pcFmt(ctl.autoFrom, true)}</b> todos según su día de pago</> : null}. Nadie más ve nada.</> : 'Nadie verá avisos ni pausa: todos practican normal. Las marcas se conservan.'}</div>
      {Err}
    </PcM>
  );

  if (dlg.kind === 'mark') return <PcMarkDialog rows={rows} onClose={onClose} onMarked={(list, avisar) => { bump(); if (avisar) setDlg({ kind: 'notice', list }); else { onClose(); say(`${list.length} marcado${list.length > 1 ? 's' : ''} · aún no ven nada`); } }} />;
  if (dlg.kind === 'cfg') return <PcConfigDialog tab0={dlg.tab} ctl={ctl} rows={rows} groups={groups} setDlg={setDlg} say={say} bump={bump} onClose={onClose} />;
  return null;
}

function PcMarkDialog({ rows, onClose, onMarked }) {
  const P = window.JUCUM_PAY; const D = window.JUCUM_DATA;
  const [q, setQ] = React.useState('');
  const [sel, setSel] = React.useState({});
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');
  const ref = React.useRef(null);
  React.useEffect(() => { ref.current && ref.current.focus(); }, []);
  const list = rows.filter(x => x.v.k !== 'nc' && !pcOwes(x.v.k) && (!q || pcNorm(x.s.fullName + ' ' + (x.s.dni || '')).includes(pcNorm(q)))).sort((a, b) => a.s.fullName.localeCompare(b.s.fullName, 'es'));
  const ids = Object.keys(sel).filter(k => sel[k]);
  const gName = (gid) => (D.GROUPS.find(g => g.id === gid) || {}).name || '';
  const doMark = async (avisar) => {
    setBusy(true); setErr('');
    const out = [];
    for (const id of ids) {
      const res = await P.gateSet(id, { debtor: true, notice_start: null }, 'marcó deudor', '');
      if (!res.ok) { setErr(res.error); setBusy(false); return; }
      out.push(rows.find(x => x.s.id === id).s);
    }
    setBusy(false); onMarked(out, avisar);
  };
  return (
    <PcM title="Marcar quién debe" wide onClose={onClose} foot={<>
      <span style={{ marginRight: 'auto', fontWeight: 800, color: '#4A4F5C' }}>{ids.length ? `${ids.length} seleccionado${ids.length > 1 ? 's' : ''}` : ''}</span>
      <button className="pc3-b" onClick={onClose}>Cancelar</button>
      <button className="pc3-b" disabled={!ids.length || busy} onClick={() => doMark(false)}>Solo marcar</button>
      <button className="pc3-b or" disabled={!ids.length || busy} onClick={() => doMark(true)}>Marcar y avisar</button>
    </>}>
      <div style={{ color: '#4A4F5C' }}>Busca y marca a los alumnos que deben. <b>No verán nada</b> hasta que les envíes el aviso.</div>
      <div className="pc3-search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8F9C" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg><input ref={ref} value={q} onChange={e => setQ(e.target.value)} placeholder="Escribe un nombre o DNI…" /></div>
      <div className="pc3-pick">
        {list.length ? list.map(x => { const L = pcLv(x.s.level); return (
          <label key={x.s.id}><input type="checkbox" checked={!!sel[x.s.id]} onChange={e => setSel(o => ({ ...o, [x.s.id]: e.target.checked }))} /><span className="lv" style={{ '--c': L.c }}></span><span>{x.s.fullName}<small>{gName(x.s.group)}</small></span><span style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 12, color: L.c }}>{L.n}</span></label>
        ); }) : <div style={{ padding: 16, color: '#8A8F9C', fontWeight: 700, textAlign: 'center' }}>Sin resultados</div>}
      </div>
      {err && <div className="pc3-err">⚠ {err}</div>}
    </PcM>
  );
}

function PcConfigDialog({ tab0, ctl, rows, groups, setDlg, say, bump, onClose }) {
  const P = window.JUCUM_PAY; const PG = window.JUCUM_PAYGATE; const D = window.JUCUM_DATA;
  const today = pcToday(); const cur = pcCur();
  const [tab, setTab] = React.useState(tab0 || 'grupos');
  const [err, setErr] = React.useState('');
  const cfg0 = P.getConfig();
  const [amounts, setAmounts] = React.useState(() => JSON.parse(JSON.stringify(cfg0.amounts || {})));
  const [pack, setPack] = React.useState(() => ({ 'pre-a1': 6, a1: 6, a2: 6, ...(cfg0.packMonths || {}) }));
  const [av, setAv] = React.useState(ctl.avDays);
  const [pre, setPre] = React.useState(ctl.preDays);
  const [from, setFrom] = React.useState(ctl.autoFrom || '');
  const [prov, setProv] = React.useState(ctl.prov !== false);
  const [confirm, setConfirm] = React.useState(null);
  const levels = Object.keys(D.LEVELS || {});
  const saveGroup = async (gid, patch, detail) => {
    const curG = (P.gateCtl().groups || {})[gid] || {};
    const res = await P.gateSetControl({ groups: { [gid]: { ...curG, ...patch } } }, detail);
    if (!res.ok) { setErr(res.error); return; }
    bump();
  };
  const gName = (gid) => (D.GROUPS.find(g => g.id === gid) || {}).name || '';
  const saveAvisos = async (skipCheck) => {
    if (!skipCheck && from && from !== (ctl.autoFrom || '')) {
      const day = from > today ? from : today;
      const s2 = { ...ctl, on: true, autoFrom: from, avDays: av };
      const pays = P.getAllPayments();
      const names = rows.filter(x => x.v.k !== 'nc').filter(x => { const k = PG.classify(s2, x.r, pays.filter(p => p.studentId === x.s.id), x.s.group, day).k; return k === 'av' || k === 'cl'; }).map(x => x.s.fullName);
      setConfirm(names); return;
    }
    const res = await P.gateSetControl({ avDays: av, preDays: pre, autoFrom: from, prov }, `Avisos: ${av} días · recordatorio ${pre} días · para todos desde ${from || 'sin fecha'}`);
    if (!res.ok) { setErr(res.error); return; }
    setConfirm(null); bump(); say('Configuración guardada');
  };
  const saveMontos = () => { P.setConfig({ amounts, packMonths: pack }); bump(); say('Montos guardados'); };
  const setAmt = (l, m, v) => setAmounts(o => ({ ...o, [l]: { ...(o[l] || {}), [m]: v === '' ? 0 : Math.max(0, parseInt(v, 10) || 0) } }));

  let body, foot = <button className="pc3-b pri" onClick={onClose}>Listo</button>;
  if (tab === 'grupos') body = (
    <>
      <div style={{ color: '#4A4F5C' }}>Se configura una sola vez. Un grupo sin día de pago <b>nunca</b> recibe avisos automáticos.</div>
      {levels.map(l => {
        const L = pcLv(l);
        const list = groups.filter(g => g.level === l).sort((a, b) => a.name.localeCompare(b.name, 'es'));
        if (!list.length) return null;
        return (
          <React.Fragment key={l}>
            <div className="pc3-lvh" style={{ '--c': L.c, margin: '2px 0 0' }}><span className="tag">{L.n}</span><span className="ln"></span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {list.map(g => {
                const gc = (ctl.groups || {})[g.id] || {};
                const conv = P.isExemptGroup({ group: g.id }, P.getConfig()) && !gc.off;
                const off = !!gc.off || conv;
                return (
                  <div key={g.id} className={`pc3-cfgrow ${off ? 'off' : ''}`}>
                    <div className="lv" style={{ '--c': off ? '#C9C6BC' : L.c }}></div>
                    <div className="nm">{g.name}<small>{off ? (conv ? 'Convenio · no cobra' : 'No cobra') : (g.schedule || '')}</small></div>
                    <div className="ctl">
                      {!off && <>Paga el <input className="pc3-in" type="number" min="1" max="31" style={{ width: 62, textAlign: 'center' }} defaultValue={gc.payDay || ''} placeholder="—" onBlur={e => { const v = e.target.value ? Math.max(1, Math.min(31, parseInt(e.target.value, 10) || 1)) : null; if (v !== (gc.payDay || null)) saveGroup(g.id, { payDay: v }, `${g.name}: día de pago ${v || 'sin definir'}`); }} /> de cada mes</>}
                      {!off && <button className="pc3-b lk" onClick={() => setDlg({ kind: 'gplazo', gid: g.id })}>{gc.pror && today <= gc.pror ? 'Plazo hasta ' + pcFmt(gc.pror) : 'Dar plazo'}</button>}
                      {!conv && <button className="pc3-b lk" onClick={() => saveGroup(g.id, { off: !gc.off }, `${g.name}: ${gc.off ? 'sí cobra' : 'no cobra'}`)}>{gc.off ? 'Sí cobra' : 'No cobra'}</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </React.Fragment>
        );
      })}
    </>
  );
  if (tab === 'montos') {
    body = (
      <>
        <div style={{ color: '#4A4F5C' }}>Precio de cada modalidad por nivel. El alumno elige una al pagar y tú la apruebas. Si alguien paga distinto (por ejemplo, porque entró en un módulo avanzado), cámbialo en su panel.</div>
        {levels.map(l => { const L = pcLv(l); return (
          <div key={l} className="pc3-cfgrow"><div className="lv" style={{ '--c': L.c }}></div>
            <div className="nm">{L.n}<small>{P.modesFor(l).map(m => m === 'total' && l === 'pre-a1' ? 'Curso completo' : P.MODE_LABEL[m]).join(' · ')}</small></div>
            <div className="ctl">
              {P.modesFor(l).map(m => <span key={m} style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11.5 }}>{m === 'total' && l === 'pre-a1' ? 'Curso completo' : P.MODE_LABEL[m]}<span>{cur} <input className="pc3-in" type="number" min="0" style={{ width: 80 }} value={(amounts[l] || {})[m] || ''} placeholder="—" onChange={e => setAmt(l, m, e.target.value)} /></span></span>)}
              <span style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11.5 }}>Completo cubre<span><input className="pc3-in" type="number" min="1" max="24" style={{ width: 60 }} value={pack[l] || ''} onChange={e => setPack(o => ({ ...o, [l]: Math.max(1, parseInt(e.target.value, 10) || 1) }))} /> meses</span></span>
            </div>
          </div>
        ); })}
        <div className="pc3-hintbox">“Por módulo” cubre 2 meses. Si un monto queda vacío, el alumno ve “Consultar”. La fecha que cubre cada pago se puede cambiar al aprobarlo.</div>
      </>
    );
    foot = <><button className="pc3-b" onClick={onClose}>Cerrar</button><button className="pc3-b pri" onClick={saveMontos}>Guardar montos</button></>;
  }
  if (tab === 'avisos') {
    body = confirm ? (
      <>
        <div>Desde el <b>{pcFmt(from, true)}</b>, con los pagos aprobados hoy, recibirían aviso de pausa <b>{confirm.length}</b> alumno{confirm.length === 1 ? '' : 's'}:</div>
        <div className="pc3-names">{confirm.length ? confirm.map(n => <span key={n}>{n}</span>) : <span style={{ color: '#8A8F9C' }}>Nadie.</span>}</div>
        <div className="pc3-hintbox">Si alguien ya pagó fuera de la plataforma, regístrale el pago antes de esa fecha.</div>
      </>
    ) : (
      <>
        <div className="pc3-cfgrow"><div className="lv" style={{ '--c': ctl.on ? '#2EA84B' : '#9E9E9E' }}></div><div className="nm">Control de pagos<small>{ctl.on ? 'Encendido' : 'Apagado: nadie ve avisos'}</small></div><div className="ctl"><button className={`pc3-b sm ${ctl.on ? '' : 'pri'}`} onClick={() => setDlg({ kind: 'power', on: !ctl.on })}>{ctl.on ? 'Apagar' : 'Activar'}</button></div></div>
        <div className="pc3-cfgrow"><div className="lv" style={{ '--c': '#1F3A8A' }}></div><div className="nm">Días de aviso antes de la pausa<small>Para todos</small></div><div className="ctl"><input className="pc3-in" type="number" min="1" max="10" style={{ width: 62, textAlign: 'center' }} value={av} onChange={e => setAv(Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 2)))} /> días</div></div>
        <div className="pc3-cfgrow"><div className="lv" style={{ '--c': '#1565C0' }}></div><div className="nm">Recordatorio amable<small>Barra azul antes del día de pago · no bloquea</small></div><div className="ctl"><input className="pc3-in" type="number" min="0" max="10" style={{ width: 62, textAlign: 'center' }} value={pre} onChange={e => setPre(Math.max(0, Math.min(10, parseInt(e.target.value, 10) || 0)))} /> días antes</div></div>
        <div className="pc3-cfgrow"><div className="lv" style={{ '--c': '#F9A825' }}></div><div className="nm">Avisos automáticos para todos desde<small>Antes de esa fecha, solo los que marcas tú</small></div><div className="ctl"><input className="pc3-in" type="date" value={from} onChange={e => setFrom(e.target.value)} />{from && <button className="pc3-b lk" onClick={() => setFrom('')}>Quitar</button>}</div></div>
        <div className="pc3-cfgrow"><div className="lv" style={{ '--c': '#6A1B9A' }}></div><div className="nm">Si sube su captura<small>Su plataforma se reabre mientras la revisas (hasta 7 días)</small></div><div className="ctl"><input type="checkbox" checked={prov} onChange={e => setProv(e.target.checked)} /></div></div>
        <div className="pc3-hintbox">En el automático no se cobra en los primeros 28 días desde que el alumno empezó (su inscripción cubre ese mes).</div>
      </>
    );
    foot = confirm ? <><button className="pc3-b" onClick={() => setConfirm(null)}>Volver</button><button className="pc3-b pri" onClick={() => saveAvisos(true)}>Sí, guardar</button></> : <><button className="pc3-b" onClick={onClose}>Cerrar</button><button className="pc3-b pri" onClick={() => saveAvisos(false)}>Guardar</button></>;
  }
  return (
    <PcM title="Configurar cobros" wide onClose={onClose} foot={foot}>
      <div className="pc3-tabs">{[['grupos', 'Día de pago por grupo'], ['montos', 'Montos'], ['avisos', 'Avisos']].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setConfirm(null); }}>{l}</button>)}</div>
      {body}
      {err && <div className="pc3-err">⚠ {err}</div>}
    </PcM>
  );
}

/* Modal clásico (lo usa TeacherPayLock) */
function PcModal({ title, children, onClose, onOk, okLabel, okStyle, busy, err }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" style={{ maxWidth: 470 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head"><div className="modal-title">{title}</div><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          {children}
          {err && <div className="err" style={{ marginTop: 10 }}>⚠ {err}</div>}
          <div className="modal-actions"><button className="btn-cancel" onClick={onClose}>Cancelar</button>{onOk && <button className="btn-save" disabled={busy} style={okStyle} onClick={onOk}>{busy ? 'Guardando…' : (okLabel || 'Confirmar')}</button>}</div>
        </div>
      </div>
    </div>
  );
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
      <div className="scard" style={{ margin: '24px auto', maxWidth: 540, textAlign: 'center', borderTop: '5px solid #6B7280' }}>
        <div style={{ fontSize: 46 }}>🔒</div>
        <h1 style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 22, margin: '6px 0' }}>{student.fullName}</h1>
        <div className="settings-hint">Su acceso está <b>en pausa por pago</b>. Su avance está oculto mientras no regularice. Para cualquier consulta, habla con administración.</div>
        {left > 0
          ? <button className="btn-soft" style={{ marginTop: 14 }} onClick={() => setAsk(true)}>👁 Ver su avance (1 vez)</button>
          : <div className="settings-hint" style={{ marginTop: 14 }}>Ya usaste tu vista. Si es urgente, administración puede darte otra.</div>}
      </div>
      {ask && (
        <PcModal title={`Ver avance · ${student.fullName}`} onClose={() => setAsk(false)} busy={busy} okLabel="Ver esta vez" onOk={use}>
          <div className="settings-hint">Puedes ver su seguimiento <b>solo esta vez</b>. Si el alumno no regulariza su pago, después ya no podrás verlo. Para casos urgentes, pide acceso a administración.</div>
        </PcModal>
      )}
    </>
  );
}

Object.assign(window, { AdminPayControl, PcReviewDialog, PcDrawer, PcDialogs, PcMarkDialog, PcConfigDialog, PcModal, PcM, PcSeg, PcPayFields, TeacherPayLock, pcFmt });
