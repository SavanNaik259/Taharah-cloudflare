/**
 * Firebase Messaging Service Worker
 * Handles background push notifications from Firebase Cloud Messaging
 */

// Import Firebase messaging scripts
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

// Initialize Firebase
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

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('📬 Notification clicked');
  event.notification.close();

  const link = event.notification.data.link || '/';

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
