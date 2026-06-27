/* Gestor de Módulos — el profesor crea/edita módulos y actividades sin código.
 * Catálogo guardado en Supabase (tabla module_catalog) + cache local.
 * Las actividades pueden tener "group" (tema) → el alumno las ve agrupadas
 * en temas numerados expandibles, como las carpetas T1/T2/T3 de GitHub.
 */

const { useState: mmUseState } = React;

const MM_TYPES = [
  { v:'story',     l:'📗 Story / Diálogo (sin quiz, por tiempo)' },
  { v:'reading',   l:'📖 Comprensión lectora (con quiz)' },
  { v:'listening', l:'🎧 Comprensión auditiva (con quiz)' },
  { v:'grammar',   l:'📝 Práctica de gramática (con quiz)' },
  { v:'summary',   l:'📚 Resumen de gramática (+5 MCQ)' },
  { v:'quizlet',   l:'🃏 Quizlet / Vocabulario' },
];

function ManageModules({ onBack }) {
  const { MODULE_CATALOG, LEVELS } = window.JUCUM_DATA;
  const [level, setLevel] = mmUseState('pre-a1');
  const [editing, setEditing] = mmUseState(null); // 'new' | module object
  const [tick, setTick] = mmUseState(0);
  const refresh = () => setTick(t => t + 1);
  const mods = MODULE_CATALOG[level] || [];

  const persist = (mod, idx) => {
    if (window.JUCUM_SYNC?.pushModule) window.JUCUM_SYNC.pushModule(level, mod, idx);
    try { localStorage.setItem('jucum_module_catalog_cache', JSON.stringify(MODULE_CATALOG)); } catch {}
  };

  const handleSave = (data) => {
    if (editing === 'new') {
      const id = level.replace('-','') + '-m' + Date.now().toString(36);
      const mod = { id, ...data };
      mods.push(mod);
      persist(mod, mods.length - 1);
    } else {
      const idx = mods.findIndex(m => m.id === editing.id);
      if (idx >= 0) { mods[idx] = { ...mods[idx], ...data }; persist(mods[idx], idx); }
    }
    setEditing(null);
    refresh();
  };

  const handleDelete = (mod) => {
    if (!confirm(`¿Eliminar el módulo "${mod.name}"? Los alumnos perderán acceso a sus actividades.`)) return;
    const idx = mods.findIndex(m => m.id === mod.id);
    mods.splice(idx, 1);
    if (window.JUCUM_SYNC?.deleteModuleDb) window.JUCUM_SYNC.deleteModuleDb(mod.id);
    try { localStorage.setItem('jucum_module_catalog_cache', JSON.stringify(MODULE_CATALOG)); } catch {}
    refresh();
  };

  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= mods.length) return;
    [mods[i], mods[j]] = [mods[j], mods[i]];
    mods.forEach((m, k) => persist(m, k));
    refresh();
  };

  return (
    <main>
      <button className="back-btn" onClick={onBack}>← Volver al panel</button>
      <div className="welcome teacher">
        <div className="welcome-text">
          <div className="eyebrow">📦 Contenido</div>
          <h1>Módulos y actividades</h1>
          <p>Crea los módulos de cada nivel y pega las URLs de tus materiales de GitHub.</p>
        </div>
        <button className="btn-settings" onClick={() => setEditing('new')}>+ Nuevo módulo</button>
      </div>

      <div className="mm-tabs">
        {Object.entries(LEVELS).map(([k, lv]) => (
          <button key={k} className={`mm-tab ${level === k ? 'on' : ''}`} onClick={() => setLevel(k)}>
            {lv.emoji} {lv.code} <span className="mm-count">{(MODULE_CATALOG[k]||[]).length}</span>
          </button>
        ))}
      </div>

      <div className="mm-list">
        {mods.length === 0 ? (
          <div className="empty-state"><div className="icon">📦</div>Sin módulos en este nivel. Crea el primero.</div>
        ) : mods.map((m, i) => {
          const nGroups = new Set(m.activities.filter(a => a.group).map(a => a.group)).size;
          const nUrls = m.activities.filter(a => a.url).length;
          return (
            <div key={m.id} className="mm-card scard">
              <div className="mm-emoji">{m.emoji}</div>
              <div className="mm-info">
                <div className="mm-name">M{i+1} · {m.name}</div>
                <div className="mm-meta">
                  {m.activities.length} actividades{nGroups > 0 && ` · ${nGroups} temas`} · {nUrls}/{m.activities.length} con URL
                  {nUrls < m.activities.length && <span className="mm-warn"> ⚠ faltan URLs</span>}
                </div>
                <div className="mm-topics">{(m.topics||[]).map(t => <span key={t} className="mm-chip">{t}</span>)}</div>
              </div>
              <div className="mm-actions">
                <button className="att-btn" onClick={() => move(i,-1)} disabled={i===0}>↑</button>
                <button className="att-btn" onClick={() => move(i,1)} disabled={i===mods.length-1}>↓</button>
                <button className="att-btn" onClick={() => setEditing(m)}>✏️ Editar</button>
                <button className="att-btn" style={{borderColor:'#EF9A9A',color:'#C62828'}} onClick={() => handleDelete(m)}>🗑</button>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <ModuleFormModal
          mod={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </main>
  );
}

function ModuleFormModal({ mod, onClose, onSave }) {
  const isEdit = !!mod;
  const [name, setName] = mmUseState(mod?.name || '');
  const [emoji, setEmoji] = mmUseState(mod?.emoji || '📦');
  const [topics, setTopics] = mmUseState((mod?.topics || []).join(', '));
  const [acts, setActs] = mmUseState(mod ? mod.activities.map(a => ({...a})) : []);
  const [err, setErr] = mmUseState('');

  const addAct = (type) => {
    const id = 'a' + (Date.now().toString(36)) + Math.random().toString(36).slice(2,4);
    setActs([...acts, { id, type, name:'', group:'', url:'' }]);
  };
  const setAct = (i, k, v) => { const n = [...acts]; n[i] = { ...n[i], [k]: v }; setActs(n); };
  const delAct = (i) => setActs(acts.filter((_, j) => j !== i));
  const moveAct = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= acts.length) return;
    const n = [...acts]; [n[i], n[j]] = [n[j], n[i]]; setActs(n);
  };

  const save = () => {
    if (!name.trim()) { setErr('El nombre del módulo es obligatorio.'); return; }
    if (acts.length === 0) { setErr('Agrega al menos una actividad.'); return; }
    if (acts.some(a => !a.name.trim())) { setErr('Toda actividad necesita un nombre.'); return; }
    onSave({
      name: name.trim(), emoji: emoji.trim() || '📦',
      topics: topics.split(',').map(t => t.trim()).filter(Boolean),
      activities: acts.map(a => ({ id:a.id, type:a.type, name:a.name.trim(), group:(a.group||'').trim() || undefined, url:(a.url||'').trim() || undefined })),
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" style={{maxWidth:760}} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{isEdit ? '✏️ Editar módulo' : '➕ Nuevo módulo'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {err && <div className="err" style={{marginBottom:12}}>⚠ {err}</div>}

          <div className="mm-form-row">
            <div className="settings-block" style={{flex:'0 0 80px'}}>
              <div className="settings-label">Emoji</div>
              <input className="input-text" value={emoji} onChange={e => setEmoji(e.target.value)} style={{textAlign:'center'}} />
            </div>
            <div className="settings-block" style={{flex:1}}>
              <div className="settings-label">Nombre del módulo</div>
              <input className="input-text" value={name} onChange={e => setName(e.target.value)} placeholder="Personal Identity" />
            </div>
          </div>

          <div className="settings-block">
            <div className="settings-label">Temas de gramática (separados por coma)</div>
            <input className="input-text" value={topics} onChange={e => setTopics(e.target.value)} placeholder="Pronouns, To be, There is/are" />
          </div>

          <div className="settings-block">
            <div className="settings-label">Actividades ({acts.length})</div>
            <div className="settings-hint">El campo <b>Tema</b> agrupa actividades (ej: "T1 · Pronouns") — el alumno las ve como temas numerados expandibles. Déjalo vacío para actividades sueltas. La <b>URL</b> es el link del material en GitHub Pages.</div>
            <div className="mm-acts">
              {acts.map((a, i) => (
                <div key={a.id} className="mm-act-row">
                  <select className="input-text mm-act-type" value={a.type} onChange={e => setAct(i,'type',e.target.value)}>
                    {MM_TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                  </select>
                  <input className="input-text" placeholder="Nombre (ej: Fill in)" value={a.name} onChange={e => setAct(i,'name',e.target.value)} />
                  <input className="input-text" placeholder="Tema (opcional)" value={a.group||''} onChange={e => setAct(i,'group',e.target.value)} />
                  <input className="input-text" placeholder="URL del material (GitHub Pages)" value={a.url||''} onChange={e => setAct(i,'url',e.target.value)} />
                  <div className="mm-act-btns">
                    <button type="button" className="att-btn" onClick={() => moveAct(i,-1)} disabled={i===0}>↑</button>
                    <button type="button" className="att-btn" onClick={() => moveAct(i,1)} disabled={i===acts.length-1}>↓</button>
                    <button type="button" className="att-btn" style={{borderColor:'#EF9A9A',color:'#C62828'}} onClick={() => delAct(i)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mm-add-row">
              {MM_TYPES.map(t => (
                <button key={t.v} type="button" className="att-btn" onClick={() => addAct(t.v)}>+ {t.l.split(' ')[0]} {t.l.split(' ')[1]}</button>
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button className="btn-save" onClick={save}>{isEdit ? '💾 Guardar cambios' : '➕ Crear módulo'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ManageModules, ModuleFormModal });
