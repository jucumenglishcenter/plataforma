/* Student management — create / edit / delete / move between groups / reset password */

const { useState: smUseState } = React;

function ManageStudents({ onBack }) {
  const { STUDENTS, GROUPS, LEVELS, saveStudents } = window.JUCUM_DATA;
  const [editing, setEditing] = smUseState(null);
  const [filterGroup, setFilterGroup] = smUseState('all');
  const [search, setSearch] = smUseState('');
  const [tick, setTick] = smUseState(0);
  const [resetting, setResetting] = smUseState(null);
  const [importing, setImporting] = smUseState(false);
  const refresh = () => setTick(t => t + 1);

  let list = STUDENTS;
  if (filterGroup !== 'all') list = list.filter(s => s.group === filterGroup);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(s => s.fullName.toLowerCase().includes(q) || s.username.toLowerCase().includes(q));
  }

  const handleDelete = (id) => {
    const s = STUDENTS.find(x => x.id === id);
    if (!confirm(`¿Eliminar a ${s.fullName}? Esta acción no se puede deshacer.`)) return;
    const idx = STUDENTS.findIndex(x => x.id === id);
    STUDENTS.splice(idx, 1);
    saveStudents(STUDENTS);
    if (window.JUCUM_SB) window.JUCUM_SB.remove('users', id).catch(e => console.warn('delStudent:', e.message));
    refresh();
  };

  const doResetPassword = (s) => {
    if (window.JUCUM_SB) window.JUCUM_SB.update('users', s.id, { password: '1234' }).catch(e => console.warn(e.message));
    setResetting(null);
    alert(`✅ Contraseña de ${s.fullName} reseteada a "1234".\n\n⚠ IMPORTANTE: pídele que al ingresar la cambie por una que pueda recordar, y que la anote en un lugar seguro para no volver a tener problemas.`);
  };

  return (
    <main>
      <button className="back-btn" onClick={onBack}>← Volver al panel</button>
      <div className="welcome teacher">
        <div className="welcome-text">
          <div className="eyebrow">👥 Gestión</div>
          <h1>Mis alumnos</h1>
          <p>{STUDENTS.length} alumno{STUDENTS.length === 1 ? '' : 's'} registrado{STUDENTS.length === 1 ? '' : 's'}. Crea, edita o elimina.</p>
        </div>
        <div className="welcome-actions" style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          <button className="btn-settings" onClick={() => setImporting(true)}>📋 Importar lista</button>
          <button className="btn-settings" onClick={() => setEditing('new')}>+ Nuevo alumno</button>
        </div>
      </div>

      <div className="scard" style={{marginTop:18}}>
        <div className="sm-filters">
          <input type="text" className="input-text" placeholder="🔍 Buscar por nombre o usuario…" value={search} onChange={e => setSearch(e.target.value)} style={{flex:1}} />
          <select className="input-text" value={filterGroup} onChange={e => setFilterGroup(e.target.value)} style={{minWidth:200}}>
            <option value="all">Todos los grupos ({STUDENTS.length})</option>
            {GROUPS.map(g => {
              const n = STUDENTS.filter(s => s.group === g.id).length;
              return <option key={g.id} value={g.id}>{LEVELS[g.level].emoji} {g.name} ({n})</option>;
            })}
          </select>
        </div>

        <div className="sm-list">
          {list.length === 0 ? (
            <div className="empty-state"><div className="icon">🔍</div>Sin alumnos con esos filtros.</div>
          ) : (
            list.map(s => {
              const level = LEVELS[s.level];
              const group = GROUPS.find(g => g.id === s.group);
              return (
                <div key={s.id} className="sm-row">
                  <div className="st-ava" style={{background:`linear-gradient(135deg,${level.color}80,${level.dark})`}}>
                    {s.fullName.split(' ').map(n=>n[0]).slice(0,2).join('')}
                  </div>
                  <div className="sm-info">
                    <div className="sm-name">{s.fullName}</div>
                    <div className="sm-meta">@{s.username} · {level.emoji} {level.code} · {group?.name || 'sin grupo'}</div>
                  </div>
                  <div className="sm-actions">
                    <button className="att-btn" onClick={() => setEditing(s.id)}>✏️ Editar</button>
                    <button className="att-btn" onClick={() => setResetting(s)}>🔑 Reset</button>
                    <button className="att-btn" style={{borderColor:'#EF9A9A',color:'#C62828'}} onClick={() => handleDelete(s.id)}>🗑</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {resetting && (
        <TeacherPasswordGate
          title="Confirmar reset de contraseña"
          message={`Vas a resetear la contraseña de ${resetting.fullName} a "1234". Ingresa tu contraseña de profesor para confirmar.`}
          confirmLabel="🔑 Resetear a 1234"
          onConfirm={() => doResetPassword(resetting)}
          onClose={() => setResetting(null)}
        />
      )}

      {importing && (
        <BulkImportModal
          onClose={() => setImporting(false)}
          onDone={() => { setImporting(false); refresh(); }}
        />
      )}

      {editing && (
        <StudentFormModal
          student={editing === 'new' ? null : STUDENTS.find(s => s.id === editing)}
          onClose={() => setEditing(null)}
          onSave={(data) => {
            if (editing === 'new') {
              const id = 's' + Date.now();
              if (window.JUCUM_SB) {
                window.JUCUM_SB.insert('users', {
                  username: data.username, full_name: data.fullName, role: 'student',
                  level: data.level, group_id: data.group, starred: false, password: '1234',
                }).then(row => { if (row) { const i = STUDENTS.findIndex(x => x.id === id); if (i>=0) STUDENTS[i].id = row.id; } })
                  .catch(e => alert('Error al crear alumno: ' + e.message));
              }
              STUDENTS.push({
                id, ...data,
                completedModules: 0, avgScore: 0, streak: 0,
                lastActiveDays: 0, totalMinutes: 0, achievements: [], starred: false,
              });
            } else {
              const idx = STUDENTS.findIndex(x => x.id === editing);
              if (idx >= 0) STUDENTS[idx] = { ...STUDENTS[idx], ...data };
              if (window.JUCUM_SB) window.JUCUM_SB.update('users', editing, {
                username: data.username, full_name: data.fullName, level: data.level, group_id: data.group,
              }).catch(e => console.warn('updStudent:', e.message));
            }
            saveStudents(STUDENTS);
            setEditing(null);
            refresh();
          }}
        />
      )}
    </main>
  );
}

function StudentFormModal({ student, onClose, onSave }) {
  const { GROUPS, LEVELS } = window.JUCUM_DATA;
  const isEdit = !!student;
  const [fullName, setFullName] = smUseState(student?.fullName || '');
  const [username, setUsername] = smUseState(student?.username || '');
  const [groupId, setGroupId] = smUseState(student?.group || GROUPS[0]?.id || '');
  const [err, setErr] = smUseState('');

  const group = GROUPS.find(g => g.id === groupId);
  const level = group?.level;

  const save = () => {
    if (!fullName.trim()) { setErr('El nombre completo es obligatorio.'); return; }
    if (!username.trim()) { setErr('El usuario es obligatorio.'); return; }
    if (!/^[a-z0-9._-]+$/i.test(username)) { setErr('Usuario solo puede contener letras, números, puntos y guiones.'); return; }
    if (!groupId) { setErr('Selecciona un grupo.'); return; }
    onSave({ fullName: fullName.trim(), username: username.trim().toLowerCase(), group: groupId, level });
  };

  const suggestUsername = () => {
    const parts = fullName.trim().toLowerCase().split(/\s+/).filter(p => p.length > 1);
    if (parts.length >= 2) setUsername(`${parts[0]}.${parts[1]}`);
    else if (parts[0]) setUsername(parts[0]);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{isEdit ? '✏️ Editar alumno' : '➕ Nuevo alumno'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {err && <div className="err" style={{marginBottom:12}}>⚠ {err}</div>}

          <div className="settings-block">
            <div className="settings-label">Nombre completo</div>
            <input className="input-text" value={fullName} onChange={e => setFullName(e.target.value)} onBlur={() => !isEdit && !username && suggestUsername()} placeholder="Leonardo Cruz" />
          </div>

          <div className="settings-block">
            <div className="settings-label">Usuario (para login)</div>
            <div className="settings-hint">Sin espacios. Ejemplo: leo.cruz</div>
            <input className="input-text" value={username} onChange={e => setUsername(e.target.value)} placeholder="leo.cruz" />
          </div>

          <div className="settings-block">
            <div className="settings-label">Grupo asignado</div>
            <div className="settings-hint">El nivel se hereda automáticamente del grupo.</div>
            {GROUPS.map(g => {
              const lvl = LEVELS[g.level];
              return (
                <button key={g.id} type="button" className={`mp-btn ${groupId === g.id ? 'on' : ''}`} onClick={() => setGroupId(g.id)}>
                  <span className="mp-emo">{lvl.emoji}</span>
                  <span className="mp-name">{g.name}</span>
                  <span className="mp-count">{g.schedule}</span>
                </button>
              );
            })}
          </div>

          {!isEdit && (
            <div className="prom-summary" style={{background:'#FFF9C4',border:'1px solid #FFECB3',color:'#5D4037'}}>
              🔑 La contraseña inicial será <b>1234</b>. El alumno deberá cambiarla en su primer ingreso.
            </div>
          )}

          <div className="modal-actions">
            <button className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button className="btn-save" onClick={save}>{isEdit ? '💾 Guardar cambios' : '➕ Crear alumno'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Modal de aprobación — pide la contraseña del profesor antes de una acción
 * sensible (reset de contraseña de un alumno, etc.) para evitar clics por error. */
function TeacherPasswordGate({ title, message, confirmLabel, onConfirm, onClose }) {
  const [pwd, setPwd] = smUseState('');
  const [err, setErr] = smUseState('');
  const [busy, setBusy] = smUseState(false);
  const submit = async () => {
    if (!pwd) { setErr('Ingresa tu contraseña de profesor.'); return; }
    setBusy(true); setErr('');
    let ok = false;
    if (window.JUCUM_SB?.verifyTeacherPassword) ok = await window.JUCUM_SB.verifyTeacherPassword(pwd);
    else { const c = window.JUCUM_DATA?.DEMO_CREDS?.teacher?.password || '1234'; ok = pwd === c; }
    setBusy(false);
    if (!ok) { setErr('Contraseña incorrecta. La acción no se realizó.'); return; }
    onConfirm();
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" style={{maxWidth:430}} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">🔐 {title}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="settings-hint" style={{marginBottom:12}}>{message}</div>
          {err && <div className="err" style={{marginBottom:12}}>⚠ {err}</div>}
          <input type="password" className="input-text" autoFocus placeholder="Contraseña del profesor"
                 value={pwd} onChange={e => setPwd(e.target.value)}
                 onKeyDown={e => { if (e.key === 'Enter') submit(); }} style={{width:'100%'}} />
          <div className="modal-actions">
            <button className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button className="btn-save" onClick={submit} disabled={busy}>{busy ? 'Verificando…' : (confirmLabel || 'Confirmar')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Importación masiva de alumnos desde una lista pegada.
 * Acepta una línea por alumno: "Nombre Completo" o "Nombre Completo, usuario".
 * Genera el usuario automáticamente (nombre.apellido), evita duplicados, y los
 * crea en bloque (Supabase + caché local). Contraseña inicial 1234. */
function slugifyName(s) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}
function BulkImportModal({ onClose, onDone }) {
  const { STUDENTS, GROUPS, LEVELS, saveStudents } = window.JUCUM_DATA;
  const [groupId, setGroupId] = smUseState(GROUPS[0]?.id || '');
  const [raw, setRaw] = smUseState('');
  const [busy, setBusy] = smUseState(false);
  const [doneMsg, setDoneMsg] = smUseState(null);
  const group = GROUPS.find(g => g.id === groupId);
  const level = group?.level;

  // Usuarios existentes (para evitar choques)
  const existing = new Set(STUDENTS.map(s => (s.username || '').toLowerCase()));

  // Parseo + preview
  const rows = [];
  const seen = new Set();
  raw.split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
    const parts = line.split(/[,\t;]+/).map(p => p.trim()).filter(Boolean);
    const fullName = parts[0];
    if (!fullName) return;
    let username = parts[1]
      ? parts[1].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9._-]/g, '')
      : '';
    if (!username) {
      const words = fullName.split(/\s+/).filter(w => w.length > 1);
      username = words.length >= 2 ? `${slugifyName(words[0])}.${slugifyName(words[1])}` : slugifyName(words[0] || fullName);
    }
    // Unicidad (contra existentes y dentro del lote)
    let uname = username, i = 2;
    while (existing.has(uname) || seen.has(uname)) { uname = `${username}${i}`; i++; }
    let warn = '';
    if (parts[1] && existing.has(username)) warn = 'usuario ya existía → ajustado';
    seen.add(uname);
    rows.push({ fullName, username: uname, warn });
  });

  const doImport = async () => {
    if (!rows.length || !group) return;
    setBusy(true);
    let created = 0;
    for (const r of rows) {
      const id = 's' + Date.now() + Math.floor(Math.random() * 1000);
      let realId = id;
      if (window.JUCUM_SB) {
        try {
          const row = await window.JUCUM_SB.insert('users', {
            username: r.username, full_name: r.fullName, role: 'student',
            level, group_id: groupId, starred: false, password: '1234',
          });
          if (row && row.id) realId = row.id;
        } catch (e) { console.warn('bulk insert:', e.message); }
      }
      STUDENTS.push({
        id: realId, username: r.username, fullName: r.fullName, level, group: groupId,
        completedModules: 0, avgScore: 0, streak: 0, lastActiveDays: 0,
        totalMinutes: 0, achievements: [], starred: false,
      });
      created++;
    }
    saveStudents(STUDENTS);
    setBusy(false);
    setDoneMsg(`✅ ${created} alumno${created === 1 ? '' : 's'} creado${created === 1 ? '' : 's'} en ${group.name}. Contraseña inicial: 1234.`);
    setTimeout(onDone, 1800);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" style={{maxWidth:560}} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">📋 Importar lista de alumnos</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {doneMsg ? <div className="pwd-ok">{doneMsg}</div> : <>
            <div className="settings-block" style={{paddingTop:0}}>
              <div className="settings-label">Grupo de destino</div>
              <div className="settings-hint">Todos los alumnos del lote se crean en este grupo (el nivel se hereda).</div>
              <select className="input-text" style={{width:'100%'}} value={groupId} onChange={e => setGroupId(e.target.value)}>
                {GROUPS.map(g => <option key={g.id} value={g.id}>{LEVELS[g.level].emoji} {g.name} · {LEVELS[g.level].code}</option>)}
              </select>
            </div>
            <div className="settings-block">
              <div className="settings-label">Pega la lista (un alumno por línea)</div>
              <div className="settings-hint">Solo el nombre, o <b>Nombre, usuario</b> si quieres fijarlo. El usuario se genera solo y se evita cualquier duplicado.</div>
              <textarea className="eval-textarea" rows={7} value={raw} onChange={e => setRaw(e.target.value)}
                placeholder={'Leonardo Cruz\nAna Flores\nMarco Tello, marco.t\nLucía Huamán'} style={{width:'100%', fontFamily:'inherit'}} />
            </div>
            {rows.length > 0 && (
              <div className="settings-block">
                <div className="settings-label">Vista previa · {rows.length} alumno{rows.length === 1 ? '' : 's'}</div>
                <div className="bulk-preview">
                  {rows.map((r, i) => (
                    <div key={i} className="bulk-row">
                      <span className="bulk-n">{i + 1}</span>
                      <span className="bulk-name">{r.fullName}</span>
                      <span className="bulk-user">@{r.username}</span>
                      {r.warn && <span className="bulk-warn">{r.warn}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="prom-summary" style={{background:'#FFF9C4',border:'1px solid #FFECB3',color:'#5D4037'}}>
              🔑 Todos inician con contraseña <b>1234</b>. Pide que la cambien en su primer ingreso.
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={onClose}>Cancelar</button>
              <button className="btn-save" onClick={doImport} disabled={busy || rows.length === 0}>
                {busy ? 'Creando…' : `➕ Crear ${rows.length || ''} alumno${rows.length === 1 ? '' : 's'}`}
              </button>
            </div>
          </>}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ManageStudents, StudentFormModal, TeacherPasswordGate, BulkImportModal });
