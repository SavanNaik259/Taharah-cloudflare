/**
 * Automated Function: Back-in-Stock Alerts
 * Triggered when product stock changes
 * Sends notification only to users who added product to cart/wishlist
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
        title: `${productName} is Back in Stock!`,
        body: `Great news! The product you wanted is now available. Shop now!`
      },
      webpush: {
        fcmOptions: { link: productLink || '/shop' },
        notification: {
          title: `${productName} is Back in Stock!`,
          body: `Great news! The product you wanted is now available. Shop now!`,
          icon: '/images/logos/royalmeenakari.png',
          badge: '/images/logos/royalmeenakari.png',
          image: productImage || '/images/logos/royalmeenakari.png',
          actions: [{ action: 'open', title: 'Buy Now' }]
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
  console.log('\n📦 ========== BACK-IN-STOCK ALERTS FUNCTION ==========');
  
  if (!db) {
    db = initializeFirebaseAdmin();
  }
  
  if (!db) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Firebase not initialized' }) };
  }

  try {
    const { productId, productName, productImage } = JSON.parse(event.body || '{}');
    
    if (!productId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'productId required' }) };
    }
    
    console.log(`📢 Sending back-in-stock alert for product: ${productId}`);
    
    let totalNotificationsSent = 0;
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();
      const userId = userDoc.id;
      
      // Skip if user doesn't have FCM tokens
      if (!user.fcmTokens || !Array.isArray(user.fcmTokens) || user.fcmTokens.length === 0) {
        continue;
      }
      
      // Check if user has this product in cart
      let hasProductInCart = false;
      try {
        const cartRef = db.collection('users').doc(userId).collection('carts').doc('current');
        const cartDoc = await cartRef.get();
        
        if (cartDoc.exists) {
          const cartItems = cartDoc.data().items || [];
          hasProductInCart = cartItems.some(item => item.id === productId || item.productId === productId);
        }
      } catch (error) {
        console.error(`Error checking cart for user ${userId}:`, error.message);
      }
      
      // Check if user has this product in wishlist
      let hasProductInWishlist = false;
      try {
        const wishlistRef = db.collection('users').doc(userId).collection('wishlist');
        const wishlistSnapshot = await wishlistRef.where('id', '==', productId).get();
        hasProductInWishlist = !wishlistSnapshot.empty;
      } catch (error) {
        console.error(`Error checking wishlist for user ${userId}:`, error.message);
      }
      
      // Send notification only if product is in cart or wishlist
      if (hasProductInCart || hasProductInWishlist) {
        console.log(`✅ Sending back-in-stock alert to user ${userId} for ${productId}`);
        
        const productLink = `/product/${productId}`;
        
        for (const token of user.fcmTokens) {
          if (await sendNotification(token, productImage, productName, productLink)) {
            totalNotificationsSent++;
          }
        }
      }
    }
    
    console.log(`\n✅ BACK-IN-STOCK ALERTS COMPLETE`);
    console.log(`📊 Notifications sent: ${totalNotificationsSent}`);
    console.log(`====================================================\n`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        notificationsSent: totalNotificationsSent,
        message: 'Back-in-stock alerts sent'
      })
    };
    
  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
