import { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input, Textarea, Select, Modal, BottomSheet, Badge, PageHeader, EmptyState } from '../components/ui';
import type { BadgeVariant } from '../components/ui';
import { revizeService } from '../services/database';
import { useRevize, useDeleteRevize } from '../hooks/useQueries';
import { KATEGORIE_LABELS } from '../types';
import type { KategorieRevize, Revize } from '../types';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../hooks/queryKeys';
import { seskupRevize, slozkaRevize, jeHotova, jePodepsana, BEZ_SLOZKY, BEZ_OBJEDNATELE } from '../utils/slozky';
import { najdiRevizi } from '../utils/podpisPrirazeni';
import { podpisService } from '../services/podpis';
import type { SkupinaObjednatel, SkupinaSlozka } from '../utils/slozky';
import { SlozkaInput } from './RevizeDetail/SlozkaInput';

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
  {
    value: 'odberne_misto',
    label: 'Odběrné místo (ČEZ)',
    popis: 'Revize elektroměrového rozvaděče a odběrného místa dle připojovacích podmínek distributora, smlouvy a tarifu',
    icon: (
      <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <circle cx="12" cy="10" r="3.5" />
        <path d="M9 17h6" strokeLinecap="round" />
      </svg>
    ),
  },
];

const stavVariant = (stav: string): BadgeVariant =>
  stav === 'dokončeno' ? 'success' : stav === 'rozpracováno' ? 'warning' : stav === 'schváleno' ? 'info' : 'neutral';

const TH_CLS = 'text-left h-9 px-3 text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.08em] cursor-pointer select-none hover:text-[var(--text)]';

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
  const [duplikatError, setDuplikatError] = useState<string | null>(null);
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

  // Temp ID = záporné číslo = offline záznam čekající na synchronizaci
  const isOfflineId = (id: number | undefined) => (id ?? 0) < 0;

  // Action sheet pro mobil
  const [actionSheetRevize, setActionSheetRevize] = useState<{ id: number; cisloRevize: string; nazev: string } | null>(null);

  // Potvrzení smazání (náhrada za window.confirm – nefunguje v iOS PWA)
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; cisloRevize: string } | null>(null);
  const [confirmDeleteInput, setConfirmDeleteInput] = useState('');

  // Seskupení podle objednatele → složky (hala, projekt…)
  const [seskupit, setSeskupitState] = useState<boolean>(() => {
    try { return localStorage.getItem('revize-seskupit') === '1'; } catch { return false; }
  });
  const setSeskupit = (v: boolean) => {
    setSeskupitState(v);
    try { localStorage.setItem('revize-seskupit', v ? '1' : '0'); } catch { /* ignore */ }
  };
  const [rozbaleno, setRozbaleno] = useState<Set<string>>(() => new Set());
  const toggleRozbaleno = (key: string) => setRozbaleno(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const queryClient = useQueryClient();

  // Hromadné založení revizí (typicky desítky strojů do jedné složky)
  type HromadneForm = {
    objednatel: string; adresa: string; zakaznikId?: number; slozka: string;
    kategorieRevize: KategorieRevize; datum: string; typRevize: Revize['typRevize']; termin: number; nazvy: string;
  };
  const [hromadne, setHromadne] = useState<HromadneForm | null>(null);
  const [hromadnePrubeh, setHromadnePrubeh] = useState<{ hotovo: number; celkem: number } | null>(null);
  const [hromadneChyba, setHromadneChyba] = useState<string | null>(null);

  // Hromadné nahrání podepsaných zpráv (přiřazení podle čísla revize v názvu souboru)
  type NahraniRadek = { file: File; revize: Revize | null; stav: 'ceka' | 'nahravam' | 'ok' | 'chyba'; zprava?: string };
  const [nahrani, setNahrani] = useState<NahraniRadek[] | null>(null);
  const [nahraniBezi, setNahraniBezi] = useState(false);
  const nahraniInputRef = useRef<HTMLInputElement>(null);

  // Přejmenování / přiřazení složky
  const [presun, setPresun] = useState<{ ids: number[]; puvodni: string; objednatel: string; nova: string } | null>(null);
  const [presunBezi, setPresunBezi] = useState(false);
  const [presunChyba, setPresunChyba] = useState<string | null>(null);

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
    setDuplikatError(null);
    setIsDuplikatModalOpen(true);
  };

  const handleDuplikovat = async () => {
    if (!duplikatSourceId || !duplikatCislo.trim()) return;
    setIsDuplikating(true);
    setDuplikatError(null);
    try {
      const result = await revizeService.duplikovat(duplikatSourceId, duplikatCislo.trim(), duplikatTyp);
      setIsDuplikatModalOpen(false);
      navigate(`/revize/${result.id}`);
    } catch (err) {
      setDuplikatError('Chyba při duplikaci: ' + (err instanceof Error ? err.message : 'Neznámá chyba'));
    } finally {
      setIsDuplikating(false);
    }
  };

  const filteredRevize = useMemo(() => {
    const hledat = searchTerm.trim().toLowerCase();
    return revize.filter(r => {
      const matchesSearch = !hledat ||
        r.nazev.toLowerCase().includes(hledat) ||
        r.cisloRevize.toLowerCase().includes(hledat) ||
        r.adresa.toLowerCase().includes(hledat) ||
        (r.objednatel ?? '').toLowerCase().includes(hledat) ||
        slozkaRevize(r).toLowerCase().includes(hledat);
      const matchesFilter = !filterStav
        || (filterStav === 'cekaNaPodpis' ? jeHotova(r) && !jePodepsana(r)
          : filterStav === 'podepsano' ? jePodepsana(r)
          : r.stav === filterStav);
      const matchesKategorie = !filterKategorie || r.kategorieRevize === filterKategorie;
      return matchesSearch && matchesFilter && matchesKategorie;
    }).sort((a, b) => {
      const valA = (a[sortKey] ?? '').toString().toLowerCase();
      const valB = (b[sortKey] ?? '').toString().toLowerCase();
      const cmp = valA.localeCompare(valB, 'cs');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [revize, searchTerm, filterStav, filterKategorie, sortKey, sortDir]);

  const skupiny = useMemo(() => (seskupit ? seskupRevize(filteredRevize) : []), [seskupit, filteredRevize]);
  // Při hledání jsou všechny skupiny rozbalené, aby byly nalezené revize vidět
  const hledaniAktivni = searchTerm.trim() !== '';
  const jeRozbaleno = (key: string) => hledaniAktivni || rozbaleno.has(key);
  const rozbalitVse = () => setRozbaleno(new Set(skupiny.flatMap(o => [o.key, ...o.slozky.map(sl => sl.key)])));
  const sbalitVse = () => setRozbaleno(new Set());

  const openHromadne = (vzor?: { objednatel?: SkupinaObjednatel; slozka?: SkupinaSlozka }) => {
    const prvni = vzor?.slozka?.revize[0] ?? vzor?.objednatel?.slozky[0]?.revize[0];
    setHromadne({
      objednatel: vzor?.objednatel && vzor.objednatel.nazev !== BEZ_OBJEDNATELE ? vzor.objednatel.nazev : '',
      adresa: prvni?.adresa ?? '',
      zakaznikId: prvni?.zakaznikId,
      slozka: vzor?.slozka?.nazev ?? '',
      kategorieRevize: prvni?.kategorieRevize ?? 'stroje',
      datum: new Date().toISOString().split('T')[0],
      typRevize: prvni?.typRevize ?? 'pravidelná',
      termin: prvni?.termin ?? 12,
      nazvy: '',
    });
    setHromadneChyba(null);
    setHromadnePrubeh(null);
  };

  const hromadneNazvy = (hromadne?.nazvy ?? '').split('\n').map(n => n.trim()).filter(Boolean);

  const handleHromadne = async () => {
    if (!hromadne || hromadneNazvy.length === 0) return;
    if (!navigator.onLine) {
      setHromadneChyba('Hromadné založení vyžaduje připojení k internetu.');
      return;
    }
    if (!hromadne.objednatel.trim() || !hromadne.adresa.trim()) {
      setHromadneChyba('Vyplňte objednatele a adresu.');
      return;
    }
    setHromadneChyba(null);
    const zaklad = generateCisloRevize();
    const existujici = new Set(revize.map(r => r.cisloRevize));
    let poradi = 1;
    const slozka = hromadne.slozka.trim();
    setHromadnePrubeh({ hotovo: 0, celkem: hromadneNazvy.length });
    try {
      for (let i = 0; i < hromadneNazvy.length; i++) {
        let cislo: string;
        do { cislo = `${zaklad}-${String(poradi++).padStart(3, '0')}`; } while (existujici.has(cislo));
        existujici.add(cislo);
        const nazev = hromadneNazvy[i];
        const id = await revizeService.create({
          cisloRevize: cislo,
          nazev,
          adresa: hromadne.adresa.trim(),
          objednatel: hromadne.objednatel.trim(),
          zakaznikId: hromadne.zakaznikId,
          slozka: slozka || null,
          kategorieRevize: hromadne.kategorieRevize,
          datum: hromadne.datum,
          termin: hromadne.termin,
          typRevize: hromadne.typRevize,
          stav: 'rozpracováno',
        } as Omit<Revize, 'id' | 'createdAt' | 'updatedAt'>);
        // U strojů rovnou předvyplnit název stroje v protokolu
        if (hromadne.kategorieRevize === 'stroje' && id > 0) {
          await revizeService.update(id, { strojniData: JSON.stringify({ strojNazev: nazev }) });
        }
        setHromadnePrubeh({ hotovo: i + 1, celkem: hromadneNazvy.length });
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.revize.all });
      if (slozka) {
        // Rozbalit složku, do které se přidávalo
        const sk = seskupRevize([{ objednatel: hromadne.objednatel, slozka } as Revize])[0];
        setRozbaleno(prev => new Set([...prev, sk.key, sk.slozky[0].key]));
      }
      setHromadne(null);
      setHromadnePrubeh(null);
    } catch (err) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.revize.all });
      setHromadneChyba('Chyba při zakládání: ' + (err instanceof Error ? err.message : 'neznámá chyba') + '. Již založené revize zůstaly uložené.');
      setHromadnePrubeh(null);
    }
  };

  const vyberPodepsane = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const pdf = [...files].filter(f => /\.pdf$/i.test(f.name) || f.type === 'application/pdf');
    setNahrani(pdf.map(file => {
      const r = najdiRevizi(file.name, revize);
      return {
        file, revize: r,
        stav: r && jeHotova(r) ? 'ceka' : 'chyba',
        zprava: !r ? 'Číslo revize v názvu souboru nenalezeno' : !jeHotova(r) ? 'Revize není dokončená' : undefined,
      };
    }));
  };

  const handleNahrani = async () => {
    if (!nahrani) return;
    setNahraniBezi(true);
    const radky = [...nahrani];
    for (let i = 0; i < radky.length; i++) {
      const rd = radky[i];
      if (rd.stav !== 'ceka' || !rd.revize?.id) continue;
      radky[i] = { ...rd, stav: 'nahravam' };
      setNahrani([...radky]);
      try {
        const v = await podpisService.nahrat(rd.revize.id, rd.file);
        radky[i] = { ...rd, stav: 'ok', zprava: `${v.podepsal ?? 'podepsáno'}${v.kvalifikovany ? ' · kvalifikovaný' : ' · není kvalifikovaný'}` };
      } catch (err) {
        radky[i] = { ...rd, stav: 'chyba', zprava: err instanceof Error ? err.message : 'Chyba' };
      }
      setNahrani([...radky]);
    }
    await queryClient.invalidateQueries({ queryKey: queryKeys.revize.all });
    setNahraniBezi(false);
  };

  const openPresun = (revizeVeSlozce: Revize[], puvodni: string, objednatel: string) => {
    setPresun({ ids: revizeVeSlozce.map(r => r.id!).filter(id => id > 0), puvodni, objednatel, nova: puvodni });
    setPresunChyba(null);
  };

  const handlePresun = async () => {
    if (!presun) return;
    setPresunBezi(true);
    setPresunChyba(null);
    try {
      const nova = presun.nova.trim();
      for (const id of presun.ids) {
        await revizeService.update(id, { slozka: nova || null });
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.revize.all });
      setPresun(null);
    } catch (err) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.revize.all });
      setPresunChyba('Chyba při ukládání: ' + (err instanceof Error ? err.message : 'neznámá chyba'));
    } finally {
      setPresunBezi(false);
    }
  };

  const totalCount = filteredRevize.length;
  const totalPages = pageSize === -1 ? 1 : Math.ceil(totalCount / pageSize);
  const paginatedRevize = pageSize === -1
    ? filteredRevize
    : filteredRevize.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const renderKarta = (r: Revize) => (
              <div key={r.id} className="bg-[var(--bg-faint)] rounded-[var(--radius-lg)] border border-[var(--border)] p-3">
                <Link to={`/revize/${r.id}`} className="block">
                  <p className="font-semibold text-[var(--text)] text-sm leading-snug">{r.nazev}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{r.adresa}</p>
                </Link>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge>{KATEGORIE_LABELS[r.kategorieRevize]?.kratky ?? r.kategorieRevize}</Badge>
                    <Badge variant={stavVariant(r.stav)}>{r.stav}</Badge>
                    {r.podepsanoAt && (
                        <Badge variant={r.podpisZastaraly ? 'warning' : 'success'}>{r.podpisZastaraly ? '✍ podpis neplatí' : '✍ podepsáno'}</Badge>
                      )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-[var(--text-secondary)]">{new Date(r.datum).toLocaleDateString('cs-CZ')}</span>
                    <button
                      onClick={() => setActionSheetRevize({ id: r.id!, cisloRevize: r.cisloRevize, nazev: r.nazev })}
                      className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                      aria-label="Akce"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => navigate(`/revize/${r.id}/nahled`)}
                      className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                      title="Náhled tisku" aria-label="Náhled tisku"
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
  );

  const renderRadek = (r: Revize) => (
                  <tr key={r.id} className="h-11 border-b border-[var(--border-subtle)] border-l-2 border-l-transparent hover:border-l-[var(--primary)] hover:bg-[var(--bg-hover)] group">
                    <td className="py-2 px-3">
                      {isOfflineId(r.id) ? (
                        <span className="text-[13px] text-[var(--text-muted)] font-medium flex items-center gap-1.5">
                          {r.cisloRevize}
                          <Badge variant="warning">⏳ offline</Badge>
                        </span>
                      ) : (
                        <Link to={`/revize/${r.id}`} className="text-[13px] text-[var(--text)] group-hover:text-[var(--primary-text)] font-medium hover:underline transition-colors">
                          {r.cisloRevize}
                        </Link>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <Badge>{KATEGORIE_LABELS[r.kategorieRevize]?.kratky ?? 'Elektro'}</Badge>
                    </td>
                    <td className="py-2 px-3 text-[13px] font-medium text-[var(--text)]">{r.nazev}</td>
                    <td className="py-2 px-3 text-[13px] text-[var(--text-secondary)]">{r.adresa}</td>
                    <td className="py-2 px-3 text-[13px] text-[var(--text-secondary)]">
                      {new Date(r.datum).toLocaleDateString('cs-CZ')}
                    </td>
                    <td className="py-2 px-3">
                      <Badge>{r.typRevize}</Badge>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant={stavVariant(r.stav)}>{r.stav}</Badge>
                      {r.podepsanoAt && (
                        <Badge variant={r.podpisZastaraly ? 'warning' : 'success'}>{r.podpisZastaraly ? '✍ podpis neplatí' : '✍ podepsáno'}</Badge>
                      )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            if (openMenuId === r.id) { setOpenMenuId(null); return; }
                            const rect = e.currentTarget.getBoundingClientRect();
                            setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                            setOpenMenuId(r.id!);
                          }}
                          className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                          title="Akce" aria-label="Akce"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
                        {openMenuId === r.id && null}
                      </div>
                    </td>
                  </tr>
  );

  const pocetRevizi = (n: number) => `${n} ${n === 1 ? 'revize' : n >= 2 && n <= 4 ? 'revize' : 'revizí'}`;

  const chevron = (open: boolean) => (
    <svg className={`w-4 h-4 flex-shrink-0 text-[var(--text-muted)] transition-transform ${open ? 'rotate-90' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
    </svg>
  );

  const progres = (hotovo: number, celkem: number) => (
    <span className="flex items-center gap-2 text-xs text-[var(--text-secondary)] tabular-nums" title={`${hotovo} z ${celkem} dokončeno`}>
      <span className="hidden sm:block w-20 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
        <span className="block h-full bg-[var(--success)]" style={{ width: `${celkem ? (hotovo / celkem) * 100 : 0}%` }} />
      </span>
      {hotovo}/{celkem} hotovo
    </span>
  );

  const akceBtn = (label: string, onClick: () => void, title?: string) => (
    <button
      type="button"
      title={title}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onKeyDown={(e) => e.stopPropagation()}
      className="px-2 h-7 rounded-[var(--radius-md)] text-xs font-medium text-[var(--primary-text)] hover:bg-[var(--bg-accent)] transition-colors"
    >
      {label}
    </button>
  );

  const toggleKlavesou = (key: string) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRozbaleno(key); }
  };

  const hlavickaObjednatel = (o: SkupinaObjednatel, open: boolean) => (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
      {chevron(open)}
      <span className={`font-semibold truncate ${o.nazev === BEZ_OBJEDNATELE ? 'italic text-[var(--text-muted)]' : 'text-[var(--text)]'}`}>{o.nazev}</span>
      <span className="text-xs text-[var(--text-muted)] flex-shrink-0">
        {pocetRevizi(o.pocet)}{o.slozky.some(sl => sl.nazev) ? ` · ${o.slozky.filter(sl => sl.nazev).length} slož.` : ''}
      </span>
      <span className="ml-auto flex items-center gap-2 flex-shrink-0">
        {o.podepsano > 0 && <span className="text-xs text-[var(--text-secondary)] tabular-nums" title="Elektronicky podepsané zprávy">✍ {o.podepsano}</span>}
        {progres(o.hotovo, o.pocet)}
        {akceBtn('+ Přidat', () => openHromadne({ objednatel: o }), 'Hromadně přidat revize tomuto objednateli')}
      </span>
    </div>
  );

  const hlavickaSlozka = (o: SkupinaObjednatel, sl: SkupinaSlozka, open: boolean) => (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
      {chevron(open)}
      <svg className="w-4 h-4 flex-shrink-0 text-[var(--text-muted)]" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M3.75 3A1.75 1.75 0 002 4.75v10.5c0 .966.784 1.75 1.75 1.75h12.5A1.75 1.75 0 0018 15.25v-8.5A1.75 1.75 0 0016.25 5h-4.836a.25.25 0 01-.177-.073L9.823 3.513A1.75 1.75 0 008.586 3H3.75z" />
      </svg>
      <span className={`font-medium truncate ${sl.nazev ? 'text-[var(--text)]' : 'italic text-[var(--text-muted)]'}`}>{sl.nazev || BEZ_SLOZKY}</span>
      <span className="text-xs text-[var(--text-muted)] flex-shrink-0">{pocetRevizi(sl.revize.length)}</span>
      <span className="ml-auto flex items-center gap-1 flex-shrink-0">
        {sl.podepsano > 0 && <span className="text-xs text-[var(--text-secondary)] tabular-nums" title="Elektronicky podepsané zprávy">✍ {sl.podepsano}</span>}
        {progres(sl.hotovo, sl.revize.length)}
        {akceBtn(sl.nazev ? 'Přejmenovat' : 'Zařadit do složky', () => openPresun(sl.revize, sl.nazev, o.nazev === BEZ_OBJEDNATELE ? '' : o.nazev),
          sl.nazev ? 'Přejmenovat složku u všech jejích revizí' : 'Přesunout tyto revize do složky')}
        {sl.nazev && akceBtn('+ Přidat', () => openHromadne({ objednatel: o, slozka: sl }), 'Hromadně přidat revize do této složky')}
      </span>
    </div>
  );

  /** Objednatel bez složek → revize rovnou pod ním (bez mezikroku „Bez složky“). */
  const bezSlozek = (o: SkupinaObjednatel) => o.slozky.length === 1 && o.slozky[0].nazev === '';

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-[var(--border-strong)] border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-sm text-[var(--text-secondary)]">Načítání revizí...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--danger-text)] text-sm font-medium mb-2">{error}</p>
        <Button variant="secondary" onClick={() => refetch()}>
          Zkusit znovu
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex-shrink-0">
        <PageHeader
          title="Revize"
          subtitle="Správa revizí elektrických instalací, hromosvodů a strojních zařízení"
          actions={
            <div className="flex items-center gap-2">
              <input ref={nahraniInputRef} type="file" accept="application/pdf,.pdf" multiple className="hidden"
                onChange={(e) => { vyberPodepsane(e.target.files); e.target.value = ''; }} />
              <Button variant="secondary" onClick={() => nahraniInputRef.current?.click()} title="Nahrát elektronicky podepsané zprávy (PDF) – přiřadí se podle čísla revize v názvu souboru">
                <span className="sm:hidden">✍</span>
                <span className="hidden sm:inline">✍ Nahrát podepsané</span>
              </Button>
              <Button variant="secondary" onClick={() => openHromadne()} title="Založit více revizí najednou (např. strojní zařízení v hale)">
                <span className="sm:hidden">Hromadně</span>
                <span className="hidden sm:inline">Hromadně přidat</span>
              </Button>
              <Button onClick={openModal}>
                <span className="sm:hidden text-lg leading-none">+</span>
                <span className="hidden sm:inline">+ Nová revize</span>
              </Button>
            </div>
          }
        />
      </div>

      <div className="bg-[var(--surface)] rounded-[var(--radius-lg)] border border-[var(--border-medium)] flex-1 min-h-0 flex flex-col">
        <div className="px-4 md:px-6 pt-4 pb-3 flex-shrink-0">
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
              { value: 'odberne_misto', label: 'Odběrné místo (ČEZ)' },
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
              { value: 'cekaNaPodpis', label: 'Čeká na podpis' },
              { value: 'podepsano', label: 'Podepsáno' },
            ]}
          />
          </div>
          {/* Seskupení podle objednatele a složky */}
          <div className="flex items-center gap-2 self-center flex-shrink-0">
            <button
              type="button"
              onClick={() => setSeskupit(!seskupit)}
              aria-pressed={seskupit}
              title="Seskupit podle objednatele a složky (hala, projekt…)"
              className={`flex items-center gap-1.5 px-3 h-10 rounded-[var(--radius-md)] border text-sm transition-colors ${
                seskupit
                  ? 'border-[var(--primary)] bg-[var(--bg-accent)] text-[var(--primary-text)]'
                  : 'border-[var(--border-medium)] text-[var(--text-secondary)] hover:text-[var(--text)]'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M3.75 3A1.75 1.75 0 002 4.75v10.5c0 .966.784 1.75 1.75 1.75h12.5A1.75 1.75 0 0018 15.25v-8.5A1.75 1.75 0 0016.25 5h-4.836a.25.25 0 01-.177-.073L9.823 3.513A1.75 1.75 0 008.586 3H3.75z" />
              </svg>
              Seskupit
            </button>
            {seskupit && !hledaniAktivni && (
              <>
                <button type="button" onClick={rozbalitVse} className="text-xs text-[var(--primary-text)] hover:underline">Rozbalit vše</button>
                <button type="button" onClick={sbalitVse} className="text-xs text-[var(--primary-text)] hover:underline">Sbalit vše</button>
              </>
            )}
          </div>
          {/* Přepínač tabulka / karty — jen desktop */}
          <div className="hidden md:flex items-center self-center gap-0.5 border border-[var(--border-medium)] rounded-[var(--radius-md)] p-0.5 flex-shrink-0">
            <button
              onClick={() => setView('table')}
              title="Tabulka"
              className={`p-2 rounded-[var(--radius-sm)] transition-colors ${viewMode === 'table' ? 'bg-[var(--bg-accent)] text-[var(--primary-text)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 4a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2H5zm0 2h10v2H5V6zm0 4h4v4H5v-4zm6 0h4v4h-4v-4z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={() => setView('grid')}
              title="Karty"
              className={`p-2 rounded-[var(--radius-sm)] transition-colors ${viewMode === 'grid' ? 'bg-[var(--bg-accent)] text-[var(--primary-text)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
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
            {!seskupit && paginatedRevize.map(renderKarta)}
            {seskupit && skupiny.map(o => {
              const oOpen = jeRozbaleno(o.key);
              return (
                <div key={o.key} className="space-y-2">
                  <div
                    role="button" tabIndex={0} aria-expanded={oOpen}
                    onClick={() => toggleRozbaleno(o.key)} onKeyDown={toggleKlavesou(o.key)}
                    className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-lg)] px-3 py-2.5 text-sm cursor-pointer"
                  >
                    {hlavickaObjednatel(o, oOpen)}
                  </div>
                  {oOpen && (
                    <div className="ml-2 pl-2 border-l-2 border-[var(--border)] space-y-2">
                      {bezSlozek(o) ? o.slozky[0].revize.map(renderKarta) : o.slozky.map(sl => {
                        const sOpen = jeRozbaleno(sl.key);
                        return (
                          <div key={sl.key} className="space-y-2">
                            <div
                              role="button" tabIndex={0} aria-expanded={sOpen}
                              onClick={() => toggleRozbaleno(sl.key)} onKeyDown={toggleKlavesou(sl.key)}
                              className="border border-[var(--border-subtle)] rounded-[var(--radius-md)] px-3 py-2 text-sm cursor-pointer"
                            >
                              {hlavickaSlozka(o, sl, sOpen)}
                            </div>
                            {sOpen && <div className="ml-2 space-y-2">{sl.revize.map(renderKarta)}</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Desktopová tabulka */}
          <div className={`${viewMode === 'table' || seskupit ? 'hidden md:block' : 'hidden'} px-6 pb-4 flex-1 min-h-0 overflow-auto`}>
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 bg-[var(--bg-faint)] z-10">
                <tr className="border-b border-[var(--border)]">
                  <th className={TH_CLS} onClick={() => toggleSort('cisloRevize')}>Číslo<SortIcon col="cisloRevize" /></th>
                  <th className={TH_CLS} onClick={() => toggleSort('kategorieRevize')}>Kategorie<SortIcon col="kategorieRevize" /></th>
                  <th className={TH_CLS} onClick={() => toggleSort('nazev')}>Název<SortIcon col="nazev" /></th>
                  <th className={TH_CLS} onClick={() => toggleSort('adresa')}>Adresa<SortIcon col="adresa" /></th>
                  <th className={TH_CLS} onClick={() => toggleSort('datum')}>Datum<SortIcon col="datum" /></th>
                  <th className={TH_CLS} onClick={() => toggleSort('typRevize')}>Typ<SortIcon col="typRevize" /></th>
                  <th className={TH_CLS} onClick={() => toggleSort('stav')}>Stav<SortIcon col="stav" /></th>
                  <th className="text-right h-9 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {!seskupit && paginatedRevize.map(renderRadek)}
                {seskupit && skupiny.map(o => {
                  const oOpen = jeRozbaleno(o.key);
                  return (
                    <Fragment key={o.key}>
                      <tr
                        tabIndex={0} aria-expanded={oOpen}
                        onClick={() => toggleRozbaleno(o.key)} onKeyDown={toggleKlavesou(o.key)}
                        className="bg-[var(--bg-surface)] border-b border-[var(--border)] cursor-pointer hover:bg-[var(--bg-hover)]"
                      >
                        <td colSpan={8} className="px-3 py-2 text-[13px]">{hlavickaObjednatel(o, oOpen)}</td>
                      </tr>
                      {oOpen && (bezSlozek(o) ? o.slozky[0].revize.map(renderRadek) : o.slozky.map(sl => {
                        const sOpen = jeRozbaleno(sl.key);
                        return (
                          <Fragment key={sl.key}>
                            <tr
                              tabIndex={0} aria-expanded={sOpen}
                              onClick={() => toggleRozbaleno(sl.key)} onKeyDown={toggleKlavesou(sl.key)}
                              className="border-b border-[var(--border-subtle)] cursor-pointer hover:bg-[var(--bg-hover)]"
                            >
                              <td colSpan={8} className="pl-8 pr-3 py-1.5 text-[13px]">{hlavickaSlozka(o, sl, sOpen)}</td>
                            </tr>
                            {sOpen && sl.revize.map(renderRadek)}
                          </Fragment>
                        );
                      }))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Desktopový grid karet */}
          <div className={`${viewMode === 'grid' && !seskupit ? 'hidden md:block' : 'hidden'} px-6 pb-4 flex-1 min-h-0 overflow-auto`}>
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 py-2">
              {paginatedRevize.map((r) => (
                <div key={r.id} className="bg-[var(--surface)] rounded-[var(--radius-lg)] border border-[var(--border-medium)] flex flex-col relative hover:border-[var(--border-strong)] transition-colors group">
                  {isOfflineId(r.id) ? (
                    <div className="flex-1 p-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Badge variant="warning">⏳ Čeká na synchronizaci</Badge>
                      </div>
                      <p className="font-semibold text-[var(--text)] text-sm leading-snug mb-1">{r.nazev}</p>
                      <p className="text-xs text-[var(--text-secondary)] mb-3">{r.adresa}</p>
                      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                        <span>{r.cisloRevize}</span>
                        <span>{new Date(r.datum).toLocaleDateString('cs-CZ')}</span>
                      </div>
                    </div>
                  ) : (
                    <Link to={`/revize/${r.id}`} className="flex-1 p-4 block">
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge>{KATEGORIE_LABELS[r.kategorieRevize]?.kratky ?? 'Elektro'}</Badge>
                          <Badge variant={stavVariant(r.stav)}>{r.stav}</Badge>
                        </div>
                      </div>
                      <p className="font-semibold text-[var(--text)] text-sm leading-snug mb-1">{r.nazev}</p>
                      <p className="text-xs text-[var(--text-secondary)] mb-3">{r.adresa}</p>
                      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                        <span>{r.cisloRevize}</span>
                        <span>{new Date(r.datum).toLocaleDateString('cs-CZ')}</span>
                      </div>
                    </Link>
                  )}
                  <div className="border-t border-[var(--border-subtle)] px-4 py-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-[var(--text-muted)] truncate">{r.typRevize}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => !isOfflineId(r.id) && navigate(`/revize/${r.id}/nahled`)}
                        className={`p-2 rounded-[var(--radius-md)] transition-colors ${
                          isOfflineId(r.id)
                            ? 'text-[var(--text-muted)] opacity-30 cursor-not-allowed'
                            : 'hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)]'
                        }`}
                        title={isOfflineId(r.id) ? 'Náhled dostupný po synchronizaci' : 'Náhled tisku'}
                        disabled={isOfflineId(r.id)}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                        <div className="relative">
                        <button
                          onClick={(e) => {
                            if (openMenuId === r.id) { setOpenMenuId(null); return; }
                            const rect = e.currentTarget.getBoundingClientRect();
                            setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                            setOpenMenuId(r.id!);
                          }}
                          className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                          title="Akce" aria-label="Akce"
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
          <div className="flex-shrink-0 flex items-center justify-between px-4 md:px-6 py-2 border-t border-[var(--border)] text-xs text-[var(--text-secondary)]">
            {seskupit ? (
              <span>{totalCount} záznamů · {skupiny.length} {skupiny.length === 1 ? 'objednatel' : skupiny.length <= 4 ? 'objednatelé' : 'objednatelů'}</span>
            ) : (<>
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
                  className="bg-[var(--bg-input)] border border-[var(--border-input)] rounded-[var(--radius-md)] px-2 h-8 text-xs text-[var(--text)] focus:outline-none focus:border-[var(--primary-text)]"
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
                  className="px-2 h-8 rounded-[var(--radius-md)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ‹ Předchozí
                </button>
                <span className="px-2 text-[var(--text-muted)]">{totalPages > 0 ? `${currentPage + 1} / ${totalPages}` : '—'}</span>
                <button
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="px-2 h-8 rounded-[var(--radius-md)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Další ›
                </button>
              </div>
            </div>
            </>)}
          </div>
          </>
        ) : (
          <div className="p-4">
            <EmptyState
              message={searchTerm || filterStav
                ? 'Žádné revize neodpovídají vašemu hledání.'
                : 'Zatím nemáte žádné revize. Vytvořte první kliknutím na tlačítko výše.'}
            />
          </div>
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
                  className="flex items-center gap-4 p-4 rounded-[var(--radius-lg)] border border-[var(--border-medium)] hover:border-[var(--primary)] hover:bg-[var(--bg-accent)] transition-colors text-left group"
                >
                  <div className="flex-shrink-0 text-[var(--text-muted)] group-hover:text-[var(--primary-text)] transition-colors">
                    {kat.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--text)]">{kat.label}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{kat.popis}</p>
                  </div>
                  <div className="flex-shrink-0 ml-auto text-[var(--text-muted)] group-hover:text-[var(--text)]">
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
            <div className="flex items-center gap-3 px-3 py-2 bg-[var(--bg-surface)] rounded-[var(--radius-lg)] border border-[var(--border-medium)]">
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
            <div className="animate-spin inline-block w-6 h-6 border-2 border-[var(--border-medium)] border-t-[var(--primary)] rounded-full mb-2"></div>
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
                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-xs font-bold z-10 ${
                      isCurrent
                        ? 'bg-[var(--primary)] border-[var(--primary-hover)] text-[var(--primary-fg)]'
                        : h.stav === 'dokončeno' || h.stav === 'schváleno'
                          ? 'bg-[var(--success-bg)] border-[var(--success)] text-[var(--success-text)]'
                          : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)]'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className={`flex-1 rounded-[var(--radius-md)] border px-3 py-2 text-sm ${isCurrent ? 'bg-[var(--bg-accent)] border-[var(--active-border)]' : 'bg-[var(--surface)] border-[var(--border-medium)]'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[var(--text)]">
                          {h.cisloRevize}
                          {isCurrent && <span className="ml-2 text-xs text-[var(--primary-text)]">(aktuální)</span>}
                        </span>
                        <Badge variant={stavVariant(h.stav ?? '')}>{h.stav}</Badge>
                      </div>
                      <div className="text-xs text-[var(--text-muted)] mt-0.5">
                        {h.datum} · {h.typRevize || '–'} · {h.vysledek || 'nevyplněno'}
                      </div>
                      {!isCurrent && h.id && (
                        <button
                          onClick={() => { setIsHistorieModalOpen(false); navigate(`/revize/${h.id}`); }}
                          className="text-xs text-[var(--primary-text)] hover:underline mt-1"
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
            className="w-full px-3 min-h-[40px] rounded-[var(--radius-md)] border border-[var(--border-input)] bg-[var(--bg-input)] text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--danger)]/40 focus:border-[var(--danger)]"
            autoComplete="off"
            autoFocus
          />
        </div>
      </Modal>

      {/* Action sheet pro mobil – akce revize */}
      <div className="md:hidden">
        <BottomSheet
          isOpen={actionSheetRevize !== null}
          onClose={() => setActionSheetRevize(null)}
          title={actionSheetRevize ? `${actionSheetRevize.cisloRevize} – ${actionSheetRevize.nazev}` : ''}
        >
          {actionSheetRevize && (
          <div className="-mx-5 -my-5">
    <div className="py-1">
      <button
        onClick={() => { setActionSheetRevize(null); navigate(`/revize/${actionSheetRevize.id}`); }}
        className="w-full text-left px-4 py-3.5 text-sm text-[var(--text)] active:bg-[var(--bg-hover)] flex items-center gap-3"
      >
        <span className="text-base">✏️</span> Upravit
      </button>
      <button
        onClick={() => {
          if (isOfflineId(actionSheetRevize?.id)) return;
          const a = actionSheetRevize; setActionSheetRevize(null); openDuplikatModal(a!.id, a!.cisloRevize);
        }}
        disabled={isOfflineId(actionSheetRevize?.id)}
        className={`w-full text-left px-4 py-3.5 text-sm flex items-center gap-3 ${
          isOfflineId(actionSheetRevize?.id)
            ? 'text-[var(--text-muted)] opacity-40'
            : 'text-[var(--text)] active:bg-[var(--bg-hover)]'
        }`}
        title={isOfflineId(actionSheetRevize?.id) ? 'Dostupné po synchronizaci' : undefined}
      >
        <span className="text-base">📋</span> Kopírovat revizi
      </button>
      <button
        onClick={() => {
          const r = revize.find(x => x.id === actionSheetRevize.id);
          setActionSheetRevize(null);
          if (r && !isOfflineId(r.id)) openPresun([r], slozkaRevize(r), r.objednatel);
        }}
        disabled={isOfflineId(actionSheetRevize?.id)}
        className={`w-full text-left px-4 py-3.5 text-sm flex items-center gap-3 ${
          isOfflineId(actionSheetRevize?.id)
            ? 'text-[var(--text-muted)] opacity-40'
            : 'text-[var(--text)] active:bg-[var(--bg-hover)]'
        }`}
      >
        <span className="text-base">📁</span> Přesunout do složky
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
        className="w-full text-left px-4 py-3.5 text-sm text-[var(--danger-text)] active:bg-[var(--danger-bg)] flex items-center gap-3"
      >
        <span className="text-base">🗑️</span> Smazat
      </button>
    </div>
          </div>
          )}
        </BottomSheet>
      </div>

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
                className={`p-3 rounded-[var(--radius-lg)] border text-left transition-colors ${
                  duplikatTyp === 'navazujici'
                    ? 'border-[var(--primary)] bg-[var(--bg-accent-badge)]'
                    : 'border-[var(--border-medium)] hover:border-[var(--border-strong)]'
                }`}
              >
                <p className="font-semibold text-sm">🔗 Navazující revize</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Propojena s historií původní revize. Pro periodické (následné) revize stejného objektu.</p>
              </button>
              <button
                type="button"
                onClick={() => setDuplikatTyp('duplikat')}
                className={`p-3 rounded-[var(--radius-lg)] border text-left transition-colors ${
                  duplikatTyp === 'duplikat'
                    ? 'border-[var(--primary)] bg-[var(--bg-accent-badge)]'
                    : 'border-[var(--border-medium)] hover:border-[var(--border-strong)]'
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

          {duplikatError && (
            <p className="text-xs font-medium text-[var(--danger-text)] bg-[var(--danger-bg)] border border-[var(--danger)]/25 rounded-[var(--radius-md)] px-3 py-2">
              {duplikatError}
            </p>
          )}
        </div>
      </Modal>

      {/* Modal – hromadné založení revizí */}
      <Modal
        isOpen={hromadne !== null}
        onClose={() => { if (!hromadnePrubeh) setHromadne(null); }}
        title="Hromadně přidat revize"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setHromadne(null)} disabled={!!hromadnePrubeh}>Zrušit</Button>
            <Button onClick={handleHromadne} disabled={!!hromadnePrubeh || hromadneNazvy.length === 0}>
              {hromadnePrubeh
                ? `Zakládám ${hromadnePrubeh.hotovo}/${hromadnePrubeh.celkem}…`
                : `Založit ${pocetRevizi(hromadneNazvy.length)}`}
            </Button>
          </>
        }
      >
        {hromadne && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">
              Každý řádek seznamu bude samostatná revize (vlastní protokol) se společnými údaji níže.
              Revize se zařadí do složky, takže v seznamu budou pohromadě.
            </p>
            <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-4">
              <Input label="Objednatel" value={hromadne.objednatel} onChange={(e) => setHromadne({ ...hromadne, objednatel: e.target.value, zakaznikId: undefined })} required />
              <Input label="Adresa" value={hromadne.adresa} onChange={(e) => setHromadne({ ...hromadne, adresa: e.target.value })} required />
              <SlozkaInput value={hromadne.slozka} onChange={(v) => setHromadne({ ...hromadne, slozka: v })} objednatel={hromadne.objednatel} />
              <Select
                label="Kategorie"
                value={hromadne.kategorieRevize}
                onChange={(e) => setHromadne({ ...hromadne, kategorieRevize: e.target.value as KategorieRevize })}
                options={KATEGORIE_REVIZE.map(k => ({ value: k.value, label: k.label }))}
              />
              <Input type="date" label="Datum revize" value={hromadne.datum} onChange={(e) => setHromadne({ ...hromadne, datum: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Typ"
                  value={hromadne.typRevize}
                  onChange={(e) => setHromadne({ ...hromadne, typRevize: e.target.value as Revize['typRevize'] })}
                  options={[
                    { value: 'pravidelná', label: 'Pravidelná' },
                    { value: 'výchozí', label: 'Výchozí' },
                    { value: 'mimořádná', label: 'Mimořádná' },
                  ]}
                />
                <Select
                  label="Platnost"
                  value={String(hromadne.termin)}
                  onChange={(e) => setHromadne({ ...hromadne, termin: parseInt(e.target.value) })}
                  options={[
                    { value: '6', label: '6 měsíců' },
                    { value: '12', label: '1 rok' },
                    { value: '24', label: '2 roky' },
                    { value: '36', label: '3 roky' },
                    { value: '48', label: '4 roky' },
                    { value: '60', label: '5 let' },
                  ].concat([6, 12, 24, 36, 48, 60].includes(hromadne.termin) ? [] : [{ value: String(hromadne.termin), label: `${hromadne.termin} měsíců` }])}
                />
              </div>
            </div>
            <Textarea
              label={hromadne.kategorieRevize === 'stroje' ? 'Stroje – jeden řádek = jeden stroj' : 'Názvy – jeden řádek = jedna revize'}
              rows={8}
              value={hromadne.nazvy}
              onChange={(e) => setHromadne({ ...hromadne, nazvy: e.target.value })}
              placeholder={'Lis CNC LP-200\nPásová pila PP-300\nKompresor K-50'}
              hint={`${pocetRevizi(hromadneNazvy.length)} · seznam lze vložit i jako sloupec z Excelu`}
            />
            {hromadnePrubeh && (
              <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden" role="progressbar" aria-valuenow={hromadnePrubeh.hotovo} aria-valuemax={hromadnePrubeh.celkem}>
                <div className="h-full bg-[var(--primary)] transition-all" style={{ width: `${(hromadnePrubeh.hotovo / hromadnePrubeh.celkem) * 100}%` }} />
              </div>
            )}
            {hromadneChyba && (
              <p className="text-xs font-medium text-[var(--danger-text)] bg-[var(--danger-bg)] border border-[var(--danger)]/25 rounded-[var(--radius-md)] px-3 py-2">
                {hromadneChyba}
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* Modal – hromadné nahrání podepsaných zpráv */}
      <Modal
        isOpen={nahrani !== null}
        onClose={() => { if (!nahraniBezi) setNahrani(null); }}
        title="Nahrát podepsané zprávy"
        size="lg"
        footer={(() => {
          const cekajici = nahrani?.filter(r => r.stav === 'ceka').length ?? 0;
          const hotovo = nahrani?.some(r => r.stav === 'ok') ?? false;
          return (
            <>
              <Button variant="secondary" onClick={() => setNahrani(null)} disabled={nahraniBezi}>{hotovo && cekajici === 0 ? 'Zavřít' : 'Zrušit'}</Button>
              {cekajici > 0 && (
                <Button onClick={handleNahrani} disabled={nahraniBezi}>
                  {nahraniBezi ? 'Nahrávám…' : `Nahrát ${cekajici} ${cekajici === 1 ? 'soubor' : cekajici <= 4 ? 'soubory' : 'souborů'}`}
                </Button>
              )}
            </>
          );
        })()}
      >
        {nahrani && (
          <div className="space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">
              Soubory se k revizím přiřadí podle čísla revize v názvu (tak, jak je aplikace stáhla). Server u každého ověří
              elektronický podpis a uloží ho jako originál zprávy.
            </p>
            {nahrani.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">Nebyly vybrány žádné PDF soubory.</p>
            ) : (
              <ul className="divide-y divide-[var(--border-subtle)] border border-[var(--border)] rounded-[var(--radius-md)] max-h-[50vh] overflow-auto">
                {nahrani.map((rd, i) => (
                  <li key={i} className="flex items-start gap-3 px-3 py-2 text-sm">
                    <span className="w-5 flex-shrink-0 text-center" aria-hidden="true">
                      {rd.stav === 'ok' ? '✅' : rd.stav === 'chyba' ? '⚠️' : rd.stav === 'nahravam' ? '⏳' : '📄'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[var(--text)]">{rd.file.name}</p>
                      <p className="text-xs text-[var(--text-secondary)] truncate">
                        {rd.revize ? `→ ${rd.revize.cisloRevize} · ${rd.revize.nazev}` : '→ nepřiřazeno'}
                      </p>
                      {rd.zprava && (
                        <p className={`text-xs ${rd.stav === 'chyba' ? 'text-[var(--danger-text)]' : 'text-[var(--success-text)]'}`}>{rd.zprava}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Modal>

      {/* Modal – přesun do složky / přejmenování složky */}
      <Modal
        isOpen={presun !== null}
        onClose={() => { if (!presunBezi) setPresun(null); }}
        title={presun && presun.ids.length > 1 && presun.puvodni ? `Přejmenovat složku „${presun.puvodni}“` : 'Přesunout do složky'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPresun(null)} disabled={presunBezi}>Zrušit</Button>
            <Button onClick={handlePresun} disabled={presunBezi || !presun || presun.ids.length === 0}>
              {presunBezi ? 'Ukládám…' : 'Uložit'}
            </Button>
          </>
        }
      >
        {presun && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">
              Změní složku u {pocetRevizi(presun.ids.length)}. Prázdné pole = bez složky.
            </p>
            <SlozkaInput value={presun.nova} onChange={(v) => setPresun({ ...presun, nova: v })} objednatel={presun.objednatel} label="Složka" />
            {presunChyba && (
              <p className="text-xs font-medium text-[var(--danger-text)] bg-[var(--danger-bg)] border border-[var(--danger)]/25 rounded-[var(--radius-md)] px-3 py-2">
                {presunChyba}
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* Dropdown portal – mimo všechny overflow/backdrop-filter kontejnery */}
      {openMenuId !== null && openRevize && createPortal(
        <div
          ref={openMenuRef}
          className="fixed w-48 bg-[var(--surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] border border-[var(--border-strong)] p-1 z-[9999]"
          style={{ top: dropdownPos.top, right: dropdownPos.right }}
        >
          <button
            onClick={() => { if (isOfflineId(openRevize.id)) return; setOpenMenuId(null); navigate(`/revize/${openRevize.id}/nahled`); }}
            disabled={isOfflineId(openRevize.id)}
            title={isOfflineId(openRevize.id) ? 'Dostupné po synchronizaci' : undefined}
            className={`w-full text-left px-3 min-h-[36px] rounded-[var(--radius-md)] text-[13px] flex items-center gap-2 ${
              isOfflineId(openRevize.id)
                ? 'text-[var(--text-muted)] opacity-40 cursor-not-allowed'
                : 'text-[var(--text)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <span>👁️</span> Náhled tisku
          </button>
          <div className="border-t border-[var(--border)] my-1" />
          <button
            onClick={() => { setOpenMenuId(null); navigate(`/revize/${openRevize.id}`); }}
            className="w-full text-left px-3 min-h-[36px] rounded-[var(--radius-md)] text-[13px] text-[var(--text)] hover:bg-[var(--bg-hover)] flex items-center gap-2"
          >
            <span>✏️</span> Upravit
          </button>
          <button
            onClick={() => { if (isOfflineId(openRevize.id)) return; setOpenMenuId(null); openDuplikatModal(openRevize.id!, openRevize.cisloRevize); }}
            disabled={isOfflineId(openRevize.id)}
            title={isOfflineId(openRevize.id) ? 'Dostupné po synchronizaci' : undefined}
            className={`w-full text-left px-3 min-h-[36px] rounded-[var(--radius-md)] text-[13px] flex items-center gap-2 ${
              isOfflineId(openRevize.id)
                ? 'text-[var(--text-muted)] opacity-40 cursor-not-allowed'
                : 'text-[var(--text)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <span>📋</span> Kopírovat revizi
          </button>
          <button
            onClick={() => { if (isOfflineId(openRevize.id)) return; setOpenMenuId(null); openPresun([openRevize], slozkaRevize(openRevize), openRevize.objednatel); }}
            disabled={isOfflineId(openRevize.id)}
            className={`w-full text-left px-3 min-h-[36px] rounded-[var(--radius-md)] text-[13px] flex items-center gap-2 ${
              isOfflineId(openRevize.id)
                ? 'text-[var(--text-muted)] opacity-40 cursor-not-allowed'
                : 'text-[var(--text)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <span>📁</span> Přesunout do složky
          </button>
          <button
            onClick={() => { if (isOfflineId(openRevize.id)) return; setOpenMenuId(null); openHistorieModal(openRevize.id!, openRevize.cisloRevize); }}
            disabled={isOfflineId(openRevize.id)}
            title={isOfflineId(openRevize.id) ? 'Dostupné po synchronizaci' : undefined}
            className={`w-full text-left px-3 min-h-[36px] rounded-[var(--radius-md)] text-[13px] flex items-center gap-2 ${
              isOfflineId(openRevize.id)
                ? 'text-[var(--text-muted)] opacity-40 cursor-not-allowed'
                : 'text-[var(--text)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <span>🕐</span> Historie
          </button>
          <div className="border-t border-[var(--border)] my-1" />
          <button
            onClick={() => { setOpenMenuId(null); handleDelete(openRevize.id!, openRevize.cisloRevize); }}
            className="w-full text-left px-3 min-h-[36px] rounded-[var(--radius-md)] text-[13px] text-[var(--danger-text)] hover:bg-[var(--danger-bg)] flex items-center gap-2"
          >
            <span>🗑️</span> Smazat
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}

