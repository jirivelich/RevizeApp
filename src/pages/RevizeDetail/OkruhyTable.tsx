import { useMemo, useState } from 'react';
import { Button } from '../../components/ui';
import { TW } from './tw';
import type { Okruh } from '../../types';
import { computeVodic } from './rozvadeceShared';
import { vyhodnotOkruh, type StavMereni, type VyhodnoceniOkruhu } from './mereniLimity';
import { StavBadge, ZsBar, FilterChip } from './MereniUi';

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

type Filtr = 'vse' | 'nezmereno' | 'problem';

const IconCopy = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>;
const IconEdit = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconTrash = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>;

function jisticLabel(o: Okruh): string {
  return [o.jisticTyp, o.jisticProud ? `/${o.jisticProud}` : '', o.pocetFazi ? `/${o.pocetFazi}` : '']
    .join('').replace(/\/\//g, '/').replace(/\/$/, '');
}

const ROW_TONE: Record<StavMereni, string> = {
  fail: 'bg-[var(--danger-bg)] border-l-[var(--danger)]',
  nezmereno: 'border-l-transparent',
  limit: 'border-l-[var(--warning)]',
  ok: 'border-l-transparent',
};

/** Tabulka okruhů s vyhodnocením měření, filtrem a drag-reorder (desktop) / kartami (mobil). */
export function OkruhyTable({ okruhy, draggedOkruh, onDragStart, onDragOver, onDrop, onDragEnd, onDuplicate, onEdit, onDelete }: OkruhyTableProps) {
  const [filtr, setFiltr] = useState<Filtr>('vse');

  const rows = useMemo(
    () => [...okruhy].sort((a, b) => a.cislo - b.cislo).map(o => ({ o, v: vyhodnotOkruh(o) })),
    [okruhy],
  );
  const pocetNezmereno = rows.filter(r => r.v.stav === 'nezmereno').length;
  const pocetProblem = rows.filter(r => r.v.stav === 'fail' || r.v.stav === 'limit').length;
  const visible = rows.filter(r =>
    filtr === 'vse' ? true : filtr === 'nezmereno' ? r.v.stav === 'nezmereno' : r.v.stav === 'fail' || r.v.stav === 'limit',
  );
  // Drag-reorder dává smysl jen nad úplným seznamem
  const canDrag = filtr === 'vse';

  const actions = (o: Okruh) => (
    <div className="flex justify-end gap-1">
      <Button variant="secondary" size="sm" onClick={() => onDuplicate(o)} title="Duplikovat" aria-label={`Duplikovat okruh ${o.cislo}`}><IconCopy /></Button>
      <Button variant="secondary" size="sm" onClick={() => onEdit(o)} title="Upravit" aria-label={`Upravit okruh ${o.cislo}`}><IconEdit /></Button>
      <Button variant="danger" size="sm" onClick={() => onDelete(o.id!)} title="Smazat" aria-label={`Smazat okruh ${o.cislo}`}><IconTrash /></Button>
    </div>
  );

  const rcbo = (o: Okruh) => o.jeJisticochranac && (
    <span className="ml-1 px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--bg-secondary-accent)] text-[var(--secondary)]" title="Jističochránič (RCBO)">
      +{o.chrTyp || 'A'}/{o.chrCitlivostMa ?? 30}mA
    </span>
  );

  const risoCell = (v: VyhodnoceniOkruhu, raw?: string) =>
    v.riso === null
      ? <span className="text-[var(--text-muted)]">—</span>
      : <span className={`tabular-nums ${v.risoOk ? 'text-[var(--text)]' : 'text-[var(--danger-text)] font-semibold'}`}>{raw}</span>;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtr okruhů">
        <FilterChip active={filtr === 'vse'} onClick={() => setFiltr('vse')}>Vše {rows.length}</FilterChip>
        <FilterChip active={filtr === 'nezmereno'} onClick={() => setFiltr('nezmereno')}>Nezměřeno {pocetNezmereno}</FilterChip>
        <FilterChip active={filtr === 'problem'} onClick={() => setFiltr('problem')}>Nevyhovuje / limit {pocetProblem}</FilterChip>
      </div>

      {visible.length === 0 && (
        <p className="text-center text-xs text-[var(--text-secondary)] py-6 bg-[var(--bg-input)] rounded-[var(--radius-lg)]">Žádné okruhy v tomto filtru.</p>
      )}

      {/* Desktop: tabulka */}
      {visible.length > 0 && (
        <div className="hidden sm:block overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)]">
          <table className="w-full">
            <thead>
              <tr>
                <th className={TW.th}>Č.</th>
                <th className={TW.th}>Jistič</th>
                <th className={TW.th}>Název</th>
                <th className={TW.th}>Vodič</th>
                <th className={TW.th}>R<sub>iso</sub> [MΩ]</th>
                <th className={TW.th}>Z<sub>s</sub> [Ω] / max</th>
                <th className={TW.th}>Stav</th>
                <th className={TW.th + ' text-right'}>Akce</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(({ o, v }) => (
                <tr
                  key={o.id}
                  draggable={canDrag}
                  onDragStart={() => onDragStart(o)}
                  onDragOver={onDragOver}
                  onDrop={() => onDrop(o)}
                  onDragEnd={onDragEnd}
                  className={`border-b border-[var(--border-subtle)] border-l-2 hover:bg-[var(--bg-hover)] ${ROW_TONE[v.stav]} ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''} ${
                    draggedOkruh?.id === o.id ? 'opacity-50 bg-[var(--bg-accent)]' : ''
                  }`}
                >
                  <td className="py-1.5 px-2 text-xs font-semibold text-[var(--text)]">
                    <span className="flex items-center gap-1">
                      {canDrag && <span className="text-[var(--text-muted)]" aria-hidden="true">⋮⋮</span>}
                      {o.cislo}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-xs whitespace-nowrap">
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)]">{jisticLabel(o)}</span>
                    {rcbo(o)}
                  </td>
                  <td className="py-1.5 px-2 text-xs text-[var(--text)]">{o.nazev}</td>
                  <td className="py-1.5 px-2 text-xs text-[var(--text-secondary)] whitespace-nowrap">{computeVodic(o.typKabelu, o.pocetZil, o.prurez) || o.vodic}</td>
                  <td className="py-1.5 px-2 text-xs">{risoCell(v, o.izolacniOdpor)}</td>
                  <td className="py-1.5 px-2 text-xs"><ZsBar zs={v.zs} max={v.zsMax} pomer={v.zsPomer} /></td>
                  <td className="py-1.5 px-2 text-xs"><StavBadge stav={v.stav} /></td>
                  <td className="py-1.5 px-2 text-xs text-right">{actions(o)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobil: karty */}
      <div className="sm:hidden flex flex-col gap-2">
        {visible.map(({ o, v }) => (
          <div
            key={o.id}
            className={`rounded-[var(--radius-lg)] border p-3 bg-[var(--bg-surface)] ${
              v.stav === 'fail' ? 'border-[var(--danger)]/50' : v.stav === 'nezmereno' ? 'border-[var(--active-border)]' : 'border-[var(--border)]'
            }`}
          >
            <button type="button" className="w-full flex items-center gap-2.5 text-left" onClick={() => onEdit(o)}>
              <span className="w-7 h-7 shrink-0 rounded-[var(--radius-md)] bg-[var(--bg-hover)] flex items-center justify-center text-xs font-semibold">{o.cislo}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold truncate text-[var(--text)]">{o.nazev}</span>
                <span className="block text-xs text-[var(--text-secondary)]">{jisticLabel(o)} · {computeVodic(o.typKabelu, o.pocetZil, o.prurez) || o.vodic || '—'}</span>
              </span>
              <StavBadge stav={v.stav} label={v.stav === 'nezmereno' ? 'Změřit' : undefined} />
            </button>
            <div className="mt-2 pl-[38px] flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)]">
              <span>R<sub>iso</sub> {risoCell(v, o.izolacniOdpor)}</span>
              <span className="flex items-center gap-1">Z<sub>s</sub> <ZsBar zs={v.zs} max={v.zsMax} pomer={v.zsPomer} /></span>
            </div>
            <div className="mt-2 pl-[38px] flex gap-1">
              <Button variant="secondary" size="sm" onClick={() => onDuplicate(o)} aria-label={`Duplikovat okruh ${o.cislo}`}><IconCopy /></Button>
              <Button variant="danger" size="sm" onClick={() => onDelete(o.id!)} aria-label={`Smazat okruh ${o.cislo}`}><IconTrash /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
