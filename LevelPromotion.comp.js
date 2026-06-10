/* Level promotion · Teacher tool to promote students after international exam.
 * Lists students who completed all modules of their level → click → enter exam score → choose target group → promote.
 */

const { useState: pUseState } = React;

function LevelPromotion({ onBack }) {
  const { STUDENTS, GROUPS, LEVELS, MODULE_CATALOG, isEligibleForExam } = window.JUCUM_DATA;
  const [promoting, setPromoting] = pUseState(null);
  const [tick, setTick] = pUseState(0);

  const eligible = STUDENTS.filter(s => isEligibleForExam(s) && s.level !== 'a2');
  const inProgress = STUDENTS.filter(s => !isEligibleForExam(s) && s.level !== 'a2');

  return (
    <main>
      <button className="back-btn" onClick={onBack}>← Volver al panel</button>
      <div className="welcome teacher">
        <div className="welcome-text">
          <div className="eyebrow">🎓 Promoción de nivel</div>
          <h1>Avance de alumnos</h1>
          <p>Los alumnos que terminaron todas las actividades del nivel pueden rendir el examen internacional y avanzar al siguiente nivel.</p>
        </div>
      </div>

      <div className="scard" style={{marginTop:18}}>
        <div className="sec-head">
          <div className="sec-title">🟢 Listos para examen ({eligible.length})</div>
          <span className="sec-meta">Completaron 100% del nivel</span>
        </div>
        {eligible.length === 0
          ? <div className="empty-state"><div className="icon">📚</div>Ningún alumno ha completado todas las actividades de su nivel aún.</div>
          : (
            <div className="prom-list">
              {eligible.map(s => <PromCard key={s.id} stu={s} eligible onPromote={() => setPromoting(s)} />)}
            </div>
          )
        }
      </div>

      <div className="scard" style={{marginTop:14}}>
        <div className="sec-head">
          <div className="sec-title">⏳ En progreso ({inProgress.length})</div>
          <span className="sec-meta">Aún cursando su nivel actual</span>
        </div>
        <div className="prom-list">
          {inProgress.map(s => <PromCard key={s.id} stu={s} />)}
        </div>
      </div>

      {promoting && <PromoteModal stu={promoting} onClose={() => setPromoting(null)} onDone={() => { setPromoting(null); setTick(t => t+1); }} />}
    </main>
  );
}

function PromCard({ stu, eligible, onPromote }) {
  const { LEVELS, GROUPS, MODULE_CATALOG, getStudentProgress } = window.JUCUM_DATA;
  const level = LEVELS[stu.level];
  const group = GROUPS.find(g => g.id === stu.group);
  const mods = MODULE_CATALOG[stu.level] || [];
  const progress = getStudentProgress(stu.id);
  const totalActs = mods.reduce((s, m) => s + m.activities.length, 0);
  const doneActs = mods.reduce((s, m) => s + m.activities.filter(a => progress.completed[`${m.id}:${a.id}`]).length, 0);
  const pct = totalActs ? Math.round((doneActs/totalActs)*100) : 0;
  return (
    <div className={`prom-card ${eligible ? 'ready' : ''}`}>
      <div className="st-ava" style={{background:`linear-gradient(135deg,${level.color}80,${level.dark})`}}>
        {stu.fullName.split(' ').map(n=>n[0]).slice(0,2).join('')}
      </div>
      <div className="prom-info">
        <div className="prom-name">{stu.fullName}</div>
        <div className="prom-meta">@{stu.username} · {level.emoji} {level.code} · {group?.name}</div>
        <div className="prom-bar"><div className="prom-fill" style={{width:pct+'%',background:eligible?'#2EA84B':level.color}}></div></div>
        <div className="prom-pct">{doneActs}/{totalActs} actividades · {pct}%</div>
      </div>
      {eligible && <button className="btn-save" onClick={onPromote}>🎓 Rendir examen</button>}
    </div>
  );
}

function PromoteModal({ stu, onClose, onDone }) {
  const { LEVELS, GROUPS, promoteStudent } = window.JUCUM_DATA;
  const nextLevel = stu.level === 'pre-a1' ? 'a1' : stu.level === 'a1' ? 'a2' : null;
  const nextGroups = GROUPS.filter(g => g.level === nextLevel);
  const [score, setScore] = pUseState(75);
  const [groupId, setGroupId] = pUseState(nextGroups[0]?.id || '');
  const [err, setErr] = pUseState('');
  const passing = score >= 70;

  if (!nextLevel) return null;
  const next = LEVELS[nextLevel];

  const promote = () => {
    if (!passing) { setErr('El alumno necesita 70/100 o más para aprobar.'); return; }
    if (!groupId) { setErr('Selecciona un grupo del nuevo nivel.'); return; }
    promoteStudent(stu.id, nextLevel, groupId, score);
    onDone();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">🎓 Examen internacional · {stu.fullName}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="prom-summary">
            Avanza de <b>{LEVELS[stu.level].emoji} {LEVELS[stu.level].code}</b> a <b>{next.emoji} {next.code}</b> si aprueba el examen.
          </div>

          {err && <div className="err">⚠ {err}</div>}

          <div className="settings-block">
            <div className="settings-label">📝 Nota del examen (sobre 100)</div>
            <div className="settings-hint">Aprueba con 70 o más.</div>
            <div className="row-flex">
              <input type="range" min="0" max="100" value={score} onChange={e => setScore(parseInt(e.target.value))} className="slider-input" />
              <div className="target-val" style={{background:passing?'#E8F5E9':'#FFEBEE',borderColor:passing?'#A5D6A7':'#EF9A9A',color:passing?'#2E7D32':'#C62828'}}>{score}<span>/100</span></div>
            </div>
            <div style={{marginTop:6,fontSize:12,color:passing?'#2E7D32':'#C62828',fontWeight:700}}>
              {passing ? '✓ Aprobado' : '✗ No aprueba (necesita 70+)'}
            </div>
          </div>

          <div className="settings-block">
            <div className="settings-label">👥 Grupo del nuevo nivel</div>
            <div className="settings-hint">A qué grupo de {next.code} se asignará.</div>
            {nextGroups.length === 0
              ? <div className="err">⚠ No hay grupos de {next.code}. Crea uno primero en ⚙️ Grupos.</div>
              : nextGroups.map(g => (
                  <button key={g.id} type="button" className={`mp-btn ${groupId === g.id ? 'on' : ''}`} onClick={() => setGroupId(g.id)}>
                    <span className="mp-emo">{next.emoji}</span>
                    <span className="mp-name">{g.name}</span>
                    <span className="mp-count">{g.schedule}</span>
                  </button>
                ))
            }
          </div>

          <div className="modal-actions">
            <button className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button className="btn-save" onClick={promote} disabled={!passing || !groupId}>🎓 Promover al alumno</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LevelPromotion, PromCard, PromoteModal });
