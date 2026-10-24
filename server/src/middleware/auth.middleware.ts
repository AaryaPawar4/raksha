import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { createErrorResponse } from '../utils/response';
import { verifyAccessToken } from '../utils/token';

export interface AuthenticatedUser {
  id: string;
  role?: string;
  email?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // 1. Verify standard Authorization: Bearer <jwt> token across all environments
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) {
      try {
        const payload = verifyAccessToken(token);
        req.user = { id: payload.sub, email: payload.email, role: 'user' };
        res.setHeader('X-Raksha-Auth-Mode', 'jwt');
        return next();
      } catch {
        res.status(401).json(
          createErrorResponse(
            'UNAUTHENTICATED',
            'Invalid or expired access token.'
          )
        );
        return;
      }
    }
  }

  // 2. Strict production security boundary: demo headers are NEVER accepted in production
  if (env.NODE_ENV === 'production') {
    res.status(401).json(
      createErrorResponse(
        'UNAUTHENTICATED',
        'Authentication required. Please provide a valid Bearer access token.'
      )
    );
    return;
  }

  // 3. Development and Test mode only:
  // Tenant isolation via explicit demo user header
  const demoUserHeader = req.headers['x-demo-user-id'];
  if (typeof demoUserHeader === 'string' && demoUserHeader.trim().length > 0) {
    req.user = { id: demoUserHeader.trim() };
    res.setHeader('X-Raksha-Auth-Mode', 'demo-custom');
    return next();
  }

  // Development fallback to safe isolated demo account
  req.user = { id: 'demo-user-default' };
  res.setHeader('X-Raksha-Auth-Mode', 'demo-default');
  next();
}
