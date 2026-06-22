/* Mascota "Neuro" — tarjeta del panel del alumno.
 * Evoluciona con su energía (7 etapas): carta (agotado) · triste viendo a otros ·
 * bajo la lluvia · estable · animado · fuerte (karateca) · imparable (nave).
 * Energía al lado, texto debajo. Sigue expresándose según la práctica del alumno.
 */
const NEURO_CSS = `
.nv-top{display:grid;grid-template-columns:150px 1fr;gap:16px;align-items:center;}
@media(max-width:540px){.nv-top{grid-template-columns:1fr;}}
.nv-below{margin-top:14px;border-top:1px dashed var(--border);padding-top:12px;}
.nv-welltop{display:flex;justify-content:space-between;font-size:12px;font-weight:800;margin-bottom:6px;color:var(--text);}
.nv-wellbar{height:11px;background:#EFE3EA;border-radius:7px;overflow:hidden;}
.nv-wellbar span{display:block;height:100%;border-radius:7px;transition:width .6s ease;}
.nv-wellscale{display:flex;justify-content:space-between;font-size:9.5px;font-weight:800;color:var(--text-mute,#A8A8A8);margin-top:5px;text-transform:uppercase;}
.nv-narr{font-size:12.5px;font-weight:700;color:var(--text);line-height:1.45;}
.nv-helps{margin-top:10px;}
.nv-helps .nv-h{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--text-soft,#6B6B6B);margin-bottom:6px;}
.nv-helps ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px;}
.nv-helps li{font-size:12px;font-weight:700;color:var(--text-soft,#6B6B6B);padding-left:18px;position:relative;}
.nv-helps li.ok{color:#1B5E20;}
.nv-helps li::before{content:'•';position:absolute;left:4px;}
.nv-helps li.ok::before{content:'✓';color:#2EA84B;}
.nv-foot{margin-top:11px;font-size:11px;color:var(--text-mute,#A8A8A8);font-weight:700;}
.nv-scene{position:relative;border-radius:16px;border:1.5px solid var(--border);height:150px;display:flex;align-items:flex-end;justify-content:center;overflow:hidden;padding-bottom:10px;}
.nv-scene.clickable{cursor:pointer;}
.nv-star{position:absolute;color:#fff;filter:drop-shadow(0 0 3px rgba(255,255,255,.8));animation:nvTw 2.4s ease-in-out infinite;}
@keyframes nvTw{0%,100%{opacity:.4;transform:scale(.8);}50%{opacity:1;transform:scale(1.15);}}
.nv-aura{position:absolute;top:50%;left:50%;width:130px;height:130px;border-radius:50%;transform:translate(-50%,-46%);background:radial-gradient(circle,rgba(255,200,80,.5),transparent 65%);animation:nvPulse 1.8s ease-in-out infinite;}
@keyframes nvPulse{0%,100%{transform:translate(-50%,-46%) scale(.92);opacity:.7;}50%{transform:translate(-50%,-46%) scale(1.08);opacity:1;}}
.nv-spark{position:absolute;font-size:15px;animation:nvFl 2.2s ease-in-out infinite;}
@keyframes nvFl{0%,100%{transform:translateY(0) rotate(0);opacity:.7;}50%{transform:translateY(-6px) rotate(12deg);opacity:1;}}
.nv-char{position:relative;width:104px;z-index:2;}
.nv-char.a-idle{animation:nvIdle 3.2s ease-in-out infinite;}
.nv-char.a-bob{animation:nvBob 1.6s ease-in-out infinite;}
.nv-char.a-run{animation:nvBob 1.6s ease-in-out infinite;}
.nv-char.a-slump{transform:translateY(7px);}
.nv-char.a-sway{animation:nvSway 3s ease-in-out infinite;transform-origin:bottom center;}
@keyframes nvIdle{0%,100%{transform:translateY(0);}50%{transform:translateY(-3px);}}
@keyframes nvBob{0%,100%{transform:translateY(0) rotate(-1deg);}50%{transform:translateY(-7px) rotate(1deg);}}
@keyframes nvSway{0%,100%{transform:rotate(-3deg);}50%{transform:rotate(3deg);}}
.nv-brain{position:relative;width:96px;height:78px;margin:0 auto;border-radius:48% 48% 44% 44%/54% 54% 46% 46%;box-shadow:inset 0 -6px 10px rgba(0,0,0,.12),inset 6px 0 0 -2px rgba(255,255,255,.18);}
.nv-brain::before{content:'';position:absolute;top:7px;bottom:9px;left:50%;width:2.5px;transform:translateX(-50%);background:rgba(0,0,0,.10);border-radius:2px;}
.nv-eye{position:absolute;top:30px;width:17px;height:17px;background:#fff;border-radius:50%;box-shadow:inset 0 1px 2px rgba(0,0,0,.18);z-index:1;}
.nv-eye.l{left:23px;}.nv-eye.r{right:23px;}
.nv-eye::after{content:'';position:absolute;top:4px;left:4px;width:7px;height:7px;background:#2A2A2A;border-radius:50%;}
.nv-seye{position:absolute;top:33px;width:14px;height:8px;border:3px solid #5A3A46;border-bottom:none;border-radius:14px 14px 0 0;}
.nv-seye.l{left:24px;}.nv-seye.r{right:24px;}
.nv-mouth{position:absolute;left:50%;transform:translateX(-50%);}
.nv-grin{bottom:16px;width:26px;height:14px;background:#7A1733;border-radius:0 0 16px 16px;}
.nv-smile{bottom:19px;width:22px;height:11px;border:3px solid #7A1733;border-top:none;border-radius:0 0 18px 18px;}
.nv-line{bottom:22px;width:16px;height:3px;background:#7A1733;border-radius:3px;}
.nv-sad{bottom:18px;width:15px;height:8px;border:3px solid #6A4452;border-bottom:none;border-radius:15px 15px 0 0;}
.nv-cheek{position:absolute;top:46px;width:11px;height:7px;background:rgba(255,120,150,.55);border-radius:50%;}
.nv-cheek.l{left:14px;}.nv-cheek.r{right:14px;}
.nv-tear{position:absolute;top:44px;left:27px;width:7px;height:11px;background:#7FC8FF;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;}
.nv-band{position:absolute;top:12px;left:50%;transform:translateX(-50%);width:108px;height:12px;background:linear-gradient(#E11930,#B71C1C);border-radius:6px;z-index:3;box-shadow:0 1px 2px rgba(0,0,0,.2);}
.nv-band::after{content:'';position:absolute;right:-3px;top:-3px;width:14px;height:14px;background:#B71C1C;border-radius:3px;transform:rotate(45deg);}
.nv-feet{display:flex;gap:16px;justify-content:center;margin-top:-2px;}
.nv-feet span{width:18px;height:9px;background:rgba(0,0,0,.18);border-radius:0 0 9px 9px;}
.nv-others{position:absolute;inset:0;z-index:1;pointer-events:none;}
.nv-mini{position:absolute;top:15px;width:34px;animation:nvBob 1.8s ease-in-out infinite;}
.nv-mbrain{position:relative;width:34px;height:28px;border-radius:48% 48% 44% 44%/54% 54% 46% 46%;background:radial-gradient(circle at 38% 30%,#FFC8E0,#FF8BB6);box-shadow:0 3px 7px rgba(255,120,160,.4);}
.nv-meye{position:absolute;top:10px;width:5px;height:5px;background:#2A2A2A;border-radius:50%;}.nv-meye.l{left:9px;}.nv-meye.r{right:9px;}
.nv-msmile{position:absolute;bottom:7px;left:50%;transform:translateX(-50%);width:10px;height:5px;border:2px solid #7A1733;border-top:none;border-radius:0 0 8px 8px;}
.nv-rain{position:absolute;inset:0;overflow:hidden;z-index:1;pointer-events:none;}
.nv-drop{position:absolute;top:-14%;width:2px;height:11px;background:linear-gradient(rgba(120,170,220,.1),rgba(110,160,215,.85));border-radius:2px;animation:nvFall .9s linear infinite;}
@keyframes nvFall{0%{transform:translateY(0);opacity:0;}12%{opacity:1;}100%{transform:translateY(150px);opacity:.15;}}
.nv-umbrella{position:absolute;top:-20px;left:50%;transform:translateX(-50%);font-size:30px;z-index:4;}
.nv-gi{position:relative;width:62px;height:24px;margin:-3px auto 0;background:#F4F1EA;border-radius:5px 5px 7px 7px;box-shadow:inset 0 -3px 5px rgba(0,0,0,.08);overflow:hidden;z-index:2;}
.nv-gi .lap-l,.nv-gi .lap-r{position:absolute;top:-2px;width:22px;height:24px;background:#fff;}
.nv-gi .lap-l{left:9px;transform:skewX(20deg);border-right:2px solid #E3DCCF;}
.nv-gi .lap-r{right:9px;transform:skewX(-20deg);background:#EFEADF;border-left:2px solid #E3DCCF;}
.nv-gi .belt{position:absolute;bottom:2px;left:0;right:0;height:7px;background:linear-gradient(#E11930,#B71C1C);z-index:2;}
.nv-gi .belt::after{content:'';position:absolute;left:50%;top:-3px;transform:translateX(-50%) rotate(45deg);width:9px;height:9px;background:#B71C1C;border-radius:2px;}
.nv-ship{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;align-self:center;transform:scale(.84);animation:nvIdle 3s ease-in-out infinite;}
.nv-dome{position:relative;width:96px;height:80px;border-radius:50% 50% 46% 46%;background:linear-gradient(180deg,rgba(200,230,255,.5),rgba(150,200,255,.16));border:2px solid rgba(205,232,255,.78);display:flex;align-items:center;justify-content:center;box-shadow:inset 0 -6px 14px rgba(120,170,255,.25);overflow:hidden;}
.nv-glare{position:absolute;top:8px;left:14px;width:24px;height:40px;background:linear-gradient(180deg,rgba(255,255,255,.6),transparent);border-radius:50%;transform:rotate(18deg);pointer-events:none;}
.nv-ufo{width:142px;height:28px;margin-top:-9px;background:radial-gradient(ellipse at 50% 26%,#D8DFEC,#7E8AA0);border-radius:50%;box-shadow:0 9px 20px rgba(120,160,255,.5);display:flex;align-items:flex-end;justify-content:center;gap:10px;padding-bottom:6px;z-index:3;}
.nv-lt{width:6px;height:6px;border-radius:50%;background:#FFD54F;box-shadow:0 0 6px #FFD54F;animation:nvTw 1s ease-in-out infinite;}
.nv-ufo .nv-lt:nth-child(2){animation-delay:.25s;}.nv-ufo .nv-lt:nth-child(3){animation-delay:.5s;}.nv-ufo .nv-lt:nth-child(4){animation-delay:.75s;}
.nv-thrust{width:24px;height:24px;margin-top:-4px;background:radial-gradient(ellipse at 50% 0,#FFE07A,#FF8A3D 55%,transparent 78%);filter:blur(1px);animation:nvFl .4s ease-in-out infinite;}
.nv-letter{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;height:100%;width:100%;}
.nv-env{font-size:46px;position:relative;animation:nvIdle 2.6s ease-in-out infinite;filter:drop-shadow(0 5px 9px rgba(0,0,0,.18));}
.nv-env-badge{position:absolute;top:-4px;right:-9px;background:#E11930;color:#fff;font-size:11px;font-weight:800;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #fff;}
.nv-letter-cta{text-align:center;font-family:'Fredoka',sans-serif;font-weight:600;font-size:13px;color:#6E626A;}
.nv-letter-cta small{display:block;font-family:'Nunito',sans-serif;font-weight:700;font-size:11px;color:#A89AA2;margin-top:2px;}
`;

(function injectNeuroCSS(){
  if (typeof document === 'undefined') return;
  if (document.getElementById('nv-css')) return;
  const st = document.createElement('style'); st.id = 'nv-css'; st.textContent = NEURO_CSS;
  document.head.appendChild(st);
})();

function nvMouth(m){return {cry:'nv-sad',sad:'nv-sad',worried:'nv-sad',neutral:'nv-line',smile:'nv-smile',happy:'nv-grin',great:'nv-grin'}[m] || 'nv-line';}
function nvMiniHappy(x,delay){return `<div class="nv-mini" style="left:${x};animation-delay:${delay}s"><div class="nv-mbrain"><span class="nv-meye l"></span><span class="nv-meye r"></span><span class="nv-msmile"></span></div></div>`;}

/* Devuelve el HTML de la escena de Neuro según su etapa (0..6). */
function neuroSceneHTML(stage, mood, color){
  // Etapa 0 — se fue y dejó una carta
  if(stage===0){
    return `<div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 30%,#EEE9EC,#D9D1D7);"></div>
      <div class="nv-letter"><div class="nv-env">✉️<span class="nv-env-badge">1</span></div>
      <div class="nv-letter-cta">Neuro te dejó una carta<small>Toca para leerla 💌</small></div></div>`;
  }
  const sceneBg = stage<=2 ? 'radial-gradient(circle at 50% 28%,#E9EFF6,#D6E0EC)'
    : stage===3 ? 'radial-gradient(circle at 50% 28%,#fff,#FBEFF5)'
    : stage===6 ? 'radial-gradient(circle at 50% 30%,#3A1430,#1C0A20)'
    : 'radial-gradient(circle at 50% 28%,#FFF0F7,#FBD9EC)';
  const glow = `0 6px 14px ${color}66`;
  const sad = stage===1 || stage===2;
  let stars='';
  if(stage>=5){const pts=stage===6?[[14,20],[28,46],[50,14],[72,40],[86,22],[20,66],[64,60],[88,58],[40,30],[76,72]]:[[18,24],[78,30],[40,18],[86,54],[24,60]];
    stars=pts.map((p,i)=>`<span class="nv-star" style="left:${p[0]}%;top:${p[1]}%;font-size:${stage===6?12:10}px;animation-delay:${i*0.2}s">✦</span>`).join('');}
  const aura = stage===6 ? '<span class="nv-aura"></span>' : '';
  const sparks = stage===6 ? '<span class="nv-spark" style="left:8%;top:34%;">✨</span><span class="nv-spark" style="right:8%;top:42%;animation-delay:.6s;">✨</span>' : (stage>=4?'<span class="nv-spark" style="right:12%;top:30%;">✨</span>':'');
  const others = stage===1 ? `<div class="nv-others">${nvMiniHappy('7%',0)}${nvMiniHappy('77%',.5)}${nvMiniHappy('58%',1)}</div>` : '';
  let rain='', umbrella='';
  if(stage===2){rain='<div class="nv-rain">'+Array.from({length:14}).map((_,i)=>`<span class="nv-drop" style="left:${(i*7+4)%100}%;animation-delay:${(i%5)*0.18}s"></span>`).join('')+'</div>';umbrella='<span class="nv-umbrella">☂️</span>';}
  const band = stage===5 ? '<span class="nv-band"></span>' : '';
  const cheeks = stage>=4 ? '<span class="nv-cheek l"></span><span class="nv-cheek r"></span>' : '';
  const tear = sad ? '<span class="nv-tear"></span>' : '';
  const eyesHTML = sad ? '<span class="nv-seye l"></span><span class="nv-seye r"></span>' : '<span class="nv-eye l"></span><span class="nv-eye r"></span>';
  const filter = sad ? 'filter:saturate(.82);' : '';
  const brainBg = `radial-gradient(circle at 38% 30%, color-mix(in srgb, ${color} 72%, #fff), ${color})`;
  const anim = stage===2 ? 'a-slump' : (stage===3?'a-idle':(stage<=1?'a-slump':'a-bob'));
  const gi = stage===5 ? '<div class="nv-gi"><span class="lap-l"></span><span class="lap-r"></span><span class="belt"></span></div>' : '';
  const brainEl = `<div class="nv-brain" style="background:${brainBg};box-shadow:inset 0 -6px 10px rgba(0,0,0,.12),${glow};">${eyesHTML}<span class="nv-mouth ${nvMouth(mood)}"></span>${tear}${cheeks}</div>`;
  // Etapa 6 — Neuro dentro de su nave
  if(stage===6){
    return `<div style="position:absolute;inset:0;background:${sceneBg};"></div>${stars}${aura}${sparks}
      <div class="nv-ship"><div class="nv-dome"><div class="nv-char a-bob" style="transform:scale(.58);">${brainEl}</div><span class="nv-glare"></span></div>
      <div class="nv-ufo"><span class="nv-lt"></span><span class="nv-lt"></span><span class="nv-lt"></span><span class="nv-lt"></span></div>
      <span class="nv-thrust"></span></div>`;
  }
  return `<div style="position:absolute;inset:0;background:${sceneBg};"></div>${others}${rain}${stars}${aura}${sparks}
    <div class="nv-char ${anim}" style="${filter}">${band}${umbrella}${brainEl}${gi}<div class="nv-feet"><span></span><span></span></div></div>`;
}

function NeuroLetter({ onClose }){
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{maxWidth:440}} onClick={(e)=>e.stopPropagation()}>
        <div className="modal-head" style={{background:'linear-gradient(135deg,#8A7E86,#5E545B)'}}>
          <div className="modal-title" style={{color:'#fff'}}>💌 Carta de Neuro</div>
          <div className="modal-date" style={{color:'rgba(255,255,255,.85)'}}>Te dejó este mensaje antes de irse…</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{background:'#FBF7F4', border:'1px solid #ECE2DC', borderRadius:13, padding:18, fontSize:13.5, lineHeight:1.65, color:'#5A4E54', fontWeight:600}}>
            <p style={{margin:'0 0 10px'}}>Hola… soy <b>Neuro</b> 🧠</p>
            <p style={{margin:'0 0 10px'}}>Me quedé <b>sin energía</b> porque hace varios días que no practicamos juntos, y tuve que irme a descansar un rato.</p>
            <p style={{margin:'0 0 10px'}}>Pero no me fui para siempre: <b>vuelvo apenas practiques 10 minutos hoy</b>. Cada minuto tuyo me devuelve la energía 💛</p>
            <p style={{margin:0}}>Te voy a estar esperando. — Neuro</p>
          </div>
          <button onClick={onClose} style={{marginTop:14, width:'100%', border:'none', background:'linear-gradient(135deg,#43C463,#2EA84B)', color:'#fff', fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:15, padding:13, borderRadius:13, cursor:'pointer'}}>💪 Voy a practicar para que vuelvas</button>
        </div>
      </div>
    </div>
  );
}

function MascotCard({ student }) {
  if (!window.JUCUM_MASCOT) return null;
  const s = window.JUCUM_MASCOT.getMascotState(student);
  const [showLetter, setShowLetter] = React.useState(false);
  const sceneHTML = neuroSceneHTML(s.stage, s.mood, s.color);

  return (
    <div className="scard masc-card" style={{borderTopColor: s.color}}>
      <div className="sec-head">
        <div className="sec-title">🧠 Neuro, tu mascota de estudio</div>
        <span className={`masc-badge masc-badge-${s.stage}`} style={{background: s.color}}>{s.label}</span>
      </div>

      <div className="nv-top">
        <div className={`nv-scene${s.stage===0?' clickable':''}`}
             onClick={s.stage===0 ? () => setShowLetter(true) : undefined}
             dangerouslySetInnerHTML={{__html: sceneHTML}} />
        <div>
          <div className="nv-welltop"><span>⚡ Energía de Neuro</span><b style={{color: s.color}}>{s.w}%</b></div>
          <div className="nv-wellbar"><span style={{width: s.w + '%', background: s.color}}></span></div>
          <div className="nv-wellscale"><span>Agotado</span><span>Imparable</span></div>
        </div>
      </div>

      <div className="nv-below">
        <div className="nv-narr" dangerouslySetInnerHTML={{__html: s.narrative}} />
        <div className="nv-helps">
          <div className="nv-h">¿Cómo ayudo a Neuro?</div>
          <ul>
            <li className={s.minsLeft === 0 ? 'ok' : ''}>
              {s.minsLeft === 0 ? '✓ Cumpliste tu práctica de hoy' : `Practica ${s.minsLeft} min hoy para cumplir tu meta`}
            </li>
            <li className={s.streak > 0 ? 'ok' : ''}>
              {s.streak > 0 ? `✓ Mantienes una racha de ${s.streak} día${s.streak === 1 ? '' : 's'}` : 'Empieza una racha practicando hoy'}
            </li>
            <li className={s.inactive === 0 ? 'ok' : ''}>
              {s.inactive === 0 ? '✓ Estás al día con tu práctica' : `Llevas ${s.inactive} día${s.inactive === 1 ? '' : 's'} sin practicar — ¡retoma!`}
            </li>
          </ul>
        </div>
        <div className="nv-foot">El ánimo y la <b>evolución</b> de Neuro reflejan tu esfuerzo del día a día 🧠</div>
      </div>

      {showLetter && <NeuroLetter onClose={() => setShowLetter(false)} />}
    </div>
  );
}

Object.assign(window, { MascotCard });
