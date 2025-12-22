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

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message', JSON.stringify(payload, null, 2));
    console.log('[firebase-messaging-sw.js] Payload data:', payload.data);
    console.log('[firebase-messaging-sw.js] Payload notification:', payload.notification);
    console.log('[firebase-messaging-sw.js] Payload webpush:', payload.webpush);
    
    // Extract data from payload - check both data and notification structures
    const dataObj = payload.data || {};
    const notificationObj = payload.notification || {};
    
    // Get title from data first, then notification, then default
    const notificationTitle = dataObj.title || notificationObj.title || 'New Notification';
    
    // Get body from data first, then notification, then default
    const notificationBody = dataObj.body || notificationObj.body || 'Check out the latest update!';
    
    // Get button text from data
    const buttonText = dataObj.buttonText || 'View';
    
    // Get image URL from data
    const imageUrl = dataObj.imageUrl || '';
    
    // Get link from data
    const link = dataObj.link || '/';
    
    // Get icon from data or use default
    const icon = dataObj.icon || notificationObj.icon || '/images/logos/royalmeenakari-icon.svg';
    
    console.log(`[firebase-messaging-sw.js] Displaying notification: ${notificationTitle} - Image: ${imageUrl} - Button: ${buttonText}`);
    
    const notificationOptions = {
        body: notificationBody,
        icon: icon,
        tag: 'royal-meenakari-notification',
        requireInteraction: false,
        data: {
            link: link,
            category: dataObj.category || 'general'
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
    
    // Add image if provided - this is critical for showing the image
    if (imageUrl && imageUrl.length > 0) {
        notificationOptions.image = imageUrl;
        console.log(`[firebase-messaging-sw.js] Added image to notification: ${imageUrl}`);
    }
    
    // Add badge if provided
    if (notificationObj.badge || dataObj.badge) {
        notificationOptions.badge = notificationObj.badge || dataObj.badge;
    }

    console.log('[firebase-messaging-sw.js] Final notification options:', JSON.stringify(notificationOptions, null, 2));
    
    try {
        const notifPromise = self.registration.showNotification(notificationTitle, notificationOptions);
        console.log('[firebase-messaging-sw.js] Notification displayed successfully');
        return notifPromise;
    } catch (error) {
        console.error('[firebase-messaging-sw.js] Error displaying notification:', error);
        return null;
    }
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
