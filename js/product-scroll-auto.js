
/**
 * Auto-scroll Product Category Section
 * Automatically scrolls the product category section to center the second product card
 */

document.addEventListener('DOMContentLoaded', function() {
    // Wait for content to load before scrolling
    setTimeout(function() {
        autoScrollProductCategory();
        autoScrollNewArrivalsSection();
    }, 1500); // Increased timeout to ensure all content is loaded
});

// Also try when window is fully loaded
window.addEventListener('load', function() {
    setTimeout(function() {
        autoScrollProductCategory();
        autoScrollNewArrivalsSection();
    }, 1000);
});

// Try again after products are likely loaded
setTimeout(function() {
    autoScrollProductCategory();
    autoScrollNewArrivalsSection();
}, 3000);

// Listen for new arrivals products being loaded
document.addEventListener('productsLoaded', function(event) {
    if (event.detail && event.detail.section === 'new-arrivals') {
        console.log('New arrivals products loaded event received, attempting auto-scroll...');
        setTimeout(() => {
            autoScrollNewArrivalsSection();
        }, 800);
    }
});

// Also listen for the old event name for backward compatibility
document.addEventListener('newArrivalsProductsLoaded', function() {
    console.log('New arrivals products loaded event received (legacy), attempting auto-scroll...');
    setTimeout(() => {
        autoScrollNewArrivalsSection();
    }, 800);
});

// Additional listener for DOM mutations to catch dynamically loaded products
let newArrivalsObserver = null;

function setupNewArrivalsObserver() {
    const newArrivalsSection = document.querySelector('.new-arrivals-edit');
    if (!newArrivalsSection) {
        console.log('New arrivals section not found for observer');
        return;
    }

    // Disconnect existing observer if any
    if (newArrivalsObserver) {
        newArrivalsObserver.disconnect();
    }

    // Create new observer
    newArrivalsObserver = new MutationObserver((mutations) => {
        for (let mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Check if product items were added
                const hasProductItems = Array.from(mutation.addedNodes).some(node => {
                    return node.nodeType === 1 && (
                        node.classList?.contains('product-item') ||
                        node.classList?.contains('arrival-item') ||
                        node.querySelector?.('.product-item, .arrival-item')
                    );
                });

                if (hasProductItems) {
                    console.log('New arrivals products detected via mutation observer, triggering auto-scroll...');
                    setTimeout(() => {
                        autoScrollNewArrivalsSection();
                        // Disconnect after successful scroll
                        if (newArrivalsObserver) {
                            newArrivalsObserver.disconnect();
                            newArrivalsObserver = null;
                        }
                    }, 1000);
                }
            }
        }
    });

    // Start observing
    newArrivalsObserver.observe(newArrivalsSection, {
        childList: true,
        subtree: true
    });

    console.log('New arrivals mutation observer set up');
}

function autoScrollProductCategory() {
    const productScrollContainer = document.querySelector('.you-may-also-like .product-scroll-container');
    
    if (!productScrollContainer) {
        console.log('Product scroll container not found');
        return;
    }

    const productItems = productScrollContainer.querySelectorAll('.product-item');
    
    if (productItems.length < 3) {
        console.log('Not enough products to scroll - found:', productItems.length);
        return;
    }

    console.log('Starting auto-scroll for product category section');

    // Calculate scroll position to center the third product (index 2)
    const firstProduct = productItems[0];
    const secondProduct = productItems[1];
    const thirdProduct = productItems[2];
    
    if (firstProduct && secondProduct && thirdProduct) {
        // Ensure elements are rendered before calculating dimensions
        setTimeout(() => {
            const firstProductWidth = firstProduct.offsetWidth;
            const secondProductWidth = secondProduct.offsetWidth;
            const thirdProductWidth = thirdProduct.offsetWidth;
            
            console.log('First product width:', firstProductWidth);
            console.log('Second product width:', secondProductWidth);
            console.log('Third product width:', thirdProductWidth);
            
            if (firstProductWidth === 0 || secondProductWidth === 0 || thirdProductWidth === 0) {
                console.log('Product dimensions not ready, retrying...');
                setTimeout(autoScrollProductCategory, 500);
                return;
            }
            
            // Calculate gap between products
            const containerStyles = window.getComputedStyle(productScrollContainer);
            const gap = parseInt(containerStyles.gap) || 5; // Default gap from CSS
            
            // Calculate scroll position to center the third product card
            const containerWidth = productScrollContainer.clientWidth;
            
            // Calculate scroll to center third product on all devices
            let scrollAmount;
            if (containerWidth <= 480) {
                // Small mobile - center third product
                scrollAmount = firstProductWidth + gap + secondProductWidth + gap + (thirdProductWidth * 0.5) - (containerWidth / 2);
            } else if (containerWidth <= 768) {
                // Medium mobile/tablet - center third product
                scrollAmount = firstProductWidth + gap + secondProductWidth + gap + (thirdProductWidth * 0.5) - (containerWidth / 2);
            } else {
                // Desktop - center third product
                scrollAmount = firstProductWidth + gap + secondProductWidth + gap + (thirdProductWidth * 0.5) - (containerWidth / 2);
            }
            
            console.log('Container width:', containerWidth);
            console.log('Device type:', containerWidth <= 480 ? 'Small mobile' : containerWidth <= 768 ? 'Medium mobile' : 'Desktop');
            console.log('Calculated scroll amount:', scrollAmount);
            
            // Smooth scroll to the calculated position
            productScrollContainer.scrollTo({
                left: Math.max(0, scrollAmount),
                behavior: 'smooth'
            });
            
            console.log('Auto-scrolled product category section to center third product');
        }, 100);
    }
}

function autoScrollNewArrivalsSection() {
    // Try both possible container selectors
    let newArrivalsScrollContainer = document.querySelector('.new-arrivals-edit .product-scroll-container');
    if (!newArrivalsScrollContainer) {
        newArrivalsScrollContainer = document.querySelector('.new-arrivals-edit .arrivals-grid');
    }
    
    if (!newArrivalsScrollContainer) {
        console.log('New arrivals scroll container not found - checking for products loading...');
        // Retry after products might be loaded
        setTimeout(() => {
            let retryContainer = document.querySelector('.new-arrivals-edit .product-scroll-container');
            if (!retryContainer) {
                retryContainer = document.querySelector('.new-arrivals-edit .arrivals-grid');
            }
            if (retryContainer) {
                console.log('New arrivals container found on retry, attempting scroll...');
                autoScrollNewArrivalsSection();
            } else {
                console.log('New arrivals container still not found after retry');
            }
        }, 2000);
        return;
    }

    const productItems = newArrivalsScrollContainer.querySelectorAll('.product-item, .arrival-item');
    
    if (productItems.length < 3) {
        console.log('Not enough new arrivals products for auto-scroll - found:', productItems.length);
        // Retry after a delay in case products are still loading
        setTimeout(() => {
            const retryItems = newArrivalsScrollContainer.querySelectorAll('.product-item, .arrival-item');
            if (retryItems.length >= 3) {
                console.log('Products loaded on retry, attempting scroll...');
                autoScrollNewArrivalsSection();
            }
        }, 1500);
        return;
    }

    console.log('Starting auto-scroll for new arrivals section with', productItems.length, 'products');

    // Calculate scroll position to center the third product (index 2)
    const firstProduct = productItems[0];
    const secondProduct = productItems[1];
    const thirdProduct = productItems[2];
    
    if (firstProduct && secondProduct && thirdProduct) {
        // Ensure elements are rendered before calculating dimensions
        setTimeout(() => {
            const firstProductWidth = firstProduct.offsetWidth;
            const secondProductWidth = secondProduct.offsetWidth;
            const thirdProductWidth = thirdProduct.offsetWidth;
            
            console.log('New arrivals - First product width:', firstProductWidth);
            console.log('New arrivals - Second product width:', secondProductWidth);
            console.log('New arrivals - Third product width:', thirdProductWidth);
            
            if (firstProductWidth === 0 || secondProductWidth === 0 || thirdProductWidth === 0) {
                console.log('Product dimensions not ready, retrying...');
                setTimeout(autoScrollNewArrivalsSection, 500);
                return;
            }
            
            // Calculate gap between products
            const containerStyles = window.getComputedStyle(newArrivalsScrollContainer);
            const gap = parseInt(containerStyles.gap) || 15; // Default gap
            
            // Calculate scroll position to center third product
            const containerWidth = newArrivalsScrollContainer.clientWidth;
            
            // Center third product on all devices
            let scrollAmount;
            if (containerWidth <= 480) {
                // Small mobile - center third product
                scrollAmount = firstProductWidth + gap + secondProductWidth + gap + (thirdProductWidth * 0.5) - (containerWidth / 2);
            } else if (containerWidth <= 768) {
                // Medium mobile/tablet - center third product
                scrollAmount = firstProductWidth + gap + secondProductWidth + gap + (thirdProductWidth * 0.5) - (containerWidth / 2);
            } else {
                // Desktop - center third product
                scrollAmount = firstProductWidth + gap + secondProductWidth + gap + (thirdProductWidth * 0.5) - (containerWidth / 2);
            }
            
            console.log('New arrivals - Container width:', containerWidth);
            console.log('New arrivals - Calculated scroll amount:', scrollAmount);
            
            // Smooth scroll to the calculated position
            newArrivalsScrollContainer.scrollTo({
                left: Math.max(0, scrollAmount),
                behavior: 'smooth'
            });
            
            console.log('New arrivals section auto-scrolled to center third product');
        }, 200);
    }
}

// Make functions globally available
window.autoScrollProductCategory = autoScrollProductCategory;
window.autoScrollNewArrivalsSection = autoScrollNewArrivalsSection;

// Set up observer when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setupNewArrivalsObserver();
});
