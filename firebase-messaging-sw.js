// Firebase Messaging Service Worker
// Handles push notification display when app is in background

try {
  importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
} catch (error) {
  console.error('Failed to import Firebase App:', error);
}

try {
  importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');
} catch (error) {
  console.error('Failed to import Firebase Messaging:', error);
}

// Initialize Firebase with error handling
let messaging = null;

try {
  const firebaseConfig = {
    apiKey: "AIzaSyCrLCButDevLeILcBjrUCd9e7amXVjW-uI",
    authDomain: "auric-a0c92.firebaseapp.com",
    projectId: "auric-a0c92",
    storageBucket: "auric-a0c92.firebasestorage.app",
    messagingSenderId: "878979958342",
    appId: "1:878979958342:web:e6092f7522488d21eaec47",
    measurementId: "G-ZYZ750JHMB"
  };

  if (typeof firebase !== 'undefined' && firebase.initializeApp) {
    firebase.initializeApp(firebaseConfig);
    messaging = firebase.messaging();
    console.log('✅ Firebase Messaging initialized in Service Worker');
  } else {
    console.error('❌ Firebase not available in Service Worker');
  }
} catch (error) {
  console.error('❌ Error initializing Firebase in Service Worker:', error);
}

// Handle background messages
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log('📨 Received background message', payload);
    
    const notificationTitle = payload.notification?.title || 'New Promotion';
    const notificationOptions = {
      body: payload.notification?.body || 'Check out our latest offers!',
      icon: '/images/logos/royalmeenakari.png',
      badge: '/images/logos/royalmeenakari.png',
      tag: 'auric-notification',
      data: payload.data || {},
      requireInteraction: false
    };

    console.log('🔔 Displaying notification:', notificationTitle);
    self.registration.showNotification(notificationTitle, notificationOptions);
  });
  console.log('✅ Background message handler registered');
} else {
  console.warn('⚠️ Firebase Messaging not available, background messages will not be handled');
}

// Handle push events (backup for cases where onBackgroundMessage might not work)
self.addEventListener('push', event => {
  console.log('📬 Push event received:', event);
  
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('📄 Push payload:', payload);
      
      const title = payload.notification?.title || 'New Update';
      const options = {
        body: payload.notification?.body || 'Check your notifications',
        icon: '/images/logos/royalmeenakari.png',
        badge: '/images/logos/royalmeenakari.png',
        tag: 'auric-notification',
        data: payload.data || {}
      };
      
      event.waitUntil(
        self.registration.showNotification(title, options)
      );
    } catch (err) {
      console.error('Error parsing push payload:', err);
    }
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.notification.data && event.notification.data.link) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === event.notification.data.link && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.link);
        }
      })
    );
  }
});
