import { useEffect, useState } from 'react';
import { Button, Card, Input, Select, Modal } from '../components/ui';
import { mistnostService, revizeService } from '../services/database';
import type { Mistnost, Revize } from '../types';

export function MistnostiPage() {
  const [mistnosti, setMistnosti] = useState<(Mistnost & { revizeNazev?: string })[]>([]);
  const [revize, setRevize] = useState<Revize[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMistnost, setEditingMistnost] = useState<Mistnost | null>(null);

  const [formData, setFormData] = useState({
    revizeId: 0,
    nazev: '',
    patro: '',
    plocha: undefined as number | undefined,
    typ: 'obytný prostor',
    prostredi: 'normální',
    poznamka: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const revizeData = await revizeService.getAll();
    setRevize(revizeData);
    
    const allMistnosti: (Mistnost & { revizeNazev?: string })[] = [];
    for (const r of revizeData) {
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
    loadData();
  };

  const resetForm = () => {
    setFormData({
      revizeId: 0,
      nazev: '',
      patro: '',
      plocha: undefined,
      typ: 'obytný prostor',
      prostredi: 'normální',
      poznamka: '',
    });
  };

  const handleEdit = (mistnost: Mistnost) => {
    setEditingMistnost(mistnost);
    setFormData({
      revizeId: mistnost.revizeId,
      nazev: mistnost.nazev,
      patro: mistnost.patro || '',
      plocha: mistnost.plocha,
      typ: mistnost.typ,
      prostredi: mistnost.prostredi,
      poznamka: mistnost.poznamka || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Opravdu chcete smazat tuto místnost?')) {
      await mistnostService.delete(id);
      loadData();
    }
  };

  const prostrediFikce = {
    'normální': 'bg-green-100 text-green-700',
    'vlhké': 'bg-blue-100 text-blue-700',
    'prašné': 'bg-amber-100 text-amber-700',
    'nebezpečné': 'bg-red-100 text-red-700',
    'venkovní': 'bg-cyan-100 text-cyan-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Místnosti</h1>
          <p className="text-slate-500">Evidence místností a prostředí</p>
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
                      className="text-slate-400 hover:text-slate-600"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(m.id!)}
                      className="text-slate-400 hover:text-red-600"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  {m.patro && <p className="text-slate-500">Patro: {m.patro}</p>}
                  {m.plocha && <p className="text-slate-500">Plocha: {m.plocha} m²</p>}
                  <p className="text-slate-500">Typ: {m.typ}</p>
                  <div className="flex gap-2 mt-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      prostrediFikce[m.prostredi as keyof typeof prostrediFikce] || 'bg-slate-100 text-slate-700'
                    }`}>
                      {m.prostredi}
                    </span>
                  </div>
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
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Patro"
              value={formData.patro}
              onChange={(e) => setFormData({ ...formData, patro: e.target.value })}
            />
            <Input
              type="number"
              step="0.1"
              label="Plocha (m²)"
              value={formData.plocha || ''}
              onChange={(e) => setFormData({ ...formData, plocha: e.target.value ? parseFloat(e.target.value) : undefined })}
            />
          </div>
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
          <Select
            label="Prostředí"
            value={formData.prostredi}
            onChange={(e) => setFormData({ ...formData, prostredi: e.target.value })}
            options={[
              { value: 'normální', label: 'Normální' },
              { value: 'vlhké', label: 'Vlhké' },
              { value: 'prašné', label: 'Prašné' },
              { value: 'nebezpečné', label: 'Nebezpečné' },
              { value: 'venkovní', label: 'Venkovní' },
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
