import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
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
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`
            px-2 py-1.5 border rounded-lg
            bg-[var(--bg-input)] text-[var(--text)] placeholder:text-[var(--text-muted)]
            transition-colors duration-150
            focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--focus-ring-color)]
            min-h-[44px] text-base sm:min-h-[36px] sm:text-sm
            ${error ? 'border-[var(--danger)]' : 'border-[var(--border-input)]'}
            ${className}
          `}
          {...props}
        />
        {error && (
          <span id={errorId} role="alert" className="text-xs text-[var(--danger-text)]">{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
