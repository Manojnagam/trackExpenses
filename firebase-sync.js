// Firebase Cloud Sync - Cross-Device Data Sync (Secure v2.7)
const APP_VERSION = "2.7";
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
        this.businessId = localStorage.getItem('nutritionBusinessId') || null;
        this.businessPin = localStorage.getItem('nutritionBusinessPin') || null;
        this.syncing = false;
        this.pendingQueue = new Set();
        this.debounceTimers = {};
        this.originalMethods = {};
        this.lastSyncTime = null;
        this.online = navigator.onLine;

        if (typeof firebase !== 'undefined') {
            try {
                if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
                this.auth = firebase.auth();
                this.db = firebase.firestore();
                this.db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
                this.auth.onAuthStateChanged(user => this.onAuthChanged(user));
            } catch (e) { console.error('CloudSync Init Failed', e); }
        }

        window.addEventListener('online', () => { this.online = true; this.flushPending(); this.updateStatusUI(); });
        window.addEventListener('offline', () => { this.online = false; this.updateStatusUI(); });
        this.injectUI();
    }

    onAuthChanged(user) {
        this.user = user;
        this.updateAuthUI();
        if (user) {
            this.hookSaveMethods();
            setTimeout(() => this.pullFromCloud(), 500);
        } else {
            this.unhookSaveMethods();
        }
    }

    async signIn() {
        const provider = new firebase.auth.GoogleAuthProvider();
        try { await this.auth.signInWithPopup(provider); } catch (e) { await this.auth.signInWithRedirect(provider); }
    }

    async signOut() {
        this.unhookSaveMethods();
        await this.auth.signOut();
    }

    // ---- Security Logic ----

    async setBusinessId(id, pin) {
        if (!id || !pin) { alert('Please enter both ID and PIN'); return; }
        if (pin.length < 4) { alert('PIN must be at least 4 digits'); return; }
        this.setStatus('syncing');
        
        try {
            const bizRef = this.db.collection('shared_business').doc(id);
            const snap = await bizRef.get();

            if (snap.exists) {
                const data = snap.data();
                if (data.pin !== pin) {
                    alert('❌ Incorrect PIN for this Business ID. Access Denied.');
                    this.setStatus('error');
                    return;
                }
            } else {
                if (confirm(`Create new Shared Business: "${id}"?\n\nPIN will be: ${pin}`)) {
                    await bizRef.set({
                        pin: pin,
                        owner: this.user.email,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    this.setStatus('synced');
                    return;
                }
            }

            localStorage.setItem('nutritionBusinessId', id);
            localStorage.setItem('nutritionBusinessPin', pin);
            this.businessId = id;
            this.businessPin = pin;
            
            // Check if we should push current data or pull from cloud
            const customers = localStorage.getItem('nutritionCustomers');
            const hasData = customers && customers !== '[]' && customers !== 'null';

            if (hasData) {
                if (confirm('Data Found on Phone!\n\nDo you want to UPLOAD your local data to the Cloud? \n\n(Click OK if this is the Main Phone. Click CANCEL if you want to DOWNLOAD data from your brother)')) {
                    await this.pushAll();
                    alert('✅ Data Uploaded! Now other devices can see it.');
                } else {
                    await this.pullFromCloud();
                    alert('✅ Cloud Data Downloaded!');
                }
            } else {
                await this.pullFromCloud();
                alert('✅ Cloud Data Downloaded!');
            }
            
            this.updateAuthUI();
        } catch (e) {
            console.error(e);
            alert('❌ PERMISSION ERROR\n\nPlease check your Firebase Console rules. The database is blocking access.');
            this.setStatus('error');
        }
    }

    // ---- Core Sync Logic ----

    hookSaveMethods() {
        if (Object.keys(this.originalMethods).length > 0) return;
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
    }

    unhookSaveMethods() {
        for (const [method, { target, original }] of Object.entries(this.originalMethods)) {
            if (target) target[method] = original;
        }
        this.originalMethods = {};
    }

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
        for (const key of this.pendingQueue) this.pushToCloud(key);
        this.pendingQueue.clear();
    }

    async pushToCloud(localKey) {
        if (!this.user || !this.db) return;
        const docName = SYNC_COLLECTIONS[localKey];
        const raw = localStorage.getItem(localKey);
        if (!raw || !docName) return;

        try {
            this.setStatus('syncing');
            const storagePath = this.businessId ? this.db.collection('shared_business').doc(this.businessId) : this.db.collection('users').doc(this.user.uid);
            await storagePath.collection('data').doc(docName).set({
                data: JSON.parse(raw),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            localStorage.setItem('cloudSync_ts_' + localKey, Date.now().toString());
            this.lastSyncTime = new Date();
            this.setStatus('synced');
            this.updateLastSyncUI();
        } catch (e) { this.setStatus('error'); }
    }

    async pushAll() {
        if (!this.user || !this.db) return;
        for (const localKey of Object.keys(SYNC_COLLECTIONS)) {
            await this.pushToCloud(localKey);
        }
    }

    async pullFromCloud() {
        if (!this.user || !this.db) return;
        this.setStatus('syncing');
        let pulledAny = false;
        try {
            const storagePath = this.businessId ? this.db.collection('shared_business').doc(this.businessId) : this.db.collection('users').doc(this.user.uid);
            for (const [localKey, docName] of Object.entries(SYNC_COLLECTIONS)) {
                const snap = await storagePath.collection('data').doc(docName).get();
                if (!snap.exists) continue;
                const cloud = snap.data();
                const cloudTs = cloud.updatedAt ? cloud.updatedAt.toMillis() : 0;
                const localTs = parseInt(localStorage.getItem('cloudSync_ts_' + localKey) || '0');
                
                // If local is empty, always pull. Otherwise compare timestamps.
                const localData = localStorage.getItem(localKey);
                const isLocalEmpty = !localData || localData === '[]' || localData === '{}';

                if (isLocalEmpty || cloudTs > localTs) {
                    localStorage.setItem(localKey, JSON.stringify(cloud.data));
                    localStorage.setItem('cloudSync_ts_' + localKey, cloudTs.toString());
                    pulledAny = true;
                }
            }
            if (pulledAny) this.reloadAllManagers();
            this.lastSyncTime = new Date();
            this.setStatus('synced');
            this.updateLastSyncUI();
        } catch (e) { this.setStatus('error'); }
    }

    reloadAllManagers() {
        if (window.tracker) {
            const raw = localStorage.getItem('nutritionExpenses');
            if (raw) tracker.expenses = JSON.parse(raw);
            tracker.renderExpenses(); tracker.updateStats(); tracker.updateCharts();
        }
        if (window.customerManager) {
            const rawC = localStorage.getItem('nutritionCustomers');
            if (rawC) customerManager.customers = JSON.parse(rawC);
            customerManager.renderCustomers(); customerManager.renderAllCompositions();
        }
        if (window.inventoryManager) {
            const rawS = localStorage.getItem('inventoryStock');
            if (rawS) inventoryManager.stockData = JSON.parse(rawS);
            inventoryManager.renderCurrentStock();
        }
        if (window.dashboardManager) window.dashboardManager.refreshDashboard();
    }

    // ---- UI Logic ----

    injectUI() {
        const style = document.createElement('style');
        style.textContent = `.cloud-sync-dot { display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem; margin-right: 8px; }
            .cloud-sync-dot .dot { width: 10px; height: 10px; border-radius: 50%; background: #999; }
            .cloud-sync-dot .dot.synced { background: #22c55e; }
            .cloud-sync-dot .dot.syncing { background: #eab308; animation: pulse-dot 1s infinite; }
            .cloud-sync-dot .dot.error { background: #ef4444; }
            .sync-actions button { padding: 10px; border: none; border-radius: 8px; cursor: pointer; width: 100%; text-align: left; margin-bottom: 5px; }`;
        document.head.appendChild(style);
        
        const header = document.querySelector('.header-actions');
        if (header) {
            const el = document.createElement('span'); el.className = 'cloud-sync-dot'; el.id = 'cloudSyncStatus';
            el.innerHTML = '<span class="dot synced"></span><span class="status-text"></span>';
            header.insertBefore(el, header.firstChild);
        }

        const body = document.querySelector('#settingsModal .modal-body');
        if (body) {
            const div = document.createElement('div'); div.className = 'settings-section'; div.id = 'syncAuthArea';
            body.insertBefore(div, body.firstChild);
        }
        this.updateAuthUI();
    }

    updateAuthUI() {
        const area = document.getElementById('syncAuthArea');
        if (!area) return;
        if (this.user) {
            area.innerHTML = `<div style="padding:10px; background:#f5f5f5; border-radius:8px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                <div><strong>${this.user.displayName}</strong><br><small>${this.user.email}</small></div>
                <div style="font-size:0.7rem; color:#999; text-align:right;">v${APP_VERSION}</div>
            </div>
            <div style="margin-bottom:15px; padding:15px; background:rgba(74, 144, 226, 0.1); border-radius:8px; border:1px solid #4a90e2;">
                <label style="display:block; font-size:0.8rem; font-weight:bold; margin-bottom:8px; color:#4a90e2;">Secure Business ID</label>
                <input type="text" id="bizId" value="${this.businessId || ''}" placeholder="Unique ID" style="width:100%; padding:8px; margin-bottom:8px; border:1px solid #ccc; border-radius:4px;">
                <input type="password" id="bizPin" value="${this.businessPin || ''}" placeholder="Safety PIN (4-6 digits)" style="width:100%; padding:8px; margin-bottom:8px; border:1px solid #ccc; border-radius:4px;">
                <button id="btnSetBiz" style="background:#4a90e2; color:white; border:none; padding:10px; width:100%; border-radius:4px; font-weight:bold;">ACTIVATE SYNC</button>
                <small style="display:block; margin-top:8px; color:#666;">${this.businessId ? '✅ Currently Sharing' : '⚠️ Private Mode'}</small>
            </div>
            <div class="sync-actions">
                <button style="background:#4f46e5; color:white;" id="manualSyncBtn">🔄 Sync Now</button>
                <button style="background:#eee;" id="signOutBtn">Sign Out</button>
            </div>
            <div id="syncLastTime" style="font-size:0.7rem; text-align:center; margin-top:5px;"></div>`;
            
            document.getElementById('btnSetBiz').onclick = () => this.setBusinessId(document.getElementById('bizId').value, document.getElementById('bizPin').value);
            document.getElementById('manualSyncBtn').onclick = () => this.pullFromCloud();
            document.getElementById('signOutBtn').onclick = () => this.signOut();
        } else {
            area.innerHTML = `<button style="background:#4285f4; color:white; width:100%; padding:12px; border:none; border-radius:8px;" id="signInBtn">Sign in with Google</button>`;
            document.getElementById('signInBtn').onclick = () => this.signIn();
        }
    }

    setStatus(s) {
        const el = document.getElementById('cloudSyncStatus');
        if (el) el.querySelector('.dot').className = 'dot ' + s;
    }

    updateLastSyncUI() {
        const el = document.getElementById('syncLastTime');
        if (el && this.lastSyncTime) el.textContent = 'Last sync: ' + this.lastSyncTime.toLocaleTimeString();
    }
}

document.addEventListener('DOMContentLoaded', () => { setTimeout(() => { window.cloudSync = new CloudSync(); }, 1000); });
