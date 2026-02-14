
/**
 * Filter and Sort Handler
 * Handles filter and sort functionality for all product pages
 */

const FilterSortHandler = (function() {
    let currentSort = 'newest';
    let currentFilter = 'newest';

    /**
     * Initialize filter and sort UI
     */
    function init() {
        console.log('Initializing Filter and Sort Handler...');

        // Sort dropdown toggle
        const sortOption = document.getElementById('sortOption');
        const sortDropdown = document.getElementById('sortDropdown');

        if (sortOption && sortDropdown) {
            // Remove Featured option from sort dropdown if it exists
            const featuredSortOption = sortDropdown.querySelector('[data-sort="featured"]');
            if (featuredSortOption) {
                featuredSortOption.remove();
            }

            // Set default active option to newest
            const initialSortOptions = sortDropdown.querySelectorAll('.sort-dropdown-option');
            let newestOptionFound = false;
            initialSortOptions.forEach(opt => {
                if (opt.dataset.sort === 'newest') {
                    opt.classList.add('active');
                    newestOptionFound = true;
                } else {
                    opt.classList.remove('active');
                }
            });

            // If newest option doesn't exist in dropdown, add it
            if (!newestOptionFound) {
                const newestOption = document.createElement('div');
                newestOption.className = 'sort-dropdown-option active';
                newestOption.dataset.sort = 'newest';
                newestOption.textContent = 'Newest Arrivals';
                sortDropdown.prepend(newestOption);
            }

            sortOption.addEventListener('click', function(e) {
                e.stopPropagation();
                
                if (sortDropdown.classList.contains('active')) {
                    // Closing - add closing class for animation
                    sortDropdown.classList.add('closing');
                    sortOption.classList.remove('active');
                    
                    setTimeout(() => {
                        sortDropdown.classList.remove('active', 'closing');
                    }, 300); // Match animation duration
                } else {
                    // Opening - remove closing class if present
                    sortDropdown.classList.remove('closing');
                    sortDropdown.classList.add('active');
                    sortOption.classList.add('active');
                }
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', function(e) {
                if (!sortOption.contains(e.target) && !sortDropdown.contains(e.target)) {
                    if (sortDropdown.classList.contains('active')) {
                        sortDropdown.classList.add('closing');
                        sortOption.classList.remove('active');
                        
                        setTimeout(() => {
                            sortDropdown.classList.remove('active', 'closing');
                        }, 300);
                    }
                }
            });

            // Prevent dropdown from closing when clicking inside it
            sortDropdown.addEventListener('click', function(e) {
                e.stopPropagation();
            });

            // Sort option clicks
            const activeSortOptions = sortDropdown.querySelectorAll('.sort-dropdown-option');
            activeSortOptions.forEach(option => {
                option.addEventListener('click', function(e) {
                    e.stopPropagation();
                    
                    // Remove active class from all options
                    activeSortOptions.forEach(opt => opt.classList.remove('active'));
                    
                    // Add active class to clicked option
                    this.classList.add('active');
                    
                    // Get sort value
                    currentSort = this.dataset.sort;
                    
                    // Close dropdown with animation
                    if (sortDropdown.classList.contains('active')) {
                        sortDropdown.classList.add('closing');
                        sortOption.classList.remove('active');
                        
                        setTimeout(() => {
                            sortDropdown.classList.remove('active', 'closing');
                        }, 300);
                    }
                    
                    // Apply sort
                    applySort(currentSort);
                });
            });

            // Handle Filter Modal Radio Buttons
            const filterSortRadios = document.querySelectorAll('input[name="filter-sort"]');
            filterSortRadios.forEach(radio => {
                radio.addEventListener('change', function() {
                    currentFilter = this.value;
                });
            });
        }

        // Filter modal
        const filterOption = document.getElementById('filterOption');
        const filterModal = document.getElementById('filterModal');
        const closeFilterModal = document.getElementById('closeFilterModal');
        const applyFilterBtn = document.getElementById('applyFilterBtn');
        const clearFilterBtn = document.getElementById('clearFilterBtn');

        if (filterOption && filterModal) {
            filterOption.addEventListener('click', function() {
                filterModal.classList.add('active');
            });
        }

        if (closeFilterModal && filterModal) {
            closeFilterModal.addEventListener('click', function() {
                if (filterModal.classList.contains('active')) {
                    filterModal.classList.add('closing');
                    
                    setTimeout(() => {
                        filterModal.classList.remove('active', 'closing');
                    }, 300); // Match animation duration
                }
            });
        }

        if (filterModal) {
            // Close when clicking on the overlay (background)
            filterModal.addEventListener('click', function(e) {
                if (e.target === filterModal || e.target.classList.contains('filter-modal')) {
                    if (filterModal.classList.contains('active')) {
                        filterModal.classList.add('closing');
                        
                        setTimeout(() => {
                            filterModal.classList.remove('active', 'closing');
                        }, 300);
                    }
                }
            });

            // Prevent modal content clicks from closing the modal
            const filterModalContent = filterModal.querySelector('.filter-modal-content');
            if (filterModalContent) {
                filterModalContent.addEventListener('click', function(e) {
                    e.stopPropagation();
                });
            }

            // Close filter modal when clicking outside (on document)
            document.addEventListener('click', function(e) {
                if (filterModal.classList.contains('active')) {
                    // Check if click is outside both the filter button and modal content
                    const filterModalContent = filterModal.querySelector('.filter-modal-content');
                    const isClickInsideModalContent = filterModalContent && filterModalContent.contains(e.target);
                    const isClickOnFilterButton = filterOption && filterOption.contains(e.target);
                    
                    if (!isClickInsideModalContent && !isClickOnFilterButton) {
                        filterModal.classList.add('closing');
                        
                        setTimeout(() => {
                            filterModal.classList.remove('active', 'closing');
                        }, 300);
                    }
                }
            });
        }

        if (applyFilterBtn) {
            applyFilterBtn.addEventListener('click', function() {
                const selectedFilter = document.querySelector('input[name="filter-sort"]:checked');
                if (selectedFilter) {
                    currentFilter = selectedFilter.value;
                    applySort(currentFilter);
                }
                if (filterModal && filterModal.classList.contains('active')) {
                    filterModal.classList.add('closing');
                    
                    setTimeout(() => {
                        filterModal.classList.remove('active', 'closing');
                    }, 300);
                }
            });
        }

        if (clearFilterBtn) {
            clearFilterBtn.addEventListener('click', function() {
                const newestOption = document.querySelector('input[name="filter-sort"][value="newest"]');
                if (newestOption) {
                    newestOption.checked = true;
                }
                currentFilter = 'newest';
                applySort('newest');
                if (filterModal && filterModal.classList.contains('active')) {
                    filterModal.classList.add('closing');
                    
                    setTimeout(() => {
                        filterModal.classList.remove('active', 'closing');
                    }, 300);
                }
            });
        }

        // Initialize with newest products
        applySort('newest');

        console.log('Filter and Sort Handler initialized');
    }

    /**
     * Apply sort to products (only for price sorting from dropdown)
     */
    async function applySort(sortBy) {
        console.log('Applying sort:', sortBy);

        // Determine which loader to use based on page
        const path = window.location.pathname;
        const pageName = path.split('/').pop().replace('.html', '') || 'index';
        
        console.log('Current page detected for filtering:', pageName);
        
        let products = [];
        
        // Get products from appropriate loader
        if (pageName === 'all-collection') {
            if (typeof AllCollectionLoader !== 'undefined') {
                products = await AllCollectionLoader.loadAllProducts();
            }
        } else if (pageName === 'featured-collection') {
            if (typeof FeaturedCollectionLoader !== 'undefined') {
                products = await FeaturedCollectionLoader.loadFeaturedProducts();
            }
        } else if (pageName === 'new-arrivals') {
            if (typeof NewArrivalsPageLoader !== 'undefined') {
                products = await NewArrivalsPageLoader.loadNewArrivalsProducts();
            }
        } else if (pageName === 'pakistani-pret-wear' || pageName === 'ready-to-wear' || pageName === 'modest-wear' || pageName === 'party-wear') {
            if (typeof SubcategoryProductsLoader !== 'undefined') {
                products = await SubcategoryProductsLoader.loadSubcategoryProducts(pageName);
            }
        } else {
            // Check if it's a known subcategory
            const categories = [
                'gold-necklace', 'silver-necklace', 'meenakari-necklace',
                'gold-earrings', 'silver-earrings', 'meenakari-earrings',
                'gold-bangles', 'silver-bangles', 'meenakari-bangles',
                'gold-rings', 'silver-rings', 'meenakari-rings'
            ];
            
            if (categories.includes(pageName) && typeof SubcategoryProductsLoader !== 'undefined') {
                products = await SubcategoryProductsLoader.loadSubcategoryProducts(pageName);
            }
        }

        if (products.length === 0) {
            console.warn('No products to sort');
            return;
        }

        // Sort products (only price sorting, featured/newest handled by filter modal)
        const sortedProducts = sortProducts(products, sortBy);
        
        // Display sorted products
        displayProducts(sortedProducts);
    }

    /**
     * Sort products by criteria
     */
    function sortProducts(products, sortBy) {
        const productsCopy = [...products];

        switch (sortBy) {
            case 'price-low-high':
                return productsCopy.sort((a, b) => {
                    const priceA = parseFloat(a.price) || 0;
                    const priceB = parseFloat(b.price) || 0;
                    return priceA - priceB;
                });

            case 'price-high-low':
                return productsCopy.sort((a, b) => {
                    const priceA = parseFloat(a.price) || 0;
                    const priceB = parseFloat(b.price) || 0;
                    return priceB - priceA;
                });

            case 'newest':
                return productsCopy.sort((a, b) => {
                    // Use uploadedAt timestamp if available, otherwise use createdAt or timestamp or id
                    const dateA = a.uploadedAt || a.createdAt || a.timestamp || a.date || (a.id ? parseInt(a.id) : 0) || 0;
                    const dateB = b.uploadedAt || b.createdAt || b.timestamp || b.date || (b.id ? parseInt(b.id) : 0) || 0;
                    return dateB - dateA; // Newest first
                });

            case 'featured':
            default:
                // Return original order (featured)
                return productsCopy;
        }
    }

    /**
     * Display sorted products
     */
    function displayProducts(products) {
        // Find the products grid
        const grids = [
            'all-collection-products-grid',
            'featured-collection-products-grid',
            'new-arrivals-products-grid',
            'gold-necklace-products-grid',
            'products-grid'
        ];

        let productsGrid = null;
        for (const gridId of grids) {
            productsGrid = document.getElementById(gridId);
            if (productsGrid) break;
        }

        if (!productsGrid) {
            productsGrid = document.querySelector('.products-grid');
        }

        if (!productsGrid) {
            console.warn('Products grid not found');
            return;
        }

        if (products.length === 0) {
            productsGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 40px;">No products found</p>';
            return;
        }

        // Generate product HTML
        const productsHTML = products.map(product => generateProductHTML(product)).join('');
        productsGrid.innerHTML = productsHTML;

        // CRITICAL: Populate global price cache BEFORE currency conversion
        // This ensures Level 0 price extraction works in wishlist-manager
        products.forEach(product => {
            if (window.PRODUCT_PRICES_CACHE) {
                window.PRODUCT_PRICES_CACHE.set(product.id, product.price);
                console.log('📦 Cached price for', product.id, ':', product.price, 'INR');
            }
        });

        // Reinitialize wishlist listeners
        if (typeof window.WishlistManager !== 'undefined') {
            setTimeout(() => {
                window.WishlistManager.updateWishlistButtonsState();
            }, 100);
        }
    }

    /**
     * Generate product HTML
     */
    function generateProductHTML(product) {
        const formattedPrice = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(product.price).replace('₹', '');

        return `
            <div class="product-item" data-product-id="${product.id}" data-product-price="${product.price}" data-product-name="${product.name}" data-product-image="${product.image}">
                <a href="product-detail?id=${product.id}" style="text-decoration: none; color: inherit;">
                    <div class="product-image">
                        <img src="${product.image}" alt="${product.name}" loading="lazy">
                        <button class="add-to-wishlist" data-product-id="${product.id}" data-product-name="${product.name}" data-product-price="${product.price}" data-product-image="${product.image}" >
                            <i class="far fa-heart"></i>
                        </button>
                    </div>
                    <div class="product-details">
                        <h3 class="product-name">${product.name}</h3>
                        <div class="current-price" data-original-price="${product.price}">Rs. ${formattedPrice}</div>
                    </div>
                </a>
            </div>
        `;
    }

    // Public API
    return {
        init,
        applySort
    };
})();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    FilterSortHandler.init();
});
