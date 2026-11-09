/* messages.js · Chat alumno ⇄ profesor + grupos de chat (v2)
 * ───────────────────────────────────────────────────────────────────────────
 * Hilos:
 *   • 1 a 1  → clave = id del alumno (student_id de la fila)
 *   • grupo  → clave = 'gc-…' (fila en chat_threads con name + member_ids)
 * Persistencia en Supabase (messages / chat_threads) con caché local.
 * Adjuntos (foto/video/audio) → bucket `jucum-media`.
 * Sin nube (demo) funciona solo en local.
 *
 * API global window.JUCUM_MSG:
 *   refresh()                              recarga mensajes + hilos de la nube
 *   listThread(threadKey)                  mensajes de un hilo (orden fecha)
 *   listInbox()                            [profesor] hilos 1:1 + grupos, no-leídos primero
 *   listThreadsForStudent(sid)             [alumno] su 1:1 + grupos donde está
 *   createGroupThread(name, memberIds)     crea grupo de chat (profesor)
 *   threadInfo(threadKey)                  {name, memberIds} si es grupo
 *   isGroupThread(threadKey)
 *   send(threadKey, groupId, sender, {body, mediaUrl, mediaKind, authorId, authorName})
 *   uploadMedia(file) -> {url, kind}
 *   markRead(threadKey, reader, readerId)  reader: 'teacher' | 'student'
 *   unreadForTeacher() / unreadForStudent(sid) / unreadForThread(key, reader, readerId)
 *   CHAT-MEJORAS-V1 (09-nov-2026):
 *   react(msgId, who, emoji)               reacción (who = 'teacher' | id del alumno); mismo emoji otra vez = quitar
 *   pendingForTeacher()                    hilos «por responder» (último mensaje del alumno, ≤14 días, sin reacción del teacher)
 *   teacherNewsFor(sid)                    [alumno] respuestas sin leer + reacciones nuevas del teacher en su 1:1
 *   markReactionsSeen(sid)
 */
(function () {
  'use strict';
  var CACHE_KEY = 'jucum_messages_v1';
  var THREADS_KEY = 'jucum_chat_threads_v1';
  var cache = load(CACHE_KEY, []);
  var threads = load(THREADS_KEY, []);

  function load(k, dflt) { try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(dflt)); } catch (e) { return dflt; } }
  function save() { try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); localStorage.setItem(THREADS_KEY, JSON.stringify(threads)); } catch (e) {} }
  function sb() { return window.JUCUM_SB ? window.JUCUM_SB.getClient() : null; }
  function byDate(a, b) { return (a.created_at || '').localeCompare(b.created_at || ''); }
  function isGroupThread(key) { return typeof key === 'string' && key.indexOf('gc-') === 0; }

  function norm(r) {
    return {
      id: r.id, studentId: r.student_id || r.studentId, groupId: r.group_id || r.groupId,
      sender: r.sender, body: r.body || '', mediaUrl: r.media_url || r.mediaUrl || null,
      mediaKind: r.media_kind || r.mediaKind || null, created_at: r.created_at,
      authorId: r.author_id || r.authorId || null, authorName: r.author_name || r.authorName || null,
      teacher_read: !!(r.teacher_read), student_read: !!(r.student_read),
      reactions: parseR(r.reactions),
    };
  }
  function parseR(x) { try { var o = typeof x === 'string' ? JSON.parse(x) : x; return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; } catch (e) { return {}; } }
  function normT(r) {
    var members = [];
    try { members = typeof r.member_ids === 'string' ? JSON.parse(r.member_ids) : (r.member_ids || r.memberIds || []); } catch (e) {}
    return { id: r.id, name: r.name || 'Grupo', memberIds: members, created_at: r.created_at };
  }

  async function refresh() {
    var c = sb(); if (!c) return cache;
    try {
      /* Paginado: Supabase corta todo select en 1000 filas; el chat crece rápido
       * y sin paginar los mensajes MÁS NUEVOS quedarían fuera. */
      var PAGE = 1000, rows = [], from = 0;
      while (true) {
        var res = await c.from('messages').select('*').order('id', { ascending: true }).range(from, from + PAGE - 1);
        if (res.error) throw res.error;
        rows = rows.concat(res.data || []);
        if (!res.data || res.data.length < PAGE) break;
        from += PAGE;
      }
      cache = rows.map(norm);
      try {
        var rt = await c.from('chat_threads').select('*');
        if (!rt.error) threads = (rt.data || []).map(normT);
      } catch (e2) {} // tabla aún no creada → solo 1:1
      save();
      try { window.dispatchEvent(new Event('jucum-chat-change')); } catch (e3) {}   // CHAT-MEJORAS-V1: contador y avisos se repintan
    } catch (e) { console.warn('JUCUM_MSG refresh:', e.message); }
    return cache;
  }

  function listThread(key) { return cache.filter(m => m.studentId === key).sort(byDate); }
  function threadInfo(key) { return threads.find(t => t.id === key) || null; }
  function listGroupThreadsFor(sid) { return threads.filter(t => (t.memberIds || []).indexOf(sid) >= 0); }

  /* ── no-leídos ── */
  var seenKey = (uid, tid) => 'jucum_chat_seen_' + uid + '_' + tid;
  function lastSeen(uid, tid) { try { return localStorage.getItem(seenKey(uid, tid)) || ''; } catch (e) { return ''; } }
  function unreadForThread(key, reader, readerId) {
    var msgs = listThread(key);
    if (reader === 'teacher') return msgs.filter(m => m.sender === 'student' && !m.teacher_read).length;
    if (isGroupThread(key)) { var s = lastSeen(readerId, key); return msgs.filter(m => (m.created_at || '') > s && m.authorId !== readerId).length; }
    return msgs.filter(m => m.sender === 'teacher' && !m.student_read).length;
  }
  function unreadForTeacher() { return cache.filter(m => m.sender === 'student' && !m.teacher_read).length; }
  function unreadForStudent(sid) {
    var n = unreadForThread(sid, 'student', sid);
    listGroupThreadsFor(sid).forEach(t => { n += unreadForThread(t.id, 'student', sid); });
    return n;
  }

  /* ── bandeja del profesor: 1:1 con mensajes + TODOS los grupos ── */
  function listInbox() {
    var map = {};
    cache.forEach(m => {
      if (isGroupThread(m.studentId)) return;
      var t = map[m.studentId] || (map[m.studentId] = { key: m.studentId, kind: 'dm', groupId: m.groupId, last: null, unread: 0 });
      if (!t.last || byDate(t.last, m) < 0) t.last = m;
      if (m.sender === 'student' && !m.teacher_read) t.unread++;
    });
    var rows = Object.values(map);
    threads.forEach(t => {
      var msgs = listThread(t.id);
      rows.push({ key: t.id, kind: 'group', name: t.name, memberIds: t.memberIds, last: msgs[msgs.length - 1] || null, unread: msgs.filter(m => m.sender === 'student' && !m.teacher_read).length });
    });
    // grupos de trabajo: los alumnos conversan entre ellos, no se cuentan como «por responder»
    rows.forEach(r => { var w = r.kind === 'dm' ? waitInfo(r.key) : null; r.pending = !!w; r.waitSince = w ? w.since : null; });
    rows.sort((a, b) => (b.unread > 0 ? 1 : 0) - (a.unread > 0 ? 1 : 0) || byDate(a.last || { created_at: a.created_at || '' }, b.last || { created_at: b.created_at || '' }) * -1);
    return rows;
  }

  /* ── CHAT-MEJORAS-V1 · «por responder»: el último mensaje del hilo es de un alumno, de los
   * últimos 14 días, y el teacher no le reaccionó (un 👍 al «gracias» cuenta como atendido). ── */
  var PEND_MS = 14 * 864e5;
  function waitInfo(key) {
    var msgs = listThread(key), last = msgs[msgs.length - 1];
    if (!last || last.sender !== 'student' || (last.reactions || {}).teacher) return null;
    var t = Date.parse(last.created_at || ''); if (!t || Date.now() - t > PEND_MS) return null;
    var i = msgs.length - 1; while (i > 0 && msgs[i - 1].sender === 'student') i--;
    return { since: msgs[i].created_at, last: last, count: msgs.length - i };
  }
  function pendingForTeacher() {
    return listInbox().filter(r => r.pending).sort((a, b) => (a.waitSince || '').localeCompare(b.waitSince || ''));
  }
  /* ── reacciones ── */
  async function react(msgId, who, emoji) {
    var m = cache.find(x => x.id === msgId); if (!m || !who) return null;
    var r = Object.assign({}, m.reactions || {});
    if (!emoji || r[who] === emoji) delete r[who]; else r[who] = emoji;
    m.reactions = r; save();
    var c = sb();
    if (c) { try { var res = await c.from('messages').update({ reactions: r }).eq('id', msgId); if (res.error) throw res.error; } catch (e) { console.warn('JUCUM_MSG react:', e.message, '— ¿corriste el script 39?'); } }
    return r;
  }
  /* ── [alumno] lo nuevo del teacher en su 1:1: respuestas sin leer + reacciones aún no vistas ── */
  var rxKey = sid => 'jucum_chat_rx_seen_' + sid;
  function rxSeen(sid) { try { return JSON.parse(localStorage.getItem(rxKey(sid)) || '[]'); } catch (e) { return []; } }
  function teacherRx(sid) { return listThread(sid).filter(m => m.sender === 'student' && (m.reactions || {}).teacher).map(m => ({ id: m.id, emoji: m.reactions.teacher, body: m.body, sig: m.id + ':' + m.reactions.teacher })); }
  function teacherNewsFor(sid) {
    var msgs = listThread(sid);
    var replies = msgs.filter(m => m.sender === 'teacher' && !m.student_read);
    var seen = rxSeen(sid), rx = teacherRx(sid).filter(x => seen.indexOf(x.sig) < 0);
    var lastReply = replies[replies.length - 1] || null, askedTo = null;
    if (lastReply) { for (var i = msgs.indexOf(lastReply) - 1; i >= 0; i--) { if (msgs[i].sender === 'student') { askedTo = msgs[i]; break; } } }
    return { replies: replies, last: lastReply, askedTo: askedTo, reactions: rx };
  }
  function markReactionsSeen(sid) {
    try { localStorage.setItem(rxKey(sid), JSON.stringify(teacherRx(sid).map(x => x.sig).slice(-60))); } catch (e) {}
  }

  function listThreadsForStudent(sid) {
    var rows = [{ key: sid, kind: 'teacher', name: 'Teacher', unread: unreadForThread(sid, 'student', sid) }];
    listGroupThreadsFor(sid).forEach(t => rows.push({ key: t.id, kind: 'group', name: t.name, memberIds: t.memberIds, unread: unreadForThread(t.id, 'student', sid) }));
    return rows;
  }

  async function createGroupThread(name, memberIds) {
    var t = { id: 'gc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), name: name || 'Grupo', member_ids: JSON.stringify(memberIds || []), created_by: 'teacher', created_at: new Date().toISOString() };
    threads.push(normT(t)); save();
    var c = sb();
    if (c) { try { var r = await c.from('chat_threads').insert(t); if (r.error) throw r.error; } catch (e) { console.warn('JUCUM_MSG createGroupThread:', e.message, '— ¿corriste el script 20?'); } }
    return normT(t);
  }

  async function uploadMedia(file) {
    var kind = file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'file';
    var c = sb();
    if (!c) {
      var durl = await new Promise(res => { var fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(file); });
      return { url: durl, kind: kind };
    }
    var ext = ((file.name || 'audio.webm').split('.').pop() || 'bin').toLowerCase();
    var path = 'msg/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    var up = await c.storage.from('jucum-media').upload(path, file, { upsert: false, contentType: file.type });
    if (up.error) throw up.error;
    var pub = c.storage.from('jucum-media').getPublicUrl(path);
    return { url: pub.data.publicUrl, kind: kind };
  }

  async function send(threadKey, groupId, sender, payload) {
    payload = payload || {};
    var msg = {
      id: 'm-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      student_id: threadKey, group_id: groupId || null, sender: sender,
      body: payload.body || '', media_url: payload.mediaUrl || null, media_kind: payload.mediaKind || null,
      author_id: payload.authorId || (sender === 'teacher' ? 'teacher' : null),
      author_name: payload.authorName || (sender === 'teacher' ? 'Teacher' : null),
      created_at: new Date().toISOString(),
      teacher_read: sender === 'teacher', student_read: sender === 'student',
    };
    cache.push(norm(msg)); save();
    var c = sb();
    if (c) {
      try { var r = await c.from('messages').insert(msg); if (r.error) throw r.error; }
      catch (e) {
        // Compat: si aún no corre el script 20 (sin columnas author_*), reintenta sin ellas
        try { var m2 = Object.assign({}, msg); delete m2.author_id; delete m2.author_name; var r2 = await c.from('messages').insert(m2); if (r2.error) throw r2.error; }
        catch (e2) { console.warn('JUCUM_MSG send:', e2.message); }
      }
    }
    // Campanita de los destinatarios
    try {
      if (window.JUCUM_NOTIF) {
        var title = '✉️ Nuevo mensaje' + (isGroupThread(threadKey) ? ' en ' + ((threadInfo(threadKey) || {}).name || 'tu grupo') : ' del teacher');
        var body = (payload.body || 'Te enviaron un adjunto').slice(0, 80);
        if (isGroupThread(threadKey)) {
          ((threadInfo(threadKey) || {}).memberIds || []).forEach(sid => {
            if (sid !== payload.authorId) window.JUCUM_NOTIF.pushNotif(sid, { type: 'message', title: title, body: body, link: 'messages' });
          });
        } else if (sender === 'teacher') {
          window.JUCUM_NOTIF.pushNotif(threadKey, { type: 'message', title: title, body: body, link: 'messages' });
        }
      }
    } catch (e) {}
    return norm(msg);
  }

  async function markRead(threadKey, reader, readerId) {
    if (reader === 'student' && isGroupThread(threadKey)) {
      try { localStorage.setItem(seenKey(readerId, threadKey), new Date().toISOString()); } catch (e) {}
      return;
    }
    var col = reader === 'teacher' ? 'teacher_read' : 'student_read';
    var fromSender = reader === 'teacher' ? 'student' : 'teacher';
    var changed = false;
    cache.forEach(m => { if (m.studentId === threadKey && m.sender === fromSender && !m[col]) { m[col] = true; changed = true; } });
    if (!changed) return; save();
    var c = sb();
    if (c) { try { var patch = {}; patch[col] = true; await c.from('messages').update(patch).eq('student_id', threadKey).eq('sender', fromSender); } catch (e) { console.warn('JUCUM_MSG markRead:', e.message); } }
  }

  window.JUCUM_MSG = { refresh, listThread, listInbox, listThreadsForStudent, createGroupThread, threadInfo, isGroupThread, send, uploadMedia, markRead, unreadForTeacher, unreadForStudent, unreadForThread, react, pendingForTeacher, teacherNewsFor, markReactionsSeen };
  if (sb()) refresh();
})();
