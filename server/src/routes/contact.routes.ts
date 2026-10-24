import { Router } from 'express';
import { ContactController } from '../controllers/contact.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All contact endpoints require authentication
router.use(authMiddleware);

// POST /api/v1/contacts — Create a new trusted contact
router.post('/', ContactController.create);

// GET /api/v1/contacts — List all contacts for current user
router.get('/', ContactController.list);

// GET /api/v1/contacts/:id — Get a single contact
router.get('/:id', ContactController.getById);

// PATCH /api/v1/contacts/:id/consent — Update consent status
router.patch('/:id/consent', ContactController.updateConsent);

// PATCH /api/v1/contacts/:id — Update contact details
router.patch('/:id', ContactController.update);

// DELETE /api/v1/contacts/:id — Delete a contact
router.delete('/:id', ContactController.deleteContact);

export default router;
