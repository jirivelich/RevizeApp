/**
 * Sdílené Tailwind CSS třídy pro formulářové taby v RevizeDetail.
 * Vzor převzatý ze StrojniZarizeniTab – používá se napříč všemi typy revizí.
 */

// ── Tailwind class helpers ──
export const TW = {
  /** Standardní input pole */
  input: 'w-full px-2.5 py-1.5 min-h-[40px] rounded-[var(--radius-md)] text-sm bg-[var(--bg-input)] text-[var(--text)] border border-[var(--border-input)] placeholder:text-[var(--text-muted)] transition-colors focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none',
  /** Disabled input */
  inputDisabled: 'w-full px-2.5 py-1.5 min-h-[40px] rounded-[var(--radius-md)] text-sm bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border)] cursor-not-allowed opacity-70',
  /** Input uvnitř tabulkové buňky (průhledné pozadí) */
  tblInput: 'w-full border border-transparent hover:border-[var(--border-input)] bg-transparent text-sm text-[var(--text)] px-1.5 py-1 min-h-[32px] rounded-[var(--radius-sm)] focus:outline-none focus:border-[var(--primary)] focus:bg-[var(--bg-input)] focus:ring-2 focus:ring-[var(--focus-ring-color)]',
  /** Textarea rozšíření */
  textarea: 'w-full px-2.5 py-2 rounded-[var(--radius-md)] text-sm bg-[var(--bg-input)] text-[var(--text)] border border-[var(--border-input)] placeholder:text-[var(--text-muted)] transition-colors focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none resize-y',
  /** Select pole */
  select: 'px-2.5 py-1.5 min-h-[40px] rounded-[var(--radius-md)] text-sm bg-[var(--bg-input)] text-[var(--text)] border border-[var(--border-input)] transition-colors focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none',
  /** Select na celou šířku */
  selectFull: 'w-full px-2.5 py-1.5 min-h-[40px] rounded-[var(--radius-md)] text-sm bg-[var(--bg-input)] text-[var(--text)] border border-[var(--border-input)] transition-colors focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:outline-none',
  /** Hlavička tabulky */
  th: 'bg-[var(--bg-faint)] border-b border-[var(--border)] px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] text-left',
  /** Buňka tabulky */
  td: 'border-b border-[var(--border)] px-2 py-1 align-middle text-[var(--text)]',
  /** Popisek pole (nad inputem) */
  label: 'text-xs font-semibold text-[var(--text-secondary)]',
  /** Wrapper pro jednu sekci (kartu) */
  card: 'bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden',
  /** Hlavní wrapper stránky */
  page: 'max-w-4xl mx-auto flex flex-col gap-4',
  /** Grid pro 2 sloupce */
  grid2: 'grid grid-cols-2 max-sm:grid-cols-1 gap-3',
  /** Grid pro 3 sloupce */
  grid3: 'grid grid-cols-3 max-sm:grid-cols-1 gap-3',
  /** Grid pro 4 sloupce */
  grid4: 'grid grid-cols-4 max-sm:grid-cols-2 gap-3',
} as const;

/**
 * Sekční hlavička karty (záhlaví Card) s volitelným číslem.
 */
export function SectionHeader({
  num,
  children,
  className,
  right,
}: {
  num?: string;
  children: React.ReactNode;
  className?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className={`${className || 'bg-[var(--bg-surface)]'} text-[var(--text)] px-4 py-2.5 border-b border-[var(--border)] text-sm font-semibold flex items-center gap-2`}>
      {num && <span className="text-[var(--primary)]">{num}</span>}
      <span className="flex-1">{children}</span>
      {right}
    </div>
  );
}

/**
 * Sekční hlavička s toggle pro viditelnost v tisku.
 */
export function ToggleSectionHeader({
  num,
  children,
  visible,
  onToggle,
  className,
  right,
}: {
  num?: string;
  children: React.ReactNode;
  visible: boolean;
  onToggle: () => void;
  className?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className={`${className || 'bg-[var(--bg-surface)]'} text-[var(--text)] px-4 py-2.5 border-b border-[var(--border)] text-sm font-semibold flex items-center gap-2`}>
      {num && <span className="text-[var(--primary)]">{num}</span>}
      <span className={`flex-1 ${!visible ? 'opacity-50 line-through' : ''}`}>{children}</span>
      {right}
      <button
        onClick={onToggle}
        className="flex items-center gap-1 text-xs font-normal normal-case tracking-normal text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors cursor-pointer"
        title={visible ? 'Skrýt v tisku' : 'Zobrazit v tisku'}
      >
        {visible ? '🖨️ Tisk ✓' : '🚫 Skryto'}
      </button>
    </div>
  );
}

/** Pole formuláře s labelem nahoře */
export function Field({
  label,
  children,
  className,
  span,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  span?: number;
}) {
  return (
    <div className={`flex flex-col gap-1 ${span ? `col-span-${span} max-sm:col-span-1` : ''} ${className || ''}`}>
      <label className={TW.label}>{label}</label>
      {children}
    </div>
  );
}
