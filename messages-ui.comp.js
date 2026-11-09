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
  /* CHAT-MEJORAS-V1 (09-nov-2026) · día y hora SIEMPRE en hora Perú (UTC−5), aunque el equipo tenga otra zona */
  const PE_OFF = 5 * 3600000;
  const DOW = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MON = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const msOf = x => typeof x === 'number' ? x : Date.parse(x || '');
  const peDate = x => { const ms = msOf(x); return isNaN(ms) ? null : new Date(ms - PE_OFF); };   // leer con getUTC*
  const dayKey = x => { const d = peDate(x); return d ? d.getUTCFullYear() + '-' + (d.getUTCMonth() + 1) + '-' + d.getUTCDate() : ''; };
  const fmtT = iso => { const d = peDate(iso); if (!d) return ''; const h = d.getUTCHours(); return (h % 12 || 12) + ':' + String(d.getUTCMinutes()).padStart(2, '0') + (h < 12 ? ' a. m.' : ' p. m.'); };
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  const dayLabel = iso => {
    const d = peDate(iso); if (!d) return '';
    const k = dayKey(iso); if (k === dayKey(Date.now())) return 'Hoy'; if (k === dayKey(Date.now() - 864e5)) return 'Ayer';
    const now = peDate(Date.now());
    return cap(DOW[d.getUTCDay()].slice(0, 3)) + ' ' + d.getUTCDate() + ' ' + MON[d.getUTCMonth()].slice(0, 3) + (d.getUTCFullYear() !== now.getUTCFullYear() ? ' ' + d.getUTCFullYear() : '');
  };
  const fullT = iso => { const d = peDate(iso); return d ? cap(DOW[d.getUTCDay()]) + ' ' + d.getUTCDate() + ' de ' + MON[d.getUTCMonth()] + ' de ' + d.getUTCFullYear() + ' · ' + fmtT(iso) + ' (hora Perú)' : ''; };
  const listWhen = iso => { const ms = msOf(iso); if (isNaN(ms)) return ''; const k = dayKey(ms); if (k === dayKey(Date.now())) return fmtT(iso); if (k === dayKey(Date.now() - 864e5)) return 'Ayer'; const d = peDate(ms); return Date.now() - ms < 6 * 864e5 ? cap(DOW[d.getUTCDay()].slice(0, 3)) : d.getUTCDate() + ' ' + MON[d.getUTCMonth()].slice(0, 3); };
  const waitLbl = iso => { const m = Math.max(1, Math.round((Date.now() - msOf(iso)) / 60000)); return m < 60 ? m + ' min' : m < 1440 ? Math.round(m / 60) + ' h' : Math.round(m / 1440) + ' d'; };
  const EMO = ['👍', '❤️', '😂', '😮', '👏', '✅'];
  const TOUCH = (() => { try { return window.matchMedia('(hover: none)').matches; } catch (e) { return false; } })();
  const emitChat = () => { try { window.dispatchEvent(new Event('jucum-chat-change')); } catch (e) {} };
  (function chatCss() {
    if (document.getElementById('jchat-css')) return;
    const st = document.createElement('style'); st.id = 'jchat-css';
    st.textContent = '@keyframes jchatPop{from{transform:scale(.9);opacity:0}to{transform:none;opacity:1}}@keyframes jchatWave{0%,100%{transform:rotate(0)}25%{transform:rotate(-10deg)}75%{transform:rotate(10deg)}}@keyframes jchatGlow{50%{transform:scale(1.25);opacity:.6}}@keyframes jchatBeat{50%{transform:scale(1.04)}}@keyframes jchatPulse{0%{box-shadow:0 0 0 0 rgba(225,25,48,.7)}100%{box-shadow:0 0 0 10px rgba(225,25,48,0)}}@keyframes jchatUp{from{transform:translateY(16px);opacity:0}to{transform:none;opacity:1}}';
    document.head.appendChild(st);
  })();
  /* Un solo sondeo del chat por pestaña (contador del menú + burbuja + tarjeta del alumno).
   * every = cada cuánto (0 = solo al volver a la pestaña) · gap = mínimo entre dos lecturas. */
  const chatPoll = (() => {
    const subs = new Set(); let iv = null, busy = false, last = Date.now(), cfg = null;
    const notify = () => subs.forEach(f => { try { f(); } catch (e) {} });
    const tick = async () => {
      if (busy || document.visibilityState !== 'visible' || Date.now() - last < cfg.gap) return;
      busy = true; last = Date.now();
      try { if (M().refresh) await M().refresh(); } catch (e) {}
      busy = false; notify();
    };
    const onVis = () => tick();
    return {
      sub(f, opt) {
        subs.add(f);
        if (!cfg) {
          cfg = Object.assign({ every: 30000, gap: 8000 }, opt || {});
          if (cfg.every) iv = setInterval(tick, cfg.every);
          window.addEventListener('focus', onVis); document.addEventListener('visibilitychange', onVis); window.addEventListener('jucum-chat-change', notify);
        }
        return () => {
          subs.delete(f); if (subs.size) return;
          clearInterval(iv); iv = null; cfg = null;
          window.removeEventListener('focus', onVis); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('jucum-chat-change', notify);
        };
      },
    };
  })();
  function useChatTick(opt) {
    const [, setT] = useState(0);
    useEffect(() => chatPoll.sub(() => setT(t => t + 1), opt), []);
  }
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
    const taRef = useRef(null); const lp = useRef(null);
    const [hoverId, setHoverId] = useState(null);
    const [pickFor, setPickFor] = useState(null);
    const myKey = sender === 'teacher' ? 'teacher' : meId;
    const rerender = () => force(n => n + 1);
    const seen = () => { M().markRead(threadKey, sender, meId); if (sender === 'student' && !isGroup && M().markReactionsSeen) M().markReactionsSeen(meId); emitChat(); };
    const grow = () => { const el = taRef.current; if (!el) return; el.style.height = 'auto'; el.style.height = Math.min(120, el.scrollHeight + 3) + 'px'; };
    useEffect(grow, [text]);
    useEffect(() => { if (pickFor == null) return; const off = () => setPickFor(null); document.addEventListener('click', off); return () => document.removeEventListener('click', off); }, [pickFor]);
    const startLP = id => { clearTimeout(lp.current); lp.current = setTimeout(() => setPickFor(id), 450); };
    const endLP = () => clearTimeout(lp.current);
    const doReact = async (m, e) => { setPickFor(null); await M().react(m.id, myKey, e); rerender(); emitChat(); };
    const whoLbl = (k, full) => k === myKey ? 'Tú' : k === 'teacher' ? 'Teacher' : (full ? nameOf(k) : String(nameOf(k)).split(' ')[0]);
    const groupRx = r => { const g = {}; Object.keys(r || {}).forEach(k => { (g[r[k]] = g[r[k]] || []).push(k); }); return Object.keys(g).map(e => ({ e, keys: g[e], mine: g[e].indexOf(myKey) >= 0, label: g[e].length > 1 ? String(g[e].length) : whoLbl(g[e][0]), names: g[e].map(k => whoLbl(k, true)) })); };
    const scroll = () => setTimeout(() => { const el = bodyRef.current; if (el) el.scrollTop = el.scrollHeight; }, 60);

    useEffect(() => {
      let alive = true;
      (async () => { if (M().refresh) await M().refresh(); if (!alive) return; seen(); rerender(); scroll(); })();
      const iv = setInterval(async () => { if (M().refresh) await M().refresh(); if (alive) { seen(); rerender(); } }, 12000);
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
      setText(''); setPending(null); setBusy(false); rerender(); scroll(); emitChat();
    };

    const thread = M().listThread(threadKey);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 320 }}>
        <div ref={bodyRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8, background: '#FBFAF7' }}>
          {thread.length === 0 && <div style={{ margin: 'auto', textAlign: 'center', color: '#999', fontWeight: 700, fontSize: 13, maxWidth: 270, lineHeight: 1.5 }}>{sender === 'student' ? '✉️ Escríbele a tu teacher. Puedes adjuntar foto, video o mandar una nota de voz 🎤' : 'Escribe el primer mensaje de este chat.'}</div>}
          {thread.map((m, i) => {
            const mine = isGroup ? (m.authorId === meId || (sender === 'teacher' && m.sender === 'teacher')) : m.sender === sender;
            const who = m.sender === 'teacher' ? 'Teacher' : (m.authorName || nameOf(m.studentId));
            const sep = i === 0 || dayKey(thread[i - 1].created_at) !== dayKey(m.created_at);
            const rx = groupRx(m.reactions);
            const canR = !mine;
            const near = hoverId === m.id || pickFor === m.id;
            return (
              <React.Fragment key={m.id}>
                {sep && <div style={{ alignSelf: 'center', fontSize: 11, fontWeight: 900, color: '#6b6453', background: '#EFEAE0', borderRadius: 10, padding: '3px 11px', margin: '6px 0 2px' }}>{dayLabel(m.created_at)}</div>}
                <div onMouseEnter={canR ? () => setHoverId(m.id) : undefined} onMouseLeave={canR ? () => setHoverId(h => h === m.id ? null : h) : undefined} style={{ maxWidth: '82%', alignSelf: mine ? 'flex-end' : 'flex-start', display: 'flex', flexDirection: 'column', gap: 3, alignItems: mine ? 'flex-end' : 'flex-start' }}>
                  {isGroup && !mine && <span style={{ fontSize: 10.5, fontWeight: 800, color: m.sender === 'teacher' ? '#1F3A8A' : '#B23A77', padding: '0 4px' }}>{m.sender === 'teacher' ? '👨‍🏫 ' : ''}{who}</span>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative', maxWidth: '100%' }}>
                    <div onTouchStart={canR ? () => startLP(m.id) : undefined} onTouchEnd={endLP} onTouchMove={endLP} onContextMenu={canR && TOUCH ? e => e.preventDefault() : undefined} style={{ minWidth: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: (m.body ? '9px 13px' : '6px'), borderRadius: 15, fontSize: 13.5, lineHeight: 1.5, background: mine ? '#1F3A8A' : '#fff', color: mine ? '#fff' : 'var(--text,#2A2A2A)', border: mine ? 'none' : '1px solid var(--border,#E8E5DC)', borderBottomRightRadius: mine ? 5 : 15, borderBottomLeftRadius: mine ? 15 : 5 }}>
                      {m.body}
                      <MediaBubble url={m.mediaUrl} kind={m.mediaKind} onZoom={onZoom} />
                    </div>
                    {canR && <button type="button" onClick={e => { e.stopPropagation(); setPickFor(p => p === m.id ? null : m.id); }} title="Reaccionar" style={{ width: 28, height: 28, padding: 0, borderRadius: '50%', border: '1px solid #E3DCC9', background: '#fff', cursor: 'pointer', fontSize: 14, flexShrink: 0, color: '#6b6453', opacity: near ? 1 : TOUCH ? .5 : 0, transition: 'opacity .15s' }}>☺</button>}
                    {pickFor === m.id && (
                      <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', bottom: 'calc(100% + 4px)', left: 0, display: 'flex', gap: 2, background: '#fff', border: '1px solid #E3DCC9', borderRadius: 22, padding: 4, boxShadow: '0 6px 18px rgba(13,27,90,.16)', zIndex: 5 }}>
                        {EMO.map(e => <button key={e} type="button" onClick={() => doReact(m, e)} style={{ border: 'none', background: (m.reactions || {})[myKey] === e ? '#EAF1FF' : 'none', fontSize: 19, width: 34, height: 34, padding: 0, borderRadius: '50%', cursor: 'pointer' }}>{e}</button>)}
                      </div>
                    )}
                  </div>
                  {rx.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {rx.map(r => <span key={r.e} title={r.names.join(', ') + (r.mine ? ' · toca para quitar la tuya' : '')} onClick={r.mine ? () => doReact(m, r.e) : undefined} style={{ background: '#fff', border: '1px solid ' + (r.mine ? '#9DB2E8' : '#E3DCC9'), borderRadius: 12, padding: '1px 7px', fontSize: 13, display: 'inline-flex', gap: 3, alignItems: 'center', cursor: r.mine ? 'pointer' : 'default', boxShadow: '0 1px 2px rgba(0,0,0,.06)' }}>{r.e}<small style={{ fontSize: 10, fontWeight: 900, color: '#6b6453' }}>{r.label}</small></span>)}
                    </div>
                  )}
                  <span title={fullT(m.created_at)} style={{ fontSize: 10, color: '#B0AAA0', fontWeight: 700 }}>{fmtT(m.created_at)}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
        {pending && <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#EAF1FF', borderTop: '1px solid #C6D8F5', fontSize: 12.5, fontWeight: 700, color: '#1F3A8A' }}>{ico(pending.kind)} {pending.name} listo para enviar<button onClick={() => setPending(null)} style={{ marginLeft: 'auto', border: 'none', background: '#1F3A8A', color: '#fff', width: 20, height: 20, borderRadius: '50%', cursor: 'pointer', fontSize: 11 }}>✕</button></div>}
        {voice.recording && <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#FDECEC', borderTop: '1px solid #F3C9C9', fontSize: 12.5, fontWeight: 800, color: '#C0392B' }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#E11930', animation: 'jwave 1s infinite' }}></span>Grabando nota de voz… {voice.secs}s<button onClick={voice.stop} style={{ marginLeft: 'auto', border: 'none', background: '#C0392B', color: '#fff', borderRadius: 16, padding: '6px 14px', fontFamily: 'inherit', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>■ Detener y adjuntar</button></div>}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7, padding: '11px 13px', borderTop: '1px solid var(--border,#E8E5DC)', background: '#fff' }}>
          <input ref={fileRef} type="file" accept="image/*,video/*,audio/*" onChange={e => onPicked(e.target.files && e.target.files[0])} style={{ display: 'none' }} />
          <button onClick={() => fileRef.current && fileRef.current.click()} disabled={busy} title="Adjuntar foto, video o audio" style={{ width: 38, height: 38, borderRadius: '50%', border: '1.5px solid var(--border,#E8E5DC)', background: '#fff', fontSize: 16, cursor: 'pointer', flexShrink: 0 }}>📎</button>
          <button onClick={() => voice.recording ? voice.stop() : voice.start()} disabled={busy} title="Nota de voz" style={{ width: 38, height: 38, borderRadius: '50%', border: '1.5px solid ' + (voice.recording ? '#C0392B' : 'var(--border,#E8E5DC)'), background: voice.recording ? '#FDECEC' : '#fff', fontSize: 16, cursor: 'pointer', flexShrink: 0 }}>🎤</button>
          {/* CHAT-MEJORAS-V1: Enter = nueva línea · se envía con ➤ o Ctrl/⌘ + Enter */}
          <textarea ref={taRef} rows={1} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); doSend(); } }} placeholder="Escribe un mensaje…" style={{ flex: 1, minWidth: 0, border: '1.5px solid var(--border,#E8E5DC)', borderRadius: 20, padding: '10px 15px', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, outline: 'none', resize: 'none', height: 42, maxHeight: 120, overflowY: 'auto', lineHeight: 1.45, display: 'block' }} />
          <button onClick={doSend} disabled={busy} title="Enviar" style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg,#1F3A8A,#0D1B5A)', color: '#fff', fontSize: 16, cursor: 'pointer', flexShrink: 0, opacity: busy ? .6 : 1 }}>{busy ? '…' : '➤'}</button>
        </div>
        {!TOUCH && <div style={{ fontSize: 10.5, fontWeight: 700, color: '#9a917e', padding: '0 13px 7px', marginTop: -5, background: '#fff', textAlign: 'right' }}>Enter = nueva línea · Ctrl + Enter o ➤ para enviar</div>}
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
    const [pf, setPf] = useState('all');   // CHAT-MEJORAS-V1: all · pend (⏳ por responder)
    const { GROUPS, LEVELS, STUDENTS } = JD();
    useEffect(() => { let a = true; (async () => { if (M().refresh) await M().refresh(); if (a) force(n => n + 1); })(); const iv = setInterval(async () => { if (M().refresh) { await M().refresh(); force(n => n + 1); } }, 15000); return () => { a = false; clearInterval(iv); }; }, []);
    useEffect(() => { const f = () => force(n => n + 1); window.addEventListener('jucum-chat-change', f); return () => window.removeEventListener('jucum-chat-change', f); }, []);

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
    const pendN = inbox.filter(t => t.pending).length;
    if (pf === 'pend') inbox = inbox.filter(t => t.pending);

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
              <div style={{ display: 'flex', gap: 5 }}>
                {[['all', 'Todos'], ['pend', '⏳ Por responder' + (pendN ? ' (' + pendN + ')' : '')]].map(([k, l]) => (
                  <button key={k} type="button" onClick={() => setPf(k)} style={{ border: '1.5px solid ' + (pf === k ? '#1F3A8A' : 'var(--border)'), background: pf === k ? '#1F3A8A' : '#fff', color: pf === k ? '#fff' : '#666', borderRadius: 16, padding: '5px 10px', fontFamily: 'inherit', fontSize: 11.5, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>{l}</button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 7, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {inbox.length === 0 && (pf === 'pend'
                ? <div style={{ padding: 22, textAlign: 'center', color: '#2E7D32', fontWeight: 800, fontSize: 12.5, lineHeight: 1.5 }}>🎉 Respondiste a todos.</div>
                : <div style={{ padding: 22, textAlign: 'center', color: '#999', fontWeight: 700, fontSize: 12.5, lineHeight: 1.5 }}>Sin chats aún.<br/>Toca ＋ para escribirle a un alumno o crear un grupo.</div>)}
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
                        {last.created_at && <span title={fullT(last.created_at)} style={{ marginLeft: 'auto', fontSize: 10.5, fontWeight: 800, color: t.unread ? '#E11930' : '#9a917e', whiteSpace: 'nowrap', flexShrink: 0 }}>{listWhen(last.created_at)}</span>}
                      </span>
                      <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-soft)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{isG ? `${(t.memberIds || []).length} integrantes` + (prev ? ` · ${prev}` : '') : (prev || 'Sin mensajes aún')}</span>
                    </span>
                    {t.unread > 0
                      ? <span style={{ background: '#E11930', color: '#fff', fontSize: 10.5, fontWeight: 800, borderRadius: 12, padding: '2px 7px', flexShrink: 0 }}>{t.unread}</span>
                      : t.pending ? <span title="El último mensaje es del alumno y aún no le respondes (una reacción también cuenta como atendido)" style={{ background: '#FFE9B8', color: '#8A5300', fontSize: 10, fontWeight: 900, borderRadius: 8, padding: '2px 6px', flexShrink: 0, whiteSpace: 'nowrap' }}>⏳ {waitLbl(t.waitSince)}</span> : null}
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
                <ChatThread threadKey={open} groupId={openInfo.kind === 'dm' ? ((STUDENTS.find(x => x.id === open) || {}).group || null) : null} sender="teacher" meId="teacher" meName="Teacher" isGroup={openInfo.kind === 'group'} onZoom={setZoom} />
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
            <div style={{ fontSize: 12.5, color: 'var(--text-soft)', fontWeight: 700 }}>Habla con tu teacher{threads.length > 1 ? ' y tus grupos de trabajo' : ''} · foto, video o nota de voz 🎤</div>
          </div>
        </div>
        {threads.length > 1 && (
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
            {threads.map(t => (
              <button key={t.key} onClick={() => { setOpen(t.key); force(n => n + 1); }} style={{ position: 'relative', border: '1.5px solid ' + (open === t.key ? '#1F3A8A' : 'var(--border)'), background: open === t.key ? '#1F3A8A' : '#fff', color: open === t.key ? '#fff' : 'var(--text-soft)', fontFamily: 'inherit', fontWeight: 800, fontSize: 12.5, borderRadius: 18, padding: '8px 14px', cursor: 'pointer' }}>
                {t.kind === 'teacher' ? '👨‍🏫 Teacher' : `👥 ${t.name}`}
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

  /* ── CHAT-MEJORAS-V1 · Teacher: «💬 Chats» del menú con contador que se actualiza solo (late si llega algo) ── */
  function TeacherChatsNav({ active, onOpen }) {
    useChatTick({ every: 30000, gap: 8000 });
    const n = M().unreadForTeacher();
    const prev = useRef(n); const [beat, setBeat] = useState(0);
    useEffect(() => { if (n > prev.current) setBeat(b => b + 1); prev.current = n; }, [n]);
    return (
      <a className={`nav-link ${active ? 'active' : ''}`} href="#" onClick={e => { e.preventDefault(); onOpen(); }} style={{ position: 'relative' }}>💬 Chats{n > 0 && <span key={beat} className="nav-dot" style={beat ? { animation: 'jchatPulse 1.6s ease-out 2' } : undefined}>{n > 9 ? '9+' : n}</span>}</a>
    );
  }

  /* ── CHAT-MEJORAS-V1 · Teacher: burbuja flotante «N alumnos esperan respuesta» (fuera de Chats) ── */
  const FAB_OFF = 'jucum_chat_fab_off_v1';
  function TeacherChatFab({ hidden, onOpen }) {
    useChatTick({ every: 30000, gap: 8000 });
    const [off, setOff] = useState(() => { try { return localStorage.getItem(FAB_OFF) || ''; } catch (e) { return ''; } });
    const pend = M().pendingForTeacher ? M().pendingForTeacher() : [];
    if (hidden || !pend.length) return null;
    const newest = pend.reduce((a, t) => ((t.last || {}).created_at || '') > a ? t.last.created_at : a, '');
    if (off && newest <= off) return null;
    const unread = M().unreadForTeacher();
    const close = e => { e.stopPropagation(); try { localStorage.setItem(FAB_OFF, newest); } catch (x) {} setOff(newest); };
    const first = String(nameOf(pend[0].key)).split(' ')[0];
    return ReactDOM.createPortal(
      <div role="button" onClick={() => onOpen(pend[0].key)} title="Abrir el chat que lleva más tiempo esperando" style={{ position: 'fixed', right: 18, bottom: 18, zIndex: 900, display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1.5px solid #F3B5BD', borderRadius: 30, padding: '7px 10px 7px 7px', boxShadow: '0 8px 24px rgba(13,27,90,.22)', cursor: 'pointer', maxWidth: 'calc(100vw - 36px)', animation: 'jchatUp .35s ease-out', fontFamily: 'inherit' }}>
        <span style={{ display: 'flex', flexShrink: 0 }}>
          {pend.slice(0, 3).map((t, i) => <span key={t.key} style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#3F5BB8,#0D1B5A)', color: '#fff', fontSize: 10.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', marginLeft: i ? -9 : 0 }}>{ini(nameOf(t.key))}</span>)}
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <b style={{ fontSize: 13, color: '#0D1B5A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pend.length === 1 ? first + ' espera tu respuesta' : pend.length + ' alumnos esperan respuesta'}</b>
          <small style={{ fontSize: 11, fontWeight: 700, color: '#8a7f6a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{unread ? unread + ' sin leer · ' : ''}{first} espera hace {waitLbl(pend[0].waitSince)} · toca para responder</small>
        </span>
        <button type="button" onClick={close} title="Ocultar hasta el próximo mensaje" style={{ border: 'none', background: '#F1EEE6', width: 22, height: 22, borderRadius: '50%', fontSize: 10, cursor: 'pointer', color: '#6b6453', flexShrink: 0, padding: 0 }}>✕</button>
      </div>, document.body);
  }

  /* ── CHAT-MEJORAS-V1 · Alumno: tarjeta vistosa en Inicio «¡Tu teacher te respondió!» (estilo A).
   * Sale mientras haya respuestas sin leer o reacciones nuevas del teacher en su chat 1:1; al abrir el chat
   * desaparece. ✕ = ocultar hasta la próxima respuesta. Lee la nube al entrar y al volver a la pestaña. ── */
  function StudentReplyCard({ student, onOpen }) {
    useChatTick({ every: 0, gap: 120000 });
    const offKey = 'jucum_reply_card_off_' + (student && student.id);
    const [off, setOff] = useState(() => { try { return localStorage.getItem(offKey) || ''; } catch (e) { return ''; } });
    if (!student || !M().teacherNewsFor) return null;
    const nw = M().teacherNewsFor(student.id);
    if (!nw.replies.length && !nw.reactions.length) return null;
    const sig = (nw.last ? nw.last.id : '') + '|' + nw.reactions.map(x => x.sig).join(',');
    if (off === sig) return null;
    const close = () => { try { localStorage.setItem(offKey, sig); } catch (e) {} setOff(sig); };
    const rx = nw.reactions[nw.reactions.length - 1];
    const n = nw.replies.length;
    const title = n > 1 ? '¡Tu teacher te respondió ' + n + ' mensajes!' : n ? '¡Tu teacher te respondió!' : '¡Tu teacher reaccionó a tu mensaje!';
    const cut = (s, k) => (s || '').length > k ? s.slice(0, k).trim() + '…' : (s || '');
    const body = nw.last ? (nw.last.body ? cut(nw.last.body, 220) : ico(nw.last.mediaKind) + ' Te envió ' + (nw.last.mediaKind === 'audio' ? 'una nota de voz' : nw.last.mediaKind === 'image' ? 'una foto' : nw.last.mediaKind === 'video' ? 'un video' : 'un adjunto')) : '';
    return (
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, padding: 16, marginBottom: 14, background: 'linear-gradient(135deg,#2A4BC4,#0D1B5A)', color: '#fff', display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 10px 26px rgba(13,27,90,.32)', animation: 'jchatPop .5s cubic-bezier(.2,1.4,.4,1)' }}>
        <span style={{ position: 'absolute', width: 170, height: 170, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,214,90,.55),transparent 70%)', top: -60, right: -40, animation: 'jchatGlow 2.4s ease-in-out infinite', pointerEvents: 'none' }}></span>
        <button type="button" onClick={close} title="Ahora no" style={{ position: 'absolute', top: 10, right: 10, border: 'none', background: 'rgba(255,255,255,.18)', color: '#fff', width: 26, height: 26, borderRadius: '50%', cursor: 'pointer', fontSize: 11, padding: 0, zIndex: 1 }}>✕</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, position: 'relative', paddingRight: 30 }}>
          <span style={{ width: 50, height: 50, borderRadius: '50%', background: '#FFD65A', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 27, flexShrink: 0, boxShadow: '0 0 0 4px rgba(255,214,90,.3)', animation: 'jchatWave 1.4s ease-in-out infinite', transformOrigin: '50% 90%' }}>👨‍🏫</span>
          <span style={{ minWidth: 0 }}>
            <b style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: 19, lineHeight: 1.15, display: 'block' }}>{title}</b>
            <small style={{ fontSize: 12, fontWeight: 800, color: '#C9D6FF' }}>{nw.last ? dayLabel(nw.last.created_at) + ' · ' + fmtT(nw.last.created_at) : 'Mira lo que te dijo'}</small>
          </span>
        </div>
        {nw.last && (
          <div style={{ background: '#fff', color: '#2A2A2A', borderRadius: '14px 14px 14px 5px', padding: '10px 13px', fontSize: 13.5, fontWeight: 700, lineHeight: 1.45, position: 'relative', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {body}
            {nw.askedTo && nw.askedTo.body && <small style={{ display: 'block', fontSize: 10.5, fontWeight: 800, color: '#9a917e', marginTop: 4, whiteSpace: 'normal' }}>Respuesta a: «{cut(nw.askedTo.body, 70)}»</small>}
          </div>
        )}
        {rx && <div style={{ fontSize: 12.5, fontWeight: 800, color: '#FFE9A8', position: 'relative' }}>{rx.emoji} {n ? 'Y reaccionó' : 'Reaccionó'} a tu mensaje{rx.body ? ' «' + cut(rx.body, 50) + '»' : ''}</div>}
        <button type="button" onClick={onOpen} style={{ border: 'none', background: '#FFD65A', color: '#0D1B5A', borderRadius: 12, padding: 12, fontFamily: 'inherit', fontWeight: 900, fontSize: 14.5, cursor: 'pointer', position: 'relative', animation: 'jchatBeat 1.8s ease-in-out infinite' }}>💬 Leer y responder</button>
      </div>
    );
  }

  Object.assign(window, { StudentMessages, TeacherMessages, TeacherChatsNav, TeacherChatFab, StudentReplyCard });
})();
