import { useEffect, useState } from 'react';
import { Button, Card, Input, Select, Modal } from '../components/ui';
import { pristrojService } from '../services/database';
import type { MericiPristroj } from '../types';

const typyPristroju = [
  { value: 'multimetr', label: 'Multimetr' },
  { value: 'meger', label: 'Meger (izolační odpor)' },
  { value: 'smyckomer', label: 'Smyčkoměr' },
  { value: 'proudovy_chranic', label: 'Tester proudových chráničů' },
  { value: 'osciloskop', label: 'Osciloskop' },
  { value: 'jiny', label: 'Jiný' },
];

export function PristrojePage() {
  const [pristroje, setPristroje] = useState<MericiPristroj[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPristroj, setEditingPristroj] = useState<MericiPristroj | null>(null);
  const [filterTyp, setFilterTyp] = useState('');
  const [showExpiring, setShowExpiring] = useState(false);

  const [formData, setFormData] = useState({
    nazev: '',
    vyrobce: '',
    model: '',
    vyrobniCislo: '',
    typPristroje: 'multimetr' as MericiPristroj['typPristroje'],
    datumKalibrace: new Date().toISOString().split('T')[0],
    platnostKalibrace: '',
    poznamka: '',
  });

  useEffect(() => {
    loadPristroje();
  }, []);

  const loadPristroje = async () => {
    const data = await pristrojService.getAll();
    setPristroje(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPristroj?.id) {
      await pristrojService.update(editingPristroj.id, formData);
    } else {
      await pristrojService.create(formData);
    }
    setIsModalOpen(false);
    resetForm();
    loadPristroje();
  };

  const resetForm = () => {
    setFormData({
      nazev: '',
      vyrobce: '',
      model: '',
      vyrobniCislo: '',
      typPristroje: 'multimetr',
      datumKalibrace: new Date().toISOString().split('T')[0],
      platnostKalibrace: '',
      poznamka: '',
    });
    setEditingPristroj(null);
  };

  const handleEdit = (pristroj: MericiPristroj) => {
    setEditingPristroj(pristroj);
    setFormData({
      nazev: pristroj.nazev,
      vyrobce: pristroj.vyrobce,
      model: pristroj.model,
      vyrobniCislo: pristroj.vyrobniCislo,
      typPristroje: pristroj.typPristroje,
      datumKalibrace: pristroj.datumKalibrace,
      platnostKalibrace: pristroj.platnostKalibrace,
      poznamka: pristroj.poznamka || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Opravdu chcete smazat tento přístroj?')) {
      await pristrojService.delete(id);
      loadPristroje();
    }
  };

  const isExpiring = (platnost: string) => {
    const today = new Date();
    const platnostDate = new Date(platnost);
    const diffDays = Math.ceil((platnostDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  };

  const isExpired = (platnost: string) => {
    return new Date(platnost) < new Date();
  };

  const filteredPristroje = pristroje.filter(p => {
    const matchesTyp = !filterTyp || p.typPristroje === filterTyp;
    const matchesExpiring = !showExpiring || isExpiring(p.platnostKalibrace);
    return matchesTyp && matchesExpiring;
  });

  const getTypLabel = (typ: string) => {
    return typyPristroju.find(t => t.value === typ)?.label || typ;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Přístroje a kalibrace</h1>
          <p className="text-slate-600">Správa měřících přístrojů a jejich kalibračních termínů</p>
        </div>
        <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
          + Přidat přístroj
        </Button>
      </div>

      {/* Statistiky */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <p className="text-3xl font-bold text-slate-800">{pristroje.length}</p>
            <p className="text-sm text-slate-500">Celkem přístrojů</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">
              {pristroje.filter(p => !isExpiring(p.platnostKalibrace)).length}
            </p>
            <p className="text-sm text-slate-500">Platná kalibrace</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-3xl font-bold text-amber-600">
              {pristroje.filter(p => isExpiring(p.platnostKalibrace) && !isExpired(p.platnostKalibrace)).length}
            </p>
            <p className="text-sm text-slate-500">Brzy expiruje</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-3xl font-bold text-red-600">
              {pristroje.filter(p => isExpired(p.platnostKalibrace)).length}
            </p>
            <p className="text-sm text-slate-500">Prošlá kalibrace</p>
          </div>
        </Card>
      </div>

      {/* Filtry */}
      <Card>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="w-48">
            <Select
              label="Typ přístroje"
              value={filterTyp}
              onChange={(e) => setFilterTyp(e.target.value)}
              options={[
                { value: '', label: 'Všechny typy' },
                ...typyPristroju
              ]}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showExpiring}
              onChange={(e) => setShowExpiring(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300"
            />
            <span className="text-sm text-slate-700">Pouze s expirující kalibrací</span>
          </label>
        </div>
      </Card>

      {/* Seznam přístrojů */}
      <Card title="Seznam přístrojů">
        {filteredPristroje.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Název</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Typ</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Výrobce / Model</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Výr. číslo</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Kalibrace</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Platnost</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Akce</th>
                </tr>
              </thead>
              <tbody>
                {filteredPristroje.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium">{p.nazev}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-slate-100 rounded text-xs">
                        {getTypLabel(p.typPristroje)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {p.vyrobce} {p.model}
                    </td>
                    <td className="py-3 px-4 font-mono text-sm">{p.vyrobniCislo}</td>
                    <td className="py-3 px-4 text-sm">
                      {new Date(p.datumKalibrace).toLocaleDateString('cs-CZ')}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        isExpired(p.platnostKalibrace) 
                          ? 'bg-red-100 text-red-700'
                          : isExpiring(p.platnostKalibrace)
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                      }`}>
                        {new Date(p.platnostKalibrace).toLocaleDateString('cs-CZ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEdit(p)}
                        >
                          Upravit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(p.id!)}
                        >
                          Smazat
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-slate-500 py-8">
            {filterTyp || showExpiring
              ? 'Žádné přístroje neodpovídají filtru.'
              : 'Zatím nemáte žádné měřící přístroje. Přidejte první kliknutím na tlačítko výše.'}
          </p>
        )}
      </Card>

      {/* Modal pro přidání/úpravu */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingPristroj ? 'Upravit přístroj' : 'Nový měřící přístroj'}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setIsModalOpen(false); resetForm(); }}>
              Zrušit
            </Button>
            <Button onClick={handleSubmit}>
              {editingPristroj ? 'Uložit změny' : 'Přidat'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Název přístroje"
            value={formData.nazev}
            onChange={(e) => setFormData({ ...formData, nazev: e.target.value })}
            placeholder="např. Multimetr Fluke 175"
            required
          />
          <Select
            label="Typ přístroje"
            value={formData.typPristroje}
            onChange={(e) => setFormData({ ...formData, typPristroje: e.target.value as any })}
            options={typyPristroju}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Výrobce"
              value={formData.vyrobce}
              onChange={(e) => setFormData({ ...formData, vyrobce: e.target.value })}
              placeholder="např. Fluke"
              required
            />
            <Input
              label="Model"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder="např. 175"
              required
            />
          </div>
          <Input
            label="Výrobní číslo"
            value={formData.vyrobniCislo}
            onChange={(e) => setFormData({ ...formData, vyrobniCislo: e.target.value })}
            placeholder="např. 12345678"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              label="Datum kalibrace"
              value={formData.datumKalibrace}
              onChange={(e) => setFormData({ ...formData, datumKalibrace: e.target.value })}
              required
            />
            <Input
              type="date"
              label="Platnost do"
              value={formData.platnostKalibrace}
              onChange={(e) => setFormData({ ...formData, platnostKalibrace: e.target.value })}
              required
            />
          </div>
          <Input
            label="Poznámka"
            value={formData.poznamka}
            onChange={(e) => setFormData({ ...formData, poznamka: e.target.value })}
            placeholder="Volitelná poznámka..."
          />
        </form>
      </Modal>
    </div>
  );
}
