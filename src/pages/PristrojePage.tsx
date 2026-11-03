import { useState } from 'react';
import { Button, Card, Input, Select, Modal, ConfirmDialog, PageHeader, DataTable, Badge, EmptyState } from '../components/ui';
import type { DataTableColumn } from '../components/ui';
import { usePristroje, useCreatePristroj, useUpdatePristroj, useDeletePristroj, useKalibrace, useCreateKalibrace, useDeleteKalibrace } from '../hooks/useQueries';
import type { MericiPristroj } from '../types';

const typyPristroju = [
  { value: 'multimetr', label: 'Multimetr' },
  { value: 'meger', label: 'Meger (izolační odpor)' },
  { value: 'smyckomer', label: 'Smyčkoměr' },
  { value: 'proudovy_chranic', label: 'Tester proudových chráničů' },
  { value: 'osciloskop', label: 'Osciloskop' },
  { value: 'jiny', label: 'Jiný' },
];

const chipClass = (on: boolean) =>
  `inline-flex items-center h-8 px-3 rounded-full border text-xs font-semibold cursor-pointer transition-colors ${
    on
      ? 'bg-[var(--bg-accent)] border-[var(--primary)] text-[var(--primary)]'
      : 'bg-[var(--bg-hover)] border-[var(--border-input)] text-[var(--text-secondary)] hover:text-[var(--text)] hover:border-[var(--border-strong)]'
  }`;

export function PristrojePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPristroj, setEditingPristroj] = useState<MericiPristroj | null>(null);
  const [filterTyp, setFilterTyp] = useState('');
  const [showExpiring, setShowExpiring] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [historyPristroj, setHistoryPristroj] = useState<MericiPristroj | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MericiPristroj | null>(null);
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

  const handleDelete = (pristroj: MericiPristroj) => setDeleteTarget(pristroj);

  const handleConfirmDelete = () => {
    if (!deleteTarget?.id) return;
    deletePristroj.mutate(deleteTarget.id);
    setDeleteTarget(null);
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

  const columns: DataTableColumn<MericiPristroj>[] = [
    { key: 'nazev', header: 'Název', render: (p) => <span className="font-medium">{p.nazev}</span> },
    {
      key: 'typ',
      header: 'Typ',
      render: (p) => (
        <Badge variant="neutral">{getTypLabel(p.typPristroje)}</Badge>
      ),
    },
    { key: 'vyrobce', header: 'Výrobce / Model', render: (p) => <span className="text-[var(--text-secondary)]">{p.vyrobce} {p.model}</span> },
    { key: 'sn', header: 'Výr. číslo', render: (p) => <span className="font-mono text-[var(--text-secondary)]">{p.vyrobniCislo}</span> },
    { key: 'kalibrace', header: 'Kalibrace', render: (p) => <span className="text-[var(--text-secondary)]">{new Date(p.datumKalibrace).toLocaleDateString('cs-CZ')}</span> },
    {
      key: 'platnost',
      header: 'Platnost',
      render: (p) => (
        <Badge variant={isExpired(p.platnostKalibrace) ? 'danger' : isExpiring(p.platnostKalibrace) ? 'warning' : 'neutral'}>
          {new Date(p.platnostKalibrace).toLocaleDateString('cs-CZ')}
        </Badge>
      ),
    },
    {
      key: 'akce',
      header: 'Akce',
      align: 'right',
      actions: true,
      render: (p) => (
        <>
          <Button variant="secondary" size="sm" onClick={() => setHistoryPristroj(p)}>Kalibrace</Button>
          <Button variant="secondary" size="sm" onClick={() => handleEdit(p)}>Upravit</Button>
          <Button variant="danger" size="sm" onClick={() => handleDelete(p)}>Smazat</Button>
        </>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Přístroje a kalibrace"
        subtitle="Správa měřících přístrojů a jejich kalibračních termínů"
        actions={
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
            <span className="sm:hidden text-lg leading-none">+</span>
            <span className="hidden sm:inline">+ Přidat přístroj</span>
          </Button>
        }
      />

      {/* Statistiky */}
      <div className="lg:hidden">
        <button
          onClick={() => setShowStats(!showStats)}
          className="flex items-center gap-2 min-h-[44px] text-xs text-[var(--text-secondary)] hover:text-[var(--text)] cursor-pointer"
        >
          <span>{showStats ? '▼' : '▶'}</span>
          <span>{showStats ? 'Skrýt statistiky' : 'Zobrazit statistiky'}</span>
        </button>
      </div>
      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 ${showStats ? '' : 'hidden lg:grid'}`}>
        <Card>
          <div className="text-center p-1">
            <p className="text-lg sm:text-xl font-bold text-[var(--text)]">{pristroje.length}</p>
            <p className="text-xs text-[var(--text-secondary)]">Celkem přístrojů</p>
          </div>
        </Card>
        <Card>
          <div className="text-center p-1">
            <p className="text-lg sm:text-xl font-bold text-[var(--text)]">
              {pristroje.filter(p => !isExpiring(p.platnostKalibrace)).length}
            </p>
            <p className="text-xs text-[var(--text-secondary)]">Platná kalibrace</p>
          </div>
        </Card>
        <Card>
          <div className="text-center p-1">
            <p className="text-lg sm:text-xl font-bold text-[var(--text)]">
              {pristroje.filter(p => isExpiring(p.platnostKalibrace) && !isExpired(p.platnostKalibrace)).length}
            </p>
            <p className="text-xs text-[var(--text-secondary)]">Brzy expiruje</p>
          </div>
        </Card>
        <Card>
          <div className="text-center p-1">
            <p className="text-lg sm:text-xl font-bold text-[var(--text)]">
              {pristroje.filter(p => isExpired(p.platnostKalibrace)).length}
            </p>
            <p className="text-xs text-[var(--text-secondary)]">Prošlá kalibrace</p>
          </div>
        </Card>
      </div>

      {/* Filtry */}
      <div className="flex flex-wrap gap-2 items-center" role="group" aria-label="Filtry přístrojů">
        {[{ value: '', label: 'Všechny typy' }, ...typyPristroju].map((t) => (
          <button
            key={t.value}
            type="button"
            aria-pressed={filterTyp === t.value}
            className={chipClass(filterTyp === t.value)}
            onClick={() => setFilterTyp(t.value)}
          >
            {t.label}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={showExpiring}
          className={chipClass(showExpiring)}
          onClick={() => setShowExpiring(!showExpiring)}
        >
          Pouze s expirující kalibrací
        </button>
      </div>

      {/* Seznam přístrojů */}
      {filteredPristroje.length > 0 ? (
        <Card title="Seznam přístrojů">
          <DataTable columns={columns} rows={filteredPristroje} rowKey={(r) => r.id ?? r.nazev} />
        </Card>
      ) : (
        <EmptyState
          message={filterTyp || showExpiring
            ? 'Žádné přístroje neodpovídají filtru.'
            : 'Zatím nemáte žádné měřící přístroje. Přidejte první kliknutím na tlačítko výše.'}
        />
      )}

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
          <div className="bg-[var(--bg-input)] rounded-lg p-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-[var(--text-secondary)]">Výrobce / Model:</span>
              <span className="font-medium text-[var(--text)]">{historyPristroj?.vyrobce} {historyPristroj?.model}</span>
              <span className="text-[var(--text-secondary)]">Výrobní číslo:</span>
              <span className="font-mono text-[var(--text)]">{historyPristroj?.vyrobniCislo}</span>
              <span className="text-[var(--text-secondary)]">Aktuální kalibrace:</span>
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
            }}>
              <span className="sm:hidden text-base leading-none">+</span>
              <span className="hidden sm:inline">+ Nová kalibrace</span>
            </Button>
          )}

          {/* Formulář nové kalibrace */}
          {isKalibraceModalOpen && (
            <div className="border border-[var(--primary)]/30 bg-[var(--bg-accent)] rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-semibold text-[var(--primary)]">Nový kalibraciční záznam</h4>
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
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">Historie kalibrací</h4>
            {kalibrace.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)]">Datum</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)]">Platnost do</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)]">Provedl</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)]">Certifikát</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)]">Poznámka</th>
                      <th className="py-2 px-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {kalibrace.map((k, idx) => (
                      <tr key={k.id} className={`border-b border-[var(--border-subtle)] ${idx === 0 ? 'bg-[var(--success-bg)]' : ''}`}>
                        <td className="py-2 px-3 font-medium text-[var(--text)]">
                          {new Date(k.datumKalibrace).toLocaleDateString('cs-CZ')}
                          {idx === 0 && <Badge variant="success" className="ml-2">aktuální</Badge>}
                        </td>
                        <td className="py-2 px-3 text-[var(--text)]">{new Date(k.platnostKalibrace).toLocaleDateString('cs-CZ')}</td>
                        <td className="py-2 px-3 text-[var(--text-secondary)]">{k.provedl || '—'}</td>
                        <td className="py-2 px-3 font-mono text-xs text-[var(--text-secondary)]">{k.certifikat || '—'}</td>
                        <td className="py-2 px-3 text-[var(--text-muted)] text-xs">{k.poznamka || ''}</td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => { if (k.id && historyPristroj?.id) deleteKalibrace.mutate({ id: k.id, pristrojId: historyPristroj.id }); }}
                            className="text-[var(--danger-text)] hover:opacity-75 cursor-pointer text-sm min-w-[32px] min-h-[32px]"
                            title="Smazat záznam"
                            aria-label="Smazat záznam"
                          >✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-[var(--text-secondary)] py-4 text-sm">Zatím žádné záznamy kalibrací.</p>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Smazat přístroj"
        message="Opravdu chcete smazat tento přístroj?"
        confirmLabel="Smazat"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}


