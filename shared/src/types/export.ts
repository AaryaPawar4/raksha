export interface ExportCasePdfOptions {
  includeEvidenceDigest?: boolean;
  includeComplaintDraft?: boolean;
}

export interface ExportIncidentsCsvQuery {
  startDate?: string;
  endDate?: string;
  status?: string;
  incidentType?: string;
  platform?: string;
}

export interface ExportCasesCsvQuery {
  status?: string;
  reportingChannel?: string;
}
