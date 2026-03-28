import { useState } from 'react';
import { Button, Card, Input, Select, Modal } from '../components/ui';
import { usePristroje, useCreatePristroj, useUpdatePristroj, useDeletePristroj, useKalibrace, useCreateKalibrace, useDeleteKalibrace } from '../hooks/useQueries';
import type { MericiPristroj, Kalibrace } from '../types';

const typyPristroju = [
  { value: 'multimetr', label: 'Multimetr' },
  { value: 'meger', label: 'Meger (izolační odpor)' },
  { value: 'smyckomer', label: 'Smyčkoměr' },
  { value: 'proudovy_chranic', label: 'Tester proudových chráničů' },
  { value: 'osciloskop', label: 'Osciloskop' },
  { value: 'jiny', label: 'Jiný' },
];

export function PristrojePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPristroj, setEditingPristroj] = useState<MericiPristroj | null>(null);
  const [filterTyp, setFilterTyp] = useState('');
  const [showExpiring, setShowExpiring] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [historyPristroj, setHistoryPristroj] = useState<MericiPristroj | null>(null);
  const [isKalibraceModalOpen, setIsKalibraceModalOpen] = useState(false);
  const [kalibraceForm, setKalibraceForm] = useState({
    datumKalibrace: new Date().toISOString().split('T')[0],
    platnostKalibrace: '',
    provedl: '',
    certifikat: '',
    poznamka: '',
  });

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

  const { data: pristroje = [] } = usePristroje();
  const createPristroj = useCreatePristroj();
  const updatePristroj = useUpdatePristroj();
  const deletePristroj = useDeletePristroj();
  const { data: kalibrace = [] } = useKalibrace(historyPristroj?.id);
  const createKalibrace = useCreateKalibrace();
  const deleteKalibrace = useDeleteKalibrace();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const onDone = () => { setIsModalOpen(false); resetForm(); };
    if (editingPristroj?.id) {
      updatePristroj.mutate({ id: editingPristroj.id, data: formData }, { onSuccess: onDone });
    } else {
      createPristroj.mutate(formData, { onSuccess: onDone });
    }
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
      deletePristroj.mutate(id);
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
          <h1 className="text-lg font-bold text-slate-800">Přístroje a kalibrace</h1>
          <p className="text-xs text-slate-400">Správa měřících přístrojů a jejich kalibračních termínů</p>
        </div>
        <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
          + Přidat přístroj
        </Button>
      </div>

      {/* Statistiky */}
      <div className="lg:hidden">
        <button
          onClick={() => setShowStats(!showStats)}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
        >
          <span>{showStats ? '▼' : '▶'}</span>
          <span>{showStats ? 'Skrýt statistiky' : 'Zobrazit statistiky'}</span>
        </button>
      </div>
      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 ${showStats ? '' : 'hidden lg:grid'}`}>
        <Card>
          <div className="text-center p-1">
            <p className="text-2xl sm:text-3xl font-bold text-slate-800">{pristroje.length}</p>
            <p className="text-xs sm:text-sm text-slate-500">Celkem přístrojů</p>
          </div>
        </Card>
        <Card>
          <div className="text-center p-1">
            <p className="text-2xl sm:text-3xl font-bold text-slate-800">
              {pristroje.filter(p => !isExpiring(p.platnostKalibrace)).length}
            </p>
            <p className="text-xs sm:text-sm text-slate-500">Platná kalibrace</p>
          </div>
        </Card>
        <Card>
          <div className="text-center p-1">
            <p className="text-2xl sm:text-3xl font-bold text-slate-800">
              {pristroje.filter(p => isExpiring(p.platnostKalibrace) && !isExpired(p.platnostKalibrace)).length}
            </p>
            <p className="text-xs sm:text-sm text-slate-500">Brzy expiruje</p>
          </div>
        </Card>
        <Card>
          <div className="text-center p-1">
            <p className="text-2xl sm:text-3xl font-bold text-slate-800">
              {pristroje.filter(p => isExpired(p.platnostKalibrace)).length}
            </p>
            <p className="text-xs sm:text-sm text-slate-500">Prošlá kalibrace</p>
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
                          ? 'bg-red-50 text-red-600'
                          : isExpiring(p.platnostKalibrace)
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-slate-100 text-slate-600'
                      }`}>
                        {new Date(p.platnostKalibrace).toLocaleDateString('cs-CZ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setHistoryPristroj(p)}
                        >
                          Kalibrace
                        </Button>
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

      {/* Modal – historie kalibrací */}
      <Modal
        isOpen={!!historyPristroj}
        onClose={() => { setHistoryPristroj(null); setIsKalibraceModalOpen(false); }}
        title={`Kalibrace – ${historyPristroj?.nazev || ''}`}
        footer={
          <Button variant="secondary" onClick={() => { setHistoryPristroj(null); setIsKalibraceModalOpen(false); }}>
            Zavřít
          </Button>
        }
      >
        <div className="space-y-4">
          {/* Info o přístroji */}
          <div className="bg-slate-50 rounded-lg p-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-slate-500">Výrobce / Model:</span>
              <span className="font-medium">{historyPristroj?.vyrobce} {historyPristroj?.model}</span>
              <span className="text-slate-500">Výrobní číslo:</span>
              <span className="font-mono">{historyPristroj?.vyrobniCislo}</span>
              <span className="text-slate-500">Aktuální kalibrace:</span>
              <span className="font-medium">
                {historyPristroj?.datumKalibrace ? new Date(historyPristroj.datumKalibrace).toLocaleDateString('cs-CZ') : '—'}
                {' → '}
                {historyPristroj?.platnostKalibrace ? new Date(historyPristroj.platnostKalibrace).toLocaleDateString('cs-CZ') : '—'}
              </span>
            </div>
          </div>

          {/* Tlačítko přidat novou kalibraci */}
          {!isKalibraceModalOpen && (
            <Button size="sm" onClick={() => {
              setKalibraceForm({
                datumKalibrace: new Date().toISOString().split('T')[0],
                platnostKalibrace: '',
                provedl: '',
                certifikat: '',
                poznamka: '',
              });
              setIsKalibraceModalOpen(true);
            }}>+ Nová kalibrace</Button>
          )}

          {/* Formulář nové kalibrace */}
          {isKalibraceModalOpen && (
            <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-semibold text-blue-800">Nový kalibrační záznam</h4>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="date"
                  label="Datum kalibrace"
                  value={kalibraceForm.datumKalibrace}
                  onChange={(e) => setKalibraceForm({ ...kalibraceForm, datumKalibrace: e.target.value })}
                  required
                />
                <Input
                  type="date"
                  label="Platnost do"
                  value={kalibraceForm.platnostKalibrace}
                  onChange={(e) => setKalibraceForm({ ...kalibraceForm, platnostKalibrace: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Provedl"
                  value={kalibraceForm.provedl}
                  onChange={(e) => setKalibraceForm({ ...kalibraceForm, provedl: e.target.value })}
                  placeholder="Kalibrační laboratoř..."
                />
                <Input
                  label="Č. certifikátu"
                  value={kalibraceForm.certifikat}
                  onChange={(e) => setKalibraceForm({ ...kalibraceForm, certifikat: e.target.value })}
                  placeholder="KAL-2026-001"
                />
              </div>
              <Input
                label="Poznámka"
                value={kalibraceForm.poznamka}
                onChange={(e) => setKalibraceForm({ ...kalibraceForm, poznamka: e.target.value })}
                placeholder="Volitelná poznámka..."
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    if (!historyPristroj?.id || !kalibraceForm.datumKalibrace || !kalibraceForm.platnostKalibrace) return;
                    createKalibrace.mutate({
                      pristrojId: historyPristroj.id,
                      datumKalibrace: kalibraceForm.datumKalibrace,
                      platnostKalibrace: kalibraceForm.platnostKalibrace,
                      provedl: kalibraceForm.provedl || undefined,
                      certifikat: kalibraceForm.certifikat || undefined,
                      poznamka: kalibraceForm.poznamka || undefined,
                    }, {
                      onSuccess: () => setIsKalibraceModalOpen(false),
                    });
                  }}
                >
                  Uložit
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setIsKalibraceModalOpen(false)}>Zrušit</Button>
              </div>
            </div>
          )}

          {/* Seznam kalibrací */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Historie kalibrací</h4>
            {kalibrace.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">Datum</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">Platnost do</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">Provedl</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">Certifikát</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">Poznámka</th>
                      <th className="py-2 px-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {kalibrace.map((k, idx) => (
                      <tr key={k.id} className={`border-b border-slate-100 ${idx === 0 ? 'bg-emerald-50/50' : ''}`}>
                        <td className="py-2 px-3 font-medium">
                          {new Date(k.datumKalibrace).toLocaleDateString('cs-CZ')}
                          {idx === 0 && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-semibold">aktuální</span>}
                        </td>
                        <td className="py-2 px-3">{new Date(k.platnostKalibrace).toLocaleDateString('cs-CZ')}</td>
                        <td className="py-2 px-3 text-slate-600">{k.provedl || '—'}</td>
                        <td className="py-2 px-3 font-mono text-xs text-slate-600">{k.certifikat || '—'}</td>
                        <td className="py-2 px-3 text-slate-500 text-xs">{k.poznamka || ''}</td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => { if (k.id && historyPristroj?.id) deleteKalibrace.mutate({ id: k.id, pristrojId: historyPristroj.id }); }}
                            className="text-red-400 hover:text-red-600 cursor-pointer text-xs"
                            title="Smazat záznam"
                          >✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-slate-400 py-4 text-sm">Zatím žádné záznamy kalibrací.</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
