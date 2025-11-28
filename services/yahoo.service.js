import dbService from './database.service.js';
import YahooFinance from 'yahoo-finance2';

// Inizializza l'istanza di YahooFinance (richiesto in v3+)
const yahooFinance = new YahooFinance();

class YahooFinanceService {
  /**
   * Recupera dati da Yahoo Finance per un singolo ticker
   * @param {string} ticker - Il simbolo ticker (es. "AAPL", "VWCE.DE")
   * @returns {Object} - Dati del titolo con prezzo e dividend yield
   */
  async getQuoteData(ticker) {
    try {
      // Usa quoteSummary con la sintassi corretta per v3
      const result = await yahooFinance.quoteSummary(ticker, {
        modules: ['price', 'summaryDetail']
      });

      if (!result) {
        return {
          success: false,
          error: 'Nessun dato trovato per questo ticker'
        };
      }

      // Estrai i dati dalla risposta
      const price = result.price || {};
      const summaryDetail = result.summaryDetail || {};

      // Log raw data for debugging
      console.log(`📊 Yahoo Finance RAW data for ${ticker}:`);
      console.log(`   - currency: ${price.currency}`);
      console.log(`   - currentPrice: ${price.regularMarketPrice}`);
      console.log(`   - dividendYield (FORWARD): ${summaryDetail.dividendYield}`);
      console.log(`   - trailingAnnualDividendYield: ${summaryDetail.trailingAnnualDividendYield}`);
      console.log(`   - dividendRate: ${summaryDetail.dividendRate}`);

      // Usa FORWARD dividend yield come valore primario
      let dividendYield = null;

      // Priorità 1: Forward dividend yield
      if (summaryDetail.dividendYield !== undefined && summaryDetail.dividendYield !== null) {
        const rawValue = summaryDetail.dividendYield;
        // Yahoo Finance restituisce questo come decimale (0.0369 = 3.69%)
        if (rawValue < 1.0) {
          dividendYield = (rawValue * 100).toFixed(2);
        } else {
          console.warn(`⚠️  ${ticker}: Valore forward dividend yield insolito: ${rawValue}`);
          dividendYield = rawValue.toFixed(2);
        }
        console.log(`   ✓ Usando FORWARD dividend yield: ${dividendYield}%`);
      }
      // Fallback: Trailing dividend yield se forward non disponibile
      else if (summaryDetail.trailingAnnualDividendYield !== undefined && summaryDetail.trailingAnnualDividendYield !== null) {
        const rawValue = summaryDetail.trailingAnnualDividendYield;
        if (rawValue < 1.0) {
          dividendYield = (rawValue * 100).toFixed(2);
        } else {
          console.warn(`⚠️  ${ticker}: Valore trailing dividend yield insolito: ${rawValue}`);
          dividendYield = rawValue.toFixed(2);
        }
        console.log(`   ⚠️  Usando TRAILING dividend yield (forward non disponibile): ${dividendYield}%`);
      }

      const data = {
        ticker: ticker,
        name: price.longName || price.shortName || null,
        currentPrice: price.regularMarketPrice || null,
        currency: price.currency || null,
        dividendYield: dividendYield
      };

      console.log(`   → Dividend yield finale: ${dividendYield}%\n`);

      return {
        success: true,
        data
      };

    } catch (error) {
      console.error(`❌ Errore Yahoo Finance per ${ticker}:`, error.message);
      return {
        success: false,
        error: error.message,
        ticker
      };
    }
  }

  /**
   * Aggiorna tutti i titoli dal database con dati Yahoo Finance
   * @returns {Object} - Risultato dell'operazione con statistiche
   */
  async updateAllTitles() {
    const risultati = [];

    // Recupera tutti i titoli dal database
    const { success, data: allTitles } = await dbService.getAllETF();

    if (!success || !allTitles || allTitles.length === 0) {
      return {
        success: false,
        error: 'Nessun titolo da processare'
      };
    }

    console.log(`📊 Trovati ${allTitles.length} titoli da aggiornare con Yahoo Finance`);

    for (const item of allTitles) {
      if (!item.ticker) {
        console.log(`⚠️  Saltato ${item.isin}: ticker mancante`);
        risultati.push({
          success: false,
          isin: item.isin,
          error: 'Ticker mancante'
        });
        continue;
      }

      console.log(`📊 Yahoo Finance: ${item.ticker} (${item.tipologia})...`);

      const risultato = await this.getQuoteData(item.ticker);

      if (risultato.success) {
        const datiAggiornamento = {};

        // Per Stock: aggiorna nome, div_yield
        if (item.tipologia === 'Stock') {
          if (risultato.data.name) {
            datiAggiornamento.nome = risultato.data.name;
          }
          if (risultato.data.dividendYield !== null) {
            console.log(risultato.data.dividendYield);
            datiAggiornamento.div_yield = risultato.data.dividendYield;
          }
        }

        // Per tutti (ETF e Stock): aggiorna last_price e currency
        if (risultato.data.currentPrice !== null) {
          datiAggiornamento.last_price = risultato.data.currentPrice;
        }

        if (risultato.data.currency !== null) {
          datiAggiornamento.currency = risultato.data.currency;
        }

        // Aggiorna il database
        if (Object.keys(datiAggiornamento).length > 0) {
          const updateResult = await dbService.updateETF(item.isin, datiAggiornamento);

          if (updateResult.success) {
            console.log(`✅ ${item.ticker}: aggiornato con successo`);
            risultati.push({
              success: true,
              isin: item.isin,
              ticker: item.ticker,
              tipologia: item.tipologia,
              datiAggiornati: datiAggiornamento
            });
          } else {
            console.error(`❌ ${item.ticker}: errore aggiornamento DB`);
            risultati.push({
              success: false,
              isin: item.isin,
              ticker: item.ticker,
              error: 'Errore aggiornamento database'
            });
          }
        } else {
          console.log(`⚠️  ${item.ticker}: nessun dato da aggiornare`);
          risultati.push({
            success: false,
            isin: item.isin,
            ticker: item.ticker,
            error: 'Nessun dato disponibile'
          });
        }
      } else {
        console.error(`❌ ${item.ticker}: ${risultato.error}`);
        risultati.push({
          success: false,
          isin: item.isin,
          ticker: item.ticker,
          error: risultato.error
        });
      }

      // Pausa tra richieste per evitare rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return {
      success: true,
      data: risultati,
      totale: risultati.length,
      successi: risultati.filter(r => r.success).length,
      errori: risultati.filter(r => !r.success).length
    };
  }

  /**
   * Aggiorna un singolo titolo con Yahoo Finance
   * @param {string} isin - ISIN del titolo
   * @returns {Object} - Risultato dell'operazione
   */
  async updateSingleTitle(isin) {
    try {
      // Recupera il titolo dal database
      const etfResult = await dbService.getETFByISIN(isin);

      if (!etfResult.success) {
        return {
          success: false,
          error: 'ISIN non trovato nel database'
        };
      }

      const item = etfResult.data;

      if (!item.ticker) {
        return {
          success: false,
          error: 'Ticker mancante per questo titolo'
        };
      }

      console.log(`📊 Yahoo Finance: ${item.ticker} (${item.tipologia})...`);

      const risultato = await this.getQuoteData(item.ticker);

      if (!risultato.success) {
        return risultato;
      }

      const datiAggiornamento = {};

      // Per Stock: aggiorna nome, div_yield
      if (item.tipologia === 'Stock') {
        if (risultato.data.name) {
          datiAggiornamento.nome = risultato.data.name;
        }
        if (risultato.data.dividendYield !== null) {
          datiAggiornamento.div_yield = risultato.data.dividendYield;
        }
      }

      // Per tutti (ETF e Stock): aggiorna last_price e currency
      if (risultato.data.currentPrice !== null) {
        datiAggiornamento.last_price = risultato.data.currentPrice;
      }

      if (risultato.data.currency !== null) {
        datiAggiornamento.currency = risultato.data.currency;
      }

      // Aggiorna il database
      if (Object.keys(datiAggiornamento).length > 0) {
        const updateResult = await dbService.updateETF(isin, datiAggiornamento);

        if (updateResult.success) {
          console.log(`✅ ${item.ticker}: aggiornato con successo`);
          return {
            success: true,
            isin: isin,
            ticker: item.ticker,
            tipologia: item.tipologia,
            datiAggiornati: datiAggiornamento,
            yahooData: risultato.data
          };
        } else {
          return {
            success: false,
            error: 'Errore aggiornamento database'
          };
        }
      } else {
        return {
          success: false,
          error: 'Nessun dato disponibile da Yahoo Finance'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new YahooFinanceService();
