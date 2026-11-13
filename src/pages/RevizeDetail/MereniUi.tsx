import { Badge } from '../../components/ui';
import type { BadgeVariant } from '../../components/ui';
import type { StavMereni } from './mereniLimity';
import { fmtCislo } from './mereniLimity';

const STAV: Record<StavMereni, { variant: BadgeVariant; label: string }> = {
  ok: { variant: 'success', label: 'Vyhovuje' },
  limit: { variant: 'warning', label: 'Blízko limitu' },
  fail: { variant: 'danger', label: 'Nevyhovuje' },
  nezmereno: { variant: 'neutral', label: 'Nezměřeno' },
};

export function StavBadge({ stav, label }: { stav: StavMereni; label?: string }) {
  const s = STAV[stav];
  return <Badge variant={s.variant}>{label ?? s.label}</Badge>;
}

const BAR_COLOR: Record<StavMereni, string> = {
  ok: 'bg-[var(--success)]',
  limit: 'bg-[var(--warning)]',
  fail: 'bg-[var(--danger)]',
  nezmereno: 'bg-[var(--border-strong)]',
};

/** Hodnota Zs s proužkem vůči maximu. */
export function ZsBar({ zs, max, pomer }: { zs: number | null; max: number | null; pomer: number | null }) {
  if (zs === null) {
    return <span className="text-[var(--text-muted)]">{max !== null ? `— / ${fmtCislo(max)}` : '—'}</span>;
  }
  if (max === null || pomer === null) return <span className="tabular-nums">{fmtCislo(zs)}</span>;
  const stav: StavMereni = pomer > 1 ? 'fail' : pomer > 0.8 ? 'limit' : 'ok';
  return (
    <div className="flex items-center gap-2 min-w-[150px]" title={`Zs ${fmtCislo(zs)} Ω, max ${fmtCislo(max)} Ω`}>
      <span className={`tabular-nums font-semibold min-w-[34px] ${stav === 'fail' ? 'text-[var(--danger-text)]' : 'text-[var(--text)]'}`}>{fmtCislo(zs)}</span>
      <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-hover-strong)] min-w-[50px]" aria-hidden="true">
        <div className={`h-1.5 rounded-full ${BAR_COLOR[stav]}`} style={{ width: `${Math.min(pomer * 100, 100)}%` }} />
      </div>
      <span className="tabular-nums text-xs text-[var(--text-muted)]">{fmtCislo(max)}</span>
    </div>
  );
}

/** Dlaždice se souhrnnou hodnotou. */
export function StatTile({ label, value, sub, tone = 'default', progress }: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: 'default' | 'success' | 'danger';
  progress?: number;
}) {
  const box = tone === 'danger'
    ? 'bg-[var(--danger-bg)] border-[var(--danger)]/40'
    : 'bg-[var(--bg-surface)] border-[var(--border)]';
  const val = tone === 'danger' ? 'text-[var(--danger-text)]' : tone === 'success' ? 'text-[var(--success-text)]' : 'text-[var(--text)]';
  return (
    <div className={`rounded-[var(--radius-lg)] border px-3 py-2.5 ${box}`}>
      <p className={`text-xs ${tone === 'danger' ? 'text-[var(--danger-text)]' : 'text-[var(--text-secondary)]'}`}>{label}</p>
      <p className={`mt-0.5 text-xl font-semibold tabular-nums ${val}`}>
        {value}{sub && <span className="ml-1 text-xs font-medium text-[var(--text-secondary)]">{sub}</span>}
      </p>
      {progress !== undefined && (
        <div className="mt-1.5 h-1 rounded-full bg-[var(--bg-hover-strong)]" aria-hidden="true">
          <div className="h-1 rounded-full bg-[var(--primary)]" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
    </div>
  );
}

/** Přepínací filtr (chip). */
export function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-8 px-3 rounded-[var(--radius-md)] border text-xs font-semibold whitespace-nowrap transition-colors ${
        active
          ? 'border-[var(--active-border)] bg-[var(--active-bg)] text-[var(--nav-text-active)]'
          : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]'
      }`}
    >
      {children}
    </button>
  );
}
