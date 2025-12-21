/**
 * Notification Display
 * Shows alert notifications on home page
 */

class NotificationDisplay {
  static init() {
    console.log('🔔 Initializing Notification Display');
    this.createNotificationContainer();
    this.listenForNotifications();
  }

  static createNotificationContainer() {
    if (document.getElementById('notification-container')) return;

    const container = document.createElement('div');
    container.id = 'notification-container';
    container.style.cssText = `
      position: fixed;
      top: 100px;
      right: 20px;
      z-index: 9999;
      max-width: 350px;
    `;
    document.body.appendChild(container);
  }

  static showNotification(title, body, image, link) {
    const container = document.getElementById('notification-container');
    
    const notification = document.createElement('div');
    notification.className = 'alert alert-info alert-dismissible fade show';
    notification.style.cssText = `
      margin-bottom: 10px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      cursor: pointer;
      animation: slideIn 0.3s ease-out;
    `;
    notification.innerHTML = `
      ${image ? `<img src="${image}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 4px; margin-bottom: 10px;">` : ''}
      <h6 style="margin: 0 0 5px 0; color: #333;">${title}</h6>
      <p style="margin: 0; color: #666; font-size: 14px;">${body}</p>
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    if (link) {
      notification.addEventListener('click', () => {
        window.location.href = link;
      });
    }

    container.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.remove();
    }, 5000);

    // Add CSS animation
    if (!document.querySelector('style[data-notification-styles]')) {
      const style = document.createElement('style');
      style.setAttribute('data-notification-styles', 'true');
      style.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  static listenForNotifications() {
    // Listen for postMessage from service worker
    navigator.serviceWorker?.controller?.postMessage({
      type: 'GET_NOTIFICATIONS'
    });

    navigator.serviceWorker?.addEventListener('message', (event) => {
      if (event.data.type === 'NOTIFICATION_EVENT') {
        const { title, body, image, link } = event.data;
        this.showNotification(title, body, image, link);
      }
    });
  }

  static trackNotificationEvent(notificationId, eventType) {
    const db = firebase.firestore();
    const user = firebase.auth().currentUser;
    
    db.collection('notification_events').add({
      notificationId,
      eventType, // 'sent', 'opened', 'clicked'
      userId: user?.uid || 'guest',
      timestamp: new Date()
    }).catch(error => console.error('❌ Error tracking event:', error));
  }
}

// DISABLED: Initialization disabled to prevent duplicate notifications
// The service worker (service-worker.js) now handles ALL notifications
// Having both service worker notifications AND DOM notifications causes duplicates
// DO NOT enable this - it causes duplicate notification bug

/*
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    NotificationDisplay.init();
  });
} else {
  NotificationDisplay.init();
}
*/

window.NotificationDisplay = NotificationDisplay;
