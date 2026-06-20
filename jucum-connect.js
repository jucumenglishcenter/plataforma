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
   - 1 intento que cuenta + mejora a la semana: la nota se registra al primer
     intento; repetir esa MISMA práctica dentro de la semana NO cambia la nota
     (el alumno puede practicar igual, libremente). Pasados 7 días, puede
     reintentarla y nos quedamos con la MEJOR nota.
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
  // Mejora de nota: la práctica se registra al primer intento; recién a la SEMANA
  // puede reintentarla para mejorar (nos quedamos con la mejor nota).
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
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    s.onload = cb;
    document.head.appendChild(s);
  }

  function start() {
    var sb = demo ? null : window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    // Cliente para registrar el USO DE CLASE del profesor (bitácora)
    var classSb = (teacher && window.supabase) ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
    var CLASS_MIN_SEC = 5 * 60;
    var classId = 'cl-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    var classStartISO = new Date().toISOString();
    function logClass() {
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
    // Guardamos cuándo se hizo el primer intento. Dentro de la semana, repetir
    // la práctica NO cambia la nota (igual puede practicar libremente). Pasada
    // la semana, puede reintentar y nos quedamos con la MEJOR nota.
    var ATTEMPT_KEY = 'jucum_attempt_' + (uid || 'demo') + '_' + modId + '_' + actId;
    var activeSec = 0;          // segundos de práctica real acumulados
    var idleSec = 0;            // segundos sin actividad
    var done = false;           // ya registrado en esta sesión
    var paused = false;         // conteo pausado por inactividad (sin cerrar nada)

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
          activeSec++;
          var capMin = Math.min(READING_CAP_MIN, Math.round(activeSec / 60)); // tope silencioso para el reporte
          if (!done && activeSec >= AUTO_DONE_SEC && !teacher && !exam) {
            done = true; // marcada como practicada (desbloquea la siguiente) — sin cooldown ni tarjeta
            if (!demo) pushProgress(100, Math.max(1, capMin));
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
        activeSec++;
        if (teacher && activeSec % 60 === 0) logClass();
      }
      updateChip();
    }, 1000);

    function complete(score) {
      if (done) return;
      done = true;
      updateChip();
      var minutes = Math.max(1, Math.round(activeSec / 60));
      var pct = score == null ? 100 : score;

      if (demo) {
        showResultCard(pct, '🧪 Modo prueba · ' + minutes + ' min' + (score != null ? ' · ' + pct + '%' : '') + ' (no se registró)', score != null);
        return;
      }

      var firstTs = parseInt(localStorage.getItem(ATTEMPT_KEY) || '0', 10);
      var now = Date.now();
      // Dentro de la semana del primer intento → practica libre, pero la nota NO cambia.
      if (firstTs && (now - firstTs) < RETRY_AFTER_MS) {
        var fecha = new Date(firstTs + RETRY_AFTER_MS).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' });
        showResultCard(pct, '📌 Tu nota guardada se mantiene. Podrás intentar mejorarla a partir del ' + fecha + '. ¡Mientras tanto, sigue practicando!', score != null);
        return;
      }
      // Primer intento, o ya pasó la semana → registra quedándonos con la MEJOR nota.
      improveProgress(pct, minutes, function (prev) {
        localStorage.setItem(ATTEMPT_KEY, String(now)); // (re)inicia la ventana de una semana
        var msg;
        if (prev == null) msg = '✅ Práctica registrada · ' + minutes + ' min' + (score != null ? ' · ' + pct + '%' : '');
        else if (score != null && pct > prev) msg = '🎉 ¡Mejoraste tu nota! Antes ' + prev + '% → ahora ' + pct + '%.';
        else if (score != null) msg = '👍 Lo intentaste de nuevo. Tu mejor nota (' + prev + '%) se mantiene.';
        else msg = '✅ Práctica registrada · ' + minutes + ' min';
        showResultCard(pct, msg, score != null);
      });
    }

    // Registra el progreso quedándonos con la MEJOR nota (nunca baja una nota previa).
    function improveProgress(score, minutes, cb) {
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
      if (demo) { if (ok) ok(); return; } // modo prueba: no escribe en la nube
      sb.from('progress').upsert({
        user_id: uid, module_id: modId, activity_id: actId,
        score: score, minutes: minutes, completed_at: new Date().toISOString()
      }, { onConflict: 'user_id,module_id,activity_id' }).then(function (r) {
        if (r.error) { console.warn('jucum-connect:', r.error.message); return; }
        if (ok) ok();
      });
    }

    // Quizzes (readings, listenings, gramática, resúmenes MCQ) avisan así:
    window.addEventListener('jucum:done', function (e) {
      complete((e.detail && e.detail.score != null) ? e.detail.score : 80);
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
      if (pct >= 70) return { emoji:'💪', title:'¡Muy bien!',     text:'Vas por buen camino. Repasa los pocos errores y serás imparable.',                                bg:'#E3F2FD', color:'#1565C0' };
      if (pct >= 50) return { emoji:'🌱', title:'¡Buen intento!', text:'Aprendiste más de lo que crees. Revisa el feedback y vuelve a intentarlo: cada error te acerca.',     bg:'#FFF8E1', color:'#F57F17' };
      return               { emoji:'🤗', title:'¡Sigue adelante!', text:'Equivocarse ES aprender — tu cerebro ya está cambiando aunque no lo sientas. Repasa con calma y verás el avance.', bg:'#FCE4EC', color:'#AD1457' };
    }
    function showResultCard(pct, statusMsg, hasScore) {
      var m = jecMotivation(pct);
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
      if (IS_STORY) { if (!demo && activeSec >= 60) pushProgress(100, Math.min(READING_CAP_MIN, Math.round(activeSec / 60))); return; }
      if (done || activeSec < 60) return;
      pushProgress(0, Math.round(activeSec / 60));
    });
  }

  load(start);
})();
