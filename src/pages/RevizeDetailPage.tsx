import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button, Card, Input, Select, Modal } from '../components/ui';
import { EditableSelect, computeVodic } from './RevizeDetail/RozvadeceTab';
import { TYPY_KABELU, PRUREZY } from './RevizeDetail/RozvadeceTab';
import { revizeService, rozvadecService, zavadaService, mistnostService, okruhService, pristrojService, revizePristrojService, zarizeniService, firmaService, zavadaKatalogService, nastaveniService, zakazniciService, predvolenyTextService } from '../services/database';
import type { Revize, Rozvadec, Zavada, Mistnost, Okruh, MericiPristroj, Zarizeni, Firma, ZavadaKatalog, Nastaveni, Zakaznik, PredvolenyText } from '../types';

export function RevizeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [revize, setRevize] = useState<Revize | null>(null);
  const [rozvadece, setRozvadece] = useState<Rozvadec[]>([]);
  const [zavady, setZavady] = useState<Zavada[]>([]);
  const [mistnosti, setMistnosti] = useState<Mistnost[]>([]);
  const [isRozvadecModalOpen, setIsRozvadecModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'dokumentace' | 'rozvadece' | 'zavady' | 'mistnosti'>('info');
  
  // Rozvaděč detail state
  const [selectedRozvadec, setSelectedRozvadec] = useState<Rozvadec | null>(null);
  const [okruhy, setOkruhy] = useState<Okruh[]>([]);
  const [isOkruhModalOpen, setIsOkruhModalOpen] = useState(false);
  const [editingOkruh, setEditingOkruh] = useState<Okruh | null>(null);
  const [okruhyCounts, setOkruhyCounts] = useState<Record<number, number>>({});
  const [draggedOkruh, setDraggedOkruh] = useState<Okruh | null>(null);

  // Měřící přístroje
  const [pouzitePristroje, setPouzitePristroje] = useState<MericiPristroj[]>([]);
  const [vsechnyPristroje, setVsechnyPristroje] = useState<MericiPristroj[]>([]);
  const [isPristrojModalOpen, setIsPristrojModalOpen] = useState(false);

  // Firmy
  const [firmy, setFirmy] = useState<Firma[]>([]);
  const [selectedFirmaId, setSelectedFirmaId] = useState<string>('');
  
  // Nastavení (pro výchozí firmu)
  const [nastaveni, setNastaveni] = useState<Nastaveni | null>(null);

  // Zákazníci
  const [zakaznici, setZakaznici] = useState<Zakaznik[]>([]);
  const [selectedZakaznikId, setSelectedZakaznikId] = useState<string>('');

  // Závady
  const [isZavadaModalOpen, setIsZavadaModalOpen] = useState(false);
  const [editingZavada, setEditingZavada] = useState<Zavada | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [katalogZavad, setKatalogZavad] = useState<ZavadaKatalog[]>([]);
  const [selectedKatalogZavada, setSelectedKatalogZavada] = useState<string>('');

  // Historie revizí
  const [historie, setHistorie] = useState<Partial<Revize>[]>([]);
  const [showHistorie, setShowHistorie] = useState(false);
  const [isDuplikatModalOpen, setIsDuplikatModalOpen] = useState(false);
  const [duplikatCislo, setDuplikatCislo] = useState('');
  const [duplikatTyp, setDuplikatTyp] = useState<'navazujici' | 'duplikat'>('navazujici');
  const [isDuplikating, setIsDuplikating] = useState(false);

  const [zavadaFormData, setZavadaFormData] = useState({
    popis: '',
    zavaznost: 'C2' as Zavada['zavaznost'],
    stav: 'otevřená' as Zavada['stav'],
    rozvadecId: undefined as number | undefined,
    mistnostId: undefined as number | undefined,
    poznamka: '',
    fotky: [] as string[],
  });

  const [formData, setFormData] = useState<Partial<Revize>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vlastniTexty, setVlastniTexty] = useState<PredvolenyText[]>([]);
  const [rozvadecFormData, setRozvadecFormData] = useState({
    nazev: '',
    oznaceni: '',
    umisteni: '',
    typRozvadece: '',
    stupenKryti: 'IP20',
    poznamka: '',
  });

  // Místnosti
  const [isMistnostModalOpen, setIsMistnostModalOpen] = useState(false);
  const [editingMistnost, setEditingMistnost] = useState<Mistnost | null>(null);
  const [selectedMistnost, setSelectedMistnost] = useState<Mistnost | null>(null);
  const [zarizeni, setZarizeni] = useState<Zarizeni[]>([]);
  const [zarizeniCounts, setZarizeniCounts] = useState<Record<number, number>>({});
  const [isZarizeniModalOpen, setIsZarizeniModalOpen] = useState(false);
  const [editingZarizeni, setEditingZarizeni] = useState<Zarizeni | null>(null);
  const [mistnostFormData, setMistnostFormData] = useState({
    nazev: '',
    patro: '',
    poznamka: '',
  });
  const [zarizeniFormData, setZarizeniFormData] = useState({
    nazev: '',
    oznaceni: '',
    pocetKs: 1,
    trida: 'I' as Zarizeni['trida'],
    prikonW: undefined as number | undefined,
    ochranaPredDotykem: '',
    stav: 'nekontrolováno' as Zarizeni['stav'],
    poznamka: '',
  });

  const [okruhFormData, setOkruhFormData] = useState({
    cislo: 1,
    nazev: '',
    jisticTyp: 'B',
    jisticProud: '16A',
    pocetFazi: 1,
    typKabelu: 'CYKY',
    pocetZil: '3',
    prurez: '2,5',
    izolacniOdpor: '',
    impedanceSmycky: '',
    impedanceSmyckyMax: false,
    poznamka: '',
  });

  useEffect(() => {
    if (id) {
      loadData(parseInt(id));
    }
  }, [id]);

  // Ctrl+S = uložit, Ctrl+D = otevřít dialog duplikace
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        setDuplikatCislo(generateCisloRevize());
        setDuplikatTyp('navazujici');
        setIsDuplikatModalOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  });

  const loadData = async (revizeId: number) => {
    setLoading(true);
    setError(null);
    try {
      const revizeData = await revizeService.getById(revizeId);
      if (revizeData) {
        setRevize(revizeData);
        setFormData(revizeData);
        const rozvadeceData = await rozvadecService.getByRevize(revizeId);
        setRozvadece(rozvadeceData);
        setZavady(await zavadaService.getByRevize(revizeId));
        setMistnosti(await mistnostService.getByRevize(revizeId));
        
        // Načíst počty okruhů pro každý rozvaděč
        const counts: Record<number, number> = {};
        for (const roz of rozvadeceData) {
          if (roz.id) {
            const okruhyRoz = await okruhService.getByRozvadec(roz.id);
            counts[roz.id] = okruhyRoz.length;
          }
        }
        setOkruhyCounts(counts);

        // Načíst měřící přístroje
        const pristroje = await revizePristrojService.getByRevize(revizeId);
        setPouzitePristroje(pristroje);
        const allPristroje = await pristrojService.getAll();
        setVsechnyPristroje(allPristroje);

        // Načíst firmy
        const firmyData = await firmaService.getAll();
        setFirmy(firmyData);

        // Načíst počty zařízení pro každou místnost
        const mistnostiData = await mistnostService.getByRevize(revizeId);
        setMistnosti(mistnostiData);
        const zarizeniCountsData: Record<number, number> = {};
        for (const mist of mistnostiData) {
          if (mist.id) {
            const zarizeniMist = await zarizeniService.getByMistnost(mist.id);
            zarizeniCountsData[mist.id] = zarizeniMist.length;
          }
        }
        setZarizeniCounts(zarizeniCountsData);

        // Načíst katalog závad
        const katalogData = await zavadaKatalogService.getAll();
        setKatalogZavad(katalogData);
        
        // Načíst nastavení (pro výchozí firmu)
        const nastaveniData = await nastaveniService.get();
        setNastaveni(nastaveniData || null);
        
        // Načíst zákazníky (může selhat pokud tabulka ještě neexistuje)
        try {
          const zakazniciData = await zakazniciService.getAll();
          setZakaznici(zakazniciData);
          if (revizeData.zakaznikId) {
            setSelectedZakaznikId(revizeData.zakaznikId.toString());
          }
        } catch (zakazniciError) {
          console.warn('Nepodařilo se načíst zákazníky:', zakazniciError);
          setZakaznici([]);
        }

        // Načíst vlastní předvolené texty
        try {
          const textyData = await predvolenyTextService.getAll();
          setVlastniTexty(textyData);
        } catch {
          setVlastniTexty([]);
        }
      } else {
        setError('Revize nebyla nalezena');
      }
    } catch (err) {
      console.error('Chyba při načítání revize:', err);
      setError(err instanceof Error ? err.message : 'Chyba při načítání dat');
    } finally {
      setLoading(false);
    }
  };

  // Načíst historii navazujících revizí
  const loadHistorie = async (revizeId: number) => {
    try {
      const data = await revizeService.getHistorie(revizeId);
      setHistorie(data);
    } catch {
      setHistorie([]);
    }
  };

  // Generování čísla revize (rrrrmmddhhmm)
  const generateCisloRevize = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `${yyyy}${mm}${dd}${hh}${min}`;
  };

  // Duplikovat revizi pro následnou periodickou revizi
  const handleDuplikovat = async () => {
    if (!revize?.id || !duplikatCislo.trim()) return;
    setIsDuplikating(true);
    try {
      const result = await revizeService.duplikovat(revize.id, duplikatCislo.trim(), duplikatTyp);
      setIsDuplikatModalOpen(false);
      setDuplikatCislo('');
      navigate(`/revize/${result.id}`);
    } catch (err) {
      alert('Chyba při duplikaci: ' + (err instanceof Error ? err.message : 'Neznámá chyba'));
    } finally {
      setIsDuplikating(false);
    }
  };

  const handleSave = async () => {
    if (revize?.id) {
      let dataToSave = { ...formData };
      
      // Pokud se stav změní na "dokončeno", vypočítat platnost
      if (formData.stav === 'dokončeno' && revize.stav !== 'dokončeno') {
        const baseDate = formData.datumDokonceni ? new Date(formData.datumDokonceni) : new Date();
        const platnostDo = new Date(baseDate);
        platnostDo.setMonth(platnostDo.getMonth() + (formData.termin || 36));
        dataToSave.datumPlatnosti = platnostDo.toISOString().split('T')[0];
        dataToSave.datumVypracovani = new Date().toISOString().split('T')[0];
      }
      
      await revizeService.update(revize.id, dataToSave);
      loadData(revize.id);
    }
  };

  const handleAddRozvadec = async (e: React.FormEvent) => {
    e.preventDefault();
    if (revize?.id) {
      await rozvadecService.create({
        ...rozvadecFormData,
        revizeId: revize.id,
      });
      setIsRozvadecModalOpen(false);
      setRozvadecFormData({
        nazev: '',
        oznaceni: '',
        umisteni: '',
        typRozvadece: '',
        stupenKryti: 'IP20',
        poznamka: '',
      });
      loadData(revize.id);
    }
  };

  const handleDeleteRozvadec = async (rozvadecId: number) => {
    if (window.confirm('Opravdu chcete smazat tento rozvaděč?')) {
      await rozvadecService.delete(rozvadecId);
      if (selectedRozvadec?.id === rozvadecId) {
        setSelectedRozvadec(null);
        setOkruhy([]);
      }
      if (revize?.id) loadData(revize.id);
    }
  };

  const handleSelectRozvadec = async (rozvadec: Rozvadec) => {
    if (selectedRozvadec?.id === rozvadec.id) {
      setSelectedRozvadec(null);
      setOkruhy([]);
    } else {
      setSelectedRozvadec(rozvadec);
      if (rozvadec.id) {
        const okruhyData = await okruhService.getByRozvadec(rozvadec.id);
        setOkruhy(okruhyData);
      }
    }
  };

  const handleAddOkruh = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRozvadec?.id) {
      const { impedanceSmyckyMax, typKabelu, pocetZil, prurez, ...okruhData } = okruhFormData;
      const saveData = {
        ...okruhData,
        typKabelu: typKabelu || undefined,
        pocetZil: pocetZil || undefined,
        prurez: prurez || undefined,
        vodic: computeVodic(typKabelu, pocetZil, prurez) || undefined,
        izolacniOdpor: okruhData.izolacniOdpor || undefined,
        impedanceSmycky: impedanceSmyckyMax && okruhData.impedanceSmycky ? `max. ${okruhData.impedanceSmycky}` : okruhData.impedanceSmycky || undefined,
      };
      if (editingOkruh?.id) {
        await okruhService.update(editingOkruh.id, saveData);
      } else {
        await okruhService.create({
          ...saveData,
          rozvadecId: selectedRozvadec.id,
        });
      }
      setIsOkruhModalOpen(false);
      setEditingOkruh(null);
      resetOkruhForm();
      const okruhyData = await okruhService.getByRozvadec(selectedRozvadec.id);
      setOkruhy(okruhyData);
      setOkruhyCounts(prev => ({ ...prev, [selectedRozvadec.id!]: okruhyData.length }));
    }
  };

  const resetOkruhForm = () => {
    const nextCislo = okruhy.length > 0 ? Math.max(...okruhy.map(o => o.cislo)) + 1 : 1;
    setOkruhFormData({
      cislo: nextCislo,
      nazev: '',
      jisticTyp: 'B',
      jisticProud: '16A',
      pocetFazi: 1,
      typKabelu: 'CYKY',
      pocetZil: '3',
      prurez: '2,5',
      izolacniOdpor: '',
      impedanceSmycky: '',
      impedanceSmyckyMax: false,
      poznamka: '',
    });
  };

  // Závady handlers
  const resetZavadaForm = () => {
    setZavadaFormData({
      popis: '',
      zavaznost: 'C2',
      stav: 'otevřená',
      rozvadecId: undefined,
      mistnostId: undefined,
      poznamka: '',
      fotky: [],
    });
    setEditingZavada(null);
    setSelectedKatalogZavada('');
  };

  // Handler pro výběr závady z katalogu
  const handleSelectFromKatalog = (katalogId: string) => {
    setSelectedKatalogZavada(katalogId);
    if (katalogId) {
      const zavada = katalogZavad.find(z => z.id?.toString() === katalogId);
      if (zavada) {
        setZavadaFormData(prev => ({
          ...prev,
          popis: zavada.popis,
          zavaznost: zavada.zavaznost,
          // Přidáme odkaz na normu do poznámky
          poznamka: zavada.norma 
            ? `${zavada.norma}${zavada.clanek ? ` ${zavada.clanek}` : ''}${zavada.zneniClanku ? `\n${zavada.zneniClanku}` : ''}`
            : '',
        }));
      }
    }
  };

  // Automaticky aktualizuje výsledek revize na základě závad
  const updateRevizeVysledek = async (revizeId: number) => {
    const zavadyRevize = await zavadaService.getByRevize(revizeId);
    // Hledáme nevyřešené závady C1 nebo C2
    const hasC1orC2 = zavadyRevize.some(
      z => (z.zavaznost === 'C1' || z.zavaznost === 'C2') && z.stav !== 'vyřešená'
    );
    
    if (hasC1orC2) {
      await revizeService.update(revizeId, { vysledek: 'neschopno' });
    } else {
      // Pouze C3 nebo žádné závady = schopno
      await revizeService.update(revizeId, { vysledek: 'schopno' });
    }
  };

  const handleAddZavada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (revize?.id) {
      if (editingZavada?.id) {
        await zavadaService.update(editingZavada.id, {
          ...zavadaFormData,
          datumVyreseni: zavadaFormData.stav === 'vyřešená' ? new Date() : undefined,
        });
      } else {
        await zavadaService.create({
          ...zavadaFormData,
          revizeId: revize.id,
          datumZjisteni: new Date(),
        });
      }
      // Aktualizovat výsledek revize
      await updateRevizeVysledek(revize.id);
      setIsZavadaModalOpen(false);
      resetZavadaForm();
      loadData(revize.id);
    }
  };

  const handleEditZavada = (zavada: Zavada) => {
    setEditingZavada(zavada);
    setZavadaFormData({
      popis: zavada.popis,
      zavaznost: zavada.zavaznost,
      stav: zavada.stav,
      rozvadecId: zavada.rozvadecId,
      mistnostId: zavada.mistnostId,
      poznamka: zavada.poznamka || '',
      fotky: zavada.fotky || [],
    });
    setIsZavadaModalOpen(true);
  };

  const handleDeleteZavada = async (zavadaId: number) => {
    if (window.confirm('Opravdu chcete smazat tuto závadu?')) {
      await zavadaService.delete(zavadaId);
      if (revize?.id) {
        await updateRevizeVysledek(revize.id);
        loadData(revize.id);
      }
    }
  };

  // Místnosti handlers
  const resetMistnostForm = () => {
    setMistnostFormData({
      nazev: '',
      patro: '',
      poznamka: '',
    });
    setEditingMistnost(null);
  };

  const handleAddMistnost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (revize?.id) {
      if (editingMistnost?.id) {
        await mistnostService.update(editingMistnost.id, mistnostFormData);
      } else {
        await mistnostService.create({
          ...mistnostFormData,
          revizeId: revize.id,
        });
      }
      setIsMistnostModalOpen(false);
      resetMistnostForm();
      loadData(revize.id);
    }
  };

  const handleEditMistnost = (mistnost: Mistnost) => {
    setEditingMistnost(mistnost);
    setMistnostFormData({
      nazev: mistnost.nazev,
      patro: mistnost.patro || '',
      poznamka: mistnost.poznamka || '',
    });
    setIsMistnostModalOpen(true);
  };

  const handleDeleteMistnost = async (mistnostId: number) => {
    if (window.confirm('Opravdu chcete smazat tuto místnost včetně všech zařízení?')) {
      await mistnostService.delete(mistnostId);
      if (selectedMistnost?.id === mistnostId) {
        setSelectedMistnost(null);
        setZarizeni([]);
      }
      if (revize?.id) loadData(revize.id);
    }
  };

  const handleSelectMistnost = async (mistnost: Mistnost) => {
    if (selectedMistnost?.id === mistnost.id) {
      setSelectedMistnost(null);
      setZarizeni([]);
    } else {
      setSelectedMistnost(mistnost);
      if (mistnost.id) {
        const zarizeniData = await zarizeniService.getByMistnost(mistnost.id);
        setZarizeni(zarizeniData);
      }
    }
  };

  // Zařízení handlers
  const resetZarizeniForm = () => {
    setZarizeniFormData({
      nazev: '',
      oznaceni: '',
      pocetKs: 1,
      trida: 'I',
      prikonW: undefined,
      ochranaPredDotykem: '',
      stav: 'nekontrolováno',
      poznamka: '',
    });
    setEditingZarizeni(null);
  };

  const handleAddZarizeni = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMistnost?.id) {
      if (editingZarizeni?.id) {
        await zarizeniService.update(editingZarizeni.id, zarizeniFormData);
      } else {
        await zarizeniService.create({
          ...zarizeniFormData,
          mistnostId: selectedMistnost.id,
        });
      }
      setIsZarizeniModalOpen(false);
      resetZarizeniForm();
      // Reload zařízení
      const zarizeniData = await zarizeniService.getByMistnost(selectedMistnost.id);
      setZarizeni(zarizeniData);
      setZarizeniCounts(prev => ({ ...prev, [selectedMistnost.id!]: zarizeniData.length }));
    }
  };

  const handleEditZarizeni = (zar: Zarizeni) => {
    setEditingZarizeni(zar);
    setZarizeniFormData({
      nazev: zar.nazev,
      oznaceni: zar.oznaceni || '',
      pocetKs: zar.pocetKs || 1,
      trida: zar.trida || 'I',
      prikonW: zar.prikonW,
      ochranaPredDotykem: zar.ochranaPredDotykem || '',
      stav: zar.stav,
      poznamka: zar.poznamka || '',
    });
    setIsZarizeniModalOpen(true);
  };

  const handleDeleteZarizeni = async (zarizeniId: number) => {
    if (window.confirm('Opravdu chcete smazat toto zařízení?')) {
      await zarizeniService.delete(zarizeniId);
      if (selectedMistnost?.id) {
        const zarizeniData = await zarizeniService.getByMistnost(selectedMistnost.id);
        setZarizeni(zarizeniData);
        setZarizeniCounts(prev => ({ ...prev, [selectedMistnost.id!]: zarizeniData.length }));
      }
    }
  };

  const handleEditOkruh = (okruh: Okruh) => {
    setEditingOkruh(okruh);
    let typKabelu = okruh.typKabelu || '';
    let pocetZil = okruh.pocetZil || '';
    let prurez = okruh.prurez || '';
    if (!typKabelu && !pocetZil && !prurez && okruh.vodic) {
      const m3 = okruh.vodic.match(/^(\S+)\s+(\d+)x(\S+)$/);
      const m2 = okruh.vodic.match(/^(\S+)\s+(\S+)$/);
      const m1 = okruh.vodic.match(/^(\d+)x(\S+)$/);
      if (m3) { typKabelu = m3[1]; pocetZil = m3[2]; prurez = m3[3]; }
      else if (m2) { typKabelu = m2[1]; prurez = m2[2]; }
      else if (m1) { pocetZil = m1[1]; prurez = m1[2]; }
      else { prurez = okruh.vodic; }
    }
    setOkruhFormData({
      cislo: okruh.cislo,
      nazev: okruh.nazev,
      jisticTyp: okruh.jisticTyp,
      jisticProud: okruh.jisticProud,
      pocetFazi: okruh.pocetFazi || 1,
      typKabelu, pocetZil, prurez,
      izolacniOdpor: okruh.izolacniOdpor || '',
      impedanceSmycky: okruh.impedanceSmycky?.replace(/^max\.\s*/, '') || '',
      impedanceSmyckyMax: okruh.impedanceSmycky?.startsWith('max.') || false,
      poznamka: okruh.poznamka || '',
    });
    setIsOkruhModalOpen(true);
  };

  const handleDeleteOkruh = async (okruhId: number) => {
    if (window.confirm('Opravdu chcete smazat tento okruh?')) {
      await okruhService.delete(okruhId);
      if (selectedRozvadec?.id) {
        const okruhyData = await okruhService.getByRozvadec(selectedRozvadec.id);
        setOkruhy(okruhyData);
        setOkruhyCounts(prev => ({ ...prev, [selectedRozvadec.id!]: okruhyData.length }));
      }
    }
  };

  const handleDuplicateOkruh = async (okruh: Okruh) => {
    if (selectedRozvadec?.id) {
      const nextCislo = okruhy.length > 0 ? Math.max(...okruhy.map(o => o.cislo)) + 1 : 1;
      await okruhService.create({
        rozvadecId: selectedRozvadec.id,
        cislo: nextCislo,
        nazev: okruh.nazev,
        jisticTyp: okruh.jisticTyp,
        jisticProud: okruh.jisticProud,
        pocetFazi: okruh.pocetFazi || 1,
        typKabelu: okruh.typKabelu,
        pocetZil: okruh.pocetZil,
        prurez: okruh.prurez,
        vodic: okruh.vodic,
        izolacniOdpor: okruh.izolacniOdpor,
        impedanceSmycky: okruh.impedanceSmycky,
        poznamka: okruh.poznamka,
      });
      const okruhyData = await okruhService.getByRozvadec(selectedRozvadec.id);
      setOkruhy(okruhyData);
      setOkruhyCounts(prev => ({ ...prev, [selectedRozvadec.id!]: okruhyData.length }));
    }
  };

  const handleDragStart = (okruh: Okruh) => {
    setDraggedOkruh(okruh);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetOkruh: Okruh) => {
    if (!draggedOkruh || draggedOkruh.id === targetOkruh.id) {
      setDraggedOkruh(null);
      return;
    }

    const sortedOkruhy = [...okruhy].sort((a, b) => a.cislo - b.cislo);
    const draggedIndex = sortedOkruhy.findIndex(o => o.id === draggedOkruh.id);
    const targetIndex = sortedOkruhy.findIndex(o => o.id === targetOkruh.id);

    // Přesunout okruh v poli
    const [removed] = sortedOkruhy.splice(draggedIndex, 1);
    sortedOkruhy.splice(targetIndex, 0, removed);

    // Přečíslovat všechny okruhy
    const updates = sortedOkruhy.map((o, index) => ({
      ...o,
      cislo: index + 1,
    }));

    // Uložit do databáze
    for (const okruh of updates) {
      if (okruh.id) {
        await okruhService.update(okruh.id, { cislo: okruh.cislo });
      }
    }

    setOkruhy(updates);
    setDraggedOkruh(null);
  };

  const handleDragEnd = () => {
    setDraggedOkruh(null);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-[var(--text-muted)]">Načítání revize...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        <p className="text-red-600 font-medium mb-2">{error}</p>
        <Button variant="secondary" onClick={() => navigate('/revize')}>
          ← Zpět na seznam revizí
        </Button>
      </div>
    );
  }

  if (!revize) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-muted)]">Revize nebyla nalezena</p>
        <Button variant="secondary" onClick={() => navigate('/revize')} className="mt-4">
          ← Zpět na seznam revizí
        </Button>
      </div>
    );
  }

  const tabs = [
    { id: 'info', label: 'Základní údaje', icon: '📋' },
    { id: 'dokumentace', label: 'Revidované zařízení', icon: '🔌' },
    { id: 'rozvadece', label: `Rozvaděče (${rozvadece.length})`, icon: '⚡' },
    { id: 'zavady', label: `Závady (${zavady.length})`, icon: '⚠️' },
    { id: 'mistnosti', label: `Místnosti (${mistnosti.length})`, icon: '🏠' },
  ];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm mb-1">
            <Link to="/revize" className="hover:text-blue-600">Revize</Link>
            <span>/</span>
            <span>{revize.cisloRevize}</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)]">{revize.nazev}</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" onClick={() => navigate('/revize')}>
            ← Zpět
          </Button>
          <Button variant="secondary" onClick={() => { setDuplikatCislo(generateCisloRevize()); setDuplikatTyp('navazujici'); setIsDuplikatModalOpen(true); }}>
            📋 Kopírovat revizi
          </Button>
          <Button variant="secondary" onClick={async () => { if (revize?.id) { await loadHistorie(revize.id); setShowHistorie(p => !p); } }}>
            🕐 Historie
          </Button>
          <Button variant="success" onClick={() => navigate(`/revize/${id}/nahled`)}>
            🔍 Náhled
          </Button>
        </div>
      </div>

      {/* Historie navazujících revizí */}
      {showHistorie && (
        <div className="bg-[var(--surface)] border border-[var(--border-medium)] rounded-lg shadow-sm overflow-hidden">
          <div className="bg-[var(--section-header-bg)] text-[var(--text)] px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
            <span>🕐 Historie revizí tohoto objektu</span>
            <button onClick={() => setShowHistorie(false)} className="text-[var(--text)] hover:text-white">✕</button>
          </div>
          <div className="p-4">
            {historie.length === 0 ? (
              <div className="text-sm text-[var(--text-muted)] text-center py-4">
                <div className="text-2xl mb-2">📭</div>
                <p>Tato revize nemá žádné navazující ani předchozí revize.</p>
                <p className="text-xs mt-1 text-[var(--text-secondary)]">Použijte tlačítko „📋 Kopírovat revizi" s typem „Navazující" pro vytvoření propojené revize.</p>
              </div>
            ) : (
            <div className="relative">
              {/* Vertikální čára */}
              <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-[var(--border-medium)]"></div>
              <div className="space-y-3">
                {historie.map((h, idx) => {
                  const isCurrent = h.id === revize?.id;
                  return (
                    <div key={h.id} className={`flex items-start gap-3 pl-1 ${isCurrent ? 'opacity-100' : 'opacity-70'}`}>
                      {/* Tečka na timeline */}
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-[10px] z-10 ${
                        isCurrent
                          ? 'bg-blue-500 border-blue-600 text-white'
                          : h.stav === 'dokončeno' || h.stav === 'schváleno'
                            ? 'bg-emerald-100 border-emerald-400 text-emerald-600'
                            : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)]'
                      }`}>
                        {idx + 1}
                      </div>
                      {/* Obsah */}
                      <div className={`flex-1 rounded border px-3 py-2 text-sm ${isCurrent ? 'bg-blue-50 border-blue-200' : 'bg-[var(--surface)] border-[var(--border-medium)]'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-[var(--text)]">
                            {h.cisloRevize}
                            {isCurrent && <span className="ml-2 text-xs text-blue-600">(aktuální)</span>}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
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
                            onClick={() => navigate(`/revize/${h.id}`)}
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
          </div>
        </div>
      )}

      {/* Modal pro duplikaci revize */}
      <Modal isOpen={isDuplikatModalOpen} onClose={() => setIsDuplikatModalOpen(false)} title="Kopie revize">
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Kopie této revize s novým číslem zprávy. Budou zkopírovány všechny údaje (rozvaděče, okruhy, místnosti, přístroje), ale ne závady.
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
                <p className="text-xs text-[var(--text-muted)] mt-1">Propojena s historií. Pro periodické revize stejného objektu.</p>
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
                <p className="text-xs text-[var(--text-muted)] mt-1">Samostatná kopie bez vazby na historii.</p>
              </button>
            </div>
          </div>

          <Input
            label="Číslo nové revizní zprávy"
            value={duplikatCislo}
            onChange={(e) => setDuplikatCislo(e.target.value)}
            placeholder="např. 202603281200"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsDuplikatModalOpen(false)}>Zrušit</Button>
            <Button onClick={handleDuplikovat} disabled={isDuplikating || !duplikatCislo.trim()}>
              {isDuplikating ? 'Vytvářím...' : duplikatTyp === 'navazujici' ? '🔗 Vytvořit navazující' : '📋 Vytvořit duplikát'}
            </Button>
          </div>
        </div>
      </Modal>

      <div className="flex gap-2 border-b border-[var(--glass-border)] overflow-x-auto scrollbar-thin" style={{ background: 'rgba(0,0,0,0.15)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 font-medium transition-all duration-200 border-b-2 whitespace-nowrap flex-shrink-0 ${
              activeTab === tab.id
                ? 'border-[var(--primary)] text-[var(--nav-text-active)] drop-shadow-[0_0_6px_rgba(43,136,255,0.5)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text)]'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'info' && (
        <div className="bg-[var(--surface)] border border-[var(--border-medium)] rounded-lg shadow-sm overflow-hidden max-w-4xl mx-auto">

          {/* Záhlaví */}
          <div className="flex items-center px-4 py-2 bg-[var(--bg-surface)] border-b border-[var(--border)]">
            <span className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wide">Revizní zpráva č. {revize.cisloRevize}</span>
          </div>

          {/* ═══ SEKCE 1: IDENTIFIKACE ═══ */}
          <div className="bg-[var(--section-header-bg)] text-[var(--text)] px-4 py-1.5 text-xs font-bold uppercase tracking-wider">Identifikace revize</div>
          <table className="w-full text-sm border-collapse">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="w-[180px] px-4 py-2 bg-[var(--bg-surface)] font-semibold text-[var(--text-secondary)] border-r border-[var(--border)]">Číslo revize</td>
                <td className="px-4 py-2">
                  <input className="w-full bg-[var(--bg-surface)] px-2 py-1 rounded text-sm border border-[var(--border)] cursor-not-allowed" value={formData.cisloRevize || ''} disabled />
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-2 bg-[var(--bg-surface)] font-semibold text-[var(--text-secondary)] border-r border-[var(--border)]">Název objektu</td>
                <td className="px-4 py-2">
                  <input className="w-full px-2 py-1 rounded text-sm border border-[var(--border-input)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none" value={formData.nazev || ''} onChange={(e) => setFormData({ ...formData, nazev: e.target.value })} />
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-2 bg-[var(--bg-surface)] font-semibold text-[var(--text-secondary)] border-r border-[var(--border)]">Adresa objektu</td>
                <td className="px-4 py-2">
                  <input className="w-full px-2 py-1 rounded text-sm border border-[var(--border-input)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none" value={formData.adresa || ''} onChange={(e) => setFormData({ ...formData, adresa: e.target.value })} />
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-2 bg-[var(--bg-surface)] font-semibold text-[var(--text-secondary)] border-r border-[var(--border)]">Kategorie</td>
                <td className="px-4 py-2">
                  <select className="px-2 py-1 rounded text-sm border border-[var(--border-input)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none" value={formData.kategorieRevize || 'elektro'} onChange={(e) => setFormData({ ...formData, kategorieRevize: e.target.value as any })}>
                    <option value="elektro">⚡ Elektrické instalace</option>
                    <option value="hromosvod">🌩️ Hromosvody</option>
                    <option value="stroje">⚙️ Strojní zařízení</option>
                  </select>
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-2 bg-[var(--bg-surface)] font-semibold text-[var(--text-secondary)] border-r border-[var(--border)]">Typ revize</td>
                <td className="px-4 py-2">
                  <select className="px-2 py-1 rounded text-sm border border-[var(--border-input)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none" value={formData.typRevize || ''} onChange={(e) => setFormData({ ...formData, typRevize: e.target.value as any })}>
                    <option value="pravidelná">Pravidelná</option>
                    <option value="výchozí">Výchozí</option>
                    <option value="mimořádná">Mimořádná</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ═══ SEKCE 2: OBJEDNATEL ═══ */}
          <div className="bg-[var(--section-header-bg)] text-[var(--text)] px-4 py-1.5 text-xs font-bold uppercase tracking-wider">Objednatel / Provozovatel</div>
          <table className="w-full text-sm border-collapse">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="w-[180px] px-4 py-2 bg-[var(--bg-surface)] font-semibold text-[var(--text-secondary)] border-r border-[var(--border)]">Objednatel</td>
                <td className="px-4 py-2">
                  <input className="w-full px-2 py-1 rounded text-sm border border-[var(--border-input)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none" placeholder="Nebo vyberte zákazníka níže" value={formData.objednatel || ''} onChange={(e) => setFormData({ ...formData, objednatel: e.target.value })} />
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-2 bg-[var(--bg-surface)] font-semibold text-[var(--text-secondary)] border-r border-[var(--border)]">Ze zákazníků</td>
                <td className="px-4 py-2">
                  <select className="w-full px-2 py-1 rounded text-sm border border-[var(--border-input)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none" value={selectedZakaznikId} onChange={(e) => {
                    const zakaznikId = e.target.value;
                    setSelectedZakaznikId(zakaznikId);
                    if (zakaznikId) { const zakaznik = zakaznici.find(z => z.id === parseInt(zakaznikId)); if (zakaznik) setFormData({ ...formData, objednatel: zakaznik.nazev, zakaznikId: zakaznik.id }); }
                    else { setFormData({ ...formData, zakaznikId: undefined }); }
                  }}>
                    <option value="">-- Vyberte zákazníka --</option>
                    {zakaznici.filter(z => z.id !== undefined).map(z => <option key={z.id} value={z.id!.toString()}>{z.nazev}{z.adresa ? ` (${z.adresa})` : ''}</option>)}
                  </select>
                  {selectedZakaznikId && (() => {
                    const zakaznik = zakaznici.find(z => z.id === parseInt(selectedZakaznikId));
                    return zakaznik ? (
                      <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-[var(--text-muted)] bg-blue-50 rounded p-2">
                        {zakaznik.adresa && <span>Adresa: {zakaznik.adresa}</span>}
                        {zakaznik.ico && <span>IČO: {zakaznik.ico}</span>}
                        {zakaznik.kontaktOsoba && <span>Kontakt: {zakaznik.kontaktOsoba}</span>}
                        {zakaznik.telefon && <span>Tel: {zakaznik.telefon}</span>}
                      </div>
                    ) : null;
                  })()}
                </td>
              </tr>
            </tbody>
          </table>

          {/* ═══ SEKCE 3: TERMÍNY ═══ */}
          <div className="bg-[var(--section-header-bg)] text-[var(--text)] px-4 py-1.5 text-xs font-bold uppercase tracking-wider">Termíny a data</div>
          <table className="w-full text-sm border-collapse">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="w-[180px] px-4 py-2 bg-[var(--bg-surface)] font-semibold text-[var(--text-secondary)] border-r border-[var(--border)]">Datum revize</td>
                <td className="px-4 py-2"><input type="date" className="px-2 py-1 rounded text-sm border border-[var(--border-input)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none" value={formData.datum || ''} onChange={(e) => setFormData({ ...formData, datum: e.target.value })} /></td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-2 bg-[var(--bg-surface)] font-semibold text-[var(--text-secondary)] border-r border-[var(--border)]">Datum dokončení</td>
                <td className="px-4 py-2"><input type="date" className="px-2 py-1 rounded text-sm border border-[var(--border-input)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none" value={formData.datumDokonceni || ''} onChange={(e) => setFormData({ ...formData, datumDokonceni: e.target.value })} /></td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-2 bg-[var(--bg-surface)] font-semibold text-[var(--text-secondary)] border-r border-[var(--border)]">Datum vypracování</td>
                <td className="px-4 py-2"><input type="date" className="px-2 py-1 rounded text-sm border border-[var(--border-input)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none" value={formData.datumVypracovani || ''} onChange={(e) => setFormData({ ...formData, datumVypracovani: e.target.value })} /></td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-2 bg-[var(--bg-surface)] font-semibold text-[var(--text-secondary)] border-r border-[var(--border)]">Lhůta platnosti</td>
                <td className="px-4 py-2">
                  <select className="px-2 py-1 rounded text-sm border border-[var(--border-input)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none" value={String(formData.termin || 36)} onChange={(e) => setFormData({ ...formData, termin: parseInt(e.target.value) })}>
                    <option value="6">6 měsíců</option><option value="12">1 rok</option><option value="24">2 roky</option><option value="36">3 roky</option><option value="48">4 roky</option><option value="60">5 let</option>
                  </select>
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-2 bg-[var(--bg-surface)] font-semibold text-[var(--text-secondary)] border-r border-[var(--border)]">Platnost do</td>
                <td className="px-4 py-2"><span className={`font-medium ${formData.datumPlatnosti ? '' : 'text-[var(--text-secondary)]'}`}>{formData.datumPlatnosti ? new Date(formData.datumPlatnosti).toLocaleDateString('cs-CZ') : 'Vypočítá se při dokončení'}</span></td>
              </tr>
            </tbody>
          </table>

          {/* ═══ SEKCE 4: STAV ═══ */}
          <div className="bg-[var(--section-header-bg)] text-[var(--text)] px-4 py-1.5 text-xs font-bold uppercase tracking-wider">Stav a výsledek revize</div>
          <table className="w-full text-sm border-collapse">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="w-[180px] px-4 py-2 bg-[var(--bg-surface)] font-semibold text-[var(--text-secondary)] border-r border-[var(--border)]">Stav</td>
                <td className="px-4 py-2">
                  <select className="px-2 py-1 rounded text-sm border border-[var(--border-input)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none" value={formData.stav || ''} onChange={(e) => setFormData({ ...formData, stav: e.target.value as any })}>
                    <option value="rozpracováno">Rozpracováno</option><option value="dokončeno">Dokončeno</option><option value="schváleno">Schváleno</option>
                  </select>
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-2 bg-[var(--bg-surface)] font-semibold text-[var(--text-secondary)] border-r border-[var(--border)]">Výsledek</td>
                <td className="px-4 py-2">
                  <select className="px-2 py-1 rounded text-sm border border-[var(--border-input)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none" value={formData.vysledek || ''} onChange={(e) => setFormData({ ...formData, vysledek: e.target.value as any })}>
                    <option value="">-- Nevyplněno --</option><option value="schopno">Schopno provozu</option><option value="neschopno">Neschopno provozu</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ═══ SEKCE 5: FIRMA ═══ */}
          <div className="bg-[var(--section-header-bg)] text-[var(--text)] px-4 py-1.5 text-xs font-bold uppercase tracking-wider">Firma provádějící revizi</div>
          <div className="p-4 space-y-3 border-b border-slate-200">
            <select className="w-full px-2 py-1.5 rounded text-sm border border-[var(--border-input)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none" value={selectedFirmaId} onChange={(e) => {
              const firmaId = e.target.value;
              setSelectedFirmaId(firmaId);
              if (firmaId === '') { setFormData({ ...formData, firmaJmeno: '', firmaIco: '', firmaAdresa: '', firmaDic: '' }); }
              else { const firma = firmy.find(f => f.id?.toString() === firmaId); if (firma) setFormData({ ...formData, firmaJmeno: firma.nazev, firmaIco: firma.ico || '', firmaAdresa: firma.adresa || '', firmaDic: firma.dic || '' }); }
            }}>
              <option value="">Použít firmu z nastavení</option>
              {firmy.map(f => <option key={f.id} value={f.id!.toString()}>{f.nazev}</option>)}
            </select>
            <table className="w-full text-sm border border-slate-200 rounded overflow-hidden">
              <tbody>
                <tr className="border-b border-slate-200"><td className="w-[140px] px-3 py-1.5 bg-[var(--bg-surface)] font-semibold text-[var(--text-secondary)] border-r border-[var(--border)] text-xs">Název firmy</td><td className="px-3 py-1.5"><input className="w-full px-2 py-1 rounded text-sm border border-[var(--border-input)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none" placeholder="Ponechte prázdné → firma z nastavení" value={formData.firmaJmeno || ''} onChange={(e) => setFormData({ ...formData, firmaJmeno: e.target.value })} /></td></tr>
                <tr className="border-b border-slate-200"><td className="px-3 py-1.5 bg-[var(--bg-surface)] font-semibold text-[var(--text-secondary)] border-r border-[var(--border)] text-xs">IČO</td><td className="px-3 py-1.5"><input className="w-full px-2 py-1 rounded text-sm border border-[var(--border-input)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none" value={formData.firmaIco || ''} onChange={(e) => setFormData({ ...formData, firmaIco: e.target.value })} /></td></tr>
                <tr className="border-b border-slate-200"><td className="px-3 py-1.5 bg-[var(--bg-surface)] font-semibold text-[var(--text-secondary)] border-r border-[var(--border)] text-xs">Adresa</td><td className="px-3 py-1.5"><input className="w-full px-2 py-1 rounded text-sm border border-[var(--border-input)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none" value={formData.firmaAdresa || ''} onChange={(e) => setFormData({ ...formData, firmaAdresa: e.target.value })} /></td></tr>
                <tr><td className="px-3 py-1.5 bg-[var(--bg-surface)] font-semibold text-[var(--text-secondary)] border-r border-[var(--border)] text-xs">DIČ</td><td className="px-3 py-1.5"><input className="w-full px-2 py-1 rounded text-sm border border-[var(--border-input)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none" value={formData.firmaDic || ''} onChange={(e) => setFormData({ ...formData, firmaDic: e.target.value })} /></td></tr>
              </tbody>
            </table>
            {selectedFirmaId === '' && nastaveni && (nastaveni.firmaJmeno || nastaveni.firmaIco) && (
              <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded p-2">📋 Z nastavení: <strong>{nastaveni.firmaJmeno}</strong> | IČO: {nastaveni.firmaIco || '—'} | {nastaveni.firmaAdresa || '—'}</div>
            )}
            {selectedFirmaId === '' && (!nastaveni || (!nastaveni.firmaJmeno && !nastaveni.firmaIco)) && (
              <p className="text-xs text-amber-600">⚠️ Nemáte výchozí firmu. <Link to="/nastaveni" className="underline font-medium">Nastavení</Link></p>
            )}
            {firmy.length === 0 && <p className="text-xs text-amber-600">💡 Tip: Seznam firem → <Link to="/firmy" className="underline font-medium">Firmy</Link></p>}
          </div>
        </div>
      )}

      {/* Záložka REVIDOVANÉ ZAŘÍZENÍ */}
      {activeTab === 'dokumentace' && (() => {
        const tiskSekce: Record<string, boolean> = formData.tiskSekce ? JSON.parse(formData.tiskSekce) : {};
        const isSekceVisible = (key: string) => tiskSekce[key] !== false; // default true
        const toggleSekce = (key: string) => {
          const updated = { ...tiskSekce, [key]: !isSekceVisible(key) };
          setFormData({ ...formData, tiskSekce: JSON.stringify(updated) });
        };
        const SekceHeader = ({ id, children, className = "bg-[var(--section-header-bg)]" }: { id: string; children: React.ReactNode; className?: string }) => (
          <div className={`${className} text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center justify-between`}>
            <span className={!isSekceVisible(id) ? 'opacity-50 line-through' : ''}>{children}</span>
            <button onClick={() => toggleSekce(id)} className="flex items-center gap-1 text-[10px] font-normal normal-case tracking-normal opacity-70 hover:opacity-100 transition-opacity cursor-pointer" title={isSekceVisible(id) ? 'Skrýt v tisku' : 'Zobrazit v tisku'}>
              {isSekceVisible(id) ? '🖨️' : '🚫'} <span className="hidden sm:inline">{isSekceVisible(id) ? 'Tisk ✓' : 'Skryto'}</span>
            </button>
          </div>
        );

        // ── Předvolené texty pro textová pole ──
        const PREDVOLENE_TEXTY: Record<string, { label: string; text: string }[]> = {
          popisZarizeni: [
            { label: 'Bytový dům', text: 'Elektrická instalace bytového domu, včetně rozváděčů, rozvodů, zásuvek a osvětlení.' },
            { label: 'Rodinný dům', text: 'Elektrická instalace rodinného domu, silnoproudé rozvody od hlavního rozváděče po koncové obvody.' },
            { label: 'Administrativní budova', text: 'Elektroinstalace administrativní budovy – rozváděče, rozvody, osvětlení, zásuvkové obvody.' },
            { label: 'Provozovna / dílna', text: 'Elektrická instalace provozovny, silové rozvody, motorové vývody, osvětlení.' },
          ],
          rozsahRevize: [
            { label: 'Od elektroměru po obvody', text: 'Elektrická instalace od elektroměrového rozváděče po koncové obvody, včetně rozváděčů, kabelových rozvodů, spínacích a zásuvkových obvodů, osvětlení a uzemnění.' },
            { label: 'Od hlavního rozváděče', text: 'Silnoproudá elektroinstalace objektu v rozsahu od hlavního rozváděče po poslední spotřebič, včetně rozváděčů, kabelových tras, ochranného pospojování a uzemnění.' },
            { label: 'Celá instalace', text: 'Kompletní elektrická instalace objektu – silové i světelné rozvody, rozváděče, kabelové trasy, přípojnice, uzemnění, ochranné pospojování.' },
          ],
          predmetNeni: [
            { label: 'Spotřebiče + hromosvod', text: 'Spotřebiče připojené pohyblivým přívodem, hromosvod, slaboproudé rozvody (EZS, EPS, strukturovaná kabeláž).' },
            { label: 'Spotřebiče + nájemci', text: 'Elektrické spotřebiče, zařízení dodaná nájemci, hromosvodní soustava, telekomunikační rozvody.' },
            { label: 'Jen hromosvod', text: 'Hromosvodní soustava – bude předmětem samostatné revize.' },
          ],
          podklady: [
            { label: 'Projekt + předchozí revize', text: 'Projektová dokumentace skutečného provedení, předchozí revizní zpráva, protokoly o měření, ČSN 33 1500, ČSN 33 2000-6 ed.2.' },
            { label: 'Vnější vlivy + projekt', text: 'Protokol o určení vnějších vlivů, projektová dokumentace, předchozí revizní zpráva.' },
            { label: 'Pouze normy', text: 'ČSN 33 1500, ČSN 33 2000-6 ed.2, ČSN 33 2000-4-41 ed.3, ČSN EN 61439-1,2.' },
          ],
          provedeneUkony: [
            { label: 'Kompletní sada úkonů', text: 'Prohlídka elektrického zařízení, kontrola značení obvodů a jistících prvků, měření izolačního odporu, měření impedance poruchové smyčky, ověření funkce proudových chráničů (RCD), kontrola ochranného pospojování, ověření sledu fází, kontrola stupně ochrany krytem.' },
            { label: 'Základní úkony', text: 'Vizuální prohlídka, měření izolačních odporů, měření impedance smyčky, test funkce proudových chráničů, kontrola ochranných vodičů.' },
          ],
          vyhodnoceniPredchozich: [
            { label: 'Nebyla předložena', text: 'Předchozí revizní zpráva nebyla předložena.' },
            { label: 'Bez závad', text: 'Předchozí revize — bez závad. Závady z předchozí revize byly odstraněny.' },
            { label: 'Výchozí revize', text: 'Jedná se o výchozí revizi – předchozí revize nebyla provedena.' },
            { label: 'Závady odstraněny', text: 'Závady zjištěné předchozí revizí byly odstraněny.' },
          ],
          vysledekOduvodneni: [
            { label: 'Schopno – bez závad', text: 'Při revizi nebyly zjištěny závady bránící bezpečnému provozu elektrického zařízení. Zařízení splňuje požadavky platných norem a předpisů.' },
            { label: 'Neschopno – závady', text: 'Elektrické zařízení vykazuje závady, které brání jeho bezpečnému provozu. Závady jsou uvedeny v soupisu zjištěných závad.' },
            { label: 'Podmíněně schopno', text: 'Elektrické zařízení je podmíněně schopno provozu za předpokladu odstranění zjištěných závad ve stanoveném termínu.' },
          ],
          zaver: [
            { label: 'Schopno provozu', text: 'Na základě provedené revize konstatuji, že revidované elektrické zařízení je z hlediska bezpečnosti schopno provozu.' },
            { label: 'Schopno + údržba', text: 'Revidované zařízení je schopno bezpečného provozu za předpokladu dodržování platných norem a předpisů. Doporučuji provádět pravidelnou údržbu a kontroly dle provozního řádu.' },
            { label: 'Neschopno provozu', text: 'Na základě provedené revize konstatuji, že revidované elektrické zařízení není z hlediska bezpečnosti schopno provozu. Před jeho dalším provozováním je nutné odstranit zjištěné závady.' },
          ],
        };

        // Tlačítko předvoleného textu s dropdown + správa vlastních
        const PredvolenyTextBtn = ({ field, mode = 'replace' }: { field: string; mode?: 'replace' | 'append' }) => {
          const [open, setOpen] = useState(false);
          const [adding, setAdding] = useState(false);
          const [newNazev, setNewNazev] = useState('');
          const [newText, setNewText] = useState('');
          const ref = useRef<HTMLDivElement>(null);
          const builtIn = PREDVOLENE_TEXTY[field] || [];
          const custom = vlastniTexty.filter(t => t.pole === field);

          // Zavřít při kliknutí mimo
          useEffect(() => {
            if (!open) return;
            const handler = (e: MouseEvent) => {
              if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
            };
            document.addEventListener('mousedown', handler);
            return () => document.removeEventListener('mousedown', handler);
          }, [open]);

          const handleAdd = async () => {
            if (!newNazev.trim() || !newText.trim()) return;
            try {
              await predvolenyTextService.create({ pole: field, nazev: newNazev.trim(), text: newText.trim() });
              const updated = await predvolenyTextService.getAll();
              setVlastniTexty(updated);
              setNewNazev('');
              setNewText('');
              setAdding(false);
            } catch (err) {
              console.error('Chyba při ukládání předvolby:', err);
            }
          };

          const handleDelete = async (id: number) => {
            if (!window.confirm('Smazat tuto vlastní předvolbu?')) return;
            try {
              await predvolenyTextService.delete(id);
              setVlastniTexty(prev => prev.filter(t => t.id !== id));
            } catch (err) {
              console.error('Chyba při mazání předvolby:', err);
            }
          };

          const handleSaveAsCurrent = async () => {
            const currentVal = (formData as any)[field] || '';
            if (!currentVal.trim()) return;
            const nazev = window.prompt('Název předvolby:');
            if (!nazev?.trim()) return;
            try {
              await predvolenyTextService.create({ pole: field, nazev: nazev.trim(), text: currentVal.trim() });
              const updated = await predvolenyTextService.getAll();
              setVlastniTexty(updated);
            } catch (err) {
              console.error('Chyba:', err);
            }
          };

          const applyText = (text: string) => {
            const current = (formData as any)[field] || '';
            const newVal = mode === 'append' && current ? current + '\n' + text : text;
            setFormData({ ...formData, [field]: newVal });
            setOpen(false);
          };

          return (
            <div ref={ref} className="relative inline-flex items-center gap-1">
              {(formData as any)[field]?.trim() && (
                <button
                  type="button"
                  onClick={handleSaveAsCurrent}
                  className="text-xs text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                  title="Uložit aktuální text jako předvolbu"
                >
                  💾
                </button>
              )}
              <button
                type="button"
                onClick={() => { setOpen(!open); setAdding(false); }}
                className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                title="Předvolené texty"
              >
                📋 Předvolby
              </button>
              {open && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-[var(--surface)] border border-[var(--border-medium)] rounded-lg shadow-xl min-w-[340px] max-w-[440px] py-1 max-h-96 overflow-y-auto">
                  {/* Výchozí předvolby */}
                  {builtIn.length > 0 && (
                    <>
                      <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-semibold border-b border-slate-100">Výchozí předvolby</div>
                      {builtIn.map((t, i) => (
                        <button
                          key={`b-${i}`}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors cursor-pointer border-b border-[var(--border-subtle)]"
                          onClick={() => applyText(t.text)}
                        >
                          <div className="text-xs font-semibold text-blue-700">{t.label}</div>
                          <div className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{t.text}</div>
                        </button>
                      ))}
                    </>
                  )}
                  {/* Vlastní předvolby */}
                  {custom.length > 0 && (
                    <>
                      <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-emerald-600 font-semibold border-b border-[var(--border-subtle)] mt-1">Vlastní předvolby</div>
                      {custom.map((t) => (
                        <div key={`c-${t.id}`} className="flex items-start group">
                          <button
                            type="button"
                            className="flex-1 text-left px-3 py-2 hover:bg-emerald-50 transition-colors cursor-pointer border-b border-[var(--border-subtle)]"
                            onClick={() => applyText(t.text)}
                          >
                            <div className="text-xs font-semibold text-emerald-700">{t.nazev}</div>
                            <div className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{t.text}</div>
                          </button>
                          <button
                            type="button"
                            className="px-2 py-2 text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            onClick={() => t.id && handleDelete(t.id)}
                            title="Smazat"
                          >✕</button>
                        </div>
                      ))}
                    </>
                  )}
                  {/* Přidat novou */}
                  <div className="border-t border-slate-200 mt-1">
                    {!adding ? (
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-xs text-blue-600 hover:bg-blue-50 cursor-pointer font-medium"
                        onClick={() => setAdding(true)}
                      >
                        + Přidat vlastní předvolbu
                      </button>
                    ) : (
                      <div className="px-3 py-2 space-y-1.5">
                        <input
                          type="text"
                          placeholder="Název předvolby"
                          value={newNazev}
                          onChange={(e) => setNewNazev(e.target.value)}
                          className="w-full text-xs px-2 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-blue-400 focus:outline-none"
                          autoFocus
                        />
                        <textarea
                          placeholder="Text předvolby"
                          value={newText}
                          onChange={(e) => setNewText(e.target.value)}
                          rows={3}
                          className="w-full text-xs px-2 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-blue-400 focus:outline-none resize-none"
                        />
                        <div className="flex gap-1 justify-end">
                          <button type="button" onClick={() => setAdding(false)} className="px-2 py-0.5 text-xs text-[var(--text-muted)] hover:bg-slate-100 rounded cursor-pointer">Zrušit</button>
                          <button type="button" onClick={handleAdd} className="px-2 py-0.5 text-xs bg-[var(--primary)] text-white rounded hover:bg-[var(--primary-hover)] cursor-pointer" disabled={!newNazev.trim() || !newText.trim()}>Uložit</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        };
        return (
        <div className="bg-[var(--surface)] border border-[var(--border-medium)] rounded-lg shadow-sm overflow-hidden max-w-4xl mx-auto">

          {/* Záhlaví */}
          <div className="flex items-center px-4 py-2 bg-[var(--bg-surface)] border-b border-[var(--border)]">
            <span className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wide">Revidované zařízení</span>
          </div>

          {/* ═══ DŮVOD MIMOŘÁDNÉ ═══ */}
          {(formData.typRevize === 'mimořádná' || revize?.typRevize === 'mimořádná') && (
            <>
              <div className="bg-amber-600 text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider">📋 Důvod mimořádné revize</div>
              <div className="px-4 py-3 border-b border-slate-200">
                <input className="w-full px-2 py-1.5 rounded text-sm border border-[var(--border-input)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none" value={formData.duvodMimoradne || ''} onChange={(e) => setFormData({ ...formData, duvodMimoradne: e.target.value })} placeholder="Např. havárie, rekonstrukce..." />
              </div>
            </>
          )}

          {/* ═══ POPIS ZAŘÍZENÍ ═══ */}
          <SekceHeader id="popisZarizeni">Popis revidovaného zařízení</SekceHeader>
          {isSekceVisible('popisZarizeni') && (
          <div className="px-4 py-3 border-b border-slate-200">
            <div className="flex justify-end mb-1"><PredvolenyTextBtn field="popisZarizeni" /></div>
            <textarea className="w-full px-2 py-1.5 rounded text-sm border border-[var(--border-input)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none" rows={4} value={formData.popisZarizeni || ''} onChange={(e) => setFormData({ ...formData, popisZarizeni: e.target.value })} placeholder="Popis revidovaného elektrického zařízení, jeho rozsah, účel, stáří, stav..." />
          </div>
          )}

          {/* ═══ SEKCE 1: ROZSAH REVIZE ═══ */}
          <SekceHeader id="rozsahRevize">1. Vymezení rozsahu revize</SekceHeader>
          {isSekceVisible('rozsahRevize') && (
          <table className="w-full text-sm border-collapse">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="w-[180px] px-4 py-2 bg-[var(--bg-surface)] font-semibold text-[var(--text-secondary)] border-r border-[var(--border)] align-top">1.1 Předmětem revize je</td>
                <td className="px-4 py-2">
                  <div className="flex justify-end mb-1"><PredvolenyTextBtn field="rozsahRevize" /></div>
                  <textarea className="w-full px-2 py-1.5 rounded text-sm border border-[var(--border-input)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none" rows={3} value={formData.rozsahRevize || ''} onChange={(e) => setFormData({ ...formData, rozsahRevize: e.target.value })} placeholder="Elektrická instalace objektu, rozváděče, obvody..." />
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-2 bg-[var(--bg-surface)] font-semibold text-[var(--text-secondary)] border-r border-[var(--border)] align-top">1.2 Předmětem revize není</td>
                <td className="px-4 py-2">
                  <div className="flex justify-end mb-1"><PredvolenyTextBtn field="predmetNeni" /></div>
                  <textarea className="w-full px-2 py-1.5 rounded text-sm border border-[var(--border-input)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none" rows={3} value={formData.predmetNeni || ''} onChange={(e) => setFormData({ ...formData, predmetNeni: e.target.value })} placeholder="Spotřebiče, zařízení dodaná nájemci, hromosvod..." />
                </td>
              </tr>
            </tbody>
          </table>
          )}

          {/* ═══ SEKCE 2: CHARAKTERISTIKA ═══ */}
          <SekceHeader id="charakteristika">2. Charakteristika zařízení</SekceHeader>
          {isSekceVisible('charakteristika') && (
          <>
          <table className="w-full text-sm border-collapse">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="w-[180px] px-4 py-2 bg-[var(--bg-surface)] font-semibold text-[var(--text-secondary)] border-r border-[var(--border)]">2.1 Napěťová soustava</td>
                <td className="px-4 py-2">
                  <select className="w-full px-2 py-1.5 rounded text-sm border border-[var(--border-input)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none" value={formData.napetovaSoustava || ''} onChange={(e) => setFormData({ ...formData, napetovaSoustava: e.target.value })}>
                    <option value="">-- Vyberte napěťovou soustavu --</option>
                    <option value="3+N+PE AC 50Hz 400/230V TN-C-S">3+N+PE AC 50Hz 400/230V TN-C-S</option>
                    <option value="3+N+PE AC 50Hz 400/230V TN-S">3+N+PE AC 50Hz 400/230V TN-S</option>
                    <option value="3+PEN AC 50Hz 400/230V TN-C">3+PEN AC 50Hz 400/230V TN-C</option>
                    <option value="1+N+PE AC 50Hz 230V TN-S">1+N+PE AC 50Hz 230V TN-S</option>
                    <option value="1+N+PE AC 50Hz 230V TN-C-S">1+N+PE AC 50Hz 230V TN-C-S</option>
                    <option value="3+PE AC 50Hz 400V TT">3+PE AC 50Hz 400V TT</option>
                    <option value="1+PE AC 50Hz 230V TT">1+PE AC 50Hz 230V TT</option>
                    <option value="DC 24V SELV">DC 24V SELV</option>
                    <option value="DC 48V PELV">DC 48V PELV</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>

          {/* 2.2 Ochrana - tabulka checkboxů */}
          <div className="px-4 py-2 bg-[var(--bg-input)] border-b border-t border-[var(--border)]">
            <span className="text-xs font-semibold text-[var(--text)] uppercase tracking-wide">2.2 Ochrana před úrazem elektrickým proudem</span>
          </div>
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <p className="text-xs text-[var(--text-secondary)] mb-2">Zaškrtněte opatření použitá v objektu:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {[
                { id: 'zakladni-izolace', label: 'Základní izolace živých částí' },
                { id: 'kryty-pricka', label: 'Přepážky nebo kryty' },
                { id: 'zamezeni-dotyk', label: 'Zábrany nebo ochrana polohou' },
                { id: 'selv', label: 'Ochrana malým napětím SELV' },
                { id: 'pelv', label: 'Ochrana malým napětím PELV' },
                { id: 'ochrane-pospojovani', label: 'Ochranné pospojování' },
                { id: 'samocine-odpojeni', label: 'Automatické odpojení od zdroje' },
                { id: 'proudovy-chranic', label: 'Doplňková ochrana proudovým chráničem' },
                { id: 'ochranne-oddeleni', label: 'Ochranné oddělení obvodů' },
                { id: 'dvojita-izolace', label: 'Dvojitá nebo zesílená izolace' },
                { id: 'nevodive-prostredi', label: 'Nevodivé prostředí' },
                { id: 'neuzemene-pospojeni', label: 'Neuzemeného místního pospojování' },
              ].map((opatreni) => {
                const currentOpatreni = formData.ochranaOpatreni ? JSON.parse(formData.ochranaOpatreni) : [];
                const isChecked = currentOpatreni.includes(opatreni.id);
                return (
                  <label key={opatreni.id} className="flex items-center gap-2 px-2 py-1.5 bg-[var(--bg-surface)] rounded hover:bg-[var(--bg-hover)] cursor-pointer">
                    <input type="checkbox" checked={isChecked} onChange={(e) => {
                      let updated = [...currentOpatreni];
                      if (e.target.checked) { updated.push(opatreni.id); } else { updated = updated.filter((id: string) => id !== opatreni.id); }
                      setFormData({ ...formData, ochranaOpatreni: JSON.stringify(updated) });
                    }} className="w-4 h-4 text-blue-600 rounded border-[var(--checkbox-border)]" />
                    <span className="text-sm text-[var(--text)]">{opatreni.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* ═══ SEKCE 3: MĚŘICÍ PŘÍSTROJE ═══ */}
          </>)}
          <div className="bg-[var(--section-header-bg)] text-[var(--text)] px-4 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
            <span className={!isSekceVisible('pristroje') ? 'opacity-50 line-through' : ''}>2.3 Použité měřicí přístroje</span>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setIsPristrojModalOpen(true)} className="!py-0.5 !px-2 !text-xs bg-white/20 hover:bg-white/30 text-white border-0">
                <span className="sm:hidden">+</span>
                <span className="hidden sm:inline">+ Přidat</span>
              </Button>
              <button onClick={() => toggleSekce('pristroje')} className="flex items-center gap-1 text-[10px] font-normal normal-case tracking-normal opacity-70 hover:opacity-100 transition-opacity cursor-pointer" title={isSekceVisible('pristroje') ? 'Skrýt v tisku' : 'Zobrazit v tisku'}>
                {isSekceVisible('pristroje') ? '🖨️' : '🚫'} <span className="hidden sm:inline">{isSekceVisible('pristroje') ? 'Tisk ✓' : 'Skryto'}</span>
              </button>
            </div>
          </div>
          {isSekceVisible('pristroje') && (
          <>
          <div className="border-b border-slate-200">
            {pouzitePristroje.length > 0 ? (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border-b border-r border-slate-200 px-4 py-1.5 text-left text-xs font-medium">Název</th>
                    <th className="border-b border-r border-slate-200 px-4 py-1.5 text-left text-xs font-medium">Výrobce/Model</th>
                    <th className="border-b border-r border-slate-200 px-4 py-1.5 text-left text-xs font-medium">Výrobní číslo</th>
                    <th className="border-b border-r border-slate-200 px-4 py-1.5 text-center text-xs font-medium">Platnost kalibrace</th>
                    <th className="border-b border-[var(--border)] px-4 py-1.5 text-center text-xs font-medium w-16">Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {pouzitePristroje.map((p) => (
                    <tr key={p.id} className="border-b border-[var(--border-subtle)] border-l-2 border-l-transparent hover:border-l-[var(--primary)] hover:bg-[var(--bg-hover)] group">
                      <td className="border-b border-r border-slate-200 px-4 py-1.5 font-medium">{p.nazev}</td>
                      <td className="border-b border-r border-slate-200 px-4 py-1.5">{p.vyrobce} {p.model}</td>
                      <td className="border-b border-r border-slate-200 px-4 py-1.5 font-mono">{p.vyrobniCislo}</td>
                      <td className="border-b border-r border-slate-200 px-4 py-1.5 text-center">{new Date(p.platnostKalibrace).toLocaleDateString('cs-CZ')}</td>
                      <td className="border-b border-[var(--border)] px-4 py-1.5 text-center">
                        <Button variant="danger" size="sm" onClick={async () => { if (revize?.id && p.id) { await revizePristrojService.removeFromRevize(revize.id, p.id); loadData(revize.id); } }}>✕</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="px-4 py-4 text-center text-[var(--text-muted)]">Zatím nejsou přiřazeny žádné měřící přístroje.</p>
            )}
          </div>
          </>)}

          {/* ═══ SEKCE 4: PODKLADY ═══ */}
          <SekceHeader id="podklady">2.4 Podklady pro provedení revize</SekceHeader>
          {isSekceVisible('podklady') && (
          <div className="px-4 py-3 border-b border-slate-200">
            <div className="flex justify-end mb-1"><PredvolenyTextBtn field="podklady" /></div>
            <textarea className="w-full px-2 py-1.5 rounded text-sm border border-[var(--border-input)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none" rows={4} value={formData.podklady || ''} onChange={(e) => setFormData({ ...formData, podklady: e.target.value })} placeholder="Projekty, předchozí revize, protokoly o měření..." />
          </div>
          )}

          {/* ═══ SEKCE 5: PROVEDENÉ ÚKONY ═══ */}
          <SekceHeader id="provedeneUkony">3. Soupis provedených úkonů</SekceHeader>
          {isSekceVisible('provedeneUkony') && (
          <div className="px-4 py-3 border-b border-slate-200">
            <div className="flex justify-end mb-1"><PredvolenyTextBtn field="provedeneUkony" /></div>
            <textarea className="w-full px-2 py-1.5 rounded text-sm border border-[var(--border-input)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none" rows={4} value={formData.provedeneUkony || ''} onChange={(e) => setFormData({ ...formData, provedeneUkony: e.target.value })} placeholder="Prohlídka, měření izolačního odporu, impedance smyčky, funkce proudových chráničů..." />
          </div>
          )}

          {/* ═══ SEKCE 6: VYHODNOCENÍ PŘEDCHOZÍCH ═══ */}
          <SekceHeader id="vyhodnoceniPredchozich">4. Vyhodnocení předchozích revizí</SekceHeader>
          {isSekceVisible('vyhodnoceniPredchozich') && (
          <div className="px-4 py-3 border-b border-slate-200">
            <div className="flex justify-end mb-1"><PredvolenyTextBtn field="vyhodnoceniPredchozich" /></div>
            <textarea className="w-full px-2 py-1.5 rounded text-sm border border-[var(--border-input)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none" rows={3} value={formData.vyhodnoceniPredchozich || ''} onChange={(e) => setFormData({ ...formData, vyhodnoceniPredchozich: e.target.value })} placeholder="Výsledky předchozí revize, stav odstranění zjištěných závad..." />
          </div>
          )}

          {/* ═══ SEKCE 7: VÝSLEDEK + ODŮVODNĚNÍ ═══ */}
          <SekceHeader id="vysledekOduvodneni">5. Výsledek revize — odůvodnění</SekceHeader>
          {isSekceVisible('vysledekOduvodneni') && (
          <table className="w-full text-sm border-collapse">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="w-[180px] px-4 py-2 bg-[var(--bg-surface)] font-semibold text-[var(--text-secondary)] border-r border-[var(--border)]">Výsledek</td>
                <td className="px-4 py-2">
                  <select className="px-2 py-1 rounded text-sm border border-[var(--border-input)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none" value={formData.vysledek || ''} onChange={(e) => setFormData({ ...formData, vysledek: e.target.value as any })}>
                    <option value="">-- Nevyplněno --</option><option value="schopno">Schopno provozu</option><option value="neschopno">Neschopno provozu</option><option value="podmíněně schopno">Podmíněně schopno</option>
                  </select>
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-2 bg-[var(--bg-surface)] font-semibold text-[var(--text-secondary)] border-r border-[var(--border)] align-top">Odůvodnění</td>
                <td className="px-4 py-2">
                  <div className="flex justify-end mb-1"><PredvolenyTextBtn field="vysledekOduvodneni" /></div>
                  <textarea className="w-full px-2 py-1.5 rounded text-sm border border-[var(--border-input)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none" rows={3} value={formData.vysledekOduvodneni || ''} onChange={(e) => setFormData({ ...formData, vysledekOduvodneni: e.target.value })} placeholder="Odůvodnění výsledku revize, pokud zařízení není schopno provozu..." />
                </td>
              </tr>
            </tbody>
          </table>
          )}

          {/* ═══ SEKCE 8: ZÁVĚR ═══ */}
          <SekceHeader id="zaver">6. Závěr revize</SekceHeader>
          {isSekceVisible('zaver') && (
          <div className="px-4 py-3 border-b border-slate-200">
            <div className="flex justify-end mb-1"><PredvolenyTextBtn field="zaver" /></div>
            <textarea className="w-full px-2 py-1.5 rounded text-sm border border-[var(--border-input)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none" rows={4} value={formData.zaver || ''} onChange={(e) => setFormData({ ...formData, zaver: e.target.value })} placeholder="Celkové shrnutí a závěr revizní zprávy..." />
          </div>
          )}

          {/* ═══ SEKCE 9: PŘÍLOHY ═══ */}
          <SekceHeader id="prilohy">7. Přílohy</SekceHeader>
          {isSekceVisible('prilohy') && (
          <div className="px-4 py-3">
            <p className="text-xs text-[var(--text-secondary)] mb-2">Jeden řádek = jedna příloha (např. „Protokol o měření č. 1", „Schéma zapojení rozváděče"…)</p>
            <textarea className="w-full px-2 py-1.5 rounded text-sm border border-[var(--border-input)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none" rows={5} value={formData.prilohy || ''} onChange={(e) => setFormData({ ...formData, prilohy: e.target.value })} placeholder={"Protokol o měření č. 1\nSchéma zapojení rozváděče RH\nFotodokumentace"} />
          </div>
          )}
        </div>
        );
      })()}

      {/* Modal pro přidání přístroje k revizi */}
      <Modal
        isOpen={isPristrojModalOpen}
        onClose={() => setIsPristrojModalOpen(false)}
        title="Přidat měřící přístroj"
      >
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {vsechnyPristroje.filter(p => !pouzitePristroje.find(pp => pp.id === p.id)).length > 0 ? (
            vsechnyPristroje
              .filter(p => !pouzitePristroje.find(pp => pp.id === p.id))
              .map((p) => (
                <div 
                  key={p.id} 
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-blue-300 cursor-pointer"
                  onClick={async () => {
                    if (revize?.id && p.id) {
                      await revizePristrojService.addToRevize(revize.id, p.id);
                      loadData(revize.id);
                      setIsPristrojModalOpen(false);
                    }
                  }}
                >
                  <div className="flex-1">
                    <p className="font-medium">{p.nazev}</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {p.vyrobce} {p.model} • V.č.: {p.vyrobniCislo}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Platnost kalibrace: {new Date(p.platnostKalibrace).toLocaleDateString('cs-CZ')}
                    </p>
                  </div>
                  <span className="text-blue-600">+ Přidat</span>
                </div>
              ))
          ) : (
            <div className="text-center py-4">
              <p className="text-[var(--text-muted)] mb-2">
                {vsechnyPristroje.length === 0 
                  ? 'Nemáte žádné měřící přístroje.' 
                  : 'Všechny přístroje jsou již přiřazeny.'}
              </p>
              <Link to="/pristroje" className="text-blue-600 hover:underline">
                Přejít na správu přístrojů
              </Link>
            </div>
          )}
        </div>
      </Modal>

      {activeTab === 'rozvadece' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Seznam rozvaděčů - levá strana */}
          <div className="lg:col-span-1">
            <Card
              title="Rozvaděče"
              actions={
                <Button size="sm" onClick={() => setIsRozvadecModalOpen(true)}>
                  + Přidat
                </Button>
              }
            >
              {rozvadece.length > 0 ? (
                <div className="space-y-2">
                  {rozvadece.map((r) => (
                    <div
                      key={r.id}
                      className={`rounded-lg border transition-colors cursor-pointer ${
                        selectedRozvadec?.id === r.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}
                      onClick={() => handleSelectRozvadec(r)}
                    >
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm">{r.nazev}</p>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {okruhyCounts[r.id!] || 0}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">
                          {r.oznaceni} • {r.stupenKryti}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">{r.umisteni}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-[var(--text-muted)] py-6 text-sm">
                  Zatím žádné rozvaděče.
                </p>
              )}
            </Card>
          </div>

          {/* Detail rozvaděče - pravá strana */}
          <div className="lg:col-span-2">
            {selectedRozvadec ? (
              <Card
                title={`${selectedRozvadec.nazev}`}
                actions={
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => { resetOkruhForm(); setIsOkruhModalOpen(true); }}>
                      <span className="sm:hidden text-base leading-none">+</span>
                      <span className="hidden sm:inline">+ Přidat okruh</span>
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteRozvadec(selectedRozvadec.id!)}
                    >
                      🗑️ Smazat
                    </Button>
                  </div>
                }
              >
                <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-[var(--text-muted)]">Označení</p>
                    <p className="font-medium">{selectedRozvadec.oznaceni}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-[var(--text-muted)]">Umístění</p>
                    <p className="font-medium">{selectedRozvadec.umisteni}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-[var(--text-muted)]">Typ</p>
                    <p className="font-medium">{selectedRozvadec.typRozvadece || '—'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-[var(--text-muted)]">Krytí</p>
                    <p className="font-medium">{selectedRozvadec.stupenKryti}</p>
                  </div>
                </div>

                <h4 className="font-medium text-slate-700 mb-3">Okruhy ({okruhy.length})</h4>
                {okruhy.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-2 px-3 font-medium text-[var(--text-secondary)] text-sm">Č.</th>
                          <th className="text-left py-2 px-3 font-medium text-[var(--text-secondary)] text-sm">Jistič</th>
                          <th className="text-left py-2 px-3 font-medium text-[var(--text-secondary)] text-sm">Název</th>
                          <th className="text-left py-2 px-3 font-medium text-[var(--text-secondary)] text-sm">Vodič</th>
                          <th className="text-left py-2 px-3 font-medium text-[var(--text-secondary)] text-sm">Iz. odpor</th>
                          <th className="text-left py-2 px-3 font-medium text-[var(--text-secondary)] text-sm">Imp. smyčky</th>
                          <th className="text-right py-2 px-3 font-medium text-[var(--text-secondary)] text-sm">Akce</th>
                        </tr>
                      </thead>
                      <tbody>
                        {okruhy.sort((a, b) => a.cislo - b.cislo).map((o) => (
                          <tr
                            key={o.id}
                            draggable
                            onDragStart={() => handleDragStart(o)}
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(o)}
                            onDragEnd={handleDragEnd}
                            className={`border-b border-[var(--border-subtle)] hover:bg-slate-50 cursor-grab active:cursor-grabbing ${
                              draggedOkruh?.id === o.id ? 'opacity-50 bg-blue-50' : ''
                            }`}
                          >
                            <td className="py-2 px-3 font-medium">
                              <span className="flex items-center gap-2">
                                <span className="text-[var(--text-secondary)]">⋮⋮</span>
                                {o.cislo}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100">
                                {o.pocetFazi || 1}/{o.jisticTyp}{o.jisticProud.replace('A', '')}
                              </span>
                            </td>
                            <td className="py-2 px-3">{o.nazev}</td>
                            <td className="py-2 px-3 text-[var(--text-secondary)]">{computeVodic(o.typKabelu, o.pocetZil, o.prurez) || o.vodic}</td>
                            <td className="py-2 px-3 text-[var(--text-secondary)]">
                              {o.izolacniOdpor || '—'}
                            </td>
                            <td className="py-2 px-3 text-[var(--text-secondary)]">
                              {o.impedanceSmycky || '—'}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleDuplicateOkruh(o)}
                                  title="Duplikovat"
                                >
                                  📋
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleEditOkruh(o)}
                                  title="Upravit"
                                >
                                  ✏️
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleDeleteOkruh(o.id!)}
                                  title="Smazat"
                                >
                                  🗑️
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-[var(--text-muted)] py-6 bg-slate-50 rounded-lg">
                    Zatím žádné okruhy. Přidejte první kliknutím na tlačítko výše.
                  </p>
                )}
              </Card>
            ) : (
              <Card>
                <div className="text-center py-12 text-[var(--text-muted)]">
                  <p className="text-4xl mb-4">⚡</p>
                  <p>Vyberte rozvaděč ze seznamu vlevo</p>
                  <p className="text-sm mt-1">pro zobrazení detailu a okruhů</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeTab === 'zavady' && (
        <Card 
          title="Závady"
          actions={
            <Button size="sm" onClick={() => { resetZavadaForm(); setIsZavadaModalOpen(true); }}>
              <span className="sm:hidden text-base leading-none">+</span>
              <span className="hidden sm:inline">+ Přidat závadu</span>
            </Button>
          }
        >
          {zavady.length > 0 ? (
            <div className="space-y-4">
              {zavady.map((z) => (
                <div
                  key={z.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{z.popis}</p>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        z.stav === 'vyřešená' ? 'bg-green-100 text-green-700' :
                        z.stav === 'v řešení' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {z.stav}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-muted)]">
                      Zjištěno: {new Date(z.datumZjisteni).toLocaleDateString('cs-CZ')}
                      {z.datumVyreseni && ` • Vyřešeno: ${new Date(z.datumVyreseni).toLocaleDateString('cs-CZ')}`}
                    </p>
                    {z.rozvadecId && (
                      <p className="text-xs text-[var(--text-secondary)]">
                        Rozvaděč: {rozvadece.find(r => r.id === z.rozvadecId)?.nazev || 'Neznámý'}
                      </p>
                    )}
                    {z.poznamka && (
                      <p className="text-sm text-[var(--text-muted)] mt-1 italic">{z.poznamka}</p>
                    )}
                    {Array.isArray(z.fotky) && z.fotky.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {z.fotky.slice(0, 4).map((foto, index) => (
                          <img
                            key={index}
                            src={foto}
                            alt={`Foto ${index + 1}`}
                            className="w-12 h-12 object-cover rounded border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setLightboxImage(foto)}
                          />
                        ))}
                        {Array.isArray(z.fotky) && z.fotky.length > 4 && (
                          <span className="w-12 h-12 flex items-center justify-center bg-[var(--bg-surface)] rounded text-sm font-medium text-[var(--text-secondary)]">
                            +{z.fotky.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      z.zavaznost === 'C1' ? 'bg-red-100 text-red-700' :
                      z.zavaznost === 'C2' ? 'bg-orange-100 text-orange-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {z.zavaznost}
                    </span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="secondary" onClick={() => handleEditZavada(z)}>
                        Upravit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleDeleteZavada(z.id!)}>
                        Smazat
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-[var(--text-muted)] py-8">
              Žádné závady nebyly zaznamenány. Přidejte první kliknutím na tlačítko výše.
            </p>
          )}
        </Card>
      )}

      {activeTab === 'mistnosti' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Seznam místností - levá strana */}
          <div className="lg:col-span-1">
            <Card
              title="Místnosti"
              actions={
                <Button size="sm" onClick={() => setIsMistnostModalOpen(true)}>
                  + Přidat
                </Button>
              }
            >
              {mistnosti.length > 0 ? (
                <div className="space-y-2">
                  {mistnosti.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-lg border transition-colors cursor-pointer ${
                        selectedMistnost?.id === m.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}
                      onClick={() => handleSelectMistnost(m)}
                    >
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm">{m.nazev}</p>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            {zarizeniCounts[m.id!] || 0}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {m.patro && `${m.patro}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-[var(--text-muted)] py-6 text-sm">
                  Zatím žádné místnosti.
                </p>
              )}
            </Card>
          </div>

          {/* Detail místnosti - pravá strana */}
          <div className="lg:col-span-2">
            {selectedMistnost ? (
              <Card
                title={`${selectedMistnost.nazev}`}
                actions={
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => { resetZarizeniForm(); setIsZarizeniModalOpen(true); }}>
                      <span className="sm:hidden text-base leading-none">+</span>
                      <span className="hidden sm:inline">+ Přidat zařízení</span>
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEditMistnost(selectedMistnost)}
                    >
                      ✏️ Upravit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteMistnost(selectedMistnost.id!)}
                    >
                      🗑️ Smazat
                    </Button>
                  </div>
                }
              >
                <div className="mb-6">
                  <div className="p-3 bg-slate-50 rounded-lg inline-block">
                    <p className="text-xs text-[var(--text-muted)]">Patro</p>
                    <p className="font-medium">{selectedMistnost.patro || '—'}</p>
                  </div>
                </div>

                <h4 className="font-medium text-slate-700 mb-3">Zařízení ({zarizeni.length})</h4>
                {zarizeni.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-2 px-3 font-medium text-[var(--text-secondary)] text-sm">Název</th>
                          <th className="text-left py-2 px-3 font-medium text-[var(--text-secondary)] text-sm">Ks</th>
                          <th className="text-left py-2 px-3 font-medium text-[var(--text-secondary)] text-sm">Třída</th>
                          <th className="text-left py-2 px-3 font-medium text-[var(--text-secondary)] text-sm">Příkon</th>
                          <th className="text-left py-2 px-3 font-medium text-[var(--text-secondary)] text-sm">Ochrana před dotykem</th>
                          <th className="text-left py-2 px-3 font-medium text-[var(--text-secondary)] text-sm">Stav</th>
                          <th className="text-right py-2 px-3 font-medium text-[var(--text-secondary)] text-sm">Akce</th>
                        </tr>
                      </thead>
                      <tbody>
                        {zarizeni.map((z) => (
                          <tr key={z.id} className="border-b border-[var(--border-subtle)] border-l-2 border-l-transparent hover:border-l-[var(--primary)] hover:bg-[var(--bg-hover)] group">
                            <td className="py-2 px-3">
                              <p className="font-medium">{z.nazev}</p>
                              {z.oznaceni && <p className="text-xs text-[var(--text-secondary)]">{z.oznaceni}</p>}
                            </td>
                            <td className="py-2 px-3 text-[var(--text-secondary)]">
                              {z.pocetKs || 1}
                            </td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100">
                                {z.trida || 'I'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-[var(--text-secondary)]">
                              {z.prikonW ? `${z.prikonW} W` : '—'}
                            </td>
                            <td className="py-2 px-3 text-[var(--text-secondary)]">
                              {z.ochranaPredDotykem || '—'}
                            </td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                z.stav === 'OK' ? 'bg-green-100 text-green-700' :
                                z.stav === 'závada' ? 'bg-red-100 text-red-700' :
                                'bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                              }`}>
                                {z.stav}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleEditZarizeni(z)}
                                >
                                  ✏️
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleDeleteZarizeni(z.id!)}
                                >
                                  🗑️
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-[var(--text-muted)] py-6 text-sm">
                    Zatím žádná zařízení. Přidejte první kliknutím na tlačítko výše.
                  </p>
                )}
              </Card>
            ) : (
              <Card title="Detail místnosti">
                <p className="text-center text-[var(--text-muted)] py-12">
                  Vyberte místnost ze seznamu vlevo pro zobrazení detailu a správu zařízení.
                </p>
              </Card>
            )}
          </div>
        </div>
      )}

      <Modal
        isOpen={isRozvadecModalOpen}
        onClose={() => setIsRozvadecModalOpen(false)}
        title="Přidat rozvaděč"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsRozvadecModalOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={handleAddRozvadec}>
              Přidat
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddRozvadec} className="space-y-4">
          <Input
            label="Název"
            value={rozvadecFormData.nazev}
            onChange={(e) => setRozvadecFormData({ ...rozvadecFormData, nazev: e.target.value })}
            required
          />
          <Input
            label="Označení"
            value={rozvadecFormData.oznaceni}
            onChange={(e) => setRozvadecFormData({ ...rozvadecFormData, oznaceni: e.target.value })}
            required
          />
          <Input
            label="Umístění"
            value={rozvadecFormData.umisteni}
            onChange={(e) => setRozvadecFormData({ ...rozvadecFormData, umisteni: e.target.value })}
            required
          />
          <Input
            label="Typ rozvaděče"
            value={rozvadecFormData.typRozvadece}
            onChange={(e) => setRozvadecFormData({ ...rozvadecFormData, typRozvadece: e.target.value })}
          />
          <Input
            label="Stupeň krytí"
            value={rozvadecFormData.stupenKryti}
            onChange={(e) => setRozvadecFormData({ ...rozvadecFormData, stupenKryti: e.target.value })}
          />
        </form>
      </Modal>

      <Modal
        isOpen={isOkruhModalOpen}
        onClose={() => { setIsOkruhModalOpen(false); setEditingOkruh(null); }}
        title={editingOkruh ? 'Upravit okruh' : 'Přidat okruh'}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setIsOkruhModalOpen(false); setEditingOkruh(null); }}>
              Zrušit
            </Button>
            <Button onClick={handleAddOkruh}>
              {editingOkruh ? 'Uložit' : 'Přidat'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddOkruh} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="number"
              label="Číslo okruhu"
              value={okruhFormData.cislo}
              onChange={(e) => setOkruhFormData({ ...okruhFormData, cislo: parseInt(e.target.value) })}
              required
            />
            <Input
              label="Název"
              value={okruhFormData.nazev}
              onChange={(e) => setOkruhFormData({ ...okruhFormData, nazev: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Select
              label="Typ jističe"
              value={okruhFormData.jisticTyp}
              onChange={(e) => setOkruhFormData({ ...okruhFormData, jisticTyp: e.target.value })}
              options={[
                { value: 'B', label: 'B' },
                { value: 'C', label: 'C' },
                { value: 'D', label: 'D' },
              ]}
            />
            <Select
              label="Proud jističe"
              value={okruhFormData.jisticProud}
              onChange={(e) => setOkruhFormData({ ...okruhFormData, jisticProud: e.target.value })}
              options={[
                { value: '6A', label: '6A' },
                { value: '10A', label: '10A' },
                { value: '16A', label: '16A' },
                { value: '20A', label: '20A' },
                { value: '25A', label: '25A' },
                { value: '32A', label: '32A' },
              ]}
            />
            <Select
              label="Počet fází"
              value={okruhFormData.pocetFazi.toString()}
              onChange={(e) => setOkruhFormData({ ...okruhFormData, pocetFazi: parseInt(e.target.value) })}
              options={[
                { value: '1', label: '1P' },
                { value: '2', label: '2P' },
                { value: '3', label: '3P' },
              ]}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <EditableSelect label="Typ kabelu" value={okruhFormData.typKabelu} onChange={(val) => setOkruhFormData({ ...okruhFormData, typKabelu: val })} options={TYPY_KABELU} />
            <Input
              label="Počet žil (volitelné)"
              value={okruhFormData.pocetZil}
              onChange={(e) => setOkruhFormData({ ...okruhFormData, pocetZil: e.target.value })}
              placeholder="např. 3"
            />
            <EditableSelect label="Průřez (mm²)" value={okruhFormData.prurez} onChange={(val) => setOkruhFormData({ ...okruhFormData, prurez: val })} options={PRUREZY} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Izolační odpor (MΩ)"
              value={okruhFormData.izolacniOdpor}
              onChange={(e) => setOkruhFormData({ ...okruhFormData, izolacniOdpor: e.target.value })}
            />
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  label="Impedance smyčky (Ω)"
                  value={okruhFormData.impedanceSmycky}
                  onChange={(e) => setOkruhFormData({ ...okruhFormData, impedanceSmycky: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-1.5 pb-2 cursor-pointer select-none">
                <input type="checkbox" checked={okruhFormData.impedanceSmyckyMax} onChange={(e) => setOkruhFormData({ ...okruhFormData, impedanceSmyckyMax: e.target.checked })} className="rounded border-slate-300" />
                <span className="text-xs text-slate-600 whitespace-nowrap">max.</span>
              </label>
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal pro závady */}
      <Modal
        isOpen={isZavadaModalOpen}
        onClose={() => { setIsZavadaModalOpen(false); resetZavadaForm(); }}
        title={editingZavada ? 'Upravit závadu' : 'Přidat závadu'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setIsZavadaModalOpen(false); resetZavadaForm(); }}>
              Zrušit
            </Button>
            <Button onClick={handleAddZavada}>
              {editingZavada ? 'Uložit změny' : 'Přidat'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddZavada} className="space-y-4">
          {/* Výběr z katalogu - pouze při vytváření nové závady */}
          {!editingZavada && katalogZavad.length > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <label className="block text-sm font-medium text-blue-800 mb-2">
                📋 Vybrat z katalogu závad
              </label>
              <Select
                value={selectedKatalogZavada}
                onChange={(e) => handleSelectFromKatalog(e.target.value)}
                options={[
                  { value: '', label: '-- Vlastní závada --' },
                  ...katalogZavad.map(z => ({
                    value: z.id!.toString(),
                    label: `[${z.zavaznost}] ${z.popis}${z.norma ? ` (${z.norma})` : ''}`
                  }))
                ]}
              />
              {selectedKatalogZavada && (
                <p className="text-xs text-blue-600 mt-1">
                  Popis a závažnost budou předvyplněny z katalogu. Můžete je upravit.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Popis závady *</label>
            <textarea
              value={zavadaFormData.popis}
              onChange={(e) => setZavadaFormData({ ...zavadaFormData, popis: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Popište zjištěnou závadu..."
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Závažnost"
              value={zavadaFormData.zavaznost}
              onChange={(e) => setZavadaFormData({ ...zavadaFormData, zavaznost: e.target.value as any })}
              options={[
                { value: 'C1', label: 'C1 - Kritická' },
                { value: 'C2', label: 'C2 - Vážná' },
                { value: 'C3', label: 'C3 - Drobná' },
              ]}
            />
            <Select
              label="Stav"
              value={zavadaFormData.stav}
              onChange={(e) => setZavadaFormData({ ...zavadaFormData, stav: e.target.value as any })}
              options={[
                { value: 'otevřená', label: 'Otevřená' },
                { value: 'v řešení', label: 'V řešení' },
                { value: 'vyřešená', label: 'Vyřešená' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Rozvaděč (volitelné)"
              value={zavadaFormData.rozvadecId?.toString() || ''}
              onChange={(e) => setZavadaFormData({ ...zavadaFormData, rozvadecId: e.target.value ? parseInt(e.target.value) : undefined })}
              options={[
                { value: '', label: '-- Nevybráno --' },
                ...rozvadece.map(r => ({ value: r.id!.toString(), label: r.nazev }))
              ]}
            />
            <Select
              label="Místnost (volitelné)"
              value={zavadaFormData.mistnostId?.toString() || ''}
              onChange={(e) => setZavadaFormData({ ...zavadaFormData, mistnostId: e.target.value ? parseInt(e.target.value) : undefined })}
              options={[
                { value: '', label: '-- Nevybráno --' },
                ...mistnosti.map(m => ({ value: m.id!.toString(), label: m.nazev }))
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Poznámka / Odkaz na normu</label>
            <textarea
              value={zavadaFormData.poznamka}
              onChange={(e) => setZavadaFormData({ ...zavadaFormData, poznamka: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              rows={3}
              placeholder="Volitelná poznámka nebo odkaz na normu/zákon..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fotky</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = e.target.files;
                if (files) {
                  Array.from(files).forEach(file => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setZavadaFormData(prev => ({
                        ...prev,
                        fotky: [...prev.fotky, reader.result as string]
                      }));
                    };
                    reader.readAsDataURL(file);
                  });
                }
              }}
              className="w-full text-sm text-[var(--text-muted)] file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {zavadaFormData.fotky.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {zavadaFormData.fotky.map((foto, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={foto}
                      alt={`Foto ${i + 1}`}
                      className="w-16 h-16 object-cover rounded border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setLightboxImage(foto)}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setZavadaFormData(prev => ({
                          ...prev,
                          fotky: prev.fotky.filter((_, idx) => idx !== i)
                        }));
                      }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* Modal pro přidání/úpravu místnosti */}
      <Modal
        isOpen={isMistnostModalOpen}
        onClose={() => { setIsMistnostModalOpen(false); resetMistnostForm(); }}
        title={editingMistnost ? 'Upravit místnost' : 'Přidat místnost'}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setIsMistnostModalOpen(false); resetMistnostForm(); }}>
              Zrušit
            </Button>
            <Button onClick={handleAddMistnost}>
              {editingMistnost ? 'Uložit změny' : 'Přidat'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddMistnost} className="space-y-4">
          <Input
            label="Název místnosti"
            value={mistnostFormData.nazev}
            onChange={(e) => setMistnostFormData({ ...mistnostFormData, nazev: e.target.value })}
            placeholder="např. Obývací pokoj, Kuchyň..."
            required
          />
          <Input
            label="Patro"
            value={mistnostFormData.patro}
            onChange={(e) => setMistnostFormData({ ...mistnostFormData, patro: e.target.value })}
            placeholder="např. 1.NP, přízemí..."
          />
          <Input
            label="Poznámka"
            value={mistnostFormData.poznamka}
            onChange={(e) => setMistnostFormData({ ...mistnostFormData, poznamka: e.target.value })}
            placeholder="Volitelná poznámka..."
          />
        </form>
      </Modal>

      {/* Modal pro přidání/úpravu zařízení */}
      <Modal
        isOpen={isZarizeniModalOpen}
        onClose={() => { setIsZarizeniModalOpen(false); resetZarizeniForm(); }}
        title={editingZarizeni ? 'Upravit zařízení' : 'Přidat zařízení'}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setIsZarizeniModalOpen(false); resetZarizeniForm(); }}>
              Zrušit
            </Button>
            <Button onClick={handleAddZarizeni}>
              {editingZarizeni ? 'Uložit změny' : 'Přidat'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddZarizeni} className="space-y-4">
          <Input
            label="Název zařízení"
            value={zarizeniFormData.nazev}
            onChange={(e) => setZarizeniFormData({ ...zarizeniFormData, nazev: e.target.value })}
            placeholder="např. Zásuvka u okna, Hlavní svítidlo..."
            required
          />
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Označení"
              value={zarizeniFormData.oznaceni}
              onChange={(e) => setZarizeniFormData({ ...zarizeniFormData, oznaceni: e.target.value })}
              placeholder="např. Z1, L2..."
            />
            <Input
              label="Počet kusů"
              type="number"
              min="1"
              value={zarizeniFormData.pocetKs.toString()}
              onChange={(e) => {
                const newPocet = parseInt(e.target.value) || 1;
                let ochrana = zarizeniFormData.ochranaPredDotykem;
                if (zarizeniFormData.trida === 'I') {
                  if (newPocet > 1 && !ochrana?.startsWith('max.')) {
                    ochrana = 'max.' + (ochrana || '');
                  } else if (newPocet === 1 && ochrana?.startsWith('max.')) {
                    ochrana = ochrana.replace('max.', '');
                  }
                }
                setZarizeniFormData({ ...zarizeniFormData, pocetKs: newPocet, ochranaPredDotykem: ochrana });
              }}
            />
            <Select
              label="Třída"
              value={zarizeniFormData.trida}
              onChange={(e) => {
                const newTrida = e.target.value as Zarizeni['trida'];
                let ochrana = zarizeniFormData.ochranaPredDotykem;
                if (newTrida === 'II') {
                  ochrana = 'izolací';
                } else if (newTrida === 'III') {
                  ochrana = 'MN';
                } else if (newTrida === 'I') {
                  ochrana = zarizeniFormData.pocetKs > 1 ? 'max.' : '';
                }
                setZarizeniFormData({ ...zarizeniFormData, trida: newTrida, ochranaPredDotykem: ochrana });
              }}
              options={[
                { value: 'I', label: 'I' },
                { value: 'II', label: 'II' },
                { value: 'III', label: 'III' },
              ]}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Příkon (W)"
              type="number"
              value={zarizeniFormData.prikonW?.toString() || ''}
              onChange={(e) => setZarizeniFormData({ ...zarizeniFormData, prikonW: e.target.value ? parseFloat(e.target.value) : undefined })}
              placeholder="např. 60"
            />
            <Input
              label="Ochrana před dotykem"
              value={zarizeniFormData.ochranaPredDotykem}
              onChange={(e) => setZarizeniFormData({ ...zarizeniFormData, ochranaPredDotykem: e.target.value })}
              placeholder={
                zarizeniFormData.trida === 'I' 
                  ? (zarizeniFormData.pocetKs > 1 ? 'např. max.0.6 Ω' : 'např. 0.6 Ω')
                  : zarizeniFormData.trida === 'II' 
                    ? 'např. izolací' 
                    : 'např. malým napětím'
              }
            />
            <Select
              label="Stav"
              value={zarizeniFormData.stav}
              onChange={(e) => setZarizeniFormData({ ...zarizeniFormData, stav: e.target.value as Zarizeni['stav'] })}
              options={[
                { value: 'nekontrolováno', label: 'Nekontrolováno' },
                { value: 'OK', label: 'OK' },
                { value: 'závada', label: 'Závada' },
              ]}
            />
          </div>
          <Input
            label="Poznámka"
            value={zarizeniFormData.poznamka}
            onChange={(e) => setZarizeniFormData({ ...zarizeniFormData, poznamka: e.target.value })}
            placeholder="Volitelná poznámka..."
          />
        </form>
      </Modal>



      {/* Lightbox pro zvětšení fotek */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={lightboxImage}
              alt="Zvětšená fotka"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-[var(--surface)] rounded-full shadow-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)]"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {/* Fixní spodní lišta Uložit – viditelná při scrollování */}
      {(activeTab === 'info' || activeTab === 'dokumentace') && (
        <div className="fixed bottom-0 left-0 lg:left-64 right-0 z-50 bg-[var(--glass-bg-strong)] backdrop-blur-md border-t border-[var(--glass-border)] shadow-[0_-4px_20px_rgba(0,0,0,0.35)]">
          <div className="max-w-4xl mx-auto px-4 py-1 flex justify-center">
            <button onClick={handleSave} className="px-6 py-1 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm font-semibold rounded transition-colors cursor-pointer">💾 Uložit změny</button>
          </div>
        </div>
      )}
    </div>
  );
}
