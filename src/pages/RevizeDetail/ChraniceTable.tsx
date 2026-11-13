import { Button } from '../../components/ui';
import type { Chranic } from '../../types';
import { vyhodnotChranic } from './mereniLimity';
import { StavBadge } from './MereniUi';

interface ChraniceTableProps {
  chranice: Chranic[];
  onEdit: (chranic: Chranic) => void;
  onDelete: (chranicId: number) => void;
}

const fmt = (n: number) => String(n).replace('.', ',');

/** Proudové chrániče jako karty: parametry, naměřené hodnoty vedle limitů a celkové vyhodnocení. */
export function ChraniceTable({ chranice, onEdit, onDelete }: ChraniceTableProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      {[...chranice].sort((a, b) => a.cislo - b.cislo).map((c) => {
        const v = vyhodnotChranic(c);
        const kontroly = [
          c.testovacitlacitko !== undefined && `${c.testovacitlacitko ? '✓' : '✕'} Testovací tlačítko`,
          c.nevybavovaci !== undefined && `${c.nevybavovaci ? '✓' : '✕'} Nevybavení při 0,5×IΔn`,
          c.selektivita && '✓ Selektivita',
          c.zkouskaVypnuti2x && '✓ Zkouška vypnutí 2×IΔn',
        ].filter(Boolean) as string[];
        return (
          <article
            key={c.id}
            className={`rounded-[var(--radius-lg)] border bg-[var(--bg-surface)] p-3 flex flex-col gap-3 ${
              v.stav === 'fail' ? 'border-[var(--danger)]/50' : v.stav === 'limit' ? 'border-[var(--warning)]/50' : 'border-[var(--border)]'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h5 className="text-sm font-semibold text-[var(--text)]">
                  {c.cislo}. {c.nazev || 'Chránič'}
                </h5>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-[var(--bg-accent-badge)] text-[var(--primary)]">Typ {c.typ}</span>
                  <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)]">{c.proud}</span>
                  <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)]">IΔn {c.citlivostMa} mA</span>
                  <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)]">{c.pocetPolu}P</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <StavBadge stav={v.stav} label={v.stav === 'limit' ? `Chybí ${v.chybi}` : undefined} />
                <Button variant="secondary" size="sm" onClick={() => onEdit(c)} title="Upravit" aria-label={`Upravit chránič ${c.cislo}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </Button>
                <Button variant="danger" size="sm" onClick={() => onDelete(c.id!)} title="Smazat" aria-label={`Smazat chránič ${c.cislo}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {v.hodnoty.map(h => (
                <div
                  key={h.klic}
                  className={`rounded-[var(--radius-md)] bg-[var(--bg-input)] px-2.5 py-2 border ${
                    h.ok === false ? 'border-[var(--danger)]/60' : h.hodnota === null ? 'border-dashed border-[var(--warning)]/50' : 'border-transparent'
                  }`}
                >
                  <p className="text-[11px] text-[var(--text-secondary)]">{h.label}</p>
                  <p className={`mt-0.5 text-sm font-semibold tabular-nums ${
                    h.ok === false ? 'text-[var(--danger-text)]' : h.hodnota === null ? 'text-[var(--warning-text)]' : 'text-[var(--text)]'
                  }`}>
                    {h.hodnota === null ? '—' : `${fmt(h.hodnota)} ${h.jednotka}`}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">{h.limit}</p>
                </div>
              ))}
            </div>
            {kontroly.length > 0 && <p className="text-xs text-[var(--text-secondary)]">{kontroly.join(' · ')}</p>}
          </article>
        );
      })}
    </div>
  );
}
