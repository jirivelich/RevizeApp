import { NavLink, useLocation } from 'react-router-dom';
import { Icon } from './icons';
import type { IconName } from './icons';

interface BottomNavProps {
  onMenu: () => void;
}

const items: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Přehled', icon: 'home' },
  { to: '/revize', label: 'Revize', icon: 'doc' },
  { to: '/planovani', label: 'Kalendář', icon: 'calendar' },
  { to: '/zavady', label: 'Závady', icon: 'warning' },
];

/** Spodní navigace pro mobil a tablet (pod lg). Na detailu revize ji nahrazuje lišta s akcemi. */
export function BottomNav({ onMenu }: BottomNavProps) {
  const { pathname } = useLocation();
  if (/^\/revize\/[^/]+/.test(pathname)) return null;

  const base =
    'flex-1 flex flex-col items-center justify-center gap-[3px] min-h-[62px] text-[10.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring-color)]';

  return (
    <nav
      aria-label="Hlavní navigace"
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 flex bg-[var(--bg-sidebar)] border-t border-[var(--border)] pb-[env(safe-area-inset-bottom)]"
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `${base} ${isActive ? 'text-[var(--primary)]' : 'text-[var(--nav-text)]'}`
          }
        >
          <Icon name={item.icon} size={24} />
          {item.label}
        </NavLink>
      ))}
      <button type="button" onClick={onMenu} className={`${base} text-[var(--nav-text)]`}>
        <Icon name="menu" size={24} />
        Více
      </button>
    </nav>
  );
}
