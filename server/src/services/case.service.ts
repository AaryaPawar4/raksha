import { isDatabaseConnected } from '../config/db';
import { IncidentRepository } from '../repositories/incident.repository';
import { CaseRepository } from '../repositories/case.repository';
import { ServiceError } from './incident.service';
import { TrackedCase, CreateCaseDTO, UpdateCaseDTO } from '@rakshasphere/shared';

export class CaseService {
  private static checkDatabase(): void {
    if (!isDatabaseConnected()) {
      throw new ServiceError(
        'Database service is currently unavailable. Please ensure MongoDB is connected.',
        'INTERNAL_ERROR',
        503
      );
    }
  }

  public static async createCase(
    ownerId: string,
    dto: CreateCaseDTO
  ): Promise<TrackedCase> {
    this.checkDatabase();

    const incident = await IncidentRepository.findByIdAndOwner(dto.incidentId, ownerId);
    if (!incident) {
      throw new ServiceError(
        'Associated incident not found or you do not have permission to track a case for it.',
        'NOT_FOUND',
        404
      );
    }

    return CaseRepository.create(ownerId, dto);
  }

  public static async listCases(
    ownerId: string,
    incidentId?: string
  ): Promise<TrackedCase[]> {
    this.checkDatabase();

    if (incidentId) {
      const incident = await IncidentRepository.findByIdAndOwner(incidentId, ownerId);
      if (!incident) {
        throw new ServiceError(
          'Incident not found or you do not have permission to view its cases.',
          'NOT_FOUND',
          404
        );
      }
    }

    return CaseRepository.findByOwner(ownerId, incidentId);
  }

  public static async getCaseById(
    ownerId: string,
    id: string
  ): Promise<TrackedCase> {
    this.checkDatabase();

    const trackedCase = await CaseRepository.findByIdAndOwner(ownerId, id);
    if (!trackedCase) {
      throw new ServiceError(
        'Tracked case not found or you do not have permission to access it.',
        'NOT_FOUND',
        404
      );
    }

    return trackedCase;
  }

  public static async updateCase(
    ownerId: string,
    id: string,
    dto: UpdateCaseDTO
  ): Promise<TrackedCase> {
    this.checkDatabase();

    const updated = await CaseRepository.updateByIdAndOwner(ownerId, id, dto);
    if (!updated) {
      throw new ServiceError(
        'Tracked case not found or you do not have permission to update it.',
        'NOT_FOUND',
        404
      );
    }

    return updated;
  }

  public static async deleteCase(
    ownerId: string,
    id: string
  ): Promise<boolean> {
    this.checkDatabase();

    const deleted = await CaseRepository.deleteByIdAndOwner(ownerId, id);
    if (!deleted) {
      throw new ServiceError(
        'Tracked case not found or you do not have permission to delete it.',
        'NOT_FOUND',
        404
      );
    }

    return true;
  }
}
