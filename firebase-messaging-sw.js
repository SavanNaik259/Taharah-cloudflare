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

// Function to display notification with image and button
function displayNotification(payload) {
    console.log('[firebase-messaging-sw.js] displayNotification() called with payload:', JSON.stringify(payload, null, 2));
    
    // Extract data from payload - data field is where all our custom fields are
    const dataObj = payload.data || {};
    const notificationObj = payload.notification || {};
    
    // Get title from data (preferred) or notification
    const notificationTitle = dataObj.title || notificationObj.title || 'Royal Meenakari';
    
    // Get body from data (preferred) or notification
    const notificationBody = dataObj.body || notificationObj.body || 'Check out the latest update!';
    
    // Get button text from data
    const buttonText = dataObj.buttonText || 'View';
    
    // Get image URL from data - CRITICAL
    const imageUrl = dataObj.imageUrl || '';
    
    // Get link from data
    const link = dataObj.link || '/';
    
    // Get icon from data or use default
    const icon = dataObj.icon || notificationObj.icon || '/images/logos/royalmeenakari.png';
    
    console.log('[firebase-messaging-sw.js] Building notification:');
    console.log('  - Title:', notificationTitle);
    console.log('  - Body:', notificationBody);
    console.log('  - Image URL:', imageUrl);
    console.log('  - Button:', buttonText);
    console.log('  - Link:', link);
    
    const notificationOptions = {
        body: notificationBody,
        icon: icon,
        tag: 'royal-meenakari-notification',
        requireInteraction: false,
        badge: '/images/logos/royalmeenakari.png',
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
    
    // Add image if provided - CRITICAL for rich notifications
    if (imageUrl && imageUrl.trim().length > 0) {
        notificationOptions.image = imageUrl;
        console.log('[firebase-messaging-sw.js] ✅ Image added to notification:', imageUrl);
    } else {
        console.log('[firebase-messaging-sw.js] ⚠️ No image URL provided');
    }

    console.log('[firebase-messaging-sw.js] Final notification options:', JSON.stringify(notificationOptions, null, 2));
    
    try {
        console.log('[firebase-messaging-sw.js] Calling self.registration.showNotification()...');
        const notifPromise = self.registration.showNotification(notificationTitle, notificationOptions);
        console.log('[firebase-messaging-sw.js] ✅ Notification displayed successfully');
        return notifPromise;
    } catch (error) {
        console.error('[firebase-messaging-sw.js] ❌ Error displaying notification:', error);
        return Promise.reject(error);
    }
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
