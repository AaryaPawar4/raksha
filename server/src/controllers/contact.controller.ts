import { Request, Response, NextFunction } from 'express';
import { ContactService } from '../services/contact.service';
import { ServiceError } from '../services/incident.service';
import { createSuccessResponse, createErrorResponse } from '../utils/response';
import {
  createContactSchema,
  updateContactSchema,
  updateConsentSchema,
} from '../validators/checkin.validator';

export class ContactController {
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

      const parseResult = createContactSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errorDetails = parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        res
          .status(400)
          .json(createErrorResponse('VALIDATION_ERROR', 'Invalid contact payload.', errorDetails));
        return;
      }

      const contact = await ContactService.createContact(ownerId, parseResult.data);
      res.status(201).json(createSuccessResponse(contact));
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

      const contacts = await ContactService.listContacts(ownerId);
      res.status(200).json(createSuccessResponse(contacts));
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
      const contact = await ContactService.getContact(ownerId, id);
      res.status(200).json(createSuccessResponse(contact));
    } catch (error) {
      if (error instanceof ServiceError) {
        res.status(error.statusCode).json(createErrorResponse(error.code, error.message));
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
        res.status(401).json(createErrorResponse('UNAUTHENTICATED', 'User identity required.'));
        return;
      }

      const parseResult = updateContactSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errorDetails = parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        res
          .status(400)
          .json(createErrorResponse('VALIDATION_ERROR', 'Invalid update payload.', errorDetails));
        return;
      }

      const { id } = req.params;
      const contact = await ContactService.updateContact(ownerId, id, parseResult.data);
      res.status(200).json(createSuccessResponse(contact));
    } catch (error) {
      if (error instanceof ServiceError) {
        res.status(error.statusCode).json(createErrorResponse(error.code, error.message));
        return;
      }
      next(error);
    }
  }

  public static async updateConsent(
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

      const parseResult = updateConsentSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errorDetails = parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        res
          .status(400)
          .json(createErrorResponse('VALIDATION_ERROR', 'Invalid consent payload.', errorDetails));
        return;
      }

      const { id } = req.params;
      const contact = await ContactService.updateConsent(ownerId, id, parseResult.data.consentStatus);
      res.status(200).json(createSuccessResponse(contact));
    } catch (error) {
      if (error instanceof ServiceError) {
        res.status(error.statusCode).json(createErrorResponse(error.code, error.message));
        return;
      }
      next(error);
    }
  }

  public static async deleteContact(
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
      await ContactService.deleteContact(ownerId, id);
      res.status(200).json(createSuccessResponse({ deleted: true }));
    } catch (error) {
      if (error instanceof ServiceError) {
        res.status(error.statusCode).json(createErrorResponse(error.code, error.message));
        return;
      }
      next(error);
    }
  }
}
