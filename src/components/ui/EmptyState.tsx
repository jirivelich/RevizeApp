import type { ReactNode } from 'react';
import { Card } from './Card';

interface EmptyStateProps {
  message: string;
  action?: ReactNode;
}

/** Prázdný stav seznamu: text a volitelná hlavní akce. */
export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <Card className="p-8 text-center">
      <p className="text-sm text-[var(--text-secondary)]">{message}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </Card>
  );
}
