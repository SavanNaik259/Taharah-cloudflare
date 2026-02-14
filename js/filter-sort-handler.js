
/**
 * Unified Filter and Sort Handler
 * Handles filter and sort functionality for all product pages
 */

const FilterSortHandler = (function() {
    let currentProducts = [];
    let currentSort = 'newest';

    /**
     * Initialize filter and sort UI
     */
    function init() {
        if (window.FilterSortHandlerInitialized) {
            console.log('Unified Filter and Sort Handler already initialized, skipping...');
            return;
        }
        
        console.log('Initializing Unified Filter and Sort Handler...');
        window.FilterSortHandlerInitialized = true;

        const sortOption = document.getElementById('sortOption');
        const sortDropdown = document.getElementById('sortDropdown');
        const filterOption = document.getElementById('filterOption');
        const filterModal = document.getElementById('filterModal');
        const closeFilterModal = document.getElementById('closeFilterModal');
        const applyFilterBtn = document.getElementById('applyFilterBtn');
        const clearFilterBtn = document.getElementById('clearFilterBtn');

        // Sort Dropdown Toggle
        if (sortOption && sortDropdown) {
            sortOption.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleSortDropdown();
            });

            // Sort option clicks
            const sortOptions = sortDropdown.querySelectorAll('.sort-dropdown-option');
            sortOptions.forEach(option => {
                option.addEventListener('click', function(e) {
                    e.stopPropagation();
                    sortOptions.forEach(opt => opt.classList.remove('active'));
                    this.classList.add('active');
                    currentSort = this.dataset.sort;
                    closeSortDropdown();
                    applySortAndFilter();
                });
            });
        }

        // Filter Modal Toggle
        if (filterOption && filterModal) {
            filterOption.addEventListener('click', () => filterModal.classList.add('active'));
        }

        if (closeFilterModal && filterModal) {
            closeFilterModal.addEventListener('click', () => closeFilterModalAnimation());
        }

        if (applyFilterBtn) {
            applyFilterBtn.addEventListener('click', () => {
                const selectedSort = document.querySelector('input[name="filter-sort"]:checked');
                if (selectedSort) {
                    currentSort = selectedSort.value;
                    // Sync with sort dropdown UI if it exists
                    const dropdownOptions = document.querySelectorAll('.sort-dropdown-option');
                    dropdownOptions.forEach(opt => {
                        if (opt.dataset.sort === currentSort) opt.classList.add('active');
                        else opt.classList.remove('active');
                    });
                }
                closeFilterModalAnimation();
                applySortAndFilter();
            });
        }

        if (clearFilterBtn) {
            clearFilterBtn.addEventListener('click', () => {
                const newestRadio = document.querySelector('input[name="filter-sort"][value="newest"]');
                if (newestRadio) newestRadio.checked = true;
                currentSort = 'newest';
                applySortAndFilter();
                closeFilterModalAnimation();
            });
        }

        // Global clicks to close dropdowns
        document.addEventListener('click', (e) => {
            if (sortDropdown && sortDropdown.classList.contains('active') && !sortOption.contains(e.target) && !sortDropdown.contains(e.target)) {
                closeSortDropdown();
            }
            if (filterModal && filterModal.classList.contains('active') && e.target === filterModal) {
                closeFilterModalAnimation();
            }
        });

        console.log('Unified Filter and Sort Handler initialized');
    }

    function toggleSortDropdown() {
        const sortOption = document.getElementById('sortOption');
        const sortDropdown = document.getElementById('sortDropdown');
        if (!sortDropdown) return;

        if (sortDropdown.classList.contains('active')) {
            closeSortDropdown();
        } else {
            sortDropdown.classList.remove('closing');
            sortDropdown.classList.add('active');
            if (sortOption) sortOption.classList.add('active');
        }
    }

    function closeSortDropdown() {
        const sortOption = document.getElementById('sortOption');
        const sortDropdown = document.getElementById('sortDropdown');
        if (!sortDropdown || !sortDropdown.classList.contains('active')) return;

        sortDropdown.classList.add('closing');
        if (sortOption) sortOption.classList.remove('active');
        setTimeout(() => {
            sortDropdown.classList.remove('active', 'closing');
        }, 300);
    }

    function closeFilterModalAnimation() {
        const filterModal = document.getElementById('filterModal');
        if (!filterModal) return;
        filterModal.classList.add('closing');
        setTimeout(() => {
            filterModal.classList.remove('active', 'closing');
        }, 300);
    }

    /**
     * Set products and apply current sort
     */
    function setProducts(products) {
        currentProducts = products;
        applySortAndFilter();
    }

    /**
     * Apply sort and update display
     */
    function applySortAndFilter() {
        if (!currentProducts || currentProducts.length === 0) return;

        let sorted = [...currentProducts];
        
        if (currentSort === 'price-low-high') {
            sorted.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
        } else if (currentSort === 'price-high-low') {
            sorted.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
        } else if (currentSort === 'newest') {
            sorted.sort((a, b) => {
                const dateA = a.uploadedAt || a.createdAt || a.timestamp || 0;
                const dateB = b.uploadedAt || b.createdAt || b.timestamp || 0;
                return dateB - dateA;
            });
        }

        displayProducts(sorted);
    }

    /**
     * Display products in grid
     */
    function displayProducts(products) {
        // First, check if we should even be displaying products here
        // Some pages might have their own specialized display logic
        const path = window.location.pathname;
        const pageName = path.split('/').pop().replace('.html', '') || 'index';
        
        const grids = [
            'new-arrivals-products-grid',
            'featured-collection-products-grid',
            'products-grid',
            'all-collection-products-grid'
        ];

        let grid = null;
        for (const id of grids) {
            grid = document.getElementById(id);
            if (grid) break;
        }

        if (!grid) grid = document.querySelector('.products-grid');
        if (!grid) return;

        if (products.length === 0) {
            grid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 40px;">No products found</p>';
            return;
        }

        grid.innerHTML = products.map(product => generateProductHTML(product)).join('');

        // Cache prices for wishlist
        products.forEach(product => {
            if (window.PRODUCT_PRICES_CACHE) window.PRODUCT_PRICES_CACHE.set(product.id, product.price);
        });

        // Re-run currency conversion
        if (window.CurrencyConverter) window.CurrencyConverter.convertAllPrices();
        
        // Update wishlist states
        if (window.WishlistManager) window.WishlistManager.updateWishlistButtonsState();
    }

    function generateProductHTML(product) {
        const originalPrice = parseFloat(product.price) || 0;
        const formattedPrice = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(originalPrice).replace('₹', '');

        return `
            <div class="product-item" data-product-id="${product.id}" data-product-price="${originalPrice}">
                <a href="product-detail?id=${product.id}" style="text-decoration: none; color: inherit;">
                    <div class="product-image">
                        <img src="${product.image}" alt="${product.name}" loading="lazy">
                        <button class="add-to-wishlist" data-product-id="${product.id}" data-product-price="${originalPrice}">
                            <i class="far fa-heart"></i>
                        </button>
                    </div>
                    <div class="product-details">
                        <h3 class="product-name">${product.name}</h3>
                        <div class="product-pricing">
                            <span class="current-price" data-original-price="${originalPrice}">Rs. ${formattedPrice}</span>
                        </div>
                    </div>
                </a>
            </div>
        `;
    }

    return { init, setProducts };
})();

// Robust initialization handling different document ready states
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => FilterSortHandler.init());
} else {
    // Document is already ready, initialize immediately
    FilterSortHandler.init();
}
