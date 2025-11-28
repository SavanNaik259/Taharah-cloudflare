/**
 * Automated Function: Abandoned Cart Notifications
 * Triggered daily to check for carts inactive for 24 hours
 * Sends notification only to users who added products to cart/wishlist
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
        title: `Complete Your Order!`,
        body: `Don't miss out on ${productName}. Complete your purchase now.`
      },
      webpush: {
        fcmOptions: { link: productLink || '/cart' },
        notification: {
          title: `Complete Your Order!`,
          body: `Don't miss out on ${productName}. Complete your purchase now.`,
          icon: '/images/logos/royalmeenakari.png',
          badge: '/images/logos/royalmeenakari.png',
          image: productImage || '/images/logos/royalmeenakari.png',
          actions: [{ action: 'open', title: 'Continue Shopping' }]
        },
        data: {
          link: productLink || '/cart',
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
  console.log('\n🛒 ========== ABANDONED CART CHECK FUNCTION ==========');
  
  if (!db) {
    db = initializeFirebaseAdmin();
  }
  
  if (!db) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Firebase not initialized' }) };
  }

  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    console.log(`⏰ Checking for carts inactive since ${twentyFourHoursAgo.toISOString()}`);
    
    let totalNotificationsSent = 0;
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    console.log(`📊 Found ${usersSnapshot.docs.length} users`);
    
    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();
      const userId = userDoc.id;
      
      // Skip if user doesn't have FCM tokens
      if (!user.fcmTokens || !Array.isArray(user.fcmTokens) || user.fcmTokens.length === 0) {
        continue;
      }
      
      // Check user's cart
      try {
        const cartRef = db.collection('users').doc(userId).collection('carts').doc('current');
        const cartDoc = await cartRef.get();
        
        if (!cartDoc.exists) continue;
        
        const cartData = cartDoc.data();
        const cartItems = cartData.items || [];
        
        if (cartItems.length === 0) continue;
        
        // Check cart last updated timestamp
        const cartUpdatedAt = cartData.updatedAt?.toDate?.() || new Date(0);
        
        if (cartUpdatedAt < twentyFourHoursAgo) {
          console.log(`✅ User ${userId} has abandoned cart (${cartItems.length} items, last updated: ${cartUpdatedAt.toISOString()})`);
          
          // Get first product details for notification
          const firstItem = cartItems[0];
          const productImage = firstItem.image || firstItem.productImage || '/images/logos/royalmeenakari.png';
          const productName = firstItem.name || firstItem.productName || 'Your item';
          const productLink = `/product/${firstItem.id || firstItem.productId || ''}`;
          
          // Send to all user's FCM tokens
          for (const token of user.fcmTokens) {
            if (await sendNotification(token, productImage, productName, productLink)) {
              totalNotificationsSent++;
            }
          }
        }
      } catch (error) {
        console.error(`Error checking cart for user ${userId}:`, error.message);
      }
    }
    
    console.log(`\n✅ ABANDONED CART CHECK COMPLETE`);
    console.log(`📊 Notifications sent: ${totalNotificationsSent}`);
    console.log(`====================================================\n`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        notificationsSent: totalNotificationsSent,
        message: 'Abandoned cart check completed'
      })
    };
    
  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
