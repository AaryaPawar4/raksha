import { isDatabaseConnected } from '../config/db';
import { IncidentRepository } from '../repositories/incident.repository';
import { EvidenceRepository } from '../repositories/evidence.repository';
import { RuleAnalysisService } from './ruleAnalysis.service';
import { PlaybookService } from './playbook.service';
import { ServiceError } from './incident.service';
import { ReportDraft, EvidenceDigestSummary, SafetyIndicator } from '@rakshasphere/shared';

const REPORT_DISCLAIMER =
  'IMPORTANT NOTICE: This complaint draft is prepared from incident records documented by the user in RakshaSphere. ' +
  'It represents the personal statement and documented timeline of the reporting party. ' +
  'RakshaSphere does NOT automatically file, transmit, or submit this draft to any law enforcement agency, ' +
  'cybercrime cell, or external platform. The user must review, verify, and submit this complaint manually through ' +
  'authorized channels (e.g., cybercrime.gov.in or local police station).';

export class ReportDraftService {
  public static async generateReportDraft(
    ownerId: string,
    incidentId: string
  ): Promise<ReportDraft> {
    if (!isDatabaseConnected()) {
      throw new ServiceError(
        'Database service is currently unavailable. Please ensure MongoDB is connected.',
        'INTERNAL_ERROR',
        503
      );
    }

    const incident = await IncidentRepository.findByIdAndOwner(incidentId, ownerId);
    if (!incident) {
      throw new ServiceError(
        'Incident not found or you do not have permission to generate a report draft for it.',
        'NOT_FOUND',
        404
      );
    }

    // 1. Fetch deterministic safety indicators
    const ruleIndicators: SafetyIndicator[] = RuleAnalysisService.evaluate(incident);

    // 2. Fetch curated playbook recommendations
    const playbook = PlaybookService.getPlaybookForCategory(incident.incidentType);

    // 3. Fetch evidence items metadata (excluding ciphertext)
    const evidenceItemsRaw = await EvidenceRepository.findByIncident(ownerId, incidentId);
    const evidenceItems: EvidenceDigestSummary[] = evidenceItemsRaw.map((e) => ({
      filename: e.filename,
      mimeType: e.mimeType,
      size: e.size,
      sha256: e.sha256,
      serverReceivedAt: e.serverReceivedAt,
    }));

    // 4. Construct human-readable complaint document text
    const occurredDateStr = new Date(incident.occurredAt).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    });

    const nowStr = new Date().toISOString();

    const identifiersList =
      incident.identifiers && incident.identifiers.length > 0
        ? incident.identifiers
            .map((id) => `  - [${id.type}] ${id.value}`)
            .join('\n')
        : '  - None recorded at intake';

    const evidenceList =
      evidenceItems.length > 0
        ? evidenceItems
            .map(
              (ev, idx) =>
                `  ${idx + 1}. Filename: ${ev.filename} (${ev.mimeType}, ${ev.size} bytes)\n` +
                `     Intake SHA-256 Digest: ${ev.sha256}\n` +
                `     Recorded At: ${ev.serverReceivedAt}`
            )
            .join('\n\n')
        : '  - No evidence files attached';

    const indicatorsList =
      ruleIndicators.length > 0
        ? ruleIndicators
            .map(
              (ind: SafetyIndicator) =>
                `  - [${ind.severity}] ${ind.name}: ${ind.explanation}`
            )
            .join('\n')
        : '  - Standard incident category baseline';

    const fullDraftText = [
      '================================================================================',
      '               FORMAL CYBER INCIDENT COMPLAINT STATEMENT (DRAFT)                ',
      '================================================================================',
      '',
      `DATE OF COMPLAINT PREPARATION: ${new Date().toLocaleDateString('en-IN')} (Draft ID: RS-${incident.id.slice(-6).toUpperCase()})`,
      `INCIDENT CLASSIFICATION:       ${incident.incidentType.replace('_', ' ')}`,
      `PLATFORM / CHANNEL:            ${incident.platform}`,
      `DATE & TIME OF OCCURRENCE:     ${occurredDateStr}`,
      '',
      '--------------------------------------------------------------------------------',
      '1. COMPLAINANT STATEMENT & INCIDENT SUMMARY',
      '--------------------------------------------------------------------------------',
      `Subject: ${incident.title}`,
      '',
      'Detailed Narrative:',
      incident.description,
      '',
      '--------------------------------------------------------------------------------',
      '2. SUSPECT / PERPETRATOR DIGITAL IDENTIFIERS',
      '--------------------------------------------------------------------------------',
      identifiersList,
      '',
      '--------------------------------------------------------------------------------',
      '3. PRESERVED DIGITAL EVIDENCE & INTEGRITY HASHES',
      '--------------------------------------------------------------------------------',
      'The following files have been encrypted and cataloged with SHA-256 cryptographic digests:',
      '',
      evidenceList,
      '',
      '--------------------------------------------------------------------------------',
      '4. IDENTIFIED SAFETY RISKS & CONCERNS',
      '--------------------------------------------------------------------------------',
      indicatorsList,
      '',
      '--------------------------------------------------------------------------------',
      '5. RECOMMENDED IMMEDIATE RELIEF REQUESTED',
      '--------------------------------------------------------------------------------',
      'Based on official cybercrime reporting guidelines, the complainant requests:',
      '  - Preservation of server access logs and subscriber registration details from the relevant platform.',
      '  - Immediate blocking and takedown of abusive accounts, impersonated profiles, or unauthorized material.',
      '  - Appropriate legal investigation under relevant sections of the Information Technology Act and criminal law.',
      '',
      '--------------------------------------------------------------------------------',
      'DISCLAIMER & VERIFICATION',
      '--------------------------------------------------------------------------------',
      REPORT_DISCLAIMER,
      '================================================================================',
    ].join('\n');

    return {
      incidentId: incident.id,
      title: incident.title,
      incidentType: incident.incidentType,
      platform: incident.platform,
      occurredAt: incident.occurredAt,
      generatedAt: nowStr,
      narrative: incident.description,
      identifiers: incident.identifiers || [],
      evidenceItems,
      safetyIndicators: ruleIndicators.map((r: SafetyIndicator) => ({
        name: r.name,
        severity: r.severity,
        explanation: r.explanation,
      })),
      suggestedActionItems: playbook.immediateSafetySteps,
      disclaimer: REPORT_DISCLAIMER,
      fullDraftText,
    };
  }
}
