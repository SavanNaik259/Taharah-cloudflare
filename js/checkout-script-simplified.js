
/**
 * Simplified Checkout Script
 * Handles cart loading and checkout process for both logged-in and guest users
 */

// Storage key for cart data (matching cart-manager.js)
const STORAGE_KEY = 'auric_cart_items';

// Track selected saved address
let selectedSavedAddressId = null;

// Current step in checkout process
let currentStep = 1;

/**
 * Initialize checkout page
 */
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Initializing checkout page...');
    
    // Load and display cart items
    await loadAndDisplayCart();
    
    // Set up event listeners
    setupEventListeners();
    
    // Set up form validation
    setupCheckoutFormValidation();
    
    // Load saved addresses
    setTimeout(() => {
        loadSavedAddresses();
    }, 500);
});

/**
 * Load cart items and display them
 */
async function loadAndDisplayCart() {
    console.log('Loading cart items for checkout...');
    
    let cartItems = [];
    
    // Check if user is logged in
    const isUserLoggedIn = typeof firebase !== 'undefined' && 
                          firebase.auth && 
                          firebase.auth().currentUser;
    
    if (isUserLoggedIn) {
        console.log('User logged in, trying Firebase cart');
        // Try Firebase first
        if (typeof FirebaseCartManager !== 'undefined' && FirebaseCartManager.getItems) {
            try {
                const result = await FirebaseCartManager.getItems();
                if (result.success && result.items) {
                    cartItems = result.items;
                    console.log('Loaded from Firebase:', cartItems.length, 'items');
                }
            } catch (error) {
                console.error('Firebase cart error:', error);
            }
        }
    }
    
    // Fallback to local storage if Firebase failed or user not logged in
    if (cartItems.length === 0) {
        console.log('Loading from local storage');
        if (typeof LocalStorageCart !== 'undefined') {
            cartItems = LocalStorageCart.getItems();
        } else {
            const savedCart = localStorage.getItem(STORAGE_KEY);
            if (savedCart) {
                cartItems = JSON.parse(savedCart);
            }
        }
        console.log('Loaded from local storage:', cartItems.length, 'items');
    }
    
    // Display cart items
    displayCartItems(cartItems);
    
    // If cart is empty, redirect to shop
    if (cartItems.length === 0) {
        console.log('Cart is empty, showing message');
        showEmptyCartMessage();
    }
}

/**
 * Display cart items in all checkout steps
 */
function displayCartItems(items) {
    const orderSummary = document.getElementById('orderSummary');
    const orderSummaryStep2 = document.getElementById('orderSummaryStep2');
    const orderSummaryStep3 = document.getElementById('orderSummaryStep3');
    
    if (!items || items.length === 0) {
        const emptyMessage = '<p class="text-muted">Your cart is empty</p>';
        if (orderSummary) orderSummary.innerHTML = emptyMessage;
        if (orderSummaryStep2) orderSummaryStep2.innerHTML = emptyMessage;
        if (orderSummaryStep3) orderSummaryStep3.innerHTML = emptyMessage;
        return;
    }
    
    // Generate HTML for cart items
    let html = '';
    let total = 0;
    
    items.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        html += `
            <div class="cart-item mb-3 pb-3 border-bottom">
                <div class="row align-items-center">
                    <div class="col-3">
                        <img src="${item.image || 'images/product-placeholder.jpg'}" 
                             alt="${item.name}" 
                             class="img-fluid rounded"
                             style="max-height: 80px; object-fit: cover;">
                    </div>
                    <div class="col-9">
                        <h6 class="mb-1">${item.name}</h6>
                        <p class="mb-1 text-muted small">Quantity: ${item.quantity}</p>
                        <p class="mb-0"><strong>₹${itemTotal.toFixed(2)}</strong></p>
                    </div>
                </div>
            </div>
        `;
    });
    
    // Update all order summary sections
    if (orderSummary) orderSummary.innerHTML = html;
    if (orderSummaryStep2) orderSummaryStep2.innerHTML = html;
    if (orderSummaryStep3) orderSummaryStep3.innerHTML = html;
    
    // Update total amounts
    const totalFormatted = `₹${total.toFixed(2)}`;
    const totalElements = [
        document.getElementById('orderTotal'),
        document.getElementById('orderTotalStep2'),
        document.getElementById('orderTotalStep3')
    ];
    
    totalElements.forEach(el => {
        if (el) el.textContent = totalFormatted;
    });
}

/**
 * Show empty cart message
 */
function showEmptyCartMessage() {
    const steps = document.querySelectorAll('.checkout-step');
    steps.forEach(step => step.style.display = 'none');
    
    const container = document.querySelector('.container.py-5');
    if (container) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-shopping-cart fa-4x text-muted mb-4"></i>
                <h2>Your cart is empty</h2>
                <p class="lead mb-4">Add some products to your cart to continue</p>
                <a href="index.html" class="btn btn-primary">Continue Shopping</a>
            </div>
        `;
    }
}

/**
 * Set up event listeners for checkout navigation
 */
function setupEventListeners() {
    // Continue to address button
    const continueToAddress = document.getElementById('continue-to-address');
    if (continueToAddress) {
        continueToAddress.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'index.html';
        });
    }
    
    // Continue to payment button
    const continueToPayment = document.getElementById('continue-to-payment');
    if (continueToPayment) {
        continueToPayment.addEventListener('click', function(e) {
            e.preventDefault();
            if (validateAddressForm()) {
                showStep(3);
                displayAddressConfirmation();
            }
        });
    }
    
    // Back buttons
    const backToSummary = document.getElementById('back-to-summary');
    if (backToSummary) {
        backToSummary.addEventListener('click', () => showStep(1));
    }
    
    const backToAddress = document.getElementById('back-to-address');
    if (backToAddress) {
        backToAddress.addEventListener('click', () => showStep(2));
    }
    
    // Use new address button
    const useNewAddressBtn = document.getElementById('use-new-address-btn');
    if (useNewAddressBtn) {
        useNewAddressBtn.addEventListener('click', function() {
            document.getElementById('saved-addresses-section').style.display = 'none';
            document.getElementById('manual-address-form').style.display = 'block';
            document.getElementById('save-address-option').style.display = 'block';
        });
    }
    
    // Form submission
    const checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', handleCheckoutSubmit);
    }
}

/**
 * Show specific checkout step
 */
function showStep(step) {
    // Hide all steps
    document.querySelectorAll('.checkout-step').forEach(s => {
        s.classList.remove('active');
    });
    
    // Show selected step
    const targetStep = document.getElementById(`checkout-step-${step}`);
    if (targetStep) {
        targetStep.classList.add('active');
    }
    
    // Update progress
    updateProgress(step);
    currentStep = step;
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Update checkout progress indicator
 */
function updateProgress(step) {
    // Update step icons
    for (let i = 1; i <= 3; i++) {
        const icon = document.getElementById(`step-icon-${i}`);
        if (icon) {
            if (i <= step) {
                icon.classList.add('active');
            } else {
                icon.classList.remove('active');
            }
        }
    }
    
    // Update progress bar
    const progressBar = document.getElementById('checkout-progress-bar');
    if (progressBar) {
        const width = (step / 3) * 100;
        progressBar.style.width = `${width}%`;
    }
}

/**
 * Validate address form
 */
function validateAddressForm() {
    const fields = [
        'firstName', 'lastName', 'email', 'phone',
        'houseNumber', 'roadName', 'city', 'state', 'pinCode'
    ];
    
    let isValid = true;
    
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field && !field.value.trim()) {
            field.classList.add('error');
            isValid = false;
        } else if (field) {
            field.classList.remove('error');
        }
    });
    
    if (!isValid) {
        showNotification('Please fill in all required fields', 'error');
    }
    
    return isValid;
}

/**
 * Display address confirmation in step 3
 */
function displayAddressConfirmation() {
    const addressConfirmation = document.getElementById('address-confirmation');
    if (!addressConfirmation) return;
    
    const firstName = document.getElementById('firstName')?.value || '';
    const lastName = document.getElementById('lastName')?.value || '';
    const email = document.getElementById('email')?.value || '';
    const phone = document.getElementById('phone')?.value || '';
    const houseNumber = document.getElementById('houseNumber')?.value || '';
    const roadName = document.getElementById('roadName')?.value || '';
    const city = document.getElementById('city')?.value || '';
    const state = document.getElementById('state')?.value || '';
    const pinCode = document.getElementById('pinCode')?.value || '';
    
    addressConfirmation.innerHTML = `
        <p class="mb-2"><strong>${firstName} ${lastName}</strong></p>
        <p class="mb-1">${houseNumber}, ${roadName}</p>
        <p class="mb-1">${city}, ${state} - ${pinCode}</p>
        <p class="mb-1">Phone: ${phone}</p>
        <p class="mb-0">Email: ${email}</p>
    `;
}

/**
 * Handle checkout form submission
 */
async function handleCheckoutSubmit(e) {
    e.preventDefault();
    console.log('Processing order...');
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    }
    
    try {
        // Save address if checkbox is checked
        await saveAddressForFutureOrders();
        
        // Get payment method
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'Cash on Delivery';
        
        // Show success message
        showNotification('Order placed successfully!', 'success');
        
        // Redirect to order confirmation or home page after 2 seconds
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        
    } catch (error) {
        console.error('Order error:', error);
        showNotification('Failed to place order. Please try again.', 'error');
        
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Complete Order';
        }
    }
}

/**
 * Load saved addresses for both logged in and guest users
 */
async function loadSavedAddresses() {
    console.log('Loading saved addresses...');
    
    let addresses = [];
    let isGuestUser = false;
    
    // Check if user is logged in
    const user = typeof firebase !== 'undefined' && firebase.auth ? firebase.auth().currentUser : null;
    
    if (user) {
        // Load from Firebase for logged in users
        if (typeof FirebaseAddressManager !== 'undefined' && FirebaseAddressManager.getAddresses) {
            try {
                addresses = await FirebaseAddressManager.getAddresses();
            } catch (error) {
                console.error('Error loading Firebase addresses:', error);
            }
        }
    } else {
        // Load from localStorage for guest users
        isGuestUser = true;
        if (typeof LocalAddressManager !== 'undefined' && LocalAddressManager.getAddresses) {
            addresses = LocalAddressManager.getAddresses();
        }
    }
    
    // Display addresses if available
    if (addresses && addresses.length > 0) {
        const container = document.getElementById('saved-addresses-container');
        if (container) {
            container.innerHTML = '';
            addresses.forEach(address => {
                const addressCard = createAddressCard(address);
                container.appendChild(addressCard);
            });
        }
        
        document.getElementById('saved-addresses-section').style.display = 'block';
        document.getElementById('manual-address-form').style.display = 'none';
        
        if (isGuestUser) {
            document.getElementById('guest-address-notice').style.display = 'block';
        }
    } else {
        document.getElementById('manual-address-form').style.display = 'block';
        document.getElementById('save-address-option').style.display = 'block';
        
        if (isGuestUser) {
            document.getElementById('guest-address-notice').style.display = 'block';
        }
    }
}

/**
 * Create address card element
 */
function createAddressCard(address) {
    const div = document.createElement('div');
    div.className = 'address-option';
    div.innerHTML = `
        <div class="address-type">
            ${address.addressType || 'Home'}
            ${address.isDefault ? '<span class="default-badge">Default</span>' : ''}
        </div>
        <div class="address-details">
            <strong>${address.firstName} ${address.lastName}</strong><br>
            ${address.houseNumber}, ${address.roadName}<br>
            ${address.city}, ${address.state} - ${address.pinCode}<br>
            Phone: ${address.phone}
        </div>
        <input type="radio" name="savedAddress" class="address-radio" value="${address.id || address.uuid}">
    `;
    
    div.addEventListener('click', function() {
        selectSavedAddress(address.id || address.uuid, address);
    });
    
    return div;
}

/**
 * Select a saved address
 */
function selectSavedAddress(addressId, addressData) {
    selectedSavedAddressId = addressId;
    
    // Update UI
    document.querySelectorAll('.address-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    
    // Populate form fields if needed
    if (addressData) {
        document.getElementById('firstName').value = addressData.firstName || '';
        document.getElementById('lastName').value = addressData.lastName || '';
        document.getElementById('email').value = addressData.email || '';
        document.getElementById('phone').value = addressData.phone || '';
        document.getElementById('houseNumber').value = addressData.houseNumber || '';
        document.getElementById('roadName').value = addressData.roadName || '';
        document.getElementById('city').value = addressData.city || '';
        document.getElementById('state').value = addressData.state || '';
        document.getElementById('pinCode').value = addressData.pinCode || '';
    }
}

/**
 * Save address for future orders
 */
async function saveAddressForFutureOrders() {
    const saveAddressCheckbox = document.getElementById('saveAddress');
    if (!saveAddressCheckbox || !saveAddressCheckbox.checked) {
        return;
    }
    
    if (selectedSavedAddressId) {
        console.log('Using existing saved address');
        return;
    }
    
    const addressData = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        houseNumber: document.getElementById('houseNumber').value,
        roadName: document.getElementById('roadName').value,
        city: document.getElementById('city').value,
        state: document.getElementById('state').value,
        pinCode: document.getElementById('pinCode').value,
        addressType: 'home',
        isDefault: false
    };
    
    const user = typeof firebase !== 'undefined' && firebase.auth ? firebase.auth().currentUser : null;
    
    if (user && typeof FirebaseAddressManager !== 'undefined') {
        try {
            await FirebaseAddressManager.saveAddress(addressData);
            console.log('Address saved to Firebase');
        } catch (error) {
            console.error('Error saving to Firebase:', error);
        }
    } else if (typeof LocalAddressManager !== 'undefined') {
        try {
            LocalAddressManager.saveAddress(addressData);
            console.log('Address saved to localStorage');
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }
}
