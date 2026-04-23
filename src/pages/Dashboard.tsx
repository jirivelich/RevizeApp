import { useMemo, useState, useEffect } from 'react';
import { useQuery as useRQQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
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
    <Link to={link} className={`group block rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow-elevated)] shadow-[var(--shadow-elevated)] p-3 transition-all hover:border-[var(--border-strong)] active:scale-[0.98] border-l-[3px] ${accent}`}>
      <p className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">{title}</p>
      <p className="mt-1 text-2xl font-bold text-[var(--text)] tracking-tight">{value}</p>
      {subtitle && <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{subtitle}</p>}
    </Link>
  );
}

function RevizeRow({ r }: { r: Revize }) {
  const stavConfig = {
    'dokončeno':    { dot: 'bg-emerald-500', bg: 'bg-emerald-500/[0.15] text-emerald-300' },
    'rozpracováno': { dot: 'bg-amber-500',   bg: 'bg-amber-500/[0.15] text-amber-300' },
    'schváleno':    { dot: 'bg-blue-500',    bg: 'bg-[var(--bg-accent-badge)] text-blue-300' },
  } as const;
  const cfg = stavConfig[r.stav] ?? { dot: 'bg-slate-400', bg: 'bg-[var(--bg-hover)] text-[var(--text-secondary)]' };

  return (
    <Link to={`/revize/${r.id}`} className="group flex items-center gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-faint)] px-2.5 py-2 transition-all hover:border-[var(--border-strong)]">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-[var(--text)] group-hover:text-slate-100 transition-colors">{r.nazev}</p>
        <p className="text-[11px] text-[var(--text-secondary)]">{r.cisloRevize} · {formatDate(r.datum)}</p>
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
  const urgency = days < 0 ? 'text-red-300 bg-red-500/[0.15]' : days <= 3 ? 'text-amber-300 bg-amber-500/[0.15]' : 'text-[var(--text-secondary)] bg-[var(--bg-input)]';
  const prioritaColor = {
    'vysoká': 'border-l-red-500',
    'střední': 'border-l-amber-400',
    'nizká': 'border-l-blue-400',
  }[z.priorita] ?? 'border-l-slate-600';

  return (
    <Link to={`/planovani`} className={`group flex items-center gap-2.5 rounded-lg border border-[var(--border)] border-l-[3px] ${prioritaColor} bg-[var(--bg-faint)] px-2.5 py-2 transition-all hover:border-[var(--border-strong)]`}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-[var(--text)] group-hover:text-slate-100 transition-colors">{z.nazev}</p>
        <p className="text-[11px] text-[var(--text-secondary)]">{z.klient}</p>
      </div>
      <span className={`whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-medium ${urgency}`}>
        {days < 0 ? `${Math.abs(days)}d po` : days === 0 ? 'Dnes' : `za ${days}d`}
      </span>
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
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow-elevated)] shadow-[var(--shadow-elevated)]">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-subtle)]">
        <h2 className="text-[13px] font-semibold text-[var(--text)]">{title}</h2>
        <div className="flex items-center gap-2">
          {count !== undefined && (
            <span className="text-[10px] font-medium text-[var(--text-muted)]">{count}</span>
          )}
          <Link to={viewAllLink} className="text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors">
            {viewAllLabel ?? 'Vše →'}
          </Link>
        </div>
      </div>
      <div className="p-3">
        {children.length > 0 ? (
          <div className="space-y-1.5">{children}</div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-xs text-[var(--text-secondary)] mb-1.5">{empty}</p>
            <Link to={emptyLink} className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors hover:underline">
              {emptyLabel}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══ Revize Bar Chart ═══ */

const CZ_MONTHS = ['Led','Úno','Bře','Dub','Kvě','Čvn','Čvc','Srp','Zář','Říj','Lis','Pro'];

function RevizeBarChart({ revize }: { revize: Revize[] }) {
  const bars = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const count = revize.filter(r => {
        const rd = new Date(r.datum);
        return rd.getFullYear() === d.getFullYear() && rd.getMonth() === d.getMonth();
      }).length;
      return { label: CZ_MONTHS[d.getMonth()], year: d.getFullYear(), month: d.getMonth(), count, isCurrent: i === 11 };
    });
  }, [revize]);

  const max = Math.max(...bars.map(b => b.count), 1);
  const total = bars.reduce((s, b) => s + b.count, 0);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow-elevated)]">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-subtle)]">
        <h2 className="text-[13px] font-semibold text-[var(--text)]">Revize za posledních 12 měsíců</h2>
        <span className="text-[11px] font-medium text-[var(--text-muted)]">{total} celkem</span>
      </div>
      <div className="px-4 py-4">
        <div className="flex items-end gap-1.5 h-28">
          {bars.map((b, i) => {
            const heightPct = max > 0 ? (b.count / max) * 100 : 0;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group" title={`${CZ_MONTHS[b.month]} ${b.year}: ${b.count} revizí`}>
                <span className={`text-[9px] font-medium transition-opacity ${b.count > 0 ? 'opacity-70 group-hover:opacity-100' : 'opacity-0'} text-[var(--text-secondary)]`}>
                  {b.count > 0 ? b.count : ''}
                </span>
                <div className="w-full flex items-end" style={{ height: 72 }}>
                  <div
                    className="w-full rounded-sm transition-all duration-300"
                    style={{
                      height: b.count === 0 ? 2 : `${Math.round(heightPct)}%`,
                      background: b.isCurrent
                        ? 'var(--primary)'
                        : b.count === 0
                        ? 'var(--border)'
                        : 'rgba(146,196,59,0.45)',
                      minHeight: b.count === 0 ? 2 : 4,
                    }}
                  />
                </div>
                <span className={`text-[8px] font-medium ${b.isCurrent ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>
                  {b.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
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

function WeatherInline() {
  const { data, isLoading } = useWeather();
  const today = new Date().toISOString().slice(0, 10);
  const day = data?.find(d => d.date === today);
  if (isLoading) return <span className="text-[12px] text-[var(--text-muted)] animate-pulse">načítám…</span>;
  if (!day) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xl leading-none">{wmoToEmoji(day.code)}</span>
      <span className="text-[14px] font-semibold text-[var(--text)]">{day.max}°</span>
      <span className="text-[13px] text-[var(--text-muted)]">{day.min}°</span>
      {day.precip > 0 && <span className="text-[11px] text-blue-400">💧{day.precip}%</span>}
      <span className="text-[11px] text-[var(--text-muted)]">Tachov</span>
    </div>
  );
}

const DAY_HEADERS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'] as const;

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
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
        className="relative z-10 w-full max-w-sm rounded-xl border border-[var(--border-medium)] bg-[var(--surface)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <p className="text-[13px] font-semibold text-[var(--text)] capitalize">{label}</p>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors text-lg leading-none">×</button>
        </div>
        <div className="p-3 space-y-1.5 max-h-72 overflow-y-auto">
          {zakazky.map((z) => {
            const priorityBorder = z.priorita === 'vysoká' ? 'border-l-red-500' : z.priorita === 'střední' ? 'border-l-amber-400' : 'border-l-blue-400';
            const stavColor = z.stav === 'dokončeno' ? 'text-[var(--text-muted)]' : z.stav === 'v realizaci' ? 'text-amber-400' : 'text-blue-400';
            return (
              <Link
                key={z.id}
                to="/planovani"
                onClick={onClose}
                className={`block rounded-lg border border-[var(--border)] border-l-[3px] ${priorityBorder} bg-[var(--bg-surface)] px-3 py-2 hover:bg-white/[0.07] transition-colors`}
              >
                <p className="text-[13px] font-medium text-[var(--text)] truncate">{z.nazev}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-[11px] text-[var(--text-secondary)] truncate">{z.klient}</p>
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

const LEGEND_ITEMS = [
  { color: 'bg-red-500', label: 'Vysoká priorita' },
  { color: 'bg-amber-400', label: 'Střední' },
  { color: 'bg-blue-400', label: 'Nízká' },
  { color: 'bg-slate-400', label: 'Dokončeno' },
] as const;

function MonthCalendar({ zakazky }: { zakazky: Zakazka[] }) {
  const today = new Date();
  const [offset, setOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<{ day: Date; zakazky: Zakazka[] } | null>(null);
  const navigate = useNavigate();

  // Klávesová navigace: ← → pro měsíce, T pro dnešek
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft') setOffset(o => o - 1);
      else if (e.key === 'ArrowRight') setOffset(o => o + 1);
      else if (e.key === 't' || e.key === 'T') setOffset(0);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const viewDate = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    return d;
  }, [offset, today.getFullYear(), today.getMonth()]);

  const cells = useMemo(() => getMonthGrid(viewDate.getFullYear(), viewDate.getMonth()), [viewDate]);
  const startDow = useMemo(() => (new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay() + 6) % 7, [viewDate]);

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

  // Počet zakázek v zobrazovaném měsíci
  const monthCount = useMemo(() => {
    return zakazky.filter(z => {
      if (!z.datumPlanovany) return false;
      const d = new Date(z.datumPlanovany);
      return d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear();
    }).length;
  }, [zakazky, viewDate]);

  const monthLabel = viewDate.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });

  return (
    <>
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow-elevated)] shadow-[var(--shadow-elevated)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)]">
        <h2 className="text-[13px] font-semibold text-[var(--text)] capitalize flex items-center gap-2">
          {monthLabel}
          {monthCount > 0 && (
            <span className="text-[10px] font-normal text-[var(--text-muted)]">{monthCount} zakázek</span>
          )}
        </h2>
        <div className="flex items-center gap-1">
          <button title="Předchozí měsíc (←)" onClick={() => setOffset(o => o - 1)} className="h-6 w-6 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors text-xs">‹</button>
          <button onClick={() => setOffset(0)} className="px-2 py-0.5 rounded text-[10px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors">Dnes</button>
          <button title="Další měsíc (→)" onClick={() => setOffset(o => o + 1)} className="h-6 w-6 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors text-xs">›</button>
        </div>
      </div>
      {/* Day headers */}
      <div className="grid grid-cols-[20px_repeat(7,1fr)] border-b border-[var(--border-subtle)]">
        <div className="py-1 text-center text-[8px] font-semibold uppercase tracking-wider text-[var(--text-muted)] opacity-50">Tý</div>
        {DAY_HEADERS.map((d, i) => (
          <div key={d} className={`py-1 text-center text-[9px] font-semibold uppercase tracking-wider ${i >= 5 ? 'text-slate-500' : 'text-[var(--text-secondary)]'}`}>{d}</div>
        ))}
      </div>
      {/* Cells */}
      <div className="grid grid-cols-[20px_repeat(7,1fr)]">
        {Array.from({ length: cells.length / 7 }, (_, r) => {
          const rowMonday = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1 - startDow + r * 7);
          const weekNum = getISOWeek(rowMonday);
          return [
            <div key={`wn-${r}`} className="min-h-[36px] border-t border-[var(--border-subtle)] flex items-start justify-center pt-1">
              <span className="text-[8px] font-medium text-[var(--text-muted)] opacity-50 tabular-nums leading-none">{weekNum}</span>
            </div>,
            ...cells.slice(r * 7, r * 7 + 7).map((day, col) => {
              const i = r * 7 + col;
              if (!day) return <div key={`e${i}`} className="min-h-[36px] bg-white/[0.01]" />;
              const isToday = isSameDay(day, today);
              const isPast = day < today && !isToday;
              const isWeekend = col >= 5;
              const dayZ = zakazkyByDay.get(day.toDateString()) ?? [];
              const hasEvents = dayZ.length > 0;
              const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
              return (
                <div
                  key={i}
                  onClick={() => {
                    if (hasEvents) {
                      setSelectedDay({ day, zakazky: dayZ });
                    } else {
                      navigate(`/planovani?datum=${dateStr}`);
                    }
                  }}
                  className={`relative min-h-[36px] border-t border-r border-[var(--border-subtle)] px-0.5 py-1 flex flex-col items-center cursor-pointer transition-colors ${
                    isToday ? 'bg-[var(--bg-surface)]' : isWeekend ? 'bg-white/[0.015]' : ''
                  } ${isPast && !hasEvents ? 'opacity-30' : isPast ? 'opacity-60' : ''} ${
                    hasEvents ? 'hover:bg-[var(--bg-accent)]' : 'hover:bg-white/[0.04]'
                  }`}
                >
                  <p className={`text-center text-[11px] font-medium leading-none ${
                    isToday
                      ? 'flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[10px]'
                      : isWeekend ? 'text-slate-500' : 'text-[var(--text-secondary)]'
                  }`}>{day.getDate()}</p>
                  {hasEvents && (
                    <div className="mt-1 flex items-center justify-center gap-0.5 flex-wrap">
                      {dayZ.slice(0, 3).map((z) => {
                        const color = z.stav === 'dokončeno' ? 'bg-slate-400' : z.priorita === 'vysoká' ? 'bg-red-500' : z.priorita === 'střední' ? 'bg-amber-400' : 'bg-blue-400';
                        return (
                          <span
                            key={z.id}
                            className={`h-1.5 w-1.5 rounded-full ${color}`}
                            title={`${z.nazev} — ${z.klient}`}
                          />
                        );
                      })}
                      {dayZ.length > 3 && (
                        <span className="text-[7px] font-bold text-[var(--text-secondary)]">+{dayZ.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            }),
          ];
        })}
      </div>
      {/* Legenda */}
      <div className="flex items-center gap-3 px-3 py-2 border-t border-[var(--border-subtle)] flex-wrap">
        {LEGEND_ITEMS.map(l => (
          <span key={l.label} className="flex items-center gap-1 text-[9px] text-[var(--text-muted)]">
            <span className={`h-1.5 w-1.5 rounded-full ${l.color}`} />
            {l.label}
          </span>
        ))}
        <span className="ml-auto text-[9px] text-[var(--text-muted)] opacity-50">← T →</span>
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

  const { stats, recentRevize, upcomingZakazky } = useMemo(() => {
    const dokonceno = revize.filter(r => r.stav === 'dokončeno' || r.stav === 'schváleno').length;
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    const pristrojeKRekalibraci = pristroje.filter((p: MericiPristroj) => {
      if (!p.platnostKalibrace) return false;
      return new Date(p.platnostKalibrace) <= in30Days;
    }).length;

    return {
      stats: {
        celkemRevizi: revize.length,
        dokonceno,
        rozpracovano: revize.filter(r => r.stav === 'rozpracováno').length,
        pristrojeKRekalibraci,
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
    };
  }, [revize, pristroje, zakazky]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
        <p className="mt-4 text-sm font-medium text-[var(--text-muted)]">Načítání dashboardu…</p>
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
      {/* ═══ Header + Počasí inline ═══ */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-lg font-bold text-[var(--text)]">{greeting}</h1>
          <p className="text-xs text-[var(--text-secondary)] capitalize">{todayLabel}</p>
          <WeatherInline />
        </div>
        <div className="flex gap-1.5 shrink-0 mt-1">
          <Link to="/revize" className="inline-flex items-center rounded border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--text)] hover:bg-white/[0.09] transition-colors">
            + Revize
          </Link>
          <Link to="/planovani" className="inline-flex items-center rounded border border-[var(--primary)] bg-[var(--primary)] px-2.5 py-1 text-[11px] font-medium text-white hover:opacity-90 transition-opacity">
            + Zakázka
          </Link>
        </div>
      </div>

      {/* ═══ Hlavní grid ═══ */}
      <div className="grid grid-cols-3 gap-4 items-start">
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

        {/* Kalendář — pravý sloupec přes oba řádky */}
        <div className="row-span-2">
          <MonthCalendar zakazky={zakazky} />
        </div>

        {/* Stat karty — levý blok col-span-2 */}
        <div className="col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
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
      </div>

      {/* ═══ Graf revizí ═══ */}
      <RevizeBarChart revize={revize} />
    </div>
  );
}
