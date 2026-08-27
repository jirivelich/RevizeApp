import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export function Card({ title, children, className = '', actions }: CardProps) {
  return (
    <div className={`bg-[var(--surface)] rounded-[var(--radius-lg)] border border-[var(--border-medium)] shadow-[var(--shadow-elevated)] transition-colors duration-200 hover:border-[var(--border-strong)] ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
          {title && <h2 className="text-lg font-semibold text-[var(--text)]">{title}</h2>}
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}
