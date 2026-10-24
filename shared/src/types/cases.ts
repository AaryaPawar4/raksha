export type CaseStatus =
  | 'REPORTED'
  | 'UNDER_REVIEW'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED';

export interface TrackedCase {
  id: string;
  ownerId: string;
  incidentId: string;
  reportingChannel: string;
  referenceNumber: string;
  status: CaseStatus;
  followUpAt?: string;
  notes?: string;
  verificationBadge: 'USER_REPORTED';
  createdAt: string;
  updatedAt: string;
}

export interface CreateCaseDTO {
  incidentId: string;
  reportingChannel: string;
  referenceNumber: string;
  status?: CaseStatus;
  followUpAt?: string;
  notes?: string;
}

export interface UpdateCaseDTO {
  reportingChannel?: string;
  referenceNumber?: string;
  status?: CaseStatus;
  followUpAt?: string | null;
  notes?: string;
}

export interface EvidenceDigestSummary {
  filename: string;
  mimeType: string;
  size: number;
  sha256: string;
  serverReceivedAt: string;
}

export interface ReportDraft {
  incidentId: string;
  title: string;
  incidentType: string;
  platform: string;
  occurredAt: string;
  generatedAt: string;
  narrative: string;
  identifiers: Array<{ type: string; value: string }>;
  evidenceItems: EvidenceDigestSummary[];
  safetyIndicators: Array<{ name: string; severity: string; explanation: string }>;
  suggestedActionItems: string[];
  disclaimer: string;
  fullDraftText: string;
}
