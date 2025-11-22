
/**
 * First Visit Banner Handler
 * Shows a welcome banner with signup promotion for first-time visitors
 */

(function() {
    'use strict';

    // Check if this is the first visit
    function isFirstVisit() {
        return !localStorage.getItem('hasVisitedBefore');
    }

    // Mark that user has visited
    function markAsVisited() {
        localStorage.setItem('hasVisitedBefore', 'true');
    }

    // Create and show the banner
    function showFirstVisitBanner() {
        // Don't show on certain pages
        const currentPage = window.location.pathname;
        const excludedPages = ['/login.html', '/signup.html', '/admin-panel.html', '/admin-dashboard.html'];
        
        if (excludedPages.some(page => currentPage.includes(page))) {
            return;
        }

        // Create banner HTML
        const bannerHTML = `
            <div class="first-visit-overlay" id="firstVisitOverlay">
                <div class="first-visit-banner">
                    <button class="first-visit-close" id="closeFirstVisitBanner" aria-label="Close banner">×</button>
                    
                    <div class="banner-content-wrapper">
                        <div class="banner-image-section">
                            <img src="images/7ee0b1b1ef79410cac60d42a3ff800c7.jpg" alt="Royal Meenakari Jewelry">
                        </div>
                        
                        <div class="banner-text-section">
                            <img src="images/logos/royalmeenakari.png" alt="Royal Meenakari Logo" class="banner-logo">
                            
                            <h2 class="banner-title">Welcome to Royal Meenakari</h2>
                            <p class="banner-subtitle">Discover Exquisite Handcrafted Jewelry</p>
                            
                            <ul class="banner-benefits">
                                <li>Exclusive access to new collections</li>
                                <li>Special offers & discounts for members</li>
                                <li>Track your orders seamlessly</li>
                                <li>Personalized shopping experience</li>
                            </ul>
                            
                            <div class="banner-cta-buttons">
                                <a href="signup.html" class="banner-btn banner-btn-primary">Create Account</a>
                                <a href="login.html" class="banner-btn banner-btn-secondary">Sign In</a>
                            </div>
                            
                            <button class="banner-skip" id="skipBanner">Continue as Guest</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Insert banner into DOM
        document.body.insertAdjacentHTML('beforeend', bannerHTML);

        // Get elements
        const overlay = document.getElementById('firstVisitOverlay');
        const closeBtn = document.getElementById('closeFirstVisitBanner');
        const skipBtn = document.getElementById('skipBanner');

        // Show banner after a short delay
        setTimeout(() => {
            overlay.classList.add('show');
        }, 1000);

        // Close banner function
        function closeBanner() {
            overlay.classList.remove('show');
            setTimeout(() => {
                overlay.remove();
            }, 400);
            markAsVisited();
        }

        // Event listeners
        closeBtn.addEventListener('click', closeBanner);
        skipBtn.addEventListener('click', closeBanner);
        
        // Close on overlay click (outside banner)
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                closeBanner();
            }
        });

        // Close on ESC key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && overlay.classList.contains('show')) {
                closeBanner();
            }
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            if (isFirstVisit()) {
                showFirstVisitBanner();
            }
        });
    } else {
        if (isFirstVisit()) {
            showFirstVisitBanner();
        }
    }
})();
