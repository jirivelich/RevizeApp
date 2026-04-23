import { type SelectHTMLAttributes, forwardRef } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-0.5">
        {label && (
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`
            px-2 py-1.5 border rounded-lg bg-[var(--glass-bg)] text-[var(--text)] text-xs
            transition-all duration-200
            focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)] focus:border-[rgba(146,196,59,0.4)] focus:shadow-[0_0_0_3px_rgba(146,196,59,0.12)]
            ${error ? 'border-red-500/[0.5]' : 'border-[var(--glass-border)]'}
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
          <span className="text-sm text-red-500">{error}</span>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
