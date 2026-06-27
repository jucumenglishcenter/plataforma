/* ════════════════════════════════════════════════════════════════════
   JUCUM Connect · conector para los materiales de GitHub
   ════════════════════════════════════════════════════════════════════
   Pega UNA línea al final de cada material de práctica (antes de </body>):

     <script src="https://TU-PLATAFORMA.netlify.app/jucum-connect.js"></script>

   Qué hace automáticamente:
   - Lee la identidad del alumno desde la URL (?jucum_uid=...&jucum_mod=...&jucum_act=...)
     que la plataforma agrega al abrir el material.
   - Cuenta SOLO el tiempo ACTIVO de práctica (mouse, teclado, scroll, touch).
   - Anti-abandono: a los 3 min sin actividad muestra "¿Sigues ahí?" y DEJA de
     contar tiempo. Si no responde en 5 min más, cierra la sesión de práctica
     (el tiempo inactivo nunca se registra como lectura).
   - Al terminar registra puntuación + minutos en Supabase.

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

  var WARN_AFTER_SEC   = 3 * 60;  // 3 min sin actividad → aviso
  var CLOSE_AFTER_SEC  = 5 * 60;  // +5 min sin responder → fin de práctica
  var AUTO_DONE_SEC    = 4 * 60;  // stories: completar tras 4 min activos

  // ── Leer identidad desde la URL ──
  var q = new URLSearchParams(location.search);
  var uid = q.get('jucum_uid');
  var modId = q.get('jucum_mod') || 'general';
  var actId = q.get('jucum_act') || 'auto';
  if (!uid) return; // material abierto fuera de la plataforma → no rastrea

  function load(cb) {
    if (window.supabase) return cb();
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    s.onload = cb;
    document.head.appendChild(s);
  }

  load(function () {
    var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    var activeSec = 0;          // segundos de práctica real acumulados
    var idleSec = 0;            // segundos sin actividad
    var done = false;           // ya registrado
    var sessionClosed = false;  // abandonó y no respondió
    var warned = false;
    var modal = null;

    ['mousemove','mousedown','keydown','scroll','touchstart','click'].forEach(function (ev) {
      document.addEventListener(ev, function () {
        if (sessionClosed) return;
        idleSec = 0;
        if (warned) return; // con el aviso abierto, solo el botón reanuda
      }, { passive: true });
    });

    setInterval(function () {
      if (done || sessionClosed) return;
      idleSec++;
      if (!warned && idleSec < WARN_AFTER_SEC) {
        activeSec++; // solo cuenta mientras está activo y sin aviso pendiente
        if (activeSec >= AUTO_DONE_SEC) complete(null); // stories/diálogos
      } else if (!warned && idleSec >= WARN_AFTER_SEC) {
        warned = true;
        idleSec = 0;
        showWarning();
      } else if (warned && idleSec >= CLOSE_AFTER_SEC) {
        closeSession();
      } else if (warned) {
        updateCountdown(CLOSE_AFTER_SEC - idleSec);
      }
    }, 1000);

    function resume() {
      warned = false;
      idleSec = 0;
      hideWarning();
    }

    function closeSession() {
      sessionClosed = true;
      hideWarning();
      // registra solo el tiempo activo real acumulado (si llegó al menos a 1 min)
      if (!done && activeSec >= 60) pushProgress(0, Math.round(activeSec / 60));
      banner('⏸ Práctica pausada por inactividad. El tiempo sin actividad no cuenta. Recarga la página para continuar.');
    }

    function complete(score) {
      if (done || sessionClosed) return;
      done = true;
      var minutes = Math.max(1, Math.round(activeSec / 60));
      pushProgress(score == null ? 100 : score, minutes, function () {
        toast('✅ Práctica registrada · ' + minutes + ' min' + (score != null ? ' · ' + score + '%' : ''));
      });
    }

    function pushProgress(score, minutes, ok) {
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

    // ── UI: aviso de inactividad ──
    function showWarning() {
      if (modal) return;
      modal = document.createElement('div');
      modal.id = 'jec-conn-modal';
      modal.innerHTML =
        '<div style="background:#fff;border-radius:18px;padding:30px 26px 24px;max-width:360px;width:90%;text-align:center;box-shadow:0 14px 48px rgba(0,0,0,0.4);font-family:system-ui,sans-serif;">' +
        '<div style="font-size:52px;margin-bottom:6px;">😴</div>' +
        '<div style="font-weight:800;font-size:20px;color:#1F3A8A;margin-bottom:8px;">¿Sigues practicando?</div>' +
        '<div style="font-size:13px;line-height:1.6;color:#444;margin-bottom:16px;">No detectamos actividad. El tiempo dejó de contar.<br>La práctica se cerrará en <b id="jec-conn-count" style="color:#E11930;font-family:monospace;">5:00</b>.</div>' +
        '<button id="jec-conn-btn" style="padding:12px 26px;border:none;border-radius:24px;background:#1F3A8A;color:#fff;font-weight:800;font-size:14px;cursor:pointer;">Sí, sigo aquí ✓</button>' +
        '</div>';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.72);z-index:999999;display:flex;align-items:center;justify-content:center;';
      document.body.appendChild(modal);
      document.getElementById('jec-conn-btn').onclick = resume;
    }
    function updateCountdown(sec) {
      var el = document.getElementById('jec-conn-count');
      if (el) el.textContent = Math.floor(sec/60) + ':' + String(sec%60).padStart(2,'0');
    }
    function hideWarning() { if (modal) { modal.remove(); modal = null; } }

    function toast(msg) {
      var t = document.createElement('div');
      t.textContent = msg;
      t.style.cssText = 'position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:#2EA84B;color:#fff;padding:11px 20px;border-radius:24px;font:700 14px system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,0.3);z-index:999999';
      document.body.appendChild(t);
      setTimeout(function () { t.remove(); }, 4000);
    }
    function banner(msg) {
      var b = document.createElement('div');
      b.textContent = msg;
      b.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#FFF3CD;color:#5D4037;border-bottom:2px solid #FFD54F;padding:12px 18px;font:700 13px system-ui,sans-serif;text-align:center;z-index:999998';
      document.body.appendChild(b);
    }

    // Guardar tiempo parcial al salir (si leyó al menos 1 min y no completó)
    window.addEventListener('beforeunload', function () {
      if (done || sessionClosed || activeSec < 60) return;
      pushProgress(0, Math.round(activeSec / 60));
    });
  });
})();
