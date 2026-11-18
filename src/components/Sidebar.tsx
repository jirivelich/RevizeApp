import { Link, useLocation, useNavigate } from 'react-router-dom';
import React from 'react';
import { logoutApi } from '../services/api';
import { getCurrentUser } from '../services/httpClient';
import { NotificationBell } from './NotificationBell';
import { useTheme } from '../context/ThemeContext';
import ZmenaHeslaModal from './ZmenaHeslaModal';
import { Icon } from './icons';
import type { IconName } from './icons';
import { LogoIcon, Wordmark } from './ReVeliLogo';

type NavSection = 'Práce' | 'Vybavení' | 'Správa' | null;

const navItems: { path: string; label: string; section: NavSection; icon: IconName }[] = [
  { path: '/', label: 'Přehled', section: null, icon: 'home' },
  { path: '/revize', label: 'Revizní zprávy', section: 'Práce', icon: 'doc' },
  { path: '/zavady', label: 'Závady', section: 'Práce', icon: 'warning' },
  { path: '/planovani', label: 'Kalendář', section: 'Práce', icon: 'calendar' },
  { path: '/pristroje', label: 'Přístroje', section: 'Vybavení', icon: 'bolt' },
  { path: '/firmy', label: 'Firmy', section: 'Správa', icon: 'building' },
  { path: '/zakaznici', label: 'Zákazníci', section: 'Správa', icon: 'users' },
  { path: '/nastaveni', label: 'Nastavení', section: 'Správa', icon: 'cog' },
];

const SECTIONS: NavSection[] = ['Práce', 'Vybavení', 'Správa'];

/** Rozbalovací skupina „Fakturace“ v sekci Práce (za Kalendářem). */
const FAKTURACE = {
  label: 'Fakturace',
  icon: 'invoice' as IconName,
  items: [
    { path: '/nabidky', label: 'Nabídky', icon: 'quote' as IconName },
    { path: '/faktury', label: 'Faktury', icon: 'invoice' as IconName },
    { path: '/cenik', label: 'Ceník', icon: 'tag' as IconName },
  ],
};
const FAKTURACE_KEY = 'reveli_menu_fakturace';

interface SidebarProps {
  onClose?: () => void;
}

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]';
const ghostBtn = `w-full h-8 px-2.5 inline-flex items-center gap-2 rounded-[var(--radius-md)] text-[13px] font-medium text-[var(--nav-text)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)] transition-colors cursor-pointer ${FOCUS}`;

export function Sidebar({ onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { themeName, setTheme } = useTheme();
  const [showZmenaHesla, setShowZmenaHesla] = React.useState(false);

  // Skupina Fakturace: rozbalená, když je v ní aktivní stránka; jinak podle posledního stavu
  const fakturaceAktivni = FAKTURACE.items.some(i => location.pathname.startsWith(i.path));
  const [fakturaceOtevrena, setFakturaceOtevrena] = React.useState<boolean>(() => {
    try { return localStorage.getItem(FAKTURACE_KEY) === '1'; } catch { return false; }
  });
  const otevrena = fakturaceOtevrena || fakturaceAktivni;
  const prepniFakturaci = () => {
    const nova = !otevrena;
    setFakturaceOtevrena(nova);
    try { localStorage.setItem(FAKTURACE_KEY, nova ? '1' : '0'); } catch { /* bez úložiště */ }
  };

  const handleLogout = async () => {
    await logoutApi();
    navigate('/login');
  };

  const user = getCurrentUser<{ username: string; email: string }>();
  const initials = user?.username
    ? user.username.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const renderNavItem = (item: { path: string; label: string; icon: IconName }, vnoreny = false) => {
    const isActive = location.pathname === item.path ||
      (item.path !== '/' && location.pathname.startsWith(item.path));

    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={onClose}
        aria-current={isActive ? 'page' : undefined}
        className={`flex items-center gap-2.5 ${vnoreny ? 'h-[34px] pl-[30px] pr-2.5' : 'h-[38px] px-2.5'} rounded-[var(--radius-md)] text-[13px] font-medium transition-colors ${FOCUS} ${
          isActive
            ? 'bg-[var(--active-bg)] text-[var(--nav-text-active)] shadow-[inset_2px_0_0_var(--primary)]'
            : 'text-[var(--nav-text)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]'
        }`}
      >
        <Icon name={item.icon} size={vnoreny ? 17 : 20} />
        {item.label}
      </Link>
    );
  };

  const renderFakturace = () => (
    <div key="fakturace" className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={prepniFakturaci}
        aria-expanded={otevrena}
        aria-controls="menu-fakturace"
        className={`flex items-center gap-2.5 h-[38px] px-2.5 rounded-[var(--radius-md)] text-[13px] font-medium transition-colors cursor-pointer ${FOCUS} ${
          fakturaceAktivni && !otevrena ? 'text-[var(--nav-text-active)]' : 'text-[var(--nav-text)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]'
        }`}
      >
        <Icon name={FAKTURACE.icon} size={20} />
        <span className="flex-1 text-left">{FAKTURACE.label}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true" className={`transition-transform ${otevrena ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {otevrena && (
        <div id="menu-fakturace" className="flex flex-col gap-0.5">
          {FAKTURACE.items.map(i => renderNavItem(i, true))}
        </div>
      )}
    </div>
  );

  const dashboardItem = navItems.find(i => i.section === null)!;

  return (
    <>
      <aside className="w-56 h-full min-h-dvh flex flex-col shrink-0 bg-[var(--bg-sidebar)] border-r border-[var(--border)]">
        {/* Logo */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-2.5">
            <LogoIcon size={30} />
            <Wordmark className="text-lg" />
          </div>
          <button
            onClick={onClose}
            className={`lg:hidden p-1.5 rounded-[var(--radius-md)] text-[var(--nav-text)] hover:bg-[var(--bg-hover)] ${FOCUS}`}
            aria-label="Zavřít menu"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Navigace */}
        <nav aria-label="Hlavní" className="flex-1 overflow-y-auto px-2.5 pb-2 flex flex-col gap-0.5">
          {renderNavItem(dashboardItem)}
          {SECTIONS.map(section => (
            <div key={section} className="flex flex-col gap-0.5">
              <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] px-2.5 pt-3 pb-1">{section}</div>
              {navItems.filter(i => i.section === section).map(i => renderNavItem(i))}
              {section === 'Práce' && renderFakturace()}
            </div>
          ))}
        </nav>

        {/* Upozornění */}
        <div className="px-2.5 pb-1 pt-1 border-t border-[var(--border)]">
          <NotificationBell strongText />
        </div>

        {/* Uživatel */}
        <div className="px-2.5 pt-2 pb-3 border-t border-[var(--border)] flex flex-col gap-0.5">
          {user && (
            <div className="flex items-center gap-2.5 px-2.5 py-2">
              <div className="w-[30px] h-[30px] rounded-full bg-[var(--bg-secondary-accent)] text-[var(--secondary)] grid place-items-center text-xs font-bold shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-[var(--text)] truncate">{user.username}</div>
                <div className="text-[11px] text-[var(--text-muted)] truncate">{user.email}</div>
              </div>
            </div>
          )}
          <button onClick={() => setShowZmenaHesla(true)} className={ghostBtn}>
            <Icon name="lock" size={16} />
            Změnit heslo
          </button>
          <button onClick={() => setTheme(themeName === 'dark' ? 'light' : 'dark')} className={ghostBtn}>
            <Icon name={themeName === 'dark' ? 'sun' : 'moon'} size={16} />
            {themeName === 'dark' ? 'Světlý motiv' : 'Tmavý motiv'}
          </button>
          <button onClick={handleLogout} className={ghostBtn}>
            <Icon name="logout" size={16} />
            Odhlásit se
          </button>
          <p className="text-[10px] text-[var(--text-muted)] text-center mt-2">© 2026 ReVeli v1.0.0</p>
        </div>
      </aside>
      {showZmenaHesla && <ZmenaHeslaModal onClose={() => setShowZmenaHesla(false)} />}
    </>
  );
}
