if (typeof firebase === 'undefined') {
    console.error('Firebase is not initialized. Make sure to include Firebase SDK and initialize it first.');
}

function checkOrderAuthRequirement() {
    const result = {
        requiresAuth: false,
        isAuthenticated: false
    };
    
    if (firebase.auth && firebase.auth().currentUser) {
        result.isAuthenticated = true;
    }
    
    console.log('Guest checkout enabled - authentication not required');
    
    return result;
}

async function saveOrderToFirebase(orderData) {
    try {
        if (!orderData || !orderData.customer || !orderData.products) {
            console.error('Invalid order data structure');
            return {
                success: false,
                error: 'Invalid order data structure'
            };
        }
        
        const user = firebase.auth().currentUser;
        
        const firebaseOrderData = {
            ...orderData,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: new Date().toISOString(),
            userId: user ? user.uid : 'guest',
            isGuestOrder: !user
        };
        
        console.log('Attempting to save order to Firebase with data:', {
            orderReference: firebaseOrderData.orderReference,
            paymentMethod: firebaseOrderData.paymentMethod,
            paymentStatus: firebaseOrderData.paymentStatus,
            totalAmount: firebaseOrderData.totalAmount,
            itemCount: firebaseOrderData.products?.length || 0,
            isGuestOrder: firebaseOrderData.isGuestOrder
        });
        
        let orderRef;
        
        if (user) {
            console.log('User authenticated, saving to user orders collection:', user.uid);
            const userOrdersRef = firebase.firestore().collection('users').doc(user.uid).collection('orders');
            orderRef = await userOrdersRef.add(firebaseOrderData);
        } else {
            console.log('Guest order detected, saving to root guest-orders collection');
            const guestOrdersRef = firebase.firestore().collection('guest-orders');
            orderRef = await guestOrdersRef.add(firebaseOrderData);
        }
        
        console.log('Successfully saved order to Firebase with ID:', orderRef.id, 'isGuest:', !user);
        
        localStorage.removeItem('admin_all_orders_cache');
        localStorage.removeItem('admin_dashboard_orders');
        
        return {
            success: true,
            orderId: orderRef.id
        };
    } catch (error) {
        console.error('Error saving order to Firebase:', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            stack: error.stack
        });
        
        return {
            success: false,
            error: error.message || 'Unknown error occurred while saving order'
        };
    }
}

async function updateOrderPaymentStatus(orderId, paymentData) {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            return {
                success: false,
                error: 'Authentication required to update order'
            };
        }
        
        const orderRef = firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .collection('orders')
            .doc(orderId);
        
        await orderRef.update({
            paymentStatus: paymentData.paymentStatus,
            paymentId: paymentData.paymentId,
            paymentSignature: paymentData.paymentSignature,
            paymentUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        return {
            success: true
        };
    } catch (error) {
        console.error('Error updating order payment status:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function getUserOrders() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            return {
                success: false,
                error: 'Authentication required to view orders'
            };
        }
        
        const userOrdersRef = firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .collection('orders');
        
        const orderSnapshot = await userOrdersRef
            .orderBy('timestamp', 'desc')
            .get();
        
        const orders = orderSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                orderDate: data.timestamp ? data.timestamp.toDate().toISOString() : new Date().toISOString()
            };
        });
        
        return {
            success: true,
            orders
        };
    } catch (error) {
        console.error('Error getting user orders:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function getAllOrders(forceFresh) {
    try {
        const cacheKey = 'admin_all_orders_cache';
        const cacheTTL = 60 * 60 * 1000;
        
        if (!forceFresh) {
            try {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    const { timestamp, data } = JSON.parse(cached);
                    const age = Date.now() - timestamp;
                    if (age < cacheTTL && Array.isArray(data)) {
                        console.log('✅ Using cached orders from localStorage:', data.length, 'orders (age: ' + Math.round(age/60000) + 'm)');
                        return {
                            success: true,
                            orders: data,
                            fromCache: true
                        };
                    }
                }
            } catch (e) {
                console.warn('Cache read error, fetching fresh:', e);
            }
        } else {
            console.log('🔄 Force fresh requested - skipping cache');
        }
        
        console.log('📡 Cache miss - fetching fresh orders from Firebase...');
        const orders = await fetchAllOrdersFresh();
        
        try {
            localStorage.setItem(cacheKey, JSON.stringify({
                timestamp: Date.now(),
                data: orders
            }));
            console.log('💾 Cached', orders.length, 'orders to localStorage');
        } catch (e) {
            console.warn('Failed to cache orders (storage full?):', e);
        }
        
        return {
            success: true,
            orders: orders,
            fromCache: false
        };
    } catch (error) {
        console.error('Error getting all orders:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function fetchAllOrdersFresh() {
    const allOrders = [];
    const startTime = Date.now();
    
    console.log('📡 Fetching all orders from Firebase (parallel mode)...');
    
    const usersSnapshot = await firebase.firestore().collection('users').get();
    
    const orderPromises = usersSnapshot.docs.map(async (userDoc) => {
        const userId = userDoc.id;
        const userOrdersSnapshot = await userDoc.ref.collection('orders').get();
        const userOrders = [];
        
        userOrdersSnapshot.forEach(orderDoc => {
            const data = orderDoc.data();
            userOrders.push({
                id: orderDoc.id,
                userId: userId,
                isGuestOrder: false,
                ...data,
                orderDate: data.timestamp ? data.timestamp.toDate().toISOString() : new Date().toISOString()
            });
        });
        
        return userOrders;
    });
    
    const guestPromise = firebase.firestore().collection('guest-orders').get().then(snapshot => {
        const guestOrders = [];
        snapshot.forEach(orderDoc => {
            const data = orderDoc.data();
            guestOrders.push({
                id: orderDoc.id,
                userId: 'guest',
                isGuestOrder: true,
                ...data,
                orderDate: data.timestamp ? data.timestamp.toDate().toISOString() : new Date().toISOString()
            });
        });
        return guestOrders;
    });
    
    const [userOrderArrays, guestOrders] = await Promise.all([
        Promise.all(orderPromises),
        guestPromise
    ]);
    
    userOrderArrays.forEach(orders => allOrders.push(...orders));
    allOrders.push(...guestOrders);
    
    allOrders.sort((a, b) => {
        const aTime = new Date(a.orderDate).getTime();
        const bTime = new Date(b.orderDate).getTime();
        return bTime - aTime;
    });
    
    const elapsed = Date.now() - startTime;
    console.log('✅ Fetched', allOrders.length, 'orders in', elapsed + 'ms (Users:', usersSnapshot.size, ', Guest orders:', guestOrders.length, ')');
    
    return allOrders;
}

function invalidateOrdersCache() {
    localStorage.removeItem('admin_all_orders_cache');
    localStorage.removeItem('admin_dashboard_orders');
    console.log('🗑️ Orders cache invalidated');
}

window.firebaseOrdersModule = {
    checkOrderAuthRequirement,
    saveOrderToFirebase,
    updateOrderPaymentStatus,
    getUserOrders,
    getAllOrders,
    invalidateOrdersCache
};

console.log('Firebase Orders module loaded');
