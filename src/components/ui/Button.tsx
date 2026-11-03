import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'success' | 'danger' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  as?: 'button' | 'div';
}

const variantClasses = {
  primary: 'bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-fg)] border border-transparent',
  secondary: 'bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text)] border border-[var(--border-input)]',
  ghost: 'bg-transparent hover:bg-[var(--bg-hover)] text-[var(--text)] border border-transparent',
  success: 'bg-[var(--success-bg)] hover:brightness-110 text-[var(--success-text)] border border-[var(--success)]/25',
  danger: 'bg-[var(--danger-bg)] hover:brightness-110 text-[var(--danger-text)] border border-[var(--danger)]/25',
  warning: 'bg-[var(--warning-bg)] hover:brightness-110 text-[var(--warning-text)] border border-[var(--warning)]/25',
};

const sizeClasses = {
  sm: 'px-3 text-[13px] min-h-[32px]',
  md: 'px-4 text-sm min-h-[40px]',
  lg: 'px-6 text-base min-h-[48px]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled,
  type = 'button',
  as = 'button',
  ...props
}: ButtonProps) {
  const Component = as as any;

  return (
    <Component
      type={as === 'button' ? type : undefined}
      className={`
        inline-flex items-center justify-center gap-2
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        rounded-[var(--radius-md)] font-semibold leading-none transition-colors duration-150 cursor-pointer
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]
        disabled:opacity-45 disabled:cursor-not-allowed
        ${className}
      `}
      disabled={disabled && as === 'button'}
      {...props}
    >
      {children}
    </Component>
  );
}
