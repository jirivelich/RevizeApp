import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Modal } from '../../components/ui';
import { useRevize, useZakazky, useCreateZakazka, useUpdateZakazka, useDeleteZakazka, useCreateRevize } from '../../hooks/useQueries';
import type { Zakazka, KategorieRevize } from '../../types';
import { emptyFormData, zakazkaToFormData } from './utils';
import type { ZakazkaFormData } from './utils';
import { ListView } from './ListView';
import { CalendarView } from './CalendarView';
import { WeekView } from './WeekView';
import { ZakazkaForm } from './ZakazkaForm';

// Definice kategorií - sdílená s RevizePage
const KATEGORIE_REVIZE: { value: KategorieRevize; label: string; popis: string; icon: React.ReactNode }[] = [
  {
    value: 'elektro',
    label: 'Elektrické instalace',
    popis: 'ČSN 33 1500, ČSN 33 2000-6',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    value: 'hromosvod',
    label: 'Hromosvody',
    popis: 'ČSN EN 62305',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    value: 'stroje',
    label: 'Strojní zařízení',
    popis: 'Pohony a mechanické systémy',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function PlanovaniPage() {
  const { data: zakazky = [] } = useZakazky();
  const { data: revize = [] } = useRevize();
  const createZakazka = useCreateZakazka();
  const updateZakazka = useUpdateZakazka();
  const deleteZakazka = useDeleteZakazka();
  const createRevizeMutation = useCreateRevize();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStav, setFilterStav] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'week'>('list');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ZakazkaFormData>({ ...emptyFormData });

  // === Stav pro výběr kategorie při vytváření revize ze zakázky ===
  const [kategoriePickerOpen, setKategoriePickerOpen] = useState(false);
  const [pendingZakazka, setPendingZakazka] = useState<Zakazka | null>(null);
  const navigate = useNavigate();

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

  const handleSubmit = (data: ZakazkaFormData) => {
    const onSuccess = () => {
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ ...emptyFormData });
    };
    if (editingId) {
      updateZakazka.mutate({
        id: editingId,
        data: {
          ...data,
          datumDokonceni: data.stav === 'dokončeno' ? new Date().toISOString().split('T')[0] : undefined,
        },
      }, { onSuccess });
    } else {
      createZakazka.mutate(data, { onSuccess });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ ...emptyFormData });
  };

  // === Status update ===
  const handleUpdateStav = (id: number, stav: Zakazka['stav']) => {
    updateZakazka.mutate({
      id,
      data: {
        stav,
        datumDokonceni: stav === 'dokončeno' ? new Date().toISOString().split('T')[0] : undefined,
      },
    });
  };

  // === Create Revize from Zakazka ===
  // Krok 1: Otevře picker kategorie
  const handleCreateRevize = (z: Zakazka) => {
    setPendingZakazka(z);
    setKategoriePickerOpen(true);
  };

  // Krok 2: Po výběru kategorie vytvoří revizi
  const handleKategorieSelected = async (kategorie: KategorieRevize) => {
    if (!pendingZakazka) return;
    const z = pendingZakazka;
    setKategoriePickerOpen(false);
    setPendingZakazka(null);

    const today = new Date().toISOString().split('T')[0];
    const cislo = `REV-${Date.now().toString().slice(-6)}`;
    try {
      const revizeId = await createRevizeMutation.mutateAsync({
        cisloRevize: cislo,
        nazev: z.nazev,
        adresa: z.adresa,
        objednatel: z.klient,
        kategorieRevize: kategorie,
        datum: today,
        termin: 60,
        typRevize: 'pravidelná',
        stav: 'rozpracováno',
      });
      // Propojit zakázku s revizí
      await updateZakazka.mutateAsync({ id: z.id!, data: { revizeId } });
      navigate(`/revize/${revizeId}`);
    } catch (err) {
      console.error('Chyba při vytváření revize:', err);
      alert('Nepodařilo se vytvořit revizní zprávu.');
    }
  };

  // === Move zakazka (drag-and-drop in week view) ===
  const handleMoveZakazka = (zakazkaId: number, newDate: string, newCas: string) => {
    updateZakazka.mutate({
      id: zakazkaId,
      data: {
        datumPlanovany: newDate,
        casPlanovany: newCas,
      },
    });
  };

  // === Delete ===
  const handleDelete = (id: number) => {
    if (window.confirm('Opravdu chcete smazat tuto zakázku?')) {
      deleteZakazka.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[var(--text)]">Plánování</h1>
          <p className="text-xs text-[var(--text-secondary)]">Správa zakázek a plánování revizí</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg overflow-hidden border border-[var(--border-input)]">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-slate-700 text-white'
                  : 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
              }`}
            >
              Seznam
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-slate-700 text-white'
                  : 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
              }`}
            >
              Týden
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-slate-700 text-white'
                  : 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
              }`}
            >
              Měsíc
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

      {/* Modal pro výběr kategorie revize */}
      <Modal
        isOpen={kategoriePickerOpen}
        onClose={() => { setKategoriePickerOpen(false); setPendingZakazka(null); }}
        title="Vyberte kategorii revize"
        footer={
          <Button variant="secondary" onClick={() => { setKategoriePickerOpen(false); setPendingZakazka(null); }}>
            Zrušit
          </Button>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-muted)]">
            Zvolte typ revize pro zakázku <strong>{pendingZakazka?.nazev}</strong>. Kategorie určuje strukturu formuláře i výsledné zprávy.
          </p>
          <div className="grid grid-cols-1 gap-3">
            {KATEGORIE_REVIZE.map((kat) => (
              <button
                key={kat.value}
                type="button"
                onClick={() => handleKategorieSelected(kat.value)}
                className="flex items-center gap-4 p-4 rounded-lg border-2 border-[var(--border-medium)] hover:border-[var(--checkbox-border)] hover:bg-[var(--bg-input)] transition-all text-left group"
              >
                <div className="flex-shrink-0 text-[var(--text-secondary)] group-hover:text-[var(--text)] transition-colors">
                  {kat.icon}
                </div>
                <div>
                  <p className="font-semibold text-[var(--text)] group-hover:text-white">{kat.label}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{kat.popis}</p>
                </div>
                <div className="flex-shrink-0 ml-auto text-[var(--text)] group-hover:text-[var(--text-muted)]">
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
