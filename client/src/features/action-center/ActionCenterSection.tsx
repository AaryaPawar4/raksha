import React, { useState, useEffect } from 'react';
import {
  FileText,
  ExternalLink,
  ClipboardList,
  Plus,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Download,
  AlertTriangle,
  Info,
  Calendar,
  Trash2,
  Edit2,
  Building,
  KeyRound,
} from 'lucide-react';
import {
  ReportDraft,
  TrackedCase,
  CaseStatus,
  Incident,
} from '@rakshasphere/shared';
import { apiClient } from '../../services/apiClient';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/Loading';

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

const ACCOUNT_SECURITY_TIPS = [
  {
    title: 'Enable Two-Factor Authentication (2FA)',
    detail: 'Use an authenticator app (TOTP) rather than SMS where possible on Google, Apple, and social apps.',
  },
  {
    title: 'Review Active Logins & Connected Apps',
    detail: 'Check Account Settings > Security > Devices/Sessions and terminate unfamiliar active sessions immediately.',
  },
  {
    title: 'Preserve Evidence Before Blocking',
    detail: 'Ensure screenshots and evidence are preserved in the Evidence Vault before blocking or reporting on-platform.',
  },
  {
    title: 'Privacy Checkup on Profile Info',
    detail: 'Set profile visibility to private and hide contact details (phone, email, follower lists) from non-contacts.',
  },
];

const STATUS_CONFIG: Record<
  CaseStatus,
  { label: string; badgeClass: string }
> = {
  REPORTED: { label: 'Reported', badgeClass: 'bg-blue-100 text-blue-800' },
  UNDER_REVIEW: { label: 'Under Review', badgeClass: 'bg-amber-100 text-amber-800' },
  IN_PROGRESS: { label: 'In Progress', badgeClass: 'bg-indigo-100 text-indigo-800' },
  RESOLVED: { label: 'Resolved', badgeClass: 'bg-emerald-100 text-emerald-800' },
  CLOSED: { label: 'Closed', badgeClass: 'bg-slate-100 text-slate-700' },
};

export const ActionCenterSection: React.FC<ActionCenterSectionProps> = ({
  incident,
}) => {
  // Active sub-tab: 'directory' | 'draft' | 'tracker'
  const [activeTab, setActiveTab] = useState<'directory' | 'draft' | 'tracker'>('directory');

  // Draft state
  const [draft, setDraft] = useState<ReportDraft | null>(null);
  const [editedText, setEditedText] = useState<string>('');
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [copiedDraft, setCopiedDraft] = useState(false);

  // Cases state
  const [cases, setCases] = useState<TrackedCase[]>([]);
  const [isLoadingCases, setIsLoadingCases] = useState(true);
  const [caseError, setCaseError] = useState<string | null>(null);

  // New Case Form state
  const [showNewCaseForm, setShowNewCaseForm] = useState(false);
  const [reportingChannel, setReportingChannel] = useState(
    'National Cyber Crime Reporting Portal (cybercrime.gov.in)'
  );
  const [referenceNumber, setReferenceNumber] = useState('');
  const [caseStatus, setCaseStatus] = useState<CaseStatus>('REPORTED');
  const [followUpDate, setFollowUpDate] = useState('');
  const [caseNotes, setCaseNotes] = useState('');
  const [isSubmittingCase, setIsSubmittingCase] = useState(false);

  // Edit Case Modal / Inline state
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<CaseStatus>('REPORTED');
  const [editNotes, setEditNotes] = useState('');
  const [editFollowUp, setEditFollowUp] = useState('');

  const fetchCases = async () => {
    setIsLoadingCases(true);
    setCaseError(null);
    try {
      const data = await apiClient.cases.list(incident.id);
      setCases(data);
    } catch (err) {
      setCaseError(err instanceof Error ? err.message : 'Failed to load tracked cases');
    } finally {
      setIsLoadingCases(false);
    }
  };

  const loadDraft = async () => {
    if (draft) return;
    setIsLoadingDraft(true);
    setDraftError(null);
    try {
      const data = await apiClient.incidents.getReportDraft(incident.id);
      setDraft(data);
      setEditedText(data.fullDraftText);
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'Failed to generate report draft');
    } finally {
      setIsLoadingDraft(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [incident.id]);

  useEffect(() => {
    if (activeTab === 'draft') {
      loadDraft();
    }
  }, [activeTab]);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referenceNumber.trim()) {
      setCaseError('Reference number / acknowledgment ID is required.');
      return;
    }

    try {
      setIsSubmittingCase(true);
      setCaseError(null);
      await apiClient.cases.create({
        incidentId: incident.id,
        reportingChannel: reportingChannel.trim(),
        referenceNumber: referenceNumber.trim(),
        status: caseStatus,
        followUpAt: followUpDate ? new Date(followUpDate).toISOString() : undefined,
        notes: caseNotes.trim() || undefined,
      });

      setReferenceNumber('');
      setCaseNotes('');
      setFollowUpDate('');
      setShowNewCaseForm(false);
      await fetchCases();
    } catch (err) {
      setCaseError(err instanceof Error ? err.message : 'Failed to save tracked case');
    } finally {
      setIsSubmittingCase(false);
    }
  };

  const handleUpdateCase = async (caseId: string) => {
    try {
      await apiClient.cases.update(caseId, {
        status: editStatus,
        notes: editNotes,
        followUpAt: editFollowUp ? new Date(editFollowUp).toISOString() : undefined,
      });
      setEditingCaseId(null);
      await fetchCases();
    } catch (err) {
      setCaseError(err instanceof Error ? err.message : 'Failed to update case');
    }
  };

  const handleDeleteCase = async (caseId: string) => {
    if (!window.confirm('Are you sure you want to delete this tracked case entry?')) return;
    try {
      await apiClient.cases.delete(caseId);
      await fetchCases();
    } catch (err) {
      setCaseError(err instanceof Error ? err.message : 'Failed to delete case');
    }
  };

  const handleCopyDraft = () => {
    navigator.clipboard.writeText(editedText);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2500);
  };

  const handleDownloadDraft = (format: 'txt' | 'md') => {
    const blob = new Blob([editedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `complaint_draft_${incident.id.slice(-6)}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  return (
    <Card className="border-teal-200 shadow-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-teal-50 to-slate-50 border-b border-teal-100 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-teal-700" />
            <h2 className="text-base font-semibold text-slate-800">
              Action Center &amp; Case Tracking
            </h2>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800">
            Phase 5 — Self-Advocacy
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Prepare verified complaint drafts, access official reporting resources, and track case follow-ups.
        </p>
      </CardHeader>

      <CardBody className="space-y-5">
        {/* Anti Auto-Submission Disclaimer */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-slate-800">Direct User Submission Notice</p>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              RakshaSphere is a private advocacy platform and <strong>never automatically transmits complaints</strong> to
              law enforcement or third-party platforms. Use the generated complaint drafts and verified links below to
              submit complaints directly through authorized portals.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'directory'
                ? 'border-teal-600 text-teal-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Reporting Directory &amp; Security</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('draft')}
            className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'draft'
                ? 'border-teal-600 text-teal-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Complaint Draft</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tracker')}
            className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'tracker'
                ? 'border-teal-600 text-teal-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Case Tracker ({cases.length})</span>
          </button>
        </div>

        {/* TAB 1: REPORTING DIRECTORY & SECURITY */}
        {activeTab === 'directory' && (
          <div className="space-y-5">
            {/* Verified Reporting Channels */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-teal-600" />
                Verified Official Reporting Channels (India)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {OFFICIAL_CHANNELS.map((ch, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-2 flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full inline-block">
                        {ch.category}
                      </span>
                      <h4 className="text-xs font-bold text-slate-800 leading-tight">
                        {ch.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        {ch.description}
                      </p>
                      <div className="text-[11px] font-semibold text-indigo-700 pt-1">
                        📞 {ch.helpline}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-[10px] text-slate-400">
                        Verified: {ch.verifiedDate}
                      </span>
                      <a
                        href={ch.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-900 font-semibold"
                      >
                        Visit Portal <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Account Security Recommendations */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                Account Security &amp; Takedown Recommendations
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ACCOUNT_SECURITY_TIPS.map((tip, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1 text-xs"
                  >
                    <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      {tip.title}
                    </p>
                    <p className="text-slate-600 leading-relaxed text-[11px] pl-5">
                      {tip.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EDITABLE COMPLAINT DRAFT */}
        {activeTab === 'draft' && (
          <div className="space-y-4">
            {isLoadingDraft ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner size="md" />
              </div>
            ) : draftError ? (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span>{draftError}</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-slate-500">
                    Compiled from incident details, recorded identifiers, and preserved vault evidence digests.
                    You can edit the text below before copying or exporting.
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleCopyDraft}
                      className="text-xs py-1 px-2.5 h-auto flex items-center gap-1 border-slate-200"
                    >
                      {copiedDraft ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-600" />
                          <span>Copy Draft</span>
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => handleDownloadDraft('txt')}
                      className="text-xs py-1 px-2.5 h-auto flex items-center gap-1 border-slate-200"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" />
                      <span>Download (.txt)</span>
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    rows={16}
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    className="w-full font-mono text-xs bg-slate-900 text-slate-100 p-4 rounded-xl border border-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 leading-relaxed"
                  />
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-800 space-y-1">
                  <p className="font-semibold">Review Before Submission</p>
                  <p className="leading-relaxed">
                    Ensure all names, dates, and incident details are completely accurate.
                    Official portals may require you to attach the original unencrypted screenshot files
                    corresponding to the SHA-256 hashes listed in section 3 of this statement.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CASE TRACKER */}
        {activeTab === 'tracker' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Tracked Official Complaints
                </h3>
                <p className="text-[11px] text-slate-400">
                  Log official complaint acknowledgment numbers to monitor follow-ups.
                </p>
              </div>
              <Button
                type="button"
                variant="primary"
                onClick={() => setShowNewCaseForm(!showNewCaseForm)}
                className="text-xs py-1 px-2.5 h-auto flex items-center gap-1 bg-teal-600 hover:bg-teal-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showNewCaseForm ? 'Cancel' : 'Log New Case'}</span>
              </Button>
            </div>

            {caseError && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span>{caseError}</span>
              </div>
            )}

            {/* New Case Form */}
            {showNewCaseForm && (
              <form onSubmit={handleCreateCase} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800">Log Manual Submission</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">
                      Reporting Channel / Agency
                    </label>
                    <input
                      type="text"
                      value={reportingChannel}
                      onChange={(e) => setReportingChannel(e.target.value)}
                      required
                      placeholder="e.g., National Cyber Crime Reporting Portal"
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">
                      Reference / Acknowledgment Number
                    </label>
                    <input
                      type="text"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      required
                      placeholder="e.g., NCCR-2026-981245 or FIR No. 42/26"
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">
                      Current Status
                    </label>
                    <select
                      value={caseStatus}
                      onChange={(e) => setCaseStatus(e.target.value as CaseStatus)}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="REPORTED">Reported (Filing Submitted)</option>
                      <option value="UNDER_REVIEW">Under Review / Verification</option>
                      <option value="IN_PROGRESS">In Progress / IO Assigned</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">
                      Optional: Manual Follow-Up Reminder Date
                    </label>
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Stored as a visual reminder only. No automated notification is sent.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1 text-xs">
                    Optional Notes / Officer Details
                  </label>
                  <textarea
                    rows={2}
                    value={caseNotes}
                    onChange={(e) => setCaseNotes(e.target.value)}
                    placeholder="e.g., Spoke with Sub-Inspector Sharma. Requested server log preservation."
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowNewCaseForm(false)}
                    className="text-xs py-1 px-3"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmittingCase}
                    className="text-xs py-1 px-3 bg-teal-600 hover:bg-teal-700"
                  >
                    {isSubmittingCase ? 'Saving...' : 'Save Tracked Case'}
                  </Button>
                </div>
              </form>
            )}

            {/* Case List */}
            {isLoadingCases ? (
              <div className="py-6 flex justify-center">
                <LoadingSpinner size="md" />
              </div>
            ) : cases.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                No cases tracked for this incident yet. After filing a complaint with cybercrime.gov.in or local police, log your acknowledgment ID above.
              </div>
            ) : (
              <div className="space-y-3">
                {cases.map((c) => {
                  const isEditing = editingCaseId === c.id;
                  const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.REPORTED;

                  return (
                    <div
                      key={c.id}
                      className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">
                              {c.referenceNumber}
                            </span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.badgeClass}`}>
                              {cfg.label}
                            </span>
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              USER_REPORTED
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            Channel: <strong className="text-slate-700">{c.reportingChannel}</strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (isEditing) {
                                setEditingCaseId(null);
                              } else {
                                setEditingCaseId(c.id);
                                setEditStatus(c.status);
                                setEditNotes(c.notes || '');
                                setEditFollowUp(c.followUpAt ? c.followUpAt.split('T')[0] : '');
                              }
                            }}
                            className="text-xs text-slate-500 hover:text-slate-700 p-1 flex items-center gap-1 border border-slate-200 rounded px-2"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>{isEditing ? 'Close' : 'Update'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCase(c.id)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                            title="Delete tracked case"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {c.notes && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                          {c.notes}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                        <span>Logged: {new Date(c.createdAt).toLocaleDateString()}</span>
                        {c.followUpAt && (
                          <span className="flex items-center gap-1 text-amber-700 font-medium">
                            <Calendar className="w-3 h-3" /> Manual reminder: {new Date(c.followUpAt).toLocaleDateString()} (no automated alert)
                          </span>
                        )}
                      </div>

                      {/* Inline Edit Form */}
                      {isEditing && (
                        <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 space-y-2 mt-2">
                          <h5 className="text-xs font-semibold text-teal-900">Update Status &amp; Notes</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="block text-slate-600 font-medium mb-1">Status</label>
                              <select
                                value={editStatus}
                                onChange={(e) => setEditStatus(e.target.value as CaseStatus)}
                                className="w-full border border-teal-300 rounded px-2 py-1 bg-white"
                              >
                                <option value="REPORTED">Reported</option>
                                <option value="UNDER_REVIEW">Under Review</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="RESOLVED">Resolved</option>
                                <option value="CLOSED">Closed</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-slate-600 font-medium mb-1">Follow-Up Date</label>
                              <input
                                type="date"
                                value={editFollowUp}
                                onChange={(e) => setEditFollowUp(e.target.value)}
                                className="w-full border border-teal-300 rounded px-2 py-1 bg-white"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-slate-600 font-medium mb-1 text-xs">Notes</label>
                            <textarea
                              rows={2}
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              className="w-full border border-teal-300 rounded px-2 py-1 bg-white text-xs"
                            />
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <Button
                              type="button"
                              variant="primary"
                              onClick={() => handleUpdateCase(c.id)}
                              className="text-xs py-1 px-3 bg-teal-600 hover:bg-teal-700"
                            >
                              Save Updates
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
};
