import { Request, Response, NextFunction } from 'express';
import { VaultService } from '../services/vault.service';
import { ServiceError } from '../services/incident.service';
import { createSuccessResponse, createErrorResponse } from '../utils/response';
import { uploadEvidenceSchema } from '../validators/vault.validator';
import { AuditLogger } from '../utils/auditLogger';
import { recordActivity } from '../services/activityLog.service';

export class VaultController {
  public static async upload(
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

      const parseResult = uploadEvidenceSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errorDetails = parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        res.status(400).json(
          createErrorResponse(
            'VALIDATION_ERROR',
            'Invalid evidence payload.',
            errorDetails
          )
        );
        return;
      }

      const item = await VaultService.storeEvidence(ownerId, parseResult.data);

      AuditLogger.log({
        eventType: 'VAULT_UPLOAD',
        userId: ownerId,
        resourceId: item.id,
        ip: req.ip,
        success: true,
        metadata: {
          incidentId: item.incidentId,
          mimeType: item.mimeType,
          size: item.size,
        },
      });

      recordActivity({
        ownerId,
        eventType: 'VAULT_UPLOAD',
        outcome: 'SUCCESS',
        resourceId: item.id,
        resourceLabel: item.filename,
        safeMetadata: { mimeType: item.mimeType, size: item.size },
      });

      res.status(201).json(createSuccessResponse(item));
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

      const incidentId = req.query.incidentId as string;
      if (!incidentId || incidentId.trim().length === 0) {
        res.status(400).json(
          createErrorResponse('VALIDATION_ERROR', 'incidentId query parameter is required.')
        );
        return;
      }

      const items = await VaultService.listEvidenceByIncident(ownerId, incidentId.trim());
      res.status(200).json(createSuccessResponse(items));
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
        res.status(400).json(
          createErrorResponse('VALIDATION_ERROR', 'Evidence ID is required.')
        );
        return;
      }

      const item = await VaultService.getEvidenceById(ownerId, id);
      res.status(200).json(createSuccessResponse(item));
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

  public static async verify(
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
        res.status(400).json(
          createErrorResponse('VALIDATION_ERROR', 'Evidence ID is required.')
        );
        return;
      }

      const result = await VaultService.verifyEvidence(ownerId, id);

      AuditLogger.log({
        eventType: 'VAULT_VERIFY',
        userId: ownerId,
        resourceId: id,
        ip: req.ip,
        success: result.integrityStatus === 'VERIFIED',
        metadata: {
          integrityStatus: result.integrityStatus,
        },
      });

      recordActivity({
        ownerId,
        eventType: 'VAULT_VERIFY',
        outcome: result.integrityStatus === 'VERIFIED' ? 'SUCCESS' : 'FAILURE',
        resourceId: id,
        safeMetadata: { integrityStatus: result.integrityStatus },
      });

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
        res.status(400).json(
          createErrorResponse('VALIDATION_ERROR', 'Evidence ID is required.')
        );
        return;
      }

      await VaultService.deleteEvidence(ownerId, id);

      AuditLogger.log({
        eventType: 'VAULT_DELETE',
        userId: ownerId,
        resourceId: id,
        ip: req.ip,
        success: true,
      });

      recordActivity({ ownerId, eventType: 'VAULT_DELETE', outcome: 'SUCCESS', resourceId: id });

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
