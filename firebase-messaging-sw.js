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
    
    // In FCM v1, data arrives in payload.data
    const data = payload.data || {};
    
    // Use the custom timestamp or tag for deduplication
    const notificationId = data.timestamp || data.tag || Date.now().toString();
    if (self.lastShownNotificationId === notificationId) {
        console.log('[firebase-messaging-sw.js] Duplicate detected, skipping');
        return Promise.resolve();
    }
    self.lastShownNotificationId = notificationId;
    
    const title = data.title || 'Royal Meenakari';
    const body = data.body || 'New update from Royal Meenakari';
    
    // Use the same domain for relative images if needed, or absolute URLs
    const image = data.imageUrl || data.image || '';
    const buttonText = data.buttonText || 'View';
    const icon = data.icon || '/images/logos/royalmeenakari.png';
    const link = data.link || '/';
    
    const options = {
        body: body,
        icon: icon,
        badge: icon,
        image: image,
        tag: 'royal-meenakari-notification',
        requireInteraction: true,
        data: {
            link: link
        },
        actions: [
            { 
                action: 'open', 
                title: buttonText
            },
            {
                action: 'close',
                title: 'Dismiss'
            }
        ]
    };
    
    console.log('[firebase-messaging-sw.js] Final Options:', JSON.stringify(options, null, 2));
    
    // Use self.registration.showNotification to ensure background notifications show up
    return self.registration.showNotification(title, options)
        .then(() => {
            console.log('[firebase-messaging-sw.js] Notification shown successfully');
        })
        .catch(err => {
            console.error('[firebase-messaging-sw.js] Error showing notification:', err);
        });
}

// Handle background messages (app is closed/not in focus)
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] ======================================');
    console.log('[firebase-messaging-sw.js] onBackgroundMessage triggered');
    console.log('[firebase-messaging-sw.js] ======================================');
    console.log('[firebase-messaging-sw.js] Payload:', JSON.stringify(payload, null, 2));
    
    // We strictly use data-only messages from the server.
    // This allows the Service Worker to display the notification exactly as we want
    // with images and buttons, while preventing the browser from showing a default one.
    
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
    let targetUrl = event.notification.data?.link || '/';
    console.log('[firebase-messaging-sw.js] Target URL before check:', targetUrl);
    
    // Ensure relative links work by prepending current origin
    if (targetUrl.startsWith('/') && !targetUrl.startsWith('//')) {
        targetUrl = self.location.origin + targetUrl;
        console.log('[firebase-messaging-sw.js] Converted to absolute URL:', targetUrl);
    }
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            console.log('[firebase-messaging-sw.js] Found', clientList.length, 'windows');
            
            // Try to focus existing window with the target URL
            for (const client of clientList) {
                if (client.url === targetUrl || client.url + '/' === targetUrl || targetUrl + '/' === client.url) {
                    console.log('[firebase-messaging-sw.js] Focusing existing window');
                    return client.focus();
                }
            }
            
            // If no exact match, try to find a window on the same origin and navigate it
            for (const client of clientList) {
                if (new URL(client.url).origin === self.location.origin) {
                    console.log('[firebase-messaging-sw.js] Navigating existing window to:', targetUrl);
                    return client.navigate(targetUrl).then(c => c.focus());
                }
            }
            
            // If no matching window or same-origin window, open a new one
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
