import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, Input, Select, Modal } from '../components/ui';
import { revizeService } from '../services/database';
import { useRevize, useDeleteRevize } from '../hooks/useQueries';
import type { KategorieRevize } from '../types';

// Definice kategorií revizí - centrální místo pro budoucí rozšíření
const KATEGORIE_REVIZE: { value: KategorieRevize; label: string; popis: string; icon: JSX.Element }[] = [
  {
    value: 'elektro',
    label: 'Elektrické instalace',
    popis: 'Revize elektrických rozvodů, rozvaděčů a instalací dle ČSN 33 1500, ČSN 33 2000-6',
    icon: (
      <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    value: 'hromosvod',
    label: 'Hromosvody',
    popis: 'Revize hromosvodů a systémů ochrany před bleskem dle ČSN EN 62305',
    icon: (
      <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    value: 'stroje',
    label: 'Strojní zařízení',
    popis: 'Revize strojních zařízení, pohonů a mechanických systémů',
    icon: (
      <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function RevizePage() {
  const { data: revize = [], isLoading: loading, error: queryError, refetch } = useRevize();
  const error = queryError?.message ?? null;
  const deleteRevize = useDeleteRevize();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2>(1); // Krok 1 = výběr kategorie, Krok 2 = formulář
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStav, setFilterStav] = useState('');
  const [filterKategorie, setFilterKategorie] = useState('');
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

  const openModal = () => {
    setModalStep(1);
    setIsModalOpen(true);
  };

  const selectKategorie = (kategorie: KategorieRevize) => {
    setFormData({ ...formData, kategorieRevize: kategorie });
    setModalStep(2);
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
    setModalStep(1);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Opravdu chcete smazat tuto revizi? Budou smazány i všechny související záznamy.')) {
      deleteRevize.mutate(id);
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
        <div className="animate-spin h-6 w-6 border-2 border-slate-400 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-sm text-slate-400">Načítání revizí...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 text-sm font-medium mb-2">{error}</p>
        <Button variant="secondary" onClick={() => refetch()}>
          Zkusit znovu
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Revize</h1>
          <p className="text-xs text-slate-400">Správa revizí elektrických instalací, hromosvodů a strojních zařízení</p>
        </div>
        <Button onClick={openModal}>
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
              { value: 'elektro', label: 'Elektrické instalace' },
              { value: 'hromosvod', label: 'Hromosvody' },
              { value: 'stroje', label: 'Strojní zařízení' },
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
                      <Link to={`/revize/${r.id}`} className="text-slate-700 hover:text-slate-900 font-medium hover:underline">
                        {r.cisloRevize}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        r.kategorieRevize === 'elektro' ? 'bg-slate-100 text-slate-700' :
                        r.kategorieRevize === 'hromosvod' ? 'bg-slate-100 text-slate-700' :
                        r.kategorieRevize === 'stroje' ? 'bg-slate-100 text-slate-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {r.kategorieRevize === 'elektro' ? 'Elektro' :
                         r.kategorieRevize === 'hromosvod' ? 'Hromosvod' :
                         r.kategorieRevize === 'stroje' ? 'Stroje' : 'Elektro'}
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
                        r.stav === 'dokončeno' ? 'bg-emerald-50 text-emerald-600' :
                        r.stav === 'rozpracováno' ? 'bg-amber-50 text-amber-600' :
                        'bg-slate-100 text-slate-600'
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
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={modalStep === 1 ? 'Nová revize — Vyberte kategorii' : `Nová revize — ${KATEGORIE_REVIZE.find(k => k.value === formData.kategorieRevize)?.label}`}
        footer={
          modalStep === 2 ? (
            <>
              <Button variant="secondary" onClick={() => setModalStep(1)}>
                Zpět
              </Button>
              <Button variant="secondary" onClick={() => { setIsModalOpen(false); resetForm(); }}>
                Zrušit
              </Button>
              <Button onClick={handleSubmit}>
                Vytvořit
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => { setIsModalOpen(false); resetForm(); }}>
              Zrušit
            </Button>
          )
        }
      >
        {modalStep === 1 ? (
          /* ═══ KROK 1: Výběr kategorie ═══ */
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Zvolte typ revize. Kategorie určuje strukturu formuláře i výsledné zprávy a nelze ji později změnit.
            </p>
            <div className="grid grid-cols-1 gap-3">
              {KATEGORIE_REVIZE.map((kat) => (
                <button
                  key={kat.value}
                  type="button"
                  onClick={() => selectKategorie(kat.value)}
                  className="flex items-center gap-4 p-4 rounded-lg border-2 border-slate-200 hover:border-slate-500 hover:bg-slate-50 transition-all text-left group"
                >
                  <div className="flex-shrink-0 text-slate-400 group-hover:text-slate-700 transition-colors">
                    {kat.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 group-hover:text-slate-900">{kat.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{kat.popis}</p>
                  </div>
                  <div className="flex-shrink-0 ml-auto text-slate-300 group-hover:text-slate-500">
                    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ═══ KROK 2: Formulář ═══ */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Zobrazení vybrané kategorie */}
            <div className="flex items-center gap-3 px-3 py-2 bg-slate-100 rounded-lg border border-slate-200">
              <div className="text-slate-500">
                {KATEGORIE_REVIZE.find(k => k.value === formData.kategorieRevize)?.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">
                  {KATEGORIE_REVIZE.find(k => k.value === formData.kategorieRevize)?.label}
                </p>
                <p className="text-xs text-slate-400">Kategorie revize</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Číslo revize"
                value={formData.cisloRevize}
                onChange={(e) => setFormData({ ...formData, cisloRevize: e.target.value })}
                disabled
              />
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
          </form>
        )}
      </Modal>
    </div>
  );
}
