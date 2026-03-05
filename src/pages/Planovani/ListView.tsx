import type { Zakazka } from '../../types';
import { Card, Select } from '../../components/ui';
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
      <div className="flex gap-4 mb-4">
        <Select
          value={filterStav}
          onChange={(e) => onFilterChange(e.target.value)}
          options={[
            { value: '', label: 'Všechny stavy' },
            ...STAV_OPTIONS,
          ]}
        />
      </div>

      {filteredZakazky.length > 0 ? (
        <div className="space-y-4">
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
        <p className="text-center text-slate-500 py-8">
          {filterStav
            ? 'Žádné zakázky neodpovídají filtru.'
            : 'Zatím žádné zakázky. Přidejte první kliknutím na tlačítko výše.'}
        </p>
      )}
    </Card>
  );
}
