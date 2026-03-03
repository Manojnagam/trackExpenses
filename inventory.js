// ============================================================
// Inventory Management System
// ============================================================
class InventoryManager {
    constructor() {
        // Product Database - All your products organized by category
        this.products = this.initializeProducts();
        this.stockData = this.loadStockData();
        this.stockInHistory = this.loadStockInHistory();
        this.stockOutHistory = this.loadStockOutHistory();
        this.dailyUsage = this.loadDailyUsage();
        this.editingUsageId = null;
        this.editingStockInId = null;
        this.editingStockOutId = null;
        this.init();
    }

    // ---- Product Database ----
    initializeProducts() {
        return {
            "Shake Products": [
                { id: "f1-500-paan", name: "Formula 1 - 500g - Paan", defaultUnit: "grams", lowStockThreshold: 100 },
                { id: "f1-500-vanilla", name: "Formula 1 - 500g - Vanilla", defaultUnit: "grams", lowStockThreshold: 100 },
                { id: "f1-500-mango", name: "Formula 1 - 500g - Mango", defaultUnit: "grams", lowStockThreshold: 100 },
                { id: "f1-500-strawberry", name: "Formula 1 - 500g - Strawberry", defaultUnit: "grams", lowStockThreshold: 100 },
                { id: "f1-500-chocolate", name: "Formula 1 - 500g - Chocolate", defaultUnit: "grams", lowStockThreshold: 100 },
                { id: "f1-500-kulfi", name: "Formula 1 - 500g - Kulfi", defaultUnit: "grams", lowStockThreshold: 100 },
                { id: "f1-500-rose-kheer", name: "Formula 1 - 500g - Rose Kheer", defaultUnit: "grams", lowStockThreshold: 100 },
                { id: "f1-500-banana-caramel", name: "Formula 1 - 500g - Banana Caramel", defaultUnit: "grams", lowStockThreshold: 100 },
                { id: "f1-500-orange", name: "Formula 1 - 500g - Orange", defaultUnit: "grams", lowStockThreshold: 100 },
                { id: "f1-750-kulfi", name: "Formula 1 - 750g - Kulfi", defaultUnit: "grams", lowStockThreshold: 150 },
                { id: "f1-750-mango", name: "Formula 1 - 750g - Mango", defaultUnit: "grams", lowStockThreshold: 150 },
                { id: "f1-750-rose-kheer", name: "Formula 1 - 750g - Rose Kheer", defaultUnit: "grams", lowStockThreshold: 150 },
                { id: "f1-750-vanilla", name: "Formula 1 - 750g - Vanilla", defaultUnit: "grams", lowStockThreshold: 150 },
                { id: "protein-200", name: "Protein - 200g", defaultUnit: "grams", lowStockThreshold: 50 },
                { id: "protein-400", name: "Protein - 400g", defaultUnit: "grams", lowStockThreshold: 100 },
                { id: "shakemate", name: "Shakemate", defaultUnit: "grams", lowStockThreshold: 50 },
                { id: "afresh-50-peach", name: "Afresh - 50g - Peach", defaultUnit: "grams", lowStockThreshold: 20 },
                { id: "afresh-50-cinnamon", name: "Afresh - 50g - Cinnamon", defaultUnit: "grams", lowStockThreshold: 20 },
                { id: "afresh-50-elaichi", name: "Afresh - 50g - Elaichi", defaultUnit: "grams", lowStockThreshold: 20 },
                { id: "afresh-50-ginger", name: "Afresh - 50g - Ginger", defaultUnit: "grams", lowStockThreshold: 20 },
                { id: "afresh-50-lemon", name: "Afresh - 50g - Lemon", defaultUnit: "grams", lowStockThreshold: 20 },
                { id: "afresh-50-tulsi", name: "Afresh - 50g - Tulsi", defaultUnit: "grams", lowStockThreshold: 20 },
                { id: "afresh-50-kashmiri-kahwa", name: "Afresh - 50g - Kashmiri Kahwa", defaultUnit: "grams", lowStockThreshold: 20 }
            ],
            "Children's Health": [
                { id: "dinoshake-strawberry", name: "Dinoshake - Strawberry - 200g", defaultUnit: "grams", lowStockThreshold: 50 },
                { id: "dinoshake-chocolate", name: "Dinoshake - Chocolate - 200g", defaultUnit: "grams", lowStockThreshold: 50 }
            ],
            "Supplements": [
                { id: "softgels-omega3", name: "Softgels - Omega 3", defaultUnit: "tablets", lowStockThreshold: 30 },
                { id: "cell-activator", name: "Cell Activator", defaultUnit: "tablets", lowStockThreshold: 30 },
                { id: "cell-u-loss", name: "Cell-U-Loss", defaultUnit: "tablets", lowStockThreshold: 30 },
                { id: "multivitamin", name: "Multivitamin", defaultUnit: "tablets", lowStockThreshold: 30 },
                { id: "brain-health", name: "Brain Health", defaultUnit: "tablets", lowStockThreshold: 30 },
                { id: "immune-health", name: "Immune Health", defaultUnit: "tablets", lowStockThreshold: 30 },
                { id: "triphala", name: "Triphala", defaultUnit: "tablets", lowStockThreshold: 30 },
                { id: "herbal-control", name: "Herbal Control", defaultUnit: "tablets", lowStockThreshold: 30 },
                { id: "niteworks", name: "Niteworks", defaultUnit: "tablets", lowStockThreshold: 30 },
                { id: "beta-heart-vanilla", name: "Beta Heart Vanilla", defaultUnit: "servings", lowStockThreshold: 10 },
                { id: "aloe-plus", name: "Aloe Plus", defaultUnit: "tablets", lowStockThreshold: 30 },
                { id: "active-fiber-complex", name: "Active Fiber Complex - Unflavoured", defaultUnit: "tablets", lowStockThreshold: 30 },
                { id: "herbal-aloe-concentrate", name: "Herbal Aloe Concentrate (Original)", defaultUnit: "tablets", lowStockThreshold: 30 },
                { id: "activated-fiber-90", name: "Activated Fiber - 90 Tablets", defaultUnit: "tablets", lowStockThreshold: 30 },
                { id: "simply-probiotic", name: "Simply Probiotic", defaultUnit: "tablets", lowStockThreshold: 30 },
                { id: "joint-support", name: "Joint Support", defaultUnit: "tablets", lowStockThreshold: 30 },
                { id: "herbalife-calcium", name: "Herbalife Calcium Tablets", defaultUnit: "tablets", lowStockThreshold: 30 },
                { id: "hn-skin-booster-30", name: "HN-Skin Booster - 30 Servings", defaultUnit: "servings", lowStockThreshold: 10 },
                { id: "hn-skin-booster-canister", name: "HN-Skin Booster Canister Orange - 300g", defaultUnit: "grams", lowStockThreshold: 100 },
                { id: "womans-choice", name: "Woman's Choice", defaultUnit: "tablets", lowStockThreshold: 30 },
                { id: "male-factor", name: "Male Factor+", defaultUnit: "tablets", lowStockThreshold: 30 },
                { id: "ocular-defense", name: "Ocular Defense", defaultUnit: "tablets", lowStockThreshold: 30 },
                { id: "sleep-enhance", name: "Sleep Enhance TM Hibiscus Red - 30g", defaultUnit: "grams", lowStockThreshold: 10 },
                { id: "liftoff-watermelon", name: "LiftOff 5g x 30 - Watermelon", defaultUnit: "packets", lowStockThreshold: 10 },
                { id: "h24-hydrate", name: "Herbalife H24 Hydrate", defaultUnit: "servings", lowStockThreshold: 10 },
                { id: "h24-rebuild", name: "H24 Rebuild Strength", defaultUnit: "servings", lowStockThreshold: 10 },
                { id: "tablet-box-medium", name: "Tablet Box - Medium Size", defaultUnit: "boxes", lowStockThreshold: 5 }
            ],
            "Accessories": [
                { id: "paper-cups-350ml", name: "Paper Cups 350ml - Set of 100", defaultUnit: "sets", lowStockThreshold: 2 },
                { id: "hln-shaker-cup", name: "HLN Improved Shaker Cup", defaultUnit: "boxes", lowStockThreshold: 5 }
            ],
            "Outer Nutrition": [
                { id: "vritilife-facial-toner", name: "Vritilife Facial Toner", defaultUnit: "boxes", lowStockThreshold: 3 },
                { id: "vritilife-facial-serum", name: "Vritilife Facial Serum", defaultUnit: "boxes", lowStockThreshold: 3 },
                { id: "vritilife-moisturizer", name: "Vritilife Moisturizer", defaultUnit: "boxes", lowStockThreshold: 3 },
                { id: "vritilife-facial-cleanser", name: "Vritilife Facial Cleanser", defaultUnit: "boxes", lowStockThreshold: 3 }
            ]
        };
    }

    // ---- Initialization & Event Binding ----
    init() {
        // Navigation tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Inventory tabs
        document.querySelectorAll('.inv-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.invTab;
                this.switchInventoryTab(tabName);
            });
        });

        // Set today's date for all date inputs
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('stockInDate').value = today;
        document.getElementById('stockOutDate').value = today;
        document.getElementById('usageDate').value = today;
        
        // Set default units
        document.getElementById('stockInUnit').value = 'boxes';
        document.getElementById('stockOutUnit').value = 'boxes';
        
        // Set default values for daily summary
        document.getElementById('weightGainShakes').value = '0';
        document.getElementById('weightLossShakes').value = '0';
        document.getElementById('totalCustomers').value = '0';
        document.getElementById('summaryDate').value = today;
        
        // Set default for product usage
        document.getElementById('usageUnit').value = 'scoops';

        // Populate product dropdowns
        this.populateProductDropdowns();

        // Form submissions
        document.getElementById('stockInForm').addEventListener('submit', (e) => this.handleStockIn(e));
        document.getElementById('stockOutForm').addEventListener('submit', (e) => this.handleStockOut(e));
        document.getElementById('dailyUsageForm').addEventListener('submit', (e) => this.handleProductUsage(e));
        document.getElementById('dailySummaryForm').addEventListener('submit', (e) => this.handleDailySummary(e));
        
        // Add Enter key shortcuts for quantity fields
        document.getElementById('stockInQuantity').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                document.getElementById('stockInForm').dispatchEvent(new Event('submit'));
            }
        });
        
        document.getElementById('stockOutQuantity').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                document.getElementById('stockOutForm').dispatchEvent(new Event('submit'));
            }
        });
        
        // Add Enter key shortcuts for daily summary fields
        document.getElementById('weightGainShakes').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                document.getElementById('weightLossShakes').focus();
            }
        });
        
        document.getElementById('weightLossShakes').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                document.getElementById('totalCustomers').focus();
            }
        });
        
        document.getElementById('totalCustomers').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                document.getElementById('dailySummaryForm').dispatchEvent(new Event('submit'));
            }
        });
        
        // Add Enter key for product usage quantity
        document.getElementById('usageQuantity').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                document.getElementById('dailyUsageForm').dispatchEvent(new Event('submit'));
            }
        });
        
        // Auto-focus on product search when tab is opened
        this.setupTabAutoFocus();

        // Inventory backup/restore buttons
        document.getElementById('backupInventoryBtn')?.addEventListener('click', () => this.backupInventoryData());
        document.getElementById('restoreInventoryBtn')?.addEventListener('click', () => {
            document.getElementById('restoreInventoryFile')?.click();
        });
        document.getElementById('restoreInventoryFile')?.addEventListener('change', (e) => this.restoreInventoryData(e));
        document.getElementById('checkInventoryDataBtn')?.addEventListener('click', () => this.checkInventoryData());
        document.getElementById('checkInventoryDataBtnHeader')?.addEventListener('click', () => this.checkInventoryData());
        document.getElementById('showMyDataBtn')?.addEventListener('click', () => {
            // First ensure we're on inventory tab
            const inventoryTab = document.querySelector('[data-tab="inventory"]');
            if (inventoryTab && !inventoryTab.classList.contains('active')) {
                this.switchTab('inventory');
                // Wait for tab to switch, then refresh
                setTimeout(() => {
                    this.forceRefreshDisplay();
                }, 200);
            } else {
                this.forceRefreshDisplay();
            }
        });

        // Event delegation for history lists
        document.getElementById('stockInHistory').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const { action, id } = btn.dataset;
            if (action === 'editStockIn') this.editStockIn(id);
            else if (action === 'deleteStockIn') this.deleteStockIn(id);
        });
        document.getElementById('stockOutHistory').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const { action, id } = btn.dataset;
            if (action === 'editStockOut') this.editStockOut(id);
            else if (action === 'deleteStockOut') this.deleteStockOut(id);
        });
        document.getElementById('dailyUsageHistory').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const { action, id } = btn.dataset;
            if (action === 'editDailyUsage') this.editDailyUsage(id);
            else if (action === 'deleteDailyUsage') this.deleteDailyUsage(id);
        });

        // Filters
        document.getElementById('stockSearch').addEventListener('input', () => this.renderCurrentStock());
        document.getElementById('stockCategoryFilter').addEventListener('change', () => this.renderCurrentStock());

        // Export order list
        document.getElementById('exportOrderList').addEventListener('click', () => this.exportOrderList());

        // Check storage usage
        checkStorageUsage();

        // Initial render
        this.renderCurrentStock();
        this.renderStockInHistory();
        this.renderStockOutHistory();
        this.renderDailyUsage();
        this.updateOrderList();
        this.checkAlerts();

        // Set up data protection mechanisms
        this.setupDataProtection();
    }

    // ---- Data Protection & IndexedDB ----
    setupDataProtection() {
        // Initialize IndexedDB as fallback
        this.initIndexedDB();

        // Save data when page is about to close
        window.addEventListener('beforeunload', (e) => {
            // Save all data synchronously
            try {
                this.saveAllData();
                // Also save to IndexedDB
                this.saveToIndexedDB();
            } catch (error) {
                console.error('Error saving on beforeunload:', error);
            }
        });

        // Also save on pagehide (more reliable on mobile)
        document.addEventListener('pagehide', () => {
            try {
                this.saveAllData();
                this.saveToIndexedDB();
            } catch (error) {
                console.error('Error saving on pagehide:', error);
            }
        });

        // Save when page becomes hidden (user switches tabs/apps)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                try {
                    this.saveAllData();
                    this.saveToIndexedDB();
                } catch (error) {
                    console.error('Error saving on visibility change:', error);
                }
            }
        });

        // Periodic auto-save every 30 seconds
        setInterval(() => {
            try {
                const result = this.saveAllData();
                // Also save to IndexedDB periodically
                this.saveToIndexedDB();
                
                if (result.errors.length === 0 && 
                    result.stockData && result.stockInHistory && 
                    result.stockOutHistory && result.dailyUsage) {
                    // Silently save - don't show toast for auto-saves
                    console.log('💾 Auto-saved all data');
                } else {
                    console.warn('⚠️ Auto-save had issues:', result);
                }
            } catch (error) {
                console.error('Error in periodic auto-save:', error);
            }
        }, 30000); // 30 seconds

        // Save immediately on focus (user returns to tab)
        window.addEventListener('focus', () => {
            try {
                // Quick save when user returns
                this.saveAllData();
                this.saveToIndexedDB();
            } catch (error) {
                console.error('Error saving on focus:', error);
            }
        });

        console.log('✅ Data protection mechanisms activated');
    }

    // IndexedDB fallback storage
    initIndexedDB() {
        if (!window.indexedDB) {
            console.warn('IndexedDB not supported, using localStorage only');
            return;
        }

        const request = indexedDB.open('InventoryDataDB', 1);
        
        request.onerror = () => {
            console.warn('IndexedDB initialization failed, using localStorage only');
        };

        request.onsuccess = () => {
            this.db = request.result;
            console.log('✅ IndexedDB initialized as backup storage');
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('inventory')) {
                db.createObjectStore('inventory', { keyPath: 'id' });
            }
        };
    }

    saveToIndexedDB() {
        if (!this.db) return;

        try {
            const transaction = this.db.transaction(['inventory'], 'readwrite');
            const store = transaction.objectStore('inventory');
            
            const data = {
                id: 'main',
                stockData: this.stockData,
                stockInHistory: this.stockInHistory,
                stockOutHistory: this.stockOutHistory,
                dailyUsage: this.dailyUsage,
                timestamp: new Date().toISOString()
            };

            store.put(data);
            console.log('💾 Data saved to IndexedDB backup');
        } catch (error) {
            console.warn('Could not save to IndexedDB:', error);
        }
    }

    loadFromIndexedDB() {
        if (!this.db) return null;

        return new Promise((resolve) => {
            try {
                const transaction = this.db.transaction(['inventory'], 'readonly');
                const store = transaction.objectStore('inventory');
                const request = store.get('main');

                request.onsuccess = () => {
                    if (request.result) {
                        console.log('✅ Loaded data from IndexedDB backup');
                        resolve(request.result);
                    } else {
                        resolve(null);
                    }
                };

                request.onerror = () => {
                    console.warn('Error loading from IndexedDB');
                    resolve(null);
                };
            } catch (error) {
                console.warn('Could not load from IndexedDB:', error);
                resolve(null);
            }
        });
    }

    // ---- Tab Navigation ----
    switchTab(tabName) {
        document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}Section`).classList.add('active');
        
        // Force refresh display when switching to inventory tab
        if (tabName === 'inventory') {
            setTimeout(() => {
                this.forceRefreshDisplay();
            }, 100);
        }
    }

    switchInventoryTab(tabName) {
        document.querySelectorAll('.inv-tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.inv-tab-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-inv-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}Tab`).classList.add('active');

        // Ensure the tab content is visible even if the page can't scroll automatically
        const section = document.getElementById('inventorySection');
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
        // Auto-focus on product search input when tab opens
        setTimeout(() => {
            if (tabName === 'stockIn') {
                const searchInput = document.getElementById('stockInProduct').closest('.searchable-select-wrapper')?.querySelector('.product-search-input');
                if (searchInput) searchInput.focus();
            } else if (tabName === 'stockOut') {
                const searchInput = document.getElementById('stockOutProduct').closest('.searchable-select-wrapper')?.querySelector('.product-search-input');
                if (searchInput) searchInput.focus();
            } else if (tabName === 'dailyUsage') {
                // Auto-focus on summary date field for daily usage
                setTimeout(() => {
                    document.getElementById('summaryDate').focus();
                }, 100);
            }
        }, 100);
    }
    
    setupTabAutoFocus() {
        // Auto-focus on first input when inventory section is shown
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const inventorySection = document.getElementById('inventorySection');
                    if (inventorySection && inventorySection.classList.contains('active')) {
                        const activeTab = document.querySelector('.inv-tab-content.active');
                        if (activeTab) {
                            setTimeout(() => {
                                const searchInput = activeTab.querySelector('.product-search-input');
                                if (searchInput) searchInput.focus();
                            }, 100);
                        }
                    }
                }
            });
        });
        
        const inventorySection = document.getElementById('inventorySection');
        if (inventorySection) {
            observer.observe(inventorySection, { attributes: true });
        }
    }

    // ---- Product Dropdowns & Search ----
    populateProductDropdowns() {
        const selects = ['stockInProduct', 'stockOutProduct', 'usageProduct'];
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            select.innerHTML = '<option value="">Select Product</option>';
            
            Object.keys(this.products).forEach(category => {
                const optgroup = document.createElement('optgroup');
                optgroup.label = category;
                this.products[category].forEach(product => {
                    const option = document.createElement('option');
                    option.value = product.id;
                    option.textContent = product.name;
                    option.setAttribute('data-search', product.name.toLowerCase());
                    optgroup.appendChild(option);
                });
                select.appendChild(optgroup);
            });
            
            // Add search functionality
            this.makeSelectSearchable(select);
        });
    }

    makeSelectSearchable(select) {
        // Create a wrapper div
        const wrapper = document.createElement('div');
        wrapper.className = 'searchable-select-wrapper';
        wrapper.style.position = 'relative';
        wrapper.style.width = '100%';
        
        // Create search input
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'product-search-input';
        searchInput.placeholder = 'Search products...';
        searchInput.style.cssText = 'width: 100%; padding: 10px; border: 2px solid var(--border-color); border-radius: 8px; margin-bottom: 5px; box-sizing: border-box;';
        
        // Create dropdown list
        const dropdown = document.createElement('div');
        dropdown.className = 'product-dropdown';
        dropdown.style.cssText = 'display: none; position: absolute; top: 100%; left: 0; right: 0; background: var(--card-bg); border: 2px solid var(--border-color); border-radius: 8px; max-height: 300px; overflow-y: auto; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
        
        // Wrap the select
        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(searchInput);
        wrapper.appendChild(dropdown);
        wrapper.appendChild(select);
        
        // Hide original select but keep it for form submission
        select.style.position = 'absolute';
        select.style.opacity = '0';
        select.style.width = '1px';
        select.style.height = '1px';
        
        // Build dropdown options
        const buildDropdown = (filter = '') => {
            dropdown.innerHTML = '';
            const filterLower = filter.toLowerCase();
            
            Object.keys(this.products).forEach(category => {
                const categoryDiv = document.createElement('div');
                categoryDiv.style.cssText = 'padding: 8px 12px; background: var(--bg-color); font-weight: 600; font-size: 0.85rem; color: var(--text-secondary); border-bottom: 1px solid var(--border-color);';
                categoryDiv.textContent = category;
                dropdown.appendChild(categoryDiv);
                
                this.products[category].forEach(product => {
                    if (!filter || product.name.toLowerCase().includes(filterLower)) {
                        const optionDiv = document.createElement('div');
                        optionDiv.className = 'dropdown-option';
                        optionDiv.style.cssText = 'padding: 10px 12px; cursor: pointer; border-bottom: 1px solid var(--border-color); color: var(--text-primary);';
                        optionDiv.textContent = product.name;
                        optionDiv.dataset.value = product.id;
                        
                        optionDiv.addEventListener('mouseenter', () => {
                            optionDiv.style.background = 'var(--bg-color)';
                        });
                        optionDiv.addEventListener('mouseleave', () => {
                            optionDiv.style.background = 'var(--card-bg)';
                        });
                        
                        optionDiv.addEventListener('click', () => {
                            select.value = product.id;
                            searchInput.value = product.name;
                            dropdown.style.display = 'none';
                            select.dispatchEvent(new Event('change'));
                            
                            // Auto-focus on quantity field after product selection
                            const formId = select.id;
                            if (formId === 'stockInProduct') {
                                document.getElementById('stockInQuantity').focus();
                                document.getElementById('stockInQuantity').select();
                            } else if (formId === 'stockOutProduct') {
                                document.getElementById('stockOutQuantity').focus();
                                document.getElementById('stockOutQuantity').select();
                            } else if (formId === 'usageProduct') {
                                document.getElementById('usageQuantity').focus();
                                document.getElementById('usageQuantity').select();
                            }
                        });
                        
                        dropdown.appendChild(optionDiv);
                    }
                });
            });
        };
        
        // Show dropdown on focus
        searchInput.addEventListener('focus', () => {
            buildDropdown();
            dropdown.style.display = 'block';
        });
        
        // Filter on input
        searchInput.addEventListener('input', (e) => {
            selectedIndex = -1; // Reset selection when typing
            buildDropdown(e.target.value);
            dropdown.style.display = 'block';
        });
        
        // Hide dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
        
        // Update search input when select changes
        select.addEventListener('change', () => {
            if (select.value) {
                const product = this.getProductById(select.value);
                if (product) {
                    searchInput.value = product.name;
                    
                    // Show current stock info for Stock In/Out
                    const formId = select.id;
                    if (formId === 'stockInProduct' || formId === 'stockOutProduct') {
                        this.showProductStockInfo(select.value, formId);
                    }
                }
            } else {
                searchInput.value = '';
                this.hideProductStockInfo();
            }
        });
        
        // Keyboard navigation in dropdown
        let selectedIndex = -1;
        searchInput.addEventListener('keydown', (e) => {
            const options = dropdown.querySelectorAll('.dropdown-option');
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, options.length - 1);
                if (options[selectedIndex]) {
                    options[selectedIndex].scrollIntoView({ block: 'nearest' });
                    options[selectedIndex].style.background = 'var(--primary-color)';
                    options[selectedIndex].style.color = 'white';
                    // Remove highlight from others
                    options.forEach((opt, idx) => {
                        if (idx !== selectedIndex) {
                            opt.style.background = 'var(--card-bg)';
                            opt.style.color = 'var(--text-primary)';
                        }
                    });
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, -1);
                options.forEach((opt, idx) => {
                    if (idx === selectedIndex) {
                        opt.style.background = 'var(--primary-color)';
                        opt.style.color = 'white';
                        opt.scrollIntoView({ block: 'nearest' });
                    } else {
                        opt.style.background = 'var(--card-bg)';
                        opt.style.color = 'var(--text-primary)';
                    }
                });
            } else if (e.key === 'Enter' && selectedIndex >= 0 && options[selectedIndex]) {
                e.preventDefault();
                options[selectedIndex].click();
            } else if (e.key === 'Escape') {
                dropdown.style.display = 'none';
                searchInput.blur();
            }
        });
    }
    
    showProductStockInfo(productId, formId) {
        // Remove existing info
        this.hideProductStockInfo();
        
        const product = this.getProductById(productId);
        if (!product) return;
        
        const stock = this.stockData[productId] || { quantity: 0, unit: product.defaultUnit };
        const stockInfo = document.createElement('div');
        stockInfo.className = 'product-stock-info';
        stockInfo.style.cssText = 'margin-top: 8px; padding: 8px 12px; background: var(--bg-color); border-radius: 6px; font-size: 0.9rem; color: var(--text-secondary);';
        
        if (formId === 'stockInProduct') {
            stockInfo.innerHTML = `📦 Current Stock: <strong>${stock.quantity.toFixed(2)} ${stock.unit}</strong>`;
        } else if (formId === 'stockOutProduct') {
            const isLowStock = stock.quantity > 0 && stock.quantity <= product.lowStockThreshold;
            const isOutOfStock = stock.quantity <= 0;
            let stockColor = 'var(--text-secondary)';
            if (isOutOfStock) stockColor = 'var(--danger-color)';
            else if (isLowStock) stockColor = 'var(--warning-color)';
            
            stockInfo.innerHTML = `📦 Available: <strong style="color: ${stockColor}">${stock.quantity.toFixed(2)} ${stock.unit}</strong>`;
        }
        
        const wrapper = document.getElementById(formId).closest('.searchable-select-wrapper');
        if (wrapper) {
            wrapper.appendChild(stockInfo);
        }
    }
    
    hideProductStockInfo() {
        document.querySelectorAll('.product-stock-info').forEach(el => el.remove());
    }

    getProductById(id) {
        for (const category in this.products) {
            const product = this.products[category].find(p => p.id === id);
            if (product) {
                return { ...product, category };
            }
        }
        return null;
    }

    // ---- Load / Save Data (localStorage + backups) ----
    loadStockData() {
        // Try primary location first
        let stored = localStorage.getItem('inventoryStock');
        let source = 'primary';
        
        // If primary is empty, try secondary
        if (!stored || stored === '{}' || stored === 'null') {
            stored = localStorage.getItem('inventoryStock_secondary');
            if (stored) {
                source = 'secondary';
                console.log('⚠️ Primary stock data empty, loading from secondary');
            }
        }
        
        // If still empty, try most recent backup
        if (!stored || stored === '{}' || stored === 'null') {
            const allKeys = Object.keys(localStorage);
            const backupKeys = allKeys.filter(k => k.startsWith('inventoryStock_backup_')).sort().reverse();
            if (backupKeys.length > 0) {
                stored = localStorage.getItem(backupKeys[0]);
                source = 'backup: ' + backupKeys[0];
                console.log('⚠️ Loading stock from backup:', backupKeys[0]);
                // Restore to primary
                if (stored) {
                    setTimeout(() => {
                        localStorage.setItem('inventoryStock', stored);
                        console.log('✅ Restored stock backup to primary');
                    }, 100);
                }
            }
        }
        
        if (stored && stored !== '{}' && stored !== 'null') {
            try {
                const data = JSON.parse(stored);
                console.log(`✅ Stock Data loaded from ${source}:`, Object.keys(data).length, 'products');
                return data;
            } catch (e) {
                console.error('❌ Error parsing stock data:', e);
                return this.initializeEmptyStock();
            }
        }
        
        // Try IndexedDB recovery after initialization (async)
        this.tryIndexedDBRecovery();
        
        // Initialize with zero stock for all products
        return this.initializeEmptyStock();
    }

    // Try to recover data from IndexedDB if localStorage is empty
    async tryIndexedDBRecovery() {
        // Only try if localStorage is empty and we have IndexedDB
        const hasLocalData = localStorage.getItem('inventoryStock') && 
                            localStorage.getItem('inventoryStock') !== '{}' &&
                            localStorage.getItem('inventoryStock') !== 'null';
        
        if (hasLocalData || !this.db) return;

        try {
            const indexedData = await this.loadFromIndexedDB();
            if (indexedData) {
                console.log('🔄 Attempting to recover data from IndexedDB...');
                
                if (indexedData.stockData && Object.keys(indexedData.stockData).length > 0) {
                    this.stockData = indexedData.stockData;
                    localStorage.setItem('inventoryStock', JSON.stringify(indexedData.stockData));
                    console.log('✅ Recovered stock data from IndexedDB');
                }
                
                if (indexedData.stockInHistory && indexedData.stockInHistory.length > 0) {
                    this.stockInHistory = indexedData.stockInHistory;
                    localStorage.setItem('inventoryStockIn', JSON.stringify(indexedData.stockInHistory));
                    console.log('✅ Recovered stock in history from IndexedDB');
                }
                
                if (indexedData.stockOutHistory && indexedData.stockOutHistory.length > 0) {
                    this.stockOutHistory = indexedData.stockOutHistory;
                    localStorage.setItem('inventoryStockOut', JSON.stringify(indexedData.stockOutHistory));
                    console.log('✅ Recovered stock out history from IndexedDB');
                }
                
                if (indexedData.dailyUsage && indexedData.dailyUsage.length > 0) {
                    this.dailyUsage = indexedData.dailyUsage;
                    localStorage.setItem('inventoryDailyUsage', JSON.stringify(indexedData.dailyUsage));
                    console.log('✅ Recovered daily usage from IndexedDB');
                }
                
                // Refresh display
                this.forceRefreshDisplay();
                this.showToast('✅ Data recovered from backup storage!', 'success');
            }
        } catch (e) {
            console.warn('Could not recover from IndexedDB:', e);
        }
    }
    
    initializeEmptyStock() {
        const stock = {};
        Object.keys(this.products).forEach(category => {
            this.products[category].forEach(product => {
                stock[product.id] = {
                    quantity: 0,
                    unit: product.defaultUnit
                };
            });
        });
        return stock;
    }

    saveStockData() {
        try {
            // Save to primary location
            localStorage.setItem('inventoryStock', JSON.stringify(this.stockData));
            
            // Create automatic backup with timestamp
            const backupKey = 'inventoryStock_backup_' + new Date().toISOString().split('T')[0];
            localStorage.setItem(backupKey, JSON.stringify(this.stockData));
            
            // Keep only last 7 days of backups
            cleanupOldBackups('inventoryStock_backup_', 3);
            
            // Also save to secondary key
            localStorage.setItem('inventoryStock_secondary', JSON.stringify(this.stockData));
            
            console.log('✅ Stock Data saved with backups:', Object.keys(this.stockData).length, 'products');
        } catch (e) {
            console.error('❌ CRITICAL: Failed to save stock data!', e);
            alert('ERROR: Could not save stock data! Please check browser storage settings or export immediately.');
        }
    }
    
    loadStockInHistory() {
        // Try primary, then secondary, then backup
        let stored = localStorage.getItem('inventoryStockIn');
        let source = 'primary';
        
        if (!stored || stored === '[]' || stored === 'null') {
            stored = localStorage.getItem('inventoryStockIn_secondary');
            if (stored) source = 'secondary';
        }
        
        if (!stored || stored === '[]' || stored === 'null') {
            const allKeys = Object.keys(localStorage);
            const backupKeys = allKeys.filter(k => k.startsWith('inventoryStockIn_backup_')).sort().reverse();
            if (backupKeys.length > 0) {
                stored = localStorage.getItem(backupKeys[0]);
                source = 'backup: ' + backupKeys[0];
                if (stored) {
                    setTimeout(() => {
                        localStorage.setItem('inventoryStockIn', stored);
                    }, 100);
                }
            }
        }
        
        if (stored && stored !== '[]' && stored !== 'null') {
            try {
                const data = JSON.parse(stored);
                console.log(`✅ Stock In History loaded from ${source}:`, data.length, 'entries');
                return Array.isArray(data) ? data : [];
            } catch (e) {
                console.error('❌ Error parsing stock in history:', e);
                return [];
            }
        }
        return [];
    }

    saveStockInHistory() {
        try {
            // Save to primary location
            localStorage.setItem('inventoryStockIn', JSON.stringify(this.stockInHistory));
            
            // Create automatic backup
            const backupKey = 'inventoryStockIn_backup_' + new Date().toISOString().split('T')[0];
            localStorage.setItem(backupKey, JSON.stringify(this.stockInHistory));
            
            // Keep only last 7 days
            cleanupOldBackups('inventoryStockIn_backup_', 3);
            
            // Secondary backup
            localStorage.setItem('inventoryStockIn_secondary', JSON.stringify(this.stockInHistory));
            
            console.log('✅ Stock In History saved with backups:', this.stockInHistory.length, 'entries');
        } catch (e) {
            console.error('❌ CRITICAL: Failed to save stock in history!', e);
            alert('ERROR: Could not save stock in history! Please check browser storage settings.');
        }
    }

    loadStockOutHistory() {
        // Try primary, then secondary, then backup
        let stored = localStorage.getItem('inventoryStockOut');
        let source = 'primary';

        if (!stored || stored === '[]' || stored === 'null') {
            stored = localStorage.getItem('inventoryStockOut_secondary');
            if (stored) source = 'secondary';
        }

        if (!stored || stored === '[]' || stored === 'null') {
            const allKeys = Object.keys(localStorage);
            const backupKeys = allKeys.filter(k => k.startsWith('inventoryStockOut_backup_')).sort().reverse();
            if (backupKeys.length > 0) {
                stored = localStorage.getItem(backupKeys[0]);
                source = 'backup: ' + backupKeys[0];
                if (stored) {
                    setTimeout(() => {
                        localStorage.setItem('inventoryStockOut', stored);
                    }, 100);
                }
            }
        }

        if (stored && stored !== '[]' && stored !== 'null') {
            try {
                const data = JSON.parse(stored);
                console.log(`✅ Stock Out History loaded from ${source}:`, data.length, 'entries');
                return Array.isArray(data) ? data : [];
            } catch (e) {
                console.error('❌ Error parsing stock out history:', e);
                return [];
            }
        }
        return [];
    }

    saveStockOutHistory() {
        try {
            // Save to primary location
            localStorage.setItem('inventoryStockOut', JSON.stringify(this.stockOutHistory));
            
            // Create automatic backup
            const backupKey = 'inventoryStockOut_backup_' + new Date().toISOString().split('T')[0];
            localStorage.setItem(backupKey, JSON.stringify(this.stockOutHistory));
            
            // Keep only last 7 days
            cleanupOldBackups('inventoryStockOut_backup_', 3);
            
            // Secondary backup
            localStorage.setItem('inventoryStockOut_secondary', JSON.stringify(this.stockOutHistory));
            
            console.log('✅ Stock Out History saved with backups:', this.stockOutHistory.length, 'entries');
        } catch (e) {
            console.error('❌ CRITICAL: Failed to save stock out history!', e);
            alert('ERROR: Could not save stock out history! Please check browser storage settings.');
        }
    }

    loadDailyUsage() {
        // Try primary, then secondary, then backup
        let stored = localStorage.getItem('inventoryDailyUsage');
        let source = 'primary';
        
        if (!stored || stored === '[]' || stored === 'null') {
            stored = localStorage.getItem('inventoryDailyUsage_secondary');
            if (stored) source = 'secondary';
        }
        
        if (!stored || stored === '[]' || stored === 'null') {
            const allKeys = Object.keys(localStorage);
            const backupKeys = allKeys.filter(k => k.startsWith('inventoryDailyUsage_backup_')).sort().reverse();
            if (backupKeys.length > 0) {
                stored = localStorage.getItem(backupKeys[0]);
                source = 'backup: ' + backupKeys[0];
                if (stored) {
                    setTimeout(() => {
                        localStorage.setItem('inventoryDailyUsage', stored);
                    }, 100);
                }
            }
        }
        
        if (stored && stored !== '[]' && stored !== 'null') {
            try {
                const data = JSON.parse(stored);
                console.log(`✅ Daily Usage loaded from ${source}:`, data.length, 'entries');
                return Array.isArray(data) ? data : [];
            } catch (e) {
                console.error('❌ Error parsing daily usage:', e);
                return [];
            }
        }
        return [];
    }

    saveDailyUsage() {
        try {
            // Save to primary location
            localStorage.setItem('inventoryDailyUsage', JSON.stringify(this.dailyUsage));
            
            // Create automatic backup
            const backupKey = 'inventoryDailyUsage_backup_' + new Date().toISOString().split('T')[0];
            localStorage.setItem(backupKey, JSON.stringify(this.dailyUsage));
            
            // Keep only last 7 days
            cleanupOldBackups('inventoryDailyUsage_backup_', 3);
            
            // Secondary backup
            localStorage.setItem('inventoryDailyUsage_secondary', JSON.stringify(this.dailyUsage));
            
            console.log('✅ Daily Usage saved with backups:', this.dailyUsage.length, 'entries');
        } catch (e) {
            console.error('❌ CRITICAL: Failed to save daily usage!', e);
            alert('ERROR: Could not save daily usage! Please check browser storage settings.');
        }
    }

    // Update visual save status indicator
    updateSaveStatus(saved) {
        // Remove existing status indicator
        const existing = document.getElementById('saveStatusIndicator');
        if (existing) {
            existing.remove();
        }

        // Create status indicator
        const indicator = document.createElement('div');
        indicator.id = 'saveStatusIndicator';
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 15px;
            background: ${saved ? '#4CAF50' : '#f44336'};
            color: white;
            border-radius: 8px;
            font-size: 0.9rem;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            transition: opacity 0.3s;
        `;
        indicator.textContent = saved ? '✅ Data Saved' : '⚠️ Save Failed';
        document.body.appendChild(indicator);

        // Fade out after 2 seconds
        setTimeout(() => {
            indicator.style.opacity = '0';
            setTimeout(() => indicator.remove(), 300);
        }, 2000);
    }

    // Comprehensive save method that saves ALL data with verification
    saveAllData() {
        const saveResults = {
            stockData: false,
            stockInHistory: false,
            stockOutHistory: false,
            dailyUsage: false,
            errors: []
        };

        try {
            // Save all data
            this.saveStockData();
            this.saveStockInHistory();
            this.saveStockOutHistory();
            this.saveDailyUsage();

            // Verify each save was successful
            try {
                const verifyStock = localStorage.getItem('inventoryStock');
                if (verifyStock && verifyStock !== '{}' && verifyStock !== 'null') {
                    const parsed = JSON.parse(verifyStock);
                    if (Object.keys(parsed).length > 0) {
                        saveResults.stockData = true;
                    }
                }
            } catch (e) {
                saveResults.errors.push('Stock data verification failed: ' + e.message);
            }

            try {
                const verifyStockIn = localStorage.getItem('inventoryStockIn');
                if (verifyStockIn && verifyStockIn !== '[]' && verifyStockIn !== 'null') {
                    const parsed = JSON.parse(verifyStockIn);
                    if (Array.isArray(parsed)) {
                        saveResults.stockInHistory = true;
                    }
                }
            } catch (e) {
                saveResults.errors.push('Stock In history verification failed: ' + e.message);
            }

            try {
                const verifyStockOut = localStorage.getItem('inventoryStockOut');
                if (verifyStockOut && verifyStockOut !== '[]' && verifyStockOut !== 'null') {
                    const parsed = JSON.parse(verifyStockOut);
                    if (Array.isArray(parsed)) {
                        saveResults.stockOutHistory = true;
                    }
                }
            } catch (e) {
                saveResults.errors.push('Stock Out history verification failed: ' + e.message);
            }

            try {
                const verifyDailyUsage = localStorage.getItem('inventoryDailyUsage');
                if (verifyDailyUsage && verifyDailyUsage !== '[]' && verifyDailyUsage !== 'null') {
                    const parsed = JSON.parse(verifyDailyUsage);
                    if (Array.isArray(parsed)) {
                        saveResults.dailyUsage = true;
                    }
                }
            } catch (e) {
                saveResults.errors.push('Daily usage verification failed: ' + e.message);
            }

            // Check if all saves were successful
            const allSaved = saveResults.stockData && saveResults.stockInHistory && 
                           saveResults.stockOutHistory && saveResults.dailyUsage;

            if (!allSaved) {
                console.warn('⚠️ Some data may not have saved correctly:', saveResults);
                if (saveResults.errors.length > 0) {
                    console.error('Save errors:', saveResults.errors);
                }
            } else {
                console.log('✅ All data saved and verified successfully');
            }

            // Save metadata about last successful save
            try {
                localStorage.setItem('inventoryLastSave', JSON.stringify({
                    timestamp: new Date().toISOString(),
                    stockDataCount: Object.keys(this.stockData).length,
                    stockInCount: this.stockInHistory.length,
                    stockOutCount: this.stockOutHistory.length,
                    dailyUsageCount: this.dailyUsage.length,
                    allSaved: allSaved
                }));
            } catch (e) {
                console.warn('Could not save metadata:', e);
            }

            // Also save to IndexedDB as backup
            if (allSaved) {
                this.saveToIndexedDB();
            }

            // Update visual save status
            this.updateSaveStatus(allSaved);

            return saveResults;
        } catch (e) {
            console.error('❌ CRITICAL ERROR in saveAllData:', e);
            saveResults.errors.push('Critical save error: ' + e.message);
            alert('CRITICAL: Failed to save data! Please export your data immediately using the backup feature.');
            return saveResults;
        }
    }

    // ---- Form Handlers (Stock In / Out / Usage / Summary) ----
    handleStockIn(e) {
        e.preventDefault();
        const productId = document.getElementById('stockInProduct').value;
        const quantity = parseFloat(document.getElementById('stockInQuantity').value);
        const unit = document.getElementById('stockInUnit').value;
        const date = document.getElementById('stockInDate').value;
        const notes = document.getElementById('stockInNotes').value;

        const isEditing = !!this.editingStockInId;

        if (this.editingStockInId) {
            // Update existing entry
            const index = this.stockInHistory.findIndex(entry => entry.id === this.editingStockInId);
            if (index !== -1) {
                const oldEntry = this.stockInHistory[index];
                
                // Adjust stock: remove old quantity, add new quantity
                if (!this.stockData[oldEntry.productId]) {
                    this.stockData[oldEntry.productId] = { quantity: 0, unit: oldEntry.unit };
                }
                this.stockData[oldEntry.productId].quantity -= oldEntry.quantity;
                
                // Update entry
                this.stockInHistory[index] = {
                    ...oldEntry,
                    productId,
                    quantity,
                    unit,
                    date,
                    notes
                };
                
                // Add new quantity
                if (!this.stockData[productId]) {
                    this.stockData[productId] = { quantity: 0, unit: unit };
                }
                this.stockData[productId].quantity += quantity;
                this.stockData[productId].unit = unit;
            }
            this.editingStockInId = null;
            document.querySelector('#stockInForm button[type="submit"]').textContent = 'Add Stock In';
        } else {
            // Add new entry
            if (!this.stockData[productId]) {
                this.stockData[productId] = { quantity: 0, unit: unit };
            }
            
            this.stockData[productId].quantity += quantity;
            this.stockData[productId].unit = unit;

            // Add to history
            this.stockInHistory.unshift({
                id: generateId(),
                productId,
                quantity,
                unit,
                date,
                notes,
                timestamp: new Date().toISOString()
            });
        }

        // CRITICAL: Always save ALL data immediately with verification
        const saveResult = this.saveAllData();
        
        if (!saveResult.stockData || !saveResult.stockInHistory) {
            this.showToast('⚠️ Warning: Data may not have saved correctly. Please check!', 'error');
        }
        
        this.renderCurrentStock();
        this.renderStockInHistory();
        this.updateOrderList();
        this.checkAlerts();

        // Reset form
        document.getElementById('stockInForm').reset();
        document.getElementById('stockInDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('stockInUnit').value = 'boxes'; // Default to boxes
        
        // Clear search input and auto-focus
        const stockInSelect = document.getElementById('stockInProduct');
        const stockInWrapper = stockInSelect.closest('.searchable-select-wrapper');
        if (stockInWrapper) {
            const searchInput = stockInWrapper.querySelector('.product-search-input');
            if (searchInput) {
                searchInput.value = '';
                // Auto-focus on search input for next entry
                setTimeout(() => searchInput.focus(), 100);
            }
        }
        
        this.hideProductStockInfo();
        this.showToast(isEditing ? 'Stock updated successfully!' : 'Stock added successfully!', 'success');
    }

    handleStockOut(e) {
        e.preventDefault();
        const productId = document.getElementById('stockOutProduct').value;
        const quantity = parseFloat(document.getElementById('stockOutQuantity').value);
        const unit = document.getElementById('stockOutUnit').value;
        const date = document.getElementById('stockOutDate').value;
        const notes = document.getElementById('stockOutNotes').value;

        const isEditing = !!this.editingStockOutId;

        if (this.editingStockOutId) {
            // Update existing entry
            const index = this.stockOutHistory.findIndex(entry => entry.id === this.editingStockOutId);
            if (index !== -1) {
                const oldEntry = this.stockOutHistory[index];
                
                // Adjust stock: add back old quantity, remove new quantity
                if (!this.stockData[oldEntry.productId]) {
                    this.stockData[oldEntry.productId] = { quantity: 0, unit: oldEntry.unit };
                }
                this.stockData[oldEntry.productId].quantity += oldEntry.quantity;
                
                // Check if new quantity is available
                if (!this.stockData[productId] || this.stockData[productId].quantity < quantity) {
                    const currentStock = this.stockData[productId] ? this.stockData[productId].quantity : 0;
                    this.showToast(`Insufficient stock! Available: ${currentStock.toFixed(2)} ${this.stockData[productId]?.unit || 'units'}`, 'error');
                    // Restore old stock
                    this.stockData[oldEntry.productId].quantity -= oldEntry.quantity;
                    return;
                }
                
                // Update entry
                this.stockOutHistory[index] = {
                    ...oldEntry,
                    productId,
                    quantity,
                    unit,
                    date,
                    notes
                };
                
                // Remove new quantity
                this.stockData[productId].quantity -= quantity;
            }
            this.editingStockOutId = null;
            document.querySelector('#stockOutForm button[type="submit"]').textContent = 'Mark as Completed';
        } else {
            // Add new entry
            if (!this.stockData[productId] || this.stockData[productId].quantity < quantity) {
                const currentStock = this.stockData[productId] ? this.stockData[productId].quantity : 0;
                this.showToast(`Insufficient stock! Available: ${currentStock.toFixed(2)} ${this.stockData[productId]?.unit || 'units'}`, 'error');
                return;
            }

            // Remove from stock
            this.stockData[productId].quantity -= quantity;

            // Remove corresponding Stock In entries (FIFO - First In First Out)
            let remainingToRemove = quantity;
            const stockInToRemove = [];
            
            // Sort Stock In by date (oldest first) for FIFO
            const sortedStockIn = [...this.stockInHistory]
                .filter(entry => entry.productId === productId)
                .sort((a, b) => new Date(a.date) - new Date(b.date));
            
            for (const stockInEntry of sortedStockIn) {
                if (remainingToRemove <= 0) break;
                
                if (stockInEntry.quantity <= remainingToRemove) {
                    // Remove entire entry
                    stockInToRemove.push(stockInEntry.id);
                    remainingToRemove -= stockInEntry.quantity;
                } else {
                    // Reduce entry quantity
                    stockInEntry.quantity -= remainingToRemove;
                    remainingToRemove = 0;
                }
            }
            
            // Remove entries from Stock In history
            this.stockInHistory = this.stockInHistory.filter(entry => !stockInToRemove.includes(entry.id));

            // Add to Stock Out history
            this.stockOutHistory.unshift({
                id: generateId(),
                productId,
                quantity,
                unit,
                date,
                notes,
                timestamp: new Date().toISOString()
            });
        }

        // Save all data with verification
        const saveResult = this.saveAllData();
        
        if (!saveResult.stockData || !saveResult.stockInHistory || !saveResult.stockOutHistory) {
            this.showToast('⚠️ Warning: Data may not have saved correctly. Please check!', 'error');
        }
        this.renderCurrentStock();
        this.renderStockInHistory();
        this.renderStockOutHistory();
        this.updateOrderList();
        this.checkAlerts();

        // Reset form
        document.getElementById('stockOutForm').reset();
        document.getElementById('stockOutDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('stockOutUnit').value = 'boxes'; // Default to boxes
        
        // Clear search input and auto-focus
        const stockOutSelect = document.getElementById('stockOutProduct');
        const stockOutWrapper = stockOutSelect.closest('.searchable-select-wrapper');
        if (stockOutWrapper) {
            const searchInput = stockOutWrapper.querySelector('.product-search-input');
            if (searchInput) {
                searchInput.value = '';
                // Auto-focus on search input for next entry
                setTimeout(() => searchInput.focus(), 100);
            }
        }
        
        this.hideProductStockInfo();
        this.showToast(isEditing ? 'Stock out updated successfully!' : 'Stock marked as completed!', 'success');
    }

    handleProductUsage(e) {
        e.preventDefault();
        const productId = document.getElementById('usageProduct').value;
        const quantity = parseFloat(document.getElementById('usageQuantity').value);
        const unit = document.getElementById('usageUnit').value;
        const date = document.getElementById('usageDate').value;

        const isEditing = !!this.editingUsageId;
        
        if (this.editingUsageId) {
            // Update existing entry
            const index = this.dailyUsage.findIndex(entry => entry.id === this.editingUsageId);
            if (index !== -1) {
                this.dailyUsage[index] = {
                    ...this.dailyUsage[index],
                    productId,
                    quantity,
                    unit,
                    date,
                    timestamp: new Date().toISOString()
                };
            }
            this.editingUsageId = null;
            document.querySelector('#dailyUsageForm button[type="submit"]').textContent = 'Record Product Usage';
        } else {
            // Add new entry
            this.dailyUsage.unshift({
                id: generateId(),
                type: 'product',
                productId,
                quantity,
                unit,
                date,
                timestamp: new Date().toISOString()
            });
        }

        this.saveAllData();
        this.renderDailyUsage();

        // Reset form
        document.getElementById('dailyUsageForm').reset();
        document.getElementById('usageDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('usageUnit').value = 'scoops';
        
        // Clear search input and auto-focus
        const usageSelect = document.getElementById('usageProduct');
        const usageWrapper = usageSelect.closest('.searchable-select-wrapper');
        if (usageWrapper) {
            const searchInput = usageWrapper.querySelector('.product-search-input');
            if (searchInput) {
                searchInput.value = '';
                setTimeout(() => searchInput.focus(), 100);
            }
        }
        
        this.showToast(isEditing ? 'Product usage updated!' : 'Product usage recorded!', 'success');
    }

    handleDailySummary(e) {
        e.preventDefault();
        const date = document.getElementById('summaryDate').value;
        const weightGainShakes = parseInt(document.getElementById('weightGainShakes').value) || 0;
        const weightLossShakes = parseInt(document.getElementById('weightLossShakes').value) || 0;
        const totalCustomers = parseInt(document.getElementById('totalCustomers').value) || 0;
        const notes = document.getElementById('summaryNotes').value;

        // Check if summary entry for this date already exists
        const existingEntry = this.dailyUsage.find(entry => entry.date === date && entry.type === 'summary');
        if (existingEntry) {
            if (confirm('A daily summary for this date already exists. Do you want to update it?')) {
                existingEntry.weightGainShakes = weightGainShakes;
                existingEntry.weightLossShakes = weightLossShakes;
                existingEntry.totalCustomers = totalCustomers;
                existingEntry.notes = notes;
                existingEntry.timestamp = new Date().toISOString();
            } else {
                return;
            }
        } else {
            // Add new entry
            this.dailyUsage.unshift({
                id: generateId(),
                type: 'summary',
                date,
                weightGainShakes,
                weightLossShakes,
                totalCustomers,
                notes,
                timestamp: new Date().toISOString()
            });
        }

        this.saveAllData();
        this.renderDailyUsage();

        // Reset form
        document.getElementById('dailySummaryForm').reset();
        document.getElementById('summaryDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('weightGainShakes').value = '0';
        document.getElementById('weightLossShakes').value = '0';
        document.getElementById('totalCustomers').value = '0';
        
        // Auto-focus on date field for next entry
        setTimeout(() => {
            document.getElementById('summaryDate').focus();
        }, 100);
        
        this.showToast('Daily summary recorded!', 'success');
    }

    // ---- Edit & Delete Actions ----
    editDailyUsage(id) {
        const entry = this.dailyUsage.find(e => e.id === id);
        if (!entry) return;

        this.editingUsageId = id;
        
        if (entry.type === 'summary') {
            // Edit summary entry
            document.getElementById('summaryDate').value = entry.date || new Date().toISOString().split('T')[0];
            document.getElementById('weightGainShakes').value = entry.weightGainShakes || 0;
            document.getElementById('weightLossShakes').value = entry.weightLossShakes || 0;
            document.getElementById('totalCustomers').value = entry.totalCustomers || 0;
            document.getElementById('summaryNotes').value = entry.notes || '';
            
            document.getElementById('dailySummaryForm').scrollIntoView({ behavior: 'smooth' });
        } else {
            // Edit product usage entry
            const select = document.getElementById('usageProduct');
            select.value = entry.productId;
            document.getElementById('usageQuantity').value = entry.quantity;
            document.getElementById('usageUnit').value = entry.unit;
            document.getElementById('usageDate').value = entry.date;
            
            // Update search input
            const product = this.getProductById(entry.productId);
            const wrapper = select.closest('.searchable-select-wrapper');
            if (wrapper) {
                const searchInput = wrapper.querySelector('.product-search-input');
                if (searchInput) {
                    searchInput.value = product ? product.name : '';
                }
            }
            select.dispatchEvent(new Event('change'));
            
            document.querySelector('#dailyUsageForm button[type="submit"]').textContent = 'Update Product Usage';
            document.getElementById('dailyUsageForm').scrollIntoView({ behavior: 'smooth' });
        }
    }

    deleteDailyUsage(id) {
        if (confirm('Are you sure you want to delete this usage record?')) {
            this.dailyUsage = this.dailyUsage.filter(e => e.id !== id);
            this.saveAllData();
            this.renderDailyUsage();
            
            if (this.editingUsageId === id) {
                this.editingUsageId = null;
                const entry = this.dailyUsage.find(e => e.id === id);
                if (entry && entry.type === 'summary') {
                    document.getElementById('dailySummaryForm').reset();
                    document.getElementById('summaryDate').value = new Date().toISOString().split('T')[0];
                } else {
                    document.getElementById('dailyUsageForm').reset();
                    document.getElementById('usageDate').value = new Date().toISOString().split('T')[0];
                    document.getElementById('usageUnit').value = 'scoops';
                }
            }
        }
    }

    editStockIn(id) {
        const entry = this.stockInHistory.find(e => e.id === id);
        if (!entry) return;

        this.editingStockInId = id;
        const select = document.getElementById('stockInProduct');
        select.value = entry.productId;
        document.getElementById('stockInQuantity').value = entry.quantity;
        document.getElementById('stockInUnit').value = entry.unit;
        document.getElementById('stockInDate').value = entry.date;
        document.getElementById('stockInNotes').value = entry.notes || '';
        
        // Update search input
        const product = this.getProductById(entry.productId);
        const wrapper = select.closest('.searchable-select-wrapper');
        if (wrapper) {
            const searchInput = wrapper.querySelector('.product-search-input');
            if (searchInput) {
                searchInput.value = product ? product.name : '';
            }
        }
        select.dispatchEvent(new Event('change'));
        
        document.querySelector('#stockInForm button[type="submit"]').textContent = 'Update Stock In';
        
        // Scroll to form
        document.getElementById('stockInForm').scrollIntoView({ behavior: 'smooth' });
    }

    deleteStockIn(id) {
        if (confirm('Are you sure you want to delete this stock in entry? This will also reduce the current stock.')) {
            const entry = this.stockInHistory.find(e => e.id === id);
            if (entry) {
                // Reduce stock
                if (this.stockData[entry.productId]) {
                    this.stockData[entry.productId].quantity -= entry.quantity;
                    if (this.stockData[entry.productId].quantity < 0) {
                        this.stockData[entry.productId].quantity = 0;
                    }
                }
            }
            
            this.stockInHistory = this.stockInHistory.filter(e => e.id !== id);
            this.saveAllData();
            this.renderCurrentStock();
            this.renderStockInHistory();
            this.updateOrderList();
            this.checkAlerts();
            
            if (this.editingStockInId === id) {
                this.editingStockInId = null;
                document.getElementById('stockInForm').reset();
                document.getElementById('stockInDate').value = new Date().toISOString().split('T')[0];
                document.querySelector('#stockInForm button[type="submit"]').textContent = 'Add Stock In';
            }
            
            this.showToast('Stock in entry deleted!', 'success');
        }
    }

    editStockOut(id) {
        const entry = this.stockOutHistory.find(e => e.id === id);
        if (!entry) return;

        this.editingStockOutId = id;
        const select = document.getElementById('stockOutProduct');
        select.value = entry.productId;
        document.getElementById('stockOutQuantity').value = entry.quantity;
        document.getElementById('stockOutUnit').value = entry.unit;
        document.getElementById('stockOutDate').value = entry.date;
        document.getElementById('stockOutNotes').value = entry.notes || '';
        
        // Update search input
        const product = this.getProductById(entry.productId);
        const wrapper = select.closest('.searchable-select-wrapper');
        if (wrapper) {
            const searchInput = wrapper.querySelector('.product-search-input');
            if (searchInput) {
                searchInput.value = product ? product.name : '';
            }
        }
        select.dispatchEvent(new Event('change'));
        
        document.querySelector('#stockOutForm button[type="submit"]').textContent = 'Update Stock Out';
        
        // Scroll to form
        document.getElementById('stockOutForm').scrollIntoView({ behavior: 'smooth' });
    }

    deleteStockOut(id) {
        if (confirm('Are you sure you want to delete this stock out entry? This will restore the stock quantity but will NOT restore Stock In history entries.')) {
            const entry = this.stockOutHistory.find(e => e.id === id);
            if (entry) {
                // Add stock back to current stock only (don't add to Stock In history)
                if (!this.stockData[entry.productId]) {
                    this.stockData[entry.productId] = { quantity: 0, unit: entry.unit };
                }
                this.stockData[entry.productId].quantity += entry.quantity;
                this.stockData[entry.productId].unit = entry.unit;
                
                // Do NOT add back to Stock In history - keep it removed as the user requested
            }
            
            this.stockOutHistory = this.stockOutHistory.filter(e => e.id !== id);
            this.saveAllData();
            this.renderCurrentStock();
            this.renderStockOutHistory();
            this.updateOrderList();
            this.checkAlerts();
            
            if (this.editingStockOutId === id) {
                this.editingStockOutId = null;
                document.getElementById('stockOutForm').reset();
                document.getElementById('stockOutDate').value = new Date().toISOString().split('T')[0];
                document.querySelector('#stockOutForm button[type="submit"]').textContent = 'Mark as Completed';
            }
            
            this.showToast('Stock out entry deleted! Stock quantity restored. Stock In entries remain removed.', 'success');
        }
    }

    // ---- Render Methods ----
    renderCurrentStock() {
        const searchTerm = document.getElementById('stockSearch').value.toLowerCase();
        const categoryFilter = document.getElementById('stockCategoryFilter').value;
        const stockList = document.getElementById('currentStockList');
        
        let filteredProducts = [];
        Object.keys(this.products).forEach(category => {
            if (categoryFilter && categoryFilter !== category) return;
            
            this.products[category].forEach(product => {
                if (!searchTerm || product.name.toLowerCase().includes(searchTerm)) {
                    filteredProducts.push({ ...product, category });
                }
            });
        });

        if (filteredProducts.length === 0) {
            stockList.innerHTML = '<div class="empty-state">No products found</div>';
            return;
        }

        stockList.innerHTML = filteredProducts.map(product => {
            const stock = this.stockData[product.id] || { quantity: 0, unit: product.defaultUnit };
            const isLowStock = stock.quantity > 0 && stock.quantity <= product.lowStockThreshold;
            const isOutOfStock = stock.quantity <= 0;
            
            let statusClass = '';
            let quantityClass = '';
            if (isOutOfStock) {
                statusClass = 'out-of-stock';
                quantityClass = 'out';
            } else if (isLowStock) {
                statusClass = 'low-stock';
                quantityClass = 'low';
            }

            return `
                <div class="stock-item ${statusClass}">
                    <div class="stock-item-header">
                        <div>
                            <div class="stock-item-name">${escapeHtml(product.name)}</div>
                            <span class="stock-item-category">${escapeHtml(product.category)}</span>
                        </div>
                    </div>
                    <div class="stock-item-quantity ${quantityClass}">${stock.quantity.toFixed(2)}</div>
                    <div class="stock-item-unit">${stock.unit}</div>
                    ${isLowStock || isOutOfStock ? `<div style="margin-top: 10px; color: var(--${isOutOfStock ? 'danger' : 'warning'}-color); font-size: 0.9rem;">⚠️ ${isOutOfStock ? 'Out of Stock' : 'Low Stock'}</div>` : ''}
                </div>
            `;
        }).join('');

        // Update summary
        const totalProducts = filteredProducts.length;
        const lowStockCount = filteredProducts.filter(p => {
            const stock = this.stockData[p.id] || { quantity: 0 };
            return stock.quantity > 0 && stock.quantity <= p.lowStockThreshold;
        }).length;
        const outOfStockCount = filteredProducts.filter(p => {
            const stock = this.stockData[p.id] || { quantity: 0 };
            return stock.quantity <= 0;
        }).length;

        document.getElementById('totalProducts').textContent = totalProducts;
        document.getElementById('lowStockCount').textContent = lowStockCount;
        document.getElementById('outOfStockCount').textContent = outOfStockCount;
    }

    renderStockInHistory() {
        const historyList = document.getElementById('stockInHistory');
        if (!historyList) {
            console.warn('stockInHistory element not found!');
            return;
        }
        
        console.log('Rendering Stock In History, entries:', this.stockInHistory.length);
        
        if (this.stockInHistory.length === 0) {
            historyList.innerHTML = '<div class="empty-state">No stock in history</div>';
            return;
        }

        // Sort by date (newest first)
        const sorted = [...this.stockInHistory].sort((a, b) => {
            const dateA = new Date(a.date + 'T' + (a.timestamp || '00:00:00'));
            const dateB = new Date(b.date + 'T' + (b.timestamp || '00:00:00'));
            return dateB - dateA;
        });

        historyList.innerHTML = sorted.slice(0, 100).map(entry => {
            const product = this.getProductById(entry.productId);
            const date = new Date(entry.date).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
            return `
                <div class="history-item">
                    <div class="history-item-header">
                        <div>
                            <span class="history-item-product">${escapeHtml(product ? product.name : entry.productId)}</span>
                            <span class="history-item-date" style="display: block; margin-top: 5px; font-size: 0.85rem;">${date}</span>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn btn-edit" data-action="editStockIn" data-id="${entry.id}" style="padding: 6px 12px; font-size: 0.85rem;">Edit</button>
                            <button class="btn btn-delete" data-action="deleteStockIn" data-id="${entry.id}" style="padding: 6px 12px; font-size: 0.85rem;">Delete</button>
                        </div>
                    </div>
                    <div class="history-item-details" style="flex-direction: column; gap: 5px;">
                        <span><strong>Quantity:</strong> ${entry.quantity} ${entry.unit}</span>
                        ${entry.notes ? `<span><strong>Notes:</strong> ${escapeHtml(entry.notes)}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderStockOutHistory() {
        const historyList = document.getElementById('stockOutHistory');
        if (!historyList) {
            console.log('Stock out history element not found');
            return;
        }
        
        console.log('Stock out history count:', this.stockOutHistory.length);
        
        if (this.stockOutHistory.length === 0) {
            historyList.innerHTML = '<div class="empty-state">No stock out history yet.<br><br>To mark a product as completed:<br>1. First add stock in "Stock In" tab<br>2. Then mark it as completed here</div>';
            return;
        }

        // Sort by date (newest first)
        const sorted = [...this.stockOutHistory].sort((a, b) => {
            const dateA = new Date(a.date + 'T' + (a.timestamp || '00:00:00'));
            const dateB = new Date(b.date + 'T' + (b.timestamp || '00:00:00'));
            return dateB - dateA;
        });

        historyList.innerHTML = sorted.slice(0, 100).map(entry => {
            const product = this.getProductById(entry.productId);
            const date = new Date(entry.date).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
            return `
                <div class="history-item">
                    <div class="history-item-header">
                        <div>
                            <span class="history-item-product">${escapeHtml(product ? product.name : entry.productId)}</span>
                            <span class="history-item-date" style="display: block; margin-top: 5px; font-size: 0.85rem;">${date}</span>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn btn-edit" data-action="editStockOut" data-id="${entry.id}" style="padding: 6px 12px; font-size: 0.85rem;">Edit</button>
                            <button class="btn btn-delete" data-action="deleteStockOut" data-id="${entry.id}" style="padding: 6px 12px; font-size: 0.85rem;">Delete</button>
                        </div>
                    </div>
                    <div class="history-item-details" style="flex-direction: column; gap: 5px;">
                        <span><strong>Completed:</strong> ${entry.quantity} ${entry.unit}</span>
                        ${entry.notes ? `<span><strong>Notes:</strong> ${escapeHtml(entry.notes)}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderDailyUsage() {
        const historyList = document.getElementById('dailyUsageHistory');
        if (!historyList) {
            console.warn('dailyUsageHistory element not found!');
            return;
        }
        
        console.log('Rendering Daily Usage, entries:', this.dailyUsage.length);
        
        if (this.dailyUsage.length === 0) {
            historyList.innerHTML = '<div class="empty-state">No daily usage recorded. Start tracking your daily shakes and customers!</div>';
            return;
        }

        // Sort by date (newest first)
        const sorted = [...this.dailyUsage].sort((a, b) => {
            const dateA = new Date(a.date + 'T' + (a.timestamp || '00:00:00'));
            const dateB = new Date(b.date + 'T' + (b.timestamp || '00:00:00'));
            return dateB - dateA;
        });

        historyList.innerHTML = sorted.slice(0, 100).map(entry => {
            const dateFormatted = new Date(entry.date).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
            
            // Handle backward compatibility - old entries without type are treated as product usage
            if (entry.type === 'summary') {
                // Daily Summary Entry
                const weightGain = entry.weightGainShakes || 0;
                const weightLoss = entry.weightLossShakes || 0;
                const totalCustomers = entry.totalCustomers || 0;
                const totalShakes = weightGain + weightLoss;
                
                return `
                    <div class="history-item">
                        <div class="history-item-header">
                            <div>
                                <span class="history-item-product" style="font-size: 1.1rem; font-weight: 600;">📅 ${dateFormatted} - Daily Summary</span>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button class="btn btn-edit" data-action="editDailyUsage" data-id="${entry.id}" style="padding: 6px 12px; font-size: 0.85rem;">Edit</button>
                                <button class="btn btn-delete" data-action="deleteDailyUsage" data-id="${entry.id}" style="padding: 6px 12px; font-size: 0.85rem;">Delete</button>
                            </div>
                        </div>
                        <div class="history-item-details" style="flex-direction: column; gap: 8px; margin-top: 10px;">
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                                <div style="padding: 12px; background: var(--bg-color); border-radius: 8px;">
                                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 5px;">Weight Gain Shakes</div>
                                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary-color);">${weightGain}</div>
                                </div>
                                <div style="padding: 12px; background: var(--bg-color); border-radius: 8px;">
                                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 5px;">Weight Loss Shakes</div>
                                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--secondary-color);">${weightLoss}</div>
                                </div>
                                <div style="padding: 12px; background: var(--bg-color); border-radius: 8px;">
                                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 5px;">Total Customers</div>
                                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--success-color);">${totalCustomers}</div>
                                </div>
                                <div style="padding: 12px; background: var(--bg-color); border-radius: 8px;">
                                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 5px;">Total Shakes</div>
                                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary);">${totalShakes}</div>
                                </div>
                            </div>
                            ${entry.notes ? `<div style="margin-top: 10px; padding: 8px; background: var(--bg-color); border-radius: 6px; font-size: 0.9rem;"><strong>Notes:</strong> ${escapeHtml(entry.notes)}</div>` : ''}
                        </div>
                    </div>
                `;
            } else {
                // Product Usage Entry (or old entries without type)
                const product = entry.productId ? this.getProductById(entry.productId) : null;
                if (!entry.productId || !entry.quantity) {
                    // Skip invalid entries
                    return '';
                }
                return `
                    <div class="history-item">
                        <div class="history-item-header">
                            <div>
                                <span class="history-item-product">${escapeHtml(product ? product.name : entry.productId)}</span>
                                <span class="history-item-date" style="display: block; margin-top: 5px; font-size: 0.85rem;">${dateFormatted}</span>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button class="btn btn-edit" data-action="editDailyUsage" data-id="${entry.id}" style="padding: 6px 12px; font-size: 0.85rem;">Edit</button>
                                <button class="btn btn-delete" data-action="deleteDailyUsage" data-id="${entry.id}" style="padding: 6px 12px; font-size: 0.85rem;">Delete</button>
                            </div>
                        </div>
                        <div class="history-item-details" style="flex-direction: column; gap: 5px;">
                            <span><strong>Quantity Used:</strong> ${entry.quantity} ${entry.unit}</span>
                        </div>
                    </div>
                `;
            }
        }).join('');
    }

    updateOrderList() {
        const orderList = document.getElementById('orderList');
        const productsToOrder = [];

        Object.keys(this.products).forEach(category => {
            this.products[category].forEach(product => {
                const stock = this.stockData[product.id] || { quantity: 0 };
                if (stock.quantity <= product.lowStockThreshold) {
                    productsToOrder.push({
                        product,
                        stock: stock.quantity,
                        threshold: product.lowStockThreshold,
                        priority: stock.quantity <= 0 ? 'high' : 'medium'
                    });
                }
            });
        });

        if (productsToOrder.length === 0) {
            orderList.innerHTML = '<div class="empty-state">All products are well stocked! 🎉</div>';
            return;
        }

        orderList.innerHTML = productsToOrder.map(item => `
            <div class="order-item">
                <div class="order-item-info">
                    <div class="order-item-name">${escapeHtml(item.product.name)}</div>
                    <div class="order-item-reason">
                        Current: ${item.stock.toFixed(2)} ${item.stock.quantity <= 0 ? ' (Out of Stock)' : ` (Low Stock - Threshold: ${item.threshold})`}
                    </div>
                </div>
                <span class="order-item-priority ${item.priority}">${item.priority.toUpperCase()}</span>
            </div>
        `).join('');
    }

    checkAlerts() {
        const alertsContainer = document.getElementById('inventoryAlerts');
        const alerts = [];

        Object.keys(this.products).forEach(category => {
            this.products[category].forEach(product => {
                const stock = this.stockData[product.id] || { quantity: 0 };
                if (stock.quantity <= 0) {
                    alerts.push(`⚠️ ${product.name} is out of stock!`);
                } else if (stock.quantity <= product.lowStockThreshold) {
                    alerts.push(`⚠️ ${product.name} is running low (${stock.quantity.toFixed(2)} ${stock.unit} left)`);
                }
            });
        });

        if (alerts.length === 0) {
            alertsContainer.innerHTML = '';
            return;
        }

        alertsContainer.innerHTML = alerts.slice(0, 5).map(alert => 
            `<div class="alert-item">${escapeHtml(alert)}</div>`
        ).join('');
    }

    // ---- Export / Backup / Restore ----
    exportOrderList() {
        const productsToOrder = [];
        Object.keys(this.products).forEach(category => {
            this.products[category].forEach(product => {
                const stock = this.stockData[product.id] || { quantity: 0 };
                if (stock.quantity <= product.lowStockThreshold) {
                    productsToOrder.push({
                        name: product.name,
                        category: category,
                        currentStock: stock.quantity,
                        unit: stock.unit,
                        threshold: product.lowStockThreshold,
                        priority: stock.quantity <= 0 ? 'High' : 'Medium'
                    });
                }
            });
        });

        if (productsToOrder.length === 0) {
            this.showToast('No products need to be ordered!', 'info');
            return;
        }

        if (typeof XLSX === 'undefined') {
            this.showToast('Excel library not loaded. Please refresh the page.', 'error');
            return;
        }

        const headers = ['Product Name', 'Category', 'Current Stock', 'Unit', 'Threshold', 'Priority'];
        const rows = productsToOrder.map(item => [
            item.name,
            item.category,
            item.currentStock.toFixed(2),
            item.unit,
            item.threshold,
            item.priority
        ]);

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        ws['!cols'] = [
            { wch: 40 }, { wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 10 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Order List');
        XLSX.writeFile(wb, `order-list-${new Date().toISOString().split('T')[0]}.xlsx`);
    }

    showToast(message, type = 'success') {
        // Remove existing toast if any
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) {
            existingToast.remove();
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.textContent = message;
        
        // Add to body
        document.body.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

    // Method to add stock from expense (called from expense tracker)
    addStockFromExpense(productName, quantity, unit, date) {
        // Try to find matching product
        let productId = null;
        Object.keys(this.products).forEach(category => {
            const found = this.products[category].find(p => 
                p.name.toLowerCase().includes(productName.toLowerCase()) ||
                productName.toLowerCase().includes(p.name.toLowerCase())
            );
            if (found) {
                productId = found.id;
            }
        });

        if (productId) {
            if (!this.stockData[productId]) {
                this.stockData[productId] = { quantity: 0, unit: unit };
            }
            this.stockData[productId].quantity += quantity;
            this.stockData[productId].unit = unit;

            this.stockInHistory.unshift({
                id: generateId(),
                productId,
                quantity,
                unit,
                date,
                notes: 'Added from expense',
                timestamp: new Date().toISOString()
            });

            this.saveAllData();
            this.renderCurrentStock();
            this.renderStockInHistory();
            this.updateOrderList();
            this.checkAlerts();
        }
    }

    backupInventoryData() {
        const data = {
            stockData: this.stockData,
            stockInHistory: this.stockInHistory,
            stockOutHistory: this.stockOutHistory,
            dailyUsage: this.dailyUsage,
            timestamp: new Date().toISOString(),
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventory-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('Inventory data backed up successfully!', 'success');
    }

    restoreInventoryData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (confirm('This will replace all current inventory data. Continue?')) {
                    if (data.stockData) this.stockData = data.stockData;
                    if (data.stockInHistory) this.stockInHistory = data.stockInHistory;
                    if (data.stockOutHistory) this.stockOutHistory = data.stockOutHistory;
                    if (data.dailyUsage) this.dailyUsage = data.dailyUsage;

                    this.saveAllData();

                    this.renderCurrentStock();
                    this.renderStockInHistory();
                    this.renderStockOutHistory();
                    this.renderDailyUsage();
                    this.updateOrderList();
                    this.checkAlerts();

                    this.showToast('Inventory data restored successfully!', 'success');
                }
            } catch (error) {
                this.showToast('Error reading backup file: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset file input
    }

    // ---- Data Diagnostics & Recovery ----
    checkInventoryData() {
        // Check what's in localStorage
        const stockData = localStorage.getItem('inventoryStock');
        const stockIn = localStorage.getItem('inventoryStockIn');
        const stockOut = localStorage.getItem('inventoryStockOut');
        const dailyUsage = localStorage.getItem('inventoryDailyUsage');
        
        // Also check for data under OLD keys (in case keys changed)
        const allKeys = Object.keys(localStorage);
        const inventoryKeys = allKeys.filter(key => 
            key.toLowerCase().includes('inventory') || 
            key.toLowerCase().includes('stock') || 
            key.toLowerCase().includes('usage')
        );
        
        console.log('=== All Inventory-Related Keys in localStorage ===');
        console.log(inventoryKeys);
        inventoryKeys.forEach(key => {
            try {
                const data = localStorage.getItem(key);
                if (data) {
                    const parsed = JSON.parse(data);
                    console.log(`Key: ${key}`, Array.isArray(parsed) ? `Array with ${parsed.length} items` : `Object with ${Object.keys(parsed).length} keys`);
                }
            } catch (e) {
                console.log(`Key: ${key} - Not JSON`);
            }
        });

        let message = '📊 Inventory Data Status:\n\n';
        
        if (stockData) {
            try {
                const parsed = JSON.parse(stockData);
                const productCount = Object.keys(parsed).length;
                message += `✅ Current Stock: ${productCount} products found\n`;
            } catch (e) {
                message += `❌ Current Stock: Data corrupted\n`;
            }
        } else {
            message += `⚠️ Current Stock: No data found\n`;
        }

        if (stockIn) {
            try {
                const parsed = JSON.parse(stockIn);
                message += `✅ Stock In History: ${parsed.length} entries\n`;
            } catch (e) {
                message += `❌ Stock In History: Data corrupted\n`;
            }
        } else {
            message += `⚠️ Stock In History: No data found\n`;
        }

        if (stockOut) {
            try {
                const parsed = JSON.parse(stockOut);
                message += `✅ Stock Out History: ${parsed.length} entries\n`;
            } catch (e) {
                message += `❌ Stock Out History: Data corrupted\n`;
            }
        } else {
            message += `⚠️ Stock Out History: No data found\n`;
        }

        if (dailyUsage) {
            try {
                const parsed = JSON.parse(dailyUsage);
                message += `✅ Daily Usage: ${parsed.length} entries\n`;
            } catch (e) {
                message += `❌ Daily Usage: Data corrupted\n`;
            }
        } else {
            message += `⚠️ Daily Usage: No data found\n`;
        }

        message += '\n💡 Tip: If data exists but you can\'t see it, try refreshing the page.';
        
        // Show detailed info in console and alert
        console.log('=== Inventory Data Check ===');
        console.log('Stock Data:', stockData ? JSON.parse(stockData) : 'None');
        console.log('Stock In History:', stockIn ? JSON.parse(stockIn) : 'None');
        console.log('Stock Out History:', stockOut ? JSON.parse(stockOut) : 'None');
        console.log('Daily Usage:', dailyUsage ? JSON.parse(dailyUsage) : 'None');
        
        alert(message);
        
        // Try to recover data from old keys if current keys are empty
        if (!stockData && !stockIn && !stockOut && !dailyUsage && inventoryKeys.length > 0) {
            const recoverChoice = confirm('No data found under current keys, but found potential data under other keys!\n\nWould you like to try recovering your data?\n\nThis will check all localStorage keys and try to restore your inventory data.');
            if (recoverChoice) {
                this.recoverInventoryData(inventoryKeys);
                return;
            }
        }
        
        // Try to reload and render if data exists
        if (stockData || stockIn || stockOut || dailyUsage) {
            const reloadChoice = confirm('Data found in storage! Would you like to reload the page to refresh the display?\n\nClick OK to reload, or Cancel to try refreshing the display without reloading.');
            if (reloadChoice) {
                location.reload();
            } else {
                // Force refresh without reload
                this.forceRefreshDisplay();
            }
        }
    }
    
    recoverInventoryData(inventoryKeys) {
        console.log('=== Attempting Data Recovery ===');
        let recovered = false;
        
        inventoryKeys.forEach(key => {
            try {
                const data = localStorage.getItem(key);
                if (!data) return;
                
                const parsed = JSON.parse(data);
                
                // Try to identify what type of data this is
                if (Array.isArray(parsed)) {
                    // Could be stockInHistory, stockOutHistory, or dailyUsage
                    if (parsed.length > 0) {
                        const firstItem = parsed[0];
                        
                        // Check if it looks like Stock In History
                        if (firstItem.productId && firstItem.quantity && firstItem.date && !firstItem.type) {
                            console.log(`Found potential Stock In History in key: ${key} with ${parsed.length} entries`);
                            if (this.stockInHistory.length === 0) {
                                this.stockInHistory = parsed;
                                this.saveStockInHistory();
                                recovered = true;
                                console.log('Recovered Stock In History!');
                            }
                        }
                        // Check if it looks like Daily Usage
                        else if (firstItem.type === 'summary' || firstItem.type === 'product' || (firstItem.productId && firstItem.quantity)) {
                            console.log(`Found potential Daily Usage in key: ${key} with ${parsed.length} entries`);
                            if (this.dailyUsage.length === 0) {
                                this.dailyUsage = parsed;
                                this.saveDailyUsage();
                                recovered = true;
                                console.log('Recovered Daily Usage!');
                            }
                        }
                    }
                } else if (typeof parsed === 'object') {
                    // Could be stockData
                    const keys = Object.keys(parsed);
                    if (keys.length > 0 && parsed[keys[0]].quantity !== undefined) {
                        console.log(`Found potential Stock Data in key: ${key} with ${keys.length} products`);
                        if (Object.keys(this.stockData).length === 0 || Object.keys(this.stockData).length < keys.length) {
                            // Merge with existing or replace if empty
                            Object.keys(parsed).forEach(productId => {
                                if (!this.stockData[productId] || this.stockData[productId].quantity === 0) {
                                    this.stockData[productId] = parsed[productId];
                                }
                            });
                            this.saveStockData();
                            recovered = true;
                            console.log('Recovered Stock Data!');
                        }
                    }
                }
            } catch (e) {
                console.log(`Could not parse key ${key}:`, e);
            }
        });
        
        if (recovered) {
            this.forceRefreshDisplay();
            this.showToast('Data recovered successfully! Your inventory data has been restored.', 'success');
        } else {
            this.showToast('Could not recover data automatically. Please check the browser console (F12) for details.', 'error');
        }
    }

    forceRefreshDisplay() {
        console.log('=== Force Refreshing Display ===');
        console.log('Before refresh - Stock In History length:', this.stockInHistory.length);
        console.log('Before refresh - Stock Data keys:', Object.keys(this.stockData).length);
        console.log('Before refresh - Daily Usage length:', this.dailyUsage.length);
        
        // Reload data from localStorage
        this.stockData = this.loadStockData();
        this.stockInHistory = this.loadStockInHistory();
        this.stockOutHistory = this.loadStockOutHistory();
        this.dailyUsage = this.loadDailyUsage();
        
        console.log('After refresh - Stock In History length:', this.stockInHistory.length);
        console.log('After refresh - Stock Data keys:', Object.keys(this.stockData).length);
        console.log('After refresh - Daily Usage length:', this.dailyUsage.length);
        console.log('Sample Stock Data:', Object.keys(this.stockData).slice(0, 5));
        console.log('Sample Stock In History:', this.stockInHistory.slice(0, 3));
        
        // Check if DOM elements exist
        const currentStockList = document.getElementById('currentStockList');
        const stockInHistory = document.getElementById('stockInHistory');
        const stockOutHistory = document.getElementById('stockOutHistory');
        const dailyUsageHistory = document.getElementById('dailyUsageHistory');
        
        console.log('DOM Elements check:');
        console.log('- currentStockList:', currentStockList ? 'Found' : 'NOT FOUND');
        console.log('- stockInHistory:', stockInHistory ? 'Found' : 'NOT FOUND');
        console.log('- stockOutHistory:', stockOutHistory ? 'Found' : 'NOT FOUND');
        console.log('- dailyUsageHistory:', dailyUsageHistory ? 'Found' : 'NOT FOUND');
        
        // Make sure we're on the inventory tab
        const inventorySection = document.getElementById('inventorySection');
        if (inventorySection && !inventorySection.classList.contains('active')) {
            console.log('Switching to inventory tab...');
            this.switchTab('inventory');
        }
        
        // Wait a bit for DOM to be ready, then render
        setTimeout(() => {
            try {
                // Clear any filters that might be hiding data
                const searchInput = document.getElementById('stockSearch');
                const categoryFilter = document.getElementById('stockCategoryFilter');
                if (searchInput) searchInput.value = '';
                if (categoryFilter) categoryFilter.value = '';
                
                // Re-render everything
                console.log('Rendering Current Stock...');
                this.renderCurrentStock();
                
                console.log('Rendering Stock In History...');
                this.renderStockInHistory();
                
                console.log('Rendering Stock Out History...');
                this.renderStockOutHistory();
                
                console.log('Rendering Daily Usage...');
                this.renderDailyUsage();
                
                console.log('Updating Order List...');
                this.updateOrderList();
                
                console.log('Checking Alerts...');
                this.checkAlerts();
                
                const message = `Display refreshed! Found ${this.stockInHistory.length} Stock In entries, ${this.dailyUsage.length} Daily Usage entries, ${Object.keys(this.stockData).length} products with stock.`;
                console.log(message);
                this.showToast(message, 'success');
                
                // Switch to Stock In tab to show the data
                setTimeout(() => {
                    this.switchInventoryTab('stockIn');
                }, 500);
                
            } catch (error) {
                console.error('Error during force refresh:', error);
                this.showToast('Error refreshing display: ' + error.message, 'error');
            }
        }, 100);
    }
}

// Initialize inventory manager
let inventoryManager;
document.addEventListener('DOMContentLoaded', () => {
    inventoryManager = new InventoryManager();
});

