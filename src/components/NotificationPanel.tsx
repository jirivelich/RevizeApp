import { useNavigate } from 'react-router-dom';
import type { AppNotification, NotificationSeverity } from '../types';
import { Icon } from './icons';
import type { IconName } from './icons';

interface Props {
  notifications: AppNotification[];
  onClose: () => void;
  /** true = obsah bez vlastního rámce a hlavičky (uvnitř BottomSheet) */
  embedded?: boolean;
}

function severityStyles(s: NotificationSeverity): { border: string; badge: string; icon: string } {
  switch (s) {
    case 'critical':
      return { border: 'border-l-[var(--danger)]', badge: 'bg-[var(--danger-bg)] text-[var(--danger-text)]', icon: 'text-[var(--danger-text)]' };
    case 'warning':
      return { border: 'border-l-[var(--warning)]', badge: 'bg-[var(--warning-bg)] text-[var(--warning-text)]', icon: 'text-[var(--warning-text)]' };
    default:
      return { border: 'border-l-[var(--secondary)]', badge: 'bg-[var(--bg-secondary-accent)] text-[var(--secondary)]', icon: 'text-[var(--secondary)]' };
  }
}

const TYPE_ICON: Record<AppNotification['type'], IconName> = {
  zakazka_upcoming: 'calendar',
  revize_overdue: 'doc',
  report_deadline: 'clock',
  kalibrace_expiring: 'bolt',
  technik_expiry: 'user',
  revize_platnost_expiry: 'clock',
};

function DaysBadge({ days, sev }: { days: number; sev: NotificationSeverity }) {
  const { badge } = severityStyles(sev);
  const cls = `text-[11px] font-semibold px-1.5 py-0.5 rounded-[var(--radius-sm)] whitespace-nowrap ${badge}`;
  if (days < 0) return <span className={cls}>+{-days} dní</span>;
  if (days === 0) return <span className={cls}>dnes</span>;
  return <span className={cls}>{days} d</span>;
}

export function NotificationPanel({ notifications, onClose, embedded = false }: Props) {
  const navigate = useNavigate();

  const handleClick = (link: string) => {
    onClose();
    navigate(link);
  };

  const content = (
    <div className="overflow-y-auto flex-1">
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-[var(--text-muted)]">
          <Icon name="checkCircle" size={32} />
          <p className="text-sm">Žádná upozornění</p>
        </div>
      ) : (
        <ul>
          {notifications.map((n) => {
            const { border, icon } = severityStyles(n.severity);
            return (
              <li key={n.id}>
                <button
                  onClick={() => handleClick(n.link)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 border-l-[3px] ${border} border-b border-b-[var(--border-subtle)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring-color)]`}
                >
                  <span className={`mt-0.5 ${icon}`}>
                    <Icon name={TYPE_ICON[n.type]} size={16} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[var(--text)] truncate">{n.title}</p>
                    <p className="text-[12px] text-[var(--text-muted)] mt-0.5 leading-snug">{n.description}</p>
                  </div>
                  <DaysBadge days={n.daysUntil} sev={n.severity} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  if (embedded) return <div className="-m-5 flex flex-col">{content}</div>;

  return (
    <div
      role="dialog"
      aria-label="Upozornění"
      className="flex flex-col rounded-[var(--radius-lg)] border border-[var(--border-input)] bg-[var(--surface)] shadow-[var(--shadow-lg)] w-80 max-w-[calc(100vw-16px)] max-h-[min(480px,calc(100dvh-16px))] overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Icon name="bell" size={16} className="text-[var(--text-muted)]" />
          <span className="text-sm font-semibold text-[var(--text)]">Upozornění</span>
          {notifications.length > 0 && (
            <span className="text-[11px] font-bold bg-[var(--danger)] text-[var(--background)] rounded-full px-1.5 py-0.5 leading-none">
              {notifications.length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
          aria-label="Zavřít"
        >
          <Icon name="close" size={16} />
        </button>
      </div>
      {content}
    </div>
  );
}
