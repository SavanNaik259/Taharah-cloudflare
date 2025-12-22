// Firebase Messaging Service Worker
// Standard FCM implementation for background notifications
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyCrLCButDevLeILcBjrUCd9e7amXVjW-uI",
    authDomain: "auric-a0c92.firebaseapp.com",
    projectId: "auric-a0c92",
    storageBucket: "auric-a0c92.firebasestorage.app",
    messagingSenderId: "878979958342",
    appId: "1:878979958342:web:e6092f7522488d21eaec47"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Function to safely extract data - Firebase sends as strings or objects
function extractData(obj) {
    if (!obj) return {};
    if (typeof obj === 'string') {
        try {
            return JSON.parse(obj);
        } catch (e) {
            return obj;
        }
    }
    return obj;
}

// Function to display notification with image and button
function displayNotification(payload) {
    console.log('[firebase-messaging-sw.js] DISPLAYING NOTIFICATION');
    console.log('[firebase-messaging-sw.js] Full payload:', JSON.stringify(payload, null, 2));
    
    // Extract data from all possible FCM structures
    const data = payload.data || (payload.webpush && payload.webpush.data) || payload.notification || {};
    
    // Check if we've already shown this notification
    const notificationId = data.timestamp || data.tag || Date.now().toString();
    if (self.lastShownNotificationId === notificationId) {
        console.log('[firebase-messaging-sw.js] 🛑 Duplicate detected');
        return Promise.resolve();
    }
    self.lastShownNotificationId = notificationId;
    
    const title = data.title || 'Royal Meenakari';
    const options = {
        body: data.body || 'New update from Royal Meenakari',
        icon: data.icon || '/images/logos/royalmeenakari.png',
        badge: data.badge || '/images/logos/royalmeenakari.png',
        image: data.imageUrl || data.image || '',
        tag: 'royal-meenakari-notification',
        requireInteraction: true,
        data: {
            link: data.link || '/',
            category: data.category || 'general'
        },
        actions: [
            { 
                action: 'open', 
                title: data.buttonText || 'View'
            },
            {
                action: 'close',
                title: 'Dismiss'
            }
        ]
    };
    
    console.log('[firebase-messaging-sw.js] Final Options:', JSON.stringify(options, null, 2));
    return self.registration.showNotification(title, options);
}

// Handle background messages (app is closed/not in focus)
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] ======================================');
    console.log('[firebase-messaging-sw.js] onBackgroundMessage triggered');
    console.log('[firebase-messaging-sw.js] ======================================');
    console.log('[firebase-messaging-sw.js] Payload:', JSON.stringify(payload, null, 2));
    
    // Call our display function
    return displayNotification(payload);
});

// Handle notification click and action buttons
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification clicked - action:', event.action);
    event.notification.close();
    
    // Handle action button clicks
    if (event.action === 'close') {
        console.log('[firebase-messaging-sw.js] User dismissed notification');
        return;
    }
    
    // Get the target URL from notification data
    const targetUrl = event.notification.data?.link || '/';
    console.log('[firebase-messaging-sw.js] Opening URL:', targetUrl);
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            console.log('[firebase-messaging-sw.js] Found', clientList.length, 'windows');
            
            // Try to focus existing window with the target URL
            for (const client of clientList) {
                if (client.url.includes(targetUrl) || client.url === targetUrl) {
                    console.log('[firebase-messaging-sw.js] Focusing existing window');
                    return client.focus();
                }
            }
            
            // If no matching window, open a new one
            if (clients.openWindow) {
                console.log('[firebase-messaging-sw.js] Opening new window with URL:', targetUrl);
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
    console.log('[firebase-messaging-sw.js] Notification closed by user');
});
