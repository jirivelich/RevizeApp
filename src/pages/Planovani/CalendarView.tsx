import { useState, useEffect, useMemo } from 'react';
import type { Zakazka } from '../../types';
import { Card } from '../../components/ui';
import { getPriorityColor, getRealizaceDays, getReportDeadline, isOverdue } from './utils';

interface CalendarViewProps {
  zakazky: Zakazka[];
  onDayClick: (dateStr: string) => void;
  onZakazkaClick: (zakazka: Zakazka) => void;
}

const DAY_NAMES = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

// Index víkendů (So=5, Ne=6, indexováno od Po=0)
const WEEKEND_INDICES = new Set([5, 6]);

const LEGEND_ITEMS = [
  { color: 'bg-purple-400/70', label: 'Realizace' },
  { color: 'bg-amber-400/80', label: 'Deadline zprávy' },
  { color: 'bg-blue-400/80', label: 'Odevzdání' },
] as const;

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// SVG ikony místo emoji
function IconClipboard() {
  return (
    <svg className="inline w-3 h-3 mr-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg className="inline w-3 h-3 mr-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function CalendarView({ zakazky, onDayClick, onZakazkaClick }: CalendarViewProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  // Klávesová navigace: ← → pro měsíce, T pro dnešek
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft') goToPreviousMonth();
      else if (e.key === 'ArrowRight') goToNextMonth();
      else if (e.key === 't' || e.key === 'T') goToToday();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentMonth, currentYear]);

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  // getDay() returns 0=Sunday, convert to Monday-first (0=Monday)
  const startingDay = (firstDay.getDay() + 6) % 7;

  const isTodayFn = (day: number) =>
    day === today.getDate() &&
    currentMonth === today.getMonth() &&
    currentYear === today.getFullYear();

  const formatDateStr = (day: number) =>
    `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const monthLabel = new Date(currentYear, currentMonth)
    .toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });

  // Počet zakázek v aktuálním měsíci
  const monthCount = useMemo(() => {
    return zakazky.filter(z => {
      if (!z.datumPlanovany) return false;
      const d = new Date(z.datumPlanovany);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
  }, [zakazky, currentMonth, currentYear]);

  const numRows = Math.ceil((startingDay + daysInMonth) / 7);
  const rows: React.ReactNode[] = [];

  for (let r = 0; r < numRows; r++) {
    const rowMonday = new Date(currentYear, currentMonth, 1 - startingDay + r * 7);
    const weekNum = getISOWeek(rowMonday);
    rows.push(
      <div key={`wn-${r}`} className="flex items-start justify-center pt-3 min-h-[90px] border border-[var(--border)] bg-[var(--bg-faint)]">
        <span className="text-[10px] font-medium text-[var(--text-muted)] opacity-50 leading-none tabular-nums">{weekNum}</span>
      </div>
    );

    for (let col = 0; col < 7; col++) {
      const cellIndex = r * 7 + col;
      const day = cellIndex - startingDay + 1;
      const isWeekend = WEEKEND_INDICES.has(col);

      if (day < 1 || day > daysInMonth) {
        rows.push(
          <div key={`empty-${r}-${col}`} className={`p-2 min-h-[90px] border border-[var(--border)] ${isWeekend ? 'bg-white/[0.015]' : 'bg-[var(--bg-faint)]'}`}></div>
        );
      } else {
        const dateStr = formatDateStr(day);
        const dayZakazky = zakazky.filter((z) => getRealizaceDays(z).includes(dateStr));
        const deadlineZpravy = zakazky.filter((z) => {
          const dl = getReportDeadline(z);
          return dl === dateStr;
        });
        const odevzdani = zakazky.filter((z) => z.datumOdevzdaniZpravy === dateStr);
        const todayClass = isTodayFn(day);
        const hiddenCount = Math.max(0, dayZakazky.length - 3);

        rows.push(
          <div
            key={day}
            className={`p-2 min-h-[90px] border border-[var(--border)] cursor-pointer hover:bg-blue-500/[0.06] transition-colors ${
              todayClass
                ? 'bg-blue-500/[0.12] ring-2 ring-blue-500/[0.40] ring-inset'
                : isWeekend
                ? 'bg-white/[0.015]'
                : 'bg-[var(--bg-faint)]'
            }`}
            onClick={() => onDayClick(dateStr)}
          >
            <span
              className={`text-sm font-medium inline-flex items-center justify-center w-7 h-7 rounded-full ${
                todayClass
                  ? 'bg-blue-500 text-white'
                  : isWeekend
                  ? 'text-slate-500'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              {day}
            </span>
            <div className="mt-1 space-y-1">
              {dayZakazky.slice(0, 3).map((z) => {
                const realizaceDays = getRealizaceDays(z);
                const isFirst = realizaceDays[0] === dateStr;
                return (
                  <div
                    key={z.id}
                    className={`text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 ${getPriorityColor(z.priorita)} ${!isFirst ? 'opacity-70' : ''}`}
                    title={`${z.nazev} — ${z.klient}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onZakazkaClick(z);
                    }}
                  >
                    {isFirst ? '● ' : '▬ '}{z.klient || z.nazev}
                  </div>
                );
              })}
              {hiddenCount > 0 && (
                <div
                  className="text-xs text-[var(--text-secondary)] pl-1 cursor-pointer hover:text-[var(--text)] transition-colors"
                  title={`Dalších ${hiddenCount} zakázek: ${dayZakazky.slice(3).map(z => z.klient || z.nazev).join(', ')}`}
                >
                  +{hiddenCount} dalších
                </div>
              )}
              {deadlineZpravy.map((z) => (
                <div
                  key={`dl-${z.id}`}
                  className={`text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 flex items-center ${isOverdue(dateStr) ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'}`}
                  title={`Zpráva: ${z.nazev} — ${z.klient}`}
                  onClick={(e) => { e.stopPropagation(); onZakazkaClick(z); }}
                >
                  <IconClipboard />{z.klient}
                </div>
              ))}
              {odevzdani.map((z) => (
                <div
                  key={`ov-${z.id}`}
                  className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 flex items-center bg-blue-500/20 text-blue-300"
                  title={`Odevzdání: ${z.nazev} — ${z.klient}`}
                  onClick={(e) => { e.stopPropagation(); onZakazkaClick(z); }}
                >
                  <IconCheck />{z.klient}
                </div>
              ))}
            </div>
          </div>
        );
      }
    }
  }

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousMonth}
          className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
          title="Předchozí měsíc (←)"
        >
          ◀
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-[var(--text)] capitalize flex items-center gap-2">
            {monthLabel}
            {monthCount > 0 && (
              <span className="text-sm font-normal text-[var(--text-muted)]">{monthCount} zakázek</span>
            )}
          </h2>
          <button
            onClick={goToToday}
            className="text-xs px-2 py-1 rounded bg-[var(--bg-accent-badge)] text-blue-300 hover:bg-blue-500/[0.25] transition-colors"
            title="Dnešek (T)"
          >
            Dnes
          </button>
        </div>
        <button
          onClick={goToNextMonth}
          className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
          title="Další měsíc (→)"
        >
          ▶
        </button>
      </div>

      {/* Mřížka */}
      <div className="grid grid-cols-[30px_repeat(7,1fr)] gap-0">
        <div className="p-2 text-center text-[10px] font-medium bg-[var(--bg-input)] border-b border-[var(--border)] text-[var(--text-muted)] opacity-50">Tý</div>
        {DAY_NAMES.map((den, i) => (
          <div
            key={den}
            className={`p-2 text-center text-sm font-medium bg-[var(--bg-input)] border-b border-[var(--border)] ${
              WEEKEND_INDICES.has(i) ? 'text-slate-500' : 'text-[var(--text-secondary)]'
            }`}
          >
            {den}
          </div>
        ))}
        {rows}
      </div>

      {/* Legenda + nápověda klávesnic */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--border)] flex-wrap">
        {LEGEND_ITEMS.map(l => (
          <span key={l.label} className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <span className={`h-2 w-2 rounded-sm ${l.color}`} />
            {l.label}
          </span>
        ))}
        <span className="ml-auto text-xs text-[var(--text-muted)] opacity-50">← T →</span>
      </div>
    </Card>
  );
}
