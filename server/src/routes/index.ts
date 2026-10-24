import { Router } from 'express';
import healthRoutes from './health.routes';
import incidentRoutes from './incident.routes';
import threatLinkRoutes from './threatlink.routes';
import vaultRoutes from './vault.routes';
import caseRoutes from './case.routes';
import contactRoutes from './contact.routes';
import checkinRoutes from './checkin.routes';
import authRoutes from './auth.routes';
import { authRateLimiter } from '../middleware/security.middleware';

const router = Router();

// Phase 0 health endpoint: GET /health
router.use('/health', healthRoutes);

// Phase 7 Authentication endpoints: /api/v1/auth
router.use('/api/v1/auth', authRateLimiter, authRoutes);

// Phase 1 API endpoints: /api/v1/incidents
router.use('/api/v1/incidents', incidentRoutes);

// Phase 2 API endpoints: /api/v1/threat-links
router.use('/api/v1/threat-links', threatLinkRoutes);

// Phase 4 API endpoints: /api/v1/vault/items
router.use('/api/v1/vault/items', vaultRoutes);

// Phase 5 API endpoints: /api/v1/cases
router.use('/api/v1/cases', caseRoutes);

// Phase 6 API endpoints: /api/v1/contacts, /api/v1/check-ins
router.use('/api/v1/contacts', contactRoutes);
router.use('/api/v1/check-ins', checkinRoutes);

export default router;


