import React, { useState } from 'react';
import { Button, Card, Input, Modal } from '../components/ui';
import { zakazniciService } from '../services/database';
import { useZakaznici, useCreateZakaznik, useUpdateZakaznik, useDeleteZakaznik } from '../hooks/useQueries';
import type { Zakaznik, Revize } from '../types';

const ZakazniciPage: React.FC = () => {
  const { data: zakaznici = [], isLoading: loading } = useZakaznici();
  const createZakaznik = useCreateZakaznik();
  const updateZakaznik = useUpdateZakaznik();
  const deleteZakaznik = useDeleteZakaznik();

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
        await createZakaznik.mutateAsync(formData);
      } else if (editingZakaznik && editingZakaznik.id) {
        await updateZakaznik.mutateAsync({ id: editingZakaznik.id, data: formData });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Chyba při ukládání zákazníka:', error);
      alert('Nepodařilo se uložit zákazníka');
    }
  };

  const handleDelete = async (id: number | undefined) => {
    if (!id) return;
    if (!confirm('Opravdu chcete smazat tohoto zákazníka? Vazby na revize budou odstraněny.')) return;
    try {
      await deleteZakaznik.mutateAsync(id);
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
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-sm font-bold text-[var(--text-primary)]">Zákazníci</h1>
          <p className="text-xs text-[var(--text-secondary)]">Správa zákazníků a jejich revizí</p>
        </div>
        <Button onClick={handleNewZakaznik}>
          <span className="sm:hidden text-lg leading-none">+</span>
          <span className="hidden sm:inline">Nový zákazník</span>
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
      {filteredZakaznici.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-xs text-[var(--text-secondary)]">
            {searchTerm ? 'Žádní zákazníci nenalezeni' : 'Zatím nemáte žádné zákazníky'}
          </p>
          {!searchTerm && (
            <Button onClick={handleNewZakaznik} className="mt-4">
              Přidat prvního zákazníka
            </Button>
          )}
        </Card>
      ) : (
        <Card title="Seznam zákazníků">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-table)]">
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Název</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">ČO</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Adresa</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Kontakt</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Telefon / Email</th>
                  <th className="text-center py-2 px-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Revizí</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Akce</th>
                </tr>
              </thead>
              <tbody>
                {filteredZakaznici.map((zakaznik) => (
                  <tr key={zakaznik.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-input)]">
                    <td className="py-2 px-3 text-xs font-medium text-[var(--text-primary)]">{zakaznik.nazev}</td>
                    <td className="py-2 px-3 font-mono text-xs text-[var(--text-secondary)]">{zakaznik.ico || '-'}</td>
                    <td className="py-2 px-3 text-xs text-[var(--text-secondary)] max-w-xs truncate">{zakaznik.adresa || '-'}</td>
                    <td className="py-2 px-3 text-xs text-[var(--text-primary)]">{zakaznik.kontaktOsoba || '-'}</td>
                    <td className="py-2 px-3 text-xs text-[var(--text-secondary)]">
                      {zakaznik.telefon && <div>{zakaznik.telefon}</div>}
                      {zakaznik.email && <div className="text-[var(--text-secondary)]">{zakaznik.email}</div>}
                      {!zakaznik.telefon && !zakaznik.email && '-'}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span 
                        className="px-2 py-1 text-xs font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded cursor-pointer hover:bg-[var(--bg-hover-strong)]"
                        onClick={() => handleShowRevize(zakaznik)}
                        title="Zobrazit revize zákazníka"
                      >
                        {zakaznik.pocetRevizi || 0}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEditZakaznik(zakaznik)}
                        >
                          Upravit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(zakaznik.id)}
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
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Poznámka</label>
            <textarea
              value={formData.poznamka}
              onChange={(e) => setFormData({ ...formData, poznamka: e.target.value })}
              className="w-full px-3 py-2 border rounded-md bg-[var(--bg-input)] text-[var(--text-primary)] border-[var(--border-input)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)] focus:border-blue-500/[0.5]"
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
            <p className="text-[var(--text-secondary)] text-center py-4">Žádné revize</p>
          ) : (
            selectedZakaznikRevize.map((revize) => (
              <div key={revize.id} className="p-3 border rounded-lg hover:bg-slate-50">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">{revize.cisloRevize || `Revize #${revize.id}`}</span>
                    <span className="text-[var(--text-secondary)] ml-2">
                      {revize.datum ? new Date(revize.datum).toLocaleDateString('cs-CZ') : 'Bez data'}
                    </span>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    revize.stav === 'dokončeno' ? 'bg-emerald-50 text-emerald-600' :
                    revize.stav === 'rozpracováno' ? 'bg-amber-50 text-amber-600' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {revize.stav === 'dokončeno' ? 'Dokončeno' :
                     revize.stav === 'rozpracováno' ? 'Rozpracováno' : revize.stav}
                  </span>
                </div>
                {revize.nazev && (
                  <p className="text-sm text-[var(--text-muted)] mt-1">{revize.nazev}</p>
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
