// Firebase Cloud Sync - Cross-Device Data Sync (Stable v3.4)
const APP_VERSION = "4.3";
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
        
        // Auto-pull when window is focused
        window.addEventListener('focus', () => {
            if (this.user) this.pullFromCloud();
        });

        // Ensure data is synced when the page is closed/hidden
        window.addEventListener('pagehide', () => {
            this.flushPending();
        });

        this.injectUI();
        this.setupRealtimeListener();
    }

    setupRealtimeListener() {
        if (!this.db || !this.businessId) return;
        
        // Listen for changes in the shared business data
        const storagePath = this.db.collection('shared_business').doc(this.businessId);
        storagePath.collection('data').onSnapshot(snapshot => {
            if (this.syncing) return; // Don't pull while we are currently pushing
            
            let changed = false;
            snapshot.docChanges().forEach(change => {
                if (change.type === "added" || change.type === "modified") {
                    const docName = change.doc.id;
                    const cloudData = change.doc.data();
                    
                    // Find the corresponding local key
                    const localKey = Object.keys(SYNC_COLLECTIONS).find(k => SYNC_COLLECTIONS[k] === docName);
                    if (!localKey) return;

                    const cloudTs = cloudData.updatedAt ? cloudData.updatedAt.toMillis() : 0;
                    const localTs = parseInt(localStorage.getItem('cloudSync_ts_' + localKey) || '0');

                    if (cloudTs > localTs) {
                        console.log(`[CloudSync] Real-time update detected for ${localKey}`);
                        localStorage.setItem(localKey, JSON.stringify(cloudData.data));
                        localStorage.setItem('cloudSync_ts_' + localKey, cloudTs.toString());
                        changed = true;
                    }
                }
            });

            if (changed) {
                console.log('[CloudSync] Applying real-time changes...');
                this.reloadAllManagers();
                this.lastSyncTime = new Date();
                this.updateLastSyncUI();
            }
        }, err => {
            console.error('[CloudSync] Real-time listener error:', err);
        });
    }

    onAuthChanged(user) {
        this.user = user;
        this.updateAuthUI();
        if (user) {
            this.hookSaveMethods();
            setTimeout(() => {
                this.pullFromCloud();
                this.setupRealtimeListener();
            }, 1000);
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

    // ---- Helper Methods ----

    smartMerge(local, cloud) {
        if (!local || (Array.isArray(local) && local.length === 0)) return cloud;
        if (!cloud || (Array.isArray(cloud) && cloud.length === 0)) return local;

        if (Array.isArray(local) && Array.isArray(cloud)) {
            // Merge arrays by ID or by stringified content
            const combined = [...local, ...cloud];
            const unique = [];
            const seenIds = new Set();
            
            for (const item of combined) {
                const itemId = item.id || JSON.stringify(item);
                if (!seenIds.has(itemId)) {
                    unique.push(item);
                    seenIds.add(itemId);
                }
            }
            return unique;
        } else if (typeof local === 'object' && typeof cloud === 'object') {
            // Merge objects by keys (e.g. stockData)
            return { ...cloud, ...local }; // Local changes win for specific keys
        }
        return cloud;
    }

    // ---- Security Logic ----

    async setBusinessId(id, pin) {
        if (!id || !pin) { alert('Please enter both ID and PIN'); return; }
        if (pin.length < 4) { alert('PIN must be at least 4 digits'); return; }
        this.setStatus('syncing');
        console.log(`[CloudSync] Attempting to set Business ID: ${id}`);
        
        try {
            const bizRef = this.db.collection('shared_business').doc(id);
            const snap = await bizRef.get();

            if (snap.exists) {
                const data = snap.data();
                if (data.pin !== pin) {
                    console.error('[CloudSync] PIN mismatch for Business ID:', id);
                    alert('❌ Incorrect PIN for this Business ID. Access Denied.');
                    this.setStatus('error');
                    return;
                }
                console.log('[CloudSync] Business ID and PIN verified.');
            } else {
                if (confirm(`Create new Shared Business: "${id}"?\n\nPIN will be: ${pin}`)) {
                    await bizRef.set({
                        pin: pin,
                        owner: this.user.email,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    console.log('[CloudSync] New Shared Business created:', id);
                } else {
                    this.setStatus('synced');
                    return;
                }
            }

            localStorage.setItem('nutritionBusinessId', id);
            localStorage.setItem('nutritionBusinessPin', pin);
            this.businessId = id;
            this.businessPin = pin;
            
            // Smarter Data Merge: Instead of overwriting, we merge local and cloud data
            this.setStatus('syncing');
            let mergedCount = 0;
            
            const storagePath = this.db.collection('shared_business').doc(id);
            for (const [localKey, docName] of Object.entries(SYNC_COLLECTIONS)) {
                console.log(`[CloudSync] Merging collection: ${docName}`);
                const snap = await storagePath.collection('data').doc(docName).get();
                const localDataRaw = localStorage.getItem(localKey);
                let localData = null;
                try { localData = JSON.parse(localDataRaw); } catch(e) {}

                if (snap.exists) {
                    const cloud = snap.data();
                    const cloudData = cloud.data;
                    
                    if (cloudData) {
                        const merged = this.smartMerge(localData, cloudData);
                        localStorage.setItem(localKey, JSON.stringify(merged));
                        mergedCount++;
                    }
                }
            }
            
            // Push the merged result back to cloud so everyone has it
            await this.pushAll();
            this.reloadAllManagers();
            
            alert(`✅ Sync Activated!\n\nWe merged your local data with the cloud to ensure nothing was lost.`);
            this.updateAuthUI();
        } catch (e) {
            console.error('[CloudSync] setBusinessId Error:', e);
            alert(`❌ PERMISSION ERROR\n\n${e.message}\n\nPlease check your Firebase Console rules.`);
            this.setStatus('error');
        }
    }

    // ---- Core Sync Logic ----

    hookSaveMethods() {
        if (Object.keys(this.originalMethods).length > 0) return;
        console.log('[CloudSync] Hooking save methods...');
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
                console.log(`[CloudSync] Method ${hook.method} called, queuing sync for ${hook.key}`);
                // Track local modification time for conflict detection
                localStorage.setItem('localLastModified_' + hook.key, Date.now().toString());
                this.queueSync(hook.key);
                return result;
            };
        }
    }

    unhookSaveMethods() {
        console.log('[CloudSync] Unhooking save methods...');
        for (const [method, { target, original }] of Object.entries(this.originalMethods)) {
            if (target) target[method] = original;
        }
        this.originalMethods = {};
    }

    queueSync(localKey) {
        if (!this.user || !this.db) {
            console.warn(`[CloudSync] Cannot queue sync for ${localKey}: User or DB not initialized.`);
            return;
        }
        this.pendingQueue.add(localKey);
        if (this.debounceTimers[localKey]) clearTimeout(this.debounceTimers[localKey]);
        this.debounceTimers[localKey] = setTimeout(() => {
            this.pushToCloud(localKey);
            this.pendingQueue.delete(localKey);
        }, 2000);
    }

    flushPending() {
        if (!this.user || !this.db) return;
        if (this.pendingQueue.size > 0) console.log(`[CloudSync] Flushing ${this.pendingQueue.size} pending items...`);
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
            console.log(`[CloudSync] Pushing ${localKey} to path: ${storagePath.path}/data/${docName}`);
            
            const dataToPush = JSON.parse(raw);
            await storagePath.collection('data').doc(docName).set({
                data: dataToPush,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Set sync timestamp. Note: local is slightly ahead of server time usually,
            // but next pull will use server's true timestamp.
            localStorage.setItem('cloudSync_ts_' + localKey, Date.now().toString());
            this.lastSyncTime = new Date();
            this.setStatus('synced');
            this.updateLastSyncUI();
            console.log(`[CloudSync] Successfully pushed ${localKey}`);
        } catch (e) { 
            console.error(`[CloudSync] pushToCloud Error for ${localKey}:`, e);
            this.setStatus('error'); 
        }
    }

    async pushAll() {
        if (!this.user || !this.db) return;
        console.log('[CloudSync] Pushing all data to cloud...');
        for (const localKey of Object.keys(SYNC_COLLECTIONS)) {
            await this.pushToCloud(localKey);
        }
    }

    async pullFromCloud() {
        if (!this.user || !this.db) {
            console.warn('[CloudSync] Cannot pull: User or DB not initialized.');
            return;
        }
        this.setStatus('syncing');
        console.log('[CloudSync] Pulling data from cloud...');
        let pulledAny = false;
        try {
            const storagePath = this.businessId ? this.db.collection('shared_business').doc(this.businessId) : this.db.collection('users').doc(this.user.uid);
            for (const [localKey, docName] of Object.entries(SYNC_COLLECTIONS)) {
                const snap = await storagePath.collection('data').doc(docName).get();
                if (!snap.exists) {
                    console.log(`[CloudSync] No cloud data found for ${docName}`);
                    continue;
                }
                
                const cloud = snap.data();
                const cloudTs = cloud.updatedAt ? cloud.updatedAt.toMillis() : 0;
                const localTs = parseInt(localStorage.getItem('cloudSync_ts_' + localKey) || '0');
                const localModifiedTs = parseInt(localStorage.getItem('localLastModified_' + localKey) || '0');
                
                // If local is empty, always pull. Otherwise compare timestamps.
                const localDataRaw = localStorage.getItem(localKey);
                const isLocalEmpty = !localDataRaw || localDataRaw === '[]' || localDataRaw === '{}';

                if (isLocalEmpty || cloudTs > localTs) {
                    let localData = null;
                    try { localData = JSON.parse(localDataRaw); } catch(e) {}
                    
                    // Conflict Detection: If local was modified AFTER the last sync, merge it.
                    if (localModifiedTs > localTs && localData) {
                        console.log(`[CloudSync] Conflict detected for ${localKey}. Merging local changes with cloud data.`);
                        const merged = this.smartMerge(localData, cloud.data);
                        localStorage.setItem(localKey, JSON.stringify(merged));
                    } else {
                        console.log(`[CloudSync] Updating ${localKey} (Cloud TS: ${cloudTs}, Local TS: ${localTs})`);
                        localStorage.setItem(localKey, JSON.stringify(cloud.data));
                    }
                    
                    localStorage.setItem('cloudSync_ts_' + localKey, cloudTs.toString());
                    pulledAny = true;
                } else {
                    console.log(`[CloudSync] ${localKey} is already up to date.`);
                }
            }
            if (pulledAny) {
                console.log('[CloudSync] New data pulled, reloading managers...');
                this.reloadAllManagers();
            }
            this.lastSyncTime = new Date();
            this.setStatus('synced');
            this.updateLastSyncUI();
        } catch (e) { 
            console.error('[CloudSync] pullFromCloud Error:', e);
            this.setStatus('error'); 
        }
    }

    reloadAllManagers() {
        console.log('[CloudSync] Reloading all managers with fresh data...');
        
        if (window.tracker) {
            try {
                const rawE = localStorage.getItem('nutritionExpenses');
                if (rawE) window.tracker.expenses = JSON.parse(rawE);
                const rawR = localStorage.getItem('nutritionRecurring');
                if (rawR) window.tracker.recurringExpenses = JSON.parse(rawR);
                
                window.tracker.renderExpenses(); 
                window.tracker.updateStats(); 
                window.tracker.updateCharts();
                window.tracker.renderRecurringExpenses();
            } catch (e) { console.error('[CloudSync] Error reloading Finance:', e); }
        }
        
        if (window.customerManager) {
            try {
                const rawC = localStorage.getItem('nutritionCustomers');
                if (rawC) window.customerManager.customers = JSON.parse(rawC);
                const rawA = localStorage.getItem('nutritionAttendance');
                if (rawA) window.customerManager.attendance = JSON.parse(rawA);
                const rawEMI = localStorage.getItem('nutritionEMI');
                if (rawEMI) window.customerManager.emiPlans = JSON.parse(rawEMI);
                const rawComp = localStorage.getItem('nutritionComposition');
                if (rawComp) window.customerManager.composition = JSON.parse(rawComp); // Fixed: composition
                
                window.customerManager.renderCustomers();
                window.customerManager.renderDailyCheckin();
                window.customerManager.renderAttendance();
                window.customerManager.renderAllCompositions();
                if (typeof window.customerManager.renderEMIList === 'function') window.customerManager.renderEMIList();
            } catch (e) { console.error('[CloudSync] Error reloading Customers:', e); }
        }
        
        if (window.inventoryManager) {
            try {
                const rawStock = localStorage.getItem('inventoryStock');
                if (rawStock) window.inventoryManager.stockData = JSON.parse(rawStock);
                const rawIn = localStorage.getItem('inventoryStockIn');
                if (rawIn) window.inventoryManager.stockInHistory = JSON.parse(rawIn);
                const rawOut = localStorage.getItem('inventoryStockOut');
                if (rawOut) window.inventoryManager.stockOutHistory = JSON.parse(rawOut);
                const rawUsage = localStorage.getItem('inventoryDailyUsage');
                if (rawUsage) window.inventoryManager.dailyUsage = JSON.parse(rawUsage);

                if (typeof window.inventoryManager.renderStockList === 'function') window.inventoryManager.renderStockList();
                if (typeof window.inventoryManager.renderStockInHistory === 'function') window.inventoryManager.renderStockInHistory();
                if (typeof window.inventoryManager.renderStockOutHistory === 'function') window.inventoryManager.renderStockOutHistory();
                if (typeof window.inventoryManager.renderDailyUsageList === 'function') window.inventoryManager.renderDailyUsageList();
                if (typeof window.inventoryManager.checkAlerts === 'function') window.inventoryManager.checkAlerts();
            } catch (e) { console.error('[CloudSync] Error reloading Inventory:', e); }
        }
        
        if (window.dashboardManager && typeof window.dashboardManager.refreshDashboard === 'function') {
            window.dashboardManager.refreshDashboard();
        }
    }

    // ---- UI Logic ----

    injectUI() {
        const style = document.createElement('style');
        style.textContent = `.cloud-sync-dot { display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem; margin-right: 8px; cursor: pointer; }
            .cloud-sync-dot .dot { width: 10px; height: 10px; border-radius: 50%; background: #999; }
            .cloud-sync-dot .dot.synced { background: #22c55e; box-shadow: 0 0 5px #22c55e; }
            .cloud-sync-dot .dot.syncing { background: #eab308; animation: pulse-dot 1s infinite; }
            .cloud-sync-dot .dot.error { background: #ef4444; box-shadow: 0 0 5px #ef4444; }
            .cloud-sync-dot .dot.idle { background: #94a3b8; }
            @keyframes pulse-dot { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
            .sync-actions button { padding: 10px; border: none; border-radius: 8px; cursor: pointer; width: 100%; text-align: left; margin-bottom: 5px; }`;
        document.head.appendChild(style);
        
        const header = document.querySelector('.header-actions');
        if (header) {
            const el = document.createElement('span'); el.className = 'cloud-sync-dot'; el.id = 'cloudSyncStatus';
            el.innerHTML = '<span class="dot idle"></span><span class="status-text">Initializing...</span>';
            el.onclick = () => {
                if (window.tracker) window.tracker.openSettings();
                setTimeout(() => {
                    const authArea = document.getElementById('syncAuthArea');
                    if (authArea) authArea.scrollIntoView({ behavior: 'smooth' });
                }, 300);
            };
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
                <div><strong>${this.user.displayName || 'User'}</strong><br><small>${this.user.email}</small></div>
                <div style="font-size:0.7rem; color:#999; text-align:right;">v${APP_VERSION}</div>
            </div>
            <div style="margin-bottom:15px; padding:15px; background:rgba(74, 144, 226, 0.1); border-radius:8px; border:1px solid #4a90e2;">
                <label style="display:block; font-size:0.8rem; font-weight:bold; margin-bottom:8px; color:#4a90e2;">Secure Business ID</label>
                <input type="text" id="bizId" value="${this.businessId || ''}" placeholder="Unique ID (e.g. MyShop123)" style="width:100%; padding:8px; margin-bottom:8px; border:1px solid #ccc; border-radius:4px;">
                <input type="password" id="bizPin" value="${this.businessPin || ''}" placeholder="Safety PIN (4-6 digits)" style="width:100%; padding:8px; margin-bottom:8px; border:1px solid #ccc; border-radius:4px;">
                <button id="btnSetBiz" style="background:#4a90e2; color:white; border:none; padding:12px; width:100%; border-radius:4px; font-weight:bold; cursor:pointer;">ACTIVATE SYNC</button>
                <small style="display:block; margin-top:8px; color:#666;">${this.businessId ? '✅ Currently Sharing' : '⚠️ Private Mode: Only on this phone'}</small>
            </div>
            <div class="sync-actions">
                <button style="background:#4f46e5; color:white;" id="manualSyncBtn">🔄 Refresh Data from Cloud</button>
                <button style="background:#eee; color:#333;" id="signOutBtn">Logout Google Account</button>
            </div>
            <div id="syncLastTime" style="font-size:0.7rem; text-align:center; margin-top:10px; color:#666;"></div>`;
            
            document.getElementById('btnSetBiz').onclick = () => this.setBusinessId(document.getElementById('bizId').value, document.getElementById('bizPin').value);
            document.getElementById('manualSyncBtn').onclick = () => this.pullFromCloud();
            document.getElementById('signOutBtn').onclick = () => this.signOut();
        } else {
            area.innerHTML = `
                <div style="text-align:center; padding:20px; border:2px dashed #ccc; border-radius:12px;">
                    <p style="margin-bottom:15px; font-weight:bold; color:#555;">Cloud Sync is Inactive</p>
                    <button style="background:white; color:#4285f4; border:1px solid #4285f4; width:100%; padding:12px; border-radius:8px; display:flex; align-items:center; justify-content:center; gap:10px; cursor:pointer; font-weight:bold;" id="signInBtn">
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18"> Sign in with Google
                    </button>
                    <p style="font-size:0.75rem; color:#888; margin-top:15px;">Required to keep your data safe in the cloud.</p>
                </div>`;
            document.getElementById('signInBtn').onclick = () => this.signIn();
        }
        this.updateStatusUI();
    }

    setStatus(s) {
        const el = document.getElementById('cloudSyncStatus');
        if (el) {
            el.querySelector('.dot').className = 'dot ' + s;
            this.updateStatusUI();
        }
    }

    updateStatusUI() {
        const el = document.getElementById('cloudSyncStatus');
        const warning = document.getElementById('cloudSyncWarning');
        const setupBtn = document.getElementById('setupSyncBtn');

        if (!el) return;
        const textEl = el.querySelector('.status-text');
        const dotEl = el.querySelector('.dot');
        
        // Handle Warning Bar: Only hide if BOTH logged in AND have a Business ID
        const isFullySynced = this.user && this.businessId && this.businessPin && !dotEl.classList.contains('error');
        if (isFullySynced) {
            if (warning) warning.style.display = 'none';
        } else {
            // Show warning if user has data but NO active cloud sync
            const hasData = (localStorage.getItem('nutritionExpenses') || '[]').length > 10;
            if (warning && hasData) {
                warning.style.display = 'block';
                if (setupBtn) {
                    setupBtn.onclick = () => {
                        if (window.tracker) window.tracker.openSettings();
                        setTimeout(() => {
                            const authArea = document.getElementById('syncAuthArea');
                            if (authArea) authArea.scrollIntoView({ behavior: 'smooth' });
                        }, 300);
                    };
                }
            }
        }

        if (!this.online) {
            textEl.textContent = 'Offline';
            dotEl.className = 'dot error';
            return;
        }

        if (dotEl.classList.contains('syncing')) {
            textEl.textContent = 'Syncing...';
        } else if (dotEl.classList.contains('error')) {
            textEl.textContent = this.user ? 'Permission Error' : 'Auth Required';
        } else if (dotEl.classList.contains('synced')) {
            textEl.textContent = 'Cloud Active';
        } else if (dotEl.classList.contains('idle')) {
            textEl.textContent = this.user ? (this.businessId ? 'Ready' : 'Set ID') : 'Login Needed';
        }
    }

    updateLastSyncUI() {
        const el = document.getElementById('syncLastTime');
        if (el && this.lastSyncTime) el.textContent = 'Last sync: ' + this.lastSyncTime.toLocaleTimeString();
    }
}

document.addEventListener('DOMContentLoaded', () => { setTimeout(() => { window.cloudSync = new CloudSync(); }, 1000); });
