import { useMemo, useRef, useState } from 'react';
import type { Zakazka } from '../../types';
import { EmptyState } from '../../components/ui';
import {
  groupForList, LIST_GROUPS, matchesSearch, matchesStav, kategorieOf, timeLabel, nextDay, reportLabel, shortDay, longDay,
  isClosed, type KatKey, type StavFilter, type ListGroupKey,
} from './model';
import { KatDot, KatLegend, PrimaryActionButton, RowMenu, MapLink, PhoneLink, IconChevron, IconPin, type PlanProps } from './shared';
import { phoneOf, useIsMobile } from './hooks';

type SortKey = 'termin' | 'klient' | 'priorita';
const PRIO: Record<Zakazka['priorita'], number> = { 'vysoká': 0, 'střední': 1, 'nizká': 2 };
const VISIBLE_LIMIT = 5;

const STAV_FILTERS: { key: StavFilter; label: string }[] = [
  { key: 'aktivni', label: 'Aktivní' },
  { key: 'plánováno', label: 'Naplánováno' },
  { key: 'v realizaci', label: 'V realizaci' },
  { key: 'dokončeno', label: 'Dokončeno' },
  { key: 'vse', label: 'Vše' },
];

export function ListView(p: PlanProps) {
  const isMobile = useIsMobile();
  const [q, setQ] = useState('');
  const [stav, setStav] = useState<StavFilter>('aktivni');
  const [kats, setKats] = useState<Set<KatKey>>(new Set());
  const [sort, setSort] = useState<SortKey>('termin');
  const [expanded, setExpanded] = useState<Set<ListGroupKey>>(new Set());
  const [doneOpen, setDoneOpen] = useState(false);

  const base = useMemo(
    () => p.zakazky.filter(z => matchesSearch(z, q) && (kats.size === 0 || kats.has(kategorieOf(z, p.revizeById)))),
    [p.zakazky, q, kats, p.revizeById],
  );
  const counts = useMemo(() => Object.fromEntries(STAV_FILTERS.map(f => [f.key, base.filter(z => matchesStav(z, f.key)).length])), [base]);
  const groups = useMemo(() => {
    const filtered = base.filter(z => matchesStav(z, stav));
    const gs = groupForList(filtered, p.today);
    if (sort === 'termin') return gs;
    const cmp = sort === 'klient'
      ? (a: Zakazka, b: Zakazka) => a.klient.localeCompare(b.klient, 'cs')
      : (a: Zakazka, b: Zakazka) => PRIO[a.priorita] - PRIO[b.priorita];
    return gs.map(g => ({ ...g, items: [...g.items].sort(cmp) }));
  }, [base, stav, sort, p.today]);

  const toggleKat = (k: KatKey) => setKats(prev => {
    const n = new Set(prev);
    if (n.has(k)) n.delete(k); else n.add(k);
    return n;
  });

  return (
    <div className="flex flex-col gap-3">
      {/* Hledání a filtry */}
      <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-2 md:gap-3">
        <label className="relative flex items-center md:w-[320px]">
          <span className="absolute left-3 text-[var(--text-muted)] pointer-events-none">
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          </span>
          <input
            type="search"
            value={q}
            onChange={e => setQ(e.target.value)}
            aria-label="Hledat zakázky"
            placeholder="Hledat název, zákazníka, adresu…"
            className="w-full min-h-[44px] pl-9 pr-3 rounded-[var(--radius-md)] border border-[var(--border-input)] bg-[var(--bg-input)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring-color)]"
          />
        </label>
        <div role="group" aria-label="Stav" className="flex gap-1.5 overflow-x-auto pb-1 md:pb-0 -mx-1 px-1">
          {STAV_FILTERS.map(f => (
            <button
              key={f.key}
              type="button"
              aria-pressed={stav === f.key}
              onClick={() => setStav(f.key)}
              className={`shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-full border text-xs font-semibold transition-colors ${
                stav === f.key
                  ? 'bg-[var(--bg-accent)] border-[var(--primary)] text-[var(--primary)]'
                  : 'bg-[var(--bg-input)] border-[var(--border-input)] text-[var(--text-secondary)] hover:text-[var(--text)]'
              }`}
            >
              {f.label} <span className="opacity-80">{counts[f.key]}</span>
            </button>
          ))}
        </div>
        <div className="hidden md:block"><KatLegend selected={kats} onToggle={toggleKat} /></div>
        <label className="hidden md:flex items-center gap-2 text-xs text-[var(--text-secondary)] md:ml-auto">
          Řadit
          <select value={sort} onChange={e => setSort(e.target.value as SortKey)}
            className="min-h-[36px] px-2 rounded-[var(--radius-md)] border border-[var(--border-input)] bg-[var(--bg-input)] text-sm text-[var(--text)]">
            <option value="termin">Podle termínu</option>
            <option value="klient">Podle zákazníka</option>
            <option value="priorita">Podle priority</option>
          </select>
        </label>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6">
          <EmptyState message={q || kats.size || stav !== 'vse' ? 'Žádné zakázky neodpovídají filtru.' : 'Zatím žádné zakázky. Přidejte první tlačítkem „Nová zakázka“.'} />
        </div>
      ) : (
        <div className={isMobile ? 'flex flex-col gap-2' : 'rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden'}>
          {groups.map(g => {
            const meta = LIST_GROUPS.find(x => x.key === g.key)!;
            const isDone = g.key === 'dokoncene';
            const open = !isDone || doneOpen;
            const limited = !expanded.has(g.key) && g.key === 'pozdeji' && g.items.length > VISIBLE_LIMIT;
            const items = limited ? g.items.slice(0, VISIBLE_LIMIT) : g.items;
            const titleColor = meta.tone === 'danger' ? 'text-[var(--danger-text)]' : meta.tone === 'accent' ? 'text-[var(--primary)]' : meta.tone === 'muted' ? 'text-[var(--text-secondary)]' : 'text-[var(--text)]';
            const title = g.key === 'dnes' ? `Dnes · ${longDay(p.today)}` : meta.title;
            return (
              <section key={g.key} aria-label={meta.title}>
                {isDone ? (
                  <button type="button" aria-expanded={doneOpen} onClick={() => setDoneOpen(o => !o)}
                    className={`w-full flex items-center gap-2 min-h-[44px] px-4 md:px-5 text-left ${isMobile ? 'rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]' : 'border-t border-[var(--border)] bg-[var(--bg-faint)]'}`}>
                    <span className={`transition-transform ${doneOpen ? 'rotate-90' : ''}`}><IconChevron dir="right" size={15} /></span>
                    <span className={`text-xs font-bold uppercase tracking-[0.05em] ${titleColor}`}>{meta.title}</span>
                    <span className="text-xs font-semibold text-[var(--text-secondary)]">{g.items.length}</span>
                  </button>
                ) : (
                  <h3 className={`flex items-baseline gap-2 px-1 md:px-5 pt-3 pb-2 m-0 ${!isMobile && meta.tone === 'danger' ? 'bg-[var(--danger-bg)]' : ''}`}>
                    <span className={`text-xs font-bold uppercase tracking-[0.05em] ${titleColor}`}>{title}</span>
                    <span className="text-xs font-semibold text-[var(--text-secondary)]">{g.items.length}</span>
                  </h3>
                )}
                {open && (
                  <div className={isMobile ? 'flex flex-col gap-2 mt-1' : ''}>
                    {items.map(z => (isMobile
                      ? <SwipeCard key={z.id} z={z} p={p} group={g.key} />
                      : <DesktopRow key={z.id} z={z} p={p} group={g.key} />))}
                  </div>
                )}
                {limited && (
                  <button type="button" onClick={() => setExpanded(s => new Set(s).add(g.key))}
                    className="block min-h-[40px] px-5 text-[13px] font-semibold text-[var(--primary)] hover:underline">
                    + {g.items.length - VISIBLE_LIMIT} dalších zakázek
                  </button>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function dateCell(z: Zakazka, p: PlanProps, group: ListGroupKey) {
  const day = nextDay(z, p.today);
  const t = timeLabel(z, day);
  const sub = t.sub.replace(' z ', '/');
  if (group === 'dnes') return { main: t.main, sub };
  return { main: shortDay(day), sub: t.main === 'Celý den' ? (sub || 'celý den') : t.main };
}

function DesktopRow({ z, p, group }: { z: Zakazka; p: PlanProps; group: ListGroupKey }) {
  const kat = kategorieOf(z, p.revizeById);
  const d = dateCell(z, p, group);
  const rep = reportLabel(z, p.today);
  const tel = phoneOf(z, p.zakazniciById);
  const late = group === 'po-terminu';
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => p.onEdit(z)}
      onKeyDown={e => { if (e.key === 'Enter') p.onEdit(z); }}
      className={`grid items-center gap-x-3.5 min-h-[52px] pl-5 pr-3 py-1.5 border-t border-[var(--border-subtle)] cursor-pointer hover:bg-[var(--bg-hover)] ${isClosed(z) && group === 'dokoncene' ? 'opacity-70' : ''}`}
      style={{ gridTemplateColumns: '112px minmax(0,1.6fr) minmax(0,1fr) minmax(0,1.1fr) 120px 140px 136px 36px' }}
    >
      <div className="flex flex-col leading-tight">
        <span className={`text-[13px] font-semibold ${late ? 'text-[var(--danger-text)]' : 'text-[var(--text)]'}`}>{d.main}</span>
        {d.sub && <span className="text-[11px] text-[var(--text-secondary)]">{d.sub}</span>}
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <KatDot kat={kat} />
        <span className="text-sm font-semibold text-[var(--text)] truncate">{z.nazev}</span>
        {z.priorita === 'vysoká' && <span className="shrink-0 text-[10px] font-bold uppercase text-[var(--danger-text)]">priorita</span>}
      </div>
      <span className="text-[13px] text-[var(--text-secondary)] truncate">{z.klient}</span>
      <div className="flex items-center gap-1.5 min-w-0">
        <MapLink adresa={z.adresa} className="flex items-center gap-1.5 min-w-0 text-[13px] text-[var(--text)] hover:text-[var(--primary)]">
          <span className="text-[var(--text-muted)] shrink-0"><IconPin size={14} /></span>
          <span className="truncate">{z.adresa}</span>
        </MapLink>
        {tel && <PhoneLink tel={tel} className="shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--bg-hover)]" />}
      </div>
      <span className={`text-xs ${z.stav === 'v realizaci' ? 'text-[var(--warning-text)]' : 'text-[var(--text-secondary)]'}`}>{stavText(z)}</span>
      <span>
        {rep && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${rep.late ? 'bg-[var(--danger-bg)] text-[var(--danger-text)]' : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'}`}>{rep.text}</span>
        )}
      </span>
      <div className="justify-self-end"><PrimaryActionButton z={z} p={p} compact /></div>
      <RowMenu z={z} p={p} />
    </div>
  );
}

function stavText(z: Zakazka): string {
  if (z.stav === 'dokončeno') return z.datumOdevzdaniZpravy ? 'Hotovo' : 'Čeká na zprávu';
  if (z.stav === 'zrušeno') return 'Zrušeno';
  return z.stav === 'v realizaci' ? 'V realizaci' : 'Naplánováno';
}

/** Karta na mobilu: posun doprava = dokončit. */
function SwipeCard({ z, p, group }: { z: Zakazka; p: PlanProps; group: ListGroupKey }) {
  const kat = kategorieOf(z, p.revizeById);
  const d = dateCell(z, p, group);
  const rep = reportLabel(z, p.today);
  const tel = phoneOf(z, p.zakazniciById);
  const canSwipe = !isClosed(z);
  const [dx, setDx] = useState(0);
  const dxRef = useRef(0); // aktuální posun i mezi překreslením (rychlý tah)
  const start = useRef<{ x: number; y: number; active: boolean } | null>(null);
  const moved = useRef(false);
  const THRESHOLD = 96;

  const onPointerDown = (e: React.PointerEvent) => {
    if (!canSwipe || e.pointerType === 'mouse') return;
    start.current = { x: e.clientX, y: e.clientY, active: false };
    moved.current = false;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    const mx = e.clientX - s.x, my = e.clientY - s.y;
    if (!s.active) {
      if (Math.abs(mx) > 12 && Math.abs(mx) > Math.abs(my) * 1.5) s.active = true;
      else if (Math.abs(my) > 12) { start.current = null; return; }
    }
    if (s.active) {
      moved.current = true;
      dxRef.current = Math.max(0, Math.min(140, mx));
      setDx(dxRef.current);
    }
  };
  const onPointerUp = () => {
    if (start.current?.active && dxRef.current >= THRESHOLD) p.onComplete(z);
    start.current = null;
    dxRef.current = 0;
    setDx(0);
  };

  return (
    <div className="relative rounded-[var(--radius-lg)] overflow-hidden" style={{ background: canSwipe ? 'var(--success-bg)' : undefined }}>
      {canSwipe && (
        <div aria-hidden="true" className="absolute inset-y-0 left-0 w-[104px] flex flex-col items-center justify-center gap-1 text-[var(--success-text)] text-xs font-bold">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          Dokončit
        </div>
      )}
      <article
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={() => { if (!moved.current) p.onEdit(z); }}
        className={`relative flex flex-col gap-2 p-3 rounded-[var(--radius-lg)] border bg-[var(--surface)] ${group === 'po-terminu' ? 'border-[var(--danger)]/50' : 'border-[var(--border)]'} ${group === 'dokoncene' ? 'opacity-75' : ''}`}
        style={{ transform: dx ? `translateX(${dx}px)` : undefined, transition: dx ? 'none' : 'transform .2s', touchAction: 'pan-y' }}
      >
        <div className="flex gap-2.5">
          <div className="w-[66px] shrink-0 flex flex-col leading-tight whitespace-nowrap">
            <span className={`text-[13px] font-bold ${group === 'po-terminu' ? 'text-[var(--danger-text)]' : 'text-[var(--text)]'}`}>{d.main}</span>
            {d.sub && <span className="text-[11px] text-[var(--text-secondary)]">{d.sub}</span>}
          </div>
          <div className="min-w-0 flex-1 flex flex-col gap-0.5">
            <div className="flex items-center gap-2 min-w-0">
              <KatDot kat={kat} />
              <span className="text-sm font-semibold text-[var(--text)] truncate">{z.nazev}</span>
            </div>
            <span className="text-xs text-[var(--text-secondary)] truncate">{stavText(z)} · {z.adresa}</span>
            {rep && <span className={`text-[11px] font-semibold ${rep.late ? 'text-[var(--danger-text)]' : 'text-[var(--text-secondary)]'}`}>{rep.text}</span>}
          </div>
          <RowMenu z={z} p={p} />
        </div>
        <div className="flex items-center gap-1.5 pl-[76px]">
          <MapLink adresa={z.adresa} className="w-11 h-10 inline-flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-input)] text-[var(--text)]" />
          {tel && <PhoneLink tel={tel} className="w-11 h-10 inline-flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-input)] text-[var(--text)]" />}
          <div className="ml-auto"><PrimaryActionButton z={z} p={p} /></div>
        </div>
      </article>
    </div>
  );
}
