import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input, Select, Modal } from '../components/ui';
import { revizeService } from '../services/database';
import { useRevize, useDeleteRevize } from '../hooks/useQueries';
import type { KategorieRevize, Revize } from '../types';

// Definice kategorií revizí - centrální místo pro budoucí rozšíření
const KATEGORIE_REVIZE: { value: KategorieRevize; label: string; popis: string; icon: React.ReactNode }[] = [
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

  // Duplikace revize
  const [isDuplikatModalOpen, setIsDuplikatModalOpen] = useState(false);
  const [duplikatSourceId, setDuplikatSourceId] = useState<number | null>(null);
  const [duplikatSourceCislo, setDuplikatSourceCislo] = useState('');
  const [duplikatCislo, setDuplikatCislo] = useState('');
  const [duplikatTyp, setDuplikatTyp] = useState<'navazujici' | 'duplikat'>('navazujici');
  const [isDuplikating, setIsDuplikating] = useState(false);

  // Historie revizí
  const [historieData, setHistorieData] = useState<Partial<Revize>[]>([]);
  const [historieSourceId, setHistorieSourceId] = useState<number | null>(null);
  const [historieSourceCislo, setHistorieSourceCislo] = useState('');
  const [isHistorieModalOpen, setIsHistorieModalOpen] = useState(false);
  const [isLoadingHistorie, setIsLoadingHistorie] = useState(false);

  // Dropdown menu pro akce (desktop)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // Action sheet pro mobil
  const [actionSheetRevize, setActionSheetRevize] = useState<{ id: number; cisloRevize: string; nazev: string } | null>(null);

  // Potvrzení smazání (náhrada za window.confirm – nefunguje v iOS PWA)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Řazení
  type SortKey = 'cisloRevize' | 'kategorieRevize' | 'nazev' | 'adresa' | 'datum' | 'typRevize' | 'stav';
  const [sortKey, setSortKey] = useState<SortKey>('datum');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span className="ml-1 text-slate-300">↕</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const openHistorieModal = async (revizeId: number, cisloRevize: string) => {
    setHistorieSourceId(revizeId);
    setHistorieSourceCislo(cisloRevize);
    setIsLoadingHistorie(true);
    setIsHistorieModalOpen(true);
    try {
      const data = await revizeService.getHistorie(revizeId);
      setHistorieData(data);
    } catch {
      setHistorieData([]);
    } finally {
      setIsLoadingHistorie(false);
    }
  };

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

  const handleDelete = (id: number) => {
    setConfirmDeleteId(id);
  };

  const executeDelete = () => {
    if (confirmDeleteId !== null) {
      deleteRevize.mutate(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

  const openDuplikatModal = (revizeId: number, cisloRevize: string) => {
    setDuplikatSourceId(revizeId);
    setDuplikatSourceCislo(cisloRevize);
    setDuplikatCislo(generateCisloRevize());
    setDuplikatTyp('navazujici');
    setIsDuplikatModalOpen(true);
  };

  const handleDuplikovat = async () => {
    if (!duplikatSourceId || !duplikatCislo.trim()) return;
    setIsDuplikating(true);
    try {
      const result = await revizeService.duplikovat(duplikatSourceId, duplikatCislo.trim(), duplikatTyp);
      setIsDuplikatModalOpen(false);
      navigate(`/revize/${result.id}`);
    } catch (err) {
      alert('Chyba při duplikaci: ' + (err instanceof Error ? err.message : 'Neznámá chyba'));
    } finally {
      setIsDuplikating(false);
    }
  };

  const filteredRevize = revize.filter(r => {
    const matchesSearch = r.nazev.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.cisloRevize.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.adresa.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = !filterStav || r.stav === filterStav;
    const matchesKategorie = !filterKategorie || r.kategorieRevize === filterKategorie;
    return matchesSearch && matchesFilter && matchesKategorie;
  }).sort((a, b) => {
    const valA = (a[sortKey] ?? '').toString().toLowerCase();
    const valB = (b[sortKey] ?? '').toString().toLowerCase();
    const cmp = valA.localeCompare(valB, 'cs');
    return sortDir === 'asc' ? cmp : -cmp;
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
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-200">Revize</h1>
          <p className="text-xs text-slate-400">Správa revizí elektrických instalací, hromosvodů a strojních zařízení</p>
        </div>
        <Button onClick={openModal}>
          <span className="sm:hidden text-lg leading-none">+</span>
          <span className="hidden sm:inline">+ Nová revize</span>
        </Button>
      </div>

      <div className="bg-white/[0.03] rounded-xl border border-white/[0.07] flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="px-6 pt-5 pb-3 flex-shrink-0">
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:gap-4">
          <div className="w-full md:flex-1 md:min-w-[200px]">
            <Input
              placeholder="Hledat revize..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 md:contents">
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
          </div>
        </div>

        {filteredRevize.length > 0 ? (
          <>
          {/* Mobilní seznam karet */}
          <div className="md:hidden px-4 pb-4 flex-1 min-h-0 overflow-auto space-y-2">
            {filteredRevize.map((r) => (
              <div key={r.id} className="bg-white/[0.03] rounded-lg border border-white/[0.07] p-3">
                <Link to={`/revize/${r.id}`} className="block">
                  <p className="font-semibold text-slate-200 text-sm leading-snug">{r.nazev}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{r.adresa}</p>
                </Link>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/[0.06] text-slate-400">
                      {r.kategorieRevize === 'elektro' ? 'Elektro' :
                       r.kategorieRevize === 'hromosvod' ? 'Hromosvod' :
                       r.kategorieRevize === 'stroje' ? 'Stroje' : r.kategorieRevize}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      r.stav === 'dokončeno' ? 'bg-emerald-500/[0.15] text-emerald-300' :
                      r.stav === 'rozpracováno' ? 'bg-amber-500/[0.15] text-amber-300' :
                      'bg-white/[0.06] text-slate-400'
                    }`}>{r.stav}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">{new Date(r.datum).toLocaleDateString('cs-CZ')}</span>
                    <button
                      onClick={() => setActionSheetRevize({ id: r.id!, cisloRevize: r.cisloRevize, nazev: r.nazev })}
                      className="p-1 rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">{r.cisloRevize}</p>
              </div>
            ))}
          </div>
          {/* Desktopová tabulka */}
          <div className="hidden md:block px-6 pb-4 flex-1 min-h-0 overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-[#0a0f1e] z-10">
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:text-slate-200" onClick={() => toggleSort('cisloRevize')}>Číslo<SortIcon col="cisloRevize" /></th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:text-slate-200" onClick={() => toggleSort('kategorieRevize')}>Kategorie<SortIcon col="kategorieRevize" /></th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:text-slate-200" onClick={() => toggleSort('nazev')}>Název<SortIcon col="nazev" /></th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:text-slate-200" onClick={() => toggleSort('adresa')}>Adresa<SortIcon col="adresa" /></th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:text-slate-200" onClick={() => toggleSort('datum')}>Datum<SortIcon col="datum" /></th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:text-slate-200" onClick={() => toggleSort('typRevize')}>Typ<SortIcon col="typRevize" /></th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:text-slate-200" onClick={() => toggleSort('stav')}>Stav<SortIcon col="stav" /></th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-slate-400 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody>
                {filteredRevize.map((r) => (
                  <tr key={r.id} className="border-b border-white/[0.05] hover:bg-white/[0.04]">
                    <td className="py-2 px-3">
                      <Link to={`/revize/${r.id}`} className="text-xs text-slate-300 hover:text-slate-100 font-medium hover:underline">
                        {r.cisloRevize}
                      </Link>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        r.kategorieRevize === 'elektro' ? 'bg-white/[0.06] text-slate-400' :
                        r.kategorieRevize === 'hromosvod' ? 'bg-white/[0.06] text-slate-400' :
                        r.kategorieRevize === 'stroje' ? 'bg-white/[0.06] text-slate-400' :
                        'bg-white/[0.06] text-slate-400'
                      }`}>
                        {r.kategorieRevize === 'elektro' ? 'Elektro' :
                         r.kategorieRevize === 'hromosvod' ? 'Hromosvod' :
                         r.kategorieRevize === 'stroje' ? 'Stroje' : 'Elektro'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs font-medium text-slate-300">{r.nazev}</td>
                    <td className="py-2 px-3 text-xs text-slate-400">{r.adresa}</td>
                    <td className="py-2 px-3 text-xs text-slate-400">
                      {new Date(r.datum).toLocaleDateString('cs-CZ')}
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/[0.06] text-slate-400">
                        {r.typRevize}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        r.stav === 'dokončeno' ? 'bg-emerald-500/[0.15] text-emerald-300' :
                        r.stav === 'rozpracováno' ? 'bg-amber-500/[0.15] text-amber-300' :
                        'bg-white/[0.06] text-slate-400'
                      }`}>
                        {r.stav}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="relative" ref={openMenuId === r.id ? menuRef : undefined}>
                        <button
                          onClick={() => setOpenMenuId(openMenuId === r.id ? null : r.id!)}
                          className="p-1 rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-slate-300 transition-colors"
                          title="Akce"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
                        {openMenuId === r.id && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-[#0e1629] rounded-lg shadow-lg border border-white/[0.08] py-1 z-50">
                            <button
                              onClick={() => { setOpenMenuId(null); navigate(`/revize/${r.id}`); }}
                              className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-white/[0.06] flex items-center gap-2"
                            >
                              <span className="text-xs">✏️</span> Upravit
                            </button>
                            <button
                              onClick={() => { setOpenMenuId(null); openDuplikatModal(r.id!, r.cisloRevize); }}
                              className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-white/[0.06] flex items-center gap-2"
                            >
                              <span className="text-xs">📋</span> Kopírovat revizi
                            </button>
                            <button
                              onClick={() => { setOpenMenuId(null); openHistorieModal(r.id!, r.cisloRevize); }}
                              className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-white/[0.06] flex items-center gap-2"
                            >
                              <span className="text-xs">🕐</span> Historie
                            </button>
                            <div className="border-t border-white/[0.06] my-1"></div>
                            <button
                              onClick={() => { setOpenMenuId(null); handleDelete(r.id!); }}
                              className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/[0.08] flex items-center gap-2"
                            >
                              <span className="text-xs">🗑️</span> Smazat
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        ) : (
          <p className="text-center text-slate-500 py-8 px-6">
            {searchTerm || filterStav
              ? 'Žádné revize neodpovídají vašemu hledání.'
              : 'Zatím nemáte žádné revize. Vytvořte první kliknutím na tlačítko výše.'}
          </p>
        )}
      </div>

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
                  className="flex items-center gap-4 p-4 rounded-lg border-2 border-white/[0.08] hover:border-white/[0.20] hover:bg-white/[0.04] transition-all text-left group"
                >
                  <div className="flex-shrink-0 text-slate-500 group-hover:text-slate-200 transition-colors">
                    {kat.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200 group-hover:text-white">{kat.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{kat.popis}</p>
                  </div>
                  <div className="flex-shrink-0 ml-auto text-slate-600 group-hover:text-slate-300">
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
            <div className="flex items-center gap-3 px-3 py-2 bg-white/[0.05] rounded-lg border border-white/[0.08]">
              <div className="text-slate-400">
                {KATEGORIE_REVIZE.find(k => k.value === formData.kategorieRevize)?.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">
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
                <label className="block text-sm font-medium text-slate-400 mb-1">Platnost do</label>
                <p className="text-sm text-slate-500 py-2">
                  Vypočítá se automaticky při dokončení revize
                </p>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal pro historii revizí */}
      <Modal
        isOpen={isHistorieModalOpen}
        onClose={() => setIsHistorieModalOpen(false)}
        title={`🕐 Historie revizí — ${historieSourceCislo}`}
        footer={
          <Button variant="secondary" onClick={() => setIsHistorieModalOpen(false)}>Zavřít</Button>
        }
      >
        {isLoadingHistorie ? (
          <div className="text-center py-8 text-slate-500">
            <div className="animate-spin inline-block w-6 h-6 border-2 border-slate-300 border-t-blue-500 rounded-full mb-2"></div>
            <p className="text-sm">Načítám historii…</p>
          </div>
        ) : historieData.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <div className="text-3xl mb-2">📭</div>
            <p className="text-sm">Tato revize nemá žádné navazující ani předchozí revize.</p>
            <p className="text-xs mt-1 text-slate-400">Použijte tlačítko 📋 s typem „Navazující" pro vytvoření propojené revize.</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-200"></div>
            <div className="space-y-3">
              {historieData.map((h, idx) => {
                const isCurrent = h.id === historieSourceId;
                return (
                  <div key={h.id} className={`flex items-start gap-3 pl-1 ${isCurrent ? 'opacity-100' : 'opacity-70'}`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-[10px] z-10 ${
                      isCurrent
                        ? 'bg-blue-500 border-blue-600 text-white'
                        : h.stav === 'dokončeno' || h.stav === 'schváleno'
                          ? 'bg-emerald-100 border-emerald-400 text-emerald-600'
                          : 'bg-white border-slate-300 text-slate-500'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className={`flex-1 rounded border px-3 py-2 text-sm ${isCurrent ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-800">
                          {h.cisloRevize}
                          {isCurrent && <span className="ml-2 text-xs text-blue-600">(aktuální)</span>}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          h.stav === 'dokončeno' ? 'bg-emerald-50 text-emerald-600' :
                          h.stav === 'rozpracováno' ? 'bg-amber-50 text-amber-600' :
                          'bg-slate-100 text-slate-600'
                        }`}>{h.stav}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {h.datum} · {h.typRevize || '–'} · {h.vysledek || 'nevyplněno'}
                      </div>
                      {!isCurrent && h.id && (
                        <button
                          onClick={() => { setIsHistorieModalOpen(false); navigate(`/revize/${h.id}`); }}
                          className="text-xs text-blue-500 hover:underline mt-1"
                        >
                          Otevřít →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal pro potvrzení smazání */}
      <Modal
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        title="Smazat revizi"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDeleteId(null)}>Zrušit</Button>
            <Button variant="danger" onClick={executeDelete}>Smazat</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Opravdu chcete smazat tuto revizi? Budou smazány i všechny související záznamy.
        </p>
      </Modal>

      {/* Action sheet pro mobil – akce revize */}
      {actionSheetRevize && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setActionSheetRevize(null)} />
          <div className="relative bg-white rounded-t-2xl shadow-xl pb-safe">
            <div className="px-4 pt-4 pb-2 border-b border-slate-100">
              <p className="font-semibold text-slate-800 text-sm truncate">{actionSheetRevize.nazev}</p>
              <p className="text-xs text-slate-400">{actionSheetRevize.cisloRevize}</p>
            </div>
            <div className="py-1">
              <button
                onClick={() => { setActionSheetRevize(null); navigate(`/revize/${actionSheetRevize.id}`); }}
                className="w-full text-left px-4 py-3.5 text-sm text-slate-700 active:bg-slate-50 flex items-center gap-3"
              >
                <span className="text-base">✏️</span> Upravit
              </button>
              <button
                onClick={() => { const a = actionSheetRevize; setActionSheetRevize(null); openDuplikatModal(a.id, a.cisloRevize); }}
                className="w-full text-left px-4 py-3.5 text-sm text-slate-700 active:bg-slate-50 flex items-center gap-3"
              >
                <span className="text-base">📋</span> Kopírovat revizi
              </button>
              <button
                onClick={() => { const a = actionSheetRevize; setActionSheetRevize(null); openHistorieModal(a.id, a.cisloRevize); }}
                className="w-full text-left px-4 py-3.5 text-sm text-slate-700 active:bg-slate-50 flex items-center gap-3"
              >
                <span className="text-base">🕐</span> Historie
              </button>
              <div className="border-t border-slate-100 mx-4 my-1" />
              <button
                onClick={() => { const a = actionSheetRevize; setActionSheetRevize(null); handleDelete(a.id); }}
                className="w-full text-left px-4 py-3.5 text-sm text-red-600 active:bg-red-50 flex items-center gap-3"
              >
                <span className="text-base">🗑️</span> Smazat
              </button>
            </div>
            <div className="px-4 pb-4 pt-1">
              <button
                onClick={() => setActionSheetRevize(null)}
                className="w-full py-3 rounded-xl bg-slate-100 text-sm font-medium text-slate-700 active:bg-slate-200"
              >
                Zrušit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pro duplikaci revize */}
      <Modal
        isOpen={isDuplikatModalOpen}
        onClose={() => setIsDuplikatModalOpen(false)}
        title="Kopie revize"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsDuplikatModalOpen(false)}>Zrušit</Button>
            <Button onClick={handleDuplikovat} disabled={isDuplikating || !duplikatCislo.trim()}>
              {isDuplikating ? 'Vytvářím...' : duplikatTyp === 'navazujici' ? '🔗 Vytvořit navazující' : '📋 Vytvořit duplikát'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Kopie revize <strong>{duplikatSourceCislo}</strong>. Budou zkopírovány všechny údaje (rozvaděče, okruhy, místnosti, přístroje), ale ne závady.
          </p>

          {/* Výběr typu */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Typ kopie</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDuplikatTyp('navazujici')}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  duplikatTyp === 'navazujici'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-400'
                }`}
              >
                <p className="font-semibold text-sm">🔗 Navazující revize</p>
                <p className="text-xs text-slate-500 mt-1">Propojena s historií původní revize. Pro periodické (následné) revize stejného objektu.</p>
              </button>
              <button
                type="button"
                onClick={() => setDuplikatTyp('duplikat')}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  duplikatTyp === 'duplikat'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-400'
                }`}
              >
                <p className="font-semibold text-sm">📋 Nezávislý duplikát</p>
                <p className="text-xs text-slate-500 mt-1">Samostatná kopie bez vazby. Pro jiný objekt se stejným vybavením.</p>
              </button>
            </div>
          </div>

          <Input
            label="Číslo nové revizní zprávy"
            value={duplikatCislo}
            onChange={(e) => setDuplikatCislo(e.target.value)}
            placeholder="např. 202603281200"
          />
        </div>
      </Modal>
    </div>
  );
}
