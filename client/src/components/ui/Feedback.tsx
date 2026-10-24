import { ReactNode } from 'react';
import { AlertTriangle, Wifi, ServerCrash } from 'lucide-react';
import { Button } from './Button';

interface ErrorAlertProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  variant?: 'inline' | 'page';
}

export function ErrorAlert({ title = 'Something went wrong', message, onRetry, variant = 'inline' }: ErrorAlertProps) {
  if (variant === 'page') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="p-4 bg-red-50 rounded-full">
          <ServerCrash className="w-8 h-8 text-red-500" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">{message}</p>
        </div>
        {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button>}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
      <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-medium text-red-800">{title}</p>
        <p className="text-red-700 text-xs mt-0.5">{message}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="text-xs font-medium text-red-700 hover:text-red-900 underline">
          Retry
        </button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {icon && <div className="p-4 bg-slate-100 rounded-full text-slate-400">{icon}</div>}
      <div>
        <h3 className="font-semibold text-slate-700">{title}</h3>
        {description && <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
      <Wifi className="w-4 h-4 text-amber-600 flex-shrink-0" />
      <div className="flex-1">
        <p className="font-medium text-amber-800">Cannot reach backend server</p>
        <p className="text-amber-700 text-xs mt-0.5">Ensure the backend is running on port 5000.</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="text-xs font-medium text-amber-700 hover:text-amber-900 underline">
          Retry
        </button>
      )}
    </div>
  );
}
