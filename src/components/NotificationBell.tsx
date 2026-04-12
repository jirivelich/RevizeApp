import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationPanel } from './NotificationPanel';

interface Props {
}

export function NotificationBell({  }: Props) {
  const [open, setOpen] = useState(false);
  const { notifications, count } = useNotifications();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Zavření klikem mimo
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Zavření klávesou Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Výpočet pozice panelu z pozice tlačítka
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPanelStyle({
      position: 'fixed',
      left: rect.right + 8,
      bottom: window.innerHeight - rect.bottom - 8,
      zIndex: 50,
    });
  }, [open]);

  const criticalCount = notifications.filter(n => n.severity === 'critical').length;
  const badgeCount = count > 9 ? '9+' : String(count);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen(v => !v)}
        aria-label={`Upozornění${count > 0 ? ` (${count})` : ''}`}
        className="relative w-full flex items-center gap-2.5 px-3 py-2 rounded text-[13px] font-medium transition-colors text-[#475569] hover:text-[#94a3b8] sidebar-nav-item"
      >
        <span className="relative flex-shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {count > 0 && (
            <span className={`absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[9px] font-bold text-white leading-none px-0.5 ${criticalCount > 0 ? 'bg-red-500' : 'bg-amber-500'}`}>
              {badgeCount}
            </span>
          )}
        </span>
        <span>Upozornění</span>
      </button>

      {open && createPortal(
        <div ref={panelRef} style={panelStyle}>
          <NotificationPanel notifications={notifications} onClose={() => setOpen(false)} />
        </div>,
        document.body
      )}
    </>
  );
}
