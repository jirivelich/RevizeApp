import { useDialog } from './ui/useDialog';

interface IdleWarningModalProps {
  remainingSeconds: number;
  onStay: () => void;
  onLogout: () => void;
}

export function IdleWarningModal({ remainingSeconds, onStay, onLogout }: IdleWarningModalProps) {
  // Escape = zůstat přihlášen (bezpečná volba)
  const { ref, titleId, dialogProps } = useDialog(true, onStay);
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = (remainingSeconds % 60).toString().padStart(2, '0');

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--overlay)]">
      <div ref={ref} {...dialogProps} className="bg-[var(--surface)] border border-[var(--border-medium)] rounded-xl shadow-[var(--shadow-lg)] p-8 max-w-sm w-full mx-4 text-center outline-none">
        <div className="text-5xl mb-4">⏱️</div>
        <h2 id={titleId} className="text-xl font-semibold text-[var(--text)] mb-2">Brzy budete odhlášeni</h2>
        <p className="text-[var(--text-secondary)] mb-2">
          Kvůli nečinnosti budete automaticky odhlášeni za:
        </p>
        <div className="text-4xl font-mono font-bold text-[var(--text)] mb-6">
          {minutes}:{seconds}
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onStay}
            className="bg-[var(--primary)] text-white px-5 py-2.5 rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors"
          >
            Zůstat přihlášen
          </button>
          <button
            onClick={onLogout}
            className="bg-[var(--bg-surface)] text-[var(--text)] px-5 py-2.5 rounded-lg font-medium border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            Odhlásit
          </button>
        </div>
      </div>
    </div>
  );
}
