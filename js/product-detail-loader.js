/**
 * Product Detail Loader
 * Loads individual product details from Firebase Storage
 */

const ProductDetailLoader = (function() {
    let isInitialized = false;

    /**
     * Initialize the product detail loader
     */
    function init() {
        console.log('Initializing Product Detail Loader...');
        isInitialized = true;
        return true;
    }

    /**
     * Get product ID from URL with comprehensive logging
     */
    function getProductIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');

        console.log('=== PRODUCT DETAIL PAGE LOADING ===');
        console.log('📍 Current URL:', window.location.href);
        console.log('🔍 All URL params:', Array.from(urlParams.entries()));
        console.log('📦 Product ID from URL:', productId);

        if (!productId) {
            console.error('❌ No product ID found in URL');
            console.log('💡 URL should be: product-detail?id=YOUR_SKU');
            updatePlaceholders();
            return;
        }

        console.log('✅ Product ID detected:', productId);
        console.log('🔄 Starting product search across all categories...');
        return productId;
    }

    /**
     * Determine all possible categories to search
     */
    function getCategoriesForProduct(productId) {
        // Define all possible categories including subcategories
        const allCategories = [
            'pakistani-pret-wear',
            'ready-to-wear',
            'party-wear',
            'modest-wear',
            'featured-collection',
            'new-arrivals',
            'saree-collection',
            'gold-necklace',
            'silver-necklace',
            'meenakari-necklace',
            'gold-earrings',
            'silver-earrings',
            'meenakari-earrings',
            'gold-bangles',
            'silver-bangles',
            'meenakari-bangles',
            'gold-rings',
            'silver-rings',
            'meenakari-rings'
        ];

        if (!productId) return allCategories;

        const id = productId.toUpperCase();
        console.log('🔍 Determining search categories for product ID:', id);

        // Check product ID prefix to prioritize search order
        if (id.startsWith('PAK-')) {
            console.log('📂 Product is from Pakistani Pret Wear');
            return ['pakistani-pret-wear', ...allCategories.filter(c => c !== 'pakistani-pret-wear')];
        }
        if (id.startsWith('RTW-')) {
            console.log('📂 Product is from Ready To Wear');
            return ['ready-to-wear', ...allCategories.filter(c => c !== 'ready-to-wear')];
        }
        if (id.startsWith('PTY-')) {
            console.log('📂 Product is from Party Wear');
            return ['party-wear', ...allCategories.filter(c => c !== 'party-wear')];
        }
        if (id.startsWith('MOD-')) {
            console.log('📂 Product is from Modest Wear');
            return ['modest-wear', ...allCategories.filter(c => c !== 'modest-wear')];
        }
        if (id.startsWith('FEA-')) {
            console.log('📂 Product is from Featured Collection');
            return ['featured-collection', ...allCategories.filter(c => c !== 'featured-collection')];
        }
        if (id.startsWith('NEW-')) {
            console.log('📂 Product is from New Arrivals');
            return ['new-arrivals', ...allCategories.filter(c => c !== 'new-arrivals')];
        }
        if (id.startsWith('SAR-') || id.startsWith('POL-')) {
            console.log('📂 Product is from Saree Collection');
            return ['saree-collection', ...allCategories.filter(c => c !== 'saree-collection')];
        }
        if (id.startsWith('GOL-')) {
            console.log('📂 Product is Gold category');
            return ['gold-necklace', 'gold-earrings', 'gold-bangles', 'gold-rings', ...allCategories.filter(c => !c.startsWith('gold'))];
        }
        if (id.startsWith('SIL-')) {
            console.log('📂 Product is Silver category');
            return ['silver-necklace', 'silver-earrings', 'silver-bangles', 'silver-rings', ...allCategories.filter(c => !c.startsWith('silver'))];
        }
        if (id.startsWith('MEE-')) {
            console.log('📂 Product is Meenakari category');
            return ['meenakari-necklace', 'meenakari-earrings', 'meenakari-bangles', 'meenakari-rings', ...allCategories.filter(c => !c.startsWith('meenakari'))];
        }

        return allCategories;
    }

    /**
     * Load product data from Firebase Storage via Netlify function
     */
    async function loadProductData(productId, forceRefresh = false) {
        if (!productId) {
            console.error('No product ID provided');
            return null;
        }

        const searchCategories = getCategoriesForProduct(productId);
        console.log(`Searching for product ${productId} in categories:`, searchCategories);

        for (const category of searchCategories) {
            try {
                console.log(`🔍 Searching category: ${category} for SKU: ${productId}`);
                
                // Prepare request options
                const requestOptions = {
                    method: 'GET',
                    cache: forceRefresh ? 'no-store' : 'default'
                };

                // Add cache-busting and headers if force refresh
                let endpoint = `/.netlify/functions/load-products?category=${category}`;
                if (forceRefresh) {
                    endpoint += `&cacheBust=${Date.now()}`;
                    requestOptions.headers = {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    };
                }

                const response = await fetch(endpoint, requestOptions);

                if (!response.ok) {
                    console.warn(`⚠️ Failed to load category ${category}:`, response.status);
                    continue;
                }

                const data = await response.json();
                console.log(`📊 Category ${category} loaded:`, data.success ? `${data.products?.length || 0} products` : 'failed');

                if (data.success && data.products && data.products.length > 0) {
                    console.log(`🔎 Searching ${data.products.length} products in ${category} for SKU: ${productId}`);

                    const product = data.products.find(p => {
                        const matches = p.id === productId;
                        if (matches) {
                            console.log(`✅ PRODUCT FOUND in ${category}!`);
                        }
                        return matches;
                    });

                    if (product) {
                        console.log(`🎉 Successfully found and loading product:`, product.name);
                        return product;
                    }
                }
            } catch (error) {
                console.error(`Error loading from category ${category}:`, error);
                continue;
            }
        }

        // If not found and we haven't tried force refresh yet, try one more time without cache
        if (!forceRefresh) {
            console.log('🔄 Product not found in initial search. Retrying with cache bypass...');
            return await loadProductData(productId, true);
        }

        console.error(`Product with ID ${productId} not found in any category even after cache bypass`);
        return null;
    }

    /**
     * Update the product detail page with loaded data
     */
    function updateProductDetailPage(product) {
        if (!product) {
            console.error('No product data to display');
            showErrorState();
            return;
        }

        // Make product data available globally for cart functionality
        window.productDetails = {
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image || product.mainImage || (product.images && product.images[0] ? product.images[0].url : '')
        };
        console.log('Made product details available globally:', window.productDetails);

        // Normalize product data structure for admin panel compatibility
        if (!product.image && product.mainImage) {
            product.image = product.mainImage;
            console.log('Normalized product.image from mainImage:', product.image);
        } else if (!product.image && product.images && product.images.length > 0) {
            product.image = product.images[0].url;
            console.log('Normalized product.image from images array:', product.image);
        }

        console.log('Updating page with product:', product);

        // Update product category (Moved up to ensure it's available for other elements)
        let categoryName = 'Unknown';
        const id = product.id ? product.id.toUpperCase() : '';

        // Prioritize SKU prefix over product.category property for ALL specific collections
        if (id.startsWith('PAK-') || id.startsWith('PAKISTANI-') || id.startsWith('PPT-')) {
            categoryName = 'Pakistani Pret Wear';
        } else if (id.startsWith('RTW-') || id.startsWith('READY-')) {
            categoryName = 'Ready To Wear';
        } else if (id.startsWith('PTY-') || id.startsWith('PARTY-') || id.startsWith('PTW-')) {
            categoryName = 'Party Wear';
        } else if (id.startsWith('MOD-') || id.startsWith('MODEST-') || id.startsWith('MDW-')) {
            categoryName = 'Modest Wear';
        } else if (id.startsWith('FEA-') || id.startsWith('FEATURED-')) {
            categoryName = 'Featured Collection';
        } else if (id.startsWith('NEW-') || id.startsWith('ARRIVAL-')) {
            categoryName = 'New Arrivals';
        } else if (id.startsWith('SAR-') || id.startsWith('POL-') || id.startsWith('SAREE-')) {
            categoryName = 'Saree Collection';
        } else if (product.category) {
            // Fallback to normalized category property if no SKU prefix match
            const normalizedCategory = product.category.toLowerCase().trim();
            if (normalizedCategory === 'pakistani-pret-wear' || normalizedCategory === 'pakistani pret wear') {
                categoryName = 'Pakistani Pret Wear';
            } else if (normalizedCategory === 'ready-to-wear' || normalizedCategory === 'ready to wear') {
                categoryName = 'Ready To Wear';
            } else if (normalizedCategory === 'party-wear' || normalizedCategory === 'party wear') {
                categoryName = 'Party Wear';
            } else if (normalizedCategory === 'modest-wear' || normalizedCategory === 'modest wear') {
                categoryName = 'Modest Wear';
            } else {
                categoryName = product.category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }
        } else if (id) {
            const searchCategories = getCategoriesForProduct(product.id);
            if (searchCategories.length > 0) {
                categoryName = searchCategories[0].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }
        }

        // Update product name
        const nameElements = document.querySelectorAll('.product-detail-info .product-title, .product-detail-info .product-name, .product-detail-info h1');
        nameElements.forEach(element => {
            element.textContent = product.name;
            console.log('Updated main product name element');
        });

        // Update product price
        const priceElements = document.querySelectorAll('.product-detail-info .product-price, .product-detail-info .current-price, .product-detail-info .price');
        if (priceElements.length > 0) {
            const formattedPrice = new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 0
            }).format(product.price).replace('₹', '');

            priceElements.forEach(element => {
                element.textContent = `Rs. ${formattedPrice}`;
                console.log('Updated product price element:', `Rs. ${formattedPrice}`);
            });
        }

        // Update product description
        const descriptionSection = document.querySelector('.product-description');
        if (descriptionSection) {
            // Find or create the description paragraph
            let descriptionPara = descriptionSection.querySelector('p');
            if (!descriptionPara) {
                descriptionPara = document.createElement('p');
                descriptionSection.appendChild(descriptionPara);
            }
            descriptionPara.textContent = product.description || 'No description available.';

            // Ensure the heading exists
            let descriptionHeading = descriptionSection.querySelector('h3');
            if (!descriptionHeading) {
                descriptionHeading = document.createElement('h3');
                descriptionHeading.textContent = 'Product Description';
                descriptionSection.insertBefore(descriptionHeading, descriptionPara);
            }
            console.log('Updated product description with heading and content');
        }

        // Update main product image - check multiple possible image properties
        const imageUrl = product.image || product.imageUrl || product.mainImage || (product.images && product.images[0] && product.images[0].url);
        const mainImageElements = document.querySelectorAll('.product-detail-left .product-main-image, .product-detail-left .main-image img, .product-detail-left .gallery-main img');

        if (mainImageElements.length > 0 && imageUrl) {
            mainImageElements.forEach(img => {
                img.src = imageUrl;
                img.alt = product.name;
                img.style.display = 'block';
                console.log('Updated main product image element with URL:', imageUrl);
            });
        } else {
            // Hide image elements when no image is available
            mainImageElements.forEach(img => {
                img.style.display = 'none';
                img.src = '';
                img.alt = '';
            });
            console.log('No image URL found, hiding image elements');
        }

        // Handle multiple images if available - avoid calling gallery update multiple times
        if (product.images && Array.isArray(product.images) && product.images.length > 0) {
            console.log('Product has multiple images:', product.images.length);
            // Check for duplicate images in the array
            const uniqueImages = product.images.filter((image, index, self) => 
                index === self.findIndex(img => img.url === image.url)
            );
            if (uniqueImages.length !== product.images.length) {
                console.log(`Removed ${product.images.length - uniqueImages.length} duplicate images from product data`);
            }
            updateImageGallery(uniqueImages);
            
            // Set up scroll buttons
            setupScrollButtons(uniqueImages);
        } else if (product.image) {
            // Single image fallback
            console.log('Product has single image, creating gallery');
            const singleImageArr = [{
                url: product.image,
                isMain: true,
                alt: product.name
            }];
            updateImageGallery(singleImageArr);
            setupScrollButtons(singleImageArr);
        }

    function setupScrollButtons(images) {
        const prevBtn = document.getElementById('prev-product-image');
        const nextBtn = document.getElementById('next-product-image');
        
        if (!prevBtn || !nextBtn) return;

        if (images.length <= 1) {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
            return;
        }

        prevBtn.style.display = 'flex';
        nextBtn.style.display = 'flex';

        let currentIndex = 0;

        const updateImage = (index) => {
            const mainImg = document.querySelector('.product-main-image');
            if (mainImg && images[index]) {
                mainImg.src = images[index].url;
                currentIndex = index; // Sync current index
                
                // Highlight corresponding thumbnail if it exists
                const thumbnails = document.querySelectorAll('.thumbnail-item');
                thumbnails.forEach((thumb, i) => {
                    const thumbImg = thumb.querySelector('img');
                    if (thumbImg) {
                        const isMatch = thumbImg.src === images[index].url;
                        thumb.style.opacity = isMatch ? '1' : '0.6';
                        thumb.style.borderColor = isMatch ? '#000' : 'transparent';
                        
                        // Scroll thumbnail into view if needed
                        if (isMatch) {
                            thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                        }
                    }
                });
            }
        };

        // Reset click handlers to avoid stacking
        prevBtn.onclick = (e) => {
            if (e) e.preventDefault();
            currentIndex = (currentIndex - 1 + images.length) % images.length;
            updateImage(currentIndex);
        };

        nextBtn.onclick = (e) => {
            if (e) e.preventDefault();
            currentIndex = (currentIndex + 1) % images.length;
            updateImage(currentIndex);
        };
        
        // Listen for thumbnail clicks to sync currentIndex
        const thumbnailContainer = document.querySelector('.product-thumbnails');
        if (thumbnailContainer) {
            // Remove old listener if any (by cloning or just being careful with delegation)
            const newThumbnailContainer = thumbnailContainer.cloneNode(true);
            thumbnailContainer.parentNode.replaceChild(newThumbnailContainer, thumbnailContainer);
            
            newThumbnailContainer.addEventListener('click', (e) => {
                const thumb = e.target.closest('.thumbnail-item');
                if (thumb) {
                    const thumbImg = thumb.querySelector('img');
                    if (thumbImg) {
                        currentIndex = images.findIndex(img => img.url === thumbImg.src);
                        if (currentIndex === -1) currentIndex = 0;
                        updateImage(currentIndex);
                    }
                }
            });
        }
    }

        // Update category information
        const categoryElements = document.querySelectorAll('.meta-value');
        if (categoryElements.length > 0) {
            // Find the category meta item by looking at its sibling label
            let categoryUpdated = false;
            const metaItems = document.querySelectorAll('.meta-item');
            
            metaItems.forEach(item => {
                const label = item.querySelector('.meta-label');
                const value = item.querySelector('.meta-value');
                if (label && label.textContent.includes('Category:') && value) {
                    value.textContent = categoryName;
                    categoryUpdated = true;
                    console.log('Updated category to:', categoryName);
                }
            });

            // Fallback to the 4th child if the label check failed
            if (!categoryUpdated) {
                const categoryMetaItem = document.querySelector('.meta-item:nth-child(4) .meta-value');
                if (categoryMetaItem) {
                    categoryMetaItem.textContent = categoryName;
                    console.log('Updated category via nth-child to:', categoryName);
                }
            }
        }

        // Update SKU information
        const skuElements = document.querySelectorAll('.meta-item:nth-child(3) .meta-value');
        if (skuElements.length > 0) {
            const skuValue = product.id || 'N/A';
            skuElements[0].textContent = skuValue;
            console.log('Updated SKU to:', skuValue);
        }

        // Render product options (Size, Colour, Dupatta)
        renderProductOptions(product);

        // Update page title
        if (product.name) {
            document.title = `${product.name} - Taharah`;
        }

        // Set the product ID on the detail container for wishlist functionality
        const detailContainer = document.querySelector('.product-detail-container');
        if (detailContainer && product.id) {
            detailContainer.dataset.productId = product.id;
        }

        // Update wishlist button state after page loads
        setTimeout(() => {
            updateWishlistButtonState(product.id);
        }, 500);

        console.log('Product detail page updated successfully');
    }

    /**
     * Render product options for selection
     */
    function renderProductOptions(product) {
        const optionsContainer = document.getElementById('product-options');
        if (!optionsContainer) return;

        let hasOptions = false;

        // Size selection
        const sizeContainer = document.getElementById('size-selection');
        if (product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0) {
            const sizeList = sizeContainer.querySelector('.size-options');
            sizeList.innerHTML = product.sizes.map(size => `
                <button class="option-btn size-btn" data-value="${size}" style="padding: 5px 15px; border: 1px solid #ddd; background: #fff; cursor: pointer; border-radius: 4px;">${size}</button>
            `).join('');
            sizeContainer.style.display = 'block';
            hasOptions = true;

            // Add click listeners
            sizeList.querySelectorAll('.size-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    sizeList.querySelectorAll('.size-btn').forEach(b => b.style.borderColor = '#ddd');
                    btn.style.borderColor = '#000';
                    window.selectedSize = btn.dataset.value;
                });
            });
        }

        // Colour selection
        const colourContainer = document.getElementById('colour-selection');
        if (product.colours && Array.isArray(product.colours) && product.colours.length > 0) {
            const colourList = colourContainer.querySelector('.colour-options');
            colourList.innerHTML = product.colours.map(colour => `
                <button class="option-btn colour-btn" data-value="${colour}" style="padding: 5px 15px; border: 1px solid #ddd; background: #fff; cursor: pointer; border-radius: 4px;">${colour}</button>
            `).join('');
            colourContainer.style.display = 'block';
            hasOptions = true;

            // Add click listeners
            colourList.querySelectorAll('.colour-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    colourList.querySelectorAll('.colour-btn').forEach(b => b.style.borderColor = '#ddd');
                    btn.style.borderColor = '#000';
                    window.selectedColour = btn.dataset.value;
                    
                    // Filter gallery images by color
                    if (product.images && product.images.length > 0) {
                        const filteredImages = product.images.filter(img => 
                            !img.color || img.color.toLowerCase() === window.selectedColour.toLowerCase()
                        );
                        if (filteredImages.length > 0) {
                            updateImageGallery(filteredImages);
                            setupScrollButtons(filteredImages);
                        } else {
                            // Fallback to all images if none match
                            updateImageGallery(product.images);
                            setupScrollButtons(product.images);
                        }
                    }
                });
            });
        }

        // Dupatta selection
        const dupattaContainer = document.getElementById('dupatta-selection');
        if (product.dupattaOptions && Array.isArray(product.dupattaOptions) && product.dupattaOptions.length > 0) {
            const dupattaList = dupattaContainer.querySelector('.dupatta-options');
            dupattaList.innerHTML = product.dupattaOptions.map(option => `
                <button class="option-btn dupatta-btn" data-value="${option}" style="padding: 5px 15px; border: 1px solid #ddd; background: #fff; cursor: pointer; border-radius: 4px;">${option}</button>
            `).join('');
            dupattaContainer.style.display = 'block';
            hasOptions = true;

            // Add click listeners
            dupattaList.querySelectorAll('.dupatta-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    dupattaList.querySelectorAll('.dupatta-btn').forEach(b => b.style.borderColor = '#ddd');
                    btn.style.borderColor = '#000';
                    window.selectedDupatta = btn.dataset.value;
                });
            });
        }

        optionsContainer.style.display = hasOptions ? 'block' : 'none';
    }

    /**
     * Update image gallery with multiple images
     */
    function updateImageGallery(images) {
        console.log('Updating image gallery with', images.length, 'images');

        // Find main image element directly and in containers
        const directMainImages = document.querySelectorAll('.product-detail-left .product-main-image');
        const mainImageContainers = document.querySelectorAll('.product-detail-left .main-image, .product-detail-left .gallery-main');

        if (images.length > 0) {
            const mainImage = images.find(img => img.isMain) || images[0];

            // Update direct main image elements
            directMainImages.forEach(img => {
                if (mainImage.url) {
                    img.src = mainImage.url;
                    img.alt = mainImage.alt || 'Product image';
                    img.style.display = 'block';
                    console.log('Updated direct main image element');
                } else {
                    img.style.display = 'none';
                    img.src = '';
                    img.alt = '';
                }
            });

            // Update main images in containers
            mainImageContainers.forEach(container => {
                const mainImg = container.querySelector('img');
                if (mainImg) {
                    if (mainImage.url) {
                        mainImg.src = mainImage.url;
                        mainImg.alt = mainImage.alt || 'Product image';
                        mainImg.style.display = 'block';
                        console.log('Updated main image in container');
                    } else {
                        mainImg.style.display = 'none';
                        mainImg.src = '';
                        mainImg.alt = '';
                    }
                }
            });
        } else {
            // Hide all images when no images are provided
            directMainImages.forEach(img => {
                img.style.display = 'none';
                img.src = '';
                img.alt = '';
            });

            mainImageContainers.forEach(container => {
                const mainImg = container.querySelector('img');
                if (mainImg) {
                    mainImg.style.display = 'none';
                    mainImg.src = '';
                    mainImg.alt = '';
                }
            });
        }

        // Find thumbnail container and handle multiple images
        const thumbnailContainers = document.querySelectorAll('.thumbnail-gallery, .product-thumbnails, .gallery-thumbs');
        console.log('Found thumbnail containers:', thumbnailContainers.length);

        if (thumbnailContainers.length > 0) {
            thumbnailContainers.forEach((container, containerIndex) => {
                // Clear existing thumbnails to prevent duplicates
                container.innerHTML = '';
                console.log(`Cleared thumbnail container ${containerIndex + 1}`);

                // Only show thumbnails if there are multiple images
                if (images.length > 1) {
                    // Remove duplicate images based on URL
                    const uniqueImages = images.filter((image, index, self) => 
                        index === self.findIndex(img => img.url === image.url)
                    );

                    console.log(`Creating ${uniqueImages.length} unique thumbnails out of ${images.length} total images`);

                    uniqueImages.forEach((image, index) => {
                        const thumbnailElement = document.createElement('div');
                        thumbnailElement.className = `thumbnail ${image.isMain ? 'active' : ''}`;
                        thumbnailElement.innerHTML = `
                            ${image.url ? `<img src="${image.url}" alt="${image.alt || `View ${index + 1}`}" loading="lazy">` : ''}
                        `;

                        // Add click handler to change main image
                        thumbnailElement.addEventListener('click', () => {
                            // Update main image - include direct .product-main-image selector
                            const allMainImgs = document.querySelectorAll('.product-detail-left .product-main-image, .product-detail-left .main-image img, .product-detail-left .gallery-main img');
                            allMainImgs.forEach(img => {
                                img.src = image.url;
                                img.alt = image.alt || 'Product image';
                            });

                            // Update active thumbnail
                            document.querySelectorAll('.thumbnail').forEach(thumb => thumb.classList.remove('active'));
                            thumbnailElement.classList.add('active');

                            console.log('Thumbnail clicked, updated main image to:', image.url);
                        });

                        container.appendChild(thumbnailElement);
                    });

                    console.log(`Updated thumbnail gallery in container ${containerIndex + 1} with ${uniqueImages.length} thumbnails`);
                } else {
                    console.log(`Only one image, not showing thumbnails in container ${containerIndex + 1}`);
                }
            });
        } else {
            console.log('No thumbnail containers found');
        }
    }

    /**
     * Update wishlist button state on product detail page
     */
    function updateWishlistButtonState(productId) {
        if (!productId) return;

        const wishlistButton = document.querySelector('.add-to-wishlist-btn');
        if (!wishlistButton) return;

        // Check if WishlistManager is available and if product is in wishlist
        if (typeof window.WishlistManager !== 'undefined') {
            const isInWishlist = window.WishlistManager.isInWishlist(productId);
            console.log('Updating wishlist button state for product', productId, 'isInWishlist:', isInWishlist);

            if (isInWishlist) {
                wishlistButton.innerHTML = '<i class="fas fa-heart"></i> REMOVE FROM WISHLIST';
            } else {
                wishlistButton.innerHTML = '<i class="fas fa-heart"></i> ADD TO WISHLIST';
            }
        }
    }

    /**
     * Update placeholders when no product data is available
     */
    function updatePlaceholders() {
        // Update loading placeholders to show "Not Available"
        const skuElements = document.querySelectorAll('.meta-item:nth-child(3) .meta-value');
        if (skuElements.length > 0) {
            skuElements[0].textContent = 'Not Available';
        }

        const categoryElements = document.querySelectorAll('.meta-item:nth-child(4) .meta-value');
        if (categoryElements.length > 0) {
            categoryElements[0].textContent = 'Not Available';
        }

        console.log('Updated placeholders to show "Not Available"');
    }

    /**
     * Show error state when product cannot be loaded
     */
    function showErrorState() {
        updatePlaceholders();
        const mainContainers = document.querySelectorAll('.product-detail-container, .product-container, main');
        if (mainContainers.length > 0) {
            mainContainers[0].innerHTML = `
                <div class="error-state" style="text-align: center; padding: 50px 20px;">
                    <h2>Product Not Found</h2>
                    <p>Sorry, we couldn't find the product you're looking for.</p>
                    <a href="/" class="btn btn-primary" style="display: inline-block; padding: 10px 20px; background: #5a3f2a; color: white; text-decoration: none; border-radius: 5px;">Return to Homepage</a>
                </div>
            `;
        }
    }

    /**
     * Load and display product details
     */
    async function loadAndDisplayProduct() {
        console.log('Starting product detail loading process...');

        const productId = getProductIdFromURL();
        if (!productId) {
            // Error already logged in getProductIdFromURL
            showErrorState();
            return;
        }

        console.log('Loading product with ID:', productId);

        // Show loading state
        const mainContainers = document.querySelectorAll('.product-detail-container, .product-container, main');
        if (mainContainers.length > 0) {
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'loading-state';
            loadingDiv.style.cssText = 'text-align: center; padding: 50px 20px;';
            loadingDiv.innerHTML = `
                <div class="spinner" style="width: 40px; height: 40px; border: 3px solid #f3f3f3; border-top: 3px solid #5a3f2a; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px;"></div>
                <p>Loading product details...</p>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
            mainContainers[0].appendChild(loadingDiv);
        }

        try {
            const product = await loadProductData(productId);

            // Remove loading state
            const loadingState = document.querySelector('.loading-state');
            if (loadingState) {
                loadingState.remove();
            }

            if (product) {
                updateProductDetailPage(product);
            } else {
                showErrorState();
            }
        } catch (error) {
            console.error('Error in loadAndDisplayProduct:', error);

            // Remove loading state
            const loadingState = document.querySelector('.loading-state');
            if (loadingState) {
                loadingState.remove();
            }

            showErrorState();
        }
    }

    // Public API
    return {
        init,
        loadAndDisplayProduct,
        getProductIdFromURL,
        loadProductData
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing Product Detail Loader...');

    if (ProductDetailLoader.init()) {
        ProductDetailLoader.loadAndDisplayProduct();
    }
});