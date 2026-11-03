import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNotifications } from '../hooks/useNotifications';
import { useBrowserNotifications } from '../hooks/useBrowserNotifications';
import { useNastaveni } from '../hooks/useQueries';
import { NotificationPanel } from './NotificationPanel';
import { BottomSheet } from './ui';
import { Icon } from './icons';

interface Props {
}

/** true, pokud je viewport užší než lg (1024 px) – panel se pak zobrazí jako spodní sheet. */
function useIsMobile(): boolean {
  const query = '(max-width: 1023px)';
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = () => setMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return mobile;
}

export function NotificationBell({ strongText = false }: Props & { strongText?: boolean }) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const { notifications, count } = useNotifications();
  const { data: nastaveni } = useNastaveni();
  useBrowserNotifications(notifications, !!nastaveni?.browserNotificationsEnabled);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Zavření klikem mimo a klávesou Escape (jen desktopový popover; sheet řeší BottomSheet)
  useEffect(() => {
    if (!open || isMobile) return;
    const onMouseDown = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, isMobile]);

  // Výpočet pozice panelu z pozice tlačítka
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  useEffect(() => {
    if (!open || isMobile || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPanelStyle({
      position: 'fixed',
      left: rect.right + 8,
      bottom: Math.max(8, window.innerHeight - rect.bottom - 8),
      zIndex: 50,
    });
  }, [open, isMobile]);

  const criticalCount = notifications.filter(n => n.severity === 'critical').length;
  const badgeCount = count > 9 ? '9+' : String(count);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen(v => !v)}
        aria-label={`Upozornění${count > 0 ? ` (${count})` : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`relative w-full flex items-center gap-2.5 h-[38px] px-2.5 rounded-[var(--radius-md)] text-[13px] text-[var(--nav-text)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] ${strongText ? 'font-semibold' : 'font-medium'}`}
      >
        <Icon name="bell" size={20} />
        <span>Upozornění</span>
        {count > 0 && (
          <span className={`ml-auto min-w-[18px] h-[18px] px-[5px] inline-grid place-items-center rounded-full text-[11px] font-bold leading-none text-[var(--background)] ${criticalCount > 0 ? 'bg-[var(--danger)]' : 'bg-[var(--warning)]'}`}>
            {badgeCount}
          </span>
        )}
      </button>

      {open && !isMobile && createPortal(
        <div ref={panelRef} style={panelStyle}>
          <NotificationPanel notifications={notifications} onClose={() => setOpen(false)} />
        </div>,
        document.body
      )}

      {isMobile && (
        <BottomSheet isOpen={open} onClose={() => setOpen(false)} title="Upozornění">
          <NotificationPanel notifications={notifications} onClose={() => setOpen(false)} embedded />
        </BottomSheet>
      )}
    </>
  );
}
