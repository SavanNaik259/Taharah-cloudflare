/**
 * Email Service
 * Handles sending emails for various purposes using Nodemailer
 */

const { createTransport } = require('./config');
const templates = require('./templates');

// Create a Resend instance
const resend = createTransport();

/**
 * Send an order confirmation email to the customer
 */
async function sendCustomerOrderConfirmation(orderData) {
  try {
    const { customer } = orderData;
    
    if (!customer || !customer.email) {
      throw new Error('Customer email is required to send order confirmation');
    }
    
    const htmlContent = templates.customerOrderTemplate(orderData);
    
    const { data, error } = await resend.emails.send({
      from: `Taharah <${process.env.EMAIL_FROM || 'noreply@fluxe.in'}>`,
      to: [customer.email],
      subject: `✅ Order Confirmed: ${orderData.orderReference}`,
      html: htmlContent,
      reply_to: 'savannnaik090@gmail.com'
    });

    if (error) throw new Error(error.message);
    
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('Error sending customer order confirmation email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send an order notification email to the store owner
 */
async function sendOwnerOrderNotification(orderData) {
  try {
    const ownerEmail = process.env.OWNER_EMAIL || 'savannnaik090@gmail.com';
    const htmlContent = templates.ownerOrderTemplate(orderData);
    
    const { data, error } = await resend.emails.send({
      from: `Taharah Orders <${process.env.EMAIL_FROM || 'noreply@fluxe.in'}>`,
      to: [ownerEmail],
      subject: `New Order - ${orderData.orderReference}`,
      html: htmlContent,
      reply_to: 'savannnaik090@gmail.com'
    });

    if (error) throw new Error(error.message);
    
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('Error sending owner order notification email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send both customer and owner emails for an order
 */
async function sendOrderEmails(orderData) {
  try {
    const [customerResult, ownerResult] = await Promise.all([
      sendCustomerOrderConfirmation(orderData),
      sendOwnerOrderNotification(orderData)
    ]);
    
    return {
      success: customerResult.success && ownerResult.success,
      customer: customerResult,
      owner: ownerResult
    };
  } catch (error) {
    console.error('Error sending order emails:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send email verification email
 */
async function sendVerificationEmail(emailData) {
  try {
    const { customer, verificationUrl } = emailData;
    const htmlContent = templates.verificationTemplate(emailData);

    const { data, error } = await resend.emails.send({
      from: `Taharah <${process.env.EMAIL_FROM || 'noreply@fluxe.in'}>`,
      to: [customer.email],
      subject: '✅ Verify Your Email Address - Taharah',
      html: htmlContent,
      reply_to: 'savannnaik090@gmail.com'
    });

    if (error) throw new Error(error.message);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(emailData) {
  try {
    const { customer, resetUrl } = emailData;
    const htmlContent = templates.passwordResetTemplate(emailData);

    const { data, error } = await resend.emails.send({
      from: `Taharah Security <${process.env.EMAIL_FROM || 'noreply@fluxe.in'}>`,
      to: [customer.email],
      subject: '🔐 Reset Your Password - Taharah',
      html: htmlContent,
      reply_to: 'savannnaik090@gmail.com'
    });

    if (error) throw new Error(error.message);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
}

// Export the email service functions
module.exports = {
  sendCustomerOrderConfirmation,
  sendOwnerOrderNotification,
  sendOrderEmails,
  sendVerificationEmail,
  sendPasswordResetEmail
};