import type { Zakazka } from '../../types';
import { Button, Select } from '../../components/ui';
import { getStatusColor, getPriorityColor } from './utils';

interface ZakazkaCardProps {
  zakazka: Zakazka;
  onEdit: (zakazka: Zakazka) => void;
  onUpdateStav: (id: number, stav: Zakazka['stav']) => void;
  onDelete: (id: number) => void;
  onCreateRevize: (zakazka: Zakazka) => void;
}

export function ZakazkaCard({ zakazka: z, onEdit, onUpdateStav, onDelete, onCreateRevize }: ZakazkaCardProps) {
  return (
    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(z.stav)}`}>
              {z.stav}
            </span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(z.priorita)}`}>
              {z.priorita} priorita
            </span>
          </div>
          <p className="font-medium mb-1">{z.nazev}</p>
          <p className="text-sm text-slate-500">
            Klient: {z.klient} • {z.adresa}
          </p>
          <p className="text-sm text-slate-500">
            📅 Plánováno: {new Date(z.datumPlanovany).toLocaleDateString('cs-CZ')}
            {z.datumDokonceni &&
              ` • Dokončeno: ${new Date(z.datumDokonceni).toLocaleDateString('cs-CZ')}`}
          </p>
          {z.poznamka && (
            <p className="text-sm text-slate-600 mt-2">{z.poznamka}</p>
          )}
        </div>
        <div className="flex flex-col gap-2 ml-4">
          {z.stav !== 'dokončeno' && z.stav !== 'zrušeno' && (
            <Select
              value={z.stav}
              onChange={(e) => onUpdateStav(z.id!, e.target.value as Zakazka['stav'])}
              options={[
                { value: 'plánováno', label: 'Plánováno' },
                { value: 'v realizaci', label: 'V realizaci' },
                { value: 'dokončeno', label: 'Dokončeno' },
                { value: 'zrušeno', label: 'Zrušeno' },
              ]}
              className="text-sm"
            />
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onEdit(z)}
          >
            ✏️ Upravit
          </Button>
          <Button
            size="sm"
            onClick={() => onCreateRevize(z)}
          >
            📋 Vytvořit revizi
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => onDelete(z.id!)}
          >
            Smazat
          </Button>
        </div>
      </div>
    </div>
  );
}
