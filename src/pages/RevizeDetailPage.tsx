import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button, Card, Input, Select, Modal } from '../components/ui';
import { PDFExportModal } from '../components/PDFExportModal';
import { revizeService, rozvadecService, zavadaService, mistnostService, okruhService, pristrojService, revizePristrojService, zarizeniService, firmaService, zavadaKatalogService, nastaveniService, zakazniciService } from '../services/database';
import type { Revize, Rozvadec, Zavada, Mistnost, Okruh, MericiPristroj, Zarizeni, Firma, ZavadaKatalog, Nastaveni, Zakaznik } from '../types';

export function RevizeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [revize, setRevize] = useState<Revize | null>(null);
  const [rozvadece, setRozvadece] = useState<Rozvadec[]>([]);
  const [zavady, setZavady] = useState<Zavada[]>([]);
  const [mistnosti, setMistnosti] = useState<Mistnost[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isRozvadecModalOpen, setIsRozvadecModalOpen] = useState(false);
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);
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
    plocha: undefined as number | undefined,
    typ: 'obytný prostor',
    prostredi: 'normální',
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
    vodic: '3x2,5',
    izolacniOdpor: undefined as number | undefined,
    impedanceSmycky: undefined as number | undefined,
    proudovyChranicMa: undefined as number | undefined,
    casOdpojeni: undefined as number | undefined,
    poznamka: '',
  });

  useEffect(() => {
    if (id) {
      loadData(parseInt(id));
    }
  }, [id]);

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

  const handleSave = async () => {
    if (revize?.id) {
      let dataToSave = { ...formData };
      
      // Pokud se stav změní na "dokončeno", vypočítat platnost
      if (formData.stav === 'dokončeno' && revize.stav !== 'dokončeno') {
        const today = new Date();
        const platnostDo = new Date(today);
        platnostDo.setMonth(platnostDo.getMonth() + (formData.termin || 36));
        dataToSave.datumPlatnosti = platnostDo.toISOString().split('T')[0];
        dataToSave.datumVypracovani = today.toISOString().split('T')[0];
      }
      
      await revizeService.update(revize.id, dataToSave);
      setIsEditing(false);
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
      if (editingOkruh?.id) {
        await okruhService.update(editingOkruh.id, okruhFormData);
      } else {
        await okruhService.create({
          ...okruhFormData,
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
      vodic: '3x2,5',
      izolacniOdpor: undefined,
      impedanceSmycky: undefined,
      proudovyChranicMa: undefined,
      casOdpojeni: undefined,
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
      plocha: undefined,
      typ: 'obytný prostor',
      prostredi: 'normální',
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
      plocha: mistnost.plocha,
      typ: mistnost.typ,
      prostredi: mistnost.prostredi,
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
    setOkruhFormData({
      cislo: okruh.cislo,
      nazev: okruh.nazev,
      jisticTyp: okruh.jisticTyp,
      jisticProud: okruh.jisticProud,
      pocetFazi: okruh.pocetFazi || 1,
      vodic: okruh.vodic,
      izolacniOdpor: okruh.izolacniOdpor,
      impedanceSmycky: okruh.impedanceSmycky,
      proudovyChranicMa: okruh.proudovyChranicMa,
      casOdpojeni: okruh.casOdpojeni,
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
        vodic: okruh.vodic,
        izolacniOdpor: okruh.izolacniOdpor,
        impedanceSmycky: okruh.impedanceSmycky,
        proudovyChranicMa: okruh.proudovyChranicMa,
        casOdpojeni: okruh.casOdpojeni,
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
        <p className="text-slate-500">Načítání revize...</p>
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
        <p className="text-slate-500">Revize nebyla nalezena</p>
        <Button variant="secondary" onClick={() => navigate('/revize')} className="mt-4">
          ← Zpět na seznam revizí
        </Button>
      </div>
    );
  }

  const tabs = [
    { id: 'info', label: 'Základní údaje', icon: '📋' },
    { id: 'dokumentace', label: 'Dokumentace', icon: '📑' },
    { id: 'rozvadece', label: `Rozvaděče (${rozvadece.length})`, icon: '⚡' },
    { id: 'zavady', label: `Závady (${zavady.length})`, icon: '⚠️' },
    { id: 'mistnosti', label: `Místnosti (${mistnosti.length})`, icon: '🏠' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            <Link to="/revize" className="hover:text-blue-600">Revize</Link>
            <span>/</span>
            <span>{revize.cisloRevize}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{revize.nazev}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/revize')}>
            ← Zpět
          </Button>
          <Button variant="success" onClick={() => { console.log('Opening PDF modal'); setIsPDFModalOpen(true); }}>
            📄 Export PDF
          </Button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'info' && (
        <div className="space-y-4">
          {/* Tlačítka pro úpravy */}
          <div className="flex justify-end gap-2">
            {isEditing ? (
              <>
                <Button variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
                  Zrušit
                </Button>
                <Button size="sm" onClick={handleSave}>
                  Uložit
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => setIsEditing(true)}>
                Upravit
              </Button>
            )}
          </div>

          {/* Identifikace */}
          <Card title="Identifikace">
            {isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Číslo revize"
                  value={formData.cisloRevize || ''}
                  onChange={(e) => setFormData({ ...formData, cisloRevize: e.target.value })}
                  disabled
                />
                <Input
                  label="Název"
                  value={formData.nazev || ''}
                  onChange={(e) => setFormData({ ...formData, nazev: e.target.value })}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Číslo revize</p>
                  <p className="font-medium font-mono">{revize.cisloRevize}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Název</p>
                  <p className="font-medium">{revize.nazev}</p>
                </div>
              </div>
            )}
          </Card>

          {/* Místo a objednatel */}
          <Card title="Místo a objednatel">
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Adresa"
                    value={formData.adresa || ''}
                    onChange={(e) => setFormData({ ...formData, adresa: e.target.value })}
                  />
                  <Input
                    label="Objednatel"
                    value={formData.objednatel || ''}
                    onChange={(e) => setFormData({ ...formData, objednatel: e.target.value })}
                    placeholder="Nebo vyberte zákazníka níže"
                  />
                </div>
                
                {/* Výběr zákazníka */}
                <div className="border-t pt-4">
                  <Select
                    label="Vybrat z uložených zákazníků"
                    value={selectedZakaznikId}
                    onChange={(e) => {
                      const zakaznikId = e.target.value;
                      setSelectedZakaznikId(zakaznikId);
                      if (zakaznikId) {
                        const zakaznik = zakaznici.find(z => z.id === parseInt(zakaznikId));
                        if (zakaznik) {
                          // Naplnit objednatele daty ze zákazníka
                          setFormData({
                            ...formData,
                            objednatel: zakaznik.nazev,
                            zakaznikId: zakaznik.id
                          });
                        }
                      } else {
                        setFormData({ ...formData, zakaznikId: undefined });
                      }
                    }}
                    options={[
                      { value: '', label: '-- Vyberte zákazníka --' },
                      ...zakaznici.filter(z => z.id !== undefined).map(z => ({
                        value: z.id!.toString(),
                        label: `${z.nazev}${z.adresa ? ` (${z.adresa})` : ''}`
                      }))
                    ]}
                  />
                  {selectedZakaznikId && (() => {
                    const zakaznik = zakaznici.find(z => z.id === parseInt(selectedZakaznikId));
                    return zakaznik ? (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm">
                        <div className="grid grid-cols-2 gap-2">
                          {zakaznik.adresa && <div><span className="text-gray-500">Adresa:</span> {zakaznik.adresa}</div>}
                          {zakaznik.ico && <div><span className="text-gray-500">IČO:</span> {zakaznik.ico}</div>}
                          {zakaznik.kontaktOsoba && <div><span className="text-gray-500">Kontakt:</span> {zakaznik.kontaktOsoba}</div>}
                          {zakaznik.telefon && <div><span className="text-gray-500">Tel:</span> {zakaznik.telefon}</div>}
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Adresa</p>
                  <p className="font-medium">{revize.adresa}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Objednatel</p>
                  <p className="font-medium">{revize.objednatel}</p>
                  {revize.zakaznikId && (() => {
                    const zakaznik = zakaznici.find(z => z.id === revize.zakaznikId);
                    return zakaznik ? (
                      <p className="text-sm text-blue-600">
                        <Link to="/zakaznici" className="hover:underline">
                          👥 {zakaznik.nazev}
                        </Link>
                      </p>
                    ) : null;
                  })()}
                </div>
              </div>
            )}
          </Card>

          {/* Datumy a termíny */}
          <Card title="Datumy a termíny">
            {isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Input
                  type="date"
                  label="Datum revize"
                  value={formData.datum || ''}
                  onChange={(e) => setFormData({ ...formData, datum: e.target.value })}
                />
                <Input
                  type="date"
                  label="Datum dokončení"
                  value={formData.datumDokonceni || ''}
                  onChange={(e) => setFormData({ ...formData, datumDokonceni: e.target.value })}
                />
                <Input
                  type="date"
                  label="Datum vypracování"
                  value={formData.datumVypracovani || ''}
                  onChange={(e) => setFormData({ ...formData, datumVypracovani: e.target.value })}
                />
                <Select
                  label="Termín platnosti"
                  value={String(formData.termin || 36)}
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
                  <p className="text-sm text-slate-500 py-2 bg-slate-50 rounded px-2">
                    {formData.datumPlatnosti 
                      ? new Date(formData.datumPlatnosti).toLocaleDateString('cs-CZ')
                      : 'Vypočítá se při dokončení'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Datum revize</p>
                  <p className="font-medium">{new Date(revize.datum).toLocaleDateString('cs-CZ')}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Datum dokončení</p>
                  <p className="font-medium">
                    {revize.datumDokonceni 
                      ? new Date(revize.datumDokonceni).toLocaleDateString('cs-CZ')
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Datum vypracování</p>
                  <p className="font-medium">
                    {revize.datumVypracovani 
                      ? new Date(revize.datumVypracovani).toLocaleDateString('cs-CZ')
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Termín platnosti</p>
                  <p className="font-medium">{revize.termin} měsíců</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Platnost do</p>
                  <p className="font-medium">
                    {revize.datumPlatnosti 
                      ? new Date(revize.datumPlatnosti).toLocaleDateString('cs-CZ')
                      : '—'}
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Stav revize */}
          <Card title="Stav revize">
            {isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  label="Typ revize"
                  value={formData.typRevize || ''}
                  onChange={(e) => setFormData({ ...formData, typRevize: e.target.value as any })}
                  options={[
                    { value: 'pravidelná', label: 'Pravidelná' },
                    { value: 'výchozí', label: 'Výchozí' },
                    { value: 'mimořádná', label: 'Mimořádná' },
                  ]}
                />
                <Select
                  label="Stav"
                  value={formData.stav || ''}
                  onChange={(e) => setFormData({ ...formData, stav: e.target.value as any })}
                  options={[
                    { value: 'rozpracováno', label: 'Rozpracováno' },
                    { value: 'dokončeno', label: 'Dokončeno' },
                    { value: 'schváleno', label: 'Schváleno' },
                  ]}
                />
                <Select
                  label="Výsledek"
                  value={formData.vysledek || ''}
                  onChange={(e) => setFormData({ ...formData, vysledek: e.target.value as any })}
                  options={[
                    { value: '', label: '-- Nevyplněno --' },
                    { value: 'schopno', label: 'Schopno provozu' },
                    { value: 'neschopno', label: 'Neschopno provozu' },
                    { value: 'podmíněně schopno', label: 'Podmíněně schopno' },
                  ]}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Typ revize</p>
                  <p className="font-medium capitalize">{revize.typRevize}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Stav</p>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    revize.stav === 'dokončeno' ? 'bg-green-100 text-green-700' :
                    revize.stav === 'rozpracováno' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {revize.stav}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Výsledek</p>
                  {revize.vysledek ? (
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      revize.vysledek === 'schopno' ? 'bg-green-100 text-green-700' :
                      revize.vysledek === 'neschopno' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {revize.vysledek}
                    </span>
                  ) : (
                    <p className="font-medium text-slate-400">—</p>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* Firma provádějící revizi */}
          <Card title="Firma provádějící revizi">
            {isEditing ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-500 mb-2">
                  Pokud provádíte revizi pro jinou firmu, vyberte ji ze seznamu nebo zadejte údaje ručně. Jinak se použijí údaje z nastavení.
                </p>
                
                {/* Výběr z uložených firem */}
                <Select
                  label="Vybrat firmu ze seznamu"
                  value={selectedFirmaId}
                  onChange={(e) => {
                    const firmaId = e.target.value;
                    setSelectedFirmaId(firmaId);
                    if (firmaId === '') {
                      // Výchozí firma z nastavení
                      setFormData({
                        ...formData,
                        firmaJmeno: '',
                        firmaIco: '',
                        firmaAdresa: '',
                        firmaDic: '',
                      });
                    } else {
                      const firma = firmy.find(f => f.id?.toString() === firmaId);
                      if (firma) {
                        setFormData({
                          ...formData,
                          firmaJmeno: firma.nazev,
                          firmaIco: firma.ico || '',
                          firmaAdresa: firma.adresa || '',
                          firmaDic: firma.dic || '',
                        });
                      }
                    }
                  }}
                  options={[
                    { value: '', label: 'Použít firmu z nastavení' },
                    ...firmy.map(f => ({ value: f.id!.toString(), label: f.nazev }))
                  ]}
                />

                <div className="border-t border-slate-200 pt-4 mt-4">
                  <p className="text-sm font-medium text-slate-700 mb-3">Údaje firmy (ruční zadání nebo úprava):</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Název firmy"
                      value={formData.firmaJmeno || ''}
                      onChange={(e) => setFormData({ ...formData, firmaJmeno: e.target.value })}
                      placeholder="Ponechte prázdné pro použití výchozí firmy"
                    />
                    <Input
                      label="IČO"
                      value={formData.firmaIco || ''}
                      onChange={(e) => setFormData({ ...formData, firmaIco: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <Input
                      label="Adresa firmy"
                      value={formData.firmaAdresa || ''}
                      onChange={(e) => setFormData({ ...formData, firmaAdresa: e.target.value })}
                    />
                    <Input
                      label="DIČ"
                      value={formData.firmaDic || ''}
                      onChange={(e) => setFormData({ ...formData, firmaDic: e.target.value })}
                    />
                  </div>
                </div>
                
                {firmy.length === 0 && (
                  <p className="text-sm text-amber-600 mt-2">
                    💡 Tip: Můžete si předem vytvořit seznam firem v sekci <Link to="/firmy" className="underline font-medium">Firmy</Link>.
                  </p>
                )}
                
                {/* Zobrazit náhled výchozí firmy z nastavení */}
                {selectedFirmaId === '' && nastaveni && (nastaveni.firmaJmeno || nastaveni.firmaIco) && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 mb-2">📋 Náhled firmy z nastavení:</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-blue-600">Název:</span> {nastaveni.firmaJmeno || '—'}</div>
                      <div><span className="text-blue-600">IČO:</span> {nastaveni.firmaIco || '—'}</div>
                      <div><span className="text-blue-600">Adresa:</span> {nastaveni.firmaAdresa || '—'}</div>
                      <div><span className="text-blue-600">DIČ:</span> {nastaveni.firmaDic || '—'}</div>
                    </div>
                  </div>
                )}
                
                {selectedFirmaId === '' && (!nastaveni || (!nastaveni.firmaJmeno && !nastaveni.firmaIco)) && (
                  <p className="text-sm text-amber-600 mt-4">
                    ⚠️ V nastavení nemáte vyplněnou výchozí firmu. <Link to="/nastaveni" className="underline font-medium">Přejít do nastavení</Link>
                  </p>
                )}
              </div>
            ) : (
              <div>
                {revize.firmaJmeno ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Název firmy</p>
                      <p className="font-medium">{revize.firmaJmeno}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">IČO</p>
                      <p className="font-medium">{revize.firmaIco || '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Adresa</p>
                      <p className="font-medium">{revize.firmaAdresa || '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">DIČ</p>
                      <p className="font-medium">{revize.firmaDic || '—'}</p>
                    </div>
                  </div>
                ) : nastaveni && (nastaveni.firmaJmeno || nastaveni.firmaIco) ? (
                  <div>
                    <p className="text-sm text-slate-500 italic mb-2">Firma z nastavení:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-500">Název firmy</p>
                        <p className="font-medium">{nastaveni.firmaJmeno || '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">IČO</p>
                        <p className="font-medium">{nastaveni.firmaIco || '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Adresa</p>
                        <p className="font-medium">{nastaveni.firmaAdresa || '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">DIČ</p>
                        <p className="font-medium">{nastaveni.firmaDic || '—'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 italic">Firma není nastavena</p>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Záložka DOKUMENTACE */}
      {activeTab === 'dokumentace' && (
        <div className="space-y-4">
          {/* Tlačítka pro úpravy */}
          <div className="flex justify-end gap-2">
            {isEditing ? (
              <>
                <Button variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
                  Zrušit
                </Button>
                <Button size="sm" onClick={handleSave}>
                  Uložit
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => setIsEditing(true)}>
                Upravit
              </Button>
            )}
          </div>

          {/* Detailní informace podle NV */}
          <Card title="Detailní informace revize">
            {isEditing ? (
              <div className="space-y-4">
                {formData.typRevize === 'mimořádná' && (
                  <Input
                    label="Důvod mimořádné revize"
                    value={formData.duvodMimoradne || ''}
                    onChange={(e) => setFormData({ ...formData, duvodMimoradne: e.target.value })}
                    placeholder="Např. havárie, rekonstrukce..."
                  />
                )}
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Vymezení rozsahu revize
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    value={formData.rozsahRevize || ''}
                    onChange={(e) => setFormData({ ...formData, rozsahRevize: e.target.value })}
                    placeholder="Co je předmětem revize..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Seznam podkladů
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    value={formData.podklady || ''}
                    onChange={(e) => setFormData({ ...formData, podklady: e.target.value })}
                    placeholder="Projekty, předchozí revize, dokumentace..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Soupis provedených úkonů
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    value={formData.provedeneUkony || ''}
                    onChange={(e) => setFormData({ ...formData, provedeneUkony: e.target.value })}
                    placeholder="Prohlídka, zkoušky, měření..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Vyhodnocení předchozích revizí
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    value={formData.vyhodnoceniPredchozich || ''}
                    onChange={(e) => setFormData({ ...formData, vyhodnoceniPredchozich: e.target.value })}
                    placeholder="Zhodnocení odstranění závad z předchozí revize..."
                  />
                </div>

                {formData.vysledek === 'neschopno' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Odůvodnění neschopnosti provozu
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      value={formData.vysledekOduvodneni || ''}
                      onChange={(e) => setFormData({ ...formData, vysledekOduvodneni: e.target.value })}
                      placeholder="Podrobné zdůvodnění proč není zařízení schopno provozu..."
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Závěr revize
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    value={formData.zaver || ''}
                    onChange={(e) => setFormData({ ...formData, zaver: e.target.value })}
                    placeholder="Shrnutí nejdůležitějších zjištění a doporučení..."
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {revize.typRevize === 'mimořádná' && revize.duvodMimoradne && (
                  <div>
                    <p className="text-sm text-slate-500">Důvod mimořádné revize</p>
                    <p className="font-medium">{revize.duvodMimoradne}</p>
                  </div>
                )}

                {revize.rozsahRevize && (
                  <div>
                    <p className="text-sm text-slate-500">Vymezení rozsahu revize</p>
                    <p className="font-medium whitespace-pre-wrap">{revize.rozsahRevize}</p>
                  </div>
                )}

                {revize.podklady && (
                  <div>
                    <p className="text-sm text-slate-500">Seznam podkladů</p>
                    <p className="font-medium whitespace-pre-wrap">{revize.podklady}</p>
                  </div>
                )}

                {revize.provedeneUkony && (
                  <div>
                    <p className="text-sm text-slate-500">Soupis provedených úkonů</p>
                    <p className="font-medium whitespace-pre-wrap">{revize.provedeneUkony}</p>
                  </div>
                )}

                {revize.vyhodnoceniPredchozich && (
                  <div>
                    <p className="text-sm text-slate-500">Vyhodnocení předchozích revizí</p>
                    <p className="font-medium whitespace-pre-wrap">{revize.vyhodnoceniPredchozich}</p>
                  </div>
                )}

                {revize.vysledek === 'neschopno' && revize.vysledekOduvodneni && (
                  <div>
                    <p className="text-sm text-slate-500">Odůvodnění neschopnosti provozu</p>
                    <p className="font-medium whitespace-pre-wrap">{revize.vysledekOduvodneni}</p>
                  </div>
                )}

                {revize.zaver && (
                  <div>
                    <p className="text-sm text-slate-500">Závěr revize</p>
                    <p className="font-medium whitespace-pre-wrap">{revize.zaver}</p>
                  </div>
                )}

                {!revize.rozsahRevize && !revize.podklady && 
                 !revize.provedeneUkony && !revize.vyhodnoceniPredchozich && !revize.vysledekOduvodneni && !revize.zaver && (
                  <p className="text-slate-500 italic">Zatím nebyly vyplněny detailní informace</p>
                )}
              </div>
            )}
          </Card>

          {/* Použitá měřící zařízení */}
          <Card 
            title="Použitá měřící zařízení"
            actions={
              <Button size="sm" onClick={() => setIsPristrojModalOpen(true)}>
                + Přidat přístroj
              </Button>
            }
          >
            {pouzitePristroje.length > 0 ? (
              <div className="space-y-2">
                {pouzitePristroje.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex-1">
                      <p className="font-medium">{p.nazev}</p>
                      <p className="text-sm text-slate-500">
                        {p.vyrobce} {p.model} • V.č.: {p.vyrobniCislo}
                      </p>
                      <p className="text-xs text-slate-400">
                        Kalibrace: {new Date(p.datumKalibrace).toLocaleDateString('cs-CZ')} — 
                        Platnost: {new Date(p.platnostKalibrace).toLocaleDateString('cs-CZ')}
                      </p>
                    </div>
                    <Button 
                      variant="danger" 
                      size="sm"
                      onClick={async () => {
                        if (revize?.id && p.id) {
                          await revizePristrojService.removeFromRevize(revize.id, p.id);
                          loadData(revize.id);
                        }
                      }}
                    >
                      Odebrat
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-4">
                Zatím nejsou přiřazeny žádné měřící přístroje.
              </p>
            )}
          </Card>
        </div>
      )}

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
                    <p className="text-sm text-slate-500">
                      {p.vyrobce} {p.model} • V.č.: {p.vyrobniCislo}
                    </p>
                    <p className="text-xs text-slate-400">
                      Platnost kalibrace: {new Date(p.platnostKalibrace).toLocaleDateString('cs-CZ')}
                    </p>
                  </div>
                  <span className="text-blue-600">+ Přidat</span>
                </div>
              ))
          ) : (
            <div className="text-center py-4">
              <p className="text-slate-500 mb-2">
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
                        <p className="text-xs text-slate-500">
                          {r.oznaceni} • {r.stupenKryti}
                        </p>
                        <p className="text-xs text-slate-400">{r.umisteni}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-6 text-sm">
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
                      + Přidat okruh
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
                    <p className="text-xs text-slate-500">Označení</p>
                    <p className="font-medium">{selectedRozvadec.oznaceni}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">Umístění</p>
                    <p className="font-medium">{selectedRozvadec.umisteni}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">Typ</p>
                    <p className="font-medium">{selectedRozvadec.typRozvadece || '—'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">Krytí</p>
                    <p className="font-medium">{selectedRozvadec.stupenKryti}</p>
                  </div>
                </div>

                <h4 className="font-medium text-slate-700 mb-3">Okruhy ({okruhy.length})</h4>
                {okruhy.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-2 px-3 font-medium text-slate-600 text-sm">Č.</th>
                          <th className="text-left py-2 px-3 font-medium text-slate-600 text-sm">Jistič</th>
                          <th className="text-left py-2 px-3 font-medium text-slate-600 text-sm">Název</th>
                          <th className="text-left py-2 px-3 font-medium text-slate-600 text-sm">Vodič</th>
                          <th className="text-left py-2 px-3 font-medium text-slate-600 text-sm">Iz. odpor</th>
                          <th className="text-left py-2 px-3 font-medium text-slate-600 text-sm">Imp. smyčky</th>
                          <th className="text-right py-2 px-3 font-medium text-slate-600 text-sm">Akce</th>
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
                            className={`border-b border-slate-100 hover:bg-slate-50 cursor-grab active:cursor-grabbing ${
                              draggedOkruh?.id === o.id ? 'opacity-50 bg-blue-50' : ''
                            }`}
                          >
                            <td className="py-2 px-3 font-medium">
                              <span className="flex items-center gap-2">
                                <span className="text-slate-400">⋮⋮</span>
                                {o.cislo}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100">
                                {o.pocetFazi || 1}/{o.jisticTyp}{o.jisticProud.replace('A', '')}
                              </span>
                            </td>
                            <td className="py-2 px-3">{o.nazev}</td>
                            <td className="py-2 px-3 text-slate-600">{o.vodic}</td>
                            <td className="py-2 px-3 text-slate-600">
                              {o.izolacniOdpor ? `${o.izolacniOdpor} MΩ` : '—'}
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              {o.impedanceSmycky ? `${o.impedanceSmycky} Ω` : '—'}
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
                  <p className="text-center text-slate-500 py-6 bg-slate-50 rounded-lg">
                    Zatím žádné okruhy. Přidejte první kliknutím na tlačítko výše.
                  </p>
                )}
              </Card>
            ) : (
              <Card>
                <div className="text-center py-12 text-slate-500">
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
              + Přidat závadu
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
                    <p className="text-sm text-slate-500">
                      Zjištěno: {new Date(z.datumZjisteni).toLocaleDateString('cs-CZ')}
                      {z.datumVyreseni && ` • Vyřešeno: ${new Date(z.datumVyreseni).toLocaleDateString('cs-CZ')}`}
                    </p>
                    {z.rozvadecId && (
                      <p className="text-xs text-slate-400">
                        Rozvaděč: {rozvadece.find(r => r.id === z.rozvadecId)?.nazev || 'Neznámý'}
                      </p>
                    )}
                    {z.poznamka && (
                      <p className="text-sm text-slate-500 mt-1 italic">{z.poznamka}</p>
                    )}
                    {z.fotky && z.fotky.length > 0 && (
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
                        {z.fotky.length > 4 && (
                          <span className="w-12 h-12 flex items-center justify-center bg-slate-200 rounded text-sm font-medium text-slate-600">
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
            <p className="text-center text-slate-500 py-8">
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
                        <p className="text-xs text-slate-500">
                          {m.typ} • {m.prostredi}
                        </p>
                        <p className="text-xs text-slate-400">
                          {m.patro && `${m.patro}`}
                          {m.plocha && ` • ${m.plocha} m²`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-6 text-sm">
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
                      + Přidat zařízení
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
                <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">Typ</p>
                    <p className="font-medium">{selectedMistnost.typ}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">Prostředí</p>
                    <p className="font-medium">{selectedMistnost.prostredi}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">Patro</p>
                    <p className="font-medium">{selectedMistnost.patro || '—'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">Plocha</p>
                    <p className="font-medium">{selectedMistnost.plocha ? `${selectedMistnost.plocha} m²` : '—'}</p>
                  </div>
                </div>

                <h4 className="font-medium text-slate-700 mb-3">Zařízení ({zarizeni.length})</h4>
                {zarizeni.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-2 px-3 font-medium text-slate-600 text-sm">Název</th>
                          <th className="text-left py-2 px-3 font-medium text-slate-600 text-sm">Ks</th>
                          <th className="text-left py-2 px-3 font-medium text-slate-600 text-sm">Třída</th>
                          <th className="text-left py-2 px-3 font-medium text-slate-600 text-sm">Příkon</th>
                          <th className="text-left py-2 px-3 font-medium text-slate-600 text-sm">Ochrana před dotykem</th>
                          <th className="text-left py-2 px-3 font-medium text-slate-600 text-sm">Stav</th>
                          <th className="text-right py-2 px-3 font-medium text-slate-600 text-sm">Akce</th>
                        </tr>
                      </thead>
                      <tbody>
                        {zarizeni.map((z) => (
                          <tr key={z.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-2 px-3">
                              <p className="font-medium">{z.nazev}</p>
                              {z.oznaceni && <p className="text-xs text-slate-400">{z.oznaceni}</p>}
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              {z.pocetKs || 1}
                            </td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100">
                                {z.trida || 'I'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              {z.prikonW ? `${z.prikonW} W` : '—'}
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              {z.ochranaPredDotykem || '—'}
                            </td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                z.stav === 'OK' ? 'bg-green-100 text-green-700' :
                                z.stav === 'závada' ? 'bg-red-100 text-red-700' :
                                'bg-slate-100 text-slate-600'
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
                  <p className="text-center text-slate-500 py-6 text-sm">
                    Zatím žádná zařízení. Přidejte první kliknutím na tlačítko výše.
                  </p>
                )}
              </Card>
            ) : (
              <Card title="Detail místnosti">
                <p className="text-center text-slate-500 py-12">
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
          <div className="grid grid-cols-4 gap-4">
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
            <Input
              label="Vodič"
              value={okruhFormData.vodic}
              onChange={(e) => setOkruhFormData({ ...okruhFormData, vodic: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="number"
              step="0.1"
              label="Izolační odpor (MΩ)"
              value={okruhFormData.izolacniOdpor || ''}
              onChange={(e) => setOkruhFormData({ ...okruhFormData, izolacniOdpor: e.target.value ? parseFloat(e.target.value) : undefined })}
            />
            <Input
              type="number"
              step="0.01"
              label="Impedance smyčky (Ω)"
              value={okruhFormData.impedanceSmycky || ''}
              onChange={(e) => setOkruhFormData({ ...okruhFormData, impedanceSmycky: e.target.value ? parseFloat(e.target.value) : undefined })}
            />
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
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
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
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Patro"
              value={mistnostFormData.patro}
              onChange={(e) => setMistnostFormData({ ...mistnostFormData, patro: e.target.value })}
              placeholder="např. 1.NP, přízemí..."
            />
            <Input
              label="Plocha (m²)"
              type="number"
              value={mistnostFormData.plocha?.toString() || ''}
              onChange={(e) => setMistnostFormData({ ...mistnostFormData, plocha: e.target.value ? parseFloat(e.target.value) : undefined })}
              placeholder="např. 25"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Typ místnosti"
              value={mistnostFormData.typ}
              onChange={(e) => setMistnostFormData({ ...mistnostFormData, typ: e.target.value })}
              options={[
                { value: 'obytný prostor', label: 'Obytný prostor' },
                { value: 'kuchyň', label: 'Kuchyň' },
                { value: 'koupelna', label: 'Koupelna' },
                { value: 'WC', label: 'WC' },
                { value: 'chodba', label: 'Chodba' },
                { value: 'sklep', label: 'Sklep' },
                { value: 'garáž', label: 'Garáž' },
                { value: 'dílna', label: 'Dílna' },
                { value: 'sklad', label: 'Sklad' },
                { value: 'kancelář', label: 'Kancelář' },
                { value: 'technická místnost', label: 'Technická místnost' },
                { value: 'jiné', label: 'Jiné' },
              ]}
            />
            <Select
              label="Prostředí"
              value={mistnostFormData.prostredi}
              onChange={(e) => setMistnostFormData({ ...mistnostFormData, prostredi: e.target.value })}
              options={[
                { value: 'normální', label: 'Normální' },
                { value: 'vlhké', label: 'Vlhké' },
                { value: 'mokré', label: 'Mokré' },
                { value: 'prašné', label: 'Prašné' },
                { value: 'horké', label: 'Horké' },
                { value: 'venkovní', label: 'Venkovní' },
                { value: 's nebezpečím výbuchu', label: 'S nebezpečím výbuchu' },
              ]}
            />
          </div>
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

      {/* PDF Export Modal */}
      {revize && (
        <PDFExportModal
          isOpen={isPDFModalOpen}
          onClose={() => setIsPDFModalOpen(false)}
          revize={revize}
        />
      )}

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
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
