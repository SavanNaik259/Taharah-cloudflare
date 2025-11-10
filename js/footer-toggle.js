
// Footer Toggle Functionality
document.addEventListener('DOMContentLoaded', function() {
    const footerToggles = document.querySelectorAll('.footer-toggle');

    footerToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const sectionId = this.getAttribute('data-section');
            const content = document.getElementById(sectionId);
            const icon = this.querySelector('i');

            // Toggle active class
            this.classList.toggle('active');

            // Toggle content visibility
            content.classList.toggle('show');

            // Close other sections (accordion behavior)
            footerToggles.forEach(otherToggle => {
                if (otherToggle !== this) {
                    const otherSectionId = otherToggle.getAttribute('data-section');
                    const otherContent = document.getElementById(otherSectionId);
                    otherToggle.classList.remove('active');
                    otherContent.classList.remove('show');
                }
            });
        });
    });

    // Category Subcategory Toggle Functionality
    const categoryToggleIcons = document.querySelectorAll('.category-toggle-icon');

    categoryToggleIcons.forEach(icon => {
        icon.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            console.log('Plus icon clicked');

            // Find the subcategory list
            const categoryItem = this.closest('.category-with-sub');
            if (!categoryItem) {
                console.log('No category-with-sub parent found');
                return;
            }

            const subcategoryList = categoryItem.querySelector('.subcategory-list');
            if (!subcategoryList) {
                console.log('No subcategory-list found');
                return;
            }

            console.log('Subcategory list found:', subcategoryList);

            // Get current state
            const isCurrentlyOpen = subcategoryList.classList.contains('show');
            console.log('Currently open:', isCurrentlyOpen);

            // Close all other subcategories first
            document.querySelectorAll('.subcategory-list.show').forEach(openList => {
                if (openList !== subcategoryList) {
                    openList.classList.remove('show');
                    const otherIcon = openList.closest('.category-with-sub').querySelector('.category-toggle-icon');
                    if (otherIcon) {
                        otherIcon.classList.remove('active');
                    }
                }
            });

            // Toggle current subcategory
            if (isCurrentlyOpen) {
                // Closing
                subcategoryList.classList.remove('show');
                this.classList.remove('active');
                console.log('Closing subcategory');
            } else {
                // Opening
                subcategoryList.classList.add('show');
                this.classList.add('active');
                console.log('Opening subcategory');
            }
        });
    });

    // Prevent category link from navigating when clicking on the category name
    const categoryHeaders = document.querySelectorAll('.category-item-header a');
    categoryHeaders.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            // Trigger the icon click instead
            const icon = this.parentElement.querySelector('.category-toggle-icon');
            if (icon) {
                icon.click();
            }
        });
    });
});
