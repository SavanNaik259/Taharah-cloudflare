
/**
 * Subcategory Products Loader
 * Dynamically loads products from Firebase Cloud Storage for subcategory pages
 * (gold-necklace, silver-earrings, etc.)
 */

const SubcategoryProductsLoader = (function() {
    let storage;
    let isInitialized = false;
    let cachedProducts = {};
    let lastFetchTime = {};
    let cachedETags = {};
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
    const SHORT_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

    /**
     * Initialize Firebase Storage connection
     */
    function init() {
        try {
            console.log('Initializing Subcategory Products Loader...');
            
            if (typeof firebase !== 'undefined') {
                storage = firebase.storage();
                isInitialized = true;
                console.log('Subcategory Products Loader initialized successfully');
                return true;
            } else {
                console.error('Firebase not available - make sure Firebase scripts are loaded');
                return false;
            }
        } catch (error) {
            console.error('Error initializing Subcategory Products Loader:', error);
            return false;
        }
    }

    /**
     * Load products for a specific subcategory
     */
    async function loadSubcategoryProducts(category, forceRefresh = false) {
        if (!isInitialized) {
            console.error('Subcategory Products Loader not initialized');
            return [];
        }

        // Check cache invalidation
        const lastProductUpdate = localStorage.getItem('lastProductUpdate');
        let cacheInvalidated = false;

        if (lastProductUpdate) {
            const updateTime = parseInt(lastProductUpdate);
            const cacheTime = parseInt(localStorage.getItem(`${category}ProductsTime`) || '0');

            if (updateTime > cacheTime) {
                console.log(`🚨 Cache invalidated for ${category}:`, new Date(updateTime));
                cacheInvalidated = true;
                forceRefresh = true;
                localStorage.removeItem('lastProductUpdate');
            }
        }

        // Check memory cache
        const now = Date.now();
        if (!forceRefresh && !cacheInvalidated && cachedProducts[category] && (now - (lastFetchTime[category] || 0)) < CACHE_DURATION) {
            console.log(`Using memory cached ${category} products`);
            return cachedProducts[category];
        }

        // Check localStorage cache
        if (!forceRefresh && !cacheInvalidated) {
            try {
                const stored = localStorage.getItem(`${category}Products`);
                const storedTime = localStorage.getItem(`${category}ProductsTime`);
                
                if (stored && storedTime && (now - parseInt(storedTime)) < SHORT_CACHE_DURATION) {
                    console.log(`Using localStorage cached ${category} products`);
                    cachedProducts[category] = JSON.parse(stored);
                    lastFetchTime[category] = parseInt(storedTime);
                    return cachedProducts[category];
                }
            } catch (e) {
                console.warn('Error reading from localStorage cache:', e);
            }
        }

        try {
            console.log(`Loading ${category} products from Cloud Storage...`);

            let netlifyEndpoint = `/.netlify/functions/load-products?category=${category}`;

            if (forceRefresh || cacheInvalidated) {
                const timestamp = Date.now();
                netlifyEndpoint += `&cacheBust=${timestamp}`;
            }

            const netlifyHeaders = {
                'Content-Type': 'application/json'
            };

            if (forceRefresh || cacheInvalidated) {
                netlifyHeaders['Cache-Control'] = 'no-cache, no-store, must-revalidate';
                netlifyHeaders['Pragma'] = 'no-cache';
                netlifyHeaders['Expires'] = '0';
            }

            const response = await fetch(netlifyEndpoint, {
                method: 'GET',
                headers: netlifyHeaders,
                cache: (forceRefresh || cacheInvalidated) ? 'no-store' : 'default'
            });

            if (!response.ok) {
                throw new Error(`Failed to load ${category}: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                console.warn(`No products found for ${category}`);
                return [];
            }

            let products = data.products || [];

            // Validate and normalize products
            products = products.map(product => {
                if (!product.image && product.mainImage) {
                    product.image = product.mainImage;
                } else if (!product.image && product.images && product.images.length > 0) {
                    product.image = product.images[0].url;
                }
                return product;
            }).filter(product => product.name && product.price && product.image);

            // Cache results
            cachedProducts[category] = products;
            lastFetchTime[category] = now;

            try {
                localStorage.setItem(`${category}Products`, JSON.stringify(products));
                localStorage.setItem(`${category}ProductsTime`, now.toString());
            } catch (e) {
                console.warn('Error saving to localStorage:', e);
            }

            console.log(`Loaded ${products.length} ${category} products`);
            return products;

        } catch (error) {
            console.error(`Error loading ${category} products:`, error);
            return [];
        }
    }

    /**
     * Generate HTML for a product item
     */
    function generateProductHTML(product) {
        const formattedPrice = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(product.price);

        return `
            <div class="product-item" data-product-id="${product.id}">
                <a href="product-detail.html?id=${product.id}" style="text-decoration: none; color: inherit;">
                    <div class="product-image">
                        <img src="${product.image}" alt="${product.name}" loading="lazy">
                        <button class="add-to-wishlist" data-product-id="${product.id}" data-product-name="${product.name}" data-product-price="${product.price}" data-product-image="${product.image}" onclick="event.preventDefault(); event.stopPropagation();">
                            <i class="far fa-heart"></i>
                        </button>
                    </div>
                    <div class="product-details">
                        <h3 class="product-name">${product.name}</h3>
                        <div class="current-price">${formattedPrice}</div>
                    </div>
                </a>
            </div>
        `;
    }

    /**
     * Update products grid for current page
     */
    async function updateProductsGrid(category) {
        const productsGrid = document.getElementById('products-grid') || document.querySelector('.products-grid');

        if (!productsGrid) {
            console.warn('Products grid not found');
            return;
        }

        try {
            // Show loading
            productsGrid.innerHTML = `
                <div class="loading-products" style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; padding: 60px 20px;">
                    <div class="loading-spinner" style="width: 40px; height: 40px; border: 3px solid #f3f3f3; border-top: 3px solid #6D3E25; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 15px;"></div>
                    <p style="margin: 0; font-size: 16px; font-weight: 500; color: #666;">Loading Products...</p>
                </div>
            `;

            const products = await loadSubcategoryProducts(category);

            if (products.length > 0) {
                const productsHTML = products.map(product => generateProductHTML(product)).join('');
                productsGrid.innerHTML = productsHTML;

                // Setup wishlist event listeners
                setupWishlistEventListeners();

                // Update wishlist button states
                if (typeof window.WishlistManager !== 'undefined') {
                    setTimeout(() => {
                        window.WishlistManager.updateWishlistButtonsState();
                    }, 100);
                }
            } else {
                productsGrid.innerHTML = `
                    <div class="no-products-message" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                        <i class="fas fa-gem" style="font-size: 48px; color: #6D3E25; margin-bottom: 20px;"></i>
                        <h3 style="color: #6D3E25; margin-bottom: 10px;">No Products Available</h3>
                        <p style="color: #666;">Products will appear here once they are added through the admin panel.</p>
                    </div>
                `;
            }

            console.log(`${category} section updated with ${products.length} products`);
        } catch (error) {
            console.error(`Error updating ${category} section:`, error);
            productsGrid.innerHTML = `
                <div class="loading-error" style="grid-column: 1 / -1; color: red; padding: 20px; text-align: center;">
                    <strong>Error loading products</strong><br>
                    ${error.message}
                </div>
            `;
        }
    }

    /**
     * Set up event listeners for wishlist buttons
     */
    function setupWishlistEventListeners() {
        const wishlistButtons = document.querySelectorAll('.add-to-wishlist');
        console.log('Setting up wishlist listeners for', wishlistButtons.length, 'subcategory product buttons');

        wishlistButtons.forEach(button => {
            // Remove any existing listeners to avoid duplicates
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            newButton.addEventListener('click', handleWishlistButtonClick);
        });
    }

    /**
     * Handle wishlist button clicks
     */
    function handleWishlistButtonClick(event) {
        event.preventDefault();
        event.stopPropagation();

        const button = event.target.closest('.add-to-wishlist');
        if (!button) return;

        const productItem = button.closest('.product-item');
        if (!productItem) return;

        const productId = productItem.dataset.productId || button.dataset.productId;
        const productNameEl = productItem.querySelector('.product-name');
        const productName = productNameEl ? productNameEl.textContent.trim() : (button.dataset.productName || 'Unknown Product');

        const priceElement = productItem.querySelector('.current-price');
        let productPrice = 0;
        if (priceElement) {
            const priceText = priceElement.textContent.trim();
            const cleanedPrice = priceText.replace(/[₹,]/g, '').trim();
            productPrice = parseFloat(cleanedPrice);
        } else {
            productPrice = parseFloat(button.dataset.productPrice) || 0;
        }

        const imageElement = productItem.querySelector('.product-image img');
        const productImage = imageElement ? imageElement.src : (button.dataset.productImage || '');

        const productData = {
            id: productId,
            name: productName,
            price: productPrice,
            image: productImage
        };

        console.log('Wishlist button clicked for product:', productData);

        if (typeof WishlistManager !== 'undefined') {
            if (WishlistManager.isInWishlist(productId)) {
                WishlistManager.removeFromWishlist(productId);
                const icon = button.querySelector('i');
                if (icon) {
                    icon.classList.add('far');
                    icon.classList.remove('fas');
                }
                button.classList.remove('active');
            } else {
                WishlistManager.addToWishlist(productData);
                const icon = button.querySelector('i');
                if (icon) {
                    icon.classList.remove('far');
                    icon.classList.add('fas');
                }
                button.classList.add('active');
            }
        } else {
            console.error('WishlistManager not available');
            alert(`${productData.name} added to wishlist!`);
        }
    }

    /**
     * Auto-detect category from page URL and load products
     */
    function autoLoadForCurrentPage() {
        const pageName = window.location.pathname.split('/').pop().replace('.html', '');
        
        // Map of page names to their Firebase Storage category names
        const categoryMap = {
            'gold-necklace': 'gold-necklace',
            'silver-necklace': 'silver-necklace',
            'meenakari-necklace': 'meenakari-necklace',
            'gold-earrings': 'gold-earrings',
            'silver-earrings': 'silver-earrings',
            'meenakari-earrings': 'meenakari-earrings',
            'gold-bangles': 'gold-bangles',
            'silver-bangles': 'silver-bangles',
            'meenakari-bangles': 'meenakari-bangles',
            'gold-rings': 'gold-rings',
            'silver-rings': 'silver-rings',
            'meenakari-rings': 'meenakari-rings'
        };

        const category = categoryMap[pageName];
        
        if (category) {
            console.log(`Auto-loading products for category: ${category}`);
            updateProductsGrid(category);
        } else {
            console.log(`No category mapping found for page: ${pageName}`);
        }
    }

    // Public API
    return {
        init,
        loadSubcategoryProducts,
        updateProductsGrid,
        autoLoadForCurrentPage
    };
})();

// Auto-initialize and load when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (SubcategoryProductsLoader.init()) {
            SubcategoryProductsLoader.autoLoadForCurrentPage();
        }
    }, 1000);
});
