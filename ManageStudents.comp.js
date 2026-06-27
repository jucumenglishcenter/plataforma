/* Student management — create / edit / delete / move between groups / reset password */

const { useState: smUseState } = React;

function ManageStudents({ onBack }) {
  const { STUDENTS, GROUPS, LEVELS, saveStudents } = window.JUCUM_DATA;
  const [editing, setEditing] = smUseState(null);
  const [filterGroup, setFilterGroup] = smUseState('all');
  const [search, setSearch] = smUseState('');
  const [tick, setTick] = smUseState(0);
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

  const handleResetPassword = (s) => {
    if (window.JUCUM_SB) window.JUCUM_SB.update('users', s.id, { password: '1234' }).catch(e => console.warn(e.message));
    alert(`Contraseña de ${s.fullName} reseteada a "1234".\n\nPídele que la cambie en su primer ingreso.`);
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
        <button className="btn-settings" onClick={() => setEditing('new')}>+ Nuevo alumno</button>
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
                    <button className="att-btn" onClick={() => handleResetPassword(s)}>🔑 Reset</button>
                    <button className="att-btn" style={{borderColor:'#EF9A9A',color:'#C62828'}} onClick={() => handleDelete(s.id)}>🗑</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

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

Object.assign(window, { ManageStudents, StudentFormModal });
