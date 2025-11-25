/**
 * Netlify Function: Send Order Email
 * 
 * Sends order confirmation emails to customer and shop owner
 * Handles POST requests to /.netlify/functions/send-order-email
 */

const emailService = require('./utils/email-service');

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