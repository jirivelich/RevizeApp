import { useState } from 'react';
import { Button, Card, Input, Modal, ConfirmDialog, PageHeader, EmptyState, DataTable, Textarea } from '../components/ui';
import type { DataTableColumn } from '../components/ui';
import { useFirmy, useCreateFirma, useUpdateFirma, useDeleteFirma } from '../hooks/useQueries';
import type { Firma } from '../types';

export function FirmyPage() {
  const { data: firmy = [] } = useFirmy();
  const createFirma = useCreateFirma();
  const updateFirma = useUpdateFirma();
  const deleteFirma = useDeleteFirma();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFirma, setEditingFirma] = useState<Firma | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Firma | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nazev: '',
    adresa: '',
    ico: '',
    dic: '',
    kontaktOsoba: '',
    telefon: '',
    email: '',
    poznamka: '',
  });

  const resetForm = () => {
    setFormData({
      nazev: '',
      adresa: '',
      ico: '',
      dic: '',
      kontaktOsoba: '',
      telefon: '',
      email: '',
      poznamka: '',
    });
    setEditingFirma(null);
  };

  const handleOpenModal = (firma?: Firma) => {
    setFormError(null);
    if (firma) {
      setEditingFirma(firma);
      setFormData({
        nazev: firma.nazev,
        adresa: firma.adresa || '',
        ico: firma.ico || '',
        dic: firma.dic || '',
        kontaktOsoba: firma.kontaktOsoba || '',
        telefon: firma.telefon || '',
        email: firma.email || '',
        poznamka: firma.poznamka || '',
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleSave = () => {
    if (!formData.nazev.trim()) {
      setFormError('Zadejte název firmy');
      return;
    }

    if (editingFirma?.id) {
      updateFirma.mutate({ id: editingFirma.id, data: formData }, { onSuccess: handleCloseModal });
    } else {
      createFirma.mutate(formData, { onSuccess: handleCloseModal });
    }
  };

  const handleDelete = (firma: Firma) => setDeleteTarget(firma);

  const handleConfirmDelete = () => {
    if (!deleteTarget?.id) return;
    deleteFirma.mutate(deleteTarget.id);
    setDeleteTarget(null);
  };

  const columns: DataTableColumn<Firma>[] = [
    { key: 'nazev', header: 'Název', render: (r) => <span className="font-medium">{r.nazev}</span> },
    { key: 'ico', header: 'IČO', render: (r) => <span className="font-mono text-[var(--text-secondary)]">{r.ico || '-'}</span> },
    { key: 'adresa', header: 'Adresa', render: (r) => <span className="text-[var(--text-secondary)]">{r.adresa || '-'}</span> },
    { key: 'kontakt', header: 'Kontakt', render: (r) => r.kontaktOsoba || '-' },
    {
      key: 'kontakt2',
      header: 'Telefon / Email',
      render: (r) => (
        <div className="text-[var(--text-secondary)]">
          {r.telefon && <div>{r.telefon}</div>}
          {r.email && <div>{r.email}</div>}
          {!r.telefon && !r.email && '-'}
        </div>
      ),
    },
    {
      key: 'akce',
      header: 'Akce',
      align: 'right',
      actions: true,
      render: (r) => (
        <>
          <Button variant="secondary" size="sm" onClick={() => handleOpenModal(r)}>Upravit</Button>
          <Button variant="danger" size="sm" onClick={() => handleDelete(r)}>Smazat</Button>
        </>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Firmy"
        subtitle="Seznam firem, pro které provádíte revize. Tyto firmy můžete vybírat při vytváření revize."
        actions={
          <Button onClick={() => handleOpenModal()}>
            <span className="sm:hidden text-lg leading-none">+</span>
            <span className="hidden sm:inline">+ Přidat firmu</span>
          </Button>
        }
      />

      {firmy.length === 0 ? (
        <EmptyState
          message="Zatím nemáte žádné firmy. Přidejte firmy, pro které provádíte revize jako externí technik."
          action={<Button onClick={() => handleOpenModal()}>+ Přidat první firmu</Button>}
        />
      ) : (
        <Card title="Seznam firem">
          <DataTable columns={columns} rows={firmy} rowKey={(f) => f.id ?? f.nazev} />
        </Card>
      )}

      {/* Modal pro přidání/úpravu firmy */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingFirma ? 'Upravit firmu' : 'Přidat firmu'}
      >
        <div className="space-y-4">
          <Input
            label="Název firmy *"
            value={formData.nazev}
            onChange={(e) => setFormData({ ...formData, nazev: e.target.value })}
            placeholder="Název firmy"
          />

          <Input
            label="Adresa"
            value={formData.adresa}
            onChange={(e) => setFormData({ ...formData, adresa: e.target.value })}
            placeholder="Ulice, město, PSČ"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="IČO"
              value={formData.ico}
              onChange={(e) => setFormData({ ...formData, ico: e.target.value })}
              placeholder="12345678"
            />
            <Input
              label="DIČ"
              value={formData.dic}
              onChange={(e) => setFormData({ ...formData, dic: e.target.value })}
              placeholder="CZ12345678"
            />
          </div>

          <div className="border-t border-[var(--border)] pt-4">
            <h4 className="text-sm font-medium text-[var(--text)] mb-3">Kontaktní údaje</h4>
            <Input
              label="Kontaktní osoba"
              value={formData.kontaktOsoba}
              onChange={(e) => setFormData({ ...formData, kontaktOsoba: e.target.value })}
              placeholder="Jméno kontaktní osoby"
            />
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Input
                label="Telefon"
                value={formData.telefon}
                onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                placeholder="+420 123 456 789"
              />
              <Input
                label="E-mail"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@firma.cz"
              />
            </div>
          </div>

          <Textarea label="Poznámka"
              value={formData.poznamka}
              onChange={(e) => setFormData({ ...formData, poznamka: e.target.value })}
              placeholder="Interní poznámky k firmě..."
              rows={3}
            />

          {formError && (
            <p className="text-xs font-medium text-[var(--danger-text)] bg-[var(--danger-bg)] border border-[var(--danger)]/25 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Button variant="secondary" onClick={handleCloseModal}>
              Zrušit
            </Button>
            <Button onClick={handleSave}>
              {editingFirma ? 'Uložit změny' : 'Přidat firmu'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Smazat firmu"
        message="Opravdu chcete smazat tuto firmu?"
        confirmLabel="Smazat"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}


