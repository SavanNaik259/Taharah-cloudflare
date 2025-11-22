// Banner rotator script - displays content without scrolling
document.addEventListener('DOMContentLoaded', function() {
    console.log('Banner rotator script loaded');

    // Elements
    const promoBanner = document.querySelector('.promo-banner');
    const bannerText = document.querySelector('.promo-banner .banner-text');

    if (!promoBanner || !bannerText) {
        console.error('Banner elements not found');
        return;
    }

    // Banner content array
    const bannerContents = [
        'Free shipping on orders over ₹50,000',
        'New arrivals for the festive season - <a href="new-arrivals.html">View Collection</a>'
    ];

    let currentIndex = 0;

    // Function to get banner content with translation support
    function getBannerContent(index) {
        // Try to get translations from LanguageTranslator
        if (typeof LanguageTranslator !== 'undefined') {
            const currentLang = LanguageTranslator.getCurrentLanguage();

            // Check if static translations are available
            if (window.staticTranslations && window.staticTranslations[currentLang]) {
                const textKey = `banner_text_${index + 1}`;
                const translatedText = window.staticTranslations[currentLang][textKey];

                if (translatedText) {
                    // For the second banner, add the link
                    if (index === 1) {
                        return `${translatedText} - <a href="new-arrivals.html">View Collection</a>`;
                    }
                    return translatedText;
                }
            }
        }

        // Fallback to default content
        return bannerContents[index];
    }

    // Update banner content
    function updateBanner() {
        bannerText.innerHTML = getBannerContent(currentIndex);
        currentIndex = (currentIndex + 1) % bannerContents.length;
    }

    // Initialize banner
    updateBanner();

    // Rotate banner content every 5 seconds
    setInterval(updateBanner, 5000);

    // Listen for language change events
    document.addEventListener('languageChanged', function() {
        updateBanner();
    });

    console.log('Banner content rotation initialized');
});