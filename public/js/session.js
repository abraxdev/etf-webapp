// Gestione sessione globale

// Funzione per ottenere il token
function getAccessToken() {
  return localStorage.getItem('access_token');
}

// Funzione per verificare se l'utente è autenticato
function isAuthenticated() {
  return !!getAccessToken();
}

// Funzione per il logout
async function logout() {
  const token = getAccessToken();

  if (token) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (error) {
      console.error('Errore durante il logout:', error);
    }
  }

  // Rimuovi i dati dalla localStorage
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');

  // Redirect al login
  window.location.href = '/login';
}

// Aggiungi header Authorization a tutte le fetch
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const [url, config = {}] = args;

  // Se la richiesta è verso le API, aggiungi il token
  if (typeof url === 'string' && url.startsWith('/api/')) {
    const token = getAccessToken();

    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`
      };
    }
  }

  return originalFetch(url, config)
    .then(response => {
      // Se ricevi 401, fai logout
      if (response.status === 401) {
        console.warn('Token scaduto o non valido. Eseguo logout...');
        logout();
      }
      return response;
    });
};

// Verifica la sessione al caricamento della pagina
document.addEventListener('DOMContentLoaded', () => {
  // Se non sei autenticato e non sei già nella pagina di login/register, redirect
  const currentPath = window.location.pathname;
  const publicPaths = ['/login', '/register'];

  if (!isAuthenticated() && !publicPaths.includes(currentPath)) {
    window.location.href = '/login';
  }

  // Aggiungi event listener per il logout button se esiste
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }

  // Mostra informazioni utente se presenti
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userEmailEl = document.getElementById('userEmail');

  if (userEmailEl && user.email) {
    userEmailEl.textContent = user.email;
  }
});
