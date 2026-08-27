import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Zakazka } from '../../types';
import { Badge } from '../../components/ui';
import type { BadgeVariant } from '../../components/ui';
import { getRealizaceDays, getReportDeadline, isOverdue, formatDayShort } from './utils';

const STAV_BORDER_COLOR: Record<Zakazka['stav'], string> = {
  'plánováno': 'border-l-blue-500',
  'v realizaci': 'border-l-amber-500',
  'dokončeno': 'border-l-emerald-500',
  'zrušeno': 'border-l-red-400',
};

const PRIORITA_BADGE_VARIANT: Record<Zakazka['priorita'], BadgeVariant> = {
  'vysoká': 'danger',
  'střední': 'warning',
  'nizká': 'info',
};

function IconEdit() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
    </svg>
  );
}

function IconStatus() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  );
}

function IconChevron() {
  return (
    <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

interface ZakazkaCardProps {
  zakazka: Zakazka;
  onEdit: (zakazka: Zakazka) => void;
  onUpdateStav: (id: number, stav: Zakazka['stav']) => void;
  onDelete: (id: number) => void;
  onCreateRevize: (zakazka: Zakazka) => void;
}

export function ZakazkaCard({ zakazka: z, onEdit, onUpdateStav, onDelete, onCreateRevize }: ZakazkaCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [stavOpen, setStavOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  const realizaceDays = getRealizaceDays(z);
  const reportDeadline = getReportDeadline(z);
  const daysLabel = realizaceDays.length > 1
    ? realizaceDays.map(formatDayShort).join(', ')
    : new Date(realizaceDays[0]).toLocaleDateString('cs-CZ');

  const isDone = z.stav === 'dokončeno' || z.stav === 'zrušeno';

  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setStavOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <div
      className={`group rounded-lg border border-[var(--border)] border-l-[3px] ${STAV_BORDER_COLOR[z.stav]} bg-[var(--bg-faint)] px-3 py-2.5 transition-all hover:border-[var(--border-strong)]${isDone ? ' opacity-70' : ''}`}
    >
      {/* Řádek 1: název + datum */}
      <div className="flex items-center gap-2 mb-1.5 min-w-0">
        <p className="font-semibold text-sm text-[var(--text)] flex-1 truncate">{z.nazev}</p>
        <span className="text-xs text-[var(--text-muted)] shrink-0">{daysLabel}</span>
      </div>

      {/* Řádek 2: klient + badges + ⋮ menu */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-xs bg-[var(--bg-hover)] text-[var(--text-secondary)] px-2 py-0.5 rounded-full shrink-0 max-w-[180px] truncate">
          {z.klient}
        </span>
        <Badge variant={PRIORITA_BADGE_VARIANT[z.priorita]} className="shrink-0">{z.priorita}</Badge>
        {reportDeadline && (
          <Badge variant={isOverdue(reportDeadline) ? 'danger' : 'warning'} className="shrink-0">
            {new Date(reportDeadline).toLocaleDateString('cs-CZ')}
          </Badge>
        )}
        {z.datumOdevzdaniZpravy && z.stav !== 'zrušeno' && (
          <Badge variant="info" className="shrink-0">Odevzdáno</Badge>
        )}

        {/* ⋮ kontextové menu */}
        <div className="ml-auto shrink-0">
          <button
            onClick={(e) => {
              if (menuOpen) { setMenuOpen(false); setStavOpen(false); return; }
              const rect = e.currentTarget.getBoundingClientRect();
              setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
              setMenuOpen(true);
              setStavOpen(false);
            }}
            className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)] transition-colors text-base leading-none"
            aria-label="Zobrazit akce"
          >
            ⋮
          </button>
        </div>
      </div>

      {z.poznamka && (
        <p className="text-xs text-[var(--text-muted)] mt-1.5 truncate">{z.poznamka}</p>
      )}

      {/* Dropdown portal – mimo backdrop-blur/overflow kontejnery */}
      {menuOpen && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[9999] bg-[var(--surface)] border border-[var(--border-strong)] rounded-lg shadow-[var(--shadow-elevated)] min-w-[170px] py-1"
          style={{ top: dropdownPos.top, right: dropdownPos.right }}
        >
          <button
            onClick={() => { onEdit(z); setMenuOpen(false); }}
            className="w-full text-left px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--bg-hover)] flex items-center gap-2"
          ><IconEdit /> Upravit</button>
          <button
            onClick={() => { onCreateRevize(z); setMenuOpen(false); }}
            className="w-full text-left px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--bg-hover)] flex items-center gap-2"
          ><IconClipboard /> Vytvořit revizi</button>
          {!isDone && (
            <>
              <button
                onClick={() => setStavOpen(o => !o)}
                className="w-full text-left px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--bg-hover)] flex items-center justify-between"
              >
                <span className="flex items-center gap-2"><IconStatus /> Změnit stav</span>
                <span className={`text-[var(--text-muted)] transition-transform ${stavOpen ? 'rotate-180' : ''}`}><IconChevron /></span>
              </button>
              {stavOpen && (
                <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-faint)]">
                  {(['plánováno', 'v realizaci', 'dokončeno', 'zrušeno'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => { onUpdateStav(z.id!, s); setMenuOpen(false); setStavOpen(false); }}
                      className={`w-full text-left px-5 py-1.5 text-xs hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]${
                        z.stav === s ? ' font-semibold text-[var(--text)]' : ''
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          <div className="border-t border-[var(--border-subtle)] my-1" />
          <button
            onClick={() => { onDelete(z.id!); setMenuOpen(false); }}
            className="w-full text-left px-3 py-2 text-sm text-[var(--danger)] hover:bg-red-500/[0.10] flex items-center gap-2"
          ><IconTrash /> Smazat</button>
        </div>,
        document.body
      )}
    </div>
  );
}
