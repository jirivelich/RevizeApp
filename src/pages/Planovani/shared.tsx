/** Sdílené prvky pohledů Plánování (seznam, týden, měsíc). */
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Revize, Zakaznik, Zakazka } from '../../types';
import { KAT_META, KAT_ORDER, primaryAction, mapsUrl, telHref, isClosed, type KatKey } from './model';
import { STAV_OPTIONS } from './utils';

/** Data a akce společné všem pohledům. */
export interface PlanProps {
  zakazky: Zakazka[];
  revizeById: Map<number, Revize>;
  zakazniciById: Map<number, Zakaznik>;
  today: string;
  onEdit: (z: Zakazka) => void;
  onCreateAt: (date: string, time?: string) => void;
  onCreateRevize: (z: Zakazka) => void;
  onOpenRevize: (z: Zakazka) => void;
  onMarkReportDone: (z: Zakazka) => void;
  onComplete: (z: Zakazka) => void;
  onUpdateStav: (id: number, stav: Zakazka['stav']) => void;
  onDelete: (id: number) => void;
  /** Přetažení na den; time = 'HH:mm' (časová osa) nebo 'allday' (řádek Celý den). */
  onMove: (z: Zakazka, date: string, time: string | 'allday') => void;
}

// ── Kategorie ──────────────────────────────────────────────

export function KatDot({ kat, size = 9 }: { kat: KatKey; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, background: KAT_META[kat].color }}
    />
  );
}

/** Legenda / filtr kategorií. Bez `selected` jen legenda. */
export function KatLegend({ selected, onToggle }: { selected?: Set<KatKey>; onToggle?: (k: KatKey) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1" role={onToggle ? 'group' : undefined} aria-label={onToggle ? 'Kategorie' : undefined}>
      {KAT_ORDER.map(k => {
        const content = (<><KatDot kat={k} />{KAT_META[k].label}</>);
        if (!onToggle) {
          return <span key={k} className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">{content}</span>;
        }
        const on = !selected || selected.size === 0 || selected.has(k);
        return (
          <button
            key={k}
            type="button"
            aria-pressed={!!selected?.has(k)}
            onClick={() => onToggle(k)}
            className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full border text-xs font-semibold transition-colors ${
              selected?.has(k)
                ? 'border-[var(--primary)] bg-[var(--bg-accent)] text-[var(--text)]'
                : 'border-[var(--border-input)] text-[var(--text-secondary)] hover:text-[var(--text)]'
            } ${on ? '' : 'opacity-60'}`}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}

// ── Hlavní akce ────────────────────────────────────────────

export function PrimaryActionButton({ z, p, compact = false }: { z: Zakazka; p: PlanProps; compact?: boolean }) {
  const a = primaryAction(z);
  if (!a) return null;
  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (a.kind === 'create') p.onCreateRevize(z);
    else if (a.kind === 'open') p.onOpenRevize(z);
    else p.onMarkReportDone(z);
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 inline-flex items-center justify-center rounded-[var(--radius-md)] font-semibold whitespace-nowrap transition-colors ${
        compact ? 'min-h-[36px] px-3 text-xs' : 'min-h-[40px] px-3.5 text-[13px]'
      } ${a.primary
        ? 'bg-[var(--primary)] text-[var(--primary-fg)] hover:bg-[var(--primary-hover)]'
        : 'border border-[var(--border-input)] text-[var(--text)] hover:bg-[var(--bg-hover)]'}`}
    >
      {a.label}
    </button>
  );
}

// ── Ikony a odkazy ─────────────────────────────────────────

export function IconPin({ size = 16 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}
export function IconPhone({ size = 16 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.58 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
export function IconChevron({ dir, size = 16 }: { dir: 'left' | 'right' | 'down'; size?: number }) {
  const pts = dir === 'left' ? '15 18 9 12 15 6' : dir === 'right' ? '9 18 15 12 9 6' : '6 9 12 15 18 9';
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points={pts} /></svg>
  );
}
export function IconDoc({ size = 13 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

export function MapLink({ adresa, className = '', children }: { adresa: string; className?: string; children?: ReactNode }) {
  return (
    <a
      href={mapsUrl(adresa)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      title="Otevřít v navigaci"
      aria-label={children ? undefined : `Navigovat: ${adresa}`}
      className={className}
    >
      {children ?? <IconPin />}
    </a>
  );
}

export function PhoneLink({ tel, className = '' }: { tel: string; className?: string }) {
  return (
    <a href={telHref(tel)} onClick={e => e.stopPropagation()} aria-label={`Zavolat ${tel}`} title={tel} className={className}>
      <IconPhone />
    </a>
  );
}

// ── Navigace v kalendáři ───────────────────────────────────

export function NavBar({ title, onPrev, onNext, onToday, right, prevLabel, nextLabel }: {
  title: string; onPrev: () => void; onNext: () => void; onToday: () => void; right?: ReactNode; prevLabel: string; nextLabel: string;
}) {
  const btn = 'min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-input)] bg-[var(--bg-input)] text-[var(--text)] hover:bg-[var(--bg-hover)]';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" aria-label={prevLabel} onClick={onPrev} className={btn}><IconChevron dir="left" /></button>
      <button type="button" onClick={onToday} className={`${btn} px-3 text-[13px] font-semibold`}>Dnes</button>
      <button type="button" aria-label={nextLabel} onClick={onNext} className={btn}><IconChevron dir="right" /></button>
      <h2 className="text-base md:text-lg font-bold text-[var(--text)] ml-1 mr-auto first-letter:uppercase">{title}</h2>
      {right}
    </div>
  );
}

// ── Menu „⋯“ ───────────────────────────────────────────────

export function RowMenu({ z, p }: { z: Zakazka; p: PlanProps }) {
  const [open, setOpen] = useState(false);
  const [stavOpen, setStavOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !btnRef.current?.contains(t)) { setOpen(false); setStavOpen(false); }
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus(); } };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const r = btnRef.current!.getBoundingClientRect();
    const top = Math.min(r.bottom + 4, window.innerHeight - 280);
    setPos({ top, right: window.innerWidth - r.right });
    setOpen(o => !o);
  };
  const item = 'w-full text-left px-3 min-h-[40px] rounded-[var(--radius-md)] text-sm text-[var(--text)] hover:bg-[var(--bg-hover)] flex items-center gap-2';
  const run = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); setOpen(false); setStavOpen(false); };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label="Další akce"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
        className="shrink-0 w-9 h-9 inline-flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]"
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></svg>
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-[9999] min-w-[200px] p-1 bg-[var(--surface)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)]"
          style={{ top: pos.top, right: pos.right }}
          onClick={e => e.stopPropagation()}
        >
          <button type="button" role="menuitem" className={item} onClick={run(() => p.onEdit(z))}>Upravit</button>
          {!isClosed(z) && (
            <button type="button" role="menuitem" className={item} onClick={run(() => p.onComplete(z))}>Dokončit</button>
          )}
          {!z.revizeId && z.stav !== 'zrušeno' && (
            <button type="button" role="menuitem" className={item} onClick={run(() => p.onCreateRevize(z))}>Založit revizi</button>
          )}
          <button type="button" role="menuitem" aria-expanded={stavOpen} className={`${item} justify-between`} onClick={e => { e.stopPropagation(); setStavOpen(s => !s); }}>
            Změnit stav <span className={`transition-transform ${stavOpen ? 'rotate-180' : ''}`}><IconChevron dir="down" size={14} /></span>
          </button>
          {stavOpen && (
            <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-faint)]">
              {STAV_OPTIONS.map(s => (
                <button key={s.value} type="button" role="menuitemradio" aria-checked={z.stav === s.value}
                  className={`w-full text-left px-5 min-h-[36px] text-[13px] hover:bg-[var(--bg-hover)] ${z.stav === s.value ? 'text-[var(--primary)] font-semibold' : 'text-[var(--text-secondary)]'}`}
                  onClick={run(() => p.onUpdateStav(z.id!, s.value))}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
          <div className="border-t border-[var(--border-subtle)] my-1" />
          <button type="button" role="menuitem" className={`${item} text-[var(--danger-text)] hover:bg-[var(--danger-bg)]`} onClick={run(() => p.onDelete(z.id!))}>Smazat</button>
        </div>
      )}
    </>
  );
}
