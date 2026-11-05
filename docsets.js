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
  const norm = s => strip(s).toLowerCase().replace(/[’‘`´]/g, "'").replace(/\bcan't\b/g, 'can not').replace(/\bwon't\b/g, 'will not').replace(/n't\b/g, ' not').replace(/'m\b/g, ' am').replace(/'re\b/g, ' are').replace(/'s\b/g, ' is').replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();
  const words = s => norm(s).split(' ').filter(Boolean);
  /* DOCSETS-TILDE-APOS-V1 (03-nov, aprobado): la tecla ´ del teclado en español cuenta como apóstrofo (vale completo, solo aviso). */

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
  /* DOCSETS-A2-V1 (03-nov): A2 titula «Working Set 1 • Set 2: …» o «Set 6: …» (igual que Step N) */
  const RE_WSET = /^working\s*set\s*(\d+)\s*[•·|–\-:]\s*set\s*(\d+[a-z]?)\s*[:.\-–]\s*(.+)$/i;
  const RE_SET = /^set\s*(\d+[a-z]?)\s*[:.\-–]\s*(.+)$/i;
  const MARK = /^(answer|also|look\s*in|source|traducci[oó]n|translation|es|word\s*bank|message|example|step|set|working\s*set)\b/i;
  const setLabel = s => s ? ((s.ws ? 'Working Set ' + s.ws + ' • ' : '') + (s.lab || 'Step') + ' ' + s.step) : '';
  function splitOpts(q) { const m = String(q || '').split(/\s*\(([a-dA-D])\)\s*/); if (m.length < 5) return null; const opts = []; for (let k = 1; k < m.length; k += 2) opts.push(String(m[k + 1] || '').trim()); return opts.every(Boolean) ? { stem: m[0].trim(), opts } : null; }
  const RE_JUNK = /(student sheet|teacher sheet|^--\s*\d+\s*of\s*\d+\s*--$|^page\s*\d+|^name\s*[:/]|^date\s*[:/])/i;
  function kindOf(ins, title) {
    const t = (ins + ' ' + title).toLowerCase();
    if (/join the two|combine/.test(t)) return 'combine';
    if (/add more information|expand/.test(t)) return 'expand';
    if (/change each sentence|change the sentences|transform/.test(t)) return 'change';
    if (/choose the (best|correct|right)|circle the|multiple choice|elige la/.test(t)) return 'mcq';
    if (/one word|una palabra|fill in the blank|complete with (a|one|the) word/.test(t)) return 'word';
    if (/read the model|write\s*\d|your own|escribe tu/.test(t)) return 'write';
    if (/full sentence|complete sentence|oraci[oó]n completa|answer the questions?/.test(t)) return 'sent';
    return 'other';
  }
  const ES_INS = { mcq: 'Elige la mejor respuesta.', word: 'Completa con una sola palabra.', sent: 'Responde con una oración completa.', combine: 'Une las dos oraciones con la palabra que está entre ( ).', expand: 'Agrega más información: responde la pregunta que está entre ( ).', change: 'Cambia cada oración como indica la palabra.' };
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
    const head = l => { let m = l.match(RE_STEP); if (m) return { step: m[1].toUpperCase(), title: m[2].replace(/\s*[•·|]\s*$/, '').trim(), part: m[3] ? m[3] + ' of ' + m[4] : '', practice: m[3] ? +m[3] : 1, lab: 'Step' };
      m = l.match(RE_WSET); if (m) return { step: m[2].toUpperCase(), title: m[3].trim(), part: '', practice: +m[1], ws: +m[1], lab: 'Set' };
      m = l.match(RE_SET); if (m) return { step: m[1].toUpperCase(), title: m[2].trim(), part: '', practice: 1, lab: 'Set' };
      return null; };
    let cur = null, mode = '', cont = null;
    L.forEach(l => {
      const c0 = cont; cont = null;
      const h = head(l);
      if (h) { cur = Object.assign(h, { en: '', ex: ['', ''], items: [], bank: [], msg: [] }); out.sets.push(cur); mode = 'ins'; return; }
      if (!cur) return;
      const last = cur.items[cur.items.length - 1];
      /* PDF: una respuesta larga puede venir partida en dos renglones (el 2.º empieza en minúscula) */
      if (c0 && /^[a-záéíóúñ]/.test(l) && !MARK.test(l) && !/[.?!]$/.test(String(c0.o[c0.k]))) { c0.o[c0.k] += ' ' + l; cont = c0; return; }
      if (/^example\b/i.test(l)) { mode = 'ex'; const rest = l.replace(/^example\s*[:.]?\s*/i, ''); if (rest) cur.ex[0] = rest; return; }
      if (mode === 'ex' && /^(→|->|=>)/.test(l)) { cur.ex[1] = l.replace(/^(→|->|=>)\s*/, ''); mode = 'items'; return; }
      if (mode === 'ex' && !cur.ex[0]) { cur.ex[0] = l; return; }
      const it = l.match(RE_ITEM);
      if (it) { const c = splitCue(it[2]); cur.items.push({ q: c.q, cue: c.cue, ces: cueEs(c.cue), key: '', also: [], tr: '', src: '', look: '', story: '' }); mode = 'items'; return; }
      const wb = l.match(/^word\s*bank\s*[:：]\s*(.+)$/i); if (wb) { cur.bank = wb[1].split(/\s*[·•,;|\/]\s*/).map(t => t.trim()).filter(Boolean); return; }
      const ms = l.match(/^message\s*[:：]\s*(.*)$/i); if (ms) { mode = 'msg'; if (ms[1].trim()) cur.msg.push(ms[1].trim()); return; }
      if (mode === 'msg') { cur.msg.push(l); return; }
      const an = l.match(/^answer\s*(\(example\))?\s*[:：]\s*(.+)$/i); if (an && last) { last.key = an[2].trim(); last.src = 'teacher'; cont = { o: last, k: 'key' }; return; }
      const al = l.match(/^also\s*[:：]\s*(.+)$/i); if (al && last) { last.also.push(al[1].trim()); cont = { o: last.also, k: last.also.length - 1 }; return; }
      const tr = l.match(/^(traducci[oó]n|translation|es)\s*[:：]\s*(.+)$/i); if (tr && last) { last.tr = tr[2].trim(); return; }
      const so = l.match(/^source\s*[:：]\s*(.+)$/i); if (so && last) { last.story = so[1].trim(); cont = { o: last, k: 'story' }; return; }
      const lk = l.match(/^look\s*in\s*[:：]\s*(.+)$/i); if (lk && last) { last.look = lk[1].trim(); return; }
      if (last && /^\([a-d]\)\s/i.test(l)) { last.q += ' ' + l; return; }
      if (mode === 'ins' && !cur.en) { cur.en = l; return; }
    });
    out.sets = out.sets.filter(s => s.items.length).map((s, i) => {
      let kind = kindOf(s.en, s.title);
      if (kind === 'other' && s.items.every(x => /\(a\)\s*\S/i.test(x.q) && /\(b\)\s*\S/i.test(x.q))) kind = 'mcq';
      if (kind === 'other' && /complete|fill/i.test(s.en + ' ' + s.title) && s.items.every(x => /_{2,}/.test(x.q))) kind = 'word';
      s.kind = kind; s.grade = kind === 'expand' ? 'rule' : (kind === 'combine' || kind === 'change' || kind === 'mcq' || kind === 'word') ? 'exact' : kind === 'sent' ? 'sent' : 'manual';
      s.es = ES_INS[kind] || ''; s.id = 'set' + i;
      if (kind === 'mcq') s.items.forEach(x => { const o = splitOpts(x.q + (x.cue ? ' (' + x.cue + ')' : '')); if (!o) return; x.q = o.stem; x.opts = o.opts; x.cue = ''; x.ces = '';
        const lt = String(x.key || '').trim().match(/^\(?([a-d])\)?\.?$/i); if (lt && o.opts['abcd'.indexOf(lt[1].toLowerCase())]) x.key = o.opts['abcd'.indexOf(lt[1].toLowerCase())]; });
      s.items.forEach(x => { if (!x.key && kind !== 'expand') { const p = propose(kind, x.q, x.cue); if (p) { x.key = p; x.src = 'auto'; } } });
      return s;
    });
    return out;
  }
  /* Une varios documentos (Student + Teacher): la versión del teacher aporta Answer/Also/traducción */
  function merge(a, b) {
    if (!b || !b.sets.length) return a; if (!a || !a.sets.length) return b;
    a.sets.forEach(s => { const t = b.sets.find(x => x.step === s.step && x.practice === s.practice) || b.sets.find(x => x.title === s.title); if (!t) return;
      s.items.forEach((x, i) => { const y = t.items[i]; if (!y) return; if (y.src === 'teacher' && y.key) { x.key = y.key; x.src = 'teacher'; } if (y.also.length) x.also = y.also; if (y.tr) x.tr = y.tr; if (y.story) x.story = y.story; if (y.look) x.look = y.look; if (y.opts && !x.opts) x.opts = y.opts; });
      if ((t.bank || []).length && !(s.bank || []).length) s.bank = t.bank; if ((t.msg || []).length && !(s.msg || []).length) s.msg = t.msg; });
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
  /* DOCSETS-FIX-V2 (23-oct) · Formas que TAMBIÉN valen al unir con and/but/or, sin repetir el sujeto (ni el verbo).
   * Caso real 22-oct: “Tomás sees a ship. He sees a bridge. (and)” → “Tomás sees a ship and a bridge.” salía ✘. */
  const PRON = /^(he|she|it|they|we|you|i)$/i;
  const ABBR = /\b(Mr|Mrs|Ms|Dr|St|Sr|Sra|Srta)\.(?=\s)/g;
  function sentSplit(q) { return String(q || '').trim().replace(ABBR, '$1\u00a7').split(/(?<=[.!?])\s+/).map(s => s.replace(/\u00a7/g, '.')); }
  function subjOf(t) { if (!t.length) return 0; if (PRON.test(t[0])) return 1; if (DET.test(t[0])) return Math.min(2, t.length); let k = 0; while (k < t.length && /^[A-ZÁÉÍÓÚÑ]/.test(t[k])) k++; return Math.max(1, k); }
  function combineAlts(q, cue) {
    const w = String(cue || '').toLowerCase().split(/[\s(]/)[0]; if (!w) return [];
    const parts = sentSplit(q); if (parts.length !== 2) return [];
    const A = parts[0].replace(/[.!?]+$/, '').trim(), B = parts[1].replace(/[.!?]+$/, '').trim();
    const a = A.split(/\s+/), b = B.split(/\s+/), la = a.map(x => x.toLowerCase()), lb = b.map(x => x.toLowerCase());
    const out = []; const add = rest => { if (rest.length) out.push(A + (w === 'but' || w === 'so' ? ', ' : ' ') + w + ' ' + rest.join(' ') + '.'); };
    add(lc1(B).split(/\s+/));
    if (!/^(and|but|or)$/.test(w)) return out;
    const sa = subjOf(a), sb = subjOf(b);
    let co = sa === sb && la.slice(0, sa).join(' ') === lb.slice(0, sb).join(' ');
    if (!co && sb === 1 && PRON.test(b[0])) { const p = lb[0], head = la[sa - 1] || '';
      co = /^(he|she|it)$/.test(p) ? !/^(i|we|you|they)$/.test(la[0]) : p === 'they' ? (la[0] === 'they' || (/s$/.test(head) && !/(ss|us|is|ás|és)$/.test(head))) : p === la[0]; }
    if (!co) return out;
    add(b.slice(sb));                                          // “… and sees a bridge.”
    if (lb[sb] && lb[sb] === la[sa]) add(b.slice(sb + 1));     // “… and a bridge.” · “wide and noisy.”
    return out;
  }
  /* Dos oraciones donde se pedía UNA (caso real: “The bus is full.  So they stand…” salía ✔). */
  function multiSentence(t) { const core = String(t || '').trim().replace(/[.!?…]+["'”’)\]]*\s*$/, '').replace(/\b(Mr|Mrs|Ms|Dr|St|Sr|Sra|Srta)\./gi, '$1'); return /[.!?]\s+\S/.test(core); }
  function hintFor(set, it) {
    const c = String(it.cue || '').toLowerCase();
    if (set.kind === 'combine') return 'Copia las dos oraciones tal cual (revisa cada palabra) y únelas con «' + c.split(/[\s(]/)[0] + '».';
    if (set.kind === 'change') {
      if (/^past/.test(c)) return 'Pasa el verbo a pasado (walk → walked · stop → stopped · see → saw) y copia lo demás igual.';
      if (/^question/.test(c)) return 'Para preguntar: Is/Are + el resto + ? · o Do/Does + verbo sin -s + ?';
      if (/^negative/.test(c)) return 'Negativo: is not / are not · does not / do not + verbo sin -s.';
      if (/^singular/.test(c)) return 'En singular el verbo lleva -s (A ticket costs…).';
      if (/^plural/.test(c)) return 'En plural el verbo va sin -s (The houses are…).';
      return 'Cambia solo lo que pide la palabra y copia lo demás igual.';
    }
    return '';
  }
  function propose(kind, q, cue) {
    const c = String(cue || '').toLowerCase();
    if (kind === 'combine') {
      const parts = sentSplit(q); if (parts.length !== 2) return '';
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
  const HOW = /(\w{3,}ly\b|\b(a lot|with|like|fast|well|hard|loud|quiet|happy|together|alone)\b)/;
  function warnings(txt, key) {
    const t = String(txt).trim(), d = []; if (!t) return d;
    if (t[0] !== t[0].toUpperCase()) d.push('empieza con mayúscula');
    const end = String(key || '.').trim().slice(-1); const want = end === '?' ? '?' : '.';
    if (t.slice(-1) !== want && !(want === '.' && /[!]$/.test(t))) d.push(want === '?' ? 'termina con signo ?' : 'termina con punto');
    const acc = (String(key || '').match(/[A-Za-zÀ-ÿ]*[áéíóúñÁÉÍÓÚÑ][A-Za-zÀ-ÿ]*/g) || []);
    const miss = acc.find(w => !t.includes(w)); if (miss) d.push('revisa la tilde (' + miss + ')');
    if (/´/.test(t)) d.push("usa el botón ' para el apóstrofo");
    return d;
  }
  /* ── DOCSETS-ORACION-V1 (03-nov-2026, aprobado por la usuaria) · respuesta con oración completa ──
   * Compara con Answer, Also y Source palabra por palabra y se queda con la forma que mejor explica la respuesta.
   *  ✔ igual: mayúsculas, tildes, comas, espacios, contracciones y ´ no cuentan (a lo más un aviso) · Lucía ↔ She se cruza solo.
   *  ✘ 'bad' (0 puntos) solo si TODAS las diferencias tienen nombre: artículo, tiempo del verbo (según la pregunta:
   *    did → pasado · does → presente), concordancia, preposición, pronombre, singular/plural, forma del verbo, ortografía,
   *    sentido (yes/no, not), sujeto, orden · máx. 3 y ≤ 40 % de la oración. También: oración incompleta, dos oraciones,
   *    respuesta en español y tiempo del verbo por el contexto aunque lo demás sea distinto.
   *  📝 'rev' todo lo demás (lo decide el teacher). Progresivo (was waiting / is selling) y «did + verbo» → 'rev', nunca ✘.
   *  diagnose() da las mismas pistas a Combine / Change / una palabra (DOCSETS-PISTAS-V1) SIN cambiar su nota. */
  const SENT = (function () {
    const toks = s => norm(s).split(' ').filter(Boolean);
    const deacc = w => String(w).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const ART = new Set(['a', 'an', 'the']);
    const PREP = new Set(['in', 'on', 'at', 'near', 'to', 'from', 'of', 'for', 'with', 'by', 'under', 'behind', 'next', 'into', 'inside', 'outside', 'between', 'across', 'around', 'over', 'after', 'before', 'beside', 'opposite', 'through', 'up', 'down', 'off', 'about', 'along']);
    const SUBJ = new Set(['i', 'you', 'he', 'she', 'it', 'we', 'they']);
    const PROG = [['i', 'you', 'he', 'she', 'it', 'we', 'they'], ['me', 'you', 'him', 'her', 'it', 'us', 'them'], ['my', 'your', 'his', 'her', 'its', 'our', 'their']];
    const isPro = w => PROG.some(g => g.indexOf(w) >= 0);
    const DETS = new Set(['the', 'a', 'an', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'this', 'that', 'these', 'those']);
    const AUX = { am: 'pres', is: 'pres', are: 'pres', was: 'past', were: 'past', do: 'pres', does: 'pres', did: 'past', have: 'pres', has: 'pres', had: 'past' };
    const AUXG = { am: 'be', is: 'be', are: 'be', was: 'be', were: 'be', do: 'do', does: 'do', did: 'do', have: 'have', has: 'have', had: 'have' };
    const IRB = { went: 'go', gone: 'go', saw: 'see', seen: 'see', ate: 'eat', eaten: 'eat', made: 'make', took: 'take', taken: 'take', came: 'come', got: 'get', sat: 'sit', stood: 'stand', ran: 'run', bought: 'buy', said: 'say', found: 'find', gave: 'give', given: 'give', knew: 'know', known: 'know', thought: 'think', left: 'leave', felt: 'feel', wrote: 'write', written: 'write', rode: 'ride', drove: 'drive', slept: 'sleep', woke: 'wake', met: 'meet', paid: 'pay', wore: 'wear', spoke: 'speak', told: 'tell', done: 'do', brought: 'bring', swam: 'swim', sang: 'sing', drank: 'drink', began: 'begin', lost: 'lose', won: 'win', flew: 'fly', heard: 'hear', sent: 'send', spent: 'spend', taught: 'teach', caught: 'catch', fell: 'fall', grew: 'grow', drew: 'draw', broke: 'break', chose: 'choose', forgot: 'forget', sold: 'sell', kept: 'keep', built: 'build', held: 'hold', became: 'become', hid: 'hide', children: 'child', people: 'person', men: 'man', women: 'woman' };
    const PAST_IRR = new Set(['went', 'saw', 'ate', 'made', 'took', 'came', 'got', 'sat', 'stood', 'ran', 'bought', 'said', 'found', 'gave', 'knew', 'thought', 'left', 'felt', 'wrote', 'rode', 'drove', 'slept', 'woke', 'met', 'paid', 'wore', 'spoke', 'told', 'brought', 'swam', 'sang', 'drank', 'began', 'lost', 'won', 'flew', 'heard', 'sent', 'spent', 'taught', 'caught', 'fell', 'grew', 'drew', 'broke', 'chose', 'forgot', 'sold', 'kept', 'built', 'held', 'became', 'hid']);
    const FUNC = w => ART.has(w) || PREP.has(w) || isPro(w) || !!AUX[w] || /^(not|and|but|so|or|because)$/.test(w);
    function stems(w) {
      const S = new Set([w]); if (IRB[w]) S.add(IRB[w]); if (w.length < 3) return S;
      if (/ies$/.test(w) || /ied$/.test(w)) S.add(w.slice(0, -3) + 'y');
      if (/es$/.test(w)) { S.add(w.slice(0, -2)); S.add(w.slice(0, -1)); } else if (/s$/.test(w) && !/ss$/.test(w)) S.add(w.slice(0, -1));
      if (/ed$/.test(w) && w.length > 3) { const b = w.slice(0, -2); S.add(b); S.add(w.slice(0, -1)); if (/(.)\1$/.test(b)) S.add(b.slice(0, -1)); }
      if (/ing$/.test(w) && w.length > 4) { const b = w.slice(0, -3); S.add(b); S.add(b + 'e'); if (/(.)\1$/.test(b)) S.add(b.slice(0, -1)); }
      return S;
    }
    const sameLemma = (a, b) => { if (a === b || FUNC(a) || FUNC(b)) return false; const A = stems(a), B = stems(b); for (const x of A) if (x.length > 1 && B.has(x)) return true; return false; };
    const form = w => AUX[w] ? (AUX[w] === 'past' ? 'past' : (w === 'is' || w === 'does' || w === 'has' ? 's' : 'base')) : PAST_IRR.has(w) || /ed$/.test(w) ? 'past' : /ing$/.test(w) ? 'ing' : /s$/.test(w) && !/ss$/.test(w) ? 's' : 'base';
    function dl(a, b) { const m = a.length, n = b.length, d = []; for (let i = 0; i <= m; i++) d[i] = [i]; for (let j = 0; j <= n; j++) d[0][j] = j;
      for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) { d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1); }
      return d[m][n]; }
    const spellClose = (s, k) => /^[a-z]+$/.test(s) && /^[a-z]+$/.test(k) && k.length >= 3 && dl(s, k) <= (k.length <= 5 ? 1 : 2);
    function qTense(q) {
      const t = norm(q); if (/\b(yesterday|last|ago)\b/.test(t)) return 'past'; if (/\b(every|usually|always|often|now)\b/.test(t)) return 'pres';
      const aux = t.split(' ').find(w => AUX[w] || w === 'will'); if (!aux) return ''; if (aux === 'will') return 'fut'; return AUX[aux];
    }
    function subjN(orig, t, o) {
      if (t.length <= o) return 0; if (SUBJ.has(t[o])) return 1; if (DETS.has(t[o])) return Math.min(2, t.length - o);
      const w = String(orig).replace(/´/g, "'").replace(/[^\p{L}\p{N}' ]/gu, ' ').trim().split(/\s+/); let k = o + 1; while (k < t.length && w[k] && /^\p{Lu}/u.test(w[k])) k++; return k - o;
    }
    const parts = (orig, t) => { const n0 = t[0] === 'yes' || t[0] === 'no' ? 1 : 0, n = subjN(orig, t, n0); return { n0, n, pol: n0 ? t[0] : '', subj: t.slice(n0, n0 + n).join(' ') }; };
    const namesOf = f => { const S = new Set(); String(f || '').split(/[^\p{L}'´]+/u).filter(Boolean).forEach((w, k) => { if (/^\p{Lu}/u.test(w)) { const n = norm(w); if (n && n.indexOf(' ') < 0 && (k > 0 || !FUNC(n))) S.add(n); } }); return S; };
    function avisosDe(txt, forms, near) {
      const base = warnings(txt, near).filter(w => !/^revisa la tilde/.test(w));
      const acc = []; forms.forEach(f => (String(f).match(/[\p{L}]*[áéíóúñÁÉÍÓÚÑ][\p{L}]*/gu) || []).forEach(w => { if (acc.indexOf(w) < 0) acc.push(w); }));
      String(txt).split(/[^\p{L}'´]+/u).filter(Boolean).forEach(w => { if (/[áéíóúñ]/i.test(w)) return; const A = acc.find(x => deacc(x) === w.toLowerCase()); if (A && base.indexOf('revisa la tilde (' + A + ')') < 0) base.push('revisa la tilde (' + A + ')'); });
      return base;
    }
    function align(s, k) {
      const m = s.length, n = k.length, D = []; for (let i = 0; i <= m; i++) { D[i] = new Array(n + 1).fill(0); D[i][0] = i; } for (let j = 0; j <= n; j++) D[0][j] = j;
      for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (s[i - 1] === k[j - 1] ? 0 : 1));
      const ops = []; let i = m, j = n;
      while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && D[i][j] === D[i - 1][j - 1] + (s[i - 1] === k[j - 1] ? 0 : 1)) { ops.unshift({ t: s[i - 1] === k[j - 1] ? 'eq' : 'sub', s: s[i - 1], k: k[j - 1], si: i - 1, ki: j - 1 }); i--; j--; }
        else if (j > 0 && D[i][j] === D[i][j - 1] + 1) { ops.unshift({ t: 'del', k: k[j - 1], si: i, ki: j - 1 }); j--; }
        else { ops.unshift({ t: 'ins', s: s[i - 1], si: i - 1, ki: j }); i--; }
      }
      return { cost: D[m][n], ops };
    }
    function classify(o, p) {
      if (o.t === 'sub') {
        const s = o.s, k = o.k;
        if (ART.has(s) && ART.has(k)) return 'articulo';
        if (PREP.has(s) && PREP.has(k)) return 'preposicion';
        if (isPro(s) && isPro(k)) return 'pronombre';
        if ((s === 'yes' && k === 'no') || (s === 'no' && k === 'yes')) return 'sentido';
        if (AUX[s] && AUX[k]) return AUXG[s] !== AUXG[k] ? 'forma' : AUX[s] !== AUX[k] ? 'tiempo' : 'concordancia';
        if (sameLemma(s, k)) { const fs = form(s), fk = form(k);
          if ((fs === 'past') !== (fk === 'past')) return 'tiempo';
          if ((fs === 'ing') !== (fk === 'ing')) return 'forma';
          if ((fs === 's') !== (fk === 's')) { const prev = p.t[o.ki - 1]; return (o.ki === p.vIdx || SUBJ.has(prev) || p.names.has(prev)) ? 'concordancia' : 'plural'; }
          return 'forma'; }
        if (spellClose(s, k)) return 'ortografia';
        return null;
      }
      const w = o.t === 'del' ? o.k : o.s;
      if (o.t === 'del' && ((o.ki >= p.n0 && o.ki < p.vIdx && !ART.has(w)) || SUBJ.has(w))) return 'sujeto';
      if (ART.has(w)) return 'articulo'; if (PREP.has(w)) return 'preposicion'; if (w === 'not') return 'sentido'; if (AUX[w]) return 'verbo';
      return null;
    }
    function msg(o, st, qt) {
      const nx = st[o.si] ? '«' + st[o.si] + '»' : 'el final';
      switch (o.cat) {
        case 'articulo': return o.t === 'del' ? 'Falta un artículo (a · an · the) antes de ' + nx + '.' : o.t === 'ins' ? 'Sobra el artículo «' + o.s + '».' : 'Revisa el artículo «' + o.s + '» (a · an · the).';
        case 'preposicion': return o.t === 'del' ? 'Falta una preposición (in · on · at · near…) antes de ' + nx + '.' : o.t === 'ins' ? 'Sobra «' + o.s + '».' : 'Revisa la preposición «' + o.s + '» (in · on · at · near…).';
        case 'pronombre': return 'Revisa el pronombre «' + o.s + '».';
        case 'tiempo': return qt === 'past' ? 'La pregunta está en pasado: revisa el verbo «' + o.s + '».' : qt === 'pres' ? 'La pregunta está en presente: revisa el verbo «' + o.s + '».' : 'Revisa el tiempo del verbo «' + o.s + '».';
        case 'concordancia': return AUX[o.s] ? 'Revisa «' + o.s + '»: no concuerda con el sujeto.' : form(o.k) === 's' ? 'Con he · she · it o un nombre, el verbo lleva -s: revisa «' + o.s + '».' : 'Revisa «' + o.s + '»: aquí el verbo va sin -s.';
        case 'plural': return 'Revisa singular / plural en «' + o.s + '».';
        case 'forma': return 'Revisa la forma del verbo «' + o.s + '».';
        case 'ortografia': return 'Revisa cómo se escribe «' + o.s + '».';
        case 'verbo': return o.t === 'del' ? 'Falta un verbo (is · are · does…).' : 'Sobra «' + o.s + '»: revisa el verbo.';
        case 'sentido': return 'Revisa la historia: tu respuesta dice lo contrario.';
        case 'sujeto': return 'Falta el sujeto (¿quién?).';
        case 'estructura': return 'Responde con una oración completa: quién + verbo + lo demás.';
      }
      return '';
    }
    const sorted = a => a.slice().sort().join(' ');
    const isRot = (a, b) => a.length === b.length && (' ' + b.concat(b).join(' ') + ' ').indexOf(' ' + a.join(' ') + ' ') >= 0;
    function core(txt, forms, q) {
      const st = toks(txt); if (!st.length) return null;
      const P = forms.map(f => { const t = toks(f), z = parts(f, t); return { f, t, n0: z.n0, n: z.n, pol: z.pol, subj: z.subj, vIdx: z.n0 + z.n, names: namesOf(f) }; }).filter(p => p.t.length);
      if (!P.length) return null;
      const qt = qTense(q || ''), same = P.find(p => p.t.join(' ') === st.join(' '));
      if (same) return { cost: 0, near: same.f, st, qt };
      const mov = P.find(p => p.t.length > 2 && sorted(p.t) === sorted(st));
      if (mov) return isRot(st, mov.t) ? { rot: true, near: mov.f, st, qt } : { orden: true, near: mov.f, st, qt };
      const subjects = new Set(P.map(p => p.subj).filter(Boolean)), S = parts(txt, st), cut = S.n0 + S.n;
      let best = null;
      P.forEach(p => {
        let res, pre = [];
        const polOp = S.pol && p.pol && S.pol !== p.pol ? [{ t: 'sub', s: S.pol, k: p.pol, si: 0, ki: 0 }] : [];
        if (S.subj && subjects.has(S.subj) && subjects.has(p.subj)) { res = align(st.slice(cut), p.t.slice(p.vIdx)); res.ops.forEach(o => { o.si += cut; o.ki += p.vIdx; }); pre = polOp; res.cost += polOp.length; }
        else if (S.n === 1 && SUBJ.has(S.subj) && P.some(z => z.n === 1 && SUBJ.has(z.subj))) { const pr = P.find(z => z.n === 1 && SUBJ.has(z.subj)).subj; pre = polOp.concat([{ t: 'sub', s: S.subj, k: pr, si: S.n0, ki: p.n0 }]); res = align(st.slice(cut), p.t.slice(p.vIdx)); res.ops.forEach(o => { o.si += cut; o.ki += p.vIdx; }); res.cost += pre.length; }
        else res = align(st, p.t);
        const diffs = pre.concat(res.ops).filter(o => o.t !== 'eq'); diffs.forEach(o => { o.cat = classify(o, p); });
        /* did + verbo, was waiting / is selling: formas que pueden estar bien → no se adivina, lo ve el teacher */
        diffs.forEach((o, k) => { const nx = diffs[k + 1]; if (o.t === 'ins' && nx && nx.t === 'sub' && sameLemma(nx.s, nx.k) && ((AUXG[o.s] === 'do' && form(nx.s) === 'base') || (AUXG[o.s] === 'be' && form(nx.s) === 'ing'))) { o.cat = null; nx.cat = null; } });
        const unk = diffs.filter(o => !o.cat).length, cand = { p, cost: res.cost, diffs, unk, sc: res.cost + 2 * unk };
        if (!best || cand.sc < best.sc || (cand.sc === best.sc && cand.cost < best.cost)) best = cand;
      });
      if (best.cost === 0) return { cost: 0, near: best.p.f, st, qt };
      let known = best.diffs.filter(o => o.cat); const unk = best.diffs.filter(o => !o.cat);
      if (known.some(o => o.cat === 'sujeto') && known.some(o => o.cat === 'verbo' && o.t === 'del')) known = [{ cat: 'estructura' }].concat(known.filter(o => o.cat !== 'sujeto' && !(o.cat === 'verbo' && o.t === 'del')));
      known.forEach(o => { o.m = msg(o, st, qt); }); const seen = {}; known = known.filter(o => { if (seen[o.m]) return false; seen[o.m] = 1; return true; });
      return { cost: best.cost, near: best.p.f, best, known, unk, L: best.p.t.length, nd: best.diffs.length, st, qt, P, S, subjects };
    }
    const clear = c => !c.unk.length && c.known.length > 0 && c.known.length <= 3 && c.nd <= Math.max(2, Math.ceil(c.L * 0.4));
    function diagnose(txt, forms, q) {
      const c = core(txt, forms, q), none = { msgs: [], cats: [] };
      if (!c || !c.cost || c.rot) return none; if (c.orden) return { msgs: ['Revisa el orden de las palabras.'], cats: ['orden'] };
      return clear(c) ? { msgs: c.known.map(o => o.m), cats: c.known.map(o => o.cat) } : none;
    }
    const ES = new Set(['el', 'la', 'los', 'las', 'una', 'del', 'de', 'que', 'en', 'y', 'es', 'esta', 'son', 'con', 'por', 'para', 'muy', 'su', 'sus', 'mi', 'tu', 'yo', 'ella', 'ellos', 'pero', 'porque', 'vive', 'cerca', 'tiene', 'hay']);
    function grade(it, txt) {
      const forms = [it.key].concat(it.also || [], it.story ? [it.story] : []).map(x => String(x || '').trim()).filter(Boolean);
      if (!forms.length) return { r: 'rev' };
      if (multiSentence(txt) && !forms.some(f => multiSentence(f))) return { r: 'bad', h: 'Escribe UNA sola oración (sin punto en el medio).', near: forms[0] };
      const c = core(txt, forms, it.q); if (!c) return { r: 'rev' };
      if (c.orden) return { r: 'bad', h: 'Revisa el orden de las palabras.', near: c.near };
      if (c.rot) return { r: 'rev', near: c.near };
      if (!c.cost) { const w = avisosDe(txt, forms, c.near); return w.length ? { r: 'okd', d: w.join(' y '), near: c.near } : { r: 'ok', near: c.near }; }
      if (clear(c)) return { r: 'bad', h: c.known.map(o => o.m).join(' '), near: c.near };
      const st = c.st, nES = st.filter(w => ES.has(w)).length;
      if (nES >= 2 && nES / st.length >= 0.3) return { r: 'bad', h: 'Escribe tu respuesta en inglés.', near: c.near };
      const bp = c.best.p, mainV = bp.t[bp.vIdx];
      const hasVerb = st.some(w => AUX[w] || w === mainV || (mainV && sameLemma(w, mainV)));
      const hasSubj = c.subjects.has(c.S.subj) || SUBJ.has(st[c.S.n0]);
      if (!hasSubj && !hasVerb) return { r: 'bad', h: msg({ cat: 'estructura' }, st, c.qt), near: c.near };
      const qt = c.qt, doSup = (qt === 'past' && st.indexOf('did') >= 0) || (qt === 'pres' && (st.indexOf('does') >= 0 || st.indexOf('do') >= 0));
      if (!doSup) for (let si = 0; si < st.length; si++) { const s = st[si]; if (form(s) === 'ing' && AUXG[st[si - 1]] === 'be') continue;
        for (const p of c.P) for (const k of p.t) {
          const rel = sameLemma(s, k) || (AUX[s] && AUX[k] && AUXG[s] === AUXG[k] && s !== k); if (!rel) continue;
          const ps = form(s) === 'past', pk = form(k) === 'past'; if (ps === pk) continue;
          const want = qt === 'past' || qt === 'pres' ? qt : (pk ? 'past' : 'pres');
          if ((want === 'past') === pk) return { r: 'bad', h: msg({ cat: 'tiempo', t: 'sub', s, si }, st, qt), near: p.f };
        } }
      return { r: 'rev', near: c.near };
    }
    return { grade, diagnose, qTense };
  })();
  /* DOCSETS-A2-V1 · una palabra / opción múltiple: Answer + Also; mayúsculas, tildes y espacios no cuentan. Si la escribió en la oración entera, también vale. */
  function gradeWord(set, it, txt) {
    const keys = [it.key].concat(it.also || []).map(x => String(x || '').trim()).filter(Boolean), t = norm(txt);
    const blank = /_{2,}/.test(it.q), fill = w => it.q.replace(/_{2,}/, w);
    const hit = keys.find(k => norm(k) === t) || (blank && set.kind === 'word' ? keys.find(k => norm(fill(k)) === t) : null);
    if (hit) { const d = []; const acc = (hit.match(/[\p{L}]*[áéíóúñÁÉÍÓÚÑ][\p{L}]*/gu) || []).find(w => String(txt).indexOf(w) < 0); if (acc) d.push('revisa la tilde (' + acc + ')'); if (/´/.test(txt)) d.push("usa el botón ' para el apóstrofo"); return d.length ? { r: 'okd', d: d.join(' y ') } : { r: 'ok' }; }
    let h = '';
    if (blank && keys.length && t.split(' ').length <= 3) { const g = SENT.diagnose(fill(String(txt).trim()), keys.map(fill), ''); if (g.msgs.length && g.cats.indexOf('orden') < 0) h = g.msgs.join(' '); }
    if (!h) h = set.kind === 'mcq' ? 'Lee otra vez la oración y busca la respuesta en la historia.' : ((set.bank || []).length ? 'Busca la palabra en el banco de palabras.' : 'No es la palabra que va aquí.');
    if (it.look) h += ' 🔎 Busca en: ' + it.look + '.';
    return { r: 'bad', h, near: keys[0] || '' };
  }
  function grade(set, i, txt) {
    const it = set.items[i]; if (!String(txt || '').trim()) return { r: 'blank' };
    if (set.kind === 'mcq' || set.kind === 'word') return gradeWord(set, it, txt);
    if (set.grade === 'sent') return SENT.grade(it, txt);
    if (set.grade !== 'manual' && multiSentence(txt) && !multiSentence(set.grade === 'rule' ? it.q : it.key))
      return { r: 'bad', h: set.kind === 'combine' ? 'Une las dos en UNA sola oración: sin punto en el medio.' : set.grade === 'rule' ? 'Agrega la información a la MISMA oración (sin punto en el medio).' : 'Escribe UNA sola oración (sin punto en el medio).' };
    if (set.grade === 'rule') {
      const b = words(it.q), a = words(txt), keep = b.every((w, k) => a[k] === w), add = a.length - b.length, extra = a.slice(b.length).join(' ');
      const cue = String(it.cue || '').toLowerCase(); const re = /where/.test(cue) ? PLACE : /when/.test(cue) ? TIME : /how/.test(cue) ? HOW : null;
      if (keep && add >= 1 && re && re.test(extra) && add <= 6) { const w = warnings(txt, it.q); return w.length ? { r: 'okd', d: w.join(' y ') } : { r: 'ok' }; }
      if (keep && add >= 1) return { r: 'rev' };
      return { r: 'bad', h: !keep ? 'Conserva la oración «' + it.q.replace(/[.!?]$/, '') + '» y agrégale información al final.' : 'Agrega información que responda ' + (it.ces || it.cue) + '.' };
    }
    if (set.grade === 'manual') return { r: 'rev' };
    const raw = [it.key].concat(it.also || [], set.kind === 'combine' ? combineAlts(it.q, it.cue) : []).filter(Boolean), keys = raw.map(norm);
    if (keys.includes(norm(txt))) { const w = warnings(txt, it.key); return w.length ? { r: 'okd', d: w.join(' y ') } : { r: 'ok' }; }
    const cw = String(it.cue || '').toLowerCase().split(/\s/)[0];
    if (set.kind === 'combine' && cw && !words(txt).includes(cw)) return { r: 'bad', h: 'Usa la palabra «' + cw + '».' };
    /* DOCSETS-PISTAS-V1 (03-nov, aprobado): pista precisa cuando el error tiene nombre (artículo, verbo, preposición…); la nota NO cambia */
    const dg = SENT.diagnose(txt, raw, '');
    return { r: 'bad', h: dg.msgs.length && dg.cats.indexOf('orden') < 0 ? dg.msgs.join(' ') : hintFor(set, it) };
  }
  /* Corrección que solo SUBE (DOCSETS-FIX-V2): si el corrector mejoró, lo que salió ✘ y ahora vale se corrige.
   * Nunca baja una nota ni toca lo que el teacher decidió a mano (ans.tch). Solo nota exacta (Combine/Change). */
  function upgrade(set, ans) {
    if (!set || (set.grade !== 'exact' && set.grade !== 'sent') || !ans || !Array.isArray(ans.res)) return { ans, changed: 0 };
    const res = ans.res.slice(), fb = (ans.fb || []).slice(), tch = ans.tch || {}; let changed = 0;
    (ans.ans || []).forEach((t, i) => { if (res[i] !== 'bad' || tch[i] || !set.items[i] || !String(t || '').trim()) return;
      const g = grade(set, i, t); if (g.r === 'ok' || g.r === 'okd') { res[i] = g.r; fb[i] = g.d || ''; changed++; } });
    return changed ? { ans: Object.assign({}, ans, { res, fb }), changed } : { ans, changed: 0 };
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
  /* La fila del alumno en la nube (para retomar en otro equipo). undefined = no se pudo consultar · null = no hay. */
  async function fetchMine(aid, sid) {
    const c = SB(); if (!c) return undefined;
    try { const r = await c.from('submissions').select('*').eq('assignment_id', aid).eq('student_id', sid).limit(1); if (r.error) return undefined; return (r.data && r.data[0]) || null; } catch (e) { return undefined; }
  }
  /* Guarda en la nube la corrección que sube (la llama el panel del teacher al abrir Resultados). */
  async function persistUpgrade(a, set, row, notify) {
    const z = unpack(row && row.text); if (!z) return null; const u = upgrade(set, z); if (!u.changed) return null;
    const c = SB(); if (!c) return null; const draft = row.status === 'draft', ans = u.ans;
    let patchRow;
    if (draft) patchRow = { text: packAns(ans) };
    else { ans.grade = score(set, ans.res); patchRow = { text: packAns(ans), grade: ans.grade, feedback: 'Revisamos tus respuestas: ' + u.changed + ' estaba' + (u.changed > 1 ? 'n' : '') + ' bien. Tu nota es ' + ans.grade + '/100.', graded_at: new Date().toISOString() }; }
    try { const r = await c.from('submissions').update(patchRow).eq('id', row.id); if (r.error) return null; } catch (e) { return null; }
    if (!draft) {
      try { const k = 'jucum_submissions_v1'; const subs = JSON.parse(localStorage.getItem(k) || '{}'); const cur = (subs[a.id] || {})[row.student_id]; if (cur) { subs[a.id][row.student_id] = Object.assign({}, cur, { text: patchRow.text, grade: patchRow.grade, feedback: patchRow.feedback, gradedAt: patchRow.graded_at }); localStorage.setItem(k, JSON.stringify(subs)); } } catch (e) {}
      if (notify && window.JUCUM_NOTIF) { try { window.JUCUM_NOTIF.pushNotif(row.student_id, { type: 'assignment', title: '✅ Revisamos tus respuestas', body: '“' + a.title + '”: ' + u.changed + ' respuesta' + (u.changed > 1 ? 's estaban' : ' estaba') + ' bien. Tu nota ahora es ' + ans.grade + '/100.', link: 'tasks' }); } catch (e) {} }
    }
    return Object.assign({}, row, patchRow);
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
    const ans = unpack(row && row.text) || { ans: [], res: [] }; ans.res = ans.res || []; ans.res[i] = r; ans.tch = Object.assign({}, ans.tch || {}, { [i]: r }); ans.grade = score(set, ans.res);
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

  /* ── Dentro del plan del día (pedido 22-oct, DOCSETS-FIX-V2): el set 🏫 entra a la lista de actividades de ese día
   * y se reordena con ▲▼. ds.after = id del bloque del plan tras el que va ('__start' = antes del primero; sin valor
   * = al final) · ds.ord = orden entre sets del mismo hueco. ── */
  function classDays(gid) { const T = window.JUCUM_TASKS, o = {}; if (!T) return o; T.getAssignments().forEach(a => { if (a.groupId !== gid) return; const m = meta(a); if (m && m.mode === 'class' && m.planDate) (o[m.planDate] = o[m.planDate] || []).push(a); }); return o; }
  function classForDay(gid, date) { return classDays(gid)[date] || []; }
  function seq(blocks, list) {
    const B = blocks || [], ids = B.map(b => b.id);
    const slot = a => { const af = (meta(a) || {}).after; return af === '__start' ? -1 : (ids.indexOf(af) >= 0 ? ids.indexOf(af) : ids.length - 1); };
    const sets = (list || []).slice().sort((p, q) => slot(p) - slot(q) || (+(meta(p) || {}).ord || 0) - (+(meta(q) || {}).ord || 0) || String((meta(p) || {}).step).localeCompare(String((meta(q) || {}).step), undefined, { numeric: true }) || String(p.title).localeCompare(String(q.title)));
    const out = [], put = k => sets.forEach(a => { if (slot(a) === k) out.push({ t: 's', a }); });
    put(-1); B.forEach((b, k) => { out.push({ t: 'b', b }); put(k); });
    return out;
  }
  /* ▲▼: mueve un set un lugar (salta bloques u otros sets) y devuelve [{a, after, ord}] de los que cambian. */
  function reorder(blocks, list, aid, dir) {
    const s = seq(blocks, list), k = s.findIndex(o => o.t === 's' && o.a.id === aid), j = k + dir; if (k < 0 || j < 0 || j >= s.length) return [];
    const t = s[k]; s[k] = s[j]; s[j] = t;
    let last = '__start', n = 0; const out = [];
    s.forEach(o => { if (o.t === 'b') { last = o.b.id; return; } const m = meta(o.a) || {}; n++; if (m.after !== last || +m.ord !== n) out.push({ a: o.a, after: last, ord: n }); });
    return out;
  }

  window.JUCUM_DOCSETS = { setLabel, sent: SENT, detect, merge, propose, meta, isDocset, isClass, describe, liveState, grade, score, nRev, warnings, norm, packAns, unpack, fetchSubs, fetchMine, fetchGroupTasks, saveDraft, finalize, setItemResult, closeDrafts, patch, notifyGroup, trUrl, cueEs, combineAlts, multiSentence, upgrade, persistUpgrade, classDays, classForDay, seq, reorder };
})();
