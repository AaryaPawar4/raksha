import { Request, Response, NextFunction } from 'express';
import { CaseService } from '../services/case.service';
import { PdfDossierService } from '../services/pdfDossier.service';
import { ServiceError } from '../services/incident.service';
import { createSuccessResponse, createErrorResponse } from '../utils/response';
import { formatCsv, createSafeFilename } from '../utils/csvSanitizer';
import { recordActivity } from '../services/activityLog.service';
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
      recordActivity({
        ownerId,
        eventType: 'CASE_CREATED',
        outcome: 'SUCCESS',
        resourceId: trackedCase.id,
        resourceLabel: trackedCase.referenceNumber,
        safeMetadata: { reportingChannel: trackedCase.reportingChannel },
      });
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
      recordActivity({
        ownerId,
        eventType: 'CASE_UPDATED',
        outcome: 'SUCCESS',
        resourceId: id,
        resourceLabel: updated.referenceNumber,
        safeMetadata: { status: updated.status },
      });
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
      recordActivity({ ownerId, eventType: 'CASE_DELETED', outcome: 'SUCCESS', resourceId: id });
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

  public static async exportPdf(
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

      const { includeEvidenceDigest, includeComplaintDraft } = req.body || {};

      const { buffer, filename } = await PdfDossierService.generateCasePdf(
        ownerId,
        id,
        {
          includeEvidenceDigest:
            includeEvidenceDigest === undefined ? true : Boolean(includeEvidenceDigest),
          includeComplaintDraft:
            includeComplaintDraft === undefined ? true : Boolean(includeComplaintDraft),
        }
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      recordActivity({ ownerId, eventType: 'CASE_PDF_EXPORTED', outcome: 'SUCCESS', resourceId: id });
      res.status(200).send(buffer);
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

      const { status, reportingChannel } = req.query as Record<string, string | undefined>;
      const cases = await CaseService.listCases(ownerId);

      const filtered = cases.filter((c) => {
        if (status && c.status !== status) return false;
        if (reportingChannel && c.reportingChannel.toLowerCase() !== reportingChannel.toLowerCase()) return false;
        return true;
      });

      const headers = [
        { key: 'id', label: 'Case ID' },
        { key: 'referenceNumber', label: 'Reference Number' },
        { key: 'reportingChannel', label: 'Reporting Channel' },
        { key: 'status', label: 'Status' },
        { key: 'incidentId', label: 'Linked Incident ID' },
        { key: 'verificationBadge', label: 'Verification Badge' },
        { key: 'followUpAt', label: 'Follow Up At' },
        { key: 'createdAt', label: 'Created At' },
        { key: 'notes', label: 'Notes' },
      ];

      const rows = filtered.map((c) => ({
        id: c.id,
        referenceNumber: c.referenceNumber,
        reportingChannel: c.reportingChannel,
        status: c.status,
        incidentId: c.incidentId,
        verificationBadge: c.verificationBadge,
        followUpAt: c.followUpAt || '',
        createdAt: c.createdAt,
        notes: c.notes || '',
      }));

      const csvContent = formatCsv(headers, rows);
      const filename = createSafeFilename('RakshaSphere_Cases', undefined, 'csv');

      recordActivity({ ownerId, eventType: 'CASES_CSV_EXPORTED', outcome: 'SUCCESS', safeMetadata: { rowCount: filtered.length } });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csvContent);
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
