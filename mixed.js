/* mixed.js · SESION-MIXTA-V1 · 14-oct-2026 — "Conexiones de Neuro" (Parte 1 · Pre-A1)
 * ─────────────────────────────────────────────────────────────────────────────
 * window.JUCUM_MIX = motor de la SESIÓN MIXTA de "Mi práctica":
 *  · LECTOR: lee (solo lectura) las preguntas que YA viven dentro de cada material
 *    en GitHub Pages — Fill in (`const QS = [...]`) e Identification
 *    (`const quizData = [...]`) y Transform (`const QS = [...]` con answer/distractors ·
 *    MIX-TRANSFORM-V1, 15-oct), Comprensión lectora y auditiva (`const STORIES = {…}` ·
 *    MIX-RL-V1, 15-oct). Los materiales NO se modifican. Si un material no
 *    se puede leer, simplemente se abre como siempre.
 *  · SESIÓN: 12 ejercicios mezclados de varios materiales (2–4 de cada uno, máx. 6
 *    materiales), azar criptográfico, opciones reordenadas en cada aparición, la
 *    correcta repartida por igual entre A/B/C y NUNCA 3 seguidas iguales (posición,
 *    respuesta, material ni respuesta dentro de un material).
 *  · CAJA DE ERRORES: lo fallado se guarda y vuelve 2 h después (NEURO-FIX-V1 · script 38:
 *    también 2 h si vuelve a fallar). La hora la pone el SERVIDOR (trigger + mix_box_ready).
 *  · NEURO-FIX-V1 (26-oct-2026, caso Rafaela): la caja junta errores de CUALQUIER día
 *    (`pullBox` + `boxMaterials`), ▶ Empezar mete hasta 3 errores listos por ronda, la
 *    lectura/listening usa solo la historia del set (`storyNo`) y la vista previa LEE la nube.
 *  · GUARDADO: local al instante (clave HEAVY → IndexedDB vía JUCUM_BIG) + bandeja
 *    de salida con versión por pregunta → upsert idempotente a `practice_items`.
 *    Un acierto nunca vuelve atrás (lo garantiza también la base de datos).
 *  · NOTA: cuando un material llega al 100 %, se registra UNA vez con
 *    markActivityComplete (nota = % acertado a la primera).
 * Reglas de la casa: nunca localStorage['…'] directo, todo con try/catch. */
(function () {
  'use strict';
  if (window.JUCUM_MIX) return;

  var CFG = { levels: { 'pre-a1': 1 }, size: 12, minPer: 2, maxPer: 4, maxMats: 6,
    boxMs: 2 * 3600e3, retryMs: 2 * 3600e3, cacheMs: 6 * 3600e3, secPerQ: 35, maxSecQ: 90, boxInMix: 3, boxMax: 10, xpOk: 2, xpTry: 1, xpExtra: 1, xpDayCap: 80, maxExtras: 4 };
  var STATE_KEY = 'jucum_mix_v1';        // HEAVY (config.js)
  var CACHE_KEY = 'jucum_mix_cache_v1';  // HEAVY (config.js)
  var HOST = /^https:\/\/jucumenglishcenter\.github\.io\//i;

  /* ── adaptador (los tests de auditoría lo reemplazan) ───────────────────── */
  var AD = {
    read: function (k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
    write: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    client: function () { try { return window.JUCUM_SB && window.JUCUM_SB.getClient ? window.JUCUM_SB.getClient() : null; } catch (e) { return null; } },
    now: function () { return Date.now(); },
    fetch: function (u) { return fetch(u, { cache: 'no-cache' }); }
  };

  /* ── utilidades ─────────────────────────────────────────────────────────── */
  function rnd() { try { return crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296; } catch (e) { return Math.random(); } }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function hash(s) { var h = 0x811c9dc5; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); }
  function pickLang(x) { return x == null ? '' : (typeof x === 'string' ? x : (x.es || x.en || '')); }
  function plain(h) { return String(h || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); }
  function isPreview(uid) { return /^preview-/.test(String(uid)) || !!(window.JUCUM_PV_EMBED && window.JUCUM_PV_EMBED.user && window.JUCUM_PV_EMBED.user()); }
  function peruDay(t) { return new Date((t == null ? AD.now() : t) - 5 * 3600e3).toISOString().slice(0, 10); }

  /* ── LECTOR de materiales ───────────────────────────────────────────────── */
  function kindOf(url) {
    if (!HOST.test(String(url || ''))) return null;
    if (/\/fill\.html(\?|#|$)/i.test(url)) return 'fill';
    if (/\/identify\.html(\?|#|$)/i.test(url)) return 'identify';
    if (/\/transform\.html(\?|#|$)/i.test(url)) return 'transform';
    if (/\/m\d+\/reading\.html(\?|#|$)/i.test(url)) return 'read';
    if (/\/m\d+\/listening\.html(\?|#|$)/i.test(url)) return 'listen';
    return null;
  }
  function extractArray(html, name, open) {
    open = open || '[';
    var m = new RegExp('(?:const|var|let)\\s+' + name + '\\s*=\\s*\\' + open).exec(html);
    if (!m) return null;
    var s = html.indexOf(open, m.index), d = 0, q = null, esc = false;
    for (var k = s; k < html.length; k++) {
      var c = html[k];
      if (q) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === q) q = null; continue; }
      if (c === '"' || c === "'" || c === '`') { q = c; continue; }
      if (c === '[' || c === '{') d++;
      else if (c === ']' || c === '}') { d--; if (d === 0) return html.slice(s, k + 1); }
    }
    return null;
  }
  function parseArr(src) {
    if (!src) return null;
    try { return JSON.parse(src); } catch (e) {}
    try { return (new Function('"use strict";return (' + src + ');'))(); } catch (e2) { return null; } // solo materiales de jucumenglishcenter.github.io
  }
  function normFill(arr, warn) {
    var out = [], seen = {};
    (Array.isArray(arr) ? arr : []).forEach(function (q, i) {
      var opts = (q && q.opts || []).map(function (x) { return String(x); }), cor = String(q && q.correct || '');
      var why = [];
      if (!q || !q.sentence || q.sentence.indexOf('_') < 0) why.push('sin oración con espacio');
      if (opts.length < 2) why.push('menos de 2 opciones');
      if (opts.indexOf(cor) < 0) why.push('la correcta «' + cor + '» no está entre las opciones');
      if (opts.length !== Object.keys(opts.reduce(function (o, x) { o[x.toLowerCase()] = 1; return o; }, {})).length) why.push('opciones repetidas');
      if (why.length) { warn.push('Pregunta ' + (i + 1) + ': ' + why.join(', ')); return; }
      var id = hash('f|' + q.sentence + '|' + cor);
      if (seen[id]) { warn.push('Pregunta ' + (i + 1) + ': repetida'); return; } seen[id] = 1;
      if (!pickLang(q.storyWhy) && !pickLang(q.rule)) warn.push('Pregunta ' + (i + 1) + ': sin explicación (storyWhy/rule)');
      out.push({ id: id, kind: 'fill', n: i + 1, sentence: q.sentence, opts: opts, correct: cor, tr: q.tr || '', hint: q.hint || '',
        story: q.story || '', why: pickLang(q.storyWhy), rule: pickLang(q.rule), es: pickLang(q.es), lit: pickLang(q.lit), tag: pickLang(q.reinf), clue: q.clue || '' });
    });
    return out;
  }
  function normIdent(arr, warn) {
    var out = [], seen = {};
    (Array.isArray(arr) ? arr : []).forEach(function (q, i) {
      var os = (q && q.options || []).filter(function (o) { return o && o.text; });
      var cor = os.filter(function (o) { return o.correct === true; });
      var why = [];
      if (os.length < 2) why.push('menos de 2 opciones');
      if (cor.length !== 1) why.push(cor.length ? 'más de una correcta' : 'sin opción correcta');
      var texts = os.map(function (o) { return String(o.text); });
      if (texts.length !== Object.keys(texts.reduce(function (o, x) { o[x.toLowerCase()] = 1; return o; }, {})).length) why.push('opciones repetidas');
      if (why.length) { warn.push('Pregunta ' + (i + 1) + ': ' + why.join(', ')); return; }
      var info = {};
      os.forEach(function (o) { info[String(o.text)] = { es: o.es || '', errorWord: o.errorWord || '', correctWord: o.correctWord || '', errorType: o.errorType || '', explanation: o.explanation || '' }; });
      os.forEach(function (o, k) { if (!o.correct && !o.explanation) warn.push('Pregunta ' + (i + 1) + ': opción ' + (k + 1) + ' sin explicación'); });
      var ctext = String(cor[0].text), id = hash('i|' + ctext);
      if (seen[id]) { warn.push('Pregunta ' + (i + 1) + ': repetida'); return; } seen[id] = 1;
      out.push({ id: id, kind: 'identify', n: i + 1, opts: texts, correct: ctext, badge: q.badge || '', info: info });
    });
    return out;
  }
  /* 🔄 Transform: armar la oración con fichas (answer + distractors). Se acepta como correcta
   * CUALQUIER orden cuyo TEXTO sea igual a la respuesta (fichas repetidas son intercambiables)
   * y, si el material algún día trae `alts` / `answers` (listas de fichas), también esas. */
  function normTrans(arr, warn) {
    var out = [], seen = {};
    (Array.isArray(arr) ? arr : []).forEach(function (q, i) {
      var ans = (q && Array.isArray(q.answer) ? q.answer : []).map(function (x) { return String(x); });
      var dis = (q && Array.isArray(q.distractors) ? q.distractors : []).map(function (x) { return String(x); });
      var alts = [].concat(q && Array.isArray(q.alts) ? q.alts : [], q && Array.isArray(q.answers) ? q.answers : []).filter(Array.isArray).map(function (a) { return a.map(String); });
      var why = [];
      if (!q || !q.src) why.push('sin oración de partida');
      if (ans.length < 2 || ans.some(function (w) { return !w.trim(); })) why.push('respuesta vacía o de una sola ficha');
      if (why.length) { warn.push('Pregunta ' + (i + 1) + ': ' + why.join(', ')); return; }
      var tiles = ans.concat(dis), cnt = {};
      tiles.forEach(function (w) { cnt[w] = (cnt[w] || 0) + 1; });
      alts = alts.filter(function (a) { var c = {}; a.forEach(function (w) { c[w] = (c[w] || 0) + 1; }); return a.length && Object.keys(c).every(function (w) { return (cnt[w] || 0) >= c[w]; }); });
      var id = hash('t|' + q.src + '|' + ans.join(' '));
      if (seen[id]) { warn.push('Pregunta ' + (i + 1) + ': repetida'); return; } seen[id] = 1;
      if (!pickLang(q.change) && !pickLang(q.rule)) warn.push('Pregunta ' + (i + 1) + ': sin explicación (change/rule)');
      var ex = q.examples ? (Array.isArray(q.examples) ? q.examples : (q.examples.es || q.examples.en || [])) : [];
      out.push({ id: id, kind: 'transform', n: i + 1, src: String(q.src), task: pickLang(q.task), answer: ans, alts: alts, tiles: tiles, opts: [], correct: ans.join(' '),
        tr: pickLang(q.tr), hint: pickLang(q.hint), story: q.story && q.story.q ? { q: String(q.story.q), es: String(q.story.es || '') } : null,
        change: pickLang(q.change), formula: pickLang(q.formula), rule: pickLang(q.rule), examples: (Array.isArray(ex) ? ex : []).map(String), es: pickLang(q.es), lit: pickLang(q.lit), tag: pickLang(q.reinf) });
    });
    return out;
  }
  /* 📖🎧 Comprensión lectora / auditiva (MIX-RL-V1, 15-oct): `const STORIES = {n:{title, paras|items, qs}}`.
   * Solo las preguntas que CUENTAN para la nota (1..SCORED de cada historia). Pregunta y opciones en
   * español (modo Pre-A1 del material) con el inglés guardado para la retroalimentación. Lectora: se
   * muestran el párrafo con la prueba + uno vecino. Auditiva: la oración se escucha (voz del navegador). */
  function rlOpts(q, i, warn) {
    var en = (q.opts || []).map(String), es = (Array.isArray(q.oes) && q.oes.length === en.length) ? q.oes.map(String) : null;
    var ci = typeof q.correct === 'number' ? q.correct : en.indexOf(String(q.correct));
    var why = [];
    if (en.length < 2) why.push('menos de 2 opciones');
    if (!(ci >= 0 && ci < en.length)) why.push('sin respuesta correcta válida');
    var show = es && Object.keys(es.reduce(function (o, x) { o[x.toLowerCase()] = 1; return o; }, {})).length === es.length ? es : en;
    if (Object.keys(show.reduce(function (o, x) { o[x.toLowerCase()] = 1; return o; }, {})).length !== show.length) why.push('opciones repetidas');
    if (why.length) { warn.push('Pregunta ' + i + ': ' + why.join(', ')); return null; }
    var map = {}; show.forEach(function (o, k) { map[o] = en[k]; });
    return { opts: show, correct: show[ci], correctEn: en[ci], en: map };
  }
  function normRL(stories, kind, scored, warn) {
    var out = [], seen = {}, keys = Object.keys(stories || {}).sort(function (a, b) { return (+a || 0) - (+b || 0); });
    keys.forEach(function (sk) {
      var S = stories[sk] || {}, list = kind === 'read' ? (S.qs || []) : (S.items || []), paras = S.paras || [];
      list.slice(0, scored).forEach(function (q, j) {
        var tag = 'Historia ' + sk + ' · pregunta ' + (j + 1), o = rlOpts(q || {}, tag, warn); if (!o) return;
        var qes = String(q.qes || q.q || ''), qen = String(q.q || '');
        if (!qes) { warn.push(tag + ': sin pregunta'); return; }
        var id = hash((kind === 'read' ? 'r|' : 'l|') + sk + '|' + qen + '|' + o.correctEn);
        if (seen[id]) { warn.push(tag + ': repetida'); return; } seen[id] = 1;
        var it = { id: id, kind: kind, n: out.length + 1, storyN: sk, storyTitle: String(S.title || ''), q: qes, qEn: qen, opts: o.opts, correct: o.correct, correctEn: o.correctEn, optEn: o.en,
          skill: pickLang(q.skill), tip: pickLang(q.tip), tag: pickLang(q.reinf) };
        if (kind === 'listen') {
          if (!q.audio) { warn.push(tag + ': sin audio'); return; }
          it.audio = String(q.audio); it.audioEs = String(q.es || ''); it.heard = String(q.heard || ''); it.note = pickLang(q.note);
        } else {
          var proof = String(q.proof || ''), pi = -1, low = proof.toLowerCase().replace(/[.!?]+$/, '');
          if (low) for (var k = 0; k < paras.length; k++) if (String(paras[k].en || '').toLowerCase().indexOf(low) >= 0) { pi = k; break; }
          if (pi < 0) warn.push(tag + ': la prueba no aparece en el texto (se muestra el inicio)');
          var a = pi < 0 ? 0 : pi, b = a + 1 < paras.length ? a + 1 : a - 1, ix = [a, b].filter(function (x) { return x >= 0 && x < paras.length; }).sort(function (x, y) { return x - y; });
          it.paras = ix.filter(function (x, z) { return ix.indexOf(x) === z; }).map(function (x) { return { en: String(paras[x].en || ''), es: String(paras[x].es || '') }; });
          it.proof = proof; it.qtype = String(q.type || '');
          var sents = [], pIdx = -1; it.paras.forEach(function (pp) { (String(pp.en).match(/[^.!?]+[.!?]+["”’]?|[^.!?]+$/g) || []).forEach(function (x) { x = x.trim(); if (!x) return; if (pIdx < 0 && low && x.toLowerCase().replace(/[.!?"”’]+$/, '').indexOf(low) >= 0) pIdx = sents.length; sents.push(x); }); });
          if (pIdx >= 0 && sents.length >= 3) { it.sents = sents; it.proofIdx = pIdx; }
        }
        out.push(it);
      });
    });
    return out;
  }
  function transNorm(a) { return (Array.isArray(a) ? a : String(a || '').split(' ')).map(String).join(' ').replace(/\s+/g, ' ').trim(); }
  function transOk(q, chosen) { var s = transNorm(chosen); if (!s) return false; return [q.answer].concat(q.alts || []).some(function (a) { return transNorm(a) === s; }); }
  function bankOrder(q) { // fichas en orden aleatorio, nunca dejando la respuesta ya armada al inicio
    var idx = q.tiles.map(function (w, i) { return i; }), want = transNorm(q.answer);
    for (var t = 0; t < 20; t++) { shuffle(idx); if (transNorm(idx.slice(0, q.answer.length).map(function (i) { return q.tiles[i]; })) !== want) break; }
    return idx.slice();
  }
  function parseHtml(html, kind) {
    if (kind === 'read' || kind === 'listen') {
      var w0 = [], st = parseArr(extractArray(html, 'STORIES', '{'));
      if (!st) return { items: [], warn: ['No se encontraron las historias dentro del material'] };
      var sm = /const\s+SCORED\s*=\s*(\d+)/.exec(html), sc = sm ? +sm[1] : 7;
      var its = normRL(st, kind, sc, w0);
      return { items: its, warn: w0, raw: its.length };
    }
    var warn = [], arr = parseArr(extractArray(html, kind === 'identify' ? 'quizData' : 'QS'));
    if (!arr) return { items: [], warn: ['No se encontraron las preguntas dentro del material'] };
    var items = kind === 'fill' ? normFill(arr, warn) : kind === 'transform' ? normTrans(arr, warn) : normIdent(arr, warn);
    return { items: items, warn: warn, raw: arr.length };
  }
  /* 📚🗣🧱 FASE 2 · EXTRAS (NEURO-FIX-V2, 26-oct): el Resumen (STEPS[].checks) y la Story (GLOSS +
   * STORYDATA) también entrenan dentro de la ronda. NO cuentan para ninguna nota ni para el 100 % de
   * una neurona: solo variedad + práctica. Se recuerdan en el equipo (u.xs) para no repetir. */
  function extraKindOf(url) { if (!HOST.test(String(url || ''))) return null; if (/\/gramatica\/[^/]+\.html(\?|#|$)/i.test(url)) return 'sum'; if (/\/m\d+\/story\.html(\?|#|$)/i.test(url)) return 'story'; return null; }
  function tokens(s) { return String(s || '').replace(/[.,!?;:"“”‘’()]/g, ' ').split(/\s+/).filter(Boolean); }
  function parseExtra(html, kind) {
    var out = [];
    if (kind === 'sum') {
      var st = parseArr(extractArray(html, 'STEPS')); if (!Array.isArray(st)) return out;
      st.forEach(function (S, si) { (S && S.checks || []).forEach(function (c, ci) {
        var os = c && c.opts ? (Array.isArray(c.opts) ? c.opts : (c.opts.es || c.opts.en || [])) : [];
        if (os.length < 2 || !(c.correct >= 0 && c.correct < os.length)) return;
        var qt = pickLang(c.q); if (!qt) return; os = os.map(String);
        if (Object.keys(os.reduce(function (o, x) { o[x.toLowerCase()] = 1; return o; }, {})).length !== os.length) return;
        out.push({ id: hash('s|' + qt + '|' + os[c.correct]), kind: 'sum', extra: true, q: qt, opts: os, correct: os[c.correct], why: pickLang(c.fb && c.fb.why), tip: pickLang(c.fb && c.fb.tip), step: si + 1 });
      }); });
      return out;
    }
    var G = parseArr(extractArray(html, 'GLOSS')), words = [];
    (Array.isArray(G) ? G : []).forEach(function (g) { var w = String(g && g.w || '').trim(); if (/^[A-Za-z']+$/.test(w)) words.push(w); });
    (Array.isArray(G) ? G : []).forEach(function (g) {
      var w = String(g && g.w || '').trim(), ex = String(g && g.ex || '');
      if (!/^[A-Za-z']+$/.test(w) || !ex) return; var re = new RegExp('\\b' + w + '\\b', 'i'); if (!re.test(ex)) return;
      var alt = words.filter(function (x) { return x.toLowerCase() !== w.toLowerCase() && !new RegExp('\\b' + x + '\\b', 'i').test(ex); });
      if (alt.length < 2) return;
      out.push({ id: hash('v|' + w + '|' + ex), kind: 'vocab', extra: true, word: w, ex: ex, es: String(g.es || ''), alt: alt, opts: [w], correct: w });
    });
    var SD = parseArr(extractArray(html, 'STORYDATA', '{'));
    if (SD && typeof SD === 'object') Object.keys(SD).forEach(function (k) {
      ((SD[k] || {}).paras || []).forEach(function (p) { (Array.isArray(p) ? p : []).forEach(function (pair) {
        if (!Array.isArray(pair) || pair.length < 2) return; var en = String(pair[0] || ''), es = String(pair[1] || ''); if (/["“”]/.test(en)) return;
        var tk = tokens(en); if (tk.length < 3 || tk.length > 7) return;
        var dis = shuffle(words.filter(function (x) { return tk.map(function (t) { return t.toLowerCase(); }).indexOf(x.toLowerCase()) < 0; })).slice(0, 2);
        if (dis.length < 2) return;
        out.push({ id: hash('t|' + en), kind: 'stiles', extra: true, src: es, en: en, answer: tk, alts: [], tiles: tk.concat(dis), opts: [], correct: tk.join(' ') });
      }); });
    });
    return out;
  }
  var xmem = {};
  function loadExtra(url) {
    var kind = extraKindOf(url); if (!kind) return Promise.resolve({ ok: false, items: [] });
    if (xmem[url] && AD.now() - xmem[url].at < CFG.cacheMs) return Promise.resolve(xmem[url].res);
    return AD.fetch(url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); }).then(function (html) {
      var items = parseExtra(html, kind), res = { ok: items.length > 0, kind: kind, items: items }; xmem[url] = { at: AD.now(), res: res }; return res;
    }).catch(function () { return { ok: false, items: [] }; });
  }
  /* Extras del día: resúmenes de los temas del set + la Story del módulo de las prácticas del set. */
  function extraMaterials(student) {
    var D = window.JUCUM_DATA, TT = window.JUCUM_TT; if (!D || !TT || !student) return Promise.resolve([]);
    var items = []; try { items = TT.getTodayPracticeForStudent(student).items || []; } catch (e) {}
    var mods = D.MODULE_CATALOG[student.level] || [], want = {}, list = [];
    items.forEach(function (it) {
      var mod = mods.filter(function (m) { return m.id === it.moduleId; })[0]; if (!mod) return;
      var a = (mod.activities || []).filter(function (x) { return x.id === it.activityId; })[0]; if (!a) return;
      var add = function (x) { var k = mod.id + ':' + x.id; if (want[k] || !extraKindOf(x.url)) return; want[k] = 1; list.push({ key: 'x:' + k, moduleId: mod.id, activityId: x.id, url: x.url, xkind: extraKindOf(x.url), name: x.type === 'summary' ? '📚 ' + x.name : '🗣 Vocabulario · ' + mod.name, short: x.type === 'summary' ? 'Resumen' : 'Vocabulario', extra: true, noProg: true }); };
      if (a.type === 'summary') add(a);
      if (a.group) (mod.activities || []).forEach(function (x) { if (x.type === 'summary' && x.group === a.group) add(x); });
      (mod.activities || []).forEach(function (x) { if (x.type === 'story') add(x); });
    });
    return Promise.all(list.map(function (m) { return loadExtra(m.url).then(function (r) { m.ok = r.ok; m.all = r.items || []; m.items = []; return m; }); }))
      .then(function (ms) { return ms.filter(function (m) { return m.ok; }); });
  }
  var mem = {};
  function loadMaterial(url) {
    var kind = kindOf(url);
    if (!kind) return Promise.resolve({ ok: false, err: 'tipo no soportado' });
    var t = AD.now();
    if (mem[url] && t - mem[url].at < CFG.cacheMs) return Promise.resolve(mem[url].res);
    var cache = AD.read(CACHE_KEY) || {}, c = cache[url];
    var net = AD.fetch(url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); }).then(function (html) {
      var p = parseHtml(html, kind), res = { ok: p.items.length > 0, kind: kind, items: p.items, warn: p.warn, raw: p.raw, err: p.items.length ? null : 'sin preguntas válidas' };
      mem[url] = { at: AD.now(), res: res };
      if (res.ok) { var cc = AD.read(CACHE_KEY) || {}; cc[url] = { at: AD.now(), kind: kind, items: p.items }; var ks = Object.keys(cc); if (ks.length > 80) ks.sort(function (a, b) { return cc[a].at - cc[b].at; }).slice(0, ks.length - 80).forEach(function (k) { delete cc[k]; }); AD.write(CACHE_KEY, cc); }
      return res;
    });
    if (c && t - c.at < CFG.cacheMs) { net.catch(function () {}); return Promise.resolve({ ok: true, kind: c.kind, items: c.items, warn: [], cached: true }); }
    return net.catch(function (e) { if (c) return { ok: true, kind: c.kind, items: c.items, warn: [], cached: true, stale: true }; return { ok: false, err: String(e && e.message || e) }; });
  }

  /* ── ESTADO local por alumno ────────────────────────────────────────────── */
  function getU(uid) { var all = AD.read(STATE_KEY) || {}; var u = all[uid] || {}; u.m = u.m || {}; u.out = u.out || {}; u.g = u.g || {}; u.sec = u.sec || {}; u.v = u.v || 0; return u; }
  function putU(uid, u) { var all = AD.read(STATE_KEY) || {}; all[uid] = u; return AD.write(STATE_KEY, all); }
  function rec(u, mk, id) { return (u.m[mk] || {})[id] || null; }
  function setRec(u, mk, id, r) { (u.m[mk] = u.m[mk] || {})[id] = r; u.v++; u.out[mk + '|' + id] = u.v; }
  function merge(a, b) { // a = local, b = otra copia (nube); ok gana · first inmutable · attempts máx
    if (!a) return b; if (!b) return a;
    var ok = a.s === 'ok' || b.s === 'ok';
    return { s: ok ? 'ok' : (a.s || b.s), f: a.f != null ? a.f : b.f, a: Math.max(a.a || 0, b.a || 0), r: Math.max(a.r || 0, b.r || 0), due: ok ? 0 : (b.due || a.due || 0), at: Math.max(a.at || 0, b.at || 0), fa: a.fa != null ? a.fa : b.fa, la: a.la != null ? a.la : b.la };
  }
  function matProgress(uid, mat) {
    var u = getU(uid), ok = 0, box = 0, first = 0, ans = 0, boxAll = 0, t = AD.now(), ready = 0, next = 0;
    (mat.items || []).forEach(function (it) { var r = rec(u, mat.key, it.id); if (!r) return; ans++; if (r.s === 'ok') ok++; else if (r.s === 'box') box++; if (r.f === true) first++; });
    (mat.all || mat.items || []).forEach(function (it) { var r = rec(u, mat.key, it.id); if (!r || r.s !== 'box') return; boxAll++; if ((r.due || 0) <= t) ready++; else next = next ? Math.min(next, r.due) : r.due; });
    var total = (mat.items || []).length;
    return { total: total, ok: ok, box: box, answered: ans, pending: total - ans, pct: total ? Math.round(ok / total * 100) : 0, firstPct: total ? Math.round(first / total * 100) : 0, graded: u.g[mat.key] != null ? u.g[mat.key] : null,
      boxAll: boxAll, boxReady: ready, boxNext: next };
  }
  function poolOf(m) { return m.all || m.items || []; } // todas las preguntas cargadas (la caja puede traer de otra historia)

  /* ── SESIÓN: armado + aleatorización ────────────────────────────────────── */
  function ansKey(x) { return x.mat + '#' + String(x.q.correct).toLowerCase(); }
  function ansKeyText(x) { return String(x.q.correct).toLowerCase(); }
  function okNext(out, x) {
    var L = out.length, kx = ansKeyText(x);
    if (L >= 2) { var a = out[L - 1], b = out[L - 2];
      if (a.mat === x.mat && b.mat === x.mat) return false;
      if (ansKeyText(a) === kx && ansKeyText(b) === kx) return false; }
    var same = out.filter(function (y) { return y.mat === x.mat; });
    if (same.length >= 2 && ansKeyText(same[same.length - 1]) === kx && ansKeyText(same[same.length - 2]) === kx) return false;
    return true;
  }
  function runs(arr) { var mx = arr.length ? 1 : 0, c = 1; for (var i = 1; i < arr.length; i++) { c = arr[i] === arr[i - 1] ? c + 1 : 1; if (c > mx) mx = c; } return mx; }
  function arrangeOnce(items) {
    var best = null;
    for (var a = 0; a < 400 && !best; a++) {
      var pool = shuffle(items.slice()), out = [], fail = false;
      while (pool.length) { var c = pool.filter(function (x) { return okNext(out, x); }); if (!c.length) { fail = true; break; } var x = c[Math.floor(rnd() * c.length)]; out.push(x); pool.splice(pool.indexOf(x), 1); }
      if (!fail) best = out;
    }
    if (!best) best = shuffle(items.slice());
    var bags = {};
    best.forEach(function (it) { if (it.q.tiles) return; var n = it.q.opts.length; bags[n] = (bags[n] || 0) + 1; });
    Object.keys(bags).forEach(function (n) { var c = bags[n], off = Math.floor(rnd() * n), b = []; for (var i = 0; i < c; i++) b.push((i + off) % n); bags[n] = shuffle(b); });
    var pos = [];
    best.forEach(function (it, k) {
      if (it.q.tiles) { pos.push(null); return; }
      var n = it.q.opts.length, bag = bags[n], forb = {}, pp = pos.filter(function (x) { return x != null; });
      if (pp.length >= 2 && pp[pp.length - 1] === pp[pp.length - 2]) forb[pp[pp.length - 1]] = 1;
      var idx = -1; for (var i = 0; i < bag.length; i++) if (!forb[bag[i]]) { idx = i; break; }
      var p = bag.length ? bag.splice(idx < 0 ? 0 : idx, 1)[0] : Math.floor(rnd() * n);
      if (forb[p]) { var alt = []; for (var q = 0; q < n; q++) if (!forb[q]) alt.push(q); if (alt.length) p = alt[Math.floor(rnd() * alt.length)]; }
      pos.push(p);
    });
    return best.map(function (it, k) {
      if (it.q.tiles) return { mat: it.mat, id: it.q.id, q: it.q, opts: null, ans: null, bank: bankOrder(it.q), fromBox: !!it.fromBox, noXp: !!it.noXp, pres: 'tiles' };
      var cor = it.q.correct, dis = shuffle(it.q.opts.filter(function (o) { return o !== cor; })), opts = [], di = 0;
      for (var p = 0; p < it.q.opts.length; p++) opts.push(p === pos[k] ? cor : dis[di++]);
      var st = { mat: it.mat, id: it.q.id, q: it.q, opts: opts, ans: pos[k], fromBox: !!it.fromBox, noXp: !!it.noXp, pres: 'mcq' };
      presOf(st, !!it.retry || !!it.fromBox); return st;
    });
  }
  /* 🎲 FORMATOS (NEURO-FIX-V2): la MISMA pregunta del material puede salir en otro formato.
   * 1.ª vez: opción múltiple · 🎧 escucha y completa (Fill in) · 🔎 caza el error (Identification).
   * Al volver de la caja / repaso bonus (más exigente): ✍️ escríbelo tú o caza el error.
   * La nota sigue siendo la del material (las de la 1.ª vez son de dificultad parecida). */
  function canSpeak() { try { return !!(window.speechSynthesis && window.SpeechSynthesisUtterance); } catch (e) { return false; } }
  function huntOf(q) {
    var info = q.info || {}, best = null;
    q.opts.forEach(function (o) { if (o === q.correct) return; var x = info[o] || {}; var ew = String(x.errorWord || '').trim(), cw = String(x.correctWord || '').trim();
      if (!ew || !cw || /\s/.test(ew) || /\s/.test(cw)) return; var tk = tokens(o); if (tk.filter(function (t) { return t.toLowerCase() === ew.toLowerCase(); }).length !== 1) return;
      if (!best) best = { sent: o, err: ew, want: cw, type: x.errorType || '', exp: x.explanation || '' }; });
    if (!best) return null;
    var fx = [best.want]; q.opts.forEach(function (o) { var x = info[o] || {}; [x.errorWord, x.correctWord].forEach(function (w) { w = String(w || '').trim(); if (w && !/\s/.test(w) && fx.map(function (y) { return y.toLowerCase(); }).indexOf(w.toLowerCase()) < 0 && w.toLowerCase() !== best.err.toLowerCase()) fx.push(w); }); });
    if (fx.length < 2) { var base = best.want.replace(/(ed|d|s)$/i, ''); if (base && base.toLowerCase() !== best.want.toLowerCase() && base.toLowerCase() !== best.err.toLowerCase()) fx.push(base); }
    if (fx.length < 2) return null;
    best.fix = shuffle(fx.slice(0, 3)); return best;
  }
  function writeOf(q) {
    if (q.kind === 'fill') { var w = String(q.correct || ''); if (!/^[A-Za-z'-]{2,}$/.test(w)) return null; return { want: w, sent: q.sentence, es: q.tr || '' }; }
    if (q.kind === 'identify') { var h = huntOf(q); if (!h) return null; var tk = tokens(q.correct); if (tk.filter(function (t) { return t.toLowerCase() === h.want.toLowerCase(); }).length !== 1) return null;
      var re = new RegExp('\\b' + h.want.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i'); return { want: h.want, sent: q.correct.replace(re, '_____'), es: ((q.info || {})[q.correct] || {}).es || '' }; }
    return null;
  }
  function presOf(st, retry) {
    var q = st.q, k = q.kind, r = rnd();
    if (k === 'fill') { if (retry && r < .55) { var w = writeOf(q); if (w) { st.pres = 'write'; st.w = w; return; } } if (!retry && r < .35 && canSpeak()) { st.pres = 'listen'; st.say = String(q.sentence).replace(/_{2,}/, q.correct); } return; }
    if (k === 'identify') { if (retry && r < .5) { var w2 = writeOf(q); if (w2) { st.pres = 'write'; st.w = w2; return; } } if (r < (retry ? .9 : .4)) { var h = huntOf(q); if (h) { st.pres = 'hunt'; st.h = h; } } return; }
    if (k === 'read' && q.sents) st.pres = 'proof';
  }
  function wordNorm(x) { return String(x || '').toLowerCase().replace(/[^a-z'-]/g, ''); }
  function arrange(items) { var r = null; for (var t = 0; t < 80; t++) { r = arrangeOnce(items); if (runs(r.filter(function (x) { return x.ans != null; }).map(function (x) { return x.ans; })) <= 2) return r; } return r; }
  function interleaveByKey(list) { // reparte las respuestas (some/any/…) antes de elegir
    var g = {}; list.forEach(function (it) { var k = String(it.correct).toLowerCase(); (g[k] = g[k] || []).push(it); });
    var keys = shuffle(Object.keys(g)), out = [], any = true;
    while (any) { any = false; keys.forEach(function (k) { if (g[k].length) { out.push(g[k].shift()); any = true; } }); }
    return out;
  }
  /* opts (NEURO-FIX-V1): only = solo ese material · skip = claves que ya se conectaron en el
   * material (no se piden preguntas NUEVAS) · noBox = sin errores dentro de la ronda (bonus). */
  function readyBox(u, mats, t, only) {
    var ready = [];
    mats.forEach(function (m) { if (only && m.key !== only) return; poolOf(m).forEach(function (q) { var r = rec(u, m.key, q.id); if (r && r.s === 'box' && (r.due || 0) <= t) ready.push({ mat: m.key, q: q, due: r.due || 0, fromBox: true }); }); });
    return ready.sort(function (a, b) { return a.due - b.due; });
  }
  function buildSession(uid, mats, mode, size, opts) {
    var u = getU(uid), t = AD.now(); opts = opts || {};
    size = size || CFG.size;
    if (mode === 'box') return arrange(shuffle(readyBox(u, mats, t, opts.only).slice(0, CFG.boxMax)));
    var pend = {}, skip = opts.skip || [];
    mats.forEach(function (m) { pend[m.key] = m.extra || (opts.only && m.key !== opts.only) || (!opts.only && skip.indexOf(m.key) >= 0) ? [] : interleaveByKey(shuffle((m.items || []).filter(function (q) { return !rec(u, m.key, q.id); }))); });
    var pendTot = mats.reduce(function (a, m) { return a + pend[m.key].length; }, 0);
    var errs = opts.noBox ? [] : readyBox(u, mats, t, opts.only).slice(0, pendTot ? CFG.boxInMix : CFG.boxMax);
    errs.forEach(function (e) { if ((opts.skip || []).indexOf(e.mat) >= 0) e.noXp = true; });
    if (!pendTot) return opts.countOnly ? { n: errs.length, errs: errs.length, areas: areasOf(errs) } : (errs.length ? arrange(shuffle(errs)) : []);
    var xs = opts.noBox ? [] : pickExtras(u, opts.extras || [], mats.filter(function (m) { return pend[m.key].length; }), errs, size, pendTot);
    size = Math.max(1, size - errs.length - xs.length);
    var use = mats.filter(function (m) { return pend[m.key].length; })
      .sort(function (a, b) { return (matProgress(uid, a).pct - matProgress(uid, b).pct) + (rnd() - .5) * 8; })
      .slice(0, CFG.maxMats).map(function (m) { return m.key; });
    if (!use.length) return [];
    var cap = use.length > 4 ? 3 : CFG.maxPer, q = {}, tot = 0;
    use.forEach(function (k) { q[k] = Math.min(CFG.minPer, pend[k].length); tot += q[k]; });
    while (tot > size) { var red = null; for (var i = use.length - 1; i >= 0; i--) if (q[use[i]] > 1) { red = use[i]; break; } if (!red) break; q[red]--; tot--; }
    var guard = 0;
    while (tot < size && guard++ < 300) {
      var best = null, bw = -1;
      use.forEach(function (k) { var rem = pend[k].length - q[k]; if (rem <= 0 || q[k] >= cap) return; var w = rem / Math.max(1, pend[k].length) + rnd() * .05; if (w > bw) { bw = w; best = k; } });
      if (!best) break; q[best]++; tot++;
    }
    var items = [];
    if (opts.countOnly) { var cs = []; use.forEach(function (k) { pend[k].slice(0, q[k]).forEach(function (qq) { cs.push({ mat: k, q: qq }); }); }); return { n: tot + errs.length + xs.length, errs: errs.length, extras: xs.length, areas: areasOf(cs.concat(errs, xs)) }; }
    use.forEach(function (k) { pend[k].slice(0, q[k]).forEach(function (qq) { items.push({ mat: k, q: qq }); }); });
    if (opts.noBox) items.forEach(function (x) { x.retry = true; });
    var seq = arrange(items.concat(errs, xs.filter(function (x) { return x.q.kind !== 'stiles'; })));
    xs.filter(function (x) { return x.q.kind === 'stiles'; }).forEach(function (x) { seq = seq.concat(arrange([x])); }); // 🧱 el reto va al final
    return seq;
  }
  function areaOf(kind) { return kind === 'read' ? 'read' : kind === 'listen' ? 'listen' : kind === 'sum' ? 'sum' : (kind === 'vocab' || kind === 'stiles') ? 'voc' : 'gram'; }
  function areasOf(list) { var a = {}; list.forEach(function (x) { a[areaOf(x.q.kind)] = 1; }); return Object.keys(a).length; }
  /* Receta: mínimo 3 áreas por ronda. Si las prácticas del día no alcanzan, Neuro suma Resumen y
   * Vocabulario (y un 🧱 reto final con la Story). También rellena cuando quedan pocas preguntas. */
  function pickExtras(u, xmats, useMats, errs, size, pendTot) {
    if (!xmats.length) return [];
    var core = {}; useMats.forEach(function (m) { (m.items || []).slice(0, 1).forEach(function (q) { core[areaOf(q.kind)] = 1; }); }); errs.forEach(function (e) { core[areaOf(e.q.kind)] = 1; });
    var nAreas = Object.keys(core).length, room = Math.max(0, size - errs.length - Math.min(pendTot, size));
    var seen = u.xs || {}, t = AD.now(), byKind = { sum: [], vocab: [], stiles: [] };
    xmats.forEach(function (m) { (m.all || []).forEach(function (q) { if (byKind[q.kind]) byKind[q.kind].push({ mat: m.key, q: q, seen: seen[q.id] || 0 }); }); });
    Object.keys(byKind).forEach(function (k) { byKind[k] = shuffle(byKind[k]).sort(function (a, b) { return a.seen - b.seen; }); });
    var plan = [];
    if (nAreas < 3 && byKind.sum.length) plan.push('sum');
    if (nAreas + plan.length < 3 && byKind.vocab.length) plan.push('vocab');
    if (nAreas + plan.length < 3 && byKind.sum.length > 1) plan.push('sum');
    if (byKind.stiles.length) plan.push('stiles');
    while (plan.length < Math.min(CFG.maxExtras, room + 1) && (byKind.sum.length + byKind.vocab.length) > plan.length) plan.push(plan.filter(function (x) { return x === 'sum'; }).length <= plan.filter(function (x) { return x === 'vocab'; }).length && byKind.sum.length ? 'sum' : 'vocab');
    plan = plan.slice(0, CFG.maxExtras);
    var out = [], used = {};
    plan.forEach(function (k) { var c = byKind[k].filter(function (x) { return !used[x.q.id]; })[0]; if (!c) return; used[c.q.id] = 1;
      var q = c.q; if (k === 'vocab') { q = Object.assign({}, q, { opts: [q.word].concat(shuffle(q.alt.slice()).slice(0, 2)) }); }
      out.push({ mat: c.mat, q: q, extra: true }); });
    return out;
  }
  function metrics(seq) {
    var by = {}; seq.forEach(function (x) { (by[x.mat] = by[x.mat] || []).push(ansKeyText(x)); });
    var inMat = 0; Object.keys(by).forEach(function (k) { inMat = Math.max(inMat, runs(by[k])); });
    var ids = seq.map(function (x) { return x.mat + '|' + x.id; });
    return { pos: runs(seq.filter(function (x) { return x.ans != null; }).map(function (x) { return x.ans; })), mat: runs(seq.map(function (x) { return x.mat; })), key: runs(seq.map(ansKeyText)), inMat: inMat, dup: ids.length - Object.keys(ids.reduce(function (o, k) { o[k] = 1; return o; }, {})).length };
  }

  /* ── RESPONDER ──────────────────────────────────────────────────────────── */
  var hooks = { onMaterialDone: null };
  function payXp(u, n) { var d = peruDay(); u.xpd = u.xpd && u.xpd.d === d ? u.xpd : { d: d, n: 0 }; var g = Math.max(0, Math.min(n, CFG.xpDayCap - u.xpd.n)); u.xpd.n += g; return g; }
  function xpToday(uid) { var u = getU(uid), d = peruDay(); return u.xpd && u.xpd.d === d ? u.xpd.n : 0; }
  function answer(uid, mats, step, chosen, mode) {
    var u = getU(uid), mk = step.mat, id = step.id, r = rec(u, mk, id) || { s: null, f: null, a: 0, r: 0, due: 0, at: 0 };
    var ok = step.pres === 'write' ? wordNorm(chosen) === wordNorm(step.w.want)
      : step.pres === 'hunt' ? !!(chosen && wordNorm(chosen.fix) === wordNorm(step.h.want) && (chosen.misses || 0) <= 1)
      : (step.q && step.q.tiles) ? transOk(step.q, chosen) : chosen === step.ans, mat = mats.filter(function (m) { return m.key === mk; })[0];
    if (step.q && step.q.extra) { // 📚🗣🧱 extras: no tocan notas ni neuronas
      u.xs = u.xs || {}; u.xs[id] = AD.now(); var ks = Object.keys(u.xs); if (ks.length > 400) ks.sort(function (a, b) { return u.xs[a] - u.xs[b]; }).slice(0, ks.length - 400).forEach(function (k) { delete u.xs[k]; });
      var xx = mode !== 'bonus' && ok ? payXp(u, CFG.xpExtra) : 0; putU(uid, u);
      return { ok: ok, matDone: false, score: null, due: 0, extra: true, xp: xx };
    }
    if (mode === 'bonus') { // ⭐ repaso de la semana: solo se guardan los aciertos (los errores vuelven en otra ronda de la semana, NO van a la caja)
      if (ok) {
        setRec(u, mk, id, { s: 'ok', f: r.f != null ? r.f : true, a: (r.a || 0) + 1, r: 0, due: 0, at: AD.now() });
        if (u.wk && u.wk.id === weekMonday()) { var di = weekDayIdx(); u.wk.log = u.wk.log || {}; u.wk.log[di] = (u.wk.log[di] || 0) + 1; }
        putU(uid, u); if (Object.keys(u.out).length >= 4) flush(uid);
      }
      return { ok: ok, matDone: false, score: null, due: 0, bonus: true };
    }
    var before = mat ? matProgress(uid, mat).pct : 0;
    var atext = step.pres === 'write' ? String(chosen || '').trim() : step.pres === 'hunt' ? (chosen ? chosen.fix + (chosen.misses ? ' (' + chosen.misses + ' toques)' : '') : '') : (step.q && step.q.tiles) ? transNorm(chosen) : (step.opts && step.opts[chosen] != null ? String(step.opts[chosen]) : '');
    var nr = { s: r.s, f: r.f, a: (r.a || 0) + 1, r: r.r || 0, due: r.due || 0, at: AD.now(), fa: r.fa != null ? r.fa : atext, la: atext }; // NT-V1: qué respondió (1.ª vez y última)
    if (nr.f == null) nr.f = ok;
    if (ok) { nr.s = 'ok'; nr.due = 0; }
    else if (r.s !== 'ok') { if (mode === 'box' || step.fromBox) nr.r = (r.r || 0) + 1; nr.s = 'box'; nr.due = AD.now() + (nr.r > 0 ? CFG.retryMs : CFG.boxMs); }
    /* ⚡ XP por intento (pedido de la usuaria 26-oct): mientras el material NO esté completo, cada respuesta en Neuro da XP
     * (+2 acierto · +1 intento). Al completarlo deja de dar (ya recibe el XP del material). Tope diario de seguridad. */
    var gx = (!step.noXp && before < 100 && r.s !== 'ok') ? payXp(u, ok ? CFG.xpOk : CFG.xpTry) : 0;
    setRec(u, mk, id, nr); putU(uid, u);
    var res = { ok: ok, matDone: false, score: null, due: nr.due, xp: gx };
    if (mat) { var p = matProgress(uid, mat); if (before < 100 && p.pct >= 100 && p.graded == null) { res.matDone = true; res.score = p.firstPct; var u2 = getU(uid); u2.g[mk] = p.firstPct; putU(uid, u2); try { hooks.onMaterialDone && hooks.onMaterialDone(uid, mat, p.firstPct); } catch (e) {} } }
    var pend = Object.keys(getU(uid).out).length; if (pend >= 4) flush(uid);
    return res;
  }

  /* ── NUBE: subir (bandeja con versión) / bajar / caja lista ─────────────── */
  var flushing = {}, NOANS = false;
  function flush(uid) {
    if (flushing[uid]) return flushing[uid];
    var c = AD.client(); if (!c || isPreview(uid)) return Promise.resolve(false);
    var u = getU(uid), keys = Object.keys(u.out); if (!keys.length) return Promise.resolve(true);
    var sent = {}, rows = [];
    keys.forEach(function (k) { var p = k.split('|'), r = rec(u, p[0], p[1]); if (!r) return; sent[k] = u.out[k];
      var row = { user_id: uid, mat_key: p[0], item_id: p[1], level: u.level || '', status: r.s || 'box', first_ok: r.f, attempts: r.a || 0, box_round: r.r || 0 };
      if (!NOANS && (r.fa != null || r.la != null)) { row.first_answer = r.fa != null ? String(r.fa).slice(0, 300) : null; row.last_answer = r.la != null ? String(r.la).slice(0, 300) : null; }
      rows.push(row); });
    var send = function (rs) { return Promise.resolve(c.from('practice_items').upsert(rs, { onConflict: 'user_id,mat_key,item_id' }).select('mat_key,item_id,status,due_at')); };
    flushing[uid] = send(rows).then(function (res) { // sin script 37 → reintenta sin las columnas de respuesta (nunca se pierde lo demás)
      if (res && res.error && !NOANS && /first_answer|last_answer|column/i.test(String(res.error.message || res.error))) { NOANS = true; return send(rows.map(function (x) { var y = {}; Object.keys(x).forEach(function (k) { if (k !== 'first_answer' && k !== 'last_answer') y[k] = x[k]; }); return y; })); }
      return res;
    }).then(function (res) {
      if (res && res.error) throw res.error;
      var u2 = getU(uid);
      Object.keys(sent).forEach(function (k) { if (u2.out[k] === sent[k]) delete u2.out[k]; });
      ((res && res.data) || []).forEach(function (row) { var r = rec(u2, row.mat_key, row.item_id); if (!r) return; if (row.status === 'ok') { r.s = 'ok'; r.due = 0; } else if (r.s !== 'ok' && row.due_at) r.due = Date.parse(row.due_at) || r.due; });
      putU(uid, u2); return true;
    }).catch(function () { return false; }).then(function (x) { flushing[uid] = null; return x; });
    return flushing[uid];
  }
  function pull(uid, mats) { // solo LEE: también en vista previa (la profesora ve lo mismo que el alumno)
    var c = AD.client(); if (!c) return Promise.resolve(false);
    var keys = mats.map(function (m) { return m.key; }); if (!keys.length) return Promise.resolve(true);
    return Promise.resolve(c.from('practice_items').select('mat_key,item_id,status,first_ok,attempts,box_round,due_at').eq('user_id', uid).in('mat_key', keys)).then(function (res) {
      if (res && res.error) throw res.error;
      var u = getU(uid);
      ((res && res.data) || []).forEach(function (row) {
        var cloud = { s: row.status, f: row.first_ok, a: row.attempts || 0, r: row.box_round || 0, due: row.due_at ? Date.parse(row.due_at) : 0, at: 0 };
        var loc = rec(u, row.mat_key, row.item_id), m = merge(loc, cloud);
        if (loc && loc.s !== 'ok' && cloud.s !== 'ok' && cloud.due) m.due = cloud.due; // la hora del servidor manda
        (u.m[row.mat_key] = u.m[row.mat_key] || {})[row.item_id] = m;
      });
      putU(uid, u); return true;
    }).catch(function () { return false; });
  }
  /* NEURO-FIX-V1: trae de la nube TODOS los errores en caja del alumno (de cualquier día y material).
   * Antes solo se veían los de los materiales del set de hoy. Solo lee. */
  function pullBox(uid) {
    var c = AD.client(); if (!c) return Promise.resolve(false);
    return Promise.resolve(c.from('practice_items').select('mat_key,item_id,status,first_ok,attempts,box_round,due_at').eq('user_id', uid).eq('status', 'box').limit(1000)).then(function (res) {
      if (res && res.error) throw res.error;
      var u = getU(uid);
      ((res && res.data) || []).forEach(function (row) {
        if (/^rv:/.test(row.mat_key)) return;
        var cloud = { s: row.status, f: row.first_ok, a: row.attempts || 0, r: row.box_round || 0, due: row.due_at ? Date.parse(row.due_at) : 0, at: 0 };
        var loc = rec(u, row.mat_key, row.item_id), m = merge(loc, cloud);
        if (loc && loc.s !== 'ok' && cloud.due) m.due = cloud.due;
        (u.m[row.mat_key] = u.m[row.mat_key] || {})[row.item_id] = m;
      });
      putU(uid, u); return true;
    }).catch(function () { return false; });
  }
  /* Materiales con errores en caja que NO están en el set de hoy → se cargan para poder repasarlos.
   * Un error cuya pregunta ya no existe en el material (lo editaron) se marca 'gone' en este equipo
   * para que nunca quede un “6 errores” imposible de resolver. */
  function boxMaterials(student, haveKeys) {
    var D = window.JUCUM_DATA, uid = student && student.id; if (!D || !uid) return Promise.resolve([]);
    var u = getU(uid), mods = D.MODULE_CATALOG[student.level] || [], list = [];
    Object.keys(u.m).forEach(function (k) {
      if (/^rv:/.test(k) || (haveKeys || []).indexOf(k) >= 0) return;
      var recs = u.m[k] || {}; if (!Object.keys(recs).some(function (id) { return recs[id] && recs[id].s === 'box'; })) return;
      var p = k.split(':'), mod = mods.filter(function (m) { return m.id === p[0]; })[0]; if (!mod) return;
      var a = (mod.activities || []).filter(function (x) { return x.id === p[1]; })[0]; if (!a || !kindOf(a.url)) return;
      var num = D.getModuleNumber ? D.getModuleNumber(student.level, mod.id) : null;
      list.push({ key: k, moduleId: mod.id, activityId: a.id, name: (num ? 'M' + num + ' · ' : '') + (a.group ? a.group.split('·')[0].trim() + ' · ' : '') + a.name, short: (a.group ? a.group.split('·')[0].trim() + ' · ' : '') + a.name, group: a.group || '', url: a.url, kind: kindOf(a.url), extra: true });
    });
    return Promise.all(list.map(function (m) { return loadMaterial(m.url).then(function (r) { m.ok = r.ok; m.all = r.ok ? r.items : []; m.items = m.all; return m; }); })).then(function (ms) {
      ms = ms.filter(function (m) { return m.ok; });
      var u2 = getU(uid), ch = false;
      ms.forEach(function (m) { var ids = {}; m.all.forEach(function (q) { ids[q.id] = 1; }); var recs = u2.m[m.key] || {};
        Object.keys(recs).forEach(function (id) { if (recs[id].s === 'box' && !ids[id]) { recs[id].s = 'gone'; ch = true; } }); });
      if (ch) putU(uid, u2);
      return ms;
    });
  }
  /* Resumen de la caja SIN cargar materiales (Inicio y campanita): cuántos esperan, cuántos listos y cuándo vuelve el próximo. */
  function boxSummary(uid) {
    var u = getU(uid), t = AD.now(), total = 0, ready = 0, next = 0, lastReady = 0;
    Object.keys(u.m).forEach(function (k) { if (/^rv:/.test(k)) return; var recs = u.m[k] || {};
      Object.keys(recs).forEach(function (id) { var r = recs[id]; if (!r || r.s !== 'box') return; total++; if ((r.due || 0) <= t) { ready++; lastReady = Math.max(lastReady, r.due || 0); } else next = next ? Math.min(next, r.due) : r.due; }); });
    return { total: total, ready: ready, next: next, lastReady: lastReady };
  }
  function refreshReady(uid) { // confirma con la hora del SERVIDOR qué errores ya se pueden repasar (solo lee)
    var c = AD.client(); if (!c) return Promise.resolve(null);
    return Promise.resolve(c.rpc('mix_box_ready', { p_user: uid })).then(function (res) {
      if (res && res.error) throw res.error;
      var ready = {}; ((res && res.data) || []).forEach(function (r) { ready[r.mat_key + '|' + r.item_id] = 1; });
      var u = getU(uid), t = AD.now(), changed = false;
      Object.keys(u.m).forEach(function (mk) { Object.keys(u.m[mk]).forEach(function (id) { var r = u.m[mk][id]; if (r.s !== 'box' || u.out[mk + '|' + id]) return;
        if (ready[mk + '|' + id] && (r.due || 0) > t) { r.due = t - 1000; changed = true; }
        else if (!ready[mk + '|' + id] && (r.due || 0) <= t) { r.due = t + 60e3; changed = true; } }); });
      if (changed) putU(uid, u); return ready;
    }).catch(function () { return null; });
  }
  function boxStatus(uid, mats) {
    var u = getU(uid), t = AD.now(), total = 0, ready = 0, next = 0, tomorrow = 0;
    mats.forEach(function (m) { poolOf(m).forEach(function (q) { var r = rec(u, m.key, q.id); if (!r || r.s !== 'box') return; total++; if ((r.due || 0) <= t) ready++; else { next = next ? Math.min(next, r.due) : r.due; if (r.r > 0) tomorrow++; } }); });
    return { total: total, ready: ready, next: next, tomorrow: tomorrow };
  }

  /* ── MINUTOS (meta del día + racha) ─────────────────────────────────────── */
  function addSeconds(uid, sec, moduleId) {
    if (!(sec > 0)) return;
    var u = getU(uid), d = peruDay(), before = u.sec[d] || 0;
    u.sec = {}; u.sec[d] = before + sec; putU(uid, u);
    var addMin = Math.floor((before + sec) / 60) - Math.floor(before / 60);
    try { if (addMin > 0 && window.JUCUM_DATA && window.JUCUM_DATA.addPracticeMinutes) window.JUCUM_DATA.addPracticeMinutes(uid, addMin); } catch (e) {}
    var c = AD.client(); if (!c || isPreview(uid) || !moduleId) return;
    try { c.from('daily_sessions').upsert({ user_id: uid, day: d, module_id: moduleId, activity_id: 'mixed', kind: 'mixed', minutes: Math.max(1, Math.round((before + sec) / 60)), updated_at: new Date().toISOString() }, { onConflict: 'user_id,day,module_id,activity_id' }).then(function () {}, function () {}); } catch (e) {}
  }

  /* ── materiales de HOY del alumno (solo los que el lector soporta) ──────── */
  function enabledFor(student) { return !!(student && CFG.levels[student.level]); }
  function todayMaterials(student) {
    var D = window.JUCUM_DATA, TT = window.JUCUM_TT;
    if (!D || !TT || !student) return Promise.resolve([]);
    var items = []; try { items = TT.getTodayPracticeForStudent(student).items || []; } catch (e) {}
    var mods = D.MODULE_CATALOG[student.level] || [], seen = {}, list = [];
    items.forEach(function (it) {
      var mod = mods.filter(function (m) { return m.id === it.moduleId; })[0]; if (!mod) return;
      var a = (mod.activities || []).filter(function (x) { return x.id === it.activityId; })[0]; if (!a) return;
      var k = mod.id + ':' + a.id; if (!kindOf(a.url)) return;
      if (seen[k]) { if (it.storyNo) seen[k].stories.push(String(it.storyNo)); return; }
      var m = { key: k, moduleId: mod.id, activityId: a.id, name: (a.group ? a.group.split('·')[0].trim() + ' · ' : '') + a.name, group: a.group || '', url: a.url, kind: kindOf(a.url), stories: it.storyNo ? [String(it.storyNo)] : [] };
      seen[k] = m; list.push(m);
    });
    return Promise.all(list.map(function (m) { return loadMaterial(m.url).then(function (r) { m.ok = r.ok; m.all = r.items || []; m.items = m.all; m.warn = r.warn || []; m.err = r.err || null; return m; }); }))
      .then(function (ms) {
        var u = getU(student.id);
        ms.forEach(function (m) { // 📖🎧 solo la historia que dejó la profe (o la primera que aún no tiene completa)
          if (!m.ok || (m.kind !== 'read' && m.kind !== 'listen')) return;
          var sts = []; m.all.forEach(function (q) { if (sts.indexOf(String(q.storyN)) < 0) sts.push(String(q.storyN)); });
          var want = m.stories.filter(function (s) { return sts.indexOf(s) >= 0; });
          if (!want.length) { var f = sts.filter(function (s) { return m.all.some(function (q) { if (String(q.storyN) !== s) return false; var r = rec(u, m.key, q.id); return !r || r.s !== 'ok'; }); })[0] || sts[0]; if (f) want = [f]; }
          m.stories = want; m.items = m.all.filter(function (q) { return want.indexOf(String(q.storyN)) >= 0; });
          m.name = m.name + ' · Historia ' + want.join(' y ');
        });
        return ms.filter(function (m) { return m.ok && m.items.length; });
      });
  }

  /* ── ⭐ REPASOS DE LA SEMANA (NEURO-HOY-V1) ──────────────────────────────
   * Tope semanal = % del nivel × preguntas que el alumno TIENE para repasar
   * (Fill in / Identification ya hechos en sus módulos abiertos, sin el de clase),
   * con techo por nivel y mínimo 10. Se elige el LUNES (curva del olvido: lo más
   * antiguo y con nota más baja primero), hasta 8 preguntas por material, y queda
   * CONGELADO toda la semana. Lo resuelto queda completo; el lunes se renueva sin deuda. */
  var LVREV = { 'pre-a1': { cap: 0.20, max: 40, n: 'Pre-A1' }, a1: { cap: 0.30, max: 80, n: 'A1' }, a2: { cap: 0.40, max: 120, n: 'A2' } };
  var REV_PER_MAT = 8, REV_MAX_MATS = 24;
  function weekMonday(t) { var p = new Date((t == null ? AD.now() : t) - 5 * 3600e3); var d = (p.getUTCDay() + 6) % 7; p.setUTCDate(p.getUTCDate() - d); return p.toISOString().slice(0, 10); }
  function weekDayIdx(t) { var p = new Date((t == null ? AD.now() : t) - 5 * 3600e3); return (p.getUTCDay() + 6) % 7; }
  function reviewCandidates(student) {
    var D = window.JUCUM_DATA; if (!D || !student) return [];
    var mods = D.MODULE_CATALOG[student.level] || [];
    var allowed = D.getStudentModuleIds ? D.getStudentModuleIds(student) : mods.map(function (m) { return m.id; });
    var cls = D.getClassModuleId ? D.getClassModuleId(student.group || student.closedGroup) : null;
    var comp = ((D.getStudentProgress && D.getStudentProgress(student.id)) || {}).completed || {};
    var out = [];
    mods.forEach(function (m) {
      if (allowed.indexOf(m.id) < 0 || m.id === cls) return;
      var num = D.getModuleNumber ? D.getModuleNumber(student.level, m.id) : null;
      (m.activities || []).forEach(function (a) {
        var k = m.id + ':' + a.id, e = comp[k], kd = kindOf(a.url); if (!e || !kd) return;
        var short = (a.group ? a.group.split('·')[0].trim() + ' · ' : '') + a.name;
        out.push({ key: k, moduleId: m.id, activityId: a.id, url: a.url, kind: kd, short: short, name: (num ? 'M' + num + ' · ' : '') + short,
          at: Date.parse(e.date) || 0, sc: D.scorePct ? D.scorePct(e.score) : (e.score || 0) });
      });
    });
    out.sort(function (x, y) { return (x.at - y.at) || (x.sc - y.sc); });
    return out.slice(0, REV_MAX_MATS);
  }
  /* ☁️ WEEK-PLAN-NUBE-V1 (15-oct-2026) · la lista semanal vive en Supabase (script 36, tabla week_reviews,
   * PK user_id+week, el trigger impide cambiarla). LA PRIMERA LISTA GUARDADA GANA: se inserta con
   * ignoreDuplicates y se relee; si otro equipo ganó, se adopta la suya. Sin conexión se usa la copia
   * del celular y se sube en la próxima apertura. Lo resuelto ya está aparte en practice_items (rv:…). */
  function planSig(p) { return (p || []).map(function (x) { return x.key + '=' + (x.ids || []).join(','); }).join(';'); }
  function cloudWeekGet(uid, wk) {
    var c = AD.client(); if (!c || isPreview(uid)) return Promise.resolve(undefined);
    return Promise.resolve(c.from('week_reviews').select('plan,cap,pool').eq('user_id', uid).eq('week', wk)).then(function (r) {
      if (r && r.error) throw r.error; var d = r && r.data && r.data[0];
      return (d && Array.isArray(d.plan) && d.plan.length) ? d : null;
    }).catch(function () { return undefined; });
  }
  function cloudWeekClaim(uid, wk, w, level) {
    var c = AD.client(); if (!c || isPreview(uid)) return Promise.resolve(undefined);
    return Promise.resolve(c.from('week_reviews').upsert({ user_id: uid, week: wk, level: level || '', plan: w.plan, cap: w.cap || 0, pool: w.pool || 0 }, { onConflict: 'user_id,week', ignoreDuplicates: true })).then(function (r) {
      if (r && r.error) throw r.error; return cloudWeekGet(uid, wk);
    }).catch(function () { return undefined; });
  }
  function adoptWeek(uid, wk, cw) {
    var u = getU(uid), same = u.wk && u.wk.id === wk;
    u.wk = { id: wk, plan: cw.plan, cap: cw.cap || 0, pool: cw.pool || 0, log: (same && u.wk.log) || {}, at: (same && u.wk.at) || AD.now(), cloud: true };
    Object.keys(u.m).forEach(function (k) { if (/^rv:/.test(k) && k.indexOf('rv:' + wk + ':') !== 0) delete u.m[k]; });
    putU(uid, u);
  }
  function weekReviews(student) {
    var uid = student.id, wk = weekMonday();
    return cloudWeekGet(uid, wk).then(function (cw) {
      var u0 = getU(uid);
      if (cw && !(u0.wk && u0.wk.id === wk && planSig(u0.wk.plan) === planSig(cw.plan))) adoptWeek(uid, wk, cw);
      else if (cw && !u0.wk.cloud) { u0.wk.cloud = true; putU(uid, u0); }
      return buildWeek(student, wk, cw, false);
    });
  }
  function buildWeek(student, wk, cw, noClaim) {
    var uid = student.id, u0 = getU(uid), lv = LVREV[student.level] || LVREV['pre-a1'];
    var plan = (u0.wk && u0.wk.id === wk && u0.wk.plan && u0.wk.plan.length) ? u0.wk.plan : null;
    var cands = reviewCandidates(student), byKey = {};
    cands.forEach(function (c) { byKey[c.key] = c; });
    var list = plan ? plan.map(function (p) { var c = byKey[p.key]; if (!c) return null; var o = {}; Object.keys(c).forEach(function (k) { o[k] = c[k]; }); o.ids = p.ids; return o; }).filter(Boolean) : cands;
    return Promise.all(list.map(function (c) { return loadMaterial(c.url).then(function (r) { c.all = r.ok ? r.items : []; return c; }); })).then(function (ls) {
      ls = ls.filter(function (c) { return c.all.length; });
      if (!plan) {
        var pool = ls.reduce(function (a, c) { return a + c.all.length; }, 0);
        var cap = pool ? Math.min(lv.max, Math.max(Math.min(10, pool), Math.round(pool * lv.cap))) : 0;
        var tot = 0, pl = [], u1 = getU(uid);
        var per = cap ? Math.ceil(cap / Math.ceil(cap / REV_PER_MAT)) : 0; // reparte parejo: 10 → 5+5 · 23 → 8+8+7 · 40 → 5×8
        for (var i = 0; i < ls.length && tot < cap; i++) {
          var c = ls[i], take = Math.min(per, c.all.length, cap - tot);
          var ids = shuffle(c.all.map(function (q) { return q.id; }));
          ids.sort(function (a, b) { var ra = rec(u1, c.key, a), rb = rec(u1, c.key, b); return ((ra && ra.f === false) ? 0 : 1) - ((rb && rb.f === false) ? 0 : 1); });
          c.ids = ids.slice(0, take); pl.push({ key: c.key, ids: c.ids }); tot += take;
        }
        Object.keys(u1.m).forEach(function (k) { if (/^rv:/.test(k) && k.indexOf('rv:' + wk + ':') !== 0) delete u1.m[k]; });
        u1.wk = { id: wk, plan: pl, cap: tot, pool: pool, log: (u1.wk && u1.wk.id === wk && u1.wk.log) || {}, at: AD.now(), cloud: false }; putU(uid, u1);
        ls = ls.filter(function (c) { return pl.some(function (p) { return p.key === c.key; }); });
      }
      var finish = function () { var mats = ls.map(function (c) { return { key: 'rv:' + wk + ':' + c.key, base: c.key, moduleId: c.moduleId, activityId: c.activityId, name: c.name, short: c.short, kind: c.kind, url: c.url,
        items: c.all.filter(function (q) { return (c.ids || []).indexOf(q.id) >= 0; }) }; }).filter(function (m) { return m.items.length; });
      var w = getU(uid).wk || {};
      return { wk: wk, mats: mats, cap: w.cap || 0, pool: w.pool || 0, pct: lv.cap, levelName: lv.n, isNew: !!(w.at && AD.now() - w.at < 60e3), cloud: !!w.cloud }; };
      var w0 = getU(uid).wk;
      if (cw === null && !noClaim && w0 && w0.id === wk && w0.plan && w0.plan.length) { // nube alcanzable y vacía → reclamar
        return cloudWeekClaim(uid, wk, w0, student.level).then(function (win) {
          if (!win) return finish();
          if (planSig(win.plan) === planSig(w0.plan)) { var u2 = getU(uid); if (u2.wk) { u2.wk.cloud = true; putU(uid, u2); } return finish(); }
          adoptWeek(uid, wk, win); return buildWeek(student, wk, win, true); // otro equipo ganó → misma lista para todos
        });
      }
      return finish();
    });
  }

  /* ── 👩‍🏫 PROFESOR (NT-V1, 15-oct): lee practice_items + week_reviews de VARIOS alumnos. Solo lectura.
   * Trae lo de los últimos `days` días más todo lo que siga en la caja, paginado de 1000 en 1000. */
  function teacherFetch(ids, days) {
    var c = AD.client(); if (!c || !ids || !ids.length) return Promise.resolve({ ok: false, rows: [], weeks: [], err: c ? null : 'sin conexión' });
    var since = new Date(AD.now() - (days || 21) * 86400e3).toISOString(), wk = weekMonday();
    var cols = 'user_id,mat_key,item_id,status,first_ok,attempts,box_round,due_at,updated_at,ok_at,last_wrong_at,first_answer,last_answer';
    var colsNoAns = 'user_id,mat_key,item_id,status,first_ok,attempts,box_round,due_at,updated_at,ok_at,last_wrong_at';
    function page(sel, from, acc) {
      return Promise.resolve(c.from('practice_items').select(sel).in('user_id', ids).or('status.eq.box,updated_at.gte.' + since).range(from, from + 999)).then(function (res) {
        if (res && res.error) throw res.error; var d = (res && res.data) || []; acc = acc.concat(d);
        return d.length === 1000 && acc.length < 20000 ? page(sel, from + 1000, acc) : acc;
      });
    }
    var rowsP = page(cols, 0, []).then(function (r) { return { rows: r, answers: true }; }, function (e) {
      if (!/first_answer|last_answer|column/i.test(String(e && (e.message || e)))) throw e;
      return page(colsNoAns, 0, []).then(function (r) { return { rows: r, answers: false }; });
    });
    var wkP = Promise.resolve(c.from('week_reviews').select('user_id,week,plan,cap').in('user_id', ids).eq('week', wk)).then(function (res) { return (res && !res.error && res.data) || []; }, function () { return []; });
    return Promise.all([rowsP, wkP]).then(function (a) { return { ok: true, rows: a[0].rows, answers: a[0].answers, weeks: a[1], wk: wk }; })
      .catch(function (e) { return { ok: false, rows: [], weeks: [], err: String(e && e.message || e) }; });
  }

  /* ── 🟢 Clase en vivo (live_presence, script 26) — MISMA fila única por alumno que
   * usa jucum-connect.js. Mientras hace la sesión mixta, el alumno aparece en la mesa
   * del material de la pregunta actual. Nunca escribe en vista previa ni sin nube. */
  var LIVE = { started: null };
  function live(student, state, mat, minutes, score) {
    var c = AD.client(); if (!c || !student || isPreview(student.id)) return;
    if (state === 'start' || !LIVE.started) LIVE.started = new Date(AD.now()).toISOString();
    var bonus = !!(mat && /^rv:/.test(mat.key));
    try {
      Promise.resolve(c.from('live_presence').upsert({
        user_id: student.id, group_id: student.group || '', module_id: mat ? mat.moduleId : '', activity_id: mat ? mat.activityId : '',
        kind: 'grammar', material_name: (bonus ? '⭐ Repaso bonus' : '🧠 Sesión mixta') + (mat ? ' · ' + (mat.short || mat.name) : ''),
        part: null, state: state, minutes: Math.max(0, Math.round(minutes || 0)), score: score == null ? null : score,
        exam: false, started_at: LIVE.started, updated_at: new Date(AD.now()).toISOString()
      }, { onConflict: 'user_id' })).then(function () {}, function () {});
    } catch (e) {}
  }

  /* registro de nota al 100 % (una sola vez por material) */
  hooks.onMaterialDone = function (uid, mat, score) {
    try { var D = window.JUCUM_DATA; if (D && D.markActivityComplete) D.markActivityComplete(uid, mat.moduleId, mat.activityId, score, 0, { total: mat.items.length, mixed: true }); } catch (e) {}
  };

  try { window.addEventListener('online', function () { var s = window.JUCUM_MIX && window.JUCUM_MIX._lastUid; if (s) flush(s); }); } catch (e) {}
  try { document.addEventListener('visibilitychange', function () { if (document.hidden) { var s = window.JUCUM_MIX && window.JUCUM_MIX._lastUid; if (s) flush(s); } }); } catch (e) {}

  window.JUCUM_MIX = {
    VERSION: 'NEURO-FIX-V2', CFG: CFG, enabledFor: enabledFor, kindOf: kindOf, parseHtml: parseHtml, loadMaterial: loadMaterial,
    pullBox: pullBox, boxMaterials: boxMaterials, boxSummary: boxSummary, isPreview: isPreview, now: function () { return AD.now(); },
    todayMaterials: todayMaterials, matProgress: matProgress, buildSession: buildSession, arrange: arrange, metrics: metrics, runs: runs,
    answer: answer, flush: flush, pull: pull, refreshReady: refreshReady, boxStatus: boxStatus, addSeconds: addSeconds, merge: merge,
    hooks: hooks, plain: plain, _lastUid: null, transOk: transOk, bankOrder: bankOrder, teacherFetch: teacherFetch,
    extraMaterials: extraMaterials, parseExtra: parseExtra, wordNorm: wordNorm, xpToday: xpToday, areasOf: areasOf,
    weekReviews: weekReviews, weekState: function (uid) { return getU(uid).wk || null; }, live: live, weekMonday: weekMonday, weekDayIdx: weekDayIdx, LVREV: LVREV,
    _setAdapter: function (o) { Object.keys(o || {}).forEach(function (k) { AD[k] = o[k]; }); mem = {}; },
    _keys: { STATE_KEY: STATE_KEY, CACHE_KEY: CACHE_KEY }
  };
})();
