// Banner rotator script with continuous auto-scroll animation
document.addEventListener('DOMContentLoaded', function() {
    console.log('Banner rotator script loaded');

    // Elements
    const bannerText = document.querySelector('.promo-banner .banner-text');

    if (!bannerText) {
        console.error('Banner text element not found');
        return;
    }

    let currentBannerIndex = 0;

    // Banner content array
    const bannerContents = [
        'Free shipping on orders over ₹50,000',
        'New arrivals for the festive season - <a href="new-arrivals.html">View Collection</a>'
    ];

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

    // Function to display a specific banner with smooth fade transition
    function showBanner(index) {
        console.log('Showing banner ' + index);

        // Fade out
        bannerText.style.opacity = '0';

        // Wait for fade out to complete then change text and fade in
        setTimeout(function() {
            bannerText.innerHTML = getBannerContent(index);

            // Fade in
            bannerText.style.opacity = '1';

            console.log('Banner content updated to: ' + index);
        }, 500);
    }

    // Function to display the next banner
    function nextBanner() {
        currentBannerIndex = (currentBannerIndex + 1) % 2;
        showBanner(currentBannerIndex);
    }

    // Listen for language change events
    document.addEventListener('languageChanged', function() {
        showBanner(currentBannerIndex);
    });

    // Set initial opacity and show first banner
    bannerText.style.opacity = '1';
    bannerText.style.transition = 'opacity 0.5s ease-in-out';

    // Show the first banner
    showBanner(0);

    // Auto-rotate the banner every 4 seconds (4000ms)
    setInterval(nextBanner, 4000);

    console.log('Banner auto-rotation set up with continuous scrolling');
});