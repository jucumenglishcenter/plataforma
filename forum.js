/* Bloque F · Forum (per-group)
 * Posts and replies stored in localStorage. Multi-tab sync via storage events.
 * Teacher can: pin posts (max 3), delete posts, silence students.
 */

const FORUM_KEY  = 'jucum_forum_v1';
const MUTES_KEY  = 'jucum_mutes_v1';
const LIKES_KEY  = 'jucum_likes_v1';

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
function toggleLike(postId, userId) {
  const all = getLikes();
  all[postId] = all[postId] || [];
  const i = all[postId].indexOf(userId);
  if (i >= 0) all[postId].splice(i, 1);
  else all[postId].push(userId);
  localStorage.setItem(LIKES_KEY, JSON.stringify(all));
  if (window.JUCUM_SYNC) window.JUCUM_SYNC.pushLike(postId, userId, all[postId].includes(userId));
  return all[postId];
}
function postLikes(postId) {
  return getLikes()[postId] || [];
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
  isMuted, setMute, getMutes, toggleLike, postLikes,
};
