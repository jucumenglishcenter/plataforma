/* Bloque · Group management
 * Teacher can:
 *  - Create new group (name, level, schedule, start date)
 *  - Edit existing group
 *  - Delete group (only if no students assigned)
 */

const { useState: mgUseState } = React;

function ManageGroups({ onBack }) {
  const { GROUPS, STUDENTS, LEVELS, addGroup, updateGroup, removeGroup } = window.JUCUM_DATA;
  const [editing, setEditing] = mgUseState(null); // null | 'new' | groupId
  const [tick, setTick] = mgUseState(0);

  const refresh = () => setTick(t => t + 1);

  const handleDelete = (id) => {
    const members = STUDENTS.filter(s => s.group === id);
    if (members.length > 0) {
      alert(`No puedes eliminar este grupo: tiene ${members.length} alumno${members.length === 1 ? '' : 's'} asignado${members.length === 1 ? '' : 's'}.\n\nReasigna o elimina los alumnos primero.`);
      return;
    }
    if (confirm('¿Eliminar este grupo? Esta acción no se puede deshacer.')) {
      removeGroup(id);
      refresh();
    }
  };

  return (
    <main>
      <button className="back-btn" onClick={onBack}>← Volver al panel</button>
      <div className="welcome teacher">
        <div className="welcome-text">
          <div className="eyebrow">⚙️ Gestión</div>
          <h1>Mis grupos</h1>
          <p>Crea, edita o elimina grupos. {GROUPS.length} grupo{GROUPS.length === 1 ? '' : 's'} activo{GROUPS.length === 1 ? '' : 's'}.</p>
        </div>
        <button className="btn-settings" onClick={() => setEditing('new')}>+ Nuevo grupo</button>
      </div>

      <div className="mg-list">
        {GROUPS.map(g => {
          const level = LEVELS[g.level];
          const members = STUDENTS.filter(s => s.group === g.id);
          return (
            <div key={g.id} className="mg-card" style={{borderTopColor:level.color}}>
              <div className="mg-card-head">
                <span className="gcard-pill" style={{background:level.color+'18',color:level.dark,borderColor:level.color+'55'}}>
                  {level.emoji} {level.code}
                </span>
                <span className="mg-card-count">{members.length} alumno{members.length === 1 ? '' : 's'}</span>
              </div>
              <div className="mg-card-name">{g.name}</div>
              <div className="mg-card-meta">⏰ {g.schedule}</div>
              <div className="mg-card-meta">📅 Inicio: {g.startDate}</div>
              <div className="mg-actions">
                <button className="att-btn" onClick={() => setEditing(g.id)}>✏️ Editar</button>
                <button className="att-btn" style={{borderColor:'#EF9A9A',color:'#C62828'}} onClick={() => handleDelete(g.id)}>🗑 Eliminar</button>
              </div>
            </div>
          );
        })}

        <button className="mg-add" onClick={() => setEditing('new')}>
          <div className="mg-add-ico">+</div>
          <div className="mg-add-lbl">Crear nuevo grupo</div>
        </button>
      </div>

      {editing && (
        <GroupFormModal
          group={editing === 'new' ? null : GROUPS.find(g => g.id === editing)}
          onClose={() => setEditing(null)}
          onSave={(data) => {
            if (editing === 'new') addGroup(data);
            else updateGroup(editing, data);
            setEditing(null);
            refresh();
          }}
        />
      )}
    </main>
  );
}

function GroupFormModal({ group, onClose, onSave }) {
  const isEdit = !!group;
  const [name, setName] = mgUseState(group?.name || '');
  const [level, setLevel] = mgUseState(group?.level || 'pre-a1');
  const [schedule, setSchedule] = mgUseState(group?.schedule || '');
  const [startDate, setStartDate] = mgUseState(group?.startDate || new Date().toISOString().slice(0,10));
  const [err, setErr] = mgUseState('');

  const save = () => {
    if (!name.trim()) { setErr('El nombre del grupo es obligatorio.'); return; }
    if (!schedule.trim()) { setErr('El horario es obligatorio.'); return; }
    onSave({ name: name.trim(), level, schedule: schedule.trim(), startDate });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{isEdit ? '✏️ Editar grupo' : '➕ Nuevo grupo'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {err && <div className="err" style={{marginBottom:12}}>⚠ {err}</div>}

          <div className="settings-block">
            <div className="settings-label">Nivel</div>
            <div className="settings-hint">Determina el contenido disponible para los alumnos.</div>
            <div className="row-flex">
              {['pre-a1','a1','a2'].map(k => (
                <button key={k} type="button"
                  className={`preset ${level === k ? 'on' : ''}`}
                  onClick={() => setLevel(k)}>
                  {k === 'pre-a1' ? '🟡 Pre-A1' : k === 'a1' ? '📘 A1' : '📗 A2'}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-block">
            <div className="settings-label">Nombre del grupo</div>
            <div className="settings-hint">Ejemplo: "Pre-A1 · Lunes & Miércoles"</div>
            <input className="input-text" value={name} onChange={e => setName(e.target.value)} placeholder="Pre-A1 · Lunes & Miércoles" />
          </div>

          <div className="settings-block">
            <div className="settings-label">Horario</div>
            <div className="settings-hint">Ejemplo: "6:00pm – 7:30pm"</div>
            <input className="input-text" value={schedule} onChange={e => setSchedule(e.target.value)} placeholder="6:00pm – 7:30pm" />
          </div>

          <div className="settings-block">
            <div className="settings-label">Fecha de inicio</div>
            <input type="date" className="input-text" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>

          <div className="modal-actions">
            <button className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button className="btn-save" onClick={save}>{isEdit ? '💾 Guardar cambios' : '➕ Crear grupo'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ManageGroups, GroupFormModal });
