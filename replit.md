# Razorpay & Email Integration Fix (Cloudflare Pages)

The project has been migrated from Netlify Functions to Cloudflare Pages Functions to fix the Razorpay checkout error.

## Changes Made
1.  **Created Cloudflare Pages Functions**:
    -   `/functions/api/create-razorpay-order.js`: Handles Razorpay order creation using fetch API (No Node SDK).
    -   `/functions/api/verify-razorpay-payment.js`: Verifies signatures using Web Crypto API.
    -   `/functions/api/send-order-email.js`: Sends confirmation emails via **Resend API**.

2.  **Updated Frontend (`js/checkout-script-simplified.js`)**:
    -   Refactored `sendOrderConfirmationEmails` to use the new Cloudflare API structure.
    -   Updated both COD and Online payment flows to trigger the new email function.
    -   Removed legacy Express/Netlify conditional logic for cleaner execution.

3.  **Cleanup**:
    -   Removed all unused Netlify function files and directories (`app/netlify/`).
    -   Deleted Shiprocket-related serverless functions as the feature is disabled.

## Environment Variables Required
Ensure the following are set in your Cloudflare Pages dashboard:
-   `RAZORPAY_KEY_ID`
-   `RAZORPAY_KEY_SECRET`
-   `RESEND_API_KEY` (Default provided in code as fallback)

## Verification Steps
1.  Place a COD order: Check browser console for "COD order confirmation emails sent successfully".
2.  Place a Razorpay order: Verify the popup opens and the signature verification call to `/api/verify-razorpay-payment` succeeds.
3.  Check Email: Ensure emails are received via Resend from `orders@fluxe.in`.