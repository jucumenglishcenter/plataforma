/* Panel del Desarrollador (rol 'dev').
 * Reúne lo técnico/estructural que antes saturaba al profesor:
 *   módulos (contenido), grupos (estructura), exámenes (definir/subir),
 *   alumnos (alta/baja), promoción de nivel.
 * Resalta la sección activa (clase .active en el nav).
 */
function DevDashboard({ user, onLogout }) {
  const [view, setView] = React.useState('modules');
  React.useEffect(() => { document.body.removeAttribute('data-level'); }, []);

  const NAV = [
    { k:'modules',  label:'📦 Módulos' },
    { k:'manage',   label:'⚙️ Grupos' },
    { k:'exams',    label:'📑 Exámenes' },
    { k:'students', label:'👥 Alumnos' },
    { k:'promote',  label:'🎓 Promoción' },
    { k:'demo',     label:'🎬 Demostración' },
  ];

  return (
    <>
      <header className="app-header">
        <div className="app-logo">
          <img src={window.JUCUM_LOGO || 'logo-jucum.png'} alt="JUCUM EC" />
          <div className="pgtitle">Desarrollo · Plataforma</div>
        </div>
        <div className="app-right">
          <span className="role-pill t">🧑‍💻 Desarrollador</span>
          {NAV.map(n => (
            <a key={n.k} className={`nav-link ${view===n.k?'active':''}`} href="#"
               onClick={(e)=>{e.preventDefault();setView(n.k);}}>{n.label}</a>
          ))}
          <div className="user-pill"><div className="ava" style={{background:'linear-gradient(135deg,#455A64,#212121)'}}>D</div><span>Dev</span></div>
          <button className="logout-btn" onClick={onLogout} title="Cerrar sesión">⎋ Salir</button>
        </div>
      </header>

      {view === 'modules'  ? <ManageModules onBack={() => setView('modules')} />
       : view === 'manage'   ? <ManageGroups onBack={() => setView('manage')} />
       : view === 'exams'    ? <TeacherExams onBack={() => setView('exams')} />
       : view === 'students' ? <ManageStudents onBack={() => setView('students')} />
       : view === 'promote'  ? <LevelPromotion onBack={() => setView('promote')} />
       : view === 'demo'     ? <DevDemo />
       : <ManageModules onBack={() => setView('modules')} />}
    </>
  );
}

/* Modo demostración — sembrar / limpiar datos ficticios */
function DevDemo() {
  const DEMO = window.JUCUM_DEMO;
  const on = DEMO && DEMO.isDemo();
  return (
    <main>
      <div className="welcome teacher">
        <div className="welcome-text">
          <div className="eyebrow t">🎬 Demostración</div>
          <h1>Datos de demostración</h1>
          <p>Activa un escenario ficticio (alumnos, prácticas de ~2 meses, asistencia, tareas, un examen con notas y encuestas) para explorar toda la plataforma. <b>No toca tu base de datos real.</b></p>
        </div>
      </div>
      <div className="scard" style={{marginTop:18}}>
        <div className="sec-head"><div className="sec-title">{on ? '🟢 Modo demostración ACTIVO' : '⚪ Modo demostración apagado'}</div></div>
        <div className="settings-hint" style={{marginBottom:14}}>
          {on
            ? 'Estás viendo datos ficticios. Sal del modo demostración para volver a tu base real (no se pierde nada de tu base).'
            : 'Al activar, la plataforma usará datos ficticios en este navegador y NO se conectará a tu base de datos. Ideal para probar y capacitar.'}
        </div>
        <div className="row-flex" style={{gap:10}}>
          {!on
            ? <button className="btn-save" onClick={() => { if (confirm('¿Activar el modo demostración? Verás datos ficticios. Tu base real no se toca.')) DEMO.enableDemo(); }}>🎬 Activar demostración</button>
            : <>
                <button className="btn-save" onClick={() => DEMO.enableDemo()}>🔄 Regenerar datos demo</button>
                <button className="att-btn" style={{borderColor:'#EF9A9A',color:'#C62828'}} onClick={() => { if (confirm('¿Salir del modo demostración y borrar los datos ficticios? Volverás a tu base real.')) DEMO.disableDemo(); }}>🧹 Salir y limpiar</button>
              </>}
        </div>
        <div className="settings-hint" style={{marginTop:14, paddingTop:14, borderTop:'1px dashed var(--border)'}}>
          <b>Para volver a “día 1” en tu base real</b> (sin alumnos ni grupos, listo para registrar desde cero): usa el script <code>reiniciar_dia1.sql</code> de la carpeta de Supabase. Conserva la plataforma y los usuarios del staff; solo borra alumnos, grupos y su actividad.
        </div>
      </div>
    </main>
  );
}

Object.assign(window, { DevDashboard });
