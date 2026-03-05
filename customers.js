// ============================================================
// Customer Database & Attendance Tracking
// ============================================================

class CustomerManager {
    constructor() {
        window.customerManager = this;
        this.customers = this.loadCustomers();
        this.attendance = this.loadAttendance();
        this.emiPlans = this.loadEMI();
        this.composition = this.loadComposition();
        this.editingCustomerId = null;
        this.editingEMIId = null;
        this.currentCompCustomerId = null;
        this.init();
    }

    init() {
        // Customer form
        document.getElementById('customerForm')?.addEventListener('submit', (e) => this.handleCustomerSubmit(e));
        document.getElementById('cancelCustomerEdit')?.addEventListener('click', () => this.cancelCustomerEdit());

        // Body Composition
        document.getElementById('compForm')?.addEventListener('submit', (e) => this.handleCompSubmit(e));
        document.getElementById('closeCompModal')?.addEventListener('click', () => this.closeCompModal());
        document.getElementById('whatsappCompBtn')?.addEventListener('click', () => this.shareCompProgress());

        // Live calculation for composition
        ['compWeight', 'compFat', 'compSubcut', 'compMuscle'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => this.calculateKgValues());
        });

        // Customer search & filter
        document.getElementById('customerSearch')?.addEventListener('input', () => this.renderCustomers());
        document.getElementById('customerPlanFilter')?.addEventListener('change', () => this.renderCustomers());
        
        // Auto-set pack duration
        document.getElementById('customerPlan')?.addEventListener('change', (e) => {
            const plan = e.target.value;
            const durationInput = document.getElementById('customerPackDuration');
            if (plan === 'premium-30') durationInput.value = 30;
            else if (plan === 'standard-26') durationInput.value = 26;
            else if (plan === 'hot-drink-30') durationInput.value = 30;
            else if (plan === 'trial-3') durationInput.value = 3;
        });

        // Composition search
        document.getElementById('compSearch')?.addEventListener('input', () => this.renderAllCompositions());

        // Attendance sub-tabs
        document.getElementById('attendanceTabsContainer')?.querySelectorAll('.cust-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetBtn = e.target.closest('.cust-tab-btn');
                const tabName = targetBtn.dataset.custTab;
                this.switchCustomerTab(tabName);
            });
        });

        // Attendance navigation
        document.getElementById('attendancePrevMonth')?.addEventListener('click', () => this.changeAttendanceMonth(-1));
        document.getElementById('attendanceNextMonth')?.addEventListener('click', () => this.changeAttendanceMonth(1));

        // EMI form
        document.getElementById('emiForm')?.addEventListener('submit', (e) => this.handleEMISubmit(e));
        document.getElementById('cancelEMIEdit')?.addEventListener('click', () => this.cancelEMIEdit());
        document.getElementById('emiType')?.addEventListener('change', () => this.toggleInstallmentCount());

        // EMI filter
        document.getElementById('emiStatusFilter')?.addEventListener('change', () => this.renderEMIList());

        // Event delegation for customer list
        document.getElementById('customerList')?.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            const { action, id } = btn.dataset;
            const text = btn.textContent;

            if (text.includes('Composition')) {
                const compId = btn.getAttribute('data-id');
                if (compId) this.viewComposition(compId, 'history');
                return;
            }

            if (action === 'editCustomer') this.editCustomer(id);
            else if (action === 'deleteCustomer') this.deleteCustomer(id);
            else if (action === 'whatsappCustomer') this.sendCustomerMessage(id);
        });

        // Event delegation for all compositions list
        document.getElementById('allCompositionsList')?.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            
            const text = btn.textContent;
            const id = btn.getAttribute('data-id');
            if (id) {
                if (text.includes('View Details')) {
                    this.viewComposition(id, 'history');
                } else if (text.includes('Add Entry')) {
                    this.viewComposition(id, 'form');
                }
            }
        });

        // Event delegation for attendance grid
        document.getElementById('attendanceGrid')?.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (btn && btn.dataset.action === 'whatsappAttendance') {
                this.sendAttendanceReminder(btn.dataset.id);
                return;
            }
            const cell = e.target.closest('[data-customer-id][data-date]');
            if (cell) {
                this.toggleAttendance(cell.dataset.customerId, cell.dataset.date);
            }
        });

        // Event delegation for EMI list
        document.getElementById('emiList')?.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const { action, id } = btn.dataset;
            if (action === 'recordPayment') this.showPaymentForm(id);
            else if (action === 'submitPayment') this.recordPayment(id);
            else if (action === 'cancelPayment') this.hidePaymentForm(id);
            else if (action === 'deleteEMI') this.deleteEMI(id);
            else if (action === 'whatsappEMIReminder') this.sendEMIReminder(id);
        });

        // Migration button
        document.getElementById('runMigrationBtn')?.addEventListener('click', () => this.runMigration());
        
        // Daily Check-in Actions
        document.getElementById('whatsappDailyAttendance')?.addEventListener('click', () => this.shareDailyAttendance());
        document.getElementById('downloadDailyAttendance')?.addEventListener('click', () => this.downloadDailyAttendance());

        // Populate customer dropdown in EMI form
        this.populateEMICustomerDropdown();

        // Attendance month tracking
        this.attendanceMonth = new Date().getMonth();
        this.attendanceYear = new Date().getFullYear();

        // Initial render
        this.renderCustomers();
        this.renderDailyCheckin();
        this.renderAttendance();
        this.renderEMIList();
        this.renderAllCompositions();
    }

    // ---- Customer Sub-tabs ----
    switchCustomerTab(tabName) {
        // Only target sub-tabs within the attendance section
        const container = document.getElementById('attendanceSection');
        if (!container) return;

        container.querySelectorAll('.cust-tab-btn').forEach(btn => btn.classList.remove('active'));
        container.querySelectorAll('.cust-tab-content').forEach(content => content.classList.remove('active'));

        container.querySelector(`[data-cust-tab="${tabName}"]`)?.classList.add('active');
        document.getElementById(`${tabName}CustTab`)?.classList.add('active');

        if (tabName === 'attendanceGrid') {
            this.renderAttendance();
        } else if (tabName === 'dailyCheckin') {
            this.renderDailyCheckin();
        }
    }

    // ---- Load / Save Customers ----
    loadCustomers() {
        const stored = localStorage.getItem('nutritionCustomers');
        if (stored && stored !== '[]' && stored !== 'null') {
            try {
                const data = JSON.parse(stored);
                return Array.isArray(data) ? data : [];
            } catch (e) { return []; }
        }
        return [];
    }

    saveCustomers() {
        try {
            localStorage.setItem('nutritionCustomers', JSON.stringify(this.customers));
        } catch (e) {
            console.error('Failed to save customers:', e);
        }
    }

    // ---- Load / Save Attendance ----
    loadAttendance() {
        const stored = localStorage.getItem('nutritionAttendance');
        if (stored && stored !== '[]' && stored !== 'null') {
            try {
                const data = JSON.parse(stored);
                return Array.isArray(data) ? data : [];
            } catch (e) { return []; }
        }
        return [];
    }

    saveAttendance() {
        try {
            localStorage.setItem('nutritionAttendance', JSON.stringify(this.attendance));
        } catch (e) {
            console.error('Failed to save attendance:', e);
        }
    }

    // ---- Load / Save EMI ----
    loadEMI() {
        const stored = localStorage.getItem('nutritionEMI');
        if (stored && stored !== '[]' && stored !== 'null') {
            try {
                const data = JSON.parse(stored);
                return Array.isArray(data) ? data : [];
            } catch (e) { return []; }
        }
        return [];
    }

    saveEMI() {
        try {
            localStorage.setItem('nutritionEMI', JSON.stringify(this.emiPlans));
        } catch (e) {
            console.error('Failed to save EMI data:', e);
        }
    }

    // ---- Load / Save Composition ----
    loadComposition() {
        const stored = localStorage.getItem('nutritionComposition');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                // Ensure everything is sorted ascending
                Object.keys(data).forEach(id => {
                    if (Array.isArray(data[id])) {
                        data[id].sort((a, b) => new Date(a.date) - new Date(b.date));
                    }
                });
                return data;
            } catch (e) { return {}; }
        }
        return {};
    }

    saveComposition() {
        try {
            localStorage.setItem('nutritionComposition', JSON.stringify(this.composition));
            if (window.cloudSync) window.cloudSync.queueSync('nutritionComposition');
        } catch (e) {
            console.error('Failed to save composition:', e);
        }
    }

    // ---- Customer CRUD ----
    handleCustomerSubmit(e) {
        e.preventDefault();
        const name = document.getElementById('customerName').value.trim();
        const phone = document.getElementById('customerPhone').value.trim();
        const referredBy = document.getElementById('customerReferred')?.value.trim() || '';
        const age = document.getElementById('customerAge')?.value || '';
        const gender = document.getElementById('customerGender')?.value || 'male';
        const height = document.getElementById('customerHeight')?.value || '';
        const address = document.getElementById('customerAddress')?.value.trim() || '';
        const todayStr = new Date().toISOString().split('T')[0];
        const packStart = document.getElementById('customerPackStart')?.value || todayStr;
        const packDuration = parseInt(document.getElementById('customerPackDuration')?.value || '30');
        const goal = document.getElementById('customerGoal').value;
        const plan = document.getElementById('customerPlan').value;
        const joinDate = document.getElementById('customerJoinDate')?.value || todayStr;
        const notes = document.getElementById('customerNotes').value.trim();

        // Allowing all fields to be optional as requested
        if (!name && !phone) return;

        if (this.editingCustomerId) {
            const index = this.customers.findIndex(c => c.id === this.editingCustomerId);
            if (index !== -1) {
                this.customers[index] = { 
                    ...this.customers[index], 
                    name, phone, referredBy, age, gender, height, address, packStart, packDuration, goal, plan, joinDate, notes 
                };
            }
            this.cancelCustomerEdit();
        } else {
            this.customers.unshift({
                id: generateId(),
                name,
                phone,
                referredBy,
                age,
                gender,
                height,
                address,
                packStart,
                packDuration,
                goal,
                plan,
                joinDate,
                notes,
                active: true
            });
        }

        this.saveCustomers();
        this.renderCustomers();
        this.populateEMICustomerDropdown();
        document.getElementById('customerForm').reset();
        document.getElementById('customerJoinDate').value = new Date().toISOString().split('T')[0];

        if (typeof inventoryManager !== 'undefined') {
            inventoryManager.showToast(this.editingCustomerId ? 'Customer updated!' : 'Customer added!', 'success');
        }
    }

    editCustomer(id) {
        const customer = this.customers.find(c => c.id === id);
        if (!customer) return;

        this.editingCustomerId = id;
        document.getElementById('customerName').value = customer.name;
        document.getElementById('customerPhone').value = customer.phone || '';
        if (document.getElementById('customerReferred')) document.getElementById('customerReferred').value = customer.referredBy || '';
        if (document.getElementById('customerAge')) document.getElementById('customerAge').value = customer.age || '';
        if (document.getElementById('customerGender')) document.getElementById('customerGender').value = customer.gender || 'male';
        if (document.getElementById('customerHeight')) document.getElementById('customerHeight').value = customer.height || '';
        if (document.getElementById('customerAddress')) document.getElementById('customerAddress').value = customer.address || '';
        if (document.getElementById('customerPackStart')) document.getElementById('customerPackStart').value = customer.packStart || '';
        if (document.getElementById('customerPackDuration')) document.getElementById('customerPackDuration').value = customer.packDuration || 30;
        if (document.getElementById('customerGoal')) document.getElementById('customerGoal').value = customer.goal || 'wellness';
        document.getElementById('customerPlan').value = customer.plan;
        document.getElementById('customerJoinDate').value = customer.joinDate || '';
        document.getElementById('customerNotes').value = customer.notes || '';

        document.getElementById('cancelCustomerEdit').style.display = 'block';
        document.querySelector('#customerForm button[type="submit"]').textContent = 'Update Customer';
        document.getElementById('customerForm').scrollIntoView({ behavior: 'smooth' });
    }

    cancelCustomerEdit() {
        this.editingCustomerId = null;
        document.getElementById('customerForm').reset();
        document.getElementById('customerJoinDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('cancelCustomerEdit').style.display = 'none';
        document.querySelector('#customerForm button[type="submit"]').textContent = 'Add Customer';
    }

    // ---- Body Composition Methods ----
    renderAllCompositions() {
        const listContainer = document.getElementById('allCompositionsList');
        const searchTerm = document.getElementById('compSearch')?.value.toLowerCase() || '';
        
        if (!listContainer) return;

        const results = this.customers.filter(customer => {
            const matchesSearch = customer.name.toLowerCase().includes(searchTerm) || 
                                 customer.phone.includes(searchTerm);
            return matchesSearch;
        });

        if (results.length === 0) {
            listContainer.innerHTML = '<p class="empty-state">No customers found.</p>';
            return;
        }

        listContainer.innerHTML = results.map(customer => {
            const records = this.composition[customer.id] || [];
            const lastRecord = records[records.length - 1];
            const secondLastRecord = records[records.length - 2];
            
            let statusHTML = '<span class="status-badge status-inactive">No data</span>';
            let trendHTML = '';
            let detailsHTML = '<p>Start tracking by clicking below.</p>';

            if (lastRecord) {
                statusHTML = `<span class="status-badge status-active">Last entry: ${new Date(lastRecord.date).toLocaleDateString('en-GB')}</span>`;
                
                const fatKg = (lastRecord.weight * lastRecord.fat / 100).toFixed(1);
                const muscleKg = (lastRecord.weight * lastRecord.muscle / 100).toFixed(1);

                if (secondLastRecord) {
                    const diff = (lastRecord.weight - secondLastRecord.weight).toFixed(1);
                    const color = diff > 0 ? 'var(--danger-color)' : 'var(--secondary-color)';
                    const arrow = diff > 0 ? '↗' : '↘';
                    trendHTML = `<span style="color:${color}; font-weight:bold; margin-left:10px;">${arrow} ${Math.abs(diff)} kg</span>`;
                }

                detailsHTML = `
                    <p><strong>Weight:</strong> ${lastRecord.weight} kg ${trendHTML}</p>
                    <p><strong>Fat:</strong> ${fatKg} kg (${lastRecord.fat}%) | <strong>Muscle:</strong> ${muscleKg} kg</p>
                `;
            }

            return `
                <div class="customer-card">
                    <div class="customer-card-header">
                        <h4>${customer.name}</h4>
                        ${statusHTML}
                    </div>
                    <div class="customer-card-details">
                        <p><strong>Phone:</strong> ${customer.phone}</p>
                        ${detailsHTML}
                    </div>
                    <div class="customer-card-actions">
                        <button class="btn btn-secondary btn-sm" data-id="${customer.id}">View Details</button>
                        <button class="btn btn-primary btn-sm" data-id="${customer.id}">Add Entry</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    viewComposition(id, mode = 'both') {
        const customer = this.customers.find(c => String(c.id) === String(id));
        if (!customer) return;

        this.currentCompCustomerId = customer.id;
        document.getElementById('compCustomerName').textContent = `Body Composition: ${customer.name}`;
        document.getElementById('compDate').value = new Date().toISOString().split('T')[0];
        
        // Toggle sections based on mode
        const formSection = document.getElementById('compFormSection');
        const historySection = document.getElementById('compHistorySection');
        
        if (formSection) formSection.style.display = (mode === 'form' || mode === 'both') ? 'block' : 'none';
        if (historySection) historySection.style.display = (mode === 'history' || mode === 'both') ? 'block' : 'none';

        this.renderComposition();
        document.getElementById('compositionModal').classList.add('show');
    }

    closeCompModal() {
        this.currentCompCustomerId = null;
        document.getElementById('compositionModal').classList.remove('show');
        document.getElementById('compForm').reset();
        // Clear calculated labels
        ['calcFatKg', 'calcSubcutKg', 'calcMuscleKg', 'calcVisceralKg'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '';
        });
    }

    calculateKgValues() {
        const weight = parseFloat(document.getElementById('compWeight').value) || 0;
        const fatPct = parseFloat(document.getElementById('compFat').value) || 0;
        const subcutPct = parseFloat(document.getElementById('compSubcut').value) || 0;
        const musclePct = parseFloat(document.getElementById('compMuscle').value) || 0;

        if (weight > 0) {
            const fatKg = (weight * fatPct / 100).toFixed(2);
            const subcutKg = (weight * subcutPct / 100).toFixed(2);
            const muscleKg = (weight * musclePct / 100).toFixed(2);
            const vfKg = (fatKg - subcutKg).toFixed(2);

            if (document.getElementById('calcFatKg')) document.getElementById('calcFatKg').textContent = `(${fatKg} kg)`;
            if (document.getElementById('calcSubcutKg')) document.getElementById('calcSubcutKg').textContent = `(${subcutKg} kg)`;
            if (document.getElementById('calcMuscleKg')) document.getElementById('calcMuscleKg').textContent = `(${muscleKg} kg)`;
            
            const vfInput = document.getElementById('compVisceral');
            if (vfInput) vfInput.value = vfKg;
            if (document.getElementById('calcVisceralKg')) document.getElementById('calcVisceralKg').textContent = `(${vfKg} kg)`;
        }
    }

    handleCompSubmit(e) {
        e.preventDefault();
        if (!this.currentCompCustomerId) return;

        const dateVal = document.getElementById('compDate').value || new Date().toISOString().split('T')[0];
        
        const record = {
            id: generateId(),
            date: dateVal,
            weight: parseFloat(document.getElementById('compWeight').value) || 0,
            fat: parseFloat(document.getElementById('compFat').value) || 0,
            visceral: parseFloat(document.getElementById('compVisceral').value) || 0,
            bmr: parseInt(document.getElementById('compBMR').value) || 0,
            bmi: parseFloat(document.getElementById('compBMI').value) || 0,
            bodyAge: parseInt(document.getElementById('compBodyAge').value) || 0,
            subcut: parseFloat(document.getElementById('compSubcut').value) || 0,
            muscle: parseFloat(document.getElementById('compMuscle').value) || 0
        };

        if (!this.composition[this.currentCompCustomerId]) {
            this.composition[this.currentCompCustomerId] = [];
        }

        this.composition[this.currentCompCustomerId].push(record);
        this.composition[this.currentCompCustomerId].sort((a, b) => new Date(a.date) - new Date(b.date));

        this.saveComposition();
        this.renderComposition();
        this.renderAllCompositions();
        
        // After adding, show the history to confirm it was added
        this.viewComposition(this.currentCompCustomerId, 'history');
        
        document.getElementById('compForm').reset();
        document.getElementById('compDate').value = new Date().toISOString().split('T')[0];
        
        if (typeof inventoryManager !== 'undefined') {
            inventoryManager.showToast('Composition record added!', 'success');
        }
    }

    renderComposition() {
        const tbody = document.getElementById('compTableBody');
        const summaryDiv = document.getElementById('compWeeklySummary');
        if (!tbody) return;

        const customer = this.customers.find(c => c.id === this.currentCompCustomerId);
        const goal = customer?.goal || 'wellness';

        const records = this.composition[this.currentCompCustomerId] || [];
        if (records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:20px;">No records yet.</td></tr>';
            if (summaryDiv) summaryDiv.innerHTML = '';
            return;
        }

        // Calculate differences for the top 2 records
        let summaryHTML = '';
        let diffRowHTML = '';

        if (records.length >= 2) {
            const latest = records[records.length - 1];
            const prev = records[records.length - 2];

            const diff = (val1, val2, precision = 2) => (val1 - val2).toFixed(precision);
            
            // KG Calculations
            const lFatKg = (latest.weight * latest.fat / 100);
            const pFatKg = (prev.weight * prev.fat / 100);
            const lSubcutKg = (latest.weight * latest.subcut / 100);
            const pSubcutKg = (prev.weight * prev.subcut / 100);
            const lMuscleKg = (latest.weight * latest.muscle / 100);
            const pMuscleKg = (prev.weight * prev.muscle / 100);

            const wDiff = diff(latest.weight, prev.weight, 1);
            const fDiff = diff(lFatKg, pFatKg);
            const mDiff = diff(lMuscleKg, pMuscleKg);
            const vfDiff = diff(lFatKg - lSubcutKg, pFatKg - pSubcutKg);

            const getIcon = (val, type) => {
                let isGood = false;
                const numVal = parseFloat(val);
                if (type === 'weight') {
                    if (goal === 'weight-gain') isGood = numVal > 0;
                    else isGood = numVal < 0;
                } else if (type === 'muscle') {
                    isGood = numVal > 0;
                } else {
                    // fat, vf, subcut
                    isGood = numVal < 0;
                }
                const color = numVal === 0 ? 'gray' : (isGood ? '#50c878' : '#e74c3c');
                const arrow = numVal > 0 ? '▲' : (numVal < 0 ? '▼' : '—');
                return `<span style="color:${color}; font-weight:bold;">${arrow} ${Math.abs(numVal)}</span>`;
            };

            summaryHTML = `
                <div style="background:#f8f9fa; padding:10px; border-radius:8px; border-left:4px solid #4a90e2; text-align:center;">
                    <div style="font-size:0.7rem; color:gray; text-transform:uppercase;">Weight</div>
                    <div style="font-weight:bold;">${getIcon(wDiff, 'weight')}</div>
                </div>
                <div style="background:#f8f9fa; padding:10px; border-radius:8px; border-left:4px solid #e74c3c; text-align:center;">
                    <div style="font-size:0.7rem; color:gray; text-transform:uppercase;">Fat Loss</div>
                    <div style="font-weight:bold;">${getIcon(fDiff, 'fat')}</div>
                </div>
                <div style="background:#f8f9fa; padding:10px; border-radius:8px; border-left:4px solid #50c878; text-align:center;">
                    <div style="font-size:0.7rem; color:gray; text-transform:uppercase;">Muscle Gain</div>
                    <div style="font-weight:bold;">${getIcon(mDiff, 'muscle')}</div>
                </div>
                <div style="background:#f8f9fa; padding:10px; border-radius:8px; border-left:4px solid #f39c12; text-align:center;">
                    <div style="font-size:0.7rem; color:gray; text-transform:uppercase;">Visceral</div>
                    <div style="font-weight:bold;">${getIcon(vfDiff, 'vf')}</div>
                </div>
            `;

            diffRowHTML = `
                <tr style="background:rgba(74, 144, 226, 0.1); font-size:0.85rem; border-top: 2px solid #4a90e2;">
                    <td style="font-weight:bold; color:#4a90e2;">Latest Change (${goal === 'weight-gain' ? 'Gain' : 'Loss'} Mode)</td>
                    <td>${getIcon(wDiff, 'weight')}</td>
                    <td>${getIcon(fDiff, 'fat')}</td>
                    <td>${getIcon(vfDiff, 'vf')}</td>
                    <td>${diff(latest.bmr, prev.bmr, 0)}</td>
                    <td>${diff(latest.bmi, prev.bmi, 1)}</td>
                    <td>${diff(latest.bodyAge, prev.bodyAge, 0)}</td>
                    <td>${getIcon(diff(lSubcutKg, pSubcutKg), 'subcut')}</td>
                    <td>${getIcon(mDiff, 'muscle')}</td>
                    <td></td>
                </tr>
            `;
        }

        if (summaryDiv) summaryDiv.innerHTML = summaryHTML;

        const mainRows = records.map(r => {
            // Calculate KG on the fly for history
            const fatKg = (r.weight * r.fat / 100).toFixed(2);
            const subcutKg = (r.weight * r.subcut / 100).toFixed(2);
            const muscleKg = (r.weight * r.muscle / 100).toFixed(2);
            const vfKg = (fatKg - subcutKg).toFixed(2);

            return `
                <tr>
                    <td>${new Date(r.date).toLocaleDateString('en-GB')}</td>
                    <td><strong>${r.weight}</strong></td>
                    <td>
                        <div style="font-weight:bold;">${fatKg}</div>
                        <div style="font-size:0.75rem; color:var(--text-secondary);">${r.fat}%</div>
                    </td>
                    <td>
                        <div style="font-weight:bold; color:var(--danger-color);">${vfKg}</div>
                    </td>
                    <td>${r.bmr}</td>
                    <td>${r.bmi}</td>
                    <td>${r.bodyAge}</td>
                    <td>${subcutKg}</td>
                    <td>
                        <div style="font-weight:bold;">${muscleKg}</div>
                        <div style="font-size:0.75rem; color:var(--text-secondary);">${r.muscle}%</div>
                    </td>
                    <td>
                        <button class="btn btn-delete btn-whatsapp-sm" onclick="customerManager.deleteCompRecord('${r.id}')">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = mainRows + diffRowHTML;
    }

    deleteCompRecord(recordId) {
        if (!this.currentCompCustomerId) return;
        if (!confirm('Delete this record?')) return;

        this.composition[this.currentCompCustomerId] = this.composition[this.currentCompCustomerId].filter(r => r.id !== recordId);
        this.saveComposition();
        this.renderComposition();
    }

    shareCompProgress() {
        if (!this.currentCompCustomerId) return;
        const customer = this.customers.find(c => c.id === this.currentCompCustomerId);
        const records = this.composition[this.currentCompCustomerId] || [];
        if (records.length === 0) return;

        const latest = records[records.length - 1];
        const previous = records[records.length - 2];

        const fatKg = (latest.weight * latest.fat / 100).toFixed(2);
        const subcutKg = (latest.weight * latest.subcut / 100).toFixed(2);
        const muscleKg = (latest.weight * latest.muscle / 100).toFixed(2);
        const vfKg = (fatKg - subcutKg).toFixed(2);

        let message = `*Body Composition Report: ${customer.name}*\n`;
        message += `Date: ${new Date(latest.date).toLocaleDateString('en-GB')}\n\n`;
        message += `Weight: ${latest.weight} kg ${previous ? (latest.weight < previous.weight ? '▼' : '▲') : ''}\n`;
        message += `Total Fat: ${fatKg} kg (${latest.fat}%)\n`;
        message += `Visceral Fat: ${vfKg} kg\n`;
        message += `Muscle: ${muscleKg} kg (${latest.muscle}%)\n`;
        message += `Body Age: ${latest.bodyAge}\n`;
        message += `BMI: ${latest.bmi}\n`;
        message += `BMR: ${latest.bmr}\n\n`;
        
        if (previous) {
            const weightDiff = (latest.weight - previous.weight).toFixed(1);
            message += `Progress since last check: ${weightDiff > 0 ? '+' : ''}${weightDiff} kg\n`;
        }
        
        message += `Keep going! Consistency is the key! 💪🍎`;
        this.openWhatsApp(customer.phone, message);
    }

    deleteCustomer(id) {
        if (confirm('Are you sure you want to delete this customer?')) {
            this.customers = this.customers.filter(c => c.id !== id);
            this.saveCustomers();
            this.renderCustomers();
            this.populateEMICustomerDropdown();
            if (this.editingCustomerId === id) this.cancelCustomerEdit();
        }
    }

    // ---- Render Customers ----
    renderCustomers() {
        const list = document.getElementById('customerList');
        if (!list) return;

        try {
            const search = (document.getElementById('customerSearch')?.value || '').toLowerCase();
            const planFilter = document.getElementById('customerPlanFilter')?.value || '';

            let filtered = this.customers.filter(c => {
                const matchesSearch = !search || c.name.toLowerCase().includes(search) || (c.phone && c.phone.includes(search));
                const matchesPlan = !planFilter || c.plan === planFilter;
                return matchesSearch && matchesPlan;
            });

            if (filtered.length === 0) {
                list.innerHTML = '<div class="empty-state">No customers found. Add your first customer above!</div>';
                return;
            }

            list.innerHTML = filtered.map(c => {
                let streak = 0;
                try { streak = this.getStreak(c.id); } catch(e) { console.error("Streak error", e); }
                
                let statusHtml = '';
                try {
                    const status = this.getPackStatus(c);
                    if (status) {
                        const color = status.isExpired ? 'var(--danger-color)' : (status.daysLeft <= 3 ? 'var(--warning-color)' : 'var(--secondary-color)');
                        statusHtml = `<span style="font-size:0.85rem; color:${color}; font-weight:700; background:rgba(0,0,0,0.05); padding:2px 8px; border-radius:4px; margin-left:10px;">
                            ${status.isExpired ? 'Expired' : status.daysLeft + ' Days Left'}
                        </span>`;
                    }
                } catch(e) { console.error("Status error", e); }

            const planLabels = { 
                'premium-30': 'Premium 30D', 
                'standard-26': 'Standard 26D', 
                'hot-drink-30': 'Hot Drink 30D',
                'trial-3': '3-Day Trial',
                'general': 'General'
            };
            const planColors = { 
                'premium-30': '#667eea', 
                'standard-26': '#50c878', 
                'hot-drink-30': '#f39c12',
                'trial-3': '#e74c3c',
                'general': '#4a90e2'
            };

            return `
                <div class="customer-card">
                    <div class="customer-card-header">
                        <div>
                            <div class="customer-name">${escapeHtml(c.name)} ${statusHtml}</div>
                            <div class="customer-phone">${c.phone ? escapeHtml(c.phone) : 'No phone'}</div>
                        </div>
                        <span class="plan-badge" style="background: ${planColors[c.plan] || '#4a90e2'}">${planLabels[c.plan] || c.plan}</span>
                    </div>
                    <div class="customer-details">
                        <span>Joined: ${c.joinDate ? new Date(c.joinDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                        <span>${c.age ? 'Age: ' + c.age : ''}</span>
                        <span>${c.height ? 'Ht: ' + c.height + 'cm' : ''}</span>
                        <span>Streak: ${streak} days</span>
                    </div>
                    ${c.referredBy ? `<div class="customer-notes">Ref: ${escapeHtml(c.referredBy)}</div>` : ''}
                    ${c.address ? `<div class="customer-notes">Addr: ${escapeHtml(c.address)}</div>` : ''}
                    ${c.notes ? `<div class="customer-notes">${escapeHtml(c.notes)}</div>` : ''}
                    <div class="customer-actions" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <button class="btn btn-info" style="background:#17a2b8; color:white;" data-id="${c.id}">📊 Composition</button>
                        <button class="btn btn-whatsapp" data-action="whatsappCustomer" data-id="${c.id}">📱 WhatsApp</button>
                        <button class="btn btn-edit" data-action="editCustomer" data-id="${c.id}">Edit</button>
                        <button class="btn btn-delete" data-action="deleteCustomer" data-id="${c.id}">Delete</button>
                    </div>
                </div>
            `;
            }).join('');
        } catch (error) {
            console.error('Render Customers error:', error);
            list.innerHTML = `<div class="empty-state">Error loading customers: ${error.message}</div>`;
        }
    }

    // ---- Attendance ----
    toggleAttendance(customerId, date) {
        const existing = this.attendance.findIndex(a => a.customerId === customerId && a.date === date);
        if (existing !== -1) {
            this.attendance.splice(existing, 1);
        } else {
            this.attendance.push({ id: generateId(), customerId, date });
        }
        this.saveAttendance();
        this.renderAttendance();
    }

    changeAttendanceMonth(delta) {
        this.attendanceMonth += delta;
        if (this.attendanceMonth > 11) { this.attendanceMonth = 0; this.attendanceYear++; }
        if (this.attendanceMonth < 0) { this.attendanceMonth = 11; this.attendanceYear--; }
        this.renderAttendance();
    }

    renderAttendance() {
        const grid = document.getElementById('attendanceGrid');
        const monthLabel = document.getElementById('attendanceMonthLabel');
        if (!grid || !monthLabel) return;

        try {
            const year = this.attendanceYear;
            const month = this.attendanceMonth;
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            monthLabel.textContent = monthName;

            const activeCustomers = this.customers.filter(c => c.active !== false);

            if (activeCustomers.length === 0) {
                grid.innerHTML = '<div class="empty-state">No active customers. Add customers first!</div>';
                return;
            }

            let html = '<div class="attendance-table-wrapper"><table class="attendance-table"><thead><tr><th>Customer</th>';
            for (let d = 1; d <= daysInMonth; d++) {
                html += `<th>${d}</th>`;
            }
            html += '<th>Month</th><th>Left</th></tr></thead><tbody>';

            activeCustomers.forEach(c => {
                const status = this.getPackStatus(c);
                let leftDisplay = '-';
                let leftColor = '';
                
                if (status) {
                    leftDisplay = status.daysLeft;
                    if (status.isExpired) {
                        leftDisplay = '🚫 0';
                        leftColor = 'var(--danger-color)';
                    } else if (status.daysLeft <= 3) {
                        leftColor = 'var(--warning-color)';
                        leftDisplay = `⚠️ ${status.daysLeft}`;
                    }
                }

                html += `<tr><td class="attendance-customer-name">${escapeHtml(c.name)}</td>`;
                let monthTotal = 0;
                for (let d = 1; d <= daysInMonth; d++) {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const isPresent = this.attendance.some(a => a.customerId === c.id && a.date === dateStr);
                    if (isPresent) monthTotal++;
                    html += `<td class="attendance-cell ${isPresent ? 'present' : ''}" data-customer-id="${c.id}" data-date="${dateStr}">${isPresent ? '&#10003;' : ''}</td>`;
                }
                html += `<td class="attendance-total">${monthTotal}</td>
                        <td style="font-weight:700; color:${leftColor}; text-align:center;">${leftDisplay}</td></tr>`;
            });

            html += '</tbody></table></div>';

            // Inactive customers section with remind buttons
            const inactiveList = this.getInactiveCustomers();
            if (inactiveList.length > 0) {
                html += `<div class="inactive-alert">
                    <strong>Inactive (no attendance in 7 days):</strong>
                    <div class="inactive-customers-list">
                        ${inactiveList.map(c => {
                            const lastDate = this.attendance
                                .filter(a => a.customerId === c.id)
                                .map(a => a.date)
                                .sort()
                                .reverse()[0];
                            const daysAgo = lastDate ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000) : 'many';
                            return `<div class="inactive-customer-item">
                                <span>${escapeHtml(c.name)} — ${daysAgo} days ago</span>
                                <button class="btn btn-whatsapp btn-whatsapp-sm" data-action="whatsappAttendance" data-id="${c.id}">📱 Remind</button>
                            </div>`;
                        }).join('')}
                    </div>
                </div>`;
            }

            grid.innerHTML = html;
        } catch (error) {
            console.error("Attendance render error:", error);
            grid.innerHTML = `<div class="empty-state">Error loading attendance: ${error.message}</div>`;
        }
    }

    getStreak(customerId) {
        try {
            const dates = new Set(this.attendance
                .filter(a => a.customerId === customerId)
                .map(a => a.date));

            if (dates.size === 0) return 0;

            let streak = 0;
            let checkDate = new Date();
            checkDate.setHours(0, 0, 0, 0);

            // Check up to 365 days back
            for (let i = 0; i < 365; i++) {
                const dateStr = checkDate.toISOString().split('T')[0];
                if (dates.has(dateStr)) {
                    streak++;
                } else {
                    // If we didn't find today but find yesterday, continue streak
                    // Otherwise break
                    if (i > 0) break; 
                    
                    // If i == 0 (today), it's possible they haven't checked in YET today
                    // So we check yesterday too
                    const yesterday = new Date(checkDate);
                    yesterday.setDate(yesterday.getDate() - 1);
                    if (!dates.has(yesterday.toISOString().split('T')[0])) break;
                }
                checkDate.setDate(checkDate.getDate() - 1);
            }
            return streak;
        } catch (e) {
            console.error("Streak calculation error:", e);
            return 0;
        }
    }

    getInactiveCustomers() {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

        return this.customers.filter(c => {
            if (c.active === false) return false;
            const recentAttendance = this.attendance.some(a => a.customerId === c.id && a.date >= sevenDaysAgoStr);
            return !recentAttendance;
        });
    }

    getTodayAttendanceCount() {
        const today = new Date().toISOString().split('T')[0];
        return this.attendance.filter(a => a.date === today).length;
    }

    // ---- EMI / Installment Tracking ----
    populateEMICustomerDropdown() {
        const select = document.getElementById('emiCustomer');
        if (!select) return;
        select.innerHTML = '<option value="">Select Customer</option>';
        this.customers.forEach(c => {
            select.innerHTML += `<option value="${c.id}">${escapeHtml(c.name)}</option>`;
        });
    }

    toggleInstallmentCount() {
        const type = document.getElementById('emiType')?.value;
        const countGroup = document.getElementById('emiInstallmentCountGroup');
        if (countGroup) {
            countGroup.style.display = type === 'fixed' ? 'block' : 'none';
        }
    }

    handleEMISubmit(e) {
        e.preventDefault();
        const customerId = document.getElementById('emiCustomer').value;
        const description = document.getElementById('emiDescription').value.trim();
        const totalAmount = parseFloat(document.getElementById('emiTotalAmount').value);
        const type = document.getElementById('emiType').value;
        const installmentCount = type === 'fixed' ? parseInt(document.getElementById('emiInstallmentCount').value) : 0;
        const startDate = document.getElementById('emiStartDate').value;
        const notes = document.getElementById('emiNotes').value.trim();

        if (!customerId || !totalAmount) return;

        const customer = this.customers.find(c => c.id === customerId);
        const customerName = customer ? customer.name : 'Unknown';

        if (this.editingEMIId) {
            const index = this.emiPlans.findIndex(e => e.id === this.editingEMIId);
            if (index !== -1) {
                this.emiPlans[index] = {
                    ...this.emiPlans[index],
                    customerId, customerName, description, totalAmount, type, installmentCount, startDate, notes
                };
            }
            this.cancelEMIEdit();
        } else {
            this.emiPlans.unshift({
                id: generateId(),
                customerId,
                customerName,
                description,
                totalAmount,
                type,
                installmentCount,
                payments: [],
                startDate,
                status: 'active',
                notes
            });
        }

        this.saveEMI();
        this.renderEMIList();
        document.getElementById('emiForm').reset();
        document.getElementById('emiStartDate').value = new Date().toISOString().split('T')[0];
        this.toggleInstallmentCount();

        if (typeof inventoryManager !== 'undefined') {
            inventoryManager.showToast(this.editingEMIId ? 'EMI plan updated!' : 'EMI plan created!', 'success');
        }
    }

    cancelEMIEdit() {
        this.editingEMIId = null;
        document.getElementById('emiForm').reset();
        document.getElementById('emiStartDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('cancelEMIEdit').style.display = 'none';
        document.querySelector('#emiForm button[type="submit"]').textContent = 'Create EMI Plan';
        this.toggleInstallmentCount();
    }

    deleteEMI(id) {
        if (confirm('Are you sure you want to delete this EMI plan?')) {
            this.emiPlans = this.emiPlans.filter(e => e.id !== id);
            this.saveEMI();
            this.renderEMIList();
        }
    }

    showPaymentForm(emiId) {
        const form = document.getElementById(`paymentForm-${emiId}`);
        if (form) form.style.display = 'block';
    }

    hidePaymentForm(emiId) {
        const form = document.getElementById(`paymentForm-${emiId}`);
        if (form) form.style.display = 'none';
    }

    recordPayment(emiId) {
        const amountInput = document.getElementById(`paymentAmount-${emiId}`);
        const notesInput = document.getElementById(`paymentNotes-${emiId}`);
        const amount = parseFloat(amountInput?.value);
        const notes = notesInput?.value || '';

        if (!amount || amount <= 0) return;

        const emi = this.emiPlans.find(e => e.id === emiId);
        if (!emi) return;

        emi.payments.push({
            id: generateId(),
            amount,
            date: new Date().toISOString().split('T')[0],
            notes
        });

        const totalPaid = emi.payments.reduce((sum, p) => sum + p.amount, 0);
        if (totalPaid >= emi.totalAmount) {
            emi.status = 'completed';
        }

        this.saveEMI();
        this.renderEMIList();

        if (typeof inventoryManager !== 'undefined') {
            inventoryManager.showToast('Payment recorded!', 'success');
        }
    }

    renderEMIList() {
        const list = document.getElementById('emiList');
        if (!list) return;

        const statusFilter = document.getElementById('emiStatusFilter')?.value || '';
        let filtered = this.emiPlans;
        if (statusFilter) {
            filtered = filtered.filter(e => e.status === statusFilter);
        }

        if (filtered.length === 0) {
            list.innerHTML = '<div class="empty-state">No EMI plans found. Create one above!</div>';
            return;
        }

        list.innerHTML = filtered.map(emi => {
            const totalPaid = emi.payments.reduce((sum, p) => sum + p.amount, 0);
            const remaining = Math.max(0, emi.totalAmount - totalPaid);
            const progress = emi.totalAmount > 0 ? Math.min(100, (totalPaid / emi.totalAmount) * 100) : 0;
            const isCompleted = emi.status === 'completed';

            let nextDueDate = '';
            if (emi.type === 'fixed' && emi.installmentCount > 0 && !isCompleted) {
                const paidCount = emi.payments.length;
                const startDate = new Date(emi.startDate);
                const nextDue = new Date(startDate);
                nextDue.setMonth(nextDue.getMonth() + paidCount);
                nextDueDate = nextDue.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            }

            const paymentsHtml = emi.payments.length > 0 ? `
                <div class="emi-payments-list">
                    <strong>Payment History:</strong>
                    ${emi.payments.map(p => `
                        <div class="emi-payment-item">
                            <span>${new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            <span>₹${p.amount.toFixed(2)}</span>
                            ${p.notes ? `<span class="payment-note">${escapeHtml(p.notes)}</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : '';

            return `
                <div class="emi-card ${isCompleted ? 'emi-completed' : ''}">
                    <div class="emi-card-header">
                        <div>
                            <div class="emi-customer-name">${escapeHtml(emi.customerName)}</div>
                            <div class="emi-description">${escapeHtml(emi.description || 'No description')}</div>
                        </div>
                        <span class="emi-status-badge ${isCompleted ? 'status-completed' : 'status-active'}">${isCompleted ? 'Completed' : 'Active'}</span>
                    </div>
                    <div class="emi-amounts">
                        <div class="emi-amount-item">
                            <span class="emi-amount-label">Total</span>
                            <span class="emi-amount-value">₹${emi.totalAmount.toFixed(2)}</span>
                        </div>
                        <div class="emi-amount-item">
                            <span class="emi-amount-label">Paid</span>
                            <span class="emi-amount-value" style="color: var(--secondary-color)">₹${totalPaid.toFixed(2)}</span>
                        </div>
                        <div class="emi-amount-item">
                            <span class="emi-amount-label">Remaining</span>
                            <span class="emi-amount-value" style="color: var(--danger-color)">₹${remaining.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="emi-progress-bar">
                        <div class="emi-progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div class="emi-meta">
                        <span>Type: ${emi.type === 'fixed' ? 'Fixed (' + emi.installmentCount + ' installments)' : 'Flexible'}</span>
                        ${nextDueDate ? `<span>Next Due: ${nextDueDate}</span>` : ''}
                        <span>Started: ${emi.startDate ? new Date(emi.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                    </div>
                    ${paymentsHtml}
                    <div class="emi-actions">
                        ${!isCompleted ? `<button class="btn btn-whatsapp" data-action="whatsappEMIReminder" data-id="${emi.id}">📱 Remind</button>` : ''}
                        ${!isCompleted ? `<button class="btn btn-primary" style="width:auto;padding:8px 16px;" data-action="recordPayment" data-id="${emi.id}">Record Payment</button>` : ''}
                        <button class="btn btn-delete" data-action="deleteEMI" data-id="${emi.id}">Delete</button>
                    </div>
                    <div id="paymentForm-${emi.id}" class="emi-payment-form" style="display:none;">
                        <div class="form-group">
                            <label>Payment Amount (₹)</label>
                            <input type="number" id="paymentAmount-${emi.id}" step="0.01" min="0" placeholder="0.00" required>
                        </div>
                        <div class="form-group">
                            <label>Notes (Optional)</label>
                            <input type="text" id="paymentNotes-${emi.id}" placeholder="Payment notes...">
                        </div>
                        <div style="display:flex;gap:10px;">
                            <button class="btn btn-primary" style="width:auto;padding:8px 16px;" data-action="submitPayment" data-id="${emi.id}">Submit</button>
                            <button class="btn btn-secondary" style="width:auto;padding:8px 16px;margin-top:0;" data-action="cancelPayment" data-id="${emi.id}">Cancel</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ---- Dashboard Helpers ----
    getActiveCustomerCount() {
        return this.customers.filter(c => c.active !== false).length;
    }

    getPendingEMICount() {
        return this.emiPlans.filter(e => e.status === 'active').length;
    }

    getTotalPendingEMIAmount() {
        return this.emiPlans
            .filter(e => e.status === 'active')
            .reduce((sum, e) => {
                const paid = e.payments.reduce((s, p) => s + p.amount, 0);
                return sum + Math.max(0, e.totalAmount - paid);
            }, 0);
    }

    getOverdueEMICount() {
        const today = new Date().toISOString().split('T')[0];
        return this.emiPlans.filter(e => {
            if (e.status !== 'active' || e.type !== 'fixed') return false;
            const paidCount = e.payments.length;
            const startDate = new Date(e.startDate);
            const nextDue = new Date(startDate);
            nextDue.setMonth(nextDue.getMonth() + paidCount);
            return nextDue.toISOString().split('T')[0] < today;
        }).length;
    }

    // ---- WhatsApp Reminder Methods ----
    openWhatsApp(phone, message) {
        const encoded = encodeURIComponent(message);
        const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
        const url = cleanPhone
            ? `https://wa.me/${cleanPhone}?text=${encoded}`
            : `https://wa.me/?text=${encoded}`;
        window.open(url, '_blank');
    }

    sendCustomerMessage(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) return;

        const planLabels = { 'weight-gain': 'Weight Gain', 'weight-loss': 'Weight Loss', 'general': 'General' };
        const planName = planLabels[customer.plan] || customer.plan || 'wellness';
        const message = `Hi ${customer.name}, this is a reminder from Nutrition Center.\nWe missed you! Stay consistent with your ${planName} plan.\nSee you soon!`;
        this.openWhatsApp(customer.phone, message);
    }

    sendEMIReminder(emiId) {
        const emi = this.emiPlans.find(e => e.id === emiId);
        if (!emi) return;

        const customer = this.customers.find(c => c.id === emi.customerId);
        const phone = customer ? customer.phone : '';
        const name = emi.customerName || (customer ? customer.name : 'Customer');

        const totalPaid = emi.payments.reduce((sum, p) => sum + p.amount, 0);
        const remaining = Math.max(0, emi.totalAmount - totalPaid);

        let nextDueDate = '';
        if (emi.type === 'fixed' && emi.installmentCount > 0) {
            const paidCount = emi.payments.length;
            const startDate = new Date(emi.startDate);
            const nextDue = new Date(startDate);
            nextDue.setMonth(nextDue.getMonth() + paidCount);
            nextDueDate = nextDue.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }

        let message = `Hi ${name}, this is a reminder from Nutrition Center.\nYour EMI for "${emi.description || 'plan'}" has ₹${remaining.toFixed(2)} remaining.`;
        if (nextDueDate) message += `\nNext due: ${nextDueDate}`;
        message += `\nTotal: ₹${emi.totalAmount.toFixed(2)} | Paid: ₹${totalPaid.toFixed(2)}`;
        message += `\nThank you!`;

        this.openWhatsApp(phone, message);
    }

    sendAttendanceReminder(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) return;

        const lastDate = this.attendance
            .filter(a => a.customerId === customerId)
            .map(a => a.date)
            .sort()
            .reverse()[0];
        const daysAgo = lastDate ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000) : 'several';

        const planLabels = { 'weight-gain': 'Weight Gain', 'weight-loss': 'Weight Loss', 'general': 'General' };
        const planName = planLabels[customer.plan] || customer.plan || 'wellness';

        const message = `Hi ${customer.name}, we noticed you haven't visited in ${daysAgo} days.\nConsistency is key for your ${planName} plan!\nCome back soon — we're here to help!`;
        this.openWhatsApp(customer.phone, message);
    }

    // ---- Daily Check-in & Pack Status ----
    getPackStatus(customer) {
        // If they have no duration, we can't calculate "left"
        if (!customer.packDuration) return null;

        // Fallback: If packStart is missing, use joinDate. If that's missing too, use earliest attendance or 2000-01-01
        const packStartStr = customer.packStart || customer.joinDate || '2000-01-01';
        
        // Count how many times they've attended since the pack started
        const attendedSinceStart = this.attendance.filter(a => 
            a.customerId === customer.id && a.date >= packStartStr
        ).length;

        const packSize = parseInt(customer.packDuration) || 30;
        const remaining = Math.max(0, packSize - attendedSinceStart);

        return {
            daysLeft: remaining,
            isExpired: remaining <= 0,
            total: packSize,
            used: attendedSinceStart
        };
    }

    renderDailyCheckin() {
        const notPresentList = document.getElementById('notPresentTodayList');
        const presentTodayList = document.getElementById('presentTodayList');
        if (!notPresentList || !presentTodayList) return;

        try {
            const today = new Date().toISOString().split('T')[0];
            const activeCustomers = this.customers.filter(c => c.active !== false);

            const present = activeCustomers.filter(c => this.attendance.some(a => a.customerId === c.id && a.date === today));
            const notPresent = activeCustomers.filter(c => !this.attendance.some(a => a.customerId === c.id && a.date === today));

            const renderItem = (c, isPresent) => {
                const status = this.getPackStatus(c);
                let statusHtml = '';
                if (status) {
                    const color = status.isExpired ? 'var(--danger-color)' : (status.daysLeft <= 3 ? 'var(--warning-color)' : 'var(--secondary-color)');
                    statusHtml = `<span style="font-size:0.8rem; color:${color}; font-weight:600;">
                        (${status.isExpired ? 'Expired' : status.daysLeft + ' days left'})
                    </span>`;
                }

                return `
                    <div class="inactive-customer-item" style="cursor:pointer; ${isPresent ? 'background:rgba(80, 200, 120, 0.1);' : ''}" onclick="customerManager.toggleDailyAttendance('${c.id}')">
                        <div style="flex:1;">
                            <span style="font-weight:600;">${escapeHtml(c.name)}</span> ${statusHtml}
                            <div style="font-size:0.75rem; color:var(--text-secondary);">${c.phone || 'No phone'}</div>
                        </div>
                        <div style="font-size:1.2rem;">${isPresent ? '✅' : '⭕'}</div>
                    </div>
                `;
            };

            notPresentList.innerHTML = notPresent.length > 0 ? notPresent.map(c => renderItem(c, false)).join('') : '<div style="padding:10px; color:var(--text-secondary);">Everyone is checked in! 🎉</div>';
            presentTodayList.innerHTML = present.length > 0 ? present.map(c => renderItem(c, true)).join('') : '<div style="padding:10px; color:var(--text-secondary);">No one has checked in yet.</div>';
        } catch (error) {
            console.error("Daily check-in render error:", error);
            notPresentList.innerHTML = `<div class="empty-state">Error loading check-in: ${error.message}</div>`;
        }
    }

    toggleDailyAttendance(customerId) {
        const today = new Date().toISOString().split('T')[0];
        const existing = this.attendance.findIndex(a => a.customerId === customerId && a.date === today);

        if (existing !== -1) {
            this.attendance.splice(existing, 1);
        } else {
            this.attendance.push({ id: generateId(), customerId, date: today });
        }

        this.saveAttendance();
        this.renderDailyCheckin();
        this.renderAttendance(); // Update the grid too
    }

    shareDailyAttendance() {
        const today = new Date().toISOString().split('T')[0];
        const activeCustomers = this.customers.filter(c => c.active !== false);
        const present = activeCustomers.filter(c => this.attendance.some(a => a.customerId === c.id && a.date === today));

        let message = `*Attendance Report - ${new Date().toLocaleDateString('en-GB')}*\n\n`;
        message += `✅ *Present Today (${present.length}):*\n`;
        if (present.length > 0) {
            present.forEach((c, i) => {
                message += `${i+1}. ${c.name}\n`;
            });
        } else {
            message += `_No one checked in yet._\n`;
        }

        message += `\n*Not Present Yet (${activeCustomers.length - present.length}):*\n`;
        const notPresent = activeCustomers.filter(c => !this.attendance.some(a => a.customerId === c.id && a.date === today));
        notPresent.slice(0, 15).forEach((c, i) => {
            message += `${i+1}. ${c.name}\n`;
        });
        if (notPresent.length > 15) message += `_...and ${notPresent.length - 15} more_\n`;

        message += `\nTotal Strength: ${activeCustomers.length}`;

        this.openWhatsApp('', message);
    }

    downloadDailyAttendance() {
        const todayStr = new Date().toLocaleDateString('en-GB');
        const todayFileStr = new Date().toISOString().split('T')[0];
        const activeCustomers = this.customers.filter(c => c.active !== false);
        const present = activeCustomers.filter(c => this.attendance.some(a => a.customerId === c.id && a.date === (new Date().toISOString().split('T')[0])));

        let content = `ATTENDANCE REPORT - ${todayStr}\n`;
        content += `--------------------------------\n`;
        content += `Total Present Today: ${present.length}\n`;
        content += `Total Active Strength: ${activeCustomers.length}\n`;
        content += `--------------------------------\n\n`;
        content += `LIST OF PRESENT CUSTOMERS:\n`;
        
        if (present.length > 0) {
            present.forEach((c, i) => {
                content += `${i+1}. ${c.name} (${c.phone || 'No Phone'})\n`;
            });
        } else {
            content += `No one checked in yet today.\n`;
        }

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `attendance_${todayFileStr}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    runMigration() {
        const jsonText = document.getElementById('migrationJson')?.value.trim();
        if (!jsonText) {
            alert('Please paste the JSON content first!');
            return;
        }

        try {
            const oldData = JSON.parse(jsonText);
            if (!Array.isArray(oldData)) throw new Error('Invalid format: Top-level must be an array.');

            let customersAdded = 0;
            let recordsAdded = 0;

            oldData.forEach(item => {
                // Find or Create Customer
                let customer = this.customers.find(c => 
                    c.name === item.Name && (c.phone === (item.Phone || '') || !c.phone)
                );

                if (!customer) {
                    customer = {
                        id: generateId(),
                        name: item.Name,
                        phone: item.Phone || '',
                        age: item.Age || '',
                        height: item.Height || '',
                        plan: 'general',
                        joinDate: item.History && item.History.length > 0 ? item.History[0].Date : new Date().toISOString().split('T')[0],
                        active: true
                    };
                    this.customers.push(customer);
                    customersAdded++;
                }

                // Import History
                if (item.History && Array.isArray(item.History)) {
                    if (!this.composition[customer.id]) this.composition[customer.id] = [];
                    
                    item.History.forEach(h => {
                        // Check if record already exists for this date
                        const exists = this.composition[customer.id].some(r => r.date === h.Date);
                        if (!exists) {
                            this.composition[customer.id].push({
                                id: generateId(),
                                date: h.Date,
                                weight: h.Weight || 0,
                                fat: h["Fat%"] || 0,
                                visceral: h["Visceral fat"] || 0,
                                bmr: h.BMR || 0,
                                bmi: h.BMI || 0,
                                bodyAge: h["Body age"] || 0,
                                subcut: h["Subcutaneous fat"] || 0,
                                muscle: h.Muscle || 0
                            });
                            recordsAdded++;
                        }
                    });
                    
                    // Keep sorted by date
                    this.composition[customer.id].sort((a, b) => new Date(a.date) - new Date(b.date));
                }
            });

            this.saveCustomers();
            this.saveComposition();
            this.renderCustomers();
            this.populateEMICustomerDropdown();
            
            document.getElementById('migrationJson').value = '';
            alert(`✅ Migration Complete!\n- ${customersAdded} new customers added\n- ${recordsAdded} composition records imported.`);
            
        } catch (e) {
            console.error('Migration failed:', e);
            alert('Migration failed: ' + e.message + '\nMake sure you pasted the entire customer_export.json correctly.');
        }
    }
}
