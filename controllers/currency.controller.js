import dbService from '../services/database.service.js';

class CurrencyController {
  /**
   * GET /api/currency/:ticker
   * Recupera il tasso di conversione per un ticker specifico
   */
  async getRate(req, res) {
    try {
      const { ticker } = req.params;

      if (!ticker) {
        return res.status(400).json({
          success: false,
          error: 'Ticker richiesto'
        });
      }

      console.log(`💱 Richiesta tasso conversione per: ${ticker}`);
      const result = await dbService.getCurrencyRate(ticker);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: `Tasso di conversione non trovato per ${ticker}`
        });
      }

      res.json({
        success: true,
        ticker: ticker,
        rate: result.data
      });
    } catch (error) {
      console.error('❌ Errore recupero tasso conversione:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export default new CurrencyController();
