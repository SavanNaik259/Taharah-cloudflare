
/**
 * All Collection Products Loader for Home Page
 * Loads all jewelry collection products for the "Jewelry Collection" section
 */

const AllCollectionProductsLoader = (function() {
    let storage;
    let isInitialized = false;
    let cachedProducts = null;
    let lastFetchTime = 0;
    let cachedETag = null;
    const CACHE_DURATION = 24 * 60 * 60 * 1000;
    const SHORT_CACHE_DURATION = 60 * 60 * 1000;
    const MAX_PRODUCTS_TO_FETCH = 12;

    function init() {
        try {
            console.log('Initializing All Collection Products Loader for home page...');
            
            if (typeof firebase !== 'undefined') {
                storage = firebase.storage();
                isInitialized = true;
                console.log('All Collection Products Loader initialized successfully');
                return true;
            } else {
                console.error('Firebase not available');
                return false;
            }
        } catch (error) {
            console.error('Error initializing All Collection Products Loader:', error);
            return false;
        }
    }

    async function loadAllCollectionProducts(forceRefresh = false) {
        if (!isInitialized) {
            console.error('All Collection Products Loader not initialized');
            return [];
        }

        const lastProductUpdate = localStorage.getItem('lastProductUpdate');
        let cacheInvalidated = false;

        if (lastProductUpdate) {
            const updateTime = parseInt(lastProductUpdate);
            const cacheTime = parseInt(localStorage.getItem('allCollectionProductsTime') || '0');

            if (updateTime > cacheTime) {
                console.log('🚨 Cache invalidated by admin panel update:', new Date(updateTime));
                cacheInvalidated = true;
                forceRefresh = true;
                localStorage.removeItem('lastProductUpdate');
                console.log('✅ Cleared cache invalidation flag');
            }
        }

        const now = Date.now();

        if (!forceRefresh && !cacheInvalidated && cachedProducts && (now - lastFetchTime) < CACHE_DURATION) {
            console.log('Using memory cached all collection products');
            return cachedProducts;
        }

        if (!forceRefresh && !cacheInvalidated) {
            try {
                const stored = localStorage.getItem('allCollectionProducts');
                const storedTime = localStorage.getItem('allCollectionProductsTime');

                if (stored && storedTime && (now - parseInt(storedTime)) < SHORT_CACHE_DURATION) {
                    console.log('Using localStorage cached all collection products');
                    cachedProducts = JSON.parse(stored);
                    lastFetchTime = parseInt(storedTime);
                    return cachedProducts;
                }
            } catch (e) {
                console.warn('Error reading from localStorage cache:', e);
            }
        }

        let products = [];

        try {
            console.log('Loading all collection products from Cloud Storage...');

            let netlifyEndpoint = '/.netlify/functions/load-products?category=all-collection';

            if (forceRefresh || cacheInvalidated) {
                const timestamp = Date.now();
                netlifyEndpoint += `&cacheBust=${timestamp}`;
            }

            const response = await fetch(netlifyEndpoint, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                cache: (forceRefresh || cacheInvalidated) ? 'no-store' : 'default'
            });

            if (!response.ok) {
                throw new Error(`Netlify function error: ${response.status}`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'Failed to load products');
            }

            products = data.products || [];
            console.log('Successfully loaded products via Netlify function:', products.length);

            products = products.map(product => {
                if (!product.image && product.mainImage) {
                    product.image = product.mainImage;
                } else if (!product.image && product.images && product.images.length > 0) {
                    product.image = product.images[0].url;
                }
                return product;
            }).filter(product => product.name && product.price && product.image);

            if (products.length > MAX_PRODUCTS_TO_FETCH) {
                products = products.slice(0, MAX_PRODUCTS_TO_FETCH);
            }

            cachedProducts = products;
            lastFetchTime = now;
            
            window.allCollectionProducts = products;

            try {
                localStorage.setItem('allCollectionProducts', JSON.stringify(products));
                localStorage.setItem('allCollectionProductsTime', now.toString());
                console.log('Cached', products.length, 'products');
            } catch (e) {
                console.warn('Error saving to localStorage:', e);
            }

            return products;

        } catch (error) {
            console.error('Error loading all collection products:', error);
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
            <div class="arrival-item all-collection-card" data-product-id="${product.id}">
                <a href="product-detail.html?id=${product.id}" style="text-decoration: none; color: inherit;">
                    <div class="arrival-image">
                        <img src="${product.image}" alt="${product.name}" loading="lazy">
                        <button class="add-to-wishlist" data-product-id="${product.id}" data-product-name="${product.name}" data-product-price="${product.price}" data-product-image="${product.image}" onclick="event.preventDefault(); event.stopPropagation();">
                            <i class="far fa-heart"></i>
                        </button>
                    </div>
                    <div class="arrival-details">
                        <h3 class="arrival-title">${product.name}</h3>
                        <div class="product-pricing">
                            <span class="current-price">${formattedPrice}</span>
                        </div>
                    </div>
                </a>
            </div>
        `;
    }

    function setupWishlistEventListeners() {
        const section = document.querySelector('.all-collection-edit');
        if (!section) return;

        const wishlistButtons = section.querySelectorAll('.add-to-wishlist');
        
        wishlistButtons.forEach(button => {
            button.addEventListener('click', function(event) {
                event.preventDefault();
                event.stopPropagation();

                const productItem = button.closest('.arrival-item');
                if (!productItem) return;

                const productId = productItem.dataset.productId;
                const productName = productItem.querySelector('.arrival-title')?.textContent.trim();
                const priceElement = productItem.querySelector('.current-price');
                let productPrice = 0;
                
                if (priceElement) {
                    const priceText = priceElement.textContent.trim();
                    const cleanedPrice = priceText.replace(/[₹,]/g, '').trim();
                    productPrice = parseFloat(cleanedPrice);
                }

                const imageElement = productItem.querySelector('.arrival-image img');
                const productImage = imageElement ? imageElement.src : '';

                const productData = {
                    id: productId,
                    name: productName,
                    price: productPrice,
                    image: productImage
                };

                if (typeof WishlistManager !== 'undefined') {
                    if (WishlistManager.isInWishlist(productId)) {
                        WishlistManager.removeFromWishlist(productId);
                        const icon = button.querySelector('i');
                        if (icon) {
                            icon.classList.add('far');
                            icon.classList.remove('fas');
                        }
                    } else {
                        WishlistManager.addToWishlist(productData);
                        const icon = button.querySelector('i');
                        if (icon) {
                            icon.classList.remove('far');
                            icon.classList.add('fas');
                        }
                    }
                }
            });
        });

        if (typeof window.WishlistManager !== 'undefined') {
            setTimeout(() => {
                window.WishlistManager.updateWishlistButtonsState();
            }, 100);
        }
    }

    async function updateAllCollectionSection() {
        const grid = document.querySelector('.all-collection-edit .arrivals-grid');

        if (!grid) {
            console.warn('All collection grid element not found');
            return;
        }

        try {
            const products = await loadAllCollectionProducts();

            if (products.length > 0) {
                const productsHTML = products.map(product => generateProductHTML(product)).join('');
                grid.innerHTML = productsHTML;
            } else {
                grid.innerHTML = `
                    <div class="no-products-message" style="grid-column: 1 / -1; text-align: center; padding: 40px 20px;">
                        <i class="fas fa-gem" style="font-size: 48px; color: #5a3f2a; margin-bottom: 20px;"></i>
                        <h3 style="color: #5a3f2a; margin-bottom: 10px;">No Products Available</h3>
                        <p style="color: #666;">Products will appear here once they are added through the admin panel.</p>
                    </div>
                `;
            }

            setupWishlistEventListeners();

            if (window.OutOfStockHandler && products.length > 0) {
                console.log('Updating OutOfStockHandler with all collection products:', products.length);
                window.OutOfStockHandler.updateFromProductData(products, 'all-collection');
            }

            document.dispatchEvent(new CustomEvent('productsLoaded', {
                detail: { 
                    section: 'all-collection', 
                    count: products.length,
                    products: products
                }
            }));

            if (window.OutOfStockHandler) {
                setTimeout(() => {
                    if (window.OutOfStockHandler.forceRefresh) {
                        window.OutOfStockHandler.forceRefresh();
                    }
                }, 1500);
            }

            console.log('All collection section updated with', products.length, 'products');
        } catch (error) {
            console.error('Error updating all collection section:', error);
        }
    }

    return {
        init,
        loadAllCollectionProducts,
        updateAllCollectionSection
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (AllCollectionProductsLoader.init()) {
            AllCollectionProductsLoader.updateAllCollectionSection();
        }
    }, 1000);
});
