/* JUCUM EC — Mascota "Neuro" 🧠
 * El estado (ánimo, fuerza y las COSAS que tiene/pierde) refleja el esfuerzo
 * diario del alumno. No es aleatorio: se deriva de su constancia real.
 *
 *   bienestar (0–100) = constancia (racha + días activos) + dominio + meta de hoy
 *                       − penalización por días sin practicar
 *
 * 7 etapas (0 = agotado … 6 = imparable). Si el alumno deja de practicar,
 * Neuro va "vendiendo sus cosas" para cuidarse; al retomar, las recupera.
 *
 * La barra y los diálogos NO estiman: el "te faltan N días" se obtiene
 * simulando ESTA MISMA fórmula día a día hasta cruzar de etapa (forecastDays),
 * para que lo que se promete se cumpla (sin falsas esperanzas).
 */
(function () {
  // Objetos que Neuro gana/pierde según su bienestar (de menos a más logrado)
  const ITEMS = [
    { emoji: '💡', name: 'su lámpara' },
    { emoji: '📚', name: 'sus libros' },
    { emoji: '🎧', name: 'sus audífonos' },
    { emoji: '🪴', name: 'su plantita' },
    { emoji: '🏅', name: 'su medalla' },
    { emoji: '🏆', name: 'su trofeo' },
  ];

  const STAGES = [
    { id: 0, label: 'Agotado',   mood: 'cry',     anim: 'slump', color: '#B9A6AE', glow: 'rgba(120,110,115,0.25)' },
    { id: 1, label: 'Decaído',   mood: 'sad',     anim: 'slump', color: '#D7A9B4', glow: 'rgba(170,120,135,0.28)' },
    { id: 2, label: 'Preocupado',mood: 'worried', anim: 'sway',  color: '#E59FB0', glow: 'rgba(220,120,150,0.30)' },
    { id: 3, label: 'Estable',   mood: 'neutral', anim: 'idle',  color: '#F58FB0', glow: 'rgba(245,120,160,0.32)' },
    { id: 4, label: 'Animado',   mood: 'smile',   anim: 'bob',   color: '#FB7AAA', glow: 'rgba(251,100,160,0.38)' },
    { id: 5, label: 'Fuerte',    mood: 'happy',   anim: 'bob',   color: '#FF5FA0', glow: 'rgba(255,80,150,0.45)' },
    { id: 6, label: 'Imparable', mood: 'great',   anim: 'run',   color: '#FF3D8B', glow: 'rgba(255,60,140,0.55)' },
  ];

  /* ── Fórmula de energía: ÚNICA fuente de verdad ──
   * comp = { streak, active7, masteryPct, todayMin, target, inactive } */
  function energyOf(c) {
    let w = 45;
    w += Math.min(c.streak || 0, 7) * 4;                       // constancia (racha) hasta +28
    w += (Math.min(c.active7 || 0, 7) / 7) * 18;               // días activos últimos 7 hasta +18
    w += (Math.min(c.masteryPct || 0, 100) / 100) * 14;        // dominio hasta +14
    if ((c.todayMin || 0) >= (c.target || 15)) w += 10;        // meta de hoy cumplida
    else if ((c.todayMin || 0) > 0) w += 4;                    // algo de práctica hoy
    // El 1.er día sin practicar es la ventana normal del día (racha aún viva): NO penaliza.
    // La inactividad real penaliza desde el 2.º día sin practicar (−7/día, hasta −56).
    w -= Math.min(Math.max(0, (c.inactive || 0) - 1), 8) * 7;
    return Math.max(0, Math.min(100, Math.round(w)));
  }
  function stageOf(w) { return Math.max(0, Math.min(6, Math.round((w / 100) * 6))); }
  // energía mínima para ENTRAR a la etapa k (k = 1..6)
  function entryW(k) { return k <= 0 ? 0 : Math.ceil((k - 0.5) * 100 / 6); }

  /* PRONÓSTICO HONESTO: simula "practicar cada día" con la MISMA fórmula y
   * cuenta los días reales hasta subir de etapa. Mantiene el dominio constante
   * (piso conservador: si las notas mejoran, sube ANTES — nunca después). */
  function forecastDays(comp) {
    const start = stageOf(energyOf(comp));
    if (start >= 6) return { peak: true, stage: 6 };
    const s = {
      streak: comp.streak || 0, active7: comp.active7 || 0,
      masteryPct: comp.masteryPct || 0, todayMin: comp.todayMin || 0,
      target: comp.target || 15, inactive: comp.inactive || 0,
    };
    let prevW = energyOf(s);
    for (let d = 1; d <= 40; d++) {
      s.streak = s.streak + 1;
      s.active7 = Math.min(7, s.active7 + 1);
      s.inactive = 0;
      s.todayMin = Math.max(s.todayMin, s.target);
      const w = energyOf(s);
      if (stageOf(w) > start) return { days: d, stage: start + 1, atW: w };
      if (w <= prevW) return { plateau: true, stage: start + 1, capW: w };
      prevW = w;
    }
    return { plateau: true, stage: start + 1 };
  }

  function getMascotState(student) {
    const D = window.JUCUM_DATA;
    const prog = (D.getStudentProgress(student.id)) || { todayMinutes: 0 };
    const mastery = D.getStudentMastery ? D.getStudentMastery(student) : { pct: 0, active7: 0 };
    let target = 15;
    try { target = (D.getGroupSettings(student.group) || {}).dailyTargetMin || 15; } catch {}
    const todayMin = prog.todayMinutes || 0;
    const inactive = (D.getRealInactiveDays ? D.getRealInactiveDays(student)
                     : (typeof student.lastActiveDays === 'number' ? student.lastActiveDays : 0));
    const streak = student.streak || 0;
    const active7 = mastery.active7 || 0;
    const masteryPct = Math.min(mastery.pct || 0, 100);

    const comp = { streak, active7, masteryPct, todayMin, target, inactive };
    const w = energyOf(comp);
    const stageId = stageOf(w);
    const st = STAGES[stageId];

    // Objetos que conserva = etapa; los que "vendió" = los de arriba
    const owned = ITEMS.slice(0, stageId);
    const lost = ITEMS.slice(stageId);
    const nextSold = lost[0] ? lost[0].name : null;       // lo próximo en peligro
    const justRecovered = owned[owned.length - 1] || null;

    // ── Próximo cambio (honesto) + límites de la barra segmentada ──
    const bounds = [1, 2, 3, 4, 5, 6].map(entryW);        // 6 divisiones de la barra
    let next;
    if (stageId >= 6) {
      next = { peak: true, stage: 6, pts: 0 };
    } else {
      const fc = forecastDays(comp);
      next = {
        stage: stageId + 1,
        nextLabel: STAGES[stageId + 1].label,
        pts: Math.max(1, entryW(stageId + 1) - w),
        days: fc.days || null,
        plateau: !!fc.plateau,
        capW: fc.capW || null,
      };
    }

    const minsLeft = Math.max(0, target - todayMin);
    const narrative = buildNarrative(stageId, { inactive, streak, nextSold, justRecovered, minsLeft, todayMin, target });

    return {
      w, stage: stageId, name: 'Neuro', label: st.label, mood: st.mood, anim: st.anim,
      color: st.color, glow: st.glow, headband: stageId >= 5,
      items: { owned, lost, all: ITEMS }, nextSold, narrative,
      minsLeft, target, todayMin, inactive, streak, masteryPct, active7,
      next, bounds, comp,
    };
  }

  function buildNarrative(stage, ctx) {
    const { inactive, todayMin } = ctx;
    switch (stage) {
      case 0: return `Neuro se quedó sin energía y se fue a descansar… te dejó una carta. Tócala para leer su mensaje 💌`;
      case 1: return `Neuro está triste viendo a otros Neuros felices. Unos minutos de práctica hoy lo animan 🌱`;
      case 2: return `Neuro está bajo la lluvia, preocupado. Si no practicas seguirá decayendo — ¡no lo dejes! ☔`;
      case 3: return `Neuro está estable, pero si dejas de practicar se va a <b>ahogar en problemas</b>… ya se siente venir la lluvia. ¡Mantén tu práctica diaria! 🌧️→☀️`;
      case 4: return `¡Neuro está animado! Tu constancia se nota. Sigue así 😄`;
      case 5: return `¡Neuro está fuerte, con su traje de karateca! No bajes el ritmo 🥋💪`;
      case 6: return `¡Neuro está IMPARABLE, surcando el espacio en su nave! ${todayMin > 0 ? 'Practicaste hoy y' : 'Tu constancia es ejemplar y'} eres su mejor entrenador 🚀🌌`;
      default: return '';
    }
  }

  /* ── Diálogo REACTIVO: cambia según lo que el alumno acaba de hacer ──
   * Compara con la última etapa vista (localStorage) para detectar subió/bajó,
   * y usa todayMin para distinguir "ya practicó hoy" vs "aún no". Siempre dice
   * el PRÓXIMO PASO concreto, calculado por forecastDays (se cumple de verdad). */
  function getNeuroDialogue(student, m) {
    const key = 'jucum_neuro_seen_' + student.id;
    let prev = null;
    try { prev = JSON.parse(localStorage.getItem(key) || 'null'); } catch {}
    const today = new Date().toISOString().slice(0, 10);
    const practiced = (m.todayMin || 0) > 0;
    const next = m.next || {};
    const nextLabel = next.nextLabel || (next.stage != null && STAGES[next.stage] ? STAGES[next.stage].label : null);
    const daysTxt = next.days ? `practica ${next.days} día${next.days > 1 ? 's' : ''} más` : null;

    let ctx;
    if (prev && typeof prev.stage === 'number' && m.stage > prev.stage) ctx = 'up';
    else if (prev && typeof prev.stage === 'number' && m.stage < prev.stage) ctx = 'down';
    else if (practiced && m.stage >= 6) ctx = 'peak';
    else if (practiced) ctx = 'practiced';
    else ctx = 'arrival';

    try { localStorage.setItem(key, JSON.stringify({ stage: m.stage, day: today })); } catch {}

    let who, msg, step;
    switch (ctx) {
      case 'up':
        who = '🧠 Neuro · ¡subió!';
        msg = `¡Lo lograste! 🎉 Subí a <b>${m.label}</b>. Tu constancia me transformó.`;
        step = next.days ? `Sigamos: ${daysTxt} y llego a ${nextLabel}.` : '¡Estamos en la cima! Practica hoy para quedarnos aquí 🚀';
        break;
      case 'down':
        who = '🧠 Neuro · bajé de etapa';
        msg = `Bajé a <b>${m.label}</b> porque pasaron días sin practicar. Tranquilo, no es el final 🤍 — con unos días seguidos vuelvo a estar fuerte.`;
        step = daysTxt ? `Empecemos hoy: ${daysTxt} y subo a ${nextLabel}. La primera práctica es la que más cuenta.` : 'Empecemos hoy: la primera práctica es la que más cuenta.';
        break;
      case 'practiced':
        who = '🧠 Neuro · practicaste hoy';
        msg = `¡Practicaste hoy! 💛 Gané energía (ahora <b>${m.w}%</b>). Todavía sigo en <b>${m.label}</b> porque cambiar de etapa pide juntar más energía — pero vas en serio, te lo prometo.`;
        step = next.days ? `Vuelve mañana: ${daysTxt} y subo a ${nextLabel}.`
             : next.plateau ? `Para subir a ${nextLabel} necesito que también suba mi dominio: haz una práctica con nota.`
             : 'Sigue tu racha cada día y subo.';
        break;
      case 'peak':
        who = '🧠 Neuro · ¡imparable!';
        msg = `¡Practicaste y seguimos IMPARABLES! 🚀 Estás en lo más alto conmigo.`;
        step = 'Practica mañana también para mantenernos aquí arriba.';
        break;
      default: // arrival — recomendación al entrar sin practicar todavía
        who = '🧠 Neuro';
        if (m.stage <= 2) {
          msg = `¡Hola! Hoy estoy en <b>${m.label}</b>. Para subir mi energía necesito que practiques hoy.`;
          step = daysTxt ? `Tu paso de hoy: practica. ${daysTxt} y subo a ${nextLabel}.` : 'Tu paso de hoy: cumple tu meta de práctica.';
        } else if (m.stage <= 4) {
          msg = `¡Volviste! 😊 Estoy <b>${m.label}</b>. Si practicas hoy mantengo mi energía y me acerco a subir.`;
          step = daysTxt ? `${daysTxt} y subo a ${nextLabel}. Cumple tu meta de hoy.` : 'Cumple tu meta de hoy para seguir subiendo.';
        } else if (m.stage === 5) {
          msg = `¡Hey! Estoy <b>${m.label}</b> gracias a ti 🔥 Practica hoy para no perder la racha.`;
          step = daysTxt ? `${daysTxt} y llego a ${nextLabel}.` : 'Practica hoy para sostener la racha.';
        } else {
          msg = `¡Estamos IMPARABLES! 🚀 Practica hoy para mantenerlo arriba.`;
          step = 'Practica hoy y nos quedamos volando.';
        }
    }
    return { context: ctx, who, msg, step };
  }

  window.JUCUM_MASCOT = {
    getMascotState, getNeuroDialogue,
    energyOf, stageOf, entryW, forecastDays,
    ITEMS, STAGES,
  };
})();
