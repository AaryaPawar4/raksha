import { InputHTMLAttributes, ReactNode, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightElement?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightElement, id, className = '', ...rest }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-slate-700 select-none">
            {label}
            {rest.required && <span className="text-rose-500 ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            aria-invalid={!!error}
            className={`
              w-full text-xs sm:text-sm text-slate-900 bg-white border rounded-xl
              placeholder:text-slate-400 transition-all duration-150
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
              disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed
              ${leftIcon ? 'pl-9' : 'pl-3.5'}
              ${rightElement ? 'pr-10' : 'pr-3.5'}
              py-2.5
              ${error ? 'border-rose-300 bg-rose-50/20 focus:ring-rose-400' : 'border-slate-300 hover:border-slate-400'}
              ${className}
            `.trim()}
            {...rest}
          />
          {rightElement && (
            <div className="absolute right-2.5 flex items-center">
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-rose-600 font-medium flex items-center gap-1 mt-0.5">
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={`${inputId}-hint`} className="text-xs text-slate-500 mt-0.5">{hint}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
