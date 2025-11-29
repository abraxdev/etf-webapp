// Gestione sessione globale tramite COOKIES (più sicuro)

// Funzione per verificare se c'è un cookie (semplice check)
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// Funzione per verificare se l'utente è autenticato
function isAuthenticated() {
  // Verifica se esiste il cookie access_token
  return !!getCookie('access_token');
}

// Funzione per il logout
async function logout() {
  try {
    // Chiama l'API di logout (che cancellerà i cookies HttpOnly)
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include' // Importante: include i cookies nella richiesta
    });
  } catch (error) {
    console.error('Errore durante il logout:', error);
  }

  // Redirect al login (i cookies sono già stati cancellati dal server)
  window.location.href = '/login';
}

// Intercetta le fetch per gestire errori 401
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const [url, config = {}] = args;

  // Assicurati che i cookies vengano sempre inviati
  config.credentials = config.credentials || 'include';

  return originalFetch(url, config)
    .then(response => {
      // Se ricevi 401 e non sei nella pagina di login, fai logout
      if (response.status === 401 && !window.location.pathname.startsWith('/login')) {
        console.warn('⚠️  Sessione scaduta o non valida. Eseguo logout...');
        logout();
      }
      return response;
    });
};

// Setup al caricamento della pagina
document.addEventListener('DOMContentLoaded', () => {
  // Aggiungi event listener per il logout button se esiste
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }

  console.log('✅ Sessione gestita tramite cookies HttpOnly');
});
