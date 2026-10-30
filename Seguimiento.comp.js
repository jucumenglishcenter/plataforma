/* 📅 Seguimiento.comp.js · SEGUIMIENTO-V1 (28-oct-2026) — pantallas de lo aprobado por la usuaria:
 *  · MiSeguimiento / StudentSeguimiento = «📅 Mi seguimiento» (3A · calendario del mes) del alumno; la ficha del
 *    alumno del profesor usa el MISMO componente (teacher).
 *  · SegAlarmCard = 🚨 2B alerta roja fija en Inicio del alumno (7 pm de la víspera → hasta terminar o cerrar).
 *  · SegAttentionCard = A avisos en Inicio del profesor + E cierre del set · SegSetChip = B etiqueta del calendario ·
 *    SegCloseCard = E · SegRemindBox / SegExtendBox = C (🔔 Recordar · ⏳ Extender a elección).
 * TODO el cálculo sale de window.JUCUM_SEG (seguimiento.js, nube). Aquí no se decide nada.
 * Marcas de estado DIBUJADAS (SegMark), nada de emoji (en algunos equipos salen como cuadritos). */
(function segInjectCss() {
  if (document.getElementById('seg-css')) return;
  const el = document.createElement('style'); el.id = 'seg-css';
  el.textContent = '@keyframes segPulse{0%,100%{box-shadow:0 0 0 3px #FFCDD2}50%{box-shadow:0 0 0 9px rgba(255,205,210,.5)}}.seg-alarm{animation:segPulse 1.6s ease-in-out infinite}@media (prefers-reduced-motion:reduce){.seg-alarm{animation:none}}';
  document.head.appendChild(el);
})();

const SEG_ST = {
  ok:   { bg:'#E3F4E6', bd:'#9FD3A4', fg:'#1D4D25', lb:'Cumplida' },
  half: { bg:'#FFF3D6', bd:'#F0C66B', fg:'#6A4200', lb:'A medias' },
  run:  { bg:'#FFF3D6', bd:'#F0C66B', fg:'#6A4200', lb:'En curso' },
  no:   { bg:'#FDECEA', bd:'#F2B8AE', fg:'#8A2A1A', lb:'No cumplida' },
  fut:  { bg:'#F7F3E9', bd:'#E6DFCC', fg:'#8a7f6a', lb:'Próxima' },
};
const SEG_RANK = { no:5, half:4, run:3, ok:2, fut:1 };
const SEG_TONE = { grn:{ background:'#E3F4E6', color:'#2E7D32' }, amb:{ background:'#FFE9B8', color:'#7A4A00' }, red:{ background:'#FDECEA', color:'#B23A2A' } };
const SEG_MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const segBtn = { border:'1.5px solid #CBBF9F', background:'#fff', borderRadius:10, padding:'7px 11px', fontWeight:800, fontSize:12.5, color:'#4A3A10', cursor:'pointer', whiteSpace:'nowrap', fontFamily:'inherit' };
const segBtnPu = { ...segBtn, background:'linear-gradient(135deg,#7B5CC8,#5B3FA0)', color:'#fff', borderColor:'transparent' };
const segOk = { background:'#E3F4E6', border:'1.5px solid #9FD3A4', borderRadius:10, padding:'8px 10px', fontSize:12.5, fontWeight:800, color:'#1D4D25' };
const segLbl = { fontSize:11, fontWeight:900, letterSpacing:'.06em', textTransform:'uppercase', color:'#8a7f6a' };
function segFirst(s) { return String((window.JUCUM_SEG ? window.JUCUM_SEG.sName(s) : (s && s.fullName)) || '').split(' ')[0]; }

/* Datos de la nube con recarga al volver a la pestaña (de un material) y cuando un botón cambia un set */
function useSegFacts(o) {
  const S = window.JUCUM_SEG;
  const ids = (o.ids || []).map(String).sort(), groups = (o.groups || []).map(String).sort();
  const on = !!S && o.on !== false && ids.length > 0;
  const key = ids.join(',') + '|' + groups.join(',') + '|' + (o.since || '') + '|' + (on ? 1 : 0);
  const req = { ids, groups, since: o.since, ttl: o.ttl };
  const [st, setSt] = React.useState(() => ({ F: on ? S.peek(req) : null, err: null, busy: on, key }));
  const last = React.useRef(0), alive = React.useRef(true);
  React.useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const run = React.useCallback((force) => {
    if (!on) { setSt({ F: null, err: null, busy: false, key }); return; }
    last.current = Date.now();
    setSt(s => ({ ...s, busy: true }));
    S.load({ ...req, force: !!force }).then(F => { if (alive.current) setSt({ F, err: null, busy: false, key }); }, e => { if (alive.current) setSt(s => ({ F: s.key === key ? s.F : null, err: e, busy: false, key })); });
  }, [key]);
  React.useEffect(() => { if (st.key !== key) setSt({ F: on ? S.peek(req) : null, err: null, busy: on, key }); run(false); }, [run]);
  React.useEffect(() => {
    const again = () => { if (document.visibilityState === 'visible' && Date.now() - last.current > 15000) run(true); };
    const chg = () => run(false);
    /* P3 · SEG-REFRESCO-V1 (30-oct): con la pantalla a la vista se vuelve a traer de la nube cada minuto */
    const iv = setInterval(() => { if (document.visibilityState === 'visible' && Date.now() - last.current > 55000) run(true); }, 60000);
    window.addEventListener('focus', again); document.addEventListener('visibilitychange', again); window.addEventListener('jucum-seg-change', chg);
    return () => { clearInterval(iv); window.removeEventListener('focus', again); document.removeEventListener('visibilitychange', again); window.removeEventListener('jucum-seg-change', chg); };
  }, [run]);
  return { F: st.key === key ? st.F : null, err: st.err, busy: st.busy, reload: () => run(true) };
}

function SegAgo({ F, busy, err, onReload }) {
  const [, tick] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => { const iv = setInterval(tick, 30000); return () => clearInterval(iv); }, []);
  const min = F ? Math.floor((Date.now() - F.at) / 60000) : null;
  return (
    <span style={{display:'inline-flex', alignItems:'center', gap:7, fontSize:11.5, fontWeight:800, color: err && F ? '#A15C00' : '#8a7f6a'}}>
      {busy ? 'Actualizando…' : err && F ? '⚠ No pude actualizar · muestro lo de hace ' + Math.max(1, min) + ' min' : min == null ? '' : min < 1 ? 'Actualizado recién' : 'Actualizado hace ' + min + ' min'}
      <button type="button" onClick={onReload} disabled={busy} title="Volver a traer de la nube" aria-label="Actualizar" style={{border:'1.5px solid #DDD3BE', background:'#fff', borderRadius:8, padding:'3px 9px', fontWeight:900, fontSize:13, cursor: busy ? 'default' : 'pointer', fontFamily:'inherit', color:'#5B3FA0', opacity: busy ? .5 : 1}}>↻</button>
    </span>);
}

/* Marca dibujada: ok ✓ · no × · half (medio círculo) · run/fut (aro) */
function SegMark({ k, size }) {
  const z = size || 20, base = { width:z, height:z, borderRadius:'50%', flexShrink:0, display:'inline-flex', alignItems:'center', justifyContent:'center', boxSizing:'border-box', fontWeight:900, lineHeight:1, fontSize:z * 0.6, color:'#fff' };
  if (k === 'ok') return <span style={{...base, background:'#2EA84B'}}>✓</span>;
  if (k === 'no') return <span style={{...base, background:'#E53935', fontSize:z * 0.75}}>×</span>;
  if (k === 'half') return <span style={{...base, border:'2px solid #E0A62E', background:'linear-gradient(90deg,#F0A93B 50%,#fff 50%)'}}></span>;
  if (k === 'run') return <span style={{...base, border:'2.5px solid #F0A93B', background:'#FFF8E8'}}></span>;
  return <span style={{...base, border:'2px dashed #D8D4C8', background:'#fff'}}></span>;
}

function segCellView(c, closed) {
  const S = window.JUCUM_SEG, f = S.fmtDay;
  if (c.s === 'ok') return { k:'ok', txt: c.sc != null ? c.sc + ' %' : 'hecha' };
  if (c.s === 'low') return { k:'half', txt: c.sc + ' % · no aprobó' };
  if (c.s === 'late') return { k:'half', txt: 'la hizo tarde · ' + f(c.d) };
  if (c.s === 'prev') return { k: closed ? 'no' : 'fut', txt: 'la hizo antes del set · ' + f(c.d) };
  if (c.s === 'mod') return { k: closed ? 'no' : 'fut', txt: 'hizo la de otro módulo (' + (c.wm || []).map(w => w.name).join(', ') + ')' };
  return { k: closed ? 'no' : 'fut', txt: closed ? 'no la hizo' : 'pendiente' };
}

function SegItem({ x }) {
  const S = window.JUCUM_SEG, st = SEG_ST[x.state] || SEG_ST.fut, t = S.today();
  const lb = x.state === 'run' ? 'En curso · ' + S.endsTxt(x.to, t) : x.state === 'fut' ? 'Empieza el ' + S.fmtDay(x.from) : st.lb;
  const when = x.kind === 'task'
    ? 'cierre: ' + S.fmtDay(x.to) + ' · ' + new Date(x.due).toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit' })
    : (x.from === x.to ? 'el ' + S.fmtDay(x.from) : 'del ' + S.fmtDay(x.from) + ' al ' + S.fmtDay(x.to)) + ' · ' + x.done + ' de ' + x.total + ' hecha' + (x.total === 1 ? '' : 's');
  const mk = x.state === 'ok' ? 'ok' : x.state === 'no' ? 'no' : x.state === 'half' ? 'half' : x.state === 'run' ? 'run' : 'fut';
  return (
    <div style={{border:'1px solid #EEE7D6', borderRadius:12, background:'#fff', padding:'10px 11px', display:'flex', flexDirection:'column', gap:7}}>
      <div style={{display:'flex', alignItems:'flex-start', gap:8, flexWrap:'wrap'}}>
        <span style={{flex:1, minWidth:150}}>
          <b style={{display:'block', fontSize:13.5, lineHeight:1.3}}>{x.kind === 'task' ? '📋 Tarea · ' : '📝 '}{x.title}</b>
          <small style={{fontSize:11.5, color:'#8a7f6a', fontWeight:700}}>{when}</small>
        </span>
        <span style={{display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:900, borderRadius:8, padding:'3px 8px', background:st.bg, color:st.fg, border:'1px solid ' + st.bd, whiteSpace:'nowrap'}}><SegMark k={mk} size={12} />{lb}</span>
      </div>
      {x.kind === 'set' ? x.cells.map(c => { const v = segCellView(c, x.phase === 'closed'); return (
        <div key={c.k} style={{display:'flex', gap:8, alignItems:'center', fontSize:12.5, fontWeight:700}}>
          <SegMark k={v.k} />
          <span style={{flex:1, minWidth:0}}>{c.carried ? '↪ ' : ''}{c.name}</span>
          <span style={{fontWeight:900, fontSize:12, whiteSpace:'nowrap', color: v.k === 'ok' ? '#2E7D32' : v.k === 'no' ? '#C62828' : v.k === 'half' ? '#8A5A00' : '#8a7f6a'}}>{v.txt}</span>
        </div>); }) : (
        <div style={{display:'flex', gap:8, alignItems:'center', fontSize:12.5, fontWeight:700}}><SegMark k={mk} /><span style={{flex:1}}>{x.note}</span></div>
      )}
    </div>);
}

function segSinceStudent(y, m) {
  const S = window.JUCUM_SEG, ms = y + '-' + String(m + 1).padStart(2, '0') + '-01', d45 = S.addD(S.today(), -45);
  return ms < d45 ? ms : d45;
}

/* ⭐ 3A · Calendario del mes (alumno y ficha del profesor) */
function MiSeguimiento({ student, teacher }) {
  const S = window.JUCUM_SEG;
  const t = S ? S.today() : '2000-01-01';
  const [cur, setCur] = React.useState(() => ({ y: +t.slice(0, 4), m: +t.slice(5, 7) - 1 }));
  const [sel, setSel] = React.useState(null);
  const since = S ? segSinceStudent(cur.y, cur.m) : '';
  const seg = useSegFacts({ ids: student ? [student.id] : [], groups: student && student.group ? [student.group] : [], since });
  if (!S || !student) return null;
  const F = seg.F;
  const mKey = cur.y + '-' + String(cur.m + 1).padStart(2, '0');
  const items = F ? S.studentItems(student, F).filter(x => String(x.day).slice(0, 7) === mKey) : [];
  const byDay = {}; items.forEach(x => { (byDay[x.day] = byDay[x.day] || []).push(x); });
  const worst = (arr) => arr.reduce((w, x) => (SEG_RANK[x.state] || 0) > (SEG_RANK[w] || 0) ? x.state : w, null);
  const cnt = (k) => items.filter(x => x.state === k).length;
  const days = Object.keys(byDay).sort();
  const selDay = sel && sel.slice(0, 7) === mKey ? sel : (byDay[t] ? t : (days.filter(d => d <= t).pop() || days[0] || null));
  const first = new Date(cur.y, cur.m, 1), off = (first.getDay() + 6) % 7, nd = new Date(cur.y, cur.m + 1, 0).getDate();
  const cells = []; for (let i = 0; i < off; i++) cells.push(null); for (let d = 1; d <= nd; d++) cells.push(mKey + '-' + String(d).padStart(2, '0'));
  const go = (k) => { setSel(null); setCur(c => { const d = new Date(c.y, c.m + k, 1); return { y: d.getFullYear(), m: d.getMonth() }; }); };
  const nav = { width:34, height:34, borderRadius:10, border:'1.5px solid #E3DCC9', background:'#fff', fontWeight:900, fontSize:16, cursor:'pointer', fontFamily:'inherit', color:'#4A3A10' };
  const who = teacher ? segFirst(student) : null;
  const selList = selDay ? (byDay[selDay] || []) : [];
  return (
    <div style={{display:'flex', flexDirection:'column', gap:12}}>
      <div style={{display:'flex', alignItems:'center', gap:10, flexWrap:'wrap'}}>
        <div className="sec-title" style={{flex:1, minWidth:180}}>📅 {teacher ? 'Seguimiento de ' + who : 'Mi seguimiento'}</div>
        <SegAgo F={F} busy={seg.busy} err={seg.err} onReload={seg.reload} />
      </div>
      <div style={{fontSize:12.5, color:'#6b6453', fontWeight:700, textWrap:'pretty'}}>{teacher ? 'Las prácticas y tareas que se le dejaron: si las cumplió y su nota. Es lo mismo que ve el alumno.' : 'Las prácticas y tareas que te dejaron: si las cumpliste y tu nota.'}</div>
      {!F ? (
        <div style={{border:'1px dashed #E3DCC9', borderRadius:14, padding:'26px 14px', textAlign:'center', fontWeight:800, fontSize:13.5, color:'#8a7f6a', display:'flex', flexDirection:'column', gap:10, alignItems:'center'}}>
          {seg.err ? <><span>No pude traer {teacher ? 'su' : 'tu'} seguimiento de la nube. Revisa el internet.</span><button type="button" onClick={seg.reload} style={segBtn}>↻ Reintentar</button></> : <span>Cargando {teacher ? 'su' : 'tu'} seguimiento…</span>}
        </div>
      ) : (
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap:16, alignItems:'start'}}>
          <div style={{display:'flex', flexDirection:'column', gap:10, maxWidth:460}}>
            <div style={{display:'flex', alignItems:'center', gap:10}}>
              <button type="button" onClick={() => go(-1)} style={nav} aria-label="Mes anterior">‹</button>
              <div style={{flex:1, textAlign:'center', fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:17}}>{SEG_MONTHS[cur.m]} {cur.y}</div>
              <button type="button" onClick={() => go(1)} style={nav} aria-label="Mes siguiente">›</button>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(3, minmax(0,1fr))', gap:6}}>
              {[['ok', 'cumplida', '#2E7D32'], ['half', 'a medias', '#A15C00'], ['no', 'no cumplida', '#C62828']].map(([k, l, c]) => { const n = cnt(k); return (
                <div key={k} style={{background:'#fff', border:'1px solid #EEE7D6', borderRadius:12, padding:'7px 4px', textAlign:'center'}}>
                  <b style={{display:'block', fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:21, lineHeight:1.1, color:c}}>{n}</b>
                  <span style={{fontSize:11, fontWeight:800, color:'#6b6453'}}>{l}{n === 1 ? '' : 's'}</span>
                </div>); })}
            </div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(7, minmax(0,1fr))', gap:4}}>
              {['L','M','M','J','V','S','D'].map((d, i) => <div key={'h' + i} style={{fontSize:10.5, fontWeight:900, color:'#8a7f6a', textAlign:'center'}}>{d}</div>)}
              {cells.map((d, i) => {
                if (!d) return <div key={'e' + i}></div>;
                const w = byDay[d] ? worst(byDay[d]) : null, s = w ? SEG_ST[w] : null, isSel = d === selDay;
                const mk = w === 'ok' ? 'ok' : w === 'no' ? 'no' : w === 'half' ? 'half' : w === 'run' ? 'run' : w ? 'fut' : null;
                return (
                  <button type="button" key={d} onClick={() => setSel(d)} aria-label={d + (s ? ' · ' + s.lb : '')} style={{aspectRatio:'1', minHeight:38, borderRadius:9, background: s ? s.bg : '#fff', border:'1px solid ' + (s ? s.bd : '#EEE7D6'), fontSize:11.5, fontWeight:800, color: s ? s.fg : '#9a917d', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2, cursor:'pointer', fontFamily:'inherit', padding:0,
                    boxShadow: d === t ? '0 0 0 2px #1F3A8A' : 'none', outline: isSel ? '2px solid #E65100' : 'none', outlineOffset:1}}>
                    {+d.slice(8)}{mk && <SegMark k={mk} size={11} />}
                  </button>);
              })}
            </div>
            <div style={{display:'flex', gap:10, flexWrap:'wrap', fontSize:11, fontWeight:800, color:'#6b6453'}}>
              <span style={{display:'inline-flex', alignItems:'center', gap:4}}><SegMark k="ok" size={11} />cumplida</span>
              <span style={{display:'inline-flex', alignItems:'center', gap:4}}><SegMark k="half" size={11} />a medias</span>
              <span style={{display:'inline-flex', alignItems:'center', gap:4}}><SegMark k="run" size={11} />en curso</span>
              <span style={{display:'inline-flex', alignItems:'center', gap:4}}><SegMark k="no" size={11} />no cumplida</span>
            </div>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            <span style={segLbl}>{selDay ? (() => { const x = window.JUCUM_DAY.parse(selDay); return ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][x.getDay()] + ' ' + x.getDate() + ' de ' + SEG_MONTHS[x.getMonth()].toLowerCase(); })() : SEG_MONTHS[cur.m]}</span>
            {!items.length ? <div style={{fontSize:13, fontWeight:700, color:'#8a7f6a'}}>{teacher ? 'Este mes no se le dejaron prácticas ni tareas.' : 'Este mes no te dejaron prácticas ni tareas.'}</div>
              : !selList.length ? <div style={{fontSize:13, fontWeight:700, color:'#8a7f6a'}}>{teacher ? 'Ese día no tenía práctica ni tarea.' : 'Ese día no tenías práctica ni tarea.'} Toca un día con color.</div>
              : selList.map(x => <SegItem key={x.kind + x.id} x={x} />)}
            <div style={{fontSize:11.5, fontWeight:700, color:'#8a7f6a', textWrap:'pretty'}}>Cada práctica sale en su primer día; cada tarea, en el día que cierra. Cumplida = todas sus actividades hechas entre su primer y su último día, y aprobadas las que tienen nota.</div>
          </div>
        </div>
      )}
    </div>);
}
function StudentSeguimiento({ student, onBack }) {
  return (
    <main>
      <button className="back-btn" onClick={onBack}>← Volver al panel</button>
      <div className="scard" style={{marginTop:6}}><MiSeguimiento student={student} /></div>
    </main>);
}

/* 🚨 2B · alerta roja fija en Inicio del alumno */
function SegAlarmCard({ student, onGo }) {
  const S = window.JUCUM_SEG;
  const since = S ? S.addD(S.today(), -45) : '';
  const seg = useSegFacts({ ids: student ? [student.id] : [], groups: student && student.group ? [student.group] : [], since });
  const [, tick] = React.useReducer(x => x + 1, 0);
  const al = seg.F && S ? S.alarmFor(student, seg.F, Date.now()) : null;
  React.useEffect(() => { const iv = setInterval(tick, al ? 1000 : 60000); return () => clearInterval(iv); }, [!!al]);
  if (!al) return null;
  const s = Math.max(0, Math.floor((S.endMs(al.to) - Date.now()) / 1000));
  const cd = Math.floor(s / 3600) + ':' + String(Math.floor(s % 3600 / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  return (
    <div role="alert" className="seg-alarm" style={{borderRadius:16, padding:'14px 15px', display:'flex', flexDirection:'column', gap:9, background:'#C62828', color:'#fff', boxShadow:'0 0 0 3px #FFCDD2', marginBottom:16}}>
      <span style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:19, lineHeight:1.2}}>🚨 ¡Tu práctica se cierra!</span>
      <span style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:34, lineHeight:1, fontVariantNumeric:'tabular-nums'}}>{cd}</span>
      <span style={{fontSize:13.5, fontWeight:800, lineHeight:1.4, textWrap:'pretty'}}>«{al.title}» cierra {al.to === S.today() ? 'hoy' : 'mañana'} a las 11:59 pm. Si no la haces, queda como <b>NO CUMPLIDA</b>.</span>
      <span style={{fontSize:13, fontWeight:700, background:'rgba(255,255,255,.14)', borderRadius:10, padding:'8px 10px', display:'flex', flexDirection:'column', gap:4}}>
        {al.missing.map(c => <span key={c.k}>× {c.name}{c.s === 'low' ? ' · sube tu nota (tienes ' + c.sc + ' %)' : ''}</span>)}
      </span>
      <button type="button" onClick={onGo} style={{border:0, borderRadius:12, background:'#fff', color:'#C62828', fontWeight:900, fontSize:15, padding:12, minHeight:46, cursor:'pointer', fontFamily:'inherit'}}>Hacerla ahora · {al.minLeft} min</button>
    </div>);
}

/* B · etiqueta en la fila del set (calendario) */
function segGroupReq(plan) {
  const S = window.JUCUM_SEG, r = S && plan ? S.range(plan) : null;
  const ids = r && S.assigned(plan) ? S.groupStudents(plan.groupId, null).map(s => s.id) : [];
  const d45 = S ? S.addD(S.today(), -45) : '';
  return { ids, groups: [], since: r && r.from < d45 ? r.from : d45 };
}
function SegSetChip({ plan }) {
  const S = window.JUCUM_SEG;
  const seg = useSegFacts(segGroupReq(plan));
  if (!seg.F || !S) return null;
  const live = (seg.F.plans || []).find(x => x.id === plan.id) || plan;
  const c = S.chipOf(S.evalGroupSet(live, seg.F));
  if (!c) return null;
  return <span title="Alumnos que completaron todo el set" style={{...SEG_TONE[c.tone], fontSize:11.5, fontWeight:900, borderRadius:10, padding:'3px 9px', whiteSpace:'nowrap'}}>{c.txt}</span>;
}

/* C · 🔔 Recordar a los que faltan (texto editable, campanita solo a ellos) */
function SegRemindBox({ G, onCancel }) {
  const S = window.JUCUM_SEG;
  const [txt, setTxt] = React.useState(() => S.remindText(G));
  const [sent, setSent] = React.useState(null);
  const miss = G.missingRows.length;
  if (sent != null) return <div style={segOk}>✓ Recordatorio enviado a {sent} alumno{sent === 1 ? '' : 's'} por la campanita.</div>;
  return (
    <div style={{display:'flex', flexDirection:'column', gap:7, width:'100%'}}>
      <span style={segLbl}>Mensaje para {miss === 1 ? 'el que falta' : 'los ' + miss + ' que faltan'}</span>
      <textarea value={txt} onChange={e => setTxt(e.target.value)} rows={3} style={{width:'100%', font:"700 13px 'Nunito',sans-serif", border:'1.5px solid #DDD3BE', borderRadius:10, padding:'8px 10px', resize:'vertical', color:'#2A2A2A', boxSizing:'border-box'}} />
      <span style={{fontSize:11.5, fontWeight:700, color:'#8a7f6a'}}>A cada uno se le agrega lo que le falta. Le llega a su campanita.</span>
      <div style={{display:'flex', gap:7, flexWrap:'wrap'}}>
        <button type="button" disabled={!txt.trim()} onClick={() => setSent(S.remind(G, txt.trim()))} style={segBtnPu}>Enviar a {miss}</button>
        <button type="button" onClick={onCancel} style={segBtn}>Cancelar</button>
      </div>
    </div>);
}
/* C · ⏳ Extender con los días que ella elija (reemplaza «＋ 2 días») */
function SegExtendBox({ G, onCancel, onDone }) {
  const S = window.JUCUM_SEG;
  const [sel, setSel] = React.useState(2), [custom, setCustom] = React.useState(''), [avisar, setAvisar] = React.useState(true), [ok, setOk] = React.useState(null);
  const base = G.to, to = custom || S.addD(base, sel), n = S.diff(base, to), miss = G.missingRows.length;
  const pill = (on) => ({ border:'1.5px solid ' + (on ? '#5B3FA0' : '#D9CEEC'), background: on ? '#5B3FA0' : '#fff', color: on ? '#fff' : '#4A2F8A', borderRadius:18, padding:'7px 13px', fontWeight:800, fontSize:13, cursor:'pointer', fontFamily:'inherit' });
  if (ok) return <div style={segOk}>✓ Listo. Los alumnos lo ven hasta el {S.fmtDay(ok)}.</div>;
  return (
    <div style={{display:'flex', flexDirection:'column', gap:9, width:'100%'}}>
      <b style={{fontSize:13.5}}>⏳ Extender «{G.title}»</b>
      <span style={{fontSize:12, fontWeight:700, color:'#8a7f6a'}}>{G.phase === 'closed' ? 'Cerró el ' : 'Hoy cierra el '}{S.fmtDay(base)}.</span>
      <div style={{display:'flex', gap:7, flexWrap:'wrap', alignItems:'center'}}>
        {[1, 2, 3, 5].map(x => <button type="button" key={x} onClick={() => { setSel(x); setCustom(''); }} style={pill(!custom && sel === x)}>＋{x} {x === 1 ? 'día' : 'días'}</button>)}
        <span style={{fontSize:12, fontWeight:700, color:'#8a7f6a'}}>u otra fecha:</span>
        <input type="date" value={custom} min={S.addD(base, 1)} onChange={e => setCustom(e.target.value)} style={{font:"800 13px 'Nunito',sans-serif", border:'1.5px solid #D9CEEC', borderRadius:10, padding:'6px 8px', color:'#2A2A2A'}} />
      </div>
      {n > 0 ? <span style={{fontSize:13, fontWeight:800}}>Quedará abierto hasta el <b>{S.fmtDay(to)}</b> ({n} {n === 1 ? 'día' : 'días'} más).</span>
        : <span style={{fontSize:12.5, fontWeight:700, color:'#B23A2A'}}>Elige una fecha posterior al {S.fmtDay(base)}.</span>}
      <div style={{display:'flex', gap:10, flexWrap:'wrap', alignItems:'center'}}>
        <button type="button" disabled={n <= 0} onClick={() => { if (S.extend(G, to, avisar && miss > 0)) { setOk(to); if (onDone) onDone(); } else alert('No se pudo extender. Inténtalo de nuevo.'); }} style={{...segBtnPu, opacity: n > 0 ? 1 : .5}}>Extender</button>
        {miss > 0 && <label style={{display:'flex', gap:6, alignItems:'center', fontSize:12.5, fontWeight:700, color:'#4A3A10', cursor:'pointer'}}><input type="checkbox" checked={avisar} onChange={e => setAvisar(e.target.checked)} /> Avisar a los que faltan por la campanita</label>}
        <button type="button" onClick={onCancel} style={segBtn}>Cancelar</button>
      </div>
    </div>);
}

/* E · cierre del set (día siguiente: en el calendario y en Inicio) */
function SegCloseCard({ plan, onTrack, onSeen, compact }) {
  const S = window.JUCUM_SEG;
  const seg = useSegFacts(segGroupReq(plan));
  const [res, setRes] = React.useState(null);
  if (!seg.F || !S) return null;
  const live = (seg.F.plans || []).find(x => x.id === plan.id) || plan;
  const G = S.evalGroupSet(live, seg.F);
  if (!G || G.phase !== 'closed' || !G.n) return null;
  const nx = S.nextSetOf(live, seg.F.plans);
  const carried = res || (live.carriedTo ? { next: (seg.F.plans || []).find(x => x.id === live.carriedTo) || { title: 'el próximo set' }, n: live.carriedN } : null);
  const pass = () => {
    if (!nx) return;
    const k = G.missingRows.length;
    if (!window.confirm('¿Pasar lo que les faltó a ' + k + ' alumno' + (k === 1 ? '' : 's') + ' al set «' + nx.title + '» (desde el ' + S.fmtDay(S.range(nx).from) + ')?\n\nSolo ellos lo verán en su práctica.')) return;
    const r = S.carryToNext(G, seg.F.plans); if (r) setRes(r); else alert('No se pudo pasar. Inténtalo de nuevo.');
  };
  return (
    <div style={{border: compact ? '1px solid #E6E1D3' : '1.5px solid #E3DCC9', borderRadius:12, padding: compact ? '10px 12px' : '11px 12px', display:'flex', flexDirection:'column', gap: compact ? 7 : 8, background: compact ? '#fff' : '#FFFDF8', marginBottom: compact ? 0 : 8}}>
      {compact ? <>
        <b style={{fontSize:13.5, lineHeight:1.3}}>🏁 {String(G.title || '').replace(/^📌\s*/, '')} · {G.full} de {G.n} lo completaron</b>
        {G.missingRows.length ? <span style={{fontSize:12.5, fontWeight:700, color:'#6b6453'}}>Faltaron: <b style={{color:'#7A2A1E'}}>{G.missingRows.map(x => segFirst(x.st)).join(', ')}</b></span> : <span style={{fontSize:12.5, fontWeight:800, color:'#2E7D32'}}>¡Todos lo completaron!</span>}
      </> : <>
      <b style={{fontSize:13.5}}>🏁 Terminó «{G.title}»{G.group ? ' · ' + G.group.name : ''} · {G.full} de {G.n} lo completaron</b>
      {G.missingRows.length ? <>
        <span style={{fontSize:12.5, fontWeight:700, color:'#6b6453'}}>No lo terminaron:</span>
        <div style={{display:'flex', flexWrap:'wrap', gap:5}}>{G.missingRows.map(x => <span key={x.st.id} title={x.ev.missing.map(c => c.name).join(' · ')} style={{background:'#FDECEA', color:'#7A2A1E', borderRadius:9, padding:'3px 9px', fontSize:12, fontWeight:800}}>{segFirst(x.st)}</span>)}</div>
      </> : <span style={{fontSize:12.5, fontWeight:800, color:'#2E7D32'}}>¡Todos lo completaron!</span>}
      </>}
      <div style={{display:'flex', gap:7, flexWrap:'wrap', alignItems:'center'}}>
        {G.missingRows.length > 0 && (carried ? <span style={segOk}>✓ Lo pendiente pasó a «{carried.next.title}»{carried.n != null ? ' · ' + carried.n + ' alumno' + (carried.n === 1 ? '' : 's') : ''}</span>
          : nx ? <button type="button" onClick={pass} style={segBtnPu}>➡ Pasar lo pendiente al próximo set</button>
          : <span style={{fontSize:12, fontWeight:700, color:'#8a7f6a'}}>Para pasar lo pendiente, primero crea el próximo set del grupo.</span>)}
        {onTrack && <button type="button" onClick={() => onTrack(live)} style={segBtn}>Ver avance final</button>}
        {onSeen && <button type="button" onClick={onSeen} style={segBtn}>{compact ? '✓ Listo' : '✓ Entendido'}</button>}
      </div>
    </div>);
}

/* A · avisos en Inicio del profesor (solo los sets que necesitan atención) + E */
function SegAttentionCard() {
  const S = window.JUCUM_SEG, TT = window.JUCUM_TT, D = window.JUCUM_DATA;
  const fin = (gid) => !!(window.JUCUM_GRAD && window.JUCUM_GRAD.isFinished && window.JUCUM_GRAD.isFinished(gid));
  const plans = S && TT ? S.relevantPlans(TT.getPracticePlans()) : [];
  const gids = [...new Set(plans.map(p => p.groupId))].filter(g => (D.GROUPS || []).some(x => x.id === g) && !fin(g)).sort();
  const ids = S ? gids.flatMap(g => S.groupStudents(g, null).map(s => s.id)) : [];
  const seg = useSegFacts({ ids, groups: [], since: S ? S.sinceFor(plans) : '' });
  const [track, setTrack] = React.useState(null), [rem, setRem] = React.useState(null), [, bump] = React.useReducer(x => x + 1, 0);
  const modal = track && window.PracticeSetProgress ? <PracticeSetProgress plan={track} onClose={() => setTrack(null)} /> : null;
  if (!seg.F || !S) return modal;
  const Gs = S.relevantPlans(seg.F.plans).filter(p => gids.includes(p.groupId)).map(p => S.evalGroupSet(p, seg.F)).filter(G => G && G.n);
  const ORD = { end:0, none:1, most:2 };
  const alerts = Gs.map(G => ({ G, al: S.alertOf(G) })).filter(x => x.al).sort((a, b) => ORD[a.al.k] - ORD[b.al.k] || (a.G.to < b.G.to ? -1 : 1));
  const closes = Gs.filter(G => G.phase === 'closed' && !S.seenClose(G.plan.id));
  if (!alerts.length && !closes.length) return modal;
  const CARD = { amb:{ background:'#FFF5E1', border:'1.5px solid #F0C66B', color:'#5A3A00' }, red:{ background:'#FDECEA', border:'1.5px solid #F2B8AE', color:'#7A2A1E' } };
  const t = S.today();
  return (
    <div className="scard" style={{marginTop:16, display:'flex', flexDirection:'column', gap:9}}>
      <div style={{display:'flex', alignItems:'center', gap:10, flexWrap:'wrap'}}>
        <div className="sec-title" style={{flex:1}}>📊 Prácticas que necesitan atención</div>
        <SegAgo F={seg.F} busy={seg.busy} err={seg.err} onReload={seg.reload} />
      </div>
      {alerts.map(({ G, al }) => { const miss = G.missingRows.length, remToday = G.plan.remindedAt && window.JUCUM_DAY.of(G.plan.remindedAt) === t; return (
        <div key={G.plan.id} style={{...CARD[al.card], display:'flex', gap:10, alignItems:'center', borderRadius:12, padding:'10px 11px', flexWrap:'wrap'}}>
          <span style={{fontSize:20, flexShrink:0}}>{al.ic}</span>
          <span style={{flex:1, minWidth:180, fontSize:13, fontWeight:700, lineHeight:1.35}}>
            <b style={{display:'block', fontSize:13.5, fontWeight:900}}>{al.t} · {G.group ? G.group.name : ''}</b>
            «{G.title}» · {G.full} de {G.n} completos{G.none ? ' · ' + G.none + ' sin empezar' : ''}{remToday ? ' · ✓ ya les recordaste hoy' : ''}
          </span>
          {miss > 0 && <button type="button" onClick={() => setRem(rem === G.plan.id ? null : G.plan.id)} style={segBtnPu}>🔔 Recordar a {miss}</button>}
          <button type="button" onClick={() => setTrack(G.plan)} style={segBtn}>Ver avance</button>
          {rem === G.plan.id && <div style={{flexBasis:'100%'}}><SegRemindBox G={G} onCancel={() => setRem(null)} /></div>}
        </div>); })}
      {closes.map(G => <SegCloseCard key={'c' + G.plan.id} plan={G.plan} onTrack={setTrack} onSeen={() => { S.markSeenClose(G.plan.id); bump(); }} />)}
      {modal}
    </div>);
}

/* SEG-GRUPO-V1 (28-oct, pedido de la usuaria): los avisos ya NO van en Inicio. Se revisan dentro del grupo con el
 * botón «📊 Prácticas» (fila de herramientas de GroupWorkspace). Una línea por set, sin repetir el grupo ni las fechas,
 * y los sets duplicados (mismo título y mismas fechas) se muestran una sola vez. Cálculo = JUCUM_SEG, igual que antes. */
function segGroupPlans(S, plans, gid) {
  const by = {};
  S.relevantPlans(plans || []).filter(p => p.groupId === gid).forEach(p => {
    const r = S.range(p); if (!r) return;
    const k = String(p.title || '').trim() + '|' + r.from + '|' + r.to, o = by[k];
    if (!o || String(p.savedAt || p.createdAt || '') > String(o.savedAt || o.createdAt || '')) by[k] = p;
  });
  return Object.values(by);
}
function segGroupReqAll(gid) {
  const S = window.JUCUM_SEG, TT = window.JUCUM_TT;
  if (!S || !TT || !gid) return { ids: [], groups: [], since: '' };
  return { ids: S.groupStudents(gid, null).map(s => s.id), groups: [], since: S.sinceFor(segGroupPlans(S, TT.getPracticePlans(), gid)) };
}
function segGroupSummary(S, F, gid) {
  const Gs = segGroupPlans(S, F.plans, gid).map(p => S.evalGroupSet(p, F)).filter(G => G && G.n);
  const ORD = { end:0, none:1, most:2 };
  const open = Gs.filter(G => G.phase === 'open').map(G => ({ G, al: S.alertOf(G) }))
    .sort((a, b) => (a.al ? ORD[a.al.k] : 9) - (b.al ? ORD[b.al.k] : 9) || (a.G.to < b.G.to ? -1 : 1));
  const closes = Gs.filter(G => G.phase === 'closed' && !S.seenClose(G.plan.id)).sort((a, b) => (a.to > b.to ? -1 : 1));
  return { open, closes, alerts: open.filter(x => x.al).length, need: open.filter(x => x.al).length + closes.length };
}
/* Botón de la fila de herramientas del grupo (mismo estilo gw-tw) */
function SegGroupPracBtn({ groupId, onOpen }) {
  const S = window.JUCUM_SEG;
  const seg = useSegFacts(segGroupReqAll(groupId));
  const sm = seg.F && S ? segGroupSummary(S, seg.F, groupId) : null;
  const first = sm && sm.open.find(x => x.al);
  const sub = !sm ? (seg.err ? 'sin conexión' : 'cargando…') : first ? first.al.ic + ' ' + first.al.t.toLowerCase() + (sm.need > 1 ? ' · +' + (sm.need - 1) : '')
    : sm.closes.length ? '🏁 ' + sm.closes.length + ' terminó' + (sm.closes.length === 1 ? '' : 'ron') : sm.open.length ? sm.open.length + ' en curso · van bien' : 'sin prácticas en curso';
  return (
    <button type="button" className="gw-tw" onClick={onOpen}>
      <span className="gw-ti">📊</span><span><b>Prácticas</b><small>{sub}</small></span>
      {sm && sm.need > 0 ? <span className="gw-bd" title={sm.need + ' práctica' + (sm.need === 1 ? '' : 's') + ' para revisar'}>{sm.need}</span> : null}
    </button>);
}
/* Ventana «Prácticas del grupo» */
function SegGroupPractice({ groupId }) {
  const S = window.JUCUM_SEG;
  const seg = useSegFacts(segGroupReqAll(groupId));
  const [track, setTrack] = React.useState(null), [rem, setRem] = React.useState(null), [, bump] = React.useReducer(x => x + 1, 0);
  const modal = track && window.PracticeSetProgress ? <PracticeSetProgress plan={track} onClose={() => setTrack(null)} /> : null;
  if (!S) return null;
  if (!seg.F) return <div style={{padding:16, fontSize:13, fontWeight:700, color:'#8a7f6a'}}>{seg.err ? 'No se pudo leer la nube. ' : 'Cargando de la nube…'}{seg.err && <button type="button" onClick={seg.reload} style={segBtn}>Reintentar</button>}</div>;
  const sm = segGroupSummary(S, seg.F, groupId), t = S.today();
  const TAG = { red:{ background:'#FDECEA', color:'#B23A2A' }, amb:{ background:'#FFE9B8', color:'#7A4A00' }, grn:{ background:'#E3F4E6', color:'#2E7D32' } };
  const row = { background:'#fff', border:'1px solid #E6E1D3', borderRadius:12, padding:'10px 12px', display:'flex', flexDirection:'column', gap:7 };
  const titleOf = (G) => String(G.title || '').replace(/^📌\s*/, '');
  const datesOf = (G) => /→/.test(G.title || '') ? '' : S.fmtDay(G.from) + ' → ' + S.fmtDay(G.to) + ' · ';
  return (
    <div style={{display:'flex', flexDirection:'column', gap:10}}>
      <div style={{display:'flex', alignItems:'center', gap:8}}><span style={{...segLbl, flex:1}}>En curso</span><SegAgo F={seg.F} busy={seg.busy} err={seg.err} onReload={seg.reload} /></div>
      {!sm.open.length && <div style={{fontSize:13, fontWeight:700, color:'#8a7f6a'}}>No hay prácticas abiertas en este grupo.</div>}
      {sm.open.map(({ G, al }) => { const miss = G.missingRows.length, pct = Math.round(G.full / G.n * 100), remToday = G.plan.remindedAt && window.JUCUM_DAY.of(G.plan.remindedAt) === t;
        const tag = al ? { tone: al.tone, txt: al.ic + ' ' + al.t } : { tone: 'grn', txt: '✓ Va bien · ' + S.endsTxt(G.to, t) };
        return (
        <div key={G.plan.id} style={row}>
          <div style={{display:'flex', alignItems:'flex-start', gap:8, flexWrap:'wrap'}}>
            <b style={{flex:1, minWidth:180, fontSize:13.5, lineHeight:1.3}}>{titleOf(G)}</b>
            <span style={{...TAG[tag.tone], borderRadius:8, padding:'3px 9px', fontSize:11.5, fontWeight:900, whiteSpace:'nowrap'}}>{tag.txt}</span>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:9}}>
            <div style={{flex:1, height:7, borderRadius:4, background:'#EEE9DD', overflow:'hidden'}}><i style={{display:'block', height:'100%', width:pct + '%', background: pct >= 70 ? '#2EA84B' : pct >= 40 ? '#F0A93B' : '#E53935'}}></i></div>
            <span style={{fontSize:12, fontWeight:800, color:'#4A4A4A', whiteSpace:'nowrap'}}>{G.full} de {G.n}</span>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:7, flexWrap:'wrap'}}>
            <span style={{flex:1, minWidth:160, fontSize:12, fontWeight:700, color:'#8a7f6a'}}>{datesOf(G)}{G.none ? G.none + ' sin empezar' : 'todos empezaron'}{remToday ? ' · ✓ recordado hoy' : ''}</span>
            {miss > 0 && <button type="button" onClick={() => setRem(rem === G.plan.id ? null : G.plan.id)} style={{...segBtnPu, padding:'6px 11px', fontSize:12}}>🔔 Recordar a {miss}</button>}
            <button type="button" onClick={() => setTrack(G.plan)} style={{...segBtn, padding:'6px 11px', fontSize:12}}>Ver avance</button>
          </div>
          {rem === G.plan.id && <SegRemindBox G={G} onCancel={() => setRem(null)} />}
        </div>); })}
      {sm.closes.length > 0 && <span style={{...segLbl, marginTop:4}}>Terminaron</span>}
      {sm.closes.map(G => <SegCloseCard key={'c' + G.plan.id} plan={G.plan} compact onTrack={setTrack} onSeen={() => { S.markSeenClose(G.plan.id); bump(); }} />)}
      {modal}
    </div>);
}

Object.assign(window, { SegGroupPracBtn, SegGroupPractice, segGroupPlans, useSegFacts, segGroupReq, SegAgo, SegMark, MiSeguimiento, StudentSeguimiento, SegAlarmCard, SegSetChip, SegRemindBox, SegExtendBox, SegCloseCard, SegAttentionCard });
