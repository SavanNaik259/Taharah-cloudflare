/**
 * Cache Manager Module
 * 
 * Handles client-side caching for Firebase data with expiration support.
 * Allows displaying cached data immediately while fetching fresh data in background.
 */

const CacheManager = {
    // Configuration
    config: {
        enableLogging: true,
        defaultTTL: 5 * 60 * 1000, // 5 minutes default
    },

    /**
     * Set cache with expiration
     * @param {String} key - Cache key
     * @param {*} data - Data to cache
     * @param {Number} ttl - Time to live in milliseconds (optional)
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
            this.log(`Cache set for key: ${key}, expires in ${ttl}ms`);
            return true;
        } catch (error) {
            console.error(`Error setting cache for key ${key}:`, error);
            return false;
        }
    },

    /**
     * Get cache if valid
     * @param {String} key - Cache key
     * @returns {Object|null} Cached data or null if expired/not found
     */
    get(key) {
        try {
            const cached = localStorage.getItem(`cache_${key}`);
            if (!cached) {
                this.log(`Cache miss for key: ${key}`);
                return null;
            }

            const cacheEntry = JSON.parse(cached);
            const now = Date.now();

            // Check if cache has expired
            if (now > cacheEntry.expiresAt) {
                this.log(`Cache expired for key: ${key}`);
                this.remove(key);
                return null;
            }

            const ageMs = now - cacheEntry.timestamp;
            this.log(`Cache hit for key: ${key} (age: ${Math.round(ageMs / 1000)}s)`);
            return cacheEntry.data;
        } catch (error) {
            console.error(`Error getting cache for key ${key}:`, error);
            return null;
        }
    },

    /**
     * Check if cache exists and is valid
     * @param {String} key - Cache key
     * @returns {Boolean} True if cache exists and is valid
     */
    isValid(key) {
        try {
            const cached = localStorage.getItem(`cache_${key}`);
            if (!cached) return false;

            const cacheEntry = JSON.parse(cached);
            return Date.now() <= cacheEntry.expiresAt;
        } catch (error) {
            return false;
        }
    },

    /**
     * Get cache status info
     * @param {String} key - Cache key
     * @returns {Object} Cache status information
     */
    getStatus(key) {
        try {
            const cached = localStorage.getItem(`cache_${key}`);
            if (!cached) {
                return { exists: false, valid: false };
            }

            const cacheEntry = JSON.parse(cached);
            const now = Date.now();
            const isValid = now <= cacheEntry.expiresAt;
            const ageSeconds = Math.round((now - cacheEntry.timestamp) / 1000);
            const expiresInSeconds = Math.round((cacheEntry.expiresAt - now) / 1000);

            return {
                exists: true,
                valid: isValid,
                ageSeconds,
                expiresInSeconds,
                timestamp: cacheEntry.timestamp
            };
        } catch (error) {
            return { exists: false, valid: false };
        }
    },

    /**
     * Remove cache
     * @param {String} key - Cache key
     */
    remove(key) {
        try {
            localStorage.removeItem(`cache_${key}`);
            this.log(`Cache removed for key: ${key}`);
        } catch (error) {
            console.error(`Error removing cache for key ${key}:`, error);
        }
    },

    /**
     * Clear all application caches
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
            this.log(`Cleared ${cleared} cache entries`);
        } catch (error) {
            console.error('Error clearing cache:', error);
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
console.log('Cache Manager module loaded');
