if (typeof firebase === 'undefined') {
    console.error('Firebase is not initialized. Make sure to include Firebase SDK and initialize it first.');
}

var _userOrdersUnsubscribe = null;
var _guestOrdersUnsubscribe = null;
var _userOrdersData = [];
var _guestOrdersData = [];
var _ordersListenerCallback = null;
var _listenersReady = { users: false, guests: false };
var _initialLoadDone = false;

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

function _mergeAndNotify() {
    const allOrders = [..._userOrdersData, ..._guestOrdersData];
    
    allOrders.sort((a, b) => {
        const aTime = new Date(a.orderDate).getTime();
        const bTime = new Date(b.orderDate).getTime();
        return bTime - aTime;
    });
    
    try {
        localStorage.setItem('admin_all_orders_cache', JSON.stringify({
            timestamp: Date.now(),
            data: allOrders
        }));
    } catch (e) {
        console.warn('Failed to cache orders to localStorage:', e);
    }
    
    if (_ordersListenerCallback) {
        _ordersListenerCallback(allOrders);
    }
}

function setupOrdersListener(onOrdersChanged) {
    stopOrdersListener();
    
    _ordersListenerCallback = onOrdersChanged;
    _listenersReady = { users: false, guests: false };
    _initialLoadDone = false;
    
    console.log('🔴 Setting up real-time order listeners...');
    
    var userOrdersByUser = {};
    
    firebase.firestore().collection('users').get().then(function(usersSnapshot) {
        var userCount = usersSnapshot.size;
        var listenersSetup = 0;
        
        if (userCount === 0) {
            _userOrdersData = [];
            _listenersReady.users = true;
            if (_listenersReady.guests) _mergeAndNotify();
            return;
        }
        
        usersSnapshot.forEach(function(userDoc) {
            var userId = userDoc.id;
            userOrdersByUser[userId] = [];
            
            var unsubUser = userDoc.ref.collection('orders').onSnapshot(function(snapshot) {
                var userOrders = [];
                snapshot.forEach(function(orderDoc) {
                    var data = orderDoc.data();
                    userOrders.push({
                        id: orderDoc.id,
                        userId: userId,
                        isGuestOrder: false,
                        ...data,
                        orderDate: data.timestamp ? data.timestamp.toDate().toISOString() : new Date().toISOString()
                    });
                });
                
                userOrdersByUser[userId] = userOrders;
                
                var allUserOrders = [];
                Object.keys(userOrdersByUser).forEach(function(uid) {
                    allUserOrders = allUserOrders.concat(userOrdersByUser[uid]);
                });
                _userOrdersData = allUserOrders;
                
                if (!_listenersReady.users) {
                    listenersSetup++;
                    if (listenersSetup >= userCount) {
                        _listenersReady.users = true;
                        console.log('✅ Real-time listener active for', userCount, 'user order collections');
                        if (_listenersReady.guests) {
                            if (!_initialLoadDone) {
                                _initialLoadDone = true;
                                console.log('🔴 Initial real-time load complete:', _userOrdersData.length + _guestOrdersData.length, 'total orders');
                            }
                            _mergeAndNotify();
                        }
                    }
                } else {
                    var changes = snapshot.docChanges();
                    if (changes.length > 0) {
                        var added = changes.filter(function(c) { return c.type === 'added'; }).length;
                        var modified = changes.filter(function(c) { return c.type === 'modified'; }).length;
                        var removed = changes.filter(function(c) { return c.type === 'removed'; }).length;
                        console.log('🔴 User orders changed - added:', added, 'modified:', modified, 'removed:', removed);
                    }
                    _mergeAndNotify();
                }
            }, function(error) {
                console.error('Error in user orders listener for', userId, ':', error);
            });
            
            if (!_userOrdersUnsubscribe) {
                _userOrdersUnsubscribe = [];
            }
            if (!Array.isArray(_userOrdersUnsubscribe)) {
                _userOrdersUnsubscribe = [];
            }
            _userOrdersUnsubscribe.push(unsubUser);
        });
    }).catch(function(error) {
        console.error('Error setting up user order listeners:', error);
        _listenersReady.users = true;
        _userOrdersData = [];
        if (_listenersReady.guests) _mergeAndNotify();
    });
    
    _guestOrdersUnsubscribe = firebase.firestore().collection('guest-orders')
        .onSnapshot(function(snapshot) {
            var guestOrders = [];
            snapshot.forEach(function(orderDoc) {
                var data = orderDoc.data();
                guestOrders.push({
                    id: orderDoc.id,
                    userId: 'guest',
                    isGuestOrder: true,
                    ...data,
                    orderDate: data.timestamp ? data.timestamp.toDate().toISOString() : new Date().toISOString()
                });
            });
            
            _guestOrdersData = guestOrders;
            
            if (!_listenersReady.guests) {
                _listenersReady.guests = true;
                console.log('✅ Real-time listener active for guest orders (' + guestOrders.length + ' orders)');
                if (_listenersReady.users) {
                    if (!_initialLoadDone) {
                        _initialLoadDone = true;
                        console.log('🔴 Initial real-time load complete:', _userOrdersData.length + _guestOrdersData.length, 'total orders');
                    }
                    _mergeAndNotify();
                }
            } else {
                var changes = snapshot.docChanges();
                if (changes.length > 0) {
                    var added = changes.filter(function(c) { return c.type === 'added'; }).length;
                    var modified = changes.filter(function(c) { return c.type === 'modified'; }).length;
                    var removed = changes.filter(function(c) { return c.type === 'removed'; }).length;
                    console.log('🔴 Guest orders changed - added:', added, 'modified:', modified, 'removed:', removed);
                }
                _mergeAndNotify();
            }
        }, function(error) {
            console.error('Error in guest orders listener:', error);
            _listenersReady.guests = true;
            _guestOrdersData = [];
            if (_listenersReady.users) _mergeAndNotify();
        });
    
    console.log('🔴 Real-time listeners setup initiated');
}

function stopOrdersListener() {
    if (_userOrdersUnsubscribe) {
        if (Array.isArray(_userOrdersUnsubscribe)) {
            _userOrdersUnsubscribe.forEach(function(unsub) {
                if (typeof unsub === 'function') unsub();
            });
        } else if (typeof _userOrdersUnsubscribe === 'function') {
            _userOrdersUnsubscribe();
        }
        _userOrdersUnsubscribe = null;
    }
    if (_guestOrdersUnsubscribe) {
        _guestOrdersUnsubscribe();
        _guestOrdersUnsubscribe = null;
    }
    _ordersListenerCallback = null;
    _listenersReady = { users: false, guests: false };
    _initialLoadDone = false;
    console.log('🔴 Real-time order listeners stopped');
}

function getAllOrdersFromCache() {
    try {
        var cached = localStorage.getItem('admin_all_orders_cache');
        if (cached) {
            var parsed = JSON.parse(cached);
            if (Array.isArray(parsed.data)) {
                console.log('✅ Loaded', parsed.data.length, 'orders from localStorage cache');
                return { success: true, orders: parsed.data, fromCache: true };
            }
        }
    } catch (e) {
        console.warn('Cache read error:', e);
    }
    return { success: true, orders: [], fromCache: false };
}

async function getAllOrders(forceFresh) {
    try {
        var cacheKey = 'admin_all_orders_cache';
        var cacheTTL = 24 * 60 * 60 * 1000;
        
        if (!forceFresh) {
            try {
                var cached = localStorage.getItem(cacheKey);
                if (cached) {
                    var parsed = JSON.parse(cached);
                    var age = Date.now() - parsed.timestamp;
                    if (age < cacheTTL && Array.isArray(parsed.data)) {
                        console.log('✅ Using cached orders from localStorage:', parsed.data.length, 'orders (age: ' + Math.round(age/60000) + 'm)');
                        return {
                            success: true,
                            orders: parsed.data,
                            fromCache: true
                        };
                    }
                }
            } catch (e) {
                console.warn('Cache read error, fetching fresh:', e);
            }
        }
        
        console.log('📡 Cache miss - fetching fresh orders from Firebase...');
        var orders = await fetchAllOrdersFresh();
        
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
    var allOrders = [];
    var startTime = Date.now();
    
    console.log('📡 Fetching all orders from Firebase (parallel mode)...');
    
    var usersSnapshot = await firebase.firestore().collection('users').get();
    
    var orderPromises = usersSnapshot.docs.map(async function(userDoc) {
        var userId = userDoc.id;
        var userOrdersSnapshot = await userDoc.ref.collection('orders').get();
        var userOrders = [];
        
        userOrdersSnapshot.forEach(function(orderDoc) {
            var data = orderDoc.data();
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
    
    var guestPromise = firebase.firestore().collection('guest-orders').get().then(function(snapshot) {
        var guestOrders = [];
        snapshot.forEach(function(orderDoc) {
            var data = orderDoc.data();
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
    
    var results = await Promise.all([
        Promise.all(orderPromises),
        guestPromise
    ]);
    
    var userOrderArrays = results[0];
    var guestOrders = results[1];
    
    userOrderArrays.forEach(function(orders) { allOrders = allOrders.concat(orders); });
    allOrders = allOrders.concat(guestOrders);
    
    allOrders.sort(function(a, b) {
        return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
    });
    
    var elapsed = Date.now() - startTime;
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
    getAllOrdersFromCache,
    invalidateOrdersCache,
    setupOrdersListener,
    stopOrdersListener
};

console.log('Firebase Orders module loaded');
