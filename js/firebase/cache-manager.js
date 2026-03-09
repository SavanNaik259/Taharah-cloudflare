/**
 * Cache Manager Module - Hybrid Sync/Async for Admin Dashboard
 * 
 * Synchronous methods for instant admin panel use
 * Async methods for background IndexedDB operations
 */

const CacheManager = {
    config: {
        enableLogging: true,
        defaultTTL: 365 * 24 * 60 * 60 * 1000, // 1 year
    },

    _memoryCache: {},

    /**
     * SYNCHRONOUS - Set cache immediately (uses localStorage)
     * For instant admin panel use - NO AWAIT NEEDED
     */
    set(key, data, ttl = this.config.defaultTTL) {
        try {
            const cacheEntry = {
                data,
                timestamp: Date.now(),
                ttl,
                expiresAt: Date.now() + ttl
            };
            localStorage.setItem(`cache_${key}`, JSON.stringify(cacheEntry));
            this.log(`✅ Cache set: ${key} (localStorage, expires in ${Math.round(ttl / (24 * 60 * 60 * 1000))}d)`);
            return true;
        } catch (error) {
            try {
                this._memoryCache[`cache_${key}`] = { data, timestamp: Date.now(), ttl, expiresAt: Date.now() + ttl };
                this.log(`⚠️ Cache fallback to memory: ${key}`);
                return true;
            } catch (err) {
                return false;
            }
        }
    },

    /**
     * SYNCHRONOUS - Get cache immediately (uses localStorage)
     * For instant admin panel use - NO AWAIT NEEDED
     */
    get(key) {
        try {
            let cached = localStorage.getItem(`cache_${key}`);
            if (!cached) {
                cached = this._memoryCache[`cache_${key}`];
                if (cached) cached = JSON.stringify(cached);
            }

            if (!cached) {
                this.log(`Cache miss: ${key}`);
                return null;
            }

            const cacheEntry = typeof cached === 'string' ? JSON.parse(cached) : cached;
            if (Date.now() > cacheEntry.expiresAt) {
                this.log(`Cache expired: ${key}`);
                this.remove(key);
                return null;
            }

            const ageDays = Math.round((Date.now() - cacheEntry.timestamp) / (24 * 60 * 60 * 1000));
            this.log(`✅ Cache hit: ${key} (age: ${ageDays}d)`);
            return cacheEntry.data;
        } catch (error) {
            console.error(`Cache get error for ${key}:`, error);
            return null;
        }
    },

    /**
     * SYNCHRONOUS - Remove cache
     */
    remove(key) {
        try {
            localStorage.removeItem(`cache_${key}`);
            delete this._memoryCache[`cache_${key}`];
        } catch (error) {
            console.error(`Cache remove error for ${key}:`, error);
        }
    },

    /**
     * SYNCHRONOUS - Check if cache exists and is valid
     */
    isValid(key) {
        try {
            let cached = localStorage.getItem(`cache_${key}`);
            if (!cached) {
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
     * SYNCHRONOUS - Get cache status
     */
    getStatus(key) {
        try {
            let cached = localStorage.getItem(`cache_${key}`);
            if (!cached) return { exists: false, valid: false };
            const cacheEntry = JSON.parse(cached);
            const isValid = Date.now() <= cacheEntry.expiresAt;
            return {
                exists: true,
                valid: isValid,
                ageSeconds: Math.round((Date.now() - cacheEntry.timestamp) / 1000),
                expiresInSeconds: Math.round((cacheEntry.expiresAt - Date.now()) / 1000)
            };
        } catch (error) {
            return { exists: false, valid: false };
        }
    },

    /**
     * SYNCHRONOUS - Clear all caches
     */
    clearAll() {
        try {
            const keys = Object.keys(localStorage);
            let cleared = 0;
            keys.forEach(key => {
                if (key.startsWith('cache_')) {
                    localStorage.removeItem(key);
                    cleared++;
                }
            });
            Object.keys(this._memoryCache).forEach(key => {
                if (key.startsWith('cache_')) {
                    delete this._memoryCache[key];
                    cleared++;
                }
            });
            this.log(`✅ Cleared ${cleared} cache entries`);
        } catch (error) {
            console.error('Cache clear error:', error);
        }
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
console.log('✅ Cache Manager initialized (sync/localStorage mode)');
