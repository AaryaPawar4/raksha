import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Link2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { apiClient, ApiError } from '../../services/apiClient';
import { ThreatLinkEdge, UserDisposition } from '@rakshasphere/shared';
import { Card, CardHeader, CardBody, Button, LoadingSpinner, ErrorAlert } from '../../components/ui';

interface ThreatLinkSectionProps {
  incidentId: string;
}

export function ThreatLinkSection({ incidentId }: ThreatLinkSectionProps) {
  const [links, setLinks] = useState<ThreatLinkEdge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  const loadLinks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.threatLinks.getForIncident(incidentId);
      setLinks(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        setError('Cannot connect to server to fetch ThreatLink correlations.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load threat links.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  const handleFeedback = async (linkId: string, disposition: 'RELEVANT' | 'NOT_RELATED' | 'UNSURE') => {
    setUpdatingId(linkId);
    setFeedbackSuccess(null);
    try {
      const updated = await apiClient.threatLinks.submitFeedback(linkId, disposition);
      setLinks((prev) =>
        prev.map((l) => (l.id === linkId ? { ...l, userDisposition: updated.userDisposition } : l))
      );
      setFeedbackSuccess(`Disposition updated to ${disposition.replace('_', ' ')}.`);
      setTimeout(() => setFeedbackSuccess(null), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update disposition');
    } finally {
      setUpdatingId(null);
    }
  };

  const dispositionBadge = (disp: UserDisposition) => {
    switch (disp) {
      case 'RELEVANT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 border border-rose-200">
            <CheckCircle2 className="w-3 h-3" /> Marked Relevant
          </span>
        );
      case 'NOT_RELATED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            <XCircle className="w-3 h-3" /> Dismissed
          </span>
        );
      case 'UNSURE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            <HelpCircle className="w-3 h-3" /> Unsure
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Pending Review
          </span>
        );
    }
  };

  return (
    <Card className="border-rose-100 shadow-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-rose-50/70 to-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-sm">
            <Link2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              ThreatLink Correlation
              <span className="text-[10px] uppercase font-semibold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                Phase 2
              </span>
            </h2>
            <p className="text-xs text-slate-500">Pattern correlation across your reported incidents</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={loadLinks} disabled={isLoading} className="text-slate-500">
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </CardHeader>

      <CardBody className="space-y-4">
        {/* Investigative Lead Disclaimer */}
        <div className="flex items-start gap-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl px-4 py-3 text-xs text-amber-900">
          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Investigative Lead Only</span>
            ThreatLink surfaces shared handles, phones, or URLs across your own records. A correlation{' '}
            <span className="underline font-medium">does not prove perpetrator identity or legal guilt</span>.
          </div>
        </div>

        {feedbackSuccess && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {feedbackSuccess}
          </div>
        )}

        {isLoading ? (
          <LoadingSpinner message="Scanning your incidents for matching identifiers..." size="sm" />
        ) : error ? (
          <ErrorAlert message={error} onRetry={loadLinks} />
        ) : links.length === 0 ? (
          <div className="text-center py-8 px-4 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
            <Link2 className="w-7 h-7 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-700">No correlated incidents found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              No other incidents in your account share exact identifiers (usernames, phone numbers, URLs, or emails) with this report.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
              <span>{links.length} correlated incident{links.length > 1 ? 's' : ''} detected:</span>
              <span className="text-[11px] text-slate-400">Exact Normalized Matching</span>
            </div>

            {links.map((link) => (
              <div
                key={link.id}
                className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 hover:border-slate-300 transition"
              >
                {/* Header: matched signal & disposition */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[11px] font-bold uppercase rounded bg-rose-50 text-rose-700 border border-rose-200">
                      Exact {link.matchedIdentifierType}
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                      {link.matchedValueMasked}
                    </span>
                  </div>
                  <div>{dispositionBadge(link.userDisposition)}</div>
                </div>

                {/* Explanation */}
                <p className="text-xs text-slate-700 leading-relaxed">{link.explanation}</p>

                {/* Related Incident Card summary */}
                {link.relatedIncident && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Related Incident</span>
                      <h4 className="text-xs font-semibold text-slate-900">{link.relatedIncident.title}</h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span>{link.relatedIncident.incidentType}</span>
                        <span>•</span>
                        <span>{link.relatedIncident.platform}</span>
                      </div>
                    </div>
                    <Link
                      to={`/incidents/${link.relatedIncidentId}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700"
                    >
                      View Incident <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}

                {/* User Disposition Controls */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-500 font-medium">Your Lead Assessment:</span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant={link.userDisposition === 'RELEVANT' ? 'primary' : 'secondary'}
                      size="sm"
                      disabled={updatingId === link.id}
                      onClick={() => handleFeedback(link.id, 'RELEVANT')}
                    >
                      Relevant
                    </Button>
                    <Button
                      variant={link.userDisposition === 'UNSURE' ? 'primary' : 'secondary'}
                      size="sm"
                      disabled={updatingId === link.id}
                      onClick={() => handleFeedback(link.id, 'UNSURE')}
                    >
                      Unsure
                    </Button>
                    <Button
                      variant={link.userDisposition === 'NOT_RELATED' ? 'danger' : 'secondary'}
                      size="sm"
                      disabled={updatingId === link.id}
                      onClick={() => handleFeedback(link.id, 'NOT_RELATED')}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
