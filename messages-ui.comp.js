/* messages-ui.jsx · Chat "Hablemos" (alumno) + "Chats" (profesor) · v2
 * ───────────────────────────────────────────────────────────────────────────
 * Profesor: barra lateral tipo mensajería (buscador, filtro por grupo,
 *   no-leídos arriba, chip del grupo del alumno), ＋ nuevo chat (alumno o
 *   grupo de trabajo), hilo a la derecha.
 * Alumno: "Hablemos" — su chat con el profesor + los grupos donde está.
 * Ambos: foto/video/audio, 🎤 nota de voz grabada, clic en imagen = lightbox.
 * Usa window.JUCUM_MSG (messages.js). Exporta: StudentMessages, TeacherMessages. */
(function () {
  const { useState, useEffect, useRef, useCallback } = React;
  const M_STUB = { refresh: async () => [], listThread: () => [], listInbox: () => [], listThreadsForStudent: () => [], createGroupThread: async () => null, threadInfo: () => null, isGroupThread: () => false, send: async () => null, uploadMedia: async () => { throw new Error('El módulo de mensajes no está instalado (falta messages.js).'); }, markRead: () => {}, unreadForTeacher: () => 0, unreadForStudent: () => 0, unreadForThread: () => 0 };
  const M = () => window.JUCUM_MSG || M_STUB;
  const JD = () => window.JUCUM_DATA || { STUDENTS: [], GROUPS: [], LEVELS: {} };

  const ico = k => k === 'image' ? '🖼️' : k === 'video' ? '🎥' : k === 'audio' ? '🎤' : '📎';
  const nameOf = sid => { const s = JD().STUDENTS.find(x => x.id === sid); return s ? s.fullName : sid; };
  const groupChip = sid => {
    const s = JD().STUDENTS.find(x => x.id === sid); if (!s) return null;
    const g = JD().GROUPS.find(x => x.id === s.group); if (!g) return null;
    const lv = JD().LEVELS[g.level] || {};
    return { label: `${lv.emoji || ''} ${lv.code || ''}`.trim(), name: g.name, color: lv.color || '#999', dark: lv.dark || '#555' };
  };
  const fmtT = iso => { try { const d = new Date(iso); return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); } catch (e) { return ''; } };
  const ini = n => (n || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  /* ── Lightbox: ver la imagen/video en grande ── */
  function Lightbox({ item, onClose }) {
    if (!item) return null;
    return ReactDOM.createPortal(
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,14,25,.88)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 16, width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.15)', color: '#fff', fontSize: 17, fontWeight: 800, cursor: 'pointer' }}>✕</button>
        {item.kind === 'video'
          ? <video src={item.url} controls autoPlay style={{ maxWidth: '92vw', maxHeight: '86vh', borderRadius: 14 }} onClick={e => e.stopPropagation()} />
          : <img src={item.url} alt="" style={{ maxWidth: '92vw', maxHeight: '86vh', borderRadius: 14, objectFit: 'contain' }} onClick={e => e.stopPropagation()} />}
      </div>, document.body);
  }

  function MediaBubble({ url, kind, onZoom }) {
    if (!url) return null;
    if (kind === 'image') return <img src={url} alt="" onClick={() => onZoom && onZoom({ url, kind })} title="Toca para ver en grande" style={{ maxWidth: 210, borderRadius: 12, display: 'block', marginTop: 6, cursor: 'zoom-in' }} />;
    if (kind === 'video') return (
      <div style={{ position: 'relative', marginTop: 6 }}>
        <video src={url} style={{ maxWidth: 220, borderRadius: 12, display: 'block' }} />
        <button onClick={() => onZoom && onZoom({ url, kind })} title="Ver en grande" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.25)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 30, cursor: 'pointer' }}>▶</button>
      </div>
    );
    if (kind === 'audio') return <audio src={url} controls style={{ marginTop: 6, maxWidth: 235, height: 38 }} />;
    return <a href={url} target="_blank" rel="noopener" style={{ display: 'inline-block', marginTop: 6, fontWeight: 800 }}>📎 Ver adjunto</a>;
  }

  /* ── Grabadora de nota de voz (🎤) ── */
  function useVoiceRecorder(onFile) {
    const [rec, setRec] = useState(null);
    const [secs, setSecs] = useState(0);
    const chunks = useRef([]); const timer = useRef(null);
    const start = async () => {
      if (!navigator.mediaDevices || !window.MediaRecorder) { alert('Tu navegador no permite grabar audio. Usa 📎 para adjuntar un audio.'); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mr = new MediaRecorder(stream);
        chunks.current = [];
        mr.ondataavailable = e => { if (e.data && e.data.size) chunks.current.push(e.data); };
        mr.onstop = () => {
          stream.getTracks().forEach(t => t.stop());
          const blob = new Blob(chunks.current, { type: mr.mimeType || 'audio/webm' });
          onFile(new File([blob], 'nota-de-voz.webm', { type: blob.type || 'audio/webm' }));
        };
        mr.start(); setRec(mr); setSecs(0);
        timer.current = setInterval(() => setSecs(s => s + 1), 1000);
      } catch (e) { alert('No se pudo usar el micrófono: ' + e.message); }
    };
    const stop = () => { try { rec && rec.stop(); } catch (e) {} setRec(null); clearInterval(timer.current); };
    return { recording: !!rec, secs, start, stop };
  }

  /* ── Hilo de chat (compartido alumno/profesor, 1:1 o grupo) ── */
  function ChatThread({ threadKey, groupId, sender, meId, meName, heightVh, isGroup, onZoom }) {
    const [, force] = useState(0);
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    const [pending, setPending] = useState(null);
    const bodyRef = useRef(null); const fileRef = useRef(null);
    const rerender = () => force(n => n + 1);
    const scroll = () => setTimeout(() => { const el = bodyRef.current; if (el) el.scrollTop = el.scrollHeight; }, 60);

    useEffect(() => {
      let alive = true;
      (async () => { if (M().refresh) await M().refresh(); if (!alive) return; M().markRead(threadKey, sender, meId); rerender(); scroll(); })();
      const iv = setInterval(async () => { if (M().refresh) await M().refresh(); if (alive) { M().markRead(threadKey, sender, meId); rerender(); } }, 12000);
      return () => { alive = false; clearInterval(iv); };
    }, [threadKey]);

    const onPicked = async (f) => {
      if (!f) return;
      setBusy(true);
      try { const up = await M().uploadMedia(f); setPending({ ...up, name: f.name || 'adjunto' }); }
      catch (err) { alert('No se pudo subir: ' + err.message); }
      setBusy(false); if (fileRef.current) fileRef.current.value = '';
    };
    const voice = useVoiceRecorder(onPicked);

    const doSend = async () => {
      if (!text.trim() && !pending) return;
      setBusy(true);
      await M().send(threadKey, groupId, sender, { body: text.trim(), mediaUrl: pending ? pending.url : null, mediaKind: pending ? pending.kind : null, authorId: meId, authorName: meName });
      setText(''); setPending(null); setBusy(false); rerender(); scroll();
    };

    const thread = M().listThread(threadKey);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 320 }}>
        <div ref={bodyRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8, background: '#FBFAF7' }}>
          {thread.length === 0 && <div style={{ margin: 'auto', textAlign: 'center', color: '#999', fontWeight: 700, fontSize: 13, maxWidth: 270, lineHeight: 1.5 }}>{sender === 'student' ? '✉️ Escríbele a tu profesor. Puedes adjuntar foto, video o mandar una nota de voz 🎤' : 'Escribe el primer mensaje de este chat.'}</div>}
          {thread.map(m => {
            const mine = isGroup ? (m.authorId === meId || (sender === 'teacher' && m.sender === 'teacher')) : m.sender === sender;
            const who = m.sender === 'teacher' ? 'Profesor' : (m.authorName || nameOf(m.studentId));
            return (
              <div key={m.id} style={{ maxWidth: '82%', alignSelf: mine ? 'flex-end' : 'flex-start', display: 'flex', flexDirection: 'column', gap: 3, alignItems: mine ? 'flex-end' : 'flex-start' }}>
                {isGroup && !mine && <span style={{ fontSize: 10.5, fontWeight: 800, color: m.sender === 'teacher' ? '#1F3A8A' : '#B23A77', padding: '0 4px' }}>{m.sender === 'teacher' ? '👨‍🏫 ' : ''}{who}</span>}
                <div style={{ padding: (m.body ? '9px 13px' : '6px'), borderRadius: 15, fontSize: 13.5, lineHeight: 1.5, background: mine ? '#1F3A8A' : '#fff', color: mine ? '#fff' : 'var(--text,#2A2A2A)', border: mine ? 'none' : '1px solid var(--border,#E8E5DC)', borderBottomRightRadius: mine ? 5 : 15, borderBottomLeftRadius: mine ? 15 : 5 }}>
                  {m.body}
                  <MediaBubble url={m.mediaUrl} kind={m.mediaKind} onZoom={onZoom} />
                </div>
                <span style={{ fontSize: 10, color: '#B0AAA0', fontWeight: 700 }}>{fmtT(m.created_at)}</span>
              </div>
            );
          })}
        </div>
        {pending && <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#EAF1FF', borderTop: '1px solid #C6D8F5', fontSize: 12.5, fontWeight: 700, color: '#1F3A8A' }}>{ico(pending.kind)} {pending.name} listo para enviar<button onClick={() => setPending(null)} style={{ marginLeft: 'auto', border: 'none', background: '#1F3A8A', color: '#fff', width: 20, height: 20, borderRadius: '50%', cursor: 'pointer', fontSize: 11 }}>✕</button></div>}
        {voice.recording && <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#FDECEC', borderTop: '1px solid #F3C9C9', fontSize: 12.5, fontWeight: 800, color: '#C0392B' }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#E11930', animation: 'jwave 1s infinite' }}></span>Grabando nota de voz… {voice.secs}s<button onClick={voice.stop} style={{ marginLeft: 'auto', border: 'none', background: '#C0392B', color: '#fff', borderRadius: 16, padding: '6px 14px', fontFamily: 'inherit', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>■ Detener y adjuntar</button></div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '11px 13px', borderTop: '1px solid var(--border,#E8E5DC)', background: '#fff' }}>
          <input ref={fileRef} type="file" accept="image/*,video/*,audio/*" onChange={e => onPicked(e.target.files && e.target.files[0])} style={{ display: 'none' }} />
          <button onClick={() => fileRef.current && fileRef.current.click()} disabled={busy} title="Adjuntar foto, video o audio" style={{ width: 38, height: 38, borderRadius: '50%', border: '1.5px solid var(--border,#E8E5DC)', background: '#fff', fontSize: 16, cursor: 'pointer', flexShrink: 0 }}>📎</button>
          <button onClick={() => voice.recording ? voice.stop() : voice.start()} disabled={busy} title="Nota de voz" style={{ width: 38, height: 38, borderRadius: '50%', border: '1.5px solid ' + (voice.recording ? '#C0392B' : 'var(--border,#E8E5DC)'), background: voice.recording ? '#FDECEC' : '#fff', fontSize: 16, cursor: 'pointer', flexShrink: 0 }}>🎤</button>
          <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') doSend(); }} placeholder="Escribe un mensaje…" style={{ flex: 1, minWidth: 0, border: '1.5px solid var(--border,#E8E5DC)', borderRadius: 20, padding: '10px 15px', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, outline: 'none' }} />
          <button onClick={doSend} disabled={busy} style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg,#1F3A8A,#0D1B5A)', color: '#fff', fontSize: 16, cursor: 'pointer', flexShrink: 0, opacity: busy ? .6 : 1 }}>{busy ? '…' : '➤'}</button>
        </div>
      </div>
    );
  }

  /* ── Modal: nuevo chat (elegir alumno) o nuevo grupo de trabajo ── */
  function NewChatModal({ onClose, onOpenDm, onCreatedGroup }) {
    const [mode, setMode] = useState('dm');       // dm · group
    const [q, setQ] = useState('');
    const [sel, setSel] = useState(() => new Set());
    const [gname, setGname] = useState('');
    const [busy, setBusy] = useState(false);
    const { STUDENTS, GROUPS, LEVELS } = JD();
    const match = s => (s.fullName + ' ' + s.username).toLowerCase().includes(q.trim().toLowerCase());
    const toggle = id => setSel(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const createGroup = async () => {
      if (!gname.trim() || sel.size < 2) { alert('Ponle nombre al grupo y elige al menos 2 alumnos.'); return; }
      setBusy(true);
      const t = await M().createGroupThread(gname.trim(), [...sel]);
      setBusy(false); if (t) onCreatedGroup(t.id);
    };
    return ReactDOM.createPortal(
      <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 5000 }}>
        <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
          <div className="modal-head">
            <div className="modal-title">💬 Nuevo chat</div>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body" style={{ gap: 10 }}>
            <div style={{ display: 'inline-flex', background: '#EFECE3', borderRadius: 12, padding: 4, gap: 4, alignSelf: 'flex-start' }}>
              <button onClick={() => setMode('dm')} style={{ border: 'none', background: mode === 'dm' ? '#fff' : 'none', color: mode === 'dm' ? '#1F3A8A' : '#777', fontFamily: 'inherit', fontWeight: 800, fontSize: 12.5, padding: '8px 14px', borderRadius: 9, cursor: 'pointer', boxShadow: mode === 'dm' ? '0 1px 3px rgba(0,0,0,.14)' : 'none' }}>👤 Con un alumno</button>
              <button onClick={() => setMode('group')} style={{ border: 'none', background: mode === 'group' ? '#fff' : 'none', color: mode === 'group' ? '#1F3A8A' : '#777', fontFamily: 'inherit', fontWeight: 800, fontSize: 12.5, padding: '8px 14px', borderRadius: 9, cursor: 'pointer', boxShadow: mode === 'group' ? '0 1px 3px rgba(0,0,0,.14)' : 'none' }}>👥 Grupo de trabajo</button>
            </div>
            {mode === 'group' && <input className="input-text" placeholder="Nombre del grupo (ej. Proyecto Módulo 2)" value={gname} onChange={e => setGname(e.target.value)} />}
            <input className="input-text" placeholder="🔍 Buscar alumno…" value={q} onChange={e => setQ(e.target.value)} />
            <div style={{ maxHeight: '38vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {GROUPS.map(g => {
                const lv = LEVELS[g.level] || {};
                const members = STUDENTS.filter(s => s.group === g.id).filter(match);
                if (!members.length) return null;
                return (
                  <div key={g.id}>
                    <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--text-soft)', margin: '2px 0 6px' }}>{lv.emoji} {lv.code} · {g.name}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {members.map(s => (
                        <button key={s.id} onClick={() => mode === 'dm' ? onOpenDm(s.id) : toggle(s.id)} style={{ display: 'flex', alignItems: 'center', gap: 9, textAlign: 'left', cursor: 'pointer', border: '1.5px solid ' + (sel.has(s.id) && mode === 'group' ? '#1F3A8A' : 'var(--border)'), background: sel.has(s.id) && mode === 'group' ? '#F4F7FE' : '#fff', borderRadius: 10, padding: '8px 11px', font: 'inherit' }}>
                          {mode === 'group' && <span style={{ width: 19, height: 19, borderRadius: 6, flexShrink: 0, border: '2px solid ' + (sel.has(s.id) ? '#1F3A8A' : '#cdc4ad'), background: sel.has(s.id) ? '#1F3A8A' : '#fff', color: '#fff', fontSize: 12, fontWeight: 900, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{sel.has(s.id) ? '✓' : ''}</span>}
                          <span style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg,${lv.color || '#999'}80,${lv.dark || '#555'})`, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11 }}>{ini(s.fullName)}</span>
                          <span style={{ flex: 1, minWidth: 0 }}><span style={{ fontWeight: 800, fontSize: 13 }}>{s.fullName}</span><span style={{ display: 'block', fontSize: 11, color: 'var(--text-soft)', fontWeight: 600 }}>@{s.username}</span></span>
                          {mode === 'dm' && <span style={{ fontSize: 12, fontWeight: 800, color: '#1F3A8A' }}>Abrir chat →</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {mode === 'group' && (
            <div className="modal-actions">
              <button className="btn-cancel" onClick={onClose}>Cancelar</button>
              <button className="btn-save" disabled={busy} onClick={createGroup}>{busy ? '…' : `👥 Crear grupo (${sel.size})`}</button>
            </div>
          )}
        </div>
      </div>, document.body);
  }

  /* ── Profesor · Chats (barra lateral + hilo) ── */
  function TeacherMessages({ onBack, initialOpen }) {
    const [, force] = useState(0);
    const [open, setOpen] = useState(initialOpen || null);
    const [q, setQ] = useState('');
    const [gFilter, setGFilter] = useState('all');
    const [showNew, setShowNew] = useState(false);
    const [zoom, setZoom] = useState(null);
    const { GROUPS, LEVELS, STUDENTS } = JD();
    useEffect(() => { let a = true; (async () => { if (M().refresh) await M().refresh(); if (a) force(n => n + 1); })(); const iv = setInterval(async () => { if (M().refresh) { await M().refresh(); force(n => n + 1); } }, 15000); return () => { a = false; clearInterval(iv); }; }, []);

    let inbox = M().listInbox();
    // + alumnos sin conversación aún NO se listan (se agregan con ＋), pero sí filtro/búsqueda:
    inbox = inbox.filter(t => {
      if (t.kind === 'dm') {
        const s = STUDENTS.find(x => x.id === t.key);
        const name = s ? (s.fullName + ' ' + s.username) : t.key;
        if (q.trim() && !name.toLowerCase().includes(q.trim().toLowerCase())) return false;
        if (gFilter !== 'all' && (!s || s.group !== gFilter)) return false;
        return true;
      }
      if (q.trim() && !(t.name || '').toLowerCase().includes(q.trim().toLowerCase())) return false;
      return gFilter === 'all';
    });

    const openInfo = open ? (M().isGroupThread(open) ? { kind: 'group', t: M().threadInfo(open) } : { kind: 'dm', s: STUDENTS.find(x => x.id === open) }) : null;

    return (
      <main style={{ maxWidth: 1160 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <button className="back-btn" onClick={onBack} style={{ marginBottom: 0 }}>← Volver al panel</button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 24, margin: 0 }}>💬 Chats</h1>
            <div style={{ fontSize: 12.5, color: 'var(--text-soft)', fontWeight: 700 }}>Conversa con tus alumnos · texto, foto, video y nota de voz</div>
          </div>
        </div>

        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', background: '#fff', height: '68vh', minHeight: 430, boxShadow: '0 2px 4px rgba(0,0,0,.06)' }}>
          {/* barra lateral */}
          <aside style={{ width: 305, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: '#FDFCF9' }}>
            <div style={{ padding: '11px 12px 8px', display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 7 }}>
                <input placeholder="🔍 Buscar chat…" value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1, minWidth: 0, border: '1.5px solid var(--border)', borderRadius: 10, padding: '8px 11px', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, outline: 'none', background: '#fff' }} />
                <button onClick={() => setShowNew(true)} title="Nuevo chat o grupo" style={{ width: 37, height: 37, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#1F3A8A,#0D1B5A)', color: '#fff', fontSize: 17, fontWeight: 800, cursor: 'pointer', flexShrink: 0 }}>＋</button>
              </div>
              <select value={gFilter} onChange={e => setGFilter(e.target.value)} style={{ fontFamily: 'inherit', fontWeight: 800, fontSize: 12, color: '#1F3A8A', border: '1.5px solid var(--border)', borderRadius: 9, padding: '7px 9px', cursor: 'pointer', background: '#fff' }}>
                <option value="all">Todos los grupos</option>
                {GROUPS.map(g => <option key={g.id} value={g.id}>{(LEVELS[g.level] || {}).code} · {g.name}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 7, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {inbox.length === 0 && <div style={{ padding: 22, textAlign: 'center', color: '#999', fontWeight: 700, fontSize: 12.5, lineHeight: 1.5 }}>Sin chats aún.<br/>Toca ＋ para escribirle a un alumno o crear un grupo.</div>}
              {inbox.map(t => {
                const isG = t.kind === 'group';
                const nm = isG ? t.name : nameOf(t.key);
                const chip = isG ? null : groupChip(t.key);
                const last = t.last || {};
                const prev = (last.body || (last.mediaKind ? ico(last.mediaKind) + ' adjunto' : '')).slice(0, 42);
                const on = open === t.key;
                return (
                  <button key={t.key} onClick={() => { setOpen(t.key); force(n => n + 1); }} style={{ display: 'flex', alignItems: 'center', gap: 9, textAlign: 'left', cursor: 'pointer', border: 'none', background: on ? '#EAF1FF' : (t.unread ? '#F4F7FE' : 'none'), borderRadius: 11, padding: '9px 10px', font: 'inherit', width: '100%' }}>
                    <span style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: isG ? 'linear-gradient(135deg,#7B1FA2,#4A0E63)' : 'linear-gradient(135deg,#3F5BB8,#0D1B5A)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: isG ? 16 : 12 }}>{isG ? '👥' : ini(nm)}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nm}</span>
                        {chip && <span style={{ fontSize: 9, fontWeight: 800, color: chip.dark, background: chip.color + '22', border: `1px solid ${chip.color}55`, borderRadius: 8, padding: '1px 6px', whiteSpace: 'nowrap', flexShrink: 0 }}>{chip.label}</span>}
                      </span>
                      <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-soft)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{isG ? `${(t.memberIds || []).length} integrantes` + (prev ? ` · ${prev}` : '') : (prev || 'Sin mensajes aún')}</span>
                    </span>
                    {t.unread > 0 && <span style={{ background: '#E11930', color: '#fff', fontSize: 10.5, fontWeight: 800, borderRadius: 12, padding: '2px 7px', flexShrink: 0 }}>{t.unread}</span>}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* hilo */}
          <section style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {!open && <div style={{ margin: 'auto', textAlign: 'center', color: '#999', fontWeight: 700, fontSize: 13.5, lineHeight: 1.6, padding: 20 }}><div style={{ fontSize: 42, marginBottom: 8 }}>💬</div>Elige un chat de la izquierda<br/>o toca ＋ para empezar uno nuevo.</div>}
            {open && openInfo && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 15px', borderBottom: '1px solid var(--border)', background: '#fff' }}>
                  <span style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: openInfo.kind === 'group' ? 'linear-gradient(135deg,#7B1FA2,#4A0E63)' : 'linear-gradient(135deg,#3F5BB8,#0D1B5A)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: openInfo.kind === 'group' ? 15 : 12 }}>{openInfo.kind === 'group' ? '👥' : ini(nameOf(open))}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: 15 }}>{openInfo.kind === 'group' ? (openInfo.t || {}).name : nameOf(open)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-soft)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {openInfo.kind === 'group'
                        ? ((openInfo.t || {}).memberIds || []).map(nameOf).join(', ')
                        : (groupChip(open) ? `${groupChip(open).label} · ${groupChip(open).name}` : '@' + ((STUDENTS.find(x => x.id === open) || {}).username || ''))}
                    </div>
                  </div>
                </div>
                <ChatThread threadKey={open} groupId={openInfo.kind === 'dm' ? ((STUDENTS.find(x => x.id === open) || {}).group || null) : null} sender="teacher" meId="teacher" meName="Profesor" isGroup={openInfo.kind === 'group'} onZoom={setZoom} />
              </>
            )}
          </section>
        </div>

        {showNew && <NewChatModal onClose={() => setShowNew(false)} onOpenDm={(sid) => { setShowNew(false); setOpen(sid); force(n => n + 1); }} onCreatedGroup={(tid) => { setShowNew(false); setOpen(tid); force(n => n + 1); }} />}
        <Lightbox item={zoom} onClose={() => setZoom(null)} />
      </main>
    );
  }

  /* ── Alumno · "Hablemos" (profesor + sus grupos de trabajo) ── */
  function StudentMessages({ student, onBack }) {
    const [, force] = useState(0);
    const [open, setOpen] = useState(student.id);
    const [zoom, setZoom] = useState(null);
    useEffect(() => { let a = true; (async () => { if (M().refresh) await M().refresh(); if (a) force(n => n + 1); })(); const iv = setInterval(async () => { if (M().refresh) { await M().refresh(); force(n => n + 1); } }, 15000); return () => { a = false; clearInterval(iv); }; }, []);
    const threads = M().listThreadsForStudent(student.id);
    const isG = M().isGroupThread(open);
    return (
      <main>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          {onBack && <button className="back-btn" onClick={onBack} style={{ marginBottom: 0 }}>← Mi panel</button>}
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 24, margin: 0 }}><span className="jwave" style={{ display: 'inline-block' }}>👨‍🏫</span> Hablemos</h1>
            <div style={{ fontSize: 12.5, color: 'var(--text-soft)', fontWeight: 700 }}>Habla con tu profesor{threads.length > 1 ? ' y tus grupos de trabajo' : ''} · foto, video o nota de voz 🎤</div>
          </div>
        </div>
        {threads.length > 1 && (
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
            {threads.map(t => (
              <button key={t.key} onClick={() => { setOpen(t.key); force(n => n + 1); }} style={{ position: 'relative', border: '1.5px solid ' + (open === t.key ? '#1F3A8A' : 'var(--border)'), background: open === t.key ? '#1F3A8A' : '#fff', color: open === t.key ? '#fff' : 'var(--text-soft)', fontFamily: 'inherit', fontWeight: 800, fontSize: 12.5, borderRadius: 18, padding: '8px 14px', cursor: 'pointer' }}>
                {t.kind === 'teacher' ? '👨‍🏫 Profesor' : `👥 ${t.name}`}
                {t.unread > 0 && <span className="nav-dot">{t.unread > 9 ? '9+' : t.unread}</span>}
              </button>
            ))}
          </div>
        )}
        <div style={{ border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', background: '#fff', height: '62vh', minHeight: 400, boxShadow: '0 2px 4px rgba(0,0,0,.06)', display: 'flex', flexDirection: 'column' }}>
          <ChatThread threadKey={open} groupId={student.group} sender="student" meId={student.id} meName={student.fullName} isGroup={isG} onZoom={setZoom} />
        </div>
        <Lightbox item={zoom} onClose={() => setZoom(null)} />
      </main>
    );
  }

  Object.assign(window, { StudentMessages, TeacherMessages });
})();
