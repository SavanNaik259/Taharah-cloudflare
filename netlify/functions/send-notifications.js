/**
 * Netlify Function: send-notifications
 * Sends push notifications to Firebase Cloud Messaging
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

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      clientId: process.env.FIREBASE_CLIENT_ID,
      authUri: "https://accounts.google.com/o/oauth2/auth",
      tokenUri: "https://oauth2.googleapis.com/token",
      authProviderX509CertUrl: "https://www.googleapis.com/oauth2/v1/certs",
      clientX509CertUrl: process.env.FIREBASE_CERT_URL
    }),
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
  });
}

const db = admin.firestore();
const messaging = admin.messaging();

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
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
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
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Title and body are required' })
      };
    }

    if (!sendToUsers && !sendToGuests) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'At least one audience must be selected' })
      };
    }

    const tokens = [];
    let userTokenCount = 0;
    let guestTokenCount = 0;

    // Collect user tokens
    if (sendToUsers) {
      const usersSnapshot = await db.collection('users').get();
      usersSnapshot.forEach(doc => {
        const userTokens = doc.data().pushTokens || [];
        tokens.push(...userTokens);
        userTokenCount += userTokens.length;
      });
    }

    // Collect guest tokens
    if (sendToGuests) {
      const guestTokensSnapshot = await db.collection('guest_tokens').get();
      guestTokensSnapshot.forEach(doc => {
        tokens.push(doc.data().token);
        guestTokenCount++;
      });
    }

    if (tokens.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'No tokens found to send notifications',
          stats: { userTokenCount: 0, guestTokenCount: 0, totalSent: 0 }
        })
      };
    }

    // Send notifications
    const notification = {
      title,
      body
    };

    const webpushData = {
      link: link || '/',
      category,
      timestamp: new Date().toISOString()
    };

    // Send to tokens in batches (FCM has a 500 token limit per call)
    const batchSize = 500;
    const results = [];

    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      
      const response = await messaging.sendMulticast({
        notification,
        webpushConfig: {
          data: webpushData,
          notification: {
            title,
            body,
            icon: '/images/logos/royalmeenakari.png'
          }
        },
        tokens: batch
      });

      results.push(response);

      // Remove failed tokens
      if (response.failureCount > 0) {
        const failedIndices = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedIndices.push(batch[idx]);
          }
        });

        // Delete failed tokens from Firestore
        for (const failedToken of failedIndices) {
          try {
            const guestTokensSnapshot = await db.collection('guest_tokens')
              .where('token', '==', failedToken)
              .get();
            
            guestTokensSnapshot.forEach(doc => {
              doc.ref.delete();
            });
          } catch (error) {
            console.error('Error deleting failed token:', error);
          }
        }
      }
    }

    // Calculate total sent
    const totalSent = results.reduce((sum, result) => sum + result.successCount, 0);

    // Log notification in database
    try {
      await db.collection('notification_logs').add({
        title,
        body,
        link,
        category,
        userTokenCount,
        guestTokenCount,
        totalSent,
        sentAt: new Date(),
        status: 'sent'
      });
    } catch (error) {
      console.error('Error logging notification:', error);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Notifications sent successfully',
        stats: {
          userTokenCount,
          guestTokenCount,
          totalSent,
          totalTokens: tokens.length
        }
      })
    };

  } catch (error) {
    console.error('Error in send-notifications:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to send notifications: ' + error.message
      })
    };
  }
};
