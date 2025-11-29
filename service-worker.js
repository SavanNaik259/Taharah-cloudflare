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

// Handle background messages - manually display notifications from data field
messaging.onBackgroundMessage((payload) => {
  console.log('🔔 Background message received:', payload);
  
  // Extract notification details from data field (sent by all notification functions)
  const data = payload.data || {};
  const title = data.title || 'Auric Notification';
  const body = data.body || 'New update from Auric';
  const image = data.image || '/images/logos/royalmeenakari.png';
  const link = data.link || '/';
  
  const notificationOptions = {
    body: body,
    icon: '/images/logos/royalmeenakari.png',
    badge: '/images/logos/royalmeenakari.png',
    image: image,
    tag: 'auric-notification',
    requireInteraction: false,
    data: { link: link }
  };
  
  // Manually display the notification
  self.registration.showNotification(title, notificationOptions);
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
