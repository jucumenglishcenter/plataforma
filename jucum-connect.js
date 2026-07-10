/* ════════════════════════════════════════════════════════════════════
   JUCUM Connect · conector para los materiales de GitHub
   ════════════════════════════════════════════════════════════════════
   Pega UNA línea al final de cada material de práctica (antes de </body>):

     <script src="https://jucum-english-center.netlify.app/jucum-connect.js"></script>

   Qué hace automáticamente:
   - Lee la identidad del alumno desde la URL (?jucum_uid=...&jucum_mod=...&jucum_act=...)
     que la plataforma agrega al abrir el material.
   - Muestra un chip flotante con el TIEMPO ACTIVO de práctica.
   - Cuenta SOLO el tiempo activo (mouse, teclado, scroll, touch).
   - Anti-abandono: a los 3 min sin actividad muestra "¿Sigues ahí?" y DEJA de
     contar tiempo. Si no responde en 5 min más, cierra la sesión de práctica
     (el tiempo inactivo nunca se registra como lectura).
   - Al terminar registra puntuación + minutos en Supabase y muestra una
     tarjeta con FRASE MOTIVACIONAL según el puntaje (motiva si va bien o mal).
   - Práctica libre, siempre la MEJOR nota: la nota se registra al terminar y, si
     el alumno vuelve a practicar y mejora, se actualiza al instante (nunca baja).
     El anti-farmeo lo maneja la plataforma (el XP de un material se re-gana una
     vez por semana, no por cada intento del día).
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
  var WARN_AFTER_SEC   = IS_READING ? 30 * 60 : 10 * 60; // sin actividad → solo PAUSA el conteo (sin cartel, sin cerrar)
  var CLOSE_AFTER_SEC  = 5 * 60;  // +5 min sin responder → fin de práctica
  var AUTO_DONE_SEC    = 4 * 60;  // stories: completar tras 4 min activos
  // Tope de lectura que cuenta para el reporte (en stories). El contador en
  // pantalla sigue corriendo normal —el alumno no lo nota—, pero al progreso
  // solo se registran como máximo estos minutos. Que lea de más es bienvenido,
  // simplemente no suma extra al reporte.
  var READING_CAP_MIN  = 30;
  // (Histórico) Antes había una ventana de 7 días para mejorar la nota; se quitó
  // para que rehacer una práctica actualice el estado al instante. Constante sin uso.
  var RETRY_AFTER_MS   = 7 * 24 * 60 * 60 * 1000;

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
    if (demo && !teacher) return cb(); // prueba/examen sin profesor: sin Supabase
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

    ['mousemove','mousedown','keydown','scroll','touchstart','click'].forEach(function (ev) {
      document.addEventListener(ev, function () { idleSec = 0; }, { passive: true });
    });

    setInterval(function () {
      // ── STORIES/diálogos: lectura SIN LÍMITE ──
      // Cuenta el tiempo mientras la pestaña esté visible; nunca interrumpe,
      // nunca bloquea. Solo registra el tiempo de lectura (lo que monitoreamos).
      if (IS_STORY) {
        if (document.visibilityState !== 'hidden') {
          activeSec++; activeDaySec++;
          if (!demo && activeSec % 120 === 0) pushDaily();
          var capMin = Math.min(READING_CAP_MIN, Math.round(activeSec / 60)); // tope silencioso para el reporte
          if (!done && activeSec >= AUTO_DONE_SEC && !teacher && !exam) {
            done = true; // marcada como practicada (desbloquea la siguiente) — sin cooldown ni tarjeta
            try { if (window.parent && window.parent !== window) window.parent.postMessage({ source: 'jucum-connect', type: 'done', uid: uid, mod: modId, act: actId, score: null, minutes: Math.max(1, capMin) }, '*'); } catch (e) {}
            if (!demo) pushProgress(100, Math.max(1, capMin));
            if (!demo && activePart != null) pushPart(activePart, null, Math.max(1, capMin)); // qué historia leyó (nube)
          }
          // refresca el tiempo de lectura cada 2 min (hasta el tope) para que el profesor lo vea
          if (!demo && done && activeSec % 120 === 0 && Math.round(activeSec / 60) <= READING_CAP_MIN) pushProgress(100, capMin);
          if (teacher && activeSec % 60 === 0) logClass();
        }
        updateChip();
        return;
      }
      // ── Resto de materiales (prácticas, gramática, listening, resúmenes) ──
      // La inactividad solo PAUSA el conteo (sin cartel, sin cerrar la práctica).
      // Al volver a moverse/escribir, idleSec se reinicia y el conteo se reanuda solo.
      idleSec++;
      paused = idleSec >= WARN_AFTER_SEC;
      if (!done && !paused) {
        activeSec++; activeDaySec++;
        if (!demo && activeSec % 120 === 0) pushDaily();
        if (teacher && activeSec % 60 === 0) logClass();
      }
      updateChip();
    }, 1000);

    function complete(score, lowStakes) {
      if (done) return;
      done = true;
      updateChip();
      var minutes = Math.max(1, Math.round(activeSec / 60));
      pushDaily(); // asegura los minutos del día antes de registrar la nota
      var pct = score == null ? 100 : score;

      // Puente con la plataforma: si el material está EMBEBIDO en una tarea,
      // avisa al panel padre para registrar la nota en la entrega.
      try { if (window.parent && window.parent !== window) window.parent.postMessage({ source: 'jucum-connect', type: 'done', uid: uid, mod: modId, act: actId, score: (score == null ? null : pct), minutes: minutes }, '*'); } catch (e) {}

      if (demo) {
        showResultCard(pct, '🧪 Modo prueba · ' + minutes + ' min' + (score != null ? ' · ' + pct + '%' : '') + ' (no se registró)', score != null, lowStakes);
        return;
      }

      // Bug reportado: una nota baja quedaba "congelada" 7 días → el material se
      // atascaba en 0% aunque el alumno lo rehiciera bien. Ahora SIEMPRE registramos
      // quedándonos con la MEJOR nota: si el alumno vuelve a practicar y mejora, su
      // estado y sus puntos se actualizan al instante. Puede repasar cuando quiera.
      // El anti-farmeo lo maneja la plataforma: el XP de un material se vuelve a ganar
      // UNA vez por semana (no por cada intento del día).
      var firstTs = parseInt(localStorage.getItem(ATTEMPT_KEY) || '0', 10);
      var now = Date.now();
      improveProgress(pct, minutes, function (prev) {
        if (!firstTs) localStorage.setItem(ATTEMPT_KEY, String(now));
        var msg;
        if (prev == null) msg = '✅ Práctica registrada · ' + minutes + ' min' + (score != null ? ' · ' + pct + '%' : '');
        else if (score != null && pct > prev) msg = '🎉 ¡Mejoraste tu nota! Antes ' + prev + '% → ahora ' + pct + '%.';
        else if (score != null && pct === prev) msg = '👍 Practicaste de nuevo. Tu nota (' + prev + '%) se mantiene.';
        else if (score != null) msg = '👍 Lo intentaste de nuevo. Tu mejor nota (' + prev + '%) se mantiene.';
        else msg = '✅ Práctica registrada · ' + minutes + ' min';
        showResultCard(pct, msg, score != null, lowStakes);
      });
    }

    // Registra el progreso quedándonos con la MEJOR nota (nunca baja una nota previa).
    function improveProgress(score, minutes, cb) {
      if (demo || !ensureSb()) { pushProgress(score, minutes); if (cb) cb(null); return; }
      sb.from('progress').select('score,minutes').eq('user_id', uid).eq('module_id', modId).eq('activity_id', actId).maybeSingle()
        .then(function (r) {
          var row = r && r.data;
          var prev = (row && row.score != null) ? row.score : null;
          var best = (prev == null) ? score : Math.max(prev, score);
          var mins = Math.max(minutes, (row && row.minutes) ? row.minutes : 0);
          sb.from('progress').upsert({
            user_id: uid, module_id: modId, activity_id: actId,
            score: best, minutes: mins, completed_at: new Date().toISOString()
          }, { onConflict: 'user_id,module_id,activity_id' }).then(function () { cb(prev); }, function () { cb(prev); });
        }, function () {
          pushProgress(score, minutes); cb(null); // si falla la lectura, registra igual
        });
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
      if (part != null) pushPart(part, (d.score != null) ? d.score : null, Math.max(1, Math.round(activeSec / 60)));
      if (IS_STORY || d.type === 'story' || d.type === 'dialog') {
        // Stories/diálogos = lectura sin nota: registra en silencio, SIN tarjeta emergente.
        if (!done) {
          done = true; updateChip(); pushDaily();
          var minsSt = Math.max(1, Math.min(READING_CAP_MIN, Math.round(activeSec / 60)));
          try { if (window.parent && window.parent !== window) window.parent.postMessage({ source: 'jucum-connect', type: 'done', uid: uid, mod: modId, act: actId, score: null, minutes: minsSt }, '*'); } catch (e2) {}
          if (!demo) pushProgress(100, minsSt);
        }
        return;
      }
      complete((d.score != null) ? d.score : 80, lowStakes);
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
      var retryHtml = needRetry ? '<div style="font-size:13px;font-weight:800;color:#92510F;background:#FFF3D6;border:1.5px solid #F0C66B;border-radius:12px;padding:11px 13px;margin-bottom:14px;line-height:1.5;">🔁 Necesitas <b>75% o más</b> de respuestas correctas para aprobar. Revisa el feedback y <b>vuelve a realizar la actividad</b> para completarla.</div>' : '';
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
      if (teacher) { logClass(); return; }
      pushDaily(); // los minutos del día SIEMPRE se salvan
      if (IS_STORY) { if (!demo && activeSec >= 60) pushProgress(100, Math.min(READING_CAP_MIN, Math.round(activeSec / 60))); return; }
      // Salida temprana: ya NO se registra 0% (no pisa notas previas ni bloquea el
      // reintento con "Repetir"). El tiempo quedó en daily_sessions; la nota solo
      // existe cuando el alumno termina la actividad.
    });
  }

  load(start);
})();
