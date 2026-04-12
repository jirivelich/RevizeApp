import { useMemo, useState } from 'react';
import { useQuery as useRQQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useRevize, usePristroje, useZakazky } from '../hooks/useQueries';
import type { MericiPristroj, Revize, Zakazka } from '../types';

/* ═══ Helpers ═══ */
const formatDate = (d: string) => new Date(d).toLocaleDateString('cs-CZ');

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

/* ═══ Sub-components ═══ */

function StatCard({ title, value, subtitle, accent, link }: {
  title: string; value: number; subtitle?: string;
  accent: string; link: string;
}) {
  return (
    <Link to={link} className={`group block rounded-lg border border-white/[0.07] bg-white/[0.03] p-3 transition-all hover:border-white/[0.12] active:scale-[0.98] border-l-[3px] ${accent}`}>
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{title}</p>
      <p className="mt-1 text-2xl font-bold text-slate-200 tracking-tight">{value}</p>
      {subtitle && <p className="mt-0.5 text-[10px] text-slate-500">{subtitle}</p>}
    </Link>
  );
}

function RevizeRow({ r }: { r: Revize }) {
  const stavConfig = {
    'dokončeno':    { dot: 'bg-emerald-500', bg: 'bg-emerald-500/[0.15] text-emerald-300' },
    'rozpracováno': { dot: 'bg-amber-500',   bg: 'bg-amber-500/[0.15] text-amber-300' },
    'schváleno':    { dot: 'bg-blue-500',    bg: 'bg-blue-500/[0.15] text-blue-300' },
  } as const;
  const cfg = stavConfig[r.stav] ?? { dot: 'bg-slate-400', bg: 'bg-white/[0.06] text-slate-400' };

  return (
    <Link to={`/revize/${r.id}`} className="group flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 transition-all hover:border-white/[0.12]">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-slate-300 group-hover:text-slate-100 transition-colors">{r.nazev}</p>
        <p className="text-[11px] text-slate-400">{r.cisloRevize} · {formatDate(r.datum)}</p>
      </div>
      <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-medium ${cfg.bg}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
        {r.stav}
      </span>
    </Link>
  );
}

function ZakazkaRow({ z }: { z: Zakazka }) {
  const days = daysUntil(z.datumPlanovany);
  const urgency = days < 0 ? 'text-red-300 bg-red-500/[0.15]' : days <= 3 ? 'text-amber-300 bg-amber-500/[0.15]' : 'text-slate-400 bg-white/[0.04]';
  const prioritaColor = {
    'vysoká': 'border-l-red-500',
    'střední': 'border-l-amber-400',
    'nizká': 'border-l-blue-400',
  }[z.priorita] ?? 'border-l-slate-600';

  return (
    <Link to={`/planovani`} className={`group flex items-center gap-2.5 rounded-lg border border-white/[0.06] border-l-[3px] ${prioritaColor} bg-white/[0.02] px-2.5 py-2 transition-all hover:border-white/[0.12]`}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-slate-300 group-hover:text-slate-100 transition-colors">{z.nazev}</p>
        <p className="text-[11px] text-slate-400">{z.klient}</p>
      </div>
      <span className={`whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-medium ${urgency}`}>
        {days < 0 ? `${Math.abs(days)}d po` : days === 0 ? 'Dnes' : `za ${days}d`}
      </span>
    </Link>
  );
}

function PristrojRow({ p }: { p: MericiPristroj }) {
  const expired = new Date(p.platnostKalibrace) < new Date();
  const days = daysUntil(p.platnostKalibrace);
  return (
    <Link to="/pristroje" className="group flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 transition-all hover:border-white/[0.12]">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-slate-300 group-hover:text-slate-100 transition-colors">{p.nazev}</p>
        <p className="text-[11px] text-slate-400">{p.vyrobce} {p.model} · {p.vyrobniCislo}</p>
      </div>
      <div className="text-right shrink-0">
        <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium ${expired ? 'bg-red-500/[0.15] text-red-300' : 'bg-white/[0.06] text-slate-400'}`}>
          {expired ? `${Math.abs(days)}d po termu00ednu` : `za ${days}d`}
        </span>
        <p className="text-[10px] text-slate-400">{formatDate(p.platnostKalibrace)}</p>
      </div>
    </Link>
  );
}

function SectionCard({ title, icon: _icon, count, viewAllLink, viewAllLabel, empty, emptyLink, emptyLabel, children }: {
  title: string; icon: string; count?: number;
  viewAllLink: string; viewAllLabel?: string;
  empty: string; emptyLink: string; emptyLabel: string;
  children: React.ReactNode[];
}) {
  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.03]">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.05]">
        <h2 className="text-[13px] font-semibold text-slate-200">{title}</h2>
        <div className="flex items-center gap-2">
          {count !== undefined && (
            <span className="text-[10px] font-medium text-slate-500">{count}</span>
          )}
          <Link to={viewAllLink} className="text-[11px] font-medium text-slate-400 hover:text-slate-200 transition-colors">
            {viewAllLabel ?? 'Vše →'}
          </Link>
        </div>
      </div>
      <div className="p-3">
        {children.length > 0 ? (
          <div className="space-y-1.5">{children}</div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-xs text-slate-400 mb-1.5">{empty}</p>
            <Link to={emptyLink} className="text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors hover:underline">
              {emptyLabel}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══ Today Panel ═══ */

const QUICK_ACTIONS = [
  { label: 'Nová revize', to: '/revize', icon: '📋' },
  { label: 'Naplánovat zakázku', to: '/planovani', icon: '📅' },
  { label: 'Přidat firmu', to: '/firmy', icon: '🏢' },
  { label: 'Přístroje', to: '/pristroje', icon: '🔧' },
] as const;

function TodayPanel({ zakazky }: { zakazky: Zakazka[] }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayZakazky = zakazky.filter(
    z => z.datumPlanovany === todayStr && (z.stav === 'plánováno' || z.stav === 'v realizaci')
  ).sort((a, b) => (a.casPlanovany ?? '99:99').localeCompare(b.casPlanovany ?? '99:99'));

  const prioritaBar = {
    'vysoká': 'border-l-red-500',
    'střední': 'border-l-amber-400',
    'nizká': 'border-l-blue-400',
  } as const;

  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.03]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.05]">
        <h2 className="text-[13px] font-semibold text-slate-200">Dnes</h2>
        <Link to="/planovani" className="text-[11px] font-medium text-slate-400 hover:text-slate-200 transition-colors">
          Vše →
        </Link>
      </div>
      {todayZakazky.length > 0 ? (
        <div className="divide-y divide-white/[0.05]">
          {todayZakazky.map(z => (
            <Link
              key={z.id}
              to="/planovani"
              className={`group flex items-center gap-3 px-4 py-2.5 border-l-[3px] ${prioritaBar[z.priorita] ?? 'border-l-slate-600'} hover:bg-white/[0.04] transition-colors`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-slate-300 group-hover:text-slate-100">{z.nazev}</p>
                <p className="text-[11px] text-slate-400">{z.klient}</p>
              </div>
              {z.casPlanovany && (
                <span className="shrink-0 text-[11px] font-medium text-slate-400 bg-white/[0.06] rounded px-2 py-0.5">
                  {z.casPlanovany}
                </span>
              )}
              {z.stav === 'v realizaci' && (
                <span className="shrink-0 text-[10px] font-medium text-amber-300 bg-amber-500/[0.15] rounded px-2 py-0.5">provádí se</span>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="p-3 grid grid-cols-2 gap-2">
          {QUICK_ACTIONS.map(a => (
            <Link
              key={a.to}
              to={a.to}
              className="flex items-center gap-2 rounded-lg border border-white/[0.07] px-3 py-2.5 text-[12px] font-medium text-slate-300 hover:bg-white/[0.04] hover:border-white/[0.12] transition-all"
            >
              <span className="text-base leading-none">{a.icon}</span>
              {a.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══ Weather ═══ */

const WEATHER_URL =
  'https://api.open-meteo.com/v1/forecast' +
  '?latitude=49.7973&longitude=12.6352' +
  '&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
  '&timezone=Europe%2FPrague&forecast_days=5';

function wmoToEmoji(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 3) return '🌤️';
  if (code <= 48) return '🌫️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  return '⛈️';
}

interface WeatherDay {
  date: string;
  code: number;
  max: number;
  min: number;
  precip: number;
}

function useWeather() {
  return useRQQuery<WeatherDay[]>({
    queryKey: ['weather'],
    queryFn: async () => {
      const res = await fetch(WEATHER_URL);
      if (!res.ok) throw new Error('weather fetch failed');
      const json = await res.json();
      const d = json.daily;
      return (d.time as string[]).map((date: string, i: number) => ({
        date,
        code: d.weathercode[i] as number,
        max: Math.round(d.temperature_2m_max[i] as number),
        min: Math.round(d.temperature_2m_min[i] as number),
        precip: d.precipitation_probability_max[i] as number,
      }));
    },
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
}

const CZ_DAYS = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];

function WeatherWidget() {
  const { data, isError, isLoading } = useWeather();

  if (isError || (!isLoading && !data)) return null;

  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.03]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.05]">
        <h2 className="text-[13px] font-semibold text-slate-200">Počasí — Tachov</h2>
        <span className="text-[10px] text-slate-500">Open-Meteo</span>
      </div>
      <div className="grid grid-cols-5 divide-x divide-white/[0.05]">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1 py-3 px-2">
                <div className="h-3 w-6 rounded bg-white/[0.08] animate-pulse" />
                <div className="h-6 w-6 rounded bg-white/[0.08] animate-pulse" />
                <div className="h-3 w-10 rounded bg-white/[0.08] animate-pulse" />
                <div className="h-3 w-8 rounded bg-white/[0.08] animate-pulse" />
              </div>
            ))
          : data!.map((day) => {
              const d = new Date(day.date);
              const dayName = CZ_DAYS[d.getDay()];
              const isToday = day.date === new Date().toISOString().slice(0, 10);
              return (
                <div key={day.date} className={`flex flex-col items-center gap-0.5 py-3 px-2 ${isToday ? 'bg-white/[0.05]' : ''}`}>
                  <p className={`text-[11px] font-semibold ${isToday ? 'text-slate-200' : 'text-slate-400'}`}>
                    {isToday ? 'Dnes' : dayName}
                  </p>
                  <span className="text-xl leading-none">{wmoToEmoji(day.code)}</span>
                  <p className="text-[12px] font-medium text-slate-300">
                    {day.max}° <span className="text-slate-500 font-normal">{day.min}°</span>
                  </p>
                  {day.precip > 0 && (
                    <p className="text-[10px] text-blue-500">💧 {day.precip}%</p>
                  )}
                </div>
              );
            })}
      </div>
    </div>
  );
}

const DAY_HEADERS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'] as const;

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const startDow = (first.getDay() + 6) % 7; // 0=Po
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function DayPopup({ day, zakazky, onClose }: { day: Date; zakazky: Zakazka[]; onClose: () => void }) {
  const label = day.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative z-10 w-full max-w-sm rounded-xl border border-white/[0.08] bg-[#0e1629] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <p className="text-[13px] font-semibold text-slate-200 capitalize">{label}</p>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors text-lg leading-none">×</button>
        </div>
        <div className="p-3 space-y-1.5 max-h-72 overflow-y-auto">
          {zakazky.map((z) => {
            const priorityBorder = z.priorita === 'vysoká' ? 'border-l-red-500' : z.priorita === 'střední' ? 'border-l-amber-400' : 'border-l-blue-400';
            const stavColor = z.stav === 'dokončeno' ? 'text-slate-500' : z.stav === 'v realizaci' ? 'text-amber-400' : 'text-blue-400';
            return (
              <Link
                key={z.id}
                to="/planovani"
                onClick={onClose}
                className={`block rounded-lg border border-white/[0.06] border-l-[3px] ${priorityBorder} bg-white/[0.03] px-3 py-2 hover:bg-white/[0.07] transition-colors`}
              >
                <p className="text-[13px] font-medium text-slate-200 truncate">{z.nazev}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-[11px] text-slate-400 truncate">{z.klient}</p>
                  <span className={`text-[10px] font-medium capitalize ${stavColor}`}>{z.stav}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MonthCalendar({ zakazky }: { zakazky: Zakazka[] }) {
  const today = new Date();
  const [offset, setOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<{ day: Date; zakazky: Zakazka[] } | null>(null);
  const viewDate = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    return d;
  }, [offset, today.getFullYear(), today.getMonth()]);

  const cells = useMemo(() => getMonthGrid(viewDate.getFullYear(), viewDate.getMonth()), [viewDate]);

  const zakazkyByDay = useMemo(() => {
    const map = new Map<string, Zakazka[]>();
    for (const z of zakazky) {
      if (!z.datumPlanovany) continue;
      const key = new Date(z.datumPlanovany).toDateString();
      const arr = map.get(key) ?? [];
      arr.push(z);
      map.set(key, arr);
    }
    return map;
  }, [zakazky]);

  const monthLabel = viewDate.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });

  return (
    <>
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.03]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.05]">
        <h2 className="text-[13px] font-semibold text-slate-200 capitalize">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <button onClick={() => setOffset(o => o - 1)} className="h-6 w-6 flex items-center justify-center rounded hover:bg-white/[0.06] text-slate-500 hover:text-slate-200 transition-colors text-xs">‹</button>
          <button onClick={() => setOffset(0)} className="px-2 py-0.5 rounded text-[10px] font-medium text-slate-400 hover:bg-white/[0.06] transition-colors">Dnes</button>
          <button onClick={() => setOffset(o => o + 1)} className="h-6 w-6 flex items-center justify-center rounded hover:bg-white/[0.06] text-slate-500 hover:text-slate-200 transition-colors text-xs">›</button>
        </div>
      </div>
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-white/[0.05]">
        {DAY_HEADERS.map((d, i) => (
          <div key={d} className={`py-1 text-center text-[9px] font-semibold uppercase tracking-wider ${i >= 5 ? 'text-slate-300' : 'text-slate-400'}`}>{d}</div>
        ))}
      </div>
      {/* Cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} className="min-h-[36px] bg-white/[0.01]" />;
          const isToday = isSameDay(day, today);
          const isPast = day < today && !isToday;
          const dow = i % 7;
          const isWeekend = dow >= 5;
          const dayZ = zakazkyByDay.get(day.toDateString()) ?? [];
          const hasEvents = dayZ.length > 0;
          return (
            <div
              key={i}
              onClick={() => hasEvents && setSelectedDay({ day, zakazky: dayZ })}
              className={`relative min-h-[36px] border-t border-r border-white/[0.05] px-0.5 py-1 flex flex-col items-center ${
                isToday ? 'bg-white/[0.05]' : ''
              } ${isPast && !hasEvents ? 'opacity-30' : isPast ? 'opacity-60' : ''} ${hasEvents ? 'cursor-pointer hover:bg-blue-500/[0.10] transition-colors' : ''}`}
            >
              <p className={`text-center text-[11px] font-medium leading-none ${
                isToday
                  ? 'flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[10px]'
                  : isWeekend ? 'text-slate-400' : 'text-slate-400'
              }`}>{day.getDate()}</p>
              {hasEvents && (
                <div className="mt-1 flex items-center justify-center gap-0.5 flex-wrap">
                  {dayZ.slice(0, 3).map((z) => {
                    const color = z.stav === 'dokončeno' ? 'bg-slate-400' : z.priorita === 'vysoká' ? 'bg-red-500' : z.priorita === 'střední' ? 'bg-amber-400' : 'bg-blue-400';
                    return <span key={z.id} className={`h-1.5 w-1.5 rounded-full ${color}`} />;
                  })}
                  {dayZ.length > 3 && (
                    <span className="text-[7px] font-bold text-slate-400">+{dayZ.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
    {selectedDay && (
      <DayPopup
        day={selectedDay.day}
        zakazky={selectedDay.zakazky}
        onClose={() => setSelectedDay(null)}
      />
    )}
    </>
  );
}

/* ═══ Dashboard ═══ */

export function Dashboard() {
  const { data: revize = [], isLoading: loadingRevize } = useRevize();
  const { data: pristroje = [], isLoading: loadingPristroje } = usePristroje();
  const { data: zakazky = [], isLoading: loadingZakazky } = useZakazky();

  const isLoading = loadingRevize || loadingPristroje || loadingZakazky;

  const { stats, recentRevize, upcomingZakazky, expiringPristroje } = useMemo(() => {
    const today = new Date();
    const in30Days = new Date();
    in30Days.setDate(today.getDate() + 30);

    const expiringOrExpired = pristroje.filter((p: MericiPristroj) => {
      if (!p.platnostKalibrace) return false;
      return new Date(p.platnostKalibrace) <= in30Days;
    });

    const dokonceno = revize.filter(r => r.stav === 'dokončeno' || r.stav === 'schváleno').length;

    return {
      stats: {
        celkemRevizi: revize.length,
        dokonceno,
        rozpracovano: revize.filter(r => r.stav === 'rozpracováno').length,
        pristrojeKRekalibraci: expiringOrExpired.length,
        planovaneZakazky: zakazky.filter(z => z.stav === 'plánováno').length,
      },
      recentRevize: revize
        .filter(r => r.stav === 'rozpracováno')
        .sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())
        .slice(0, 5),
      upcomingZakazky: zakazky
        .filter(z => z.stav === 'plánováno')
        .sort((a, b) => new Date(a.datumPlanovany).getTime() - new Date(b.datumPlanovany).getTime())
        .slice(0, 5),
      expiringPristroje: expiringOrExpired
        .sort((a, b) => new Date(a.platnostKalibrace).getTime() - new Date(b.platnostKalibrace).getTime())
        .slice(0, 5),
    };
  }, [revize, pristroje, zakazky]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
        <p className="mt-4 text-sm font-medium text-slate-500">Načítání dashboardu…</p>
      </div>
    );
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Dobré ráno';
    if (h < 18) return 'Dobré odpoledne';
    return 'Dobrý večer';
  })();

  const todayLabel = new Date().toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-200">{greeting}</h1>
          <p className="text-xs text-slate-400 capitalize">{todayLabel}</p>
        </div>
        <div className="flex gap-1.5">
          <Link to="/revize" className="inline-flex items-center rounded border border-white/[0.10] bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/[0.09] transition-colors">
            + Revize
          </Link>
          <Link to="/planovani" className="inline-flex items-center rounded border border-blue-600 bg-blue-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-blue-500 transition-colors">
            + Zakázka
          </Link>
        </div>
      </div>

      {/* ═══ Stat karty ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <StatCard
          title="Celkem revizí"
          value={stats.celkemRevizi}
          subtitle={`${stats.dokonceno} dokončených`}
          accent="border-l-slate-400"
          link="/revize"
        />
        <StatCard
          title="Rozpracováno"
          value={stats.rozpracovano}
          subtitle="čeká na dokončení"
          accent="border-l-amber-400"
          link="/revize"
        />
        <StatCard
          title="K rekalibraci"
          value={stats.pristrojeKRekalibraci}
          subtitle="do 30 dnů"
          accent="border-l-red-400"
          link="/pristroje"
        />
        <StatCard
          title="Plánované zakázky"
          value={stats.planovaneZakazky}
          subtitle="naplánováno"
          accent="border-l-emerald-400"
          link="/planovani"
        />
      </div>

      {/* ═══ Počasí + Dnes + Kalendář ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div className="flex flex-col gap-4">
          <WeatherWidget />
          <TodayPanel zakazky={zakazky} />
        </div>
        <MonthCalendar zakazky={zakazky} />
      </div>

      {/* ═══ Sekce: revize + zakázky ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard
          title="Rozpracované revize"
          icon=""
          count={stats.rozpracovano}
          viewAllLink="/revize"
          empty="Zatím nemáte žádné revize."
          emptyLink="/revize"
          emptyLabel="Vytvořit první revizi →"
        >
          {recentRevize.map(r => <RevizeRow key={r.id} r={r} />)}
        </SectionCard>

        <SectionCard
          title="Nadcházející zakázky"
          icon=""
          count={stats.planovaneZakazky}
          viewAllLink="/planovani"
          empty="Žádné plánované zakázky."
          emptyLink="/planovani"
          emptyLabel="Naplánovat zakázku →"
        >
          {upcomingZakazky.map(z => <ZakazkaRow key={z.id} z={z} />)}
        </SectionCard>
      </div>

      {/* ═══ Přístroje k rekalibraci ═══ */}
      {expiringPristroje.length > 0 && (
        <SectionCard
          title="Přístroje k rekalibraci"
          icon=""
          count={expiringPristroje.length}
          viewAllLink="/pristroje"
          viewAllLabel="Všechny přístroje →"
          empty=""
          emptyLink="/pristroje"
          emptyLabel=""
        >
          {expiringPristroje.map(p => <PristrojRow key={p.id} p={p} />)}
        </SectionCard>
      )}
    </div>
  );
}
