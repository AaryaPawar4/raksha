import { Request, Response, NextFunction } from 'express';
import { CaseService } from '../services/case.service';
import { ServiceError } from '../services/incident.service';
import { createSuccessResponse, createErrorResponse } from '../utils/response';
import { createCaseSchema, updateCaseSchema } from '../validators/case.validator';

export class CaseController {
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

      const parseResult = createCaseSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errorDetails = parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        res.status(400).json(
          createErrorResponse(
            'VALIDATION_ERROR',
            'Invalid case creation payload.',
            errorDetails
          )
        );
        return;
      }

      const trackedCase = await CaseService.createCase(ownerId, parseResult.data);
      res.status(201).json(createSuccessResponse(trackedCase));
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

      const incidentId = req.query.incidentId as string | undefined;
      const cases = await CaseService.listCases(ownerId, incidentId ? incidentId.trim() : undefined);
      res.status(200).json(createSuccessResponse(cases));
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
          .json(createErrorResponse('VALIDATION_ERROR', 'Case ID is required.'));
        return;
      }

      const trackedCase = await CaseService.getCaseById(ownerId, id);
      res.status(200).json(createSuccessResponse(trackedCase));
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

  public static async update(
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
          .json(createErrorResponse('VALIDATION_ERROR', 'Case ID is required.'));
        return;
      }

      const parseResult = updateCaseSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errorDetails = parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        res.status(400).json(
          createErrorResponse(
            'VALIDATION_ERROR',
            'Invalid case update payload.',
            errorDetails
          )
        );
        return;
      }

      const updated = await CaseService.updateCase(ownerId, id, parseResult.data);
      res.status(200).json(createSuccessResponse(updated));
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
          .json(createErrorResponse('VALIDATION_ERROR', 'Case ID is required.'));
        return;
      }

      await CaseService.deleteCase(ownerId, id);
      res.status(200).json(createSuccessResponse({ deleted: true, id }));
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
