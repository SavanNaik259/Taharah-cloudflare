
#!/bin/bash

# Shell script to update footer and bottom nav bar on all collection and subcategory pages

echo "Starting footer and bottom nav update process..."

# Define the new footer HTML
read -r -d '' FOOTER_HTML << 'EOF'
    <!-- Footer Toggle Script -->
    <script src="js/footer-toggle.js"></script>

    <!-- Minimalist Collapsible Footer -->
    <footer class="footer-minimalist">
        <div class="container">
            <!-- Info Section -->
            <div class="footer-section">
                <button class="footer-toggle" data-section="info-content">
                    <span class="footer-title">Info</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="footer-content" id="info-content">
                    <ul>
                        <li><a href="about-us.html">About Us</a></li>
                        <li><a href="terms-conditions.html#shipping-and-delivery">Shipping Policy</a></li>
                        <li><a href="terms-conditions.html#returns-and-refunds">Returns & Exchanges</a></li>
                        <li><a href="terms-conditions.html">Terms and Conditions</a></li>
                        <li><a href="privacy-policy.html">Privacy Policy</a></li>
                    </ul>
                </div>
            </div>

            <!-- Categories Section -->
            <div class="footer-section">
                <button class="footer-toggle" data-section="categories-content">
                    <span class="footer-title">Categories</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="footer-content" id="categories-content">
                    <ul>
                        <li class="category-with-sub">
                            <div class="category-item-header">
                                <a href="#">Necklace</a>
                                <i class="fas fa-plus category-toggle-icon"></i>
                            </div>
                            <ul class="subcategory-list">
                                <li><a href="gold-necklace.html">Gold Necklace</a></li>
                                <li><a href="silver-necklace.html">Silver Necklace</a></li>
                                <li><a href="meenakari-necklace.html">Meenakari Necklace</a></li>
                            </ul>
                        </li>
                        <li class="category-with-sub">
                            <div class="category-item-header">
                                <a href="#">Earrings</a>
                                <i class="fas fa-plus category-toggle-icon"></i>
                            </div>
                            <ul class="subcategory-list">
                                <li><a href="gold-earrings.html">Gold Earrings</a></li>
                                <li><a href="silver-earrings.html">Silver Earrings</a></li>
                                <li><a href="meenakari-earrings.html">Meenakari Earrings</a></li>
                            </ul>
                        </li>
                        <li class="category-with-sub">
                            <div class="category-item-header">
                                <a href="#">Bangles</a>
                                <i class="fas fa-plus category-toggle-icon"></i>
                            </div>
                            <ul class="subcategory-list">
                                <li><a href="gold-bangles.html">Gold Bangles</a></li>
                                <li><a href="silver-bangles.html">Silver Bangles</a></li>
                                <li><a href="meenakari-bangles.html">Meenakari Bangles</a></li>
                            </ul>
                        </li>
                        <li class="category-with-sub">
                            <div class="category-item-header">
                                <a href="#">Rings</a>
                                <i class="fas fa-plus category-toggle-icon"></i>
                            </div>
                            <ul class="subcategory-list">
                                <li><a href="gold-rings.html">Gold Rings</a></li>
                                <li><a href="silver-rings.html">Silver Rings</a></li>
                                <li><a href="meenakari-rings.html">Meenakari Rings</a></li>
                            </ul>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Collection Section -->
            <div class="footer-section">
                <button class="footer-toggle" data-section="collection-content">
                    <span class="footer-title">Collection</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="footer-content" id="collection-content">
                    <ul>
                        <li><a href="all-collection.html">All Collection</a></li>
                        <li><a href="featured-collection.html">Featured Collection</a></li>
                        <li><a href="new-arrivals.html">New Arrivals</a></li>
                    </ul>
                </div>
            </div>

            <!-- Exclusive Benefits Section -->
            <div class="footer-section">
                <button class="footer-toggle" data-section="benefits-content">
                    <span class="footer-title">Exclusive benefits</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="footer-content" id="benefits-content">
                    <ul>
                        <li><a href="#">Follow us on social media</a></li>
                        <li><a href="#">Download Our App</a></li>
                    </ul>
                </div>
            </div>

            <div class="footer-bottom">
                <div class="container">
                    <div class="footer-bottom-content">
                        <p>&copy; 2025 Royal Meenakari. All rights reserved. | Developed by Savan Naik</p>
                        
                        <div class="footer-links">
                            <a href="terms-conditions.html">Terms and Conditions</a>
                            <a href="privacy-policy.html">Privacy Policy</a>
                        </div>

                        <div class="payment-methods">
                            <span><i class="fab fa-cc-amex"></i></span>
                            <span><i class="fab fa-cc-discover"></i></span>
                            <span><i class="fab fa-google-pay"></i></span>
                            <span><i class="fab fa-cc-mastercard"></i></span>
                            <span><i class="fab fa-cc-paypal"></i></span>
                            <span class="union-pay">UP</span>
                            <span><i class="fab fa-cc-visa"></i></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </footer>

    <!-- WhatsApp Button -->
    <a href="https://wa.me/919310250047?text=Hi! I'm interested. Can you help me?" class="whatsapp-btn">
        <i class="fab fa-whatsapp"></i>
    </a>

    <!-- Bottom Navigation Bar -->
    <nav class="bottom-nav">
        <a href="index.html" class="bottom-nav-item">
            <i class="fi fi-rs-home"></i>
            <span>Home</span>
        </a>
        <a href="all-collection.html" class="bottom-nav-item">
            <i class="fi fi-rs-shop"></i>
            <span>Shop</span>
        </a>
        <a href="login.html" class="bottom-nav-item">
            <i class="fi fi-rs-user"></i>
            <span>Account</span>
        </a>
        <div class="bottom-nav-item currency-selector-trigger">
            <i class="fi fi-rs-globe"></i>
            <span>🇮🇳 INR</span>
        </div>
        <div class="bottom-nav-item language-selector-trigger">
            <i class="fi fi-rs-language"></i>
            <span>🇬🇧 EN</span>
        </div>
        <a href="#" class="bottom-nav-item cart-toggle">
            <i class="fi fi-rs-shopping-bag"></i>
            <span>Bag</span>
        </a>
    </nav>
EOF

# List of files to update
FILES=(
    "all-collection.html"
    "featured-collection.html"
    "new-arrivals.html"
    "gold-necklace.html"
    "silver-necklace.html"
    "meenakari-necklace.html"
    "gold-earrings.html"
    "silver-earrings.html"
    "meenakari-earrings.html"
    "gold-bangles.html"
    "silver-bangles.html"
    "meenakari-bangles.html"
    "gold-rings.html"
    "silver-rings.html"
    "meenakari-rings.html"
    "about-us.html"
    "contact-us.html"
)

# Function to update a file
update_file() {
    local file=$1
    
    if [ ! -f "$file" ]; then
        echo "Warning: $file not found, skipping..."
        return
    fi
    
    echo "Processing $file..."
    
    # Create a temporary file
    temp_file="${file}.tmp"
    
    # Remove old footer (everything from <!-- Minimalist Collapsible Footer --> to </body>)
    # Then add new footer before </body>
    awk '
        BEGIN { in_footer = 0; printed_new = 0 }
        /<!-- Minimalist Collapsible Footer -->|<!-- Footer Toggle Script -->|<footer class="footer-minimalist">/ { 
            in_footer = 1
            next
        }
        /<\/body>/ {
            if (!printed_new) {
                print "'"${FOOTER_HTML//$'\n'/\\n}"'"
                printed_new = 1
            }
            print
            next
        }
        /<!-- Bottom Navigation Bar -->|<nav class="bottom-nav">/ {
            in_footer = 1
            next
        }
        /<\/footer>/ {
            in_footer = 0
            next
        }
        /<\/nav>/ && in_footer {
            in_footer = 0
            next
        }
        !in_footer { print }
    ' "$file" > "$temp_file"
    
    # Replace original file with updated one
    mv "$temp_file" "$file"
    
    echo "✓ Updated $file"
}

# Update all files
for file in "${FILES[@]}"; do
    update_file "$file"
done

echo ""
echo "================================"
echo "Footer and bottom nav update complete!"
echo "================================"
echo ""
echo "Updated files:"
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file"
    fi
done
EOF
