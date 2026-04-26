import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const openMenuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (openMenuId === null) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (openMenuRef.current && !openMenuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);
  const openRevize = revize.find(r => r.id === openMenuId) ?? null;
  // Action sheet pro mobil
  const [actionSheetRevize, setActionSheetRevize] = useState<{ id: number; cisloRevize: string; nazev: string } | null>(null);

  // Potvrzení smazání (náhrada za window.confirm – nefunguje v iOS PWA)
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; cisloRevize: string } | null>(null);
  const [confirmDeleteInput, setConfirmDeleteInput] = useState('');

  // Paginace
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState(0);

  // Režim zobrazení desktop (tabulka / karty)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() =>
    (localStorage.getItem('revize-view') as 'table' | 'grid') || 'table'
  );
  const setView = (mode: 'table' | 'grid') => {
    setViewMode(mode);
    localStorage.setItem('revize-view', mode);
  };

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
    if (sortKey !== col) return <span className="ml-1 text-[var(--text)]">↕</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  // Reset na první stránku při změně filtrů nebo řazení
  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm, filterStav, filterKategorie, sortKey, sortDir]);

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

  const handleDelete = (id: number, cisloRevize: string) => {
    setConfirmDelete({ id, cisloRevize });
    setConfirmDeleteInput('');
  };

  const executeDelete = () => {
    if (confirmDelete !== null) {
      deleteRevize.mutate(confirmDelete.id);
      setConfirmDelete(null);
      setConfirmDeleteInput('');
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

  const totalCount = filteredRevize.length;
  const totalPages = pageSize === -1 ? 1 : Math.ceil(totalCount / pageSize);
  const paginatedRevize = pageSize === -1
    ? filteredRevize
    : filteredRevize.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-slate-400 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-sm text-[var(--text-secondary)]">Načítání revizí...</p>
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
          <h1 className="text-lg font-bold text-[var(--text)]">Revize</h1>
          <p className="text-xs text-[var(--text-secondary)]">Správa revizí elektrických instalací, hromosvodů a strojních zařízení</p>
        </div>
        <Button onClick={openModal}>
          <span className="sm:hidden text-lg leading-none">+</span>
          <span className="hidden sm:inline">+ Nová revize</span>
        </Button>
      </div>

      <div className="bg-[var(--glass-bg)] backdrop-blur-xl rounded-xl border border-[var(--glass-border)] shadow-[var(--shadow-elevated)] flex-1 min-h-0 flex flex-col">
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
          {/* Přepínač tabulka / karty — jen desktop */}
          <div className="hidden md:flex items-center self-center gap-0.5 border border-[var(--border-medium)] rounded-lg p-0.5 flex-shrink-0">
            <button
              onClick={() => setView('table')}
              title="Tabulka"
              className={`p-1.5 rounded transition-colors ${viewMode === 'table' ? 'bg-[var(--bg-hover)] text-[var(--text)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 4a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2H5zm0 2h10v2H5V6zm0 4h4v4H5v-4zm6 0h4v4h-4v-4z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={() => setView('grid')}
              title="Karty"
              className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-[var(--bg-hover)] text-[var(--text)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
          </div>
        </div>

        {filteredRevize.length > 0 ? (
          <>
          {/* Mobilní seznam karet */}
          <div className="md:hidden px-4 pb-4 flex-1 min-h-0 overflow-auto space-y-2">
            {paginatedRevize.map((r) => (
              <div key={r.id} className="bg-[var(--glass-bg)] backdrop-blur-sm rounded-lg border border-[var(--glass-border)] p-3">
                <Link to={`/revize/${r.id}`} className="block">
                  <p className="font-semibold text-[var(--text)] text-sm leading-snug">{r.nazev}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{r.adresa}</p>
                </Link>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)]">
                      {r.kategorieRevize === 'elektro' ? 'Elektro' :
                       r.kategorieRevize === 'hromosvod' ? 'Hromosvod' :
                       r.kategorieRevize === 'stroje' ? 'Stroje' : r.kategorieRevize}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      r.stav === 'dokončeno' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
                      r.stav === 'rozpracováno' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' :
                      'bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                    }`}>{r.stav}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-[var(--text-secondary)]">{new Date(r.datum).toLocaleDateString('cs-CZ')}</span>
                    <button
                      onClick={() => setActionSheetRevize({ id: r.id!, cisloRevize: r.cisloRevize, nazev: r.nazev })}
                      className="p-1 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => navigate(`/revize/${r.id}/nahled`)}
                      className="p-1 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                      title="Náhled tisku"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1.5">{r.cisloRevize}</p>
              </div>
            ))}
          </div>
          {/* Desktopová tabulka */}
          <div className={`${viewMode === 'table' ? 'hidden md:block' : 'hidden'} px-6 pb-4 flex-1 min-h-0 overflow-auto`}>
            <table className="w-full">
              <thead className="sticky top-0 bg-[var(--glass-bg-strong)] backdrop-blur-md z-10">
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider cursor-pointer select-none hover:text-[var(--text)]" onClick={() => toggleSort('cisloRevize')}>Číslo<SortIcon col="cisloRevize" /></th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider cursor-pointer select-none hover:text-[var(--text)]" onClick={() => toggleSort('kategorieRevize')}>Kategorie<SortIcon col="kategorieRevize" /></th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider cursor-pointer select-none hover:text-[var(--text)]" onClick={() => toggleSort('nazev')}>Název<SortIcon col="nazev" /></th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider cursor-pointer select-none hover:text-[var(--text)]" onClick={() => toggleSort('adresa')}>Adresa<SortIcon col="adresa" /></th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider cursor-pointer select-none hover:text-[var(--text)]" onClick={() => toggleSort('datum')}>Datum<SortIcon col="datum" /></th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider cursor-pointer select-none hover:text-[var(--text)]" onClick={() => toggleSort('typRevize')}>Typ<SortIcon col="typRevize" /></th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider cursor-pointer select-none hover:text-[var(--text)]" onClick={() => toggleSort('stav')}>Stav<SortIcon col="stav" /></th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedRevize.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--border-subtle)] border-l-2 border-l-transparent hover:border-l-[#759d2f] hover:bg-[rgba(117,157,47,0.07)] group">
                    <td className="py-2 px-3">
                      <Link to={`/revize/${r.id}`} className="text-xs text-[var(--text)] group-hover:text-[#759d2f] font-medium hover:underline transition-colors">
                        {r.cisloRevize}
                      </Link>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.kategorieRevize === 'elektro' ? 'bg-[var(--bg-hover)] text-[var(--text-secondary)]' :
                        r.kategorieRevize === 'hromosvod' ? 'bg-[var(--bg-hover)] text-[var(--text-secondary)]' :
                        r.kategorieRevize === 'stroje' ? 'bg-[var(--bg-hover)] text-[var(--text-secondary)]' :
                        'bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                      }`}>
                        {r.kategorieRevize === 'elektro' ? 'Elektro' :
                         r.kategorieRevize === 'hromosvod' ? 'Hromosvod' :
                         r.kategorieRevize === 'stroje' ? 'Stroje' : 'Elektro'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs font-medium text-[var(--text)]">{r.nazev}</td>
                    <td className="py-2 px-3 text-xs text-[var(--text-secondary)]">{r.adresa}</td>
                    <td className="py-2 px-3 text-xs text-[var(--text-secondary)]">
                      {new Date(r.datum).toLocaleDateString('cs-CZ')}
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)]">
                        {r.typRevize}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.stav === 'dokončeno' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
                        r.stav === 'rozpracováno' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' :
                        'bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                      }`}>
                        {r.stav}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="relative" ref={openMenuId === r.id ? openMenuRef : undefined}>
                        <button
                          onClick={(e) => {
                            if (openMenuId === r.id) { setOpenMenuId(null); return; }
                            const rect = e.currentTarget.getBoundingClientRect();
                            setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                            setOpenMenuId(r.id!);
                          }}
                          className="p-1 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                          title="Akce"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
                        {openMenuId === r.id && null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Desktopový grid karet */}
          <div className={`${viewMode === 'grid' ? 'hidden md:block' : 'hidden'} px-6 pb-4 flex-1 min-h-0 overflow-auto`}>
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 py-2">
              {paginatedRevize.map((r) => (
                <div key={r.id} className="bg-[var(--glass-bg)] backdrop-blur-sm rounded-xl border border-[var(--glass-border)] flex flex-col relative hover:border-[rgba(146,196,59,0.35)] transition-all duration-200 group hover:shadow-[0_4px_20px_rgba(146,196,59,0.12)]">
                  <Link to={`/revize/${r.id}`} className="flex-1 p-4 block">
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#759d2f] opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)]">
                          {r.kategorieRevize === 'elektro' ? 'Elektro' :
                           r.kategorieRevize === 'hromosvod' ? 'Hromosvod' : 'Stroje'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.stav === 'dokončeno' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
                          r.stav === 'rozpracováno' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' :
                          'bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                        }`}>{r.stav}</span>
                      </div>
                    </div>
                    <p className="font-semibold text-[var(--text)] text-sm leading-snug mb-1">{r.nazev}</p>
                    <p className="text-xs text-[var(--text-secondary)] mb-3">{r.adresa}</p>
                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                      <span>{r.cisloRevize}</span>
                      <span>{new Date(r.datum).toLocaleDateString('cs-CZ')}</span>
                    </div>
                  </Link>
                  <div className="border-t border-[var(--border-subtle)] px-4 py-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-[var(--text-muted)] truncate">{r.typRevize}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => navigate(`/revize/${r.id}/nahled`)}
                        className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                        title="Náhled tisku"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                        <div className="relative" ref={openMenuId === r.id ? openMenuRef : undefined}>
                        <button
                          onClick={(e) => {
                            if (openMenuId === r.id) { setOpenMenuId(null); return; }
                            const rect = e.currentTarget.getBoundingClientRect();
                            setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                            setOpenMenuId(r.id!);
                          }}
                          className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                          title="Akce"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
                        {openMenuId === r.id && null}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Pagination footer */}
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-2.5 border-t border-[var(--border)] text-xs text-[var(--text-secondary)]">
            <span>
              {totalCount === 0 ? '0 záznamů' : pageSize === -1
                ? `${totalCount} záznamů`
                : `${Math.min(currentPage * pageSize + 1, totalCount)}–${Math.min((currentPage + 1) * pageSize, totalCount)} z ${totalCount}`}
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="hidden sm:inline">Řádků:</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(0); }}
                  className="bg-[var(--bg-input)] border border-[var(--border-medium)] rounded px-2 py-0.5 text-xs text-[var(--text)] focus:outline-none focus:border-[var(--checkbox-border)]"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={-1}>Vše</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="px-2 py-0.5 rounded hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ‹ Předchozí
                </button>
                <span className="px-2 text-[var(--text-muted)]">{totalPages > 0 ? `${currentPage + 1} / ${totalPages}` : '—'}</span>
                <button
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="px-2 py-0.5 rounded hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Další ›
                </button>
              </div>
            </div>
          </div>
          </>
        ) : (
          <p className="text-center text-[var(--text-muted)] py-8 px-6">
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
            <p className="text-sm text-[var(--text-muted)]">
              Zvolte typ revize. Kategorie určuje strukturu formuláře i výsledné zprávy a nelze ji později změnit.
            </p>
            <div className="grid grid-cols-1 gap-3">
              {KATEGORIE_REVIZE.map((kat) => (
                <button
                  key={kat.value}
                  type="button"
                  onClick={() => selectKategorie(kat.value)}
                  className="flex items-center gap-4 p-4 rounded-lg border-2 border-[var(--border-medium)] hover:border-[var(--checkbox-border)] hover:bg-[var(--bg-input)] transition-all text-left group"
                >
                  <div className="flex-shrink-0 text-[var(--text-muted)] group-hover:text-[var(--text)] transition-colors">
                    {kat.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--text)] group-hover:text-white">{kat.label}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{kat.popis}</p>
                  </div>
                  <div className="flex-shrink-0 ml-auto text-slate-600 group-hover:text-[var(--text)]">
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
            <div className="flex items-center gap-3 px-3 py-2 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-medium)]">
              <div className="text-[var(--text-secondary)]">
                {KATEGORIE_REVIZE.find(k => k.value === formData.kategorieRevize)?.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text)]">
                  {KATEGORIE_REVIZE.find(k => k.value === formData.kategorieRevize)?.label}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">Kategorie revize</p>
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
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Platnost do</label>
                <p className="text-sm text-[var(--text-muted)] py-2">
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
          <div className="text-center py-8 text-[var(--text-muted)]">
            <div className="animate-spin inline-block w-6 h-6 border-2 border-slate-300 border-t-blue-500 rounded-full mb-2"></div>
            <p className="text-sm">Načítám historii…</p>
          </div>
        ) : historieData.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-muted)]">
            <div className="text-3xl mb-2">📭</div>
            <p className="text-sm">Tato revize nemá žádné navazující ani předchozí revize.</p>
            <p className="text-xs mt-1 text-[var(--text-secondary)]">Použijte tlačítko 📋 s typem „Navazující" pro vytvoření propojené revize.</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-[var(--border-medium)]"></div>
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
                          : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)]'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className={`flex-1 rounded border px-3 py-2 text-sm ${isCurrent ? 'bg-blue-50 border-blue-200' : 'bg-[var(--surface)] border-[var(--border-medium)]'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[var(--text)]">
                          {h.cisloRevize}
                          {isCurrent && <span className="ml-2 text-xs text-blue-600">(aktuální)</span>}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          h.stav === 'dokončeno' ? 'bg-emerald-50 text-emerald-600' :
                          h.stav === 'rozpracováno' ? 'bg-amber-50 text-amber-600' :
                          'bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                        }`}>{h.stav}</span>
                      </div>
                      <div className="text-xs text-[var(--text-muted)] mt-0.5">
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
        isOpen={confirmDelete !== null}
        onClose={() => { setConfirmDelete(null); setConfirmDeleteInput(''); }}
        title="Smazat revizi"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setConfirmDelete(null); setConfirmDeleteInput(''); }}>Zrušit</Button>
            <Button variant="danger" onClick={executeDelete} disabled={confirmDeleteInput !== confirmDelete?.cisloRevize}>Smazat</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">
            Tato akce je nevratná. Budou smazány i všechny související záznamy (rozvaděče, místnosti, závady, přístroje).
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            Pro potvrzení zadejte číslo revize: <span className="font-mono font-semibold text-[var(--text)]">{confirmDelete?.cisloRevize}</span>
          </p>
          <input
            type="text"
            value={confirmDeleteInput}
            onChange={e => setConfirmDeleteInput(e.target.value)}
            placeholder={confirmDelete?.cisloRevize ?? ''}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-input)] text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500"
            autoComplete="off"
            autoFocus
          />
        </div>
      </Modal>

      {/* Action sheet pro mobil – akce revize */}
      {actionSheetRevize && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setActionSheetRevize(null)} />
          <div className="relative bg-[var(--surface)] rounded-t-2xl shadow-xl pb-safe">
            <div className="px-4 pt-4 pb-2 border-b border-[var(--border-subtle)]">
              <p className="font-semibold text-[var(--text)] text-sm truncate">{actionSheetRevize.nazev}</p>
              <p className="text-xs text-[var(--text-secondary)]">{actionSheetRevize.cisloRevize}</p>
            </div>
            <div className="py-1">
              <button
                onClick={() => { setActionSheetRevize(null); navigate(`/revize/${actionSheetRevize.id}`); }}
                className="w-full text-left px-4 py-3.5 text-sm text-[var(--text)] active:bg-[var(--bg-hover)] flex items-center gap-3"
              >
                <span className="text-base">✏️</span> Upravit
              </button>
              <button
                onClick={() => { const a = actionSheetRevize; setActionSheetRevize(null); openDuplikatModal(a.id, a.cisloRevize); }}
                className="w-full text-left px-4 py-3.5 text-sm text-[var(--text)] active:bg-[var(--bg-hover)] flex items-center gap-3"
              >
                <span className="text-base">📋</span> Kopírovat revizi
              </button>
              <button
                onClick={() => { const a = actionSheetRevize; setActionSheetRevize(null); openHistorieModal(a.id, a.cisloRevize); }}
                className="w-full text-left px-4 py-3.5 text-sm text-[var(--text)] active:bg-[var(--bg-hover)] flex items-center gap-3"
              >
                <span className="text-base">🕐</span> Historie
              </button>
              <div className="border-t border-[var(--border-subtle)] mx-4 my-1" />
              <button
                onClick={() => { const a = actionSheetRevize; setActionSheetRevize(null); handleDelete(a.id, a.cisloRevize); }}
                className="w-full text-left px-4 py-3.5 text-sm text-red-600 active:bg-red-50 flex items-center gap-3"
              >
                <span className="text-base">🗑️</span> Smazat
              </button>
            </div>
            <div className="px-4 pb-4 pt-1">
              <button
                onClick={() => setActionSheetRevize(null)}
                className="w-full py-3 rounded-xl bg-[var(--bg-surface)] text-sm font-medium text-[var(--text)] active:bg-[var(--bg-hover)]"
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
          <p className="text-sm text-[var(--text-secondary)]">
            Kopie revize <strong>{duplikatSourceCislo}</strong>. Budou zkopírovány všechny údaje (rozvaděče, okruhy, místnosti, přístroje), ale ne závady.
          </p>

          {/* Výběr typu */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Typ kopie</label>
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
                <p className="text-xs text-[var(--text-muted)] mt-1">Propojena s historií původní revize. Pro periodické (následné) revize stejného objektu.</p>
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
                <p className="text-xs text-[var(--text-muted)] mt-1">Samostatná kopie bez vazby. Pro jiný objekt se stejným vybavením.</p>
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

      {/* Dropdown portal – mimo všechny overflow/backdrop-filter kontejnery */}
      {openMenuId !== null && openRevize && createPortal(
        <div
          ref={openMenuRef}
          className="fixed w-44 bg-[var(--glass-bg-strong)] backdrop-blur-xl rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.45)] border border-[var(--glass-border)] py-1 z-[9999]"
          style={{ top: dropdownPos.top, right: dropdownPos.right }}
        >
          <button
            onClick={() => { setOpenMenuId(null); navigate(`/revize/${openRevize.id}/nahled`); }}
            className="w-full text-left px-3 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--bg-hover)] flex items-center gap-2"
          >
            <span>👁️</span> Náhled tisku
          </button>
          <div className="border-t border-[var(--border)] my-1" />
          <button
            onClick={() => { setOpenMenuId(null); navigate(`/revize/${openRevize.id}`); }}
            className="w-full text-left px-3 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--bg-hover)] flex items-center gap-2"
          >
            <span>✏️</span> Upravit
          </button>
          <button
            onClick={() => { setOpenMenuId(null); openDuplikatModal(openRevize.id!, openRevize.cisloRevize); }}
            className="w-full text-left px-3 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--bg-hover)] flex items-center gap-2"
          >
            <span>📋</span> Kopírovat revizi
          </button>
          <button
            onClick={() => { setOpenMenuId(null); openHistorieModal(openRevize.id!, openRevize.cisloRevize); }}
            className="w-full text-left px-3 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--bg-hover)] flex items-center gap-2"
          >
            <span>🕐</span> Historie
          </button>
          <div className="border-t border-[var(--border)] my-1" />
          <button
            onClick={() => { setOpenMenuId(null); handleDelete(openRevize.id!, openRevize.cisloRevize); }}
            className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/[0.08] flex items-center gap-2"
          >
            <span>🗑️</span> Smazat
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}

