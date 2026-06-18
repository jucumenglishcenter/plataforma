/* JUCUM EC — Student platform · mock data
 *
 * In production this comes from Supabase:
 *   users, groups, activities, scores
 * For the prototype we seed realistic data + persist edits to localStorage.
 */

const LEVELS = {
  'pre-a1': { code: 'Pre-A1', emoji: '🟡', color: '#F9A825', dark: '#E65100' },
  'a1':     { code: 'A1',     emoji: '📘', color: '#2196F3', dark: '#0D47A1' },
  'a2':     { code: 'A2',     emoji: '📗', color: '#2EA84B', dark: '#1B5E20' },
};

const GROUPS_KEY = 'jucum_groups_v1';
const STUDENTS_KEY = 'jucum_students_v1';

function loadGroups(defaultGroups) {
  try {
    const saved = JSON.parse(localStorage.getItem(GROUPS_KEY) || 'null');
    if (Array.isArray(saved) && saved.length) return saved;
  } catch {}
  return defaultGroups;
}
function saveGroups(groups) {
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}
function loadStudents(defaultStudents) {
  try {
    const saved = JSON.parse(localStorage.getItem(STUDENTS_KEY) || 'null');
    if (Array.isArray(saved) && saved.length) return saved;
  } catch {}
  return defaultStudents;
}
function saveStudents(students) {
  localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
}

/* Level promotion — student passes their international exam and moves up. */
function promoteStudent(studentId, newLevel, newGroupId, examScore) {
  const idx = STUDENTS.findIndex(s => s.id === studentId);
  if (idx < 0) return false;
  const prev = STUDENTS[idx];
  STUDENTS[idx] = { ...prev, level: newLevel, group: newGroupId, completedModules: 0, achievements: [...(prev.achievements||[])] };
  saveStudents(STUDENTS);
  if (window.JUCUM_SB) window.JUCUM_SB.update('users', studentId, { level: newLevel, group_id: newGroupId }).catch(e => console.warn('promote:', e.message));
  if (window.JUCUM_NOTIF) {
    window.JUCUM_NOTIF.pushNotif(studentId, {
      type: 'achievement',
      title: '🎓 ¡Avanzaste de nivel!',
      body: `Aprobaste el examen con ${examScore}/100. Bienvenido al nivel ${newLevel.toUpperCase()}.`,
    });
  }
  return true;
}

/* Eligibility: completed all modules of current level + activated by teacher */
function isEligibleForExam(student) {
  const mods = MODULE_CATALOG[student.level] || [];
  if (mods.length === 0) return false;
  const progress = getStudentProgress(student.id);
  return mods.every(m =>
    m.activities.every(a => progress.completed[`${m.id}:${a.id}`])
  );
}

const DEFAULT_GROUPS = [
  { id: 'g1', level: 'pre-a1', name: 'Pre-A1 · Lunes & Miércoles', schedule: '6:00pm – 7:30pm', startDate: '2026-03-04' },
  { id: 'g2', level: 'pre-a1', name: 'Pre-A1 · Sábados',           schedule: '10:00am – 1:00pm', startDate: '2026-03-07' },
  { id: 'g3', level: 'a1',     name: 'A1 · Martes & Jueves',       schedule: '7:00pm – 8:30pm', startDate: '2026-02-10' },
  { id: 'g4', level: 'a2',     name: 'A2 · Viernes',               schedule: '6:30pm – 9:00pm', startDate: '2026-01-16' },
];

const GROUPS = loadGroups(DEFAULT_GROUPS);

function addGroup(g) {
  const id = 'g' + Date.now();
  GROUPS.push({ ...g, id });
  saveGroups(GROUPS);
  if (window.JUCUM_SB) {
    window.JUCUM_SB.insert('groups', {
      level: g.level, name: g.name, schedule: g.schedule, start_date: g.startDate,
      daily_target_min: 15, is_paused: false,
    }).then(row => { if (row) { const i = GROUPS.findIndex(x => x.id === id); if (i>=0) GROUPS[i].id = row.id; } })
      .catch(e => console.warn('addGroup:', e.message));
  }
  return id;
}
function updateGroup(id, partial) {
  const idx = GROUPS.findIndex(g => g.id === id);
  if (idx >= 0) {
    GROUPS[idx] = { ...GROUPS[idx], ...partial };
    saveGroups(GROUPS);
    if (window.JUCUM_SB) {
      const p = {};
      if ('name' in partial) p.name = partial.name;
      if ('level' in partial) p.level = partial.level;
      if ('schedule' in partial) p.schedule = partial.schedule;
      if ('startDate' in partial) p.start_date = partial.startDate;
      window.JUCUM_SB.update('groups', id, p).catch(e => console.warn('updateGroup:', e.message));
    }
  }
}
function removeGroup(id) {
  const idx = GROUPS.findIndex(g => g.id === id);
  if (idx >= 0) {
    if (window.JUCUM_SB) window.JUCUM_SB.remove('groups', id).catch(e => console.warn('removeGroup:', e.message));
    GROUPS.splice(idx, 1);
    saveGroups(GROUPS);
  }
}

/* Helper to generate plausible activity */
function makeStudent(id, username, fullName, level, group, opts={}) {
  const {
    completedModules = 1,
    avgScore = 75,
    streak = 0,
    lastActiveDays = 2,
    totalMinutes = 120,
    achievements = [],
    starred = false,
  } = opts;
  return { id, username, fullName, level, group, completedModules, avgScore, streak,
           lastActiveDays, totalMinutes, achievements, starred };
}

/* Deterministic pseudo-random for per-student daily data */
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function rng(seed) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

/* Specific content catalogs per level — what they could have practiced */
const CONTENT = {
  'pre-a1': {
    modules: ['Personal Identity', 'Essential Actions'],
    stories: ['Story 1 · My Name Is Leo', 'Story 2 · Mia\'s Photo', 'Story 3 · Saturday', 'Story 4 · Kind People'],
    dialogues: ['D1 · First Day at School', 'D2 · The Family Photo', 'D3 · Baby Luli', 'D4 · The Kind Neighbor'],
    grammar: ['Pronouns · Fill In','Pronouns · Identification','To be · Fill In','To be · Transform','There is/are · Fill In','Present Simple Afirmativo','Present Simple Negativo','Wh- Questions'],
    listening: ['S1 ·  Easy 1','S1 · Easy 2','S1 · Medium','S1 · Hard','S2 · Easy','S2 · Medium','S2 · Hard','S3 · Medium','S3 · Hard','S4 · Easy'],
  },
  'a1': {
    modules: ['Daily Life & Personal Routines'],
    stories: ['Story 1 · A typical Monday', 'Story 2 · Shopping at the market', 'Story 3 · Saturday with grandma'],
    dialogues: ['D1 · At the bakery', 'D2 · Asking for directions', 'D3 · Making plans'],
    grammar: ['Imperatives · Fill In','Articles · Identification','Past Simple · Transform','Past Continuous · Fill In','Wh- Questions Past','Modals · Identification'],
    listening: ['S1 · Easy 1','S1 · Easy 2','S1 · Medium','S2 · Medium','S2 · Hard','S3 · Hard'],
  },
  'a2': {
    modules: ['Services, Support & Problem Solving'],
    stories: ['Story 1 · Calling customer service', 'Story 2 · Fixing a problem at the bank'],
    dialogues: ['D1 · Returning a product', 'D2 · Indirect questions in action'],
    grammar: ['Countable / Uncountable','Quantifiers · Fill In','Present Perfect · Transform','Used to · Identification','Modals of Deduction','Tag Questions · Fill In'],
    listening: ['S1 · Easy','S1 · Medium','S2 · Medium','S2 · Hard'],
  },
};

function pickN(r, arr, n) {
  const out = [];
  const pool = [...arr];
  for (let i = 0; i < Math.min(n, pool.length); i++) {
    const idx = Math.floor(r() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

/* Build last-14-days time series per student with activity breakdown + specifics */
function dailyDataDemo(student) {
  const r = rng(hash(student.id));
  const content = CONTENT[student.level] || CONTENT['pre-a1'];
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dStr = date.toISOString().slice(0, 10);
    const baseActive = r();
    const active = i >= student.lastActiveDays && baseActive > (student.lastActiveDays > 7 ? 0.7 : 0.3);
    if (active) {
      const readingMin   = Math.floor(r() * 18 + (r() > 0.5 ? 6 : 0));
      const listeningMin = Math.floor(r() * 14 + (r() > 0.6 ? 4 : 0));
      const grammarMin   = Math.floor(r() * 12);
      const storyMin     = Math.floor(r() * 16);
      const mod = content.modules[Math.floor(r() * content.modules.length)];
      days.push({
        date: dStr,
        reading:   readingMin,
        listening: listeningMin,
        grammar:   grammarMin,
        story:     storyMin,
        total: readingMin + listeningMin + grammarMin + storyMin,
        details: {
          reading:   readingMin   > 0 ? pickN(r, content.stories, Math.min(2, Math.ceil(readingMin/10))).map(s => ({ module:mod, item:s, score: Math.floor(5 + r()*3), max:7, minutes: Math.max(3, Math.floor(readingMin/2)) })) : [],
          listening: listeningMin > 0 ? pickN(r, content.listening, Math.min(3, Math.ceil(listeningMin/6))).map(s => ({ module:mod, item:s, score: r() > 0.7 ? 1 : (r() > 0.5 ? 0.7 : 0.4), max:1, minutes: Math.max(2, Math.floor(listeningMin/3)) })) : [],
          grammar:   grammarMin   > 0 ? pickN(r, content.grammar,  Math.min(2, Math.ceil(grammarMin/6))).map(s => ({ module:mod, item:s, score: Math.floor(8 + r()*5), max:12, minutes: Math.max(2, Math.floor(grammarMin/2)) })) : [],
          story:     storyMin     > 0 ? pickN(r, content.dialogues, Math.min(2, Math.ceil(storyMin/8))).map(s => ({ module:mod, item:s, minutes: Math.max(4, Math.floor(storyMin/2)) })) : [],
        },
      });
    } else {
      days.push({ date: dStr, reading:0, listening:0, grammar:0, story:0, total:0, details:{reading:[],listening:[],grammar:[],story:[]} });
    }
  }
  return days;
}

/* Real 14-day series from the cloud-hydrated progress cache (cloud mode);
 * falls back to the demo generator in local mode. */
function dailyData(student) {
  return window.JUCUM_SB ? dailyDataReal(student) : dailyDataDemo(student);
}
function dailyDataReal(student) {
  const completed = (getStudentProgress(student.id) || {}).completed || {};
  const idx = {};
  Object.values(MODULE_CATALOG).forEach(mods => (mods || []).forEach(m =>
    (m.activities || []).forEach(a => idx[`${m.id}:${a.id}`] = { module: m.name, item: a.name, type: a.type })));
  const catOf = (t) => {
    t = String(t || '').toLowerCase();
    if (t.includes('story') || t.includes('dialog')) return 'story';
    if (t.includes('listen')) return 'listening';
    if (t.includes('read') || t.includes('lectura')) return 'reading';
    return 'grammar';
  };
  const blank = (dStr) => ({ date: dStr, reading:0, listening:0, grammar:0, story:0, total:0, details:{reading:[],listening:[],grammar:[],story:[]} });
  const byDay = {};
  Object.entries(completed).forEach(([key, e]) => {
    if (!e || !e.date) return;
    const dStr = String(e.date).slice(0, 10);
    byDay[dStr] = byDay[dStr] || blank(dStr);
    const info = idx[key] || { module: '', item: key, type: '' };
    const cat = catOf(info.type);
    const min = Math.max(1, Math.round(e.minutes || 0));
    byDay[dStr][cat] += min;
    byDay[dStr].total += min;
    const row = { module: info.module, item: info.item, minutes: min };
    if (typeof e.score === 'number') { row.score = e.score > 10 ? Math.round(e.score) : Math.round(e.score * 10); row.max = 100; }
    byDay[dStr].details[cat].push(row);
  });
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const date = new Date(); date.setDate(date.getDate() - i);
    const dStr = date.toISOString().slice(0, 10);
    days.push(byDay[dStr] || blank(dStr));
  }
  return days;
}

/* Real per-student activity log from the cloud progress cache (cloud mode);
 * falls back to the demo ACTIVITY_LOG locally. */
function getStudentLog(studentId) {
  if (!window.JUCUM_SB) return ACTIVITY_LOG.filter(a => a.studentId === studentId);
  const completed = (getStudentProgress(studentId) || {}).completed || {};
  const idx = {};
  Object.values(MODULE_CATALOG).forEach(mods => (mods || []).forEach(m =>
    (m.activities || []).forEach(a => idx[`${m.id}:${a.id}`] = { module: m.name, item: a.name, type: a.type })));
  const events = Object.entries(completed).map(([key, e]) => {
    const info = idx[key] || { module: '', item: key, type: 'story' };
    const ev = {
      studentId, type: info.type || 'story', module: info.module,
      detail: info.item + (e.minutes ? ` · ${Math.round(e.minutes)} min` : ''),
      date: String(e.date || '').replace('T', ' ').slice(0, 16),
    };
    if (typeof e.score === 'number') { ev.score = e.score > 10 ? Math.round(e.score) : Math.round(e.score * 10); ev.max = 100; }
    return ev;
  });
  return events.sort((a, b) => b.date.localeCompare(a.date));
}

const STUDENTS = [
  /* Pre-A1 · Grupo 1 — Lunes y Miércoles */
  makeStudent('s01','leo.cruz','Leonardo Cruz','pre-a1','g1',{completedModules:2,avgScore:92,streak:5,lastActiveDays:0,totalMinutes:380,achievements:['first','streak','literal','identity','family','perfect'],starred:true}),
  makeStudent('s02','ana.flores','Ana Flores','pre-a1','g1',{completedModules:2,avgScore:88,streak:3,lastActiveDays:1,totalMinutes:290,achievements:['first','streak','literal','identity']}),
  makeStudent('s03','marco.tello','Marco Tello','pre-a1','g1',{completedModules:1,avgScore:71,streak:0,lastActiveDays:4,totalMinutes:150,achievements:['first','literal']}),
  makeStudent('s04','sofia.diaz','Sofía Díaz','pre-a1','g1',{completedModules:2,avgScore:95,streak:7,lastActiveDays:0,totalMinutes:420,achievements:['first','streak','literal','inferential','identity','family','perfect','critical'],starred:true}),
  makeStudent('s05','ravi.kumar','Ravi Kumar','pre-a1','g1',{completedModules:1,avgScore:78,streak:2,lastActiveDays:2,totalMinutes:185,achievements:['first','literal','identity']}),
  makeStudent('s06','lucia.huaman','Lucía Huamán','pre-a1','g1',{completedModules:1,avgScore:64,streak:0,lastActiveDays:9,totalMinutes:95,achievements:['first']}),
  makeStudent('s07','carlos.peña','Carlos Peña','pre-a1','g1',{completedModules:2,avgScore:81,streak:1,lastActiveDays:1,totalMinutes:240,achievements:['first','streak','literal','identity']}),
  makeStudent('s08','julia.veliz','Julia Véliz','pre-a1','g1',{completedModules:0,avgScore:0,streak:0,lastActiveDays:14,totalMinutes:25,achievements:[]}),

  /* Pre-A1 · Grupo 2 — Sábados */
  makeStudent('s09','diego.romero','Diego Romero','pre-a1','g2',{completedModules:1,avgScore:84,streak:2,lastActiveDays:1,totalMinutes:220,achievements:['first','literal','identity']}),
  makeStudent('s10','valeria.cm','Valeria Carrasco','pre-a1','g2',{completedModules:2,avgScore:91,streak:4,lastActiveDays:0,totalMinutes:360,achievements:['first','streak','literal','identity','family']}),
  makeStudent('s11','andres.lopez','Andrés López','pre-a1','g2',{completedModules:1,avgScore:69,streak:0,lastActiveDays:5,totalMinutes:130,achievements:['first']}),
  makeStudent('s12','camila.bardales','Camila Bardales','pre-a1','g2',{completedModules:2,avgScore:87,streak:3,lastActiveDays:1,totalMinutes:310,achievements:['first','streak','literal','identity','inferential']}),
  makeStudent('s13','jose.cardenas','José Cárdenas','pre-a1','g2',{completedModules:1,avgScore:73,streak:1,lastActiveDays:3,totalMinutes:170,achievements:['first','literal']}),

  /* A1 · Grupo 3 — Martes y Jueves */
  makeStudent('s14','mia.tagle','Mia Tagle','a1','g3',{completedModules:1,avgScore:89,streak:4,lastActiveDays:0,totalMinutes:520,achievements:['first','streak','literal','inferential'],starred:true}),
  makeStudent('s15','sebas.pinto','Sebastián Pinto','a1','g3',{completedModules:1,avgScore:76,streak:2,lastActiveDays:1,totalMinutes:380,achievements:['first','literal']}),
  makeStudent('s16','isabella.ortiz','Isabella Ortiz','a1','g3',{completedModules:1,avgScore:93,streak:6,lastActiveDays:0,totalMinutes:480,achievements:['first','streak','literal','inferential','perfect']}),
  makeStudent('s17','renato.silva','Renato Silva','a1','g3',{completedModules:0,avgScore:58,streak:0,lastActiveDays:7,totalMinutes:140,achievements:[]}),
  makeStudent('s18','daniela.vega','Daniela Vega','a1','g3',{completedModules:1,avgScore:82,streak:3,lastActiveDays:0,totalMinutes:410,achievements:['first','streak','literal']}),
  makeStudent('s19','pablo.naveda','Pablo Naveda','a1','g3',{completedModules:1,avgScore:71,streak:0,lastActiveDays:4,totalMinutes:295,achievements:['first','literal']}),
  makeStudent('s20','rosa.melchor','Rosa Melchor','a1','g3',{completedModules:1,avgScore:85,streak:2,lastActiveDays:1,totalMinutes:340,achievements:['first','literal','inferential']}),

  /* A2 · Grupo 4 — Viernes */
  makeStudent('s21','sam.aguilar','Samuel Aguilar','a2','g4',{completedModules:1,avgScore:94,streak:8,lastActiveDays:0,totalMinutes:720,achievements:['first','streak','literal','inferential','perfect','critical'],starred:true}),
  makeStudent('s22','elena.barron','Elena Barrón','a2','g4',{completedModules:1,avgScore:88,streak:5,lastActiveDays:0,totalMinutes:640,achievements:['first','streak','literal','inferential']}),
  makeStudent('s23','jorge.tafur','Jorge Tafur','a2','g4',{completedModules:0,avgScore:67,streak:1,lastActiveDays:2,totalMinutes:320,achievements:['first','literal']}),
  makeStudent('s24','paola.salas','Paola Salas','a2','g4',{completedModules:1,avgScore:91,streak:4,lastActiveDays:0,totalMinutes:580,achievements:['first','streak','literal','inferential','critical']}),
  makeStudent('s25','ricardo.solano','Ricardo Solano','a2','g4',{completedModules:0,avgScore:0,streak:0,lastActiveDays:18,totalMinutes:15,achievements:[]}),
];

/* Recent activity log — last 30 events across all students */
const ACTIVITY_LOG = [
  { studentId:'s04', type:'reading', module:'Personal Identity', detail:'Story 4 · Kind People', score:7, max:7, date:'2026-05-13 14:32' },
  { studentId:'s04', type:'achievement', detail:'Pensamiento Crítico 🎓', date:'2026-05-13 14:33' },
  { studentId:'s21', type:'listening', module:'Services & Support', detail:'Activity 8 · Hard', score:9, max:10, date:'2026-05-13 13:15' },
  { studentId:'s01', type:'grammar', module:'Personal Identity', detail:'To be · Transform', score:18, max:20, date:'2026-05-13 12:48' },
  { studentId:'s16', type:'reading', module:'Daily Life', detail:'Story 2', score:6, max:7, date:'2026-05-13 11:20' },
  { studentId:'s14', type:'story', module:'Daily Life', detail:'Diálogo 1 · 12 min', date:'2026-05-13 10:55' },
  { studentId:'s10', type:'listening', module:'Personal Identity', detail:'S2 · 10/10', score:10, max:10, date:'2026-05-12 19:40' },
  { studentId:'s10', type:'achievement', detail:'Perfección ⭐', date:'2026-05-12 19:40' },
  { studentId:'s02', type:'reading', module:'Personal Identity', detail:'Story 3', score:5, max:7, date:'2026-05-12 18:12' },
  { studentId:'s24', type:'grammar', module:'Services & Support', detail:'Present Perfect', score:14, max:16, date:'2026-05-12 17:30' },
  { studentId:'s22', type:'story', module:'Services & Support', detail:'Story 1 · 18 min', date:'2026-05-12 16:05' },
  { studentId:'s07', type:'reading', module:'Essential Actions', detail:'Story 1', score:6, max:7, date:'2026-05-11 19:25' },
  { studentId:'s18', type:'listening', module:'Daily Life', detail:'S1 · 8/10', score:8, max:10, date:'2026-05-11 18:50' },
  { studentId:'s12', type:'grammar', module:'Essential Actions', detail:'Wh- Questions · Fill In', score:11, max:12, date:'2026-05-11 11:40' },
  { studentId:'s21', type:'reading', module:'Services & Support', detail:'Story 2', score:7, max:7, date:'2026-05-10 20:10' },
];

/* Logros coherentes y CON PROGRESO.
 * Cada uno: icon, name, how (cómo ganarlo, da dirección al alumno),
 * metric (de dónde sale el progreso), goal, color del aro.
 * El aro se llena a medida que avanzan y se vuelve dorado/lleno al conseguirlo. */
const ACHIEVEMENT_DEFS = {
  first:      { icon:'🌱', name:'Primer paso',     how:'Completa tu primera práctica.',                 metric:'practices', goal:1,   color:'#66BB6A', colorDark:'#2E7D32', glow:'rgba(102,187,106,0.45)' },
  practice5:  { icon:'📚', name:'Constante',       how:'Completa 5 prácticas en total.',                metric:'practices', goal:5,   color:'#42A5F5', colorDark:'#1565C0', glow:'rgba(66,165,245,0.45)' },
  practice15: { icon:'🏅', name:'Dedicado/a',      how:'Completa 15 prácticas en total.',               metric:'practices', goal:15,  color:'#FFB300', colorDark:'#FF8F00', glow:'rgba(255,179,0,0.5)' },
  streak3:    { icon:'🔥', name:'En racha',        how:'Practica 3 días seguidos.',                     metric:'streak',    goal:3,   color:'#FF7043', colorDark:'#E64A19', glow:'rgba(255,112,67,0.45)' },
  streak7:    { icon:'⚡', name:'Imparable',       how:'Practica 7 días seguidos sin fallar un día.',   metric:'streak',    goal:7,   color:'#FFCA28', colorDark:'#F9A825', glow:'rgba(255,202,40,0.5)' },
  hour1:      { icon:'⏱️', name:'Una hora',        how:'Acumula 60 minutos de práctica.',               metric:'minutes',   goal:60,  unit:' min', color:'#26C6DA', colorDark:'#00838F', glow:'rgba(38,198,218,0.45)' },
  hours5:     { icon:'🏆', name:'Maratón',         how:'Acumula 5 horas (300 min) de práctica.',        metric:'minutes',   goal:300, unit:' min', color:'#FFD54F', colorDark:'#F57F17', glow:'rgba(255,213,79,0.55)' },
  perfect:    { icon:'⭐', name:'Sin errores',     how:'Saca 100% en cualquier quiz.',                  metric:'perfect',   goal:1,   color:'#AB47BC', colorDark:'#6A1B9A', glow:'rgba(171,71,188,0.45)' },
  perfect3:   { icon:'💎', name:'Perfeccionista',  how:'Saca 100% en 3 quizzes distintos.',             metric:'perfect',   goal:3,   color:'#29B6F6', colorDark:'#0277BD', glow:'rgba(41,182,246,0.5)' },
  avg85:      { icon:'🎯', name:'Puntería',        how:'Mantén 85% de promedio o más.',                 metric:'avg',       goal:85,  unit:'%', color:'#EC407A', colorDark:'#AD1457', glow:'rgba(236,64,122,0.45)' },
  module1:    { icon:'🪪', name:'Módulo completo', how:'Termina todas las actividades de un módulo.',   metric:'modules',   goal:1,   color:'#FFA726', colorDark:'#EF6C00', glow:'rgba(255,167,38,0.5)' },
};

/* Progreso real de cada logro a partir de las estadísticas del alumno */
function _medalCurrent(student, metric) {
  const prog = (typeof getStudentProgress === 'function' ? getStudentProgress(student.id) : null) || { completed: {} };
  const entries = Object.values(prog.completed || {});
  switch (metric) {
    case 'practices': return entries.length;
    case 'streak':    return student.streak || 0;
    case 'minutes':   return student.totalMinutes || 0;
    case 'perfect':   return entries.filter(e => typeof e.score === 'number' && e.score >= 100).length;
    case 'avg':       return student.avgScore || 0;
    case 'modules':   return student.completedModules || 0;
    default:          return 0;
  }
}
function medalProgress(student, key) {
  const def = ACHIEVEMENT_DEFS[key];
  if (!def) return { current: 0, goal: 1, pct: 0, done: false, remaining: 1 };
  const raw = _medalCurrent(student, def.metric);
  const goal = def.goal || 1;
  const pct = Math.max(0, Math.min(100, Math.round((raw / goal) * 100)));
  return { current: Math.min(raw, goal), rawCurrent: raw, goal, pct, done: raw >= goal, remaining: Math.max(0, goal - raw) };
}
function earnedMedals(student) {
  return Object.keys(ACHIEVEMENT_DEFS).filter(k => medalProgress(student, k).done);
}
/* Logros más cercanos aún no conseguidos (para "Próximos logros" y el cierre de práctica) */
function nextMedals(student, n = 3) {
  return Object.keys(ACHIEVEMENT_DEFS)
    .map(k => ({ key: k, def: ACHIEVEMENT_DEFS[k], ...medalProgress(student, k) }))
    .filter(m => !m.done)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, n);
}
/* Frase motivacional según el puntaje (motiva tanto si va bien como si va mal) */
function getMotivation(pct) {
  if (pct >= 90) return { emoji:'🌟', title:'¡Excelente!',     text:'Dominaste el tema. Tu constancia se nota — sigue así.' };
  if (pct >= 70) return { emoji:'💪', title:'¡Muy bien!',      text:'Vas por buen camino. Repasa los pocos errores y serás imparable.' };
  if (pct >= 50) return { emoji:'🌱', title:'¡Buen intento!',  text:'Aprendiste más de lo que crees. Revisa el feedback y vuelve a intentarlo: cada error te acerca.' };
  return                { emoji:'🤗', title:'¡Sigue adelante!', text:'Equivocarse ES aprender — tu cerebro ya está cambiando aunque no lo sientas. Repasa con calma y verás el avance.' };
}

/* Demo logins */
const DEMO_CREDS = {
  student: { username:'leo.cruz', password:'1234' },
  teacher: { username:'profesor', password:'1234' },
};

/* ── Module catalog · activities per module per level ─────────────── */
const GH_PA1_M1 = 'https://jucumenglishcenter.github.io/Pre-a1/M1-Personal-Identity';
const MODULE_CATALOG = {
  'pre-a1': [
    { id:'pa1-m1', name:'Personal Identity', emoji:'🪪', topics:['Pronouns','To be','There is/are'],
      activities: [
        { id:'a1', type:'story',     name:'Stories y Diálogos · Personal Identity',
          url: GH_PA1_M1 + '/PreA1_M1_Story_Personal%20Identity.html' },
        { id:'a5', type:'reading',   name:'Comprensión lectora · Personal Identity',
          url: GH_PA1_M1 + '/PreA1_M1_Reading%20Comprehension_Personal%20Identity.html' },
        { id:'a9', type:'listening', name:'Comprensión auditiva · Personal Identity',
          url: GH_PA1_M1 + '/PreA1_M1_Listening_Personal%20Identity.html' },
        { id:'g1a', type:'grammar',  name:'Fill in',        group:'Pronouns: simple personal',
          url: GH_PA1_M1 + '/Practicas/T1_PRONOUNS/PreA1_M1_Grammar_Pronouns_Fill%20in.html' },
        { id:'g1b', type:'grammar',  name:'Identification', group:'Pronouns: simple personal',
          url: GH_PA1_M1 + '/Practicas/T1_PRONOUNS/PreA1_M1_Grammar_Pronouns_Identification.html' },
        { id:'g1c', type:'grammar',  name:'Transform',      group:'Pronouns: simple personal',
          url: GH_PA1_M1 + '/Practicas/T1_PRONOUNS/PreA1_M1_Grammar_Pronouns_Transform.html' },
        { id:'g2a', type:'grammar',  name:'Fill in',        group:'To be: Affirmative, Negative & Interrogative',
          url: GH_PA1_M1 + '/Practicas/T2_To%20be/PreA1_M1_Grammar_To%20be_Fill%20in.html' },
        { id:'g2b', type:'grammar',  name:'Identification', group:'To be: Affirmative, Negative & Interrogative',
          url: GH_PA1_M1 + '/Practicas/T2_To%20be/PreA1_M1_Grammar_To%20be_Identification.html' },
        { id:'g2c', type:'grammar',  name:'Transform',      group:'To be: Affirmative, Negative & Interrogative',
          url: GH_PA1_M1 + '/Practicas/T2_To%20be/PreA1_M1_Grammar_To%20be_Transform.html' },
        { id:'g3a', type:'grammar',  name:'Fill in',        group:'To be — Round 2',
          url: GH_PA1_M1 + '/Practicas/T2_To%20be_2/PreA1_M1_Grammar_To_be_Fill_in_P2.html' },
        { id:'g3b', type:'grammar',  name:'Identification', group:'To be — Round 2',
          url: GH_PA1_M1 + '/Practicas/T2_To%20be_2/PreA1_M1_Grammar_To_be_Identification_P2.html' },
        { id:'g3c', type:'grammar',  name:'Transform',      group:'To be — Round 2',
          url: GH_PA1_M1 + '/Practicas/T2_To%20be_2/PreA1_M1_Grammar_To_be_Transform_P2.html' },
        { id:'g4a', type:'grammar',  name:'Fill in',        group:'There is / There are',
          url: GH_PA1_M1 + '/Practicas/T3_There%20is_are/PreA1_M1_Grammar_There%20is-are_Fill%20in.html' },
        { id:'g4b', type:'grammar',  name:'Identification', group:'There is / There are',
          url: GH_PA1_M1 + '/Practicas/T3_There%20is_are/PreA1_M1_Grammar_There%20is-are_Identification.html' },
        { id:'g4c', type:'grammar',  name:'Transform',      group:'There is / There are',
          url: GH_PA1_M1 + '/Practicas/T3_There%20is_are/PreA1_M1_Grammar_There%20is-are_Transform.html' },
        { id:'s1', type:'summary',   name:'Pronouns (+5 MCQ)',                      group:'Resúmenes de gramática',
          url: GH_PA1_M1 + '/Resumen%20de%20Gram%C3%A1tica/PreA1_M1_Grammar%20Summary_Pronouns.html' },
        { id:'s2', type:'summary',   name:'To be · Affirmative-Negative (+5 MCQ)',  group:'Resúmenes de gramática',
          url: GH_PA1_M1 + '/Resumen%20de%20Gram%C3%A1tica/PreA1_M1_Grammar%20Summary_To%20be%20(Affirmative-Negative).html' },
        { id:'s3', type:'summary',   name:'To be · Questions (+5 MCQ)',             group:'Resúmenes de gramática',
          url: GH_PA1_M1 + '/Resumen%20de%20Gram%C3%A1tica/PreA1_M1_Grammar%20Summary_To%20be%20(Questions).html' },
        { id:'s4', type:'summary',   name:'There is/are (+5 MCQ)',                  group:'Resúmenes de gramática',
          url: GH_PA1_M1 + '/Resumen%20de%20Gram%C3%A1tica/PreA1_M1_Grammar%20Summary_There%20is-are.html' },
        { id:'a14',type:'quizlet',   name:'Quizlet · Vocabulario Personal Identity' },
      ],
    },
    { id:'pa1-m2', name:'Essential Actions', emoji:'🏃', topics:['Present Simple','Wh- Questions'],
      activities: [
        { id:'a1', type:'story',     name:'Story 1 · A normal day' },
        { id:'a2', type:'reading',   name:'Quiz Lectura · Essential Actions' },
        { id:'a3', type:'listening', name:'Listening · Daily actions' },
        { id:'a4', type:'grammar',   name:'Gramática · Present Simple Afirmativo' },
        { id:'a5', type:'grammar',   name:'Gramática · Present Simple Negativo' },
        { id:'a6', type:'grammar',   name:'Gramática · Wh- Questions' },
        { id:'a7', type:'quizlet',   name:'Quizlet · Vocabulario Essential Actions' },
      ],
    },
  ],
  'a1': [
    { id:'a1-m1', name:'Daily Life & Personal Routines', emoji:'🛏️', topics:['Imperatives','Past Simple','Modals'],
      activities: [
        { id:'a1', type:'story',     name:'Story · A typical Monday' },
        { id:'a2', type:'story',     name:'Story · Shopping at the market' },
        { id:'a3', type:'reading',   name:'Quiz Lectura · Daily Life' },
        { id:'a4', type:'listening', name:'Listening · Routines' },
        { id:'a5', type:'grammar',   name:'Gramática · Imperatives' },
        { id:'a6', type:'grammar',   name:'Gramática · Articles' },
        { id:'a7', type:'grammar',   name:'Gramática · Past Simple' },
        { id:'a8', type:'grammar',   name:'Gramática · Past Continuous' },
        { id:'a9', type:'quizlet',   name:'Quizlet · A1 Vocabulario' },
      ],
    },
  ],
  'a2': [
    { id:'a2-m1', name:'Services, Support & Problem Solving', emoji:'🛠️', topics:['Quantifiers','Present Perfect','Modals'],
      activities: [
        { id:'a1', type:'story',     name:'Story · Calling customer service' },
        { id:'a2', type:'reading',   name:'Quiz Lectura · Services' },
        { id:'a3', type:'listening', name:'Listening · Support calls' },
        { id:'a4', type:'grammar',   name:'Gramática · Countable vs Uncountable' },
        { id:'a5', type:'grammar',   name:'Gramática · Quantifiers' },
        { id:'a6', type:'grammar',   name:'Gramática · Present Perfect' },
        { id:'a7', type:'grammar',   name:'Gramática · Used to' },
        { id:'a8', type:'quizlet',   name:'Quizlet · A2 Vocabulario' },
      ],
    },
  ],
};

/* ── Group settings persisted in localStorage ─────────────────────── */
const SETTINGS_KEY = 'jucum_group_settings_v1';
const DEFAULT_SETTINGS = {
  // per groupId: { activeModuleId, deadline (yyyy-mm-dd), dailyTargetMin, isPaused }
};
function getGroupSettings(groupId) {
  let all = {};
  try { all = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch {}
  const group = GROUPS.find(g => g.id === groupId);
  const firstMod = group ? (MODULE_CATALOG[group.level] || [])[0] : null;
  const s = all[groupId] || {
    activeModuleId: firstMod?.id || null,
    deadline: null,
    dailyTargetMin: 15,
    isPaused: false,
    unlockMode: 'sequential',
    unlockedActivities: [],
  };
  // Normalizar a LISTA de módulos activos (varios a la vez), migrando desde
  // el modelo antiguo de un solo activeModuleId.
  if (!Array.isArray(s.activeModuleIds)) {
    s.activeModuleIds = s.activeModuleId ? [s.activeModuleId] : (firstMod ? [firstMod.id] : []);
  }
  // activeModuleId = el primero, por compatibilidad con código antiguo
  s.activeModuleId = s.activeModuleIds[0] || null;
  return s;
}
function setGroupSettings(groupId, partial) {
  let all = {};
  try { all = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch {}
  const prev = getGroupSettings(groupId);
  const next = { ...prev, ...partial };
  all[groupId] = next;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(all));
  if (window.JUCUM_SYNC) window.JUCUM_SYNC.pushSettings(groupId, next);

  // Auto-notify all group members when a module is newly turned ON
  if (window.JUCUM_NOTIF && partial.activeModuleIds) {
    const prevSet = new Set(prev.activeModuleIds || []);
    const added = (partial.activeModuleIds || []).filter(id => !prevSet.has(id));
    if (added.length) {
      const group = GROUPS.find(g => g.id === groupId);
      const modules = MODULE_CATALOG[group?.level] || [];
      const members = STUDENTS.filter(s => s.group === groupId);
      added.forEach(mid => {
        const mod = modules.find(m => m.id === mid);
        const modName = mod?.name || 'un nuevo módulo';
        const modEmoji = mod?.emoji || '📦';
        members.forEach(s => {
          window.JUCUM_NOTIF.pushNotif(s.id, {
            type: 'module-activated',
            title: '¡Nuevo módulo activo!',
            body: `${modEmoji} "${modName}" está disponible. ¡Empieza ya!`,
          });
        });
      });
    }
  }
  // Notify if deadline changed
  if (window.JUCUM_NOTIF && partial.deadline && partial.deadline !== prev.deadline) {
    const group = GROUPS.find(g => g.id === groupId);
    const members = STUDENTS.filter(s => s.group === groupId);
    const d = new Date(partial.deadline + 'T23:59:59');
    const diff = Math.ceil((d - new Date()) / 86400000);
    members.forEach(s => {
      window.JUCUM_NOTIF.pushNotif(s.id, {
        type: 'daily-reminder',
        title: 'Fecha límite establecida',
        body: `Tu módulo vence en ${diff} día${diff === 1 ? '' : 's'} (${partial.deadline}).`,
      });
    });
  }

  return next;
}

/* ── Student progress (which activities completed) ───────────────── */
const PROGRESS_KEY = 'jucum_student_progress_v1';
function getStudentProgress(studentId) {
  let all = {};
  try { all = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); } catch {}
  return all[studentId] || { completed: {}, todayMinutes: 0, lastDay: null };
}
function markActivityComplete(studentId, moduleId, activityId, score, minutes) {
  let all = {};
  try { all = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); } catch {}
  const prev = all[studentId] || { completed: {}, todayMinutes: 0, lastDay: null };
  const key = `${moduleId}:${activityId}`;
  prev.completed[key] = { score, minutes, date: new Date().toISOString() };
  const today = new Date().toISOString().slice(0, 10);
  if (prev.lastDay !== today) { prev.todayMinutes = 0; prev.lastDay = today; }
  prev.todayMinutes += minutes;
  all[studentId] = prev;
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
  if (window.JUCUM_SYNC) window.JUCUM_SYNC.pushProgress(studentId, moduleId, activityId, score, minutes);
  return prev;
}

/* ── Bloque C · Gamification ─────────────────────────────────────── */

/* XP awarded per activity type */
const XP_BASE = { story:10, reading:25, listening:20, grammar:15, quizlet:10 };

/* Compute total XP for a student.
 *   = sum of base XP per completed activity
 *   + score bonus (score/maxScore * baseXP)
 *   + 30 XP per active streak day (capped at 14)
 *   + 50 XP per achievement
 */
function getStudentXP(student) {
  const progress = getStudentProgress(student.id);
  let xp = 0;
  for (const key of Object.keys(progress.completed || {})) {
    const [modId, actId] = key.split(':');
    const mods = MODULE_CATALOG[student.level] || [];
    const mod = mods.find(m => m.id === modId);
    const act = mod?.activities.find(a => a.id === actId);
    if (!act) { xp += 10; continue; }
    const base = XP_BASE[act.type] || 10;
    const entry = progress.completed[key];
    // score normalization: numbers >10 = percent (0-100); ≤10 = like /7 or /10 → assume max 10
    let bonusPct = 0.5;
    if (typeof entry.score === 'number') {
      bonusPct = entry.score > 10 ? Math.min(1, entry.score / 100) : Math.min(1, entry.score / 10);
    }
    xp += Math.round(base * (1 + bonusPct));
  }
  xp += Math.min(student.streak || 0, 14) * 30;
  xp += (student.achievements?.length || 0) * 50;
  // XP por tareas entregadas (gamificación: cada entrega suma; +20 si fue bien calificada)
  try {
    const subs = JSON.parse(localStorage.getItem('jucum_submissions_v1') || '{}');
    Object.values(subs).forEach(byStu => {
      const s = byStu && byStu[student.id];
      if (s) { xp += 40; if (typeof s.grade === 'number' && s.grade >= 70) xp += 20; }
    });
  } catch {}
  return xp;
}

/* Level tiers: each level needs (level+1)*50 XP cumulatively.
 * level 1 = 0–100 XP
 * level 2 = 100–250 XP
 * level 3 = 250–450 XP
 * etc.
 */
function getStudentLevel(xp) {
  let level = 1;
  let cumulative = 0;
  let nextNeeded = 100;
  while (xp >= cumulative + nextNeeded) {
    cumulative += nextNeeded;
    level++;
    nextNeeded = (level) * 100;
  }
  const currentXP = xp - cumulative;
  const pct = Math.round((currentXP / nextNeeded) * 100);

  // Title tier
  let tier;
  if      (level <= 5)  tier = { name:'Aprendiz',   emoji:'🌱', color:'#2E7D32', bg:'#E8F5E9' };
  else if (level <= 15) tier = { name:'Estudiante', emoji:'📘', color:'#0D47A1', bg:'#E3F2FD' };
  else if (level <= 30) tier = { name:'Hablante',   emoji:'🗣️', color:'#E65100', bg:'#FFF3E0' };
  else if (level <= 50) tier = { name:'Maestro',    emoji:'🎓', color:'#4A148C', bg:'#F3E5F5' };
  else                  tier = { name:'Leyenda',    emoji:'⭐', color:'#B71C1C', bg:'#FFEBEE' };

  return { level, tier, currentXP, nextNeeded, totalXP: xp, pct };
}

/* Big medals with rarity (replaces the 8 small achievements, but reuses keys) */
const MEDAL_RARITY = {
  first:       { rarity:'bronze' },
  literal:     { rarity:'bronze' },
  family:      { rarity:'bronze' },
  identity:    { rarity:'bronze' },
  streak:      { rarity:'silver' },
  inferential: { rarity:'silver' },
  critical:    { rarity:'gold'   },
  perfect:     { rarity:'gold'   },
};
const RARITY_STYLE = {
  bronze:   { ring:'#CD7F32', ringDark:'#8B4513', glow:'rgba(205,127,50,0.45)',  label:'Bronce'  },
  silver:   { ring:'#C0C0C0', ringDark:'#7A7A7A', glow:'rgba(192,192,192,0.45)', label:'Plata'   },
  gold:     { ring:'#FFD700', ringDark:'#B8860B', glow:'rgba(255,215,0,0.55)',   label:'Oro'     },
  diamond:  { ring:'#B9F2FF', ringDark:'#0288D1', glow:'rgba(33,150,243,0.55)',  label:'Diamante'},
};

/* Group ranking — used for the weekly league (sprint 1 we just rank by XP) */
function getGroupRanking(groupId) {
  return STUDENTS
    .filter(s => s.group === groupId)
    .map(s => ({ student: s, xp: getStudentXP(s) }))
    .sort((a, b) => b.xp - a.xp);
}

/* Seed plausible progress for demo students */
function seedDemoProgress() {
  if (window.JUCUM_SB) return; // cloud mode: progress comes from Supabase
  if (localStorage.getItem(PROGRESS_KEY)) return; // already seeded
  const seeded = {};
  for (const s of STUDENTS) {
    const r = rng(hash(s.id));
    const mods = MODULE_CATALOG[s.level] || [];
    if (mods.length === 0) continue;
    const mod = mods[0];
    const completed = {};
    const completionRate = Math.min(1, (s.avgScore / 100) * (s.completedModules > 0 ? 0.95 : 0.55));
    for (const a of mod.activities) {
      if (r() < completionRate) {
        completed[`${mod.id}:${a.id}`] = { score: Math.floor(70 + r() * 30), minutes: Math.floor(5 + r() * 12), date: new Date(Date.now() - Math.floor(r() * 7 * 86400000)).toISOString() };
      }
    }
    seeded[s.id] = { completed, todayMinutes: Math.floor(r() * 18), lastDay: new Date().toISOString().slice(0, 10) };
  }
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(seeded));
}
seedDemoProgress();

/* Cache catalog for activity-tracker.js (runs in activity kits without data.js) */
try { localStorage.setItem('jucum_module_catalog_cache', JSON.stringify(MODULE_CATALOG)); } catch {}

/* ── Mejora E · Weekly league (resets every Monday) ─────────────── */
const LEAGUE_KEY = 'jucum_league_v1';
function weekId() {
  const d = new Date();
  const day = (d.getDay() + 6) % 7;          // 0 = Monday
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);       // Monday of this week
}
function getWeeklyXP(studentId) {
  let all = {};
  try { all = JSON.parse(localStorage.getItem(LEAGUE_KEY) || '{}'); } catch {}
  const wk = all[weekId()] || {};
  return wk[studentId] || 0;
}
function addWeeklyXP(studentId, xp) {
  let all = {};
  try { all = JSON.parse(localStorage.getItem(LEAGUE_KEY) || '{}'); } catch {}
  const id = weekId();
  all[id] = all[id] || {};
  all[id][studentId] = (all[id][studentId] || 0) + xp;
  // keep only current + previous week
  for (const k of Object.keys(all)) { if (k !== id) delete all[k]; }
  localStorage.setItem(LEAGUE_KEY, JSON.stringify(all));
}
/* Cloud mode: weekly XP derived from real progress entries since Monday
 * (same per-activity formula as getStudentXP, no streak/achievement bonus) */
function getWeeklyXPFromProgress(student) {
  const progress = getStudentProgress(student.id);
  const monday = weekId();
  let xp = 0;
  for (const [key, entry] of Object.entries(progress.completed || {})) {
    if (!entry || !entry.date || String(entry.date).slice(0, 10) < monday) continue;
    const [modId, actId] = key.split(':');
    const mods = MODULE_CATALOG[student.level] || [];
    const act = mods.find(m => m.id === modId)?.activities.find(a => a.id === actId);
    const base = act ? (XP_BASE[act.type] || 10) : 10;
    let bonusPct = 0.5;
    if (typeof entry.score === 'number') bonusPct = entry.score > 10 ? Math.min(1, entry.score / 100) : Math.min(1, entry.score / 10);
    xp += Math.round(base * (1 + bonusPct));
  }
  return xp;
}
function getWeeklyRanking(groupId) {
  return STUDENTS
    .filter(s => s.group === groupId)
    .map(s => ({ student: s, xp: window.JUCUM_SB ? getWeeklyXPFromProgress(s) : (getWeeklyXP(s.id) || Math.floor(getStudentXP(s) * 0.12)) }))
    .sort((a, b) => b.xp - a.xp);
}
function daysUntilMonday() {
  const d = new Date();
  return ((8 - d.getDay()) % 7) || 7;
}

/* ── Dominio real del alumno (anti falsos positivos) ──────────────────
 * El "promedio" antiguo solo promediaba las prácticas hechas, así que un
 * alumno con 2 actividades al 100% mostraba 100%. El dominio pondera:
 *   dominio = cobertura × aciertos × factor_de_constancia
 * - cobertura  = actividades hechas ÷ total del módulo activo (no puede
 *                ser 100% si apenas hizo unas pocas).
 * - aciertos   = promedio de aciertos de lo hecho (participación = 70 si
 *                la actividad no da nota, p.ej. story).
 * - constancia = qué tan seguido practica (días activos de los últimos 7);
 *                cumplir la práctica diaria SUMA, dejar de practicar RESTA.
 * Ámbito: módulo(s) activo(s) del grupo; si no hay, todo el nivel. */
function getStudentMastery(student) {
  if (!student) return { pct: 0, coverage: 0, quality: 0, done: 0, total: 0, active7: 0, constancyPct: 0 };
  const prog = getStudentProgress(student.id);
  const completed = prog.completed || {};
  const mods = MODULE_CATALOG[student.level] || [];
  let scope = mods;
  const group = GROUPS.find(g => g.id === student.group);
  if (group) {
    const settings = getGroupSettings(group.id);
    const activeIds = settings.activeModuleIds
      || (settings.activeModuleId ? [settings.activeModuleId] : []);
    const active = mods.filter(m => activeIds.includes(m.id));
    if (active.length) scope = active;
  }
  let total = 0, done = 0, scoreSum = 0, scoreN = 0;
  scope.forEach(m => (m.activities || []).forEach(a => {
    total++;
    const e = completed[`${m.id}:${a.id}`];
    if (e) {
      done++;
      if (typeof e.score === 'number') {
        const pct = e.score > 10 ? Math.min(100, e.score) : Math.min(100, (e.score / 10) * 100);
        scoreSum += pct; scoreN++;
      } else { scoreSum += 70; scoreN++; } // participación (story / sin nota)
    }
  }));
  const coverage = total ? done / total : 0;
  const quality = scoreN ? (scoreSum / scoreN) / 100 : 0;
  // constancia: días activos de los últimos 7 (meta ~5/7 días)
  const activeDays = new Set();
  Object.values(completed).forEach(e => { if (e && e.date) activeDays.add(String(e.date).slice(0, 10)); });
  let active7 = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if (activeDays.has(d.toISOString().slice(0, 10))) active7++;
  }
  const constancy = Math.min(1, active7 / 5);
  const constancyFactor = 0.85 + 0.20 * constancy; // 0.85 (nunca) → 1.05 (constante)
  const pct = Math.max(0, Math.min(100, Math.round(coverage * quality * 100 * constancyFactor)));
  return {
    pct, coverage: Math.round(coverage * 100), quality: Math.round(quality * 100),
    done, total, active7, constancyPct: Math.round(constancy * 100),
  };
}

/* Ranking del grupo por CUMPLIMIENTO de prácticas (no por XP):
 * "los mejores" = los que practican y dominan. Ordena por dominio y,
 * a igualdad, por racha. Lo usa el Top del grupo (muestra los 5 primeros). */
function getComplianceRanking(groupId) {
  return STUDENTS
    .filter(s => s.group === groupId)
    .map(s => ({ student: s, score: getStudentMastery(s).pct, streak: s.streak || 0, xp: getStudentXP(s) }))
    .sort((a, b) => b.score - a.score || b.streak - a.streak || b.xp - a.xp);
}

/* ── Competencias + "Listo para el examen" ───────────────────────────
 * Cada competencia sube con la CONSTANCIA (cobertura × aciertos × constancia),
 * no por hacer una actividad una sola vez. Speaking además suma con las
 * evaluaciones de Speaking del profesor.
 * "Listo" (apto) = overall ≥ 75%, donde overall combina práctica (70%) y
 * cumplimiento de tareas (30%). El profesor tiene la última palabra. */
const COMPETENCIES = [
  { key:'listening', label:'Comprensión auditiva', icon:'🎧', types:['listening'] },
  { key:'reading',   label:'Comprensión lectora',  icon:'📖', types:['reading'] },
  { key:'grammar',   label:'Gramática',            icon:'📝', types:['grammar','summary'] },
  { key:'speaking',  label:'Speaking',             icon:'🗣️', types:['story'] },
];

function getStudentReadiness(student) {
  if (!student) return { competencies:{}, practiceAvg:0, taskCompliance:null, overall:0, apt:false, threshold:75 };
  const prog = getStudentProgress(student.id);
  const completed = prog.completed || {};
  const mods = MODULE_CATALOG[student.level] || [];
  const m = getStudentMastery(student);
  const constancyFactor = 0.8 + 0.2 * Math.min(1, (m.active7 || 0) / 5);

  const comp = {};
  COMPETENCIES.forEach(c => {
    let total = 0, done = 0, sSum = 0, sN = 0;
    mods.forEach(mod => (mod.activities || []).forEach(a => {
      if (!c.types.includes(a.type)) return;
      total++;
      const e = completed[`${mod.id}:${a.id}`];
      if (e) {
        done++;
        if (typeof e.score === 'number') { const pct = e.score > 10 ? Math.min(100, e.score) : Math.min(100, (e.score / 10) * 100); sSum += pct; sN++; }
        else { sSum += 70; sN++; }
      }
    }));
    const coverage = total ? done / total : 0;
    const quality = sN ? (sSum / sN) / 100 : 0;
    comp[c.key] = total === 0 ? null : Math.round(coverage * quality * 100 * constancyFactor);
  });

  // Speaking también suma con las evaluaciones de Speaking del profesor
  try {
    const evals = (JSON.parse(localStorage.getItem('jucum_evaluations_v1') || '{}')[student.id]) || [];
    const sp = evals.map(e => e.ratings && e.ratings.speaking).filter(v => typeof v === 'number');
    if (sp.length) {
      const evalScore = Math.round((sp.reduce((a, b) => a + b, 0) / sp.length) / 5 * 100);
      comp.speaking = comp.speaking == null ? evalScore : Math.round(comp.speaking * 0.5 + evalScore * 0.5);
    }
  } catch {}

  const compVals = COMPETENCIES.map(c => comp[c.key]).filter(v => typeof v === 'number');
  const practiceAvg = compVals.length ? Math.round(compVals.reduce((a, b) => a + b, 0) / compVals.length) : 0;

  // cumplimiento de tareas asignadas
  let taskCompliance = null;
  try {
    const assigns = JSON.parse(localStorage.getItem('jucum_assignments_v1') || '[]');
    const subs = JSON.parse(localStorage.getItem('jucum_submissions_v1') || '{}');
    const mine = assigns.filter(a => {
      const targeted = Array.isArray(a.targetStudentIds) && a.targetStudentIds.length > 0;
      return targeted ? a.targetStudentIds.includes(student.id) : a.groupId === student.group;
    });
    if (mine.length) {
      const sub = mine.filter(a => (subs[a.id] || {})[student.id]).length;
      taskCompliance = Math.round(sub / mine.length * 100);
    }
  } catch {}

  const overall = taskCompliance == null ? practiceAvg : Math.round(practiceAvg * 0.7 + taskCompliance * 0.3);
  return { competencies: comp, practiceAvg, taskCompliance, overall, apt: overall >= 75, threshold: 75 };
}

window.JUCUM_DATA = { LEVELS, GROUPS, STUDENTS, ACTIVITY_LOG, ACHIEVEMENT_DEFS, DEMO_CREDS, dailyData, MODULE_CATALOG, getGroupSettings, setGroupSettings, getStudentProgress, markActivityComplete, getStudentXP, getStudentLevel, getGroupRanking, MEDAL_RARITY, RARITY_STYLE, addGroup, updateGroup, removeGroup, saveGroups, promoteStudent, isEligibleForExam, saveStudents, getWeeklyXP, addWeeklyXP, getWeeklyRanking, daysUntilMonday, medalProgress, earnedMedals, nextMedals, getMotivation, getStudentMastery, getComplianceRanking, COMPETENCIES, getStudentReadiness };

window.JUCUM_DATA.getStudentLog = getStudentLog;
