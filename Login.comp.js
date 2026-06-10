/* Login screen — role toggle (alumno / profesor), username + password.
 * Uses Supabase when available (window.JUCUM_SB), else falls back to local demo data. */

function Login({ onLogin }) {
  const [role, setRole] = React.useState('student');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [err, setErr] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');

    // ── Supabase path ──
    if (window.JUCUM_SB) {
      setBusy(true);
      try {
        const res = await window.JUCUM_SB.login(username, password);
        if (!res.ok) { setErr(res.reason || 'Usuario o contraseña incorrectos.'); setBusy(false); return; }
        if (role === 'teacher' && res.session.role !== 'teacher') { setErr('Esa cuenta no es de profesor.'); setBusy(false); return; }
        if (role === 'student' && res.session.role !== 'student') { setErr('Esa cuenta es de profesor. Cambia a la pestaña Profesor.'); setBusy(false); return; }
        onLogin(res.session);
      } catch (e2) {
        setErr('Error de conexión: ' + e2.message);
        setBusy(false);
      }
      return;
    }

    // ── Local fallback (no Supabase loaded) ──
    const { DEMO_CREDS, STUDENTS } = window.JUCUM_DATA;
    if (role === 'teacher') {
      if (username === DEMO_CREDS.teacher.username && password === DEMO_CREDS.teacher.password) {
        onLogin({ role:'teacher', name:'Profesor JUCUM' });
      } else { setErr('Usuario o contraseña incorrectos.'); }
      return;
    }
    const stu = STUDENTS.find(s => s.username === username);
    if (stu && password === '1234') {
      onLogin({ role:'student', studentId: stu.id, name: stu.fullName, level: stu.level, groupId: stu.group });
    } else { setErr('Usuario o contraseña incorrectos.'); }
  };

  const useDemo = (kind) => {
    if (kind === 'student') { setUsername('leo.cruz'); setPassword('1234'); }
    else { setUsername('profesor'); setPassword('1234'); }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-logo">
          <img src="logo-jucum.png" alt="JUCUM English Center" />
        </div>
        <div className="login-title">Plataforma de aprendizaje</div>
        <div className="login-sub">Ingresa con tu usuario para acceder a tus materiales.</div>

        <div className="role-toggle">
          <button type="button" className={`s ${role==='student'?'on':''}`} onClick={()=>setRole('student')}>🎓 Alumno</button>
          <button type="button" className={`t ${role==='teacher'?'on':''}`} onClick={()=>setRole('teacher')}>👨‍🏫 Profesor</button>
        </div>

        {err && <div className="err">⚠ {err}</div>}

        <div className="field">
          <label>Usuario</label>
          <input type="text" value={username} onChange={e=>setUsername(e.target.value)}
                 placeholder={role==='student' ? 'leo.cruz' : 'profesor'}
                 autoComplete="username" />
        </div>
        <div className="field">
          <label>Contraseña</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                 placeholder="••••" autoComplete="current-password" />
        </div>

        <button type="submit" className={`btn-go ${role==='teacher'?'t':''}`} disabled={busy}>
          {busy ? 'Verificando…' : (role==='student' ? 'Ingresar →' : 'Acceder al panel →')}
        </button>

        <div className="login-help">
          ¿No tienes usuario? Pídele al profesor que te cree uno.<br/>
          <b>JUCUM English Center</b> · Tingo María, Perú
        </div>
      </form>
    </div>
  );
}

Object.assign(window, { Login });
