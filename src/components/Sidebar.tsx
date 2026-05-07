import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { CSSProperties } from 'react';
import React from 'react';
import { logoutApi } from '../services/api';
import { NotificationBell } from './NotificationBell';
import { useTheme } from '../context/ThemeContext';
import ZmenaHeslaModal from './ZmenaHeslaModal';

type NavSection = 'Práce' | 'Vybavení' | 'Správa' | null;

const navItems: { path: string; label: string; section: NavSection; icon: React.ReactElement }[] = [
  { path: '/', label: 'Přehled', section: null, icon: (
    <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" /></svg>
  )},
  { path: '/revize', label: 'Revizní zprávy', section: 'Práce', icon: (
    <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
  )},
  { path: '/zavady', label: 'Závady', section: 'Práce', icon: (
    <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.999L13.732 4.001c-.77-1.333-2.694-1.333-3.464 0L3.34 16.001C2.57 17.334 3.532 19 5.072 19z" /></svg>
  )},
  { path: '/planovani', label: 'Kalendář', section: 'Práce', icon: (
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
  background: 'var(--bg-sidebar)',
  borderRight: '1px solid var(--border)',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  overflow: 'hidden',
  flexShrink: 0,
};

const sectionLabelStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  padding: '10px 10px 4px',
  marginTop: 4,
};

export function Sidebar({ onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { themeName, setTheme } = useTheme();
  const [showZmenaHesla, setShowZmenaHesla] = React.useState(false);

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
      background: 'var(--active-bg)',
      color: 'var(--nav-text-active)',
      border: '1px solid var(--active-border)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      textDecoration: 'none',
      position: 'relative',
      marginBottom: 2,
    };
    const defaultStyle: CSSProperties = {
      display: 'flex', alignItems: 'center', gap: 9,
      padding: '8px 10px', borderRadius: 8,
      fontSize: 13, fontWeight: 500,
      color: 'var(--nav-text)',
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
          background: var(--bg-hover) !important;
          border-color: var(--border-medium) !important;
          color: var(--text) !important;
          transition: all 0.15s ease;
        }
        .sidebar-logout:hover {
          background: var(--bg-hover-strong) !important;
          border-color: var(--border-strong) !important;
          color: var(--text) !important;
        }
      `}</style>
      <aside style={sidebarStyle}>
        {/* Decorative electrical schematic background */}
        <svg
          aria-hidden="true"
          viewBox="0 0 224 900"
          preserveAspectRatio="xMidYMin slice"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0.13,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          <g stroke="var(--primary)" strokeWidth="1" fill="none">
            <polyline points="18,40 18,140 60,140 60,210" />
            <polyline points="60,210 110,210 110,300 170,300" />
            <polyline points="170,300 170,400 90,400 90,500" />
            <polyline points="90,500 30,500 30,620 130,620 130,720" />
            <polyline points="130,720 200,720 200,820" />
            <polyline points="200,820 80,820 80,880" />
            <polyline points="206,40 206,120 150,120 150,180" />
            <polyline points="150,180 200,180 200,260" />
          </g>
          <g fill="var(--primary)">
            <circle cx="18" cy="40" r="2.5" />
            <circle cx="60" cy="210" r="2.5" />
            <circle cx="110" cy="300" r="2.5" />
            <circle cx="170" cy="400" r="2.5" />
            <circle cx="90" cy="500" r="2.5" />
            <circle cx="30" cy="620" r="2.5" />
            <circle cx="130" cy="720" r="2.5" />
            <circle cx="200" cy="820" r="2.5" />
            <circle cx="80" cy="880" r="2.5" />
            <circle cx="206" cy="40" r="2.5" />
            <circle cx="150" cy="180" r="2.5" />
            <circle cx="200" cy="260" r="2.5" />
          </g>
          <g stroke="var(--primary)" strokeWidth="1" fill="none">
            <rect x="54" y="168" width="12" height="6" />
            <rect x="104" y="258" width="12" height="6" />
            <rect x="164" y="348" width="12" height="6" />
            <rect x="84" y="458" width="12" height="6" />
            <rect x="24" y="568" width="12" height="6" />
            <rect x="124" y="678" width="12" height="6" />
            <rect x="194" y="778" width="12" height="6" />
          </g>
        </svg>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34,
              background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
              borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--glow-primary)', flexShrink: 0,
            }}>
              <svg width="18" height="18" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>JV Revize</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', marginTop: 1 }}>Správa elektro revizí</div>
            </div>
          </div>
          {/* Mobilní zavírací tlačítko */}
          <button
            onClick={onClose}
            className="lg:hidden"
            style={{ padding: 6, color: 'var(--nav-text)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6 }}
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
        <div style={{ padding: '0 8px 4px', borderTop: '1px solid var(--border)' }}>
          <NotificationBell strongText />
        </div>

        {/* User footer */}
        <div style={{ padding: '10px 12px 12px', borderTop: '1px solid var(--border)', background: 'var(--bg-faint)', backdropFilter: 'blur(12px)' }}>
          {user && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '8px 10px', borderRadius: 8,
              background: 'var(--bg-faint)', border: '1px solid var(--border)',
              marginBottom: 8,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'linear-gradient(135deg, var(--primary), var(--nav-text-active))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0,
              }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.username}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
              </div>
            </div>
          )}
          <button
            onClick={() => setShowZmenaHesla(true)}
            className="sidebar-logout"
            style={{
              width: '100%', padding: '7px 12px', borderRadius: 8,
              background: 'var(--bg-hover)', border: '1px solid var(--border-input)',
              color: 'var(--text)', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', textAlign: 'center', transition: 'all .15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              marginBottom: 6,
            }}
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Změnit heslo
          </button>
          <button
            onClick={() => setTheme(themeName === 'dark' ? 'light' : 'dark')}
            className="sidebar-logout"
            style={{
              width: '100%', padding: '7px 12px', borderRadius: 8,
              background: 'var(--bg-hover)', border: '1px solid var(--border-input)',
              color: 'var(--text)', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', textAlign: 'center', transition: 'all .15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              marginBottom: 6,
            }}
          >
            {themeName === 'dark' ? '☀️ Světlý motiv' : '🌙 Tmavý motiv'}
          </button>
          <button
            onClick={handleLogout}
            className="sidebar-logout"
            style={{
              width: '100%', padding: '7px 12px', borderRadius: 8,
              background: 'var(--bg-hover)', border: '1px solid var(--border-input)',
              color: 'var(--text)', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', textAlign: 'center', transition: 'all .15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Odhlásit se
          </button>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>© 2026 JV Revize v1.0.0</p>
        </div>
      </aside>
      {showZmenaHesla && <ZmenaHeslaModal onClose={() => setShowZmenaHesla(false)} />}
    </>
  );
}
