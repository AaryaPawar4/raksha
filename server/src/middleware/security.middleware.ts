import rateLimit from 'express-rate-limit';
import cors from 'cors';
import helmet from 'helmet';
import { env } from '../config/env';
import { createErrorResponse } from '../utils/response';

// 1. Explicit CORS configuration with strict origin validation
const allowedOrigins = [env.CLIENT_URL, env.CORS_ORIGIN].filter(Boolean);

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server, or test suites)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked request from origin: ${origin}`));
  },
  credentials: true, // Allow cookies and authorization headers
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-demo-user-id'],
  exposedHeaders: ['X-Raksha-Auth-Mode'],
  maxAge: 86400, // 24 hours
});

// 2. Helmet HTTP Security Headers
export const helmetMiddleware = helmet({
  contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false, // In dev Vite may inject inline scripts
  crossOriginEmbedderPolicy: false,
  xFrameOptions: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

// Helper for rate limit error response
const rateLimitHandler = (message: string) => {
  return (_req: unknown, res: any) => {
    res.status(429).json(createErrorResponse('RATE_LIMITED', message));
  };
};

// 3. Global API Rate Limiter
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'test' ? 10000 : env.RATE_LIMIT_GLOBAL_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many requests from this IP, please try again after 15 minutes.'),
});

// 4. Strict Auth Rate Limiter (Brute-force protection for login/register)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'test' ? 1000 : env.RATE_LIMIT_AUTH_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many authentication attempts. Please try again after 15 minutes.'),
});

// 5. Expensive Resource Rate Limiters (Analysis & Upload)
export const analysisRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'test' ? 1000 : env.RATE_LIMIT_ANALYSIS_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Analysis rate limit exceeded. Please wait before analyzing more incidents.'),
});

export const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'test' ? 1000 : env.RATE_LIMIT_UPLOAD_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Evidence upload rate limit exceeded. Please wait before uploading more files.'),
});
