/**
 * Notification Registration Manager (V2 - Rebuilt)
 */
const notificationManager = {
    VAPID_KEY: 'BI7QNUnZtwGorICnshlFewaFF86eBZ8FGsVs7Jzs4CF5l1jzL2kf4POMnmA2Ae0YB0wc1PvfsmrkICbpLS3OYHI',

    async init() {
        if (!('serviceWorker' in navigator) || !('Notification' in window)) {
            console.warn('Push notifications not supported');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log('SW registered:', registration.scope);
            
            const messaging = firebase.messaging();
            
            // Handle token refresh
            messaging.onTokenRefresh(async () => {
                const refreshedToken = await messaging.getToken();
                console.log('Token refreshed.');
                await this.saveToken(refreshedToken);
            });

            // Handle foreground messages
            messaging.onMessage((payload) => {
                console.log('Foreground message:', payload);
                const title = payload.notification?.title || 'New Message';
                const options = {
                    body: payload.notification?.body,
                    icon: '/images/logos/royalmeenakari.png',
                    data: { link: payload.data?.link || '/' }
                };
                new Notification(title, options);
            });

        } catch (error) {
            console.error('Notification init error:', error);
        }
    },

    async requestPermission() {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const messaging = firebase.messaging();
            try {
                const token = await messaging.getToken({ vapidKey: this.VAPID_KEY });
                if (token) {
                    console.log('Token obtained:', token);
                    await this.saveToken(token);
                    return true;
                }
            } catch (err) {
                console.error('Token error:', err);
            }
        }
        return false;
    },

    async saveToken(token) {
        const user = firebase.auth().currentUser;
        const db = firebase.firestore();
        const data = {
            token: token,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            platform: 'web'
        };

        if (user) {
            await db.collection('users').doc(user.uid).set({
                pushTokens: firebase.firestore.FieldValue.arrayUnion(token)
            }, { merge: true });
        } else {
            await db.collection('guest_tokens').doc(token.substring(0, 20)).set(data);
        }
    }
};

window.addEventListener('load', () => notificationManager.init());
