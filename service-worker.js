/**
 * Unified Service Worker for:
 * 1. Firebase Cloud Messaging - Push notifications
 * 2. Background event handling
 */

// Import Firebase for messaging
importScripts('https://www.gstatic.com/firebasejs/9.6.10/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.10/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCrLCButDevLeILcBjrUCd9e7amXVjW-uI",
  authDomain: "auric-a0c92.firebaseapp.com",
  projectId: "auric-a0c92",
  storageBucket: "auric-a0c92.firebasestorage.app",
  messagingSenderId: "878979958342",
  appId: "1:878979958342:web:e6092f7522488d21eaec47",
  measurementId: "G-ZYZ750JHMB"
};

// Initialize Firebase in Service Worker
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Get messaging instance
const messaging = firebase.messaging();

// Handle background messages - prevent duplicate notifications
messaging.onBackgroundMessage((payload) => {
  console.log('🔔 Background message received (background handler):', payload);
  // Firebase auto-displays notification from webpush.notification field
  // This handler just logs - DO NOT call showNotification() here to avoid duplicates
});

// Handle push events - prevent duplicate notifications
self.addEventListener('push', (event) => {
  console.log('📨 Push event received:', event);
  // Let Firebase Cloud Messaging handle the notification display
  // Do NOT prevent default or show notification here - Firebase will auto-display from webpush.notification
});

// NOTE: Generic 'push' event handler removed - Firebase messaging.onBackgroundMessage() handles all FCM notifications
// Having both listeners caused DUPLICATE notifications because Firebase sends to both handlers
// Keeping only messaging.onBackgroundMessage() ensures one notification per message

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('📬 Notification clicked');
  event.notification.close();

  const notificationData = event.notification.data;
  const link = notificationData.link || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        if (clientList[i].url === link && 'focus' in clientList[i]) {
          return clientList[i].focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(link);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('🚫 Notification closed');
});
