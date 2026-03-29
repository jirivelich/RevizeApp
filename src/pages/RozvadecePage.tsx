import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Input, Select, Modal } from '../components/ui';
import { useOkruhyByRozvadec, useCreateOkruh, useUpdateOkruh, useDeleteOkruh } from '../hooks/useQueries';
import { rozvadecService } from '../services/database';
import type { Okruh } from '../types';

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

  const [isOkruhModalOpen, setIsOkruhModalOpen] = useState(false);
  const [editingOkruh, setEditingOkruh] = useState<Okruh | null>(null);

  const [okruhFormData, setOkruhFormData] = useState({
    cislo: 1,
    nazev: '',
    jisticTyp: 'B',
    jisticProud: '16A',
    vodic: '3x2,5',
    pocetFazi: 1,
    izolacniOdpor: undefined as number | undefined,
    impedanceSmycky: undefined as number | undefined,
    proudovyChranicMa: undefined as number | undefined,
    casOdpojeni: undefined as number | undefined,
    poznamka: '',
  });

  const handleAddOkruh = (e: React.FormEvent) => {
    e.preventDefault();
    if (rozvadec?.id) {
      const onDone = () => { setIsOkruhModalOpen(false); setEditingOkruh(null); resetOkruhForm(); };
      if (editingOkruh?.id) {
        updateOkruh.mutate({ id: editingOkruh.id, data: { ...okruhFormData, rozvadecId: rozvadec.id } }, { onSuccess: onDone });
      } else {
        createOkruh.mutate({ ...okruhFormData, rozvadecId: rozvadec.id }, { onSuccess: onDone });
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
      izolacniOdpor: undefined,
      impedanceSmycky: undefined,
      proudovyChranicMa: undefined,
      casOdpojeni: undefined,
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
      vodic: okruh.vodic,
      izolacniOdpor: okruh.izolacniOdpor,
      impedanceSmycky: okruh.impedanceSmycky,
      proudovyChranicMa: okruh.proudovyChranicMa,
      casOdpojeni: okruh.casOdpojeni,
      poznamka: okruh.poznamka || '',
    });
    setIsOkruhModalOpen(true);
  };

  const handleDeleteOkruh = (okruhId: number) => {
    if (window.confirm('Opravdu chcete smazat tento okruh?')) {
      deleteOkruh.mutate({ id: okruhId, rozvadecId: numericId! });
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
          <h1 className="text-lg font-bold text-slate-800">{rozvadec.nazev}</h1>
          <p className="text-xs text-slate-400">{rozvadec.oznaceni} • {rozvadec.umisteni}</p>
        </div>
        <Button variant="secondary" onClick={() => navigate(`/revize/${revizeId}`)}>
          ← Zpět na revizi
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-slate-500">Typ rozvaděče</p>
          <p className="font-medium">{rozvadec.typRozvadece || '—'}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Stupeň krytí</p>
          <p className="font-medium">{rozvadec.stupenKryti}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Počet okruhů</p>
          <p className="font-medium">{okruhy.length}</p>
        </Card>
      </div>

      <Card
        title="Okruhy"
        actions={
          <Button size="sm" onClick={() => { resetOkruhForm(); setIsOkruhModalOpen(true); }}>
            + Přidat okruh
          </Button>
        }
      >
        {okruhy.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 font-medium text-slate-600 text-sm">Č.</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-600 text-sm">Název</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-600 text-sm">Jistič</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-600 text-sm">Vodič</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-600 text-sm">Iz. odpor</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-600 text-sm">Imp. smyčky</th>
                  <th className="text-right py-2 px-3 font-medium text-slate-600 text-sm">Akce</th>
                </tr>
              </thead>
              <tbody>
                {okruhy.sort((a, b) => a.cislo - b.cislo).map((o) => (
                  <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-3 font-medium">{o.cislo}</td>
                    <td className="py-2 px-3">{o.nazev}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100">
                        {o.jisticTyp}{o.jisticProud}
                      </span>
                    </td>
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
            <Input
              label="Typ jističe"
              value={okruhFormData.jisticTyp}
              onChange={(e) => setOkruhFormData({ ...okruhFormData, jisticTyp: e.target.value })}
              placeholder="B, C, D, ..."
              list="jistic-typ-list"
            />
            <Input
              label="Proud jističe"
              value={okruhFormData.jisticProud}
              onChange={(e) => setOkruhFormData({ ...okruhFormData, jisticProud: e.target.value })}
              placeholder="16A, 25A, ..."
              list="jistic-proud-list"
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
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="number"
              label="Proudový chránič (mA)"
              value={okruhFormData.proudovyChranicMa || ''}
              onChange={(e) => setOkruhFormData({ ...okruhFormData, proudovyChranicMa: e.target.value ? parseFloat(e.target.value) : undefined })}
            />
            <Input
              type="number"
              step="0.01"
              label="Čas odpojení (s)"
              value={okruhFormData.casOdpojeni || ''}
              onChange={(e) => setOkruhFormData({ ...okruhFormData, casOdpojeni: e.target.value ? parseFloat(e.target.value) : undefined })}
            />
          </div>
          <Input
            label="Poznámka"
            value={okruhFormData.poznamka}
            onChange={(e) => setOkruhFormData({ ...okruhFormData, poznamka: e.target.value })}
          />
        </form>
        <datalist id="jistic-typ-list">
          <option value="B" /><option value="C" /><option value="D" />
          <option value="gG" /><option value="aM" />
          <option value="IT" /><option value="IJ" /><option value="IJV" /><option value="ITM" />
        </datalist>
        <datalist id="jistic-proud-list">
          <option value="2A" /><option value="4A" /><option value="6A" /><option value="10A" />
          <option value="13A" /><option value="16A" /><option value="20A" /><option value="25A" />
          <option value="32A" /><option value="40A" /><option value="50A" /><option value="63A" />
          <option value="80A" /><option value="100A" /><option value="125A" /><option value="160A" />
        </datalist>
      </Modal>
    </div>
  );
}
