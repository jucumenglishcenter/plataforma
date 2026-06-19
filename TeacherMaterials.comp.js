/* Bloque H · Materiales del profesor
 * Acceso LIBRE a todos los niveles/módulos y sus actividades, para dar clase.
 * Sin pausas/cooldown (abre con ?jucum_teacher=1) y sin registrar progreso.
 * Dos vistas: "Por grupo" (lo que cada grupo ve hoy) y "Por nivel" (todo).
 */

const { useState: tmUseState } = React;

function tmTypeIcon(t) {
  return { story:'📗', reading:'📖', listening:'🎧', grammar:'📝', summary:'📚', quizlet:'🃏', exam:'📑' }[t] || '📄';
}

/* URL del material en modo profesor (libre, sin registrar) */
function tmLink(a, mod) {
  // Sin url real, el material aún no está disponible (no usamos muestras locales
  // que no existen en producción).
  const base = a.url || null;
  if (!base) return null;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}jucum_teacher=1&jucum_mod=${encodeURIComponent(mod.id)}&jucum_act=${encodeURIComponent(a.id)}`;
}

/* Lista de actividades de un módulo, agrupadas por tema, todas abiertas */
function TmModule({ mod, defaultOpen }) {
  const [open, setOpen] = tmUseState(!!defaultOpen);
  const acts = mod.activities || [];
  const withUrl = acts.filter(a => a.url).length;

  // agrupar consecutivas por a.group (tema)
  const segments = [];
  acts.forEach(a => {
    const g = a.group || null;
    const last = segments[segments.length - 1];
    if (last && last.group === g) last.items.push(a);
    else segments.push({ group: g, items: [a] });
  });
  let topicNum = 0;

  const Row = (a) => {
    const href = tmLink(a, mod);
    return (
      <a key={a.id} className={`al-item ${href ? 'open' : 'locked'}`} href={href || undefined} target={href ? '_blank' : undefined} rel="noreferrer">
        <span className="al-ico">{tmTypeIcon(a.type)}</span>
        <span className="al-name">{a.name}</span>
        {href ? <span className="al-arr">↗</span> : <span className="al-score" style={{background:'#EEEAE0',color:'#8A7F6A'}}>📚 en preparación</span>}
      </a>
    );
  };

  return (
    <div className="scard" style={{padding:14}}>
      <div className="sec-head" style={{cursor:'pointer', marginBottom: open ? 12 : 0}} onClick={() => setOpen(o => !o)}>
        <div className="sec-title" style={{fontSize:15}}>{mod.emoji} {mod.name}</div>
        <span className="sec-meta">{acts.length} act. · {withUrl} con material <span className={`tg-arr ${open?'open':''}`} style={{marginLeft:6}}>▾</span></span>
      </div>
      {open && (
        <div className="al-items">
          {segments.map((seg, si) => {
            if (!seg.group) return seg.items.map(Row);
            topicNum++;
            return (
              <div key={'g'+si} className="tg" style={{marginTop: si>0?6:0}}>
                <div className="tg-head" style={{cursor:'default'}}>
                  <span className="tg-num">{topicNum}</span>
                  <span className="tg-name">{seg.group}</span>
                  <span className="tg-meta">{seg.items.length}</span>
                </div>
                <div className="tg-items">{seg.items.map(Row)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TeacherMaterials({ onBack }) {
  const { MODULE_CATALOG, LEVELS, GROUPS, getGroupSettings } = window.JUCUM_DATA;
  const [tab, setTab] = tmUseState('groups'); // 'groups' | 'pre-a1' | 'a1' | 'a2'

  return (
    <main>
      <button className="back-btn" onClick={onBack}>← Volver al panel</button>
      <div className="welcome teacher">
        <div className="welcome-text">
          <div className="eyebrow">📚 Materiales</div>
          <h1>Biblioteca de clase</h1>
          <p>Abre cualquier material libremente para proyectarlo en clase — sin pausas ni esperas, y sin afectar el progreso de los alumnos.</p>
        </div>
      </div>

      <div className="mm-tabs">
        <button className={`mm-tab ${tab==='groups'?'on':''}`} onClick={() => setTab('groups')}>👥 Por grupo</button>
        {Object.entries(LEVELS).map(([k, lv]) => (
          <button key={k} className={`mm-tab ${tab===k?'on':''}`} onClick={() => setTab(k)}>
            {lv.emoji} {lv.code} <span className="mm-count">{(MODULE_CATALOG[k]||[]).length}</span>
          </button>
        ))}
      </div>

      {tab === 'groups' ? (
        <div style={{display:'flex', flexDirection:'column', gap:18}}>
          {GROUPS.map(g => {
            const lv = LEVELS[g.level];
            const settings = getGroupSettings(g.id);
            const activeIds = (settings.activeModuleIds && settings.activeModuleIds.length)
              ? settings.activeModuleIds : (settings.activeModuleId ? [settings.activeModuleId] : []);
            const mods = (MODULE_CATALOG[g.level] || []).filter(m => activeIds.includes(m.id));
            return (
              <div key={g.id}>
                <div className="sec-head">
                  <div className="sec-title">{lv.emoji} {g.name}</div>
                  <span className="sec-meta">{g.schedule} · {mods.length} módulo{mods.length===1?'':'s'} activo{mods.length===1?'':'s'}</span>
                </div>
                {mods.length === 0
                  ? <div className="scard"><div className="empty-state" style={{padding:'24px'}}>Este grupo no tiene módulos activos. Actívalos en ⚙️ Grupos.</div></div>
                  : <div style={{display:'flex', flexDirection:'column', gap:10}}>{mods.map(m => <TmModule key={m.id} mod={m} defaultOpen={mods.length===1} />)}</div>}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:10}}>
          {(MODULE_CATALOG[tab] || []).length === 0
            ? <div className="scard"><div className="empty-state">Sin módulos en este nivel.</div></div>
            : (MODULE_CATALOG[tab] || []).map(m => <TmModule key={m.id} mod={m} />)}
        </div>
      )}
    </main>
  );
}

Object.assign(window, { TeacherMaterials, TmModule });
