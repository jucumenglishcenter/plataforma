/* Bloque E · Notifications UI — bell with badge + dropdown */

const { useState: nUseState, useEffect: nUseEffect, useRef: nUseRef } = React;

const NOTIF_ICONS = {
  'achievement':      { icon:'🏆', color:'#F9A825', bg:'#FFF9C4' },
  'teacher-feedback': { icon:'📊', color:'#1F3A8A', bg:'#E3E9F8' },
  'module-activated': { icon:'📦', color:'#2EA84B', bg:'#E8F5E9' },
  'daily-reminder':   { icon:'🎯', color:'#E65100', bg:'#FFF3E0' },
  'forum-reply':      { icon:'💬', color:'#0D47A1', bg:'#E3F2FD' },
  'forum-like':       { icon:'❤️', color:'#C62828', bg:'#FFEBEE' },
  'forum-flag':       { icon:'🚩', color:'#B71C1C', bg:'#FFEBEE' },
  'payment':          { icon:'💳', color:'#1F3A8A', bg:'#E3E9F8' },
  'payment-ok':       { icon:'✅', color:'#2E7D32', bg:'#E8F5E9' },
  'assignment':       { icon:'📝', color:'#6A1B9A', bg:'#F3E5F5' },
  'streak':           { icon:'🔥', color:'#FF6F00', bg:'#FFF3E0' },
};

/* 🔔 26-sep-2026 · Al ABRIR la campanita se dan por vistas todas las notificaciones
 * (antes solo se marcaba la que se tocaba, y el globo rojo nunca se iba). Doble seguro:
 * (1) markAllRead → local + nube por user_id (las notificaciones recién creadas tienen id
 * local "n-…" que la nube no reconoce; por eso marcar una por una no llegaba y el
 * globo volvía en la siguiente sincronización); (2) marca de "visto hasta" por usuario
 * en `jucum_notif_seen_v1` (clave chiquita): nada anterior a ella cuenta como pendiente
 * aunque una sincronización vieja lo traiga como no leída. */
const NOTIF_SEEN_KEY = 'jucum_notif_seen_v1';
function notifSeenAt(uid) {
  try { return (JSON.parse(localStorage.getItem(NOTIF_SEEN_KEY) || '{}') || {})[uid] || ''; } catch (e) { return ''; }
}
function setNotifSeenAt(uid, iso) {
  try {
    const all = JSON.parse(localStorage.getItem(NOTIF_SEEN_KEY) || '{}') || {};
    all[uid] = iso;
    const keys = Object.keys(all); if (keys.length > 20) keys.slice(0, keys.length - 20).forEach(k => delete all[k]);
    if (window.JUCUM_STORE) window.JUCUM_STORE.setJSON(NOTIF_SEEN_KEY, all); else localStorage.setItem(NOTIF_SEEN_KEY, JSON.stringify(all));
  } catch (e) {}
}
function isNotifPending(n, seen) { return !n.read && !(seen && String(n.date || '') <= seen); }

/* CAMPANA-VIVA-V1 · título con tinta más oscura donde el color del tipo no se lee sobre su fondo */
const NOTIF_LIVE_INK = { 'streak':'#B23C00', 'daily-reminder':'#A33A00', 'achievement':'#7A5300', 'module-activated':'#1B6B32', 'forum-like':'#A31515' };

/* CAMPANA-VIVA-V1 · botón de cada aviso según a dónde lleva (el clic es en toda la tarjeta, como antes) */
function notifCta(n) {
  const l = n.link, t = n.type;
  if (l === 'practica' || t === 'streak' || t === 'daily-reminder') return '▶ Practicar ahora';
  if (l === 'tasks' || t === 'assignment') return '📝 Abrir';
  if (l === 'forum' || t === 'forum-reply' || t === 'forum-like') return '💬 Ver en el foro';
  if (l === 'exam') return '🎓 Ver mi examen';
  if (l === 'messages') return '👨‍🏫 Leer mensaje';
  if (l === 'payments' || t === 'payment') return '💳 Ver mis pagos';
  return null;
}

function NotifBell({ userId, onNotifClick, live }) {
  const [open, setOpen] = nUseState(false);
  const [tick, setTick] = nUseState(0);
  const [fresh, setFresh] = nUseState(null);   // ids que eran nuevas al abrir (se resaltan mientras está abierto)
  const ref = nUseRef(null);

  nUseEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'jucum_notifs_v1') setTick(t => t + 1);
    };
    const onClickOut = (e) => {
      if (open && ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener('storage', onStorage);
    document.addEventListener('mousedown', onClickOut);
    return () => {
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('mousedown', onClickOut);
    };
  }, [open]);

  // Refresca el globo cuando la sincronización con la nube reescribe las notificaciones.
  nUseEffect(() => { const iv = setInterval(() => setTick(t => t + 1), 15000); return () => clearInterval(iv); }, []);

  const notifs = window.JUCUM_NOTIF.getNotifs(userId);
  const seen = notifSeenAt(userId);
  const unread = notifs.filter(n => isNotifPending(n, seen)).length;

  const openPanel = () => {
    if (open) { setOpen(false); setFresh(null); return; }
    const pend = notifs.filter(n => isNotifPending(n, seen)).map(n => n.id);
    setFresh(new Set(pend));
    const newest = notifs.reduce((m, n) => (String(n.date || '') > m ? String(n.date) : m), '');
    setNotifSeenAt(userId, newest > new Date().toISOString() ? newest : new Date().toISOString());
    if (pend.length) { try { window.JUCUM_NOTIF.markAllRead(userId); } catch (e) {} }
    setOpen(true);
    setTick(t => t + 1);
  };

  const handleClick = (n) => {
    setOpen(false); setFresh(null);
    if (onNotifClick) onNotifClick(n);
  };

  return (
    <div className="bell-wrap" ref={ref}>
      {/* 🔔 CAMPANA-VIVA-V1 (09-nov-2026, opción C elegida): en el alumno, con avisos sin leer la campana se pone roja, se mueve y dice cuántos hay */}
      {live && unread > 0 ? (
        <button className="bell-btn bell-live" onClick={openPanel} title="Tienes avisos sin leer">
          <span className="bell-shk">🔔</span>{unread > 9 ? '9+' : unread} aviso{unread === 1 ? '' : 's'}
        </button>
      ) : (
        <button className="bell-btn" onClick={openPanel} title="Notificaciones">
          🔔
          {unread > 0 && <span className="bell-badge">{unread > 9 ? '9+' : unread}</span>}
        </button>
      )}

      {open && (
        <div className="notif-panel">
          <div className="notif-panel-head">
            <div className="notif-panel-title">Notificaciones</div>
            {fresh && fresh.size > 0 && <span className="notif-mark-all" style={{cursor:'default'}}>{fresh.size === 1 ? '1 nueva' : fresh.size + ' nuevas'}</span>}
          </div>
          <div className="notif-list">
            {notifs.length === 0 ? (
              <div className="empty-state" style={{padding:24}}>
                <div className="icon">📭</div>
                Sin notificaciones todavía.
              </div>
            ) : (
              notifs.map(n => {
                const meta = NOTIF_ICONS[n.type] || NOTIF_ICONS.achievement;
                const isNew = !!(fresh && fresh.has(n.id));
                const cta = live ? notifCta(n) : null;
                return (
                  <button key={n.id} className={`notif-row ${isNew ? '' : 'read'}`} onClick={() => handleClick(n)} style={live && isNew ? {background:meta.bg} : undefined}>
                    <div className="notif-ico" style={{background: live && isNew ? '#fff' : meta.bg, color:meta.color, width: live ? 40 : undefined, height: live ? 40 : undefined, borderRadius: live ? 12 : undefined}}>{meta.icon}</div>
                    <div className="notif-body">
                      <div className="notif-title" style={live ? {color:(NOTIF_LIVE_INK[n.type] || meta.color), fontSize:13.5} : undefined}>{n.title}</div>
                      <div className="notif-text" style={live ? {color:'#4A4A44', fontWeight:700} : undefined}>{n.body}</div>
                      {cta && <span style={{display:'inline-flex', alignItems:'center', marginTop:8, borderRadius:16, padding:'7px 13px', minHeight:34, fontSize:12.5, fontWeight:900, color:'#fff', background:(NOTIF_LIVE_INK[n.type] || meta.color)}}>{cta}</span>}
                      <div className="notif-time">{relativeNotifTime(n.date)}</div>
                    </div>
                    {isNew && <div className="notif-dot"></div>}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function relativeNotifTime(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `${Math.floor(diff/60)} min`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h`;
  if (diff < 86400*7) return `hace ${Math.floor(diff/86400)}d`;
  return new Date(iso).toLocaleDateString('es-PE', { day:'numeric', month:'short' });
}

Object.assign(window, { NotifBell });
