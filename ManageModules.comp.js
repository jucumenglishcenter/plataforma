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
  const [importing, setImporting] = mmUseState(false);
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

  /* Importa un catalogo.json publicado junto a los materiales en GitHub Pages.
   * Si ya existe un módulo con el mismo nombre en este nivel → lo actualiza
   * (conserva su id, no rompe el progreso); si no → lo crea. */
  const handleImport = (cat) => {
    const valid = new Set(MM_TYPES.map(t => t.v));
    const acts = (cat.activities || []).map((a, i) => ({
      id: String(a.id || ('imp' + i)),
      type: valid.has(a.type) ? a.type : 'grammar',
      name: String(a.name || '').trim(),
      group: String(a.group || '').trim() || undefined,
      url: String(a.url || '').trim() || undefined,
      open: a.open === true || undefined,
    }));
    const data = {
      name: String(cat.module || cat.name || '').trim(),
      emoji: String(cat.emoji || '📦').trim(),
      topics: Array.isArray(cat.topics) ? cat.topics.map(t => String(t).trim()).filter(Boolean) : [],
      activities: acts,
    };
    const idx = mods.findIndex(m => m.name.trim().toLowerCase() === data.name.toLowerCase());
    if (idx >= 0) {
      mods[idx] = { ...mods[idx], ...data };
      persist(mods[idx], idx);
    } else {
      const id = level.replace('-','') + '-m' + Date.now().toString(36);
      const mod = { id, ...data };
      mods.push(mod);
      persist(mod, mods.length - 1);
    }
    setImporting(false);
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
        <div className="mm-head-btns" style={{display:'flex', gap:10, flexWrap:'wrap'}}>
          <button className="btn-settings" onClick={() => setImporting(true)}>📥 Importar catálogo</button>
          <button className="btn-settings" onClick={() => setEditing('new')}>+ Nuevo módulo</button>
        </div>
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

      {importing && (
        <CatalogImportModal
          level={level}
          levelLabel={(LEVELS[level] || {}).code || level}
          existingNames={mods.map(m => m.name.trim().toLowerCase())}
          onClose={() => setImporting(false)}
          onImport={handleImport}
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
      activities: acts.map(a => ({ id:a.id, type:a.type, name:a.name.trim(), group:(a.group||'').trim() || undefined, url:(a.url||'').trim() || undefined, open:a.open || undefined })),
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

/* Modal: importar catalogo.json desde GitHub Pages — registra todo el módulo de golpe */
function CatalogImportModal({ level, levelLabel, existingNames, onClose, onImport }) {
  const [url, setUrl] = mmUseState('');
  const [busy, setBusy] = mmUseState(false);
  const [err, setErr] = mmUseState('');
  const [preview, setPreview] = mmUseState(null);

  const fetchCatalog = () => {
    const u = url.trim();
    if (!u) { setErr('Pega la URL del catalogo.json.'); return; }
    setBusy(true); setErr(''); setPreview(null);
    fetch(u)
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status + ' — ¿ya está subido a GitHub? (espera ~1 min tras el commit)'); return r.json(); })
      .then(cat => {
        if (!cat || !Array.isArray(cat.activities) || cat.activities.length === 0) throw new Error('El archivo no tiene actividades. ¿Es un catalogo.json válido?');
        if (!(cat.module || cat.name)) throw new Error('El catálogo no tiene nombre de módulo.');
        setPreview(cat);
      })
      .catch(e => setErr(e.message === 'Failed to fetch' ? 'No se pudo descargar. Revisa la URL (debe ser el link público de GitHub Pages, no el de github.com).' : e.message))
      .finally(() => setBusy(false));
  };

  const counts = preview ? preview.activities.reduce((acc, a) => { acc[a.type] = (acc[a.type] || 0) + 1; return acc; }, {}) : {};
  const nUrls = preview ? preview.activities.filter(a => a.url).length : 0;
  const modName = preview ? String(preview.module || preview.name || '') : '';
  const willUpdate = preview && existingNames.includes(modName.trim().toLowerCase());

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" style={{maxWidth:560}} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">📥 Importar catálogo → nivel {levelLabel}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="settings-hint" style={{marginBottom:12}}>
            Pega la URL pública del <b>catalogo.json</b> que viene junto a los materiales del módulo
            (ej: <code>https://jucumenglishcenter.github.io/A2/A2_M1/catalogo.json</code>).
            Se registrarán todas las actividades de golpe en el nivel <b>{levelLabel}</b> — verifica estar en la pestaña correcta.
          </div>
          <div style={{display:'flex', gap:8}}>
            <input className="input-text" style={{flex:1}} placeholder="https://…/catalogo.json" value={url}
              onChange={e => setUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') fetchCatalog(); }} />
            <button className="btn-save" onClick={fetchCatalog} disabled={busy}>{busy ? '⏳…' : 'Leer'}</button>
          </div>
          {err && <div className="err" style={{marginTop:12}}>⚠ {err}</div>}

          {preview && (
            <div className="scard" style={{marginTop:14, padding:'14px 16px'}}>
              <div style={{fontWeight:800, fontSize:'1.05rem'}}>{preview.emoji || '📦'} {modName}</div>
              <div className="mm-meta" style={{margin:'6px 0'}}>
                {preview.activities.length} actividades · {nUrls}/{preview.activities.length} con URL
                {nUrls < preview.activities.length && <span className="mm-warn"> ⚠ faltan URLs</span>}
              </div>
              <div className="mm-topics">
                {Object.entries(counts).map(([t, n]) => <span key={t} className="mm-chip">{n} × {t}</span>)}
              </div>
              {willUpdate && (
                <div className="settings-hint" style={{marginTop:8}}>
                  ♻️ Ya existe un módulo “{modName}” en {levelLabel}: se <b>actualizará</b> (mismo id, el progreso de los alumnos se conserva).
                </div>
              )}
            </div>
          )}

          <div className="modal-actions">
            <button className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button className="btn-save" disabled={!preview} onClick={() => onImport(preview)}>
              {willUpdate ? '♻️ Actualizar módulo' : '📥 Importar módulo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ManageModules, ModuleFormModal, CatalogImportModal });
