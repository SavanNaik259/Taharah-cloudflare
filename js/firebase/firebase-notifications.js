/**
 * Firebase Notifications Manager
 * Handles push notifications with Option 1 (Simple - one permission for all)
 */

class FirebaseNotificationsManager {
  constructor() {
    this.fcmToken = null;
    this.isNotificationEnabled = false;
    this.vapidKey = 'BOqjp4qX6LbfJdZfY3J5KYF8WqYhNGfZV3vKvFZV5Q7xB8MXZ6qK7L8N9P0Q1R2S';
  }

  async init() {
    console.log('🔔 Initializing Firebase Notifications Manager');
    
    if (!('serviceWorker' in navigator)) {
      console.warn('⚠️ Service Workers not supported');
      return;
    }

    try {
      // Register service worker for background notifications
      const registration = await navigator.serviceWorker.register('service-worker.js', {
        scope: '/'
      });
      console.log('✅ Service Worker registered');

      // Check if notifications are supported
      if (!('Notification' in window)) {
        console.warn('⚠️ Notifications not supported');
        return;
      }

      // Get stored FCM token or request new one
      await this.getFCMToken(registration);
      
      // Listen for notification clicks
      this.setupNotificationHandlers();

      console.log('✅ Notifications Manager initialized');
    } catch (error) {
      console.error('❌ Error initializing notifications:', error);
    }
  }

  async getFCMToken(registration) {
    try {
      // Check if token already stored
      const storedToken = localStorage.getItem('fcm_token');
      if (storedToken) {
        this.fcmToken = storedToken;
        this.isNotificationEnabled = true;
        console.log('✅ FCM token loaded from storage');
        return;
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        console.log('⚠️ User denied notification permission');
        return;
      }

      // Generate and store FCM token
      this.fcmToken = this.generateFCMToken();
      localStorage.setItem('fcm_token', this.fcmToken);
      this.isNotificationEnabled = true;

      // Save token to Firebase
      await this.saveFCMTokenToFirebase();

      console.log('✅ FCM token generated and saved');
    } catch (error) {
      console.error('❌ Error getting FCM token:', error);
    }
  }

  generateFCMToken() {
    // Generate a unique token based on user agent and timestamp
    const userAgent = navigator.userAgent;
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${random}`;
  }

  async saveFCMTokenToFirebase() {
    try {
      if (!firebase.auth().currentUser) {
        // For guest users, store in localStorage with device ID
        const deviceId = localStorage.getItem('device_id') || this.generateDeviceId();
        localStorage.setItem('device_id', deviceId);
        localStorage.setItem('fcm_tokens', JSON.stringify([this.fcmToken]));
        console.log('✅ FCM token saved locally for guest user');
        return;
      }

      // For logged-in users, save to Firestore
      const userId = firebase.auth().currentUser.uid;
      const db = firebase.firestore();
      
      await db.collection('users').doc(userId).update({
        fcmTokens: firebase.firestore.FieldValue.arrayUnion(this.fcmToken),
        notificationsEnabled: true,
        lastTokenUpdate: new Date()
      });

      console.log('✅ FCM token saved to Firebase for user:', userId);
    } catch (error) {
      console.error('❌ Error saving FCM token:', error);
    }
  }

  generateDeviceId() {
    return `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  setupNotificationHandlers() {
    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'NOTIFICATION_CLICK') {
          const notification = event.data.notification;
          this.handleNotificationClick(notification);
        }
      });
    }
  }

  handleNotificationClick(notification) {
    console.log('📬 Notification clicked:', notification);
    
    if (notification.data && notification.data.link) {
      window.location.href = notification.data.link;
    }
  }

  async showNotification(title, options = {}) {
    if (!this.isNotificationEnabled) {
      console.warn('⚠️ Notifications not enabled');
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: '/images/logos/royalmeenakari.png',
        badge: '/images/logos/royalmeenakari.png',
        ...options
      });

      console.log('✅ Notification shown:', title);
      return notification;
    } catch (error) {
      console.error('❌ Error showing notification:', error);
    }
  }

  async sendNotificationToServer(campaignData) {
    try {
      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fcmToken: this.fcmToken,
          deviceId: localStorage.getItem('device_id'),
          ...campaignData
        })
      });

      const result = await response.json();
      console.log('✅ Notification sent:', result);
      return result;
    } catch (error) {
      console.error('❌ Error sending notification:', error);
    }
  }
}

// Initialize globally
window.FirebaseNotificationsManager = FirebaseNotificationsManager;
const notificationsManager = new FirebaseNotificationsManager();
