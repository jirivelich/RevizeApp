import React, { useState, useEffect } from 'react';
import { Button, Card, Input, Modal } from '../components/ui';
import { zakazniciService } from '../services/database';
import type { Zakaznik, Revize } from '../types';

const ZakazniciPage: React.FC = () => {
  const [zakaznici, setZakaznici] = useState<Zakaznik[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingZakaznik, setEditingZakaznik] = useState<Zakaznik | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewZakaznik, setIsNewZakaznik] = useState(false);
  const [revizeModalOpen, setRevizeModalOpen] = useState(false);
  const [selectedZakaznikRevize, setSelectedZakaznikRevize] = useState<Revize[]>([]);
  const [selectedZakaznikName, setSelectedZakaznikName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

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
    loadZakaznici();
  }, []);

  const loadZakaznici = async () => {
    try {
      setLoading(true);
      const data = await zakazniciService.getAll();
      setZakaznici(data);
    } catch (error) {
      console.error('Chyba při načítání zákazníků:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewZakaznik = () => {
    setIsNewZakaznik(true);
    setEditingZakaznik(null);
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
    setIsModalOpen(true);
  };

  const handleEditZakaznik = (zakaznik: Zakaznik) => {
    setIsNewZakaznik(false);
    setEditingZakaznik(zakaznik);
    setFormData({
      nazev: zakaznik.nazev || '',
      adresa: zakaznik.adresa || '',
      ico: zakaznik.ico || '',
      dic: zakaznik.dic || '',
      kontaktOsoba: zakaznik.kontaktOsoba || '',
      telefon: zakaznik.telefon || '',
      email: zakaznik.email || '',
      poznamka: zakaznik.poznamka || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (isNewZakaznik) {
        await zakazniciService.create(formData);
      } else if (editingZakaznik && editingZakaznik.id) {
        await zakazniciService.update(editingZakaznik.id, formData);
      }
      setIsModalOpen(false);
      loadZakaznici();
    } catch (error) {
      console.error('Chyba při ukládání zákazníka:', error);
      alert('Nepodařilo se uložit zákazníka');
    }
  };

  const handleDelete = async (id: number | undefined) => {
    if (!id) return;
    if (!confirm('Opravdu chcete smazat tohoto zákazníka? Vazby na revize budou odstraněny.')) return;
    try {
      await zakazniciService.delete(id);
      loadZakaznici();
    } catch (error) {
      console.error('Chyba při mazání zákazníka:', error);
      alert('Nepodařilo se smazat zákazníka');
    }
  };

  const handleShowRevize = async (zakaznik: Zakaznik) => {
    if (!zakaznik.id) return;
    try {
      const revize = await zakazniciService.getRevize(zakaznik.id);
      setSelectedZakaznikRevize(revize);
      setSelectedZakaznikName(zakaznik.nazev);
      setRevizeModalOpen(true);
    } catch (error) {
      console.error('Chyba při načítání revizí zákazníka:', error);
    }
  };

  const filteredZakaznici = zakaznici.filter(z => 
    z.nazev?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    z.ico?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    z.kontaktOsoba?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    z.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Zákazníci</h1>
          <p className="text-gray-600">Správa zákazníků a jejich revizí</p>
        </div>
        <Button onClick={handleNewZakaznik}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nový zákazník
        </Button>
      </div>

      {/* Vyhledávání */}
      <Card className="p-4">
        <Input
          placeholder="Hledat zákazníka (název, IČO, kontakt, email)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Card>

      {/* Seznam zákazníků */}
      <div className="grid gap-4">
        {filteredZakaznici.length === 0 ? (
          <Card className="p-8 text-center">
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-gray-500">
              {searchTerm ? 'Žádní zákazníci nenalezeni' : 'Zatím nemáte žádné zákazníky'}
            </p>
            {!searchTerm && (
              <Button onClick={handleNewZakaznik} className="mt-4">
                Přidat prvního zákazníka
              </Button>
            )}
          </Card>
        ) : (
          filteredZakaznici.map((zakaznik) => (
            <Card key={zakaznik.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{zakaznik.nazev}</h3>
                    <span 
                      className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full cursor-pointer hover:bg-blue-200"
                      onClick={() => handleShowRevize(zakaznik)}
                      title="Zobrazit revize zákazníka"
                    >
                      {zakaznik.pocetRevizi || 0} revizí
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-gray-600">
                    {zakaznik.adresa && (
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{zakaznik.adresa}</span>
                      </div>
                    )}
                    {zakaznik.ico && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">IČO:</span> {zakaznik.ico}
                      </div>
                    )}
                    {zakaznik.dic && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">DIČ:</span> {zakaznik.dic}
                      </div>
                    )}
                    {zakaznik.kontaktOsoba && (
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>{zakaznik.kontaktOsoba}</span>
                      </div>
                    )}
                    {zakaznik.telefon && (
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span>{zakaznik.telefon}</span>
                      </div>
                    )}
                    {zakaznik.email && (
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <a href={`mailto:${zakaznik.email}`} className="text-blue-600 hover:underline">{zakaznik.email}</a>
                      </div>
                    )}
                  </div>

                  {zakaznik.poznamka && (
                    <p className="mt-2 text-sm text-gray-500 italic">{zakaznik.poznamka}</p>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  <Button variant="secondary" size="sm" onClick={() => handleEditZakaznik(zakaznik)}>
                    Upravit
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(zakaznik.id)}>
                    Smazat
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal pro editaci zákazníka */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isNewZakaznik ? 'Nový zákazník' : 'Upravit zákazníka'}
      >
        <div className="space-y-4">
          <Input
            label="Název / Jméno *"
            value={formData.nazev}
            onChange={(e) => setFormData({ ...formData, nazev: e.target.value })}
            required
          />
          <Input
            label="Adresa"
            value={formData.adresa}
            onChange={(e) => setFormData({ ...formData, adresa: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="IČO"
              value={formData.ico}
              onChange={(e) => setFormData({ ...formData, ico: e.target.value })}
            />
            <Input
              label="DIČ"
              value={formData.dic}
              onChange={(e) => setFormData({ ...formData, dic: e.target.value })}
            />
          </div>
          <Input
            label="Kontaktní osoba"
            value={formData.kontaktOsoba}
            onChange={(e) => setFormData({ ...formData, kontaktOsoba: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Telefon"
              value={formData.telefon}
              onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Poznámka</label>
            <textarea
              value={formData.poznamka}
              onChange={(e) => setFormData({ ...formData, poznamka: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={handleSave} disabled={!formData.nazev}>
              {isNewZakaznik ? 'Vytvořit' : 'Uložit'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal pro zobrazení revizí zákazníka */}
      <Modal
        isOpen={revizeModalOpen}
        onClose={() => setRevizeModalOpen(false)}
        title={`Revize zákazníka: ${selectedZakaznikName}`}
      >
        <div className="space-y-2">
          {selectedZakaznikRevize.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Zákazník nemá žádné revize</p>
          ) : (
            selectedZakaznikRevize.map((revize) => (
              <div key={revize.id} className="p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">{revize.cisloRevize || `Revize #${revize.id}`}</span>
                    <span className="text-gray-500 ml-2">
                      {revize.datum ? new Date(revize.datum).toLocaleDateString('cs-CZ') : 'Bez data'}
                    </span>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    revize.stav === 'dokončeno' ? 'bg-green-100 text-green-800' :
                    revize.stav === 'rozpracováno' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {revize.stav === 'dokončeno' ? 'Dokončeno' :
                     revize.stav === 'rozpracováno' ? 'Rozpracováno' : revize.stav}
                  </span>
                </div>
                {revize.nazev && (
                  <p className="text-sm text-gray-600 mt-1">{revize.nazev}</p>
                )}
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ZakazniciPage;
