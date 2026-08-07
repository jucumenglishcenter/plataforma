/* ════════════════════════════════════════════════════════════════════
   JUCUM Connect · conector para los materiales de GitHub
   ════════════════════════════════════════════════════════════════════
   Pega UNA línea al final de cada material de práctica (antes de </body>):

     <script src="https://jucum-english-center.netlify.app/jucum-connect.js"></script>

   Qué hace automáticamente:
   - Lee la identidad del alumno desde la URL (?jucum_uid=...&jucum_mod=...&jucum_act=...)
     que la plataforma agrega al abrir el material.
   - Muestra un chip flotante con el TIEMPO ACTIVO de práctica.
   - Cuenta SOLO tiempo REAL: pestaña visible + interacción reciente (mouse,
     teclado, scroll, touch, o audio/video reproduciéndose). Con la pestaña
     oculta o sin interacción el conteo se PAUSA solo (chip ⏸) y se reanuda
     al volver — el tiempo "de adorno" ya no se registra (fix tiempos repetidos).
   - Al terminar registra puntuación + minutos en Supabase y muestra una
     tarjeta con FRASE MOTIVACIONAL según el puntaje (motiva si va bien o mal).
   - Práctica libre, siempre la MEJOR nota (nunca baja). Regla de la ½ HORA:
     tras un intento registrado, la nota recién puede CAMBIAR 30 minutos
     después. El alumno puede repetir antes, pero se le recuerda que su nueva
     nota contará pasada la media hora (tiempo para repasar el feedback).
     No aplica a resúmenes/quizlet, stories ni exámenes. El anti-farmeo del
     XP lo maneja la plataforma (se re-gana 1 vez por semana).
   - Registro a prueba de fallas: si al terminar no hay internet, el resultado
     queda en una bandeja local (jucum_outbox_v1, solo texto) y se reenvía
     solo en la próxima práctica con conexión.
   - Si el material se abre SIN ?jucum_uid (fuera de la plataforma), entra en
     MODO PRUEBA: el contador y el aviso de inactividad funcionan igual, pero
     NO se registra nada en la nube.

   Cómo se completa una actividad (según el tipo de material):
   A) CON quiz/MCQ (readings, listenings, prácticas y resúmenes de gramática):
      en tu función de resultados dispara:
        window.dispatchEvent(new CustomEvent('jucum:done', { detail: { score: 86 } }))
      (score 0-100).
   B) SIN quiz (stories y diálogos): se registra automáticamente tras 4 minutos
      de LECTURA ACTIVA real (sin score, cuenta como practicado).
   ════════════════════════════════════════════════════════════════════ */
(function () {
  /* ══ 🔊 VOZ DE LOS MATERIALES (TTS) · motor blindado ═══════════════════
     Los materiales leen en voz alta con speechSynthesis (stories, readings y
     los audios del listening). Chrome/Edge tienen 3 fallas conocidas que
     hacían que el audio se oyera "lento y cortándose a cada rato":
       1) cancel() + speak() seguidos (así lo llama cada material en CADA
          frase): la voz nueva se pierde o tarda 1-3 s en arrancar → silencios
          largos entre frases (se percibe como lentitud) o el audio se detiene.
       2) A los ~15 s el motor se "duerme" y corta la frase por la mitad.
       3) getVoices() todavía vacío en la primera reproducción → usa la voz por
          defecto del sistema (robótica y lenta) en vez de la voz inglesa.
     Se arregla aquí UNA vez para TODOS los materiales (sin tocar el código de
     cada actividad): envolvemos speak/cancel con cola propia, troceo por
     frases, espera a que el motor esté libre y latido anti-sueño. */
  (function jecSpeechFix() {
    var S = window.speechSynthesis;
    if (!S || !window.SpeechSynthesisUtterance || window.__JEC_TTS) return;
    window.__JEC_TTS = 1;
    var nSpeak = S.speak.bind(S), nCancel = S.cancel.bind(S);
    var ua = navigator.userAgent || '';
    // El truco pause()+resume() revive a Chrome de escritorio, pero en Android
    // deja la voz muda: allí no se aplica.
    var CHROMISH = /Chrome|Chromium|Edg/.test(ua) && !/Android/i.test(ua);
    var gen = 0, q = [], busy = false, keep = null, lastCancel = 0;

    function stopKeep() { if (keep) { clearInterval(keep); keep = null; } }
    function startKeep() {
      if (!CHROMISH || keep) return;
      keep = setInterval(function () {
        if (!S.speaking) { stopKeep(); return; }
        if (S.paused) return;                 // pausa a propósito: respetarla
        try { S.pause(); S.resume(); } catch (e) {}
      }, 8000);
    }
    // Trozos de ~160 caracteres cortando en punto/coma: el motor nunca llega al
    // límite donde se duerme, y cada trozo se oye completo.
    function chunk(text) {
      var t = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
      if (!t) return [];
      if (t.length <= 160) return [t];
      var frases = t.match(/[^.!?…;]+[.!?…;]*\s*/g) || [t], out = [], cur = '';
      frases.forEach(function (p) {
        if (p.length > 160) {
          if (cur.trim()) { out.push(cur.trim()); cur = ''; }
          var linea = '';
          p.split(' ').forEach(function (w) {
            if ((linea + ' ' + w).trim().length > 160) { if (linea) out.push(linea.trim()); linea = w; }
            else linea = (linea ? linea + ' ' : '') + w;
          });
          cur = linea ? linea + ' ' : '';
          return;
        }
        if ((cur + p).length > 160 && cur.trim()) { out.push(cur.trim()); cur = ''; }
        cur += p;
      });
      if (cur.trim()) out.push(cur.trim());
      return out;
    }
    function bestVoice(lang) {
      var vs = []; try { vs = S.getVoices() || []; } catch (e) {}
      var en = vs.filter(function (v) { return v.lang && v.lang.toLowerCase().indexOf('en') === 0; });
      if (!en.length) return null;
      var want = String(lang || 'en-US').toLowerCase();
      var pool = en.filter(function (v) { return v.lang.toLowerCase() === want; }).concat(en);
      var pref = ['Google US English', 'Google UK English Female', 'Google UK English Male',
                  'Microsoft Aria', 'Microsoft Jenny', 'Microsoft Michelle', 'Microsoft Libby',
                  'Microsoft Sonia', 'Samantha', 'Daniel'];
      for (var i = 0; i < pref.length; i++) {
        for (var j = 0; j < pool.length; j++) {
          if (pool[j].name && pool[j].name.indexOf(pref[i]) === 0) return pool[j];
        }
      }
      return pool[0] || null;
    }
    // La primera reproducción suele pillar getVoices() vacío: esperamos (máx
    // 1.5 s) a que el navegador cargue las voces antes de hablar.
    function withVoices(cb) {
      var vs = []; try { vs = S.getVoices() || []; } catch (e) {}
      if (vs.length) { cb(); return; }
      var listo = false, t0 = Date.now();
      function go() { if (listo) return; listo = true; cb(); }
      try { S.addEventListener('voiceschanged', go, { once: true }); } catch (e) {}
      (function poll() {
        if (listo) return;
        var v = []; try { v = S.getVoices() || []; } catch (e) {}
        if (v.length || Date.now() - t0 > 1500) { go(); return; }
        setTimeout(poll, 120);
      })();
    }
    function pump(my, intento) {
      if (my !== gen) { busy = false; return; }
      if (!q.length) { busy = false; stopKeep(); return; }
      busy = true;
      // El motor sigue ocupado o acaba de recibir un cancel: esperar a que esté
      // libre de verdad (aquí se perdían las frases y aparecían los silencios).
      if ((S.speaking || S.pending || Date.now() - lastCancel < 130) && (intento || 0) < 25) {
        setTimeout(function () { pump(my, (intento || 0) + 1); }, 90);
        return;
      }
      var job = q.shift();
      var u = job.u, uu = new SpeechSynthesisUtterance(job.text);
      uu.rate = (typeof u.rate === 'number' && u.rate > 0) ? u.rate : 1;
      uu.pitch = (typeof u.pitch === 'number') ? u.pitch : 1;
      uu.volume = (typeof u.volume === 'number') ? u.volume : 1;
      uu.lang = u.lang || (job.voice && job.voice.lang) || 'en-US';
      if (job.voice) uu.voice = job.voice;
      var fin = false, wd = null;
      function next(err) {
        if (fin) return; fin = true;
        if (wd) clearTimeout(wd);
        if (my !== gen) { busy = false; return; }
        if (job.last) {
          if (err && typeof u.onerror === 'function') { try { u.onerror(err); } catch (e) {} }
          if (typeof u.onend === 'function') { try { u.onend({ target: u, type: 'end', charIndex: String(u.text || '').length, elapsedTime: 0 }); } catch (e) {} }
        }
        setTimeout(function () { pump(my, 0); }, 30);
      }
      uu.onstart = function () { if (job.first && typeof u.onstart === 'function') { try { u.onstart({ target: u, type: 'start' }); } catch (e) {} } };
      uu.onboundary = function (ev) {
        if (typeof u.onboundary !== 'function') return;
        try { u.onboundary({ target: u, type: 'boundary', name: ev.name, charIndex: job.off + (ev.charIndex || 0), charLength: ev.charLength }); } catch (e) {}
      };
      uu.onend = function () { next(null); };
      uu.onerror = function (e) { next(e); };
      // Reloj de seguridad: si el motor se cuelga y nunca avisa el final, la
      // actividad sigue igual (antes se quedaba muda esperando para siempre).
      var esperado = 2500 + (job.text.split(' ').length * 420) / (uu.rate || 1);
      wd = setTimeout(function () { if (!fin) { try { nCancel(); } catch (e) {} next(null); } }, esperado + 7000);
      try { nSpeak(uu); startKeep(); } catch (e) { next(e); }
    }
    S.cancel = function () {
      gen++; q = []; busy = false; lastCancel = Date.now(); stopKeep();
      try { nCancel(); } catch (e) {}
    };
    S.speak = function (u) {
      if (!u || typeof u.text !== 'string') { try { nSpeak(u); } catch (e) {} return; }
      var my = gen, trozos = chunk(u.text);
      if (!trozos.length) {
        if (typeof u.onend === 'function') setTimeout(function () { try { u.onend({ target: u, type: 'end' }); } catch (e) {} }, 30);
        return;
      }
      withVoices(function () {
        if (my !== gen) return;                        // lo cancelaron mientras tanto
        var v = u.voice || bestVoice(u.lang), off = 0;
        trozos.forEach(function (t, i) {
          q.push({ text: t, u: u, voice: v, off: off, first: i === 0, last: i === trozos.length - 1 });
          off += t.length + 1;
        });
        if (!busy) setTimeout(function () { if (!busy) pump(my, 0); }, 80);
      });
    };
    // Al volver a la pestaña, reanudar lo que el navegador dejó en pausa.
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && S.paused && S.speaking) { try { S.resume(); } catch (e) {} }
    });
    window.JUCUM_TTS = { ok: true, chunk: chunk, bestVoice: bestVoice };
  })();

  // ── Config (los mismos valores de tu plataforma) ──
  var SUPABASE_URL = 'https://dwwzkzuonltaavzhvilu.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_6pruJuV5P2cMVWqd8Wt8gg_UAtuEj_m';

  // Lecturas y stories son de LECTURA TRANQUILA: no requieren mover el mouse,
  // así que el aviso de inactividad se relaja muchísimo (no interrumpe al que
  // lee con calma). El resto de materiales (gramática, listening, resúmenes)
  // sí interactúan, así que mantienen el aviso normal a los 3 min.
  var KIND = String(new URLSearchParams(location.search).get('jucum_kind') || '').toLowerCase();
  var IS_READING = /read|story|lectura|dialog/.test(KIND);
  // Las STORIES y diálogos son lectura pura: NO tienen límite de uso (ni aviso de
  // inactividad ni bloqueo entre intentos). Solo monitoreamos el tiempo de lectura.
  var IS_STORY = /story|dialog/.test(KIND);
  // Tiempo REAL: sin interacción reciente el conteo se PAUSA (sin cartel, sin
  // cerrar nada; se reanuda solo). Lecturas con quiz toleran más quietud (leer
  // no mueve el mouse); el resto interactúa seguido — y el audio/video
  // reproduciéndose cuenta como actividad (eventos play/timeupdate).
  var WARN_AFTER_SEC   = IS_READING ? 5 * 60 : 2 * 60;
  var STORY_IDLE_SEC   = 3 * 60;  // stories: 3 min sin señal de vida → pausa el conteo
  var CLOSE_AFTER_SEC  = 5 * 60;  // +5 min sin responder → fin de práctica
  var AUTO_DONE_SEC    = 4 * 60;  // stories: completar tras 4 min activos
  // Tope de lectura que cuenta para el reporte (en stories). El contador en
  // pantalla sigue corriendo normal —el alumno no lo nota—, pero al progreso
  // solo se registran como máximo estos minutos. Que lea de más es bienvenido,
  // simplemente no suma extra al reporte.
  var READING_CAP_MIN  = 30;
  // Regla de la ½ HORA: una nota registrada recién puede cambiar 30 min después
  // del intento anterior (repetir sí, pero con repaso de por medio — no al toque
  // memorizando respuestas). No aplica a resúmenes/quizlet (participación),
  // stories (sin nota) ni exámenes (vale el 1er intento).
  var GRADE_WINDOW_MS  = 30 * 60 * 1000;

  // ── Leer identidad desde la URL ──
  var q = new URLSearchParams(location.search);
  var uid = q.get('jucum_uid');
  var modId = q.get('jucum_mod') || 'general';
  var actId = q.get('jucum_act') || 'auto';
  var teacher = q.get('jucum_teacher') === '1'; // profesor: vista libre para dar clase
  var exam = q.get('jucum_exam') === '1';       // alumno rindiendo examen (no registra como práctica)
  var demo = !uid || teacher || exam; // sin uid / profesor / examen → no registra avance
  var groupId = q.get('jucum_group') || '';
  var matName = q.get('jucum_name') || '';
  if (teacher) WARN_AFTER_SEC = 60 * 60; // el profesor da su clase libremente, sin avisos de inactividad

  function load(cb) {
    // Examen con alumno identificado: SÍ carga Supabase (registra nota + salidas).
    if (demo && !teacher && !(exam && uid)) return cb(); // prueba pura: sin Supabase
    if (window.supabase) return cb();
    // El cronómetro + el conteo de tiempo NO deben depender de que la CDN de
    // Supabase cargue: si la red falla o tarda, igual arrancamos (el chip SIEMPRE
    // aparece). El cliente de Supabase se reintenta de forma perezosa al guardar.
    var called = false;
    function go() { if (!called) { called = true; cb(); } }
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    s.onload = go;
    s.onerror = go;            // CDN caída → arranca igual (solo cronómetro local)
    document.head.appendChild(s);
    setTimeout(go, 3500);      // red lenta → no esperar más de 3.5 s para mostrar el chip
  }

  function start() {
    var sb = (demo || !window.supabase) ? null : window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    // Reintento perezoso: si Supabase cargó tarde (después de mostrar el chip),
    // creamos el cliente la primera vez que haga falta guardar.
    function ensureSb() { if (!sb && !demo && window.supabase) { try { sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY); } catch (e) {} } return sb; }
    // 🎓 Cliente propio del MODO EXAMEN (demo=true bloquea sb, pero el examen sí registra)
    var exSb = null;
    function ensureExSb() { if (!exSb && exam && uid && window.supabase) { try { exSb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY); } catch (e) {} } return exSb; }
    // Cliente para registrar el USO DE CLASE del profesor (bitácora)
    var classSb = (teacher && window.supabase) ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
    var CLASS_MIN_SEC = 5 * 60;
    var classId = 'cl-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    var classStartISO = new Date().toISOString();
    function logClass() {
      if (!classSb && teacher && window.supabase) { try { classSb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY); } catch (e) {} }
      if (!teacher || !classSb || activeSec < CLASS_MIN_SEC) return;
      classSb.from('teacher_class_log').upsert({
        id: classId, date: new Date().toISOString().slice(0, 10),
        started_at: classStartISO, ended_at: new Date().toISOString(),
        minutes: Math.round(activeSec / 60), group_id: groupId || null,
        material_name: matName || (modId + ' · ' + actId), module_id: modId,
        activity_id: actId, type: KIND || '', source: 'auto',
      }, { onConflict: 'id' }).then(function () {}, function () {});
    }

    // ── Intentos: 1 registro por práctica, mejorable a la SEMANA ──
    // Guardamos cuándo se hizo el PRIMER intento (solo informativo). La nota se
    // puede mejorar en cualquier momento: siempre nos quedamos con la MEJOR.
    var ATTEMPT_KEY = 'jucum_attempt_' + (uid || 'demo') + '_' + modId + '_' + actId;
    var activeSec = 0;          // segundos de práctica real acumulados
    var idleSec = 0;            // segundos sin actividad
    var done = false;           // ya registrado en esta sesión
    var paused = false;         // conteo pausado por inactividad (sin cerrar nada)

    /* ── Ancla LOCAL de la regla de ½ hora ──────────────────────────────
     * Antes el ancla era completed_at de la nube, así que para no moverla NO se
     * escribía nada cuando la nota estaba congelada: la práctica del alumno
     * quedaba sin registrar (sin ✓ del día, sin XP, sin racha). Ahora la fecha
     * de la nube se refresca SIEMPRE (es la evidencia de que practicó) y el
     * ancla de la ventana vive aquí, junto con QUÉ parte se calificó: repetir
     * otro audio/otra historia del mismo material ya no queda bloqueado. */
    var GRADE_KEY = 'jucum_grade_' + (uid || 'demo') + '_' + modId + '_' + actId;
    function gradeAnchor() { try { return JSON.parse(localStorage.getItem(GRADE_KEY) || 'null'); } catch (e) { return null; } }
    function setGradeAnchor(part, score) {
      try { localStorage.setItem(GRADE_KEY, JSON.stringify({ ts: Date.now(), part: (part == null ? null : String(part)), score: score })); } catch (e) {}
    }
    function gateLeftMs(part) {
      var a = gradeAnchor();
      if (!a || !a.ts) return 0;
      if (String(a.part) !== String(part == null ? null : part)) return 0;   // otra parte = otro ejercicio
      return Math.max(0, a.ts + GRADE_WINDOW_MS - Date.now());
    }
    var storyBaseMin = null;    // minutos de lectura ya registrados ANTES de esta sesión

    // ── Sesiones diarias (meta diaria multi-equipo) ──
    // Guarda los minutos de HOY por actividad en la tabla daily_sessions; la
    // plataforma los suma para el anillo de meta diaria en CUALQUIER equipo.
    function peruDay() { return new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10); }
    var dayStart = peruDay();
    var activeDaySec = 0;
    function pushDaily() {
      if (demo || !ensureSb()) return;
      var d = peruDay();
      if (d !== dayStart) { activeDaySec = 0; dayStart = d; return; }
      var mins = Math.round(activeDaySec / 60);
      if (mins < 1) return;
      sb.from('daily_sessions').upsert({
        user_id: uid, day: d, module_id: modId, activity_id: actId,
        kind: KIND || '', minutes: mins, updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,day,module_id,activity_id' }).then(function () {}, function () {});
    }

    // ── 🟢 Presencia EN VIVO (tablero "Clase en vivo" del profesor) ──
    // UNA fila por alumno en live_presence (script 26): dónde está, desde
    // cuándo y en qué estado. Se envía al entrar, cada 20 s, al terminar
    // (una sola vez) y al salir. Va por fetch directo: no depende de que
    // cargue la CDN de Supabase y nunca bloquea la práctica.
    var LIVE_URL = SUPABASE_URL + '/rest/v1/live_presence?on_conflict=user_id';
    var liveStartISO = new Date().toISOString();
    var liveTick = 0;
    function pushLive(state, extra, leaving) {
      if (!uid || teacher) return;   // profesor y modo prueba no ocupan el salón
      try {
        fetch(LIVE_URL, {
          method: 'POST', keepalive: !!leaving, mode: 'cors',
          headers: {
            'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY,
            'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates,return=minimal'
          },
          body: JSON.stringify({
            user_id: uid, group_id: groupId || '', module_id: modId, activity_id: actId,
            kind: KIND || '', material_name: matName || '',
            part: (typeof activePart !== 'undefined' && activePart != null) ? Number(activePart) : null,
            state: state, minutes: Math.round(activeSec / 60),
            score: (extra && extra.score != null) ? extra.score : null,
            exam: !!exam, started_at: liveStartISO, updated_at: new Date().toISOString()
          })
        }).catch(function () {});
      } catch (e) {}
    }
    pushLive('start');

    // Lectura: sabemos de entrada cuántos minutos ya tenía registrados, para
    // ACUMULAR el tiempo de esta sesión y no pisar lo leído antes.
    if (IS_STORY && !demo) setTimeout(function () {
      if (!ensureSb()) return;
      sb.from('progress').select('minutes').eq('user_id', uid).eq('module_id', modId).eq('activity_id', actId).maybeSingle()
        .then(function (r) { if (storyBaseMin == null) storyBaseMin = (r && r.data && r.data.minutes) || 0; }, function () {});
    }, 1500);

    // ── Chip flotante con el tiempo activo ──
    var chip = document.createElement('div');
    chip.id = 'jec-conn-chip';
    chip.style.cssText = 'position:fixed;bottom:14px;right:14px;z-index:999997;display:flex;align-items:center;gap:7px;background:#1F3A8A;color:#fff;padding:8px 14px;border-radius:24px;font:700 13px system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,0.25);cursor:default;user-select:none;white-space:nowrap;';
    chip.innerHTML = '<span>⏱</span><span id="jec-conn-time" style="font-family:monospace;font-size:14px;">0:00</span>' +
      (teacher ? '<span style="background:rgba(255,255,255,0.22);padding:2px 8px;border-radius:10px;font-size:11px;font-weight:800;">PROFESOR · libre</span>'
               : exam ? '<span style="background:rgba(255,255,255,0.22);padding:2px 8px;border-radius:10px;font-size:11px;font-weight:800;">EXAMEN</span>'
               : (demo ? '<span style="background:rgba(255,255,255,0.22);padding:2px 8px;border-radius:10px;font-size:11px;font-weight:800;">PRUEBA · no registra</span>' : ''));
    chip.title = demo
      ? 'Modo prueba: abriste el material fuera de la plataforma, el tiempo NO se registra.'
      : 'Tiempo activo de práctica (se registra en tu progreso).';
    document.body.appendChild(chip);

    // ── Chip ARRASTRABLE (en clase, al hacer zoom estorba: que se pueda mover) ──
    (function makeDraggable(el) {
      var POS_KEY = 'jucum_chip_pos';
      try {
        var saved = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
        if (saved && typeof saved.left === 'number') {
          el.style.left = saved.left + 'px'; el.style.top = saved.top + 'px';
          el.style.right = 'auto'; el.style.bottom = 'auto';
        }
      } catch (e) {}
      el.style.cursor = 'grab'; el.style.touchAction = 'none';
      el.title = (el.title ? el.title + ' · ' : '') + 'Arrástrame para moverme';
      var dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
      el.addEventListener('pointerdown', function (e) {
        dragging = true; el.style.cursor = 'grabbing';
        var r = el.getBoundingClientRect(); ox = r.left; oy = r.top; sx = e.clientX; sy = e.clientY;
        el.style.left = ox + 'px'; el.style.top = oy + 'px'; el.style.right = 'auto'; el.style.bottom = 'auto';
        try { el.setPointerCapture(e.pointerId); } catch (e2) {}
      });
      el.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        var nx = Math.max(4, Math.min(window.innerWidth - el.offsetWidth - 4, ox + (e.clientX - sx)));
        var ny = Math.max(4, Math.min(window.innerHeight - el.offsetHeight - 4, oy + (e.clientY - sy)));
        el.style.left = nx + 'px'; el.style.top = ny + 'px';
      });
      function end() {
        if (!dragging) return; dragging = false; el.style.cursor = 'grab';
        try { localStorage.setItem(POS_KEY, JSON.stringify({ left: parseInt(el.style.left, 10), top: parseInt(el.style.top, 10) })); } catch (e) {}
      }
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
    })(chip);

    // ── 🐞 Reporte de errores UNIVERSAL (todos los materiales) ──
    // Botón flotante junto al cronómetro; guarda en error_reports (bandeja 🐞 del panel).
    function jecSendReport(msg, kindSel) {
      var row = {
        status: 'nuevo', reporter: teacher ? 'profesor' : (uid ? 'alumno' : 'anonimo'),
        user_id: uid || 'demo', group_id: groupId || null, material_kind: KIND || '',
        material_name: matName || (modId + ' · ' + actId), module_id: modId, activity_id: actId,
        part: (typeof activePart !== 'undefined' && activePart != null) ? Number(activePart) : null,
        message: (kindSel ? '[' + kindSel + '] ' : '') + msg,
        url: location.href.split('?')[0], created_at: new Date().toISOString()
      };
      if (ensureSb()) {
        sb.from('error_reports').insert(row).then(function () { toast('✓ Reporte enviado. ¡Gracias por avisar!'); },
          function () { toast('No se pudo enviar. Intenta de nuevo con internet.'); });
      } else if (teacher && window.supabase) {
        try { window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY).from('error_reports').insert(row).then(function(){ toast('✓ Reporte enviado'); }, function(){ toast('No se pudo enviar.'); }); } catch (e) { toast('Sin conexión con la nube.'); }
      } else {
        toast('Modo prueba: el reporte no se registra.');
      }
    }
    var bugBtn = document.createElement('button');
    bugBtn.id = 'jec-bug-btn'; bugBtn.textContent = '🐞';
    bugBtn.title = 'Reportar un error de este material';
    bugBtn.style.cssText = 'position:fixed;bottom:14px;left:14px;z-index:999997;width:40px;height:40px;border-radius:50%;border:none;background:#8D6E63;color:#fff;font-size:18px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,0.25);';
    bugBtn.onclick = function () {
      if (document.getElementById('jec-bug-ov')) return;
      var ov = document.createElement('div'); ov.id = 'jec-bug-ov';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.55);z-index:1000000;display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,sans-serif;';
      ov.innerHTML = '<div style="background:#fff;border-radius:18px;max-width:380px;width:100%;padding:18px 20px;">'
        + '<div style="font-weight:800;font-size:16px;margin-bottom:2px;">🐞 Reportar un error</div>'
        + '<div style="font-size:12px;color:#666;font-weight:600;margin-bottom:10px;">Cuéntanos qué viste en este material. Llega directo al equipo.</div>'
        + '<select id="jec-bug-kind" style="width:100%;padding:9px;border:1.5px solid #ddd;border-radius:10px;font-weight:700;font-size:13px;margin-bottom:8px;">'
        + '<option>Respuesta marcada parece equivocada</option><option>Error de escritura / traducción</option><option>Audio no se entiende</option><option>Algo no funciona (botón, pantalla)</option><option>Otro</option></select>'
        + '<textarea id="jec-bug-msg" rows="3" placeholder="Describe el problema… (opcional pero ayuda)" style="width:100%;box-sizing:border-box;padding:9px;border:1.5px solid #ddd;border-radius:10px;font-size:13px;font-family:inherit;"></textarea>'
        + '<div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end;">'
        + '<button id="jec-bug-cancel" style="padding:9px 16px;border:1.5px solid #ccc;background:#fff;border-radius:20px;font-weight:800;cursor:pointer;">Cancelar</button>'
        + '<button id="jec-bug-send" style="padding:9px 18px;border:none;background:#8D6E63;color:#fff;border-radius:20px;font-weight:800;cursor:pointer;">Enviar reporte</button></div></div>';
      document.body.appendChild(ov);
      document.getElementById('jec-bug-cancel').onclick = function () { ov.remove(); };
      document.getElementById('jec-bug-send').onclick = function () {
        var k = document.getElementById('jec-bug-kind').value;
        var m = document.getElementById('jec-bug-msg').value.trim();
        ov.remove(); jecSendReport(m || '-', k);
      };
    };
    document.body.appendChild(bugBtn);
    window.JUCUM_CONNECT = window.JUCUM_CONNECT || {};
    window.JUCUM_CONNECT.report = function (msg, kind, part) {
      if (part != null) { try { activePart = Number(part); } catch (e) {} }
      jecSendReport(String(msg || '-'), kind || null);
    };

    /* ═══ 🎓 MODO EXAMEN SEGURO ═══
     * 1) Reglas antes de comenzar (acepta para iniciar).
     * 2) Salidas de pestaña/ventana REGISTRADAS (activity_parts part=99, en vivo).
     * 3) Respuestas escritas se auto-guardan en este equipo y se restauran al volver.
     * 4) Al terminar: nota del PRIMER intento a la nube (module exam-…). */
    var examFocusLoss = 0;
    var EXDRAFT_KEY = 'jucum_examdraft_' + (uid || 'demo') + '_' + modId + '_' + actId;
    if (exam) (function examSecure() {
      function draft() { try { return JSON.parse(localStorage.getItem(EXDRAFT_KEY) || '{}'); } catch (e) { return {}; } }
      function saveDraft(patch) { try { var d = draft(); for (var k in patch) d[k] = patch[k]; localStorage.setItem(EXDRAFT_KEY, JSON.stringify(d)); } catch (e) {} }
      var d0 = draft();
      examFocusLoss = d0.focus || 0;

      // — franja fija: recuerda las reglas durante TODO el examen —
      var strip = document.createElement('div');
      strip.id = 'jec-exam-strip';
      strip.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#B71C1C;color:#fff;padding:7px 14px;font:800 12px system-ui,sans-serif;text-align:center;z-index:999998;';
      function stripMsg() {
        strip.textContent = '🎓 EXAMEN EN CURSO — no abras otras pestañas ni salgas de esta ventana: cada salida queda registrada' + (examFocusLoss > 0 ? ' · ⚠ salidas: ' + examFocusLoss : '');
      }
      stripMsg();
      document.body.appendChild(strip);

      // — registro de salidas (pestaña oculta / ventana pierde el foco) —
      var lastLoss = 0;
      function integrityPush() {
        var s = ensureExSb(); if (!s) return;
        s.from('activity_parts').upsert({
          user_id: uid, module_id: modId, activity_id: actId, part: 99,
          score: examFocusLoss, minutes: Math.round(activeSec / 60), completed_at: new Date().toISOString()
        }, { onConflict: 'user_id,module_id,activity_id,part' }).then(function () {}, function () {});
      }
      function countLoss() {
        var now = Date.now();
        if (now - lastLoss < 1500) return; // blur+hidden juntos = 1 sola salida
        lastLoss = now;
        examFocusLoss++;
        saveDraft({ focus: examFocusLoss });
        stripMsg();
        integrityPush();
      }
      document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') countLoss(); });
      window.addEventListener('blur', countLoss);

      // — auto-guardado de respuestas escritas (inputs/selects/textareas) —
      var restoreLock = false;
      function fieldKey(el, i) {
        if (el.type === 'radio' || el.type === 'checkbox') return el.tagName + ':' + (el.name || '#') + ':' + el.value;
        return el.tagName + ':' + (el.name || '#') + ':' + i;
      }
      function fire(el) { try { el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {} }
      function collect() {
        var out = {}, els = document.querySelectorAll('input, textarea, select');
        for (var i = 0; i < els.length; i++) {
          var el = els[i];
          if (el.type === 'password' || el.type === 'file' || el.type === 'hidden') continue;
          out[fieldKey(el, i)] = (el.type === 'radio' || el.type === 'checkbox') ? !!el.checked : el.value;
        }
        return out;
      }
      function restore() {
        var ans = draft().answers; if (!ans) return;
        restoreLock = true;
        var els = document.querySelectorAll('input, textarea, select');
        for (var i = 0; i < els.length; i++) {
          var el = els[i], k = fieldKey(el, i);
          if (!(k in ans)) continue;
          var v = ans[k];
          if (el.type === 'radio' || el.type === 'checkbox') { if (el.checked !== v) { el.checked = v; fire(el); } }
          else if (v && el.value !== v) { el.value = v; fire(el); }
        }
        restoreLock = false;
      }
      var saveT = null;
      function scheduleSave() { if (restoreLock) return; clearTimeout(saveT); saveT = setTimeout(function () { saveDraft({ answers: collect(), at: Date.now() }); }, 400); }
      document.addEventListener('input', scheduleSave, true);
      document.addEventListener('change', scheduleSave, true);

      // — reglas + inicio —
      var resumed = d0.answers && Object.keys(d0.answers).length > 0;
      var ov = document.createElement('div');
      ov.id = 'jec-exam-rules';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.78);z-index:1000001;display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,sans-serif;';
      ov.innerHTML = '<div style="background:#fff;border-radius:20px;max-width:440px;width:100%;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,0.4);">'
        + '<div style="background:#B71C1C;color:#fff;padding:18px 22px;"><div style="font-size:30px;line-height:1;">🎓</div><div style="font-weight:800;font-size:19px;margin-top:4px;">Estás por rendir tu examen</div><div style="font-size:12.5px;opacity:.9;font-weight:700;">Léelo con calma antes de comenzar</div></div>'
        + '<div style="padding:16px 22px 20px;font-size:13.5px;line-height:1.6;color:#333;">'
        + '<div style="margin-bottom:8px;">📵 <b>No abras otras pestañas</b> ni salgas de esta ventana: <b>cada salida queda registrada</b> y tu profesor la verá.</div>'
        + '<div style="margin-bottom:8px;">💾 Tus <b>respuestas escritas se guardan solas</b>: si se corta la luz o el internet, vuelve a abrir el examen desde la plataforma <b>en este mismo equipo</b> y continúas donde quedaste.</div>'
        + '<div style="margin-bottom:8px;">1️⃣ Vale tu <b>primer intento</b>: al terminar, tu nota queda registrada y enviada a tu profesor.</div>'
        + '<div style="margin-bottom:14px;">🙏 Hazlo solo y con honestidad — este examen muestra <b>tu</b> avance real.</div>'
        + (resumed ? '<div style="background:#FFF8E1;border:1.5px solid #FFD54F;border-radius:10px;padding:9px 12px;font-weight:800;color:#7A4E00;margin-bottom:12px;">🔄 Encontramos tu avance guardado: continuarás donde quedaste.</div>' : '')
        + '<button id="jec-exam-start" style="width:100%;padding:13px;border:none;border-radius:24px;background:#B71C1C;color:#fff;font-weight:800;font-size:15px;cursor:pointer;">Acepto, comenzar mi examen ✍️</button>'
        + '</div></div>';
      document.body.appendChild(ov);
      document.getElementById('jec-exam-start').onclick = function () {
        ov.remove();
        saveDraft({ acceptedAt: new Date().toISOString() });
        if (resumed) setTimeout(restore, 150);
      };
    })();

    // 🎓 EXAMEN: registra el PRIMER intento en la nube (module exam-…) + integridad
    function finishExam(pct, minutes, hasScore) {
      try { localStorage.removeItem(EXDRAFT_KEY); } catch (e) {}
      var s = ensureExSb();
      if (!s) { showResultCard(pct, '🎓 Examen terminado · ' + minutes + ' min' + (hasScore ? ' · ' + pct + '%' : '') + ' · ⚠ sin conexión: avísale tu resultado a tu profesor', hasScore, true); return; }
      s.from('activity_parts').upsert({
        user_id: uid, module_id: modId, activity_id: actId, part: 99,
        score: examFocusLoss, minutes: minutes, completed_at: new Date().toISOString()
      }, { onConflict: 'user_id,module_id,activity_id,part' }).then(function () {}, function () {});
      s.from('progress').select('score').eq('user_id', uid).eq('module_id', modId).eq('activity_id', actId).maybeSingle().then(function (r) {
        var prev = (r && r.data && r.data.score != null) ? r.data.score : null;
        if (prev != null) { showResultCard(prev, '🎓 Esta parte ya estaba registrada con ' + prev + '%. En el examen vale tu PRIMER intento.', true, true); return; }
        s.from('progress').upsert({
          user_id: uid, module_id: modId, activity_id: actId,
          score: pct, minutes: minutes, completed_at: new Date().toISOString()
        }, { onConflict: 'user_id,module_id,activity_id' }).then(function (r2) {
          if (r2 && r2.error) { showResultCard(pct, '🎓 Terminaste (' + (hasScore ? pct + '%' : minutes + ' min') + ') pero no se pudo registrar. Avísale a tu profesor.', hasScore, true); return; }
          showResultCard(pct, '🎓 ¡Registrado y enviado a tu profesor! · ' + minutes + ' min' + (hasScore ? ' · ' + pct + '%' : '') + (examFocusLoss > 0 ? ' · ⚠ ' + examFocusLoss + ' salida(s) registrada(s)' : ''), hasScore, true);
        }, function () { showResultCard(pct, '🎓 Terminaste pero no se pudo registrar (¿sin internet?). Avísale a tu profesor.', hasScore, true); });
      }, function () {
        s.from('progress').upsert({
          user_id: uid, module_id: modId, activity_id: actId,
          score: pct, minutes: minutes, completed_at: new Date().toISOString()
        }, { onConflict: 'user_id,module_id,activity_id' }).then(function () {}, function () {});
        showResultCard(pct, '🎓 Examen terminado · ' + minutes + ' min' + (hasScore ? ' · ' + pct + '%' : ''), hasScore, true);
      });
    }


    function fmt(sec) {
      return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
    }
    function updateChip() {
      var t = document.getElementById('jec-conn-time');
      if (t) t.textContent = fmt(activeSec);
      if (done) {
        chip.style.background = '#2EA84B';
        chip.firstChild.textContent = '✓';
      } else if (paused) {
        chip.style.background = '#9E9E9E';
        chip.firstChild.textContent = '⏸';
      } else {
        chip.style.background = '#1F3A8A';
        chip.firstChild.textContent = '⏱';
      }
    }

    ['mousemove','mousedown','keydown','scroll','touchstart','click','input','change'].forEach(function (ev) {
      document.addEventListener(ev, function () { idleSec = 0; }, { passive: true });
    });
    // Audio/video reproduciéndose = práctica real aunque no toque nada (listenings).
    ['play','playing','timeupdate'].forEach(function (ev) {
      document.addEventListener(ev, function () { idleSec = 0; }, { capture: true, passive: true });
    });

    setInterval(function () {
      // Latido de presencia (cada 20 s, solo mientras no haya terminado)
      liveTick++;
      if (!done && liveTick % 20 === 0) pushLive(paused ? 'paused' : 'active');
      // ── STORIES/diálogos: lectura SIN LÍMITE ──
      // Cuenta el tiempo mientras la pestaña esté visible; nunca interrumpe,
      // nunca bloquea. Solo registra el tiempo de lectura (lo que monitoreamos).
      if (IS_STORY) {
        idleSec++;
        // Lectura REAL (fix precisión): pestaña visible Y alguna señal de vida
        // reciente — scroll, toque, tecla o audio sonando—. Leer con calma da
        // hasta 3 min sin tocar nada; después el conteo se PAUSA solo (chip ⏸,
        // el tablero lo muestra ⏸) y se reanuda al volver. Antes bastaba dejar
        // la pestaña abierta para sumar hasta el tope y todos “leían” lo mismo.
        paused = idleSec >= STORY_IDLE_SEC || document.visibilityState === 'hidden';
        if (!paused) {
          activeSec++; activeDaySec++;
          if (!demo && activeSec % 120 === 0) pushDaily();
          var capMin = Math.min(READING_CAP_MIN, Math.round(activeSec / 60)); // tope silencioso para el reporte
          if (!done && activeSec >= AUTO_DONE_SEC && !teacher && !exam) {
            done = true; // marcada como practicada (desbloquea la siguiente) — sin cooldown ni tarjeta
            pushLive('done', null);
            try { if (window.parent && window.parent !== window) window.parent.postMessage({ source: 'jucum-connect', type: 'done', uid: uid, mod: modId, act: actId, score: null, minutes: Math.max(1, capMin) }, '*'); } catch (e) {}
            if (!demo) pushStory(Math.round(activeSec / 60));
            if (!demo && activePart != null) pushPart(activePart, null, Math.max(1, capMin)); // qué historia leyó (nube)
          }
          // refresca el tiempo de lectura cada 2 min (hasta el tope) para que el profesor lo vea
          if (!demo && done && activeSec % 120 === 0) pushStory(Math.round(activeSec / 60));
          if (teacher && activeSec % 60 === 0) logClass();
        }
        updateChip();
        return;
      }
      // ── Resto de materiales (prácticas, gramática, listening, resúmenes) ──
      // La inactividad solo PAUSA el conteo (sin cartel, sin cerrar la práctica).
      // Al volver a moverse/escribir, idleSec se reinicia y el conteo se reanuda solo.
      idleSec++;
      // PAUSA si no hay interacción reciente O la pestaña está oculta: solo cuenta
      // tiempo REAL frente al material. (Fix "tiempos repetidos": antes una pestaña
      // abierta en segundo plano sumaba hasta el tope de inactividad y muchos
      // terminaban registrando los mismos minutos fantasma.)
      paused = idleSec >= WARN_AFTER_SEC || document.visibilityState === 'hidden';
      // El tiempo sigue contando DESPUÉS de terminar: en un material de 4 audios
      // el reloj se congelaba al primero y los minutos del resto se perdían.
      if (!paused) {
        activeSec++; activeDaySec++;
        if (!demo && activeSec % 120 === 0) pushDaily();
        if (teacher && activeSec % 60 === 0) logClass();
      }
      updateChip();
    }, 1000);

    /* Registro de ESTA sesión, por parte (historia/audio/diálogo). Un material
     * con 4 audios dispara 'jucum:done' 4 veces: antes solo se registraba el
     * PRIMERO y su nota quedaba como nota de TODA la actividad (por eso se
     * veían notas que no correspondían). Ahora cada parte cuenta. */
    var sessionReg = {};
    function complete(score, lowStakes, partId) {
      if (exam && done) return;                    // examen: vale el primer intento
      var pkey = (partId == null ? 'all' : 'p' + partId);
      var sc = (score == null) ? null : Math.max(0, Math.min(100, Math.round(Number(score))));
      var visto = sessionReg[pkey];
      if (visto !== undefined && (sc == null || (visto != null && sc <= visto))) return; // nada nuevo
      sessionReg[pkey] = sc;
      done = true;
      updateChip();
      var minutes = Math.max(1, Math.round(activeSec / 60));
      pushDaily(); // asegura los minutos del día antes de registrar la nota
      var pct = sc == null ? 100 : sc;
      pushLive('done', { score: sc });

      // Puente con la plataforma: si el material está EMBEBIDO en una tarea,
      // avisa al panel padre para registrar la nota en la entrega.
      try { if (window.parent && window.parent !== window) window.parent.postMessage({ source: 'jucum-connect', type: 'done', uid: uid, mod: modId, act: actId, score: sc, minutes: minutes }, '*'); } catch (e) {}

      if (demo) {
        if (exam && uid) { finishExam(pct, minutes, sc != null); return; }
        showResultCard(pct, '🧪 Modo prueba · ' + minutes + ' min' + (sc != null ? ' · ' + sc + '%' : '') + ' (no se registró)', sc != null, lowStakes);
        return;
      }

      // SIEMPRE queda registrada la práctica (fecha + minutos). La regla de la
      // ½ hora solo congela la NOTA, y solo si se repite el MISMO ejercicio.
      improveProgress(sc, minutes, lowStakes, partId, function (res) {
        try { if (!localStorage.getItem(ATTEMPT_KEY)) localStorage.setItem(ATTEMPT_KEY, String(Date.now())); } catch (e) {}
        var prev = res.prev, msg;
        if (res.offline) msg = '📡 Sin internet en este momento. Tu resultado (' + (sc != null ? sc + '% · ' : '') + minutes + ' min) quedó guardado en ESTE equipo y se registrará solo en tu próxima práctica con conexión.';
        else if (res.gated) msg = '🕐 Sacaste ' + sc + '%, pero tu nota registrada sigue en ' + prev + '%: la nota puede cambiar recién MEDIA HORA después de tu intento anterior. Tu práctica de hoy SÍ quedó registrada — repasa el feedback y vuelve a intentarlo en ~' + res.waitMin + ' min para que la nota también cuente.';
        else if (prev == null) msg = '✅ Práctica registrada · ' + minutes + ' min' + (sc != null ? ' · ' + sc + '%' : '');
        else if (sc != null && sc > prev) msg = '🎉 ¡Mejoraste tu nota! Antes ' + prev + '% → ahora ' + sc + '%.';
        else if (sc != null && sc === prev) msg = '👍 Practicaste de nuevo. Tu nota (' + prev + '%) se mantiene.';
        else if (sc != null) msg = '👍 Lo intentaste de nuevo. Tu mejor nota (' + prev + '%) se mantiene.';
        else msg = '✅ Práctica registrada · ' + minutes + ' min';
        showResultCard(pct, msg, sc != null, lowStakes);
      });
    }

    /* Registra el progreso quedándonos con la MEJOR nota (nunca baja una nota
     * previa) y dejando SIEMPRE la fecha de hoy + los minutos máximos: esa fila
     * es la evidencia de que el alumno practicó (✓ del día, XP, racha, boletín).
     * Si la nube falla, el intento va a la bandeja local y se reenvía solo.
     * res = { prev, saved, improved, gated, waitMin, offline }. */
    function improveProgress(score, minutes, lowStakes, partId, cb) {
      function fail() { outboxAdd(score, minutes); cb({ prev: null, saved: false, offline: true }); }
      if (demo) { cb({ prev: null, saved: false }); return; }
      if (!ensureSb()) { fail(); return; }
      sb.from('progress').select('score,minutes,completed_at').eq('user_id', uid).eq('module_id', modId).eq('activity_id', actId).maybeSingle()
        .then(function (r) {
          var row = r && r.data;
          var prev = (row && row.score != null) ? Math.round(row.score) : null;
          var prevMin = (row && row.minutes) || 0;
          var waitMs = (lowStakes || score == null) ? 0 : gateLeftMs(partId);
          var congelada = waitMs > 0 && prev != null;
          var nota = congelada ? prev : (score == null ? prev : (prev == null ? score : Math.max(prev, score)));
          sb.from('progress').upsert({
            user_id: uid, module_id: modId, activity_id: actId,
            score: nota, minutes: Math.max(minutes, prevMin),
            completed_at: new Date().toISOString()
          }, { onConflict: 'user_id,module_id,activity_id' }).then(function (r2) {
            if (r2 && r2.error) { fail(); return; }
            if (!congelada && score != null) setGradeAnchor(partId, nota);
            cb({
              prev: prev, saved: true,
              gated: congelada && score > prev,
              waitMin: Math.max(1, Math.ceil(waitMs / 60000)),
              improved: !congelada && prev != null && score != null && score > prev
            });
          }, fail);
        }, fail);
    }

    /* Lectura (stories/diálogos): los minutos se ACUMULAN, nunca bajan. Antes se
     * escribían los minutos de la sesión encima de los anteriores: volver a abrir
     * una historia 2 minutos borraba los 30 min ya leídos — y con ellos su XP. */
    function pushStory(sessionMin) {
      if (demo || !ensureSb()) return;
      var ses = Math.max(0, Math.round(sessionMin || 0));
      sb.from('progress').select('minutes').eq('user_id', uid).eq('module_id', modId).eq('activity_id', actId).maybeSingle()
        .then(function (r) {
          var prev = (r && r.data && r.data.minutes) || 0;
          if (storyBaseMin == null) storyBaseMin = prev;         // ancla de esta sesión
          var mins = Math.max(1, Math.min(READING_CAP_MIN, storyBaseMin + ses));
          if (mins < prev) mins = prev;                          // nunca bajar lo ya leído
          pushProgress(100, mins);
        }, function () { pushProgress(100, Math.max(1, Math.min(READING_CAP_MIN, (storyBaseMin || 0) + ses))); });
    }

    function pushProgress(score, minutes, ok) {
      if (demo || !ensureSb()) { if (ok) ok(); return; } // modo prueba o sin nube: no escribe
      sb.from('progress').upsert({
        user_id: uid, module_id: modId, activity_id: actId,
        score: score, minutes: minutes, completed_at: new Date().toISOString()
      }, { onConflict: 'user_id,module_id,activity_id' }).then(function (r) {
        if (r.error) { console.warn('jucum-connect:', r.error.message); return; }
        if (ok) ok();
      });
    }

    // ── 📥 Bandeja local de registros (a prueba de cortes de internet) ──
    // Si el guardado de la nota falla, el intento queda aquí (solo texto, unos
    // pocos KB) y se reenvía al abrir cualquier material con conexión. Al
    // aplicarse se respeta la MEJOR nota y la fecha es la del intento real.
    var OUTBOX_KEY = 'jucum_outbox_v1';
    function outboxAdd(sc, mn) {
      if (!uid) return;
      try {
        var q = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
        q.push({ uid: uid, mod: modId, act: actId, score: sc, minutes: mn, ts: Date.now() });
        localStorage.setItem(OUTBOX_KEY, JSON.stringify(q.slice(-20)));
      } catch (e) {}
    }
    function outboxFlush() {
      if (!ensureSb()) return;
      var q; try { q = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]'); } catch (e) { q = []; }
      if (!q.length) return;
      var it = q[0];
      sb.from('progress').select('score,minutes').eq('user_id', it.uid).eq('module_id', it.mod).eq('activity_id', it.act).maybeSingle().then(function (r) {
        var row = r && r.data;
        var best = (row && row.score != null) ? Math.max(row.score, it.score) : it.score;
        var mins = Math.max(it.minutes || 0, (row && row.minutes) || 0);
        sb.from('progress').upsert({
          user_id: it.uid, module_id: it.mod, activity_id: it.act,
          score: best, minutes: mins, completed_at: new Date(it.ts).toISOString()
        }, { onConflict: 'user_id,module_id,activity_id' }).then(function (r2) {
          if (r2 && r2.error) return;
          try {
            var q2 = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
            q2 = q2.filter(function (x) { return !(x.ts === it.ts && x.uid === it.uid && x.mod === it.mod && x.act === it.act); });
            localStorage.setItem(OUTBOX_KEY, JSON.stringify(q2));
          } catch (e) {}
          toast('✓ Se registró una práctica tuya que había quedado pendiente');
          setTimeout(outboxFlush, 800);
        }, function () {});
      }, function () {});
    }
    if (!demo) {
      setTimeout(outboxFlush, 4000);
      window.addEventListener('online', function () { setTimeout(outboxFlush, 1500); });
    }

    // 🕐 Recordatorio al reabrir un material CON nota: si hay un intento registrado
    // hace <30 min avisa desde el inicio cuándo podrá cambiar la nota; si ya pasó
    // la ventana y estaba desaprobado, anima ("este intento SÍ cuenta").
    if (!demo && !IS_STORY && !exam && !/summary|quizlet/.test(KIND)) setTimeout(function () {
      if (!ensureSb()) return;
      sb.from('progress').select('score,completed_at').eq('user_id', uid).eq('module_id', modId).eq('activity_id', actId).maybeSingle().then(function (r) {
        var row = r && r.data; if (!row || row.score == null) return;
        var p = Math.max(0, Math.min(100, Math.round(row.score)));
        var a = gradeAnchor();
        var left = (a && a.ts) ? (a.ts + GRADE_WINDOW_MS - Date.now()) : 0;
        if (left > 0) banner('🕐 Ya tienes un intento registrado (' + p + '%). Tu nota podrá cambiar en ~' + Math.max(1, Math.ceil(left / 60000)) + ' min — mientras tanto repasa con calma: el feedback es tu mejor maestro.');
        else if (p < 75) banner('💪 Tu nota anterior fue ' + p + '%. Ya pasó la media hora: este intento SÍ puede actualizarla. ¡Tú puedes!');
      }, function () {});
    }, 2500);

    // ── Progreso POR PARTE (historia/audio/diálogo dentro del material) ──
    // Se guarda en la tabla activity_parts SIN tocar la fila principal de
    // 'progress' (que alimenta el dominio). Así el profesor ve exactamente qué
    // historia/comprensión/audio hizo, y el material puede sembrar su desbloqueo
    // secuencial desde la nube en CUALQUIER equipo.
    var activePart = null;
    function pushPart(part, score, minutes) {
      if (demo || part == null || !ensureSb()) return;
      sb.from('activity_parts').upsert({
        user_id: uid, module_id: modId, activity_id: actId, part: Number(part),
        score: (score == null ? null : score), minutes: minutes || 0,
        completed_at: new Date().toISOString()
      }, { onConflict: 'user_id,module_id,activity_id,part' }).then(function (r) {
        if (r && r.error) console.warn('jucum-connect parts:', r.error.message);
      }, function () {});
    }
    window.JUCUM_CONNECT = window.JUCUM_CONNECT || {};
    // El material avisa qué parte está abierta (para stories sin quiz).
    window.JUCUM_CONNECT.setActivePart = function (n) { activePart = (n == null ? null : Number(n)); };
    // El material lee qué partes ya completó el alumno (desde la nube) para sembrar
    // su desbloqueo secuencial en cualquier equipo. cb recibe [{part, score}, ...].
    window.JUCUM_CONNECT.getCompletedParts = function (cb) {
      if (typeof cb !== 'function') return;
      if (demo || !ensureSb()) { cb([]); return; }
      sb.from('activity_parts').select('part,score')
        .eq('user_id', uid).eq('module_id', modId).eq('activity_id', actId)
        .then(function (r) { cb(((r && r.data) || []).map(function (x) { return { part: x.part, score: x.score }; })); },
              function () { cb([]); });
    };
    // Guardado explícito de una parte (por si el material lo prefiere directo).
    window.JUCUM_CONNECT.savePart = function (part, score, minutes) { pushPart(part, score, minutes); };

    // Quizzes (readings, listenings, gramática, resúmenes MCQ) avisan así:
    window.addEventListener('jucum:done', function (e) {
      var d = e.detail || {};
      var lowStakes = d.type === 'summary' || d.type === 'quizlet';
      // Nota por PARTE: el material envía story/audio/part; lo guardamos aparte.
      var part = (d.part != null) ? d.part : (d.story != null ? d.story : (d.audio != null ? d.audio : null));
      if (part != null) pushPart(part, (d.score != null) ? Math.round(d.score) : null, Math.max(1, Math.round(activeSec / 60)));
      if (IS_STORY || d.type === 'story' || d.type === 'dialog') {
        // Stories/diálogos = lectura sin nota: registra en silencio, SIN tarjeta emergente.
        if (!done) {
          done = true; updateChip();
          try { if (window.parent && window.parent !== window) window.parent.postMessage({ source: 'jucum-connect', type: 'done', uid: uid, mod: modId, act: actId, score: null, minutes: Math.max(1, Math.round(activeSec / 60)) }, '*'); } catch (e2) {}
        }
        pushDaily();
        if (!demo) pushStory(Math.round(activeSec / 60));
        return;
      }
      complete((d.score != null) ? d.score : null, lowStakes, part);
    });

    function toast(msg) {
      var t = document.createElement('div');
      t.textContent = msg;
      t.style.cssText = 'position:fixed;bottom:60px;left:50%;transform:translateX(-50%);background:#2EA84B;color:#fff;padding:11px 20px;border-radius:24px;font:700 14px system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,0.3);z-index:999999;white-space:nowrap;max-width:92vw;';
      document.body.appendChild(t);
      setTimeout(function () { t.remove(); }, 4000);
    }
    function banner(msg) {
      var b = document.createElement('div');
      b.textContent = msg;
      b.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#FFF3CD;color:#5D4037;border-bottom:2px solid #FFD54F;padding:12px 18px;font:700 13px system-ui,sans-serif;text-align:center;z-index:999998';
      document.body.appendChild(b);
    }

    // ── Frase motivacional + cierre de práctica ──
    function jecMotivation(pct) {
      if (pct >= 90) return { emoji:'🌟', title:'¡Excelente!',    text:'Dominaste el tema. Tu constancia se nota — sigue así.',                                         bg:'#E8F5E9', color:'#2E7D32' };
      if (pct >= 75) return { emoji:'💪', title:'¡Muy bien!',     text:'Vas por buen camino. Repasa los pocos errores y serás imparable.',                                bg:'#E3F2FD', color:'#1565C0' };
      if (pct >= 50) return { emoji:'🌱', title:'¡Buen intento!', text:'Aprendiste más de lo que crees. Revisa el feedback y vuelve a intentarlo: cada error te acerca.',     bg:'#FFF8E1', color:'#F57F17' };
      return               { emoji:'🤗', title:'¡Sigue adelante!', text:'Equivocarse ES aprender — tu cerebro ya está cambiando aunque no lo sientas. Repasa con calma y verás el avance.', bg:'#FCE4EC', color:'#AD1457' };
    }
    function showResultCard(pct, statusMsg, hasScore, lowStakes) {
      var m = jecMotivation(pct);
      var needRetry = hasScore && pct < 75 && !lowStakes;
      var retryHtml = needRetry ? '<div style="font-size:13px;font-weight:800;color:#92510F;background:#FFF3D6;border:1.5px solid #F0C66B;border-radius:12px;padding:11px 13px;margin-bottom:14px;line-height:1.5;">🔁 Necesitas <b>75% o más</b> de respuestas correctas para aprobar. Revisa el feedback y <b>vuelve a realizar la actividad</b> para completarla. 🕐 Ojo: tu nota se actualiza recién <b>media hora después</b> de este intento — usa ese tiempo para repasar.</div>' : '';
      var ov = document.createElement('div');
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.6);z-index:1000000;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;padding:16px;';
      ov.innerHTML =
        '<div style="background:#fff;border-radius:20px;max-width:400px;width:100%;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,0.4);">' +
        '<div style="background:' + m.bg + ';padding:24px 22px 20px;text-align:center;">' +
        '<div style="font-size:52px;line-height:1;margin-bottom:6px;">' + m.emoji + '</div>' +
        '<div style="font-weight:800;font-size:22px;color:' + m.color + ';">' + m.title + (hasScore ? ' <span style="font-size:16px;opacity:.7;">' + pct + '%</span>' : '') + '</div>' +
        '</div>' +
        '<div style="padding:18px 22px 22px;text-align:center;">' +
        '<div style="font-size:14px;line-height:1.55;color:#333;margin-bottom:14px;">' + m.text + '</div>' +
        retryHtml +
        '<div style="font-size:12px;font-weight:700;color:#555;background:#F5F5F0;border-radius:10px;padding:9px 12px;margin-bottom:16px;">' + statusMsg + '</div>' +
        '<button id="jec-rc-btn" style="padding:12px 28px;border:none;border-radius:24px;background:#1F3A8A;color:#fff;font-weight:800;font-size:14px;cursor:pointer;">Entendido ✓</button>' +
        '</div></div>';
      document.body.appendChild(ov);
      var b = document.getElementById('jec-rc-btn');
      if (b) b.onclick = function () { ov.remove(); };
    }
    // Guardar tiempo parcial al salir (si practicó al menos 1 min y no completó)
    window.addEventListener('beforeunload', function () {
      // Si YA terminó no se avisa la salida: la fila queda en "done" y el
      // profesor lo sigue viendo como ✅ terminado el resto de la clase
      // (antes volvía a caer en "no entró a practicar" y preocupaba al alumno).
      // Micro-visita (<45 s activos, sin terminar): NO se manda "left" — un
      // vistazo de 5 s pisaba la fila única y borraba el ✅ o la práctica
      // previa del día (caso fabricio, 01-ago). El estado anterior envejece solo.
      if (!done && activeSec >= 45) pushLive('left', null, true);
      if (teacher) { logClass(); return; }
      pushDaily(); // los minutos del día SIEMPRE se salvan
      if (IS_STORY) { if (!demo && activeSec >= 60) pushProgress(100, Math.max(1, Math.min(READING_CAP_MIN, (storyBaseMin || 0) + Math.round(activeSec / 60)))); return; }
      // Salida temprana: ya NO se registra 0% (no pisa notas previas ni bloquea el
      // reintento con "Repetir"). El tiempo quedó en daily_sessions; la nota solo
      // existe cuando el alumno termina la actividad.
    });
  }

  load(start);
})();
