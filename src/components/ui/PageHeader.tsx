import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

/** Jednotná hlavička stránky: H1 + podtitul vlevo, akce vpravo. */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex justify-between items-center gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold leading-tight text-[var(--text)]">{title}</h1>
        {subtitle && <p className="text-[13px] text-[var(--text-secondary)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
