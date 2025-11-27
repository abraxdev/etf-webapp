import scraperService from '../services/scraper.service.js';
import yahooService from '../services/yahoo.service.js';
import dbService from '../services/database.service.js';

class ScraperController {
  async scrapeOne(req, res) {
    try {
      const { isin } = req.params;
      
      if (!isin || !isin.match(/^[A-Z]{2}[A-Z0-9]{10}$/)) {
        return res.status(400).json({ 
          success: false, 
          error: 'ISIN non valido' 
        });
      }

      // Verifica che sia un ETF e non una Stock
      const etfResult = await dbService.getETFByISIN(isin);
      
      if (!etfResult.success) {
        return res.status(404).json({ 
          success: false, 
          error: 'ISIN non trovato nel database' 
        });
      }

      if (etfResult.data.tipologia === 'Stock') {
        return res.status(400).json({ 
          success: false, 
          error: 'Non è possibile scrapare le Stock. Solo gli ETF possono essere aggiornati da JustETF.' 
        });
      }

      // Esegui scraping
      const result = await scraperService.scrapeETF(isin);
      
      if (!result.success) {
        return res.status(400).json(result);
      }

      // Salva i dati nel database
      try {
        // Aggiorna dati ETF (ticker rimane quello inserito manualmente)
        await dbService.updateETF(isin, {
          nome: result.nome,
          emittente: result.emittente,
          div_yield: parseFloat(result.rendita_percentuale.replace('%', '').replace(',', '.')).toFixed(2)
        });

        // Salva rendita
        await dbService.salvaRendita(result);

        console.log(`✅ Dati salvati per ${isin}: ${result.rendita_percentuale}`);
      } catch (dbError) {
        console.error(`❌ Errore salvataggio dati ${isin}:`, dbError);
        return res.status(500).json({
          success: false,
          error: 'Dati estratti ma errore nel salvataggio: ' + dbError.message,
          data: result
        });
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  async scrapeAll(req, res) {
    try {
      // Avvia scraping JustETF in background (SOLO JustETF, senza Yahoo)
      res.json({
        success: true,
        message: 'Scraping JustETF avviato in background'
      });

      // Esegui SOLO scraping JustETF
      console.log('🚀 Scraping JustETF avviato...');
      const justEtfResult = await scraperService.scrapeAllETF();
      console.log('✅ Scraping JustETF completato:', justEtfResult);

    } catch (error) {
      console.error('❌ Errore scraping JustETF:', error);
    }
  }

  async scrapeYahooAll(req, res) {
    try {
      // Avvia scraping Yahoo Finance in background
      res.json({
        success: true,
        message: 'Scraping Yahoo Finance avviato in background'
      });

      // Esegui scraping Yahoo Finance
      const result = await yahooService.updateAllTitles();
      console.log('✅ Scraping Yahoo Finance completato:', result);

    } catch (error) {
      console.error('❌ Errore scraping Yahoo Finance:', error);
    }
  }

  async scrapeYahooOne(req, res) {
    try {
      const { isin } = req.params;

      if (!isin || !isin.match(/^[A-Z]{2}[A-Z0-9]{10}$/)) {
        return res.status(400).json({
          success: false,
          error: 'ISIN non valido'
        });
      }

      // Esegui scraping Yahoo Finance per singolo titolo
      const result = await yahooService.updateSingleTitle(isin);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export default new ScraperController();