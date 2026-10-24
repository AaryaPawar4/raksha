import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import routes from './routes';
import { errorHandler } from './middleware/error.middleware';
import { notFoundHandler } from './middleware/notFound.middleware';
import {
  helmetMiddleware,
  corsMiddleware,
  globalRateLimiter,
} from './middleware/security.middleware';
import { env } from './config/env';

export function createApp(): Express {
  const app = express();

  // Configure reverse proxy trust (prevents IP spoofing when false; trusts 1 hop when true)
  if (env.TRUST_PROXY === 'true' || env.TRUST_PROXY === '1') {
    app.set('trust proxy', 1);
  } else {
    app.set('trust proxy', false);
  }

  // 1. HTTP security headers via Helmet
  app.use(helmetMiddleware);

  // 2. Strict origin-verified CORS with credential support
  app.use(corsMiddleware);

  // 3. Global rate limiting
  app.use(globalRateLimiter);

  // 4. Cookie parsing for secure refresh tokens
  app.use(cookieParser());

  // 5. Body parsing middleware with size limits protecting against DoS
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 6. Application routes
  app.use(routes);

  // 7. 404 handler for unmapped routes
  app.use(notFoundHandler);

  // 8. Global centralized error handling middleware
  app.use(errorHandler);

  return app;
}
