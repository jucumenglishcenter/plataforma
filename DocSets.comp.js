/* ✍️ SETS DESDE DOCUMENTO · DOCSETS-V1 (22-oct-2026) — interfaz
 * Aprobado en `Espejo - Documento a sets - clase o casa.html`. Lógica en docsets.js (window.JUCUM_DOCSETS).
 *  - DocSetReview ........ (teacher) sets por título → No asignar · 🏫 En clase (día del plan + tiempo) · 🏠 Para casa
 *  - DocSetClassPanel .... (teacher, ▶ Modo clase) Abrir ahora · reloj · ＋min · 🔒 Cerrar · tablero en vivo · resultados
 *  - DocSetResults ....... (teacher) notas, 🟨 por revisar, 👁 actividad tal como la hizo (◀ ▶), cambiar entrega
 *  - DocSetLiveBanner .... (alumno) “🏫 En clase ahora” en Inicio y en Mi práctica (solo mientras está abierta)
 *  - DocSetTaskCard ...... (alumno) tarjeta de la tarea para casa en Mis tareas
 *  - DocSetPlayer ........ (alumno) un ejercicio a la vez · 1 intento · 🌐 Traducir · avisos sin bajar nota */
const dsUS = React.useState, dsUE = React.useEffect, dsUR = React.useRef;
const DSX = () => window.JUCUM_DOCSETS;
const dsFmt = (iso) => { if (!iso) return ''; const d = new Date(iso); if (isNaN(d)) return ''; return d.toLocaleString('es-PE', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); };
const dsHM = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' }); };
const dsLocalInput = (iso) => { if (!iso) return ''; const d = new Date(iso); if (isNaN(d)) return ''; const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
const dsDayLabel = (ymd) => { try { const d = window.JUCUM_DAY.parse(ymd); return d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { return ymd; } };
const dsMMSS = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)), m = Math.floor(s / 60); if (m >= 120) return Math.round(m / 60) + ' h'; return m + ':' + String(s % 60).padStart(2, '0'); };
const DS_TIMES = [5, 10, 15, 20, 30];
const dsTimeLabel = (ds) => ds.time === 'fin' ? 'hasta el final de la clase' : ds.time === 'mas' ? 'hasta ' + dsFmt(ds.until) : (ds.time || 10) + ' min';
const DS_KIND = { exact: { t: '⚙️ Nota exacta', bg: '#E8F5E9', c: '#2E7D32' }, rule: { t: '📏 Respuesta libre · nota por regla', bg: '#FFF8E1', c: '#8A5A00' }, manual: { t: '✍️ La revisas tú', bg: '#F2F0EA', c: '#555' } };
const DS_PUR = '#6A1B9A', DS_PURL = '#F3E5F5';
const dsChip = (txt, bg, c) => <span style={{ fontSize: 11, fontWeight: 900, borderRadius: 20, padding: '3px 9px', background: bg, color: c, whiteSpace: 'nowrap' }}>{txt}</span>;
const dsBtn = (on, col) => ({ border: '1.5px solid ' + (on ? col.b : 'var(--border)'), background: on ? col.bg : '#fff', color: on ? col.c : '#444', borderRadius: 11, padding: '7px 11px', fontWeight: 800, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', lineHeight: 1.25 });
const DS_CLS = { b: '#BA68C8', bg: DS_PURL, c: DS_PUR }, DS_HOME = { b: '#FFB74D', bg: '#FFF3E0', c: '#BF360C' }, DS_NO = { b: '#CFC9B8', bg: '#F2F0EA', c: '#555' };
function dsActive(s) { const st = String(s.status || '').toLowerCase(); if (['retirado', 'retirada', 'retired', 'inactivo', 'inactiva', 'inactive', 'baja', 'withdrawn'].includes(st)) return false; if (s.closedAt) return false; try { const G = window.JUCUM_GRAD; if (G && G.isGraduated && G.isGraduated(s.id)) return false; } catch (e) {} return true; }
const dsRoster = (gid) => (window.JUCUM_DATA.STUDENTS || []).filter(s => s.group === gid && dsActive(s));
function dsPlanEnd(plan) { try { const d = window.JUCUM_DAY.parse(plan.date); const [h, m] = String(plan.startTime || '18:00').split(':').map(Number); d.setHours(h, m || 0, 0, 0); return new Date(d.getTime() + (plan.lengthMin || 60) * 60000); } catch (e) { return new Date(Date.now() + 3600000); } }

/* ═══════════ 1 · REVISIÓN DE LOS SETS (teacher) ═══════════ */
function DocSetReview({ doc, groupId, fileName, onClose, onDone }) {
  const D = window.JUCUM_DATA, TT = window.JUCUM_TT, PI = window.JUCUM_PLANIMPORT, X = DSX();
  const group = (D.GROUPS || []).find(g => g.id === groupId) || {};
  const today = window.JUCUM_DAY.today();
  const plans = (TT && TT.getClassPlans ? TT.getClassPlans() : []).filter(p => p.groupId === groupId && p.date >= today).sort((a, b) => (a.date + (a.startTime || '')).localeCompare(b.date + (b.startTime || ''))).slice(0, 6);
  const gm = (PI && PI.groupMeta ? PI.groupMeta(groupId) : null) || { next: [], start: '' };
  const nextDay = plans[0] ? plans[0].date : ((gm.next || []).find(d => d >= today) || today);
  const nextHome = (() => { const d = (gm.next || []).find(x => x > today) || nextDay; return d + 'T' + (gm.start || '23:59'); })();
  const [sets, setSets] = dsUS(() => JSON.parse(JSON.stringify(doc.sets)));
  const [cfg, setCfg] = dsUS(() => { const o = {}; doc.sets.forEach(s => { o[s.id] = { dest: doc.suggest === 'split' ? (s.practice === 1 ? 'cls' : 'home') : '', day: nextDay, time: 10, until: dsLocalInput(new Date(Date.now() + 2 * 86400000).toISOString()), due: nextHome }; }); return o; });
  const [open, setOpen] = dsUS({});
  const [busy, setBusy] = dsUS(false); const [err, setErr] = dsUS(''); const [tvBusy, setTvBusy] = dsUS(false);
  const fileRef = dsUR(null);
  const setC = (id, p) => setCfg(c => ({ ...c, [id]: { ...c[id], ...p } }));
  const setItem = (si, ii, p) => setSets(ss => ss.map((s, k) => k !== si ? s : { ...s, items: s.items.map((x, j) => j !== ii ? x : { ...x, ...p }) }));
  const addTeacher = async (f) => {
    if (!f) return; setTvBusy(true); setErr('');
    try { const r = await PI.readFile(f); const t = X.detect(PI.jLines(r)); if (!t.sets.length) throw new Error('No encontré los mismos “Step …” en ese archivo.'); setSets(ss => X.merge({ sets: JSON.parse(JSON.stringify(ss)) }, t).sets); }
    catch (e) { setErr(e && e.message ? e.message : 'No pude leer la versión del teacher.'); }
    setTvBusy(false);
  };
  const chosen = sets.filter(s => cfg[s.id].dest === 'cls' || cfg[s.id].dest === 'home');
  const amber = chosen.filter(s => s.grade === 'exact' && s.items.some(x => x.src !== 'teacher' && x.src !== 'ok')).length;
  const missingKey = chosen.filter(s => s.grade === 'exact' && s.items.some(x => !String(x.key || '').trim()));
  const publish = async () => {
    if (missingKey.length) { setErr('Falta la respuesta de algún ejercicio en: ' + missingKey.map(s => 'Step ' + s.step).join(', ') + '. Ábrelo en 👁 y escríbela.'); return; }
    setBusy(true); setErr(''); let ok = 0, fail = 0;
    for (const s of chosen) {
      const c = cfg[s.id]; const mode = c.dest === 'cls' ? 'class' : 'home';
      const ds = { v: 1, step: s.step, title: s.title, part: s.part, kind: s.kind, grade: s.grade, en: s.en, es: s.es, ex: s.ex, file: fileName || '', docTitle: doc.title || '',
        items: s.items.map(x => ({ q: x.q, cue: x.cue, ces: x.ces || X.cueEs(x.cue), key: String(x.key || '').trim(), also: (x.also || []).filter(Boolean), tr: x.tr || '' })), mode, live: {} };
      if (mode === 'class') { ds.planDate = c.day; ds.time = c.time; if (c.time === 'mas') ds.until = new Date(c.until).toISOString(); }
      else ds.dueAt = new Date(c.due).toISOString();
      try { const r = await window.JUCUM_TASKS.createAssignment({ groupId, targetStudentIds: [], title: 'Step ' + s.step + ': ' + s.title + (s.part ? ' · Practice ' + s.part : ''), description: X.describe(ds), dueAt: mode === 'home' ? ds.dueAt : null, gradable: true, xp: 40, attachments: [] }); (r && r.synced === false) ? fail++ : ok++; }
      catch (e) { fail++; }
    }
    setBusy(false);
    if (fail) { setErr(`Se guardaron ${ok}. ${fail} quedaron solo en este equipo (sin internet): se reintentan solas al abrir Tareas.`); return; }
    onDone(ok);
  };
  return (
    <div className="modal-backdrop" onClick={busy ? undefined : onClose}>
      <div className="modal settings-modal" style={{ maxWidth: 760 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head"><div className="modal-title">✍️ Sets de práctica de tu documento</div><button className="modal-close" onClick={onClose} disabled={busy}>✕</button></div>
        <div className="modal-body">
          <div style={{ flexShrink: 0, background: '#F6F8FD', border: '1px solid #DCE4F7', borderRadius: 14, padding: '11px 13px', marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 26 }}>📄</span>
            <div style={{ flex: 1, minWidth: 200 }}><div style={{ fontWeight: 900, fontSize: 15 }}>{doc.title || fileName}</div><div style={{ fontSize: 12, fontWeight: 700, color: '#5A6A90' }}>{sets.length} set{sets.length === 1 ? '' : 's'} · {sets.reduce((n, s) => n + s.items.length, 0)} ejercicios · {group.name || 'grupo'}</div></div>
            <button className="att-btn" disabled={tvBusy} onClick={() => fileRef.current && fileRef.current.click()}>{tvBusy ? 'Leyendo…' : '＋ Versión del teacher (Answer / Also)'}</button>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" style={{ display: 'none' }} onChange={e => { addTeacher(e.target.files[0]); e.target.value = ''; }} />
          </div>
          {err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}
          <div style={{ flexShrink: 0, background: '#EEF2FC', border: '1px solid #C9D4F0', borderRadius: 11, padding: '9px 12px', fontSize: 12.8, fontWeight: 700, color: '#1F3A8A', lineHeight: 1.5, marginBottom: 12 }}>
            {doc.suggest === 'split' ? <>📌 Tu documento dice <i>“{doc.intro}”</i>: te marqué la práctica 1 <b>en clase</b> y la 2 <b>para casa</b>. Cámbialo con un toque.</> : <>📌 {doc.intro ? <>Tu documento dice <i>“{doc.intro}”</i>: </> : null}<b>elige tú</b> qué hacer con cada set.</>}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10, fontSize: 12, fontWeight: 800, color: 'var(--text-soft)' }}>Atajo:
            <button className="preset" onClick={() => setCfg(c => { const o = { ...c }; sets.forEach(s => o[s.id] = { ...o[s.id], dest: 'cls' }); return o; })}>🏫 Todo en clase</button>
            <button className="preset" onClick={() => setCfg(c => { const o = { ...c }; sets.forEach(s => o[s.id] = { ...o[s.id], dest: 'home' }); return o; })}>🏠 Todo para casa</button>
          </div>
          {sets.map((s, si) => { const c = cfg[s.id], k = DS_KIND[s.grade], op = open[s.id], am = s.grade === 'exact' && s.items.some(x => x.src !== 'teacher' && x.src !== 'ok');
            return (
              <div key={s.id} style={{ border: '1.5px solid ' + (c.dest === 'cls' ? '#CE93D8' : c.dest === 'home' ? '#FFB74D' : 'var(--border)'), borderRadius: 16, marginBottom: 10, overflow: 'hidden', background: '#fff', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', padding: '12px 13px' }}>
                  <span style={{ flex: 'none', width: 34, height: 34, borderRadius: 10, background: '#EEF2FC', color: '#1F3A8A', fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.step}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: 15 }}>Step {s.step}: {s.title}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-soft)', lineHeight: 1.45 }}>{s.en}{s.es ? <> · <i>{s.es}</i></> : null}</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>{dsChip(s.items.length + ' ejercicios', '#F2F0EA', '#555')}{dsChip(k.t, k.bg, k.c)}{s.part && dsChip('Practice ' + s.part, '#F2F0EA', '#555')}{s.grade === 'exact' && (am ? dsChip('🟨 respuestas propuestas', '#FFF8E1', '#8A5A00') : dsChip('✓ respuestas listas', '#E8F5E9', '#2E7D32'))}</div>
                  </div>
                  <button className="att-btn" onClick={() => setOpen(o => ({ ...o, [s.id]: !o[s.id] }))}>{op ? '▲ Ocultar' : '👁 Ver y revisar'}</button>
                </div>
                {op && (
                  <div style={{ padding: '4px 13px 12px', borderTop: '1px solid var(--border-soft,#F0EDE4)' }}>
                    {s.ex[0] && <div style={{ background: '#F6F8FC', borderRadius: 10, padding: '8px 11px', margin: '8px 0', fontSize: 12.5, fontWeight: 700, color: '#33456E' }}><b>Ejemplo:</b> {s.ex[0]} → <i>{s.ex[1]}</i></div>}
                    {s.items.map((x, ii) => (
                      <div key={ii} style={{ display: 'grid', gridTemplateColumns: '22px minmax(0,1fr)', gap: 8, padding: '7px 0', borderBottom: '1px dashed #F0EDE4' }}>
                        <span style={{ fontWeight: 900, color: '#1F3A8A', fontSize: 13 }}>{ii + 1}.</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ fontSize: 13, fontWeight: 800 }}>{x.q} {x.cue && dsChip(x.cue, '#EDE7F6', '#4527A0')}</div>
                          <label style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', fontSize: 11, fontWeight: 800, color: 'var(--text-soft)' }}>🌐 Traducción
                            <input className="input-text" style={{ flex: 1, minWidth: 180, padding: '5px 8px', fontSize: 12.5 }} value={x.tr || ''} placeholder="(opcional) cómo se dice en español" onChange={e => setItem(si, ii, { tr: e.target.value })} /></label>
                          {s.grade !== 'manual' && <label style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', fontSize: 11, fontWeight: 800, color: 'var(--text-soft)' }}>{s.grade === 'exact' ? 'Answer' : 'Ejemplo (opcional)'}
                            <input className="input-text" style={{ flex: 1, minWidth: 180, padding: '5px 8px', fontSize: 12.5, background: s.grade === 'exact' && x.src !== 'teacher' && x.src !== 'ok' ? '#FFF8E1' : '#F7FBF7', borderColor: s.grade === 'exact' && !String(x.key || '').trim() ? '#E57373' : undefined }} value={x.key || ''} onChange={e => setItem(si, ii, { key: e.target.value, src: 'ok' })} /></label>}
                          {s.grade === 'exact' && <label style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', fontSize: 11, fontWeight: 800, color: 'var(--text-soft)' }}>También vale
                            <input className="input-text" style={{ flex: 1, minWidth: 180, padding: '5px 8px', fontSize: 12.5 }} value={(x.also || []).join(' | ')} placeholder="otras formas correctas, separadas con |" onChange={e => setItem(si, ii, { also: e.target.value.split('|').map(t => t.trim()).filter(Boolean) })} /></label>}
                        </div>
                      </div>))}
                    {s.grade === 'exact' && am && <button className="att-btn" style={{ marginTop: 8, borderColor: '#81C784', color: '#2E7D32' }} onClick={() => setSets(ss => ss.map((z, k2) => k2 !== si ? z : { ...z, items: z.items.map(y => ({ ...y, src: y.src === 'teacher' ? 'teacher' : 'ok' })) }))}>✓ Confirmar las {s.items.length} respuestas</button>}
                    {s.grade === 'rule' && <div className="settings-hint" style={{ marginTop: 6 }}>Vale si conserva la oración y responde la pregunta (lugar / momento / manera). Lo dudoso te llega como “🟨 por revisar”; al alumno le decimos que <b>no es un error</b>.</div>}
                  </div>)}
                <div style={{ padding: '10px 13px 12px', borderTop: '1px solid #F0EDE4', background: '#FCFBF8' }}>
                  <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.05em', textTransform: 'uppercase', color: '#555', marginBottom: 6 }}>¿Dónde se hace este set? (elige uno)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 6 }}>
                    <button style={dsBtn(c.dest === 'no', DS_NO)} onClick={() => setC(s.id, { dest: 'no' })}>🚫 No asignar</button>
                    <button style={dsBtn(c.dest === 'cls', DS_CLS)} onClick={() => setC(s.id, { dest: 'cls' })}>🏫 En clase<div style={{ fontSize: 10.5, fontWeight: 700, opacity: .8 }}>en un día de tu plan</div></button>
                    <button style={dsBtn(c.dest === 'home', DS_HOME)} onClick={() => setC(s.id, { dest: 'home' })}>🏠 Para casa<div style={{ fontSize: 10.5, fontWeight: 700, opacity: .8 }}>con fecha de entrega</div></button>
                  </div>
                  {c.dest === 'cls' && <>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 9, alignItems: 'center' }}><span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-soft)' }}>En la clase del:</span>
                      {plans.map(p => <button key={p.id || p.date} style={dsBtn(c.day === p.date, DS_CLS)} onClick={() => setC(s.id, { day: p.date })}>{dsDayLabel(p.date)}<div style={{ fontSize: 10.5, fontWeight: 700, opacity: .8 }}>{p.startTime || ''} · {p.sessionLabel || p.moduleName || 'plan'}</div></button>)}
                      <input type="date" className="input-text" style={{ padding: '6px 8px', fontSize: 12.5, width: 'auto' }} value={c.day} onChange={e => setC(s.id, { day: e.target.value })} title="Otro día" /></div>
                    {!plans.some(p => p.date === c.day) && <div className="settings-hint" style={{ marginTop: 4 }}>Ese día aún no tiene plan de clase: la actividad igual te espera en el ▶ Modo clase cuando lo crees.</div>}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}><span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-soft)' }}>⏱ Tiempo:</span>
                      {DS_TIMES.map(t => <button key={t} style={dsBtn(c.time === t, DS_CLS)} onClick={() => setC(s.id, { time: t })}>{t} min</button>)}
                      <input type="number" min="1" max="180" className="input-text" style={{ width: 72, padding: '6px 8px', fontSize: 12.5 }} placeholder="min" value={typeof c.time === 'number' && !DS_TIMES.includes(c.time) ? c.time : ''} onChange={e => +e.target.value > 0 && setC(s.id, { time: +e.target.value })} />
                      <button style={dsBtn(c.time === 'fin', DS_CLS)} onClick={() => setC(s.id, { time: 'fin' })}>Hasta el final de la clase</button>
                      <button style={dsBtn(c.time === 'mas', DS_CLS)} onClick={() => setC(s.id, { time: 'mas' })}>Más allá de la clase…</button></div>
                    {c.time === 'mas' && <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}><span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-soft)' }}>Abierta hasta:</span><input type="datetime-local" className="input-text" style={{ width: 'auto', padding: '6px 8px' }} value={c.until} onChange={e => setC(s.id, { until: e.target.value })} /></div>}
                    <div className="settings-hint" style={{ marginTop: 6 }}>Puedes cambiar el tiempo después, incluso en plena clase (＋5 min, hasta una hora exacta o 🔒 cerrar ya).</div>
                  </>}
                  {c.dest === 'home' && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 9, alignItems: 'center' }}><span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-soft)' }}>Entrega hasta:</span>
                    <input type="datetime-local" className="input-text" style={{ width: 'auto', padding: '6px 8px' }} value={c.due} onChange={e => setC(s.id, { due: e.target.value })} />
                    <button className="preset" onClick={() => setC(s.id, { due: nextHome })}>Antes de la próxima clase</button></div>}
                </div>
              </div>); })}
          <div style={{ position: 'sticky', bottom: -1, flexShrink: 0, zIndex: 2, background: '#fff', borderTop: '1.5px solid var(--border)', padding: '11px 0 2px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220, fontSize: 12.5, fontWeight: 800, color: '#444', lineHeight: 1.55 }}>
              {chosen.length ? <>{sets.filter(s => cfg[s.id].dest === 'cls').length} 🏫 en clase · {sets.filter(s => cfg[s.id].dest === 'home').length} 🏠 para casa{amber ? <> · 🟨 al publicar se dan por buenas las respuestas propuestas</> : null}</> : 'Elige 🏫 o 🏠 en al menos un set.'}
              <div style={{ fontSize: 11.5, color: 'var(--text-soft)' }}>🏫 = participación de clase · 🏠 = cuenta como tarea cumplida.</div>
            </div>
            <button className="btn-cancel" onClick={onClose} disabled={busy}>Cancelar</button>
            <button className="btn-save" disabled={busy || !chosen.length} onClick={publish}>{busy ? 'Publicando…' : amber ? '✓ Confirmar respuestas y publicar' : '✓ Publicar'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════ 2 · TABLERO / RESULTADOS (teacher) ═══════════ */
function dsUseSubs(aid, ms) {
  const [rows, setRows] = dsUS(null); const [tick, setTick] = dsUS(0);
  dsUE(() => { let stop = false; const go = async () => { const r = await DSX().fetchSubs(aid); if (!stop && r) setRows(r); };
    go(); const id = ms ? setInterval(() => { if (document.visibilityState !== 'hidden') go(); }, ms) : null; return () => { stop = true; if (id) clearInterval(id); }; }, [aid, ms, tick]);
  return [rows, () => setTick(t => t + 1), setRows];
}
function dsRowsBy(rows) { const o = {}; (rows || []).forEach(r => { o[r.student_id] = r; }); return o; }
function DocSetBoard({ a, ds, onView }) {
  const X = DSX(); const [rows] = dsUseSubs(a.id, 8000); const by = dsRowsBy(rows); const roster = dsRoster(a.groupId); const n = ds.items.length;
  const info = roster.map(s => { const r = by[s.id], an = r ? X.unpack(r.text) : null, res = (an && an.res) || [], k = res.filter(Boolean).length, done = !!(r && r.status !== 'draft');
    const stuck = r && !done && k < n && (Date.now() - new Date(r.submitted_at).getTime()) > 3 * 60000; return { s, r, an, res, k, done, stuck, g: done ? r.grade : null, at: r ? new Date(r.submitted_at).getTime() : 0 }; });
  const sent = info.filter(x => x.done).sort((p, q) => p.at - q.at);
  const fails = ds.items.map((it, i) => info.filter(x => x.res[i] === 'bad').length); const mx = Math.max(0, ...fails), hard = fails.indexOf(mx);
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: DS_PUR, marginBottom: 6 }}>👆 Toca a un alumno para ver su actividad mientras la hace · {sent.length}/{roster.length} entregaron</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 7 }}>
        {info.map(x => (
          <button key={x.s.id} onClick={() => x.k ? onView(x.s.id) : null} title={x.k ? 'Ver su actividad' : 'Aún no responde'} style={{ textAlign: 'left', border: '1px solid ' + (x.stuck ? '#FFB74D' : 'var(--border)'), background: x.stuck ? '#FFF8E1' : x.done ? '#F5FBF5' : '#FAFAF6', borderRadius: 11, padding: '8px 10px', cursor: x.k ? 'pointer' : 'default', fontFamily: 'inherit', opacity: x.k || x.done ? 1 : .6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontWeight: 800, fontSize: 13 }}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.s.name}</span><span style={{ fontSize: 11, color: '#2E7D32' }}>{x.done ? (x.g != null ? x.g + '%' : '✓') : x.k ? x.k + '/' + n : ''}</span></div>
            <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>{ds.items.map((it, i) => { const v = x.res[i]; return <i key={i} style={{ flex: 1, height: 7, borderRadius: 4, background: v === 'ok' || v === 'okd' ? '#66BB6A' : v === 'rev' ? '#90CAF9' : v === 'bad' ? '#FFB74D' : '#E3E8F0' }}></i>; })}</div>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text-soft)', marginTop: 4 }}>{x.k ? '👁 ' : ''}{x.done ? 'Entregó · ' + (sent.indexOf(x) + 1) + '.º' : x.stuck ? '⚠ Trabado en el ' + (x.k + 1) + ' hace +3 min' : x.k ? 'Va en el ' + (x.k + 1) : 'No ha entrado'}</div>
          </button>))}
      </div>
      {mx > 0 && <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 700, color: '#555', background: '#F6F8FC', borderRadius: 10, padding: '8px 10px', lineHeight: 1.5 }}>📍 <b>Dónde se traban:</b> {hard + 1}. {ds.items[hard].q} ({ds.items[hard].cue}) · {mx} alumno{mx > 1 ? 's' : ''}.{ds.items[hard].key ? <> Respuesta: <i>{ds.items[hard].key}</i>.</> : null} Buen momento para explicarlo en la pizarra.</div>}
    </div>);
}
function DocSetStudentView({ a, ds, rows, who, onClose, onChanged }) {
  const X = DSX(), N = window.JUCUM_NOTIF; const by = dsRowsBy(rows); const roster = dsRoster(a.groupId).filter(s => by[s.id]);
  const [sid, setSid] = dsUS(who); const [cmt, setCmt] = dsUS(''); const [busy, setBusy] = dsUS(false);
  const idx = roster.findIndex(s => s.id === sid), s = roster[idx]; if (!s) return null;
  const row = by[s.id], an = X.unpack(row.text) || { ans: [], res: [], tr: [] }, res = an.res || [], live = ds.mode === 'class' && X.liveState(ds) === 'open';
  const g = X.score(ds, res), nr = X.nRev(res), ntr = (an.tr || []).filter(Boolean).length;
  const decide = async (i, ok) => { setBusy(true); await X.setItemResult(a, ds, s.id, row, i, ok ? 'ok' : 'bad'); if (N) N.pushNotif(s.id, { type: 'assignment', title: '✅ Tu profe revisó tu respuesta', body: `“${a.title}”, ejercicio ${i + 1}: ${ok ? 'está bien' : 'mira la respuesta correcta'}.`, link: 'tasks' }); setBusy(false); onChanged(); };
  const darBuena = async (i) => {
    const txt = (an.ans || [])[i]; if (!txt) return; setBusy(true);
    const upd = await X.patch(a, d => { d.items[i].also = (d.items[i].also || []).concat([txt]); });
    let c = 0; for (const r of rows || []) { const z = X.unpack(r.text); if (z && (z.res || [])[i] === 'bad' && X.norm((z.ans || [])[i]) === X.norm(txt)) { await X.setItemResult(a, ds, r.student_id, r, i, 'ok'); c++; if (N) N.pushNotif(r.student_id, { type: 'assignment', title: '✅ Tu profe aceptó tu respuesta', body: `“${a.title}”, ejercicio ${i + 1}.`, link: 'tasks' }); } }
    setBusy(false); alert(`✔ “${txt}” ahora es válida. Se aceptó para ${c} alumno${c === 1 ? '' : 's'}.`); onChanged(upd);
  };
  const FB = (v) => v === 'ok' ? ['#E8F5E9', '#1B5E20', '✔ Vio: ¡Correcto!'] : v === 'okd' ? ['#F1F8E9', '#33691E', '✔ Correcto · vale completo (aviso: mayúscula, tilde o signo final)'] : v === 'rev' ? ['#E3F2FD', '#0D47A1', '📝 Vio: “la revisa tu profe · no es un error”'] : v === 'bad' ? ['#FFF3E0', '#8A4B00', '✘ Vio: “Todavía no”'] : ['#F2F0EA', '#666', live ? '⏳ Aún no lo responde' : '⬜ En blanco'];
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" style={{ maxWidth: 640, background: '#F0F7FF' }} onClick={e => e.stopPropagation()}>
        <div className="modal-head" style={{ background: '#fff', gap: 8 }}>
          <button className="att-btn" disabled={idx <= 0} onClick={() => setSid(roster[idx - 1].id)}>◀</button>
          <div className="modal-title" style={{ flex: 1, textAlign: 'center' }}>👁 {s.name}{live && <span style={{ marginLeft: 6 }}>{dsChip('● en vivo', DS_PURL, DS_PUR)}</span>}</div>
          <button className="att-btn" disabled={idx >= roster.length - 1} onClick={() => setSid(roster[idx + 1].id)}>▶</button>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>{row.status === 'draft' ? dsChip(res.filter(Boolean).length + ' de ' + ds.items.length + ' respondidos', '#FFF3E0', '#E65100') : dsChip(g + '/100' + (nr ? ' provisional' : ''), '#E3F2FD', '#1565C0')}{nr > 0 && dsChip('🟨 ' + nr + ' por revisar', '#FFF8E1', '#8A5A00')}{dsChip(ds.mode === 'class' ? '🏫 En clase' : '🏠 Para casa', '#F2F0EA', '#555')}{ntr > 0 && dsChip('🌐 usó Traducir en ' + ntr, '#E3F2FD', '#0D47A1')}<span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-soft)' }}>{idx + 1} de {roster.length} · {a.title}</span></div>
          <div style={{ background: '#fff', borderRadius: 12, padding: '9px 12px', marginTop: 10, fontSize: 13.5, fontWeight: 800 }}>{ds.es || ds.en}<div style={{ fontSize: 12, fontWeight: 700, color: '#5A6A90', fontStyle: 'italic' }}>{ds.en}</div></div>
          {ds.items.map((it, i) => { const v = res[i], t = (an.ans || [])[i], f = FB(v); return (
            <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '11px 12px', marginTop: 10, border: '2px solid ' + (v === 'bad' ? '#FFB74D' : v === 'rev' ? '#90CAF9' : v ? '#A5D6A7' : '#E3E8F0') }}>
              <div style={{ display: 'flex', gap: 8, fontSize: 11, fontWeight: 900, color: '#0D47A1', textTransform: 'uppercase', letterSpacing: '.05em' }}>Ejercicio {i + 1} de {ds.items.length}{(an.tr || [])[i] && <span style={{ marginLeft: 'auto', textTransform: 'none' }}>🌐 usó Traducir</span>}</div>
              <div style={{ fontSize: 15, fontWeight: 800, margin: '5px 0' }}>{it.q} {it.cue && dsChip(it.cue, '#EDE7F6', '#4527A0')}</div>
              <div style={{ border: '2px solid #BBDEFB', borderRadius: 11, padding: '8px 10px', fontSize: 14.5, fontWeight: 700, background: '#F9FBFF', color: t ? '#1f2a44' : '#9A9484', fontStyle: t ? 'normal' : 'italic' }}>{t || 'en blanco'}</div>
              <div style={{ marginTop: 8, borderRadius: 10, padding: '7px 10px', fontSize: 12.5, fontWeight: 800, background: f[0], color: f[1] }}>{f[2]}{(v === 'bad' || (!v && !live)) && it.key ? <> · Respuesta: <u style={{ textDecoration: 'none', background: 'rgba(255,255,255,.7)', borderRadius: 6, padding: '1px 5px' }}>{it.key}</u></> : null}</div>
              {(v === 'rev' || v === 'bad') && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                {v === 'bad' && ds.grade === 'exact'
                  ? <button className="att-btn" disabled={busy} style={{ borderColor: '#81C784', color: '#2E7D32' }} onClick={() => darBuena(i)}>✔ Dar por buena (para todos)</button>
                  : <button className="att-btn" disabled={busy} style={{ borderColor: '#81C784', color: '#2E7D32' }} onClick={() => decide(i, true)}>✔ Está bien</button>}
                {v === 'rev' && <button className="att-btn" disabled={busy} style={{ borderColor: '#EF9A9A', color: '#C62828' }} onClick={() => decide(i, false)}>✘ Corregir</button>}
              </div>}
            </div>); })}
          <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
            <input className="input-text" style={{ flex: 1, minWidth: 200 }} value={cmt} onChange={e => setCmt(e.target.value)} placeholder={`Comentario para ${s.name.split(' ')[0]} (le llega a la campanita)…`} />
            <button className="btn-save" disabled={!cmt.trim()} onClick={() => { if (N) N.pushNotif(s.id, { type: 'assignment', title: '💬 Comentario de tu profe', body: `“${a.title}”: ${cmt.trim()}`, link: 'tasks' }); setCmt(''); alert('💬 Comentario enviado.'); }}>Enviar</button>
          </div>
        </div>
      </div>
    </div>);
}
function DocSetResults({ a: a0, compact }) {
  const X = DSX(); const [a, setA] = dsUS(a0); const ds = X.meta(a) || { items: [] };
  const [rows, refresh] = dsUseSubs(a.id, 0); const by = dsRowsBy(rows); const roster = dsRoster(a.groupId);
  const [view, setView] = dsUS(null); const [editDue, setEditDue] = dsUS(false); const [due, setDue] = dsUS(dsLocalInput(a.dueAt));
  const pend = roster.reduce((n, s) => { const z = by[s.id] && X.unpack(by[s.id].text); return n + X.nRev(z && z.res); }, 0);
  const saveDue = async () => { const iso = new Date(due).toISOString(); const u = await X.patch(a, d => { d.dueAt = iso; }); if (u) { setA(u); X.notifyGroup(a, '⏰ Tu profe cambió el plazo', `“${a.title}” · ahora hasta ${dsFmt(iso)}.`, 'tasks'); } setEditDue(false); };
  return (
    <div className={compact ? '' : 'scard'} style={compact ? { marginTop: 10 } : { marginTop: 14 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
        <div className="sec-title" style={{ flex: 1 }}>📊 Resultados · {a.title}</div>
        {ds.mode === 'class' ? dsChip('🏫 participación de clase', DS_PURL, DS_PUR) : dsChip('🏠 cuenta como tarea', '#FFF3E0', '#BF360C')}
        {pend > 0 && dsChip('🟨 ' + pend + ' por revisar', '#FFF8E1', '#8A5A00')}
        <button className="att-btn" onClick={refresh}>🔄</button>
      </div>
      {ds.mode === 'home' && <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10, fontSize: 12.5, fontWeight: 800, color: '#555' }}>⏰ Entrega hasta {dsFmt(a.dueAt) || 'sin fecha'}
        {editDue ? <><input type="datetime-local" className="input-text" style={{ width: 'auto', padding: '5px 8px' }} value={due} onChange={e => setDue(e.target.value)} /><button className="btn-save" onClick={saveDue}>Guardar</button><button className="btn-cancel" onClick={() => setEditDue(false)}>Cancelar</button></> : <button className="att-btn" onClick={() => setEditDue(true)}>✏️ Cambiar entrega</button>}</div>}
      {rows === null ? <div className="settings-hint">Cargando entregas…</div> : (
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {roster.map(s => { const r = by[s.id], z = r && X.unpack(r.text), res = (z && z.res) || [], k = res.filter(Boolean).length, nr = X.nRev(res), done = r && r.status !== 'draft';
            return (
              <div key={s.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '9px 12px', borderBottom: '1px solid #F0EDE4', flexWrap: 'wrap', background: '#fff' }}>
                <b style={{ flex: 1, minWidth: 120, fontSize: 13.5 }}>{s.name}</b>
                {!r ? dsChip(ds.mode === 'home' ? 'Aún no entrega' : 'No participó', '#FFF3E0', '#E65100') : <>
                  {k < ds.items.length && dsChip((done ? 'no terminó · ' : 'en curso · ') + k + ' de ' + ds.items.length, '#FFF3E0', '#E65100')}
                  {nr > 0 && dsChip('🟨 ' + nr + ' por revisar', '#FFF8E1', '#8A5A00')}
                  {done && dsChip(X.score(ds, res) + '/100' + (nr ? ' provisional' : ''), '#E3F2FD', '#1565C0')}
                  <button className="att-btn" onClick={() => setView(s.id)}>👁 Ver su actividad</button></>}
              </div>); })}
        </div>)}
      {view && <DocSetStudentView a={a} ds={ds} rows={rows} who={view} onClose={() => setView(null)} onChanged={(u) => { if (u) setA(u); refresh(); }} />}
    </div>);
}

/* ═══════════ 3 · EN EL MODO CLASE (teacher) ═══════════ */
function DocSetClassPanel({ plan }) {
  const X = DSX(), T = window.JUCUM_TASKS; const [tick, setTick] = dsUS(0); const [now, setNow] = dsUS(Date.now());
  const [show, setShow] = dsUS({}); const [edit, setEdit] = dsUS(null); const [view, setView] = dsUS(null); const [busy, setBusy] = dsUS('');
  const closing = dsUR({});
  dsUE(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  dsUE(() => { if (!X || !T || !plan) return; T.getAssignments().forEach(a => { if (a.groupId !== plan.groupId || !X.isClass(a)) return; const d = X.meta(a); if (d.planDate === plan.date && X.liveState(d, now) === 'closed' && d.live && !d.live.closedAt && !closing.current[a.id]) closeNow(a); }); }, [now]);
  if (!X || !T || !plan) return null;
  const list = T.getAssignments().filter(a => a.groupId === plan.groupId && X.isClass(a) && X.meta(a).planDate === plan.date).sort((p, q) => String(X.meta(p).step).localeCompare(String(X.meta(q).step), undefined, { numeric: true }) || String(p.title).localeCompare(String(q.title)));
  if (!list.length) return null;
  const refresh = () => setTick(t => t + 1);
  const endFor = (ds) => ds.time === 'fin' ? dsPlanEnd(plan) : ds.time === 'mas' ? new Date(ds.until || Date.now() + 86400000) : new Date(Date.now() + (+ds.time || 10) * 60000);
  const openNow = async (a) => { setBusy(a.id); const ds0 = X.meta(a); const end = endFor(ds0).toISOString(); await X.patch(a, d => { d.live = { openedAt: new Date().toISOString(), endAt: end }; });
    X.notifyGroup(a, '🏫 Tu profe abrió una actividad en clase', `“${a.title}” · se cierra a las ${dsHM(end)}. Ábrela en tu Inicio.`, 'dashboard'); setBusy(''); refresh(); };
  const setEnd = async (a, end) => { await X.patch(a, d => { d.live = { ...(d.live || {}), endAt: end.toISOString(), closedAt: null }; }); refresh(); };
  const closeNow = async (a) => { if (closing.current[a.id]) return; closing.current[a.id] = 1; setBusy(a.id); const ds0 = X.meta(a);
    await X.patch(a, d => { d.live = { ...(d.live || {}), closedAt: new Date().toISOString() }; }); await X.closeDrafts(a, ds0); setBusy(''); setShow(s => ({ ...s, [a.id]: 'res' })); refresh(); };
  const saveTime = async (a, p) => { await X.patch(a, d => Object.assign(d, p)); setEdit(null); refresh(); };
  return (
    <div className="scard" style={{ marginBottom: 16, borderColor: '#CE93D8' }}>
      <div className="sec-head"><div className="sec-title">✍️ Actividades de tu documento para esta clase</div><span className="sec-meta">los alumnos solo las ven cuando tocas ▶ Abrir ahora</span></div>
      {list.map(a0 => { const a = T.getAssignments().find(x => x.id === a0.id) || a0; const ds = X.meta(a); const st = X.liveState(ds, now); const left = ds.live && ds.live.endAt ? new Date(ds.live.endAt).getTime() - now : 0;
        return (
          <div key={a.id} style={{ border: '1.5px solid ' + (st === 'open' ? '#BA68C8' : 'var(--border)'), borderRadius: 14, padding: '11px 13px', marginTop: 10, background: st === 'open' ? '#FCF7FD' : st === 'closed' ? '#F7FBF7' : '#fff' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 20 }}>✍️</span>
              <div style={{ flex: 1, minWidth: 180 }}><b style={{ fontSize: 14 }}>{a.title}</b><div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-soft)' }}>{ds.items.length} ejercicios · ⏱ {dsTimeLabel(ds)} · {DS_KIND[ds.grade].t}</div></div>
              {st === 'waiting' && <><button className="att-btn" onClick={() => setEdit(edit === a.id ? null : a.id)}>✏️ Tiempo</button><button className="btn-save" disabled={busy === a.id} onClick={() => openNow(a)}>▶ Abrir ahora</button></>}
              {st === 'open' && <>{dsChip('● En vivo', DS_PURL, DS_PUR)}<span style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 20, fontWeight: 600, color: DS_PUR }}>{dsMMSS(left)}</span></>}
              {st === 'closed' && <>{dsChip('✓ Cerrada', '#E8F5E9', '#2E7D32')}<button className="att-btn" onClick={() => setShow(s => ({ ...s, [a.id]: s[a.id] === 'res' ? null : 'res' }))}>📊 Resultados</button></>}
            </div>
            {edit === a.id && st === 'waiting' && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 9, alignItems: 'center' }}>
              {DS_TIMES.map(t => <button key={t} style={dsBtn(ds.time === t, DS_CLS)} onClick={() => saveTime(a, { time: t })}>{t} min</button>)}
              <input type="number" min="1" max="180" className="input-text" style={{ width: 72, padding: '6px 8px' }} placeholder="min" onKeyDown={e => { if (e.key === 'Enter' && +e.target.value > 0) saveTime(a, { time: +e.target.value }); }} onBlur={e => +e.target.value > 0 && saveTime(a, { time: +e.target.value })} />
              <button style={dsBtn(ds.time === 'fin', DS_CLS)} onClick={() => saveTime(a, { time: 'fin' })}>Hasta el final de la clase</button>
              <input type="datetime-local" className="input-text" style={{ width: 'auto', padding: '6px 8px' }} title="Más allá de la clase: hasta…" onChange={e => e.target.value && saveTime(a, { time: 'mas', until: new Date(e.target.value).toISOString() })} /></div>}
            {st === 'open' && <>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: '#4A148C', marginTop: 8 }}>Se cierra a las {dsHM(ds.live.endAt)}{left > 86400000 ? ' · ' + dsFmt(ds.live.endAt) : ''}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
                <button className="att-btn" onClick={() => setEnd(a, new Date(new Date(ds.live.endAt).getTime() + 5 * 60000))}>＋5 min</button>
                <button className="att-btn" onClick={() => setEnd(a, new Date(new Date(ds.live.endAt).getTime() + 10 * 60000))}>＋10 min</button>
                <button className="att-btn" onClick={() => setEnd(a, new Date(Math.max(dsPlanEnd(plan).getTime(), Date.now() + 60000)))}>Hasta el final de la clase</button>
                <input type="time" className="input-text" style={{ width: 'auto', padding: '5px 8px' }} title="Cerrar a esta hora" onChange={e => { const [h, m] = e.target.value.split(':').map(Number); const d = new Date(); d.setHours(h, m, 0, 0); if (d.getTime() > Date.now()) setEnd(a, d); }} />
                <button className="btn-save" style={{ background: 'linear-gradient(135deg,#E11930,#B71C1C)' }} disabled={busy === a.id} onClick={() => { if (confirm('¿Cerrar ya la actividad? Lo que no respondieron queda en blanco.')) closeNow(a); }}>🔒 Cerrar ya</button>
              </div>
              <DocSetBoard a={a} ds={ds} onView={sid => setView({ a, sid })} />
            </>}
            {st === 'closed' && show[a.id] === 'res' && <DocSetResults a={a} compact />}
          </div>); })}
      {view && <DocSetViewLoader a={view.a} sid={view.sid} onClose={() => setView(null)} />}
    </div>);
}
function DocSetViewLoader({ a, sid, onClose }) { const [rows, refresh] = dsUseSubs(a.id, 8000); if (!rows) return null; return <DocSetStudentView a={a} ds={DSX().meta(a)} rows={rows} who={sid} onClose={onClose} onChanged={refresh} />; }

/* ═══════════ 4 · ALUMNO ═══════════ */
const DS_DRAFT_KEY = 'jucum_docset_draft_v1';
function dsDraftGet(aid) { try { const o = JSON.parse(localStorage.getItem(DS_DRAFT_KEY) || '{}'); return o[aid] || null; } catch (e) { return null; } }
function dsDraftSet(aid, v) { try { const o = JSON.parse(localStorage.getItem(DS_DRAFT_KEY) || '{}'); const lim = Date.now() - 14 * 86400000; Object.keys(o).forEach(k => { if (!o[k] || (o[k]._t || 0) < lim) delete o[k]; }); if (v) o[aid] = { ...v, _t: Date.now() }; else delete o[aid]; if (window.JUCUM_STORE) window.JUCUM_STORE.setJSON(DS_DRAFT_KEY, o); else localStorage.setItem(DS_DRAFT_KEY, JSON.stringify(o)); } catch (e) {} }
function DocSetPlayer({ a: a0, student, onClose }) {
  const X = DSX(), T = window.JUCUM_TASKS; const [a, setA] = dsUS(a0); const ds = X.meta(a); const n = ds.items.length;
  const sub = T.getSubmission(a.id, student.id); const final0 = sub && X.unpack(sub.text);
  const [st, setSt] = dsUS(() => final0 || dsDraftGet(a.id) || { ans: [], res: [], tr: [], fb: [], startedAt: new Date().toISOString() });
  const [i, setI] = dsUS(() => Math.min((st.res || []).filter(Boolean).length, n - 1)); const [txt, setTxt] = dsUS(''); const [showTr, setShowTr] = dsUS(false);
  const [now, setNow] = dsUS(Date.now()); const [saving, setSaving] = dsUS(false); const [closedMsg, setClosedMsg] = dsUS(false);
  const done = !!st.done; const cls = ds.mode === 'class'; const left = cls && ds.live && ds.live.endAt ? new Date(ds.live.endAt).getTime() - now : 0;
  dsUE(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  dsUE(() => { if (!cls || done) return; let stop = false; const poll = async () => { const L = await X.fetchGroupTasks(a.groupId); const r = L && L.find(x => x.id === a.id); if (!stop && r) setA(p => ({ ...p, description: r.description })); };
    const id = setInterval(poll, 10000); return () => { stop = true; clearInterval(id); }; }, [cls, done]);
  const finish = async (s2) => { setSaving(true); const z = { ...s2 }; try { await X.finalize(a, ds, student.id, z); } catch (e) {} dsDraftSet(a.id, null); setSt({ ...z, done: true }); setSaving(false); };
  dsUE(() => { if (cls && !done && X.liveState(ds, now) === 'closed' && !closedMsg) { setClosedMsg(true); finish(st); } }, [now, a]);
  const it = ds.items[i], r = (st.res || [])[i];
  const check = () => { const g = X.grade(ds, i, txt); if (g.r === 'blank') return; const s2 = { ...st, ans: [...(st.ans || [])], res: [...(st.res || [])], tr: [...(st.tr || [])], fb: [...(st.fb || [])] };
    s2.ans[i] = txt; s2.res[i] = g.r; s2.tr[i] = !!showTr; s2.fb[i] = g.d || g.h || ''; setSt(s2); dsDraftSet(a.id, s2); X.saveDraft(a.id, student.id, s2); };
  const next = () => { setTxt(''); if (i < n - 1) setI(i + 1); else finish(st); };
  const g = X.score(ds, st.res || []), nr = X.nRev(st.res);
  const head = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <button className="back-btn" style={{ margin: 0 }} onClick={onClose}>← Salir</button>
      <span style={{ marginLeft: 'auto' }}>{cls ? dsChip('🏫 En clase' + (!done && left > 0 ? ' · ' + dsMMSS(left) : ''), DS_PURL, DS_PUR) : dsChip('🏠 Tarea' + (a.dueAt ? ' · hasta ' + dsFmt(a.dueAt) : ''), '#FFF3E0', '#BF360C')}</span>
    </div>);
  const box = { position: 'fixed', inset: 0, zIndex: 1200, background: 'var(--bg-tint,#F0F7FF)', overflowY: 'auto' };
  const inner = { maxWidth: 620, margin: '0 auto', padding: '16px 14px 40px' };
  if (done) return (
    <div style={box}><div style={inner}>{head}
      <div style={{ background: '#fff', borderRadius: 18, padding: '18px 14px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ fontSize: 40 }}>{g >= 80 ? '🎉' : '💪'}</div>
        <div style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: 22, color: '#2E7D32' }}>{closedMsg ? '🔒 Tu profe cerró la actividad' : '¡Entregada!'}</div>
        <div style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: 30, color: '#1B5E20' }}>{(sub && typeof sub.grade === 'number' ? sub.grade : g)}/100</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#555', lineHeight: 1.5 }}>{nr ? <span style={{ display: 'inline-block', background: '#E3F2FD', color: '#0D47A1', borderRadius: 9, padding: '4px 9px' }}>📝 Nota provisional · {nr} respuesta{nr > 1 ? 's' : ''} la revisa tu profe a mano (no es un error)</span> : '✔ Nota registrada al instante'}<br />{cls ? 'Cuenta como participación de clase.' : 'Cuenta como tarea cumplida.'}</div>
        <div style={{ textAlign: 'left', margin: '12px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>{ds.items.map((x, k) => { const v = (st.res || [])[k]; return (
          <div key={k} style={{ fontSize: 13, fontWeight: 700, background: '#F6F8FC', borderRadius: 9, padding: '7px 9px', lineHeight: 1.45 }}>{v === 'bad' ? '❌' : !v ? '⬜' : v === 'rev' ? '📝' : '✅'} {(st.ans || [])[k] || <i style={{ color: '#9A9484' }}>en blanco</i>}
            {(v === 'bad' || !v) && x.key ? <div style={{ color: '#2E7D32' }}>→ {x.key}</div> : null}{v === 'rev' ? <div style={{ color: '#0D47A1' }}>La revisa tu profe · no es un error</div> : null}</div>); })}</div>
        <button className="btn-save" style={{ width: '100%' }} onClick={onClose}>Volver</button>
      </div></div></div>);
  return (
    <div style={box}><div style={inner}>{head}
      <div style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: 19, margin: '0 0 6px' }}>{a.title}</div>
      <div style={{ background: '#fff', borderRadius: 13, padding: '10px 12px', boxShadow: 'var(--shadow-sm)' }}><div style={{ fontSize: 14, fontWeight: 800 }}>{ds.es || ds.en}</div>{ds.es && <div style={{ fontSize: 12, fontWeight: 700, color: '#5A6A90', fontStyle: 'italic' }}>{ds.en}</div>}</div>
      {i === 0 && !r && ds.ex && ds.ex[0] && <div style={{ marginTop: 8, background: '#FFFDF4', border: '1px dashed #F0C66B', borderRadius: 12, padding: '9px 11px', fontSize: 12.5, fontWeight: 700, color: '#5A4A1A' }}><b style={{ fontSize: 10.5, letterSpacing: '.06em', textTransform: 'uppercase', color: '#8A5A00', display: 'block' }}>Ejemplo</b>{ds.ex[0]}<br />→ <i>{ds.ex[1]}</i></div>}
      {ds.grade !== 'exact' && i === 0 && !r && <div style={{ marginTop: 8, background: '#E3F2FD', color: '#0D47A1', borderRadius: 12, padding: '9px 11px', fontSize: 12.8, fontWeight: 800, lineHeight: 1.5 }}>💡 Aquí <b>no hay una sola respuesta correcta</b>: usa tu propia idea. Algunas respuestas las revisa tu profe a mano. Si ves “📝 la revisa tu profe”, <b>no te equivocaste</b>.</div>}
      <div style={{ display: 'flex', gap: 5, margin: '12px 0 8px' }}>{ds.items.map((x, k) => { const v = (st.res || [])[k]; return <i key={k} style={{ flex: 1, height: 8, borderRadius: 5, background: v === 'ok' || v === 'okd' ? '#66BB6A' : v === 'rev' ? '#90CAF9' : v === 'bad' ? '#FFB74D' : k === i ? '#2196F3' : '#E3E8F0' }}></i>; })}</div>
      <div style={{ background: '#fff', borderRadius: 16, padding: '13px 14px', boxShadow: 'var(--shadow-sm)', border: '2px solid #BBDEFB' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 900, color: '#0D47A1', letterSpacing: '.05em', textTransform: 'uppercase' }}>Ejercicio {i + 1} de {n} · 1 intento
          <button onClick={() => { if (!it.tr) { window.open(X.trUrl(it.q), '_blank'); setShowTr(true); return; } setShowTr(v => !v); }} style={{ marginLeft: 'auto', border: '1.5px solid ' + (showTr ? '#90CAF9' : 'var(--border)'), background: showTr ? '#E3F2FD' : '#fff', color: '#0D47A1', borderRadius: 20, padding: '6px 12px', fontWeight: 900, fontSize: 12, textTransform: 'none', letterSpacing: 0, cursor: 'pointer', fontFamily: 'inherit', minHeight: 36 }}>🌐 {showTr && it.tr ? 'Ocultar traducción' : 'Traducir'}</button></div>
        <div style={{ fontSize: 16.5, fontWeight: 800, lineHeight: 1.5, margin: '6px 0' }}>{it.q}</div>
        {showTr && it.tr && <div style={{ fontSize: 13.5, fontWeight: 700, color: '#5A6A90', fontStyle: 'italic', background: '#F3F8FF', borderRadius: 9, padding: '6px 9px', marginBottom: 6 }}>🇪🇸 {it.tr}</div>}
        {it.cue && <span style={{ display: 'inline-flex', gap: 6, fontSize: 13, fontWeight: 900, borderRadius: 20, padding: '5px 12px', background: '#EDE7F6', color: '#4527A0' }}>{it.cue}{it.ces ? <small style={{ fontWeight: 700, color: '#6A5A9A' }}>= {it.ces}</small> : null}</span>}
        <textarea value={r ? (st.ans || [])[i] : txt} readOnly={!!r} onChange={e => setTxt(e.target.value)} placeholder="Escribe tu oración en inglés…" style={{ width: '100%', marginTop: 10, border: '2px solid #BBDEFB', borderRadius: 12, padding: '10px 11px', fontSize: 15.5, fontWeight: 700, minHeight: 64, resize: 'none', background: r ? '#F6F6F2' : '#F9FBFF', fontFamily: 'inherit', boxSizing: 'border-box' }} />
        {r && <div style={{ marginTop: 10, borderRadius: 12, padding: '10px 12px', fontSize: 13, fontWeight: 800, lineHeight: 1.5, background: r === 'ok' ? '#E8F5E9' : r === 'okd' ? '#F1F8E9' : r === 'rev' ? '#E3F2FD' : '#FFF3E0', color: r === 'ok' ? '#1B5E20' : r === 'okd' ? '#33691E' : r === 'rev' ? '#0D47A1' : '#8A4B00' }}>
          {r === 'ok' ? '✔ ¡Correcto!' : r === 'okd' ? <>✔ Correcto · vale completo. Ojo: {(st.fb || [])[i] || 'mayúscula, tilde o signo final'}.</> : r === 'rev' ? <>📝 ¡Buena idea! Esta respuesta <b>la revisa tu profe a mano</b>. <b>No es un error.</b></> : <>✘ Todavía no.{(st.fb || [])[i] ? ' 💡 ' + st.fb[i] : ''}{it.key ? <><br />Respuesta: <u style={{ textDecoration: 'none', background: 'rgba(255,255,255,.7)', borderRadius: 6, padding: '1px 5px' }}>{it.key}</u></> : null}</>}</div>}
        <div style={{ marginTop: 10 }}>{r
          ? <button className="btn-save" style={{ width: '100%', minHeight: 48 }} disabled={saving} onClick={next}>{i === n - 1 ? (saving ? 'Entregando…' : '📨 Entregar') : 'Siguiente ▶'}</button>
          : <button className="btn-save" style={{ width: '100%', minHeight: 48 }} disabled={!txt.trim()} onClick={check}>✓ Comprobar</button>}</div>
      </div>
      <div style={{ marginTop: 12, fontSize: 12, fontWeight: 700, color: 'var(--text-soft)', textAlign: 'center', lineHeight: 1.5 }}>1 intento por ejercicio. Olvidar una tilde, el punto o la mayúscula <b>no te baja la nota</b>: solo te avisamos.</div>
    </div></div>);
}
function DocSetLiveBanner({ student }) {
  const X = DSX(); const [list, setList] = dsUS([]); const [open, setOpen] = dsUS(null); const [now, setNow] = dsUS(Date.now());
  dsUE(() => { if (!X || !student) return; let stop = false;
    const go = async () => { if (document.visibilityState === 'hidden') return; const L = await X.fetchGroupTasks(student.group); if (stop || !L) return; setList(L.filter(a => X.isClass(a) && X.liveState(X.meta(a)) === 'open')); };
    go(); const id = setInterval(go, 12000); const t = setInterval(() => setNow(Date.now()), 1000); return () => { stop = true; clearInterval(id); clearInterval(t); }; }, [student && student.id]);
  if (!list.length && !open) return null;
  return (<>
    {list.map(a => { const ds = X.meta(a); const sub = window.JUCUM_TASKS.getSubmission(a.id, student.id); const dr = dsDraftGet(a.id); const done = !!(sub || (dr && dr.done)); const left = new Date(ds.live.endAt).getTime() - now;
      return (
        <div key={a.id} style={{ background: 'linear-gradient(135deg,#6A1B9A,#9C4DCC)', color: '#fff', borderRadius: 18, padding: '14px 16px', margin: '0 0 12px', boxShadow: 'var(--shadow-md,0 6px 18px rgba(0,0,0,.15))' }}>
          <div style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', display: 'flex', gap: 6, alignItems: 'center' }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: '#FF5252', animation: 'cpPulse 1.3s infinite' }}></span>🏫 En clase ahora · en vivo</div>
          <div style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: 19, margin: '4px 0 2px' }}>{a.title}</div>
          <div style={{ fontSize: 12.5, fontWeight: 700, opacity: .95, marginBottom: done ? 0 : 10 }}>{done ? '✓ Ya la entregaste. ¡Bien hecho!' : <>Quedan <b>{dsMMSS(left)}</b> · se cierra a las {dsHM(ds.live.endAt)}</>}</div>
          {!done && <button onClick={() => setOpen(a)} style={{ display: 'block', width: '100%', border: 'none', borderRadius: 12, padding: 12, fontWeight: 900, fontSize: 14.5, background: '#fff', color: DS_PUR, minHeight: 48, cursor: 'pointer', fontFamily: 'inherit' }}>{dr && (dr.res || []).length ? '✍️ Seguir' : '▶ Empezar'}</button>}
        </div>); })}
    <style>{`@keyframes cpPulse{0%,100%{opacity:1}50%{opacity:.25}}`}</style>
    {open && <DocSetPlayer a={open} student={student} onClose={() => setOpen(null)} />}
  </>);
}
function DocSetTaskCard({ a, student, onChange }) {
  const X = DSX(), T = window.JUCUM_TASKS; const ds = X.meta(a); const [open, setOpen] = dsUS(false);
  const sub = T.getSubmission(a.id, student.id); const z = sub && X.unpack(sub.text); const dr = !sub && dsDraftGet(a.id); const k = ((dr && dr.res) || []).filter(Boolean).length;
  const late = a.dueAt && new Date(a.dueAt).getTime() < Date.now() && !sub; const nr = z ? X.nRev(z.res) : 0;
  return (
    <div className="scard" style={{ borderColor: sub ? '#C8E6C9' : late ? '#E6E2D8' : '#FFB74D', borderWidth: 2 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
        {sub ? dsChip('✓ Entregada · ' + (typeof sub.grade === 'number' ? sub.grade : X.score(ds, (z && z.res) || [])) + '/100' + (nr ? ' provisional' : ''), '#E8F5E9', '#2E7D32') : late ? dsChip('⏰ Cerró · ' + dsFmt(a.dueAt), '#FFEBEE', '#C62828') : dsChip('⏰ Entrega hasta ' + dsFmt(a.dueAt), '#FFF3E0', '#E65100')}
        {dsChip('✍️ ' + ds.items.length + ' ejercicios · +' + (a.xp || 40) + ' XP', '#F2F0EA', '#555')}
      </div>
      <div style={{ fontWeight: 900, fontSize: 15.5 }}>{a.title}</div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-soft)', margin: '3px 0 10px' }}>{ds.es || ds.en}{k ? ` · vas ${k}/${ds.items.length}` : ''}{nr ? ' · 📝 tu profe revisa ' + nr + ' respuesta' + (nr > 1 ? 's' : '') : ''}</div>
      {late ? <div className="settings-hint">Esta tarea ya cerró y no la entregaste. Si necesitas otra oportunidad, escríbele a tu profe.</div>
        : <button className="btn-save" style={{ width: '100%', minHeight: 46 }} onClick={() => setOpen(true)}>{sub ? 'Ver mis respuestas' : k ? '✍️ Seguir' : '▶ Empezar'}</button>}
      {open && <DocSetPlayer a={a} student={student} onClose={() => { setOpen(false); onChange && onChange(); }} />}
    </div>);
}

Object.assign(window, { DocSetReview, DocSetBoard, DocSetStudentView, DocSetResults, DocSetClassPanel, DocSetPlayer, DocSetLiveBanner, DocSetTaskCard });
