import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const sizeMap = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export function LoadingSpinner({ message = 'Loading...', size = 'md' }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-slate-500">
      <Loader2 className={`animate-spin text-indigo-600 ${sizeMap[size]}`} />
      {message && <span className="text-xs sm:text-sm font-medium text-slate-600">{message}</span>}
    </div>
  );
}

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-shimmer rounded-xl h-20 w-full" />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="skeleton-shimmer h-4 w-28 rounded-md" />
        <div className="skeleton-shimmer h-7 w-7 rounded-lg" />
      </div>
      <div className="skeleton-shimmer h-8 w-20 rounded-md" />
      <div className="skeleton-shimmer h-3 w-36 rounded-md" />
    </div>
  );
}
