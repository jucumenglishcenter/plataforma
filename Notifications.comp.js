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

function NotifBell({ userId, onNotifClick }) {
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
      <button className="bell-btn" onClick={openPanel} title="Notificaciones">
        🔔
        {unread > 0 && <span className="bell-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

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
                return (
                  <button key={n.id} className={`notif-row ${isNew ? '' : 'read'}`} onClick={() => handleClick(n)}>
                    <div className="notif-ico" style={{background:meta.bg,color:meta.color}}>{meta.icon}</div>
                    <div className="notif-body">
                      <div className="notif-title">{n.title}</div>
                      <div className="notif-text">{n.body}</div>
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
