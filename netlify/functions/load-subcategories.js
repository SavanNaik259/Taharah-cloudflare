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
    if (!bucket) {
        return { statusCode: 500, body: JSON.stringify({ success: false, error: 'Firebase Storage not configured' }) };
    }

    try {
        const category = event.queryStringParameters.category;
        if (!category) {
            return { statusCode: 400, body: 'Missing category' };
        }

        const fileName = 'settings/subcategories.json';
        const file = bucket.file(fileName);
        
        let subcategories = {};
        try {
            const [exists] = await file.exists();
            if (exists) {
                const [content] = await file.download();
                subcategories = JSON.parse(content.toString());
            } else {
                return {
                    statusCode: 200,
                    body: JSON.stringify({ success: true, subcategories: [] })
                };
            }
        } catch (error) {
            console.log('Subcategories file not found');
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, subcategories: [] })
            };
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            },
            body: JSON.stringify({ 
                success: true, 
                subcategories: subcategories[category] || [] 
            })
        };
    } catch (error) {
        console.error('Error loading subcategories:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, error: error.message })
        };
    }
};
