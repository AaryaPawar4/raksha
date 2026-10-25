import { IncidentRepository } from '../repositories/incident.repository';
import { isDatabaseConnected } from '../config/db';
import { AuditLogger } from '../utils/auditLogger';
import {
  Incident,
  CreateIncidentDTO,
  IncidentListQuery,
  PaginatedResult,
  DeleteIncidentResult,
} from '@rakshasphere/shared';

export class ServiceError extends Error {
  public code:
    | 'VALIDATION_ERROR'
    | 'UNAUTHENTICATED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'RATE_LIMITED'
    | 'AI_PROVIDER_UNAVAILABLE'
    | 'CONFLICT'
    | 'INTERNAL_ERROR';
  public statusCode: number;

  constructor(
    message: string,
    code: ServiceError['code'] = 'INTERNAL_ERROR',
    statusCode: number = 500
  ) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class IncidentService {
  private static checkDatabase(): void {
    if (!isDatabaseConnected()) {
      throw new ServiceError(
        'Database service is currently unavailable. Please ensure MongoDB is connected.',
        'INTERNAL_ERROR',
        503
      );
    }
  }

  public static async createIncident(
    ownerId: string,
    data: CreateIncidentDTO
  ): Promise<Incident> {
    this.checkDatabase();
    return IncidentRepository.create(ownerId, data);
  }

  public static async getIncidentById(
    id: string,
    ownerId: string
  ): Promise<Incident> {
    this.checkDatabase();

    const incident = await IncidentRepository.findByIdAndOwner(id, ownerId);
    if (!incident) {
      throw new ServiceError(
        `Incident not found or you do not have permission to access it.`,
        'NOT_FOUND',
        404
      );
    }

    return incident;
  }

  public static async listIncidents(
    ownerId: string,
    query: IncidentListQuery
  ): Promise<PaginatedResult<Incident>> {
    this.checkDatabase();
    return IncidentRepository.findByOwner(ownerId, query);
  }

  public static async deleteIncident(
    id: string,
    ownerId: string
  ): Promise<DeleteIncidentResult> {
    this.checkDatabase();

    const incident = await IncidentRepository.findByIdAndOwner(id, ownerId);
    if (!incident) {
      throw new ServiceError(
        'Incident not found or you do not have permission to delete it.',
        'NOT_FOUND',
        404
      );
    }

    const result = await IncidentRepository.deleteByIdAndOwner(id, ownerId);

    AuditLogger.log({
      eventType: 'INCIDENT_DELETED',
      userId: ownerId,
      resourceId: id,
      success: true,
      metadata: {
        removedLinksCount: result.removedLinksCount,
        retainedEvidenceCount: result.retainedEvidenceCount,
      },
    });

    return {
      deleted: true,
      id,
      removedLinksCount: result.removedLinksCount,
      retainedEvidenceCount: result.retainedEvidenceCount,
      policy: 'EVIDENCE_RETAINED_AND_DETACHED',
    };
  }
}
