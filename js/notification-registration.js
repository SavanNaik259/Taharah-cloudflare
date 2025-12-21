/**
 * Notification Registration Manager
 * Handles notification permission requests and FCM token registration
 * This MUST run on all pages to collect push tokens from users
 */

const notificationManager = {
  // VAPID Public Key (can be public)
  VAPID_KEY: 'BENFZQbE3p9n6YnjBdDwOySmVUao9Y9ryEH4_PJhsAKUMcUUfYDZV_c3BlZai6G77Rojwy2f0Ab540bfo5w2Mys',

  // Check if notifications are supported
  isSupported: () => {
    const hasServiceWorker = 'serviceWorker' in navigator;
    const hasMessaging = typeof firebase !== 'undefined' && 'messaging' in firebase;
    const hasNotifications = 'Notification' in window;
    
    console.log('🔍 Support check:', { hasServiceWorker, hasMessaging, hasNotifications });
    return hasServiceWorker && hasMessaging && hasNotifications;
  },

  // Register service worker
  async registerServiceWorker() {
    try {
      console.log('📋 Registering service worker from /firebase-messaging-sw.js...');
      
      if (!('serviceWorker' in navigator)) {
        console.warn('⚠️ Service Workers not supported in this browser');
        return false;
      }

      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      });
      
      console.log('✅ Service Worker registered successfully:', registration.scope);
      return registration;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error.message);
      console.error('   Check that firebase-messaging-sw.js exists at root level');
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
      console.log('🔑 Requesting FCM token with VAPID key...');
      
      if (!vapidKey) {
        vapidKey = this.VAPID_KEY;
        console.log('   Using built-in VAPID key');
      }
      
      if (!firebase.apps || !firebase.apps.length) {
        console.error('❌ Firebase not initialized!');
        return null;
      }
      
      const messaging = firebase.messaging();
      console.log('   Firebase messaging instance:', typeof messaging);
      
      const token = await messaging.getToken({
        vapidKey: vapidKey
      });
      
      if (token) {
        console.log('✅ FCM Token obtained successfully');
        console.log('   Token preview:', token.substring(0, 50) + '...');
        console.log('   Token length:', token.length);
        return token;
      } else {
        console.warn('⚠️ No FCM token received (token is null/undefined)');
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting FCM token:', error.message);
      console.error('   Code:', error.code);
      console.error('   Full error:', JSON.stringify(error));
      return null;
    }
  },

  // Save token to Firestore
  async saveTokenToFirestore(token, isGuest = true) {
    try {
      if (!token) {
        console.warn('⚠️ No token to save - token is empty');
        return false;
      }

      console.log('💾 Preparing to save token to Firestore...');
      console.log('   Token length:', token.length);
      console.log('   Token type:', typeof token);
      console.log('   Token preview:', token.substring(0, 50) + '...');
      console.log('   Is guest:', isGuest);

      if (!firebase.apps || !firebase.apps.length) {
        console.error('❌ Firebase not initialized!');
        return false;
      }

      // Validate token format
      if (typeof token !== 'string' || token.length < 100) {
        console.error('❌ INVALID TOKEN FORMAT!');
        console.error('   Expected: string with length > 100');
        console.error('   Got: type=' + typeof token + ', length=' + (token?.length || 0));
        return false;
      }

      const db = firebase.firestore();
      
      if (isGuest) {
        // Save as guest token
        console.log('💾 Saving to guest_tokens collection...');
        const docRef = await db.collection('guest_tokens').add({
          token: token,
          createdAt: new Date(),
          userAgent: navigator.userAgent,
          isActive: true,
          platform: 'web',
          browserInfo: navigator.userAgent.substring(0, 100)
        });
        console.log('✅ Token saved to guest_tokens with ID:', docRef.id);
        return true;
      } else {
        // Save to logged-in user's profile
        const user = firebase.auth().currentUser;
        if (!user) {
          console.warn('⚠️ No logged-in user - cannot save to user profile');
          return false;
        }

        console.log('💾 Saving token to user profile for user:', user.uid);
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
      console.error('❌ Error saving token to Firestore:', error.message);
      console.error('   Code:', error.code);
      console.error('   Details:', error);
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
      console.log('\n🚀=== STARTING NOTIFICATION REGISTRATION ===');
      console.log('   Time:', new Date().toLocaleTimeString());

      // Check support
      if (!this.isSupported()) {
        console.error('❌ Notifications not supported - missing serviceWorker, messaging, or Notification API');
        return null;
      }
      console.log('✅ Browser support verified');

      // Register service worker
      const swRegistration = await this.registerServiceWorker();
      if (!swRegistration) {
        console.error('❌ Failed to register service worker');
        return null;
      }
      console.log('✅ Service worker registered');

      // Request permission
      const permissionGranted = await this.requestPermission();
      if (!permissionGranted) {
        console.warn('⚠️ User denied notification permission');
        return null;
      }
      console.log('✅ Notification permission granted');

      // Get token
      const token = await this.getToken(vapidKey);
      if (!token) {
        console.error('❌ Failed to get FCM token - check browser console for details');
        return null;
      }
      console.log('✅ FCM token obtained');

      // Check if user is logged in
      const user = firebase.auth().currentUser;
      const isGuest = !user;
      console.log('   User type:', isGuest ? 'guest' : 'authenticated');

      // Save token
      const saved = await this.saveTokenToFirestore(token, isGuest);
      if (!saved) {
        console.error('❌ Failed to save token to Firestore');
        return null;
      }
      console.log('✅ Token saved to Firestore');

      // Setup message handler
      this.setupMessageHandler();
      console.log('✅ Message handler setup');

      console.log('✨=== NOTIFICATION REGISTRATION COMPLETE ===\n');
      return token;
    } catch (error) {
      console.error('❌ FATAL ERROR in notification registration:', error.message);
      console.error('   Stack:', error.stack);
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
