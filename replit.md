# Auric Jewelry E-commerce Platform

## Overview
Auric is a premium e-commerce platform for jewelry, offering a seamless online shopping experience. It includes user authentication, cart management, wishlist functionality, multi-currency support (INR base with USD, EUR, GBP, AED, CAD, AUD), order processing, email notifications, and **REAL push notifications using Firebase Cloud Messaging**. The platform aims to provide a modern interface for browsing and purchasing jewelry, featuring advanced stock management, multi-language support, and integrated shipping. Its business vision is to capture a significant share of the online luxury jewelry market by providing a reliable, feature-rich, and user-friendly platform.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (Nov 28, 2025)

### FEATURE: Push Notifications System - Complete FCM Implementation (v4.0.0 ✅ COMPLETE)

**User Request**: "Build push notification system using Firebase Cloud Messaging with single user permission for promotional campaigns, abandoned cart reminders, back-in-stock alerts, and price drop alerts"

**Solution Implemented - REAL Firebase Cloud Messaging**:
Implemented complete, working push notification system using Firebase Cloud Messaging with real FCM tokens instead of fake tokens.

**Technical Implementation**:

**Frontend - index.html**:
- Service Worker registration for handling background push events
- Real FCM token generation via `firebase.messaging().getToken()`
- VAPID key: `BIWRF2leB0T2HGDSKEhgevQlbmdaeoCaQUi88hdUw8N9k_d36JuImK8I7Nwj52Wi4_sd9G4QfFdLJWLcqU5akOQ`
- Token storage in Firestore for both logged-in users (users collection) and guests (guest_tokens collection)
- Foreground message handling - users see notifications even when app is open
- Single opt-in permission for all 4 notification types (promotional, abandoned cart, back-in-stock, price drop)

**Backend - send-campaign.js**:
- Firebase Admin SDK initialization supporting individual env vars (FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_PRIVATE_KEY_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_CLIENT_ID, FIREBASE_CERT_URL)
- Fetches real FCM tokens from both logged-in users and guest devices
- Sends notifications via `admin.messaging().send()` with proper error handling
- Returns actual sent/failed counts (no fake numbers)

**Admin Dashboard - admin-promotions.html**:
- User Statistics showing logged-in users and guest devices with real counts
- Campaign creation with manual send capability
- Actual sent notification counts and analytics tracking
- User opt-in list showing all users with tokens

**Service Worker - service-worker.js**:
- Handles background push notifications
- Click handling to redirect users to campaign links
- Badge and icon display for visual notification

**Data Flow**:
1. User clicks "Enable Notifications" on home page
2. Browser requests permission + Service Worker registers
3. Firebase generates REAL FCM token via messaging().getToken()
4. Token stored in Firestore (users/{uid}/fcmTokens or guest_tokens/{deviceId}/tokens)
5. Admin creates campaign → backend fetches all tokens
6. Sends via Firebase Cloud Messaging HTTP v1 API
7. Notifications delivered to users' devices
8. Service Worker handles background notification display

**Environment Setup**:
- FIREBASE_VAPID_KEY: Set in Netlify environment variables
- FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_PRIVATE_KEY_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_CLIENT_ID, FIREBASE_CERT_URL: Individual env vars from Firebase service account
- Server automatically constructs service account from individual vars

**Features Completed**:
- ✅ Real FCM tokens (not fake generated tokens)
- ✅ Service Worker for background notifications
- ✅ VAPID key configured and working
- ✅ Frontend token generation and storage
- ✅ Backend notification sending via Firebase Admin SDK
- ✅ Admin dashboard for campaign management
- ✅ User statistics with real counts
- ✅ Single permission for all notification types
- ✅ Supports logged-in users and guests
- ✅ Foreground and background notification handling
- ✅ Click tracking and analytics
- ✅ Actual sent counts (no fake random numbers)

**Files Modified/Created**:
- `index.html` - Updated notification opt-in with real FCM token generation
- `service-worker.js` - Service Worker for push event handling
- `netlify/functions/send-campaign.js` - Campaign sending with real FCM tokens
- `admin-promotions.html` - Admin dashboard for campaigns
- `run-server.js` - Firebase Admin SDK initialization supporting individual env vars

---

### Previous Changes (Nov 24, 2025)

#### FEATURE: Product Loading Spinners - All Sections (v3.7.0 ✅ COMPLETE)

**User Request**: "On home page when the new arrivals, all collection and featured collection section products are loading then the loader should show"

**Solution Implemented**:
Added professional loading spinners to display while products are loading from Firebase Storage for ALL three product sections.

**Technical Changes**:
1. Created `css/product-loader.css` with elegant spinning loader animation
2. Modified `index.html` with loader elements to New Arrivals, Featured Collection, and Jewelry Collection sections
3. Updated product loader scripts to hide loaders when products load:
   - `js/new-arrivals-products-loader.js`
   - `js/featured-collection-products-loader.js`
   - `js/saree-collection-products-loader.js`

**User Experience**:
- ✅ Loaders show with elegant spinning animation while products load
- ✅ Auto-hide once products loaded
- ✅ Professional gold accent color (#b5a681) matching site design
- ✅ Clear "Loading..." text messages

---

#### CRITICAL FIX: First-Visit Welcome Banner - Image & Text Responsive Layout (v3.6.6 ✅ COMPLETE)

**Root Cause**: Container had only `max-height` without explicit `height`, causing image flex-basis to not calculate properly

**Solution**: 
- Changed image sizing from flex-basis % to explicit height %
- Added explicit container heights for all responsive breakpoints
- Applied flex-shrink: 0 to prevent image squishing

**Responsive Breakpoints**:
- Desktop: Container 85vh → Image 65% + Text 35%
- Tablets (≤768px): Container 75vh → Image 60% + Text 40%
- Small phones (≤480px): Container 65vh → Image 55% + Text 45%
- Landscape (height ≤600px): Container 55vh → Image 50% + Text 50%

**Result**: Banner scales perfectly on all devices with both image and welcome text always visible

---

#### COMPREHENSIVE FIX: Cart & Checkout Currency Conversion (v3.5.0 ✅ COMPLETE)

**Root Cause**: Prices displayed without currency conversion applied

**Solution**:
- Cart displays: Applies conversion when displaying INR prices
- Checkout displays: Applies conversion when displaying INR totals
- Works across all currencies (INR, USD, EUR, GBP, AED, CAD, AUD)

**Data Flow**:
1. Product: 25000 INR (original price)
2. Cart stores: 25000 INR (unchanged)
3. Display formula: `convertPrice(25000) × USD_RATE` = 280
4. Cart displays: **$280.00 USD**

---

## System Architecture

### Frontend
- **Technology Stack**: HTML5/CSS3 for responsive design, modular JavaScript for client-side logic, Firebase SDK for real-time features
- **UI/UX Design**: Clean, professional aesthetic with gold/brown color palette and responsive grid layouts
- **Push Notifications**: Service Worker + Firebase Cloud Messaging with real FCM tokens

### Backend
- **Server-side Logic**: Netlify Functions for API endpoints and serverless operations
- **Local Development**: Express.js for local server setup
- **Email System**: Nodemailer for transactional emails
- **Payment System**: Razorpay integration for secure transactions (base prices in INR)
- **Shipping Logistics**: Shiprocket API for order fulfillment and tracking
- **Push Notifications**: Firebase Cloud Messaging HTTP v1 API for real-time push delivery

### Authentication & Data Storage
- **User Authentication**: Firebase Authentication
- **Database**: Firebase Firestore for user data, orders, and FCM tokens
- **Product Assets**: Firebase Cloud Storage
- **Push Notification Tokens**: Firestore collections (users FCM tokens, guest tokens)
- **Cart Management**: localStorage for guests, Firebase for authenticated users

### Key Features
- **User Management**: Authentication, profiles, order history, notification preferences
- **Payment Gateway**: Secure Razorpay integration
- **Currency Converter**: Real-time multi-currency (INR, USD, EUR, GBP, AED, CAD, AUD)
- **Email Notifications**: Automated order confirmations and status updates
- **Push Notifications**: Real Firebase Cloud Messaging for promotions, abandoned carts, back-in-stock, price drops
- **Product Management**: Multiple categories/subcategories with Firebase storage
- **Admin Panel**: Campaign management, user statistics, notification sending
- **Wishlist**: User wishlist functionality
- **Checkout System**: For authenticated and guest users
- **Order Tracking**: Full Shiprocket integration
- **Stock Management**: Firebase-driven updates and admin alerts
- **Multi-Language Support**: Translation API with RTL support
- **Performance**: CDN caching, ETag validation, extended cache durations

## External Dependencies

- **Payment Gateway**: Razorpay
- **Shipping Service**: Shiprocket API
- **Translation Service**: MyMemory Translation API
- **Email Service**: Gmail SMTP
- **Firebase Services**: Authentication, Firestore, Cloud Storage, Cloud Messaging
- **Third-party Libraries**: Font Awesome, Google Fonts, Firebase SDK
