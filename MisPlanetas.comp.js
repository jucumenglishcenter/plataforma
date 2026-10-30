/* 🪐 MisPlanetas.comp.js · MIS-PLANETAS-V1 (30-oct-2026) — sección «Examen» del alumno aprobada por la usuaria en
 * «Propuesta - Examen del alumno v10 - mis planetas.html»: una galaxia con SOLO los exámenes del nivel (un planeta por
 * examen, en zigzag, unidos por una vía que se pinta de dorado). Aprobado = planeta DORADO con ✓ y su nota; el próximo
 * lleva el anillo verde de «apto»; tocarlo abre su tarjeta. Al aprobar, el planeta se transforma (una sola vez).
 *  · TODA la lógica de examen es la de siempre: JUCUM_EXAMFLOW.infoForModule (fase, apertura, enlace por parte, habilitados,
 *    pausa, recuperación) + la nota AUTOMÁTICA de diagnostic_attempts con notaOficialPartes / notaExamen (mismo cálculo que
 *    ModuleExamBanner). Aquí no se decide quién puede rendir: solo se muestra.
 *  · Examen abierto: SIN casillas que marcar (pedido 30-oct): 3 recordatorios y el botón listo.
 *  · Neuro guía: lo que le falta para ser apto, ordenado por lo que más suma (pilares de getStudentReadiness), con «Ir». */
(function mpCss() {
  if (document.getElementById('mp-css')) return;
  const el = document.createElement('style'); el.id = 'mp-css';
  el.textContent = [
    '.mp-wrap{position:relative;background:#13255E;color:#fff;border-radius:24px;overflow:hidden;padding:14px 12px 18px;max-width:560px;margin:8px auto 0}',
    '.mp-wrap:before{content:"";position:absolute;inset:0;background-image:radial-gradient(#fff 1px,transparent 1.5px),radial-gradient(#fff .8px,transparent 1.2px);background-size:90px 110px,57px 73px;background-position:10px 20px,40px 60px;opacity:.28;pointer-events:none}',
    '.mp-goal{position:relative;background:#1C2F6B;border:1.5px solid rgba(255,255,255,.1);border-radius:16px;padding:10px 12px;display:flex;flex-direction:column;gap:7px}',
    '.mp-r1{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:900;color:#E8ECF8}.mp-r1 b{margin-left:auto;color:#FFC531;white-space:nowrap}',
    '.mp-seg{display:flex;gap:4px}.mp-seg span{flex:1;height:22px;border-radius:7px;background:#2C3F7E;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:#7F8DBA}',
    '.mp-seg span.on{background:#FFC531;color:#6B4A00;box-shadow:0 3px 0 #D9A000}.mp-seg span.nx{border:2px dashed #FFC531;color:#FFC531}',
    '.mp-seg span.sp{flex:1.5;display:flex;gap:2px;background:none;border:0;padding:0;box-shadow:none}.mp-seg span.sp i{flex:1;height:22px;border-radius:7px;background:#2C3F7E;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:9.5px;font-weight:900;color:#7F8DBA}',
    '.mp-seg span.sp i.on{background:#FFC531;color:#6B4A00;box-shadow:0 3px 0 #D9A000}.mp-seg span.sp.nx i:not(.on){border:2px dashed #FFC531;color:#FFC531}',
    '.mp-nl{display:flex;align-items:center;gap:9px;background:rgba(255,255,255,.06);border-radius:12px;padding:6px 9px;font-size:12.5px;font-weight:800;color:#E8ECF8;line-height:1.35}.mp-nl b{color:#FFC531}',
    '.mp-neu{position:relative;width:34px;height:30px;flex-shrink:0}.mp-neu .b{position:absolute;inset:0;border-radius:48% 48% 44% 44%/54% 54% 46% 46%;background:radial-gradient(circle at 38% 30%,#FFB3D1,#FF6FA5)}',
    '.mp-neu i{position:absolute;top:8px;width:9px;height:9px;background:#fff;border-radius:50%;box-shadow:0 0 0 1px rgba(122,23,51,.45);z-index:1}.mp-neu i.l{left:6px}.mp-neu i.r{right:6px}.mp-neu i:after{content:"";position:absolute;top:2.5px;left:2.5px;width:4px;height:4px;background:#2A2A2A;border-radius:50%}',
    '.mp-neu u{position:absolute;left:50%;bottom:5px;width:10px;height:5px;margin-left:-5px;background:#7A1733;border-radius:0 0 6px 6px}.mp-neu.o u{width:6px;height:6px;margin-left:-3px;border-radius:50%}',
    '.mp-map{position:relative;margin:6px auto 0}',
    '.mp-it{position:absolute;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;z-index:1}',
    '.mp-pl{position:relative;width:76px;height:76px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:0;padding:0;cursor:pointer;font-family:inherit;transition:transform .15s}',
    '.mp-pl:active{transform:translateY(3px)}.mp-pl .e{font-size:32px;line-height:1}',
    '.mp-pl.next{background:radial-gradient(circle,#E4FAFD 0 62%,#34C6DB 63%);box-shadow:0 7px 0 #0D1B47}',
    '.mp-pl.gold{background:radial-gradient(circle,#FFF4CC 0 62%,#FFC531 63%);box-shadow:0 7px 0 #8A6400,0 0 0 6px rgba(255,197,49,.18)}',
    '.mp-pl.half{background:radial-gradient(circle,#E4FAFD 0 62%,transparent 63%),conic-gradient(#FFC531 0 50%,#34C6DB 0 100%);box-shadow:0 7px 0 #0D1B47}',
    '.mp-pl.lock{background:radial-gradient(circle,#3A4E9A 0 62%,#2C3F7E 63%);box-shadow:0 6px 0 #1C2C60}.mp-pl.lock .e{filter:grayscale(1);opacity:.5}',
    '.mp-ok{position:absolute;right:-3px;top:-3px;width:24px;height:24px;border-radius:50%;background:#58CC02;border:2.5px solid #13255E;display:flex;align-items:center;justify-content:center}',
    '.mp-ok:after{content:"";width:9px;height:5px;border:solid #fff;border-width:0 0 3px 3px;transform:rotate(-45deg) translate(1px,-1px)}',
    '.mp-gb{position:absolute;left:50%;bottom:-9px;transform:translateX(-50%);background:#FFC531;color:#6B4A00;border:2px solid #13255E;border-radius:10px;padding:0 7px;font-size:12px;font-weight:900;white-space:nowrap}.mp-gb.o{background:#FF9600;color:#fff}',
    '.mp-apt{position:relative;width:112px;height:112px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:conic-gradient(#58CC02 calc(var(--p)*1%),rgba(255,255,255,.14) 0)}',
    '.mp-apt:before{content:"";position:absolute;inset:9px;border-radius:50%;background:#13255E}.mp-apt .mp-pl{z-index:1}',
    '@keyframes mpRing{0%{box-shadow:0 0 0 0 rgba(88,204,2,.7)}70%{box-shadow:0 0 0 16px rgba(88,204,2,0)}100%{box-shadow:0 0 0 0 rgba(88,204,2,0)}}.mp-apt.open{animation:mpRing 1.6s ease-out infinite}',
    '@keyframes mpBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}.mp-apt.tap{animation:mpBob 2.2s ease-in-out infinite}.mp-apt.open.tap{animation:mpRing 1.6s ease-out infinite}',
    '.mp-pc{position:absolute;right:-12px;top:-4px;z-index:2;background:#fff;color:#13255E;border-radius:10px;padding:2px 7px;font-size:11.5px;font-weight:900;box-shadow:0 3px 0 #B8C3E0;white-space:nowrap}.mp-pc.ok{background:#58CC02;color:#fff;box-shadow:0 3px 0 #3E9A00}',
    '.mp-tag{position:relative;z-index:2;margin-top:12px;font-size:11.5px;font-weight:900;white-space:nowrap;border-radius:10px;padding:3px 9px;background:#2A3C7A;color:#E8ECF8;box-shadow:0 0 0 3px #13255E}',
    '.mp-tag.y{background:#FFC531;color:#13255E}.mp-tag.g{background:#58CC02;color:#fff}.mp-tag.o{background:#FF9600;color:#fff}',
    '.mp-ov{position:fixed;inset:0;z-index:1200;background:rgba(8,14,40,.62);display:flex;align-items:flex-end;justify-content:center}',
    '@keyframes mpUp{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}',
    '.mp-sh{position:relative;width:100%;max-width:480px;max-height:86vh;overflow-y:auto;background:#13255E;color:#fff;border-radius:22px 22px 0 0;padding:16px 14px 20px;animation:mpUp .25s ease-out;display:flex;flex-direction:column;gap:10px}',
    '.mp-x{position:absolute;right:12px;top:12px;width:32px;height:32px;border-radius:50%;border:0;background:rgba(255,255,255,.1);color:#C3CBE6;font-size:14px;font-weight:900;cursor:pointer}',
    '.mp-card{background:#1C2F6B;border:1.5px solid rgba(255,255,255,.1);border-radius:18px;padding:13px 14px;display:flex;flex-direction:column;gap:9px}',
    '.mp-h{font-family:"Fredoka",sans-serif;font-weight:600;font-size:19px;line-height:1.2;color:var(--a,#8EE6F2);padding-right:36px}',
    '.mp-s{font-size:13px;font-weight:700;color:#C3CBE6;line-height:1.5}.mp-s b{color:#fff}',
    '.mp-rw{display:flex;gap:6px}.mp-rw span{flex:1;background:rgba(255,255,255,.07);border-radius:11px;padding:6px 3px;text-align:center;font-size:10.5px;font-weight:900;color:#C3CBE6}',
    '.mp-rw span b{display:block;font-family:"Fredoka",sans-serif;font-weight:600;font-size:19px;color:#fff}',
    '.mp-cta{display:block;text-align:center;border:0;border-radius:14px;background:#FFC531;color:#13255E;font-weight:900;font-size:14.5px;letter-spacing:.04em;text-transform:uppercase;padding:13px;box-shadow:0 5px 0 #D9A000;width:100%;cursor:pointer;text-decoration:none;font-family:inherit}',
    '.mp-cta.g{background:#58CC02;color:#fff;box-shadow:0 5px 0 #3E9A00}.mp-cta.o{background:#FF9600;color:#fff;box-shadow:0 5px 0 #C77300}',
    '.mp-cta.off{background:rgba(255,255,255,.08);color:#8D98C2;box-shadow:none;cursor:default}',
    '.mp-rec{display:flex;flex-direction:column;gap:5px;background:rgba(255,255,255,.07);border-radius:12px;padding:9px 11px;font-size:13px;font-weight:800;color:#E8ECF8}.mp-rec b{font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#8BE34A}',
    '.mp-bar{position:relative;height:10px;border-radius:6px;background:rgba(255,255,255,.12);overflow:visible}.mp-bar span{position:absolute;left:0;top:0;bottom:0;border-radius:6px}.mp-bar i{position:absolute;top:-3px;bottom:-3px;left:75%;width:2px;background:#fff}',
    '.mp-td{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.06);border-radius:12px;padding:8px 10px}.mp-td .i{font-size:20px}',
    '.mp-td .xx{flex:1;min-width:0;display:flex;flex-direction:column;font-size:13px;font-weight:800;line-height:1.3}.mp-td .xx small{font-size:11px;font-weight:700;color:#9AA6CF}',
    '.mp-go{border:0;font-family:inherit;font-size:11.5px;font-weight:900;color:#13255E;background:#FFC531;border-radius:9px;padding:6px 9px;white-space:nowrap;box-shadow:0 3px 0 #D9A000;cursor:pointer}',
    '.mp-pt{display:flex;align-items:center;gap:9px;border-radius:12px;padding:9px 12px;font-size:13px;font-weight:800;background:rgba(255,255,255,.07)}.mp-pt.ok{background:rgba(255,197,49,.16);color:#FFE08A}',
    '@keyframes mpMorph{0%{background:radial-gradient(circle,#E4FAFD 0 62%,#34C6DB 63%);transform:scale(1)}30%{transform:scale(1.16) rotate(-6deg)}50%{background:#fff;box-shadow:0 7px 0 #DDD,0 0 0 22px rgba(255,255,255,.3);transform:scale(1.2) rotate(4deg)}75%{background:radial-gradient(circle,#FFF4CC 0 62%,#FFC531 63%);box-shadow:0 7px 0 #8A6400}100%{background:radial-gradient(circle,#FFF4CC 0 62%,#FFC531 63%);box-shadow:0 7px 0 #8A6400,0 0 0 8px rgba(255,197,49,.2);transform:scale(1)}}',
    '.mp-morph{width:120px;height:120px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:52px;animation:mpMorph 2.2s ease-in-out both;position:relative}',
    '@keyframes mpPop{0%,60%{transform:scale(0);opacity:0}100%{transform:scale(1);opacity:1}}.mp-morph .mp-ok,.mp-morph .mp-gb{animation:mpPop 2.4s ease-out both}',
    '@keyframes mpConf{0%{transform:translate(0,0) rotate(0);opacity:1}100%{transform:translate(var(--x),var(--y)) rotate(320deg);opacity:0}}.mp-cf{position:absolute;left:50%;top:50%;width:8px;height:12px;border-radius:2px;animation:mpConf 1.6s 1.4s ease-out both}',
    '@media (prefers-reduced-motion:reduce){.mp-apt.open,.mp-apt.tap,.mp-sh,.mp-cf{animation:none}.mp-morph,.mp-morph .mp-ok,.mp-morph .mp-gb{animation-duration:.01s}}',
  ].join('');
  document.head.appendChild(el);
})();

/* ✅ Módulos que la teacher dio por COMPLETADOS sin nota (pedido 30-oct-2026, SOLO este grupo): el planeta sale dorado con ✓,
 * sin número, y no festeja. No toca notas ni otras pantallas. Grupo → ids de módulo. */
const MP_DONE_SIN_NOTA = { 'df4b0fa8-048e-4840-999d-f6e73ec2657b': ['pa1-m1', 'pa1-m2'] };   // Pre-A1 - Lunes y Viernes
const MP_LVL = { 'pre-a1': 'Pre-A1', a1: 'A1', a2: 'A2' };
const MP_DOW = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
function mpShort(d) { if (!d) return ''; const x = window.JUCUM_DAY.parse(d); return MP_DOW[x.getDay()] + ' ' + x.getDate(); }
function MpNeu({ o }) { return <span className={'mp-neu' + (o ? ' o' : '')} aria-hidden="true"><span className="b"></span><i className="l"></i><i className="r"></i><u></u></span>; }

/* Nota automática (diagnostic_attempts + respaldo del registro de práctica) — MISMO cálculo que ModuleExamBanner */
function mpAtt(student, mod, info, rows) {
  const D = window.JUCUM_DATA, F = window.JUCUM_EXAMFLOW;
  const exam = info && info.exam;
  if (!exam || info.isForms || info.phase === 'none') return null;
  const slugs = (exam.parts || []).map(p => (((p.url || '').match(/\/(m\d+)\/examen/) || [])[1])).filter(Boolean);
  const desde0 = F.desdePara ? F.desdePara(exam, student.group, student.id) : (F.examDesde ? F.examDesde(exam) : null);
  const ret0 = F.getRet ? F.getRet(student.group, mod.id) : null;
  const rs = (rows || []).filter(r => (r.module_id === 'exam-' + exam.id || slugs.some(sl => r.activity_id === 'examen-' + sl)) && (F.despuesDe ? F.despuesDe(r.created_at, desde0) : (!desde0 || window.JUCUM_DAY.of(r.created_at) >= desde0)));
  if (rs.length) {
    const of0 = F.notaOficialPartes ? F.notaOficialPartes(rs.map(r => ({ score: r.score, date: r.created_at, part: F.canonPart ? F.canonPart(exam, r.activity_id) : r.activity_id })), ret0, desde0) : null;
    const src = (of0 && rs.find(r => r.created_at === of0.date)) || rs[0];
    const best = Object.assign({}, src, of0 ? { score: of0.score } : {});
    best._n = rs.length; best._recu = !!(of0 && of0.isRecovery);
    if (of0) { best._detalle = of0.detalle; best._totalPartes = of0.totalPartes; }
    if (of0 && F.notaExamen) { const adj = F.notaExamen(exam, of0); if (adj && adj.parcial) { best.score = adj.score; best._parcial = true; best._falta = adj.falta; } }
    return best;
  }
  const comp = (D.getStudentProgress(student.id) || {}).completed || {};
  const ks = Object.keys(comp).filter(k => k.indexOf('exam-' + exam.id + ':') === 0);
  if (!ks.length) return null;
  const rws = ks.map(k => ({ score: (comp[k] || {}).score, date: (comp[k] || {}).date, part: F.canonPart ? F.canonPart(exam, k.split(':').slice(1).join(':')) : k.split(':').slice(1).join(':') })).filter(r => typeof r.score === 'number');
  const of1 = (rws.length && F.notaOficialPartes) ? F.notaOficialPartes(rws, ret0, desde0) : null;
  if (!of1) return null;
  const best = { score: of1.score, created_at: of1.date, _n: of1.intentos, sections: null, fromProgress: true, _recu: of1.isRecovery, _detalle: of1.detalle, _totalPartes: of1.totalPartes };
  if (F.notaExamen) { const adj = F.notaExamen(exam, of1); if (adj && adj.parcial) { best.score = adj.score; best._parcial = true; best._falta = adj.falta; } }
  return best;
}

/* Nube: ventanas del grupo (lo que la profesora abre llega sin recargar) + intentos del alumno (nota automática) */
function useMpCloud(student) {
  const [st, setSt] = React.useState({ rows: null, err: false });
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 30000);
    const f = () => setTick(t => t + 1);
    window.addEventListener('focus', f); window.addEventListener('jucum:examflow', f);
    return () => { clearInterval(iv); window.removeEventListener('focus', f); window.removeEventListener('jucum:examflow', f); };
  }, []);
  React.useEffect(() => {
    let dead = false;
    (async () => {
      const SBW = window.JUCUM_SB, X = window.JUCUM_EXAMS;
      const sb = SBW && SBW.getClient ? SBW.getClient() : null;
      if (!sb) { if (!dead) setSt(s => ({ rows: s.rows || [], err: true })); return; }
      try { const w = await sb.from('exam_windows').select('*').eq('group_id', student.group); if (!dead && !w.error && Array.isArray(w.data) && X && X.mergeCloudWindows) X.mergeCloudWindows(w.data); } catch (e) {}
      let res = null;
      try {
        res = await Promise.race([
          sb.from('diagnostic_attempts').select('score,correct,total,sections,created_at,activity_id,module_id,attempt_no').eq('user_id', student.id).order('created_at', { ascending: true }).limit(1000),
          new Promise(r => setTimeout(() => r({ timeout: true }), 12000)),
        ]);
      } catch (e) { res = { error: e }; }
      if (dead) return;
      const ok = res && !res.error && !res.timeout && Array.isArray(res.data);
      setSt(s => ({ rows: ok ? res.data : (s.rows || []), err: !ok }));
    })();
    return () => { dead = true; };
  }, [student.id, student.group, tick]);
  return st;
}

function mpPlanets(student, rows) {
  const D = window.JUCUM_DATA, F = window.JUCUM_EXAMFLOW, X = window.JUCUM_EXAMS;
  const mods = D.MODULE_CATALOG[student.level] || [], out = [];
  mods.forEach((m, i) => { if (X.examForModule(m.id, student.level)) out.push({ mod: m, label: 'M' + (i + 1), emoji: m.emoji || '🪐' }); });
  (F.standaloneExams ? F.standaloneExams(student.level) : []).forEach(e => out.push({ mod: { id: 'exam:' + e.id, name: e.title, emoji: '🎓', activities: [] }, label: 'Final', emoji: '🎓', final: true }));
  const min = F.minGradeFor ? F.minGradeFor(student.group) : 75;
  out.forEach(p => {
    p.info = F.infoForModule(student, p.mod);
    p.att = rows ? mpAtt(student, p.mod, p.info, rows) : null;
    p.min = min;
    /* 📝 nota a mano / Google Forms (30-oct, auditoría): mismo origen que el Boletín. Sin esto, quien rindió el M1
     * por Forms veía su M1 «sin rendir». Respeta el corte de «nota nueva» (NUEVA-NOTA-V1). */
    let man = null;
    try {
      if (p.final) { const w = X.windowForExamGroup && p.info.exam ? X.windowForExamGroup(p.info.exam.id, student.group) : null; const r = w && w.results ? w.results[student.id] : null; if (r) man = { grade: typeof r.grade === 'number' ? r.grade : null, passed: r.passed, gradedAt: r.gradedAt || '', feedback: r.feedback }; }
      else if (D.getModuleExamResult) man = D.getModuleExamResult(student, p.mod.id);
      const fr = p.info.exam && F.freshFor ? F.freshFor(p.info.exam, student.group, student.id) : null;
      if (man && fr && F.despuesDe && !F.despuesDe(man.gradedAt, fr)) man = null;
    } catch (e) { man = null; }
    p.man = man;
    const mg = man ? (typeof man.grade === 'number' ? man.grade : null) : null;
    if (p.info.phase === 'done') { const r = p.info.result || {}; p.grade = typeof r.grade === 'number' ? r.grade : null; p.kind = r.passed ? 'gold' : 'fail'; }
    else if (p.att && !(man && !p.att._parcial && mg != null && mg > p.att.score)) { p.grade = p.att.score; p.kind = p.att._parcial ? 'half' : (p.att.score >= min ? 'gold' : 'fail'); }
    else if (man) { p.grade = mg; p.kind = (mg != null ? mg >= min : !!man.passed) ? 'gold' : 'fail'; p.byMan = true; }
    else p.kind = 'none';
    if ((MP_DONE_SIN_NOTA[student.group] || []).indexOf(p.mod.id) >= 0) { p.kind = 'gold'; p.grade = null; p.noGrade = true; p.byMan = false; }
    p.date = p.att && !p.byMan ? window.JUCUM_DAY.of(p.att.created_at) : (man && man.gradedAt ? window.JUCUM_DAY.of(man.gradedAt) : (p.info.result && p.info.result.date) || null);
  });
  const live = (p) => p.kind !== 'gold' && !(p.byMan && p.kind === 'fail' && !(p.info.phase === 'today' || p.info.phase === 'announced')) && (p.kind === 'half' || p.info.phase === 'today' || p.info.phase === 'announced' || p.info.paused ||
    (p.kind === 'fail' && F.retOpenFor && (() => { const r = F.retOpenFor(student, p.mod.id, true); return r.has && r.inScope && (r.active || F.pDay() < r.ret.from); })()));
  let cur = out.findIndex(live);
  /* auditoría 30-oct: un examen SIN rendir que quedó ANTES de otros ya rendidos no es «el próximo» (caso Jhia: M3 sin
   * rendir con M4–Final dorados) → queda como «sin rendir»; el próximo solo puede estar después del último rendido. */
  let lastDone = -1; out.forEach((p, i) => { if (p.kind !== 'none') lastDone = i; });
  if (cur < 0) { const fm = D.getFocusModuleId ? D.getFocusModuleId(student) : null; cur = out.findIndex((p, i) => i > lastDone && p.mod.id === fm && p.kind !== 'gold'); }
  if (cur < 0) cur = out.findIndex((p, i) => i > lastDone && p.kind === 'none');
  out.forEach((p, i) => {
    p.cur = i === cur;
    if (p.kind === 'none') p.kind = i === cur ? 'next' : (i < lastDone || (cur >= 0 && i < cur)) ? 'miss' : 'lock';
  });
  return { list: out, cur };
}

function mpHorario(F, ann) {
  if (!ann) return '';
  return (ann.from ? F.fmtHora(ann.from) + (ann.to ? ' – ' + F.fmtHora(ann.to) : '') : 'todo el día') + (ann.dateTo && ann.dateTo !== ann.date ? ' · hasta el ' + F.fmtFecha(ann.dateTo) : '');
}
function mpTag(p, F) {
  const inf = p.info;
  if (p.kind === 'gold') return ['y', p.label + (p.noGrade ? ' ✓ completado' : ' ✓')];
  if (p.kind === 'fail') return ['o', (p.grade != null ? p.grade + ' · ' : '') + '¡casi!'];
  if (p.kind === 'half') return ['y', 'Te falta la ' + (p.att && p.att._falta ? p.att._falta : 'otra parte')];
  if (p.kind === 'lock') { const np = p.final && p.info.exam && F.partesDeExamen ? F.partesDeExamen(p.info.exam).length : 0; return ['', p.final ? '🏁 Final' + (np > 1 ? ' · ' + np + ' partes' : '') : p.label]; }
  if (p.kind === 'miss') return ['', (p.final ? '🏁 Final' : p.label) + ' · sin rendir'];
  if (inf.phase === 'today') { const h = inf.ann && (F.abiertoAhoraHasta && F.abiertoAhoraHasta(inf.ann) ? new Date(Date.parse(inf.ann.openUntil) - 5 * 3600000).toISOString().slice(11, 16) : inf.ann.to); return ['g', '¡Abierto' + (h ? ' hasta ' + F.fmtHora(h) : '') + '!']; }
  if (inf.phase === 'announced' && inf.ann && inf.ann.date) return inf.days === 0 || inf.isToday ? ['y', 'HOY' + (inf.ann.from ? ' · ' + F.fmtHora(inf.ann.from) : '')] : ['', 'Examen · ' + mpShort(inf.ann.date)];
  if (inf.phase === 'waitgrade') return ['', 'Ya cerró'];
  return ['', 'Aún sin fecha'];
}

/* ⭐ Pantalla «Mis planetas» */
function MisPlanetas({ student, onBack, onPractice, onTasks }) {
  const D = window.JUCUM_DATA, F = window.JUCUM_EXAMFLOW;
  const cloud = useMpCloud(student);
  const [open, setOpen] = React.useState(null);
  const [celebrate, setCelebrate] = React.useState(null);
  const lvl = MP_LVL[student.level] || String(student.level).toUpperCase();
  const ready = cloud.rows !== null;
  const { list, cur } = ready ? mpPlanets(student, cloud.rows) : { list: [], cur: -1 };
  const golds = list.filter(p => p.kind === 'gold').length, total = list.length, all = total > 0 && golds === total;
  /* celebración una sola vez por examen aprobado (clave chiquita); los aprobados hace más de 14 días se marcan sin festejo */
  React.useEffect(() => {
    if (!ready || celebrate) return;
    const KEY = 'jucum_planetas_vistos_v1';
    let seen = {}; try { seen = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
    const mine = seen[student.id] = seen[student.id] || [];
    const lim = window.JUCUM_DAY.add(window.JUCUM_DAY.today(), -14);
    let show = null, changed = false;
    list.forEach(p => { const id = p.info.exam && p.info.exam.id; if (p.kind !== 'gold' || !id || mine.indexOf(id) >= 0) return; mine.push(id); changed = true; if (!show && !p.noGrade && (!p.date || p.date >= lim)) show = p; });
    if (changed) { try { if (window.JUCUM_STORE) window.JUCUM_STORE.setJSON(KEY, seen); else localStorage.setItem(KEY, JSON.stringify(seen)); } catch (e) {} }
    if (show) setCelebrate(show);
  }, [ready, golds]);

  const W = 300, ROW = 112, EXTRA = 34, TOP = 62, BOT = 78;
  const OFF = [0, -70, 52, -60, 64, -46, 56, -64];
  /* el planeta actual (anillo de 112px + etiqueta) lleva espacio extra arriba y abajo */
  const gaps = list.slice(1).map((p, i) => ROW + ((i === cur || i + 1 === cur) ? EXTRA : 0));
  /* 30-oct (pedido): el recorrido va de ARRIBA hacia ABAJO — M1 arriba, el Final abajo como la recta final */
  const pos = []; let yy = TOP + (cur === 0 ? EXTRA / 2 : 0);
  list.forEach((p, i) => { if (i) yy += gaps[i - 1]; pos.push({ x: W / 2 + OFF[i % OFF.length], y: yy }); });
  const H = total ? yy + BOT + (cur === total - 1 ? EXTRA / 2 : 0) : 0;
  /* al abrir, la página baja sola hasta el planeta actual (o el último dorado) */
  const mapRef = React.useRef(null), scrolled = React.useRef(false);
  React.useEffect(() => {
    if (!ready || scrolled.current || !mapRef.current || !total) return;
    scrolled.current = true;
    const k = cur >= 0 ? cur : (() => { let g = 0; list.forEach((p, i) => { if (p.kind === 'gold') g = i; }); return g; })();
    const el = mapRef.current, target = el.getBoundingClientRect().top + pos[k].y;
    let sc = el.parentElement; while (sc && sc !== document.body && !(sc.scrollHeight > sc.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
    const vh = (sc && sc !== document.body ? sc.clientHeight : window.innerHeight);
    const delta = target - vh / 2 - (sc && sc !== document.body ? sc.getBoundingClientRect().top : 0);
    if (Math.abs(delta) > 40) { if (sc && sc !== document.body) sc.scrollTop += delta; else window.scrollTo({ top: window.scrollY + delta, behavior: 'smooth' }); }
  }, [ready, total]);
  const curP = cur >= 0 ? list[cur] : null;
  const msg = (() => {
    if (all) return <span>¡Lo logramos! Completaste todo <b>{lvl}</b>. 🎉</span>;
    if (!curP) return <span>¡Vamos! Tu próximo examen aparecerá aquí.</span>;
    const last = cur === total - 1 ? <><b>¡Es el último examen de {lvl}!</b> </> : null;
    const inf = curP.info, r = inf.r || { overall: 0 };
    if (curP.kind === 'half') return <span>{last}¡Vas a medio camino! Te falta la <b>{curP.att._falta}</b>.</span>;
    if (curP.kind === 'fail') return <span>¡Faltó poquito! Toca tu planeta y te digo <b>qué repasar</b>.</span>;
    if (inf.phase === 'today') return <span>{last}<b>¡Tu examen está abierto!</b> Toca el planeta para empezar.</span>;
    if (inf.paused) return <span>Tu acceso está en pausa. Escríbele a tu teacher. 💬</span>;
    if (inf.phase === 'waitgrade') return <span>Ese examen ya cerró. Toca el planeta para ver qué sigue.</span>;
    const habil = inf.canTake && !r.apt;
    if (inf.phase === 'announced' && (r.apt || habil)) return <span>{last}¡{r.apt ? 'Eres apto' : 'Tu teacher te habilitó'}! Tu examen es el <b>{mpShort(inf.ann && inf.ann.date)}</b>.</span>;
    if (!r.apt) return <span>{last}Para ser apto te falta <b>{Math.max(0, 75 - r.overall)} %</b>{r.blocker === 'coverage' ? ' de tus prácticas' : ''}. Toca el planeta y te digo qué hacer.</span>;
    return <span>{last}¡Eres apto! Tu examen aún no tiene fecha.</span>;
  })();

  return (
    <main>
      <button className="back-btn" onClick={onBack}>← Volver al panel</button>
      <div className="mp-wrap">
        <div style={{position:'relative', display:'flex', alignItems:'center', gap:8, padding:'0 4px 10px'}}>
          <span style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:20, flex:1}}>🪐 Mis planetas</span>
          {total > 0 && <span style={{fontSize:12, fontWeight:900, color:'#FFC531', background:'rgba(255,197,49,.14)', borderRadius:10, padding:'4px 9px', whiteSpace:'nowrap'}}>{golds}/{total} dorados</span>}
        </div>
        {!ready ? <div className="mp-goal" style={{alignItems:'center', padding:'26px 12px', fontWeight:800, color:'#C3CBE6'}}>Cargando tus planetas…</div>
          : !total ? <div className="mp-goal"><div className="mp-nl"><MpNeu /><span>Tu teacher aún no publicó exámenes para {lvl}. Cuando haya, aparecerán aquí como planetas. 🪐</span></div></div>
          : <>
            <div className="mp-goal">
              <div className="mp-r1"><span style={{whiteSpace:'nowrap'}}>🏁 Meta: {lvl}</span><b>{golds}/{total} · {all ? '¡completo!' : '¡te falta' + (total - golds > 1 ? 'n ' + (total - golds) : ' 1') + '!'}</b></div>
              <div className="mp-seg">{list.map((p, i) => {
                /* 🏁 el Final (2 partes) es UNA ficha partida en dos: cada mitad se pinta al rendir su parte */
                const ps = p.final && p.info.exam && F.partesDeExamen ? F.partesDeExamen(p.info.exam) : [];
                if (ps.length > 1) return <span key={i} className={'sp' + (i === cur && p.kind !== 'gold' ? ' nx' : '')} title={'Final · ' + ps.length + ' partes'}>{ps.map((pt, k) => <i key={k} className={p.kind === 'gold' || (p.att && (p.att._detalle || []).some(d => d.part === pt.key)) ? 'on' : ''}>F{k + 1}</i>)}</span>;
                return <span key={i} className={p.kind === 'gold' ? 'on' : i === cur ? 'nx' : ''}>{p.label}</span>; })}</div>
              <div className="mp-nl"><MpNeu o={curP && curP.kind === 'fail'} />{msg}</div>
              {cloud.err && <div style={{fontSize:11.5, fontWeight:800, color:'#FFB14D'}}>⚠ No pude traer tus notas de la nube; muestro las de este equipo.</div>}
            </div>
            <div className="mp-map" ref={mapRef} style={{width:W, height:H}}>
              <svg width={W} height={H} style={{position:'absolute', left:0, top:0, zIndex:0}} aria-hidden="true">
                {pos.slice(0, -1).map((a, i) => { const b = pos[i + 1], my = (a.y + b.y) / 2, d = 'M' + a.x + ',' + a.y + ' C' + a.x + ',' + my + ' ' + b.x + ',' + my + ' ' + b.x + ',' + b.y;
                  return list[i + 1].kind === 'gold' ? <g key={i}><path d={d} stroke="#D9A000" strokeWidth="12" fill="none" strokeLinecap="round" /><path d={d} stroke="#FFC531" strokeWidth="7" fill="none" strokeLinecap="round" /></g>
                    : <path key={i} d={d} stroke="rgba(255,255,255,.38)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray="2 12" />; })}
              </svg>
              {list.map((p, i) => {
                const [tc, tt] = mpTag(p, F);
                const cls = p.kind === 'gold' ? 'gold' : p.kind === 'half' ? 'half' : (p.kind === 'lock' || p.kind === 'miss') ? 'lock' : 'next';
                const r = p.info.r || { overall: 0, apt: false };
                const pct = p.kind === 'half' ? 100 : (r.apt || (p.info.canTake && !r.apt)) ? 100 : Math.min(100, r.overall || 0);
                const planet = (
                  <button type="button" className={'mp-pl ' + cls} onClick={() => setOpen(i)} aria-label={(p.final ? 'Examen final' : 'Examen del ' + p.label) + ' · ' + p.mod.name + ' · ' + tt}>
                    <span className="e">{p.emoji}</span>
                    {p.kind === 'gold' && <span className="mp-ok"></span>}
                    {(p.kind === 'gold' || p.kind === 'fail') && p.grade != null && <span className={'mp-gb' + (p.kind === 'fail' ? ' o' : '')}>{p.grade}</span>}
                  </button>);
                return (
                  <div key={p.mod.id} className="mp-it" style={{left:pos[i].x, top:pos[i].y}}>
                    {p.cur && p.kind !== 'fail' ? (
                      <div className={'mp-apt tap' + (p.info.phase === 'today' ? ' open' : '')} style={{'--p': pct}}>
                        {planet}
                        {p.kind !== 'half' && <span className={'mp-pc' + (r.apt || (p.info.canTake && !r.apt) ? ' ok' : '')}>{r.apt ? '✓ APTO' : p.info.canTake ? '✓ habilitado' : (r.overall || 0) + ' %'}</span>}
                      </div>) : planet}
                    <span className={'mp-tag ' + tc}>{tt}</span>
                  </div>);
              })}
            </div>
            {all && <div className="mp-goal" style={{marginTop:8, alignItems:'center', textAlign:'center'}}><b style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:20, color:'#FFC531'}}>¡Nivel {lvl} completo!</b><span style={{fontSize:12.5, fontWeight:800, color:'#C3CBE6'}}>Tus {total} planetas son dorados</span></div>}
          </>}
      </div>
      {open != null && list[open] && <MpSheet p={list[open]} student={student} lvl={lvl} onClose={() => setOpen(null)} onPractice={onPractice} onTasks={onTasks} />}
      {celebrate && <MpCelebrate p={celebrate} left={total - golds} lvl={lvl} onClose={() => setCelebrate(null)} />}
    </main>
  );
}

function MpCelebrate({ p, left, lvl, onClose }) {
  const c = ['#FFC531', '#58CC02', '#7FD0FF', '#FF7FB0', '#fff'];
  return (
    <div className="mp-ov" style={{alignItems:'center'}} onClick={onClose}>
      <div className="mp-sh" style={{borderRadius:22, alignItems:'center', textAlign:'center', gap:14, padding:'28px 18px 22px', margin:'0 12px'}} onClick={e => e.stopPropagation()}>
        <div style={{position:'relative'}}>
          {c.concat(c, c).map((col, i) => { const a = i / 15 * Math.PI * 2; return <span key={i} className="mp-cf" style={{background:col, '--x': Math.round(Math.cos(a) * 120) + 'px', '--y': Math.round(Math.sin(a) * 110) + 'px'}}></span>; })}
          <div className="mp-morph">{p.emoji}<span className="mp-ok"></span>{p.grade != null && <span className="mp-gb">{p.grade}</span>}</div>
        </div>
        <b style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:24, color:'#FFC531', marginTop:6}}>¡Planeta dominado!</b>
        <span className="mp-s">Aprobaste el examen de <b>{p.mod.name}</b>{p.grade != null ? <> con <b>{p.grade}</b></> : null}. {left > 0 ? <>Te falta{left > 1 ? 'n' : ''} <b style={{color:'#FFC531'}}>{left}</b> para completar {lvl}.</> : <>¡Completaste {lvl}! 🎉</>}</span>
        <button type="button" className="mp-cta" onClick={onClose}>Continuar</button>
      </div>
    </div>);
}

/* Lo que le falta para ser apto, ordenado por lo que más suma (pilares reales de su preparación) */
function MpGuide({ student, p, onPractice, onTasks }) {
  const D = window.JUCUM_DATA, r = p.info.r || {};
  const minDia = ((D.getGroupSettings && D.getGroupSettings(student.group)) || {}).dailyTargetMin || 15;
  const improve = (D.getActivitiesToImprove ? D.getActivitiesToImprove(student) : []).filter(x => x.moduleId === p.mod.id).slice(0, 3);
  const TXT = {
    practices: ['📚', 'Termina tus prácticas del módulo', onPractice],
    daily: ['⏱️', 'Practica ' + minDia + ' min cada día', onPractice],
    quality: ['🎯', 'Repite las que quedaron bajas', onPractice],
    tasks: ['📝', 'Entrega tus tareas', onTasks],
  };
  const items = (r.pillars || []).map(x => ({ x, gain: Math.round((100 - (x.value || 0)) * (x.weight || 0)) })).filter(y => y.gain > 0 && TXT[y.x.key]).sort((a, b) => b.gain - a.gain);
  if (r.blocker === 'coverage' && !items.some(y => y.x.key === 'practices')) items.unshift({ x: { key: 'practices', detail: 'llevas ' + (r.coverage || 0) + ' % y necesitas ' + (r.needCoverage || 60) + ' %' }, gain: 0 });
  return (
    <div style={{display:'flex', flexDirection:'column', gap:7}}>
      <span style={{display:'flex', alignItems:'center', gap:8, fontSize:12.5, fontWeight:900, color:'#E8ECF8'}}><MpNeu />Neuro te guía · lo que más suma primero</span>
      {items.map(({ x, gain }) => { const t = TXT[x.key]; return (
        <div key={x.key} className="mp-td">
          <span className="i">{t[0]}</span>
          <span className="xx">{t[1]}<small>{x.key === 'quality' && improve.length ? improve.map(y => y.name + ' (' + y.pct + ' %)').join(' · ') : x.detail}</small></span>
          {t[2] && <button type="button" className="mp-go" onClick={t[2]}>Ir{gain ? ' · +' + gain + ' %' : ''}</button>}
        </div>); })}
      <span style={{fontSize:11.5, fontWeight:700, color:'#9AA6CF'}}>Lo que suma cada cosa es lo máximo que puede subir tu preparación. Un poco cada día rinde más que todo de golpe.</span>
    </div>);
}

/* Tarjeta del planeta (se abre al tocarlo) */
function MpSheet({ p, student, lvl, onClose, onPractice, onTasks }) {
  const F = window.JUCUM_EXAMFLOW, D = window.JUCUM_DATA;
  const inf = p.info, att = p.att, ex = inf.exam, min = p.min;
  const vq = inf.ann && /^(kids|adults)$/.test(inf.ann.variant || '') ? '&jucum_variant=' + encodeURIComponent(inf.ann.variant) : '';
  const partLink = (u, key) => u ? u.url + (u.url.includes('?') ? '&' : '?') + 'jucum_exam=1&jucum_uid=' + encodeURIComponent(student.id) + '&jucum_mod=' + encodeURIComponent('exam-' + ex.id) + '&jucum_act=' + encodeURIComponent(key) + vq + (F.retryQs ? F.retryQs(ex, student) : '') : null;
  const title = p.final ? 'Examen final de ' + lvl : 'Examen del ' + p.label.replace('M', 'Módulo ');
  const head = (a, h, sub) => <><b className="mp-h" style={{'--a': a}}>{h}</b>{sub && <span className="mp-s">{sub}</span>}</>;
  const go = (fn) => () => { onClose(); if (fn) fn(); };
  const PL = { L: '🎧 Listening', R: '📖 Comprensión lectora', X: '🧩 ¿Qué regla uso?', G: '📝 Gramática', V: '🔤 Vocabulario' };
  const weak = att && att.sections ? Object.keys(PL).filter(k => { const s = att.sections[k]; return s && s.t && (s.h / s.t) < 0.75; }).map(k => PL[k]) : [];
  const fecha = (d) => d ? new Date(d).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' }) : '';
  let body;

  if (p.noGrade) body = <div className="mp-card">{head('#FFC531', '¡Planeta completado!', <><b>{p.mod.name}</b> quedó completado. ✓</>)}</div>;
  else if (p.kind === 'lock') body = <div className="mp-card">{head('#9AA6CF', title, <>{p.mod.name}<br />Este planeta se desbloquea cuando llegues a este módulo. ¡Sigue avanzando! 🚀</>)}</div>;
  else if ((inf.phase === 'done' && !att) || p.byMan) {
    const res = p.byMan ? Object.assign({}, p.man, { passed: p.kind === 'gold', grade: p.grade }) : (inf.result || {});
    body = <div className="mp-card">{head(res.passed ? '#FFC531' : '#FFB14D', res.passed ? '¡Planeta dominado!' : 'Aún no apruebas', p.mod.name)}
      {typeof res.grade === 'number' && <div className="mp-rw"><span><b>{res.grade}</b>tu nota</span><span><b>{min}</b>para aprobar</span></div>}
      {res.feedback && <span className="mp-s">📝 Tu teacher: «{res.feedback}»</span>}</div>;
  } else if (att && att._parcial) {
    const ps = F.partesDeExamen ? F.partesDeExamen(ex) : [], urls = (ex.parts || []).filter(x => x.url);
    const abierto = !(inf.ann && inf.ann.date && F.pDay() < inf.ann.date);
    body = <div className="mp-card">{head('#FFC531', '¡Vas a medio camino!', <>{p.mod.name} · te falta la <b>{att._falta}</b>. Tu nota sube apenas la completes.</>)}
      {ps.map((pt, i) => { const d = (att._detalle || []).find(x => x.part === pt.key); if (d) return <div key={pt.key} className="mp-pt ok">✓ {pt.label}<b style={{marginLeft:'auto', fontFamily:"'Fredoka',sans-serif", fontSize:17}}>{d.score}</b></div>;
        const l = partLink(urls[i], pt.key);
        return abierto && l ? <a key={pt.key} className="mp-cta g" href={l} target="_blank" rel="noreferrer">Empezar la {pt.label}</a>
          : <div key={pt.key} className="mp-pt">🕒 {pt.label} · se abre el {F.fmtFecha(inf.ann && inf.ann.date)}</div>; })}</div>;
  } else if (att) {
    const passed = (att.score || 0) >= min;
    const det = att._detalle && att._detalle.length > 1 ? att._detalle.map(d => (F.lblParte ? F.lblParte(ex, d.part) : d.part) + ': ' + d.score).join(' · ') : null;
    if (passed) body = <div className="mp-card">{head('#FFC531', '¡Planeta dominado!', <>Aprobaste <b>{p.mod.name}</b>{(att.attempt_no || 1) === 1 && !att._recu ? ' a tu primer intento 🏅' : ''}.</>)}
      <div className="mp-rw"><span><b>{att.score}</b>tu nota</span>{att.correct != null && <span><b>{att.correct}/{att.total}</b>aciertos</span>}<span><b>{fecha(att.created_at)}</b>rendido</span></div>
      {det && <span className="mp-s">🧩 {det} → tu nota es el promedio.</span>}
      {weak.length > 0 && <span className="mp-s">Para dominarlo del todo, repasa: <b>{weak.join(' · ')}</b>.</span>}
      <span className="mp-s">La nota final del módulo combina examen + práctica: mírala en <b>Mi avance</b>.</span></div>;
    else {
      const rs = F.retOpenFor ? F.retOpenFor(student, p.mod.id, true) : { has: false };
      const part0 = (ex.parts || []).find(x => x.url);
      const retry = part0 ? part0.url + (part0.url.includes('?') ? '&' : '?') + 'jucum_exam=1&jucum_retry=1&jucum_uid=' + encodeURIComponent(student.id) + '&jucum_mod=' + encodeURIComponent('exam-' + ex.id) + '&jucum_act=' + encodeURIComponent(part0.competency || '') + vq : null;
      const R = rs.ret, q = rs.reqs || {};
      body = <div className="mp-card">{head('#FFB14D', '¡Faltó poquito! Sacaste ' + att.score, <>Necesitabas <b>{min}</b> en {p.mod.name}. Tu nota quedó registrada sola; tu teacher ve el detalle.</>)}
        {det && <span className="mp-s">🧩 {det}</span>}
        <span className="mp-s">Lo que más te costó: <b>{weak.length ? weak.join(' · ') : 'las prácticas del módulo'}</b>.</span>
        <button type="button" className="mp-cta" onClick={go(onPractice)}>Repasar en Mi práctica</button>
        {rs.has && rs.inScope ? (
          rs.open && retry ? <><a className="mp-cta o" href={retry} target="_blank" rel="noreferrer">🔁 Rendir mi recuperación</a><span className="mp-s" style={{textAlign:'center'}}>Abierta hasta el <b>{F.fmtFecha(R.to)}</b> · esta nota reemplaza la anterior.</span></>
          : rs.blocked ? <span className="mp-s">⏸ Tu teacher habilitará tu nueva oportunidad. Sigue practicando. 💬</span>
          : F.pDay() < R.from ? <span className="mp-s">🔁 <b>Tu nueva oportunidad:</b> del <b>{F.fmtFecha(R.from)}</b> al <b>{F.fmtFecha(R.to)}</b>. Llega apto practicando cada día.</span>
          : rs.active ? <span className="mp-s">🔁 <b>Recuperación abierta</b> hasta el <b>{F.fmtFecha(R.to)}</b>. Te falta: apto <b>{q.overall}%/{q.threshold}%</b>{q.dias14 != null ? <> · práctica <b>{q.dias14}/{F.retMin} días</b></> : null} · avance <b>{q.avance || 0}/{q.avanceMin || 2} días</b>. Apenas cumplas, el botón aparece aquí.</span> : null
        ) : <span className="mp-s">🔁 Si tu teacher te abre una nueva oportunidad, aparecerá aquí con su fecha.</span>}
        {window.RetPlanBlock && rs.has && rs.inScope && !rs.blocked && <div style={{color:'#2A2A2A'}}><RetPlanBlock student={student} mod={p.mod} att={att} /></div>}</div>;
    }
  } else if (inf.phase === 'today' && inf.link) {
    const ps = F.partesDeExamen ? F.partesDeExamen(ex) : [];
    body = <div className="mp-card">{head('#8BE34A', '¡Tu examen está abierto!', <>{p.mod.name} · {mpHorario(F, inf.ann) || 'hoy'}</>)}
      <div className="mp-rec"><b>Antes de empezar, recuerda:</b><span>🎧 Ponte los audífonos</span><span>📵 Quédate solo en la pestaña del examen</span><span>⭐ Vale tu primer intento</span></div>
      <a className="mp-cta g" href={inf.link} target="_blank" rel="noreferrer">Empezar{ps.length > 1 ? ' la ' + ps[0].label : ''}</a>
      <span className="mp-s" style={{textAlign:'center'}}>Tus respuestas se guardan solas. Al terminar, tu nota sale sola.</span></div>;
  } else if (inf.paused) body = <div className="mp-card">{head('#9AA6CF', title, <>Hoy es tu examen, pero <b>tu acceso está en pausa</b>. Escríbele a tu teacher por 💬 Hablemos.</>)}</div>;
  else if (inf.phase === 'waitgrade') {
    const rs = F.retOpenFor ? F.retOpenFor(student, p.mod.id, true) : { has: false };
    body = <div className="mp-card">{head('#9AA6CF', title + ' · ya cerró', <>{p.mod.name}. Si lo rendiste, tu nota aparecerá aquí en un momento.</>)}
      {rs.has && rs.inScope && !rs.blocked && <span className="mp-s">🔁 Tienes una nueva oportunidad del <b>{F.fmtFecha(rs.ret.from)}</b> al <b>{F.fmtFecha(rs.ret.to)}</b>. Cuando cumplas los requisitos, el botón aparece aquí.</span>}</div>;
  } else {
    const r = inf.r || { overall: 0, apt: false }, habil = inf.canTake && !r.apt, ok = r.apt || habil;
    const nParts = Math.max(1, (F.partesDeExamen ? F.partesDeExamen(ex) : []).length);
    const color = ok ? '#58CC02' : r.overall >= 50 ? '#FFC531' : '#FF7A59';
    body = <div className="mp-card">{head('#8EE6F2', title, <>{p.mod.name}{inf.ann && inf.ann.date ? <> · <b>{F.fmtFecha(inf.ann.date)}</b> · {mpHorario(F, inf.ann)}</> : ' · aún sin fecha'}</>)}
      <div className="mp-rw">{inf.days != null && <span><b>{inf.days === 0 ? 'HOY' : inf.days}</b>{inf.days === 0 ? 'a la hora' : inf.days === 1 ? 'día' : 'días'}</span>}<span><b>{nParts}</b>{nParts === 1 ? 'parte' : 'partes'}</span><span><b>{min}</b>para aprobar</span></div>
      <div style={{display:'flex', alignItems:'center', gap:9}}><div className="mp-bar" style={{flex:1}}><span style={{width:Math.min(100, ok ? 100 : r.overall) + '%', background:color}}></span><i></i></div><b style={{fontSize:13, color, whiteSpace:'nowrap'}}>{habil ? '✓ habilitado' : r.apt ? '✓ APTO' : r.overall + ' %'}</b></div>
      <span className="mp-s">{habil ? <>✅ <b>Tu teacher te habilitó</b>: no necesitas llegar al 75 %. El botón aparecerá aquí el día del examen.</>
        : r.apt ? <>¡Eres apto! 🎉 Ojo: si dejas de practicar puede bajar del 75 %. Mantenlo con un poco cada día. El botón aparecerá aquí el día del examen.</>
        : r.blocker === 'coverage' ? <>Ya pasaste el 75 % ({r.overall} %), pero también hay que <b>terminar el módulo</b>: llevas <b>{r.coverage || 0} %</b> de tus prácticas aprobadas y necesitas <b>{r.needCoverage || 60} %</b>.</>
        : <>El examen se abre para alumnos <b>aptos (75 %)</b>. Te falta <b>{Math.max(0, 75 - r.overall)} %</b>: ¡aún estás a tiempo!</>}</span>
      {!ok && <MpGuide student={student} p={p} onPractice={go(onPractice)} onTasks={go(onTasks)} />}
      <button type="button" className="mp-cta off" disabled>{inf.ann && inf.ann.date ? 'Se abre el ' + mpShort(inf.ann.date) + (inf.ann.from ? ' · ' + F.fmtHora(inf.ann.from) : '') : 'Tu teacher pondrá la fecha'}</button></div>;
  }
  const X = window.JUCUM_EXAMS;
  const canUp = !!(inf.win && F.winEffectiveOpen && F.winEffectiveOpen(inf.win) && X && X.canTakeWindow && X.canTakeWindow(student, inf.win) && window.TaskFilePicker && p.kind !== 'lock');
  return (
    <div className="mp-ov" onClick={onClose}>
      <div className="mp-sh" role="dialog" aria-label={title} onClick={e => e.stopPropagation()}>
        <button type="button" className="mp-x" onClick={onClose} aria-label="Cerrar">✕</button>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <span className={'mp-pl ' + (p.kind === 'gold' ? 'gold' : p.kind === 'half' ? 'half' : p.kind === 'lock' || p.kind === 'miss' ? 'lock' : 'next')} style={{width:52, height:52, cursor:'default', boxShadow:'none'}}><span className="e" style={{fontSize:24}}>{p.emoji}</span></span>
          <span style={{fontSize:12, fontWeight:900, letterSpacing:'.05em', textTransform:'uppercase', color:'#9AA6CF'}}>{p.final ? 'Final' : p.label} · {lvl}</span>
        </div>
        {body}
        {canUp && <MpUpload w={inf.win} student={student} />}
      </div>
    </div>);
}

/* 📎 Subir material del examen (opcional · p.ej. el audio del Speaking) — igual que la tarjeta anterior */
function MpUpload({ w, student }) {
  const X = window.JUCUM_EXAMS;
  const sub = (w.submissions || {})[student.id];
  const [attachments, setAttachments] = React.useState(sub && sub.attachments ? sub.attachments : []);
  const [sent, setSent] = React.useState(false);
  return (
    <div className="mp-card" style={{background:'#fff', color:'#2A2A2A'}}>
      <b style={{fontSize:13, fontWeight:900, color:'#13255E'}}>📎 Subir material (opcional · ej. audio de tu Speaking)</b>
      <window.TaskFilePicker attachments={attachments} setAttachments={setAttachments} allowRecord={true} />
      {sent ? <div style={{fontSize:12.5, fontWeight:800, color:'#2E7D32'}}>✓ Enviado. Tu teacher ya lo puede ver.</div>
        : <button type="button" className="mp-cta" style={{fontSize:13}} onClick={() => { try { X.submitExam(w.id, student.id, { attachments }); setSent(true); } catch (e) { alert('No se pudo enviar. Inténtalo de nuevo.'); } }}>{sub ? '🔄 Actualizar entrega' : '📨 Enviar material'}</button>}
    </div>);
}

Object.assign(window, { MisPlanetas, MpSheet, MpGuide, MpCelebrate, MpUpload, mpPlanets, mpAtt });
