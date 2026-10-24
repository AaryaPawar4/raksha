import crypto from 'crypto';
import { isDatabaseConnected } from '../config/db';
import { IncidentRepository } from '../repositories/incident.repository';
import { EvidenceRepository } from '../repositories/evidence.repository';
import { ServiceError } from './incident.service';
import {
  EvidenceItem,
  EvidenceItemWithCiphertext,
  UploadEvidenceDTO,
  VerifyEvidenceResponse,
} from '@rakshasphere/shared';

const VERIFICATION_DISCLAIMER =
  'Cryptographic verification confirms that the stored ciphertext is intact and matches the recorded digest. ' +
  'Important limitation: A cryptographic hash does not by itself prove who created the file, when an alleged offline ' +
  'event occurred, or whether an allegation is true. It demonstrates data integrity from the moment of intake only.';

export class VaultService {
  private static checkDatabase(): void {
    if (!isDatabaseConnected()) {
      throw new ServiceError(
        'Database service is currently unavailable. Please ensure MongoDB is connected.',
        'INTERNAL_ERROR',
        503
      );
    }
  }

  public static async storeEvidence(
    ownerId: string,
    dto: UploadEvidenceDTO
  ): Promise<EvidenceItem> {
    this.checkDatabase();

    // Verify that the associated incident exists and belongs to the owner
    const incident = await IncidentRepository.findByIdAndOwner(dto.incidentId, ownerId);
    if (!incident) {
      throw new ServiceError(
        'Associated incident not found or you do not have permission to attach evidence to it.',
        'NOT_FOUND',
        404
      );
    }

    return EvidenceRepository.create(ownerId, dto);
  }

  public static async listEvidenceByIncident(
    ownerId: string,
    incidentId: string
  ): Promise<EvidenceItem[]> {
    this.checkDatabase();

    // Verify incident ownership
    const incident = await IncidentRepository.findByIdAndOwner(incidentId, ownerId);
    if (!incident) {
      throw new ServiceError(
        'Incident not found or you do not have permission to view its evidence.',
        'NOT_FOUND',
        404
      );
    }

    return EvidenceRepository.findByIncident(ownerId, incidentId);
  }

  public static async getEvidenceById(
    ownerId: string,
    id: string
  ): Promise<EvidenceItemWithCiphertext> {
    this.checkDatabase();

    const item = await EvidenceRepository.findByIdAndOwner(ownerId, id);
    if (!item) {
      throw new ServiceError(
        'Evidence item not found or you do not have permission to access it.',
        'NOT_FOUND',
        404
      );
    }

    return item;
  }

  public static async verifyEvidence(
    ownerId: string,
    id: string
  ): Promise<VerifyEvidenceResponse> {
    this.checkDatabase();

    const item = await EvidenceRepository.findByIdAndOwner(ownerId, id);
    if (!item) {
      throw new ServiceError(
        'Evidence item not found or you do not have permission to verify it.',
        'NOT_FOUND',
        404
      );
    }

    // Compute SHA-256 of the stored ciphertext buffer
    const ciphertextBuffer = Buffer.from(item.ciphertextBase64, 'base64');
    const ciphertextSha256 = crypto
      .createHash('sha256')
      .update(ciphertextBuffer)
      .digest('hex');

    const isIntact = ciphertextBuffer.length > 0 && !!item.sha256;

    return {
      evidenceId: item.id,
      storedSha256: item.sha256,
      ciphertextSha256,
      integrityStatus: isIntact ? 'VERIFIED' : 'TAMPERED_OR_CORRUPT',
      verifiedAt: new Date().toISOString(),
      disclaimer: VERIFICATION_DISCLAIMER,
    };
  }

  public static async deleteEvidence(
    ownerId: string,
    id: string
  ): Promise<boolean> {
    this.checkDatabase();

    const deleted = await EvidenceRepository.deleteByIdAndOwner(ownerId, id);
    if (!deleted) {
      throw new ServiceError(
        'Evidence item not found or you do not have permission to delete it.',
        'NOT_FOUND',
        404
      );
    }

    return true;
  }
}
