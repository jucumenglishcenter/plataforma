/* 🔎 SEGUIMIENTO-AREAS-V1 (31-oct-2026 · aprobado en «Propuesta - Seguimiento por area - A1 8-20.html»)
 * Un botón «🔎 Seguimiento» en el perfil del grupo (reemplaza «Práctica de hoy» y «Prácticas») y el mismo panel
 * dentro del ▶ Modo clase (solo 🏫 En clase + 🏠 Práctica del teacher). Áreas separadas, una a la vez:
 *  · 🏠 Práctica del teacher: anillo por set (hecho a tiempo / pedidos; lo que ya tenía aprobado no se pide) ·
 *    ventana por estado con Cuándo + Nota · «debe repetirlo» si no aprobó.
 *  · 🔁 Repaso por su cuenta: meta diaria DEL GRUPO (dailyTargetMin) · tocar el anillo = día por día, cualquier tema.
 *  · 🏫 En clase: materiales de plataforma del plan hechos ESE día · «¡Completó!» (hacerlo, no aprobarlo) arriba
 *    por orden de llegada, con título (🦌 🐘 👑 🦉) · ventana con notas.
 *  · 📝 Tareas: quién entregó · visor dentro de la plataforma (respuestas ✓/✗, texto, audio, foto, PDF con PDF.js)
 *    · «Mi tarea» / «Comparar lado a lado» · calificar y pasar al siguiente.
 *  · 📤 Reporte para tu Claude (día elegido + áreas).
 * Datos: JUCUM_SEG (nube, la MISMA evalSet del 📊 Avance) + daily_sessions (minutos y hora) + submissions/assignments al abrir.
 * Solo LEE, salvo «Guardar» de una tarea (gradeSubmissionDb + campanita). */
const SA_STEP = { o:'#43A047', p:'#C8E6C9', l:'#FB8C00', x:'#F2C14E', n:'#E53935', f:'#C9C3B3' };
const SA_LBL = { o:'A tiempo', x:'Fuera de fecha', l:'Nota baja · debe repetirlo', n:'No lo hizo', f:'Pendiente', p:'Ya lo tenía aprobado' };
const SA_DOW = ['dom','lun','mar','mié','jue','vie','sáb'], SA_MON = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
function saDay(s, mon) { if (!s) return ''; const d = new Date(String(s).slice(0, 10) + 'T12:00:00'); return SA_DOW[d.getDay()] + ' ' + d.getDate() + (mon ? ' ' + SA_MON[d.getMonth()] : ''); }
function saHour(iso) { if (!iso) return ''; const d = new Date(Date.parse(iso) - 5 * 3600e3); const h = d.getUTCHours(); return (h % 12 || 12) + ':' + String(d.getUTCMinutes()).padStart(2, '0') + (h < 12 ? ' am' : ' pm'); }
function saPeru(iso) { return iso ? new Date(Date.parse(iso) - 5 * 3600e3).toISOString().slice(0, 10) : ''; }
function saPct(v) { return typeof v === 'number' && isFinite(v) ? Math.round(v > 1 ? v : v * 100) : null; }
function saFind(mid, aid) { const cat = (window.JUCUM_DATA || {}).MODULE_CATALOG || {}; for (const lv of Object.keys(cat)) { const m = (cat[lv] || []).find(x => x.id === mid); if (m) { const a = (m.activities || []).find(x => x.id === aid); return { mod: m, a }; } } return null; }
function saName(k) { const i = k.lastIndexOf(':'), f = saFind(k.slice(0, i), k.slice(i + 1)); if (!f || !f.a) return k.slice(i + 1); const g = f.a.type === 'grammar' && f.a.group ? ' ' + String(f.a.group).split(' ·')[0] : ''; return f.a.name.replace('Stories y Diálogos · ', 'Story · ').replace('Identification', 'Identify') + g; }
function saTopic(k) { const i = k.lastIndexOf(':'), f = saFind(k.slice(0, i), k.slice(i + 1)); return f ? (f.a && f.a.group ? String(f.a.group).split(' ·')[0] + ' · ' : '') + (f.mod.name || '') : ''; }
function saRest(path) { const c = window.JUCUM_CONFIG || {}; if (!c.SUPABASE_URL) return Promise.reject(new Error('sin nube')); return fetch(c.SUPABASE_URL + '/rest/v1/' + path, { headers: { apikey: c.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + c.SUPABASE_ANON_KEY } }).then(r => r.ok ? r.json() : Promise.reject(new Error('nube ' + r.status))); }
const saEsc = s => String(s == null ? '' : s);

/* minutos por día + hora de cada material (daily_sessions.updated_at) */
function useSaDaily(ids, since) {
  const key = ids.join(',') + '|' + since;
  const [st, setSt] = React.useState({ key: '', mins: {}, upd: {} });
  React.useEffect(() => { if (!ids.length) return; let off = false;
    const load = () => saRest('daily_sessions?select=user_id,day,module_id,activity_id,minutes,updated_at&user_id=in.(' + ids.join(',') + ')&day=gte.' + since + '&limit=10000').then(rows => {
      if (off) return; const mins = {}, upd = {};
      rows.forEach(r => { const u = String(r.user_id), d = String(r.day); (mins[u] = mins[u] || {})[d] = ((mins[u] || {})[d] || 0) + (r.minutes || 0); (upd[u] = upd[u] || {})[d + '|' + r.module_id + ':' + r.activity_id] = r.updated_at; });
      setSt({ key, mins, upd }); }, () => {});
    load(); const iv = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 60000);
    return () => { off = true; clearInterval(iv); }; }, [key]);
  return st.key === key ? st : { mins: {}, upd: {}, loading: true };
}

/* PDF.js para ver los PDF dentro de la plataforma (igual en computadora y celular) */
let SA_PDFJS = null;
function saPdfLib() { if (SA_PDFJS) return SA_PDFJS; SA_PDFJS = new Promise((ok, ko) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'; s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; ok(window.pdfjsLib); }; s.onerror = ko; document.head.appendChild(s); }); return SA_PDFJS; }
function SaPdf({ src }) {
  const ref = React.useRef(null); const [z, setZ] = React.useState(1); const [err, setErr] = React.useState(false);
  React.useEffect(() => { let off = false; const box = ref.current; if (!box || !src) return; box.innerHTML = '<div class="sa-pmsg">Cargando el PDF…</div>';
    saPdfLib().then(lib => lib.getDocument(src).promise).then(doc => { if (off) return; box.innerHTML = ''; const w = Math.max(240, box.clientWidth - 28), dpr = window.devicePixelRatio || 1; let ch = Promise.resolve();
      for (let i = 1; i <= doc.numPages; i++) ch = ch.then(() => doc.getPage(i).then(pg => { if (off) return; const sc = (w / pg.getViewport({ scale: 1 }).width) * z; const vp = pg.getViewport({ scale: sc * dpr }); const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; c.style.width = (vp.width / dpr) + 'px'; const lb = document.createElement('div'); lb.className = 'sa-ppg'; lb.textContent = 'Página ' + i + ' de ' + doc.numPages; box.appendChild(lb); box.appendChild(c); return pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; }));
    }).catch(() => { if (!off) setErr(true); }); return () => { off = true; }; }, [src, z]);
  if (err) return <div className="sa-pmsg">No se pudo mostrar el PDF aquí. <a href={src} target="_blank" rel="noopener">Abrir en pestaña nueva</a></div>;
  return <div className="sa-pdfw"><div className="sa-zoom"><button type="button" aria-label="Alejar" onClick={() => setZ(v => Math.max(.5, v - .25))}>－</button><b>{Math.round(z * 100)}%</b><button type="button" aria-label="Acercar" onClick={() => setZ(v => Math.min(3, v + .25))}>＋</button></div><div ref={ref} className="sa-pdf"></div></div>;
}
function SaImg({ src, alt }) {
  const [r, setR] = React.useState(0), [z, setZ] = React.useState(1);
  return <div className="sa-imgw"><div className="sa-zoom"><button type="button" aria-label="Girar" onClick={() => setR(v => v + 90)}>↻</button><button type="button" aria-label="Alejar" onClick={() => setZ(v => Math.max(.5, v - .25))}>－</button><b>{Math.round(z * 100)}%</b><button type="button" aria-label="Acercar" onClick={() => setZ(v => Math.min(3, v + .25))}>＋</button></div><div className="sa-img"><img src={src} alt={alt} style={{ transform: 'rotate(' + r + 'deg) scale(' + z + ')' }} /></div></div>;
}
/* 📝 WORD-LECTURA-V1: los .docx se muestran como vista de lectura (mammoth.js convierte el texto y sus formatos básicos) */
let SA_MAMMOTH = null;
function saMammoth() { if (SA_MAMMOTH) return SA_MAMMOTH; SA_MAMMOTH = new Promise((ok, ko) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js'; s.onload = () => ok(window.mammoth); s.onerror = ko; document.head.appendChild(s); }); return SA_MAMMOTH; }
function SaDocx({ f }) {
  const [html, setHtml] = React.useState(null), [err, setErr] = React.useState(false), [z, setZ] = React.useState(1);
  React.useEffect(() => { let off = false; setHtml(null); setErr(false);
    Promise.all([saMammoth(), fetch(f.url).then(r => r.ok ? r.arrayBuffer() : Promise.reject(new Error('no')))]).then(([m, buf]) => m.convertToHtml({ arrayBuffer: buf })).then(r => { if (!off) setHtml(String(r.value || '').replace(/<script[\s\S]*?<\/script>/gi, '')); }).catch(() => { if (!off) setErr(true); });
    return () => { off = true; }; }, [f.url]);
  if (err) return <div className="sa-file"><b>📝 {f.name}</b><div className="sa-mut">No se pudo leer este Word aquí.</div><a href={f.url} target="_blank" rel="noopener">Abrir en pestaña nueva</a></div>;
  return <div className="sa-pdfw"><div className="sa-zoom"><span style={{ flex: 1, color: '#C9D4F0', fontSize: 11, fontWeight: 800 }}>Vista de lectura · Word</span><button type="button" aria-label="Alejar" onClick={() => setZ(v => Math.max(.7, v - .15))}>－</button><b>{Math.round(z * 100)}%</b><button type="button" aria-label="Acercar" onClick={() => setZ(v => Math.min(2, v + .15))}>＋</button></div>
    <div className="sa-pdf">{html == null ? <div className="sa-pmsg">Abriendo el Word…</div> : <div className="sa-doc" style={{ fontSize: Math.round(15 * z) }} dangerouslySetInnerHTML={{ __html: html || '<p>(documento vacío)</p>' }}></div>}</div></div>;
}
function SaFile({ f, who }) {
  if (!f.url) return <div className="sa-warn">⚠ <b>{f.name || 'Archivo'}</b>{f.size ? ' (' + Math.round(f.size / 1024) + ' KB)' : ''} no llegó a la nube: no se puede ver. Pídele que lo vuelva a subir.</div>;
  const k = f.kind || '', nm = String(f.name || '').toLowerCase();
  if (k === 'audio' || /\.(webm|mp3|m4a|ogg|wav)$/.test(nm)) return <div className="sa-file"><b>🎧 {f.name}</b><audio controls src={f.url} style={{ width: '100%', marginTop: 6 }}></audio></div>;
  if (k === 'image' || /\.(jpe?g|png|gif|webp|heic)$/.test(nm)) return <SaImg src={f.url} alt={'Tarea de ' + who} />;
  if (k === 'pdf' || /\.pdf$/.test(nm)) return <SaPdf src={f.url} />;
  if (/\.docx$/.test(nm) || /officedocument\.wordprocessing/.test(String(f.type || ''))) return <SaDocx f={f} />;
  return <div className="sa-file"><b>📝 {f.name}</b><div className="sa-mut">Este tipo de archivo no se puede mostrar dentro de la plataforma.</div><a href={f.url} target="_blank" rel="noopener">Abrir en pestaña nueva</a></div>;
}
function SaRing({ ok, tot, open, label }) {
  const pct = tot ? ok / tot : 1, col = pct === 1 ? '#43A047' : open ? '#5B3FA0' : pct >= .5 ? '#FB8C00' : '#E53935';
  return <span className="sa-ring" style={{ background: 'conic-gradient(' + col + ' ' + Math.round(pct * 360) + 'deg,#EFEBE1 0)' }}><span>{label != null ? label : tot ? ok + '/' + tot : '✓'}</span></span>;
}
function SaPop({ title, sub, onClose, wide, head, children }) {
  React.useEffect(() => { const h = e => { if (e.key === 'Escape') onClose(); }; document.addEventListener('keydown', h); return () => document.removeEventListener('keydown', h); }, [onClose]);
  return <div className="sa-ov" onClick={onClose}><div className={'sa-pop' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
    <header><b>{title}<small>{sub}</small></b>{head}<button type="button" className="sa-x" aria-label="Cerrar" onClick={onClose}>✕</button></header>{children}</div></div>;
}
function SaRows({ rows, grouped }) {
  const line = (r, i) => <div className="sa-pi" key={i}><i style={r.c === 'n' || r.c === 'f' ? { background: '#fff', boxShadow: 'inset 0 0 0 1.5px ' + SA_STEP[r.c] } : { background: SA_STEP[r.c] }}></i><span className="m">{r.m}</span><span className="w">{r.s}</span><span className={'g' + (r.bad ? ' bad' : '')}>{r.nota != null ? r.nota : r.chk ? <span className="sa-chk">✓</span> : ''}</span></div>;
  if (!grouped) return <>{rows.length ? <div className="sa-pth"><span></span><span>Material</span><span>Cuándo</span><span>Nota</span></div> : null}{rows.map(line)}</>;
  return <><div className="sa-pth"><span></span><span>Material</span><span>Cuándo</span><span>Nota</span></div>{['o', 'x', 'l', 'n', 'f', 'p'].map(c => { const rs = rows.filter(r => r.c === c); return rs.length ? <React.Fragment key={c}><div className="sa-ph">{SA_LBL[c]} · {rs.length}</div>{rs.map(line)}</React.Fragment> : null; })}</>;
}

/* ── 🏠 Práctica del teacher ── */
function saCode(c, open) { if (c.s === 'ok') return 'o'; if (c.s === 'low') return 'l'; if (c.s === 'late' || c.s === 'mod') return 'x'; if (c.s === 'prev') return 'p'; return open ? 'f' : 'n'; }
function saSets(F, gid, t) {
  const S = window.JUCUM_SEG; const by = {};
  (F.plans || []).filter(p => p && !p._deleted && p.groupId === gid && S.assigned(p)).forEach(p => { const r = S.range(p); if (!r || r.from > t || r.to < S.addD(t, -28)) return; const k = r.from + '|' + (p.title || ''); const sp = String(p.savedAt || p.updatedAt || ''); if (!by[k] || sp > String(by[k].savedAt || by[k].updatedAt || '')) by[k] = p; });
  return Object.values(by).sort((a, b) => S.range(a).from.localeCompare(S.range(b).from)).slice(-5);
}
function saSetTitle(p) { const m = String(p.title || '').match(/Sesi[oó]n\s*\d+/i); return m ? m[0].replace('Sesion', 'Sesión') : (p.title || 'Práctica').split('·')[0].replace('📌', '').trim().slice(0, 22); }
function SaPractice({ F, studs, t, onPop }) {
  const S = window.JUCUM_SEG; const sets = saSets(F, studs.gid, t);
  if (!sets.length) return <div className="sa-empty">No hay sets de práctica en las últimas 4 semanas.</div>;
  const items = (p, st) => { const ev = S.evalSet(p, st, F, t); const r = S.range(p), open = t <= r.to; return ev ? ev.cells.map(c => ({ c: saCode(c, open), m: c.name, d: c.d, sc: c.sc })) : []; };
  const sit = st => { let miss = 0, late = 0; const low = [], mn = {}; sets.forEach(p => { if (t <= S.range(p).to) return; items(p, st).forEach(x => { if (x.c === 'n') { miss++; mn[x.m] = 1; } if (x.c === 'x') late++; if (x.c === 'l') low.push(x.m + ' ' + x.sc); }); });
    const cur = sets[sets.length - 1], curOpen = t <= S.range(cur).to, cl = curOpen ? items(cur, st).filter(x => x.c === 'f').length : 0; const o = [];
    if (!miss && !late && !low.length) o.push(<span key="a" className="ok">Cumple los sets a tiempo</span>);
    if (miss) o.push(<React.Fragment key="b"><b>No hizo {miss}</b> ({Object.keys(mn).slice(0, 2).join(', ')}{Object.keys(mn).length > 2 ? '…' : ''})</React.Fragment>);
    if (late) o.push(<React.Fragment key="c">{late >= 4 ? <><b>Suele hacerlo tarde</b>: </> : null}{late} fuera de fecha</React.Fragment>);
    if (low.length) o.push(<React.Fragment key="d"><b>Debe repetir</b>: {low.join(', ')}</React.Fragment>);
    if (curOpen) o.push(<React.Fragment key="e">Set actual: {cl ? 'le falta' + (cl === 1 ? '' : 'n') + ' ' + cl : 'listo'}</React.Fragment>);
    return o.map((x, i) => <React.Fragment key={i}>{i ? ' · ' : ''}{x}</React.Fragment>); };
  return <table className="sa-t"><thead><tr><th>Alumno</th>{sets.map(p => { const r = S.range(p); return <th key={p.id}>{saSetTitle(p)}<small>{saDay(r.from)} → {saDay(r.to)}</small></th>; })}<th className="l">Situación</th></tr></thead>
    <tbody>{studs.list.map(st => <tr key={st.id}><td className="nm">{st.fullName || st.username}</td>{sets.map(p => { const it = items(p, st), r = S.range(p), open = t <= r.to; const pend = it.filter(x => x.c !== 'p'), ok = pend.filter(x => x.c === 'o').length, had = it.length - pend.length;
      return <td key={p.id}><button type="button" className="sa-cell" onClick={() => onPop({ title: (st.fullName || '') + ' · ' + saSetTitle(p), sub: 'Práctica para casa · ' + saDay(r.from, 1) + ' → ' + saDay(r.to, 1) + (open ? ' · en curso' : ''),
        sum: <>{pend.length ? ok + ' de ' + pend.length + ' pedidos hechos a tiempo' : 'Nada pedido'}{had ? ' · ' + had + ' ya lo tenía aprobado' : ''}{it.some(x => x.c === 'l') ? <div className="sa-stu"><span>Le aparece en su inicio</span><div>🔁 Vuelve a hacer «{it.find(x => x.c === 'l').m}» para subir tu nota · tu nota nueva se guarda 30 min después de tu último intento</div></div> : null}</>,
        rows: it.map(x => ({ c: x.c, m: x.m, s: x.c === 'o' ? saDay(x.d) : x.c === 'x' ? 'después: ' + saDay(x.d) : x.c === 'l' ? '🔁 debe repetirlo' : x.c === 'p' ? 'antes del set' : x.c === 'f' ? 'aún tiene tiempo' : '—', nota: x.c === 'n' || x.c === 'f' ? null : x.sc, bad: x.c === 'l', chk: (x.c === 'o' || x.c === 'x' || x.c === 'p') && x.sc == null })), grouped: true })}>
        <SaRing ok={ok} tot={pend.length} open={open} /></button></td>; })}<td className="sit">{sit(st)}</td></tr>)}</tbody></table>;
}

/* ── 🔁 Repaso por su cuenta ── */
function SaReview({ F, studs, t, daily, goal, onPop }) {
  const S = window.JUCUM_SEG; const days = []; for (let i = 13; i >= 0; i--) days.push(S.addD(t, -i));
  const sets = (F.plans || []).filter(p => p && !p._deleted && p.groupId === studs.gid && S.assigned(p));
  const inSet = (d, k) => sets.some(p => { const r = S.range(p); return d >= r.from && d <= r.to && (p.activities || []).some(a => a.moduleId + ':' + a.activityId === k); });
  return <table className="sa-t"><thead><tr><th>Alumno</th><th>Meta diaria<small>{goal} min · 14 días</small></th><th>Día por día<small>{saDay(days[0])} → {saDay(t)}</small></th><th>Promedio<small>min por día</small></th><th className="l">Situación</th></tr></thead>
    <tbody>{studs.list.map(st => { const u = String(st.id), mi = daily.mins[u] || {}, dact = (F.dayAct || {})[u] || {}, prog = (F.prog || {})[u] || {};
      const k = days.filter(d => (mi[d] || 0) >= goal).length, avg = Math.round(days.reduce((a, d) => a + (mi[d] || 0), 0) / 14);
      const own = []; days.forEach(d => Object.keys(dact[d] || {}).forEach(key => { const own2 = !inSet(d, key); own.push({ d, key, own: own2 }); }));
      const ownO = own.filter(x => x.own), od = {}; ownO.forEach(x => { od[x.d] = 1; });
      const low = {}; ownO.forEach(x => { const f = saFind(x.key.slice(0, x.key.lastIndexOf(':')), x.key.slice(x.key.lastIndexOf(':') + 1)); const sc = prog[x.key] ? saPct(prog[x.key].score) : null; if (f && f.a && /grammar|reading|listening/.test(f.a.type) && sc != null && sc < studs.thr) low[x.key] = 1; });
      const nl = Object.keys(low).length;
      const open = () => onPop({ kind: 'review', st, days, mi, own, prog, goal });
      return <tr key={st.id}><td className="nm">{st.fullName || st.username}</td>
        <td><button type="button" className="sa-cell" onClick={open}><SaRing ok={k} tot={14} label={k + '/14'} open={false} /></button></td>
        <td><div className="sa-days">{days.map(d => { const v = mi[d] || 0; return <i key={d} className={v >= goal ? 'ok' : v ? 'lo' : ''} title={saDay(d) + ': ' + v + ' min'}></i>; })}</div></td>
        <td className="sa-avg">{avg}<small> min</small></td>
        <td className="sit">{k >= 10 ? <span className="ok">Cumple su meta casi todos los días</span> : k >= 5 ? 'Cumple su meta ' + k + ' de 14 días' : k ? <b>Cumple su meta solo {k} de 14 días</b> : <b>No llegó a la meta ningún día</b>}{' · '}{ownO.length ? 'repasó por su cuenta ' + Object.keys(od).length + ' días' : <b>no repasa por su cuenta</b>}{nl ? <> · <b>{nl} material{nl > 1 ? 'es' : ''} con nota baja</b></> : null}</td></tr>; })}</tbody></table>;
}
function SaReviewPop({ p, thr, onClose }) {
  const [only, setOnly] = React.useState(true); const { st, days, mi, own, prog, goal } = p;
  const list = own.filter(x => !only || x.own); const ok = days.filter(d => (mi[d] || 0) >= goal).length;
  return <SaPop title={'Repaso de ' + (st.fullName || '')} sub={'Día por día · ' + saDay(days[0], 1) + ' → ' + saDay(days[13], 1) + ' · meta ' + goal + ' min'} onClose={onClose}>
    <div className="sa-sum">Cumplió la meta {ok} de 14 días · promedio {Math.round(days.reduce((a, d) => a + (mi[d] || 0), 0) / 14)} min/día</div>
    <div className="sa-fl"><button type="button" className={only ? 'on' : ''} onClick={() => setOnly(true)}>Solo lo que repasó por su cuenta</button><button type="button" className={only ? '' : 'on'} onClick={() => setOnly(false)}>Todo lo que abrió</button></div>
    {days.slice().reverse().map(d => { const it = list.filter(x => x.d === d), v = mi[d] || 0; if (!it.length && !v) return null;
      return <React.Fragment key={d}><div className="sa-dayh"><b>{saDay(d, 1)}</b><span style={{ color: v >= goal ? '#2E7D32' : v ? '#7A4A00' : '#8a7f6a' }}>{v} de {goal} min{v >= goal ? ' ✓' : ''}</span></div>
        {it.length ? it.map((x, i) => { const sc = prog[x.key] ? saPct(prog[x.key].score) : null; const f = saFind(x.key.slice(0, x.key.lastIndexOf(':')), x.key.slice(x.key.lastIndexOf(':') + 1)); const g = f && f.a && /grammar|reading|listening/.test(f.a.type);
          return <div className="sa-pi" key={i}><i style={{ background: x.own ? '#1F3A8A' : '#C9D4F0' }}></i><span className="m">{saName(x.key)}</span><span className="w">{saTopic(x.key)}{x.own ? '' : ' · del set'}</span><span className={'g' + (g && sc != null && sc < thr ? ' bad' : '')}>{g && sc != null ? sc : <span className="sa-chk">✓</span>}</span></div>; })
          : <div className="sa-pi"><span className="m sa-mut">{only ? 'Solo hizo lo del set ese día' : '—'}</span></div>}</React.Fragment>; })}
  </SaPop>;
}

/* ── 🏫 En clase ── */
function saClasses(gid, t) { const TT = window.JUCUM_TT; if (!TT) return []; const by = {}; TT.getClassPlans().filter(p => p.groupId === gid && p.date && p.date <= t && !p._deleted).forEach(p => { const s = String(p.savedAt || p.updatedAt || p.createdAt || ''); if (!by[p.date] || s > String(by[p.date].savedAt || by[p.date].updatedAt || by[p.date].createdAt || '')) by[p.date] = p; }); return Object.values(by).sort((a, b) => a.date.localeCompare(b.date)).slice(-6); }
function saMats(plan) { const out = []; const add = m => { if (!m || !m.activityId) return; const k = (m.moduleId || plan.moduleId) + ':' + m.activityId; if (!out.some(x => x.k === k)) out.push({ k, m: saName(k) }); }; (plan.blocks || []).forEach(b => (b.mats || []).forEach(add)); (plan.materials || []).forEach(add); return out; }
function saTitle(st, rank, best, quiz) { if (rank === 0) return ['🦌', 'Veloz como una gacela', 'fue quien terminó primero']; if (best != null && best >= 95) return ['👑', 'Corona de la gramática', 'nota ' + best + ' en el resumen']; if (quiz) return ['🐘', 'Memoria de elefante', 'dominó el vocabulario']; return ['🦉', 'Mente de búho', 'terminó toda la clase']; }
function SaClass({ F, studs, t, daily, date, setDate, onPop }) {
  const A = window.JUCUM_ATT; const cls = saClasses(studs.gid, t); if (!cls.length) return <div className="sa-empty">Este grupo aún no tiene clases guardadas.</div>;
  const ci = Math.max(0, cls.findIndex(p => p.date === date)) , c = cls.findIndex(p => p.date === date) >= 0 ? cls[ci] : cls[cls.length - 1], idx = cls.indexOf(c);
  const mats = saMats(c), att = A ? A.getDay(c.date) : {}, other = (c.blocks || []).filter(b => !(b.mats || []).length && !/cierre/i.test(b.title || '')).map(b => b.title);
  const rows = studs.list.map(st => { const u = String(st.id), da = ((F.dayAct || {})[u] || {})[c.date] || {}; const ab = att[st.id] && att[st.id].status === 'falto'; const it = mats.map(x => !!da[x.k]); const done = !ab && mats.length && it.every(Boolean);
    const fin = done ? Math.max(...mats.map(x => Date.parse(((daily.upd[u] || {})[c.date + '|' + x.k]) || 0) || 0)) : 0; return { st, ab, it, done, fin }; });
  const done = rows.filter(r => r.done).sort((a, b) => (a.fin || 9e15) - (b.fin || 9e15)), rest = rows.filter(r => !r.done);
  const nota = (st, k) => { const e = ((F.prog || {})[String(st.id)] || {})[k]; return e ? saPct(e.score) : null; };
  const popFor = (r, tt) => onPop({ title: (tt ? tt[0] + ' ' : '') + (r.st.fullName || '') + (tt ? ' · ¡Completó!' : ' · ' + saDay(c.date, 1)), sub: saDay(c.date, 1) + (c.sessionLabel ? ' · ' + c.sessionLabel : '') + (tt ? ' · ' + tt[1] : ''),
    sum: r.ab ? 'Faltó a esta clase' : tt ? <>Terminó todo lo de la clase{r.fin ? ' a las ' + saHour(new Date(r.fin).toISOString()) : ''} · {tt[2]}</> : <>{r.it.filter(Boolean).length} de {mats.length} hechos{other.length ? <div className="sa-mut" style={{ marginTop: 4 }}>Sin material de plataforma: {other.join(' · ')} (se registra en 📋 Evaluar la clase)</div> : null}</>,
    rows: r.ab ? [] : mats.map((x, j) => { const nt = r.it[j] ? nota(r.st, x.k) : null; const grd = /:(g\d|t\d)/.test(x.k); return { c: r.it[j] ? 'o' : 'n', m: x.m, s: r.it[j] ? 'en clase' : 'no lo hizo', nota: grd ? nt : null, chk: r.it[j] && !grd, bad: grd && nt != null && nt < studs.thr }; }), grouped: !tt });
  return <>
    <div className="sa-cnav"><button type="button" className="sa-btn" disabled={!idx} onClick={() => setDate(cls[idx - 1].date)}>‹ {idx ? saDay(cls[idx - 1].date, 1) : ''}</button><span className="sa-cur">{saDay(c.date, 1)}{c.sessionLabel ? ' · ' + c.sessionLabel : ''}</span><button type="button" className="sa-btn" disabled={idx >= cls.length - 1} onClick={() => setDate(cls[idx + 1].date)}>{idx < cls.length - 1 ? saDay(cls[idx + 1].date, 1) : ''} ›</button><span className="sa-cnt">🏆 {done.length} de {rows.length} completaron</span></div>
    {!mats.length ? <div className="sa-empty">Esta clase no tiene materiales de plataforma.</div> :
    <table className="sa-t"><thead><tr><th>Alumno</th>{mats.map(x => <th key={x.k}>{x.m.replace(/^Story · .*/, 'Story').replace(/^Quizlet · .*/, 'Quizlet')}</th>)}<th className="l">Estado</th></tr></thead>
    <tbody>{done.map((r, i) => { const sums = mats.filter(x => /:sum-/.test(x.k)).map(x => nota(r.st, x.k)).filter(v => v != null); const tt = saTitle(r.st, i, sums.length ? Math.max(...sums) : null, mats.some(x => /quizlet/.test(x.k)));
      return <tr key={r.st.id} className="sa-done" style={{ animationDelay: (i * .15) + 's' }}><td className="nm"><span className="sa-pos">{i + 1}</span>{r.st.fullName}</td>{mats.map(x => <td key={x.k}><i className="sa-d o"></i></td>)}<td><button type="button" className="sa-win" onClick={() => popFor(r, tt)}><span className="em">{tt[0]}</span><span><b>¡Completó!</b>{r.fin ? ' · ' + saHour(new Date(r.fin).toISOString()) : ''}<small>{tt[1]}</small></span></button></td></tr>; })}
      {rest.map(r => { const left = r.it.filter(v => !v).length; return <tr key={r.st.id}><td className="nm">{r.st.fullName}</td>{r.ab ? <td colSpan={mats.length}><span className="sa-abs">faltó</span></td> : r.it.map((v, j) => <td key={j}><i className={'sa-d ' + (v ? 'o' : 'n')}></i></td>)}<td><button type="button" className="sa-cell" style={{ justifyContent: 'flex-start' }} onClick={() => popFor(r, null)}><span className="sa-txt">{r.ab ? 'no vino' : 'le falta' + (left === 1 ? '' : 'n') + ' ' + left}</span></button></td></tr>; })}</tbody></table>}
    {other.length ? <div className="sa-src am">✍ Sin material de plataforma: {other.join(' · ')}. Esto se registra con <b>📋 Evaluar la clase</b>.</div> : null}
  </>;
}

/* ── 📝 Tareas ── */
function saTasks(F, gid, t) { const S = window.JUCUM_SEG; return (F.tasks || []).filter(x => x.groupId === gid && x.dueAt && saPeru(x.dueAt) >= S.addD(t, -28) && saPeru(x.dueAt) <= S.addD(t, 14)).sort((a, b) => a.dueAt.localeCompare(b.dueAt)).slice(-6); }
function saTState(tk, st, F, thr) { const s = ((F.subs || {})[String(st.id)] || {})[tk.id]; const past = Date.now() > Date.parse(tk.dueAt); if (tk.targets && tk.targets.length && tk.targets.indexOf(String(st.id)) < 0) return { c: 'na' };
  if (!s) return past ? { c: 'n' } : { c: 'f' }; const late = s.at && Date.parse(s.at) > Date.parse(tk.dueAt); const g = s.grade;
  if (g == null) return { c: 'r', late, s }; return g >= thr ? { c: 'o', g, late, s } : { c: 'l', g, late, s }; }
function SaTasks({ F, studs, t, onTask }) {
  const tks = saTasks(F, studs.gid, t); if (!tks.length) return <div className="sa-empty">No hay tareas en las últimas 4 semanas.</div>;
  const cell = x => { const m = { o: ['ok', '✓ ' + x.g], l: ['lo', '! ' + x.g], r: ['rv', '👀 revisar'], n: ['nx', '✗'], f: ['no', ''], na: ['no', '—'] }[x.c]; return <span className={'sa-pc ' + m[0]}>{m[1]}{x.late ? <em> tarde</em> : null}</span>; };
  const sit = st => { const due = tks.filter(k => Date.now() > Date.parse(k.dueAt)), xs = due.map(k => saTState(k, st, F, studs.thr)).filter(x => x.c !== 'na'); const gave = xs.filter(x => x.c !== 'n').length, lo = xs.filter(x => x.c === 'l').length, rv = xs.filter(x => x.c === 'r').length, lt = xs.filter(x => x.late).length;
    return <>{gave === xs.length ? <span className="ok">Entregó {gave} de {xs.length}</span> : 'Entregó ' + gave + ' de ' + xs.length}{lo ? <> · <b>{lo} sin aprobar</b></> : null}{rv ? ' · ' + rv + ' por revisar' : ''}{lt ? ' · ' + lt + ' tarde' : ''}</>; };
  return <table className="sa-t"><thead><tr><th>Alumno</th>{tks.map(k => <th key={k.id}>{k.title.replace(/^Step \d:\s*/, '').replace(/ · Practice.*$/, '').slice(0, 30)}<small>vence {saDay(saPeru(k.dueAt), 1)}</small></th>)}<th className="l">Situación</th></tr></thead>
    <tbody>{studs.list.map(st => <tr key={st.id}><td className="nm">{st.fullName}</td>{tks.map(k => { const x = saTState(k, st, F, studs.thr); return <td key={k.id}><button type="button" className="sa-cell" disabled={x.c === 'na'} onClick={() => onTask(k, st)}>{cell(x)}</button></td>; })}<td className="sit">{sit(st)}</td></tr>)}
      <tr className="sa-tot"><td>Entregaron</td>{tks.map(k => { const who = studs.list.filter(st => ((F.subs || {})[String(st.id)] || {})[k.id]).length; return <td key={k.id} style={{ color: who / studs.list.length < .5 ? '#B23A2A' : '#2E7D32' }}>{who}/{studs.list.length}</td>; })}<td></td></tr></tbody></table>;
}
function saParseTask(desc) { let d = String(desc || ''); try { d = decodeURIComponent(d); } catch (e) {} const m = d.match(/JUCUM_TASK:(\{[\s\S]*\})\s*-->/); let spec = null; try { spec = m ? JSON.parse(m[1]) : null; } catch (e) {} return { ins: d.replace(/<!--[\s\S]*-->/, '').trim(), spec }; }
function SaTaskPop({ tk, st, studs, F, onClose, onMove }) {
  const [sub, setSub] = React.useState(null), [asg, setAsg] = React.useState(null), [mode, setMode] = React.useState('stu'), [fi, setFi] = React.useState(0), [gr, setGr] = React.useState(''), [fb, setFb] = React.useState(''), [saved, setSaved] = React.useState('');
  React.useEffect(() => { setSub(null); setFi(0); setGr(''); setFb(''); setSaved('');
    saRest('submissions?select=*&assignment_id=eq.' + encodeURIComponent(tk.id) + '&student_id=eq.' + st.id).then(r => { const s = (r || []).find(x => x.status !== 'draft') || null; setSub(s || false); if (s) { setGr(s.grade != null ? String(s.grade) : ''); setFb(s.feedback && !/^Nota registrada|^Revisamos|^Nota provisional|^Tu profe revis/.test(s.feedback) ? s.feedback : ''); } }, () => setSub(false));
    if (!asg || asg.id !== tk.id) saRest('assignments?select=id,description,attachments&id=eq.' + encodeURIComponent(tk.id)).then(r => setAsg((r || [])[0] || { id: tk.id }), () => setAsg({ id: tk.id })); }, [tk.id, st.id]);
  const who = studs.list.filter(s => ((F.subs || {})[String(s.id)] || {})[tk.id]), wi = who.findIndex(s => s.id === st.id);
  const T = asg ? saParseTask(asg.description) : { ins: '', spec: null }, ds = T.spec && T.spec.docset; let D = null; if (sub && sub.text && sub.text.indexOf('JUCUM_DOCSET:') === 0) { try { D = JSON.parse(sub.text.slice(13)); } catch (e) {} }
  const files = sub ? (sub.attachments || []).filter(a => a && a.kind !== 'audio') : [], auds = sub ? (sub.attachments || []).filter(a => a && a.kind === 'audio') : [], mine = (asg && asg.attachments) || [];
  const late = sub && Date.parse(sub.submitted_at) > Date.parse(tk.dueAt);
  const save = () => { const g = gr === '' ? null : Math.max(0, Math.min(100, Number(gr))); const SY = window.JUCUM_SYNC; if (!SY || !SY.gradeSubmissionDb) { setSaved('Sin conexión'); return; }
    Promise.resolve(SY.gradeSubmissionDb(tk.id, String(st.id), { id: sub.id, grade: g, feedback: fb, gradedAt: new Date().toISOString(), submittedAt: sub.submitted_at, text: sub.text, attachments: sub.attachments })).then(r => {
      if (r && r.ok === false) { setSaved('No se pudo guardar'); return; }
      if (window.JUCUM_NOTIF) window.JUCUM_NOTIF.pushNotif(String(st.id), { type: 'teacher-feedback', title: '✅ Tarea calificada', body: (g != null ? 'Tu tarea recibió ' + g + '/100. ' : '') + 'Revisa la retroalimentación en Tareas.', link: 'tasks' });
      if (window.JUCUM_SEG) window.JUCUM_SEG.invalidate(); setSaved('✓ Guardado'); if (wi < who.length - 1) setTimeout(() => onMove(who[wi + 1]), 500); }); };
  const mineView = <div className="sa-mine"><div className="mh">📌 Lo que dejaste</div><div className="mi">{T.ins || (ds && ds.es) || 'Sin indicaciones escritas.'}</div>
    {ds && ds.items ? <ol className="mitems">{ds.items.map((it, i) => <li key={i}>{it.q} <em>({it.cue})</em><span>{it.key ? '→ ' + it.key : 'respuesta libre'}</span></li>)}</ol> : null}
    {mine.map((a, i) => <div key={i}><div className="mh" style={{ marginTop: 8 }}>📄 {a.name}</div><SaFile f={a} who="el teacher" /></div>)}</div>;
  const stuView = files.length ? <><div className="sa-vfiles">{files.map((a, k) => <button type="button" key={k} className={k === fi ? 'on' : ''} onClick={() => setFi(k)}>{a.kind === 'image' ? '📷' : /pdf/.test(a.kind + a.name) ? '📄' : '📝'} {a.name}</button>)}</div><SaFile f={files[Math.min(fi, files.length - 1)]} who={st.fullName} /></> : null;
  return <SaPop wide title={(st.fullName || '') + ' · ' + tk.title} sub={'📝 Tarea · vence ' + saDay(saPeru(tk.dueAt), 1) + ' · ' + saHour(tk.dueAt)} onClose={onClose}
    head={who.length > 1 && wi >= 0 ? <span className="sa-vnav"><button type="button" className="sa-btn" disabled={wi <= 0} onClick={() => onMove(who[wi - 1])}>‹</button><button type="button" className="sa-btn" disabled={wi >= who.length - 1} onClick={() => onMove(who[wi + 1])}>›</button></span> : null}>
    {sub === null ? <div className="sa-sum">Cargando la entrega…</div> : !sub ? <><div className="sa-sum">{Date.now() > Date.parse(tk.dueAt) ? 'No la entregó. Venció el ' + saDay(saPeru(tk.dueAt), 1) + '.' : 'Todavía no la entrega.'}</div><div className="sa-vbody one"><div className="sa-vview mine">{mineView}</div></div></> : <>
      <div className="sa-sum">Entregada el {saDay(saPeru(sub.submitted_at), 1)} · {saHour(sub.submitted_at)}{late ? <b style={{ color: '#B23A2A' }}> · tarde</b> : ' · a tiempo'}{sub.grade != null ? <> · nota <b style={{ color: sub.grade >= studs.thr ? '#2E7D32' : '#B23A2A' }}>{sub.grade}</b></> : <b style={{ color: '#5B3FA0' }}> · por revisar</b>}</div>
      {files.length ? <div className="sa-vmode"><span className="sa-seg">{[['stu', 'Su entrega'], ['mine', 'Mi tarea'], ['both', 'Comparar lado a lado']].map(([k, l]) => <button key={k} type="button" className={mode === k ? 'on' : ''} onClick={() => setMode(k)}>{l}</button>)}</span></div> : null}
      <div className={'sa-vbody' + (mode === 'both' && files.length ? ' both' : '')}>
        {files.length && mode !== 'stu' ? <div className="sa-vview mine">{mineView}</div> : null}
        <div className="sa-vview" style={files.length && mode === 'mine' ? { display: 'none' } : null}>
          {stuView}
          {ds && D ? <div className="sa-qa"><div className="sa-tins">{ds.es}</div>{ds.items.map((it, i) => { const r = (D.res || [])[i] || '', a = (D.ans || [])[i]; return <div className="q" key={i}><div className="qq"><span className="qn">{i + 1}</span>{it.q} <em>({it.cue})</em></div><div className="qr"><span className={'rk ' + (r === 'ok' ? 'ok' : r === 'bad' ? 'bad' : 'rv')}>{r === 'ok' ? '✓' : r === 'bad' ? '✗' : '👀'}</span><span className={'an' + (a == null ? ' none' : '')}>{a == null ? 'sin respuesta' : a}</span></div>{r === 'bad' && it.key ? <div className="qk">Esperada: {it.key}</div> : null}{(D.fb || [])[i] ? <div className="qk">{D.fb[i]}</div> : null}{r === 'rev' ? <div className="qk" style={{ color: '#5B3FA0' }}>La revisas tú (respuesta libre)</div> : null}</div>; })}</div> : null}
          {sub.text && !D ? <div className="sa-qa"><div className="sa-tins">Lo que escribió</div><div className="q"><span className="an">{sub.text}</span></div></div> : null}
          {auds.map((a, i) => <SaFile key={i} f={a} who={st.fullName} />)}
          {!sub.text && !(sub.attachments || []).length ? <div className="sa-mut" style={{ padding: 14 }}>Entregó sin texto ni archivo.</div> : null}
        </div>
        <div className="sa-vside"><b>Calificar</b><label>Nota (0 – 100)<input type="number" min="0" max="100" value={gr} onChange={e => setGr(e.target.value)} placeholder="ej. 85" /></label>
          <div className="sa-vq">{[100, 90, 80, 70].map(v => <button key={v} type="button" onClick={() => setGr(String(v))}>{v}</button>)}</div>
          <label>Comentario<textarea value={fb} onChange={e => setFb(e.target.value)} placeholder="ej. ¡Muy bien! Revisa la coma antes de «so»."></textarea></label>
          <button type="button" className="sa-save" onClick={save}>{saved || (wi >= 0 && wi < who.length - 1 ? 'Guardar y pasar al siguiente →' : 'Guardar')}</button><span className="sa-mut">La nota y el comentario le llegan a su campanita.</span></div>
      </div></>}
  </SaPop>;
}

/* ── 📤 Reporte para tu Claude ── */
function saReport(o) { const { F, studs, D, parts, daily, goal, group } = o; const S = window.JUCUM_SEG, A = window.JUCUM_ATT, L = [];
  L.push('SEGUIMIENTO DE ALUMNOS · ' + (group ? group.name + (group.schedule ? ' · ' + group.schedule : '') : '') + ' · ' + saDay(D, 1));
  L.push('Uso: pega esto en tu chat de Claude antes de planificar la próxima clase. Datos reales de la plataforma. Nota mínima: ' + studs.thr + ' · meta diaria: ' + goal + ' min.', '');
  if (parts.c) { const c = saClasses(studs.gid, D).pop(); L.push('== EN CLASE · ' + (c ? saDay(c.date, 1) + (c.sessionLabel ? ' · ' + c.sessionLabel : '') : 'sin clase') + ' =='); if (c) { const mats = saMats(c), att = A ? A.getDay(c.date) : {}; L.push('Materiales de plataforma: ' + (mats.map(x => x.m).join(' | ') || 'ninguno')); studs.list.forEach(st => { if (att[st.id] && att[st.id].status === 'falto') { L.push('- ' + st.fullName + ': faltó'); return; } const da = ((F.dayAct || {})[String(st.id)] || {})[c.date] || {}; const miss = mats.filter(x => !da[x.k]); L.push('- ' + st.fullName + ': ' + (!miss.length ? 'COMPLETÓ' : (mats.length - miss.length) + '/' + mats.length + ' · le faltó: ' + miss.map(x => x.m).join(', '))); }); } L.push(''); }
  if (parts.p) { const p = saSets(F, studs.gid, D).pop(); if (p) { const r = S.range(p); L.push('== PRÁCTICA DEL TEACHER · ' + (p.title || '') + ' · ' + saDay(r.from, 1) + ' → ' + saDay(r.to, 1) + (D <= r.to ? ' (en curso a esa fecha)' : ' (cerrado)') + ' =='); studs.list.forEach(st => { const ev = S.evalSet(p, st, F, D); if (!ev) return; L.push('- ' + st.fullName + ': ' + ev.cells.map(c => { const k = saCode(c, D <= r.to); return c.name + ': ' + (k === 'o' ? 'hecho ' + saDay(c.d) + (c.sc != null ? ' (nota ' + c.sc + ')' : '') : k === 'x' ? 'fuera de fecha' + (c.d ? ' ' + saDay(c.d) : '') : k === 'l' ? 'SIN APROBAR (nota ' + c.sc + ') → debe repetirlo' : k === 'p' ? 'ya lo tenía aprobado' : k === 'f' ? 'pendiente' : 'NO lo hizo'); }).join(' · ')); }); L.push(''); } }
  if (parts.r) { const from = S.addD(D, -6); L.push('== REPASO POR SU CUENTA · ' + saDay(from, 1) + ' → ' + saDay(D, 1) + ' =='); studs.list.forEach(st => { const u = String(st.id), mi = daily.mins[u] || {}; let k = 0, sum = 0; for (let i = 0; i < 7; i++) { const d = S.addD(from, i), v = mi[d] || 0; sum += v; if (v >= goal) k++; } L.push('- ' + st.fullName + ': meta ' + k + '/7 días · promedio ' + Math.round(sum / 7) + ' min/día'); }); L.push(''); }
  if (parts.t) { const tks = saTasks(F, studs.gid, D).filter(k => saPeru(k.dueAt) <= D); L.push('== TAREAS vencidas hasta ' + saDay(D, 1) + ' =='); if (!tks.length) L.push('Ninguna.'); tks.forEach(k => { L.push('* ' + k.title); studs.list.forEach(st => { const x = saTState(k, st, F, studs.thr); if (x.c === 'na') return; L.push('  - ' + st.fullName + ': ' + (x.c === 'n' ? 'NO la entregó' : x.c === 'r' ? 'entregada, por revisar' : 'nota ' + x.g + (x.c === 'l' ? ' (sin aprobar)' : '')) + (x.late ? ' · tarde' : '')); }); }); L.push(''); }
  L.push('Pide a Claude: refuerzo para quienes deben repetir o no hicieron materiales, y un plan para la próxima clase.'); return L.join('\n'); }
function SaReportPop({ o, area, onClose }) {
  const S = window.JUCUM_SEG; const [D, setD] = React.useState(o.t); const [parts, setParts] = React.useState({ p: area === 'p', r: area === 'r', c: area === 'c', t: area === 't' }); const [cp, setCp] = React.useState(false);
  const txt = saReport({ ...o, D, parts }); const opts = []; for (let i = 0; i < 21; i++) opts.push(S.addD(o.t, -i));
  return <SaPop title="📤 Reporte para tu Claude" sub="Elija el día y qué incluir · se copia como texto" onClose={onClose}>
    <div className="sa-rp"><label>Día <select value={D} onChange={e => setD(e.target.value)}>{opts.map(d => <option key={d} value={d}>{saDay(d, 1)}</option>)}</select></label>
      <span className="sa-rc">{(o.areas || ['p', 'r', 'c', 't']).map(k => <label key={k}><input type="checkbox" checked={!!parts[k]} onChange={e => setParts(p => ({ ...p, [k]: e.target.checked }))} /> {{ p: '🏠 Práctica', r: '🔁 Repaso', c: '🏫 En clase', t: '📝 Tareas' }[k]}</label>)}</span></div>
    <pre className="sa-rtxt">{txt}</pre>
    <div className="sa-rp"><button type="button" className="sa-btn pri" onClick={() => { try { navigator.clipboard.writeText(txt).then(() => setCp(true)); } catch (e) { window.prompt('Copia el reporte:', txt); } }}>{cp ? '✓ Copiado' : 'Copiar'}</button><button type="button" className="sa-btn" onClick={() => { const u = URL.createObjectURL(new Blob([txt], { type: 'text/plain' })); const a = document.createElement('a'); a.href = u; a.download = 'Seguimiento - ' + D + '.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(u), 2000); }}>⬇ Descargar .txt</button></div>
  </SaPop>;
}

/* ── Panel ── areas: qué pestañas se muestran (grupo: todas · Modo clase: ['c','p']) */
function GroupFollowPanel({ groupId, areas, startArea, classDate }) {
  const D = window.JUCUM_DATA, S = window.JUCUM_SEG; if (!D || !S) return null;
  const AR = areas || ['p', 'r', 'c', 't'];
  const [area, setArea] = React.useState(startArea || AR[0]); const [date, setDate] = React.useState(classDate || null); const [pop, setPop] = React.useState(null); const [task, setTask] = React.useState(null); const [rep, setRep] = React.useState(false);
  const [, tick] = React.useReducer(x => x + 1, 0);
  const group = (D.GROUPS || []).find(g => g.id === groupId) || null; const t = S.today();
  const list = S.groupStudents(groupId, null); const ids = list.map(s => String(s.id)); const since = S.addD(t, -42);
  const seg = window.useSegFacts({ ids, groups: [groupId], since }); const F = seg.F; const daily = useSaDaily(ids, S.addD(t, -28));
  /* si los alumnos del grupo aún no llegaron (recién abierta la plataforma), vuelve a mirar cada 2 s */
  React.useEffect(() => { if (list.length) return; const iv = setInterval(tick, 2000); return () => clearInterval(iv); }, [list.length]);
  const lvl = group ? group.level : (list[0] && list[0].level); const thr = (F && F.thr && F.thr[lvl] != null) ? F.thr[lvl] : ({ 'pre-a1': 75, a1: 78, a2: 85 }[lvl] || 75);
  const goal = (D.getGroupSettings(groupId) || {}).dailyTargetMin || 15; const studs = { gid: groupId, list, thr };
  const TABS = { p: ['🏠', 'Práctica del teacher', 'Los sets para casa'], r: ['🔁', 'Repaso por su cuenta', 'Meta diaria de ' + goal + ' min y qué repasó'], c: ['🏫', 'En clase', 'Materiales del plan en cada clase'], t: ['📝', 'Tareas', 'Quién entregó · ver su tarea aquí'] };
  const SRC = { p: '📍 Cada columna es un set para casa. El anillo cuenta lo hecho dentro de las fechas; lo que ya tenía aprobado no se le pide. Toque un anillo para ver cada material con su nota.', r: '📍 Si llegó a la meta diaria del grupo (⚙️ Configurar → ' + goal + ' min). Toque el anillo para ver qué repasó, día por día, de cualquier tema o módulo.', c: '📍 Completó = hizo todos los materiales del plan ese día (aprobar se ve en la nota). Los que terminan suben arriba por orden de llegada. Toque «¡Completó!» o «le faltan» para el detalle.', t: '📍 Toque una celda para ver la tarea del alumno aquí mismo: respuestas, texto, audio, foto o PDF, sin descargar. Puede compararla con lo que usted dejó y calificarla.' };
  return <div className="sa">
    <style>{SA_CSS}</style>
    <div className="sa-hd"><div className="sa-areas">{AR.map(k => <button type="button" key={k} className={area === k ? 'on' : ''} onClick={() => setArea(k)}><b>{TABS[k][0]} {TABS[k][1]}</b><span>{TABS[k][2]}</span></button>)}</div>
      <div className="sa-tools">{window.SegAgo ? <SegAgo F={F} busy={seg.busy} err={seg.err} onReload={seg.reload} /> : null}<button type="button" className="sa-btn rep" onClick={() => setRep(true)} disabled={!F}>📤 Reporte para tu Claude</button></div></div>
    <div className="sa-src">{SRC[area]}</div>
    {!F ? <div className="sa-empty">{seg.err ? 'Sin conexión con la nube. ' : ''}Cargando el seguimiento desde la nube…</div> : <div className="sa-sc">
      {area === 'p' ? <SaPractice F={F} studs={studs} t={t} onPop={setPop} /> : area === 'r' ? <SaReview F={F} studs={studs} t={t} daily={daily} goal={goal} onPop={setPop} /> : area === 'c' ? <SaClass F={F} studs={studs} t={t} daily={daily} date={date} setDate={setDate} onPop={setPop} /> : <SaTasks F={F} studs={studs} t={t} onTask={(k, st) => setTask({ k, st })} />}
    </div>}
    {pop && pop.kind === 'review' ? <SaReviewPop p={pop} thr={thr} onClose={() => setPop(null)} /> : pop ? <SaPop title={pop.title} sub={pop.sub} onClose={() => setPop(null)}>{pop.sum ? <div className="sa-sum">{pop.sum}</div> : null}<SaRows rows={pop.rows || []} grouped={pop.grouped} /></SaPop> : null}
    {task && F ? <SaTaskPop tk={task.k} st={task.st} studs={studs} F={F} onClose={() => setTask(null)} onMove={st => setTask({ k: task.k, st })} /> : null}
    {rep && F ? <SaReportPop o={{ F, studs, daily, goal, group, t, areas: AR }} area={area} onClose={() => setRep(false)} /> : null}
  </div>;
}

const SA_CSS = `.sa{display:flex;flex-direction:column;gap:12px;color:#1d2433;font-family:Nunito,system-ui,sans-serif;color-scheme:light}
.sa-hd{display:flex;flex-direction:column;gap:10px}.sa-areas{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px}
.sa-areas button{border:1.5px solid #E3DCC9;background:#FFFDF8;border-radius:14px;padding:10px 13px;text-align:left;cursor:pointer;font-family:inherit;display:flex;flex-direction:column;gap:2px;min-height:58px;color:#1d2433}
.sa-areas button b{font:600 15px Fredoka,sans-serif;color:#0D1B5A}.sa-areas button span{font-size:12px;font-weight:700;color:#7a705c}
.sa-areas button.on{background:#0D1B5A;border-color:#0D1B5A}.sa-areas button.on b{color:#fff}.sa-areas button.on span{color:#C9D4F0}
.sa-tools{display:flex;gap:8px;align-items:center;justify-content:flex-end;flex-wrap:wrap}
.sa-btn{border:1.5px solid #D6DEEA;background:#fff;color:#33415C;border-radius:10px;padding:7px 12px;font:800 12.5px Nunito,sans-serif;cursor:pointer;min-height:36px;white-space:nowrap}.sa-btn:hover{background:#EEF2FC}.sa-btn:disabled{opacity:.4;cursor:default}
.sa-btn.rep{background:#5B3FA0;color:#fff;border-color:#5B3FA0}.sa-btn.pri{background:#0D1B5A;color:#fff;border-color:#0D1B5A}
.sa-src{background:#EEF2FC;border:1px solid #C9D4F0;border-radius:10px;padding:8px 11px;font-size:12px;font-weight:700;color:#1F3A8A;line-height:1.45}.sa-src.am{background:#FFF8E6;border-color:#F0DDB0;color:#7A4A00}
.sa-sc{overflow-x:auto}.sa-empty{padding:16px;color:#7a705c;font-weight:700;font-size:13px}
.sa-t{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums;min-width:640px}
.sa-t th{font-size:11px;font-weight:800;color:#8a7f6a;padding:6px 8px;text-align:center;vertical-align:bottom;line-height:1.3}.sa-t th:first-child,.sa-t th.l{text-align:left}.sa-t th small{display:block;font-weight:700;color:#B0A994;font-size:10.5px;white-space:nowrap}
.sa-t td{border-top:1px solid #F2ECDD;padding:8px;vertical-align:middle;text-align:center}.sa-t td.nm{font-weight:800;font-size:13px;white-space:nowrap;text-align:left}
.sa-t td.sit{text-align:left;font-size:12.5px;font-weight:700;color:#33415C;line-height:1.4;min-width:220px}.sa-t td.sit b{color:#B23A2A;font-weight:800}.sa-t .ok{color:#2E7D32;font-weight:800}
.sa-cell{border:none;background:none;padding:3px;border-radius:9px;cursor:pointer;font-family:inherit;min-width:44px;min-height:36px;display:inline-flex;align-items:center;justify-content:center}.sa-cell:hover{background:#F1EEFA}.sa-cell:disabled{cursor:default}
.sa-ring{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;font-size:10.5px;font-weight:900;position:relative;color:#1d2433}.sa-ring::before{content:"";position:absolute;inset:4px;border-radius:50%;background:#fff}.sa-ring span{position:relative}
.sa-days{display:grid;grid-template-columns:repeat(14,10px);gap:3px;justify-content:center}.sa-days i{height:18px;border-radius:3px;display:block;background:#EFEBE1}.sa-days i.ok{background:#43A047}.sa-days i.lo{background:#F2C14E}
.sa-avg{font-weight:900}.sa-avg small{font-size:11px;color:#8a7f6a;font-weight:700}
.sa-d{display:inline-block;width:15px;height:15px;border-radius:50%;position:relative;box-sizing:border-box;vertical-align:middle}.sa-d.o{background:#43A047}.sa-d.o::after{content:"";position:absolute;left:5px;top:2px;width:4px;height:7px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}.sa-d.n{border:2.5px solid #E53935}
.sa-abs{font-size:11px;font-weight:900;color:#B23A2A;background:#FDECEA;border-radius:7px;padding:4px 7px}.sa-txt{font-size:12px;font-weight:800;color:#8a7f6a;background:#F1EFE9;padding:5px 8px;border-radius:8px;white-space:nowrap}
.sa-cnav{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:8px}.sa-cur{background:#0D1B5A;color:#fff;border-radius:10px;padding:8px 13px;font-weight:800;font-size:12.5px;white-space:nowrap}.sa-cnt{margin-left:auto;font:600 14px Fredoka,sans-serif;color:#0D1B5A}
@keyframes saRise{0%{opacity:0;transform:translateY(14px) scale(.98)}60%{opacity:1;transform:translateY(-3px) scale(1.01)}100%{transform:none}}@keyframes saShine{0%{background-position:-200% 0}100%{background-position:200% 0}}@keyframes saBob{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-3px) rotate(-6deg)}}
.sa-done{animation:saRise .6s cubic-bezier(.2,.8,.2,1) both}.sa-done td{background:linear-gradient(90deg,#E6F6E8,#F3FBF4 40%,#E6F6E8);border-top:2px solid #fff}.sa-done td.nm{color:#1B5E20}
.sa-pos{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#2E7D32;color:#fff;font-size:11px;font-weight:900;margin-right:8px}
.sa-win{display:inline-flex;align-items:center;gap:10px;border:none;cursor:pointer;font-family:inherit;background:linear-gradient(110deg,#2E7D32 0%,#43A047 40%,#81C784 50%,#43A047 60%,#2E7D32 100%);background-size:200% 100%;animation:saShine 3s linear infinite;color:#fff;border-radius:12px;padding:6px 12px 6px 8px;text-align:left;box-shadow:0 4px 12px rgba(46,125,50,.25);min-height:44px}
.sa-win .em{font-size:22px;animation:saBob 2.4s ease-in-out infinite;display:inline-block}.sa-win b{font:600 14px Fredoka,sans-serif;color:#fff}.sa-win small{display:block;font-size:11.5px;font-weight:800;opacity:.92}
@media (prefers-reduced-motion:reduce){.sa-done,.sa-win,.sa-win .em{animation:none}}
.sa-pc{display:inline-flex;align-items:center;justify-content:center;min-width:78px;height:28px;border-radius:7px;font-size:11.5px;font-weight:900;padding:0 8px;white-space:nowrap}.sa-pc em{font-style:normal;font-size:10px;opacity:.8}
.sa-pc.ok{background:#2EA84B;color:#fff}.sa-pc.lo{background:#FBE3DC;color:#A3361F;border:1px solid #F0A898}.sa-pc.rv{background:#EFE9FB;color:#5B3FA0;border:1px solid #D7C9F5}.sa-pc.nx{background:#FDECEA;color:#B23A2A}.sa-pc.no{background:#EFEDE6;border:1px dashed #DAD5C6;color:#B0A994}
.sa-tot td{font-weight:900;border-top:2px dashed #E3DCC9}.sa-tot td:first-child{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#8a7f6a;text-align:left}
.sa-ov{position:fixed;inset:0;background:rgba(15,23,42,.5);display:flex;align-items:center;justify-content:center;padding:16px;z-index:1200}
.sa-pop{background:#fff;border-radius:18px;max-width:600px;width:100%;max-height:88vh;overflow:auto;box-shadow:0 24px 60px rgba(0,0,0,.35);color:#1d2433;font-family:Nunito,system-ui,sans-serif;color-scheme:light}.sa-pop.wide{max-width:1000px}
.sa-pop header{display:flex;gap:10px;align-items:flex-start;padding:16px 18px 10px;border-bottom:1px solid #F2ECDD}.sa-pop header>b{font:600 17px Fredoka,sans-serif;color:#0D1B5A;flex:1}.sa-pop header b small{display:block;font:700 12.5px Nunito,sans-serif;color:#7a705c;margin-top:2px}
.sa-x{width:36px;height:36px;border-radius:50%;border:none;background:#F4F1EA;font-weight:900;cursor:pointer;flex:none;color:#33415C}.sa-vnav{display:flex;gap:6px}
.sa-sum{padding:10px 18px;font-size:13px;font-weight:700;color:#33415C;background:#FBFAF6}
.sa-pth{display:flex;gap:10px;padding:8px 18px 4px;font-size:10.5px;font-weight:800;color:#B0A994;text-transform:uppercase;letter-spacing:.05em}.sa-pth span:nth-child(1){width:8px}.sa-pth span:nth-child(2){flex:1}.sa-pth span:nth-child(3){width:150px}.sa-pth span:nth-child(4){width:58px;text-align:right}
.sa-ph{font-size:10.5px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:#8a7f6a;padding:10px 18px 4px;border-top:1px solid #F2ECDD;background:#FBFAF6}
.sa-pi{display:flex;align-items:center;gap:10px;padding:10px 18px;border-top:1px solid #F2ECDD;font-size:13px}.sa-pi i{width:8px;height:18px;border-radius:2px;flex:none;display:block}.sa-pi .m{flex:1;font-weight:700;min-width:0}.sa-pi .w{width:150px;font-weight:700;font-size:12px;color:#6B6252;flex:none}.sa-pi .g{width:58px;text-align:right;font-weight:900;font-size:14px;flex:none}.sa-pi .g.bad{color:#B23A2A}
.sa-chk{color:#2E7D32;font-size:16px}.sa-mut{color:#8a7f6a;font-weight:700;font-size:12px}
.sa-stu{margin-top:10px;display:flex;flex-direction:column;gap:6px}.sa-stu span{font-size:11px;font-weight:800;color:#8a7f6a;text-transform:uppercase;letter-spacing:.05em}.sa-stu div{background:#FFF4E5;border:1.5px solid #FFCC80;border-radius:12px;padding:10px 12px;color:#7A4A00;font-weight:800;font-size:13px}
.sa-fl{display:flex;gap:6px;padding:10px 18px;flex-wrap:wrap}.sa-fl button{border:1.5px solid #D6DEEA;background:#fff;border-radius:9px;padding:6px 11px;font:800 12px Nunito,sans-serif;cursor:pointer;min-height:32px;color:#33415C;white-space:nowrap}.sa-fl button.on{background:#0D1B5A;border-color:#0D1B5A;color:#fff}
.sa-dayh{display:flex;align-items:baseline;gap:10px;padding:10px 18px 4px;border-top:1px solid #F2ECDD;background:#FBFAF6}.sa-dayh b{font:600 14px Fredoka,sans-serif;color:#0D1B5A;flex:1}.sa-dayh span{font-size:12px;font-weight:800}
.sa-vmode{padding:8px 18px;border-top:1px solid #F2ECDD}.sa-seg{display:inline-flex;border:1.5px solid #D6DEEA;border-radius:10px;padding:2px;gap:2px;background:#fff;flex-wrap:wrap}.sa-seg button{border:none;border-radius:8px;padding:7px 13px;min-height:34px;font:800 12.5px Nunito,sans-serif;cursor:pointer;background:transparent;color:#33415C;white-space:nowrap}.sa-seg button.on{background:#0D1B5A;color:#fff}
.sa-vbody{display:grid;grid-template-columns:minmax(0,1fr) 250px;border-top:1px solid #F2ECDD}.sa-vbody.one{grid-template-columns:1fr}.sa-vbody.both{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.sa-vbody.both .sa-vside{grid-column:1/-1;border-left:none;border-top:1px solid #F2ECDD}
.sa-vview{min-height:200px;display:flex;flex-direction:column;gap:8px;padding:12px;background:#FBFAF6;min-width:0}.sa-vview.mine{background:#F4F1EA}
.sa-vfiles{display:flex;gap:6px;flex-wrap:wrap}.sa-vfiles button{border:1.5px solid #E3DCC9;background:#fff;border-radius:10px;padding:6px 11px;font:800 12.5px Nunito,sans-serif;cursor:pointer;min-height:36px;color:#33415C;white-space:nowrap}.sa-vfiles button.on{background:#0D1B5A;color:#fff;border-color:#0D1B5A}
.sa-pdfw,.sa-imgw{background:#2b2f36;border-radius:10px;padding:8px;position:relative}.sa-zoom{display:flex;gap:4px;align-items:center;justify-content:flex-end;margin-bottom:6px}.sa-zoom button{width:34px;height:34px;border-radius:9px;border:none;background:rgba(255,255,255,.92);color:#33415C;font-weight:900;font-size:15px;cursor:pointer}.sa-zoom b{color:#fff;font-size:12px;min-width:42px;text-align:center}
.sa-pdf{max-height:540px;overflow:auto;display:flex;flex-direction:column;align-items:center;gap:6px;scrollbar-gutter:stable}.sa-pdf canvas{background:#fff;box-shadow:0 6px 18px rgba(0,0,0,.4);border-radius:3px;max-width:none}.sa-ppg{color:#C9D4F0;font-size:11px;font-weight:800;align-self:flex-start}.sa-pmsg{color:#fff;font-weight:800;font-size:13px;padding:24px;text-align:center}.sa-pmsg a{color:#FFD58A}
.sa-img{max-height:540px;overflow:auto;display:flex;justify-content:center}.sa-img img{max-width:100%;transition:transform .25s;background:#fff}
.sa-doc{background:#fff;max-width:640px;width:100%;padding:28px 34px;border-radius:4px;box-shadow:0 6px 18px rgba(0,0,0,.4);font-family:Calibri,'Segoe UI',sans-serif;line-height:1.6;color:#222;text-align:left}.sa-doc img{max-width:100%}.sa-doc table{border-collapse:collapse}.sa-doc td,.sa-doc th{border:1px solid #ccc;padding:4px 6px}
.sa-file{background:#fff;border:1px solid #E3DCC9;border-radius:10px;padding:10px 12px;font-size:13px}.sa-warn{background:#FFF4E5;border:1.5px solid #FFCC80;border-radius:10px;padding:10px 12px;color:#7A4A00;font-weight:700;font-size:13px}
.sa-qa{background:#fff;border:1px solid #E3DCC9;border-radius:10px}.sa-tins{font-size:10.5px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:#8a7f6a;padding:10px 12px 4px}
.sa-qa .q{padding:9px 12px;border-top:1px solid #F2ECDD;font-size:13px}.sa-qa .qq{font-weight:700;color:#33415C;display:flex;gap:8px;align-items:baseline}.sa-qa .qq em{font-style:normal;color:#5B3FA0;font-weight:800}.sa-qa .qn{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:50%;background:#F4F1EA;font-size:11px;font-weight:900;flex:none}
.sa-qa .qr{display:flex;gap:8px;align-items:baseline;margin:6px 0 0 28px}.sa-qa .an{font-weight:800}.sa-qa .an.none{color:#8a7f6a;font-weight:700}.sa-qa .rk{font-weight:900}.sa-qa .rk.ok{color:#2E7D32}.sa-qa .rk.bad{color:#B23A2A}.sa-qa .rk.rv{color:#5B3FA0}.sa-qa .qk{margin:4px 0 0 28px;font-size:12px;font-weight:700;color:#7a705c}
.sa-mine{display:flex;flex-direction:column;gap:6px}.sa-mine .mh{font-size:10.5px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:#5B3FA0}.sa-mine .mi{background:#fff;border:1px solid #E3DCC9;border-radius:10px;padding:10px 12px;font-size:13px;font-weight:700;line-height:1.5;color:#33415C;white-space:pre-wrap}
.sa-mine .mitems{margin:0;padding:10px 12px 10px 30px;background:#fff;border:1px solid #E3DCC9;border-radius:10px;font-size:12.5px;line-height:1.5}.sa-mine .mitems em{font-style:normal;color:#5B3FA0;font-weight:800}.sa-mine .mitems span{display:block;color:#2E7D32;font-weight:800;font-size:12px}
.sa-vside{border-left:1px solid #F2ECDD;padding:14px;display:flex;flex-direction:column;gap:10px}.sa-vside>b{font:600 14px Fredoka,sans-serif;color:#0D1B5A}.sa-vside label{font-size:12px;font-weight:800;color:#7a705c;display:flex;flex-direction:column;gap:5px}
.sa-vside input,.sa-vside textarea{font:700 14px Nunito,sans-serif;border:1.5px solid #D6DEEA;border-radius:10px;padding:9px 10px;width:100%;background:#fff;color:#1d2433;box-sizing:border-box}.sa-vside textarea{min-height:80px;resize:vertical}
.sa-vq{display:flex;gap:5px;flex-wrap:wrap}.sa-vq button{border:1.5px solid #E3DCC9;background:#FFFDF8;border-radius:8px;padding:5px 9px;font:800 12px Nunito,sans-serif;cursor:pointer;min-height:32px;color:#33415C}
.sa-save{border:none;border-radius:12px;padding:11px;background:linear-gradient(135deg,#3F5BB8,#0D1B5A);color:#fff;font:800 13.5px Nunito,sans-serif;cursor:pointer;min-height:44px}
.sa-rp{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 18px;font-size:12.5px;font-weight:800;color:#33415C}.sa-rp select{font:800 13px Nunito,sans-serif;padding:6px 8px;border-radius:8px;border:1.5px solid #D6DEEA;margin-left:6px;background:#fff;color:#1d2433}.sa-rc{display:flex;gap:12px;flex-wrap:wrap}.sa-rc label{display:inline-flex;gap:5px;align-items:center;cursor:pointer}
.sa-rtxt{margin:0 18px;background:#0F172A;color:#E2E8F0;border-radius:12px;padding:12px;font:12px/1.55 ui-monospace,Menlo,monospace;white-space:pre-wrap;max-height:42vh;overflow:auto}
@media (max-width:760px){.sa-vbody,.sa-vbody.both{grid-template-columns:1fr}.sa-vside{border-left:none;border-top:1px solid #F2ECDD}}`;

Object.assign(window, { GroupFollowPanel });
