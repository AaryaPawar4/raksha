import { SelectHTMLAttributes, forwardRef, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, id, children, className = '', ...rest }, ref) => {
    const selectId = id || label.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={selectId} className="text-sm font-medium text-slate-700">
          {label}
          {rest.required && <span className="text-rose-500 ml-1">*</span>}
        </label>
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={!!error}
            className={`
              w-full appearance-none px-3 py-2 pr-9 text-sm text-slate-900 bg-white border rounded-lg
              transition focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500
              disabled:bg-slate-50 disabled:text-slate-500
              ${error ? 'border-red-400 bg-red-50/30' : 'border-slate-300 hover:border-slate-400'}
              ${className}
            `.trim()}
            {...rest}
          >
            {children}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        {error && <p className="text-xs text-red-600 mt-0.5">{error}</p>}
        {!error && hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
