/**
 * Ready to Wear Scroll Arrows
 * Handles smooth scrolling for the ready to wear collection section
 */

document.addEventListener('DOMContentLoaded', function() {
    const leftArrow = document.getElementById('readyToWearScrollLeft');
    const rightArrow = document.getElementById('readyToWearScrollRight');
    const container = document.getElementById('readyToWearProductContainer');

    if (!leftArrow || !rightArrow || !container) return;

    function getScrollAmount() {
        return container.clientWidth * 0.8;
    }

    function smoothScroll(element, targetScrollLeft, duration = 400) {
        const startScrollLeft = element.scrollLeft;
        const distance = targetScrollLeft - startScrollLeft;
        const startTime = performance.now();

        function animation(currentTime) {
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            element.scrollLeft = startScrollLeft + (distance * easeOut);
            if (progress < 1) requestAnimationFrame(animation);
        }
        requestAnimationFrame(animation);
    }

    leftArrow.addEventListener('click', () => {
        smoothScroll(container, Math.max(0, container.scrollLeft - getScrollAmount()));
    });

    rightArrow.addEventListener('click', () => {
        const maxScroll = container.scrollWidth - container.clientWidth;
        smoothScroll(container, Math.min(maxScroll, container.scrollLeft + getScrollAmount()));
    });

    function updateArrowVisibility() {
        const scrollLeft = container.scrollLeft;
        const maxScroll = container.scrollWidth - container.clientWidth;
        leftArrow.style.opacity = scrollLeft <= 0 ? '0.5' : '1';
        rightArrow.style.opacity = scrollLeft >= maxScroll ? '0.5' : '1';
    }

    container.addEventListener('scroll', updateArrowVisibility);
    window.addEventListener('resize', updateArrowVisibility);
    setTimeout(updateArrowVisibility, 100);
});