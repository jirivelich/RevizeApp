import { type SelectHTMLAttributes, forwardRef, useId } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', id, ...props }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    const errorId = `${fieldId}-error`;
    return (
      <div className="flex flex-col gap-0.5">
        {label && (
          <label htmlFor={fieldId} className="text-xs font-medium text-[var(--text-secondary)]">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`
            px-2 py-1.5 border rounded-lg bg-[var(--bg-input)] text-[var(--text)] min-h-[44px] text-base sm:min-h-[36px] sm:text-sm
            transition-colors duration-150
            focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--focus-ring-color)]
            ${error ? 'border-[var(--danger)]' : 'border-[var(--border-input)]'}
            ${className}
          `}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <span id={errorId} role="alert" className="text-xs text-[var(--danger-text)]">{error}</span>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
