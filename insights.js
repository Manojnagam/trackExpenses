// ============================================================
// AI Business Insights Engine
// Local JS analysis — no API, no backend, no costs
// ============================================================
class InsightsEngine {
    constructor() {
        this.isVisible = false;
        this.lastRefresh = null;
        this.bindEvents();
    }

    // --- Data Access Helpers ---
    getTransactions() {
        return (typeof tracker !== 'undefined' && tracker.expenses) ? tracker.expenses : [];
    }
    getCustomers() {
        return (typeof customerManager !== 'undefined' && customerManager.customers) ? customerManager.customers : [];
    }
    getAttendance() {
        return (typeof customerManager !== 'undefined' && customerManager.attendance) ? customerManager.attendance : [];
    }
    getEMIPlans() {
        return (typeof customerManager !== 'undefined' && customerManager.emiPlans) ? customerManager.emiPlans : [];
    }
    getDailyUsage() {
        return (typeof inventoryManager !== 'undefined' && inventoryManager.dailyUsage) ? inventoryManager.dailyUsage : [];
    }
    getRecurring() {
        return (typeof tracker !== 'undefined' && tracker.recurringExpenses) ? tracker.recurringExpenses : [];
    }
    getProducts() {
        return (typeof inventoryManager !== 'undefined' && inventoryManager.products) ? inventoryManager.products : {};
    }
    getStockData() {
        return (typeof inventoryManager !== 'undefined' && inventoryManager.stockData) ? inventoryManager.stockData : {};
    }

    // --- Event Binding ---
    bindEvents() {
        const toggleBtn = document.getElementById('insightsToggleBtn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggle());
        }
        const refreshBtn = document.getElementById('insightsRefreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }
    }

    toggle() {
        const panel = document.getElementById('insightsPanel');
        if (!panel) return;
        this.isVisible = !this.isVisible;
        panel.style.display = this.isVisible ? 'block' : 'none';
        if (this.isVisible && !this.lastRefresh) {
            this.refresh();
        }
    }

    refresh() {
        this.lastRefresh = new Date();
        const timestamp = document.getElementById('insightsTimestamp');
        if (timestamp) {
            timestamp.textContent = 'Updated: ' + this.lastRefresh.toLocaleTimeString();
        }
        this.render();
    }

    // --- Utility Helpers ---
    getMonthKey(date) {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    getMonthLabel(key) {
        const [y, m] = key.split('-');
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return `${months[parseInt(m) - 1]} ${y}`;
    }

    formatCurrency(n) {
        return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
    }

    pct(value) {
        return (value * 100).toFixed(1) + '%';
    }

    // --- Analysis Methods ---

    // 1. MoM Revenue Growth
    momRevenueGrowth() {
        const txns = this.getTransactions();
        const now = new Date();
        const curKey = this.getMonthKey(now);
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevKey = this.getMonthKey(prev);

        let curIncome = 0, prevIncome = 0;
        txns.forEach(t => {
            if ((t.type || 'Expense') !== 'Income') return;
            const mk = this.getMonthKey(t.date);
            if (mk === curKey) curIncome += t.amount;
            else if (mk === prevKey) prevIncome += t.amount;
        });

        if (prevIncome === 0) return null;
        const growth = (curIncome - prevIncome) / prevIncome;
        const sign = growth >= 0 ? '+' : '';
        return {
            title: 'Month-over-Month Revenue',
            icon: '📈',
            message: `Revenue ${growth >= 0 ? 'grew' : 'declined'} compared to last month.`,
            value: sign + this.pct(growth),
            severity: growth >= 0.05 ? 'positive' : growth <= -0.05 ? 'negative' : 'neutral'
        };
    }

    // 2. Projected Monthly Income
    projectedMonthlyIncome() {
        const txns = this.getTransactions();
        const now = new Date();
        const curKey = this.getMonthKey(now);
        const daysElapsed = now.getDate();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

        let curIncome = 0;
        txns.forEach(t => {
            if ((t.type || 'Expense') !== 'Income') return;
            if (this.getMonthKey(t.date) === curKey) curIncome += t.amount;
        });

        if (curIncome === 0) return null;
        const projected = (curIncome / daysElapsed) * daysInMonth;
        return {
            title: 'Projected Monthly Income',
            icon: '🎯',
            message: `Based on ${daysElapsed} days of data, you're on track for:`,
            value: this.formatCurrency(projected),
            severity: 'neutral'
        };
    }

    // 3. Best Month
    bestMonth() {
        const txns = this.getTransactions();
        const monthMap = {};
        txns.forEach(t => {
            if ((t.type || 'Expense') !== 'Income') return;
            const mk = this.getMonthKey(t.date);
            monthMap[mk] = (monthMap[mk] || 0) + t.amount;
        });

        const keys = Object.keys(monthMap);
        if (keys.length < 2) return null;
        let bestKey = keys[0];
        keys.forEach(k => { if (monthMap[k] > monthMap[bestKey]) bestKey = k; });

        return {
            title: 'Best Month Ever',
            icon: '🏆',
            message: `${this.getMonthLabel(bestKey)} was your highest revenue month.`,
            value: this.formatCurrency(monthMap[bestKey]),
            severity: 'positive'
        };
    }

    // 4. Weakest Recent Month
    weakestRecentMonth() {
        const txns = this.getTransactions();
        const now = new Date();
        const monthMap = {};

        for (let i = 1; i <= 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const mk = this.getMonthKey(d);
            monthMap[mk] = 0;
        }

        txns.forEach(t => {
            if ((t.type || 'Expense') !== 'Income') return;
            const mk = this.getMonthKey(t.date);
            if (mk in monthMap) monthMap[mk] += t.amount;
        });

        const keys = Object.keys(monthMap).filter(k => monthMap[k] > 0);
        if (keys.length < 2) return null;
        let worstKey = keys[0];
        keys.forEach(k => { if (monthMap[k] < monthMap[worstKey]) worstKey = k; });

        return {
            title: 'Weakest Recent Month',
            icon: '📉',
            message: `${this.getMonthLabel(worstKey)} had the lowest income in the last 6 months.`,
            value: this.formatCurrency(monthMap[worstKey]),
            severity: 'warning'
        };
    }

    // 5. Revenue per Customer
    revenuePerCustomer() {
        const txns = this.getTransactions();
        const usage = this.getDailyUsage();
        const now = new Date();
        const curKey = this.getMonthKey(now);

        let curIncome = 0;
        txns.forEach(t => {
            if ((t.type || 'Expense') !== 'Income') return;
            if (this.getMonthKey(t.date) === curKey) curIncome += t.amount;
        });

        let totalCustomers = 0, days = 0;
        usage.filter(u => u.type === 'summary' && this.getMonthKey(u.date) === curKey).forEach(u => {
            totalCustomers += (u.totalCustomers || 0);
            days++;
        });

        if (totalCustomers === 0 || curIncome === 0) return null;
        const avgDaily = totalCustomers / days;
        const rpc = curIncome / totalCustomers;

        return {
            title: 'Revenue per Customer',
            icon: '💵',
            message: `Avg ${avgDaily.toFixed(0)} customers/day generating ${this.formatCurrency(rpc)} each this month.`,
            value: this.formatCurrency(rpc) + '/visit',
            severity: 'neutral'
        };
    }

    // 6. Weekly Income Trend
    weeklyIncomeTrend() {
        const txns = this.getTransactions();
        const now = new Date();
        const weeks = [];

        for (let w = 3; w >= 0; w--) {
            const weekEnd = new Date(now);
            weekEnd.setDate(weekEnd.getDate() - (w * 7));
            const weekStart = new Date(weekEnd);
            weekStart.setDate(weekStart.getDate() - 6);
            let total = 0;
            txns.forEach(t => {
                if ((t.type || 'Expense') !== 'Income') return;
                const d = new Date(t.date);
                if (d >= weekStart && d <= weekEnd) total += t.amount;
            });
            weeks.push(total);
        }

        if (weeks.every(w => w === 0)) return null;

        let trend = 'stable';
        const recent = weeks.slice(-2);
        const earlier = weeks.slice(0, 2);
        const recentAvg = recent.reduce((a, b) => a + b, 0) / 2;
        const earlierAvg = earlier.reduce((a, b) => a + b, 0) / 2;

        if (earlierAvg > 0) {
            const change = (recentAvg - earlierAvg) / earlierAvg;
            if (change > 0.1) trend = 'up';
            else if (change < -0.1) trend = 'down';
        }

        const icons = { up: '📈', down: '📉', stable: '➡️' };
        return {
            title: 'Weekly Income Trend',
            icon: icons[trend],
            message: `Last 4 weeks show income is trending ${trend}.`,
            value: trend.charAt(0).toUpperCase() + trend.slice(1),
            severity: trend === 'up' ? 'positive' : trend === 'down' ? 'negative' : 'neutral'
        };
    }

    // 7. Churn Risk
    churnRisk() {
        const customers = this.getCustomers().filter(c => c.active !== false);
        if (customers.length === 0) return null;

        const attendance = this.getAttendance();
        const now = new Date();
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentIds = new Set();
        attendance.forEach(a => {
            if (new Date(a.date) >= thirtyDaysAgo) recentIds.add(a.customerId);
        });

        const inactive = customers.filter(c => !recentIds.has(c.id)).length;
        const rate = inactive / customers.length;

        return {
            title: 'Churn Risk',
            icon: '⚠️',
            message: `${inactive} of ${customers.length} active customers haven't visited in 30 days.`,
            value: this.pct(rate),
            severity: rate > 0.3 ? 'negative' : rate > 0.15 ? 'warning' : 'positive'
        };
    }

    // 8. New Customers
    newCustomers() {
        const customers = this.getCustomers();
        const now = new Date();
        const curKey = this.getMonthKey(now);
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevKey = this.getMonthKey(prev);

        let curNew = 0, prevNew = 0;
        customers.forEach(c => {
            if (!c.joinDate) return;
            const mk = this.getMonthKey(c.joinDate);
            if (mk === curKey) curNew++;
            else if (mk === prevKey) prevNew++;
        });

        if (curNew === 0 && prevNew === 0) return null;
        const diff = curNew - prevNew;
        return {
            title: 'New Customer Signups',
            icon: '🆕',
            message: `${curNew} new customers this month${prevNew > 0 ? ` vs ${prevNew} last month` : ''}.`,
            value: `${curNew} (${diff >= 0 ? '+' : ''}${diff})`,
            severity: diff > 0 ? 'positive' : diff < 0 ? 'warning' : 'neutral'
        };
    }

    // 9. Attendance Rate
    attendanceRate() {
        const customers = this.getCustomers().filter(c => c.active !== false);
        const attendance = this.getAttendance();
        if (customers.length === 0) return null;

        const now = new Date();
        const curKey = this.getMonthKey(now);
        const daysElapsed = now.getDate();

        const marks = attendance.filter(a => this.getMonthKey(a.date) === curKey).length;
        const expected = customers.length * daysElapsed;
        if (expected === 0) return null;

        const rate = marks / expected;
        return {
            title: 'Attendance Rate',
            icon: '📋',
            message: `${marks} attendance marks this month out of ${expected} possible.`,
            value: this.pct(rate),
            severity: rate >= 0.7 ? 'positive' : rate >= 0.4 ? 'warning' : 'negative'
        };
    }

    // 10. Top Streak Customers
    topStreakCustomers() {
        if (typeof customerManager === 'undefined') return null;
        const customers = this.getCustomers().filter(c => c.active !== false);
        if (customers.length === 0) return null;

        const streaks = customers.map(c => ({
            name: c.name,
            streak: customerManager.getStreak(c.id)
        })).filter(s => s.streak > 0).sort((a, b) => b.streak - a.streak).slice(0, 3);

        if (streaks.length === 0) return null;
        const names = streaks.map(s => `${s.name} (${s.streak}d)`).join(', ');
        return {
            title: 'Top Streak Customers',
            icon: '🔥',
            message: `Most consistent visitors: ${names}`,
            value: `${streaks[0].streak} day streak`,
            severity: 'positive'
        };
    }

    // 11. EMI Collection Rate
    emiCollectionRate() {
        const plans = this.getEMIPlans();
        const active = plans.filter(e => e.status === 'active');
        if (active.length === 0) return null;

        let totalOwed = 0, totalPaid = 0;
        active.forEach(e => {
            totalOwed += e.totalAmount;
            totalPaid += e.payments.reduce((s, p) => s + p.amount, 0);
        });

        if (totalOwed === 0) return null;
        const rate = totalPaid / totalOwed;
        return {
            title: 'EMI Collection Rate',
            icon: '💳',
            message: `${this.formatCurrency(totalPaid)} collected of ${this.formatCurrency(totalOwed)} across ${active.length} active plans.`,
            value: this.pct(rate),
            severity: rate >= 0.7 ? 'positive' : rate >= 0.4 ? 'warning' : 'negative'
        };
    }

    // 12. Overdue EMI
    overdueEMI() {
        const plans = this.getEMIPlans();
        const today = new Date().toISOString().split('T')[0];
        let overdue = 0;

        plans.filter(e => e.status === 'active' && e.type === 'fixed').forEach(e => {
            const installmentAmt = e.totalAmount / (e.installmentCount || 1);
            const paid = e.payments.reduce((s, p) => s + p.amount, 0);
            const expectedPaid = Math.floor(
                (new Date() - new Date(e.startDate)) / (30 * 24 * 60 * 60 * 1000)
            ) * installmentAmt;
            if (paid < expectedPaid) overdue++;
        });

        if (overdue === 0) return null;
        return {
            title: 'Overdue EMI Plans',
            icon: '🚨',
            message: `${overdue} EMI plan(s) have missed payment deadlines.`,
            value: `${overdue} overdue`,
            severity: 'negative'
        };
    }

    // 13. Plan Distribution
    planDistribution() {
        const customers = this.getCustomers().filter(c => c.active !== false);
        if (customers.length < 2) return null;

        const plans = {};
        customers.forEach(c => {
            const p = c.plan || 'general';
            plans[p] = (plans[p] || 0) + 1;
        });

        const labels = { 'weight-gain': 'Weight Gain', 'weight-loss': 'Weight Loss', 'general': 'General' };
        const parts = Object.entries(plans)
            .map(([k, v]) => `${labels[k] || k}: ${this.pct(v / customers.length)}`)
            .join(', ');

        const top = Object.entries(plans).sort((a, b) => b[1] - a[1])[0];
        return {
            title: 'Plan Distribution',
            icon: '📊',
            message: parts,
            value: `${labels[top[0]] || top[0]}: ${top[1]}`,
            severity: 'neutral'
        };
    }

    // 14. Top Expense Category
    topExpenseCategory() {
        const txns = this.getTransactions();
        const now = new Date();
        const curKey = this.getMonthKey(now);

        const cats = {};
        let total = 0;
        txns.forEach(t => {
            if ((t.type || 'Expense') === 'Income') return;
            if (this.getMonthKey(t.date) !== curKey) return;
            const cat = t.category || 'Other';
            cats[cat] = (cats[cat] || 0) + t.amount;
            total += t.amount;
        });

        const entries = Object.entries(cats);
        if (entries.length === 0) return null;
        entries.sort((a, b) => b[1] - a[1]);
        const [topCat, topAmt] = entries[0];

        return {
            title: 'Top Expense Category',
            icon: '💸',
            message: `"${topCat}" is your biggest expense at ${this.pct(topAmt / total)} of total.`,
            value: this.formatCurrency(topAmt),
            severity: 'warning'
        };
    }

    // 15. Expense vs Revenue Growth
    expenseVsRevenueGrowth() {
        const txns = this.getTransactions();
        const now = new Date();
        const curKey = this.getMonthKey(now);
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevKey = this.getMonthKey(prev);

        let curInc = 0, prevInc = 0, curExp = 0, prevExp = 0;
        txns.forEach(t => {
            const mk = this.getMonthKey(t.date);
            const isIncome = (t.type || 'Expense') === 'Income';
            if (mk === curKey) { if (isIncome) curInc += t.amount; else curExp += t.amount; }
            else if (mk === prevKey) { if (isIncome) prevInc += t.amount; else prevExp += t.amount; }
        });

        if (prevInc === 0 || prevExp === 0) return null;
        const revGrowth = (curInc - prevInc) / prevInc;
        const expGrowth = (curExp - prevExp) / prevExp;

        const outpacing = expGrowth > revGrowth;
        return {
            title: 'Expense vs Revenue Growth',
            icon: outpacing ? '⚠️' : '✅',
            message: outpacing
                ? `Expenses growing faster (${this.pct(expGrowth)}) than revenue (${this.pct(revGrowth)}).`
                : `Revenue growth (${this.pct(revGrowth)}) outpaces expense growth (${this.pct(expGrowth)}).`,
            value: outpacing ? 'Expenses outpacing' : 'Revenue leading',
            severity: outpacing ? 'negative' : 'positive'
        };
    }

    // 16. Profit Margin
    profitMargin() {
        const txns = this.getTransactions();
        const now = new Date();
        const curKey = this.getMonthKey(now);

        let income = 0, expenses = 0;
        txns.forEach(t => {
            if (this.getMonthKey(t.date) !== curKey) return;
            if ((t.type || 'Expense') === 'Income') income += t.amount;
            else expenses += t.amount;
        });

        if (income === 0) return null;
        const margin = (income - expenses) / income;
        return {
            title: 'Profit Margin',
            icon: '💰',
            message: `This month: ${this.formatCurrency(income)} income - ${this.formatCurrency(expenses)} expenses.`,
            value: this.pct(margin),
            severity: margin >= 0.3 ? 'positive' : margin >= 0.1 ? 'warning' : 'negative'
        };
    }

    // 17. Recurring Expense Load
    recurringExpenseLoad() {
        const recurring = this.getRecurring();
        if (recurring.length === 0) return null;

        const recurringTotal = recurring.reduce((s, r) => s + r.amount, 0);

        const txns = this.getTransactions();
        const monthMap = {};
        txns.forEach(t => {
            if ((t.type || 'Expense') !== 'Income') return;
            const mk = this.getMonthKey(t.date);
            monthMap[mk] = (monthMap[mk] || 0) + t.amount;
        });

        const values = Object.values(monthMap);
        if (values.length === 0) return null;
        const avgIncome = values.reduce((a, b) => a + b, 0) / values.length;
        if (avgIncome === 0) return null;

        const load = recurringTotal / avgIncome;
        return {
            title: 'Recurring Expense Load',
            icon: '🔄',
            message: `${this.formatCurrency(recurringTotal)}/month in recurring costs vs ${this.formatCurrency(avgIncome)} avg income.`,
            value: this.pct(load),
            severity: load > 0.5 ? 'negative' : load > 0.3 ? 'warning' : 'positive'
        };
    }

    // 18. Cost-Cutting Opportunity
    costCuttingOpportunity() {
        const txns = this.getTransactions();
        const now = new Date();
        const curKey = this.getMonthKey(now);
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevKey = this.getMonthKey(prev);

        const curCats = {}, prevCats = {};
        txns.forEach(t => {
            if ((t.type || 'Expense') === 'Income') return;
            const cat = t.category || 'Other';
            const mk = this.getMonthKey(t.date);
            if (mk === curKey) curCats[cat] = (curCats[cat] || 0) + t.amount;
            else if (mk === prevKey) prevCats[cat] = (prevCats[cat] || 0) + t.amount;
        });

        let maxIncrease = 0, maxCat = null;
        Object.keys(curCats).forEach(cat => {
            const prevAmt = prevCats[cat] || 0;
            if (prevAmt === 0) return;
            const increase = (curCats[cat] - prevAmt) / prevAmt;
            if (increase > 0.2 && increase > maxIncrease) {
                maxIncrease = increase;
                maxCat = cat;
            }
        });

        if (!maxCat) return null;
        return {
            title: 'Cost-Cutting Opportunity',
            icon: '✂️',
            message: `"${maxCat}" costs jumped ${this.pct(maxIncrease)} vs last month. Review for savings.`,
            value: this.formatCurrency(curCats[maxCat]),
            severity: 'warning'
        };
    }

    // 19. Avg Daily Customers
    avgDailyCustomers() {
        const usage = this.getDailyUsage();
        const now = new Date();
        const curKey = this.getMonthKey(now);
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevKey = this.getMonthKey(prev);

        let curTotal = 0, curDays = 0, prevTotal = 0, prevDays = 0;
        usage.filter(u => u.type === 'summary').forEach(u => {
            const mk = this.getMonthKey(u.date);
            if (mk === curKey) { curTotal += (u.totalCustomers || 0); curDays++; }
            else if (mk === prevKey) { prevTotal += (u.totalCustomers || 0); prevDays++; }
        });

        if (curDays === 0) return null;
        const curAvg = curTotal / curDays;
        const prevAvg = prevDays > 0 ? prevTotal / prevDays : 0;

        let change = '';
        if (prevAvg > 0) {
            const diff = ((curAvg - prevAvg) / prevAvg) * 100;
            change = ` (${diff >= 0 ? '+' : ''}${diff.toFixed(0)}% vs last month)`;
        }

        return {
            title: 'Avg Daily Customers',
            icon: '👥',
            message: `Averaging ${curAvg.toFixed(1)} customers/day this month${change}.`,
            value: curAvg.toFixed(1) + '/day',
            severity: prevAvg > 0 && curAvg >= prevAvg ? 'positive' : prevAvg > 0 ? 'warning' : 'neutral'
        };
    }

    // 20. Shake Mix Ratio
    shakeMixRatio() {
        const usage = this.getDailyUsage();
        const now = new Date();
        const curKey = this.getMonthKey(now);

        let gain = 0, loss = 0;
        usage.filter(u => u.type === 'summary' && this.getMonthKey(u.date) === curKey).forEach(u => {
            gain += (u.weightGainShakes || 0);
            loss += (u.weightLossShakes || 0);
        });

        const total = gain + loss;
        if (total === 0) return null;

        return {
            title: 'Shake Mix Ratio',
            icon: '🥤',
            message: `This month: ${gain} weight gain vs ${loss} weight loss shakes.`,
            value: `${this.pct(gain / total)} Gain / ${this.pct(loss / total)} Loss`,
            severity: 'neutral'
        };
    }

    // 21. Low Stock Warning
    lowStockWarning() {
        const products = this.getProducts();
        const stockData = this.getStockData();
        const lowItems = [];

        for (const category in products) {
            products[category].forEach(product => {
                const stock = stockData[product.id];
                if (stock && stock.quantity > 0 && stock.quantity <= product.lowStockThreshold) {
                    lowItems.push(product.name);
                } else if (stock && stock.quantity <= 0) {
                    lowItems.push(product.name + ' (OUT)');
                }
            });
        }

        if (lowItems.length === 0) return null;
        const top3 = lowItems.slice(0, 3).join(', ');
        return {
            title: 'Low Stock Warning',
            icon: '📦',
            message: `${lowItems.length} item(s) need restocking: ${top3}${lowItems.length > 3 ? '...' : ''}.`,
            value: `${lowItems.length} items`,
            severity: lowItems.length >= 3 ? 'negative' : 'warning'
        };
    }

    // --- Gather All Insights ---
    getAllInsights() {
        const categories = [
            {
                name: 'Revenue & Forecast',
                icon: '💰',
                insights: [
                    this.momRevenueGrowth(),
                    this.projectedMonthlyIncome(),
                    this.bestMonth(),
                    this.weakestRecentMonth(),
                    this.revenuePerCustomer(),
                    this.weeklyIncomeTrend()
                ]
            },
            {
                name: 'Customer & EMI Health',
                icon: '👥',
                insights: [
                    this.churnRisk(),
                    this.newCustomers(),
                    this.attendanceRate(),
                    this.topStreakCustomers(),
                    this.emiCollectionRate(),
                    this.overdueEMI(),
                    this.planDistribution()
                ]
            },
            {
                name: 'Expense Optimization',
                icon: '✂️',
                insights: [
                    this.topExpenseCategory(),
                    this.expenseVsRevenueGrowth(),
                    this.profitMargin(),
                    this.recurringExpenseLoad(),
                    this.costCuttingOpportunity()
                ]
            },
            {
                name: 'Operations',
                icon: '⚙️',
                insights: [
                    this.avgDailyCustomers(),
                    this.shakeMixRatio(),
                    this.lowStockWarning()
                ]
            }
        ];

        // Filter out null insights
        categories.forEach(cat => {
            cat.insights = cat.insights.filter(i => i !== null);
        });

        return categories.filter(cat => cat.insights.length > 0);
    }

    // --- Rendering ---
    render() {
        const container = document.getElementById('insightsContent');
        if (!container) return;

        const txns = this.getTransactions();
        if (txns.length === 0) {
            container.innerHTML = `
                <div class="insights-empty">
                    <div class="insights-empty-icon">📊</div>
                    <h4>No Data Yet</h4>
                    <p>Add some transactions to see AI-powered business insights here.</p>
                </div>
            `;
            return;
        }

        const categories = this.getAllInsights();
        if (categories.length === 0) {
            container.innerHTML = `
                <div class="insights-empty">
                    <div class="insights-empty-icon">🔍</div>
                    <h4>Not Enough Data</h4>
                    <p>Keep recording transactions and daily summaries — insights will appear as more data accumulates.</p>
                </div>
            `;
            return;
        }

        let html = '';
        categories.forEach(cat => {
            html += `<div class="insights-category">`;
            html += `<div class="insights-category-title">${cat.icon} ${cat.name}</div>`;
            html += `<div class="insights-grid">`;
            cat.insights.forEach(insight => {
                html += `
                    <div class="insight-card severity-${insight.severity}">
                        <div class="insight-card-header">
                            <span class="insight-card-icon">${insight.icon}</span>
                            <span class="insight-card-title">${insight.title}</span>
                        </div>
                        <div class="insight-card-message">${insight.message}</div>
                        <div class="insight-card-value severity-${insight.severity}">${insight.value}</div>
                    </div>
                `;
            });
            html += `</div></div>`;
        });

        container.innerHTML = html;
    }
}
