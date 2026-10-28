/* 📦 Correcciones.comp.js · TAREAS-CORREGIR-V1 (28-oct-2026) — pedido de la usuaria:
 * «descargar las tareas de mis alumnos en conjunto con nombre para subírtelas (a Claude) y que corrijas a cada uno».
 * Decidido en el formulario: TODO lo «por revisar» de un grupo · ZIP con una carpeta por alumno + hoja índice ·
 * nota 0–100 · retroalimentación DETALLADA · incluye lo que escribió el alumno · audios/videos van igual.
 *  ⬇ Descargar  → ZIP: <Alumno>/<NN Tarea>/(fotos, PDF, audios, respuesta.txt) + indice.csv + correcciones.json
 *                 (plantilla que Claude devuelve llena) + LEEME-para-Claude.txt. Las entregas se leen de la NUBE.
 *  ⬆ Subir correcciones → vista previa (alumno · tarea · nota · retro) → «Publicar»: nota + retroalimentación a cada
 *                 uno (JUCUM_TASKS.gradeSubmission → nube + campanita). Tareas de documento: ✔/✘ por ejercicio.
 * El ZIP se arma en el navegador (sin librerías, sin comprimir) y NO se guarda nada en localStorage. */

const CX_CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function cxCrc(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CX_CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
/* ZIP «store» (sin comprimir: fotos y PDF ya vienen comprimidos), nombres UTF-8 */
function cxZip(files) {
  const enc = new TextEncoder(), parts = [], central = []; let off = 0;
  const d = new Date(), dt = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF, dd = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;
  files.forEach(f => {
    const name = enc.encode(f.name), data = f.data instanceof Uint8Array ? f.data : enc.encode(String(f.data)), crc = cxCrc(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, dt, true); h.setUint16(12, dd, true);
    h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), name, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, dt, true); c.setUint16(14, dd, true);
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true);
    central.push(new Uint8Array(c.buffer), name);
    off += 30 + name.length + data.length;
  });
  const csize = central.reduce((s, x) => s + x.length, 0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: 'application/zip' });
}
const cxSafe = (s, n) => String(s || '').normalize('NFC').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n || 60) || 'sin-nombre';
const cxName = (s) => (s && (s.fullName || s.name || s.username)) || 'Alumno sin cuenta activa';
const cxPlain = (desc) => String(desc || '').replace(/<!--JUCUM_TASK:[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
/* Fotos grandes → 1600 px JPEG (pesan ~10 veces menos y se leen igual). HEIC u otros: tal cual. */
async function cxShrink(blob, name) {
  if (!/\.(jpe?g|png)$/i.test(name) || blob.size < 500 * 1024 || !window.createImageBitmap) return { blob, name };
  try {
    const bm = await createImageBitmap(blob), k = Math.min(1, 1600 / Math.max(bm.width, bm.height));
    const cv = document.createElement('canvas'); cv.width = Math.round(bm.width * k); cv.height = Math.round(bm.height * k);
    cv.getContext('2d').drawImage(bm, 0, 0, cv.width, cv.height);
    const out = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.82));
    return out && out.size < blob.size ? { blob: out, name: name.replace(/\.(png|jpe?g)$/i, '.jpg') } : { blob, name };
  } catch (e) { return { blob, name }; }
}
/* Lo «por revisar» del grupo, leído de la NUBE: tareas calificables entregadas sin nota + documentos con respuestas por revisar */
async function cxPending(group) {
  const T = window.JUCUM_TASKS, X = window.JUCUM_DOCSETS, sb = window.JUCUM_SB && window.JUCUM_SB.getClient ? window.JUCUM_SB.getClient() : null;
  if (!T || !sb) throw new Error('Este equipo no está conectado a la nube.');
  const tasks = T.getAssignments().filter(a => a.groupId === group.id && !(X && X.isClass && X.isClass(a)));
  if (!tasks.length) return [];
  const rows = [];
  for (let i = 0; i < tasks.length; i += 40) {
    const ids = tasks.slice(i, i + 40).map(a => a.id);
    const r = await sb.from('submissions').select('id,assignment_id,student_id,submitted_at,text,attachments,status,grade').in('assignment_id', ids);
    if (r.error) throw new Error('No pude leer las entregas de la nube: ' + r.error.message);
    rows.push(...(r.data || []));
  }
  const out = [];
  rows.forEach(row => {
    const a = tasks.find(x => x.id === row.assignment_id); if (!a || String(row.status || '') === 'draft') return;
    const ds = X && X.isDocset && X.isDocset(a) ? X.meta(a) : null;
    if (ds) { const z = X.unpack(row.text); const rev = z ? (z.res || []).map((r, i) => r === 'rev' ? i : -1).filter(i => i >= 0) : []; if (rev.length) out.push({ a, row, ds, z, rev }); }
    else if (a.gradable && row.status !== 'graded') out.push({ a, row });
  });
  return out;
}
async function cxBuild(group, onStep) {
  const D = window.JUCUM_DATA, list = await cxPending(group);
  if (!list.length) return null;
  const stu = (id) => (D.STUDENTS || []).find(s => String(s.id) === String(id));
  const taskOrder = [...new Set(list.map(x => x.a.id))].map(id => list.find(x => x.a.id === id).a).sort((p, q) => String(p.dueAt || p.date || '').localeCompare(String(q.dueAt || q.date || '')));
  const tNum = (a) => String(taskOrder.indexOf(a) + 1).padStart(2, '0');
  const entries = [], csv = [['Alumno', 'Tarea', 'Tipo', 'Entregó', 'Archivos', 'Carpeta']], byKid = {}, kidsOrder = [];
  const fmt = (iso) => { try { return new Date(iso).toLocaleString('es-PE', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }); } catch (e) { return iso || ''; } };
  const sorted = list.slice().sort((p, q) => cxName(stu(p.row.student_id)).localeCompare(cxName(stu(q.row.student_id))) || tNum(p.a).localeCompare(tNum(q.a)));
  /* archivos: se bajan de a 4 a la vez */
  const jobs = []; sorted.forEach((x, xi) => (x.row.attachments || []).forEach((at, k) => jobs.push({ xi, k, at })));
  const got = {}; let done = 0, next = 0;
  await Promise.all(Array.from({ length: 4 }, async () => { while (next < jobs.length) { const j = jobs[next++];
    const base = String(j.k + 1).padStart(2, '0') + '-' + cxSafe(j.at.name || ('archivo-' + (j.k + 1)), 70);
    if (!j.at.url) got[j.xi + ':' + j.k] = { miss: base + ' (no llegó a la nube)' };
    else { try { const res = await fetch(j.at.url); if (!res.ok) throw new Error(res.status); const sh = await cxShrink(await res.blob(), base); got[j.xi + ':' + j.k] = { name: sh.name, data: new Uint8Array(await sh.blob.arrayBuffer()) }; } catch (e) { got[j.xi + ':' + j.k] = { miss: base + ' (no se pudo bajar)' }; } }
    onStep && onStep(++done, jobs.length); } }));
  sorted.forEach((x, xi) => {
    const s = stu(x.row.student_id), nm = cxName(s), folder = cxSafe(nm, 50) + '/' + tNum(x.a) + ' ' + cxSafe(x.a.title, 50), names = [];
    if (!byKid[nm]) { byKid[nm] = []; kidsOrder.push(nm); }
    (x.row.attachments || []).forEach((at, k) => { const g = got[xi + ':' + k]; if (!g) return; if (g.miss) names.push(g.miss); else { byKid[nm].push({ name: folder + '/' + g.name, data: g.data }); names.push(g.name); } });
    let txt = '';
    if (x.ds) {
      const its = x.ds.items || [], ans = (x.z && x.z.ans) || [], res = (x.z && x.z.res) || [];
      const LB = { ok:'bien', okd:'bien (detalle)', rev:'POR REVISAR', bad:'mal', blank:'en blanco' };
      txt = (x.ds.title ? 'Ejercicio: ' + x.ds.title + '\n' : '') + (x.ds.en ? 'Consigna: ' + x.ds.en + '\n' : '') + '\n' + its.map((it, i) =>
        (i + 1) + '. [' + (LB[res[i]] || 'sin responder') + '] ' + (it.q || '') + (it.cue ? '   (pista: ' + it.cue + ')' : '') + '\n   Respuesta del alumno: ' + (ans[i] || '(en blanco)') + '\n   Respuesta esperada: ' + (it.key || '—')).join('\n\n');
    } else if (x.row.text && String(x.row.text).trim()) txt = String(x.row.text).trim();
    if (txt) { byKid[nm].push({ name: folder + '/respuesta.txt', data: txt + '\n' }); names.push('respuesta.txt'); }
    if (!names.length) names.push('(sin archivos ni texto)');
    const e = { ref: x.a.id + '|' + x.row.student_id, alumno: nm, tarea: x.a.title, carpeta: folder, tipo: x.ds ? 'documento' : 'tarea', entregada: fmt(x.row.submitted_at), archivos: names };
    if (x.ds) { e.por_revisar = x.rev.map(i => i + 1); e.items = {}; e.retroalimentacion = ''; } else { e.nota = null; e.retroalimentacion = ''; }
    entries.push(e);
    csv.push([nm, x.a.title, e.tipo, e.entregada, names.join(' · '), folder]);
  });
  const now = new Date();
  const json = { formato: 'jucum-correcciones-v1', grupo: { id: group.id, nombre: group.name, nivel: group.level }, generado: now.toISOString(), escala: '0-100',
    tareas: taskOrder.map(a => ({ id: a.id, numero: tNum(a), titulo: a.title, instrucciones: cxPlain(a.description) })), entregas: entries };
  const leeme = [
    'Correcciones · ' + group.name + ' · ' + now.toLocaleDateString('es-PE') + ' · ' + entries.length + ' entrega(s) por revisar',
    '',
    'PARA CLAUDE:',
    '· Cada carpeta es un alumno (su nombre); dentro, una carpeta por tarea con sus fotos/PDF/audios y respuesta.txt (lo que escribió).',
    '· Las instrucciones de cada tarea están en correcciones.json → "tareas".',
    '· Corrige cada entrega con retroalimentación DETALLADA en español: cada error corregido con su explicación (y la forma correcta en inglés). Primero lo que hizo bien.',
    '· Pon "nota" de 0 a 100 en las de tipo "tarea".',
    '· En las de tipo "documento" (la nota se calcula sola): en "items" pon {"3":"ok","5":"bad"} para cada número de "por_revisar", y la retroalimentación.',
    '· Audios y videos: no se pueden escuchar aquí. Deja "nota": null y en la retroalimentación «Revisar el audio en la plataforma».',
    '· Devuelve correcciones.json con "nota", "retroalimentacion" (e "items") llenos. NO cambies "ref".',
    '',
    'PARA LA PROFESORA: sube el correcciones.json que te devuelva Claude en Planificar → 📋 Tareas → ⬆ Subir correcciones. Verás todo antes de publicar.'
  ].join('\n');
  const csvTxt = '\ufeff' + csv.map(r => r.map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(';')).join('\r\n');
  /* Partes de ~25 MB para poder subirlas al chat (en orden de alumno; un alumno con videos puede quedar en 2 partes) */
  const LIMIT = 25 * 1048576, size = (f) => f.data instanceof Uint8Array ? f.data.length : String(f.data).length, parts = [[]]; let cur = 0;
  kidsOrder.forEach(nm => byKid[nm].forEach(f => { const z = size(f); if (cur && cur + z > LIMIT) { parts.push([]); cur = 0; } parts[parts.length - 1].push(f); cur += z; }));   // por archivo, en orden de alumno
  const N = parts.length, base = 'Correcciones - ' + cxSafe(group.name, 60) + ' - ' + window.JUCUM_DAY.today();
  const zips = parts.map((fs, i) => {
    const head = N > 1 ? 'PARTE ' + (i + 1) + ' DE ' + N + ' (correcciones.json trae a TODOS los alumnos; súbelas todas)\n\n' : '';
    return { blob: cxZip([{ name: 'LEEME-para-Claude.txt', data: head + leeme + '\n' }, { name: 'correcciones.json', data: JSON.stringify(json, null, 2) }, { name: 'indice.csv', data: csvTxt }].concat(fs)), name: base + (N > 1 ? ' - parte ' + (i + 1) + ' de ' + N : '') + '.zip' };
  });
  return { zips, n: entries.length, kids: kidsOrder.length, bytes: zips.reduce((t, z) => t + z.blob.size, 0) };
}

const cxBtn = { border:'1.5px solid #CBBF9F', background:'#fff', borderRadius:10, padding:'8px 13px', fontWeight:800, fontSize:12.5, color:'#4A3A10', cursor:'pointer', whiteSpace:'nowrap', fontFamily:'inherit' };
const cxBtnB = { ...cxBtn, background:'linear-gradient(135deg,#3F5BB8,#0D1B5A)', color:'#fff', borderColor:'transparent' };

function CorrectionsBar({ group, onDone }) {
  const [st, setSt] = React.useState(null);   // { busy, msg, err }
  const [imp, setImp] = React.useState(false);
  if (!group) return null;
  const down = async () => {
    setSt({ busy: true, msg: 'Buscando lo por revisar en la nube…' });
    try {
      const r = await cxBuild(group, (i, n) => setSt({ busy: true, msg: 'Bajando archivos ' + i + ' de ' + n + '…' }));
      if (!r) { setSt({ msg: 'No hay nada por revisar en este grupo. 🎉' }); return; }
      for (const z of r.zips) { const url = URL.createObjectURL(z.blob), a = document.createElement('a'); a.href = url; a.download = z.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 120000); await new Promise(ok => setTimeout(ok, 700)); }
      setSt({ msg: '✓ Descargado: ' + r.n + ' entrega' + (r.n === 1 ? '' : 's') + ' de ' + r.kids + ' alumno' + (r.kids === 1 ? '' : 's') + ' · ' + Math.max(1, Math.round(r.bytes / 1048576)) + ' MB' + (r.zips.length > 1 ? ' en ' + r.zips.length + ' partes (súbelas todas)' : '') + '. Súbemelo en el chat.' });
    } catch (e) { setSt({ err: true, msg: '⚠ ' + (e && e.message ? e.message : 'No se pudo armar la descarga.') }); }
  };
  return (
    <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
      <button type="button" disabled={st && st.busy} onClick={down} title="ZIP con una carpeta por alumno: sus fotos, PDF, audios y lo que escribió" style={{...cxBtnB, opacity: st && st.busy ? .6 : 1}}>⬇ Descargar lo por revisar</button>
      <button type="button" onClick={() => setImp(true)} title="El correcciones.json que te devolvió Claude" style={cxBtn}>⬆ Subir correcciones</button>
      {st && <span style={{fontSize:12, fontWeight:800, color: st.err ? '#B23A2A' : '#5f5540'}}>{st.msg}</span>}
      {imp && <CorrectionsImport group={group} onClose={() => setImp(false)} onDone={onDone} />}
    </div>);
}

function CorrectionsImport({ group, onClose, onDone }) {
  const T = window.JUCUM_TASKS, X = window.JUCUM_DOCSETS, D = window.JUCUM_DATA;
  const [rows, setRows] = React.useState(null), [err, setErr] = React.useState(''), [busy, setBusy] = React.useState(false), [res, setRes] = React.useState(null);
  const read = async (file) => {
    setErr(''); setRows(null); setRes(null);
    try {
      const j = JSON.parse(await file.text());
      if (!j || j.formato !== 'jucum-correcciones-v1' || !Array.isArray(j.entregas)) throw new Error('Ese archivo no es un correcciones.json de la plataforma.');
      if (j.grupo && j.grupo.id && j.grupo.id !== group.id) throw new Error('Ese archivo es del grupo «' + (j.grupo.nombre || '?') + '». Cambia el grupo arriba y vuelve a subirlo.');
      const sb = window.JUCUM_SB.getClient(), ids = [...new Set(j.entregas.map(e => String(e.ref || '').split('|')[0]).filter(Boolean))];
      const cur = []; for (let i = 0; i < ids.length; i += 40) { const r = await sb.from('submissions').select('id,assignment_id,student_id,status,grade,text').in('assignment_id', ids.slice(i, i + 40)); if (r.error) throw new Error('No pude leer la nube: ' + r.error.message); cur.push(...(r.data || [])); }
      const out = j.entregas.map(e => {
        const [aid, sid] = String(e.ref || '').split('|'), a = T.getAssignments().find(x => x.id === aid), row = cur.find(r => r.assignment_id === aid && String(r.student_id) === sid);
        const doc = e.tipo === 'documento', nota = typeof e.nota === 'number' && isFinite(e.nota) ? Math.max(0, Math.min(100, Math.round(e.nota))) : null;
        const items = doc && e.items && typeof e.items === 'object' ? Object.keys(e.items).map(k => ({ i: (+k) - 1, r: /^(ok|bien|true|1)$/i.test(String(e.items[k])) ? 'ok' : /^(bad|mal|false|0)$/i.test(String(e.items[k])) ? 'bad' : null })).filter(x => x.r && x.i >= 0) : [];
        const retro = String(e.retroalimentacion || '').trim();
        let why = '';
        if (!a || !row) why = 'ya no está en la plataforma';
        else if (!doc && nota == null) why = 'sin nota';
        else if (doc && !items.length && !retro) why = 'sin corrección';
        const graded = !!row && !doc && row.status === 'graded';
        return { e, a, row, sid, doc, nota, items, retro, why, graded, on: !why && !graded };
      });
      setRows(out);
    } catch (x) { setErr(x && x.message ? x.message : 'No pude leer el archivo.'); }
  };
  const pub = async () => {
    setBusy(true); let ok = 0, bad = 0;
    for (const r of rows.filter(x => x.on)) {
      try {
        if (!r.doc) {
          if (T.getSubmission(r.a.id, r.sid)) T.gradeSubmission(r.a.id, r.sid, r.nota, r.retro);
          else {
            const g = await window.JUCUM_SYNC.gradeSubmissionDb(r.a.id, r.sid, { grade: r.nota, feedback: r.retro, gradedAt: new Date().toISOString() });
            if (g && g.ok === false) throw new Error('nube');
            if (window.JUCUM_NOTIF) window.JUCUM_NOTIF.pushNotif(r.sid, { type:'teacher-feedback', title:'✅ Tarea calificada', body:'Tu tarea recibió ' + r.nota + '/100. Revisa la retroalimentación en Tareas.', link:'tasks' });
          }
        } else {
          const ds = X.meta(r.a); let row = r.row;
          for (const it of r.items) { const ans = await X.setItemResult(r.a, ds, r.sid, row, it.i, it.r); if (ans) row = { ...row, text: X.packAns(ans) }; }
          if (r.retro) { const u = await window.JUCUM_SB.getClient().from('submissions').update({ feedback: r.retro }).eq('id', row.id); if (u.error) throw u.error; }
          if (window.JUCUM_NOTIF) window.JUCUM_NOTIF.pushNotif(r.sid, { type:'teacher-feedback', title:'✅ Tu profe revisó tus respuestas', body:'«' + r.a.title + '»: revisa la retroalimentación en Tareas.', link:'tasks' });
        }
        ok++;
      } catch (x) { bad++; }
    }
    setBusy(false); setRes({ ok, bad }); if (onDone) onDone();
  };
  const tg = (k) => setRows(rs => rs.map((x, i) => i === k ? { ...x, on: !x.on } : x));
  const nOn = rows ? rows.filter(x => x.on).length : 0;
  return (
    <div onClick={onClose} style={{position:'fixed', inset:0, zIndex:1002, background:'rgba(15,23,42,0.55)', display:'flex', alignItems:'center', justifyContent:'center', padding:16}}>
      <div onClick={e => e.stopPropagation()} style={{background:'#fff', borderRadius:18, width:'100%', maxWidth:860, maxHeight:'88vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 60px rgba(0,0,0,.35)'}}>
        <div style={{padding:'15px 20px 11px', borderBottom:'1.5px solid #E3DCC9', position:'relative'}}>
          <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:18, color:'#0D1B5A', paddingRight:40}}>⬆ Subir correcciones · {group.name}</div>
          <div style={{fontSize:12, color:'#8a7f6a', fontWeight:700, marginTop:3}}>El archivo <b>correcciones.json</b> que te devolvió Claude. Primero lo ves; nada se publica hasta que toques «Publicar».</div>
          <button onClick={onClose} aria-label="Cerrar" style={{position:'absolute', top:14, right:14, width:32, height:32, borderRadius:'50%', border:'none', background:'#FAFAF6', color:'#8a7f6a', fontSize:14, fontWeight:800, cursor:'pointer'}}>✕</button>
        </div>
        <div style={{padding:'12px 18px', overflowY:'auto', display:'flex', flexDirection:'column', gap:8}}>
          {!res && <label style={{display:'flex', alignItems:'center', gap:10, border:'2px dashed #C9B87A', background:'#FFFBF2', borderRadius:12, padding:'12px 14px', cursor:'pointer', fontWeight:800, fontSize:13}}>
            📄 {rows ? 'Elegir otro archivo' : 'Elige el correcciones.json'}
            <input type="file" accept=".json,application/json" onChange={e => e.target.files[0] && read(e.target.files[0])} style={{display:'none'}} />
          </label>}
          {err && <div style={{background:'#FDECEA', border:'1px solid #F3B9B2', color:'#8E1B1B', borderRadius:10, padding:'8px 11px', fontSize:12.5, fontWeight:800}}>⚠ {err}</div>}
          {res && <div style={{background: res.bad ? '#FFF5E1' : '#E3F4E6', border:'1.5px solid ' + (res.bad ? '#F0C66B' : '#9FD3A4'), borderRadius:10, padding:'10px 12px', fontSize:13, fontWeight:800, color: res.bad ? '#5A3A00' : '#1D4D25'}}>✓ Publicadas {res.ok}. A cada alumno le llegó a su campanita.{res.bad ? ' ⚠ ' + res.bad + ' no se pudieron guardar (revisa el internet y vuelve a subir el archivo: las ya publicadas saldrán como «ya calificada»).' : ''}</div>}
          {rows && !res && rows.map((r, k) => (
            <div key={k} style={{display:'flex', gap:10, alignItems:'flex-start', border:'1px solid ' + (r.on ? '#C9D6F5' : '#EEE9DC'), background: r.on ? '#F6F8FE' : '#FCFCFA', borderRadius:11, padding:'9px 11px'}}>
              <input type="checkbox" checked={r.on} disabled={!!r.why} onChange={() => tg(k)} style={{width:18, height:18, marginTop:2, accentColor:'#1F3A8A', flexShrink:0}} />
              <div style={{flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:3}}>
                <div style={{display:'flex', gap:8, flexWrap:'wrap', alignItems:'baseline'}}>
                  <b style={{fontSize:13.5}}>{r.e.alumno}</b><span style={{fontSize:12, fontWeight:700, color:'#6b6453'}}>{r.e.tarea}</span>
                  <span style={{flex:1}}></span>
                  {r.doc ? <span style={{fontSize:12, fontWeight:900, color:'#5B3FA0'}}>{r.items.filter(x => x.r === 'ok').length} ✔ · {r.items.filter(x => x.r === 'bad').length} ✘</span>
                    : <span style={{fontSize:14, fontWeight:900, color: r.nota == null ? '#B5B5B5' : r.nota >= 75 ? '#2E7D32' : '#B23A2A'}}>{r.nota == null ? '—' : r.nota + '/100'}</span>}
                </div>
                {r.retro && <div style={{fontSize:12.5, fontWeight:600, color:'#3A4558', whiteSpace:'pre-wrap', maxHeight:96, overflow:'auto', background:'#fff', border:'1px solid #EEE9DC', borderRadius:8, padding:'6px 8px'}}>{r.retro}</div>}
                {(r.why || r.graded) && <span style={{fontSize:11.5, fontWeight:800, color:'#A15C00'}}>{r.why ? '⚠ ' + r.why + ' · no se publica' : '⚠ ya tiene nota en la plataforma · márcala si quieres reemplazarla'}</span>}
              </div>
            </div>))}
        </div>
        <div style={{padding:'10px 18px 14px', borderTop:'1px dashed #E3DCC9', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
          {res ? <button type="button" onClick={onClose} style={cxBtnB}>Listo</button> : <>
            <button type="button" disabled={!nOn || busy} onClick={pub} style={{...cxBtnB, opacity: !nOn || busy ? .5 : 1}}>{busy ? 'Publicando…' : 'Publicar ' + nOn + ' corrección' + (nOn === 1 ? '' : 'es')}</button>
            <button type="button" onClick={onClose} style={cxBtn}>Cancelar</button>
            {rows && <span style={{fontSize:12, fontWeight:700, color:'#8a7f6a'}}>{rows.length} en el archivo · {nOn} marcadas</span>}
          </>}
        </div>
      </div>
    </div>);
}

Object.assign(window, { CorrectionsBar, CorrectionsImport, cxZip });
