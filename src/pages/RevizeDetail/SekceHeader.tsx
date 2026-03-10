interface SekceHeaderProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  visible: boolean;
  onToggle: () => void;
}

export function SekceHeader({ id, children, className = 'bg-slate-800', visible, onToggle }: SekceHeaderProps) {
  return (
    <div className={`${className} text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center justify-between`}>
      <span className={!visible ? 'opacity-50 line-through' : ''}>{children}</span>
      <button
        onClick={onToggle}
        className="flex items-center gap-1 text-[10px] font-normal normal-case tracking-normal opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
        title={visible ? 'Skrýt v tisku' : 'Zobrazit v tisku'}
      >
        {visible ? 'Tisk' : 'Skryto'}
      </button>
    </div>
  );
}
