import type { ReactNode } from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-[var(--success-bg)] text-[var(--success-text)]',
  warning: 'bg-[var(--warning-bg)] text-[var(--warning-text)]',
  danger: 'bg-[var(--danger-bg)] text-[var(--danger-text)]',
  info: 'bg-[var(--bg-accent-badge)] text-[var(--primary)]',
  neutral: 'bg-[var(--bg-hover)] text-[var(--text-secondary)]',
};

const dotClasses: Record<BadgeVariant, string> = {
  success: 'bg-[var(--success-text)]',
  warning: 'bg-[var(--warning-text)]',
  danger: 'bg-[var(--danger-text)]',
  info: 'bg-[var(--primary)]',
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
