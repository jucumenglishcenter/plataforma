/* Supabase sync layer.
 * Strategy: localStorage stays the synchronous cache the UI reads from;
 * Supabase is the source of truth. On bootstrap we HYDRATE localStorage from
 * the cloud; on each write we update localStorage immediately AND push async to
 * Supabase. This keeps all existing synchronous component code working.
 *
 * Exposes window.JUCUM_SYNC with hydrate() + push* helpers.
 */
(function () {
  if (!window.JUCUM_SB) return; // local-only mode

  const SB = () => window.JUCUM_SB.getClient();
  const KEYS = {
    settings: 'jucum_group_settings_v1',
    progress: 'jucum_student_progress_v1',
    notifs:   'jucum_notifs_v1',
    evals:    'jucum_evaluations_v1',
    forum:    'jucum_forum_v1',
    mutes:    'jucum_mutes_v1',
    likes:    'jucum_likes_v1',
    flags:    'jucum_forum_flags_v1',
  };
  const read  = k => { try { return JSON.parse(localStorage.getItem(k) || '{}'); } catch { return {}; } };
  const _stripHeavy = (node) => { if (Array.isArray(node)) { node.forEach(_stripHeavy); return; } if (node && typeof node === 'object') { if (typeof node.dataUrl === 'string') { delete node.dataUrl; if (!node.url) node.pending = true; } if (typeof node.voucher === 'string' && node.voucher.slice(0, 5) === 'data:') { node.voucher = null; node.voucherRef = true; } if (typeof node.screenshot === 'string' && node.screenshot.slice(0, 5) === 'data:' && node.screenshot.length > 400000) { node.screenshot = null; } Object.keys(node).forEach(k => _stripHeavy(node[k])); } };
  const _purgeKey = (k) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); if (v) { _stripHeavy(v); localStorage.setItem(k, JSON.stringify(v)); } } catch (e) {} };
  const write = (k, v) => {
    try { localStorage.setItem(k, JSON.stringify(v)); }
    catch (e) {
      // Cupo lleno: libera lo recuperable (caché de arranque, notificaciones
      // viejas) y purga adjuntos pesados en base64; luego reintenta.
      try { if (window.JUCUM_STORE) window.JUCUM_STORE.freeSpace(1); } catch (e0) {}
      try { _purgeKey('jucum_submissions_v1'); _purgeKey('jucum_assignments_v1'); _purgeKey('jucum_registrations_v1'); _purgeKey('jucum_payments_v1'); } catch (e2) {}
      try { const light = JSON.parse(JSON.stringify(v)); _stripHeavy(light); localStorage.setItem(k, JSON.stringify(light)); }
      catch (e3) { console.warn('write quota:', k); }
    }
  };

  /* ── Lectura COMPLETA con paginación ──────────────────────────────
   * BUG (jul-2026): Supabase corta TODO select en 1000 filas por defecto. La
   * tabla progress superó ese tope y las filas que quedaban fuera eran las MÁS
   * RECIENTES → el trabajo recién terminado de los alumnos (Pre-A1 primero, y
   * ya también A1/A2) no aparecía como completado ni en su perfil ni en el
   * panel del profesor. Este helper trae TODAS las filas en páginas de 1000,
   * con orden estable (requisito de .range para no saltar ni duplicar filas). */
  async function selectAll(table, cols, orderCols, filt) {
    const sb = SB();
    const PAGE = 1000;
    const base = (withCount) => {
      let q = withCount ? sb.from(table).select(cols || '*', { count: 'exact' }) : sb.from(table).select(cols || '*');
      if (filt) q = filt(q);
      (orderCols && orderCols.length ? orderCols : ['id']).forEach(c => { q = q.order(c, { ascending: true }); });
      return q;
    };
    /* ⚡ 13-oct-2026 · CARGA-RAPIDA-V1: la 1.ª página trae también el TOTAL de filas
     * y el resto de páginas se pide TODO A LA VEZ (antes iban una tras otra: las
     * notificaciones eran 14 viajes seguidos). Mismo resultado, mismo orden. */
    const first = await base(true).range(0, PAGE - 1);
    if (first.error) return { data: null, error: first.error };
    let all = first.data || [];
    if (all.length < PAGE) return { data: all, error: null };
    let from = PAGE;
    const total = typeof first.count === 'number' ? first.count : 0;
    if (total > PAGE) {
      const pages = [];
      for (; from < total; from += PAGE) pages.push(base(false).range(from, from + PAGE - 1));
      const rs = await Promise.all(pages);
      for (const r of rs) {
        if (r.error) return { data: all.length ? all : null, error: r.error };
        all = all.concat(r.data || []);
      }
      if ((rs[rs.length - 1].data || []).length < PAGE) return { data: all, error: null };
    }
    // Sin total, o con filas nuevas mientras se leía: sigue de a una página, como antes.
    while (true) {
      const { data, error } = await base(false).range(from, from + PAGE - 1);
      if (error) return { data: all.length ? all : null, error };
      all = all.concat(data || []);
      if (!data || data.length < PAGE) return { data: all, error: null };
      from += PAGE;
    }
  }

  /* ── ⚡ PRECARGA + LECTURAS EN PARALELO (13-oct-2026 · CARGA-RAPIDA-V1) ──────
   * Medido el 13-oct: al abrir, CADA equipo hacía ~30 viajes SEGUIDOS a la nube y
   * bajaba ~6.7 MB (13 700 notificaciones de toda la escuela = 4.5 MB) antes de
   * mostrar nada ("Conectando con la base de datos…"). Ahora:
   *   · fast-loader llama a prefetch() apenas cargan los scripts: los datos viajan
   *     MIENTRAS se prepara el código, y roster()/hydrate() usan esas mismas
   *     respuestas (si tienen < 90 s; si no, se piden de nuevo);
   *   · todas las tablas se piden a la vez (antes, una por una);
   *   · notificaciones: SOLO las de la campanita del alumno que entró, ya podadas en
   *     la nube (sin leer o de los últimos 10 días). La columna user_id es uuid, así
   *     que las de 'teacher'/'admin' nunca llegaron a la nube: no se piden;
   *   · avance y asistencia: solo las columnas que se usan;
   *   · una lectura que FALLA ya no vacía el caché local (se conserva lo que había).
   * Solo cambia CÓMO se lee: lo que se guarda en el caché es lo mismo de siempre. */
  const PROG_COLS = 'user_id,module_id,activity_id,score,minutes,completed_at';
  const ATT_COLS = 'date,student_id,status,participation,note,group_id';
  const NOTIF_COLS = 'id,user_id,type,title,body,link,read,created_at';
  const NOTIF_DAYS = 10;
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let lastProgAt = 0;
  const sessionUser = () => { try { return JSON.parse(localStorage.getItem('jucum_user') || 'null'); } catch (e) { return null; } };
  function notifIdsFor(sess) {
    if (!sess || !sess.role) return [];
    const ids = [];
    if (sess.role === 'student' && sess.studentId) ids.push(sess.studentId);
    // 👁 “Ver como alumno” (iframe del profesor): también las del alumno que se mira.
    try { const pv = new URLSearchParams(location.search).get('jucum_pv'); if (pv) ids.push(pv); } catch (e) {}
    return Array.from(new Set(ids.map(String).filter(x => UUID_RE.test(x)))).sort();
  }
  function qNotifs(ids) {
    const cut = new Date(Date.now() - NOTIF_DAYS * 86400000).toISOString();
    return selectAll('notifications', NOTIF_COLS, ['id'],
      q => q.in('user_id', ids).or('read.is.null,read.eq.false,created_at.gte."' + cut + '"'));
  }
  /* Agrupa por usuario + la poda de siempre (leídas de +10 días fuera · 15 por persona). */
  function groupNotifs(notifs) {
    const nByUser = {};
    (notifs || []).forEach(n => {
      nByUser[n.user_id] = nByUser[n.user_id] || [];
      nByUser[n.user_id].push({ id:n.id, type:n.type, title:n.title, body:n.body, link:n.link, read:n.read, date:n.created_at });
    });
    Object.values(nByUser).forEach(arr => arr.sort((a,b)=>String(b.date || '').localeCompare(String(a.date || ''))));
    try {
      const corteN = Date.now() - NOTIF_DAYS * 86400000;
      Object.keys(nByUser).forEach(u => {
        const arr = nByUser[u].filter(n => !(n.read && n.date && Date.parse(n.date) < corteN)).slice(0, 15);
        if (arr.length) nByUser[u] = arr; else delete nByUser[u];
      });
    } catch (e) {}
    return nByUser;
  }
  const Q = {
    groups:      () => SB().from('groups').select('*'),
    users:       () => SB().from('users').select('*'),
    progress:    () => selectAll('progress', PROG_COLS, ['user_id', 'module_id', 'activity_id']),
    evals:       () => SB().from('evaluations').select('*'),
    posts:       () => selectAll('forum_posts', '*', ['id']),
    replies:     () => selectAll('forum_replies', '*', ['id']),
    likes:       () => selectAll('forum_likes', '*', ['post_id', 'user_id']),
    mutes:       () => SB().from('forum_mutes').select('*'),
    flags:       () => SB().from('forum_flags').select('*').order('created_at', { ascending: false }).limit(300),
    assignments: () => selectAll('assignments', '*', ['id']),
    submissions: () => selectAll('submissions', '*', ['id']),
    exams:       () => SB().from('exams').select('*'),
    windows:     () => SB().from('exam_windows').select('*'),
    attendance:  () => selectAll('attendance', ATT_COLS, ['date', 'student_id']),
    modules:     () => SB().from('module_catalog').select('*').order('sort'),
  };
  const PF = {};
  const PF_TTL = 90000;
  const settle = (p) => Promise.resolve(p).then(r => r || { data: null, error: new Error('sin respuesta') }, e => ({ data: null, error: e || new Error('sin conexión') }));
  /* Usa la respuesta precargada (una sola vez y si es reciente) o pide de nuevo. */
  function take(name, make) {
    const e = PF[name];
    delete PF[name];
    if (e && Date.now() - e.at < PF_TTL) return e.p;
    return settle(make());
  }
  function prefetch() {
    try {
      if (!SB()) return false;
      const at = Date.now();
      const put = (name, make) => { if (!PF[name]) PF[name] = { at, p: settle(make()) }; };
      Object.keys(Q).forEach(k => put(k, Q[k]));
      const ids = notifIdsFor(sessionUser());
      if (ids.length) put('notifs:' + ids.join(','), () => qNotifs(ids));
      return true;
    } catch (e) { return false; }
  }
  /* Lista de grupos + usuarios para App (precargada si fast-loader ya la pidió). */
  function roster() { return Promise.all([take('groups', Q.groups), take('users', Q.users)]); }
  /* Notificaciones de quien ACABA de entrar (al arrancar sin sesión no se pidieron). */
  async function pullNotifs(sess) {
    const ids = notifIdsFor(sess || sessionUser());
    if (!ids.length) return false;
    const { data, error } = await settle(qNotifs(ids));
    if (error || !data) return false;
    const fresh = groupNotifs(data);
    const cur = read(KEYS.notifs);
    ids.forEach(id => { if (fresh[id]) cur[id] = fresh[id]; else delete cur[id]; });
    write(KEYS.notifs, cur);
    return true;
  }

  /* ── HYDRATE: pull all cloud data into localStorage ── */
  async function hydrate(groups, users) {
    const sb = SB();
    const studentIds = users.filter(u => u.role === 'student').map(u => u.id);
    // ⚡ Todas las lecturas salen A LA VEZ (o ya venían en camino desde prefetch);
    // abajo se aplican en el MISMO orden de siempre.
    const nIds = notifIdsFor(sessionUser());
    const pProg = take('progress', Q.progress);
    const pNotif = nIds.length ? take('notifs:' + nIds.join(','), () => qNotifs(nIds)) : null;
    const pEvals = take('evals', Q.evals);
    const pForum = Promise.all([take('posts', Q.posts), take('replies', Q.replies), take('likes', Q.likes), take('mutes', Q.mutes)]);
    const pFlags = take('flags', Q.flags);
    const pTasks = pullTasks();
    const pExams = Promise.all([take('exams', Q.exams), take('windows', Q.windows)]);
    const pAtt = take('attendance', Q.attendance);

    // group settings — from groups columns
    const settings = {};
    groups.forEach(g => settings[g.id] = {
      activeModuleId: g.active_module_id, deadline: g.deadline,
      dailyTargetMin: g.daily_target_min ?? 15, isPaused: g.is_paused,
      unlockMode: g.unlock_mode || 'sequential',
      unlockedActivities: g.unlocked_activities || [],
      activeModuleIds: g.active_module_ids || (g.active_module_id ? [g.active_module_id] : []),
    });
    write(KEYS.settings, settings);

    // progress (paginado: >1000 filas reales)
    // ⚠️ BLINDAJE (jul-2026): NUNCA pisar el progreso local con un resultado
    // fallido, parcial o vacío. Si la descarga falla (red/timeout/límite/RLS)
    // selectAll devuelve error (y data parcial o null). Antes se escribía igual
    // → la caché quedaba en {} y el alumno veía 0% con TODO re-bloqueado hasta
    // la siguiente hidratación buena. Una tabla real nunca está vacía, así que
    // ante error o 0 filas conservamos la copia local intacta.
    const { data: prog, error: progErr } = await pProg;
    if (progErr || !prog || prog.length === 0) {
      console.warn('hydrate progress: descarga incompleta o vacía; se conserva la caché local', progErr && progErr.message);
    } else {
      const progByUser = {};
      prog.forEach(p => {
        progByUser[p.user_id] = progByUser[p.user_id] || { completed:{}, todayMinutes:0, lastDay:null };
        progByUser[p.user_id].completed[`${p.module_id}:${p.activity_id}`] = {
          score: p.score, minutes: p.minutes, date: p.completed_at,
        };
        const day = p.completed_at ? dayStr(Date.parse(p.completed_at)) : '';   // día en hora Perú
        /* XP-EXPLICA-V1 (23-oct): ya NO se suman aquí los minutos de progress — p.minutes es el
         * MÁXIMO acumulado del material (una story repetida trae 30) y marcaba “Meta cumplida”
         * con 8 min reales. Los minutos de HOY salen de daily_sessions (__JEC_DAILY, que
         * getStudentProgress toma como máximo) + lo medido en este equipo (ver refreshProgress). */
        if (day && (!progByUser[p.user_id].lastDay || day > progByUser[p.user_id].lastDay)) progByUser[p.user_id].lastDay = day;
      });
      write(KEYS.progress, progByUser);
      lastProgAt = Date.now();
      window.__JEC_PROG_OK = Date.now();   // DATOS-LISTOS-V1 (data.js)
    }

    // notificaciones · SOLO las de quien entró (ver notifIdsFor). Sin sesión de alumno
    // no se pide nada y el caché local se queda como está.
    if (pNotif) {
      const { data: notifs, error: nErr } = await pNotif;
      if (nErr || !notifs) console.warn('hydrate notifs: sin respuesta; se conserva la caché local', nErr && nErr.message);
      else write(KEYS.notifs, groupNotifs(notifs));
    }

    // evaluations
    const { data: evals, error: evErr } = await pEvals;
    const eByStudent = {};
    (evals || []).forEach(e => {
      eByStudent[e.student_id] = eByStudent[e.student_id] || [];
      eByStudent[e.student_id].push({
        id:e.id, date:e.created_at, teacherName:'Teacher',
        ratings:{ speaking:e.speaking, listening:e.listening, comprehension:e.comprehension },
        feedback:e.feedback, attachments:e.attachments || [],
      });
    });
    if (!evErr) write(KEYS.evals, eByStudent);

    // forum (posts + replies + likes + mutes)
    const [{ data: posts, error: poErr }, { data: replies, error: reErr }, { data: likes, error: liErr }, { data: mutes, error: muErr }] = await pForum;
    const forum = {};
    (posts || []).forEach(p => {
      forum[p.group_id] = forum[p.group_id] || { posts: [] };
      forum[p.group_id].posts.push({
        id:p.id, date:p.created_at, pinned:p.pinned,
        authorId:p.author_id, authorName:p.author_name, authorRole:p.author_role,
        title:p.title, body:p.body, mediaUrl:p.media_url || null, mediaKind:p.media_kind || null, replies:[],
      });
    });
    const postIndex = {};
    Object.values(forum).forEach(g => g.posts.forEach(p => postIndex[p.id] = p));
    (replies || []).forEach(r => {
      const p = postIndex[r.post_id];
      if (p) p.replies.push({ id:r.id, date:r.created_at, authorId:r.author_id, authorName:r.author_name, authorRole:r.author_role, body:r.body, parentId:r.parent_id || null, mediaUrl:r.media_url || null, mediaKind:r.media_kind || null });
    });
    Object.values(forum).forEach(g => g.posts.sort((a,b)=>b.date.localeCompare(a.date)));
    if (!poErr && !reErr) write(KEYS.forum, forum);

    const likesMap = {};
    (likes || []).forEach(l => { likesMap[l.post_id] = likesMap[l.post_id] || []; likesMap[l.post_id].push({ u: l.user_id, e: l.emoji || '❤️' }); });
    if (!liErr) write(KEYS.likes, likesMap);

    const mutesMap = {};
    (mutes || []).forEach(m => mutesMap[m.user_id] = { until: m.until, reason: m.reason || null, since: m.created_at || null });
    if (!muErr) write(KEYS.mutes, mutesMap);

    // 🚩 Moderación · registro de intentos de lenguaje inapropiado (script 27).
    // Si la tabla aún no existe, se conserva la copia local tal cual.
    try {
      const { data: flags, error: flagErr } = await pFlags;
      if (!flagErr && flags) write(KEYS.flags, flags.map(f => ({ id: f.id, studentId: f.student_id, studentName: f.student_name || '', groupId: f.group_id, content: f.content || '', date: f.created_at })));
    } catch (e) {}

    // tareas (assignments + submissions) · lectura CON FUSIÓN — ver pullTasks
    await pTasks;

    // exámenes (definiciones + ventanas)
    try {
      const [{ data: exs, error: exErr }, { data: wins, error: wiErr }] = await pExams;
      if (!exErr) write('jucum_exams_v1', (exs || []).map(e => ({
        id: e.id, level: e.level, moduleIds: e.module_ids || [], title: e.title, parts: e.parts || [], date: e.created_at,
      })));
      if (!wiErr) write('jucum_exam_windows_v1', (wins || []).map(w => ({
        id: w.id, examId: w.exam_id, groupId: w.group_id, targetStudentIds: w.target_student_ids || [],
        isOpen: w.is_open, closesAt: w.closes_at, allowOverrides: w.allow_overrides || [],
        results: w.results || {}, submissions: w.submissions || {}, published: w.published || false, date: w.created_at,
      })));
    } catch (e) { console.warn('hydrate exams:', e.message); }

    // asistencia
    try {
      const { data: att, error: atErr } = await pAtt;
      if (atErr) throw atErr;   // sin respuesta → se conserva la asistencia local
      const map = {};
      (att || []).forEach(r => {
        map[r.date] = map[r.date] || {};
        map[r.date][r.student_id] = { status: r.status, participation: r.participation || 0, note: r.note || '', groupId: r.group_id };
      });
      write('jucum_attendance_v1', map);
    } catch (e) { console.warn('hydrate attendance:', e.message); }
  }

  /* ── PUSH helpers (fire-and-forget; UI already updated localStorage) ── */
  const safe = (p) => p.then(({error}) => error && console.warn('sync:', error.message)).catch(e => console.warn('sync:', e.message));
  /* Igual que safe(), pero DEVUELVE si se logró guardar. Lo usan las tareas:
   * hasta ago-2026 la subida era a ciegas, así que una tarea que nunca llegó a
   * la nube se veía igual que una subida (y los alumnos no la veían nunca). */
  const safeR = (p) => p.then(r => ({ ok: !(r && r.error), error: r && r.error, data: r && r.data })).catch(e => ({ ok: false, error: e }));
  /* La columna jsonb NUNCA lleva base64: un adjunto pesado hacía fallar el
   * guardado ENTERO de la tarea (y entonces el alumno no la veía). El archivo
   * ya viaja por Storage; si esa subida falló, va solo su ficha (pending). */
  const dbAtts = (list) => (list || []).map(x => {
    if (!x || !x.dataUrl) return x;
    if (x.url) { const y = Object.assign({}, x); delete y.dataUrl; return y; }
    return { kind: x.kind, name: x.name, size: x.size, linkType: x.linkType, pending: true };
  });

  function pushSettings(groupId, s) {
    safe(SB().from('groups').update({
      active_module_id: s.activeModuleId, deadline: s.deadline || null,
      daily_target_min: s.dailyTargetMin, is_paused: s.isPaused,
    }).eq('id', groupId));
    // unlock_mode lives in a separate update: if the column doesn't exist yet
    // (script 5 not run), only this one fails and the rest still saves.
    safe(SB().from('groups').update({ unlock_mode: s.unlockMode || 'sequential', unlocked_activities: s.unlockedActivities || [] }).eq('id', groupId));
    // active_module_ids (script 7): update aparte para que si la columna aún no
    // existe, solo falle esta y lo demás se guarde igual.
    safe(SB().from('groups').update({ active_module_ids: s.activeModuleIds || [] }).eq('id', groupId));
  }
  function pushProgress(userId, moduleId, activityId, score, minutes) {
    safe(SB().from('progress').upsert({
      user_id: userId, module_id: moduleId, activity_id: activityId,
      score, minutes, completed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,module_id,activity_id' }));
  }
  function pushNotif(userId, n) {
    safe(SB().from('notifications').insert({
      user_id: userId, type: n.type, title: n.title, body: n.body, link: n.link || null, read: false,
    }));
  }
  function markNotifRead(notifId) { safe(SB().from('notifications').update({ read:true }).eq('id', notifId)); }
  function markAllNotifRead(userId) { safe(SB().from('notifications').update({ read:true }).eq('user_id', userId)); }

  async function pushEvaluation(studentId, ev) {
    // upload attachments to Storage first
    const uploaded = [];
    for (const a of (ev.attachments || [])) {
      try {
        const blob = await (await fetch(a.dataUrl)).blob();
        const path = `${studentId}/${Date.now()}-${a.name}`;
        const { error } = await SB().storage.from(window.JUCUM_CONFIG.STORAGE_BUCKET).upload(path, blob, { upsert: true });
        if (!error) {
          const { data } = SB().storage.from(window.JUCUM_CONFIG.STORAGE_BUCKET).getPublicUrl(path);
          uploaded.push({ kind:a.kind, url:data.publicUrl, name:a.name, size:a.size });
        } else { uploaded.push({ kind:a.kind, dataUrl:a.dataUrl, name:a.name, size:a.size }); }
      } catch { uploaded.push(a); }
    }
    safe(SB().from('evaluations').insert({
      student_id: studentId, speaking: ev.ratings.speaking, listening: ev.ratings.listening,
      comprehension: ev.ratings.comprehension, feedback: ev.feedback, attachments: uploaded,
    }));
  }

  function pushPost(groupId, post) {
    safe(SB().from('forum_posts').insert({
      id: post.id, group_id: groupId, author_id: post.authorId, author_name: post.authorName,
      author_role: post.authorRole, title: post.title, body: post.body, pinned: false,
      media_url: post.mediaUrl || null, media_kind: post.mediaKind || null,
    }));
  }
  function pushReply(postId, reply) {
    safe(SB().from('forum_replies').insert({
      id: reply.id, post_id: postId, author_id: reply.authorId, author_name: reply.authorName,
      author_role: reply.authorRole, body: reply.body,
      parent_id: reply.parentId || null, media_url: reply.mediaUrl || null, media_kind: reply.mediaKind || null,
    }));
  }
  function pushPin(postId, pinned) { safe(SB().from('forum_posts').update({ pinned }).eq('id', postId)); }
  function deletePostDb(postId) { safe(SB().from('forum_posts').delete().eq('id', postId)); }
  function deleteReplyDb(replyId) { safe(SB().from('forum_replies').delete().eq('id', replyId)); }
  function pushLike(postId, userId, emojiOrNull) {
    if (emojiOrNull) safe(SB().from('forum_likes').upsert({ post_id: postId, user_id: userId, emoji: emojiOrNull }, { onConflict: 'post_id,user_id' }));
    else safe(SB().from('forum_likes').delete().eq('post_id', postId).eq('user_id', userId));
  }
  function pushMute(userId, until, reason) {
    if (until) {
      // Con motivo (script 27). Si la columna reason aún no existe, reintenta sin ella.
      SB().from('forum_mutes').upsert({ user_id: userId, until, reason: reason || null })
        .then(({ error }) => { if (error) safe(SB().from('forum_mutes').upsert({ user_id: userId, until })); })
        .catch(() => safe(SB().from('forum_mutes').upsert({ user_id: userId, until })));
    } else safe(SB().from('forum_mutes').delete().eq('user_id', userId));
  }
  /* 🚩 Moderación · registro de intentos (tabla forum_flags · script 27) */
  function pushFlag(f) {
    safe(SB().from('forum_flags').insert({
      id: f.id, student_id: f.studentId, student_name: f.studentName || null,
      group_id: f.groupId || null, content: f.content || '',
    }));
  }
  function deleteFlagsDb(studentId) { safe(SB().from('forum_flags').delete().eq('student_id', studentId)); }

  window.JUCUM_SYNC = {
    hydrate, prefetch, roster, pullNotifs, pushSettings, pushProgress, pushNotif, markNotifRead, markAllNotifRead,
    pushEvaluation, pushPost, pushReply, pushPin, deletePostDb, deleteReplyDb, pushLike, pushMute, pushFlag, deleteFlagsDb,
    pushModule, deleteModuleDb, fetchModules, fetchActivityParts, fetchModuleProgress, fetchModuleParts, computeStats,    pushAssignment, deleteAssignmentDb, pushSubmission, gradeSubmissionDb, uploadAttachments, refreshTasks, refreshProgress,
    pushExam, deleteExamDb, pushWindow, deleteWindowDb,
    pushAttendance, pushSurvey,
  };

  /* ── Tareas ── */
  async function uploadAttachments(folder, attachments) {
    const out = [];
    for (const a of (attachments || [])) {
      if (!a || !a.dataUrl) { out.push(a); continue; }
      try {
        const blob = await (await fetch(a.dataUrl)).blob();
        const path = `${folder}/${Date.now()}-${a.name}`;
        const { error } = await SB().storage.from(window.JUCUM_CONFIG.STORAGE_BUCKET).upload(path, blob, { upsert: true });
        if (!error) {
          const { data } = SB().storage.from(window.JUCUM_CONFIG.STORAGE_BUCKET).getPublicUrl(path);
          out.push({ kind: a.kind, url: data.publicUrl, name: a.name, size: a.size });
        } else { out.push(a); }
      } catch { out.push(a); }
    }
    return out;
  }
  /* ── Tareas · lectura BLINDADA y con FUSIÓN ───────────────────────────
   * BUG (ago-2026 · "las tareas no se actualizan y desaparecen cada tanto"):
   * hydrate y refreshTasks escribían SIEMPRE lo que devolvía la nube. Si la
   * consulta fallaba (red, RLS, timeout) o si la subida de una tarea recién
   * creada no había llegado, el caché local se sobreescribía con [] y la tarea
   * DESAPARECÍA del panel de la profesora y de los alumnos — arrastrando
   * también las anteriores. Ahora:
   *   · si la lectura falla → NO se toca nada de lo local;
   *   · se fusiona por id: la nube manda, pero lo local marcado pendingSync
   *     (su subida nunca se confirmó) se conserva y se REINTENTA solo;
   *   · los borrados viajan como lápida para que la nube no los resucite. */
  const TOMB_KEY = 'jucum_tasks_tomb_v1';
  const _tombs = () => { try { const o = JSON.parse(localStorage.getItem(TOMB_KEY) || '{}'); return (o && typeof o === 'object') ? o : {}; } catch (e) { return {}; } };
  const _arrOf = (k) => { try { const a = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  const _when = (s) => { const t = Date.parse(s || ''); return isNaN(t) ? 0 : t; };
  const rowToAssign = (a) => ({
    id: a.id, groupId: a.group_id, targetStudentIds: a.target_student_ids || [],
    title: a.title, description: a.description, dueAt: a.due_at, gradable: a.gradable,
    attachments: a.attachments || [], xp: a.xp ?? 40, date: a.created_at,
  });
  const rowToSub = (s) => ({
    id: s.id, submittedAt: s.submitted_at, text: s.text, attachments: s.attachments || [],
    status: s.status, grade: s.grade, feedback: s.feedback, gradedAt: s.graded_at,
  });
  const _okSynced = (id) => { try { if (window.JUCUM_TASKS && window.JUCUM_TASKS.markSynced) window.JUCUM_TASKS.markSynced(id); } catch (e) {} };
  const _okSubSynced = (aid, sid) => { try { if (window.JUCUM_TASKS && window.JUCUM_TASKS.markSubSynced) window.JUCUM_TASKS.markSubSynced(aid, sid); } catch (e) {} };

  async function pullTasks() {
    const tomb = _tombs();
    let enNube = null, bien = true;
    try {
      const [ra, rs] = await Promise.all([
        take('assignments', Q.assignments),
        take('submissions', Q.submissions),
      ]);
      // ── Tareas ──
      if (ra.error || !ra.data) {
        bien = false;
        console.warn('tareas: la nube no respondió; se conserva lo de este equipo', ra.error && ra.error.message);
      } else {
        enNube = {};
        const byId = {};
        ra.data.forEach(r => { enNube[r.id] = 1; if (!tomb[r.id]) byId[r.id] = rowToAssign(r); });
        _arrOf('jucum_assignments_v1').forEach(a => {
          if (!a || !a.id || tomb[a.id]) return;
          const enLaNube = !!enNube[a.id];
          // RESCATE (ago-2026): las tareas creadas ANTES de este arreglo no
          // llevan marca de subida. Si la nube no las tiene y son recientes es
          // que su subida se perdió — no que alguien las borró — así que se
          // conservan y se suben en vez de desaparecer.
          const t = Date.parse(a.date || '');
          const rescate = !a.pendingSync && !a.savedAt && !enLaNube && !isNaN(t) && (Date.now() - t < 30 * 86400000);
          if (!a.pendingSync && !rescate) return;
          byId[a.id] = a;                                    // su subida (o su edición) nunca se confirmó
          Promise.resolve(pushAssignment(a)).then(r => { if (!r || r.ok) _okSynced(a.id); });
        });
        write('jucum_assignments_v1', Object.keys(byId).map(k => byId[k])
          .sort((x, y) => String(y.date || '').localeCompare(String(x.date || ''))));
      }
      // ── Entregas ──
      if (rs.error || !rs.data) {
        bien = false;
        console.warn('entregas: la nube no respondió; se conserva lo de este equipo', rs.error && rs.error.message);
      } else {
        const sMap = {};
        rs.data.forEach(s => { if (tomb[s.assignment_id]) return; if (s.status === 'draft') return; /* DOCSETS-V1: avance en curso, solo nube */ (sMap[s.assignment_id] = sMap[s.assignment_id] || {})[s.student_id] = rowToSub(s); });
        const local = read('jucum_submissions_v1');
        Object.keys(local || {}).forEach(aid => {
          if (tomb[aid]) return;
          Object.keys(local[aid] || {}).forEach(sid => {
            const lo = local[aid][sid]; if (!lo) return;
            const cl = (sMap[aid] || {})[sid];
            const gana = !cl || lo.pendingSync || _when(lo.gradedAt || lo.submittedAt) > _when(cl.gradedAt || cl.submittedAt);
            if (!gana) return;
            (sMap[aid] = sMap[aid] || {})[sid] = lo;
            if (lo.pendingSync || !cl) Promise.resolve(pushSubmission(aid, sid, lo)).then(r => {
              if (r && !r.ok) return;
              if (lo.status === 'graded') gradeSubmissionDb(aid, sid, lo);
              _okSubSynced(aid, sid);
            });
          });
        });
        write('jucum_submissions_v1', sMap);
      }
      // Lápidas: reintenta el borrado si la nube todavía tiene la tarea; purga
      // las de más de 60 días.
      const ahora = Date.now(), quedan = {};
      Object.keys(tomb).forEach(id => {
        if (ahora - (tomb[id] || 0) > 60 * 86400000) return;
        quedan[id] = tomb[id];
        if (enNube && enNube[id]) deleteAssignmentDb(id);
      });
      try { localStorage.setItem(TOMB_KEY, JSON.stringify(quedan)); } catch (e) {}
      return bien;
    } catch (e) { console.warn('pullTasks:', e && e.message); return false; }
  }
  /* Relee tareas+entregas de la nube y actualiza el caché local (para ver
   * tareas nuevas sin tener que cerrar y volver a entrar). */
  async function refreshTasks() { return pullTasks(); }
  /* Relee SOLO el avance (tabla progress) de la nube y actualiza el caché +
   * recalcula los puntos/estadísticas. Ligero: una sola consulta. Sirve para
   * que los materiales que el alumno acaba de hacer aparezcan como completados
   * y sus puntos suban sin tener que recargar toda la plataforma. */
  async function refreshProgress() {
    // ⚡ Recién hidratado (≤45 s): el avance acaba de llegar fresco al arrancar → no bajarlo dos veces seguidas.
    if (Date.now() - lastProgAt < 45000) return false;
    try {
      const sb = SB();
      const { data: prog, error } = await selectAll('progress', PROG_COLS, ['user_id', 'module_id', 'activity_id']);
      if (error) return false;
      const today = dayStr(Date.now());   // día en hora Perú
      const cloud = {};
      (prog || []).forEach(p => {
        cloud[p.user_id] = cloud[p.user_id] || { completed:{}, todayMinutes:0, lastDay:null };
        cloud[p.user_id].completed[`${p.module_id}:${p.activity_id}`] = {
          score: p.score, minutes: p.minutes, date: p.completed_at,
        };
        const day = p.completed_at ? dayStr(Date.parse(p.completed_at)) : '';   // XP-EXPLICA-V1: sin sumar p.minutes (ver hydrate)
        if (day && (!cloud[p.user_id].lastDay || day > cloud[p.user_id].lastDay)) cloud[p.user_id].lastDay = day;
      });
      // La nube manda, pero conservamos los avances locales recién hechos que
      // todavía no terminaron de subir (evita que un material recién completado
      // "parpadee" y desaparezca antes de que su guardado llegue a la nube).
      const local = read(KEYS.progress);
      const merged = { ...cloud };
      Object.keys(local || {}).forEach(u => {
        const lc = (local[u] && local[u].completed) || {};
        merged[u] = merged[u] || { completed:{}, todayMinutes:(local[u] && local[u].todayMinutes) || 0, lastDay:(local[u] && local[u].lastDay) || null };
        const ld = local[u] && local[u].lastDay;
        if (ld && (!merged[u].lastDay || ld > merged[u].lastDay)) merged[u].lastDay = ld;
        // XP-EXPLICA-V1: los minutos de HOY medidos en este equipo (rondas con Neuro) se conservan
        if (ld === today) merged[u].todayMinutes = Math.max(merged[u].todayMinutes || 0, (local[u] && local[u].todayMinutes) || 0);
        Object.keys(lc).forEach(k => { if (!merged[u].completed[k]) merged[u].completed[k] = lc[k]; });
      });
      // ── A2 · Alimenta el motor de repaso espaciado desde la nube ──
      // Cuando la nota de una actividad CON NOTA cambia (nueva o mejorada) respecto a
      // lo que ya teníamos, la registramos en el motor de repaso. Antes solo Quizlet
      // (sin nota) lo alimentaba → "Repasos de hoy" y "Retención" quedaban vacíos.
      // 07-ago: TAMBIÉN dispara cuando la práctica es de otro DÍA aunque la nota sea
      // idéntica. Quien repasaba cada día sacando siempre 100% no cambiaba de nota,
      // así que el motor nunca se enteraba y su repaso se quedaba clavado en
      // "Hace 13 días · vencido hace 6d" para siempre.
      try {
        const D = window.JUCUM_DATA;
        if (D && D.recordReviewAttempt) {
          Object.keys(cloud).forEach(uid => {
            const stu = (D.STUDENTS || []).find(s => s.id === uid);
            const prevC = (local && local[uid] && local[uid].completed) || {};
            const nowC = cloud[uid].completed || {};
            Object.keys(nowC).forEach(k => {
              const nw = nowC[k], pv = prevC[k];
              if (!nw || typeof nw.score !== 'number') return;   // sin nota → no entra a repaso
              const mismaNota = pv && pv.score === nw.score;
              const mismoDia = pv && pv.date && nw.date && dayStr(Date.parse(pv.date)) === dayStr(Date.parse(nw.date));
              if (mismaNota && mismoDia) return;                   // nada nuevo → no re-registrar
              const [modId, actId] = k.split(':');
              D.recordReviewAttempt(uid, modId, actId, nw.score, stu ? stu.group : null, stu ? stu.level : null);
            });
          });
        }
      } catch (e) {}
      write(KEYS.progress, merged);
      // 📶 Refresca también la última conexión real (barato: 2 columnas).
      // Si la columna last_seen_at no existe aún (falta script 22), se ignora.
      try {
        const { data: us } = await sb.from('users').select('id,last_seen_at');
        if (us && window.JUCUM_DATA) {
          const seen = {}; us.forEach(u => { seen[u.id] = u.last_seen_at; });
          window.JUCUM_DATA.STUDENTS.forEach(s => { if (seen[s.id] !== undefined) s.lastSeenAt = seen[s.id]; });
        }
      } catch (e) {}
      try { computeStats(); } catch (e) {}
      window.__JEC_PROG_OK = window.__JEC_PROG_OK || Date.now();
      return true;
    } catch (e) { console.warn('refreshProgress:', e && e.message); return false; }
  }
  function pushAssignment(a) {
    return safeR(SB().from('assignments').upsert({
      id: a.id, group_id: a.groupId || null, target_student_ids: a.targetStudentIds || [],
      title: a.title, description: a.description || null, due_at: a.dueAt || null,
      gradable: !!a.gradable, attachments: dbAtts(a.attachments), xp: a.xp ?? 40,
    }, { onConflict: 'id' })).then(r => { if (!r.ok) console.warn('sync tarea:', r.error && r.error.message); return r; });
  }
  function deleteAssignmentDb(id) { return safeR(SB().from('assignments').delete().eq('id', id)); }
  async function pushSubmission(assignmentId, studentId, sub) {
    const uploaded = await uploadAttachments(`tareas/${studentId}`, sub.attachments);
    return safeR(SB().from('submissions').upsert({
      id: sub.id, assignment_id: assignmentId, student_id: studentId,
      submitted_at: sub.submittedAt, text: sub.text || null, attachments: dbAtts(uploaded),
      status: sub.status || 'submitted',
    }, { onConflict: 'assignment_id,student_id' })).then(r => { if (!r.ok) console.warn('sync entrega:', r.error && r.error.message); return r; });
  }
  async function gradeSubmissionDb(assignmentId, studentId, sub) {
    const nota = {
      status: 'graded', grade: (typeof sub.grade === 'number' ? sub.grade : null),
      feedback: sub.feedback || null, graded_at: sub.gradedAt,
    };
    const r = await safeR(SB().from('submissions').update(nota).eq('assignment_id', assignmentId).eq('student_id', studentId).select('id'));
    if (!r.ok) { console.warn('sync nota de tarea:', r.error && r.error.message); return r; }
    if (r.data && r.data.length) return r;
    // La entrega no existía en la nube (su subida se había perdido): se sube
    // completa CON la nota, en vez de dejar la calificación solo en un equipo.
    return safeR(SB().from('submissions').upsert(Object.assign({
      id: sub.id || ('sub-' + Date.now()), assignment_id: assignmentId, student_id: studentId,
      submitted_at: sub.submittedAt || new Date().toISOString(), text: sub.text || null,
      attachments: dbAtts(sub.attachments),
    }, nota), { onConflict: 'assignment_id,student_id' }));
  }

  /* ── Exámenes ── */
  function pushExam(e) {
    safe(SB().from('exams').upsert({
      id: e.id, level: e.level || null, module_ids: e.moduleIds || [], title: e.title, parts: e.parts || [],
    }));
  }
  function deleteExamDb(id) { safe(SB().from('exams').delete().eq('id', id)); }
  async function pushWindow(w) {
    const subs = { ...(w.submissions || {}) };
    for (const sid of Object.keys(subs)) {
      if (subs[sid] && subs[sid].attachments) subs[sid] = { ...subs[sid], attachments: await uploadAttachments(`examenes/${sid}`, subs[sid].attachments) };
    }
    safe(SB().from('exam_windows').upsert({
      id: w.id, exam_id: w.examId, group_id: w.groupId || null, target_student_ids: w.targetStudentIds || [],
      is_open: !!w.isOpen, closes_at: w.closesAt || null, allow_overrides: w.allowOverrides || [],
      results: w.results || {}, submissions: subs, published: !!w.published,
    }));
  }
  function deleteWindowDb(id) { safe(SB().from('exam_windows').delete().eq('id', id)); }

  /* ── Asistencia ── */
  function pushAttendance(date, groupId, studentId, rec) {
    safe(SB().from('attendance').upsert({
      id: `att-${date}-${studentId}`, date, group_id: groupId || null, student_id: studentId,
      status: rec.status || 'asistio', participation: rec.participation || 0, note: rec.note || null, updated_at: new Date().toISOString(),
    }));
  }

  /* ── Encuesta de satisfacción ── */
  function pushSurvey(studentId, rec) {
    safe(SB().from('surveys').insert({
      id: `sv-${studentId}-${Date.now()}`, student_id: studentId,
      satisfaction: rec.satisfaction || null, recommend: rec.recommend || null,
      continue_plan: rec.continue_plan || null, suggestion: rec.suggestion || null,
    }));
  }

  /* ── Stats: derive avgScore / streak / totalMinutes / completedModules /
   *    lastActiveDays / achievements from the hydrated progress cache.
   *    Call AFTER hydrate() and after the module catalog is loaded.
   *    Patches window.JUCUM_DATA.STUDENTS in place. ── */
  // Días en horario de Perú (UTC−5): el corte de día es medianoche de Lima, no
  // medianoche UTC (que caía ~7 PM Perú y "adelantaba" el día → falsos "días sin
  // practicar" por la tarde-noche aunque el alumno SÍ practicó hoy).
  const PERU_OFFSET_MS = 5 * 3600000;
  const dayStr = t => new Date(t - PERU_OFFSET_MS).toISOString().slice(0, 10);
  function computeStats() {
    const D = window.JUCUM_DATA;
    if (!D) return;
    const DAY = 86400000;
    const prog = read(KEYS.progress);
    D.STUDENTS.forEach(s => {
      const p = prog[s.id] || { completed: {} };
      const completed = p.completed || {};
      const entries = Object.values(completed);

      let minutes = 0, scoreSum = 0, scoreN = 0, perfect = false, lastTs = 0;
      const days = new Set();
      entries.forEach(e => {
        minutes += e.minutes || 0;
        if (typeof e.score === 'number') {
          // Toda nota es porcentaje 0-100 (ver scorePct en data.js)
          const pct = Math.max(0, Math.min(100, Math.round(e.score)));
          scoreSum += pct; scoreN++;
          if (pct >= 100) perfect = true;
        }
        if (e.date) {
          const ts = Date.parse(e.date);
          days.add(dayStr(ts));           // bucket por día de Perú (igual que la racha)
          if (ts > lastTs) lastTs = ts;
        }
      });

      /* 🔥 FIX racha: entry.date se sobreescribe en cada reintento (se guarda solo el
       * último intento por material), así que repasar un material de un día anterior
       * borraba ese día y la racha se caía. Se UNEN aquí las fuentes que sí conservan
       * historia: daily_sessions (nube, una fila por alumno/día) + registro local. */
      try {
        const cloudDays = window.__JEC_DAYS && window.__JEC_DAYS[s.id];
        if (cloudDays) Object.keys(cloudDays).forEach(d => {
          days.add(d);
          const ts = Date.parse(d + 'T12:00:00-05:00');   // mediodía Perú de ese día
          if (ts > lastTs) lastTs = ts;
        });
      } catch (e) {}
      try {
        const ad = JSON.parse(localStorage.getItem('jucum_active_days_v1') || '{}');
        (ad[s.id] || []).forEach(d => days.add(d));
      } catch (e) {}

      // streak = consecutive active days ending today (or yesterday)
      let streak = 0, cur = Date.now();
      if (!days.has(dayStr(cur))) cur -= DAY;
      while (days.has(dayStr(cur))) { streak++; cur -= DAY; }
      /* 🔥 RACHA-AMABLE-V1 (27-oct): con los minutos por día de la nube manda la racha nueva
       * (meta del grupo · domingo libre · 1 escudo por semana) y se acredita su XP ganado. */
      s.streakInfo = null;
      try {
        let tm = 0; try { tm = (D.getStudentProgress(s.id) || {}).todayMinutes || 0; } catch (e) {}
        const info = D.computeStreakInfo ? D.computeStreakInfo(s, tm) : null;
        if (info) { streak = info.streak; s.streakInfo = info; if (D.awardStreakXP) D.awardStreakXP(s, info); }
      } catch (e) {}

      // completed modules of the student's CURRENT level
      const mods = (D.MODULE_CATALOG[s.level] || []).filter(m => (m.activities || []).length > 0);
      const doneMod = m => m.activities.every(a => completed[`${m.id}:${a.id}`]);
      const completedModules = mods.filter(doneMod).length;

      s.totalMinutes = minutes;
      s.avgScore = scoreN ? Math.round(scoreSum / scoreN) : 0;
      s.streak = streak;
      s.completedModules = completedModules;
      s.lastActiveDays = lastTs
        ? Math.max(0, Math.round((Date.parse(dayStr(Date.now())) - Date.parse(dayStr(lastTs))) / DAY))
        : null; // alumno sin práctica todavía → “Sin actividad aún” (nunca “Hoy” falso)
      // 📶 Última conexión REAL = lo más reciente entre su último ingreso
      // registrado (users.last_seen_at · script 22) y su última práctica
      // (practicar implica estar conectado). null = sin dato todavía.
      const seenTs = s.lastSeenAt ? Date.parse(s.lastSeenAt) : 0;
      const connTs = Math.max(seenTs || 0, lastTs || 0);
      s.lastSeenDays = connTs
        ? Math.max(0, Math.round((Date.parse(dayStr(Date.now())) - Date.parse(dayStr(connTs))) / DAY))
        : null;
      // Logros = las medallas REALMENTE conseguidas (las mismas que ve el alumno),
      // calculadas con las estadísticas recién asignadas arriba. Antes solo se
      // regeneraban 4 claves sueltas → el XP por logros no cuadraba con las medallas.
      try { s.achievements = D.earnedMedals(s); } catch (e) { s.achievements = []; }
    });
  }

  /* ── Module catalog (tabla module_catalog) ── */
  function pushModule(level, mod, sort) {
    safe(SB().from('module_catalog').upsert({
      id: mod.id, level, name: mod.name, emoji: mod.emoji,
      topics: mod.topics || [], activities: mod.activities || [], sort: sort ?? 0,
    }));
  }
  function deleteModuleDb(id) { safe(SB().from('module_catalog').delete().eq('id', id)); }
  async function fetchModules() {
    const { data, error } = await take('modules', Q.modules);
    if (error) { console.warn('fetchModules:', error.message); return null; }
    return data;
  }
  /* Progreso POR PARTE (historia/audio 1-4 dentro de un material). Lo llena el
   * conector jucum-connect.js en la tabla activity_parts. Devuelve las filas
   * del alumno para que el panel del profesor muestre qué historia/audio hizo. */
  async function fetchActivityParts(studentId) {
    const { data, error } = await SB().from('activity_parts').select('*').eq('user_id', studentId);
    if (error) { console.warn('fetchActivityParts:', error.message); return []; }
    return data || [];
  }
  /* 🎓 EXAMEN · avance en vivo: filas de progress/activity_parts de UN módulo
   * (module_id = 'exam-<id>'). Las llena jucum-connect en modo examen; el panel
   * del profesor las lee para ver notas por parte + salidas de pestaña (part 99). */
  async function fetchModuleProgress(moduleId) {
    const { data, error } = await SB().from('progress').select('*').eq('module_id', moduleId);
    if (error) { console.warn('fetchModuleProgress:', error.message); return []; }
    return data || [];
  }
  async function fetchModuleParts(moduleId) {
    const { data, error } = await SB().from('activity_parts').select('*').eq('module_id', moduleId);
    if (error) { console.warn('fetchModuleParts:', error.message); return []; }
    return data || [];
  }
})();
