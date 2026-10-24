import { Request, Response, NextFunction } from 'express';
import { IncidentService, ServiceError } from '../services/incident.service';
import { ReportDraftService } from '../services/reportDraft.service';
import { createSuccessResponse, createErrorResponse } from '../utils/response';
import {
  createIncidentSchema,
  incidentListQuerySchema,
} from '../validators/incident.validator';
import { ZodError } from 'zod';

export class IncidentController {
  public static async create(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const ownerId = req.user?.id;
      if (!ownerId) {
        res
          .status(401)
          .json(createErrorResponse('UNAUTHENTICATED', 'User identity required.'));
        return;
      }

      const parseResult = createIncidentSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errorDetails = parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        res.status(400).json(
          createErrorResponse(
            'VALIDATION_ERROR',
            'Invalid incident intake payload.',
            errorDetails
          )
        );
        return;
      }

      const incident = await IncidentService.createIncident(
        ownerId,
        parseResult.data
      );

      res.status(201).json(createSuccessResponse(incident));
    } catch (error) {
      if (error instanceof ServiceError) {
        res.status(error.statusCode).json(
          createErrorResponse(error.code, error.message)
        );
        return;
      }
      next(error);
    }
  }

  public static async list(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const ownerId = req.user?.id;
      if (!ownerId) {
        res
          .status(401)
          .json(createErrorResponse('UNAUTHENTICATED', 'User identity required.'));
        return;
      }

      const parseResult = incidentListQuerySchema.safeParse(req.query);
      if (!parseResult.success) {
        const errorDetails = parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        res.status(400).json(
          createErrorResponse(
            'VALIDATION_ERROR',
            'Invalid query parameters.',
            errorDetails
          )
        );
        return;
      }

      const paginatedResult = await IncidentService.listIncidents(
        ownerId,
        parseResult.data
      );

      res.status(200).json(createSuccessResponse(paginatedResult));
    } catch (error) {
      if (error instanceof ServiceError) {
        res.status(error.statusCode).json(
          createErrorResponse(error.code, error.message)
        );
        return;
      }
      next(error);
    }
  }

  public static async getById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const ownerId = req.user?.id;
      if (!ownerId) {
        res
          .status(401)
          .json(createErrorResponse('UNAUTHENTICATED', 'User identity required.'));
        return;
      }

      const { id } = req.params;
      if (!id || id.trim().length === 0) {
        res
          .status(400)
          .json(createErrorResponse('VALIDATION_ERROR', 'Incident ID is required.'));
        return;
      }

      const incident = await IncidentService.getIncidentById(id, ownerId);
      res.status(200).json(createSuccessResponse(incident));
    } catch (error) {
      if (error instanceof ServiceError) {
        res.status(error.statusCode).json(
          createErrorResponse(error.code, error.message)
        );
        return;
      }
      next(error);
    }
  }

  public static async getReportDraft(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const ownerId = req.user?.id;
      if (!ownerId) {
        res
          .status(401)
          .json(createErrorResponse('UNAUTHENTICATED', 'User identity required.'));
        return;
      }

      const { id } = req.params;
      if (!id || id.trim().length === 0) {
        res
          .status(400)
          .json(createErrorResponse('VALIDATION_ERROR', 'Incident ID is required.'));
        return;
      }

      const draft = await ReportDraftService.generateReportDraft(ownerId, id);
      res.status(200).json(createSuccessResponse(draft));
    } catch (error) {
      if (error instanceof ServiceError) {
        res.status(error.statusCode).json(
          createErrorResponse(error.code, error.message)
        );
        return;
      }
      next(error);
    }
  }
}
