import { useState } from 'react';
import { Button, Card, Input, Modal } from '../components/ui';
import { useFirmy, useCreateFirma, useUpdateFirma, useDeleteFirma } from '../hooks/useQueries';
import type { Firma } from '../types';

export function FirmyPage() {
  const { data: firmy = [] } = useFirmy();
  const createFirma = useCreateFirma();
  const updateFirma = useUpdateFirma();
  const deleteFirma = useDeleteFirma();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFirma, setEditingFirma] = useState<Firma | null>(null);
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
      alert('Zadejte název firmy');
      return;
    }

    if (editingFirma?.id) {
      updateFirma.mutate({ id: editingFirma.id, data: formData }, { onSuccess: handleCloseModal });
    } else {
      createFirma.mutate(formData, { onSuccess: handleCloseModal });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Opravdu chcete smazat tuto firmu?')) {
      deleteFirma.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-sm font-bold text-[var(--text)]">Firmy</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Seznam firem, pro které provádíte revize. Tyto firmy můžete vybírat při vytváření revize.
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <span className="sm:hidden text-lg leading-none">+</span>
          <span className="hidden sm:inline">+ Přidat firmu</span>
        </Button>
      </div>

      {firmy.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <h3 className="text-xs font-medium text-slate-700 mb-2">
              Zatím nemáte žádné firmy
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              Přidejte firmy, pro které provádíte revize jako externí technik.
            </p>
            <Button onClick={() => handleOpenModal()}>
              + Přidat první firmu
            </Button>
          </div>
        </Card>
      ) : (
        <Card title="Seznam firem">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Název</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">ČO</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Adresa</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Kontakt</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Telefon / Email</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Akce</th>
                </tr>
              </thead>
              <tbody>
                {firmy.map((firma) => (
                  <tr key={firma.id} className="border-b border-[var(--border-subtle)] border-l-2 border-l-transparent hover:border-l-[#C00606] hover:bg-[rgba(192,6,6,0.03)] group">
                    <td className="py-2 px-3 text-xs font-medium text-[var(--text)]">{firma.nazev}</td>
                    <td className="py-2 px-3 font-mono text-xs text-[var(--text-secondary)]">{firma.ico || '-'}</td>
                    <td className="py-2 px-3 text-xs text-[var(--text-secondary)] max-w-xs truncate">{firma.adresa || '-'}</td>
                    <td className="py-2 px-3 text-xs text-[var(--text)]">{firma.kontaktOsoba || '-'}</td>
                    <td className="py-2 px-3 text-xs text-[var(--text-secondary)]">
                      {firma.telefon && <div>{firma.telefon}</div>}
                      {firma.email && <div className="text-[var(--text-secondary)]">{firma.email}</div>}
                      {!firma.telefon && !firma.email && '-'}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenModal(firma)}
                        >
                          Upravit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(firma.id!)}
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

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Poznámka
            </label>
            <textarea
              value={formData.poznamka}
              onChange={(e) => setFormData({ ...formData, poznamka: e.target.value })}
              placeholder="Interní poznámky k firmě..."
              className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-input)] text-[var(--text)] border-[var(--border-input)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)] focus:border-blue-500/[0.5] text-sm"
              rows={3}
            />
          </div>

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
    </div>
  );
}
