import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import type { Zakazka } from '../../types';
import {
  addDaysLocal, allDayBars, timedBlocks, hourRange, mondayOf, fromDateStr, formatTime, kategorieOf, isClosed, MESICE_GEN, KAT_META,
  type TimedBlock,
} from './model';
import { KatLegend, NavBar, type PlanProps } from './shared';
import { useCalendarKeys, useIsMobile } from './hooks';

const DNY = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

function rangeTitle(days: string[]): string {
  const a = fromDateStr(days[0]), b = fromDateStr(days[days.length - 1]);
  if (a.getMonth() === b.getMonth()) return `${a.getDate()}.–${b.getDate()}. ${MESICE_GEN[b.getMonth()]} ${b.getFullYear()}`;
  return `${a.getDate()}. ${a.getMonth() + 1}. – ${b.getDate()}. ${b.getMonth() + 1}. ${b.getFullYear()}`;
}

function nowHours(): number {
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
}

export function WeekView(p: PlanProps) {
  const isMobile = useIsMobile();
  const span = isMobile ? 3 : 7;
  const [anchor, setAnchor] = useState(() => (isMobile ? p.today : mondayOf(p.today)));
  // Při přechodu mobil ↔ počítač zarovnat začátek
  const start = isMobile ? anchor : mondayOf(anchor);
  const days = useMemo(() => Array.from({ length: span }, (_, i) => addDaysLocal(start, i)), [start, span]);

  const prev = useCallback(() => setAnchor(a => addDaysLocal(isMobile ? a : mondayOf(a), -span)), [isMobile, span]);
  const next = useCallback(() => setAnchor(a => addDaysLocal(isMobile ? a : mondayOf(a), span)), [isMobile, span]);
  const today = useCallback(() => setAnchor(isMobile ? p.today : mondayOf(p.today)), [isMobile, p.today]);
  useCalendarKeys(prev, next, today);

  const visible = useMemo(() => p.zakazky.filter(z => z.stav !== 'zrušeno'), [p.zakazky]);
  const bars = useMemo(() => allDayBars(visible, days), [visible, days]);
  const blocksByDay = useMemo(() => new Map(days.map(d => [d, timedBlocks(visible, d)])), [visible, days]);
  const range = useMemo(() => hourRange([...blocksByDay.values()].flat()), [blocksByDay]);
  const HOUR = isMobile ? 44 : 48;
  const hours = Array.from({ length: range.end - range.start }, (_, i) => range.start + i);
  const rows = Math.max(1, ...bars.map(b => b.row + 1));

  // Hodiny „teď“ – překreslit každou minutu
  const [now, setNow] = useState(nowHours);
  useEffect(() => { const t = setInterval(() => setNow(nowHours()), 60000); return () => clearInterval(t); }, []);

  // Drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } }),
  );
  const [dragging, setDragging] = useState<Zakazka | null>(null);
  const onDragStart = (e: DragStartEvent) => setDragging((e.active.data.current?.z as Zakazka) ?? null);
  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    const z = e.active.data.current?.z as Zakazka | undefined;
    const over = e.over?.id as string | undefined;
    if (!z || !over) return;
    const [kind, date, hour] = over.split('|');
    if (kind === 'allday') p.onMove(z, date, 'allday');
    else if (kind === 'slot') p.onMove(z, date, `${hour.padStart(2, '0')}:00`);
  };

  // Posun prstem (mobil) mimo přetahování
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = swipe.current; swipe.current = null;
    if (!s || dragging) return;
    const dx = e.changedTouches[0].clientX - s.x, dy = e.changedTouches[0].clientY - s.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? next : prev)();
  };

  const cols = isMobile ? '44px repeat(3, minmax(0, 1fr))' : '56px repeat(5, minmax(0, 1fr)) repeat(2, minmax(0, 0.6fr))';
  const weekDays = Array.from({ length: 7 }, (_, i) => addDaysLocal(mondayOf(anchor), i));

  return (
    <div className="flex flex-col gap-3">
      <NavBar
        title={rangeTitle(days)}
        onPrev={prev} onNext={next} onToday={today}
        prevLabel={isMobile ? 'Předchozí dny' : 'Předchozí týden'}
        nextLabel={isMobile ? 'Další dny' : 'Další týden'}
        right={!isMobile ? <KatLegend /> : undefined}
      />

      {isMobile && (
        <div className="grid grid-cols-7 gap-0.5 p-1 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]" role="group" aria-label="Dny týdne">
          {weekDays.map((d, i) => {
            const inRange = days.includes(d);
            const isToday = d === p.today;
            const has = visible.some(z => (z.datumPlanovany === d) || z.datumyRealizace?.includes(d));
            return (
              <button key={d} type="button" onClick={() => setAnchor(d)} aria-pressed={inRange}
                className={`h-14 rounded-[var(--radius-md)] flex flex-col items-center justify-center gap-0.5 ${inRange ? 'bg-[var(--bg-accent)]' : ''}`}>
                <span className="text-[10px] font-semibold text-[var(--text-secondary)]">{DNY[i]}</span>
                <span className={isToday
                  ? 'w-6 h-6 rounded-full bg-[var(--primary)] text-[var(--primary-fg)] text-xs font-bold flex items-center justify-center'
                  : `text-sm font-semibold ${d < p.today ? 'text-[var(--text-secondary)]' : 'text-[var(--text)]'}`}>
                  {fromDateStr(d).getDate()}
                </span>
                <span className="w-[5px] h-[5px] rounded-full" style={{ background: has ? 'var(--primary)' : 'transparent' }} />
              </button>
            );
          })}
        </div>
      )}

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
          onTouchStart={isMobile ? onTouchStart : undefined} onTouchEnd={isMobile ? onTouchEnd : undefined}>
          {/* Záhlaví dnů */}
          <div className="grid border-b border-[var(--border)]" style={{ gridTemplateColumns: cols }}>
            <div />
            {days.map(d => {
              const isToday = d === p.today;
              const dt = fromDateStr(d);
              const weekend = dt.getDay() === 0 || dt.getDay() === 6;
              return (
                <div key={d} className={`flex items-center gap-2 px-2.5 py-2 border-l border-[var(--border-subtle)] ${isToday ? 'bg-[color-mix(in_srgb,var(--bg-accent)_60%,transparent)]' : ''} ${weekend ? 'opacity-75' : ''}`}>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--text-secondary)]">{DNY[(dt.getDay() + 6) % 7]}</span>
                  <span className={isToday
                    ? 'w-[26px] h-[26px] rounded-full bg-[var(--primary)] text-[var(--primary-fg)] text-[13px] font-bold flex items-center justify-center'
                    : `text-[15px] font-bold ${d < p.today ? 'text-[var(--text-secondary)]' : 'text-[var(--text)]'}`}>
                    {dt.getDate()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Celý den */}
          <div className="grid border-b border-[var(--border)] bg-[var(--bg-faint)] py-1.5 gap-y-1"
            style={{ gridTemplateColumns: cols, gridTemplateRows: `repeat(${rows}, ${isMobile ? 28 : 30}px)` }}>
            <div className={`${isMobile ? 'text-[10px] leading-[1.15] pt-0.5' : 'text-[11px] pt-1.5'} text-[var(--text-secondary)] pl-2`} style={{ gridColumn: '1 / 2', gridRow: `1 / ${rows + 1}` }}>Celý den</div>
            {days.map((d, i) => (
              <AllDayDrop key={d} id={`allday|${d}`} style={{ gridColumn: `${i + 2} / ${i + 3}`, gridRow: `1 / ${rows + 1}` }} />
            ))}
            {bars.map(b => {
              const kat = kategorieOf(b.z, p.revizeById);
              const n = b.end - b.start + 1;
              return (
                <Drag key={`${b.z.id}-${b.start}`} z={b.z} id={`bar|${b.z.id}|${b.start}`}
                  style={{ gridColumn: `${b.start + 2} / ${b.end + 3}`, gridRow: `${b.row + 1} / ${b.row + 2}`, zIndex: 1 }}>
                  <button type="button" onClick={() => p.onEdit(b.z)}
                    className={`w-full h-full mx-[3px] rounded-[var(--radius-sm)] px-2.5 flex items-center gap-2 text-xs font-semibold text-left whitespace-nowrap overflow-hidden ${isClosed(b.z) ? 'opacity-55' : ''}`}
                    style={{ color: KAT_META[kat].color, background: KAT_META[kat].bg, width: 'calc(100% - 6px)' }}>
                    <span className="truncate">{b.z.nazev}</span>
                    {n > 1 && !isMobile && <span className="shrink-0 font-medium text-[var(--text-secondary)]">{n} dny</span>}
                  </button>
                </Drag>
              );
            })}
          </div>

          {/* Časová osa */}
          <div className="grid" style={{ gridTemplateColumns: cols }}>
            <div className="relative" style={{ height: hours.length * HOUR }}>
              {hours.map((h, i) => (
                <span key={h} className="absolute right-2 text-[11px] text-[var(--text-secondary)]" style={{ top: i === 0 ? 2 : i * HOUR - 7 }}>{h}:00</span>
              ))}
            </div>
            {days.map(d => {
              const isToday = d === p.today;
              const dt = fromDateStr(d);
              const weekend = dt.getDay() === 0 || dt.getDay() === 6;
              return (
                <div key={d} className="relative border-l border-[var(--border-subtle)]"
                  style={{
                    height: hours.length * HOUR,
                    backgroundImage: `repeating-linear-gradient(to bottom, var(--border-subtle) 0, var(--border-subtle) 1px, transparent 1px, transparent ${HOUR}px)`,
                    backgroundColor: isToday ? 'color-mix(in srgb, var(--bg-accent) 45%, transparent)' : weekend ? 'var(--bg-faint)' : undefined,
                  }}>
                  {hours.map((h, i) => (
                    <Slot key={h} id={`slot|${d}|${h}`} top={i * HOUR} height={HOUR}
                      label={`Nová zakázka ${dt.getDate()}. ${dt.getMonth() + 1}. v ${h}:00`}
                      onClick={() => p.onCreateAt(d, `${String(h).padStart(2, '0')}:00`)} />
                  ))}
                  {(blocksByDay.get(d) ?? []).map(b => (
                    <Block key={b.z.id} b={b} p={p} top={(b.from - range.start) * HOUR} hour={HOUR} />
                  ))}
                  {isToday && now >= range.start && now <= range.end && (
                    <div aria-hidden="true" className="absolute left-0 right-0 h-[2px] bg-[var(--danger)] pointer-events-none z-[2]" style={{ top: (now - range.start) * HOUR }}>
                      <span className="absolute -left-[5px] -top-[4px] w-[10px] h-[10px] rounded-full bg-[var(--danger)]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <DragOverlay>
          {dragging && (
            <div className="px-3 py-2 rounded-[var(--radius-md)] text-xs font-semibold shadow-[var(--shadow-lg)] text-[var(--text)]"
              style={{ background: 'var(--surface)', border: `1px solid ${KAT_META[kategorieOf(dragging, p.revizeById)].color}` }}>
              {dragging.nazev}
            </div>
          )}
        </DragOverlay>
      </DndContext>
      {isMobile && <p className="text-[11px] text-[var(--text-muted)] text-center m-0">Posun prstem do stran = další dny · podržením zakázku přesunete</p>}
    </div>
  );
}

function AllDayDrop({ id, style }: { id: string; style: CSSProperties }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return <div ref={setNodeRef} className={`border-l border-[var(--border-subtle)] ${isOver ? 'bg-[var(--bg-accent)]' : ''}`} style={style} />;
}

function Slot({ id, top, height, onClick, label }: { id: string; top: number; height: number; onClick: () => void; label: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <button ref={setNodeRef} type="button" aria-label={label} onClick={onClick}
      className={`absolute left-0 right-0 hover:bg-[var(--bg-hover)] ${isOver ? 'bg-[var(--bg-accent)]' : ''}`}
      style={{ top, height }} />
  );
}

function Drag({ z, id, style, children }: { z: Zakazka; id: string; style: CSSProperties; children: ReactNode }) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id, data: { z } });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} role={undefined} tabIndex={undefined}
      style={{ ...style, opacity: isDragging ? 0.35 : undefined, touchAction: 'pan-y' }}>
      {children}
    </div>
  );
}

function Block({ b, p, top, hour }: { b: TimedBlock; p: PlanProps; top: number; hour: number }) {
  const kat = kategorieOf(b.z, p.revizeById);
  const h = (b.to - b.from) * hour;
  const width = `calc((100% - 6px) / ${b.cols})`;
  return (
    <Drag z={b.z} id={`block|${b.z.id}`}
      style={{ position: 'absolute', top: top + 2, height: h - 4, left: `calc(3px + (100% - 6px) * ${b.col} / ${b.cols})`, width, zIndex: 1 }}>
      <button type="button" onClick={() => p.onEdit(b.z)}
        className={`w-full h-full box-border rounded-[var(--radius-sm)] px-2 py-1.5 flex flex-col gap-0.5 overflow-hidden text-left ${isClosed(b.z) ? 'opacity-55' : ''}`}
        style={{ background: KAT_META[kat].bg, border: `1px solid color-mix(in srgb, ${KAT_META[kat].color} 45%, transparent)` }}>
        <span className="text-xs font-semibold text-[var(--text)] leading-tight line-clamp-2">{b.z.nazev}</span>
        <span className="text-[11px] font-medium" style={{ color: KAT_META[kat].color }}>{formatTime(b.from)}–{formatTime(b.to)}</span>
        {h >= 72 && <span className="text-[11px] text-[var(--text-secondary)] truncate">{b.z.klient}</span>}
      </button>
    </Drag>
  );
}
