import { Request, Response, NextFunction } from 'express';
import { ThreatLinkService } from '../services/threatlink.service';
import { ServiceError } from '../services/incident.service';
import { createSuccessResponse, createErrorResponse } from '../utils/response';
import { threatLinkFeedbackSchema } from '../validators/threatlink.validator';

export class ThreatLinkController {
  public static async getLinks(
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

      const links = await ThreatLinkService.getLinksForIncident(ownerId, id);
      res.status(200).json(createSuccessResponse(links));
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

  public static async submitFeedback(
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
          .json(createErrorResponse('VALIDATION_ERROR', 'Link ID is required.'));
        return;
      }

      const parseResult = threatLinkFeedbackSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errorDetails = parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        res.status(400).json(
          createErrorResponse(
            'VALIDATION_ERROR',
            'Invalid feedback payload.',
            errorDetails
          )
        );
        return;
      }

      const updated = await ThreatLinkService.updateFeedback(
        ownerId,
        id,
        parseResult.data.disposition
      );

      res.status(200).json(createSuccessResponse(updated));
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
