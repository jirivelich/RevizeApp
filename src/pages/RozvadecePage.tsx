import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Input, Select, Modal } from '../components/ui';
import { rozvadecService, okruhService } from '../services/database';
import type { Rozvadec, Okruh } from '../types';

export function RozvadecDetailPage() {
  const { id, revizeId } = useParams<{ id: string; revizeId: string }>();
  const navigate = useNavigate();
  const [rozvadec, setRozvadec] = useState<Rozvadec | null>(null);
  const [okruhy, setOkruhy] = useState<Okruh[]>([]);
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

  useEffect(() => {
    if (id) {
      loadData(parseInt(id));
    }
  }, [id]);

  const loadData = async (rozvadecId: number) => {
    const rozvadecData = await rozvadecService.getById(rozvadecId);
    if (rozvadecData) {
      setRozvadec(rozvadecData);
      setOkruhy(await okruhService.getByRozvadec(rozvadecId));
    }
  };

  const handleAddOkruh = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rozvadec?.id) {
      if (editingOkruh?.id) {
        await okruhService.update(editingOkruh.id, okruhFormData);
      } else {
        await okruhService.create({
          ...okruhFormData,
          rozvadecId: rozvadec.id,
        });
      }
      setIsOkruhModalOpen(false);
      setEditingOkruh(null);
      resetOkruhForm();
      loadData(rozvadec.id);
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

  const handleDeleteOkruh = async (okruhId: number) => {
    if (window.confirm('Opravdu chcete smazat tento okruh?')) {
      await okruhService.delete(okruhId);
      if (rozvadec?.id) loadData(rozvadec.id);
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
          <h1 className="text-2xl font-bold text-slate-800">{rozvadec.nazev}</h1>
          <p className="text-slate-500">{rozvadec.oznaceni} • {rozvadec.umisteni}</p>
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
                          ✏️
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteOkruh(o.id!)}
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
    </div>
  );
}
