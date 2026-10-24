import { Router } from 'express';
import { ThreatLinkController } from '../controllers/threatlink.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Enforce authentication & tenant identification for all threat-link endpoints
router.use(authMiddleware);

// POST /api/v1/threat-links/:id/feedback — Phase 2: Dismiss or confirm relevance
router.post('/:id/feedback', ThreatLinkController.submitFeedback);

export default router;
