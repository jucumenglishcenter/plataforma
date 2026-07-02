/* Bloque F · Forum (per-group)
 * Posts and replies stored in localStorage. Multi-tab sync via storage events.
 * Teacher can: pin posts (max 3), delete posts, silence students.
 */

const FORUM_KEY  = 'jucum_forum_v1';
const MUTES_KEY  = 'jucum_mutes_v1';
const LIKES_KEY  = 'jucum_likes_v1';
const FSEEN_KEY  = 'jucum_forum_seen_v1';

/* ── "Visto" del foro por usuario+grupo (para el punto rojo del botón Foro) ── */
function getForumSeen() {
  try { return JSON.parse(localStorage.getItem(FSEEN_KEY) || '{}'); } catch { return {}; }
}
function markForumSeen(userId, groupId) {
  if (!userId || !groupId) return;
  const all = getForumSeen();
  all[userId] = all[userId] || {};
  all[userId][groupId] = new Date().toISOString();
  localStorage.setItem(FSEEN_KEY, JSON.stringify(all));
}
function forumUnreadCount(userId, groupId) {
  if (!userId || !groupId) return 0;
  const seen = (getForumSeen()[userId] || {})[groupId] || '1970-01-01T00:00:00.000Z';
  const forum = getGroupForum(groupId);
  let n = 0;
  (forum.posts || []).forEach(p => {
    if (p.date > seen && p.authorId !== userId) n++;
    (p.replies || []).forEach(r => { if (r.date > seen && r.authorId !== userId) n++; });
  });
  return n;
}
function findPostById(postId) {
  const data = loadForum();
  for (const gid of Object.keys(data)) {
    const p = (data[gid].posts || []).find(p => p.id === postId);
    if (p) return { post: p, groupId: gid };
  }
  return null;
}
function _forumName(userId) {
  if (userId === 'teacher') return 'El profesor';
  try { const s = (window.JUCUM_DATA.STUDENTS || []).find(s => s.id === userId); return s ? s.fullName.split(' ')[0] : 'Alguien'; }
  catch { return 'Alguien'; }
}

function loadForum() {
  try { return JSON.parse(localStorage.getItem(FORUM_KEY) || '{}'); }
  catch { return {}; }
}
function saveForum(data) { localStorage.setItem(FORUM_KEY, JSON.stringify(data)); }

function getMutes() {
  try { return JSON.parse(localStorage.getItem(MUTES_KEY) || '{}'); }
  catch { return {}; }
}
function setMute(studentId, untilISO) {
  const m = getMutes();
  if (untilISO) m[studentId] = untilISO;
  else delete m[studentId];
  localStorage.setItem(MUTES_KEY, JSON.stringify(m));
  if (window.JUCUM_SYNC) window.JUCUM_SYNC.pushMute(studentId, untilISO);
}
function isMuted(studentId) {
  const m = getMutes()[studentId];
  if (!m) return false;
  return new Date(m) > new Date();
}

function getLikes() {
  try { return JSON.parse(localStorage.getItem(LIKES_KEY) || '{}'); }
  catch { return {}; }
}
/* Reacciones: [{u:userId, e:emoji}] por publicación. 1 reacción por usuario
 * (elegir otra la reemplaza). Migra el formato viejo (array de userIds = ❤️). */
function getReactions(postId) {
  const raw = getLikes()[postId] || [];
  return raw.map(x => typeof x === 'string' ? { u: x, e: '❤️' } : x);
}
function toggleReaction(postId, userId, emoji) {
  const all = getLikes();
  let list = (all[postId] || []).map(x => typeof x === 'string' ? { u: x, e: '❤️' } : x);
  const mine = list.find(r => r.u === userId);
  let added = false;
  if (mine && mine.e === emoji) { list = list.filter(r => r.u !== userId); }
  else if (mine) { mine.e = emoji; added = true; }
  else { list.push({ u: userId, e: emoji }); added = true; }
  all[postId] = list;
  localStorage.setItem(LIKES_KEY, JSON.stringify(all));
  if (window.JUCUM_SYNC && window.JUCUM_SYNC.pushLike) window.JUCUM_SYNC.pushLike(postId, userId, added ? emoji : null);
  // Aviso en la campanita del AUTOR cuando reaccionan a SU publicación
  if (added && window.JUCUM_NOTIF) {
    const found = findPostById(postId);
    const p = found && found.post;
    if (p && p.authorId && p.authorId !== userId && p.authorRole === 'student') {
      window.JUCUM_NOTIF.pushNotif(p.authorId, {
        type: 'forum-like',
        title: `${emoji} A ${_forumName(userId)} le gustó tu publicación`,
        body: `Reaccionó a “${p.title}” en el foro.`,
        link: 'forum',
      });
    }
  }
  return list;
}
function toggleLike(postId, userId) { return toggleReaction(postId, userId, '❤️').map(r => r.u); }
function postLikes(postId) {
  return getReactions(postId).map(r => r.u);
}

function getGroupForum(groupId) {
  const data = loadForum();
  return data[groupId] || { posts: [] };
}
function createPost(groupId, post) {
  const data = loadForum();
  data[groupId] = data[groupId] || { posts: [] };
  const newPost = {
    id: 'p-' + Date.now(),
    date: new Date().toISOString(),
    pinned: false,
    replies: [],
    ...post,
  };
  data[groupId].posts.unshift(newPost);
  saveForum(data);
  if (window.JUCUM_SYNC) window.JUCUM_SYNC.pushPost(groupId, newPost);
  return newPost.id;
}
function addReply(groupId, postId, reply) {
  const data = loadForum();
  const p = (data[groupId]?.posts || []).find(p => p.id === postId);
  if (!p) return;
  p.replies = p.replies || [];
  const newReply = {
    id: 'r-' + Date.now(),
    date: new Date().toISOString(),
    ...reply,
  };
  p.replies.push(newReply);
  saveForum(data);
  if (window.JUCUM_SYNC) window.JUCUM_SYNC.pushReply(postId, newReply);
  // Aviso en la campanita del AUTOR cuando responden a SU publicación
  if (window.JUCUM_NOTIF && p.authorId && p.authorId !== reply.authorId && p.authorRole === 'student') {
    const snippet = (reply.body || '').slice(0, 80);
    window.JUCUM_NOTIF.pushNotif(p.authorId, {
      type: 'forum-reply',
      title: `💬 ${reply.authorName} respondió tu publicación`,
      body: `En “${p.title}”: ${snippet}${(reply.body || '').length > 80 ? '…' : ''}`,
      link: 'forum',
    });
  }
}
function togglePin(groupId, postId) {
  const data = loadForum();
  const posts = data[groupId]?.posts || [];
  const p = posts.find(p => p.id === postId);
  if (!p) return;
  if (!p.pinned) {
    const pinnedCount = posts.filter(x => x.pinned).length;
    if (pinnedCount >= 3) { alert('Solo puedes fijar 3 publicaciones máximo. Desfija una primero.'); return; }
  }
  p.pinned = !p.pinned;
  saveForum(data);
  if (window.JUCUM_SYNC) window.JUCUM_SYNC.pushPin(postId, p.pinned);
}
function deletePost(groupId, postId) {
  const data = loadForum();
  if (!data[groupId]) return;
  data[groupId].posts = data[groupId].posts.filter(p => p.id !== postId);
  saveForum(data);
  if (window.JUCUM_SYNC) window.JUCUM_SYNC.deletePostDb(postId);
}
function deleteReply(groupId, postId, replyId) {
  const data = loadForum();
  const p = data[groupId]?.posts.find(p => p.id === postId);
  if (!p) return;
  p.replies = (p.replies || []).filter(r => r.id !== replyId);
  saveForum(data);
  if (window.JUCUM_SYNC) window.JUCUM_SYNC.deleteReplyDb(replyId);
}

/* Seed sample posts the first time forum is opened */
function seedSampleForum() {
  if (window.JUCUM_SB) return; // cloud mode: forum comes from Supabase
  if (localStorage.getItem(FORUM_KEY)) return;
  const now = Date.now();
  const data = {
    g1: { posts: [
      { id:'p-seed1', date:new Date(now - 86400000*2).toISOString(), pinned:true,
        authorId:'teacher', authorName:'Profesor', authorRole:'teacher',
        title:'📌 Bienvenidos al foro del grupo',
        body:'Hola a todos! Este espacio es para preguntas, dudas o conversación sobre el curso. Recuerden ser respetuosos y ayudarse entre ustedes. Yo voy a fijar las preguntas más importantes 📌',
        replies:[]
      },
      { id:'p-seed2', date:new Date(now - 86400000).toISOString(), pinned:false,
        authorId:'s02', authorName:'Ana Flores', authorRole:'student',
        title:'¿Cuándo es el examen del módulo 1?',
        body:'Profe, ¿podemos saber la fecha del primer examen? Quiero organizar mi estudio.',
        replies:[
          { id:'r-seed1', date:new Date(now - 3600000*20).toISOString(),
            authorId:'teacher', authorName:'Profesor', authorRole:'teacher',
            body:'Hola Ana! El examen del Módulo 1 será el viernes 23 de mayo. Voy a fijar esta pregunta para que todos lo vean.' },
        ]
      },
      { id:'p-seed3', date:new Date(now - 3600000*8).toISOString(), pinned:false,
        authorId:'s01', authorName:'Leonardo Cruz', authorRole:'student',
        title:'No entiendo bien "There is" vs "There are"',
        body:'Hola compañeros, alguien me puede explicar cuando se usa "there is" y cuando "there are"? Lo confundo con singular y plural.',
        replies:[
          { id:'r-seed2', date:new Date(now - 3600000*7).toISOString(),
            authorId:'s04', authorName:'Sofía Díaz', authorRole:'student',
            body:'Hola Leo! "There is" es para una sola cosa (singular): There is a book. "There are" es para muchas (plural): There are 3 books. Espero te sirva 😊' },
        ]
      },
    ]},
    g3: { posts: [
      { id:'p-seed4', date:new Date(now - 3600000*3).toISOString(), pinned:false,
        authorId:'s14', authorName:'Mia Tagle', authorRole:'student',
        title:'¿Alguien tiene tips para Past Continuous?',
        body:'Estoy practicando pero me cuesta diferenciarlo del Past Simple. ¿Alguna recomendación?',
        replies:[]
      },
    ]},
  };
  saveForum(data);
}
seedSampleForum();

window.JUCUM_FORUM = {
  getGroupForum, createPost, addReply, togglePin, deletePost, deleteReply,
  isMuted, setMute, getMutes, toggleLike, postLikes, getReactions, toggleReaction,
  markForumSeen, forumUnreadCount, findPostById,
};
