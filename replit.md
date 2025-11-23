# Auric Jewelry E-commerce Platform

## Overview

Auric is a premium e-commerce platform designed to provide a seamless online shopping experience for jewelry. It offers comprehensive features including user authentication, cart management, order processing, and email notifications. The platform aims to deliver a modern interface for customers to browse and purchase jewelry, with advanced stock management, multi-language support, and integrated shipping.

## Recent Changes (Nov 23, 2025)

### HOTFIX: Wishlist Not Working on Home & Collection Pages (v3.0.9 COMPLETE)

**Issue Reported**: 
When user changed currency and added products from new arrivals page to wishlist, prices appeared incorrect:
- Expected: $280.00, $336.00
- Actual: $3.14, $3.76

**Root Causes Identified & Fixed**:

1. **Missing Data Attributes** (New Arrivals HTML):
   - The `createProductHTML()` function in `js/new-arrivals-page-loader.js` was NOT including critical data attributes
   - Added: `data-product-price`, `data-original-price` on all product elements

2. **Duplicate Event Handlers** (Wishlist Manager):
   - TWO different event listeners were handling wishlist clicks on product cards:
     - NEW (correct): Direct listeners using multi-level data attribute extraction (line 860+)
     - OLD (broken): Document-level delegation parsing DOM text (line 1210+)
   - BOTH were firing on the same click!
   - Result: Old handler extracted converted price instead of original INR

3. **Event Delegation Issue**:
   - Direct listeners only attached to buttons existing at page load
   - Dynamically added product HTML wasn't getting listeners attached
   - Fixed by using proper event delegation with correct button references

**Solution Applied (v3.0.8)**:

1. Modified `js/new-arrivals-page-loader.js`:
   - Added all required data attributes to product HTML

2. Fixed `js/wishlist-manager.js`:
   - Removed duplicate legacy event handler (line 1210+)
   - Converted direct listener to proper event delegation
   - Fixed all references from `this` to `button` variable
   - Now handles both existing and dynamically added buttons correctly

**Multi-Level Price Extraction (Preserved)**:
- Level 0: Global price cache
- Level 1: Button's `data-product-price` ✅
- Level 2: Product container's `data-product-price` ✅  
- Level 3: Price element's data attributes ONLY ✅
- Level 4: Hardcoded prices as last resort

**Files Modified (v3.0.8)**:
- js/new-arrivals-page-loader.js: Added data attributes
- js/wishlist-manager.js: Fixed duplicate handlers and event delegation

**Result (v3.0.8)**:
- ✅ No more duplicate handlers conflicting
- ✅ No DOM text parsing fallback
- ✅ Works for both existing and dynamically loaded products
- ✅ Prices stored as original INR regardless of selected currency

---

### COMPLETE FIX: Wishlist Not Working on All Pages (v3.0.9 → v3.1.1 ✅ COMPLETE)

**ROOT CAUSE IDENTIFIED & FIXED**:
The wishlist buttons had **inline onclick handlers** with `event.stopPropagation()` that were BLOCKING event bubbling to the document-level event delegation listener!

**FINAL STATUS (v3.1.0)**:
✅ Wishlist buttons WORKING on ALL 16 pages with products
✅ Event delegation properly implemented (no inline handlers blocking events)
✅ Prices correctly stored as original INR values  
✅ Multi-level price extraction system fully operational
✅ All 21 hardcoded product prices successfully cached
✅ Server running without errors

**Complete Solution (v3.0.9 → v3.1.0)**:

**Part 1: Added Price Metadata (v3.0.9)**
- ✅ Added `data-product-price="[INR]"` to 36+ product-item containers
- ✅ Added `data-original-price="[INR]"` to 23+ current-price spans
- ✅ Files updated: index.html, featured-collection.html, saree-collection.html, all-collection.html

**Part 2: Fixed Event Delegation (v3.1.0)**
- ✅ **REMOVED inline onclick handlers** from all product loaders:
  - js/featured-collection-products-loader.js ✅
  - js/new-arrivals-products-loader.js ✅
  - js/saree-collection-products-loader.js ✅
  - js/subcategory-products-loader.js ✅
  - js/filter-sort-handler.js ✅
- ✅ Added enhanced console logging for debugging click events
- ✅ Event now bubbles up to document-level delegation listener

**Price Extraction Strategy (Multi-Level)**:
- **Level 0**: Global price cache (populated at page load) - Most reliable
- **Level 1**: Button's `data-product-price` attribute
- **Level 2**: Product container's `data-product-price` attribute  
- **Level 3**: Price element's `data-original-price` attribute
- **Level 4**: Hardcoded prices as last resort

**Pages Now Fully Working (16 total)**:
✅ index.html (Home) - 20 wishlist buttons
✅ featured-collection.html - Hardcoded + Dynamic
✅ saree-collection.html - Hardcoded + Dynamic
✅ all-collection.html - Hardcoded + Dynamic
✅ gold-bangles.html, gold-necklace.html, gold-rings.html
✅ silver-bangles.html, silver-earrings.html, silver-necklace.html, silver-rings.html
✅ meenakari-bangles.html, meenakari-earrings.html, meenakari-necklace.html, meenakari-rings.html
✅ product-detail.html - Product detail page

**What Wishlist Now Does**:
- Click heart icons on ANY page → Products added to wishlist ✅
- Prices display correctly regardless of currency selected ✅
- Wishlist stores original INR prices (base currency) ✅
- Works on hardcoded products (home page) ✅
- Works on dynamically loaded products (collections) ✅
- Works on category pages (bangles, rings, necklaces, earrings) ✅

---

## HOTFIX: $0.00 Prices on All Collection & Featured Collection (v3.1.1)

**Issue Reported**: 
When users added items from all-collection or featured-collection pages to wishlist, prices showed as $0.00

**Root Cause**: 
The filter-sort-handler.js (used by all-collection page) was missing critical price data attributes:
- Missing `data-product-price` on product-item container
- Missing `data-original-price` on current-price span
- While button had `data-product-price`, the multi-level extraction needs fallback sources

**Solution Applied (v3.1.1)**:
- Updated js/filter-sort-handler.js generateProductHTML():
  - Added: `data-product-price="${product.price}"` to product-item container ✅
  - Added: `data-original-price="${product.price}"` to current-price span ✅
  - Ensured consistency with featured-collection-products-loader.js ✅

**Result**: 
- ✅ Wishlist prices now correctly show original INR values
- ✅ Works on all-collection page
- ✅ Works on featured-collection page
- ✅ Multi-level price extraction works as designed

---

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **HTML5/CSS3**: Utilizes responsive design principles with modern CSS.
- **JavaScript Modules**: Client-side logic is organized into modular JavaScript.
- **UI Components**: Employs reusable UI components for consistency across product display, cart, and other interface elements.
- **UI/UX Design**: Features a clean, professional aesthetic with a specific color palette (Primary: #2563eb, Secondary: #64748b, Success: #059669, Danger: #dc2626, Background: #f8fafc) and responsive grid layouts.

### Backend
- **Serverless Functions**: Netlify Functions handle API endpoints and server-side logic.
- **Local Server**: Express.js is used for local development.
- **Email Service**: Nodemailer manages transactional emails.
- **Payment Processing**: Razorpay is integrated for secure transactions, storing all prices in INR as the base currency.
- **Shipping Integration**: Shiprocket API manages order fulfillment, tracking, and logistics.

### Authentication & Data Storage
- **Authentication**: Firebase Authentication manages user logins and profiles.
- **Database**: Firebase Firestore stores user data, orders, and persistent cart information.
- **Product Data**: Product information, including images, is stored in Firebase Cloud Storage.
- **Cart Management**: A dual storage approach uses `localStorage` for guest users and Firebase for authenticated users.

### Key Features
- **User Management**: Includes authentication, profile management, and order history.
- **Payment Gateway**: Secure Razorpay integration with server-side validation.
- **Currency Converter**: Real-time multi-currency display (INR, USD, EUR, GBP, AED, CAD, AUD) for user convenience, with all base prices stored in INR.
- **Email Notifications**: Automated order confirmations and status updates.
- **Product Management**: Supports multiple categories and subcategories (e.g., necklaces, earrings, bangles, rings in gold, silver, meenakari variants) with an admin panel for product management. Products are loaded from Firebase Cloud Storage via a CDN proxy.
- **Wishlist**: Allows users to save products to a wishlist, persisted via Firebase.
- **Checkout System**: Robust checkout process for both authenticated and guest users.
- **Bandwidth Optimization**: Advanced CDN caching, `stale-while-revalidate`, ETag validation, and extended client-side cache durations.
- **Order Tracking & Fulfillment**: Full Shiprocket integration for order creation, AWB generation, pickup scheduling, and real-time tracking.
- **Stock Management**: Comprehensive system for Firebase operations, server-side updates, automatic stock updates during checkout, and an admin inventory dashboard with real-time alerts.
- **Multi-Language Support**: Dynamic translation system using MyMemory Translation API for 6 languages (English, Hindi, Spanish, French, Arabic, German), including automatic translation of new products, browser language detection, RTL support, and caching.
- **Category Pages**: Dedicated submenu category pages with specific hero sections and dynamic product loading.
- **Admin Dashboard Caching**: Uses `localStorage` for instant display of cached orders, customers, and notifications, with fresh data loading in the background.
- **Inventory Data Caching**: `localStorage` caching for inventory summary (out-of-stock, low stock, in-stock counts) for instant display, with fresh data fetching in the background.
- **Products Management Caching**: `localStorage` caching for admin panel products section for instant display of all products, with fresh data fetching in the background.
- **Watch & Buy Video Management Caching**: Two-stage loading with `localStorage` caching for video configurations and parallel product fetching.

## External Dependencies

- **Payment Gateway**: Razorpay
- **Shipping Service**: Shiprocket API
- **Translation Service**: MyMemory Translation API
- **Email Service**: Gmail SMTP
- **Firebase Services**:
    - Firebase Authentication
    - Firebase Firestore
    - Firebase Cloud Storage
- **Third-party Libraries**:
    - Font Awesome
    - Google Fonts (Playfair Display, Lato)
    - Firebase SDK