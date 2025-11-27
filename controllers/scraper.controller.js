const scraperService = require('../services/scraper.service');
const dbService = require('../services/database.service');

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
      // Avvia scraping in background
      res.json({ 
        success: true, 
        message: 'Scraping avviato in background' 
      });

      // Esegui scraping
      const result = await scraperService.scrapeAllETF();
      console.log('✅ Scraping completato:', result);
      
    } catch (error) {
      console.error('❌ Errore scraping:', error);
    }
  }
}

module.exports = new ScraperController();