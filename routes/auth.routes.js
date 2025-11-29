import express from 'express';
import authController from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// POST /api/auth/login - Login
router.post('/login', authController.login.bind(authController));

// POST /api/auth/register - Registrazione
router.post('/register', authController.register.bind(authController));

// POST /api/auth/logout - Logout (protetta)
router.post('/logout', requireAuth, authController.logout.bind(authController));

// GET /api/auth/me - Dati utente corrente (protetta)
router.get('/me', requireAuth, authController.me.bind(authController));

export default router;
