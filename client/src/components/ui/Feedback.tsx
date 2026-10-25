import { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, ServerCrash, X } from 'lucide-react';
import { Button } from './Button';

interface ErrorAlertProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'inline' | 'page';
}

export function ErrorAlert({
  title = 'Something went wrong',
  message,
  onRetry,
  onDismiss,
  variant = 'inline',
}: ErrorAlertProps) {
  if (variant === 'page') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center max-w-md mx-auto">
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl shadow-subtle">
          <ServerCrash className="w-8 h-8 text-rose-600" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-slate-800 text-base">{title}</h3>
          <p className="text-xs sm:text-sm text-slate-500">{message}</p>
        </div>
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 bg-rose-50 border border-rose-200/90 rounded-xl p-3.5 text-xs sm:text-sm shadow-2xs">
      <div className="flex items-start gap-2.5 flex-1 min-w-0">
        <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          {title && <p className="font-semibold text-rose-900">{title}</p>}
          <p className="text-rose-700 leading-relaxed text-xs">{message}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline px-1"
          >
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss error"
            className="text-rose-400 hover:text-rose-700 p-0.5 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
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
    <div className="flex flex-col items-center justify-center gap-3 py-16 px-4 text-center max-w-sm mx-auto">
      {icon && (
        <div className="p-3.5 bg-slate-100 border border-slate-200/80 rounded-2xl text-slate-400 shadow-2xs">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <h3 className="font-bold text-slate-800 text-sm sm:text-base">{title}</h3>
        {description && (
          <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'danger' | 'primary' | 'success';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1 flex-1">
            <h3 id="modal-title" className="font-bold text-slate-900 text-base">
              {title}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
