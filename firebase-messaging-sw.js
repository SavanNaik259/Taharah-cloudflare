/**
 * Firebase Cloud Messaging Service Worker
 * CRITICAL: This file MUST be at the root of your domain (/firebase-messaging-sw.js)
 * Handles background push notifications
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

messaging.onBackgroundMessage((payload) => {
  console.log('📬 Background message:', payload);
  
  const notificationTitle = payload.notification?.title || 'Royal Meenakari';
  const notificationOptions = {
    body: payload.notification?.body || 'New notification from Royal Meenakari',
    icon: payload.notification?.icon || '/images/logos/royalmeenakari.png',
    badge: payload.notification?.badge || '/images/logos/royalmeenakari.png',
    image: payload.notification?.image || undefined,
    tag: 'fcm-notification',
    requireInteraction: false,
    data: payload.data || {}
  };
  
  if (!notificationOptions.image) {
    delete notificationOptions.image;
  }
  
  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  console.log('✅ Notification clicked:', event.notification.title);
  event.notification.close();
  
  const urlToOpen = event.notification.data?.link || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
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
