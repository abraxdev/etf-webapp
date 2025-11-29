// Gestione autenticazione

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }
});

// Login
async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const loginBtn = document.getElementById('loginBtn');

  if (!email || !password) {
    showAlert('Inserisci email e password', 'error');
    return;
  }

  try {
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span>Accesso in corso...</span>';

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();

    if (result.success && result.session) {
      // I cookie sono già stati impostati dal server
      // Non salviamo nulla in localStorage per sicurezza

      showAlert('Login effettuato con successo!', 'success');

      // Redirect alla dashboard
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 500);
    } else {
      showAlert(result.error || 'Errore durante il login', 'error');
      loginBtn.disabled = false;
      loginBtn.innerHTML = '<i data-lucide="log-in" style="width: 18px; height: 18px;"></i><span>Accedi</span>';
      lucide.createIcons();
    }
  } catch (error) {
    console.error('Errore login:', error);
    showAlert('Errore di connessione', 'error');
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<i data-lucide="log-in" style="width: 18px; height: 18px;"></i><span>Accedi</span>';
    lucide.createIcons();
  }
}

// Registrazione
async function handleRegister(e) {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const registerBtn = document.getElementById('registerBtn');

  if (!email || !password || !confirmPassword) {
    showAlert('Compila tutti i campi', 'error');
    return;
  }

  if (password !== confirmPassword) {
    showAlert('Le password non corrispondono', 'error');
    return;
  }

  if (password.length < 6) {
    showAlert('La password deve essere di almeno 6 caratteri', 'error');
    return;
  }

  try {
    registerBtn.disabled = true;
    registerBtn.innerHTML = '<span>Registrazione in corso...</span>';

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();

    if (result.success) {
      // I cookie sono già stati impostati dal server se c'è una sessione

      if (result.session) {
        showAlert('Registrazione completata con successo!', 'success');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      } else if (result.needsEmailConfirmation) {
        showAlert('Registrazione completata! Controlla la tua email per confermare l\'account.', 'success');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2500);
      } else {
        showAlert('Registrazione completata!', 'success');
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      }
    } else {
      showAlert(result.error || 'Errore durante la registrazione', 'error');
      registerBtn.disabled = false;
      registerBtn.innerHTML = '<i data-lucide="user-plus" style="width: 18px; height: 18px;"></i><span>Registrati</span>';
      lucide.createIcons();
    }
  } catch (error) {
    console.error('Errore registrazione:', error);
    showAlert('Errore di connessione', 'error');
    registerBtn.disabled = false;
    registerBtn.innerHTML = '<i data-lucide="user-plus" style="width: 18px; height: 18px;"></i><span>Registrati</span>';
    lucide.createIcons();
  }
}

// Mostra alert
function showAlert(message, type = 'info') {
  const alertContainer = document.getElementById('alertContainer');
  const alertClass = type === 'error' ? 'alert-error' : 'alert-success';

  const alertHtml = `
    <div class="alert ${alertClass}" style="padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; ${type === 'error' ? 'background: #fee2e2; color: #991b1b; border: 1px solid #fecaca;' : 'background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0;'}">
      ${message}
    </div>
  `;

  alertContainer.innerHTML = alertHtml;

  // Rimuovi l'alert dopo 5 secondi
  setTimeout(() => {
    alertContainer.innerHTML = '';
  }, 5000);
}
