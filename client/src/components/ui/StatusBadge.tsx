import { IncidentStatus, IncidentType } from '@rakshasphere/shared';
import { ReactNode } from 'react';
import { CheckCircle2, Clock, AlertCircle, Archive } from 'lucide-react';

const STATUS_CONFIG: Record<IncidentStatus, { label: string; cls: string; icon: ReactNode }> = {
  OPEN: {
    label: 'Open',
    cls: 'bg-rose-50 text-rose-700 border-rose-200/80',
    icon: <AlertCircle className="w-3 h-3" />,
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    cls: 'bg-amber-50 text-amber-800 border-amber-200/80',
    icon: <Clock className="w-3 h-3" />,
  },
  RESOLVED: {
    label: 'Resolved',
    cls: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  ARCHIVED: {
    label: 'Archived',
    cls: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: <Archive className="w-3 h-3" />,
  },
};

const TYPE_CONFIG: Record<IncidentType, { label: string; cls: string }> = {
  HARASSMENT: { label: 'Harassment', cls: 'bg-rose-50 text-rose-800 border-rose-200/60' },
  DOXXING: { label: 'Doxxing', cls: 'bg-purple-50 text-purple-800 border-purple-200/60' },
  IMPERSONATION: { label: 'Impersonation', cls: 'bg-amber-50 text-amber-800 border-amber-200/60' },
  BLACKMAIL: { label: 'Blackmail', cls: 'bg-red-50 text-red-800 border-red-200/60' },
  STALKING: { label: 'Stalking', cls: 'bg-orange-50 text-orange-800 border-orange-200/60' },
  FINANCIAL_SCAM: { label: 'Financial Scam', cls: 'bg-blue-50 text-blue-800 border-blue-200/60' },
  OTHER: { label: 'Other Threat', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
};

export function StatusBadge({ status }: { status: IncidentStatus }) {
  const conf = STATUS_CONFIG[status] || STATUS_CONFIG.OPEN;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full border shadow-2xs ${conf.cls}`}
    >
      {conf.icon}
      <span>{conf.label}</span>
    </span>
  );
}

export function TypeBadge({ type }: { type: IncidentType }) {
  const conf = TYPE_CONFIG[type] || TYPE_CONFIG.OTHER;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border ${conf.cls}`}
    >
      {conf.label}
    </span>
  );
}

export function SuccessAlert({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200/90 rounded-xl px-4 py-3 text-xs sm:text-sm text-emerald-800">
      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
      <p className="font-medium">{message}</p>
    </div>
  );
}

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
}: {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}) {
  const variantStyles = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-rose-50 text-rose-800 border-rose-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
    purple: 'bg-purple-50 text-purple-800 border-purple-200',
  };

  const sizeStyles = {
    xs: 'text-[10px] px-2 py-0.5',
    sm: 'text-xs px-2.5 py-0.5',
    md: 'text-xs px-3 py-1 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
}
