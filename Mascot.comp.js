/* Mascota "Neuro" — tarjeta del panel del alumno.
 * Personaje hecho con formas CSS simples (sin SVG complejo) + emojis de objetos.
 * Su cara, color, animación y las cosas que muestra dependen de getMascotState().
 */
function MascotCard({ student }) {
  if (!window.JUCUM_MASCOT) return null;
  const s = window.JUCUM_MASCOT.getMascotState(student);

  return (
    <div className="scard masc-card" style={{borderTopColor: s.color}}>
      <div className="sec-head">
        <div className="sec-title">🧠 Neuro, tu mascota de estudio</div>
        <span className={`masc-badge masc-badge-${s.stage}`} style={{background: s.color}}>{s.label}</span>
      </div>

      <div className="masc-layout">
        {/* ── Escena: Neuro + su repisa de cosas ── */}
        <div className="masc-scene" style={{'--masc-color': s.color, '--masc-glow': s.glow}}>
          <div className={`masc-floor masc-anim-${s.anim}`}>
            <div className="masc-char">
              {s.headband && <div className="masc-headband"><span className="masc-knot"></span></div>}
              <div className="masc-brain">
                <span className="masc-eye l"><span className="masc-pupil"></span></span>
                <span className="masc-eye r"><span className="masc-pupil"></span></span>
                <span className={`masc-mouth ${s.mood}`}></span>
                {(s.mood === 'worried' || s.mood === 'sad' || s.mood === 'cry') && (
                  <>
                    <span className="masc-brow l"></span>
                    <span className="masc-brow r"></span>
                  </>
                )}
                {s.mood === 'cry' && <span className="masc-tear"></span>}
                {s.stage >= 4 && <span className="masc-cheek l"></span>}
                {s.stage >= 4 && <span className="masc-cheek r"></span>}
              </div>
              <div className="masc-feet"><span></span><span></span></div>
            </div>
          </div>
          <div className="masc-shelf">
            {s.items.all.map((it, i) => {
              const owned = i < s.items.owned.length;
              return (
                <span key={i} className={`masc-item ${owned ? 'owned' : 'lost'}`} title={owned ? it.name : `${it.name} (vendido)`}>
                  {it.emoji}
                </span>
              );
            })}
          </div>
        </div>

        {/* ── Estado + narrativa ── */}
        <div className="masc-info">
          <div className="masc-well">
            <div className="masc-well-top">
              <span>Energía de Neuro</span>
              <b style={{color: s.color}}>{s.w}%</b>
            </div>
            <div className="masc-well-bar"><span style={{width: s.w + '%', background: s.color}}></span></div>
          </div>

          <div className="masc-narr">{s.narrative}</div>

          <div className="masc-helps">
            <div className="masc-help-h">¿Cómo ayudo a Neuro?</div>
            <ul>
              <li className={s.minsLeft === 0 ? 'ok' : ''}>
                {s.minsLeft === 0
                  ? '✓ Cumpliste tu práctica de hoy'
                  : `Practica ${s.minsLeft} min hoy para cumplir tu meta`}
              </li>
              <li className={s.streak > 0 ? 'ok' : ''}>
                {s.streak > 0 ? `✓ Mantienes una racha de ${s.streak} día${s.streak === 1 ? '' : 's'}` : 'Empieza una racha practicando hoy'}
              </li>
              <li className={s.inactive === 0 ? 'ok' : ''}>
                {s.inactive === 0 ? '✓ Estás al día con tu práctica' : `Llevas ${s.inactive} día${s.inactive === 1 ? '' : 's'} sin practicar — ¡retoma!`}
              </li>
            </ul>
          </div>

          <div className="masc-foot">El ánimo de Neuro y las cosas que tiene <b>reflejan tu esfuerzo del día a día</b>. 🧠</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MascotCard });
