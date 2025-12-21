
/**
 * CLEANUP SCRIPT - Remove old VAPID key tokens from Firestore
 * Run this ONCE after deploying the new VAPID key
 * 
 * Usage: node cleanup-old-tokens.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = {
  type: "service_account",
  project_id: "auric-a0c92",
  private_key_id: "067bc566a907eeca7ae57d98ec6ba463385b2617",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCW1inMXQEJA7c1\nzhYaXL6CIKmSpDcftI6l/tQ33Z0eIPCqACgb3X0uNOm0G8Bquz9Y5n13FLBOU4oH\n+J/BD0kt16VcYG5oxLQVa9xZVVujDM1C7KzFw4ZQztMkYhjjJo5gPrNKpSsT85rx\n8LjU1doGvk/5K1sWS83jeobGtR35PTtQwAG/aOxzm0c48fj4l5/f618UbTpHyUsZ\nG9tklU7RYTTFYELss+PEcGKTQTSrh/RSMug4GaLqbWsOu+AkJaCZGAsTwMc3yLcC\nTAUZCjR104W+WdR3sc5EVh3Dd54pXGeHIWlgyJhiqPWw09lyQ8rJBWfSKYlzJkpe\nbvb879J7AgMBAAECggEAPBpGOXptqSvj2vqtb/+4oZ1mNFpe5LFLjfVGlqQlsRWr\nD/JUCRZuhPTskqnkOCM4kLH3GHYT8oHzJE37SjBPFocxCugZ1oFayJZcDPSoOQYm\n3B32ki7g3F4tX/f+trRsUwlo47uAuMh+2xzyaUx1Pe6ja0PNXcsC1TvDbHZK5T7W\nO+SBvh9RNmmFsqL5eeRdr4t3NPKDHgQ+P49gevkpAzNHcUm4oQt+orniXYcWfAwl\nJtcCla7LSFrAsW89pITcbnTQSadqUXF6LP68NY5xVfZxWBuO+ajVRvpGofZMlkuo\nz8p1JIt7KLnhBdwkQutI4Zll1wZCBcPydX4EC0wd8QKBgQDIbkgjHzSkvHJHLe1X\nY6LxRJmnvXXvP2RKsRDDtHPq0u/JTjHVfeH7Y4546MQX+9/11XEzMX85JUBa/kza\nfCBuT88SYZeEJknpLhUl5IEKg5K9QkRlLimi1saSN/WGBzk7ZP4tslXD632JkDZS\n6ASYYTe8TDXuF8If/CBjhHdU/wKBgQDAp+WXHYR/BxGCvMM5K2qZRqDNACvlcnia\n9xNEmkrgtNGBEPFGrulwP4vtodkBwWnUiipzKUr6eS520baxO9jgdMJ7+bUnTB7L\npeUuGSixIMf0wBvf5OT6FKZ9A6qTc49jd8QD/Vaei8kKS1iCkbOkEwrd7VC1BX8G\nKDBoDJ1WhQKBgQC6aifZ0rpJxaOcJFEtCFSShbVL1+EKhjEnbwwimYF+lHXFC186\nK3y1LWFjf0py7CbfJIfGj3C+m7EBcKfWRcB8GOqFNBOSK3Ju2Bd/SMnkF3+xWyL1\n4DuFYrEJadaHs8w9O69UnRs7v5jhCyobbgRoHXOTRGacbah1yy/sn1XFzQKBgAPX\nlVmVKh5Kasv7rb0HI6IY6X4NIdL6nHMiuEym8xVWJdN4Hge110v4yHadwrEpRU4K\nz1vql+c04XtXJViVg/a9/V7xlO5Ks1aGYXKw58HYkIRODIBDlVlzbfqSRyWXqWVn\nbw5RUBfrW8ALzqET/Mwp4Q6Z/AEQMf9Sb9yzW7PtAoGAJilwi+vA0pNGNlOuKYLj\n8XPYZqktbxs99N0LFPbSIVsVeHwVhoi+KPKgMHuFrQZA22IYJ01acD/LYim3Fi+X\nUD//owCkNu22xWl2SNoBVO3htsGuwokolPBt/MA8mGG+SDR7JJbeDxesfzUWTxHb\nPNWi5ETLiI2OCy1JSmPGq9k=\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@auric-a0c92.iam.gserviceaccount.com"
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "auric-a0c92"
});

const db = admin.firestore();

async function cleanupOldTokens() {
  console.log('🧹 Starting cleanup of old VAPID key tokens...');
  
  try {
    // Clean guest tokens
    const guestSnapshot = await db.collection('guest_tokens').get();
    let guestCleaned = 0;
    
    for (const doc of guestSnapshot.docs) {
      await doc.ref.update({
        tokens: [], // Clear all old tokens
        vapidKeyVersion: 'v2'
      });
      guestCleaned++;
    }
    
    console.log(`✅ Cleaned ${guestCleaned} guest token documents`);
    
    // Clean user tokens
    const usersSnapshot = await db.collection('users').get();
    let usersCleaned = 0;
    
    for (const doc of usersSnapshot.docs) {
      const data = doc.data();
      if (data.fcmTokens && data.fcmTokens.length > 0) {
        await doc.ref.update({
          fcmTokens: [], // Clear all old tokens
          vapidKeyVersion: 'v2'
        });
        usersCleaned++;
      }
    }
    
    console.log(`✅ Cleaned ${usersCleaned} user token documents`);
    console.log('🎉 Cleanup complete! Users need to re-enable notifications with new VAPID key.');
    
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
  
  process.exit(0);
}

cleanupOldTokens();
