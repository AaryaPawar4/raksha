import { IncidentType, PlatformType } from './incident';

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface SafetyIndicator {
  id: string;
  name: string;
  severity: SeverityLevel;
  confidence: ConfidenceLevel;
  explanation: string;
  uncertaintyNotes: string;
  matchedSignals?: string[];
}

export interface OfficialReportingChannel {
  name: string;
  url: string;
  verifiedDate: string;
  scope: string;
  notes: string;
}

export interface CuratedPlaybook {
  category: IncidentType;
  title: string;
  version: string;
  immediateSafetySteps: string[];
  accountSecuritySteps: string[];
  evidencePreservationSteps: string[];
  officialReportingChannels: OfficialReportingChannel[];
  emergencyAssistanceGuidance: string;
  disclaimer: string;
}

export interface AiStructuredOutput {
  overallSeverity: SeverityLevel;
  indicators: SafetyIndicator[];
  uncertaintyAssessment: string;
  immediateSteps: string[];
  nextSteps: string[];
  modelMetadata: {
    provider: string;
    model: string;
    completedAt: string;
  };
}

export type AnalysisMode = 'RULES_ONLY' | 'AI_ASSISTED';

export type ProviderStatus =
  | 'COMPLETED'
  | 'SKIPPED_NO_CONSENT'
  | 'AI_PROVIDER_NOT_CONFIGURED'
  | 'FALLBACK_PROVIDER_ERROR';

export interface ThreatAnalysisResponse {
  incidentId: string;
  incidentType: IncidentType;
  platform: PlatformType;
  analysisMode: AnalysisMode;
  providerStatus: ProviderStatus;
  overallSeverity: SeverityLevel;
  ruleIndicators: SafetyIndicator[];
  playbook: CuratedPlaybook;
  aiAnalysis: AiStructuredOutput | null;
  consentGiven: boolean;
  disclaimer: string;
  analyzedAt: string;
}

export interface AnalyzeIncidentDTO {
  consentToAiProcessing: boolean;
  consentTimestamp?: string;
}
