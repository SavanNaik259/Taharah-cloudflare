/**
 * Netlify Function: send-notifications
 * Sends push notifications and saves them to Firestore
 * 
 * POST /api/send-notifications
 * Body: {
 *   title: string,
 *   body: string,
 *   link: string (optional),
 *   category: string (optional),
 *   sendToUsers: boolean,
 *   sendToGuests: boolean
 * }
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with proper error handling
if (!admin.apps.length) {
  try {
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID || "auric-a0c92",
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CERT_URL
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "auric-a0c92.firebasestorage.app"
    });

    console.log('✅ Firebase Admin initialized for send-notifications function');
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error.message);
  }
}

const db = admin.firestore();

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // Handle OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true })
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Method not allowed' 
      })
    };
  }

  try {
    console.log('📨 Incoming notification request...');
    
    const {
      title,
      body,
      link = '',
      category = 'promotion',
      sendToUsers = true,
      sendToGuests = true
    } = JSON.parse(event.body || '{}');

    // Validate input
    if (!title || !body) {
      console.warn('⚠️ Missing required fields: title or body');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Title and body are required' 
        })
      };
    }

    if (!sendToUsers && !sendToGuests) {
      console.warn('⚠️ No target audience selected');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'At least one audience must be selected' 
        })
      };
    }

    console.log(`📝 Notification Details:
      Title: ${title}
      Body: ${body}
      Category: ${category}
      Send to Users: ${sendToUsers}
      Send to Guests: ${sendToGuests}`);

    // Count tokens
    let userTokenCount = 0;
    let guestTokenCount = 0;

    if (sendToUsers) {
      try {
        const usersSnapshot = await db.collection('users').get();
        usersSnapshot.forEach(doc => {
          const userTokens = doc.data().pushTokens || [];
          userTokenCount += userTokens.length;
        });
        console.log(`👥 Found ${userTokenCount} user tokens`);
      } catch (error) {
        console.error('❌ Error counting user tokens:', error.message);
      }
    }

    if (sendToGuests) {
      try {
        const guestTokensSnapshot = await db.collection('guest_tokens').get();
        guestTokenCount = guestTokensSnapshot.size;
        console.log(`👤 Found ${guestTokenCount} guest tokens`);
      } catch (error) {
        console.error('❌ Error counting guest tokens:', error.message);
      }
    }

    const totalTokens = userTokenCount + guestTokenCount;
    console.log(`📊 Total recipients: ${totalTokens}`);

    // Create notification record
    const notificationRecord = {
      id: Date.now().toString(),
      title,
      body,
      link: link || null,
      category,
      sentToUsers: sendToUsers,
      sentToGuests: sendToGuests,
      userTokenCount,
      guestTokenCount,
      totalSent: totalTokens,
      timestamp: new Date().toISOString(),
      read: false,
      status: 'sent'
    };

    // Save notification to Firestore
    try {
      console.log('💾 Saving notification to Firestore...');
      
      // Save to notifications collection
      await db.collection('notifications').add(notificationRecord);
      
      // Also save to notification_logs for history
      await db.collection('notification_logs').add({
        ...notificationRecord,
        sentAt: new Date()
      });
      
      console.log('✅ Notification saved successfully');
    } catch (error) {
      console.error('❌ Error saving notification:', error.message);
      throw new Error(`Failed to save notification: ${error.message}`);
    }

    console.log('✅ Notification sending completed');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Notification sent successfully',
        stats: {
          userTokenCount,
          guestTokenCount,
          totalSent: totalTokens
        }
      })
    };

  } catch (error) {
    console.error('❌ Error in send-notifications function:', error.message);
    console.error('Stack:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to send notifications: ' + error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
