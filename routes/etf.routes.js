const express = require('express');
const router = express.Router();
const etfController = require('../controllers/etf.controller');

router.get('/', etfController.getAll);
router.get('/stats', etfController.getStatistiche);
router.get('/:isin', etfController.getByISIN);
router.get('/:isin/storico', etfController.getStorico);
router.post('/', etfController.create);
router.delete('/:isin', etfController.delete);

module.exports = router;