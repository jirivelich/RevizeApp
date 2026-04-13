import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Input, Select, Modal } from '../components/ui';
import { useOkruhyByRozvadec, useCreateOkruh, useUpdateOkruh, useDeleteOkruh, useCranicByRozvadec, useCreateChranic, useUpdateChranic, useDeleteChranic } from '../hooks/useQueries';
import { rozvadecService } from '../services/database';
import type { Okruh, Chranic } from '../types';

// EditableSelect – select s možností zadat vlastní hodnotu
function EditableSelect({ label, value, onChange, options }: {
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
      <label className="text-sm font-medium text-slate-400">{label}</label>
      {showCustom ? (
        <div className="relative">
          <input
            className="w-full px-3 py-2 pr-8 border rounded-lg bg-white/[0.04] text-slate-300 border-white/[0.09] focus:outline-none focus:ring-1 focus:ring-blue-500/[0.4] focus:border-blue-500/[0.5] text-xs"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
          />
          <button
            type="button"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
            onClick={() => { setShowCustom(false); }}
            title="Zpět na seznam"
          >↩</button>
        </div>
      ) : (
        <select
          className="w-full px-3 py-2 border rounded-lg bg-white/[0.04] text-slate-300 border-white/[0.09] focus:outline-none focus:ring-1 focus:ring-blue-500/[0.4] focus:border-blue-500/[0.5] text-xs"
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

export function RozvadecDetailPage() {
  const { id, revizeId } = useParams<{ id: string; revizeId: string }>();
  const navigate = useNavigate();
  const numericId = id ? parseInt(id) : undefined;

  const { data: rozvadec = null } = useQuery({
    queryKey: ['rozvadec', numericId],
    queryFn: () => rozvadecService.getById(numericId!),
    enabled: !!numericId,
  });

  const { data: okruhy = [] } = useOkruhyByRozvadec(numericId);
  const createOkruh = useCreateOkruh();
  const updateOkruh = useUpdateOkruh();
  const deleteOkruh = useDeleteOkruh();

  const { data: chranice = [] } = useCranicByRozvadec(numericId);
  const createChranic = useCreateChranic();
  const updateChranic = useUpdateChranic();
  const deleteChranic = useDeleteChranic();

  const [isOkruhModalOpen, setIsOkruhModalOpen] = useState(false);
  const [editingOkruh, setEditingOkruh] = useState<Okruh | null>(null);

  const [okruhFormData, setOkruhFormData] = useState({
    cislo: 1,
    nazev: '',
    jisticTyp: 'B',
    jisticProud: '16A',
    vodic: '3x2,5',
    pocetFazi: 1,
    izolacniOdpor: '',
    impedanceSmycky: '',
    impedanceSmyckyMax: false,
    poznamka: '',
  });

  const handleAddOkruh = (e: React.FormEvent) => {
    e.preventDefault();
    if (rozvadec?.id) {
      const { impedanceSmyckyMax, ...okruhData } = okruhFormData;
      const saveData = { ...okruhData, izolacniOdpor: okruhData.izolacniOdpor || undefined, impedanceSmycky: impedanceSmyckyMax && okruhData.impedanceSmycky ? `max. ${okruhData.impedanceSmycky}` : okruhData.impedanceSmycky || undefined };
      const onDone = () => { setIsOkruhModalOpen(false); setEditingOkruh(null); resetOkruhForm(); };
      if (editingOkruh?.id) {
        updateOkruh.mutate({ id: editingOkruh.id, data: { ...saveData, rozvadecId: rozvadec.id } }, { onSuccess: onDone });
      } else {
        createOkruh.mutate({ ...saveData, rozvadecId: rozvadec.id }, { onSuccess: onDone });
      }
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
      izolacniOdpor: '',
      impedanceSmycky: '',
      impedanceSmyckyMax: false,
      poznamka: '',
    });
  };

  const handleEditOkruh = (okruh: Okruh) => {
    setEditingOkruh(okruh);
    setOkruhFormData({
      cislo: okruh.cislo,
      nazev: okruh.nazev,
      jisticTyp: okruh.jisticTyp,
      jisticProud: okruh.jisticProud,
      pocetFazi: okruh.pocetFazi || 1,
      vodic: okruh.vodic || '',
      izolacniOdpor: okruh.izolacniOdpor || '',
      impedanceSmycky: okruh.impedanceSmycky?.replace(/^max\.\s*/, '') || '',
      impedanceSmyckyMax: okruh.impedanceSmycky?.startsWith('max.') || false,
      poznamka: okruh.poznamka || '',
    });
    setIsOkruhModalOpen(true);
  };

  const handleDeleteOkruh = (okruhId: number) => {
    if (window.confirm('Opravdu chcete smazat tento okruh?')) {
      deleteOkruh.mutate({ id: okruhId, rozvadecId: numericId! });
    }
  };

  const [isCranicModalOpen, setIsCranicModalOpen] = useState(false);
  const [editingChranic, setEditingChranic] = useState<Chranic | null>(null);
  const [cranicFormData, setCranicFormData] = useState({
    cislo: 1,
    nazev: '',
    typ: 'A',
    proud: '25A',
    citlivostMa: 30,
    pocetPolu: 2,
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

  const CHRANIC_EMPTY = {
    cislo: 1, nazev: '', typ: 'A', proud: '25A', citlivostMa: 30, pocetPolu: 2,
    testovacitlacitko: undefined, nevybavovaci: undefined, dotykoveNapeti: undefined,
    vybavovacProud: undefined, casOdpojeni1x: undefined, casOdpojeni5x: undefined,
    casOdpojeni1_4x: undefined, casOdpojeni2x: undefined, zkouskaVypnuti2x: undefined,
    selektivita: undefined, poznamka: '',
  };

  const resetCranicForm = () => {
    const nextCislo = chranice.length > 0 ? Math.max(...chranice.map(c => c.cislo)) + 1 : 1;
    setCranicFormData({ ...CHRANIC_EMPTY, cislo: nextCislo });
  };

  const handleAddChranic = (e: React.FormEvent) => {
    e.preventDefault();
    if (rozvadec?.id) {
      const onDone = () => { setIsCranicModalOpen(false); setEditingChranic(null); resetCranicForm(); };
      if (editingChranic?.id) {
        updateChranic.mutate({ id: editingChranic.id, data: { ...cranicFormData, rozvadecId: rozvadec.id } }, { onSuccess: onDone });
      } else {
        createChranic.mutate({ ...cranicFormData, rozvadecId: rozvadec.id }, { onSuccess: onDone });
      }
    }
  };

  const handleEditChranic = (c: Chranic) => {
    setEditingChranic(c);
    setCranicFormData({
      cislo: c.cislo,
      nazev: c.nazev,
      typ: c.typ,
      proud: c.proud,
      citlivostMa: c.citlivostMa,
      pocetPolu: c.pocetPolu,
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
    setIsCranicModalOpen(true);
  };

  const handleDeleteChranic = (cranicId: number) => {
    if (window.confirm('Opravdu chcete smazat tento chránič?')) {
      deleteChranic.mutate({ id: cranicId, rozvadecId: numericId! });
    }
  };

  if (!rozvadec) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Načítání...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-300">{rozvadec.nazev}</h1>
          <p className="text-xs text-slate-400">{rozvadec.oznaceni} • {rozvadec.umisteni}</p>
        </div>
        <Button variant="secondary" onClick={() => navigate(`/revize/${revizeId}`)}>
          ← Zpět na revizi
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-slate-400">Typ rozváděče</p>
          <p className="font-medium text-slate-300">{rozvadec.typRozvadece || '—'}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Stupeň krytí</p>
          <p className="font-medium text-slate-300">{rozvadec.stupenKryti}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Počet okruhů</p>
          <p className="font-medium text-slate-300">{okruhy.length}</p>
        </Card>
      </div>

      <Card
        title="Okruhy"
        actions={
          <Button size="sm" onClick={() => { resetOkruhForm(); setIsOkruhModalOpen(true); }}>
            <span className="sm:hidden text-base leading-none">+</span>
            <span className="hidden sm:inline">+ Přidat okruh</span>
          </Button>
        }
      >
        {okruhy.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left py-2 px-3 font-medium text-slate-400 text-sm">Č.</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-400 text-sm">Název</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-400 text-sm">Jistič</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-400 text-sm">Vodič</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-400 text-sm">Iz. odpor</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-400 text-sm">Imp. smyčky</th>
                  <th className="text-right py-2 px-3 font-medium text-slate-400 text-sm">Akce</th>
                </tr>
              </thead>
              <tbody>
                {[...okruhy].sort((a, b) => a.cislo - b.cislo).map((o) => (
                  <tr key={o.id} className="border-b border-white/[0.05] hover:bg-white/[0.04]">
                    <td className="py-2 px-3 font-medium text-slate-300">{o.cislo}</td>
                    <td className="py-2 px-3 text-slate-300">{o.nazev}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-white/[0.06] text-slate-400">
                        {o.jisticTyp}{o.jisticProud}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-400">{o.vodic}</td>
                    <td className="py-2 px-3 text-slate-400">
                      {o.izolacniOdpor || '—'}
                    </td>
                    <td className="py-2 px-3 text-slate-400">
                      {o.impedanceSmycky || '—'}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEditOkruh(o)}
                        >
                          Upravit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteOkruh(o.id!)}
                        >
                          ×
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-slate-500 py-8">
            Zatím žádné okruhy. Přidejte první kliknutím na tlačítko výše.
          </p>
        )}
      </Card>

      <Modal
        isOpen={isOkruhModalOpen}
        onClose={() => { setIsOkruhModalOpen(false); setEditingOkruh(null); }}
        title={editingOkruh ? 'Upravit okruh' : 'Přidat okruh'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setIsOkruhModalOpen(false); setEditingOkruh(null); }}>
              Zrušit
            </Button>
            <Button type="submit" form="okruh-form" disabled={createOkruh.isPending || updateOkruh.isPending}>
              {editingOkruh ? 'Uložit' : 'Přidat'}
            </Button>
          </>
        }
      >
        <form id="okruh-form" onSubmit={handleAddOkruh} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="number"
              label="Číslo okruhu"
              value={okruhFormData.cislo}
              onChange={(e) => setOkruhFormData({ ...okruhFormData, cislo: parseInt(e.target.value) || 1 })}
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
            <EditableSelect
              label="Typ jističe"
              value={okruhFormData.jisticTyp}
              onChange={(val) => setOkruhFormData({ ...okruhFormData, jisticTyp: val })}
              options={['B', 'C', 'D', 'gG', 'aM', 'IT', 'IJ', 'IJV', 'ITM']}
            />
            <EditableSelect
              label="Proud jističe"
              value={okruhFormData.jisticProud}
              onChange={(val) => setOkruhFormData({ ...okruhFormData, jisticProud: val })}
              options={['2A','4A','6A','10A','13A','16A','20A','25A','32A','40A','50A','63A','80A','100A','125A','160A']}
            />
            <Input
              label="Vodič"
              value={okruhFormData.vodic}
              onChange={(e) => setOkruhFormData({ ...okruhFormData, vodic: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Select
              label="Počet fází"
              value={String(okruhFormData.pocetFazi)}
              onChange={(e) => setOkruhFormData({ ...okruhFormData, pocetFazi: parseInt(e.target.value) })}
              options={[
                { value: '1', label: '1' },
                { value: '3', label: '3' },
              ]}
            />
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
                <input type="checkbox" checked={okruhFormData.impedanceSmyckyMax} onChange={(e) => setOkruhFormData({ ...okruhFormData, impedanceSmyckyMax: e.target.checked })} className="rounded border-white/[0.20]" />
                <span className="text-xs text-slate-400 whitespace-nowrap">max.</span>
              </label>
            </div>
          </div>
          <Input
            label="Poznámka"
            value={okruhFormData.poznamka}
            onChange={(e) => setOkruhFormData({ ...okruhFormData, poznamka: e.target.value })}
          />
        </form>
      </Modal>

      {/* ===== CHRANIČE ===== */}
      <Card
        title="Proudové chraniče"
        actions={
          <Button size="sm" onClick={() => { resetCranicForm(); setIsCranicModalOpen(true); }}>
            <span className="sm:hidden text-base leading-none">+</span>
            <span className="hidden sm:inline">+ Přidat chránič</span>
          </Button>
        }
      >
        {chranice.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left py-2 px-3 font-medium text-slate-400 text-sm">Č.</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-400 text-sm">Název</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-400 text-sm">Typ</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-400 text-sm">Proud</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-400 text-sm">IΔn [mA]</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-400 text-sm">Pólů</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-400 text-sm">IΔ [mA]</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-400 text-sm">tA 1× [ms]</th>
                  <th className="text-right py-2 px-3 font-medium text-slate-400 text-sm">Akce</th>
                </tr>
              </thead>
              <tbody>
                {[...chranice].sort((a, b) => a.cislo - b.cislo).map((c) => (
                  <tr key={c.id} className="border-b border-white/[0.05] hover:bg-white/[0.04]">
                    <td className="py-2 px-3 font-medium text-slate-300">{c.cislo}</td>
                    <td className="py-2 px-3 text-slate-300">{c.nazev}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/[0.15] text-blue-300">
                        {c.typ}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-400">{c.proud}</td>
                    <td className="py-2 px-3 text-slate-400">{c.citlivostMa}</td>
                    <td className="py-2 px-3 text-slate-400">{c.pocetPolu}</td>
                    <td className="py-2 px-3 text-slate-400">{c.vybavovacProud != null ? c.vybavovacProud : '—'}</td>
                    <td className="py-2 px-3 text-slate-400">{c.casOdpojeni1x != null ? c.casOdpojeni1x : '—'}</td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="secondary" size="sm" onClick={() => handleEditChranic(c)}>Upravit</Button>
                        <Button variant="danger" size="sm" onClick={() => handleDeleteChranic(c.id!)}>×</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-slate-500 py-8">
            Zatím žádné chraniče. Přidejte první kliknutím na tlačítko výše.
          </p>
        )}
      </Card>

      <Modal
        isOpen={isCranicModalOpen}
        onClose={() => { setIsCranicModalOpen(false); setEditingChranic(null); }}
        title={editingChranic ? 'Upravit chránič' : 'Přidat chránič'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setIsCranicModalOpen(false); setEditingChranic(null); }}>
              Zrušit
            </Button>
            <Button type="submit" form="chranic-form" disabled={createChranic.isPending || updateChranic.isPending}>
              {editingChranic ? 'Uložit' : 'Přidat'}
            </Button>
          </>
        }
      >
        <form id="chranic-form" onSubmit={handleAddChranic} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="number"
              label="Číslo"
              value={cranicFormData.cislo}
              onChange={(e) => setCranicFormData({ ...cranicFormData, cislo: parseInt(e.target.value) || 1 })}
              required
            />
            <Input
              label="Název"
              value={cranicFormData.nazev}
              onChange={(e) => setCranicFormData({ ...cranicFormData, nazev: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <EditableSelect
              label="Typ chrániče"
              value={cranicFormData.typ}
              onChange={(val) => setCranicFormData({ ...cranicFormData, typ: val })}
              options={['A', 'AC', 'B', 'F', 'G']}
            />
            <EditableSelect
              label="Jmenovitý proud"
              value={cranicFormData.proud}
              onChange={(val) => setCranicFormData({ ...cranicFormData, proud: val })}
              options={['10A', '16A', '20A', '25A', '32A', '40A', '63A']}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Select
              label="Citlivost IΔn (mA)"
              value={String(cranicFormData.citlivostMa)}
              onChange={(e) => setCranicFormData({ ...cranicFormData, citlivostMa: parseFloat(e.target.value) })}
              options={[
                { value: '10', label: '10 mA' },
                { value: '30', label: '30 mA' },
                { value: '100', label: '100 mA' },
                { value: '300', label: '300 mA' },
                { value: '500', label: '500 mA' },
              ]}
            />
            <Select
              label="Počet pólů"
              value={String(cranicFormData.pocetPolu)}
              onChange={(e) => setCranicFormData({ ...cranicFormData, pocetPolu: parseInt(e.target.value) })}
              options={[
                { value: '2', label: '2' },
                { value: '4', label: '4' },
              ]}
            />
          </div>

          {/* Měřené hodnoty – společné pro všechny typy */}
          <div className="border-t border-white/[0.06] pt-3">
            <p className="text-xs font-medium text-slate-400 mb-3">Měřené hodnoty</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox"
                  checked={!!cranicFormData.testovacitlacitko}
                  onChange={(e) => setCranicFormData({ ...cranicFormData, testovacitlacitko: e.target.checked || undefined })}
                  className="rounded border-white/[0.20]" />
                <span>Testovací tlačítko ✓</span>
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox"
                  checked={!!cranicFormData.nevybavovaci}
                  onChange={(e) => setCranicFormData({ ...cranicFormData, nevybavovaci: e.target.checked || undefined })}
                  className="rounded border-white/[0.20]" />
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
              {/* AC a A: tA při 5×IΔn */}
              {['AC', 'A'].includes(cranicFormData.typ) && (
                <Input type="number" step="1" label="Čas odpojení tA při 5×IΔn [ms]"
                  value={cranicFormData.casOdpojeni5x ?? ''}
                  onChange={(e) => setCranicFormData({ ...cranicFormData, casOdpojeni5x: e.target.value ? parseFloat(e.target.value) : undefined })} />
              )}
              {/* F: tA při 1,4× a 2× */}
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
                      className="rounded border-white/[0.20]" />
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
                  className="rounded border-white/[0.20]" />
                <span>Selektivita (typ S/G) ✓</span>
              </label>
            </div>
          </div>
          <Input
            label="Poznámka"
            value={cranicFormData.poznamka}
            onChange={(e) => setCranicFormData({ ...cranicFormData, poznamka: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
}
