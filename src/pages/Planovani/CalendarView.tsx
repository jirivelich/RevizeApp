import { useState } from 'react';
import type { Zakazka } from '../../types';
import { Card } from '../../components/ui';
import { getPriorityColor, getRealizaceDays, getReportDeadline, isOverdue } from './utils';

interface CalendarViewProps {
  zakazky: Zakazka[];
  onDayClick: (dateStr: string) => void;
  onZakazkaClick: (zakazka: Zakazka) => void;
}

const DAY_NAMES = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

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

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  // getDay() returns 0=Sunday, convert to Monday-first (0=Monday)
  const startingDay = (firstDay.getDay() + 6) % 7;

  const isToday = (day: number) =>
    day === today.getDate() &&
    currentMonth === today.getMonth() &&
    currentYear === today.getFullYear();

  const formatDateStr = (day: number) =>
    `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const monthLabel = new Date(currentYear, currentMonth)
    .toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });

  const days: React.ReactNode[] = [];

  // Empty cells before first day
  for (let i = 0; i < startingDay; i++) {
    days.push(<div key={`empty-${i}`} className="p-2 bg-slate-50/50"></div>);
  }

  // Day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDateStr(day);

    // Zakázky s realizací v tento den
    const dayZakazky = zakazky.filter((z) => getRealizaceDays(z).includes(dateStr));

    // Deadline zpráv v tento den
    const deadlineZpravy = zakazky.filter((z) => {
      const dl = getReportDeadline(z);
      return dl === dateStr;
    });

    // Plánované odevzdání v tento den
    const odevzdani = zakazky.filter((z) => z.datumOdevzdaniZpravy === dateStr);

    const todayClass = isToday(day);

    days.push(
      <div
        key={day}
        className={`p-2 min-h-[90px] border border-slate-200 cursor-pointer hover:bg-blue-50/50 transition-colors ${
          todayClass ? 'bg-blue-50 ring-2 ring-blue-400 ring-inset' : 'bg-white'
        }`}
        onClick={() => onDayClick(dateStr)}
      >
        <span
          className={`text-sm font-medium inline-flex items-center justify-center w-7 h-7 rounded-full ${
            todayClass
              ? 'bg-slate-800 text-white'
              : 'text-slate-600'
          }`}
        >
          {day}
        </span>
        <div className="mt-1 space-y-1">
          {dayZakazky.slice(0, 3).map((z) => {
            const days = getRealizaceDays(z);
            const isFirst = days[0] === dateStr;
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
          {dayZakazky.length > 3 && (
            <div className="text-xs text-slate-400 pl-1">
              +{dayZakazky.length - 3} dalších
            </div>
          )}
          {deadlineZpravy.map((z) => (
            <div
              key={`dl-${z.id}`}
              className={`text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 ${isOverdue(dateStr) ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}
              title={`Zpráva: ${z.nazev} — ${z.klient}`}
              onClick={(e) => { e.stopPropagation(); onZakazkaClick(z); }}
            >
              📋 {z.klient}
            </div>
          ))}
          {odevzdani.map((z) => (
            <div
              key={`ov-${z.id}`}
              className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 bg-green-100 text-green-700"
              title={`Odevzdání: ${z.nazev} — ${z.klient}`}
              onClick={(e) => { e.stopPropagation(); onZakazkaClick(z); }}
            >
              ✓ {z.klient}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousMonth}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          title="Předchozí měsíc"
        >
          ◀
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-800 capitalize">
            {monthLabel}
          </h2>
          <button
            onClick={goToToday}
            className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
          >
            Dnes
          </button>
        </div>
        <button
          onClick={goToNextMonth}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          title="Další měsíc"
        >
          ▶
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0">
        {DAY_NAMES.map((den) => (
          <div
            key={den}
            className="p-2 text-center text-sm font-medium text-slate-600 bg-slate-50 border-b border-slate-200"
          >
            {den}
          </div>
        ))}
        {days}
      </div>
    </Card>
  );
}
