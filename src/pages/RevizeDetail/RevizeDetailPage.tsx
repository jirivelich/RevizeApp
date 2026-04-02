import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/ui';
import {
  okruhService, zarizeniService,
} from '../../services/database';
import type { Revize, MericiPristroj, Firma, Zakaznik } from '../../types';
import {
  useRevizeDetail, useUpdateRevize,
  useRozvadeceByRevize, useZavadyByRevize, useMistnostiByRevize,
  usePristrojeByRevize, usePristroje, useFirmy, useZakaznici,
  useNastaveni, usePredvoleneTexty, useZavadyKatalog,
} from '../../hooks/useQueries';
import { useAutosave } from '../../hooks/useAutosave';
import type { AutosaveStatus } from '../../hooks/useAutosave';

const EMPTY_ARR: never[] = [];

import { InfoTab } from './InfoTab';
import { DokumentaceTab } from './DokumentaceTab';
import { RozvadeceTab } from './RozvadeceTab';
import { ZavadyTab } from './ZavadyTab';
import { MistnostiTab } from './MistnostiTab';
import { HromosvodInfoTab } from './HromosvodInfoTab';
import { HromosvodZarizeniTab } from './HromosvodZarizeniTab';
import { StrojniZarizeniTab } from './StrojniZarizeniTab';

export function RevizeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const numericId = id ? parseInt(id) : undefined;

  // Core state (local)
  const [formData, setFormData] = useState<Partial<Revize>>({});
  const [activeTab, setActiveTab] = useState<'info' | 'dokumentace' | 'rozvadece' | 'zavady' | 'mistnosti' | 'hromosvod_zarizeni' | 'strojni_zarizeni'>('info');
  const [selectedFirmaId, setSelectedFirmaId] = useState<string>('');
  const [selectedZakaznikId, setSelectedZakaznikId] = useState<string>('');

  // ---- React Query hooks (parallel fetch, cached) ----
  const { data: revize = null, isLoading: loadingRevize, error: revizeError } = useRevizeDetail(numericId);
  const { data: rozvadece = EMPTY_ARR } = useRozvadeceByRevize(numericId);
  const { data: zavady = EMPTY_ARR } = useZavadyByRevize(numericId);
  const { data: mistnosti = EMPTY_ARR } = useMistnostiByRevize(numericId);
  const { data: pouzitePristroje = EMPTY_ARR as unknown as MericiPristroj[] } = usePristrojeByRevize(numericId);
  const { data: vsechnyPristroje = EMPTY_ARR as unknown as MericiPristroj[] } = usePristroje();
  const { data: firmy = EMPTY_ARR as unknown as Firma[] } = useFirmy();
  const { data: zakaznici = EMPTY_ARR as unknown as Zakaznik[] } = useZakaznici();
  const { data: nastaveni = null } = useNastaveni();
  const { data: vlastniTexty = EMPTY_ARR } = usePredvoleneTexty();
  const { data: katalogZavad = EMPTY_ARR } = useZavadyKatalog();

  const updateRevize = useUpdateRevize();

  // Sync formData only on first load of a revision (not on background refetches).
  // This prevents autosave from being triggered by React Query cache invalidations.
  const loadedForIdRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (revize && revize.id !== loadedForIdRef.current) {
      loadedForIdRef.current = revize.id;
      setFormData(revize);
      if (revize.zakaznikId) setSelectedZakaznikId(revize.zakaznikId.toString());
    }
  }, [revize]);

  // Autosave handler — called by useAutosave hook (no special 'dokončeno' logic here;
  // that logic lives in the stav select onChange and in the manual handleSave button).
  const handleAutosave = useCallback(async (data: Partial<Revize>) => {
    if (!revize?.id) return;
    await updateRevize.mutateAsync({ id: revize.id, data });
  }, [revize?.id, updateRevize]);

  const { status: autoStatus, saveNow, flush } = useAutosave(formData, revize, handleAutosave);

  // Display status: 'saved' fades out after 2s
  const [displayStatus, setDisplayStatus] = useState<AutosaveStatus>('idle');
  useEffect(() => {
    setDisplayStatus(autoStatus);
    if (autoStatus === 'saved') {
      const t = setTimeout(() => setDisplayStatus('idle'), 2000);
      return () => clearTimeout(t);
    }
  }, [autoStatus]);

  // Warn before browser close/refresh if there are unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (autoStatus === 'unsaved') e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [autoStatus]);

  // Okruhy counts — N+1 but computed only when rozvadece change
  const [okruhyCounts, setOkruhyCounts] = useState<Record<number, number>>({});
  useEffect(() => {
    if (rozvadece.length === 0) return;
    let cancelled = false;
    (async () => {
      const counts: Record<number, number> = {};
      for (const roz of rozvadece) {
        if (roz.id) {
          const okruhyRoz = await okruhService.getByRozvadec(roz.id);
          counts[roz.id] = okruhyRoz.length;
        }
      }
      if (!cancelled) setOkruhyCounts(counts);
    })();
    return () => { cancelled = true; };
  }, [rozvadece]);

  // Zarizeni counts — N+1 but computed only when mistnosti change
  const [zarizeniCounts, setZarizeniCounts] = useState<Record<number, number>>({});
  useEffect(() => {
    if (mistnosti.length === 0) return;
    let cancelled = false;
    (async () => {
      const counts: Record<number, number> = {};
      for (const mist of mistnosti) {
        if (mist.id) {
          const zarList = await zarizeniService.getByMistnost(mist.id);
          counts[mist.id] = zarList.length;
        }
      }
      if (!cancelled) setZarizeniCounts(counts);
    })();
    return () => { cancelled = true; };
  }, [mistnosti]);

  const loading = loadingRevize;
  const error = revizeError?.message ?? null;

  const handleSave = async () => {
    if (revize?.id) {
      let dataToSave = { ...formData };
      if (formData.stav === 'dokončeno' && revize.stav !== 'dokončeno') {
        const today = new Date();
        const platnostDo = new Date(today);
        platnostDo.setMonth(platnostDo.getMonth() + (formData.termin || 36));
        dataToSave.datumPlatnosti = platnostDo.toISOString().split('T')[0];
        dataToSave.datumVypracovani = today.toISOString().split('T')[0];
        setFormData(dataToSave);
      }
      updateRevize.mutate({ id: revize.id, data: dataToSave });
    }
  };

  // Loading / Error / Not found guards
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
        <div className="text-red-500 text-sm mb-4">Chyba</div>
        <p className="text-red-600 font-medium mb-2">{error}</p>
        <Button variant="secondary" onClick={() => navigate('/revize')}>← Zpět na seznam revizí</Button>
      </div>
    );
  }

  if (!revize) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Revize nebyla nalezena</p>
        <Button variant="secondary" onClick={() => navigate('/revize')} className="mt-4">← Zpět na seznam revizí</Button>
      </div>
    );
  }

  const isHromosvod = revize.kategorieRevize === 'hromosvod';
  const isStroje = revize.kategorieRevize === 'stroje';

  const tabs = isHromosvod
    ? [
        { id: 'info', label: 'Základní údaje', icon: '' },
        { id: 'hromosvod_zarizeni', label: 'Revidované zařízení', icon: '' },
        { id: 'zavady', label: `Závady (${zavady.length})`, icon: '' },
      ]
    : isStroje
    ? [
        { id: 'info', label: 'Základní údaje', icon: '' },
        { id: 'strojni_zarizeni', label: 'Protokol strojního zařízení', icon: '' },
        { id: 'zavady', label: `Závady (${zavady.length})`, icon: '' },
      ]
    : [
        { id: 'info', label: 'Základní údaje', icon: '' },
        { id: 'dokumentace', label: 'Revidované zařízení', icon: '' },
        { id: 'rozvadece', label: `Rozvaděče (${rozvadece.length})`, icon: '' },
        { id: 'zavady', label: `Závady (${zavady.length})`, icon: '' },
        { id: 'mistnosti', label: `Místnosti (${mistnosti.length})`, icon: '' },
      ];

  const handleReload = () => {
    // React Query handles refetch automatically via cache invalidation
    // This is kept for child components that call onReload after mutations
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
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
          <Button variant="secondary" onClick={() => navigate('/revize')}>← Zpět</Button>
          <Button variant="success" onClick={() => navigate(`/revize/${id}/nahled`)}>Náhled</Button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto scrollbar-thin">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { flush(); setActiveTab(tab.id as any); }}
            className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap flex-shrink-0 ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'info' && (
        isHromosvod ? (
          <HromosvodInfoTab
            revize={revize} formData={formData} setFormData={setFormData}
            firmy={firmy} selectedFirmaId={selectedFirmaId} setSelectedFirmaId={setSelectedFirmaId}
            nastaveni={nastaveni} zakaznici={zakaznici}
            selectedZakaznikId={selectedZakaznikId} setSelectedZakaznikId={setSelectedZakaznikId}
            saveNow={saveNow}
          />
        ) : (
          <InfoTab
            revize={revize} formData={formData} setFormData={setFormData}
            firmy={firmy} selectedFirmaId={selectedFirmaId} setSelectedFirmaId={setSelectedFirmaId}
            nastaveni={nastaveni} zakaznici={zakaznici}
            selectedZakaznikId={selectedZakaznikId} setSelectedZakaznikId={setSelectedZakaznikId}
            saveNow={saveNow}
          />
        )
      )}

      {activeTab === 'hromosvod_zarizeni' && (
        <HromosvodZarizeniTab
          revize={revize} formData={formData} setFormData={setFormData}
          vlastniTexty={vlastniTexty}
          pouzitePristroje={pouzitePristroje} vsechnyPristroje={vsechnyPristroje}
          revizeId={revize.id!}
          saveNow={saveNow}
        />
      )}

      {activeTab === 'strojni_zarizeni' && (
        <StrojniZarizeniTab
          revize={revize}
          nastaveni={nastaveni}
          zakaznici={zakaznici}
          pouzitePristroje={pouzitePristroje}
          vsechnyPristroje={vsechnyPristroje}
          revizeId={revize.id!}
          formData={formData}
          setFormData={setFormData}
        />
      )}

      {activeTab === 'dokumentace' && (
        <DokumentaceTab
          revize={revize} formData={formData} setFormData={setFormData}
          vlastniTexty={vlastniTexty}
          pouzitePristroje={pouzitePristroje} vsechnyPristroje={vsechnyPristroje}
          revizeId={revize.id!}
          saveNow={saveNow}
        />
      )}

      {activeTab === 'rozvadece' && (
        <RozvadeceTab
          rozvadece={rozvadece} okruhyCounts={okruhyCounts}
          revizeId={revize.id!} onReload={handleReload}
        />
      )}

      {activeTab === 'zavady' && (
        <ZavadyTab
          zavady={zavady} rozvadece={rozvadece} mistnosti={mistnosti}
          katalogZavad={katalogZavad} revizeId={revize.id!} onReload={handleReload}
        />
      )}

      {activeTab === 'mistnosti' && (
        <MistnostiTab
          mistnosti={mistnosti} zarizeniCounts={zarizeniCounts}
          revizeId={revize.id!} onReload={handleReload}
        />
      )}

      {/* Fixed save bar */}
      {(activeTab === 'info' || activeTab === 'dokumentace' || activeTab === 'hromosvod_zarizeni' || activeTab === 'strojni_zarizeni') && (
        <div className="fixed bottom-0 left-0 lg:left-64 right-0 z-50 bg-slate-800/90 backdrop-blur border-t border-slate-600 shadow-[0_-2px_8px_rgba(0,0,0,0.15)]">
          <div className="max-w-4xl mx-auto px-4 py-1 flex items-center justify-between gap-4">
            <div className="text-sm min-w-[140px]">
              {displayStatus === 'saving' && (
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="inline-block w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  Ukládání...
                </span>
              )}
              {displayStatus === 'saved' && (
                <span className="text-emerald-400">✓ Uloženo</span>
              )}
              {displayStatus === 'unsaved' && (
                <span className="text-amber-400">Neuložené změny</span>
              )}
              {displayStatus === 'error' && (
                <span className="text-red-400">Chyba ukládání</span>
              )}
            </div>
            <button onClick={handleSave} className="px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors cursor-pointer">Uložit</button>
          </div>
        </div>
      )}
    </div>
  );
}
