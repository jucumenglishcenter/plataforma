/* ✍️ SETS DESDE DOCUMENTO · DOCSETS-V1 (22-oct-2026) — lógica (sin JSX)
 * El teacher sube su hoja (Student y opcional Teacher con Answer:/Also:). Cada “Step N: Título • Practice X of Y”
 * es un SET de práctica interactivo. Por set elige: No asignar · 🏫 En clase (día del plan + tiempo) · 🏠 Para casa.
 * Se guarda como una TAREA normal (tabla assignments) con el set dentro de description (<!--JUCUM_TASK:{docset}-->).
 *  - 🏫 clase: NO es tarea (no cuenta en “tareas cumplidas”, es participación). El alumno solo la ve mientras está
 *    abierta (docset.live.openedAt y sin closedAt, antes de endAt). La abre el teacher desde ▶ Modo clase.
 *  - Avance del alumno = fila de submissions con status 'draft' (solo nube; pullTasks la ignora). Al entregar o al
 *    cerrarse la de clase → status 'graded' con la nota automática. Respuestas en text = 'JUCUM_DOCSET:' + JSON.
 * Corrección (decidido 14-oct + 22-oct): 1 intento · tildes/coma/mayúscula/punto NO bajan nota (solo aviso) ·
 * Combine/Change = exacta (Answer + Also) · Expand = regla; lo dudoso = 'rev' (lo revisa el teacher, NO es error). */
(function () {
  const PFX = 'JUCUM_DOCSET:';
  const strip = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const norm = s => strip(s).toLowerCase().replace(/[’‘`]/g, "'").replace(/\bcan't\b/g, 'can not').replace(/\bwon't\b/g, 'will not').replace(/n't\b/g, ' not').replace(/'m\b/g, ' am').replace(/'re\b/g, ' are').replace(/'s\b/g, ' is').replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();
  const words = s => norm(s).split(' ').filter(Boolean);

  /* ── meta dentro de la tarea ── */
  function meta(a) {
    const d = (a && a.description) || ''; const m = d.match(/<!--JUCUM_TASK:([\s\S]*?)-->/);
    if (!m) return null; try { const s = JSON.parse(decodeURIComponent(m[1])); return s && s.docset ? s.docset : null; } catch (e) { return null; }
  }
  const isDocset = a => !!meta(a);
  const isClass = a => { const m = meta(a); return !!(m && m.mode === 'class'); };
  function describe(ds) {
    const plain = (ds.en || '') + (ds.es ? '\n' + ds.es : '');
    return plain + '\n\n<!--JUCUM_TASK:' + encodeURIComponent(JSON.stringify({ docset: ds })) + '-->';
  }
  function liveState(ds, now) {
    now = now || Date.now(); const L = (ds && ds.live) || {};
    if (!L.openedAt) return 'waiting';
    if (L.closedAt || (L.endAt && now >= new Date(L.endAt).getTime())) return 'closed';
    return 'open';
  }

  /* ── lectura del documento ── */
  const RE_STEP = /^step\s*(\d+[a-z]?)\s*[:.\-–]\s*(.+?)(?:\s*[•·|–\-]\s*practice\s*(\d+)\s*(?:of|de)\s*(\d+))?\s*$/i;
  const RE_ITEM = /^(\d{1,2})[.)]\s+(.+)$/;
  const RE_JUNK = /(student sheet|teacher sheet|^--\s*\d+\s*of\s*\d+\s*--$|^page\s*\d+|^name\s*[:/]|^date\s*[:/])/i;
  function kindOf(ins, title) {
    const t = (ins + ' ' + title).toLowerCase();
    if (/join the two|combine/.test(t)) return 'combine';
    if (/add more information|expand/.test(t)) return 'expand';
    if (/change each sentence|change the sentences|transform/.test(t)) return 'change';
    if (/read the model|write\s*\d|your own|escribe tu/.test(t)) return 'write';
    return 'other';
  }
  const ES_INS = { combine: 'Une las dos oraciones con la palabra que está entre ( ).', expand: 'Agrega más información: responde la pregunta que está entre ( ).', change: 'Cambia cada oración como indica la palabra.' };
  const CUE_ES = { and: 'y', but: 'pero', so: 'por eso', because: 'porque', or: 'o', 'where?': '¿dónde?', 'when?': '¿cuándo?', 'how?': '¿cómo?', 'who?': '¿quién?', 'why?': '¿por qué?', past: 'pasado', question: 'pregunta', negative: 'negativa', plural: 'plural', singular: 'singular', present: 'presente', future: 'futuro' };
  function splitCue(txt) {
    let s = txt.trim(), cue = '';
    let m = s.match(/^(.*?)\s*\(([^()]{1,30})\)\s*$/);
    if (m && !/^[A-Z ]+\s*\(/.test(m[2])) { s = m[1]; cue = m[2].trim(); }
    m = s.match(/^(.*?[.?!])\s+([A-Z]{3,}(?:\s+[A-Z]{3,})*(?:\s*\([^)]*\))?)\s*$/);
    if (m) { s = m[1]; cue = m[2].trim() + (cue ? ' (' + cue + ')' : ''); }
    return { q: s.trim(), cue };
  }
  function cueEs(cue) { const k = String(cue || '').toLowerCase().split(/[\s(]/)[0]; return CUE_ES[k] || ''; }
  function detect(lines) {
    const L = (lines || []).map(l => String(l).replace(/\s+/g, ' ').trim()).filter(Boolean).filter(l => !RE_JUNK.test(l));
    const out = { title: '', intro: '', suggest: null, sets: [] };
    const ti = L.findIndex(l => /^(pre-?a1|a1|a2)\b[^:]{0,30}:/i.test(l)); if (ti >= 0) out.title = L[ti];
    const intro = L.find(l => /start in class|finish at home|your teacher chooses/i.test(l)) || ''; out.intro = intro;
    if (/start in class/i.test(intro)) out.suggest = 'split'; else if (/teacher chooses/i.test(intro)) out.suggest = 'teacher';
    let cur = null, mode = '';
    L.forEach(l => {
      const st = l.match(RE_STEP);
      if (st) { cur = { step: st[1].toUpperCase(), title: st[2].replace(/\s*[•·|]\s*$/, '').trim(), part: st[3] ? st[3] + ' of ' + st[4] : '', practice: st[3] ? +st[3] : 1, en: '', ex: ['', ''], items: [] }; out.sets.push(cur); mode = 'ins'; return; }
      if (!cur) return;
      if (/^example\b/i.test(l)) { mode = 'ex'; const rest = l.replace(/^example\s*[:.]?\s*/i, ''); if (rest) cur.ex[0] = rest; return; }
      if (mode === 'ex' && /^(→|->|=>)/.test(l)) { cur.ex[1] = l.replace(/^(→|->|=>)\s*/, ''); mode = 'items'; return; }
      if (mode === 'ex' && !cur.ex[0]) { cur.ex[0] = l; return; }
      const it = l.match(RE_ITEM);
      if (it) { const c = splitCue(it[2]); cur.items.push({ q: c.q, cue: c.cue, ces: cueEs(c.cue), key: '', also: [], tr: '', src: '' }); mode = 'items'; return; }
      const an = l.match(/^answer\s*(\(example\))?\s*[:：]\s*(.+)$/i); if (an && cur.items.length) { const x = cur.items[cur.items.length - 1]; x.key = an[2].trim(); x.src = 'teacher'; return; }
      const al = l.match(/^also\s*[:：]\s*(.+)$/i); if (al && cur.items.length) { cur.items[cur.items.length - 1].also.push(al[1].trim()); return; }
      const tr = l.match(/^(traducci[oó]n|translation|es)\s*[:：]\s*(.+)$/i); if (tr && cur.items.length) { cur.items[cur.items.length - 1].tr = tr[2].trim(); return; }
      if (mode === 'ins' && !cur.en) { cur.en = l; return; }
    });
    out.sets = out.sets.filter(s => s.items.length).map((s, i) => {
      const kind = kindOf(s.en, s.title); s.kind = kind; s.grade = kind === 'expand' ? 'rule' : (kind === 'combine' || kind === 'change') ? 'exact' : 'manual';
      s.es = ES_INS[kind] || ''; s.id = 'set' + i;
      s.items.forEach(x => { if (!x.key && kind !== 'expand') { const p = propose(kind, x.q, x.cue); if (p) { x.key = p; x.src = 'auto'; } } });
      return s;
    });
    return out;
  }
  /* Une varios documentos (Student + Teacher): la versión del teacher aporta Answer/Also/traducción */
  function merge(a, b) {
    if (!b || !b.sets.length) return a; if (!a || !a.sets.length) return b;
    a.sets.forEach(s => { const t = b.sets.find(x => x.step === s.step && x.practice === s.practice) || b.sets.find(x => x.title === s.title); if (!t) return;
      s.items.forEach((x, i) => { const y = t.items[i]; if (!y) return; if (y.src === 'teacher' && y.key) { x.key = y.key; x.src = 'teacher'; } if (y.also.length) x.also = y.also; if (y.tr) x.tr = y.tr; }); });
    return a;
  }

  /* ── respuestas propuestas (el teacher las confirma) ── */
  const KEEP = /^(I|Mr|Mrs|Ms|Miss|Dr)$/;
  const DET = /^(the|a|an|my|your|his|her|our|their|this|that|these|those|its)$/i;
  function lc1(s) { const w = s.split(' ')[0]; if (KEEP.test(w) || !/^(He|She|It|They|We|You|The|A|An|My|Your|His|Her|Our|Their|This|That|These|Those|There|Its)$/.test(w)) return s; return s[0].toLowerCase() + s.slice(1); }
  const IRR = { go: 'went', goes: 'went', see: 'saw', sees: 'saw', eat: 'ate', eats: 'ate', have: 'had', has: 'had', make: 'made', makes: 'made', take: 'took', takes: 'took', come: 'came', comes: 'came', get: 'got', gets: 'got', sit: 'sat', sits: 'sat', stand: 'stood', stands: 'stood', run: 'ran', runs: 'ran', buy: 'bought', buys: 'bought', say: 'said', says: 'said', find: 'found', finds: 'found', give: 'gave', gives: 'gave', know: 'knew', knows: 'knew', think: 'thought', thinks: 'thought', leave: 'left', leaves: 'left', feel: 'felt', feels: 'felt', read: 'read', reads: 'read', write: 'wrote', writes: 'wrote', ride: 'rode', rides: 'rode', drive: 'drove', drives: 'drove', sleep: 'slept', sleeps: 'slept', wake: 'woke', wakes: 'woke', meet: 'met', meets: 'met', pay: 'paid', pays: 'paid', wear: 'wore', wears: 'wore', speak: 'spoke', speaks: 'spoke', tell: 'told', tells: 'told', cost: 'cost', costs: 'cost', put: 'put', puts: 'put', do: 'did', does: 'did', bring: 'brought', brings: 'brought', swim: 'swam', swims: 'swam', sing: 'sang', sings: 'sang', drink: 'drank', drinks: 'drank', begin: 'began', begins: 'began', lose: 'lost', loses: 'lost', win: 'won', wins: 'won', fly: 'flew', flies: 'flew', hear: 'heard', hears: 'heard', send: 'sent', sends: 'sent', spend: 'spent', spends: 'spent', teach: 'taught', teaches: 'taught', catch: 'caught', catches: 'caught', fall: 'fell', falls: 'fell', grow: 'grew', grows: 'grew', draw: 'drew', draws: 'drew', break: 'broke', breaks: 'broke', choose: 'chose', chooses: 'chose', forget: 'forgot', forgets: 'forgot' };
  function base(v) { const l = v.toLowerCase(); if (/ies$/.test(l)) return l.slice(0, -3) + 'y'; if (/(ss|sh|ch|x|o)es$/.test(l)) return l.slice(0, -2); if (/s$/.test(l) && !/ss$/.test(l)) return l.slice(0, -1); return l; }
  function past(v) { const l = v.toLowerCase(); if (IRR[l]) return IRR[l]; const b = base(l); if (/e$/.test(b)) return b + 'd'; if (/[^aeiou]y$/.test(b)) return b.slice(0, -1) + 'ied'; if (/^[^aeiou]*[aeiou][^aeiouwxy]$/.test(b)) return b + b.slice(-1) + 'ed'; return b + 'ed'; }
  function subjLen(t) { return DET.test(t[0]) ? 2 : 1; }
  function propose(kind, q, cue) {
    const c = String(cue || '').toLowerCase();
    if (kind === 'combine') {
      const parts = q.split(/(?<=[.!?])\s+/); if (parts.length !== 2) return '';
      const a = parts[0].replace(/[.!?]$/, ''), b = lc1(parts[1].replace(/[.!?]$/, ''));
      const w = c.split(/\s/)[0]; if (!w) return '';
      return (w === 'so' || w === 'but' ? a + ', ' + w + ' ' + b : a + ' ' + w + ' ' + b) + '.';
    }
    if (kind === 'change') {
      const t = q.replace(/[.!?]$/, '').split(' '); const n = subjLen(t); const v = t[n]; if (!v) return '';
      const be = /^(is|are|am|was|were)$/i.test(v), plural = /^(we|they|you|i)$/i.test(t[0]) || (n === 2 ? /s$/.test(t[1]) : /s$/.test(t[0]) && !/^(he|she|it|this|that)$/i.test(t[0]));
      if (/^past/.test(c)) { if (be) { t[n] = /^(are|were)$/i.test(v) ? 'were' : 'was'; } else t[n] = past(v); return t.join(' ') + '.'; }
      if (/^question/.test(c)) { if (be) { const s = t.slice(0, n), r = t.slice(n + 1); return v[0].toUpperCase() + v.slice(1).toLowerCase() + ' ' + lc1(s.join(' ')) + (r.length ? ' ' + r.join(' ') : '') + '?'; }
        const s = t.slice(0, n).join(' '), r = t.slice(n + 1); return (plural ? 'Do' : 'Does') + ' ' + lc1(s) + ' ' + base(v) + (r.length ? ' ' + r.join(' ') : '') + '?'; }
      if (/^negative/.test(c)) { if (be) { t.splice(n + 1, 0, 'not'); return t.join(' ') + '.'; } t.splice(n, 1, (plural ? 'do not ' : 'does not ') + base(v)); return t.join(' ') + '.'; }
      const hint = (cue.match(/\(([^)]+)\)/) || [])[1];
      if (/^(singular|plural)/.test(c) && hint) { const subj = hint.replace(/[….]+$/, '').trim(); const r = t.slice(n + 1); let vv = v;
        if (/^singular/.test(c)) vv = be ? (/^are$/i.test(v) ? 'is' : v) : (/s$/.test(v) ? v : v + (/(sh|ch|x|o)$/.test(v) ? 'es' : 's'));
        else vv = be ? (/^is$/i.test(v) ? 'are' : v) : base(v);
        return subj + ' ' + vv + (r.length ? ' ' + r.join(' ') : '') + '.'; }
      return '';
    }
    return '';
  }

  /* ── corrección ── */
  const PLACE = /\b(in|at|on|near|next|under|behind|to|from|inside|outside|by|between|home|there|here|around|into|across|in front of)\b/;
  const TIME = /\b(morning|afternoon|evening|night|today|yesterday|tomorrow|at|in|on|every|after|before|o'clock|oclock|am|pm|monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|day|month|year|now|later|soon|early|late|always|usually|sometimes)\b/;
  const HOW = /(\w{3,}ly\b|\b(a lot|with|fast|well|hard|loud|quiet|happy|together|alone)\b)/;
  function warnings(txt, key) {
    const t = String(txt).trim(), d = []; if (!t) return d;
    if (t[0] !== t[0].toUpperCase()) d.push('empieza con mayúscula');
    const end = String(key || '.').trim().slice(-1); const want = end === '?' ? '?' : '.';
    if (t.slice(-1) !== want && !(want === '.' && /[!]$/.test(t))) d.push(want === '?' ? 'termina con signo ?' : 'termina con punto');
    const acc = (String(key || '').match(/[A-Za-zÀ-ÿ]*[áéíóúñÁÉÍÓÚÑ][A-Za-zÀ-ÿ]*/g) || []);
    const miss = acc.find(w => !t.includes(w)); if (miss) d.push('revisa la tilde (' + miss + ')');
    return d;
  }
  function grade(set, i, txt) {
    const it = set.items[i]; if (!String(txt || '').trim()) return { r: 'blank' };
    if (set.grade === 'rule') {
      const b = words(it.q), a = words(txt), keep = b.every((w, k) => a[k] === w), add = a.length - b.length, extra = a.slice(b.length).join(' ');
      const cue = String(it.cue || '').toLowerCase(); const re = /where/.test(cue) ? PLACE : /when/.test(cue) ? TIME : /how/.test(cue) ? HOW : null;
      if (keep && add >= 1 && re && re.test(extra) && add <= 6) { const w = warnings(txt, it.q); return w.length ? { r: 'okd', d: w.join(' y ') } : { r: 'ok' }; }
      if (keep && add >= 1) return { r: 'rev' };
      return { r: 'bad', h: !keep ? 'Conserva la oración «' + it.q.replace(/[.!?]$/, '') + '» y agrégale información al final.' : 'Agrega información que responda ' + (it.ces || it.cue) + '.' };
    }
    if (set.grade === 'manual') return { r: 'rev' };
    const keys = [it.key].concat(it.also || []).filter(Boolean).map(norm);
    if (keys.includes(norm(txt))) { const w = warnings(txt, it.key); return w.length ? { r: 'okd', d: w.join(' y ') } : { r: 'ok' }; }
    const cw = String(it.cue || '').toLowerCase().split(/\s/)[0];
    if (set.kind === 'combine' && cw && !words(txt).includes(cw)) return { r: 'bad', h: 'Usa la palabra «' + cw + '».' };
    return { r: 'bad', h: '' };
  }
  const pts = r => (r === 'ok' || r === 'okd' || r === 'rev') ? 1 : 0;
  function score(set, res) { const n = set.items.length || 1; let s = 0; for (let i = 0; i < n; i++) s += pts(res[i]); return Math.round(s / n * 100); }
  const nRev = res => (res || []).filter(x => x === 'rev').length;

  /* ── respuestas guardadas en la entrega ── */
  function packAns(o) { return PFX + JSON.stringify(o); }
  function unpack(text) { const t = String(text || ''); if (t.indexOf(PFX) !== 0) return null; try { return JSON.parse(t.slice(PFX.length)); } catch (e) { return null; } }

  /* ── nube (lecturas en vivo, livianas) ── */
  const SB = () => (window.JUCUM_SB && window.JUCUM_SB.getClient) ? window.JUCUM_SB.getClient() : null;
  async function fetchSubs(aid) {
    const c = SB(); if (!c) return null;
    try { const r = await c.from('submissions').select('*').eq('assignment_id', aid); if (r.error) return null; return r.data || []; } catch (e) { return null; }
  }
  async function fetchGroupTasks(gid) {
    const c = SB(); if (!c || !gid) return null;
    try { const r = await c.from('assignments').select('id,group_id,target_student_ids,title,description,due_at,xp,created_at').eq('group_id', gid); if (r.error) return null;
      return (r.data || []).map(x => ({ id: x.id, groupId: x.group_id, targetStudentIds: x.target_student_ids || [], title: x.title, description: x.description, dueAt: x.due_at, xp: x.xp, date: x.created_at })); } catch (e) { return null; }
  }
  async function saveDraft(aid, sid, ans) {
    const S = window.JUCUM_SYNC; if (!S || !S.pushSubmission) return false;
    try { const r = await S.pushSubmission(aid, sid, { id: 'sub-ds-' + aid.slice(-8) + '-' + String(sid).slice(0, 8), submittedAt: new Date().toISOString(), text: packAns(ans), attachments: [], status: 'draft' }); return !r || r.ok !== false; } catch (e) { return false; }
  }
  /* Entrega final con nota automática (pasa por JUCUM_TASKS: caché local + nube + XP) */
  async function finalize(a, set, sid, ans) {
    const T = window.JUCUM_TASKS; const g = score(set, ans.res || []); const rv = nRev(ans.res);
    ans.done = true; ans.grade = g; ans.at = new Date().toISOString();
    await T.submitAssignment(a.id, sid, { text: packAns(ans), attachments: [] });
    T.gradeSubmission(a.id, sid, g, rv ? 'Nota provisional: ' + rv + ' respuesta(s) las revisa tu profe a mano.' : 'Nota registrada al instante.');
    return g;
  }
  /* El teacher cambia la nota de un ejercicio (✔ Está bien / ✘ Corregir / Dar por buena) */
  async function setItemResult(a, set, sid, row, i, r) {
    const ans = unpack(row && row.text) || { ans: [], res: [] }; ans.res = ans.res || []; ans.res[i] = r; ans.grade = score(set, ans.res);
    const text = packAns(ans), g = ans.grade, fb = nRev(ans.res) ? 'Nota provisional: aún hay respuestas por revisar.' : 'Tu profe revisó tus respuestas.';
    const c = SB(); if (c) { try { await c.from('submissions').upsert({ id: (row && row.id) || ('sub-ds-' + Date.now()), assignment_id: a.id, student_id: sid, submitted_at: (row && row.submitted_at) || new Date().toISOString(), text, attachments: [], status: 'graded', grade: g, feedback: fb, graded_at: new Date().toISOString() }, { onConflict: 'assignment_id,student_id' }); } catch (e) {} }
    try { const k = 'jucum_submissions_v1'; const subs = JSON.parse(localStorage.getItem(k) || '{}'); subs[a.id] = subs[a.id] || {}; subs[a.id][sid] = Object.assign({}, subs[a.id][sid] || { id: row && row.id, submittedAt: row && row.submitted_at, attachments: [] }, { text, status: 'graded', grade: g, feedback: fb, gradedAt: new Date().toISOString() }); localStorage.setItem(k, JSON.stringify(subs)); } catch (e) {}
    return ans;
  }
  /* Al cerrar la de clase: lo que quedó a medias se califica con lo respondido (lo demás = en blanco) */
  async function closeDrafts(a, set) {
    const rows = await fetchSubs(a.id); if (!rows) return 0; let n = 0;
    for (const row of rows) { if (row.status !== 'draft') continue; const ans = unpack(row.text) || { ans: [], res: [] };
      ans.done = true; ans.closed = true; ans.grade = score(set, ans.res || []);
      const c = SB(); try { await c.from('submissions').update({ text: packAns(ans), status: 'graded', grade: ans.grade, feedback: 'Cerrada en clase (lo no respondido cuenta en blanco).', graded_at: new Date().toISOString() }).eq('id', row.id); n++; } catch (e) {} }
    return n;
  }
  /* Cambiar el set guardado en la tarea (abrir/cerrar/tiempo/also) sin avisar “tarea actualizada” */
  async function patch(a, fn) {
    const T = window.JUCUM_TASKS; const cur = (T.getAssignments().find(x => x.id === a.id)) || a; const ds = meta(cur); if (!ds) return null;
    fn(ds); const data = { description: describe(ds) }; if (ds.mode === 'home' && ds.dueAt !== undefined) data.dueAt = ds.dueAt;
    const r = await T.updateAssignment(a.id, data, { silent: true }); return Object.assign({}, cur, data, { _synced: r && r.synced });
  }
  function notifyGroup(a, title, body, link) {
    try { const D = window.JUCUM_DATA, N = window.JUCUM_NOTIF; if (!D || !N) return;
      D.STUDENTS.filter(s => s.group === a.groupId).forEach(s => N.pushNotif(s.id, { type: 'assignment', title, body, link: link || 'dashboard' })); } catch (e) {}
  }
  const trUrl = q => 'https://translate.google.com/?sl=en&tl=es&op=translate&text=' + encodeURIComponent(q);

  window.JUCUM_DOCSETS = { detect, merge, propose, meta, isDocset, isClass, describe, liveState, grade, score, nRev, warnings, norm, packAns, unpack, fetchSubs, fetchGroupTasks, saveDraft, finalize, setItemResult, closeDrafts, patch, notifyGroup, trUrl, cueEs };
})();
