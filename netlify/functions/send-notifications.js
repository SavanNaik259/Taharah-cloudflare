/**
 * Netlify Function: send-notifications
 * Sends Firebase Cloud Messaging (FCM) push notifications to users
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

// Initialize Firebase Admin
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

    // Validate all required fields
    if (!serviceAccount.private_key || !serviceAccount.client_email) {
      throw new Error('Missing critical Firebase credentials: private_key or client_email');
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "auric-a0c92.firebasestorage.app"
    });

    console.log('✅ Firebase Admin initialized for FCM push notifications');
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

const db = admin.firestore();
let messaging;
try {
  messaging = admin.messaging();
  console.log('✅ Firebase Messaging instance created');
} catch (error) {
  console.error('❌ Error creating Firebase Messaging instance:', error.message);
  throw error;
}

exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  try {
    console.log('📨 Processing notification request...');
    
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
      console.warn('⚠️ Missing required fields');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Title and body are required' })
      };
    }

    if (!sendToUsers && !sendToGuests) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'At least one audience must be selected' })
      };
    }

    const tokens = [];
    let userTokenCount = 0;
    let guestTokenCount = 0;

    // Collect user tokens from users collection
    if (sendToUsers) {
      try {
        const usersSnapshot = await db.collection('users').get();
        usersSnapshot.forEach(doc => {
          const userTokens = doc.data().pushTokens || [];
          tokens.push(...userTokens);
          userTokenCount += userTokens.length;
        });
        console.log(`👥 Found ${userTokenCount} user tokens`);
      } catch (error) {
        console.error('❌ Error collecting user tokens:', error.message);
      }
    }

    // Collect guest tokens
    if (sendToGuests) {
      try {
        const guestTokensSnapshot = await db.collection('guest_tokens').get();
        guestTokensSnapshot.forEach(doc => {
          const token = doc.data().token;
          if (token) {
            tokens.push(token);
            guestTokenCount++;
          }
        });
        console.log(`👤 Found ${guestTokenCount} guest tokens`);
      } catch (error) {
        console.error('❌ Error collecting guest tokens:', error.message);
      }
    }

    if (tokens.length === 0) {
      console.log('⚠️ No tokens found to send notifications');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'No tokens found',
          stats: { userTokenCount: 0, guestTokenCount: 0, totalSent: 0 }
        })
      };
    }

    console.log(`📊 Sending to ${tokens.length} total tokens`);

    // Prepare notification payload for WEB PUSH (critical: proper FCM format)
    // For browser notifications, use this exact structure
    const messagePayload = {
      notification: {
        title,
        body
      },
      data: {
        link: link || '/',
        category,
        timestamp: new Date().toISOString()
      },
      webpushConfig: {
        headers: {
          'TTL': '86400'
        },
        notification: {
          title,
          body,
          icon: '/images/logos/royalmeenakari.png',
          badge: '/images/logos/royalmeenakari.png',
          tag: 'auric-notification'
        },
        fcmOptions: {
          link: link || '/'
        }
      }
    };

    // Send in batches (FCM limit is 500 tokens per call)
    const batchSize = 500;
    let successCount = 0;
    let failureCount = 0;
    const failedTokens = [];
    const results = [];

    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      console.log(`📤 Sending batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tokens.length / batchSize)} (${batch.length} tokens)...`);

      try {
        console.log(`📢 Preparing to send batch with messaging instance:`, typeof messaging, messaging !== undefined);
        console.log(`📄 Message payload:`, JSON.stringify({
          tokenCount: batch.length,
          hasData: !!messagePayload.data,
          hasWebpushConfig: !!messagePayload.webpushConfig,
          title: title.substring(0, 30)
        }));
        
        // CORRECTED: For web push, ONLY use webpushConfig, don't use top-level notification
        if (!messaging) {
          throw new Error('Firebase Messaging instance is not initialized');
        }
        
        const response = await messaging.sendMulticast({
          tokens: batch,
          notification: messagePayload.notification,
          data: messagePayload.data,
          webpushConfig: messagePayload.webpushConfig
        });

        console.log(`✅ Batch result: ${response.successCount} sent, ${response.failureCount} failed`);
        console.log(`📊 Full response:`, JSON.stringify({
          successCount: response.successCount,
          failureCount: response.failureCount,
          responses: response.responses.length
        }));
        
        successCount += response.successCount;
        failureCount += response.failureCount;

        // Track failed tokens for cleanup
        if (response.failureCount > 0) {
          console.log(`⚠️ FAILED RESPONSES DETAILED LOG:`);
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              failedTokens.push(batch[idx]);
              const errorMsg = resp.error?.message || 'Unknown error';
              const errorCode = resp.error?.code || 'UNKNOWN';
              const tokenPreview = batch[idx]?.substring(0, 40) + '...';
              console.warn(`❌ [${idx}] Code: ${errorCode}`);
              console.warn(`    Token: ${tokenPreview}`);
              console.warn(`    Error: ${errorMsg}`);
              console.warn(`    Full error obj:`, JSON.stringify(resp.error));
            }
          });
        }

        results.push(response);
      } catch (batchError) {
        console.error(`❌ Batch sending error:`, batchError.message);
        failureCount += batch.length;
      }
    }

    // Clean up failed tokens
    if (failedTokens.length > 0) {
      console.log(`🗑️  Cleaning up ${failedTokens.length} failed tokens...`);
      for (const token of failedTokens) {
        try {
          // Delete from guest_tokens if exists
          const guestDoc = await db.collection('guest_tokens').where('token', '==', token).get();
          guestDoc.forEach(doc => doc.ref.delete());
          
          // CRITICAL FIX: Also delete from user documents
          // Search through all users and remove this token from their pushTokens array
          const usersSnapshot = await db.collection('users').get();
          const updatePromises = [];
          
          usersSnapshot.forEach((doc) => {
            const userTokens = doc.data().pushTokens || [];
            const updatedTokens = userTokens.filter(t => t !== token);
            
            if (updatedTokens.length !== userTokens.length) {
              // Token was found and removed
              updatePromises.push(
                doc.ref.update({
                  pushTokens: updatedTokens,
                  lastTokenCleanup: new Date()
                }).then(() => {
                  console.log(`✅ Removed failed token from user: ${doc.id}`);
                })
              );
            }
          });
          
          // Wait for all user updates to complete
          if (updatePromises.length > 0) {
            await Promise.all(updatePromises);
          }
        } catch (error) {
          console.warn(`Could not delete token: ${error.message}`);
        }
      }
    }

    // Log notification to database
    try {
      await db.collection('notification_logs').add({
        title,
        body,
        link: link || null,
        category,
        userTokenCount,
        guestTokenCount,
        totalRequested: tokens.length,
        successCount,
        failureCount,
        sentAt: new Date(),
        status: 'sent'
      });
      console.log('💾 Notification logged to Firestore');
    } catch (logError) {
      console.error('⚠️ Error logging notification:', logError.message);
    }

    console.log(`✨ Notification sending complete: ${successCount} sent, ${failureCount} failed`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Notifications sent successfully',
        stats: {
          userTokenCount,
          guestTokenCount,
          totalSent: successCount,
          totalFailed: failureCount,
          totalTokens: tokens.length
        }
      })
    };

  } catch (error) {
    console.error('❌ Fatal error in send-notifications:', error.message);
    console.error('Stack:', error.stack);

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
