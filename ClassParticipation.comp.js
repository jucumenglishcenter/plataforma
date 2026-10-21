/* 🙋 Participación en clase + 🎲 Sorteo · PARTICIPATION-V1 (21-oct-2026)
 * Aprobado por la usuaria en “Espejo - Participacion en el Modo clase.html”.
 *  · PzPanel (burbuja del Modo clase, reemplaza la lista P/T/A): un ＋ por participación con su tipo
 *    (respondió · leyó · preguntó · ayudó). Quien no está marcado “Faltó” queda PRESENTE (se escribe solo
 *    al primer toque). El conteo vive en la asistencia del día (`participation`, ya va a la nube).
 *  · XP: +5 por participación, máx. 15 por clase (addBonusXP; quitar una participación lo devuelve) +
 *    notificación al alumno.
 *  · PzSorteo: pantalla completa (proyector). Tómbola = presentes que aún no participaron en la RONDA;
 *    entre ellos salen primero los que MENOS participaron la clase anterior. Nadie repite hasta que
 *    pasaron todos; al completarse empieza otra ronda.
 *  · Local (clave chica `jucum_part_v1`, se poda a 45 días): tipos de cada participación + ronda.
 * Prefijo pz* (ámbito global compartido). */
const PZ_KEY = 'jucum_part_v1';
const PZ_XP = 5, PZ_XPMAX = 15;
const PZ_KINDS = [['resp', '🙋', 'Respondió', '#3F5BB8'], ['read', '🗣️', 'Leyó', '#2E7D32'], ['ask', '❓', 'Preguntó', '#F2820D'], ['help', '🤝', 'Ayudó', '#8E44AD']];
function pzAll() { try { return JSON.parse(localStorage.getItem(PZ_KEY) || '{}') || {}; } catch (e) { return {}; } }
function pzSaveAll(all) {
  try { const lim = new Date(Date.now() - 5 * 3600000 - 45 * 86400000).toISOString().slice(0, 10); Object.keys(all).forEach(k => { if (k.split('|')[0] < lim) delete all[k]; }); } catch (e) {}
  try { if (window.JUCUM_STORE) window.JUCUM_STORE.setJSON(PZ_KEY, all); else localStorage.setItem(PZ_KEY, JSON.stringify(all)); } catch (e) {}
}
function pzDay(date, gid) { const all = pzAll(); return all[date + '|' + gid] || { k: {}, round: 1, base: {} }; }
function pzSetDay(date, gid, d) { const all = pzAll(); all[date + '|' + gid] = d; pzSaveAll(all); }
function pzRec(date, sid) { const A = window.JUCUM_ATT; return (A && A.getStudentRecord(date, sid)) || null; }
function pzCount(date, sid) { const r = pzRec(date, sid); return (r && r.participation) || 0; }
function pzAbsent(date, sid) { const r = pzRec(date, sid); return !!(r && r.status === 'falto'); }
function pzPing() { try { window.dispatchEvent(new Event('jucum-pz')); } catch (e) {} }
function usePzTick() { const [, f] = React.useState(0); React.useEffect(() => { const on = () => f(n => n + 1); window.addEventListener('jucum-pz', on); return () => window.removeEventListener('jucum-pz', on); }, []); }
/* Quien no tiene registro ese día queda presente (solo al primer toque del profesor) */
function pzEnsure(students, date) {
  const A = window.JUCUM_ATT; if (!A) return;
  students.forEach(s => { if (!pzRec(date, s.id)) A.setAttendance(date, s.group, s.id, 'asistio', 0, ''); });
}
/* Clase anterior del grupo = último día con asistencia de estos alumnos antes de `date` */
function pzPrev(students, date) {
  const A = window.JUCUM_ATT; const out = { date: null, n: {} }; if (!A) return out;
  students.forEach(s => (A.getStudentHistory(s.id, 15) || []).forEach(h => { if (h.date < date && (!out.date || h.date > out.date)) out.date = h.date; }));
  if (out.date) { const day = A.getDay(out.date) || {}; students.forEach(s => { out.n[s.id] = (day[s.id] && day[s.id].status !== 'falto') ? (day[s.id].participation || 0) : 0; }); }
  return out;
}
function pzPresent(students, date) { return students.filter(s => !pzAbsent(date, s.id)); }
function pzPool(students, date, gid) { const d = pzDay(date, gid); return pzPresent(students, date).filter(s => pzCount(date, s.id) <= ((d.base || {})[s.id] || 0)); }
function pzMaybeNewRound(students, date, gid) {
  const P = pzPresent(students, date); if (!P.length || pzPool(students, date, gid).length) return;
  const d = pzDay(date, gid); const base = {}; P.forEach(s => { base[s.id] = pzCount(date, s.id); }); pzSetDay(date, gid, { ...d, round: (d.round || 1) + 1, base });
}
function pzAdd(students, s, date, kind) {
  const A = window.JUCUM_ATT; const D = window.JUCUM_DATA; if (!A) return 0;
  pzEnsure(students, date);
  const r = pzRec(date, s.id) || {}; const n = (r.participation || 0) + 1;
  A.setAttendance(date, s.group, s.id, r.status === 'tarde' ? 'tarde' : 'asistio', n, r.note || '');
  const gid = s.group; const d = pzDay(date, gid); const k = { ...(d.k || {}) }; k[s.id] = [...(k[s.id] || []), kind]; pzSetDay(date, gid, { ...d, k });
  let xp = 0;
  if (n * PZ_XP <= PZ_XPMAX) {
    xp = PZ_XP; try { if (D && D.addBonusXP) D.addBonusXP(s.id, xp); } catch (e) {}
    const kl = (PZ_KINDS.find(x => x[0] === kind) || PZ_KINDS[0])[2].toLowerCase();
    try { if (window.JUCUM_NOTIF) window.JUCUM_NOTIF.pushNotif(s.id, { type: 'teacher-feedback', title: '🙋 ¡Participaste en clase! (+' + xp + ' XP)', body: 'Tu profesor registró que ' + kl + ' en clase (' + n + (n === 1 ? ' vez' : ' veces') + ' hoy). ¡Sigue así! ⭐', link: 'progress' }); } catch (e) {}
  }
  pzMaybeNewRound(students, date, gid); pzPing();
  return xp;
}
function pzUndo(s, date) {
  const A = window.JUCUM_ATT; const D = window.JUCUM_DATA; const r = pzRec(date, s.id); if (!A || !r || !r.participation) return;
  const n = r.participation; A.setAttendance(date, s.group, s.id, r.status, n - 1, r.note || '');
  if (n * PZ_XP <= PZ_XPMAX) { try { if (D && D.addBonusXP) D.addBonusXP(s.id, -PZ_XP); } catch (e) {} }
  const d = pzDay(date, s.group); const k = { ...(d.k || {}) }; k[s.id] = (k[s.id] || []).slice(0, -1);
  const base = { ...(d.base || {}) }; if ((base[s.id] || 0) > n - 1) base[s.id] = n - 1;
  pzSetDay(date, s.group, { ...d, k, base }); pzPing();
}
const pzFirst = s => String((s && (s.fullName || s.username)) || '').split(' ')[0];
const pzIni = s => String((s && (s.fullName || s.username)) || '?').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();
const pzKb = { border:'1.5px solid #E3DCC9', background:'#fff', borderRadius:9, padding:'4px 8px', fontFamily:'inherit', fontSize:11.5, fontWeight:800, cursor:'pointer', color:'#6b5a1f', whiteSpace:'nowrap' };

/* ── Burbuja del Modo clase ── */
function PzPanel({ students, group, date, onClose, onSorteo }) {
  usePzTick();
  const A = window.JUCUM_ATT; const TT = window.JUCUM_TT;
  const [kind, setKind] = React.useState('resp');
  const [noteFor, setNoteFor] = React.useState(null); const [txt, setTxt] = React.useState(''); const [savedFor, setSavedFor] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const gid = group ? group.id : (students[0] && students[0].group);
  const prev = React.useMemo(() => pzPrev(students, date), [students.length, date]);
  const P = pzPresent(students, date); const pool = pzPool(students, date, gid); const d = pzDay(date, gid);
  const show = t => { setToast(t); clearTimeout(window.__pzT); window.__pzT = setTimeout(() => setToast(null), 1800); };
  const add = s => { const xp = pzAdd(students, s, date, kind); show(xp ? '+' + xp + ' XP · ' + pzFirst(s) + ' participó 🙋' : pzFirst(s) + ' participó · ya tiene el máximo de XP de hoy'); };
  const setAbs = (s, on) => { pzEnsure(students, date); const r = pzRec(date, s.id) || {}; A.setAttendance(date, s.group, s.id, on ? 'falto' : 'asistio', on ? 0 : (r.participation || 0), r.note || ''); pzMaybeNewRound(students, date, gid); pzPing(); };
  const saveNote = s => { if (txt.trim() && TT && TT.addNote) { TT.addNote({ studentId: s.id, groupId: s.group, text: txt.trim(), tag: 'clase' }); setSavedFor(s.id); setTimeout(() => setSavedFor(null), 1500); } setNoteFor(null); setTxt(''); };
  const kinds = sid => (d.k || {})[sid] || [];
  return (
    <div style={{position:'fixed', right:22, bottom:92, zIndex:60, width:380, maxWidth:'calc(100vw - 44px)', maxHeight:'76vh', display:'flex', flexDirection:'column', background:'#fff', border:'1px solid #E3DCC9', borderRadius:16, boxShadow:'0 12px 36px rgba(0,0,0,0.2)', overflow:'hidden'}}>
      <div style={{display:'flex', alignItems:'center', gap:9, padding:'12px 15px', background:'linear-gradient(135deg,#F2820D,#D9690A)', color:'#fff'}}>
        <span style={{fontSize:18}}>🙋</span>
        <div style={{flex:1, minWidth:0}}><div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:15}}>Participación de hoy</div><div style={{fontSize:11.5, opacity:0.9}}>{group ? group.name : 'Grupo'} · {P.length} presentes · {P.filter(s => pzCount(date, s.id)).length} ya participaron</div></div>
        <button onClick={onClose} style={{border:'none', background:'rgba(255,255,255,0.22)', color:'#fff', width:26, height:26, borderRadius:8, cursor:'pointer', fontSize:15, fontWeight:800}}>×</button>
      </div>
      <div style={{padding:'8px 12px', background:'#FFF7EC', borderBottom:'1px solid #F2E6CF', display:'flex', flexDirection:'column', gap:6}}>
        <div style={{display:'flex', gap:5, flexWrap:'wrap', alignItems:'center'}}><span style={{fontSize:11, fontWeight:800, color:'#8a6a1f'}}>Marcar como:</span>{PZ_KINDS.map(([k, e, l, c]) => <button key={k} onClick={() => setKind(k)} style={{...pzKb, ...(kind === k ? { background:c, borderColor:c, color:'#fff' } : {})}}>{e} {l}</button>)}</div>
        <button onClick={onSorteo} style={{border:'none', borderRadius:10, padding:8, fontFamily:'inherit', fontWeight:900, fontSize:13, cursor:'pointer', background:'linear-gradient(135deg,#3F5BB8,#0D1B5A)', color:'#fff'}}>🎲 Sortear · ronda {d.round || 1} · {P.length - pool.length}/{P.length}</button>
      </div>
      <div style={{overflowY:'auto', padding:'6px 10px'}}>
        {students.length === 0 ? <div style={{padding:'18px 8px', textAlign:'center', color:'#999', fontSize:12.5, fontWeight:700}}>No hay alumnos en este grupo todavía.</div>
          : students.map(s => { const n = pzCount(date, s.id), abs = pzAbsent(date, s.id), pv = prev.date ? (prev.n[s.id] || 0) : null; const r = pzRec(date, s.id);
            return (
              <div key={s.id} style={{borderBottom:'1px solid #F2ECDD', padding:'7px 4px', opacity: abs ? 0.5 : 1}}>
                <div style={{display:'flex', alignItems:'center', gap:8}}>
                  <span style={{width:30, height:30, borderRadius:'50%', background:'#FCEFD8', color:'#C77B12', fontWeight:800, fontSize:11.5, display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>{pzIni(s)}</span>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontWeight:800, fontSize:12.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{s.fullName || s.username}{savedFor === s.id && <span style={{color:'#2E7D32', fontSize:11}}> ✓ nota</span>}</div>
                    <div style={{fontSize:10.5, fontWeight:800, color: pv === 0 && !abs ? '#B03A2E' : '#8a7f6a'}}>{abs ? 'faltó hoy' : (pv == null ? 'primera clase registrada' : 'clase pasada: ' + pv + (pv === 0 ? ' · prioridad 🎲' : ''))}{!abs && r && r.status === 'tarde' ? ' · llegó tarde' : ''}{!abs && n ? ' · +' + Math.min(PZ_XPMAX, n * PZ_XP) + ' XP' : ''}</div>
                    {kinds(s.id).length > 0 && <div style={{display:'flex', gap:2, marginTop:2}}>{kinds(s.id).map((k, i) => { const K = PZ_KINDS.find(x => x[0] === k) || PZ_KINDS[0]; return <span key={i} title={K[2]} style={{width:9, height:9, borderRadius:'50%', background:K[3]}}></span>; })}</div>}
                  </div>
                  {abs ? <button onClick={() => setAbs(s, false)} style={pzKb}>↩ Sí vino</button> : <>
                    <span style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:20, minWidth:20, textAlign:'center', color: n ? '#0D1B5A' : '#C9C3B3'}}>{n}</span>
                    {n > 0 && <button onClick={() => pzUndo(s, date)} title="Quitar la última" style={{...pzKb, padding:'4px 7px'}}>−</button>}
                    <button onClick={() => add(s)} title="Sumar una participación" style={{width:36, height:36, borderRadius:10, border:'none', background:'#2E7D32', color:'#fff', fontSize:18, fontWeight:900, cursor:'pointer'}}>＋</button>
                    <button onClick={() => setAbs(s, true)} title="No vino" style={{...pzKb, padding:'4px 6px'}}>Faltó</button>
                  </>}
                  <button onClick={() => { setNoteFor(noteFor === s.id ? null : s.id); setTxt(''); }} title="Nota rápida" style={{...pzKb, padding:'4px 6px'}}>✎</button>
                </div>
                {noteFor === s.id && (
                  <div style={{display:'flex', gap:6, marginTop:7}}>
                    <input autoFocus value={txt} onChange={e => setTxt(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveNote(s); }} placeholder="Nota rápida de clase…" style={{flex:1, border:'1px solid #E3DCC9', borderRadius:8, padding:'6px 9px', fontFamily:'inherit', fontSize:12.5}} />
                    <button onClick={() => saveNote(s)} style={{background:'#1F3A8A', color:'#fff', border:0, borderRadius:8, padding:'6px 11px', fontFamily:'inherit', fontSize:12, fontWeight:800, cursor:'pointer'}}>Guardar</button>
                  </div>)}
              </div>); })}
      </div>
      <div style={{padding:'7px 12px', borderTop:'1px solid #F2ECDD', fontSize:10.5, color:'#8a7f6a', fontWeight:700, lineHeight:1.4}}>Quien no está marcado “Faltó” queda <b>presente</b>. Cada participación da +{PZ_XP} XP (máx. {PZ_XPMAX} por clase) y le llega a la campanita del alumno.</div>
      {toast && <div style={{position:'absolute', left:'50%', bottom:44, transform:'translateX(-50%)', background:'#1B5E20', color:'#fff', borderRadius:20, padding:'7px 14px', fontWeight:800, fontSize:12.5, whiteSpace:'nowrap', boxShadow:'0 6px 16px rgba(0,0,0,.25)'}}>{toast}</div>}
    </div>
  );
}

/* ── 🎲 Sorteo a pantalla completa ── */
let pzAC = null;
function pzBeep(on, f, d, v, type) { if (!on) return; try { pzAC = pzAC || new (window.AudioContext || window.webkitAudioContext)(); const o = pzAC.createOscillator(), g = pzAC.createGain(); o.type = type || 'square'; o.frequency.value = f; o.connect(g); g.connect(pzAC.destination); const t = pzAC.currentTime; g.gain.setValueAtTime(v || .04, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.start(t); o.stop(t + d); } catch (e) {} }
function PzSorteo({ students, group, date, label, onClose }) {
  const gid = group ? group.id : (students[0] && students[0].group);
  const prev = React.useMemo(() => pzPrev(students, date), [students.length, date]);
  const [sound, setSound] = React.useState(() => { try { return localStorage.getItem('jucum_pz_sound_v1') !== '0'; } catch (e) { return true; } });
  const soundRef = React.useRef(sound); soundRef.current = sound;
  const [draw, setDraw] = React.useState(null); const [hot, setHot] = React.useState(null); const [done, setDone] = React.useState(false);
  const reelRef = React.useRef(null); const H = 96;
  const start = (exclude) => {
    pzEnsure(students, date); pzMaybeNewRound(students, date, gid);
    const pool = pzPool(students, date, gid); if (!pool.length) { setDraw({ empty: true }); return; }
    let c = pool.filter(s => s.id !== exclude); if (!c.length) c = pool;
    const pv = s => (prev.date ? (prev.n[s.id] || 0) : 0); const m = Math.min(...c.map(pv)); const pri = c.filter(s => pv(s) === m);
    const win = pri[Math.floor(Math.random() * pri.length)]; const last = pool.length === 1; const N = last ? 8 : 34; const seq = [];
    for (let i = 0; i < N - 1; i++) { let r; let g = 0; do { r = pool[Math.floor(Math.random() * pool.length)]; g++; } while (pool.length > 1 && seq.length && r.id === seq[seq.length - 1].id && g < 9); seq.push(r); }
    seq.push(win); setDone(false); setHot(null); setDraw({ pool, pri, win, seq, last, id: Date.now() });
  };
  React.useEffect(() => { start(null); }, []);
  React.useEffect(() => {
    if (!draw || draw.empty || !reelRef.current) return;
    const el = reelRef.current; const end = (draw.seq.length - 2) * H; const dur = draw.last ? 1600 : 5200; const t0 = performance.now(); let li = -1, raf = 0;
    const frame = now => { const t = Math.min(1, (now - t0) / dur); const e = 1 - Math.pow(1 - t, 4); const y = -e * end; el.style.transform = 'translateY(' + y + 'px)'; const idx = Math.round((-y + H) / H);
      if (idx !== li) { li = idx; pzBeep(soundRef.current, t < .8 ? 880 : 660, .035, .035); if (draw.seq[idx]) setHot(draw.seq[idx].id); }
      if (t < 1) raf = requestAnimationFrame(frame); else { setHot(draw.win.id); setDone(true); [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => pzBeep(soundRef.current, f, .28, .06, 'triangle'), i * 120)); } };
    el.style.transform = 'translateY(0px)'; raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [draw && draw.id]);
  const confetti = React.useMemo(() => Array.from({ length: 90 }, (_, i) => ({ l: Math.random() * 100, w: 6 + Math.random() * 7, h: 10 + Math.random() * 10, c: ['#FFC107', '#FF7043', '#66BB6A', '#42A5F5', '#EC407A', '#fff'][i % 6], d: 1.8 + Math.random() * 1.8, dl: Math.random() * .5 })), [draw && draw.id]);
  const mark = k => { pzAdd(students, draw.win, date, k); onClose(); };
  const toggleSound = () => { const v = !sound; setSound(v); try { localStorage.setItem('jucum_pz_sound_v1', v ? '1' : '0'); } catch (e) {} };
  const d = pzDay(date, gid); const doneRound = draw && !draw.empty ? pzPresent(students, date).filter(s => !draw.pool.some(p => p.id === s.id)) : [];
  const priIds = draw && draw.pri ? draw.pri.map(s => s.id) : [];
  return (
    <div style={{position:'fixed', inset:0, zIndex:120, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, color:'#fff', overflow:'hidden', padding:20, background:'radial-gradient(circle at 50% 38%,#4F6BD0,#0D1B5A 72%)', fontFamily:"'Nunito',sans-serif"}}>
      <style>{`@keyframes pzCf{0%{transform:translateY(-10vh) rotate(0)}100%{transform:translateY(110vh) rotate(720deg)}}@keyframes pzPop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.12);opacity:1}100%{transform:scale(1)}}@keyframes pzGlow{0%,100%{box-shadow:0 0 0 0 rgba(255,193,7,0)}50%{box-shadow:0 0 0 10px rgba(255,193,7,.35)}}`}</style>
      <button onClick={toggleSound} title={sound ? 'Silenciar' : 'Activar sonido'} style={{position:'absolute', top:16, right:70, border:'none', background:'rgba(255,255,255,.15)', color:'#fff', borderRadius:'50%', width:44, height:44, fontSize:18, cursor:'pointer'}}>{sound ? '🔊' : '🔇'}</button>
      <button onClick={onClose} title="Cerrar" style={{position:'absolute', top:16, right:16, border:'none', background:'rgba(255,255,255,.15)', color:'#fff', borderRadius:'50%', width:44, height:44, fontSize:18, cursor:'pointer', fontWeight:900}}>✕</button>
      {draw && draw.empty ? <>
        <div style={{fontSize:44}}>🎲</div><div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:28}}>No hay alumnos presentes para sortear</div>
        <button onClick={onClose} style={{border:'none', borderRadius:12, padding:'12px 18px', fontFamily:'inherit', fontWeight:900, fontSize:14, cursor:'pointer', background:'#fff', color:'#0D1B5A'}}>Volver</button>
      </> : draw && <>
        <div style={{fontSize:13, fontWeight:900, letterSpacing:'.14em', textTransform:'uppercase', opacity:.8, textAlign:'center'}}>🎲 {label ? label + ' · ' : ''}Ronda {d.round || 1} · {draw.pool.length} en la tómbola</div>
        <div key={done ? 'w' : 'q'} style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:'clamp(26px,4vw,40px)', textAlign:'center', animation: done ? 'pzPop .5s' : 'none'}}>{done ? <>¡Le toca a <span style={{color:'#FFC107'}}>{pzFirst(draw.win)}</span>!</> : (draw.last ? '¡El último de la ronda!' : '¿A quién le toca?')}</div>
        <div style={{position:'relative', width:'min(560px,90vw)', height:H * 3, borderRadius:26, background:'rgba(255,255,255,.07)', border:'3px solid rgba(255,255,255,.22)', overflow:'hidden'}}>
          <div ref={reelRef} style={{position:'absolute', left:0, right:0, top:0, willChange:'transform'}}>
            {draw.seq.map((s, i) => <div key={i} style={{height:H, display:'flex', alignItems:'center', justifyContent:'center', gap:16}}><span style={{width:54, height:54, borderRadius:'50%', background:'#FCEFD8', color:'#C77B12', fontWeight:900, fontSize:18, display:'inline-flex', alignItems:'center', justifyContent:'center'}}>{pzIni(s)}</span><span style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:'clamp(30px,5vw,48px)'}}>{pzFirst(s)}</span></div>)}
          </div>
          <div style={{position:'absolute', inset:0, background:'linear-gradient(#0D1B5A 0,rgba(13,27,90,0) 30%,rgba(13,27,90,0) 70%,#0D1B5A 100%)', pointerEvents:'none'}}></div>
          <div style={{position:'absolute', left:10, right:10, top:H, height:H, borderRadius:18, border:'4px solid #FFC107', pointerEvents:'none', background: done ? 'rgba(255,193,7,.18)' : 'transparent', animation: done ? 'pzGlow .9s 3' : 'none'}}></div>
        </div>
        <div style={{display:'flex', gap:6, flexWrap:'wrap', justifyContent:'center', maxWidth:640}}>
          {draw.pool.map(s => { const on = hot === s.id; return <span key={s.id} style={{fontSize:12.5, fontWeight:800, borderRadius:16, padding:'4px 10px', background: on ? '#FFC107' : 'rgba(255,255,255,.14)', color: on ? '#3A2A00' : '#fff', border:'1.5px solid ' + (on ? '#FFC107' : 'rgba(255,255,255,.25)'), transform: on ? 'scale(1.12)' : 'none', transition:'all .08s'}}>{pzFirst(s)}{priIds.includes(s.id) && draw.pri.length < draw.pool.length ? ' ⭐' : ''}</span>; })}
        </div>
        {draw.pri.length < draw.pool.length && <div style={{fontSize:12, fontWeight:800, opacity:.85, textAlign:'center'}}>⭐ Prioridad: {(prev.n[draw.win.id] || 0) === 0 ? 'no participaron' : 'participaron menos'} la clase pasada</div>}
        {doneRound.length > 0 && <div style={{fontSize:12, fontWeight:800, opacity:.65, maxWidth:620, textAlign:'center'}}>✓ Ya participaron en esta ronda: {doneRound.map(pzFirst).join(', ')}</div>}
        <div style={{display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center', minHeight:46}}>
          {done && <>
            {PZ_KINDS.map(([k, e, l, c]) => <button key={k} onClick={() => mark(k)} style={{border:'none', borderRadius:12, padding:'12px 15px', fontFamily:'inherit', fontWeight:900, fontSize:14, cursor:'pointer', background:c, color:'#fff'}}>{e} {l}</button>)}
            <button onClick={() => start(draw.win.id)} style={{border:'1.5px solid rgba(255,255,255,.5)', borderRadius:12, padding:'12px 15px', fontFamily:'inherit', fontWeight:800, fontSize:13.5, cursor:'pointer', background:'#fff', color:'#0D1B5A'}}>↻ No está listo · otro</button>
          </>}
        </div>
        {done && confetti.map((c, i) => <span key={i} style={{position:'absolute', top:0, left:c.l + '%', width:c.w, height:c.h, background:c.c, borderRadius:2, animation:'pzCf ' + c.d + 's ' + c.dl + 's linear forwards', pointerEvents:'none'}}></span>)}
      </>}
    </div>
  );
}

/* ── Resumen dentro de 🏁 Terminar clase ── */
function PzCloseSummary({ students, date }) {
  usePzTick();
  const P = pzPresent(students, date).filter(s => pzRec(date, s.id));
  if (!P.length) return null;
  const yes = P.filter(s => pzCount(date, s.id)).sort((a, b) => pzCount(date, b.id) - pzCount(date, a.id)); const no = P.filter(s => !pzCount(date, s.id));
  const xp = P.reduce((a, s) => a + Math.min(PZ_XPMAX, pzCount(date, s.id) * PZ_XP), 0);
  return (
    <div style={{border:'1px solid #A5D6A7', borderRadius:12, padding:'10px 12px', background:'#F4FBF4', display:'flex', flexDirection:'column', gap:7}}>
      <div style={{fontSize:12.5, fontWeight:800, color:'#1B5E20'}}>🙋 Participación de hoy · {yes.length} de {P.length} participaron · {xp} XP repartido</div>
      {yes.length > 0 && <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>{yes.map(s => <span key={s.id} style={{background:'#E8F5E9', color:'#1B5E20', borderRadius:12, padding:'3px 9px', fontSize:12, fontWeight:800}}>{pzFirst(s)} {pzCount(date, s.id)}</span>)}</div>}
      {no.length ? <div style={{background:'#FFF4E5', border:'1px solid #FFCC80', borderRadius:10, padding:'7px 10px', fontSize:12.5, fontWeight:800, color:'#7A4A00'}}>🤫 No participaron: {no.map(pzFirst).join(', ')} → en la próxima clase salen primero en el 🎲 sorteo.</div>
        : <div style={{fontSize:12.5, fontWeight:800, color:'#1B5E20'}}>🎉 Todos los presentes participaron.</div>}
    </div>
  );
}
window.JUCUM_PZ = { add: pzAdd, undo: pzUndo, count: pzCount, prev: pzPrev };
Object.assign(window, { PzPanel, PzSorteo, PzCloseSummary });
