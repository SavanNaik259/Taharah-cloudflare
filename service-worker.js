/**
 * SINGLE Service Worker for Firebase Cloud Messaging
 * MUST have install/activate handlers to become "active"
 * Uses Firebase SDK v10.7.1
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

// ============================================================================
// INSTALL EVENT - CRITICAL: Must complete to allow activation
// ============================================================================
self.addEventListener('install', (event) => {
  console.log('⚙️ Service Worker: INSTALLING');
  
  event.waitUntil(
    (async () => {
      try {
        // This forces the SW to activate immediately (skips waiting)
        await self.skipWaiting();
        console.log('✅ Service Worker: INSTALL complete, skipping wait');
      } catch (error) {
        console.error('❌ Install error:', error);
      }
    })()
  );
});

// ============================================================================
// ACTIVATE EVENT - CRITICAL: Must complete to become "active"
// ============================================================================
self.addEventListener('activate', (event) => {
  console.log('⚙️ Service Worker: ACTIVATING');
  
  event.waitUntil(
    (async () => {
      try {
        // Claim all clients immediately (don't wait for page reload)
        await self.clients.claim();
        console.log('✅ Service Worker: ACTIVATED and claimed all clients');
      } catch (error) {
        console.error('❌ Activate error:', error);
      }
    })()
  );
});

// ============================================================================
// BACKGROUND MESSAGE HANDLER
// ============================================================================
messaging.onBackgroundMessage((payload) => {
  console.log('📬 Background message received:', payload);
  
  const notificationTitle = payload.notification?.title || 'Royal Meenakari';
  const notificationOptions = {
    body: payload.notification?.body || 'New notification',
    icon: payload.notification?.icon || '/images/logos/royalmeenakari.png',
    badge: payload.notification?.badge || '/images/logos/royalmeenakari.png',
    image: payload.notification?.image || undefined,
    tag: 'royal-meenakari-notification', // CRITICAL: Prevents duplicate notifications
    requireInteraction: false,
    data: payload.data || {}
  };
  
  // Remove undefined image property
  if (!notificationOptions.image) {
    delete notificationOptions.image;
  }
  
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// ============================================================================
// NOTIFICATION CLICK HANDLER
// ============================================================================
self.addEventListener('notificationclick', (event) => {
  console.log('✅ Notification clicked:', event.notification.title);
  event.notification.close();
  
  const urlToOpen = event.notification.data?.link || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Try to focus existing window
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window if not found
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

console.log('✅ Service Worker loaded successfully with install/activate handlers');
