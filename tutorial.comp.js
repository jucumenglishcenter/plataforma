/* tutorial.jsx · Tutorial guiado de la plataforma (alumnos)
 * ───────────────────────────────────────────────────────────────────────────
 * Recorrido paso a paso que RESALTA las áreas reales (spotlight), hace
 * SCROLL AUTOMÁTICO hasta cada área (nunca se queda "oscuro" fuera de vista)
 * y se maneja con Siguiente/Anterior. Se ofrece la primera vez (aceptar o
 * rechazar) y siempre puede reabrirse con el botón flotante «?» del lado
 * derecho (visible en toda la app del alumno).
 *
 * ACTUALIZADOR:
 *  • TUT_VERSION: al cambiar la plataforma subimos este número → se re-ofrece.
 *  • Campaña (nube): el profesor toca "🔁 Volver a mostrarlo a todos".
 *
 * Exporta a window: StudentTutorial, TutorialAdminCard.
 */
(function () {
  const { useState, useEffect, useCallback } = React;

  const TUT_VERSION = 3; // ⬆ subir cuando cambie la plataforma/los pasos

  const STEPS = [
    { target: 'nav',      title: 'Tu menú',            body: 'Desde aquí llegas a todo: tu práctica, tu perfil, el foro, tus mensajes, tareas, examen y tu avance.' },
    { target: 'practica', title: 'Tu práctica',        body: 'Aquí vive tu módulo: stories, comprensión, listening y gramática. Completa una actividad para desbloquear la siguiente.' },
    { target: 'neuro',    title: 'Neuro, tu mascota',  body: 'Neuro crece con tu constancia 🧠💛 Practica un poquito cada día para subir su energía. En "Mi práctica" te explica cómo ganar XP.' },
    { target: 'meta',     title: 'Tu meta y tu racha', body: 'Cada día que practicas mantienes tu racha 🔥 y sumas XP para la liga semanal. ¡No la rompas!' },
    { target: 'bell',     title: 'Avisos',             body: 'La campanita te avisa de mensajes del profesor, respuestas del foro, tareas y más. Revísala al entrar.' },
  ];

  async function getCampaign() {
    try {
      if (!window.JUCUM_SB) return 0;
      const sb = window.JUCUM_SB.getClient();
      const { data } = await sb.from('app_settings').select('value').eq('key', 'tutorial_campaign').maybeSingle();
      return data ? (parseInt(data.value, 10) || 0) : 0;
    } catch (e) { return 0; }
  }
  async function bumpCampaign() {
    const cur = await getCampaign();
    const next = cur + 1;
    const sb = window.JUCUM_SB.getClient();
    const { error } = await sb.from('app_settings').upsert({ key: 'tutorial_campaign', value: String(next) }, { onConflict: 'key' });
    if (error) throw error;
    return next;
  }
  const seenKey = (uid) => 'jucum_tut_done_' + (uid || 'anon');

  function Spotlight({ steps, idx, rects, onNext, onPrev, onClose }) {
    const st = steps[idx];
    const rect = st ? rects[st.target] : null;
    if (!st) return null;
    const last = idx === steps.length - 1;
    // Si el elemento no se encontró, mostramos la tarjeta centrada (sin oscurecer)
    const tipStyle = rect
      ? (rect.top < window.innerHeight / 2
        ? { top: Math.min(rect.top + rect.height + 18, window.innerHeight - 230), left: Math.min(Math.max(rect.left, 12), Math.max(12, window.innerWidth - 312)) }
        : { top: Math.max(rect.top - 216, 12), left: Math.min(Math.max(rect.left, 12), Math.max(12, window.innerWidth - 312)) })
      : { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };
    return ReactDOM.createPortal(
      <>
        {rect && <div style={{ position: 'fixed', top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12, borderRadius: 14, boxShadow: '0 0 0 9999px rgba(15,23,42,.74)', border: '3px solid #FFD54A', zIndex: 100000, pointerEvents: 'none' }}></div>}
        <div style={{ position: 'fixed', zIndex: 100001, background: '#fff', borderRadius: 14, padding: '15px 16px', width: 292, boxShadow: '0 14px 44px rgba(0,0,0,.42)', fontFamily: "'Nunito',sans-serif", ...tipStyle }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#B23A77', letterSpacing: '.04em', textTransform: 'uppercase' }}>Paso {idx + 1} de {steps.length}</div>
          <div style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: 15.5, margin: '4px 0 6px', color: '#2A2A2A' }}>{st.title}</div>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: '#666', fontWeight: 600, marginBottom: 13 }}>{st.body}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', gap: 5, flex: 1 }}>
              {steps.map((_, i) => <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: i === idx ? '#B23A77' : '#E0DAF0' }}></span>)}
            </div>
            {idx > 0 && <button onClick={onPrev} style={{ border: '1.5px solid #E8E5DC', background: '#fff', color: '#777', fontFamily: 'inherit', fontWeight: 800, fontSize: 12.5, borderRadius: 18, padding: '8px 13px', cursor: 'pointer' }}>Anterior</button>}
            {!last
              ? <button onClick={onNext} style={{ border: 'none', background: 'linear-gradient(135deg,#FF7FB2,#FF5FA0)', color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 12.5, borderRadius: 18, padding: '8px 16px', cursor: 'pointer' }}>Siguiente →</button>
              : <button onClick={onClose} style={{ border: 'none', background: 'linear-gradient(135deg,#FF7FB2,#FF5FA0)', color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 12.5, borderRadius: 18, padding: '8px 16px', cursor: 'pointer' }}>¡Listo! 🎉</button>}
          </div>
          <div style={{ textAlign: 'center', marginTop: 8 }}><button onClick={onClose} style={{ background: 'none', border: 'none', color: '#B0AAA0', fontFamily: 'inherit', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>Saltar tutorial</button></div>
        </div>
      </>, document.body);
  }

  function StudentTutorial({ student, onGoHome }) {
    const [phase, setPhase] = useState('idle');     // idle · invite · running
    const [idx, setIdx] = useState(0);
    const [runSteps, setRunSteps] = useState(STEPS);
    const [rects, setRects] = useState({});
    const [effKey, setEffKey] = useState(null);

    const measure = useCallback(() => {
      const r = {};
      STEPS.forEach(s => {
        const el = document.querySelector('[data-tut="' + s.target + '"]');
        if (el) { const b = el.getBoundingClientRect(); if (b.width > 4 && b.height > 4) r[s.target] = { top: b.top, left: b.left, width: b.width, height: b.height }; }
      });
      setRects(r);
      return r;
    }, []);

    useEffect(() => {
      let alive = true;
      (async () => {
        const camp = await getCampaign();
        const key = 'v' + TUT_VERSION + 'c' + camp;
        if (!alive) return;
        setEffKey(key);
        let seen = null;
        try { seen = localStorage.getItem(seenKey(student.id)); } catch (e) {}
        if (seen !== key) setPhase('invite');
      })();
      return () => { alive = false; };
    }, [student.id]);

    /* SCROLL AUTOMÁTICO: al cambiar de paso, lleva la página hasta el elemento
     * (centrado en pantalla) y recién entonces mide y muestra el foco. */
    useEffect(() => {
      if (phase !== 'running') return;
      const st = runSteps[idx];
      let t1, t2;
      if (st) {
        const el = document.querySelector('[data-tut="' + st.target + '"]');
        if (el) {
          const b = el.getBoundingClientRect();
          const abs = b.top + window.scrollY;
          const want = Math.max(0, abs - (window.innerHeight / 2) + (b.height / 2));
          try { window.scrollTo({ top: want, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, want); }
          t1 = setTimeout(measure, 380);
          t2 = setTimeout(measure, 820);
        } else measure();
      }
      const onR = () => measure();
      window.addEventListener('resize', onR);
      return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener('resize', onR); };
    }, [phase, idx, runSteps, measure]);

    const markSeen = () => { try { if (effKey) localStorage.setItem(seenKey(student.id), effKey); } catch (e) {} };
    const begin = () => {
      // Ir al inicio del panel y arrancar con los pasos que SÍ existen en pantalla
      if (onGoHome) onGoHome();
      window.scrollTo(0, 0);
      setTimeout(() => {
        const avail = STEPS.filter(s => document.querySelector('[data-tut="' + s.target + '"]'));
        setRunSteps(avail.length ? avail : STEPS);
        setIdx(0);
        measure();
        setPhase('running');
      }, 420);
    };
    const close = () => { markSeen(); setPhase('idle'); };

    return (
      <>
        {/* Botón flotante «?» — siempre visible al lado derecho */}
        {phase === 'idle' && ReactDOM.createPortal(
          <button onClick={() => setPhase('invite')} title="Ver el tutorial de la plataforma" aria-label="Tutorial"
            style={{ position: 'fixed', right: 14, top: '58%', zIndex: 9000, width: 46, height: 46, borderRadius: '50%', border: '2.5px solid #fff', cursor: 'pointer', background: 'linear-gradient(135deg,#FF7FB2,#FF5FA0)', color: '#fff', fontSize: 23, fontWeight: 800, fontFamily: "'Fredoka','Nunito',sans-serif", boxShadow: '0 4px 16px rgba(255,95,160,.5)', lineHeight: 1 }}>?</button>,
          document.body)}

        {phase === 'invite' && ReactDOM.createPortal(
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: "'Nunito',sans-serif" }} onClick={close}>
            <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 400, padding: '26px 24px', textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,.35)' }} onClick={e => e.stopPropagation()}>
              <div style={{ width: 64, height: 60, margin: '0 auto 10px', borderRadius: '50% 50% 47% 47%', background: 'radial-gradient(circle at 50% 34%,#FF9CC6,#FF5FA0)', position: 'relative', boxShadow: 'inset 0 -6px 10px rgba(0,0,0,.13), 0 0 0 5px rgba(255,95,160,.18)' }}>
                <span style={{ position: 'absolute', top: 21, left: 18, width: 9, height: 9, borderRadius: '50%', background: '#3A2230' }}></span>
                <span style={{ position: 'absolute', top: 21, right: 18, width: 9, height: 9, borderRadius: '50%', background: '#3A2230' }}></span>
              </div>
              <div style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: 20, color: '#2A2A2A' }}>¡Hola! Soy Neuro 🧠</div>
              <div style={{ fontSize: 13.5, color: '#666', fontWeight: 600, lineHeight: 1.55, margin: '6px 0 18px' }}>¿Quieres un recorrido rápido para conocer tu plataforma? Son solo {STEPS.length} pasos.</div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={close} style={{ border: '1.5px solid #E8E5DC', background: '#fff', color: '#777', fontFamily: 'inherit', fontWeight: 800, fontSize: 13, borderRadius: 20, padding: '10px 18px', cursor: 'pointer' }}>Ahora no</button>
                <button onClick={begin} style={{ border: 'none', background: 'linear-gradient(135deg,#FF7FB2,#FF5FA0)', color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 13, borderRadius: 20, padding: '10px 20px', cursor: 'pointer' }}>¡Sí, muéstrame! →</button>
              </div>
            </div>
          </div>, document.body)}

        {phase === 'running' && <Spotlight steps={runSteps} idx={Math.min(idx, runSteps.length - 1)} rects={rects}
          onNext={() => setIdx(i => Math.min(i + 1, runSteps.length - 1))}
          onPrev={() => setIdx(i => Math.max(i - 1, 0))}
          onClose={close} />}
      </>
    );
  }

  /* Tutorial del panel de ADMINISTRACIÓN — controlado por el botón
   * «❓ Necesitas ayuda» del encabezado (prop open). Resalta las áreas reales
   * con el mismo Spotlight que el de alumnos. */
  const ADMIN_STEPS = [
    { target: 'admin-pagos',   title: 'Gestión de pagos', body: 'Aquí defines montos y día de pago, confirmas los pagos que registran los alumnos, envías recordatorios de pago a los grupos que elijas y registras pagos de quienes no pueden hacerlo solos.' },
    { target: 'admin-registro', title: 'Registro de alumnos', body: 'Todos tus alumnos, con una etiqueta que indica si los creaste tú o entraron por el enlace, ordenados por fecha o filtrados por grupo. Desde cada alumno ves su avance, restableces su contraseña o lo eliminas.' },
    { target: 'admin-registro', title: 'Enlace de autoregistro', body: 'Dentro de «Registro de alumnos» encontrarás el enlace para que los alumnos se inscriban solos. Compártelo por WhatsApp y aparecerán en tu lista.' },
    { target: 'admin-attendance', title: 'Asistencia', body: 'Marca la asistencia y participación de cada clase.' },
    { target: 'admin-bell', title: 'Avisos', body: 'La campanita te avisa cuando un alumno registra un pago o se inscribe. Revísala al entrar.' },
    { target: 'admin-help', title: '¿Necesitas ayuda?', body: 'Puedes volver a ver este recorrido cuando quieras desde este botón. ¡Listo!' },
  ];

  function AdminTutorial({ open, onClose }) {
    const [phase, setPhase] = useState('idle');   // idle · running
    const [idx, setIdx] = useState(0);
    const [runSteps, setRunSteps] = useState(ADMIN_STEPS);
    const [rects, setRects] = useState({});

    const measure = useCallback(() => {
      const r = {};
      ADMIN_STEPS.forEach(s => {
        const el = document.querySelector('[data-tut="' + s.target + '"]');
        if (el) { const b = el.getBoundingClientRect(); if (b.width > 4 && b.height > 4) r[s.target] = { top: b.top, left: b.left, width: b.width, height: b.height }; }
      });
      setRects(r);
      return r;
    }, []);

    // Arranca cuando el padre pone open=true
    useEffect(() => {
      if (!open) return;
      window.scrollTo(0, 0);
      setTimeout(() => {
        const avail = ADMIN_STEPS.filter(s => document.querySelector('[data-tut="' + s.target + '"]'));
        setRunSteps(avail.length ? avail : ADMIN_STEPS);
        setIdx(0);
        measure();
        setPhase('running');
      }, 200);
    }, [open, measure]);

    useEffect(() => {
      if (phase !== 'running') return;
      const st = runSteps[idx];
      let t1, t2;
      if (st) {
        const el = document.querySelector('[data-tut="' + st.target + '"]');
        if (el) {
          const b = el.getBoundingClientRect();
          const abs = b.top + window.scrollY;
          const want = Math.max(0, abs - (window.innerHeight / 2) + (b.height / 2));
          try { window.scrollTo({ top: want, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, want); }
          t1 = setTimeout(measure, 320);
          t2 = setTimeout(measure, 760);
        } else measure();
      }
      const onR = () => measure();
      window.addEventListener('resize', onR);
      return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener('resize', onR); };
    }, [phase, idx, runSteps, measure]);

    const finish = () => { setPhase('idle'); if (onClose) onClose(); };
    if (phase !== 'running') return null;
    return <Spotlight steps={runSteps} idx={Math.min(idx, runSteps.length - 1)} rects={rects}
      onNext={() => setIdx(i => Math.min(i + 1, runSteps.length - 1))}
      onPrev={() => setIdx(i => Math.max(i - 1, 0))}
      onClose={finish} />;
  }

  function TutorialAdminCard() {
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState('');
    const doIt = async () => {
      if (!window.JUCUM_SB) { setMsg('Solo disponible con la nube conectada.'); return; }
      if (!confirm('¿Volver a mostrar el tutorial a TODOS los alumnos en su próximo ingreso?')) return;
      setBusy(true); setMsg('');
      try { const n = await bumpCampaign(); setMsg('✅ Listo. Se ofrecerá a todos de nuevo (campaña #' + n + ').'); }
      catch (e) { setMsg('⚠ ' + ((e.message || '').includes('app_settings') ? 'Falta correr el script SQL de app_settings.' : e.message)); }
      setBusy(false);
    };
    return (
      <div className="scard" style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 26 }}>🎓</span>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: 14.5 }}>Tutorial de la plataforma (alumnos)</div>
          <div style={{ fontSize: 12, color: 'var(--text-soft)', fontWeight: 600, lineHeight: 1.45 }}>Se ofrece la primera vez y cuando la plataforma se actualiza; el alumno también lo reabre con el botón «?». Pruébalo con "👁 Ver como alumno". {msg && <b style={{ color: '#1F3A8A' }}>{msg}</b>}</div>
        </div>
        <button onClick={doIt} disabled={busy} className="btn-soft" style={{ background: '#F0F4FA', borderColor: '#C9D6F0', color: '#1F3A8A' }}>{busy ? '…' : '🔁 Volver a mostrarlo a todos'}</button>
      </div>
    );
  }

  Object.assign(window, { StudentTutorial, AdminTutorial, TutorialAdminCard });
})();
