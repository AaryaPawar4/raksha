import { Request, Response, NextFunction } from 'express';
import { createErrorResponse } from '../utils/response';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Safe logging: log error message without sensitive payload
  console.error(`[Error] ${err.name}: ${err.message}`);

  // Never expose raw stack traces in responses
  res.status(500).json(
    createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected internal server error occurred.'
    )
  );
}
