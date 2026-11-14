import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Modal, ConfirmDialog, PageHeader } from '../../components/ui';
import { useRevize, useZakazky, useCreateZakazka, useUpdateZakazka, useDeleteZakazka, useCreateRevize, useZakaznici } from '../../hooks/useQueries';
import type { Zakazka, KategorieRevize } from '../../types';
import { emptyFormData, zakazkaToFormData, formDataToZakazka } from './utils';
import { moveZakazka, toDateStr, parseTime } from './model';
import type { PlanProps } from './shared';
import { useIsMobile } from './hooks';
import type { ZakazkaFormData } from './utils';
import { ListView } from './ListView';
import { CalendarView } from './CalendarView';
import { WeekView } from './WeekView';
import { ZakazkaForm } from './ZakazkaForm';
import { googleCalendarService } from '../../services/googleCalendar';

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
  {
    value: 'odberne_misto',
    label: 'Odběrné místo (ČEZ)',
    popis: 'Elektroměrový rozvaděč, smlouva, tarif',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <circle cx="12" cy="10" r="3.5" />
        <path d="M9 17h6" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function PlanovaniPage() {
  const { data: zakazky = [] } = useZakazky();
  const { data: revize = [] } = useRevize();
  const { data: zakaznici = [] } = useZakaznici();
  const createZakazka = useCreateZakazka();
  const updateZakazka = useUpdateZakazka();
  const deleteZakazka = useDeleteZakazka();
  const createRevizeMutation = useCreateRevize();
  const isMobile = useIsMobile();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewModeState] = useState<ViewMode>(readView);
  const setViewMode = (v: ViewMode) => {
    setViewModeState(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* ignore */ }
  };
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ZakazkaFormData>({ ...emptyFormData });

  // === Stav pro výběr kategorie při vytváření revize ze zakázky ===
  const [kategoriePickerOpen, setKategoriePickerOpen] = useState(false);
  const [pendingZakazka, setPendingZakazka] = useState<Zakazka | null>(null);
  const navigate = useNavigate();

  // === Google Calendar sync ===
  const [gcSyncing, setGcSyncing] = useState(false);
  const [gcMessage, setGcMessage] = useState<string | null>(null);
  const [revizeError, setRevizeError] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  // === „Vrátit“ po dokončení zakázky ===
  const [undo, setUndo] = useState<{ z: Zakazka; text: string } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); }, []);

  const today = toDateStr(new Date());
  const revizeById = useMemo(() => new Map(revize.filter(r => r.id != null).map(r => [r.id!, r])), [revize]);
  const zakazniciById = useMemo(() => new Map(zakaznici.filter(z => z.id != null).map(z => [z.id!, z])), [zakaznici]);

  const onMutationError = useCallback((err: unknown) => {
    setMutationError((err as Error)?.message || 'Operace se nezdařila. Zkuste to prosím znovu.');
    setTimeout(() => setMutationError(null), 5000);
  }, []);

  const handleGcSync = async () => {
    setGcSyncing(true);
    setGcMessage(null);
    try {
      const result = await googleCalendarService.sync();
      setGcMessage(`✅ Synchronizováno: ${result.created} nových, ${result.updated} aktualizováno.`);
    } catch (err) {
      setGcMessage(`❌ ${(err as Error).message}`);
    }
    setGcSyncing(false);
    setTimeout(() => setGcMessage(null), 5000);
  };

  // === Create / Edit ===
  const openCreate = (defaultDate?: string, time?: string) => {
    setEditingId(null);
    const from = parseTime(time);
    setFormData({
      ...emptyFormData,
      datumPlanovany: defaultDate || today,
      ...(time && from !== null ? {
        casPlanovany: time,
        casKonec: `${String(Math.min(23, Math.floor(from) + 2)).padStart(2, '0')}:${time.slice(3)}`,
      } : {}),
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
          ...formDataToZakazka(data),
          datumDokonceni: data.stav === 'dokončeno' ? today : undefined,
        },
      }, { onSuccess, onError: onMutationError });
    } else {
      createZakazka.mutate(formDataToZakazka(data) as Parameters<typeof createZakazka.mutate>[0], { onSuccess, onError: onMutationError });
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
      data: { stav, datumDokonceni: stav === 'dokončeno' ? today : undefined },
    }, { onError: onMutationError });
  };

  const showUndo = (z: Zakazka, text: string) => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndo({ z, text });
    undoTimer.current = setTimeout(() => setUndo(null), 6000);
  };

  const handleComplete = (z: Zakazka) => {
    updateZakazka.mutate({ id: z.id!, data: { stav: 'dokončeno', datumDokonceni: today } }, {
      onSuccess: () => showUndo(z, 'Zakázka označena jako dokončená'),
      onError: onMutationError,
    });
  };

  const handleMarkReportDone = (z: Zakazka) => {
    updateZakazka.mutate({ id: z.id!, data: { datumOdevzdaniZpravy: today } }, {
      onSuccess: () => showUndo(z, 'Zpráva označena jako odevzdaná'),
      onError: onMutationError,
    });
  };

  const handleUndo = () => {
    if (!undo) return;
    const z = undo.z;
    updateZakazka.mutate({
      id: z.id!,
      data: { stav: z.stav, datumDokonceni: z.datumDokonceni ?? null, datumOdevzdaniZpravy: z.datumOdevzdaniZpravy ?? null } as Partial<Zakazka>,
    }, { onError: onMutationError });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndo(null);
  };

  // === Create Revize from Zakazka ===
  // Kategorie zakázky známá → revize se založí rovnou; jinak výběr kategorie
  const handleCreateRevize = (z: Zakazka) => {
    if (z.kategorie) { void createRevizeFor(z, z.kategorie); return; }
    setPendingZakazka(z);
    setKategoriePickerOpen(true);
  };

  const handleKategorieSelected = async (kategorie: KategorieRevize) => {
    if (!pendingZakazka) return;
    const z = pendingZakazka;
    setKategoriePickerOpen(false);
    setPendingZakazka(null);
    await createRevizeFor(z, kategorie);
  };

  const createRevizeFor = async (z: Zakazka, kategorie: KategorieRevize) => {
    const cislo = noveCisloRevize();
    setRevizeError(null);
    try {
      const revizeId = await createRevizeMutation.mutateAsync({
        cisloRevize: cislo,
        nazev: z.nazev,
        adresa: z.adresa,
        objednatel: z.klient,
        zakaznikId: z.zakaznikId,
        kategorieRevize: kategorie,
        datum: today,
        termin: 60,
        typRevize: 'pravidelná',
        stav: 'rozpracováno',
      });
      // Propojit zakázku s revizí (a uložit kategorii, pokud chyběla)
      await updateZakazka.mutateAsync({ id: z.id!, data: { revizeId, kategorie } });
      navigate(`/revize/${revizeId}`);
    } catch (err) {
      console.error('Chyba při vytváření revize:', err);
      setRevizeError('Nepodařilo se vytvořit revizní zprávu.');
      setTimeout(() => setRevizeError(null), 5000);
    }
  };

  // === Move (drag & drop v týdnu) ===
  const handleMove = (z: Zakazka, date: string, time: string | 'allday') => {
    const patch = moveZakazka(z, date, time);
    updateZakazka.mutate({ id: z.id!, data: patch }, { onError: onMutationError });
  };

  // === Delete ===
  const handleConfirmDelete = () => {
    if (deleteTargetId === null) return;
    deleteZakazka.mutate(deleteTargetId, { onError: onMutationError });
    setDeleteTargetId(null);
  };

  const planProps: PlanProps = {
    zakazky,
    revizeById,
    zakazniciById,
    today,
    onEdit: openEdit,
    onCreateAt: (d, t) => openCreate(d, t),
    onCreateRevize: handleCreateRevize,
    onOpenRevize: z => { if (z.revizeId) navigate(`/revize/${z.revizeId}`); },
    onMarkReportDone: handleMarkReportDone,
    onComplete: handleComplete,
    onUpdateStav: handleUpdateStav,
    onDelete: id => setDeleteTargetId(id),
    onMove: handleMove,
  };

  const viewBtn = (v: ViewMode, label: string) => (
    <button
      type="button"
      onClick={() => setViewMode(v)}
      aria-pressed={viewMode === v}
      className={`px-3 md:px-4 min-h-[40px] text-[13px] font-semibold transition-colors ${
        viewMode === v
          ? 'bg-[var(--bg-accent)] text-[var(--primary)]'
          : 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4 md:space-y-5 pb-24 md:pb-0">
      <PageHeader
        title="Plánování"
        subtitle="Zakázky a revize v kalendáři"
        actions={
          <div className="flex gap-2 flex-wrap justify-end">
            <div role="group" aria-label="Pohled" className="flex rounded-[var(--radius-md)] overflow-hidden border border-[var(--border-input)]">
              {viewBtn('list', 'Seznam')}
              {viewBtn('week', 'Týden')}
              {viewBtn('calendar', 'Měsíc')}
            </div>
            <Button
              variant="secondary"
              onClick={handleGcSync}
              disabled={gcSyncing}
              title="Synchronizovat zakázky do Google Kalendáře"
              className="hidden md:inline-flex"
            >
              <svg className="w-4 h-4 mr-1.5 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M23 4v6h-6M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
              {gcSyncing ? 'Sync…' : 'Google Kalendář'}
            </Button>
            <Button onClick={() => openCreate()} className="hidden md:inline-flex">+ Nová zakázka</Button>
          </div>
        }
      />
      {gcMessage && (
        <div className={`text-sm px-4 py-2 rounded-[var(--radius-md)] ${
          gcMessage.startsWith('✅') ? 'bg-[var(--success-bg)] text-[var(--success-text)]' : 'bg-[var(--danger-bg)] text-[var(--danger-text)]'
        }`}>
          {gcMessage}
        </div>
      )}
      {revizeError && (
        <div className="text-sm px-4 py-2 rounded-[var(--radius-md)] bg-[var(--danger-bg)] text-[var(--danger-text)]">{revizeError}</div>
      )}
      {mutationError && (
        <div className="text-sm px-4 py-2 rounded-[var(--radius-md)] bg-[var(--danger-bg)] text-[var(--danger-text)]">{mutationError}</div>
      )}

      {viewMode === 'week' ? <WeekView {...planProps} />
        : viewMode === 'calendar' ? <CalendarView {...planProps} />
        : <ListView {...planProps} />}

      {/* Plovoucí „+“ na mobilu */}
      {isMobile && (
        <button
          type="button"
          aria-label="Nová zakázka"
          onClick={() => openCreate()}
          className="fixed right-4 z-40 w-14 h-14 rounded-2xl bg-[var(--primary)] text-[var(--primary-fg)] flex items-center justify-center shadow-[var(--shadow-lg)]"
          style={{ bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' }}
        >
          <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        </button>
      )}

      {/* Lišta „Vrátit“ */}
      {undo && (
        <div role="status" className="fixed left-1/2 -translate-x-1/2 z-50 w-[calc(100%-24px)] max-w-[420px] min-h-[48px] flex items-center justify-between gap-3 pl-4 pr-2 rounded-[var(--radius-md)] bg-[var(--text)] text-[var(--background)] text-[13px] font-medium shadow-[var(--shadow-lg)]"
          style={{ bottom: isMobile ? 'calc(150px + env(safe-area-inset-bottom, 0px))' : 24 }}>
          {undo.text}
          <button type="button" onClick={handleUndo} className="min-h-[36px] px-3 rounded-[var(--radius-md)] font-bold underline underline-offset-2 bg-transparent text-[var(--background)] hover:opacity-80">
            Vrátit
          </button>
        </div>
      )}

      {/* Modal pro vytvoření / editaci */}
      <ZakazkaForm
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        formData={formData}
        setFormData={setFormData}
        revize={revize}
        zakaznici={zakaznici}
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
                className="flex items-center gap-4 p-4 rounded-[var(--radius-lg)] border border-[var(--border-medium)] hover:border-[var(--primary)] hover:bg-[var(--bg-accent)] transition-colors text-left group"
              >
                <div className="flex-shrink-0 text-[var(--text-secondary)] group-hover:text-[var(--primary)] transition-colors">
                  {kat.icon}
                </div>
                <div>
                  <p className="font-semibold text-[var(--text)]">{kat.label}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{kat.popis}</p>
                </div>
                <div className="flex-shrink-0 ml-auto text-[var(--text-muted)] group-hover:text-[var(--primary)]">
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteTargetId !== null}
        title="Smazat zakázku"
        message="Opravdu chcete smazat tuto zakázku?"
        confirmLabel="Smazat"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}

type ViewMode = 'list' | 'week' | 'calendar';
const VIEW_KEY = 'planovani-pohled';
function readView(): ViewMode {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    if (v === 'list' || v === 'week' || v === 'calendar') return v;
  } catch { /* ignore */ }
  return 'list';
}

/** Dočasné číslo nové revize (technik ho přepíše na své číslování). */
function noveCisloRevize(): string {
  return `REV-${Date.now().toString().slice(-6)}`;
}
