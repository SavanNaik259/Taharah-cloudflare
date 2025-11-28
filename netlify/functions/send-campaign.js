/**
 * Netlify Function: Send Campaign Notifications via Firebase Cloud Messaging
 * Triggered when admin creates a new promotional campaign
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (uses FIREBASE_ADMIN_SDK environment variable)
let db;
try {
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK || '{}');
    if (serviceAccount.project_id) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('✅ Firebase Admin SDK initialized in Netlify function');
    }
  }
  db = admin.firestore();
} catch (error) {
  console.error('⚠️ Firebase Admin not configured:', error.message);
}

exports.handler = async (event, context) => {
  console.log('\n📢 ========== SEND-CAMPAIGN NETLIFY FUNCTION ==========');
  
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { title, body, image, link } = JSON.parse(event.body);

    if (!title || !body) {
      console.log('❌ Missing title or body');
      return { 
        statusCode: 400, 
        body: JSON.stringify({ success: false, error: 'Title and body required' }) 
      };
    }

    // Check Firebase initialization
    if (!db) {
      console.error('❌ Firebase not initialized');
      return { 
        statusCode: 500, 
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

    console.log(`📋 Campaign: "${title}"`);
    console.log('📋 Fetching opted-in users...');

    // Get all logged-in users with FCM tokens
    const usersSnapshot = await db.collection('users').where('fcmTokens', '!=', null).get();
    console.log(`👤 Found ${usersSnapshot.docs.length} users with FCM tokens`);

    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();
      if (user.fcmTokens && Array.isArray(user.fcmTokens) && user.fcmTokens.length > 0) {
        console.log(`📨 Sending to user ${userDoc.id} (${user.fcmTokens.length} tokens)...`);

        for (const token of user.fcmTokens) {
          try {
            const response = await admin.messaging().send({
              token: token,
              notification: {
                title: title,
                body: body
              },
              webpush: {
                fcmOptions: { link: link || '/' },
                notification: {
                  title: title,
                  body: body,
                  icon: '/images/logos/royalmeenakari.png',
                  badge: '/images/logos/royalmeenakari.png'
                },
                data: {
                  link: link || '/',
                  image: image || ''
                }
              }
            });
            sentCount++;
            console.log(`   ✅ Message ID: ${response}`);
          } catch (error) {
            failedCount++;
            failedTokens.push({ token: token.substring(0, 20), error: error.message });
            console.error(`   ❌ Error: ${error.message}`);
          }
        }
      }
    }

    // Get all guest device tokens
    const guestSnapshot = await db.collection('guest_tokens').where('tokens', '!=', null).get();
    console.log(`🌐 Found ${guestSnapshot.docs.length} guest devices with tokens`);

    for (const deviceDoc of guestSnapshot.docs) {
      const device = deviceDoc.data();
      if (device.tokens && Array.isArray(device.tokens) && device.tokens.length > 0) {
        console.log(`📨 Sending to guest ${deviceDoc.id} (${device.tokens.length} tokens)...`);

        for (const token of device.tokens) {
          try {
            const response = await admin.messaging().send({
              token: token,
              notification: {
                title: title,
                body: body
              },
              webpush: {
                fcmOptions: { link: link || '/' },
                notification: {
                  title: title,
                  body: body,
                  icon: '/images/logos/royalmeenakari.png'
                }
              }
            });
            sentCount++;
            console.log(`   ✅ Message ID: ${response}`);
          } catch (error) {
            failedCount++;
            failedTokens.push({ device: deviceDoc.id, error: error.message });
            console.error(`   ❌ Error: ${error.message}`);
          }
        }
      }
    }

    console.log(`\n✅ CAMPAIGN COMPLETE - Sent: ${sentCount}, Failed: ${failedCount}`);
    console.log(`====================================================\n`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Campaign sent to ${sentCount} devices (${failedCount} failed)`,
        sentCount,
        failedCount,
        failedTokens: failedTokens.slice(0, 5)
      })
    };

  } catch (error) {
    console.error('❌ Error in send-campaign function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        sentCount: 0
      })
    };
  }
};
