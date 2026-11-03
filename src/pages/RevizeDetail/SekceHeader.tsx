interface SekceHeaderProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  visible: boolean;
  onToggle: () => void;
}

export function SekceHeader({ id: _id, children, className = 'bg-[var(--bg-surface)]', visible, onToggle }: SekceHeaderProps) {
  return (
    <div className={`${className} text-[var(--text)] px-4 py-2.5 border-b border-[var(--border)] text-sm font-semibold flex items-center justify-between`}>
      <span className={!visible ? 'opacity-50 line-through' : ''}>{children}</span>
      <button
        onClick={onToggle}
        className="flex items-center gap-1 text-xs font-normal normal-case tracking-normal text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors cursor-pointer"
        title={visible ? 'Skrýt v tisku' : 'Zobrazit v tisku'}
      >
        {visible ? 'Tisk' : 'Skryto'}
      </button>
    </div>
  );
}
