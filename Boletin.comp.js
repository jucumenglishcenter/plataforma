/* Bloque J5 · 📔 Boletín de notas del alumno (ETAPA 2 del nuevo orden)
 * Libreta viva por módulo con la puntuación aprobada:
 *   🔥 Práctica diaria 40% · 🧠 Dominio de temas 25% (adentro: prácticas 60 / examen 40)
 *   🎓 Examen 20% · 🙋 Participación 15% (de "Evaluar la clase", clicable por día)
 *   → 🏅 Nota final · 🎁 hasta +5 por seguir practicando, se entregan al FINAL del programa.
 * Práctica diaria = días practicados ÷ días que el módulo lleva abierto (fin = día del examen
 * si ya lo rindió; si el módulo no está activo, su última práctica). Sin registro de un
 * componente, su peso se reparte entre los presentes — nunca se castiga por falta de datos.
 * Cada título abre una ventana "cómo se obtiene / cómo mejorarla" (pedido de la usuaria). */

const boUS = React.useState, boUE = React.useEffect;
const BO_PESOS = { prac: 40, dom: 25, exam: 20, parti: 15 };
const BO_CRIT = { participation: '🙋 Participación en clase', speaking: '🗣️ Lectura en voz alta', attention: '👀 Atención', comprehension: '💡 Comprensión', topic: '📖 Tema', listening: '🎧 Listening', effort: '💪 Esfuerzo', pronunciation: '🔤 Pronunciación', homework: '📝 Tareas' };
function boCritLabel(k) {
  try { const c = (window.CRITERIA_ALL || []).find(x => x.key === k); if (c) return (c.icon ? c.icon + ' ' : '') + (c.label || k); } catch (e) {}
  return BO_CRIT[k] || ('🙋 ' + k);
}
function boPeruDay(t) { return new Date((typeof t === 'number' ? t : Date.parse(t)) - 5 * 3600000).toISOString().slice(0, 10); }
function boColor(n) { return n >= 85 ? '#2E7D32' : n >= 70 ? '#2EA84B' : n >= 60 ? '#E65100' : '#C62828'; }
function boFecha(d) { try { return new Date(d + 'T12:00:00Z').toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { return d; } }

/* Participaciones del alumno: una fila por criterio calificado, con su día (Perú) */
function boPartis(studentId) {
  const E = window.JUCUM_EVAL; if (!E) return [];
  const out = [];
  (E.getEvaluations(studentId) || []).forEach(ev => {
    const dia = ev.date ? boPeruDay(ev.date) : null; if (!dia) return;
    Object.entries(ev.ratings || {}).forEach(([crit, stars]) => {
      const s = Number(stars); if (!(s > 0)) return;
      out.push({ dia, crit, stars: s, pct: Math.max(0, Math.min(100, Math.round(s / 5 * 100))) });
    });
  });
  return out;
}

/* Todas las cuentas de UN módulo para UN alumno.
 * examAtt = mejor intento en la nube por módulo (diagnostic_attempts), puede ser null. */
function boModulo(student, mod, examAtt, partis) {
  const D = window.JUCUM_DATA;
  const completed = (D.getStudentProgress(student.id) || {}).completed || {};
  const settings = D.getGroupSettings(student.group) || {};
  const activos = (settings.activeModuleIds && settings.activeModuleIds.length) ? settings.activeModuleIds : (settings.activeModuleId ? [settings.activeModuleId] : []);
  const dias = new Set(); let last = null;
  Object.keys(completed).forEach(k => {
    if (k.indexOf(mod.id + ':') !== 0) return;
    const e = completed[k]; if (!e || !e.date) return;
    const d = boPeruDay(e.date); dias.add(d); if (!last || d > last) last = d;
  });
  const man = D.getModuleExamResult ? D.getModuleExamResult(student, mod.id) : null;
  const att = examAtt ? examAtt[mod.id] : null;
  const examNota = (man && typeof man.grade === 'number') ? (att && (att.score || 0) > man.grade ? att.score : man.grade) : (att ? att.score : null);
  const examDia = att ? boPeruDay(att.created_at) : (man && man.gradedAt ? boPeruDay(man.gradedAt) : null);
  let abierto = D.getModuleOpenedAt ? D.getModuleOpenedAt(student.group, mod.id) : null;
  /* 🚑 (06-ago) La fecha local de apertura puede faltar o ser reciente (se re-activó el módulo):
   * referencia firme = la PRIMERA práctica del GRUPO en el módulo (progress está en todos los equipos). */
  try {
    let firstG = null;
    (D.STUDENTS || []).filter(x => x.group === student.group).forEach(x => {
      const c2 = (D.getStudentProgress(x.id) || {}).completed || {};
      Object.keys(c2).forEach(k => { if (k.indexOf(mod.id + ':') !== 0) return; const e = c2[k]; if (e && e.date) { const d = boPeruDay(e.date); if (!firstG || d < firstG) firstG = d; } });
    });
    if (firstG && (!abierto || firstG < abierto)) abierto = firstG;
  } catch (e) {}
  if (!abierto && dias.size) abierto = Array.from(dias).sort()[0];
  const hoy = boPeruDay(Date.now());
  const activo = activos.includes(mod.id);
  const fin = examDia || (activo ? hoy : (last || hoy));
  /* el denominador jamás puede ser menor que los días practicados (nada de “5/1 d”) */
  const daysOpen = abierto ? Math.max(dias.size, 1, Math.round((Date.parse(fin) - Date.parse(abierto)) / 86400000) + 1) : (dias.size || null);
  const prac = daysOpen ? Math.min(100, Math.round(dias.size / daysOpen * 100)) : null;
  const stats = D.getModuleStats ? D.getModuleStats(student, mod) : { quality: 0, coverage: 0, done: 0, total: 0 };
  const pracDom = Math.round((stats.quality || 0) * (stats.coverage || 0) / 100);   // promedio de prácticas × cobertura
  const dom = (typeof examNota === 'number') ? Math.round(pracDom * 0.6 + examNota * 0.4) : ((dias.size || stats.done) ? pracDom : null);
  const evs = (partis || []).filter(p => abierto && p.dia >= abierto && p.dia <= fin);
  const parti = evs.length ? Math.round(evs.reduce((a, p) => a + p.pct, 0) / evs.length) : null;
  let acc = 0, wsum = 0;
  [['prac', prac], ['dom', dom], ['exam', typeof examNota === 'number' ? examNota : null], ['parti', parti]].forEach(([k, v]) => {
    if (typeof v === 'number') { acc += v * BO_PESOS[k]; wsum += BO_PESOS[k]; }
  });
  const final = wsum ? Math.round(acc / wsum) : null;
  const min = (window.JUCUM_EXAMFLOW && window.JUCUM_EXAMFLOW.minGradeFor) ? window.JUCUM_EXAMFLOW.minGradeFor(student.group) : 75;
  const rindio = typeof examNota === 'number';
  const empez = !!(abierto || dias.size || rindio);
  const estado = !empez ? 'lock' : rindio ? (examNota >= min ? 'ok' : 'rec') : 'curso';
  return { mod, diasPracticados: dias.size, daysOpen, prac, dom, pracDom, examNota, examDia, parti, evs, final, estado, activo, stats, min };
}

/* Mejor intento de examen en la nube por módulo (una sola consulta) */
async function boFetchExamAtts(student) {
  try {
    const SBW = window.JUCUM_SB, D = window.JUCUM_DATA, X = window.JUCUM_EXAMS;
    if (!SBW || !X) return {};
    const res = await SBW.getClient().from('diagnostic_attempts')
      .select('score,created_at,module_id,activity_id').eq('user_id', student.id)
      .order('created_at', { ascending: true }).limit(400);
    const rows = (res && res.data) || [];
    const out = {};
    (D.MODULE_CATALOG[student.level] || []).forEach(mod => {
      const exam = X.examForModule(mod.id, student.level);
      if (!exam || /^ex-m1forms-/.test(exam.id)) return;
      const slugs = (exam.parts || []).map(p => (((p.url || '').match(/\/(m\d+)\/examen/) || [])[1])).filter(Boolean);
      const mine = rows.filter(r => r.module_id === 'exam-' + exam.id || slugs.some(sl => r.activity_id === 'examen-' + sl));
      if (mine.length) out[mod.id] = mine.reduce((a, b) => ((b.score || 0) > (a.score || 0) ? b : a), mine[0]);
      else { /* 🚑 respaldo: nota del examen desde su registro de práctica */
        const comp = (D.getStudentProgress(student.id) || {}).completed || {};
        const ks = Object.keys(comp).filter(k => k.indexOf('exam-' + exam.id + ':') === 0);
        if (ks.length) { let sum = 0, n = 0, last = null; ks.forEach(k => { const e = comp[k] || {}; if (typeof e.score === 'number') { sum += e.score; n++; } if (e.date && (!last || e.date > last)) last = e.date; }); if (n) out[mod.id] = { score: Math.round(sum / n), created_at: last, fromProgress: true }; }
      }
    });
    return out;
  } catch (e) { return {}; }
}

const BO_EXPL = {
  prac: ['🔥 Práctica diaria', 'Días practicados ÷ días que el módulo lleva abierto. Así la nota es justa dure lo que dure el módulo: la barra crece contigo. ⭐ Es el área que MÁS pesa en tu nota final (40%).', 'Practica un poquito HOY: cada día practicado sube esta nota más que cualquier otra cosa. Para rendir examen además cuentan 10 de tus últimos 14 días.'],
  dom: ['🧠 Dominio de temas', 'Combina el promedio de tus prácticas con cuánto del módulo ya practicaste (eso vale 60%) y tu examen (40%). Mientras no rindas el examen, se muestra solo la parte de prácticas.', 'Repite las prácticas del tema más flojo — como pesan 60%, tu dominio sube rápido sin esperar al examen.'],
  parti: ['🙋 Participación', 'Sale de lo que tu profesora registra EN CLASE (Evaluar la clase y el tablero): ⭐ 100 · 👍 80 · 🙂 60 · 🤝 40 — tu promedio en %. Toca tu porcentaje para ver cada registro por día.', 'Participa en cada clase: lee en voz alta, responde, pregunta. Cada ⭐ vale 100.'],
  exam: ['🎓 Examen', 'La nota de tu examen del módulo, publicada apenas terminas. Si desapruebas, tu recuperación la reemplaza — siempre vale tu mejor nota.', 'Llega apto (75% + práctica de 10 de los últimos 14 días) y rinde tranquilo: el examen pesa 20% directo y 40% dentro del dominio.'],
  fin: ['🏅 Nota final', 'Se arma con: 🔥 práctica diaria 40% + 🧠 dominio de temas 25% + 🎓 examen 20% + 🙋 participación 15%. Más de la mitad de tu nota nace de practicar. Si aún no tienes registro en algo, su peso se reparte entre lo demás.', 'Practica un poco CADA día — es el camino más rápido a 100. Y si te faltan puntos: hasta 🎁 +5 al final del programa por seguir practicando.'],
};

function BoExpModal({ exp, partis, onClose }) {
  const E = BO_EXPL[exp];
  const dias = {};
  if (exp === 'parti') partis.forEach(p => { (dias[p.dia] = dias[p.dia] || []).push(p); });
  const [diaSel, setDiaSel] = boUS(null);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" style={{maxWidth:520}} onClick={e => e.stopPropagation()}>
        <div className="modal-head"><div className="modal-title">{E[0]}</div><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div style={{fontSize:13, lineHeight:1.65}}><b>¿Cómo se obtiene?</b> {E[1]}</div>
          <div style={{fontSize:13, lineHeight:1.65, marginTop:8}}><b>📈 Cómo mejorarla:</b> {E[2]}</div>
          {exp === 'parti' && (
            <div style={{marginTop:12}}>
              <div style={{fontSize:11.5, fontWeight:800, color:'#1F3A8A', marginBottom:5}}>Tus participaciones · promedio por día — toca un día</div>
              {Object.keys(dias).sort().reverse().map(d => {
                const items = dias[d];
                const prom = Math.round(items.reduce((a, p) => a + p.pct, 0) / items.length);
                const on = diaSel === d;
                return (
                  <div key={d}>
                    <button type="button" onClick={() => setDiaSel(on ? null : d)} style={{width:'100%', display:'flex', alignItems:'center', gap:8, border:'1px solid var(--border,#E8E5DC)', background:'#FBFAF5', borderRadius:9, padding:'7px 11px', marginTop:5, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:12.5}}>
                      <span style={{flex:1, textAlign:'left'}}>{boFecha(d)}</span>
                      <span style={{color:'#999', fontWeight:700, fontSize:11.5}}>{items.length} registro{items.length === 1 ? '' : 's'}</span>
                      <b style={{color:boColor(prom)}}>{prom}%</b>
                      <span style={{color:'#B0A99A', transform: on ? 'rotate(90deg)' : 'none', transition:'.2s'}}>›</span>
                    </button>
                    {on && items.map((p, i) => (
                      <div key={i} style={{display:'flex', alignItems:'center', gap:8, padding:'4px 11px', fontSize:12.5, fontWeight:700, flexWrap:'wrap'}}>
                        <span style={{flex:1}}>{boCritLabel(p.crit)}</span>
                        <span>{p.stars >= 5 ? '⭐ Excelente' : p.stars >= 4 ? '👍 Bien' : p.stars >= 3 ? '🙂 En proceso' : '🤝 Necesita apoyo'}</span>
                        <b style={{color:boColor(p.pct), width:38, textAlign:'right'}}>{p.pct}</b>
                      </div>
                    ))}
                  </div>
                );
              })}
              {!Object.keys(dias).length && <div className="settings-hint">Aún no tienes participaciones registradas — participa en tu próxima clase. 💪</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ❓ ¿Cómo llego a 100? — consejos personalizados del módulo en curso (o en recuperación) */
function boComo(student, fila) {
  const D = window.JUCUM_DATA;
  const out = [];
  if (!fila) return out;
  if (fila.prac == null || fila.prac < 90) out.push('🔥 Práctica diaria: llevas ' + fila.diasPracticados + ' de ' + (fila.daysOpen || '—') + ' días abiertos' + (typeof fila.prac === 'number' ? ' (' + fila.prac + ')' : '') + ' — practica HOY y cada día para acercarla a 100.');
  try {
    const imp = (D.getActivitiesToImprove ? D.getActivitiesToImprove(student) : []).filter(x => x.moduleId === fila.mod.id).slice(0, 2);
    if (imp.length) out.push('🧠 Dominio de temas: repite ' + imp.map(x => x.name + ' (' + x.pct + '%)').join(' y ') + ' — las prácticas pesan 60%.');
    else if ((fila.stats.coverage || 0) < 100) out.push('🧠 Dominio de temas: aún te faltan ' + Math.max(0, (fila.stats.total || 0) - (fila.stats.done || 0)) + ' actividades del módulo — cada una que apruebas sube tu dominio.');
  } catch (e) {}
  if (fila.examNota == null) out.push('🎓 Examen: llega apto (75% + práctica 10 de los últimos 14 días) y apunta alto — pesa 20% directo y 40% del dominio.');
  else if (fila.examNota < fila.min) out.push('🎓 Aprueba tu recuperación: tu nueva nota reemplaza al ' + fila.examNota + ' y levanta dominio y nota final.');
  if (fila.parti == null) out.push('🙋 Participación: aún sin registros en este módulo — participa en la próxima clase (⭐ vale 100).');
  else if (fila.parti < 90) out.push('🙋 Participación: vas en ' + fila.parti + '% — una ⭐ más en clase te acerca a 100.');
  if (!out.length) out.push('🌟 ¡Vas impecable! Mantén tu práctica diaria para sostener tu nota — y recuerda el 🎁 +5 del final del programa.');
  return out;
}

function StudentBoletin({ user, student: st0, onBack }) {
  const D = window.JUCUM_DATA;
  const student = st0 || (D.STUDENTS || []).find(s => s.id === (user || {}).studentId) || (D.STUDENTS || [])[0];
  const [exp, setExp] = boUS(null);
  const [atts, setAtts] = boUS(null);
  boUE(() => { let dead = false; boFetchExamAtts(student).then(r => { if (!dead) setAtts(r); }); return () => { dead = true; }; }, [student.id]);
  const mods = D.MODULE_CATALOG[student.level] || [];
  const partis = boPartis(student.id);
  const filas = mods.map(m => boModulo(student, m, atts || {}, partis));
  const enCurso = filas.filter(f => f.estado === 'curso' || f.estado === 'rec');
  const foco = enCurso.length ? enCurso[enCurso.length - 1] : filas.filter(f => f.estado !== 'lock').slice(-1)[0];
  const como = boComo(student, foco);
  const peso = (txt, hot) => <span style={{display:'inline-flex', alignItems:'center', gap:4, fontSize: hot ? 12 : 11, fontWeight:800, background: hot ? 'linear-gradient(135deg,#F9A825,#FF8F00)' : '#F0F0EA', color: hot ? '#fff' : '#6B6455', borderRadius:16, padding:'5px 12px', boxShadow: hot ? '0 2px 8px rgba(249,168,37,.35)' : 'none'}}>{txt}</span>;
  const th = (k, txt) => <th key={k} onClick={() => setExp(k)} title="Toca para ver cómo se calcula y cómo mejorarla" style={{fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'.03em', color:'#777', textAlign: k ? 'center' : 'left', padding:'6px 5px', borderBottom:'2px solid #FFECB3', cursor:'pointer'}}>{txt} ▾</th>;
  return (
    <main>
      <button className="back-btn" onClick={onBack}>← Volver al panel</button>
      <div className="welcome">
        <div className="welcome-text">
          <div className="eyebrow">📔 Boletín</div>
          <h1>Mi boletín de notas</h1>
          <p>Como tu libreta del colegio, pero viva: se actualiza con cada práctica. <b>Toca cada título</b> para ver cómo se calcula su nota.</p>
        </div>
      </div>
      <div className="scard" style={{marginTop:16}}>
        <div style={{display:'flex', gap:6, flexWrap:'wrap', alignItems:'center', marginBottom:6}}>
          {peso('🔥 Práctica diaria · 40%', true)}
          {peso('🧠 Dominio 25% (60% es práctica)')}
          {peso('🎓 Examen 20%')}
          {peso('🙋 Participación 15%')}
        </div>
        <div className="settings-hint" style={{margin:'0 0 12px'}}>⭐ <b>Practicar más = subir más:</b> más de la mitad de tu nota final nace de tu práctica de cada día.</div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead><tr>
              <th style={{fontSize:10, fontWeight:800, textTransform:'uppercase', color:'#777', textAlign:'left', padding:'6px 5px', borderBottom:'2px solid #FFECB3'}}>Módulo</th>
              {th('prac', '🔥 Práctica diaria')}{th('dom', '🧠 Dominio de temas')}{th('parti', '🙋 Participación')}{th('exam', '🎓 Examen')}{th('fin', '🏅 Nota final')}
            </tr></thead>
            <tbody>
              {filas.map(f => {
                const td = { padding:'9px 5px', borderBottom:'1px solid #F0EDE4', fontSize:12, fontWeight:700, textAlign:'center' };
                const finTxt = f.estado === 'lock' ? null : f.estado === 'curso' ? 'en curso' : (f.final != null ? String(f.final) : '—');
                const finBg = f.estado === 'ok' ? '#E8F5E9' : f.estado === 'rec' ? '#FFEBEE' : '#FFF8E1';
                const finC = f.estado === 'ok' ? '#2E7D32' : f.estado === 'rec' ? '#C62828' : '#8A5100';
                return (
                  <tr key={f.mod.id} style={{opacity: f.estado === 'lock' ? .45 : 1}}>
                    <td style={{...td, textAlign:'left', whiteSpace:'nowrap'}}>{f.mod.emoji} {f.mod.name}</td>
                    <td style={td}>{f.estado === 'lock' ? '—' : f.prac == null ? '—' : (
                      <span style={{display:'inline-flex', alignItems:'center', gap:5}}>
                        <span style={{width:40, height:8, background:'#E8E4DA', borderRadius:5, overflow:'hidden', position:'relative'}}><i style={{position:'absolute', inset:0, width:Math.min(100, f.prac) + '%', background:boColor(f.prac), borderRadius:5, display:'block'}}></i></span>
                        <span style={{whiteSpace:'nowrap'}}>{f.diasPracticados}/{f.daysOpen} d</span>
                        <span style={{background:boColor(f.prac), color:'#fff', borderRadius:12, padding:'2px 8px', fontSize:11, fontWeight:800}}>{f.prac}</span>
                      </span>)}</td>
                    <td style={td}>{f.dom == null ? (f.estado === 'lock' ? '—' : <span className="settings-hint" style={{margin:0}}>recién empieza</span>) : <b style={{color:boColor(f.dom)}}>{f.dom}%{f.examNota == null ? <span title="Aún sin examen: solo tus prácticas" style={{fontWeight:800, color:'#999'}}>*</span> : null}</b>}</td>
                    <td style={td}>{f.parti == null ? '—' : <button type="button" onClick={() => setExp('parti')} style={{fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:12, border:'1.5px solid #9FB2E8', background:'#E3E9F8', color:'#1F3A8A', borderRadius:14, padding:'3px 10px', cursor:'pointer'}}>{f.parti}% ▾</button>}</td>
                    <td style={td}>{f.examNota == null ? '—' : <b style={{color:boColor(f.examNota)}}>{f.examNota}{f.examNota < f.min ? ' · 🔁' : ''}</b>}</td>
                    <td style={td}>{finTxt == null ? '🔒' : <span style={{background:finBg, color:finC, borderRadius:14, padding:'3px 11px', fontSize:11.5, fontWeight:800, whiteSpace:'nowrap'}}>{f.estado === 'rec' ? 'recuperación' : finTxt}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="settings-hint" style={{margin:'8px 0 0'}}>* dominio provisional: aún sin examen, muestra solo tus prácticas. {atts === null ? '⏳ Leyendo tus notas de examen de la nube…' : ''}</div>
      </div>
      {foco && (
        <div className="scard" style={{marginTop:14, background:'#FFFDF2', borderColor:'#FFECB3'}}>
          <div className="sec-head"><div className="sec-title">❓ ¿Cómo puedo llegar a 100 de nota final?</div><span className="sec-meta">{foco.mod.emoji} {foco.mod.name}</span></div>
          <div style={{display:'grid', gap:6}}>
            {como.map((c, i) => <div key={i} style={{fontSize:12.5, lineHeight:1.6, fontWeight:700}}>{c}</div>)}
          </div>
          <div style={{marginTop:10, background:'#FFF9C4', border:'1.5px solid #FFD54F', borderRadius:11, padding:'10px 14px', fontSize:12.5, fontWeight:700, color:'#4E3800'}}>
            🎁 <b>Si te faltan puntos en algunos módulos:</b> sigue practicando y puedes sumar <b>hasta +5 en tu nota final</b> — se entregan al <b>final del programa</b>.
          </div>
        </div>
      )}
      {exp && <BoExpModal exp={exp} partis={partis} onClose={() => setExp(null)} />}
    </main>
  );
}

Object.assign(window, { StudentBoletin });
