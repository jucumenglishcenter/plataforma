/* Student management — create / edit / delete / move between groups / reset password */

const { useState: smUseState } = React;

function ManageStudents({ onBack }) {
  const { STUDENTS, GROUPS, LEVELS, saveStudents } = window.JUCUM_DATA;
  const [editing, setEditing] = smUseState(null);
  const [editGroupDefault, setEditGroupDefault] = smUseState(null);
  const [filterGroup, setFilterGroup] = smUseState(null); // null = vista de grupos
  const [search, setSearch] = smUseState('');
  const [tick, setTick] = smUseState(0);
  const [resetting, setResetting] = smUseState(null);
  const [importing, setImporting] = smUseState(false);
  const refresh = () => setTick(t => t + 1);

  const LVL_RANK = { 'pre-a1': 0, 'a1': 1, 'a2': 2, 'b1': 3 };
  const byName = (a, b) => a.fullName.localeCompare(b.fullName, 'es');
  const groupsSorted = [...GROUPS].sort((a, b) =>
    (LVL_RANK[a.level] ?? 9) - (LVL_RANK[b.level] ?? 9) || a.name.localeCompare(b.name, 'es'));
  const ungrouped = STUDENTS.filter(s => !GROUPS.some(g => g.id === s.group));

  // Lista mostrada según el grupo elegido (o búsqueda)
  const q = search.trim().toLowerCase();
  let list;
  if (filterGroup === null) {
    // En la vista de grupos, la búsqueda busca en TODOS
    list = q ? STUDENTS.filter(s => s.fullName.toLowerCase().includes(q) || s.username.toLowerCase().includes(q)) : [];
  } else if (filterGroup === 'none') {
    list = ungrouped;
  } else {
    list = STUDENTS.filter(s => s.group === filterGroup);
    if (q) list = list.filter(s => s.fullName.toLowerCase().includes(q) || s.username.toLowerCase().includes(q));
  }
  list = [...list].sort(byName);

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

  const openNew = (groupId) => { setEditGroupDefault(groupId || null); setEditing('new'); };

  const StudentRow = (s) => {
    const level = LEVELS[s.level] || { color: '#9AA', dark: '#667', emoji: '👤', code: '—' };
    const group = GROUPS.find(g => g.id === s.group);
    const avg = Math.round(s.avgScore || 0);
    const mods = s.completedModules || 0;
    const active = (s.totalMinutes || 0) > 0 || avg > 0 || mods > 0;
    const avgColor = !active ? '#9AA' : avg >= 70 ? '#1B7A3D' : avg >= 40 ? '#B8860B' : '#C62828';
    return (
      <div key={s.id} className="sm-row">
        <div className="st-ava" style={{background:`linear-gradient(135deg,${level.color}80,${level.dark})`}}>
          {s.fullName.split(' ').map(n=>n[0]).slice(0,2).join('')}
        </div>
        <div className="sm-info">
          <div className="sm-name">{s.fullName}</div>
          <div className="sm-meta">@{s.username} · {level.emoji} {level.code} · {group?.name || '⚠ sin grupo'}</div>
        </div>
        <div title={active ? `Promedio ${avg}% · ${mods} módulo${mods===1?'':'s'} completado${mods===1?'':'s'}` : 'Aún sin actividad'}
             style={{display:'flex', gap:14, alignItems:'center', flex:'none', padding:'0 4px'}}>
          <div style={{textAlign:'center', minWidth:42}}>
            <div style={{fontSize:15, fontWeight:900, color:avgColor, lineHeight:1}}>{active ? avg+'%' : '—'}</div>
            <div style={{fontSize:10, color:'#9AA', fontWeight:700, marginTop:2}}>prom.</div>
          </div>
          <div style={{textAlign:'center', minWidth:42}}>
            <div style={{fontSize:15, fontWeight:900, color:'#2A3550', lineHeight:1}}>{mods}</div>
            <div style={{fontSize:10, color:'#9AA', fontWeight:700, marginTop:2}}>mód.</div>
          </div>
        </div>
        <div className="sm-actions">
          <button className="att-btn" onClick={() => { setEditGroupDefault(null); setEditing(s.id); }}>✏️ Editar</button>
          <button className="att-btn" onClick={() => setResetting(s)}>🔑 Reset</button>
          <button className="att-btn" style={{borderColor:'#EF9A9A',color:'#C62828'}} onClick={() => handleDelete(s.id)}>🗑</button>
        </div>
      </div>
    );
  };

  // Etiqueta del grupo seleccionado (para el encabezado de la vista detalle)
  const selGroup = (filterGroup && filterGroup !== 'none') ? GROUPS.find(g => g.id === filterGroup) : null;
  const selTitle = filterGroup === 'none' ? '📭 Sin grupo' : (selGroup ? `${(LEVELS[selGroup.level]||{}).emoji||''} ${selGroup.name}` : '');

  return (
    <main>
      <button className="back-btn" onClick={onBack}>← Volver al panel</button>
      <div className="welcome teacher">
        <div className="welcome-text">
          <div className="eyebrow">👥 Gestión</div>
          <h1>Mis alumnos</h1>
          <p>{STUDENTS.length} alumno{STUDENTS.length === 1 ? '' : 's'} en {GROUPS.length} grupo{GROUPS.length === 1 ? '' : 's'}. Elige un grupo para revisarlo.</p>
        </div>
        <div className="welcome-actions" style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          <button className="btn-settings" onClick={() => setImporting(true)}>📋 Importar lista</button>
          <button className="btn-settings" onClick={() => openNew(selGroup ? selGroup.id : null)}>+ Nuevo alumno</button>
        </div>
      </div>

      {filterGroup === null ? (
        /* ───────── VISTA DE GRUPOS ───────── */
        <div className="scard" style={{marginTop:18}}>
          <div className="sm-filters">
            <input type="text" className="input-text" placeholder="🔍 Buscar a cualquier alumno por nombre o usuario…" value={search} onChange={e => setSearch(e.target.value)} style={{flex:1}} />
          </div>

          {q ? (
            <div className="sm-list">
              <div className="sm-meta" style={{margin:'2px 2px 8px',fontWeight:700}}>
                {list.length} resultado{list.length === 1 ? '' : 's'} para “{search}”
              </div>
              {list.length === 0
                ? <div className="empty-state"><div className="icon">🔍</div>Nadie coincide con esa búsqueda.</div>
                : list.map(StudentRow)}
            </div>
          ) : (
            <div className="mg-list" style={{marginTop:4}}>
              {groupsSorted.map(g => {
                const level = LEVELS[g.level] || { color:'#F9A825', dark:'#8a6d1a', emoji:'📘', code:'—' };
                const n = STUDENTS.filter(s => s.group === g.id).length;
                return (
                  <button key={g.id} className="mg-card" onClick={() => { setFilterGroup(g.id); setSearch(''); }}
                    style={{borderTopColor:level.color, textAlign:'left', width:'100%', cursor:'pointer', font:'inherit', display:'block'}}>
                    <div className="mg-card-head">
                      <span className="gcard-pill" style={{background:level.color+'18',color:level.dark,border:'1px solid '+level.color+'55',padding:'2px 9px',borderRadius:999,fontSize:11,fontWeight:800}}>
                        {level.emoji} {level.code}
                      </span>
                      <span className="mg-card-count">{n} alumno{n === 1 ? '' : 's'}</span>
                    </div>
                    <div className="mg-card-name">{g.name}</div>
                    <div className="mg-card-meta">⏰ {g.schedule || 'Sin horario'}</div>
                    <div className="mg-card-meta" style={{marginTop:10,color:level.dark,fontWeight:800}}>Ver alumnos →</div>
                  </button>
                );
              })}

              {ungrouped.length > 0 && (
                <button className="mg-card" onClick={() => { setFilterGroup('none'); setSearch(''); }}
                  style={{borderTopColor:'#C62828', textAlign:'left', width:'100%', cursor:'pointer', font:'inherit', display:'block'}}>
                  <div className="mg-card-head">
                    <span className="gcard-pill" style={{background:'#FDECEA',color:'#C62828',border:'1px solid #EF9A9A',padding:'2px 9px',borderRadius:999,fontSize:11,fontWeight:800}}>📭 Revisar</span>
                    <span className="mg-card-count">{ungrouped.length} alumno{ungrouped.length === 1 ? '' : 's'}</span>
                  </div>
                  <div className="mg-card-name">Sin grupo asignado</div>
                  <div className="mg-card-meta">Alumnos que se autoinscribieron o importaste sin grupo válido.</div>
                  <div className="mg-card-meta" style={{marginTop:10,color:'#C62828',fontWeight:800}}>Asignar grupo →</div>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ───────── VISTA DETALLE DE UN GRUPO ───────── */
        <div className="scard" style={{marginTop:18}}>
          <button className="back-btn" style={{marginTop:0,marginBottom:14}} onClick={() => { setFilterGroup(null); setSearch(''); }}>← Todos los grupos</button>
          <div className="sm-filters" style={{alignItems:'center'}}>
            <div style={{flex:1, minWidth:200}}>
              <div className="sm-name" style={{fontSize:16}}>{selTitle}</div>
              <div className="sm-meta">{list.length} alumno{list.length === 1 ? '' : 's'}{selGroup?.schedule ? ' · ⏰ '+selGroup.schedule : ''}</div>
            </div>
            <input type="text" className="input-text" placeholder="🔍 Buscar en este grupo…" value={search} onChange={e => setSearch(e.target.value)} style={{flex:1, minWidth:180}} />
          </div>

          <div className="sm-list">
            {list.length === 0
              ? <div className="empty-state"><div className="icon">👥</div>{search ? 'Nadie coincide con esa búsqueda.' : 'Este grupo aún no tiene alumnos.'}</div>
              : list.map(StudentRow)}
          </div>
        </div>
      )}

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
          defaultGroup={editGroupDefault}
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

function StudentFormModal({ student, defaultGroup, onClose, onSave }) {
  const { GROUPS, LEVELS } = window.JUCUM_DATA;
  const isEdit = !!student;
  const [fullName, setFullName] = smUseState(student?.fullName || '');
  const [username, setUsername] = smUseState(student?.username || '');
  const [groupId, setGroupId] = smUseState(student?.group || defaultGroup || GROUPS[0]?.id || '');
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
