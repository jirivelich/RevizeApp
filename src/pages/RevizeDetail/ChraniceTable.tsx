import { Button } from '../../components/ui';
import { TW } from './tw';
import type { Chranic } from '../../types';

interface ChraniceTableProps {
  chranice: Chranic[];
  onEdit: (chranic: Chranic) => void;
  onDelete: (chranicId: number) => void;
}

/** Čtecí tabulka proudových chráničů. */
export function ChraniceTable({ chranice, onEdit, onDelete }: ChraniceTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className={TW.th}>Č.</th>
            <th className={TW.th}>Název</th>
            <th className={TW.th}>Typ</th>
            <th className={TW.th}>Proud</th>
            <th className={TW.th}>IΔn [mA]</th>
            <th className={TW.th}>Pólů</th>
            <th className={TW.th}>IΔ [mA]</th>
            <th className={TW.th}>tA 1× [ms]</th>
            <th className={TW.th + ' text-right'}>Akce</th>
          </tr>
        </thead>
        <tbody>
          {[...chranice].sort((a, b) => a.cislo - b.cislo).map((c) => (
            <tr key={c.id} className="border-b border-[var(--border-subtle)] border-l-2 border-l-transparent hover:border-l-[var(--primary)] hover:bg-[var(--bg-hover)] group">
              <td className="py-1 px-2 text-xs font-medium text-[var(--text)]">{c.cislo}</td>
              <td className="py-1 px-2 text-xs text-[var(--text)]">{c.nazev}</td>
              <td className="py-1 px-2 text-xs">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--bg-accent-badge)] text-[var(--primary)]">{c.typ}</span>
              </td>
              <td className="py-1 px-2 text-xs text-[var(--text-secondary)]">{c.proud}</td>
              <td className="py-1 px-2 text-xs text-[var(--text-secondary)]">{c.citlivostMa}</td>
              <td className="py-1 px-2 text-xs text-[var(--text-secondary)]">{c.pocetPolu}</td>
              <td className="py-1 px-2 text-xs text-[var(--text-secondary)]">{c.vybavovacProud != null ? c.vybavovacProud : '—'}</td>
              <td className="py-1 px-2 text-xs text-[var(--text-secondary)]">{c.casOdpojeni1x != null ? c.casOdpojeni1x : '—'}</td>
              <td className="py-1 px-2 text-xs text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="secondary" size="sm" onClick={() => onEdit(c)} title="Upravit">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => onDelete(c.id!)} title="Smazat">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
