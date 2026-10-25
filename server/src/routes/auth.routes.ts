import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Public auth endpoints
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refresh);

// Protected auth endpoints
router.post('/logout', authMiddleware, AuthController.logout);
router.get('/me', authMiddleware, AuthController.me);
router.post('/verify-email/request', authMiddleware, AuthController.requestEmailVerification);
router.post('/verify-email/confirm', authMiddleware, AuthController.confirmEmailVerification);

export default router;
