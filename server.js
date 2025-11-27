require('dotenv').config();
const express = require('express');
const { engine } = require('express-handlebars');
const path = require('path');

const etfRoutes = require('./routes/etf.routes');
const scraperRoutes = require('./routes/scraper.routes');
const portfolioRoutes = require('./routes/portfolio.routes');

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
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

app.use('/api/etf', etfRoutes);
app.use('/api/scraper', scraperRoutes);
app.use('/portfolio', portfolioRoutes);

app.get('/dashboard', (req, res) => {
  res.render('dashboard', {
    title: 'ETF Tracker Dashboard',
    isDashboard: true,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_ANON_KEY
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