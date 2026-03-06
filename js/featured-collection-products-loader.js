/**
 * Bridal Products Loader
 * Dynamically loads products EXCLUSIVELY from Firebase Cloud Storage
 */

const BridalProductsLoader = (function() {
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
            console.log('Initializing Bridal Products Loader...');
            
            if (typeof firebase !== 'undefined') {
                storage = firebase.storage();
                isInitialized = true;
                console.log('Bridal Products Loader initialized successfully');
                return true;
            } else {
                console.error('Firebase not available - make sure Firebase scripts are loaded');
                return false;
            }
        } catch (error) {
            console.error('Error initializing Bridal Products Loader:', error);
            return false;
        }
    }

    /**
     * Load bridal products EXCLUSIVELY from Firebase Cloud Storage
     */
    async function loadBridalProducts(forceRefresh = true) {
        if (!isInitialized) {
            console.error('Bridal Products Loader not initialized');
            return [];
        }

        const now = Date.now();
        
        try {
            let netlifyEndpoint = `/api/load-products?category=featured-collection`;

            const fetchHeaders = {
                'Accept': 'application/json'
            };

            const cachedETag = localStorage.getItem('featuredCollectionProductsETag');
            if (cachedETag) {
                fetchHeaders['If-None-Match'] = cachedETag;
            }

            const response = await fetch(netlifyEndpoint, {
                headers: fetchHeaders
            });

            if (response.status === 304) {
                console.log('Using local cache (304 Not Modified)');
                const cachedData = localStorage.getItem('featuredCollectionProducts');
                if (cachedData) {
                    return JSON.parse(cachedData);
                }
            }
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            if (!data.success) return [];

            let products = data.products || [];
            products = products.map(product => {
                if (!product.image && product.mainImage) product.image = product.mainImage;
                else if (!product.image && product.images && product.images.length > 0) product.image = product.images[0].url;
                
                // Ensure image URL is direct Firebase URL
                if (product.image) {
                    // URL is already transformed by the backend
                    return product;
                }
                
                return product;
            }).filter(product => product.name && product.price && product.image);

            cachedProducts = products;
            lastFetchTime = now;
            localStorage.setItem('featuredCollectionProducts', JSON.stringify(products));
            localStorage.setItem('featuredCollectionProductsTime', now.toString());

            return products;
        } catch (error) {
            console.error('Error loading products:', error);
            return [];
        }
    }

    /**
     * Display products in the grid
     */
    function displayProducts(products, subcategory = null) {
        const grid = document.getElementById('featuredCollectionProductContainer') || document.getElementById('products-grid');
        if (!grid) return;

        if (subcategory && subcategory !== 'all') {
            products = products.filter(p => {
                const pSub = (p.subcategory || p.subCategory || '').trim().toLowerCase();
                const sSub = subcategory.trim().toLowerCase();
                return pSub === sSub;
            });
        }

        if (products.length > 0) {
            grid.innerHTML = products.map(product => generateProductHTML(product)).join('');
            
            const loader = document.getElementById('featuredCollectionLoader');
            if (loader) loader.classList.remove('show');

            products.forEach(product => {
                if (window.PRODUCT_PRICES_CACHE) window.PRODUCT_PRICES_CACHE.set(product.id, product.price);
            });

            if (typeof window.CurrencyConverter !== 'undefined') window.CurrencyConverter.convertAllPrices();
        } else {
            grid.innerHTML = '<div class="no-products-message">No products found.</div>';
        }
    }

    function generateProductHTML(product) {
        const formattedPrice = new Intl.NumberFormat('en-IN', {
            style: 'currency', currency: 'INR', minimumFractionDigits: 0
        }).format(product.price).replace('₹', '');

        // Standardize image path for proxy
        const extractStoragePath = (input) => {
            if (!input || typeof input !== 'string') return '';
            let s = input;

            // If wrapped in proxy (netlify or cloudflare)
            try {
                if (s.includes('image-proxy')) {
                    const u = new URL(s, 'https://dummy');
                    const p = u.searchParams.get('path') || u.searchParams.get('url');
                    if (p) s = decodeURIComponent(p);
                }
            } catch (e) {}

            // If full Firebase URL
            if (s.includes('firebasestorage.googleapis.com')) {
                const m = s.match(/\/o\/([^?]+)/);
                if (m) s = decodeURIComponent(m[1]);
            }

            // Decode any leftover %2F
            try { s = decodeURIComponent(s); } catch (e) {}

            s = s.startsWith('/') ? s.slice(1) : s;
            if (!s.startsWith('productImages/')) {
                s = `productImages/${s.replace(/^productImages\//, '')}`;
            }
            return s;
        };

        const cleanPath = extractStoragePath(product.image);
        const proxyUrl = product.image && product.image.startsWith('/api/image-proxy?url=') ? product.image : `/api/image-proxy?url=${encodeURIComponent(cleanPath)}`;

        return `
            <div class="product-item" data-product-id="${product.id}" data-product-price="${product.price}">
                <a href="product-detail?id=${product.id}">
                    <div class="product-image">
                        <img src="${proxyUrl}" alt="${product.name}">
                    </div>
                    <div class="product-details">
                        <h3>${product.name}</h3>
                        <div class="current-price">Rs. ${formattedPrice}</div>
                    </div>
                </a>
            </div>
        `;
    }

    async function updateProductsGrid(forceRefresh = false) {
        const products = await loadBridalProducts(forceRefresh);
        displayProducts(products);
    }

    return {
        init,
        loadFeaturedProducts: loadBridalProducts,
        loadBridalProducts,
        updateProductsGrid,
        displayProducts,
        watchForCacheInvalidation: () => {}
    };
})();

const FeaturedCollectionLoader = BridalProductsLoader;

document.addEventListener('DOMContentLoaded', function() {
    if (BridalProductsLoader.init()) {
        BridalProductsLoader.updateProductsGrid();
    }
});