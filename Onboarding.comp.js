/* Onboarding tour — first-time student walkthrough.
 * Shows 4 cards introducing the platform features. Saves "seen" flag in localStorage
 * so it doesn't re-appear. Skippable.
 */

const { useState: oUseState } = React;

const STEPS = [
  { icon:'👋', title:'¡Bienvenido a JUCUM English Center!',
    body:'Esta es tu plataforma de práctica de inglés. Aquí encontrarás todos los materiales que tu profesor active para ti.' },
  { icon:'📦', title:'Tu módulo activo',
    body:'Cada módulo tiene actividades de Story, Lectura, Listening y Gramática. Complétalas en orden — cada una desbloquea la siguiente.' },
  { icon:'🎯', title:'Tu meta diaria',
    body:'Tu profesor define cuántos minutos debes practicar al día. Mira el anillo morado para ver tu progreso. ¡Mantén tu racha 🔥!' },
  { icon:'🏆', title:'XP, medallas y foro',
    body:'Gana puntos por cada actividad, desbloquea medallas (bronce, plata, oro) y participa en el foro de tu grupo para preguntar a tus compañeros.' },
];

function Onboarding({ studentId, onClose }) {
  const [step, setStep] = oUseState(0);
  const last = step === STEPS.length - 1;
  const cur = STEPS[step];

  const finish = () => {
    localStorage.setItem(`jucum_onboarded_${studentId}`, '1');
    onClose();
  };

  return (
    <div className="onb-backdrop">
      <div className="onb-card">
        <button className="onb-skip" onClick={finish}>Saltar tour</button>
        <div className="onb-ico">{cur.icon}</div>
        <div className="onb-title">{cur.title}</div>
        <div className="onb-body">{cur.body}</div>
        <div className="onb-dots">
          {STEPS.map((_, i) => (
            <span key={i} className={`onb-dot ${i === step ? 'on' : ''} ${i < step ? 'done' : ''}`}></span>
          ))}
        </div>
        <div className="onb-actions">
          {step > 0 && <button className="btn-cancel" onClick={() => setStep(step - 1)}>← Atrás</button>}
          <button className="btn-save" onClick={last ? finish : () => setStep(step + 1)}>
            {last ? '¡Empezar! 🚀' : 'Siguiente →'}
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Onboarding });
