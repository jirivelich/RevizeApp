import { useEffect, useState } from 'react';
import { Button, Card, Input, Modal } from '../components/ui';
import { firmaService } from '../services/database';
import type { Firma } from '../types';

export function FirmyPage() {
  const [firmy, setFirmy] = useState<Firma[]>([]);
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

  useEffect(() => {
    loadFirmy();
  }, []);

  const loadFirmy = async () => {
    const data = await firmaService.getAll();
    setFirmy(data);
  };

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

  const handleSave = async () => {
    if (!formData.nazev.trim()) {
      alert('Zadejte název firmy');
      return;
    }

    if (editingFirma?.id) {
      await firmaService.update(editingFirma.id, formData);
    } else {
      await firmaService.create(formData);
    }

    handleCloseModal();
    loadFirmy();
  };

  const handleDelete = async (id: number) => {
    if (confirm('Opravdu chcete smazat tuto firmu?')) {
      await firmaService.delete(id);
      loadFirmy();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Firmy</h1>
          <p className="text-slate-500 mt-1">
            Seznam firem, pro které provádíte revize. Tyto firmy můžete vybírat při vytváření revize.
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>+ Přidat firmu</Button>
      </div>

      {firmy.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏢</div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">
              Zatím nemáte žádné firmy
            </h3>
            <p className="text-slate-500 mb-4">
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
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Název</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">IČO</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Adresa</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Kontakt</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Telefon / Email</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Akce</th>
                </tr>
              </thead>
              <tbody>
                {firmy.map((firma) => (
                  <tr key={firma.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium">{firma.nazev}</td>
                    <td className="py-3 px-4 font-mono text-sm">{firma.ico || '-'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 max-w-xs truncate">{firma.adresa || '-'}</td>
                    <td className="py-3 px-4 text-sm">{firma.kontaktOsoba || '-'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {firma.telefon && <div>{firma.telefon}</div>}
                      {firma.email && <div className="text-blue-600">{firma.email}</div>}
                      {!firma.telefon && !firma.email && '-'}
                    </td>
                    <td className="py-3 px-4">
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

          <div className="border-t border-slate-200 pt-4">
            <h4 className="text-sm font-medium text-slate-700 mb-3">Kontaktní údaje</h4>
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
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Poznámka
            </label>
            <textarea
              value={formData.poznamka}
              onChange={(e) => setFormData({ ...formData, poznamka: e.target.value })}
              placeholder="Interní poznámky k firmě..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
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
