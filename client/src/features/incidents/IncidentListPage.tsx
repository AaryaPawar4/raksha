import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FileText,
  PlusCircle,
  ChevronRight,
  CalendarDays,
  Monitor,
  Download,
  Search,
  Filter,
  Hash,
} from 'lucide-react';
import { apiClient, ApiError, saveBlobAsFile } from '../../services/apiClient';
import { Incident } from '@rakshasphere/shared';
import {
  Card,
  CardBody,
  Button,
  LoadingSkeleton,
  EmptyState,
  ErrorAlert,
  StatusBadge,
  TypeBadge,
  PageHeader,
  useToast,
  Input,
} from '../../components/ui';

const PLATFORM_LABELS: Record<string, string> = {
  INSTAGRAM: 'Instagram',
  WHATSAPP: 'WhatsApp',
  TELEGRAM: 'Telegram',
  TWITTER_X: 'X (Twitter)',
  FACEBOOK: 'Facebook',
  SMS: 'SMS',
  EMAIL: 'Email',
  OTHER: 'Other',
};

function IncidentCard({ incident }: { incident: Incident }) {
  const date = new Date(incident.occurredAt);
  const dateStr = isNaN(date.getTime())
    ? 'Unknown date'
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <Link to={`/incidents/${incident.id}`} className="block group">
      <Card hoverable className="border-slate-200/90">
        <CardBody className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <TypeBadge type={incident.incidentType} />
              <StatusBadge status={incident.status} />
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Monitor className="w-3 h-3 text-slate-400" />
                <span>{PLATFORM_LABELS[incident.platform] ?? incident.platform}</span>
              </span>
              {incident.identifiers && incident.identifiers.length > 0 && (
                <span className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-200/70 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  <span>{incident.identifiers.length} identifier{incident.identifiers.length > 1 ? 's' : ''}</span>
                </span>
              )}
            </div>

            <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-indigo-600 transition truncate">
              {incident.title}
            </h3>

            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
              {incident.description}
            </p>

            <div className="flex items-center gap-4 text-xs text-slate-400 pt-0.5">
              <span className="flex items-center gap-1 text-[11px]">
                <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                <span>Occurred: {dateStr}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-slate-400 group-hover:text-indigo-600 font-semibold text-xs transition flex-shrink-0 self-end sm:self-center">
            <span>Details</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}

export function IncidentListPage() {
  const location = useLocation();
  const toast = useToast();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const LIMIT = 10;

  useEffect(() => {
    const msg = (location.state as { message?: string })?.message;
    if (msg) {
      toast.success(msg);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, toast]);

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      setExportError(null);
      const { blob, filename } = await apiClient.incidents.exportCsv();
      saveBlobAsFile(blob, 'RakshaSphere_Incidents.csv', filename);
      toast.success('Incident records exported to CSV.');
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Failed to export incidents to CSV');
      toast.error('CSV export failed.');
    } finally {
      setIsExporting(false);
    }
  };

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

  // Client-side filtering across current page records
  const filteredIncidents = incidents.filter((inc) => {
    if (selectedStatus && inc.status !== selectedStatus) return false;
    if (selectedPlatform && inc.platform !== selectedPlatform) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = inc.title.toLowerCase().includes(q);
      const matchDesc = inc.description.toLowerCase().includes(q);
      const matchIdent = inc.identifiers?.some((i) => i.value.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchIdent) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Reported Incidents"
        description="Comprehensive repository of your documented threats. Every incident is indexed for cross-platform ThreatLink correlation."
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCsv}
              isLoading={isExporting}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export CSV
            </Button>
            <Link to="/incidents/new">
              <Button size="sm" variant="primary" leftIcon={<PlusCircle className="w-3.5 h-3.5" />}>
                Report Incident
              </Button>
            </Link>
          </div>
        }
      />

      {exportError && <ErrorAlert message={exportError} onDismiss={() => setExportError(null)} />}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-subtle flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search by title, description, handle or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-3.5 h-3.5" />}
            className="text-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            aria-label="Filter by status"
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 font-medium focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="RESOLVED">Resolved</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            aria-label="Filter by platform"
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 font-medium focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Platforms</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="TELEGRAM">Telegram</option>
            <option value="TWITTER_X">X (Twitter)</option>
            <option value="FACEBOOK">Facebook</option>
            <option value="SMS">SMS</option>
            <option value="EMAIL">Email</option>
            <option value="OTHER">Other</option>
          </select>

          {(searchTerm || selectedStatus || selectedPlatform) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedStatus('');
                setSelectedPlatform('');
              }}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && <ErrorAlert message={error} onRetry={() => fetchIncidents(page)} />}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          <LoadingSkeleton rows={4} />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredIncidents.length === 0 && (
        <EmptyState
          icon={<FileText className="w-6 h-6 text-slate-400" />}
          title={incidents.length === 0 ? 'No incidents documented yet' : 'No matching incidents found'}
          description={
            incidents.length === 0
              ? 'Record threatening messages, stalking patterns, or extortion attempts to preserve safe digital evidence.'
              : 'Try adjusting your search criteria or resetting the active filters above.'
          }
          action={
            incidents.length === 0 ? (
              <Link to="/incidents/new">
                <Button size="sm" variant="primary" leftIcon={<PlusCircle className="w-3.5 h-3.5" />}>
                  Record Your First Incident
                </Button>
              </Link>
            ) : undefined
          }
        />
      )}

      {/* Incident List Cards */}
      {!isLoading && !error && filteredIncidents.length > 0 && (
        <div className="space-y-3">
          {filteredIncidents.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-200">
          <span>
            Showing page <strong className="text-slate-800">{page}</strong> of <strong className="text-slate-800">{totalPages}</strong> ({total} total incidents)
          </span>
          <div className="flex gap-2">
            <Button
              size="xs"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              size="xs"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
