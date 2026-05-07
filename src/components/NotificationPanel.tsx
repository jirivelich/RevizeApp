import { useNavigate } from 'react-router-dom';
import type { AppNotification, NotificationSeverity } from '../types';

interface Props {
  notifications: AppNotification[];
  onClose: () => void;
}

function severityStyles(s: NotificationSeverity): { border: string; badge: string; icon: string } {
  switch (s) {
    case 'critical':
      return { border: 'border-l-red-500/[0.7]', badge: 'bg-red-500/[0.12] text-red-400', icon: 'text-red-400' };
    case 'warning':
      return { border: 'border-l-amber-500/[0.7]', badge: 'bg-amber-500/[0.12] text-amber-400', icon: 'text-amber-400' };
    default:
      return { border: 'border-l-blue-500/[0.7]', badge: 'bg-blue-500/[0.12] text-blue-400', icon: 'text-blue-400' };
  }
}

function TypeIcon({ type }: { type: AppNotification['type'] }) {
  switch (type) {
    case 'zakazka_upcoming':
      return (
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case 'revize_overdue':
      return (
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case 'report_deadline':
      return (
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'kalibrace_expiring':
      return (
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case 'technik_expiry':
      return (
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
  }
}

function DaysBadge({ days, sev }: { days: number; sev: NotificationSeverity }) {
  const { badge } = severityStyles(sev);
  if (days < 0) return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge}`}>+{-days} dní</span>;
  if (days === 0) return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge}`}>dnes</span>;
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge}`}>{days} d</span>;
}

export function NotificationPanel({ notifications, onClose }: Props) {
  const navigate = useNavigate();

  const handleClick = (link: string) => {
    onClose();
    navigate(link);
  };

  return (
    <div className="flex flex-col rounded-xl border w-80 max-h-[480px] overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border-medium)', boxShadow: 'var(--shadow-elevated)' }}>
      {/* Hlavička */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="text-sm font-semibold text-[var(--text)]">Upozornění</span>
          {notifications.length > 0 && (
            <span className="text-[11px] font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5 leading-none">
              {notifications.length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-slate-600 hover:text-[var(--text-secondary)] transition-colors"
          style={{ background: 'var(--bg-surface)' }}
          aria-label="Zavřít"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Obsah */}
      <div className="overflow-y-auto flex-1">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-600">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
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
                    className={`w-full text-left flex items-start gap-3 px-4 py-3 border-l-4 ${border} transition-colors`}
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--active-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span className={`mt-0.5 ${icon}`}>
                      <TypeIcon type={n.type} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[var(--text)] truncate">{n.title}</p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">{n.description}</p>
                    </div>
                    <DaysBadge days={n.daysUntil} sev={n.severity} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
