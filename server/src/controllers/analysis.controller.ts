import { Request, Response, NextFunction } from 'express';
import { AnalysisService } from '../services/analysis.service';
import { ServiceError } from '../services/incident.service';
import { createSuccessResponse, createErrorResponse } from '../utils/response';
import { analyzeIncidentSchema } from '../validators/analysis.validator';

export class AnalysisController {
  public static async analyze(
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

      const parseResult = analyzeIncidentSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errorDetails = parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        res.status(400).json(
          createErrorResponse(
            'VALIDATION_ERROR',
            'Invalid analysis parameters.',
            errorDetails
          )
        );
        return;
      }

      const result = await AnalysisService.analyzeIncident(
        ownerId,
        id,
        parseResult.data
      );

      res.status(200).json(createSuccessResponse(result));
    } catch (error) {
      if (error instanceof ServiceError) {
        res
          .status(error.statusCode)
          .json(createErrorResponse(error.code, error.message));
        return;
      }
      next(error);
    }
  }
}
