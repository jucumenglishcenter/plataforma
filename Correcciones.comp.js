/* 📦 Correcciones.comp.js · TAREAS-CORREGIR-V1 (28-oct-2026) — pedido de la usuaria:
 * «descargar las tareas de mis alumnos en conjunto con nombre para subírtelas (a Claude) y que corrijas a cada uno».
 * 28-oct (2.ª): «las carpetas hacen tedioso el proceso» → TODO en UN MISMO DOCUMENTO (PDF), alumno por alumno:
 *  ⬇ Descargar → «Entregas - <grupo> - <fecha>.pdf» (portada con instrucciones para Claude + índice; por cada entrega:
 *               N°, alumno, tarea, lo que escribió, sus fotos (1 por página) y las páginas de sus PDF) + correcciones.json
 *               (la plantilla que Claude devuelve llena). Audios/videos no caben en un PDF: se nombran («escúchalo en la
 *               plataforma»). Si pasa de ~80 páginas o ~22 MB sale en partes. Las entregas se leen de la NUBE.
 *  ⬆ Subir correcciones → vista previa → «Publicar»: nota + retroalimentación a cada uno (gradeSubmission → nube + campanita).
 * PDF con pdf-lib 1.17.1 (CDN fijado + SRI), se carga SOLO al tocar Descargar. Nada se guarda en localStorage. */
const CX_PDFLIB = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js', CX_PDFLIB_SRI = 'sha384-weMABwrltA6jWR8DDe9Jp5blk+tZQh7ugpCsF3JwSA53WZM9/14PjS5LAJNHNjAI';
function cxLoadPdfLib() {
  if (window.PDFLib) return Promise.resolve(window.PDFLib);
  return new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = CX_PDFLIB; sc.integrity = CX_PDFLIB_SRI; sc.crossOrigin = 'anonymous';
    sc.onload = () => window.PDFLib ? ok(window.PDFLib) : no(new Error('No cargó el generador de PDF.')); sc.onerror = () => no(new Error('No pude cargar el generador de PDF (revisa el internet).')); document.head.appendChild(sc); });
}
const cxSafe = (s, n) => String(s || '').normalize('NFC').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n || 60) || 'sin-nombre';
const cxName = (s) => (s && (s.fullName || s.name || s.username)) || 'Alumno sin cuenta activa';
const cxPlain = (desc) => String(desc || '').replace(/<!--JUCUM_TASK:[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
/* Foto → JPEG ≤1400 px (respeta la orientación del celular). HEIC u otros que el navegador no abre → null */
async function cxImg(blob) {
  try {
    const bm = await createImageBitmap(blob), k = Math.min(1, 1400 / Math.max(bm.width, bm.height));
    const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(bm.width * k)); cv.height = Math.max(1, Math.round(bm.height * k));
    const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(bm, 0, 0, cv.width, cv.height);
    const out = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.78)); return out ? new Uint8Array(await out.arrayBuffer()) : null;
  } catch (e) { return null; }
}
const CX_AV = /\.(webm|m4a|aac|mp3|ogg|oga|wav|opus|mp4|mov|3gp|mkv)$/i, CX_IMG = /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i;
const CX_OK = {};
function cxClean(f, t) {   // la letra estándar del PDF no trae emoji ni algunos símbolos
  let o = ''; for (const ch of String(t == null ? '' : t).replace(/\r/g, '').replace(/\t/g, '  ')) {
    if (ch === '\n') { o += ch; continue; }
    let ok = CX_OK[ch]; if (ok == null) { try { f.encodeText(ch); f.widthOfTextAtSize(ch, 10); ok = true; } catch (e) { ok = false; } CX_OK[ch] = ok; }
    o += ok ? ch : ''; }
  return o;
}
function cxWrap(f, size, t, maxW) {
  const out = [];
  cxClean(f, t).split('\n').forEach(par => {
    let line = '';
    par.split(/ +/).forEach(w0 => { let w = w0; const test = line ? line + ' ' + w : w;
      if (f.widthOfTextAtSize(test, size) <= maxW) { line = test; return; }
      if (line) out.push(line);
      while (w.length > 1 && f.widthOfTextAtSize(w, size) > maxW) { let k = w.length; while (k > 1 && f.widthOfTextAtSize(w.slice(0, k), size) > maxW) k--; out.push(w.slice(0, k)); w = w.slice(k); }
      line = w; });
    out.push(line);
  });
  return out;
}
/* Lo «por revisar» del grupo, leído de la NUBE: tareas calificables entregadas sin nota + documentos con respuestas por revisar */
async function cxPending(group, taskId) {
  const T = window.JUCUM_TASKS, X = window.JUCUM_DOCSETS, sb = window.JUCUM_SB && window.JUCUM_SB.getClient ? window.JUCUM_SB.getClient() : null;
  if (!T || !sb) throw new Error('Este equipo no está conectado a la nube.');
  const tasks = T.getAssignments().filter(a => (taskId ? a.id === taskId : a.groupId === group.id) && !(X && X.isClass && X.isClass(a)));
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
async function cxBuild(group, onStep, taskId) {
  const D = window.JUCUM_DATA, list = await cxPending(group, taskId);
  if (!list.length) return null;
  const P = await cxLoadPdfLib();
  const stu = (id) => (D.STUDENTS || []).find(x => String(x.id) === String(id));
  const taskOrder = [...new Set(list.map(x => x.a.id))].map(id => list.find(x => x.a.id === id).a).sort((p, q) => String(p.dueAt || p.date || '').localeCompare(String(q.dueAt || q.date || '')));
  const tNum = (a) => String(taskOrder.indexOf(a) + 1).padStart(2, '0');
  const fmt = (iso) => { try { return new Date(iso).toLocaleString('es-PE', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }); } catch (e) { return iso || ''; } };
  const sorted = list.slice().sort((p, q) => cxName(stu(p.row.student_id)).localeCompare(cxName(stu(q.row.student_id))) || tNum(p.a).localeCompare(tNum(q.a)));
  /* bajar archivos (4 a la vez): fotos → JPEG · PDF tal cual · audios/videos solo se nombran */
  const jobs = []; sorted.forEach((x, xi) => (x.row.attachments || []).forEach((at, k) => jobs.push({ xi, k, at })));
  const got = {}; let done = 0, next = 0;
  await Promise.all(Array.from({ length: 4 }, async () => { while (next < jobs.length) { const j = jobs[next++], nm = String(j.at.name || ('archivo-' + (j.k + 1)));
    let r;
    if (CX_AV.test(nm) || j.at.kind === 'audio' || j.at.kind === 'video') r = { av: nm };
    else if (!j.at.url) r = { miss: nm + ' (no llegó a la nube)' };
    else { try { const res = await fetch(j.at.url); if (!res.ok) throw new Error(res.status); const b = await res.blob();
      if (/\.pdf$/i.test(nm) || /pdf/.test(b.type)) r = { pdf: new Uint8Array(await b.arrayBuffer()), name: nm };
      else if (CX_IMG.test(nm) || /^image\//.test(b.type)) { const jpg = await cxImg(b); r = jpg ? { img: jpg, name: nm } : { miss: nm + ' (foto que el navegador no abre: mírala en la plataforma)' }; }
      else r = { miss: nm + ' (este tipo de archivo no entra en el PDF: ábrelo en la plataforma)' };
    } catch (e) { r = { miss: nm + ' (no se pudo bajar)' }; } }
    got[j.xi + ':' + j.k] = r; onStep && onStep(++done, jobs.length); } }));
  /* entregas numeradas (N°) = lo que Claude devuelve en correcciones.json */
  const entries = sorted.map((x, xi) => {
    const nm = cxName(stu(x.row.student_id)), files = (x.row.attachments || []).map((at, k) => got[xi + ':' + k]).filter(Boolean);
    let txt = '';
    if (x.ds) {
      const its = x.ds.items || [], ans = (x.z && x.z.ans) || [], res = (x.z && x.z.res) || [];
      const LB = { ok:'bien', okd:'bien (detalle)', rev:'POR REVISAR', bad:'mal', blank:'en blanco' };
      txt = (x.ds.title ? 'Ejercicio: ' + x.ds.title + '\n' : '') + (x.ds.en ? 'Consigna: ' + x.ds.en + '\n' : '') + '\n' + its.map((it, i) =>
        (i + 1) + '. [' + (LB[res[i]] || 'sin responder') + '] ' + (it.q || '') + (it.cue ? '   (pista: ' + it.cue + ')' : '') + '\n   Respuesta del alumno: ' + (ans[i] || '(en blanco)') + '\n   Respuesta esperada: ' + (it.key || '-')).join('\n\n');
    } else if (x.row.text && String(x.row.text).trim()) txt = String(x.row.text).trim();
    const e = { numero: xi + 1, ref: x.a.id + '|' + x.row.student_id, alumno: nm, tarea: x.a.title, tipo: x.ds ? 'documento' : 'tarea', entregada: fmt(x.row.submitted_at),
      archivos: files.map(f => f.img ? 'foto: ' + f.name : f.pdf ? 'PDF: ' + f.name : f.av ? 'audio/video (escúchalo en la plataforma): ' + f.av : f.miss) };
    if (x.ds) { e.por_revisar = x.rev.map(i => i + 1); e.items = {}; e.retroalimentacion = ''; } else { e.nota = null; e.retroalimentacion = ''; }
    return { e, x, files, txt, tn: tNum(x.a) };
  });
  const now = new Date(), INSTR = [
    'Cada entrega empieza con su N°, el alumno y la tarea; siguen lo que escribió, sus fotos (una por página) y las páginas de sus PDF.',
    'Corrige cada entrega con retroalimentación DETALLADA en español: primero lo que hizo bien; luego cada error: lo que escribió -> la forma correcta en inglés -> por qué (regla corta).',
    'En correcciones.json pon "nota" de 0 a 100 en las de tipo "tarea".',
    'En las de tipo "documento" (la nota se calcula sola): en "items" pon {"3":"ok","5":"bad"} para cada número de "por_revisar", y la retroalimentación.',
    'Audios y videos no van en el PDF: deja "nota": null y escribe «Revisar el audio en la plataforma». Foto que no se lee: «La foto no se lee, pide que la vuelva a subir».',
    'Devuelve correcciones.json con "nota", "retroalimentacion" (e "items") llenos. NO cambies "ref" ni "numero".'];
  /* PDF por partes (~80 páginas / ~22 MB) */
  const parts = []; let doc = null, fR = null, fB = null, pages = 0, bytes = 0, partEntries = [];
  const W = 595.28, H = 841.89, M = 42, ink = P.rgb(0.13, 0.15, 0.22), soft = P.rgb(0.45, 0.42, 0.36), blue = P.rgb(0.05, 0.11, 0.35);
  const start = async () => { doc = await P.PDFDocument.create(); fR = await doc.embedFont(P.StandardFonts.Helvetica); fB = await doc.embedFont(P.StandardFonts.HelveticaBold); pages = 0; bytes = 0; partEntries = []; };
  const writer = () => { let page = null, y = 0;
    const np = () => { page = doc.addPage([W, H]); pages++; y = H - M; };
    const line = (t, size, f, c) => { if (!page || y - size - 4 < M) np(); page.drawText(t, { x: M, y: y - size, size, font: f, color: c || ink }); y -= size + 4; };
    return { np, line, para: (t, size, f, c) => cxWrap(f, size, t, W - 2 * M).forEach(l => line(l, size, f, c)), gap: (h) => { y -= h; } }; };
  const finish = async () => {
    /* portada al inicio de la parte */
    const cover = writer(); cover.np();
    cover.para('Entregas por corregir · ' + group.name, 17, fB, blue);
    cover.para(now.toLocaleDateString('es-PE', { day:'numeric', month:'long', year:'numeric' }) + ' · ' + partEntries.length + ' entrega(s) en este documento', 10.5, fR, soft);
    cover.gap(8); cover.para('PARA CLAUDE', 11.5, fB, blue); INSTR.forEach(t => cover.para('· ' + t, 10, fR));
    cover.gap(8); cover.para('TAREAS (instrucciones)', 11.5, fB, blue);
    taskOrder.filter(a => partEntries.some(z => z.x.a.id === a.id)).forEach(a => { cover.para(tNum(a) + ' · ' + a.title, 10.5, fB); const ins = cxPlain(a.description); cover.para(ins || '(sin instrucciones escritas)', 9.5, fR, ins ? ink : soft); cover.gap(3); });
    cover.gap(8); cover.para('ÍNDICE', 11.5, fB, blue);
    partEntries.forEach(z => cover.para('N° ' + z.e.numero + ' · ' + z.e.alumno + ' · ' + z.tn + ' ' + z.e.tarea, 9.5, fR));
    const nCover = pages - z0;   // páginas de portada agregadas al final → se mueven al inicio
    for (let i = 0; i < nCover; i++) { const pg = doc.getPage(doc.getPageCount() - nCover + i); doc.removePage(doc.getPageCount() - nCover + i); doc.insertPage(i, pg); }
    parts.push({ bytes: await doc.save({ objectsPerTick: Infinity }), entries: partEntries.map(z => z.e.numero) });
  };
  let z0 = 0;
  await start();
  for (const z of entries) {
    if (partEntries.length && (pages > 80 || bytes > 22 * 1048576)) { z0 = pages; await finish(); await start(); }
    partEntries.push(z);
    const hdr = 'N° ' + z.e.numero + ' · ' + z.e.alumno + ' · ' + z.tn + ' ' + z.e.tarea;
    const w = writer(); w.np();
    w.para('N° ' + z.e.numero + ' · ' + z.e.alumno, 16, fB, blue);
    w.para('Tarea ' + z.tn + ': ' + z.e.tarea, 11.5, fB);
    w.para('Entregó: ' + z.e.entregada + (z.e.tipo === 'documento' ? ' · tarea de documento (por revisar: ' + z.e.por_revisar.join(', ') + ')' : ''), 10, fR, soft);
    w.gap(6); w.para('Archivos:', 10.5, fB);
    (z.e.archivos.length ? z.e.archivos : ['(no adjuntó archivos)']).forEach(t => w.para('· ' + t, 10, fR));
    if (z.txt) { w.gap(6); w.para('Lo que escribió:', 10.5, fB); w.para(z.txt, 10.5, fR); }
    let fi = 0; const nImg = z.files.filter(f => f.img).length;
    for (const f of z.files) {
      if (f.img) { fi++;
        try { const im = await doc.embedJpg(f.img), pg = doc.addPage([W, H]); pages++; bytes += f.img.length;
          pg.drawText(cxClean(fB, hdr + ' · foto ' + fi + ' de ' + nImg), { x: M, y: H - M + 8, size: 9, font: fB, color: blue });
          const bw = W - 2 * M, bh = H - 2 * M - 10, k = Math.min(bw / im.width, bh / im.height), iw = im.width * k, ih = im.height * k;
          pg.drawImage(im, { x: (W - iw) / 2, y: M + (bh - ih) / 2, width: iw, height: ih });
        } catch (e) {}
      } else if (f.pdf) {
        try { const src = await P.PDFDocument.load(f.pdf, { ignoreEncryption: true, parseSpeed: P.ParseSpeeds.Fastest }), cp = await doc.copyPages(src, src.getPageIndices()); bytes += f.pdf.length;
          cp.forEach((p, i) => { doc.addPage(p); pages++; const sz = p.getSize();
            p.drawRectangle({ x: 0, y: sz.height - 18, width: sz.width, height: 18, color: P.rgb(1, 1, 1), opacity: 0.9 });
            p.drawText(cxClean(fB, hdr + ' · ' + f.name + ' · pág ' + (i + 1) + ' de ' + cp.length), { x: 10, y: sz.height - 13, size: 8, font: fB, color: blue }); });
        } catch (e) { const w2 = writer(); w2.np(); w2.para(hdr, 10, fB, blue); w2.para('El PDF «' + f.name + '» no se pudo abrir: míralo en la plataforma.', 10.5, fR); }
      }
    }
  }
  z0 = pages; await finish();
  const base = 'Entregas - ' + cxSafe(group.name, 60) + (taskId && taskOrder[0] ? ' - ' + cxSafe(taskOrder[0].title, 40) : '') + ' - ' + window.JUCUM_DAY.today();
  const json = { formato: 'jucum-correcciones-v1', grupo: { id: group.id, nombre: group.name, nivel: group.level }, generado: now.toISOString(), escala: '0-100',
    instrucciones_para_claude: INSTR, documentos: parts.map((p, i) => base + (parts.length > 1 ? ' - parte ' + (i + 1) + ' de ' + parts.length : '') + '.pdf'),
    tareas: taskOrder.map(a => ({ id: a.id, numero: tNum(a), titulo: a.title, instrucciones: cxPlain(a.description) })), entregas: entries.map(z => z.e) };
  const files = parts.map((p, i) => ({ blob: new Blob([p.bytes], { type: 'application/pdf' }), name: json.documentos[i] }));
  files.push({ blob: new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' }), name: 'correcciones - ' + cxSafe(group.name, 60) + ' - ' + window.JUCUM_DAY.today() + '.json' });
  return { files, pdfs: parts.length, n: entries.length, kids: new Set(entries.map(z => z.e.alumno)).size, bytes: files.reduce((t, f) => t + f.blob.size, 0) };
}

const cxBtn = { border:'1.5px solid #CBBF9F', background:'#fff', borderRadius:10, padding:'8px 13px', fontWeight:800, fontSize:12.5, color:'#4A3A10', cursor:'pointer', whiteSpace:'nowrap', fontFamily:'inherit' };
const cxBtnB = { ...cxBtn, background:'linear-gradient(135deg,#3F5BB8,#0D1B5A)', color:'#fff', borderColor:'transparent' };

function CorrectionsBar({ group, onDone, taskId }) {   // taskId = solo esa tarea (botón dentro de sus entregas)
  const [st, setSt] = React.useState(null);   // { busy, msg, err }
  const [imp, setImp] = React.useState(false);
  if (!group) return null;
  const down = async () => {
    setSt({ busy: true, msg: 'Buscando lo por revisar en la nube…' });
    try {
      const r = await cxBuild(group, (i, n) => setSt({ busy: true, msg: 'Bajando archivos ' + i + ' de ' + n + '…' }), taskId);
      if (!r) { setSt({ msg: taskId ? 'En esta tarea no hay nada por calificar. 🎉' : 'No hay nada por revisar en este grupo. 🎉' }); return; }
      for (const z of r.files) { const url = URL.createObjectURL(z.blob), a = document.createElement('a'); a.href = url; a.download = z.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 120000); await new Promise(ok => setTimeout(ok, 700)); }
      setSt({ msg: '✓ Descargado: ' + r.n + ' entrega' + (r.n === 1 ? '' : 's') + ' de ' + r.kids + ' alumno' + (r.kids === 1 ? '' : 's') + ' · ' + Math.max(1, Math.round(r.bytes / 1048576)) + ' MB · ' + (r.pdfs > 1 ? r.pdfs + ' PDF (partes)' : '1 PDF') + ' + correcciones.json. Súbeme los dos en el chat.' });
    } catch (e) { setSt({ err: true, msg: '⚠ ' + (e && e.message ? e.message : 'No se pudo armar la descarga.') }); }
  };
  return (
    <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
      <button type="button" disabled={st && st.busy} onClick={down} title="Un solo PDF con cada alumno: lo que escribió, sus fotos y sus PDF + correcciones.json" style={{...cxBtnB, opacity: st && st.busy ? .6 : 1}}>{taskId ? '⬇ Descargar para corregir' : '⬇ Descargar lo por revisar'}</button>
      <button type="button" onClick={() => setImp(true)} title="El correcciones.json que te devolvió Claude" style={cxBtn}>⬆ Subir correcciones</button>
      {st && <span style={{fontSize:12, fontWeight:800, color: st.err ? '#B23A2A' : '#5f5540'}}>{st.msg}</span>}
      {imp && <CorrectionsImport group={group} taskId={taskId} onClose={() => setImp(false)} onDone={onDone} />}
    </div>);
}

function CorrectionsImport({ group, taskId, onClose, onDone }) {   // taskId: solo se publican las de ESTA tarea
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
        if (taskId && aid !== taskId) why = 'es de otra tarea';
        else if (!a || !row) why = 'ya no está en la plataforma';
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
          <div style={{fontSize:12, color:'#8a7f6a', fontWeight:700, marginTop:3}}>{taskId ? 'Solo para esta tarea. ' : ''}El archivo <b>correcciones.json</b> que te devolvió Claude. Primero lo ves; nada se publica hasta que toques «Publicar».</div>
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

Object.assign(window, { CorrectionsBar, CorrectionsImport });
