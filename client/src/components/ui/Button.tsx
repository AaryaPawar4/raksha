import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: ReactNode;
}

const variantClasses = {
  primary: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-200 disabled:bg-rose-300',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200',
  ghost: 'hover:bg-slate-100 text-slate-700',
  danger: 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-6 py-2.5 text-sm rounded-xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || isLoading}
      className={`
        inline-flex items-center justify-center gap-2 font-medium transition-all
        focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2
        disabled:opacity-60 disabled:cursor-not-allowed
        ${variantClasses[variant]} ${sizeClasses[size]} ${className}
      `.trim()}
    >
      {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {children}
    </button>
  );
}
