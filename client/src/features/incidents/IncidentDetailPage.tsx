import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, CalendarDays, Monitor, Tag, Clock, Hash,
} from 'lucide-react';
import { apiClient, ApiError } from '../../services/apiClient';
import { Incident } from '@rakshasphere/shared';
import {
  Card, CardHeader, CardBody,
  LoadingSpinner, ErrorAlert, StatusBadge, TypeBadge, Button,
} from '../../components/ui';
import { ThreatLinkSection } from '../threatlink/ThreatLinkSection';
import { AnalysisSection } from '../analysis/AnalysisSection';
import { EvidenceVaultSection } from '../vault/EvidenceVaultSection';
import { ActionCenterSection } from '../action-center/ActionCenterSection';

const PLATFORM_LABELS: Record<string, string> = {
  INSTAGRAM: 'Instagram', WHATSAPP: 'WhatsApp', TELEGRAM: 'Telegram',
  TWITTER_X: 'X (Twitter)', FACEBOOK: 'Facebook', SMS: 'SMS', EMAIL: 'Email', OTHER: 'Other',
};

const IDENTIFIER_TYPE_LABELS: Record<string, string> = {
  USERNAME: 'Username', PHONE: 'Phone Number', EMAIL: 'Email', URL: 'URL', OTHER: 'Other',
};

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="mt-0.5 text-slate-400 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 mb-0.5">{label}</p>
        <p className="text-sm text-slate-800 break-words">{value}</p>
      </div>
    </div>
  );
}

export function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    apiClient.incidents.getById(id)
      .then((data) => { if (!cancelled) setIncident(data); })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setIsNotFound(true);
        } else if (err instanceof ApiError && err.status === 0) {
          setError('Cannot connect to the backend server.');
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load incident.');
        }
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [id]);

  if (isLoading) {
    return <LoadingSpinner message="Loading incident…" size="md" />;
  }

  if (isNotFound) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <ErrorAlert
          title="Incident not found"
          message="This incident doesn't exist or you don't have access to it."
          variant="page"
        />
        <div className="text-center">
          <Link to="/incidents"><Button variant="secondary" size="sm">Back to My Incidents</Button></Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorAlert
        message={error}
        onRetry={() => { if (id) apiClient.incidents.getById(id).catch(() => {}); }}
      />
    );
  }

  if (!incident) return null;

  const occurredDate = new Date(incident.occurredAt);
  const createdDate = new Date(incident.createdAt);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back nav */}
      <Link
        to="/incidents"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to My Incidents
      </Link>

      {/* Title block */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge type={incident.incidentType} />
          <StatusBadge status={incident.status} />
        </div>
        <h1 className="text-xl font-bold text-slate-900">{incident.title}</h1>
      </div>

      {/* Main details */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-700">Incident Details</h2>
        </CardHeader>
        <CardBody className="divide-y divide-slate-100 p-0">
          <div className="px-5">
            <DetailRow
              icon={<CalendarDays className="w-4 h-4" />}
              label="Occurred on"
              value={
                isNaN(occurredDate.getTime())
                  ? 'Unknown'
                  : occurredDate.toLocaleString('en-IN', {
                      day: 'numeric', month: 'long', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })
              }
            />
            <DetailRow
              icon={<Monitor className="w-4 h-4" />}
              label="Platform / Channel"
              value={PLATFORM_LABELS[incident.platform] ?? incident.platform}
            />
            <DetailRow
              icon={<Clock className="w-4 h-4" />}
              label="Reported at"
              value={createdDate.toLocaleString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            />
          </div>
        </CardBody>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-700">Description</h2>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {incident.description}
          </p>
        </CardBody>
      </Card>

      {/* Identifiers (if any) */}
      {incident.identifiers && incident.identifiers.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Tag className="w-4 h-4 text-slate-500" />
              Recorded Identifiers
            </h2>
          </CardHeader>
          <CardBody className="space-y-2">
            <p className="text-xs text-slate-500 mb-3">
              These identifiers may be used in Phase 2 (ThreatLink) to detect patterns across incidents.
            </p>
            {incident.identifiers.map((ident, i) => (
              <div
                key={i}
                className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              >
                <Hash className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-xs font-medium text-slate-500 w-20 flex-shrink-0">
                  {IDENTIFIER_TYPE_LABELS[ident.type] ?? ident.type}
                </span>
                <span className="text-sm font-mono text-slate-800 break-all">{ident.value}</span>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {/* Safety Indicators & Curated Playbook (Phase 3) */}
      <AnalysisSection incidentId={incident.id} />

      {/* ThreatLink Correlation Leads (Phase 2) */}
      <ThreatLinkSection incidentId={incident.id} />

      {/* Evidence Vault (Phase 4) */}
      <EvidenceVaultSection incidentId={incident.id} />

      {/* Action Center & Case Tracking (Phase 5) */}
      <ActionCenterSection incident={incident} />

      {/* Meta info */}
      <div className="text-xs text-slate-400 text-right">
        Incident ID: <code className="font-mono text-slate-500">{incident.id}</code>
      </div>
    </div>
  );
}
