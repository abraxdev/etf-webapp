import express from 'express';
import currencyController from '../controllers/currency.controller.js';

const router = express.Router();

// GET /api/currency/:ticker - Recupera tasso di conversione
router.get('/:ticker', currencyController.getRate.bind(currencyController));

export default router;
