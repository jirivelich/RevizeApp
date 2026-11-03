import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  as?: 'button' | 'div';
}

const variantClasses = {
  primary: 'bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-[var(--shadow-elevated)]',
  secondary: 'bg-[var(--bg-surface)] hover:bg-[var(--bg-hover-strong)] text-[var(--text)] border border-[var(--border-medium)] hover:border-[var(--border-strong)]',
  success: 'bg-[var(--success-bg)] hover:brightness-110 text-[var(--success-text)] border border-[var(--success)]/25',
  danger: 'bg-[var(--danger-bg)] hover:brightness-110 text-[var(--danger-text)] border border-[var(--danger)]/25',
  warning: 'bg-[var(--warning-bg)] hover:brightness-110 text-[var(--warning-text)] border border-[var(--warning)]/25',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm min-h-[36px]',
  md: 'px-4 py-2 min-h-[44px]',
  lg: 'px-6 py-3 text-lg min-h-[48px]',
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
        inline-flex items-center justify-center
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        rounded-lg font-medium transition-colors duration-150 cursor-pointer
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]
        disabled:opacity-50 disabled:cursor-not-allowed
        active:brightness-95
        ${className}
      `}
      disabled={disabled && as === 'button'}
      {...props}
    >
      {children}
    </Component>
  );
}

