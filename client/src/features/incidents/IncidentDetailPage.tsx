import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Monitor,
  Clock,
  Hash,
  Trash2,
  Fingerprint,
  Scale,
  Brain,
  Link2,
} from 'lucide-react';
import { apiClient, ApiError } from '../../services/apiClient';
import { Incident } from '@rakshasphere/shared';
import {
  Card,
  CardBody,
  LoadingSpinner,
  ErrorAlert,
  StatusBadge,
  TypeBadge,
  Button,
  ConfirmationModal,
  PageHeader,
  useToast,
} from '../../components/ui';
import { ThreatLinkSection } from '../threatlink/ThreatLinkSection';
import { AnalysisSection } from '../analysis/AnalysisSection';
import { EvidenceVaultSection } from '../vault/EvidenceVaultSection';
import { ActionCenterSection } from '../action-center/ActionCenterSection';

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

const IDENTIFIER_TYPE_LABELS: Record<string, string> = {
  USERNAME: 'Username / Handle',
  PHONE: 'Phone Number',
  EMAIL: 'Email Address',
  URL: 'Profile / Post URL',
  OTHER: 'Other Identifier',
};

type ActiveSubsystem = 'threatlink' | 'analysis' | 'vault' | 'legal';

export function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);

  const [activeTab, setActiveTab] = useState<ActiveSubsystem>('threatlink');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!incident) return;
    setIsDeleting(true);
    try {
      await apiClient.incidents.delete(incident.id);
      navigate('/incidents', {
        state: { message: `Incident "${incident.title}" was permanently deleted.` },
        replace: true,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete incident.');
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    apiClient.incidents
      .getById(id)
      .then((data) => {
        if (!cancelled) setIncident(data);
      })
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
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (isLoading) {
    return <LoadingSpinner message="Loading incident telemetry…" size="lg" />;
  }

  if (isNotFound) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 py-8">
        <ErrorAlert
          title="Incident Record Not Found"
          message="This incident does not exist or you do not have permission to view it."
        />
        <div className="pt-2">
          <Link to="/incidents">
            <Button size="sm" variant="outline" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
              Back to Incident List
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 py-8">
        <ErrorAlert message={error || 'An unexpected error occurred.'} />
        <Link to="/incidents">
          <Button size="sm" variant="outline" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
            Back to Incident List
          </Button>
        </Link>
      </div>
    );
  }

  const occurredDateStr = new Date(incident.occurredAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={incident.title}
        breadcrumbs={[
          { label: 'Incidents', href: '/incidents' },
          { label: incident.id.slice(-6) },
        ]}
        badge={
          <div className="flex items-center gap-2">
            <TypeBadge type={incident.incidentType} />
            <StatusBadge status={incident.status} />
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link to="/incidents">
              <Button size="sm" variant="outline" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
                All Incidents
              </Button>
            </Link>
            <Button
              size="sm"
              variant="danger"
              onClick={() => setShowDeleteModal(true)}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete
            </Button>
          </div>
        }
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        title={`Permanently delete incident "${incident.title}"?`}
        message="This action will delete this incident record, its associated ThreatLink correlation edges, and all encrypted Evidence Vault items. This action cannot be undone."
        confirmLabel="Yes, Delete Incident"
        confirmVariant="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />

      {/* Incident Overview Card */}
      <Card className="border-slate-200/90 shadow-subtle">
        <CardBody className="p-5 sm:p-6 space-y-5">
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Incident Narrative
            </h3>
            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
              {incident.description}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                <Monitor className="w-4 h-4" />
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">Reported Platform</p>
                <p className="font-semibold text-slate-800">
                  {PLATFORM_LABELS[incident.platform] ?? incident.platform}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">Occurred Date</p>
                <p className="font-semibold text-slate-800">{occurredDateStr}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">Documented In System</p>
                <p className="font-semibold text-slate-800">
                  {new Date(incident.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Perpetrator Identifiers */}
          {incident.identifiers && incident.identifiers.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5 uppercase tracking-wide">
                  <Hash className="w-3.5 h-3.5 text-indigo-600" />
                  Perpetrator Digital Identifiers ({incident.identifiers.length})
                </span>
                <span className="text-[11px] text-slate-400">Indexed for ThreatLink graph match</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {incident.identifiers.map((ident, i) => (
                  <div
                    key={i}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200/90 rounded-lg text-xs"
                  >
                    <span className="text-slate-400 font-medium">
                      {IDENTIFIER_TYPE_LABELS[ident.type] || ident.type}:
                    </span>
                    <strong className="text-slate-900 font-mono select-all">{ident.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Subsystems Navigation Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
        {[
          { id: 'threatlink', label: 'ThreatLink Graph', icon: Link2 },
          { id: 'analysis', label: 'Safety Analysis & Playbooks', icon: Brain },
          { id: 'vault', label: 'Evidence Vault', icon: Fingerprint },
          { id: 'legal', label: 'Complaint Draft & Legal Case', icon: Scale },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as ActiveSubsystem)}
              className={`
                flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap
                ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }
              `}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Subsystem Panels */}
      <div className="animate-fade-in">
        {activeTab === 'threatlink' && <ThreatLinkSection incidentId={incident.id} />}
        {activeTab === 'analysis' && <AnalysisSection incidentId={incident.id} />}
        {activeTab === 'vault' && <EvidenceVaultSection incidentId={incident.id} />}
        {activeTab === 'legal' && <ActionCenterSection incident={incident} />}
      </div>
    </div>
  );
}
