/* Mejora B + D + E · Student profile page with change-password UI and weekly league */

const { useState: prUseState } = React;

function StudentProfile({ user, onBack }) {
  const { STUDENTS, GROUPS, LEVELS, ACHIEVEMENT_DEFS, MEDAL_RARITY, RARITY_STYLE, getStudentXP, getStudentLevel, getWeeklyRanking, daysUntilMonday, getStudentProgress, MODULE_CATALOG } = window.JUCUM_DATA;
  const student = STUDENTS.find(s => s.id === user.studentId) || STUDENTS[0];
  const group = GROUPS.find(g => g.id === student.group);
  const level = LEVELS[student.level];
  const xp = getStudentXP(student);
  const xpInfo = getStudentLevel(xp);
  const [showPwd, setShowPwd] = prUseState(false);

  const progress = getStudentProgress(student.id);
  const mods = MODULE_CATALOG[student.level] || [];
  const totalActs = mods.reduce((s,m) => s + m.activities.length, 0);
  const doneActs = mods.reduce((s,m) => s + m.activities.filter(a => progress.completed[`${m.id}:${a.id}`]).length, 0);

  return (
    <main>
      <button className="back-btn" onClick={onBack}>← Volver a mi panel</button>

      <div className="profile-hero" style={{background:`linear-gradient(135deg,${level.color},${level.dark})`}}>
        <div className="profile-ava">{student.fullName.split(' ').map(n=>n[0]).slice(0,2).join('')}</div>
        <div className="profile-info">
          <h1>{student.fullName}</h1>
          <div className="profile-meta">@{student.username} · {level.emoji} {level.code} · {group?.name}</div>
          <div className="profile-tier" style={{background:'rgba(255,255,255,0.2)'}}>
            {xpInfo.tier.emoji} {xpInfo.tier.name} · Nivel {xpInfo.level} · {xpInfo.totalXP.toLocaleString()} XP
          </div>
        </div>
        <button className="btn-settings" onClick={() => setShowPwd(true)}>🔑 Cambiar contraseña</button>
      </div>

      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-ico">🔥</div><div className="kpi-num">{student.streak}</div><div className="kpi-lbl">Racha (días)</div></div>
        <div className="kpi"><div className="kpi-ico">📊</div><div className="kpi-num">{student.avgScore || '—'}{student.avgScore?'%':''}</div><div className="kpi-lbl">Promedio</div></div>
        <div className="kpi"><div className="kpi-ico">✅</div><div className="kpi-num">{doneActs}/{totalActs}</div><div className="kpi-lbl">Actividades del nivel</div></div>
        <div className="kpi"><div className="kpi-ico">⏱️</div><div className="kpi-num">{Math.floor(student.totalMinutes/60)}h {student.totalMinutes%60}m</div><div className="kpi-lbl">Tiempo total</div></div>
      </div>

      <div className="two-col">
        <WeeklyLeague student={student} />
        <div className="scard">
          <div className="sec-head">
            <div className="sec-title">Mis medallas</div>
            <span className="sec-meta">{student.achievements.length}/{Object.keys(ACHIEVEMENT_DEFS).length}</span>
          </div>
          <MedalShowcase unlocked={student.achievements} defs={ACHIEVEMENT_DEFS} rarities={MEDAL_RARITY} styles={RARITY_STYLE} />
        </div>
      </div>

      <div className="scard" style={{marginTop:18}}>
        <div className="sec-head"><div className="sec-title">📊 Evaluaciones del profesor</div></div>
        <StudentEvaluations studentId={student.id} isStudent={true} />
      </div>

      {showPwd && <ChangePasswordModal onClose={() => setShowPwd(false)} />}
    </main>
  );
}

/* Mejora E · Weekly league card */
function WeeklyLeague({ student }) {
  const { getWeeklyRanking, daysUntilMonday, LEVELS } = window.JUCUM_DATA;
  const ranking = getWeeklyRanking(student.group);
  const myRank = ranking.findIndex(r => r.student.id === student.id) + 1;
  const days = daysUntilMonday();
  const medalE = ['🥇','🥈','🥉'];
  return (
    <div className="scard league-card">
      <div className="sec-head">
        <div className="sec-title">🏆 Liga semanal</div>
        <span className="sec-meta">Reinicia en {days} día{days === 1 ? '' : 's'}</span>
      </div>
      <div className="league-note">Gana XP esta semana practicando. El lunes se corona al campeón 👑 y el contador vuelve a cero.</div>
      <div className="league-list">
        {ranking.slice(0, 8).map((r, i) => (
          <div key={r.student.id} className={`league-row ${r.student.id === student.id ? 'me' : ''} ${i === 0 ? 'leader' : ''}`}>
            <span className="league-pos">{i < 3 ? medalE[i] : `#${i+1}`}</span>
            <span className="league-name">{r.student.fullName.split(' ')[0]} {r.student.fullName.split(' ')[1]?.[0]}.</span>
            <span className="league-xp">{r.xp.toLocaleString()} XP</span>
          </div>
        ))}
      </div>
      {myRank > 8 && <div className="league-mine-far">Tu posición: #{myRank}</div>}
    </div>
  );
}

/* Mejora D · Change password UI (functional with Supabase later) */
function ChangePasswordModal({ onClose }) {
  const [cur, setCur] = prUseState('');
  const [next, setNext] = prUseState('');
  const [confirm, setConfirm] = prUseState('');
  const [msg, setMsg] = prUseState(null);

  const save = () => {
    if (!cur) { setMsg({ kind:'err', text:'Ingresa tu contraseña actual.' }); return; }
    if (next.length < 4) { setMsg({ kind:'err', text:'La nueva contraseña debe tener al menos 4 caracteres.' }); return; }
    if (next !== confirm) { setMsg({ kind:'err', text:'Las contraseñas no coinciden.' }); return; }
    // In prototype mode passwords aren't really stored per-user.
    setMsg({ kind:'ok', text:'✓ Contraseña actualizada. (Se hará efectiva al conectar Supabase — en el prototipo la contraseña sigue siendo 1234.)' });
    setTimeout(onClose, 2600);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" style={{maxWidth:420}} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">🔑 Cambiar contraseña</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {msg && <div className={msg.kind === 'err' ? 'err' : 'pwd-ok'} style={{marginBottom:12}}>{msg.text}</div>}
          <div className="settings-block">
            <div className="settings-label">Contraseña actual</div>
            <input type="password" className="input-text" value={cur} onChange={e => setCur(e.target.value)} />
          </div>
          <div className="settings-block">
            <div className="settings-label">Nueva contraseña</div>
            <input type="password" className="input-text" value={next} onChange={e => setNext(e.target.value)} />
          </div>
          <div className="settings-block">
            <div className="settings-label">Confirmar nueva contraseña</div>
            <input type="password" className="input-text" value={confirm} onChange={e => setConfirm(e.target.value)} />
          </div>
          <div className="modal-actions">
            <button className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button className="btn-save" onClick={save}>💾 Guardar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { StudentProfile, WeeklyLeague, ChangePasswordModal });
