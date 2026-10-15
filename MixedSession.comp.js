/* MixedSession · SESION-MIXTA-V1 (14-oct-2026) — Parte 1 · Pre-A1 · NEURO-HOY-V1: la tarjeta pasó a NeuroHoy.jsx
 * Reproductor de ejercicios mezclados (mix · caja de errores · ⭐ repaso bonus) + resumen.
 * MIX-TRANSFORM-V1 (15-oct): Transform = armar la oración con fichas (bandeja + banco + Comprobar).
 * MIX-RL-V1 (15-oct): Comprensión lectora (párrafo con la prueba + vecino, 🔊 y español) y auditiva
 * (🔊 / 🐢 con la voz del navegador; “Ver el texto” tras 2 escuchas).
 * Toda la lógica (lector, azar, caja de errores, guardado) vive en mixed.js (window.JUCUM_MIX).
 * Retroalimentación = la de cada material (En la historia · Regla · Español↔Inglés · explicación del error). */
const MIX_CSS = `
.mx-card{background:radial-gradient(circle at 50% 0%,#2A3D80,#131D47 78%);border-radius:18px;padding:14px;color:#fff;display:flex;flex-direction:column;gap:12px;box-shadow:0 6px 18px rgba(18,28,69,.3);margin-top:14px}
.mx-h{display:flex;align-items:center;gap:10px}.mx-h b{font-family:'Fredoka',sans-serif;font-weight:600;font-size:16.5px;flex:1}.mx-h span{font-size:12px;font-weight:800;color:#9FE9FF;white-space:nowrap}
.mx-sub{font-size:12.3px;font-weight:700;color:#C9D6FF;line-height:1.4;margin-top:-6px}
.mx-mats{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:10px 8px}
.mx-m{display:flex;flex-direction:column;align-items:center;gap:5px;text-align:center}
.mx-ring{width:60px;height:60px;border-radius:50%;padding:4px;transition:box-shadow .8s}
.mx-in{position:relative;width:100%;height:100%;border-radius:50%;background:#1C2858;overflow:hidden;display:flex;align-items:center;justify-content:center}
.mx-lq{position:absolute;width:130px;height:130px;left:50%;margin-left:-65px;border-radius:42%;animation:mxSpin 6s linear infinite;transition:top 1.1s cubic-bezier(.3,.9,.3,1)}
@keyframes mxSpin{to{transform:rotate(360deg)}}
.mx-e{position:relative;z-index:2;font-size:21px;filter:drop-shadow(0 1px 1px rgba(0,0,0,.35))}
.mx-ck{position:absolute;right:-1px;bottom:-1px;width:20px;height:20px;border-radius:50%;background:#fff;color:#2E7D32;font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;border:2px solid #2EA84B;z-index:3}
.mx-ml{font-size:10.8px;font-weight:800;line-height:1.25;color:#E3EBFF}.mx-ml b{display:block;font-family:'Fredoka',sans-serif;font-weight:600;font-size:13px;color:#FFE07A}
.mx-go{border:0;border-radius:13px;background:linear-gradient(180deg,#FFCA28,#F59E00);color:#3D2A00;font-family:'Fredoka',sans-serif;font-weight:600;font-size:17px;padding:13px;min-height:52px;cursor:pointer;box-shadow:0 4px 0 #B87400}
.mx-go:active{transform:translateY(2px);box-shadow:0 2px 0 #B87400}
.mx-note{font-size:11.5px;font-weight:700;color:#B8C6F0;text-align:center;line-height:1.4}
.mx-box{display:flex;align-items:center;gap:10px;background:#fff;color:#1E2433;border-radius:13px;padding:10px 12px}
.mx-box .bi{width:42px;height:42px;border-radius:12px;background:#EEE7F9;display:flex;align-items:center;justify-content:center;font-size:21px;flex-shrink:0;position:relative}
.mx-box .bi b{position:absolute;right:-5px;top:-5px;min-width:20px;height:20px;border-radius:10px;background:#8A6CD0;color:#fff;font-size:11px;display:flex;align-items:center;justify-content:center;padding:0 5px;border:2px solid #fff}
.mx-box .tx{flex:1;min-width:0;font-weight:800;font-size:13px;line-height:1.3}.mx-box .tx small{display:block;font-size:11.5px;font-weight:700;color:#7A7468}
.mx-rb{border:0;border-radius:11px;background:linear-gradient(180deg,#9C7BE0,#5B3FA0);color:#fff;font-family:'Fredoka',sans-serif;font-weight:600;font-size:13px;padding:9px 12px;cursor:pointer;white-space:nowrap}
.mx-lock{font-size:11px;font-weight:900;color:#5B3FA0;background:#EEE7F9;border-radius:10px;padding:4px 9px;white-space:nowrap}
.mx-ov{position:fixed;inset:0;z-index:9000;background:#FFFDF7;display:flex;flex-direction:column;max-width:640px;margin:0 auto;box-shadow:0 0 0 100vmax rgba(20,26,40,.5)}
.mx-ov.box{background:#F7F3FD}.mx-ov.bon{background:#FFFBEA}.mx-ov.bon .mx-bar i{background:linear-gradient(90deg,#FFCA28,#F59E00)}.mx-tag.bon{background:#FFF0B3;color:#7A5200}
.mx-top{display:flex;align-items:center;gap:10px;padding:14px 14px 6px}
.mx-x{width:40px;height:40px;border-radius:50%;border:0;background:#EEE9DD;font-size:15px;cursor:pointer;flex-shrink:0;color:#5B4A3A}
.mx-bar{flex:1;height:12px;border-radius:7px;background:#EDE6D6;overflow:hidden}.mx-bar i{display:block;height:100%;background:var(--lg,linear-gradient(135deg,#F9A825,#FF8F00));border-radius:7px;transition:width .5s}
.mx-ov.box .mx-bar i{background:linear-gradient(90deg,#9C7BE0,#5B3FA0)}
.mx-cnt{font-family:'Fredoka',sans-serif;font-weight:600;font-size:14px;white-space:nowrap}
.mx-tag{margin:0 14px 2px;align-self:flex-start;font-size:11.5px;font-weight:900;color:#5B3FA0;background:#EEE7F9;border-radius:10px;padding:5px 10px}
.mx-mini{display:flex;justify-content:center;gap:8px;padding:4px 14px 8px;flex-wrap:wrap}
.mx-mr{width:38px;height:38px;border-radius:50%;padding:3px;transition:transform .3s}.mx-mr .mx-in{background:#fff;font-size:14px}.mx-mr.cur{transform:scale(1.18)}
.mx-q>*{flex-shrink:0}.mx-q{flex:1;overflow-y:auto;overflow-x:hidden;min-width:0;padding:6px 16px 14px;display:flex;flex-direction:column;gap:13px}
.mx-chip{align-self:flex-start;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:6px;border-radius:12px;padding:5px 10px;font-size:11.5px;font-weight:900;background:var(--ll,#FFF9C4);color:var(--lbt,#4E3800);border:1.5px solid var(--lm,#FFECB3)}
.mx-hint{font-size:12.5px;font-weight:800;color:#7A6A55}
.mx-sent{font-family:'Fredoka',sans-serif;font-weight:600;font-size:20px;color:#1E2433;line-height:1.4}
.mx-blank{display:inline-block;min-width:66px;border-bottom:3px solid var(--lp,#F9A825);color:var(--ld,#E65100);text-align:center;padding:0 4px}
.mx-sup{display:flex;gap:8px;flex-wrap:wrap}.mx-sup button{white-space:nowrap;display:inline-flex;align-items:center;gap:5px;border:1.5px solid var(--lm,#FFECB3);background:#fff;color:var(--ld,#E65100);border-radius:9px;padding:7px 12px;font:inherit;font-weight:800;font-size:12px;cursor:pointer}
.mx-sup button.tr{border-color:#CE93D8;color:#7B1FA2;background:#F3E5F5}
.mx-rev{border-radius:0 11px 11px 0;padding:9px 12px;font-size:13px;line-height:1.5;background:#FAF7EE;border-left:3px solid var(--lp,#F9A825)}.mx-rev.tr{background:#F3E5F5;border-left-color:#7B1FA2;color:#5A2A66;font-style:italic}
.mx-opts{display:flex;flex-direction:column;gap:9px}
.mx-src{background:#fff;border:1.5px solid #E3DCCB;border-radius:12px;padding:9px 12px;font-family:'Fredoka',sans-serif;font-weight:600;font-size:18px;color:#1E2433;line-height:1.35}
.mx-src small{display:block;font-family:'Nunito',sans-serif;font-size:10px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:#7A6A55;margin-bottom:2px}
.mx-task{font-size:13.5px;font-weight:700;color:#1E2433;line-height:1.45}
.mx-tray{min-height:60px;border:2px dashed #CFC6B2;border-radius:14px;padding:8px;display:flex;flex-wrap:wrap;gap:7px;align-items:center;background:#FFFDF7}
.mx-tray.ok{border-style:solid;border-color:#2EA84B;background:#E9F7EC}.mx-tray.no{border-style:solid;border-color:#F0B44A;background:#FFF5E1}
.mx-tray .ph{font-size:12.5px;font-weight:700;color:#A89E88;padding:0 4px}
.mx-bank{display:flex;flex-wrap:wrap;gap:8px}
.mx-tile{border:2px solid #E3DCCB;background:#fff;border-radius:11px;padding:8px 13px;min-height:44px;min-width:44px;font-family:'Fredoka',sans-serif;font-weight:600;font-size:16px;color:#1E2433;cursor:pointer;box-shadow:0 3px 0 #E3DCCB;transition:transform .12s}
.mx-tile:active{transform:translateY(2px);box-shadow:0 1px 0 #E3DCCB}.mx-tile.used{opacity:0;pointer-events:none}.mx-tile:disabled{cursor:default}
.mx-tray .mx-tile{border-color:var(--lp,#F9A825);box-shadow:0 3px 0 var(--lp,#F9A825)}
.mx-trtools{display:flex;justify-content:flex-end}.mx-trtools button{border:0;background:none;font:inherit;font-size:12px;font-weight:800;color:#7A6A55;cursor:pointer;padding:4px 6px}
.mx-check{background:linear-gradient(180deg,#5C7CFA,#3B5BDB);box-shadow:0 4px 0 #2C44A8;width:100%}.mx-check:disabled{opacity:.45;cursor:default}
.mx-pass{background:#fff;border:1.5px solid #E3DCCB;border-radius:14px;padding:11px 13px;display:flex;flex-direction:column;gap:8px}
.mx-pass .tt{font-size:10px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:#7A6A55;display:flex;align-items:center;gap:8px}
.mx-pass p{margin:0;font-family:'Atkinson Hyperlegible','Nunito',sans-serif;font-size:15.5px;line-height:1.6;color:#1E2433}.mx-pass p.es{font-size:13px;color:#7A6A55;font-style:italic;margin-top:-4px}
.mx-pass b{background:#FFF1B8;border-radius:4px;padding:0 2px}
.mx-qq{font-family:'Fredoka',sans-serif;font-weight:600;font-size:17.5px;color:#1E2433;line-height:1.35}.mx-qq small{display:block;font-family:'Nunito',sans-serif;font-size:12.5px;font-weight:700;color:#8A7F6A;margin-top:2px}
.mx-play{display:flex;gap:9px;align-items:center;flex-wrap:wrap}
.mx-pbtn{display:inline-flex;align-items:center;gap:8px;border:0;border-radius:16px;padding:12px 18px;min-height:52px;font-family:'Fredoka',sans-serif;font-weight:600;font-size:17px;color:#fff;background:linear-gradient(180deg,#4FC3F7,#0288D1);box-shadow:0 4px 0 #01579B;cursor:pointer}
.mx-pbtn.on{animation:mxPulse 1s ease-in-out infinite}@keyframes mxPulse{50%{transform:scale(1.05)}}
.mx-sbtn{border:1.5px solid #B3E5FC;background:#fff;color:#0277BD;border-radius:12px;padding:9px 12px;min-height:44px;font:inherit;font-weight:800;font-size:13px;cursor:pointer}
.mx-say{background:#E1F5FE;border-radius:11px;padding:8px 11px;font-size:14.5px;line-height:1.5;color:#01579B}.mx-say b{background:#FFF1B8;color:#1E2433;border-radius:4px;padding:0 2px}
.mx-exrow{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px}.mx-ex{background:#EEF3FF;border-radius:8px;padding:2px 7px;font-size:12px;font-weight:800;color:#1D4ED8}
.mx-opt{border:2px solid #E3DCCB;background:#fff;border-radius:14px;padding:13px 14px;font:inherit;font-weight:800;font-size:15px;color:#1E2433;text-align:left;cursor:pointer;min-height:52px;box-shadow:0 3px 0 #E3DCCB;display:flex;gap:10px;align-items:center}
.mx-opt .lt{width:24px;height:24px;border-radius:7px;background:#F3EEE2;color:#7A6A55;font-size:12px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.mx-opt:hover:not(:disabled){border-color:var(--lp,#F9A825)}.mx-opt:disabled{cursor:default}
.mx-opt.ok{border-color:#2EA84B;background:#E9F7EC;box-shadow:0 3px 0 #2EA84B}.mx-opt.no{border-color:#F0B44A;background:#FFF5E1;box-shadow:0 3px 0 #F0B44A}.mx-opt.dim{opacity:.5}
.mx-fb{padding:12px 13px 14px;display:flex;flex-direction:column;gap:9px;border:2px solid;border-radius:14px;animation:mxUp .3s both;min-width:0}.mx-foot{padding:10px 14px 14px;border-top:1px solid #EDE6D6;background:inherit}.mx-foot .mx-next{width:100%}
@keyframes mxUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.mx-fb.ok{background:#E9F7EC;border-color:#A5D6A7}.mx-fb.no{background:#FFF5E1;border-color:#F3D08A}
.mx-ft{font-family:'Fredoka',sans-serif;font-weight:600;font-size:17px}.mx-fb.ok .mx-ft{color:#1B5E20}.mx-fb.no .mx-ft{color:#7A4A00}
.mx-cmp{display:flex;gap:7px;align-items:stretch}.mx-cmp>span{flex:1;border-radius:11px;padding:7px 10px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.05em;display:flex;flex-direction:column;gap:2px;background:#fff}
.mx-cmp b{font-family:'Fredoka',sans-serif;font-weight:600;font-size:14.5px;text-transform:none;letter-spacing:0;line-height:1.25}
.mx-cmp .yo{border:1.5px solid #F0B44A;color:#8A5A00}.mx-cmp .yo b{text-decoration:line-through;text-decoration-color:#E08A00}.mx-cmp .ok2{border:1.5px solid #2EA84B;color:#1B5E20}
.mx-blk{background:#fff;border-radius:11px;padding:9px 11px;font-size:13px;font-weight:600;line-height:1.5;color:#2A2A2A}
.mx-blk>small{display:block;font-size:10px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;margin-bottom:2px}
.mx-blk.story>small{color:#B07A00}.mx-blk.rule>small{color:#1D4ED8}.mx-blk.es>small{color:#9D2463}.mx-blk.err>small{color:#B86A00}
.mx-cajanote{display:flex;align-items:center;gap:8px;background:#fff;border:1.5px dashed #C9B6EC;border-radius:11px;padding:7px 10px;font-size:12px;font-weight:800;color:#5B3FA0}
.mx-won{background:#fff;border:1.5px solid #A5D6A7;border-radius:11px;padding:8px 10px;font-size:12.5px;font-weight:900;color:#1B5E20}
.mx-next{border:0;border-radius:12px;font-family:'Fredoka',sans-serif;font-weight:600;font-size:15px;padding:12px;min-height:48px;cursor:pointer;color:#fff}
.mx-foot.ok .mx-next{background:linear-gradient(180deg,#5BC56F,#2E8B45);box-shadow:0 4px 0 #1E6B32}.mx-foot.no .mx-next{background:linear-gradient(180deg,#FFB74D,#F08C00);box-shadow:0 4px 0 #B86A00}
.mx-sum{flex:1;overflow-y:auto;padding:22px 16px;display:flex;flex-direction:column;align-items:center;gap:11px;text-align:center}
.mx-sum h2{font-family:'Fredoka',sans-serif;font-weight:600;font-size:23px;color:#1E2433;margin:0}
.mx-sum .big{font-size:46px}
.mx-srow{width:100%;display:flex;align-items:center;gap:9px;background:#fff;border:1px solid #EDE6D6;border-radius:13px;padding:8px 10px;font-size:12px;font-weight:800;text-align:left}
.mx-srow .sn{width:110px;flex-shrink:0;line-height:1.25}.mx-srow .pb{flex:1;height:9px;border-radius:5px;background:#EDE6D6;overflow:hidden}.mx-srow .pb i{display:block;height:100%;border-radius:5px;transition:width 1s cubic-bezier(.2,.8,.2,1)}
.mx-srow em{font-style:normal;color:#2E7D32;white-space:nowrap;min-width:46px;text-align:right}
.mx-sbox{width:100%;background:#F7F3FD;border:1.5px dashed #C9B6EC;border-radius:13px;padding:10px 12px;font-size:12.5px;font-weight:800;color:#4A2E86;text-align:left;line-height:1.45}
.mx-sbtn{width:100%;display:flex;flex-direction:column;gap:8px;margin-top:4px}
.mx-b1{border:0;border-radius:12px;background:var(--lg,linear-gradient(135deg,#F9A825,#FF8F00));color:#fff;font-family:'Fredoka',sans-serif;font-weight:600;font-size:15px;padding:12px;min-height:48px;cursor:pointer}
.mx-b2{border:2px solid #E3DCCB;border-radius:12px;background:#fff;color:#5B4A3A;font-family:'Fredoka',sans-serif;font-weight:600;font-size:15px;padding:11px;min-height:48px;cursor:pointer}
`;
(function injectMixCSS() { if (typeof document === 'undefined' || document.getElementById('mx-css')) return; const st = document.createElement('style'); st.id = 'mx-css'; st.textContent = MIX_CSS; document.head.appendChild(st); })();

const MX_COLORS = ['#FFB300', '#4FC3F7', '#F06292', '#81C784', '#BA68C8', '#FF8A65', '#4DB6AC', '#9575CD'];
const mxIcon = (m) => m.kind === 'identify' ? '🔎' : m.kind === 'transform' ? '🔄' : m.kind === 'read' ? '📖' : m.kind === 'listen' ? '🎧' : '📝';
/* 🔊 voz del navegador (la misma que usan los materiales de lectura y listening) */
function mxSpeak(text, rate, onEnd) {
  try {
    const S = window.speechSynthesis; if (!S || !text) { onEnd && onEnd(); return false; }
    S.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = rate || .9;
    const vs = S.getVoices ? S.getVoices() : []; const v = vs.find(z => /en[-_]US/i.test(z.lang) && /female|samantha|google us|zira|jenny|aria/i.test(z.name)) || vs.find(z => /en[-_]US/i.test(z.lang)) || vs.find(z => /^en/i.test(z.lang));
    if (v) u.voice = v; u.onend = () => onEnd && onEnd(); u.onerror = () => onEnd && onEnd(); S.speak(u); return true;
  } catch (e) { onEnd && onEnd(); return false; }
}
const mxStop = () => { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {} };
const mxHeard = (txt, key) => { const t = String(txt || ''), k = String(key || '').trim(); if (!k) return t; const i = t.toLowerCase().indexOf(k.toLowerCase()); return i < 0 ? t : t.slice(0, i) + '<b>' + t.slice(i, i + k.length) + '</b>' + t.slice(i + k.length); };
const mxRing = (c, p) => `conic-gradient(${c} ${p}%, rgba(160,180,240,.22) ${p}%)`;
const mxTime = (t) => new Date(t).toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' });
function mxDur(ms) { const m = Math.max(1, Math.ceil(ms / 60000)), h = Math.floor(m / 60); return (h ? h + ' h ' : '') + (m % 60 ? (m % 60) + ' min' : ''); }

function MxRing({ m, color, size, pct, small }) {
  const inner = size - 8, E = inner * (1 - pct / 100) - 4;
  return (
    <div className={small ? 'mx-mr' : 'mx-ring'} style={{ width: size, height: size, background: mxRing(color, pct), boxShadow: small ? 'none' : `0 0 ${Math.round(pct / 100 * 18)}px ${color}`, position: 'relative' }}>
      <div className="mx-in" style={small ? { background: '#fff' } : null}>
        {!small && <span className="mx-lq" style={{ top: E, background: color }}></span>}
        <span className="mx-e" style={small ? { fontSize: 14, filter: 'none' } : null}>{mxIcon(m)}</span>
      </div>
      {!small && pct >= 100 && <span className="mx-ck">✓</span>}
    </div>
  );
}

function MixedPlayer({ uid, mats, run, setRun, color, onFinish, onAnswered }) {
  const MIX = window.JUCUM_MIX;
  const st = run.seq[run.k], q = st.q, mat = mats.find(m => m.key === st.mat) || {};
  const ids = [...new Set(run.seq.map(x => x.mat))];
  const answered = run.chosen !== null;
  const [show, setShow] = React.useState({});
  const [tray, setTray] = React.useState([]);
  const fbRef = React.useRef(null);
  React.useEffect(() => { setShow({}); setTray([]); }, [run.k]);
  const isTr = q.kind === 'transform', isRL = q.kind === 'read' || q.kind === 'listen';
  const [plays, setPlays] = React.useState(0), [speaking, setSpeaking] = React.useState(false);
  React.useEffect(() => { setPlays(0); setSpeaking(false); mxStop(); }, [run.k]);
  React.useEffect(() => () => mxStop(), []);
  const speak = (text, rate, count) => { setSpeaking(true); if (count) setPlays(p => p + 1); if (!mxSpeak(text, rate, () => setSpeaking(false))) setSpeaking(false); };
  React.useEffect(() => { if (answered && fbRef.current && fbRef.current.parentNode) { const p = fbRef.current.parentNode; p.scrollTop = Math.max(0, fbRef.current.offsetTop - 140); } }, [answered, run.k]);
  const choose = (i) => {
    if (answered) return;
    const r = MIX.answer(uid, mats, st, i, run.mode);
    const secs = run.secs + Math.min(MIX.CFG.maxSecQ, (Date.now() - run.shownAt) / 1000);
    setRun({ ...run, chosen: i, secs, res: run.res.concat([{ mat: st.mat, ok: r.ok }]), won: r.matDone ? run.won.concat([{ key: st.mat, score: r.score }]) : run.won, lastWon: r.matDone ? { key: st.mat, score: r.score } : null });
    try { onAnswered && onAnswered(run, r, secs); } catch (e) {}
  };
  const next = () => {
    if (run.k + 1 >= run.seq.length) { onFinish(run); return; }
    setRun({ ...run, k: run.k + 1, chosen: null, shownAt: Date.now(), lastWon: null });
  };
  const L = 'ABCD';
  const ok = answered && (isTr ? MIX.transOk(q, run.chosen) : run.chosen === st.ans);
  const cls = (i) => !answered ? '' : i === st.ans ? 'ok' : i === run.chosen ? 'no' : 'dim';
  const chosenText = answered ? (isTr ? (run.chosen || []).join(' ') : st.opts[run.chosen]) : null;
  const rightText = isTr ? q.answer.join(' ') : st.opts[st.ans];
  const checkTr = () => { if (!tray.length) return; choose(tray.map(i => q.tiles[i])); };
  const html = (s) => ({ __html: s || '' });
  return (
    <div className={'mx-ov' + (run.mode === 'box' ? ' box' : run.mode === 'bonus' ? ' bon' : '')} role="dialog" aria-label="Sesión mixta">
      <div className="mx-top">
        <button type="button" className="mx-x" title="Salir" onClick={() => onFinish(run)}>✕</button>
        <div className="mx-bar"><i style={{ width: ((run.k + (answered ? 1 : 0)) / run.seq.length * 100) + '%' }}></i></div>
        <span className="mx-cnt">{run.k + 1} / {run.seq.length}</span>
      </div>
      {run.mode === 'box' && <span className="mx-tag">🧠 Caja de errores · repaso 2 h después</span>}
      {run.mode === 'bonus' && <span className="mx-tag bon">⭐ Repaso bonus · opcional · cada acierto x2 XP · puedes salir cuando quieras</span>}
      <div className="mx-mini">
        {ids.map(k => { const m = mats.find(x => x.key === k); const p = MIX.matProgress(uid, m).pct; return <div key={k} className={k === st.mat ? 'cur' : ''} style={{ transform: k === st.mat ? 'scale(1.15)' : 'none', transition: 'transform .3s' }} title={m.name + ' · ' + p + '%'}><MxRing m={m} color={color(k)} size={38} pct={p} small /></div>; })}
      </div>
      <div className="mx-q">
        <span className="mx-chip">{mxIcon(mat)} {mat.name}</span>
        {q.kind === 'fill' ? (
          <>
            <div className="mx-hint">Completa la oración</div>
            <div className="mx-sent">{q.sentence.split(/_{2,}/).map((part, i, arr) => <React.Fragment key={i}>{part}{i < arr.length - 1 && <span className="mx-blank">{answered ? st.opts[st.ans] : '\u00A0'}</span>}</React.Fragment>)}</div>
            {!answered && (q.hint || q.tr) && (
              <div className="mx-sup">
                {q.hint && <button type="button" onClick={() => setShow({ ...show, hint: !show.hint })}>💡 Pista</button>}
                {q.tr && <button type="button" className="tr" onClick={() => setShow({ ...show, tr: !show.tr })}>🔤 Traducción</button>}
              </div>
            )}
            {!answered && show.hint && <div className="mx-rev" dangerouslySetInnerHTML={html(q.hint)}></div>}
            {!answered && show.tr && <div className="mx-rev tr" dangerouslySetInnerHTML={html(q.tr)}></div>}
          </>
        ) : q.kind === 'read' ? (
          <>
            <div className="mx-hint">Lee y responde</div>
            <div className="mx-pass">
              <div className="tt"><span style={{ flex: 1 }}>📖 {q.storyTitle}</span><button type="button" className="mx-sbtn" style={{ minHeight: 36, padding: '5px 10px' }} onClick={() => speaking ? (mxStop(), setSpeaking(false)) : speak(q.paras.map(p => p.en).join(' '), .9)}>{speaking ? '⏸ Parar' : '🔊 Escuchar'}</button></div>
              {q.paras.map((p, i) => <React.Fragment key={i}><p dangerouslySetInnerHTML={html(answered ? mxHeard(p.en, q.proof.replace(/[.!?]+$/, '')) : p.en)}></p>{show.es && <p className="es">{p.es}</p>}</React.Fragment>)}
            </div>
            {!answered && <div className="mx-sup"><button type="button" className="tr" onClick={() => setShow({ ...show, es: !show.es })}>🔤 {show.es ? 'Ocultar español' : 'Ver en español'}</button></div>}
            <div className="mx-qq">{q.q}{q.qEn && q.qEn !== q.q && <small>{q.qEn}</small>}</div>
          </>
        ) : q.kind === 'listen' ? (
          <>
            <div className="mx-hint">Escucha y responde · {q.storyTitle}</div>
            <div className="mx-play">
              <button type="button" className={'mx-pbtn' + (speaking ? ' on' : '')} onClick={() => speak(q.audio, .9, true)}>🔊 {plays ? 'Escuchar otra vez' : 'Escuchar'}</button>
              <button type="button" className="mx-sbtn" onClick={() => speak(q.audio, .62, true)}>🐢 Lento</button>
            </div>
            {!answered && plays >= 2 && <div className="mx-sup"><button type="button" className="tr" onClick={() => setShow({ ...show, txt: !show.txt })}>📝 {show.txt ? 'Ocultar el texto' : 'Ver el texto'}</button></div>}
            {!answered && show.txt && <div className="mx-say">{q.audio}</div>}
            <div className="mx-qq">{q.q}{q.qEn && q.qEn !== q.q && <small>{q.qEn}</small>}</div>
          </>
        ) : isTr ? (
          <>
            <div className="mx-hint">Arma la oración nueva</div>
            {q.task && <div className="mx-task" dangerouslySetInnerHTML={html(q.task)}></div>}
            <div className="mx-src"><small>Oración de partida</small>{q.src}</div>
            {!answered && (q.hint || q.tr) && (
              <div className="mx-sup">
                {q.hint && <button type="button" onClick={() => setShow({ ...show, hint: !show.hint })}>💡 Pista</button>}
                {q.tr && <button type="button" className="tr" onClick={() => setShow({ ...show, tr: !show.tr })}>🔤 Traducción</button>}
              </div>
            )}
            {!answered && show.hint && <div className="mx-rev" dangerouslySetInnerHTML={html(q.hint)}></div>}
            {!answered && show.tr && <div className="mx-rev tr" dangerouslySetInnerHTML={html(q.tr)}></div>}
            <div className={'mx-tray' + (answered ? (ok ? ' ok' : ' no') : '')} aria-label="Tu oración">
              {answered ? (run.chosen || []).map((w, i) => <span key={i} className="mx-tile" style={{ cursor: 'default' }}>{w}</span>)
                : tray.length ? tray.map((ti, i) => <button type="button" key={ti} className="mx-tile" title="Quitar" onClick={() => setTray(tray.filter(z => z !== ti))}>{q.tiles[ti]}</button>)
                : <span className="ph">Toca las fichas en orden para armar la oración</span>}
            </div>
            {!answered && <>
              <div className="mx-bank">{(st.bank || q.tiles.map((w, i) => i)).map(ti => <button type="button" key={ti} className={'mx-tile' + (tray.includes(ti) ? ' used' : '')} onClick={() => setTray(tray.concat([ti]))}>{q.tiles[ti]}</button>)}</div>
              {tray.length > 0 && <div className="mx-trtools"><button type="button" onClick={() => setTray(tray.slice(0, -1))}>↶ Quitar la última</button><button type="button" onClick={() => setTray([])}>↺ Empezar de nuevo</button></div>}
            </>}
          </>
        ) : (
          <div className="mx-hint" style={{ fontSize: 15, color: '#1E2433', fontFamily: "'Fredoka',sans-serif", fontWeight: 600 }}>¿Cuál oración está bien escrita?</div>
        )}
        {!isTr && <div className="mx-opts">
          {st.opts.map((o, i) => <button type="button" key={i} className={'mx-opt ' + cls(i)} disabled={answered} onClick={() => choose(i)}><span className="lt">{L[i]}</span><span>{o}</span></button>)}
        </div>}
      {answered && (
        <div className={'mx-fb ' + (ok ? 'ok' : 'no')} ref={fbRef}>
          <div className="mx-ft">{ok ? (run.mode === 'bonus' ? '✅ ¡Correcto! +2 XP' : '✅ ¡Correcto!') : 'Casi… veamos por qué'}</div>
          {!ok && <div className="mx-cmp"><span className="yo">Tu respuesta<b>{chosenText}</b></span><span className="ok2">Correcta<b>{rightText}</b></span></div>}
          {q.kind === 'fill' ? (
            <>
              {(q.story || q.why) && <div className="mx-blk story"><small>📖 En la historia</small>{q.story && <i style={{ display: 'block', marginBottom: 3 }} dangerouslySetInnerHTML={html(q.story)}></i>}<span dangerouslySetInnerHTML={html(q.why)}></span></div>}
              {!ok && q.rule && <div className="mx-blk rule"><small>📐 Regla</small><span dangerouslySetInnerHTML={html(q.rule)}></span></div>}
              {!ok && q.es && <div className="mx-blk es"><small>Español ↔ Inglés</small><span dangerouslySetInnerHTML={html(q.es)}></span></div>}
              {!ok && q.lit && <div className="mx-blk es"><small>🔤 Literal vs natural</small><span dangerouslySetInnerHTML={html(q.lit)}></span></div>}
              {!ok && q.tr && <div className="mx-blk"><small style={{ color: '#7B1FA2' }}>Traducción</small><span dangerouslySetInnerHTML={html(q.tr)}></span></div>}
            </>
          ) : isRL ? (
            <>
              {q.kind === 'listen'
                ? <div className="mx-blk"><small style={{ color: '#0277BD' }}>🎧 Lo que dice el audio</small><div className="mx-say" style={{ marginTop: 4 }} dangerouslySetInnerHTML={html(mxHeard(q.audio, q.heard))}></div>{q.audioEs && <div style={{ fontSize: 12.5, color: '#7A6A55', fontStyle: 'italic', marginTop: 4 }}>{q.audioEs}</div>}<div style={{ marginTop: 6 }}><button type="button" className="mx-sbtn" style={{ minHeight: 36, padding: '5px 10px' }} onClick={() => speak(q.audio, .8)}>🔊 Escuchar otra vez</button></div></div>
                : q.proof && <div className="mx-blk story"><small>📍 La prueba en el texto</small><i>{q.proof}</i></div>}
              {(q.skill || q.tip) && <div className="mx-blk rule"><small>💡 Cómo encontrar la respuesta</small>{q.skill && <span dangerouslySetInnerHTML={html(q.skill)}></span>}{q.tip && <div style={{ marginTop: 3 }} dangerouslySetInnerHTML={html(q.tip)}></div>}</div>}
              {!ok && q.note && <div className="mx-blk es"><small>📐 Para recordar</small><span dangerouslySetInnerHTML={html(q.note)}></span></div>}
              {q.correctEn && q.correctEn !== q.correct && <div className="mx-blk"><small style={{ color: '#7B1FA2' }}>En inglés</small>{q.qEn} → <b>{q.correctEn}</b></div>}
            </>
          ) : isTr ? (
            <>
              {q.story && <div className="mx-blk story"><small>📖 En la historia</small><i style={{ display: 'block' }} dangerouslySetInnerHTML={html(q.story.q)}></i>{q.story.es && <span style={{ fontSize: 12, color: '#8a6f3a' }} dangerouslySetInnerHTML={html(q.story.es)}></span>}</div>}
              {q.change && <div className="mx-blk rule"><small>🔧 El cambio paso a paso</small><span dangerouslySetInnerHTML={html(q.change)}></span></div>}
              {!ok && q.formula && <div className="mx-blk"><small style={{ color: '#5B3FA0' }}>🧩 Estructura</small><span dangerouslySetInnerHTML={html(q.formula)}></span></div>}
              {!ok && q.rule && <div className="mx-blk rule"><small>📐 Regla</small><span dangerouslySetInnerHTML={html(q.rule)}></span>{q.examples && q.examples.length > 0 && <div className="mx-exrow">{q.examples.map((e, i) => <span key={i} className="mx-ex">{e}</span>)}</div>}</div>}
              {!ok && q.es && <div className="mx-blk es"><small>Español ↔ Inglés</small><span dangerouslySetInnerHTML={html(q.es)}></span></div>}
              {!ok && q.lit && <div className="mx-blk es"><small>🔤 Literal vs natural</small><span dangerouslySetInnerHTML={html(q.lit)}></span></div>}
              {!ok && q.tr && <div className="mx-blk"><small style={{ color: '#7B1FA2' }}>Traducción</small><span dangerouslySetInnerHTML={html(q.tr)}></span></div>}
            </>
          ) : (() => {
            const ci = q.info[q.correct] || {}, wi = !ok ? (q.info[chosenText] || {}) : null;
            return (
              <>
                {!ok && wi && (wi.explanation || wi.errorType) && <div className="mx-blk err"><small>⚠ {wi.errorType || 'El error'}</small>{wi.errorWord && wi.correctWord && <div style={{ marginBottom: 3 }}><b style={{ color: '#B86A00', textDecoration: 'line-through' }}>{wi.errorWord}</b> → <b style={{ color: '#2E7D32' }}>{wi.correctWord}</b></div>}<span dangerouslySetInnerHTML={html(wi.explanation)}></span></div>}
                {ci.es && <div className="mx-blk"><small style={{ color: '#2E7D32' }}>✓ Significa</small><span dangerouslySetInnerHTML={html(ci.es)}></span></div>}
              </>
            );
          })()}
          {!ok && <div className="mx-cajanote">{run.mode === 'bonus' ? '⭐ Sin problema: vuelve en otra ronda de esta semana' : run.mode === 'box' ? '🧠 Vuelve mañana a tu caja, sin problema' : '🧠 Va a tu caja de errores · la verás en 2 h'}</div>}
          {run.lastWon && <div className="mx-won">🎉 ¡Completaste {(mats.find(m => m.key === run.lastWon.key) || {}).name}! Tu nota: {run.lastWon.score}%</div>}
        </div>
      )}
      </div>
      {!answered && isTr && <div className="mx-foot"><button type="button" className="mx-next mx-check" disabled={!tray.length} onClick={checkTr}>Comprobar</button></div>}
      {answered && <div className={'mx-foot ' + (ok ? 'ok' : 'no')}><button type="button" className="mx-next" onClick={next}>{run.k + 1 >= run.seq.length ? 'Ver resultado' : ok ? 'Seguir' : 'Entendido, seguir'}</button></div>}
    </div>
  );
}

function MixedSummary({ uid, mats, sum, color, pending, onAgain, onClose }) {
  const MIX = window.JUCUM_MIX;
  const ok = sum.res.filter(r => r.ok).length, wrong = sum.res.length - ok;
  const keys = [...new Set(sum.res.map(r => r.mat))];
  const [anim, setAnim] = React.useState(false);
  React.useEffect(() => { const t = setTimeout(() => setAnim(true), 350); return () => clearTimeout(t); }, []);
  const box = MIX.boxStatus(uid, mats);
  return (
    <div className="mx-ov" role="dialog" aria-label="Resultado de la sesión">
      <div className="mx-sum">
        <div className="big">{sum.mode === 'box' ? '🧠' : sum.mode === 'bonus' ? '⭐' : '🎉'}</div>
        <h2>{sum.mode === 'box' ? '¡Errores repasados!' : sum.mode === 'bonus' ? '¡Repaso bonus hecho!' : '¡Sesión completada!'}</h2>
        {sum.mode === 'bonus' && sum.xp > 0 && <div style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: 22, color: '#B87400' }}>+{sum.xp} XP</div>}
        <div style={{ fontSize: 14, fontWeight: 800, color: '#5B4A3A' }}>{ok} de {sum.res.length} bien{sum.mode === 'box' && ok ? ' · lo que acertaste ya cuenta para tu avance' : ''}</div>
        {keys.map(k => { const m = mats.find(x => x.key === k); const b = sum.before[k] || 0, a = sum.after[k] || 0; return (
          <div className="mx-srow" key={k}><span style={{ fontSize: 16 }}>{mxIcon(m)}</span><span className="sn">{m.name}</span><div className="pb"><i style={{ width: (anim ? a : b) + '%', background: color(k) }}></i></div><em>{a}%{a > b ? <small style={{ display: 'block', fontSize: 10, color: '#2EA84B' }}>+{a - b}</small> : null}</em></div>
        ); })}
        {sum.won.map(w => <div className="mx-srow" key={'w' + w.key} style={{ borderColor: '#A5D6A7', background: '#F1FAF2', color: '#1B5E20' }}>🎉 ¡Completaste {(mats.find(m => m.key === w.key) || {}).name}! Nota registrada: {w.score}%</div>)}
        {wrong > 0 && sum.mode === 'mix' && <div className="mx-sbox">🧠 {wrong} a tu caja de errores. Se abre a las <b>{mxTime(box.next || (Date.now() + MIX.CFG.boxMs))}</b>: repasar después de un descanso ayuda a que tu cerebro lo guarde.</div>}
        {wrong > 0 && sum.mode === 'box' && <div className="mx-sbox">🌙 {wrong} vuelve{wrong > 1 ? 'n' : ''} mañana a tu caja. ¡Paso a paso!</div>}
        {wrong > 0 && sum.mode === 'bonus' && <div className="mx-sbox" style={{ background: '#FFFBEA', borderColor: '#E9C45A', color: '#5A3E00' }}>⭐ {wrong} vuelve{wrong > 1 ? 'n' : ''} en otra ronda de esta semana. No te quita puntos.</div>}
        <div className="mx-sbtn">
          {pending > 0 && (sum.mode === 'mix' || sum.mode === 'bonus') && <button type="button" className="mx-b1" style={sum.mode === 'bonus' ? { background: 'linear-gradient(180deg,#FFCA28,#F59E00)', color: '#3D2A00' } : null} onClick={onAgain}>{sum.mode === 'bonus' ? '⭐ Otra ronda bonus' : '▶ Otra ronda'}</button>}
          <button type="button" className="mx-b2" onClick={onClose}>Volver a Mi práctica</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MixedPlayer, MixedSummary });
