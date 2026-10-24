import { Router } from 'express';
import { CheckInController } from '../controllers/checkin.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All check-in endpoints require authentication
router.use(authMiddleware);

// POST /api/v1/check-ins — Create a new check-in
router.post('/', CheckInController.create);

// GET /api/v1/check-ins — List all check-ins for current user
router.get('/', CheckInController.list);

// GET /api/v1/check-ins/:id — Get a single check-in
router.get('/:id', CheckInController.getById);

// POST /api/v1/check-ins/:id/complete — Mark safe arrival
router.post('/:id/complete', CheckInController.complete);

// POST /api/v1/check-ins/:id/cancel — Cancel a check-in
router.post('/:id/cancel', CheckInController.cancel);

// POST /api/v1/check-ins/:id/acknowledge-delivery — Acknowledge opened in external app
router.post('/:id/acknowledge-delivery', CheckInController.acknowledgeDelivery);

export default router;
