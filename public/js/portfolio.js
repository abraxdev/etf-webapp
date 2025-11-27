let portfolioData = [];
let filteredData = [];
let currentSort = { column: 'tipologia', order: 'asc' };

// Caricamento iniziale
document.addEventListener('DOMContentLoaded', () => {
  loadPortfolio();
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  document.getElementById('filterTipologia').addEventListener('change', applyFilters);
  document.getElementById('searchInput').addEventListener('input', applyFilters);
  document.getElementById('sortBy').addEventListener('change', (e) => {
    currentSort.column = e.target.value;
    sortAndRender();
  });
}

// Carica tutti i dati dal database
async function loadPortfolio() {
  const loading = document.getElementById('loading');
  const tableContainer = document.getElementById('tableContainer');
  const emptyState = document.getElementById('emptyState');

  try {
    loading.style.display = 'flex';
    tableContainer.style.display = 'none';
    emptyState.style.display = 'none';

    const response = await fetch('/api/etf');
    const result = await response.json();

    if (result.success && result.data && result.data.length > 0) {
      portfolioData = result.data.map(item => ({
        tipologia: item.tipologia || '-',
        ticker: item.ticker || '-',
        nome: item.nome || '-',
        qty: item.qty || 0,
        dividend: item.div_yield || 0,
        isin: item.isin
      }));

      filteredData = [...portfolioData];
      sortAndRender();

      loading.style.display = 'none';
      tableContainer.style.display = 'block';
    } else {
      loading.style.display = 'none';
      emptyState.style.display = 'flex';
    }
  } catch (error) {
    console.error('Errore caricamento portfolio:', error);
    loading.style.display = 'none';
    showAlert('Errore nel caricamento del portfolio', 'error');
  }
}

// Applica filtri
function applyFilters() {
  const tipologiaFilter = document.getElementById('filterTipologia').value;
  const searchText = document.getElementById('searchInput').value.toLowerCase();

  filteredData = portfolioData.filter(item => {
    const matchTipologia = !tipologiaFilter || item.tipologia === tipologiaFilter;
    const matchSearch = !searchText ||
      item.nome.toLowerCase().includes(searchText) ||
      item.ticker.toLowerCase().includes(searchText);

    return matchTipologia && matchSearch;
  });

  sortAndRender();
}

// Ordina e renderizza
function sortAndRender() {
  filteredData.sort((a, b) => {
    let aVal = a[currentSort.column];
    let bVal = b[currentSort.column];

    // Gestione numeri
    if (currentSort.column === 'qty' || currentSort.column === 'dividend') {
      aVal = parseFloat(aVal) || 0;
      bVal = parseFloat(bVal) || 0;
    } else {
      // Gestione stringhe
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
    }

    if (aVal < bVal) return currentSort.order === 'asc' ? -1 : 1;
    if (aVal > bVal) return currentSort.order === 'asc' ? 1 : -1;
    return 0;
  });

  renderTable();
  updateSortIndicators();
}

// Renderizza tabella
function renderTable() {
  const tbody = document.getElementById('portfolioTableBody');
  const totalCount = document.getElementById('totalCount');

  tbody.innerHTML = '';

  filteredData.forEach(item => {
    const row = document.createElement('tr');

    const tipologiaBadge = item.tipologia === 'ETF'
      ? '<span class="badge badge-primary">ETF</span>'
      : '<span class="badge badge-secondary">Stock</span>';

    row.innerHTML = `
      <td>${tipologiaBadge}</td>
      <td style="font-weight: 600; color: #2d3748;">${item.ticker}</td>
      <td>${item.nome}</td>
      <td style="text-align: center; font-weight: 600;">${formatNumber(item.qty)}</td>
      <td style="text-align: center; font-weight: 600; color: #38a169;">${formatPercentage(item.dividend)}</td>
    `;

    tbody.appendChild(row);
  });

  totalCount.textContent = filteredData.length;
}

// Aggiorna indicatori ordinamento
function updateSortIndicators() {
  ['tipologia', 'ticker', 'nome', 'qty', 'dividend'].forEach(col => {
    const indicator = document.getElementById(`sort-${col}`);
    if (indicator) {
      if (col === currentSort.column) {
        indicator.textContent = currentSort.order === 'asc' ? '▲' : '▼';
      } else {
        indicator.textContent = '';
      }
    }
  });
}

// Ordina per colonna (click su header)
function sortByColumn(column) {
  if (currentSort.column === column) {
    currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
  } else {
    currentSort.column = column;
    currentSort.order = 'asc';
  }

  document.getElementById('sortBy').value = column;
  sortAndRender();
}

// Toggle ordine
function toggleSortOrder() {
  currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
  const btn = document.getElementById('sortOrderBtn');
  btn.innerHTML = `
    <span>${currentSort.order === 'asc' ? '⬆️' : '⬇️'}</span>
    <span>Ordine: ${currentSort.order === 'asc' ? 'Crescente' : 'Decrescente'}</span>
  `;
  sortAndRender();
}

// Reset filtri
function resetFilters() {
  document.getElementById('filterTipologia').value = '';
  document.getElementById('searchInput').value = '';
  document.getElementById('sortBy').value = 'tipologia';
  currentSort = { column: 'tipologia', order: 'asc' };

  const btn = document.getElementById('sortOrderBtn');
  btn.innerHTML = `
    <span>⬆️</span>
    <span>Ordine: Crescente</span>
  `;

  filteredData = [...portfolioData];
  sortAndRender();
}

// Formattazione numeri
function formatNumber(num) {
  const n = parseFloat(num) || 0;
  return n.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// Formattazione percentuali
function formatPercentage(num) {
  const n = parseFloat(num) || 0;
  return n.toFixed(2) + '%';
}

// Export to CSV
function exportToCSV() {
  if (filteredData.length === 0) {
    showAlert('Nessun dato da esportare', 'warning');
    return;
  }

  // Prepara l'header CSV
  const headers = ['Tipologia', 'Ticker', 'Nome', 'Quantità', 'Dividend'];
  const csvRows = [];

  // Aggiungi header
  csvRows.push(headers.join(';'));

  // Aggiungi i dati
  filteredData.forEach(item => {
    const row = [
      escapeCSV(item.tipologia),
      escapeCSV(item.ticker),
      escapeCSV(item.nome),
      formatNumberForCSV(item.qty),
      formatNumberForCSV(item.dividend)
    ];
    csvRows.push(row.join(';'));
  });

  // Crea il contenuto CSV
  const csvContent = csvRows.join('\n');

  // Crea il Blob con BOM per compatibilità Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  // Crea il link per il download
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  // Nome file con data e ora
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
  const filename = `portfolio_${dateStr}_${timeStr}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showAlert(`File ${filename} scaricato con successo!`, 'success');
}

// Escape caratteri speciali per CSV
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Se contiene virgola, punto e virgola o virgolette, racchiudi tra virgolette
  if (str.includes(';') || str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// Formattazione numero per CSV (usa virgola come separatore decimale)
function formatNumberForCSV(num) {
  const n = parseFloat(num) || 0;
  return n.toFixed(2).replace('.', ',');
}

// Alert system
function showAlert(message, type = 'info') {
  const container = document.getElementById('alertContainer');
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;

  container.appendChild(alert);

  setTimeout(() => {
    alert.classList.add('fade-out');
    setTimeout(() => alert.remove(), 300);
  }, 3000);
}
