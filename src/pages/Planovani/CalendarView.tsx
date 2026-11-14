import { useCallback, useMemo, useState } from 'react';
import type { Zakazka } from '../../types';
import {
  monthGrid, fromDateStr, jobsOnDay, deadlinesOnDay, loadLevel, kategorieOf, timeLabel, timeRange, longDay, MESICE, isClosed,
} from './model';
import { KatDot, KatLegend, NavBar, PrimaryActionButton, MapLink, PhoneLink, IconDoc, type PlanProps } from './shared';
import { phoneOf, useCalendarKeys, useIsMobile } from './hooks';

const DNY = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

export function CalendarView(p: PlanProps) {
  const isMobile = useIsMobile();
  const t = fromDateStr(p.today);
  const [ym, setYm] = useState({ y: t.getFullYear(), m: t.getMonth() });
  const [selected, setSelected] = useState(p.today);
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
  }, [p.today]);
  useCalendarKeys(prev, next, today);

  const grid = useMemo(() => monthGrid(ym.y, ym.m), [ym]);
  const active = useMemo(() => p.zakazky.filter(z => z.stav !== 'zrušeno'), [p.zakazky]);
  const dayJobs = useMemo(() => {
    const list = jobsOnDay(active, selected);
    const key = (z: Zakazka) => timeRange(z)?.from ?? -1; // celodenní nahoru
    return [...list].sort((a, b) => key(a) - key(b));
  }, [active, selected]);
  const dayDeadlines = useMemo(() => deadlinesOnDay(p.zakazky, selected), [p.zakazky, selected]);

  const legend = (
    <div className="flex flex-wrap items-center gap-3">
      {!isMobile && <KatLegend />}
      <label className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)] min-h-[36px]">
        <input type="checkbox" className="w-4 h-4 accent-[var(--primary)]" checked={showDeadlines} onChange={e => setShowDeadlines(e.target.checked)} />
        Termíny zpráv
      </label>
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
          <div className={`grid grid-cols-7 ${isMobile ? 'gap-0.5' : ''}`} role="grid" aria-label={`${MESICE[ym.m]} ${ym.y}`}>
            {grid.map((d, i) => {
              const dt = fromDateStr(d);
              const inMonth = dt.getMonth() === ym.m;
              const jobs = inMonth ? jobsOnDay(active, d) : [];
              const deadlines = inMonth && showDeadlines ? deadlinesOnDay(p.zakazky, d) : [];
              const lateDeadline = deadlines.some(() => d < p.today);
              const isToday = d === p.today;
              const isSel = d === selected;
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
                  onClick={() => { setSelected(d); if (!inMonth) setYm({ y: dt.getFullYear(), m: dt.getMonth() }); }}
                  onDoubleClick={() => p.onCreateAt(d)}
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
                  {jobs.length > 0 && (
                    <span className={`flex items-center gap-1 ${isMobile ? 'h-[6px]' : 'mt-auto w-full'}`}>
                      {jobs.slice(0, isMobile ? 3 : 4).map(z => (
                        <KatDot key={z.id} kat={kategorieOf(z, p.revizeById)} size={isMobile ? 5 : 8} />
                      ))}
                      {!isMobile && <span className="ml-auto text-[11px] font-semibold text-[var(--text-secondary)]">{jobs.length}</span>}
                    </span>
                  )}
                  {isMobile && jobs.length === 0 && <span className="h-[6px]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Zakázky vybraného dne */}
        <aside className="lg:w-[360px] shrink-0 flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4" aria-label="Zakázky vybraného dne">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="m-0 text-[17px] font-bold text-[var(--text)] first-letter:uppercase">{selected === p.today ? `Dnes, ${longDay(selected)}` : longDay(selected)}</h3>
              <p className="m-0 text-xs text-[var(--text-secondary)]">
                {dayJobs.length ? `${dayJobs.length} ${dayJobs.length === 1 ? 'zakázka' : dayJobs.length < 5 ? 'zakázky' : 'zakázek'}` : 'Žádné zakázky'}
                {dayDeadlines.length > 0 && ` · ${dayDeadlines.length} termín zprávy`}
              </p>
            </div>
            <button type="button" onClick={() => p.onCreateAt(selected)}
              className="shrink-0 min-h-[36px] px-3 rounded-[var(--radius-md)] border border-[var(--border-input)] text-xs font-semibold text-[var(--text)] hover:bg-[var(--bg-hover)]">
              + Přidat
            </button>
          </div>

          {dayJobs.map(z => <DayCard key={z.id} z={z} p={p} day={selected} />)}

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
    <article onClick={() => p.onEdit(z)}
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
        <MapLink adresa={z.adresa} className="text-xs text-[var(--text-secondary)] hover:text-[var(--primary)] truncate">{z.klient} · {z.adresa}</MapLink>
        <div className="flex items-center gap-1.5">
          {tel && <PhoneLink tel={tel} className="w-9 h-9 inline-flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-input)] text-[var(--text)]" />}
          <div className="ml-auto"><PrimaryActionButton z={z} p={p} compact /></div>
        </div>
      </div>
    </article>
  );
}
