// ============================================================
// Coach Management & Performance
// ============================================================

class CoachManager {
    constructor() {
        window.coachManager = this;
        this.coaches = this.loadCoaches();
        this.editingCoachId = null;
        this.init();
    }

    init() {
        document.getElementById('coachForm')?.addEventListener('submit', (e) => this.handleCoachSubmit(e));
        document.getElementById('cancelCoachEdit')?.addEventListener('click', () => this.cancelCoachEdit());
        
        // Coach tabs
        document.querySelectorAll('.coach-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.coachTab;
                this.switchCoachTab(tabName);
            });
        });

        document.getElementById('coachPerformanceMonth')?.addEventListener('change', () => this.renderPerformanceReport());
        document.getElementById('exportCoachReport')?.addEventListener('click', () => this.exportPerformanceReport());

        // Event delegation for coach list
        document.getElementById('coachesList')?.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const { action, id } = btn.dataset;
            if (action === 'editCoach') this.editCoach(id);
            else if (action === 'deleteCoach') this.deleteCoach(id);
        });

        this.populateMonthFilter();
        this.renderCoaches();
        this.renderPerformanceReport();
        this.populateAllReferredByDropdowns();
    }

    loadCoaches() {
        const stored = localStorage.getItem('nutritionCoaches');
        if (stored) {
            try { return JSON.parse(stored); } catch (e) { return []; }
        }
        return [];
    }

    saveCoaches() {
        localStorage.setItem('nutritionCoaches', JSON.stringify(this.coaches));
        this.populateAllReferredByDropdowns();
    }

    switchCoachTab(tabName) {
        document.querySelectorAll('.coach-tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.coach-tab-content').forEach(content => content.classList.remove('active'));

        document.querySelector(`[data-coach-tab="${tabName}"]`)?.classList.add('active');
        document.getElementById(`${tabName}CoachTab`)?.classList.add('active');

        if (tabName === 'coachPerformance') {
            this.renderPerformanceReport();
        }
    }

    handleCoachSubmit(e) {
        e.preventDefault();
        const name = document.getElementById('coachName').value.trim();
        const phone = document.getElementById('coachPhone').value.trim();
        const joinDate = document.getElementById('coachJoinDate').value || new Date().toISOString().split('T')[0];
        const status = document.getElementById('coachStatus').value;
        const upline = document.getElementById('coachUpline').value;
        const notes = document.getElementById('coachNotes').value.trim();

        if (!name) return;

        if (this.editingCoachId) {
            const index = this.coaches.findIndex(c => c.id === this.editingCoachId);
            if (index !== -1) {
                this.coaches[index] = { ...this.coaches[index], name, phone, joinDate, status, upline, notes };
            }
            this.cancelCoachEdit();
        } else {
            this.coaches.unshift({
                id: generateId(),
                name,
                phone,
                joinDate,
                status,
                upline,
                notes
            });
        }

        this.saveCoaches();
        this.renderCoaches();
        document.getElementById('coachForm').reset();
        document.getElementById('coachJoinDate').value = '';
    }

    editCoach(id) {
        const coach = this.coaches.find(c => c.id === id);
        if (!coach) return;

        this.editingCoachId = id;
        document.getElementById('coachName').value = coach.name;
        document.getElementById('coachPhone').value = coach.phone || '';
        document.getElementById('coachJoinDate').value = coach.joinDate || '';
        document.getElementById('coachStatus').value = coach.status || 'active';
        document.getElementById('coachUpline').value = coach.upline || '';
        document.getElementById('coachNotes').value = coach.notes || '';

        document.getElementById('coachFormTitle').textContent = 'Edit Coach';
        document.getElementById('coachSubmitBtn').textContent = 'Update Coach';
        document.getElementById('cancelCoachEdit').style.display = 'block';
        document.getElementById('coachForm').scrollIntoView({ behavior: 'smooth' });
    }

    cancelCoachEdit() {
        this.editingCoachId = null;
        document.getElementById('coachForm').reset();
        document.getElementById('coachFormTitle').textContent = 'Add New Coach';
        document.getElementById('coachSubmitBtn').textContent = 'Add Coach';
        document.getElementById('cancelCoachEdit').style.display = 'none';
    }

    deleteCoach(id) {
        if (confirm('Are you sure? This will not remove their name from existing customers.')) {
            this.coaches = this.coaches.filter(c => c.id !== id);
            this.saveCoaches();
            this.renderCoaches();
        }
    }

    renderCoaches() {
        const list = document.getElementById('coachesList');
        if (!list) return;

        if (this.coaches.length === 0) {
            list.innerHTML = '<div class="empty-state">No coaches added yet.</div>';
            return;
        }

        list.innerHTML = this.coaches.map(c => `
            <div class="customer-card">
                <div class="customer-card-header">
                    <div class="customer-name">${escapeHtml(c.name)}</div>
                    <span class="status-badge ${c.status === 'active' ? 'status-active' : 'status-inactive'}">${c.status}</span>
                </div>
                <div class="customer-details">
                    <span>Phone: ${c.phone || '—'}</span>
                    <span>Upline: <strong>${escapeHtml(c.upline || 'Direct (Me)')}</strong></span>
                    <span>Joined: ${new Date(c.joinDate).toLocaleDateString()}</span>
                </div>
                ${c.notes ? `<div class="customer-notes">${escapeHtml(c.notes)}</div>` : ''}
                <div class="customer-actions">
                    <button class="btn btn-edit" data-action="editCoach" data-id="${c.id}">Edit</button>
                    <button class="btn btn-delete" data-action="deleteCoach" data-id="${c.id}">Delete</button>
                </div>
            </div>
        `).join('');
    }

    populateAllReferredByDropdowns() {
        const customerDropdown = document.getElementById('customerReferred');
        const coachUplineDropdown = document.getElementById('coachUpline');
        
        if (!customerDropdown && !coachUplineDropdown) return;

        const activeCoaches = this.coaches.filter(c => c.status === 'active').sort((a,b) => a.name.localeCompare(b.name));
        const inactiveCoaches = this.coaches.filter(c => c.status !== 'active');

        const populate = (dropdown, defaultText) => {
            if (!dropdown) return;
            const currentValue = dropdown.value;
            dropdown.innerHTML = `<option value="">${defaultText}</option>`;
            
            activeCoaches.forEach(coach => {
                // For coach upline, don't let a coach select themselves
                if (dropdown === coachUplineDropdown && this.editingCoachId) {
                    const editingCoach = this.coaches.find(c => c.id === this.editingCoachId);
                    if (editingCoach && coach.name === editingCoach.name) return;
                }
                dropdown.innerHTML += `<option value="${escapeHtml(coach.name)}">${escapeHtml(coach.name)}</option>`;
            });

            inactiveCoaches.forEach(coach => {
                 dropdown.innerHTML += `<option value="${escapeHtml(coach.name)}">${escapeHtml(coach.name)} (Inactive)</option>`;
            });
            dropdown.value = currentValue;
        };

        populate(customerDropdown, '-- Select Coach --');
        populate(coachUplineDropdown, '-- Direct (Me) --');
    }

    populateMonthFilter() {
        const select = document.getElementById('coachPerformanceMonth');
        if (!select) return;

        const months = [];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                value: d.toISOString().slice(0, 7),
                label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            });
        }

        select.innerHTML = months.map(m => `<option value="${m.value}">${m.label}</option>`).join('');
        select.value = now.toISOString().slice(0, 7);
    }

    renderPerformanceReport() {
        const tbody = document.getElementById('coachPerformanceBody');
        const month = document.getElementById('coachPerformanceMonth')?.value;
        if (!tbody || !month) return;

        if (typeof customerManager === 'undefined' || !customerManager.customers) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Customer Manager not loaded or empty.</td></tr>';
            return;
        }

        const stats = this.coaches.map(coach => {
            // New referrals this month
            const newReferrals = customerManager.customers.filter(cust => 
                cust.referredBy === coach.name && 
                cust.joinDate && cust.joinDate.startsWith(month)
            ).length;

            // Total active clients for this coach
            const activeClients = customerManager.customers.filter(cust => 
                cust.referredBy === coach.name && cust.active !== false
            ).length;

            // Revenue estimation (example: based on plans)
            const planPrices = {
                'premium-30': 6969,
                'standard-26': 5600,
                'hot-drink-30': 800,
                'trial-3': 900
            };

            const revenue = customerManager.customers
                .filter(cust => cust.referredBy === coach.name && cust.joinDate && cust.joinDate.startsWith(month))
                .reduce((sum, cust) => sum + (planPrices[cust.plan] || 0), 0);

            return {
                ...coach,
                newReferrals,
                activeClients,
                revenue
            };
        });

        if (stats.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No coaches found.</td></tr>';
            return;
        }

        tbody.innerHTML = stats.map(s => `
            <tr>
                <td><strong>${escapeHtml(s.name)}</strong></td>
                <td style="text-align:center;">${s.newReferrals}</td>
                <td style="text-align:center;">${s.activeClients}</td>
                <td>₹${s.revenue.toFixed(2)}</td>
                <td><span class="status-badge ${s.status === 'active' ? 'status-active' : 'status-inactive'}">${s.status}</span></td>
                <td>
                    <button class="btn btn-whatsapp btn-whatsapp-sm" onclick="coachManager.sendCoachReport('${s.id}', '${month}')">📱 Report</button>
                </td>
            </tr>
        `).join('');

        this.renderInsights(stats);
    }

    renderInsights(stats) {
        const container = document.getElementById('coachInsightsContent');
        if (!container) return;

        const activeStats = stats.filter(s => s.status === 'active');
        if (activeStats.length === 0) {
            container.innerHTML = '<p>No active coaches to analyze.</p>';
            return;
        }

        const topCoach = [...activeStats].sort((a, b) => b.newReferrals - a.newReferrals)[0];
        const inactiveCoaches = activeStats.filter(s => s.newReferrals === 0);
        const highActiveCoaches = activeStats.filter(s => s.activeClients > 5);

        let html = '';
        if (topCoach && topCoach.newReferrals > 0) {
            html += `<p>🌟 <strong>Star Coach:</strong> ${escapeHtml(topCoach.name)} brought in ${topCoach.newReferrals} new people this month!</p>`;
        }

        if (inactiveCoaches.length > 0) {
            html += `<p>⚠️ <strong>Needs Concentration:</strong> ${inactiveCoaches.map(c => escapeHtml(c.name)).join(', ')} have 0 new referrals this month. Consider reaching out to them to motivate.</p>`;
        } else {
            html += `<p>✅ All active coaches are bringing in new referrals!</p>`;
        }

        if (highActiveCoaches.length > 0) {
            html += `<p>💪 <strong>Solid Retention:</strong> ${highActiveCoaches.map(c => escapeHtml(c.name)).join(', ')} have a strong base of active clients.</p>`;
        }

        container.innerHTML = html || '<p>Not enough data for insights yet.</p>';
    }

    sendCoachReport(coachId, month) {
        const coach = this.coaches.find(c => c.id === coachId);
        if (!coach) return;

        const monthLabel = document.getElementById('coachPerformanceMonth')?.selectedOptions[0]?.text;
        
        const newReferrals = customerManager.customers.filter(cust => 
            cust.referredBy === coach.name && 
            cust.joinDate && cust.joinDate.startsWith(month)
        );

        let message = `*Coach Performance Report: ${coach.name}*\n`;
        message += `Period: ${monthLabel}\n\n`;
        message += `New Referrals: ${newReferrals.length}\n`;
        if (newReferrals.length > 0) {
            newReferrals.forEach((c, i) => message += `${i+1}. ${c.name}\n`);
        }
        
        const activeClients = customerManager.customers.filter(cust => 
            cust.referredBy === coach.name && cust.active !== false
        ).length;
        message += `\nTotal Active Clients: ${activeClients}\n`;
        message += `\nKeep up the great work! Let's grow together! 🚀✨`;

        const encoded = encodeURIComponent(message);
        const url = coach.phone ? `https://wa.me/${coach.phone.replace(/[^0-9]/g, '')}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
        window.open(url, '_blank');
    }

    exportPerformanceReport() {
        const month = document.getElementById('coachPerformanceMonth')?.value;
        const monthLabel = document.getElementById('coachPerformanceMonth')?.selectedOptions[0]?.text;
        
        const data = this.coaches.map(coach => {
            const newReferrals = customerManager.customers.filter(cust => 
                cust.referredBy === coach.name && 
                cust.joinDate && cust.joinDate.startsWith(month)
            );
            return {
                'Coach Name': coach.name,
                'New Referrals': newReferrals.length,
                'Active Clients': customerManager.customers.filter(cust => cust.referredBy === coach.name && cust.active !== false).length,
                'Revenue Est.': newReferrals.reduce((sum, cust) => {
                    const prices = {'premium-30': 6969, 'standard-26': 5600, 'hot-drink-30': 800, 'trial-3': 900};
                    return sum + (prices[cust.plan] || 0);
                }, 0),
                'Status': coach.status
            };
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Coach Performance");
        XLSX.writeFile(wb, `Coach_Performance_${month}.xlsx`);
    }
}
