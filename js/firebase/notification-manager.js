/**
 * Notification Manager
 * Handles Firebase Cloud Messaging setup, token generation, and storage
 */

class NotificationManager {
  constructor() {
    this.messaging = null;
    this.vapidKey = null;
    this.tokensCollection = null;
  }

  /**
   * Initialize notification system
   */
  async init() {
    try {
      // Wait for Firebase to be initialized
      await this.waitForFirebase();
      
      // Get VAPID key from environment
      const response = await fetch('/.netlify/functions/get-vapid-key');
      const data = await response.json();
      this.vapidKey = data.vapidKey;

      // Initialize Firebase Messaging
      this.messaging = firebase.messaging();
      
      // Request permission if not already granted
      const permission = Notification.permission;
      if (permission === 'denied') {
        console.log('Notification permission denied by user');
        return false;
      }

      if (permission === 'granted') {
        await this.registerServiceWorker();
        return true;
      }

      return null; // Permission not yet decided
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  /**
   * Wait for Firebase to be initialized
   */
  waitForFirebase() {
    return new Promise((resolve) => {
      if (window.firebase && window.firebase.app()) {
        resolve();
      } else {
        let attempts = 0;
        const interval = setInterval(() => {
          if (window.firebase && window.firebase.app()) {
            clearInterval(interval);
            resolve();
          }
          attempts++;
          if (attempts > 50) {
            clearInterval(interval);
            resolve();
          }
        }, 100);
      }
    });
  }

  /**
   * Register service worker for push notifications
   */
  async registerServiceWorker() {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/'
        });
        console.log('Service Worker registered successfully:', registration);
        return registration;
      }
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  /**
   * Request notification permission and get token
   */
  async requestPermissionAndGetToken() {
    try {
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        console.log('Notification permission not granted');
        return null;
      }

      // Register service worker first
      await this.registerServiceWorker();

      // Get the token
      const token = await this.messaging.getToken({
        vapidKey: this.vapidKey
      });

      console.log('FCM Token:', token);
      return token;
    } catch (error) {
      console.error('Error getting notification token:', error);
      throw error;
    }
  }

  /**
   * Save token to Firestore
   */
  async saveToken(token) {
    try {
      const db = firebase.firestore();
      const auth = firebase.auth();
      const currentUser = auth.currentUser;

      if (currentUser) {
        // Logged-in user - save to user document
        await db.collection('users').doc(currentUser.uid).update({
          pushTokens: firebase.firestore.FieldValue.arrayUnion(token),
          lastTokenUpdate: new Date()
        });
        console.log('Token saved to user document');
      } else {
        // Guest user - save to guest_tokens collection
        await db.collection('guest_tokens').add({
          token: token,
          createdAt: new Date(),
          userAgent: navigator.userAgent
        });
        console.log('Token saved to guest_tokens collection');
      }

      return true;
    } catch (error) {
      console.error('Error saving token:', error);
      throw error;
    }
  }

  /**
   * Check if token already exists
   */
  async tokenExists(token) {
    try {
      const db = firebase.firestore();
      const auth = firebase.auth();
      const currentUser = auth.currentUser;

      if (currentUser) {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
          const tokens = userDoc.data().pushTokens || [];
          return tokens.includes(token);
        }
      }
      return false;
    } catch (error) {
      console.error('Error checking token:', error);
      return false;
    }
  }

  /**
   * Setup message listener for foreground notifications
   */
  setupMessageListener(callback) {
    if (this.messaging) {
      this.messaging.onMessage((payload) => {
        console.log('Message received:', payload);
        
        const notificationData = {
          title: payload.notification?.title || 'New Promotion',
          body: payload.notification?.body || 'Check out our latest offers!',
          icon: '/images/logos/royalmeenakari.png'
        };

        if (callback) {
          callback(notificationData);
        }

        // Also show browser notification if in foreground
        if (Notification.permission === 'granted') {
          new Notification(notificationData.title, {
            body: notificationData.body,
            icon: notificationData.icon,
            tag: 'auric-notification'
          });
        }
      });
    }
  }

  /**
   * Unsubscribe from notifications
   */
  async deleteToken() {
    try {
      if (this.messaging) {
        await this.messaging.deleteToken();
        console.log('Token deleted');
        return true;
      }
    } catch (error) {
      console.error('Error deleting token:', error);
      return false;
    }
  }
}

// Create global instance
const notificationManager = new NotificationManager();
