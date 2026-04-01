import { Link, useLocation, useNavigate } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Dashboard', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" /></svg>
  )},
  { path: '/revize', label: 'Revize', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
  )},
  { path: '/zavady', label: 'Závady', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.999L13.732 4.001c-.77-1.333-2.694-1.333-3.464 0L3.34 16.001C2.57 17.334 3.532 19 5.072 19z" /></svg>
  )},
  { path: '/pristroje', label: 'Přístroje', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
  )},
  { path: '/firmy', label: 'Firmy', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
  )},
  { path: '/zakaznici', label: 'Zákazníci', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
  )},
  { path: '/planovani', label: 'Plánování', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
  )},
  { path: '/nastaveni', label: 'Nastavení', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
  )},
];

interface SidebarProps {
  onClose?: () => void;
}

import styles from './SidebarLight.module.css';
import { useState } from 'react';

export function Sidebar({ onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [light, setLight] = useState(true);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;

  return (
    <aside className={light ? `${styles['sidebar-light']} w-56 min-h-screen flex flex-col` : 'w-56 bg-slate-900 text-white min-h-screen flex flex-col'}>
      <div className={light ? `${styles['sidebar-header']} px-4 py-3 flex items-center justify-between` : 'px-4 py-3 border-b border-slate-800 flex items-center justify-between'}>
        <div className="flex items-center gap-2.5">
          <div className={light ? 'w-7 h-7 bg-white rounded flex items-center justify-center' : 'w-7 h-7 bg-slate-700 rounded flex items-center justify-center'}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div>
            <h1 className={light ? 'text-base font-bold tracking-tight text-[#1e293b]' : 'text-base font-bold tracking-tight'}>RevizeApp</h1>
            <p className={light ? 'text-[11px] mt-0.5 text-[#1e293b]' : 'text-slate-500 text-[11px] mt-0.5'}>Správa elektro revizí</p>
          </div>
        </div>
        <button
          onClick={() => setLight((v) => !v)}
          className="mr-2 p-1 rounded border border-slate-200 bg-white text-xs text-slate-600 hover:bg-slate-100"
          aria-label="Přepnout světlé/tmavé menu"
        >
          {light ? 'Tmavé' : 'Světlé'}
        </button>
        {/* Tlačítko pro zavření menu na mobilu */}
        <button
          onClick={onClose}
          className={light ? 'lg:hidden p-2 hover:bg-slate-200 rounded' : 'lg:hidden p-2 hover:bg-slate-700 rounded'}
          aria-label="Zavřít menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <nav className="flex-1 px-2 py-3">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={onClose}
                  className={light
                    ? `${styles['sidebar-link']} flex items-center gap-2.5 px-3 py-2 rounded text-[13px] font-medium transition-colors ${isActive ? 'active ' + styles['active'] : ''}`
                    : `flex items-center gap-2.5 px-3 py-2 rounded text-[13px] font-medium transition-colors ${
                        isActive
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                      }`}
                >
                  <span className={isActive ? (light ? styles['active'] : 'text-slate-300') : (light ? '' : 'text-slate-500')}>{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className={light ? `${styles['sidebar-footer']} px-3 py-3 space-y-2` : 'border-t border-slate-800 px-3 py-3 space-y-2'}>
        {user && (
          <div className={light ? 'text-xs' : 'text-slate-400 text-xs'}>
            <p className={light ? 'font-medium' : 'font-medium text-slate-300'}>{user.username}</p>
            <p className={light ? 'text-[11px]' : 'text-slate-500 text-[11px]'}>{user.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={light ? 'w-full border border-slate-200 text-slate-600 hover:text-blue-700 hover:border-blue-300 text-xs font-medium py-1.5 px-3 rounded transition-colors' : 'w-full border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-xs font-medium py-1.5 px-3 rounded transition-colors'}
        >
          Odhlásit se
        </button>
        <p className={light ? 'text-[10px] text-center' : 'text-slate-600 text-[10px] text-center'}>© 2026 RevizeApp v1.0.0</p>
      </div>
    </aside>
  );
}
