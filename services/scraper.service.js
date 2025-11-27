import puppeteer from 'puppeteer';
import dbService from './database.service.js';

class ScraperService {
  async scrapeETF(isin) {
    let browser;
    
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      const url = `https://www.justetf.com/it/etf-profile.html?isin=${isin}#dividendi`;

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));

      const datiETF = await page.evaluate(() => {
        const titleElement = document.querySelector('h1');
        const nomeCompleto = titleElement ? titleElement.textContent.trim() : null;
        const nome = nomeCompleto ? nomeCompleto.split('|')[0].trim() : null;

        let emittente = null;
        let rendita = null;

        const rows = document.querySelectorAll('tr');
        for (const row of rows) {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 2) {
            const label = cells[0].textContent.trim();
            if (label.includes('Emittente')) {
              emittente = cells[1].textContent.trim();
            }
            if (label.includes('Rend. attuale da dividendo')) {
              rendita = cells[1].textContent.trim();
            }
          }
        }

        return { nome, emittente, rendita };
      });

      await browser.close();

      if (datiETF.nome) {

        const percentuale = datiETF.rendita ? parseFloat(datiETF.rendita.replace('%', '').replace(',', '.')) : "N/A";
        
        return {
          success: true,
          isin,
          nome: datiETF.nome,
          emittente: datiETF.emittente,
          rendita_percentuale: datiETF.rendita || "N/A" ,
          rendita_numero: percentuale,
          data_estrazione: new Date().toISOString()
        };
      } else {
        return { 
          success: false, 
          error: 'ETF non trovato',
          isin 
        };
      }

    } catch (error) {
      if (browser) await browser.close();
      return { 
        success: false, 
        error: error.message,
        isin 
      };
    }
  }

  async scrapeAllETF() {
    const risultati = [];
    
    const { success, data: allTitles } = await dbService.getAllETF();
    
    if (!success || !allTitles || allTitles.length === 0) {
      return {
        success: false,
        error: 'Nessun titolo da processare'
      };
    }

    // Filtra solo gli ETF (escludi le Stock)
    const etfList = allTitles.filter(item => item.tipologia === 'ETF');

    if (etfList.length === 0) {
      return {
        success: false,
        error: 'Nessun ETF da processare. Sono presenti solo Stock.'
      };
    }

    console.log(`📊 Trovati ${etfList.length} ETF da processare (${allTitles.length - etfList.length} Stock escluse)`);

    for (const etf of etfList) {
      console.log(`📊 Scraping ${etf.isin}...`);
      
      const risultato = await this.scrapeETF(etf.isin);
      
      if (risultato.success) {
        // Aggiorna dati ETF (ticker rimane quello inserito manualmente)
        await dbService.updateETF(etf.isin, {
          nome: risultato.nome,
          emittente: risultato.emittente,
          div_yield: risultato.rendita_percentuale
        });

        // Salva rendita
        await dbService.salvaRendita(risultato);
      }

      risultati.push(risultato);

      // Pausa tra richieste
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return {
      success: true,
      data: risultati,
      totale: risultati.length,
      successi: risultati.filter(r => r.success).length,
      errori: risultati.filter(r => !r.success).length,
      stockEscluse: allTitles.length - etfList.length
    };
  }
}

export default new ScraperService();