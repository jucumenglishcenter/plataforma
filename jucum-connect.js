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
   - COOLDOWN 20 min: tras terminar, no deja reintentar la MISMA práctica ni
     re-registra avance hasta que pasen 20 min (evita repetirla a la carrera).
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

  var WARN_AFTER_SEC   = 3 * 60;  // 3 min sin actividad → aviso
  var CLOSE_AFTER_SEC  = 5 * 60;  // +5 min sin responder → fin de práctica
  var AUTO_DONE_SEC    = 4 * 60;  // stories: completar tras 4 min activos
  var COOLDOWN_MS      = 20 * 60 * 1000; // 20 min entre intentos: no deja reintentar ni re-registra

  // ── Leer identidad desde la URL ──
  var q = new URLSearchParams(location.search);
  var uid = q.get('jucum_uid');
  var modId = q.get('jucum_mod') || 'general';
  var actId = q.get('jucum_act') || 'auto';
  var demo = !uid; // abierto fuera de la plataforma → modo prueba (no registra)

  function load(cb) {
    if (demo) return cb(); // en modo prueba no hace falta Supabase
    if (window.supabase) return cb();
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    s.onload = cb;
    document.head.appendChild(s);
  }

  function start() {
    var sb = demo ? null : window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // ── Cooldown de 20 min entre intentos de la MISMA práctica ──
    var COOLDOWN_KEY = 'jucum_cooldown_' + (uid || 'demo') + '_' + modId + '_' + actId;
    function cooldownLeft() {
      var t = parseInt(localStorage.getItem(COOLDOWN_KEY) || '0', 10);
      return t ? Math.max(0, COOLDOWN_MS - (Date.now() - t)) : 0;
    }
    // Si la terminó hace menos de 20 min → bloquear y mostrar cuenta regresiva
    if (cooldownLeft() > 0) { showCooldownGate(); return; }
    var activeSec = 0;          // segundos de práctica real acumulados
    var idleSec = 0;            // segundos sin actividad
    var done = false;           // ya registrado
    var sessionClosed = false;  // abandonó y no respondió
    var warned = false;
    var modal = null;

    // ── Chip flotante con el tiempo activo ──
    var chip = document.createElement('div');
    chip.id = 'jec-conn-chip';
    chip.style.cssText = 'position:fixed;bottom:14px;right:14px;z-index:999997;display:flex;align-items:center;gap:7px;background:#1F3A8A;color:#fff;padding:8px 14px;border-radius:24px;font:700 13px system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,0.25);cursor:default;user-select:none;white-space:nowrap;';
    chip.innerHTML = '<span>⏱</span><span id="jec-conn-time" style="font-family:monospace;font-size:14px;">0:00</span>' +
      (demo ? '<span style="background:rgba(255,255,255,0.22);padding:2px 8px;border-radius:10px;font-size:11px;font-weight:800;">PRUEBA · no registra</span>' : '');
    chip.title = demo
      ? 'Modo prueba: abriste el material fuera de la plataforma, el tiempo NO se registra.'
      : 'Tiempo activo de práctica (se registra en tu progreso).';
    document.body.appendChild(chip);

    function fmt(sec) {
      return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
    }
    function updateChip() {
      var t = document.getElementById('jec-conn-time');
      if (t) t.textContent = fmt(activeSec);
      if (warned || sessionClosed) {
        chip.style.background = '#9E9E9E';
        chip.firstChild.textContent = '⏸';
      } else if (done) {
        chip.style.background = '#2EA84B';
        chip.firstChild.textContent = '✓';
      } else {
        chip.style.background = '#1F3A8A';
        chip.firstChild.textContent = '⏱';
      }
    }

    ['mousemove','mousedown','keydown','scroll','touchstart','click'].forEach(function (ev) {
      document.addEventListener(ev, function () {
        if (sessionClosed) return;
        idleSec = 0;
        if (warned) return; // con el aviso abierto, solo el botón reanuda
      }, { passive: true });
    });

    setInterval(function () {
      if (sessionClosed) return;
      idleSec++;
      if (!warned && idleSec < WARN_AFTER_SEC) {
        if (!done) {
          activeSec++; // solo cuenta mientras está activo y sin aviso pendiente
          if (activeSec >= AUTO_DONE_SEC) complete(null); // stories/diálogos
        }
      } else if (!warned && idleSec >= WARN_AFTER_SEC) {
        warned = true;
        idleSec = 0;
        showWarning();
      } else if (warned && idleSec >= CLOSE_AFTER_SEC) {
        closeSession();
      } else if (warned) {
        updateCountdown(CLOSE_AFTER_SEC - idleSec);
      }
      updateChip();
    }, 1000);

    function resume() {
      warned = false;
      idleSec = 0;
      hideWarning();
      updateChip();
    }

    function closeSession() {
      sessionClosed = true;
      hideWarning();
      updateChip();
      // registra solo el tiempo activo real acumulado (si llegó al menos a 1 min)
      if (!done && activeSec >= 60) pushProgress(0, Math.round(activeSec / 60));
      banner('⏸ Práctica pausada por inactividad. El tiempo sin actividad no cuenta. Recarga la página para continuar.');
    }

    function complete(score) {
      if (done || sessionClosed) return;
      done = true;
      updateChip();
      var minutes = Math.max(1, Math.round(activeSec / 60));
      var pct = score == null ? 100 : score;
      var blocked = cooldownLeft() > 0; // reintento dentro de los 20 min → no registra
      var statusMsg;
      if (blocked) {
        statusMsg = '⏳ Este intento no cuenta — espera 20 min entre intentos para que tu avance valga.';
        showResultCard(pct, statusMsg, score != null);
        return;
      }
      localStorage.setItem(COOLDOWN_KEY, String(Date.now())); // inicia el cooldown
      statusMsg = demo
        ? '🧪 Modo prueba · ' + minutes + ' min' + (score != null ? ' · ' + pct + '%' : '') + ' (no se registró)'
        : '✅ Práctica registrada · ' + minutes + ' min' + (score != null ? ' · ' + pct + '%' : '');
      pushProgress(pct, minutes, function () { showResultCard(pct, statusMsg, score != null); });
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
    // ── Compuerta de cooldown (bloquea reintento antes de 20 min) ──
    function showCooldownGate() {
      var gate = document.createElement('div');
      gate.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.93);z-index:1000000;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;padding:16px;';
      gate.innerHTML =
        '<div style="background:#fff;border-radius:20px;padding:34px 28px;max-width:380px;width:100%;text-align:center;box-shadow:0 18px 50px rgba(0,0,0,0.5);">' +
        '<div style="font-size:54px;margin-bottom:8px;">⏳</div>' +
        '<div style="font-weight:800;font-size:21px;color:#1F3A8A;margin-bottom:8px;">Ya practicaste esto recién</div>' +
        '<div style="font-size:13.5px;line-height:1.6;color:#444;margin-bottom:18px;">Para que tu avance valga, espera un momento antes de reintentarla. Mientras tanto, ¡prueba otra actividad de tu módulo!</div>' +
        '<div style="font-size:12px;color:#777;margin-bottom:4px;">Podrás reintentarla en</div>' +
        '<div id="jec-cd" style="font:800 36px monospace;color:#E11930;margin-bottom:18px;">20:00</div>' +
        '<button id="jec-cd-back" style="padding:12px 26px;border:none;border-radius:24px;background:#1F3A8A;color:#fff;font-weight:800;font-size:14px;cursor:pointer;">← Volver</button>' +
        '</div>';
      document.body.appendChild(gate);
      var back = document.getElementById('jec-cd-back');
      if (back) back.onclick = function () { if (history.length > 1) history.back(); else window.close(); };
      function tick() {
        var left = cooldownLeft();
        if (left <= 0) { location.reload(); return; }
        var el = document.getElementById('jec-cd');
        if (el) el.textContent = Math.floor(left / 60000) + ':' + String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
      }
      tick();
      setInterval(tick, 1000);
    }

    // Guardar tiempo parcial al salir (si leyó al menos 1 min y no completó)
    window.addEventListener('beforeunload', function () {
      if (done || sessionClosed || activeSec < 60) return;
      pushProgress(0, Math.round(activeSec / 60));
    });
  }

  load(start);
})();
