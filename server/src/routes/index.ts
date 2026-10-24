import { Router } from 'express';
import healthRoutes from './health.routes';

const router = Router();

// Phase 0 health endpoint: GET /health
router.use('/health', healthRoutes);

// Base router placeholder for Phase 1+ endpoints (/api/v1)
export default router;
