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
            try { cb(this); } catch(e) { console.error("Subscriber failed:", e); }
        });
    }

    setData(data) {
        if (!Array.isArray(data)) return;
        this.allData = data;
        this.processYearlyData();
        const years = Object.keys(this.yearlyData).sort((a,b) => b-a);
        if (years.length > 0) {
            if (!this.selectedYear || !this.yearlyData[this.selectedYear]) {
                this.selectedYear = years[0];
            }
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

    update(labels, values, colors) {
        const ctx = document.getElementById(this.canvasId);
        if (!ctx || typeof Chart === 'undefined') return;
        if (this.instance) this.instance.destroy();

        if (labels.length === 0) return;

        this.instance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 20
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Outfit', size: 11 }, padding: 20 } },
                    datalabels: {
                        color: '#fff',
                        font: { family: 'Outfit', weight: 'bold', size: 11 },
                        formatter: (val, ctx) => {
                            const label = ctx.chart.data.labels[ctx.dataIndex];
                            return `${Utils.getCategoryEmoji(label)} ${label}`;
                        },
                        display: (ctx) => {
                            const dataset = ctx.dataset;
                            const total = dataset.data.reduce((a,b)=>a+b, 0);
                            return total > 0 && (dataset.data[ctx.dataIndex] / total) > 0.05;
                        }
                    },
                    tooltip: { callbacks: { label: (ctx) => Utils.formatCurrency(ctx.parsed) } }
                },
                cutout: '65%'
            }
        });
    }
}

// --- 6. UI RENDERER ---
class UIRenderer {
    constructor(state) {
        this.state = state;
        this.chartManager = new ChartManager('categoryChart');
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
        
        const years = Object.keys(this.state.yearlyData).sort((a,b) => b-a);
        
        [yearNav, insightsYearNav].forEach(nav => {
            if (!nav) return;
            nav.innerHTML = '';
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
            ['All', ...Array.from({length: 12}, (_, i) => i)].forEach(m => {
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
        Object.entries(catMap).sort((a,b) => b[1]-a[1]).forEach(([name, val]) => {
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
            let subHtml = Object.entries(subs).sort((a,b)=>b[1]-a[1]).map(([n, v]) => `
                <div class="subcategory-item"><span class="subcategory-name">${n}</span><span class="subcategory-value">${Utils.formatCurrency(v)}</span></div>
            `).join('');
            
            card.innerHTML = `
                <div class="insight-header"><h4>${Utils.getCategoryEmoji(cat)} ${cat}</h4></div>
                <div class="subcategory-list">${subHtml}</div>
                ${biggest[cat] ? `<div class="biggest-expense"><span class="biggest-expense-label">Biggest Spend</span><span class="biggest-expense-name">${biggest[cat].name}</span><span class="biggest-expense-value">${Utils.formatCurrency(biggest[cat].value)}</span></div>` : ''}
            `;
            grid.appendChild(card);
        });

        const labels = Object.keys(groups);
        const values = labels.map(c => Object.values(groups[c]).reduce((a,b)=>a+b, 0));
        const colors = labels.map(c => this.state.getCategoryColor(c));
        this.chartManager.update(labels, values, colors);
        this.renderHistory(data);
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
        data.forEach((row, i) => {
            if (!row || row.length < 4) return;
            const card = document.createElement('div');
            card.className = 'data-card';
            const catStr = (row[1]||'').toString().toLowerCase();
            const color = (catStr==='depositos'||catStr==='depósitos')?'#10b981':catStr==='investimentos'?'#fbbf24':'#ef4444';
            card.innerHTML = `
                <h3>${row[4] || 'Entry ' + (i+1)}</h3>
                <div class="data-item"><span class="data-label">Category</span><span class="data-value">${Utils.getCategoryEmoji(row[1])} ${row[1]}</span></div>
                <div class="data-item"><span class="data-label">Amount</span><span class="data-value" style="color:${color}">${Utils.formatCurrency(Utils.parseValue(row[3]))}</span></div>
                <div class="data-item"><span class="data-label">Date</span><span class="data-value">${row[0]}</span></div>`;
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
            resetBtn.onclick = () => { if(confirm("Reset all settings?")) { localStorage.clear(); location.reload(); }};
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
            } catch(e) { console.error("Cache corrupted:", e); }
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
