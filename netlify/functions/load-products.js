const admin = require('firebase-admin');

function getFirestore() {
  try {
    if (!admin.apps.length) {
      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") : undefined,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CERT_URL
      };

      if (serviceAccount.project_id && serviceAccount.private_key && serviceAccount.client_email) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });
      } else {
        return null;
      }
    }
    return admin.firestore();
  } catch (error) {
    console.error('Firestore init error:', error);
    return null;
  }
}

exports.handler = async (event, context) => {
  const db = getFirestore();
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (!db) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Database connection failed' })
    };
  }

  try {
    const category = event.queryStringParameters?.category;
    const categoriesStr = event.queryStringParameters?.categories;
    let products = [];

    if (categoriesStr) {
      const categories = categoriesStr.split(',');
      for (const cat of categories) {
        const snapshot = await db.collection('products').where('category', '==', cat).get();
        snapshot.forEach(doc => products.push({ id: doc.id, ...doc.data() }));
      }
    } else if (category) {
      const snapshot = await db.collection('products').where('category', '==', category).get();
      snapshot.forEach(doc => products.push({ id: doc.id, ...doc.data() }));
    } else {
      const snapshot = await db.collection('products').get();
      snapshot.forEach(doc => products.push({ id: doc.id, ...doc.data() }));
    }

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ success: true, products })
    };
  } catch (error) {
    console.error('Error loading products:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message })
    };
  }
};
