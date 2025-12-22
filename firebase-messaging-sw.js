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

self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification click received. Action:', event.action);
    
    // CRITICAL: Close notification manually first. 
    // On Android, notifications don't auto-close when clicking action buttons.
    event.notification.close();

    // Handle explicit dismiss
    if (event.action === 'close') {
        console.log('[SW] User clicked Dismiss.');
        return;
    }

    // Prepare target URL
    let targetUrl = '/';
    try {
        targetUrl = event.notification?.data?.link || '/';
    } catch (e) {
        console.error('[SW] Error parsing notification data:', e);
    }

    // Ensure absolute URL
    if (targetUrl.startsWith('/')) {
        targetUrl = self.location.origin + targetUrl;
    }

    console.log('[SW] Target URL:', targetUrl);

    // Use event.waitUntil to keep the worker alive
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // 1. Try to focus an existing window if it's already on the target URL
                for (const client of clientList) {
                    if (client.url === targetUrl && 'focus' in client) {
                        console.log('[SW] Focusing existing window.');
                        return client.focus();
                    }
                }

                // 2. If no window exists, or it's not the right URL, open a new one
                if (clients.openWindow) {
                    console.log('[SW] Opening new window.');
                    return clients.openWindow(targetUrl);
                }
            })
            .catch((error) => {
                console.error('[SW] Failed to handle notification click:', error);
            })
    );
});

// Function to display notification with image and button
function displayNotification(payload) {
    console.log('[firebase-messaging-sw.js] DISPLAYING NOTIFICATION');
    console.log('[firebase-messaging-sw.js] Full payload:', JSON.stringify(payload, null, 2));
    
    // In FCM v1, data arrives in payload.data
    const data = payload.data || {};
    
    const notificationId = data.timestamp || Date.now().toString();
    
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
        tag: notificationId,
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
