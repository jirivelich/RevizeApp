/**
 * Navigace na místo zakázky: menu s výběrem aplikace (Mapy.com, Google Mapy, Waze, Apple Mapy,
 * na Androidu i systémový výběr aplikace přes geo: odkaz). Na mobilu odkazy otevřou nainstalovanou aplikaci.
 */
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { navigacniOdkazy, type NavCil } from '../utils/navigace';

export function NavigaceMenu({ cil, className = '', children, label }: {
  cil: NavCil;
  className?: string;
  /** Obsah tlačítka; bez něj ikona špendlíku. */
  children?: ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const odkazy = navigacniOdkazy(cil, typeof navigator !== 'undefined' ? navigator.userAgent : '');

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !btnRef.current?.contains(t)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus(); } };
    const zavrit = () => setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    document.addEventListener('keydown', esc);
    window.addEventListener('scroll', zavrit, true);
    window.addEventListener('resize', zavrit);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      document.removeEventListener('keydown', esc);
      window.removeEventListener('scroll', zavrit, true);
      window.removeEventListener('resize', zavrit);
    };
  }, [open]);

  if (!cil.adresa?.trim() && cil.lat == null) return children ? <span className={className}>{children}</span> : null;

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const r = btnRef.current!.getBoundingClientRect();
    const sirka = 240;
    const vyska = 48 * odkazy.length + 44;
    const top = r.bottom + 4 + vyska > window.innerHeight ? Math.max(8, r.top - 4 - vyska) : r.bottom + 4;
    setPos({ top, left: Math.max(8, Math.min(r.left, window.innerWidth - sirka - 8)) });
    setOpen(o => !o);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Navigovat na místo"
        aria-label={label ?? (children ? undefined : `Navigovat: ${cil.adresa ?? ''}`)}
        className={className}
      >
        {children ?? <IkonaNavigace />}
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Navigovat pomocí"
          className="fixed z-[9999] w-[240px] p-1 bg-[var(--surface)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)]"
          style={pos}
          onClick={e => e.stopPropagation()}
        >
          <div className="px-3 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--text-secondary)]">
            Navigovat {cil.lat != null ? 'na uloženou polohu' : 'na adresu'}
          </div>
          {odkazy.map(o => (
            <a
              key={o.id}
              role="menuitem"
              href={o.url}
              target={o.url.startsWith('geo:') ? undefined : '_blank'}
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="w-full min-h-[44px] px-3 rounded-[var(--radius-md)] flex items-center gap-2.5 text-sm text-[var(--text)] hover:bg-[var(--bg-hover)]"
            >
              <span className="w-2 h-2 rounded-full flex-none" style={{ background: o.barva }} />
              <span className="flex-1">{o.nazev}</span>
              {o.pozn && <span className="text-[11px] text-[var(--text-muted)]">{o.pozn}</span>}
            </a>
          ))}
        </div>
      )}
    </>
  );
}

export function IkonaNavigace({ size = 16 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </svg>
  );
}
