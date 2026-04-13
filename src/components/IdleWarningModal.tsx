interface IdleWarningModalProps {
  remainingSeconds: number;
  onStay: () => void;
  onLogout: () => void;
}

export function IdleWarningModal({ remainingSeconds, onStay, onLogout }: IdleWarningModalProps) {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = (remainingSeconds % 60).toString().padStart(2, '0');

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
      <div className="bg-[var(--surface)] rounded-xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
        <div className="text-5xl mb-4">⏱️</div>
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Brzy budete odhlášeni</h2>
        <p className="text-[var(--text-secondary)] mb-2">
          Kvůli nečinnosti budete automaticky odhlášeni za:
        </p>
        <div className="text-4xl font-mono font-bold text-[var(--text-primary)] mb-6">
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
            className="bg-[var(--bg-surface)] text-[var(--text-primary)] px-5 py-2.5 rounded-lg font-medium border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            Odhlásit
          </button>
        </div>
      </div>
    </div>
  );
}
