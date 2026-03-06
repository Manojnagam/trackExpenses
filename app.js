// ============================================================
// Shared Utilities
// ============================================================

function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function cleanupOldBackups(prefix, keepDays) {
    const allKeys = Object.keys(localStorage);
    const backupKeys = allKeys.filter(k => k.startsWith(prefix)).sort().reverse();
    if (backupKeys.length > keepDays) {
        backupKeys.slice(keepDays).forEach(key => {
            localStorage.removeItem(key);
        });
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function shareViaWhatsApp(text) {
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
}

function checkStorageUsage() {
    try {
        let total = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            total += key.length + localStorage.getItem(key).length;
        }
        const usedKB = (total * 2) / 1024; // UTF-16 = 2 bytes per char
        const limitKB = 5120; // 5 MB typical limit
        const pct = (usedKB / limitKB) * 100;
        if (pct > 80) {
            console.warn(`⚠️ localStorage is ${pct.toFixed(1)}% full (${usedKB.toFixed(0)} KB / ${limitKB} KB)`);
        }
    } catch (e) {
        // Storage API not available
    }
}

// ============================================================
// Expense Tracker Application
// ============================================================
class ExpenseTracker {
    constructor() {
        this.expenses = this.loadExpenses();
        this.editingId = null;
        this.weeklyChart = null;
        this.monthlyChart = null;
        this.categoryChart = null;
        this.incomeExpenseChart = null;
        this.displayLimit = 50;
        this.recurringExpenses = this.loadRecurringExpenses();
        this.init();
        this.processRecurringExpenses();
    }

    init() {
        // Set today's date as default
        document.getElementById('date').valueAsDate = new Date();
        
        // Load dark mode preference
        this.loadDarkMode();
        
        // Event listeners - Form
        document.getElementById('expenseForm').addEventListener('submit', (e) => this.handleSubmit(e));
        document.getElementById('cancelEdit').addEventListener('click', () => this.cancelEdit());
        
        // Event listeners - Filters (reset pagination on any filter change)
        const resetAndRender = () => { this.displayLimit = 50; this.renderExpenses(); };
        document.getElementById('searchInput').addEventListener('input', resetAndRender);
        document.getElementById('filterCategory').addEventListener('change', resetAndRender);
        document.getElementById('filterType').addEventListener('change', resetAndRender);
        document.getElementById('dateFrom').addEventListener('change', resetAndRender);
        document.getElementById('dateTo').addEventListener('change', resetAndRender);
        
        // Event listeners - Actions
        document.getElementById('exportBtn').addEventListener('click', () => this.exportData());
        document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
        document.getElementById('importFile').addEventListener('change', (e) => this.importData(e));
        
        // Event listeners - Settings
        document.getElementById('darkModeToggle').addEventListener('click', () => this.toggleDarkMode());
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettings());
        document.getElementById('closeSettings').addEventListener('click', () => this.closeSettings());
        document.getElementById('backupBtn').addEventListener('click', () => this.backupData());
        document.getElementById('restoreBtn').addEventListener('click', () => document.getElementById('restoreFile').click());
        document.getElementById('restoreFile').addEventListener('change', (e) => this.restoreData(e));
        document.getElementById('clearDataBtn').addEventListener('click', () => this.clearAllData());
        document.getElementById('printBtn').addEventListener('click', () => window.print());
        document.getElementById('exportCSVBtn').addEventListener('click', () => this.exportCSV());
        
        // Close modal on outside click
        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal') this.closeSettings();
        });

        // P&L Report
        document.getElementById('plReportBtn')?.addEventListener('click', () => this.openPLReport());
        document.getElementById('closePLModal')?.addEventListener('click', () => this.closePLReport());
        document.getElementById('plModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'plModal') this.closePLReport();
        });
        document.getElementById('plMonth')?.addEventListener('change', () => this.renderPLReport());
        document.getElementById('exportPLBtn')?.addEventListener('click', () => this.exportPLReport());
        document.getElementById('whatsappPLBtn')?.addEventListener('click', () => this.sharePLViaWhatsApp());

        // WhatsApp daily summary share
        document.getElementById('whatsappDailySummary')?.addEventListener('click', () => this.shareDailySummaryViaWhatsApp());

        // Recurring expenses management
        document.getElementById('addRecurringBtn')?.addEventListener('click', () => this.addRecurringExpense());
        this.renderRecurringExpenses();

        // Event delegation for expense list actions
        document.getElementById('expensesList').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const action = btn.dataset.action;
            const id = btn.dataset.id;
            if (action === 'edit') this.editExpense(id);
            else if (action === 'delete') this.deleteExpense(id);
            else if (action === 'duplicate') this.duplicateExpense(id);
            else if (action === 'loadMore') {
                this.displayLimit += 50;
                this.renderExpenses();
            }
        });

        // Check storage usage
        checkStorageUsage();

        // Initial render
        this.updateStats();
        this.renderExpenses();
        this.updateCharts();
    }

    loadExpenses() {
        // Try primary location first
        let stored = localStorage.getItem('nutritionExpenses');
        let source = 'primary';
        
        // If primary is empty, try secondary
        if (!stored || stored === '[]' || stored === 'null') {
            stored = localStorage.getItem('nutritionExpenses_secondary');
            if (stored) {
                source = 'secondary';
                console.log('⚠️ Primary data empty, loading from secondary backup');
            }
        }
        
        // If still empty, try to find most recent backup
        if (!stored || stored === '[]' || stored === 'null') {
            const allKeys = Object.keys(localStorage);
            const backupKeys = allKeys.filter(k => k.startsWith('nutritionExpenses_backup_')).sort().reverse();
            if (backupKeys.length > 0) {
                stored = localStorage.getItem(backupKeys[0]);
                source = 'backup: ' + backupKeys[0];
                console.log('⚠️ Loading from backup:', backupKeys[0]);
                // Restore to primary
                if (stored) {
                    setTimeout(() => {
                        localStorage.setItem('nutritionExpenses', stored);
                        console.log('✅ Restored backup to primary location');
                    }, 100);
                }
            }
        }
        
        if (stored && stored !== '[]' && stored !== 'null') {
            try {
                const data = JSON.parse(stored);
                console.log(`✅ Finance data loaded from ${source}:`, data.length, 'entries');
                
                // Validate data
                if (!Array.isArray(data)) {
                    console.error('❌ Data is not an array!');
                    return [];
                }
                
                return data;
            } catch (e) {
                console.error('❌ Error parsing finance data:', e);
                return [];
            }
        } else {
            console.warn('⚠️ No finance data found anywhere');
            return [];
        }
    }

    saveExpenses() {
        try {
            // Save to primary location
            localStorage.setItem('nutritionExpenses', JSON.stringify(this.expenses));
            
            // Create automatic backup with timestamp
            const backupKey = 'nutritionExpenses_backup_' + new Date().toISOString().split('T')[0];
            localStorage.setItem(backupKey, JSON.stringify(this.expenses));
            
            // Keep only last 7 days of backups (cleanup old ones)
            cleanupOldBackups('nutritionExpenses_backup_', 3);
            
            // Also save to a secondary key as safety net
            localStorage.setItem('nutritionExpenses_secondary', JSON.stringify(this.expenses));
            
            // Save metadata
            localStorage.setItem('nutritionExpenses_metadata', JSON.stringify({
                lastSaved: new Date().toISOString(),
                count: this.expenses.length,
                version: '1.0'
            }));
            
            console.log('✅ Finance data saved with backups');
            this.updateStats();
        } catch (e) {
            console.error('❌ CRITICAL: Failed to save finance data!', e);
            alert('ERROR: Could not save your data! Please check browser storage settings or export your data immediately.');
        }
    }
    
    handleSubmit(e) {
        e.preventDefault();
        
        const formData = {
            id: this.editingId || generateId(),
            type: document.getElementById('type').value,
            date: document.getElementById('date').value,
            category: document.getElementById('category').value,
            description: document.getElementById('description').value,
            amount: parseFloat(document.getElementById('amount').value),
            notes: document.getElementById('notes').value
        };

        if (this.editingId) {
            // Update existing expense
            const index = this.expenses.findIndex(exp => exp.id === this.editingId);
            if (index !== -1) {
                this.expenses[index] = formData;
            }
            this.cancelEdit();
        } else {
            // Add new expense
            this.expenses.unshift(formData);
        }

        this.saveExpenses();
        this.renderExpenses();
        this.updateCharts();
        document.getElementById('expenseForm').reset();
        document.getElementById('date').valueAsDate = new Date();
    }

    editExpense(id) {
        const expense = this.expenses.find(exp => exp.id === id);
        if (!expense) return;

        this.editingId = id;
        document.getElementById('type').value = expense.type || 'Expense';
        document.getElementById('date').value = expense.date;
        document.getElementById('category').value = expense.category;
        document.getElementById('description').value = expense.description;
        document.getElementById('amount').value = expense.amount;
        document.getElementById('notes').value = expense.notes || '';
        
        document.getElementById('cancelEdit').style.display = 'block';
        document.querySelector('.btn-primary').textContent = 'Update Transaction';
        
        // Scroll to form
        document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
    }

    cancelEdit() {
        this.editingId = null;
        document.getElementById('expenseForm').reset();
        document.getElementById('date').valueAsDate = new Date();
        document.getElementById('cancelEdit').style.display = 'none';
        document.querySelector('.btn-primary').textContent = 'Add Transaction';
    }

    deleteExpense(id) {
        if (confirm('Are you sure you want to delete this transaction?')) {
            this.expenses = this.expenses.filter(exp => exp.id !== id);
            this.saveExpenses();
            this.renderExpenses();
            this.updateCharts();
            
            if (this.editingId === id) {
                this.cancelEdit();
            }
        }
    }

    getFilteredExpenses() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const filterCategory = document.getElementById('filterCategory').value;
        const filterType = document.getElementById('filterType').value;
        const dateFrom = document.getElementById('dateFrom').value;
        const dateTo = document.getElementById('dateTo').value;

        return this.expenses.filter(expense => {
            const matchesSearch = !searchTerm || 
                expense.description.toLowerCase().includes(searchTerm) ||
                expense.category.toLowerCase().includes(searchTerm) ||
                (expense.type && expense.type.toLowerCase().includes(searchTerm)) ||
                (expense.notes && expense.notes.toLowerCase().includes(searchTerm)) ||
                expense.amount.toString().includes(searchTerm);
            
            const matchesCategory = !filterCategory || expense.category === filterCategory;
            const matchesType = !filterType || (expense.type || 'Expense') === filterType;
            
            let matchesDate = true;
            if (dateFrom || dateTo) {
                const expDate = new Date(expense.date);
                if (dateFrom) {
                    const fromDate = new Date(dateFrom);
                    fromDate.setHours(0, 0, 0, 0);
                    if (expDate < fromDate) matchesDate = false;
                }
                if (dateTo) {
                    const toDate = new Date(dateTo);
                    toDate.setHours(23, 59, 59, 999);
                    if (expDate > toDate) matchesDate = false;
                }
            }
            
            return matchesSearch && matchesCategory && matchesType && matchesDate;
        });
    }

    renderExpenses() {
        const expensesList = document.getElementById('expensesList');
        const filteredExpenses = this.getFilteredExpenses();
        const totalCount = filteredExpenses.length;

        if (totalCount === 0) {
            expensesList.innerHTML = '<div class="empty-state">No expenses found. Try adjusting your search or filter.</div>';
            return;
        }

        const visible = filteredExpenses.slice(0, this.displayLimit);

        let html = visible.map(expense => {
            const date = new Date(expense.date);
            const formattedDate = date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });

            const type = expense.type || 'Expense';
            const amountColor = type === 'Income' ? 'var(--secondary-color)' : 'var(--danger-color)';
            const typeBadge = type === 'Income' ? 'income-badge' : 'expense-badge';
            
            return `
                <div class="expense-item">
                    <div class="expense-header">
                        <div class="expense-info">
                            <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
                                <span class="expense-category ${typeBadge}">${escapeHtml(type)}</span>
                                <span class="expense-category">${escapeHtml(expense.category)}</span>
                            </div>
                            <div class="expense-description">${escapeHtml(expense.description)}</div>
                            <div class="expense-date">${formattedDate}</div>
                        </div>
                        <div class="expense-amount" style="color: ${amountColor}">${type === 'Income' ? '+' : '-'}₹${expense.amount.toFixed(2)}</div>
                    </div>
                    ${expense.notes ? `<div class="expense-notes">${escapeHtml(expense.notes)}</div>` : ''}
                    <div class="expense-actions">
                        <button class="btn btn-edit" data-action="edit" data-id="${expense.id}">Edit</button>
                        <button class="btn btn-delete" data-action="delete" data-id="${expense.id}">Delete</button>
                        <button class="btn btn-quick" data-action="duplicate" data-id="${expense.id}" title="Duplicate">📋</button>
                    </div>
                </div>
            `;
        }).join('');

        if (totalCount > this.displayLimit) {
            html += `<div style="text-align:center;padding:15px;">
                <button class="btn btn-secondary" data-action="loadMore"
                    style="width:auto;margin:0 auto;">
                    Load More (showing ${visible.length} of ${totalCount})
                </button>
            </div>`;
        }

        expensesList.innerHTML = html;
    }

    updateStats() {
        // Calculate totals
        const income = this.expenses
            .filter(exp => (exp.type || 'Expense') === 'Income')
            .reduce((sum, exp) => sum + exp.amount, 0);
        
        const expenses = this.expenses
            .filter(exp => (exp.type || 'Expense') === 'Expense')
            .reduce((sum, exp) => sum + exp.amount, 0);
        
        const netBalance = income - expenses;

        document.getElementById('totalIncome').textContent = `₹${income.toFixed(2)}`;
        document.getElementById('totalExpenses').textContent = `₹${expenses.toFixed(2)}`;
        document.getElementById('netBalance').textContent = `₹${netBalance.toFixed(2)}`;
        document.getElementById('totalRecords').textContent = this.expenses.length;

        // Calculate weekly summary
        const now = new Date();
        const currentWeekStart = this.getWeekStart(now);
        const currentWeekEnd = new Date(currentWeekStart);
        currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);
        currentWeekEnd.setHours(23, 59, 59, 999);

        const weeklyIncome = this.expenses
            .filter(exp => {
                const expDate = new Date(exp.date);
                return expDate >= currentWeekStart && expDate <= currentWeekEnd && (exp.type || 'Expense') === 'Income';
            })
            .reduce((sum, exp) => sum + exp.amount, 0);

        const weeklyExpenses = this.expenses
            .filter(exp => {
                const expDate = new Date(exp.date);
                return expDate >= currentWeekStart && expDate <= currentWeekEnd && (exp.type || 'Expense') === 'Expense';
            })
            .reduce((sum, exp) => sum + exp.amount, 0);

        const weeklyNet = weeklyIncome - weeklyExpenses;

        document.getElementById('weeklyIncome').textContent = `₹${weeklyIncome.toFixed(2)}`;
        document.getElementById('weeklyExpenses').textContent = `₹${weeklyExpenses.toFixed(2)}`;
        document.getElementById('weeklyNet').textContent = `₹${weeklyNet.toFixed(2)}`;

        // Calculate monthly summary
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const monthlyIncome = this.expenses
            .filter(exp => {
                const expDate = new Date(exp.date);
                return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear && (exp.type || 'Expense') === 'Income';
            })
            .reduce((sum, exp) => sum + exp.amount, 0);

        const monthlyExpenses = this.expenses
            .filter(exp => {
                const expDate = new Date(exp.date);
                return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear && (exp.type || 'Expense') === 'Expense';
            })
            .reduce((sum, exp) => sum + exp.amount, 0);

        const monthlyNet = monthlyIncome - monthlyExpenses;

        document.getElementById('monthlyIncome').textContent = `₹${monthlyIncome.toFixed(2)}`;
        document.getElementById('monthlyExpenses').textContent = `₹${monthlyExpenses.toFixed(2)}`;
        document.getElementById('monthlyNet').textContent = `₹${monthlyNet.toFixed(2)}`;
    }

    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        const weekStart = new Date(d);
        weekStart.setDate(diff);
        weekStart.setHours(0, 0, 0, 0);
        return weekStart;
    }

    updateCharts() {
        this.updateWeeklyChart();
        this.updateMonthlyChart();
        this.updateCategoryChart();
        this.updateIncomeExpenseChart();
    }

    updateWeeklyChart() {
        const ctx = document.getElementById('weeklyChart');
        if (!ctx) return;

        // Get last 8 weeks
        const weeks = [];
        const weekData = [];
        const now = new Date();
        
        for (let i = 7; i >= 0; i--) {
            const weekStart = new Date(now);
            weekStart.setDate(weekStart.getDate() - (i * 7));
            const weekStartAdjusted = this.getWeekStart(weekStart);
            const weekEnd = new Date(weekStartAdjusted);
            weekEnd.setDate(weekEnd.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);

            // Format week label
            const startMonth = weekStartAdjusted.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            weeks.push(`${startMonth} - ${endMonth}`);

            // Calculate income for this week
            const weekIncome = this.expenses
                .filter(exp => {
                    const expDate = new Date(exp.date);
                    return expDate >= weekStartAdjusted && expDate <= weekEnd && (exp.type || 'Expense') === 'Income';
                })
                .reduce((sum, exp) => sum + exp.amount, 0);

            weekData.push(weekIncome);
        }

        // Destroy existing chart if it exists
        if (this.weeklyChart) {
            this.weeklyChart.destroy();
        }

        // Create new chart
        this.weeklyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: weeks,
                datasets: [{
                    label: 'Weekly Income (₹)',
                    data: weekData,
                    borderColor: '#4a90e2',
                    backgroundColor: 'rgba(74, 144, 226, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Weekly Income (₹)',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₹' + (value / 1000).toFixed(1) + 'k';
                            }
                        },
                        title: {
                            display: true,
                            text: 'Income (₹)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Week'
                        }
                    }
                }
            }
        });

        // Update table
        const tableBody = document.getElementById('weeklyTableBody');
        if (tableBody) {
            tableBody.innerHTML = weeks.map((week, index) => 
                `<tr><td>${week}</td><td>₹${weekData[index].toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`
            ).join('');
        }
    }

    updateMonthlyChart() {
        const ctx = document.getElementById('monthlyChart');
        if (!ctx) return;

        // Get last 6 months
        const months = [];
        const monthData = [];
        const now = new Date();
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = date.toLocaleDateString('en-US', { month: 'short' });
            months.push(monthName);

            // Calculate income for this month
            const monthIncome = this.expenses
                .filter(exp => {
                    const expDate = new Date(exp.date);
                    return expDate.getMonth() === date.getMonth() && 
                           expDate.getFullYear() === date.getFullYear() && 
                           (exp.type || 'Expense') === 'Income';
                })
                .reduce((sum, exp) => sum + exp.amount, 0);

            monthData.push(monthIncome);
        }

        // Destroy existing chart if it exists
        if (this.monthlyChart) {
            this.monthlyChart.destroy();
        }

        // Create new chart
        this.monthlyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Monthly Income (₹)',
                    data: monthData,
                    borderColor: '#4a90e2',
                    backgroundColor: 'rgba(74, 144, 226, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Monthly Income (₹)',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₹' + (value / 1000).toFixed(1) + 'k';
                            }
                        },
                        title: {
                            display: true,
                            text: 'Income (₹)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Month'
                        }
                    }
                }
            }
        });

        // Update table
        const tableBody = document.getElementById('monthlyTableBody');
        if (tableBody) {
            tableBody.innerHTML = months.map((month, index) => 
                `<tr><td>${month}</td><td>₹${monthData[index].toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`
            ).join('');
        }
    }

    exportData() {
        if (this.expenses.length === 0) {
            alert('No transactions to export.');
            return;
        }

        // Check if XLSX library is available
        if (typeof XLSX === 'undefined') {
            alert('Excel export library not loaded. Please refresh the page and try again.');
            return;
        }

        // Prepare data for Excel
        const headers = ['Type', 'Date', 'Category', 'Description', 'Amount (₹)', 'Notes'];
        const rows = this.expenses.map(exp => [
            exp.type || 'Expense',
            exp.date,
            exp.category,
            exp.description,
            parseFloat(exp.amount.toFixed(2)),
            exp.notes || ''
        ]);

        // Create worksheet data
        const worksheetData = [headers, ...rows];

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(worksheetData);

        // Set column widths for better readability
        ws['!cols'] = [
            { wch: 12 }, // Type
            { wch: 12 }, // Date
            { wch: 15 }, // Category
            { wch: 30 }, // Description
            { wch: 15 }, // Amount
            { wch: 40 }  // Notes
        ];

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

        // Generate Excel file and download
        const fileName = `nutrition-center-expenses-${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
    }

    duplicateExpense(id) {
        const expense = this.expenses.find(exp => exp.id === id);
        if (!expense) return;

        const newExpense = {
            ...expense,
            id: generateId(),
            date: new Date().toISOString().split('T')[0]
        };

        this.expenses.unshift(newExpense);
        this.saveExpenses();
        this.renderExpenses();
        this.updateCharts();
        
        // Scroll to top to show new transaction
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    updateCategoryChart() {
        const ctx = document.getElementById('categoryChart');
        if (!ctx) return;

        // Calculate expenses by category
        const categoryData = {};
        this.expenses
            .filter(exp => (exp.type || 'Expense') === 'Expense')
            .forEach(exp => {
                categoryData[exp.category] = (categoryData[exp.category] || 0) + exp.amount;
            });

        const categories = Object.keys(categoryData);
        const amounts = Object.values(categoryData);

        if (this.categoryChart) {
            this.categoryChart.destroy();
        }

        if (categories.length === 0) {
            ctx.parentElement.innerHTML = '<div class="empty-state">No expense data available</div>';
            return;
        }

        this.categoryChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: categories,
                datasets: [{
                    data: amounts,
                    backgroundColor: [
                        '#4a90e2', '#50c878', '#f39c12', '#e74c3c',
                        '#9b59b6', '#1abc9c', '#34495e', '#e67e22'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ₹' + context.parsed.toFixed(2);
                            }
                        }
                    }
                }
            }
        });
    }

    updateIncomeExpenseChart() {
        const ctx = document.getElementById('incomeExpenseChart');
        if (!ctx) return;

        // Get last 6 months data
        const months = [];
        const incomeData = [];
        const expenseData = [];
        const now = new Date();

        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = date.toLocaleDateString('en-US', { month: 'short' });
            months.push(monthName);

            const monthIncome = this.expenses
                .filter(exp => {
                    const expDate = new Date(exp.date);
                    return expDate.getMonth() === date.getMonth() &&
                           expDate.getFullYear() === date.getFullYear() &&
                           (exp.type || 'Expense') === 'Income';
                })
                .reduce((sum, exp) => sum + exp.amount, 0);

            const monthExpense = this.expenses
                .filter(exp => {
                    const expDate = new Date(exp.date);
                    return expDate.getMonth() === date.getMonth() &&
                           expDate.getFullYear() === date.getFullYear() &&
                           (exp.type || 'Expense') === 'Expense';
                })
                .reduce((sum, exp) => sum + exp.amount, 0);

            incomeData.push(monthIncome);
            expenseData.push(monthExpense);
        }

        if (this.incomeExpenseChart) {
            this.incomeExpenseChart.destroy();
        }

        this.incomeExpenseChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [{
                    label: 'Income',
                    data: incomeData,
                    backgroundColor: 'rgba(80, 200, 120, 0.7)',
                    borderColor: '#50c878',
                    borderWidth: 2
                }, {
                    label: 'Expenses',
                    data: expenseData,
                    backgroundColor: 'rgba(231, 76, 60, 0.7)',
                    borderColor: '#e74c3c',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ₹' + context.parsed.y.toFixed(2);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₹' + (value / 1000).toFixed(1) + 'k';
                            }
                        }
                    }
                }
            }
        });
    }

    // ---- Recurring Expenses ----
    loadRecurringExpenses() {
        let stored = localStorage.getItem('nutritionRecurring');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) { /* fall through */ }
        }
        // Pre-seed with Rent and Utilities
        const defaults = [
            { id: generateId(), description: 'Rent', amount: 0, category: 'Rent', dayOfMonth: 1 },
            { id: generateId(), description: 'Utilities', amount: 0, category: 'Utilities', dayOfMonth: 1 }
        ];
        localStorage.setItem('nutritionRecurring', JSON.stringify(defaults));
        return defaults;
    }

    saveRecurringExpenses() {
        localStorage.setItem('nutritionRecurring', JSON.stringify(this.recurringExpenses));
    }

    processRecurringExpenses() {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        this.recurringExpenses.forEach(rec => {
            if (!rec.amount || rec.amount <= 0) return;

            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(rec.dayOfMonth || 1).padStart(2, '0')}`;
            const alreadyExists = this.expenses.some(e =>
                e.description === rec.description &&
                e.category === rec.category &&
                e.date && e.date.startsWith(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`)
            );

            if (!alreadyExists) {
                this.expenses.unshift({
                    id: generateId(),
                    type: 'Expense',
                    date: dateStr,
                    category: rec.category,
                    description: rec.description,
                    amount: rec.amount,
                    notes: 'Auto-added recurring expense'
                });
                this.saveExpenses();
                this.renderExpenses();
                this.updateCharts();

                if (typeof inventoryManager !== 'undefined') {
                    inventoryManager.showToast(`Recurring expense added: ${rec.description} - ₹${rec.amount}`, 'info');
                }
            }
        });
    }

    addRecurringExpense() {
        const desc = document.getElementById('newRecurringDesc')?.value.trim();
        const amount = parseFloat(document.getElementById('newRecurringAmount')?.value);
        const category = document.getElementById('newRecurringCategory')?.value || 'Other';

        if (!desc) return;

        this.recurringExpenses.push({
            id: generateId(),
            description: desc,
            amount: amount || 0,
            category: category,
            dayOfMonth: 1
        });

        this.saveRecurringExpenses();
        this.renderRecurringExpenses();

        document.getElementById('newRecurringDesc').value = '';
        document.getElementById('newRecurringAmount').value = '';
    }

    deleteRecurringExpense(id) {
        this.recurringExpenses = this.recurringExpenses.filter(r => r.id !== id);
        this.saveRecurringExpenses();
        this.renderRecurringExpenses();
    }

    renderRecurringExpenses() {
        const container = document.getElementById('recurringExpensesList');
        if (!container) return;

        if (this.recurringExpenses.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary);font-size:0.9rem;">No recurring expenses configured.</p>';
            return;
        }

        container.innerHTML = this.recurringExpenses.map(rec => `
            <div class="recurring-item">
                <div class="recurring-item-info">
                    <div class="recurring-item-desc">${escapeHtml(rec.description)}</div>
                    <div class="recurring-item-amount">${rec.category} - ₹${(rec.amount || 0).toFixed(2)} on day ${rec.dayOfMonth || 1}</div>
                </div>
                <button class="btn btn-delete" style="padding:4px 10px;font-size:0.8rem;" onclick="tracker.deleteRecurringExpense('${rec.id}')">✕</button>
            </div>
        `).join('');
    }

    // ---- P&L Report ----
    openPLReport() {
        this.populatePLMonths();
        this.renderPLReport();
        document.getElementById('plModal')?.classList.add('show');
    }

    closePLReport() {
        document.getElementById('plModal')?.classList.remove('show');
    }

    populatePLMonths() {
        const select = document.getElementById('plMonth');
        if (!select) return;

        select.innerHTML = '';
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            select.innerHTML += `<option value="${val}"${i === 0 ? ' selected' : ''}>${label}</option>`;
        }
    }

    renderPLReport() {
        const select = document.getElementById('plMonth');
        const container = document.getElementById('plReportContent');
        if (!select || !container) return;

        const [year, month] = select.value.split('-').map(Number);

        const monthExpenses = this.expenses.filter(e => {
            const d = new Date(e.date);
            return d.getFullYear() === year && d.getMonth() === month - 1;
        });

        // Revenue by category
        const revenueByCategory = {};
        let totalRevenue = 0;
        monthExpenses.filter(e => (e.type || 'Expense') === 'Income').forEach(e => {
            revenueByCategory[e.category] = (revenueByCategory[e.category] || 0) + e.amount;
            totalRevenue += e.amount;
        });

        // Expenses by category
        const expenseByCategory = {};
        let totalExpenses = 0;
        monthExpenses.filter(e => (e.type || 'Expense') === 'Expense').forEach(e => {
            expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
            totalExpenses += e.amount;
        });

        // Gross profit from inventory (cost of goods)
        let totalCost = 0;
        let totalSaleRevenue = 0;
        if (typeof inventoryManager !== 'undefined') {
            inventoryManager.stockInHistory.forEach(entry => {
                const d = new Date(entry.date);
                if (d.getFullYear() === year && d.getMonth() === month - 1 && entry.costPrice) {
                    totalCost += entry.costPrice;
                }
            });
            inventoryManager.stockOutHistory.forEach(entry => {
                const d = new Date(entry.date);
                if (d.getFullYear() === year && d.getMonth() === month - 1 && entry.salePrice) {
                    totalSaleRevenue += entry.salePrice;
                }
            });
        }

        const grossProfit = totalRevenue - totalCost;
        const netProfit = totalRevenue - totalExpenses;

        let html = '<div class="pl-section"><h4>Revenue</h4>';
        html += '<table class="pl-table"><thead><tr><th>Category</th><th style="text-align:right">Amount (₹)</th></tr></thead><tbody>';
        Object.keys(revenueByCategory).forEach(cat => {
            html += `<tr><td>${escapeHtml(cat)}</td><td style="text-align:right;color:var(--secondary-color)">₹${revenueByCategory[cat].toFixed(2)}</td></tr>`;
        });
        html += `</tbody><tfoot><tr><td><strong>Total Revenue</strong></td><td style="text-align:right;color:var(--secondary-color)"><strong>₹${totalRevenue.toFixed(2)}</strong></td></tr></tfoot></table></div>`;

        html += '<div class="pl-section"><h4>Expenses</h4>';
        html += '<table class="pl-table"><thead><tr><th>Category</th><th style="text-align:right">Amount (₹)</th></tr></thead><tbody>';
        Object.keys(expenseByCategory).forEach(cat => {
            html += `<tr><td>${escapeHtml(cat)}</td><td style="text-align:right;color:var(--danger-color)">₹${expenseByCategory[cat].toFixed(2)}</td></tr>`;
        });
        html += `</tbody><tfoot><tr><td><strong>Total Expenses</strong></td><td style="text-align:right;color:var(--danger-color)"><strong>₹${totalExpenses.toFixed(2)}</strong></td></tr></tfoot></table></div>`;

        if (totalCost > 0 || totalSaleRevenue > 0) {
            html += `<div class="pl-section"><h4>Inventory</h4>
                <p>Cost of Goods: ₹${totalCost.toFixed(2)}</p>
                <p>Sale Revenue: ₹${totalSaleRevenue.toFixed(2)}</p>
                <p><strong>Gross Profit: ₹${grossProfit.toFixed(2)}</strong></p>
            </div>`;
        }

        const plColor = netProfit >= 0 ? 'var(--secondary-color)' : 'var(--danger-color)';
        html += `<div class="pl-total-row">
            <span>Net Profit</span>
            <span style="color:${plColor}">₹${netProfit.toFixed(2)}</span>
        </div>`;

        container.innerHTML = html;
        this._lastPLData = { year, month, totalRevenue, totalExpenses, netProfit, revenueByCategory, expenseByCategory };
    }

    exportPLReport() {
        if (!this._lastPLData || typeof XLSX === 'undefined') return;

        const d = this._lastPLData;
        const rows = [['P&L Report', `${d.year}-${String(d.month).padStart(2, '0')}`], [], ['REVENUE'], ['Category', 'Amount']];
        Object.keys(d.revenueByCategory).forEach(cat => rows.push([cat, d.revenueByCategory[cat]]));
        rows.push(['Total Revenue', d.totalRevenue], [], ['EXPENSES'], ['Category', 'Amount']);
        Object.keys(d.expenseByCategory).forEach(cat => rows.push([cat, d.expenseByCategory[cat]]));
        rows.push(['Total Expenses', d.totalExpenses], [], ['NET PROFIT', d.netProfit]);

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{ wch: 25 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, ws, 'P&L Report');
        XLSX.writeFile(wb, `PL-Report-${d.year}-${String(d.month).padStart(2, '0')}.xlsx`);
    }

    sharePLViaWhatsApp() {
        if (!this._lastPLData) return;
        const d = this._lastPLData;
        const monthName = new Date(d.year, d.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        let text = `📊 P&L Report - ${monthName}\n\n`;
        text += `💰 Total Revenue: ₹${d.totalRevenue.toFixed(2)}\n`;
        text += `💸 Total Expenses: ₹${d.totalExpenses.toFixed(2)}\n`;
        text += `${d.netProfit >= 0 ? '✅' : '❌'} Net Profit: ₹${d.netProfit.toFixed(2)}\n`;
        shareViaWhatsApp(text);
    }

    // ---- WhatsApp Daily Summary Share ----
    shareDailySummaryViaWhatsApp() {
        const today = new Date().toISOString().split('T')[0];
        let todaySummary = null;

        if (typeof inventoryManager !== 'undefined' && inventoryManager.dailyUsage) {
            todaySummary = inventoryManager.dailyUsage.find(e => e.date === today && e.type === 'summary');
        }

        const todaysIncome = this.expenses
            .filter(e => e.date === today && (e.type || 'Expense') === 'Income')
            .reduce((sum, e) => sum + e.amount, 0);

        const formattedDate = new Date(today).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        let text = `📊 Daily Summary - ${formattedDate}\n\n`;
        if (todaySummary) {
            text += `🥤 Weight Gain Shakes: ${todaySummary.weightGainShakes || 0}\n`;
            text += `🥤 Weight Loss Shakes: ${todaySummary.weightLossShakes || 0}\n`;
            text += `👥 Total Customers: ${todaySummary.totalCustomers || 0}\n`;
        }
        text += `💰 Today's Income: ₹${todaysIncome.toFixed(2)}\n`;

        shareViaWhatsApp(text);
    }

    toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDark);
        document.getElementById('darkModeToggle').textContent = isDark ? '☀️' : '🌙';
    }

    loadDarkMode() {
        const isDark = localStorage.getItem('darkMode') === 'true';
        if (isDark) {
            document.body.classList.add('dark-mode');
            document.getElementById('darkModeToggle').textContent = '☀️';
        }
    }

    openSettings() {
        document.getElementById('settingsModal').classList.add('show');
    }

    closeSettings() {
        document.getElementById('settingsModal').classList.remove('show');
    }

    backupData() {
        const data = {
            expenses: this.expenses,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `nutrition-center-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        alert('Backup downloaded successfully!');
    }

    restoreData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.expenses && Array.isArray(data.expenses)) {
                    if (confirm('This will replace all current data. Continue?')) {
                        this.expenses = data.expenses;
                        this.saveExpenses();
                        this.renderExpenses();
                        this.updateCharts();
                        alert('Data restored successfully!');
                    }
                } else {
                    alert('Invalid backup file format.');
                }
            } catch (error) {
                alert('Error reading backup file: ' + error.message);
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset file input
    }

    clearAllData() {
        if (confirm('Are you sure you want to delete ALL data? This cannot be undone!')) {
            if (confirm('This is your last warning. All data will be permanently deleted!')) {
                this.expenses = [];
                this.saveExpenses();
                this.renderExpenses();
                this.updateCharts();
                alert('All data has been cleared.');
            }
        }
    }

    exportCSV() {
        if (this.expenses.length === 0) {
            alert('No transactions to export.');
            return;
        }

        const headers = ['Type', 'Date', 'Category', 'Description', 'Amount (₹)', 'Notes'];
        const rows = this.expenses.map(exp => [
            exp.type || 'Expense',
            exp.date,
            exp.category,
            exp.description,
            exp.amount.toFixed(2),
            exp.notes || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `nutrition-expenses-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                if (file.name.endsWith('.csv')) {
                    this.importCSV(e.target.result);
                } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                    this.importExcel(file);
                } else {
                    alert('Unsupported file format. Please use CSV or Excel files.');
                }
            } catch (error) {
                alert('Error importing file: ' + error.message);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    importCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

        const typeIndex = headers.findIndex(h => h.toLowerCase().includes('type'));
        const dateIndex = headers.findIndex(h => h.toLowerCase().includes('date'));
        const categoryIndex = headers.findIndex(h => h.toLowerCase().includes('category'));
        const descIndex = headers.findIndex(h => h.toLowerCase().includes('description') || h.toLowerCase().includes('desc'));
        const amountIndex = headers.findIndex(h => h.toLowerCase().includes('amount'));
        const notesIndex = headers.findIndex(h => h.toLowerCase().includes('note'));

        const imported = [];
        let skipped = 0;
        const today = new Date().toISOString().split('T')[0];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const values = lines[i].split(',').map(v => v.replace(/^"|"$/g, '').trim());

            if (values.length < 4) continue;

            // Validate amount
            const amount = parseFloat(values[amountIndex] || '');
            if (isNaN(amount) || amount < 0) {
                console.warn(`Import: skipped row ${i} — invalid amount "${values[amountIndex]}"`);
                skipped++;
                continue;
            }

            // Validate type
            let type = values[typeIndex] || 'Expense';
            if (type !== 'Income' && type !== 'Expense') {
                type = 'Expense';
            }

            // Validate date
            let date = values[dateIndex] || today;
            if (isNaN(new Date(date).getTime())) {
                date = today;
            }

            imported.push({
                id: generateId(),
                type,
                date,
                category: values[categoryIndex] || 'Other',
                description: values[descIndex] || '',
                amount,
                notes: values[notesIndex] || ''
            });
        }

        if (imported.length > 0) {
            this.expenses = [...imported, ...this.expenses];
            this.saveExpenses();
            this.renderExpenses();
            this.updateCharts();
            const msg = `Successfully imported ${imported.length} transactions!` +
                (skipped ? ` (${skipped} rows skipped — see console)` : '');
            alert(msg);
        } else {
            alert('No valid transactions found in the file.');
        }
    }

    importExcel(file) {
        if (typeof XLSX === 'undefined') {
            alert('Excel library not loaded. Please refresh the page.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const workbook = XLSX.read(e.target.result, { type: 'binary' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(firstSheet);
                const today = new Date().toISOString().split('T')[0];

                const imported = [];
                let skipped = 0;

                data.forEach((row, index) => {
                    // Validate amount
                    const amount = parseFloat(row.Amount || row.amount || row['Amount (₹)'] || '');
                    if (isNaN(amount) || amount < 0) {
                        console.warn(`Import: skipped Excel row ${index + 1} — invalid amount`);
                        skipped++;
                        return;
                    }

                    // Validate type
                    let type = row.Type || row.type || 'Expense';
                    if (type !== 'Income' && type !== 'Expense') {
                        type = 'Expense';
                    }

                    // Validate date
                    let date = row.Date || row.date || today;
                    if (isNaN(new Date(date).getTime())) {
                        date = today;
                    }

                    imported.push({
                        id: generateId(),
                        type,
                        date,
                        category: row.Category || row.category || 'Other',
                        description: row.Description || row.description || '',
                        amount,
                        notes: row.Notes || row.notes || ''
                    });
                });

                if (imported.length > 0) {
                    this.expenses = [...imported, ...this.expenses];
                    this.saveExpenses();
                    this.renderExpenses();
                    this.updateCharts();
                    const msg = `Successfully imported ${imported.length} transactions!` +
                        (skipped ? ` (${skipped} rows skipped — see console)` : '');
                    alert(msg);
                } else {
                    alert('No valid transactions found in the file.');
                }
            } catch (error) {
                alert('Error reading Excel file: ' + error.message);
            }
        };
        reader.readAsBinaryString(file);
    }
}

// Initialize the tracker when page loads
let tracker;
let customerManager;
let coachManager;
let dashboardManager;

document.addEventListener('DOMContentLoaded', () => {
    tracker = new ExpenseTracker();
});

