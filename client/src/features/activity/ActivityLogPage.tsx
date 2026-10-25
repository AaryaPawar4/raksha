import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  RefreshCw,
  Search,
  Clock,
  Key,
  FileText,
  Lock,
  Scale,
  Users,
  Filter,
} from 'lucide-react';
import { apiClient, ApiError } from '../../services/apiClient';
import {
  ActivityLogEntry,
  ActivityEventType,
  ActivityEventOutcome,
} from '@rakshasphere/shared';
import {
  Card,
  CardBody,
  Button,
  IconButton,
  LoadingSpinner,
  ErrorAlert,
  EmptyState,
  PageHeader,
  Input,
} from '../../components/ui';

const ACTIVITY_EVENT_LABELS: Record<ActivityEventType, string> = {
  AUTH_REGISTER: 'Account registered',
  AUTH_LOGIN_SUCCESS: 'Signed in',
  AUTH_LOGIN_FAILURE: 'Failed sign-in attempt',
  AUTH_LOGOUT: 'Signed out',
  AUTH_TOKEN_REFRESH: 'Session refreshed',
  AUTH_TOKEN_REUSE_DETECTED: 'Suspicious session reuse detected',
  INCIDENT_CREATED: 'Incident reported',
  INCIDENT_UPDATED: 'Incident updated',
  INCIDENT_DELETED: 'Incident deleted',
  VAULT_UPLOAD: 'Evidence file encrypted & preserved',
  VAULT_VERIFY: 'Evidence integrity verified',
  VAULT_DELETE: 'Evidence file deleted',
  CASE_CREATED: 'Legal case tracked',
  CASE_UPDATED: 'Case status updated',
  CASE_DELETED: 'Case removed',
  CASE_PDF_EXPORTED: 'Case PDF dossier exported',
  INCIDENTS_CSV_EXPORTED: 'Incidents exported as CSV',
  CASES_CSV_EXPORTED: 'Cases exported as CSV',
  CHECKIN_CREATED: 'Safety check-in initiated',
  CHECKIN_COMPLETED: 'Safety check-in marked safe',
  CHECKIN_CANCELLED: 'Safety check-in cancelled',
  CONTACT_CREATED: 'Trusted contact added',
  CONTACT_UPDATED: 'Trusted contact updated',
  CONTACT_DELETED: 'Trusted contact removed',
};

function getCategoryIcon(type: ActivityEventType) {
  if (type.startsWith('AUTH_')) return <Key className="w-3.5 h-3.5 text-amber-600" />;
  if (type.startsWith('INCIDENT_')) return <FileText className="w-3.5 h-3.5 text-indigo-600" />;
  if (type.startsWith('VAULT_')) return <Lock className="w-3.5 h-3.5 text-purple-600" />;
  if (type.startsWith('CASE_')) return <Scale className="w-3.5 h-3.5 text-teal-600" />;
  if (type.startsWith('CHECKIN_') || type.startsWith('CONTACT_'))
    return <Users className="w-3.5 h-3.5 text-sky-600" />;
  return <Activity className="w-3.5 h-3.5 text-slate-500" />;
}

export function ActivityLogPage() {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedOutcome, setSelectedOutcome] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const LIMIT = 15;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: any = {
        page,
        limit: LIMIT,
      };
      if (selectedType) query.eventType = selectedType as ActivityEventType;
      if (selectedOutcome) query.outcome = selectedOutcome as ActivityEventOutcome;

      const res = await apiClient.activity.list(query);
      setEntries(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        setError('Cannot connect to the backend server.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load activity logs.');
      }
    } finally {
      setLoading(false);
    }
  }, [page, selectedType, selectedOutcome]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Client-side text filter on resource label or safe metadata
  const filteredEntries = entries.filter((item) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const labelMatch = item.resourceLabel?.toLowerCase().includes(q);
    const eventMatch = ACTIVITY_EVENT_LABELS[item.eventType]?.toLowerCase().includes(q);
    return Boolean(labelMatch || eventMatch);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account Activity &amp; Audit Log"
        description="Immutable chronological record of authenticated account events, evidence preservation, and safety check-ins. All credentials, keys, and coordinates are strictly redacted."
        actions={
          <IconButton
            size="sm"
            variant="outline"
            onClick={fetchLogs}
            disabled={loading}
            aria-label="Refresh activity log"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />}
          />
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex-1 max-w-sm">
          <Input
            placeholder="Search activity records…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
            className="text-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by event type"
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 font-medium"
          >
            <option value="">All Event Categories</option>
            <option value="AUTH_LOGIN_SUCCESS">Sign In Events</option>
            <option value="INCIDENT_CREATED">Incident Reported</option>
            <option value="VAULT_UPLOAD">Evidence Preserved</option>
            <option value="VAULT_VERIFY">Evidence Verified</option>
            <option value="CASE_CREATED">Case Tracked</option>
            <option value="CASE_PDF_EXPORTED">PDF Dossier Exported</option>
            <option value="CHECKIN_CREATED">Safety Check-In Created</option>
          </select>

          <select
            value={selectedOutcome}
            onChange={(e) => {
              setSelectedOutcome(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by outcome"
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 font-medium"
          >
            <option value="">All Outcomes</option>
            <option value="SUCCESS">Success Only</option>
            <option value="FAILURE">Failure Only</option>
          </select>

          {(selectedType || selectedOutcome || searchTerm) && (
            <button
              type="button"
              onClick={() => {
                setSelectedType('');
                setSelectedOutcome('');
                setSearchTerm('');
                setPage(1);
              }}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchLogs} />}

      {/* Activity Timeline Card */}
      <Card className="border-slate-200/90 shadow-subtle">
        <CardBody className="p-0">
          {loading ? (
            <div className="py-16 text-center">
              <LoadingSpinner message="Retrieving secure audit events…" size="md" />
            </div>
          ) : filteredEntries.length === 0 ? (
            <EmptyState
              icon={<Activity className="w-6 h-6 text-slate-400" />}
              title="No activity events recorded"
              description="Actions performed in your session (e.g. reporting incidents, encrypting evidence, check-ins) will be logged here."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredEntries.map((entry) => {
                const isSuccess = entry.outcome === 'SUCCESS';
                return (
                  <div key={entry.id} className="p-4 sm:p-5 flex items-start gap-3.5 hover:bg-slate-50/50 transition">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/70 flex-shrink-0 mt-0.5">
                      {getCategoryIcon(entry.eventType)}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-slate-900">
                          {ACTIVITY_EVENT_LABELS[entry.eventType] || entry.eventType}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${
                            isSuccess
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {entry.outcome}
                        </span>
                      </div>

                      {entry.resourceLabel && (
                        <p className="text-xs text-slate-600 font-medium">
                          {entry.resourceLabel}
                        </p>
                      )}

                      {entry.safeMetadata && Object.keys(entry.safeMetadata).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {Object.entries(entry.safeMetadata).map(([k, v]) => (
                            <span
                              key={k}
                              className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono"
                            >
                              {k}: <strong>{String(v)}</strong>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-400 flex-shrink-0 whitespace-nowrap">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{new Date(entry.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-200">
          <span>
            Page <strong className="text-slate-800">{page}</strong> of <strong className="text-slate-800">{totalPages}</strong> ({total} total audit entries)
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
