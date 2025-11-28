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

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('🔔 Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'Auric';
  const notificationOptions = {
    body: payload.notification?.body || 'New notification from Auric',
    icon: '/images/logos/royalmeenakari.png',
    badge: '/images/logos/royalmeenakari.png',
    image: payload.notification?.image || '/images/logos/royalmeenakari.png',
    tag: payload.data?.tag || 'auric-notification',
    data: payload.data || {},
    click_action: payload.data?.link || '/'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle push events (for non-Firebase push messages)
self.addEventListener('push', (event) => {
  console.log('🔔 Push notification received');

  let notificationData = {
    title: 'Auric Notifications',
    body: 'New notification from Auric'
  };

  try {
    notificationData = event.data.json();
  } catch (error) {
    notificationData.body = event.data.text();
  }

  const options = {
    body: notificationData.body,
    icon: '/images/logos/royalmeenakari.png',
    badge: '/images/logos/royalmeenakari.png',
    image: notificationData.image || '/images/logos/royalmeenakari.png',
    tag: notificationData.tag || 'auric-notification',
    data: notificationData.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
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
