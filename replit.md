# Auric Jewelry E-commerce Platform

## Overview

Auric is a premium e-commerce platform designed to provide a seamless online shopping experience for jewelry. It offers comprehensive features including user authentication, cart management, order processing, and email notifications. The platform aims to deliver a modern interface for customers to browse and purchase jewelry, with advanced stock management, multi-language support, and integrated shipping.

## Recent Changes (Nov 23, 2025)

### COMPLETE FIX: Price=0 Bug for Cart AND Wishlist (v3.0.4)

**All Issues Resolved**:
1. ✅ **PRICE=0 BUG (CART)**: Fixed - Products add to cart with correct INR prices
2. ✅ **PRICE=0 BUG (WISHLIST)**: Fixed - Products add to wishlist with correct INR prices  
3. ✅ **Currency Symbols**: Fixed - All correct symbols display across cart, checkout, wishlist, order confirmation
4. ✅ **Currency Conversion**: Fixed - All pages properly convert and display prices in selected currency

**Root Cause**:
When users selected different currencies, displayed prices changed to converted amounts. Cart and wishlist were extracting from displayed elements instead of original INR prices, resulting in price=0 bugs.

**Solution**:
- **Multi-Level Price Extraction**: Both cart-manager and wishlist-manager now read prices from data attributes FIRST
  - Priority 1: `data-product-price` on elements (stores original INR)
  - Priority 2: `data-original-price` on price elements
  - Fallback: Parse text content only as last resort
  
**Files Modified**:
- js/cart-manager.js: Enhanced price extraction with attribute support
- js/wishlist-manager.js: Enhanced price extraction with attribute support  
- js/featured-collection-products-loader.js: Added data-product-price attributes
- js/new-arrivals-products-loader.js: Added data-product-price attributes
- js/subcategory-products-loader.js: Added data-product-price attributes
- js/saree-collection-products-loader.js: Added data-product-price attributes
- index.html: Added CurrencyConverter initialization + data attributes to 5 hardcoded wishlist buttons (RBC-01, EBS-02, TBE-03, CBJ-04)
- product-detail.html: Added data attributes to 2 hardcoded wishlist buttons in "You May Also Like" (GLBR-11, SLAT-12)
- All subcategory pages (gold-necklace.html, silver-necklace.html, etc.): Added CurrencyConverter initialization

**Final Root Cause (User Report)**:
Hardcoded product wishlist buttons on home page and product-detail page lacked `data-product-price` attributes. When users changed currency BEFORE adding to wishlist, the price extraction code fell back to DOM parsing which read the converted (displayed) price instead of original INR, resulting in price=0 being stored. The fix ensures ALL wishlist buttons (both dynamically loaded AND hardcoded) have the original INR price in data attributes.

**Result**: 
- ✅ Users can add items from ANY page with correct prices
- ✅ Wishlist shows correct prices instead of 0
- ✅ Cart shows correct prices instead of 0
- ✅ Currency displays correctly across all interfaces
- ✅ Checkout totals are accurate regardless of currency selection

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