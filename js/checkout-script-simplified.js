// A simplified Firebase integration function that focuses on reliability
    function initializeFirebaseIntegration() {
        console.log('Initializing Firebase integration (simplified version)');

        try {
            // First try to access LocalStorageCart for reliable cart access
            if (typeof LocalStorageCart !== 'undefined' && LocalStorageCart.getItems) {
                console.log('Using LocalStorageCart module for checkout');
            } else {
                console.log('LocalStorageCart module not available');
            }

            // Initialize LocalAddressManager for guest users
            if (typeof LocalAddressManager !== 'undefined') {
                console.log('LocalAddressManager available for guest checkout');
            } else {
                console.log('LocalAddressManager not available');
            }

            // Try to use Firebase if available
            if (typeof firebase !== 'undefined' && firebase.auth) {
                // Just check if auth module exists - avoid deep integration to prevent errors
                console.log('Firebase auth detected, will try to use Firebase cart if user is logged in');
            }
        } catch (error) {
            console.error('Error during Firebase integration initialization:', error);
        }
    }

// Function to load saved addresses for both logged in and guest users
    async function loadSavedAddresses() {
        console.log('Loading saved addresses...');

        let addresses = [];
        let isGuestUser = false;

        // Check if user is logged in
        const user = firebase.auth().currentUser;

        if (user) {
            // Load from Firebase for logged in users
            console.log('User logged in, loading from Firebase');
            if (typeof FirebaseAddressManager !== 'undefined' && FirebaseAddressManager.getAddresses) {
                try {
                    addresses = await FirebaseAddressManager.getAddresses();
                    console.log('Loaded Firebase addresses:', addresses);
                } catch (error) {
                    console.error('Error loading Firebase addresses:', error);
                }
            }
        } else {
            // Load from localStorage for guest users
            console.log('Guest user, loading from localStorage');
            isGuestUser = true;
            if (typeof LocalAddressManager !== 'undefined' && LocalAddressManager.getAddresses) {
                addresses = LocalAddressManager.getAddresses();
                console.log('Loaded local addresses:', addresses);
            }
        }

        // Display addresses if available
        if (addresses && addresses.length > 0) {
            const container = document.getElementById('saved-addresses-container');
            container.innerHTML = '';

            addresses.forEach(address => {
                const addressCard = createAddressCard(address);
                container.appendChild(addressCard);
            });

            document.getElementById('saved-addresses-section').style.display = 'block';
            document.getElementById('manual-address-form').style.display = 'none';
            document.getElementById('save-address-option').style.display = 'none';

            // Show guest notice if guest user
            if (isGuestUser) {
                document.getElementById('guest-address-notice').style.display = 'block';
            } else {
                document.getElementById('guest-address-notice').style.display = 'none';
            }
        } else {
            // No saved addresses, show manual form
            document.getElementById('saved-addresses-section').style.display = 'none';
            document.getElementById('manual-address-form').style.display = 'block';
            document.getElementById('save-address-option').style.display = 'block';

            // Show guest notice if guest user
            if (isGuestUser) {
                document.getElementById('guest-address-notice').style.display = 'block';
            } else {
                document.getElementById('guest-address-notice').style.display = 'none';
            }
        }
    }

// Function to save address for future orders (for both logged in and guest users)
    async function saveAddressForFutureOrders() {
        const saveAddressCheckbox = document.getElementById('saveAddress');
        if (!saveAddressCheckbox || !saveAddressCheckbox.checked) {
            console.log('Save address not checked or checkbox not found, skipping address save');
            return;
        }

        // Check if an address was already selected
        if (selectedSavedAddressId) {
            console.log('Using existing saved address, not saving new one');
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
            addressType: 'home', // default type
            isDefault: false // don't set as default automatically
        };

        // Check if user is logged in
        const user = firebase.auth().currentUser;

        if (user) {
            // Save to Firebase for logged in users
            if (typeof FirebaseAddressManager !== 'undefined' && FirebaseAddressManager.saveAddress) {
                try {
                    const result = await FirebaseAddressManager.saveAddress(addressData);
                    if (result.success) {
                        console.log('Address saved to Firebase for future orders');
                    } else {
                        console.warn('Failed to save address to Firebase:', result.error);
                    }
                } catch (error) {
                    console.error('Error saving address to Firebase:', error);
                }
            }
        } else {
            // Save to localStorage for guest users
            if (typeof LocalAddressManager !== 'undefined' && LocalAddressManager.saveAddress) {
                try {
                    const result = LocalAddressManager.saveAddress(addressData);
                    if (result.success) {
                        console.log('Address saved to localStorage for future orders');
                    } else {
                        console.warn('Failed to save address to localStorage:', result.errors);
                    }
                } catch (error) {
                    console.error('Error saving address to localStorage:', error);
                }
            }
        }
    }

// Function to create an address card (assumed to be defined elsewhere)
    function createAddressCard(address) {
        // This is a placeholder, implement the actual creation of address cards
        const div = document.createElement('div');
        div.className = 'address-card';
        div.innerHTML = `
            <h3>${address.firstName} ${address.lastName}</h3>
            <p>${address.houseNumber} ${address.roadName}</p>
            <p>${address.city}, ${address.state} - ${address.pinCode}</p>
            <p>Phone: ${address.phone}</p>
            <p>Email: ${address.email}</p>
            <button onclick="selectSavedAddress('${address.id || address.uuid}')">Select</button>
        `; // Added id/uuid for selection
        return div;
    }

// Dummy function for selecting a saved address
    function selectSavedAddress(addressId) {
        console.log('Selected address with ID:', addressId);
        // Implement logic to populate the form with selected address and store its ID
        // For now, just setting a placeholder global variable
        selectedSavedAddressId = addressId;
        alert('Address selected. You can now proceed to checkout.');
        // Potentially hide manual form and show selected address summary
    }

    let selectedSavedAddressId = null; // To keep track of the selected address

    // Display cart items in all order summary sections
    function displayCartItems() {
        console.log('Displaying cart items:', cartItems?.length || 0);

        if (!cartItems || cartItems.length === 0) {
            showEmptyCartMessage();
            return;
        }

        // Update all three order summary sections (step 1, 2, and 3)
        const summaryContainers = [
            document.getElementById('orderSummary'),
            document.getElementById('orderSummaryStep2'),
            document.getElementById('orderSummaryStep3')
        ];

        const totalContainers = [
            document.getElementById('orderTotal'),
            document.getElementById('orderTotalStep2'),
            document.getElementById('orderTotalStep3')
        ];

        // Calculate total
        const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Update each summary container
        summaryContainers.forEach(container => {
            if (!container) return;

            let html = '';
            cartItems.forEach(item => {
                const itemTotal = (item.price * item.quantity).toFixed(2);
                html += `
                    <div class="cart-item-summary" style="display: flex; gap: 10px; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #eee;">
                        <img src="${item.image}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; margin-bottom: 5px;">${item.name}</div>
                            <div style="color: #666; font-size: 14px;">Qty: ${item.quantity}</div>
                            <div style="color: #603000; font-weight: 600;">₹${itemTotal}</div>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        });

        // Update all total displays
        totalContainers.forEach(totalEl => {
            if (totalEl) {
                totalEl.textContent = `₹${total.toFixed(2)}`;
            }
        });

        console.log('Cart items displayed successfully');
    }

    // Function to show an empty cart message
    function showEmptyCartMessage() {
        const emptyMessage = '<p>Your cart is empty.</p>';
        const summaryContainers = [
            document.getElementById('orderSummary'),
            document.getElementById('orderSummaryStep2'),
            document.getElementById('orderSummaryStep3')
        ];
        summaryContainers.forEach(container => {
            if (container) {
                container.innerHTML = emptyMessage;
            }
        });

        const totalContainers = [
            document.getElementById('orderTotal'),
            document.getElementById('orderTotalStep2'),
            document.getElementById('orderTotalStep3')
        ];
        totalContainers.forEach(totalEl => {
            if (totalEl) {
                totalEl.textContent = '₹0.00';
            }
        });
        console.log('Empty cart message displayed');
    }

    // Placeholder for cartItems - in a real app, this would be managed by a cart module
    let cartItems = [];
    if (typeof LocalStorageCart !== 'undefined' && LocalStorageCart.getItems) {
        cartItems = LocalStorageCart.getItems();
    } else {
        // Fallback for demonstration if LocalStorageCart is not available
        console.warn('LocalStorageCart not found, using dummy cart data for checkout page.');
        cartItems = JSON.parse(localStorage.getItem('cartItems')) || []; // Example: load from localStorage if not defined
    }


    // Event listener for the checkout form submission
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            console.log('Checkout form submitted');

            // Guest checkout is now allowed - no authentication required
            const user = firebase.auth().currentUser;
            console.log('User authentication status:', user ? 'Logged in' : 'Guest checkout');

            // Assuming address data is collected from the form or selected saved address
            const addressData = {};
            if (selectedSavedAddressId) {
                // Logic to retrieve full address data from saved addresses based on ID
                // For now, using placeholder
                console.log('Using saved address with ID:', selectedSavedAddressId);
                // In a real scenario, you'd fetch the full address object here
                // and populate addressData.
            } else {
                // Collect data from the manual form
                addressData.firstName = document.getElementById('firstName').value;
                addressData.lastName = document.getElementById('lastName').value;
                addressData.email = document.getElementById('email').value;
                addressData.phone = document.getElementById('phone').value;
                addressData.houseNumber = document.getElementById('houseNumber').value;
                addressData.roadName = document.getElementById('roadName').value;
                addressData.city = document.getElementById('city').value;
                addressData.state = document.getElementById('state').value;
                addressData.pinCode = document.getElementById('pinCode').value;
            }

            // Save address if checkbox is checked
            await saveAddressForFutureOrders();

            // Proceed with order placement logic (e.g., creating order in DB, payment gateway)
            console.log('Proceeding to place order with address:', addressData);
            alert('Order placement logic would go here.');

            // Reset button state
            const submitButton = checkoutForm.querySelector('button[type="submit"]');
            submitButton.disabled = false;
            submitButton.innerHTML = 'Place Order';
        });
    }

    // Initial setup when the page loads
    document.addEventListener('DOMContentLoaded', () => {
        initializeFirebaseIntegration();
        loadSavedAddresses();
        displayCartItems(); // Call displayCartItems on page load

        // Set up navigation between steps
        const continueToAddressBtn = document.getElementById('continue-to-address');
        const backToSummaryBtn = document.getElementById('back-to-summary');
        const continueToPaymentBtn = document.getElementById('continue-to-payment');
        const backToAddressBtn = document.getElementById('back-to-address');

        if (continueToAddressBtn) {
            continueToAddressBtn.addEventListener('click', function() {
                console.log('Continue to address clicked');
                // Validate that cart has items
                if (cartItems && cartItems.length > 0) {
                    // Move to step 2
                    document.getElementById('checkout-step-1').classList.remove('active');
                    document.getElementById('checkout-step-1').style.display = 'none';
                    document.getElementById('checkout-step-2').classList.add('active');
                    document.getElementById('checkout-step-2').style.display = 'block';
                    
                    // Update progress bar
                    const progressBar = document.getElementById('checkout-progress-bar');
                    if (progressBar) {
                        progressBar.style.width = '66%';
                    }
                    
                    // Update step icons
                    document.getElementById('step-icon-1').classList.add('completed');
                    document.getElementById('step-icon-2').classList.add('active');
                    
                    // Scroll to top
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    alert('Your cart is empty. Please add items before proceeding.');
                }
            });
        }

        if (backToSummaryBtn) {
            backToSummaryBtn.addEventListener('click', function() {
                document.getElementById('checkout-step-2').classList.remove('active');
                document.getElementById('checkout-step-2').style.display = 'none';
                document.getElementById('checkout-step-1').classList.add('active');
                document.getElementById('checkout-step-1').style.display = 'block';
                
                // Update progress bar
                const progressBar = document.getElementById('checkout-progress-bar');
                if (progressBar) {
                    progressBar.style.width = '33%';
                }
                
                // Update step icons
                document.getElementById('step-icon-2').classList.remove('active');
                
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        if (continueToPaymentBtn) {
            continueToPaymentBtn.addEventListener('click', function() {
                document.getElementById('checkout-step-2').classList.remove('active');
                document.getElementById('checkout-step-2').style.display = 'none';
                document.getElementById('checkout-step-3').classList.add('active');
                document.getElementById('checkout-step-3').style.display = 'block';
                
                // Update progress bar
                const progressBar = document.getElementById('checkout-progress-bar');
                if (progressBar) {
                    progressBar.style.width = '100%';
                }
                
                // Update step icons
                document.getElementById('step-icon-2').classList.add('completed');
                document.getElementById('step-icon-3').classList.add('active');
                
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        if (backToAddressBtn) {
            backToAddressBtn.addEventListener('click', function() {
                document.getElementById('checkout-step-3').classList.remove('active');
                document.getElementById('checkout-step-3').style.display = 'none';
                document.getElementById('checkout-step-2').classList.add('active');
                document.getElementById('checkout-step-2').style.display = 'block';
                
                // Update progress bar
                const progressBar = document.getElementById('checkout-progress-bar');
                if (progressBar) {
                    progressBar.style.width = '66%';
                }
                
                // Update step icons
                document.getElementById('step-icon-3').classList.remove('active');
                
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        // Add event listener for the save address checkbox to toggle its visibility/state
        const saveAddressCheckbox = document.getElementById('saveAddress');
        if (saveAddressCheckbox) {
            saveAddressCheckbox.addEventListener('change', () => {
                // Logic to enable/disable save address functionality or show it
                console.log('Save address checkbox changed:', saveAddressCheckbox.checked);
            });
        }

        // Show/hide manual address form based on saved addresses availability
        // This is handled within loadSavedAddresses, but can be reinforced here if needed
        const savedAddressesSection = document.getElementById('saved-addresses-section');
        const manualAddressForm = document.getElementById('manual-address-form');
        const saveAddressOption = document.getElementById('save-address-option');

        if (savedAddressesSection && manualAddressForm && saveAddressOption) {
            // Initial visibility is managed by loadSavedAddresses
        }
    });

// Placeholder for LocalAddressManager if it's not globally available
// In a real application, this would be imported or defined elsewhere.
if (typeof LocalAddressManager === 'undefined') {
    console.warn('LocalAddressManager is not defined. Mocking for demonstration.');
    const LocalAddressManager = {
        addresses: [],
        load: function() {
            const storedAddresses = localStorage.getItem('guestAddresses');
            this.addresses = storedAddresses ? JSON.parse(storedAddresses) : [];
            return this.addresses;
        },
        save: function() {
            localStorage.setItem('guestAddresses', JSON.stringify(this.addresses));
        },
        getAddresses: function() {
            return this.load();
        },
        saveAddress: function(addressData) {
            // Assign a simple unique ID for demonstration
            const newAddress = { ...addressData, id: Date.now().toString(), uuid: crypto.randomUUID() };
            this.addresses.push(newAddress);
            this.save();
            return { success: true, address: newAddress };
        }
    };
    window.LocalAddressManager = LocalAddressManager; // Make it globally accessible for the example
}

// Placeholder for FirebaseAddressManager if it's not globally available
// In a real application, this would be imported or defined elsewhere.
if (typeof FirebaseAddressManager === 'undefined') {
    console.warn('FirebaseAddressManager is not defined. Mocking for demonstration.');
    const FirebaseAddressManager = {
        getAddresses: async function() {
            console.log('Mock: Fetching addresses from Firebase...');
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 500));
            // Return dummy data
            return [
                { id: 'fb-addr-1', firstName: 'Firebase', lastName: 'User', street: '123 Firebase St', city: 'Firetown', zip: '12345' },
                { id: 'fb-addr-2', firstName: 'Another', lastName: 'Firebase', street: '456 Cloud Ave', city: 'Cloudsville', zip: '67890' }
            ];
        },
        saveAddress: async function(addressData) {
            console.log('Mock: Saving address to Firebase:', addressData);
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 500));
            // Simulate success response
            return { success: true, error: null, id: 'fb-addr-' + Date.now() };
        }
    };
    window.FirebaseAddressManager = FirebaseAddressManager; // Make it globally accessible for the example
}

// Placeholder for LocalStorageCart if it's not globally available
// In a real application, this would be imported or defined elsewhere.
if (typeof LocalStorageCart === 'undefined') {
    console.warn('LocalStorageCart is not defined. Mocking for demonstration.');
    const LocalStorageCart = {
        getItems: function() {
            const storedCart = localStorage.getItem('cartItems');
            console.log('Mock: Getting items from localStorage:', storedCart ? JSON.parse(storedCart) : []);
            return storedCart ? JSON.parse(storedCart) : [];
        },
        addItem: function(item) {
            const cart = this.getItems();
            const existingItemIndex = cart.findIndex(cartItem => cartItem.id === item.id);
            if (existingItemIndex > -1) {
                cart[existingItemIndex].quantity += item.quantity;
            } else {
                cart.push(item);
            }
            localStorage.setItem('cartItems', JSON.stringify(cart));
            console.log('Mock: Added item to cart:', item);
        },
        removeItem: function(itemId) {
            let cart = this.getItems();
            cart = cart.filter(item => item.id !== itemId);
            localStorage.setItem('cartItems', JSON.stringify(cart));
            console.log('Mock: Removed item from cart with ID:', itemId);
        },
        updateQuantity: function(itemId, quantity) {
            let cart = this.getItems();
            const itemIndex = cart.findIndex(item => item.id === itemId);
            if (itemIndex > -1) {
                cart[itemIndex].quantity = quantity;
                if (quantity <= 0) {
                    cart.splice(itemIndex, 1); // Remove if quantity is zero or less
                }
                localStorage.setItem('cartItems', JSON.stringify(cart));
                console.log('Mock: Updated quantity for item ID:', itemId, 'to', quantity);
            }
        },
        clearCart: function() {
            localStorage.removeItem('cartItems');
            console.log('Mock: Cleared cart');
        }
    };
    window.LocalStorageCart = LocalStorageCart;
}