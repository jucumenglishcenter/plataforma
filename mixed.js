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
 *  · CAJA DE ERRORES: lo fallado se guarda y vuelve 2 h después (24 h si vuelve a
 *    fallar). La hora la pone el SERVIDOR (script 35 · trigger + mix_box_ready).
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
    boxMs: 2 * 3600e3, retryMs: 24 * 3600e3, cacheMs: 6 * 3600e3, secPerQ: 35, maxSecQ: 90 };
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
    return { s: ok ? 'ok' : (a.s || b.s), f: a.f != null ? a.f : b.f, a: Math.max(a.a || 0, b.a || 0), r: Math.max(a.r || 0, b.r || 0), due: ok ? 0 : (b.due || a.due || 0), at: Math.max(a.at || 0, b.at || 0) };
  }
  function matProgress(uid, mat) {
    var u = getU(uid), ok = 0, box = 0, first = 0, ans = 0;
    (mat.items || []).forEach(function (it) { var r = rec(u, mat.key, it.id); if (!r) return; ans++; if (r.s === 'ok') ok++; else if (r.s === 'box') box++; if (r.f === true) first++; });
    var total = (mat.items || []).length;
    return { total: total, ok: ok, box: box, answered: ans, pending: total - ans, pct: total ? Math.round(ok / total * 100) : 0, firstPct: total ? Math.round(first / total * 100) : 0, graded: u.g[mat.key] != null ? u.g[mat.key] : null };
  }

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
    best.forEach(function (it) { if (it.q.kind === 'transform') return; var n = it.q.opts.length; bags[n] = (bags[n] || 0) + 1; });
    Object.keys(bags).forEach(function (n) { var c = bags[n], off = Math.floor(rnd() * n), b = []; for (var i = 0; i < c; i++) b.push((i + off) % n); bags[n] = shuffle(b); });
    var pos = [];
    best.forEach(function (it, k) {
      if (it.q.kind === 'transform') { pos.push(null); return; }
      var n = it.q.opts.length, bag = bags[n], forb = {}, pp = pos.filter(function (x) { return x != null; });
      if (pp.length >= 2 && pp[pp.length - 1] === pp[pp.length - 2]) forb[pp[pp.length - 1]] = 1;
      var idx = -1; for (var i = 0; i < bag.length; i++) if (!forb[bag[i]]) { idx = i; break; }
      var p = bag.length ? bag.splice(idx < 0 ? 0 : idx, 1)[0] : Math.floor(rnd() * n);
      if (forb[p]) { var alt = []; for (var q = 0; q < n; q++) if (!forb[q]) alt.push(q); if (alt.length) p = alt[Math.floor(rnd() * alt.length)]; }
      pos.push(p);
    });
    return best.map(function (it, k) {
      if (it.q.kind === 'transform') return { mat: it.mat, id: it.q.id, q: it.q, opts: null, ans: null, bank: bankOrder(it.q) };
      var cor = it.q.correct, dis = shuffle(it.q.opts.filter(function (o) { return o !== cor; })), opts = [], di = 0;
      for (var p = 0; p < it.q.opts.length; p++) opts.push(p === pos[k] ? cor : dis[di++]);
      return { mat: it.mat, id: it.q.id, q: it.q, opts: opts, ans: pos[k] };
    });
  }
  function arrange(items) { var r = null; for (var t = 0; t < 80; t++) { r = arrangeOnce(items); if (runs(r.filter(function (x) { return x.ans != null; }).map(function (x) { return x.ans; })) <= 2) return r; } return r; }
  function interleaveByKey(list) { // reparte las respuestas (some/any/…) antes de elegir
    var g = {}; list.forEach(function (it) { var k = String(it.correct).toLowerCase(); (g[k] = g[k] || []).push(it); });
    var keys = shuffle(Object.keys(g)), out = [], any = true;
    while (any) { any = false; keys.forEach(function (k) { if (g[k].length) { out.push(g[k].shift()); any = true; } }); }
    return out;
  }
  function buildSession(uid, mats, mode, size) {
    var u = getU(uid), t = AD.now();
    size = size || CFG.size;
    if (mode === 'box') {
      var ready = [];
      mats.forEach(function (m) { (m.items || []).forEach(function (q) { var r = rec(u, m.key, q.id); if (r && r.s === 'box' && (r.due || 0) <= t) ready.push({ mat: m.key, q: q }); }); });
      return arrange(shuffle(ready).slice(0, 10));
    }
    var pend = {};
    mats.forEach(function (m) { pend[m.key] = interleaveByKey(shuffle((m.items || []).filter(function (q) { return !rec(u, m.key, q.id); }))); });
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
    use.forEach(function (k) { pend[k].slice(0, q[k]).forEach(function (qq) { items.push({ mat: k, q: qq }); }); });
    return arrange(items);
  }
  function metrics(seq) {
    var by = {}; seq.forEach(function (x) { (by[x.mat] = by[x.mat] || []).push(ansKeyText(x)); });
    var inMat = 0; Object.keys(by).forEach(function (k) { inMat = Math.max(inMat, runs(by[k])); });
    var ids = seq.map(function (x) { return x.mat + '|' + x.id; });
    return { pos: runs(seq.filter(function (x) { return x.ans != null; }).map(function (x) { return x.ans; })), mat: runs(seq.map(function (x) { return x.mat; })), key: runs(seq.map(ansKeyText)), inMat: inMat, dup: ids.length - Object.keys(ids.reduce(function (o, k) { o[k] = 1; return o; }, {})).length };
  }

  /* ── RESPONDER ──────────────────────────────────────────────────────────── */
  var hooks = { onMaterialDone: null };
  function answer(uid, mats, step, chosen, mode) {
    var u = getU(uid), mk = step.mat, id = step.id, r = rec(u, mk, id) || { s: null, f: null, a: 0, r: 0, due: 0, at: 0 };
    var ok = (step.q && step.q.kind === 'transform') ? transOk(step.q, chosen) : chosen === step.ans, mat = mats.filter(function (m) { return m.key === mk; })[0];
    if (mode === 'bonus') { // ⭐ repaso de la semana: solo se guardan los aciertos (los errores vuelven en otra ronda de la semana, NO van a la caja)
      if (ok) {
        setRec(u, mk, id, { s: 'ok', f: r.f != null ? r.f : true, a: (r.a || 0) + 1, r: 0, due: 0, at: AD.now() });
        if (u.wk && u.wk.id === weekMonday()) { var di = weekDayIdx(); u.wk.log = u.wk.log || {}; u.wk.log[di] = (u.wk.log[di] || 0) + 1; }
        putU(uid, u); if (Object.keys(u.out).length >= 4) flush(uid);
      }
      return { ok: ok, matDone: false, score: null, due: 0, bonus: true };
    }
    var before = mat ? matProgress(uid, mat).pct : 0;
    var nr = { s: r.s, f: r.f, a: (r.a || 0) + 1, r: r.r || 0, due: r.due || 0, at: AD.now() };
    if (nr.f == null) nr.f = ok;
    if (ok) { nr.s = 'ok'; nr.due = 0; }
    else if (r.s !== 'ok') { if (mode === 'box') nr.r = (r.r || 0) + 1; nr.s = 'box'; nr.due = AD.now() + (nr.r > 0 ? CFG.retryMs : CFG.boxMs); }
    setRec(u, mk, id, nr); putU(uid, u);
    var res = { ok: ok, matDone: false, score: null, due: nr.due };
    if (mat) { var p = matProgress(uid, mat); if (before < 100 && p.pct >= 100 && p.graded == null) { res.matDone = true; res.score = p.firstPct; var u2 = getU(uid); u2.g[mk] = p.firstPct; putU(uid, u2); try { hooks.onMaterialDone && hooks.onMaterialDone(uid, mat, p.firstPct); } catch (e) {} } }
    var pend = Object.keys(getU(uid).out).length; if (pend >= 4) flush(uid);
    return res;
  }

  /* ── NUBE: subir (bandeja con versión) / bajar / caja lista ─────────────── */
  var flushing = {};
  function flush(uid) {
    if (flushing[uid]) return flushing[uid];
    var c = AD.client(); if (!c || isPreview(uid)) return Promise.resolve(false);
    var u = getU(uid), keys = Object.keys(u.out); if (!keys.length) return Promise.resolve(true);
    var sent = {}, rows = [];
    keys.forEach(function (k) { var p = k.split('|'), r = rec(u, p[0], p[1]); if (!r) return; sent[k] = u.out[k];
      rows.push({ user_id: uid, mat_key: p[0], item_id: p[1], level: u.level || '', status: r.s || 'box', first_ok: r.f, attempts: r.a || 0, box_round: r.r || 0 }); });
    flushing[uid] = Promise.resolve(c.from('practice_items').upsert(rows, { onConflict: 'user_id,mat_key,item_id' }).select('mat_key,item_id,status,due_at')).then(function (res) {
      if (res && res.error) throw res.error;
      var u2 = getU(uid);
      Object.keys(sent).forEach(function (k) { if (u2.out[k] === sent[k]) delete u2.out[k]; });
      ((res && res.data) || []).forEach(function (row) { var r = rec(u2, row.mat_key, row.item_id); if (!r) return; if (row.status === 'ok') { r.s = 'ok'; r.due = 0; } else if (r.s !== 'ok' && row.due_at) r.due = Date.parse(row.due_at) || r.due; });
      putU(uid, u2); return true;
    }).catch(function () { return false; }).then(function (x) { flushing[uid] = null; return x; });
    return flushing[uid];
  }
  function pull(uid, mats) {
    var c = AD.client(); if (!c || isPreview(uid)) return Promise.resolve(false);
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
  function refreshReady(uid) { // confirma con la hora del SERVIDOR qué errores ya se pueden repasar
    var c = AD.client(); if (!c || isPreview(uid)) return Promise.resolve(null);
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
    mats.forEach(function (m) { (m.items || []).forEach(function (q) { var r = rec(u, m.key, q.id); if (!r || r.s !== 'box') return; total++; if ((r.due || 0) <= t) ready++; else { next = next ? Math.min(next, r.due) : r.due; if (r.r > 0) tomorrow++; } }); });
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
      var k = mod.id + ':' + a.id; if (seen[k] || !kindOf(a.url)) return; seen[k] = 1;
      list.push({ key: k, moduleId: mod.id, activityId: a.id, name: (a.group ? a.group.split('·')[0].trim() + ' · ' : '') + a.name, group: a.group || '', url: a.url, kind: kindOf(a.url) });
    });
    return Promise.all(list.map(function (m) { return loadMaterial(m.url).then(function (r) { m.ok = r.ok; m.items = r.items || []; m.warn = r.warn || []; m.err = r.err || null; return m; }); }))
      .then(function (ms) { return ms.filter(function (m) { return m.ok; }); });
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
    VERSION: 'SESION-MIXTA-V1', CFG: CFG, enabledFor: enabledFor, kindOf: kindOf, parseHtml: parseHtml, loadMaterial: loadMaterial,
    todayMaterials: todayMaterials, matProgress: matProgress, buildSession: buildSession, arrange: arrange, metrics: metrics, runs: runs,
    answer: answer, flush: flush, pull: pull, refreshReady: refreshReady, boxStatus: boxStatus, addSeconds: addSeconds, merge: merge,
    hooks: hooks, plain: plain, _lastUid: null, transOk: transOk, bankOrder: bankOrder,
    weekReviews: weekReviews, weekState: function (uid) { return getU(uid).wk || null; }, live: live, weekMonday: weekMonday, weekDayIdx: weekDayIdx, LVREV: LVREV,
    _setAdapter: function (o) { Object.keys(o || {}).forEach(function (k) { AD[k] = o[k]; }); mem = {}; },
    _keys: { STATE_KEY: STATE_KEY, CACHE_KEY: CACHE_KEY }
  };
})();
