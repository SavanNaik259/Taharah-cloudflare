/**
 * Netlify Function: Send Campaign Notifications via Firebase Cloud Messaging
 * Triggered when admin creates a new promotional campaign
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
let db;
function initializeFirebaseAdmin() {
  try {
    if (!admin.apps.length) {
      let serviceAccount = null;
      
      // Try parsing combined FIREBASE_ADMIN_SDK or FIREBASE_SERVICE_ACCOUNT_KEY first
      const combinedKey = process.env.FIREBASE_ADMIN_SDK || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (combinedKey) {
        try {
          serviceAccount = JSON.parse(combinedKey);
        } catch (e) {
          console.log('⚠️ Combined key not valid JSON, trying individual env vars...');
        }
      }
      
      // If no combined key, try building from individual env vars
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
        console.log('✅ Built Firebase service account from individual Netlify env vars');
      }
      
      if (serviceAccount && serviceAccount.project_id) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase Admin SDK initialized in Netlify function');
      } else {
        console.error('❌ Firebase not configured - missing credentials');
      }
    }
    return admin.firestore();
  } catch (error) {
    console.error('⚠️ Firebase initialization error:', error.message);
    return null;
  }
}

db = initializeFirebaseAdmin();

exports.handler = async (event, context) => {
  console.log('\n📢 ========== SEND-CAMPAIGN NETLIFY FUNCTION ==========');
  console.log('🔍 Event method:', event.httpMethod);
  console.log('🔍 Event path:', event.path);
  
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }) 
    };
  }

  try {
    console.log('📝 Parsing request body...');
    const { title, body, image, link, buttonText } = JSON.parse(event.body);
    console.log('✅ Parsed body:', { title, body, image, buttonText, link });

    if (!title || !body) {
      console.log('❌ Missing title or body');
      return { 
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Title and body required' }) 
      };
    }

    // Re-initialize Firebase if needed
    if (!db) {
      console.error('❌ Firebase not initialized, reinitializing...');
      db = initializeFirebaseAdmin();
    }

    // Check Firebase initialization again
    if (!db) {
      console.error('❌ Firebase still not initialized after retry');
      return { 
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: false, 
          error: 'Firebase not configured',
          sentCount: 0
        }) 
      };
    }

    let sentCount = 0;
    let failedCount = 0;
    const failedTokens = [];
    const allTokens = [];

    console.log(`📋 Campaign: "${title}"`);
    console.log('📋 Fetching ALL users (checking each for FCM tokens)...');

    // FIX: Don't use where('field', '!=', null) - query ALL documents instead
    const usersSnapshot = await db.collection('users').get();
    console.log(`📊 Found ${usersSnapshot.docs.length} user documents`);

    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();
      // Check if fcmTokens exists AND is an array AND has elements
      if (user.fcmTokens && Array.isArray(user.fcmTokens) && user.fcmTokens.length > 0) {
        console.log(`✅ User ${userDoc.id} has ${user.fcmTokens.length} FCM token(s)`);
        
        for (const token of user.fcmTokens) {
          if (token && typeof token === 'string' && token.length > 0) {
            allTokens.push(token);
          }
        }
      } else {
        console.log(`⚠️ User ${userDoc.id}: No FCM tokens (fcmTokens: ${user.fcmTokens ? 'exists but empty' : 'missing'})`);
      }
    }

    console.log(`\n📋 Fetching ALL guest devices (checking each for tokens)...`);
    
    // FIX: Don't use where('field', '!=', null) - query ALL documents instead
    const guestSnapshot = await db.collection('guest_tokens').get();
    console.log(`📊 Found ${guestSnapshot.docs.length} guest device documents`);

    for (const deviceDoc of guestSnapshot.docs) {
      const device = deviceDoc.data();
      // Check if tokens exists AND is an array AND has elements
      if (device.tokens && Array.isArray(device.tokens) && device.tokens.length > 0) {
        console.log(`✅ Guest ${deviceDoc.id} has ${device.tokens.length} token(s)`);
        
        for (const token of device.tokens) {
          if (token && typeof token === 'string' && token.length > 0) {
            allTokens.push(token);
          }
        }
      } else {
        console.log(`⚠️ Guest ${deviceDoc.id}: No tokens (tokens: ${device.tokens ? 'exists but empty' : 'missing'})`);
      }
    }

    console.log(`\n📊 Total valid tokens collected: ${allTokens.length}`);
    
    // CRITICAL FIX: Remove DUPLICATE tokens (same token stored in both users and guest_tokens)
    const uniqueTokensSet = new Set(allTokens);
    const uniqueTokens = Array.from(uniqueTokensSet);
    console.log(`🔍 Unique tokens after deduplication: ${uniqueTokens.length}`);
    if (allTokens.length !== uniqueTokens.length) {
      console.log(`⚠️ Removed ${allTokens.length - uniqueTokens.length} duplicate token(s) - prevents sending same notification twice!`);
    }

    if (uniqueTokens.length === 0) {
      console.warn('⚠️ NO TOKENS FOUND! Users may not have enabled notifications or tokens not saved correctly.');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: false,
          message: 'No users with notification tokens found',
          sentCount: 0,
          failedCount: 0,
          warning: 'Make sure users have enabled notifications and tokens are saved to Firestore'
        })
      };
    }

    console.log(`\n📤 Sending notifications to ${uniqueTokens.length} unique token(s)...`);

    for (const token of uniqueTokens) {
      try {
        console.log(`📨 Sending to token: ${token.substring(0, 30)}...`);
        
        /* Build webpush notification with image and button text
        const webpushNotification = {
          title: title,
          body: body,
          icon: '/images/logos/royalmeenakari.png',
          badge: '/images/logos/royalmeenakari.png',
          image: image || '/images/logos/royalmeenakari.png'
        };
        
        // Add action button if buttonText is provided
        if (buttonText) {
          webpushNotification.actions = [
            {
              action: 'open',
              title: buttonText
            }
          ];
        }
        */
        // Send notification with all details displayed
        const response = await admin.messaging().send({
          token: token,
          webpush: {
            fcmOptions: { link: link || '/' },
            notification: {
              title: title,
              body: body,
              icon: '/images/logos/royalmeenakari.png',
              badge: '/images/logos/royalmeenakari.png',
              image: image || '/images/logos/royalmeenakari.png'
            },
            data: {
              link: link || '/'
            }
          }
        });
        sentCount++;
        console.log(`   ✅ Message sent. ID: ${response.substring(0, 50)}...`);
      } catch (error) {
        failedCount++;
        failedTokens.push({ token: token.substring(0, 20), error: error.message });
        console.error(`   ❌ Failed: ${error.message}`);
      }
    }

    console.log(`\n✅ CAMPAIGN COMPLETE`);
    console.log(`📊 Sent: ${sentCount}, Failed: ${failedCount}`);
    console.log(`====================================================\n`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        message: `Campaign sent to ${sentCount} devices (${failedCount} failed)`,
        sentCount,
        failedCount,
        totalTokens: allTokens.length,
        failedTokens: failedTokens.slice(0, 5)
      })
    };

  } catch (error) {
    console.error('❌ Error in send-campaign function:', error);
    console.error('Stack:', error.stack);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: false,
        error: error.message,
        sentCount: 0
      })
    };
  }
};
