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

// Handle background messages - THIS IS THE ONLY PLACE NOTIFICATIONS ARE SHOWN
messaging.onBackgroundMessage((payload) => {
  console.log('[Service Worker] Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'Auric Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/images/logos/royalmeenakari.png',
    badge: '/images/logos/royalmeenakari.png',
    tag: 'auric-notification',
    requireInteraction: false,
    data: {
      link: payload.data?.link || '/',
      FCM_MSG: payload
    }
  };

  // Add image if provided in data
  if (payload.data?.image) {
    notificationOptions.image = payload.data.image;
  }

  // Add action button if buttonText provided
  if (payload.data?.buttonText) {
    notificationOptions.actions = [
      {
        action: 'open',
        title: payload.data.buttonText
      }
    ];
  }

  // Show notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event.notification);
  
  event.notification.close();
  
  // Get the click action URL
  const clickAction = event.notification.data?.link || '/';
  
  // Open or focus the window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if window already exists
      for (let client of clientList) {
        if (client.url.includes(new URL(clickAction, self.location.origin).pathname) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow(clickAction);
      }
    })
  );
});
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('🔔 Background message received:', payload);
  // Firebase auto-displays webpush.notification - service worker just logs
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
