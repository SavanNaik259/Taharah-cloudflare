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

// Handle background messages - MANUALLY display notification with full details
messaging.onBackgroundMessage((payload) => {
  console.log('🔔 Background message received:', payload);
  
  // Extract notification details from webpush.notification field
  const notificationData = payload.notification || {};
  const title = notificationData.title || 'Auric';
  const options = {
    body: notificationData.body || 'New notification from Auric',
    icon: notificationData.icon || '/images/logos/royalmeenakari.png',
    badge: notificationData.badge || '/images/logos/royalmeenakari.png',
    image: notificationData.image || '/images/logos/royalmeenakari.png',
    tag: 'auric-notification',
    requireInteraction: false,
    data: {
      link: (payload.data && payload.data.link) || notificationData.click_action || '/'
    }
  };
  
  // Manually show the notification with all details
  self.registration.showNotification(title, options);
});

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
