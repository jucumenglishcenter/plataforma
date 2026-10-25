/* Bloque J3 · Centro de exámenes · PANEL-UNICO-V1 (24-oct-2026): UN panel por grupo —
 *   lista de sus exámenes (módulos + final) + ficha en 3 pasos: ① Programar y avisar · ② Día del
 *   examen en vivo · ③ Notas y recuperación (fichas ✅ aprobados / 🔁 recuperación y por rendir)
 * La recuperación es UNA ventana de días (desaprobados Y quienes no rindieron): dentro de ella cada
 * alumno rinde apenas cumple sus requisitos (apto ≥75% + práctica 10/14 días); la profesora puede
 * abrirle (force) o pausarle (block) el examen a cualquiera — última palabra.
 * Motores: exams.js + exam-flow.js (cfg/ret). Ventanas por alumno y Definir siguen en TeacherExams (solo desarrollo). */

const ecUS = React.useState, ecUE = React.useEffect;

function ecPill(bg, c, t, k) { return <span key={k} className="mm-chip" style={{background:bg, color:c, whiteSpace:'nowrap'}}>{t}</span>; }
function EcReq({ ok, children }) { return <span className="mm-chip" style={{background: ok ? '#E8F5E9' : '#FFF8E1', color: ok ? '#2E7D32' : '#8A5100', whiteSpace:'nowrap'}}>{ok ? '✔' : '✖'} {children}</span>; }

const EC_PARTES = { L:'🎧 Listening', R:'📖 Comprensión lectora', X:'🧩 ¿Qué regla uso?', G:'📝 Gramática', V:'🔤 Vocabulario' };
function ecWeakKeys(att) { const s0 = (att && att.sections) || {}; return Object.keys(EC_PARTES).filter(k => { const s = s0[k]; return s && s.t && (s.h / s.t) < 0.75; }); }
function ecDraftFB(nombre, nota, weak, min) {
  const w = weak.map(k => EC_PARTES[k]);
  if (nota >= min) return `¡${nota}, ${nombre}! ` + (w.length ? `Aprobaste. Para redondear tu dominio, repasa: ${w.join(' · ')}.` : 'Dominaste todas las partes — sigue así. 🌟');
  return `${nombre}, obtuviste ${nota} — aún no apruebas, pero con constancia lo logras: refuerza ${w.length ? w.join(' · ') : 'las prácticas del módulo'} un poco cada día. 💪`;
}

/* ═══ Marco · PANEL-UNICO-V1 (24-oct-2026) ═══
 * UN solo panel por grupo (aprobado en `Espejo - Panel unico de examenes.html`): a la izquierda
 * TODOS sus exámenes (módulos + final) con su estado; a la derecha la ficha del elegido en
 * 3 pasos — ① Programar y avisar · ② Día del examen (en vivo) · ③ Notas y recuperación
 * (EcModResults, sin cambios). Reemplaza las pestañas Configurar / Resultados. */
const ecMES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'], ecDIA = ['dom','lun','mar','mié','jue','vie','sáb'];
function ecCorta(d) { if (!d) return ''; const x = new Date(d + 'T12:00:00Z'); return ecDIA[x.getUTCDay()] + ' ' + x.getUTCDate() + ' ' + ecMES[x.getUTCMonth()]; }
function ecAddDays(d, n) { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }
function ecHM(min) { const t = Math.max(0, Math.min(23 * 60 + 59, min)); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); }
function ecMinOf(hhmm) { if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return null; const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }
function ecPeruHM(iso) { return new Date(Date.parse(iso) - 5 * 3600000).toISOString().slice(11, 16); }
function ecHoyIso(hhmm) { const F = window.JUCUM_EXAMFLOW; return new Date(Date.parse(F.pDay() + 'T' + hhmm + ':00Z') + 5 * 3600000).toISOString(); }
function ecNParts(exam) { return ((exam && exam.parts) || []).filter(p => p && p.url).length; }

function ecItems(group) {
  const D = window.JUCUM_DATA, X = window.JUCUM_EXAMS, F = window.JUCUM_EXAMFLOW;
  const num = group.level === 'pre-a1';   /* A1/A2: sin números de módulo (RUEDA) */
  const mods = (D.MODULE_CATALOG[group.level] || []).map((m, i) => ({ mod: m, label: (num ? 'M' + (i + 1) + ' · ' : '') + m.name, exam: X.examForModule(m.id, group.level), first: i === 0 }));
  const solos = (F.standaloneExams ? F.standaloneExams(group.level) : []).map(e => ({ mod: { id: 'exam:' + e.id, name: e.title, emoji: '🏁', activities: [] }, label: e.title, exam: e, solo: true }));
  return mods.concat(solos);
}
/* Estado de un examen del grupo → paso al que abre la ficha (1·2·3) y texto de la lista */
function ecEstado(group, it) {
  const X = window.JUCUM_EXAMS, F = window.JUCUM_EXAMFLOW;
  const exam = it.exam, mid = it.mod.id, hoy = F.pDay();
  const formsWin = F.formsWindowFor(group);
  const formsExam = formsWin ? X.getExam(formsWin.examId) : null;
  if (!exam || /^ex-m1forms-/.test(exam.id)) {
    if (it.first && formsExam && (formsExam.moduleIds || []).includes(mid)) return { step: 3, c: '#5B3FA0', bg: '#EDE7F6', t: 'Notas de Google Forms', forms: true };
    return { step: 0, c: '#9A9384', bg: '#F0F0EA', t: 'Sin examen aún' };
  }
  const win = X.windowForExamGroup(exam.id, group.id), ann = F.getAnn(group.id, mid), ret = F.getRet(group.id, mid);
  if (ret && F.retActive(ret)) return { step: 3, c: '#C62828', bg: '#FFEBEE', t: 'Recuperación hasta ' + ecCorta(ret.to) };
  if (F.winEffectiveOpen(win)) return { step: 2, c: '#2E7D32', bg: '#E8F5E9', t: 'Abierto ahora', open: true };
  if (ann && ann.date && F.enFechaAnn(ann, hoy)) return { step: 2, c: '#2E7D32', bg: '#E8F5E9', t: 'Hoy es el examen' };
  if (ann && ann.p2mode === 'otro' && ann.p2date && hoy > ann.date && hoy < ann.p2date) return { step: 2, c: '#1F3A8A', bg: '#E3E9F8', t: 'Parte 2 · ' + ecCorta(ann.p2date) };
  if (ann && ann.date && ann.date > hoy) { const d = F.daysTo(ann.date); return { step: 1, c: '#1F3A8A', bg: '#E3E9F8', t: 'Programado · ' + ecCorta(ann.date) + (d === 1 ? ' · mañana' : ' · en ' + d + ' días') }; }
  const pasado = (ann && ann.date && (F.annFin(ann) || ann.date) < hoy) || (ann && ann.openedAt && F.pDay() > new Date(Date.parse(ann.openedAt) - 5 * 3600000).toISOString().slice(0, 10));
  if ((win && Object.keys(win.results || {}).length) || pasado || (win && win.isOpen && !ann)) return { step: 3, c: '#5B3FA0', bg: '#EDE7F6', t: 'Rendido' + (ann && ann.date ? ' · ' + ecCorta(ann.date) : '') };
  if (ann && ann.notified && !ann.date) return { step: 1, c: '#1F3A8A', bg: '#E3E9F8', t: 'Avisado · sin fecha' };
  return { step: 1, c: '#9A9384', bg: '#F0F0EA', t: 'Por programar' };
}

function ExamsCenter({ onBack, hideBack, initialGroup, canDefine }) {
  const { GROUPS, LEVELS } = window.JUCUM_DATA;
  const [groupId, setGroupId] = ecUS(initialGroup || (GROUPS[0] ? GROUPS[0].id : null));
  const [selId, setSelId] = ecUS(null);
  const [classic, setClassic] = ecUS(false);
  const [demoOpen, setDemoOpen] = ecUS(false);
  const [, setTick] = ecUS(0);
  const refresh = () => setTick(t => t + 1);
  ecUE(() => { const f = () => refresh(); window.addEventListener('jucum:examflow', f); return () => window.removeEventListener('jucum:examflow', f); }, []);
  const group = GROUPS.find(g => g.id === groupId) || GROUPS[0];

  if (classic) return (
    <>
      <div style={{padding:'12px 28px 0'}}><button className="att-btn" onClick={() => setClassic(false)}>← Volver a Exámenes</button></div>
      <TeacherExams onBack={onBack} hideBack canDefine={canDefine} initialTab={typeof classic === 'string' ? classic : undefined} />
    </>
  );
  if (!group) return <main>{!hideBack && <button className="back-btn" onClick={onBack}>← Volver al panel</button>}<div className="scard"><div className="empty-state"><div className="icon">👥</div>No hay grupos todavía.</div></div></main>;

  const items = ecItems(group);
  const est = items.map(it => ecEstado(group, it));
  const pref = [i => est[i].step === 2, i => est[i].step === 1 && est[i].c === '#1F3A8A', i => est[i].step === 1, i => est[i].step === 3];
  let defIdx = -1; for (const p of pref) { defIdx = items.findIndex((_, i) => p(i)); if (defIdx >= 0) break; }
  const cur = items.find(it => it.mod.id === selId) || items[defIdx >= 0 ? defIdx : 0];
  const curIdx = cur ? items.indexOf(cur) : -1;

  return (
    <main>
      {!hideBack && <button className="back-btn" onClick={onBack}>← Volver al panel</button>}
      <div className="welcome teacher">
        <div className="welcome-text">
          <div className="eyebrow">🎓 Exámenes</div>
          <h1>Exámenes del grupo</h1>
          <p>Todo lo de cada examen en un solo lugar: lo eliges a la izquierda y lo manejas en 3 pasos — <b>programar y avisar</b> · <b>día del examen</b> · <b>notas y recuperación</b>. Nada se queda abierto: todo se cierra solo.</p>
        </div>
        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          {canDefine && <button className="btn-settings" onClick={() => setClassic('define')}>📑 Definir exámenes</button>}
          {canDefine && <button className="btn-settings" onClick={() => setClassic('weights')}>⚖️ Peso examen</button>}
          <button className="btn-settings" onClick={() => setDemoOpen(true)}>🧪 Examen de prueba</button>
          {canDefine && <button className="btn-settings" onClick={() => setClassic(true)} title="Ventanas puntuales por alumno">⚙ Ventanas por alumno</button>}
        </div>
      </div>

      {window.ExamReadyBanner && <ExamReadyBanner />}

      <div style={{display:'flex', flexWrap:'wrap', gap:4, alignItems:'flex-end', padding:'0 10px', position:'relative', zIndex:2, marginTop:14}}>
        {GROUPS.map(g => {
          const lv = LEVELS[g.level] || {}; const on = g.id === group.id;
          return (
            <button key={g.id} onClick={() => { setGroupId(g.id); setSelId(null); }} style={{
              border:'1.5px solid ' + (on ? '#D5CDBB' : '#DDD5C4'), borderBottom:'none', background: on ? '#fff' : '#EFEAE0',
              color: on ? 'var(--text)' : '#6B6455', borderRadius:'11px 11px 0 0', padding: on ? '11px 15px 12px' : '8px 15px 10px',
              fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:12.5, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:7,
              marginBottom:-1.5, borderTop: on ? '3px solid ' + (lv.color || '#F9A825') : '1.5px solid #DDD5C4',
              boxShadow: on ? '0 -3px 8px rgba(0,0,0,.05)' : 'none' }}>
              <span style={{width:9, height:9, borderRadius:'50%', background: lv.color || '#999', flexShrink:0}}></span>{g.name}
            </button>
          );
        })}
      </div>
      <div style={{background:'#fff', border:'1.5px solid #D5CDBB', borderRadius:14, padding:18, position:'relative', zIndex:1, boxShadow:'0 2px 4px rgba(0,0,0,.06),0 8px 20px rgba(0,0,0,.08)'}}>
        <EcReglasStrip group={group} onChange={refresh} />
        <div style={{display:'flex', flexWrap:'wrap', gap:16, alignItems:'flex-start'}}>
          <div style={{flex:'1 1 220px', maxWidth:300, minWidth:0, display:'flex', flexDirection:'column', gap:4}}>
            <div style={{fontSize:10.5, fontWeight:900, letterSpacing:'.06em', textTransform:'uppercase', color:'#A08F63', padding:'0 4px 4px'}}>Exámenes del grupo</div>
            {items.map((it, i) => { const e = est[i], on = cur && it.mod.id === cur.mod.id; return (
              <button key={it.mod.id} onClick={() => setSelId(it.mod.id)} style={{display:'grid', gridTemplateColumns:'30px minmax(0,1fr)', gap:8, alignItems:'center', textAlign:'left', padding:'8px 9px', borderRadius:11, cursor:'pointer',
                background: on ? '#FFF9E2' : '#fff', border:'1.5px ' + (it.solo && !on ? 'dashed ' : 'solid ') + (on ? '#F9A825' : (it.solo ? '#C9B8EC' : '#EFE7D2')),
                marginTop: it.solo ? 6 : 0, boxShadow: on ? '0 0 0 3px rgba(249,168,37,.15)' : 'none', fontFamily:"'Nunito',sans-serif"}}>
                <span style={{fontSize:19, textAlign:'center'}}>{it.mod.emoji || '📘'}</span>
                <span style={{minWidth:0}}>
                  <span style={{display:'block', fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:13.5, lineHeight:1.2, color:'var(--text)'}}>{it.label}{it.solo && ecNParts(it.exam) > 1 ? ' · ' + ecNParts(it.exam) + ' partes' : ''}</span>
                  <span style={{display:'flex', alignItems:'center', gap:6, fontSize:11.5, fontWeight:800, color: e.c, marginTop:2}}><span style={{width:8, height:8, borderRadius:'50%', background: e.c, flexShrink:0}}></span>{e.t}</span>
                </span>
              </button>); })}
          </div>
          <div style={{flex:'999 1 480px', minWidth:0}}>
            {cur ? <EcFicha key={group.id + ':' + cur.mod.id} group={group} it={cur} est={est[curIdx]} onChange={refresh} /> : <div className="empty-state"><div className="icon">📚</div>Este nivel no tiene módulos.</div>}
          </div>
        </div>
      </div>
      {demoOpen && <DemoExamModal onClose={() => setDemoOpen(false)} onDone={() => { setDemoOpen(false); refresh(); }} />}
    </main>
  );
}

function EcReglasStrip({ group, onChange }) {
  const F = window.JUCUM_EXAMFLOW;
  const [min, setMin] = ecUS(F.minGradeFor(group.id));
  ecUE(() => { setMin(F.minGradeFor(group.id)); }, [group.id]);
  const save = () => { const n = Math.max(1, Math.min(100, parseInt(min, 10) || 75)); if (n === F.minGradeFor(group.id)) { setMin(n); return; } F.setCfg(group.id, { minGrade: n }); setMin(n); onChange(); };
  const chip = { display:'inline-flex', alignItems:'center', gap:6, fontSize:11.5, fontWeight:800, color:'#6B665C', background:'#FBFAF5', border:'1px solid #EFE7D2', borderRadius:10, padding:'4px 10px' };
  return (
    <div style={{display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:16}}>
      <span style={chip}>✅ Aprueba con <input type="number" min="1" max="100" className="input-text" style={{width:58, padding:'3px 6px', textAlign:'center'}} value={min} onChange={e => setMin(e.target.value)} onBlur={save} onKeyDown={e => { if (e.key === 'Enter') save(); }} /></span>
      <span style={chip}>🎯 Apto = preparación ≥ 75% y práctica {F.retMin} de los últimos {F.retDe} días · tú decides en la fila de cada alumno</span>
      <span style={chip}>📤 La nota se publica sola al entregar</span>
    </div>
  );
}

function EcSteps({ step, auto, onStep }) {
  const L = ['Programar y avisar', 'Día del examen', 'Notas y recuperación'];
  return (
    <div style={{display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', margin:'16px 0 18px'}}>
      {L.map((t, i) => { const n = i + 1, done = n < auto, on = n === step; return (
        <button key={t} onClick={() => onStep(n)} style={{background:'none', border:0, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:5, position:'relative', fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:12, color: on ? 'var(--text)' : '#A39C8C', padding:'0 4px', textAlign:'center'}}>
          {i > 0 && <span style={{position:'absolute', top:13, left:'-50%', right:'50%', height:3, background: n <= auto ? '#2E7D32' : '#E6DFCC'}}></span>}
          <span style={{position:'relative', zIndex:1, width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, border:'2.5px solid ' + (on ? '#1F3A8A' : done ? '#2E7D32' : '#D5CDBB'), background: on ? '#1F3A8A' : done ? '#2E7D32' : '#fff', color: (on || done) ? '#fff' : '#A39C8C', boxShadow: on ? '0 0 0 4px #E3E9F8' : 'none'}}>{done && !on ? '✓' : n}</span>
          {t}
        </button>); })}
    </div>
  );
}

function EcFicha({ group, it, est, onChange }) {
  const D = window.JUCUM_DATA;
  const [step, setStep] = ecUS(est.step || 1);
  const members = D.STUDENTS.filter(s => s.group === group.id);
  const n = ecNParts(it.exam);
  const head = (
    <div style={{display:'flex', alignItems:'center', gap:11, flexWrap:'wrap'}}>
      <span style={{fontSize:28}}>{it.mod.emoji || '📘'}</span>
      <div style={{flex:1, minWidth:200}}>
        <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:18, lineHeight:1.2}}>{it.label}</div>
        <div className="settings-hint" style={{margin:0}}>{it.exam && !est.forms ? it.exam.title + (n > 1 ? ' · ' + n + ' partes · la nota es el promedio' : '') : est.forms ? 'Rendido por Google Forms · las notas se conservan tal cual' : 'Desarrollo aún no sube el examen de este módulo'}</div>
      </div>
      {ecPill(est.bg, est.c, est.t, 'st')}
    </div>
  );
  if (!est.step) return <div>{head}{it.first && window.M1FormsButton && <div style={{marginTop:12}}><M1FormsButton group={group} onChange={onChange} /></div>}</div>;
  if (est.forms) return <div>{head}<div style={{marginTop:14}}><EcModResults group={group} module={it.mod} members={members} onChange={onChange} /></div></div>;
  return (
    <div>
      {head}
      <EcSteps step={step} auto={est.step} onStep={setStep} />
      {step === 1 && <EcProgramar group={group} it={it} est={est} members={members} onChange={onChange} goStep={setStep} />}
      {step === 2 && <EcEnVivo group={group} it={it} members={members} onChange={onChange} goStep={setStep} />}
      {step === 3 && <EcModResults group={group} module={it.mod} members={members} onChange={onChange} />}
    </div>
  );
}

/* Acceso por alumno a ESTE examen: Auto (según apto) · Habilitar (allowOverrides) · Pausar (ann.paused) */
function ecAcceso(group, exam, mid, onChange) {
  const D = window.JUCUM_DATA, X = window.JUCUM_EXAMS, F = window.JUCUM_EXAMFLOW;
  const win = X.windowForExamGroup(exam.id, group.id), ann = F.getAnn(group.id, mid);
  const accOf = s => (ann && (ann.paused || []).includes(s.id)) ? 'pausa' : (win && (win.allowOverrides || []).includes(s.id)) ? 'hab' : 'auto';
  const readyOf = s => { try { return D.getStudentReadiness(s) || { apt: false, overall: 0 }; } catch (e) { return { apt: false, overall: 0 }; } };
  const canEnter = s => { const a = accOf(s); return a === 'hab' || (a === 'auto' && !!readyOf(s).apt); };
  const setAcc = (s, v) => {
    const now = accOf(s); if (now === v) return;
    if (now === 'hab' || v === 'hab') {
      let w = win;
      if (!w) { X.createWindow({ examId: exam.id, groupId: group.id, isOpen: false }); w = X.windowForExamGroup(exam.id, group.id); }
      if (w) X.toggleOverride(w.id, s.id);
    }
    const p = new Set((ann && ann.paused) || []); if (v === 'pausa') p.add(s.id); else p.delete(s.id);
    if (now === 'pausa' || v === 'pausa') F.setAnn(group.id, mid, { paused: Array.from(p), examId: exam.id });
    onChange();
  };
  return { accOf, canEnter, setAcc, readyOf, win, ann };
}
function EcAccSeg({ v, onSet }) {
  return (
    <span style={{display:'inline-flex', border:'1.5px solid #D5CDBB', borderRadius:16, padding:2, gap:2, background:'#F6F3EA', whiteSpace:'nowrap'}}>
      {[['auto','Auto'],['hab','Habilitar'],['pausa','Pausar']].map(([k, l]) => (
        <button key={k} onClick={() => onSet(k)} style={{border:0, borderRadius:13, padding:'3px 9px', fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:11, cursor:'pointer', background: v === k ? '#fff' : 'transparent', color: v === k ? 'var(--text)' : '#6B665C', boxShadow: v === k ? '0 1px 3px rgba(0,0,0,.14)' : 'none'}}>{l}</button>
      ))}
    </span>
  );
}
function EcAccSub({ acc, r }) {
  const falta = window.exfFalta ? window.exfFalta(r) : '';
  if (acc === 'hab') return <div style={{fontSize:11, fontWeight:800, color:'#2E7D32', marginTop:2}}>habilitado por ti</div>;
  if (acc === 'pausa') return <div style={{fontSize:11, fontWeight:800, color:'#E65100', marginTop:2}}>en pausa · no entra</div>;
  return r.apt ? <div style={{fontSize:11, fontWeight:800, color:'#2E7D32', marginTop:2}}>apto</div> : <div style={{fontSize:11, fontWeight:800, color:'#E65100', marginTop:2}}>no apto{falta ? ' · ' + falta : ''}</div>;
}
function ecSegBtns(val, set, opts, dis) {
  return (
    <span style={{display:'inline-flex', flexWrap:'wrap', border:'1.5px solid #D5CDBB', borderRadius:20, padding:2, gap:2, background:'#F6F3EA', opacity: dis ? .45 : 1}}>
      {opts.map(([k, l]) => <button key={k} disabled={dis} onClick={() => set(k)} style={{border:0, borderRadius:16, padding:'5px 11px', fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:12, cursor: dis ? 'default' : 'pointer', background: val === k ? '#fff' : 'transparent', color: val === k ? 'var(--text)' : '#6B665C', boxShadow: val === k ? '0 1px 3px rgba(0,0,0,.14)' : 'none'}}>{l}</button>)}
    </span>
  );
}
const ecCard = { border:'1.5px solid #EFE7D2', borderRadius:12, padding:'12px 14px', background:'#fff' };
const ecCardT = { fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:14, color:'#1F3A8A', marginBottom:8 };
const ecTh = { fontSize:10.5, fontWeight:900, letterSpacing:'.05em', textTransform:'uppercase', color:'#A08F63', textAlign:'left', padding:'8px 10px', background:'#FFFCF2', borderBottom:'1px solid #EFE7D2' };
const ecTd = { padding:'8px 10px', borderBottom:'1px solid #F3EEE0', fontSize:12.5, verticalAlign:'middle' };

/* ═══ ① PROGRAMAR Y AVISAR ═══ */
function EcProgramar({ group, it, est, members, onChange, goStep }) {
  const X = window.JUCUM_EXAMS, F = window.JUCUM_EXAMFLOW;
  const exam = it.exam, mid = it.mod.id, multi = ecNParts(exam) > 1;
  const A = ecAcceso(group, exam, mid, onChange);
  const ann = A.ann, win = A.win;
  const [date, setDate] = ecUS((ann && ann.date) || '');
  const [from, setFrom] = ecUS((ann && ann.from) || '');
  const [to, setTo] = ecUS((ann && ann.to) || '');
  const [p2mode, setP2mode] = ecUS((ann && ann.p2mode) || 'seguida');
  const [p2date, setP2date] = ecUS((ann && ann.p2date) || '');
  const [p2from, setP2from] = ecUS((ann && (ann.p2from || ann.from)) || '');
  const [p2to, setP2to] = ecUS((ann && (ann.p2to || ann.to)) || '');
  const [aviso, setAviso] = ecUS(ann && ann.notifyDate && !ann.notified ? 'antes' : 'ahora');
  const [noDate, setNoDate] = ecUS(!!(ann && ann.notified && !ann.date));
  const [variant, setVariant] = ecUS((ann && ann.variant) || 'mixed');
  const [more, setMore] = ecUS(false);
  const [ya, setYa] = ecUS(null);
  const [sel, setSel] = ecUS([]);
  const [abrir, setAbrir] = ecUS(false);
  const [filtro, setFiltro] = ecUS('all');
  ecUE(() => {
    let vivo = true;
    (F.yaRindieron ? F.yaRindieron(exam, group.id, members) : Promise.resolve([])).then(l => { if (vivo) setYa(l || []); }).catch(() => { if (vivo) setYa([]); });
    return () => { vivo = false; };
  }, [exam.id, group.id]);
  const yaMap = {}; (ya || []).forEach(x => { yaMap[x.student.id] = x; });
  const lo = s => A.canEnter(s) && (!yaMap[s.id] || sel.includes(s.id));
  const nLo = members.filter(lo).length, nSin = members.filter(s => !A.canEnter(s)).length;
  const nNueva = members.filter(s => yaMap[s.id] && sel.includes(s.id) && A.canEnter(s)).length;
  const nConserva = members.filter(s => yaMap[s.id] && !sel.includes(s.id) && A.canEnter(s)).length;
  const graders = (ann && ann.graders) || [];
  const toggleGrader = (name) => { const set = new Set(graders); if (set.has(name)) set.delete(name); else set.add(name); F.setAnn(group.id, mid, { graders: Array.from(set), examId: exam.id }); onChange(); };
  const pre = (it.mod.activities || []).find(a => F.isPreexamActivity && F.isPreexamActivity(a));
  const hoy = F.pDay();
  const diaAviso = date ? ecAddDays(date, -2) : hoy;

  const lineas = [];
  if (noDate) lineas.push('📣 Aviso sin fecha: “Estás pronto a dar tu examen, practica…”. Cuando pongas la fecha, verán la cuenta regresiva.');
  else {
    lineas.push(aviso === 'ahora' ? '📣 La campanita sale apenas guardes.' : aviso === 'antes' ? (diaAviso > hoy ? '📣 La campanita sale sola el ' + ecCorta(diaAviso) + '.' : '📣 Faltan menos de 2 días: la campanita sale apenas guardes.') : '🔕 Sin campanita: lo verán en su módulo.');
    if (date) lineas.push('🟢 ' + (multi ? 'La Parte 1' : 'El examen') + ' se abre el ' + ecCorta(date) + (from ? ' a las ' + F.fmtHora(from) : ' (todo el día)') + ' y se cierra solo' + (to ? ' a las ' + F.fmtHora(to) : ' al terminar el día') + '.');
    if (multi) lineas.push(p2mode === 'otro' ? '🟢 La Parte 2 se abre el ' + (p2date ? ecCorta(p2date) : '(elige la fecha)') + (p2from ? ' a las ' + F.fmtHora(p2from) : '') + (p2to ? ' y se cierra sola a las ' + F.fmtHora(p2to) : '') + '.' : '➡️ Parte 2 seguida: al entregar la Parte 1, la Parte 2 aparece ahí mismo, en la página del examen.');
  }
  lineas.push(ya === null ? '⏳ Revisando quién ya dio este examen…' : '👥 Lo dan ' + nLo + ' de ' + members.length + (nSin ? ' · ' + nSin + ' sin acceso' : '') + (nNueva ? ' · ' + nNueva + ' de nuevo como nota nueva' : '') + (nConserva ? ' · ' + nConserva + ' ya lo dieron y conservan su nota' : '') + '.');

  const guardar = () => {
    if (!noDate && !date) { alert('Elige la fecha del examen (o marca “Todavía no tengo la fecha”).'); return; }
    if (!noDate && multi && p2mode === 'otro' && !p2date) { alert('Elige la fecha de la Parte 2.'); return; }
    if (!noDate && multi && p2mode === 'otro' && p2date <= date) { alert('La Parte 2 debe ser un día DESPUÉS de la Parte 1.'); return; }
    if (sel.length) F.setFresh(group.id, exam.id, sel);
    if (noDate) {
      const n = X.announceExam(group.id, mid, exam.id, null);
      F.setAnn(group.id, mid, { examId: exam.id, notified: true, notifyDate: hoy, variant });
      alert('📣 Aviso SIN fecha enviado a ' + n + ' alumno(s): “Estás pronto a dar tu examen, practica…”.');
      onChange(); return;
    }
    const programar = aviso === 'antes' && diaAviso > hoy;
    F.setAnn(group.id, mid, {
      date, dateTo: null, from: from || null, to: to || null, variant, auto: true, forceClosed: false, closedOn: null, examId: exam.id,
      programmedAt: new Date().toISOString(), openedAt: null, openUntil: null,
      p2mode: multi ? p2mode : null, p2date: multi && p2mode === 'otro' ? p2date : null,
      p2from: multi && p2mode === 'otro' ? (p2from || null) : null, p2to: multi && p2mode === 'otro' ? (p2to || null) : null,
      notifyDate: aviso === 'no' ? null : (programar ? diaAviso : hoy), notified: aviso === 'no' ? true : !programar,
    });
    if (!win) X.createWindow({ examId: exam.id, groupId: group.id, isOpen: false });
    else if (win.isOpen) X.setWindowOpen(win.id, false);   /* manda el horario: nada abierto a mano */
    if (aviso !== 'no' && !programar) X.announceExam(group.id, mid, exam.id, date);
    alert('💾 Guardado para ' + group.name + ':\n' + lineas.join('\n'));
    onChange();
  };
  const abrirAhora = (untilIso) => {
    if (sel.length) F.setFresh(group.id, exam.id, sel);
    let w = win;
    if (!w) { X.createWindow({ examId: exam.id, groupId: group.id, isOpen: false }); w = X.windowForExamGroup(exam.id, group.id); }
    if (w) X.setWindowOpen(w.id, true);
    F.setAnn(group.id, mid, { examId: exam.id, forceClosed: false, closedOn: null, openedAt: new Date().toISOString(), openUntil: untilIso, variant, p2mode: multi ? 'seguida' : null });
    setAbrir(false); onChange(); goStep(2);
  };

  const filas = members.filter(s => filtro === 'all' ? true : filtro === 'in' ? A.canEnter(s) : !A.canEnter(s));
  return (
    <div>
      {est.step === 3 && <div style={{background:'#FFF3E0', borderRadius:11, padding:'9px 13px', fontSize:12.5, fontWeight:700, color:'#6B4300', marginBottom:12}}>Este examen ya se rindió. Si lo programas otra vez, en la tabla marcas quién lo da de nuevo como <b>nota nueva</b>; los demás conservan su nota.</div>}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:12}}>
        <div style={ecCard}>
          <div style={ecCardT}>🗓️ Cuándo <span style={{fontFamily:"'Nunito',sans-serif", fontSize:11.5, fontWeight:800, color:'#8A8578'}}>· hora de Perú</span></div>
          <div className="row-flex" style={{gap:7, flexWrap:'wrap', opacity: noDate ? .45 : 1}}>
            <b style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:13, minWidth:58}}>{multi ? 'Parte 1' : 'Examen'}</b>
            <input type="date" className="input-text" style={{width:150}} value={date} disabled={noDate} onChange={e => setDate(e.target.value)} />
            <span style={{fontSize:11.5, fontWeight:800, color:'#8A8578'}}>de</span>
            <input type="time" className="input-text" style={{width:108}} value={from} disabled={noDate} onChange={e => setFrom(e.target.value)} />
            <span style={{fontSize:11.5, fontWeight:800, color:'#8A8578'}}>a</span>
            <input type="time" className="input-text" style={{width:108}} value={to} disabled={noDate} onChange={e => setTo(e.target.value)} />
          </div>
          {multi && <>
            <div className="row-flex" style={{gap:7, flexWrap:'wrap', marginTop:8, opacity: noDate ? .45 : 1}}>
              <b style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:13, minWidth:58}}>Parte 2</b>
              {ecSegBtns(p2mode, setP2mode, [['seguida', 'Seguida, al terminar la Parte 1'], ['otro', 'Otro día']], noDate)}
            </div>
            {p2mode === 'otro' && <div className="row-flex" style={{gap:7, flexWrap:'wrap', marginTop:7, paddingLeft:65, opacity: noDate ? .45 : 1}}>
              <input type="date" className="input-text" style={{width:150}} value={p2date} disabled={noDate} onChange={e => setP2date(e.target.value)} />
              <span style={{fontSize:11.5, fontWeight:800, color:'#8A8578'}}>de</span>
              <input type="time" className="input-text" style={{width:108}} value={p2from} disabled={noDate} onChange={e => setP2from(e.target.value)} />
              <span style={{fontSize:11.5, fontWeight:800, color:'#8A8578'}}>a</span>
              <input type="time" className="input-text" style={{width:108}} value={p2to} disabled={noDate} onChange={e => setP2to(e.target.value)} />
            </div>}
            <div className="settings-hint" style={{margin:'8px 0 0'}}>{p2mode === 'seguida' ? <>Al entregar la Parte 1, <b>en la misma página del examen</b> le aparece «Sigue la Parte 2». No vuelve a la plataforma a buscarla.</> : <>Al entregar la Parte 1 verá «Tu Parte 2 es el {p2date ? ecCorta(p2date) : '…'}». Cada parte se abre y se cierra sola.</>}</div>
          </>}
          {!multi && <div className="settings-hint" style={{margin:'8px 0 0'}}>Se abre y se cierra solo. Después de la hora de cierre no queda nada abierto.</div>}
          <label className="check-row" style={{margin:'10px 0 0'}}><input type="checkbox" checked={noDate} onChange={e => setNoDate(e.target.checked)} /><span style={{fontSize:12}}>Todavía no tengo la fecha (solo avisar que se acerca)</span></label>
        </div>
        <div style={ecCard}>
          <div style={ecCardT}>📣 Aviso a los alumnos</div>
          {ecSegBtns(noDate ? 'ahora' : aviso, setAviso, [['ahora', 'Al guardar'], ['antes', '2 días antes'], ['no', 'Sin campanita']], noDate)}
          <div style={{display:'flex', gap:9, alignItems:'flex-start', background:'#F6F3EA', borderRadius:11, padding:'9px 11px', marginTop:10, fontSize:12.5, fontWeight:700}}>
            <span style={{fontSize:16}}>🔔</span>
            <div><div style={{fontSize:10, fontWeight:900, letterSpacing:'.05em', textTransform:'uppercase', color:'#A08F63'}}>Lo que verán</div>
              {noDate ? 'Estás pronto a dar tu examen. ¡Practica un poquito cada día!' : aviso === 'no' ? <span style={{color:'#8A8578'}}>No se envía campanita: el examen igual aparece en su módulo con la cuenta regresiva.</span> : <>🎓 Tu examen es el {date ? F.fmtFecha(date) : '…'}{from ? ', ' + F.fmtHora(from) : ''}.{multi ? (p2mode === 'seguida' ? ' Las 2 partes van seguidas.' : ' La Parte 2 es el ' + (p2date ? F.fmtFecha(p2date) : '…') + '.') : ''} ¡Practica!</>}
            </div>
          </div>
        </div>
      </div>

      <div style={{...ecCard, marginTop:12, padding:0}}>
        <button onClick={() => setMore(v => !v)} style={{width:'100%', background:'none', border:0, padding:'11px 14px', display:'flex', gap:8, alignItems:'center', cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:12.5, color:'var(--text)', textAlign:'left'}}>
          ⚙️ Más opciones <span style={{color:'#A39C8C', fontWeight:700}}>versión · quiénes califican{pre ? ' · pre-examen' : ''}</span>
          <span style={{marginLeft:'auto', color:'#B0A99A', fontSize:17, transform: more ? 'rotate(90deg)' : 'none', transition:'.2s'}}>›</span>
        </button>
        {more && <div style={{borderTop:'1px dashed #EFE7D2', padding:'10px 14px 14px', display:'grid', gap:12}}>
          <div><div style={{fontSize:11, fontWeight:900, color:'#8A8578', marginBottom:5}}>Versión del examen</div>
            {ecSegBtns(variant, v => { setVariant(v); if (ann) { F.setAnn(group.id, mid, { variant: v }); onChange(); } }, [['mixed', '👥 Que elija el alumno'], ['kids', '🧒 Niños'], ['adults', '🧑 Adultos']])}</div>
          <div><div style={{fontSize:11, fontWeight:900, color:'#8A8578', marginBottom:5}}>Quiénes califican speaking / writing</div>
            <div className="row-flex" style={{gap:6, flexWrap:'wrap'}}>{ecPill('#E3E9F8', '#1F3A8A', '👩‍🏫 Tú (siempre)', 'yo')}{['Teacher', 'Asistente'].map(g => <button key={g} className={`preset ${graders.includes(g) ? 'on' : ''}`} onClick={() => toggleGrader(g)}>{g === 'Teacher' ? '🧑‍🏫' : '🙋'} {g}</button>)}</div>
            <div className="settings-hint" style={{margin:'6px 0 0'}}>Lo objetivo se corrige solo, al instante. Mientras tanto el alumno ve su nota parcial.</div></div>
          {pre && window.PreexamFolderRow && <div><div style={{fontSize:11, fontWeight:900, color:'#8A8578', marginBottom:5}}>Pre-examen del módulo</div><PreexamFolderRow group={group} module={it.mod} act={pre} onChange={onChange} /></div>}
        </div>}
      </div>

      <div style={{marginTop:12, border:'1.5px solid #1F3A8A', borderRadius:12, background:'#F7F9FE', padding:'12px 14px'}}>
        <div style={{fontSize:10.5, fontWeight:900, letterSpacing:'.06em', textTransform:'uppercase', color:'#1F3A8A', marginBottom:5}}>Así queda</div>
        <div style={{display:'grid', gap:3, fontSize:12.5, fontWeight:700, marginBottom:11}}>{lineas.map((l, i) => <div key={i}>{l}</div>)}</div>
        <div className="row-flex" style={{gap:8, flexWrap:'wrap'}}>
          <button className="btn-save" onClick={guardar}>💾 Guardar</button>
          <span style={{fontSize:11.5, fontWeight:800, color:'#A8A08E'}}>o</span>
          <button className="att-btn" style={{background:'#2E7D32', borderColor:'#2E7D32', color:'#fff'}} onClick={() => setAbrir(true)}>▶ Abrir ahora</button>
          <span style={{flex:1}}></span>
          {ann && (ann.date || ann.notified) && <button className="att-btn" onClick={() => { if (confirm('¿Quitar la programación? El aviso y la cuenta regresiva desaparecen para los alumnos.')) { const keep = (ann && ann.paused) || []; F.setAnn(group.id, mid, null); if (keep.length) F.setAnn(group.id, mid, { paused: keep, examId: exam.id }); X.cancelAnnouncement(group.id, mid); onChange(); } }}>✕ Quitar programación</button>}
        </div>
        {ann && ann.date && <div className="settings-hint" style={{margin:'8px 0 0'}}>✓ Programado: aviso {ann.notified ? 'ya enviado' : 'se enviará el ' + ecCorta(ann.notifyDate)} · examen {ecCorta(ann.date)}{ann.from ? ', ' + F.fmtHora(ann.from) : ''}{ann.to ? ' – ' + F.fmtHora(ann.to) : ''}{ann.p2mode === 'otro' && ann.p2date ? ' · Parte 2 ' + ecCorta(ann.p2date) : ''} · sale en tu calendario de Planificar.</div>}
      </div>

      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap', margin:'20px 0 8px'}}>
        <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:14.5}}>👥 Quién lo dará</div>
        {ecSegBtns(filtro, setFiltro, [['all', 'Todos ' + members.length], ['in', 'Pueden entrar ' + (members.length - nSin)], ['out', 'Sin acceso ' + nSin]])}
      </div>
      <div style={{overflowX:'auto', border:'1.5px solid #EFE7D2', borderRadius:12}}>
        <table style={{width:'100%', borderCollapse:'collapse', minWidth:640}}>
          <thead><tr><th style={ecTh}>Alumno</th><th style={ecTh}>Preparación</th><th style={ecTh}>Acceso</th><th style={ecTh}>Este examen</th></tr></thead>
          <tbody>{filas.map(s => { const r = A.readyOf(s), acc = A.accOf(s), ok = A.canEnter(s), y = yaMap[s.id]; return (
            <tr key={s.id}>
              <td style={ecTd}><div style={{display:'flex', gap:8, alignItems:'center', fontWeight:800, whiteSpace:'nowrap'}}><span style={{width:9, height:9, borderRadius:'50%', background: ok ? '#2E7D32' : '#C9C2B2', flexShrink:0}}></span>{s.fullName}</div></td>
              <td style={ecTd}><span style={{display:'inline-block', width:60, height:6, borderRadius:4, background:'#EEE9DC', overflow:'hidden', verticalAlign:'middle', marginRight:6}}><span style={{display:'block', height:'100%', width: Math.min(100, r.overall || 0) + '%', background: (r.overall || 0) >= 75 ? '#2E7D32' : '#F9A825'}}></span></span><b>{r.overall || 0}%</b></td>
              <td style={ecTd}><EcAccSeg v={acc} onSet={v => A.setAcc(s, v)} /><EcAccSub acc={acc} r={r} /></td>
              <td style={ecTd}>{y ? <>
                  <div style={{fontSize:11, fontWeight:700, color:'#8A8578'}}>Ya lo dio{y.today ? ' HOY' : ' el ' + ecCorta(window.JUCUM_DAY.of(y.date))}{typeof y.score === 'number' ? ' · ' + y.score : ''}</div>
                  <label className="check-row" style={{margin:'3px 0 0'}}><input type="checkbox" checked={sel.includes(s.id)} onChange={e => setSel(e.target.checked ? sel.concat([s.id]) : sel.filter(x => x !== s.id))} /><span style={{fontSize:11.5, fontWeight:800}}>Lo da de nuevo (nota nueva)</span></label>
                </> : ok ? ecPill('#E8F5E9', '#2E7D32', 'lo dará', 'l') : ecPill('#F0F0EA', '#888', 'no entra', 'n')}</td>
            </tr>); })}</tbody>
        </table>
      </div>
      {abrir && <EcAbrirModal exam={exam} group={group} defTo={to || (ann && ann.to) || ''} entran={nLo} total={members.length} onClose={() => setAbrir(false)} onOpen={abrirAhora} />}
    </div>
  );
}

/* ▶ “Abrir ahora” SIEMPRE pregunta hasta qué hora (pedido de la usuaria, 24-oct) */
function EcAbrirModal({ exam, group, defTo, entran, total, onClose, onOpen }) {
  const F = window.JUCUM_EXAMFLOW;
  const now = F.pMin();
  const opts = [];
  const tMin = ecMinOf(defTo);
  if (tMin != null && tMin > now + 5) opts.push(['to', 'Hasta la hora de cierre', defTo]);
  opts.push(['60', 'Por 1 hora', ecHM(now + 60)], ['120', 'Por 2 horas', ecHM(now + 120)]);
  const [k, setK] = ecUS(opts[0][0]);
  const [otra, setOtra] = ecUS('');
  const hasta = k === 'otra' ? otra : (opts.find(o => o[0] === k) || [])[2];
  const valido = !!hasta && ecMinOf(hasta) != null && ecMinOf(hasta) > now;
  const opt = (key, label, right) => (
    <label key={key} style={{display:'flex', gap:10, alignItems:'center', border:'1.5px solid ' + (k === key ? '#1F3A8A' : '#D5CDBB'), background: k === key ? '#F7F9FE' : '#fff', borderRadius:12, padding:'9px 12px', marginTop:8, fontSize:13, fontWeight:800, cursor:'pointer'}}>
      <input type="radio" checked={k === key} onChange={() => setK(key)} />{label}<span style={{marginLeft:'auto', fontSize:12, color:'#8A8578'}}>{right}</span>
    </label>
  );
  return (
    <div onClick={onClose} style={{position:'fixed', inset:0, background:'rgba(62,58,51,.38)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16}}>
      <div onClick={e => e.stopPropagation()} style={{background:'#fff', borderRadius:16, maxWidth:430, width:'100%', padding:'18px 20px', boxShadow:'0 18px 40px rgba(0,0,0,.2)'}}>
        <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:17}}>▶ Abrir ahora · {exam.title}</div>
        <div className="settings-hint" style={{margin:'2px 0 0'}}>{group.name} · lo dan {entran} de {total} alumnos</div>
        <div style={{fontSize:13, fontWeight:800, marginTop:12}}>¿Hasta qué hora queda abierto?</div>
        {opts.map(o => opt(o[0], o[1], F.fmtHora(o[2])))}
        {opt('otra', 'Otra hora', <input type="time" className="input-text" style={{width:110}} value={otra} onClick={() => setK('otra')} onChange={e => { setOtra(e.target.value); setK('otra'); }} />)}
        <div className="settings-hint" style={{margin:'10px 0 0'}}>A esa hora se cierra solo (hora de Perú). Quien esté dentro alcanza a enviar lo que lleva.</div>
        <div className="row-flex" style={{gap:8, justifyContent:'flex-end', marginTop:14}}>
          <button className="att-btn" onClick={onClose}>Cancelar</button>
          <button className="btn-save" disabled={!valido} style={{opacity: valido ? 1 : .5}} onClick={() => valido && onOpen(ecHoyIso(hasta))}>🟢 Abrir{valido ? ' hasta las ' + F.fmtHora(hasta) : ''}</button>
        </div>
      </div>
    </div>
  );
}

/* ═══ ② DÍA DEL EXAMEN · en vivo ═══
 * Fuentes: nota registrada (progress exam-<id>:<parte>, con el corte de “nota nueva”) +
 * presencia en vivo (live_presence, la escribe jucum-connect desde la página del examen).
 * 🛟 Red de seguridad: quien entregó (se ve en vivo) pero su nota aún no llega, sale marcado. */
function EcEnVivo({ group, it, members, onChange, goStep }) {
  const D = window.JUCUM_DATA, X = window.JUCUM_EXAMS, F = window.JUCUM_EXAMFLOW, L = window.JUCUM_LIVE;
  const exam = it.exam, mid = it.mod.id;
  const A = ecAcceso(group, exam, mid, onChange);
  const ann = A.ann, win = A.win;
  const parts = F.partesDeExamen ? F.partesDeExamen(exam) : [{ key: 'p', label: 'Examen' }];
  const multi = parts.length > 1, otro = multi && ann && ann.p2mode === 'otro' && ann.p2date;
  const [rows, setRows] = ecUS([]);
  const [abrir, setAbrir] = ecUS(false);
  const [, setT] = ecUS(0);
  ecUE(() => { if (!L || !L.subscribe) return; return L.subscribe(r => setRows(r || []), 12000); }, []);
  ecUE(() => {
    const S = window.JUCUM_SYNC;
    const t = setInterval(() => { try { if (S && S.refreshProgress) S.refreshProgress().then(() => setT(x => x + 1)).catch(() => {}); else setT(x => x + 1); } catch (e) {} }, 30000);
    return () => clearInterval(t);
  }, []);
  const open = F.winEffectiveOpen(win);
  const hoy = F.pDay();
  const esDia2 = otro && hoy === ann.p2date;
  const cierre = F.abiertoAhoraHasta && F.abiertoAhoraHasta(ann) ? ecPeruHM(ann.openUntil) : ann ? (esDia2 ? (ann.p2to || ann.to) : ann.to) : null;
  const falta = cierre && open ? Math.max(0, ecMinOf(cierre) - F.pMin()) : null;
  const celda = (s, k) => {
    const comp = ((D.getStudentProgress && D.getStudentProgress(s.id)) || {}).completed || {};
    const e = comp['exam-' + exam.id + ':' + k];
    const desde = F.desdePara ? F.desdePara(exam, group.id, s.id) : null;
    if (e && typeof e.score === 'number' && (!desde || F.despuesDe(e.date, desde))) return { k: 'ok', score: e.score };
    const lr = rows.find(r => r.user_id === s.id && r.module_id === 'exam-' + exam.id && r.activity_id === k);
    if (lr && L) { const c = L.classify(lr); if (c.completed) return { k: 'llega', score: lr.score }; if (c.phase === 'gone') return { k: 'salio', min: c.elapsedMin }; return { k: 'in', min: c.elapsedMin }; }
    return { k: 'no' };
  };
  const data = members.map(s => {
    if (!A.canEnter(s)) return { s, c: [{ k: 'blk' }, { k: 'blk' }] };
    const c = parts.map(p => celda(s, p.key));
    if (multi && c[1].k === 'no' && (c[0].k === 'ok' || c[0].k === 'llega')) c[1] = otro && hoy < ann.p2date ? { k: 'dia' } : { k: 'puede' };
    return { s, c };
  });
  const cnt = { no: 0, p1: 0, p2: 0, todo: 0, blk: 0, llega: [], salio: [] };
  data.forEach(({ s, c }) => {
    if (c[0].k === 'blk') { cnt.blk++; return; }
    c.forEach(x => { if (x.k === 'llega') cnt.llega.push(s); if (x.k === 'salio') cnt.salio.push(s); });
    if (c[0].k === 'no') cnt.no++;
    else if (c[0].k === 'in' || c[0].k === 'salio') cnt.p1++;
    else if (!multi || c[1].k === 'ok' || c[1].k === 'llega') cnt.todo++;
    else if (c[1].k === 'in' || c[1].k === 'puede' || c[1].k === 'salio') cnt.p2++;
    else cnt.todo++;
  });
  const K = multi ? [['No han entrado', cnt.no], ['En la Parte 1', cnt.p1], [otro ? 'Parte 1 entregada' : 'En la Parte 2', cnt.p2 + (otro ? cnt.todo : 0)], ...(otro ? [] : [['Entregaron todo', cnt.todo]]), ['Sin acceso', cnt.blk]]
    : [['No han entrado', cnt.no], ['Dentro', cnt.p1], ['Entregaron', cnt.todo], ['Sin acceso', cnt.blk]];
  const mas15 = () => {
    if (F.abiertoAhoraHasta(ann)) F.setAnn(group.id, mid, { openUntil: new Date(Date.parse(ann.openUntil) + 15 * 60000).toISOString() });
    else if (ann && esDia2 && (ann.p2to || ann.to)) F.setAnn(group.id, mid, { p2to: ecHM(ecMinOf(ann.p2to || ann.to) + 15) });
    else if (ann && ann.to) F.setAnn(group.id, mid, { to: ecHM(ecMinOf(ann.to) + 15) });
    onChange();
  };
  const cerrar = () => {
    if (!confirm('¿Cerrar el examen ahora? Quien esté dentro alcanza a enviar lo que lleva. ' + (otro && !esDia2 ? 'La Parte 2 del ' + ecCorta(ann.p2date) + ' sigue programada.' : ''))) return;
    if (F.abiertoAhoraHasta(ann)) F.setAnn(group.id, mid, { openUntil: new Date().toISOString(), closedOn: hoy });
    else F.setAnn(group.id, mid, { closedOn: hoy, examId: exam.id });
    if (win && win.isOpen) X.setWindowOpen(win.id, false);
    onChange();
  };
  const chip = (x) => {
    if (x.k === 'ok') return ecPill('#E8F5E9', '#2E7D32', '✓ ' + x.score, 'c');
    if (x.k === 'llega') return ecPill('#FFF3E0', '#8A5100', '⏳ entregó' + (x.score != null ? ' · ' + x.score : '') + ' · nota en camino', 'c');
    if (x.k === 'in') return ecPill('#E3E9F8', '#1F3A8A', '● dentro · ' + (x.min || 0) + ' min', 'c');
    if (x.k === 'salio') return ecPill('#F0F0EA', '#8A5100', 'salió sin entregar', 'c');
    if (x.k === 'puede') return ecPill('#FFF8E1', '#E65100', 'puede empezar', 'c');
    if (x.k === 'dia') return ecPill('#F0F0EA', '#77746B', 'el ' + ecCorta(ann.p2date), 'c');
    if (x.k === 'blk') return <span style={{fontSize:11.5, fontWeight:700, color:'#9A9384'}}>sin acceso</span>;
    return ecPill('#F0F0EA', '#888', 'no ha entrado', 'c');
  };
  return (
    <div>
      <div style={{border:'1.5px solid ' + (open ? '#A5D6A7' : '#D5CDBB'), borderRadius:12, background: open ? '#F6FBF6' : '#FBFAF5', padding:'12px 14px'}}>
        <div className="row-flex" style={{gap:8, flexWrap:'wrap', fontSize:13, fontWeight:800}}>
          {open ? <><span style={{width:10, height:10, borderRadius:'50%', background:'#2E7D32', boxShadow:'0 0 0 4px rgba(46,125,50,.18)'}}></span>En curso{esDia2 ? ' · Parte 2' : multi && otro ? ' · Parte 1' : ''}{cierre ? ' · se cierra solo a las ' + F.fmtHora(cierre) : ''}{falta != null ? ' · faltan ' + falta + ' min' : ''}</>
            : <>⚪ Cerrado ahora{ann && ann.date && F.enFechaAnn(ann, hoy) && ann.from && ecMinOf(ann.from) > F.pMin() ? ' · se abre solo a las ' + F.fmtHora(esDia2 ? (ann.p2from || ann.from) : ann.from) : ''}</>}
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))', gap:8, margin:'11px 0'}}>
          {K.map(([l, n]) => <div key={l} style={{background:'#fff', border:'1px solid #EFE7D2', borderRadius:11, padding:'8px 10px'}}><b style={{display:'block', fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:22, lineHeight:1.1}}>{n}</b><span style={{fontSize:11, fontWeight:800, color:'#8A8578'}}>{l}</span></div>)}
        </div>
        <div className="row-flex" style={{gap:8, flexWrap:'wrap'}}>
          {open ? <><button className="att-btn" onClick={mas15}>+15 min a todos</button><button className="att-btn" onClick={cerrar}>⚪ Cerrar ahora</button></>
            : <button className="att-btn" style={{background:'#2E7D32', borderColor:'#2E7D32', color:'#fff'}} onClick={() => setAbrir(true)}>▶ Abrir ahora</button>}
          <button className="att-btn" onClick={() => goStep(3)}>📊 Ver notas</button>
          <span className="settings-hint" style={{margin:0}}>Se actualiza solo. ¿Alguien no puede entrar? Su motivo está en su fila.</span>
        </div>
      </div>
      {cnt.llega.length > 0 && <div style={{marginTop:10, background:'#FFF3E0', border:'1.5px solid #FFB74D', borderRadius:12, padding:'10px 13px', fontSize:12.5, fontWeight:700, color:'#6B4300', lineHeight:1.55}}>⏳ <b>{cnt.llega.map(s => s.fullName.split(' ')[0]).join(', ')}</b>: {cnt.llega.length > 1 ? 'entregaron' : 'entregó'}, pero la nota aún no llega a la nube. Normalmente llega sola en segundos. Si en 2 minutos sigue así, que {cnt.llega.length > 1 ? 'abran' : 'abra'} el examen otra vez <b>en el mismo equipo</b>: la nota guardada ahí se reenvía sola.</div>}
      {cnt.salio.length > 0 && <div style={{marginTop:10, background:'#F6F3EA', borderRadius:12, padding:'10px 13px', fontSize:12.5, fontWeight:700, color:'#55524A'}}>⚠ Salieron sin entregar: <b>{cnt.salio.map(s => s.fullName.split(' ')[0]).join(', ')}</b>. Pueden volver a entrar mientras esté abierto: siguen donde se quedaron.</div>}
      <div style={{overflowX:'auto', border:'1.5px solid #EFE7D2', borderRadius:12, marginTop:14}}>
        <table style={{width:'100%', borderCollapse:'collapse', minWidth:620}}>
          <thead><tr><th style={ecTh}>Alumno</th><th style={ecTh}>Acceso</th>{parts.map(p => <th key={p.key} style={ecTh}>{multi ? p.label : 'Examen'}</th>)}<th style={ecTh}></th></tr></thead>
          <tbody>{data.map(({ s, c }) => { const acc = A.accOf(s); return (
            <tr key={s.id}>
              <td style={ecTd}><div style={{display:'flex', gap:8, alignItems:'center', fontWeight:800, whiteSpace:'nowrap'}}><span style={{width:9, height:9, borderRadius:'50%', background: A.canEnter(s) ? '#2E7D32' : '#C9C2B2', flexShrink:0}}></span>{s.fullName}</div></td>
              <td style={ecTd}><EcAccSeg v={acc} onSet={v => A.setAcc(s, v)} />{!A.canEnter(s) && <EcAccSub acc={acc} r={A.readyOf(s)} />}</td>
              {parts.map((p, i) => <td key={p.key} style={ecTd}>{chip(c[i] || { k: 'no' })}</td>)}
              <td style={{...ecTd, textAlign:'right'}}>{window.EcVerExamen && <EcVerExamen exam={exam} student={s} group={group} rindio={c.some(x => x.k === 'ok' || x.k === 'llega')} />}</td>
            </tr>); })}</tbody>
        </table>
      </div>
      {abrir && <EcAbrirModal exam={exam} group={group} defTo={(ann && (esDia2 ? (ann.p2to || ann.to) : ann.to)) || ''} entran={members.filter(A.canEnter).length} total={members.length} onClose={() => setAbrir(false)} onOpen={(iso) => { let w = win; if (!w) { X.createWindow({ examId: exam.id, groupId: group.id, isOpen: false }); w = X.windowForExamGroup(exam.id, group.id); } if (w) X.setWindowOpen(w.id, true); F.setAnn(group.id, mid, { examId: exam.id, forceClosed: false, closedOn: null, openedAt: new Date().toISOString(), openUntil: iso }); setAbrir(false); onChange(); }} />}
    </div>
  );
}

/* 🧩 Exámenes de 2+ partes (final: Día 1 + Día 2): chips con la nota de cada parte y el
 * promedio — o el aviso de qué parte falta (promedio parcial) · 24-ago-2026 */
function EcPartes({ exam, best }) {
  const F = window.JUCUM_EXAMFLOW;
  const det = best && best._detalle;
  const total = (best && best._totalPartes) || 0;
  if (!det || !det.length || (total < 2 && (F.partesDeExamen ? F.partesDeExamen(exam).length : 0) < 2)) return null;
  const falta = F.faltanPartes ? F.faltanPartes(exam, det) : null;
  return (
    <div style={{display:'flex', gap:6, flexWrap:'wrap', alignItems:'center', margin:'5px 0 2px'}}>
      {det.map(d => <span key={d.part} className="mm-chip" style={{background:'#EEF2FB', color:'#1F3A8A'}}>📅 {F.lblParte ? F.lblParte(exam, d.part) : d.part}: <b>&nbsp;{d.score}</b></span>)}
      {falta
        ? <span className="mm-chip" style={{background:'#FFF3E0', color:'#8A5100'}}>⚠ falta {falta} — nota parcial: {best.score} (sube al completarla)</span>
        : <span className="mm-chip" style={{background:'#E8F5E9', color:'#2E7D32'}}>promedio final: <b>&nbsp;{best.score}</b></span>}
    </div>
  );
}

function EcModResults({ group, module, members, onChange }) {
  const D = window.JUCUM_DATA, X = window.JUCUM_EXAMS, F = window.JUCUM_EXAMFLOW;
  const soloEx = String(module.id).indexOf('exam:') === 0;   /* examen final u otro sin módulo */
  const exam = soloEx ? X.getExam(String(module.id).slice(5)) : X.examForModule(module.id, group.level);
  const isForms = exam && /^ex-m1forms-/.test(exam.id);
  const formsWin = F.formsWindowFor(group);
  const isM1 = (D.MODULE_CATALOG[group.level] || [])[0]?.id === module.id;
  const min = F.minGradeFor(group.id);
  const [rows, setRows] = ecUS(null);
  const [busy, setBusy] = ecUS(false);
  const [err, setErr] = ecUS(null);
  const [ficha, setFicha] = ecUS('ap');
  const load = async () => {
    const SBW = window.JUCUM_SB; if (!SBW || !exam || isForms) { setRows([]); return; }
    setBusy(true); setErr(null);
    try {
      const slugs = (exam.parts || []).map(p => (((p.url || '').match(/\/(m\d+)\/examen/) || [])[1])).filter(Boolean);
      const sb = SBW.getClient();
      /* ⏱️ 23-ago-2026: cuando el navegador está bajando el historial completo al entrar, esta
       * consulta se queda en cola y el panel se congelaba en “Leyendo resultados de la nube…”
       * para siempre. Ahora a los 12 s seguimos con las notas guardadas en este equipo. */
      const q = sb.from('diagnostic_attempts').select('user_id,score,correct,total,sections,attempt_no,created_at,module_id,activity_id')
        .in('user_id', members.map(s => s.id)).order('created_at', { ascending: true }).limit(1000);
      const res = await Promise.race([q, new Promise(r => setTimeout(() => r({ data: null, error: { message: '__lento__' } }), 12000))]);
      if (res && res.error) { setErr(res.error.message === '__lento__' ? 'La nube tardó demasiado en responder — te muestro las notas guardadas en este equipo. Vuelve a entrar a esta pestaña para reintentar.' : res.error.message); setRows([]); }
      else setRows(((res && res.data) || []).filter(r => (r.module_id === 'exam-' + exam.id || slugs.some(sl => r.activity_id === 'examen-' + sl)) && (!F.examDesde || !F.examDesde(exam) || window.JUCUM_DAY.of(r.created_at) >= F.examDesde(exam))));
    } catch (e) { setErr(String(e && e.message || e)); setRows([]); }
    setBusy(false);
  };
  ecUE(() => { load(); }, [module.id]);

  /* M1 por Google Forms: mostrar las notas registradas SIEMPRE que existan para este módulo */
  const formsExam0 = formsWin ? X.getExam(formsWin.examId) : null;
  const formsCubre = !!(formsWin && formsExam0 && (formsExam0.moduleIds || []).includes(module.id));
  if (formsCubre && (!exam || isForms)) {
    return (
      <div className="scard">
        <div className="sec-head"><div className="sec-title">📋 Notas del {module.name}</div><span className="sec-meta">Google Forms · registradas y conservadas</span></div>
        <NotesList members={members} results={formsWin.results || {}} />
      </div>
    );
  }
  if (!exam) return <div className="scard"><div className="empty-state"><div className="icon">⏳</div>Desarrollo aún no sube el examen de este módulo.</div></div>;

  const win = X.windowForExamGroup(exam.id, group.id);
  const manual = (win && win.results) || {};
  const by = {}; (rows || []).forEach(r => { (by[r.user_id] = by[r.user_id] || []).push(r); });
  /* 🚑 Respaldo (06-ago): la nota del examen también queda en el registro de práctica
   * (progress → 'exam-<examId>:<parte>'), hidratado en ESTE equipo. Si la nube de
   * intentos no responde (RLS/anon), el panel igual muestra las notas — nunca un falso 0. */
  const retW = F.getRet ? F.getRet(group.id, module.id) : null;
  const desdeW = F.examDesde ? F.examDesde(exam) : null;
  const desdeOf = s => (F.desdePara ? F.desdePara(exam, group.id, s.id) : desdeW);   /* NUEVA-NOTA-V1 */
  const progOf = s => { try {
    const comp = (D.getStudentProgress(s.id) || {}).completed || {};
    const ks = Object.keys(comp).filter(k => k.indexOf('exam-' + exam.id + ':') === 0);
    const rws = ks.map(k => ({ score: (comp[k] || {}).score, date: (comp[k] || {}).date, part: F.canonPart ? F.canonPart(exam, k.split(':').slice(1).join(':')) : k.split(':').slice(1).join(':') })).filter(r => typeof r.score === 'number');
    if (!rws.length) return null;
    const of = F.notaOficialPartes ? F.notaOficialPartes(rws, retW, desdeOf(s)) : F.notaOficial(rws, retW, desdeOf(s));
    return of ? { score: of.score, created_at: of.date, fromProgress: true, _n: of.intentos, _recu: of.isRecovery, _partes: of.partes, _totalPartes: of.totalPartes, _detalle: of.detalle } : null;
  } catch (e) { return null; } };
  const list = members.map(s => {
    const rs = by[s.id] || [];
    /* Nota oficial: su PRIMER intento (o el de su recuperación autorizada). Nunca la mejor
     * ni el promedio de dos intentos — 23-ago-2026. */
    const of = (rs.length && F.notaOficialPartes) ? F.notaOficialPartes(rs.map(r => ({ score: r.score, date: r.created_at, part: F.canonPart ? F.canonPart(exam, r.activity_id) : r.activity_id })), retW, desdeOf(s)) : null;
    let best = of ? Object.assign({}, rs.find(r => r.created_at === of.date) || rs[0], { score: of.score, _n: of.intentos, _recu: of.isRecovery, _sinPermiso: of.sinPermiso, _detalle: of.detalle, _totalPartes: of.totalPartes }) : null;
    const pr = progOf(s);
    if (!best && pr) best = pr;
    /* 🧮 Con una parte pendiente, la nota mostrada es proporcional (24-ago) */
    if (best && F.notaExamen) { const adj = F.notaExamen(exam, { score: best.score, detalle: best._detalle, totalPartes: best._totalPartes }); if (adj && adj.parcial) best = Object.assign({}, best, { score: adj.score, _parcial: true, _falta: adj.falta }); }
    const man = manual[s.id] || null;
    const nota = man && typeof man.grade === 'number' ? man.grade : (best ? best.score : null);
    const rindio = !!(best || man);
    const aprob = rindio && (typeof nota === 'number' ? nota >= min : !!(man && man.passed));
    return { s, rs, best, man, nota, rindio, aprob };
  });
  const aprobados = list.filter(x => x.aprob).sort((a, b) => (b.nota || 0) - (a.nota || 0));
  const recupera = list.filter(x => x.rindio && !x.aprob);
  const porRendir = list.filter(x => !x.rindio);
  const ann = F.getAnn(group.id, module.id);
  const yaFue = (ann && ann.date && ann.date <= F.pDay()) || (rows || []).length > 0 || Object.keys(manual).length > 0 || list.some(x => x.rindio);
  const prom = (() => { const con = list.filter(x => typeof x.nota === 'number'); return con.length ? Math.round(con.reduce((a, x) => a + x.nota, 0) / con.length) : null; })();
  /* 🗓️ Día Perú del último intento — para que se VEA qué examen se está mirando (14-sep-2026) */
  const ultimoDia = (() => { const m = (rows || []).reduce((a, r) => String(r.created_at || '') > a ? String(r.created_at || '') : a, ''); if (!m) return null; try { return new Date(Date.parse(m) - 5 * 3600000).toISOString().slice(0, 10); } catch (e) { return null; } })();

  if (rows === null) return <div className="scard"><div className="empty-state"><div className="icon">⏳</div>Leyendo resultados de la nube…</div></div>;
  if (!yaFue) return <div className="scard"><div className="empty-state"><div className="icon">🗓️</div>{ann && ann.date ? 'Aún sin resultados — el examen está programado para el ' + F.fmtFecha(ann.date) + '.' : 'Este examen todavía no se programa. Hazlo en Configurar.'}</div></div>;

  const fichaBtn = (k, txt, n, color) => (
    <button key={k} onClick={() => setFicha(k)} style={{
      border:'1.5px solid ' + (ficha === k ? '#D5CDBB' : 'var(--border)'), borderBottom:'none',
      background: ficha === k ? '#fff' : '#F4F1E8', color: ficha === k ? (color || 'var(--text)') : '#6B6455',
      borderRadius:'10px 10px 0 0', padding: ficha === k ? '9px 14px' : '7px 14px 9px', marginBottom:-1.5,
      fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:12, cursor:'pointer',
      borderTop: ficha === k ? '2.5px solid ' + (color || '#F9A825') : '1.5px solid var(--border)'}}>{txt} ({n})</button>
  );

  return (
    <div>
      <div style={{display:'flex', alignItems:'center', gap:9, flexWrap:'wrap', margin:'0 0 10px', fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:15}}>🎓 {exam.title || module.name}{ultimoDia ? <span className="mm-chip" style={{background:'#EEF2FB', color:'#1F3A8A'}}>último rendido: {F.fmtFecha(ultimoDia)}</span> : ecPill('#FFF8E1', '#8A5100', 'nadie lo ha rendido aún', 'u')}</div>
      <div className="scard" style={{marginBottom:12, background:'#E8F5E9', borderColor:'#A5D6A7'}}>
        <div style={{display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', fontSize:12.5, color:'#1B5E20', fontWeight:700}}>
          <span style={{flex:1, minWidth:220}}>📤 <b>Publicación automática:</b> cada alumno ya ve su nota y sus partes flojas apenas termina. Aquí supervisas, escribes mensajes y manejas la recuperación.</span>
          <button className="att-btn" onClick={load} disabled={busy}>{busy ? '⏳…' : '↻ Actualizar'}</button>
        </div>
      </div>
      {err && <div className="scard" style={{marginBottom:12, background:'#FFEBEE', borderColor:'#EF9A9A'}}><div style={{fontSize:12.5, fontWeight:700, color:'#C62828'}}>⚠ No pude leer los intentos del examen desde la nube: {err} — avisa a Desarrollo con este mensaje.</div></div>}
      {formsCubre && (
        <div className="scard" style={{marginBottom:12}}>
          <div className="sec-head"><div className="sec-title">📋 Notas registradas (Google Forms)</div><span className="sec-meta">se conservan tal cual</span></div>
          <NotesList members={members} results={formsWin.results || {}} />
        </div>
      )}
      <div style={{display:'flex', gap:12, alignItems:'center', flexWrap:'wrap', background:'#FBFAF5', border:'1px solid var(--border)', borderRadius:12, padding:'9px 15px', fontSize:12.5, fontWeight:700, color:'#777', marginBottom:14}}>
        <span><b style={{fontSize:15}}>{list.filter(x => x.rindio).length}/{members.length}</b> rindieron</span>
        {prom != null && <span>promedio <b style={{fontSize:15}}>{prom}</b></span>}
        <span style={{color:'#2E7D32'}}>✅ <b>{aprobados.length}</b> aprobados</span>
        <span style={{color:'#C62828'}}>🔁 <b>{recupera.length + porRendir.length}</b> en recuperación · por rendir</span>
        <span>nota mínima <b>{min}</b></span>
      </div>
      <div style={{display:'flex', gap:4, alignItems:'flex-end', padding:'0 8px', position:'relative', zIndex:2, flexWrap:'wrap'}}>
        {fichaBtn('ap', '✅ Aprobados', aprobados.length, '#2E7D32')}
        {fichaBtn('re', '🔁 Recuperación y por rendir', recupera.length + porRendir.length, '#C62828')}
      </div>
      <div style={{border:'1.5px solid #D5CDBB', borderRadius:12, background:'#fff', padding:14, position:'relative', zIndex:1}}>
        {ficha === 'ap' && (aprobados.length
          ? aprobados.map(x => <EcApRow key={x.s.id} x={x} group={group} exam={exam} win={win} min={min} onChange={onChange} />)
          : <div className="settings-hint" style={{margin:0}}>Aún nadie aprueba este examen.</div>)}
        {ficha === 're' && <EcRetFicha group={group} module={module} exam={exam} win={win} min={min} recupera={recupera} porRendir={porRendir} onChange={onChange} />}
      </div>
    </div>
  );
}

function EcSecBars({ att }) {
  if (!att || !att.sections) return null;
  return (
    <div style={{display:'grid', gap:6, margin:'4px 0 8px'}}>
      {Object.keys(EC_PARTES).map(k => {
        const s = att.sections[k];
        if (!s || !s.t) return null;
        const pct = Math.round(s.h / s.t * 100);
        const color = pct >= 85 ? '#2E7D32' : pct >= 75 ? '#2EA84B' : pct >= 60 ? '#E65100' : '#C62828';
        return (
          <div key={k} style={{display:'flex', alignItems:'center', gap:9, fontSize:12.5, flexWrap:'wrap'}}>
            <span style={{flex:'0 0 185px', fontWeight:800}}>{EC_PARTES[k]}</span>
            <span style={{width:130, height:8, background:'#E8E4DA', borderRadius:5, overflow:'hidden', position:'relative'}}>
              <i style={{position:'absolute', inset:0, width:Math.min(100, pct) + '%', background:color, borderRadius:5, display:'block'}}></i>
            </span>
            <b style={{color, width:44}}>{pct}%</b>
            <span className="settings-hint" style={{margin:0}}>{s.h}/{s.t}</span>
          </div>
        );
      })}
    </div>
  );
}

function EcFBBox({ x, group, exam, win, min, onChange }) {
  const X = window.JUCUM_EXAMS;
  const [grading, setGrading] = ecUS(false);
  const nombre = x.s.fullName.split(' ')[0];
  const weak = ecWeakKeys(x.best);
  const draft = typeof x.nota === 'number' ? ecDraftFB(nombre, x.nota, weak, min) : '';
  const fbGuardado = x.man && x.man.feedback;
  const ensureWin = () => win || (X.createWindow({ examId: exam.id, groupId: group.id, isOpen: false }), X.windowForExamGroup(exam.id, group.id));
  return (
    <div>
      <div style={{background:'#F8FAFF', border:'1px solid #D9E2F4', borderRadius:11, padding:'9px 12px', margin:'8px 0', fontSize:12.5, lineHeight:1.6}}>
        <b style={{color:'#1F3A8A'}}>🧩 Mi lectura (solo tú):</b> {x.best
          ? (weak.length ? <>Le costaron <b>{weak.map(k => EC_PARTES[k]).join(' · ')}</b> — recomiéndale esas prácticas.</> : (x.best && x.best.fromProgress ? 'Nota tomada de su registro de práctica; el detalle por partes aparecerá cuando la nube de intentos responda.' : 'Dominó todas las partes del examen.'))
          : 'Nota registrada a mano (sin detalle por partes).'}
        <EcPartes exam={exam} best={x.best} />
        {x.rs.length > 1 ? <> Rindió <b>{x.rs.length}</b> veces — vale su <b>primer intento</b>{x.best && x.best._recu ? ' (reemplazado por su recuperación autorizada)' : ''}.{x.best && x.best._sinPermiso > 0 ? <> ⚠️ {x.best._sinPermiso} intento(s) fuera de una ventana de recuperación: no cuentan.</> : null}</> : null}
      </div>
      <div style={{background:'#fff', border:'1px solid var(--border)', borderRadius:11, padding:'9px 12px', fontSize:12.5, lineHeight:1.6}}>
        <b style={{color:'#1F3A8A'}}>📝 Mensaje para {nombre}:</b> {fbGuardado ? <>{x.man.feedback} <span className="mm-chip" style={{background:'#E8F5E9', color:'#2E7D32'}}>✏️ tuyo</span></> : <>{draft} <span className="mm-chip" style={{background:'#F3E5F5', color:'#7B1FA2'}}>🪄 borrador automático — envíalo o edítalo</span></>}
        <div className="row-flex" style={{gap:8, marginTop:8, flexWrap:'wrap'}}>
          <button className="att-btn" onClick={() => setGrading(true)}>📊 {fbGuardado ? 'Editar mensaje / nota' : 'Enviar mensaje / ajustar nota'}</button>
        </div>
      </div>
      {grading && <ExamGradeModal w={ensureWin()} student={x.s} suggested={x.best ? x.best.score : null} draft={draft} onClose={() => { setGrading(false); onChange(); }} />}
    </div>
  );
}

/* Link a la revisión del examen de UN alumno (abre el examen en modo profesor, directo a sus respuestas) */
function ecReviewUrl(exam, student, group) {
  const p = ((exam && exam.parts) || []).filter(x => x && x.url)[0];
  if (!p) return null;
  const sep = p.url.includes('?') ? '&' : '?';
  return p.url + sep + 'jucum_teacher=1&jucum_student=' + encodeURIComponent(student.id) + (group ? '&jucum_group=' + encodeURIComponent(group.id) : '');
}
function EcVerExamen({ exam, student, group, rindio }) {
  const url = ecReviewUrl(exam, student, group);
  if (!url) return null;
  if (!rindio) return <span className="settings-hint" style={{margin:0}}>Cuando rinda, aquí aparecerá el botón para ver su examen.</span>;
  return <a className="att-btn" href={url} target="_blank" rel="noreferrer" style={{textDecoration:'none'}} title="Abre su examen con sus respuestas, lo correcto y la explicación de cada pregunta">📝 Ver su examen (en qué se equivocó)</a>;
}

function EcApRow({ x, group, exam, win, min, onChange }) {
  const [open, setOpen] = ecUS(false);
  const weak = ecWeakKeys(x.best);
  return (
    <div style={{border:'1px solid var(--border)', borderRadius:12, marginBottom:8, background:'#fff', overflow:'hidden'}}>
      <div style={{display:'flex', alignItems:'center', gap:10, padding:'10px 13px', flexWrap:'wrap', cursor:'pointer'}} onClick={() => setOpen(v => !v)}>
        <div className="st-ava" style={{background:'linear-gradient(135deg,#3F5BB8,#0D1B5A)'}}>{x.s.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontWeight:800, fontSize:13}}>{x.s.fullName}</div>
          <div className="settings-hint" style={{margin:0}}>{weak.length ? 'Reforzar: ' + weak.map(k => EC_PARTES[k]).join(' · ') : x.best ? (x.best.fromProgress ? 'nota de su registro de práctica' : '✓ dominó todas las partes') : 'nota registrada a mano'}{x.best && x.best.attempt_no > 1 ? ' · mejor de ' + x.rs.length + ' intentos' : ''}</div>
        </div>
        {ecPill('#E8F5E9', '#2E7D32', <><b>{x.nota}</b>/100</>, 'n')}
        <span style={{color:'#B0A99A', fontSize:17, transform: open ? 'rotate(90deg)' : 'none', transition:'.2s'}}>›</span>
      </div>
      {open && (
        <div style={{borderTop:'1px dashed var(--border)', background:'#FBFAF5', padding:'12px 15px'}}>
          <EcSecBars att={x.best} />
          <div style={{marginBottom:10}}><EcVerExamen exam={exam} student={x.s} group={group} rindio={x.rindio} /></div>
          <EcFBBox x={x} group={group} exam={exam} win={win} min={min} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

function EcRetFicha({ group, module, exam, win, min, recupera, porRendir, onChange }) {
  const D = window.JUCUM_DATA, F = window.JUCUM_EXAMFLOW;
  const members = D.STUDENTS.filter(s => s.group === group.id);
  const ret = F.getRet(group.id, module.id);
  const need = [...recupera, ...porRendir];
  const [scope, setScope] = ecUS((ret && ret.scope) || 'need');
  const [from, setFrom] = ecUS((ret && ret.from) || F.pDay());
  const [to, setTo] = ecUS((ret && ret.to) || '');
  const [picked, setPicked] = ecUS((ret && ret.ids) || []);
  const targets = scope === 'all' ? members : scope === 'pick' ? members.filter(s => picked.includes(s.id)) : need.map(x => x.s);
  const confirmar = () => {
    if (!from || !to) { alert('Elige desde y hasta cuándo estará abierta la ventana.'); return; }
    if (to < from) { alert('La fecha final no puede ser antes de la inicial.'); return; }
    if (scope === 'pick' && !picked.length) { alert('Elige al menos un alumno.'); return; }
    F.setRet(group.id, module.id, { from, to, scope, ids: scope === 'pick' ? picked : [], setAt: new Date().toISOString() });
    if (window.JUCUM_NOTIF) targets.forEach(s => {
      window.JUCUM_NOTIF.pushNotif(s.id, {
        type: 'assignment',
        title: '🔁 Nueva oportunidad de examen',
        body: `Tu examen de "${module.name}" estará abierto del ${F.fmtFecha(from)} al ${F.fmtFecha(to)}. Rindes apenas estés apto: practica cada día (resúmenes, gramática y stories). ¡Tú puedes! 💪`,
        link: 'exam',
      });
    });
    alert('✓ Recuperación abierta del ' + F.fmtFecha(from) + ' al ' + F.fmtFecha(to) + ' · aviso enviado a ' + targets.length + ' alumno(s).');
    onChange();
  };
  return (
    <div>
      <div style={{border:'1px solid var(--border)', borderRadius:11, padding:'11px 14px', marginBottom:12, background:'#fff'}}>
        <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:13, color:'#1F3A8A', marginBottom:8}}>🔁 ¿Quiénes ingresan al examen de recuperación?</div>
        <div className="row-flex" style={{gap:7, flexWrap:'wrap'}}>
          <button className={`preset ${scope === 'need' ? 'on' : ''}`} onClick={() => setScope('need')}>🔴 Los que lo necesitan ({need.length})</button>
          <button className={`preset ${scope === 'all' ? 'on' : ''}`} onClick={() => setScope('all')}>👥 Todo el grupo (mejorar nota)</button>
          <button className={`preset ${scope === 'pick' ? 'on' : ''}`} onClick={() => setScope('pick')}>🎯 Elegir alumno…</button>
        </div>
        {scope === 'pick' && <div style={{marginTop:8, display:'grid', gap:5, maxHeight:170, overflowY:'auto'}}>
          {members.map(s => <label key={s.id} className="check-row" style={{margin:0}}><input type="checkbox" checked={picked.includes(s.id)} onChange={() => setPicked(p => p.includes(s.id) ? p.filter(x => x !== s.id) : [...p, s.id])} /><span style={{fontSize:12.5}}>{s.fullName}</span></label>)}
        </div>}
        <div className="row-flex" style={{gap:7, marginTop:9, flexWrap:'wrap'}}>
          <span style={{fontSize:11.5, fontWeight:800, color:'#1F3A8A'}}>📅 Abierta del</span>
          <input type="date" className="input-text" style={{width:145}} value={from} onChange={e => setFrom(e.target.value)} />
          <span style={{fontSize:11.5, fontWeight:800, color:'#1F3A8A'}}>al</span>
          <input type="date" className="input-text" style={{width:145}} value={to} onChange={e => setTo(e.target.value)} />
          <button className="btn-save" onClick={confirmar}>📤 {ret ? 'Re-abrir / actualizar' : 'Confirmar y abrir la recuperación'}</button>
          {ret && <button className="att-btn" onClick={() => { if (confirm('¿Quitar la ventana de recuperación?')) { F.setRet(group.id, module.id, null); onChange(); } }}>✕ Quitar</button>}
        </div>
        <div className="settings-hint" style={{margin:'7px 0 0'}}>
          {ret ? <>✓ Ventana: <b>{F.fmtFecha(ret.from)} – {F.fmtFecha(ret.to)}</b>{F.retActive(ret) ? ' · 🟢 abierta AHORA' : ''} · </> : null}
          Una sola ventana para <b>desaprobados y quienes no rindieron</b> — dentro de ella cada uno rinde <b>apenas cumple sus requisitos</b> (apto ≥75% + práctica {F.retMin}/{F.retDe} días + avance {F.retAvanceMin || 2} días de su plan en la ventana); tú puedes abrir o pausar por alumno.
        </div>
      </div>
      {need.length === 0 && <div className="settings-hint" style={{margin:0}}>Nadie necesita recuperación 🎉</div>}
      {recupera.map(x => <EcRetRow key={x.s.id} x={x} group={group} module={module} exam={exam} win={win} min={min} onChange={onChange} />)}
      {porRendir.map(x => <EcRetRow key={x.s.id} x={x} group={group} module={module} exam={exam} win={win} min={min} pendiente onChange={onChange} />)}
    </div>
  );
}

function EcRetRow({ x, group, module, exam, win, min, pendiente, onChange }) {
  const F = window.JUCUM_EXAMFLOW;
  const [open, setOpen] = ecUS(false);
  const rs = F.retOpenFor(x.s, module.id, true);
  const nombre = x.s.fullName.split(' ')[0];
  const estado = !rs.has ? ecPill('#F0F0EA', '#777', '🔒 sin ventana aún', 'e')
    : rs.blocked ? ecPill('#F0F0EA', '#777', '⏸ pausado por ti', 'e')
    : rs.open ? ecPill('#E8F5E9', '#2E7D32', rs.forced ? '🟢 abierto (tú lo habilitaste)' : '🟢 examen abierto para él/ella', 'e')
    : rs.active ? ecPill('#FFF8E1', '#8A5100', '⏳ preparándose — aún no puede rendir', 'e')
    : ecPill('#E3E9F8', '#1F3A8A', '🗓️ ventana: ' + F.fmtFecha(rs.ret.from), 'e');
  return (
    <div style={{border:'1px solid var(--border)', borderLeft:'4px solid ' + (pendiente ? '#E68A00' : '#C62828'), borderRadius:12, marginBottom:8, background:'#fff', overflow:'hidden'}}>
      <div style={{display:'flex', alignItems:'center', gap:10, padding:'10px 13px', flexWrap:'wrap', cursor:'pointer'}} onClick={() => setOpen(v => !v)}>
        <div className="st-ava" style={{background: pendiente ? 'linear-gradient(135deg,#B0A99A,#6B6455)' : 'linear-gradient(135deg,#B3261E,#8C1D18)'}}>{x.s.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontWeight:800, fontSize:13}}>{x.s.fullName}</div>
          <div className="settings-hint" style={{margin:0}}>{x.best && x.best._parcial ? 'Le falta la ' + x.best._falta + ' · nota parcial ' + x.nota + '/100' : pendiente ? 'No rindió el examen · misma ventana y apoyo' : 'Desaprobó (' + x.nota + '/' + 100 + ' · mínima ' + min + ')'}</div>
          <EcPartes exam={exam} best={x.best} />
        </div>
        {pendiente ? ecPill('#FFF8E1', '#8A5100', '⏳ por rendir', 'n') : ecPill('#FFEBEE', '#C62828', <><b>{x.nota}</b>/100</>, 'n')}
        {estado}
        <span style={{color:'#B0A99A', fontSize:17, transform: open ? 'rotate(90deg)' : 'none', transition:'.2s'}}>›</span>
      </div>
      {open && (
        <div style={{borderTop:'1px dashed var(--border)', background:'#FBFAF5', padding:'12px 15px'}}>
          {!pendiente && <EcSecBars att={x.best} />}
          <div style={{marginBottom:8}}><EcVerExamen exam={exam} student={x.s} group={group} rindio={!pendiente} /></div>
          <div style={{background:'#FFF5F5', border:'1.5px solid #F2B8B5', borderRadius:11, padding:'10px 13px', marginBottom:8}}>
            <div style={{fontSize:11.5, fontWeight:800, color:'#C62828', marginBottom:6}}>🔎 Qué le falta para rendir <span className="settings-hint" style={{margin:0, display:'inline'}}>· por si te pregunta directamente</span></div>
            <div className="row-flex" style={{gap:6, flexWrap:'wrap'}}>
              <EcReq ok={rs.reqs ? rs.reqs.apt : false}>apto {rs.reqs ? rs.reqs.overall : '—'}% / {rs.reqs ? rs.reqs.threshold : 75}%</EcReq>
              <EcReq ok={rs.reqs ? rs.reqs.okDias : false}>práctica {rs.reqs && rs.reqs.dias14 != null ? rs.reqs.dias14 + '/' + F.retMin + ' días' : 'se mide en su equipo'}</EcReq>
              {rs.has && <EcReq ok={rs.reqs ? !!rs.reqs.okAvance : false}>avance {(rs.reqs && rs.reqs.avance) || 0}/{F.retAvanceMin || 2} días en la ventana</EcReq>}
              {rs.has && <EcReq ok={rs.active}>ventana {rs.ret ? F.fmtFecha(rs.ret.from) + ' – ' + F.fmtFecha(rs.ret.to) : '—'}</EcReq>}
            </div>
            <div className="settings-hint" style={{margin:'6px 0 0'}}>Cuando todo esté en ✔, el examen <b>se le abre solo</b> dentro de la ventana. Si no muestra avance, sigue cerrado — guíalo por 💬 chat; tu palabra es la final:</div>
            <div className="row-flex" style={{gap:7, marginTop:8, flexWrap:'wrap'}}>
              <button className="att-btn" onClick={() => { const cur = F.getRet(group.id, module.id) || {}; const set = new Set(cur.force || []); set.has(x.s.id) ? set.delete(x.s.id) : set.add(x.s.id); const bl = new Set(cur.block || []); bl.delete(x.s.id); F.setRet(group.id, module.id, { force: Array.from(set), block: Array.from(bl) }); onChange(); }}>{rs.forced ? '↩ Quitar apertura manual' : '🔓 Abrirle el examen ya'}</button>
              <button className="att-btn" onClick={() => { const cur = F.getRet(group.id, module.id) || {}; const set = new Set(cur.block || []); set.has(x.s.id) ? set.delete(x.s.id) : set.add(x.s.id); const fo = new Set(cur.force || []); fo.delete(x.s.id); F.setRet(group.id, module.id, { block: Array.from(set), force: Array.from(fo) }); onChange(); }}>{rs.blocked ? '▶ Quitar pausa' : '⏸ Mantenérselo cerrado'}</button>
            </div>
            {rs.has && F.retPlan && (() => {
              const av = F.retDias(x.s, rs.ret);
              const plan = F.retPlan(x.s, module, ecWeakKeys(x.best));
              const done = F.retPlanDone(x.s, plan, rs.ret.from);
              const hechas = plan.filter(it => done[it.actId] && done[it.actId] !== 'antes').length;
              const dLbl = d => { try { return new Date(d + 'T12:00:00Z').toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' }); } catch (e) { return d; } };
              return (
                <div style={{marginTop:10, borderTop:'1px dashed #F2B8B5', paddingTop:9}}>
                  <div style={{fontSize:11.5, fontWeight:800, color:'#C62828', marginBottom:6}}>🧭 Seguimiento de su plan de refuerzo · {hechas}/{plan.length} hechas</div>
                  <div className="row-flex" style={{gap:5, flexWrap:'wrap', marginBottom:7}}>
                    {(av.dias || []).map(d => { const on = (d.total || 0) > 0; return <span key={d.date} className="mm-chip" style={{background: on ? '#E8F5E9' : '#FFEBEE', color: on ? '#2E7D32' : '#C62828'}}>{dLbl(d.date)} {on ? '✓ ' + d.total + "'" : '✗'}</span>; })}
                    {!(av.dias || []).length && <span className="settings-hint" style={{margin:0}}>La ventana aún no empieza o no hay días con registro.</span>}
                  </div>
                  <div className="row-flex" style={{gap:5, flexWrap:'wrap'}}>
                    {plan.map(it => { const dd = done[it.actId]; const ok = dd && dd !== 'antes'; return <span key={it.modId + it.actId} className="mm-chip" style={{background: ok ? '#E8F5E9' : '#F0F0EA', color: ok ? '#2E7D32' : '#777', textDecoration: ok ? 'line-through' : 'none'}}>{ok ? '✓ ' : ''}{it.label}</span>; })}
                  </div>
                  <div className="settings-hint" style={{margin:'6px 0 0'}}>Su plan se actualiza cada día y <b>lo no completado pasa al día siguiente</b>. Los días ✓/✗ vienen de la nube; el detalle exacto por actividad vive en el equipo del alumno.</div>
                </div>
              );
            })()}
          </div>
          <EcFBBox x={x} group={group} exam={exam} win={win} min={min} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

/* 🔁 NUEVA-NOTA-V1 · “Estos alumnos ya dieron este examen — ¿lo dan de nuevo?” */
function EcRetakeAsk({ exam, askR, setAskR, onYes, onNo }) {
  const sel = askR.sel || [];
  const toggle = id => setAskR(Object.assign({}, askR, { sel: sel.includes(id) ? sel.filter(x => x !== id) : sel.concat([id]) }));
  const fecha = x => x.today ? 'hoy' : new Date(x.date).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' });
  return (
    <div onClick={() => setAskR(null)} style={{position:'fixed', inset:0, background:'rgba(20,16,8,.5)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:16}}>
      <div onClick={e => e.stopPropagation()} style={{background:'#fff', borderRadius:16, maxWidth:460, width:'100%', maxHeight:'88vh', overflow:'auto', boxShadow:'0 12px 40px rgba(0,0,0,.25)'}}>
        <div style={{padding:'16px 18px 10px'}}>
          <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:17}}>🔁 {askR.ya.length === 1 ? '1 alumno ya dio' : askR.ya.length + ' alumnos ya dieron'} este examen</div>
          <div style={{fontSize:12.5, color:'#555', fontWeight:600, lineHeight:1.55, marginTop:4}}>Al abrir <b>{exam.title}</b>, todo el grupo lo da. Marca a quienes dejas darlo <b>de nuevo</b>: su nota anterior deja de contar y lo que saquen ahora será su <b>nota nueva</b>. A los que no marques se les queda su nota.</div>
        </div>
        <div style={{padding:'0 18px', display:'grid', gap:6}}>
          {askR.ya.map(x => (
            <label key={x.student.id} className="check-row" style={{margin:0, display:'flex', alignItems:'center', gap:9, border:'1.5px solid ' + (sel.includes(x.student.id) ? '#F0C46C' : 'var(--border)'), background: sel.includes(x.student.id) ? '#FFF8E8' : '#fff', borderRadius:10, padding:'8px 11px', cursor:'pointer'}}>
              <input type="checkbox" checked={sel.includes(x.student.id)} onChange={() => toggle(x.student.id)} />
              <span style={{flex:1, fontWeight:800, fontSize:13}}>{x.student.fullName}</span>
              <span style={{fontSize:11.5, fontWeight:800, color:'#77746B'}}>{x.score != null ? x.score + '/100 · ' : ''}{fecha(x)}</span>
            </label>
          ))}
          {askR.ya.some(x => x.today) && <div className="settings-hint" style={{margin:'2px 0 0'}}>Los que lo dieron <b>hoy</b> salen sin marcar: seguramente es este mismo examen.</div>}
        </div>
        <div style={{display:'flex', gap:8, flexWrap:'wrap', padding:'14px 18px 16px'}}>
          <button className="btn-save" onClick={() => onYes(sel)} disabled={!sel.length}>✅ Sí, que lo den de nuevo ({sel.length})</button>
          <button className="att-btn" onClick={onNo}>No, se quedan con su nota</button>
          <button className="att-btn" onClick={() => setAskR(null)} style={{marginLeft:'auto'}}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ExamsCenter, EcModResults, EcRetakeAsk });
