/* JUCUM EC — Instructivo de práctica ("Cómo practicar hoy")
 * Genera, a partir de las actividades elegidas por el profesor, un documento
 * de PASOS (cómo practicar en casa) y lo muestra como una guía VISUAL —al estilo
 * de los instructivos de registro/uso— tanto en la vista previa del profesor
 * como en "Tu práctica de hoy" del alumno.
 *
 * API global: window.JUCUM_GUIDE
 *   build(level, picked, moduleName, {title, note})  → objeto guide {steps,...}
 *   openOverlay(guide, {links, studentName})         → abre el visor a pantalla
 *   printDoc(guide)                                   → ventana imprimible / PDF
 */
(function () {
  'use strict';

  var TYPE_ICON = { story:'📖', reading:'📕', listening:'🎧', grammar:'✍️', summary:'🧠', quizlet:'🗂️' };
  // Orden pedagógico: vocabulario → story → comprensión → escucha → resumen → gramática
  var TYPE_RANK = { quizlet:1, story:2, reading:3, listening:4, summary:5, grammar:6 };
  // tipo de actividad → "método" del instructivo oficial
  var KIND_OF = { story:'reading', reading:'reading', listening:'listening', grammar:'grammar', summary:'summary', quizlet:'vocab' };
  var MIN_OF = { reading:15, listening:14, grammar:12, summary:8, vocab:10 };

  function rankOf(a) { return (TYPE_RANK[a.type] || 7) + (/transform|p3/i.test(a.label || '') ? 0.3 : /identif|p2/i.test(a.label || '') ? 0.2 : 0.1); }

  /* ───────── Instrucciones PREDETERMINADAS (metodología oficial, por nivel) ─────────
   * Reading / Listening / Grammar provienen del documento del profesor; Vocabulario
   * y Resumen son apoyos breves. El profesor puede editarlas y guardarlas como favoritas. */
  // Cada método guarda ES + EN (EN proviene del documento original del profesor).
  var READING_STD = {
    es: { note: 'No traduzcas la historia para responder las preguntas.', lines: [
      'Lee y escucha la historia (sin traducción).',
      'Responde las preguntas (primero en Español → Español).',
      'Traduce solo las partes de la historia donde respondiste incorrectamente.',
      'Mejora tu puntaje repitiendo el ejercicio después de esperar 8–12 h.',
      'Opcional: si llegas a 100%, repite el proceso tras 12 h eligiendo las preguntas en inglés.'
    ]},
    en: { note: 'Don\u2019t translate the story to answer the questions.', lines: [
      'Read & listen to the story (without translation).',
      'Answer the questions (1st in Español → Español).',
      'Translate the parts of the story where you answered incorrectly.',
      'Try to improve your score by repeating the exercise after waiting 8–12 hours.',
      'Optional: if you get 100%, repeat after 12 hours selecting the questions in English.'
    ]}
  };
  var LISTENING_A2 = {
    es: { lines: [
      'Re-lee / escucha la historia o el diálogo.',
      'Escucha primero el audio.',
      'Si dudas del significado, lee la pregunta y escucha una 2.ª vez.',
      'Si aún dudas, mira el guion en inglés.',
      'Responde las preguntas. [Si fallas ➡️ escucha el audio con el texto en inglés y confirma con la traducción al español.]'
    ]},
    en: { lines: [
      'Re-read / listen to the story or dialogue.',
      'Listen to the audio first.',
      'If uncertain of the meaning, read the question and listen a 2nd time.',
      'If still uncertain, view the English script.',
      'Answer the questions. [If incorrect ➡️ listen to the audio with the English text and confirm with the Spanish translation.]'
    ]}
  };
  var LISTENING_A1 = {
    es: { lines: [
      'Paso 1 — Repasa la historia original (Materiales): escucha en inglés sincronizando el audio con la traducción al español.',
      'Lee la historia en inglés mientras escuchas el audio.',
      'Paso 2 — Comprensión auditiva: escucha el audio.',
      'Lee la pregunta y escucha una 2.ª vez. Si aún dudas, mira el guion en inglés.',
      'Responde las preguntas. [Si fallas ➡️ escucha con el texto en inglés y confirma con la traducción al español.]'
    ]},
    en: { lines: [
      'Step 1 — Review the original story (Materials): listen in English synchronizing the audio with the Spanish translation.',
      'Read the story in English while listening to the audio.',
      'Step 2 — Listening comprehension: listen to the audio.',
      'Read the question and listen a 2nd time. If still uncertain, view the English script.',
      'Answer the questions. [If incorrect ➡️ listen with the English text and confirm with the Spanish translation.]'
    ]}
  };
  var LISTENING_PREA1 = {
    es: { lines: [
      'Parte 1 — Repasa la historia (Materiales): léela en voz alta en español.',
      'Sincroniza el audio en inglés con el texto en español, y luego con el texto en inglés.',
      'Escucha y lee en voz alta la historia en inglés.',
      'Parte 2 — Escucha el audio; revisa la pregunta y escúchalo una 2.ª vez. Si dudas, revisa la transcripción en inglés.',
      'Responde las preguntas. [Si fallas ➡️ escucha con el texto en inglés y la traducción al español.]',
      'Opcional: mejora tu puntaje repitiendo tras esperar al menos 8 h.'
    ]},
    en: { lines: [
      'Part 1 — Review the story (Materials): read it aloud in Spanish.',
      'Synchronize the English audio with the Spanish text, then with the English text.',
      'Listen and read the story aloud in English.',
      'Part 2 — Listen to the audio; review the question and listen a 2nd time. If uncertain, review the English transcript.',
      'Answer the questions. [If incorrect, listen with the English text and the Spanish translation.]',
      'Optional: improve your score by repeating after waiting at least 8 hours.'
    ]}
  };
  var GRAMMAR_STD = {
    es: { note: 'Esperar 8 h o más evita depender de la memoria de corto plazo.', lines: [
      'Completa las preguntas de práctica.',
      'Revisa la información de gramática de las preguntas que respondiste mal.',
      'Mejora tu puntaje repitiendo el ejercicio tras esperar 8–12 h.'
    ]},
    en: { note: 'Waiting 8 hours or more reduces the use of short-term memory.', lines: [
      'Complete the practice questions.',
      'Review the grammar information provided for any questions answered incorrectly.',
      'Try to improve your score by repeating the exercise after an 8–12 hour waiting period.'
    ]}
  };
  var READING_PREA1 = {
    es: { note: 'No traduzcas la historia para responder las preguntas.', lines: [
      'Lee la traducción en español antes de leer la historia en inglés.',
      'Escucha y lee la historia (sin traducción).',
      'Responde las preguntas.',
      'Traduce solo las partes donde respondiste incorrectamente.',
      'Mejora tu puntaje repitiendo el ejercicio después de esperar 8–12 h.',
      'Opcional: si llegas a 100%, repite tras 12 h eligiendo las preguntas en inglés.'
    ]},
    en: { note: 'Don\u2019t translate the story to answer the questions.', lines: [
      'Read the Spanish translation before reading the story in English.',
      'Listen and read the story (without translation).',
      'Answer the questions.',
      'Translate only the parts where you answered incorrectly.',
      'Try to improve your score by repeating the exercise after waiting 8–12 hours.',
      'Optional: if you get 100%, repeat after 12 hours selecting the questions in English.'
    ]}
  };
  var DEFAULT_STEPS = {
    'a2':     { reading: READING_STD,   listening: LISTENING_A2,    grammar: GRAMMAR_STD },
    'a1':     { reading: READING_STD,   listening: LISTENING_A1,    grammar: GRAMMAR_STD },
    'pre-a1': { reading: READING_PREA1, listening: LISTENING_PREA1, grammar: GRAMMAR_STD }
  };
  function vocabStd() { return {
    es: { lines: ['Combina cada palabra con su significado y dila en voz alta.', 'Repite el set hasta que te salga rápido.'] },
    en: { lines: ['Match each word with its meaning and say it aloud.', 'Repeat the set until it comes quickly.'] }
  }; }
  function summaryStd(grp) { return {
    es: { lines: ['Lee el resumen de gramática ' + (grp ? '«' + grp + '» ' : '') + 'con calma.', 'Responde el mini-cuestionario de autochequeo (es solo para ti, no afecta tu nota).'] },
    en: { lines: ['Read the grammar summary ' + (grp ? '«' + grp + '» ' : '') + 'calmly.', 'Answer the self-check quiz (just for you, it doesn\u2019t affect your grade).'] }
  }; }

  function defaultStepData(level, kind, group) {
    var lv = DEFAULT_STEPS[(level || '').toLowerCase()] || DEFAULT_STEPS['a1'];
    if (kind === 'vocab') return vocabStd();
    if (kind === 'summary') return summaryStd(group);
    return lv[kind] || { es: { lines: [] }, en: { lines: [] } };
  }

  /* Construye un PASO (cómo hacerlo) según el tipo de actividad + nivel. Guarda ES y EN. */
  function stepFor(a, level) {
    var label = a.label || a.name || 'Actividad';
    var kind = KIND_OF[a.type] || 'reading';
    var data = defaultStepData(level, kind, a.group);
    var es = data.es || { lines: [] }, en = data.en || { lines: [] };
    return {
      emoji: TYPE_ICON[a.type] || '•', title: label, group: a.group || null, type: a.type, kind: kind,
      min: MIN_OF[kind] || 10,
      linesEs: (es.lines || []).slice(), linesEn: (en.lines || []).slice(),
      noteEs: es.note || '', noteEn: en.note || '',
      tema: a.group || null, storyNo: null, dialogNo: null, focus: '',
      review: !!a.review, reviewModule: a.moduleName || '',
      moduleId: a.moduleId || null, activityId: a.activityId || null
    };
  }

  var INTRO = {
    es: function (lv, n) { return lv === 'pre-a1'
      ? 'No necesitas saber mucho inglés todavía: solo sigue los pasos en orden y apóyate en el español cuando lo necesites. ¡Tú puedes! 🌱'
      : 'Practicar un poquito en casa hace toda la diferencia. Sigue estos ' + n + ' paso' + (n === 1 ? '' : 's') + ' en orden — sin apuro, a tu ritmo.'; },
    en: function (lv, n) { return lv === 'pre-a1'
      ? 'You don\u2019t need to know much English yet: just follow the steps in order and lean on Spanish when you need it. You can do it! 🌱'
      : 'A little practice at home makes all the difference. Follow these ' + n + ' step' + (n === 1 ? '' : 's') + ' in order — no rush, at your own pace.'; }
  };
  var CLOSING = {
    es: 'Al terminar, cuéntale a Neuro 🧠 lo que practicaste. Cada minuto suma a tu racha 🔥 y te acerca al podio de la liga 🏆.',
    en: 'When you finish, tell Neuro 🧠 what you practiced. Every minute adds to your streak 🔥 and brings you closer to the league podium 🏆.'
  };

  function build(level, picked, moduleName, opts) {
    opts = opts || {};
    var lv = (level || '').toLowerCase();
    var lang = opts.lang || 'es';   // 'es' | 'en' | 'par'
    var ordered = (picked || []).slice().sort(function (a, b) { return rankOf(a) - rankOf(b); });
    var steps = ordered.map(function (a) { return stepFor(a, level); });
    var total = steps.reduce(function (s, x) { return s + (x.min || 0); }, 0);
    return {
      v: 2, lang: lang,
      title: opts.title || 'Cómo practicar hoy',
      moduleName: moduleName || '',
      level: level || '',
      introEs: INTRO.es(lv, steps.length), introEn: INTRO.en(lv, steps.length),
      steps: steps,
      totalMin: total,
      note: opts.note || '',
      closingEs: CLOSING.es, closingEn: CLOSING.en
    };
  }

  /* ───────── Render visual (estilo instructivo) ───────── */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' })[c]; }); }
  var LV = { 'pre-a1':{ c:'#F9A825', d:'#E65100', code:'Pre-A1' }, 'a1':{ c:'#2196F3', d:'#0D47A1', code:'A1' }, 'a2':{ c:'#2EA84B', d:'#1B5E20', code:'A2' } };

  function innerHTML(guide, opts) {
    opts = opts || {};
    var lv = LV[(guide.level || '').toLowerCase()] || LV['a1'];
    var links = opts.links || null;
    var lang = guide.lang || 'es';
    // Helpers que respetan idioma + retrocompatibilidad con guías viejas (lines/note/intro/closing)
    var pickEs = function (s) { return (s.linesEs && s.linesEs.length) ? s.linesEs : (s.lines || []); };
    var pickEn = function (s) { return (s.linesEn && s.linesEn.length) ? s.linesEn : pickEs(s); };
    var noteEs = function (s) { return s.noteEs != null ? s.noteEs : (s.note || ''); };
    var noteEn = function (s) { return s.noteEn != null ? s.noteEn : noteEs(s); };
    var linesBlock = function (s) {
      var es = pickEs(s), en = pickEn(s);
      if (lang === 'en') return en.length ? '<ol class="jg-ol">' + en.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol>' : '';
      if (lang === 'par') {
        var n = Math.max(es.length, en.length);
        var out = '';
        for (var i = 0; i < n; i++) { out += '<li><span class="jg-en">' + esc(en[i] || '') + '</span>' + (es[i] ? '<span class="jg-es">' + esc(es[i]) + '</span>' : '') + '</li>'; }
        return '<ol class="jg-ol jg-par">' + out + '</ol>';
      }
      return es.length ? '<ol class="jg-ol">' + es.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol>' : '';
    };
    var noteBlock = function (s) {
      var es = noteEs(s), en = noteEn(s);
      if (lang === 'en') return en ? '<div class="jg-snote">📌 ' + esc(en) + '</div>' : '';
      if (lang === 'par') return en ? '<div class="jg-snote">📌 <span class="jg-en">' + esc(en) + '</span>' + (es ? '<span class="jg-es">' + esc(es) + '</span>' : '') + '</div>' : '';
      return es ? '<div class="jg-snote">📌 ' + esc(es) + '</div>' : '';
    };
    var stepsHTML = guide.steps.map(function (s, i) {
      var href = links && links[i] ? links[i] : null;
      var lines = linesBlock(s);
      var note = noteBlock(s);
      var grp = s.group ? '<span class="jg-grp">' + esc(s.group) + '</span>' : '';
      var review = s.review ? '<div class="jg-review">🔁 Repasamos nuevamente el módulo ' + esc(s.reviewModule || 'anterior') + '</div>' : '';
      var focus = s.focus ? '<div class="jg-focus">🎯 ' + esc(s.focus) + '</div>' : '';
      var goTxt = lang === 'en' ? '▶ Start this activity' : '▶ Empezar esta actividad';
      var go = href ? '<a class="jg-go" href="' + esc(href) + '" target="_blank" rel="noopener">' + goTxt + '</a>' : '';
      return '<div class="jg-step">' +
        '<div class="jg-num">' + (i + 1) + '</div>' +
        '<div class="jg-sb">' +
          '<h2>' + s.emoji + ' ' + esc(s.title) + grp + ' <span class="jg-min">~' + (s.min || 10) + ' min</span></h2>' +
          review + focus + lines + note + go +
        '</div></div>';
    }).join('');
    var intro = lang === 'en' ? (guide.introEn || guide.intro || '') : (guide.introEs || guide.intro || '');
    if (lang === 'par') intro = (guide.introEn || guide.intro || '');
    var closing = lang === 'en' ? (guide.closingEn || guide.closing || '') : (guide.closingEs || guide.closing || '');
    if (lang === 'par') closing = (guide.closingEn || guide.closing || '');
    var noteLbl = lang === 'en' ? 'Note from your teacher:' : 'Nota de tu profesor:';
    var noteHTML = guide.note ? '<div class="jg-note"><span class="ic">📌</span><div><b>' + noteLbl + '</b> ' + esc(guide.note) + '</div></div>' : '';
    var hi = opts.studentName ? ((lang === 'en' ? 'Hi, ' : '¡Hola, ') + esc(opts.studentName) + (lang === 'en' ? '! ' : '! ')) : '';
    var stepsLbl = (lang === 'en' ? ' step' : ' paso') + (guide.steps.length === 1 ? '' : 's');
    var totLbl = lang === 'en' ? ' min total' : ' min en total';
    return '' +
      '<div class="jg-hero" style="background:linear-gradient(135deg,' + lv.c + ',' + lv.d + ')">' +
        '<div class="jg-wm">🧠 JUCUM English Center</div>' +
        '<div class="jg-kick">' + esc(lv.code) + (guide.moduleName ? ' · ' + esc(guide.moduleName) : '') + '</div>' +
        '<h1>' + esc(guide.title) + '</h1>' +
        '<p>' + hi + esc(intro) + '</p>' +
        '<div class="jg-chips"><span class="jg-chip">📋 ' + guide.steps.length + stepsLbl + '</span><span class="jg-chip">⏱️ ~' + (guide.totalMin || 0) + totLbl + '</span></div>' +
      '</div>' +
      '<div class="jg-body">' +
        (guide.steps.length ? stepsHTML : '<div class="jg-empty">Aún no hay actividades en este instructivo.</div>') +
        noteHTML +
        '<div class="jg-close"><span class="ic">🎉</span><div>' + esc(closing) + '</div></div>' +
      '</div>';
  }

  var CSS = '' +
    '.jg-scope{font-family:"Nunito",system-ui,sans-serif;color:#2A2A2A;line-height:1.5;text-align:left;}' +
    '.jg-scope *{box-sizing:border-box;}' +
    '.jg-card{max-width:760px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.22);}' +
    '.jg-hero{color:#fff;padding:26px 30px 22px;position:relative;overflow:hidden;}' +
    '.jg-hero::after{content:"";position:absolute;top:-45%;right:-6%;width:210px;height:210px;background:rgba(255,255,255,.10);border-radius:50%;}' +
    '.jg-wm{font-family:"Fredoka",sans-serif;font-weight:700;font-size:13px;letter-spacing:.04em;display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,.18);border:1.5px solid rgba(255,255,255,.32);padding:5px 12px;border-radius:9px;margin-bottom:12px;position:relative;}' +
    '.jg-kick{font-size:11.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;opacity:.92;position:relative;}' +
    '.jg-hero h1{font-family:"Fredoka",sans-serif;font-weight:600;font-size:27px;line-height:1.12;margin:4px 0 0;position:relative;}' +
    '.jg-hero p{font-size:14px;opacity:.95;margin-top:8px;max-width:560px;position:relative;}' +
    '.jg-chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;position:relative;}' +
    '.jg-chip{background:rgba(255,255,255,.20);border:1.5px solid rgba(255,255,255,.34);border-radius:20px;padding:4px 12px;font-size:12px;font-weight:800;}' +
    '.jg-body{padding:24px 30px 30px;}' +
    '.jg-step{display:grid;grid-template-columns:auto 1fr;gap:16px;padding:20px 0;border-top:1px solid #EEEAE0;}' +
    '.jg-step:first-child{border-top:none;padding-top:6px;}' +
    '.jg-num{width:42px;height:42px;border-radius:13px;background:#1F3A8A;color:#fff;font-family:"Fredoka",sans-serif;font-weight:600;font-size:20px;display:flex;align-items:center;justify-content:center;}' +
    '.jg-sb h2{font-family:"Fredoka",sans-serif;font-weight:600;font-size:18px;margin:0 0 4px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}' +
    '.jg-min{font-family:"Nunito",sans-serif;font-size:11px;font-weight:800;color:#8a7f6a;background:#F4F1E8;border-radius:12px;padding:2px 9px;}' +
    '.jg-grp{font-family:"Nunito",sans-serif;font-size:11.5px;font-weight:800;color:#6C4FB0;background:#F3EEFB;border-radius:8px;padding:2px 9px;}' +
    '.jg-sb p{font-size:14px;color:#5a5a5a;margin:0;}' +
    '.jg-ol{margin:6px 0 0;padding-left:20px;color:#444;font-size:13.5px;}' +
    '.jg-ol li{margin:4px 0;line-height:1.45;}' +
    '.jg-par li{margin:8px 0;}' +
    '.jg-en{display:block;font-weight:700;color:#2A2A2A;}' +
    '.jg-es{display:block;font-size:12px;color:#9a9a9a;font-style:italic;margin-top:1px;}' +
    '.jg-snote .jg-es{margin-top:2px;}' +
    '.jg-snote{margin-top:9px;font-size:12.5px;font-weight:700;color:#9c6a00;background:#FFF7E6;border:1px solid #F2DFB0;border-radius:9px;padding:7px 11px;}' +
    '.jg-focus{display:inline-block;margin:2px 0 6px;font-size:12.5px;font-weight:800;color:#fff;background:linear-gradient(135deg,#6C4FB0,#4A2E86);border-radius:9px;padding:5px 12px;}' +
    '.jg-review{display:block;margin:2px 0 7px;font-size:13px;font-weight:800;color:#9c4a00;background:#FFF1E0;border:1px solid #F2C99A;border-radius:9px;padding:7px 12px;}' +
    '.jg-tips{display:flex;flex-wrap:wrap;gap:7px;margin-top:9px;}' +
    '.jg-tip{font-size:12px;font-weight:700;color:#9c6a00;background:#FFF7E6;border:1px solid #F2DFB0;border-radius:9px;padding:5px 10px;}' +
    '.jg-go{display:inline-block;margin-top:11px;font-size:13px;font-weight:800;color:#fff;background:linear-gradient(135deg,#3F5BB8,#1F3A8A);border-radius:10px;padding:9px 15px;text-decoration:none;}' +
    '.jg-note{display:flex;gap:11px;align-items:flex-start;background:#EAF2FF;border:1.5px solid #BBD3F5;border-radius:14px;padding:14px 16px;margin-top:18px;font-size:13.5px;color:#15356b;}' +
    '.jg-note .ic{font-size:20px;line-height:1;}' +
    '.jg-close{display:flex;gap:12px;align-items:center;background:#F3FBF5;border:1.5px solid #BFE6CB;border-radius:14px;padding:15px 17px;margin-top:14px;font-size:13.5px;font-weight:700;color:#1B5E20;}' +
    '.jg-close .ic{font-size:24px;}' +
    '.jg-empty{text-align:center;color:#9b9484;font-weight:700;padding:24px;}' +
    '@media(max-width:560px){.jg-hero{padding:22px 18px 18px;}.jg-hero h1{font-size:23px;}.jg-body{padding:18px 18px 24px;}.jg-step{gap:12px;}}';

  /* Overlay dentro de la app (lo que ve el alumno y la vista previa del profe). */
  function openOverlay(guide, opts) {
    opts = opts || {};
    var prev = document.getElementById('jg-overlay'); if (prev) prev.remove();
    var ov = document.createElement('div');
    ov.id = 'jg-overlay';
    // z-index al tope: debe quedar POR ENCIMA del visualizador "Ver como alumno"
    // (que usa 2147483601). Así la guía se ve DENTRO del visualizador, no solo al salir.
    ov.setAttribute('style', 'position:fixed;inset:0;z-index:2147483647;background:rgba(18,22,40,.62);backdrop-filter:blur(3px);overflow-y:auto;overflow-x:hidden;padding:22px 14px 60px;box-sizing:border-box;');
    ov.innerHTML =
      '<style>' + CSS + '</style>' +
      '<div class="jg-scope" style="position:relative;">' +
        '<div style="max-width:760px;margin:0 auto 12px;display:flex;gap:9px;justify-content:flex-end;">' +
          '<button id="jg-print" style="border:none;cursor:pointer;font-family:inherit;font-weight:800;font-size:13px;color:#1F3A8A;background:#fff;border-radius:10px;padding:9px 15px;box-shadow:0 4px 14px rgba(0,0,0,.18);">🖨️ Imprimir / PDF</button>' +
          '<button id="jg-close" style="border:none;cursor:pointer;font-family:inherit;font-weight:800;font-size:13px;color:#fff;background:rgba(0,0,0,.34);border-radius:10px;padding:9px 16px;">✕ Cerrar</button>' +
        '</div>' +
        '<div class="jg-card">' + innerHTML(guide, opts) + '</div>' +
      '</div>';
    document.body.appendChild(ov);
    document.body.style.overflow = 'hidden';
    function close() { ov.remove(); document.body.style.overflow = ''; }
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    ov.querySelector('#jg-close').addEventListener('click', close);
    ov.querySelector('#jg-print').addEventListener('click', function () { printDoc(guide, opts); });
  }

  function printDoc(guide, opts) {
    var w = window.open('', '_blank'); if (!w) return;
    w.document.write('<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(guide.title) + '</title>' +
      '<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@600;700;800&display=swap" rel="stylesheet">' +
      '<style>body{margin:0;background:#ECEAE3;padding:18px;}' + CSS + ' @media print{body{background:#fff;padding:0;}.jg-card{box-shadow:none;}}</style></head>' +
      '<body class="jg-scope"><div class="jg-card">' + innerHTML(guide, { studentName: opts && opts.studentName }) + '</div>' +
      '<scr' + 'ipt>window.onload=function(){setTimeout(function(){window.print();},350);}</scr' + 'ipt></body></html>');
    w.document.close();
  }

  window.JUCUM_GUIDE = { build: build, openOverlay: openOverlay, printDoc: printDoc, innerHTML: innerHTML };
})();
