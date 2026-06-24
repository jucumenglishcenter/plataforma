/* Panel del Desarrollador (rol 'dev').
 * Reúne lo técnico/estructural que antes saturaba al profesor:
 *   módulos (contenido), grupos (estructura), exámenes (definir/subir),
 *   alumnos (alta/baja), promoción de nivel.
 * Resalta la sección activa (clase .active en el nav).
 */
function DevDashboard({ user, onLogout }) {
  const [view, setView] = React.useState(() => (window.JUCUM_NAV ? window.JUCUM_NAV.load('dev', 'modules') : 'modules'));
  React.useEffect(() => { if (window.JUCUM_NAV) window.JUCUM_NAV.save('dev', view); }, [view]);
  React.useEffect(() => { document.body.removeAttribute('data-level'); }, []);

  const NAV = [
    { k:'modules',  label:'📦 Módulos' },
    { k:'manage',   label:'⚙️ Grupos' },
    { k:'exams',    label:'📑 Exámenes' },
    { k:'students', label:'👥 Alumnos' },
    { k:'promote',  label:'🎓 Promoción' },
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
       : view === 'exams'    ? <TeacherExams canDefine onBack={() => setView('exams')} />
       : view === 'students' ? <ManageStudents onBack={() => setView('students')} />
       : view === 'promote'  ? <LevelPromotion onBack={() => setView('promote')} />
       : <ManageModules onBack={() => setView('modules')} />}
    </>
  );
}

Object.assign(window, { DevDashboard });
