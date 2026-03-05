// ============================================================
// Dashboard Manager
// ============================================================
class DashboardManager {
    constructor() {
        this.init();
    }

    init() {
        // Quick action buttons
        document.getElementById('quickAddTransaction')?.addEventListener('click', () => {
            this.switchToTab('finance');
            setTimeout(() => {
                document.getElementById('description')?.focus();
            }, 200);
        });

        document.getElementById('quickDailySummary')?.addEventListener('click', () => {
            this.switchToTab('inventory');
            setTimeout(() => {
                if (typeof inventoryManager !== 'undefined') {
                    inventoryManager.switchInventoryTab('dailyUsage');
                }
            }, 200);
        });

        document.getElementById('quickAddCustomer')?.addEventListener('click', () => {
            this.switchToTab('customers');
            setTimeout(() => {
                document.getElementById('customerName')?.focus();
            }, 200);
        });

        this.refreshDashboard();
    }

    switchToTab(tabName) {
        document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
        document.getElementById(`${tabName}Section`)?.classList.add('active');

        if (tabName === 'inventory' && typeof inventoryManager !== 'undefined') {
            setTimeout(() => inventoryManager.forceRefreshDisplay(), 100);
        }

        if (tabName === 'attendance' && typeof customerManager !== 'undefined') {
            setTimeout(() => {
                customerManager.renderDailyCheckin();
                customerManager.renderAttendance();
            }, 100);
        }

        if (tabName === 'composition' && typeof customerManager !== 'undefined') {
            setTimeout(() => customerManager.renderAllCompositions(), 100);
        }
    }

    refreshDashboard() {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Today's Income
        let todaysIncome = 0;
        if (typeof tracker !== 'undefined' && tracker.expenses) {
            todaysIncome = tracker.expenses
                .filter(e => e.date === today && (e.type || 'Expense') === 'Income')
                .reduce((sum, e) => sum + e.amount, 0);
        }
        this.updateCard('dashTodayIncome', `₹${todaysIncome.toFixed(2)}`);

        // Today's Customers & Shakes from daily summary
        let todayCustomers = 0;
        let todayGainShakes = 0;
        let todayLossShakes = 0;
        if (typeof inventoryManager !== 'undefined' && inventoryManager.dailyUsage) {
            const todaySummary = inventoryManager.dailyUsage.find(e => e.date === today && e.type === 'summary');
            if (todaySummary) {
                todayCustomers = todaySummary.totalCustomers || 0;
                todayGainShakes = todaySummary.weightGainShakes || 0;
                todayLossShakes = todaySummary.weightLossShakes || 0;
            }
        }
        this.updateCard('dashTodayCustomers', todayCustomers);
        this.updateCard('dashTodayShakes', `${todayGainShakes + todayLossShakes} (G:${todayGainShakes} L:${todayLossShakes})`);

        // Low Stock Alerts
        let lowStockCount = 0;
        if (typeof inventoryManager !== 'undefined') {
            const products = inventoryManager.products;
            const stockData = inventoryManager.stockData;
            for (const category in products) {
                products[category].forEach(product => {
                    const stock = stockData[product.id];
                    if (stock && stock.quantity > 0 && stock.quantity <= product.lowStockThreshold) {
                        lowStockCount++;
                    }
                });
            }
        }
        this.updateCard('dashLowStock', lowStockCount);

        // Pending EMI
        let pendingEMI = 0;
        let pendingEMIAmount = 0;
        if (typeof customerManager !== 'undefined') {
            pendingEMI = customerManager.getPendingEMICount();
            pendingEMIAmount = customerManager.getTotalPendingEMIAmount();
        }
        this.updateCard('dashPendingEMI', `${pendingEMI} (₹${pendingEMIAmount.toFixed(0)})`);

        // This Month's P&L
        let monthlyIncome = 0;
        let monthlyExpenses = 0;
        if (typeof tracker !== 'undefined' && tracker.expenses) {
            tracker.expenses.forEach(e => {
                const eDate = new Date(e.date);
                if (eDate.getMonth() === currentMonth && eDate.getFullYear() === currentYear) {
                    if ((e.type || 'Expense') === 'Income') monthlyIncome += e.amount;
                    else monthlyExpenses += e.amount;
                }
            });
        }
        const monthlyPL = monthlyIncome - monthlyExpenses;
        const plEl = document.getElementById('dashMonthPL');
        if (plEl) {
            plEl.textContent = `₹${monthlyPL.toFixed(2)}`;
            plEl.style.color = monthlyPL >= 0 ? 'var(--secondary-color)' : 'var(--danger-color)';
        }

        // Expiring products count
        let expiringCount = 0;
        if (typeof inventoryManager !== 'undefined' && inventoryManager.stockInHistory) {
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            inventoryManager.stockInHistory.forEach(entry => {
                if (entry.expiryDate) {
                    const expiry = new Date(entry.expiryDate);
                    if (expiry <= thirtyDaysFromNow) expiringCount++;
                }
            });
        }
        this.updateCard('dashExpiringProducts', expiringCount);

        // Active Customers
        let activeCustomers = 0;
        if (typeof customerManager !== 'undefined') {
            activeCustomers = customerManager.getActiveCustomerCount();
        }
        this.updateCard('dashActiveCustomers', activeCustomers);
    }

    updateCard(elementId, value) {
        const el = document.getElementById(elementId);
        if (el) el.textContent = value;
    }
}

// ============================================================
// Initialize Customer Manager and Dashboard Manager
// These must load after app.js, inventory.js, and customers.js
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    // Wait for other scripts to initialize
    setTimeout(() => {
        customerManager = new CustomerManager();
        dashboardManager = new DashboardManager();

        if (typeof InsightsEngine !== 'undefined') {
            window.insightsEngine = new InsightsEngine();
        }

        // Override tab switching to refresh dashboard
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                e.target.classList.add('active');
                document.getElementById(`${tabName}Section`)?.classList.add('active');

                if (tabName === 'dashboard' && dashboardManager) {
                    dashboardManager.refreshDashboard();
                    if (typeof insightsEngine !== 'undefined' && insightsEngine.isVisible) {
                        insightsEngine.refresh();
                    }
                }
                if (tabName === 'inventory' && typeof inventoryManager !== 'undefined') {
                    setTimeout(() => inventoryManager.forceRefreshDisplay(), 100);
                }
                if (tabName === 'customers' && customerManager) {
                    customerManager.renderCustomers();
                }
                if (tabName === 'emi' && customerManager) {
                    customerManager.renderEMIList();
                    customerManager.populateEMICustomerDropdown();
                }
            });
        });

        console.log('✅ All managers initialized');
    }, 100);
});
