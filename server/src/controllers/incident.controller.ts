import { Request, Response, NextFunction } from 'express';
import { IncidentService, ServiceError } from '../services/incident.service';
import { IncidentRepository } from '../repositories/incident.repository';
import { ReportDraftService } from '../services/reportDraft.service';
import { createSuccessResponse, createErrorResponse } from '../utils/response';
import { formatCsv, createSafeFilename } from '../utils/csvSanitizer';
import { recordActivity } from '../services/activityLog.service';
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

      recordActivity({
        ownerId,
        eventType: 'INCIDENT_CREATED',
        outcome: 'SUCCESS',
        resourceId: incident.id,
        resourceLabel: incident.title.slice(0, 80),
        safeMetadata: { incidentType: incident.incidentType, platform: incident.platform },
      });

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

  public static async delete(
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

      const result = await IncidentService.deleteIncident(id, ownerId);
      recordActivity({ ownerId, eventType: 'INCIDENT_DELETED', outcome: 'SUCCESS', resourceId: id });
      res.status(200).json(createSuccessResponse(result));
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

  public static async exportCsv(
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

      const { startDate, endDate, status, incidentType, platform } = req.query as Record<string, string | undefined>;

      if (startDate && isNaN(Date.parse(startDate))) {
        res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'Invalid startDate format.'));
        return;
      }
      if (endDate && isNaN(Date.parse(endDate))) {
        res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'Invalid endDate format.'));
        return;
      }

      const incidents = await IncidentRepository.findForExport(ownerId, {
        startDate,
        endDate,
        status,
        incidentType,
        platform,
      });

      const headers = [
        { key: 'id', label: 'Incident ID' },
        { key: 'title', label: 'Title' },
        { key: 'incidentType', label: 'Incident Type' },
        { key: 'platform', label: 'Platform' },
        { key: 'status', label: 'Status' },
        { key: 'occurredAt', label: 'Occurred At' },
        { key: 'createdAt', label: 'Reported At' },
        { key: 'identifiers', label: 'Identifiers' },
        { key: 'description', label: 'Description' },
      ];

      const rows = incidents.map((inc) => ({
        id: inc.id,
        title: inc.title,
        incidentType: inc.incidentType,
        platform: inc.platform,
        status: inc.status,
        occurredAt: inc.occurredAt,
        createdAt: inc.createdAt,
        identifiers: (inc.identifiers || []).map((i) => `[${i.type}] ${i.value}`).join('; '),
        description: inc.description || '',
      }));

      const csvContent = formatCsv(headers, rows);
      const filename = createSafeFilename('RakshaSphere_Incidents', undefined, 'csv');

      recordActivity({ ownerId, eventType: 'INCIDENTS_CSV_EXPORTED', outcome: 'SUCCESS', safeMetadata: { rowCount: incidents.length } });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csvContent);
    } catch (error) {
      if (error instanceof ServiceError) {
        res.status(error.statusCode).json(createErrorResponse(error.code, error.message));
        return;
      }
      next(error);
    }
  }
}
