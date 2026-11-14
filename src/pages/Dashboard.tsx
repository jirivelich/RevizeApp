import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery as useRQQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useRevize, useZakazky, useZavady, useFaktury } from '../hooks/useQueries';
import { useNotifications } from '../hooks/useNotifications';
import { Badge } from '../components/ui';
import type { BadgeVariant } from '../components/ui';
import { KATEGORIE_LABELS } from '../types';
import type { AppNotification, NotificationSeverity, NotificationType, Revize, Zakazka } from '../types';

/* ═══ Helpers ═══ */

const DAY_MS = 86_400_000;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Počet dní od dneška (záporné = v minulosti). */
function daysFromToday(dateStr: string | undefined | null): number {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - startOfToday().getTime()) / DAY_MS);
}

const formatKcCele = (n: number) =>
  `${new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 }).format(Math.round(n))} Kč`;

const pluralDni = (n: number) => (n === 1 ? 'den' : n >= 2 && n <= 4 ? 'dny' : 'dní');

function relDays(days: number): string {
  if (days === 0) return 'dnes';
  if (days < 0) return `po termínu ${-days} ${pluralDni(-days)}`;
  return `za ${days} ${pluralDni(days)}`;
}

/* ═══ Ikony (stroke, 24×24) ═══ */

const ICON_PATHS = {
  clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  alert: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  gauge: 'M12 14l4-4M3.3 17a9 9 0 1 1 17.4 0',
  doc: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5',
  user: 'M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z',
  plus: 'M12 5v14M5 12h14',
  chevron: 'm9 6 6 6-6 6',
  check: 'M20 6 9 17l-5-5',
} as const;

function Icon({ name, size = 18, strokeWidth = 2 }: { name: keyof typeof ICON_PATHS; size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

/* ═══ Stavební bloky ═══ */

function Panel({ title, action, children, className = '', bodyClassName = '' }: {
  title: string; action?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string;
}) {
  return (
    <section className={`min-w-0 flex flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-[var(--border)]">
        <h2 className="text-[15px] font-semibold text-[var(--text)]">{title}</h2>
        {action}
      </div>
      <div className={`flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

function PanelLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="text-[13px] font-medium text-[var(--nav-text-active)] hover:underline">
      {children}
    </Link>
  );
}

function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="px-4 py-8 text-center text-[13px] text-[var(--text-muted)]">{children}</p>;
}

type KpiTone = 'info' | 'danger' | 'warning' | 'success' | 'neutral';

const KPI_VALUE_COLOR: Record<KpiTone, string> = {
  info: 'text-[var(--text)]',
  danger: 'text-[var(--danger-text)]',
  warning: 'text-[var(--text)]',
  success: 'text-[var(--text)]',
  neutral: 'text-[var(--text)]',
};

function KpiCard({ title, value, sub, tag, tone, to }: {
  title: string; value: number; sub: string; tag?: string; tone: KpiTone; to: string;
}) {
  // Nulová hodnota = vše v pořádku, nezvýrazňovat
  const effectiveTone: KpiTone = value === 0 ? 'neutral' : tone;
  return (
    <Link
      to={to}
      className="flex flex-col gap-1 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3.5 transition-colors hover:border-[var(--border-strong)] active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-medium text-[var(--text-secondary)]">{title}</span>
        {tag && value > 0 && (
          <span className="hidden sm:block"><Badge variant={effectiveTone === 'neutral' ? 'neutral' : effectiveTone}>{tag}</Badge></span>
        )}
      </div>
      <span className={`text-[26px] leading-tight font-bold tracking-tight tabular-nums ${KPI_VALUE_COLOR[effectiveTone]}`}>{value}</span>
      <span className="text-xs text-[var(--text-muted)]">{sub}</span>
    </Link>
  );
}

/* ═══ Vyžaduje pozornost ═══ */

type AttentionFilter = 'vse' | 'terminy' | 'revize' | 'pristroje';

const FILTERS: { id: AttentionFilter; label: string; types: NotificationType[] | null }[] = [
  { id: 'vse', label: 'Vše', types: null },
  { id: 'terminy', label: 'Termíny', types: ['revize_platnost_expiry', 'zakazka_upcoming', 'report_deadline'] },
  { id: 'revize', label: 'Revize', types: ['revize_overdue'] },
  { id: 'pristroje', label: 'Přístroje a osvědčení', types: ['kalibrace_expiring', 'technik_expiry'] },
];

const SEVERITY_VARIANT: Record<NotificationSeverity, BadgeVariant> = {
  critical: 'danger',
  warning: 'warning',
  info: 'info',
};

const SEVERITY_ICON_BOX: Record<NotificationSeverity, string> = {
  critical: 'bg-[var(--danger-bg)] text-[var(--danger-text)]',
  warning: 'bg-[var(--warning-bg)] text-[var(--warning-text)]',
  info: 'bg-[var(--bg-secondary-accent)] text-[var(--secondary)]',
};

const TYPE_ICON: Record<NotificationType, keyof typeof ICON_PATHS> = {
  zakazka_upcoming: 'clock',
  revize_platnost_expiry: 'clock',
  report_deadline: 'doc',
  revize_overdue: 'alert',
  kalibrace_expiring: 'gauge',
  technik_expiry: 'user',
};

function attentionWhen(n: AppNotification): string {
  if (n.type === 'revize_overdue') return `rozpracováno ${-n.daysUntil} ${pluralDni(-n.daysUntil)}`;
  return relDays(n.daysUntil);
}

const VISIBLE_ATTENTION = 6;

function AttentionPanel({ notifications }: { notifications: AppNotification[] }) {
  const [filter, setFilter] = useState<AttentionFilter>('vse');
  const [expanded, setExpanded] = useState(false);

  const types = FILTERS.find(f => f.id === filter)?.types;
  const filtered = types ? notifications.filter(n => types.includes(n.type)) : notifications;
  const shown = expanded ? filtered : filtered.slice(0, VISIBLE_ATTENTION);

  return (
    <Panel
      title="Vyžaduje pozornost"
      action={
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtr upozornění">
          {FILTERS.map(f => {
            const active = f.id === filter;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={active}
                onClick={() => { setFilter(f.id); setExpanded(false); }}
                className={`h-8 rounded-full px-3 text-[13px] font-medium border transition-colors ${
                  active
                    ? 'border-transparent bg-[var(--active-bg)] text-[var(--nav-text-active)]'
                    : 'border-[var(--border-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      }
    >
      {shown.length === 0 ? (
        <EmptyNote>
          <span className="inline-flex items-center gap-2 text-[var(--success-text)]"><Icon name="check" size={16} /> Vše je v pořádku, nic nehoří.</span>
        </EmptyNote>
      ) : (
        <ul>
          {shown.map(n => (
            <li key={n.id} className="border-b border-[var(--border)] last:border-b-0">
              <Link to={n.link} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors">
                <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-[var(--radius-md)] ${SEVERITY_ICON_BOX[n.severity]}`}>
                  <Icon name={TYPE_ICON[n.type]} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[14px] font-semibold text-[var(--text)]">{n.title}</span>
                  <span className="truncate text-[13px] text-[var(--text-muted)]">{n.description}</span>
                </span>
                <span className="hidden sm:block"><Badge variant={SEVERITY_VARIANT[n.severity]}>{attentionWhen(n)}</Badge></span>
                <span className="flex-none text-[var(--text-muted)]"><Icon name="chevron" size={16} /></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {filtered.length > VISIBLE_ATTENTION && (
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="w-full min-h-[44px] border-t border-[var(--border)] text-[13px] font-medium text-[var(--nav-text-active)] hover:bg-[var(--bg-hover)]"
        >
          {expanded ? 'Zobrazit méně' : `Zobrazit vše (${filtered.length})`}
        </button>
      )}
    </Panel>
  );
}

/* ═══ Tento týden ═══ */

const DOW_SHORT = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];

interface WeekItem { key: string; date: Date; days: number; z: Zakazka }

function WeekPanel({ zakazky, className = '' }: { zakazky: Zakazka[]; className?: string }) {
  const items = useMemo<WeekItem[]>(() => {
    const out: WeekItem[] = [];
    for (const z of zakazky) {
      if (z.stav !== 'plánováno' && z.stav !== 'v realizaci') continue;
      const dates = Array.from(new Set([z.datumPlanovany, ...(z.datumyRealizace ?? [])].filter(Boolean)));
      for (const ds of dates) {
        const days = daysFromToday(ds);
        if (days < 0 || days > 6) continue;
        const date = new Date(ds);
        date.setHours(0, 0, 0, 0);
        out.push({ key: `${z.id}-${ds}`, date, days, z });
      }
    }
    return out.sort((a, b) => a.days - b.days || (a.z.casPlanovany ?? '').localeCompare(b.z.casPlanovany ?? '')).slice(0, 6);
  }, [zakazky]);

  return (
    <Panel title="Tento týden" className={className} bodyClassName={items.length === 0 ? 'flex items-center justify-center' : ''} action={<PanelLink to="/planovani">Kalendář</PanelLink>}>
      {items.length === 0 ? (
        <EmptyNote>
          Na příštích 7 dní není nic naplánováno.<br />
          <Link to="/planovani" className="mt-1 inline-block font-medium text-[var(--nav-text-active)] hover:underline">Naplánovat zakázku</Link>
        </EmptyNote>
      ) : (
        <ul className="px-4">
          {items.map(({ key, date, days, z }) => {
            const isToday = days === 0;
            return (
              <li key={key} className="border-b border-[var(--border)] last:border-b-0">
                <Link to={`/planovani?datum=${z.datumPlanovany}`} className="flex gap-3 py-2.5 group">
                  <span className={`flex w-11 flex-none flex-col items-center justify-center rounded-[var(--radius-md)] py-1 ${
                    isToday ? 'bg-[var(--primary)] text-[var(--primary-fg)]' : 'bg-[var(--bg-hover)] text-[var(--text)]'
                  }`}>
                    <span className="text-xs font-semibold uppercase">{isToday ? 'Dnes' : DOW_SHORT[date.getDay()]}</span>
                    <span className="text-[17px] font-semibold tabular-nums leading-tight">{date.getDate()}</span>
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[14px] font-semibold text-[var(--text)] group-hover:underline">{z.nazev}</span>
                    <span className="truncate text-[13px] text-[var(--text-muted)]">{[z.klient, z.adresa].filter(Boolean).join(' · ')}</span>
                    <span className="text-xs text-[var(--text-secondary)]">
                      {z.casPlanovany && <span className="tabular-nums">{z.casPlanovany} · </span>}
                      {z.stav === 'v realizaci' ? 'v realizaci' : `priorita ${z.priorita === 'nizká' ? 'nízká' : z.priorita}`}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/* ═══ Rozpracované revize ═══ */

const TYP_LABEL: Record<Revize['typRevize'], string> = {
  'pravidelná': 'Pravidelná',
  'výchozí': 'Výchozí',
  'mimořádná': 'Mimořádná',
};

function WipPanel({ revize, total, staleDays, className = '' }: { revize: Revize[]; total: number; staleDays: number; className?: string }) {
  return (
    <Panel title="Rozpracované revize" className={className} action={<PanelLink to="/revize">Všechny revize{total > revize.length ? ` (${total})` : ''}</PanelLink>}>
      {revize.length === 0 ? (
        <EmptyNote>
          Žádná rozpracovaná revize.<br />
          <Link to="/revize" className="mt-1 inline-block font-medium text-[var(--nav-text-active)] hover:underline">Založit revizi</Link>
        </EmptyNote>
      ) : (
        <ul>
          {revize.map(r => {
            const age = Math.max(0, -daysFromToday(r.datum));
            const variant: BadgeVariant = age >= staleDays * 2 ? 'danger' : age >= staleDays ? 'warning' : 'info';
            const kategorie = KATEGORIE_LABELS[r.kategorieRevize]?.kratky ?? r.kategorieRevize;
            return (
              <li key={r.id} className="border-b border-[var(--border)] last:border-b-0">
                <Link to={`/revize/${r.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_160px_auto] items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors">
                  <span className="min-w-0">
                    <span className="block text-xs text-[var(--text-muted)] tabular-nums">{r.cisloRevize || `#${r.id}`}</span>
                    <span className="block truncate text-[14px] font-semibold text-[var(--text)]">{r.nazev || r.adresa || 'Bez názvu'}</span>
                  </span>
                  <span className="hidden sm:block text-[13px] text-[var(--text-secondary)]">
                    {kategorie} · {TYP_LABEL[r.typRevize] ?? r.typRevize}
                  </span>
                  <Badge variant={variant}>{age === 0 ? 'založeno dnes' : `${age} ${pluralDni(age)}`}</Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/* ═══ Graf revizí ═══ */

const CZ_MONTHS = ['led', 'úno', 'bře', 'dub', 'kvě', 'čvn', 'čvc', 'srp', 'zář', 'říj', 'lis', 'pro'];

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
  const current = bars[bars.length - 1];

  return (
    <Panel title="Revize za 12 měsíců" action={<span className="text-[13px] text-[var(--text-secondary)] tabular-nums">{total} celkem</span>} bodyClassName="px-4 pt-4 pb-3">
      <div
        role="img"
        aria-label={`Sloupcový graf počtu revizí za posledních 12 měsíců, celkem ${total}, tento měsíc ${current.count}`}
        className="flex h-32 items-end gap-1.5"
      >
        {bars.map(b => (
          <div key={`${b.year}-${b.month}`} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5" title={`${b.label} ${b.year}: ${b.count}`}>
            {b.count > 0 && <span className={`text-xs tabular-nums ${b.isCurrent ? 'text-[var(--text)] font-semibold' : 'text-[var(--text-muted)]'}`}>{b.count}</span>}
            <div
              className={`w-full rounded-t-[3px] ${b.isCurrent ? 'bg-[var(--primary)]' : 'bg-[var(--bg-hover-strong)]'}`}
              style={{ height: `${Math.max((b.count / max) * 88, b.count > 0 ? 4 : 2)}px` }}
            />
            <span className={`text-xs ${b.isCurrent ? 'text-[var(--text)] font-semibold' : 'text-[var(--text-muted)]'}`}>{b.label}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ═══ Fakturace ═══ */

function InvoiceRow({ label, value, tone }: { label: string; value: string; tone?: 'danger' | 'success' }) {
  const color = tone === 'danger' ? 'text-[var(--danger-text)]' : tone === 'success' ? 'text-[var(--success-text)]' : 'text-[var(--text)]';
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[13px] text-[var(--text-secondary)]">{label}</span>
      <span className={`text-[14px] font-semibold tabular-nums whitespace-nowrap ${color}`}>{value}</span>
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

/* ═══ Dashboard ═══ */

/** Okno pro „nevyfakturované“ dokončené revize – starší se už nepočítají. */
const FAKTURACE_OKNO_DNI = 90;
const PLATNOST_HORIZONT_DNI = 60;

export function Dashboard() {
  const { data: revize = [], isLoading: loadingRevize } = useRevize();
  const { data: zakazky = [], isLoading: loadingZakazky } = useZakazky();
  const { data: zavady = [] } = useZavady();
  const { data: faktury = [] } = useFaktury();
  const { notifications } = useNotifications();

  const isLoading = loadingRevize || loadingZakazky;
  const staleDays = 14;

  const data = useMemo(() => {
    // Platnost revize: pro každý objekt (kategorie + adresa) jen nejnovější dokončená revize,
    // aby se starší revize už nahrazené novou nepočítaly jako „po termínu“.
    const latestByObject = new Map<string, Revize>();
    for (const r of revize) {
      if (r.stav !== 'dokončeno' && r.stav !== 'schváleno') continue;
      const addr = (r.adresa ?? '').trim().toLowerCase();
      const key = addr ? `${r.kategorieRevize}|${addr}` : `id|${r.id}`;
      const prev = latestByObject.get(key);
      if (!prev || new Date(r.datum) > new Date(prev.datum)) latestByObject.set(key, r);
    }
    let poTerminu = 0;
    let brzy = 0;
    for (const r of latestByObject.values()) {
      if (!r.datumPlatnosti) continue;
      const d = daysFromToday(r.datumPlatnosti);
      if (d < 0) poTerminu++;
      else if (d <= PLATNOST_HORIZONT_DNI) brzy++;
    }

    const rozpracovane = revize
      .filter(r => r.stav === 'rozpracováno')
      .sort((a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime());
    const zastarale = rozpracovane.filter(r => -daysFromToday(r.datum) >= staleDays).length;

    const otevreneZavady = zavady.filter(z => z.stav !== 'vyřešená');
    const zavadyC1 = otevreneZavady.filter(z => z.zavaznost === 'C1').length;

    // Fakturace
    const platne = faktury.filter(f => f.stav !== 'storno');
    const fakturovaneRevize = new Set(platne.map(f => f.revizeId).filter((id): id is number => id != null));
    const nevyfakturovano = revize.filter(r =>
      (r.stav === 'dokončeno' || r.stav === 'schváleno') &&
      r.id != null && !fakturovaneRevize.has(r.id) &&
      -daysFromToday(r.datumDokonceni || r.datum) <= FAKTURACE_OKNO_DNI,
    ).length;
    const poSplatnosti = platne.filter(f => f.stav === 'vystavena' && f.datumSplatnosti && daysFromToday(f.datumSplatnosti) < 0);
    const now = new Date();
    const uhrazenoMesic = platne
      .filter(f => {
        if (f.stav !== 'zaplacena' || !f.datumUhrady) return false;
        const d = new Date(f.datumUhrady);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((s, f) => s + (Number(f.celkem) || 0), 0);

    return {
      poTerminu, brzy,
      rozpracovaneCount: rozpracovane.length,
      rozpracovaneTop: rozpracovane.slice(0, 5),
      zastarale,
      otevreneZavady: otevreneZavady.length,
      zavadyC1,
      faktury: {
        nevyfakturovano,
        poSplatnostiCount: poSplatnosti.length,
        poSplatnostiSum: poSplatnosti.reduce((s, f) => s + (Number(f.celkem) || 0), 0),
        uhrazenoMesic,
      },
    };
  }, [revize, zavady, faktury]);

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
    <div className="space-y-5">
      {/* ═══ Hlavička ═══ */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[var(--text-muted)]">
            <span className="first-letter:uppercase">{todayLabel}</span>
            <WeatherInline />
          </div>
          <h1 className="text-xl font-bold leading-tight text-[var(--text)]">{greeting}</h1>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Link
            to="/planovani"
            className="inline-flex min-h-[44px] flex-1 sm:flex-none items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] px-4 text-[14px] font-semibold text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            Nová zakázka
          </Link>
          <Link
            to="/revize"
            className="inline-flex min-h-[44px] flex-1 sm:flex-none items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary)] px-5 text-[14px] font-semibold text-[var(--primary-fg)] hover:bg-[var(--primary-hover)] transition-colors"
          >
            <Icon name="plus" size={16} strokeWidth={2.4} /> Nová revize
          </Link>
        </div>
      </header>

      {/* ═══ Klíčové ukazatele ═══ */}
      <section aria-label="Klíčové ukazatele" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title="Rozpracované revize"
          value={data.rozpracovaneCount}
          sub={data.zastarale > 0 ? `${data.zastarale} déle než ${staleDays} dní` : 'žádná nestojí'}
          tag="aktivní"
          tone="info"
          to="/revize"
        />
        <KpiCard
          title="Platnost revize vypršela"
          value={data.poTerminu}
          sub="objekty k nové revizi"
          tag="urgentní"
          tone="danger"
          to="/revize"
        />
        <KpiCard
          title={`Platnost do ${PLATNOST_HORIZONT_DNI} dnů`}
          value={data.brzy}
          sub="připravit nabídky a zakázky"
          tag="plánovat"
          tone="warning"
          to="/planovani"
        />
        <KpiCard
          title="Otevřené závady"
          value={data.otevreneZavady}
          sub={data.zavadyC1 > 0 ? `${data.zavadyC1} se závažností C1` : 'žádná se závažností C1'}
          tag={data.zavadyC1 > 0 ? 'C1' : undefined}
          tone="danger"
          to="/zavady"
        />
      </section>

      {/* ═══ Dva sloupce: vlevo práce, vpravo přehledy (každý sloupec se skládá samostatně, bez mezer) ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start lg:items-stretch">
        <div className="flex min-w-0 flex-col gap-3 self-start lg:col-span-2">
          <AttentionPanel notifications={notifications} />
          <WipPanel revize={data.rozpracovaneTop} total={data.rozpracovaneCount} staleDays={staleDays} />
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <WeekPanel zakazky={zakazky} className="lg:flex-1" />
          <RevizeBarChart revize={revize} />
          <Panel title="Fakturace" action={<PanelLink to="/faktury">Faktury</PanelLink>} bodyClassName="flex flex-col gap-3 px-4 py-3.5">
            <InvoiceRow label={`Dokončeno, nevyfakturováno (${FAKTURACE_OKNO_DNI} dní)`} value={String(data.faktury.nevyfakturovano)} />
            <InvoiceRow
              label="Po splatnosti"
              value={data.faktury.poSplatnostiCount > 0 ? `${data.faktury.poSplatnostiCount} · ${formatKcCele(data.faktury.poSplatnostiSum)}` : '0'}
              tone={data.faktury.poSplatnostiCount > 0 ? 'danger' : undefined}
            />
            <InvoiceRow label="Uhrazeno tento měsíc" value={formatKcCele(data.faktury.uhrazenoMesic)} tone="success" />
          </Panel>
        </div>
      </div>
    </div>
  );
}
