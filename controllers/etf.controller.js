import dbService from '../services/database.service.js';

class ETFController {
  async getAll(req, res) {
    try {
      const result = await dbService.getAllETF();
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  async getByISIN(req, res) {
    try {
      const { isin } = req.params;
      const result = await dbService.getETFByISIN(isin);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  async create(req, res) {
    try {
      const { isin, ticker, tipologia, qty } = req.body;

      console.log("📝 Controller - Dati ricevuti:", { isin, ticker, tipologia, qty });
      console.log("📝 Controller - Tipo qty:", typeof qty);

      if (!isin || !isin.match(/^[A-Z]{2}[A-Z0-9]{10}$/)) {
        return res.status(400).json({
          success: false,
          error: 'ISIN non valido'
        });
      }

      if (!ticker || ticker.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Ticker obbligatorio'
        });
      }

      if (!tipologia || !['ETF', 'Stock'].includes(tipologia)) {
        return res.status(400).json({
          success: false,
          error: 'Tipologia non valida. Valori ammessi: ETF, Stock'
        });
      }

      if (!qty || qty.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Quantità obbligatoria'
        });
      }

      console.log("✅ Controller - Validazione completata, qty:", qty);
      const result = await dbService.createETF(isin, ticker.trim().toUpperCase(), tipologia, qty);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  async delete(req, res) {
    try {
      const { isin } = req.params;
      const result = await dbService.deleteETF(isin);
      
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

  async getStorico(req, res) {
    try {
      const { isin } = req.params;
      const limite = parseInt(req.query.limite) || 30;
      
      const result = await dbService.getStoricoRendite(isin, limite);
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  async getStatistiche(req, res) {
    try {
      const result = await dbService.getStatistiche();
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
}

export default new ETFController();