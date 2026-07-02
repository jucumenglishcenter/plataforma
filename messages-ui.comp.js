/* messages-ui.jsx · UI de Mensajes (alumno ⇄ profesor)
 * Exporta a window: StudentMessages, TeacherMessages.
 * Usa window.JUCUM_MSG (data) y window.JUCUM_DATA (nombres). */
(function () {
  const { useState, useEffect, useRef } = React;
  const M_STUB = { refresh: async () => [], listThread: () => [], listInbox: () => [], send: async () => null, uploadMedia: async () => { throw new Error('El módulo de mensajes no está instalado (falta messages.js).'); }, markRead: () => {}, unreadForTeacher: () => 0, unreadForStudent: () => 0 };
  const M = () => window.JUCUM_MSG || M_STUB;

  const ico = k => k === 'image' ? '🖼️' : k === 'video' ? '🎥' : k === 'audio' ? '🎤' : '📎';

  function MediaBubble({ url, kind }) {
    if (!url) return null;
    if (kind === 'image') return <img src={url} alt="" style={{ maxWidth: 220, borderRadius: 12, display: 'block', marginTop: 6 }} />;
    if (kind === 'video') return <video src={url} controls style={{ maxWidth: 240, borderRadius: 12, display: 'block', marginTop: 6 }} />;
    if (kind === 'audio') return <audio src={url} controls style={{ marginTop: 6, maxWidth: 240 }} />;
    return <a href={url} target="_blank" rel="noopener" style={{ display: 'inline-block', marginTop: 6, fontWeight: 800 }}>📎 Ver adjunto</a>;
  }

  /* Hilo de chat reutilizable. sender = quién escribe ('student'|'teacher'). */
  function ChatThread({ studentId, groupId, sender, heightVh }) {
    const [, force] = useState(0);
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    const [pending, setPending] = useState(null); // {url,kind,name}
    const bodyRef = useRef(null);
    const fileRef = useRef(null);
    const rerender = () => force(n => n + 1);

    useEffect(() => {
      let alive = true;
      const boot = async () => { if (M().refresh) await M().refresh(); if (!alive) return; M().markRead(studentId, sender); rerender(); scroll(); };
      boot();
      const iv = setInterval(async () => { if (M().refresh) await M().refresh(); if (alive) { rerender(); } }, 15000);
      return () => { alive = false; clearInterval(iv); };
    }, [studentId]);

    const scroll = () => setTimeout(() => { const el = bodyRef.current; if (el) el.scrollTop = el.scrollHeight; }, 60);
    const thread = M().listThread(studentId);

    const doSend = async () => {
      if (!text.trim() && !pending) return;
      setBusy(true);
      await M().send(studentId, groupId, sender, { body: text.trim(), mediaUrl: pending ? pending.url : null, mediaKind: pending ? pending.kind : null });
      setText(''); setPending(null); setBusy(false); rerender(); scroll();
    };
    const onFile = async (e) => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      setBusy(true);
      try { const up = await M().uploadMedia(f); setPending({ ...up, name: f.name }); }
      catch (err) { alert('No se pudo subir el archivo: ' + err.message); }
      setBusy(false); if (fileRef.current) fileRef.current.value = '';
    };

    const fmt = (iso) => { try { const d = new Date(iso); return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); } catch (e) { return ''; } };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: (heightVh || 60) + 'vh', minHeight: 380, background: '#fff', border: '1px solid var(--border,#E8E5DC)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,.06)' }}>
        <div ref={bodyRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8, background: '#FBFAF7' }}>
          {thread.length === 0 && <div style={{ margin: 'auto', textAlign: 'center', color: '#999', fontWeight: 700, fontSize: 13, maxWidth: 260, lineHeight: 1.5 }}>{sender === 'student' ? '✉️ Escríbele a tu profesor. Puedes adjuntar foto, video o una nota de voz.' : 'Aún no hay mensajes en este hilo.'}</div>}
          {thread.map(m => {
            const mine = m.sender === sender;
            return (
              <div key={m.id} style={{ maxWidth: '82%', alignSelf: mine ? 'flex-end' : 'flex-start', display: 'flex', flexDirection: 'column', gap: 3, alignItems: mine ? 'flex-end' : 'flex-start' }}>
                <div style={{ padding: m.body ? '9px 13px' : '6px', borderRadius: 15, fontSize: 13.5, lineHeight: 1.5, background: mine ? '#1F3A8A' : '#fff', color: mine ? '#fff' : 'var(--text,#2A2A2A)', border: mine ? 'none' : '1px solid var(--border,#E8E5DC)', borderBottomRightRadius: mine ? 5 : 15, borderBottomLeftRadius: mine ? 15 : 5 }}>
                  {m.body}
                  <MediaBubble url={m.mediaUrl} kind={m.mediaKind} />
                </div>
                <span style={{ fontSize: 10, color: '#B0AAA0', fontWeight: 700 }}>{fmt(m.created_at)}</span>
              </div>
            );
          })}
        </div>
        {pending && <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#EAF1FF', borderTop: '1px solid #C6D8F5', fontSize: 12.5, fontWeight: 700, color: '#1F3A8A' }}>{ico(pending.kind)} {pending.name} listo para enviar <button onClick={() => setPending(null)} style={{ marginLeft: 'auto', border: 'none', background: '#1F3A8A', color: '#fff', width: 20, height: 20, borderRadius: '50%', cursor: 'pointer', fontSize: 11 }}>✕</button></div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 13px', borderTop: '1px solid var(--border,#E8E5DC)', background: '#fff' }}>
          <input ref={fileRef} type="file" accept="image/*,video/*,audio/*" onChange={onFile} style={{ display: 'none' }} />
          <button onClick={() => fileRef.current && fileRef.current.click()} disabled={busy} title="Adjuntar foto, video o audio" style={{ width: 38, height: 38, borderRadius: '50%', border: '1.5px solid var(--border,#E8E5DC)', background: '#fff', fontSize: 17, cursor: 'pointer', flexShrink: 0 }}>📎</button>
          <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') doSend(); }} placeholder="Escribe un mensaje…" style={{ flex: 1, border: '1.5px solid var(--border,#E8E5DC)', borderRadius: 20, padding: '10px 15px', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, outline: 'none' }} />
          <button onClick={doSend} disabled={busy} style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg,#1F3A8A,#0D1B5A)', color: '#fff', fontSize: 16, cursor: 'pointer', flexShrink: 0, opacity: busy ? .6 : 1 }}>{busy ? '…' : '➤'}</button>
        </div>
      </div>
    );
  }

  /* ── Alumno: su hilo con el profesor ── */
  function StudentMessages({ student, onBack }) {
    return (
      <main>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          {onBack && <button className="back-btn" onClick={onBack} style={{ marginBottom: 0 }}>← Mi panel</button>}
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 24, margin: 0 }}>✉️ Mensajes</h1>
            <div style={{ fontSize: 12.5, color: 'var(--text-soft)', fontWeight: 700 }}>Habla directo con tu profesor</div>
          </div>
        </div>
        <ChatThread studentId={student.id} groupId={student.group} sender="student" heightVh={64} />
      </main>
    );
  }

  /* ── Profesor: bandeja + hilo ── */
  function TeacherMessages({ onBack }) {
    const [, force] = useState(0);
    const [openId, setOpenId] = useState(null);
    const STUDENTS = (window.JUCUM_DATA && window.JUCUM_DATA.STUDENTS) || [];
    const nameOf = id => { const s = STUDENTS.find(x => x.id === id); return s ? s.fullName : id; };
    const groupOf = id => { const s = STUDENTS.find(x => x.id === id); return s ? s.group : null; };
    useEffect(() => { let a = true; (async () => { if (M().refresh) await M().refresh(); if (a) force(n => n + 1); })(); const iv = setInterval(async () => { if (M().refresh) { await M().refresh(); force(n => n + 1); } }, 15000); return () => { a = false; clearInterval(iv); }; }, []);
    const inbox = M().listInbox();

    if (openId) {
      const s = STUDENTS.find(x => x.id === openId);
      return (
        <main>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <button className="back-btn" onClick={() => { setOpenId(null); force(n => n + 1); }} style={{ marginBottom: 0 }}>← Bandeja</button>
            <div style={{ flex: 1 }}><h1 style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 22, margin: 0 }}>{s ? s.fullName : openId}</h1><div style={{ fontSize: 12, color: 'var(--text-soft)', fontWeight: 700 }}>@{s ? s.username : ''}</div></div>
          </div>
          <ChatThread studentId={openId} groupId={groupOf(openId)} sender="teacher" heightVh={62} />
        </main>
      );
    }

    return (
      <main>
        {onBack && <button className="back-btn" onClick={onBack}>← Volver al panel</button>}
        <div className="welcome teacher"><div className="welcome-text"><div className="eyebrow">✉️ Mensajes</div><h1>Bandeja de mensajes</h1><p>Conversaciones con tus alumnos · responde con texto, foto, video o audio</p></div></div>
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {inbox.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: '#999', fontWeight: 700 }}>Aún no hay mensajes de tus alumnos.</div>}
          {inbox.map(t => {
            const last = t.last || {};
            const prev = (last.body || (last.mediaKind ? (ico(last.mediaKind) + ' adjunto') : '')).slice(0, 60);
            return (
              <button key={t.studentId} onClick={() => setOpenId(t.studentId)} style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer', border: '1px solid var(--border,#E8E5DC)', background: t.unread ? '#F4F7FE' : '#fff', borderRadius: 12, padding: '12px 14px', font: 'inherit' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#3F5BB8,#0D1B5A)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>{nameOf(t.studentId).split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{nameOf(t.studentId)}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-soft)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{last.sender === 'teacher' ? 'Tú: ' : ''}{prev}</div>
                </div>
                {t.unread > 0 && <span style={{ background: '#E11930', color: '#fff', fontSize: 11, fontWeight: 800, borderRadius: 12, padding: '2px 8px', flexShrink: 0 }}>{t.unread}</span>}
              </button>
            );
          })}
        </div>
      </main>
    );
  }

  Object.assign(window, { StudentMessages, TeacherMessages });
})();
