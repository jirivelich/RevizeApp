import React, { useState } from 'react';
import { Button, Card, Input, Modal, ConfirmDialog, Badge, PageHeader, EmptyState, DataTable, Textarea, Checkbox } from '../components/ui';
import type { DataTableColumn } from '../components/ui';
import { useCenik, useCreateCenik, useUpdateCenik, useDeleteCenik } from '../hooks/useQueries';
import type { CenikPolozka } from '../types';
import { formatKc } from './fakturaUi';

const emptyForm = { nazev: '', jednotka: 'ks', cena: '0', aktivni: true, poznamka: '' };

const CenikPage: React.FC = () => {
  const { data: cenik = [], isLoading: loading } = useCenik();
  const createCenik = useCreateCenik();
  const updateCenik = useUpdateCenik();
  const deleteCenik = useDeleteCenik();

  const [editing, setEditing] = useState<CenikPolozka | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CenikPolozka | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const handleNew = () => {
    setIsNew(true);
    setEditing(null);
    setFormError(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const handleEdit = (c: CenikPolozka) => {
    setIsNew(false);
    setEditing(c);
    setFormError(null);
    setFormData({
      nazev: c.nazev || '',
      jednotka: c.jednotka || '',
      cena: String(c.cena ?? 0),
      aktivni: c.aktivni,
      poznamka: c.poznamka || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const cena = Number(formData.cena.replace(',', '.'));
    if (!Number.isFinite(cena)) {
      setFormError('Cena musí být číslo');
      return;
    }
    const data = {
      nazev: formData.nazev.trim(),
      jednotka: formData.jednotka || undefined,
      cena,
      aktivni: formData.aktivni,
      poznamka: formData.poznamka || undefined,
    };
    try {
      if (isNew) {
        await createCenik.mutateAsync(data);
      } else if (editing) {
        await updateCenik.mutateAsync({ id: editing.id, data });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Chyba při ukládání položky ceníku:', error);
      setFormError('Nepodařilo se uložit položku');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCenik.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Chyba při mazání položky ceníku:', error);
      setDeleteTarget(null);
      setFormError('Nepodařilo se smazat položku');
    }
  };

  const columns: DataTableColumn<CenikPolozka>[] = [
    { key: 'nazev', header: 'Název', render: (c) => <span className="font-medium">{c.nazev}</span> },
    { key: 'jednotka', header: 'Jednotka', render: (c) => <span className="text-[var(--text-secondary)]">{c.jednotka || '-'}</span> },
    { key: 'cena', header: 'Cena', align: 'right', render: (c) => <span className="whitespace-nowrap tabular-nums">{formatKc(c.cena)}</span> },
    { key: 'stav', header: 'Stav', render: (c) => <Badge variant={c.aktivni ? 'success' : 'neutral'}>{c.aktivni ? 'Aktivní' : 'Neaktivní'}</Badge> },
    {
      key: 'akce',
      header: 'Akce',
      align: 'right',
      actions: true,
      render: (c) => (
        <>
          <Button variant="secondary" size="sm" onClick={() => handleEdit(c)}>Upravit</Button>
          <Button variant="danger" size="sm" onClick={() => { setFormError(null); setDeleteTarget(c); }}>Smazat</Button>
        </>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--border-strong)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ceník"
        subtitle="Položky pro rychlé vystavení faktur"
        actions={
          <Button onClick={handleNew}>
            <span className="sm:hidden text-lg leading-none">+</span>
            <span className="hidden sm:inline">Nová položka</span>
          </Button>
        }
      />

      {formError && !isModalOpen && (
        <p className="text-xs font-medium text-[var(--danger-text)] bg-[var(--danger-bg)] border border-[var(--danger)]/25 rounded-lg px-3 py-2">
          {formError}
        </p>
      )}

      {cenik.length === 0 ? (
        <EmptyState
          message="Ceník je zatím prázdný"
          action={<Button onClick={handleNew}>Přidat první položku</Button>}
        />
      ) : (
        <Card title="Položky ceníku">
          <DataTable columns={columns} rows={cenik} rowKey={(c) => c.id} />
        </Card>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isNew ? 'Nová položka ceníku' : 'Upravit položku ceníku'}>
        <div className="space-y-4">
          <Input label="Název *" value={formData.nazev} onChange={(e) => setFormData({ ...formData, nazev: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Jednotka" value={formData.jednotka} onChange={(e) => setFormData({ ...formData, jednotka: e.target.value })} />
            <Input label="Cena (Kč)" inputMode="decimal" value={formData.cena} onChange={(e) => setFormData({ ...formData, cena: e.target.value })} />
          </div>
          <Checkbox
            checked={formData.aktivni}
            onChange={(e) => setFormData({ ...formData, aktivni: e.target.checked })}
            label="Aktivní (nabízet při vystavování faktur)"
          />
          <Textarea label="Poznámka"
              value={formData.poznamka}
              onChange={(e) => setFormData({ ...formData, poznamka: e.target.value })}
              rows={2}
            />
          {formError && isModalOpen && (
            <p className="text-xs font-medium text-[var(--danger-text)] bg-[var(--danger-bg)] border border-[var(--danger)]/25 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Zrušit</Button>
            <Button onClick={handleSave} disabled={!formData.nazev.trim()}>{isNew ? 'Vytvořit' : 'Uložit'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Smazat položku ceníku"
        message={`Opravdu chcete smazat položku „${deleteTarget?.nazev ?? ''}“?`}
        confirmLabel="Smazat"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default CenikPage;
