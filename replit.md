# Auric Jewelry E-commerce Platform

## Overview
Auric is a premium e-commerce platform for jewelry, offering a seamless online shopping experience. It includes user authentication, cart management, secure order processing, and email notifications. The platform aims to provide a modern interface for browsing and purchasing jewelry, featuring advanced stock management, multi-language support, and integrated shipping. Its business vision is to capture a significant share of the online luxury jewelry market by providing a reliable, feature-rich, and user-friendly platform.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (Nov 23, 2025)

### CRITICAL FIX: Cart Pricing Bug - $280 Showing as $25,000 (v3.4.0 ✅ COMPLETE)

**ROOT CAUSE IDENTIFIED & FIXED**:
The cart was storing CONVERTED DISPLAY PRICES instead of ORIGINAL INR prices, causing 89x multiplier errors when displaying in different currencies.

**The Bug**: 
- Product display: $280.00 USD
- Code extracted: 280 (from DOM text "$280.00")
- Cart stored: 280 (treating as INR!)
- Cart displayed: 280 × 89 ≈ **$25,000.00** ❌

**Root Issues**:
1. `product-detail.html` `getCurrentProductDetails()` parsed DOM text (converted price)
2. `cart-manager.js` didn't prioritize `data-original-price` attributes
3. No validation that extracted price was original INR

**Complete Solution (v3.4.0)**:

**Part 1: Fixed product-detail.html** (lines 902-956)
- Modified `getCurrentProductDetails()` with 5-level priority:
  1. `window.productDetails.price` (ORIGINAL INR) ✅
  2. `data-original-price` attribute ✅
  3. `data-product-price` attribute ✅
  4. Global price cache ✅
  5. DOM text (last resort only) ✅

**Part 2: Fixed cart-manager.js** (lines 551-602)
- Implemented same 5-level priority system when adding to cart
- Prioritizes global product details FIRST
- Falls back to data attributes
- Uses price cache
- Warns if parsing DOM (may be converted)

**Result (v3.4.0)**:
- ✅ Product: $280.00 displayed correctly in USD
- ✅ Cart stores: 25000 INR (original price)
- ✅ Cart displays: $280.00 USD (correct!)
- ✅ Works across all currencies
- ✅ Console shows price source for debugging

---

## System Architecture

### Frontend
- **Technology Stack**: HTML5/CSS3 for responsive design, modular JavaScript for client-side logic.
- **UI/UX Design**: Clean, professional aesthetic with a specific color palette (Primary: #2563eb, Secondary: #64748b, Success: #059669, Danger: #dc2626, Background: #f8fafc) and responsive grid layouts. Employs reusable UI components for consistency.

### Backend
- **Server-side Logic**: Netlify Functions for API endpoints and serverless operations.
- **Local Development**: Express.js for local server setup.
- **Email System**: Nodemailer for transactional emails.
- **Payment System**: Razorpay integration for secure transactions, handling all base prices in INR.
- **Shipping Logistics**: Shiprocket API for order fulfillment, tracking, and logistics.

### Authentication & Data Storage
- **User Authentication**: Firebase Authentication manages user logins and profiles.
- **Database**: Firebase Firestore stores user data, orders, and persistent cart information.
- **Product Assets**: Firebase Cloud Storage hosts product images and other media.
- **Cart Management**: Uses `localStorage` for guest users and Firebase for authenticated users.

### Key Features
- **User Management**: Authentication, profile management, and order history.
- **Payment Gateway**: Secure Razorpay integration with server-side validation.
- **Currency Converter**: Real-time multi-currency display (INR, USD, EUR, GBP, AED, CAD, AUD) with base prices in INR.
- **Email Notifications**: Automated order confirmations and status updates.
- **Product Management**: Supports multiple categories/subcategories; product data loaded from Firebase via CDN. Includes an admin panel.
- **Wishlist**: User wishlist functionality persisted via Firebase.
- **Checkout System**: Robust process for both authenticated and guest users.
- **Performance Optimization**: CDN caching, `stale-while-revalidate`, ETag validation, and extended client-side cache durations.
- **Order Tracking**: Full Shiprocket integration for lifecycle management.
- **Stock Management**: Firebase-driven stock updates, automatic checkout adjustments, and admin inventory dashboard with real-time alerts.
- **Multi-Language Support**: Dynamic translation via MyMemory Translation API for 6 languages, with automatic translation of new products, browser language detection, and RTL support.
- **Category Pages**: Dedicated submenu category pages with specific hero sections and dynamic product loading.
- **Admin Dashboard Caching**: `localStorage` caching for orders, customers, and notifications with background data refreshing.
- **Inventory & Product Data Caching**: `localStorage` caching for inventory summary and product listings in the admin panel for instant display.

## External Dependencies

- **Payment Gateway**: Razorpay
- **Shipping Service**: Shiprocket API
- **Translation Service**: MyMemory Translation API
- **Email Service**: Gmail SMTP
- **Firebase Services**: Firebase Authentication, Firebase Firestore, Firebase Cloud Storage
- **Third-party Libraries**: Font Awesome, Google Fonts, Firebase SDK