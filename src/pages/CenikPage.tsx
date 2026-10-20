import React, { useState } from 'react';
import { Button, Card, Input, Modal, ConfirmDialog, Badge } from '../components/ui';
import { useCenik, useCreateCenik, useUpdateCenik, useDeleteCenik } from '../hooks/useQueries';
import type { CenikPolozka } from '../types';
import { formatKc } from './fakturaUi';

const TH = 'py-2 px-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider';

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-sm font-bold text-[var(--text)]">Ceník</h1>
          <p className="text-xs text-[var(--text-secondary)]">Položky pro rychlé vystavení faktur</p>
        </div>
        <Button onClick={handleNew}>
          <span className="sm:hidden text-lg leading-none">+</span>
          <span className="hidden sm:inline">Nová položka</span>
        </Button>
      </div>

      {formError && !isModalOpen && (
        <p className="text-xs font-medium text-[var(--danger-text)] bg-red-500/[0.10] border border-red-500/[0.25] rounded-lg px-3 py-2">
          {formError}
        </p>
      )}

      {cenik.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-xs text-[var(--text-secondary)]">Ceník je zatím prázdný</p>
          <Button onClick={handleNew} className="mt-4">Přidat první položku</Button>
        </Card>
      ) : (
        <Card title="Položky ceníku">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className={`text-left ${TH}`}>Název</th>
                  <th className={`text-left ${TH}`}>Jednotka</th>
                  <th className={`text-right ${TH}`}>Cena</th>
                  <th className={`text-left ${TH}`}>Stav</th>
                  <th className={`text-right ${TH}`}>Akce</th>
                </tr>
              </thead>
              <tbody>
                {cenik.map((c) => (
                  <tr key={c.id} className="border-b border-[var(--border-subtle)] border-l-2 border-l-transparent hover:border-l-[var(--primary)] hover:bg-[var(--bg-hover)]">
                    <td className="py-2 px-3 text-xs font-medium text-[var(--text)]">{c.nazev}</td>
                    <td className="py-2 px-3 text-xs text-[var(--text-secondary)]">{c.jednotka || '-'}</td>
                    <td className="py-2 px-3 text-xs text-right text-[var(--text)] whitespace-nowrap">{formatKc(c.cena)}</td>
                    <td className="py-2 px-3"><Badge variant={c.aktivni ? 'success' : 'neutral'}>{c.aktivni ? 'Aktivní' : 'Neaktivní'}</Badge></td>
                    <td className="py-2 px-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => handleEdit(c)}>Upravit</Button>
                        <Button variant="danger" size="sm" onClick={() => { setFormError(null); setDeleteTarget(c); }}>Smazat</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isNew ? 'Nová položka ceníku' : 'Upravit položku ceníku'}>
        <div className="space-y-4">
          <Input label="Název *" value={formData.nazev} onChange={(e) => setFormData({ ...formData, nazev: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Jednotka" value={formData.jednotka} onChange={(e) => setFormData({ ...formData, jednotka: e.target.value })} />
            <Input label="Cena (Kč)" inputMode="decimal" value={formData.cena} onChange={(e) => setFormData({ ...formData, cena: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-xs text-[var(--text)]">
            <input type="checkbox" checked={formData.aktivni} onChange={(e) => setFormData({ ...formData, aktivni: e.target.checked })} />
            Aktivní (nabízet při vystavování faktur)
          </label>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Poznámka</label>
            <textarea
              value={formData.poznamka}
              onChange={(e) => setFormData({ ...formData, poznamka: e.target.value })}
              className="w-full px-3 py-2 border rounded-md bg-[var(--bg-input)] text-[var(--text)] border-[var(--border-input)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)]"
              rows={2}
            />
          </div>
          {formError && isModalOpen && (
            <p className="text-xs font-medium text-[var(--danger-text)] bg-red-500/[0.10] border border-red-500/[0.25] rounded-lg px-3 py-2">
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
