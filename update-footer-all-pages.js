
const fs = require('fs');
const path = require('path');

const footerHTML = `
    <!-- Minimalist Collapsible Footer -->
    <footer class="footer">
        <div class="footer-container">
            <button class="footer-toggle" aria-label="Toggle footer">
                <span class="footer-toggle-text">Info</span>
                <i class="fi fi-rs-angle-small-down"></i>
            </button>
            
            <div class="footer-content">
                <div class="footer-section">
                    <h3>Categories</h3>
                    <ul>
                        <li><a href="gold-necklace.html">Gold Necklace</a></li>
                        <li><a href="gold-earrings.html">Gold Earrings</a></li>
                        <li><a href="gold-rings.html">Gold Rings</a></li>
                        <li><a href="gold-bangles.html">Gold Bangles</a></li>
                    </ul>
                </div>

                <div class="footer-section">
                    <h3>Collection</h3>
                    <ul>
                        <li><a href="featured-collection.html">Featured Collection</a></li>
                        <li><a href="new-arrivals.html">New Arrivals</a></li>
                        <li><a href="saree-collection.html">Saree Collection</a></li>
                    </ul>
                </div>

                <div class="footer-section">
                    <h3>Exclusive benefits</h3>
                    <ul>
                        <li><a href="about-us.html">About Us</a></li>
                        <li><a href="contact-us.html">Contact Us</a></li>
                        <li><a href="book-appointment.html">Book Appointment</a></li>
                    </ul>
                </div>

                <div class="footer-section social-section">
                    <h3>Follow us on social media</h3>
                    <div class="social-links">
                        <a href="#" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
                        <a href="#" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
                        <a href="#" aria-label="Twitter"><i class="fab fa-twitter"></i></a>
                        <a href="#" aria-label="Pinterest"><i class="fab fa-pinterest-p"></i></a>
                    </div>
                    
                    <div class="app-download">
                        <h3>Download Our App</h3>
                        <div class="app-buttons">
                            <a href="#" class="app-store">
                                <i class="fab fa-apple"></i>
                                <span>Download on<br><strong>App Store</strong></span>
                            </a>
                            <a href="#" class="play-store">
                                <i class="fab fa-google-play"></i>
                                <span>Get it on<br><strong>Google Play</strong></span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <div class="footer-bottom">
                <div class="copyright">
                    <p>&copy; 2025 Royal Meenakari. All rights reserved. | Developed by <a href="https://savannaik.netlify.app/" target="_blank" style="color: #9c7c38; text-decoration: none; font-weight: 500;">Savan Naik</a></p>
                </div>

                <div class="footer-links">
                    <a href="terms-conditions.html">Terms and Conditions</a>
                    <a href="privacy-policy.html">Privacy Policy</a>
                </div>

                <button class="back-to-top" onclick="window.scrollTo({top: 0, behavior: 'smooth'})" aria-label="Back to top">
                    <span>UP</span>
                    <i class="fi fi-rs-angle-small-up"></i>
                </button>
            </div>
        </div>
    </footer>

    <!-- Bottom Navigation Bar -->
    <nav class="bottom-nav">
        <a href="index.html" class="bottom-nav-item">
            <i class="fi fi-rs-home"></i>
            <span data-translate="home">Home</span>
        </a>
        <a href="all-collection.html" class="bottom-nav-item">
            <i class="fi fi-rs-shopping-cart"></i>
            <span data-translate="shop">Shop</span>
        </a>
        <a href="https://wa.me/919310250047?text=Hi! I need help. Can you assist me?" class="bottom-nav-item chat-btn">
            <i class="fab fa-whatsapp"></i>
            <span data-translate="help">How can I help you?</span>
        </a>
        <a href="profile.html" class="bottom-nav-item">
            <i class="fi fi-rs-user"></i>
            <span data-translate="account">Account</span>
        </a>
        <div class="bottom-nav-item currency-selector-wrapper">
            <span id="selected-currency-flag" class="currency-flag-display">🇮🇳</span>
            <span id="selected-currency-code" class="currency-code-display">INR</span>
            <select id="currency-selector" class="currency-select" onchange="CurrencyConverter.changeCurrency(this.value)">
                <option value="INR">🇮🇳 INR - Indian Rupee</option>
                <option value="USD">🇺🇸 USD</option>
                <option value="EUR">🇪🇺 EUR</option>
                <option value="GBP">🇬🇧 GBP</option>
                <option value="AUD">🇦🇺 AUD</option>
            </select>
        </div>
        <div class="bottom-nav-item language-selector-wrapper">
            <span id="selected-language-flag" class="language-flag-display">🇬🇧</span>
            <span id="selected-language-code" class="language-code-display">EN</span>
            <select id="language-selector" class="language-select" onchange="LanguageTranslator.changeLanguage(this.value)">
                <option value="en">🇬🇧 EN - English</option>
                <option value="hi">🇮🇳 HI</option>
                <option value="es">🇪🇸 ES</option>
                <option value="fr">🇫🇷 FR</option>
                <option value="ar">🇦🇪 AR</option>
                <option value="de">🇩🇪 DE</option>
            </select>
        </div>
        <a href="#" class="bottom-nav-item" id="bottomNavCart">
            <i class="fi fi-rs-shopping-bag"></i>
            <span data-translate="bag">Bag</span>
        </a>
    </nav>

    <!-- Footer Toggle Script -->
    <script src="js/footer-toggle.js"></script>
`;

const pagesToUpdate = [
    'all-collection.html',
    'featured-collection.html',
    'new-arrivals.html',
    'saree-collection.html',
    'gold-necklace.html',
    'gold-earrings.html',
    'gold-rings.html',
    'gold-bangles.html',
    'silver-necklace.html',
    'silver-earrings.html',
    'silver-rings.html',
    'silver-bangles.html',
    'meenakari-necklace.html',
    'meenakari-earrings.html',
    'meenakari-rings.html',
    'meenakari-bangles.html',
    'about-us.html',
    'contact-us.html'
];

console.log('Starting footer update process...\n');

pagesToUpdate.forEach(file => {
    const filePath = path.join(__dirname, file);
    
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Skipping ${file} - file not found`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove old footer if exists
    content = content.replace(/<footer[\s\S]*?<\/footer>/gi, '');
    content = content.replace(/<nav class="bottom-nav">[\s\S]*?<\/nav>/gi, '');
    content = content.replace(/<!-- Footer Toggle Script -->\s*<script src="js\/footer-toggle.js"><\/script>/gi, '');
    content = content.replace(/<!-- Minimalist Collapsible Footer -->/gi, '');
    
    // Add new footer and nav before closing body tag
    if (content.includes('</body>')) {
        content = content.replace('</body>', footerHTML + '\n</body>');
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Updated ${file}`);
    } else {
        console.log(`⚠️  Skipping ${file} - no closing body tag found`);
    }
});

console.log('\n✨ Footer update complete!');
