/** Značka ReVeli – varianta 5b (souměrné V z blesků: V jako Velich i Volt). */

/** Barva značky – logo je vínové v obou motivech. */
export const BRAND_COLOR = '#B42318';

const ZNAK_5B = '11,11 23,11 29,29 25.5,29 32,41 38.5,29 35,29 41,11 53,11 44.5,30 48,30 34,54 30,54 16,30 19.5,30';

interface LogoIconProps {
  size?: number;
  className?: string;
}

/** Čtvercová ikona: vínový podklad, bílý znak. */
export function LogoIcon({ size = 32, className = '' }: LogoIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={`shrink-0 ${className}`} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill={BRAND_COLOR} />
      <polygon points={ZNAK_5B} fill="#fff" stroke="#fff" strokeWidth="1" strokeLinejoin="round" />
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
