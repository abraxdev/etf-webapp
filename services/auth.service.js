import { createClient } from '@supabase/supabase-js';

// Client Supabase per autenticazione (usa anon key, non service key)
const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  }
);

class AuthService {
  /**
   * Verifica il token JWT e restituisce l'utente
   * @param {string} token - JWT token
   * @returns {Object} - { success: boolean, user: Object }
   */
  async verifyToken(token) {
    try {
      const { data: { user }, error } = await supabaseAuth.auth.getUser(token);

      if (error) throw error;

      return {
        success: true,
        user: user
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Login utente
   * @param {string} email
   * @param {string} password
   * @returns {Object} - { success: boolean, session: Object }
   */
  async login(email, password) {
    try {
      const { data, error } = await supabaseAuth.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      return {
        success: true,
        session: data.session,
        user: data.user
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Registrazione nuovo utente
   * @param {string} email
   * @param {string} password
   * @returns {Object} - { success: boolean, user: Object }
   */
  async register(email, password) {
    try {
      console.log(`🔐 Tentativo registrazione su Supabase per: ${email}`);

      const { data, error } = await supabaseAuth.auth.signUp({
        email,
        password
      });

      console.log('📊 Risposta Supabase signUp:', {
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        userId: data?.user?.id,
        userEmail: data?.user?.email,
        emailConfirmedAt: data?.user?.email_confirmed_at,
        error: error?.message
      });

      if (error) throw error;

      // Verifica se l'utente è stato creato ma necessita conferma email
      if (data.user && !data.session) {
        console.warn('⚠️  Utente creato ma richiede conferma email');
        return {
          success: true,
          user: data.user,
          session: null,
          needsEmailConfirmation: true
        };
      }

      return {
        success: true,
        user: data.user,
        session: data.session
      };
    } catch (error) {
      console.error('❌ Errore registrazione Supabase:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Logout utente
   * @param {string} token - JWT token
   * @returns {Object} - { success: boolean }
   */
  async logout(token) {
    try {
      const { error } = await supabaseAuth.auth.signOut();

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Refresh del token
   * @param {string} refreshToken
   * @returns {Object} - { success: boolean, session: Object }
   */
  async refreshSession(refreshToken) {
    try {
      const { data, error } = await supabaseAuth.auth.refreshSession({
        refresh_token: refreshToken
      });

      if (error) throw error;

      return {
        success: true,
        session: data.session
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new AuthService();
