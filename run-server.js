const express = require('express');
const path = require('path');
const cors = require('cors');
const ShiprocketService = require('./services/shiprocket');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
  try {
    if (!admin.apps.length) {
      let serviceAccount = null;
      
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
          serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        } catch (e) {
          console.log('⚠️ FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON, trying individual env vars...');
        }
      }
      
      if (!serviceAccount && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
        serviceAccount = {
          type: "service_account",
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
          private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          client_id: process.env.FIREBASE_CLIENT_ID,
          auth_uri: "https://accounts.google.com/o/oauth2/auth",
          token_uri: "https://oauth2.googleapis.com/token",
          auth_provider_x509_cert_url: "https://www.googleapis.com/v1/certs",
          client_x509_cert_url: process.env.FIREBASE_CERT_URL
        };
        console.log("✅ Built service account from individual env vars");
      }
      
      if (serviceAccount && serviceAccount.project_id) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase Admin SDK initialized successfully');
      } else {
        console.log('⚠️ Firebase Admin SDK not fully configured');
      }
    }
  } catch (error) {
    console.log('⚠️ Firebase Admin SDK initialization error:', error.message);
  }
}

initializeFirebaseAdmin();

// Initialize Shiprocket service
let shiprocketService = null;
try {
  shiprocketService = new ShiprocketService();
  console.log('Shiprocket service initialized successfully');
} catch (error) {
  console.error('Failed to initialize Shiprocket service:', error.message);
}

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Nazakat website server running on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT}`);
});
