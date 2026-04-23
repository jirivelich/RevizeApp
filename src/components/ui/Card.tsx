import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export function Card({ title, children, className = '', actions }: CardProps) {
  return (
    <div className={`bg-[var(--glass-bg)] backdrop-blur-xl rounded-xl border border-[var(--glass-border)] shadow-[var(--shadow-elevated)] transition-all duration-300 hover:border-[var(--glass-border-hover)] hover:-translate-y-px ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--glass-border)]">
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
