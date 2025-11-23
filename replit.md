# Auric Jewelry E-commerce Platform

## Overview

Auric is a premium e-commerce platform designed to provide a seamless online shopping experience for jewelry. It offers comprehensive features including user authentication, cart management, order processing, and email notifications. The platform aims to deliver a modern interface for customers to browse and purchase jewelry, with advanced stock management, multi-language support, and integrated shipping.

## Recent Changes (Nov 23, 2025)

### HOTFIX: Currency Conversion Bug on New Arrivals Page (v3.0.7)

**Issue Reported**: 
When user changed currency and added products from new arrivals page to wishlist, prices appeared incorrect:
- Expected: $280.00, $336.00
- Actual: $3.14, $3.76

**Root Cause**: 
The `createProductHTML()` function in `js/new-arrivals-page-loader.js` was NOT including the critical data attributes needed for price extraction:
- Missing `data-product-price` on button and product-item container
- Missing `data-original-price` on price span
- When wishlist manager tried to extract the price, it fell back to reading DOM text (which was already converted)
- This caused the wishlist to store converted prices instead of original INR prices

**Solution Applied (v3.0.7)**:
Modified `js/new-arrivals-page-loader.js` to add all required data attributes:
1. Extract original price: `const originalPrice = parseFloat(product.price) || 0;`
2. Add to product-item: `data-product-price="${originalPrice}"`
3. Add to wishlist button: `data-product-price="${originalPrice}"`
4. Add to price span: `data-original-price="${originalPrice}"`

This ensures:
- Wishlist manager finds original INR price at Level 1 or Level 2 extraction
- Never falls back to reading converted DOM text
- Works correctly regardless of when user changes currency

**Files Modified (v3.0.7)**:
- js/new-arrivals-page-loader.js: Updated createProductHTML() to include all data attributes

**Verification**: All other product loaders already have correct data attributes:
- ✅ featured-collection-products-loader.js: Has data attributes
- ✅ subcategory-products-loader.js: Has data attributes
- ✅ index.html: Hardcoded buttons have data attributes
- ✅ product-detail.html: Hardcoded buttons have data attributes

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