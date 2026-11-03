import { useDialog } from './ui/useDialog';
import { Button } from './ui';
import { Icon } from './icons';

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
      <div ref={ref} {...dialogProps} className="bg-[var(--surface)] border border-[var(--border-input)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] p-8 max-w-sm w-full mx-4 text-center outline-none">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] grid place-items-center">
          <Icon name="clock" size={26} />
        </div>
        <h2 id={titleId} className="text-xl font-semibold text-[var(--text)] mb-2">Brzy budete odhlášeni</h2>
        <p className="text-[var(--text-secondary)] mb-2">
          Kvůli nečinnosti budete automaticky odhlášeni za:
        </p>
        <div className="text-4xl font-mono font-bold text-[var(--text)] mb-6 tabular-nums">
          {minutes}:{seconds}
        </div>
        <div className="flex gap-3 justify-center">
          <Button onClick={onStay}>Zůstat přihlášen</Button>
          <Button variant="secondary" onClick={onLogout}>Odhlásit</Button>
        </div>
      </div>
    </div>
  );
}
