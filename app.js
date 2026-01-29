let WEB_APP_URL = localStorage.getItem('sheet_url');

const setupView = document.getElementById('setup-view');
const dashboardView = document.getElementById('dashboard-view');
const urlInput = document.getElementById('script-url-input');
const saveUrlBtn = document.getElementById('save-url-btn');
const dataContainer = document.getElementById('data-container');
const searchInput = document.getElementById('sheet-search');
const refreshBtn = document.getElementById('refresh-btn');
const lastUpdatedLabel = document.getElementById('last-updated');
const resetBtn = document.getElementById('reset-btn');

// Dashboard UI elements
const yearNav = document.getElementById('year-nav');
const totalYearLabel = document.getElementById('total-year');
const totalIncomeLabel = document.getElementById('total-income');
const totalExpensesLabel = document.getElementById('total-expenses');
const totalInvestmentsLabel = document.getElementById('total-investments');
const totalEntriesLabel = document.getElementById('total-entries');
const categoryBarsContainer = document.getElementById('category-bars');
const toggleHistoryBtn = document.getElementById('toggle-history-btn');
const historySection = document.getElementById('history-section');

// Navigation elements
const navDashboard = document.getElementById('nav-dashboard');
const navInsights = document.getElementById('nav-insights');
const insightsView = document.getElementById('insights-view');
const insightsGrid = document.getElementById('insights-grid');
const insightsYearNav = document.getElementById('insights-year-nav');
const insightsMonthNav = document.getElementById('insights-month-nav');

// Application State
let g_allData = null;
let g_yearlyData = {};
let g_selectedYear = null;
let g_showHistory = false;
let g_monthlyIncomeMap = {};
let g_currentHistoryRows = [];
let g_currentPage = 'dashboard'; // 'dashboard' or 'insights'
let g_selectedMonth = 'All'; // 'All' or 0-11

// Chart Instances
let g_categoryChartInst = null;

// Persistent Color Map
const CATEGORY_PALETTE = [
    '#6366f1', // Indigo
    '#f43f5e', // Rose
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#06b6d4', // Cyan
    '#ec4899', // Pink
    '#3b82f6', // Blue
    '#f97316', // Orange
    '#84cc16', // Lime
    '#0ea5e9', // Sky
    '#d946ef'  // Fuchsia
];
let g_categoryColorMap = {};
let g_paletteIndex = 0;

function getCategoryColor(name) {
    if (!g_categoryColorMap[name]) {
        g_categoryColorMap[name] = CATEGORY_PALETTE[g_paletteIndex % CATEGORY_PALETTE.length];
        g_paletteIndex++;
    }
    return g_categoryColorMap[name];
}

const CATEGORY_EMOJI_MAP = {
    'casa': '🏠',
    'moradia': '🏠',
    'comida': '🍔',
    'alimentaçao': '🍔',
    'alimentação': '🍔',
    'restaurantes': '🍕',
    'supermercado': '🛒',
    'transporte': '🚗',
    'carro': '🚗',
    'combustivel': '⛽',
    'combustível': '⛽',
    'lazer': '🍿',
    'viagens': '✈️',
    'saude': '🏥',
    'saúde': '🏥',
    'farmacia': '💊',
    'farmácia': '💊',
    'educaçao': '📚',
    'educação': '📚',
    'compras': '🛍️',
    'shopping': '🛍️',
    'investimentos': '📈',
    'depositos': '💰',
    'depósitos': '💰',
    'salario': '💵',
    'salário': '💵',
    'telecomunicaçoes': '📱',
    'telecomunicações': '📱',
    'internet': '🌐',
    'telemovel': '📱',
    'telemóvel': '📱',
    'ginasio': '🏋️',
    'ginásio': '🏋️',
    'desporto': '⚽',
    'presentes': '🎁',
    'animais': '🐾',
    'pet': '🐾',
    'seguros': '🛡️',
    'impostos': '📑',
    'serviços': '🛠️',
    'serviços': '🛠️',
    'uncategorized': '❓',
    'default': '💰'
};

function getCategoryEmoji(name) {
    const key = name.toLowerCase().trim();
    for (const [pattern, emoji] of Object.entries(CATEGORY_EMOJI_MAP)) {
        if (key.includes(pattern)) return emoji;
    }
    return '💰';
}

// Register DataLabels plugin for all charts
Chart.register(ChartDataLabels);

// Initial check
window.addEventListener('DOMContentLoaded', () => {
    if (!WEB_APP_URL) {
        showView('setup');
    } else {
        showPage('dashboard');
        loadCachedData();
    }
});

// Save URL Handler
saveUrlBtn.addEventListener('click', () => {
    const url = urlInput.value.trim();
    if (url.startsWith('https://script.google.com')) {
        localStorage.setItem('sheet_url', url);
        WEB_APP_URL = url;
        showView('dashboard');
        fetchData();
    } else {
        alert('Please enter a valid Google Apps Script URL');
    }
});

resetBtn.addEventListener('click', () => {
    if (confirm("Reset everything? You will need to paste your secret URL again.")) {
        localStorage.clear();
        location.reload();
    }
});

toggleHistoryBtn.addEventListener('click', () => {
    g_showHistory = !g_showHistory;
    renderHistoryToggle();
});

navDashboard.addEventListener('click', () => showPage('dashboard'));
navInsights.addEventListener('click', () => showPage('insights'));

function showView(view) {
    setupView.classList.add('hidden');
    dashboardView.classList.add('hidden');
    insightsView.classList.add('hidden');

    if (view === 'setup') {
        setupView.classList.remove('hidden');
    } else if (view === 'dashboard' || view === 'insights') {
        showPage(view);
    }
}

function showPage(page) {
    g_currentPage = page;

    setupView.classList.add('hidden');
    dashboardView.classList.add('hidden');
    insightsView.classList.add('hidden');

    navDashboard.classList.remove('active');
    navInsights.classList.remove('active');

    if (page === 'dashboard') {
        dashboardView.classList.remove('hidden');
        navDashboard.classList.add('active');
        renderRecap();
    } else if (page === 'insights') {
        insightsView.classList.remove('hidden');
        navInsights.classList.add('active');
        renderMonthNav();
        renderInsights();
    }
}

function loadCachedData() {
    const cachedData = localStorage.getItem('sheet_data');
    const lastUpdate = localStorage.getItem('sheet_last_update');
    if (cachedData) {
        g_allData = JSON.parse(cachedData);
        processData(g_allData);
        lastUpdatedLabel.innerText = `Last updated: ${lastUpdate}`;
    } else {
        fetchData();
    }
}

refreshBtn.addEventListener('click', () => {
    refreshBtn.classList.add('spinning');
    fetchData();
});

async function fetchData() {
    try {
        const response = await fetch(WEB_APP_URL);
        if (!response.ok) throw new Error('Could not connect to sheet');
        const data = await response.json();
        if (typeof data === 'string' && data.startsWith('ERROR')) {
            throw new Error(data);
        }
        const now = new Date().toLocaleString();
        localStorage.setItem('sheet_data', JSON.stringify(data));
        localStorage.setItem('sheet_last_update', now);
        g_allData = data;
        processData(data);
        lastUpdatedLabel.innerText = `Last updated: ${now}`;
    } catch (error) {
        console.error(error);
        dataContainer.innerHTML = `<div class="loader error">⚠️ ${error.message}</div>`;
    } finally {
        refreshBtn.classList.remove('spinning');
    }
}

function processData(rows) {
    if (!rows || rows.length < 2) {
        dataContainer.innerHTML = '<div class="loader">No data found in your sheet.</div>';
        return;
    }
    g_yearlyData = {};
    const rawData = rows.slice(1);
    rawData.forEach(row => {
        const dateStr = row[0] ? row[0].toString().trim() : '';
        if (!dateStr) return;
        const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
        if (parts.length < 3) return;
        let year;
        if (parts[2].length === 4) year = parts[2];
        else if (parts[0].length === 4) year = parts[0];
        if (year) {
            if (!g_yearlyData[year]) g_yearlyData[year] = [];
            g_yearlyData[year].push(row);
        }
    });
    renderYearNav();
    const availableYears = Object.keys(g_yearlyData).sort((a, b) => b - a);
    if (availableYears.length > 0) {
        selectYear(availableYears[0]);
    }
}

function renderYearNav() {
    const years = Object.keys(g_yearlyData).sort((a, b) => b - a);

    const updateNav = (container) => {
        if (!container) return;
        container.innerHTML = '';
        years.forEach(year => {
            const tab = document.createElement('div');
            tab.className = `year-tab ${year === g_selectedYear ? 'active' : ''}`;
            tab.innerText = year;
            tab.onclick = () => selectYear(year);
            container.appendChild(tab);
        });
    };

    updateNav(yearNav);
    updateNav(insightsYearNav);
}

function renderMonthNav() {
    if (!insightsMonthNav) return;
    insightsMonthNav.innerHTML = '';

    const months = ['All', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    months.forEach((month, index) => {
        const val = index === 0 ? 'All' : index - 1;
        const tab = document.createElement('div');
        tab.className = `month-tab ${g_selectedMonth === val ? 'active' : ''}`;
        tab.innerText = month;
        tab.onclick = () => selectMonth(val);
        insightsMonthNav.appendChild(tab);
    });
}

function selectMonth(month) {
    g_selectedMonth = month;
    renderMonthNav();
    renderInsights();
}

function selectYear(year) {
    g_selectedYear = year;
    renderYearNav();
    if (g_currentPage === 'dashboard') {
        renderRecap();
        renderHistoryToggle();
    } else {
        renderInsights();
    }
}

function renderRecap() {
    const data = g_yearlyData[g_selectedYear] || [];
    let curTotalIncome = 0;
    let curTotalExpenses = 0;
    let curTotalInvestments = 0;
    const categoryMap = {};
    const monthlyIncomeMap = {};

    data.forEach(row => {
        const dateStr = row[0] ? row[0].toString().trim() : '';
        let month = 0;
        if (dateStr) {
            const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
            if (parts.length >= 3) {
                if (parts[2].length === 4) month = parseInt(parts[1]) - 1;
                else if (parts[0].length === 4) month = parseInt(parts[1]) - 1;
            }
        }
        let valStr = row[3] ? row[3].toString() : '0';
        valStr = valStr.replace(/[€\s]/g, '').replace(',', '.').replace('-', '');
        const val = parseFloat(valStr) || 0;
        const cat = (row[1] || 'Uncategorized').toString().trim();
        const catLower = cat.toLowerCase();
        if (catLower === 'depositos') {
            curTotalIncome += val;
            monthlyIncomeMap[month] = (monthlyIncomeMap[month] || 0) + val;
        } else if (catLower === 'investimentos') {
            curTotalInvestments += val;
        } else {
            curTotalExpenses += val;
        }
        categoryMap[cat] = (categoryMap[cat] || 0) + val;
    });

    const curNetSavings = curTotalIncome - curTotalExpenses;
    const savingsRate = curTotalIncome > 0 ? (curNetSavings / curTotalIncome) * 100 : 0;

    totalYearLabel.innerText = `€${curNetSavings.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`;
    document.getElementById('savings-rate').innerText = `${savingsRate.toFixed(1)}% Saved`;
    totalIncomeLabel.innerText = `€${curTotalIncome.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`;
    totalExpensesLabel.innerText = `€${curTotalExpenses.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`;
    totalInvestmentsLabel.innerText = `€${curTotalInvestments.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`;

    const prevYear = (parseInt(g_selectedYear) - 1).toString();
    const prevData = g_yearlyData[prevYear];
    const setGrowth = (id, current, previous, reverseColor = false) => {
        const container = document.getElementById(id);
        if (!container) return;
        container.innerHTML = '';
        if (!previous || previous === 0) return;
        const diff = ((current - previous) / previous) * 100;
        const isPos = diff >= 0;
        const isGood = reverseColor ? !isPos : isPos;
        container.innerHTML = `<span class="growth-badge ${isGood ? 'growth-positive' : 'growth-negative'}">
            ${isPos ? '↑' : '↓'} ${Math.abs(diff).toFixed(1)}% vs ${prevYear}
        </span>`;
    };

    if (prevData) {
        let prevIncome = 0, prevExpenses = 0, prevInvestments = 0;
        prevData.forEach(row => {
            let valStr = row[3] ? row[3].toString() : '0';
            valStr = valStr.replace(/[€\s]/g, '').replace(',', '.').replace('-', '');
            const val = parseFloat(valStr) || 0;
            const cat = (row[1] || '').toString().trim().toLowerCase();
            if (cat === 'depositos') prevIncome += val;
            else if (cat === 'investimentos') prevInvestments += val;
            else prevExpenses += val;
        });
        setGrowth('growth-income', curTotalIncome, prevIncome);
        setGrowth('growth-expenses', curTotalExpenses, prevExpenses, true);
        setGrowth('growth-investments', curTotalInvestments, prevInvestments);
    } else {
        ['growth-income', 'growth-expenses', 'growth-investments'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '';
        });
    }

    const sortedCategories = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);
    renderCategoryBars(sortedCategories, curTotalIncome, curTotalExpenses, curTotalInvestments);

    g_monthlyIncomeMap = monthlyIncomeMap;
}

function renderCategoryBars(categories, totalIncome, totalExpenses, totalInvestments) {
    categoryBarsContainer.innerHTML = '';
    categories.forEach(([name, value]) => {
        const catLower = name.toLowerCase();
        if (catLower === 'depositos' || catLower === 'investimentos') return;

        const color = getCategoryColor(name);
        const emoji = getCategoryEmoji(name);
        const percentage = totalExpenses > 0 ? (value / totalExpenses) * 100 : 0;

        const barItem = document.createElement('div');
        barItem.className = 'bar-item';
        barItem.innerHTML = `
            <div class="bar-info">
                <span class="bar-label">${emoji} ${name}</span>
                <span class="bar-value">€${value.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} (${percentage.toFixed(1)}%)</span>
            </div>
            <div class="bar-bg">
                <div class="bar-fill" style="width: ${percentage}%; background-color: ${color};"></div>
            </div>
        `;
        categoryBarsContainer.appendChild(barItem);
    });
}

function renderHistoryToggle() {
    if (g_showHistory) {
        toggleHistoryBtn.innerText = "📁 Hide Transactions";
        historySection.classList.remove('hidden');
        renderTransactionList(g_yearlyData[g_selectedYear] || []);
    } else {
        toggleHistoryBtn.innerText = `📦 Show ${g_selectedYear} Transactions`;
        historySection.classList.add('hidden');
    }
}

function renderTransactionList(rows) {
    g_currentHistoryRows = rows;
    renderHistoryInner(rows);
}

function renderHistoryInner(dataToRender) {
    dataContainer.innerHTML = '';
    if (dataToRender.length === 0) {
        dataContainer.innerHTML = '<div class="loader">No transactions found.</div>';
        return;
    }
    dataToRender.forEach((row, index) => {
        try {
            const card = document.createElement('div');
            card.className = 'data-card';
            const title = row[4] || `Entry ${index + 1}`;
            const cat = (row[1] || '').toString().trim().toLowerCase();
            const isIncome = cat === 'depositos';
            const isInvestment = cat === 'investimentos';
            const dateStr = row[0] ? row[0].toString().trim() : '';
            const displayDate = dateStr.split(' ')[0].split('T')[0];
            let month = 0;
            if (dateStr) {
                const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
                if (parts.length >= 3) {
                    if (parts[2].length === 4) month = parseInt(parts[1]) - 1;
                    else if (parts[0].length === 4) month = parseInt(parts[1]) - 1;
                }
            }
            let valueColor = 'white';
            if (isIncome) valueColor = 'var(--income-color)';
            if (isInvestment) valueColor = 'var(--investment-color)';
            let workHoursHtml = '';
            const rawVal = row[3] ? row[3].toString() : '0';
            const value = parseFloat(rawVal.replace(/[€\s]/g, '').replace(',', '.').replace('-', '')) || 0;

            if (!isIncome) {
                const monthlyIncome = g_monthlyIncomeMap[month] || 0;
                const hoursPerMonth = 190.67;
                if (monthlyIncome > 0) {
                    const hourlyRate = monthlyIncome / hoursPerMonth;
                    const hoursNeeded = (value / hourlyRate).toFixed(1);
                    workHoursHtml = `<div class="work-hours-badge" style="margin:0;">⌛ ${hoursNeeded}h work</div>`;
                }
            }

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.8rem;">
                    <h3 style="margin: 0; font-size: 1rem;">${title}</h3>
                    <span style="font-size: 0.75rem; color: var(--text-dim); background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px;">${displayDate}</span>
                </div>
                <div class="data-item">
                    <span class="data-label">Categoria</span>
                    <span class="data-value">${row[1] || '-'}</span>
                </div>
                <div class="data-item">
                    <span class="data-label">Sub-Categoria</span>
                    <span class="data-value">${row[2] || '-'}</span>
                </div>
                <div class="data-item" style="border-top: 1px solid var(--glass-border); margin-top: 0.8rem; padding-top: 0.8rem; justify-content: flex-end; align-items: center; gap: 12px;">
                    ${workHoursHtml}
                    <span class="data-value" style="font-size: 1.1rem; color: ${valueColor};">€${value.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</span>
                </div>
            `;
            dataContainer.appendChild(card);
        } catch (e) {
            console.error("Error rendering row:", index, e);
        }
    });
}

searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = g_currentHistoryRows.filter(row =>
        row.some(cell => cell && cell.toString().toLowerCase().includes(query))
    );
    renderHistoryInner(filtered);
});
function renderInsights() {
    const data = g_yearlyData[g_selectedYear] || [];
    const insightsGrid = document.getElementById('insights-grid');
    insightsGrid.innerHTML = '';

    if (data.length === 0) {
        insightsGrid.innerHTML = '<div class="loader">No data available for this year.</div>';
        return;
    }

    // groups[Category][Subcategory] = sum
    // biggest[Category] = { name, value }
    const groups = {};
    const biggest = {};

    data.forEach(row => {
        const dateStr = row[0] ? row[0].toString().trim() : '';
        let month = -1;
        if (dateStr) {
            const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
            if (parts.length >= 3) {
                if (parts[2].length === 4) month = parseInt(parts[1]) - 1;
                else if (parts[0].length === 4) month = parseInt(parts[1]) - 1;
            }
        }

        // Apply Month Filter
        if (g_selectedMonth !== 'All' && month !== g_selectedMonth) return;

        const cat = (row[1] || 'Uncategorized').toString().trim();
        const sub = (row[2] || 'Default').toString().trim();
        const name = (row[4] || 'Expense').toString().trim();
        const catLower = cat.toLowerCase();

        // Skip Income/Investments for the detailed *Expense* breakdown
        if (catLower === 'depositos' || catLower === 'investimentos') return;

        let valStr = row[3] ? row[3].toString() : '0';
        valStr = valStr.replace(/[€\s]/g, '').replace(',', '.').replace('-', '');
        const val = parseFloat(valStr) || 0;

        // Grouping
        if (!groups[cat]) groups[cat] = {};
        groups[cat][sub] = (groups[cat][sub] || 0) + val;

        // Biggest Expense
        if (!biggest[cat] || val > biggest[cat].value) {
            biggest[cat] = { name, value: val };
        }
    });

    const categories = Object.keys(groups).sort();

    if (categories.length === 0) {
        insightsGrid.innerHTML = '<div class="loader">No expenses found for this month.</div>';
        return;
    }

    categories.forEach(cat => {
        const card = document.createElement('div');
        card.className = 'insight-card';

        const emoji = getCategoryEmoji(cat);
        let subHtml = '';
        const subs = Object.entries(groups[cat]).sort((a, b) => b[1] - a[1]);
        subs.forEach(([subName, subVal]) => {
            subHtml += `
                <div class="subcategory-item">
                    <span class="subcategory-name">${subName}</span>
                    <span class="subcategory-value">€${subVal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</span>
                </div>
            `;
        });

        const top = biggest[cat];
        const topHtml = top ? `
            <div class="biggest-expense">
                <span class="biggest-expense-label">Biggest Single Spend</span>
                <span class="biggest-expense-name">${top.name}</span>
                <span class="biggest-expense-value">€${top.value.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</span>
            </div>
        ` : '';

        card.innerHTML = `
            <div class="insight-header">
                <h4>${emoji} ${cat}</h4>
            </div>
            <div class="subcategory-list">
                ${subHtml}
            </div>
            ${topHtml}
        `;
        insightsGrid.appendChild(card);
    });

    // Update History if visible to match month filter
    if (g_showHistory) {
        const filteredData = data.filter(row => {
            const dateStr = row[0] ? row[0].toString().trim() : '';
            if (!dateStr) return g_selectedMonth === 'All';
            const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
            let m = -1;
            if (parts.length >= 3) {
                if (parts[2].length === 4) m = parseInt(parts[1]) - 1;
                else if (parts[0].length === 4) m = parseInt(parts[1]) - 1;
            }
            return g_selectedMonth === 'All' || m === g_selectedMonth;
        });
        renderTransactionList(filteredData);
    }

    updateCategoryChart(groups);
}

function updateCategoryChart(groups) {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;

    const labels = Object.keys(groups);
    const data = labels.map(cat => Object.values(groups[cat]).reduce((a, b) => a + b, 0));
    const backgroundColors = labels.map(getCategoryColor);

    if (g_categoryChartInst) g_categoryChartInst.destroy();

    g_categoryChartInst = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderWidth: 0,
                hoverOffset: 20
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#94a3b8',
                        font: { family: 'Outfit', size: 11 },
                        padding: 20
                    }
                },
                datalabels: {
                    color: '#fff',
                    font: {
                        family: 'Outfit',
                        weight: 'bold',
                        size: 11
                    },
                    formatter: (value, ctx) => {
                        const label = ctx.chart.data.labels[ctx.dataIndex];
                        const emoji = getCategoryEmoji(label);
                        return `${emoji} ${label}`;
                    },
                    display: (context) => {
                        const dataset = context.dataset;
                        const value = dataset.data[context.dataIndex];
                        const total = dataset.data.reduce((a, b) => a + b, 0);
                        return (value / total) > 0.05; // Show only if > 5%
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => `€${context.parsed.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`
                    }
                }
            },
            cutout: '65%'
        }
    });
}
