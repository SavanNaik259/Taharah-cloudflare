/**
 * Firebase Notifications Manager - COMPLETE REBUILD
 * Uses REAL Firebase Cloud Messaging SDK (v10+)
 * Properly gets FCM tokens from Firebase
 */

class FirebaseNotificationsManager {
  constructor() {
    this.fcmToken = null;
    this.isNotificationEnabled = false;
    this.vapidKey = 'BELANpJ6QmIyMNkc37hTR7F3Z4EY9KLjPqW8X5VqM1z9YnO2PqRsT3VuW4XxYyZ5A'; // Firebase generated VAPID key
    this.registration = null;
    this.messaging = null;
  }

  async init() {
    console.log('🔔 Initializing Firebase Notifications Manager');
    
    // Check browser support
    if (!('serviceWorker' in navigator)) {
      console.error('❌ Service Workers not supported in this browser');
      return;
    }

    if (!('Notification' in window)) {
      console.error('❌ Notifications not supported');
      return;
    }

    try {
      // Register Firebase service worker at ROOT level - CRITICAL!
      this.registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      });
      console.log('✅ Service Worker registered at /firebase-messaging-sw.js');

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('✅ Service Worker is active and ready');

      // Get Firebase messaging instance
      this.messaging = firebase.messaging();
      console.log('✅ Firebase Messaging initialized');

      // Request notification permission and get token
      await this.requestNotificationPermission();
      
      // Handle foreground messages
      this.setupForegroundHandlers();

      console.log('✅ Notifications Manager initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing notifications:', error);
      console.error('Stack:', error.stack);
    }
  }

  async requestNotificationPermission() {
    try {
      // Check if already have permission
      const permission = Notification.permission;
      if (permission === 'granted') {
        console.log('✅ Notification permission already granted');
        await this.getFCMToken();
        return;
      }

      if (permission === 'denied') {
        console.warn('⚠️ Notification permission denied');
        return;
      }

      // Request permission (permission === 'default')
      console.log('📋 Requesting notification permission...');
      const result = await Notification.requestPermission();

      if (result === 'granted') {
        console.log('✅ User granted notification permission');
        await this.getFCMToken();
      } else {
        console.warn('⚠️ User denied notification permission');
      }
    } catch (error) {
      console.error('❌ Error requesting permission:', error);
    }
  }

  async getFCMToken() {
    try {
      // Check localStorage first
      const storedToken = localStorage.getItem('fcm_token');
      if (storedToken && storedToken.length > 50) { // Real tokens are long
        this.fcmToken = storedToken;
        this.isNotificationEnabled = true;
        console.log('✅ FCM token loaded from localStorage:', this.fcmToken.substring(0, 30) + '...');
        return;
      }

      // Get real FCM token from Firebase
      if (!this.messaging) {
        this.messaging = firebase.messaging();
      }

      console.log('📥 Getting FCM token from Firebase...');
      const token = await firebase.messaging().getToken({
        vapidKey: this.vapidKey,
        serviceWorkerRegistration: this.registration
      });

      if (token) {
        this.fcmToken = token;
        localStorage.setItem('fcm_token', token);
        this.isNotificationEnabled = true;
        console.log('✅ FCM token obtained from Firebase:', token.substring(0, 30) + '...');
        
        // Save to Firestore
        await this.saveFCMTokenToFirebase();
      } else {
        console.error('❌ Failed to get FCM token');
      }
    } catch (error) {
      console.error('❌ Error getting FCM token:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
    }
  }

  async saveFCMTokenToFirebase() {
    try {
      const db = firebase.firestore();
      
      // For guest users
      if (!firebase.auth().currentUser) {
        const deviceId = localStorage.getItem('device_id') || this.generateDeviceId();
        localStorage.setItem('device_id', deviceId);
        
        await db.collection('guest_tokens').doc(deviceId).set({
          tokens: firebase.firestore.FieldValue.arrayUnion(this.fcmToken),
          notificationsEnabled: true,
          lastUpdated: new Date(),
          deviceId: deviceId
        }, { merge: true });
        
        console.log('✅ FCM token saved to guest_tokens collection for device:', deviceId);
        return;
      }

      // For logged-in users
      const userId = firebase.auth().currentUser.uid;
      await db.collection('users').doc(userId).set({
        fcmTokens: firebase.firestore.FieldValue.arrayUnion(this.fcmToken),
        notificationsEnabled: true,
        lastTokenUpdate: new Date(),
        uid: userId
      }, { merge: true });

      console.log('✅ FCM token saved to users collection for user:', userId);
    } catch (error) {
      console.error('❌ Error saving FCM token to Firestore:', error);
    }
  }

  generateDeviceId() {
    return `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  setupForegroundHandlers() {
    if (!this.messaging) return;
    
    // Handle foreground messages
    firebase.messaging().onMessage((payload) => {
      console.log('📬 Foreground message received:', payload);
      
      const notificationTitle = payload.notification?.title || 'Royal Meenakari';
      const notificationOptions = {
        body: payload.notification?.body || 'New notification',
        icon: '/images/logos/royalmeenakari.png',
        badge: '/images/logos/royalmeenakari.png',
        image: payload.notification?.image,
        data: payload.data || {}
      };
      
      if (!notificationOptions.image) {
        delete notificationOptions.image;
      }
      
      if (this.registration) {
        this.registration.showNotification(notificationTitle, notificationOptions);
      }
    });
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
}

// Initialize globally
window.FirebaseNotificationsManager = FirebaseNotificationsManager;
const notificationsManager = new FirebaseNotificationsManager();
