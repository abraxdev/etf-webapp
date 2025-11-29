import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import { engine } from 'express-handlebars';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import etfRoutes from './routes/etf.routes.js';
import scraperRoutes from './routes/scraper.routes.js';
import portfolioRoutes from './routes/portfolio.routes.js';
import currencyRoutes from './routes/currency.routes.js';
import authRoutes from './routes/auth.routes.js';
import { requireAuth } from './middleware/auth.middleware.js';
import { requireAuthPage, redirectIfAuth } from './middleware/auth.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Configurazione Handlebars
app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
  helpers: {
    formatDate: (date) => {
      if (!date) return '-';
      return new Date(date).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    },
    formatDateTime: (date) => {
      if (!date) return '-';
      return new Date(date).toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Routes pubbliche (Auth)
app.use('/api/auth', authRoutes);

app.get('/login', redirectIfAuth, (req, res) => {
  res.render('login', {
    title: 'Login',
    layout: 'main-no-head',
    noAuth: true
  });
});

// app.get('/register', redirectIfAuth, (req, res) => {
//   res.render('register', {
//     title: 'Registrazione',
//     layout: 'main',
//     noAuth: false
//   });
// });

// Routes protette (richiedono autenticazione)
app.get('/', requireAuthPage, (req, res) => {
  res.redirect('/dashboard');
});

// API Routes protette
app.use('/api/etf', requireAuth, etfRoutes);
app.use('/api/scraper', requireAuth, scraperRoutes);
app.use('/api/currency', requireAuth, currencyRoutes);
app.use('/portfolio', requireAuthPage, portfolioRoutes);

// Pagine protette
app.get('/dashboard', requireAuthPage, (req, res) => {
  res.render('dashboard', {
    title: 'ETF Tracker Dashboard',
    isDashboard: true,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_ANON_KEY,
    user: req.user
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    error: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server in esecuzione su http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
});