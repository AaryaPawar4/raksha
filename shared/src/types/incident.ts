export type IncidentType =
  | 'HARASSMENT'
  | 'DOXXING'
  | 'IMPERSONATION'
  | 'BLACKMAIL'
  | 'STALKING'
  | 'FINANCIAL_SCAM'
  | 'OTHER';

export type IncidentStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'ARCHIVED';

export type PlatformType =
  | 'INSTAGRAM'
  | 'WHATSAPP'
  | 'TELEGRAM'
  | 'TWITTER_X'
  | 'FACEBOOK'
  | 'SMS'
  | 'EMAIL'
  | 'OTHER';

export interface ThreatIdentifier {
  type: 'USERNAME' | 'PHONE' | 'EMAIL' | 'URL' | 'OTHER';
  value: string;
}

export interface Incident {
  id: string;
  ownerId: string;
  title: string;
  incidentType: IncidentType;
  description: string;
  occurredAt: string;
  platform: PlatformType;
  status: IncidentStatus;
  identifiers?: ThreatIdentifier[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateIncidentDTO {
  title: string;
  incidentType: IncidentType;
  description: string;
  occurredAt?: string;
  platform: PlatformType;
  identifiers?: ThreatIdentifier[];
}

export interface IncidentListQuery {
  page?: number;
  limit?: number;
  status?: IncidentStatus;
  incidentType?: IncidentType;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DeleteIncidentResult {
  deleted: boolean;
  id: string;
  removedLinksCount: number;
  retainedEvidenceCount: number;
  policy: string;
}

