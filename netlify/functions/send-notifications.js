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

// CORS headers - CRITICAL: Include in EVERY response
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
};

// Initialize Firebase Admin
let db = null;
let messaging = null;

function initializeFirebase() {
  if (admin.apps.length > 0) {
    db = admin.firestore();
    messaging = admin.messaging();
    return true;
  }

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
    if (!serviceAccount.private_key) {
      throw new Error('Missing FIREBASE_PRIVATE_KEY environment variable');
    }
    if (!serviceAccount.client_email) {
      throw new Error('Missing FIREBASE_CLIENT_EMAIL environment variable');
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "auric-a0c92.firebasestorage.app"
    });

    db = admin.firestore();
    messaging = admin.messaging();
    
    console.log('✅ Firebase Admin initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    throw error;
  }
}

exports.handler = async (event, context) => {
  // CRITICAL: Always return CORS headers, even on errors
  const headers = corsHeaders;

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    console.log('✓ CORS preflight request');
    return { 
      statusCode: 200, 
      headers, 
      body: JSON.stringify({ ok: true }) 
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    console.warn(`⚠️ Invalid method: ${event.httpMethod}`);
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Only POST method is allowed' 
      })
    };
  }

  try {
    console.log('📨 Processing notification request from:', event.headers.origin || 'unknown');
    
    // Initialize Firebase
    initializeFirebase();
    
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
          const validTokens = userTokens.filter(t => {
            const isValid = typeof t === 'string' && t && t.length > 100;
            if (!isValid) {
              console.warn(`⚠️ Skipping invalid user token: type=${typeof t}, length=${t?.length || 0}`);
            }
            return isValid;
          });
          tokens.push(...validTokens);
          userTokenCount += validTokens.length;
        });
        console.log(`👥 Found ${userTokenCount} valid user tokens`);
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
          if (token && typeof token === 'string' && token.length > 100) {
            tokens.push(token);
            guestTokenCount++;
          } else {
            console.warn(`⚠️ Skipping invalid guest token in doc ${doc.id}: type=${typeof token}, length=${token?.length || 0}`);
          }
        });
        console.log(`👤 Found ${guestTokenCount} valid guest tokens`);
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
    console.error('❌ FATAL ERROR in send-notifications handler:', error.message);
    console.error('Stack trace:', error.stack);

    // CRITICAL: Even in error, return CORS headers so browser can read response
    return {
      statusCode: 500,
      headers, // This includes CORS headers
      body: JSON.stringify({
        success: false,
        error: 'Failed to send notifications: ' + error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
