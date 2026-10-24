import { Request, Response, NextFunction } from 'express';
import { CheckInService } from '../services/checkin.service';
import { ServiceError } from '../services/incident.service';
import { createSuccessResponse, createErrorResponse } from '../utils/response';
import { createCheckInSchema } from '../validators/checkin.validator';
import { AuditLogger } from '../utils/auditLogger';

export class CheckInController {
  public static async create(
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

      const parseResult = createCheckInSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errorDetails = parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        res
          .status(400)
          .json(createErrorResponse('VALIDATION_ERROR', 'Invalid check-in payload.', errorDetails));
        return;
      }

      const checkIn = await CheckInService.createCheckIn(ownerId, parseResult.data);

      AuditLogger.log({
        eventType: 'CHECKIN_CREATED',
        userId: ownerId,
        resourceId: checkIn.id,
        ip: req.ip,
        success: true,
        metadata: {
          locationSharingEnabled: checkIn.locationSharingEnabled,
          deliveryState: checkIn.deliveryState,
        },
      });

      res.status(201).json(createSuccessResponse(checkIn));
    } catch (error) {
      if (error instanceof ServiceError) {
        res.status(error.statusCode).json(createErrorResponse(error.code, error.message));
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
        res.status(401).json(createErrorResponse('UNAUTHENTICATED', 'User identity required.'));
        return;
      }

      const checkIns = await CheckInService.listCheckIns(ownerId);
      res.status(200).json(createSuccessResponse(checkIns));
    } catch (error) {
      if (error instanceof ServiceError) {
        res.status(error.statusCode).json(createErrorResponse(error.code, error.message));
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
        res.status(401).json(createErrorResponse('UNAUTHENTICATED', 'User identity required.'));
        return;
      }

      const { id } = req.params;
      const checkIn = await CheckInService.getCheckIn(ownerId, id);
      res.status(200).json(createSuccessResponse(checkIn));
    } catch (error) {
      if (error instanceof ServiceError) {
        res.status(error.statusCode).json(createErrorResponse(error.code, error.message));
        return;
      }
      next(error);
    }
  }

  public static async complete(
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

      const { id } = req.params;
      const checkIn = await CheckInService.completeCheckIn(ownerId, id);

      AuditLogger.log({
        eventType: 'CHECKIN_COMPLETED',
        userId: ownerId,
        resourceId: checkIn.id,
        ip: req.ip,
        success: true,
      });

      res.status(200).json(createSuccessResponse(checkIn));
    } catch (error) {
      if (error instanceof ServiceError) {
        res.status(error.statusCode).json(createErrorResponse(error.code, error.message));
        return;
      }
      next(error);
    }
  }

  public static async cancel(
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

      const { id } = req.params;
      const checkIn = await CheckInService.cancelCheckIn(ownerId, id);

      AuditLogger.log({
        eventType: 'CHECKIN_CANCELLED',
        userId: ownerId,
        resourceId: checkIn.id,
        ip: req.ip,
        success: true,
      });

      res.status(200).json(createSuccessResponse(checkIn));
    } catch (error) {
      if (error instanceof ServiceError) {
        res.status(error.statusCode).json(createErrorResponse(error.code, error.message));
        return;
      }
      next(error);
    }
  }

  public static async acknowledgeDelivery(
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

      const { id } = req.params;
      const checkIn = await CheckInService.acknowledgeDelivery(ownerId, id);
      res.status(200).json(createSuccessResponse(checkIn));
    } catch (error) {
      if (error instanceof ServiceError) {
        res.status(error.statusCode).json(createErrorResponse(error.code, error.message));
        return;
      }
      next(error);
    }
  }
}
