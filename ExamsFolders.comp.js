/* Bloque J3 · Carpetas de evaluación por grupo (profesor) + examen dentro del módulo (alumno)
 * Rediseño pedido por la coordinadora (jul-2026):
 *   Profesor: una CARPETA por grupo con todo el proceso del examen en una hoja
 *   (anunciar con fecha y hora → se abre solo → calificar → compartir), el
 *   pre-examen controlado por grupo y el historial en la misma carpeta (opción A).
 *   Alumno: el examen vive en su módulo con cuenta regresiva y candado (Apto + fecha).
 * Motores: exams.js (ventanas/notas) + exam-flow.js (horarios, pre-examen, M1 Forms). */

const exfUS = React.useState, exfUE = React.useEffect;

function exfPill(bg, color, text, key) { return <span key={key} className="mm-chip" style={{background:bg, color:color, whiteSpace:'nowrap'}}>{text}</span>; }

/* Botón de registro de las notas del M1 (Google Forms) — visible mientras el grupo no las tenga */
function M1FormsButton({ group, onChange }) {
  const F = window.JUCUM_EXAMFLOW;
  if (!window.JUCUM_M1FORMS || F.formsWindowFor(group)) return null;
  return (
    <button className="att-btn" style={{whiteSpace:'nowrap'}} onClick={(e) => {
      e.stopPropagation();
      const r = F.registerM1Forms(group);
      if (r.error) { alert('⚠ ' + r.error); return; }
      if (r.already) { alert('Las notas del M1 ya estaban registradas para este grupo.'); onChange(); return; }
      alert('📋 Notas del M1 (Google Forms) registradas: ' + r.matched.length + ' alumno(s).\n' +
        (r.unmatchedStudents.length ? '\nSin nota en el Forms (revisa nombres): ' + r.unmatchedStudents.map(s => s.fullName).join(', ') : 'Todos los alumnos del grupo tienen nota.'));
      onChange();
    }}>📥 Registrar notas M1 (Google Forms)</button>
  );
}

/* ═══════════════ PROFESOR · Carpetas por grupo ═══════════════ */
function TeacherExamsFolders({ onBack, hideBack, initialGroup, canDefine }) {
  const { GROUPS, LEVELS } = window.JUCUM_DATA;
  const [groupId, setGroupId] = exfUS(initialGroup || (GROUPS[0] ? GROUPS[0].id : null));
  const [demoOpen, setDemoOpen] = exfUS(false);
  const [classic, setClassic] = exfUS(false);
  const [tick, setTick] = exfUS(0);
  const refresh = () => setTick(t => t + 1);
  exfUE(() => { const f = () => refresh(); window.addEventListener('jucum:examflow', f); return () => window.removeEventListener('jucum:examflow', f); }, []);
  const group = GROUPS.find(g => g.id === groupId) || GROUPS[0];

  if (classic) return (
    <>
      <div style={{padding:'12px 28px 0'}}><button className="att-btn" onClick={() => setClassic(false)}>← Volver a las carpetas</button></div>
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
          <h1>Carpetas de evaluación</h1>
          <p>Una carpeta por grupo: <b>programas</b> el aviso y el examen (fecha y hora de Perú) y todo <b>se envía y se abre solo</b>; luego calificas y compartes — en una sola hoja. El pre-examen solo lo ven los grupos donde tú lo abras.</p>
        </div>
        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          {canDefine && <button className="btn-settings" onClick={() => setClassic('define')}>📑 Definir exámenes</button>}
          {canDefine && <button className="btn-settings" onClick={() => setClassic('weights')}>⚖️ Peso examen</button>}
          <button className="btn-settings" onClick={() => setDemoOpen(true)}>🧪 Examen de prueba</button>
          <button className="btn-settings" onClick={() => setClassic(true)} title="Ventanas puntuales por alumno y aperturas manuales">⚙ Aperturas avanzadas</button>
        </div>
      </div>

      {window.ExamReadyBanner && <ExamReadyBanner />}

      {/* Pestañas tipo carpeta */}
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
      <GroupExamFolder key={group.id + ':' + tick} group={group} onChange={refresh} />

      <div style={{display:'flex', gap:10, flexWrap:'wrap', alignItems:'center', marginTop:12, fontSize:11.5, fontWeight:700, color:'var(--text-soft)'}}>
        <b>Estados:</b>
        <span className="mm-chip" style={{background:'#F0F0EA', color:'#888'}}>⏳ Sin examen</span>→
        <span className="mm-chip" style={{background:'#E3E9F8', color:'#1F3A8A'}}>📣 Anunciado</span>→
        <span className="mm-chip" style={{background:'#E8F5E9', color:'#2E7D32'}}>🟢 Abierto</span>→
        <span className="mm-chip" style={{background:'#EDE7F6', color:'#5B3FA0'}}>✅ Notas compartidas</span>
      </div>

      {demoOpen && <DemoExamModal onClose={() => setDemoOpen(false)} onDone={() => { setDemoOpen(false); refresh(); }} />}
    </main>
  );
}

function GroupExamFolder({ group, onChange }) {
  const { STUDENTS, LEVELS, MODULE_CATALOG, getStudentReadiness } = window.JUCUM_DATA;
  const F = window.JUCUM_EXAMFLOW;
  const [showApt, setShowApt] = exfUS(false);
  const lv = LEVELS[group.level] || {};
  const mods = MODULE_CATALOG[group.level] || [];
  const members = STUDENTS.filter(s => s.group === group.id);
  const apts = members.filter(s => getStudentReadiness(s).apt).length;
  let next = null;
  mods.forEach(m => { const a = F.getAnn(group.id, m.id); if (a && a.date && F.daysTo(a.date) >= 0 && (!next || a.date < next.date)) next = { ...a, mod: m }; });
  return (
    <div style={{background:'#fff', border:'1.5px solid #D5CDBB', borderRadius:14, padding:18, position:'relative', zIndex:1, boxShadow:'0 2px 4px rgba(0,0,0,.06),0 8px 20px rgba(0,0,0,.08)'}}>
      <div style={{display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', paddingBottom:13, borderBottom:'1px dashed var(--border)', marginBottom:13}}>
        <span style={{fontSize:24}}>{lv.emoji}</span>
        <div>
          <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:18}}>{group.name}</div>
          <div style={{fontSize:11.5, color:'var(--text-soft)', fontWeight:700}}>{lv.code} · {members.length} alumno(s)</div>
        </div>
        <div style={{display:'flex', gap:8, flexWrap:'wrap', marginLeft:'auto', alignItems:'center'}}>
          {next && exfPill('#E3E9F8', '#1F3A8A', <>📣 Próximo: {next.mod.name} · {F.fmtFecha(next.date)}{next.from ? ', ' + F.fmtHora(next.from) : ''}</>, 'n')}
          <button className="att-btn" onClick={() => setShowApt(v => !v)} title="Ver la preparación de cada alumno (aptos y no aptos)">🎓 {apts}/{members.length} aptos {showApt ? '▴' : '▾'}</button>
        </div>
      </div>
      {showApt && <AptRoster members={members} />}
      {mods.length === 0 && <div className="settings-hint">Este nivel no tiene módulos.</div>}
      {mods.map(m => <ModuleFolderRow key={m.id} group={group} module={m} members={members} onChange={onChange} />)}
      {mods.map(m => {
        const act = (m.activities || []).find(a => F.isPreexamActivity(a));
        return act ? <PreexamFolderRow key={'pre-' + m.id} group={group} module={m} act={act} onChange={onChange} /> : null;
      })}
    </div>
  );
}

/* ── Roster de preparación del grupo: aptos y no aptos de un vistazo ── */
function AptRoster({ members }) {
  const { getStudentReadiness } = window.JUCUM_DATA;
  const rows = [...members].map(s => ({ s, r: getStudentReadiness(s) })).sort((a, b) => b.r.overall - a.r.overall);
  const apts = rows.filter(x => x.r.apt).length;
  return (
    <div style={{border:'1.5px solid #D9E2F4', background:'#F8FAFF', borderRadius:12, padding:'11px 14px', marginBottom:13}}>
      <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:8}}>
        <b style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:13.5}}>Preparación del grupo (hoy)</b>
        {exfPill('#E8F5E9', '#2E7D32', <>✅ {apts} apto{apts === 1 ? '' : 's'}</>, 'a')}
        {exfPill('#FFF8E1', '#E65100', <>⚠ {rows.length - apts} aún no</>, 'b')}
        <span className="settings-hint" style={{margin:0}}>Es una foto viva: sube y baja con la práctica diaria. Habilitas caso por caso en el paso 3 de cada examen.</span>
      </div>
      {rows.map(({ s, r }) => (
        <div key={s.id} style={{display:'flex', alignItems:'center', gap:9, padding:'5px 0', borderBottom:'1px solid #ECEFF7', fontSize:12.5, flexWrap:'wrap'}}>
          <span style={{fontWeight:800, flex:'1 1 150px', minWidth:150}}>{s.fullName}</span>
          <span style={{flex:'0 0 110px', height:8, background:'#E8E4DA', borderRadius:5, overflow:'hidden', position:'relative'}}>
            <i style={{position:'absolute', inset:0, width:Math.min(100, r.overall) + '%', background: r.apt ? '#2EA84B' : r.overall >= 50 ? '#F9A825' : '#E53935', borderRadius:5, display:'block'}}></i>
            <i style={{position:'absolute', top:-1, bottom:-1, left:'75%', width:2, background:'#1F3A8A', display:'block'}}></i>
          </span>
          <b style={{width:44, textAlign:'right', color: r.apt ? '#2E7D32' : '#8A5100'}}>{r.overall}%</b>
          {r.apt ? exfPill('#E8F5E9', '#2E7D32', '✅ apto', 'p') : exfPill('#FFF8E1', '#E65100', 'falta ' + Math.max(0, (r.threshold || 75) - r.overall) + '%', 'p')}
        </div>
      ))}
    </div>
  );
}

/* ── Una fila por módulo: estado + camino de 4 pasos ── */
function ModuleFolderRow({ group, module, members, onChange }) {
  const D = window.JUCUM_DATA, X = window.JUCUM_EXAMS, F = window.JUCUM_EXAMFLOW;
  const exam = X.examForModule(module.id, group.level);
  const isForms = exam && /^ex-m1forms-/.test(exam.id);
  const win = exam ? X.windowForExamGroup(exam.id, group.id) : null;
  const formsWin = F.formsWindowFor(group);
  const formsExam = formsWin ? X.getExam(formsWin.examId) : null;
  const isM1 = (D.MODULE_CATALOG[group.level] || [])[0]?.id === module.id;
  const ann = F.getAnn(group.id, module.id);
  const today = F.pDay();
  const open = F.winEffectiveOpen(win);
  const past = ann && ann.date && ann.date < today;
  const [expand, setExpand] = exfUS(!!ann && !past && !(win && win.published));
  const [showNotes, setShowNotes] = exfUS(false);
  const [date, setDate] = exfUS(ann?.date || '');
  const [from, setFrom] = exfUS(ann?.from || '');
  const [to, setTo] = exfUS(ann?.to || '');
  const [variant, setVariant] = exfUS(ann?.variant || (group.level === 'pre-a1' ? 'kids' : 'adults'));

  /* — M1 rendido por Google Forms (registro y vista) — */
  const formsForThisModule = isM1 && formsWin && formsExam && (formsExam.moduleIds || []).includes(module.id);
  if (!exam && !formsForThisModule) {
    return (
      <div style={rowBox()}>
        <div style={rowTop()}>
          <span style={{fontSize:22}}>{module.emoji}</span>
          <div style={{flex:1, minWidth:0}}>
            <div style={rowName()}>{module.name}</div>
            <div className="settings-hint" style={{margin:0}}>⏳ Desarrollo aún no sube el examen de este módulo</div>
          </div>
          {isM1 && <M1FormsButton group={group} onChange={onChange} />}
          <span className="mm-chip" style={{background:'#F0F0EA', color:'#888', whiteSpace:'nowrap'}}>⏳ Sin examen</span>
        </div>
      </div>
    );
  }
  if (formsForThisModule && (!exam || isForms)) {
    const res = formsWin.results || {};
    const graded = members.filter(s => res[s.id]);
    const avg = graded.length ? Math.round(graded.reduce((a, s) => a + (res[s.id].grade || 0), 0) / graded.length) : 0;
    return (
      <div style={rowBox()}>
        <div style={rowTop()}>
          <span style={{fontSize:22}}>{module.emoji}</span>
          <div style={{flex:1, minWidth:0}}>
            <div style={rowName()}>{module.name}</div>
            <div className="settings-hint" style={{margin:0}}>Rendido por <b>Google Forms</b> (fuera de la plataforma) el <b>{(window.JUCUM_M1FORMS || {}).dates || '12–13 jun 2026'}</b> · promedio <b>{avg}/100</b> · {graded.length}/{members.length} con nota · primera nota enviada</div>
          </div>
          <span className="mm-chip" style={{background:'#EDE7F6', color:'#5B3FA0'}}>✅ Notas registradas</span>
          <button className="att-btn" onClick={() => setShowNotes(v => !v)}>📊 {showNotes ? 'Ocultar' : 'Ver notas'}</button>
        </div>
        {showNotes && <NotesList members={members} results={res} />}
      </div>
    );
  }

  const chip = win && win.published ? ['#EDE7F6', '#5B3FA0', '✅ Notas compartidas']
    : open ? ['#E8F5E9', '#2E7D32', '🟢 Abierto ahora']
    : ann && !past ? ['#E3E9F8', '#1F3A8A', '📣 Anunciado']
    : past ? ['#FFF8E1', '#8A5100', '🕐 Fecha pasada']
    : ['#F0F0EA', '#777', '⚪ Listo para anunciar'];
  const days = ann && ann.date ? F.daysTo(ann.date) : null;

  return (
    <div style={{...rowBox(), borderColor: expand ? (window.JUCUM_DATA.LEVELS[group.level] || {}).color || 'var(--border)' : 'var(--border)'}}>
      <div style={{...rowTop(), cursor:'pointer'}} onClick={() => setExpand(v => !v)}>
        <span style={{fontSize:22}}>{module.emoji}</span>
        <div style={{flex:1, minWidth:0}}>
          <div style={rowName()}>{module.name}</div>
          <div className="settings-hint" style={{margin:0}}>
            Examen: <b>{exam.title}</b>{ann && ann.date ? <> · 📅 <b>{F.fmtFecha(ann.date)}</b>{ann.from ? ', ' + F.fmtHora(ann.from) + (ann.to ? ' – ' + F.fmtHora(ann.to) : '') : ''} · versión {ann.variant === 'kids' ? '🧒 niños' : '🧑 adultos'}</> : null}
          </div>
        </div>
        {exfPill(chip[0], chip[1], chip[2], 'st')}
        {isM1 && <M1FormsButton group={group} onChange={onChange} />}
        {isM1 && formsWin && !isForms && <button className="att-btn" style={{whiteSpace:'nowrap'}} onClick={(e) => { e.stopPropagation(); setShowNotes(v => !v); }}>📊 {showNotes ? 'Ocultar notas Forms' : 'Notas M1 (Forms)'}</button>}
        {days != null && days >= 0 && !(win && win.published) && (
          <span style={{textAlign:'center', background:'#1F3A8A', color:'#fff', borderRadius:11, padding:'4px 13px', lineHeight:1.1}}>
            <b style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:18, display:'block'}}>{days === 0 ? 'HOY' : days}</b>
            <span style={{fontSize:9, fontWeight:800, letterSpacing:'.06em', textTransform:'uppercase', opacity:.85}}>{days === 0 ? 'examen' : days === 1 ? 'día' : 'días'}</span>
          </span>
        )}
        <span style={{color:'#B0A99A', fontSize:17, transform: expand ? 'rotate(90deg)' : 'none', transition:'.2s'}}>›</span>
      </div>
      {showNotes && formsWin && <NotesList members={members} results={formsWin.results || {}} />}
      {expand && (
        <ModuleFolderDetail group={group} module={module} exam={exam} win={win} ann={ann} members={members}
          date={date} setDate={setDate} from={from} setFrom={setFrom} to={to} setTo={setTo} variant={variant} setVariant={setVariant} onChange={onChange} />
      )}
    </div>
  );
}

function ModuleFolderDetail({ group, module, exam, win, ann, members, date, setDate, from, setFrom, to, setTo, variant, setVariant, onChange }) {
  const D = window.JUCUM_DATA, X = window.JUCUM_EXAMS, F = window.JUCUM_EXAMFLOW;
  const S = window.JUCUM_SYNC;
  const { getStudentReadiness } = D;
  const open = F.winEffectiveOpen(win);
  const [live, setLive] = exfUS(null);
  const [liveBusy, setLiveBusy] = exfUS(false);
  const [grading, setGrading] = exfUS(null);
  const loadLive = async (silent) => {
    if (!S || !S.fetchModuleProgress) { if (!silent) alert('Sin conexión con la nube.'); return; }
    setLiveBusy(true);
    try {
      const rows = await S.fetchModuleProgress('exam-' + exam.id);
      const parts = await S.fetchModuleParts('exam-' + exam.id);
      const by = {};
      rows.forEach(r0 => { by[r0.user_id] = by[r0.user_id] || { parts:{}, focus:null }; by[r0.user_id].parts[r0.activity_id] = { score: r0.score }; });
      parts.forEach(p => { by[p.user_id] = by[p.user_id] || { parts:{}, focus:null }; if (Number(p.part) === 99) by[p.user_id].focus = p.score; });
      setLive(by);
    } catch (e) { if (!silent) alert('No se pudo leer el avance del examen.'); }
    setLiveBusy(false);
  };
  exfUE(() => { if (win) loadLive(true); }, [exam.id]);
  const liveSug = (sid) => {
    if (!live || !live[sid]) return null;
    const map = {};
    Object.entries(live[sid].parts).forEach(([k, v]) => { if (typeof v.score === 'number') map[k] = v.score; });
    return X.suggestedGrade(exam, map);
  };
  const announced = !!(ann && ann.date);
  const [aviso, setAviso] = exfUS(ann && ann.notifyDate && !ann.notified ? 'fecha' : 'ahora');
  const [avisoDate, setAvisoDate] = exfUS((ann && ann.notifyDate && !ann.notified ? ann.notifyDate : '') || '');
  const ensureWin = () => {
    if (win) return win;
    X.createWindow({ examId: exam.id, groupId: group.id, isOpen: false });
    onChange();
    return X.windowForExamGroup(exam.id, group.id);
  };
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
    if (schedNotif) {
      alert('🗓️ Todo programado para ' + group.name + ':\n📣 El aviso se enviará SOLO el ' + F.fmtFecha(avisoDate) + '.\n🎓 Examen: ' + F.fmtFecha(date) + horarioTxt + ' — se abre y se cierra solo (hora de Perú).\nLos alumnos ya ven la cuenta regresiva en su módulo; sale en tu calendario de Planificar.');
    } else {
      const n = X.announceExam(group.id, module.id, exam.id, date);
      alert('📣 Aviso enviado AHORA a ' + n + ' alumno(s) de ' + group.name + '.\n🎓 Examen: ' + F.fmtFecha(date) + horarioTxt + ' — se abre y se cierra solo (hora de Perú). Sale en tu calendario de Planificar.');
    }
    onChange();
  };
  const auto = ann ? ann.auto !== false : true;

  return (
    <div style={{borderTop:'1px dashed var(--border)', background:'#FBFAF5', padding:'14px 16px', display:'grid', gap:13}}>
      {/* 1 · Programar (examen + aviso) */}
      <div style={{display:'flex', gap:10, alignItems:'flex-start', flexWrap:'wrap'}}>
        <StepNum n="1" done={announced} />
        <div style={{flex:1, minWidth:250, fontSize:12.5, lineHeight:1.55}}>
          <b style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:13.5}}>Programar examen y aviso (hora de Perú) — todo queda agendado</b>
          <div className="row-flex" style={{gap:7, marginTop:7, flexWrap:'wrap', alignItems:'center'}}>
            <span style={{fontSize:11.5, fontWeight:800, color:'#1F3A8A', width:72}}>🎓 Examen</span>
            <input type="date" className="input-text" style={{width:150}} value={date} onChange={e => setDate(e.target.value)} />
            <span style={{fontSize:11.5, fontWeight:800, color:'#777'}}>abre</span>
            <input type="time" className="input-text" style={{width:110}} value={from} onChange={e => setFrom(e.target.value)} />
            <span style={{fontSize:11.5, fontWeight:800, color:'#777'}}>cierra</span>
            <input type="time" className="input-text" style={{width:110}} value={to} onChange={e => setTo(e.target.value)} />
            <select className="input-text" value={variant} onChange={e => setVariant(e.target.value)} title="Versión del examen para este grupo">
              <option value="kids">🧒 Versión niños</option>
              <option value="adults">🧑 Versión adultos</option>
            </select>
          </div>
          <div className="row-flex" style={{gap:7, marginTop:7, flexWrap:'wrap', alignItems:'center'}}>
            <span style={{fontSize:11.5, fontWeight:800, color:'#1F3A8A', width:72}}>📣 Aviso</span>
            <label className="check-row" style={{margin:0}}><input type="radio" name={'aviso-' + group.id + '-' + module.id} checked={aviso === 'ahora'} onChange={() => setAviso('ahora')} /><span style={{fontSize:12}}>enviarlo ahora</span></label>
            <label className="check-row" style={{margin:0}}><input type="radio" name={'aviso-' + group.id + '-' + module.id} checked={aviso === 'fecha'} onChange={() => setAviso('fecha')} /><span style={{fontSize:12}}>se envía solo el</span></label>
            <input type="date" className="input-text" style={{width:150}} value={avisoDate} onChange={e => { setAvisoDate(e.target.value); setAviso('fecha'); }} disabled={aviso !== 'fecha'} />
            <button className="btn-save" onClick={doProgram}>💾 {announced ? 'Re-programar' : 'Programar todo'}</button>
            {announced && <button className="att-btn" onClick={() => { if (confirm('¿Quitar la programación? El aviso y la cuenta regresiva desaparecen para los alumnos.')) { F.setAnn(group.id, module.id, null); X.cancelAnnouncement(group.id, module.id); onChange(); } }}>✕ Quitar</button>}
          </div>
          {announced && (
            <div className="settings-hint" style={{margin:'6px 0 0'}}>
              ✓ Programado: 📣 aviso {ann.notified ? 'ya enviado' : 'se enviará solo el ' + F.fmtFecha(ann.notifyDate)} · 🎓 examen {F.fmtFecha(ann.date)}{ann.from ? ', ' + F.fmtHora(ann.from) : ''}{ann.to ? ' – ' + F.fmtHora(ann.to) : ''} · se abre y se cierra solo · los alumnos ven su cuenta regresiva en el módulo.
            </div>
          )}
        </div>
      </div>
      {/* 2 · Apertura automática */}
      <div style={{display:'flex', gap:10, alignItems:'flex-start', flexWrap:'wrap'}}>
        <StepNum n="2" done={open} active={announced} />
        <div style={{flex:1, minWidth:250, fontSize:12.5, lineHeight:1.55}}>
          <b style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:13.5}}>Se abre y se cierra solo {open && <span style={{color:'#2E7D32'}}>· 🟢 abierto AHORA</span>}</b>
          <div className="row-flex" style={{gap:8, marginTop:7, flexWrap:'wrap'}}>
            <label className="check-row" title="El día anunciado, entre la hora de apertura y cierre, solo para aptos y habilitados">
              <input type="checkbox" checked={auto} onChange={e => { F.setAnn(group.id, module.id, { auto: e.target.checked, forceClosed: false }); onChange(); }} disabled={!announced} />
              <span style={{fontSize:12.5}}>Apertura automática el día anunciado ({from ? F.fmtHora(from) : 'todo el día'}{to ? ' – ' + F.fmtHora(to) : ''})</span>
            </label>
            <button className="att-btn" onClick={() => { const w = ensureWin(); X.setWindowOpen(w.id, true); F.setAnn(group.id, module.id, { forceClosed: false }); onChange(); }}>🟢 Publicar ahora</button>
            <button className="att-btn" onClick={() => { if (win) X.setWindowOpen(win.id, false); F.setAnn(group.id, module.id, { forceClosed: true }); onChange(); }}>⚪ Cerrar</button>
          </div>
        </div>
      </div>
      {/* 3 · Quién puede + avance en vivo + calificar */}
      <div style={{display:'flex', gap:10, alignItems:'flex-start', flexWrap:'wrap'}}>
        <StepNum n="3" done={!!(win && Object.keys(win.results || {}).length)} active={open} />
        <div style={{flex:1, minWidth:250, fontSize:12.5}}>
          <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
            <b style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:13.5}}>¿Quién puede rendirlo? · calificar</b>
            {win && <button className="att-btn" onClick={() => loadLive(false)} disabled={liveBusy}>🔎 {liveBusy ? 'Consultando…' : 'Actualizar avance en vivo'}</button>}
          </div>
          <div style={{display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', margin:'5px 0 3px'}}>
            {exfPill('#E8F5E9', '#2E7D32', <>✅ {members.filter(s => getStudentReadiness(s).apt).length} apto(s)</>, 'ca')}
            {exfPill('#FFF8E1', '#E65100', <>⚠ {members.filter(s => !getStudentReadiness(s).apt).length} aún no — habilítalos aquí abajo</>, 'cb')}
          </div>
          <div className="settings-hint" style={{margin:'0 0 8px'}}>Aptos (≥75%) entran solos el día del examen; a los demás tú puedes <b>habilitarlos</b> — tienes la última palabra. La nota sugerida sale de su examen rendido.</div>
          <div className="sm-list">
            {[...members].sort((a, b) => getStudentReadiness(b).overall - getStudentReadiness(a).overall).map(s => {
              const r = getStudentReadiness(s);
              const overridden = !!(win && (win.allowOverrides || []).includes(s.id));
              const res = win ? (win.results || {})[s.id] : null;
              const lv2 = live && live[s.id];
              const sug = liveSug(s.id);
              return (
                <div key={s.id} className="sm-row" style={{flexWrap:'wrap'}}>
                  <div className="st-ava" style={{background:'linear-gradient(135deg,#3F5BB8,#0D1B5A)'}}>{s.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
                  <div className="sm-info">
                    <div className="sm-name">{s.fullName}</div>
                    <div className="sm-meta">Preparación {r.overall}% · {r.apt ? '✅ apto' : '⚠ le falta ' + Math.max(0, r.threshold - r.overall) + '%'}</div>
                    {lv2 && (
                      <div className="sm-meta" style={{color:'#1B5E20', fontWeight:700}}>
                        🎓 rendido {(() => { const e2 = Object.values(lv2.parts)[0]; return e2 && typeof e2.score === 'number' ? '· ' + e2.score + '%' : ''; })()}
                        {sug != null && <span style={{color:'#1565C0'}}> → sugerida {sug}/100</span>}
                        <span style={{marginLeft:8, color: lv2.focus > 0 ? '#C62828' : '#2E7D32'}}>{lv2.focus > 0 ? '📵 salió ' + lv2.focus + '× de la pestaña' : '✓ sin salidas'}</span>
                      </div>
                    )}
                  </div>
                  {res
                    ? exfPill(res.passed ? '#E8F5E9' : '#FFEBEE', res.passed ? '#2E7D32' : '#C62828', <>{res.passed ? 'Aprobó' : 'Reprobó'}{typeof res.grade === 'number' ? ' · ' + res.grade : ''}</>, 'res')
                    : <label className="check-row" title="Habilitar pese a no llegar al 75%"><input type="checkbox" checked={r.apt || overridden} disabled={r.apt} onChange={() => { const w = win || (X.createWindow({ examId: exam.id, groupId: group.id, isOpen: false }), X.windowForExamGroup(exam.id, group.id)); X.toggleOverride(w.id, s.id); onChange(); }} /><span style={{fontSize:12}}>{r.apt ? 'Apto' : 'Habilitar'}</span></label>}
                  {win && <button className="att-btn" onClick={() => setGrading(s)}>📊 Resultado</button>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* 4 · Compartir */}
      <div style={{display:'flex', gap:10, alignItems:'flex-start', flexWrap:'wrap'}}>
        <StepNum n="4" done={!!(win && win.published)} active={!!(win && Object.keys(win.results || {}).length)} />
        <div style={{flex:1, minWidth:250, fontSize:12.5}}>
          <b style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:13.5}}>Compartir las notas</b>
          <div className="row-flex" style={{gap:8, marginTop:7, flexWrap:'wrap'}}>
            {win && win.published
              ? <>{exfPill('#E8F5E9', '#2E7D32', '✅ Compartidas — los alumnos ya ven su nota en el módulo', 'p')}<button className="att-btn" onClick={() => { X.unpublishResults(win.id); onChange(); }}>Ocultar</button></>
              : <button className="btn-save" disabled={!win || !Object.keys((win && win.results) || {}).length} onClick={() => { if (confirm('¿Compartir las notas con los alumnos? Verán su resultado y tu retroalimentación en su módulo.')) { X.publishResults(win.id); onChange(); } }}>📤 Compartir resultados</button>}
          </div>
        </div>
      </div>
      {grading && <ExamGradeModal w={win} student={grading} suggested={liveSug(grading.id)} onClose={() => { setGrading(null); onChange(); }} />}
    </div>
  );
}

function StepNum({ n, done, active }) {
  return <span style={{width:26, height:26, borderRadius:'50%', background: done ? '#2EA84B' : active ? '#F9A825' : '#1F3A8A', color:'#fff', fontSize:12, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1}}>{done ? '✓' : n}</span>;
}

function NotesList({ members, results }) {
  const rows = members.filter(s => results[s.id]).sort((a, b) => (results[b.id].grade || 0) - (results[a.id].grade || 0));
  return (
    <div style={{borderTop:'1px dashed var(--border)', background:'#FBFAF5', padding:'10px 16px'}}>
      {rows.map(s => {
        const r = results[s.id];
        return (
          <div key={s.id} style={{display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderBottom:'1px solid #F1ECE3', fontSize:12.5, flexWrap:'wrap'}}>
            <span style={{fontWeight:800, flex:1, minWidth:150}}>{s.fullName}</span>
            <span style={{fontSize:11, color:'var(--text-soft)', fontWeight:700}}>{r.feedback || ''}</span>
            {exfPill(r.passed ? '#E8F5E9' : '#FFEBEE', r.passed ? '#2E7D32' : '#C62828', <>{typeof r.grade === 'number' ? r.grade + '/100' : (r.passed ? 'Aprobó' : 'Reprobó')}</>, 'g')}
          </div>
        );
      })}
      {rows.length === 0 && <div className="settings-hint">Sin notas registradas.</div>}
    </div>
  );
}

/* ── Fila morada: pre-examen controlado por grupo ── */
function PreexamFolderRow({ group, module, act, onChange }) {
  const F = window.JUCUM_EXAMFLOW;
  const pre = F.getPre(group.id, module.id);
  const openNow = F.preOpenNow(pre);
  const [fromDate, setFromDate] = exfUS(pre?.fromDate || '');
  const [from, setFrom] = exfUS(pre?.from || '');
  const [toDate, setToDate] = exfUS(pre?.toDate || '');
  const [to, setTo] = exfUS(pre?.to || '');
  const tLink = act.url ? act.url + (act.url.includes('?') ? '&' : '?') + 'jucum_teacher=1&jucum_group=' + encodeURIComponent(group.id) : null;
  return (
    <div style={{...rowBox(), background:'#FDFBFF', borderColor:'#CE93D8'}}>
      <div style={rowTop()}>
        <span style={{fontSize:22}}>🧭</span>
        <div style={{flex:1, minWidth:0}}>
          <div style={rowName()}>{act.name.replace(/^🧭\s*/, '')} · {module.name}</div>
          <div className="settings-hint" style={{margin:0}}>No exige Apto ni es nota: es diagnóstico. <b>Solo lo ven los grupos donde TÚ lo abras.</b></div>
        </div>
        {pre && pre.open
          ? exfPill('#F3E5F5', '#7B1FA2', openNow ? '🟢 Abierto para este grupo' : '🕐 Programado (fuera de horario ahora)', 'p')
          : exfPill('#F0F0EA', '#888', '⚪ Cerrado — este grupo no lo ve', 'c')}
        {pre && pre.open
          ? <button className="att-btn" onClick={() => { F.setPre(group.id, module.id, { open: false }); onChange(); }}>⚪ Cerrar</button>
          : <button className="btn-save" onClick={() => {
              F.setPre(group.id, module.id, { open: true, fromDate: fromDate || F.pDay(), from: from || null, toDate: toDate || null, to: to || null, openedAt: new Date().toISOString() });
              onChange();
            }}>🔓 Abrir para este grupo</button>}
      </div>
      <div style={{borderTop:'1px dashed var(--border)', background:'#FBFAF5', padding:'10px 16px', fontSize:12, display:'flex', gap:7, alignItems:'center', flexWrap:'wrap'}}>
        📅 <b>Tu ventana:</b> del
        <input type="date" className="input-text" style={{width:145}} value={fromDate} onChange={e => setFromDate(e.target.value)} />
        <input type="time" className="input-text" style={{width:105}} value={from} onChange={e => setFrom(e.target.value)} />
        al
        <input type="date" className="input-text" style={{width:145}} value={toDate} onChange={e => setToDate(e.target.value)} />
        <input type="time" className="input-text" style={{width:105}} value={to} onChange={e => setTo(e.target.value)} />
        {pre && pre.open && <button className="att-btn" onClick={() => { F.setPre(group.id, module.id, { fromDate: fromDate || null, from: from || null, toDate: toDate || null, to: to || null }); onChange(); }}>💾 Guardar ventana</button>}
        <span style={{color:'#777', fontWeight:700}}>hora de Perú · sale en tu calendario 🗓️</span>
        {tLink && <a className="att-btn" href={tLink} target="_blank" rel="noreferrer" style={{textDecoration:'none'}}>👩‍🏫 Ver panel del pre-examen ↗</a>}
      </div>
    </div>
  );
}

function rowBox() { return { border:'1px solid var(--border)', borderRadius:13, marginBottom:10, overflow:'hidden', background:'#fff' }; }
function rowTop() { return { display:'flex', alignItems:'center', gap:11, padding:'12px 15px', flexWrap:'wrap' }; }
function rowName() { return { fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:14.5 }; }

/* ═══════════════ ALUMNO · Banner del examen dentro del módulo ═══════════════ */
function ModuleExamBanner({ mod, studentId }) {
  const D = window.JUCUM_DATA, F = window.JUCUM_EXAMFLOW;
  const [tick, setTick] = React.useState(0);
  const [plan, setPlan] = React.useState(false);
  React.useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000);   // atrapa la apertura automática
    const f = () => setTick(t => t + 1);
    window.addEventListener('jucum:examflow', f);
    return () => { clearInterval(id); window.removeEventListener('jucum:examflow', f); };
  }, []);
  if (!F || !D) return null;
  const student = (D.STUDENTS || []).find(s => s.id === studentId);
  if (!student) return null;
  const info = F.infoForModule(student, mod);
  if (info.phase === 'none' || info.phase === 'ready') return null;
  const settings = D.getGroupSettings(student.group) || {};
  const minDia = settings.dailyTargetMin || 15;
  const head = (bg, icon, t1, t2, t3, right) => (
    <div style={{display:'flex', alignItems:'center', gap:13, padding:'12px 15px', color:'#fff', flexWrap:'wrap', background:bg}}>
      <span style={{fontSize:28}}>{icon}</span>
      <div style={{flex:1, minWidth:150}}>
        <div style={{fontSize:10, fontWeight:800, letterSpacing:'.09em', textTransform:'uppercase', opacity:.85}}>{t1}</div>
        <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:15.5, lineHeight:1.2}}>{t2}</div>
        {t3 && <div style={{fontSize:12, fontWeight:700, opacity:.9}}>{t3}</div>}
      </div>
      {right}
    </div>
  );
  const cd = (big, small, extra) => (
    <div style={{textAlign:'center', background:'rgba(255,255,255,.16)', border:'1.5px solid rgba(255,255,255,.3)', borderRadius:12, padding:'6px 15px', flexShrink:0, ...(extra || {})}}>
      <b style={{fontFamily:"'Fredoka',sans-serif", fontWeight:700, fontSize:26, lineHeight:1, display:'block'}}>{big}</b>
      <span style={{fontSize:9.5, fontWeight:800, letterSpacing:'.06em', textTransform:'uppercase', opacity:.9}}>{small}</span>
    </div>
  );
  const box = (borderColor, children) => <div style={{borderRadius:13, marginTop:12, overflow:'hidden', width:'100%', border:'1.5px solid ' + borderColor}}>{children}</div>;
  const horario = info.ann ? (info.ann.from ? F.fmtHora(info.ann.from) + (info.ann.to ? ' – ' + F.fmtHora(info.ann.to) : '') : 'todo el día') : '';

  if (info.phase === 'done') {
    const res = info.result;
    return box(res.passed ? '#A5D6A7' : '#F0C46C', (
      <>
        {head(res.passed ? 'linear-gradient(135deg,#1B5E20,#2E7D32)' : 'linear-gradient(135deg,#8A5100,#B26A00)', res.passed ? '🎉' : '🌱',
          'Resultado de tu examen', mod.name + ' · ' + (res.passed ? 'Aprobaste' : 'Aún no apruebas'), info.isForms ? 'rendido por Google Forms, fuera de la plataforma' : null,
          typeof res.grade === 'number' ? cd(res.grade, '/100') : null)}
        <div style={{background:'#fff', padding:'12px 15px', fontSize:12.5, lineHeight:1.6, color:'#4A4A44', fontWeight:600}}>
          {res.feedback && <><b>📝 Tu profesora:</b> "{res.feedback}"<br/></>}
          Tu <b>nota final del módulo</b> combina este examen con tu práctica diaria — mírala en <b>Mi avance</b>.
        </div>
      </>
    ));
  }
  if (info.phase === 'waitgrade') {
    return box('var(--border)', (
      <div style={{background:'#F7F5EF', padding:'11px 15px', fontSize:12.5, fontWeight:700, color:'#777', display:'flex', gap:9, alignItems:'center'}}>
        🎓 El examen de {mod.name} ya cerró. Tu profesora está revisando — tu nota aparecerá aquí mismo. 🕐
      </div>
    ));
  }
  if (info.phase === 'today' && info.link) {
    return box('#E11930', (
      <>
        {head('linear-gradient(135deg,#8C1D18,#B3261E)', '🎓', 'Examen del módulo · es hoy', mod.name, F.fmtFecha(info.ann?.date || F.pDay()) + (horario ? ' · ' + horario : ''), cd('HOY', '¡éxito!', {background:'rgba(255,255,255,.25)'}))}
        <div style={{background:'#fff', padding:'12px 15px'}}>
          <div style={{fontSize:12.5, lineHeight:1.6, color:'#4A4A44', fontWeight:600}}>
            {info.r && info.r.apt ? <>Llegaste <b>Apto ({info.r.overall}%)</b> gracias a tu constancia. </> : <>Tu profesora te <b>habilitó</b> para rendirlo. </>}
            📵 Quédate solo en la pestaña del examen, tus respuestas se guardan solas y vale tu <b>primer intento</b>.
          </div>
          <a href={info.link} target="_blank" rel="noreferrer" style={{display:'block', textAlign:'center', marginTop:10, width:'100%', border:'none', borderRadius:24, padding:'13px', fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:16, cursor:'pointer', color:'#fff', textDecoration:'none', background:'linear-gradient(135deg,#E11930,#B71C1C)', boxShadow:'0 6px 18px rgba(225,25,48,.45)'}}>🎓 Dar mi examen ahora</a>
        </div>
      </>
    ));
  }
  /* announced (apto o no apto) */
  const r = info.r || { overall: 0, apt: false };
  const color = r.apt ? '#2EA84B' : r.overall >= 50 ? '#F9A825' : '#E53935';
  return box(r.apt ? '#A5D6A7' : '#F0C46C', (
    <>
      {head('linear-gradient(135deg,#1F3A8A,#0D1B5A)', '🎓', 'Examen del módulo', mod.name,
        info.ann && info.ann.date ? F.fmtFecha(info.ann.date) + (horario ? ' · ' + horario : '') : 'fecha por anunciar',
        info.days != null ? cd(info.days === 0 ? 'HOY' : info.days, info.days === 0 ? 'a la hora indicada' : info.days === 1 ? 'día' : 'días') : null)}
      <div style={{background:'#fff', padding:'12px 15px'}}>
        <div style={{display:'flex', alignItems:'center', gap:9, marginBottom:9}}>
          <div style={{flex:1, height:9, background:'#EEE9E2', borderRadius:5, overflow:'hidden', position:'relative'}}>
            <div style={{height:'100%', width:Math.min(100, r.overall) + '%', background:color, borderRadius:5}}></div>
            <i style={{position:'absolute', top:-2, bottom:-2, left:'75%', width:2, background:'#1F3A8A'}}></i>
          </div>
          <b style={{fontSize:13, color}}>{r.overall}%</b>
          {exfPill(r.apt ? '#E8F5E9' : '#FFF8E1', r.apt ? '#2E7D32' : '#E65100', r.apt ? '✓ Apto' : 'Falta ' + Math.max(0, 75 - r.overall) + '% para ser Apto', 'apt')}
        </div>
        <div style={{fontSize:12.5, lineHeight:1.6, color:'#4A4A44', fontWeight:600}}>
          {r.apt
            ? <>¡Eres Apto! 🎉 Pero ojo: tu preparación es una <b>foto viva</b> — si dejas de practicar puede <b>bajar del 75%</b> y quedarías sin rendir tu examen. Mantén tu Apto con <b>{minDia} min cada día</b>. El botón para dar tu examen aparecerá <b>aquí mismo</b> ese día.</>
            : <>El examen se abre solo para alumnos <b>Aptos (75%)</b>. Aún estás a tiempo: tu preparación sube con la <b>práctica de cada día</b> — <b>{minDia} min diarios</b>, no todo de golpe. 💪</>}
        </div>
        {!r.apt && <button type="button" onClick={() => setPlan(true)} style={{marginTop:10, width:'100%', border:'none', borderRadius:24, padding:'11px', fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:14, cursor:'pointer', color:'#fff', background:'linear-gradient(135deg,#F4A02C,#E07A12)'}}>🎯 ¿Qué hago para dar mi examen?</button>}
      </div>
      {plan && <ExamPlanModal student={student} mod={mod} info={info} minDia={minDia} onClose={() => setPlan(false)} />}
    </>
  ));
}

function ExamPlanModal({ student, mod, info, minDia, onClose }) {
  const D = window.JUCUM_DATA, F = window.JUCUM_EXAMFLOW;
  const stats = D.getModuleStats(student, mod);
  const pend = Math.max(0, (stats.total || 0) - (stats.done || 0));
  const improve = (D.getActivitiesToImprove ? D.getActivitiesToImprove(student) : []).filter(x => x.moduleId === mod.id).slice(0, 3);
  const r = info.r || { overall: 0 };
  const Step = ({ n, children }) => (
    <div style={{display:'flex', gap:10, marginBottom:11}}>
      <span style={{width:24, height:24, borderRadius:'50%', background:'#FFF3E0', border:'1.5px solid #FFB74D', color:'#8A5100', fontWeight:800, fontSize:11, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>{n}</span>
      <div style={{fontSize:13, lineHeight:1.55}}>{children}</div>
    </div>
  );
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" style={{maxWidth:520}} onClick={e => e.stopPropagation()}>
        <div className="modal-head"><div className="modal-title">🎯 Tu plan para dar el examen</div><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <p style={{fontSize:13, lineHeight:1.6, margin:'0 0 12px'}}>Vas en <b style={{color:'#E65100'}}>{r.overall}%</b> y necesitas <b>75%</b> para ser Apto{info.ann && info.ann.date ? <> — tu examen es el <b>{F.fmtFecha(info.ann.date)}</b>{info.days != null ? <> (faltan <b>{info.days}</b> día{info.days === 1 ? '' : 's'})</> : null}</> : null}. Te alcanza si empiezas <b>hoy</b>:</p>
          <Step n="1"><b>Completa tus {pend} actividad{pend === 1 ? '' : 'es'} pendiente{pend === 1 ? '' : 's'} del módulo.</b> Es lo que más sube tu preparación.</Step>
          <Step n="2"><b>Repite las prácticas que quedaron bajas.</b>{improve.length ? <> Ahora mismo: {improve.map(x => x.name + ' (' + x.pct + '%)').join(' · ')}.</> : ' Revisa "A mejorar" en tu práctica.'} Repetirlas hasta aprobar también cuenta.</Step>
          <Step n="3"><b>Practica {minDia} minutos CADA DÍA — no todo de golpe.</b> Tu preparación mide tu <b>constancia</b>: {minDia} min diarios suben más que 2 horas un solo día.</Step>
          <Step n="4"><b>Entrega tus tareas.</b> El cumplimiento de tareas es parte de tu preparación.</Step>
          <div style={{display:'flex', gap:10, background:'linear-gradient(135deg,#E3F2FD,#BBDEFB)', borderRadius:12, padding:'11px 13px', fontSize:12, lineHeight:1.55, color:'#0D47A1', fontWeight:600}}>
            <span style={{fontSize:22}}>🧠</span><div><b>Neuro te explica:</b> tu cerebro aprende con <b>repetición espaciada</b> — un poco cada día, con descanso entre medio. Por eso la plataforma premia la práctica diaria y no el atracón. 💪</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Fila del examen al final de la lista de actividades del módulo ── */
function ExamChecklistRow({ mod, studentId }) {
  const D = window.JUCUM_DATA, F = window.JUCUM_EXAMFLOW;
  const [, setTick] = React.useState(0);
  React.useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 30000); return () => clearInterval(id); }, []);
  if (!F || !D) return null;
  const student = (D.STUDENTS || []).find(s => s.id === studentId);
  if (!student) return null;
  const info = F.infoForModule(student, mod);
  if (info.phase === 'none' || info.phase === 'ready') return null;
  if (info.phase === 'done') {
    const res = info.result;
    return (
      <div className="al-item done" style={{cursor:'default'}}>
        <span className="al-num">✓</span><span className="al-ico">🎓</span>
        <span className="al-name">Examen del módulo · {mod.name}</span>
        <span className="al-score" style={{whiteSpace:'nowrap'}}>{typeof res.grade === 'number' ? res.grade + '/100' : ''} · {res.passed ? 'Aprobaste' : 'A reforzar'}</span>
      </div>
    );
  }
  if (info.phase === 'waitgrade') {
    return (
      <div className="al-item locked" style={{cursor:'default'}}>
        <span className="al-num">🕐</span><span className="al-ico">🎓</span>
        <span className="al-name">Examen del módulo · {mod.name}<span style={{display:'block', fontSize:10.5, color:'#999', fontWeight:800}}>Rendido/cerrado · tu profesora está calificando</span></span>
      </div>
    );
  }
  if (info.phase === 'today' && info.link) {
    return (
      <a className="al-item open" href={info.link} target="_blank" rel="noreferrer" style={{border:'2px solid #E11930', background:'#FFF5F5', boxShadow:'0 3px 12px rgba(225,25,48,.18)'}}>
        <span className="al-num" style={{background:'#E11930', color:'#fff', borderColor:'#B71C1C'}}>🎓</span>
        <span className="al-ico">🎓</span>
        <span className="al-name" style={{fontWeight:800}}>Examen del módulo · {mod.name}<span style={{display:'block', fontSize:10.5, color:'#C62828', fontWeight:800}}>¡Es HOY! Abierto para ti{info.ann && info.ann.to ? ' hasta las ' + F.fmtHora(info.ann.to) : ''}</span></span>
        <span style={{color:'#E11930', fontWeight:800, fontSize:14}}>→ Dar examen</span>
      </a>
    );
  }
  const r = info.r || { apt: false, overall: 0 };
  return (
    <div className="al-item locked" style={{cursor:'default'}}>
      <span className="al-num">🔒</span><span className="al-ico">🎓</span>
      <span className="al-name">Examen del módulo · {mod.name}
        <span style={{display:'block', fontSize:10.5, color:'#999', fontWeight:800}}>
          {info.ann && info.ann.date ? <>Se abre el {F.fmtFecha(info.ann.date)}{info.ann.from ? ', ' + F.fmtHora(info.ann.from) : ''} · solo Aptos (75%){r.apt ? ' — mantén tu Apto practicando a diario' : ''}</> : 'Tu profesora anunciará la fecha · solo Aptos (75%)'}
        </span>
      </span>
      {r.apt
        ? <span className="mm-chip" style={{background:'#E8F5E9', color:'#2E7D32', whiteSpace:'nowrap'}}>✓ Apto</span>
        : <span className="mm-chip" style={{background:'#FFF8E1', color:'#E65100', whiteSpace:'nowrap'}}>Falta {Math.max(0, 75 - r.overall)}%</span>}
    </div>
  );
}

Object.assign(window, { TeacherExamsFolders, GroupExamFolder, AptRoster, ModuleFolderRow, ModuleFolderDetail, PreexamFolderRow, ModuleExamBanner, ExamChecklistRow, ExamPlanModal, NotesList });
