import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className = '', ...rest }, ref) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
          {label}
          {rest.required && <span className="text-rose-500 ml-1">*</span>}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          aria-invalid={!!error}
          className={`
            w-full px-3 py-2 text-sm text-slate-900 bg-white border rounded-lg
            placeholder:text-slate-400 transition
            focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500
            disabled:bg-slate-50 disabled:text-slate-500
            ${error ? 'border-red-400 bg-red-50/30' : 'border-slate-300 hover:border-slate-400'}
            ${className}
          `.trim()}
          {...rest}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-red-600 flex items-center gap-1 mt-0.5">
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
