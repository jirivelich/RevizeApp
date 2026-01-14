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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {firmy.map((firma) => (
            <Card key={firma.id} className="hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-lg text-slate-800">{firma.nazev}</h3>
                <div className="flex gap-1">
                  <Button size="sm" variant="secondary" onClick={() => handleOpenModal(firma)}>
                    ✏️
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(firma.id!)}>
                    🗑️
                  </Button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {firma.adresa && (
                  <div>
                    <span className="text-slate-500">Adresa:</span>{' '}
                    <span className="text-slate-700">{firma.adresa}</span>
                  </div>
                )}
                {firma.ico && (
                  <div>
                    <span className="text-slate-500">IČO:</span>{' '}
                    <span className="text-slate-700">{firma.ico}</span>
                  </div>
                )}
                {firma.dic && (
                  <div>
                    <span className="text-slate-500">DIČ:</span>{' '}
                    <span className="text-slate-700">{firma.dic}</span>
                  </div>
                )}
                {firma.kontaktOsoba && (
                  <div>
                    <span className="text-slate-500">Kontakt:</span>{' '}
                    <span className="text-slate-700">{firma.kontaktOsoba}</span>
                  </div>
                )}
                {firma.telefon && (
                  <div>
                    <span className="text-slate-500">Telefon:</span>{' '}
                    <span className="text-slate-700">{firma.telefon}</span>
                  </div>
                )}
                {firma.email && (
                  <div>
                    <span className="text-slate-500">E-mail:</span>{' '}
                    <span className="text-slate-700">{firma.email}</span>
                  </div>
                )}
              </div>

              {firma.poznamka && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-sm text-slate-500 italic">{firma.poznamka}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
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
