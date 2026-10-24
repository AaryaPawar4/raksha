import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };

export function LoadingSpinner({ message = 'Loading...', size = 'md' }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-slate-500">
      <Loader2 className={`animate-spin text-rose-500 ${sizeMap[size]}`} />
      <span className="text-sm">{message}</span>
    </div>
  );
}

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-slate-100 rounded-xl h-20 w-full" />
      ))}
    </div>
  );
}
