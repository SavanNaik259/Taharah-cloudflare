/**
 * Resend Configuration for Firebase Functions
 */
const { Resend } = require('resend');

/**
 * Get the Resend instance
 */
function createTransport() {
  const apiKey = process.env.RESEND_API_KEY;
  return new Resend(apiKey || 're_test_123');
}

module.exports = {
  createTransport
};