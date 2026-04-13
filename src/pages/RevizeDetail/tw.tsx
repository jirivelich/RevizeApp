/**
 * Sdílené Tailwind CSS třídy pro formulářové taby v RevizeDetail.
 * Vzor převzatý ze StrojniZarizeniTab – používá se napříč všemi typy revizí.
 */

// ── Tailwind class helpers ──
export const TW = {
  /** Standardní input pole */
  input: 'w-full px-2 py-1 rounded text-sm bg-white/[0.04] text-slate-300 border border-white/[0.09] focus:ring-1 focus:ring-blue-500/[0.4] focus:outline-none',
  /** Disabled input */
  inputDisabled: 'w-full px-2 py-1 rounded text-sm bg-white/[0.03] text-slate-500 border border-white/[0.06] cursor-not-allowed',
  /** Input uvnitř tabulkové buňky (průhledné pozadí) */
  tblInput: 'w-full border-0 bg-transparent text-sm text-slate-300 px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded',
  /** Textarea rozšíření */
  textarea: 'w-full px-2 py-1 rounded text-sm bg-white/[0.04] text-slate-300 border border-white/[0.09] focus:ring-1 focus:ring-blue-500/[0.4] focus:outline-none resize-y',
  /** Select pole */
  select: 'px-2 py-1 rounded text-sm bg-white/[0.04] text-slate-300 border border-white/[0.09] focus:ring-1 focus:ring-blue-500/[0.4] focus:outline-none',
  /** Select na celou šířku */
  selectFull: 'w-full px-2 py-1 rounded text-sm bg-white/[0.04] text-slate-300 border border-white/[0.09] focus:ring-1 focus:ring-blue-500/[0.4] focus:outline-none',
  /** Hlavička tabulky */
  th: 'bg-[#0a0f1e] border border-white/[0.06] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400 text-left',
  /** Buňka tabulky */
  td: 'border border-white/[0.06] px-2 py-1.5 align-middle text-slate-300',
  /** Popisek pole (nad inputem) */
  label: 'text-xs font-semibold uppercase tracking-wide text-slate-400',
  /** Wrapper pro jednu sekci (kartu) */
  card: 'bg-white/[0.03] border border-white/[0.07] rounded-lg shadow-sm overflow-hidden',
  /** Hlavní wrapper stránky */
  page: 'max-w-4xl mx-auto flex flex-col gap-4',
  /** Grid pro 2 sloupce */
  grid2: 'grid grid-cols-2 max-sm:grid-cols-1 gap-2.5',
  /** Grid pro 3 sloupce */
  grid3: 'grid grid-cols-3 max-sm:grid-cols-1 gap-2.5',
  /** Grid pro 4 sloupce */
  grid4: 'grid grid-cols-4 max-sm:grid-cols-2 gap-2.5',
} as const;

/**
 * Sekční hlavička s číslem v modrém badge.
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
    <div className={`${className || 'bg-slate-800'} text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2`}>
      {num && <span className="text-blue-400">{num}</span>}
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
    <div className={`${className || 'bg-slate-800'} text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2`}>
      {num && <span className="text-blue-400">{num}</span>}
      <span className={`flex-1 ${!visible ? 'opacity-50 line-through' : ''}`}>{children}</span>
      {right}
      <button
        onClick={onToggle}
        className="flex items-center gap-1 text-[10px] font-normal normal-case tracking-normal opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
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
