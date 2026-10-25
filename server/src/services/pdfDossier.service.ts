import PDFDocument from 'pdfkit';
import { CaseRepository } from '../repositories/case.repository';
import { IncidentRepository } from '../repositories/incident.repository';
import { ReportDraftService } from './reportDraft.service';
import { ServiceError } from './incident.service';
import { ExportCasePdfOptions } from '@rakshasphere/shared';
import { createSafeFilename } from '../utils/csvSanitizer';

const LEGAL_CHECKSUM_DISCLAIMER =
  'LEGAL & TECHNICAL NOTICE: A SHA-256 cryptographic checksum verifies digital file integrity ' +
  'relative to a recorded intake digest to detect subsequent tampering, corruption, or modification. ' +
  'However, a checksum does not independently prove forensic provenance, origin authenticity, or evidentiary admissibility. ' +
  'ZERO-KNOWLEDGE VAULT INTEGRITY: Under RakshaSphere zero-knowledge privacy architecture, encrypted ' +
  'vault files remain sealed with client-side derived keys and are never decrypted or embedded in this report.';

export class PdfDossierService {
  public static async generateCasePdf(
    ownerId: string,
    caseId: string,
    options: ExportCasePdfOptions = {}
  ): Promise<{ buffer: Buffer; filename: string }> {
    const caseDoc = await CaseRepository.findByIdAndOwner(ownerId, caseId);
    if (!caseDoc) {
      throw new ServiceError(
        'Tracked case not found or you do not have permission to export it.',
        'NOT_FOUND',
        404
      );
    }

    const incident = await IncidentRepository.findByIdAndOwner(
      caseDoc.incidentId,
      ownerId
    );
    if (!incident) {
      throw new ServiceError(
        'Associated incident not found or you do not have permission to access it.',
        'NOT_FOUND',
        404
      );
    }

    const draft = await ReportDraftService.generateReportDraft(
      ownerId,
      caseDoc.incidentId
    );

    const includeEvidence = options.includeEvidenceDigest !== false;
    const includeDraft = options.includeComplaintDraft !== false;

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        bufferPages: true,
        info: {
          Title: `RakshaSphere Case Dossier - ${caseDoc.referenceNumber}`,
          Author: 'RakshaSphere Safety Platform',
          Subject: 'Official Incident Dossier & Evidence Digest',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const primaryColor = '#1e293b'; // Slate 800
      const accentColor = '#2563eb'; // Blue 600
      const mutedColor = '#64748b'; // Slate 500
      const dangerColor = '#dc2626'; // Red 600

      // --- Header ---
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .fillColor(accentColor)
        .text('RAKSHASPHERE', { align: 'left' });

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(mutedColor)
        .text('CONFIDENTIAL CASE DOSSIER & EVIDENCE INTEGRITY RECORD', {
          align: 'left',
        });

      doc.moveDown(0.5);
      doc
        .strokeColor('#cbd5e1')
        .lineWidth(1)
        .moveTo(40, doc.y)
        .lineTo(555, doc.y)
        .stroke();
      doc.moveDown(0.8);

      // --- Section 1: Case Tracking Metadata ---
      doc
        .fontSize(13)
        .font('Helvetica-Bold')
        .fillColor(primaryColor)
        .text('1. CASE OVERVIEW & TRACKING METADATA');
      doc.moveDown(0.3);

      doc.fontSize(9).font('Helvetica');
      const caseMeta = [
        ['Case Reference Number:', caseDoc.referenceNumber],
        ['Tracking Channel:', caseDoc.reportingChannel],
        ['Status:', caseDoc.status],
        ['Verification Status:', caseDoc.verificationBadge],
        ['Created At:', new Date(caseDoc.createdAt).toLocaleString('en-IN')],
        ['Last Updated:', new Date(caseDoc.updatedAt).toLocaleString('en-IN')],
        [
          'Follow-Up Scheduled:',
          caseDoc.followUpAt
            ? new Date(caseDoc.followUpAt).toLocaleDateString('en-IN')
            : 'None',
        ],
      ];

      caseMeta.forEach(([label, val]) => {
        doc
          .font('Helvetica-Bold')
          .fillColor(primaryColor)
          .text(label.padEnd(26), { continued: true })
          .font('Helvetica')
          .fillColor('#334155')
          .text(val);
      });

      if (caseDoc.notes) {
        doc.moveDown(0.2);
        doc
          .font('Helvetica-Bold')
          .fillColor(primaryColor)
          .text('Case Notes: ', { continued: true })
          .font('Helvetica')
          .fillColor('#334155')
          .text(caseDoc.notes);
      }

      doc.moveDown(0.8);

      // --- Section 2: Incident Details ---
      doc
        .fontSize(13)
        .font('Helvetica-Bold')
        .fillColor(primaryColor)
        .text('2. DOCUMENTED INCIDENT PARTICULARS');
      doc.moveDown(0.3);

      const incidentMeta = [
        ['Incident ID:', incident.id],
        ['Incident Title:', incident.title],
        ['Category / Type:', incident.incidentType],
        ['Platform / Vector:', incident.platform],
        ['Current Incident Status:', incident.status],
        [
          'Incident Occurred:',
          new Date(incident.occurredAt).toLocaleString('en-IN'),
        ],
        [
          'Intake Recorded At:',
          new Date(incident.createdAt).toLocaleString('en-IN'),
        ],
      ];

      incidentMeta.forEach(([label, val]) => {
        doc
          .font('Helvetica-Bold')
          .fillColor(primaryColor)
          .text(label.padEnd(26), { continued: true })
          .font('Helvetica')
          .fillColor('#334155')
          .text(val);
      });

      doc.moveDown(0.3);
      doc
        .font('Helvetica-Bold')
        .fillColor(primaryColor)
        .text('Recorded Digital Identifiers:');

      if (incident.identifiers && incident.identifiers.length > 0) {
        incident.identifiers.forEach((id) => {
          doc
            .font('Helvetica')
            .fillColor('#334155')
            .text(`  • [${id.type}] ${id.value}`);
        });
      } else {
        doc
          .font('Helvetica')
          .fillColor(mutedColor)
          .text('  • No external identifiers recorded at intake');
      }

      doc.moveDown(0.3);
      doc
        .font('Helvetica-Bold')
        .fillColor(primaryColor)
        .text('Intake Description / Narrative:');
      doc
        .font('Helvetica')
        .fillColor('#334155')
        .text(incident.description || 'No detailed narrative provided.', {
          align: 'justify',
        });

      doc.moveDown(0.8);

      // --- Section 3: Safety Analysis & Action Recommendations ---
      doc
        .fontSize(13)
        .font('Helvetica-Bold')
        .fillColor(primaryColor)
        .text('3. SAFETY ANALYSIS & PLAYBOOK GUIDELINES');
      doc.moveDown(0.3);

      if (draft.safetyIndicators && draft.safetyIndicators.length > 0) {
        doc
          .font('Helvetica-Bold')
          .fillColor(primaryColor)
          .text('Identified Risk Indicators:');
        draft.safetyIndicators.forEach((ind) => {
          doc
            .font('Helvetica-Bold')
            .fillColor(ind.severity === 'HIGH' || ind.severity === 'CRITICAL' ? dangerColor : primaryColor)
            .text(`  • [${ind.severity}] ${ind.name}: `, { continued: true })
            .font('Helvetica')
            .fillColor('#334155')
            .text(ind.explanation);
        });
      }

      if (draft.suggestedActionItems && draft.suggestedActionItems.length > 0) {
        doc.moveDown(0.3);
        doc
          .font('Helvetica-Bold')
          .fillColor(primaryColor)
          .text('Recommended Actions & Evidence Preservation Guidelines:');
        draft.suggestedActionItems.forEach((action) => {
          doc
            .font('Helvetica')
            .fillColor('#334155')
            .text(`  ✓ ${action}`);
        });
      }

      // --- Section 4: Evidence Integrity Catalog ---
      if (includeEvidence) {
        doc.moveDown(0.8);
        doc
          .fontSize(13)
          .font('Helvetica-Bold')
          .fillColor(primaryColor)
          .text('4. EVIDENCE VAULT INTEGRITY CATALOG & CHECKSUMS');
        doc.moveDown(0.3);

        if (draft.evidenceItems && draft.evidenceItems.length > 0) {
          draft.evidenceItems.forEach((ev, idx) => {
            doc
              .font('Helvetica-Bold')
              .fillColor(primaryColor)
              .text(`Item ${idx + 1}: ${ev.filename}`)
              .font('Helvetica')
              .fillColor('#334155')
              .text(`  MIME Type: ${ev.mimeType} | Size: ${ev.size} bytes | Intake: ${ev.serverReceivedAt}`)
              .font('Courier')
              .fillColor(accentColor)
              .text(`  SHA-256 Digest: ${ev.sha256}`)
              .moveDown(0.2);
          });
        } else {
          doc
            .font('Helvetica')
            .fillColor(mutedColor)
            .text('No vault evidence files currently linked to this incident.');
        }

        doc.moveDown(0.3);
        // Integrity notice box
        doc
          .rect(40, doc.y, 515, 52)
          .fillAndStroke('#f8fafc', '#cbd5e1');
        doc.y += 6;
        doc
          .fontSize(7.5)
          .font('Helvetica-Bold')
          .fillColor(dangerColor)
          .text('IMPORTANT FORENSIC & INTEGRITY NOTICE', 48, doc.y, { width: 499 });
        doc
          .fontSize(7)
          .font('Helvetica')
          .fillColor('#475569')
          .text(LEGAL_CHECKSUM_DISCLAIMER, 48, doc.y + 2, { width: 499 });
        doc.y += 35;
      }

      // --- Section 5: Formal Complaint Statement Draft ---
      if (includeDraft && draft.fullDraftText) {
        doc.addPage();
        doc
          .fontSize(13)
          .font('Helvetica-Bold')
          .fillColor(primaryColor)
          .text('5. FORMAL COMPLAINT STATEMENT DRAFT');
        doc.moveDown(0.2);

        doc
          .fontSize(8)
          .font('Helvetica-Oblique')
          .fillColor(mutedColor)
          .text(
            'Prepared for formal submission to cybercrime reporting portals (cybercrime.gov.in) or local police authorities.',
            { align: 'left' }
          );
        doc.moveDown(0.5);

        // Pre-formatted complaint statement
        doc
          .fontSize(8.5)
          .font('Courier')
          .fillColor('#1e293b')
          .text(draft.fullDraftText, {
            align: 'left',
            lineGap: 1.5,
          });
      }

      // --- Footer for all pages ---
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor(mutedColor)
          .text(
            `RakshaSphere Confidential Case Dossier [${caseDoc.referenceNumber}] — Page ${i + 1} of ${range.count}`,
            40,
            doc.page.height - 30,
            { align: 'center', width: doc.page.width - 80 }
          );
      }

      doc.end();
    });

    const safeFilename = createSafeFilename(
      'RakshaSphere_Case',
      caseDoc.referenceNumber,
      'pdf'
    );

    return { buffer, filename: safeFilename };
  }
}
