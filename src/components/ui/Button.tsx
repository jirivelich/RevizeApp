import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  as?: 'button' | 'div';
}

const variantClasses = {
  primary: 'bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white shadow-[0_2px_12px_rgba(59,130,246,0.35)]',
  secondary: 'bg-[var(--bg-hover)] hover:bg-[var(--bg-hover-strong)] text-[var(--text-primary)] border border-[var(--border-hover)]',
  success: 'bg-emerald-500/[0.12] hover:bg-emerald-500/[0.20] text-emerald-400 border border-emerald-500/[0.20]',
  danger: 'bg-red-500/[0.10] hover:bg-red-500/[0.18] text-red-400 border border-red-500/[0.20]',
  warning: 'bg-amber-500/[0.10] hover:bg-amber-500/[0.18] text-amber-400 border border-amber-500/[0.20]',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
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
        rounded-lg font-medium transition-colors cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
        active:scale-95
        ${className}
      `}
      disabled={disabled && as === 'button'}
      {...props}
    >
      {children}
    </Component>
  );
}

