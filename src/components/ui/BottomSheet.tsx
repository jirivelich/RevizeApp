import type { ReactNode } from 'react';
import { useDialog } from './useDialog';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function BottomSheet({ isOpen, onClose, title, children, footer }: BottomSheetProps) {
  const { ref, titleId, dialogProps } = useDialog(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-[var(--overlay)]" onClick={onClose} />
      <div
        ref={ref}
        {...dialogProps}
        className="relative bg-[var(--surface)] border-t border-[var(--border-medium)] rounded-t-2xl shadow-[var(--shadow-lg)] max-h-[85vh] flex flex-col outline-none"
        style={{ animation: 'slideUp 0.25s ease-out' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-[var(--border-strong)]" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border-subtle)] flex-shrink-0">
          <h2 id={titleId} className="text-base font-semibold text-[var(--text)]">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Zavřít"
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1">
          {children}
        </div>
        {/* Footer */}
        {footer && (
          <div className="flex flex-col-reverse gap-2 px-5 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-faint)] flex-shrink-0 [&>button]:w-full">
            {footer}
          </div>
        )}
      </div>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
