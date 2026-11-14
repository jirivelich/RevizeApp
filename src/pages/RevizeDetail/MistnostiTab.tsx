import { useState, useEffect, useMemo } from 'react';
import { Button, Card, Input, Select, Modal, BottomSheet, ConfirmDialog, Badge } from '../../components/ui';
import type { BadgeVariant } from '../../components/ui';
import { StatTile, FilterChip } from './MereniUi';
import { TW } from './tw';
import { zarizeniService, okruhService } from '../../services/database';
import { useCreateMistnost, useUpdateMistnost, useDeleteMistnost } from '../../hooks/useQueries';
import type { Mistnost, Zarizeni, Okruh, Rozvadec } from '../../types';
import { vyhodnotOkruh } from './mereniLimity';
import { StavBadge } from './MereniUi';

const PROSTREDI = ['Normální', 'Nebezpečné', 'Zvlášť nebezpečné'];
const BEZ_PATRA = 'Bez patra';

const prostrediVariant = (p?: string): BadgeVariant =>
  p === 'Zvlášť nebezpečné' ? 'danger' : p === 'Nebezpečné' ? 'warning' : 'neutral';

const stavVariant = (s: Zarizeni['stav']): BadgeVariant =>
  s === 'OK' ? 'success' : s === 'závada' ? 'danger' : 'neutral';

const IconEdit = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconTrash = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>;
const IconCopy = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>;

type OkruhRevize = Okruh & { rozvadec: Rozvadec };

interface MistnostiTabProps {
  mistnosti: Mistnost[];
  /** Rozvaděče revize – pro přiřazení napájecích okruhů místnostem. */
  rozvadece?: Rozvadec[];
  zarizeniCounts: Record<number, number>;
  revizeId: number;
  onReload: () => void;
}

export function MistnostiTab({ mistnosti, rozvadece = [], zarizeniCounts: propCounts, revizeId, onReload: _onReload }: MistnostiTabProps) {
  const createMistnost = useCreateMistnost();
  const updateMistnost = useUpdateMistnost();
  const deleteMistnost = useDeleteMistnost();
  const [selectedMistnost, setSelectedMistnost] = useState<Mistnost | null>(null);
  const [zarizeni, setZarizeni] = useState<Zarizeni[]>([]);
  const [isMistnostModalOpen, setIsMistnostModalOpen] = useState(false);
  const [editingMistnost, setEditingMistnost] = useState<Mistnost | null>(null);
  const [isZarizeniModalOpen, setIsZarizeniModalOpen] = useState(false);
  const [editingZarizeni, setEditingZarizeni] = useState<Zarizeni | null>(null);

  const [isZarizeniSheetOpen, setIsZarizeniSheetOpen] = useState(false);
  const [deleteMistnostId, setDeleteMistnostId] = useState<number | null>(null);
  const [deleteZarizeniId, setDeleteZarizeniId] = useState<number | null>(null);
  const [zarizeniCounts, setZarizeniCounts] = useState<Record<number, number>>(propCounts);

  const [copySource, setCopySource] = useState<Mistnost | null>(null);
  const [copyNazev, setCopyNazev] = useState('');
  const [isCopying, setIsCopying] = useState(false);

  const [mistnostFormData, setMistnostFormData] = useState({
    nazev: '', patro: '', plocha: '', prostredi: '', poznamka: ''
  });
  const [hledat, setHledat] = useState('');
  const [okruhyRevize, setOkruhyRevize] = useState<OkruhRevize[]>([]);
  const [isPrirazeniOpen, setIsPrirazeniOpen] = useState(false);
  const [prirazeniIds, setPrirazeniIds] = useState<number[]>([]);

  // Okruhy všech rozvaděčů revize
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sorted = [...rozvadece].sort((a, b) => (a.poradi ?? a.id ?? 0) - (b.poradi ?? b.id ?? 0));
      const all: OkruhRevize[] = [];
      for (const r of sorted) {
        if (!r.id) continue;
        const ok = await okruhService.getByRozvadec(r.id);
        all.push(...[...ok].sort((a, b) => a.cislo - b.cislo).map(o => ({ ...o, rozvadec: r })));
      }
      if (!cancelled) setOkruhyRevize(all);
    })();
    return () => { cancelled = true; };
  }, [rozvadece]);

  const okruhById = useMemo(() => new Map(okruhyRevize.map(o => [o.id!, o])), [okruhyRevize]);
  const napajeciOkruhy = (m: Mistnost) =>
    (m.okruhIds || []).map(id => okruhById.get(id)).filter((o): o is OkruhRevize => !!o);
  const maVadnyOkruh = (m: Mistnost) => napajeciOkruhy(m).some(o => vyhodnotOkruh(o).stav === 'fail');
  const okruhLabel = (o: OkruhRevize) => `${o.rozvadec.oznaceni || o.rozvadec.nazev} / ${o.cislo}`;
  const [filtrProstredi, setFiltrProstredi] = useState<string>('');

  /** Data místnosti pro uložení (plocha jako číslo). */
  const mistnostPayload = () => {
    const plocha = parseFloat(mistnostFormData.plocha.replace(',', '.'));
    return {
      nazev: mistnostFormData.nazev,
      patro: mistnostFormData.patro,
      poznamka: mistnostFormData.poznamka,
      prostredi: mistnostFormData.prostredi || undefined,
      plocha: Number.isFinite(plocha) ? plocha : undefined,
    };
  };

  const [zarizeniFormData, setZarizeniFormData] = useState({
    nazev: '', oznaceni: '', pocetKs: 1,
    trida: 'I' as Zarizeni['trida'], prikonW: undefined as number | undefined,
    ochranaPredDotykem: '', stav: 'nekontrolováno' as Zarizeni['stav'], poznamka: '',
  });

  // Sync counts from parent
  useEffect(() => { setZarizeniCounts(propCounts); }, [propCounts]);

  // Aktuální data vybrané místnosti (po úpravě se načtou znovu z rodiče)
  const selected = selectedMistnost ? (mistnosti.find(m => m.id === selectedMistnost.id) ?? selectedMistnost) : null;

  const handleSelectMistnost = async (mistnost: Mistnost) => {
    if (selectedMistnost?.id === mistnost.id) return;
    setSelectedMistnost(mistnost);
    setZarizeni([]);
    if (mistnost.id) {
      const zarizeniData = await zarizeniService.getByMistnost(mistnost.id);
      setZarizeni(zarizeniData);
    }
  };

  /** Místnosti seskupené podle patra, po filtru a hledání. */
  const skupiny = useMemo(() => {
    const q = hledat.trim().toLowerCase();
    const filtered = mistnosti.filter(m =>
      (!q || m.nazev.toLowerCase().includes(q) || (m.patro || '').toLowerCase().includes(q)) &&
      (!filtrProstredi || (m.prostredi || 'Normální') === filtrProstredi),
    );
    const map = new Map<string, Mistnost[]>();
    for (const m of filtered) {
      const key = m.patro?.trim() || BEZ_PATRA;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return [...map.entries()]
      .sort(([a], [b]) => (a === BEZ_PATRA ? 1 : b === BEZ_PATRA ? -1 : a.localeCompare(b, 'cs', { numeric: true })))
      .map(([patro, items]) => ({ patro, items }));
  }, [mistnosti, hledat, filtrProstredi]);

  // Automaticky otevřít první místnost
  useEffect(() => {
    if (!selectedMistnost && skupiny.length > 0) handleSelectMistnost(skupiny[0].items[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skupiny, selectedMistnost]);

  const pocetOk = zarizeni.filter(z => z.stav === 'OK').length;
  const pocetZavad = zarizeni.filter(z => z.stav === 'závada').length;

  // Místnosti CRUD
  const resetMistnostForm = () => {
    setMistnostFormData({ nazev: '', patro: '', plocha: '', prostredi: '', poznamka: '' });
    setEditingMistnost(null);
  };

  const handleAddMistnost = async (e: React.FormEvent) => {
    e.preventDefault();
    const onDone = () => {
      setIsMistnostModalOpen(false);
      resetMistnostForm();
    };
    if (editingMistnost?.id) {
      updateMistnost.mutate(
        { id: editingMistnost.id, data: { ...mistnostPayload(), revizeId } },
        { onSuccess: onDone }
      );
    } else {
      createMistnost.mutate(
        { ...mistnostPayload(), revizeId } as any,
        {
          onSuccess: (newId) => {
            const payload = mistnostPayload();
            onDone();
            // Auto-select the newly created místnost
            setSelectedMistnost({ id: newId as unknown as number, ...payload, revizeId });
            setZarizeni([]);
          },
        }
      );
    }
  };

  const handleEditMistnost = (mistnost: Mistnost) => {
    setEditingMistnost(mistnost);
    setMistnostFormData({
      nazev: mistnost.nazev, patro: mistnost.patro || '',
      plocha: mistnost.plocha != null ? String(mistnost.plocha).replace('.', ',') : '',
      prostredi: mistnost.prostredi || '',
      poznamka: mistnost.poznamka || ''
    });
    setIsMistnostModalOpen(true);
  };

  const handleOpenCopy = (mistnost: Mistnost) => {
    setCopySource(mistnost);
    setCopyNazev(`${mistnost.nazev} (kopie)`);
  };

  const closeCopy = () => {
    setCopySource(null);
    setCopyNazev('');
  };

  const handleCopyMistnost = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!copySource?.id || !copyNazev.trim() || isCopying) return;
    const source = copySource;
    setIsCopying(true);
    createMistnost.mutate(
      { nazev: copyNazev.trim(), patro: source.patro, plocha: source.plocha, prostredi: source.prostredi, typ: source.typ, okruhIds: source.okruhIds, poznamka: source.poznamka, revizeId } as any,
      {
        onSuccess: async (newId) => {
          try {
            const newMistnostId = newId as unknown as number;
            const sourceZarizeni = await zarizeniService.getByMistnost(source.id!);
            for (const z of sourceZarizeni) {
              await zarizeniService.create({
                nazev: z.nazev, oznaceni: z.oznaceni, pocetKs: z.pocetKs,
                trida: z.trida, prikonW: z.prikonW, ochranaPredDotykem: z.ochranaPredDotykem,
                stav: 'nekontrolováno', poznamka: z.poznamka, mistnostId: newMistnostId,
              } as any);
            }
            const copied = await zarizeniService.getByMistnost(newMistnostId);
            setZarizeni(copied);
            setZarizeniCounts(prev => ({ ...prev, [newMistnostId]: copied.length }));
            setSelectedMistnost({
              ...source, id: newMistnostId, nazev: copyNazev.trim(), revizeId,
            });
            closeCopy();
          } finally {
            setIsCopying(false);
          }
        },
        onError: () => setIsCopying(false),
      }
    );
  };

  const handleDeleteMistnost = (mistnostId: number) => setDeleteMistnostId(mistnostId);

  const handleConfirmDeleteMistnost = () => {
    if (deleteMistnostId === null) return;
    const mistnostId = deleteMistnostId;
    setDeleteMistnostId(null);
    deleteMistnost.mutate(
      { id: mistnostId, revizeId },
      {
        onSuccess: () => {
          if (selectedMistnost?.id === mistnostId) {
            setSelectedMistnost(null);
            setZarizeni([]);
          }
        },
      }
    );
  };

  // Zařízení CRUD
  const resetZarizeniForm = () => {
    setZarizeniFormData({ nazev: '', oznaceni: '', pocetKs: 1, trida: 'I', prikonW: undefined, ochranaPredDotykem: '', stav: 'nekontrolováno', poznamka: '' });
    setEditingZarizeni(null);
  };

  const saveZarizeni = async () => {
    if (!selectedMistnost?.id) return;
    if (editingZarizeni?.id) {
      await zarizeniService.update(editingZarizeni.id, zarizeniFormData);
    } else {
      await zarizeniService.create({ ...zarizeniFormData, mistnostId: selectedMistnost.id });
    }
    setIsZarizeniModalOpen(false);
    setIsZarizeniSheetOpen(false);
    resetZarizeniForm();
    const zarizeniData = await zarizeniService.getByMistnost(selectedMistnost.id);
    setZarizeni(zarizeniData);
    setZarizeniCounts(prev => ({ ...prev, [selectedMistnost.id!]: zarizeniData.length }));
  };

  const handleAddZarizeni = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveZarizeni();
  };

  const handleEditZarizeni = (zar: Zarizeni) => {
    setEditingZarizeni(zar);
    setZarizeniFormData({
      nazev: zar.nazev, oznaceni: zar.oznaceni || '', pocetKs: zar.pocetKs || 1,
      trida: zar.trida || 'I', prikonW: zar.prikonW, ochranaPredDotykem: zar.ochranaPredDotykem || '',
      stav: zar.stav, poznamka: zar.poznamka || '',
    });
    if (window.innerWidth < 640) {
      setIsZarizeniSheetOpen(true);
    } else {
      setIsZarizeniModalOpen(true);
    }
  };

  const handleDeleteZarizeni = (zarizeniId: number) => setDeleteZarizeniId(zarizeniId);

  const handleConfirmDeleteZarizeni = async () => {
    if (deleteZarizeniId === null) return;
    const zarizeniId = deleteZarizeniId;
    setDeleteZarizeniId(null);
    await zarizeniService.delete(zarizeniId);
    if (selectedMistnost?.id) {
      const zarizeniData = await zarizeniService.getByMistnost(selectedMistnost.id);
      setZarizeni(zarizeniData);
      setZarizeniCounts(prev => ({ ...prev, [selectedMistnost.id!]: zarizeniData.length }));
    }
  };

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
      {/* Seznam místností seskupený podle patra */}
      <section aria-label="Seznam místností" className="lg:col-span-2 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <label className="flex-1 min-w-0">
            <span className="sr-only">Hledat místnost</span>
            <input
              type="search"
              value={hledat}
              onChange={(e) => setHledat(e.target.value)}
              placeholder="Hledat místnost nebo patro…"
              className={TW.input}
            />
          </label>
          <Button size="sm" className="min-h-[40px] shrink-0" onClick={() => { resetMistnostForm(); setIsMistnostModalOpen(true); }}>+ Místnost</Button>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Prostředí">
          <FilterChip active={filtrProstredi === ''} onClick={() => setFiltrProstredi('')}>Vše {mistnosti.length}</FilterChip>
          {PROSTREDI.map(p => {
            const n = mistnosti.filter(m => (m.prostredi || 'Normální') === p).length;
            return n > 0 || filtrProstredi === p
              ? <FilterChip key={p} active={filtrProstredi === p} onClick={() => setFiltrProstredi(filtrProstredi === p ? '' : p)}>{p} {n}</FilterChip>
              : null;
          })}
        </div>

        {mistnosti.length === 0 ? (
          <Card><p className="text-center text-[var(--text-secondary)] py-6 text-sm">Zatím žádné místnosti.</p></Card>
        ) : skupiny.length === 0 ? (
          <Card><p className="text-center text-[var(--text-secondary)] py-6 text-sm">Nic neodpovídá hledání.</p></Card>
        ) : skupiny.map(({ patro, items }) => (
          <div key={patro} className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
            <div className="flex justify-between items-center px-3 py-2 bg-[var(--bg-faint)] border-b border-[var(--border)]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">{patro}</h3>
              <span className="text-xs text-[var(--text-muted)]">{items.length} {items.length === 1 ? 'místnost' : items.length < 5 ? 'místnosti' : 'místností'}</span>
            </div>
            {items.map((m) => {
              const active = selected?.id === m.id;
              const pocet = zarizeniCounts[m.id!] || 0;
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => handleSelectMistnost(m)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left border-t border-[var(--border-subtle)] first-of-type:border-t-0 border-l-2 transition-colors ${
                    active ? 'bg-[var(--active-bg)] border-l-[var(--primary)]' : 'border-l-transparent hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <span className="flex-1 min-w-0">
                    <span className={`block text-sm font-semibold truncate ${active ? 'text-[var(--nav-text-active)]' : 'text-[var(--text)]'}`}>{m.nazev}</span>
                    <span className="block text-xs text-[var(--text-secondary)]">
                      {[m.plocha != null ? `${String(m.plocha).replace('.', ',')} m²` : null, `${pocet} ${pocet === 1 ? 'zařízení' : 'zařízení'}`].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  {m.prostredi && m.prostredi !== 'Normální' && <Badge variant={prostrediVariant(m.prostredi)}>{m.prostredi}</Badge>}
                  {maVadnyOkruh(m) && <Badge variant="danger">Okruh nevyhovuje</Badge>}
                  <svg aria-hidden="true" className="w-4 h-4 shrink-0 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              );
            })}
          </div>
        ))}
      </section>

      {/* Detail místnosti */}
      <div className="lg:col-span-3">
        {selected ? (
          <Card
            title={selected.nazev}
            actions={
              <div className="flex gap-1">
                <Button variant="secondary" size="sm" onClick={() => handleEditMistnost(selected)} title="Upravit místnost" aria-label="Upravit místnost"><IconEdit /><span className="hidden sm:inline ml-1">Upravit</span></Button>
                <Button variant="secondary" size="sm" onClick={() => handleOpenCopy(selected)} title="Kopírovat místnost" aria-label="Kopírovat místnost"><IconCopy /><span className="hidden sm:inline ml-1">Kopírovat</span></Button>
                <Button variant="danger" size="sm" onClick={() => handleDeleteMistnost(selected.id!)} title="Smazat místnost" aria-label="Smazat místnost"><IconTrash /></Button>
              </div>
            }
          >
            <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-2">
              <StatTile label="Patro" value={<span className="text-base">{selected.patro || '—'}</span>} />
              <StatTile label="Plocha" value={<span className="text-base">{selected.plocha != null ? `${String(selected.plocha).replace('.', ',')} m²` : '—'}</span>} />
              <StatTile label="Prostředí" value={<span className={`text-base ${selected.prostredi && selected.prostredi !== 'Normální' ? 'text-[var(--warning-text)]' : ''}`}>{selected.prostredi || 'Normální'}</span>} />
              <StatTile label="Zařízení OK" value={pocetOk} sub={`/ ${zarizeni.length}`} tone={pocetZavad > 0 ? 'danger' : 'default'} />
            </div>
            {selected.poznamka && <p className="-mt-2 mb-4 text-xs text-[var(--text-secondary)]">{selected.poznamka}</p>}

            <div className="mb-5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h4 className="font-semibold text-sm text-[var(--text)]">Napájeno z okruhů</h4>
                <Button variant="secondary" size="sm" disabled={okruhyRevize.length === 0}
                  title={okruhyRevize.length === 0 ? 'V revizi zatím nejsou žádné okruhy' : undefined}
                  onClick={() => { setPrirazeniIds(selected.okruhIds || []); setIsPrirazeniOpen(true); }}>
                  {napajeciOkruhy(selected).length > 0 ? 'Upravit' : '+ Přiřadit'}
                </Button>
              </div>
              {napajeciOkruhy(selected).length > 0 ? (
                <ul className="flex flex-col gap-1.5">
                  {napajeciOkruhy(selected).map(o => {
                    const v = vyhodnotOkruh(o);
                    return (
                      <li key={o.id} className={`flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border text-xs ${v.stav === 'fail' ? 'bg-[var(--danger-bg)] border-[var(--danger)]/40' : 'bg-[var(--bg-input)] border-transparent'}`}>
                        <span className="px-1.5 py-0.5 rounded font-semibold bg-[var(--bg-hover)] text-[var(--text-secondary)] whitespace-nowrap">{okruhLabel(o)}</span>
                        <span className="flex-1 min-w-0 truncate text-[var(--text)]">{o.nazev} <span className="text-[var(--text-muted)]">· {o.jisticTyp}{o.jisticProud}</span></span>
                        <StavBadge stav={v.stav} />
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-xs text-[var(--text-secondary)] px-3 py-2.5 bg-[var(--bg-input)] rounded-[var(--radius-md)]">
                  {okruhyRevize.length === 0 ? 'V revizi zatím nejsou žádné okruhy.' : 'Místnost zatím nemá přiřazené okruhy.'}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 mb-2">
              <h4 className="font-semibold text-sm text-[var(--text)]">
                Zařízení ({zarizeni.length}){pocetZavad > 0 && <span className="ml-2"><Badge variant="danger">{pocetZavad} {pocetZavad === 1 ? 'závada' : 'závady'}</Badge></span>}
              </h4>
              <Button size="sm" onClick={() => {
                resetZarizeniForm();
                if (window.innerWidth < 640) { setIsZarizeniSheetOpen(true); }
                else { setIsZarizeniModalOpen(true); }
              }}>+ Zařízení</Button>
            </div>
            {zarizeni.length > 0 ? (
              <>
              <div className="hidden sm:block overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)]">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className={TW.th}>Název</th>
                      <th className={TW.th}>Ks</th>
                      <th className={TW.th}>Třída</th>
                      <th className={TW.th}>Příkon</th>
                      <th className={TW.th}>Ochrana před dotykem</th>
                      <th className={TW.th}>Stav</th>
                      <th className={TW.th + ' text-right'}>Akce</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zarizeni.map((z) => (
                      <tr key={z.id} className={`border-b border-[var(--border-subtle)] border-l-2 hover:bg-[var(--bg-hover)] ${z.stav === 'závada' ? 'bg-[var(--danger-bg)] border-l-[var(--danger)]' : 'border-l-transparent'}`}>
                        <td className="py-1.5 px-2 text-xs">
                          <p className="font-medium text-[var(--text)]">{z.nazev}</p>
                          {z.oznaceni && <p className="text-xs text-[var(--text-secondary)]">{z.oznaceni}</p>}
                        </td>
                        <td className="py-1.5 px-2 text-xs text-[var(--text-secondary)] tabular-nums">{z.pocetKs || 1}</td>
                        <td className="py-1.5 px-2 text-xs"><span className="px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)]">{z.trida || 'I'}</span></td>
                        <td className="py-1.5 px-2 text-xs text-[var(--text-secondary)] tabular-nums">{z.prikonW ? `${z.prikonW} W` : '—'}</td>
                        <td className="py-1.5 px-2 text-xs text-[var(--text-secondary)]">{z.ochranaPredDotykem || '—'}</td>
                        <td className="py-1.5 px-2 text-xs"><Badge variant={stavVariant(z.stav)}>{z.stav}</Badge></td>
                        <td className="py-1.5 px-2 text-xs text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="secondary" size="sm" onClick={() => handleEditZarizeni(z)} title="Upravit" aria-label={`Upravit ${z.nazev}`}><IconEdit /></Button>
                            <Button variant="danger" size="sm" onClick={() => handleDeleteZarizeni(z.id!)} title="Smazat" aria-label={`Smazat ${z.nazev}`}><IconTrash /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="sm:hidden flex flex-col gap-2">
                {zarizeni.map((z) => (
                  <div key={z.id} className={`rounded-[var(--radius-lg)] border p-3 bg-[var(--bg-surface)] ${z.stav === 'závada' ? 'border-[var(--danger)]/50' : 'border-[var(--border)]'}`}>
                    <button type="button" className="w-full flex items-start gap-2 text-left" onClick={() => handleEditZarizeni(z)}>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-[var(--text)] truncate">{z.nazev}{(z.pocetKs || 1) > 1 && <span className="font-normal text-[var(--text-secondary)]"> · {z.pocetKs}×</span>}</span>
                        <span className="block text-xs text-[var(--text-secondary)] mt-0.5">tř. {z.trida || 'I'} · {z.ochranaPredDotykem || '—'}{z.prikonW ? ` · ${z.prikonW} W` : ''}</span>
                      </span>
                      <Badge variant={stavVariant(z.stav)}>{z.stav}</Badge>
                    </button>
                    <div className="mt-2 flex justify-end">
                      <Button variant="danger" size="sm" onClick={() => handleDeleteZarizeni(z.id!)} aria-label={`Smazat ${z.nazev}`}><IconTrash /></Button>
                    </div>
                  </div>
                ))}
              </div>
              </>
            ) : (
              <p className="text-center text-[var(--text-secondary)] py-6 text-xs bg-[var(--bg-input)] rounded-[var(--radius-lg)]">Zatím žádná zařízení.</p>
            )}
          </Card>
        ) : (
          <Card>
            <div className="text-center py-12">
              <p className="text-sm text-[var(--text-secondary)] mb-4">V revizi zatím nejsou žádné místnosti.</p>
              <Button size="sm" onClick={() => { resetMistnostForm(); setIsMistnostModalOpen(true); }}>+ Přidat místnost</Button>
            </div>
          </Card>
        )}
      </div>
    </div>

    {/* Modal pro přidání/úpravu místnosti */}
    <Modal
      isOpen={isMistnostModalOpen}
      onClose={() => { setIsMistnostModalOpen(false); resetMistnostForm(); }}
      title={editingMistnost ? 'Upravit místnost' : 'Přidat místnost'}
      footer={
        <>
          <Button variant="secondary" onClick={() => { setIsMistnostModalOpen(false); resetMistnostForm(); }}>Zrušit</Button>
            <Button size="sm" onClick={handleAddMistnost}>{editingMistnost ? 'Uložit změny' : 'Přidat'}</Button>
        </>
      }
    >
      <form onSubmit={handleAddMistnost} className="space-y-3">
        <Input label="Název místnosti" value={mistnostFormData.nazev} onChange={(e) => setMistnostFormData({ ...mistnostFormData, nazev: e.target.value })} placeholder="např. Obývací pokoj, Kuchyň..." required />
        <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-3">
          <Input label="Patro" value={mistnostFormData.patro} onChange={(e) => setMistnostFormData({ ...mistnostFormData, patro: e.target.value })} placeholder="např. 1.NP, přízemí..." list="mistnost-patra" />
          <Input label="Plocha (m²)" inputMode="decimal" value={mistnostFormData.plocha} onChange={(e) => setMistnostFormData({ ...mistnostFormData, plocha: e.target.value })} placeholder="např. 12,5" />
        </div>
        <datalist id="mistnost-patra">
          {[...new Set(mistnosti.map(m => m.patro).filter(Boolean))].map(p => <option key={p} value={p} />)}
        </datalist>
        <Select label="Prostředí" value={mistnostFormData.prostredi} onChange={(e) => setMistnostFormData({ ...mistnostFormData, prostredi: e.target.value })}
          options={[{ value: '', label: '— neuvedeno —' }, ...PROSTREDI.map(p => ({ value: p, label: p }))]} />
        <Input label="Poznámka" value={mistnostFormData.poznamka} onChange={(e) => setMistnostFormData({ ...mistnostFormData, poznamka: e.target.value })} placeholder="Volitelná poznámka..." />
      </form>
    </Modal>

    {/* Modal pro kopírování místnosti */}
    <Modal
      isOpen={copySource !== null}
      onClose={closeCopy}
      title="Kopírovat místnost"
      footer={
        <>
          <Button variant="secondary" onClick={closeCopy}>Zrušit</Button>
          <Button size="sm" onClick={() => handleCopyMistnost()} disabled={isCopying || !copyNazev.trim()}>Kopírovat</Button>
        </>
      }
    >
      <form onSubmit={handleCopyMistnost} className="space-y-3">
        <Input label="Název nové místnosti" value={copyNazev} onChange={(e) => setCopyNazev(e.target.value)} required />
        <p className="text-xs text-[var(--text-secondary)]">
          Zkopíruje se {copySource?.id === selected?.id ? zarizeni.length : (zarizeniCounts[copySource?.id ?? -1] || 0)} zařízení (stav bude nastaven na „nekontrolováno").
        </p>
      </form>
    </Modal>

    {/* Modal pro přidání/úpravu zařízení */}
    <Modal
      isOpen={isZarizeniModalOpen}
      onClose={() => { setIsZarizeniModalOpen(false); resetZarizeniForm(); }}
      title={editingZarizeni ? 'Upravit zařízení' : 'Přidat zařízení'}
      footer={
        <>
          <Button variant="secondary" onClick={() => { setIsZarizeniModalOpen(false); resetZarizeniForm(); }}>Zrušit</Button>
            <Button size="sm" onClick={handleAddZarizeni}>{editingZarizeni ? 'Uložit změny' : 'Přidat'}</Button>
        </>
      }
    >
      <form onSubmit={handleAddZarizeni} className="space-y-3">
        <Input label="Název zařízení" value={zarizeniFormData.nazev} onChange={(e) => setZarizeniFormData({ ...zarizeniFormData, nazev: e.target.value })} placeholder="např. Zásuvka u okna, Hlavní svítidlo..." required />
        <div className="grid grid-cols-3 max-sm:grid-cols-1 gap-3">
          <Input label="Označení" value={zarizeniFormData.oznaceni} onChange={(e) => setZarizeniFormData({ ...zarizeniFormData, oznaceni: e.target.value })} placeholder="např. Z1, L2..." />
          <Input label="Počet kusů" type="number" min="1" value={zarizeniFormData.pocetKs.toString()}
            onChange={(e) => {
              const newPocet = parseInt(e.target.value) || 1;
              let ochrana = zarizeniFormData.ochranaPredDotykem;
              if (zarizeniFormData.trida === 'I') {
                if (newPocet > 1 && !ochrana?.startsWith('max.')) { ochrana = 'max.' + (ochrana || ''); }
                else if (newPocet === 1 && ochrana?.startsWith('max.')) { ochrana = ochrana.replace('max.', ''); }
              }
              setZarizeniFormData({ ...zarizeniFormData, pocetKs: newPocet, ochranaPredDotykem: ochrana });
            }} />
          <Select label="Třída" value={zarizeniFormData.trida}
            onChange={(e) => {
              const newTrida = e.target.value as Zarizeni['trida'];
              let ochrana = zarizeniFormData.ochranaPredDotykem;
              if (newTrida === 'II') { ochrana = 'izolací'; }
              else if (newTrida === 'III') { ochrana = 'MN'; }
              else if (newTrida === 'I') { ochrana = zarizeniFormData.pocetKs > 1 ? 'max.' : ''; }
              setZarizeniFormData({ ...zarizeniFormData, trida: newTrida, ochranaPredDotykem: ochrana });
            }}
            options={[{ value: 'I', label: 'I' }, { value: 'II', label: 'II' }, { value: 'III', label: 'III' }]} />
        </div>
        <div className="grid grid-cols-3 max-sm:grid-cols-1 gap-3">
          <Input label="Příkon (W)" type="number" value={zarizeniFormData.prikonW?.toString() || ''}
            onChange={(e) => setZarizeniFormData({ ...zarizeniFormData, prikonW: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="např. 60" />
          <Input label="Ochrana před dotykem" value={zarizeniFormData.ochranaPredDotykem}
            onChange={(e) => setZarizeniFormData({ ...zarizeniFormData, ochranaPredDotykem: e.target.value })}
            placeholder={
              zarizeniFormData.trida === 'I'
                ? (zarizeniFormData.pocetKs > 1 ? 'např. max.0.6 Ω' : 'např. 0.6 Ω')
                : zarizeniFormData.trida === 'II' ? 'např. izolací' : 'např. malým napětím'
            } />
          <Select label="Stav" value={zarizeniFormData.stav} onChange={(e) => setZarizeniFormData({ ...zarizeniFormData, stav: e.target.value as Zarizeni['stav'] })}
            options={[{ value: 'nekontrolováno', label: 'Nekontrolováno' }, { value: 'OK', label: 'OK' }, { value: 'závada', label: 'Závada' }]} />
        </div>
        <Input label="Poznámka" value={zarizeniFormData.poznamka} onChange={(e) => setZarizeniFormData({ ...zarizeniFormData, poznamka: e.target.value })} placeholder="Volitelná poznámka..." />
      </form>
    </Modal>

    {/* BottomSheet pro zařízení (mobil) */}
    <BottomSheet
      isOpen={isZarizeniSheetOpen}
      onClose={() => { setIsZarizeniSheetOpen(false); resetZarizeniForm(); }}
      title={editingZarizeni ? 'Upravit zařízení' : 'Přidat zařízení'}
      footer={
        <>
          <Button onClick={saveZarizeni}>{editingZarizeni ? 'Uložit změny' : 'Přidat'}</Button>
          <Button variant="secondary" onClick={() => { setIsZarizeniSheetOpen(false); resetZarizeniForm(); }}>Zrušit</Button>
        </>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); saveZarizeni(); }} className="space-y-3">
        <Input label="Název zařízení" value={zarizeniFormData.nazev} onChange={(e) => setZarizeniFormData({ ...zarizeniFormData, nazev: e.target.value })} placeholder="např. Zásuvka u okna..." required />
        <div className="grid grid-cols-3 max-sm:grid-cols-1 gap-3">
          <Input label="Označení" value={zarizeniFormData.oznaceni} onChange={(e) => setZarizeniFormData({ ...zarizeniFormData, oznaceni: e.target.value })} placeholder="např. Z1, L2..." />
          <Input label="Počet kusů" type="number" min="1" value={zarizeniFormData.pocetKs.toString()}
            onChange={(e) => {
              const newPocet = parseInt(e.target.value) || 1;
              let ochrana = zarizeniFormData.ochranaPredDotykem;
              if (zarizeniFormData.trida === 'I') {
                if (newPocet > 1 && !ochrana?.startsWith('max.')) { ochrana = 'max.' + (ochrana || ''); }
                else if (newPocet === 1 && ochrana?.startsWith('max.')) { ochrana = ochrana.replace('max.', ''); }
              }
              setZarizeniFormData({ ...zarizeniFormData, pocetKs: newPocet, ochranaPredDotykem: ochrana });
            }} />
          <Select label="Třída" value={zarizeniFormData.trida}
            onChange={(e) => {
              const newTrida = e.target.value as Zarizeni['trida'];
              let ochrana = zarizeniFormData.ochranaPredDotykem;
              if (newTrida === 'II') { ochrana = 'izolací'; }
              else if (newTrida === 'III') { ochrana = 'MN'; }
              else if (newTrida === 'I') { ochrana = zarizeniFormData.pocetKs > 1 ? 'max.' : ''; }
              setZarizeniFormData({ ...zarizeniFormData, trida: newTrida, ochranaPredDotykem: ochrana });
            }}
            options={[{ value: 'I', label: 'I' }, { value: 'II', label: 'II' }, { value: 'III', label: 'III' }]} />
        </div>
        <div className="grid grid-cols-3 max-sm:grid-cols-1 gap-3">
          <Input label="Příkon (W)" type="number" value={zarizeniFormData.prikonW?.toString() || ''}
            onChange={(e) => setZarizeniFormData({ ...zarizeniFormData, prikonW: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="např. 60" />
          <Input label="Ochrana před dotykem" value={zarizeniFormData.ochranaPredDotykem}
            onChange={(e) => setZarizeniFormData({ ...zarizeniFormData, ochranaPredDotykem: e.target.value })}
            placeholder={zarizeniFormData.trida === 'I' ? (zarizeniFormData.pocetKs > 1 ? 'např. max.0.6 Ω' : 'např. 0.6 Ω') : zarizeniFormData.trida === 'II' ? 'např. izolací' : 'např. malým napětím'} />
          <Select label="Stav" value={zarizeniFormData.stav} onChange={(e) => setZarizeniFormData({ ...zarizeniFormData, stav: e.target.value as Zarizeni['stav'] })}
            options={[{ value: 'nekontrolováno', label: 'Nekontrolováno' }, { value: 'OK', label: 'OK' }, { value: 'závada', label: 'Závada' }]} />
        </div>
        <Input label="Poznámka" value={zarizeniFormData.poznamka} onChange={(e) => setZarizeniFormData({ ...zarizeniFormData, poznamka: e.target.value })} placeholder="Volitelná poznámka..." />
      </form>
    </BottomSheet>

    {/* Přiřazení napájecích okruhů */}
    <Modal
      isOpen={isPrirazeniOpen}
      onClose={() => setIsPrirazeniOpen(false)}
      title={`Okruhy pro: ${selected?.nazev ?? ''}`}
      footer={
        <>
          <Button variant="secondary" onClick={() => setIsPrirazeniOpen(false)}>Zrušit</Button>
          <Button onClick={() => {
            if (!selected?.id) return;
            // Uložit jen ID, která v revizi stále existují (smazané okruhy vypadnou)
            const ids = prirazeniIds.filter(id => okruhById.has(id));
            updateMistnost.mutate(
              { id: selected.id, data: { okruhIds: ids, revizeId } },
              { onSuccess: () => { setSelectedMistnost({ ...selected, okruhIds: ids }); setIsPrirazeniOpen(false); } },
            );
          }} disabled={updateMistnost.isPending}>Uložit ({prirazeniIds.filter(id => okruhById.has(id)).length})</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
        {[...new Map(okruhyRevize.map(o => [o.rozvadec.id, o.rozvadec])).values()].map(r => (
          <fieldset key={r.id} className="flex flex-col gap-1">
            <legend className={TW.label + ' mb-1'}>{[r.oznaceni, r.nazev].filter(Boolean).join(' – ')}</legend>
            {okruhyRevize.filter(o => o.rozvadec.id === r.id).map(o => {
              const checked = prirazeniIds.includes(o.id!);
              return (
                <label key={o.id} className={`flex items-center gap-3 px-3 min-h-[44px] rounded-[var(--radius-md)] border cursor-pointer ${checked ? 'border-[var(--active-border)] bg-[var(--active-bg)]' : 'border-[var(--border)] hover:bg-[var(--bg-hover)]'}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setPrirazeniIds(prev => e.target.checked ? [...prev, o.id!] : prev.filter(id => id !== o.id))}
                    className="w-4 h-4 rounded border-[var(--checkbox-border)]"
                  />
                  <span className="w-7 text-xs font-semibold tabular-nums text-[var(--text-secondary)]">{o.cislo}</span>
                  <span className="flex-1 min-w-0 truncate text-sm text-[var(--text)]">{o.nazev}</span>
                  <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">{o.jisticTyp}{o.jisticProud}</span>
                </label>
              );
            })}
          </fieldset>
        ))}
      </div>
    </Modal>

    <ConfirmDialog
      isOpen={deleteMistnostId !== null}
      title="Smazat místnost"
      message="Opravdu chcete smazat tuto místnost včetně všech zařízení?"
      confirmLabel="Smazat"
      onConfirm={handleConfirmDeleteMistnost}
      onCancel={() => setDeleteMistnostId(null)}
    />
    <ConfirmDialog
      isOpen={deleteZarizeniId !== null}
      title="Smazat zařízení"
      message="Opravdu chcete smazat toto zařízení?"
      confirmLabel="Smazat"
      onConfirm={handleConfirmDeleteZarizeni}
      onCancel={() => setDeleteZarizeniId(null)}
    />
    </>
  );
}
