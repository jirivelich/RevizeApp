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
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
        <div className="text-5xl mb-4">⏱️</div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Brzy budete odhlášeni</h2>
        <p className="text-slate-600 mb-2">
          Kvůli nečinnosti budete automaticky odhlášeni za:
        </p>
        <div className="text-4xl font-mono font-bold text-slate-800 mb-6">
          {minutes}:{seconds}
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onStay}
            className="bg-slate-800 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-slate-700 transition-colors"
          >
            Zůstat přihlášen
          </button>
          <button
            onClick={onLogout}
            className="bg-white text-slate-700 px-5 py-2.5 rounded-lg font-medium border border-slate-300 hover:bg-slate-50 transition-colors"
          >
            Odhlásit
          </button>
        </div>
      </div>
    </div>
  );
}
