const supabase = require('../config/supabase');

class DatabaseService {
  // Test connessione
  async testConnection() {
    try {
      const { error } = await supabase
        .from('etf')
        .select('count')
        .limit(1);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // CRUD ETF
  async getAllETF() {
    try {
      const { data, error } = await supabase
        .from('etf')
        .select(`
          *,
          rendite_storiche (
            rendita_percentuale,
            rendita_numero,
            data_estrazione
          )
        `)
        .order('creato_il', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data.map(etf => ({
          ...etf,
          ultima_rendita: etf.rendite_storiche?.[0] || null,
          rendite_storiche: undefined
        }))
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getETFByISIN(isin) {
    try {
      const { data, error } = await supabase
        .from('etf')
        .select('*')
        .eq('isin', isin)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createETF(isin, ticker = null, tipologia = 'ETF') {
    try {
      const { data, error } = await supabase
        .from('etf')
        .insert([{ isin, ticker, tipologia }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      if (error.code === '23505') {
        return { success: false, error: 'ISIN già esistente' };
      }
      return { success: false, error: error.message };
    }
  }

  async updateETF(isin, datiAggiuntivi) {
    try {
      const { data, error } = await supabase
        .from('etf')
        .update({
          ...datiAggiuntivi,
          aggiornato_il: new Date().toISOString()
        })
        .eq('isin', isin)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteETF(isin) {
    try {
      const { error } = await supabase
        .from('etf')
        .delete()
        .eq('isin', isin);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Rendite
  async salvaRendita(dati) {
    try {
      const { data, error } = await supabase
        .from('rendite_storiche')
        .insert({
          isin: dati.isin,
          rendita_percentuale: dati.rendita_percentuale,
          rendita_numero: dati.rendita_numero,
          data_estrazione: new Date(dati.data_estrazione).toISOString()
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return { success: true, message: 'Rendita già presente' };
        }
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getStoricoRendite(isin, limite = 30) {
    try {
      const { data, error } = await supabase
        .from('rendite_storiche')
        .select('*')
        .eq('isin', isin)
        .order('data_estrazione', { ascending: false })
        .limit(limite);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Statistiche
  async getStatistiche() {
    try {
      const { count: etfCount } = await supabase
        .from('etf')
        .select('*', { count: 'exact', head: true });

      const { count: rendCount } = await supabase
        .from('rendite_storiche')
        .select('*', { count: 'exact', head: true });

      const { data: lastRend } = await supabase
        .from('rendite_storiche')
        .select('data_estrazione')
        .order('data_estrazione', { ascending: false })
        .limit(1)
        .single();

      return {
        success: true,
        data: {
          totalETF: etfCount || 0,
          totalRendimenti: rendCount || 0,
          ultimaSincronizzazione: lastRend?.data_estrazione || null
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new DatabaseService();