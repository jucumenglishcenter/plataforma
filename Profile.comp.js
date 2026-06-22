/* Mejora B + D + E · Student profile page with change-password UI and weekly league */

const { useState: prUseState } = React;

function StudentProfile({ user, onBack }) {
  const { STUDENTS, GROUPS, LEVELS, ACHIEVEMENT_DEFS, MEDAL_RARITY, RARITY_STYLE, getStudentXP, getStudentLevel, getWeeklyRanking, daysUntilMonday, getStudentProgress, MODULE_CATALOG, earnedMedals } = window.JUCUM_DATA;
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
            <div className="sec-title">🏆 Mis logros</div>
            <span className="sec-meta">{earnedMedals(student).length}/{Object.keys(ACHIEVEMENT_DEFS).length} conseguidos</span>
          </div>
          {window.AchievementWarning && <AchievementWarning student={student} />}
          <MedalShowcase student={student} defs={ACHIEVEMENT_DEFS} />
        </div>
      </div>

      <div className="scard" style={{marginTop:18}}>
        <div className="sec-head"><div className="sec-title">📝 Mi asistencia</div></div>
        <StudentAttendanceCard student={student} />
      </div>

      <div style={{marginTop:18}}><GradesRecord student={student} /></div>

      <div className="scard" style={{marginTop:18}}>
        <div className="sec-head"><div className="sec-title">📊 Evaluaciones del profesor</div></div>
        <StudentEvaluations studentId={student.id} isStudent={true} />
      </div>

      {showPwd && <ChangePasswordModal username={student.username} onClose={() => setShowPwd(false)} />}
    </main>
  );
}

/* Mejora E · Weekly league card — 🏆 campeones congelados + escenario del #1 + emoji por ganador */
const LEAGUE_SCENE_BG = {
  'theme-gold': 'repeating-conic-gradient(from 0deg at 50% -4%, rgba(255,214,120,.16) 0deg 6deg, transparent 6deg 14deg), radial-gradient(circle at 50% -8%, rgba(255,216,110,.7), transparent 56%), linear-gradient(160deg,#6E5214,#2C2006)',
  'theme-mountains': 'radial-gradient(ellipse 85% 46% at 16% 118%, #34204C 0 70%, transparent 71%), radial-gradient(ellipse 78% 44% at 86% 115%, #5A386F 0 70%, transparent 71%), radial-gradient(circle at 50% 50%, #FFE7A8 0 6%, rgba(255,180,120,.55) 7%, transparent 17%), linear-gradient(180deg,#FF9266 0%,#FF6F9C 42%,#7A4D9E 100%)',
  'theme-night': 'radial-gradient(ellipse 95% 34% at 50% 126%, #131132 0 72%, transparent 73%), radial-gradient(1.4px 1.4px at 18% 26%, #fff, transparent), radial-gradient(1.6px 1.6px at 62% 15%, #fff, transparent), radial-gradient(1.3px 1.3px at 80% 33%, #cfe, transparent), radial-gradient(1.6px 1.6px at 38% 20%, #fff, transparent), radial-gradient(1.3px 1.3px at 28% 44%, #fff, transparent), radial-gradient(circle at 76% 24%, #FBF4D0 0 5%, rgba(251,244,208,.35) 6%, transparent 13%), linear-gradient(180deg,#23266C 0%,#0B0B24 100%)',
  'theme-aurora': 'radial-gradient(ellipse 95% 34% at 50% 122%, #06131C 0 72%, transparent 73%), radial-gradient(ellipse 52% 42% at 26% 4%, rgba(80,240,180,.55), transparent 60%), radial-gradient(ellipse 46% 40% at 74% 12%, rgba(130,140,255,.5), transparent 60%), radial-gradient(ellipse 42% 32% at 50% 0%, rgba(120,255,210,.4), transparent 60%), linear-gradient(180deg,#0C3242 0%,#07151F 100%)',
  'theme-ocean': 'radial-gradient(ellipse 130% 30% at 50% 130%, rgba(120,225,255,.55) 0 60%, transparent 61%), radial-gradient(ellipse 130% 26% at 50% 119%, rgba(70,180,235,.5) 0 60%, transparent 61%), radial-gradient(circle at 50% 28%, rgba(255,240,200,.65) 0 5%, transparent 15%), linear-gradient(180deg,#0E6CA0 0%,#062236 100%)',
  'theme-party': 'radial-gradient(3px 3px at 12% 20%, #FFD54F, transparent), radial-gradient(3px 3px at 30% 52%, #FF6F9C, transparent), radial-gradient(3px 3px at 52% 14%, #5AD6FF, transparent), radial-gradient(3px 3px at 70% 40%, #7CFFB2, transparent), radial-gradient(3px 3px at 86% 22%, #FFB347, transparent), radial-gradient(3px 3px at 22% 78%, #C78BFF, transparent), radial-gradient(3px 3px at 64% 74%, #FF8AD0, transparent), radial-gradient(3px 3px at 90% 64%, #9CFF7C, transparent), linear-gradient(160deg,#2A2F86,#15184A)',
};
const LEAGUE_SCENE_META = [['theme-gold','🏆','Oro'],['theme-mountains','🏔️','Montañas'],['theme-night','🌙','Noche'],['theme-aurora','🌌','Aurora'],['theme-ocean','🌊','Océano'],['theme-party','🎉','Fiesta']];
const LEAGUE_EMOJIS = [['🦁','León'],['🦊','Zorro'],['🐯','Tigre'],['🐼','Panda'],['🦄','Unicornio'],['🐲','Dragón'],['🦅','Águila'],['🦉','Búho'],['🐙','Pulpo'],['🦖','Dino'],['🐧','Pingüino'],['🐺','Lobo'],['🦋','Mariposa'],['🐬','Delfín'],['🦈','Tiburón'],['🐝','Abeja'],['🚀','Cohete'],['⚡','Rayo'],['🔥','Fuego'],['🌟','Estrella'],['👑','Corona'],['💎','Diamante'],['🎯','Diana'],['🏆','Trofeo']];
const LEAGUE_AVA = { 1:{ava:58,emo:30,bar:60,barBg:'linear-gradient(#F4B400,#D49A00)',avaBg:'#C99700',ring:'0 0 0 4px rgba(244,180,0,.35),0 4px 14px rgba(0,0,0,.3)'}, 2:{ava:46,emo:23,bar:46,barBg:'linear-gradient(#B8BCC4,#8E939C)',avaBg:'#8E939C',ring:'0 3px 10px rgba(0,0,0,.25)'}, 3:{ava:44,emo:22,bar:34,barBg:'linear-gradient(#D98C4A,#B06A2C)',avaBg:'#B06A2C',ring:'0 3px 10px rgba(0,0,0,.25)'} };
const leagueIni = (s) => (s.fullName || '?').split(' ').map(w => w[0]).slice(0, 2).join('');

function WeeklyLeague({ student }) {
  const D = window.JUCUM_DATA;
  const [tick, setTick] = prUseState(0);
  const force = () => setTick(t => t + 1);
  React.useEffect(() => {
    let alive = true;
    (async () => { if (D.loadLeagueFromCloud) { await D.loadLeagueFromCloud(); if (alive) force(); } })();
    return () => { alive = false; };
  }, []); // eslint-disable-line

  const champ = D.getWeekChampions(student.group);     // {week, scenario, champions:[{student,xp,rank,emoji}]}
  const champions = champ.champions || [];
  const myRank = D.championRank(student);              // 1..3 si soy campeón, 0 si no
  const sceneBg = LEAGUE_SCENE_BG[champ.scenario] || LEAGUE_SCENE_BG['theme-gold'];

  const ranking = D.getWeeklyRanking(student.group);   // competencia EN CURSO (semana viva)
  const myLiveRank = ranking.findIndex(r => r.student.id === student.id) + 1;
  const days = D.daysUntilMonday();

  // Selector de emoji (solo si soy campeón · solo cambio el mío)
  const myEmoji = myRank ? D.getChampionEmoji(student.group, student.id) : '';
  const [pick, setPick] = prUseState(myEmoji || '🦁');
  const [saved, setSaved] = prUseState(!!myEmoji);
  const saveEmoji = () => { D.setChampionEmoji(student.group, student.id, pick); setSaved(true); force(); };
  const chooseScene = (key) => { D.setLeagueScenario(student.group, key); force(); };

  const podMap = [2, 1, 3]; // 2.° izq · 1.° centro · 3.° der
  const byRank = (r) => champions.find(c => c.rank === r);

  return (
    <div className="scard league-card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* ── Escenario con campeones congelados ── */}
      <div style={{ background: sceneBg, color: '#fff', padding: '15px 16px 18px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: 16, textShadow: '0 1px 4px rgba(0,0,0,.45)' }}>🏆 Campeones de la semana</div>
          <span style={{ fontSize: 10.5, fontWeight: 800, background: 'rgba(0,0,0,.28)', padding: '3px 10px', borderRadius: 20, textShadow: '0 1px 2px rgba(0,0,0,.4)' }}>Hasta el lunes</span>
        </div>
        {champions.length === 0 ? (
          <div style={{ marginTop: 14, background: 'rgba(0,0,0,.22)', borderRadius: 12, padding: 16, fontSize: 12.5, fontWeight: 700, textAlign: 'center', lineHeight: 1.5, textShadow: '0 1px 2px rgba(0,0,0,.4)' }}>
            🏁 Aún no hay campeones. ¡Practica esta semana y el lunes se corona el primer podio!
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 10, margin: '16px 0 4px' }}>
            {podMap.map(rk => {
              const c = byRank(rk); if (!c) return <div key={rk} style={{ width: 60 }} />;
              const A = LEAGUE_AVA[rk]; const isMe = c.student.id === student.id;
              return (
                <div key={rk} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <div style={{ position: 'relative', width: A.ava, height: A.ava, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: c.emoji ? A.emo : A.ava * 0.4, color: '#fff', background: c.emoji ? 'rgba(255,255,255,.16)' : A.avaBg, border: '2.5px solid rgba(255,255,255,.6)', boxShadow: (isMe ? '0 0 0 3px #fff,' : '') + A.ring }}>
                    {rk === 1 && <span style={{ position: 'absolute', top: -17, left: '50%', transform: 'translateX(-50%)', fontSize: 18 }}>👑</span>}
                    {c.emoji || leagueIni(c.student)}
                  </div>
                  <div style={{ width: A.ava + 6, height: A.bar, background: A.barBg, borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 6, fontFamily: "'Fredoka',sans-serif", fontWeight: 700, fontSize: 17, color: 'rgba(0,0,0,.45)' }}>{rk}</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: isMe ? '#FFE08A' : '#fff', textShadow: '0 1px 3px rgba(0,0,0,.5)' }}>{isMe ? 'Tú' : c.student.fullName.split(' ')[0]}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Competencia EN CURSO (semana viva) ── */}
      <div style={{ padding: '13px 15px 15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
          <div className="sec-title" style={{ fontSize: 15, whiteSpace: 'nowrap' }}>📈 Esta semana</div>
          <span className="sec-meta" style={{ whiteSpace: 'nowrap' }}>Se corona en {days} día{days === 1 ? '' : 's'}</span>
        </div>
        <div className="league-list">
          {ranking.slice(0, 5).map((r, i) => (
            <div key={r.student.id} className={`league-row ${r.student.id === student.id ? 'me' : ''} ${i === 0 ? 'leader' : ''}`}>
              <span className="league-pos">{i < 3 ? ['🥇','🥈','🥉'][i] : `#${i + 1}`}</span>
              <span className="league-name">{r.student.fullName.split(' ')[0]} {r.student.fullName.split(' ')[1]?.[0]}.</span>
              <span className="league-xp">{r.xp.toLocaleString()} XP</span>
            </div>
          ))}
        </div>
        {myLiveRank > 5 && <div className="league-mine-far">Tu posición: #{myLiveRank}</div>}

        {/* ── #1 elige el escenario (lo ve todo el grupo) ── */}
        {myRank === 1 && (
          <div style={{ marginTop: 16, border: '1px dashed #B9A6E8', background: 'linear-gradient(120deg,#F3EEFC,#FCFAFF)', borderRadius: 14, padding: 14 }}>
            <div style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: 14.5, color: '#5B3FA0' }}>👑 Elige el escenario de la liga</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6E59A8', margin: '3px 0 11px', lineHeight: 1.4 }}>Como <b>1.° de la semana</b>, tú decides el fondo. <b>Todo el grupo lo verá.</b></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {LEAGUE_SCENE_META.map(([key, emo, label]) => {
                const on = champ.scenario === key;
                return (
                  <button key={key} type="button" onClick={() => chooseScene(key)} style={{ position: 'relative', height: 56, borderRadius: 11, border: on ? '2px solid #fff' : '2px solid transparent', boxShadow: on ? '0 0 0 3px rgba(91,63,160,.4)' : 'none', cursor: 'pointer', overflow: 'hidden', background: LEAGUE_SCENE_BG[key], color: '#fff', fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 10.5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 0, padding: '0 0 5px', textShadow: '0 1px 3px rgba(0,0,0,.65)' }}>
                    {on && <span style={{ position: 'absolute', top: 3, right: 5, fontSize: 12 }}>✓</span>}
                    <span style={{ fontSize: 17, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.5))' }}>{emo}</span>{label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Cada ganador elige su emoji (solo el suyo) ── */}
        {myRank > 0 && !saved && (
          <div style={{ marginTop: 14, border: '1px dashed #F0C66B', background: 'linear-gradient(120deg,#FFF8E8,#FFFDF6)', borderRadius: 14, padding: 14 }}>
            <div style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: 14.5, color: '#9c5d00' }}>{['🥇','🥈','🥉'][myRank - 1]} ¡Quedaste {myRank}.° de la semana!</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#B26A00', margin: '3px 0 11px', lineHeight: 1.4 }}>Elige el emoji que te representará en el podio. <b>Solo tú</b> cambias el tuyo.</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 7 }}>
              {LEAGUE_EMOJIS.map(([e, label]) => (
                <button key={e} type="button" title={label} onClick={() => setPick(e)} style={{ aspectRatio: '1', minWidth: 0, border: pick === e ? '1.5px solid #F4B400' : '1.5px solid #E6E9F2', background: pick === e ? '#FFF4D6' : '#fff', boxShadow: pick === e ? '0 0 0 3px rgba(244,180,0,.25)' : 'none', borderRadius: 10, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: pick === e ? 'scale(1.05)' : 'none' }}>{e}</button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, background: '#fff', border: '1px solid #F0C66B', borderRadius: 11, padding: '9px 13px' }}>
              <span style={{ fontSize: 26 }}>{pick}</span>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: '#9c5d00' }}>Tu avatar de campeón<small style={{ display: 'block', fontWeight: 700, color: '#B26A00', fontSize: 11 }}>{(LEAGUE_EMOJIS.find(x => x[0] === pick) || [null, ''])[1]} — elegido</small></div>
              <button type="button" onClick={saveEmoji} style={{ marginLeft: 'auto', border: 'none', background: '#F4B400', color: '#3a2a00', fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 12, padding: '8px 16px', borderRadius: 18, cursor: 'pointer' }}>Guardar</button>
            </div>
          </div>
        )}
        {myRank > 0 && saved && (
          <div style={{ marginTop: 14, border: '1px solid #F0C66B', background: 'linear-gradient(120deg,#FFF8E8,#FFFDF6)', borderRadius: 14, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 46, lineHeight: 1, marginBottom: 6 }}>{myEmoji || pick}</div>
            <div style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: 15.5, color: '#9c5d00' }}>🎉 ¡Elegiste tu emoji!</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#B26A00', margin: '6px 0 12px', lineHeight: 1.45 }}>Ahora <b>todos lo verán en sus perfiles</b> — que se note todo tu esfuerzo. ¡Te ganaste tu lugar! 💪</div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FFF4D6', border: '1px solid #F0C66B', color: '#9c5d00', fontWeight: 800, fontSize: 12, padding: '7px 14px', borderRadius: 18 }}>🔒 Guardado · fijo hasta el lunes</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* Mejora D · Change password UI (functional with Supabase later) */
function ChangePasswordModal({ onClose, username }) {
  const [cur, setCur] = prUseState('');
  const [next, setNext] = prUseState('');
  const [confirm, setConfirm] = prUseState('');
  const [msg, setMsg] = prUseState(null);
  const [busy, setBusy] = prUseState(false);

  const save = async () => {
    if (!cur) { setMsg({ kind:'err', text:'Ingresa tu contraseña actual.' }); return; }
    if (next.length < 4) { setMsg({ kind:'err', text:'La nueva contraseña debe tener al menos 4 caracteres.' }); return; }
    if (next !== confirm) { setMsg({ kind:'err', text:'Las contraseñas no coinciden.' }); return; }
    if (window.JUCUM_SB && username) {
      setBusy(true);
      try {
        const sb = window.JUCUM_SB.getClient();
        const { data } = await sb.from('users').select('password').eq('username', username).maybeSingle();
        if (!data || data.password !== cur) { setMsg({ kind:'err', text:'Tu contraseña actual no es correcta.' }); setBusy(false); return; }
        await sb.from('users').update({ password: next }).eq('username', username);
        setMsg({ kind:'ok', text:'✓ Contraseña actualizada. Únala la próxima vez que ingreses.' });
        setTimeout(onClose, 2200);
      } catch (e) { setMsg({ kind:'err', text:'Error: ' + e.message }); setBusy(false); }
      return;
    }
    setMsg({ kind:'ok', text:'✓ (modo local) Contraseña actualizada.' });
    setTimeout(onClose, 2200);
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
            <button className="btn-save" onClick={save} disabled={busy}>{busy ? 'Guardando…' : '💾 Guardar'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { StudentProfile, WeeklyLeague, ChangePasswordModal });
