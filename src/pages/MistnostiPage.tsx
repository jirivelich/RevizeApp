import { useEffect, useState } from 'react';
import { Button, Card, Input, Select, Modal } from '../components/ui';
import { useRevize } from '../hooks/useQueries';
import { mistnostService } from '../services/database';
import type { Mistnost } from '../types';

export function MistnostiPage() {
  const { data: revize = [] } = useRevize();
  const [mistnosti, setMistnosti] = useState<(Mistnost & { revizeNazev?: string })[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMistnost, setEditingMistnost] = useState<Mistnost | null>(null);

  const [formData, setFormData] = useState({
    revizeId: 0,
    nazev: '',
    patro: '',
    typ: 'obytný prostor',
    poznamka: ''
  });

  useEffect(() => {
    loadMistnosti();
  }, [revize]);

  const loadMistnosti = async () => {
    const allMistnosti: (Mistnost & { revizeNazev?: string })[] = [];
    for (const r of revize) {
      if (r.id) {
        const mistnostiRevize = await mistnostService.getByRevize(r.id);
        allMistnosti.push(...mistnostiRevize.map(m => ({
          ...m,
          revizeNazev: `${r.cisloRevize} - ${r.nazev}`
        })));
      }
    }
    setMistnosti(allMistnosti);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMistnost?.id) {
      await mistnostService.update(editingMistnost.id, formData);
    } else {
      await mistnostService.create(formData);
    }
    setIsModalOpen(false);
    setEditingMistnost(null);
    resetForm();
    loadMistnosti();
  };

  const resetForm = () => {
    setFormData({
      revizeId: 0,
      nazev: '',
      patro: '',
      typ: 'obytný prostor',
      poznamka: '',
    });
  };

  const handleEdit = (mistnost: Mistnost) => {
    setEditingMistnost(mistnost);
    setFormData({
      revizeId: mistnost.revizeId,
      nazev: mistnost.nazev,
      patro: mistnost.patro || '',
      typ: mistnost.typ,
      poznamka: mistnost.poznamka || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Opravdu chcete smazat tuto místnost?')) {
      await mistnostService.delete(id);
      loadMistnosti();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Místnosti</h1>
          <p className="text-xs text-slate-400">Evidence místností</p>
        </div>
        <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
          + Nová místnost
        </Button>
      </div>

      <Card>
        {mistnosti.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mistnosti.map((m) => (
              <div
                key={m.id}
                className="p-4 rounded-lg bg-slate-50 border border-slate-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium">{m.nazev}</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(m)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Upravit
                    </button>
                    <button
                      onClick={() => handleDelete(m.id!)}
                      className="text-xs text-slate-400 hover:text-red-600"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  {m.patro && <p className="text-slate-500">Patro: {m.patro}</p>}
                  <p className="text-slate-500">Typ: {m.typ}</p>
                  <p className="text-xs text-slate-400 mt-2">{m.revizeNazev}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-slate-500 py-8">
            Žádné místnosti. Přidejte první kliknutím na tlačítko výše.
          </p>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingMistnost(null); }}
        title={editingMistnost ? 'Upravit místnost' : 'Nová místnost'}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setIsModalOpen(false); setEditingMistnost(null); }}>
              Zrušit
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.revizeId}>
              {editingMistnost ? 'Uložit' : 'Vytvořit'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Revize"
            value={formData.revizeId.toString()}
            onChange={(e) => setFormData({ ...formData, revizeId: parseInt(e.target.value) })}
            options={[
              { value: '0', label: '-- Vyberte revizi --' },
              ...revize.map(r => ({
                value: r.id!.toString(),
                label: `${r.cisloRevize} - ${r.nazev}`
              }))
            ]}
          />
          <Input
            label="Název místnosti"
            value={formData.nazev}
            onChange={(e) => setFormData({ ...formData, nazev: e.target.value })}
            required
          />
          <Input
            label="Patro"
            value={formData.patro}
            onChange={(e) => setFormData({ ...formData, patro: e.target.value })}
          />
          <Select
            label="Typ místnosti"
            value={formData.typ}
            onChange={(e) => setFormData({ ...formData, typ: e.target.value })}
            options={[
              { value: 'obytný prostor', label: 'Obytný prostor' },
              { value: 'kuchyně', label: 'Kuchyně' },
              { value: 'koupelna', label: 'Koupelna' },
              { value: 'WC', label: 'WC' },
              { value: 'chodba', label: 'Chodba' },
              { value: 'sklep', label: 'Sklep' },
              { value: 'garáž', label: 'Garáž' },
              { value: 'technická místnost', label: 'Technická místnost' },
              { value: 'kancelář', label: 'Kancelář' },
              { value: 'sklad', label: 'Sklad' },
              { value: 'výrobní prostor', label: 'Výrobní prostor' },
              { value: 'jiné', label: 'Jiné' },
            ]}
          />

          <Input
            label="Poznámka"
            value={formData.poznamka}
            onChange={(e) => setFormData({ ...formData, poznamka: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
}
