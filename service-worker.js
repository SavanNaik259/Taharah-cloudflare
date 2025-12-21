/**
 * UNIFIED Service Worker for Firebase Cloud Messaging
 * Handles ALL notifications (foreground + background)
 * Uses notification tags to prevent duplicates
 */

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyCrLCButDevLeILcBjrUCd9e7amXVjW-uI",
  authDomain: "auric-a0c92.firebaseapp.com",
  projectId: "auric-a0c92",
  storageBucket: "auric-a0c92.firebasestorage.app",
  messagingSenderId: "878979958342",
  appId: "1:878979958342:web:e6092f7522488d21eaec47",
  measurementId: "G-ZYZ750JHMB"
};

try {
  firebase.initializeApp(firebaseConfig);
  console.log('✅ Firebase initialized in Service Worker');
} catch (error) {
  console.error('❌ Firebase init error:', error);
}

const messaging = firebase.messaging();

self.addEventListener('install', (event) => {
  console.log('⚙️ Service Worker: INSTALLING');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('⚙️ Service Worker: ACTIVATING');
  event.waitUntil(self.clients.claim());
});

// SINGLE notification handler for ALL messages (foreground + background)
messaging.onBackgroundMessage((payload) => {
  console.log('📬 FCM message received:', payload);

  const notificationTitle = payload.notification?.title || 'Royal Meenakari';

  // CRITICAL: Use unique tag from message ID to prevent duplicates
  const messageId = payload.messageId || payload.fcmMessageId || Date.now();
  const notificationTag = `fcm-${messageId}`;

  const notificationOptions = {
    body: payload.notification?.body || 'New notification',
    icon: payload.notification?.icon || '/images/logos/royalmeenakari.png',
    badge: payload.notification?.badge || '/images/logos/royalmeenakari.png',
    image: payload.notification?.image,
    tag: notificationTag, // PREVENTS DUPLICATES - same tag replaces previous notification
    renotify: false, // Don't re-alert for same tag
    requireInteraction: false,
    data: payload.data || {},
    timestamp: Date.now()
  };

  if (!notificationOptions.image) {
    delete notificationOptions.image;
  }

  console.log(`✅ Showing notification with tag: ${notificationTag}`);
  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  console.log('✅ Notification clicked:', event.notification.tag);
  event.notification.close();

  const urlToOpen = event.notification.data?.link || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

console.log('✅ Unified Service Worker loaded');