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
  };
  const read  = k => { try { return JSON.parse(localStorage.getItem(k) || '{}'); } catch { return {}; } };
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  /* ── HYDRATE: pull all cloud data into localStorage ── */
  async function hydrate(groups, users) {
    const sb = SB();
    const studentIds = users.filter(u => u.role === 'student').map(u => u.id);

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

    // progress
    const { data: prog } = await sb.from('progress').select('*');
    const progByUser = {};
    (prog || []).forEach(p => {
      progByUser[p.user_id] = progByUser[p.user_id] || { completed:{}, todayMinutes:0, lastDay:null };
      progByUser[p.user_id].completed[`${p.module_id}:${p.activity_id}`] = {
        score: p.score, minutes: p.minutes, date: p.completed_at,
      };
      const day = (p.completed_at || '').slice(0,10);
      const today = new Date().toISOString().slice(0,10);
      if (day === today) { progByUser[p.user_id].todayMinutes += (p.minutes||0); progByUser[p.user_id].lastDay = today; }
    });
    write(KEYS.progress, progByUser);

    // notifications
    const { data: notifs } = await sb.from('notifications').select('*');
    const nByUser = {};
    (notifs || []).forEach(n => {
      nByUser[n.user_id] = nByUser[n.user_id] || [];
      nByUser[n.user_id].push({ id:n.id, type:n.type, title:n.title, body:n.body, link:n.link, read:n.read, date:n.created_at });
    });
    Object.values(nByUser).forEach(arr => arr.sort((a,b)=>b.date.localeCompare(a.date)));
    write(KEYS.notifs, nByUser);

    // evaluations
    const { data: evals } = await sb.from('evaluations').select('*');
    const eByStudent = {};
    (evals || []).forEach(e => {
      eByStudent[e.student_id] = eByStudent[e.student_id] || [];
      eByStudent[e.student_id].push({
        id:e.id, date:e.created_at, teacherName:'Profesor',
        ratings:{ speaking:e.speaking, listening:e.listening, comprehension:e.comprehension },
        feedback:e.feedback, attachments:e.attachments || [],
      });
    });
    write(KEYS.evals, eByStudent);

    // forum (posts + replies + likes + mutes)
    const [{ data: posts }, { data: replies }, { data: likes }, { data: mutes }] = await Promise.all([
      sb.from('forum_posts').select('*'),
      sb.from('forum_replies').select('*'),
      sb.from('forum_likes').select('*'),
      sb.from('forum_mutes').select('*'),
    ]);
    const forum = {};
    (posts || []).forEach(p => {
      forum[p.group_id] = forum[p.group_id] || { posts: [] };
      forum[p.group_id].posts.push({
        id:p.id, date:p.created_at, pinned:p.pinned,
        authorId:p.author_id, authorName:p.author_name, authorRole:p.author_role,
        title:p.title, body:p.body, replies:[],
      });
    });
    const postIndex = {};
    Object.values(forum).forEach(g => g.posts.forEach(p => postIndex[p.id] = p));
    (replies || []).forEach(r => {
      const p = postIndex[r.post_id];
      if (p) p.replies.push({ id:r.id, date:r.created_at, authorId:r.author_id, authorName:r.author_name, authorRole:r.author_role, body:r.body });
    });
    Object.values(forum).forEach(g => g.posts.sort((a,b)=>b.date.localeCompare(a.date)));
    write(KEYS.forum, forum);

    const likesMap = {};
    (likes || []).forEach(l => { likesMap[l.post_id] = likesMap[l.post_id] || []; likesMap[l.post_id].push(l.user_id); });
    write(KEYS.likes, likesMap);

    const mutesMap = {};
    (mutes || []).forEach(m => mutesMap[m.user_id] = m.until);
    write(KEYS.mutes, mutesMap);

    // tareas (assignments + submissions)
    try {
      const [{ data: assigns }, { data: subs }] = await Promise.all([
        sb.from('assignments').select('*'),
        sb.from('submissions').select('*'),
      ]);
      const aArr = (assigns || []).map(a => ({
        id: a.id, groupId: a.group_id, targetStudentIds: a.target_student_ids || [],
        title: a.title, description: a.description, dueAt: a.due_at, gradable: a.gradable,
        attachments: a.attachments || [], xp: a.xp ?? 40, date: a.created_at,
      }));
      write('jucum_assignments_v1', aArr);
      const sMap = {};
      (subs || []).forEach(s => {
        sMap[s.assignment_id] = sMap[s.assignment_id] || {};
        sMap[s.assignment_id][s.student_id] = {
          id: s.id, submittedAt: s.submitted_at, text: s.text, attachments: s.attachments || [],
          status: s.status, grade: s.grade, feedback: s.feedback, gradedAt: s.graded_at,
        };
      });
      write('jucum_submissions_v1', sMap);
    } catch (e) { console.warn('hydrate tasks:', e.message); }

    // exámenes (definiciones + ventanas)
    try {
      const [{ data: exs }, { data: wins }] = await Promise.all([
        sb.from('exams').select('*'),
        sb.from('exam_windows').select('*'),
      ]);
      write('jucum_exams_v1', (exs || []).map(e => ({
        id: e.id, level: e.level, moduleIds: e.module_ids || [], title: e.title, parts: e.parts || [], date: e.created_at,
      })));
      write('jucum_exam_windows_v1', (wins || []).map(w => ({
        id: w.id, examId: w.exam_id, groupId: w.group_id, targetStudentIds: w.target_student_ids || [],
        isOpen: w.is_open, closesAt: w.closes_at, allowOverrides: w.allow_overrides || [],
        results: w.results || {}, submissions: w.submissions || {}, published: w.published || false, date: w.created_at,
      })));
    } catch (e) { console.warn('hydrate exams:', e.message); }

    // asistencia
    try {
      const { data: att } = await sb.from('attendance').select('*');
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
    }));
  }
  function pushReply(postId, reply) {
    safe(SB().from('forum_replies').insert({
      id: reply.id, post_id: postId, author_id: reply.authorId, author_name: reply.authorName,
      author_role: reply.authorRole, body: reply.body,
    }));
  }
  function pushPin(postId, pinned) { safe(SB().from('forum_posts').update({ pinned }).eq('id', postId)); }
  function deletePostDb(postId) { safe(SB().from('forum_posts').delete().eq('id', postId)); }
  function deleteReplyDb(replyId) { safe(SB().from('forum_replies').delete().eq('id', replyId)); }
  function pushLike(postId, userId, liked) {
    if (liked) safe(SB().from('forum_likes').insert({ post_id: postId, user_id: userId }));
    else safe(SB().from('forum_likes').delete().eq('post_id', postId).eq('user_id', userId));
  }
  function pushMute(userId, until) {
    if (until) safe(SB().from('forum_mutes').upsert({ user_id: userId, until }));
    else safe(SB().from('forum_mutes').delete().eq('user_id', userId));
  }

  window.JUCUM_SYNC = {
    hydrate, pushSettings, pushProgress, pushNotif, markNotifRead, markAllNotifRead,
    pushEvaluation, pushPost, pushReply, pushPin, deletePostDb, deleteReplyDb, pushLike, pushMute,
    pushModule, deleteModuleDb, fetchModules, computeStats,
    pushAssignment, deleteAssignmentDb, pushSubmission, gradeSubmissionDb,
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
  function pushAssignment(a) {
    safe(SB().from('assignments').insert({
      id: a.id, group_id: a.groupId || null, target_student_ids: a.targetStudentIds || [],
      title: a.title, description: a.description || null, due_at: a.dueAt || null,
      gradable: !!a.gradable, attachments: a.attachments || [], xp: a.xp ?? 40,
    }));
  }
  function deleteAssignmentDb(id) { safe(SB().from('assignments').delete().eq('id', id)); }
  async function pushSubmission(assignmentId, studentId, sub) {
    const uploaded = await uploadAttachments(`tareas/${studentId}`, sub.attachments);
    safe(SB().from('submissions').upsert({
      id: sub.id, assignment_id: assignmentId, student_id: studentId,
      submitted_at: sub.submittedAt, text: sub.text || null, attachments: uploaded,
      status: sub.status || 'submitted',
    }, { onConflict: 'assignment_id,student_id' }));
  }
  function gradeSubmissionDb(assignmentId, studentId, sub) {
    safe(SB().from('submissions').update({
      status: 'graded', grade: (typeof sub.grade === 'number' ? sub.grade : null),
      feedback: sub.feedback || null, graded_at: sub.gradedAt,
    }).eq('assignment_id', assignmentId).eq('student_id', studentId));
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
  const dayStr = t => new Date(t).toISOString().slice(0, 10);
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
          // >10 = percent (0-100); ≤10 = out of 10 — same rule as getStudentXP
          const pct = e.score > 10 ? Math.min(100, e.score) : Math.min(100, (e.score / 10) * 100);
          scoreSum += pct; scoreN++;
          if (pct >= 100) perfect = true;
        }
        if (e.date) {
          days.add(e.date.slice(0, 10));
          const ts = Date.parse(e.date);
          if (ts > lastTs) lastTs = ts;
        }
      });

      // streak = consecutive active days ending today (or yesterday)
      let streak = 0, cur = Date.now();
      if (!days.has(dayStr(cur))) cur -= DAY;
      while (days.has(dayStr(cur))) { streak++; cur -= DAY; }

      // completed modules of the student's CURRENT level
      const mods = (D.MODULE_CATALOG[s.level] || []).filter(m => (m.activities || []).length > 0);
      const doneMod = m => m.activities.every(a => completed[`${m.id}:${a.id}`]);
      const completedModules = mods.filter(doneMod).length;

      // achievements derived from real progress
      const ach = [];
      if (entries.length > 0) ach.push('first');
      if (streak >= 3) ach.push('streak');
      if (perfect) ach.push('perfect');
      const m1 = mods.find(m => m.id === 'pa1-m1');
      if (m1 && doneMod(m1)) ach.push('identity');

      s.totalMinutes = minutes;
      s.avgScore = scoreN ? Math.round(scoreSum / scoreN) : 0;
      s.streak = streak;
      s.completedModules = completedModules;
      s.lastActiveDays = lastTs
        ? Math.max(0, Math.round((Date.parse(dayStr(Date.now())) - Date.parse(dayStr(lastTs))) / DAY))
        : 0; // alumno nuevo sin práctica todavía: NO mostrar "hace 99 días" ni alarma
      s.achievements = ach;
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
    const { data, error } = await SB().from('module_catalog').select('*').order('sort');
    if (error) { console.warn('fetchModules:', error.message); return null; }
    return data;
  }
})();
