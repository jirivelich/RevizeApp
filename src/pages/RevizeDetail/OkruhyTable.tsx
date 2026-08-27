import { Button } from '../../components/ui';
import { TW } from './tw';
import type { Okruh } from '../../types';
import { computeVodic } from './rozvadeceShared';

interface OkruhyTableProps {
  okruhy: Okruh[];
  draggedOkruh: Okruh | null;
  onDragStart: (okruh: Okruh) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (targetOkruh: Okruh) => void;
  onDragEnd: () => void;
  onDuplicate: (okruh: Okruh) => void;
  onEdit: (okruh: Okruh) => void;
  onDelete: (okruhId: number) => void;
}

/** Čtecí tabulka okruhů s drag-reorder. */
export function OkruhyTable({ okruhy, draggedOkruh, onDragStart, onDragOver, onDrop, onDragEnd, onDuplicate, onEdit, onDelete }: OkruhyTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className={TW.th}>Č.</th>
            <th className={TW.th}>Jistič</th>
            <th className={TW.th}>Název</th>
            <th className={TW.th}>Vodič</th>
            <th className={TW.th}>Iz. odpor</th>
            <th className={TW.th}>Imp. smyčky</th>
            <th className={TW.th + ' text-right'}>Akce</th>
          </tr>
        </thead>
        <tbody>
          {okruhy.sort((a, b) => a.cislo - b.cislo).map((o) => (
            <tr
              key={o.id}
              draggable
              onDragStart={() => onDragStart(o)}
              onDragOver={onDragOver}
              onDrop={() => onDrop(o)}
              onDragEnd={onDragEnd}
              className={`border-b border-[var(--border-subtle)] border-l-2 border-l-transparent hover:border-l-[var(--primary)] hover:bg-[var(--bg-hover)] cursor-grab active:cursor-grabbing ${
                draggedOkruh?.id === o.id ? 'opacity-50 bg-[var(--bg-accent)]' : ''
              }`}
            >
              <td className="py-1 px-2 text-xs font-medium text-[var(--text)]">
                <span className="flex items-center gap-1">
                  <span className="text-[var(--text-muted)]">⋮⋮</span>
                  {o.cislo}
                </span>
              </td>
              <td className="py-1 px-2 text-xs">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)]">
                  {[
                    o.jisticTyp,
                    o.jisticProud ? `/${o.jisticProud}` : '',
                    o.pocetFazi ? `/${o.pocetFazi}` : ''
                  ].join('').replace(/\/\//g, '/').replace(/\/$/, '')}
                </span>
                {o.jeJisticochranac && (
                  <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" title="Jississochranič (RCBO)">
                    +{o.chrTyp || 'A'}/{o.chrCitlivostMa ?? 30}mA
                  </span>
                )}
              </td>
              <td className="py-1 px-2 text-xs text-[var(--text)]">{o.nazev}</td>
              <td className="py-1 px-2 text-xs text-[var(--text-secondary)]">{computeVodic(o.typKabelu, o.pocetZil, o.prurez) || o.vodic}</td>
              <td className="py-1 px-2 text-xs text-[var(--text-secondary)]">{o.izolacniOdpor || '—'}</td>
              <td className="py-1 px-2 text-xs text-[var(--text-secondary)]">{o.impedanceSmycky || '—'}</td>
              <td className="py-1 px-2 text-xs text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="secondary" size="sm" onClick={() => onDuplicate(o)} title="Duplikovat">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => onEdit(o)} title="Upravit">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => onDelete(o.id!)} title="Smazat">
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
