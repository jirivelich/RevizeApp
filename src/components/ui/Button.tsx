import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  as?: 'button' | 'div';
}

const variantClasses = {
  primary: 'bg-gradient-to-br from-[#F00807] to-[#C00606] hover:from-[#CC0706] hover:to-[#A00505] text-white shadow-[0_2px_10px_rgba(240,8,7,0.30)] hover:shadow-[0_4px_16px_rgba(240,8,7,0.45)]',
  secondary: 'bg-[var(--glass-bg)] backdrop-blur-sm hover:bg-[var(--bg-hover-strong)] text-[var(--text)] border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)]',
  success: 'bg-emerald-500/[0.15] hover:bg-emerald-500/[0.22] text-emerald-400 border border-emerald-500/[0.25] hover:shadow-[0_2px_10px_rgba(34,197,94,0.20)]',
  danger: 'bg-red-500/[0.12] hover:bg-red-500/[0.20] text-red-400 border border-red-500/[0.25] hover:shadow-[0_2px_10px_rgba(248,113,113,0.20)]',
  warning: 'bg-amber-500/[0.12] hover:bg-amber-500/[0.20] text-amber-400 border border-amber-500/[0.25] hover:shadow-[0_2px_10px_rgba(245,158,11,0.20)]',
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
        rounded-lg font-medium transition-all duration-200 cursor-pointer
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

