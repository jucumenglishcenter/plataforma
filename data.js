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

/* ¿Estamos en modo demostración? Solo entonces se carga el roster ficticio.
 * En uso real (con Supabase) la base arranca vacía y App.jsx la rellena desde
 * la nube; si la nube falla, se ve "sin datos" en vez de alumnos inventados. */
const _DEMO_ON = false; // Modo demostración eliminado: la base real siempre manda.

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

/* ── Día calendario en horario de Perú (UTC−5) ───────────────────────
 * TODA conversión fecha→día (hoy, semana, vencimientos) debe pasar por aquí.
 * Antes se usaba el día UTC, que cambia a las ~7 PM de Perú y "adelantaba" hoy,
 * la racha, la meta diaria, la liga semanal y los repasos. */
function peruNow() { return new Date(Date.now() - 5 * 3600000); }   // campos UTC = hora Perú
function peruDayStr(t) {
  const ms = (t == null) ? Date.now() : (typeof t === 'number' ? t : Date.parse(t));
  return new Date(ms - 5 * 3600000).toISOString().slice(0, 10);
}

/* Eligibility: completed all modules of current level + activated by teacher */
function isEligibleForExam(student) {
  const mods = MODULE_CATALOG[student.level] || [];
  if (mods.length === 0) return false;
  const progress = getStudentProgress(student.id);
  return mods.every(m =>
    m.activities.every(a => entryPassed(progress.completed[`${m.id}:${a.id}`], student.level, student.group))
  );
}

/* Grupos de DEMOSTRACIÓN (solo se usan con el modo demo activo). */
const DEMO_GROUPS = [
  { id: 'g1', level: 'pre-a1', name: 'Pre-A1 · Lunes & Miércoles', schedule: '6:00pm – 7:30pm', startDate: '2026-03-04' },
  { id: 'g2', level: 'pre-a1', name: 'Pre-A1 · Sábados',           schedule: '10:00am – 1:00pm', startDate: '2026-03-07' },
  { id: 'g3', level: 'a1',     name: 'A1 · Martes & Jueves',       schedule: '7:00pm – 8:30pm', startDate: '2026-02-10' },
  { id: 'g4', level: 'a2',     name: 'A2 · Viernes',               schedule: '6:30pm – 9:00pm', startDate: '2026-01-16' },
];
const DEFAULT_GROUPS = _DEMO_ON ? DEMO_GROUPS : [];

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
    // 🕒 e.date viene en UTC (ISO con Z): se muestra en HORA DE PERÚ (UTC−5).
    // Antes se recortaba el string tal cual → salía la hora UTC (5 h adelantada).
    const ts = Date.parse(e.date || '');
    const ev = {
      studentId, type: info.type || 'story', module: info.module,
      detail: info.item + (e.minutes ? ` · ${Math.round(e.minutes)} min` : ''),
      date: isNaN(ts) ? '' : new Date(ts - 5 * 3600000).toISOString().replace('T', ' ').slice(0, 16),
    };
    if (typeof e.score === 'number') { ev.score = e.score > 10 ? Math.round(e.score) : Math.round(e.score * 10); ev.max = 100; }
    return ev;
  });
  return events.sort((a, b) => b.date.localeCompare(a.date));
}

const DEMO_STUDENTS = [
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

/* Roster real: vacío salvo en modo demo. App.jsx lo rellena desde Supabase. */
const STUDENTS = loadStudents(_DEMO_ON ? DEMO_STUDENTS : []);

/* Recent activity log — solo demostración (en uso real sale del progreso real) */
const DEMO_ACTIVITY_LOG = [
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
const ACTIVITY_LOG = _DEMO_ON ? DEMO_ACTIVITY_LOG : [];

/* Logros coherentes y CON PROGRESO.
 * Cada uno: icon, name, how (cómo ganarlo, da dirección al alumno),
 * metric (de dónde sale el progreso), goal, color del aro.
 * El aro se llena a medida que avanzan y se vuelve dorado/lleno al conseguirlo. */
/* Logros que DECAEN por inactividad (los acumulativos: prácticas, minutos,
 * módulos, rachas). Los de habilidad demostrada (100%, promedio) no decaen. */
const ACHIEVEMENT_DEFS = {
  first:      { icon:'🌱', name:'Primer paso',     how:'Completa tu primera práctica.',                 metric:'practices', goal:1,   decay:true, color:'#66BB6A', colorDark:'#2E7D32', glow:'rgba(102,187,106,0.45)' },
  practice5:  { icon:'📚', name:'Constante',       how:'Completa 5 prácticas en total.',                metric:'practices', goal:5,   decay:true, color:'#42A5F5', colorDark:'#1565C0', glow:'rgba(66,165,245,0.45)' },
  practice15: { icon:'🏅', name:'Dedicado/a',      how:'Completa 15 prácticas en total.',               metric:'practices', goal:15,  decay:true, color:'#FFB300', colorDark:'#FF8F00', glow:'rgba(255,179,0,0.5)' },
  streak3:    { icon:'🔥', name:'En racha',        how:'Practica 3 días seguidos.',                     metric:'streak',    goal:3,   decay:true, color:'#FF7043', colorDark:'#E64A19', glow:'rgba(255,112,67,0.45)' },
  streak7:    { icon:'⚡', name:'Imparable',       how:'Practica 7 días seguidos sin fallar un día.',   metric:'streak',    goal:7,   decay:true, color:'#FFCA28', colorDark:'#F9A825', glow:'rgba(255,202,40,0.5)' },
  hour1:      { icon:'⏱️', name:'Una hora',        how:'Acumula 60 minutos de práctica.',               metric:'minutes',   goal:60,  decay:true, unit:' min', color:'#26C6DA', colorDark:'#00838F', glow:'rgba(38,198,218,0.45)' },
  hours5:     { icon:'🏆', name:'Maratón',         how:'Acumula 5 horas (300 min) de práctica.',        metric:'minutes',   goal:300, decay:true, unit:' min', color:'#FFD54F', colorDark:'#F57F17', glow:'rgba(255,213,79,0.55)' },
  perfect:    { icon:'⭐', name:'Sin errores',     how:'Saca 100% en cualquier quiz.',                  metric:'perfect',   goal:1,   color:'#AB47BC', colorDark:'#6A1B9A', glow:'rgba(171,71,188,0.45)' },
  perfect3:   { icon:'💎', name:'Perfeccionista',  how:'Saca 100% en 3 quizzes distintos.',             metric:'perfect',   goal:3,   color:'#29B6F6', colorDark:'#0277BD', glow:'rgba(41,182,246,0.5)' },
  avg85:      { icon:'🎯', name:'Puntería',        how:'Mantén 85% de promedio o más.',                 metric:'avg',       goal:85,  unit:'%', color:'#EC407A', colorDark:'#AD1457', glow:'rgba(236,64,122,0.45)' },
  module1:    { icon:'🪪', name:'Módulo completo', how:'Termina todas las actividades de un módulo.',   metric:'modules',   goal:1,   decay:true, color:'#FFA726', colorDark:'#EF6C00', glow:'rgba(255,167,38,0.5)' },
};

/* ── Decaimiento de logros por inactividad ────────────────────────────
 * Mientras el alumno practica (lastActiveDays < 2) no pierde nada.
 * A partir de 2 días sin práctica sus logros acumulables empiezan a
 * debilitarse progresivamente, y se recuperan en cuanto vuelve a practicar. */
const ACH_GRACE_DAYS = 2;
function achievementDecayFactor(student) {
  const d = student.lastActiveDays || 0;
  if (d < ACH_GRACE_DAYS) return 1;
  return Math.max(0.25, 1 - (d - 1) * 0.18); // d2≈0.82 · d3≈0.64 · d4≈0.46 · d5≈0.28 · d6+≈0.25
}

/* Progreso real de cada logro a partir de las estadísticas del alumno */
function _medalCurrent(student, metric) {
  const prog = (typeof getStudentProgress === 'function' ? getStudentProgress(student.id) : null) || { completed: {} };
  const entries = Object.values(prog.completed || {});
  switch (metric) {
    case 'practices': return entries.filter(e => entryPassed(e, student.level, student.group)).length;
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
  const trulyEarned = raw >= goal;
  const factor = def.decay ? achievementDecayFactor(student) : 1;
  const eff = def.decay ? raw * factor : raw;
  const pct = Math.max(0, Math.min(100, Math.round((eff / goal) * 100)));
  const done = eff >= goal;
  return {
    current: Math.min(Math.round(eff), goal), rawCurrent: raw, goal, pct, done,
    remaining: Math.max(0, goal - Math.round(eff)),
    decays: !!def.decay, factor,
    lost: trulyEarned && !done,                 // lo tenías y lo estás perdiendo
    fading: trulyEarned && done && factor < 1,  // lo conservas pero está en riesgo
  };
}
function earnedMedals(student) {
  return Object.keys(ACHIEVEMENT_DEFS).filter(k => medalProgress(student, k).done);
}
/* Aviso de logros en peligro por inactividad (banner + notificación) */
function getAchievementAlert(student) {
  const d = student.lastActiveDays || 0;
  if (d < ACH_GRACE_DAYS) return null;
  let lost = 0, fading = 0;
  Object.keys(ACHIEVEMENT_DEFS).forEach(k => {
    const m = medalProgress(student, k);
    if (m.lost) lost++; else if (m.fading) fading++;
  });
  if (lost === 0 && fading === 0) return null;
  return { days: d, lost, fading, atRisk: lost + fading, factor: achievementDecayFactor(student) };
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
        { id:'a1', type:'story',     name:'Stories y Diálogos · Personal Identity', open:true,
          url: GH_PA1_M1 + '/PreA1_M1_Story_Personal%20Identity.html' },
        { id:'a5', type:'reading',   name:'Comprensión lectora · Personal Identity', open:true,
          url: GH_PA1_M1 + '/PreA1_M1_Reading%20Comprehension_Personal%20Identity.html' },
        { id:'a9', type:'listening', name:'Comprensión auditiva · Personal Identity', open:true,
          url: GH_PA1_M1 + '/PreA1_M1_Listening_Personal%20Identity.html' },

        /* ── Tema 1 · Pronombres personales (resumen primero, luego prácticas) ── */
        { id:'s1', type:'summary',   name:'Resumen · Pronombres personales', group:'Pronombres personales', open:true,
          url: GH_PA1_M1 + '/Resumen%20de%20Gram%C3%A1tica/PreA1_M1_Grammar%20Summary_Pronouns.html' },
        { id:'g1a', type:'grammar',  name:'Fill in',        group:'Pronombres personales',
          url: GH_PA1_M1 + '/Practicas/T1_PRONOUNS/PreA1_M1_Grammar_Pronouns_Fill%20in.html' },
        { id:'g1b', type:'grammar',  name:'Identification', group:'Pronombres personales',
          url: GH_PA1_M1 + '/Practicas/T1_PRONOUNS/PreA1_M1_Grammar_Pronouns_Identification.html' },
        { id:'g1c', type:'grammar',  name:'Transform',      group:'Pronombres personales',
          url: GH_PA1_M1 + '/Practicas/T1_PRONOUNS/PreA1_M1_Grammar_Pronouns_Transform.html' },

        /* ── Tema 2 · Verbo To be (Ronda 1 + Ronda 2 integradas, cada una con su resumen) ── */
        { id:'s2', type:'summary',   name:'Resumen · To be (afirmativo y negativo)', group:'Verbo To be',
          url: GH_PA1_M1 + '/Resumen%20de%20Gram%C3%A1tica/PreA1_M1_Grammar%20Summary_To%20be%20(Affirmative-Negative).html' },
        { id:'g2a', type:'grammar',  name:'Fill in',        group:'Verbo To be',
          url: GH_PA1_M1 + '/Practicas/T2_To%20be/PreA1_M1_Grammar_To%20be_Fill%20in.html' },
        { id:'g2b', type:'grammar',  name:'Identification', group:'Verbo To be',
          url: GH_PA1_M1 + '/Practicas/T2_To%20be/PreA1_M1_Grammar_To%20be_Identification.html' },
        { id:'g2c', type:'grammar',  name:'Transform',      group:'Verbo To be',
          url: GH_PA1_M1 + '/Practicas/T2_To%20be/PreA1_M1_Grammar_To%20be_Transform.html' },
        { id:'s3', type:'summary',   name:'Resumen · To be (preguntas) — Ronda 2', group:'Verbo To be',
          url: GH_PA1_M1 + '/Resumen%20de%20Gram%C3%A1tica/PreA1_M1_Grammar%20Summary_To%20be%20(Questions).html' },
        { id:'g3a', type:'grammar',  name:'Fill in · preguntas',        group:'Verbo To be',
          url: GH_PA1_M1 + '/Practicas/T2_To%20be_2/PreA1_M1_Grammar_To_be_Fill_in_P2.html' },
        { id:'g3b', type:'grammar',  name:'Identification · preguntas', group:'Verbo To be',
          url: GH_PA1_M1 + '/Practicas/T2_To%20be_2/PreA1_M1_Grammar_To_be_Identification_P2.html' },
        { id:'g3c', type:'grammar',  name:'Transform · preguntas',      group:'Verbo To be',
          url: GH_PA1_M1 + '/Practicas/T2_To%20be_2/PreA1_M1_Grammar_To_be_Transform_P2.html' },

        /* ── Tema 3 · There is / There are ── */
        { id:'s4', type:'summary',   name:'Resumen · There is / There are', group:'There is / There are',
          url: GH_PA1_M1 + '/Resumen%20de%20Gram%C3%A1tica/PreA1_M1_Grammar%20Summary_There%20is-are.html' },
        { id:'g4a', type:'grammar',  name:'Fill in',        group:'There is / There are',
          url: GH_PA1_M1 + '/Practicas/T3_There%20is_are/PreA1_M1_Grammar_There%20is-are_Fill%20in.html' },
        { id:'g4b', type:'grammar',  name:'Identification', group:'There is / There are',
          url: GH_PA1_M1 + '/Practicas/T3_There%20is_are/PreA1_M1_Grammar_There%20is-are_Identification.html' },
        { id:'g4c', type:'grammar',  name:'Transform',      group:'There is / There are',
          url: GH_PA1_M1 + '/Practicas/T3_There%20is_are/PreA1_M1_Grammar_There%20is-are_Transform.html' },

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
        { id:'a6', type:'grammar',   name:'Gramática · Present Perfect', latent:true },
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

/* ── PASO 2 · Umbral de aprobación por nivel (anti-farmeo) ────────────
 * Decisión del teacher: la exigencia sube de nivel en nivel.
 *   Pre-A1 75% · A1 78% · A2 85%  (A2 más alto: rumbo a exámenes internacionales)
 * El profesor puede ajustar cada umbral. Se guarda local + nube (app_settings).
 *
 * REGLA CLAVE — "recálculo de historial": el aprobado/reprobado NO se congela
 * al momento de hacer la actividad, se vuelve a juzgar SIEMPRE contra el umbral
 * vigente (entryPassed mira la nota guardada). Así, cuando el teacher sube el
 * umbral, todo el ranking se corrige solo y Mijhael deja de estar 1° sin migrar
 * un solo dato. */
const PASS_THRESHOLD_KEY = 'jucum_pass_threshold_v1';
const DEFAULT_PASS_THRESHOLD = { 'pre-a1': 75, 'a1': 78, 'a2': 85 };
/* Estructura guardada: { 'pre-a1':75, 'a1':78, 'a2':85, __groups: { <groupId>: 80 } }
 * - Las claves de nivel son el ESTÁNDAR base (rigor creciente del nivel).
 * - __groups guarda OVERRIDES por grupo. Si un grupo no está en __groups,
 *   hereda el umbral de su nivel. Borrar el override = volver a heredar. */
function getPassThresholds() {
  try {
    const s = JSON.parse(localStorage.getItem(PASS_THRESHOLD_KEY) || 'null');
    if (s && typeof s === 'object') return { ...DEFAULT_PASS_THRESHOLD, ...s, __groups: { ...(s.__groups || {}) } };
  } catch {}
  return { ...DEFAULT_PASS_THRESHOLD, __groups: {} };
}
/* Umbral efectivo: override del grupo si existe, si no el del nivel. */
function passThreshold(level, groupId) {
  const t = getPassThresholds();
  if (groupId && t.__groups && t.__groups[groupId] != null) return t.__groups[groupId];
  return t[level] != null ? t[level] : 75;
}
function _savePassThresholds(t) {
  localStorage.setItem(PASS_THRESHOLD_KEY, JSON.stringify(t));
  try { if (window.JUCUM_SB) window.JUCUM_SB.getClient().from('app_settings').upsert({ key: 'pass_threshold', value: t }, { onConflict: 'key' }).then(() => {}, () => {}); } catch {}
  return t;
}
/* Estándar del NIVEL (base que heredan todos sus grupos). */
function setPassThreshold(level, value) {
  const t = getPassThresholds();
  t[level] = Math.max(0, Math.min(100, Math.round(value)));
  return _savePassThresholds(t);
}
/* Override de un GRUPO. value=null/undefined ⇒ borra el override (vuelve a heredar). */
function setGroupThreshold(groupId, value) {
  const t = getPassThresholds();
  t.__groups = t.__groups || {};
  if (value == null) delete t.__groups[groupId];
  else t.__groups[groupId] = Math.max(0, Math.min(100, Math.round(value)));
  return _savePassThresholds(t);
}
/* Override crudo del grupo (null si hereda). Para la UI del profesor. */
function getGroupThreshold(groupId) {
  const t = getPassThresholds();
  return (t.__groups && t.__groups[groupId] != null) ? t.__groups[groupId] : null;
}
/* Carga best-effort del umbral desde la nube (multi-dispositivo) */
async function loadPassThresholdsFromCloud() {
  if (!window.JUCUM_SB) return;
  try {
    const { data } = await window.JUCUM_SB.getClient().from('app_settings').select('value').eq('key', 'pass_threshold').maybeSingle();
    if (data && data.value && typeof data.value === 'object') {
      localStorage.setItem(PASS_THRESHOLD_KEY, JSON.stringify({ ...DEFAULT_PASS_THRESHOLD, ...data.value, __groups: { ...(data.value.__groups || {}) } }));
    }
  } catch {}
}

/* ── MODO MANTENIMIENTO ───────────────────────────────────────────────
 * El Desarrollador (rol 'dev') puede "cerrar" la plataforma mientras hace
 * tareas técnicas. Mientras está activo, nadie que no sea 'dev' puede usarla.
 * Se guarda local (caché) + nube (app_settings key 'maintenance') para que
 * aplique en TODOS los dispositivos. App.jsx lo consulta al arrancar y lo
 * sondea cada pocos segundos para expulsar/liberar a los alumnos en vivo. */
const MAINTENANCE_KEY = 'jucum_maintenance_v1';
const DEFAULT_MAINTENANCE = {
  active: false,
  message: 'Estamos haciendo mejoras en la plataforma. Volvemos en un ratito 💛',
  updatedAt: null,
};
function getMaintenance() {
  try {
    const s = JSON.parse(localStorage.getItem(MAINTENANCE_KEY) || 'null');
    if (s && typeof s === 'object') return { ...DEFAULT_MAINTENANCE, ...s };
  } catch {}
  return { ...DEFAULT_MAINTENANCE };
}
function setMaintenance(partial) {
  const next = { ...getMaintenance(), ...partial, updatedAt: new Date().toISOString() };
  localStorage.setItem(MAINTENANCE_KEY, JSON.stringify(next));
  try { if (window.JUCUM_SB) window.JUCUM_SB.getClient().from('app_settings').upsert({ key: 'maintenance', value: next }, { onConflict: 'key' }).then(() => {}, () => {}); } catch {}
  return next;
}
/* Carga best-effort desde la nube. Devuelve el estado vigente (o null si falla). */
async function loadMaintenanceFromCloud() {
  if (!window.JUCUM_SB) return getMaintenance();
  try {
    const { data } = await window.JUCUM_SB.getClient().from('app_settings').select('value').eq('key', 'maintenance').maybeSingle();
    if (data && data.value && typeof data.value === 'object') {
      const v = { ...DEFAULT_MAINTENANCE, ...data.value };
      localStorage.setItem(MAINTENANCE_KEY, JSON.stringify(v));
      return v;
    }
  } catch {}
  return getMaintenance();
}

/* Normaliza una nota a porcentaje 0-100.
 * Convención de la plataforma: notas >10 = porcentaje (0-100); ≤10 = escala /10.
 * Devuelve null si la actividad no tiene nota (story / diálogo / quizlet). */
function scorePct(score) {
  if (typeof score !== 'number') return null;
  return score > 10 ? Math.min(100, Math.round(score)) : Math.min(100, Math.round((score / 10) * 100));
}
/* Nivel al que pertenece un módulo (para juzgar contra su umbral) */
function levelOfModule(moduleId) {
  for (const lvl of Object.keys(MODULE_CATALOG)) {
    if ((MODULE_CATALOG[lvl] || []).some(m => m.id === moduleId)) return lvl;
  }
  return null;
}
/* ¿Esta actividad cuenta como APROBADA (= completada)?
 * - Sin nota (participación: story/quizlet) → siempre cuenta como hecha.
 * - Con nota → solo si llega al umbral del nivel. Se juzga en cada lectura. */
function entryPassed(entry, level, groupId) {
  if (!entry) return false;
  const pct = scorePct(entry.score);
  if (pct === null) return true;                 // participación
  return pct >= passThreshold(level || 'pre-a1', groupId);
}

/* ── Decisión del teacher (METHODOLOGY DECISIONS / EXPECTATIONS) ──────
 * La gramática se mide por las prácticas P1/P2/P3, NO por los MCQ de los
 * Resúmenes de gramática (son auto-chequeo de baja exigencia, "student-facing
 * only, not teacher-reported"). El vocabulario (Quizlet) es práctica suelta,
 * tampoco se califica. Estos tipos cuentan como PARTICIPACIÓN: completarlos
 * basta (no se exige umbral), su nota no alimenta el dominio y no entran a
 * "por mejorar" / repaso / refuerzo. */
function isLowStakesType(type) { return type === 'summary' || type === 'quizlet'; }
/* ¿La actividad <activityId> de <moduleId> es de baja exigencia? */
function _actTypeOf(moduleId, activityId, level) {
  const mods = MODULE_CATALOG[level] || [];
  for (const m of mods) if (m.id === moduleId) { const a = (m.activities || []).find(x => x.id === activityId); return a ? a.type : null; }
  // sin nivel: busca en todos
  for (const lv of Object.keys(MODULE_CATALOG)) for (const m of MODULE_CATALOG[lv]) if (m.id === moduleId) { const a = (m.activities || []).find(x => x.id === activityId); return a ? a.type : null; }
  return null;
}

/* ── Student progress (which activities completed) ───────────────── */
const PROGRESS_KEY = 'jucum_student_progress_v1';
/* Días con práctica por alumno (solo se AGREGA, nunca se pisa) — fuente local de la racha. */
const ACTIVE_DAYS_KEY = 'jucum_active_days_v1';
/* Días activos desde fuentes que NO se sobreescriben: daily_sessions (nube,
 * window.__JEC_DAYS) + registro local. entry.date se pisa en cada reintento,
 * así que racha/constancia/días del mes deben unir estas fuentes. */
function getExtraActiveDays(studentId) {
  const out = new Set();
  try { const m = window.__JEC_DAYS && window.__JEC_DAYS[studentId]; if (m) Object.keys(m).forEach(d => out.add(d)); } catch (e) {}
  try { const ad = JSON.parse(localStorage.getItem(ACTIVE_DAYS_KEY) || '{}'); (ad[studentId] || []).forEach(d => out.add(d)); } catch (e) {}
  return out;
}
function getStudentProgress(studentId) {
  let all = {};
  try { all = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); } catch {}
  const base = all[studentId] || { completed: {}, todayMinutes: 0, lastDay: null };
  /* Meta diaria multi-equipo: los minutos de HOY también viven en la nube
   * (daily_sessions, escritos por jucum-connect desde los materiales). Se toma
   * el MAYOR entre lo local y lo de la nube. */
  try {
    const cd = window.__JEC_DAILY && window.__JEC_DAILY[studentId];
    if (cd && cd.day === peruDayStr()) {
      const localMin = (base.lastDay === peruDayStr()) ? (base.todayMinutes || 0) : 0;
      base.todayMinutes = Math.max(localMin, cd.minutes || 0);
      base.lastDay = peruDayStr();
    }
  } catch (e) {}
  return base;
}
function markActivityComplete(studentId, moduleId, activityId, score, minutes, meta) {
  let all = {};
  try { all = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); } catch {}
  const prev = all[studentId] || { completed: {}, todayMinutes: 0, lastDay: null };
  const key = `${moduleId}:${activityId}`;
  /* PASO 2 · En un reintento se conserva la MEJOR nota (el alumno no pierde por
   * volver a intentar). Los minutos se acumulan (esfuerzo real). */
  const existing = prev.completed[key];
  let finalScore = score;
  const newPct = scorePct(score);
  const oldPct = existing ? scorePct(existing.score) : null;
  if (existing && typeof oldPct === 'number' && typeof newPct === 'number' && oldPct >= newPct) {
    finalScore = existing.score;
  }
  const finalMin = (existing && typeof existing.minutes === 'number' ? existing.minutes : 0) + (minutes || 0);
  const _stu = STUDENTS.find(s => s.id === studentId) || {};
  const level = _stu.level || levelOfModule(moduleId) || 'pre-a1';
  const pct = scorePct(finalScore);
  prev.completed[key] = {
    score: finalScore,
    minutes: finalMin,
    date: new Date().toISOString(),
    attempts: (existing && existing.attempts ? existing.attempts : 0) + 1,
    pct,
    passed: entryPassed({ score: finalScore }, level, _stu.group),   // hint; el valor real se re-juzga al leer
  };
  const today = peruDayStr();   // día en hora Perú (no UTC): la meta de hoy corta a medianoche de Lima
  if (prev.lastDay !== today) { prev.todayMinutes = 0; prev.lastDay = today; }
  prev.todayMinutes += (minutes || 0);
  all[studentId] = prev;
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
  /* 🔥 FIX racha: entry.date se sobreescribe en cada reintento, así que repasar un
   * material de un día anterior BORRABA la evidencia de ese día y la racha se caía.
   * Guardamos cada día practicado en una clave propia (hydrate no la pisa);
   * computeStats la une con daily_sessions (nube) para calcular la racha real. */
  try {
    const adAll = JSON.parse(localStorage.getItem(ACTIVE_DAYS_KEY) || '{}');
    const adList = adAll[studentId] || [];
    if (adList[adList.length - 1] !== today) {
      adList.push(today);
      adAll[studentId] = adList.slice(-120);
      localStorage.setItem(ACTIVE_DAYS_KEY, JSON.stringify(adAll));
    }
  } catch (e) {}
  // PASO 3 · alimenta el motor de repaso espaciado con ESTE intento (no la mejor nota)
  try { recordReviewAttempt(studentId, moduleId, activityId, score, _stu.group, _stu.level, meta && meta.total); } catch {}
  if (window.JUCUM_SYNC) window.JUCUM_SYNC.pushProgress(studentId, moduleId, activityId, finalScore, finalMin);
  return prev;
}

/* ── Bloque C · Gamification ─────────────────────────────────────── */

/* XP awarded per activity type */
const XP_BASE = { story:10, reading:25, listening:20, grammar:15, quizlet:10 };

/* ── Lectura (Stories/Diálogos) · XP por TIEMPO, progresivo y con tope ──────
 * Krashen: lo importante es el tiempo de input, no "aprobar". No hay meta de
 * tiempo; medimos cuánto leen y damos XP creciente por cada bloque de 10 min,
 * con tope a los 30 min (después puede seguir leyendo, pero ya no suma).
 *   10 min → +5 · 20 min → +10 más · 30 min → +15 más  (acumulado máx 30 XP). */
const READING_XP_TIERS = [5, 10, 15];
function readingTimeXP(minutes) {
  const blocks = Math.min(READING_XP_TIERS.length, Math.floor((minutes || 0) / 10));
  let x = 0; for (let i = 0; i < blocks; i++) x += READING_XP_TIERS[i];
  return x;
}

/* Busca una actividad por su clave en TODOS los niveles (no solo el vigente).
 * Así, al promover de nivel, el XP de lo ya practicado NO se pierde (bug B2). */
function _findAct(modId, actId) {
  for (const lvl of Object.keys(MODULE_CATALOG)) {
    const mod = (MODULE_CATALOG[lvl] || []).find(m => m.id === modId);
    if (mod) { const a = (mod.activities || []).find(x => x.id === actId); if (a) return a; }
  }
  return null;
}
/* ── FUENTE ÚNICA de "XP ganado por UNA actividad" ──────────────────
 * La usan el XP total, la liga semanal y el bono semanal, para que los tres
 * midan IGUAL (antes la liga ignoraba el anti-farmeo y el tiempo de lectura → un
 * alumno podía liderar la liga con prácticas reprobadas). */
function activityEarnedXP(entry, key, student) {
  if (!entry) return 0;
  // Anti-farmeo: con nota bajo el umbral → solo participación (+5). Aprobar da todo.
  if (!entryPassed(entry, student.level, student.group)) return 5;
  const [modId, actId] = key.split(':');
  const act = _findAct(modId, actId);
  if (!act) return 10;
  if (act.type === 'story') return readingTimeXP(entry.minutes);   // lectura: XP por tiempo
  const base = XP_BASE[act.type] || 10;
  let bonusPct = 0.5;
  if (typeof entry.score === 'number') bonusPct = entry.score > 10 ? Math.min(1, entry.score / 100) : Math.min(1, entry.score / 10);
  return Math.round(base * (1 + bonusPct));
}

/* ── Bono semanal re-ganable · UNA vez por material por semana ───────
 * daily_sessions (nube) registra qué material se practicó y qué día. Agrupado por
 * semana ISO sabemos en cuántas SEMANAS DISTINTAS se practicó cada material. Cada
 * semana en que lo practican vuelve a premiar (mitad del XP del material), además
 * del XP base por completarlo. Repetir el MISMO DÍA no suma (daily_sessions agrupa
 * por día → una semana cuenta una sola vez): evita el farmeo diario y premia la
 * constancia semanal, tanto en la práctica del día como en los repasos. */
const WEEKLY_REEARN_CAP = 8;   // tope de semanas que suman por material (seguridad)
function _weeksPracticed(studentId, key) {
  try {
    const w = window.__JEC_WEEKS && window.__JEC_WEEKS[studentId];
    if (!w) return 0;
    let n = 0;
    for (const wk of Object.keys(w)) { if (w[wk] && w[wk][key]) n++; }
    return n;
  } catch { return 0; }
}
function weeklyReEarnXP(student) {
  const progress = getStudentProgress(student.id);
  let xp = 0;
  for (const key of Object.keys(progress.completed || {})) {
    const weeks = Math.min(WEEKLY_REEARN_CAP, _weeksPracticed(student.id, key));
    if (weeks < 1) continue;   // cada semana distinta en que lo practicaron paga
    const per = Math.max(3, Math.round(activityEarnedXP(progress.completed[key], key, student) * 0.5));
    xp += weeks * per;
  }
  return xp;
}

/* ── Bono de XP persistente (asistencia perfecta, encuesta, etc.) ────
 * Antes vivían solo en localStorage (jucum_league_v1) y el ranking en la nube los
 * IGNORABA → los +120/+60 no movían nada (bug A1). Ahora se guardan por semana en
 * la nube (app_settings 'bonus_xp') y suman al XP total y al semanal. */
const BONUS_KEY = 'jucum_bonus_xp_v1';
function _getBonusState() { try { return JSON.parse(localStorage.getItem(BONUS_KEY) || '{}'); } catch { return {}; } }
function addBonusXP(studentId, xp) {
  if (!studentId || !xp) return;
  const all = _getBonusState();
  const wk = weekId();
  all[wk] = all[wk] || {};
  all[wk][studentId] = (all[wk][studentId] || 0) + xp;
  const keys = Object.keys(all).sort(); while (keys.length > 8) delete all[keys.shift()];  // conserva ~8 semanas
  localStorage.setItem(BONUS_KEY, JSON.stringify(all));
  try { if (window.JUCUM_SB) window.JUCUM_SB.getClient().from('app_settings').upsert({ key: 'bonus_xp', value: all }, { onConflict: 'key' }).then(() => {}, () => {}); } catch {}
}
function getBonusXPTotal(studentId) { const all = _getBonusState(); let x = 0; for (const wk of Object.keys(all)) x += (all[wk] && all[wk][studentId]) || 0; return x; }
function getBonusXPWeek(studentId) { const all = _getBonusState(); return (all[weekId()] && all[weekId()][studentId]) || 0; }
async function loadBonusXPFromCloud() {
  if (!window.JUCUM_SB) return;
  try { const { data } = await window.JUCUM_SB.getClient().from('app_settings').select('value').eq('key', 'bonus_xp').maybeSingle();
    if (data && data.value && typeof data.value === 'object') localStorage.setItem(BONUS_KEY, JSON.stringify(data.value)); } catch {}
}

/* ¿Semana nueva para este alumno? (aviso "vuelve a practicar y gana XP extra").
 * NO cambia el estado/bloqueo de ningún material — solo dispara el aviso. */
function isNewWeekFor(studentId) {
  try { return localStorage.getItem('jucum_week_seen_' + studentId) !== weekId(); } catch { return false; }
}
function markWeekSeen(studentId) { try { localStorage.setItem('jucum_week_seen_' + studentId, weekId()); } catch {} }

/* Compute total XP for a student.
 *   = XP por actividad completada (1 vez · fuente: activityEarnedXP)
 *   + bono semanal re-ganable (repasar en semanas distintas)
 *   + bonos persistentes (asistencia/encuesta)
 *   + 30 XP por día de racha (tope 14) + 50 XP por logro
 *   − penalización suave por inactividad
 */
function getStudentXP(student) {
  const progress = getStudentProgress(student.id);
  let xp = 0;
  for (const key of Object.keys(progress.completed || {})) {
    xp += activityEarnedXP(progress.completed[key], key, student);   // 1ª vez por material
  }
  xp += weeklyReEarnXP(student);        // cada semana que lo repasan vuelve a dar XP
  xp += getBonusXPTotal(student.id);    // asistencia perfecta, encuesta, etc.
  xp += Math.min(student.streak || 0, 14) * 30;
  xp += (student.achievements?.length || 0) * 50;
  // PASO 2 · Bono por terminar la práctica dirigida a tiempo Y aprobada
  xp += getDirectedBonusXP(student);
  // XP por tareas entregadas (gamificación: cada entrega suma; +20 si fue bien calificada)
  try {
    const subs = JSON.parse(localStorage.getItem('jucum_submissions_v1') || '{}');
    Object.values(subs).forEach(byStu => {
      const s = byStu && byStu[student.id];
      if (s) { xp += 40; if (typeof s.grade === 'number' && s.grade >= 70) xp += 20; }
    });
  } catch {}
  // Penalización suave por inactividad (crece cada día, tope 60) — se recupera al volver a practicar
  xp -= getInactivityXPLoss(getRealInactiveDays(student));
  return Math.max(0, xp);
}

/* Días reales sin practicar, derivados del progreso (no del campo estático de demo). */
function getRealInactiveDays(student) {
  try {
    const prog = getStudentProgress(student.id) || {};
    if ((prog.todayMinutes || 0) > 0) return 0;   // practicó hoy (local o nube-hoy)
    // Fuente PRINCIPAL: el valor derivado de la NUBE por computeStats (hora Perú;
    // une daily_sessions + progreso + días locales). Es el MISMO número que ve el
    // resto de la plataforma, así que evita el falso "N días sin practicar" cuando
    // el alumno practicó DENTRO del material (que escribe a la nube) o en otro
    // equipo, y el localStorage de ESTE navegador quedó viejo.
    if (typeof student.lastActiveDays === 'number') return Math.max(0, student.lastActiveDays);
    // Fallback local (sin nube todavía): contar en día de PERÚ, no del navegador/UTC.
    if (prog.lastDay) {
      const todayPeru = peruDayStr();
      return Math.max(0, Math.round((Date.parse(todayPeru + 'T00:00:00Z') - Date.parse(prog.lastDay + 'T00:00:00Z')) / 86400000));
    }
  } catch (e) {}
  return typeof student.lastActiveDays === 'number' ? Math.max(0, student.lastActiveDays) : 0;
}

/* Pérdida de XP por días sin practicar: día 2 → 2 · día 3 → 6 · día 4 → 12 · día 5 → 20… (tope 60) */
function getInactivityXPLoss(days) { if (!days || days < 2) return 0; return Math.min((days - 1) * days, 60); }

/* Suma de bonos de prácticas dirigidas COMPLETADAS a tiempo y aprobadas.
 * Lee el estado real desde JUCUM_TT (que ya usa passThreshold). */
function getDirectedBonusXP(student) {
  try {
    const TT = window.JUCUM_TT;
    if (!TT || !TT.getActiveDirectedForStudent) return 0;
    let xp = 0;
    TT.getActiveDirectedForStudent(student).forEach(dp => {
      const st = TT.directedStatusForStudent(dp, student);
      if (st && st.state === 'completed' && st.onTime && dp.bonusXp > 0) xp += dp.bonusXp;
    });
    return xp;
  } catch { return 0; }
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

/* Seed plausible progress for demo students — 2 meses de historial repartido en
 * varias semanas y competencias, para que "Mi evolución" muestre una curva real
 * y todas las secciones tengan datos. Solo en modo local (sin Supabase). */
function seedDemoProgress() {
  return; // Modo demostración eliminado: nunca se siembran datos ficticios.
}
seedDemoProgress();

/* Cache catalog for activity-tracker.js (runs in activity kits without data.js) */
try { localStorage.setItem('jucum_module_catalog_cache', JSON.stringify(MODULE_CATALOG)); } catch {}

/* ── Mejora E · Weekly league (resets every Monday) ─────────────── */
const LEAGUE_KEY = 'jucum_league_v1';
function weekId() {
  const p = peruNow();                       // "ahora" en Perú (campos UTC = hora Perú)
  const day = (p.getUTCDay() + 6) % 7;       // 0 = lunes
  p.setUTCDate(p.getUTCDate() - day);
  return p.toISOString().slice(0, 10);       // lunes de esta semana (fecha Perú)
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
  // Bug A1: además persiste en la nube (bonus_xp) para que SÍ cuente en el ranking
  // real y en el XP total (asistencia perfecta +120, encuesta +60, etc.).
  addBonusXP(studentId, xp);
}
/* Cloud mode: weekly XP derived from real progress entries since Monday
 * (same per-activity formula as getStudentXP, no streak/achievement bonus) */
function getWeeklyXPFromProgress(student) {
  const progress = getStudentProgress(student.id);
  const monday = weekId();
  let xp = 0;
  for (const [key, entry] of Object.entries(progress.completed || {})) {
    if (!entry || !entry.date || peruDayStr(entry.date) < monday) continue;
    xp += activityEarnedXP(entry, key, student);   // misma fórmula que el XP total (anti-farmeo + lectura por tiempo)
  }
  xp += getBonusXPWeek(student.id);                // asistencia/encuesta de ESTA semana
  return xp;
}
function getWeeklyRanking(groupId) {
  return STUDENTS
    .filter(s => s.group === groupId)
    .map(s => ({ student: s, xp: window.JUCUM_SB ? getWeeklyXPFromProgress(s) : (getWeeklyXP(s.id) || Math.floor(getStudentXP(s) * 0.12)) }))
    .sort((a, b) => b.xp - a.xp);
}
function daysUntilMonday() {
  const p = peruNow();
  return ((8 - p.getUTCDay()) % 7) || 7;
}

/* ════════════════════════════════════════════════════════════════════
 * 🏆 LIGA SEMANAL · campeones congelados + escenario del #1 + emoji por ganador
 *  - El Top 3 de la semana que YA cerró queda FIJO ("campeones de la semana")
 *    hasta el lunes siguiente, cuando se corona al nuevo podio.
 *  - El #1 elige un ESCENARIO (fondo) que ve todo el grupo.
 *  - Cada uno de los 3 ganadores elige su EMOJI de avatar (solo el suyo).
 *  Persistencia: localStorage (caché) + app_settings 'weekly_league' (nube,
 *  multidispositivo). La LISTA se congela al calcularse por primera vez en la
 *  semana y se comparte por la nube; solo se guardan también las ELECCIONES. */
const LEAGUE_STATE_KEY = 'jucum_league_state_v1';
const LEAGUE_SCENARIOS = ['theme-gold','theme-mountains','theme-night','theme-aurora','theme-ocean','theme-party'];
function lastWeekId() {                       // lunes de la semana ANTERIOR (la cerrada)
  const p = peruNow(); const day = (p.getUTCDay() + 6) % 7;
  p.setUTCDate(p.getUTCDate() - day - 7);
  return p.toISOString().slice(0, 10);
}
function _nextMonday(mondayStr) {
  const d = new Date(mondayStr + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString().slice(0, 10);
}
/* XP de un alumno DENTRO de una semana concreta [lunes, lunes+7) */
function getWeeklyXPForWeek(student, mondayStr) {
  const progress = getStudentProgress(student.id);
  const end = _nextMonday(mondayStr);
  let xp = 0;
  for (const [key, entry] of Object.entries(progress.completed || {})) {
    if (!entry || !entry.date) continue;
    const day = peruDayStr(entry.date);
    if (day < mondayStr || day >= end) continue;
    xp += activityEarnedXP(entry, key, student);   // misma fórmula que el XP total
  }
  return xp;
}
function getRankingForWeek(groupId, mondayStr) {
  return STUDENTS
    .filter(s => s.group === groupId)
    .map(s => ({ student: s, xp: getWeeklyXPForWeek(s, mondayStr) }))
    .sort((a, b) => b.xp - a.xp);
}
function _getLeagueState() { try { return JSON.parse(localStorage.getItem(LEAGUE_STATE_KEY) || '{}'); } catch { return {}; } }
function _saveLeagueState(all, pushCloud) {
  localStorage.setItem(LEAGUE_STATE_KEY, JSON.stringify(all));
  if (pushCloud) { try { if (window.JUCUM_SB) window.JUCUM_SB.getClient().from('app_settings').upsert({ key: 'weekly_league', value: all }, { onConflict: 'key' }).then(() => {}, () => {}); } catch {} }
}
/* ¿Este dispositivo es del PERSONAL (profesor/admin/dev)? Solo ellos tienen el
 * progreso de TODO el grupo en caché, así que solo ellos pueden calcular y
 * publicar los campeones. Un alumno solo tiene SU progreso → si calculara, se
 * vería solo a sí mismo y sobrescribiría el podio en la nube (causa de que
 * "los campeones cambien a cada rato"). */
function _leagueIsStaff() {
  try { const u = JSON.parse(localStorage.getItem('jucum_user') || 'null');
    return !!(u && (u.role === 'teacher' || u.role === 'admin' || u.role === 'dev')); } catch { return false; }
}
function _computeChampList(groupId, wk) {
  return getRankingForWeek(groupId, wk).filter(r => r.xp > 0).slice(0, 3)
    .map((r, i) => ({ id: r.student.id, name: r.student.fullName, xp: r.xp, rank: i + 1 }));
}
function _sameChampList(a, b) {
  a = a || []; b = b || [];
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) { if (a[i].id !== b[i].id || a[i].xp !== b[i].xp) return false; }
  return true;
}
async function loadLeagueFromCloud() {
  if (!window.JUCUM_SB) return;
  try {
    const { data } = await window.JUCUM_SB.getClient().from('app_settings').select('value').eq('key', 'weekly_league').maybeSingle();
    if (data && data.value && typeof data.value === 'object') {
      const cloud = data.value, local = _getLeagueState();
      // la nube manda para la semana vigente; conserva grupos que la nube no traiga
      localStorage.setItem(LEAGUE_STATE_KEY, JSON.stringify({ ...local, ...cloud }));
    }
  } catch {}
}
function _leagueGroup(groupId, create) {
  const wk = lastWeekId(); const all = _getLeagueState();
  let g = all[groupId];
  if (_leagueIsStaff()) {
    // Personal: ÚNICA fuente que congela los campeones (tiene el progreso de todo el
    // grupo). Se congela UNA sola vez por semana: cuando ya hay Top 3 fijo para la
    // semana cerrada, NO se recalcula ni se re-publica. Antes se re-publicaba cada
    // vez que cambiaba el orden de hidratación → por eso "los campeones cambiaban a
    // cada rato" (bug reportado). Ahora quedan intocables hasta el lunes siguiente.
    if (!g || g.champWeek !== wk) {
      const list = _computeChampList(groupId, wk);
      g = { champWeek: wk, scenario: (g && g.scenario) || 'theme-gold', emojis: (g && g.emojis) || {}, list };
      all[groupId] = g; _saveLeagueState(all, create && list.length > 0);
    } else if (!g.list || g.list.length === 0) {
      // Aún sin congelar (la semana cerró antes de tener datos hidratados): un intento más.
      const list = _computeChampList(groupId, wk);
      if (list.length > 0) { g = { ...g, list }; all[groupId] = g; _saveLeagueState(all, true); }
    }
  } else {
    // Alumno: NUNCA calcula ni publica la lista. Usa lo que el personal dejó en
    // la nube (lo trae loadLeagueFromCloud). Si aún no existe, lista vacía y la UI
    // muestra "aún no hay campeones".
    if (!g || g.champWeek !== wk) {
      g = { champWeek: wk, scenario: (g && g.scenario) || 'theme-gold', emojis: {}, list: [] };
      all[groupId] = g; _saveLeagueState(all, false); // guarda local, NO publica
    }
  }
  return { all, g, wk };
}
/* Campeones congelados de la semana cerrada: { week, scenario, champions:[{student,xp,rank,emoji}] } */
function getWeekChampions(groupId) {
  const { g, wk } = _leagueGroup(groupId, true);
  const champions = (g.list || []).map(c => {
    const student = STUDENTS.find(s => s.id === c.id) || { id: c.id, fullName: c.name, group: groupId };
    return { student, xp: c.xp, rank: c.rank, emoji: (g.emojis && g.emojis[c.id]) || '' };
  });
  return { week: wk, scenario: g.scenario || 'theme-gold', champions };
}
function getLeagueScenario(groupId) { return getWeekChampions(groupId).scenario; }
function championRank(student) {
  if (!student) return 0;
  const c = getWeekChampions(student.group).champions.find(x => x.student.id === student.id);
  return c ? c.rank : 0;
}
function getChampionEmoji(groupId, studentId) {
  const c = getWeekChampions(groupId).champions.find(x => x.student.id === studentId);
  return c ? c.emoji : '';
}
function setChampionEmoji(groupId, studentId, emoji) {
  const { all, g } = _leagueGroup(groupId, false);
  if (!(g.list || []).some(c => c.id === studentId)) return; // solo un campeón cambia el suyo
  g.emojis = g.emojis || {}; g.emojis[studentId] = emoji; _saveLeagueState(all, true);
}
function setLeagueScenario(groupId, scenario) {
  if (LEAGUE_SCENARIOS.indexOf(scenario) < 0) return;
  const { all, g } = _leagueGroup(groupId, false);
  g.scenario = scenario; _saveLeagueState(all, true);
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
/* Semana de adaptación: durante los primeros 7 días desde el inicio del grupo
 * NO se penaliza al alumno por no practicar (solo se registran sus avances).
 * Pasada la semana, empieza la experiencia completa (decaimiento por inactividad). */
function inGraceWeek(student) {
  if (!student) return false;
  const g = GROUPS.find(x => x.id === student.group);
  if (!g || !g.startDate) return false;
  const start = new Date(g.startDate);
  if (isNaN(start)) return false;
  const end = new Date(start); end.setDate(end.getDate() + 7);
  return new Date() < end;
}

function getStudentMastery(student) {
  if (!student) return { pct: 0, coverage: 0, quality: 0, done: 0, total: 0, active7: 0, constancyPct: 0 };
  const prog = getStudentProgress(student.id);
  const completed = prog.completed || {};
  const mods = MODULE_CATALOG[student.level] || [];
  const grace = inGraceWeek(student);
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
    const low = isLowStakesType(a.type);
    // PASO 2 · cuenta como hecha si APROBÓ, o es participación (sin nota o baja exigencia)
    if (e && (entryPassed(e, student.level, student.group) || low)) {
      done++;
      if (typeof e.score === 'number' && !low && a.type !== 'story') {
        const pct = e.score > 10 ? Math.min(100, e.score) : Math.min(100, (e.score / 10) * 100);
        scoreSum += pct; scoreN++;
      } else { scoreSum += 70; scoreN++; } // participación (story / resumen / quizlet / sin nota)
    }
  }));
  const coverage = total ? done / total : 0;
  const quality = scoreN ? (scoreSum / scoreN) / 100 : 0;
  // constancia: días activos de los últimos 7 (meta ~5/7 días)
  // Día en horario de Perú (UTC−5), consistente con la racha de supabase-sync.
  const peruDay = t => new Date((typeof t === 'number' ? t : Date.parse(t)) - 5 * 3600000).toISOString().slice(0, 10);
  const activeDays = new Set();
  Object.values(completed).forEach(e => { if (e && e.date) activeDays.add(peruDay(e.date)); });
  getExtraActiveDays(student.id).forEach(d => activeDays.add(d));   // 🔥 días reales (no se pisan)
  let active7 = 0;
  for (let i = 0; i < 7; i++) {
    if (activeDays.has(peruDay(Date.now() - i * 86400000))) active7++;
  }
  const constancy = Math.min(1, active7 / 5);
  let constancyFactor = 0.85 + 0.20 * constancy; // 0.85 (nunca) → 1.05 (constante)
  // Semana de adaptación: la constancia solo suma, nunca resta (no penaliza al inicio).
  if (grace) constancyFactor = Math.max(1, constancyFactor);
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
  { key:'speaking',  label:'Speaking',             icon:'🗣️', types:[], byTeacher:true, optionalLevels:['pre-a1'] },
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
      if (e && entryPassed(e, student.level, student.group)) {
        done++;
        if (typeof e.score === 'number' && a.type !== 'story' && !isLowStakesType(a.type)) { const pct = e.score > 10 ? Math.min(100, e.score) : Math.min(100, (e.score / 10) * 100); sSum += pct; sN++; }
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

  // Speaking: no hay material en la plataforma → se evalúa con el profesor (presencial) y se
  // practica por TAREAS. En los niveles donde es opcional (Pre-A1) no se exige ni se muestra.
  if ((COMPETENCIES.find(c => c.key === 'speaking').optionalLevels || []).includes(student.level)) delete comp.speaking;

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

  /* ── Cumplimiento general (REESTRUCTURADO) ──────────────────────────
   * El antiguo "overall" promediaba solo las competencias tocadas, así que
   * 2 actividades sueltas daban ~30%. Ahora se basa en el AVANCE REAL sobre
   * TODO el módulo activo (cobertura de temas), la calidad de lo hecho, la
   * constancia, y penaliza la inactividad. Las tareas suman de forma acotada.
   *   No se puede estar "75% listo" sin haber cubierto buena parte de los temas. */
  const coverageAll = m.coverage / 100;   // actividades hechas ÷ total del módulo (todas las competencias)
  const quality = (m.quality || 0) / 100;  // promedio de aciertos de lo hecho
  // base = avance × dominio (si solo vio el 5% del módulo, la base ronda 5%)
  let base = coverageAll * (0.6 + 0.4 * quality) * 100; // la calidad modula, no infla
  base = base * constancyFactor;                          // constancia (0.8–1.05)

  // penalización por inactividad: días sin practicar restan
  const inactive = typeof student.lastActiveDays === 'number' ? student.lastActiveDays : 0;
  let inactivityFactor = 1;
  if (inactive >= 14) inactivityFactor = 0.55;
  else if (inactive >= 7) inactivityFactor = 0.7;
  else if (inactive >= 4) inactivityFactor = 0.85;
  // Semana de adaptación: no se penaliza la inactividad al inicio.
  if (inGraceWeek(student)) inactivityFactor = 1;
  base = base * inactivityFactor;

  // las tareas suman de forma acotada y proporcional (máx 15 puntos de empuje)
  let overall = base;
  if (taskCompliance != null) overall = base * 0.85 + Math.min(taskCompliance, base + 25) * 0.15;

  overall = Math.max(0, Math.min(100, Math.round(overall)));
  // tope de seguridad: sin cubrir la mayoría del módulo no se puede ser "apto"
  const apt = overall >= 75 && coverageAll >= 0.6;
  return { competencies: comp, practiceAvg, taskCompliance, overall, apt, threshold: 75,
           coverage: m.coverage, quality: m.quality, daysInactive: inactive };
}

/* ── Registro de notas (boletín consolidado) ─────────────────────────
 * Junta como evidencia del avance: resultados de exámenes, tareas calificadas
 * y evaluaciones presenciales. Lee los cachés de localStorage. */
function getStudentGrades(student) {
  if (!student) return [];
  const out = [];
  // Exámenes
  try {
    const wins = JSON.parse(localStorage.getItem('jucum_exam_windows_v1') || '[]');
    const exams = JSON.parse(localStorage.getItem('jucum_exams_v1') || '[]');
    wins.forEach(w => {
      const res = (w.results || {})[student.id];
      if (res && (typeof res.grade === 'number' || typeof res.passed === 'boolean')) {
        const ex = exams.find(e => e.id === w.examId);
        out.push({ kind:'exam', icon:'🎓', title: ex?.title || 'Examen', date: res.gradedAt,
                   grade: (typeof res.grade === 'number' ? res.grade : null), passed: res.passed, feedback: res.feedback });
      }
    });
  } catch {}
  // Tareas calificadas
  try {
    const assigns = JSON.parse(localStorage.getItem('jucum_assignments_v1') || '[]');
    const subs = JSON.parse(localStorage.getItem('jucum_submissions_v1') || '{}');
    assigns.forEach(a => {
      const s = (subs[a.id] || {})[student.id];
      if (s && s.status === 'graded' && typeof s.grade === 'number') {
        out.push({ kind:'task', icon:'📝', title: a.title, date: s.gradedAt || s.submittedAt, grade: s.grade, feedback: s.feedback });
      }
    });
  } catch {}
  // Evaluaciones presenciales
  try {
    const evals = (JSON.parse(localStorage.getItem('jucum_evaluations_v1') || '{}')[student.id]) || [];
    evals.forEach(e => {
      const r = e.ratings || {};
      const present = ['speaking','listening','comprehension'].filter(k => typeof r[k] === 'number');
      const avg5 = present.length ? present.reduce((a,k) => a + r[k], 0) / present.length : null;
      out.push({ kind:'eval', icon:'📊', title:'Evaluación presencial', date: e.date,
                 grade: avg5 != null ? Math.round(avg5 / 5 * 100) : null,
                 stars: present.map(k => ({ k, v: r[k] })), feedback: e.feedback });
    });
  } catch {}
  return out.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
}

/* Práctica del mes actual: días estudiados vs meta (~5 de cada 7 días) + minutos */
function getStudentMonthlyPractice(student) {
  const prog = getStudentProgress(student.id);
  const completed = prog.completed || {};
  const now = new Date();
  const y = now.getFullYear(), mo = now.getMonth();
  const monthStart = new Date(y, mo, 1);
  const elapsedDays = Math.floor((now - monthStart) / 86400000) + 1;
  const days = new Set();
  let minutes = 0;
  Object.values(completed).forEach(e => {
    if (!e || !e.date) return;
    const d = new Date(e.date);
    if (d.getFullYear() === y && d.getMonth() === mo) { days.add(peruDayStr(e.date)); minutes += e.minutes || 0; }
  });
  // 🔥 días reales del mes (daily_sessions + registro local; entry.date se pisa al reintentar)
  getExtraActiveDays(student.id).forEach(ds => {
    const dt = new Date(ds + 'T12:00:00-05:00');
    if (dt.getFullYear() === y && dt.getMonth() === mo) days.add(ds);
  });
  const targetDays = Math.max(1, Math.round(elapsedDays * 5 / 7));
  const daysStudied = days.size;
  const pct = Math.min(100, Math.round(daysStudied / targetDays * 100));
  return { daysStudied, targetDays, elapsedDays, minutes, pct };
}

/* Tendencia por competencia: compara la primera mitad vs la última mitad de
 * los resultados con nota, en orden de fecha (¿mejoró o retrocedió?). */
function getStudentTrends(student) {
  const prog = getStudentProgress(student.id);
  const completed = prog.completed || {};
  const mods = MODULE_CATALOG[student.level] || [];
  const typeOf = {};
  mods.forEach(m => (m.activities || []).forEach(a => typeOf[`${m.id}:${a.id}`] = a.type));
  const series = { listening: [], reading: [], grammar: [], speaking: [] };
  Object.entries(completed).forEach(([k, e]) => {
    if (!e || typeof e.score !== 'number' || !e.date) return;
    const t = typeOf[k];
    if (t === 'story') return; // lectura: sin nota real, no alimenta tendencia (Speaking se mide por la evaluación del profesor)
    let comp = t === 'listening' ? 'listening' : t === 'reading' ? 'reading' : (t === 'grammar' || t === 'summary') ? 'grammar' : null;
    if (!comp) return;
    const pct = e.score > 10 ? Math.min(100, e.score) : Math.min(100, (e.score / 10) * 100);
    series[comp].push({ date: e.date, pct });
  });
  try {
    const evals = (JSON.parse(localStorage.getItem('jucum_evaluations_v1') || '{}')[student.id]) || [];
    evals.forEach(ev => { if (ev.ratings && typeof ev.ratings.speaking === 'number') series.speaking.push({ date: ev.date, pct: ev.ratings.speaking / 5 * 100 }); });
  } catch {}
  const out = {};
  COMPETENCIES.forEach(c => {
    const arr = (series[c.key] || []).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
    if (arr.length < 2) { out[c.key] = { dir: 'na', count: arr.length }; return; }
    const half = Math.max(1, Math.floor(arr.length / 2));
    const firstAvg = Math.round(arr.slice(0, half).reduce((s, x) => s + x.pct, 0) / half);
    const lastSlice = arr.slice(-half);
    const lastAvg = Math.round(lastSlice.reduce((s, x) => s + x.pct, 0) / lastSlice.length);
    const delta = lastAvg - firstAvg;
    out[c.key] = { first: firstAvg, last: lastAvg, delta, dir: delta >= 5 ? 'up' : delta <= -5 ? 'down' : 'flat', count: arr.length };
  });
  return out;
}

/* ── Nota final por módulo (cumplimiento + examen) ───────────────────
 * El alumno ve, por cada módulo de su nivel: su % de cumplimiento (avance),
 * su resultado en el examen de ese módulo, y una NOTA FINAL en porcentaje:
 *   final = cumplimiento × (1 − pesoExamen) + notaExamen × pesoExamen
 * El profesor define el peso del examen por módulo (por defecto 35%, porque
 * se valora más la práctica). ≥75% = aprobado. */
const MODGRADE_KEY = 'jucum_module_grade_cfg_v1';
function getModuleExamWeight(moduleId) {
  try { const m = JSON.parse(localStorage.getItem(MODGRADE_KEY) || '{}'); return (m[moduleId] && typeof m[moduleId].examWeight === 'number') ? m[moduleId].examWeight : 35; }
  catch { return 35; }
}
function setModuleExamWeight(moduleId, w) {
  let m = {}; try { m = JSON.parse(localStorage.getItem(MODGRADE_KEY) || '{}'); } catch {}
  m[moduleId] = { ...(m[moduleId] || {}), examWeight: Math.max(0, Math.min(100, Math.round(w))) };
  localStorage.setItem(MODGRADE_KEY, JSON.stringify(m));
  try { if (window.JUCUM_SB) window.JUCUM_SB.getClient().from('app_settings').upsert({ key:'module_grade_cfg', value:m }, { onConflict:'key' }).then(()=>{},()=>{}); } catch {}
}
function getModuleStats(student, module) {
  const completed = (getStudentProgress(student.id) || {}).completed || {};
  let total = 0, done = 0, sSum = 0, sN = 0;
  (module.activities || []).forEach(a => {
    total++;
    const e = completed[`${module.id}:${a.id}`];
    if (e && entryPassed(e, student.level, student.group)) { done++; if (typeof e.score === 'number' && a.type !== 'story' && !isLowStakesType(a.type)) { const pct = e.score > 10 ? Math.min(100, e.score) : Math.min(100, (e.score / 10) * 100); sSum += pct; sN++; } else { sSum += 70; sN++; } }
  });
  const coverage = total ? done / total : 0;
  const quality = sN ? (sSum / sN) / 100 : 0;
  const cumplimiento = Math.round(coverage * (0.6 + 0.4 * quality) * 100);
  return { total, done, coverage: Math.round(coverage * 100), quality: Math.round(quality * 100), cumplimiento };
}
function getModuleExamResult(student, moduleId) {
  try {
    const wins = JSON.parse(localStorage.getItem('jucum_exam_windows_v1') || '[]');
    const exams = JSON.parse(localStorage.getItem('jucum_exams_v1') || '[]');
    let best = null;
    wins.forEach(w => {
      const ex = exams.find(e => e.id === w.examId);
      if (!ex || !(ex.moduleIds || []).includes(moduleId)) return;
      const r = (w.results || {})[student.id];
      if (!r) return;
      const cand = { grade: (typeof r.grade === 'number' ? r.grade : null), passed: r.passed, gradedAt: r.gradedAt || '', title: ex.title, feedback: r.feedback };
      if (!best || (cand.gradedAt || '') > (best.gradedAt || '')) best = cand;
    });
    return best;
  } catch { return null; }
}
function getModuleFinalGrade(student, module) {
  const stats = getModuleStats(student, module);
  const exam = getModuleExamResult(student, module.id);
  const examWeight = getModuleExamWeight(module.id);
  const w = examWeight / 100;
  const hasExam = !!(exam && typeof exam.grade === 'number');
  const finalPct = hasExam ? Math.round(stats.cumplimiento * (1 - w) + exam.grade * w) : stats.cumplimiento;
  return { stats, exam, examWeight, finalPct, approved: finalPct >= 75, hasExam };
}

/* ── PASO 2 · Detección "rápido y mal" (🚩 solo para el profesor) ─────
 * Marca al alumno que completa MUCHAS actividades en un mismo día con notas
 * por debajo del umbral (el caso real de Mijhael: 6 en 1 día, prom. bajo).
 * No castiga la prisa en sí — solo la prisa CON malas notas. */
function getFarmingFlag(student) {
  if (!student) return null;
  const completed = (getStudentProgress(student.id) || {}).completed || {};
  const thr = passThreshold(student.level, student.group);
  const byDay = {};
  Object.values(completed).forEach(e => {
    const pct = scorePct(e && e.score);
    if (pct === null || !e.date) return;          // solo actividades con nota
    const d = String(e.date).slice(0, 10);
    (byDay[d] = byDay[d] || []).push(pct);
  });
  let worst = null;
  Object.entries(byDay).forEach(([day, arr]) => {
    if (arr.length < 4) return;                    // "muchas" el mismo día
    const failed = arr.filter(p => p < thr).length;
    const avg = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    const failRate = failed / arr.length;
    if (failed >= 3 || (failRate >= 0.5 && avg < thr)) {
      const cand = { day, count: arr.length, failed, avg, failRate, threshold: thr };
      if (!worst || cand.failed > worst.failed || (cand.failed === worst.failed && cand.count > worst.count)) worst = cand;
    }
  });
  return worst ? { flagged: true, ...worst } : null;
}

/* Actividades con nota BAJO el umbral que el alumno debería repetir.
 * Alimenta el aviso amable del panel del alumno ("repítelas para aprobar"). */
function getActivitiesToImprove(student) {
  if (!student) return [];
  const completed = (getStudentProgress(student.id) || {}).completed || {};
  const thr = passThreshold(student.level, student.group);
  const out = [];
  Object.entries(completed).forEach(([k, e]) => {
    const pct = scorePct(e && e.score);
    if (pct === null) return;
    if (pct < thr) {
      const [moduleId, activityId] = k.split(':');
      const mod = (MODULE_CATALOG[student.level] || []).find(m => m.id === moduleId);
      const act = mod && (mod.activities || []).find(a => a.id === activityId);
      if (act && isLowStakesType(act.type)) return;   // resúmenes/quizlet no se exigen a umbral
      out.push({ moduleId, activityId, pct, name: act ? act.name : activityId, type: act ? act.type : '', moduleName: mod ? mod.name : '' });
    }
  });
  return out.sort((a, b) => a.pct - b.pct);
}

/* ════════════════════════════════════════════════════════════════════
 * PASO 3 · Repaso espaciado + retención + explicación al bajar
 * ════════════════════════════════════════════════════════════════════ */
const REVIEW_KEY = 'jucum_reviews_v1';
const REVIEW_LADDER_DAYS = [7, 21, 42];   // aprobada: 1 sem → 3 sem → 6 sem
const REVIEW_RELEARN_DAYS = 3;            // reprobó o bajó → vuelve en 3 días

function _todayStr() { return peruDayStr(); }
function _addDays(days) { return peruDayStr(Date.now() + days * 86400000); }
function _daysBetween(aStr, bStr) { return Math.round((new Date(bStr) - new Date(aStr)) / 86400000); }

function getReviews(studentId) {
  try { const all = JSON.parse(localStorage.getItem(REVIEW_KEY) || '{}'); return all[studentId] || {}; } catch { return {}; }
}
function _saveReviews(studentId, obj) {
  let all = {};
  try { all = JSON.parse(localStorage.getItem(REVIEW_KEY) || '{}'); } catch {}
  all[studentId] = obj;
  localStorage.setItem(REVIEW_KEY, JSON.stringify(all));
  try { if (window.JUCUM_SB) window.JUCUM_SB.getClient().from('app_settings').upsert({ key: 'reviews', value: all }, { onConflict: 'key' }).then(() => {}, () => {}); } catch {}
}
async function loadReviewsFromCloud() {
  if (!window.JUCUM_SB) return;
  try {
    const { data } = await window.JUCUM_SB.getClient().from('app_settings').select('value').eq('key', 'reviews').maybeSingle();
    if (data && data.value && typeof data.value === 'object') localStorage.setItem(REVIEW_KEY, JSON.stringify(data.value));
  } catch {}
}

/* Clasifica el cambio entre dos intentos. Mide en ACIERTOS si se conoce el total;
 * si no, en puntos porcentuales (banda equivalente). Regla del teacher:
 * ±1 acierto = se mantiene · +2 = mejora · −2 = baja.
 * Pasar de reprobado a aprobado SIEMPRE cuenta como mejora. */
function reviewTrend(prevPct, currPct, total, level, groupId) {
  const thr = passThreshold(level || 'pre-a1', groupId);
  const crossedUp = prevPct < thr && currPct >= thr;
  let dir, delta;
  if (total && total > 0) {
    delta = Math.round(currPct / 100 * total) - Math.round(prevPct / 100 * total);
    dir = delta >= 2 ? 'up' : delta <= -2 ? 'down' : 'flat';
  } else {
    delta = Math.round(currPct - prevPct);
    dir = delta >= 15 ? 'up' : delta <= -15 ? 'down' : 'flat';
  }
  if (crossedUp && dir !== 'up') dir = 'up';
  return { dir, delta, total: total || null };
}

/* Registra un intento en el motor de repaso. Llamado desde markActivityComplete.
 * - Primer intento de una actividad con nota → la programa en la escalera.
 * - Si ya estaba programada y tocaba repaso → compara antes→ahora, mueve la escalera
 *   (mantiene/mejora se aleja; baja se acerca) y guarda el resultado para mostrarlo. */
function recordReviewAttempt(studentId, moduleId, activityId, score, groupId, level, total) {
  const pct = scorePct(score);
  if (pct === null) return null;          // participación (sin nota) no entra a repaso
  if (isLowStakesType(_actTypeOf(moduleId, activityId, level))) return null; // resúmenes/quizlet: baja exigencia, no se repasan por nota
  const reviews = getReviews(studentId);
  const k = `${moduleId}:${activityId}`;
  const today = _todayStr();
  const ex = reviews[k];
  const passed = pct >= passThreshold(level || 'pre-a1', groupId);

  if (!ex) {
    // primer registro: arranca la escalera
    reviews[k] = {
      moduleId, activityId, refPct: pct, refTotal: total || null,
      step: passed ? 0 : -1,
      due: _addDays(passed ? REVIEW_LADDER_DAYS[0] : REVIEW_RELEARN_DAYS),
      history: [{ date: today, pct, total: total || null }],
      firstAt: today, lastTrend: null, lastResult: null,
    };
    _saveReviews(studentId, reviews);
    return reviews[k];
  }

  // ¿Es un repaso (ya tocaba) o solo otro intento del mismo día?
  const isReview = ex.due && _daysBetween(ex.due, today) >= 0 && ex.history.length >= 1;
  const prevPct = ex.refPct;
  const t = reviewTrend(prevPct, pct, total || ex.refTotal, level, groupId);
  ex.history.push({ date: today, pct, total: total || null });
  ex.lastTrend = t.dir;
  ex.refPct = pct;
  if (total) ex.refTotal = total;

  if (isReview) {
    // mueve la escalera
    if (!passed || t.dir === 'down') {
      ex.step = Math.max(-1, (ex.step < 0 ? -1 : ex.step - 1));
      ex.due = _addDays(REVIEW_RELEARN_DAYS);
    } else {
      ex.step = Math.min(REVIEW_LADDER_DAYS.length - 1, (ex.step < 0 ? 0 : ex.step + 1));
      ex.due = _addDays(REVIEW_LADDER_DAYS[ex.step]);
    }
    ex.lastResult = { prevPct, currPct: pct, dir: t.dir, delta: t.delta, total: t.total, at: today };
  } else {
    // reintento normal (aún no tocaba repaso): reprograma desde la nota nueva
    ex.step = passed ? Math.max(ex.step, 0) : -1;
    ex.due = _addDays(passed ? REVIEW_LADDER_DAYS[Math.max(0, ex.step)] : REVIEW_RELEARN_DAYS);
  }
  _saveReviews(studentId, reviews);
  return ex;
}

/* Repasos que YA tocan hoy (due <= hoy). Para el panel del alumno. */
function getDueReviews(student) {
  if (!student) return [];
  const reviews = getReviews(student.id);
  const today = _todayStr();
  const mods = MODULE_CATALOG[student.level] || [];
  const out = [];
  Object.values(reviews).forEach(r => {
    if (!r.due || _daysBetween(r.due, today) < 0) return;   // aún no toca
    const mod = mods.find(m => m.id === r.moduleId);
    const act = mod && (mod.activities || []).find(a => a.id === r.activityId);
    if (!act) return;
    const last = r.history[r.history.length - 1];
    out.push({
      moduleId: r.moduleId, activityId: r.activityId,
      name: act.name, type: act.type,
      refPct: r.refPct, refTotal: r.refTotal,
      daysAgo: last ? _daysBetween(last.date, today) : null,
      overdue: _daysBetween(r.due, today),
    });
  });
  return out.sort((a, b) => b.overdue - a.overdue);
}

/* El último resultado de repaso sin "ver" todavía (para la tarjeta antes→ahora). */
function getLastReviewResult(student) {
  if (!student) return null;
  const reviews = getReviews(student.id);
  const mods = MODULE_CATALOG[student.level] || [];
  let best = null;
  Object.values(reviews).forEach(r => {
    const lr = r.lastResult;
    if (lr && !lr.seen) {
      if (!best || lr.at > best.at) {
        const mod = mods.find(m => m.id === r.moduleId);
        const act = mod && (mod.activities || []).find(a => a.id === r.activityId);
        best = { ...lr, moduleId: r.moduleId, activityId: r.activityId, name: act ? act.name : r.activityId, type: act ? act.type : '' };
      }
    }
  });
  return best;
}
function markReviewResultSeen(studentId, moduleId, activityId) {
  const reviews = getReviews(studentId);
  const r = reviews[`${moduleId}:${activityId}`];
  if (r && r.lastResult) { r.lastResult.seen = true; _saveReviews(studentId, reviews); }
}

/* Retención agregada del alumno (para la columna del reporte del profesor).
 * Compara la PRIMERA nota con la ÚLTIMA en cada actividad repasada ≥1 vez. */
function getRetention(student) {
  if (!student) return { dir: 'none', count: 0 };
  const reviews = getReviews(student.id);
  const items = Object.values(reviews).filter(r => r.history && r.history.length >= 2);
  if (!items.length) return { dir: 'none', count: 0 };
  let up = 0, down = 0, flat = 0, fromSum = 0, toSum = 0;
  items.forEach(r => {
    const first = r.history[0], last = r.history[r.history.length - 1];
    const t = reviewTrend(first.pct, last.pct, last.total || first.total, student.level, student.group);
    if (t.dir === 'up') up++; else if (t.dir === 'down') down++; else flat++;
    fromSum += first.pct; toSum += last.pct;
  });
  const from = Math.round(fromSum / items.length), to = Math.round(toSum / items.length);
  const net = up - down;
  const dir = net >= 1 ? 'up' : net <= -1 ? 'down' : 'flat';
  return { dir, count: items.length, up, down, flat, from, to, delta: to - from };
}

/* ── Explicación al bajar (modal del alumno) ──────────────────────────
 * Detecta caídas que el alumno PUEDE corregir (categoría de dominio, nº de
 * aprobadas, nº de logros). NUNCA por ranking relativo. Tono positivo. */
const STANDING_KEY = 'jucum_standing_v1';
const MASTERY_BANDS = [
  { min: 85, name: 'Dominado' }, { min: 70, name: 'Bueno' },
  { min: 50, name: 'En progreso' }, { min: 0, name: 'Inicial' },
];
function _masteryBand(pct) { return MASTERY_BANDS.find(b => pct >= b.min) || MASTERY_BANDS[MASTERY_BANDS.length - 1]; }
function _bandIndex(name) { return MASTERY_BANDS.findIndex(b => b.name === name); }

function _currentStanding(student) {
  const m = getStudentMastery(student);
  const prog = getStudentProgress(student.id);
  const mods = MODULE_CATALOG[student.level] || [];
  let passed = 0;
  mods.forEach(mod => (mod.activities || []).forEach(a => { if (entryPassed(prog.completed[`${mod.id}:${a.id}`], student.level, student.group)) passed++; }));
  return { band: _masteryBand(m.pct).name, passed, ach: (student.achievements || []).length, masteryPct: m.pct };
}
function _getStandingBaseline(studentId) {
  try { const all = JSON.parse(localStorage.getItem(STANDING_KEY) || '{}'); return all[studentId] || null; } catch { return null; }
}
function _setStandingBaseline(studentId, st) {
  let all = {};
  try { all = JSON.parse(localStorage.getItem(STANDING_KEY) || '{}'); } catch {}
  all[studentId] = st;
  localStorage.setItem(STANDING_KEY, JSON.stringify(all));
}

/* Devuelve un descriptor de explicación si el alumno bajó de forma corregible, o null.
 * No escribe nada (lectura pura): usar ackDropExplanation al cerrar / al mejorar. */
function getDropExplanation(student) {
  if (!student) return null;
  const cur = _currentStanding(student);
  const base = _getStandingBaseline(student.id);
  const toImprove = getActivitiesToImprove(student).length;
  if (!base) {
    // primera vez en este dispositivo: solo avisa si YA tiene posición (dominio>0) y
    // arranca con prácticas por mejorar. Un alumno recién empezado (dominio 0) NO "baja
    // de posición" — todavía no entra al ranking; el Podio ya le dice "completa tu
    // primera práctica para entrar y competir". Evita el mensaje contradictorio.
    return (cur.masteryPct > 0 && toImprove > 0) ? { init: true, reasons: ['below'], toImprove, masteryPct: cur.masteryPct } : null;
  }
  const reasons = [];
  if (_bandIndex(cur.band) > _bandIndex(base.band)) reasons.push('band');   // índice mayor = banda peor
  if (cur.passed < base.passed) reasons.push('passed');
  if (cur.ach < base.ach) reasons.push('ach');
  if (!reasons.length) return null;
  return { init: false, reasons, toImprove, fromBand: base.band, toBand: cur.band, masteryPct: cur.masteryPct };
}
/* Fija la línea base al estado actual (al cerrar el modal o cuando el alumno mejora). */
function ackDropExplanation(student) { if (student) _setStandingBaseline(student.id, _currentStanding(student)); }

/* ── PASO 4 · Ruta de módulos (mapa con desbloqueo secuencial) ────────
 * Estado por módulo del nivel: 'done' (todo aprobado) · 'cur' (abierto, en curso
 * o por alcanzar dentro de la frontera) · 'lock' (aún no se alcanza).
 * La frontera = el módulo más avanzado que el alumno terminó o que el profesor
 * activó. Todo lo anterior a la frontera está abierto (secuencial). */
/* ── PASO 4 · Ruta de módulos (mapa con desbloqueo secuencial) ────────────
 * Muestra TODO el currículo del nivel aunque el módulo aún no exista en el
 * catálogo real (sale como candado "próximamente"). */
const CURRICULUM = {
  'pre-a1': [
    { name:'Personal Identity',            emoji:'🪪' },
    { name:'Essential Actions',            emoji:'🏃' },
    { name:'Place, Time & Movement',       emoji:'🧭' },
    { name:'Home, School & Objects',       emoji:'🏠' },
    { name:'Nature, Food & Animals',       emoji:'🌿' },
    { name:'Feelings, States & Qualities', emoji:'😊' },
    { name:'Connectors & Key Expressions', emoji:'🔗' },
  ],
};
function getModuleRoute(student) {
  if (!student) return [];
  const mods = MODULE_CATALOG[student.level] || [];
  const outline = CURRICULUM[student.level] || mods.map(m => ({ name: m.name, emoji: m.emoji }));
  const settings = getGroupSettings(student.group) || {};
  const activeIds = (settings.activeModuleIds && settings.activeModuleIds.length)
    ? settings.activeModuleIds : (settings.activeModuleId ? [settings.activeModuleId] : []);
  const prog = getStudentProgress(student.id);
  const due = (typeof getDueReviews === 'function') ? getDueReviews(student) : [];
  const reviewMods = new Set(due.map(d => d.moduleId));
  const info = outline.map((o, i) => {
    const m = mods.find(mm => mm.name === o.name);
    if (m) {
      const acts = m.activities || [];
      const doneCount = acts.filter(a => { const e = prog.completed[`${m.id}:${a.id}`]; return e && (entryPassed(e, student.level, student.group) || isLowStakesType(a.type)); }).length;
      const allDone = acts.length > 0 && doneCount === acts.length;
      return { mod: m, idx: i, doneCount, total: acts.length, allDone, active: activeIds.includes(m.id), hasReview: reviewMods.has(m.id), placeholder: false };
    }
    return { mod: { id: '__ph' + i, name: o.name, emoji: o.emoji || '📦', activities: [] }, idx: i, doneCount: 0, total: 0, allDone: false, active: false, hasReview: false, placeholder: true };
  });
  // 🔧 BUG (jul-2026): antes existía una "frontera": TODO módulo anterior al
  // último activo quedaba como 'cur' (abierto) aunque el profesor lo tuviera
  // APAGADO — prender el último módulo "prendía" todos los anteriores y el
  // profesor perdía el control. Ahora manda el toggle del profesor: un módulo
  // está abierto SOLO si está activo (o ya fue completado → 'done').
  info.forEach(x => {
    x.state = (!x.placeholder && x.allDone) ? 'done'
            : (!x.placeholder && x.active) ? 'cur'
            : 'lock';
  });
  return info;
}
/* Módulo donde el alumno debería estar trabajando ahora: el primer módulo
 * ACTIVO con pendientes (no el primero de la ruta). */
function getFocusModuleId(student) {
  const route = getModuleRoute(student);
  const cur = route.find(x => x.state === 'cur' && (x.doneCount || 0) < (x.total || 0))
           || route.find(x => x.state === 'cur');
  return cur ? cur.mod.id : (route[0] ? route[0].mod.id : null);
}

/* Mejor racha histórica (récord personal). Se actualiza al leer. */
const BEST_STREAK_KEY = 'jucum_best_streak_v1';
function getBestStreak(student) {
  let all = {};
  try { all = JSON.parse(localStorage.getItem(BEST_STREAK_KEY) || '{}'); } catch {}
  const cur = (student && student.streak) || 0;
  const best = Math.max(all[student.id] || 0, cur);
  if (best !== (all[student.id] || 0)) { all[student.id] = best; try { localStorage.setItem(BEST_STREAK_KEY, JSON.stringify(all)); } catch {} }
  return best;
}

/* ── PASO 5 · "Refuerzo" · práctica extra OPCIONAL ────────────────────────
 * Pool de actividades YA aprobadas que el alumno puede repetir para fijar lo
 * aprendido. Sirve para (a) completar la meta cuando ya no quedan pendientes
 * obligatorios, o (b) seguir practicando por gusto. NUNCA es obligatorio y no
 * afecta el desbloqueo. Prioriza: nota más baja (entre aprobadas) → gramática
 * productiva → más antigua. Excluye lo que ya está en "repaso de hoy" o
 * "por mejorar" (para no duplicar tarjetas). */
function getRefuerzo(student, limit) {
  if (!student) return [];
  limit = limit || 3;
  const mods = MODULE_CATALOG[student.level] || [];
  const prog = getStudentProgress(student.id);
  const dueSet = new Set((typeof getDueReviews === 'function' ? getDueReviews(student) : []).map(d => `${d.moduleId}:${d.activityId}`));
  const impSet = new Set((typeof getActivitiesToImprove === 'function' ? getActivitiesToImprove(student) : []).map(d => `${d.moduleId}:${d.activityId}`));
  const pool = [];
  mods.forEach(m => {
    (m.activities || []).forEach(a => {
      const key = `${m.id}:${a.id}`;
      const e = (prog.completed || {})[key];
      if (!e) return;                                              // solo lo ya hecho
      if (!entryPassed(e, student.level, student.group)) return;  // y aprobado
      if (isLowStakesType(a.type)) return;                         // resúmenes/quizlet: baja exigencia, no son refuerzo medible
      if (dueSet.has(key) || impSet.has(key)) return;             // no duplicar con repaso / por mejorar
      if (typeof e.score !== 'number') return;                    // participación (story/quizlet) no aporta como refuerzo medible
      const pct = e.score > 10 ? e.score : e.score * 10;
      const typeRank = a.type === 'grammar' ? 0 : (a.type === 'reading' || a.type === 'listening') ? 1 : 2;
      const ageDays = e.date ? (Date.now() - new Date(e.date).getTime()) / 86400000 : 0;
      pool.push({ moduleId: m.id, moduleName: m.name, activityId: a.id, name: a.name, type: a.type, group: a.group || null,
        pct: Math.round(pct), _w: pct + typeRank * 100 - Math.min(ageDays, 60) * 0.4 });
    });
  });
  pool.sort((x, y) => x._w - y._w);   // menor peso primero (nota baja + gramática + antigua)
  return pool.slice(0, limit);
}

/* ── PASO 5 · ★ Estructuras latentes (Krashen · solo A1/A2) ────────────────
 * Algunas estructuras productivas (Present Perfect, preposiciones de lugar/
 * tiempo no básicas, orden de palabras) maduran mejor con reposo: su práctica
 * de Transformación (P3) se desbloquea ~1 semana DESPUÉS de aprobar la
 * actividad previa del mismo tema, no de inmediato. Se marca con "latent": true
 * en el catálogo. Pre-A1 NUNCA lleva ★. */
const LATENT_DELAY_DAYS = 7;
function latentGate(mod, a, i, progress, level) {
  if (!a || !a.latent || level === 'pre-a1') return { latent: false, ready: true, daysLeft: 0, availableOn: null };
  const acts = mod.activities || [];
  const prev = i > 0 ? acts[i - 1] : null;
  const gate = prev ? (progress.completed || {})[`${mod.id}:${prev.id}`] : null;
  // El reloj de 7 días arranca al APROBAR la previa. Si aún no la aprueba, no es
  // "latente en espera": que el desbloqueo secuencial normal la gobierne.
  if (!gate || !gate.date || !entryPassed(gate, level)) return { latent: false, ready: true, daysLeft: 0, availableOn: null };
  const avail = new Date(new Date(gate.date).getTime() + LATENT_DELAY_DAYS * 86400000);
  const now = new Date();
  const daysLeft = Math.ceil((avail - now) / 86400000);
  return { latent: true, ready: now >= avail, daysLeft: Math.max(0, daysLeft), availableOn: avail.toISOString().slice(0, 10) };
}

window.JUCUM_DATA = { LEVELS, GROUPS, STUDENTS, ACTIVITY_LOG, ACHIEVEMENT_DEFS, DEMO_CREDS, dailyData, MODULE_CATALOG, getGroupSettings, setGroupSettings, getStudentProgress, markActivityComplete, getStudentXP, getStudentLevel, getGroupRanking, MEDAL_RARITY, RARITY_STYLE, addGroup, updateGroup, removeGroup, saveGroups, promoteStudent, isEligibleForExam, saveStudents, getWeeklyXP, addWeeklyXP, getWeeklyRanking, daysUntilMonday, medalProgress, earnedMedals, nextMedals, getAchievementAlert, achievementDecayFactor, getMotivation, getStudentMastery, getComplianceRanking, COMPETENCIES, getStudentReadiness, getStudentGrades, getStudentMonthlyPractice, getStudentTrends,
  /* PASO 2 · umbral + anti-farmeo */
  passThreshold, getPassThresholds, setPassThreshold, setGroupThreshold, getGroupThreshold, loadPassThresholdsFromCloud, scorePct, entryPassed, getDirectedBonusXP, getFarmingFlag, getActivitiesToImprove,
  /* Modo mantenimiento (rol dev) */
  getMaintenance, setMaintenance, loadMaintenanceFromCloud,
  /* PASO 3 · repaso espaciado + retención + explicación al bajar */
  getReviews, recordReviewAttempt, getDueReviews, getLastReviewResult, markReviewResultSeen, getRetention, reviewTrend, loadReviewsFromCloud, getDropExplanation, ackDropExplanation,
  /* PASO 4 · ruta de módulos + récord de racha */
  getModuleRoute, getFocusModuleId, getBestStreak,
  /* PASO 5 · refuerzo opcional + estructuras latentes ★ */
  getRefuerzo, latentGate,
  /* Neuro/XP honestos: días reales sin practicar + pérdida por inactividad */
  getRealInactiveDays, getInactivityXPLoss };

/* ── Metodología del teacher: fase de práctica (P1/P2/P3) + dónde se hace ──
 * Confirmado por el teacher:
 *   P1 Fill-In  = 100% casa
 *   P2 Identify = casa (puede arrancarse en clase)
 *   P3 Transform= sobre todo en clase, sobrantes opcionales
 *   Grammar Summary = pasos 1-3 en casa (GS1) + pasos 4-5 en clase (GS2)
 *   Story + diálogo = en clase (el diálogo nunca es tarea)
 *   Reading / Listening = casa (reading siempre incluido)
 * Se deriva de type/name; el catálogo puede sobreescribir con a.phase / a.location. */
function activityMeta(a) {
  if (!a) return { phase: null, location: null };
  const name = String(a.name || '').toLowerCase();
  const t = a.type;
  let phase = a.phase || null;        // 'P1' | 'P2' | 'P3'
  let location = a.location || null;  // 'home' | 'class' | 'optional' | 'home+class'
  if (t === 'grammar') {
    if (!phase) {
      if (/fill\s*in|completar|rellena/.test(name)) phase = 'P1';
      else if (/identif/.test(name)) phase = 'P2';
      else if (/transform/.test(name)) phase = 'P3';
    }
    if (!location) location = phase === 'P3' ? 'class' : 'home';
  } else if (t === 'summary') {
    location = location || 'home+class';
  } else if (t === 'story') {
    location = location || 'class';
  } else if (t === 'reading' || t === 'listening') {
    location = location || 'home';
  }
  return { phase, location };
}
const LOCATION_LABEL = {
  home:         { ico: '🏠',   txt: 'Casa',         bg: '#E8F5E9', fg: '#2E7D32' },
  class:        { ico: '🧑‍🏫',   txt: 'En clase',     bg: '#E3F2FD', fg: '#1565C0' },
  optional:     { ico: '✨',   txt: 'Opcional',     bg: '#F3E5F5', fg: '#7B1FA2' },
  'home+class': { ico: '🏠→🧑‍🏫', txt: 'Casa + clase', bg: '#FFF8E1', fg: '#B26A00' },
};
/* Secuencia fija de una clase en vivo (metodología del teacher).
 * Pre-A1 no lleva Writing. */
const CLASS_SEQUENCE = [
  { step: 1, ico: '📗', name: 'Story',           desc: 'Input: se relee en ciclos (1ª/2ª/3ª lectura), nunca de un solo uso.' },
  { step: 2, ico: '📚', name: 'Grammar Review',  desc: 'GS2: se repite el paso 3 y se enseñan en vivo los pasos 4–5. Primer contacto real con la estructura.' },
  { step: 3, ico: '💬', name: 'Dialogue',        desc: 'Práctica de habla. El diálogo nunca se manda de tarea.' },
  { step: 4, ico: '📝', name: 'Grammar Practice',desc: 'Se trabaja P3 (Transform) en clase; P1/P2 vienen de casa.' },
  { step: 5, ico: '✍️', name: 'Writing',         desc: 'Producción escrita. (Pre-A1 no lo incluye.)' },
];
window.JUCUM_DATA.activityMeta = activityMeta;
window.JUCUM_DATA.LOCATION_LABEL = LOCATION_LABEL;
window.JUCUM_DATA.CLASS_SEQUENCE = CLASS_SEQUENCE;

window.JUCUM_DATA.getStudentLog = getStudentLog;
window.JUCUM_DATA.inGraceWeek = inGraceWeek;
window.JUCUM_DATA.getModuleExamWeight = getModuleExamWeight;
window.JUCUM_DATA.setModuleExamWeight = setModuleExamWeight;
window.JUCUM_DATA.getModuleStats = getModuleStats;
window.JUCUM_DATA.getModuleExamResult = getModuleExamResult;
window.JUCUM_DATA.getModuleFinalGrade = getModuleFinalGrade;

/* 🏆 Liga semanal · campeones congelados + escenario + emojis */
window.JUCUM_DATA.lastWeekId = lastWeekId;
window.JUCUM_DATA.getWeeklyXPForWeek = getWeeklyXPForWeek;
window.JUCUM_DATA.getRankingForWeek = getRankingForWeek;
window.JUCUM_DATA.getWeekChampions = getWeekChampions;
window.JUCUM_DATA.getLeagueScenario = getLeagueScenario;
window.JUCUM_DATA.championRank = championRank;
window.JUCUM_DATA.getChampionEmoji = getChampionEmoji;
window.JUCUM_DATA.setChampionEmoji = setChampionEmoji;
window.JUCUM_DATA.setLeagueScenario = setLeagueScenario;
window.JUCUM_DATA.loadLeagueFromCloud = loadLeagueFromCloud;
window.JUCUM_DATA.LEAGUE_SCENARIOS = LEAGUE_SCENARIOS;

/* ✨ Puntuaciones re-ganables + bonos persistentes + aviso de semana nueva */
window.JUCUM_DATA.activityEarnedXP = activityEarnedXP;
window.JUCUM_DATA.weeklyReEarnXP = weeklyReEarnXP;
window.JUCUM_DATA.addBonusXP = addBonusXP;
window.JUCUM_DATA.getBonusXPTotal = getBonusXPTotal;
window.JUCUM_DATA.getBonusXPWeek = getBonusXPWeek;
window.JUCUM_DATA.loadBonusXPFromCloud = loadBonusXPFromCloud;
window.JUCUM_DATA.isNewWeekFor = isNewWeekFor;
window.JUCUM_DATA.markWeekSeen = markWeekSeen;


/* ── Meta diaria multi-equipo: hidratar minutos de HOY desde la nube ──
 * Los materiales (jucum-connect) escriben daily_sessions; aquí se suman por
 * alumno y getStudentProgress los mezcla con lo local. Refresco cada 3 min. */
/* Trae TODAS las filas de daily_sessions paginando de a 1000. Supabase corta
 * cualquier select en 1000 filas; la ventana de 6–13 semanas ya roza ese tope
 * y sin paginar se perderían los días/semanas MÁS RECIENTES (racha y bono
 * semanal caídos aunque el alumno sí practicó). */
function jecPagedDaily(cols, applyFilter, done) {
  var sb = window.JUCUM_SB.getClient();
  var PAGE = 1000, all = [];
  (function page(from) {
    var q = sb.from('daily_sessions').select(cols)
      .order('user_id').order('day').order('module_id').order('activity_id');
    q = applyFilter(q).range(from, from + PAGE - 1);
    q.then(function (r) {
      var rows = (r && r.data) || [];
      all = all.concat(rows);
      if (rows.length < PAGE) done(all);
      else page(from + PAGE);
    }, function () { done(all); });
  })(0);
}
(function jecDailyLoader() {
  function load() {
    try {
      if (!window.JUCUM_SB || !window.JUCUM_SB.getClient) return;
      var day = peruDayStr();
      jecPagedDaily('user_id,minutes', function (q) { return q.eq('day', day); }, function (rows) {
        var map = {};
        rows.forEach(function (x) {
          map[x.user_id] = map[x.user_id] || { day: day, minutes: 0 };
          map[x.user_id].minutes += (x.minutes || 0);
        });
        window.__JEC_DAILY = map;
      });
    } catch (e) {}
  }
  setTimeout(load, 2500);
  setInterval(load, 3 * 60 * 1000);
})();

/* ── Bono semanal re-ganable: qué material practicó cada alumno y en qué SEMANA ──
 * Lee daily_sessions (nube) de las últimas ~6 semanas y arma
 *   window.__JEC_WEEKS[userId] = { 'YYYY-MM-DD(lunes)': { 'mod:act': true } }
 * getStudentXP / weeklyReEarnXP lo usan para volver a premiar cada semana distinta
 * en que repasan un material (una sola vez por material por semana). Refresco 5 min. */
(function jecWeeklyLoader() {
  function mondayOf(dayStr) {
    var d = new Date(dayStr + 'T00:00:00Z');
    var wd = (d.getUTCDay() + 6) % 7;            // 0 = lunes
    d.setUTCDate(d.getUTCDate() - wd);
    return d.toISOString().slice(0, 10);
  }
  function load() {
    try {
      if (!window.JUCUM_SB || !window.JUCUM_SB.getClient) return;
      var since = new Date(Date.now() - 5 * 3600000 - 42 * 86400000).toISOString().slice(0, 10); // ~6 semanas (Perú)
      jecPagedDaily('user_id,day,module_id,activity_id', function (q) { return q.gte('day', since); }, function (rows) {
        var map = {};
        rows.forEach(function (x) {
          var wk = mondayOf(x.day);
          var key = x.module_id + ':' + x.activity_id;
          map[x.user_id] = map[x.user_id] || {};
          map[x.user_id][wk] = map[x.user_id][wk] || {};
          map[x.user_id][wk][key] = true;
        });
        window.__JEC_WEEKS = map;
      });
      /* 🔥 Racha multi-equipo: días REALES con práctica según daily_sessions (una fila
       * por alumno/día/material, nunca se sobreescribe — a diferencia de entry.date).
       * Ventana de 90 días para rachas largas. computeStats une estos días con lo local. */
      var sinceDays = new Date(Date.now() - 5 * 3600000 - 90 * 86400000).toISOString().slice(0, 10);
      jecPagedDaily('user_id,day', function (q) { return q.gte('day', sinceDays); }, function (rows2) {
        var dmap = {};
        rows2.forEach(function (x) {
          if (!x.day) return;
          dmap[x.user_id] = dmap[x.user_id] || {};
          dmap[x.user_id][x.day] = true;
        });
        window.__JEC_DAYS = dmap;
        // Recalcula rachas ya con los días de la nube (la UI refresca sola cada 20 s).
        try { if (window.JUCUM_SYNC && window.JUCUM_SYNC.computeStats) window.JUCUM_SYNC.computeStats(); } catch (e) {}
      });
    } catch (e) {}
  }
  setTimeout(load, 3000);
  setInterval(load, 5 * 60 * 1000);
})();

/* Trae los bonos persistentes (asistencia/encuesta) desde la nube al arrancar. */
(function jecBonusLoader() {
  function load() { try { if (window.JUCUM_DATA && window.JUCUM_DATA.loadBonusXPFromCloud) window.JUCUM_DATA.loadBonusXPFromCloud(); } catch (e) {} }
  setTimeout(load, 3200);
  setInterval(load, 5 * 60 * 1000);
})();

/* ════════════════════════════════════════════════════════════════════
 * 📚 Revisión de materiales (vista profesor · "Materiales")
 * ════════════════════════════════════════════════════════════════════
 * Tablero de QA: por cada material del catálogo el profesor guarda un
 * estado (pendiente / ok / fix), un checklist de calidad y notas.
 * Persistencia: localStorage (caché) + nube app_settings key
 * 'material_reviews' (multidispositivo). NO toca el progreso de alumnos.
 * "Enviar a soporte" inserta una fila en error_reports (reporter:'teacher')
 * que aparece en la bandeja 🐞 Reportes del panel de desarrollo. */
const MAT_REVIEW_KEY = 'jucum_material_reviews_v1';
function materialReviewKey(level, moduleId, activityId) { return `${level}:${moduleId}:${activityId}`; }
function getMaterialReviews() {
  try { const v = JSON.parse(localStorage.getItem(MAT_REVIEW_KEY) || '{}'); return (v && typeof v === 'object') ? v : {}; } catch { return {}; }
}
function getMaterialReview(key) { return getMaterialReviews()[key] || null; }
function _saveMaterialReviews(all) {
  localStorage.setItem(MAT_REVIEW_KEY, JSON.stringify(all));
  try { if (window.JUCUM_SB) window.JUCUM_SB.getClient().from('app_settings').upsert({ key: 'material_reviews', value: all }, { onConflict: 'key' }).then(() => {}, () => {}); } catch {}
}
function setMaterialReview(key, patch) {
  const all = getMaterialReviews();
  all[key] = { ...(all[key] || {}), ...patch, updatedAt: new Date().toISOString() };
  _saveMaterialReviews(all);
  return all[key];
}
async function loadMaterialReviewsFromCloud() {
  if (!window.JUCUM_SB) return getMaterialReviews();
  try {
    const { data } = await window.JUCUM_SB.getClient().from('app_settings').select('value').eq('key', 'material_reviews').maybeSingle();
    if (data && data.value && typeof data.value === 'object') localStorage.setItem(MAT_REVIEW_KEY, JSON.stringify(data.value));
  } catch {}
  return getMaterialReviews();
}
/* Envía una observación a la bandeja de soporte (error_reports · script 21). */
async function sendMaterialReport({ level, module, activity, url, message }) {
  if (!window.JUCUM_SB) return { ok: false, reason: 'sin conexión con la nube' };
  try {
    const row = {
      id: 'er-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      user_id: null, reporter: 'teacher', group_id: null,
      module_id: module ? module.id : null,
      activity_id: activity ? activity.id : null,
      material_kind: activity ? activity.type : null,
      material_name: activity ? activity.name : null,
      part: null,
      url: url || (activity ? activity.url : null) || null,
      message: message, status: 'nuevo',
    };
    await window.JUCUM_SB.insert('error_reports', row);
    return { ok: true, id: row.id };
  } catch (e) { return { ok: false, reason: e.message }; }
}
window.JUCUM_DATA.materialReviewKey = materialReviewKey;
window.JUCUM_DATA.getMaterialReviews = getMaterialReviews;
window.JUCUM_DATA.getMaterialReview = getMaterialReview;
window.JUCUM_DATA.setMaterialReview = setMaterialReview;
window.JUCUM_DATA.loadMaterialReviewsFromCloud = loadMaterialReviewsFromCloud;
window.JUCUM_DATA.sendMaterialReport = sendMaterialReport;
