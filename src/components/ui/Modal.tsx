import { type ReactNode, useEffect } from 'react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-5xl',
  full: 'max-w-[95vw]',
};

export function Modal({ isOpen, onClose, title, children, footer, size = 'md' }: ModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/[0.8] backdrop-blur-sm" 
        onClick={onClose}
      />
      <div className={`relative bg-[var(--surface)] border border-[var(--border-medium)] rounded-xl shadow-2xl ${sizeClasses[size]} w-full mx-4 max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-table)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
          <Button variant="secondary" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">
          {children}
        </div>
        {footer && (
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-5 py-3 border-t border-[var(--border-table)] [&>button]:w-full [&>button]:sm:w-auto">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
