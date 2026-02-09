const fs = require('fs');
const path = require('path');

const subcategories = [
    'gold-necklace.html', 'silver-necklace.html', 'meenakari-necklace.html',
    'gold-earrings.html', 'silver-earrings.html', 'meenakari-earrings.html',
    'gold-bangles.html', 'silver-bangles.html', 'meenakari-bangles.html',
    'gold-rings.html', 'silver-rings.html', 'meenakari-rings.html'
];

const template = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1">
    <title>{{TITLE}} - Royal Meenakari</title>
    <link rel="icon" type="image/png" href="images/logos/royalmeenakari.png">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Lato:wght@300;400;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/styles.css?v=1.1.1">
    <link rel="stylesheet" href="css/navbar.css?v=1.1.3">
    <link rel="stylesheet" href="css/responsive.css?v=1.0.4">
    <link rel="stylesheet" href="css/shop.css?v=1.0.3">
    <link rel="stylesheet" href="css/cart.css?v=1.0.2">
    <link rel="stylesheet" href="css/new-arrivals-grid.css?v=2.0.0">
    <link rel="stylesheet" href="css/product-loader.css?v=1.0.0">
    <link rel="stylesheet" href="css/search.css">
    
    <script src="https://www.gstatic.com/firebasejs/9.6.10/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.6.10/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.6.10/firebase-storage-compat.js"></script>
    <script src="js/firebase-config.js"></script>
    <script>
      if (window.firebaseConfig && !firebase.apps.length) {
          firebase.initializeApp(window.firebaseConfig);
      }
    </script>
    <script src="js/whatsapp-tooltip.js"></script>
</head>
<body>
    <header class="header">
        <div class="promo-banner"><p class="banner-text"></p></div>
        <nav class="navbar">
            <div class="nav-container">
                <a href="/index" class="brand"><img src="images/logos/royalmeenakari.png" alt="Royal Meenakari" class="brand-logo"></a>
                <div class="hamburger" id="navToggle"><img src="images/icons/bars-staggered (2).png" alt="Menu" style="width: 25px; height: 25px;"></div>
                <div class="nav-icons">
                    <a href="#" class="icon-link search-icon"><img src="images/icons/search.png" alt="Search" style="width: 20px; height: 20px;"></a>
                    <a href="#" class="icon-link account-icon" id="user-icon"><img src="images/icons/user.png" alt="Account" style="width: 25px; height: 25px;"></a>
                    <a href="#" class="icon-link wishlist-icon-container wishlist-toggle">
                        <img src="images/icons/heart.png" alt="Wishlist" style="width: 20px; height: 20px;">
                        <div class="wishlist-count">0</div>
                    </a>
                    <a href="#" class="icon-link cart-icon-container cart-toggle" id="cartToggleButton">
                        <img src="images/icons/cart-minus.png" alt="Cart" style="width: 20px; height: 20px;">
                        <div class="cart-count">0</div>
                    </a>
                </div>
            </div>
        </nav>
        <div class="nav-menu" id="navMenu">
            <i id="closeMenu" class="fa-solid fa-xmark meenu-close" onclick="closeMobileMenu()" style="font-size: 24px; margin-left: 90%; color: #333;" ></i>
            <ul class="nav-list"></ul>
        </div>
    </header>
    <div class="menu-overlay" id="menuOverlay"></div>

    <section class="new-arrivals-hero">
        <div class="hero-background">
            <img src="images/b0bb682fbc453cd01cde00d00869232f.jpg" alt="{{TITLE}}" class="hero-bg-image">
            <div class="hero-overlay"></div>
        </div>
        <div class="hero-content">
            <h1 class="hero-title">{{TITLE}}</h1>
            <p class="hero-subtitle">Exquisite handcrafted {{TITLE}} collection</p>
        </div>
    </section>

    <section class="shop-products-section">
        <div class="shop-filter-header">
            <div class="filter-option">FILTER</div>
            <div class="sort-option" id="sortOption"><span>SORT BY</span><i class="fas fa-chevron-down"></i></div>
            <div class="sort-dropdown" id="sortDropdown">
                <div class="sort-dropdown-option active" data-sort="price-low-high">Price: Low to High</div>
                <div class="sort-dropdown-option" data-sort="price-high-low">Price: High to Low</div>
            </div>
        </div>
        <div class="shop-products">
            <div class="products-grid" id="products-grid">
                <div class="product-loader show" id="{{LOADER_ID}}" style="grid-column: 1 / -1;">
                    <div class="product-loader-spinner"></div>
                    <div class="product-loader-text">Loading products...</div>
                </div>
            </div>
        </div>
    </section>

    <div class="cart-panel">
      <div class="cart-panel-header"><h3>Your Shopping Bag</h3><button class="close-cart-btn">×</button></div>
      <div class="cart-items"><div class="empty-cart-message">Your cart is empty</div></div>
      <div class="cart-panel-footer">
        <div class="cart-panel-subtotal"><span>Subtotal:</span><span class="subtotal-amount">₹0.00</span></div>
        <div class="cart-panel-buttons"><button class="view-cart-btn continue-shopping-btn">Continue Shopping</button><a href="checkout" class="checkout-btn">Checkout</a></div>
      </div>
    </div>
    <div class="cart-panel-overlay"></div>

    <div class="wishlist-panel">
      <div class="wishlist-panel-header"><h3 data-translate="wishlist">My Wishlist</h3><button class="close-wishlist-btn">×</button></div>
      <div class="wishlist-items"><div class="empty-wishlist-message">Your wishlist is empty</div></div>
      <div class="wishlist-panel-footer"><button class="clear-wishlist-btn">Clear Wishlist</button></div>
    </div>
    <div class="wishlist-overlay"></div>

    <script src="js/navigation.js"></script>
    <script src="js/cart-manager.js"></script>
    <script src="js/wishlist-manager.js"></script>
    <script src="js/filter-sort-handler.js"></script>
    <script src="js/subcategory-products-loader.js"></script>
    <script src="js/footer-toggle.js"></script>
    <script src="js/currency-converter.js?v=1.0.0"></script>
    <script src="js/language-translator.js?v=1.0.0"></script>
</body>
</html>`;

subcategories.forEach(file => {
    const categoryName = file.replace('.html', '').split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    const loaderId = file.replace('.html', '') + '-loader';
    const content = template.replace(/{{TITLE}}/g, categoryName).replace(/{{LOADER_ID}}/g, loaderId);
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
});
