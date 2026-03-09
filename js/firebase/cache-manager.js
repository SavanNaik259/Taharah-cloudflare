/**
 * Cache Manager Module - Enhanced with IndexedDB Support
 * 
 * Handles client-side caching for Firebase data with expiration support.
 * Allows displaying cached data immediately while fetching fresh data in background.
 * Supports multiple storage backends in order of preference:
 * 1. localStorage (persistent across sessions)
 * 2. IndexedDB (persistent, larger capacity)
 * 3. sessionStorage (session-only)
 * 4. in-memory fallback (Cloudflare Pages)
 */

const CacheManager = {
    // Configuration
    config: {
        enableLogging: true,
        defaultTTL: 365 * 24 * 60 * 60 * 1000, // 1 year default
        dbName: 'TaharahCache',
        dbVersion: 1,
        storeName: 'cache_store'
    },

    // In-memory fallback cache for restricted environments
    _memoryCache: {},

    // Storage backend detection
    _storageBackend: null,
    _db: null,
    _dbInitialized: false,

    /**
     * Initialize IndexedDB for persistent caching
     */
    async _initIndexedDB() {
        if (this._dbInitialized) return this._db;

        return new Promise((resolve) => {
            try {
                const request = indexedDB.open(this.config.dbName, this.config.dbVersion);

                request.onerror = () => {
                    this.log('⚠️ IndexedDB initialization failed');
                    this._db = null;
                    this._dbInitialized = true;
                    resolve(null);
                };

                request.onsuccess = () => {
                    this._db = request.result;
                    this._dbInitialized = true;
                    this.log('✅ IndexedDB initialized successfully');
                    resolve(this._db);
                };

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains(this.config.storeName)) {
                        db.createObjectStore(this.config.storeName);
                        this.log('✅ IndexedDB object store created');
                    }
                };
            } catch (error) {
                this.log('⚠️ IndexedDB not available');
                this._dbInitialized = true;
                resolve(null);
            }
        });
    },

    /**
     * Initialize and detect available storage backend
     */
    async _initStorageBackend() {
        if (this._storageBackend) return;

        // Try localStorage first (most reliable)
        try {
            const testKey = '__cachemanager_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            this._storageBackend = 'localStorage';
            this.log('✅ Using localStorage backend');
            return;
        } catch (e) {
            this.log('⚠️ localStorage unavailable, trying IndexedDB...');
        }

        // Try IndexedDB (better for large data)
        try {
            const db = await this._initIndexedDB();
            if (db) {
                this._storageBackend = 'indexeddb';
                this.log('✅ Using IndexedDB backend (persistent, Cloudflare-compatible)');
                return;
            }
        } catch (e) {
            this.log('⚠️ IndexedDB unavailable, trying sessionStorage...');
        }

        // Try sessionStorage as fallback
        try {
            const testKey = '__cachemanager_test__';
            sessionStorage.setItem(testKey, 'test');
            sessionStorage.removeItem(testKey);
            this._storageBackend = 'sessionStorage';
            this.log('✅ Using sessionStorage backend');
            return;
        } catch (e) {
            this.log('⚠️ sessionStorage unavailable, using in-memory backend');
        }

        // Fall back to memory cache
        this._storageBackend = 'memory';
        this.log('✅ Using in-memory cache backend');
    },

    /**
     * Set cache with expiration
     * @param {String} key - Cache key
     * @param {*} data - Data to cache
     * @param {Number} ttl - Time to live in milliseconds (optional)
     */
    async set(key, data, ttl = this.config.defaultTTL) {
        try {
            if (!this._storageBackend) await this._initStorageBackend();

            const cacheEntry = {
                data,
                timestamp: Date.now(),
                ttl,
                expiresAt: Date.now() + ttl
            };

            const cacheString = JSON.stringify(cacheEntry);

            if (this._storageBackend === 'localStorage') {
                localStorage.setItem(`cache_${key}`, cacheString);
            } else if (this._storageBackend === 'indexeddb') {
                await this._setIndexedDB(key, cacheEntry);
            } else if (this._storageBackend === 'sessionStorage') {
                sessionStorage.setItem(`cache_${key}`, cacheString);
            } else {
                // In-memory cache
                this._memoryCache[`cache_${key}`] = cacheEntry;
            }

            const expiresInDays = Math.round(ttl / (24 * 60 * 60 * 1000));
            this.log(`✅ Cache set for key: ${key} (${this._storageBackend}, expires in ${expiresInDays} days)`);
            return true;
        } catch (error) {
            console.error(`Error setting cache for key ${key}:`, error);
            // Fallback to memory cache
            try {
                this._memoryCache[`cache_${key}`] = {
                    data,
                    timestamp: Date.now(),
                    ttl,
                    expiresAt: Date.now() + ttl
                };
                this.log(`⚠️ Fell back to in-memory cache for key: ${key}`);
                return true;
            } catch (memErr) {
                return false;
            }
        }
    },

    /**
     * Set data in IndexedDB
     * @private
     */
    async _setIndexedDB(key, cacheEntry) {
        if (!this._db) return;

        return new Promise((resolve, reject) => {
            try {
                const transaction = this._db.transaction([this.config.storeName], 'readwrite');
                const store = transaction.objectStore(this.config.storeName);
                const request = store.put(cacheEntry, `cache_${key}`);

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    },

    /**
     * Get cache if valid
     * @param {String} key - Cache key
     * @returns {Promise<Object|null>} Cached data or null if expired/not found
     */
    async get(key) {
        try {
            if (!this._storageBackend) await this._initStorageBackend();

            let cached = null;

            if (this._storageBackend === 'localStorage') {
                cached = localStorage.getItem(`cache_${key}`);
            } else if (this._storageBackend === 'indexeddb') {
                cached = await this._getIndexedDB(key);
            } else if (this._storageBackend === 'sessionStorage') {
                cached = sessionStorage.getItem(`cache_${key}`);
            } else {
                // In-memory cache
                cached = this._memoryCache[`cache_${key}`];
                if (cached) cached = JSON.stringify(cached);
            }

            if (!cached) {
                this.log(`Cache miss for key: ${key}`);
                return null;
            }

            const cacheEntry = typeof cached === 'string' ? JSON.parse(cached) : cached;
            const now = Date.now();

            // Check if cache has expired
            if (now > cacheEntry.expiresAt) {
                this.log(`Cache expired for key: ${key}`);
                await this.remove(key);
                return null;
            }

            const ageMs = now - cacheEntry.timestamp;
            const ageDays = Math.round(ageMs / (24 * 60 * 60 * 1000));
            this.log(`✅ Cache hit for key: ${key} (${this._storageBackend}, age: ${ageDays}d)`);
            return cacheEntry.data;
        } catch (error) {
            console.error(`Error getting cache for key ${key}:`, error);
            return null;
        }
    },

    /**
     * Get data from IndexedDB
     * @private
     */
    async _getIndexedDB(key) {
        if (!this._db) return null;

        return new Promise((resolve) => {
            try {
                const transaction = this._db.transaction([this.config.storeName], 'readonly');
                const store = transaction.objectStore(this.config.storeName);
                const request = store.get(`cache_${key}`);

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => resolve(null);
            } catch (error) {
                resolve(null);
            }
        });
    },

    /**
     * Check if cache exists and is valid
     * @param {String} key - Cache key
     * @returns {Promise<Boolean>} True if cache exists and is valid
     */
    async isValid(key) {
        try {
            if (!this._storageBackend) await this._initStorageBackend();

            let cached = null;

            if (this._storageBackend === 'localStorage') {
                cached = localStorage.getItem(`cache_${key}`);
            } else if (this._storageBackend === 'indexeddb') {
                cached = await this._getIndexedDB(key);
            } else if (this._storageBackend === 'sessionStorage') {
                cached = sessionStorage.getItem(`cache_${key}`);
            } else {
                cached = this._memoryCache[`cache_${key}`];
                if (cached) cached = JSON.stringify(cached);
            }

            if (!cached) return false;

            const cacheEntry = typeof cached === 'string' ? JSON.parse(cached) : cached;
            return Date.now() <= cacheEntry.expiresAt;
        } catch (error) {
            return false;
        }
    },

    /**
     * Get cache status info
     * @param {String} key - Cache key
     * @returns {Promise<Object>} Cache status information
     */
    async getStatus(key) {
        try {
            if (!this._storageBackend) await this._initStorageBackend();

            let cached = null;

            if (this._storageBackend === 'localStorage') {
                cached = localStorage.getItem(`cache_${key}`);
            } else if (this._storageBackend === 'indexeddb') {
                cached = await this._getIndexedDB(key);
            } else if (this._storageBackend === 'sessionStorage') {
                cached = sessionStorage.getItem(`cache_${key}`);
            } else {
                cached = this._memoryCache[`cache_${key}`];
                if (cached) cached = JSON.stringify(cached);
            }

            if (!cached) {
                return { exists: false, valid: false, backend: this._storageBackend };
            }

            const cacheEntry = typeof cached === 'string' ? JSON.parse(cached) : cached;
            const now = Date.now();
            const isValid = now <= cacheEntry.expiresAt;
            const ageSeconds = Math.round((now - cacheEntry.timestamp) / 1000);
            const expiresInSeconds = Math.round((cacheEntry.expiresAt - now) / 1000);

            return {
                exists: true,
                valid: isValid,
                ageSeconds,
                expiresInSeconds,
                timestamp: cacheEntry.timestamp,
                backend: this._storageBackend
            };
        } catch (error) {
            return { exists: false, valid: false };
        }
    },

    /**
     * Remove cache
     * @param {String} key - Cache key
     */
    async remove(key) {
        try {
            if (!this._storageBackend) await this._initStorageBackend();

            if (this._storageBackend === 'localStorage') {
                localStorage.removeItem(`cache_${key}`);
            } else if (this._storageBackend === 'indexeddb') {
                await this._removeIndexedDB(key);
            } else if (this._storageBackend === 'sessionStorage') {
                sessionStorage.removeItem(`cache_${key}`);
            } else {
                delete this._memoryCache[`cache_${key}`];
            }

            this.log(`Cache removed for key: ${key}`);
        } catch (error) {
            console.error(`Error removing cache for key ${key}:`, error);
        }
    },

    /**
     * Remove data from IndexedDB
     * @private
     */
    async _removeIndexedDB(key) {
        if (!this._db) return;

        return new Promise((resolve, reject) => {
            try {
                const transaction = this._db.transaction([this.config.storeName], 'readwrite');
                const store = transaction.objectStore(this.config.storeName);
                const request = store.delete(`cache_${key}`);

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    },

    /**
     * Clear all application caches
     */
    async clearAll() {
        try {
            if (!this._storageBackend) await this._initStorageBackend();

            let cleared = 0;

            if (this._storageBackend === 'localStorage') {
                const keys = Object.keys(localStorage);
                keys.forEach(key => {
                    if (key.startsWith('cache_')) {
                        localStorage.removeItem(key);
                        cleared++;
                    }
                });
            } else if (this._storageBackend === 'indexeddb') {
                cleared = await this._clearIndexedDB();
            } else if (this._storageBackend === 'sessionStorage') {
                const keys = Object.keys(sessionStorage);
                keys.forEach(key => {
                    if (key.startsWith('cache_')) {
                        sessionStorage.removeItem(key);
                        cleared++;
                    }
                });
            } else {
                Object.keys(this._memoryCache).forEach(key => {
                    if (key.startsWith('cache_')) {
                        delete this._memoryCache[key];
                        cleared++;
                    }
                });
            }

            this.log(`✅ Cleared ${cleared} cache entries from ${this._storageBackend}`);
        } catch (error) {
            console.error('Error clearing cache:', error);
        }
    },

    /**
     * Clear all IndexedDB cache entries
     * @private
     */
    async _clearIndexedDB() {
        if (!this._db) return 0;

        return new Promise((resolve) => {
            try {
                const transaction = this._db.transaction([this.config.storeName], 'readwrite');
                const store = transaction.objectStore(this.config.storeName);
                const request = store.clear();

                request.onsuccess = () => resolve(0);
                request.onerror = () => resolve(0);
            } catch (error) {
                resolve(0);
            }
        });
    },

    /**
     * Get storage backend info for debugging
     */
    async getBackendInfo() {
        if (!this._storageBackend) await this._initStorageBackend();
        return {
            backend: this._storageBackend,
            memoryCacheSize: Object.keys(this._memoryCache).length,
            dbInitialized: this._dbInitialized && this._db !== null
        };
    },

    /**
     * Internal logging
     */
    log(message) {
        if (this.config.enableLogging) {
            console.log(`[CacheManager] ${message}`);
        }
    }
};

// Expose globally
window.CacheManager = CacheManager;
console.log('Cache Manager module loaded');
