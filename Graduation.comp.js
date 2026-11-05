/* 🎓 Grupos finalizados · alumnos egresados · encuesta de cierre (28-sep-2026)
 * Lógica y nube: graduation.js (window.JUCUM_GRAD). Aprobado en
 * "Propuesta - Grupos finalizados v2 (donde va).html".
 *  - StudentGraduated  → lo que ve el alumno egresado (App lo enruta en vez de StudentDashboard)
 *  - FinishGroupModal  → botón 🎓 Finalizar grupo (GroupDetail del profesor)
 *  - FinishedGroupBanner → franja dorada + ↩ Reabrir dentro del grupo finalizado
 *  - GradLeads         → 🙋 Interesados en continuar (desde Mis grupos)
 */
const GRD_FONT_T = "'Fredoka',sans-serif";
const GRD_GOLD = { bg:'#FFF6DA', bd:'#E3C466', ink:'#7A5A00', deep:'#5C4300' };
const GRD_LIKES = ['Las clases', 'Mi teacher', 'Las stories', 'Los audios', 'La plataforma', 'Mis compañeros'];
const GRD_SCHED = ['Mañana', 'Tarde', 'Noche', 'Sábados'];
const GRD_FACES = [['😞','Nada'],['😕','Poco'],['😐','Regular'],['🙂','Bien'],['😄','¡Me encantó!']];
const GRD_WANTS = [['si','✅ Sí, quiero continuar'],['tal_vez','🤔 Tal vez, quiero más información'],['no','⏸️ Por ahora no']];
const GRD_STATUS = [['nuevo','🆕 Nuevo'],['contactado','📞 Contactado'],['inscrito','✅ Inscrito'],['no_continuara','⏸️ No continuará']];

function GrdMedal({ size = 18, label }) {
  return <span style={{width:size,height:size,borderRadius:'50%',flexShrink:0,display:'inline-flex',alignItems:'center',justifyContent:'center',
    background:'radial-gradient(circle at 35% 30%,#FFF0B8,#E0AE1E 60%,#B8860B)',border:`${size>40?3:1.5}px solid #A67C00`,
    fontFamily:GRD_FONT_T,fontWeight:700,color:GRD_GOLD.deep,fontSize:Math.round(size*0.2)}}>{label || ''}</span>;
}

function grdStudentStats(student) {
  const D = window.JUCUM_DATA;
  const prog = D.getStudentProgress ? (D.getStudentProgress(student.id) || {}) : {};
  const keys = Object.keys(prog.completed || {}).filter(k => !/^exam-/.test(k));
  const mods = (D.MODULE_CATALOG[student.level] || []).filter(m => keys.some(k => k.startsWith(m.id + ':')));
  const min = student.totalMinutes || 0;
  return { acts: keys.length, mods, time: min >= 60 ? Math.round(min / 60) + ' h' : min + ' min' };
}

/* ─────────── Alumno egresado ─────────── */
function StudentGraduated({ user, onLogout }) {
  const D = window.JUCUM_DATA, G = window.JUCUM_GRAD;
  const student = (D.STUDENTS || []).find(s => s.id === user.studentId);
  const group = student ? (D.GROUPS || []).find(g => g.id === student.group) : null;
  const level = (student && D.LEVELS[student.level]) || { code:'', color:'#F9A825', dark:'#E65100' };
  const [view, setView] = React.useState('home');
  const [menu, setMenu] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  const [qi, setQi] = React.useState(() => Math.floor(Math.random() * G.QUOTES.length));
  const [survey, setSurvey] = React.useState(() => G.myCached(user.studentId));
  const [thanks, setThanks] = React.useState(false);
  React.useEffect(() => { document.body.setAttribute('data-level', student ? student.level : ''); G.loadMySurvey(user.studentId).then(r => { if (r) setSurvey(r); }); }, []);
  if (!student || !group) return null;
  const st = grdStudentStats(student);
  const first = student.fullName.split(' ')[0];
  const label = group.finishedLabel || ('Nivel ' + level.code);
  const failed = G.isFailed(student.id);
  const closed = !!(G.isClosed && G.isClosed(student.id));
  const nx = G.nextLevel(student.level);
  const msg = failed
    ? (group.finishedMsgFail || 'Esta vez no alcanzaste la nota para aprobar, pero todo lo que practicaste queda guardado. Comunícate con nosotros para conocer los nuevos horarios y volver a llevar el nivel. ¡Cada día con esfuerzo mejorarás más!')
    : (group.finishedMsg || '¡Felicitaciones! Terminaste esta etapa. Escríbenos o visítanos para conocer los nuevos horarios y seguir avanzando con tu inglés.');
  const waText = failed
    ? `Hola, soy ${student.fullName}. Terminé la etapa de ${label} con el grupo ${group.name} y quiero información para volver a llevar el nivel en un nuevo horario.`
    : `Hola, soy ${student.fullName}. Terminé ${label} con el grupo ${group.name} y quiero conocer los nuevos horarios.`;
  const go = (v) => { setMenu(false); setView(v); try { window.scrollTo(0, 0); } catch (e) {} };
  const card = {background:'#fff',border:'1px solid #E8E5DC',borderRadius:16,padding:16,boxShadow:'0 1px 2px rgba(0,0,0,.06),0 2px 6px rgba(0,0,0,.07)'};
  const back = <button className="back-btn" onClick={() => go('home')}>← Volver</button>;

  return (
    <>
      <header className="app-header st-hdr">
        <div className="app-logo" onClick={() => go('home')} style={{cursor:'pointer'}}>
          <img src={window.JUCUM_LOGO || 'logo-jucum.png'} alt="JUCUM EC" />
          <div className="pgtitle">{closed ? 'Mi recorrido' : 'Mi etapa completada'}</div>
        </div>
        <div className="app-right st-hdr-right">
          {window.NotifBell && <NotifBell userId={student.id} />}
          <div className="st-um">
            <button type="button" className={`user-pill st-um-btn ${menu ? 'on' : ''}`} onClick={() => setMenu(m => !m)}>
              <div className="ava" style={{background:`linear-gradient(135deg,${level.color}80,${level.dark})`}}>{student.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
              <span className="st-um-name">{first}</span><span className="st-um-caret">▾</span>
            </button>
            {menu && (
              <div className="st-um-pop" role="menu">
                <div className="st-um-who"><b>{student.fullName}</b>{level.code} · {group.name}</div>
                <button type="button" className={`st-um-it ${view==='home'?'on':''}`} onClick={() => go('home')}><span className="st-ico">{closed ? '🗺️' : '🎓'}</span>{closed ? 'Mi recorrido' : 'Mi etapa'}</button>
                {window.StudentAvance && <button type="button" className={`st-um-it ${view==='avance'?'on':''}`} onClick={() => go('avance')}><span className="st-ico">📈</span>Mi avance</button>}
                {window.StudentBoletin && <button type="button" className={`st-um-it ${view==='boletin'?'on':''}`} onClick={() => go('boletin')}><span className="st-ico">📔</span>Boletín</button>}
                {window.StudentProfile && <button type="button" className={`st-um-it ${view==='profile'?'on':''}`} onClick={() => go('profile')}><span className="st-ico">👤</span>Mi perfil</button>}
                <div className="st-um-sep"></div>
                <button type="button" className="st-um-it st-um-out" onClick={() => { setMenu(false); setConfirm(true); }}><span className="st-ico">⎋</span>Cerrar sesión</button>
              </div>
            )}
          </div>
        </div>
      </header>
      {confirm && (
        <div className="st-confirm" onClick={() => setConfirm(false)}>
          <div className="st-confirm-box" onClick={(e) => e.stopPropagation()}>
            <h3>¿Cerrar sesión?</h3><p>Tu avance ya está guardado.</p>
            <div className="st-confirm-btns"><button type="button" className="st-bt" onClick={() => setConfirm(false)}>Quedarme</button><button type="button" className="st-bt red" onClick={() => { setConfirm(false); onLogout(); }}>Salir</button></div>
          </div>
        </div>
      )}

      {view === 'avance' && window.StudentAvance ? <StudentAvance user={user} student={student} onBack={() => go('home')} />
      : view === 'boletin' && window.StudentBoletin ? <StudentBoletin user={user} student={student} onBack={() => go('home')} />
      : view === 'profile' && window.StudentProfile ? <StudentProfile user={user} onBack={() => go('home')} />
      : view === 'survey' ? (
        <main className="main" style={{maxWidth:640,margin:'0 auto'}}>
          {back}
          <ExitSurveyForm student={student} initial={survey} onDone={(row) => { setSurvey(row); setThanks(true); go('home'); }} />
        </main>
      ) : closed ? (
        <JourneyHome student={student} level={level} first={first} card={card} qi={qi} setQi={setQi} thanks={thanks} survey={survey} onSurvey={() => go('survey')} />
      ) : (
        <main className="main" style={{maxWidth:980,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,340px),1fr))',gap:16,alignItems:'start'}}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {failed ? (
            <div style={{...card,border:`2px solid ${level.color}`,textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:10,padding:'24px 18px 18px'}}>
              <span style={{width:76,height:76,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:`linear-gradient(135deg,${level.color},${level.dark})`,color:'#fff',fontFamily:GRD_FONT_T,fontWeight:700,fontSize:15}}>{level.code}</span>
              <div style={{fontSize:11,fontWeight:800,letterSpacing:'.14em',textTransform:'uppercase',color:level.dark}}>Etapa terminada · {G.fmtDate(group.finishedAt)}</div>
              <h1 style={{fontFamily:GRD_FONT_T,fontWeight:600,fontSize:25,color:'#0D1B5A',lineHeight:1.15,margin:0}}>{first}, ¡no te rindas!</h1>
              <p style={{fontSize:14,color:'#4A5468',lineHeight:1.5,margin:0,textWrap:'pretty'}}>Terminaste el ciclo de <b>{label}</b> con el grupo {group.name}. Esta vez no se llegó a la nota, pero lo que aprendiste es tuyo y te hace más fuerte para el próximo intento.</p>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'center'}}>
                {st.mods.map((m, i) => <span key={m.id} style={{fontSize:11.5,fontWeight:800,borderRadius:14,padding:'4px 10px',background:'#F4F7FB',border:'1px solid #DDE3EC',color:'#33415C'}}>M{i + 1} practicado</span>)}
                <span style={{fontSize:11.5,fontWeight:800,borderRadius:14,padding:'4px 10px',background:'#fff',border:'1.5px dashed #8FA6CF',color:'#1F3A8A'}}>Próximo paso: volver a intentarlo</span>
              </div>
            </div>
            ) : (
            <div style={{...card,border:'2px solid #E9D9A6',boxShadow:'0 6px 18px rgba(180,140,20,.15)',textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:10,padding:'24px 18px 18px'}}>
              <GrdMedal size={76} label={level.code} />
              <div style={{fontSize:11,fontWeight:800,letterSpacing:'.14em',textTransform:'uppercase',color:'#9A7400'}}>Etapa completada · {G.fmtDate(group.finishedAt)}</div>
              <h1 style={{fontFamily:GRD_FONT_T,fontWeight:600,fontSize:26,color:'#0D1B5A',lineHeight:1.15,margin:0}}>¡Lo lograste, {first}!</h1>
              <p style={{fontSize:14,color:'#4A5468',lineHeight:1.5,margin:0,textWrap:'pretty'}}>Terminaste <b>{label}</b> con el grupo {group.name}.</p>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'center'}}>
                {st.mods.map((m, i) => <span key={m.id} style={{fontSize:11.5,fontWeight:800,borderRadius:14,padding:'4px 10px',background:'#E8F5E9',border:'1px solid #A5D6A7',color:'#1B5E20'}}>✓ M{i + 1}</span>)}
                {nx && <span style={{fontSize:11.5,fontWeight:800,borderRadius:14,padding:'4px 10px',background:'#fff',border:'1.5px dashed #8FA6CF',color:'#1F3A8A'}}>Siguiente: {nx}</span>}
              </div>
            </div>
            )}
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
              {[[st.mods.length,'módulos'],[st.acts,'actividades'],[st.time,'de práctica']].map(([b, t]) => (
                <div key={t} style={{...card,padding:'10px 6px',textAlign:'center',boxShadow:'none'}}><b style={{display:'block',fontFamily:GRD_FONT_T,fontSize:20,color:'#0D1B5A'}}>{b}</b><span style={{fontSize:11.5,color:'#667',fontWeight:700}}>{t}</span></div>
              ))}
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{background:'#0D1B5A',color:'#fff',borderRadius:16,padding:16,display:'flex',flexDirection:'column',gap:8}}>
              <div style={{fontFamily:GRD_FONT_T,fontWeight:500,fontSize:19,lineHeight:1.3}}>“{G.QUOTES[qi][0]}”</div>
              <div style={{fontSize:13.5,color:'#D6E0FF',lineHeight:1.45}}>{G.QUOTES[qi][1]}</div>
              <button type="button" onClick={() => setQi(i => (i + 1) % G.QUOTES.length)} style={{alignSelf:'flex-end',border:'1px solid rgba(255,255,255,.35)',background:'none',color:'#fff',fontFamily:'inherit',fontWeight:800,fontSize:11.5,borderRadius:14,padding:'5px 11px',cursor:'pointer'}}>Otra frase ↻</button>
            </div>
            <div style={{...card,display:'flex',flexDirection:'column',gap:10}}>
              <h3 style={{fontFamily:GRD_FONT_T,fontWeight:600,fontSize:18,color:'#0D1B5A',margin:0}}>{failed ? '¿Lo intentamos de nuevo?' : '¿Seguimos aprendiendo?'}</h3>
              <p style={{fontSize:13.5,color:'#555',lineHeight:1.5,margin:0,textWrap:'pretty'}}>{msg}</p>
              <a href={G.waLink(waText)} target="_blank" rel="noopener" style={{minHeight:48,borderRadius:24,background:'#1E8E4E',color:'#fff',fontWeight:800,fontSize:14.5,display:'flex',alignItems:'center',justifyContent:'center',gap:8,textDecoration:'none'}}>💬 Consultar horarios · {G.CONTACT.phoneLabel}</a>
              <div style={{display:'flex',gap:10,alignItems:'flex-start',background:'#F4F7FB',borderRadius:12,padding:'10px 12px',fontSize:13,color:'#33415C',lineHeight:1.45}}>
                <span style={{fontSize:16}}>📍</span>
                <div><b style={{display:'block',color:'#0D1B5A'}}>Atención presencial</b>{G.CONTACT.address} · <a href={G.CONTACT.mapUrl} target="_blank" rel="noopener" style={{color:'#1F3A8A',fontWeight:800}}>Ver en el mapa</a></div>
              </div>
            </div>
            {thanks && <div style={{background:'#E8F5E9',border:'1px solid #A5D6A7',borderRadius:14,padding:12,fontSize:13.5,color:'#1B5E20',lineHeight:1.45}}><b>¡Gracias, {first}!</b> Recibimos tu opinión.{survey && (survey.wants === 'si' || survey.wants === 'tal_vez') ? ' Te escribiremos con los horarios disponibles.' : ''}</div>}
            <button type="button" onClick={() => go('survey')} style={{minHeight:46,borderRadius:23,border:`1.5px solid ${GRD_GOLD.bd}`,background:'#FFF8E1',color:GRD_GOLD.ink,fontFamily:'inherit',fontWeight:800,fontSize:14,cursor:'pointer'}}>{survey ? '✏️ Editar mi opinión' : '⭐ Cuéntanos tu experiencia'}</button>
          </div>
        </main>
      )}
    </>
  );
}

function ExitSurveyForm({ student, initial, onDone }) {
  const G = window.JUCUM_GRAD;
  const i0 = initial || {};
  const [rating, setRating] = React.useState(i0.rating || 0);
  const [liked, setLiked] = React.useState(i0.liked || []);
  const [improve, setImprove] = React.useState(i0.improve || '');
  const [wants, setWants] = React.useState(i0.wants || '');
  const [sched, setSched] = React.useState(i0.schedule || []);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');
  const tog = (arr, set, v) => set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
  const chip = (on) => ({border:`1.5px solid ${on ? '#1F3A8A' : '#D6DEEA'}`,background:on ? '#E4EDFB' : '#fff',color:on ? '#1F3A8A' : '#33415C',borderRadius:20,fontFamily:'inherit',fontWeight:800,fontSize:13,padding:'0 14px',minHeight:42,cursor:'pointer'});
  const q = {display:'flex',flexDirection:'column',gap:8,fontSize:14,fontWeight:800,color:'#33415C'};
  const send = async () => {
    if (!rating || !wants) { setErr('Elige una carita y si quieres continuar.'); return; }
    setBusy(true); setErr('');
    const r = await G.saveSurvey(student.id, { rating, liked, improve: improve.trim(), wants, schedule: wants === 'no' ? [] : sched });
    setBusy(false);
    if (!r.ok) { setErr('No se pudo enviar. Revisa tu conexión e inténtalo otra vez.'); console.warn('exit survey:', r.error); return; }
    onDone(r.row);
  };
  return (
    <div style={{background:'#fff',border:'1px solid #E8E5DC',borderRadius:16,padding:18,display:'flex',flexDirection:'column',gap:18}}>
      <h2 style={{fontFamily:GRD_FONT_T,fontWeight:600,fontSize:21,color:'#0D1B5A',margin:0}}>Tu experiencia en JUCUM</h2>
      <div style={q}>¿Qué te pareció el programa?
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:6}}>
          {GRD_FACES.map(([e, t], i) => <button key={t} type="button" onClick={() => setRating(i + 1)} style={{...chip(rating === i + 1),borderRadius:12,display:'flex',flexDirection:'column',alignItems:'center',gap:2,padding:'6px 0',fontSize:22}}>{e}<small style={{fontSize:10,fontWeight:800,color:'#667'}}>{t}</small></button>)}
        </div>
      </div>
      <div style={q}>¿Qué fue lo que más te gustó?
        <div style={{display:'flex',flexWrap:'wrap',gap:6}}>{GRD_LIKES.map(t => <button key={t} type="button" onClick={() => tog(liked, setLiked, t)} style={chip(liked.includes(t))}>{t}</button>)}</div>
      </div>
      <label style={q}><span>¿Qué podríamos mejorar? <span style={{fontWeight:600,color:'#8A94A6'}}>(opcional)</span></span>
        <textarea value={improve} onChange={e => setImprove(e.target.value.slice(0, 500))} placeholder="Escribe aquí…" style={{fontFamily:'inherit',fontSize:14,border:'1.5px solid #D6DEEA',borderRadius:10,padding:10,minHeight:70,resize:'vertical',fontWeight:600}}></textarea>
      </label>
      <div style={q}>¿Te gustaría continuar aprendiendo inglés con nosotros?
        <div style={{display:'flex',flexDirection:'column',gap:6}}>{GRD_WANTS.map(([k, t]) => <button key={k} type="button" onClick={() => setWants(k)} style={{...chip(wants === k),textAlign:'left',borderRadius:12,minHeight:46}}>{t}</button>)}</div>
      </div>
      {wants && wants !== 'no' && (
        <div style={q}>¿Qué horario te acomoda?
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>{GRD_SCHED.map(t => <button key={t} type="button" onClick={() => tog(sched, setSched, t)} style={chip(sched.includes(t))}>{t}</button>)}</div>
        </div>
      )}
      {err && <div style={{color:'#C62828',fontWeight:800,fontSize:13}}>{err}</div>}
      <button type="button" disabled={busy} onClick={send} style={{minHeight:48,borderRadius:24,border:0,background:'#1F3A8A',color:'#fff',fontFamily:'inherit',fontWeight:800,fontSize:15,cursor:'pointer',opacity:busy ? .6 : 1}}>{busy ? 'Enviando…' : 'Enviar mi opinión'}</button>
    </div>
  );
}

/* ─────────── Profesor ─────────── */
function grdStatusFor(student, group) {
  const G = window.JUCUM_GRAD;
  if (!G || !G.isFinished(group)) return null;
  if (G.failedList(group).includes(student.id)) return { t:'❌ Reprobó', bg:'#FFEBEE', c:'#8E1B1B' };
  return G.keepList(group).includes(student.id) ? { t:'🔁 Sigue activo', bg:'#FFF3E0', c:'#8A4B00' } : { t:'🎓 Egresado', bg:'#FFF1C9', c:GRD_GOLD.ink };
}

function FinishGroupModal({ groupId, onClose, onDone }) {
  const D = window.JUCUM_DATA, G = window.JUCUM_GRAD;
  const group = D.GROUPS.find(g => g.id === groupId);
  const level = D.LEVELS[group.level] || { code: '' };
  const members = D.STUDENTS.filter(s => s.group === groupId).sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'));
  const mods = D.MODULE_CATALOG[group.level] || [];
  const others = D.GROUPS.filter(g => g.id !== groupId && !G.isFinished(g)).sort((a, b) => (a.level + a.name).localeCompare(b.level + b.name, 'es'));
  const labels = ['Nivel ' + level.code + ' completo', ...mods.map((m, i) => `Hasta el Módulo ${i + 1} · ${m.name}`)];
  const [label, setLabel] = React.useState(labels[0]);
  const [date, setDate] = React.useState(() => new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10)); // día Perú
  const [msg, setMsg] = React.useState('¡Felicitaciones! Terminaste esta etapa. Escríbenos o visítanos para conocer los nuevos horarios y seguir avanzando con tu inglés.');
  const [msgFail, setMsgFail] = React.useState('Esta vez no alcanzaste la nota para aprobar, pero todo lo que practicaste queda guardado. Comunícate con nosotros para conocer los nuevos horarios y volver a llevar el nivel. ¡Cada día con esfuerzo mejorarás más!');
  const [fate, setFate] = React.useState(() => Object.fromEntries(members.map(s => [s.id, 'grad'])));
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');
  const fld = {display:'flex',flexDirection:'column',gap:5,fontSize:12.5,fontWeight:800,color:'#33415C'};
  const inp = {fontFamily:'inherit',fontSize:13.5,fontWeight:600,border:'1.5px solid #D6DEEA',borderRadius:10,padding:'9px 11px',color:'#222',background:'#fff'};
  const vals = Object.values(fate);
  const n = {
    grad: vals.filter(v => v === 'grad').length,
    fail: vals.filter(v => v === 'fail' || v.startsWith('failmove:')).length,
    keep: vals.filter(v => v === 'keep').length,
    move: vals.filter(v => v.startsWith('move:') || v.startsWith('failmove:')).length,
  };
  const anyFail = n.fail > 0;
  const go = async () => {
    setBusy(true); setErr('');
    const keep = [], moves = {}, failed = [];
    Object.entries(fate).forEach(([sid, v]) => {
      if (v === 'keep') keep.push(sid);
      else if (v === 'fail') failed.push(sid);
      else if (v.startsWith('failmove:')) { failed.push(sid); moves[sid] = v.slice(9); }
      else if (v.startsWith('move:')) moves[sid] = v.slice(5);
    });
    const r = await G.finishGroup(groupId, { label, date, msg: msg.trim(), msgFail: msgFail.trim(), keep, moves, failed });
    setBusy(false);
    if (!r.ok) { setErr(r.error || 'No se pudo guardar.'); return; }
    if (r.fails && r.fails.length) alert('No se pudo mover a: ' + r.fails.join(', ') + '. Muévelos desde Gestionar alumnos.');
    onDone();
  };
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(13,27,90,.42)',zIndex:1000,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'32px 14px',overflow:'auto'}}>
      <div onClick={e => e.stopPropagation()} style={{background:'#fff',borderRadius:18,width:'100%',maxWidth:640,padding:20,display:'flex',flexDirection:'column',gap:13}}>
        <h3 style={{fontFamily:GRD_FONT_T,fontWeight:600,fontSize:19,color:'#0D1B5A',display:'flex',gap:10,alignItems:'center',margin:0}}><GrdMedal size={26} />Finalizar grupo · {group.name}</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:10}}>
          <label style={fld}>¿Qué terminaron?<select value={label} onChange={e => setLabel(e.target.value)} style={inp}>{labels.map(l => <option key={l}>{l}</option>)}</select></label>
          <label style={fld}>Fecha de cierre<input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} /></label>
        </div>
        <label style={fld}>Mensaje para los que aprobaron (lo verán al entrar)<textarea value={msg} onChange={e => setMsg(e.target.value)} style={{...inp,minHeight:62,resize:'vertical'}}></textarea></label>
        {anyFail && <label style={fld}>Mensaje para los que reprobaron<textarea value={msgFail} onChange={e => setMsgFail(e.target.value)} style={{...inp,minHeight:62,resize:'vertical'}}></textarea></label>}
        <div style={fld}>¿Qué pasa con cada alumno?
          <div style={{display:'flex',flexDirection:'column',gap:4,border:'1px solid #E8E5DC',borderRadius:12,padding:8,maxHeight:260,overflow:'auto'}}>
            {members.map(s => (
              <div key={s.id} style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,220px)',gap:8,alignItems:'center',fontSize:13,fontWeight:700,padding:'3px 4px'}}>
                <span>{s.fullName}</span>
                <select value={fate[s.id]} onChange={e => setFate(f => ({ ...f, [s.id]: e.target.value }))} style={{...inp,fontSize:12,padding:6}}>
                  <optgroup label="Aprobó">
                    <option value="grad">🎓 Aprobó · egresa (vista de cierre)</option>
                    {others.map(g => <option key={g.id} value={'move:' + g.id}>➡️ Aprobó · pasa a {(D.LEVELS[g.level] || {}).code} · {g.name}</option>)}
                  </optgroup>
                  <optgroup label="Reprobó">
                    <option value="fail">❌ Reprobó · sin grupo nuevo (mensaje para comunicarse)</option>
                    {others.map(g => <option key={g.id} value={'failmove:' + g.id}>🔁 Reprobó · se integra a {(D.LEVELS[g.level] || {}).code} · {g.name}</option>)}
                  </optgroup>
                  <optgroup label="Otro">
                    <option value="keep">⏳ Sigue activo (recuperación pendiente)</option>
                  </optgroup>
                </select>
              </div>
            ))}
            {!members.length && <div style={{fontSize:13,color:'#888',padding:6}}>Este grupo no tiene alumnos.</div>}
          </div>
          <span style={{fontWeight:700,color:'#667'}}>🎓 {n.grad} egresan · ❌ {n.fail} reprobaron · ⏳ {n.keep} siguen activos · ➡️ {n.move} pasan a otro grupo (misma cuenta, conservan su avance)</span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:10}}>
          <div style={{borderRadius:12,padding:'10px 12px',fontSize:12.5,lineHeight:1.5,background:'#E8F5E9',color:'#1B5E20'}}><b style={{display:'block',fontSize:11,letterSpacing:'.08em',textTransform:'uppercase'}}>Se conserva</b>Práctica, notas, exámenes, XP, boletín y evaluaciones. Misma cuenta y contraseña.</div>
          <div style={{borderRadius:12,padding:'10px 12px',fontSize:12.5,lineHeight:1.5,background:'#FFEBEE',color:'#8E1B1B'}}><b style={{display:'block',fontSize:11,letterSpacing:'.08em',textTransform:'uppercase'}}>Se apaga para egresados</b>Materiales, Mi práctica, Tareas, Examen, Foro, Hablemos y alarmas. Es reversible con ↩ Reabrir.</div>
        </div>
        {err && <div style={{color:'#C62828',fontWeight:800,fontSize:13}}>⚠ {err}</div>}
        <div style={{display:'flex',gap:8,justifyContent:'flex-end',flexWrap:'wrap'}}>
          <button className="btn-settings" onClick={onClose}>Cancelar</button>
          <button disabled={busy} onClick={go} style={{minHeight:40,borderRadius:10,border:0,background:'#B8860B',color:'#fff',fontFamily:'inherit',fontWeight:800,fontSize:13.5,padding:'0 16px',cursor:'pointer',opacity:busy ? .6 : 1}}>{busy ? 'Guardando…' : '🎓 Finalizar grupo'}</button>
        </div>
      </div>
    </div>
  );
}

function FinishedGroupBanner({ group, onChanged }) {
  const G = window.JUCUM_GRAD;
  const [busy, setBusy] = React.useState(false);
  const reopen = async () => {
    if (!window.confirm('¿Reabrir el grupo? Vuelve a Activos y sus alumnos recuperan todas las herramientas.')) return;
    setBusy(true); const r = await G.reopenGroup(group.id); setBusy(false);
    if (!r.ok) { alert(r.error || 'No se pudo reabrir.'); return; }
    onChanged && onChanged();
  };
  const kept = G.keepList(group).length;
  const failN = G.failedList(group).filter(id => (window.JUCUM_DATA.STUDENTS || []).some(s => s.id === id && s.group === group.id)).length;
  return (
    <div style={{display:'flex',gap:12,alignItems:'center',background:GRD_GOLD.bg,border:`1.5px solid ${GRD_GOLD.bd}`,borderRadius:14,padding:'12px 14px',flexWrap:'wrap',margin:'0 0 14px'}}>
      <GrdMedal size={34} />
      <div style={{flex:1,minWidth:220,fontSize:13,color:GRD_GOLD.deep,lineHeight:1.45}}>
        <b style={{display:'block',fontFamily:GRD_FONT_T,fontSize:16,color:GRD_GOLD.ink}}>Grupo finalizado · {group.finishedLabel || 'Etapa completada'}</b>
        Cerró el {G.fmtDate(group.finishedAt)}. Sus alumnos ven la pantalla de cierre{kept ? ` (menos ${kept} que siguen activos)` : ''}{failN ? ` · ${failN} reprobaron y ven el mensaje para volver a intentarlo` : ''}. El historial queda para consultar.
      </div>
      <button className="btn-settings" disabled={busy} onClick={reopen}>↩ Reabrir grupo</button>
    </div>
  );
}

function GradLeads({ onBack }) {
  const G = window.JUCUM_GRAD, D = window.JUCUM_DATA;
  const [rows, setRows] = React.useState(null);
  const [err, setErr] = React.useState('');
  const [tab, setTab] = React.useState('pend');
  const load = () => G.loadAllSurveys().then(r => { setRows(r.rows); setErr(r.ok ? '' : r.error); });
  React.useEffect(() => { load(); }, []);
  const isLead = r => r.wants === 'si' || r.wants === 'tal_vez';
  const all = rows || [];
  const pend = all.filter(r => isLead(r) && (r.status === 'nuevo' || r.status === 'contactado'));
  const ins = all.filter(r => r.status === 'inscrito');
  const list = tab === 'pend' ? pend : tab === 'ins' ? ins : all;
  const setSt = async (r, s) => { setRows(rs => rs.map(x => x.id === r.id ? { ...x, status: s } : x)); const res = await G.setLeadStatus(r.id, s); if (!res.ok) { alert(res.error || 'No se pudo guardar'); load(); } };
  const phoneOf = r => { const s = D.STUDENTS.find(x => x.id === r.student_id); const p = String((s && s.phone) || '').replace(/\D/g, ''); return p ? (p.length === 9 ? '51' + p : p) : ''; };
  const csv = () => {
    const H = ['Alumno','Grupo','Terminó','Resultado','Opinión (1-5)','Le gustó','Mejorar','¿Continuar?','Horario','Estado','Respondió'];
    const esc = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const lines = [H.map(esc).join(';')].concat(list.map(r => [r.student_name, r.group_name, r.finished_label, r.result === 'reprobo' ? 'Reprobó' : r.result === 'cerrado' ? 'Avance cerrado' : 'Aprobó', r.rating, (r.liked || []).join(', '), r.improve, r.wants, (r.schedule || []).join(', '), r.status, String(r.updated_at || '').slice(0, 10)].map(esc).join(';')));
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + lines.join('\n')], { type:'text/csv;charset=utf-8' }));
    a.download = 'interesados-en-continuar.csv'; a.click();
  };
  const segBtn = (k, t, c) => <button key={k} type="button" onClick={() => setTab(k)} style={{border:0,background:tab === k ? '#fff' : 'none',boxShadow:tab === k ? '0 1px 3px rgba(0,0,0,.12)' : 'none',fontFamily:'inherit',fontWeight:800,fontSize:12.5,padding:'7px 12px',borderRadius:8,color:tab === k ? '#1F3A8A' : '#555',cursor:'pointer'}}>{t}{c != null ? ` (${c})` : ''}</button>;
  const th = {textAlign:'left',fontSize:11,letterSpacing:'.06em',textTransform:'uppercase',color:'#5A6B86',background:'#F4F7FB',padding:'9px 10px'};
  const td = {padding:10,borderTop:'1px solid #EEF0F4',verticalAlign:'top',fontSize:13};
  return (
    <main className="main">
      <button className="back-btn" onClick={onBack}>← Volver a grupos</button>
      <div className="welcome group">
        <div className="welcome-text">
          <div className="eyebrow">🙋 De todos los grupos finalizados</div>
          <h1>Interesados en continuar</h1>
          <p>Egresados que respondieron "Sí" o "Tal vez" en la encuesta de cierre. Márcalos a medida que los contactas.</p>
        </div>
        <button className="btn-settings" onClick={csv}>📥 Descargar lista (Excel)</button>
      </div>
      <div style={{display:'flex',background:'#ECEFF4',borderRadius:10,padding:3,gap:2,width:'max-content',maxWidth:'100%',flexWrap:'wrap',margin:'12px 0'}}>
        {segBtn('pend', 'Pendientes', pend.length)}{segBtn('ins', 'Inscritos', ins.length)}{segBtn('all', 'Todas las opiniones', all.length)}
      </div>
      {err && <div className="empty-state">⚠ {err}</div>}
      {rows === null ? <div className="empty-state">Cargando…</div> : !list.length ? <div className="empty-state">{tab === 'pend' ? 'Aún no hay interesados pendientes.' : 'Sin registros aquí.'}</div> : (
        <div style={{overflowX:'auto',background:'#fff',borderRadius:12,border:'1px solid #E1E6EE'}}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:760}}>
            <thead><tr><th style={th}>Alumno</th><th style={th}>Terminó</th><th style={th}>Opinión</th><th style={th}>¿Continuar?</th><th style={th}>Horario</th><th style={th}>Estado</th><th style={th}></th></tr></thead>
            <tbody>{list.map(r => {
              const ph = phoneOf(r);
              return (
                <tr key={r.id}>
                  <td style={td}><b>{r.student_name}</b><div style={{color:'#8A94A6',fontSize:11.5,fontWeight:600}}>{r.group_name}</div>{r.result === 'reprobo' && <span style={{display:'inline-block',marginTop:4,fontSize:10.5,fontWeight:800,borderRadius:10,padding:'2px 8px',background:'#FFEBEE',color:'#8E1B1B'}}>❌ Reprobó · repetir nivel</span>}{r.result === 'cerrado' && <span style={{display:'inline-block',marginTop:4,fontSize:10.5,fontWeight:800,borderRadius:10,padding:'2px 8px',background:'#E4EDFB',color:'#1F3A8A'}}>⏸ {r.finished_label || 'Avance cerrado'}</span>}</td>
                  <td style={td}>{r.finished_label}<div style={{color:'#8A94A6',fontSize:11.5,fontWeight:600}}>respondió el {G.fmtDate(r.updated_at)}</div></td>
                  <td style={td}><span style={{fontSize:18}}>{(GRD_FACES[(r.rating || 0) - 1] || [''])[0]}</span><div style={{color:'#667',fontSize:11.5,fontWeight:600,maxWidth:220}}>{(r.liked || []).join(', ')}{r.improve ? <><br />💡 {r.improve}</> : null}</div></td>
                  <td style={td}><span style={{fontSize:11.5,fontWeight:800,borderRadius:12,padding:'3px 9px',background:r.wants === 'si' ? '#E8F5E9' : r.wants === 'tal_vez' ? '#FFF3E0' : '#F1F3F6',color:r.wants === 'si' ? '#1B5E20' : r.wants === 'tal_vez' ? '#8A4B00' : '#667'}}>{r.wants === 'si' ? '✅ Sí' : r.wants === 'tal_vez' ? '🤔 Tal vez' : '⏸️ No'}</span></td>
                  <td style={td}>{(r.schedule || []).join(', ') || '—'}</td>
                  <td style={td}><select value={r.status || 'nuevo'} onChange={e => setSt(r, e.target.value)} style={{fontFamily:'inherit',fontSize:12,fontWeight:800,border:'1.5px solid #D6DEEA',borderRadius:8,padding:5}}>{GRD_STATUS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></td>
                  <td style={td}>{ph ? <a href={`https://wa.me/${ph}?text=${encodeURIComponent('Hola ' + String(r.student_name || '').split(' ')[0] + ', te escribimos de JUCUM English Center por los nuevos horarios 😊')}`} target="_blank" rel="noopener" title="Escribirle por WhatsApp" className="btn-settings" style={{textDecoration:'none'}}>💬</a> : null}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
      <p style={{fontSize:12,color:'#667',marginTop:10}}>🔔 Cada respuesta "Sí" o "Tal vez" también te llega a la campanita.</p>
    </main>
  );
}

/* ─────────── 🏅 Insignias (A1/A2 · 29-sep) ─────────── */
function BadgeMedal({ emoji, size = 52, off }) {
  if (off) return <span style={{width:size,height:size,borderRadius:'50%',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:Math.round(size*.42),background:'#F1F3F6',border:'2.5px dashed #C9D2E0',filter:'grayscale(1)',opacity:.55,flexShrink:0}}>{emoji || '⭐'}</span>;
  return <span style={{width:size,height:size,borderRadius:'50%',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:Math.round(size*.42),background:'radial-gradient(circle at 35% 30%,#FFF0B8,#E0AE1E 60%,#B8860B)',border:`${size > 70 ? 4 : 2.5}px solid #A67C00`,flexShrink:0}}>{emoji || '⭐'}</span>;
}
function BadgeShelf({ student, title, only }) {
  const B = window.JUCUM_BADGES;
  if (!B || !B.enabledFor(student)) return null;
  const all = B.list(student);
  if (!all.length) return null;
  const list = only === 'earned' ? all.filter(b => b.earned) : only === 'missing' ? all.filter(b => !b.earned) : all;
  const n = all.filter(b => b.earned).length;
  const lv = (window.JUCUM_DATA.LEVELS[student.level] || {}).code || '';
  const fmt = d => { try { return d ? new Date(String(d).slice(0, 10) + 'T12:00:00Z').toLocaleDateString('es-PE', { month:'short', year:'numeric', timeZone:'UTC' }) : ''; } catch (e) { return ''; } };
  return (
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <div style={{fontFamily:GRD_FONT_T,fontWeight:600,fontSize:16,color:'#0D1B5A',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>{title || '🏅 Mis insignias'}{!only && <span style={{fontSize:12,color:'#8A94A6',fontWeight:700,fontFamily:'Nunito,sans-serif'}}>{n} de {all.length} · {lv}</span>}</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(96px,1fr))',gap:8}}>
        {list.map(b => (
          <div key={b.mod.id} title={b.earned ? `Aprobado${b.score != null ? ' con ' + b.score : ''}` : 'Por conseguir'} style={{borderRadius:14,padding:'12px 6px 10px',textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:6,border:`1px solid ${b.earned ? '#E9D9A6' : '#E8E5DC'}`,background:b.earned ? '#FFFCF3' : '#FAFBFD'}}>
            <BadgeMedal emoji={b.mod.emoji} off={!b.earned} />
            <b style={{fontSize:11.5,color:'#0D1B5A',lineHeight:1.2}}>{b.mod.name}</b>
            <span style={{fontSize:10,color:b.earned ? '#9A7400' : '#8A94A6',fontWeight:700}}>M{b.index + 1}{b.earned ? (b.score != null ? ' · ' + b.score : '') + (b.date ? ' · ' + fmt(b.date) : '') : ' · por conseguir'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
/* Celebra, una tras otra, las insignias ganadas que este equipo aún no mostró */
function BadgeCelebration({ student, onDone }) {
  const B = window.JUCUM_BADGES;
  const [queue, setQueue] = React.useState(() => { try { return B ? B.pending(student) : []; } catch (e) { return []; } });
  React.useEffect(() => { if (!queue.length && onDone) onDone(); }, [queue.length]);
  if (!queue.length) return null;
  const b = queue[0];
  const next = () => { try { B.celebrated(student, b); } catch (e) {} setQueue(q => q.slice(1)); };
  const more = queue.length - 1;
  return (
    <div className="modal-backdrop" style={{zIndex:1200}} onClick={next}>
      <div onClick={e => e.stopPropagation()} style={{background:'#fff',borderRadius:22,padding:'26px 20px 20px',width:'min(92vw,380px)',textAlign:'center',display:'flex',flexDirection:'column',gap:10,alignItems:'center',boxShadow:'0 20px 50px rgba(0,0,0,.3)'}}>
        <BadgeMedal emoji={b.mod.emoji} size={100} />
        <div style={{fontSize:11,fontWeight:800,letterSpacing:'.14em',textTransform:'uppercase',color:'#9A7400'}}>Módulo conseguido</div>
        <h3 style={{fontFamily:GRD_FONT_T,fontWeight:600,fontSize:22,color:'#0D1B5A',margin:0}}>¡Conseguiste {b.mod.name}!</h3>
        <p style={{fontSize:13.5,color:'#555',lineHeight:1.5,margin:0}}>{b.via === 'exam' ? <>Aprobaste el examen del Módulo <b>{b.index + 1}</b>{b.score != null ? <> con <b>{b.score}</b></> : null}.</> : <>Completaste todo el Módulo <b>{b.index + 1}</b>.</>} Esta insignia queda en tu ruta para siempre.</p>
        <button type="button" onClick={next} style={{width:'100%',minHeight:46,borderRadius:23,border:0,background:'#1F3A8A',color:'#fff',fontFamily:'inherit',fontWeight:800,fontSize:14.5,cursor:'pointer'}}>{more ? `Ver la siguiente (${more} más) →` : '¡Vamos por el siguiente! →'}</button>
      </div>
    </div>
  );
}

/* ⏸ Alumno con avance cerrado → “Mi recorrido” */
function JourneyHome({ student, level, first, card, qi, setQi, thanks, survey, onSurvey }) {
  const G = window.JUCUM_GRAD, B = window.JUCUM_BADGES, D = window.JUCUM_DATA;
  const mods = D.MODULE_CATALOG[student.level] || [];
  const ci = mods.findIndex(m => m.id === student.closedModule);
  const all = (B && B.enabledFor(student)) ? B.list(student) : mods.map((m, i) => ({ mod: m, index: i, earned: ci >= 0 && i <= ci }));
  const got = all.filter(b => b.earned).length;
  const nextIdx = (() => { const f = all.findIndex(b => !b.earned); return f >= 0 ? f : -1; })();
  const nextName = nextIdx >= 0 ? `Módulo ${nextIdx + 1}` : '';
  const msg = student.closedMsg || 'Gracias por ser parte de JUCUM. Tu avance quedó guardado: cuando quieras retomar, escríbenos y te contamos los horarios del siguiente módulo.';
  const lastDone = got ? `Módulo ${all.filter(b => b.earned).slice(-1)[0].index + 1}` : '';
  const waText = `Hola, soy ${student.fullName}. Llevé ${lastDone ? 'hasta el ' + lastDone : 'parte'} de ${level.code} y quiero retomar${nextName ? ' en el ' + nextName : ''}.`;
  const Shelf = ({ list }) => (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(96px,1fr))',gap:8}}>
      {list.map(b => (
        <div key={b.mod.id} style={{borderRadius:14,padding:'12px 6px 10px',textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:6,border:`1px solid ${b.earned ? '#E9D9A6' : '#E8E5DC'}`,background:b.earned ? '#FFFCF3' : '#FAFBFD'}}>
          <BadgeMedal emoji={b.mod.emoji} off={!b.earned} />
          <b style={{fontSize:11.5,color:'#0D1B5A',lineHeight:1.2}}>{b.mod.name}</b>
          <span style={{fontSize:10,color:b.earned ? '#9A7400' : '#8A94A6',fontWeight:700}}>M{b.index + 1}{b.earned && b.score != null ? ' · ' + b.score : ''}</span>
        </div>
      ))}
    </div>
  );
  const h3 = {fontFamily:GRD_FONT_T,fontWeight:600,fontSize:16,color:'#0D1B5A',margin:0};
  return (
    <main className="main" style={{maxWidth:980,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,340px),1fr))',gap:16,alignItems:'start'}}>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <div style={{...card,textAlign:'center',display:'flex',flexDirection:'column',gap:8,alignItems:'center',padding:'20px 16px'}}>
          <div style={{fontSize:11,fontWeight:800,letterSpacing:'.14em',textTransform:'uppercase',color:level.dark}}>Mi recorrido · {level.code}</div>
          <h1 style={{fontFamily:GRD_FONT_T,fontWeight:600,fontSize:25,color:'#0D1B5A',lineHeight:1.15,margin:0}}>¡Buen camino, {first}!</h1>
          <p style={{fontSize:14,color:'#4A5468',lineHeight:1.5,margin:0,textWrap:'pretty'}}>Conseguiste <b>{got} de {all.length}</b> módulos del nivel {level.code}.{all.length - got > 0 ? ` Te falta${all.length - got === 1 ? '' : 'n'} ${all.length - got} para completar el nivel.` : ' ¡Completaste el nivel!'}</p>
        </div>
        <div style={{...card,display:'flex',flexDirection:'column',gap:10}}>
          {got > 0 && <><h3 style={h3}>🏅 Módulos conseguidos</h3><Shelf list={all.filter(b => b.earned)} /></>}
          {all.length - got > 0 && <><h3 style={{...h3,marginTop:got ? 4 : 0}}>🧭 Te faltan</h3><Shelf list={all.filter(b => !b.earned)} /></>}
        </div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <div style={{background:'#0D1B5A',color:'#fff',borderRadius:16,padding:16,display:'flex',flexDirection:'column',gap:8}}>
          <div style={{fontFamily:GRD_FONT_T,fontWeight:500,fontSize:19,lineHeight:1.3}}>“{G.QUOTES[qi][0]}”</div>
          <div style={{fontSize:13.5,color:'#D6E0FF',lineHeight:1.45}}>{G.QUOTES[qi][1]}{nextIdx >= 0 ? ' Tu siguiente insignia te está esperando.' : ''}</div>
          <button type="button" onClick={() => setQi(i => (i + 1) % G.QUOTES.length)} style={{alignSelf:'flex-end',border:'1px solid rgba(255,255,255,.35)',background:'none',color:'#fff',fontFamily:'inherit',fontWeight:800,fontSize:11.5,borderRadius:14,padding:'5px 11px',cursor:'pointer'}}>Otra frase ↻</button>
        </div>
        <div style={{...card,display:'flex',flexDirection:'column',gap:10}}>
          <h3 style={{...h3,fontSize:18}}>{nextName ? `¿Retomamos en el ${nextName}?` : '¿Seguimos aprendiendo?'}</h3>
          <p style={{fontSize:13.5,color:'#555',lineHeight:1.5,margin:0,textWrap:'pretty'}}>{msg}</p>
          <a href={G.waLink(waText)} target="_blank" rel="noopener" style={{minHeight:48,borderRadius:24,background:'#1E8E4E',color:'#fff',fontWeight:800,fontSize:14.5,display:'flex',alignItems:'center',justifyContent:'center',gap:8,textDecoration:'none'}}>💬 Quiero retomar · {G.CONTACT.phoneLabel}</a>
          <div style={{display:'flex',gap:10,alignItems:'flex-start',background:'#F4F7FB',borderRadius:12,padding:'10px 12px',fontSize:13,color:'#33415C',lineHeight:1.45}}>
            <span style={{fontSize:16}}>📍</span>
            <div><b style={{display:'block',color:'#0D1B5A'}}>Atención presencial</b>{G.CONTACT.address} · <a href={G.CONTACT.mapUrl} target="_blank" rel="noopener" style={{color:'#1F3A8A',fontWeight:800}}>Ver en el mapa</a></div>
          </div>
        </div>
        {thanks && <div style={{background:'#E8F5E9',border:'1px solid #A5D6A7',borderRadius:14,padding:12,fontSize:13.5,color:'#1B5E20',lineHeight:1.45}}><b>¡Gracias, {first}!</b> Recibimos tu opinión.{survey && (survey.wants === 'si' || survey.wants === 'tal_vez') ? ' Te escribiremos con los horarios disponibles.' : ''}</div>}
        <button type="button" onClick={onSurvey} style={{minHeight:46,borderRadius:23,border:`1.5px solid ${GRD_GOLD.bd}`,background:'#FFF8E1',color:GRD_GOLD.ink,fontFamily:'inherit',fontWeight:800,fontSize:14,cursor:'pointer'}}>{survey ? '✏️ Editar mi opinión' : '⭐ Cuéntanos tu experiencia'}</button>
      </div>
    </main>
  );
}

/* ─── Profesor · ⏸ cerrar avance (por alumno) ─── */
function CloseProgressModal({ student, onClose, onDone }) {
  const D = window.JUCUM_DATA, G = window.JUCUM_GRAD, B = window.JUCUM_BADGES;
  const mods = D.MODULE_CATALOG[student.level] || [];
  const earned = B ? B.earnedIds(student) : [];
  const lastEarned = mods.map(m => m.id).filter(id => earned.includes(id)).slice(-1)[0];
  const [mod, setMod] = React.useState(lastEarned || (mods[0] && mods[0].id) || '');
  const [reason, setReason] = React.useState('No se inscribió al siguiente módulo');
  const [msg, setMsg] = React.useState('Gracias por ser parte de JUCUM. Tu avance quedó guardado: cuando quieras retomar, escríbenos y te contamos los horarios del siguiente módulo.');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');
  const fld = {display:'flex',flexDirection:'column',gap:5,fontSize:12.5,fontWeight:800,color:'#33415C'};
  const inp = {fontFamily:'inherit',fontSize:13.5,fontWeight:600,border:'1.5px solid #D6DEEA',borderRadius:10,padding:'9px 11px',color:'#222',background:'#fff'};
  const go = async () => {
    setBusy(true); setErr('');
    const r = await G.closeStudent(student.id, { moduleId: mod, reason, msg: msg.trim() });
    setBusy(false);
    if (!r.ok) { setErr(r.error || 'No se pudo guardar.'); return; }
    onDone();
  };
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(13,27,90,.42)',zIndex:1000,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'32px 14px',overflow:'auto'}}>
      <div onClick={e => e.stopPropagation()} style={{background:'#fff',borderRadius:18,width:'100%',maxWidth:540,padding:20,display:'flex',flexDirection:'column',gap:12}}>
        <h3 style={{fontFamily:GRD_FONT_T,fontWeight:600,fontSize:19,color:'#0D1B5A',margin:0}}>⏸ Cerrar avance · {student.fullName}</h3>
        <label style={fld}>Último módulo que llevó<select value={mod} onChange={e => setMod(e.target.value)} style={inp}>{mods.map((m, i) => <option key={m.id} value={m.id}>M{i + 1} · {m.name}{earned.includes(m.id) ? ' (🏅 conseguido)' : ''}</option>)}</select></label>
        <label style={fld}>Motivo (solo lo ves tú)<select value={reason} onChange={e => setReason(e.target.value)} style={inp}>{['No se inscribió al siguiente módulo','Se retiró del programa','Cambio de horario / viaje','Otro'].map(x => <option key={x}>{x}</option>)}</select></label>
        <label style={fld}>Mensaje para el alumno<textarea value={msg} onChange={e => setMsg(e.target.value)} style={{...inp,minHeight:62,resize:'vertical'}}></textarea></label>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:10}}>
          <div style={{borderRadius:12,padding:'10px 12px',fontSize:12.5,lineHeight:1.5,background:'#E8F5E9',color:'#1B5E20'}}><b style={{display:'block',fontSize:11,letterSpacing:'.08em',textTransform:'uppercase'}}>Se conserva</b>Insignias, notas, práctica, boletín. Misma cuenta y contraseña.</div>
          <div style={{borderRadius:12,padding:'10px 12px',fontSize:12.5,lineHeight:1.5,background:'#FFEBEE',color:'#8E1B1B'}}><b style={{display:'block',fontSize:11,letterSpacing:'.08em',textTransform:'uppercase'}}>Se apaga</b>Materiales, Mi práctica, Tareas, Examen, Foro, Hablemos y alarmas. Reversible con ↩ Reabrir.</div>
        </div>
        {err && <div style={{color:'#C62828',fontWeight:800,fontSize:13}}>⚠ {err}</div>}
        <div style={{display:'flex',gap:8,justifyContent:'flex-end',flexWrap:'wrap'}}>
          <button className="btn-settings" onClick={onClose}>Cancelar</button>
          <button disabled={busy} onClick={go} style={{minHeight:40,borderRadius:10,border:0,background:'#4A5468',color:'#fff',fontFamily:'inherit',fontWeight:800,fontSize:13.5,padding:'0 16px',cursor:'pointer',opacity:busy ? .6 : 1}}>{busy ? 'Guardando…' : '⏸ Cerrar avance'}</button>
        </div>
      </div>
    </div>
  );
}
/* Sugerencias (nunca cierra solo): aprobó algún módulo, NO el último activo del grupo, y lleva ≥14 días sin practicar */
function closeSuggestions(members, group) {
  const D = window.JUCUM_DATA, B = window.JUCUM_BADGES;
  if (!B || !group || !(group.level === 'a1' || group.level === 'a2')) return [];
  const st = D.getGroupSettings(group.id) || {};
  const act = (st.activeModuleIds && st.activeModuleIds.length) ? st.activeModuleIds : (st.activeModuleId ? [st.activeModuleId] : []);
  const cur = act[act.length - 1];
  return members.filter(s => !s.closedAt && (s.lastActiveDays == null ? false : s.lastActiveDays >= 14)).filter(s => {
    const e = B.earnedIds(s); return e.length > 0 && (!cur || !e.includes(cur));
  });
}
function ClosedStudentsList({ list, onChanged, onOpen }) {
  const G = window.JUCUM_GRAD, D = window.JUCUM_DATA;
  const [busy, setBusy] = React.useState('');
  if (!list.length) return null;
  const reopen = async (s) => {
    if (!window.confirm(`¿Reabrir el avance de ${s.fullName}? Vuelve a tener todas las herramientas.`)) return;
    setBusy(s.id); const r = await G.reopenStudent(s.id); setBusy('');
    if (!r.ok) { alert(r.error || 'No se pudo reabrir.'); return; }
    onChanged && onChanged();
  };
  return (
    <div style={{marginTop:16,background:'#F7F8FA',border:'1px solid #E1E6EE',borderRadius:12,padding:12,display:'flex',flexDirection:'column',gap:8}}>
      <div style={{fontWeight:800,fontSize:13,color:'#4A5468'}}>⏸ Avance cerrado ({list.length}) · no cuentan en la Clase en vivo, alarmas, dominio ni campeones del grupo</div>
      {list.map(s => {
        const mods = D.MODULE_CATALOG[s.level] || [];
        const i = mods.findIndex(m => m.id === s.closedModule);
        return (
          <div key={s.id} style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',background:'#fff',border:'1px solid #E8E5DC',borderRadius:10,padding:'8px 10px',fontSize:13}}>
            <b style={{color:'#667',flex:1,minWidth:140}}>{s.fullName}</b>
            <span style={{fontSize:11,fontWeight:800,borderRadius:12,padding:'3px 9px',background:'#ECEFF4',color:'#4A5468'}}>⏸ {i >= 0 ? 'Hasta M' + (i + 1) : 'Cerrado'} · {window.JUCUM_GRAD.fmtDate(s.closedAt)}{s.closedReason ? ' · ' + s.closedReason : ''}</span>
            <button className="btn-settings" onClick={() => onOpen && onOpen(s.id)}>Ver ficha</button>
            <button className="btn-settings" disabled={busy === s.id} onClick={() => reopen(s)}>↩ Reabrir</button>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { StudentGraduated, ExitSurveyForm, FinishGroupModal, FinishedGroupBanner, GradLeads, grdStatusFor, GrdMedal, BadgeMedal, BadgeShelf, BadgeCelebration, JourneyHome, CloseProgressModal, closeSuggestions, ClosedStudentsList });
