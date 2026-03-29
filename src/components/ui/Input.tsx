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
          <label className="text-xs font-medium text-slate-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            px-2 py-1.5 border rounded-lg
            focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400
            text-xs
            ${error ? 'border-red-500' : 'border-slate-300'}
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
