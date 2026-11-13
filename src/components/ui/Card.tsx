import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
  /** Barevný 3px proužek vlevo (statistické karty). */
  accent?: 'primary' | 'success' | 'danger' | 'warning';
}

const accentClasses = {
  primary: 'border-l-[3px] border-l-[var(--primary)]',
  success: 'border-l-[3px] border-l-[var(--success)]',
  danger: 'border-l-[3px] border-l-[var(--danger)]',
  warning: 'border-l-[3px] border-l-[var(--warning)]',
};

export function Card({ title, children, className = '', actions, accent }: CardProps) {
  return (
    <div className={`bg-[var(--surface)] rounded-[var(--radius-lg)] border border-[var(--border)] overflow-hidden ${accent ? accentClasses[accent] : ''} ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[var(--border)]">
          {title && <h2 className="text-sm font-semibold text-[var(--text)]">{title}</h2>}
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}
