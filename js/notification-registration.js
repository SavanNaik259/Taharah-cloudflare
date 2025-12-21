/**
 * Notification Registration Manager
 * Handles notification permission requests and FCM token registration
 * This MUST run on all pages to collect push tokens from users
 */

const notificationManager = {
  // Check if notifications are supported
  isSupported: () => {
    return 'serviceWorker' in navigator && 'messaging' in firebase;
  },

  // Register service worker
  async registerServiceWorker() {
    try {
      console.log('📋 Registering service worker...');
      
      if (!('serviceWorker' in navigator)) {
        console.warn('⚠️ Service Workers not supported');
        return false;
      }

      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      });
      
      console.log('✅ Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      return null;
    }
  },

  // Request notification permission
  async requestPermission() {
    try {
      console.log('🔔 Requesting notification permission...');
      
      // Check current permission
      const currentPermission = Notification.permission;
      console.log('Current permission:', currentPermission);
      
      if (currentPermission === 'granted') {
        console.log('✅ Notification permission already granted');
        return true;
      }
      
      if (currentPermission === 'denied') {
        console.warn('⚠️ Notification permission denied by user');
        return false;
      }
      
      // Request permission
      const permission = await Notification.requestPermission();
      console.log('Permission result:', permission);
      
      if (permission === 'granted') {
        console.log('✅ Notification permission granted!');
        return true;
      } else {
        console.warn('⚠️ Notification permission not granted');
        return false;
      }
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
      return false;
    }
  },

  // Get FCM token
  async getToken(vapidKey) {
    try {
      console.log('🔑 Requesting FCM token...');
      
      const messaging = firebase.messaging();
      const token = await messaging.getToken({
        vapidKey: vapidKey || process.env.FIREBASE_VAPID_KEY || 'BENFZQbE3p9n6YnjBdDwOySmVUao9Y9ryEH4_PJhsAKUMcUUfYDZV_c3BlZai6G77Rojwy2f0Ab540bfo5w2Mys'
      });
      
      if (token) {
        console.log('✅ FCM Token obtained:', token.substring(0, 50) + '...');
        return token;
      } else {
        console.warn('⚠️ No FCM token received');
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting FCM token:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      return null;
    }
  },

  // Save token to Firestore
  async saveTokenToFirestore(token, isGuest = true) {
    try {
      if (!token) {
        console.warn('⚠️ No token to save');
        return false;
      }

      const db = firebase.firestore();
      
      if (isGuest) {
        // Save as guest token
        console.log('💾 Saving token to guest_tokens collection...');
        await db.collection('guest_tokens').add({
          token: token,
          createdAt: new Date(),
          userAgent: navigator.userAgent,
          isActive: true
        });
        console.log('✅ Token saved to guest_tokens');
        return true;
      } else {
        // Save to logged-in user's profile
        const user = firebase.auth().currentUser;
        if (!user) {
          console.warn('⚠️ No logged-in user to save token to');
          return false;
        }

        console.log('💾 Saving token to user profile...');
        const userRef = db.collection('users').doc(user.uid);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
          const currentTokens = userDoc.data().pushTokens || [];
          // Only add if not already present
          if (!currentTokens.includes(token)) {
            await userRef.update({
              pushTokens: firebase.firestore.FieldValue.arrayUnion(token),
              lastTokenUpdate: new Date()
            });
            console.log('✅ Token added to user profile');
          } else {
            console.log('ℹ️ Token already exists in user profile');
          }
        } else {
          // Create new user document with token
          await userRef.set({
            pushTokens: [token],
            createdAt: new Date(),
            lastTokenUpdate: new Date()
          }, { merge: true });
          console.log('✅ Token saved to new user profile');
        }
        return true;
      }
    } catch (error) {
      console.error('❌ Error saving token to Firestore:', error);
      return false;
    }
  },

  // Setup foreground message handler
  setupMessageHandler() {
    try {
      const messaging = firebase.messaging();
      
      messaging.onMessage((payload) => {
        console.log('📬 Foreground message received:', payload);
        
        const notificationTitle = payload.notification?.title || 'New Update';
        const notificationOptions = {
          body: payload.notification?.body || 'Check out our latest offers!',
          icon: '/images/logos/royalmeenakari.png',
          badge: '/images/logos/royalmeenakari.png',
          tag: 'auric-notification',
          data: payload.data || {}
        };

        // Show notification while app is in foreground
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(notificationTitle, notificationOptions);
          });
        }
      });
      
      console.log('✅ Foreground message handler set up');
    } catch (error) {
      console.error('❌ Error setting up message handler:', error);
    }
  },

  // Complete registration flow
  async requestPermissionAndGetToken(vapidKey = null) {
    try {
      console.log('🚀 Starting notification registration process...');

      // Check support
      if (!this.isSupported()) {
        console.error('❌ Notifications not supported in this browser');
        return null;
      }

      // Register service worker
      await this.registerServiceWorker();

      // Request permission
      const permissionGranted = await this.requestPermission();
      if (!permissionGranted) {
        console.warn('⚠️ User denied notification permission');
        return null;
      }

      // Get token
      const token = await this.getToken(vapidKey);
      if (!token) {
        console.error('❌ Failed to get FCM token');
        return null;
      }

      // Check if user is logged in
      const user = firebase.auth().currentUser;
      const isGuest = !user;

      // Save token
      const saved = await this.saveTokenToFirestore(token, isGuest);
      if (!saved) {
        console.error('❌ Failed to save token to Firestore');
        return null;
      }

      // Setup message handler
      this.setupMessageHandler();

      console.log('✨ Notification registration complete!');
      return token;
    } catch (error) {
      console.error('❌ Notification registration failed:', error);
      return null;
    }
  }
};

// Auto-register on page load if user is on a main page
window.addEventListener('load', async () => {
  try {
    // Check if notifications are already enabled
    if (Notification.permission === 'granted') {
      console.log('ℹ️ Notifications already enabled');
      // Still setup message handler
      notificationManager.setupMessageHandler();
    } else if (Notification.permission !== 'denied') {
      // Only ask if not previously denied
      // Optionally auto-request, or wait for user action
      console.log('ℹ️ Waiting for user to enable notifications...');
    }
  } catch (error) {
    console.error('Error in notification auto-register:', error);
  }
});

// Log that manager is available
console.log('✅ Notification Manager loaded');
