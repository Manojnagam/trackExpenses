// Firebase Cloud Sync - Cross-Device Data Sync (Stable v3.4)
const APP_VERSION = "3.4";
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
        if (window.tracker) {
            const rawE = localStorage.getItem('nutritionExpenses');
            if (rawE) tracker.expenses = JSON.parse(rawE);
            const rawR = localStorage.getItem('nutritionRecurring');
            if (rawR) tracker.recurringExpenses = JSON.parse(rawR);
            tracker.renderExpenses(); 
            tracker.updateStats(); 
            tracker.updateCharts();
            tracker.renderRecurringExpenses();
        }
        if (window.customerManager) {
            const rawC = localStorage.getItem('nutritionCustomers');
            if (rawC) customerManager.customers = JSON.parse(rawC);
            const rawA = localStorage.getItem('nutritionAttendance');
            if (rawA) customerManager.attendance = JSON.parse(rawA);
            const rawEMI = localStorage.getItem('nutritionEMI');
            if (rawEMI) customerManager.emiPlans = JSON.parse(rawEMI);
            const rawComp = localStorage.getItem('nutritionComposition');
            if (rawComp) customerManager.compositions = JSON.parse(rawComp);
            
            customerManager.renderCustomers();
            customerManager.renderDailyCheckin();
            customerManager.renderAttendance();
            customerManager.renderAllCompositions();
            customerManager.renderEMIList();
        }
        if (window.inventoryManager) {
            const rawStock = localStorage.getItem('inventoryStock');
            if (rawStock) inventoryManager.stockData = JSON.parse(rawStock);
            const rawIn = localStorage.getItem('inventoryStockIn');
            if (rawIn) inventoryManager.stockInHistory = JSON.parse(rawIn);
            const rawOut = localStorage.getItem('inventoryStockOut');
            if (rawOut) inventoryManager.stockOutHistory = JSON.parse(rawOut);
            const rawUsage = localStorage.getItem('inventoryDailyUsage');
            if (rawUsage) inventoryManager.dailyUsage = JSON.parse(rawUsage);

            inventoryManager.renderCurrentStock();
            inventoryManager.renderStockInHistory();
            inventoryManager.renderStockOutHistory();
            inventoryManager.renderDailyUsage();
            inventoryManager.updateOrderList();
            inventoryManager.checkAlerts();
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
        if (el) {
            el.querySelector('.dot').className = 'dot ' + s;
            this.updateStatusUI();
        }
    }

    updateStatusUI() {
        const el = document.getElementById('cloudSyncStatus');
        if (!el) return;
        const textEl = el.querySelector('.status-text');
        const dotEl = el.querySelector('.dot');
        
        if (!this.online) {
            textEl.textContent = 'Offline';
            dotEl.className = 'dot error';
            return;
        }

        if (dotEl.classList.contains('syncing')) {
            textEl.textContent = 'Syncing...';
        } else if (dotEl.classList.contains('error')) {
            textEl.textContent = 'Sync Error';
        } else if (dotEl.classList.contains('synced')) {
            textEl.textContent = 'Cloud Active';
        } else {
            textEl.textContent = 'Ready';
        }
    }

    updateLastSyncUI() {
        const el = document.getElementById('syncLastTime');
        if (el && this.lastSyncTime) el.textContent = 'Last sync: ' + this.lastSyncTime.toLocaleTimeString();
    }
}

document.addEventListener('DOMContentLoaded', () => { setTimeout(() => { window.cloudSync = new CloudSync(); }, 1000); });
