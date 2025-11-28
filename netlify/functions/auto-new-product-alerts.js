/**
 * Automated Function: New Product Launch Alerts
 * Triggered when a new product is added
 * Sends notification to all opted-in users
 */

const admin = require('firebase-admin');

let db;
function initializeFirebaseAdmin() {
  try {
    if (!admin.apps.length) {
      let serviceAccount = null;
      const combinedKey = process.env.FIREBASE_ADMIN_SDK || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (combinedKey) {
        try {
          serviceAccount = JSON.parse(combinedKey);
        } catch (e) {
          console.log('⚠️ Combined key not valid JSON, trying individual env vars...');
        }
      }
      
      if (!serviceAccount && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
        serviceAccount = {
          type: "service_account",
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '',
          private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          client_email: process.env.FIREBASE_CLIENT_EMAIL || '',
          client_id: process.env.FIREBASE_CLIENT_ID || '',
          auth_uri: "https://accounts.google.com/o/oauth2/auth",
          token_uri: "https://oauth2.googleapis.com/token",
          auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
          client_x509_cert_url: process.env.FIREBASE_CERT_URL || ''
        };
      }
      
      if (serviceAccount && serviceAccount.project_id) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      }
    }
    return admin.firestore();
  } catch (error) {
    console.error('Firebase init error:', error.message);
    return null;
  }
}

db = initializeFirebaseAdmin();

async function sendNotification(token, productImage, productName, productLink) {
  try {
    await admin.messaging().send({
      token: token,
      notification: {
        title: `✨ New Collection: ${productName}`,
        body: `Discover our latest exclusive jewelry collection. Available now!`
      },
      webpush: {
        fcmOptions: { link: productLink || '/shop' },
        notification: {
          title: `✨ New Collection: ${productName}`,
          body: `Discover our latest exclusive jewelry collection. Available now!`,
          icon: '/images/logos/royalmeenakari.png',
          badge: '/images/logos/royalmeenakari.png',
          image: productImage || '/images/logos/royalmeenakari.png',
          actions: [{ action: 'open', title: 'Explore Now' }]
        },
        data: {
          link: productLink || '/shop',
          image: productImage || ''
        }
      }
    });
    return true;
  } catch (error) {
    console.error('Failed to send notification:', error.message);
    return false;
  }
}

exports.handler = async (event, context) => {
  console.log('\n⭐ ========== NEW PRODUCT ALERTS FUNCTION ==========');
  
  if (!db) {
    db = initializeFirebaseAdmin();
  }
  
  if (!db) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Firebase not initialized' }) };
  }

  try {
    const { productId, productName, productImage } = JSON.parse(event.body || '{}');
    
    if (!productId || !productName) {
      return { statusCode: 400, body: JSON.stringify({ error: 'productId and productName required' }) };
    }
    
    console.log(`📢 Sending new product alert for: ${productName}`);
    
    let totalNotificationsSent = 0;
    const allTokens = [];
    
    // Collect all opted-in user tokens
    const usersSnapshot = await db.collection('users').get();
    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();
      if (user.fcmTokens && Array.isArray(user.fcmTokens) && user.fcmTokens.length > 0) {
        allTokens.push(...user.fcmTokens);
      }
    }
    
    // Collect all guest device tokens
    const guestSnapshot = await db.collection('guest_tokens').get();
    for (const deviceDoc of guestSnapshot.docs) {
      const device = deviceDoc.data();
      if (device.tokens && Array.isArray(device.tokens) && device.tokens.length > 0) {
        allTokens.push(...device.tokens);
      }
    }
    
    console.log(`📊 Sending to ${allTokens.length} opted-in users`);
    
    // Send to all tokens
    const productLink = `/product/${productId}`;
    for (const token of allTokens) {
      if (await sendNotification(token, productImage, productName, productLink)) {
        totalNotificationsSent++;
      }
    }
    
    console.log(`\n✅ NEW PRODUCT ALERTS COMPLETE`);
    console.log(`📊 Notifications sent: ${totalNotificationsSent}`);
    console.log(`====================================================\n`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        notificationsSent: totalNotificationsSent,
        message: 'New product alerts sent to all users'
      })
    };
    
  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
