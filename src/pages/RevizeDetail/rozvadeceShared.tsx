import { useState, useEffect } from 'react';

export const TYPY_KABELU = ['CYKY', 'CY', 'NYM', 'CYKFY', 'YDY', 'AYKY', 'AY'];
export const PRUREZY = ['1', '1,5', '2,5', '4', '6', '10', '16', '25', '35', '50', '70', '95', '120'];

export function computeVodic(typKabelu?: string, pocetZil?: string, prurez?: string): string {
  if (!typKabelu && !pocetZil && !prurez) return '';
  const core = pocetZil ? `${pocetZil}x${prurez ?? ''}` : prurez ?? '';
  return [typKabelu, core].filter(Boolean).join(' ');
}

// EditableSelect – select s možností zadat vlastní hodnotu
export function EditableSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (val: string) => void; options: string[];
}) {
  const isCustom = value !== '' && !options.includes(value);
  const [showCustom, setShowCustom] = useState(isCustom);

  // Sync showCustom when value changes externally (e.g. form reset)
  useEffect(() => {
    if (options.includes(value)) {
      setShowCustom(false);
    }
  }, [value, options]);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-[var(--text-secondary)]">{label}</label>
      {showCustom ? (
        <div className="relative">
          <input
            className="w-full px-3 py-2 pr-8 border rounded-lg bg-[var(--bg-input)] text-[var(--text)] border-[var(--border-input)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)] focus:border-blue-500/[0.5] text-xs"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
          />
          <button
            type="button"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] text-xs"
            onClick={() => { setShowCustom(false); }}
            title="Zpět na seznam"
          >↩</button>
        </div>
      ) : (
        <select
          className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-input)] text-[var(--text)] border-[var(--border-input)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)] focus:border-blue-500/[0.5] text-xs"
          value={options.includes(value) ? value : '__custom__'}
          onChange={(e) => {
            if (e.target.value === '__custom__') {
              setShowCustom(true);
              onChange('');
            } else {
              onChange(e.target.value);
            }
          }}
        >
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          <option value="__custom__">✏️ Vlastní hodnota...</option>
        </select>
      )}
    </div>
  );
}
