import { type ReactNode, useEffect } from 'react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function BottomSheet({ isOpen, onClose, title, children, footer }: BottomSheetProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative bg-[var(--surface)] rounded-t-2xl shadow-xl max-h-[85vh] flex flex-col"
        style={{ animation: 'slideUp 0.25s ease-out' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-[var(--border-strong)]" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] flex-shrink-0">
          <h2 className="text-sm font-semibold text-[var(--text)]">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-[var(--text-secondary)] hover:text-slate-600 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1">
          {children}
        </div>
        {/* Footer */}
        {footer && (
          <div className="flex flex-col-reverse gap-2 px-5 py-4 border-t border-[var(--border)] flex-shrink-0 [&>button]:w-full">
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
