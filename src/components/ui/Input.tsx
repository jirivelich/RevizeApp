import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';

export const fieldBase = `
  w-full px-3 border rounded-[var(--radius-md)]
  bg-[var(--bg-input)] text-[var(--text)] placeholder:text-[var(--text-muted)]
  transition-colors duration-150
  focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--focus-ring-color)]
  disabled:opacity-50 disabled:cursor-not-allowed
`;
export const fieldHeight = 'min-h-[44px] text-base sm:min-h-[40px] sm:text-sm';
export const labelClass = 'text-xs font-semibold text-[var(--text-secondary)]';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    const errorId = `${fieldId}-error`;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={fieldId} className={labelClass}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`
            ${fieldBase} ${fieldHeight}
            ${error ? 'border-[var(--danger)]' : 'border-[var(--border-input)]'}
            ${className}
          `}
          {...props}
        />
        {error ? (
          <span id={errorId} role="alert" className="text-xs text-[var(--danger-text)]">{error}</span>
        ) : hint ? (
          <span className="text-xs text-[var(--text-muted)]">{hint}</span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = '', id, rows = 3, ...props }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    const errorId = `${fieldId}-error`;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={fieldId} className={labelClass}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={fieldId}
          rows={rows}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`
            ${fieldBase} py-2.5 min-h-[80px] text-base sm:text-sm resize-y
            ${error ? 'border-[var(--danger)]' : 'border-[var(--border-input)]'}
            ${className}
          `}
          {...props}
        />
        {error ? (
          <span id={errorId} role="alert" className="text-xs text-[var(--danger-text)]">{error}</span>
        ) : hint ? (
          <span className="text-xs text-[var(--text-muted)]">{hint}</span>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className = '', id, ...props }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
      <label htmlFor={fieldId} className={`flex items-center gap-2.5 min-h-[32px] cursor-pointer text-sm text-[var(--text)] ${className}`}>
        <input
          ref={ref}
          id={fieldId}
          type="checkbox"
          className="h-5 w-5 shrink-0 cursor-pointer accent-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
          {...props}
        />
        {label}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, className = '', id, ...props }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
      <label htmlFor={fieldId} className={`flex items-center gap-2.5 min-h-[32px] cursor-pointer text-sm text-[var(--text)] ${className}`}>
        <span className="relative inline-block h-6 w-[42px] shrink-0">
          <input
            ref={ref}
            id={fieldId}
            type="checkbox"
            role="switch"
            className="peer absolute inset-0 z-10 m-0 h-full w-full cursor-pointer opacity-0"
            {...props}
          />
          <span className="absolute inset-0 rounded-full bg-[var(--border-input)] transition-colors peer-checked:bg-[var(--primary)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--focus-ring-color)] peer-disabled:opacity-50" />
          <span className="absolute left-[3px] top-[3px] h-[18px] w-[18px] rounded-full bg-[var(--text)] transition-transform peer-checked:translate-x-[18px] peer-checked:bg-[var(--primary-fg)]" />
        </span>
        {label}
      </label>
    );
  }
);

Switch.displayName = 'Switch';
