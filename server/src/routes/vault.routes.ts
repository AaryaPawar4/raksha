import { Router } from 'express';
import { VaultController } from '../controllers/vault.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { uploadRateLimiter } from '../middleware/security.middleware';

const router = Router();

// Enforce authentication & tenant identification for all vault endpoints
router.use(authMiddleware);

// POST /api/v1/vault/items — Store encrypted evidence (rate limited)
router.post('/', uploadRateLimiter, VaultController.upload);

// GET /api/v1/vault/items?incidentId=... — List evidence for incident (excludes ciphertext)
router.get('/', VaultController.list);

// GET /api/v1/vault/items/:id — Retrieve encrypted evidence with ciphertext for client-side decryption
router.get('/:id', VaultController.getById);

// POST /api/v1/vault/items/:id/verify — Verify evidence integrity hash
router.post('/:id/verify', VaultController.verify);

// DELETE /api/v1/vault/items/:id — Delete evidence item
router.delete('/:id', VaultController.delete);

export default router;
