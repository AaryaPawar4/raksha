import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Strict authentication enforced for all analytics endpoints
router.use(authMiddleware);

// GET /api/v1/analytics/summary — Authorized aggregate metrics & trends
router.get('/summary', AnalyticsController.getSummary);

// GET /api/v1/analytics/map-points — Consented, privacy-fuzzed safety coordinates
router.get('/map-points', AnalyticsController.getMapPoints);

export default router;
