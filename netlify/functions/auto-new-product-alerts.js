const admin = require('firebase-admin');

// Initialize Firebase Admin SDK from environment variables
const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL
};

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const messaging = admin.messaging();

exports.handler = async (event) => {
    console.log('[auto-new-product-alerts] New product notification triggered');
    
    try {
        // Parse request body
        const { productId, productName, productImage } = JSON.parse(event.body || '{}');

        if (!productId || !productName) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing productId or productName' })
            };
        }

        // Get automatic notification preferences
        const settingsDoc = await db.collection('settings').doc('notifications').get();
        const settings = settingsDoc.data() || {};
        
        if (settings.autoNotifyNewProduct === false) {
            console.log('[auto-new-product-alerts] New product notifications are disabled');
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'New product notifications are disabled' })
            };
        }

        // Fetch FCM tokens from both logged-in users and guests
        const userTokens = [];
        const guestTokens = [];

        // Get tokens from logged-in users
        const usersSnapshot = await db.collection('users').get();
        usersSnapshot.forEach(doc => {
            const fcmTokens = doc.data().fcmTokens || [];
            if (Array.isArray(fcmTokens)) {
                userTokens.push(...fcmTokens);
            }
        });

        // Get tokens from guest devices
        const guestSnapshot = await db.collection('guest_tokens').get();
        guestSnapshot.forEach(doc => {
            const tokens = doc.data().tokens || [];
            if (Array.isArray(tokens)) {
                guestTokens.push(...tokens);
            }
        });

        const allTokens = [...userTokens, ...guestTokens];
        console.log(`[auto-new-product-alerts] Found ${allTokens.length} tokens (${userTokens.length} users, ${guestTokens.length} guests)`);

        if (allTokens.length === 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'No tokens to send to', sent: 0, failed: 0 })
            };
        }

        // Prepare notification message
        const message = {
            notification: {
                title: '✨ New Product Added!',
                body: `Check out our latest: ${productName}`
            },
            data: {
                link: '/shop.html',
                productId: productId,
                notificationType: 'newProduct'
            },
            webpush: {
                fcmOptions: { link: '/shop.html' }
            }
        };

        // Send notifications to all tokens
        let sentCount = 0;
        let failedCount = 0;

        for (const token of allTokens) {
            try {
                await messaging.send({
                    ...message,
                    token: token
                });
                sentCount++;
            } catch (error) {
                console.error(`Failed to send to token ${token.substring(0, 10)}...`, error.message);
                failedCount++;
                
                // Remove invalid tokens
                if (error.code === 'messaging/invalid-registration-token' || 
                    error.code === 'messaging/registration-token-not-registered') {
                    try {
                        // Remove from users
                        const userQuery = await db.collection('users')
                            .where('fcmTokens', 'array-contains', token)
                            .get();
                        userQuery.forEach(doc => {
                            doc.ref.update({
                                fcmTokens: admin.firestore.FieldValue.arrayRemove(token)
                            });
                        });

                        // Remove from guests
                        const guestQuery = await db.collection('guest_tokens')
                            .where('tokens', 'array-contains', token)
                            .get();
                        guestQuery.forEach(doc => {
                            doc.ref.update({
                                tokens: admin.firestore.FieldValue.arrayRemove(token)
                            });
                        });
                    } catch (e) {
                        console.error('Error removing invalid token:', e);
                    }
                }
            }
        }

        console.log(`[auto-new-product-alerts] Sent: ${sentCount}, Failed: ${failedCount}`);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'New product notifications sent',
                sent: sentCount,
                failed: failedCount,
                total: allTokens.length
            })
        };

    } catch (error) {
        console.error('[auto-new-product-alerts] Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Failed to send notifications',
                details: error.message 
            })
        };
    }
};
