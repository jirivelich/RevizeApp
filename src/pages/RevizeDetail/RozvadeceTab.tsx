import { useState, useEffect, useRef } from 'react';
import { Button, Card, Input, Modal, BottomSheet, ConfirmDialog } from '../../components/ui';
import { okruhService, cranicService } from '../../services/database';
import { useCreateRozvadec, useDeleteRozvadec, useUpdateRozvadec } from '../../hooks/useQueries';
import type { Rozvadec, Okruh, Chranic } from '../../types';
import { ImportZFotografiiModal } from './ImportZFotografiiModal';
import { EditableSelect, computeVodic, TYPY_KABELU, PRUREZY } from './rozvadeceShared';
import { OkruhFormFields, type OkruhFormData } from './OkruhFormFields';
import { CranicFormFields, type CranicFormData } from './CranicFormFields';
import { OkruhyInlineTable } from './OkruhyInlineTable';
import { OkruhyTable } from './OkruhyTable';
import { ChraniceTable } from './ChraniceTable';

// Re-export pro zpětnou kompatibilitu (testy importují přímo z RozvadeceTab)
export { EditableSelect, computeVodic, TYPY_KABELU, PRUREZY };

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
  const [isImportFotoOpen, setIsImportFotoOpen] = useState(false);
  const [deleteRozvadecId, setDeleteRozvadecId] = useState<number | null>(null);
  const [deleteOkruhId, setDeleteOkruhId] = useState<number | null>(null);
  const [deleteChranicId, setDeleteChranicId] = useState<number | null>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [cranicFormData, setCranicFormData] = useState<CranicFormData>({
    cislo: 1, nazev: '', typ: 'A', proud: '25A',
    citlivostMa: 30, pocetPolu: 2,
    testovacitlacitko: undefined,
    nevybavovaci: undefined,
    dotykoveNapeti: undefined,
    vybavovacProud: undefined,
    casOdpojeni1x: undefined,
    casOdpojeni5x: undefined,
    casOdpojeni1_4x: undefined,
    casOdpojeni2x: undefined,
    zkouskaVypnuti2x: undefined,
    selektivita: undefined,
    poznamka: '',
  });
  const [draggedRozvadec, setDraggedRozvadec] = useState<Rozvadec | null>(null);
  const [okruhyCounts, setOkruhyCounts] = useState<Record<number, number>>(propCounts);
  const [inlineModeRozvadecId, setInlineModeRozvadecId] = useState<number | null>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const [rozvadecFormData, setRozvadecFormData] = useState({
    nazev: '',
    oznaceni: '',
    umisteni: '',
    typRozvadece: '',
    stupenKryti: 'IP20',
    poznamka: '',
  });

  const [okruhFormData, setOkruhFormData] = useState<OkruhFormData>({
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
    // Jississochranič (RCBO)
    jeJisticochranac: false,
    chrTyp: 'A',
    chrCitlivostMa: 30,
    chrPocetPolu: 2,
    chrTestovacitlacitko: undefined,
    chrNevybavovaci: undefined,
    chrDotykoveNapeti: undefined,
    chrVybavovacProud: undefined,
    chrCasOdpojeni1x: undefined,
    chrCasOdpojeni5x: undefined,
    chrCasOdpojeni1_4x: undefined,
    chrCasOdpojeni2x: undefined,
    chrZkouskaVypnuti2x: undefined,
    chrSelektivita: undefined,
  });

  // Sync counts from parent
  useEffect(() => { setOkruhyCounts(propCounts); }, [propCounts]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleDeleteRozvadec = (rozvadecId: number) => setDeleteRozvadecId(rozvadecId);

  const handleConfirmDeleteRozvadec = () => {
    if (deleteRozvadecId === null) return;
    const rozvadecId = deleteRozvadecId;
    setDeleteRozvadecId(null);
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
  };

  const resetOkruhForm = () => {
    const nextCislo = okruhy.length > 0 ? Math.max(...okruhy.map(o => o.cislo)) + 1 : 1;
    setOkruhFormData({
      cislo: nextCislo, nazev: '', jisticTyp: 'B', jisticProud: '16A', pocetFazi: 1,
      typKabelu: 'CYKY', pocetZil: '3', prurez: '2,5',
      izolacniOdpor: '', impedanceSmycky: '', impedanceSmyckyMax: false, poznamka: '',
      jeJisticochranac: false, chrTyp: 'A', chrCitlivostMa: 30, chrPocetPolu: 2,
      chrTestovacitlacitko: undefined, chrNevybavovaci: undefined,
      chrDotykoveNapeti: undefined, chrVybavovacProud: undefined,
      chrCasOdpojeni1x: undefined, chrCasOdpojeni5x: undefined,
      chrCasOdpojeni1_4x: undefined, chrCasOdpojeni2x: undefined,
      chrZkouskaVypnuti2x: undefined, chrSelektivita: undefined,
    });
  };

  const saveOkruh = async () => {
    if (!selectedRozvadec?.id) return;
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

  const saveOkruhAndContinue = async () => {
    if (!selectedRozvadec?.id) return;
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
    await okruhService.create({ ...saveData, rozvadecId: selectedRozvadec.id });
    const okruhyData = await okruhService.getByRozvadec(selectedRozvadec.id);
    setOkruhy(okruhyData);
    setOkruhyCounts(prev => ({ ...prev, [selectedRozvadec.id!]: okruhyData.length }));
    const nextCislo = okruhyData.length > 0 ? Math.max(...okruhyData.map(o => o.cislo)) + 1 : 1;
    setOkruhFormData(prev => ({ ...prev, cislo: nextCislo }));
  };

  const handleAddOkruh = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveOkruh();
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
      cislo: okruh.cislo, nazev: okruh.nazev, jisticTyp: okruh.jisticTyp, jisticProud: okruh.jisticProud,
      pocetFazi: okruh.pocetFazi || 1, typKabelu, pocetZil, prurez,
      izolacniOdpor: okruh.izolacniOdpor || '',
      impedanceSmycky: okruh.impedanceSmycky?.replace(/^max\.\s*/, '') || '', impedanceSmyckyMax: okruh.impedanceSmycky?.startsWith('max.') || false,
      poznamka: okruh.poznamka || '',
      jeJisticochranac: okruh.jeJisticochranac || false,
      chrTyp: okruh.chrTyp || 'A',
      chrCitlivostMa: okruh.chrCitlivostMa ?? 30,
      chrPocetPolu: okruh.chrPocetPolu ?? 2,
      chrTestovacitlacitko: okruh.chrTestovacitlacitko,
      chrNevybavovaci: okruh.chrNevybavovaci,
      chrDotykoveNapeti: okruh.chrDotykoveNapeti,
      chrVybavovacProud: okruh.chrVybavovacProud,
      chrCasOdpojeni1x: okruh.chrCasOdpojeni1x,
      chrCasOdpojeni5x: okruh.chrCasOdpojeni5x,
      chrCasOdpojeni1_4x: okruh.chrCasOdpojeni1_4x,
      chrCasOdpojeni2x: okruh.chrCasOdpojeni2x,
      chrZkouskaVypnuti2x: okruh.chrZkouskaVypnuti2x,
      chrSelektivita: okruh.chrSelektivita,
    });
    if (window.innerWidth < 640) {
      setIsOkruhSheetOpen(true);
    } else {
      setIsOkruhModalOpen(true);
    }
  };

  const handleDeleteOkruh = (okruhId: number) => setDeleteOkruhId(okruhId);

  const handleConfirmDeleteOkruh = async () => {
    if (deleteOkruhId === null) return;
    const okruhId = deleteOkruhId;
    setDeleteOkruhId(null);
    await okruhService.delete(okruhId);
    if (selectedRozvadec?.id) {
      const okruhyData = await okruhService.getByRozvadec(selectedRozvadec.id);
      setOkruhy(okruhyData);
      setOkruhyCounts(prev => ({ ...prev, [selectedRozvadec.id!]: okruhyData.length }));
    }
  };

  const handleDuplicateOkruh = async (okruh: Okruh) => {
    if (selectedRozvadec?.id) {
      const nextCislo = okruhy.length > 0 ? Math.max(...okruhy.map(o => o.cislo)) + 1 : 1;
      await okruhService.create({
        rozvadecId: selectedRozvadec.id, cislo: nextCislo, nazev: okruh.nazev,
        jisticTyp: okruh.jisticTyp, jisticProud: okruh.jisticProud, pocetFazi: okruh.pocetFazi || 1,
        typKabelu: okruh.typKabelu, pocetZil: okruh.pocetZil, prurez: okruh.prurez,
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

  const handleDeleteChranic = (cranicId: number) => setDeleteChranicId(cranicId);

  const handleConfirmDeleteChranic = async () => {
    if (deleteChranicId === null) return;
    const cranicId = deleteChranicId;
    setDeleteChranicId(null);
    await cranicService.delete(cranicId);
    if (selectedRozvadec?.id) {
      setChranice(await cranicService.getByRozvadec(selectedRozvadec.id));
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
      {/* Seznam rozvaděčů - levá strana (skrytá v inline módu) */}
      <div className={inlineModeRozvadecId !== null ? 'hidden' : 'lg:col-span-1'}>
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
                      ? 'border-blue-500 bg-[var(--bg-accent)]'
                      : draggedRozvadec?.id === r.id
                        ? 'opacity-50 bg-[var(--bg-accent)] border-[var(--border)]'
                        : 'border-[var(--border)] bg-[var(--bg-surface)] hover:border-white/[0.14]'
                  }`}
                  onClick={() => handleSelectRozvadec(r)}
                >
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-xs">{r.nazev}</p>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)]">
                        {okruhyCounts[r.id!] || 0}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">{r.oznaceni} • {r.stupenKryti}</p>
                    <p className="text-xs text-[var(--text-muted)]">{r.umisteni}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-[var(--text-muted)] py-6 text-xs">Zatím žádné rozvaděče.</p>
          )}
        </Card>
      </div>

      {/* Detail rozvaděče - pravá strana (rozšíří se v inline módu) */}
      <div className={inlineModeRozvadecId !== null ? 'col-span-full' : 'lg:col-span-2'}>
        {selectedRozvadec ? (
          <Card
            title={`${selectedRozvadec.nazev}`}
            actions={
              <div className="flex items-center gap-1">
                {/* === DESKTOP (md+): všechna tlačítka === */}
                <div className="hidden md:flex items-center gap-1">
                  {inlineModeRozvadecId === selectedRozvadec.id ? (
                    <Button size="sm" variant="primary"
                      onClick={() => setInlineModeRozvadecId(null)}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                      Karty
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" title="Hromadný vstup okruhů"
                      onClick={() => {
                        setInlineModeRozvadecId(selectedRozvadec.id!);
                      }}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="9"/></svg>
                      Tabulka
                    </Button>
                  )}
                  {inlineModeRozvadecId !== selectedRozvadec.id && (<>
                    <Button size="sm" variant="secondary" onClick={() => setIsImportFotoOpen(true)} title="Import okruhů z fotografií">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      <span className="ml-1.5">Skenovat</span>
                    </Button>
                    <Button size="sm" variant="secondary" title="Přidat okruh"
                      onClick={() => { resetOkruhForm(); if (window.innerWidth < 640) { setIsOkruhSheetOpen(true); } else { setIsOkruhModalOpen(true); } }}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      <span className="ml-1">Okruh</span>
                    </Button>
                    <Button size="sm" variant="secondary" title="Přidat chránič"
                      onClick={() => { resetCranicForm(); if (window.innerWidth < 640) { setIsCranicSheetOpen(true); } else { setIsCranicModalOpen(true); } }}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                      <span className="ml-1">Chránič</span>
                    </Button>
                    <div className="w-px h-5 bg-[var(--border-medium)] mx-0.5 self-center" />
                    <Button variant="secondary" size="sm" title="Upravit rozvaděč"
                      onClick={() => {
                        setEditingRozvadec(selectedRozvadec);
                        setRozvadecFormData({ nazev: selectedRozvadec.nazev, oznaceni: selectedRozvadec.oznaceni || '', umisteni: selectedRozvadec.umisteni || '', typRozvadece: selectedRozvadec.typRozvadece || '', stupenKryti: selectedRozvadec.stupenKryti || 'IP20', poznamka: selectedRozvadec.poznamka || '' });
                        setIsRozvadecModalOpen(true);
                      }}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      <span className="ml-1">Upravit</span>
                    </Button>
                    <Button variant="danger" size="sm" title="Smazat rozvaděč"
                      onClick={() => handleDeleteRozvadec(selectedRozvadec.id!)}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                    </Button>
                  </>)}
                </div>

                {/* === MOBILNÍ (< md): ← Karty (inline mode) === */}
                {inlineModeRozvadecId === selectedRozvadec.id && (
                  <Button size="sm" variant="primary" className="md:hidden"
                    onClick={() => setInlineModeRozvadecId(null)}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                    Karty
                  </Button>
                )}

                {/* === MOBILNÍ (< md): + Okruh, + Chránič, ⋮ menu === */}
                {inlineModeRozvadecId !== selectedRozvadec.id && (
                  <div className="flex md:hidden items-center gap-1">
                    <Button size="sm" variant="secondary" title="Přidat okruh"
                      onClick={() => { resetOkruhForm(); setIsOkruhSheetOpen(true); }}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      <span className="ml-1">Okruh</span>
                    </Button>
                    <Button size="sm" variant="secondary" title="Přidat chránič"
                      onClick={() => { resetCranicForm(); setIsCranicSheetOpen(true); }}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                      <span className="ml-1">Chránič</span>
                    </Button>
                    <div className="relative" ref={moreMenuRef}>
                      <Button size="sm" variant="secondary" title="Více možností"
                        onClick={() => setIsMoreMenuOpen(v => !v)}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>
                      </Button>
                      {isMoreMenuOpen && (
                        <div className="absolute right-0 top-full mt-1 z-50 min-w-[168px] rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-xl py-1">
                          <button
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
                            onClick={() => { setIsMoreMenuOpen(false); setIsImportFotoOpen(true); }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-[var(--text-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                            Skenovat
                          </button>
                          <button
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
                            onClick={() => {
                              setIsMoreMenuOpen(false);
                              setInlineModeRozvadecId(selectedRozvadec.id!);
                            }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-[var(--text-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="9"/></svg>
                            Tabulka
                          </button>
                          <div className="h-px bg-[var(--border)] my-1" />
                          <button
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
                            onClick={() => {
                              setIsMoreMenuOpen(false);
                              setEditingRozvadec(selectedRozvadec);
                              setRozvadecFormData({ nazev: selectedRozvadec.nazev, oznaceni: selectedRozvadec.oznaceni || '', umisteni: selectedRozvadec.umisteni || '', typRozvadece: selectedRozvadec.typRozvadece || '', stupenKryti: selectedRozvadec.stupenKryti || 'IP20', poznamka: selectedRozvadec.poznamka || '' });
                              setIsRozvadecModalOpen(true);
                            }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-[var(--text-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            Upravit
                          </button>
                          <button
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-500 hover:bg-[var(--bg-hover)] transition-colors"
                            onClick={() => { setIsMoreMenuOpen(false); handleDeleteRozvadec(selectedRozvadec.id!); }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                            Smazat
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            }
          >
            <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-2 bg-[var(--bg-input)] rounded-lg"><p className="text-[10px] text-[var(--text-secondary)]">Označení</p><p className="font-medium text-xs text-[var(--text)]">{selectedRozvadec.oznaceni}</p></div>
              <div className="p-2 bg-[var(--bg-input)] rounded-lg"><p className="text-[10px] text-[var(--text-secondary)]">Umístění</p><p className="font-medium text-xs text-[var(--text)]">{selectedRozvadec.umisteni}</p></div>
              <div className="p-2 bg-[var(--bg-input)] rounded-lg"><p className="text-[10px] text-[var(--text-secondary)]">Typ</p><p className="font-medium text-xs text-[var(--text)]">{selectedRozvadec.typRozvadece || '—'}</p></div>
              <div className="p-2 bg-[var(--bg-input)] rounded-lg"><p className="text-[10px] text-[var(--text-secondary)]">Krytí</p><p className="font-medium text-xs text-[var(--text)]">{selectedRozvadec.stupenKryti}</p></div>
            </div>

            <h4 className="font-medium text-sm text-[var(--text)] mb-2">Okruhy ({okruhy.length})</h4>
            {inlineModeRozvadecId === selectedRozvadec.id ? (
              <OkruhyInlineTable
                rozvadecId={selectedRozvadec.id!}
                okruhy={okruhy}
                onEdit={handleEditOkruh}
                onDelete={handleDeleteOkruh}
                onSaved={(okruhyData) => {
                  setOkruhy(okruhyData);
                  setOkruhyCounts(prev => ({ ...prev, [selectedRozvadec.id!]: okruhyData.length }));
                }}
              />
            ) : okruhy.length > 0 ? (
              <OkruhyTable
                okruhy={okruhy}
                draggedOkruh={draggedOkruh}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onDuplicate={handleDuplicateOkruh}
                onEdit={handleEditOkruh}
                onDelete={handleDeleteOkruh}
              />
            ) : (
              <p className="text-center text-[var(--text-secondary)] py-6 bg-[var(--bg-input)] rounded-lg">
                Zatím žádné okruhy. Přidejte první kliknutím na tlačítko výše.
              </p>
            )}

            <h4 className="font-medium text-sm text-[var(--text)] mt-4 mb-2">Proudové chraniče ({chranice.length})</h4>
            {chranice.length > 0 ? (
              <ChraniceTable chranice={chranice} onEdit={handleEditChranic} onDelete={handleDeleteChranic} />
            ) : (
              <p className="text-center text-[var(--text-secondary)] py-4 bg-[var(--bg-input)] rounded-lg text-xs">
                Zatím žádné chraniče.
              </p>
            )}
          </Card>
        ) : (
          <Card>
            <div className="text-center py-12 text-[var(--text-muted)]">
              <p className="text-xs text-[var(--text-secondary)] mb-4">Zatím žádné rozvaděče</p>
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
          {!editingOkruh && <Button variant="secondary" onClick={saveOkruhAndContinue}>Přidat a pokračovat</Button>}
          <Button onClick={handleAddOkruh}>{editingOkruh ? 'Uložit' : 'Přidat'}</Button>
        </>
      }
    >
      <form onSubmit={handleAddOkruh} className="space-y-4">
        <OkruhFormFields data={okruhFormData} onChange={setOkruhFormData} />
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
        <CranicFormFields data={cranicFormData} onChange={setCranicFormData} />
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
          {!editingOkruh && <Button variant="secondary" onClick={saveOkruhAndContinue}>Přidat a pokr.</Button>}
          <Button variant="secondary" onClick={() => { setIsOkruhSheetOpen(false); setEditingOkruh(null); resetOkruhForm(); }}>Zrušit</Button>
        </>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); saveOkruh(); }} className="space-y-4">
        <OkruhFormFields data={okruhFormData} onChange={setOkruhFormData} />
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
        <CranicFormFields data={cranicFormData} onChange={setCranicFormData} />
      </form>
    </BottomSheet>

    {selectedRozvadec && (
      <ImportZFotografiiModal
        open={isImportFotoOpen}
        onClose={() => setIsImportFotoOpen(false)}
        rozvadecId={selectedRozvadec.id!}
        rozvadecNazev={selectedRozvadec.nazev}
        existingOkruhy={okruhy}
        onSaved={async () => {
          if (selectedRozvadec?.id) {
            const okruhyData = await okruhService.getByRozvadec(selectedRozvadec.id);
            setOkruhy(okruhyData);
            setOkruhyCounts(prev => ({ ...prev, [selectedRozvadec.id!]: okruhyData.length }));
          }
        }}
      />
    )}

    <ConfirmDialog
      isOpen={deleteRozvadecId !== null}
      title="Smazat rozvaděč"
      message="Opravdu chcete smazat tento rozvaděč?"
      confirmLabel="Smazat"
      onConfirm={handleConfirmDeleteRozvadec}
      onCancel={() => setDeleteRozvadecId(null)}
    />
    <ConfirmDialog
      isOpen={deleteOkruhId !== null}
      title="Smazat okruh"
      message="Opravdu chcete smazat tento okruh?"
      confirmLabel="Smazat"
      onConfirm={handleConfirmDeleteOkruh}
      onCancel={() => setDeleteOkruhId(null)}
    />
    <ConfirmDialog
      isOpen={deleteChranicId !== null}
      title="Smazat chránič"
      message="Opravdu chcete smazat tento chránič?"
      confirmLabel="Smazat"
      onConfirm={handleConfirmDeleteChranic}
      onCancel={() => setDeleteChranicId(null)}
    />
    </>
  );
}
