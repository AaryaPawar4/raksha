import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
}

export function Card({ children, className = '', hoverable = false }: CardProps) {
  return (
    <div
      className={`
        bg-white rounded-2xl border border-slate-200/90 shadow-subtle
        ${hoverable ? 'hover:shadow-card hover:border-slate-300 transition-all duration-200' : ''}
        ${className}
      `.trim()}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = '',
  action,
}: CardProps & { action?: ReactNode }) {
  return (
    <div
      className={`px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4 ${className}`}
    >
      <div className="flex-1 min-w-0">{children}</div>
      {action && <div className="flex items-center gap-2 flex-shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ children, className = '' }: CardProps) {
  return <div className={`p-5 sm:p-6 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }: CardProps) {
  return (
    <div
      className={`px-5 py-3.5 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl flex items-center justify-between gap-4 text-xs text-slate-500 ${className}`}
    >
      {children}
    </div>
  );
}
