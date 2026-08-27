import type { ReactNode } from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500/[0.15] text-emerald-400',
  warning: 'bg-amber-500/[0.15] text-amber-400',
  danger: 'bg-red-500/[0.15] text-red-400',
  info: 'bg-[var(--bg-accent-badge)] text-blue-400',
  neutral: 'bg-[var(--bg-hover)] text-[var(--text-secondary)]',
};

const dotClasses: Record<BadgeVariant, string> = {
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-red-400',
  info: 'bg-blue-400',
  neutral: 'bg-[var(--text-muted)]',
};

export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${variantClasses[variant]} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotClasses[variant]}`} />
      {children}
    </span>
  );
}
