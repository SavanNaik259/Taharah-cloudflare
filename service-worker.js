/**
 * Service Worker for handling background notifications
 */

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

self.addEventListener('notificationclick', (event) => {
  console.log('📬 Notification clicked');
  event.notification.close();

  const notificationData = event.notification.data;
  const link = notificationData.link || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if window already open
      for (let i = 0; i < clientList.length; i++) {
        if (clientList[i].url === link && 'focus' in clientList[i]) {
          return clientList[i].focus();
        }
      }
      // Open new window if not already open
      if (clients.openWindow) {
        return clients.openWindow(link);
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('🚫 Notification closed');
});
