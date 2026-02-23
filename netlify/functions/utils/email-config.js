/**
 * Resend Configuration for Netlify Functions
 */
const { Resend } = require('resend');

/**
 * Get the Resend instance
 * @returns {Object} Resend instance
 */
function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey && process.env.NODE_ENV === 'production') {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  return new Resend(apiKey || 're_test_123');
}

module.exports = {
  getResend
};