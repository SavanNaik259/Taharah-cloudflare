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
    console.log('[firebase-messaging-sw.js] ='.repeat(50));
    console.log('[firebase-messaging-sw.js] DISPLAYING NOTIFICATION');
    console.log('[firebase-messaging-sw.js] Payload structure:', Object.keys(payload));
    console.log('[firebase-messaging-sw.js] Full payload:', JSON.stringify(payload, null, 2));
    
    // Extract data - handle BOTH webpush notification and data fields
    const webpushNotif = payload.webpush?.notification || {};
    const webpushData = payload.webpush?.data || {};
    const dataObj = extractData(payload.data) || {};
    const notificationObj = payload.notification || {};
    
    console.log('[firebase-messaging-sw.js] Extracted sources:');
    console.log('  - webpushNotif keys:', Object.keys(webpushNotif));
    console.log('  - webpushData keys:', Object.keys(webpushData));
    console.log('  - dataObj keys:', Object.keys(dataObj));
    console.log('  - notificationObj keys:', Object.keys(notificationObj));
    
    // Get title - check all possible sources
    const notificationTitle = webpushNotif.title || notificationObj.title || dataObj.title || 'Royal Meenakari';
    
    // Get body - check all possible sources  
    const notificationBody = webpushNotif.body || notificationObj.body || dataObj.body || 'New update';
    
    // Get image - CRITICAL - check all sources
    const imageUrl = webpushNotif.image || dataObj.imageUrl || webpushData.imageUrl || '';
    
    // Get button text
    const buttonText = webpushNotif.actions?.[0]?.title || dataObj.buttonText || webpushData.buttonText || 'View';
    
    // Get link from data
    const link = dataObj.link || webpushData.link || '/';
    
    // Get icon
    const icon = webpushNotif.icon || dataObj.icon || '/images/logos/royalmeenakari.png';
    
    console.log('[firebase-messaging-sw.js] EXTRACTED VALUES:');
    console.log('  - Title:', notificationTitle);
    console.log('  - Body:', notificationBody);
    console.log('  - Image URL:', imageUrl, '(type:', typeof imageUrl, ', length:', imageUrl ? imageUrl.length : 0, ')');
    console.log('  - Button:', buttonText);
    console.log('  - Link:', link);
    console.log('  - Icon:', icon);
    
    const notificationOptions = {
        body: notificationBody,
        icon: icon,
        tag: 'royal-meenakari-notification',
        requireInteraction: false,
        badge: icon,
        data: {
            link: link,
            category: dataObj.category || webpushData.category || 'general'
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
    
    // Add image ONLY if it has actual content
    if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim().length > 5) {
        notificationOptions.image = imageUrl;
        console.log('[firebase-messaging-sw.js] ✅ IMAGE ADDED:', imageUrl.substring(0, 50) + '...');
    } else {
        console.log('[firebase-messaging-sw.js] ❌ IMAGE NOT ADDED - imageUrl:', imageUrl);
    }

    console.log('[firebase-messaging-sw.js] FINAL OPTIONS:', JSON.stringify(notificationOptions, null, 2));
    
    try {
        console.log('[firebase-messaging-sw.js] 🔔 Calling showNotification...');
        const notifPromise = self.registration.showNotification(notificationTitle, notificationOptions);
        console.log('[firebase-messaging-sw.js] ✅ NOTIFICATION DISPLAYED SUCCESSFULLY');
        return notifPromise;
    } catch (error) {
        console.error('[firebase-messaging-sw.js] ❌ ERROR:', error.message);
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
