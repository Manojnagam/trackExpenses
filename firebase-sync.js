// Firebase Cloud Sync - Cross-Device Data Sync
// Monkey-patches save methods to auto-sync to Firestore. Zero changes to app.js/inventory.js/customers.js.
// If Firebase is not configured or unavailable, the app works exactly as before.

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDizRy1Oti70AFkJzrDQU8fdugvXWgHACQ",
    authDomain: "trackexpenses-6673a.firebaseapp.com",
    projectId: "trackexpenses-6673a",
    storageBucket: "trackexpenses-6673a.firebasestorage.app",
    messagingSenderId: "1053059297652",
    appId: "1:1053059297652:web:42dc83fcb4371b082bbc21"
};

const SYNC_COLLECTIONS = {
    nutritionExpenses:    'expenses',
    nutritionRecurring:   'recurring',
    nutritionCustomers:   'customers',
    nutritionAttendance:  'attendance',
    nutritionEMI:         'emi',
    nutritionComposition: 'composition',
    inventoryStock:       'stock',
    inventoryStockIn:     'stockIn',
    inventoryStockOut:    'stockOut',
    inventoryDailyUsage:  'dailyUsage'
};

class CloudSync {
    constructor() {
        this.db = null;
        this.auth = null;
        this.user = null;
        this.syncing = false;
        this.pendingQueue = new Set();
        this.debounceTimers = {};
        this.originalMethods = {};
        this.lastSyncTime = null;
        this.online = navigator.onLine;

        if (!FIREBASE_CONFIG.apiKey) {
            console.log('CloudSync: No Firebase config — sync disabled');
            this.injectUI();
            return;
        }

        if (typeof firebase === 'undefined') {
            console.log('CloudSync: Firebase SDK not loaded — sync disabled');
            this.injectUI();
            return;
        }

        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(FIREBASE_CONFIG);
            }
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            this.db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
        } catch (e) {
            console.error('CloudSync: Firebase init failed', e);
            this.injectUI();
            return;
        }

        this.auth.onAuthStateChanged(user => this.onAuthChanged(user));
        window.addEventListener('online', () => { this.online = true; this.flushPending(); this.updateStatusUI(); });
        window.addEventListener('offline', () => { this.online = false; this.updateStatusUI(); });
        this.injectUI();
    }

    // ---- Auth ----

    async signIn() {
        if (!this.auth) return;
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            await this.auth.signInWithPopup(provider);
        } catch (e) {
            if (e.code === 'auth/popup-blocked' || e.code === 'auth/popup-closed-by-user') {
                try { await this.auth.signInWithRedirect(provider); } catch (e2) {
                    console.error('CloudSync: Sign-in failed', e2);
                }
            } else {
                console.error('CloudSync: Sign-in failed', e);
            }
        }
    }

    async signOut() {
        if (!this.auth) return;
        try {
            this.unhookSaveMethods();
            await this.auth.signOut();
        } catch (e) {
            console.error('CloudSync: Sign-out failed', e);
        }
    }

    onAuthChanged(user) {
        console.log('CloudSync: Auth changed, user:', !!user);
        this.user = user;
        this.updateAuthUI();
        if (user) {
            this.hookSaveMethods();
            // Pull with a small delay to ensure all managers are ready
            setTimeout(() => this.pullFromCloud(), 500);
        } else {
            this.unhookSaveMethods();
        }
    }

    // ---- Monkey-Patching Save Methods ----

    hookSaveMethods() {
        if (Object.keys(this.originalMethods).length > 0) return; // already hooked

        const hooks = [
            { obj: () => window.tracker,          method: 'saveExpenses',         key: 'nutritionExpenses' },
            { obj: () => window.tracker,          method: 'saveRecurringExpenses', key: 'nutritionRecurring' },
            { obj: () => window.customerManager,  method: 'saveCustomers',        key: 'nutritionCustomers' },
            { obj: () => window.customerManager,  method: 'saveAttendance',       key: 'nutritionAttendance' },
            { obj: () => window.customerManager,  method: 'saveEMI',             key: 'nutritionEMI' },
            { obj: () => window.customerManager,  method: 'saveComposition',     key: 'nutritionComposition' },
            { obj: () => window.inventoryManager, method: 'saveStockData',        key: 'inventoryStock' },
            { obj: () => window.inventoryManager, method: 'saveStockInHistory',   key: 'inventoryStockIn' },
            { obj: () => window.inventoryManager, method: 'saveStockOutHistory',  key: 'inventoryStockOut' },
            { obj: () => window.inventoryManager, method: 'saveDailyUsage',       key: 'inventoryDailyUsage' },
        ];

        for (const hook of hooks) {
            const target = hook.obj();
            if (!target || typeof target[hook.method] !== 'function') continue;

            const original = target[hook.method].bind(target);
            this.originalMethods[hook.method] = { target, original };

            target[hook.method] = (...args) => {
                const result = original(...args);
                this.queueSync(hook.key);
                return result;
            };
        }
        console.log('CloudSync: Save methods hooked (' + Object.keys(this.originalMethods).length + ')');
    }

    unhookSaveMethods() {
        for (const [method, { target, original }] of Object.entries(this.originalMethods)) {
            if (target) target[method] = original;
        }
        this.originalMethods = {};
    }

    // ---- Sync Queue ----

    queueSync(localKey) {
        if (!this.user || !this.db) return;
        this.pendingQueue.add(localKey);

        if (this.debounceTimers[localKey]) clearTimeout(this.debounceTimers[localKey]);
        this.debounceTimers[localKey] = setTimeout(() => {
            this.pushToCloud(localKey);
            this.pendingQueue.delete(localKey);
        }, 2000);
    }

    flushPending() {
        if (!this.user || !this.db) return;
        for (const key of this.pendingQueue) {
            this.pushToCloud(key);
        }
        this.pendingQueue.clear();
    }

    // ---- Push to Cloud ----

    async pushToCloud(localKey) {
        if (!this.user || !this.db) return;
        const docName = SYNC_COLLECTIONS[localKey];
        if (!docName) return;

        try {
            this.setStatus('syncing');
            const raw = localStorage.getItem(localKey);
            if (!raw) return;
            const data = JSON.parse(raw);

            await this.db.collection('users').doc(this.user.uid)
                .collection('data').doc(docName).set({
                    data: data,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            localStorage.setItem('cloudSync_ts_' + localKey, Date.now().toString());
            this.lastSyncTime = new Date();
            this.setStatus('synced');
            this.updateLastSyncUI();
            console.log('CloudSync: Pushed', docName);
        } catch (e) {
            console.error('CloudSync: Push failed for', docName, e);
            this.setStatus('error');
        }
    }

    async pushAll() {
        if (!this.user || !this.db) return;
        this.setStatus('syncing');
        for (const localKey of Object.keys(SYNC_COLLECTIONS)) {
            await this.pushToCloud(localKey);
        }
        this.setStatus('synced');
    }

    // ---- Pull from Cloud ----

    async pullFromCloud() {
        if (!this.user || !this.db) return;
        this.setStatus('syncing');
        let pulledAny = false;
        let pushedAny = false;

        try {
            for (const [localKey, docName] of Object.entries(SYNC_COLLECTIONS)) {
                const docRef = this.db.collection('users').doc(this.user.uid).collection('data').doc(docName);
                const snap = await docRef.get();

                if (!snap.exists) {
                    // No cloud data — push local if we have it
                    const raw = localStorage.getItem(localKey);
                    if (raw && raw !== '[]' && raw !== '{}' && raw !== 'null') {
                        await this.pushToCloud(localKey);
                        pushedAny = true;
                    }
                    continue;
                }

                const cloudData = snap.data();
                const cloudTs = cloudData.updatedAt ? cloudData.updatedAt.toMillis() : 0;
                const localTs = parseInt(localStorage.getItem('cloudSync_ts_' + localKey) || '0');

                if (cloudTs > localTs) {
                    // Cloud is newer — overwrite local
                    localStorage.setItem(localKey, JSON.stringify(cloudData.data));
                    localStorage.setItem('cloudSync_ts_' + localKey, cloudTs.toString());
                    pulledAny = true;
                    console.log('CloudSync: Pulled', docName, '(cloud newer)');
                } else if (localTs > cloudTs) {
                    // Local is newer — push to cloud
                    await this.pushToCloud(localKey);
                    pushedAny = true;
                }
            }

            if (pulledAny) {
                this.reloadAllManagers();
            }

            this.lastSyncTime = new Date();
            this.setStatus('synced');
            this.updateLastSyncUI();
        } catch (e) {
            console.error('CloudSync: Pull failed', e);
            this.setStatus('error');
        }
    }

    async restoreFromCloud() {
        if (!this.user || !this.db) return;
        if (!confirm('This will overwrite ALL local data with the cloud version. Continue?')) return;

        this.setStatus('syncing');
        try {
            for (const [localKey, docName] of Object.entries(SYNC_COLLECTIONS)) {
                const snap = await this.db.collection('users').doc(this.user.uid).collection('data').doc(docName).get();
                if (snap.exists) {
                    const cloudData = snap.data();
                    localStorage.setItem(localKey, JSON.stringify(cloudData.data));
                    const ts = cloudData.updatedAt ? cloudData.updatedAt.toMillis() : Date.now();
                    localStorage.setItem('cloudSync_ts_' + localKey, ts.toString());
                }
            }
            this.reloadAllManagers();
            this.lastSyncTime = new Date();
            this.setStatus('synced');
            this.updateLastSyncUI();
            alert('Data restored from cloud successfully!');
        } catch (e) {
            console.error('CloudSync: Restore failed', e);
            this.setStatus('error');
            alert('Restore failed. Check your internet connection.');
        }
    }

    // ---- Reload Managers After Pull ----

    reloadAllManagers() {
        try {
            if (window.tracker) {
                tracker.expenses = JSON.parse(localStorage.getItem('nutritionExpenses') || '[]');
                tracker.recurringExpenses = JSON.parse(localStorage.getItem('nutritionRecurring') || '[]');
                tracker.renderExpenses();
                tracker.updateStats();
                tracker.updateCharts();
            }
        } catch (e) { console.error('CloudSync: Reload tracker failed', e); }

        try {
            if (window.customerManager) {
                customerManager.customers = JSON.parse(localStorage.getItem('nutritionCustomers') || '[]');
                customerManager.attendance = JSON.parse(localStorage.getItem('nutritionAttendance') || '[]');
                customerManager.emiPlans = JSON.parse(localStorage.getItem('nutritionEMI') || '[]');
                customerManager.composition = JSON.parse(localStorage.getItem('nutritionComposition') || '{}');
                customerManager.renderCustomers();
                customerManager.renderEMIList();
            }
        } catch (e) { console.error('CloudSync: Reload customerManager failed', e); }

        try {
            if (window.inventoryManager) {
                inventoryManager.stockData = JSON.parse(localStorage.getItem('inventoryStock') || '{}');
                inventoryManager.stockInHistory = JSON.parse(localStorage.getItem('inventoryStockIn') || '[]');
                inventoryManager.stockOutHistory = JSON.parse(localStorage.getItem('inventoryStockOut') || '[]');
                inventoryManager.dailyUsage = JSON.parse(localStorage.getItem('inventoryDailyUsage') || '[]');
                inventoryManager.renderCurrentStock();
                inventoryManager.renderStockInHistory();
                inventoryManager.renderStockOutHistory();
                inventoryManager.renderDailyUsage();
            }
        } catch (e) { console.error('CloudSync: Reload inventoryManager failed', e); }

        try {
            if (window.dashboardManager) {
                dashboardManager.refreshDashboard();
            }
        } catch (e) { console.error('CloudSync: Reload dashboard failed', e); }
    }

    // ---- UI Injection ----

    injectUI() {
        this.injectStyles();
        this.injectHeaderStatus();
        this.injectSettingsSection();
        this.updateAuthUI();
    }

    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .cloud-sync-dot {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                font-size: 0.8rem;
                color: var(--text-secondary, #666);
                margin-right: 8px;
                cursor: default;
            }
            .cloud-sync-dot .dot {
                width: 10px; height: 10px;
                border-radius: 50%;
                background: #999;
                display: inline-block;
                transition: background 0.3s;
            }
            .cloud-sync-dot .dot.synced { background: #22c55e; }
            .cloud-sync-dot .dot.syncing { background: #eab308; animation: pulse-dot 1s infinite; }
            .cloud-sync-dot .dot.error { background: #ef4444; }
            .cloud-sync-dot .dot.offline { background: #999; }
            @keyframes pulse-dot { 0%,100% { opacity:1; } 50% { opacity:0.4; } }

            .cloud-sync-settings {
                padding: 15px 0;
            }
            .cloud-sync-settings h3 {
                margin-bottom: 12px;
            }
            .cloud-sync-settings .sync-user-info {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 12px;
                padding: 10px;
                background: var(--bg-secondary, #f5f5f5);
                border-radius: 8px;
            }
            .cloud-sync-settings .sync-user-info img {
                width: 32px; height: 32px;
                border-radius: 50%;
            }
            .cloud-sync-settings .sync-user-info .user-details {
                flex: 1;
            }
            .cloud-sync-settings .sync-user-info .user-name {
                font-weight: 600;
                font-size: 0.95rem;
            }
            .cloud-sync-settings .sync-user-info .user-email {
                font-size: 0.8rem;
                color: var(--text-secondary, #666);
            }
            .cloud-sync-settings .sync-actions {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .cloud-sync-settings .sync-actions button {
                padding: 10px 16px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 0.9rem;
                width: 100%;
                text-align: left;
                transition: opacity 0.2s;
            }
            .cloud-sync-settings .sync-actions button:hover { opacity: 0.85; }
            .btn-sync-google {
                background: #4285f4; color: white; font-weight: 600;
            }
            .btn-sync-now {
                background: var(--primary, #4f46e5); color: white;
            }
            .btn-sync-restore {
                background: #f59e0b; color: white;
            }
            .btn-sync-signout {
                background: var(--bg-secondary, #eee); color: var(--text-primary, #333);
            }
            .sync-last-time {
                font-size: 0.8rem;
                color: var(--text-secondary, #666);
                margin-top: 8px;
                text-align: center;
            }
            .sync-not-configured {
                font-size: 0.85rem;
                color: var(--text-secondary, #999);
                text-align: center;
                padding: 15px 0;
            }
        `;
        document.head.appendChild(style);
    }

    injectHeaderStatus() {
        const headerActions = document.querySelector('.header-actions');
        if (!headerActions) return;

        const statusEl = document.createElement('span');
        statusEl.className = 'cloud-sync-dot';
        statusEl.id = 'cloudSyncStatus';
        statusEl.innerHTML = '<span class="dot offline"></span><span class="status-text"></span>';
        statusEl.style.display = 'none';
        headerActions.insertBefore(statusEl, headerActions.firstChild);
    }

    injectSettingsSection() {
        const modalBody = document.querySelector('#settingsModal .modal-body');
        if (!modalBody) return;

        const section = document.createElement('div');
        section.className = 'settings-section cloud-sync-settings';
        section.id = 'cloudSyncSection';

        if (!FIREBASE_CONFIG.apiKey) {
            section.innerHTML = `
                <h3>Cloud Sync</h3>
                <div class="sync-not-configured">
                    Cloud sync is not configured. Add your Firebase config to <code>firebase-sync.js</code> to enable cross-device sync.
                </div>
            `;
        } else {
            section.innerHTML = `
                <h3>Cloud Sync</h3>
                <div id="syncAuthArea"></div>
            `;
        }

        // Insert before the first settings-section (Data Management)
        modalBody.insertBefore(section, modalBody.firstChild);
    }

    updateAuthUI() {
        const statusEl = document.getElementById('cloudSyncStatus');
        const authArea = document.getElementById('syncAuthArea');

        if (this.user) {
            // Show header status
            if (statusEl) statusEl.style.display = 'inline-flex';

            // Show signed-in UI in settings
            if (authArea) {
                authArea.innerHTML = `
                    <div class="sync-user-info">
                        <img src="${this.user.photoURL || ''}" alt="" onerror="this.style.display='none'">
                        <div class="user-details">
                            <div class="user-name">${this.user.displayName || 'User'}</div>
                            <div class="user-email">${this.user.email || ''}</div>
                        </div>
                    </div>
                    <div class="sync-actions">
                        <button class="btn-sync-now" id="btnSyncNow">🔄 Sync Now</button>
                        <button class="btn-sync-restore" id="btnRestoreCloud">☁️ Restore from Cloud</button>
                        <button class="btn-sync-signout" id="btnSyncSignOut">Sign Out</button>
                    </div>
                    <div class="sync-last-time" id="syncLastTime"></div>
                `;
                document.getElementById('btnSyncNow').addEventListener('click', () => this.syncNow());
                document.getElementById('btnRestoreCloud').addEventListener('click', () => this.restoreFromCloud());
                document.getElementById('btnSyncSignOut').addEventListener('click', () => this.signOut());
            }
            this.updateLastSyncUI();
            this.updateStatusUI();
        } else {
            // Hide header status
            if (statusEl) statusEl.style.display = 'none';

            // Show sign-in button in settings
            if (authArea) {
                authArea.innerHTML = `
                    <div class="sync-actions">
                        <button class="btn-sync-google" id="btnSyncSignIn">Sign in with Google</button>
                    </div>
                    <div class="sync-last-time">Sign in to sync data across devices</div>
                `;
                document.getElementById('btnSyncSignIn').addEventListener('click', () => this.signIn());
            }
        }
    }

    setStatus(status) {
        this._status = status;
        this.updateStatusUI();
    }

    updateStatusUI() {
        const statusEl = document.getElementById('cloudSyncStatus');
        if (!statusEl || !this.user) return;

        const dot = statusEl.querySelector('.dot');
        const text = statusEl.querySelector('.status-text');
        if (!dot || !text) return;

        dot.className = 'dot';

        if (!this.online) {
            dot.classList.add('offline');
            text.textContent = 'Offline';
        } else if (this._status === 'syncing') {
            dot.classList.add('syncing');
            text.textContent = 'Syncing...';
        } else if (this._status === 'error') {
            dot.classList.add('error');
            text.textContent = 'Sync error';
        } else {
            dot.classList.add('synced');
            text.textContent = 'Synced';
        }
    }

    updateLastSyncUI() {
        const el = document.getElementById('syncLastTime');
        if (!el || !this.lastSyncTime) return;
        el.textContent = 'Last synced: ' + this.lastSyncTime.toLocaleTimeString();
    }

    async syncNow() {
        if (!this.user || !this.db) {
            console.error('CloudSync: Cannot sync - user or db missing', { user: !!this.user, db: !!this.db });
            alert('Cannot sync: Please sign in first.');
            return;
        }
        try {
            console.log('CloudSync: Starting manual sync...');
            await this.pushAll();
            await this.pullFromCloud();
            alert('Sync complete!');
        } catch (e) {
            console.error('CloudSync: Manual sync failed', e);
            alert('Sync failed: ' + e.message);
        }
    }
}

// ---- Initialize after all managers are ready ----
document.addEventListener('DOMContentLoaded', () => {
    console.log('CloudSync: Waiting for managers to initialize...');
    let attempts = 0;
    const checkManagers = setInterval(() => {
        attempts++;
        const allReady = typeof tracker !== 'undefined' && 
                         typeof inventoryManager !== 'undefined' && 
                         typeof customerManager !== 'undefined';
        
        if (allReady || attempts > 20) {
            clearInterval(checkManagers);
            console.log(`CloudSync: Initialization started after ${attempts*100}ms. Ready: ${allReady}`);
            window.cloudSync = new CloudSync();
        }
    }, 100);
});
