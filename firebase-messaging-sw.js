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

// Handle notification click and action buttons
// Registering this BEFORE onBackgroundMessage to ensure it's captured
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification clicked - action:', event.action);
    event.notification.close();
    
    // Handle action button clicks
    if (event.action === 'close') {
        console.log('[firebase-messaging-sw.js] User dismissed notification');
        return;
    }
    
    // Get the target URL from notification data
    let targetUrl = '/';
    
    if (event.notification.data && event.notification.data.link) {
        targetUrl = event.notification.data.link;
    } else if (event.notification.link) {
        targetUrl = event.notification.link;
    }
    
    console.log('[firebase-messaging-sw.js] Target URL:', targetUrl);
    
    // Ensure relative links work by prepending current origin
    if (targetUrl.startsWith('/') && !targetUrl.startsWith('//')) {
        targetUrl = self.location.origin + targetUrl;
        console.log('[firebase-messaging-sw.js] Converted to absolute URL:', targetUrl);
    }
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            console.log('[firebase-messaging-sw.js] Found', clientList.length, 'windows');
            
            // Try to find a window on the same origin and navigate it or focus it
            for (const client of clientList) {
                const url = new URL(client.url);
                if (url.origin === self.location.origin) {
                    console.log('[firebase-messaging-sw.js] Navigating/Focusing existing window to:', targetUrl);
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

// Function to display notification with image and button
function displayNotification(payload) {
    console.log('[firebase-messaging-sw.js] DISPLAYING NOTIFICATION');
    console.log('[firebase-messaging-sw.js] Full payload:', JSON.stringify(payload, null, 2));
    
    // In FCM v1, data arrives in payload.data
    const data = payload.data || {};
    
    const notificationId = data.timestamp || data.tag || Date.now().toString();
    if (self.lastShownNotificationId === notificationId) {
        console.log('[firebase-messaging-sw.js] Duplicate detected, skipping');
        return Promise.resolve();
    }
    self.lastShownNotificationId = notificationId;
    
    const title = data.title || 'Royal Meenakari';
    const body = data.body || 'New update from Royal Meenakari';
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
    
    return self.registration.showNotification(title, options);
}

// Handle background messages (app is closed/not in focus)
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] onBackgroundMessage triggered');
    return displayNotification(payload);
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
    console.log('[firebase-messaging-sw.js] Notification closed by user');
});
