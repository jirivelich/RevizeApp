import { useState, useRef } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import type { Zakazka } from '../../types';
import { Card } from '../../components/ui';
import { getRealizaceDays, getReportDeadline, isOverdue, addDays } from './utils';

// ========== Helpers ==========

function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const DAY_NAMES_SHORT = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

// ========== DraggableRow ==========

interface DraggableRowProps {
  zakazka: Zakazka;
  days: string[];           // 14 dní osy
  onClick: (z: Zakazka) => void;
  onAddDay: (id: number, date: string) => void;
  onRemoveDay: (id: number, date: string) => void;
  isDragging: boolean;
}

function GanttRow({ zakazka: z, days, onClick, onAddDay, onRemoveDay, isDragging }: DraggableRowProps) {
  const realizaceDays = getRealizaceDays(z);
  const reportDeadline = getReportDeadline(z);
  const lastRealizaceDay = realizaceDays[realizaceDays.length - 1];

  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `gantt-${z.id}`,
    data: { zakazka: z },
  });

  return (
    <div
      className={`flex border-b border-white/[0.05] hover:bg-white/[0.04] transition-colors ${isDragging ? 'opacity-40' : ''}`}
    >
      {/* Název zakázky */}
      <div
        className="flex-shrink-0 w-40 px-3 py-2 text-sm font-medium text-slate-300 truncate border-r border-white/[0.06] cursor-pointer hover:text-white"
        title={`${z.nazev} — ${z.klient}`}
        onClick={() => onClick(z)}
      >
        <div className="truncate">{z.nazev}</div>
        <div className="text-xs text-slate-400 truncate">{z.klient}</div>
      </div>

      {/* Buňky pro každý den */}
      <div className="flex flex-1">
        {days.map((day) => {
          const isRealizace = realizaceDays.includes(day);
          const isFirstRealizace = realizaceDays[0] === day;
          const isLastRealizace = lastRealizaceDay === day;
          const isDeadline = reportDeadline === day;
          const isOdevzdani = z.datumOdevzdaniZpravy === day;
          const deadlineOverdue = isDeadline && isOverdue(day);

          const today = new Date();
          const isToday = day === formatDateStr(today);

          return (
            <div
              key={day}
              className={`relative flex-1 min-w-[36px] h-12 border-r border-white/[0.05] flex items-center justify-center
                ${isToday ? 'bg-blue-500/[0.08]' : ''}
              `}
            >
              {/* Realizační blok */}
              {isRealizace && (
                <div
                  ref={isFirstRealizace ? setNodeRef : undefined}
                  {...(isFirstRealizace ? listeners : {})}
                  {...(isFirstRealizace ? attributes : {})}
                  className={`absolute inset-y-1.5 rounded
                    ${isFirstRealizace ? 'left-1' : 'left-0'}
                    ${isLastRealizace ? 'right-1' : 'right-0'}
                    bg-blue-500 hover:bg-blue-600 cursor-grab select-none transition-colors
                    flex items-center justify-center
                  `}
                  title={isFirstRealizace ? `${z.nazev} — přetáhni pro přesunutí` : z.nazev}
                >
                  {isFirstRealizace && (
                    <span className="text-[9px] text-white font-medium px-1 truncate">{z.nazev}</span>
                  )}
                </div>
              )}

              {/* Lhůta zprávy */}
              {isDeadline && (
                <div
                  className={`absolute inset-y-3 left-0.5 right-0.5 rounded
                    ${deadlineOverdue ? 'bg-red-400' : 'bg-amber-400'}
                    opacity-80 flex items-center justify-center
                  `}
                  title={`Deadline zprávy: ${z.nazev}`}
                >
                  <span className="text-[8px] text-white font-bold">📋</span>
                </div>
              )}

              {/* Odevzdání zprávy */}
              {isOdevzdani && (
                <div
                  className="absolute inset-y-2 left-1/2 -translate-x-1/2 w-1.5 rounded-full bg-green-500"
                  title={`Odevzdání zprávy: ${z.nazev}`}
                />
              )}

              {/* Resize handle — na posledním dni realizace */}
              {isLastRealizace && (
                <button
                  className="absolute right-0 top-0 bottom-0 w-3 flex items-center justify-center opacity-0 hover:opacity-100 group-hover:opacity-60 cursor-col-resize z-10"
                  title="Přidat/odebrat den"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Přidání dalšího dne (klik = +1 den za posledním)
                    const next = addDays(lastRealizaceDay, 1);
                    if (!realizaceDays.includes(next)) {
                      onAddDay(z.id!, next);
                    }
                  }}
                >
                  <span className="text-blue-600 text-xs font-bold">›</span>
                </button>
              )}

              {/* Tlačítko odebrat u každého realizačního dne (alt+klik) */}
              {isRealizace && realizaceDays.length > 1 && (
                <button
                  className="absolute top-0.5 right-0.5 w-3 h-3 flex items-center justify-center opacity-0 hover:opacity-100 z-20"
                  title="Odebrat tento den"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveDay(z.id!, day);
                  }}
                >
                  <span className="text-[8px] text-white bg-red-400 rounded-full w-3 h-3 flex items-center justify-center">×</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ========== GanttView ==========

interface GanttViewProps {
  zakazky: Zakazka[];
  onZakazkaClick: (zakazka: Zakazka) => void;
  onMove: (zakazkaId: number, daysDelta: number) => void;
  onAddDay: (zakazkaId: number, date: string) => void;
  onRemoveDay: (zakazkaId: number, date: string) => void;
}

export function GanttView({ zakazky, onZakazkaClick, onMove, onAddDay, onRemoveDay }: GanttViewProps) {
  const today = new Date();
  const [startDate, setStartDate] = useState(() => getMonday(today));
  const [activeDragId, setActiveDragId] = useState<number | null>(null);
  const dragStartX = useRef<number>(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // 14 dní osy
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return formatDateStr(d);
  });

  const goPrev = () => {
    setStartDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const goNext = () => {
    setStartDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const goToday = () => setStartDate(getMonday(today));

  const rangeLabel = (() => {
    const end = new Date(startDate);
    end.setDate(end.getDate() + 13);
    const s = new Date(startDate).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' });
    const e = end.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${s} – ${e}`;
  })();

  const handleDragStart = (event: DragStartEvent) => {
    const z = event.active.data.current?.zakazka as Zakazka;
    if (z) {
      setActiveDragId(z.id!);
      dragStartX.current = (event.active.rect.current?.translated?.left ?? 0);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const z = event.active.data.current?.zakazka as Zakazka;
    if (!z) return;

    // Výpočet posunu v dnech na základě delta.x a šířky buňky
    // Přibližná šířka buňky je (containerWidth - 160) / 14
    const cellWidth = (window.innerWidth - 160 - 32) / 14; // minus popisky a padding
    const deltaX = event.delta.x;
    const daysDelta = Math.round(deltaX / cellWidth);
    if (daysDelta !== 0) {
      onMove(z.id!, daysDelta);
    }
  };

  // Filtr — zobrazit jen zakázky, které mají alespoň jeden den v rozsahu
  const visibleZakazky = zakazky.filter((z) => {
    const realizDays = getRealizaceDays(z);
    const deadline = getReportDeadline(z);
    const odevzdani = z.datumOdevzdaniZpravy;
    return realizDays.some((d) => days.includes(d))
      || (deadline && days.includes(deadline))
      || (odevzdani && days.includes(odevzdani));
  });

  const todayStr = formatDateStr(today);

  return (
    <Card>
      {/* Navigace */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={goPrev} className="p-2 rounded-lg hover:bg-white/[0.06] text-slate-400 transition-colors" title="Předchozí 2 týdny">◀</button>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-300">{rangeLabel}</h2>
          <button onClick={goToday} className="text-xs px-2 py-1 rounded bg-blue-500/[0.15] text-blue-300 hover:bg-blue-500/[0.25] transition-colors">
            Dnes
          </button>
        </div>
        <button onClick={goNext} className="p-2 rounded-lg hover:bg-white/[0.06] text-slate-400 transition-colors" title="Další 2 týdny">▶</button>
      </div>

      {/* Legenda */}
      <div className="flex gap-4 mb-3 text-xs text-slate-400 flex-wrap">
        <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-3 rounded bg-blue-500"></span>Realizace</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-3 rounded bg-amber-400"></span>Deadline zprávy</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-1.5 h-4 rounded-full bg-green-500"></span>Odevzdání</span>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Hlavička — dny */}
          <div className="flex border-b-2 border-white/[0.08]">
            <div className="flex-shrink-0 w-40 px-3 py-2 text-xs font-medium text-slate-400 border-r border-white/[0.06]">
              Zakázka
            </div>
            <div className="flex flex-1">
              {days.map((day) => {
                const d = new Date(day);
                const dayOfWeek = (d.getDay() + 6) % 7; // 0=Po
                const isWeekend = dayOfWeek >= 5;
                const isToday = day === todayStr;
                return (
                  <div
                    key={day}
                    className={`flex-1 min-w-[36px] py-1 text-center border-r border-white/[0.05] ${isWeekend ? 'bg-white/[0.03]' : ''} ${isToday ? 'bg-blue-500/[0.15]' : ''}`}
                  >
                    <div className={`text-[9px] font-medium ${isToday ? 'text-blue-400' : 'text-slate-500'}`}>
                      {DAY_NAMES_SHORT[dayOfWeek]}
                    </div>
                    <div className={`text-xs font-semibold ${isToday ? 'text-blue-400' : isWeekend ? 'text-slate-500' : 'text-slate-400'}`}>
                      {d.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Řádky */}
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            {visibleZakazky.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                Žádné zakázky v tomto období
              </div>
            ) : (
              <div className="group">
                {visibleZakazky.map((z) => (
                  <GanttRow
                    key={z.id}
                    zakazka={z}
                    days={days}
                    onClick={onZakazkaClick}
                    onAddDay={onAddDay}
                    onRemoveDay={onRemoveDay}
                    isDragging={activeDragId === z.id}
                  />
                ))}
              </div>
            )}
          </DndContext>
        </div>
      </div>
    </Card>
  );
}
