import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, Input, Select, Modal } from '../components/ui';
import { revizeService } from '../services/database';
import type { Revize, KategorieRevize } from '../types';

export function RevizePage() {
  const [revize, setRevize] = useState<Revize[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStav, setFilterStav] = useState('');
  const [filterKategorie, setFilterKategorie] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Generování čísla revize ve formátu rrrrmmddhhmm
  const generateCisloRevize = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `${yyyy}${mm}${dd}${hh}${min}`;
  };

  const [formData, setFormData] = useState({
    cisloRevize: generateCisloRevize(),
    nazev: '',
    adresa: '',
    objednatel: '',
    kategorieRevize: 'elektro' as KategorieRevize,
    datum: new Date().toISOString().split('T')[0],
    datumPlatnosti: '',
    termin: 36, // výchozí 36 měsíců (3 roky)
    datumVypracovani: '',
    typRevize: 'pravidelná' as const,
    stav: 'rozpracováno' as const,
    poznamka: '',
  });

  useEffect(() => {
    loadRevize();
  }, []);

  const loadRevize = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await revizeService.getAll();
      setRevize(data);
    } catch (err) {
      console.error('Chyba při načítání revizí:', err);
      setError(err instanceof Error ? err.message : 'Chyba při načítání dat');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = await revizeService.create(formData);
    setIsModalOpen(false);
    resetForm();
    navigate(`/revize/${id}`);
  };

  const resetForm = () => {
    setFormData({
      cisloRevize: generateCisloRevize(),
      nazev: '',
      adresa: '',
      objednatel: '',
      kategorieRevize: 'elektro',
      datum: new Date().toISOString().split('T')[0],
      datumPlatnosti: '',
      termin: 36,
      datumVypracovani: '',
      typRevize: 'pravidelná',
      stav: 'rozpracováno',
      poznamka: '',
    });
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Opravdu chcete smazat tuto revizi? Budou smazány i všechny související záznamy.')) {
      await revizeService.delete(id);
      loadRevize();
    }
  };

  const filteredRevize = revize.filter(r => {
    const matchesSearch = r.nazev.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.cisloRevize.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.adresa.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = !filterStav || r.stav === filterStav;
    const matchesKategorie = !filterKategorie || r.kategorieRevize === filterKategorie;
    return matchesSearch && matchesFilter && matchesKategorie;
  });

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-500">Načítání revizí...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        <p className="text-red-600 font-medium mb-2">{error}</p>
        <Button variant="secondary" onClick={() => loadRevize()}>
          Zkusit znovu
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Revize</h1>
          <p className="text-slate-500">Správa revizí elektrických instalací, hromosvodů a strojních zařízení</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          + Nová revize
        </Button>
      </div>

      <Card>
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Hledat revize..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select
            value={filterKategorie}
            onChange={(e) => setFilterKategorie(e.target.value)}
            options={[
              { value: '', label: 'Všechny kategorie' },
              { value: 'elektro', label: '⚡ Elektrické instalace' },
              { value: 'hromosvod', label: '🌩️ Hromosvody' },
              { value: 'stroje', label: '⚙️ Strojní zařízení' },
            ]}
          />
          <Select
            value={filterStav}
            onChange={(e) => setFilterStav(e.target.value)}
            options={[
              { value: '', label: 'Všechny stavy' },
              { value: 'rozpracováno', label: 'Rozpracováno' },
              { value: 'dokončeno', label: 'Dokončeno' },
              { value: 'schváleno', label: 'Schváleno' },
            ]}
          />
        </div>

        {filteredRevize.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Číslo</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Kategorie</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Název</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Adresa</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Datum</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Typ</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Stav</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Akce</th>
                </tr>
              </thead>
              <tbody>
                {filteredRevize.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <Link to={`/revize/${r.id}`} className="text-blue-600 hover:underline">
                        {r.cisloRevize}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        r.kategorieRevize === 'elektro' ? 'bg-blue-100 text-blue-700' :
                        r.kategorieRevize === 'hromosvod' ? 'bg-purple-100 text-purple-700' :
                        r.kategorieRevize === 'stroje' ? 'bg-slate-100 text-slate-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {r.kategorieRevize === 'elektro' ? '⚡ Elektro' :
                         r.kategorieRevize === 'hromosvod' ? '🌩️ Hromosvod' :
                         r.kategorieRevize === 'stroje' ? '⚙️ Stroje' : '⚡ Elektro'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium">{r.nazev}</td>
                    <td className="py-3 px-4 text-slate-600">{r.adresa}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(r.datum).toLocaleDateString('cs-CZ')}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">
                        {r.typRevize}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        r.stav === 'dokončeno' ? 'bg-green-100 text-green-700' :
                        r.stav === 'rozpracováno' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {r.stav}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/revize/${r.id}`)}
                        >
                          Upravit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(r.id!)}
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
        ) : (
          <p className="text-center text-slate-500 py-8">
            {searchTerm || filterStav
              ? 'Žádné revize neodpovídají vašemu hledání.'
              : 'Zatím nemáte žádné revize. Vytvořte první kliknutím na tlačítko výše.'}
          </p>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nová revize"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={handleSubmit}>
              Vytvořit
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Číslo revize"
              value={formData.cisloRevize}
              onChange={(e) => setFormData({ ...formData, cisloRevize: e.target.value })}
              disabled
            />
            <Select
              label="Kategorie revize"
              value={formData.kategorieRevize}
              onChange={(e) => setFormData({ ...formData, kategorieRevize: e.target.value as KategorieRevize })}
              options={[
                { value: 'elektro', label: '⚡ Elektrické instalace' },
                { value: 'hromosvod', label: '🌩️ Hromosvody' },
                { value: 'stroje', label: '⚙️ Strojní zařízení' },
              ]}
            />
          </div>
          <Input
            label="Název"
            value={formData.nazev}
            onChange={(e) => setFormData({ ...formData, nazev: e.target.value })}
            required
          />
          <Input
            label="Adresa"
            value={formData.adresa}
            onChange={(e) => setFormData({ ...formData, adresa: e.target.value })}
            required
          />
          <Input
            label="Objednatel"
            value={formData.objednatel}
            onChange={(e) => setFormData({ ...formData, objednatel: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              label="Datum revize"
              value={formData.datum}
              onChange={(e) => setFormData({ ...formData, datum: e.target.value })}
              required
            />
            <Input
              type="date"
              label="Datum vypracování"
              value={formData.datumVypracovani}
              onChange={(e) => setFormData({ ...formData, datumVypracovani: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Termín platnosti"
              value={String(formData.termin)}
              onChange={(e) => setFormData({ ...formData, termin: parseInt(e.target.value) })}
              options={[
                { value: '6', label: '6 měsíců' },
                { value: '12', label: '1 rok' },
                { value: '24', label: '2 roky' },
                { value: '36', label: '3 roky' },
                { value: '48', label: '4 roky' },
                { value: '60', label: '5 let' },
              ]}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Platnost do</label>
              <p className="text-sm text-slate-500 py-2">
                Vypočítá se automaticky při dokončení revize
              </p>
            </div>
          </div>
          <Select
            label="Typ revize"
            value={formData.typRevize}
            onChange={(e) => setFormData({ ...formData, typRevize: e.target.value as any })}
            options={[
              { value: 'pravidelná', label: 'Pravidelná' },
              { value: 'výchozí', label: 'Výchozí' },
              { value: 'mimořádná', label: 'Mimořádná' },
            ]}
          />
        </form>
      </Modal>
    </div>
  );
}
