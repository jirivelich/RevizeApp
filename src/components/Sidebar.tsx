import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { logoutApi } from '../services/api';
import { NotificationBell } from './NotificationBell';

type NavSection = 'Práce' | 'Vybavení' | 'Správa' | null;

const navItems: { path: string; label: string; section: NavSection; icon: JSX.Element }[] = [
  { path: '/', label: 'Dashboard', section: null, icon: (
    <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" /></svg>
  )},
  { path: '/revize', label: 'Revize', section: 'Práce', icon: (
    <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
  )},
  { path: '/zavady', label: 'Závady', section: 'Práce', icon: (
    <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.999L13.732 4.001c-.77-1.333-2.694-1.333-3.464 0L3.34 16.001C2.57 17.334 3.532 19 5.072 19z" /></svg>
  )},
  { path: '/planovani', label: 'Plánování', section: 'Práce', icon: (
    <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
  )},
  { path: '/pristroje', label: 'Přístroje', section: 'Vybavení', icon: (
    <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
  )},
  { path: '/firmy', label: 'Firmy', section: 'Správa', icon: (
    <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
  )},
  { path: '/zakaznici', label: 'Zákazníci', section: 'Správa', icon: (
    <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
  )},
  { path: '/nastaveni', label: 'Nastavení', section: 'Správa', icon: (
    <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
  )},
];

const SECTIONS: NavSection[] = ['Práce', 'Vybavení', 'Správa'];

interface SidebarProps {
  onClose?: () => void;
}

const sidebarStyle: CSSProperties = {
  width: 224,
  minHeight: '100vh',
  background: '#080d1a',
  borderRight: '1px solid rgba(255,255,255,0.06)',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  flexShrink: 0,
};

const sectionLabelStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#1e3a5f',
  padding: '10px 10px 4px',
  marginTop: 4,
};

export function Sidebar({ onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logoutApi();
    navigate('/login');
  };

  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;
  const initials = user?.username
    ? user.username.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const renderNavItem = (item: typeof navItems[0]) => {
    const isActive = location.pathname === item.path ||
      (item.path !== '/' && location.pathname.startsWith(item.path));

    const activeStyle: CSSProperties = {
      display: 'flex', alignItems: 'center', gap: 9,
      padding: '8px 10px', borderRadius: 8,
      fontSize: 13, fontWeight: 500,
      background: 'rgba(59,130,246,0.12)',
      color: '#93c5fd',
      border: '1px solid rgba(59,130,246,0.18)',
      textDecoration: 'none',
      position: 'relative',
      marginBottom: 2,
    };
    const defaultStyle: CSSProperties = {
      display: 'flex', alignItems: 'center', gap: 9,
      padding: '8px 10px', borderRadius: 8,
      fontSize: 13, fontWeight: 500,
      color: '#475569',
      textDecoration: 'none',
      marginBottom: 2,
      border: '1px solid transparent',
    };

    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={onClose}
        style={isActive ? activeStyle : defaultStyle}
        className={isActive ? '' : 'sidebar-nav-item'}
      >
        {isActive && (
          <span style={{
            position: 'absolute', left: -1, top: '50%', transform: 'translateY(-50%)',
            width: 3, height: 18, background: '#3b82f6', borderRadius: '0 2px 2px 0',
            boxShadow: '0 0 8px rgba(59,130,246,0.6)',
          }} />
        )}
        <span style={{ flexShrink: 0 }}>{item.icon}</span>
        {item.label}
      </Link>
    );
  };

  // Dashboard (no section)
  const dashboardItem = navItems.find(i => i.section === null)!;

  return (
    <>
      <style>{`
        .sidebar-nav-item:hover {
          background: rgba(255,255,255,0.04) !important;
          color: #94a3b8 !important;
        }
        .sidebar-logout:hover {
          background: rgba(255,255,255,0.06) !important;
          border-color: rgba(255,255,255,0.10) !important;
          color: #94a3b8 !important;
        }
      `}</style>
      <aside style={sidebarStyle}>
        {/* Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34,
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 16px rgba(59,130,246,0.45)', flexShrink: 0,
            }}>
              <svg width="18" height="18" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.3px' }}>RevizeApp</div>
              <div style={{ fontSize: 10, color: '#334155', marginTop: 1 }}>Správa elektro revizí</div>
            </div>
          </div>
          {/* Mobilní zavírací tlačítko */}
          <button
            onClick={onClose}
            className="lg:hidden"
            style={{ padding: 6, color: '#475569', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6 }}
            aria-label="Zavřít menu"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column' }}>
          {renderNavItem(dashboardItem)}
          {SECTIONS.map(section => (
            <div key={section}>
              <div style={sectionLabelStyle}>{section}</div>
              {navItems.filter(i => i.section === section).map(renderNavItem)}
            </div>
          ))}
        </nav>

        {/* Notification bell */}
        <div style={{ padding: '0 8px 4px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <NotificationBell />
        </div>

        {/* User footer */}
        <div style={{ padding: '10px 12px 12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {user && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '8px 10px', borderRadius: 8,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
              marginBottom: 8,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0,
              }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.username}</div>
                <div style={{ fontSize: 10, color: '#334155', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="sidebar-logout"
            style={{
              width: '100%', padding: '7px 12px', borderRadius: 8,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
              color: '#475569', fontSize: 12, fontWeight: 500,
              cursor: 'pointer', textAlign: 'center', transition: 'all .15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Odhlásit se
          </button>
          <p style={{ fontSize: 10, color: '#1e3a5f', textAlign: 'center', marginTop: 8 }}>© 2026 RevizeApp v1.0.0</p>
        </div>
      </aside>
    </>
  );
}
