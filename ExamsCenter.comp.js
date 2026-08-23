/* Bloque J3 · Centro de exámenes (ETAPA 1 del nuevo orden) — 2 pestañas por grupo:
 *   ⚙️ Configurar: reglas del grupo + RUTA de módulos (aviso · fecha/hora · calificadores · pre-examen)
 *   📊 Resultados: nota automática desde la nube, en fichas (✅ aprobados / 🔁 recuperación y por rendir)
 * La recuperación es UNA ventana de días (desaprobados Y quienes no rindieron): dentro de ella cada
 * alumno rinde apenas cumple sus requisitos (apto ≥75% + práctica 10/14 días); la profesora puede
 * abrirle (force) o pausarle (block) el examen a cualquiera — última palabra.
 * Motores: exams.js + exam-flow.js (cfg/ret). Aperturas avanzadas y Definir siguen en TeacherExams. */

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

/* ═══ Marco ═══ */
function ExamsCenter({ onBack, hideBack, initialGroup, canDefine }) {
  const { GROUPS, LEVELS } = window.JUCUM_DATA;
  const [groupId, setGroupId] = ecUS(initialGroup || (GROUPS[0] ? GROUPS[0].id : null));
  const [tab, setTab] = ecUS('cfg');
  const [classic, setClassic] = ecUS(false);
  const [demoOpen, setDemoOpen] = ecUS(false);
  const [tick, setTick] = ecUS(0);
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

  return (
    <main>
      {!hideBack && <button className="back-btn" onClick={onBack}>← Volver al panel</button>}
      <div className="welcome teacher">
        <div className="welcome-text">
          <div className="eyebrow">🎓 Exámenes</div>
          <h1>Exámenes de avance</h1>
          <p>Dos lugares, dos momentos: en <b>Configurar</b> programas la ruta (aviso, fecha, calificadores) · en <b>Resultados</b> acompañas lo rendido — la nota se publica <b>sola</b> al terminar.</p>
        </div>
        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          {canDefine && <button className="btn-settings" onClick={() => setClassic('define')}>📑 Definir exámenes</button>}
          {canDefine && <button className="btn-settings" onClick={() => setClassic('weights')}>⚖️ Peso examen</button>}
          <button className="btn-settings" onClick={() => setDemoOpen(true)}>🧪 Examen de prueba</button>
          <button className="btn-settings" onClick={() => setClassic(true)} title="Ventanas puntuales por alumno y aperturas manuales">⚙ Aperturas avanzadas</button>
        </div>
      </div>

      {window.ExamReadyBanner && <ExamReadyBanner />}

      <div style={{display:'flex', flexWrap:'wrap', gap:4, alignItems:'flex-end', padding:'0 10px', position:'relative', zIndex:2, marginTop:14}}>
        {GROUPS.map(g => {
          const lv = LEVELS[g.level] || {}; const on = g.id === group.id;
          return (
            <button key={g.id} onClick={() => setGroupId(g.id)} style={{
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
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16}}>
          {[['cfg','⚙️ Configurar examen','ruta · aviso · fechas · calificadores'],['res','📊 Resultados','aprobados · recuperación · por rendir']].map(([k, t, s]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              border:'1.5px solid ' + (tab === k ? 'var(--lp, #F9A825)' : 'var(--border)'), background: tab === k ? '#FFF9E2' : '#FAFAF6',
              borderRadius:12, padding:'11px 14px', cursor:'pointer', textAlign:'left',
              fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:15, color: tab === k ? '#8A5100' : '#777'}}>
              {t}<span style={{display:'block', fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:11, color:'#999'}}>{s}</span>
            </button>
          ))}
        </div>
        {tab === 'cfg'
          ? <EcConfigTab key={group.id + ':' + tick} group={group} goRes={() => setTab('res')} onChange={refresh} />
          : <EcResTab key={group.id + ':' + tick} group={group} onChange={refresh} />}
      </div>
      {demoOpen && <DemoExamModal onClose={() => setDemoOpen(false)} onDone={() => { setDemoOpen(false); refresh(); }} />}
    </main>
  );
}

/* ═══ ⚙️ CONFIGURAR ═══ */
function EcReglas({ group, onChange }) {
  const F = window.JUCUM_EXAMFLOW;
  const cfg = F.getCfg(group.id);
  const [min, setMin] = ecUS(F.minGradeFor(group.id));
  return (
    <div className="scard" style={{marginBottom:14}}>
      <div className="sec-head"><div className="sec-title">⚖️ Reglas del grupo</div><span className="sec-meta">se aplican a todos sus exámenes</span></div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))', gap:10}}>
        <div style={{border:'1px solid var(--border)', borderRadius:11, padding:'10px 13px'}}>
          <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:12.5, color:'#1F3A8A', marginBottom:6}}>🎯 Quién aparece como apto</div>
          <div style={{fontSize:12, lineHeight:1.6}}>Preparación ≥ <b>75%</b> <b>y</b> practicar <b>al menos {F.retMin} de los últimos {F.retDe} días</b> (📘 resúmenes · ✏️ gramática · 📗 stories). Quien no repasa así, no sale apto. <b>Tú tienes la última palabra</b>: habilitas o pausas por alumno.</div>
        </div>
        <div style={{border:'1px solid var(--border)', borderRadius:11, padding:'10px 13px'}}>
          <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:12.5, color:'#1F3A8A', marginBottom:6}}>✅ Nota mínima para aprobar</div>
          <div className="row-flex" style={{gap:8}}>
            <input type="number" min="1" max="100" className="input-text" style={{width:70}} value={min} onChange={e => setMin(e.target.value)} />
            <button className="att-btn" onClick={() => { const n = Math.max(1, Math.min(100, parseInt(min, 10) || 75)); F.setCfg(group.id, { minGrade: n }); setMin(n); onChange(); }}>💾 Guardar</button>
          </div>
          <div className="settings-hint" style={{margin:'6px 0 0'}}>Con menos de <b>{F.minGradeFor(group.id)}</b> pasa a recuperación.{cfg.minGrade ? '' : ' (usando el estándar: 75)'}</div>
        </div>
        <div style={{border:'1px solid var(--border)', borderRadius:11, padding:'10px 13px'}}>
          <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:12.5, color:'#1F3A8A', marginBottom:6}}>📤 Publicación automática</div>
          <div style={{fontSize:12, lineHeight:1.6}}>Cada alumno ve su nota, sus partes flojas y su recomendación <b>apenas termina</b> el examen — tú supervisas y afinas desde <b>Resultados</b>.</div>
        </div>
      </div>
    </div>
  );
}

function EcModRow({ group, module, onChange, goRes }) {
  const D = window.JUCUM_DATA, X = window.JUCUM_EXAMS, F = window.JUCUM_EXAMFLOW;
  const exam = X.examForModule(module.id, group.level);
  const isForms = exam && /^ex-m1forms-/.test(exam.id);
  const formsWin = F.formsWindowFor(group);
  const isM1 = (D.MODULE_CATALOG[group.level] || [])[0]?.id === module.id;
  const formsForThis = isM1 && formsWin && (X.getExam(formsWin.examId)?.moduleIds || []).includes(module.id);
  const win = exam && !isForms ? X.windowForExamGroup(exam.id, group.id) : null;
  const ann = F.getAnn(group.id, module.id);
  const open = F.winEffectiveOpen(win);
  const today = F.pDay();
  const past = ann && ann.date && ann.date < today;
  const ret = F.getRet(group.id, module.id);
  const [expand, setExpand] = ecUS(!!ann && !past && !(win && Object.keys(win.results || {}).length));
  const [showNotes, setShowNotes] = ecUS(false);
  const [date, setDate] = ecUS(ann?.date || '');
  const [from, setFrom] = ecUS(ann?.from || '');
  const [to, setTo] = ecUS(ann?.to || '');
  const [variant, setVariant] = ecUS(ann?.variant || (group.level === 'pre-a1' ? 'kids' : 'adults'));
  const [aviso, setAviso] = ecUS(ann && ann.notifyDate && !ann.notified ? 'fecha' : 'ahora');
  const [avisoDate, setAvisoDate] = ecUS((ann && ann.notifyDate && !ann.notified ? ann.notifyDate : '') || '');
  const graders = (ann && ann.graders) || [];
  const toggleGrader = (name) => { const set = new Set(graders); if (set.has(name)) set.delete(name); else set.add(name); F.setAnn(group.id, module.id, { graders: Array.from(set) }); onChange(); };

  if (!exam && !formsForThis) {
    return (
      <div style={{border:'1px solid var(--border)', borderRadius:13, background:'#fff'}}>
        <div style={{display:'flex', alignItems:'center', gap:11, padding:'12px 15px', flexWrap:'wrap'}}>
          <span style={{fontSize:22}}>{module.emoji}</span>
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:14.5}}>{module.name}</div>
            <div className="settings-hint" style={{margin:0}}>⏳ Desarrollo aún no sube el examen de este módulo</div>
          </div>
          {isM1 && window.M1FormsButton && <M1FormsButton group={group} onChange={onChange} />}
          {ecPill('#F0F0EA', '#888', '⏳ Sin examen', 'st')}
        </div>
      </div>
    );
  }
  if (formsForThis && (!exam || isForms)) {
    const res = formsWin.results || {};
    const members = D.STUDENTS.filter(s => s.group === group.id);
    const graded = members.filter(s => res[s.id]);
    return (
      <div style={{border:'1px solid var(--border)', borderRadius:13, background:'#fff', overflow:'hidden'}}>
        <div style={{display:'flex', alignItems:'center', gap:11, padding:'12px 15px', flexWrap:'wrap'}}>
          <span style={{fontSize:22}}>{module.emoji}</span>
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:14.5}}>{module.name}</div>
            <div className="settings-hint" style={{margin:0}}>Rendido por <b>Google Forms</b> · {graded.length}/{members.length} con nota — se conserva tal cual</div>
          </div>
          {ecPill('#EDE7F6', '#5B3FA0', '✅ Notas registradas', 'st')}
          <button className="att-btn" onClick={() => setShowNotes(v => !v)}>📊 {showNotes ? 'Ocultar' : 'Ver notas'}</button>
        </div>
        {showNotes && <NotesList members={members} results={res} />}
      </div>
    );
  }

  const rendido = win && (Object.keys(win.results || {}).length > 0);
  const chip = ret && F.retActive(ret) ? ['#FFEBEE', '#C62828', '🔁 Recuperación abierta']
    : past ? ['#EDE7F6', '#5B3FA0', '📤 Rendido · resultados automáticos']
    : open ? ['#E8F5E9', '#2E7D32', '🟢 Abierto ahora']
    : ann && ann.date ? ['#E3E9F8', '#1F3A8A', '📣 Programado']
    : ['#F0F0EA', '#777', '⚪ Listo para programar'];
  const days = ann && ann.date ? F.daysTo(ann.date) : null;
  const doProgram = () => {
    if (!date) { alert('Elige la fecha del examen.'); return; }
    const schedNotif = aviso === 'fecha' && avisoDate && avisoDate > F.pDay();
    F.setAnn(group.id, module.id, {
      date, from: from || null, to: to || null, variant, auto: true, forceClosed: false, examId: exam.id,
      programmedAt: new Date().toISOString(),
      notifyDate: schedNotif ? avisoDate : F.pDay(), notified: !schedNotif,
    });
    if (!win) X.createWindow({ examId: exam.id, groupId: group.id, isOpen: false });
    const horarioTxt = (from ? ', ' + F.fmtHora(from) : '') + (to ? ' – ' + F.fmtHora(to) : '');
    if (schedNotif) alert('🗓️ Programado para ' + group.name + ':\n📣 El aviso se enviará SOLO el ' + F.fmtFecha(avisoDate) + '.\n🎓 Examen: ' + F.fmtFecha(date) + horarioTxt + ' — se abre y se cierra solo (hora de Perú).');
    else { const n = X.announceExam(group.id, module.id, exam.id, date); alert('📣 Aviso enviado AHORA a ' + n + ' alumno(s).\n🎓 Examen: ' + F.fmtFecha(date) + horarioTxt + ' — se abre y se cierra solo (hora de Perú).'); }
    onChange();
  };
  const doAvisoSinFecha = () => {
    const n = X.announceExam(group.id, module.id, exam.id, null);
    F.setAnn(group.id, module.id, { examId: exam.id, notified: true, notifyDate: F.pDay() });
    alert('📣 Aviso SIN fecha enviado a ' + n + ' alumno(s): "Estás pronto a dar tu examen, practica…" — cuando pongas la fecha, verán la cuenta regresiva.');
    onChange();
  };

  return (
    <div style={{border:'1.5px solid ' + (expand ? ((D.LEVELS[group.level] || {}).color || 'var(--border)') : 'var(--border)'), borderRadius:13, background:'#fff', overflow:'hidden'}}>
      <div style={{display:'flex', alignItems:'center', gap:11, padding:'12px 15px', flexWrap:'wrap', cursor:'pointer'}} onClick={() => setExpand(v => !v)}>
        <span style={{fontSize:22}}>{module.emoji}</span>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:14.5}}>{module.name}</div>
          <div className="settings-hint" style={{margin:0}}>
            Examen: <b>{exam.title}</b>{ann && ann.date ? <> · 📅 <b>{F.fmtFecha(ann.date)}</b>{ann.from ? ', ' + F.fmtHora(ann.from) + (ann.to ? ' – ' + F.fmtHora(ann.to) : '') : ''}</> : ann && ann.notified ? ' · 📣 aviso sin fecha enviado' : null}
            {ret && ret.from ? <> · 🔁 recuperación <b>{F.fmtFecha(ret.from)} – {F.fmtFecha(ret.to)}</b></> : null}
          </div>
        </div>
        {ecPill(chip[0], chip[1], chip[2], 'st')}
        {days != null && days >= 0 && !rendido && (
          <span style={{textAlign:'center', background:'#1F3A8A', color:'#fff', borderRadius:11, padding:'4px 13px', lineHeight:1.1}}>
            <b style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:18, display:'block'}}>{days === 0 ? 'HOY' : days}</b>
            <span style={{fontSize:9, fontWeight:800, letterSpacing:'.06em', textTransform:'uppercase', opacity:.85}}>{days === 0 ? 'examen' : days === 1 ? 'día' : 'días'}</span>
          </span>
        )}
        <span style={{color:'#B0A99A', fontSize:17, transform: expand ? 'rotate(90deg)' : 'none', transition:'.2s'}}>›</span>
      </div>
      {expand && (
        <div style={{borderTop:'1px dashed var(--border)', background:'#FBFAF5', padding:'14px 16px', display:'grid', gap:12}}>
          {(past || rendido) && (
            <div className="row-flex" style={{gap:8, flexWrap:'wrap'}}>
              <span style={{fontSize:12.5}}>Este examen ya se rindió; sus notas se publican solas. La recuperación se maneja en <b>Resultados</b>.</span>
              <button className="btn-save" onClick={goRes}>📊 Ver en Resultados</button>
            </div>
          )}
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))', gap:10}}>
            <div style={{border:'1px solid var(--border)', borderRadius:11, padding:'10px 13px', background:'#fff'}}>
              <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:12.5, color:'#1F3A8A', marginBottom:7}}>1 · 📣 Aviso a los alumnos</div>
              <div style={{display:'grid', gap:6}}>
                <label className="check-row" style={{margin:0}}><input type="radio" name={'av-' + group.id + module.id} checked={aviso === 'ahora'} onChange={() => setAviso('ahora')} /><span style={{fontSize:12}}>enviarlo al programar</span></label>
                <label className="check-row" style={{margin:0}}><input type="radio" name={'av-' + group.id + module.id} checked={aviso === 'fecha'} onChange={() => setAviso('fecha')} /><span style={{fontSize:12}}>se envía solo el</span><input type="date" className="input-text" style={{width:145}} value={avisoDate} onChange={e => { setAvisoDate(e.target.value); setAviso('fecha'); }} /></label>
              </div>
              <div className="settings-hint" style={{margin:'6px 0 0'}}>Sin fecha aún: <button className="att-btn" onClick={doAvisoSinFecha} style={{marginRight:4}}>📣 Avisar sin fecha</button> dice “Estás pronto a dar tu examen, practica…”. Si no anuncias nada, el alumno <b>no ve ningún aviso</b>.</div>
            </div>
            <div style={{border:'1px solid var(--border)', borderRadius:11, padding:'10px 13px', background:'#fff'}}>
              <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:12.5, color:'#1F3A8A', marginBottom:7}}>2 · 🗓️ Examen (hora de Perú)</div>
              <div className="row-flex" style={{gap:7, flexWrap:'wrap'}}>
                <input type="date" className="input-text" style={{width:145}} value={date} onChange={e => setDate(e.target.value)} />
                <span style={{fontSize:11.5, fontWeight:800, color:'#777'}}>abre</span>
                <input type="time" className="input-text" style={{width:100}} value={from} onChange={e => setFrom(e.target.value)} />
                <span style={{fontSize:11.5, fontWeight:800, color:'#777'}}>cierra</span>
                <input type="time" className="input-text" style={{width:100}} value={to} onChange={e => setTo(e.target.value)} />
              </div>
              <div className="row-flex" style={{gap:7, marginTop:6, flexWrap:'wrap'}}>
                <select className="input-text" value={variant} onChange={e => setVariant(e.target.value)}>
                  <option value="kids">🧒 Versión niños</option>
                  <option value="adults">🧑 Versión adultos</option>
                </select>
                <span className="settings-hint" style={{margin:0}}>se abre y se cierra solo · solo aptos o habilitados</span>
              </div>
            </div>
            <div style={{border:'1px solid var(--border)', borderRadius:11, padding:'10px 13px', background:'#fff'}}>
              <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:12.5, color:'#1F3A8A', marginBottom:7}}>3 · 🧑‍🏫 Quiénes califican</div>
              <div className="row-flex" style={{gap:6, flexWrap:'wrap'}}>
                {ecPill('#E3E9F8', '#1F3A8A', '👩‍🏫 Tú (siempre)', 'yo')}
                {['Teacher', 'Asistente'].map(n => (
                  <button key={n} className={`preset ${graders.includes(n) ? 'on' : ''}`} onClick={() => toggleGrader(n)}>{n === 'Teacher' ? '🧑‍🏫' : '🙋'} {n}</button>
                ))}
              </div>
              <div className="settings-hint" style={{margin:'6px 0 0'}}>Lo objetivo se corrige <b>solo, al instante</b>. 🗣️ Speaking / ✍️ Writing los revisa un calificador; mientras tanto el alumno ve su <b>nota parcial</b>.</div>
            </div>
          </div>
          <div className="row-flex" style={{gap:8, flexWrap:'wrap'}}>
            <button className="btn-save" onClick={doProgram}>💾 {ann && ann.date ? 'Re-programar' : 'Programar todo'}</button>
            {ann && <button className="att-btn" onClick={() => { if (confirm('¿Quitar la programación? El aviso y la cuenta regresiva desaparecen para los alumnos.')) { F.setAnn(group.id, module.id, null); X.cancelAnnouncement(group.id, module.id); onChange(); } }}>✕ Quitar</button>}
            <span style={{flex:1}}></span>
            <button className="att-btn" onClick={() => { const w = win || (X.createWindow({ examId: exam.id, groupId: group.id, isOpen: false }), X.windowForExamGroup(exam.id, group.id)); X.setWindowOpen(w.id, true); F.setAnn(group.id, module.id, { forceClosed: false }); onChange(); }}>🟢 Publicar ahora</button>
            <button className="att-btn" onClick={() => { if (win) X.setWindowOpen(win.id, false); F.setAnn(group.id, module.id, { forceClosed: true }); onChange(); }}>⚪ Cerrar</button>
          </div>
          {ann && ann.date && <div className="settings-hint" style={{margin:0}}>✓ Programado: 📣 aviso {ann.notified ? 'ya enviado' : 'se enviará el ' + F.fmtFecha(ann.notifyDate)} · 🎓 examen {F.fmtFecha(ann.date)}{ann.from ? ', ' + F.fmtHora(ann.from) : ''}{ann.to ? ' – ' + F.fmtHora(ann.to) : ''} · sale en tu calendario de Planificar.</div>}
        </div>
      )}
    </div>
  );
}

function EcRutaItem({ emoji, color, bg, last, children }) {
  return (
    <div style={{display:'grid', gridTemplateColumns:'44px 1fr', columnGap:10}}>
      <div style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
        <span style={{width:38, height:38, borderRadius:'50%', border:'2.5px solid ' + color, background: bg || '#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, flexShrink:0, zIndex:1}}>{emoji}</span>
        {!last && <span style={{width:3, flex:1, background:'#E0DACB', minHeight:14, borderRadius:2, margin:'3px 0'}}></span>}
      </div>
      <div style={{paddingBottom: last ? 0 : 10, minWidth:0}}>{children}</div>
    </div>
  );
}

function EcConfigTab({ group, goRes, onChange }) {
  const D = window.JUCUM_DATA, X = window.JUCUM_EXAMS, F = window.JUCUM_EXAMFLOW;
  const mods = D.MODULE_CATALOG[group.level] || [];
  const members = D.STUDENTS.filter(s => s.group === group.id);
  const estadoDe = (m) => {
    const exam = X.examForModule(m.id, group.level);
    if (!exam) return ['#C9C2B2', '#fff'];
    const win = X.windowForExamGroup(exam.id, group.id);
    const ann = F.getAnn(group.id, m.id);
    if (win && Object.keys(win.results || {}).length) return ['#5B3FA0', '#EDE7F6'];
    if (ann && ann.date && ann.date < F.pDay()) return ['#5B3FA0', '#EDE7F6'];
    if (F.winEffectiveOpen(win)) return ['#2E7D32', '#E8F5E9'];
    if (ann && ann.date) return ['#1F3A8A', '#E3E9F8'];
    return ['#C9C2B2', '#fff'];
  };
  return (
    <div>
      <EcReglas group={group} onChange={onChange} />
      <div className="sec-head" style={{marginBottom:10}}><div className="sec-title">🛤️ La ruta de exámenes de {group.name}</div><span className="sec-meta">como la ruta de práctica: un paso lleva al siguiente</span></div>
      <div>
        {mods.map(m => { const [c, b] = estadoDe(m); return (
          <EcRutaItem key={m.id} emoji={m.emoji} color={c} bg={b}>
            <EcModRow group={group} module={m} onChange={onChange} goRes={goRes} />
          </EcRutaItem>
        ); })}
        <EcRutaItem emoji="🏁" color="#B9A8E3" bg="#FDFCFF">
          <div style={{border:'1.5px dashed #B9A8E3', borderRadius:13, background:'#FDFCFF', padding:'12px 15px', display:'flex', alignItems:'center', gap:11, flexWrap:'wrap'}}>
            <div style={{flex:1, minWidth:200}}>
              <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:14.5}}>Examen final · Nivel {(D.LEVELS[group.level] || {}).code || group.level}</div>
              <div className="settings-hint" style={{margin:0}}>El ensayo general del nivel: se arma con los {mods.length} módulos cuando el grupo los cierre — aquí mismo lo programarás como cualquier módulo.</div>
            </div>
            {ecPill('#EDE7F6', '#5B3FA0', '🔒 Se desbloquea al cerrar los módulos', 'f')}
          </div>
        </EcRutaItem>
        <EcRutaItem emoji="🌐" color="#C9C2B2" last>
          <div className="settings-hint" style={{margin:'9px 0 0', lineHeight:1.6}}><b>Examen internacional</b> — cada alumno lo rinde en su plataforma externa; el examen final del nivel es su preparación.</div>
        </EcRutaItem>
      </div>
      {window.PreexamFolderRow && mods.map(m => {
        const act = (m.activities || []).find(a => F.isPreexamActivity(a));
        return act ? <PreexamFolderRow key={'pre-' + m.id} group={group} module={m} act={act} onChange={onChange} /> : null;
      })}
    </div>
  );
}

/* ═══ 📊 RESULTADOS ═══ */
function EcResTab({ group, onChange }) {
  const D = window.JUCUM_DATA, X = window.JUCUM_EXAMS, F = window.JUCUM_EXAMFLOW;
  const mods = D.MODULE_CATALOG[group.level] || [];
  const members = D.STUDENTS.filter(s => s.group === group.id);
  const conAlgo = mods.filter(m => {
    const exam = X.examForModule(m.id, group.level);
    if (!exam) return false;
    const ann = F.getAnn(group.id, m.id);
    const win = X.windowForExamGroup(exam.id, group.id);
    return (win && Object.keys(win.results || {}).length) || (ann && ann.date && ann.date <= F.pDay()) || F.formsWindowFor(group);
  });
  const [modId, setModId] = ecUS((conAlgo[conAlgo.length - 1] || mods[0] || {}).id || null);
  const mod = mods.find(m => m.id === modId);
  return (
    <div>
      <div className="preset-row" style={{flexWrap:'wrap', marginBottom:14}}>
        {mods.map(m => <button key={m.id} className={`preset ${modId === m.id ? 'on' : ''}`} onClick={() => setModId(m.id)}>{m.emoji} {m.name}</button>)}
      </div>
      {mod ? <EcModResults key={mod.id} group={group} module={mod} members={members} onChange={onChange} /> : <div className="scard"><div className="empty-state"><div className="icon">📚</div>Este nivel no tiene módulos.</div></div>}
    </div>
  );
}

function EcModResults({ group, module, members, onChange }) {
  const D = window.JUCUM_DATA, X = window.JUCUM_EXAMS, F = window.JUCUM_EXAMFLOW;
  const exam = X.examForModule(module.id, group.level);
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
      const res = await sb.from('diagnostic_attempts').select('user_id,score,correct,total,sections,attempt_no,created_at,module_id,activity_id')
        .in('user_id', members.map(s => s.id)).order('created_at', { ascending: true }).limit(1000);
      if (res && res.error) { setErr(res.error.message); setRows([]); }
      else setRows(((res && res.data) || []).filter(r => (r.module_id === 'exam-' + exam.id || slugs.some(sl => r.activity_id === 'examen-' + sl)) && (!F.examDesde || !F.examDesde(exam) || String(r.created_at || '').slice(0, 10) >= F.examDesde(exam))));
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
  const progOf = s => { try {
    const comp = (D.getStudentProgress(s.id) || {}).completed || {};
    const ks = Object.keys(comp).filter(k => k.indexOf('exam-' + exam.id + ':') === 0);
    const rws = ks.map(k => ({ score: (comp[k] || {}).score, date: (comp[k] || {}).date })).filter(r => typeof r.score === 'number');
    if (!rws.length) return null;
    const of = F.notaOficial ? F.notaOficial(rws, retW, desdeW) : { score: rws[0].score, date: rws[0].date, intentos: rws.length };
    return of ? { score: of.score, created_at: of.date, fromProgress: true, _n: of.intentos, _recu: of.isRecovery } : null;
  } catch (e) { return null; } };
  const list = members.map(s => {
    const rs = by[s.id] || [];
    /* Nota oficial: su PRIMER intento (o el de su recuperación autorizada). Nunca la mejor
     * ni el promedio de dos intentos — 23-ago-2026. */
    const of = (rs.length && F.notaOficial) ? F.notaOficial(rs.map(r => ({ score: r.score, date: r.created_at })), retW, desdeW) : null;
    let best = of ? Object.assign({}, rs.find(r => r.created_at === of.date) || rs[0], { score: of.score, _n: of.intentos, _recu: of.isRecovery, _sinPermiso: of.sinPermiso }) : null;
    const pr = progOf(s);
    if (!best && pr) best = pr;
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
          <div className="settings-hint" style={{margin:0}}>{pendiente ? 'No rindió el examen · misma ventana y apoyo' : 'Desaprobó (' + x.nota + '/' + 100 + ' · mínima ' + min + ')'}</div>
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

Object.assign(window, { ExamsCenter, EcModResults });
