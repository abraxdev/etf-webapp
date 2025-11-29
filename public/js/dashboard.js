// public/js/dashboard.js

// Funzioni utility
function showAlert(message, type = 'success') {
    const container = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} show`;
    alert.textContent = message;
    container.appendChild(alert);

    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 300);
    }, 5000);
}

function validateISIN(isin) {
    const regex = /^[A-Z]{2}[A-Z0-9]{10}$/;
    return regex.test(isin);
}

// Carica statistiche
async function loadStats() {
    try {
        const response = await fetch('/api/etf/stats');
        const result = await response.json();

        if (result.success) {
            document.getElementById('statTotal').textContent = result.data.totalETF;
            document.getElementById('statRendimenti').textContent = result.data.totalRendimenti;

            if (result.data.ultimaSincronizzazione) {
                const date = new Date(result.data.ultimaSincronizzazione);
                document.getElementById('statLastSync').textContent = 
                    date.toLocaleString('it-IT', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    });
            }
        }
    } catch (error) {
        console.error('Errore caricamento statistiche:', error);
    }
}

// Carica lista ETF
async function loadETFs() {
    const loading = document.getElementById('loading');
    const tableContainer = document.getElementById('tableContainer');
    const emptyState = document.getElementById('emptyState');
    const tbody = document.getElementById('etfTableBody');

    loading.classList.add('show');
    tableContainer.style.display = 'none';
    emptyState.style.display = 'none';

    try {
        const response = await fetch('/api/etf');
        const result = await response.json();

        loading.classList.remove('show');

        if (!result.success || !result.data || result.data.length === 0) {
            emptyState.style.display = 'block';
            return;
        }

        tableContainer.style.display = 'block';
        tbody.innerHTML = '';

        result.data.forEach(etf => {
            const row = document.createElement('tr');
            
            const ultimaRendita = etf.ultima_rendita;
            const hasRendita = ultimaRendita && ultimaRendita.rendita_percentuale;
            const isETF = etf.tipologia === 'ETF';
            const isStock = etf.tipologia === 'Stock';

            // Badge tipologia
            const tipologiaBadge = isETF 
                ? '<span class="badge badge-info">ETF</span>'
                : '<span class="badge" style="background: #e9d8fd; color: #553c9a;">Stock</span>';

            // Pulsanti azioni basati sulla tipologia
            const actionButtons = isETF 
                ? `
                    <button class="btn btn-secondary small" onclick="scrapeOne('${etf.isin}')">
                        <i data-lucide="refresh-cw" width="16"></i>
                    </button>
                    <button class="btn btn-secondary small" onclick="viewHistory('${etf.isin}')">
                        <i data-lucide="chart-column" width="16"></i>
                    </button>
                  `
                : `
                    <button class="btn btn-secondary small" disabled title="Le Stock non vengono scrapate da JustETF">
                        <i data-lucide="refresh-cw" width="16"></i>
                    </button>
                    <button class="btn btn-secondary small" onclick="viewHistory('${etf.isin}')">
                        <i data-lucide="chart-column" width="16"></i>
                    </button>
                  `;

            row.innerHTML = `
                <td>${tipologiaBadge}</td>
                <td><strong>${etf.isin}</strong></td>
                <td>${etf.nome || '<span style="color: #cbd5e0;">Da recuperare</span>'}</td>
                <td>${etf.ticker || '-'}</td>
                <td>${etf.qty || '-'}</td>
                <td>${etf.emittente || '-'}</td>
                <td>
                    ${hasRendita 
                        ? `<span class="badge badge-success">${ultimaRendita.rendita_percentuale}</span>` 
                        : (isStock ? '<span class="badge" style="background: #e2e8f0; color: #4a5568;">N/A</span>' : '<span class="badge badge-warning">Nessun dato</span>')
                    }
                </td>

                <td class="actions">
                    ${actionButtons}
                    <button class="btn btn-danger small" onclick="deleteETF('${etf.isin}')">
                        <i data-lucide="trash-2" width="16"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
            lucide.createIcons();
        });

        await loadStats();

    } catch (error) {
        loading.classList.remove('show');
        showAlert('Errore nel caricamento degli ETF: ' + error.message, 'error');
        console.error(error);
    }
}

// Aggiungi titolo (ETF o Stock)
document.getElementById('addEtfForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const tipologiaSelect = document.getElementById('tipologiaSelect');
    const isinInput = document.getElementById('isinInput');
    const tickerInput = document.getElementById('tickerInput');
    const qtyInput = document.getElementById('qtyInput');
    const tipologia = tipologiaSelect.value;
    const isin = isinInput.value.trim().toUpperCase();
    const ticker = tickerInput.value.trim().toUpperCase();
    const qty = qtyInput.value.trim();
    const addBtn = document.getElementById('addBtn');

    if (!validateISIN(isin)) {
        showAlert('Formato ISIN non valido. Deve essere 2 lettere seguite da 10 caratteri alfanumerici.', 'error');
        return;
    }

    if (!ticker || ticker.length === 0) {
        showAlert('Il Ticker è obbligatorio.', 'error');
        return;
    }

    addBtn.disabled = true;
    addBtn.innerHTML = '<span>⏳</span><span>Aggiunta in corso...</span>';

    try {
        const response = await fetch('/api/etf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ isin, ticker, tipologia, qty })
        });

        const result = await response.json();

        if (result.success) {
            const tipoLabel = tipologia === 'ETF' ? 'ETF' : 'Stock';
            const actionMsg = tipologia === 'ETF' 
                ? 'Clicca su "Aggiorna" per recuperare i dati da JustETF.' 
                : 'Gli Stock non vengono aggiornati automaticamente da JustETF.';
            
            showAlert(`✅ ${tipoLabel} ${isin} (${ticker}) aggiunto con successo! ${actionMsg}`, 'success');
            isinInput.value = '';
            tickerInput.value = '';
            tipologiaSelect.value = 'ETF';
            qtyInput.value = '';
            await loadETFs();
        } else {
            showAlert(result.error || 'Errore durante l\'aggiunta', 'error');
        }
    } catch (error) {
        showAlert('Errore durante l\'aggiunta: ' + error.message, 'error');
        console.error(error);
    } finally {
        addBtn.disabled = false;
        addBtn.innerHTML = '<span>➕</span><span>Aggiungi Titolo</span>';
    }
});

// Elimina ETF
async function deleteETF(isin) {
    if (!confirm(`Sei sicuro di voler eliminare l'ETF ${isin}?\n\nVerranno eliminati anche tutti i dati storici associati.`)) {
        return;
    }

    try {
        const response = await fetch(`/api/etf/${isin}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            showAlert(`ETF ${isin} eliminato con successo.`, 'success');
            await loadETFs();
        } else {
            showAlert(result.error || 'Errore durante l\'eliminazione', 'error');
        }
    } catch (error) {
        showAlert('Errore durante l\'eliminazione: ' + error.message, 'error');
        console.error(error);
    }
}

// Scrape singolo ETF
async function scrapeOne(isin) {
    if (!confirm(`Vuoi aggiornare i dati per ${isin}?\n\nL'operazione potrebbe richiedere alcuni secondi.`)) {
        return;
    }

    showAlert(`⏳ Aggiornamento di ${isin} in corso...`, 'info');

    try {
        const response = await fetch(`/api/scraper/run/${isin}`, {
            method: 'POST'
        });

        const result = await response.json();

        if (result.success) {
            showAlert(`✅ ${isin} aggiornato con successo! Rendita: ${result.rendita_percentuale}`, 'success');
            await loadETFs();
        } else {
            showAlert(`❌ Errore nell'aggiornamento di ${isin}: ${result.error}`, 'error');
        }
    } catch (error) {
        showAlert('Errore durante l\'aggiornamento: ' + error.message, 'error');
        console.error(error);
    }
}

// Scrape JustETF (solo ETF, escluse le Stock)
document.getElementById('scrapeJustETFBtn').addEventListener('click', async () => {
    if (!confirm('Vuoi aggiornare le info da JustETF?\n\nNota: Solo gli ETF verranno aggiornati (le Stock escluse).\n\nL\'operazione potrebbe richiedere diversi minuti.')) {
        return;
    }

    const btn = document.getElementById('scrapeJustETFBtn');
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span><span>Aggiornamento...</span>';

    try {
        const response = await fetch('/api/scraper/run', {
            method: 'POST'
        });

        const result = await response.json();

        if (result.success) {
            showAlert('✅ Scraping JustETF avviato! I dati verranno aggiornati in background. Ricarica tra qualche minuto.', 'success');

            // Ricarica automaticamente dopo 30 secondi
            setTimeout(() => {
                loadETFs();
            }, 30000);
        } else {
            showAlert('Errore durante l\'avvio dello scraping JustETF', 'error');
        }
    } catch (error) {
        showAlert('Errore: ' + error.message, 'error');
        console.error(error);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>📈</span><span>Aggiorna Info ETF</span>';
    }
});

// Scrape Yahoo Finance (tutti i titoli: ETF + Stock)
document.getElementById('scrapeYahooBtn').addEventListener('click', async () => {
    if (!confirm('Vuoi aggiornare le info da Yahoo Finance?\n\nTutti i titoli (ETF e Stock) verranno aggiornati.\n\nL\'operazione potrebbe richiedere diversi minuti.')) {
        return;
    }

    const btn = document.getElementById('scrapeYahooBtn');
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span><span>Aggiornamento...</span>';

    try {
        const response = await fetch('/api/scraper/yahoo/run', {
            method: 'POST'
        });

        const result = await response.json();

        if (result.success) {
            showAlert('✅ Scraping Yahoo Finance avviato! I dati verranno aggiornati in background. Ricarica tra qualche minuto.', 'success');

            // Ricarica automaticamente dopo 30 secondi
            setTimeout(() => {
                loadETFs();
            }, 30000);
        } else {
            showAlert('Errore durante l\'avvio dello scraping Yahoo Finance', 'error');
        }
    } catch (error) {
        showAlert('Errore: ' + error.message, 'error');
        console.error(error);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>💹</span><span>Aggiorna Info YF</span>';
    }
});

// Visualizza storico in modal
async function viewHistory(isin) {
    const modal = document.getElementById('modalStorico');
    const modalTitle = document.getElementById('modalTitle');
    const modalLoading = document.getElementById('modalLoading');
    const storicoContent = document.getElementById('storicoContent');

    modal.classList.add('show');
    modalTitle.textContent = `Storico Rendite - ${isin}`;
    modalLoading.classList.add('show');
    storicoContent.innerHTML = '';

    try {
        const response = await fetch(`/api/etf/${isin}/storico?limite=20`);
        const result = await response.json();

        modalLoading.classList.remove('show');

        if (!result.success || !result.data || result.data.length === 0) {
            storicoContent.innerHTML = '<p style="text-align: center; color: #718096;">Nessuno storico disponibile per questo ETF.</p>';
            return;
        }

        result.data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'storico-item';
            div.innerHTML = `
                <div class="storico-date">
                    ${new Date(item.data_estrazione).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </div>
                <div class="storico-value">
                    ${item.rendita_percentuale}
                </div>
            `;
            storicoContent.appendChild(div);
        });

    } catch (error) {
        modalLoading.classList.remove('show');
        storicoContent.innerHTML = '<p style="text-align: center; color: #f56565;">Errore nel caricamento dello storico.</p>';
        console.error(error);
    }
}

// Chiudi modal
function closeModal() {
    const modal = document.getElementById('modalStorico');
    modal.classList.remove('show');
}

// Chiudi modal cliccando fuori
document.getElementById('modalStorico').addEventListener('click', (e) => {
    if (e.target.id === 'modalStorico') {
        closeModal();
    }
});

// Converti ISIN e Ticker in maiuscolo durante la digitazione
document.getElementById('isinInput').addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});

document.getElementById('tickerInput').addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});

// Carica dati all'avvio
window.addEventListener('DOMContentLoaded', () => {
    loadETFs();
});