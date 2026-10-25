import { Request, Response, NextFunction } from 'express';
import { ActivityLogRepository } from '../repositories/activityLog.repository';
import { createSuccessResponse, createErrorResponse } from '../utils/response';
import { ServiceError } from '../services/incident.service';
import { ActivityEventType, ActivityEventOutcome } from '@rakshasphere/shared';

const VALID_EVENT_TYPES = new Set<ActivityEventType>([
  'AUTH_REGISTER', 'AUTH_LOGIN_SUCCESS', 'AUTH_LOGIN_FAILURE', 'AUTH_LOGOUT',
  'AUTH_TOKEN_REFRESH', 'AUTH_TOKEN_REUSE_DETECTED', 'INCIDENT_CREATED',
  'INCIDENT_UPDATED', 'INCIDENT_DELETED', 'VAULT_UPLOAD', 'VAULT_VERIFY',
  'VAULT_DELETE', 'CASE_CREATED', 'CASE_UPDATED', 'CASE_DELETED',
  'CASE_PDF_EXPORTED', 'INCIDENTS_CSV_EXPORTED', 'CASES_CSV_EXPORTED',
  'CHECKIN_CREATED', 'CHECKIN_COMPLETED', 'CHECKIN_CANCELLED',
  'CONTACT_CREATED', 'CONTACT_UPDATED', 'CONTACT_DELETED',
]);

const VALID_OUTCOMES = new Set<ActivityEventOutcome>(['SUCCESS', 'FAILURE']);

export class ActivityLogController {
  public static async list(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const ownerId = req.user?.id;
      if (!ownerId) {
        res.status(401).json(createErrorResponse('UNAUTHENTICATED', 'User identity required.'));
        return;
      }

      const {
        eventType,
        outcome,
        startDate,
        endDate,
        page: pageStr,
        limit: limitStr,
      } = req.query as Record<string, string | undefined>;

      // Validate eventType if provided
      if (eventType && !VALID_EVENT_TYPES.has(eventType as ActivityEventType)) {
        res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'Invalid eventType filter value.'));
        return;
      }

      // Validate outcome if provided
      if (outcome && !VALID_OUTCOMES.has(outcome as ActivityEventOutcome)) {
        res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'Invalid outcome filter value. Must be SUCCESS or FAILURE.'));
        return;
      }

      // Validate dates
      if (startDate && isNaN(Date.parse(startDate))) {
        res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'Invalid startDate format.'));
        return;
      }
      if (endDate && isNaN(Date.parse(endDate))) {
        res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'Invalid endDate format.'));
        return;
      }

      const page = pageStr ? Math.max(1, parseInt(pageStr, 10)) : 1;
      const limit = limitStr ? Math.min(100, Math.max(1, parseInt(limitStr, 10))) : 25;

      if (isNaN(page) || isNaN(limit)) {
        res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'page and limit must be integers.'));
        return;
      }

      const result = await ActivityLogRepository.findByOwner(ownerId, {
        eventType: eventType as ActivityEventType | undefined,
        outcome: outcome as ActivityEventOutcome | undefined,
        startDate,
        endDate,
        page,
        limit,
      });

      res.status(200).json(createSuccessResponse(result));
    } catch (error) {
      if (error instanceof ServiceError) {
        res.status(error.statusCode).json(createErrorResponse(error.code, error.message));
        return;
      }
      next(error);
    }
  }
}
