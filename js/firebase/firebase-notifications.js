/**
 * Firebase Notifications Manager - COMPLETE REBUILD
 * Uses REAL Firebase Cloud Messaging SDK (v10+)
 * Properly gets FCM tokens from Firebase
 */

class FirebaseNotificationsManager {
  constructor() {
    this.fcmToken = null;
    this.isNotificationEnabled = false;
    this.vapidKey = 'BI7QNUnZtwGorICnshlFewaFF86eBZ8FGsVs7Jzs4CF5l1jzL2kf4POMnmA2Ae0YB0wc1PvfsmrkICbpLS3OYHI'; // NEW VAPID key from Firebase Console
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
      // CRITICAL: Wait for Firebase to be available (it loads async from script tag)
      let retries = 0;
      while (typeof firebase === 'undefined' && retries < 50) {
        await new Promise(r => setTimeout(r, 100));
        retries++;
      }
      
      if (typeof firebase === 'undefined') {
        throw new Error('Firebase SDK failed to load - check your internet connection');
      }

      console.log('✅ Firebase SDK is available');

      // Register SINGLE service worker at root - prevents duplicates!
      this.registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });
      console.log('✅ Service Worker registered at /service-worker.js');

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
      const errorMsg = (error?.message || String(error) || 'unknown error').trim();
      console.error('❌ Error initializing notifications:', errorMsg);
      console.error('Stack:', error?.stack);
      console.error('Full error object:', error);
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
      console.error('❌ Error requesting permission:', error?.message || String(error));
      throw error; // Re-throw to be caught by caller
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
      console.error('❌ Error getting FCM token:', error?.message || String(error));
      console.error('Error code:', error?.code);
      console.error('Full error:', error);
      throw error; // Re-throw to show user
    }
  }

  async saveFCMTokenToFirebase() {
    try {
      const db = firebase.firestore();
      
      // For guest users
      if (!firebase.auth().currentUser) {
        const deviceId = localStorage.getItem('device_id') || this.generateDeviceId();
        localStorage.setItem('device_id', deviceId);
        
        // CRITICAL FIX: Replace tokens array instead of merging to prevent duplicates
        await db.collection('guest_tokens').doc(deviceId).set({
          tokens: [this.fcmToken], // Only store the NEW token, remove old ones
          notificationsEnabled: true,
          lastUpdated: new Date(),
          deviceId: deviceId,
          vapidKeyVersion: 'v2' // Track which VAPID key was used
        }, { merge: false }); // merge: false ensures we overwrite old data
        
        console.log('✅ FCM token REPLACED (not merged) in guest_tokens for device:', deviceId);
        return;
      }

      // For logged-in users
      const userId = firebase.auth().currentUser.uid;
      await db.collection('users').doc(userId).set({
        fcmTokens: [this.fcmToken], // Only store the NEW token
        notificationsEnabled: true,
        lastTokenUpdate: new Date(),
        uid: userId,
        vapidKeyVersion: 'v2'
      }, { merge: false });

      console.log('✅ FCM token REPLACED (not merged) in users collection for user:', userId);
    } catch (error) {
      console.error('❌ Error saving FCM token to Firestore:', error);
    }
  }

  generateDeviceId() {
    return `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  setupForegroundHandlers() {
    // REMOVED: Service Worker now handles ALL notifications (foreground + background)
    // This prevents duplicate notifications
    console.log('✅ Foreground notifications delegated to Service Worker');
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

// Auto-initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    console.log('📋 Page loaded, initializing notifications...');
    await notificationsManager.init();
  });
} else {
  // Page already loaded
  console.log('📋 Initializing notifications immediately...');
  notificationsManager.init().catch(e => console.error('❌ Init error:', e));
}
