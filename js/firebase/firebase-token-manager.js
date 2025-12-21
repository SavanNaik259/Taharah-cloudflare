/**
 * Firebase Token Manager
 * Saves and manages user FCM tokens for alerts
 */

class FirebaseTokenManager {
  static async saveUserToken(token) {
    try {
      if (!token) return;

      const user = firebase.auth().currentUser;
      const db = firebase.firestore();

      if (user) {
        // Save for logged-in users - CHECK if token already exists to prevent duplicates
        try {
          const userDoc = await db.collection('users').doc(user.uid).get();
          const existingTokens = userDoc.data()?.fcmTokens || [];
          
          // Only add token if it doesn't already exist
          if (!existingTokens.includes(token)) {
            await db.collection('users').doc(user.uid).update({
              fcmTokens: firebase.firestore.FieldValue.arrayUnion(token),
              notificationsEnabled: true,
              lastTokenUpdate: new Date()
            });
            console.log('✅ New token saved for user:', user.uid);
          } else {
            console.log('⚠️ Token already exists for user - skipping to prevent duplicates:', user.uid);
            // Still update the timestamp even if token exists
            await db.collection('users').doc(user.uid).update({
              lastTokenUpdate: new Date(),
              notificationsEnabled: true
            });
          }
        } catch (error) {
          if (error.code === 'not-found') {
            // Create if doesn't exist
            await db.collection('users').doc(user.uid).set({
              fcmTokens: [token],
              notificationsEnabled: true,
              createdAt: new Date()
            });
            console.log('✅ Created new user document with token');
          } else {
            throw error;
          }
        }
      } else {
        // Save for guest users - CHECK if token already exists to prevent duplicates
        const deviceId = this.getOrCreateDeviceId();
        const guestDoc = await db.collection('guest_tokens').doc(deviceId).get();
        const existingTokens = guestDoc.data()?.tokens || [];
        
        // Only add token if it doesn't already exist
        if (!existingTokens.includes(token)) {
          await db.collection('guest_tokens').doc(deviceId).set({
            tokens: firebase.firestore.FieldValue.arrayUnion(token),
            lastUpdate: new Date()
          }, { merge: true });
          console.log('✅ New token saved for guest device:', deviceId);
        } else {
          console.log('⚠️ Token already exists for guest - skipping to prevent duplicates:', deviceId);
          // Still update the timestamp
          await db.collection('guest_tokens').doc(deviceId).set({
            lastUpdate: new Date()
          }, { merge: true });
        }
      }
    } catch (error) {
      console.error('❌ Error saving token:', error);
    }
  }

  static getOrCreateDeviceId() {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  static async getUserTokens() {
    try {
      const user = firebase.auth().currentUser;
      const db = firebase.firestore();

      if (user) {
        const doc = await db.collection('users').doc(user.uid).get();
        return doc.data()?.fcmTokens || [];
      }
      return [];
    } catch (error) {
      console.error('❌ Error fetching tokens:', error);
      return [];
    }
  }
}

window.FirebaseTokenManager = FirebaseTokenManager;
