import { useState, useRef, useEffect } from 'react';
import type { Zakazka } from '../../types';
import { getPriorityColor, getRealizaceDays, getReportDeadline, isOverdue, formatDayShort } from './utils';

function getAccentColor(stav: Zakazka['stav']): string {
  switch (stav) {
    case 'plánováno':   return '#3b82f6';
    case 'v realizaci': return '#f59e0b';
    case 'dokončeno':   return '#22c55e';
    case 'zrušeno':     return '#f87171';
  }
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
      className={`py-2.5 px-3 rounded-r-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/50 dark:border-slate-700 dark:hover:bg-slate-800 transition-colors${isDone ? ' opacity-70' : ''}`}
      style={{ borderLeftWidth: '3px', borderLeftColor: getAccentColor(z.stav) }}
    >
      {/* Řádek 1: název + datum */}
      <div className="flex items-center gap-2 mb-1.5 min-w-0">
        <p className="font-semibold text-sm flex-1 truncate">{z.nazev}</p>
        <span className="text-xs text-[var(--text-muted)] shrink-0">{daysLabel}</span>
      </div>

      {/* Řádek 2: klient + badges + ⋮ menu */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full shrink-0 max-w-[180px] truncate">
          {z.klient}
        </span>
        <span className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${getPriorityColor(z.priorita)}`}>
          {z.priorita}
        </span>
        {reportDeadline && (
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${isOverdue(reportDeadline) ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
            📋 {new Date(reportDeadline).toLocaleDateString('cs-CZ')}
          </span>
        )}
        {z.datumOdevzdaniZpravy && (
          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 shrink-0">
            ✓ Odevzdáno
          </span>
        )}

        {/* ⋮ kontextové menu */}
        <div className="ml-auto relative shrink-0" ref={menuRef}>
          <button
            onClick={() => { setMenuOpen(o => !o); setStavOpen(false); }}
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-base leading-none"
            aria-label="Zobrazit akce"
          >
            ⋮
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg min-w-[160px] py-1">
              <button
                onClick={() => { onEdit(z); setMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
              >✏️ Upravit</button>
              <button
                onClick={() => { onCreateRevize(z); setMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
              >📋 Vytvořit revizi</button>
              {!isDone && (
                <>
                  <button
                    onClick={() => setStavOpen(o => !o)}
                    className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">🔄 Změnit stav</span>
                    <span className="text-slate-400 text-xs">{stavOpen ? '▲' : '▼'}</span>
                  </button>
                  {stavOpen && (
                    <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                      {(['plánováno', 'v realizaci', 'dokončeno', 'zrušeno'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => { onUpdateStav(z.id!, s); setMenuOpen(false); setStavOpen(false); }}
                          className={`w-full text-left px-5 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400${
                            z.stav === s ? ' font-semibold text-slate-900 dark:text-slate-100' : ''
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              <div className="border-t border-slate-100 dark:border-slate-700 my-1" />
              <button
                onClick={() => { onDelete(z.id!); setMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950 flex items-center gap-2"
              >🗑 Smazat</button>
            </div>
          )}
        </div>
      </div>

      {z.poznamka && (
        <p className="text-xs text-slate-500 mt-1.5 truncate">{z.poznamka}</p>
      )}
    </div>
  );
}
