import { useState, useEffect, useRef } from 'react';
import { Button, Card, Input, Select, Modal, BottomSheet } from '../../components/ui';
import { TW } from './tw';
import { okruhService, cranicService } from '../../services/database';
import { useCreateRozvadec, useDeleteRozvadec, useUpdateRozvadec } from '../../hooks/useQueries';
import type { Rozvadec, Okruh, Chranic } from '../../types';

export const TYPY_KABELU = ['CYKY', 'CY', 'NYM', 'CYKFY', 'YDY', 'AYKY', 'AY'];
export const PRUREZY = ['1', '1,5', '2,5', '4', '6', '10', '16', '25', '35', '50', '70', '95', '120'];

export function computeVodic(typKabelu?: string, pocetZil?: string, prurez?: string): string {
  if (!typKabelu && !pocetZil && !prurez) return '';
  const core = pocetZil ? `${pocetZil}x${prurez ?? ''}` : prurez ?? '';
  return [typKabelu, core].filter(Boolean).join(' ');
}

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
      <label className="text-xs font-medium text-[var(--text-secondary)]">{label}</label>
      {showCustom ? (
        <div className="relative">
          <input
            className="w-full px-3 py-2 pr-8 border rounded-lg bg-[var(--bg-input)] text-[var(--text-primary)] border-[var(--border-input)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)] focus:border-blue-500/[0.5] text-xs"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
          />
          <button
            type="button"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs"
            onClick={() => { setShowCustom(false); }}
            title="Zpět na seznam"
          >↩</button>
        </div>
      ) : (
        <select
          className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-input)] text-[var(--text-primary)] border-[var(--border-input)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)] focus:border-blue-500/[0.5] text-xs"
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
  const [inlineModeRozvadecId, setInlineModeRozvadecId] = useState<number | null>(null);
  const [inlineOkruhDraft, setInlineOkruhDraft] = useState({
    cislo: 1, nazev: '', jisticTyp: 'B', jisticProud: '16A', pocetFazi: 1,
    typKabelu: 'CYKY', pocetZil: '3', prurez: '2,5',
    izolacniOdpor: '', impedanceSmycky: '',
  });
  const inlineNazevRef = useRef<HTMLInputElement>(null);
  const inlineJisticTypRef = useRef<HTMLSelectElement>(null);
  const inlineJisticProudRef = useRef<HTMLSelectElement>(null);
  const inlinePocetFaziRef = useRef<HTMLSelectElement>(null);
  const inlineTypKabeluRef = useRef<HTMLSelectElement>(null);
  const inlinePocetZilRef = useRef<HTMLSelectElement>(null);
  const inlinePrurezRef = useRef<HTMLSelectElement>(null);
  const inlineIzolacniOdporRef = useRef<HTMLInputElement>(null);
  const inlineImpedanceSmyckyRef = useRef<HTMLInputElement>(null);

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
    typKabelu: 'CYKY',
    pocetZil: '3',
    prurez: '2,5',
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
      cislo: nextCislo, nazev: '', jisticTyp: 'B', jisticProud: '16A', pocetFazi: 1,
      typKabelu: 'CYKY', pocetZil: '3', prurez: '2,5',
      izolacniOdpor: '', impedanceSmycky: '', impedanceSmyckyMax: false, poznamka: '',
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

  const handleInlineOkruhSave = async (rozvadecId: number) => {
    if (!inlineOkruhDraft.nazev.trim()) return;
    const vodic = computeVodic(inlineOkruhDraft.typKabelu, inlineOkruhDraft.pocetZil, inlineOkruhDraft.prurez);
    await okruhService.create({
      rozvadecId,
      cislo: inlineOkruhDraft.cislo,
      nazev: inlineOkruhDraft.nazev,
      jisticTyp: inlineOkruhDraft.jisticTyp,
      jisticProud: inlineOkruhDraft.jisticProud,
      pocetFazi: inlineOkruhDraft.pocetFazi,
      typKabelu: inlineOkruhDraft.typKabelu || undefined,
      pocetZil: inlineOkruhDraft.pocetZil || undefined,
      prurez: inlineOkruhDraft.prurez || undefined,
      vodic: vodic || undefined,
      izolacniOdpor: inlineOkruhDraft.izolacniOdpor || undefined,
      impedanceSmycky: inlineOkruhDraft.impedanceSmycky || undefined,
    });
    const okruhyData = await okruhService.getByRozvadec(rozvadecId);
    setOkruhy(okruhyData);
    setOkruhyCounts(prev => ({ ...prev, [rozvadecId]: okruhyData.length }));
    const nextCislo = okruhyData.length > 0 ? Math.max(...okruhyData.map(o => o.cislo)) + 1 : 1;
    setInlineOkruhDraft(d => ({ ...d, cislo: nextCislo, nazev: '', izolacniOdpor: '', impedanceSmycky: '' }));
    setTimeout(() => inlineNazevRef.current?.focus(), 50);
  };

  // Shift+Enter — uloží řádek a zkopíruje tech. data (jistic, kabel) do nového
  const handleInlineOkruhSaveDuplicate = async (rozvadecId: number) => {
    if (!inlineOkruhDraft.nazev.trim()) return;
    const prevDraft = { ...inlineOkruhDraft };
    const vodic = computeVodic(prevDraft.typKabelu, prevDraft.pocetZil, prevDraft.prurez);
    await okruhService.create({
      rozvadecId,
      cislo: prevDraft.cislo,
      nazev: prevDraft.nazev,
      jisticTyp: prevDraft.jisticTyp,
      jisticProud: prevDraft.jisticProud,
      pocetFazi: prevDraft.pocetFazi,
      typKabelu: prevDraft.typKabelu || undefined,
      pocetZil: prevDraft.pocetZil || undefined,
      prurez: prevDraft.prurez || undefined,
      vodic: vodic || undefined,
      izolacniOdpor: prevDraft.izolacniOdpor || undefined,
      impedanceSmycky: prevDraft.impedanceSmycky || undefined,
    });
    const okruhyData = await okruhService.getByRozvadec(rozvadecId);
    setOkruhy(okruhyData);
    setOkruhyCounts(prev => ({ ...prev, [rozvadecId]: okruhyData.length }));
    const nextCislo = okruhyData.length > 0 ? Math.max(...okruhyData.map(o => o.cislo)) + 1 : 1;
    // Zachovat všechna data z předchozího řádku, pouze inkrementovat cislo
    setInlineOkruhDraft({
      ...prevDraft,
      cislo: nextCislo,
    });
    setTimeout(() => inlineNazevRef.current?.focus(), 50);
  };

  const handleInlineOkruhKeyDown = (
    e: React.KeyboardEvent,
    field: 'nazev' | 'jisticTyp' | 'jisticProud' | 'pocetFazi' | 'typKabelu' | 'pocetZil' | 'prurez' | 'izolacniOdpor' | 'impedanceSmycky',
    rozvadecId: number,
  ) => {
    if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); handleInlineOkruhSaveDuplicate(rozvadecId); return; }
    if (e.key === 'Enter') { e.preventDefault(); handleInlineOkruhSave(rozvadecId); return; }
    if (e.key === 'Tab' && !e.shiftKey) {
      const order = ['nazev', 'jisticTyp', 'jisticProud', 'pocetFazi', 'typKabelu', 'pocetZil', 'prurez', 'izolacniOdpor', 'impedanceSmycky'] as const;
      const refs = [inlineNazevRef, inlineJisticTypRef, inlineJisticProudRef, inlinePocetFaziRef, inlineTypKabeluRef, inlinePocetZilRef, inlinePrurezRef, inlineIzolacniOdporRef, inlineImpedanceSmyckyRef];
      const idx = order.indexOf(field as typeof order[number]);
      if (idx < order.length - 1) {
        e.preventDefault();
        refs[idx + 1].current?.focus();
      } else {
        e.preventDefault();
        handleInlineOkruhSave(rozvadecId);
      }
    }
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
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={inlineModeRozvadecId === selectedRozvadec.id ? 'primary' : 'secondary'}
                  className="hidden md:inline-flex"
                  onClick={() => {
                    if (inlineModeRozvadecId === selectedRozvadec.id) {
                      setInlineModeRozvadecId(null);
                    } else {
                      const nextCislo = okruhy.length > 0 ? Math.max(...okruhy.map(o => o.cislo)) + 1 : 1;
                      setInlineOkruhDraft(d => ({ ...d, cislo: nextCislo, nazev: '', izolacniOdpor: '', impedanceSmycky: '' }));
                      setInlineModeRozvadecId(selectedRozvadec.id!);
                      setTimeout(() => inlineNazevRef.current?.focus(), 80);
                    }
                  }}
                >
                  {inlineModeRozvadecId === selectedRozvadec.id ? '← Karty' : '⌨ Hromadný vstup'}
                </Button>
                {inlineModeRozvadecId !== selectedRozvadec.id && (
                  <Button size="sm" onClick={() => {
                    resetOkruhForm();
                    if (window.innerWidth < 640) { setIsOkruhSheetOpen(true); }
                    else { setIsOkruhModalOpen(true); }
                  }}>
                    <span className="sm:hidden">⊕</span>
                    <span className="hidden sm:inline">+ Přidat okruh</span>
                  </Button>
                )}
                {inlineModeRozvadecId !== selectedRozvadec.id && (
                  <Button size="sm" onClick={() => {
                    resetCranicForm();
                    if (window.innerWidth < 640) { setIsCranicSheetOpen(true); }
                    else { setIsCranicModalOpen(true); }
                  }}>
                    <span className="sm:hidden">⚡</span>
                    <span className="hidden sm:inline">+ Přidat chránič</span>
                  </Button>
                )}
                {inlineModeRozvadecId !== selectedRozvadec.id && (
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
                )}
                {inlineModeRozvadecId !== selectedRozvadec.id && (
                  <Button variant="danger" size="sm" onClick={() => handleDeleteRozvadec(selectedRozvadec.id!)}>Smazat</Button>
                )}
              </div>
            }
          >
            <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-2 bg-[var(--bg-input)] rounded-lg"><p className="text-[10px] text-[var(--text-secondary)]">Označení</p><p className="font-medium text-xs text-[var(--text-primary)]">{selectedRozvadec.oznaceni}</p></div>
              <div className="p-2 bg-[var(--bg-input)] rounded-lg"><p className="text-[10px] text-[var(--text-secondary)]">Umístění</p><p className="font-medium text-xs text-[var(--text-primary)]">{selectedRozvadec.umisteni}</p></div>
              <div className="p-2 bg-[var(--bg-input)] rounded-lg"><p className="text-[10px] text-[var(--text-secondary)]">Typ</p><p className="font-medium text-xs text-[var(--text-primary)]">{selectedRozvadec.typRozvadece || '—'}</p></div>
              <div className="p-2 bg-[var(--bg-input)] rounded-lg"><p className="text-[10px] text-[var(--text-secondary)]">Krytí</p><p className="font-medium text-xs text-[var(--text-primary)]">{selectedRozvadec.stupenKryti}</p></div>
            </div>

            <h4 className="font-medium text-sm text-[var(--text-primary)] mb-2">Okruhy ({okruhy.length})</h4>
            {inlineModeRozvadecId === selectedRozvadec.id ? (
              // ─── HROMADNÝ VSTUP – inline tabulka ─────────────────────────
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-table)] text-xs text-[var(--text-secondary)] uppercase tracking-wide">
                      <th className="text-left py-2 pr-2 font-medium w-8">Č.</th>
                      <th className="text-left py-2 pr-2 font-medium">Název</th>
                      <th className="text-left py-2 pr-2 font-medium w-16">Typ</th>
                      <th className="text-left py-2 pr-2 font-medium w-20">Proud</th>
                      <th className="text-left py-2 pr-2 font-medium w-14">Fáze</th>
                      <th className="text-left py-2 pr-2 font-medium w-20">Kabel</th>
                      <th className="text-left py-2 pr-2 font-medium w-14">Žíly</th>
                      <th className="text-left py-2 pr-2 font-medium w-16">Průřez</th>
                      <th className="text-left py-2 pr-2 font-medium w-20">Iz. odpor</th>
                      <th className="text-left py-2 pr-2 font-medium w-20">Imp. smyčky</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {okruhy.sort((a, b) => a.cislo - b.cislo).map((o) => (
                      <tr key={o.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-input)] group">
                        <td className="py-1.5 pr-2 text-xs font-medium text-[var(--text-secondary)]">{o.cislo}</td>
                        <td className="py-1.5 pr-2 text-xs font-medium text-[var(--text-primary)]">{o.nazev}</td>
                        <td className="py-1.5 pr-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)]">{o.jisticTyp}</span>
                        </td>
                        <td className="py-1.5 pr-2 text-xs text-[var(--text-secondary)]">{o.jisticProud}</td>
                        <td className="py-1.5 pr-2 text-xs text-[var(--text-secondary)]">{o.pocetFazi}P</td>
                        <td className="py-1.5 pr-2 text-xs text-[var(--text-secondary)]">{o.typKabelu || '—'}</td>
                        <td className="py-1.5 pr-2 text-xs text-[var(--text-secondary)]">{o.pocetZil || '—'}</td>
                        <td className="py-1.5 pr-2 text-xs text-[var(--text-secondary)]">{o.prurez ? `${o.prurez} mm²` : '—'}</td>
                        <td className="py-1.5 pr-2 text-xs text-[var(--text-secondary)]">{o.izolacniOdpor || '—'}</td>
                        <td className="py-1.5 pr-2 text-xs text-[var(--text-secondary)]">{o.impedanceSmycky || '—'}</td>
                        <td className="py-1.5">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button type="button" title="Upravit" onClick={() => handleEditOkruh(o)}
                              className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs">✎</button>
                            <button type="button" title="Smazat" onClick={() => handleDeleteOkruh(o.id!)}
                              className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/[0.08] text-[var(--text-secondary)] hover:text-red-400 text-xs">✕</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {/* Draft řádek */}
                    <tr className="bg-[var(--bg-accent-soft)] border-b border-blue-500/[0.20]">
                      <td className="py-1 pr-2 text-xs font-medium text-[var(--text-secondary)] pl-1">{inlineOkruhDraft.cislo}</td>
                      <td className="py-1 pr-2">
                        <input ref={inlineNazevRef} type="text" value={inlineOkruhDraft.nazev}
                          onChange={(e) => setInlineOkruhDraft(d => ({ ...d, nazev: e.target.value }))}
                          onKeyDown={(e) => handleInlineOkruhKeyDown(e, 'nazev', selectedRozvadec.id!)}
                          placeholder="Název okruhu..." autoComplete="off"
                          className="w-full px-2 py-1 border border-[var(--border-input)] rounded bg-[var(--bg-input)] text-[var(--text-primary)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)]" />
                      </td>
                      <td className="py-1 pr-2">
                        <select ref={inlineJisticTypRef} value={inlineOkruhDraft.jisticTyp}
                          onChange={(e) => setInlineOkruhDraft(d => ({ ...d, jisticTyp: e.target.value }))}
                          onKeyDown={(e) => handleInlineOkruhKeyDown(e, 'jisticTyp', selectedRozvadec.id!)}
                          className="w-full px-1.5 py-1 border border-[var(--border-input)] rounded bg-[var(--bg-input)] text-[var(--text-primary)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)]">
                          {['B','C','D','gG','aM','IT','IJ','IJV','ITM'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td className="py-1 pr-2">
                        <select ref={inlineJisticProudRef} value={inlineOkruhDraft.jisticProud}
                          onChange={(e) => setInlineOkruhDraft(d => ({ ...d, jisticProud: e.target.value }))}
                          onKeyDown={(e) => handleInlineOkruhKeyDown(e, 'jisticProud', selectedRozvadec.id!)}
                          className="w-full px-1.5 py-1 border border-[var(--border-input)] rounded bg-[var(--bg-input)] text-[var(--text-primary)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)]">
                          {['2A','4A','6A','10A','13A','16A','20A','25A','32A','40A','50A','63A','80A','100A','125A','160A'].map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </td>
                      <td className="py-1 pr-2">
                        <select ref={inlinePocetFaziRef} value={inlineOkruhDraft.pocetFazi}
                          onChange={(e) => setInlineOkruhDraft(d => ({ ...d, pocetFazi: Number(e.target.value) }))}
                          onKeyDown={(e) => handleInlineOkruhKeyDown(e, 'pocetFazi', selectedRozvadec.id!)}
                          className="w-full px-1.5 py-1 border border-[var(--border-input)] rounded bg-[var(--bg-input)] text-[var(--text-primary)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)]">
                          <option value={1}>1P</option>
                          <option value={2}>2P</option>
                          <option value={3}>3P</option>
                        </select>
                      </td>
                      <td className="py-1 pr-2">
                        <select ref={inlineTypKabeluRef} value={inlineOkruhDraft.typKabelu}
                          onChange={(e) => setInlineOkruhDraft(d => ({ ...d, typKabelu: e.target.value }))}
                          onKeyDown={(e) => handleInlineOkruhKeyDown(e, 'typKabelu', selectedRozvadec.id!)}
                          className="w-full px-1.5 py-1 border border-[var(--border-input)] rounded bg-[var(--bg-input)] text-[var(--text-primary)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)]">
                          {TYPY_KABELU.map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                      </td>
                      <td className="py-1 pr-2">
                        <select ref={inlinePocetZilRef} value={inlineOkruhDraft.pocetZil}
                          onChange={(e) => setInlineOkruhDraft(d => ({ ...d, pocetZil: e.target.value }))}
                          onKeyDown={(e) => handleInlineOkruhKeyDown(e, 'pocetZil', selectedRozvadec.id!)}
                          className="w-full px-1.5 py-1 border border-[var(--border-input)] rounded bg-[var(--bg-input)] text-[var(--text-primary)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)]">
                          {['1','2','3','4','5'].map(z => <option key={z} value={z}>{z}</option>)}
                        </select>
                      </td>
                      <td className="py-1 pr-2">
                        <select ref={inlinePrurezRef} value={inlineOkruhDraft.prurez}
                          onChange={(e) => setInlineOkruhDraft(d => ({ ...d, prurez: e.target.value }))}
                          onKeyDown={(e) => handleInlineOkruhKeyDown(e, 'prurez', selectedRozvadec.id!)}
                          className="w-full px-1.5 py-1 border border-[var(--border-input)] rounded bg-[var(--bg-input)] text-[var(--text-primary)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)]">
                          {PRUREZY.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </td>
                      <td className="py-1 pr-2">
                        <input ref={inlineIzolacniOdporRef} type="text" value={inlineOkruhDraft.izolacniOdpor}
                          onChange={(e) => setInlineOkruhDraft(d => ({ ...d, izolacniOdpor: e.target.value }))}
                          onKeyDown={(e) => handleInlineOkruhKeyDown(e, 'izolacniOdpor', selectedRozvadec.id!)}
                          placeholder="MΩ" autoComplete="off"
                          className="w-full px-2 py-1 border border-[var(--border-input)] rounded bg-[var(--bg-input)] text-[var(--text-primary)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)]" />
                      </td>
                      <td className="py-1 pr-2">
                        <input ref={inlineImpedanceSmyckyRef} type="text" value={inlineOkruhDraft.impedanceSmycky}
                          onChange={(e) => setInlineOkruhDraft(d => ({ ...d, impedanceSmycky: e.target.value }))}
                          onKeyDown={(e) => handleInlineOkruhKeyDown(e, 'impedanceSmycky', selectedRozvadec.id!)}
                          placeholder="Ω" autoComplete="off"
                          className="w-full px-2 py-1 border border-[var(--border-input)] rounded bg-[var(--bg-input)] text-[var(--text-primary)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)]" />
                      </td>
                      <td className="py-1">
                        <button type="button" title="Uložit (Enter)" onClick={() => handleInlineOkruhSave(selectedRozvadec.id!)}
                          disabled={!inlineOkruhDraft.nazev.trim()}
                          className="w-7 h-7 flex items-center justify-center rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-base">↵</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-xs text-[var(--text-secondary)] mt-2 select-none">
                  <kbd className="px-1 bg-[var(--bg-hover)] rounded border border-[var(--border-medium)] text-[10px]">Tab</kbd> přechod &nbsp;·&nbsp;
                  <kbd className="px-1 bg-[var(--bg-hover)] rounded border border-[var(--border-medium)] text-[10px]">Enter</kbd> uložit řádek &nbsp;·&nbsp;
                  <kbd className="px-1 bg-[var(--bg-hover)] rounded border border-[var(--border-medium)] text-[10px]">Shift+Enter</kbd> uložit + zkopírovat celý řádek &nbsp;·&nbsp;
                  ✎ upravit vč. poznámky
                </p>
              </div>
            ) : okruhy.length > 0 ? (
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
                        className={`border-b border-[var(--border-subtle)] hover:bg-[var(--bg-input)] cursor-grab active:cursor-grabbing ${
                          draggedOkruh?.id === o.id ? 'opacity-50 bg-[var(--bg-accent)]' : ''
                        }`}
                      >
                        <td className="py-1 px-2 text-xs font-medium text-[var(--text-primary)]">
                          <span className="flex items-center gap-1">
                            <span className="text-[var(--text-muted)]">⋮⋮</span>
                            {o.cislo}
                          </span>
                        </td>
                        <td className="py-1 px-2 text-xs">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)]">
                            {[
                              o.jisticTyp,
                              o.jisticProud ? `/${o.jisticProud}` : '',
                              o.pocetFazi ? `/${o.pocetFazi}` : ''
                            ].join('').replace(/\/\//g, '/').replace(/\/$/, '')}
                          </span>
                        </td>
                        <td className="py-1 px-2 text-xs text-[var(--text-primary)]">{o.nazev}</td>
                        <td className="py-1 px-2 text-xs text-[var(--text-secondary)]">{computeVodic(o.typKabelu, o.pocetZil, o.prurez) || o.vodic}</td>
                        <td className="py-1 px-2 text-xs text-[var(--text-secondary)]">{o.izolacniOdpor || '—'}</td>
                        <td className="py-1 px-2 text-xs text-[var(--text-secondary)]">{o.impedanceSmycky || '—'}</td>
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
              <p className="text-center text-[var(--text-secondary)] py-6 bg-[var(--bg-input)] rounded-lg">
                Zatím žádné okruhy. Přidejte první kliknutím na tlačítko výše.
              </p>
            )}

            <h4 className="font-medium text-sm text-[var(--text-primary)] mt-4 mb-2">Proudové chraniče ({chranice.length})</h4>
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
                      <tr key={c.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-input)]">
                        <td className="py-1 px-2 text-xs font-medium text-[var(--text-primary)]">{c.cislo}</td>
                        <td className="py-1 px-2 text-xs text-[var(--text-primary)]">{c.nazev}</td>
                        <td className="py-1 px-2 text-xs">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--bg-accent-badge)] text-blue-300">{c.typ}</span>
                        </td>
                        <td className="py-1 px-2 text-xs text-[var(--text-secondary)]">{c.proud}</td>
                        <td className="py-1 px-2 text-xs text-[var(--text-secondary)]">{c.citlivostMa}</td>
                        <td className="py-1 px-2 text-xs text-[var(--text-secondary)]">{c.pocetPolu}</td>
                        <td className="py-1 px-2 text-xs text-[var(--text-secondary)]">{c.vybavovacProud != null ? c.vybavovacProud : '—'}</td>
                        <td className="py-1 px-2 text-xs text-[var(--text-secondary)]">{c.casOdpojeni1x != null ? c.casOdpojeni1x : '—'}</td>
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
        <div className="grid grid-cols-2 gap-4">
          <Input type="number" label="Číslo okruhu" value={okruhFormData.cislo} onChange={(e) => setOkruhFormData({ ...okruhFormData, cislo: parseInt(e.target.value) })} required />
          <Input label="Název" value={okruhFormData.nazev} onChange={(e) => setOkruhFormData({ ...okruhFormData, nazev: e.target.value })} required />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <EditableSelect label="Typ jištění" value={okruhFormData.jisticTyp} onChange={(val) => setOkruhFormData({ ...okruhFormData, jisticTyp: val })} options={['B', 'C', 'D', 'gG', 'aM', 'IT', 'IJ', 'IJV', 'ITM']} />
          <EditableSelect label="Proud jističe" value={okruhFormData.jisticProud} onChange={(val) => setOkruhFormData({ ...okruhFormData, jisticProud: val })} options={['2A','4A','6A','10A','13A','16A','20A','25A','32A','40A','50A','63A','80A','100A','125A','160A']} />
          <Select label="Počet fází" value={okruhFormData.pocetFazi.toString()} onChange={(e) => setOkruhFormData({ ...okruhFormData, pocetFazi: parseInt(e.target.value) })} options={[{ value: '1', label: '1P' }, { value: '2', label: '2P' }, { value: '3', label: '3P' }]} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <EditableSelect label="Typ kabelu" value={okruhFormData.typKabelu} onChange={(val) => setOkruhFormData({ ...okruhFormData, typKabelu: val })} options={TYPY_KABELU} />
          <Input label="Počet žil (volitelné)" value={okruhFormData.pocetZil} onChange={(e) => setOkruhFormData({ ...okruhFormData, pocetZil: e.target.value })} placeholder="např. 3" />
          <EditableSelect label="Průřez (mm²)" value={okruhFormData.prurez} onChange={(val) => setOkruhFormData({ ...okruhFormData, prurez: val })} options={PRUREZY} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Izolační odpor (MΩ)" value={okruhFormData.izolacniOdpor} onChange={(e) => setOkruhFormData({ ...okruhFormData, izolacniOdpor: e.target.value })} />
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input label="Impedance smyčky (Ω)" value={okruhFormData.impedanceSmycky} onChange={(e) => setOkruhFormData({ ...okruhFormData, impedanceSmycky: e.target.value })} />
            </div>
            <label className="flex items-center gap-1.5 pb-2 cursor-pointer select-none">
              <input type="checkbox" checked={okruhFormData.impedanceSmyckyMax} onChange={(e) => setOkruhFormData({ ...okruhFormData, impedanceSmyckyMax: e.target.checked })} className="rounded border-[var(--checkbox-border)]" />
              <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">max.</span>
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
        <div className="border-t border-[var(--border-table)] pt-3">
          <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">Měřené hodnoty</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox"
                checked={!!cranicFormData.testovacitlacitko}
                onChange={(e) => setCranicFormData({ ...cranicFormData, testovacitlacitko: e.target.checked || undefined })}
                className="rounded border-[var(--checkbox-border)]" />
              <span>Testovací tlačítko ✓</span>
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox"
                checked={!!cranicFormData.nevybavovaci}
                onChange={(e) => setCranicFormData({ ...cranicFormData, nevybavovaci: e.target.checked || undefined })}
                className="rounded border-[var(--checkbox-border)]" />
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
                    className="rounded border-[var(--checkbox-border)]" />
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
                className="rounded border-[var(--checkbox-border)]" />
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
          {!editingOkruh && <Button variant="secondary" onClick={saveOkruhAndContinue}>Přidat a pokr.</Button>}
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
          <EditableSelect label="Typ kabelu" value={okruhFormData.typKabelu} onChange={(val) => setOkruhFormData({ ...okruhFormData, typKabelu: val })} options={TYPY_KABELU} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Počet žil (volitelné)" value={okruhFormData.pocetZil} onChange={(e) => setOkruhFormData({ ...okruhFormData, pocetZil: e.target.value })} placeholder="např. 3" />
          <EditableSelect label="Průřez (mm²)" value={okruhFormData.prurez} onChange={(val) => setOkruhFormData({ ...okruhFormData, prurez: val })} options={PRUREZY} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Izolační odpor (MΩ)" value={okruhFormData.izolacniOdpor} onChange={(e) => setOkruhFormData({ ...okruhFormData, izolacniOdpor: e.target.value })} />
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input label="Impedance smyčky (Ω)" value={okruhFormData.impedanceSmycky} onChange={(e) => setOkruhFormData({ ...okruhFormData, impedanceSmycky: e.target.value })} />
            </div>
            <label className="flex items-center gap-1.5 pb-2 cursor-pointer select-none">
              <input type="checkbox" checked={okruhFormData.impedanceSmyckyMax} onChange={(e) => setOkruhFormData({ ...okruhFormData, impedanceSmyckyMax: e.target.checked })} className="rounded border-[var(--checkbox-border)]" />
              <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">max.</span>
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
        <div className="border-t border-[var(--border-table)] pt-3">
          <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">Měřené hodnoty</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={!!cranicFormData.testovacitlacitko} onChange={(e) => setCranicFormData({ ...cranicFormData, testovacitlacitko: e.target.checked || undefined })} className="rounded border-[var(--checkbox-border)]" />
              <span>Testovací tlačítko ✓</span>
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={!!cranicFormData.nevybavovaci} onChange={(e) => setCranicFormData({ ...cranicFormData, nevybavovaci: e.target.checked || undefined })} className="rounded border-[var(--checkbox-border)]" />
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
                  <input type="checkbox" checked={!!cranicFormData.zkouskaVypnuti2x} onChange={(e) => setCranicFormData({ ...cranicFormData, zkouskaVypnuti2x: e.target.checked || undefined })} className="rounded border-[var(--checkbox-border)]" />
                  <span>Zkouška vypnutí 2×Iδn nárůstem proudu ✓</span>
                </label>
              </>
            )}
          </div>
          <div className="mt-3">
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={!!cranicFormData.selektivita} onChange={(e) => setCranicFormData({ ...cranicFormData, selektivita: e.target.checked || undefined })} className="rounded border-[var(--checkbox-border)]" />
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
