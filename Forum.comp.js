/* Bloque F · Forum UI */

const { useState: fUseState, useEffect: fUseEffect } = React;

/* Reacciones disponibles (1 por usuario; elegir otra la reemplaza) */
const F_REACTS = ['👍','❤️','😂','😮','🎉'];

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

  if (!group) return <main><div className="empty-state">No tienes grupo asignado.</div></main>;

  const level = LEVELS[group.level];
  const forum = F.getGroupForum(selectedGroup);
  const posts = forum.posts || [];
  const pinned = posts.filter(p => p.pinned);
  const others = posts.filter(p => !p.pinned);

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

  if (muted) return <MutedBanner info={muted} />;

  const submit = () => {
    if (!title.trim()) { setErr('Pon un título a tu pregunta.'); return; }
    if (!body.trim() && !media) { setErr('Escribe el cuerpo de tu mensaje.'); return; }
    const F = window.JUCUM_FORUM;
    if (user.role !== 'teacher' && F.containsBadLanguage && F.containsBadLanguage(title + ' ' + body)) {
      const s = window.JUCUM_DATA.STUDENTS.find(s => s.id === user.studentId);
      if (s) F.registerBadAttempt({ id: s.id, name: s.fullName }, groupId, (title.trim() + ' — ' + body.trim()));
      setErr(''); setReflect(true); return;
    }
    const { STUDENTS } = window.JUCUM_DATA;
    const me = user.role === 'teacher'
      ? { id: 'teacher', name: 'Profesor', role: 'teacher' }
      : (() => { const s = STUDENTS.find(s => s.id === user.studentId); return { id: s.id, name: s.fullName, role: 'student' }; })();
    window.JUCUM_FORUM.createPost(groupId, {
      authorId: me.id, authorName: me.name, authorRole: me.role,
      title: title.trim(), body: body.trim(),
      mediaUrl: media ? media.url : null, mediaKind: media ? media.kind : null,
    });
    setTitle(''); setBody(''); setErr(''); setMedia(null); setOpen(false);
    onPost();
  };

  if (!open) {
    return (
      <button className="forum-new-trigger" onClick={() => setOpen(true)}>
        ✍️ Publicar una pregunta o comentario — puedes adjuntar 📷 foto o 🎥 video
      </button>
    );
  }
  return (
    <div className="forum-new">
      {reflect && <BadWordsNotice onOk={() => setReflect(false)} />}
      {err && <div className="err" style={{marginBottom:10}}>⚠ {err}</div>}
      <input className="input-text" placeholder="Título de tu pregunta" value={title} onChange={e => setTitle(e.target.value)} />
      <textarea className="eval-textarea" placeholder="Escribe tu mensaje aquí…" rows={4} value={body} onChange={e => setBody(e.target.value)} />
      <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
        <FAttach pending={media} setPending={setMedia} />
        <div className="forum-new-actions" style={{marginLeft:'auto'}}>
          <button className="btn-cancel" onClick={() => { setOpen(false); setErr(''); setMedia(null); }}>Cancelar</button>
          <button className="btn-save" onClick={submit}>Publicar</button>
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
      ? { id: 'teacher', name: 'Profesor', role: 'teacher' }
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
    setReplyBody(''); setReplyMedia(null); setShowReply(false); setReplyReflect(false); onChange();
  };

  const dateStr = relativeTime(post.date);
  const isAuthorMuted = F.isMuted(post.authorId);
  const initials = post.authorName.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase();
  const isTeacherPost = post.authorRole === 'teacher';

  return (
    <div className={`fpost ${post.pinned ? 'pinned' : ''}`}>
      <div className="fpost-head">
        <div className={`fpost-ava ${isTeacherPost ? 't' : ''}`}>{isTeacherPost ? '👨‍🏫' : initials}</div>
        <div className="fpost-meta">
          <div className="fpost-author">
            {post.authorName}
            {isTeacherPost && <span className="fpost-role">PROFESOR</span>}
            {isAuthorMuted && !isTeacherPost && <span className="fpost-muted">🔇 silenciado</span>}
          </div>
          <div className="fpost-date">{dateStr}{post.pinned && <span className="pin-tag"> · 📌 Fijada</span>}</div>
        </div>
        {isTeacher && (
          <div className="fpost-tools">
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
        <button className="fp-reply" onClick={() => setShowReply(s => !s)}>
          💬 {post.replies?.length || 0} respuesta{(post.replies?.length || 0) === 1 ? '' : 's'}
        </button>
      </div>

      {(post.replies?.length > 0 || showReply) && (
        <div className="fpost-replies">
          {(() => { const all = post.replies || []; const tops = all.filter(r => !r.parentId); const kidsOf = (id) => all.filter(r => r.parentId === id); return tops.map(r => (
            <ReplyRow key={r.id} reply={r} post={post} user={user} groupId={groupId} onChange={onChange} isTeacher={isTeacher} kidsOf={kidsOf} depth={0} />
          )); })()}
          {showReply && (
            <div className="freply-new">
              {replyReflect && <BadWordsNotice onOk={() => setReplyReflect(false)} />}
              <textarea className="eval-textarea" rows={2} placeholder="Escribe tu respuesta…" value={replyBody} onChange={e => setReplyBody(e.target.value)} />
              <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
                <FAttach pending={replyMedia} setPending={setReplyMedia} />
                <div className="forum-new-actions" style={{marginLeft:'auto'}}>
                  <button className="btn-cancel" onClick={() => { setShowReply(false); setReplyBody(''); setReplyMedia(null); }}>Cancelar</button>
                  <button className="btn-save" onClick={submitReply}>Responder</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {muteOpen && <MuteModal student={{ id: post.authorId, name: post.authorName }} onClose={() => setMuteOpen(false)} onDone={() => { setMuteOpen(false); onChange(); }} />}
    </div>
  );
}

function ReplyRow({ reply, post, user, groupId, onChange, isTeacher, kidsOf, depth }) {
  const F = window.JUCUM_FORUM;
  const myId = isTeacher ? 'teacher' : user.studentId;
  const [showR, setShowR] = fUseState(false);
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
      ? { id: 'teacher', name: 'Profesor', role: 'teacher' }
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
    setBody(''); setMedia(null); setShowR(false); setReflect(false); onChange();
  };
  const isTeacherReply = reply.authorRole === 'teacher';
  const initials = reply.authorName.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase();
  const kids = kidsOf ? kidsOf(reply.id) : [];
  return (
    <div style={depth > 0 ? {marginLeft: Math.min(depth, 3) * 16} : undefined}>
      <div className="freply">
        <div className={`fpost-ava sm ${isTeacherReply ? 't' : ''}`}>{isTeacherReply ? '👨‍🏫' : initials}</div>
        <div className="freply-body">
          <div className="fpost-author sm">
            {reply.authorName}
            {isTeacherReply && <span className="fpost-role">PROFESOR</span>}
            <span className="fpost-date sm"> · {relativeTime(reply.date)}</span>
          </div>
          <div className="fpost-body sm">{reply.body}</div>
          {reply.mediaUrl && <FMedia url={reply.mediaUrl} kind={reply.mediaKind} small />}
          <button onClick={() => setShowR(o => !o)} style={{border:'none', background:'none', color:'#1F3A8A', fontFamily:'inherit', fontWeight:800, fontSize:11.5, cursor:'pointer', padding:'4px 0 0'}}>↩ Responder</button>
          {showR && (
            <div className="freply-new" style={{marginTop:6}}>
              {reflect && <BadWordsNotice onOk={() => setReflect(false)} />}
              <textarea className="eval-textarea" rows={2} placeholder="Escribe tu respuesta…" value={body} onChange={e => setBody(e.target.value)} />
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
        {isTeacher && (
          <button className="ftool del sm" onClick={onDelete} title="Eliminar">🗑</button>
        )}
      </div>
      {kids.map(c => <ReplyRow key={c.id} reply={c} post={post} user={user} groupId={groupId} onChange={onChange} isTeacher={isTeacher} kidsOf={kidsOf} depth={(depth || 0) + 1} />)}
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
      <div style={{fontSize:12, color:'#8C5A00', marginTop:8, fontWeight:700}}>Tu mensaje no se publicó. El profesor recibe un aviso de estos intentos.</div>
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

Object.assign(window, { Forum, NewPostBox, PostCard, ReplyRow, MutedList, MutedBanner, BadWordsNotice, MuteModal, FlagsList });
