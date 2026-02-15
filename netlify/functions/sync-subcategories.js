const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
let adminApp;
try {
  adminApp = admin.app();
} catch (error) {
  if (error.code === 'app/no-app') {
    try {
      const serviceAccount = {
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: process.env.FIREBASE_CERT_URL
      };

      if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
        throw new Error('Missing required Firebase Admin credentials in environment variables');
      }

      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
    } catch (initError) {
      console.error('Firebase Admin initialization error:', initError);
    }
  }
}

const bucket = adminApp ? admin.storage().bucket(process.env.FIREBASE_STORAGE_BUCKET) : null;

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    if (!bucket) {
        return { statusCode: 500, body: JSON.stringify({ success: false, error: 'Firebase Storage not configured' }) };
    }

    try {
        const { category, subcategory } = JSON.parse(event.body);
        if (!category || !subcategory) {
            return { statusCode: 400, body: 'Missing category or subcategory' };
        }

        const fileName = 'settings/subcategories.json';
        const file = bucket.file(fileName);
        
        let subcategories = {};
        try {
            const [exists] = await file.exists();
            if (exists) {
                const [content] = await file.download();
                subcategories = JSON.parse(content.toString());
            }
        } catch (error) {
            console.log('Subcategories file not found or invalid, creating new one');
        }

        if (!subcategories[category]) {
            subcategories[category] = [];
        }

        if (!subcategories[category].includes(subcategory)) {
            subcategories[category].push(subcategory);
            await file.save(JSON.stringify(subcategories, null, 2), {
                contentType: 'application/json',
                metadata: {
                    cacheControl: 'public, max-age=0, no-cache'
                }
            });
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, message: 'Subcategory synced' })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: 'Subcategory already exists' })
        };
    } catch (error) {
        console.error('Error syncing subcategory:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, error: error.message })
        };
    }
};
