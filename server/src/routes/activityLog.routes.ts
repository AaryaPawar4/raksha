import { Router } from 'express';
import { ActivityLogController } from '../controllers/activityLog.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All activity log endpoints require authentication
router.use(authMiddleware);

// GET /api/v1/activity — List current user's activity log with filters
router.get('/', ActivityLogController.list);

export default router;
