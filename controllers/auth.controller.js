import authService from '../services/auth.service.js';

class AuthController {
  /**
   * POST /api/auth/login
   * Login utente
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email e password richiesti'
        });
      }

      console.log(`🔐 Tentativo login: ${email}`);
      const result = await authService.login(email, password);

      if (!result.success) {
        return res.status(401).json({
          success: false,
          error: result.error || 'Credenziali non valide'
        });
      }

      console.log(`✅ Login riuscito: ${email}`);

      // Imposta i cookies per l'autenticazione
      res.cookie('access_token', result.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 giorni
      });

      res.cookie('refresh_token', result.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 giorni
      });

      res.json({
        success: true,
        session: result.session,
        user: result.user
      });
    } catch (error) {
      console.error('❌ Errore login:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/auth/register
   * Registrazione nuovo utente
   */
  async register(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email e password richiesti'
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'La password deve essere di almeno 6 caratteri'
        });
      }

      console.log(`📝 Tentativo registrazione: ${email}`);
      const result = await authService.register(email, password);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error || 'Errore durante la registrazione'
        });
      }

      console.log(`✅ Registrazione riuscita: ${email}`);

      // Se c'è una sessione, imposta i cookies
      if (result.session) {
        res.cookie('access_token', result.session.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 giorni
        });

        res.cookie('refresh_token', result.session.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30 giorni
        });
      }

      res.status(201).json({
        success: true,
        user: result.user,
        session: result.session,
        needsEmailConfirmation: result.needsEmailConfirmation
      });
    } catch (error) {
      console.error('❌ Errore registrazione:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/auth/logout
   * Logout utente
   */
  async logout(req, res) {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.substring(7);

      const result = await authService.logout(token);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      console.log('✅ Logout riuscito');

      // Cancella i cookies
      res.clearCookie('access_token');
      res.clearCookie('refresh_token');

      res.json({
        success: true,
        message: 'Logout effettuato con successo'
      });
    } catch (error) {
      console.error('❌ Errore logout:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/auth/me
   * Restituisce i dati dell'utente autenticato
   */
  async me(req, res) {
    try {
      // L'utente è già stato verificato dal middleware requireAuth
      res.json({
        success: true,
        user: req.user
      });
    } catch (error) {
      console.error('❌ Errore recupero utente:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export default new AuthController();
