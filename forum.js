/* Bloque F · Forum (per-group)
 * Posts and replies stored in localStorage. Multi-tab sync via storage events.
 * Teacher can: pin posts (max 3), delete posts, restrict students (motivo + días).
 * 🛡️ Moderación (ago-2026): filtro de lisuras (el mensaje NO se publica, queda en
 * el registro de intentos y el teacher recibe aviso en su campanita).
 */

const FORUM_KEY  = 'jucum_forum_v1';
const MUTES_KEY  = 'jucum_mutes_v1';
const LIKES_KEY  = 'jucum_likes_v1';
const FSEEN_KEY  = 'jucum_forum_seen_v1';
const FLAGS_KEY  = 'jucum_forum_flags_v1';

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
/* Restricción con MOTIVO: el valor guardado ahora es {until, reason, since}.
 * Se acepta el formato viejo (string ISO) para no romper datos ya guardados. */
const MUTE_REASONS = {
  lisuras: { emoji:'🤬', label:'Lenguaje inapropiado (lisuras)', student:'usaste palabras que pueden herir u ofender a los demás' },
  respeto: { emoji:'💔', label:'Falta de respeto a un compañero', student:'trataste a un compañero de una forma que lo hizo sentir mal' },
  pelea:   { emoji:'⚡', label:'Pelea / discusión en el foro', student:'tuviste una pelea o discusión con compañeros en el foro' },
  spam:    { emoji:'🌀', label:'Mal uso del foro (spam)', student:'usaste el foro de una forma que no ayuda a la clase' },
};
function setMute(studentId, untilISO, reason) {
  const m = getMutes();
  if (untilISO) m[studentId] = { until: untilISO, reason: reason || null, since: new Date().toISOString() };
  else delete m[studentId];
  localStorage.setItem(MUTES_KEY, JSON.stringify(m));
  if (window.JUCUM_SYNC) window.JUCUM_SYNC.pushMute(studentId, untilISO, reason || null);
}
function _muteRec(studentId) {
  const m = getMutes()[studentId];
  if (!m) return null;
  return typeof m === 'string' ? { until: m, reason: null, since: null } : m;
}
function isMuted(studentId) {
  const m = _muteRec(studentId);
  return !!(m && m.until && new Date(m.until) > new Date());
}
/* Datos completos de la restricción activa (o null) — para los avisos al alumno. */
function getMuteInfo(studentId) {
  const m = _muteRec(studentId);
  if (!m || !m.until || new Date(m.until) <= new Date()) return null;
  const r = MUTE_REASONS[m.reason];
  return {
    until: m.until, since: m.since, reason: m.reason || null,
    daysLeft: Math.max(1, Math.ceil((new Date(m.until) - Date.now()) / 86400000)),
    reasonEmoji: r ? r.emoji : '🔇',
    reasonLabel: r ? r.label : 'Decisión del profesor',
    reasonStudent: r ? r.student : null,
  };
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

/* ── 🛡️ Filtro de lenguaje inapropiado (ES Perú/México/España + EN) ──────────
 * Detecta lisuras aunque vengan disfrazadas: MAYÚSCULAS, acentos, números por
 * letras (m13rda), signos entre letras (m.i.e.r.d.a), letras repetidas
 * (mieeerda) y letras sueltas (p u t a). */
const _LEET = { '0':'o','1':'i','3':'e','4':'a','5':'s','6':'g','7':'t','8':'b','@':'a','$':'s','€':'e','+':'t','!':'i' };
const _LEET_NUM = { '0':'o','1':'i','3':'e','4':'a','5':'s','6':'g','7':'t','8':'b' };
function _deaccent(s) { return s.replace(/ñ/g, '\u0001').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0001/g, 'ñ'); }
function _wordForms(raw) {
  const base = _deaccent(String(raw).toLowerCase());
  const mapped = base.split('').map(c => _LEET[c] || c).join('').replace(/[^a-zñ]/g, '');
  const stripped = base.replace(/[^a-zñ]/g, '');
  // Solo dígitos → letra, resto de signos fuera ('put4!' → 'puta', 'm13rda!!' → 'mierda')
  const numOnly = base.split('').map(c => _LEET_NUM[c] || c).join('').replace(/[^a-zñ]/g, '');
  const out = new Set();
  [mapped, stripped, numOnly].forEach(f => { if (!f) return; out.add(f); out.add(f.replace(/(.)\1{2,}/g, '$1$1')); out.add(f.replace(/(.)\1+/g, '$1')); });
  return out;
}
const BAD_TOKENS = new Set(('mierda mierdas carajo carajos huevon huevona huevones huevonas hueon hueona weon weona webon webona wevon wevona cojudo cojuda cojudos cojudas cojudez cojudeces ' +
  'pendejo pendeja pendejos pendejas pendejada pendejadas puta puto putas putos putamadre cabron cabrona cabrones cabronas malparido malparida malparidos malparidas ' +
  'chucha chuchas rechucha recontrachucha xuxa pinga pingas verga vergas vrga vrg culo culos ojete zorra zorras perra perras maldito maldita malditos malditas ' +
  'imbecil imbeciles estupido estupida estupidos estupidas idiota idiotas tarado tarada tarados taradas conchudo conchuda chupame chupamela ' +
  'pinche pinches chinga chingar chingada chingado chingadas chingados chingon chingona culero culera culeros culeras mames mamon mamona mamones ' +
  'joder jodete jodido jodida gilipollas coño coños cabronazo putada cagada ' +
  'fuck fucking fucker fuckers fucked shit shitty shits bullshit bitch bitches asshole assholes ass jackass dumbass bastard bastards dick dickhead dicks pussy cunt cunts whore whores slut sluts motherfucker motherfuckers retard retarded nigga niggas nigger niggers faggot fag ' +
  'csm ctm ctmr ptm ptmr mrd wn hdp hpta wtf stfu fck fuk fkn').split(/\s+/));
const BAD_SUBSTR = ('conchatumadre conchetumadre conchesumadre conchadetumadre conchadesumadre chuchatumadre chuchasumadre chuchadetumadre ' +
  'hijodeputa hijadeputa hijosdeputa hijueputa jueputa chingatumadre chingasumadre mecagoentu mecagoenla vetealamierda motherfucker sonofabitch fuckyou').split(/\s+/);
function containsBadLanguage(text) {
  if (!text) return false;
  const hit = (tok) => { for (const f of _wordForms(tok)) if (BAD_TOKENS.has(f)) return true; return false; };
  const words = String(text).split(/\s+/).filter(Boolean);
  for (const w of words) if (hit(w)) return true;
  let run = '';   // letras sueltas: "p u t a"
  for (const w of words) {
    const one = _deaccent(String(w).toLowerCase()).split('').map(c => _LEET[c] || c).join('').replace(/[^a-zñ]/g, '');
    if (one.length === 1) { run += one; continue; }
    if (run.length >= 2 && hit(run)) return true;
    run = '';
  }
  if (run.length >= 2 && hit(run)) return true;
  for (const f of _wordForms(String(text))) for (const s of BAD_SUBSTR) if (f.includes(s)) return true;
  return false;
}

/* ── 🚩 Registro de intentos (lo ve el teacher en el foro + aviso en campanita) ── */
const _peruDayM = t => new Date((t == null ? Date.now() : (typeof t === 'number' ? t : Date.parse(t))) - 5 * 3600000).toISOString().slice(0, 10);
function getFlags() {
  try { return JSON.parse(localStorage.getItem(FLAGS_KEY) || '[]'); } catch { return []; }
}
function registerBadAttempt(student, groupId, content) {
  const flags = getFlags();
  const flag = {
    id: 'fl-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
    studentId: student.id, studentName: student.name || '', groupId: groupId || null,
    content: String(content || '').slice(0, 280), date: new Date().toISOString(),
  };
  flags.unshift(flag);
  if (flags.length > 300) flags.length = 300;
  localStorage.setItem(FLAGS_KEY, JSON.stringify(flags));
  if (window.JUCUM_SYNC && window.JUCUM_SYNC.pushFlag) window.JUCUM_SYNC.pushFlag(flag);
  // Aviso al teacher · los intentos del día se cuentan en día PERÚ
  const today = _peruDayM();
  const todayCount = flags.filter(f => f.studentId === student.id && _peruDayM(f.date) === today).length;
  let gname = '';
  try { const g = (window.JUCUM_DATA.GROUPS || []).find(g => g.id === groupId); gname = g ? ' · ' + g.name : ''; } catch (e) {}
  if (window.JUCUM_NOTIF) {
    window.JUCUM_NOTIF.pushNotif('teacher', todayCount >= 3 ? {
      type: 'forum-flag', link: 'forum',
      title: `🚨 ${student.name}: ya van ${todayCount} intentos de lisuras hoy`,
      body: `Sigue intentando publicar lenguaje inapropiado${gname}. Nada se publicó. Si lo ves necesario, restrínge su participación desde el foro (🔇 en el registro de intentos o en sus publicaciones).`,
    } : {
      type: 'forum-flag', link: 'forum',
      title: `🚩 ${student.name} intentó publicar lenguaje inapropiado`,
      body: `El mensaje NO se publicó y quedó en el registro del foro${gname}: “${flag.content.slice(0, 80)}${flag.content.length > 80 ? '…' : ''}”`,
    });
  }
  return todayCount;
}
function deleteStudentFlags(studentId) {
  localStorage.setItem(FLAGS_KEY, JSON.stringify(getFlags().filter(f => f.studentId !== studentId)));
  if (window.JUCUM_SYNC && window.JUCUM_SYNC.deleteFlagsDb) window.JUCUM_SYNC.deleteFlagsDb(studentId);
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
  MUTE_REASONS, getMuteInfo, containsBadLanguage, registerBadAttempt, getFlags, deleteStudentFlags,
};
