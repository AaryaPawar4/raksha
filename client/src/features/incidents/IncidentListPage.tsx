import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FileText, PlusCircle, ChevronRight, CalendarDays, Monitor } from 'lucide-react';
import { apiClient, ApiError } from '../../services/apiClient';
import { Incident } from '@rakshasphere/shared';
import {
  Card, CardBody,
  Button, LoadingSkeleton, EmptyState, ErrorAlert, StatusBadge, TypeBadge,
} from '../../components/ui';

const PLATFORM_LABELS: Record<string, string> = {
  INSTAGRAM: 'Instagram', WHATSAPP: 'WhatsApp', TELEGRAM: 'Telegram',
  TWITTER_X: 'X (Twitter)', FACEBOOK: 'Facebook', SMS: 'SMS', EMAIL: 'Email', OTHER: 'Other',
};

function IncidentCard({ incident }: { incident: Incident }) {
  const date = new Date(incident.occurredAt);
  const dateStr = isNaN(date.getTime())
    ? 'Unknown date'
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <Link to={`/incidents/${incident.id}`} className="block group">
      <Card className="hover:shadow-md hover:border-slate-300 transition-all duration-150">
        <CardBody className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <TypeBadge type={incident.incidentType} />
              <StatusBadge status={incident.status} />
            </div>
            <h3 className="font-semibold text-slate-900 group-hover:text-rose-700 transition truncate">
              {incident.title}
            </h3>
            <p className="text-xs text-slate-500 line-clamp-2">
              {incident.description}
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-400 pt-0.5">
              <span className="flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                {dateStr}
              </span>
              <span className="flex items-center gap-1">
                <Monitor className="w-3 h-3" />
                {PLATFORM_LABELS[incident.platform] ?? incident.platform}
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-500 flex-shrink-0 mt-1 transition" />
        </CardBody>
      </Card>
    </Link>
  );
}

export function IncidentListPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 10;

  const fetchIncidents = useCallback(async (p: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient.incidents.list({ page: p, limit: LIMIT });
      setIncidents(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        setError('Cannot connect to the backend server. Please ensure it is running.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load incidents.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents(page);
  }, [fetchIncidents, page]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-rose-600" />
            My Incidents
          </h1>
          {!isLoading && !error && (
            <p className="text-sm text-slate-500 mt-0.5">
              {total === 0 ? 'No incidents recorded yet.' : `${total} incident${total !== 1 ? 's' : ''} recorded.`}
            </p>
          )}
        </div>
        <Link to="/incidents/new">
          <Button size="sm">
            <PlusCircle className="w-4 h-4" />
            Report Incident
          </Button>
        </Link>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSkeleton rows={4} />
      ) : error ? (
        <ErrorAlert message={error} onRetry={() => fetchIncidents(page)} />
      ) : incidents.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-8 h-8" />}
          title="No incidents recorded yet"
          description="When you report an incident it will appear here. Your data is private and linked only to your account."
          action={
            <Link to="/incidents/new">
              <Button size="sm"><PlusCircle className="w-4 h-4" />Report your first incident</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {incidents.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} />
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <span className="text-xs text-slate-500">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
