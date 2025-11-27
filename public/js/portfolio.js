let portfolioData = [];
let filteredData = [];
let currentSort = { column: 'tipologia', order: 'asc' };
let allocationChart = null;
let treemapChart = null;

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
      portfolioData = result.data.map(item => {
        const qty = parseFloat(item.qty) || 0;
        const prezzo = parseFloat(item.last_price) || 0;
        const posizione = qty * prezzo;

        // Gestisci dividend che può essere numero, stringa, NaN, N/A, null
        let dividend = 0;
        if (item.div_yield) {
          const divString = String(item.div_yield).replace('%', '').replace(',', '.');
          const divNum = parseFloat(divString);
          dividend = (!isNaN(divNum) && isFinite(divNum)) ? divNum : 0;
        }

        return {
          tipologia: item.tipologia || '-',
          ticker: item.ticker || '-',
          nome: item.nome || '-',
          qty: qty,
          dividend: dividend,
          prezzo: prezzo,
          posizione: posizione,
          isin: item.isin
        };
      });

      filteredData = [...portfolioData];
      updateKPIs();
      updateCharts();
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
    if (currentSort.column === 'qty' || currentSort.column === 'dividend' || currentSort.column === 'posizione') {
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
      <td style="text-align: center; font-weight: 600; color: #2d3748;">${formatCurrency(item.prezzo)}</td>
      <td style="text-align: center; font-weight: 700; color: #3182ce;">${formatCurrency(item.posizione)}</td>
    `;

    tbody.appendChild(row);
  });

  totalCount.textContent = filteredData.length;
}

// Aggiorna indicatori ordinamento
function updateSortIndicators() {
  ['tipologia', 'ticker', 'nome', 'qty', 'dividend', 'posizione'].forEach(col => {
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

// Formattazione valuta
function formatCurrency(num) {
  const n = parseFloat(num) || 0;
  return n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

// Export to CSV
function exportToCSV() {
  if (filteredData.length === 0) {
    showAlert('Nessun dato da esportare', 'warning');
    return;
  }

  // Prepara l'header CSV
  const headers = ['Tipologia', 'Ticker', 'Nome', 'Quantità', 'Dividend', 'Prezzo', 'Posizione'];
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
      formatNumberForCSV(item.dividend),
      formatNumberForCSV(item.prezzo),
      formatNumberForCSV(item.posizione)
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

// ===== KPI FUNCTIONS =====

function updateKPIs() {
  // Calcola valore totale portafoglio
  const totalValue = portfolioData.reduce((sum, item) => sum + item.posizione, 0);

  // Calcola dividendi totali (valore € e yield medio ponderato)
  const dividendAssets = portfolioData.filter(item => parseFloat(item.dividend) > 0);
  const totalDividendValue = dividendAssets.reduce((sum, item) => {
    const dividendAmount = (item.posizione * parseFloat(item.dividend)) / 100;
    return sum + dividendAmount;
  }, 0);

  const averageYield = totalValue > 0 ? (totalDividendValue / totalValue) * 100 : 0;

  // Calcola numero asset
  const totalAssets = portfolioData.length;
  const etfCount = portfolioData.filter(item => item.tipologia === 'ETF').length;
  const stockCount = portfolioData.filter(item => item.tipologia === 'Stock').length;

  // Aggiorna UI
  document.getElementById('kpiTotalValue').textContent = formatCurrency(totalValue);
  document.getElementById('kpiDividends').textContent = formatCurrency(totalDividendValue);
  document.getElementById('kpiDividendPercent').textContent = `${averageYield.toFixed(2)}% Yield`;
  document.getElementById('kpiAssetCount').textContent = totalAssets;
  document.getElementById('kpiAssetBreakdown').textContent = `${etfCount} ETF · ${stockCount} Stock`;
}

// ===== CHART FUNCTIONS =====

function updateCharts() {
  try {
    // Verifica che Chart.js sia caricato
    if (typeof Chart === 'undefined') {
      console.error('Chart.js non è caricato');
      return;
    }
    updateAllocationChart();
    updateTreemapChart();
  } catch (error) {
    console.error('Errore aggiornamento grafici:', error);
  }
}

function updateAllocationChart() {
  const etfValue = portfolioData
    .filter(item => item.tipologia === 'ETF')
    .reduce((sum, item) => sum + item.posizione, 0);

  const stockValue = portfolioData
    .filter(item => item.tipologia === 'Stock')
    .reduce((sum, item) => sum + item.posizione, 0);

  const ctx = document.getElementById('allocationChart');

  if (allocationChart) {
    allocationChart.destroy();
  }

  allocationChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['ETF', 'Stock'],
      datasets: [{
        data: [etfValue, stockValue],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)'
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)'
        ],
        borderWidth: 2,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            font: {
              size: 14,
              family: "'Inter', sans-serif",
              weight: '500'
            },
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: {
            size: 14,
            weight: 'bold'
          },
          bodyFont: {
            size: 13
          },
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${formatCurrency(value)} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

function updateTreemapChart() {
  // Prepara i dati per la treemap: ordina per posizione decrescente
  const treemapData = portfolioData
    .map(item => ({
      ticker: item.ticker,
      nome: item.nome,
      value: item.posizione,
      tipologia: item.tipologia
    }))
    .sort((a, b) => b.value - a.value);

  const ctx = document.getElementById('treemapChart');

  if (treemapChart) {
    treemapChart.destroy();
  }

  treemapChart = new Chart(ctx, {
    type: 'treemap',
    data: {
      datasets: [{
        tree: treemapData,
        key: 'value',
        groups: ['tipologia', 'ticker'],
        spacing: 1,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        backgroundColor: function(ctx) {
          if (!ctx.raw) return 'transparent';
          const item = ctx.raw._data;
          return item.tipologia === 'ETF'
            ? 'rgba(59, 130, 246, 0.7)'
            : 'rgba(16, 185, 129, 0.7)';
        },
        hoverBackgroundColor: function(ctx) {
          if (!ctx.raw) return 'transparent';
          const item = ctx.raw._data;
          return item.tipologia === 'ETF'
            ? 'rgba(59, 130, 246, 0.9)'
            : 'rgba(16, 185, 129, 0.9)';
        },
        labels: {
          display: true,
          formatter: function(ctx) {
            if (!ctx.raw) return '';
            const item = ctx.raw._data;
            return [item.ticker, formatCurrency(item.value)];
          },
          color: 'white',
          font: {
            size: 13,
            weight: 'bold',
            family: "'Inter', sans-serif"
          }
        }
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          padding: 15,
          titleFont: {
            size: 15,
            weight: 'bold'
          },
          bodyFont: {
            size: 13
          },
          callbacks: {
            title: function(context) {
              if (!context[0].raw) return '';
              return context[0].raw._data.ticker;
            },
            label: function(context) {
              if (!context.raw) return '';
              const item = context.raw._data;
              const total = portfolioData.reduce((sum, p) => sum + p.posizione, 0);
              const percentage = ((item.value / total) * 100).toFixed(2);
              return [
                `Nome: ${item.nome}`,
                `Valore: ${formatCurrency(item.value)}`,
                `Peso: ${percentage}%`,
                `Tipo: ${item.tipologia}`
              ];
            }
          }
        }
      }
    }
  });
}
