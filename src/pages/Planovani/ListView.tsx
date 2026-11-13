import type { Zakazka } from '../../types';
import { Card, EmptyState } from '../../components/ui';
import { ZakazkaCard } from './ZakazkaCard';
import { STAV_OPTIONS } from './utils';

interface ListViewProps {
  zakazky: Zakazka[];
  filterStav: string;
  onFilterChange: (stav: string) => void;
  onEdit: (zakazka: Zakazka) => void;
  onUpdateStav: (id: number, stav: Zakazka['stav']) => void;
  onDelete: (id: number) => void;
  onCreateRevize: (zakazka: Zakazka) => void;
}

export function ListView({
  zakazky,
  filterStav,
  onFilterChange,
  onEdit,
  onUpdateStav,
  onDelete,
  onCreateRevize,
}: ListViewProps) {
  const filteredZakazky = zakazky
    .filter((z) => !filterStav || z.stav === filterStav)
    .sort(
      (a, b) =>
        new Date(a.datumPlanovany).getTime() - new Date(b.datumPlanovany).getTime()
    );

  return (
    <Card>
      <div className="flex gap-2 mb-4 flex-wrap" role="group" aria-label="Filtr stavu">
        {[{ value: '', label: 'Všechny' }, ...STAV_OPTIONS].map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onFilterChange(o.value)}
            aria-pressed={filterStav === o.value}
            className={`inline-flex items-center h-8 px-3 rounded-full border text-xs font-semibold transition-colors ${
              filterStav === o.value
                ? 'bg-[var(--bg-accent)] border-[var(--primary)] text-[var(--primary)]'
                : 'bg-[var(--bg-hover)] border-[var(--border-input)] text-[var(--text-secondary)] hover:text-[var(--text)]'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {filteredZakazky.length > 0 ? (
        <div className="space-y-1.5">
          {filteredZakazky.map((z) => (
            <ZakazkaCard
              key={z.id}
              zakazka={z}
              onEdit={onEdit}
              onUpdateStav={onUpdateStav}
              onDelete={onDelete}
              onCreateRevize={onCreateRevize}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          message={filterStav
            ? 'Žádné zakázky neodpovídají filtru.'
            : 'Zatím žádné zakázky. Přidejte první kliknutím na tlačítko výše.'}
        />
      )}
    </Card>
  );
}
