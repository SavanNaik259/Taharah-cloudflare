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
    event.notification.close();

    // Dismiss action
    if (event.action === 'close') {
        return;
    }

    let targetUrl = '/';

    try {
        targetUrl = event.notification?.data?.link || '/';
    } catch (e) {}

    // Make absolute
    if (targetUrl.startsWith('/')) {
        targetUrl = self.location.origin + targetUrl;
    }

    event.waitUntil(
        new Promise((resolve) => {
            clients.openWindow(targetUrl)
                .then(() => resolve())
                .catch(() => resolve());
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
