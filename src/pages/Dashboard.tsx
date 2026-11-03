import { useMemo, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useQuery as useRQQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useRevize, usePristroje, useZakazky } from '../hooks/useQueries';
import { Badge, PageHeader } from '../components/ui';
import type { BadgeVariant } from '../components/ui';
import type { MericiPristroj, Revize, Zakazka } from '../types';

/* ═══ Helpers ═══ */
const formatDate = (d: string) => new Date(d).toLocaleDateString('cs-CZ');

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

/* ═══ Sub-components ═══ */

type StatTint = 'blue' | 'amber' | 'danger' | 'success';

const tintClasses: Record<StatTint, string> = {
  blue: 'text-[var(--primary)]',
  amber: 'text-[var(--warning-text)]',
  danger: 'text-[var(--danger-text)]',
  success: 'text-[var(--success-text)]',
};

const accentBorder: Record<StatTint, string> = {
  blue: 'border-l-[var(--primary)]',
  amber: 'border-l-[var(--warning)]',
  danger: 'border-l-[var(--danger)]',
  success: 'border-l-[var(--success)]',
};

function StatCard({ title, value, subtitle, icon, tint, link }: {
  title: string; value: number; subtitle?: string;
  icon: ReactNode; tint: StatTint; link: string;
}) {
  return (
    <Link to={link} className={`group block rounded-[var(--radius-lg)] border border-[var(--border)] border-l-[3px] ${accentBorder[tint]} bg-[var(--bg-surface)] p-4 transition-colors hover:border-[var(--border-strong)]`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[var(--text-secondary)]">{title}</p>
        <span className={tintClasses[tint]}>{icon}</span>
      </div>
      <p className="mt-1 text-[26px] leading-tight font-bold tabular-nums text-[var(--text)] tracking-tight">{value}</p>
      {subtitle && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{subtitle}</p>}
    </Link>
  );
}

const STAV_BADGE_VARIANT: Record<string, BadgeVariant> = {
  'dokončeno': 'success',
  'rozpracováno': 'warning',
  'schváleno': 'info',
};

function RevizeRow({ r }: { r: Revize }) {
  return (
    <Link to={`/revize/${r.id}`} className="group flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-faint)] px-3 min-h-[44px] py-1.5 transition-colors hover:border-[var(--border-strong)]">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--text)]">{r.nazev}</p>
        <p className="text-xs text-[var(--text-secondary)]">{r.cisloRevize} · {formatDate(r.datum)}</p>
      </div>
      <Badge variant={STAV_BADGE_VARIANT[r.stav] ?? 'neutral'}>{r.stav}</Badge>
    </Link>
  );
}

function ZakazkaRow({ z }: { z: Zakazka }) {
  const days = daysUntil(z.datumPlanovany);
  const urgencyVariant: BadgeVariant = days < 0 ? 'danger' : days <= 3 ? 'warning' : 'neutral';
  const prioritaColor = {
    'vysoká': 'border-l-[var(--danger)]',
    'střední': 'border-l-[var(--warning)]',
    'nizká': 'border-l-[var(--secondary)]',
  }[z.priorita] ?? 'border-l-[var(--border-strong)]';

  return (
    <Link to={`/planovani`} className={`group flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--border)] border-l-[3px] ${prioritaColor} bg-[var(--bg-faint)] px-3 min-h-[44px] py-1.5 transition-colors hover:border-[var(--border-strong)]`}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--text)]">{z.nazev}</p>
        <p className="text-xs text-[var(--text-secondary)]">{z.klient}</p>
      </div>
      <Badge variant={urgencyVariant}>{days < 0 ? `${Math.abs(days)}d po` : days === 0 ? 'Dnes' : `za ${days}d`}</Badge>
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
    <div className="h-full flex flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)]">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-subtle)]">
        <h2 className="text-sm font-semibold text-[var(--text)]">{title}</h2>
        <div className="flex items-center gap-2">
          {count !== undefined && (
            <span className="text-xs font-medium text-[var(--text-muted)]">{count}</span>
          )}
          <Link to={viewAllLink} className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors">
            {viewAllLabel ?? 'Vše →'}
          </Link>
        </div>
      </div>
      <div className="flex-1 p-3">
        {children.length > 0 ? (
          <div className="space-y-1.5">{children}</div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-sm text-[var(--text-secondary)] mb-1.5">{empty}</p>
            <Link to={emptyLink} className="text-sm font-medium text-[var(--primary)] hover:underline">
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
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)]">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-subtle)]">
        <h2 className="text-sm font-semibold text-[var(--text)]">Revize za posledních 12 měsíců</h2>
        <span className="text-xs font-medium text-[var(--text-muted)]">{total} celkem</span>
      </div>
      <div className="px-4 py-4">
        <div className="flex items-end gap-1.5 h-28">
          {bars.map((b, i) => {
            const heightPct = max > 0 ? (b.count / max) * 100 : 0;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group" title={`${CZ_MONTHS[b.month]} ${b.year}: ${b.count} revizí`}>
                <span className={`text-xs font-medium transition-opacity ${b.count > 0 ? 'opacity-70 group-hover:opacity-100' : 'opacity-0'} text-[var(--text-secondary)]`}>
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
                        : 'color-mix(in srgb, var(--primary) 40%, transparent)',
                      minHeight: b.count === 0 ? 2 : 4,
                    }}
                  />
                </div>
                <span className={`text-xs font-medium ${b.isCurrent ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>
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
  if (isLoading) return <span className="text-xs text-[var(--text-muted)] animate-pulse">načítám…</span>;
  if (!day) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xl leading-none">{wmoToEmoji(day.code)}</span>
      <span className="text-[14px] font-semibold text-[var(--text)]">{day.max}°</span>
      <span className="text-[13px] text-[var(--text-muted)]">{day.min}°</span>
      {day.precip > 0 && <span className="text-xs text-[var(--primary)]">💧{day.precip}%</span>}
      <span className="text-xs text-[var(--text-muted)]">Tachov</span>
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

const LEGEND_ITEMS = [
  { color: 'bg-[var(--danger)]', label: 'Vysoká priorita' },
  { color: 'bg-[var(--warning)]', label: 'Střední' },
  { color: 'bg-[var(--secondary)]', label: 'Nízká' },
  { color: 'bg-[var(--text-muted)]', label: 'Dokončeno' },
] as const;

function MonthCalendar({ zakazky }: { zakazky: Zakazka[] }) {
  const today = new Date();
  const [offset, setOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
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

  const selectedDayZakazky = zakazkyByDay.get(selectedDate.toDateString()) ?? [];
  const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  const selectedDayLabel = selectedDate.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <>
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)]">
        <h2 className="text-sm font-semibold text-[var(--text)] capitalize flex items-center gap-2">
          {monthLabel}
          {monthCount > 0 && (
            <span className="text-xs font-normal text-[var(--text-muted)]">{monthCount} zakázek</span>
          )}
        </h2>
        <div className="flex items-center gap-1">
          <button title="Předchozí měsíc (←)" onClick={() => setOffset(o => o - 1)} className="h-8 w-8 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors text-sm">‹</button>
          <button onClick={() => { setOffset(0); setSelectedDate(today); }} className="px-2.5 h-8 rounded-[var(--radius-md)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors">Dnes</button>
          <button title="Další měsíc (→)" onClick={() => setOffset(o => o + 1)} className="h-8 w-8 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors text-sm">›</button>
        </div>
      </div>
      {/* Day headers */}
      <div className="grid grid-cols-[24px_repeat(7,1fr)] border-b border-[var(--border-subtle)]">
        <div className="py-1 text-center text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Tý</div>
        {DAY_HEADERS.map((d, i) => (
          <div key={d} className={`py-1 text-center text-xs font-semibold uppercase tracking-wider ${i >= 5 ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'}`}>{d}</div>
        ))}
      </div>
      {/* Cells */}
      <div className="grid grid-cols-[24px_repeat(7,1fr)]">
        {Array.from({ length: cells.length / 7 }, (_, r) => {
          const rowMonday = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1 - startDow + r * 7);
          const weekNum = getISOWeek(rowMonday);
          return [
            <div key={`wn-${r}`} className="min-h-[40px] border-t border-[var(--border-subtle)] flex items-start justify-center pt-1">
              <span className="text-xs font-medium text-[var(--text-muted)] tabular-nums leading-none">{weekNum}</span>
            </div>,
            ...cells.slice(r * 7, r * 7 + 7).map((day, col) => {
              const i = r * 7 + col;
              if (!day) return <div key={`e${i}`} className="min-h-[40px] bg-[var(--bg-faint)]" />;
              const isToday = isSameDay(day, today);
              const isPast = day < today && !isToday;
              const isWeekend = col >= 5;
              const dayZ = zakazkyByDay.get(day.toDateString()) ?? [];
              const hasEvents = dayZ.length > 0;
              const isSelected = isSameDay(day, selectedDate);
              return (
                <div
                  key={i}
                  onClick={() => setSelectedDate(day)}
                  className={`relative min-h-[40px] border-t border-r border-[var(--border-subtle)] px-0.5 py-1 flex flex-col items-center cursor-pointer transition-colors ${
                    isToday ? 'bg-[var(--bg-accent)]' : isWeekend ? 'bg-[var(--bg-faint)]' : ''
                  } ${isPast && !hasEvents ? 'opacity-30' : isPast ? 'opacity-60' : ''} ${
                    hasEvents ? 'hover:bg-[var(--bg-accent)]' : 'hover:bg-[var(--bg-hover)]'
                  } ${isSelected && !isToday ? 'ring-2 ring-inset ring-[var(--primary)]/50' : ''}`}
                >
                  <p className={`text-center text-xs font-medium leading-none ${
                    isToday
                      ? 'flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-fg)] text-xs font-bold'
                      : isWeekend ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'
                  }`}>{day.getDate()}</p>
                  {hasEvents && (
                    <div className="mt-1 flex items-center justify-center gap-0.5 flex-wrap">
                      {dayZ.slice(0, 3).map((z) => {
                        const color = z.stav === 'dokončeno' ? 'bg-[var(--text-muted)]' : z.priorita === 'vysoká' ? 'bg-[var(--danger)]' : z.priorita === 'střední' ? 'bg-[var(--warning)]' : 'bg-[var(--secondary)]';
                        return (
                          <span
                            key={z.id}
                            className={`h-1.5 w-1.5 rounded-full ${color}`}
                            title={`${z.nazev} — ${z.klient}`}
                          />
                        );
                      })}
                      {dayZ.length > 3 && (
                        <span className="text-xs font-bold text-[var(--text-secondary)]">+{dayZ.length - 3}</span>
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
          <span key={l.label} className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <span className={`h-1.5 w-1.5 rounded-full ${l.color}`} />
            {l.label}
          </span>
        ))}
        <span className="ml-auto text-xs text-[var(--text-muted)]">← T →</span>
      </div>
    </div>
    {/* Panel zakázek pro vybraný den */}
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] mt-2">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)]">
        <p className="text-sm font-semibold text-[var(--text)] capitalize">{selectedDayLabel}</p>
        <button
          onClick={() => navigate(`/planovani?datum=${selectedDateStr}`)}
          className="text-xs font-medium text-[var(--primary)] hover:underline transition-colors whitespace-nowrap"
        >
          + Naplánovat
        </button>
      </div>
      {selectedDayZakazky.length > 0 ? (
        <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
          {selectedDayZakazky.map((z) => {
            const priorityBorder = z.priorita === 'vysoká' ? 'border-l-[var(--danger)]' : z.priorita === 'střední' ? 'border-l-[var(--warning)]' : 'border-l-[var(--secondary)]';
            const stavColor = z.stav === 'dokončeno' ? 'text-[var(--text-muted)]' : z.stav === 'v realizaci' ? 'text-[var(--warning-text)]' : 'text-[var(--primary)]';
            return (
              <Link
                key={z.id}
                to="/planovani"
                className={`block rounded-[var(--radius-md)] border border-[var(--border)] border-l-[3px] ${priorityBorder} bg-[var(--bg-faint)] px-2.5 py-1.5 hover:bg-[var(--bg-hover)] transition-colors`}
              >
                <p className="text-[13px] font-medium text-[var(--text)] truncate">{z.nazev}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-[var(--text-secondary)] truncate">{z.klient}</p>
                  <span className={`text-xs font-medium capitalize ${stavColor}`}>{z.stav}</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-[var(--text-muted)] text-center py-4">Žádné zakázky pro tento den</p>
      )}
    </div>
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
          <div className="absolute inset-0 rounded-full border-4 border-[var(--border-medium)]" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
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
      <div className="space-y-2">
        <PageHeader
          title={greeting}
          subtitle={todayLabel}
          actions={
            <>
              <Link to="/revize" className="inline-flex items-center justify-center min-h-[40px] rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--bg-surface)] px-4 text-sm font-semibold text-[var(--text)] hover:bg-[var(--bg-hover-strong)] transition-colors">
                + Revize
              </Link>
              <Link to="/planovani" className="inline-flex items-center justify-center min-h-[40px] rounded-[var(--radius-md)] bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-fg)] hover:bg-[var(--primary-hover)] transition-colors">
                + Zakázka
              </Link>
            </>
          }
        />
        <WeatherInline />
      </div>

      {/* ═══ Hlavní grid ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
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
        <div className="lg:row-span-2">
          <MonthCalendar zakazky={zakazky} />
        </div>

        {/* Stat karty — levý blok col-span-2 */}
        <div className="lg:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <StatCard
            title="Celkem revizí"
            value={stats.celkemRevizi}
            subtitle={`${stats.dokonceno} dokončených`}
            icon={<svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
            tint="blue"
            link="/revize"
          />
          <StatCard
            title="Rozpracováno"
            value={stats.rozpracovano}
            subtitle="čeká na dokončení"
            icon={<svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            tint="amber"
            link="/revize"
          />
          <StatCard
            title="K rekalibraci"
            value={stats.pristrojeKRekalibraci}
            subtitle="do 30 dnů"
            icon={<svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.999L13.732 4.001c-.77-1.333-2.694-1.333-3.464 0L3.34 16.001C2.57 17.334 3.532 19 5.072 19z" /></svg>}
            tint="danger"
            link="/pristroje"
          />
          <StatCard
            title="Plánované zakázky"
            value={stats.planovaneZakazky}
            subtitle="naplánováno"
            icon={<svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            tint="success"
            link="/planovani"
          />
        </div>
      </div>

      {/* ═══ Graf revizí ═══ */}
      <RevizeBarChart revize={revize} />
    </div>
  );
}
