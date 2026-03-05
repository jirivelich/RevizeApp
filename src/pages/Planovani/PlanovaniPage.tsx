import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui';
import { zakazkaService, revizeService } from '../../services/database';
import type { Zakazka, Revize } from '../../types';
import { emptyFormData, zakazkaToFormData } from './utils';
import type { ZakazkaFormData } from './utils';
import { ListView } from './ListView';
import { CalendarView } from './CalendarView';
import { WeekView } from './WeekView';
import { ZakazkaForm } from './ZakazkaForm';

export function PlanovaniPage() {
  const [zakazky, setZakazky] = useState<Zakazka[]>([]);
  const [revize, setRevize] = useState<Revize[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStav, setFilterStav] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'week'>('list');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ZakazkaFormData>({ ...emptyFormData });
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    const [z, r] = await Promise.all([
      zakazkaService.getAll(),
      revizeService.getAll(),
    ]);
    setZakazky(z);
    setRevize(r);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // === Create / Edit ===
  const openCreate = (defaultDate?: string) => {
    setEditingId(null);
    setFormData({
      ...emptyFormData,
      datumPlanovany: defaultDate || new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const openEdit = (z: Zakazka) => {
    setEditingId(z.id!);
    setFormData(zakazkaToFormData(z));
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: ZakazkaFormData) => {
    if (editingId) {
      await zakazkaService.update(editingId, {
        ...data,
        datumDokonceni: data.stav === 'dokončeno' ? new Date().toISOString().split('T')[0] : undefined,
      });
    } else {
      await zakazkaService.create(data);
    }
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ ...emptyFormData });
    loadData();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ ...emptyFormData });
  };

  // === Status update ===
  const handleUpdateStav = async (id: number, stav: Zakazka['stav']) => {
    await zakazkaService.update(id, {
      stav,
      datumDokonceni: stav === 'dokončeno' ? new Date().toISOString().split('T')[0] : undefined,
    });
    loadData();
  };

  // === Create Revize from Zakazka ===
  const handleCreateRevize = async (z: Zakazka) => {
    const today = new Date().toISOString().split('T')[0];
    const cislo = `REV-${Date.now().toString().slice(-6)}`;
    try {
      const revizeId = await revizeService.create({
        cisloRevize: cislo,
        nazev: z.nazev,
        adresa: z.adresa,
        objednatel: z.klient,
        kategorieRevize: 'elektro',
        datum: today,
        termin: 60,
        typRevize: 'pravidelná',
        stav: 'rozpracováno',
      });
      // Propojit zakázku s revizí
      await zakazkaService.update(z.id!, { revizeId });
      navigate(`/revize/${revizeId}`);
    } catch (err) {
      console.error('Chyba při vytváření revize:', err);
      alert('Nepodařilo se vytvořit revizní zprávu.');
    }
  };

  // === Move zakazka (drag-and-drop in week view) ===
  const handleMoveZakazka = async (zakazkaId: number, newDate: string, newCas: string) => {
    await zakazkaService.update(zakazkaId, {
      datumPlanovany: newDate,
      casPlanovany: newCas,
    });
    loadData();
  };

  // === Delete ===
  const handleDelete = async (id: number) => {
    if (window.confirm('Opravdu chcete smazat tuto zakázku?')) {
      await zakazkaService.delete(id);
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Plánování</h1>
          <p className="text-slate-500">Správa zakázek a plánování revizí</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg overflow-hidden border border-slate-200">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              📋 Seznam
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              📅 Týden
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              🗓️ Měsíc
            </button>
          </div>
          <Button onClick={() => openCreate()}>+ Nová zakázka</Button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'week' ? (
        <WeekView
          zakazky={zakazky}
          onZakazkaClick={(z) => openEdit(z)}
          onSlotClick={(dateStr, cas) => {
            setEditingId(null);
            setFormData({
              ...emptyFormData,
              datumPlanovany: dateStr,
              casPlanovany: cas,
            });
            setIsModalOpen(true);
          }}
          onMove={handleMoveZakazka}
        />
      ) : viewMode === 'calendar' ? (
        <CalendarView
          zakazky={zakazky}
          onDayClick={(dateStr) => openCreate(dateStr)}
          onZakazkaClick={(z) => openEdit(z)}
        />
      ) : (
        <ListView
          zakazky={zakazky}
          filterStav={filterStav}
          onFilterChange={setFilterStav}
          onEdit={openEdit}
          onUpdateStav={handleUpdateStav}
          onDelete={handleDelete}
          onCreateRevize={handleCreateRevize}
        />
      )}

      {/* Modal pro vytvoření / editaci */}
      <ZakazkaForm
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        formData={formData}
        setFormData={setFormData}
        revize={revize}
        isEditing={editingId !== null}
      />
    </div>
  );
}
