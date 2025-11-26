/**
 * Netlify Function: Send Order Email
 * 
 * Sends order confirmation emails to customer and shop owner
 * Handles POST requests to /.netlify/functions/send-order-email
 */

const emailService = require('./utils/email-service');
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
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
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs"
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "auric-a0c92.firebasestorage.app"
    });

    console.log('Firebase Admin initialized for send-order-email');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

/**
 * Fetch missing userSelectedCurrency from Firebase if not provided
 */
async function enrichOrderDataWithCurrency(orderData) {
  // If userSelectedCurrency is already present, return as-is
  if (orderData.userSelectedCurrency) {
    console.log('userSelectedCurrency already present:', orderData.userSelectedCurrency);
    return orderData;
  }

  // For cancellations, try to fetch the original order to get the currency
  if (orderData.status && orderData.status.toLowerCase() === 'cancelled' && orderData.orderReference) {
    try {
      console.log('Fetching original order to get userSelectedCurrency for:', orderData.orderReference);
      
      const bucket = admin.storage().bucket();
      const ordersFile = bucket.file('orders/orders.json');
      
      const [exists] = await ordersFile.exists();
      if (exists) {
        const [fileContents] = await ordersFile.download();
        const allOrders = JSON.parse(fileContents.toString());
        
        // Find the original order by orderReference
        const originalOrder = allOrders.find(o => o.orderReference === orderData.orderReference);
        
        if (originalOrder && originalOrder.userSelectedCurrency) {
          console.log('Found userSelectedCurrency in original order:', originalOrder.userSelectedCurrency);
          orderData.userSelectedCurrency = originalOrder.userSelectedCurrency;
          
          // Also copy over priceDisplay and orderTotalDisplay if missing
          if (!orderData.orderTotalDisplay && originalOrder.orderTotalDisplay) {
            orderData.orderTotalDisplay = originalOrder.orderTotalDisplay;
          }
          
          // Ensure products have priceDisplay
          if (orderData.products && originalOrder.products) {
            orderData.products = orderData.products.map((product, index) => {
              if (!product.priceDisplay && originalOrder.products[index]) {
                product.priceDisplay = originalOrder.products[index].priceDisplay;
                product.totalDisplay = originalOrder.products[index].totalDisplay;
              }
              return product;
            });
          }
        }
      }
    } catch (error) {
      console.warn('Could not fetch original order for currency enrichment:', error.message);
    }
  }

  // Default to INR if still not found
  if (!orderData.userSelectedCurrency) {
    console.log('No userSelectedCurrency found, defaulting to INR');
    orderData.userSelectedCurrency = 'INR';
  }

  return orderData;
}

exports.handler = async (event, context) => {
  // Set CORS headers - allow all origins for development
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
  
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204, // No content
      headers
    };
  }
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Method not allowed'
      })
    };
  }
  
  try {
    console.log('Environment check:', {
      emailUser: process.env.EMAIL_USER ? 'set' : 'missing',
      emailPass: process.env.EMAIL_PASS ? 'set' : 'missing',
      emailService: process.env.EMAIL_SERVICE || 'not set'
    });

    // Use hardcoded credentials if environment variables are not available
    if (!process.env.EMAIL_USER && !process.env.EMAIL_PASS) {
      console.log('Using fallback email credentials');
      process.env.EMAIL_USER = 'nazakatwebsite24@gmail.com';
      process.env.EMAIL_PASS = 'dhpn qlei gfoa iivm';
      process.env.EMAIL_SERVICE = 'gmail';
    }
    
    // Parse the request body
    let orderData;
    try {
      orderData = JSON.parse(event.body);
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Invalid request body format. JSON expected.'
        })
      };
    }
    
    // Validate required data
    // For delivery confirmations, products may be optional
    const isDeliveryConfirmation = orderData.status && orderData.status.toLowerCase() === 'delivered';
    
    if (!orderData || !orderData.customer) {
      console.error('Missing required order data:', {
        hasOrderData: !!orderData,
        hasCustomer: !!(orderData && orderData.customer),
        hasProducts: !!(orderData && orderData.products),
        isDeliveryConfirmation
      });
      
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Missing required order data',
          debug: {
            hasOrderData: !!orderData,
            hasCustomer: !!(orderData && orderData.customer),
            hasProducts: !!(orderData && orderData.products),
            isDeliveryConfirmation
          }
        })
      };
    }
    
    // For non-delivery orders, products are required
    if (!isDeliveryConfirmation && !orderData.products) {
      console.error('Missing products for order confirmation');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Missing products for order confirmation'
        })
      };
    }
    
    // Ensure products array exists (for delivery confirmations, it can be empty)
    if (!orderData.products) {
      orderData.products = [];
    }
    
    console.log('Received order email request for:', orderData.orderReference);
    console.log('Order status:', orderData.status);
    console.log('Is delivery confirmation:', orderData.status && orderData.status.toLowerCase() === 'delivered');
    console.log('Order data keys:', Object.keys(orderData));
    console.log('Initial userSelectedCurrency:', orderData.userSelectedCurrency);
    
    // Enrich order data with missing currency information from Firebase
    orderData = await enrichOrderDataWithCurrency(orderData);
    console.log('Final userSelectedCurrency after enrichment:', orderData.userSelectedCurrency);
    
    // Send emails
    console.log('Calling emailService.sendOrderEmails...');
    const result = await emailService.sendOrderEmails(orderData);
    
    console.log('Email service result:', result);
    
    if (result.success) {
      console.log('✅ Order emails sent successfully for:', orderData.orderReference);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Order emails sent successfully',
          result
        })
      };
    } else {
      console.error('❌ Failed to send order emails:', result.error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Failed to send order emails',
          error: result.error
        })
      };
    }
  } catch (error) {
    console.error('Error in send-order-email function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Server error while sending order emails',
        error: error.message
      })
    };
  }
};