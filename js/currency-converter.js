/**
 * Currency Converter Module
 * Provides real-time currency conversion for all prices on the website
 * Uses ExchangeRate-API for live exchange rates
 */

const CurrencyConverter = (function() {
    // Configuration
    const BASE_CURRENCY = 'INR';
    const API_URL = 'https://api.exchangerate-api.com/v4/latest/INR';
    const CACHE_KEY = 'currency_exchange_rates';
    const CACHE_TIMESTAMP_KEY = 'currency_rates_timestamp';
    const SELECTED_CURRENCY_KEY = 'selected_currency';
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    // Supported currencies with symbols and country info
    const CURRENCIES = {
        'INR': { symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳', country: 'India' },
        'USD': { symbol: '$', name: 'US Dollar', flag: '🇺🇸', country: 'United States' },
        'EUR': { symbol: '€', name: 'Euro', flag: '🇪🇺', country: 'Europe' },
        'GBP': { symbol: '£', name: 'British Pound', flag: '🇬🇧', country: 'United Kingdom' },
        'AED': { symbol: 'د.إ', name: 'UAE Dirham', flag: '🇦🇪', country: 'UAE' },
        'CAD': { symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦', country: 'Canada' },
        'AUD': { symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺', country: 'Australia' }
    };

    let exchangeRates = {};
    let currentCurrency = BASE_CURRENCY;
    let isLoading = false;
    let userCountry = null;
    let userCurrency = null;

    /**
     * Initialize the currency converter
     */
    async function init() {
        console.log('Initializing Currency Converter...');

        // Detect user location
        await detectUserLocation();

        // Load selected currency from localStorage
        const savedCurrency = localStorage.getItem(SELECTED_CURRENCY_KEY);
        if (savedCurrency && CURRENCIES[savedCurrency]) {
            currentCurrency = savedCurrency;
        }

        // Load exchange rates
        await loadExchangeRates();

        // Set up UI
        updateCurrencySelector();
        
        // Convert prices on page if not base currency
        if (currentCurrency !== BASE_CURRENCY) {
            convertAllPrices();
        }

        console.log('Currency Converter initialized with currency:', currentCurrency);
    }

    /**
     * Detect user's location and currency
     */
    async function detectUserLocation() {
        try {
            // Try to get location from ipapi.co (free API)
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            
            if (data.country_name && data.currency) {
                userCountry = data.country_name;
                userCurrency = data.currency;
                
                // Save to localStorage
                localStorage.setItem('user_country', userCountry);
                localStorage.setItem('user_detected_currency', userCurrency);
                
                console.log('Detected location:', userCountry, 'Currency:', userCurrency);
            }
        } catch (error) {
            // Fallback to localStorage if API fails
            userCountry = localStorage.getItem('user_country') || 'Unknown';
            userCurrency = localStorage.getItem('user_detected_currency') || 'INR';
            console.log('Using cached location data');
        }
    }

    /**
     * Load exchange rates from API or cache
     */
    async function loadExchangeRates() {
        try {
            // Check cache first
            const cachedRates = localStorage.getItem(CACHE_KEY);
            const cacheTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
            const now = Date.now();

            if (cachedRates && cacheTimestamp) {
                const age = now - parseInt(cacheTimestamp);
                if (age < CACHE_DURATION) {
                    exchangeRates = JSON.parse(cachedRates);
                    console.log('Using cached exchange rates');
                    return;
                }
            }

            // Fetch new rates
            console.log('Fetching fresh exchange rates...');
            const response = await fetch(API_URL);
            const data = await response.json();

            if (data && data.rates) {
                exchangeRates = data.rates;
                
                // Cache the rates
                localStorage.setItem(CACHE_KEY, JSON.stringify(exchangeRates));
                localStorage.setItem(CACHE_TIMESTAMP_KEY, now.toString());
                
                console.log('Exchange rates updated successfully');
            }
        } catch (error) {
            console.error('Error loading exchange rates:', error);
            
            // Try to use cached rates as fallback
            const cachedRates = localStorage.getItem(CACHE_KEY);
            if (cachedRates) {
                exchangeRates = JSON.parse(cachedRates);
                console.log('Using cached rates as fallback');
            } else {
                // Set default rates if no cache available
                exchangeRates = {
                    'INR': 1,
                    'USD': 0.012,
                    'EUR': 0.011,
                    'GBP': 0.0095,
                    'AED': 0.044,
                    'CAD': 0.016,
                    'AUD': 0.018
                };
                console.log('Using default exchange rates');
            }
        }
    }

    /**
     * Convert price from INR to selected currency
     */
    function convertPrice(priceInINR) {
        if (currentCurrency === BASE_CURRENCY) {
            return priceInINR;
        }

        const rate = exchangeRates[currentCurrency];
        if (!rate) {
            console.error('Exchange rate not found for', currentCurrency);
            return priceInINR;
        }

        return priceInINR * rate;
    }

    /**
     * Format price with currency symbol
     */
    function formatPrice(price) {
        const currencyInfo = CURRENCIES[currentCurrency];
        const symbol = currencyInfo ? currencyInfo.symbol : '₹';

        // Format number with proper decimals
        let formattedPrice;
        if (currentCurrency === 'INR') {
            // No decimals for INR
            formattedPrice = Math.round(price).toLocaleString('en-IN');
        } else {
            // 2 decimals for other currencies
            formattedPrice = price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }

        return `${symbol}${formattedPrice}`;
    }

    /**
     * Convert all prices on the page
     */
    function convertAllPrices() {
        isLoading = true;
        
        // Show loading state
        document.body.classList.add('converting-currency');

        // Find all price elements
        const priceSelectors = [
            '.current-price',
            '.original-price',
            '.product-price',
            '.price',
            '.showcase-product-price',
            '.popup-product-price',
            '.cart-item-price',
            '.cart-total-price',
            '.checkout-total',
            '.order-total'
        ];

        priceSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                convertPriceElement(element);
            });
        });

        // Remove loading state
        setTimeout(() => {
            document.body.classList.remove('converting-currency');
            isLoading = false;
        }, 300);
    }

    /**
     * Convert a single price element
     */
    function convertPriceElement(element) {
        // Get original price in INR
        let priceInINR = parseFloat(element.dataset.originalPrice);
        
        // If no original price stored, extract and store it
        if (!priceInINR) {
            const text = element.textContent.trim();
            // Store original full text to preserve labels
            if (!element.dataset.originalText) {
                element.dataset.originalText = text;
            }
            
            // Extract number from text (handles ₹, $, etc.)
            const match = text.match(/[\d,]+\.?\d*/);
            if (match) {
                priceInINR = parseFloat(match[0].replace(/,/g, ''));
                element.dataset.originalPrice = priceInINR;
            } else {
                return; // Skip if can't extract price
            }
        }

        // Convert price
        const convertedPrice = convertPrice(priceInINR);
        const formattedPrice = formatPrice(convertedPrice);
        
        // Preserve labels/text by replacing only the price portion
        const originalText = element.dataset.originalText || element.textContent;
        const originalPriceMatch = originalText.match(/[\d,]+\.?\d*/);
        
        if (originalPriceMatch) {
            // Replace only the price number, keeping labels/prefixes
            const updatedText = originalText.replace(/[₹$€£]?[\d,]+\.?\d*/, formattedPrice);
            element.textContent = updatedText;
        } else {
            // Fallback: just update with formatted price
            element.textContent = formattedPrice;
        }
    }

    /**
     * Change currency
     */
    async function changeCurrency(newCurrency) {
        if (newCurrency === currentCurrency) return;
        
        if (!CURRENCIES[newCurrency]) {
            console.error('Invalid currency:', newCurrency);
            return;
        }

        currentCurrency = newCurrency;
        localStorage.setItem(SELECTED_CURRENCY_KEY, currentCurrency);

        // Update UI
        updateCurrencySelector();

        // Convert all prices
        convertAllPrices();

        console.log('Currency changed to:', currentCurrency);
    }

    /**
     * Update currency selector UI
     */
    function updateCurrencySelector() {
        const selector = document.getElementById('currency-selector');
        if (selector) {
            selector.value = currentCurrency;
            
            // Update options with flags
            Array.from(selector.options).forEach(option => {
                const currCode = option.value;
                const currInfo = CURRENCIES[currCode];
                if (currInfo) {
                    option.textContent = `${currInfo.flag} ${currCode} - ${currInfo.name}`;
                }
            });
        }

        // Update the flag display in bottom nav
        const flagDisplay = document.getElementById('selected-currency-flag');
        if (flagDisplay) {
            const currencyInfo = CURRENCIES[currentCurrency];
            flagDisplay.textContent = currencyInfo.flag;
        }

        // Update the currency code display in bottom nav
        const codeDisplay = document.getElementById('selected-currency-code');
        if (codeDisplay) {
            codeDisplay.textContent = currentCurrency;
        }

        const selectedDisplay = document.getElementById('selected-currency-display');
        if (selectedDisplay) {
            const currencyInfo = CURRENCIES[currentCurrency];
            selectedDisplay.textContent = `${currencyInfo.flag} ${currentCurrency}`;
        }

        // Show user's current location if detected
        showUserLocation();
    }

    /**
     * Display user's current location with flag
     */
    function showUserLocation() {
        const wrapper = document.querySelector('.currency-selector-wrapper');
        if (!wrapper) return;

        // Remove existing location info
        const existingInfo = wrapper.querySelector('.current-location-info');
        if (existingInfo) {
            existingInfo.remove();
        }

        // Add new location info if available
        if (userCountry && userCountry !== 'Unknown') {
            const locationInfo = document.createElement('div');
            locationInfo.className = 'current-location-info';
            
            // Find flag for user's country
            const userFlag = getCountryFlag(userCountry);
            locationInfo.innerHTML = `<span class="location-flag">${userFlag}</span> ${userCountry}`;
            
            wrapper.appendChild(locationInfo);
        }
    }

    /**
     * Get flag emoji for country name
     */
    function getCountryFlag(countryName) {
        const flagMap = {
            'India': '🇮🇳',
            'United States': '🇺🇸',
            'United Kingdom': '🇬🇧',
            'Canada': '🇨🇦',
            'Australia': '🇦🇺',
            'Germany': '🇩🇪',
            'France': '🇫🇷',
            'UAE': '🇦🇪',
            'United Arab Emirates': '🇦🇪',
            'Singapore': '🇸🇬',
            'Malaysia': '🇲🇾',
            'Thailand': '🇹🇭',
            'Japan': '🇯🇵',
            'China': '🇨🇳',
            'South Korea': '🇰🇷',
            'Brazil': '🇧🇷',
            'Mexico': '🇲🇽',
            'Spain': '🇪🇸',
            'Italy': '🇮🇹',
            'Netherlands': '🇳🇱',
            'Switzerland': '🇨🇭',
            'Austria': '🇦🇹',
            'Belgium': '🇧🇪',
            'Sweden': '🇸🇪',
            'Norway': '🇳🇴',
            'Denmark': '🇩🇰',
            'Finland': '🇫🇮',
            'Poland': '🇵🇱',
            'Russia': '🇷🇺',
            'Turkey': '🇹🇷',
            'Saudi Arabia': '🇸🇦',
            'Egypt': '🇪🇬',
            'South Africa': '🇿🇦',
            'Nigeria': '🇳🇬',
            'Kenya': '🇰🇪',
            'Pakistan': '🇵🇰',
            'Bangladesh': '🇧🇩',
            'Sri Lanka': '🇱🇰',
            'Nepal': '🇳🇵',
            'Indonesia': '🇮🇩',
            'Philippines': '🇵🇭',
            'Vietnam': '🇻🇳',
            'New Zealand': '🇳🇿',
            'Argentina': '🇦🇷',
            'Chile': '🇨🇱',
            'Colombia': '🇨🇴',
            'Peru': '🇵🇪'
        };
        
        return flagMap[countryName] || '🌍';
    }

    /**
     * Get current currency
     */
    function getCurrentCurrency() {
        return currentCurrency;
    }

    /**
     * Get currency symbol
     */
    function getCurrencySymbol(currency = currentCurrency) {
        const currencyInfo = CURRENCIES[currency];
        return currencyInfo ? currencyInfo.symbol : '₹';
    }

    /**
     * Get all supported currencies
     */
    function getSupportedCurrencies() {
        return CURRENCIES;
    }

    /**
     * Refresh exchange rates
     */
    async function refreshRates() {
        // Clear cache
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(CACHE_TIMESTAMP_KEY);
        
        // Load fresh rates
        await loadExchangeRates();
        
        // Reconvert prices
        if (currentCurrency !== BASE_CURRENCY) {
            convertAllPrices();
        }
    }

    // Public API
    return {
        init,
        changeCurrency,
        convertPrice,
        formatPrice,
        getCurrentCurrency,
        getCurrencySymbol,
        getSupportedCurrencies,
        refreshRates,
        getCountryFlag,
        CURRENCIES
    };
})();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        CurrencyConverter.init();
    });
} else {
    CurrencyConverter.init();
}

// Make globally available
window.CurrencyConverter = CurrencyConverter;
