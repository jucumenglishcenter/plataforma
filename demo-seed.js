/* Bloque P · Datos de demostración
 * Crea un escenario "como si lleváramos 2 meses": asistencia, tareas (entregadas
 * y calificadas), un examen con resultados, y encuestas — sobre el roster local.
 * El historial de prácticas lo siembra data.js (seedDemoProgress).
 *
 * Modo demostración: enableDemo() activa una bandera y hace que App ignore
 * Supabase (no toca tu base real). disableDemo() limpia los datos demo y
 * reconecta a tu base. Solo afecta claves 'jucum_*' del navegador (caché).
 */
(function () {
  const DAY = 86400000;
  const DEMO_FLAG = 'jucum_demo_mode';
  const DEMO_KEYS = [
    'jucum_student_progress_v1','jucum_attendance_v1','jucum_assignments_v1',
    'jucum_submissions_v1','jucum_exams_v1','jucum_exam_windows_v1',
    'jucum_surveys_v1','jucum_league_v1','jucum_notifications_v1','jucum_evaluations_v1',
    'jucum_payments_v1','jucum_registrations_v1','jucum_churn_v1','jucum_pay_config_v1',
  ];

  const isDemo = () => { try { return localStorage.getItem(DEMO_FLAG) === '1'; } catch { return false; } };
  // En modo demostración, desconectamos Supabase por completo para que NADA
  // toque tu base real y los datos ficticios no sean sobrescritos por la nube.
  if (isDemo()) { try { window.JUCUM_SB = null; } catch {} }
  function hash(s){let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return Math.abs(h);}
  function rng(seed){let x=seed||1;return()=>{x=(x*1103515245+12345)&0x7fffffff;return x/0x7fffffff;};}
  const iso = (d) => d.toISOString();

  function seedAttendance(D) {
    const map = {};
    const classDays = []; // últimos 56 días, lunes y miércoles
    for (let i = 56; i >= 0; i--) { const d = new Date(Date.now()-i*DAY); const dow=d.getDay(); if (dow===1||dow===3) classDays.push(d); }
    D.STUDENTS.forEach(s => {
      const r = rng(hash(s.id+'att'));
      const attendRate = Math.min(0.98, 0.55 + (s.avgScore/100)*0.45);
      classDays.forEach(d => {
        const key = d.toISOString().slice(0,10);
        map[key] = map[key] || {};
        const roll = r();
        let status = 'asistio';
        if (roll > attendRate) status = (r() < 0.4) ? 'justifico' : 'falto';
        map[key][s.id] = { status, participation: status==='asistio' ? Math.floor(r()*4) : 0, note:'', groupId: s.group };
      });
    });
    localStorage.setItem('jucum_attendance_v1', JSON.stringify(map));
  }

  function seedTasks(D) {
    const assigns = []; const subs = {};
    D.GROUPS.forEach(g => {
      const members = D.STUDENTS.filter(s => s.group === g.id);
      if (!members.length) return;
      const t1 = { id:'as-demo-'+g.id+'-1', groupId:g.id, targetStudentIds:[], title:'Lee tu Story en voz alta y súbela', description:'Graba tu lectura (máx 10 min) y adjúntala.', dueAt: iso(new Date(Date.now()+5*DAY)), gradable:true, attachments:[], xp:40, date: iso(new Date(Date.now()-20*DAY)) };
      const t2 = { id:'as-demo-'+g.id+'-2', groupId:g.id, targetStudentIds:[], title:'Repasa el resumen de gramática', description:'Sin entrega de archivo — solo marca como hecho.', dueAt: iso(new Date(Date.now()+2*DAY)), gradable:false, attachments:[], xp:25, date: iso(new Date(Date.now()-8*DAY)) };
      assigns.push(t1, t2);
      [t1, t2].forEach(t => {
        subs[t.id] = {};
        members.forEach(s => {
          const r = rng(hash(s.id+t.id));
          if (r() < 0.7) {
            const graded = t.gradable && r() < 0.6;
            subs[t.id][s.id] = { id:'sub-'+s.id+t.id, submittedAt: iso(new Date(Date.now()-Math.floor(r()*15)*DAY)), text:'', attachments:[],
              status: graded ? 'graded' : 'submitted', grade: graded ? Math.floor(60+r()*40) : null, feedback: graded ? '¡Buen trabajo! Cuida la pronunciación.' : null, gradedAt: graded ? iso(new Date()) : null };
          }
        });
      });
    });
    localStorage.setItem('jucum_assignments_v1', JSON.stringify(assigns));
    localStorage.setItem('jucum_submissions_v1', JSON.stringify(subs));
  }

  function seedExams(D) {
    const exams = [{
      id:'ex-demo-1', level:'pre-a1', moduleIds:['pa1-m1'], title:'Examen de avance · Módulo 1',
      parts:[
        { competency:'listening', name:'Listening', url:'', weight:25 },
        { competency:'reading', name:'Reading', url:'', weight:25 },
        { competency:'grammar', name:'Grammar', url:'', weight:30 },
        { competency:'speaking', name:'Speaking (sube tu audio)', url:'', weight:20 },
      ], date: iso(new Date(Date.now()-10*DAY)),
    }];
    const wins = [];
    const g1 = (D.GROUPS.find(g => g.level==='pre-a1')) || D.GROUPS[0];
    if (g1) {
      const members = D.STUDENTS.filter(s => s.group === g1.id);
      const results = {};
      members.forEach(s => {
        const r = rng(hash(s.id+'exam'));
        // solo los aptos rindieron
        const rd = D.getStudentReadiness(s);
        if (rd.overall >= 60 && r() < 0.8) {
          const grade = Math.max(50, Math.min(100, Math.round(rd.overall + (r()*20-8))));
          results[s.id] = { grade, passed: grade>=70, feedback: grade>=70?'¡Aprobado! Buen dominio del módulo.':'Refuerza gramática y vuelve a intentarlo.', gradedAt: iso(new Date(Date.now()-3*DAY)) };
        }
      });
      wins.push({ id:'ew-demo-1', examId:'ex-demo-1', groupId:g1.id, targetStudentIds:[], isOpen:true, closesAt:null, allowOverrides:[], results, submissions:{}, published:true, date: iso(new Date(Date.now()-5*DAY)) });
    }
    localStorage.setItem('jucum_exams_v1', JSON.stringify(exams));
    localStorage.setItem('jucum_exam_windows_v1', JSON.stringify(wins));
  }

  function seedSurveys(D) {
    const all = {};
    D.STUDENTS.forEach(s => {
      const r = rng(hash(s.id+'sv'));
      if (r() < 0.5) {
        const sat = Math.floor(3 + r()*3); // 3..5
        all[s.id] = [{ date: iso(new Date(Date.now()-Math.floor(r()*20)*DAY)), satisfaction: sat,
          recommend: sat>=4?'si':'tal_vez', continue_plan: sat>=4?'si':'no_se',
          suggestion: r()<0.4 ? 'Me gustaría más práctica de speaking en clase.' : '' }];
      }
    });
    localStorage.setItem('jucum_surveys_v1', JSON.stringify(all));
  }

  function seedPayments(D) {
    const MODES = ['mensual','modulo','total'];
    const period = new Date().toISOString().slice(0,7);
    const arr = [];
    D.STUDENTS.forEach((s, idx) => {
      const r = rng(hash(s.id+'pay'));
      // algunos NO pagaron este periodo → quedarán "por vencer" (semana de pago)
      if (idx % 6 === 2) return;
      const mode = s.level === 'pre-a1' ? 'mensual' : MODES[Math.floor(r()*MODES.length)];
      // estado: la mayoría confirmado, algunos por confirmar, alguno rechazado
      let status = 'confirmado';
      if (idx % 5 === 0) status = 'por_confirmar';
      else if (idx % 7 === 0) status = 'rechazado';
      const regAt = new Date(Date.now() - Math.floor(r()*20)*DAY).toISOString();
      arr.push({
        id:'pay-demo-'+s.id, studentId:s.id, dni:String(70000000+Math.floor(r()*9999999)),
        mode, level:s.level, moduleId:null, amount: mode==='mensual'?120:mode==='modulo'?200:600,
        period, screenshot:null, status,
        note: status==='rechazado'?'El voucher no es legible, vuelve a subirlo.':'',
        registeredAt: regAt, confirmedAt: status==='confirmado'?regAt:null,
      });
    });
    localStorage.setItem('jucum_payments_v1', JSON.stringify(arr));
  }

  function seedAll() {
    const D = window.JUCUM_DATA; if (!D) return;
    seedAttendance(D); seedTasks(D); seedExams(D); seedSurveys(D); seedPayments(D);
    seedInscripciones(D); seedChurn(D); seedPayConfig(D);
  }

  /* Control de pagos ACTIVADO + día de pago hace 3 días → algunos en "semana de pago" */
  function seedPayConfig(D) {
    const today = new Date().getDate();
    const payDay = Math.max(1, Math.min(28, today - 3));
    localStorage.setItem('jucum_pay_config_v1', JSON.stringify({
      enforce: true, payDay, currency: 'S/', graceDays: 7, exceptions: {},
      amounts: { 'pre-a1':{mensual:120}, 'a1':{mensual:150,modulo:250}, 'a2':{mensual:150,modulo:250} },
    }));
  }

  /* Inscripciones pendientes del link de autoregistro (ejemplos) */
  function seedInscripciones(D) {
    const now = Date.now();
    const regs = [
      { id:'reg-demo-1', fullName:'Camila Ríos', email:'camila.rios@email.com', age:24, dni:'72119045', payMode:'mensual', level:'pre-a1', status:'pendiente', createdAt:new Date(now-2*DAY).toISOString() },
      { id:'reg-demo-2', fullName:'Diego Salas', email:'diego.salas@email.com', age:15, dni:'81230456', guardianName:'María Salas', guardianDni:'40118822', payMode:'total', level:'pre-a1', status:'pendiente', createdAt:new Date(now-1*DAY).toISOString() },
      { id:'reg-demo-3', fullName:'Valeria Núñez', email:'valeria.n@email.com', age:30, dni:'45992011', payMode:'modulo', level:'a1', status:'pendiente', createdAt:new Date(now-5*3600*1000).toISOString() },
    ];
    localStorage.setItem('jucum_registrations_v1', JSON.stringify(regs));
  }

  /* Bajas históricas (para que el panel de retención tenga datos) */
  function seedChurn(D) {
    const now = Date.now();
    const picks = D.STUDENTS.slice(-3);
    const reasons = ['tiempo','economico','desmotivado'];
    const churn = picks.map((s,i) => ({ studentId:'baja-'+i, name:['Rosa Medina','Kevin Paredes','Lucero Vega'][i]||s.fullName, level:s.level, groupName:'', reason:reasons[i], note:'', date:new Date(now-(7+i*9)*DAY).toISOString() }));
    localStorage.setItem('jucum_churn_v1', JSON.stringify(churn));
  }

  /* Activar modo demostración: ignora Supabase y siembra todo */
  function enableDemo() {
    try {
      DEMO_KEYS.forEach(k => localStorage.removeItem(k));
      localStorage.setItem(DEMO_FLAG, '1');
    } catch {}
    // el progreso lo siembra data.js al recargar; los extras se siembran aquí tras recarga
    location.reload();
  }
  /* Salir del modo demostración: limpia datos demo y reconecta a tu base real */
  function disableDemo() {
    try {
      localStorage.removeItem(DEMO_FLAG);
      DEMO_KEYS.forEach(k => localStorage.removeItem(k));
    } catch {}
    location.reload();
  }

  // Al cargar en modo demo: si faltan los extras, sembrarlos una vez
  if (isDemo()) {
    try { if (!localStorage.getItem('jucum_attendance_v1')) setTimeout(seedAll, 0); } catch {}
  }

  window.JUCUM_DEMO = { isDemo, enableDemo, disableDemo, seedAll };
})();
