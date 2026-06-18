/* JUCUM EC — Mascota "Neuro" 🧠
 * El estado (ánimo, fuerza y las COSAS que tiene/pierde) refleja el esfuerzo
 * diario del alumno. No es aleatorio: se deriva de su constancia real.
 *
 *   bienestar (0–100) = constancia (racha + días activos) + dominio + meta de hoy
 *                       − penalización por días sin practicar
 *
 * 7 etapas (0 = agotado … 6 = imparable). Si el alumno deja de practicar,
 * Neuro va "vendiendo sus cosas" para cuidarse; al retomar, las recupera.
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

  function getMascotState(student) {
    const D = window.JUCUM_DATA;
    const prog = (D.getStudentProgress(student.id)) || { todayMinutes: 0 };
    const mastery = D.getStudentMastery ? D.getStudentMastery(student) : { pct: 0, active7: 0 };
    let target = 15;
    try { target = (D.getGroupSettings(student.group) || {}).dailyTargetMin || 15; } catch {}
    const todayMin = prog.todayMinutes || 0;
    const inactive = typeof student.lastActiveDays === 'number' ? student.lastActiveDays : 0;
    const streak = student.streak || 0;
    const active7 = mastery.active7 || 0;

    // ── bienestar 0–100 ──
    let w = 45;
    w += Math.min(streak, 7) * 4;             // + constancia (racha) hasta +28
    w += (Math.min(active7, 7) / 7) * 18;     // + días activos últimos 7 hasta +18
    w += (Math.min(mastery.pct || 0, 100) / 100) * 14; // + dominio hasta +14
    if (todayMin >= target) w += 10;          // meta de hoy cumplida
    else if (todayMin > 0) w += 4;            // algo de práctica hoy
    w -= Math.min(inactive, 8) * 7;           // − inactividad hasta −56
    w = Math.max(0, Math.min(100, Math.round(w)));

    const stageId = Math.max(0, Math.min(6, Math.round((w / 100) * 6)));
    const st = STAGES[stageId];

    // Objetos que conserva = etapa; los que "vendió" = los de arriba
    const owned = ITEMS.slice(0, stageId);
    const lost = ITEMS.slice(stageId);
    const nextSold = lost[0] ? lost[0].name : null;       // lo próximo en peligro
    const justRecovered = owned[owned.length - 1] || null;

    const minsLeft = Math.max(0, target - todayMin);
    const narrative = buildNarrative(stageId, { inactive, streak, nextSold, justRecovered, minsLeft, todayMin, target });

    return {
      w, stage: stageId, name: 'Neuro', label: st.label, mood: st.mood, anim: st.anim,
      color: st.color, glow: st.glow, headband: stageId >= 5,
      items: { owned, lost, all: ITEMS }, nextSold, narrative,
      minsLeft, target, todayMin, inactive, streak, masteryPct: mastery.pct || 0,
    };
  }

  function buildNarrative(stage, ctx) {
    const { inactive, nextSold, justRecovered, minsLeft, todayMin } = ctx;
    switch (stage) {
      case 0: return `Pasaron ${inactive || 'varios'} días sin práctica. A Neuro no le alcanzó ni para la luz y tuvo que vender ${nextSold || 'sus cosas'}. No lo abandones: con solo 10 minutos hoy empieza a recuperarse. 💪`;
      case 1: return `Neuro está decaído y ya no tiene ${nextSold || 'algunas cosas'}. Le faltan fuerzas… unos minutos de práctica hoy lo levantan. 🌱`;
      case 2: return `Neuro está preocupado: si dejas de practicar irá perdiendo ${nextSold || 'lo que tiene'}. Demuéstrale tu esfuerzo y cuídalo. 🤍`;
      case 3: return `Neuro está estable. Mantén tu práctica diaria para que crezca fuerte y recupere todo lo suyo. 🙂`;
      case 4: return `¡Neuro está animado! Tu constancia se nota${justRecovered ? ` y recuperó ${justRecovered.name}` : ''}. Sigue así. 😄`;
      case 5: return `¡Neuro está fuerte y feliz! Ya casi imparable${justRecovered ? `, con ${justRecovered.name} de vuelta` : ''}. ¡No bajes el ritmo! 💪🔥`;
      case 6: return `¡Neuro está IMPARABLE, corriendo con su cinta! ${todayMin > 0 ? 'Practicaste hoy y' : 'Tu constancia es ejemplar y'} eres su mejor entrenador. 🏃🔥`;
      default: return '';
    }
  }

  window.JUCUM_MASCOT = { getMascotState, ITEMS, STAGES };
})();
