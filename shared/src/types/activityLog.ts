export type ActivityEventType =
  | 'AUTH_REGISTER'
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILURE'
  | 'AUTH_LOGOUT'
  | 'AUTH_TOKEN_REFRESH'
  | 'AUTH_TOKEN_REUSE_DETECTED'
  | 'INCIDENT_CREATED'
  | 'INCIDENT_UPDATED'
  | 'INCIDENT_DELETED'
  | 'VAULT_UPLOAD'
  | 'VAULT_VERIFY'
  | 'VAULT_DELETE'
  | 'CASE_CREATED'
  | 'CASE_UPDATED'
  | 'CASE_DELETED'
  | 'CASE_PDF_EXPORTED'
  | 'INCIDENTS_CSV_EXPORTED'
  | 'CASES_CSV_EXPORTED'
  | 'CHECKIN_CREATED'
  | 'CHECKIN_COMPLETED'
  | 'CHECKIN_CANCELLED'
  | 'CONTACT_CREATED'
  | 'CONTACT_UPDATED'
  | 'CONTACT_DELETED';

export type ActivityEventOutcome = 'SUCCESS' | 'FAILURE';

/** User-visible activity record — never contains secrets */
export interface ActivityLogEntry {
  id: string;
  eventType: ActivityEventType;
  outcome: ActivityEventOutcome;
  resourceId?: string;
  resourceLabel?: string;
  safeMetadata?: Record<string, string | number | boolean>;
  createdAt: string;
}

export interface ActivityLogQuery {
  eventType?: ActivityEventType;
  outcome?: ActivityEventOutcome;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedActivityLog {
  items: ActivityLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Friendly human-readable label for each event type */
export const ACTIVITY_EVENT_LABELS: Record<ActivityEventType, string> = {
  AUTH_REGISTER: 'Account registered',
  AUTH_LOGIN_SUCCESS: 'Signed in',
  AUTH_LOGIN_FAILURE: 'Failed sign-in attempt',
  AUTH_LOGOUT: 'Signed out',
  AUTH_TOKEN_REFRESH: 'Session refreshed',
  AUTH_TOKEN_REUSE_DETECTED: 'Suspicious session reuse detected',
  INCIDENT_CREATED: 'Incident reported',
  INCIDENT_UPDATED: 'Incident updated',
  INCIDENT_DELETED: 'Incident deleted',
  VAULT_UPLOAD: 'Evidence file uploaded',
  VAULT_VERIFY: 'Evidence integrity verified',
  VAULT_DELETE: 'Evidence file deleted',
  CASE_CREATED: 'Case tracked',
  CASE_UPDATED: 'Case status updated',
  CASE_DELETED: 'Case removed',
  CASE_PDF_EXPORTED: 'Case PDF dossier exported',
  INCIDENTS_CSV_EXPORTED: 'Incidents exported as CSV',
  CASES_CSV_EXPORTED: 'Cases exported as CSV',
  CHECKIN_CREATED: 'Safety check-in scheduled',
  CHECKIN_COMPLETED: 'Safety check-in marked safe',
  CHECKIN_CANCELLED: 'Safety check-in cancelled',
  CONTACT_CREATED: 'Trusted contact added',
  CONTACT_UPDATED: 'Trusted contact updated',
  CONTACT_DELETED: 'Trusted contact removed',
};
