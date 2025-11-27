import express from 'express';
import scraperController from '../controllers/scraper.controller.js';

const router = express.Router();

// JustETF scraping (ora include anche Yahoo Finance)
router.post('/run', scraperController.scrapeAll);
router.post('/run/:isin', scraperController.scrapeOne);

// Yahoo Finance scraping indipendente
router.post('/yahoo/run', scraperController.scrapeYahooAll);
router.post('/yahoo/run/:isin', scraperController.scrapeYahooOne);

export default router;