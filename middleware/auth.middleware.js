import authService from '../services/auth.service.js';

/**
 * Middleware per proteggere le routes API
 * Verifica che l'utente sia autenticato tramite JWT token
 */
export const requireAuth = async (req, res, next) => {
  try {
    // Estrai il token dall'header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token di autenticazione mancante'
      });
    }

    const token = authHeader.substring(7); // Rimuovi 'Bearer '

    // Verifica il token
    const result = await authService.verifyToken(token);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        error: 'Token non valido o scaduto'
      });
    }

    // Aggiungi l'utente alla request per usarlo nei controller
    req.user = result.user;

    next();
  } catch (error) {
    console.error('❌ Errore middleware auth:', error);
    res.status(500).json({
      success: false,
      error: 'Errore interno del server'
    });
  }
};

/**
 * Middleware per proteggere le pagine HTML
 * Verifica che l'utente sia autenticato tramite cookie di sessione
 */
export const requireAuthPage = (req, res, next) => {
  // Verifica se esiste un cookie di sessione
  const accessToken = req.cookies?.access_token;

  if (!accessToken) {
    return res.redirect('/login');
  }

  // Verifica il token
  authService.verifyToken(accessToken)
    .then(result => {
      if (!result.success) {
        return res.redirect('/login');
      }

      req.user = result.user;
      next();
    })
    .catch(error => {
      console.error('❌ Errore verifica token:', error);
      res.redirect('/login');
    });
};

/**
 * Middleware per redirect se già autenticato
 * Utile per pagine login/register
 */
export const redirectIfAuth = (req, res, next) => {
  const accessToken = req.cookies?.access_token;

  if (!accessToken) {
    return next();
  }

  authService.verifyToken(accessToken)
    .then(result => {
      if (result.success) {
        return res.redirect('/dashboard');
      }
      next();
    })
    .catch(() => {
      next();
    });
};
