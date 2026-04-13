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
          <label className="text-xs font-medium text-slate-400">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`
            px-2 py-1.5 border rounded-lg bg-[#0e1629] text-slate-300 text-xs
            focus:outline-none focus:ring-1 focus:ring-blue-500/[0.4] focus:border-blue-500/[0.5]
            ${error ? 'border-red-500/[0.5]' : 'border-white/[0.09]'}
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
