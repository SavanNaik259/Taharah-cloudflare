
#!/bin/bash

# Shell script to add footer and bottom navigation bar to all collection and subcategory pages
# This script removes old footers and adds standardized footer and bottom nav

# Define the new footer HTML
read -r -d '' FOOTER_HTML << 'EOF'
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
                        <li><a href="contact-us.html">Contact</a></li>
                        <li><a href="book-appointment.html">Book Appointment</a></li>
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
                    <ul class="categories-list">
                        <li class="category-with-sub">
                            <div class="category-item-header">
                                <a href="gold-necklace.html">Necklace</a>
                                <i class="fas fa-chevron-down category-toggle-icon"></i>
                            </div>
                            <ul class="subcategory-list">
                                <li><a href="gold-necklace.html">Gold Necklace</a></li>
                                <li><a href="silver-necklace.html">Silver Necklace</a></li>
                                <li><a href="meenakari-necklace.html">Meenakari Necklace</a></li>
                            </ul>
                        </li>
                        <li class="category-with-sub">
                            <div class="category-item-header">
                                <a href="gold-earrings.html">Earrings</a>
                                <i class="fas fa-chevron-down category-toggle-icon"></i>
                            </div>
                            <ul class="subcategory-list">
                                <li><a href="gold-earrings.html">Gold Earrings</a></li>
                                <li><a href="silver-earrings.html">Silver Earrings</a></li>
                                <li><a href="meenakari-earrings.html">Meenakari Earrings</a></li>
                            </ul>
                        </li>
                        <li class="category-with-sub">
                            <div class="category-item-header">
                                <a href="gold-bangles.html">Bangles</a>
                                <i class="fas fa-chevron-down category-toggle-icon"></i>
                            </div>
                            <ul class="subcategory-list">
                                <li><a href="gold-bangles.html">Gold Bangles</a></li>
                                <li><a href="silver-bangles.html">Silver Bangles</a></li>
                                <li><a href="meenakari-bangles.html">Meenakari Bangles</a></li>
                            </ul>
                        </li>
                        <li class="category-with-sub">
                            <div class="category-item-header">
                                <a href="gold-rings.html">Rings</a>
                                <i class="fas fa-chevron-down category-toggle-icon"></i>
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
                        <li><a href="#">Personal Styling</a></li>
                    </ul>
                </div>
            </div>

            <!-- Follow Us Section -->
            <div class="footer-section">
                <button class="footer-toggle" data-section="social-content">
                    <span class="footer-title">Follow us on social media</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="footer-content" id="social-content">
                    <div class="social-icons">
                        <a href="#" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
                        <a href="#" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
                        <a href="#" aria-label="Pinterest"><i class="fab fa-pinterest-p"></i></a>
                        <a href="#" aria-label="YouTube"><i class="fab fa-youtube"></i></a>
                    </div>
                </div>
            </div>

            <!-- Download App Section -->
            <div class="footer-section">
                <button class="footer-toggle" data-section="app-content">
                    <span class="footer-title">Download Our App</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="footer-content" id="app-content">
                    <div class="app-buttons">
                        <a href="#" class="app-btn">
                            <i class="fab fa-apple"></i>
                            <span>Download on App Store</span>
                        </a>
                        <a href="#" class="app-btn">
                            <i class="fab fa-google-play"></i>
                            <span>Get it on Google Play</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>

        <div class="footer-bottom">
            <div class="container">
                <div class="footer-info">
                    <div class="copyright">
                        <p>&copy; 2025 Royal Meenakari. All rights reserved. | Developed by <a href="https://savannaik.netlify.app/" target="_blank" style="color: #9c7c38; text-decoration: none; font-weight: 500;">Savan Naik</a></p>
                    </div>

                    <div class="footer-links">
                        <a href="terms-conditions.html">Terms and Conditions</a>
                        <a href="privacy-policy.html">Privacy Policy</a>
                    </div>

                    <div class="scroll-top">
                        <button id="scrollTopBtn" aria-label="Scroll to top">
                            <i class="fas fa-arrow-up"></i>
                            <span>UP</span>
                        </button>
                    </div>
                </div>

                <div class="footer-extra">
                    <div class="help-section">
                        <i class="fas fa-question-circle"></i>
                        <span>How can I help you?</span>
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
    </footer>
EOF

# Define the bottom navigation bar HTML
read -r -d '' BOTTOM_NAV_HTML << 'EOF'
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
        <div class="bottom-nav-item currency-selector-wrapper">
            <span id="selected-currency-flag" class="currency-flag-display">🇮🇳</span>
            <span id="selected-currency-code" class="currency-code-display">INR</span>
            <select id="currency-selector" class="currency-select">
                <option value="INR" data-flag="🇮🇳">INR</option>
                <option value="USD" data-flag="🇺🇸">USD</option>
                <option value="EUR" data-flag="🇪🇺">EUR</option>
                <option value="GBP" data-flag="🇬🇧">GBP</option>
                <option value="AUD" data-flag="🇦🇺">AUD</option>
            </select>
        </div>
        <div class="bottom-nav-item language-selector-wrapper">
            <span id="selected-language-flag" class="language-flag-display">🇬🇧</span>
            <span id="selected-language-code" class="language-code-display">EN</span>
            <select id="language-selector" class="language-select">
                <option value="en">EN</option>
                <option value="hi">HI</option>
                <option value="es">ES</option>
                <option value="fr">FR</option>
                <option value="ar">AR</option>
                <option value="de">DE</option>
            </select>
        </div>
        <a href="#" class="bottom-nav-item" id="bottomNavCart">
            <i class="fi fi-rs-shopping-bag"></i>
            <span>Bag</span>
        </a>
    </nav>

    <!-- Footer Toggle Script -->
    <script src="js/footer-toggle.js"></script>
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
    "login.html"
    "signup.html"
    "profile.html"
    "book-appointment.html"
)

echo "Starting footer and bottom nav update process..."

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "Processing $file..."
        
        # Create a temporary file
        temp_file="${file}.tmp"
        
        # Remove old footer (everything between <footer> and </footer>, or <!-- Footer --> and its closing)
        # Then add new footer and bottom nav before </body>
        awk '
            /<footer|<!-- Footer -->/ { in_footer=1; next }
            /<\/footer>|<!-- End Footer -->/ { in_footer=0; next }
            /<!-- Bottom Navigation|<nav class="bottom-nav">/ { in_bottom_nav=1; next }
            /<\/nav>/ && in_bottom_nav { in_bottom_nav=0; next }
            /<\/body>/ {
                print "'"$FOOTER_HTML"'"
                print ""
                print "'"$BOTTOM_NAV_HTML"'"
                print ""
            }
            !in_footer && !in_bottom_nav { print }
        ' "$file" > "$temp_file"
        
        # Replace original file with updated content
        mv "$temp_file" "$file"
        
        echo "✓ Updated $file"
    else
        echo "✗ File not found: $file"
    fi
done

echo ""
echo "Footer and bottom nav update complete!"
echo "All files have been updated with the new footer and bottom navigation bar."
EOF
