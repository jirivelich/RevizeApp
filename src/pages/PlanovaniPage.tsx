import { useEffect, useState } from 'react';
import { Button, Card, Input, Select, Modal } from '../components/ui';
import { zakazkaService, revizeService } from '../services/database';
import type { Zakazka, Revize } from '../types';

export function PlanovaniPage() {
  const [zakazky, setZakazky] = useState<Zakazka[]>([]);
  const [revize, setRevize] = useState<Revize[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStav, setFilterStav] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  const [formData, setFormData] = useState({
    nazev: '',
    klient: '',
    adresa: '',
    datumPlanovany: new Date().toISOString().split('T')[0],
    stav: 'plánováno' as const,
    priorita: 'střední' as const,
    revizeId: undefined as number | undefined,
    poznamka: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setZakazky(await zakazkaService.getAll());
    setRevize(await revizeService.getAll());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await zakazkaService.create(formData);
    setIsModalOpen(false);
    resetForm();
    loadData();
  };

  const resetForm = () => {
    setFormData({
      nazev: '',
      klient: '',
      adresa: '',
      datumPlanovany: new Date().toISOString().split('T')[0],
      stav: 'plánováno',
      priorita: 'střední',
      revizeId: undefined,
      poznamka: '',
    });
  };

  const handleUpdateStav = async (id: number, stav: Zakazka['stav']) => {
    await zakazkaService.update(id, { 
      stav,
      datumDokonceni: stav === 'dokončeno' ? new Date().toISOString().split('T')[0] : undefined
    });
    loadData();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Opravdu chcete smazat tuto zakázku?')) {
      await zakazkaService.delete(id);
      loadData();
    }
  };

  const filteredZakazky = zakazky.filter(z => {
    return !filterStav || z.stav === filterStav;
  }).sort((a, b) => new Date(a.datumPlanovany).getTime() - new Date(b.datumPlanovany).getTime());

  const getStatusColor = (stav: Zakazka['stav']) => {
    switch (stav) {
      case 'plánováno': return 'bg-blue-100 text-blue-700';
      case 'v realizaci': return 'bg-amber-100 text-amber-700';
      case 'dokončeno': return 'bg-green-100 text-green-700';
      case 'zrušeno': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getPriorityColor = (priorita: Zakazka['priorita']) => {
    switch (priorita) {
      case 'vysoká': return 'bg-red-100 text-red-700';
      case 'střední': return 'bg-amber-100 text-amber-700';
      case 'nizká': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  // Kalendářní pohled
  const renderCalendar = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayZakazky = zakazky.filter(z => z.datumPlanovany === dateStr);
      
      days.push(
        <div
          key={day}
          className={`p-2 min-h-[80px] border border-slate-200 ${
            day === today.getDate() ? 'bg-blue-50' : 'bg-white'
          }`}
        >
          <span className={`text-sm font-medium ${
            day === today.getDate() ? 'text-blue-600' : 'text-slate-600'
          }`}>
            {day}
          </span>
          <div className="mt-1 space-y-1">
            {dayZakazky.map((z) => (
              <div
                key={z.id}
                className={`text-xs p-1 rounded truncate ${getPriorityColor(z.priorita)}`}
                title={z.nazev}
              >
                {z.nazev}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-7 gap-0">
        {['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'].map((den) => (
          <div key={den} className="p-2 text-center font-medium text-slate-600 bg-slate-50">
            {den}
          </div>
        ))}
        {days}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Plánování</h1>
          <p className="text-slate-500">Správa zakázek a plánování revizí</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg overflow-hidden border border-slate-200">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 text-sm font-medium ${
                viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'
              }`}
            >
              📋 Seznam
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 text-sm font-medium ${
                viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'
              }`}
            >
              📅 Kalendář
            </button>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            + Nová zakázka
          </Button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <Card title={`${new Date().toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })}`}>
          {renderCalendar()}
        </Card>
      ) : (
        <Card>
          <div className="flex gap-4 mb-4">
            <Select
              value={filterStav}
              onChange={(e) => setFilterStav(e.target.value)}
              options={[
                { value: '', label: 'Všechny stavy' },
                { value: 'plánováno', label: 'Plánováno' },
                { value: 'v realizaci', label: 'V realizaci' },
                { value: 'dokončeno', label: 'Dokončeno' },
                { value: 'zrušeno', label: 'Zrušeno' },
              ]}
            />
          </div>

          {filteredZakazky.length > 0 ? (
            <div className="space-y-4">
              {filteredZakazky.map((z) => (
                <div
                  key={z.id}
                  className="p-4 rounded-lg bg-slate-50 border border-slate-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(z.stav)}`}>
                          {z.stav}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(z.priorita)}`}>
                          {z.priorita} priorita
                        </span>
                      </div>
                      <p className="font-medium mb-1">{z.nazev}</p>
                      <p className="text-sm text-slate-500">
                        Klient: {z.klient} • {z.adresa}
                      </p>
                      <p className="text-sm text-slate-500">
                        📅 Plánováno: {new Date(z.datumPlanovany).toLocaleDateString('cs-CZ')}
                        {z.datumDokonceni && ` • Dokončeno: ${new Date(z.datumDokonceni).toLocaleDateString('cs-CZ')}`}
                      </p>
                      {z.poznamka && (
                        <p className="text-sm text-slate-600 mt-2">{z.poznamka}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      {z.stav !== 'dokončeno' && z.stav !== 'zrušeno' && (
                        <Select
                          value={z.stav}
                          onChange={(e) => handleUpdateStav(z.id!, e.target.value as Zakazka['stav'])}
                          options={[
                            { value: 'plánováno', label: 'Plánováno' },
                            { value: 'v realizaci', label: 'V realizaci' },
                            { value: 'dokončeno', label: 'Dokončeno' },
                            { value: 'zrušeno', label: 'Zrušeno' },
                          ]}
                          className="text-sm"
                        />
                      )}
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(z.id!)}
                      >
                        Smazat
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-500 py-8">
              {filterStav
                ? 'Žádné zakázky neodpovídají filtru.'
                : 'Zatím žádné zakázky. Přidejte první kliknutím na tlačítko výše.'}
            </p>
          )}
        </Card>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nová zakázka"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={handleSubmit}>
              Vytvořit
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Název zakázky"
            value={formData.nazev}
            onChange={(e) => setFormData({ ...formData, nazev: e.target.value })}
            required
          />
          <Input
            label="Klient"
            value={formData.klient}
            onChange={(e) => setFormData({ ...formData, klient: e.target.value })}
            required
          />
          <Input
            label="Adresa"
            value={formData.adresa}
            onChange={(e) => setFormData({ ...formData, adresa: e.target.value })}
            required
          />
          <Input
            type="date"
            label="Plánované datum"
            value={formData.datumPlanovany}
            onChange={(e) => setFormData({ ...formData, datumPlanovany: e.target.value })}
            required
          />
          <Select
            label="Priorita"
            value={formData.priorita}
            onChange={(e) => setFormData({ ...formData, priorita: e.target.value as any })}
            options={[
              { value: 'nizká', label: 'Nízká' },
              { value: 'střední', label: 'Střední' },
              { value: 'vysoká', label: 'Vysoká' },
            ]}
          />
          <Select
            label="Propojit s revizí (volitelné)"
            value={formData.revizeId?.toString() || ''}
            onChange={(e) => setFormData({ 
              ...formData, 
              revizeId: e.target.value ? parseInt(e.target.value) : undefined 
            })}
            options={[
              { value: '', label: '-- Bez propojení --' },
              ...revize.map(r => ({
                value: r.id!.toString(),
                label: `${r.cisloRevize} - ${r.nazev}`
              }))
            ]}
          />
          <Input
            label="Poznámka"
            value={formData.poznamka}
            onChange={(e) => setFormData({ ...formData, poznamka: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
}
