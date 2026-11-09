/* Bloque F · Forum UI */

const { useState: fUseState, useEffect: fUseEffect } = React;

/* Reacciones disponibles (1 por usuario; elegir otra la reemplaza) */
const F_REACTS = ['👍','❤️','😂','😮','🎉'];

/* 💬 FORO-COMPACTO-V1 + 📢 FORO-AVISOS-V1 (09-nov-2026, aprobados en «Propuesta - Foro avisos y comentarios», opción A) */
const F_TOUCH = (() => { try { return window.matchMedia('(hover: none)').matches; } catch (e) { return false; } })();
(function fCss() {
  if (document.getElementById('jforum-css')) return;
  const st = document.createElement('style'); st.id = 'jforum-css';
  st.textContent = '.fcr{display:flex;gap:8px;padding:5px 6px;border-radius:9px;align-items:flex-start;position:relative}.fcr:hover,.fcr.on{background:#F7F4EC}.fcr.kid{margin-left:30px}'
    + '.fcr .fpost-ava{width:24px;height:24px;min-width:24px;font-size:9px;margin-top:1px}.fcr .fpost-ava.t{font-size:13px}'
    + '.fcr-tx{flex:1;min-width:0;font-size:13px;line-height:1.4;white-space:pre-wrap;word-break:break-word}.fcr-tx b{font-weight:900;margin-right:5px}.fcr-tx b.t{color:#1F3A8A}'
    + '.fcr-to{font-size:11px;font-weight:800;color:#7B5CC8;margin-right:4px;white-space:nowrap}.fcr-tm{font-size:10.5px;color:#9a917e;font-weight:800;margin-left:6px;white-space:nowrap}'
    + '.fcr-hv{display:none;gap:4px;position:absolute;right:6px;top:3px;background:#F7F4EC;padding-left:6px}.fcr:hover .fcr-hv,.fcr.on .fcr-hv{display:flex}'
    + '.fcr-hv button{border:1px solid #E3DCC9;background:#fff;border-radius:7px;font-family:inherit;font-size:11px;font-weight:800;color:#1F3A8A;padding:2px 7px;cursor:pointer;white-space:nowrap}.fcr-hv button.del{color:#C0392B}'
    + '.fsum{display:inline-flex;align-items:center;gap:8px}.fsum-st{display:inline-flex}.fsum-st span{width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#90CAF9,#1565C0);border:2px solid #fff;margin-left:-7px;color:#fff;font-size:8px;font-weight:900;display:inline-flex;align-items:center;justify-content:center}.fsum-st span:first-child{margin-left:0}.fsum-st span.t{background:linear-gradient(135deg,#3F5BB8,#0D1B5A);font-size:11px}'
    + '.fmore{border:none;background:none;color:#1F3A8A;font-family:inherit;font-weight:900;font-size:12.5px;cursor:pointer;padding:5px 6px;text-align:left}'
    + '.fpost.fann{border:1.5px solid #F2B8AE;border-left:6px solid #E11930;background:#FFF8F6}.fann-tag{font-size:10.5px;font-weight:900;color:#B23A2A;background:#FDECEA;border-radius:8px;padding:2px 8px;white-space:nowrap}'
    + '.fann-rd{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:12px;font-weight:800;color:#8a6a60;margin-top:6px}.fann-rd button{border:1.5px solid #E3DCC9;background:#fff;border-radius:9px;padding:4px 9px;font-family:inherit;font-size:11.5px;font-weight:800;cursor:pointer;white-space:nowrap}.fann-rd button.go{background:#E11930;border-color:#E11930;color:#fff}.fann-rd button:disabled{opacity:.6;cursor:default}'
    + '.fkind{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}.fkind button{border:1.5px solid var(--border,#E3DCC9);background:#fff;border-radius:10px;padding:6px 11px;font-family:inherit;font-size:12.5px;font-weight:800;cursor:pointer;white-space:nowrap}.fkind button.on{border-color:#E11930;background:#FDECEA;color:#B23A2A}'
    + '.fann-opt{display:flex;flex-direction:column;gap:7px;background:#FFFBFA;border:1.5px dashed #F2B8AE;border-radius:12px;padding:10px;margin:4px 0 8px;font-size:12.5px;font-weight:800;color:#4A4A4A}.fann-opt label{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.fann-opt input[type=checkbox]{accent-color:#E11930}.fann-opt input[type=date]{border:1.5px solid #E3DCC9;border-radius:8px;padding:4px 7px;font-family:inherit;font-weight:800}'
    + '.fann-gr{display:flex;gap:5px;flex-wrap:wrap}.fann-gr button{border:1.5px solid #E3DCC9;background:#fff;border-radius:14px;padding:4px 10px;font-family:inherit;font-size:11.5px;font-weight:800;color:#555;cursor:pointer;white-space:nowrap}.fann-gr button.on{background:#E11930;border-color:#E11930;color:#fff}';
  document.head.appendChild(st);
})();
const F_DOW = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'], F_MON = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fDayLbl = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); if (!m) return ''; const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return F_DOW[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + F_MON[d.getUTCMonth()]; };
const fShortName = (n) => { const w = String(n || '').split(' ').filter(Boolean); return w.length >= 4 ? w[0] + ' ' + w[2] : w.slice(0, 2).join(' '); };
const fIni = (n) => String(n || '?').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();
/* Alumnos activos del grupo (para «Leído por N de M») */
const fRoster = (gid) => (window.JUCUM_DATA.STUDENTS || []).filter(s => s.group === gid && !s.closedAt && !(window.JUCUM_GRAD && window.JUCUM_GRAD.isGraduated && window.JUCUM_GRAD.isGraduated(s.id)));

/* Adjunto de foto/video mostrado en publicaciones y respuestas */
function FMedia({ url, kind, small }) {
  if (!url) return null;
  if (kind === 'video') return <video src={url} controls style={{maxWidth: small ? 220 : 300, width:'100%', borderRadius: 12, display:'block', marginTop: 8}} />;
  return <img src={url} alt="" style={{maxWidth: small ? 220 : 300, borderRadius: 12, display:'block', marginTop: 8}} />;
}

/* Botón “📎 Foto/Video” para los composers (sube a la nube vía JUCUM_MSG) */
function FAttach({ pending, setPending }) {
  const ref = React.useRef(null);
  const [busy, setBusy] = fUseState(false);
  const onFile = async (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    if (!window.JUCUM_MSG || !window.JUCUM_MSG.uploadMedia) { alert('Adjuntos no disponibles todavía en esta versión.'); return; }
    setBusy(true);
    try { const up = await window.JUCUM_MSG.uploadMedia(f); setPending({ ...up, name: f.name }); }
    catch (err) { alert('No se pudo subir el archivo: ' + err.message); }
    setBusy(false); if (ref.current) ref.current.value = '';
  };
  return (<>
    <input ref={ref} type="file" accept="image/*,video/*" style={{display:'none'}} onChange={onFile} />
    <button type="button" className="att-btn" onClick={() => ref.current && ref.current.click()} disabled={busy}>{busy ? '⏳ Subiendo…' : '📎 Foto/Video'}</button>
    {pending && <span style={{display:'inline-flex', alignItems:'center', gap:6, background:'#EAF1FF', border:'1px solid #C6D8F5', borderRadius:9, padding:'4px 9px', fontSize:12, fontWeight:700, color:'#1F3A8A'}}>{pending.kind === 'image' ? '🖼️' : '🎥'} {pending.name}<button type="button" onClick={() => setPending(null)} style={{border:'none', background:'#1F3A8A', color:'#fff', width:16, height:16, borderRadius:'50%', cursor:'pointer', fontSize:9, lineHeight:1}}>✕</button></span>}
  </>);
}

function Forum({ user, groupOverride }) {
  const { STUDENTS, GROUPS, LEVELS } = window.JUCUM_DATA;
  const F = window.JUCUM_FORUM;

  const isTeacher = user.role === 'teacher';
  const [selectedGroup, setSelectedGroup] = fUseState(
    groupOverride || (isTeacher ? GROUPS[0]?.id : STUDENTS.find(s => s.id === user.studentId)?.group)
  );
  const [tick, setTick] = fUseState(0);
  const refresh = () => setTick(t => t + 1);

  fUseEffect(() => {
    const onStorage = (e) => {
      if (e.key && (e.key.startsWith('jucum_forum') || e.key.startsWith('jucum_likes') || e.key.startsWith('jucum_mutes'))) refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const group = GROUPS.find(g => g.id === selectedGroup);

  // Al abrir/cambiar de grupo, marcamos el foro como "visto" (apaga el punto rojo)
  fUseEffect(() => {
    const me = isTeacher ? 'teacher' : user.studentId;
    if (selectedGroup) F.markForumSeen(me, selectedGroup);
  }, [selectedGroup, tick]);
  // 📢 FORO-AVISOS-V1: el teacher baja quién leyó cada aviso; el alumno que abre el foro ya lo vio
  fUseEffect(() => {
    if (!selectedGroup || !F.isAnnActive) return;
    const ids = (F.getGroupForum(selectedGroup).posts || []).filter(F.isAnnActive).map(p => p.id);
    if (!ids.length) return;
    if (isTeacher) { let alive = true; F.loadAnnReads(ids).then(ok => { if (ok && alive) refresh(); }); return () => { alive = false; }; }
    ids.forEach(id => F.markAnnRead(id, user.studentId));
  }, [selectedGroup]);
  // 📊 FORO-ENCUESTAS-V1: votos de las encuestas del grupo (al entrar y cada 30 s con la pestaña visible)
  fUseEffect(() => {
    if (!selectedGroup || !F.isPoll) return;
    let alive = true;
    const go = () => { const ids = (F.getGroupForum(selectedGroup).posts || []).filter(F.isPoll).map(p => p.id); if (ids.length && document.visibilityState === 'visible') F.loadVotes(ids).then(ok => { if (ok && alive) refresh(); }); };
    go(); const iv = setInterval(go, 30000);
    return () => { alive = false; clearInterval(iv); };
  }, [selectedGroup]);

  if (!group) return <main><div className="empty-state">No tienes grupo asignado.</div></main>;

  const level = LEVELS[group.level];
  const forum = F.getGroupForum(selectedGroup);
  const posts = forum.posts || [];
  const annOn = (p) => !!(F.isAnnActive && F.isAnnActive(p));
  const anns = posts.filter(annOn);
  const pinned = posts.filter(p => p.pinned && !annOn(p));
  const others = posts.filter(p => !p.pinned && !annOn(p));

  const muteInfo = (!isTeacher && F.getMuteInfo) ? F.getMuteInfo(user.studentId) : null;

  return (
    <main>
      <div className="welcome" style={{background:`linear-gradient(135deg,${level.color},${level.dark})`}}>
        <div className="welcome-text">
          <div className="eyebrow">{level.emoji} {level.code} · 💬 Foro</div>
          <h1>{group.name}</h1>
          <p>{posts.length} publicación{posts.length === 1 ? '' : 'es'} · {pinned.length} fijada{pinned.length === 1 ? '' : 's'}</p>
        </div>
      </div>

      {isTeacher && GROUPS.length > 1 && (
        <div className="forum-group-picker">
          <span className="settings-label" style={{marginBottom:0,marginRight:8}}>Ver grupo:</span>
          {GROUPS.map(g => (
            <button key={g.id} className={`preset ${selectedGroup === g.id ? 'on' : ''}`} onClick={() => setSelectedGroup(g.id)}>
              {LEVELS[g.level].emoji} {g.name}
            </button>
          ))}
        </div>
      )}

      <NewPostBox user={user} groupId={selectedGroup} onPost={refresh} muted={muteInfo} />

      {anns.length > 0 && (
        <div className="forum-section">
          <div className="forum-section-h">📢 Avisos del teacher</div>
          {anns.map(p => (
            <PostCard key={p.id} post={p} user={user} groupId={selectedGroup} onChange={refresh} />
          ))}
        </div>
      )}

      {pinned.length > 0 && (
        <div className="forum-section">
          <div className="forum-section-h">📌 Publicaciones fijadas</div>
          {pinned.map(p => (
            <PostCard key={p.id} post={p} user={user} groupId={selectedGroup} onChange={refresh} />
          ))}
        </div>
      )}

      <div className="forum-section">
        <div className="forum-section-h">Conversaciones recientes</div>
        {others.length === 0 ? (
          <div className="empty-state"><div className="icon">💬</div>Aún no hay publicaciones. ¡Sé el primero!</div>
        ) : (
          others.map(p => (
            <PostCard key={p.id} post={p} user={user} groupId={selectedGroup} onChange={refresh} />
          ))
        )}
      </div>

      {isTeacher && <MutedList groupId={selectedGroup} onChange={refresh} />}
      {isTeacher && <FlagsList groupId={selectedGroup} onChange={refresh} />}
    </main>
  );
}

function NewPostBox({ user, groupId, onPost, muted }) {
  const [open, setOpen] = fUseState(false);
  const [title, setTitle] = fUseState('');
  const [body, setBody] = fUseState('');
  const [err, setErr] = fUseState('');
  const [media, setMedia] = fUseState(null);
  const [reflect, setReflect] = fUseState(false);
  // 📢 FORO-AVISOS-V1 (solo teacher): tipo, Inicio del alumno, fecha y varios grupos
  const isT = user.role === 'teacher';
  const [kind, setKind] = fUseState('post');
  const [home, setHome] = fUseState(true);
  const [useUntil, setUseUntil] = fUseState(true);
  const [until, setUntil] = fUseState(() => (window.JUCUM_FORUM && window.JUCUM_FORUM.annDay) ? window.JUCUM_FORUM.annDay(7) : '');
  const [gsel, setGsel] = fUseState(() => new Set([groupId]));
  fUseEffect(() => { setGsel(new Set([groupId])); }, [groupId]);
  const isAnn = isT && kind === 'aviso';
  // 📊 FORO-ENCUESTAS-V1: teacher y alumnos crean encuestas (el alumno, solo en su grupo y sin Inicio)
  const isPollK = kind === 'encuesta';
  const [opts, setOpts] = fUseState(['', '']);
  const [pMulti, setPMulti] = fUseState(false);
  const [pShow, setPShow] = fUseState('after');
  const setOpt = (i, v) => setOpts(a => a.map((x, j) => j === i ? v : x));
  const toggleG = (id) => setGsel(prev => { const n = new Set(prev); if (n.has(id)) { if (n.size > 1) n.delete(id); } else n.add(id); return n; });

  if (muted) return <MutedBanner info={muted} />;

  const submit = () => {
    if (!title.trim()) { setErr(isAnn ? 'Pon un título al aviso.' : isPollK ? 'Escribe la pregunta de la encuesta.' : 'Pon un título a tu pregunta.'); return; }
    const cleanOpts = opts.map(o => o.trim()).filter(Boolean).slice(0, 6);
    if (isPollK && cleanOpts.length < 2) { setErr('La encuesta necesita al menos 2 opciones.'); return; }
    if (isPollK && new Set(cleanOpts.map(o => o.toLowerCase())).size !== cleanOpts.length) { setErr('Hay dos opciones iguales.'); return; }
    if (!body.trim() && !media && !isPollK) { setErr('Escribe el cuerpo de tu mensaje.'); return; }
    if ((isAnn || isPollK) && useUntil && !until) { setErr(isPollK ? 'Elige el día en que cierra (o desmarca la fecha).' : 'Elige hasta qué día se queda arriba (o desmarca la fecha).'); return; }
    const F = window.JUCUM_FORUM;
    if (user.role !== 'teacher' && F.containsBadLanguage && F.containsBadLanguage(title + ' ' + body + ' ' + (isPollK ? cleanOpts.join(' ') : ''))) {
      const s = window.JUCUM_DATA.STUDENTS.find(s => s.id === user.studentId);
      if (s) F.registerBadAttempt({ id: s.id, name: s.fullName }, groupId, (title.trim() + ' — ' + body.trim()));
      setErr(''); setReflect(true); return;
    }
    const { STUDENTS } = window.JUCUM_DATA;
    const me = user.role === 'teacher'
      ? { id: 'teacher', name: 'Teacher', role: 'teacher' }
      : (() => { const s = STUDENTS.find(s => s.id === user.studentId); return { id: s.id, name: s.fullName, role: 'student' }; })();
    const base = {
      authorId: me.id, authorName: me.name, authorRole: me.role,
      title: title.trim(), body: body.trim(),
      mediaUrl: media ? media.url : null, mediaKind: media ? media.kind : null,
    };
    if (isAnn) {
      const batch = 'ab-' + Date.now(), stamp = Date.now();
      [...gsel].forEach((gid, i) => window.JUCUM_FORUM.createPost(gid, Object.assign({}, base, {
        id: 'p-' + stamp + (gsel.size > 1 ? '-' + i : ''), kind: 'aviso', annUntil: useUntil ? until : null, annHome: !!home, annBatch: gsel.size > 1 ? batch : null,
      })));
    } else if (isPollK) {
      const gids = isT ? [...gsel] : [groupId];
      const batch = 'pb-' + Date.now(), stamp = Date.now();
      const poll = { opts: cleanOpts, multi: !!pMulti, show: pShow === 'author' ? 'author' : 'after', closes: useUntil ? until : null, home: !!(isT && home) };
      gids.forEach((gid, i) => window.JUCUM_FORUM.createPost(gid, Object.assign({}, base, {
        id: 'p-' + stamp + (gids.length > 1 ? '-' + i : ''), kind: 'encuesta', poll, annBatch: gids.length > 1 ? batch : null,
      })));
    } else window.JUCUM_FORUM.createPost(groupId, base);
    setTitle(''); setBody(''); setErr(''); setMedia(null); setOpen(false); setKind('post'); setGsel(new Set([groupId])); setOpts(['', '']); setPMulti(false); setPShow('after');
    onPost();
  };

  if (!open) {
    return (
      <button className="forum-new-trigger" onClick={() => setOpen(true)}>
        ✍️ Publicar una pregunta, comentario o 📊 encuesta — puedes adjuntar 📷 foto o 🎥 video
      </button>
    );
  }
  return (
    <div className="forum-new">
      {(
        <div className="fkind">
          <button type="button" className={kind === 'post' ? 'on' : ''} onClick={() => setKind('post')} style={kind === 'post' ? { borderColor: '#1F3A8A', background: '#EAF1FF', color: '#1F3A8A' } : undefined}>✍️ Pregunta o comentario</button>
          <button type="button" className={kind === 'encuesta' ? 'on' : ''} onClick={() => { setKind('encuesta'); setUseUntil(true); }} style={kind === 'encuesta' ? { borderColor: '#7B5CC8', background: '#F1ECFB', color: '#5B3FA0' } : undefined}>📊 Encuesta</button>
          {isT && <button type="button" className={kind === 'aviso' ? 'on' : ''} onClick={() => setKind('aviso')}>📢 Aviso</button>}
        </div>
      )}
      {reflect && <BadWordsNotice onOk={() => setReflect(false)} />}
      {err && <div className="err" style={{marginBottom:10}}>⚠ {err}</div>}
      {/* FORO-LIMITE-V1: título ≤ 120 · mensaje ≤ 2000 caracteres */}
      <input className="input-text" placeholder={isAnn ? 'Título del aviso (ej. Examen del Módulo 5 · viernes 14)' : isPollK ? 'Pregunta de la encuesta (ej. ¿Qué día prefieren el repaso?)' : 'Título de tu pregunta'} maxLength={120} value={title} onChange={e => setTitle(e.target.value)} />
      <textarea className="eval-textarea" placeholder={isPollK ? 'Explicación (opcional)' : 'Escribe tu mensaje aquí…'} rows={isPollK ? 2 : 4} maxLength={2000} value={body} onChange={e => setBody(e.target.value)} />
      {isPollK && (() => {
        const { GROUPS, LEVELS } = window.JUCUM_DATA;
        const fin = (gid) => !!(window.JUCUM_GRAD && window.JUCUM_GRAD.isFinished && window.JUCUM_GRAD.isFinished(gid));
        const list = isT ? GROUPS.filter(g => g.id === groupId || !fin(g.id)) : [];
        return (
          <div className="fann-opt" style={{borderColor:'#C9BCE8', background:'#FBF9FF'}}>
            <span>Opciones (de 2 a 6):</span>
            {opts.map((o, i) => (
              <div key={i} style={{display:'flex', gap:6, alignItems:'center'}}>
                <input className="input-text" style={{margin:0, flex:1, minWidth:0}} placeholder={'Opción ' + (i + 1)} maxLength={80} value={o} onChange={e => setOpt(i, e.target.value)} />
                {opts.length > 2 && <button type="button" title="Quitar" onClick={() => setOpts(a => a.filter((_, j) => j !== i))} style={{border:'none', background:'#F1EEE6', width:26, height:26, borderRadius:'50%', cursor:'pointer', fontSize:11, flexShrink:0}}>✕</button>}
              </div>
            ))}
            {opts.length < 6 && <button type="button" onClick={() => setOpts(a => a.concat(''))} style={{alignSelf:'flex-start', border:'none', background:'none', color:'#5B3FA0', fontFamily:'inherit', fontWeight:900, fontSize:12.5, cursor:'pointer', padding:0}}>＋ Agregar opción</button>}
            <label><input type="checkbox" checked={pMulti} onChange={e => setPMulti(e.target.checked)} style={{accentColor:'#7B5CC8'}} /> Pueden marcar varias respuestas</label>
            <label><input type="radio" name="fpshow" checked={pShow === 'after'} onChange={() => setPShow('after')} style={{accentColor:'#7B5CC8'}} /> Todos ven los resultados después de votar</label>
            <label><input type="radio" name="fpshow" checked={pShow === 'author'} onChange={() => setPShow('author')} style={{accentColor:'#7B5CC8'}} /> {isT ? 'Solo yo veo los resultados' : 'Solo yo (y el teacher) vemos los resultados'}</label>
            <label><input type="checkbox" checked={useUntil} onChange={e => setUseUntil(e.target.checked)} style={{accentColor:'#7B5CC8'}} /> Cierra después del {useUntil && <input type="date" value={until} min={window.JUCUM_FORUM.annDay(0)} onChange={e => setUntil(e.target.value)} />}{!useUntil && <span style={{fontWeight:700, color:'#8a7f6a'}}>(abierta hasta que la cierres)</span>}</label>
            {isT && <label><input type="checkbox" checked={home} onChange={e => setHome(e.target.checked)} style={{accentColor:'#7B5CC8'}} /> Mostrarla también en el Inicio de cada alumno (hasta que vote)</label>}
            {list.length > 1 && (
              <div style={{display:'flex', flexDirection:'column', gap:5}}>
                <span>Publicarla en {gsel.size === 1 ? 'este grupo' : gsel.size + ' grupos'} · toca para agregar otros (cada grupo vota aparte):</span>
                <div className="fann-gr">
                  {list.map(g => <button type="button" key={g.id} className={gsel.has(g.id) ? 'on' : ''} onClick={() => toggleG(g.id)} style={gsel.has(g.id) ? {background:'#7B5CC8', borderColor:'#7B5CC8'} : undefined}>{(LEVELS[g.level] || {}).emoji} {g.name}</button>)}
                </div>
              </div>
            )}
          </div>
        );
      })()}
      {isAnn && (() => {
        const { GROUPS, LEVELS } = window.JUCUM_DATA;
        const fin = (gid) => !!(window.JUCUM_GRAD && window.JUCUM_GRAD.isFinished && window.JUCUM_GRAD.isFinished(gid));
        const list = GROUPS.filter(g => g.id === groupId || !fin(g.id));
        return (
          <div className="fann-opt">
            <label><input type="checkbox" checked={home} onChange={e => setHome(e.target.checked)} /> Mostrarlo también en el Inicio de cada alumno (hasta que toque «✓ Entendido»)</label>
            <label><input type="checkbox" checked={useUntil} onChange={e => setUseUntil(e.target.checked)} /> Quitarlo de arriba después del {useUntil && <input type="date" value={until} min={window.JUCUM_FORUM.annDay(0)} onChange={e => setUntil(e.target.value)} />}{!useUntil && <span style={{fontWeight:700, color:'#8a7f6a'}}>(se queda hasta que lo termines)</span>}</label>
            {list.length > 1 && (
              <div style={{display:'flex', flexDirection:'column', gap:5}}>
                <span>Publicarlo en {gsel.size === 1 ? 'este grupo' : gsel.size + ' grupos'} · toca para agregar otros:</span>
                <div className="fann-gr">
                  {list.map(g => <button type="button" key={g.id} className={gsel.has(g.id) ? 'on' : ''} onClick={() => toggleG(g.id)}>{(LEVELS[g.level] || {}).emoji} {g.name}</button>)}
                </div>
              </div>
            )}
          </div>
        );
      })()}
      <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
        <FAttach pending={media} setPending={setMedia} />
        <div className="forum-new-actions" style={{marginLeft:'auto'}}>
          <button className="btn-cancel" onClick={() => { setOpen(false); setErr(''); setMedia(null); setKind('post'); }}>Cancelar</button>
          <button className="btn-save" onClick={submit}>{isAnn ? (gsel.size > 1 ? '📢 Publicar en ' + gsel.size + ' grupos' : '📢 Publicar aviso') : isPollK ? (isT && gsel.size > 1 ? '📊 Publicar en ' + gsel.size + ' grupos' : '📊 Publicar encuesta') : 'Publicar'}</button>
        </div>
      </div>
    </div>
  );
}

function PostCard({ post, user, groupId, onChange }) {
  const F = window.JUCUM_FORUM;
  const isTeacher = user.role === 'teacher';
  const myId = isTeacher ? 'teacher' : user.studentId;
  const [showReply, setShowReply] = fUseState(false);
  const [replyBody, setReplyBody] = fUseState('');
  const [pickOpen, setPickOpen] = fUseState(false);
  const [replyMedia, setReplyMedia] = fUseState(null);
  const [replyReflect, setReplyReflect] = fUseState(false);
  const [muteOpen, setMuteOpen] = fUseState(false);
  const [allR, setAllR] = fUseState(false);   // FORO-COMPACTO-V1: «Ver N más»
  const isAnnPost = post.kind === 'aviso';
  const annActive = !!(F.isAnnActive && F.isAnnActive(post));

  const reacts = F.getReactions ? F.getReactions(post.id) : (F.postLikes(post.id) || []).map(u => ({ u, e: '❤️' }));
  const myReact = reacts.find(r => r.u === myId);

  const onPin = () => { F.togglePin(groupId, post.id); onChange(); };
  const onDelete = () => {
    if (confirm('¿Eliminar esta publicación?')) { F.deletePost(groupId, post.id); onChange(); }
  };
  const onReact = (emoji) => {
    if (!isTeacher && F.isMuted(myId)) { setPickOpen(false); alert('🔇 Tu participación en el foro está pausada por ahora: puedes leer, pero no reaccionar. Revisa el aviso de arriba.'); return; }
    if (F.toggleReaction) F.toggleReaction(post.id, myId, emoji); else F.toggleLike(post.id, myId); setPickOpen(false); onChange();
  };
  const onMute = () => setMuteOpen(true);
  const onUnmute = () => { F.setMute(post.authorId, null); onChange(); };

  const submitReply = () => {
    if (!replyBody.trim() && !replyMedia) return;
    const { STUDENTS } = window.JUCUM_DATA;
    const me = isTeacher
      ? { id: 'teacher', name: 'Teacher', role: 'teacher' }
      : (() => { const s = STUDENTS.find(s => s.id === myId); return { id: s.id, name: s.fullName, role: 'student' }; })();
    if (!isTeacher) {
      const info = F.getMuteInfo ? F.getMuteInfo(me.id) : null;
      if (info) { alert(`🔇 Tu participación en el foro está pausada (${info.reasonLabel}). Podrás participar de nuevo en ${info.daysLeft} día${info.daysLeft === 1 ? '' : 's'}.`); return; }
      if (F.containsBadLanguage && F.containsBadLanguage(replyBody)) {
        F.registerBadAttempt({ id: me.id, name: me.name }, groupId, replyBody.trim());
        setReplyReflect(true); return;
      }
    }
    F.addReply(groupId, post.id, {
      authorId: me.id, authorName: me.name, authorRole: me.role,
      body: replyBody.trim(), parentId: null,
      mediaUrl: replyMedia ? replyMedia.url : null, mediaKind: replyMedia ? replyMedia.kind : null,
    });
    setReplyBody(''); setReplyMedia(null); setReplyReflect(false); setAllR(true); onChange();
  };

  const dateStr = relativeTime(post.date);
  const isAuthorMuted = F.isMuted(post.authorId);
  const initials = post.authorName.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase();
  const isTeacherPost = post.authorRole === 'teacher';

  return (
    <div className={`fpost ${post.pinned && !annActive ? 'pinned' : ''} ${annActive ? 'fann' : ''}`}>
      <div className="fpost-head">
        <div className={`fpost-ava ${isTeacherPost ? 't' : ''}`}>{isTeacherPost ? '👨‍🏫' : initials}</div>
        <div className="fpost-meta">
          <div className="fpost-author">
            {post.authorName}
            {isTeacherPost && <span className="fpost-role">TEACHER</span>}
            {isAuthorMuted && !isTeacherPost && <span className="fpost-muted">🔇 silenciado</span>}
          </div>
          <div className="fpost-date">{dateStr}{post.pinned && !annActive && <span className="pin-tag"> · 📌 Fijada</span>}{isAnnPost && <> · <span className="fann-tag">📢 Aviso{annActive ? (post.annUntil ? ' · hasta el ' + fDayLbl(post.annUntil) : '') : ' · terminó'}</span></>}{F.isPoll && F.isPoll(post) && <> · <span className="fann-tag" style={{background:'#EEE7FB', color:'#5B3FA0'}}>📊 Encuesta{F.pollOpen(post) ? (post.poll.closes ? ' · cierra el ' + fDayLbl(post.poll.closes) : '') : ' · cerrada'}</span></>}</div>
        </div>
        {isTeacher && (
          <div className="fpost-tools">
            {F.isPoll && F.pollOpen && F.pollOpen(post) && <button className="ftool" onClick={() => { if (confirm('¿Cerrar esta encuesta? Ya no se podrá votar; los resultados quedan.')) { F.endPoll(groupId, post.id); onChange(); } }} title="Cerrar encuesta">🔒</button>}
            {annActive && <button className="ftool" onClick={() => { if (confirm('¿Terminar este aviso? Deja de estar arriba y sale del Inicio de los alumnos. La publicación no se borra.')) { F.endAnn(groupId, post.id); onChange(); } }} title="Terminar aviso">⏹</button>}
            <button className="ftool" onClick={onPin} title={post.pinned ? 'Desfijar' : 'Fijar'}>{post.pinned ? '📌' : '📍'}</button>
            {!isTeacherPost && (isAuthorMuted
              ? <button className="ftool" onClick={onUnmute} title="Desbloquear">🔊</button>
              : <button className="ftool" onClick={onMute} title="Silenciar autor">🔇</button>)}
            <button className="ftool del" onClick={onDelete} title="Eliminar">🗑</button>
          </div>
        )}
      </div>

      <div className="fpost-title">{post.title}</div>
      <div className="fpost-body">{post.body}</div>
      {post.mediaUrl && <FMedia url={post.mediaUrl} kind={post.mediaKind} />}
      {isTeacher && annActive && <AnnReadBar post={post} groupId={groupId} />}
      {F.isPoll && F.isPoll(post) && <PollBlock post={post} user={user} groupId={groupId} onChange={onChange} />}

      <div className="fpost-actions" style={{flexWrap:'wrap', alignItems:'center'}}>
        {(() => { const groups = {}; reacts.forEach(r => { groups[r.e] = (groups[r.e] || 0) + 1; }); return Object.entries(groups).map(([e, n]) => (
          <button key={e} className={`fp-like ${myReact && myReact.e === e ? 'on' : ''}`} onClick={() => onReact(e)}>{e} {n}</button>
        )); })()}
        <div style={{position:'relative'}}>
          <button className="fp-like" onClick={() => setPickOpen(o => !o)} title="Reaccionar">🙂＋</button>
          {pickOpen && (
            <div style={{position:'absolute', bottom:36, left:0, background:'#fff', border:'1px solid var(--border)', borderRadius:22, padding:'5px 8px', display:'flex', gap:3, boxShadow:'0 6px 18px rgba(0,0,0,.18)', zIndex:20}}>
              {F_REACTS.map(e => <button key={e} onClick={() => onReact(e)} style={{border:'none', background:'none', fontSize:19, cursor:'pointer', padding:'3px 4px', borderRadius:'50%'}}>{e}</button>)}
            </div>
          )}
        </div>
        {(() => {   // FORO-COMPACTO-V1: plegado por defecto con caritas + última respuesta
          const all = post.replies || [];
          if (!all.length) return showReply ? null : <button className="fp-reply" onClick={() => setShowReply(true)}>💬 Responder</button>;
          if (showReply) return <button className="fp-reply" onClick={() => { setShowReply(false); setAllR(false); }}>▴ Ocultar respuestas</button>;
          const last = all.reduce((a, r) => ((r.date || '') > (a.date || '') ? r : a), all[0]);
          const who = []; all.slice().reverse().forEach(r => { if (who.length < 5 && !who.some(w => w.id === r.authorId)) who.push({ id: r.authorId, t: r.authorRole === 'teacher', n: r.authorName }); });
          return (
            <button className="fp-reply fsum" onClick={() => setShowReply(true)}>
              <span className="fsum-st">{who.map(w => <span key={w.id} className={w.t ? 't' : ''}>{w.t ? '👨‍🏫' : fIni(w.n)}</span>)}</span>
              {all.length} respuesta{all.length === 1 ? '' : 's'} · la última de {last.authorRole === 'teacher' ? 'Teacher' : String(last.authorName || '').split(' ')[0]}, {relativeTime(last.date)} ▾
            </button>
          );
        })()}
      </div>

      {showReply && (
        <div className="fpost-replies">
          {(() => {
            const all = post.replies || []; const kidsOf = (id) => all.filter(r => r.parentId === id);
            const flat = []; const walk = (r, d) => { flat.push({ r, d }); kidsOf(r.id).forEach(k => walk(k, d + 1)); };
            all.filter(r => !r.parentId).forEach(r => walk(r, 0));
            const LIM = 3, shown = allR ? flat : flat.slice(0, LIM);
            const byId = {}; all.forEach(r => { byId[r.id] = r; });
            return (
              <>
                {shown.map(({ r, d }) => (
                  <ReplyRow key={r.id} reply={r} post={post} user={user} groupId={groupId} onChange={onChange} isTeacher={isTeacher} depth={d} parentName={d > 0 && byId[r.parentId] ? (byId[r.parentId].authorRole === 'teacher' ? 'Teacher' : String(byId[r.parentId].authorName || '').split(' ')[0]) : null} />
                ))}
                {!allR && flat.length > LIM && <button className="fmore" onClick={() => setAllR(true)}>Ver {flat.length - LIM} respuesta{flat.length - LIM === 1 ? '' : 's'} más ▾</button>}
              </>
            );
          })()}
            <div className="freply-new">
              {replyReflect && <BadWordsNotice onOk={() => setReplyReflect(false)} />}
              <textarea className="eval-textarea" rows={2} placeholder="Escribe tu respuesta…" maxLength={2000} value={replyBody} onChange={e => setReplyBody(e.target.value)} />
              <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
                <FAttach pending={replyMedia} setPending={setReplyMedia} />
                <div className="forum-new-actions" style={{marginLeft:'auto'}}>
                  <button className="btn-cancel" onClick={() => { setShowReply(false); setAllR(false); setReplyBody(''); setReplyMedia(null); }}>Cancelar</button>
                  <button className="btn-save" onClick={submitReply}>Responder</button>
                </div>
              </div>
            </div>
        </div>
      )}
      {muteOpen && <MuteModal student={{ id: post.authorId, name: post.authorName }} onClose={() => setMuteOpen(false)} onDone={() => { setMuteOpen(false); onChange(); }} />}
    </div>
  );
}

function ReplyRow({ reply, post, user, groupId, onChange, isTeacher, depth, parentName }) {
  const F = window.JUCUM_FORUM;
  const myId = isTeacher ? 'teacher' : user.studentId;
  const [showR, setShowR] = fUseState(false);
  const [tap, setTap] = fUseState(false);   // celular: tocar la respuesta muestra Responder / 🗑
  const [body, setBody] = fUseState('');
  const [media, setMedia] = fUseState(null);
  const [reflect, setReflect] = fUseState(false);
  const onDelete = () => {
    if (confirm('¿Eliminar esta respuesta?')) { F.deleteReply(groupId, post.id, reply.id); onChange(); }
  };
  const submit = () => {
    if (!body.trim() && !media) return;
    const { STUDENTS } = window.JUCUM_DATA;
    const me = isTeacher
      ? { id: 'teacher', name: 'Teacher', role: 'teacher' }
      : (() => { const s = STUDENTS.find(s => s.id === myId); return { id: s.id, name: s.fullName, role: 'student' }; })();
    if (!isTeacher) {
      const info = F.getMuteInfo ? F.getMuteInfo(me.id) : null;
      if (info) { alert(`🔇 Tu participación en el foro está pausada (${info.reasonLabel}). Podrás participar de nuevo en ${info.daysLeft} día${info.daysLeft === 1 ? '' : 's'}.`); return; }
      if (F.containsBadLanguage && F.containsBadLanguage(body)) {
        F.registerBadAttempt({ id: me.id, name: me.name }, groupId, body.trim());
        setReflect(true); return;
      }
    }
    F.addReply(groupId, post.id, {
      authorId: me.id, authorName: me.name, authorRole: me.role,
      body: body.trim(), parentId: reply.id,
      mediaUrl: media ? media.url : null, mediaKind: media ? media.kind : null,
    });
    setBody(''); setMedia(null); setShowR(false); setReflect(false); setTap(false); onChange();
  };
  const isTeacherReply = reply.authorRole === 'teacher';
  const initials = fIni(reply.authorName);
  /* FORO-COMPACTO-V1: una línea por respuesta · un solo nivel de sangría con «↪ a Nombre» */
  return (
    <div>
      <div className={`fcr ${depth > 0 ? 'kid' : ''} ${tap ? 'on' : ''}`} onClick={F_TOUCH ? (e) => { if (!e.target.closest('button,a,video,audio,img')) setTap(t => !t); } : undefined}>
        <div className={`fpost-ava sm ${isTeacherReply ? 't' : ''}`}>{isTeacherReply ? '👨‍🏫' : initials}</div>
        <div className="fcr-tx">
          {depth > 0 && parentName && <span className="fcr-to">↪ a {parentName}</span>}
          <b className={isTeacherReply ? 't' : ''}>{isTeacherReply ? 'Teacher' : fShortName(reply.authorName)}</b>{reply.body}<span className="fcr-tm">{relativeTime(reply.date)}</span>
          {reply.mediaUrl && <FMedia url={reply.mediaUrl} kind={reply.mediaKind} small />}
        </div>
        <span className="fcr-hv">
          <button onClick={() => setShowR(o => !o)}>↩ Responder</button>
          {isTeacher && <button className="del" onClick={onDelete} title="Eliminar">🗑</button>}
        </span>
      </div>
      {showR && (
        <div className="freply-new" style={{margin:'4px 0 6px ' + (depth > 0 ? 62 : 32) + 'px'}}>
          {reflect && <BadWordsNotice onOk={() => setReflect(false)} />}
          <textarea className="eval-textarea" rows={2} placeholder={'Responder a ' + (isTeacherReply ? 'Teacher' : String(reply.authorName || '').split(' ')[0]) + '…'} maxLength={2000} value={body} onChange={e => setBody(e.target.value)} />
          <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
            <FAttach pending={media} setPending={setMedia} />
            <div className="forum-new-actions" style={{marginLeft:'auto'}}>
              <button className="btn-cancel" onClick={() => { setShowR(false); setBody(''); setMedia(null); }}>Cancelar</button>
              <button className="btn-save" onClick={submit}>Responder</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* 📢 FORO-AVISOS-V1 · teacher: «Leído por N de M» + quiénes faltan + 🔔 Recordar */
function AnnReadBar({ post, groupId }) {
  const F = window.JUCUM_FORUM;
  const [showW, setShowW] = fUseState(false);
  const [sent, setSent] = fUseState(false);
  const roster = fRoster(groupId);
  const reads = F.annReads(post.id);
  const miss = roster.filter(s => !reads[s.id]);
  const remind = () => {
    if (!window.JUCUM_NOTIF || !miss.length) return;
    miss.forEach(s => window.JUCUM_NOTIF.pushNotif(s.id, { type: 'forum', title: '📢 Tienes un aviso de tu teacher', body: post.title || '', link: 'forum' }));
    setSent(true);
  };
  return (
    <div className="fann-rd">
      👁 Leído por {roster.length - miss.length} de {roster.length}
      {miss.length > 0 && <button onClick={() => setShowW(s => !s)}>{showW ? 'Ocultar' : 'Ver quiénes faltan'}</button>}
      {miss.length > 0 && <button className="go" disabled={sent} onClick={remind}>{sent ? '✓ Recordatorio enviado' : '🔔 Recordar a ' + miss.length}</button>}
      {showW && miss.length > 0 && <span style={{flexBasis:'100%', fontWeight:700, color:'#5A3A30'}}>Faltan: {miss.map(s => s.fullName).join(', ')}</span>}
    </div>
  );
}

/* 📊 FORO-ENCUESTAS-V1 · la encuesta dentro de la publicación (votar, resultados, quién votó, recordar) */
function PollBlock({ post, user, groupId, onChange }) {
  const F = window.JUCUM_FORUM;
  const isT = user.role === 'teacher';
  const me = isT ? 'teacher' : user.studentId;
  const pl = post.poll || { opts: [] };
  const open = F.pollOpen(post);
  const votes = F.getVotes(post.id);
  const mine = votes[me] || [];
  const [sel, setSel] = fUseState(null);
  const [showW, setShowW] = fUseState(false);
  const [sent, setSent] = fUseState(false);
  const isAuthor = post.authorId === me;
  const { STUDENTS } = window.JUCUM_DATA;
  const voters = Object.keys(votes).filter(u => u !== 'teacher' && (votes[u] || []).length);
  const counts = pl.opts.map((_, i) => voters.filter(u => votes[u].indexOf(i) >= 0).length);
  const total = voters.length;
  const canSee = isT || isAuthor || (pl.show !== 'author' && (mine.length > 0 || !open));
  const muted = !isT && F.isMuted && F.isMuted(me);
  const canVote = open && !isT && !muted;
  const cur = sel || mine;
  const pick = (i) => {
    if (!canVote) return;
    if (pl.multi) { const s = new Set(cur); s.has(i) ? s.delete(i) : s.add(i); setSel([...s].sort((a, b) => a - b)); return; }
    F.vote(post.id, me, mine[0] === i ? [] : [i]); onChange();
  };
  const saveMulti = () => { F.vote(post.id, me, sel || []); setSel(null); onChange(); };
  const roster = fRoster(groupId);
  const miss = roster.filter(s => !(votes[s.id] || []).length);
  const nm = (u) => { const s = STUDENTS.find(x => x.id === u); return s ? fShortName(s.fullName) : '—'; };
  const remind = () => {
    if (!window.JUCUM_NOTIF || !miss.length) return;
    miss.forEach(s => window.JUCUM_NOTIF.pushNotif(s.id, { type: 'forum', title: '📊 Tu teacher espera tu voto', body: post.title || '', link: 'forum' }));
    setSent(true);
  };
  return (
    <div style={{display:'flex', flexDirection:'column', gap:6, margin:'8px 0 4px'}}>
      {pl.multi && open && !isT && <span style={{fontSize:11.5, fontWeight:800, color:'#7B5CC8'}}>Puedes marcar varias</span>}
      {pl.opts.map((o, i) => {
        const n = counts[i], pc = total ? Math.round(n * 100 / total) : 0, on = cur.indexOf(i) >= 0;
        return (
          <button key={i} type="button" onClick={() => pick(i)} disabled={!canVote} style={{position:'relative', overflow:'hidden', border:'1.5px solid ' + (on ? '#7B5CC8' : '#DCD3F0'), background:'#fff', borderRadius:11, padding:'9px 12px', textAlign:'left', fontFamily:'inherit', fontSize:13, fontWeight:800, color:'#2A2A2A', cursor: canVote ? 'pointer' : 'default', display:'flex', alignItems:'center', gap:8}}>
            {canSee && <span style={{position:'absolute', top:0, bottom:0, left:0, width: pc + '%', background:'#EEE7FB', transition:'width .4s'}}></span>}
            {!isT && <span style={{position:'relative', width:18, height:18, borderRadius: pl.multi ? 5 : '50%', border:'2px solid ' + (on ? '#7B5CC8' : '#C9BCE8'), background: on ? '#7B5CC8' : '#fff', color:'#fff', fontSize:11, display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>{on ? '✓' : ''}</span>}
            <span style={{position:'relative', flex:1, minWidth:0}}>{o}</span>
            {canSee && <span style={{position:'relative', fontWeight:900, color:'#5B3FA0', whiteSpace:'nowrap'}}>{pc}% · {n}</span>}
          </button>
        );
      })}
      {sel && <button type="button" onClick={saveMulti} style={{alignSelf:'flex-start', border:'none', background:'linear-gradient(135deg,#7B5CC8,#5B3FA0)', color:'#fff', borderRadius:10, padding:'7px 14px', fontFamily:'inherit', fontWeight:900, fontSize:12.5, cursor:'pointer'}}>✓ Guardar mi voto</button>}
      <div className="fann-rd" style={{marginTop:2}}>
        {isT ? (
          <>
            🗳 {total} de {roster.length} votaron{pl.show === 'author' && ' · 🔒 solo tú ves los resultados'}
            <button onClick={() => setShowW(s => !s)}>{showW ? 'Ocultar' : '👁 Ver quién votó qué'}</button>
            {open && miss.length > 0 && <button className="go" style={{background:'#7B5CC8', borderColor:'#7B5CC8'}} disabled={sent} onClick={remind}>{sent ? '✓ Recordatorio enviado' : '🔔 Recordar a ' + miss.length}</button>}
          </>
        ) : !open ? <span>🔒 Encuesta cerrada · {total} voto{total === 1 ? '' : 's'}</span>
          : muted ? <span>🔇 Tu participación está pausada: puedes leer, pero no votar.</span>
          : mine.length ? <span>✅ Votaste. Puedes cambiar tu voto{pl.closes ? ' hasta el ' + fDayLbl(pl.closes) : ''}.{!canSee && ' Los resultados los ve quien la creó.'}</span>
          : <span>👆 Toca {pl.multi ? 'tus opciones' : 'una opción'} para votar. {pl.show === 'author' ? 'Los resultados los ve quien la creó.' : 'Verás los resultados después.'}</span>}
      </div>
      {isT && showW && (
        <div style={{background:'#F7F4EC', borderRadius:10, padding:'8px 10px', fontSize:12, display:'flex', flexDirection:'column', gap:4}}>
          {pl.opts.map((o, i) => <div key={i}><b>{o}:</b> {voters.filter(u => votes[u].indexOf(i) >= 0).map(nm).join(', ') || '—'}</div>)}
          {miss.length > 0 && <div style={{color:'#7A2A1E'}}><b>Faltan:</b> {miss.map(s => fShortName(s.fullName)).join(', ')}</div>}
        </div>
      )}
    </div>
  );
}

/* 📊 FORO-ENCUESTAS-V1 · alumno: encuesta del teacher en Inicio hasta que vote */
function StudentPollCard({ student, onOpen }) {
  const F = window.JUCUM_FORUM;
  const [, setT] = fUseState(0);
  fUseEffect(() => {
    if (!F || !F.studentPolls || !student || !student.group) return;
    const ids = (F.getGroupForum(student.group).posts || []).filter(p => F.isPoll(p) && F.pollOpen(p)).map(p => p.id);
    let alive = true;
    if (ids.length) F.loadVotes(ids).then(ok => { if (ok && alive) setT(t => t + 1); });
    return () => { alive = false; };
  }, [student && student.id]);
  if (!F || !F.studentPolls) return null;
  const list = F.studentPolls(student);
  if (!list.length) return null;
  const p = list[0];
  return (
    <div style={{background:'#fff', border:'2px solid #7B5CC8', borderRadius:18, padding:'14px 16px', marginBottom:14, display:'flex', flexDirection:'column', gap:6, boxShadow:'0 8px 20px rgba(91,63,160,.16)'}}>
      <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
        <span style={{fontSize:11.5, fontWeight:900, color:'#5B3FA0', textTransform:'uppercase', letterSpacing:'.06em'}}>📊 Encuesta de tu teacher</span>
        {list.length > 1 && <span style={{fontSize:11, fontWeight:800, color:'#8a7f6a'}}>1 de {list.length}</span>}
        {p.poll.closes && <span style={{fontSize:11, fontWeight:800, color:'#8a7f6a', marginLeft:'auto'}}>cierra el {fDayLbl(p.poll.closes)}</span>}
      </div>
      <div style={{fontSize:16, fontWeight:900, color:'#2A2A2A', lineHeight:1.3}}>{p.title}</div>
      {p.body && <div style={{fontSize:13, lineHeight:1.5, whiteSpace:'pre-wrap', wordBreak:'break-word'}}>{String(p.body).slice(0, 300)}</div>}
      <PollBlock post={p} user={{ role: 'student', studentId: student.id }} groupId={student.group} onChange={() => setT(t => t + 1)} />
      {onOpen && <button type="button" onClick={onOpen} style={{alignSelf:'flex-start', border:'1.5px solid #DCD3F0', background:'#fff', color:'#5B3FA0', borderRadius:10, padding:'6px 12px', fontFamily:'inherit', fontWeight:800, fontSize:12.5, cursor:'pointer'}}>Ver en el foro</button>}
    </div>
  );
}

/* 📢 FORO-AVISOS-V1 · alumno: tarjeta en Inicio hasta «✓ Entendido» (o hasta que abra el foro) */
function StudentAnnCard({ student, onOpen }) {
  const F = window.JUCUM_FORUM;
  const [, setT] = fUseState(0);
  fUseEffect(() => {
    if (!F || !F.studentAnns || !student || !student.group) return;
    const ids = (F.getGroupForum(student.group).posts || []).filter(F.isAnnActive).map(p => p.id);
    let alive = true;
    if (ids.length) F.loadAnnReads(ids, student.id).then(ok => { if (ok && alive) setT(t => t + 1); });
    return () => { alive = false; };
  }, [student && student.id]);
  if (!F || !F.studentAnns) return null;
  const list = F.studentAnns(student);
  if (!list.length) return null;
  const p = list[0];
  const ok = () => { F.markAnnRead(p.id, student.id); setT(t => t + 1); };
  const body = String(p.body || '');
  return (
    <div style={{background:'#fff', border:'2px solid #E11930', borderRadius:18, padding:'14px 16px', marginBottom:14, display:'flex', flexDirection:'column', gap:8, boxShadow:'0 8px 20px rgba(225,25,48,.16)'}}>
      <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
        <span style={{fontSize:11.5, fontWeight:900, color:'#E11930', textTransform:'uppercase', letterSpacing:'.06em'}}>📢 Aviso de tu teacher</span>
        {list.length > 1 && <span style={{fontSize:11, fontWeight:800, color:'#8a6a60'}}>1 de {list.length}</span>}
        {p.annUntil && <span style={{fontSize:11, fontWeight:800, color:'#8a6a60', marginLeft:'auto'}}>hasta el {fDayLbl(p.annUntil)}</span>}
      </div>
      <div style={{fontSize:16, fontWeight:900, color:'#2A2A2A', lineHeight:1.3}}>{p.title}</div>
      {body && <div style={{fontSize:13.5, lineHeight:1.5, whiteSpace:'pre-wrap', wordBreak:'break-word'}}>{body.length > 400 ? body.slice(0, 400).trim() + '…' : body}</div>}
      <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
        <button type="button" onClick={ok} style={{flex:'1 1 160px', border:'none', background:'#E11930', color:'#fff', borderRadius:11, padding:'10px 14px', fontFamily:'inherit', fontWeight:900, fontSize:14, cursor:'pointer'}}>✓ Entendido</button>
        {onOpen && <button type="button" onClick={onOpen} style={{flex:'0 1 auto', border:'1.5px solid #F2B8AE', background:'#fff', color:'#B23A2A', borderRadius:11, padding:'10px 14px', fontFamily:'inherit', fontWeight:800, fontSize:13, cursor:'pointer'}}>Ver en el foro</button>}
      </div>
    </div>
  );
}

function MutedList({ groupId, onChange }) {
  const F = window.JUCUM_FORUM;
  const { STUDENTS } = window.JUCUM_DATA;
  const muted = Object.keys(F.getMutes()).map(id => ({ id, info: F.getMuteInfo(id), s: STUDENTS.find(st => st.id === id) }))
    .filter(x => x.info && x.s && x.s.group === groupId);
  if (muted.length === 0) return null;
  return (
    <div className="scard" style={{marginTop:14}}>
      <div className="sec-head"><div className="sec-title">🔇 Alumnos con participación restringida</div></div>
      <div style={{fontSize:12.5, color:'var(--text-soft,#777)', margin:'2px 0 10px'}}>Pueden leer el foro, pero no publicar, comentar ni reaccionar. Ven el motivo al entrar a su plataforma y al abrir el foro.</div>
      {muted.map(({ id, info, s }) => (
        <div key={id} className="muted-row">
          <span><b>{s.fullName}</b> @{s.username} · {info.reasonEmoji} {info.reasonLabel}</span>
          <span className="muted-until">Hasta {new Date(info.until).toLocaleDateString('es-PE')} · {info.daysLeft}d restantes</span>
          <button className="att-btn" onClick={() => { F.setMute(id, null); onChange(); }}>🔊 Quitar restricción</button>
        </div>
      ))}
    </div>
  );
}

/* 🔇 Aviso al alumno restringido (arriba del foro): motivo + días restantes */
function MutedBanner({ info }) {
  const until = new Date(info.until).toLocaleDateString('es-PE', { day:'numeric', month:'long' });
  return (
    <div className="forum-muted" style={{lineHeight:1.65}}>
      <div style={{fontSize:15}}>🔇 <b>Tu participación en el foro está pausada.</b></div>
      <div style={{marginTop:4}}>Motivo: <b>{info.reasonEmoji} {info.reasonLabel}</b></div>
      <div>Podrás publicar, comentar y reaccionar de nuevo el <b>{until}</b> ({info.daysLeft} {info.daysLeft === 1 ? 'día' : 'días'} más). Mientras tanto puedes leer el foro.</div>
      <div style={{marginTop:6, fontSize:12.5}}>💛 Aprovecha este tiempo para pensar cómo tratarnos mejor: las palabras pueden animar o pueden herir. Te esperamos de vuelta con lo mejor de ti.</div>
    </div>
  );
}

/* ✋ Recordatorio reflexivo cuando el filtro detecta lisuras (el mensaje NO se publica) */
function BadWordsNotice({ onOk }) {
  return (
    <div style={{background:'#FFF8E1', border:'2px solid #F6C445', borderRadius:14, padding:'14px 16px', marginBottom:10}}>
      <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:15, color:'#8C5A00'}}>✋ Un momento… tu mensaje tiene palabras que pueden herir</div>
      <div style={{fontSize:13.5, color:'#6B4A00', lineHeight:1.65, marginTop:6}}>
        En nuestro foro todos merecemos respeto. Las palabras tienen poder: pueden animar a un compañero… o hacerlo sentir muy mal. 💛<br/>
        Piensa un momento: ¿cómo te gustaría que te lo dijeran a ti? Seguro puedes expresar lo mismo de una forma amable y respetuosa. ¡Inténtalo de nuevo!
      </div>
      <div style={{fontSize:12, color:'#8C5A00', marginTop:8, fontWeight:700}}>Tu mensaje no se publicó. El teacher recibe un aviso de estos intentos.</div>
      <button className="btn-save" style={{marginTop:10}} onClick={onOk}>Voy a escribirlo mejor 💪</button>
    </div>
  );
}

/* 🔇 Modal del teacher: motivo + días (número libre) para restringir a un alumno */
function MuteModal({ student, onClose, onDone }) {
  const F = window.JUCUM_FORUM;
  const [reason, setReason] = fUseState('lisuras');
  const [days, setDays] = fUseState('3');
  const n = parseInt(days, 10);
  const valid = n >= 1 && n <= 365;
  const until = valid ? new Date(Date.now() + n * 86400000) : null;
  const confirm = () => {
    if (!valid) return;
    F.setMute(student.id, until.toISOString(), reason);
    onDone();
  };
  return (
    <div className="onb-backdrop" onClick={onClose}>
      <div className="onb-card" onClick={e => e.stopPropagation()} style={{textAlign:'left', maxWidth:440}}>
        <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:17}}>🔇 Restringir a {student.name}</div>
        <div style={{fontSize:12.5, color:'var(--text-soft,#777)', margin:'5px 0 13px', lineHeight:1.55}}>No podrá publicar, comentar ni reaccionar en el foro (sí puede leerlo). Verá el motivo al entrar a su plataforma y al abrir el foro.</div>
        <div className="settings-label">Motivo (el alumno lo verá)</div>
        {Object.entries(F.MUTE_REASONS).map(([k, r]) => (
          <label key={k} style={{display:'flex', gap:9, alignItems:'center', padding:'8px 11px', border:'1.5px solid ' + (reason === k ? '#1F3A8A' : 'var(--border)'), background:(reason === k ? '#E3E9F8' : '#fff'), borderRadius:10, marginBottom:6, cursor:'pointer', fontSize:13.5, fontWeight:700}}>
            <input type="radio" name="mute-reason" checked={reason === k} onChange={() => setReason(k)} />
            {r.emoji} {r.label}
          </label>
        ))}
        <div className="settings-label" style={{marginTop:12}}>¿Por cuántos días?</div>
        <div style={{display:'flex', alignItems:'center', gap:10, flexWrap:'wrap'}}>
          <input className="input-text" type="number" min="1" max="365" value={days} onChange={e => setDays(e.target.value)} style={{width:110}} />
          {valid && <span style={{fontSize:12.5, fontWeight:700}}>Podrá participar de nuevo el {until.toLocaleDateString('es-PE', { day:'numeric', month:'long' })}</span>}
        </div>
        <div className="forum-new-actions" style={{marginTop:16}}>
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-save" onClick={confirm} disabled={!valid}>🔇 Restringir {valid ? n + (n === 1 ? ' día' : ' días') : ''}</button>
        </div>
      </div>
    </div>
  );
}

/* 🚩 Registro de intentos de lenguaje inapropiado (solo teacher, por grupo) */
function FlagsList({ groupId, onChange }) {
  const F = window.JUCUM_FORUM;
  const { STUDENTS } = window.JUCUM_DATA;
  const [openId, setOpenId] = fUseState(null);
  const [muteFor, setMuteFor] = fUseState(null);
  const flags = (F.getFlags ? F.getFlags() : []).filter(f => {
    const s = STUDENTS.find(st => st.id === f.studentId);
    return f.groupId === groupId || (s && s.group === groupId);
  });
  if (flags.length === 0) return null;
  const byStudent = {};
  flags.forEach(f => { (byStudent[f.studentId] = byStudent[f.studentId] || []).push(f); });
  return (
    <div className="scard" style={{marginTop:14}}>
      <div className="sec-head"><div className="sec-title">🚩 Intentos de lenguaje inapropiado</div></div>
      <div style={{fontSize:12.5, color:'var(--text-soft,#777)', margin:'2px 0 10px'}}>Mensajes que el filtro <b>no dejó publicar</b>. El alumno vio en ese momento un recordatorio sobre el respeto.</div>
      {Object.entries(byStudent).map(([sid, list]) => {
        const s = STUDENTS.find(st => st.id === sid);
        const name = s ? s.fullName : (list[0].studentName || sid);
        return (
          <div key={sid} style={{border:'1px solid var(--border)', borderRadius:12, padding:'10px 12px', marginBottom:8}}>
            <div style={{display:'flex', alignItems:'center', gap:9, flexWrap:'wrap'}}>
              <b>{name}</b>
              <span style={{background:'#FFEBEE', color:'#C62828', borderRadius:9, padding:'2px 8px', fontSize:11.5, fontWeight:800}}>{list.length} intento{list.length === 1 ? '' : 's'}</span>
              <span style={{fontSize:12, color:'var(--text-soft,#777)'}}>último: {relativeTime(list[0].date)}</span>
              <div style={{marginLeft:'auto', display:'flex', gap:6, flexWrap:'wrap'}}>
                <button className="att-btn" onClick={() => setOpenId(openId === sid ? null : sid)}>{openId === sid ? 'Ocultar' : '👁 Ver mensajes'}</button>
                {!F.isMuted(sid) && <button className="att-btn" onClick={() => setMuteFor({ id: sid, name })}>🔇 Restringir</button>}
                <button className="att-btn" onClick={() => { if (confirm('¿Borrar el registro de intentos de ' + name + '?')) { F.deleteStudentFlags(sid); onChange(); } }}>🧹 Borrar</button>
              </div>
            </div>
            {openId === sid && list.map(f => (
              <div key={f.id} style={{background:'#FAFAF6', border:'1px solid var(--border-soft,#EEE)', borderRadius:9, padding:'7px 10px', marginTop:7, fontSize:12.5, lineHeight:1.5}}>
                <span style={{color:'var(--text-soft,#777)', fontWeight:700}}>{new Date(f.date).toLocaleString('es-PE', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })} — </span>{f.content}
              </div>
            ))}
          </div>
        );
      })}
      {muteFor && <MuteModal student={muteFor} onClose={() => setMuteFor(null)} onDone={() => { setMuteFor(null); onChange(); }} />}
    </div>
  );
}

function relativeTime(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'ahora mismo';
  if (diff < 3600) return `hace ${Math.floor(diff/60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff/3600)}h`;
  if (diff < 86400*7) return `hace ${Math.floor(diff/86400)}d`;
  return new Date(iso).toLocaleDateString('es-PE', { day:'numeric', month:'long' });
}

Object.assign(window, { Forum, NewPostBox, PostCard, ReplyRow, MutedList, MutedBanner, BadWordsNotice, MuteModal, FlagsList, AnnReadBar, StudentAnnCard, PollBlock, StudentPollCard });
