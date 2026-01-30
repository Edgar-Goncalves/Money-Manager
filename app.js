/**
 * Money Manager - SOLID Refactor (Fixed & Robust)
 * Modular, class-based architecture for better maintainability.
 */

// --- 1. CONFIGURATION ---
const Config = {
    STORAGE_KEY: 'sheet_url',
    CACHE_KEY: 'money_manager_cache',
    PALETTE: [
        '#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6',
        '#06b6d4', '#ec4899', '#3b82f6', '#f97316', '#84cc16',
        '#0ea5e9', '#d946ef'
    ],
    EMOJIS: {
        'casa': '🏠', 'moradia': '🏠', 'comida': '🍔', 'alimentaçao': '🍔', 'alimentação': '🍔',
        'restaurantes': '🍕', 'supermercado': '🍎', 'super mercado': '🍎', 'transporte': '🚗', 'carro': '🚗',
        'combustivel': '⛽', 'combustível': '⛽', 'lazer': '🍿', 'viagens': '✈️',
        'saude': '🏥', 'saúde': '🏥', 'farmacia': '💊', 'farmácia': '💊',
        'educaçao': '📚', 'educação': '📚', 'compras': '🛍️', 'shopping': '🛍️',
        'investimentos': '📈', 'depositos': '💰', 'depósitos': '💰', 'salario': '💵',
        'salário': '💵', 'telecomunicaçoes': '📱', 'telecomunicações': '📱',
        'internet': '🌐', 'telemovel': '📱', 'telemóvel': '📱', 'ginasio': '🏋️',
        'ginásio': '🏋️', 'desporto': '⚽', 'presentes': '🎁', 'animais': '🐾',
        'pet': '🐾', 'seguros': '🛡️', 'impostos': '📑', 'serviços': '🛠️',
        'gadgets': '📱', 'roupas': '👕', 'despesas': '💸',
        'uncategorized': '❓', 'default': '💰'
    },
    MONTHS: {
        1: 'January', 2: 'February', 3: 'March', 4: 'April', 5: 'May', 6: 'June',
        7: 'July', 8: 'August', 9: 'September', 10: 'October', 11: 'November', 12: 'December'
    }
};

// --- 2. UTILS ---
class Utils {
    static formatCurrency(val) {
        return `€${(val || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`;
    }

    static parseValue(valStr) {
        if (valStr === undefined || valStr === null) return 0;
        let s = valStr.toString().replace(/[€\s]/g, '').replace(',', '.').replace('-', '');
        return parseFloat(s) || 0;
    }

    static parseDate(dateStr) {
        if (!dateStr) return { year: null, month: -1 };
        const str = dateStr.toString().trim();
        const parts = str.includes('/') ? str.split('/') : str.split('-');
        if (parts.length < 3) return { year: null, month: -1 };

        let year = null, month = -1;
        // Detect Year (Check 4-digit parts)
        if (parts[0].length === 4) {
            year = parts[0];
            month = parseInt(parts[1]) - 1;
        } else if (parts[2].length === 4) {
            year = parts[2];
            month = parseInt(parts[1]) - 1;
        }

        // Final sanity check for month
        if (isNaN(month) || month < 0 || month > 11) month = -1;

        return { year, month };
    }

    static getCategoryEmoji(name) {
        if (!name) return Config.EMOJIS.default;
        const key = name.toLowerCase().trim();
        for (const [pattern, emoji] of Object.entries(Config.EMOJIS)) {
            if (key.includes(pattern)) return emoji;
        }
        return Config.EMOJIS.default;
    }
}

// --- 3. API SERVICE ---
class ApiService {
    constructor(url) {
        this.url = url;
    }

    async fetchData() {
        try {
            console.log("Fetching data from:", this.url);
            const resp = await fetch(this.url);
            const data = await resp.json();
            if (data.status === 'success') return data.data;
            // Fallback for direct arrays
            if (Array.isArray(data)) return data;
            throw new Error('Unexpected data format');
        } catch (e) {
            console.error('Fetch failed:', e);
            return null;
        }
    }
}

// --- 4. STATE MANAGER ---
class StateManager {
    constructor() {
        this.allData = null;
        this.yearlyData = {};
        this.selectedYear = null;
        this.selectedMonth = 'All';
        this.showHistory = false;
        this.colorMap = {};
        this.paletteIndex = 0;
        this.listeners = [];
    }

    subscribe(callback) {
        this.listeners.push(callback);
    }

    notify() {
        this.listeners.forEach(cb => {
            try { cb(this); } catch (e) { console.error("Subscriber failed:", e); }
        });
    }

    setData(data) {
        if (!Array.isArray(data)) return;
        this.allData = data;
        this.processYearlyData();
        const years = Object.keys(this.yearlyData).sort((a, b) => b - a);

        // Ensure selectedYear is set before processing dashboard data
        if (years.length > 0) {
            if (!this.selectedYear || !this.yearlyData[this.selectedYear]) {
                this.selectedYear = years[0];
            }
        }

        // Prepare data for dashboard chart
        const sortedMonths = Object.keys(Config.MONTHS).map(Number).sort((a, b) => a - b);
        const curKeys = sortedMonths.map(m => `${Utils.getCategoryEmoji(Config.MONTHS[m])} ${Config.MONTHS[m].substring(0, 3)}`);

        const incomeTrend = [];
        const expenseTrend = [];
        const investmentTrend = [];

        // Aggregate data by month for the selected year
        const currentYearRows = this.getCurrentYearData(); // Get data for the currently selected year

        sortedMonths.forEach(m => {
            let mInc = 0, mExp = 0, mInv = 0;

            // Filter current year data for this month
            currentYearRows.forEach(row => {
                const { year, month } = Utils.parseDate(row[0]);
                if (year == this.selectedYear && month === (m - 1)) { // month from parseDate is 0-indexed
                    const val = Utils.parseValue(row[3]);
                    const cat = (row[1] || '').toLowerCase();

                    if (cat === 'depositos' || cat === 'depósitos') {
                        mInc += val;
                    } else if (cat === 'investimentos') {
                        mInv += val;
                    } else {
                        mExp += val;
                    }
                }
            });

            incomeTrend.push(mInc);
            expenseTrend.push(mExp);
            investmentTrend.push(mInv);
        });

        // Assuming this.dashboardChartManager is available and initialized
        // This call should ideally be in UIRenderer.renderDashboard, but placing it here as per instruction's snippet location.
        // The UIRenderer will need access to these aggregated trends.
        // For now, we'll call it directly, but a refactor might pass these trends to the UIRenderer.
        if (this.dashboardChartManager) { // Check if dashboardChartManager exists
            this.dashboardChartManager.updateDashboard(curKeys, incomeTrend, expenseTrend, investmentTrend);
        }

        this.notify();
    }

    processYearlyData() {
        this.yearlyData = {};
        if (!this.allData) return;

        this.allData.forEach((row, idx) => {
            // Basic validation for finance row (Date, Category, Sub, Val, Name)
            if (!row || row.length < 4) return;

            const dateStr = row[0];
            const { year } = Utils.parseDate(dateStr);

            // Skip header or non-date rows
            if (!year || isNaN(year)) return;

            if (!this.yearlyData[year]) this.yearlyData[year] = [];
            this.yearlyData[year].push(row);
        });
    }

    setYear(year) {
        this.selectedYear = year;
        this.selectedMonth = 'All';
        this.notify();
    }

    setMonth(month) {
        this.selectedMonth = month;
        this.notify();
    }

    toggleHistory() {
        this.showHistory = !this.showHistory;
        this.notify();
    }

    getCategoryColor(name) {
        if (!this.colorMap[name]) {
            this.colorMap[name] = Config.PALETTE[this.paletteIndex % Config.PALETTE.length];
            this.paletteIndex++;
        }
        return this.colorMap[name];
    }

    getCurrentYearData() {
        return this.yearlyData[this.selectedYear] || [];
    }

    getFilteredData() {
        const data = this.getCurrentYearData();
        if (this.selectedMonth === 'All') return data;
        return data.filter(row => Utils.parseDate(row[0]).month === this.selectedMonth);
    }
}

// --- 5. CHART MANAGER ---
class ChartManager {
    constructor(canvasId) {
        this.canvasId = canvasId;
        this.instance = null;
        if (typeof Chart !== 'undefined' && typeof ChartDataLabels !== 'undefined') {
            Chart.register(ChartDataLabels);
        }
    }

    updateDashboard(labels, incomeData, expenseData, investmentData) {
        if (this.instance) this.instance.destroy();
        const ctx = document.getElementById(this.canvasId);
        if (!ctx) return;

        this.instance = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Income',
                        data: incomeData,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Expenses',
                        data: expenseData,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Investments',
                        data: investmentData,
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { labels: { color: '#94a3b8', font: { family: 'Outfit', size: 11 } } },
                    tooltip: {
                        callbacks: {
                            label: (c) => ' ' + c.dataset.label + ': ' + Utils.formatCurrency(c.raw)
                        },
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        padding: 10,
                        itemSort: (a, b) => b.raw - a.raw
                    },
                    datalabels: { display: false } // Disable datalabels for this chart to avoid clutter
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                        ticks: { color: '#94a3b8', font: { family: 'Outfit', size: 10 } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8', font: { family: 'Outfit', size: 10 } }
                    }
                }
            }
        });
    }

    update(labels, values, colors) {
        const ctx = document.getElementById(this.canvasId);
        if (!ctx || typeof Chart === 'undefined') return;
        if (this.instance) this.instance.destroy();

        if (labels.length === 0) return;

        this.instance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderRadius: 8,
                    borderWidth: 0,
                    barThickness: 'flex',
                    maxBarThickness: 50
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        color: '#fff',
                        font: { family: 'Outfit', weight: 'bold', size: 10 },
                        formatter: (val) => Utils.formatCurrency(val).split(',')[0],
                        offset: 4,
                        clip: false
                    },
                    tooltip: { callbacks: { label: (ctx) => Utils.formatCurrency(ctx.parsed.y) } }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grace: '15%',
                        grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                        ticks: { color: '#94a3b8', font: { family: 'Outfit', size: 10 } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8', font: { family: 'Outfit', size: 10 } }
                    }
                }
            }
        });
    }
}

// --- 6. UI RENDERER ---
class UIRenderer {
    constructor(state) {
        this.state = state;
        this.chartManager = new ChartManager('categoryChart');
        this.dashboardChartManager = new ChartManager('dashboardChart');
        this.heatmapChartManager = new ChartManager('heatmapChart');
    }

    safeSetText(id, text) {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    }

    render() {
        this.renderNavs();
        this.renderDashboard();
        this.renderInsights();
    }

    renderNavs() {
        const yearNav = document.getElementById('year-nav');
        const insightsYearNav = document.getElementById('insights-year-nav');
        const insightsMonthNav = document.getElementById('insights-month-nav');

        const navDashboard = document.getElementById('nav-dashboard');
        const navInsights = document.getElementById('nav-insights');
        const navInvestments = document.getElementById('nav-investments');
        const dashboardView = document.getElementById('dashboard-view');
        const insightsView = document.getElementById('insights-view');
        const investmentsView = document.getElementById('investments-view');

        const switchView = (viewName) => {
            [navDashboard, navInsights, navInvestments].forEach(btn => btn?.classList.remove('active'));
            [dashboardView, insightsView, investmentsView].forEach(view => view?.classList.add('hidden'));

            if (viewName === 'dashboard') {
                navDashboard?.classList.add('active');
                dashboardView?.classList.remove('hidden');
                this.renderDashboard(); // Only render dashboard, not the whole app
            } else if (viewName === 'insights') {
                navInsights?.classList.add('active');
                insightsView?.classList.remove('hidden');
                this.renderInsights();
            } else if (viewName === 'investments') {
                navInvestments?.classList.add('active');
                investmentsView?.classList.remove('hidden');
                this.renderInvestments();
            }
        };

        if (navDashboard) navDashboard.onclick = () => switchView('dashboard');
        if (navInsights) navInsights.onclick = () => switchView('insights');
        if (navInvestments) navInvestments.onclick = () => switchView('investments');

        const investmentsYearNav = document.getElementById('investments-year-nav');

        const years = Object.keys(this.state.yearlyData).sort((a, b) => b - a);

        [document.getElementById('year-nav'), document.getElementById('insights-year-nav'), investmentsYearNav].forEach(nav => {
            if (!nav) return;
            nav.innerHTML = '';

            // Add 'All' option specifically for investments page
            if (nav.id === 'investments-year-nav') {
                const allBtn = document.createElement('button');
                allBtn.className = `year-tab ${this.state.selectedYear === 'All' ? 'active' : ''}`;
                allBtn.innerText = 'All Years';
                allBtn.onclick = () => window.app.handleYearSelect('All');
                nav.appendChild(allBtn);
            }

            years.forEach(yr => {
                const btn = document.createElement('button');
                btn.className = `year-tab ${this.state.selectedYear === yr ? 'active' : ''}`;
                btn.innerText = yr;
                btn.onclick = () => window.app.handleYearSelect(yr);
                nav.appendChild(btn);
            });
        });

        if (insightsMonthNav) {
            insightsMonthNav.innerHTML = '';
            ['All', ...Array.from({ length: 12 }, (_, i) => i)].forEach(m => {
                const btn = document.createElement('button');
                btn.className = `month-tab ${this.state.selectedMonth === m ? 'active' : ''}`;
                btn.innerText = m === 'All' ? 'All Months' : new Date(2000, m).toLocaleString('default', { month: 'short' });
                btn.onclick = () => window.app.handleMonthSelect(m);
                insightsMonthNav.appendChild(btn);
            });
        }
    }

    renderDashboard() {
        const data = this.state.getCurrentYearData();
        let totalIncome = 0, totalExpenses = 0, totalInvestments = 0;
        const catMap = {};

        data.forEach(row => {
            const cat = (row[1] || '').toString().trim();
            const val = Utils.parseValue(row[3]);
            const catLower = cat.toLowerCase();
            if (catLower === 'depositos' || catLower === 'depósitos') totalIncome += val;
            else if (catLower === 'investimentos') totalInvestments += val;
            else {
                totalExpenses += val;
                catMap[cat] = (catMap[cat] || 0) + val;
            }
        });

        this.safeSetText('total-year', Utils.formatCurrency(totalIncome - totalExpenses));
        this.safeSetText('total-income', Utils.formatCurrency(totalIncome));
        this.safeSetText('total-expenses', Utils.formatCurrency(totalExpenses));
        this.safeSetText('total-investments', Utils.formatCurrency(totalInvestments));
        this.safeSetText('savings-rate', `${totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1) : 0}% Saved`);

        this.renderGrowth(totalIncome, totalExpenses, totalInvestments);
        this.renderBars(catMap, totalExpenses);

        // --- DASHBOARD CHART AGGREGATION ---
        const sortedMonths = Object.keys(Config.MONTHS).map(Number).sort((a, b) => a - b);
        const curKeys = sortedMonths.map(m => `${Config.MONTHS[m].substring(0, 3)}`); // e.g. "Jan", "Feb"

        const incomeTrend = [];
        const expenseTrend = [];
        const investmentTrend = [];

        sortedMonths.forEach(m => {
            let mInc = 0, mExp = 0, mInv = 0;

            // Filter global current year data for this month independently of dashboard totals
            data.forEach(row => {
                const dateObj = Utils.parseDate(row[0]);
                // parseDate returns { year, month: 0-11 } or { year: null, month: -1 }
                if (dateObj && dateObj.month !== -1 && (dateObj.month + 1) === m) {
                    const val = Utils.parseValue(row[3]);
                    const cat = (row[1] || '').toLowerCase();

                    if (cat === 'depositos' || cat === 'depósitos') {
                        mInc += val;
                    } else if (cat === 'investimentos') {
                        mInv += val;
                    } else {
                        mExp += val;
                    }
                }
            });

            incomeTrend.push(mInc);
            expenseTrend.push(mExp);
            investmentTrend.push(mInv);
        });

        if (this.dashboardChartManager) {
            this.dashboardChartManager.updateDashboard(curKeys, incomeTrend, expenseTrend, investmentTrend);
        }
    }

    renderGrowth(curInc, curExp, curInv) {
        if (!this.state.selectedYear) return;
        const prevYear = (parseInt(this.state.selectedYear) - 1).toString();
        const prevData = this.state.yearlyData[prevYear];

        const setBadge = (id, cur, prev, rev = false) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.innerHTML = '';
            if (!prev || isNaN(prev)) return;
            const diff = ((cur - prev) / prev) * 100;
            const isGood = rev ? diff <= 0 : diff >= 0;
            el.innerHTML = `<span class="growth-badge ${isGood ? 'growth-positive' : 'growth-negative'}">
                ${diff >= 0 ? '↑' : '↓'} ${Math.abs(diff).toFixed(1)}% vs ${prevYear}
            </span>`;
        };

        if (prevData) {
            let pInc = 0, pExp = 0, pInv = 0;
            prevData.forEach(row => {
                const c = (row[1] || '').toLowerCase();
                const v = Utils.parseValue(row[3]);
                if (c === 'depositos' || c === 'depósitos') pInc += v;
                else if (c === 'investimentos') pInv += v;
                else pExp += v;
            });
            setBadge('growth-income', curInc, pInc);
            setBadge('growth-expenses', curExp, pExp, true);
            setBadge('growth-investments', curInv, pInv);
        } else {
            ['growth-income', 'growth-expenses', 'growth-investments'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = '';
            });
        }
    }

    renderBars(catMap, totalExp) {
        const container = document.getElementById('category-bars');
        if (!container) return;
        container.innerHTML = '';
        Object.entries(catMap).sort((a, b) => b[1] - a[1]).forEach(([name, val]) => {
            const perc = totalExp > 0 ? (val / totalExp * 100) : 0;
            const item = document.createElement('div');
            item.className = 'bar-item';
            item.innerHTML = `
                <div class="bar-info">
                    <span class="bar-label">${Utils.getCategoryEmoji(name)} ${name}</span>
                    <span class="bar-value">${Utils.formatCurrency(val)} (${perc.toFixed(1)}%)</span>
                </div>
                <div class="bar-bg">
                    <div class="bar-fill" style="width:${perc}%; background:${this.state.getCategoryColor(name)}"></div>
                </div>`;
            container.appendChild(item);
        });
    }

    renderInsights() {
        const data = this.state.getFilteredData();
        const grid = document.getElementById('insights-grid');
        if (!grid) return;
        grid.innerHTML = '';

        // Calculate hourly rate for work time display
        const currentYearData = this.state.getCurrentYearData();
        const yearlyIncome = currentYearData.reduce((acc, row) => {
            const cat = (row[1] || '').toLowerCase();
            return (cat === 'depositos' || cat === 'depósitos') ? acc + Utils.parseValue(row[3]) : acc;
        }, 0);
        const hourlyRate = yearlyIncome / (44 * 52);

        const groups = {}, biggest = {};
        data.forEach(row => {
            const cat = (row[1] || 'Other').toString().trim();
            const sub = (row[2] || 'Default').toString().trim();
            const name = (row[4] || 'Expense').toString().trim();
            const val = Utils.parseValue(row[3]);
            const catLower = cat.toLowerCase();
            if (catLower === 'depositos' || catLower === 'depósitos' || catLower === 'investimentos') return;

            if (!groups[cat]) groups[cat] = {};
            groups[cat][sub] = (groups[cat][sub] || 0) + val;
            if (!biggest[cat] || val > biggest[cat].value) biggest[cat] = { name, value: val };
        });

        Object.entries(groups).forEach(([cat, subs]) => {
            const card = document.createElement('div');
            card.className = 'insight-card';
            let subHtml = Object.entries(subs).sort((a, b) => b[1] - a[1]).map(([n, v]) => `
                <div class="subcategory-item"><span class="subcategory-name">${n}</span><span class="subcategory-value">${Utils.formatCurrency(v)}</span></div>
            `).join('');

            let biggestHtml = '';
            if (biggest[cat]) {
                const biggestVal = biggest[cat].value;
                let workTimeHtml = '';
                if (hourlyRate > 0) {
                    const hours = biggestVal / hourlyRate;
                    const hoursFormatted = hours >= 1 ? `${hours.toFixed(1)}h` : `${(hours * 60).toFixed(0)}m`;
                    workTimeHtml = `<span class="work-hours-badge">⏳ ${hoursFormatted}</span>`;
                }
                biggestHtml = `<div class="biggest-expense"><span class="biggest-expense-label">Biggest Spend</span><span class="biggest-expense-name">${biggest[cat].name}</span><span class="biggest-expense-value">${Utils.formatCurrency(biggestVal)} ${workTimeHtml}</span></div>`;
            }

            card.innerHTML = `
                <div class="insight-header"><h4>${Utils.getCategoryEmoji(cat)} ${cat}</h4></div>
                <div class="subcategory-list">${subHtml}</div>
                ${biggestHtml}
            `;
            grid.appendChild(card);
        });

        const labels = Object.keys(groups);
        const values = labels.map(c => Object.values(groups[c]).reduce((a, b) => a + b, 0));
        const colors = labels.map(c => this.state.getCategoryColor(c));
        this.chartManager.update(labels, values, colors);

        // Render Heatmap
        this.renderHeatmap(data);

        this.renderHistory(data);
    }

    renderHeatmap(data) {
        // Prepare 7x24 grid
        const grid = Array(7).fill(0).map(() => Array(24).fill(0));
        let maxVal = 0;

        data.forEach(row => {
            const dateStr = row[0];
            const timeStr = row[0]; // Assuming date field might contain time or we parse a separate field? 
            // Wait, standard GSheets date usually doesn't have time unless formatted. 
            // CHECK: The User's previous logs show dates like "2024-01-01". 
            // If there is no time data, a heatmap by hour is impossible.
            // Let's assume the date string might be "YYYY-MM-DD HH:mm:ss" OR we only do Day of Week if time is missing.

            // Let's safe check Utils.parseDate. It only returns year/month. 
            // modifying Utils.parseDate or checking raw row[0] is needed.
            // However, looking at standard personal finance sheets, exact time is rare.
            // IF NO TIME DATA: We can only show Day of Week intensity.
            // Let's check Utils.parseDate again. It splits by / or -.

            // Re-evaluating strategy: If strict time is missing, we can map just Day of Week (Sun-Sat).
            // Let's try to extract Day of Week from the date object.

            const d = Utils.parseDate(row[0]);
            if (!d.year) return;
            const dateObj = new Date(d.year, d.month, parseInt(row[0].split(/[/-]/)[0])); // rough parse
            // Actually, let's use a better Date parser if possible, or just standard JS Date(row[0]) if format allows.
            // Given "YYYY-MM-DD" or "DD/MM/YYYY", let's try to get Day of Week.

            // Helper to parse day of week
            const parts = row[0].includes('/') ? row[0].split('/') : row[0].split('-');
            let jsDate;
            if (parts[0].length === 4) jsDate = new Date(parts[0], parts[1] - 1, parts[2]); // YYYY-MM-DD
            else jsDate = new Date(parts[2], parts[1] - 1, parts[0]); // DD-MM-YYYY

            if (!jsDate || isNaN(jsDate.getTime())) return;

            const dayOfWeek = jsDate.getDay(); // 0=Sun, 6=Sat
            // Arbitrarily assigning to "12pm" (hour 12) if no time exists, 
            // BUT if the user HAS time in the string (e.g. "2024-01-01 14:30"), we capture it.

            let hour = 12; // Default to noon if no time
            if (row[0].includes(':')) {
                const timeParts = row[0].split(' ')[1];
                if (timeParts) hour = parseInt(timeParts.split(':')[0]);
            }

            const val = Utils.parseValue(row[3]);
            // Only count expenses
            const cat = (row[1] || '').toLowerCase();
            if (cat !== 'depositos' && cat !== 'depósitos' && cat !== 'investimentos') {
                grid[dayOfWeek][hour] += val;
                if (grid[dayOfWeek][hour] > maxVal) maxVal = grid[dayOfWeek][hour];
            }
        });

        const bubbles = [];
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        for (let d = 0; d < 7; d++) {
            for (let h = 0; h < 24; h++) {
                if (grid[d][h] > 0) {
                    bubbles.push({
                        x: h, // Hour
                        y: d, // Day
                        r: Math.min(Math.max((grid[d][h] / maxVal) * 20, 3), 20), // Scale radius 3-20px
                        v: grid[d][h] // Raw value for tooltip
                    });
                }
            }
        }

        const ctx = document.getElementById('heatmapChart');
        if (this.heatmapInstance) this.heatmapInstance.destroy();

        this.heatmapInstance = new Chart(ctx, {
            type: 'bubble',
            data: {
                datasets: [{
                    label: 'Spending Intensity',
                    data: bubbles,
                    backgroundColor: 'rgba(244, 63, 94, 0.6)', // Rose/Red
                    borderColor: 'rgba(244, 63, 94, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (c) => {
                                const day = days[c.raw.y];
                                const time = `${c.raw.x}:00`;
                                return `${day} @ ${time}: ${Utils.formatCurrency(c.raw.v)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'category',
                        labels: days,
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#94a3b8' }
                    },
                    x: {
                        type: 'linear',
                        min: -1,
                        max: 24,
                        position: 'bottom',
                        grid: { display: false },
                        ticks: {
                            stepSize: 2,
                            callback: (v) => `${v}:00`,
                            color: '#94a3b8'
                        }
                    }
                }
            }
        });
    }

    renderInvestments() {
        // Handle "All" years selection or specific year
        let data;
        if (this.state.selectedYear === 'All') {
            data = this.state.allData || [];
        } else {
            data = this.state.getFilteredData();
        }

        const container = document.getElementById('investments-container');
        const totalEl = document.getElementById('total-invested-view');
        if (!container || !totalEl) return;

        container.innerHTML = '';
        let totalInvested = 0;
        const investmentRows = [];

        data.forEach(row => {
            const cat = (row[1] || '').toLowerCase();
            if (cat === 'investimentos') {
                const val = Utils.parseValue(row[3]);
                totalInvested += val;
                investmentRows.push(row);
            }
        });

        this.safeSetText('total-invested-view', Utils.formatCurrency(totalInvested));

        // Sort by date descending
        investmentRows.sort((a, b) => {
            const da = Utils.parseDate(a[0]);
            const db = Utils.parseDate(b[0]);
            // Compare years first
            if (da.year !== db.year) return (db.year || 0) - (da.year || 0);
            return (db.month - da.month); // Rough sort by month if years equal (since we only parsed month index)
            // Ideally date parsing should be better for strict sorting but this fits current Utils
        });

        if (investmentRows.length === 0) {
            container.innerHTML = '<p class="text-dim" style="grid-column: 1/-1; text-align: center;">No investments found.</p>';
            return;
        }

        investmentRows.forEach(row => {
            const date = row[0];
            const cat = row[1];
            const sub = row[2];
            const val = Utils.parseValue(row[3]);
            const desc = row[4] || '';

            // Reuse transaction card style
            const card = document.createElement('div');
            card.className = 'data-card';
            card.innerHTML = `
                 <div class="transaction-header">
                     <div class="transaction-title">
                         <span class="transaction-emoji">${Utils.getCategoryEmoji(cat)}</span>
                         <div class="transaction-info">
                             <span class="transaction-category">${cat}</span>
                             <span class="transaction-sub">${sub}</span>
                         </div>
                     </div>
                     <div class="transaction-amount">
                         <span>${Utils.formatCurrency(val)}</span>
                     </div>
                 </div>
                 ${desc ? `<p class="transaction-desc">${desc}</p>` : ''}
                 <span class="transaction-date">${date}</span>
             `;
            container.appendChild(card);
        });
    }

    renderHistory(data) {
        const btn = document.getElementById('toggle-history-btn');
        const section = document.getElementById('history-section');
        const container = document.getElementById('data-container');
        if (!btn || !section || !container) return;

        if (!this.state.showHistory) {
            btn.innerText = `📦 Show ${this.state.selectedMonth === 'All' ? 'Transactions' : 'Monthly Filtered'}`;
            section.classList.add('hidden');
            return;
        }

        btn.innerText = "📁 Hide Transactions";
        section.classList.remove('hidden');
        container.innerHTML = data.length ? '' : '<div class="loader">No transactions matching filters.</div>';

        // Calculate Work Hours logic
        const currentYearData = this.state.getCurrentYearData();
        const yearlyIncome = currentYearData.reduce((acc, row) => {
            const cat = (row[1] || '').toLowerCase();
            return (cat === 'depositos' || cat === 'depósitos') ? acc + Utils.parseValue(row[3]) : acc;
        }, 0);
        // 44 hours/week * 52 weeks = 2288 hours/year
        const hourlyRate = yearlyIncome / (44 * 52);

        data.forEach((row, i) => {
            if (!row || row.length < 4) return;
            const card = document.createElement('div');
            card.className = 'data-card';
            const catStr = (row[1] || '').toString().toLowerCase();
            const isExpense = !(catStr === 'depositos' || catStr === 'depósitos' || catStr === 'investimentos');

            const amount = Utils.parseValue(row[3]);
            let workHoursHtml = '';

            if (hourlyRate > 0 && isExpense) {
                const hours = amount / hourlyRate;
                const hoursFormatted = hours >= 1 ? `${hours.toFixed(1)}h` : `${(hours * 60).toFixed(0)}m`;
                workHoursHtml = `<span class="work-hours-badge" title="Time worked to earn this amount">⏳ ${hoursFormatted}</span>`;
            }

            // Remove time from date string
            const dateOnly = (row[0] || '').split(' ')[0].split('T')[0];

            // Get subcategory and description
            const category = row[1] || '';
            const subCategory = row[2] || '';
            const description = row[4] || '';
            const amountFormatted = Utils.formatCurrency(amount);

            card.innerHTML = `
                <div class="transaction-header">
                    <div class="transaction-title">
                        <span class="transaction-emoji">${Utils.getCategoryEmoji(category)}</span>
                        <div class="transaction-info">
                            <span class="transaction-category">${category}</span>
                            ${subCategory ? `<span class="transaction-sub">${subCategory}</span>` : ''}
                        </div>
                    </div>
                    <div class="transaction-amount" style="color: ${isExpense ? '#ef4444' : catStr === 'investimentos' ? '#fbbf24' : '#10b981'}">
                        ${amountFormatted}
                        ${workHoursHtml}
                    </div>
                </div>
                ${description ? `<p class="transaction-desc">${description}</p>` : ''}
                <span class="transaction-date">${dateOnly}</span>`;
            container.appendChild(card);
        });
    }
}

// --- 7. APP CONTROLLER ---
class AppController {
    constructor() {
        this.state = new StateManager();
        this.renderer = new UIRenderer(this.state);
        this.api = null;
    }

    init() {
        this.state.subscribe(() => this.renderer.render());
        const url = localStorage.getItem(Config.STORAGE_KEY);
        if (!url) {
            this.showView('setup');
        } else {
            this.api = new ApiService(url);
            this.showView('dashboard');
            this.loadCache();
            this.refresh();
        }
        this.bindEvents();
    }

    bindEvents() {
        const saveBtn = document.getElementById('save-url-btn');
        if (saveBtn) {
            saveBtn.onclick = () => {
                const val = document.getElementById('script-url-input').value.trim();
                if (val.startsWith('https://script.google.com')) {
                    localStorage.setItem(Config.STORAGE_KEY, val);
                    location.reload();
                }
            };
        }
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.onclick = () => { if (confirm("Reset all settings?")) { localStorage.clear(); location.reload(); } };
        }
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) refreshBtn.onclick = () => this.refresh();

        const navDash = document.getElementById('nav-dashboard');
        if (navDash) navDash.onclick = () => this.showView('dashboard');

        const navIns = document.getElementById('nav-insights');
        if (navIns) navIns.onclick = () => this.showView('insights');

        const toggleBtn = document.getElementById('toggle-history-btn');
        if (toggleBtn) toggleBtn.onclick = () => this.state.toggleHistory();

        const searchInput = document.getElementById('sheet-search');
        if (searchInput) {
            searchInput.oninput = (e) => {
                const q = e.target.value.toLowerCase();
                const filtered = this.state.getFilteredData().filter(r => r && r.some(c => c && c.toString().toLowerCase().includes(q)));
                this.renderer.renderHistory(filtered);
            };
        }
    }

    async refresh() {
        if (!this.api) return;
        const btn = document.getElementById('refresh-btn');
        const updateLbl = document.getElementById('last-updated');
        if (btn) btn.classList.add('spinning');

        const data = await this.api.fetchData();
        if (btn) btn.classList.remove('spinning');

        if (data && Array.isArray(data)) {
            localStorage.setItem(Config.CACHE_KEY, JSON.stringify(data));
            this.state.setData(data);
            if (updateLbl) updateLbl.innerText = `Last updated: ${new Date().toLocaleTimeString()}`;
        }
    }

    loadCache() {
        const cached = localStorage.getItem(Config.CACHE_KEY);
        if (cached) {
            try {
                const data = JSON.parse(cached);
                if (Array.isArray(data)) this.state.setData(data);
            } catch (e) { console.error("Cache corrupted:", e); }
        }
    }

    showView(view) {
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        const el = document.getElementById(`${view}-view`);
        if (el) el.classList.remove('hidden');

        document.querySelectorAll('.main-nav .nav-btn').forEach(b => b.classList.remove('active'));
        const navBtn = document.getElementById(`nav-${view}`);
        if (navBtn) navBtn.classList.add('active');
    }

    handleYearSelect(yr) { this.state.setYear(yr); }
    handleMonthSelect(m) { this.state.setMonth(m); }
}

// Global initialization
const app = new AppController();
window.app = app;
app.init();
