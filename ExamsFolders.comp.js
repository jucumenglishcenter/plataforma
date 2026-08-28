/* Bloque J3 · Carpetas de evaluación por grupo (profesor) + examen dentro del módulo (alumno)
 * Rediseño pedido por la coordinadora (jul-2026):
 *   Profesor: una CARPETA por grupo con todo el proceso del examen en una hoja
 *   (anunciar con fecha y hora → se abre solo → calificar → compartir), el
 *   pre-examen controlado por grupo y el historial en la misma carpeta (opción A).
 *   Alumno: el examen vive en su módulo con cuenta regresiva y candado (Apto + fecha).
 * Motores: exams.js (ventanas/notas) + exam-flow.js (horarios, pre-examen, M1 Forms). */

const exfUS = React.useState, exfUE = React.useEffect;

function exfPill(bg, color, text, key) { return <span key={key} className="mm-chip" style={{background:bg, color:color, whiteSpace:'nowrap'}}>{text}</span>; }

/* ⚠ 22-ago-2026 · Ser Apto son DOS requisitos (llegar al 75% Y tener cubierto el
 * 60% del módulo) y hasta hoy solo se mostraba el primero: un alumno con 81% y
 * el módulo a medias leía «falta 0% para ser Apto» y su examen seguía cerrado.
 * Este texto dice CUÁL de los dos es el que falta. */
function exfFalta(r, largo) {
  if (!r || r.apt) return '';
  const cov = r.needCoverage || 60, thr = r.threshold || 75;
  const covBloq = r.blocker ? r.blocker === 'coverage' : (r.overall >= thr && (r.coverage || 0) < cov);
  if (covBloq) return largo
    ? `le falta terminar el módulo: lleva ${r.coverage || 0}% de prácticas aprobadas y necesita ${cov}%`
    : `falta módulo ${r.coverage || 0}/${cov}%`;
  return largo ? `le falta ${Math.max(0, thr - r.overall)}% de preparación` : `falta ${Math.max(0, thr - r.overall)}%`;
}

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
  const solosHdr = (F.standaloneExams ? F.standaloneExams(group.level) : []).map(e => ({ id: 'exam:' + e.id, name: e.title, emoji: '🎓' }));
  mods.concat(solosHdr).forEach(m => { const a = F.getAnn(group.id, m.id); if (a && a.date && F.daysTo(a.date) >= 0 && (!next || a.date < next.date)) next = { ...a, mod: m }; });
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
      {(F.standaloneExams ? F.standaloneExams(group.level) : []).map(e => (
        <ModuleFolderRow key={'solo-' + e.id} group={group} members={members} onChange={onChange}
          module={{ id: 'exam:' + e.id, name: e.title, emoji: '🎓', activities: [] }} />
      ))}
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
          {r.apt ? exfPill('#E8F5E9', '#2E7D32', '✅ apto', 'p') : exfPill('#FFF8E1', '#E65100', exfFalta(r), 'p')}
        </div>
      ))}
    </div>
  );
}

/* ── Una fila por módulo: estado + camino de 4 pasos ── */
function ModuleFolderRow({ group, module, members, onChange }) {
  const D = window.JUCUM_DATA, X = window.JUCUM_EXAMS, F = window.JUCUM_EXAMFLOW;
  const solo = String(module.id).indexOf('exam:') === 0;
  const exam = solo ? X.getExam(String(module.id).slice(5)) : X.examForModule(module.id, group.level);
  const isForms = exam && /^ex-m1forms-/.test(exam.id);
  const win = exam ? X.windowForExamGroup(exam.id, group.id) : null;
  const formsWin = F.formsWindowFor(group);
  const formsExam = formsWin ? X.getExam(formsWin.examId) : null;
  const isM1 = !solo && (D.MODULE_CATALOG[group.level] || [])[0]?.id === module.id;
  const ann = F.getAnn(group.id, module.id);
  const today = F.pDay();
  const open = F.winEffectiveOpen(win);
  const past = ann && ann.date && ann.date < today;
  const [expand, setExpand] = exfUS(!!ann && !past && !(win && win.published));
  const [showNotes, setShowNotes] = exfUS(false);
  const [date, setDate] = exfUS(ann?.date || '');
  const [dateTo, setDateTo] = exfUS(ann?.dateTo || '');
  const [from, setFrom] = exfUS(ann?.from || '');
  const [to, setTo] = exfUS(ann?.to || '');
  const [variant, setVariant] = exfUS(ann?.variant || (group.level === 'pre-a1' ? 'kids' : 'adults'));
  const [libre, setLibre] = exfUS(ann?.free != null ? !!ann.free : solo);

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
  const [retakeDays, setRetakeDays] = exfUS((ann && ann.retakeDays) || '');
  const ensureWin = () => {
    if (win) return win;
    X.createWindow({ examId: exam.id, groupId: group.id, isOpen: false });
    onChange();
    return X.windowForExamGroup(exam.id, group.id);
  };
  /* Habilitar dice QUIÉN puede entrar; si la ventana no está abierta (sin fecha o ya pasó),
   * nadie entra. Al habilitar, ofrecemos abrirla ahora mismo. */
  const abrirSiHaceFalta = (w) => {
    try {
      if (!w) return;
      const a = F.getAnn(group.id, module.id) || {};
      const hoy = F.pDay();
      const abierta = w.isOpen && !a.forceClosed;
      const abriráSola = !a.forceClosed && a.auto !== false && a.date && (a.dateTo || a.date) >= hoy;
      if (abierta || abriráSola) return;
      const msg = a.date && a.date < hoy
        ? 'La fecha programada (' + F.fmtFecha(a.date) + ') ya pasó, así que el examen está cerrado y nadie puede entrar.\n\n¿Abrirlo AHORA para los habilitados?'
        : 'Este examen todavía no está abierto, así que el alumno aún no podrá entrar.\n\n¿Abrirlo AHORA para los habilitados?';
      if (!confirm(msg)) return;
      /* Si en algún momento se cerró a mano, ese cierre manda sobre todo: hay que levantarlo */
      try { F.setAnn(group.id, module.id, { forceClosed: false }); } catch (e) {}
      X.setWindowOpen(w.id, true);
      F.setAnn(group.id, module.id, { forceClosed: false });
    } catch (e) {}
  };
  const doProgram = () => {
    if (!date) { alert('Elige la fecha del examen.'); return; }
    if (dateTo && dateTo < date) { alert('La fecha de cierre no puede ser anterior a la de apertura.'); return; }
    const schedNotif = aviso === 'fecha' && avisoDate && avisoDate > F.pDay();
    F.setAnn(group.id, module.id, {
      date, dateTo: dateTo || null, from: from || null, to: to || null, variant, auto: true, forceClosed: false, examId: exam.id, free: !!libre,
      retakeDays: retakeDays ? Math.max(1, parseInt(retakeDays, 10) || 1) : null,
      programmedAt: new Date().toISOString(),
      notifyDate: schedNotif ? avisoDate : F.pDay(), notified: !schedNotif,
    });
    if (!win) X.createWindow({ examId: exam.id, groupId: group.id, isOpen: false });
    const horarioTxt = (dateTo && dateTo !== date ? ' al ' + F.fmtFecha(dateTo) : '') + (from ? ', ' + F.fmtHora(from) : '') + (to ? ' – ' + F.fmtHora(to) : '');
    if (schedNotif) {
      alert('🗓️ Todo programado para ' + group.name + ':\n📣 El aviso se enviará SOLO el ' + F.fmtFecha(avisoDate) + '.\n🎓 Examen: ' + F.fmtFecha(date) + horarioTxt + ' — se abre y se cierra solo (hora de Perú).\nLos alumnos ya ven la cuenta regresiva en su módulo; sale en tu calendario de Planificar.');
    } else {
      const n = X.announceExam(group.id, module.id, exam.id, date, dateTo || null);
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
            <span style={{fontSize:11.5, fontWeight:800, color:'#777'}}>hasta</span>
            <input type="date" className="input-text" style={{width:150}} value={dateTo} min={date || undefined} onChange={e => setDateTo(e.target.value)} title="Opcional: déjalo vacío si el examen es de un solo día. Con fecha, el examen se abre TODOS los días del rango en el mismo horario." />
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
            <span style={{fontSize:11.5, fontWeight:800, color:'#1F3A8A', width:72}}>🔁 Repetir</span>
            <span style={{fontSize:12}}>solo los <b>desaprobados</b>, y solo dentro de la <b>ventana de recuperación</b> que abras en 🎓 Exámenes → Resultados. La repetición automática "a los N días" se retiró el 23-ago (la veían todos y la nota nueva tapaba la primera).</span>
          </div>
          <div className="row-flex" style={{gap:7, marginTop:7, flexWrap:'wrap', alignItems:'center'}}>
            <span style={{fontSize:11.5, fontWeight:800, color:'#1F3A8A', width:72}}>🔓 Acceso</span>
            <label className="check-row" style={{margin:0}} title="Sin requisitos previos: no necesitan ser aptos ni haber cerrado los módulos anteriores"><input type="checkbox" checked={libre} onChange={e => setLibre(e.target.checked)} /><span style={{fontSize:12}}>{libre ? 'Libre — todo el grupo puede rendirlo' : 'Solo aptos (≥75%) y habilitados'}</span></label>
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
              ✓ Programado: 📣 aviso {ann.notified ? 'ya enviado' : 'se enviará solo el ' + F.fmtFecha(ann.notifyDate)} · 🎓 examen {F.fmtFecha(ann.date)}{ann.dateTo && ann.dateTo !== ann.date ? ' al ' + F.fmtFecha(ann.dateTo) : ''}{ann.from ? ', ' + F.fmtHora(ann.from) : ''}{ann.to ? ' – ' + F.fmtHora(ann.to) : ''}{ann.dateTo && ann.dateTo !== ann.date ? ' (cada día del rango)' : ''}{ann.free ? ' · 🔓 acceso libre (sin requisitos)' : ''} · se abre y se cierra solo · los alumnos ven su cuenta regresiva en el módulo.
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
            {ann && ann.free
              ? exfPill('#E8F5E9', '#2E7D32', <>🔓 Acceso libre: los {members.length} alumnos pueden entrar</>, 'ca')
              : <>
                  {exfPill('#E8F5E9', '#2E7D32', <>✅ {members.filter(s => getStudentReadiness(s).apt).length} apto(s)</>, 'ca')}
                  {exfPill('#FFF8E1', '#E65100', <>⚠ {members.filter(s => !getStudentReadiness(s).apt).length} aún no — habilítalos aquí abajo</>, 'cb')}
                </>}
            <button className="att-btn" onClick={() => {
              if (!confirm('¿Habilitar el examen para TODO el grupo (' + members.length + ' alumnos), sin importar su porcentaje?')) return;
              const w = win || (X.createWindow({ examId: exam.id, groupId: group.id, isOpen: false }), X.windowForExamGroup(exam.id, group.id));
              members.forEach(s => { if (!(w.allowOverrides || []).includes(s.id)) X.toggleOverride(w.id, s.id); });
              abrirSiHaceFalta(w);
              onChange();
            }}>✅ Habilitar a todo el grupo</button>
            {win && (win.allowOverrides || []).length > 0 && <button className="att-btn" onClick={() => {
              if (!confirm('¿Quitar las habilitaciones manuales de este examen?')) return;
              (win.allowOverrides || []).slice().forEach(id => X.toggleOverride(win.id, id));
              onChange();
            }}>✕ Quitar habilitaciones ({(win.allowOverrides || []).length})</button>}
          </div>
          <div className="settings-hint" style={{margin:'0 0 8px'}}>{ann && ann.free
            ? <>Con <b>🔓 acceso libre</b> no hace falta habilitar a nadie: todo el grupo entra el día programado, sin importar su porcentaje ni los módulos anteriores. Si lo cambias a «solo aptos» en el paso 1, aquí eliges alumno por alumno.</>
            : <>El % es la preparación en el <b>módulo activo del grupo</b> (por eso baja al abrir un módulo nuevo: la cobertura empieza de cero). Si este examen es de un módulo anterior, ignora el % y <b>habilítalos tú</b> — al hacerlo, si el examen estaba cerrado te ofrece <b>abrirlo ahora</b>. Tienes la última palabra.</>}</div>
          <ExamResultsPanel exam={exam} members={members} />
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
                    <div className="sm-meta">Preparación {r.overall}% · {r.apt ? '✅ apto' : '⚠ ' + exfFalta(r, true)}</div>
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
                    : <label className="check-row" title="Abrirle el examen a este alumno, sin importar su porcentaje"><input type="checkbox" checked={r.apt || overridden} onChange={() => { const w = win || (X.createWindow({ examId: exam.id, groupId: group.id, isOpen: false }), X.windowForExamGroup(exam.id, group.id)); X.toggleOverride(w.id, s.id); abrirSiHaceFalta(w); onChange(); }} /><span style={{fontSize:12}}>{overridden ? 'Habilitado' : r.apt ? 'Apto' : 'Habilitar'}</span></label>}
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

/* ── 📊 Resultados del examen leídos de la nube (diagnostic_attempts): notas, intentos y temas débiles ── */
function ExamResultsPanel({ exam, members }) {
  const [rows, setRows] = exfUS(null);
  const [busy, setBusy] = exfUS(false);
  const PL = { L: '🎧 Listening', R: '📖 Lectura', X: '🧩 ¿Qué regla uso?', G: '📝 Gramática', V: '🔤 Vocabulario' };
  const load = async () => {
    const SBW = window.JUCUM_SB; if (!SBW) return;
    setBusy(true);
    try {
      const slugs = ((exam && exam.parts) || []).map(p => (((p.url || '').match(/\/(m\d+)\/examen/) || [])[1])).filter(Boolean);
      const sb = SBW.getClient();
      const res = await Promise.race([
        sb.from('diagnostic_attempts').select('user_id,score,correct,total,sections,attempt_no,created_at,module_id,activity_id')
          .in('user_id', members.map(s => s.id)).order('created_at', { ascending: true }).limit(1000),
        new Promise(r => setTimeout(() => r({ data: [] }), 12000)),
      ]);
      setRows(((res && res.data) || []).filter(r => r.module_id === 'exam-' + exam.id || slugs.some(sl => r.activity_id === 'examen-' + sl)));
    } catch (e) {}
    setBusy(false);
  };
  exfUE(() => { load(); }, [exam.id]);
  const by = {}; (rows || []).forEach(r => { (by[r.user_id] = by[r.user_id] || []).push(r); });
  const failCount = {}; let did = 0;
  const list = members.map(s => {
    const rs = by[s.id] || []; if (!rs.length) return { s };
    did++;
    const best = rs[0];   /* vale su primer intento (23-ago-2026) */
    const weak = Object.keys(PL).filter(k => { const x = (best.sections || {})[k]; return x && x.t && (x.h / x.t) < 0.75; });
    weak.forEach(k => { failCount[k] = (failCount[k] || 0) + 1; });
    return { s, rs, best, weak };
  }).sort((a, b) => (b.best ? b.best.score || 0 : -1) - (a.best ? a.best.score || 0 : -1));
  const groupWeak = Object.entries(failCount).sort((a, b) => b[1] - a[1]);
  return (
    <div style={{border:'1.5px solid #C5CAE9', background:'#F5F7FF', borderRadius:12, padding:'11px 14px', marginBottom:11}}>
      <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:7}}>
        <b style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:13.5}}>📊 Resultados del examen (nota automática, en vivo)</b>
        {exfPill('#E8EAF6', '#283593', <>{did}/{members.length} ya rindieron</>, 'd')}
        <button className="att-btn" onClick={load} disabled={busy}>{busy ? '⏳…' : '↻ Actualizar'}</button>
      </div>
      {rows === null ? <div className="settings-hint">Cargando resultados…</div> : <>
      {list.map(({ s, rs, best, weak }) => (
        <div key={s.id} style={{display:'flex', alignItems:'center', gap:8, padding:'5px 0', borderBottom:'1px solid #E5E9F8', fontSize:12.5, flexWrap:'wrap'}}>
          <span style={{fontWeight:800, flex:'1 1 150px', minWidth:150}}>{s.fullName}</span>
          {!best ? exfPill('#F0F0EA', '#888', '— aún no rinde', 'x') : <>
            {exfPill(best.score >= 75 ? '#E8F5E9' : '#FFEBEE', best.score >= 75 ? '#2E7D32' : '#C62828', <><b>{best.score}</b>/100</>, 'n')}
            <span style={{fontSize:11, color:'#666', fontWeight:700}}>{rs.length} intento{rs.length === 1 ? '' : 's'}{rs.length > 1 ? ' · vale el 1.º' : ''} · {new Date(best.created_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}</span>
            {weak.length
              ? <span style={{display:'flex', gap:4, flexWrap:'wrap'}}>{weak.map(k => <span key={k} style={{background:'#FFF3E0', border:'1px solid #FFB74D', color:'#8A5100', borderRadius:14, padding:'2px 8px', fontSize:10.5, fontWeight:800}}>{PL[k]}</span>)}</span>
              : exfPill('#E8F5E9', '#2E7D32', '✓ dominó todas las partes', 'w')}
          </>}
        </div>
      ))}
      {did > 0 && <div style={{marginTop:9, background:'#FFF7E8', border:'1.5px solid #F0C66B', borderRadius:10, padding:'8px 11px', fontSize:12, color:'#7a5410', fontWeight:700, lineHeight:1.6}}>
        📌 <b>Para tus prácticas de refuerzo:</b> {groupWeak.length ? groupWeak.map(([k, n]) => PL[k] + ' (' + n + ' alumno' + (n === 1 ? '' : 's') + ')').join(' · ') : 'ningún tema flojo en común — ¡el grupo va muy bien! 🎉'}{groupWeak.length ? ' — arma el repaso del grupo empezando por los primeros.' : ''}
      </div>}
      </>}
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
  const [att, setAtt] = React.useState(null);
  React.useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000);   // atrapa la apertura automática
    const f = () => setTick(t => t + 1);
    window.addEventListener('jucum:examflow', f);
    window.addEventListener('focus', f);                        // volvió de la pestaña del examen
    return () => { clearInterval(id); window.removeEventListener('jucum:examflow', f); window.removeEventListener('focus', f); };
  }, []);
  /* 🔓 24-ago-2026: lo que la profesora acaba de tocar (✅ Habilitar · Abrir AHORA) llega al
   * alumno SIN recargar: cada 30 s este banner trae de la nube la ventana de su examen y,
   * si algo cambió, se repinta. Antes el equipo del alumno usaba su copia local hasta
   * reentrar a la app — por eso “abrirle el examen” parecía seguir exigiendo el 75%. */
  React.useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const D0 = window.JUCUM_DATA, F0 = window.JUCUM_EXAMFLOW, X0 = window.JUCUM_EXAMS, SBW = window.JUCUM_SB;
        if (!D0 || !F0 || !X0 || !SBW || !X0.mergeCloudWindows) return;
        const st = (D0.STUDENTS || []).find(s => s.id === studentId); if (!st) return;
        const inf = F0.infoForModule(st, mod); if (!inf || !inf.exam || inf.phase === 'done') return;
        const sb = SBW.getClient(); if (!sb) return;
        const w = await sb.from('exam_windows').select('*').eq('exam_id', inf.exam.id).eq('group_id', st.group);
        if (!dead && !w.error && Array.isArray(w.data) && X0.mergeCloudWindows(w.data)) setTick(t => t + 1);
      } catch (e) {}
    })();
    return () => { dead = true; };
  }, [studentId, mod.id, tick]);
  /* Nota automática del examen (diagnostic_attempts) — vale el primer intento */
  React.useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const D0 = window.JUCUM_DATA, F0 = window.JUCUM_EXAMFLOW, SBW = window.JUCUM_SB;
        if (!D0 || !F0 || !SBW) return;
        const st = (D0.STUDENTS || []).find(s => s.id === studentId); if (!st) return;
        const inf = F0.infoForModule(st, mod);
        if (!inf.exam || inf.isForms || inf.phase === 'none') return;
        const slugs = (inf.exam.parts || []).map(p => (((p.url || '').match(/\/(m\d+)\/examen/) || [])[1])).filter(Boolean);
        const sb = SBW.getClient();
        /* ⏱️ 12 s de espera máxima (23-ago-2026): si la nube va lenta, seguimos con la nota
           del registro de práctica en vez de dejar al alumno sin su tarjeta. */
        const res = await Promise.race([
          sb.from('diagnostic_attempts').select('score,correct,total,sections,created_at,activity_id,module_id,attempt_no')
            .eq('user_id', studentId).order('created_at', { ascending: true }).limit(100),
          new Promise(r => setTimeout(() => r({ data: [] }), 12000)),
        ]);
        const data = res && res.data;
        if (dead) return;
        const rows = (data || []).filter(r => (r.module_id === 'exam-' + inf.exam.id || slugs.some(sl => r.activity_id === 'examen-' + sl)) && (!F0.examDesde || !F0.examDesde(inf.exam) || String(r.created_at || '').slice(0, 10) >= F0.examDesde(inf.exam)));
        if (rows.length) {
          /* Vale el PRIMER intento; solo lo reemplaza una repetición hecha DENTRO de la ventana
             de recuperación que abrió la profesora (23-ago-2026). Antes se mostraba la mejor. */
          const ret0 = F0.getRet ? F0.getRet(st.group, mod.id) : null;
          const of0 = F0.notaOficialPartes ? F0.notaOficialPartes(rows.map(r => ({ score: r.score, date: r.created_at, part: F0.canonPart ? F0.canonPart(inf.exam, r.activity_id) : r.activity_id })), ret0, F0.examDesde ? F0.examDesde(inf.exam) : null) : null;
          const src = (of0 && rows.find(r => r.created_at === of0.date)) || rows[0];
          const best = Object.assign({}, src, of0 ? { score: of0.score } : {});
          best._last = rows[rows.length - 1].created_at; best._n = rows.length; best._recu = !!(of0 && of0.isRecovery);
          if (of0) { best._detalle = of0.detalle; best._totalPartes = of0.totalPartes; }
          if (of0 && F0.notaExamen) { const adj = F0.notaExamen(inf.exam, of0); if (adj && adj.parcial) { best.score = adj.score; best._parcial = true; best._falta = adj.falta; } }
          setAtt(prev => (prev && prev.created_at === best.created_at && prev._n === best._n) ? prev : best);
        } else {
          /* 🚑 respaldo (06-ago): la nube de intentos no respondió — su nota vive también en su registro de práctica */
          const comp = (D0.getStudentProgress(studentId) || {}).completed || {};
          const ks = Object.keys(comp).filter(k => k.indexOf('exam-' + inf.exam.id + ':') === 0);
          if (ks.length) {
            /* Sin promediar (23-ago-2026): vale el PRIMER registro, o el de su recuperación autorizada */
            const rws = ks.map(k => ({ score: (comp[k] || {}).score, date: (comp[k] || {}).date, part: F0.canonPart ? F0.canonPart(inf.exam, k.split(':').slice(1).join(':')) : k.split(':').slice(1).join(':') })).filter(r => typeof r.score === 'number');
            const ret1 = F0.getRet ? F0.getRet(st.group, mod.id) : null;
            const of1 = (rws.length && F0.notaOficialPartes) ? F0.notaOficialPartes(rws, ret1, F0.examDesde ? F0.examDesde(inf.exam) : null) : null;
            if (of1) { const best = { score: of1.score, created_at: of1.date, _last: of1.date, _n: of1.intentos, sections: null, fromProgress: true, _recu: of1.isRecovery, _detalle: of1.detalle, _totalPartes: of1.totalPartes }; if (F0.notaExamen) { const adj = F0.notaExamen(inf.exam, of1); if (adj && adj.parcial) { best.score = adj.score; best._parcial = true; best._falta = adj.falta; } } setAtt(prev => prev || best); }
          }
        }
      } catch (e) {}
    })();
    return () => { dead = true; };
  }, [studentId, mod.id, tick]);
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
  const horario = info.ann ? ((info.ann.from ? F.fmtHora(info.ann.from) + (info.ann.to ? ' – ' + F.fmtHora(info.ann.to) : '') : 'todo el día') + (info.ann.dateTo && info.ann.dateTo !== info.ann.date ? ' · disponible hasta el ' + F.fmtFecha(info.ann.dateTo) : '')) : '';

  /* Ya rindió (nota automática instantánea): resultado + retroalimentación por parte */
  if (att && info.phase !== 'done') {
    const minG = (F.minGradeFor ? F.minGradeFor(student.group) : 75);
    const passed = (att.score || 0) >= minG;
    /* 🔁 Repetir SOLO con permiso (23-ago-2026): se quitó la repetición automática "a los N
       días" (la veían todos, aprobados incluidos, y la nota buena tapaba la primera).
       Ahora solo repiten los DESAPROBADOS dentro de la ventana de recuperación. */
    const rd = null, availT = null, canRetry = false;
    const part0 = ((info.exam && info.exam.parts) || []).find(p => p.url);
    const retryLink = part0 ? part0.url + (part0.url.includes('?') ? '&' : '?') + 'jucum_exam=1&jucum_retry=1&jucum_uid=' + encodeURIComponent(studentId) + '&jucum_mod=' + encodeURIComponent('exam-' + info.exam.id) + '&jucum_act=' + encodeURIComponent(part0.competency || '') + (info.ann && info.ann.variant ? '&jucum_variant=' + encodeURIComponent(info.ann.variant) : '') : null;
    const PL = { L: '🎧 Listening', R: '📖 Comprensión lectora', X: '🧩 ¿Qué regla uso?', G: '📝 Gramática', V: '🔤 Vocabulario' };
    const weak = Object.keys(PL).filter(k => { const s = (att.sections || {})[k]; return s && s.t && (s.h / s.t) < 0.75; }).map(k => PL[k]);
    return box(passed ? '#A5D6A7' : '#F0C46C', (
      <>
        {head(passed ? 'linear-gradient(135deg,#1B5E20,#2E7D32)' : 'linear-gradient(135deg,#8A5100,#B26A00)', passed ? '🎉' : '🌱',
          att._parcial ? 'Examen a medias · nota parcial' : 'Examen rendido · nota automática', mod.name + ' · ' + (att._parcial ? 'Te falta la ' + att._falta : passed ? '¡Módulo completado!' : 'Módulo terminado — sigue repasando'),
          att._parcial ? '🧩 ' + (att._detalle || []).map(d => (F.lblParte ? F.lblParte(info.exam, d.part) : d.part) + ': ' + d.score).join(' · ') + ' · ' + att._falta + ' pendiente' : '✔ ' + (att.correct != null ? att.correct : '–') + '/' + (att.total != null ? att.total : '–') + ' aciertos · intento ' + (att.attempt_no || 1) + ' · rendido el ' + new Date(att.created_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' }),
          cd(att.score, '/100'))}
        <div style={{background:'#fff', padding:'12px 15px', fontSize:12.5, lineHeight:1.65, color:'#4A4A44', fontWeight:600}}>
          {att._parcial
            ? <>🧩 <b>¡Vas muy bien!</b> Ya rendiste la {(att._detalle || []).map(d => F.lblParte ? F.lblParte(info.exam, d.part) : d.part).join(' y ')}{(att._detalle || []).length === 1 ? <> con <b>{att._detalle[0].score}</b></> : null} — te falta solo la <b>{att._falta}</b>. Tu nota parcial sube apenas la completes: tus partes se promedian. 💪</>
            : passed
            ? <>🏁 <b>¡Felicitaciones!</b> Terminaste <b>{mod.name}</b> con éxito — tu constancia se nota.{(att.attempt_no || 1) === 1 ? <> ¡Y a tu <b>primer intento</b>! 🏅</> : <> Aprobado en tu intento <b>{att.attempt_no}</b> — la perseverancia paga. 🙌</>}{weak.length ? <> Para dominarlo del todo, dale un repaso extra a: <b>{weak.join(' · ')}</b>.</> : <> Dominaste todas las partes del examen. 🌟</>}</>
            : <>Terminaste el examen de <b>{mod.name}</b> y tu nota quedó registrada automáticamente. Aún hay temas que necesitas seguir repasando: <b>{weak.length ? weak.join(' · ') : 'las prácticas del módulo'}</b>. Cada minuto de práctica cuenta — síguele con tus repasos diarios. 💪</>}
          <br/>Tu profesora ya ve tu resultado con el detalle pregunta por pregunta. La <b>nota final del módulo</b> combina examen + práctica diaria — mírala en <b>Mi avance</b>.
          {att._detalle && att._detalle.length && (att._totalPartes > 1 || (F.partesDeExamen && info.exam && F.partesDeExamen(info.exam).length > 1)) ? (() => {
            const falta = F.faltanPartes && info.exam ? F.faltanPartes(info.exam, att._detalle) : null;
            if (!falta) return <><br/>🧩 {att._detalle.map(d => (F.lblParte ? F.lblParte(info.exam, d.part) : d.part) + ': ' + d.score).join(' · ')} → tu nota final es el <b>promedio: {att.score}</b>.</>;
            /* 🧩 28-ago-2026: una fila por parte — la rendida sale ✅ completada con su nota; la
             * pendiente tiene su PROPIO botón mientras la ventana esté abierta (antes, quien ya
             * tenía una parte no veía ningún botón y no podía entrar a la otra). */
            const ps = F.partesDeExamen ? F.partesDeExamen(info.exam) : [];
            const urls = (info.exam.parts || []).filter(x => x.url);
            /* 🔓 28-ago (pedido): las partes se abren DE FRENTE — con una parte ya rendida, la
             * que falta queda disponible al instante (pueden hacer ambas el mismo día). Solo
             * se muestra 🕒 si el examen tiene fecha futura (aún no empieza). */
            const abierto = !(info.ann && info.ann.date && F.pDay() < info.ann.date);
            return (
              <div style={{display:'grid', gap:7, marginTop:10}}>
                {ps.map((p, i) => {
                  const d = (att._detalle || []).find(x => x.part === p.key);
                  if (d) return <div key={p.key} style={{display:'flex', alignItems:'center', gap:9, border:'1.5px solid #A5D6A7', background:'#F4FBF4', borderRadius:11, padding:'9px 13px', fontWeight:800, color:'#1B5E20', fontSize:12.5}}>✅ {p.label} · completada<span style={{marginLeft:'auto', fontFamily:"'Fredoka',sans-serif", fontSize:16}}>{d.score}<small style={{fontSize:10, color:'#77746B'}}>/100</small></span></div>;
                  const u = urls[i];
                  const link = u ? u.url + (u.url.includes('?') ? '&' : '?') + 'jucum_exam=1&jucum_uid=' + encodeURIComponent(studentId) + '&jucum_mod=' + encodeURIComponent('exam-' + info.exam.id) + '&jucum_act=' + encodeURIComponent(p.key) + (info.ann && info.ann.variant ? '&jucum_variant=' + encodeURIComponent(info.ann.variant) : '') : null;
                  return abierto && link
                    ? <a key={p.key} href={link} target="_blank" rel="noreferrer" style={{display:'flex', alignItems:'center', justifyContent:'center', gap:8, borderRadius:24, padding:'12px', fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:15, color:'#fff', textDecoration:'none', background:'linear-gradient(135deg,#1F3A8A,#0D1B5A)'}}>▶ Rendir la {p.label} ahora</a>
                    : <div key={p.key} style={{display:'flex', alignItems:'center', gap:9, border:'1.5px dashed #E3DDCD', background:'#FBFAF5', borderRadius:11, padding:'9px 13px', fontWeight:800, color:'#8A5100', fontSize:12.5}}>🕒 {p.label} · pendiente — se abre el {F.fmtFecha(info.ann.date)}</div>;
                })}
              </div>
            );
          })() : null}
          {att._n > 1 ? <><br/>🔁 Llevas <b>{att._n}</b> intentos — vale tu <b>{att._recu ? 'recuperación autorizada' : 'primer intento'}</b>.</> : null}
          {(() => {
            /* 🔁 Nueva oportunidad tipo VENTANA (nuevo orden): abierta N días; rinde apenas cumple requisitos */
            const rs = F.retOpenFor ? F.retOpenFor(student, mod.id, !passed) : { has: false };
            if (rs.has) {
              const R = rs.ret, q = rs.reqs || {};
              if (!rs.inScope) return null;
              const planBlk = !rs.blocked ? <RetPlanBlock student={student} mod={mod} att={att} /> : null;
              if (rs.open && retryLink && !passed) return (
                <>
                  <a href={retryLink} target="_blank" rel="noreferrer" style={{display:'block', textAlign:'center', marginTop:10, borderRadius:24, padding:'12px', fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:15, color:'#fff', textDecoration:'none', background:'linear-gradient(135deg,#F4A02C,#E07A12)'}}>🔁 Rendir mi recuperación ahora</a>
                  <div style={{marginTop:6, fontSize:11.5, fontWeight:800, color:'#8A5100', textAlign:'center'}}>Ventana abierta hasta el <b>{F.fmtFecha(R.to)}</b> · esta nota reemplaza la anterior.</div>
                  {planBlk}
                </>
              );
              if (rs.open && passed) return null;
              if (rs.blocked) return <div style={{marginTop:9, background:'#F7F5EF', border:'1.5px solid var(--border)', borderRadius:10, padding:'8px 11px', fontSize:12, color:'#777', fontWeight:700}}>⏸ Tu profesora habilitará tu nueva oportunidad — sigue practicando tu plan y consulta con ella. 💬</div>;
              if (!rs.active) return F.pDay() < R.from ? (
                <>
                  <div style={{marginTop:9, background:'#FFF3E0', border:'1.5px solid #FFB74D', borderRadius:10, padding:'8px 11px', fontSize:12, color:'#8A5100', fontWeight:700}}>🔁 <b>Tu nueva oportunidad:</b> del <b>{F.fmtFecha(R.from)}</b> al <b>{F.fmtFecha(R.to)}</b>. Llega apto practicando cada día: 📘 resúmenes · ✏️ gramática · 📗 stories.</div>
                  {planBlk}
                </>
              ) : null;
              return (
                <>
                  <div style={{marginTop:9, background:'#FFF3E0', border:'1.5px solid #FFB74D', borderRadius:10, padding:'8px 11px', fontSize:12, color:'#8A5100', fontWeight:700, lineHeight:1.6}}>
                    🔁 <b>Recuperación ABIERTA</b> del <b>{F.fmtFecha(R.from)}</b> al <b>{F.fmtFecha(R.to)}</b> — te falta: <b>apto {q.overall}% / {q.threshold}%</b>{q.dias14 != null ? <> · <b>práctica {q.dias14}/{F.retMin} días</b></> : null} · <b>avance {q.avance || 0}/{q.avanceMin || 2} días en tu ventana</b>. Apenas cumplas, tu botón aparece <b>aquí solo</b>. 💪
                  </div>
                  {planBlk}
                </>
              );
            }
            /* Sin ventana configurada NO hay repetición automática: la profesora la abre (23-ago-2026) */
            return passed ? null : <div style={{marginTop:9, background:'#F7F5EF', border:'1.5px solid var(--border)', borderRadius:10, padding:'8px 11px', fontSize:12, color:'#777', fontWeight:700, lineHeight:1.55}}>🔁 Si tu profesora te abre una <b>nueva oportunidad</b>, aparecerá aquí con su fecha. Mientras tanto, repite las prácticas de los temas marcados arriba y entrena con el 🧭 <b>pre-examen</b> de tu módulo. 💪</div>;
          })()}
        </div>
      </>
    ));
  }

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
    /* 🔁 No rindió a tiempo pero hay VENTANA de recuperación: misma fecha y apoyo que los que recuperan */
    const rs = F.retOpenFor ? F.retOpenFor(student, mod.id, true) : { has: false };
    if (rs.has && rs.inScope && (rs.active || F.pDay() < rs.ret.from) && !rs.blocked) {
      const R = rs.ret, q = rs.reqs || {};
      const part0 = ((info.exam && info.exam.parts) || []).find(p => p.url);
      const link2 = part0 ? part0.url + (part0.url.includes('?') ? '&' : '?') + 'jucum_exam=1&jucum_uid=' + encodeURIComponent(studentId) + '&jucum_mod=' + encodeURIComponent('exam-' + info.exam.id) + '&jucum_act=' + encodeURIComponent(part0.competency || '') + (info.ann && info.ann.variant ? '&jucum_variant=' + encodeURIComponent(info.ann.variant) : '') : null;
      return box('#F0C46C', (
        <>
          {head('linear-gradient(135deg,#8A5100,#B26A00)', '🎓', 'Aún puedes rendirlo', mod.name + ' · nueva oportunidad', 'ventana del ' + F.fmtFecha(R.from) + ' al ' + F.fmtFecha(R.to), rs.active ? cd('🟢', 'abierta') : cd(F.daysTo(R.from), 'días'))}
          <div style={{background:'#fff', padding:'12px 15px', fontSize:12.5, lineHeight:1.65, color:'#4A4A44', fontWeight:600}}>
            {rs.open && link2
              ? <>Cumples tus requisitos — puedes rendirlo <b>ahora</b>, dentro de la ventana. 📵 Quédate solo en la pestaña del examen; tus respuestas se guardan solas.
                  <a href={link2} target="_blank" rel="noreferrer" style={{display:'block', textAlign:'center', marginTop:10, borderRadius:24, padding:'13px', fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:16, color:'#fff', textDecoration:'none', background:'linear-gradient(135deg,#E11930,#B71C1C)', boxShadow:'0 6px 18px rgba(225,25,48,.45)'}}>🎓 Dar mi examen ahora</a></>
              : <>Para que tu examen se abra te falta: <b>apto {q.overall}% / {q.threshold}%</b>{q.dias14 != null ? <> · <b>práctica {q.dias14}/{F.retMin} días</b></> : null} · <b>avance {q.avance || 0}/{q.avanceMin || 2} días en tu ventana</b>. Practica cada día 📘 resúmenes · ✏️ gramática · 📗 stories — apenas cumplas, el botón aparece <b>aquí solo</b>. Tu profesora ve tu avance y puede abrirte el examen. 💪</>}
            <RetPlanBlock student={student} mod={mod} att={null} />
          </div>
        </>
      ));
    }
    return box('var(--border)', (
      <div style={{background:'#F7F5EF', padding:'11px 15px', fontSize:12.5, fontWeight:700, color:'#777', display:'flex', gap:9, alignItems:'center'}}>
        🎓 El examen de {mod.name} ya cerró. Si lo rendiste, tu nota se registró <b>automáticamente</b> y aparecerá aquí en un momento. ✓
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
  /* announced · apto, habilitado por la profesora, o aún no */
  const r = info.r || { overall: 0, apt: false };
  const habil = !info.canTake ? false : !r.apt;                 // tú se lo abriste a mano
  const color = (r.apt || habil) ? '#2EA84B' : r.overall >= 50 ? '#F9A825' : '#E53935';
  return box((r.apt || habil) ? '#A5D6A7' : '#F0C46C', (
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
          {habil
            ? exfPill('#E8F5E9', '#2E7D32', '✅ Habilitada por tu profesora', 'apt')
            : exfPill(r.apt ? '#E8F5E9' : '#FFF8E1', r.apt ? '#2E7D32' : '#E65100', r.apt ? '✓ Apto'
                : r.blocker === 'coverage' ? '📚 Te falta terminar el módulo' : 'Falta ' + Math.max(0, (r.threshold || 75) - r.overall) + '% para ser Apto', 'apt')}
        </div>
        <div style={{fontSize:12.5, lineHeight:1.6, color:'#4A4A44', fontWeight:600}}>
          {habil
            ? <>✅ <b>Tu profesora te habilitó</b> para rendir este examen: no necesitas llegar al 75%. El botón para entrar aparecerá <b>aquí mismo</b> {info.ann && info.ann.date ? <>el <b>{F.fmtFecha(info.ann.date)}</b>{horario ? <> a la hora indicada ({horario})</> : null}</> : 'el día del examen'}. Mientras tanto, repasa con calma. 💪</>
            : r.apt
            ? <>¡Eres Apto! 🎉 Pero ojo: tu preparación es una <b>foto viva</b> — si dejas de practicar puede <b>bajar del 75%</b> y quedarías sin rendir tu examen. Mantén tu Apto con <b>{minDia} min cada día</b>. El botón para dar tu examen aparecerá <b>aquí mismo</b> ese día.</>
            : r.blocker === 'coverage'
            ? <>Ya pasaste el <b>75%</b> ({r.overall}%) 🎉, pero para ser Apto también hay que tener <b>terminado el módulo</b>: llevas <b>{r.coverage || 0}%</b> de tus prácticas aprobadas y necesitas <b>{r.needCoverage || 60}%</b>. Termina (o mejora) las prácticas que te faltan y tu examen se abre solo. 💪</>
            : <>El examen se abre solo para alumnos <b>Aptos (75%)</b>. Aún estás a tiempo: tu preparación sube con la <b>práctica de cada día</b> — <b>{minDia} min diarios</b>, no todo de golpe. 💪</>}
        </div>
        {!r.apt && !habil && <button type="button" onClick={() => setPlan(true)} style={{marginTop:10, width:'100%', border:'none', borderRadius:24, padding:'11px', fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:14, cursor:'pointer', color:'#fff', background:'linear-gradient(135deg,#F4A02C,#E07A12)'}}>🎯 ¿Qué hago para dar mi examen?</button>}
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

/* 🧭 ETAPA 3 · Plan de refuerzo con seguimiento diario (dentro de la ventana de recuperación).
 * Todo se deriva del progreso real: sin marcar a mano. Lo no completado sigue pendiente
 * al día siguiente (“se recupera”); items hechos ANTES de la ventana salen como “repásala”. */
function RetPlanBlock({ student, mod, att }) {
  const F = window.JUCUM_EXAMFLOW;
  const [sel, setSel] = React.useState(null);
  if (!F || !F.retPlan) return null;
  const rs = F.retOpenFor(student, mod.id, true);
  if (!rs.has || !rs.inScope) return null;
  const R = rs.ret;
  const weakK = att && att.sections ? ['L','R','X','G','V'].filter(k => { const s = att.sections[k]; return s && s.t && (s.h / s.t) < 0.75; }) : [];
  const plan = F.retPlan(student, mod, weakK);
  if (!plan.length) return null;
  const done = F.retPlanDone(student, plan, R.from);
  const hoy = F.pDay();
  const av = F.retDias(student, R);
  const minByDay = {}; (av.dias || []).forEach(d => { minByDay[d.date] = d.total || 0; });
  const doneByDay = {}; Object.values(done).forEach(d => { if (d && d !== 'antes') doneByDay[d] = (doneByDay[d] || 0) + 1; });
  const dias = [];
  for (let t = Date.parse(R.from + 'T00:00:00Z'); t <= Date.parse(R.to + 'T00:00:00Z') && dias.length < 12; t += 86400000) dias.push(new Date(t).toISOString().slice(0, 10));
  const pend = plan.filter(it => !done[it.actId] || done[it.actId] === 'antes');
  const selDia = sel || hoy;
  const itemsDia = selDia === hoy ? plan : plan.filter(it => done[it.actId] === selDia);
  const dLbl = d => { try { return new Date(d + 'T12:00:00Z').toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' }); } catch (e) { return d; } };
  const stC = d => d > hoy ? ['#fff', '#B0A99A', '1.5px dashed #E0DACB'] : doneByDay[d] ? ['#E8F5E9', '#2E7D32', '1.5px solid #A5D6A7'] : (minByDay[d] > 0 ? ['#FFF8E1', '#8A5100', '1.5px solid #FFD54F'] : d === hoy ? ['#fff', '#1F3A8A', '1.5px solid #1F3A8A'] : ['#FFEBEE', '#C62828', '1.5px solid #EF9A9A']);
  return (
    <div style={{marginTop:10, border:'1.5px solid #FFB74D', background:'#FFFDF6', borderRadius:12, padding:'10px 13px'}}>
      <div style={{fontSize:11.5, fontWeight:800, color:'#8A5100', marginBottom:7}}>🧭 Tu plan de refuerzo · {plan.length - pend.length}/{plan.length} hechas <span style={{fontWeight:700}}>· se actualiza cada día · muéstrame avance al menos {F.retAvanceMin || 2} días (llevas {av.avance})</span></div>
      <div style={{display:'flex', gap:5, flexWrap:'wrap', marginBottom:8}}>
        {dias.map(d => { const [bg, c, bd] = stC(d); return (
          <button key={d} type="button" onClick={() => setSel(d === selDia ? null : d)} style={{background:bg, color:c, border:bd, borderRadius:9, padding:'4px 8px', cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:10.5, lineHeight:1.25, outline: d === selDia ? '2px solid #F9A825' : 'none'}}>
            {dLbl(d)}<span style={{display:'block', fontSize:9.5, opacity:.85}}>{d > hoy ? '·' : doneByDay[d] ? '✓ ' + doneByDay[d] : minByDay[d] > 0 ? '⚠' : d === hoy ? 'hoy' : '✗'}</span>
          </button>
        ); })}
      </div>
      <div style={{display:'grid', gap:4}}>
        {itemsDia.length === 0 && <div style={{fontSize:11.5, fontWeight:700, color:'#999'}}>Ese día no completaste actividades del plan.</div>}
        {itemsDia.map(it => {
          const dd = done[it.actId];
          const ok = dd && dd !== 'antes';
          return (
            <div key={it.modId + it.actId} style={{display:'flex', alignItems:'center', gap:7, fontSize:12, fontWeight:700, color: ok ? '#2E7D32' : '#4A4A44'}}>
              <span>{ok ? '✅' : '⬜'}</span>
              <span style={{textDecoration: ok ? 'line-through' : 'none', flex:1}}>{it.label}{dd === 'antes' ? <span style={{color:'#8A5100'}}> · ↩️ repásala (la hiciste antes del plan)</span> : null}</span>
              {ok && dd !== selDia && selDia === hoy ? <span style={{fontSize:10, color:'#999'}}>✓ {dLbl(dd)}</span> : null}
            </div>
          );
        })}
      </div>
      {selDia === hoy && <div style={{marginTop:7, fontSize:11, fontWeight:700, color:'#8A5100'}}>↩️ Lo que no completas <b>pasa al día siguiente</b> — hoy tienes <b>{pend.length}</b> pendiente(s). 💬 Si te trabas, escríbele a tu profesora: ella ve tu avance y puede abrirte el examen.</div>}
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
        <span className="al-name">Examen del módulo · {mod.name}<span style={{display:'block', fontSize:10.5, color:'#999', fontWeight:800}}>Rendido/cerrado · nota automática registrada</span></span>
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
  const hab = !!info.canTake && !r.apt;
  return (
    <div className="al-item locked" style={{cursor:'default'}}>
      <span className="al-num">🔒</span><span className="al-ico">🎓</span>
      <span className="al-name">Examen del módulo · {mod.name}
        <span style={{display:'block', fontSize:10.5, color:'#999', fontWeight:800}}>
          {info.ann && info.ann.date
            ? <>Se abre el {F.fmtFecha(info.ann.date)}{info.ann.from ? ', ' + F.fmtHora(info.ann.from) : ''}{hab ? ' · tu profesora te habilitó' : <> · solo Aptos (75%){r.apt ? ' — mantén tu Apto practicando a diario' : ''}</>}</>
            : hab ? 'Tu profesora te habilitó · anunciará la fecha' : 'Tu profesora anunciará la fecha · solo Aptos (75%)'}
        </span>
      </span>
      {hab
        ? <span className="mm-chip" style={{background:'#E8F5E9', color:'#2E7D32', whiteSpace:'nowrap'}}>✓ Habilitada</span>
        : r.apt
        ? <span className="mm-chip" style={{background:'#E8F5E9', color:'#2E7D32', whiteSpace:'nowrap'}}>✓ Apto</span>
        : <span className="mm-chip" style={{background:'#FFF8E1', color:'#E65100', whiteSpace:'nowrap'}}>Falta {Math.max(0, 75 - r.overall)}%</span>}
    </div>
  );
}

Object.assign(window, { TeacherExamsFolders, GroupExamFolder, AptRoster, ExamResultsPanel, ModuleFolderRow, ModuleFolderDetail, PreexamFolderRow, ModuleExamBanner, ExamChecklistRow, ExamPlanModal, NotesList });
