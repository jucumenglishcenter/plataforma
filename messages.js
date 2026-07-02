/* messages.js · Mensajes alumno ⇄ profesor (chat con adjuntos)
 * ───────────────────────────────────────────────────────────────────────────
 * Un hilo por alumno. Persistencia en Supabase (tabla `messages`) con caché
 * local para respuesta inmediata. Los adjuntos (foto/video/audio) se suben al
 * bucket `jucum-media`. Si no hay nube (modo demo), funciona solo en local.
 *
 * API global window.JUCUM_MSG:
 *   listThread(studentId) -> [msg]                (ordenados por fecha)
 *   listInbox()           -> [{studentId, last, unread}]   (para el profesor)
 *   send(studentId, groupId, sender, {body, mediaUrl, mediaKind}) -> msg
 *   uploadMedia(file)     -> {url, kind}          (sube al bucket)
 *   markRead(studentId, reader)                   reader: 'teacher' | 'student'
 *   unreadForTeacher()    -> nº total sin leer del profesor
 *   unreadForStudent(id)  -> nº sin leer del alumno
 *   refresh()             -> recarga desde la nube (devuelve promesa)
 */
(function () {
  'use strict';
  var CACHE_KEY = 'jucum_messages_v1';
  var cache = load();

  function load() { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]'); } catch (e) { return []; } }
  function save() { try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (e) {} }
  function sb() { return window.JUCUM_SB ? window.JUCUM_SB.getClient() : null; }
  function byDate(a, b) { return (a.created_at || '').localeCompare(b.created_at || ''); }

  /* Normaliza una fila (nube usa snake_case; la UI usa lo mismo) */
  function norm(r) {
    return {
      id: r.id, studentId: r.student_id || r.studentId, groupId: r.group_id || r.groupId,
      sender: r.sender, body: r.body || '', mediaUrl: r.media_url || r.mediaUrl || null,
      mediaKind: r.media_kind || r.mediaKind || null, created_at: r.created_at,
      teacher_read: !!(r.teacher_read), student_read: !!(r.student_read),
    };
  }

  async function refresh() {
    var c = sb(); if (!c) return cache;
    try {
      var res = await c.from('messages').select('*');
      if (res.error) throw res.error;
      cache = (res.data || []).map(norm);
      save();
    } catch (e) { console.warn('JUCUM_MSG refresh:', e.message); }
    return cache;
  }

  function listThread(studentId) {
    return cache.filter(m => m.studentId === studentId).sort(byDate);
  }

  function listInbox() {
    var byStudent = {};
    cache.forEach(m => {
      var t = byStudent[m.studentId] || (byStudent[m.studentId] = { studentId: m.studentId, groupId: m.groupId, last: null, unread: 0 });
      if (!t.last || byDate(t.last, m) < 0) t.last = m;
      if (m.sender === 'student' && !m.teacher_read) t.unread++;
    });
    return Object.values(byStudent).sort((a, b) => byDate(b.last || {}, a.last || {}));
  }

  function unreadForTeacher() { return cache.filter(m => m.sender === 'student' && !m.teacher_read).length; }
  function unreadForStudent(studentId) { return cache.filter(m => m.studentId === studentId && m.sender === 'teacher' && !m.student_read).length; }

  async function uploadMedia(file) {
    var kind = file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'file';
    var c = sb();
    if (!c) { // sin nube: data URL local (demo)
      var durl = await new Promise(res => { var fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(file); });
      return { url: durl, kind: kind };
    }
    var ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    var path = 'msg/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    var up = await c.storage.from('jucum-media').upload(path, file, { upsert: false, contentType: file.type });
    if (up.error) throw up.error;
    var pub = c.storage.from('jucum-media').getPublicUrl(path);
    return { url: pub.data.publicUrl, kind: kind };
  }

  async function send(studentId, groupId, sender, payload) {
    payload = payload || {};
    var msg = {
      id: 'm-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      student_id: studentId, group_id: groupId || null, sender: sender,
      body: payload.body || '', media_url: payload.mediaUrl || null, media_kind: payload.mediaKind || null,
      created_at: new Date().toISOString(),
      teacher_read: sender === 'teacher', student_read: sender === 'student',
    };
    cache.push(norm(msg)); save();
    var c = sb();
    if (c) { try { var r = await c.from('messages').insert(msg); if (r.error) throw r.error; } catch (e) { console.warn('JUCUM_MSG send:', e.message); } }
    // Aviso en la campanita del destinatario
    try {
      if (window.JUCUM_NOTIF) {
        if (sender === 'student') { /* al profesor no hay campanita por alumno; usa la bandeja */ }
        else window.JUCUM_NOTIF.pushNotif(studentId, { type: 'message', title: '✉️ Nuevo mensaje del profesor', body: (payload.body || 'Te envió un adjunto').slice(0, 80), link: 'messages' });
      }
    } catch (e) {}
    return norm(msg);
  }

  async function markRead(studentId, reader) {
    var col = reader === 'teacher' ? 'teacher_read' : 'student_read';
    var changed = [];
    cache.forEach(m => { if (m.studentId === studentId && m[col] === false) { m[col] = true; changed.push(m.id); } });
    if (!changed.length) return; save();
    var c = sb();
    if (c) { try { var patch = {}; patch[col] = true; await c.from('messages').update(patch).eq('student_id', studentId).eq(reader === 'teacher' ? 'sender' : 'sender', reader === 'teacher' ? 'student' : 'teacher'); } catch (e) { console.warn('JUCUM_MSG markRead:', e.message); } }
  }

  window.JUCUM_MSG = { refresh, listThread, listInbox, send, uploadMedia, markRead, unreadForTeacher, unreadForStudent };
  if (sb()) refresh();
})();
