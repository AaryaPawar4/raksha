import { TextareaHTMLAttributes, forwardRef } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
  maxLength?: number;
  currentLength?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, id, maxLength, currentLength, className = '', ...rest }, ref) => {
    const textareaId = id || label.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-baseline">
          <label htmlFor={textareaId} className="text-sm font-medium text-slate-700">
            {label}
            {rest.required && <span className="text-rose-500 ml-1">*</span>}
          </label>
          {maxLength !== undefined && currentLength !== undefined && (
            <span className={`text-xs ${currentLength > maxLength * 0.9 ? 'text-amber-600' : 'text-slate-400'}`}>
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
        <textarea
          ref={ref}
          id={textareaId}
          maxLength={maxLength}
          aria-invalid={!!error}
          className={`
            w-full px-3 py-2 text-sm text-slate-900 bg-white border rounded-lg resize-y min-h-[100px]
            placeholder:text-slate-400 transition
            focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500
            disabled:bg-slate-50
            ${error ? 'border-red-400 bg-red-50/30' : 'border-slate-300 hover:border-slate-400'}
            ${className}
          `.trim()}
          {...rest}
        />
        {error && <p className="text-xs text-red-600 mt-0.5">{error}</p>}
        {!error && hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
