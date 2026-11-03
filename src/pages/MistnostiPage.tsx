import { useEffect, useState } from 'react';
import { Button, Card, Input, Select, Modal, ConfirmDialog, PageHeader, EmptyState } from '../components/ui';
import { useRevize } from '../hooks/useQueries';
import { mistnostService } from '../services/database';
import type { Mistnost } from '../types';

export function MistnostiPage() {
  const { data: revize = [] } = useRevize();
  const [mistnosti, setMistnosti] = useState<(Mistnost & { revizeNazev?: string })[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMistnost, setEditingMistnost] = useState<Mistnost | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<(Mistnost & { revizeNazev?: string }) | null>(null);

  const [formData, setFormData] = useState({
    revizeId: 0,
    nazev: '',
    patro: '',
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
      poznamka: '',
    });
  };

  const handleEdit = (mistnost: Mistnost) => {
    setEditingMistnost(mistnost);
    setFormData({
      revizeId: mistnost.revizeId,
      nazev: mistnost.nazev,
      patro: mistnost.patro || '',
      poznamka: mistnost.poznamka || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = (mistnost: Mistnost & { revizeNazev?: string }) => setDeleteTarget(mistnost);

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) return;
    await mistnostService.delete(deleteTarget.id);
    setDeleteTarget(null);
    loadMistnosti();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Místnosti"
        subtitle="Evidence místností"
        actions={
          <Button size="sm" onClick={() => { resetForm(); setIsModalOpen(true); }}>
            <span className="sm:hidden text-lg leading-none">+</span>
            <span className="hidden sm:inline">+ Nová místnost</span>
          </Button>
        }
      />

      {mistnosti.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mistnosti.map((m) => (
            <Card key={m.id} accent="primary">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-sm font-semibold text-[var(--text)]">{m.nazev}</h3>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => handleEdit(m)}
                    className="min-h-[32px] px-2 rounded-[var(--radius-md)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]"
                  >
                    Upravit
                  </button>
                  <button
                    onClick={() => handleDelete(m)}
                    aria-label="Smazat místnost"
                    className="min-h-[32px] min-w-[32px] rounded-[var(--radius-md)] text-sm text-[var(--text-secondary)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger-text)]"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                {m.patro && <p className="text-[var(--text-secondary)]">Patro: {m.patro}</p>}
                <p className="text-xs text-[var(--text-muted)] mt-2">{m.revizeNazev}</p>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState message="Žádné místnosti. Přidejte první kliknutím na tlačítko výše." />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingMistnost(null); }}
        title={editingMistnost ? 'Upravit místnost' : 'Nová místnost'}
        footer={
          <>
            <Button size="sm" variant="secondary" onClick={() => { setIsModalOpen(false); setEditingMistnost(null); }}>
              Zrušit
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={!formData.revizeId}>
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
          <Input
            label="Poznámka"
            value={formData.poznamka}
            onChange={(e) => setFormData({ ...formData, poznamka: e.target.value })}
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Smazat místnost"
        message="Opravdu chcete smazat tuto místnost?"
        confirmLabel="Smazat"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
