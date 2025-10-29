// Banner rotator script
document.addEventListener('DOMContentLoaded', function() {
    console.log('Banner rotator script loaded');
    
    // Elements
    const bannerText = document.querySelector('.promo-banner p');
    const prevButton = document.querySelector('.banner-prev');
    const nextButton = document.querySelector('.banner-next');
    
    let currentBannerIndex = 0;
    
    // Function to get translated banner content
    function getBannerContent(index) {
        const bannerNum = index + 1;
        const textKey = `banner_text_${bannerNum}`;
        const linkKey = `banner_link_${bannerNum}`;
        
        // Try to get translations from LanguageTranslator
        if (typeof LanguageTranslator !== 'undefined') {
            const currentLang = LanguageTranslator.getCurrentLanguage();
            
            // Default English texts
            const defaultTexts = [
                'Save 21% on exclusive selections',
                'Free shipping on orders over ₹1999',
                'New arrivals for the festive season'
            ];
            const defaultLinks = ['Shop Now', 'Learn More', 'View Collection'];
            
            // Get translated text or fallback to English
            let text = defaultTexts[index];
            let link = defaultLinks[index];
            
            // Check if static translations are available
            if (window.staticTranslations && window.staticTranslations[currentLang]) {
                text = window.staticTranslations[currentLang][textKey] || text;
                link = window.staticTranslations[currentLang][linkKey] || link;
            }
            
            return `${text} - <a href="#">${link}</a>`;
        }
        
        // Fallback to English
        const bannerTexts = [
            'Save 21% on exclusive selections - <a href="#">Shop Now</a>',
            'Free shipping on orders over ₹1999 - <a href="#">Learn More</a>',
            'New arrivals for the festive season - <a href="#">View Collection</a>'
        ];
        return bannerTexts[index];
    }
    
    // Function to display a specific banner with fade transition
    function showBanner(index) {
        console.log('Showing banner ' + index);
        
        // Fade out
        bannerText.classList.add('fade-out');
        
        // Wait for fade out to complete then change text and fade in
        setTimeout(function() {
            bannerText.innerHTML = getBannerContent(index);
            
            // Force reflow to ensure the fade-in animation works
            void bannerText.offsetWidth;
            
            // Fade in
            bannerText.classList.remove('fade-out');
            bannerText.classList.add('fade-in');
            
            console.log('Banner content updated to: ' + index);
        }, 300);
    }
    
    // Function to display the next banner
    function nextBanner() {
        currentBannerIndex = (currentBannerIndex + 1) % 3;
        showBanner(currentBannerIndex);
    }
    
    // Function to display the previous banner
    function prevBanner() {
        currentBannerIndex = (currentBannerIndex - 1 + 3) % 3;
        showBanner(currentBannerIndex);
    }
    
    // Listen for language change events
    document.addEventListener('languageChanged', function() {
        showBanner(currentBannerIndex);
    });
    
    // Add event listeners to the buttons
    if (prevButton) {
        prevButton.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Prev banner button clicked');
            prevBanner();
        });
    }
    
    if (nextButton) {
        nextButton.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Next banner button clicked');
            nextBanner();
        });
    }
    
    // Auto-rotate the banner every 5 seconds
    let bannerInterval = setInterval(nextBanner, 5000);
    
    console.log('Banner auto-rotation set up');
    
    // Set initial opacity
    bannerText.classList.add('fade-in');
    
    // Show the first banner after a slight delay for the page to load
    setTimeout(function() {
        showBanner(0);
    }, 500);
});