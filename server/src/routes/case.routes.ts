import { Router } from 'express';
import { CaseController } from '../controllers/case.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Enforce authentication & tenant identification for all case endpoints
router.use(authMiddleware);

// POST /api/v1/cases — Create tracked case
router.post('/', CaseController.create);

// GET /api/v1/cases — List user's tracked cases (optional ?incidentId=...)
router.get('/', CaseController.list);

// GET /api/v1/cases/:id — Retrieve single tracked case
router.get('/:id', CaseController.getById);

// PATCH /api/v1/cases/:id — Update case status, reference number, notes
router.patch('/:id', CaseController.update);

// DELETE /api/v1/cases/:id — Delete tracked case
router.delete('/:id', CaseController.delete);

export default router;
