import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { Zakazka } from '../../types';
import { Card } from '../../components/ui';
import { getPriorityColor, getStatusColor, getRealizaceDays } from './utils';

// ========== Helpers ==========

const DAY_NAMES = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];
const DAY_NAMES_SHORT = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 6); // 6:00 - 18:00

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

// ========== DraggableTask ==========

interface DraggableTaskProps {
  zakazka: Zakazka;
  onClick: (z: Zakazka) => void;
  overlay?: boolean;
}

function DraggableTask({ zakazka, onClick, overlay }: DraggableTaskProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `task-${zakazka.id}`,
    data: { zakazka },
  });

  const content = (
    <div
      ref={overlay ? undefined : setNodeRef}
      {...(overlay ? {} : listeners)}
      {...(overlay ? {} : attributes)}
      className={`text-xs p-2 rounded-md border cursor-grab select-none transition-shadow
        ${getPriorityColor(zakazka.priorita)} border-opacity-30
        ${isDragging ? 'opacity-40' : 'hover:shadow-md'}
        ${overlay ? 'shadow-xl ring-2 ring-blue-400 rotate-2' : ''}
      `}
      onClick={(e) => {
        if (!overlay) {
          e.stopPropagation();
          onClick(zakazka);
        }
      }}
    >
      <div className="font-medium truncate">{zakazka.nazev}</div>
      <div className="text-[10px] opacity-70 truncate mt-0.5">
        {zakazka.casPlanovany || '—'} • {zakazka.klient}
      </div>
      <span className={`inline-block mt-1 px-1 py-0.5 rounded text-[9px] ${getStatusColor(zakazka.stav)}`}>
        {zakazka.stav}
      </span>
    </div>
  );

  return content;
}

// ========== DroppableSlot ==========

interface DroppableSlotProps {
  id: string;
  children: React.ReactNode;
  onClick: () => void;
  isToday: boolean;
  isCurrentHour: boolean;
}

function DroppableSlot({ id, children, onClick, isToday, isCurrentHour }: DroppableSlotProps) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[60px] p-1 border-b border-r border-[var(--border)] transition-colors relative
        ${isOver ? 'bg-blue-500/[0.12] ring-2 ring-blue-500/[0.40] ring-inset' : ''}
        ${isToday ? 'bg-blue-500/[0.06]' : ''}
        ${isCurrentHour ? 'border-l-2 border-l-blue-500' : ''}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ========== WeekDropZone ==========

interface WeekDropZoneProps {
  id: string;
  label: string;
  direction: 'left' | 'right';
  visible: boolean;
}

function WeekDropZone({ id, label, direction, visible }: WeekDropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({ id });

  if (!visible) return null;

  return (
    <div
      ref={setNodeRef}
      className={`fixed ${direction === 'left' ? 'left-0' : 'right-0'} top-1/2 -translate-y-1/2 z-50
        w-16 h-48 flex items-center justify-center
        rounded-${direction === 'left' ? 'r' : 'l'}-xl
        transition-all duration-200 cursor-default
        ${isOver
          ? 'bg-slate-700 text-white shadow-2xl w-24'
          : 'bg-[var(--bg-hover)] text-[var(--text)] shadow-lg border border-[var(--border-strong)]'
        }
      `}
    >
      <span className="text-xs font-bold writing-mode-vertical [writing-mode:vertical-lr] rotate-180 whitespace-nowrap">
        {label}
      </span>
    </div>
  );
}

// ========== WeekView ==========

interface WeekViewProps {
  zakazky: Zakazka[];
  onZakazkaClick: (zakazka: Zakazka) => void;
  onSlotClick: (dateStr: string, cas: string) => void;
  onMove: (zakazkaId: number, newDate: string, newCas: string) => void;
}

export function WeekView({ zakazky: allZakazky, onZakazkaClick, onSlotClick, onMove }: WeekViewProps) {
  // Zrušené zakázky se v týdenním pohledu nezobrazují — termín už neplatí.
  const zakazky = useMemo(() => allZakazky.filter((z) => z.stav !== 'zrušeno'), [allZakazky]);
  const today = new Date();
  const [weekStart, setWeekStart] = useState(() => getMonday(today));
  const [activeDrag, setActiveDrag] = useState<Zakazka | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Generate days of the week
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const weekLabel = useMemo(() => {
    const start = weekDays[0];
    const end = weekDays[6];
    const startStr = start.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' });
    const endStr = end.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${startStr} – ${endStr}`;
  }, [weekDays]);

  // Group zakazky by date+hour — každá zakázka se zobrazí na každý den realizace
  const zakazkyMap = useMemo(() => {
    const map = new Map<string, Zakazka[]>();
    for (const z of zakazky) {
      const days = getRealizaceDays(z);
      const hour = z.casPlanovany ? parseInt(z.casPlanovany.split(':')[0]) : 8;
      for (const day of days) {
        // Pouze 1. den má čas, ostatní dny jdou do slotu 8:00
        const slotHour = day === days[0] ? hour : 8;
        const key = `${day}|${slotHour}`;
        if (!map.has(key)) map.set(key, []);
        // Nevkládat duplikáty (zakázka může mít 1. den = datumPlanovany a datumyRealizace může být prázdné)
        if (!map.get(key)!.find((x) => x.id === z.id)) {
          map.get(key)!.push(z);
        }
      }
    }
    return map;
  }, [zakazky]);

  const goToPreviousWeek = () => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const goToNextWeek = () => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const goToToday = () => {
    setWeekStart(getMonday(today));
  };

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
    const z = event.active.data.current?.zakazka as Zakazka;
    if (z) setActiveDrag(z);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over) return;

    const zakazka = active.data.current?.zakazka as Zakazka;
    if (!zakazka) return;

    const overId = over.id as string;

    // Handle week-shift drop zones
    if (overId === 'drop-prev-week' || overId === 'drop-next-week') {
      const shift = overId === 'drop-prev-week' ? -7 : 7;
      const oldDate = new Date(zakazka.datumPlanovany);
      oldDate.setDate(oldDate.getDate() + shift);
      const newDate = formatDateStr(oldDate);
      const cas = zakazka.casPlanovany || '08:00';
      onMove(zakazka.id!, newDate, cas);
      // Also navigate to that week
      setWeekStart(getMonday(oldDate));
      return;
    }

    // slot id format: "slot|2026-03-02|8"
    const parts = overId.split('|');
    if (parts.length !== 3 || parts[0] !== 'slot') return;

    const newDate = parts[1];
    const newHour = parts[2];
    const newCas = `${newHour.padStart(2, '0')}:00`;

    // Only update if something changed
    const oldHour = zakazka.casPlanovany ? zakazka.casPlanovany.split(':')[0] : '08';
    if (zakazka.datumPlanovany === newDate && oldHour === newHour.padStart(2, '0')) return;

    onMove(zakazka.id!, newDate, newCas);
  };

  const currentHour = today.getHours();

  return (
    <Card>
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousWeek}
          className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
          title="Předchozí týden"
        >
          ◀
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-[var(--text)]">{weekLabel}</h2>
          <button
            onClick={goToToday}
            className="text-xs px-2 py-1 rounded bg-[var(--bg-accent-badge)] text-[var(--primary)] hover:bg-blue-500/[0.25] transition-colors"
          >
            Tento týden
          </button>
        </div>
        <button
          onClick={goToNextWeek}
          className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
          title="Další týden"
        >
          ▶
        </button>
      </div>

      {/* Grid */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="overflow-auto max-h-[calc(100vh-220px)]">
          <div className="grid" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
            {/* Header row */}
            <div className="sticky top-0 z-10 bg-[var(--background)] border-b border-r border-[var(--border)] p-2" />
            {weekDays.map((day, i) => {
              const isToday_ = isSameDay(day, today);
              return (
                <div
                  key={i}
                  className={`sticky top-0 z-10 p-2 text-center border-b border-r border-[var(--border)] ${
                    isToday_ ? 'bg-[var(--bg-accent-badge)]' : 'bg-[var(--background)]'
                  }`}
                >
                  <div className="text-xs text-[var(--text-muted)]">{DAY_NAMES_SHORT[i]}</div>
                  <div className={`text-sm font-semibold ${
                    isToday_ ? 'text-[var(--primary)] font-bold' : 'text-[var(--text)]'
                  }`}>
                    {day.getDate()}
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)] hidden sm:block">{DAY_NAMES[i]}</div>
                </div>
              );
            })}

            {/* Time rows */}
            {HOURS.map((hour) => (
              <>
                {/* Time label */}
                <div
                  key={`label-${hour}`}
                  className="p-1 text-right text-xs text-[var(--text-muted)] border-b border-r border-[var(--border)] bg-[var(--bg-surface)] sticky left-0"
                >
                  {String(hour).padStart(2, '0')}:00
                </div>
                {/* Day slots */}
                {weekDays.map((day, dayIdx) => {
                  const dateStr = formatDateStr(day);
                  const slotId = `slot|${dateStr}|${hour}`;
                  const slotZakazky = zakazkyMap.get(`${dateStr}|${hour}`) || [];
                  const isToday_ = isSameDay(day, today);

                  return (
                    <DroppableSlot
                      key={`${dayIdx}-${hour}`}
                      id={slotId}
                      isToday={isToday_}
                      isCurrentHour={isToday_ && hour === currentHour}
                      onClick={() => onSlotClick(dateStr, `${String(hour).padStart(2, '0')}:00`)}
                    >
                      <div className="space-y-1">
                        {slotZakazky.map((z) => (
                          <DraggableTask
                            key={z.id}
                            zakazka={z}
                            onClick={onZakazkaClick}
                          />
                        ))}
                      </div>
                    </DroppableSlot>
                  );
                })}
              </>
            ))}
          </div>
        </div>

        {/* Week-shift drop zones (visible only during drag) */}
        <WeekDropZone
          id="drop-prev-week"
          label="◀ Předchozí týden"
          direction="left"
          visible={activeDrag !== null}
        />
        <WeekDropZone
          id="drop-next-week"
          label="Další týden ▶"
          direction="right"
          visible={activeDrag !== null}
        />

        {/* Drag overlay */}
        <DragOverlay>
          {activeDrag && (
            <DraggableTask zakazka={activeDrag} onClick={() => {}} overlay />
          )}
        </DragOverlay>
      </DndContext>
    </Card>
  );
}
