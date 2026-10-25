import { Router } from 'express';
import { IncidentController } from '../controllers/incident.controller';
import { ThreatLinkController } from '../controllers/threatlink.controller';
import { AnalysisController } from '../controllers/analysis.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { analysisRateLimiter } from '../middleware/security.middleware';

const router = Router();

// Enforce authentication & tenant identification for all incident endpoints
router.use(authMiddleware);

// POST /api/v1/incidents — Create new incident
router.post('/', IncidentController.create);

// GET /api/v1/incidents — List current user's incidents
router.get('/', IncidentController.list);

// GET /api/v1/incidents/:id/links — Phase 2: Explainable ThreatLink edges
router.get('/:id/links', ThreatLinkController.getLinks);

// POST /api/v1/incidents/:id/analyze — Phase 3: Rules + consented AI analysis
router.post('/:id/analyze', analysisRateLimiter, AnalysisController.analyze);

// GET /api/v1/incidents/:id/report-draft — Phase 5: Structured complaint draft
router.get('/:id/report-draft', IncidentController.getReportDraft);

// GET /api/v1/incidents/export/csv — Phase D: Authenticated user-scoped CSV export with formula injection defense
router.get('/export/csv', IncidentController.exportCsv);

// GET /api/v1/incidents/:id — Retrieve single incident owned by current user
router.get('/:id', IncidentController.getById);

// DELETE /api/v1/incidents/:id — Delete incident owned by current user
router.delete('/:id', IncidentController.delete);

export default router;
