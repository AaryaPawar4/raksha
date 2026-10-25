import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  Plus,
  Copy,
  Trash2,
  FileDown,
  Scale,
} from 'lucide-react';
import {
  ReportDraft,
  TrackedCase,
  CaseStatus,
  Incident,
} from '@rakshasphere/shared';
import { apiClient, saveBlobAsFile } from '../../services/apiClient';
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  LoadingSpinner,
  ErrorAlert,
  useToast,
  Input,
} from '../../components/ui';

interface ActionCenterSectionProps {
  incident: Incident;
}

const OFFICIAL_CHANNELS = [
  {
    name: 'National Cyber Crime Reporting Portal (India)',
    description: 'Central portal for cybercrimes against women and children, financial fraud, and extortion.',
    url: 'https://cybercrime.gov.in',
    helpline: '1930 (Toll-Free, 24x7)',
    verifiedDate: '2026-10-01',
    category: 'Official Government Portal',
  },
  {
    name: 'National Commission for Women (NCW) Cyber Cell',
    description: '24x7 helpline for women facing cyber harassment, impersonation, or online abuse.',
    url: 'https://ncw.nic.in',
    helpline: '7827170170',
    verifiedDate: '2026-10-01',
    category: 'Statutory Body',
  },
  {
    name: 'National Emergency Helpline',
    description: 'Immediate police response for emergency physical danger or active threats.',
    url: 'https://112.gov.in',
    helpline: '112 (Universal Emergency)',
    verifiedDate: '2026-10-01',
    category: 'Emergency Response',
  },
];

const STATUS_CONFIG: Record<
  CaseStatus,
  { label: string; badgeClass: string }
> = {
  REPORTED: { label: 'Reported', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200' },
  UNDER_REVIEW: { label: 'Under Review', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200' },
  IN_PROGRESS: { label: 'In Progress', badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  RESOLVED: { label: 'Resolved', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  CLOSED: { label: 'Closed', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' },
};

export const ActionCenterSection: React.FC<ActionCenterSectionProps> = ({ incident }) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'draft' | 'tracker' | 'directory'>('draft');

  // Draft state
  const [draft, setDraft] = useState<ReportDraft | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState('CYBER_CRIME_PORTAL');
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  // Case Tracker state
  const [cases, setCases] = useState<TrackedCase[]>([]);
  const [isLoadingCases, setIsLoadingCases] = useState(true);
  const [casesError, setCasesError] = useState<string | null>(null);

  // New Case form state
  const [showCaseForm, setShowCaseForm] = useState(false);
  const [reportingChannel, setReportingChannel] = useState(OFFICIAL_CHANNELS[0].name);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [caseNotes, setCaseNotes] = useState('');
  const [followUpAt, setFollowUpAt] = useState('');
  const [isCreatingCase, setIsCreatingCase] = useState(false);

  // PDF Export state
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const fetchCases = async () => {
    setIsLoadingCases(true);
    setCasesError(null);
    try {
      const data = await apiClient.cases.list(incident.id);
      setCases(data);
    } catch (err) {
      setCasesError(err instanceof Error ? err.message : 'Failed to load tracked cases.');
    } finally {
      setIsLoadingCases(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [incident.id]);

  const handleGenerateDraft = async () => {
    setIsGeneratingDraft(true);
    setDraftError(null);
    try {
      const generated = await apiClient.incidents.getReportDraft(incident.id);
      setDraft(generated);
      toast.success('Complaint draft generated successfully.');
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'Failed to generate complaint draft.');
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referenceNumber.trim()) return;

    setIsCreatingCase(true);
    try {
      await apiClient.cases.create({
        incidentId: incident.id,
        reportingChannel,
        referenceNumber: referenceNumber.trim(),
        notes: caseNotes.trim() || undefined,
        followUpAt: followUpAt ? new Date(followUpAt).toISOString() : undefined,
      });

      toast.success(`Case "${referenceNumber}" registered under pipeline.`);
      setReferenceNumber('');
      setCaseNotes('');
      setFollowUpAt('');
      setShowCaseForm(false);
      await fetchCases();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create case tracking record.');
    } finally {
      setIsCreatingCase(false);
    }
  };

  const handleUpdateCaseStatus = async (caseId: string, newStatus: CaseStatus) => {
    try {
      await apiClient.cases.update(caseId, { status: newStatus });
      toast.success(`Case status updated to ${STATUS_CONFIG[newStatus].label}.`);
      await fetchCases();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status.');
    }
  };

  const handleDeleteCase = async (caseId: string, refNum: string) => {
    if (!window.confirm(`Remove case "${refNum}" from tracking pipeline?`)) return;

    try {
      await apiClient.cases.delete(caseId);
      toast.success(`Case "${refNum}" removed.`);
      await fetchCases();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove case.');
    }
  };

  const handleExportPdf = async (caseId: string) => {
    setIsExportingPdf(true);
    try {
      const { blob, filename } = await apiClient.cases.exportPdf(caseId, {
        includeEvidenceDigest: true,
        includeComplaintDraft: true,
      });
      saveBlobAsFile(blob, `RakshaSphere_Investigation_Dossier_${caseId}.pdf`, filename);
      toast.success('Investigation PDF dossier downloaded.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate PDF dossier.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const copyDraftText = () => {
    if (!draft) return;
    navigator.clipboard.writeText(draft.fullDraftText).catch(() => {});
    toast.info('Complaint text copied to clipboard.');
  };

  return (
    <div className="space-y-5">
      {/* Action Center Subtabs */}
      <div className="flex rounded-xl bg-slate-100 p-1 max-w-md text-xs font-semibold">
        {[
          { id: 'draft', label: '1. Complaint Draft' },
          { id: 'tracker', label: `2. Case Tracker (${cases.length})` },
          { id: 'directory', label: '3. Official Channels' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as any)}
            className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
              activeTab === t.id
                ? 'bg-white text-indigo-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 1. COMPLAINT DRAFT TAB */}
      {activeTab === 'draft' && (
        <Card className="border-slate-200/90 shadow-subtle">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-slate-900">
                  Cyber Crime Legal Complaint Preparation
                </h3>
                <p className="text-xs text-slate-500">
                  Prepares an audit-ready statement referencing Information Technology Act &amp; IPC provisions.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
                >
                  <option value="CYBER_CRIME_PORTAL">Portal Template (cybercrime.gov.in)</option>
                  <option value="POLICE_FIR">Police Complaint (FIR Format)</option>
                  <option value="PLATFORM_ABUSE">Platform Grievance Officer Notice</option>
                </select>

                <Button
                  size="xs"
                  variant="primary"
                  onClick={handleGenerateDraft}
                  isLoading={isGeneratingDraft}
                >
                  Generate Draft
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardBody className="p-5 sm:p-6 space-y-4">
            {draftError && <ErrorAlert message={draftError} onDismiss={() => setDraftError(null)} />}

            {!draft && !isGeneratingDraft && (
              <div className="text-center py-10 text-slate-400 text-xs max-w-sm mx-auto space-y-2">
                <p>Click <strong>"Generate Draft"</strong> to compile this incident narrative, perpetrator handles, and preserved evidence into an official legal complaint.</p>
              </div>
            )}

            {isGeneratingDraft && (
              <div className="py-12 text-center">
                <LoadingSpinner message="Formatting legal references &amp; compiling evidence checksums…" size="md" />
              </div>
            )}

            {draft && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                  <span className="text-slate-600 font-medium">
                    Title: <strong>{draft.title}</strong> • Preserved Evidence: <strong>{draft.evidenceItems?.length || 0} items</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <Button size="xs" variant="outline" onClick={copyDraftText} leftIcon={<Copy className="w-3 h-3" />}>
                      Copy Statement
                    </Button>
                  </div>
                </div>

                <div className="bg-slate-900 text-slate-100 rounded-xl p-4 sm:p-5 font-mono text-xs leading-relaxed whitespace-pre-wrap select-all max-h-[380px] overflow-y-auto border border-slate-800">
                  {draft.fullDraftText}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* 2. CASE TRACKER TAB */}
      {activeTab === 'tracker' && (
        <Card className="border-slate-200/90 shadow-subtle">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Case Pipeline &amp; Formal Filings ({cases.length})
                </h3>
              </div>
              <Button
                size="xs"
                variant={showCaseForm ? 'secondary' : 'primary'}
                onClick={() => setShowCaseForm(!showCaseForm)}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                {showCaseForm ? 'Cancel' : 'Track New Case'}
              </Button>
            </div>
          </CardHeader>

          <CardBody className="p-5 sm:p-6 space-y-4">
            {casesError && <ErrorAlert message={casesError} onDismiss={() => setCasesError(null)} />}
            {showCaseForm && (
              <form onSubmit={handleCreateCase} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs animate-fade-in">
                <h4 className="font-bold text-slate-800">Record Official Complaint / Case Submission</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Reporting Channel *</label>
                    <select
                      value={reportingChannel}
                      onChange={(e) => setReportingChannel(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2 bg-white text-xs"
                    >
                      {OFFICIAL_CHANNELS.map((ch) => (
                        <option key={ch.name} value={ch.name}>
                          {ch.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Input
                    label="Official Reference / Acknowledgment Number *"
                    placeholder="e.g. CR/2026/91823"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Next Follow-Up Date (Optional)"
                    type="date"
                    value={followUpAt}
                    onChange={(e) => setFollowUpAt(e.target.value)}
                  />

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Notes / Status Summary</label>
                    <input
                      type="text"
                      placeholder="e.g. Awaiting Investigating Officer assignment…"
                      value={caseNotes}
                      onChange={(e) => setCaseNotes(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="xs" onClick={() => setShowCaseForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="xs" isLoading={isCreatingCase}>
                    Save Case Record
                  </Button>
                </div>
              </form>
            )}

            {isLoadingCases ? (
              <LoadingSpinner message="Loading case records…" size="md" />
            ) : cases.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                No legal cases tracked for this incident yet. Use "Track New Case" to log portal filings.
              </div>
            ) : (
              <div className="space-y-3">
                {cases.map((cs) => {
                  const conf = STATUS_CONFIG[cs.status] || STATUS_CONFIG.REPORTED;
                  return (
                    <div key={cs.id} className="bg-white border border-slate-200/90 rounded-xl p-4 space-y-3 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-bold text-slate-900">
                              Ref: {cs.referenceNumber}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${conf.badgeClass}`}>
                              {conf.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium">
                            {cs.reportingChannel}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleExportPdf(cs.id)}
                            disabled={isExportingPdf}
                            leftIcon={<FileDown className="w-3.5 h-3.5 text-indigo-600" />}
                          >
                            Export Dossier PDF
                          </Button>

                          <select
                            value={cs.status}
                            onChange={(e) => handleUpdateCaseStatus(cs.id, e.target.value as CaseStatus)}
                            className="text-xs border border-slate-200 rounded-lg p-1 bg-slate-50 text-slate-700 font-semibold"
                          >
                            <option value="REPORTED">Reported</option>
                            <option value="UNDER_REVIEW">Under Review</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="RESOLVED">Resolved</option>
                            <option value="CLOSED">Closed</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleDeleteCase(cs.id, cs.referenceNumber)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                            title="Remove tracked case"
                            aria-label={`Remove case ${cs.referenceNumber}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {cs.notes && (
                        <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2.5">
                          {cs.notes}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                        <span>Filing Date: {new Date(cs.createdAt).toLocaleDateString()}</span>
                        {cs.followUpAt && (
                          <span className="text-indigo-600 font-medium">
                            Follow-Up: {new Date(cs.followUpAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* 3. OFFICIAL CHANNELS DIRECTORY */}
      {activeTab === 'directory' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {OFFICIAL_CHANNELS.map((ch) => (
            <Card key={ch.name} className="p-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full uppercase">
                    {ch.category}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 leading-snug">{ch.name}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{ch.description}</p>
                <div className="text-xs font-bold text-rose-700 pt-1">
                  Helpline: {ch.helpline}
                </div>
              </div>
              <div className="pt-4 mt-2 border-t border-slate-100">
                <a
                  href={ch.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                >
                  <span>Open Official Portal</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
