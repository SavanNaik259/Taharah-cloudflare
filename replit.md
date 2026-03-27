# Taharah - Premium Pakistani Fashion

## Project Overview
Taharah is a premium Pakistani fashion e-commerce platform.

## Tech Stack
- **Frontend:** HTML, CSS, JavaScript (Static site)
- **Backend:** Cloudflare Pages Functions (Serverless)
- **Database:** Firebase Firestore
- **Storage:** Firebase Storage (Product data JSON & Media)
- **Email:** Resend API
- **Hosting:** Cloudflare Pages (Migrated from Netlify)

## Key Configurations
- **Instagram:** [@officialtaharah_](https://www.instagram.com/officialtaharah_/)
- **Contact Email:** officialtaharah@gmail.com
- **Brand Colors:** 
  - Plum: `#a46d77` (Buttons)
  - Greyish Beige: `#d8d2c2` (Borders/Accents)
- **Product Data:** Fetched from Firebase Storage via `/api/load-products`
- **Product Deletion:** Uses client-side Firebase Storage SDK directly (not server function) to avoid Cloudflare Pages auth issues
- **Video Proxy:** `/api/proxy-video` for CDN caching of Firebase Storage videos.
- **Order Real-Time Listeners:** Firestore `onSnapshot` listeners on all user order subcollections + guest-orders collection; auto-updates UI when orders are added/modified/deleted anywhere
- **Dashboard Caching:** localStorage cache (`admin_all_orders_cache` + `admin_dashboard_orders`) for instant display on page load; real-time listeners take over after initial load
- **Order Mutations:** confirmOrder/cancelOrder/markAsDelivered update Firestore directly; real-time listeners auto-detect changes and refresh UI
- **Refresh Button:** Manual force-refresh available on Order Management section; invalidates cache and fetches fresh from Firebase
- **Static File Caching:** `_headers` file with `no-cache, no-store` for all assets to ensure instant updates on Cloudflare Pages
- **Checkout PIN Validation:** Single PIN code API call with 8-second timeout (via `fetchWithTimeout`); no duplicate validation; `isValidating` guard prevents double-click on "Continue to Place Order" button
- **State Dropdown:** All state values trimmed (no leading spaces); `normalizeState()` used for API comparison
