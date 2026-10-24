import { IncidentStatus, IncidentType } from '@rakshasphere/shared';

const STATUS_STYLES: Record<IncidentStatus, string> = {
  OPEN: 'bg-rose-100 text-rose-800 border-rose-200',
  UNDER_REVIEW: 'bg-amber-100 text-amber-800 border-amber-200',
  RESOLVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  ARCHIVED: 'bg-slate-100 text-slate-600 border-slate-200',
};

const STATUS_LABELS: Record<IncidentStatus, string> = {
  OPEN: 'Open',
  UNDER_REVIEW: 'Under Review',
  RESOLVED: 'Resolved',
  ARCHIVED: 'Archived',
};

const TYPE_LABELS: Record<IncidentType, string> = {
  HARASSMENT: 'Harassment',
  DOXXING: 'Doxxing',
  IMPERSONATION: 'Impersonation',
  BLACKMAIL: 'Blackmail',
  STALKING: 'Stalking',
  FINANCIAL_SCAM: 'Financial Scam',
  OTHER: 'Other',
};

export function StatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function TypeBadge({ type }: { type: IncidentType }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200">
      {TYPE_LABELS[type]}
    </span>
  );
}

export function SuccessAlert({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm">
      <span className="text-emerald-600 font-bold text-base">✓</span>
      <p className="text-emerald-800 font-medium">{message}</p>
    </div>
  );
}
