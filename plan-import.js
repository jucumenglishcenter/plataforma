/* JUCUM EC — 📄 Subir el plan del teacher (PLAN-IMPORT-V2 · 07-oct-2026)
 * V2: lee también los PDF en el FORMATO DE LA PLATAFORMA que el teacher arma con su Claude
 * (“Plan de clase · …” y “Práctica de la semana”). Su texto se guarda PALABRA POR PALABRA
 * (comprobador de palabras), el grupo y el día los elige el teacher, la sesión la numera la
 * plataforma (planes anteriores del grupo + 1) y la práctica dura desde la clase hasta el día
 * antes de la próxima, con el instructivo “Cómo practicar hoy” armado con SUS pasos.
 * Lee los .docx que el teacher genera con su Claude (Classroom Session Outline,
 * Outside-Practice Assignment, Class Tracker), los convierte en un plan de clase
 * + práctica diaria por fechas y detecta lo que falta.
 *  · El .docx se lee EN EL NAVEGADOR (no se envía a ningún servicio).
 *  · Se guarda el TEXTO extraído (liviano), nunca el archivo.
 *  · Registro de importación: `jucum_plan_imports_v1` (HEAVY → IndexedDB) +
 *    nube app_settings `plan_imports` con fusión por id (gana savedAt) y lápidas,
 *    igual que los planes de clase. Si la nube no responde, lo local no se toca.
 *  · Publicar = TT.upsertClassPlan + TT.addPracticePlan (uno por día). Nada se pisa
 *    sin id propio; republicar actualiza los mismos ids.
 */
(function () {
  const KEY = 'jucum_plan_imports_v1';
  const CLOUD = 'plan_imports';
  const MAXV = 12;
  const DN = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const MN = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const nowISO = () => new Date().toISOString();
  const peruToday = () => new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10);
  const j = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const w = (k, v) => { try { if (window.JUCUM_STORE) return window.JUCUM_STORE.setJSON(k, v); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { try { console.warn('plan-import: no se pudo guardar', e && e.name); } catch (e2) {} } };
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const parseYMD = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
  const fmtDay = s => { const d = parseYMD(s); return DN[d.getDay()] + ' ' + d.getDate() + ' ' + MN[d.getMonth()]; };
  const uid = p => p + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  const clone = o => JSON.parse(JSON.stringify(o));

  /* ════════ 1 · Lectura del .docx (o texto pegado) ════════ */
  let zipP = null;
  function loadZip() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    if (zipP) return zipP;
    zipP = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'; s.onload = () => res(window.JSZip); s.onerror = () => { zipP = null; rej(new Error('No se pudo cargar el lector de .docx (revisa la conexión).')); }; document.head.appendChild(s); });
    return zipP;
  }
  let pdfP = null;
  function loadPdf() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (pdfP) return pdfP;
    pdfP = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
      s.onload = () => { const L = window.pdfjsLib || window['pdfjs-dist/build/pdf']; if (!L) { pdfP = null; rej(new Error('No se pudo iniciar el lector de PDF.')); return; } L.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js'; res(L); };
      s.onerror = () => { pdfP = null; rej(new Error('No se pudo cargar el lector de PDF (revisa la conexión).')); }; document.head.appendChild(s); });
    return pdfP;
  }
  /* Texto del PDF renglón por renglón (agrupa por altura, ordena por posición). */
  async function pdfLines(buf) {
    const L = await loadPdf(); const doc = await L.getDocument({ data: buf }).promise; const out = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const tc = await (await doc.getPage(p)).getTextContent(); const rows = [];
      tc.items.forEach(it => { if (!it.str) return; const y = it.transform[5], x = it.transform[4]; let r = rows.find(q => Math.abs(q.y - y) < 3); if (!r) { r = { y, items: [] }; rows.push(r); } r.items.push({ x, s: it.str, w: it.width || 0 }); });
      rows.sort((a, b) => b.y - a.y).forEach(r => { r.items.sort((a, b) => a.x - b.x); let t = '', end = null; r.items.forEach(i => { if (end != null && i.x - end > 1.5 && !/\s$/.test(t) && !/^\s/.test(i.s)) t += ' '; t += i.s; end = i.x + i.w; }); t = t.replace(/\s+/g, ' ').trim(); if (t) out.push(t); });
    }
    return out;
  }
  function blocksFromXml(xml) {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const body = doc.getElementsByTagNameNS(W, 'body')[0]; if (!body) return [];
    const pText = p => { let t = ''; const walk = n => { for (const c of n.childNodes) { if (c.namespaceURI === W && c.localName === 't') t += c.textContent; else if (c.namespaceURI === W && (c.localName === 'tab' || c.localName === 'br')) t += ' '; else if (c.childNodes && c.childNodes.length) walk(c); } }; walk(p); return t.replace(/\s+/g, ' ').trim(); };
    const out = [];
    for (const n of body.childNodes) {
      if (n.namespaceURI !== W) continue;
      if (n.localName === 'p') { const t = pText(n); if (t) out.push({ t: 'p', text: t }); }
      else if (n.localName === 'tbl') {
        const rows = [];
        for (const tr of n.childNodes) { if (tr.localName !== 'tr') continue; const cells = []; for (const tc of tr.childNodes) { if (tc.localName !== 'tc') continue; const ps = []; for (const p of tc.getElementsByTagNameNS(W, 'p')) { const t = pText(p); if (t) ps.push(t); } cells.push(ps.join(' ')); } if (cells.some(c => c)) rows.push(cells); }
        if (rows.length) out.push({ t: 'tbl', rows });
      }
    }
    return out;
  }
  async function readFile(file) {
    const name = file.name || 'documento';
    if (/\.pdf$/i.test(name)) { const lines = await pdfLines(await file.arrayBuffer()); if (!lines.length) throw new Error('“' + name + '” no trae texto (¿es una foto escaneada?).'); return { name, lines, blocks: lines.map(t => ({ t: 'p', text: t })) }; }
    if (/\.docx$/i.test(name)) {
      const JSZip = await loadZip();
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const f = zip.file('word/document.xml'); if (!f) throw new Error('“' + name + '” no parece un .docx de Word.');
      return { name, blocks: blocksFromXml(await f.async('string')) };
    }
    return { name, blocks: blocksFromText(await file.text()) };
  }
  function blocksFromText(txt) {
    const out = []; let tbl = null;
    String(txt || '').split(/\r?\n/).forEach(line => {
      const l = line.replace(/\s+$/, ''); if (!l.trim()) { tbl = null; return; }
      const cells = l.includes('\t') ? l.split('\t').map(s => s.trim()) : (l.includes(' | ') ? l.split(' | ').map(s => s.trim()) : null);
      if (cells && cells.length > 1) { if (!tbl) { tbl = { t: 'tbl', rows: [] }; out.push(tbl); } tbl.rows.push(cells); }
      else { tbl = null; out.push({ t: 'p', text: l.trim() }); }
    });
    return out;
  }
  const plain = blocks => blocks.map(b => b.t === 'p' ? b.text : b.rows.map(r => r.join(' | ')).join('\n')).join('\n').slice(0, 40000);

  /* ════════ 2 · Secciones ════════ */
  const HEADS = {
    outline: ['session header', 'context feeding', 'warm-up', 'warm up', 'agenda', 'non-negotiables', 'adaptation notes', 'carry-forward', 'carry forward'],
    practice: ['assignment header', 'grammar practice', 'writing', 'story / dialogue practice', 'story practice', 'dialogue practice', 'quizlet', 'comprehension testing', 'completion reporting'],
    tracker: ['class identification', 'progress snapshot', 'standing practice note', 'backlog flags', 'grammar theme log', 'story / dialogue log', 'session history log', 'writing log', 'comprehension pre', 'hybrid time', 'grammar backlog', 'story technique', 'open items', 'session']
  };
  function kindOf(blocks) {
    const top = norm(blocks.slice(0, 3).map(b => b.text || '').join(' '));
    if (/classroom session outline/.test(top)) return 'outline';
    if (/outside practice assignment/.test(top)) return 'practice';
    if (/class tracker/.test(top)) return 'tracker';
    return null;
  }
  function sections(blocks, kind) {
    const heads = HEADS[kind] || [];
    const out = [{ head: '_intro', items: [] }];
    blocks.forEach((b, i) => {
      if (b.t === 'p' && b.text.length < 90 && !/[.:]$/.test(b.text) && i > 0) {
        const n = b.text.toLowerCase();
        if (heads.some(h => n.startsWith(h))) { out.push({ head: n, title: b.text, items: [] }); return; }
      }
      out[out.length - 1].items.push(b);
    });
    return out;
  }
  const sec = (S, ...names) => S.filter(s => names.some(n => s.head.startsWith(n)));
  function fieldMap(S) { const m = {}; S.forEach(s => s.items.forEach(b => { if (b.t === 'tbl') b.rows.forEach(r => { if (r.length >= 2 && r[0] && !/^field$/i.test(r[0])) m[r[0].trim()] = r.slice(1).join(' ').trim(); }); })); return m; }
  const paras = s => (s ? s.items : []).filter(b => b.t === 'p').map(b => b.text);
  const tables = s => (s ? s.items : []).filter(b => b.t === 'tbl');
  const pick = (m, ...keys) => { for (const x of keys) for (const k of Object.keys(m)) if (k.toLowerCase().startsWith(x)) return m[k]; return ''; };

  function parseOutline(blocks) {
    const S = sections(blocks, 'outline');
    const hdr = fieldMap(sec(S, 'session header'));
    const ag = sec(S, 'agenda')[0];
    const rows = [];
    tables(ag).forEach(t => t.rows.forEach(r => { if (/time block/i.test(r[0])) return; if (r.length >= 2) rows.push({ time: r[0], act: r[1] || '', skill: r[2] || '', notes: r[3] || '' }); }));
    const agParas = paras(ag);
    const trim = agParas.filter(p => /trim order|if running long|if time runs short/i.test(p));
    const warm = paras(sec(S, 'warm')[0]);
    const nonneg = paras(sec(S, 'non-negotiables')[0]).map(p => { const i = p.indexOf(':'); return i > 0 ? [p.slice(0, i).trim(), p.slice(i + 1).trim()] : [p, '']; });
    const adapt = paras(sec(S, 'adaptation')[0]);
    const carry = paras(sec(S, 'carry')[0]);
    const context = paras(sec(S, 'context')[0]);
    const intro = paras(S[0]).slice(1, 3);
    return { hdr, rows, trim, warm, nonneg, adapt, carry, context, intro };
  }
  function parsePractice(blocks) {
    const S = sections(blocks, 'practice');
    const hdr = fieldMap(sec(S, 'assignment header'));
    const tasks = []; const notes = [];
    S.forEach(s => {
      const h = s.head;
      if (h === '_intro' || h.startsWith('assignment header') || h.startsWith('completion reporting')) return;
      const area = h.startsWith('grammar') ? 'grammar' : h.startsWith('writing') ? 'writing' : h.startsWith('quizlet') ? 'quizlet' : h.startsWith('comprehension') ? 'comprehension' : 'story';
      const theme = (s.title || '').split(/—|-/).slice(1).join('-').trim();
      s.items.forEach(b => {
        if (b.t === 'tbl') {
          const head = b.rows[0].map(c => c.toLowerCase());
          const isHead = head.some(c => /^(theme|set|item|task|notes)$/.test(c));
          const ix = n => head.indexOf(n);
          b.rows.slice(isHead ? 1 : 0).forEach(r => {
            if (r.length < 2) return;
            const get = n => (isHead && ix(n) >= 0) ? (r[ix(n)] || '') : '';
            const t = { area, theme: get('theme') || theme, set: get('set') || get('item') || r[0], task: get('task') || r[1] || '', notes: get('notes') || '', raw: r.join(' | ') };
            tasks.push(t);
          });
          return;
        }
        const p = b.text;
        if (area === 'writing' && /^(cadence|classification|feedback loop)/i.test(p)) { notes.push(p); return; }
        if (area === 'writing' && /not assigned/i.test(p)) { notes.push(p); return; }
        if (area === 'comprehension' && /^(none|no new|no pre)/i.test(p)) { notes.push(p); return; }
        if (area === 'grammar' && /(are single combined sets|not yet assigned|combined across|covering both)/i.test(p)) { notes.push(p); return; }
        if (/^(\d(st|nd|rd|th) exposure|listen\s*&\s*read|read aloud\s*&\s*listen)/i.test(p) && tasks.length) { const last = tasks[tasks.length - 1]; (last.steps = last.steps || []).push(p); return; }
        tasks.push({ area, theme, set: '', task: p.replace(/^task assigned:\s*/i, ''), notes: '', raw: p });
      });
    });
    return { hdr, tasks, notes, intro: paras(S[0]).slice(1, 3) };
  }
  function parseTracker(blocks) {
    const S = sections(blocks, 'tracker');
    const hdr = fieldMap(S.filter(s => s.head.startsWith('class identification') || s.head.startsWith('progress snapshot')));
    const backlog = paras(sec(S, 'backlog flags')[0]);
    const hist = []; sec(S, 'session history').forEach(s => tables(s).forEach(t => t.rows.slice(1).forEach(r => { if (r[0]) hist.push(r); })));
    const report = []; S.filter(s => /completion report/.test(s.head)).forEach(s => paras(s).forEach(p => report.push(p)));
    const open = paras(sec(S, 'open items')[0]);
    return { hdr, backlog, hist, report, open, intro: paras(S[0]).slice(1, 3) };
  }

  /* ════════ 3 · Equivalencias con el catálogo ════════ */
  const STOP = new Set(['of', 'the', 'and', 'y', 'vs', 'a', 'an', 'to', 'de', 'la', 'el', 't1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 't10', 't11', 'theme']);
  const SYN = { affirmative: 'afirmativo', negative: 'negativo', questions: 'preguntas', question: 'preguntas', obligation: 'obligation', advice: 'advice' };
  const toks = s => norm(s).split(' ').filter(x => x && !STOP.has(x)).map(x => SYN[x] || x);
  function overlap(a, b) { const B = toks(b); let n = 0; toks(a).forEach(x => { if (B.some(y => y === x || (x.length >= 4 && y.length >= 4 && (y.startsWith(x.slice(0, 4)) || x.startsWith(y.slice(0, 4)))))) n++; }); return n; }
  function groupsOf(mod) { const g = []; (mod.activities || []).forEach(a => { if (a.group && !g.includes(a.group)) g.push(a.group); }); return g; }
  function bestGroup(mod, text, fallback) {
    let best = null, sc = 0;
    groupsOf(mod).forEach(g => { const s = overlap(text, g.replace(/^T\d+\s*·\s*/, '')); if (s > sc) { sc = s; best = g; } });
    return best || fallback || null;
  }
  function setKind(t) {
    const s = String(t || '');
    if (/\bGP1\b|\bP1\b|fill/i.test(s)) return 'fill';
    if (/\bGP2\b|\bP2\b|identif/i.test(s)) return 'id';
    if (/\bGP3\b|\bP3\b|transform|construction/i.test(s)) return 'tr';
    if (/summar|resumen/i.test(s)) return 'summary';
    return null;
  }
  function actOfKind(mod, group, kind) {
    const acts = (mod.activities || []).filter(a => !group || a.group === group);
    if (kind === 'summary') return acts.filter(a => a.type === 'summary');
    const re = { fill: /fill/i, id: /identif/i, tr: /transform/i }[kind];
    const suf = { fill: /-fill$/, id: /-id$/, tr: /-tr$/ }[kind];
    return acts.filter(a => a.type === 'grammar' && (suf.test(a.id) || re.test(a.name)));
  }
  const byType = (mod, t) => (mod.activities || []).find(a => a.type === t);
  function matchText(mod, text, ctxGroup) {
    const s = String(text || ''); const out = [];
    const push = (a, extra) => { if (a && !out.some(o => o.a.id === a.id && o.quizKey === (extra && extra.quizKey))) out.push({ a, ...(extra || {}) }); };
    if (/quizlet/i.test(s)) {
      const q = byType(mod, 'quizlet');
      if (q) { let any = false; if (/vocab/i.test(s)) { push(q, { quizKey: 'vocabulario' }); any = true; } if (/tradu|translat/i.test(s)) { push(q, { quizKey: 'traducir' }); any = true; } if (/order|ordenar|block/i.test(s)) { push(q, { quizKey: 'ordenar' }); any = true; } if (!any) push(q, {}); }
    }
    if (/\bstory\b|dialogue|dialog/i.test(s) && !/audio comprehension/i.test(s)) push(byType(mod, 'story'));
    if (/audio comprehension|listening/i.test(s)) push(byType(mod, 'listening'));
    if (/reading comprehension|pre-?test.*reading|lectora/i.test(s)) push(byType(mod, 'reading'));
    const sets = s.match(/\bG?P[123]\b(?:[-–]G?P?[123])?/gi) || [];
    sets.forEach(m => { const r = m.match(/[123]/g).map(Number); const lo = r[0], hi = r[r.length - 1]; for (let n = lo; n <= hi; n++) actOfKind(mod, ctxGroup, ['fill', 'id', 'tr'][n - 1]).slice(0, 1).forEach(a => push(a)); });
    if (/grammar summar|summary|resumen|\bsteps? \d/i.test(s)) { const g = bestGroup(mod, s, ctxGroup); actOfKind(mod, g, 'summary').forEach(a => push(a)); }
    return out;
  }

  /* ── Instrucciones en español para el alumno (diccionario; lo demás queda editable) ── */
  function esFor(kind, t, a) {
    const s = t.task + ' ' + t.notes + ' ' + t.set;
    if (kind === 'fill') return 'Completa los espacios en blanco.';
    if (kind === 'id') return /full|complete|completa/i.test(s) ? 'Identifica si la estructura es correcta o incorrecta. Haz el set completo.' : 'Identifica si la estructura es correcta o incorrecta.';
    if (kind === 'tr') return /remaining|beyond|tonight/i.test(s) ? 'Termina las oraciones que empezamos en clase.' : 'Arma y transforma las oraciones.';
    if (kind === 'summary') return /before|pre-?read|ahead/i.test(s) ? 'Léelo ANTES de la próxima clase: lo veremos ahí.' : 'Complétalo o repásalo (los 5 pasos).';
    if (a && a.type === 'quizlet') { if (t._q === 'traducir') return /timed|challenge/i.test(s) ? 'Reto cronometrado de 5 minutos.' : 'Practica las tarjetas de traducción.'; if (t._q === 'ordenar') return /timed|challenge/i.test(s) ? 'Reto contra el reloj: ordena oraciones de 4 a 6 bloques (2–5 min).' : 'Ordena los bloques de cada oración.'; return /multiple/i.test(s) ? 'Sesiones cortas de 5 minutos, varias veces.' : 'Sesión corta: 5 minutos o menos.'; }
    if (a && a.type === 'listening' && t.area === 'writing') return 'Usa las preguntas y opciones del listening y escribe las respuestas correctas en oraciones completas.';
    if (a && a.type === 'story') {
      if (/\bAI\b/.test(s) && !(t.steps || []).length) return 'Simulación con IA: pega el diálogo en una IA y practícalo (una pasada).';
      if ((t.steps || []).length) return t.steps.map((x, i) => (i + 1) + ') ' + stepEs(x)).join(' · ');
      if (/read.?aloud/i.test(s) && /computer|playback|reply/i.test(s)) return 'Lee un rol en voz alta y escucha la respuesta del otro personaje.';
      if (/subject|s-v-c|block/i.test(s)) return 'Sigue leyendo y separa cada oración en Sujeto / Verbo / Complemento.';
      if (/parallel|compar/i.test(s)) return 'Compara los bloques de cada oración en inglés y en español.';
      if (/continue/i.test(s)) return 'Sigue practicando como en clase.';
    }
    return null;
  }
  function stepEs(x) {
    if (/1st exposure/i.test(x)) return 'Audio en inglés + texto en español';
    if (/2nd exposure|parallel/i.test(x)) return 'Audio + texto en inglés con subtítulo en español';
    if (/^listen\s*&\s*read/i.test(x)) return 'Escucha y lee en voz alta';
    if (/^read aloud\s*&\s*listen/i.test(x)) return 'Lee en voz alta y escucha' + (/\bAI\b/.test(x) ? ' (simulación con IA)' : '');
    return x;
  }
  function labelFor(a, mod, t, quizKey) {
    if (a.type === 'quizlet') return 'Quizlet · ' + ({ vocabulario: 'Vocabulario', vocabulario2: 'Vocabulario · Parte 2', traducir: 'Traducir', ordenar: 'Ordenar' }[quizKey] || 'Vocabulario');
    if (a.type === 'story') { const m = String((t.theme || '') + ' ' + (t.raw || t.task || '')).match(/(story|dialogue)\s*(\d+)/i); return a.name.split('·')[0].trim() + (m ? ' · ' + (m[1][0].toUpperCase() + m[1].slice(1).toLowerCase()) + ' ' + m[2] : ''); }
    if (a.type === 'listening' && t.area === 'writing') return 'Writing · ' + a.name.split('·')[0].trim();
    if (a.type === 'grammar') return a.name + (a.group ? ' · ' + a.group.replace(/^T\d+\s*·\s*/, '') : '');
    return a.name;
  }

  /* ════════ 4 · Armar el borrador ════════ */
  function emojiFor(s) { s = norm(s); if (/quizlet|warm/.test(s)) return '🗂️'; if (/dialog/.test(s)) return '💬'; if (/writing/.test(s)) return '📝'; if (/audio comprehension|listening/.test(s)) return '🎧'; if (/story/.test(s)) return '📖'; if (/\bgp\d|\bp\d|practice set/.test(s)) return '✍️'; if (/grammar|summar|to be/.test(s)) return '🧠'; if (/attendance|wrap|closing|admin|cierre/.test(s)) return '✅'; return '•'; }
  function minsOf(time) { const m = String(time).match(/(\d+)\s*[-–]\s*(\d+)/); return m ? Math.max(0, Number(m[2]) - Number(m[1])) : 0; }
  function splitTitle(act) { const s = String(act); const i = s.search(/\s[—–-]\s|:\s/); if (i > 0 && i < 70) return [s.slice(0, i).trim(), s.slice(i).replace(/^\s*[—–:-]\s*/, '').trim()]; return [s.length > 80 ? s.slice(0, 77) + '…' : s, s.length > 80 ? s : '']; }
  const WD = { lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6, domingo: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, wednesday: 3, thu: 4, thur: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6, sun: 0, sunday: 0, lun: 1, mar: 2, mie: 3, jue: 4, vie: 5, sab: 6, dom: 0 };
  function daysFromPattern(s) { const out = []; norm(s).split(' ').forEach(t => { if (WD[t] != null && !out.includes(WD[t])) out.push(WD[t]); }); return out.sort(); }
  function dateFrom(s) { const m = String(s || '').match(/(20\d\d)-(\d\d)-(\d\d)/); return m ? m[0] : ''; }

  function groupHistory(groupId) {
    const TT = window.JUCUM_TT; const cps = TT ? TT.getClassPlans().filter(p => p.groupId === groupId && p.date) : [];
    cps.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const days = []; cps.slice(0, 8).forEach(p => { const d = parseYMD(p.date).getDay(); if (!days.includes(d)) days.push(d); });
    return { last: cps[0] || null, days: days.sort(), plans: cps };
  }
  function nextClassAfter(dateStr, days) { if (!dateStr || !days || !days.length) return null; const d0 = parseYMD(dateStr); for (let i = 1; i <= 7; i++) { const d = new Date(d0); d.setDate(d0.getDate() + i); if (days.includes(d.getDay())) return ymd(d); } return null; }
  function nextClassFrom(today, days) { if (!days || !days.length) return today; const d0 = parseYMD(today); for (let i = 0; i <= 7; i++) { const d = new Date(d0); d.setDate(d0.getDate() + i); if (days.includes(d.getDay())) return ymd(d); } return today; }

  function build(files, groupId, opts) {
    if (files.some(f => jKind(f))) return buildJ(files, groupId, opts || {});
    const D = window.JUCUM_DATA;
    const group = (D.GROUPS || []).find(g => g.id === groupId);
    if (!group) throw new Error('Elige primero el grupo.');
    const level = group.level;
    const mods = D.MODULE_CATALOG[level] || [];
    const by = { outline: null, practice: null, tracker: null }; const unknown = [];
    files.forEach(f => { const k = kindOf(f.blocks); if (k && !by[k]) by[k] = f; else unknown.push(f.name); });
    const O = by.outline ? parseOutline(by.outline.blocks) : null;
    const PR = by.practice ? parsePractice(by.practice.blocks) : null;
    const TR = by.tracker ? parseTracker(by.tracker.blocks) : null;
    const gaps = [];
    const hdr = Object.assign({}, TR ? TR.hdr : {}, PR ? PR.hdr : {}, O ? O.hdr : {});
    /* Módulo */
    const modTxt = pick(hdr, 'module / session', 'current module');
    const mNum = Number((modTxt.match(/module\s*(\d+)/i) || [])[1] || 0);
    const sNum = Number((modTxt.match(/session\s*(\d+)/i) || [])[1] || 0);
    const classModId = D.getClassModuleId ? D.getClassModuleId(groupId) : null;
    const byNum = mNum && D.getModuleNumber ? mods.find(m => D.getModuleNumber(level, m.id) === mNum) : null;
    let mod = byNum || mods.find(m => m.id === classModId) || mods[0];
    if (byNum && classModId && byNum.id !== classModId) {
      const cm = mods.find(m => m.id === classModId);
      gaps.push({ id: 'module', sev: 'need', t: '¿De qué módulo es este plan?', why: `El documento dice “${modTxt}” (${byNum.name}), pero el módulo en clase del grupo es ${cm ? cm.name : '—'}.`, type: 'select', opts: [byNum.id, classModId], optLabels: [byNum.name + ' (del documento)', (cm ? cm.name : classModId) + ' (en clase ahora)'], sug: byNum.id });
    }
    if (!mod) throw new Error('El nivel del grupo no tiene módulos en el catálogo.');
    const prog = pick(hdr, 'program / class', 'program');
    const docLv = /pre-?a1/i.test(prog) ? 'pre-a1' : /\bA2\b/i.test(prog) ? 'a2' : /\bA1\b/i.test(prog) ? 'a1' : null;
    if (docLv && docLv !== level) gaps.push({ id: 'level', sev: 'need', t: 'El documento es de ' + docLv.toUpperCase() + ' y el grupo es ' + String(level).toUpperCase(), why: 'Los materiales, los links de Quizlet y las prácticas salen del catálogo del grupo, así que no coincidirían con el plan. Lo normal es volver y elegir un grupo ' + docLv.toUpperCase() + '.', type: 'select', opts: ['ok'], optLabels: ['Sí, es para este grupo (lo adapto yo)'], sug: 'ok' });
    /* Tema actual (para P1/P2/P3 combinados) */
    const themeTxt = pick(hdr, 'current grammar theme') + ' ' + (PR ? PR.tasks.map(t => t.theme).join(' ') : '');
    const ctxGroup = bestGroup(mod, themeTxt, groupsOf(mod).find(g => (mod.activities || []).some(a => a.group === g && a.type === 'grammar')));
    /* Fecha, días, hora */
    const hist = groupHistory(groupId);
    const docDate = dateFrom(pick(hdr, 'date', 'assigned date'));
    const patDays = daysFromPattern(pick(hdr, 'meeting pattern'));
    const sugDays = patDays.length >= 1 && /tue|mon|wed|thu|fri|sat|sun/i.test(pick(hdr, 'meeting pattern')) ? patDays : hist.days;
    const today = peruToday();
    if (!docDate) gaps.push({ id: 'date', sev: 'need', t: 'Fecha de la clase', why: 'El documento no trae fecha.' + (sugDays.length ? ' Sugiero la próxima clase según los días del grupo.' : ''), type: 'date', sug: nextClassFrom(today, sugDays) });
    else if (docDate < today) gaps.push({ id: 'past', sev: 'need', t: 'La fecha del documento ya pasó (' + fmtDay(docDate) + ')', why: '¿Es el registro de una clase ya dada o lo quieres usar para la próxima clase?', type: 'select', opts: ['keep', 'move'], optLabels: ['Guardarlo con su fecha (' + fmtDay(docDate) + ')', 'Usarlo para la próxima clase (' + fmtDay(nextClassFrom(today, sugDays)) + ')'], sug: 'move', moveTo: nextClassFrom(today, sugDays) });
    gaps.push({ id: 'days', sev: patDays.length ? 'check' : (sugDays.length ? 'check' : 'need'), t: 'Días de clase del grupo', why: patDays.length ? `El tracker dice “${pick(hdr, 'meeting pattern')}”. Con eso sé cuándo es la próxima clase y reparto la práctica de los días intermedios.` : (sugDays.length ? 'El documento no dice los días; los saqué de los planes anteriores de este grupo.' : 'El documento no dice qué días hay clase y el grupo no tiene planes anteriores.'), type: 'days', sug: sugDays });
    gaps.push({ id: 'start', sev: 'need', t: 'Hora de inicio', why: 'El plan trae los minutos de cada bloque pero no la hora.' + (hist.last ? ' Sugiero la del último plan de este grupo.' : ''), type: 'time', sug: (hist.last && hist.last.startTime) || (group.schedule && (String(group.schedule).match(/\d{1,2}:\d{2}/) || [])[0]) || '09:00' });
    /* Bloques de clase */
    const blocks = []; const flags = [];
    if (O) O.rows.forEach((r, i) => {
      const [title, rest] = splitTitle(r.act);
      const steps = []; if (rest) steps.push(rest); if (r.notes) steps.push(r.notes);
      const mats = matchText(mod, r.act + ' ' + (/\bG?P[123]\b/.test(r.notes) ? '' : ''), ctxGroup).map(x => ({ activityId: x.a.id, quizKey: x.quizKey || null }));
      if (/non-?platform/i.test(r.act + ' ' + r.notes)) flags.push({ kind: 'ext', block: i });
      blocks.push({ id: 'b' + i + '_' + Math.random().toString(36).slice(2, 6), emoji: emojiFor(r.act + ' ' + r.skill), title, mins: minsOf(r.time) || 10, steps, skill: r.skill, en: r.act + (r.notes ? ' — ' + r.notes : ''), mats, warn: /monitor timing|do not rush|should not be cut|not be cut/i.test(r.notes) ? r.notes : '' });
    });
    if (O && O.trim.length && blocks.length) blocks[blocks.length - 1].steps.push('⚠ ' + O.trim.join(' '));
    if (!O) gaps.push({ id: 'nooutline', sev: 'check', t: 'No encontré el outline de la clase', why: 'Sube el “Classroom Session Outline” para armar los bloques. Puedes seguir solo con la práctica.', type: 'info' });
    /* Práctica */
    const practice = []; const unparsed = [];
    if (PR) PR.tasks.forEach((t, ti) => {
      const s = [t.set, t.task, t.notes, t.raw, (t.steps || []).join(' ')].join(' ');
      let found = [];
      const k = setKind(t.set) || (t.area === 'grammar' ? setKind(t.task) : null);
      if (t.area === 'grammar' && k) {
        const g = bestGroup(mod, t.theme + ' ' + t.set, ctxGroup);
        found = (k === 'summary' ? actOfKind(mod, /T\d\s*&\s*T\d|summaries/i.test(t.set) ? ctxGroup : g, 'summary') : actOfKind(mod, g, k).slice(0, 1)).map(a => ({ a }));
      } else if (t.area === 'writing') {
        found = matchText(mod, s, ctxGroup).filter(x => x.a.type === 'listening' || x.a.type === 'reading').slice(0, 1);
        gaps.push({ id: 'wr', sev: 'need', t: '¿Dónde entregan el writing?', why: 'El plan asigna un writing: “' + t.task.slice(0, 140) + '”.', type: 'select', opts: ['cuaderno', 'tarea'], optLabels: ['En el cuaderno, se revisa en clase', 'Como Tarea en la plataforma (texto o foto)'], sug: 'cuaderno' });
      } else if (t.area === 'quizlet') {
        const q = byType(mod, 'quizlet'); const key = /tradu|translat/i.test(s) ? 'traducir' : /order|ordenar|block/i.test(s) ? 'ordenar' : 'vocabulario';
        if (q) found = [{ a: q, quizKey: key }];
      } else found = matchText(mod, s, ctxGroup).filter(x => x.a.type !== 'quizlet');
      if (!found.length) { unparsed.push({ i: ti, text: t.raw || t.task }); return; }
      found.forEach(f => {
        const kind = f.a.type === 'grammar' ? (/-fill$|fill/i.test(f.a.id + f.a.name) ? 'fill' : /-id$|identif/i.test(f.a.id + f.a.name) ? 'id' : 'tr') : f.a.type === 'summary' ? 'summary' : null;
        const es = esFor(kind, Object.assign({}, t, { _q: f.quizKey }), f.a);
        practice.push({ id: 'p' + practice.length + '_' + Math.random().toString(36).slice(2, 5), moduleId: mod.id, activityId: f.a.id, type: f.a.type, quizKey: f.quizKey || null,
          label: labelFor(f.a, mod, t, f.quizKey), note: es || '', noteEs: !!es, en: (t.set ? t.set + ' — ' : '') + t.task + (t.notes ? ' (' + t.notes + ')' : '') + ((t.steps || []).length ? ' · ' + t.steps.join(' · ') : ''),
          onlyPending: /if not already|still outstanding|outstanding for|if not done|not yet completed|priority completion/i.test(s), prio: /priority|prioridad/i.test(s) ? 1 : 0,
          daily: /daily|every day|multiple times|always included/i.test(s) ? 1 : 0, ai: /\bAI\b/.test(s) ? 1 : 0, days: null, manual: false });
      });
    });
    if (!PR) gaps.push({ id: 'nopractice', sev: 'check', t: 'No encontré la práctica fuera de clase', why: 'Sube el “Outside-Practice Assignment” para armar la práctica diaria de los alumnos.', type: 'info' });
    /* Faltantes de la práctica */
    const q = byType(mod, 'quizlet');
    const qField = { vocabulario: 'quizVocabulario', vocabulario2: 'quizVocabulario2', traducir: 'quizTraducir', ordenar: 'quizOrdenar' };
    const needQ = [...new Set(practice.filter(p => p.quizKey).map(p => p.quizKey))].filter(k => !(q && q[qField[k]]));
    needQ.forEach(k => gaps.push({ id: 'qz-' + k, sev: 'need', t: 'Link de Quizlet “' + k + '”', why: 'La práctica pide este juego y el catálogo del módulo no tiene el link.', type: 'url', sug: '' }));
    if (practice.some(p => p.ai)) gaps.push({ id: 'ai', sev: 'need', t: 'Simulación con IA: ¿qué ve el alumno?', why: 'El plan pide una simulación con IA del diálogo. El alumno necesita un link o instrucciones claras.', type: 'text', sug: 'Copia el diálogo, pégalo en una IA (ChatGPT o Claude) y escribe: “Practice this dialogue with me. You are person B.”' });
    const notEs = practice.filter(p => !p.noteEs);
    if (notEs.length) gaps.push({ id: 'es', sev: 'check', t: notEs.length + ' instrucción(es) para el alumno sin traducir', why: 'No tengo una frase en español para: ' + notEs.map(p => '“' + p.label + '”').join(', ') + '. Escríbela en “Revisar y editar” o déjala vacía (el alumno verá solo el nombre del material).', type: 'info' });
    if (unparsed.length) gaps.push({ id: 'unparsed', sev: 'check', t: unparsed.length + ' línea(s) de la práctica que no supe ubicar', why: 'No las descarté: quedan guardadas en el plan como nota. ' + unparsed.map(u => '“' + u.text.slice(0, 90) + '”').join(' · '), type: 'info', list: unparsed });
    if (flags.some(f => f.kind === 'ext')) gaps.push({ id: 'ext', sev: 'opt', t: 'Material fuera de la plataforma', why: 'Un bloque usa “non-platform materials”. Si tienes el link, lo pongo en ese bloque; si no, queda como nota.', type: 'url', sug: '' });
    /* Bloqueo por orden del módulo (prelectura de un tema posterior) */
    const gi = groupsOf(mod); const ci = gi.indexOf(ctxGroup);
    practice.filter(p => { const a = (mod.activities || []).find(x => x.id === p.activityId); return a && a.group && gi.indexOf(a.group) > ci && ci >= 0 && !a.open; }).forEach(p => gaps.push({ id: 'lock-' + p.activityId, sev: 'check', t: '“' + p.label + '” puede verse bloqueado', why: 'Es de un tema que viene después del actual en el orden del módulo. Revisa que el grupo lo tenga abierto antes de publicar, o quítalo de la práctica.', type: 'select', opts: ['keep', 'drop'], optLabels: ['Dejarlo en la práctica', 'Quitarlo de la práctica'], sug: 'keep', act: p.activityId }));
    /* Tamaño del grupo */
    const students = (D.STUDENTS || []).filter(s => s.group === groupId && s.active !== false);
    const sizeTxt = pick(hdr, 'class size');
    const sizeN = Number((sizeTxt.match(/\d+/) || [])[0] || 0);
    if (sizeN && students.length && sizeN !== students.length) gaps.push({ id: 'size', sev: 'check', t: 'Tamaño del grupo', why: `El documento dice “${sizeTxt}” y en la plataforma hay ${students.length} alumnos activos en el grupo.`, type: 'info' });
    /* Plan duplicado */
    const date0 = docDate || nextClassFrom(today, sugDays);
    const dup = hist.plans.find(p => p.date === date0);
    if (dup) gaps.push({ id: 'dup', sev: 'need', t: 'Ya hay un plan de clase de este grupo ese día', why: `“${dup.moduleName} · ${dup.sessionLabel}” (${fmtDay(dup.date)}). No se reemplaza nada sin tu permiso.`, type: 'select', opts: ['new', 'replace'], optLabels: ['Guardar como plan aparte (el otro queda igual)', 'Usar el mismo plan (el anterior queda en el historial de versiones)'], sug: 'new', dupId: dup.id });
    /* Contexto */
    const ctx = [];
    const add = (l, v) => { if (v) ctx.push([l, v]); };
    add('Ritmo', pick(hdr, 'pace status'));
    add('Tema actual', pick(hdr, 'current grammar theme'));
    add('Técnica', pick(hdr, 'technique tier', 'story technique tier'));
    add('Reparto del tiempo', pick(hdr, 'interaction vs'));
    add('Tamaño', sizeTxt);
    if (TR) TR.backlog.slice(0, 3).forEach(b => add('Pendientes', b));
    const draft = {
      level, groupId, moduleId: mod.id, moduleName: mod.name, sessionNum: sNum, sessionLabel: sNum ? 'Sesión ' + sNum : 'Sesión',
      docDate, date: date0, startTime: '', classDays: sugDays, lengthMin: Number((pick(hdr, 'session length').match(/\d+/) || [])[0] || 0) || blocks.reduce((a, b) => a + b.mins, 0) || 100,
      blocks, practice, ctx, ctxGroup,
      nonneg: O ? O.nonneg : [], adapt: O ? O.adapt.concat(O.trim) : [], carry: O ? O.carry : [], open: TR ? TR.open : [], lastReport: TR ? TR.report : [],
      intro: (O && O.intro) || [], notesPractice: PR ? PR.notes : [], unparsed, answers: {}, how: {}, carryDone: {}, myNotes: [], extLink: ''
    };
    distribute(draft);
    return { draft, gaps, found: { outline: !!O, practice: !!PR, tracker: !!TR }, unknown };
  }


  /* ════════ 4b · Formato de la plataforma (PDF “Plan de clase” / “Práctica de la semana”) ════════ */
  const jClean = s => String(s || '').replace(/[\u3400-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\uE000-\uF8FF]/g, '').replace(/\s+/g, ' ').trim();
  const jLines = f => (f.lines || plain(f.blocks).split('\n')).map(jClean).filter(l => l && !/^-- \d+ of \d+ --$/.test(l));
  const jOpen = s => !/[.!?)]$/.test(s);
  const RE_PLAN = /^Plan de clase\s*·\s*(.+)$/i, RE_SET = /^(Práctica de la semana|Cómo practicar hoy)\b/i;
  const RE_ROW = /^(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})\s+(\d+)\s*(?:['’′]|min\b)\s*(.+)$/;
  function jKind(f) { const L = jLines(f).slice(0, 6); if (L.some(l => RE_PLAN.test(l))) return 'jplan'; if (L.some(l => RE_SET.test(l))) return 'jset'; return null; }
  const J_EMO = [[/quizlet/i, '🗂️'], [/stor(y|ies)|historia|lectura|reading/i, '📖'], [/di[aá]logo|dialogue/i, '💬'], [/listening|audio/i, '🎧'], [/repaso de gram|resumen|summary/i, '🧠'], [/fill|identif|transform|pr[aá]ctica.*gram|\bP[123]\b/i, '✍️'], [/cierre|wrap/i, '✅']];
  function jEmo(t) { const m = t.match(/^(\p{Extended_Pictographic}[\uFE0F\u200D\p{Extended_Pictographic}]*)\s*/u); if (m) return [m[1], t.slice(m[0].length)]; const e = J_EMO.find(([r]) => r.test(t)); return [e ? e[1] : '•', t]; }
  function parsePlanJ(L0) {
    const P = { module: '', level: '', session: '', date: '', minutes: 0, emph: '', theme: '', blocks: [], src: [] };
    const cut = L0.findIndex(l => /COPIAR HASTA AQU/i.test(l)); const L = (cut < 0 ? L0 : L0.slice(0, cut)).filter(l => !/planificador$/i.test(l) && !/^Horario\b/i.test(l));
    let m, cur = null;
    L.slice(0, 5).forEach(l => { if ((m = l.match(RE_PLAN))) P.module = m[1]; if ((m = l.match(/^(PRE-?A1|A1|A2)\s*·\s*(Sesi[oó]n\s*\d+)?\s*·?\s*(\d{4}-\d{2}-\d{2})?/i))) { P.level = m[1].toLowerCase().replace('prea1', 'pre-a1'); P.session = m[2] || ''; P.date = m[3] || ''; } if ((m = l.match(/^(\d+)\s*min\s*(.*?)(?:\s(T\d+\s*·.+))?$/))) { P.minutes = +m[1]; P.emph = m[2]; P.theme = m[3] || ''; } });
    L.forEach(l => {
      if ((m = l.match(RE_ROW))) { const [e, ti] = jEmo(m[4].trim()); cur = { start: m[1], end: m[2], min: +m[3], e, title: ti, steps: [] }; P.blocks.push(cur); P.src.push(m[4]); return; }
      if (!cur) return; P.src.push(l); const st = cur.steps; if (st.length && jOpen(st[st.length - 1]) && /^[a-záéíóúñ(]/.test(l)) st[st.length - 1] += ' ' + l; else st.push(l);
    });
    return P;
  }
  function parseSetJ(L) {
    const S = { level: '', module: '', title: '', intro: '', acts: [], outro: '', src: [] }; let m;
    const idx = L.findIndex(l => RE_SET.test(l)); S.title = L[idx] || 'Práctica de la semana';
    if ((m = (L[idx - 1] || '').match(/^(PRE-?A1|A1|A2)\s*·\s*(.+)$/i))) { S.level = m[1].toLowerCase().replace('prea1', 'pre-a1'); S.module = m[2]; }
    let cur = null, end = false; const intro = [], out = [];
    L.slice(idx + 1).forEach(l => {
      S.src.push(l.replace(/^\d+\.?\s/, ''));
      if (end) { out.push(l); return; }
      if (/^Al terminar/i.test(l)) { end = true; out.push(l); return; }
      if ((m = l.match(/^(\d+)\s+(\D.*)$/)) && !/^\d+\.\s/.test(l)) { const [e, ti] = jEmo(m[2].replace(/^[•·]\s*/, '').trim()); cur = { n: +m[1], e, title: ti, sub: [], steps: [], tips: [] }; S.acts.push(cur); return; }
      if (!cur) { intro.push(l); return; }
      if ((m = l.match(/^(\d+)\.\s(.+)$/))) { cur.steps.push(m[2]); return; }
      const st = cur.steps; if (st.length && jOpen(st[st.length - 1]) && !cur.tips.length) { st[st.length - 1] += ' ' + l; return; }
      if (st.length) cur.tips.push(l); else cur.sub.push(l);
    });
    S.intro = intro.join(' '); S.outro = out.join(' ');
    return S;
  }
  function matchJ(mod, text, ctxGroup) {
    const s = String(text || ''); const out = []; const push = (a, x) => { if (a && !out.some(o => o.a.id === a.id)) out.push({ a, ...(x || {}) }); };
    const tm = s.match(/\bT(\d+)\b/); const tg = tm ? groupsOf(mod).find(g => new RegExp('^T' + tm[1] + '\\b').test(g)) : null;
    const grp = tg || bestGroup(mod, s, ctxGroup);
    if (/quizlet/i.test(s)) { const q = byType(mod, 'quizlet'); if (q) push(q, { quizKey: /tradu|translat/i.test(s) ? 'traducir' : /orden|order/i.test(s) ? 'ordenar' : 'vocabulario' }); return out; }
    if (/fill|\bP1\b|pr[aá]ctica\s*#?\s*1/i.test(s)) actOfKind(mod, grp, 'fill').slice(0, 1).forEach(a => push(a));
    if (/identif|\bP2\b|pr[aá]ctica\s*#?\s*2/i.test(s)) actOfKind(mod, grp, 'id').slice(0, 1).forEach(a => push(a));
    if (/transform|\bP3\b|pr[aá]ctica\s*#?\s*3/i.test(s)) actOfKind(mod, grp, 'tr').slice(0, 1).forEach(a => push(a));
    if (/resumen|summary|repaso de gram/i.test(s)) actOfKind(mod, grp, 'summary').slice(0, 1).forEach(a => push(a));
    if (out.length) return out;
    if (/listening|audio/i.test(s)) push(byType(mod, 'listening'));
    else if (/reading|comprensi[oó]n lectora/i.test(s)) push(byType(mod, 'reading'));
    else if (/stor(y|ies)|historia|di[aá]logo|dialogue|lectura/i.test(s)) push(byType(mod, 'story'));
    return out;
  }
  /* Grupo: días, hora y próximas clases (del nombre “Nivel - Días · h:mm am - h:mm pm” o de sus planes). */
  function to24(h, mi, ap) { h = Number(h); if (ap) { ap = ap.toLowerCase(); if (ap === 'pm' && h < 12) h += 12; if (ap === 'am' && h === 12) h = 0; } return String(h).padStart(2, '0') + ':' + mi; }
  function groupMeta(groupId) {
    const D = window.JUCUM_DATA; const g = (D.GROUPS || []).find(x => x.id === groupId); if (!g) return null;
    const txt = (g.name || '') + ' ' + (g.schedule || ''); const hist = groupHistory(groupId);
    let days = daysFromPattern(txt.split('·')[0] + ' ' + (g.schedule || '')); if (!days.length) days = hist.days;
    const tm = txt.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
    const start = tm ? to24(tm[1], tm[2], tm[3]) : ((hist.last && hist.last.startTime) || '');
    const today = peruToday(); const next = []; if (days.length) { const d0 = parseYMD(today); for (let i = 0; i < 21 && next.length < 3; i++) { const d = new Date(d0); d.setDate(d0.getDate() + i); if (days.includes(d.getDay())) next.push(ymd(d)); } }
    return { group: g, days, start, next, today, sessionFor: date => sessionFor(groupId, date), last: hist.last };
  }
  function sessionFor(groupId, date) { const ds = new Set(); groupHistory(groupId).plans.forEach(p => { if (p.date && p.date < date) ds.add(p.date); }); return ds.size + 1; }
  function buildJ(files, groupId, opts) {
    const D = window.JUCUM_DATA; const meta = groupMeta(groupId); if (!meta) throw new Error('Elige primero el grupo.');
    const level = meta.group.level; const mods = D.MODULE_CATALOG[level] || []; if (!mods.length) throw new Error('El nivel del grupo no tiene módulos en el catálogo.');
    let pf = null, sf = null; const unknown = [];
    files.forEach(f => { const k = jKind(f); if (k === 'jplan' && !pf) pf = f; else if (k === 'jset' && !sf) sf = f; else unknown.push(f.name); });
    const P = pf ? parsePlanJ(jLines(pf)) : null; const S = sf ? parseSetJ(jLines(sf)) : null;
    const gaps = [];
    /* Módulo: el del documento si existe en el catálogo; si no, el de clase. */
    const docMod = (P && P.module) || (S && S.module) || '';
    const classModId = D.getClassModuleId ? D.getClassModuleId(groupId) : null;
    const byName = docMod ? mods.find(m => norm(m.name) === norm(docMod)) || mods.find(m => overlap(m.name, docMod) >= Math.max(1, toks(docMod).length)) : null;
    const mod = byName || mods.find(m => m.id === classModId) || mods[0];
    if (byName && classModId && byName.id !== classModId) { const cm = mods.find(m => m.id === classModId); gaps.push({ id: 'module', sev: 'need', t: '¿De qué módulo es este plan?', why: 'El documento dice “' + docMod + '”, pero el módulo en clase del grupo es ' + (cm ? cm.name : '—') + '.', type: 'select', opts: [byName.id, classModId], optLabels: [byName.name + ' (del documento)', (cm ? cm.name : classModId) + ' (en clase ahora)'], sug: byName.id }); }
    if (docMod && !byName) gaps.push({ id: 'modname', sev: 'check', t: 'No encontré el módulo “' + docMod + '”', why: 'Uso el módulo en clase del grupo (' + mod.name + ') para enlazar los materiales.', type: 'info' });
    const docLv = (P && P.level) || (S && S.level) || '';
    if (docLv && docLv !== level) gaps.push({ id: 'level', sev: 'need', t: 'El documento es de ' + docLv.toUpperCase() + ' y el grupo es ' + String(level).toUpperCase(), why: 'Los materiales salen del catálogo del grupo y no coincidirían. Lo normal es volver y elegir un grupo ' + docLv.toUpperCase() + '.', type: 'select', opts: ['ok'], optLabels: ['Sí, es para este grupo (lo adapto yo)'], sug: 'ok' });
    const ctxGroup = bestGroup(mod, (P && P.theme) || '', groupsOf(mod).find(g => (mod.activities || []).some(a => a.group === g && a.type === 'grammar')));
    /* Día (lo elige el teacher), hora y días del grupo */
    const date = opts.date || meta.next[0] || meta.today;
    const sNum = sessionFor(groupId, date);
    if (!meta.days.length) gaps.push({ id: 'days', sev: 'need', t: 'Días de clase del grupo', why: 'El nombre del grupo no dice los días y no tiene planes anteriores. Con esto sé hasta cuándo dura la práctica.', type: 'days', sug: [] });
    if (!meta.start) gaps.push({ id: 'start', sev: 'need', t: 'Hora de inicio', why: 'El nombre del grupo no trae el horario.', type: 'time', sug: '09:00' });
    /* Bloques: texto tal cual */
    const blocks = (P ? P.blocks : []).map((b, i) => ({ id: 'b' + i + '_' + Math.random().toString(36).slice(2, 6), emoji: b.e, title: b.title, mins: b.min, steps: b.steps.slice(), en: [b.title].concat(b.steps).join(' · '), mats: matchJ(mod, b.title, ctxGroup).map(x => ({ activityId: x.a.id, quizKey: x.quizKey || null })) }));
    /* Práctica de la semana: una tarea por actividad, todos los días */
    const practice = (S ? S.acts : []).map((x, i) => { const f = matchJ(mod, x.title + ' ' + x.sub.join(' '), ctxGroup)[0];
      return { id: 'p' + i + '_' + Math.random().toString(36).slice(2, 5), moduleId: mod.id, activityId: f ? f.a.id : null, type: f ? f.a.type : 'custom', quizKey: (f && f.quizKey) || null,
        label: x.title, emoji: x.e, sub: x.sub.slice(), steps: x.steps.slice(), tips: x.tips.slice(), note: '', noteEs: true, en: [x.title].concat(x.sub, x.steps, x.tips).join(' · '),
        onlyPending: false, prio: 0, daily: 1, ai: 0, days: null, manual: false }; });
    const noMat = practice.filter(p => !p.activityId);
    if (noMat.length) gaps.push({ id: 'nomat', sev: 'check', t: noMat.length + ' actividad(es) sin material enlazado', why: 'No supe a qué material del módulo corresponde: ' + noMat.map(p => '“' + p.label + '”').join(', ') + '. Se muestran igual en el instructivo, pero sin botón ▶. Puedes elegir el material en “Revisar y editar”.', type: 'info' });
    if (!P) gaps.push({ id: 'nooutline', sev: 'check', t: 'No subiste el plan de clase', why: 'Puedes publicar solo la práctica de la semana, o volver y subir también el PDF del plan.', type: 'info' });
    if (!S) gaps.push({ id: 'nopractice', sev: 'check', t: 'No subiste la práctica de la semana', why: 'Los alumnos no recibirán práctica con este plan. Vuelve y sube también el PDF de la práctica si la quieres publicar.', type: 'info' });
    /* Comprobador: cada renglón del documento debe estar en lo guardado */
    const nw = t => norm(t).split(' ').filter(Boolean);
    const outTxt = ' ' + nw([].concat(blocks.flatMap(b => [b.title].concat(b.steps)), S ? [S.intro] : [], practice.flatMap(p => [p.label].concat(p.sub, p.steps, p.tips)), S ? [S.outro] : []).join(' | ')).join(' ') + ' ';
    let total = 0, kept = 0; const lost = [];
    [].concat(P ? P.src : [], S ? S.src : []).forEach(l => { const w0 = nw(l); if (!w0.length) return; total += w0.length; if (outTxt.includes(' ' + w0.join(' ') + ' ')) kept += w0.length; else lost.push(l); });
    if (lost.length) gaps.push({ id: 'lost', sev: 'need', t: lost.length + ' renglón(es) del documento no quedaron en el plan', why: 'Para no cambiar tu texto, revísalos en “Revisar y editar”: ' + lost.map(l => '“' + l.slice(0, 90) + '”').join(' · '), type: 'select', opts: ['ok'], optLabels: ['Ya lo revisé'], sug: 'ok' });
    /* Plan del mismo día */
    const dup = groupHistory(groupId).plans.find(p => p.date === date);
    if (dup) gaps.push({ id: 'dup', sev: 'need', t: 'Ya hay un plan de clase de este grupo ese día', why: '“' + (dup.moduleName || '') + ' · ' + (dup.sessionLabel || '') + '” (' + fmtDay(dup.date) + '). No se reemplaza nada sin tu permiso.', type: 'select', opts: ['new', 'replace'], optLabels: ['Guardar como plan aparte (el otro queda igual)', 'Usar el mismo plan (el anterior queda en el historial de versiones)'], sug: 'new', dupId: dup.id });
    const q = byType(mod, 'quizlet'); const qField = { vocabulario: 'quizVocabulario', traducir: 'quizTraducir', ordenar: 'quizOrdenar' };
    [...new Set(practice.filter(p => p.quizKey).map(p => p.quizKey))].filter(k => !(q && q[qField[k]])).forEach(k => gaps.push({ id: 'qz-' + k, sev: 'need', t: 'Link de Quizlet “' + k + '”', why: 'La práctica pide este juego y el catálogo del módulo no tiene el link.', type: 'url', sug: '' }));
    const ctx = []; if (P && P.emph) ctx.push(['Énfasis', P.emph]); if (P && P.theme) ctx.push(['Tema', P.theme]);
    if ((P && P.session) && P.session.replace(/\D/g, '') !== String(sNum)) ctx.push(['Sesión', 'El PDF dice “' + P.session + '”; la plataforma la registra como Sesión ' + sNum + ' de este grupo.']);
    if (P && P.date && P.date !== date) ctx.push(['Fecha', 'El PDF dice ' + P.date + '; se usa el día que elegiste (' + fmtDay(date) + ').']);
    const draft = { mode: 'jucum', level, groupId, moduleId: mod.id, moduleName: mod.name, sessionNum: sNum, sessionLabel: 'Sesión ' + sNum,
      docDate: '', date, startTime: meta.start, classDays: meta.days, lengthMin: (P && P.minutes) || blocks.reduce((a, b) => a + b.mins, 0) || 100,
      blocks, practice, ctx, ctxGroup, emphasis: (P && P.emph) || '', setTitle: (S && S.title) || 'Práctica de la semana', setIntro: (S && S.intro) || '', setOutro: (S && S.outro) || '',
      fidelity: { kept, total }, nonneg: [], adapt: [], carry: [], open: [], lastReport: [], intro: [], notesPractice: [], unparsed: [], answers: {}, how: {}, carryDone: {}, myNotes: [], extLink: '' };
    distribute(draft);
    return { draft, gaps, found: { outline: !!P, practice: !!S, tracker: false }, unknown };
  }

  /* ════════ 5 · Fechas y reparto de la práctica ════════ */
  function effective(draft, gaps) {
    const a = draft.answers || {};
    let date = draft.date;
    if (a.date) date = a.date;
    if (a.past === 'move') { const g = (gaps || []).find(x => x.id === 'past'); date = (g && g.moveTo) || nextClassFrom(peruToday(), a.days || draft.classDays); }
    if (a.past === 'keep' && draft.docDate) date = draft.docDate;
    const days = a.days || draft.classDays || [];
    const next = nextClassAfter(date, days);
    const list = []; if (next) { const d = parseYMD(date); if (draft.mode !== 'jucum') d.setDate(d.getDate() + 1); while (ymd(d) < next) { list.push(ymd(d)); d.setDate(d.getDate() + 1); } }
    if (!list.length) list.push(next ? date : date);
    return { date, next, practiceDays: list, startTime: a.start || draft.startTime || '' };
  }
  function distribute(draft, gaps) {
    const e = effective(draft, gaps); const n = e.practiceDays.length; let i = 0;
    draft.practice.slice().sort((a, b) => (b.prio || 0) - (a.prio || 0)).forEach(p => {
      if (p.manual && Array.isArray(p.days)) { p.days = p.days.filter(d => e.practiceDays.includes(d)); return; }
      p.days = p.daily ? e.practiceDays.slice() : [e.practiceDays[i % n]]; if (!p.daily) i++;
    });
    return e;
  }

  /* ════════ 6 · Registro de importaciones (borrador · versiones · nube) ════════ */
  const stampOf = r => String((r && (r.savedAt || r.createdAt)) || '');
  function mergeById(local, cloud) {
    const out = new Map(); (Array.isArray(cloud) ? cloud : []).forEach(r => { if (r && r.id) out.set(r.id, r); });
    (Array.isArray(local) ? local : []).forEach(r => { if (!r || !r.id) return; const p = out.get(r.id); if (!p || stampOf(r) >= stampOf(p)) out.set(r.id, r); });
    const cut = new Date(Date.now() - 60 * 86400000).toISOString();
    return Array.from(out.values()).filter(r => !(r._deleted && String(r._deleted) < cut));
  }
  const raw = () => j(KEY, []);
  function cloudPush(all) { if (!window.JUCUM_SB) return Promise.resolve(false); try { return window.JUCUM_SB.getClient().from('app_settings').upsert({ key: CLOUD, value: all }, { onConflict: 'key' }).then(r => !(r && r.error), () => false); } catch (e) { return Promise.resolve(false); } }
  async function cloudLoad() {
    if (!window.JUCUM_SB) return;
    let cloud = null;
    try { const { data } = await window.JUCUM_SB.getClient().from('app_settings').select('value').eq('key', CLOUD).maybeSingle(); cloud = data && Array.isArray(data.value) ? data.value : null; } catch (e) { return; }
    if (cloud == null) { const l = raw(); if (l.length) cloudPush(l); return; }
    const merged = mergeById(raw(), cloud); w(KEY, merged);
    if (JSON.stringify(merged) !== JSON.stringify(cloud)) cloudPush(merged);
  }
  function list() { return raw().filter(r => r && !r._deleted).sort((a, b) => stampOf(b).localeCompare(stampOf(a))); }
  function get(id) { return raw().find(r => r.id === id && !r._deleted) || null; }
  let pushT = null;
  function save(rec, opts) {
    const all = raw(); const r = Object.assign({}, rec, { savedAt: nowISO() });
    const i = all.findIndex(x => x.id === r.id); if (i >= 0) all[i] = r; else all.unshift(r);
    w(KEY, all);
    clearTimeout(pushT); pushT = setTimeout(() => cloudPush(raw()), (opts && opts.now) ? 0 : 1500);
    return r;
  }
  function create(files, groupId, opts) {
    const res = build(files, groupId, opts);
    const rec = { id: uid('pi'), groupId, createdAt: nowISO(), savedAt: nowISO(), status: 'draft',
      files: files.map(f => f.name), text: files.map(f => ({ name: f.name, text: plain(f.blocks) })),
      draft: res.draft, gaps: res.gaps, found: res.found, unknown: res.unknown,
      versions: [{ n: 1, label: 'Leída del documento', at: nowISO(), draft: clone(res.draft) }], published: null };
    return save(rec, { now: true });
  }
  function addVersion(rec, label) {
    const v = (rec.versions || []).slice(); v.push({ n: (v.length ? v[v.length - 1].n : 0) + 1, label, at: nowISO(), draft: clone(rec.draft) });
    while (v.length > MAXV) v.splice(1, 1);   // la v1 (lo que se leyó) nunca se descarta
    return Object.assign({}, rec, { versions: v });
  }
  function remove(id) { const all = raw().map(r => r.id === id ? Object.assign({}, r, { _deleted: nowISO(), savedAt: nowISO() }) : r); w(KEY, all); cloudPush(all); }
  function gapsLeft(rec) { const a = rec.draft.answers || {}; return (rec.gaps || []).filter(g => g.sev === 'need' && a[g.id] === undefined).length; }

  /* ════════ 7 · Publicar (plan de clase + un set de práctica por día) ════════ */
  function catalogMod(rec) { const D = window.JUCUM_DATA; return (D.MODULE_CATALOG[rec.draft.level] || []).find(m => m.id === (rec.draft.answers.module || rec.draft.moduleId)); }
  function publish(rec) {
    const TT = window.JUCUM_TT; const d = rec.draft; const a = d.answers || {};
    if (gapsLeft(rec)) throw new Error('Faltan datos obligatorios.');
    const mod = catalogMod(rec); if (!mod) throw new Error('No encontré el módulo en el catálogo.');
    const e = effective(d, rec.gaps);
    const drop = new Set((rec.gaps || []).filter(g => g.id.startsWith('lock-') && a[g.id] === 'drop').map(g => g.act));
    const matIds = []; d.blocks.forEach(b => (b.mats || []).forEach(m => { if (!matIds.some(x => x.activityId === m.activityId)) matIds.push(m); }));
    const materials = matIds.map(m => { const act = (mod.activities || []).find(x => x.id === m.activityId); if (!act) return null; const base = { moduleId: mod.id, activityId: act.id, name: act.name, type: act.type, group: act.group || null, url: act.url || null }; if (act.type === 'quizlet') base.quizLinks = { vocabulario: act.quizVocabulario || '', vocabulario2: act.quizVocabulario2 || '', traducir: a['qz-traducir'] || act.quizTraducir || '', ordenar: a['qz-ordenar'] || act.quizOrdenar || '' }; return base; }).filter(Boolean);
    const total = d.blocks.reduce((s, b) => s + (Number(b.mins) || 0), 0);
    if (d.mode === 'jucum' && !d.blocks.length) return publishSetJ(rec, mod, e, a, drop, null);
    const dupG = (rec.gaps || []).find(g => g.id === 'dup');
    const planId = (rec.published && rec.published.classPlanId) || (dupG && a.dup === 'replace' ? dupG.dupId : undefined);
    const classPlan = { id: planId, kind: 'class', level: d.level, groupId: rec.groupId, moduleId: mod.id, moduleName: mod.name, themeGroup: d.ctxGroup || '', lengthMin: total || d.lengthMin,
      date: e.date, startTime: e.startTime || '09:00', sessionLabel: d.sessionLabel, emphasis: d.emphasis || (d.blocks.map(b => b.title).slice(0, 3).join(' · ')),
      blocks: d.blocks.map(b => ({ id: b.id, emoji: b.emoji, title: b.title, mins: Number(b.mins) || 0, steps: (b.steps || []).concat(b.warn && !(b.steps || []).some(s => s.includes(b.warn)) ? ['⚠ ' + b.warn] : []) })),
      materials, source: { importId: rec.id, files: rec.files, importedAt: rec.createdAt }, carry: d.carry, nextNotes: d.myNotes || [] };
    const cpId = TT.upsertClassPlan(classPlan);
    if (d.mode === 'jucum') return publishSetJ(rec, mod, e, a, drop, cpId);
    const qz = { traducir: a['qz-traducir'], ordenar: a['qz-ordenar'], vocabulario: a['qz-vocabulario'] };
    const oldIds = (rec.published && rec.published.practicePlanIds) || {};
    const newIds = {};
    e.practiceDays.forEach(day => {
      const acts = d.practice.filter(p => (p.days || []).includes(day) && !drop.has(p.activityId)).sort((x, y) => (y.prio || 0) - (x.prio || 0))
        .map(p => ({ moduleId: p.moduleId, activityId: p.activityId, label: p.label, type: p.type, note: (p.ai && a.ai ? (p.note ? p.note + ' ' : '') + '🤖 ' + a.ai : p.note) || '', quizKey: p.quizKey || null, quizUrl: (p.quizKey && qz[p.quizKey]) || null, onlyPending: !!p.onlyPending, prio: p.prio || 0, fromImport: true }));
      if (!acts.length) return;
      const title = '📌 ' + mod.name + ' · ' + d.sessionLabel + ' · ' + fmtDay(day);
      if (oldIds[day]) { TT.updatePracticePlan(oldIds[day], { title, activities: acts, dates: [day], assignToStudents: true }); newIds[day] = oldIds[day]; }
      else newIds[day] = TT.addPracticePlan({ groupId: rec.groupId, title, activities: acts, dates: [day], assignToStudents: true, note: 'Plan del teacher (importado)', source: { importId: rec.id } });
    });
    Object.keys(oldIds).forEach(day => { if (!newIds[day]) TT.deletePracticePlan(oldIds[day]); });
    let r2 = Object.assign({}, rec, { status: 'published', published: { classPlanId: cpId, practicePlanIds: newIds, at: nowISO(), date: e.date } });
    r2 = addVersion(r2, 'Publicada');
    return save(r2, { now: true });
  }
  /* Formato de la plataforma: UN set de práctica para todos los días hasta la próxima clase,
   * con el instructivo armado con los pasos del teacher, tal cual. */
  const J_MIN = { quizlet: 10, story: 15, reading: 15, listening: 14, summary: 8, grammar: 12 };
  function guideJ(d, mod) {
    const steps = d.practice.map(p => ({ emoji: p.emoji || '•', title: p.label, type: p.type || 'custom', kind: p.type || 'custom', min: J_MIN[p.type] || 10,
      linesEs: (p.steps || []).filter(x => String(x).trim()), linesEn: [], noteEs: (p.tips || []).join(' '), noteEn: '', focus: (p.sub || []).join(' · '),
      group: null, moduleId: p.activityId ? p.moduleId : null, activityId: p.activityId || null }));
    return { v: 2, lang: 'es', title: d.setTitle || 'Práctica de la semana', moduleName: mod.name, level: d.level, introEs: d.setIntro || '', introEn: d.setIntro || '', steps,
      totalMin: steps.reduce((s, x) => s + (x.min || 0), 0), note: '', closingEs: d.setOutro || '', closingEn: d.setOutro || '', fromImport: true };
  }
  function publishSetJ(rec, mod, e, a, drop, cpId) {
    const TT = window.JUCUM_TT; const d = rec.draft;
    const qz = { traducir: a['qz-traducir'], ordenar: a['qz-ordenar'], vocabulario: a['qz-vocabulario'] };
    const items = d.practice.filter(p => !drop.has(p.activityId));
    const acts = items.filter(p => p.activityId).map(p => ({ moduleId: p.moduleId, activityId: p.activityId, label: p.label, type: p.type, note: '', quizKey: p.quizKey || null, quizUrl: (p.quizKey && qz[p.quizKey]) || null, onlyPending: !!p.onlyPending, prio: p.prio || 0, fromImport: true }));
    const oldIds = (rec.published && rec.published.practicePlanIds) || {}; const newIds = {};
    if (items.length && e.practiceDays.length) {
      const days = e.practiceDays; const title = '📌 ' + mod.name + ' · ' + d.sessionLabel + ' · ' + fmtDay(days[0]) + (days.length > 1 ? ' → ' + fmtDay(days[days.length - 1]) : '');
      const body = { title, activities: acts, dates: days, assignToStudents: true, guide: guideJ(Object.assign({}, d, { practice: items }), mod) };
      if (oldIds.set) { TT.updatePracticePlan(oldIds.set, body); newIds.set = oldIds.set; }
      else newIds.set = TT.addPracticePlan(Object.assign({ groupId: rec.groupId, note: 'Plan del teacher (PDF)', source: { importId: rec.id } }, body));
    }
    Object.keys(oldIds).forEach(k => { if (!newIds[k]) TT.deletePracticePlan(oldIds[k]); });
    let r2 = Object.assign({}, rec, { status: 'published', published: { classPlanId: cpId, practicePlanIds: newIds, at: nowISO(), date: e.date } });
    r2 = addVersion(r2, 'Publicada');
    return save(r2, { now: true });
  }
  /* Comprueba que lo publicado llegó a la nube; si no, vuelve a empujar (hasta 3 veces). */
  async function verifyCloud(rec, tries) {
    if (!window.JUCUM_SB || !rec.published) return 'local';
    const TT = window.JUCUM_TT; const ids = Object.values(rec.published.practicePlanIds || {});
    const noCP = !rec.published.classPlanId;
    try {
      const sb = window.JUCUM_SB.getClient();
      const [cp, pp] = await Promise.all([sb.from('app_settings').select('value').eq('key', 'class_plans').maybeSingle(), sb.from('app_settings').select('value').eq('key', 'practice_plans').maybeSingle()]);
      const cpOk = noCP || ((cp.data && cp.data.value) || []).some(x => x.id === rec.published.classPlanId && !x._deleted);
      const ppOk = ids.every(id => ((pp.data && pp.data.value) || []).some(x => x.id === id && !x._deleted));
      if (cpOk && ppOk) return 'cloud';
    } catch (e) {}
    if ((tries || 0) >= 3) return 'local';
    try { const p = TT.getClassPlans().find(x => x.id === rec.published.classPlanId); if (p) TT.upsertClassPlan(p); ids.forEach(id => TT.updatePracticePlan(id, {})); } catch (e) {}
    await new Promise(r => setTimeout(r, 2500));
    return verifyCloud(rec, (tries || 0) + 1);
  }

  /* ════════ 8 · Avance real (última clase / reporte) ════════ */
  function marksFor(groupId, items) {
    const D = window.JUCUM_DATA; const sts = (D.STUDENTS || []).filter(s => s.group === groupId && s.active !== false);
    return sts.map(s => { const prog = D.getStudentProgress(s.id); return { id: s.id, name: (s.fullName || s.username || '').split(' ').slice(0, 2).join(' '), marks: items.map(it => { const e = prog.completed && prog.completed[it.moduleId + ':' + it.activityId]; if (!e) return 0; const noGrade = ['story', 'summary', 'quizlet', 'dialog'].includes(it.type); return (noGrade || D.entryPassed(e, s.level, s.group)) ? 1 : 0.5; }) }; });
  }
  function lastClass(groupId, beforeDate) {
    const TT = window.JUCUM_TT; if (!TT) return null;
    const cut = parseYMD(beforeDate); const from = new Date(cut); from.setDate(cut.getDate() - 10);
    const pps = TT.getPracticePlans().filter(p => p.groupId === groupId && p.assignToStudents !== false && (p.dates || []).some(d => d < beforeDate && d >= ymd(from)));
    if (!pps.length) return null;
    const items = []; pps.forEach(p => (p.activities || []).forEach(a => { if (a.moduleId && a.activityId && !items.some(x => x.moduleId === a.moduleId && x.activityId === a.activityId)) items.push(a); }));
    const dates = pps.flatMap(p => p.dates || []).filter(d => d < beforeDate).sort();
    return { items: items.slice(0, 7), rows: marksFor(groupId, items.slice(0, 7)), from: dates[0], to: dates[dates.length - 1] };
  }
  function report(rec) {
    const D = window.JUCUM_DATA; const d = rec.draft; const e = effective(d, rec.gaps);
    const items = []; d.practice.forEach(p => { if (!p.activityId) return; if (!items.some(x => x.activityId === p.activityId && x.quizKey === p.quizKey)) items.push(p); });
    const sts = (D.STUDENTS || []).filter(s => s.group === rec.groupId && s.active !== false);
    const lines = items.map(p => { p = Object.assign({ en: p.label || '' }, p);
      let t = 0, ok = 0; const pend = [];
      sts.forEach(s => {
        const prog = D.getStudentProgress(s.id); const en = prog.completed && prog.completed[p.moduleId + ':' + p.activityId];
        const passedBefore = en && en.date && String(en.date).slice(0, 10) < e.date && (['story', 'summary', 'quizlet'].includes(p.type) || D.entryPassed(en, s.level, s.group));
        if (p.onlyPending && passedBefore) return;
        t++; const done = en && en.date && String(en.date).slice(0, 10) >= e.date;
        if (done) ok++; else pend.push((s.fullName || s.username || '').split(' ')[0]);
      });
      return `- ${p.en.split(' (')[0]}: ${ok}/${t} completed${pend.length ? ' (pending: ' + pend.join(', ') + ')' : ''}`;
    });
    const HOW = { ok: 'as planned', trim: 'trimmed', no: 'not covered' };
    const blocks = d.blocks.map((b, i) => `- ${b.mins} min · ${b.title}: ${HOW[(d.how || {})[i]] || 'not reported'}`);
    const carry = (d.carry || []).map((c, i) => `- ${c}: ${(d.carryDone || {})[i] ? 'DONE' : 'not confirmed'}`);
    const notes = (d.myNotes || []).map(n => '- ' + n.t);
    const g = (D.GROUPS || []).find(x => x.id === rec.groupId);
    return ['JUCUM English Center — Completion Report', `${g ? g.name : ''} · ${d.moduleName} · ${d.sessionLabel} (${e.date})`, `Report window: ${e.date} → ${e.next || 'next session'}. Generated by the platform from real student activity.`, '',
      'OUTSIDE PRACTICE (per item)', ...lines, '', 'IN-CLASS PLAN — what actually happened', ...blocks, '', 'CARRY-FORWARD CHECK', ...(carry.length ? carry : ['- (none)']),
      ...(notes.length ? ['', "TEACHER'S NOTES FOR NEXT SESSION", ...notes] : [])].join('\n');
  }

  setTimeout(cloudLoad, 2500);
  window.JUCUM_PLANIMPORT = { version: 'PLAN-IMPORT-V2', groupMeta, sessionFor, guideJ, jKind, readFile, blocksFromText, build, create, save, get, list, remove, addVersion, publish, verifyCloud, effective, distribute, gapsLeft, lastClass, marksFor, report, fmtDay, peruToday, cloudLoad };
})();
