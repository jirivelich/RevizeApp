import { NavLink, useLocation } from 'react-router-dom';

interface BottomNavProps {
  onMenu: () => void;
}

const ICON = 'w-6 h-6';

const items = [
  {
    to: '/',
    label: 'Přehled',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />,
  },
  {
    to: '/revize',
    label: 'Revize',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  },
  {
    to: '/planovani',
    label: 'Kalendář',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
  },
  {
    to: '/zavady',
    label: 'Závady',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.999L13.732 4.001c-.77-1.333-2.694-1.333-3.464 0L3.34 16.001C2.57 17.334 3.532 19 5.072 19z" />,
  },
];

/** Spodní navigace pro mobil a tablet (pod lg). Na detailu revize ji nahrazuje lišta s akcemi. */
export function BottomNav({ onMenu }: BottomNavProps) {
  const { pathname } = useLocation();
  if (/^\/revize\/[^/]+/.test(pathname)) return null;

  const base =
    'flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring-color)]';

  return (
    <nav
      aria-label="Hlavní navigace"
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 flex bg-[var(--surface)] border-t border-[var(--border-medium)] pb-[env(safe-area-inset-bottom)]"
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `${base} ${isActive ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`
          }
        >
          <svg className={ICON} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
            {item.icon}
          </svg>
          {item.label}
        </NavLink>
      ))}
      <button
        type="button"
        onClick={onMenu}
        className={`${base} text-[var(--text-muted)]`}
      >
        <svg className={ICON} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        Více
      </button>
    </nav>
  );
}
