import type { ReactNode } from 'react';
import { Card } from './Card';

interface EmptyStateProps {
  message: string;
  action?: ReactNode;
  /** Volitelná ikona nad textem. */
  icon?: ReactNode;
}

/** Prázdný stav seznamu: ikona, text a volitelná hlavní akce. */
export function EmptyState({ message, action, icon }: EmptyStateProps) {
  return (
    <Card className="px-6 py-8 text-center">
      {icon && <div aria-hidden="true" className="mb-2 flex justify-center text-[var(--text-muted)] [&>svg]:h-7 [&>svg]:w-7">{icon}</div>}
      <p className="text-sm text-[var(--text-secondary)]">{message}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </Card>
  );
}
