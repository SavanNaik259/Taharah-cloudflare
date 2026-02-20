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

        // Determine default price (from first material if available)
        let displayPrice = product.price;
        if (product.materials && Array.isArray(product.materials) && product.materials.length > 0) {
            displayPrice = product.materials[0].price;
            console.log('Using first material price as default:', displayPrice);
        } else if (product.materialVariants && Array.isArray(product.materialVariants) && product.materialVariants.length > 0) {
            displayPrice = product.materialVariants[0].price;
            console.log('Using first materialVariant price as default:', displayPrice);
        }

        // Make product data available globally for cart functionality
        window.productDetails = {
            id: product.id,
            name: product.name,
            price: displayPrice,
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
        const priceElements = document.querySelectorAll('.product-detail-info .product-price, .product-detail-info .current-price, .product-detail-info .price-value');
        if (priceElements.length > 0) {
            const formattedPrice = new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 0
            }).format(displayPrice).replace('₹', '');

            priceElements.forEach(element => {
                element.textContent = `Rs. ${formattedPrice}`;
                element.setAttribute('data-original-price', displayPrice);
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

        // Auto-select first material/dupatta if available (Moved here to ensure it happens after rendering)
        const firstMaterialBtn = document.querySelector('.material-options .material-btn');
        if (firstMaterialBtn) {
            console.log('Auto-selecting first material option');
            firstMaterialBtn.click();
        } else {
            const firstDupattaBtn = document.querySelector('.dupatta-options .material-btn');
            if (firstDupattaBtn) {
                console.log('Auto-selecting first dupatta material option');
                firstDupattaBtn.click();
            }
        }

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
                    
                    console.log('Color selected:', window.selectedColour);
                    
                    // Filter gallery images by color
                    if (product.images && product.images.length > 0) {
                        const filteredImages = product.images.filter(img => {
                            if (!img.color || !window.selectedColour) return false;
                            return img.color.trim().toLowerCase() === window.selectedColour.trim().toLowerCase();
                        });
                        
                        console.log('Filtered images for color:', window.selectedColour, filteredImages.length);
                        
                        if (filteredImages.length > 0) {
                            updateImageGallery(filteredImages);
                            setupScrollButtons(filteredImages);
                        } else {
                            // Fallback if no images match color tag exactly
                            // Check if any images have NO color tag and treat them as universal or just show all
                            updateImageGallery(product.images);
                            setupScrollButtons(product.images);
                        }
                    }
                });
            });
        }

        // Material selection (New implementation for separate pricing)
        const materialContainer = document.getElementById('material-selection');
        if (materialContainer && product.materials && Array.isArray(product.materials) && product.materials.length > 0) {
            const materialList = materialContainer.querySelector('.material-options');
            materialList.innerHTML = product.materials.map((variant, index) => {
                const isOutOfStock = variant.inStock === false;
                const isSelected = index === 0 && !isOutOfStock;
                return `
                <button class="option-btn material-btn ${isSelected ? 'selected' : ''} ${isOutOfStock ? 'out-of-stock' : ''}" 
                    data-name="${variant.name}" 
                    data-price="${variant.price}" 
                    ${isOutOfStock ? 'disabled' : ''}
                    style="padding: 5px 15px; border: 1px solid ${isSelected ? '#000' : '#ddd'}; background: ${isOutOfStock ? '#f9f9f9' : '#fff'}; cursor: ${isOutOfStock ? 'not-allowed' : 'pointer'}; border-radius: 4px; font-family: 'Futura PT', sans-serif; color: ${isOutOfStock ? '#999' : '#000'}; position: relative;">
                    ${variant.name}
                    ${isOutOfStock ? '<span style="position: absolute; top: -10px; right: -5px; background: #ff4d4d; color: white; font-size: 8px; padding: 2px 4px; border-radius: 4px; line-height: 1;">OUT</span>' : ''}
                </button>
            `;
            }).join('');
            materialContainer.style.display = 'block';
            hasOptions = true;

            // Set initial price from first material if available
            const firstInStock = product.materials.find(m => m.inStock !== false) || product.materials[0];
            if (firstInStock) {
                window.selectedMaterial = firstInStock.name;
                window.selectedPrice = firstInStock.price;
                updatePriceDisplay(firstInStock.price);
            }

            // Add click listeners
            materialList.querySelectorAll('.material-btn:not(.out-of-stock)').forEach(btn => {
                btn.addEventListener('click', () => {
                    materialList.querySelectorAll('.material-btn').forEach(b => {
                        b.style.borderColor = '#ddd';
                        b.classList.remove('selected');
                    });
                    btn.style.borderColor = '#000';
                    btn.classList.add('selected');
                    
                    window.selectedMaterial = btn.dataset.name;
                    window.selectedPrice = parseFloat(btn.dataset.price);
                    
                    updatePriceDisplay(window.selectedPrice);
                    
                    // Update global product details for cart
                    if (window.productDetails) {
                        window.productDetails.price = window.selectedPrice;
                        window.productDetails.material = window.selectedMaterial;
                    }
                });
            });
        }

        // Dupatta selection
        const dupattaContainer = document.getElementById('dupatta-selection');
        if (dupattaContainer && product.materials && Array.isArray(product.materials) && product.materials.length > 0) {
            const dupattaList = dupattaContainer.querySelector('.dupatta-options');
            dupattaList.innerHTML = product.materials.map((variant, index) => {
                const isOutOfStock = variant.inStock === false;
                const isSelected = index === 0 && !isOutOfStock;
                return `
                <button class="option-btn material-btn ${isSelected ? 'selected' : ''} ${isOutOfStock ? 'out-of-stock' : ''}" 
                    data-name="${variant.name}" 
                    data-price="${variant.price}" 
                    ${isOutOfStock ? 'disabled' : ''}
                    style="padding: 5px 15px; border: 1px solid ${isSelected ? '#000' : '#ddd'}; background: ${isOutOfStock ? '#f9f9f9' : '#fff'}; cursor: ${isOutOfStock ? 'not-allowed' : 'pointer'}; border-radius: 4px; font-family: 'Futura PT', sans-serif; color: ${isOutOfStock ? '#999' : '#000'}; position: relative;">
                    ${variant.name} (+Rs. ${variant.price})
                    ${isOutOfStock ? '<span style="position: absolute; top: -10px; right: -5px; background: #ff4d4d; color: white; font-size: 8px; padding: 2px 4px; border-radius: 4px; line-height: 1;">OUT</span>' : ''}
                </button>
            `;
            }).join('');
            dupattaContainer.style.display = 'block';
            hasOptions = true;

            // Set initial price from first material if available
            const firstInStock = product.materials.find(m => m.inStock !== false) || product.materials[0];
            if (firstInStock) {
                window.selectedDupatta = firstInStock.name;
                window.selectedPrice = firstInStock.price;
                updatePriceDisplay(firstInStock.price);
            }

            // Add click listeners
            dupattaList.querySelectorAll('.material-btn:not(.out-of-stock)').forEach(btn => {
                btn.addEventListener('click', () => {
                    dupattaList.querySelectorAll('.material-btn').forEach(b => {
                        b.style.borderColor = '#ddd';
                        b.classList.remove('selected');
                    });
                    btn.style.borderColor = '#000';
                    btn.classList.add('selected');
                    
                    window.selectedDupatta = btn.dataset.name;
                    window.selectedPrice = parseFloat(btn.dataset.price);
                    
                    updatePriceDisplay(window.selectedPrice);
                    
                    // Update global product details for cart
                    if (window.productDetails) {
                        window.productDetails.price = window.selectedPrice;
                        window.productDetails.dupatta = window.selectedDupatta;
                    }
                });
            });

        } else if (dupattaContainer && product.materialVariants && Array.isArray(product.materialVariants) && product.materialVariants.length > 0) {
            const dupattaList = dupattaContainer.querySelector('.dupatta-options');
            dupattaList.innerHTML = product.materialVariants.map(variant => `
                <button class="option-btn material-btn" data-name="${variant.name}" data-price="${variant.price}" style="padding: 5px 15px; border: 1px solid #ddd; background: #fff; cursor: pointer; border-radius: 4px;">${variant.name} - Rs. ${variant.price}</button>
            `).join('');
            dupattaContainer.style.display = 'block';
            hasOptions = true;

            // Add click listeners
            dupattaList.querySelectorAll('.material-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    dupattaList.querySelectorAll('.material-btn').forEach(b => b.style.borderColor = '#ddd');
                    btn.style.borderColor = '#000';
                    window.selectedDupatta = btn.dataset.name;
                    window.selectedPrice = parseFloat(btn.dataset.price);
                    
                    updatePriceDisplay(window.selectedPrice);
                    
                    // Update global product details for cart
                    if (window.productDetails) {
                        window.productDetails.price = window.selectedPrice;
                        window.productDetails.dupatta = window.selectedDupatta;
                    }
                });
            });

        } else if (dupattaContainer && product.dupattaOptions && Array.isArray(product.dupattaOptions) && product.dupattaOptions.length > 0) {
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

        function updatePriceDisplay(price) {
            const priceElements = document.querySelectorAll('.product-detail-info .product-price, .product-detail-info .current-price, .product-detail-info .price-value');
            if (priceElements.length > 0) {
                const formattedPrice = new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                    minimumFractionDigits: 0
                }).format(price).replace('₹', '');

                priceElements.forEach(element => {
                    element.textContent = `Rs. ${formattedPrice}`;
                    element.setAttribute('data-original-price', price);
                });
                
                // Convert currency if active
                if (typeof window.CurrencyConverter !== 'undefined') {
                    window.CurrencyConverter.convertAllPrices();
                }
            }
        }
    }

    /**
     * Update image gallery thumbnails
     */
    function updateImageGallery(images) {
        if (!images || images.length === 0) return;

        console.log('Updating image gallery with', images.length, 'images');

        // Update thumbnails
        const thumbnailContainers = document.querySelectorAll('.product-thumbnails');
        thumbnailContainers.forEach((container, containerIndex) => {
            console.log(`Cleared thumbnail container ${containerIndex + 1}`);
            container.innerHTML = '';
            
            // Limit to unique images to avoid duplicates in thumbnails
            const uniqueImages = images.filter((img, idx, self) => 
                idx === self.findIndex(t => t.url === img.url)
            );
            
            console.log(`Creating ${uniqueImages.length} unique thumbnails out of ${images.length} total images`);
            
            uniqueImages.forEach((img, index) => {
                const thumb = document.createElement('div');
                thumb.className = 'thumbnail' + (index === 0 ? ' active' : '');
                thumb.innerHTML = `<img src="${img.url}" alt="${img.alt || 'Product thumbnail'}">`;
                
                thumb.addEventListener('click', () => {
                    // Update main image
                    const mainImageElements = document.querySelectorAll('.product-main-image');
                    mainImageElements.forEach(mainImg => {
                        mainImageElements.forEach(mainImg => {
                            mainImg.src = img.url;
                            mainImg.alt = img.alt || 'Product image';
                        });
                    });
                    
                    // Update direct main image element for gallery-main layout
                    const galleryMainImg = document.querySelector('.gallery-main img');
                    if (galleryMainImg) {
                        galleryMainImg.src = img.url;
                        galleryMainImg.alt = img.alt || 'Product image';
                        console.log('Updated direct main image element');
                    }

                    // Update active thumbnail
                    container.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                    thumb.classList.add('active');
                });
                
                container.appendChild(thumb);
            });
            console.log(`Updated thumbnail gallery in container ${containerIndex + 1} with ${uniqueImages.length} thumbnails`);
        });
    }

    /**
     * Setup next/prev scroll buttons for images
     */
    function setupScrollButtons(images) {
        const prevBtn = document.getElementById('prev-product-image');
        const nextBtn = document.getElementById('next-product-image');
        
        if (!prevBtn || !nextBtn || !images || images.length <= 1) {
            if (prevBtn) prevBtn.style.display = 'none';
            if (nextBtn) nextBtn.style.display = 'none';
            return;
        }

        prevBtn.style.display = 'flex';
        nextBtn.style.display = 'flex';

        let currentIndex = 0;
        
        // Remove existing listeners to avoid multiple attachments
        const newPrevBtn = prevBtn.cloneNode(true);
        const newNextBtn = nextBtn.cloneNode(true);
        prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
        nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);

        newPrevBtn.addEventListener('click', () => {
            currentIndex = (currentIndex - 1 + images.length) % images.length;
            updateMainImage(images[currentIndex]);
        });

        newNextBtn.addEventListener('click', () => {
            currentIndex = (currentIndex + 1) % images.length;
            updateMainImage(images[currentIndex]);
        });

        function updateMainImage(image) {
            const mainImages = document.querySelectorAll('.product-main-image, .gallery-main img');
            mainImages.forEach(img => {
                img.src = image.url;
                img.alt = image.alt || 'Product image';
            });
            
            // Update thumbnails
            const thumbnails = document.querySelectorAll('.thumbnail');
            thumbnails.forEach((thumb, idx) => {
                if (images[currentIndex].url === thumb.querySelector('img').src) {
                    thumb.classList.add('active');
                } else {
                    thumb.classList.remove('active');
                }
            });
        }
    }

    /**
     * Update wishlist button state
     */
    async function updateWishlistButtonState(productId) {
        const wishlistBtn = document.querySelector('.add-to-wishlist-btn');
        if (!wishlistBtn) return;

        try {
            const manager = window.WishlistManager || window.FirebaseWishlistManager;
            if (manager && typeof manager.isItemInWishlist === 'function') {
                const isInWishlist = await manager.isItemInWishlist(productId);
                console.log('Checking if product', productId, 'is in wishlist:', isInWishlist);
                
                if (isInWishlist) {
                    wishlistBtn.innerHTML = '<i class="fas fa-heart"></i> IN WISHLIST';
                    wishlistBtn.classList.add('in-wishlist');
                } else {
                    wishlistBtn.innerHTML = '<i class="far fa-heart"></i> ADD TO WISHLIST';
                    wishlistBtn.classList.remove('in-wishlist');
                }
                console.log('Updating detail page button for product:', productId, 'inWishlist:', isInWishlist);
            }
        } catch (error) {
            console.error('Error updating wishlist button state:', error);
        }
    }

    /**
     * Show error state when product loading fails
     */
    function showErrorState() {
        const titleEl = document.querySelector('.product-title');
        if (titleEl) titleEl.textContent = 'Product Not Found';
        
        const priceEl = document.querySelector('.product-price');
        if (priceEl) priceEl.style.display = 'none';
        
        const loader = document.getElementById('product-loader');
        if (loader) loader.style.display = 'none';
    }

    /**
     * Update placeholders while loading
     */
    function updatePlaceholders() {
        // Implementation for loading skeletons or placeholders
    }

    // Public API
    return {
        init: init,
        loadProduct: async function() {
            const productId = getProductIdFromURL();
            if (!productId) return;

            // Load product data
            const product = await loadProductData(productId);
            if (product) {
                updateProductDetailPage(product);
                
                // Dispatch event when product is loaded
                window.dispatchEvent(new CustomEvent('productLoaded', { detail: { product } }));
            } else {
                showErrorState();
            }
        }
    };
})();

// Initialize and load
document.addEventListener('DOMContentLoaded', () => {
    ProductDetailLoader.init();
    ProductDetailLoader.loadProduct();
});
