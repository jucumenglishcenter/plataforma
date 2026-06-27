/* Bloque F · Forum UI */

const { useState: fUseState, useEffect: fUseEffect } = React;

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
  if (!group) return <main><div className="empty-state">No tienes grupo asignado.</div></main>;

  const level = LEVELS[group.level];
  const forum = F.getGroupForum(selectedGroup);
  const posts = forum.posts || [];
  const pinned = posts.filter(p => p.pinned);
  const others = posts.filter(p => !p.pinned);

  const muted = !isTeacher && F.isMuted(user.studentId);

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

      <NewPostBox user={user} groupId={selectedGroup} onPost={refresh} muted={muted} />

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
    </main>
  );
}

function NewPostBox({ user, groupId, onPost, muted }) {
  const [open, setOpen] = fUseState(false);
  const [title, setTitle] = fUseState('');
  const [body, setBody] = fUseState('');
  const [err, setErr] = fUseState('');

  if (muted) {
    return (
      <div className="forum-muted">
        🔇 <b>Tu participación está restringida.</b> El profesor te ha silenciado temporalmente. Sigues pudiendo leer el foro.
      </div>
    );
  }

  const submit = () => {
    if (!title.trim()) { setErr('Pon un título a tu pregunta.'); return; }
    if (!body.trim()) { setErr('Escribe el cuerpo de tu mensaje.'); return; }
    const { STUDENTS } = window.JUCUM_DATA;
    const me = user.role === 'teacher'
      ? { id: 'teacher', name: 'Profesor', role: 'teacher' }
      : (() => { const s = STUDENTS.find(s => s.id === user.studentId); return { id: s.id, name: s.fullName, role: 'student' }; })();
    window.JUCUM_FORUM.createPost(groupId, {
      authorId: me.id, authorName: me.name, authorRole: me.role,
      title: title.trim(), body: body.trim(),
    });
    setTitle(''); setBody(''); setErr(''); setOpen(false);
    onPost();
  };

  if (!open) {
    return (
      <button className="forum-new-trigger" onClick={() => setOpen(true)}>
        ✍️ Publicar una pregunta o comentario
      </button>
    );
  }
  return (
    <div className="forum-new">
      {err && <div className="err" style={{marginBottom:10}}>⚠ {err}</div>}
      <input className="input-text" placeholder="Título de tu pregunta" value={title} onChange={e => setTitle(e.target.value)} />
      <textarea className="eval-textarea" placeholder="Escribe tu mensaje aquí…" rows={4} value={body} onChange={e => setBody(e.target.value)} />
      <div className="forum-new-actions">
        <button className="btn-cancel" onClick={() => { setOpen(false); setErr(''); }}>Cancelar</button>
        <button className="btn-save" onClick={submit}>Publicar</button>
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

  const likes = F.postLikes(post.id);
  const iLiked = likes.includes(myId);

  const onPin = () => { F.togglePin(groupId, post.id); onChange(); };
  const onDelete = () => {
    if (confirm('¿Eliminar esta publicación?')) { F.deletePost(groupId, post.id); onChange(); }
  };
  const onLike = () => { F.toggleLike(post.id, myId); onChange(); };
  const onMute = () => {
    const days = parseInt(prompt(`Silenciar a ${post.authorName} por cuántos días?`, '3') || '0', 10);
    if (!days || days < 1) return;
    F.setMute(post.authorId, new Date(Date.now() + days*86400000).toISOString());
    onChange();
  };
  const onUnmute = () => { F.setMute(post.authorId, null); onChange(); };

  const submitReply = () => {
    if (!replyBody.trim()) return;
    const { STUDENTS } = window.JUCUM_DATA;
    const me = isTeacher
      ? { id: 'teacher', name: 'Profesor', role: 'teacher' }
      : (() => { const s = STUDENTS.find(s => s.id === myId); return { id: s.id, name: s.fullName, role: 'student' }; })();
    if (!isTeacher && F.isMuted(me.id)) { alert('Estás silenciado.'); return; }
    F.addReply(groupId, post.id, {
      authorId: me.id, authorName: me.name, authorRole: me.role,
      body: replyBody.trim(),
    });
    setReplyBody(''); setShowReply(false); onChange();
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

      <div className="fpost-actions">
        <button className={`fp-like ${iLiked ? 'on' : ''}`} onClick={onLike}>
          {iLiked ? '❤️' : '🤍'} {likes.length || ''}
        </button>
        <button className="fp-reply" onClick={() => setShowReply(s => !s)}>
          💬 {post.replies?.length || 0} respuesta{(post.replies?.length || 0) === 1 ? '' : 's'}
        </button>
      </div>

      {(post.replies?.length > 0 || showReply) && (
        <div className="fpost-replies">
          {(post.replies || []).map(r => (
            <ReplyRow key={r.id} reply={r} post={post} user={user} groupId={groupId} onChange={onChange} isTeacher={isTeacher} />
          ))}
          {showReply && (
            <div className="freply-new">
              <textarea className="eval-textarea" rows={2} placeholder="Escribe tu respuesta…" value={replyBody} onChange={e => setReplyBody(e.target.value)} />
              <div className="forum-new-actions">
                <button className="btn-cancel" onClick={() => { setShowReply(false); setReplyBody(''); }}>Cancelar</button>
                <button className="btn-save" onClick={submitReply}>Responder</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReplyRow({ reply, post, user, groupId, onChange, isTeacher }) {
  const F = window.JUCUM_FORUM;
  const onDelete = () => {
    if (confirm('¿Eliminar esta respuesta?')) { F.deleteReply(groupId, post.id, reply.id); onChange(); }
  };
  const isTeacherReply = reply.authorRole === 'teacher';
  const initials = reply.authorName.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase();
  return (
    <div className="freply">
      <div className={`fpost-ava sm ${isTeacherReply ? 't' : ''}`}>{isTeacherReply ? '👨‍🏫' : initials}</div>
      <div className="freply-body">
        <div className="fpost-author sm">
          {reply.authorName}
          {isTeacherReply && <span className="fpost-role">PROFESOR</span>}
          <span className="fpost-date sm"> · {relativeTime(reply.date)}</span>
        </div>
        <div className="fpost-body sm">{reply.body}</div>
      </div>
      {isTeacher && (
        <button className="ftool del sm" onClick={onDelete} title="Eliminar">🗑</button>
      )}
    </div>
  );
}

function MutedList({ groupId, onChange }) {
  const F = window.JUCUM_FORUM;
  const { STUDENTS } = window.JUCUM_DATA;
  const mutes = F.getMutes();
  const muted = Object.entries(mutes).filter(([id, until]) => {
    if (new Date(until) <= new Date()) return false;
    const s = STUDENTS.find(st => st.id === id);
    return s && s.group === groupId;
  });
  if (muted.length === 0) return null;
  return (
    <div className="scard" style={{marginTop:14}}>
      <div className="sec-head"><div className="sec-title">🔇 Alumnos silenciados</div></div>
      {muted.map(([id, until]) => {
        const s = STUDENTS.find(st => st.id === id);
        const days = Math.ceil((new Date(until) - new Date()) / 86400000);
        return (
          <div key={id} className="muted-row">
            <span><b>{s?.fullName}</b> @{s?.username}</span>
            <span className="muted-until">Hasta {new Date(until).toLocaleDateString('es-PE')} · {days}d restantes</span>
            <button className="att-btn" onClick={() => { F.setMute(id, null); onChange(); }}>🔊 Desbloquear</button>
          </div>
        );
      })}
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

Object.assign(window, { Forum, NewPostBox, PostCard, ReplyRow, MutedList });
