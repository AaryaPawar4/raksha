import { Request, Response } from 'express';
import { createErrorResponse } from '../utils/response';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json(
    createErrorResponse(
      'NOT_FOUND',
      `Resource not found: ${req.method} ${req.path}`
    )
  );
}
