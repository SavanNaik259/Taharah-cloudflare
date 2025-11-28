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
        // Save for logged-in users
        await db.collection('users').doc(user.uid).update({
          fcmTokens: firebase.firestore.FieldValue.arrayUnion(token),
          notificationsEnabled: true,
          lastTokenUpdate: new Date()
        }).catch(async (error) => {
          if (error.code === 'not-found') {
            // Create if doesn't exist
            await db.collection('users').doc(user.uid).set({
              fcmTokens: [token],
              notificationsEnabled: true,
              createdAt: new Date()
            });
          }
        });
        console.log('✅ Token saved for user:', user.uid);
      } else {
        // Save for guest users
        const deviceId = this.getOrCreateDeviceId();
        await db.collection('guest_tokens').doc(deviceId).set({
          tokens: firebase.firestore.FieldValue.arrayUnion(token),
          lastUpdate: new Date()
        }, { merge: true });
        console.log('✅ Token saved for guest device:', deviceId);
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
