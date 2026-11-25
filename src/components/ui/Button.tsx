import { useEffect, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'success' | 'danger' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  as?: 'button' | 'div';
}

const variantClasses = {
  primary: 'bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-fg)] border border-transparent',
  secondary: 'bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text)] border border-[var(--border-input)]',
  ghost: 'bg-transparent hover:bg-[var(--bg-hover)] text-[var(--text)] border border-transparent',
  success: 'bg-[var(--success-bg)] hover:brightness-110 text-[var(--success-text)] border border-[var(--success)]/25',
  danger: 'bg-[var(--danger-bg)] hover:brightness-110 text-[var(--danger-text)] border border-[var(--danger)]/25',
  warning: 'bg-[var(--warning-bg)] hover:brightness-110 text-[var(--warning-text)] border border-[var(--warning)]/25',
};

const sizeClasses = {
  sm: 'px-3 text-[13px] min-h-[32px]',
  md: 'px-4 text-sm min-h-[40px]',
  lg: 'px-6 text-base min-h-[48px]',
};

/** Druhé kliknutí na stejné tlačítko dřív než za tuto dobu se ignoruje (dvojklik). */
const DVOJKLIK_MS = 600;

const jePromise = (v: unknown): v is Promise<unknown> =>
  !!v && typeof (v as { then?: unknown }).then === 'function';

/**
 * Tlačítko s ochranou proti dvojitému odeslání:
 *  - když onClick vrátí Promise (async handler), tlačítko je až do jeho dokončení zablokované
 *    a ukazuje točící se kolečko,
 *  - rychlé druhé kliknutí (dvojklik) se ignoruje vždy.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled,
  type = 'button',
  as = 'button',
  onClick,
  ...props
}: ButtonProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Component = as as any;
  const [pracuje, setPracuje] = useState(false);
  const zamek = useRef(false);
  const posledniKlik = useRef(0);
  const pripojeno = useRef(true);
  useEffect(() => {
    pripojeno.current = true;
    return () => { pripojeno.current = false; };
  }, []);

  const handleClick = onClick && ((e: MouseEvent<HTMLButtonElement>) => {
    const ted = Date.now();
    if (zamek.current || ted - posledniKlik.current < DVOJKLIK_MS) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    posledniKlik.current = ted;
    const vysledek: unknown = onClick(e);
    if (jePromise(vysledek)) {
      zamek.current = true;
      setPracuje(true);
      const uvolnit = () => {
        zamek.current = false;
        if (pripojeno.current) setPracuje(false);
      };
      // Chybu zpracuje volající; tady jen uvolníme tlačítko
      vysledek.then(uvolnit, uvolnit);
    }
  });

  const vypnuto = disabled || pracuje;

  return (
    <Component
      type={as === 'button' ? type : undefined}
      className={`
        inline-flex items-center justify-center gap-2
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        rounded-[var(--radius-md)] font-semibold leading-none transition-colors duration-150 cursor-pointer
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]
        disabled:opacity-45 disabled:cursor-not-allowed
        ${className}
      `}
      disabled={vypnuto && as === 'button'}
      aria-busy={pracuje || undefined}
      onClick={handleClick}
      {...props}
    >
      {pracuje && (
        <span aria-hidden="true" className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin flex-shrink-0" />
      )}
      {children}
    </Component>
  );
}
