import express from 'express';
import etfController from '../controllers/etf.controller.js';

const router = express.Router();

router.get('/', etfController.getAll);
router.get('/stats', etfController.getStatistiche);
router.get('/:isin', etfController.getByISIN);
router.get('/:isin/storico', etfController.getStorico);
router.post('/', etfController.create);
router.delete('/:isin', etfController.delete);

export default router;