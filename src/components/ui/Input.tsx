import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-0.5">
        {label && (
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            px-2 py-1.5 border rounded-lg
            bg-[var(--bg-input)] text-[var(--text-primary)] placeholder:text-slate-600
            focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)] focus:border-blue-500/[0.5]
            text-xs
            ${error ? 'border-red-500/[0.5]' : 'border-[var(--border-input)]'}
            ${className}
          `}
          {...props}
        />
        {error && (
          <span className="text-sm text-red-500">{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
