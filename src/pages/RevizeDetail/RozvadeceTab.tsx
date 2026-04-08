import { useState, useEffect } from 'react';
import { Button, Card, Input, Select, Modal, BottomSheet } from '../../components/ui';
import { TW } from './tw';
import { okruhService, cranicService } from '../../services/database';
import { useCreateRozvadec, useDeleteRozvadec, useUpdateRozvadec } from '../../hooks/useQueries';
import type { Rozvadec, Okruh, Chranic } from '../../types';

// EditableSelect – select s možností zadat vlastní hodnotu
export function EditableSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (val: string) => void; options: string[];
}) {
  const isCustom = value !== '' && !options.includes(value);
  const [showCustom, setShowCustom] = useState(isCustom);

  // Sync showCustom when value changes externally (e.g. form reset)
  useEffect(() => {
    if (options.includes(value)) {
      setShowCustom(false);
    }
  }, [value, options]);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-700">{label}</label>
      {showCustom ? (
        <div className="relative">
          <input
            className="w-full px-3 py-2 pr-8 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 text-xs"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
          />
          <button
            type="button"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            onClick={() => { setShowCustom(false); }}
            title="Zpět na seznam"
          >↩</button>
        </div>
      ) : (
        <select
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 text-xs"
          value={options.includes(value) ? value : '__custom__'}
          onChange={(e) => {
            if (e.target.value === '__custom__') {
              setShowCustom(true);
              onChange('');
            } else {
              onChange(e.target.value);
            }
          }}
        >
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          <option value="__custom__">✏️ Vlastní hodnota...</option>
        </select>
      )}
    </div>
  );
}

interface RozvadeceTabProps {
  rozvadece: Rozvadec[];
  okruhyCounts: Record<number, number>;
  revizeId: number;
  onReload: () => void;
}

export function RozvadeceTab({ rozvadece, okruhyCounts: propCounts, revizeId, onReload: _onReload }: RozvadeceTabProps) {
  const createRozvadec = useCreateRozvadec();
  const deleteRozvadec = useDeleteRozvadec();
  const updateRozvadec = useUpdateRozvadec();
  const [selectedRozvadec, setSelectedRozvadec] = useState<Rozvadec | null>(null);
  const [okruhy, setOkruhy] = useState<Okruh[]>([]);
  const [isRozvadecModalOpen, setIsRozvadecModalOpen] = useState(false);
  const [editingRozvadec, setEditingRozvadec] = useState<Rozvadec | null>(null);
  const [isOkruhModalOpen, setIsOkruhModalOpen] = useState(false);
  const [editingOkruh, setEditingOkruh] = useState<Okruh | null>(null);
  const [draggedOkruh, setDraggedOkruh] = useState<Okruh | null>(null);
  const [chranice, setChranice] = useState<Chranic[]>([]);
  const [isCranicModalOpen, setIsCranicModalOpen] = useState(false);
  const [editingChranic, setEditingChranic] = useState<Chranic | null>(null);
  const [isOkruhSheetOpen, setIsOkruhSheetOpen] = useState(false);
  const [isCranicSheetOpen, setIsCranicSheetOpen] = useState(false);
  const [cranicFormData, setCranicFormData] = useState({
    cislo: 1, nazev: '', typ: 'A', proud: '25A',
    citlivostMa: 30, pocetPolu: 2,
    testovacitlacitko: undefined as boolean | undefined,
    nevybavovaci: undefined as boolean | undefined,
    dotykoveNapeti: undefined as number | undefined,
    vybavovacProud: undefined as number | undefined,
    casOdpojeni1x: undefined as number | undefined,
    casOdpojeni5x: undefined as number | undefined,
    casOdpojeni1_4x: undefined as number | undefined,
    casOdpojeni2x: undefined as number | undefined,
    zkouskaVypnuti2x: undefined as boolean | undefined,
    selektivita: undefined as boolean | undefined,
    poznamka: '',
  });
  const [draggedRozvadec, setDraggedRozvadec] = useState<Rozvadec | null>(null);
  const [okruhyCounts, setOkruhyCounts] = useState<Record<number, number>>(propCounts);

  const [rozvadecFormData, setRozvadecFormData] = useState({
    nazev: '',
    oznaceni: '',
    umisteni: '',
    typRozvadece: '',
    stupenKryti: 'IP20',
    poznamka: '',
  });

  const [okruhFormData, setOkruhFormData] = useState({
    cislo: 1,
    nazev: '',
    jisticTyp: 'B',
    jisticProud: '16A',
    pocetFazi: 1,
    vodic: '3x2,5',
    izolacniOdpor: '',
    impedanceSmycky: '',
    impedanceSmyckyMax: false,
    poznamka: '',
  });

  // Sync counts from parent
  useEffect(() => { setOkruhyCounts(propCounts); }, [propCounts]);

  const handleSelectRozvadec = async (rozvadec: Rozvadec) => {
    if (selectedRozvadec?.id === rozvadec.id) {
      setSelectedRozvadec(null);
      setOkruhy([]);
      setChranice([]);
    } else {
      setSelectedRozvadec(rozvadec);
      if (rozvadec.id) {
        const okruhyData = await okruhService.getByRozvadec(rozvadec.id);
        setOkruhy(okruhyData);
        const cranicData = await cranicService.getByRozvadec(rozvadec.id);
        setChranice(cranicData);
      }
    }
  };

  const handleAddRozvadec = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRozvadec?.id) {
      updateRozvadec.mutate(
        { id: editingRozvadec.id, data: { ...rozvadecFormData, revizeId } },
        {
          onSuccess: () => {
            setIsRozvadecModalOpen(false);
            setEditingRozvadec(null);
            setSelectedRozvadec({ ...editingRozvadec, ...rozvadecFormData });
            setRozvadecFormData({ nazev: '', oznaceni: '', umisteni: '', typRozvadece: '', stupenKryti: 'IP20', poznamka: '' });
          },
        }
      );
    } else {
    createRozvadec.mutate(
      { ...rozvadecFormData, revizeId } as any,
      {
        onSuccess: (newId) => {
          setIsRozvadecModalOpen(false);
          // Auto-select the newly created rozvaděč
          setSelectedRozvadec({
            id: newId as unknown as number,
            ...rozvadecFormData,
            revizeId,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          setOkruhy([]);
          setRozvadecFormData({ nazev: '', oznaceni: '', umisteni: '', typRozvadece: '', stupenKryti: 'IP20', poznamka: '' });
        },
      }
    );
    }
  };

  const handleDeleteRozvadec = (rozvadecId: number) => {
    if (window.confirm('Opravdu chcete smazat tento rozvaděč?')) {
      deleteRozvadec.mutate(
        { id: rozvadecId, revizeId },
        {
          onSuccess: () => {
            if (selectedRozvadec?.id === rozvadecId) {
              setSelectedRozvadec(null);
              setOkruhy([]);
            }
          },
        }
      );
    }
  };

  const resetOkruhForm = () => {
    const nextCislo = okruhy.length > 0 ? Math.max(...okruhy.map(o => o.cislo)) + 1 : 1;
    setOkruhFormData({
      cislo: nextCislo, nazev: '', jisticTyp: 'B', jisticProud: '16A', pocetFazi: 1, vodic: '3x2,5',
      izolacniOdpor: '', impedanceSmycky: '', impedanceSmyckyMax: false, poznamka: '',
    });
  };

  const saveOkruh = async () => {
    if (!selectedRozvadec?.id) return;
    const { impedanceSmyckyMax, ...okruhData } = okruhFormData;
    const saveData = { ...okruhData, izolacniOdpor: okruhData.izolacniOdpor || undefined, impedanceSmycky: impedanceSmyckyMax && okruhData.impedanceSmycky ? `max. ${okruhData.impedanceSmycky}` : okruhData.impedanceSmycky || undefined };
    if (editingOkruh?.id) {
      await okruhService.update(editingOkruh.id, saveData);
    } else {
      await okruhService.create({ ...saveData, rozvadecId: selectedRozvadec.id });
    }
    setIsOkruhModalOpen(false);
    setIsOkruhSheetOpen(false);
    setEditingOkruh(null);
    resetOkruhForm();
    const okruhyData = await okruhService.getByRozvadec(selectedRozvadec.id);
    setOkruhy(okruhyData);
    setOkruhyCounts(prev => ({ ...prev, [selectedRozvadec.id!]: okruhyData.length }));
  };

  const handleAddOkruh = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveOkruh();
  };

  const handleEditOkruh = (okruh: Okruh) => {
    setEditingOkruh(okruh);
    setOkruhFormData({
      cislo: okruh.cislo, nazev: okruh.nazev, jisticTyp: okruh.jisticTyp, jisticProud: okruh.jisticProud,
      pocetFazi: okruh.pocetFazi || 1, vodic: okruh.vodic, izolacniOdpor: okruh.izolacniOdpor || '',
      impedanceSmycky: okruh.impedanceSmycky?.replace(/^max\.\s*/, '') || '', impedanceSmyckyMax: okruh.impedanceSmycky?.startsWith('max.') || false,
      poznamka: okruh.poznamka || '',
    });
    if (window.innerWidth < 640) {
      setIsOkruhSheetOpen(true);
    } else {
      setIsOkruhModalOpen(true);
    }
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
        rozvadecId: selectedRozvadec.id, cislo: nextCislo, nazev: okruh.nazev,
        jisticTyp: okruh.jisticTyp, jisticProud: okruh.jisticProud, pocetFazi: okruh.pocetFazi || 1,
        vodic: okruh.vodic, izolacniOdpor: okruh.izolacniOdpor, impedanceSmycky: okruh.impedanceSmycky,
        poznamka: okruh.poznamka,
      });
      const okruhyData = await okruhService.getByRozvadec(selectedRozvadec.id);
      setOkruhy(okruhyData);
      setOkruhyCounts(prev => ({ ...prev, [selectedRozvadec.id!]: okruhyData.length }));
    }
  };

  const resetCranicForm = () => {
    const nextCislo = chranice.length > 0 ? Math.max(...chranice.map(c => c.cislo)) + 1 : 1;
    setCranicFormData({
      cislo: nextCislo, nazev: '', typ: 'A', proud: '25A', citlivostMa: 30, pocetPolu: 2,
      testovacitlacitko: undefined, nevybavovaci: undefined, dotykoveNapeti: undefined,
      vybavovacProud: undefined, casOdpojeni1x: undefined, casOdpojeni5x: undefined,
      casOdpojeni1_4x: undefined, casOdpojeni2x: undefined, zkouskaVypnuti2x: undefined,
      selektivita: undefined, poznamka: '',
    });
  };

  const saveCranic = async () => {
    if (!selectedRozvadec?.id) return;
    if (editingChranic?.id) {
      await cranicService.update(editingChranic.id, { ...cranicFormData, rozvadecId: selectedRozvadec.id });
    } else {
      await cranicService.create({ ...cranicFormData, rozvadecId: selectedRozvadec.id });
    }
    setIsCranicModalOpen(false);
    setIsCranicSheetOpen(false);
    setEditingChranic(null);
    resetCranicForm();
    setChranice(await cranicService.getByRozvadec(selectedRozvadec.id));
  };

  const handleAddChranic = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveCranic();
  };

  const handleEditChranic = (c: Chranic) => {
    setEditingChranic(c);
    setCranicFormData({
      cislo: c.cislo, nazev: c.nazev, typ: c.typ, proud: c.proud,
      citlivostMa: c.citlivostMa, pocetPolu: c.pocetPolu,
      testovacitlacitko: c.testovacitlacitko,
      nevybavovaci: c.nevybavovaci,
      dotykoveNapeti: c.dotykoveNapeti,
      vybavovacProud: c.vybavovacProud,
      casOdpojeni1x: c.casOdpojeni1x,
      casOdpojeni5x: c.casOdpojeni5x,
      casOdpojeni1_4x: c.casOdpojeni1_4x,
      casOdpojeni2x: c.casOdpojeni2x,
      zkouskaVypnuti2x: c.zkouskaVypnuti2x,
      selektivita: c.selektivita,
      poznamka: c.poznamka || '',
    });
    if (window.innerWidth < 640) {
      setIsCranicSheetOpen(true);
    } else {
      setIsCranicModalOpen(true);
    }
  };

  const handleDeleteChranic = async (cranicId: number) => {
    if (window.confirm('Opravdu chcete smazat tento chránič?')) {
      await cranicService.delete(cranicId);
      if (selectedRozvadec?.id) {
        setChranice(await cranicService.getByRozvadec(selectedRozvadec.id));
      }
    }
  };

  const handleDragStart = (okruh: Okruh) => { setDraggedOkruh(okruh); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDragEnd = () => { setDraggedOkruh(null); };

  const handleRozvadecDragStart = (r: Rozvadec) => { setDraggedRozvadec(r); };
  const handleRozvadecDragEnd = () => { setDraggedRozvadec(null); };
  // Drag & drop okruhů (v rámci rozvaděče)
  const handleDrop = async (targetOkruh: Okruh) => {
    if (!draggedOkruh || draggedOkruh.id === targetOkruh.id) {
      setDraggedOkruh(null);
      return;
    }
    // Seřadit okruhy podle čísla
    const sorted = [...okruhy].sort((a, b) => a.cislo - b.cislo);
    const draggedIndex = sorted.findIndex(o => o.id === draggedOkruh.id);
    const targetIndex = sorted.findIndex(o => o.id === targetOkruh.id);
    const [removed] = sorted.splice(draggedIndex, 1);
    sorted.splice(targetIndex, 0, removed);
    // Aktualizovat čísla okruhů podle nového pořadí
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].id) {
        await okruhService.update(sorted[i].id!, { cislo: i + 1 });
      }
    }
    if (selectedRozvadec?.id) {
      const okruhyData = await okruhService.getByRozvadec(selectedRozvadec.id);
      setOkruhy(okruhyData);
    }
    setDraggedOkruh(null);
  };

  const handleRozvadecDrop = async (targetRozvadec: Rozvadec) => {
    if (!draggedRozvadec || draggedRozvadec.id === targetRozvadec.id) {
      setDraggedRozvadec(null);
      return;
    }
    const sorted = [...rozvadece].sort((a, b) => (a.poradi ?? a.id ?? 0) - (b.poradi ?? b.id ?? 0));
    const draggedIndex = sorted.findIndex(r => r.id === draggedRozvadec.id);
    const targetIndex = sorted.findIndex(r => r.id === targetRozvadec.id);
    const [removed] = sorted.splice(draggedIndex, 1);
    sorted.splice(targetIndex, 0, removed);
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].id) {
        updateRozvadec.mutate({ id: sorted[i].id!, data: { poradi: i + 1, revizeId } });
      }
    }
    setDraggedRozvadec(null);
  };

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Seznam rozvaděčů - levá strana */}
      <div className="lg:col-span-1">
        <Card
          title="Rozvaděče"
          actions={<Button size="sm" onClick={() => setIsRozvadecModalOpen(true)}>+ Přidat</Button>}
        >
          {rozvadece.length > 0 ? (
            <div className="space-y-2">
              {[...rozvadece].sort((a, b) => (a.poradi ?? a.id ?? 0) - (b.poradi ?? b.id ?? 0)).map((r) => (
                <div
                  key={r.id}
                  draggable
                  onDragStart={() => handleRozvadecDragStart(r)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleRozvadecDrop(r)}
                  onDragEnd={handleRozvadecDragEnd}
                  className={`rounded-lg border transition-colors cursor-grab active:cursor-grabbing ${
                    selectedRozvadec?.id === r.id
                      ? 'border-blue-500 bg-blue-50'
                      : draggedRozvadec?.id === r.id
                        ? 'opacity-50 bg-blue-50 border-slate-200'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                  }`}
                  onClick={() => handleSelectRozvadec(r)}
                >
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-xs">{r.nazev}</p>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                        {okruhyCounts[r.id!] || 0}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{r.oznaceni} • {r.stupenKryti}</p>
                    <p className="text-xs text-slate-400">{r.umisteni}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-500 py-6 text-xs">Zatím žádné rozvaděče.</p>
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
                <Button size="sm" onClick={() => {
                  resetOkruhForm();
                  if (window.innerWidth < 640) { setIsOkruhSheetOpen(true); }
                  else { setIsOkruhModalOpen(true); }
                }}>
                  <span className="sm:hidden">⊕</span>
                  <span className="hidden sm:inline">+ Přidat okruh</span>
                </Button>
                <Button size="sm" onClick={() => {
                  resetCranicForm();
                  if (window.innerWidth < 640) { setIsCranicSheetOpen(true); }
                  else { setIsCranicModalOpen(true); }
                }}>
                  <span className="sm:hidden">⚡</span>
                  <span className="hidden sm:inline">+ Přidat chránič</span>
                </Button>
                <Button variant="secondary" size="sm" onClick={() => {
                  setEditingRozvadec(selectedRozvadec);
                  setRozvadecFormData({
                    nazev: selectedRozvadec.nazev,
                    oznaceni: selectedRozvadec.oznaceni || '',
                    umisteni: selectedRozvadec.umisteni || '',
                    typRozvadece: selectedRozvadec.typRozvadece || '',
                    stupenKryti: selectedRozvadec.stupenKryti || 'IP20',
                    poznamka: selectedRozvadec.poznamka || '',
                  });
                  setIsRozvadecModalOpen(true);
                }}>Upravit</Button>
                <Button variant="danger" size="sm" onClick={() => handleDeleteRozvadec(selectedRozvadec.id!)}>Smazat</Button>
              </div>
            }
          >
            <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-2 bg-slate-50 rounded-lg"><p className="text-[10px] text-slate-500">Označení</p><p className="font-medium text-xs">{selectedRozvadec.oznaceni}</p></div>
              <div className="p-2 bg-slate-50 rounded-lg"><p className="text-[10px] text-slate-500">Umístění</p><p className="font-medium text-xs">{selectedRozvadec.umisteni}</p></div>
              <div className="p-2 bg-slate-50 rounded-lg"><p className="text-[10px] text-slate-500">Typ</p><p className="font-medium text-xs">{selectedRozvadec.typRozvadece || '—'}</p></div>
              <div className="p-2 bg-slate-50 rounded-lg"><p className="text-[10px] text-slate-500">Krytí</p><p className="font-medium text-xs">{selectedRozvadec.stupenKryti}</p></div>
            </div>

            <h4 className="font-medium text-sm text-slate-700 mb-2">Okruhy ({okruhy.length})</h4>
            {okruhy.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className={TW.th}>Č.</th>
                      <th className={TW.th}>Jistič</th>
                      <th className={TW.th}>Název</th>
                      <th className={TW.th}>Vodič</th>
                      <th className={TW.th}>Iz. odpor</th>
                      <th className={TW.th}>Imp. smyčky</th>
                      <th className={TW.th + ' text-right'}>Akce</th>
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
                        <td className="py-1 px-2 text-xs font-medium">
                          <span className="flex items-center gap-1">
                            <span className="text-slate-400">⋮⋮</span>
                            {o.cislo}
                          </span>
                        </td>
                        <td className="py-1 px-2 text-xs">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100">
                            {[
                              o.jisticTyp,
                              o.jisticProud ? `/${o.jisticProud}` : '',
                              o.pocetFazi ? `/${o.pocetFazi}` : ''
                            ].join('').replace(/\/\//g, '/').replace(/\/$/, '')}
                          </span>
                        </td>
                        <td className="py-1 px-2 text-xs">{o.nazev}</td>
                        <td className="py-1 px-2 text-xs text-slate-600">{o.vodic}</td>
                        <td className="py-1 px-2 text-xs text-slate-600">{o.izolacniOdpor || '—'}</td>
                        <td className="py-1 px-2 text-xs text-slate-600">{o.impedanceSmycky || '—'}</td>
                        <td className="py-1 px-2 text-xs text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="secondary" size="sm" onClick={() => handleDuplicateOkruh(o)} title="Duplikovat">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => handleEditOkruh(o)} title="Upravit">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => handleDeleteOkruh(o.id!)} title="Smazat">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
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

            <h4 className="font-medium text-sm text-slate-700 mt-4 mb-2">Proudové chraniče ({chranice.length})</h4>
            {chranice.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className={TW.th}>Č.</th>
                      <th className={TW.th}>Název</th>
                      <th className={TW.th}>Typ</th>
                      <th className={TW.th}>Proud</th>
                      <th className={TW.th}>IΔn [mA]</th>
                      <th className={TW.th}>Pólů</th>
                      <th className={TW.th}>IΔ [mA]</th>
                      <th className={TW.th}>tA 1× [ms]</th>
                      <th className={TW.th + ' text-right'}>Akce</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...chranice].sort((a, b) => a.cislo - b.cislo).map((c) => (
                      <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-1 px-2 text-xs font-medium">{c.cislo}</td>
                        <td className="py-1 px-2 text-xs">{c.nazev}</td>
                        <td className="py-1 px-2 text-xs">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700">{c.typ}</span>
                        </td>
                        <td className="py-1 px-2 text-xs text-slate-600">{c.proud}</td>
                        <td className="py-1 px-2 text-xs text-slate-600">{c.citlivostMa}</td>
                        <td className="py-1 px-2 text-xs text-slate-600">{c.pocetPolu}</td>
                        <td className="py-1 px-2 text-xs text-slate-600">{c.vybavovacProud != null ? c.vybavovacProud : '—'}</td>
                        <td className="py-1 px-2 text-xs text-slate-600">{c.casOdpojeni1x != null ? c.casOdpojeni1x : '—'}</td>
                        <td className="py-1 px-2 text-xs text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="secondary" size="sm" onClick={() => handleEditChranic(c)} title="Upravit">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => handleDeleteChranic(c.id!)} title="Smazat">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-slate-500 py-4 bg-slate-50 rounded-lg text-xs">
                Zatím žádné chraniče.
              </p>
            )}
          </Card>
        ) : (
          <Card>
            <div className="text-center py-12 text-slate-500">
              <p className="text-xs text-slate-400 mb-4">Zatím žádné rozvaděče</p>
              <p className="text-sm">Vyberte rozvaděč ze seznamu vlevo</p>
              <p className="text-xs mt-1">pro zobrazení detailu a okruhů</p>
            </div>
          </Card>
        )}
      </div>
    </div>

    {/* Modal pro přidání rozvaděče */}
    <Modal
      isOpen={isRozvadecModalOpen}
      onClose={() => { setIsRozvadecModalOpen(false); setEditingRozvadec(null); }}
      title={editingRozvadec ? 'Upravit rozvaděč' : 'Přidat rozvaděč'}
      footer={
        <>
          <Button variant="secondary" onClick={() => { setIsRozvadecModalOpen(false); setEditingRozvadec(null); }}>Zrušit</Button>
          <Button onClick={handleAddRozvadec}>{editingRozvadec ? 'Uložit' : 'Přidat'}</Button>
        </>
      }
    >
      <form onSubmit={handleAddRozvadec} className="space-y-4">
        <Input label="Název" value={rozvadecFormData.nazev} onChange={(e) => setRozvadecFormData({ ...rozvadecFormData, nazev: e.target.value })} required />
        <Input label="Označení" value={rozvadecFormData.oznaceni} onChange={(e) => setRozvadecFormData({ ...rozvadecFormData, oznaceni: e.target.value })} required />
        <Input label="Umístění" value={rozvadecFormData.umisteni} onChange={(e) => setRozvadecFormData({ ...rozvadecFormData, umisteni: e.target.value })} required />
        <Input label="Typ rozvaděče" value={rozvadecFormData.typRozvadece} onChange={(e) => setRozvadecFormData({ ...rozvadecFormData, typRozvadece: e.target.value })} />
        <Input label="Stupeň krytí" value={rozvadecFormData.stupenKryti} onChange={(e) => setRozvadecFormData({ ...rozvadecFormData, stupenKryti: e.target.value })} />
      </form>
    </Modal>

    {/* Modal pro přidání/úpravu okruhu */}
    <Modal
      isOpen={isOkruhModalOpen}
      onClose={() => { setIsOkruhModalOpen(false); setEditingOkruh(null); }}
      title={editingOkruh ? 'Upravit okruh' : 'Přidat okruh'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => { setIsOkruhModalOpen(false); setEditingOkruh(null); }}>Zrušit</Button>
          <Button onClick={handleAddOkruh}>{editingOkruh ? 'Uložit' : 'Přidat'}</Button>
        </>
      }
    >
      <form onSubmit={handleAddOkruh} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input type="number" label="Číslo okruhu" value={okruhFormData.cislo} onChange={(e) => setOkruhFormData({ ...okruhFormData, cislo: parseInt(e.target.value) })} required />
          <Input label="Název" value={okruhFormData.nazev} onChange={(e) => setOkruhFormData({ ...okruhFormData, nazev: e.target.value })} required />
        </div>
        <div className="grid grid-cols-4 gap-4">
          <EditableSelect label="Typ jištění" value={okruhFormData.jisticTyp} onChange={(val) => setOkruhFormData({ ...okruhFormData, jisticTyp: val })} options={['B', 'C', 'D', 'gG', 'aM', 'IT', 'IJ', 'IJV', 'ITM']} />
          <EditableSelect label="Proud jističe" value={okruhFormData.jisticProud} onChange={(val) => setOkruhFormData({ ...okruhFormData, jisticProud: val })} options={['2A','4A','6A','10A','13A','16A','20A','25A','32A','40A','50A','63A','80A','100A','125A','160A']} />
          <Select label="Počet fází" value={okruhFormData.pocetFazi.toString()} onChange={(e) => setOkruhFormData({ ...okruhFormData, pocetFazi: parseInt(e.target.value) })} options={[{ value: '1', label: '1P' }, { value: '2', label: '2P' }, { value: '3', label: '3P' }]} />
          <Input label="Vodič" value={okruhFormData.vodic} onChange={(e) => setOkruhFormData({ ...okruhFormData, vodic: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Izolační odpor (MΩ)" value={okruhFormData.izolacniOdpor} onChange={(e) => setOkruhFormData({ ...okruhFormData, izolacniOdpor: e.target.value })} />
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input label="Impedance smyčky (Ω)" value={okruhFormData.impedanceSmycky} onChange={(e) => setOkruhFormData({ ...okruhFormData, impedanceSmycky: e.target.value })} />
            </div>
            <label className="flex items-center gap-1.5 pb-2 cursor-pointer select-none">
              <input type="checkbox" checked={okruhFormData.impedanceSmyckyMax} onChange={(e) => setOkruhFormData({ ...okruhFormData, impedanceSmyckyMax: e.target.checked })} className="rounded border-slate-300" />
              <span className="text-xs text-slate-600 whitespace-nowrap">max.</span>
            </label>
          </div>
        </div>

      </form>
    </Modal>
    {/* Modal pro přidání/úpravu chraniče */}
    <Modal
      isOpen={isCranicModalOpen}
      onClose={() => { setIsCranicModalOpen(false); setEditingChranic(null); }}
      title={editingChranic ? 'Upravit chránič' : 'Přidat chránič'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => { setIsCranicModalOpen(false); setEditingChranic(null); }}>Zrušit</Button>
          <Button onClick={handleAddChranic}>{editingChranic ? 'Uložit' : 'Přidat'}</Button>
        </>
      }
    >
      <form onSubmit={handleAddChranic} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input type="number" label="Číslo" value={cranicFormData.cislo} onChange={(e) => setCranicFormData({ ...cranicFormData, cislo: parseInt(e.target.value) || 1 })} required />
          <Input label="Název" value={cranicFormData.nazev} onChange={(e) => setCranicFormData({ ...cranicFormData, nazev: e.target.value })} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <EditableSelect label="Typ chrániče" value={cranicFormData.typ} onChange={(val) => setCranicFormData({ ...cranicFormData, typ: val })} options={['A', 'AC', 'B', 'F', 'G']} />
          <EditableSelect label="Jmenovitý proud" value={cranicFormData.proud} onChange={(val) => setCranicFormData({ ...cranicFormData, proud: val })} options={['10A', '16A', '20A', '25A', '32A', '40A', '63A']} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Citlivost IΔn (mA)" value={String(cranicFormData.citlivostMa)} onChange={(e) => setCranicFormData({ ...cranicFormData, citlivostMa: parseFloat(e.target.value) })} options={[{ value: '10', label: '10 mA' }, { value: '30', label: '30 mA' }, { value: '100', label: '100 mA' }, { value: '300', label: '300 mA' }, { value: '500', label: '500 mA' }]} />
          <Select label="Počet pólů" value={String(cranicFormData.pocetPolu)} onChange={(e) => setCranicFormData({ ...cranicFormData, pocetPolu: parseInt(e.target.value) })} options={[{ value: '2', label: '2' }, { value: '4', label: '4' }]} />
        </div>
        {/* Měřené hodnoty */}
        <div className="border-t border-slate-200 pt-3">
          <p className="text-xs font-medium text-slate-500 mb-3">Měřené hodnoty</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox"
                checked={!!cranicFormData.testovacitlacitko}
                onChange={(e) => setCranicFormData({ ...cranicFormData, testovacitlacitko: e.target.checked || undefined })}
                className="rounded border-slate-300" />
              <span>Testovací tlačítko ✓</span>
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox"
                checked={!!cranicFormData.nevybavovaci}
                onChange={(e) => setCranicFormData({ ...cranicFormData, nevybavovaci: e.target.checked || undefined })}
                className="rounded border-slate-300" />
              <span>Nevybavení při 0,5×IΔn ✓</span>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Input type="number" step="0.1" label="Dotykové napětí Uc [V]"
              value={cranicFormData.dotykoveNapeti ?? ''}
              onChange={(e) => setCranicFormData({ ...cranicFormData, dotykoveNapeti: e.target.value ? parseFloat(e.target.value) : undefined })} />
            <Input type="number" step="0.1" label="Vybavovací proud IΔ [mA]"
              value={cranicFormData.vybavovacProud ?? ''}
              onChange={(e) => setCranicFormData({ ...cranicFormData, vybavovacProud: e.target.value ? parseFloat(e.target.value) : undefined })} />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Input type="number" step="1" label="Čas odpojení tA při 1×IΔn [ms]"
              value={cranicFormData.casOdpojeni1x ?? ''}
              onChange={(e) => setCranicFormData({ ...cranicFormData, casOdpojeni1x: e.target.value ? parseFloat(e.target.value) : undefined })} />
            {['AC', 'A'].includes(cranicFormData.typ) && (
              <Input type="number" step="1" label="Čas odpojení tA při 5×IΔn [ms]"
                value={cranicFormData.casOdpojeni5x ?? ''}
                onChange={(e) => setCranicFormData({ ...cranicFormData, casOdpojeni5x: e.target.value ? parseFloat(e.target.value) : undefined })} />
            )}
            {cranicFormData.typ === 'F' && (
              <>
                <Input type="number" step="1" label="Čas odpojení tA při 1,4×IΔn [ms]"
                  value={cranicFormData.casOdpojeni1_4x ?? ''}
                  onChange={(e) => setCranicFormData({ ...cranicFormData, casOdpojeni1_4x: e.target.value ? parseFloat(e.target.value) : undefined })} />
                <Input type="number" step="1" label="Čas odpojení tA při 2×IΔn [ms]"
                  value={cranicFormData.casOdpojeni2x ?? ''}
                  onChange={(e) => setCranicFormData({ ...cranicFormData, casOdpojeni2x: e.target.value ? parseFloat(e.target.value) : undefined })} />
                <label className="flex items-center gap-2 text-xs col-span-2">
                  <input type="checkbox"
                    checked={!!cranicFormData.zkouskaVypnuti2x}
                    onChange={(e) => setCranicFormData({ ...cranicFormData, zkouskaVypnuti2x: e.target.checked || undefined })}
                    className="rounded border-slate-300" />
                  <span>Zkouška vypnutí 2×IΔn nárůstem proudu ✓</span>
                </label>
              </>
            )}
          </div>
          <div className="mt-3">
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox"
                checked={!!cranicFormData.selektivita}
                onChange={(e) => setCranicFormData({ ...cranicFormData, selektivita: e.target.checked || undefined })}
                className="rounded border-slate-300" />
              <span>Selektivita (typ S/G) ✓</span>
            </label>
          </div>
        </div>
        <Input label="Poznámka" value={cranicFormData.poznamka} onChange={(e) => setCranicFormData({ ...cranicFormData, poznamka: e.target.value })} />
      </form>
    </Modal>
    {/* BottomSheet pro okruh (mobil) */}
    <BottomSheet
      isOpen={isOkruhSheetOpen}
      onClose={() => { setIsOkruhSheetOpen(false); setEditingOkruh(null); resetOkruhForm(); }}
      title={editingOkruh ? 'Upravit okruh' : 'Přidat okruh'}
      footer={
        <>
          <Button onClick={saveOkruh}>{editingOkruh ? 'Uložit' : 'Přidat'}</Button>
          <Button variant="secondary" onClick={() => { setIsOkruhSheetOpen(false); setEditingOkruh(null); resetOkruhForm(); }}>Zrušit</Button>
        </>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); saveOkruh(); }} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input type="number" label="Číslo okruhu" value={okruhFormData.cislo} onChange={(e) => setOkruhFormData({ ...okruhFormData, cislo: parseInt(e.target.value) })} required />
          <Input label="Název" value={okruhFormData.nazev} onChange={(e) => setOkruhFormData({ ...okruhFormData, nazev: e.target.value })} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <EditableSelect label="Typ jištění" value={okruhFormData.jisticTyp} onChange={(val) => setOkruhFormData({ ...okruhFormData, jisticTyp: val })} options={['B', 'C', 'D', 'gG', 'aM', 'IT', 'IJ', 'IJV', 'ITM']} />
          <EditableSelect label="Proud jističe" value={okruhFormData.jisticProud} onChange={(val) => setOkruhFormData({ ...okruhFormData, jisticProud: val })} options={['2A','4A','6A','10A','13A','16A','20A','25A','32A','40A','50A','63A','80A','100A','125A','160A']} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Počet fází" value={okruhFormData.pocetFazi.toString()} onChange={(e) => setOkruhFormData({ ...okruhFormData, pocetFazi: parseInt(e.target.value) })} options={[{ value: '1', label: '1P' }, { value: '2', label: '2P' }, { value: '3', label: '3P' }]} />
          <Input label="Vodič" value={okruhFormData.vodic} onChange={(e) => setOkruhFormData({ ...okruhFormData, vodic: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Izolační odpor (MΩ)" value={okruhFormData.izolacniOdpor} onChange={(e) => setOkruhFormData({ ...okruhFormData, izolacniOdpor: e.target.value })} />
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input label="Impedance smyčky (Ω)" value={okruhFormData.impedanceSmycky} onChange={(e) => setOkruhFormData({ ...okruhFormData, impedanceSmycky: e.target.value })} />
            </div>
            <label className="flex items-center gap-1.5 pb-2 cursor-pointer select-none">
              <input type="checkbox" checked={okruhFormData.impedanceSmyckyMax} onChange={(e) => setOkruhFormData({ ...okruhFormData, impedanceSmyckyMax: e.target.checked })} className="rounded border-slate-300" />
              <span className="text-xs text-slate-600 whitespace-nowrap">max.</span>
            </label>
          </div>
        </div>
      </form>
    </BottomSheet>

    {/* BottomSheet pro chránič (mobil) */}
    <BottomSheet
      isOpen={isCranicSheetOpen}
      onClose={() => { setIsCranicSheetOpen(false); setEditingChranic(null); resetCranicForm(); }}
      title={editingChranic ? 'Upravit chránič' : 'Přidat chránič'}
      footer={
        <>
          <Button onClick={saveCranic}>{editingChranic ? 'Uložit' : 'Přidat'}</Button>
          <Button variant="secondary" onClick={() => { setIsCranicSheetOpen(false); setEditingChranic(null); resetCranicForm(); }}>Zrušit</Button>
        </>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); saveCranic(); }} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input type="number" label="Číslo" value={cranicFormData.cislo} onChange={(e) => setCranicFormData({ ...cranicFormData, cislo: parseInt(e.target.value) || 1 })} required />
          <Input label="Název" value={cranicFormData.nazev} onChange={(e) => setCranicFormData({ ...cranicFormData, nazev: e.target.value })} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <EditableSelect label="Typ chrániče" value={cranicFormData.typ} onChange={(val) => setCranicFormData({ ...cranicFormData, typ: val })} options={['A', 'AC', 'B', 'F', 'G']} />
          <EditableSelect label="Jmenovitý proud" value={cranicFormData.proud} onChange={(val) => setCranicFormData({ ...cranicFormData, proud: val })} options={['10A', '16A', '20A', '25A', '32A', '40A', '63A']} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Citlivost Iδn (mA)" value={String(cranicFormData.citlivostMa)} onChange={(e) => setCranicFormData({ ...cranicFormData, citlivostMa: parseFloat(e.target.value) })} options={[{ value: '10', label: '10 mA' }, { value: '30', label: '30 mA' }, { value: '100', label: '100 mA' }, { value: '300', label: '300 mA' }, { value: '500', label: '500 mA' }]} />
          <Select label="Počet pólů" value={String(cranicFormData.pocetPolu)} onChange={(e) => setCranicFormData({ ...cranicFormData, pocetPolu: parseInt(e.target.value) })} options={[{ value: '2', label: '2' }, { value: '4', label: '4' }]} />
        </div>
        <div className="border-t border-slate-200 pt-3">
          <p className="text-xs font-medium text-slate-500 mb-3">Měřené hodnoty</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={!!cranicFormData.testovacitlacitko} onChange={(e) => setCranicFormData({ ...cranicFormData, testovacitlacitko: e.target.checked || undefined })} className="rounded border-slate-300" />
              <span>Testovací tlačítko ✓</span>
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={!!cranicFormData.nevybavovaci} onChange={(e) => setCranicFormData({ ...cranicFormData, nevybavovaci: e.target.checked || undefined })} className="rounded border-slate-300" />
              <span>Nevybavení při 0,5×Iδn ✓</span>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Input type="number" step="0.1" label="Dotykové napětí Uc [V]" value={cranicFormData.dotykoveNapeti ?? ''} onChange={(e) => setCranicFormData({ ...cranicFormData, dotykoveNapeti: e.target.value ? parseFloat(e.target.value) : undefined })} />
            <Input type="number" step="0.1" label="Vybavovací proud Iδ [mA]" value={cranicFormData.vybavovacProud ?? ''} onChange={(e) => setCranicFormData({ ...cranicFormData, vybavovacProud: e.target.value ? parseFloat(e.target.value) : undefined })} />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Input type="number" step="1" label="Čas odpojení tA při 1×Iδn [ms]" value={cranicFormData.casOdpojeni1x ?? ''} onChange={(e) => setCranicFormData({ ...cranicFormData, casOdpojeni1x: e.target.value ? parseFloat(e.target.value) : undefined })} />
            {['AC', 'A'].includes(cranicFormData.typ) && (
              <Input type="number" step="1" label="Čas odpojení tA při 5×Iδn [ms]" value={cranicFormData.casOdpojeni5x ?? ''} onChange={(e) => setCranicFormData({ ...cranicFormData, casOdpojeni5x: e.target.value ? parseFloat(e.target.value) : undefined })} />
            )}
            {cranicFormData.typ === 'F' && (
              <>
                <Input type="number" step="1" label="Čas odpojení tA při 1,4×Iδn [ms]" value={cranicFormData.casOdpojeni1_4x ?? ''} onChange={(e) => setCranicFormData({ ...cranicFormData, casOdpojeni1_4x: e.target.value ? parseFloat(e.target.value) : undefined })} />
                <Input type="number" step="1" label="Čas odpojení tA při 2×Iδn [ms]" value={cranicFormData.casOdpojeni2x ?? ''} onChange={(e) => setCranicFormData({ ...cranicFormData, casOdpojeni2x: e.target.value ? parseFloat(e.target.value) : undefined })} />
                <label className="flex items-center gap-2 text-xs col-span-2">
                  <input type="checkbox" checked={!!cranicFormData.zkouskaVypnuti2x} onChange={(e) => setCranicFormData({ ...cranicFormData, zkouskaVypnuti2x: e.target.checked || undefined })} className="rounded border-slate-300" />
                  <span>Zkouška vypnutí 2×Iδn nárůstem proudu ✓</span>
                </label>
              </>
            )}
          </div>
          <div className="mt-3">
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={!!cranicFormData.selektivita} onChange={(e) => setCranicFormData({ ...cranicFormData, selektivita: e.target.checked || undefined })} className="rounded border-slate-300" />
              <span>Selektivita (typ S/G) ✓</span>
            </label>
          </div>
        </div>
        <Input label="Poznámka" value={cranicFormData.poznamka} onChange={(e) => setCranicFormData({ ...cranicFormData, poznamka: e.target.value })} />
      </form>
    </BottomSheet>
    </>
  );
}
