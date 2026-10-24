import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';

const router = Router();

// GET /health — Liveness probe
router.get('/', HealthController.getHealth);

// GET /health/ready — Readiness probe with database diagnostics
router.get('/ready', HealthController.getReadiness);

export default router;
