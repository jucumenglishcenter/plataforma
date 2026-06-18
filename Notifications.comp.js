/* Bloque E · Notifications UI — bell with badge + dropdown */

const { useState: nUseState, useEffect: nUseEffect, useRef: nUseRef } = React;

const NOTIF_ICONS = {
  'achievement':      { icon:'🏆', color:'#F9A825', bg:'#FFF9C4' },
  'teacher-feedback': { icon:'📊', color:'#1F3A8A', bg:'#E3E9F8' },
  'module-activated': { icon:'📦', color:'#2EA84B', bg:'#E8F5E9' },
  'daily-reminder':   { icon:'🎯', color:'#E65100', bg:'#FFF3E0' },
  'forum-reply':      { icon:'💬', color:'#0D47A1', bg:'#E3F2FD' },
  'forum-like':       { icon:'❤️', color:'#C62828', bg:'#FFEBEE' },
  'payment':          { icon:'💳', color:'#1F3A8A', bg:'#E3E9F8' },
  'payment-ok':       { icon:'✅', color:'#2E7D32', bg:'#E8F5E9' },
  'assignment':       { icon:'📝', color:'#6A1B9A', bg:'#F3E5F5' },
  'streak':           { icon:'🔥', color:'#FF6F00', bg:'#FFF3E0' },
};

function NotifBell({ userId, onNotifClick }) {
  const [open, setOpen] = nUseState(false);
  const [tick, setTick] = nUseState(0);
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

  const notifs = window.JUCUM_NOTIF.getNotifs(userId);
  const unread = notifs.filter(n => !n.read).length;

  const handleClick = (n) => {
    window.JUCUM_NOTIF.markRead(userId, n.id);
    setTick(t => t + 1);
    if (onNotifClick) onNotifClick(n);
  };

  const handleMarkAll = () => {
    window.JUCUM_NOTIF.markAllRead(userId);
    setTick(t => t + 1);
  };

  return (
    <div className="bell-wrap" ref={ref}>
      <button className="bell-btn" onClick={() => setOpen(o => !o)} title="Notificaciones">
        🔔
        {unread > 0 && <span className="bell-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-panel-head">
            <div className="notif-panel-title">Notificaciones</div>
            {unread > 0 && <button className="notif-mark-all" onClick={handleMarkAll}>Marcar todas leídas</button>}
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
                return (
                  <button key={n.id} className={`notif-row ${n.read ? 'read' : ''}`} onClick={() => handleClick(n)}>
                    <div className="notif-ico" style={{background:meta.bg,color:meta.color}}>{meta.icon}</div>
                    <div className="notif-body">
                      <div className="notif-title">{n.title}</div>
                      <div className="notif-text">{n.body}</div>
                      <div className="notif-time">{relativeNotifTime(n.date)}</div>
                    </div>
                    {!n.read && <div className="notif-dot"></div>}
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
