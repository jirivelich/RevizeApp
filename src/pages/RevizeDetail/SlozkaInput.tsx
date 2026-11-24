import { useId, useMemo } from 'react';
import { Input } from '../../components/ui';
import { useRevize } from '../../hooks/useQueries';
import { navrhySlozek } from '../../utils/slozky';

interface SlozkaInputProps {
  value: string;
  onChange: (value: string) => void;
  objednatel?: string;
  label?: string;
  hint?: string;
}

/** Pole „Složka“ (hala, projekt…) s našeptáváním složek, které už existují. */
export function SlozkaInput({ value, onChange, objednatel, label = 'Složka (hala, projekt…)', hint }: SlozkaInputProps) {
  const { data: revize = [] } = useRevize();
  const listId = useId();
  const navrhy = useMemo(() => navrhySlozek(revize, objednatel), [revize, objednatel]);
  return (
    <>
      <Input
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        list={listId}
        placeholder="např. Hala A"
        hint={hint}
        autoComplete="off"
      />
      <datalist id={listId}>
        {navrhy.map(s => <option key={s} value={s} />)}
      </datalist>
    </>
  );
}
