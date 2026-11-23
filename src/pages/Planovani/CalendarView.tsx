import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Zakazka } from '../../types';
import {
  monthGrid, fromDateStr, addDaysLocal, diffDays, jobsOnDay, deadlinesOnDay, loadLevel, kategorieOf, timeLabel, timeRange, longDay, MESICE, isClosed, googleVeDni,
} from './model';
import { KatDot, KatLegend, NavBar, PrimaryActionButton, MapLink, PhoneLink, IconDoc, GoogleKarta, type PlanProps } from './shared';
import { phoneOf, useCalendarKeys, useIsMobile, contextHandler } from './hooks';

const DNY = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
const shortDate = (d: string) => { const t = fromDateStr(d); return `${t.getDate()}. ${t.getMonth() + 1}.`; };

export function CalendarView(p: PlanProps) {
  const isMobile = useIsMobile();
  // Vybraný den drží stránka (tlačítko „Nová zakázka“ ho použije jako datum)
  const [vlastniVyber, setVlastniVyber] = useState<{ od: string; do?: string }>({ od: p.today });
  const selected = p.selectedDay ?? vlastniVyber.od;
  const selectedEnd = p.selectedDay !== undefined ? p.selectedDayEnd : vlastniVyber.do;
  const { onSelectDay } = p;
  /** Vybere den, případně rozsah a–b (v libovolném pořadí). */
  const vyber = useCallback((a: string, b?: string) => {
    const [od, doDne] = b && b < a ? [b, a] : [a, b];
    const end = doDne && doDne !== od ? doDne : undefined;
    setVlastniVyber({ od, do: end });
    onSelectDay?.(od, end);
  }, [onSelectDay]);
  const setSelected = useCallback((d: string) => vyber(d), [vyber]);
  const vRozsahu = (d: string) => !!selectedEnd && d >= selected && d <= selectedEnd;
  const pocetVybranych = selectedEnd ? diffDays(selectedEnd, selected) + 1 : 1;

  // Výběr více dní tažením myší (kotva = den, kde se tlačítko stisklo)
  const kotva = useRef<string | null>(null);
  const mys = useRef(false);
  useEffect(() => {
    const konec = () => { kotva.current = null; };
    window.addEventListener('pointerup', konec);
    return () => window.removeEventListener('pointerup', konec);
  }, []);
  const [ym, setYm] = useState(() => { const t = fromDateStr(selected); return { y: t.getFullYear(), m: t.getMonth() }; });
  const [showDeadlines, setShowDeadlines] = useState(true);

  const shift = useCallback((n: number) => setYm(({ y, m }) => {
    const d = new Date(y, m + n, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  }), []);
  const prev = useCallback(() => shift(-1), [shift]);
  const next = useCallback(() => shift(1), [shift]);
  const today = useCallback(() => {
    const d = fromDateStr(p.today);
    setYm({ y: d.getFullYear(), m: d.getMonth() });
    setSelected(p.today);
  }, [p.today, setSelected]);
  useCalendarKeys(prev, next, today);

  const grid = useMemo(() => monthGrid(ym.y, ym.m), [ym]);
  const active = useMemo(() => p.zakazky.filter(z => z.stav !== 'zrušeno'), [p.zakazky]);
  const dayJobs = useMemo(() => {
    // Při výběru více dní: zakázky ze všech vybraných dní (každá jednou)
    const dny = selectedEnd ? Array.from({ length: diffDays(selectedEnd, selected) + 1 }, (_, i) => addDaysLocal(selected, i)) : [selected];
    const list = [...new Map(dny.flatMap(d => jobsOnDay(active, d)).map(z => [z.id, z])).values()];
    const key = (z: Zakazka) => timeRange(z)?.from ?? -1; // celodenní nahoru
    return [...list].sort((a, b) => key(a) - key(b));
  }, [active, selected, selectedEnd]);
  const dayDeadlines = useMemo(() => deadlinesOnDay(p.zakazky, selected), [p.zakazky, selected]);
  const [showGoogle, setShowGoogle] = useState(true);
  const gUdalosti = showGoogle ? p.googleUdalosti : undefined;
  const dayGoogle = useMemo(() => googleVeDni(gUdalosti, selected), [gUdalosti, selected]);

  const legend = (
    <div className="flex flex-wrap items-center gap-3">
      {!isMobile && <KatLegend />}
      <label className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)] min-h-[36px]">
        <input type="checkbox" className="w-4 h-4 accent-[var(--primary)]" checked={showDeadlines} onChange={e => setShowDeadlines(e.target.checked)} />
        Termíny zpráv
      </label>
      {p.googleUdalosti && (
        <label className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)] min-h-[36px]">
          <input type="checkbox" className="w-4 h-4 accent-[var(--primary)]" checked={showGoogle} onChange={e => setShowGoogle(e.target.checked)} />
          Google Kalendář
        </label>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <NavBar title={`${MESICE[ym.m]} ${ym.y}`} onPrev={prev} onNext={next} onToday={today}
        prevLabel="Předchozí měsíc" nextLabel="Další měsíc" right={legend} />

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-5">
        {/* Mřížka měsíce */}
        <div className={`flex-1 min-w-0 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden ${isMobile ? 'p-1' : ''}`}>
          <div className={`grid grid-cols-7 ${isMobile ? '' : 'border-b border-[var(--border)]'}`}>
            {DNY.map(d => (
              <div key={d} className={`${isMobile ? 'text-center py-1.5' : 'px-2.5 py-2'} text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--text-secondary)]`}>{d}</div>
            ))}
          </div>
          <div className={`grid grid-cols-7 select-none ${isMobile ? 'gap-0.5' : ''}`} role="grid" aria-label={`${MESICE[ym.m]} ${ym.y}`}>
            {grid.map((d, i) => {
              const dt = fromDateStr(d);
              const inMonth = dt.getMonth() === ym.m;
              const jobs = inMonth ? jobsOnDay(active, d) : [];
              const deadlines = inMonth && showDeadlines ? deadlinesOnDay(p.zakazky, d) : [];
              const gCount = inMonth ? googleVeDni(gUdalosti, d).length : 0;
              const lateDeadline = deadlines.some(() => d < p.today);
              const isToday = d === p.today;
              const isSel = d === selected || vRozsahu(d);
              const weekend = i % 7 >= 5;
              const lvl = loadLevel(jobs.length);
              const bg = lvl ? `var(--load-${lvl})` : weekend && !isMobile ? 'var(--bg-faint)' : undefined;
              const label = `${dt.getDate()}. ${dt.getMonth() + 1}.: ${jobs.length ? `${jobs.length} zakázek` : 'bez zakázek'}${deadlines.length ? `, ${deadlines.length} termín zprávy` : ''}`;
              return (
                <button
                  key={d}
                  type="button"
                  aria-label={label}
                  aria-pressed={isSel}
                  onPointerDown={e => {
                    mys.current = e.pointerType === 'mouse';
                    if (!mys.current || e.button !== 0 || e.shiftKey) return;
                    kotva.current = d;
                    vyber(d);
                  }}
                  onPointerEnter={() => { if (kotva.current) vyber(kotva.current, d); }}
                  onClick={e => {
                    if (e.shiftKey) vyber(selected, d);
                    else if (!mys.current || e.detail === 0) setSelected(d); // dotyk a klávesnice; myš vybírá už při stisku
                    mys.current = false;
                    if (!inMonth) setYm({ y: dt.getFullYear(), m: dt.getMonth() });
                  }}
                  onDoubleClick={() => p.onCreateAt(d)}
                  onContextMenu={contextHandler(p, vRozsahu(d) ? { date: selected, dateTo: selectedEnd } : { date: d })}
                  className={isMobile
                    ? `h-[50px] rounded-[var(--radius-md)] flex flex-col items-center justify-center gap-1 ${isSel && !isToday ? 'ring-2 ring-inset ring-[var(--primary)]' : ''}`
                    : `relative min-h-[96px] p-2 flex flex-col text-left border-r border-b border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] ${isSel ? 'shadow-[inset_0_0_0_2px_var(--primary)]' : ''}`}
                  style={{ background: bg, opacity: inMonth && d < p.today && !isSel ? 0.65 : undefined }}
                >
                  <span className="flex items-center justify-between w-full">
                    <span className={isToday
                      ? `${isMobile ? 'w-[26px] h-[26px] mx-auto' : 'w-6 h-6'} rounded-full bg-[var(--primary)] text-[var(--primary-fg)] text-xs font-bold flex items-center justify-center`
                      : `${isMobile ? 'mx-auto text-sm' : 'text-[13px]'} font-semibold ${inMonth ? 'text-[var(--text)]' : 'text-[var(--text-muted)] opacity-60'}`}>
                      {dt.getDate()}
                    </span>
                    {!isMobile && deadlines.length > 0 && (
                      <span title="Termín odevzdání zprávy" className={lateDeadline ? 'text-[var(--danger-text)]' : 'text-[var(--warning-text)]'}><IconDoc /></span>
                    )}
                  </span>
                  {(jobs.length > 0 || gCount > 0) && (
                    <span className={`flex items-center gap-1 ${isMobile ? 'h-[6px]' : 'mt-auto w-full'}`}>
                      {jobs.slice(0, isMobile ? 3 : 4).map(z => (
                        <KatDot key={z.id} kat={kategorieOf(z, p.revizeById)} size={isMobile ? 5 : 8} />
                      ))}
                      {gCount > 0 && (
                        <span title={`${gCount} ${gCount === 1 ? 'událost' : gCount < 5 ? 'události' : 'událostí'} z Google Kalendáře`}
                          className="rounded-full border border-[var(--text-muted)] shrink-0"
                          style={{ width: isMobile ? 5 : 8, height: isMobile ? 5 : 8 }} />
                      )}
                      {!isMobile && jobs.length > 0 && <span className="ml-auto text-[11px] font-semibold text-[var(--text-secondary)]">{jobs.length}</span>}
                    </span>
                  )}
                  {isMobile && jobs.length === 0 && gCount === 0 && <span className="h-[6px]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Zakázky vybraného dne */}
        <aside className="lg:w-[360px] shrink-0 flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4" aria-label="Zakázky vybraného dne">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="m-0 text-[17px] font-bold text-[var(--text)] first-letter:uppercase">
                {selectedEnd ? `${shortDate(selected)} – ${shortDate(selectedEnd)}` : selected === p.today ? `Dnes, ${longDay(selected)}` : longDay(selected)}
              </h3>
              <p className="m-0 text-xs text-[var(--text-secondary)]">
                {selectedEnd && `${pocetVybranych} ${pocetVybranych < 5 ? 'dny' : 'dní'} · `}
                {dayJobs.length ? `${dayJobs.length} ${dayJobs.length === 1 ? 'zakázka' : dayJobs.length < 5 ? 'zakázky' : 'zakázek'}` : 'Žádné zakázky'}
                {dayDeadlines.length > 0 && ` · ${dayDeadlines.length} termín zprávy`}
              </p>
            </div>
            <button type="button" onClick={() => p.onCreateAt(selected, undefined, selectedEnd)}
              className="shrink-0 min-h-[36px] px-3 rounded-[var(--radius-md)] border border-[var(--border-input)] text-xs font-semibold text-[var(--text)] hover:bg-[var(--bg-hover)]">
              + Přidat
            </button>
          </div>

          {dayJobs.map(z => <DayCard key={z.id} z={z} p={p} day={selected} />)}
          {!isMobile && !selectedEnd && (
            <p className="m-0 text-[11px] text-[var(--text-muted)]">Víc dní vyberete tažením myší nebo Shift+klikem.</p>
          )}

          {dayGoogle.length > 0 && (
            <div className="pt-3 border-t border-[var(--border)] flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--text-secondary)]">Google Kalendář</span>
              {dayGoogle.map(({ u, cas }) => <GoogleKarta key={u.id} u={u} cas={cas} />)}
            </div>
          )}

          {dayDeadlines.length > 0 && (
            <div className="pt-3 border-t border-[var(--border)] flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--text-secondary)]">Termíny zpráv</span>
              {dayDeadlines.map(z => (
                <button key={z.id} type="button" onClick={() => p.onEdit(z)} className="flex items-center gap-2.5 text-left text-[13px] text-[var(--text)] min-h-[36px]">
                  <span className={selected < p.today ? 'text-[var(--danger-text)]' : 'text-[var(--warning-text)]'}><IconDoc size={15} /></span>
                  <span className="flex-1 truncate">Odevzdat zprávu: {z.nazev}</span>
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function DayCard({ z, p, day }: { z: Zakazka; p: PlanProps; day: string }) {
  const t = timeLabel(z, day);
  const kat = kategorieOf(z, p.revizeById);
  const tel = phoneOf(z, p.zakazniciById);
  return (
    <article onClick={() => p.onEdit(z)} onContextMenu={contextHandler(p, { date: day, z })}
      className={`flex gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-faint)] cursor-pointer hover:border-[var(--border-strong)] ${isClosed(z) ? 'opacity-70' : ''}`}>
      <div className="w-11 shrink-0 flex flex-col leading-tight">
        <span className="text-[13px] font-bold text-[var(--text)]">{t.main === 'Celý den' ? 'Celý' : t.main}</span>
        <span className="text-[11px] text-[var(--text-secondary)] whitespace-nowrap">{t.main === 'Celý den' ? (t.sub ? t.sub.replace(' z ', '/') : 'den') : t.sub.replace('do ', '')}</span>
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <KatDot kat={kat} />
          <span className="text-sm font-semibold text-[var(--text)] truncate">{z.nazev}</span>
        </div>
        <MapLink adresa={z.adresa} z={z} className="text-xs text-[var(--text-secondary)] hover:text-[var(--primary-text)] truncate">{z.klient} · {z.adresa}</MapLink>
        <div className="flex items-center gap-1.5">
          {tel && <PhoneLink tel={tel} className="w-9 h-9 inline-flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-input)] text-[var(--text)]" />}
          <div className="ml-auto"><PrimaryActionButton z={z} p={p} compact /></div>
        </div>
      </div>
    </article>
  );
}
