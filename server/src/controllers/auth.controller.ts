import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { ServiceError } from '../services/incident.service';
import { createSuccessResponse, createErrorResponse } from '../utils/response';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validators/auth.validator';
import { env } from '../config/env';
import { AuditLogger } from '../utils/auditLogger';

const REFRESH_COOKIE_NAME = 'raksha_refresh_token';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getCookieOptions() {
  const isProd = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
    path: '/api/v1/auth',
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  };
}

export class AuthController {
  public static async register(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const parseResult = registerSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errorDetails = parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        res
          .status(400)
          .json(createErrorResponse('VALIDATION_ERROR', 'Invalid registration payload.', errorDetails));
        return;
      }

      const { user, accessToken, refreshToken } = await AuthService.register(parseResult.data);

      AuditLogger.log({
        eventType: 'AUTH_REGISTER',
        userId: user.id,
        ip: req.ip,
        success: true,
      });

      res.cookie(REFRESH_COOKIE_NAME, refreshToken, getCookieOptions());
      res.status(201).json(
        createSuccessResponse({
          user,
          accessToken,
          refreshToken: env.NODE_ENV !== 'production' ? refreshToken : undefined,
        })
      );
    } catch (error) {
      AuditLogger.log({
        eventType: 'AUTH_LOGIN_FAILURE',
        ip: req.ip,
        success: false,
      });
      if (error instanceof ServiceError) {
        res.status(error.statusCode).json(createErrorResponse(error.code, error.message));
        return;
      }
      next(error);
    }
  }

  public static async login(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const parseResult = loginSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errorDetails = parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        res
          .status(400)
          .json(createErrorResponse('VALIDATION_ERROR', 'Invalid login payload.', errorDetails));
        return;
      }

      const { user, accessToken, refreshToken } = await AuthService.login(parseResult.data);

      AuditLogger.log({
        eventType: 'AUTH_LOGIN_SUCCESS',
        userId: user.id,
        ip: req.ip,
        success: true,
      });

      res.cookie(REFRESH_COOKIE_NAME, refreshToken, getCookieOptions());
      res.status(200).json(
        createSuccessResponse({
          user,
          accessToken,
          refreshToken: env.NODE_ENV !== 'production' ? refreshToken : undefined,
        })
      );
    } catch (error) {
      AuditLogger.log({
        eventType: 'AUTH_LOGIN_FAILURE',
        ip: req.ip,
        success: false,
      });
      if (error instanceof ServiceError) {
        res.status(error.statusCode).json(createErrorResponse(error.code, error.message));
        return;
      }
      next(error);
    }
  }

  public static async refresh(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const rawRefreshToken =
        req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;

      if (!rawRefreshToken) {
        res
          .status(401)
          .json(createErrorResponse('UNAUTHENTICATED', 'No refresh token provided.'));
        return;
      }

      const { user, accessToken, refreshToken } = await AuthService.refresh(rawRefreshToken);

      res.cookie(REFRESH_COOKIE_NAME, refreshToken, getCookieOptions());
      res.status(200).json(
        createSuccessResponse({
          user,
          accessToken,
          refreshToken: env.NODE_ENV !== 'production' ? refreshToken : undefined,
        })
      );
    } catch (error) {
      AuditLogger.log({
        eventType: 'AUTH_LOGIN_FAILURE',
        ip: req.ip,
        success: false,
      });
      if (error instanceof ServiceError) {
        res.status(error.statusCode).json(createErrorResponse(error.code, error.message));
        return;
      }
      next(error);
    }
  }

  public static async logout(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const rawRefreshToken =
        req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
      const userId = req.user?.id;

      await AuthService.logout(rawRefreshToken, userId);

      res.clearCookie(REFRESH_COOKIE_NAME, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/api/v1/auth',
      });

      res.status(200).json(createSuccessResponse({ message: 'Successfully logged out.' }));
    } catch (error) {
      AuditLogger.log({
        eventType: 'AUTH_LOGIN_FAILURE',
        ip: req.ip,
        success: false,
      });
      if (error instanceof ServiceError) {
        res.status(error.statusCode).json(createErrorResponse(error.code, error.message));
        return;
      }
      next(error);
    }
  }

  public static async me(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json(createErrorResponse('UNAUTHENTICATED', 'User identity required.'));
        return;
      }

      const user = await AuthService.getCurrentUser(userId);
      res.status(200).json(createSuccessResponse(user));
    } catch (error) {
      AuditLogger.log({
        eventType: 'AUTH_LOGIN_FAILURE',
        ip: req.ip,
        success: false,
      });
      if (error instanceof ServiceError) {
        res.status(error.statusCode).json(createErrorResponse(error.code, error.message));
        return;
      }
      next(error);
    }
  }
}
