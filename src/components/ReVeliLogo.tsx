/** Značka – blesk-fajfka s fazetou: ✓ zkontrolováno + blesk (elektro), tmavší bleskové rameno. */

/** Barva značky – vínová. */
export const BRAND_COLOR = '#B42318';
/** Tmavší vínová pro fazetu (bleskové rameno). */
export const BRAND_DARK = '#7F1810';

const ZNAK = '8,57 19,45 37,62 53,40 45,40 91,6 66,49 74,49 37,88';
const FAZETA = '37,62 53,40 45,40 91,6 66,49 74,49 37,88';

interface LogoIconProps {
  size?: number;
  className?: string;
}

/** Znak s fazetou (bez podkladu) – funguje na světlém i tmavém pozadí. */
export function LogoIcon({ size = 32, className = '' }: LogoIconProps) {
  return (
    <svg width={size} height={size} viewBox="3.5 1 92 92" className={`shrink-0 ${className}`} aria-hidden="true">
      <polygon points={ZNAK} fill={BRAND_COLOR} />
      <polygon points={FAZETA} fill={BRAND_DARK} />
    </svg>
  );
}

/** Barva „Veli“ v nápisu – vínová jako ikona, na světlém i tmavém pozadí (jako v souborech loga). */
export const WORDMARK_COLOR = BRAND_COLOR;

/** Nápis „ReVeli“ – „Veli“ ve vínové barvě značky. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-extrabold tracking-tight text-[var(--text)] ${className}`}>
      Re<span style={{ color: WORDMARK_COLOR }}>Veli</span>
    </span>
  );
}
