const express = require('express');
const router = express.Router();
const scraperController = require('../controllers/scraper.controller');

router.post('/run', scraperController.scrapeAll);
router.post('/run/:isin', scraperController.scrapeOne);

module.exports = router;