/* TeacherNeuro · NT-V1 (15-oct-2026) — Práctica con Neuro en el panel del profesor (Pre-A1)
 * Aprobado en `Espejo - Ficha del alumno con Neuro.html`:
 *  · NeuroGroupCard (GroupDetail): 📊 Avance de todos (fila por alumno × práctica del día, caja, ⭐ semana,
 *    última práctica) + ❌ Lo que más falla el grupo (temas y preguntas, solo el 1.er intento).
 *  · NeuroStudentCard (ficha): 📊 Avance de hoy · ❌ Qué falló · 🧠 Caja de errores · ⭐ Repasos de la semana.
 * Solo LEE (JUCUM_MIX.teacherFetch: practice_items + week_reviews). “Qué respondió” necesita el script 37. */
const NT_CSS = `
.nt{background:#fff;border-radius:16px;padding:16px;border:1px solid #E6E1D3;box-shadow:0 2px 4px rgba(0,0,0,.06),0 6px 18px rgba(0,0,0,.08);display:flex;flex-direction:column;gap:14px;margin:16px 0;min-width:0}
.nt-h{display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap}
.nt-h .t{font-family:'Fredoka',sans-serif;font-weight:600;font-size:17px;color:#1E2433;flex:1;min-width:220px;display:flex;flex-direction:column;gap:3px}
.nt-h .t small{font-family:'Nunito',sans-serif;font-size:12.5px;font-weight:700;color:#7a705c;line-height:1.45}
.nt-live{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:900;color:#1B5E20;background:#E8F5E9;border:1px solid #A5D6A7;border-radius:20px;padding:4px 10px;white-space:nowrap}
.nt-live i{width:8px;height:8px;border-radius:50%;background:#2EA84B;animation:ntBl 1.6s infinite}@keyframes ntBl{50%{opacity:.25}}
.nt-ib{border:1.5px solid #D6DEEA;background:#fff;border-radius:10px;padding:5px 10px;font:inherit;font-weight:800;font-size:12px;color:#33415C;cursor:pointer;white-space:nowrap}
.nt-tabs{display:flex;gap:6px;flex-wrap:wrap;border-bottom:1.5px solid #EEE7D6;padding-bottom:10px}
.nt-tabs button{border:1.5px solid #E3DCCB;background:#fff;border-radius:11px;padding:7px 12px;font:inherit;font-weight:800;font-size:12.5px;color:#4A5468;cursor:pointer;display:inline-flex;gap:6px;align-items:center;white-space:nowrap}
.nt-tabs button.on{background:#0D1B5A;border-color:#0D1B5A;color:#fff}
.nt-tabs .n{background:#F59E00;color:#fff;border-radius:9px;font-size:10.5px;padding:1px 6px}
.nt-lbl{font-size:10.5px;font-weight:900;letter-spacing:.07em;text-transform:uppercase;color:#8a7f6a}
.nt-day{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:800;color:#33415C}
.nt-scroll{overflow-x:auto;margin:0 -4px;padding:0 4px}
.nt-gt{width:100%;border-collapse:separate;border-spacing:0}
.nt-gt th{font-size:11px;font-weight:900;color:#5A6B86;text-align:center;padding:6px 4px;vertical-align:bottom;line-height:1.25;border-bottom:1.5px solid #EEE7D6;min-width:74px}
.nt-gt th:first-child,.nt-gt td:first-child{text-align:left;position:sticky;left:0;background:#fff;z-index:1;min-width:150px}
.nt-gt td{border-bottom:1px solid #F2ECDD;padding:7px 4px;text-align:center;font-size:12px;font-weight:800;vertical-align:middle}
.nt-gt th .ic{display:block;font-size:17px;margin-bottom:2px}
.nt-gt tfoot td{background:#F8F6F0;font-size:11.5px;color:#5A6B86}
.nt-nm{display:flex;align-items:center;gap:8px;cursor:pointer;color:#1F3A8A;font-weight:800;font-size:13px;white-space:nowrap;border:0;background:none;font-family:inherit;padding:0}.nt-nm:hover{text-decoration:underline}
.nt-nm i{width:9px;height:9px;border-radius:50%;flex:none}
.nt-mr{width:36px;height:36px;border-radius:50%;padding:4px;margin:0 auto;display:flex}.nt-mr span{flex:1;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:10.5px;font-weight:900;color:#1E2433}
.nt-mr.done span{color:#fff;background:transparent}
.nt-bx{display:inline-flex;align-items:center;gap:4px;border-radius:20px;padding:3px 9px;font-size:11.5px;font-weight:900;white-space:nowrap}
.nt-rings{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}
.nt-rg{border:1px solid #EEE7D6;border-radius:13px;padding:10px;display:flex;gap:10px;align-items:center;background:#FFFDF8;min-width:0}
.nt-ring{width:50px;height:50px;border-radius:50%;padding:5px;flex:none;display:flex}.nt-ring span{flex:1;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:18px}
.nt-rg b{display:block;font-size:12.5px;line-height:1.25}.nt-rg em{font-style:normal;font-size:12px;font-weight:800;display:block;margin-top:2px}.nt-rg small{display:block;font-size:11px;font-weight:700;color:#8a7f6a;margin-top:1px}
.nt-sum{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px}
.nt-sm{border-radius:12px;padding:10px 12px;background:#F5F7FB;display:flex;flex-direction:column;gap:2px}
.nt-sm b{font-family:'Fredoka',sans-serif;font-weight:600;font-size:21px;color:#0D1B5A;line-height:1.1}.nt-sm span{font-size:12px;font-weight:800;color:#5A6B86}
.nt-topics{display:flex;flex-wrap:wrap;gap:7px}
.nt-tp{white-space:nowrap;display:inline-flex;align-items:center;gap:6px;background:#FFF4E5;border:1px solid #FFCC80;color:#7A4A00;border-radius:20px;padding:5px 11px;font-size:12.5px;font-weight:800}
.nt-tp i{font-style:normal;background:#F59E00;color:#fff;border-radius:9px;padding:0 6px;font-size:11px}
.nt-flt{display:flex;gap:6px;flex-wrap:wrap}
.nt-flt button{border:1.5px solid #D6DEEA;background:#fff;border-radius:20px;padding:5px 12px;font:inherit;font-weight:800;font-size:12px;color:#33415C;cursor:pointer;white-space:nowrap}
.nt-flt button.on{background:#EEF2FC;border-color:#3F5BB8;color:#1F3A8A}
.nt-err{border:1px solid #EEE7D6;border-radius:13px;padding:10px 12px;display:flex;flex-direction:column;gap:7px;background:#fff}
.nt-err .h{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
.nt-chip{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:900;padding:3px 9px;border-radius:20px;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}
.nt-c-mat{background:#EEF2FC;color:#1F3A8A}.nt-c-box{background:#F3E8FD;color:#5B3FA0}.nt-c-ok{background:#E8F5E9;color:#1B5E20}.nt-c-bad{background:#FFEBEE;color:#B71C1C}.nt-c-tag{background:#FFF4E5;color:#7A4A00}
.nt-q{font-family:'Fredoka',sans-serif;font-weight:500;font-size:15px;color:#1E2433;line-height:1.35}
.nt-cmp{display:flex;gap:8px;flex-wrap:wrap}
.nt-cmp span{flex:1;min-width:140px;border-radius:10px;padding:6px 10px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.05em;display:flex;flex-direction:column;gap:2px}
.nt-cmp b{font-family:'Fredoka',sans-serif;font-weight:600;font-size:14px;text-transform:none;letter-spacing:0}
.nt-cmp .yo{border:1.5px solid #F0B44A;color:#8A5A00}.nt-cmp .yo b{text-decoration:line-through;text-decoration-color:#E08A00}.nt-cmp .ok{border:1.5px solid #2EA84B;color:#1B5E20}
.nt-when{font-size:11.5px;font-weight:700;color:#8a7f6a}
.nt-qrow{display:grid;grid-template-columns:minmax(0,1fr) 150px;gap:12px;align-items:center;border:1px solid #EEE7D6;border-radius:13px;padding:10px 12px;background:#fff}
.nt-qrow small{display:block;font-size:11.5px;font-weight:700;color:#8a7f6a;margin-top:3px}
.nt-pb{height:9px;border-radius:6px;background:#FDE2E2;overflow:hidden}.nt-pb i{display:block;height:100%;background:#E53935;border-radius:6px}
.nt-pct{font-size:12px;font-weight:900;color:#B71C1C;margin-bottom:4px;text-align:right}
.nt-wk{display:flex;flex-direction:column;gap:10px;border:1px solid #F0D58A;background:#FFFBEA;border-radius:14px;padding:12px 13px}
.nt-bar{height:11px;border-radius:7px;background:#F3E3B0;overflow:hidden}.nt-bar i{display:block;height:100%;border-radius:7px;background:linear-gradient(90deg,#FFCA28,#F59E00)}
.nt-days{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;text-align:center;font-size:11px;font-weight:900;color:#8a6f3a}
.nt-days .c{height:44px;border-radius:8px;background:#F3E3B0;display:flex;align-items:flex-end;overflow:hidden;margin-bottom:3px}.nt-days .c i{display:block;width:100%;background:linear-gradient(180deg,#FFCA28,#F59E00)}
.nt-note{display:flex;gap:9px;align-items:flex-start;background:#EEF2FC;border:1px solid #C9D4F0;border-radius:11px;padding:9px 12px;font-size:12.5px;font-weight:700;color:#1F3A8A;line-height:1.5}
.nt-empty{font-size:13px;font-weight:700;color:#7A8599;padding:10px 2px;line-height:1.5}
@media(max-width:620px){.nt-qrow{grid-template-columns:minmax(0,1fr)}}
`;
(function injectNtCSS() { if (typeof document === 'undefined' || document.getElementById('nt-css')) return; const st = document.createElement('style'); st.id = 'nt-css'; st.textContent = NT_CSS; document.head.appendChild(st); })();

const NT_COLORS = ['#2EA84B', '#4FC3F7', '#F06292', '#FFB300', '#BA68C8', '#FF8A65', '#4DB6AC', '#9575CD', '#AED581', '#7986CB'];
const NT_DAYN = ['L', 'M', 'Mi', 'J', 'V', 'S', 'D'];
const NT_MON = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
const ntDay = (t) => new Date((t == null ? Date.now() : t) - 5 * 3600e3).toISOString().slice(0, 10);
const ntWd = (iso) => (new Date(iso + 'T12:00:00Z').getUTCDay() + 6) % 7;
const ntTime = (t) => new Date(t).toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' });
function ntWhen(t) {
  if (!t) return '—'; const d = ntDay(t), today = ntDay(), y = ntDay(Date.now() - 86400e3);
  if (d === today) return 'Hoy ' + ntTime(t); if (d === y) return 'Ayer ' + ntTime(t);
  const n = Math.round((Date.parse(today) - Date.parse(d)) / 86400e3); return n < 7 ? 'Hace ' + n + ' días' : d.slice(8) + ' ' + NT_MON[+d.slice(5, 7) - 1];
}
function ntIco(type, kind) { return kind === 'fill' ? '📝' : kind === 'identify' ? '🔎' : kind === 'transform' ? '🔄' : kind === 'read' || type === 'reading' ? '📖' : kind === 'listen' || type === 'listening' ? '🎧' : type === 'story' || type === 'dialog' ? '📗' : type === 'quizlet' ? '🃏' : type === 'summary' ? '📚' : '📄'; }
function ntShort(a) {
  const t = a.type; if (t === 'story' || t === 'dialog') return 'Story'; if (t === 'reading') return 'Lectura'; if (t === 'listening') return 'Listening'; if (t === 'quizlet') return 'Quizlet'; if (t === 'summary') return 'Resumen';
  return ((a.group ? a.group.split('·')[0].trim() + ' · ' : '') + a.name).slice(0, 26);
}
const ntQText = (q) => !q ? '' : q.kind === 'fill' ? q.sentence : q.kind === 'identify' ? '¿Cuál oración está bien escrita?' : q.kind === 'transform' ? q.src : q.q;
const ntRight = (q) => !q ? '' : q.kind === 'transform' ? q.answer.join(' ') : q.correct;
const ntTag = (q) => !q ? '' : (q.tag || q.badge || '');
const ntOut = (s) => { const st = String(s.status || '').toLowerCase(); if (['retirado', 'retirada', 'retired', 'inactivo', 'inactiva', 'inactive', 'baja', 'withdrawn'].includes(st)) return true; if (s.closedAt) return true; try { const G = window.JUCUM_GRAD; if (G && G.isGraduated && G.isGraduated(s.id)) return true; } catch (e) {} return false; };

/* materiales por clave "mod:act" (de cualquier módulo del nivel) — cacheado por sesión */
const NT_MATS = {};
function ntMaterial(level, key) {
  const k = level + '|' + key; if (NT_MATS[k]) return NT_MATS[k];
  const D = window.JUCUM_DATA, MIX = window.JUCUM_MIX, [mid, aid] = key.split(':');
  const mod = (D.MODULE_CATALOG[level] || []).find(m => m.id === mid), a = mod && (mod.activities || []).find(x => x.id === aid);
  const kind = a ? MIX.kindOf(a.url) : null;
  NT_MATS[k] = !kind ? Promise.resolve(null) : MIX.loadMaterial(a.url).then(r => ({ key, mod, a, kind, label: ntShort(a), num: D.getModuleNumber ? D.getModuleNumber(level, mid) : null, items: r.ok ? r.items : [], byId: (r.items || []).reduce((o, q) => { o[q.id] = q; return o; }, {}) }));
  return NT_MATS[k];
}

/* columnas = prácticas del día de los alumnos (unión, en orden) + filas de la nube */
function useNtData(students, dayISO) {
  const [st, setSt] = React.useState({ loading: true });
  const [tick, setTick] = React.useState(0);
  const idsKey = students.map(s => s.id).join(',');
  React.useEffect(() => {
    let alive = true; const D = window.JUCUM_DATA, TT = window.JUCUM_TT, MIX = window.JUCUM_MIX;
    const cols = [], seen = {};
    students.forEach(s => {
      const tp = TT && TT.getTodayPracticeForStudent ? TT.getTodayPracticeForStudent(s, dayISO) : { items: [] };
      ((tp && tp.items) || []).forEach(it => {
        const key = it.moduleId + ':' + it.activityId; if (seen[key]) return;
        const mod = (D.MODULE_CATALOG[s.level] || []).find(m => m.id === it.moduleId), a = mod && (mod.activities || []).find(x => x.id === it.activityId);
        if (!a) return; seen[key] = 1;
        cols.push({ key, mod, a, type: a.type || it.type, kind: MIX.kindOf(a.url), label: ntShort(a), color: NT_COLORS[cols.length % NT_COLORS.length] });
      });
    });
    const level = (students[0] || {}).level;
    Promise.all([
      Promise.all(cols.map(c => c.kind ? ntMaterial(level, c.key).then(m => { c.mat = m; }) : null)),
      MIX.teacherFetch(students.map(s => s.id), 21)
    ]).then(([, res]) => { if (alive) setSt({ loading: false, cols, res, at: Date.now() }); });
    return () => { alive = false; };
  }, [idsKey, dayISO, tick]);
  React.useEffect(() => { const iv = setInterval(() => { if (!document.hidden) setTick(t => t + 1); }, 90000); return () => clearInterval(iv); }, []);
  return [st, () => setTick(t => t + 1)];
}

function ntStudentModel(s, cols, rows, weeks, wk, dayISO) {
  const D = window.JUCUM_DATA, prog = D.getStudentProgress(s.id) || { completed: {} };
  const mine = rows.filter(r => r.user_id === s.id), main = mine.filter(r => !/^rv:/.test(r.mat_key));
  const cells = cols.map(c => {
    const e = prog.completed[c.key], doneDay = !!(e && e.date && ntDay(Date.parse(e.date)) === dayISO);
    if (c.kind && c.mat && c.mat.items.length) {
      const ids = c.mat.byId, rs = main.filter(r => r.mat_key === c.key && ids[r.item_id]);
      const ok = rs.filter(r => r.status === 'ok').length, box = rs.filter(r => r.status === 'box').length, tot = c.mat.items.length;
      const pct = Math.round(ok / tot * 100), sc = e && (D.scorePct ? D.scorePct(e.score) : e.score);
      return { pct, ok, box, tot, ans: rs.length, grade: pct >= 100 && sc != null ? sc : null };
    }
    return { pct: doneDay ? 100 : 0, story: true, doneDay };
  });
  const now = Date.now(), box = main.filter(r => r.status === 'box');
  const w = weeks.find(x => x.user_id === s.id), rv = mine.filter(r => r.mat_key.indexOf('rv:' + wk + ':') === 0 && r.status === 'ok');
  const last = mine.reduce((a, r) => Math.max(a, Date.parse(r.updated_at) || 0), 0);
  return { s, cells, main, mine, box, ready: box.filter(r => r.due_at && Date.parse(r.due_at) <= now), week: w ? { cap: w.cap || 0, plan: w.plan || [], done: rv.length, rv } : null, last, today: mine.filter(r => ntDay(Date.parse(r.updated_at)) === ntDay()).length };
}

function NtRing({ p, color, done, small }) {
  if (small) return done ? <div className="nt-mr done" style={{ background: color }}><span>✓</span></div> : <div className="nt-mr" style={{ background: `conic-gradient(${color} ${p}%,#E8ECF3 0)` }}><span>{p ? p + '%' : '—'}</span></div>;
  return null;
}
function NtDayNav({ day, setDay }) {
  const today = ntDay(), back = (n) => setDay(ntDay(Date.parse(day + 'T12:00:00Z') + 5 * 3600e3 + n * 86400e3));
  const lab = day === today ? 'Hoy' : day === ntDay(Date.now() - 86400e3) ? 'Ayer' : NT_DAYN[ntWd(day)] + ' ' + day.slice(8) + ' ' + NT_MON[+day.slice(5, 7) - 1];
  return <span className="nt-day"><button type="button" className="nt-ib" onClick={() => back(-1)} title="Día anterior">‹</button><span style={{ minWidth: 64, textAlign: 'center' }}>{lab}</span><button type="button" className="nt-ib" disabled={day >= today} style={day >= today ? { opacity: .4 } : null} onClick={() => back(1)} title="Día siguiente">›</button></span>;
}

/* ❌ errores (solo 1.er intento) → [{key,item,q,mat,students:[{s,row}],answered}] */
function useNtErrors(students, rows, days) {
  const [list, setList] = React.useState(null);
  const sig = rows.length + '|' + students.length;
  React.useEffect(() => {
    let alive = true; const since = Date.now() - (days || 14) * 86400e3, level = (students[0] || {}).level;
    const fails = rows.filter(r => !/^rv:/.test(r.mat_key) && r.first_ok === false && (Date.parse(r.last_wrong_at || r.updated_at) || 0) >= since);
    const keys = [...new Set(fails.map(r => r.mat_key))].slice(0, 30);
    Promise.all(keys.map(k => ntMaterial(level, k))).then(ms => {
      if (!alive) return; const M = {}; ms.forEach(m => { if (m) M[m.key] = m; });
      const by = {};
      fails.forEach(r => { const m = M[r.mat_key], q = m && m.byId[r.item_id]; if (!q) return; const k = r.mat_key + '|' + r.item_id; (by[k] = by[k] || { key: k, mat: m, q, fails: [] }).fails.push(r); });
      Object.values(by).forEach(g => { g.answered = rows.filter(r => r.mat_key === g.mat.key && r.item_id === g.q.id && r.first_ok != null).length; });
      setList(Object.values(by));
    });
    return () => { alive = false; };
  }, [sig]);
  return list;
}
function ntTopics(list, perStudent) {
  const T = {}; (list || []).forEach(g => { const t = ntTag(g.q); if (!t) return; (T[t] = T[t] || new Set()); g.fails.forEach(r => T[t].add(perStudent ? r.item_id + r.mat_key : r.user_id)); });
  return Object.entries(T).map(([t, set]) => ({ t, n: set.size })).sort((a, b) => b.n - a.n).slice(0, 6);
}

/* ═════ 👥 GRUPO ═════ */
function NeuroGroupCard({ group, students, onOpen, only }) {   /* only='ga'|'gf' (GROUP-WS-V1): una sola pestaña, sin encabezado (dentro de una ventana) */
  const list0 = (students || []).filter(s => !ntOut(s)).sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'));
  const [day, setDay] = React.useState(ntDay());
  const [tab, setTab] = React.useState(only || 'ga');
  const [st, reload] = useNtData(list0, day);
  const errs = useNtErrors(list0, (st.res && st.res.rows) || [], 14);
  if (!list0.length) return null;
  const cols = st.cols || [], res = st.res || { rows: [], weeks: [] };
  const models = st.loading ? [] : list0.map(s => ntStudentModel(s, cols, res.rows, res.weeks, res.wk, day));
  const todayN = models.filter(x => x.today > 0).length;
  const groups = (errs || []).slice().sort((a, b) => b.fails.length - a.fails.length).slice(0, 8);
  const topics = ntTopics(errs, false);
  return (
    <section className="nt" data-screen-label="Neuro grupo">
      {!only && <div className="nt-h">
        <div className="t"><span>🧠 Práctica con Neuro · todo el grupo</span><small>Cada círculo se llena con lo que va respondiendo en ▶ Empezar. Toca un nombre para abrir su ficha.</small></div>
        {todayN > 0 && <span className="nt-live"><i></i>{todayN} practicaron hoy</span>}
        <button type="button" className="nt-ib" onClick={reload} title="Actualizar">↻</button>
      </div>}
      {!only && <div className="nt-tabs" role="tablist">
        <button type="button" className={tab === 'ga' ? 'on' : ''} onClick={() => setTab('ga')}>📊 Avance de todos</button>
        <button type="button" className={tab === 'gf' ? 'on' : ''} onClick={() => setTab('gf')}>❌ Lo que más falla el grupo{groups.length ? <span className="n">{groups.length}</span> : null}</button>
      </div>}
      {st.loading ? <div className="nt-empty">Cargando la práctica del grupo…</div>
        : !res.ok ? <div className="nt-empty">⚠ No se pudo leer la práctica desde la nube ({res.err || 'sin conexión'}). <button type="button" className="nt-ib" onClick={reload}>Reintentar</button></div>
        : tab === 'ga' ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}><span className="nt-lbl">Práctica asignada</span><NtDayNav day={day} setDay={setDay} /></div>
            {!cols.length ? <div className="nt-empty">Ese día el grupo no tenía práctica asignada.</div> : (
              <div className="nt-scroll"><table className="nt-gt">
                <thead><tr><th>Alumno</th>{cols.map(c => <th key={c.key}><span className="ic">{ntIco(c.type, c.kind)}</span>{c.label}</th>)}<th><span className="ic">🧠</span>Caja de errores</th><th><span className="ic">⭐</span>Repasos semana</th><th><span className="ic">🕐</span>Última práctica</th></tr></thead>
                <tbody>{models.map(x => {
                  const stale = !x.last || Date.now() - x.last > 3 * 86400e3, dot = x.today ? '#2EA84B' : stale ? '#BDBDBD' : '#F59E00';
                  return (
                    <tr key={x.s.id}>
                      <td><button type="button" className="nt-nm" onClick={() => onOpen && onOpen(x.s.id)}><i style={{ background: dot }}></i>{x.s.fullName}</button></td>
                      {x.cells.map((c, i) => <td key={i}>{c.story ? (c.doneDay ? <span className="nt-bx" style={{ background: '#E8F5E9', color: '#1B5E20' }}>✓ Hecho</span> : <span className="nt-bx" style={{ background: '#F1F3F6', color: '#8A93A3' }}>—</span>) : <NtRing small p={c.pct} color={cols[i].color} done={c.pct >= 100} />}</td>)}
                      <td>{x.box.length ? <span className="nt-bx" style={{ background: '#F3E8FD', color: '#5B3FA0' }}>🧠 {x.box.length}</span> : <span className="nt-bx" style={{ background: '#E8F5E9', color: '#1B5E20' }}>vacía</span>}</td>
                      <td>{x.week ? <span className="nt-bx" style={{ background: '#FFF6D6', color: '#7A5200' }}>⭐ {x.week.done}/{x.week.cap}{x.week.cap && x.week.done >= x.week.cap ? ' ✓' : ''}</span> : <span className="nt-bx" style={{ background: '#F1F3F6', color: '#8A93A3' }}>—</span>}</td>
                      <td style={{ fontSize: 11.5, color: stale ? '#B71C1C' : '#5A6B86' }}>{x.last ? ntWhen(x.last) : (x.s.lastActiveDays == null ? '—' : x.s.lastActiveDays === 0 ? 'Hoy' : 'Hace ' + x.s.lastActiveDays + ' días')}</td>
                    </tr>);
                })}</tbody>
                <tfoot><tr><td>Promedio del grupo</td>{cols.map((c, i) => <td key={i}>{models.length ? Math.round(models.reduce((a, x) => a + x.cells[i].pct, 0) / models.length) : 0}%</td>)}<td>{models.reduce((a, x) => a + x.box.length, 0)} errores</td><td>{models.reduce((a, x) => a + (x.week ? x.week.done : 0), 0)}/{models.reduce((a, x) => a + (x.week ? x.week.cap : 0), 0)}</td><td></td></tr></tfoot>
              </table></div>
            )}
            <div className="nt-note"><span>ℹ️</span><span>✓ = material al 100 % (ya tiene nota). El número = cuánto lleva respondido bien. Story, Quizlet y Resumen se marcan cuando el alumno los abre y cumple. No aparecen retirados, cerrados ni egresados.</span></div>
          </>
        ) : (
          <>
            {errs == null ? <div className="nt-empty">Revisando los errores…</div> : !groups.length ? <div className="nt-empty">En los últimos 14 días nadie falló una pregunta al primer intento. 🎉</div> : (
              <>
                {topics.length > 0 && <><div className="nt-lbl">Temas donde más se equivoca el grupo (últimos 14 días)</div><div className="nt-topics">{topics.map(t => <span key={t.t} className="nt-tp">{t.t} <i>{t.n} de {list0.length}</i></span>)}</div></>}
                <div className="nt-lbl">Las preguntas que más fallan</div>
                {groups.map(g => {
                  const names = g.fails.map(r => (list0.find(s => s.id === r.user_id) || {}).fullName).filter(Boolean).map(n => n.split(' ')[0]);
                  const ans = {}; g.fails.forEach(r => { if (r.first_answer) ans[r.first_answer] = (ans[r.first_answer] || 0) + 1; });
                  const top = Object.entries(ans).sort((a, b) => b[1] - a[1])[0];
                  const pct = g.answered ? Math.round(g.fails.length / g.answered * 100) : 100;
                  return (
                    <div className="nt-qrow" key={g.key}>
                      <div><span className="nt-chip nt-c-mat">{ntIco(g.mat.a.type, g.mat.kind)} {g.mat.num ? 'M' + g.mat.num + ' · ' : ''}{g.mat.label}</span>
                        <div className="nt-q" style={{ marginTop: 6 }}>{ntQText(g.q)}{g.q.kind !== 'identify' && <> → </>}<b>{ntRight(g.q)}</b></div>
                        <small>{top ? <>Error más común: «{top[0]}» · </> : null}{names.join(', ')}</small></div>
                      <div><div className="nt-pct">{g.fails.length} de {g.answered || g.fails.length} fallaron</div><div className="nt-pb"><i style={{ width: pct + '%' }}></i></div></div>
                    </div>);
                })}
              </>
            )}
            <div className="nt-note"><span>💡</span><span>Úsalo para decidir qué repasar en la próxima clase. Solo cuenta el <b>primer intento</b> de cada alumno: lo que corrige después en la caja no esconde el error.{res.answers === false ? ' (Para ver “qué respondió” falta ejecutar el script 37.)' : ''}</span></div>
          </>
        )}
    </section>
  );
}

/* ═════ 👤 FICHA ═════ */
function NeuroStudentCard({ student }) {
  const one = React.useMemo(() => [student], [student.id]);
  const [day, setDay] = React.useState(ntDay());
  const [tab, setTab] = React.useState('av');
  const [flt, setFlt] = React.useState('all');
  const [st, reload] = useNtData(one, day);
  const errs = useNtErrors(one, (st.res && st.res.rows) || [], 14);
  const cols = st.cols || [], res = st.res || { rows: [], weeks: [] };
  const x = st.loading ? null : ntStudentModel(student, cols, res.rows, res.weeks, res.wk, day);
  const now = Date.now(), mats = {}; (errs || []).forEach(g => { mats[g.mat.key] = g.mat; });
  const errRows = (errs || []).map(g => ({ g, r: g.fails[0] })).sort((a, b) => (Date.parse(b.r.last_wrong_at || b.r.updated_at) || 0) - (Date.parse(a.r.last_wrong_at || a.r.updated_at) || 0));
  const stOf = (r) => r.status === 'ok' ? 'ok' : (r.box_round > 0 || r.attempts >= 3) ? 'bad' : 'box';
  const cnt = { all: errRows.length, box: errRows.filter(e => stOf(e.r) === 'box').length, ok: errRows.filter(e => stOf(e.r) === 'ok').length, bad: errRows.filter(e => stOf(e.r) === 'bad').length };
  const shown = errRows.filter(e => flt === 'all' || stOf(e.r) === flt);
  const topics = ntTopics(errs, true).slice(0, 3);
  // caja
  const box = x ? x.box : [], later = box.filter(r => r.due_at && Date.parse(r.due_at) > now);
  const todayLater = later.filter(r => ntDay(Date.parse(r.due_at)) === ntDay()), tomorrow = later.filter(r => ntDay(Date.parse(r.due_at)) !== ntDay());
  const fixed = x ? x.main.filter(r => r.first_ok === false && r.status === 'ok').length : 0, everFail = x ? x.main.filter(r => r.first_ok === false).length : 0;
  // hoy
  const todayRows = x ? x.main.filter(r => ntDay(Date.parse(r.updated_at)) === ntDay()) : [];
  const firstRows = x ? x.main.filter(r => r.first_ok != null) : [], firstPct = firstRows.length ? Math.round(firstRows.filter(r => r.first_ok).length / firstRows.length * 100) : null;
  const graded = x ? x.cells.filter(c => c.grade != null).length : 0, gradable = x ? x.cells.filter(c => !c.story).length : 0;
  // semana
  const wkLog = [0, 0, 0, 0, 0, 0, 0]; if (x && x.week) x.week.rv.forEach(r => { const t = Date.parse(r.ok_at || r.updated_at); if (t) wkLog[ntWd(ntDay(t))]++; });
  const wkMax = Math.max(4, ...wkLog), todayWd = ntWd(ntDay());
  const [wkMats, setWkMats] = React.useState([]);
  React.useEffect(() => { let alive = true; if (!x || !x.week || !x.week.plan.length) { setWkMats([]); return; }
    Promise.all(x.week.plan.map(p => ntMaterial(student.level, p.key).then(m => ({ p, m })))).then(a => alive && setWkMats(a)); return () => { alive = false; }; }, [x && x.week ? x.week.plan.map(p => p.key).join(',') : '']);
  const wkStart = res.wk ? new Date(res.wk + 'T12:00:00Z') : null, wkEnd = wkStart ? new Date(wkStart.getTime() + 6 * 86400e3) : null;

  return (
    <section className="nt" data-screen-label="Neuro ficha">
      <div className="nt-h">
        <div className="t"><span>🧠 Práctica con Neuro</span><small>Lo que hace en ▶ Empezar, en su caja de errores y en los ⭐ repasos de la semana. Se actualiza con cada respuesta.</small></div>
        {x && x.last > 0 && <span className="nt-live" style={ntDay(x.last) === ntDay() ? null : { background: '#F1F3F6', borderColor: '#D6DEEA', color: '#5A6B86' }}>{ntDay(x.last) === ntDay() && <i></i>}Practicó {ntWhen(x.last).toLowerCase()}</span>}
        <button type="button" className="nt-ib" onClick={reload} title="Actualizar">↻</button>
      </div>
      <div className="nt-tabs" role="tablist">
        <button type="button" className={tab === 'av' ? 'on' : ''} onClick={() => setTab('av')}>📊 Avance del día</button>
        <button type="button" className={tab === 'er' ? 'on' : ''} onClick={() => setTab('er')}>❌ Qué falló{cnt.all ? <span className="n">{cnt.all}</span> : null}</button>
        <button type="button" className={tab === 'cj' ? 'on' : ''} onClick={() => setTab('cj')}>🧠 Caja de errores{box.length ? <span className="n">{box.length}</span> : null}</button>
        <button type="button" className={tab === 'rp' ? 'on' : ''} onClick={() => setTab('rp')}>⭐ Repasos de la semana</button>
      </div>
      {st.loading ? <div className="nt-empty">Cargando su práctica…</div>
        : !res.ok ? <div className="nt-empty">⚠ No se pudo leer la práctica desde la nube ({res.err || 'sin conexión'}). <button type="button" className="nt-ib" onClick={reload}>Reintentar</button></div>
        : tab === 'av' ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}><span className="nt-lbl">Práctica asignada</span><NtDayNav day={day} setDay={setDay} /></div>
            {!cols.length ? <div className="nt-empty">Ese día no tenía práctica asignada.</div> : (
              <div className="nt-rings">{cols.map((c, i) => { const v = x.cells[i];
                return (
                  <div className="nt-rg" key={c.key}>
                    <div className="nt-ring" style={{ background: `conic-gradient(${c.color} ${v.pct}%,#E8ECF3 0)` }}><span>{ntIco(c.type, c.kind)}</span></div>
                    <div style={{ minWidth: 0 }}><b>{c.label}</b>
                      {v.story ? <em style={{ color: v.doneDay ? '#1B5E20' : '#8A93A3' }}>{v.doneDay ? '✓ Hecho' : 'Pendiente'}</em>
                        : <><em style={{ color: v.pct >= 100 ? '#1B5E20' : '#33415C' }}>{v.pct >= 100 ? '✓ 100 %' + (v.grade != null ? ' · nota ' + v.grade : '') : v.pct + ' %'}</em><small>{v.ok} de {v.tot}{v.box ? ' · ' + v.box + ' en la caja' : ''}</small></>}
                    </div>
                  </div>); })}</div>
            )}
            <div className="nt-sum">
              <div className="nt-sm"><b>{todayRows.length}</b><span>preguntas respondidas hoy</span></div>
              <div className="nt-sm"><b>{firstPct == null ? '—' : firstPct + ' %'}</b><span>acierta a la primera (21 días)</span></div>
              <div className="nt-sm"><b>{graded} de {gradable}</b><span>materiales del día con nota</span></div>
            </div>
            <div className="nt-note"><span>ℹ️</span><span>La nota de cada material se registra <b>una sola vez</b>, cuando llega al 100 %: es el % que acertó a la primera. Lo que corrige en la caja de errores llena el círculo, pero no sube la nota.</span></div>
          </>
        ) : tab === 'er' ? (
          <>
            {errs == null ? <div className="nt-empty">Revisando sus errores…</div> : !errRows.length ? <div className="nt-empty">En los últimos 14 días no falló ninguna pregunta al primer intento. 🎉</div> : (
              <>
                {topics.length > 0 && <><div className="nt-lbl">Temas donde más se equivoca (últimos 14 días)</div><div className="nt-topics">{topics.map(t => <span key={t.t} className="nt-tp">{t.t} <i>{t.n}</i></span>)}</div></>}
                <div className="nt-flt">{[['all', 'Todos'], ['box', 'En la caja'], ['ok', 'Ya los corrigió'], ['bad', 'Sigue fallando']].map(([k, l]) => <button type="button" key={k} className={flt === k ? 'on' : ''} onClick={() => setFlt(k)}>{l} · {cnt[k]}</button>)}</div>
                {shown.slice(0, 40).map(({ g, r }) => { const s2 = stOf(r);
                  return (
                    <div className="nt-err" key={g.key}>
                      <div className="h"><span className="nt-chip nt-c-mat">{ntIco(g.mat.a.type, g.mat.kind)} {g.mat.num ? 'M' + g.mat.num + ' · ' : ''}{g.mat.label}</span>{ntTag(g.q) && <span className="nt-chip nt-c-tag">{ntTag(g.q)}</span>}
                        {s2 === 'ok' ? <span className="nt-chip nt-c-ok">✓ Lo corrigió</span> : s2 === 'bad' ? <span className="nt-chip nt-c-bad">✗ Falló {Math.max(2, r.box_round + 1)} veces</span> : <span className="nt-chip nt-c-box">🧠 En la caja{r.due_at ? (Date.parse(r.due_at) <= now ? ' · lista para repasar' : ' · se abre ' + ntWhen(Date.parse(r.due_at)).toLowerCase()) : ''}</span>}</div>
                      <div className="nt-q">{ntQText(g.q)}</div>
                      <div className="nt-cmp">{r.first_answer ? <span className="yo">{g.q.kind === 'transform' ? 'Armó' : 'Respondió'}<b>{r.first_answer}</b></span> : null}<span className="ok">Correcta<b>{ntRight(g.q)}</b></span></div>
                      <div className="nt-when">Falló {ntWhen(Date.parse(r.last_wrong_at || r.updated_at)).toLowerCase()}{r.status === 'ok' && r.ok_at ? ' · corregido ' + ntWhen(Date.parse(r.ok_at)).toLowerCase() : ''}</div>
                    </div>); })}
              </>
            )}
            <div className="nt-note"><span>💡</span><span>Cada error muestra la pregunta exacta, qué respondió y cuál era la correcta, para que sepas qué reforzar en clase.{res.answers === false ? ' (Para ver “qué respondió” falta ejecutar el script 37.)' : ''}</span></div>
          </>
        ) : tab === 'cj' ? (
          <>
            <div className="nt-sum">
              <div className="nt-sm"><b>{box.length}</b><span>errores en la caja</span></div>
              <div className="nt-sm"><b>{x.ready.length}</b><span>listos para repasar ahora</span></div>
              <div className="nt-sm"><b>{todayLater.length}</b><span>se abren hoy{todayLater.length ? ' (' + todayLater.slice(0, 2).map(r => ntTime(Date.parse(r.due_at))).join(' · ') + ')' : ''}</span></div>
              <div className="nt-sm"><b>{tomorrow.length}</b><span>volvió a fallar → otro día</span></div>
            </div>
            <div className="nt-lbl">Cómo le va con sus errores (últimos 21 días)</div>
            <div className="nt-sum">
              <div className="nt-sm" style={{ background: '#E8F5E9' }}><b style={{ color: '#1B5E20' }}>{fixed} de {everFail}</b><span>errores que ya corrigió</span></div>
              <div className="nt-sm" style={{ background: '#FFF4E5' }}><b style={{ color: '#7A4A00' }}>{x.main.filter(r => r.status === 'box' && r.box_round > 0).length}</b><span>falló 2 veces o más</span></div>
            </div>
            <div className="nt-note"><span>🧠</span><span>Cada error vuelve 2 horas después, y al día siguiente si lo falla otra vez. La hora la pone el servidor. Aquí ves si repasa sus errores o los deja acumular.</span></div>
          </>
        ) : (
          <>
            {!x.week ? <div className="nt-empty">Esta semana todavía no abrió sus repasos (se arman la primera vez que entra a Mi práctica en la semana).</div> : (
              <>
                <div className="nt-wk">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', fontSize: 13, fontWeight: 800, color: '#5A3E00' }}><span>⭐ <b>{x.week.done} de {x.week.cap}</b> ejercicios resueltos</span>{wkStart && <span>Semana {wkStart.getUTCDate()}–{wkEnd.getUTCDate()} {NT_MON[wkEnd.getUTCMonth()]}</span>}</div>
                  <div className="nt-bar"><i style={{ width: (x.week.cap ? Math.min(100, x.week.done / x.week.cap * 100) : 0) + '%' }}></i></div>
                  <div className="nt-days">{NT_DAYN.map((d, i) => <div key={i} style={i === todayWd ? { color: '#1E2433' } : null}><div className="c"><i style={{ height: (wkLog[i] / wkMax * 100) + '%' }}></i></div>{i === todayWd ? 'Hoy' : d}</div>)}</div>
                </div>
                <div className="nt-rings">{wkMats.filter(w => w.m).map((w, i) => { const okN = x.week.rv.filter(r => r.mat_key === 'rv:' + res.wk + ':' + w.p.key && w.p.ids.indexOf(r.item_id) >= 0).length, tot = w.p.ids.length, p = tot ? Math.round(okN / tot * 100) : 0, col = NT_COLORS[(i + 3) % NT_COLORS.length];
                  return <div className="nt-rg" key={w.p.key}><div className="nt-ring" style={{ background: `conic-gradient(${col} ${p}%,#E8ECF3 0)` }}><span>{ntIco(w.m.a.type, w.m.kind)}</span></div><div style={{ minWidth: 0 }}><b>{w.m.num ? 'M' + w.m.num + ' · ' : ''}{w.m.label}</b><em style={{ color: p >= 100 ? '#1B5E20' : '#7A5200' }}>{p >= 100 ? '✓ ' : ''}{okN} de {tot}</em></div></div>; })}</div>
              </>
            )}
            <div className="nt-note"><span>⭐</span><span>Los repasos son <b>opcionales</b> y nunca le quitan nota. Te sirven para ver si vuelve a lo de módulos anteriores. Cada lunes le llegan repasos nuevos.</span></div>
          </>
        )}
    </section>
  );
}

Object.assign(window, { NeuroGroupCard, NeuroStudentCard });
