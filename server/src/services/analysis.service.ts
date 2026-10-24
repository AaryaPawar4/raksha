import { IncidentRepository } from '../repositories/incident.repository';
import { RuleAnalysisService } from './ruleAnalysis.service';
import { PlaybookService } from './playbook.service';
import { AiProviderService } from './aiProvider.service';
import { isDatabaseConnected } from '../config/db';
import { ServiceError } from './incident.service';
import {
  ThreatAnalysisResponse,
  AnalyzeIncidentDTO,
  AnalysisMode,
  ProviderStatus,
} from '@rakshasphere/shared';

const STANDARD_DISCLAIMER =
  'RakshaSphere analysis provides safety indicators and evidence preservation steps. It is not legal advice, police representation, or a definitive verdict on guilt.';

export class AnalysisService {
  private static checkDatabase(): void {
    if (!isDatabaseConnected()) {
      throw new ServiceError(
        'Database service is currently unavailable. Please ensure MongoDB is connected.',
        'INTERNAL_ERROR',
        503
      );
    }
  }

  public static async analyzeIncident(
    ownerId: string,
    incidentId: string,
    options: AnalyzeIncidentDTO
  ): Promise<ThreatAnalysisResponse> {
    this.checkDatabase();

    // 1. Fetch incident and verify ownership
    const incident = await IncidentRepository.findByIdAndOwner(incidentId, ownerId);
    if (!incident) {
      throw new ServiceError(
        'Incident not found or you do not have permission to access it.',
        'NOT_FOUND',
        404
      );
    }

    // 2. Deterministic rule-based evaluation (always runs)
    const ruleIndicators = RuleAnalysisService.evaluate(incident);
    const playbook = PlaybookService.getPlaybookForCategory(incident.incidentType);
    let overallSeverity = RuleAnalysisService.calculateOverallSeverity(ruleIndicators);

    let analysisMode: AnalysisMode = 'RULES_ONLY';
    let providerStatus: ProviderStatus = 'SKIPPED_NO_CONSENT';
    let aiAnalysis: ThreatAnalysisResponse['aiAnalysis'] = null;

    // 3. Optional AI processing strictly gated by explicit user consent
    if (options.consentToAiProcessing === true) {
      analysisMode = 'AI_ASSISTED';
      const aiResult = await AiProviderService.analyze(incident);

      providerStatus = aiResult.status;

      if (aiResult.success && aiResult.data) {
        aiAnalysis = aiResult.data;
        // If AI assessment identifies a higher severity, prioritize the higher safety rating
        if (
          aiResult.data.overallSeverity === 'CRITICAL' ||
          (aiResult.data.overallSeverity === 'HIGH' && overallSeverity !== 'CRITICAL')
        ) {
          overallSeverity = aiResult.data.overallSeverity;
        }
      }
      // If AI failed or not configured, providerStatus reflects it, and rule indicators serve as complete fallback
    }

    return {
      incidentId: incident.id,
      incidentType: incident.incidentType,
      platform: incident.platform,
      analysisMode,
      providerStatus,
      overallSeverity,
      ruleIndicators,
      playbook,
      aiAnalysis,
      consentGiven: options.consentToAiProcessing === true,
      disclaimer: STANDARD_DISCLAIMER,
      analyzedAt: new Date().toISOString(),
    };
  }
}
