/**
 * Ready to Wear Products Loader
 * Dynamically loads products EXCLUSIVELY from Firebase Cloud Storage
 */

const ReadyToWearLoader = (function() {
    let storage;
    let isInitialized = false;
    let cachedProducts = null;
    let lastFetchTime = 0;
    let cachedETag = null;
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours cache for optimal CDN usage
    const SHORT_CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours for localStorage to reduce bandwidth
    const MAX_PRODUCTS_TO_FETCH = 6; // Limit products fetched

    /**
     * Initialize Firebase Storage connection
     */
    function init() {
        try {
            console.log('Initializing Ready to Wear Products Loader...');
            console.log('Firebase available:', typeof firebase !== 'undefined');

            if (typeof firebase !== 'undefined') {
                storage = firebase.storage();
                isInitialized = true;
                console.log('Ready to Wear Products Loader initialized successfully');
                return true;
            } else {
                console.error('Firebase not available - make sure Firebase scripts are loaded');
                return false;
            }
        } catch (error) {
            console.error('Error initializing Ready to Wear Products Loader:', error);
            return false;
        }
    }

    /**
     * Clear all caches - called when products are updated
     */
    function clearCache() {
        console.log('Clearing ready to wear products cache...');
        cachedProducts = null;
        lastFetchTime = 0;
        try {
            localStorage.removeItem('readyToWearProducts');
            localStorage.removeItem('readyToWearProductsTime');
            localStorage.removeItem('readyToWearProductsETag');
        } catch (e) {
            console.warn('Error clearing localStorage cache:', e);
        }
    }

    /**
     * Load ready to wear products EXCLUSIVELY from Firebase Cloud Storage
     */
    async function loadReadyToWearProducts(forceRefresh = false) {
        if (!isInitialized) {
            console.error('Ready to Wear Products Loader not initialized - Firebase connection failed');
            return [];
        }

        // Check if admin panel has invalidated cache by setting lastProductUpdate
        const lastProductUpdate = localStorage.getItem('lastProductUpdate');
        let cacheInvalidated = false;

        if (lastProductUpdate) {
            const updateTime = parseInt(lastProductUpdate);
            const cacheTime = parseInt(localStorage.getItem('readyToWearProductsTime') || '0');

            if (updateTime > cacheTime) {
                console.log('🚨 Cache invalidated by admin panel update:', new Date(updateTime));
                cacheInvalidated = true;
                forceRefresh = true;
                localStorage.removeItem('lastProductUpdate');
                console.log('✅ Cleared cache invalidation flag to restore CDN caching');
            }
        }

        // Check memory cache first
        const now = Date.now();

        if (!forceRefresh && !cacheInvalidated && cachedProducts && (now - lastFetchTime) < CACHE_DURATION) {
            console.log('Using memory cached ready to wear products');
            return cachedProducts;
        }

        // Check localStorage cache with ETag validation
        if (!forceRefresh && !cacheInvalidated) {
            try {
                const stored = localStorage.getItem('readyToWearProducts');
                const storedTime = localStorage.getItem('readyToWearProductsTime');
                const storedETag = localStorage.getItem('readyToWearProductsETag');

                if (stored && storedTime && (now - parseInt(storedTime)) < SHORT_CACHE_DURATION) {
                    console.log('Using localStorage cached ready to wear products');
                    cachedProducts = JSON.parse(stored);
                    cachedETag = storedETag;
                    lastFetchTime = parseInt(storedTime);
                    return cachedProducts;
                }
            } catch (e) {
                console.warn('Error reading from localStorage cache:', e);
            }
        }

        let products = [];

        try {
            console.log('Loading ready to wear products from Cloud Storage...');

            let response;
            let netlifyEndpoint = `/.netlify/functions/load-products?category=ready-to-wear`;

            if (forceRefresh || cacheInvalidated) {
                const cacheBustTimestamp = Date.now();
                netlifyEndpoint += `&cacheBust=${cacheBustTimestamp}`;
            }

            const netlifyHeaders = {
                'Content-Type': 'application/json'
            };

            if (forceRefresh || cacheInvalidated) {
                netlifyHeaders['Cache-Control'] = 'no-cache, no-store, must-revalidate';
                netlifyHeaders['Pragma'] = 'no-cache';
                netlifyHeaders['Expires'] = '0';
            }

            const storedETag = localStorage.getItem('readyToWearProductsETag');
            if (!forceRefresh && !cacheInvalidated && storedETag) {
                netlifyHeaders['If-None-Match'] = storedETag;
            }

            response = await fetch(netlifyEndpoint, {
                method: 'GET',
                headers: netlifyHeaders,
                cache: (forceRefresh || cacheInvalidated) ? 'no-store' : 'default'
            });

            if (response.status === 304 && !forceRefresh && !cacheInvalidated) {
                const stored = localStorage.getItem('readyToWearProducts');
                if (stored) {
                    cachedProducts = JSON.parse(stored);
                    lastFetchTime = now;
                    return cachedProducts;
                }
            }

            if (!response.ok) {
                throw new Error(`Netlify function error: ${response.status} ${response.statusText}`);
            }

            const newETag = response.headers.get('etag');
            if (newETag) {
                cachedETag = newETag;
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'Failed to load products');
            }

            products = data.products || [];
            
            // Normalize products
            products = products.map(product => {
                if (!product.image && product.mainImage) product.image = product.mainImage;
                else if (!product.image && product.images && product.images.length > 0) product.image = product.images[0].url;
                return product;
            }).filter(product => product.name && product.price && product.image);

            if (products.length > MAX_PRODUCTS_TO_FETCH) {
                products = products.slice(0, MAX_PRODUCTS_TO_FETCH);
            }

            cachedProducts = products;
            lastFetchTime = now;
            window.readyToWearProducts = products;

            try {
                localStorage.setItem('readyToWearProducts', JSON.stringify(products));
                localStorage.setItem('readyToWearProductsTime', now.toString());
                if (cachedETag) {
                    localStorage.setItem('readyToWearProductsETag', cachedETag);
                }
            } catch (e) {
                console.warn('Error saving to cache:', e);
            }

            return products;
        } catch (error) {
            console.error('Error loading ready to wear products:', error);
            return [];
        }
    }

    function generateProductHTML(product) {
        const formattedPrice = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(product.price);

        return `
            <div class="product-item" data-product-id="${product.id}" data-product-price="${product.price}" data-product-name="${product.name}" data-product-image="${product.image}">
                <a href="product-detail?id=${product.id}" style="text-decoration: none; color: inherit;">
                    <div class="product-image">
                        <img src="${product.image}" alt="${product.name}" loading="lazy">
                        <button class="add-to-wishlist" data-product-id="${product.id}" data-product-name="${product.name}" data-product-price="${product.price}" data-product-image="${product.image}" >
                            <i class="far fa-heart"></i>
                        </button>
                    </div>
                    <div class="product-details" style="text-align: center;">
                        <h3 class="product-name">${product.name}</h3>
                        <div class="product-pricing">
                            <span class="current-price" data-original-price="${product.price}">${formattedPrice}</span>
                        </div>
                    </div>
                </a>
            </div>
        `;
    }

    async function updateProductsGrid(forceRefresh = false) {
        const container = document.getElementById('readyToWearProductContainer');
        if (!container) return;

        try {
            const products = await loadReadyToWearProducts(forceRefresh);
            const loader = document.getElementById('readyToWearLoader');
            if (loader) loader.classList.remove('show');

            if (products.length > 0) {
                container.innerHTML = products.map(product => generateProductHTML(product)).join('');
                
                products.forEach(product => {
                    if (window.PRODUCT_PRICES_CACHE) window.PRODUCT_PRICES_CACHE.set(product.id, product.price);
                });
                
                if (typeof window.CurrencyConverter !== 'undefined') window.CurrencyConverter.convertAllPrices();
            } else {
                container.innerHTML = '<div class="no-products-message">No Products Available</div>';
            }

            if (window.OutOfStockHandler && products.length > 0) {
                window.OutOfStockHandler.updateFromProductData(products, 'ready-to-wear');
            }

            document.dispatchEvent(new CustomEvent('productsLoaded', {
                detail: { section: 'ready-to-wear', count: products.length, products: products }
            }));
        } catch (error) {
            console.error('Error updating grid:', error);
        }
    }

    return {
        init,
        loadReadyToWearProducts,
        updateProductsGrid,
        clearCache
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    if (ReadyToWearLoader.init()) {
        ReadyToWearLoader.updateProductsGrid();
    }
});                return productsCopy.sort((a, b) => {
                    const dateA = new Date(a.date || 0);
                    const dateB = new Date(b.date || 0);
                    return dateB - dateA;
                });

            case 'featured':
            default:
                return productsCopy;
        }
    }

    /**
     * Setup sort UI for featured collection page
     */
    function setupSortUI() {
        const sortSelect = document.getElementById('sortSelect');

        if (!sortSelect) {
            console.log('Sort select not found');
            return;
        }

        sortSelect.addEventListener('change', async function() {
            const sortBy = this.value;
            console.log('Sort changed to:', sortBy);

            // Reload products to ensure we're sorting the most up-to-date list
            // If cache is still valid, this will return cached data quickly.
            const products = await loadBridalProducts(false); // Use cache if available
            const sortedProducts = sortProducts(products, sortBy);
            displaySortedProducts(sortedProducts);
        });
    }

    /**
     * Display sorted products
     */
    async function displaySortedProducts(products) {
        const productsGrid = document.getElementById('featured-collection-products-grid');

        if (!productsGrid) {
            console.warn('Featured collection products grid not found');
            return;
        }

        if (products.length > 0) {
            const productsHTML = products.map(product => generateProductHTML(product)).join('');
            productsGrid.innerHTML = productsHTML;

            // CRITICAL: Populate global price cache BEFORE currency conversion
            products.forEach(product => {
                if (window.PRODUCT_PRICES_CACHE) {
                    window.PRODUCT_PRICES_CACHE.set(product.id, product.price);
                    console.log('📦 Cached price for', product.id, ':', product.price, 'INR');
                }
            });

            // Setup wishlist event listeners

            // Update wishlist button states
            if (typeof window.WishlistManager !== 'undefined') {
                setTimeout(() => {
                    window.WishlistManager.updateWishlistButtonsState();
                }, 100);
            }
        } else {
            productsGrid.innerHTML = '<p>No products found for this category.</p>';
        }
    }

    /**
     * Clear cached products (useful after adding/editing products)
     */
    function clearCache() {
        console.log('Clearing all bridal products cache...');
        cachedProducts = null;
        lastFetchTime = 0;
        cachedETag = null;
        try {
            localStorage.removeItem('featuredCollectionProducts');
            localStorage.removeItem('featuredCollectionProductsTime');
            localStorage.removeItem('featuredCollectionProductsETag');
            console.log('localStorage cache cleared');
        } catch (e) {
            console.warn('Error clearing localStorage cache:', e);
        }
        console.log('All bridal products cache cleared');
    }

    /**
     * Monitor for cache invalidation flag set by admin panel
     */
    function watchForCacheInvalidation() {
        setInterval(() => {
            const lastProductUpdate = localStorage.getItem('lastProductUpdate');
            if (lastProductUpdate) {
                const updateTime = parseInt(lastProductUpdate);
                const now = Date.now();
                // If flag was set recently (within last 10 seconds), reload products
                if (now - updateTime < 10000) {
                    console.log('🔄 Detected cache invalidation, reloading products...');
                    BridalProductsLoader.updateProductsGrid();
                }
            }
        }, 1000); // Check every second
    }

    // Public API
    return {
        init,
        loadBridalProducts,
        updateProductsGrid,
        setupSortUI,
        watchForCacheInvalidation
    };
})();

// Auto-initialize and load when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (BridalProductsLoader.init()) {
            BridalProductsLoader.updateProductsGrid();
            BridalProductsLoader.setupSortUI();
            BridalProductsLoader.watchForCacheInvalidation();
        }
    }, 1000);
});