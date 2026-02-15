/**
 * Taharah Cart Manager
 * 
 * A simplified cart management system that handles both local storage and Firebase.
 */

window.CartManager = (function() {
    let cartItems = [];
    let isAuthListenerSet = false;

    function init() {
        console.log('Initializing cart system...');
        loadCart();
        setupCartPanel();
        setupEventListeners();
        setupAuthListener();
        window.openCart = openCartPanel;
        window.closeCart = closeCartPanel;
        window.toggleCart = toggleCartPanel;
    }

    function setupAuthListener() {
        if (isAuthListenerSet) return;
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged(async (user) => {
                if (user) {
                    if (typeof FirebaseCartManager !== 'undefined') {
                        const result = await FirebaseCartManager.getItems();
                        if (result.success) {
                            cartItems = result.items;
                        }
                    }
                } else {
                    cartItems = JSON.parse(localStorage.getItem('taharah_cart') || '[]');
                }
                updateCartUI();
            });
            isAuthListenerSet = true;
        }
    }

    async function loadCart() {
        cartItems = JSON.parse(localStorage.getItem('taharah_cart') || '[]');
        updateCartUI();
    }

    async function saveCart() {
        localStorage.setItem('taharah_cart', JSON.stringify(cartItems));
        if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
            if (typeof FirebaseCartManager !== 'undefined') {
                await FirebaseCartManager.saveItems(cartItems);
            }
        }
        updateCartUI();
    }

    async function addToCart(product, quantity = 1) {
        if (!product || !product.id) return;
        const existingItemIndex = cartItems.findIndex(item => 
            item.id === product.id && 
            item.size === product.size && 
            item.colour === product.colour && 
            item.dupatta === product.dupatta
        );

        if (existingItemIndex >= 0) {
            cartItems[existingItemIndex].quantity += quantity;
        } else {
            cartItems.push({
                ...product,
                quantity: quantity
            });
        }
        await saveCart();
        openCartPanel();
    }

    async function removeFromCart(productId, size, colour, dupatta) {
        cartItems = cartItems.filter(item => 
            !(item.id === productId && item.size === size && item.colour === colour && item.dupatta === dupatta)
        );
        await saveCart();
    }

    async function updateQuantity(productId, size, colour, dupatta, newQuantity) {
        const item = cartItems.find(item => 
            item.id === productId && item.size === size && item.colour === colour && item.dupatta === dupatta
        );
        if (item) {
            item.quantity = Math.max(1, newQuantity);
            await saveCart();
        }
    }

    function setupCartPanel() {
        if (!document.querySelector('.cart-panel-overlay')) {
            document.body.insertAdjacentHTML('beforeend', '<div class="cart-panel-overlay"></div>');
        }
        if (!document.querySelector('.cart-panel')) {
            const cartPanelHTML = `
                <div class="cart-panel">
                    <div class="cart-panel-header">
                        <h3>Your Cart</h3>
                        <button class="close-cart-btn">&times;</button>
                    </div>
                    <div class="cart-items"></div>
                    <div class="cart-panel-footer">
                        <div class="cart-panel-subtotal">
                            <span>Subtotal:</span>
                            <span class="subtotal-amount">₹0.00</span>
                        </div>
                        <div class="cart-panel-buttons">
                            <a href="#" class="view-cart-btn">Continue Shopping</a>
                            <a href="checkout" class="checkout-btn">Checkout</a>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', cartPanelHTML);
        }
    }

    function setupEventListeners() {
        document.addEventListener('click', function(e) {
            if (e.target.closest('.cart-toggle') || e.target.closest('.mobile-cart-toggle')) {
                e.preventDefault();
                toggleCartPanel();
            }
            if (e.target.closest('.close-cart-btn') || e.target.classList.contains('cart-panel-overlay')) {
                closeCartPanel();
            }
            if (e.target.closest('.add-to-cart-btn-small') || e.target.closest('.add-to-cart-btn')) {
                e.preventDefault();
                const btn = e.target.closest('.add-to-cart-btn') || e.target.closest('.add-to-cart-btn-small');
                const container = btn.closest('[data-product-id]') || document.querySelector('.product-detail-container');
                if (container) {
                    const isDetail = !!document.querySelector('.product-detail-container');
                    const productId = container.dataset.productId || new URLSearchParams(window.location.search).get('id');
                    const selectedSize = window.selectedSize || document.querySelector('.size-btn.active')?.dataset.size;
                    const selectedColour = window.selectedColour || document.querySelector('.colour-btn.active')?.dataset.colour;
                    const selectedDupatta = window.selectedDupatta || document.querySelector('.dupatta-btn.active')?.dataset.dupatta;

                    if (isDetail) {
                        const hasSizes = document.getElementById('size-selection')?.style.display !== 'none' && document.querySelector('.size-btn');
                        if (hasSizes && !selectedSize) { alert('Please select a size'); return; }
                    }

                    const productData = {
                        id: productId,
                        name: document.querySelector('.product-title')?.textContent.trim() || container.dataset.productName || 'Product',
                        price: parseFloat(container.dataset.productPrice || document.querySelector('.product-price')?.textContent.replace(/[^0-9.]/g, '') || 0),
                        image: container.dataset.productImage || document.querySelector('.product-main-image')?.src || '',
                        size: selectedSize || null,
                        colour: selectedColour || null,
                        dupatta: selectedDupatta || null,
                        category: document.querySelector('.meta-item:last-child .meta-value')?.textContent.trim() || container.dataset.productCategory || null
                    };
                    addToCart(productData, parseInt(document.querySelector('.quantity-input')?.value) || 1);
                }
            }
            if (e.target.classList.contains('quantity-btn')) {
                const itemEl = e.target.closest('.cart-item');
                const id = itemEl.dataset.productId;
                const size = itemEl.dataset.size || null;
                const colour = itemEl.dataset.colour || null;
                const dupatta = itemEl.dataset.dupatta || null;
                const currentQty = parseInt(itemEl.querySelector('.quantity-input').value);
                if (e.target.classList.contains('increment')) {
                    updateQuantity(id, size, colour, dupatta, currentQty + 1);
                } else {
                    updateQuantity(id, size, colour, dupatta, currentQty - 1);
                }
            }
            if (e.target.classList.contains('remove-item-btn')) {
                const itemEl = e.target.closest('.cart-item');
                removeFromCart(itemEl.dataset.productId, itemEl.dataset.size || null, itemEl.dataset.colour || null, itemEl.dataset.dupatta || null);
            }
        });
    }

    function updateCartUI() {
        const count = cartItems.reduce((acc, item) => acc + item.quantity, 0);
        document.querySelectorAll('.cart-count').forEach(el => el.textContent = count);
        const total = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        document.querySelectorAll('.subtotal-amount').forEach(el => el.textContent = `₹${total.toFixed(2)}`);
        
        const container = document.querySelector('.cart-items');
        if (container) {
            if (cartItems.length === 0) {
                container.innerHTML = '<div class="empty-cart">Your cart is empty</div>';
            } else {
                container.innerHTML = cartItems.map(item => `
                    <div class="cart-item" data-product-id="${item.id}" data-size="${item.size || ''}" data-colour="${item.colour || ''}" data-dupatta="${item.dupatta || ''}">
                        <div class="cart-item-image"><img src="${item.image}"></div>
                        <div class="cart-item-details">
                            <div class="cart-item-name">${item.name}</div>
                            <div class="cart-item-options">${[item.size, item.colour, item.dupatta].filter(Boolean).join(' | ')}</div>
                            <div class="cart-item-price">₹${item.price}</div>
                            <div class="cart-item-quantity">
                                <button class="quantity-btn decrement">-</button>
                                <input type="text" class="quantity-input" value="${item.quantity}" readonly>
                                <button class="quantity-btn increment">+</button>
                            </div>
                        </div>
                        <button class="remove-item-btn">&times;</button>
                    </div>
                `).join('');
            }
        }
    }

    function openCartPanel() {
        document.querySelector('.cart-panel')?.classList.add('active');
        document.querySelector('.cart-panel-overlay')?.classList.add('active');
        updateCartUI();
    }

    function closeCartPanel() {
        document.querySelector('.cart-panel')?.classList.remove('active');
        document.querySelector('.cart-panel-overlay')?.classList.remove('active');
    }

    function toggleCartPanel() {
        const panel = document.querySelector('.cart-panel');
        if (panel?.classList.contains('active')) closeCartPanel();
        else openCartPanel();
    }

    return {
        init: init,
        addToCart: addToCart,
        removeFromCart: removeFromCart,
        updateQuantity: updateQuantity,
        clearCart: async () => { cartItems = []; await saveCart(); },
        getItemCount: () => cartItems.reduce((acc, item) => acc + item.quantity, 0),
        calculateTotal: () => cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    };
})();

CartManager.init();