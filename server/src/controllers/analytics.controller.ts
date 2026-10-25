import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { ServiceError } from '../services/incident.service';
import { createSuccessResponse, createErrorResponse } from '../utils/response';
import {
  analyticsSummaryQuerySchema,
  mapPointsQuerySchema,
} from '../validators/analytics.validator';

export class AnalyticsController {
  public static async getSummary(
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

      const parseResult = analyticsSummaryQuerySchema.safeParse(req.query);
      if (!parseResult.success) {
        const errorDetails = parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        res.status(400).json(
          createErrorResponse(
            'VALIDATION_ERROR',
            'Invalid analytics filter query parameters.',
            errorDetails
          )
        );
        return;
      }

      const summary = await AnalyticsService.getSummary(ownerId, parseResult.data);
      res.status(200).json(createSuccessResponse(summary));
    } catch (error) {
      if (error instanceof ServiceError) {
        res.status(error.statusCode).json(createErrorResponse(error.code, error.message));
        return;
      }
      next(error);
    }
  }

  public static async getMapPoints(
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

      const parseResult = mapPointsQuerySchema.safeParse(req.query);
      if (!parseResult.success) {
        const errorDetails = parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        res.status(400).json(
          createErrorResponse(
            'VALIDATION_ERROR',
            'Invalid map points query parameters.',
            errorDetails
          )
        );
        return;
      }

      const mapResponse = await AnalyticsService.getMapPoints(
        ownerId,
        parseResult.data.fuzzLocation
      );
      res.status(200).json(createSuccessResponse(mapResponse));
    } catch (error) {
      if (error instanceof ServiceError) {
        res.status(error.statusCode).json(createErrorResponse(error.code, error.message));
        return;
      }
      next(error);
    }
  }
}
