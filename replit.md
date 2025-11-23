# Auric Jewelry E-commerce Platform

## Overview

Auric is a premium e-commerce platform offering an online shopping experience for jewelry. It includes user authentication, cart management, order processing, and email notifications. The platform aims to provide a modern and seamless interface for customers to browse and purchase jewelry, with a focus on comprehensive features like advanced stock management, multi-language support, and integrated shipping.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (Nov 23, 2025)

### Currency Persistence Fix (Completed)
- **Saved Currency Preference**: Selected currency now persists across page refreshes using localStorage
- **Automatic Conversion on Load**: When page loads, saved currency preference is restored and all prices automatically convert
- **Dynamic Product Loading**: Added currency conversion calls after all dynamically loaded products are inserted into the DOM
- **All Product Loaders Updated**: Fixed new-arrivals, featured-collection, saree-collection, and subcategory product loaders
- **Collection Pages Fixed**: Updated featured-collection.html, all-collection.html, and saree-collection.html to convert prices after loading
- **Checkout Totals Fixed**: Added .order-total class and data-original-price attribute to all order total elements across 3 checkout steps
- **Fixed Currency Converter Initialization**: Resolved race condition where currency converter wasn't initializing properly on page reload
  - Made currency converter use proper async/await patterns for exchange rate loading
  - Added 3-second timeout for exchange rate API with graceful fallback to cached/default rates
  - Implemented comprehensive logging to track initialization steps
  - Fixed window.CurrencyConverter assignment order to prevent undefined reference errors
  - Added location detection timeout to prevent initialization hang
  - Ensured exchange rates always load (from API, cache, or defaults) before price conversion
- **Result**: Users can now select a currency once, and it will persist and apply automatically to all prices even after page refresh. Currency conversion is now reliable and handles all failure scenarios gracefully.

### Previous Currency Implementation (Nov 23, 2025)
- **Order Confirmation Emails**: Users receive order confirmation emails with prices displayed in their selected currency
- **Email Template Updates**: Modified email-templates.js to support currency conversion with formatCurrencyPrice function
- **Checkout Integration**: Added currency-converter script to checkout.html and updated order data to include userSelectedCurrency
- **Currency Support**: All 7 supported currencies (INR, USD, EUR, GBP, AED, CAD, AUD) now work in order emails
- **Collection Pages**: Currency conversion fully functional on new-arrivals, featured-collection, all-collection, and saree-collection pages
- **Cart & Wishlist Support**: Currency display supported across cart and checkout interfaces

### Previous Updates
- **Fixed Image Display**: Product images in inventory section (out-of-stock and low-stock) now display properly with correct opacity and aspect ratio
- **CSS Styling**: Added comprehensive styling for inventory product cards with visual differentiation for stock status
- **Video Management Caching**: Fixed "Watch & Buy Video Management" section loading with two-stage caching and parallel product fetching

## System Architecture

### Frontend
- **HTML5/CSS3**: Responsive design principles are applied using modern CSS.
- **JavaScript Modules**: Client-side code is organized into modular JavaScript for maintainability.
- **UI Components**: Reusable UI components are used for consistent product display, cart, and general user interface elements.
- **UI/UX Design**: The platform features a clean, professional aesthetic, particularly in the admin dashboard, using a specific color palette (Primary: #2563eb, Secondary: #64748b, Success: #059669, Danger: #dc2626, Background: #f8fafc) and responsive grid layouts.

### Backend
- **Serverless Functions**: Netlify Functions are utilized for API endpoints and server-side logic.
- **Local Server**: An Express.js server facilitates local development.
- **Email Service**: Nodemailer handles transactional emails.
- **Payment Processing**: Razorpay is integrated for secure payment transactions. All product prices and cart totals are stored in INR (base currency), ensuring compatibility with Razorpay's requirements.
- **Shipping Integration**: Shiprocket API manages order fulfillment, tracking, and logistics.

### Authentication & Data Storage
- **Authentication**: Firebase Authentication manages user logins and profiles.
- **Database**: Firebase Firestore stores user data, orders, and persistent cart information.
- **Product Data**: Product information, including images, is stored in Firebase Cloud Storage (project "auric-a0c92").
- **Cart Management**: A dual storage approach uses `localStorage` for guest users and Firebase for authenticated users, ensuring real-time sync and persistence.

### Key Features
- **User Management**: Includes authentication, profile management, and order history.
- **Payment Gateway**: Secure Razorpay integration with server-side validation and enhanced error handling for amount limits.
- **Currency Converter**: Real-time multi-currency display (INR, USD, EUR, GBP, AED, CAD, AUD) for user convenience. All prices are stored in INR; the converter only affects display formatting.
- **Email Notifications**: Automated order confirmations and status updates.
- **Product Management**: Supports multiple categories (e.g., featured-collection, new-arrivals, plus 12 jewelry subcategories: gold/silver/meenakari variants of necklaces, earrings, bangles, rings) with an admin panel for product upload, editing, and deletion. Products are loaded from Firebase Cloud Storage via a CDN proxy using Netlify functions.
- **Wishlist**: Users can save products to a wishlist, persisted across sessions and login states via Firebase.
- **Checkout System**: A robust checkout process handles both authenticated and guest users, with comprehensive error handling.
- **Bandwidth Optimization**: Advanced CDN caching, `stale-while-revalidate`, ETag validation, and extended client-side cache durations (24 hours memory, 1 hour `localStorage`) significantly reduce bandwidth usage.
- **Order Tracking & Fulfillment**: Full Shiprocket integration for order creation, AWB generation, pickup scheduling, and real-time tracking with a dedicated customer portal.
- **Stock Management**: Comprehensive system with `stock-manager.js` for Firebase operations, server-side updates via Netlify functions, automatic stock updates during checkout, an admin inventory dashboard with real-time alerts, and visual indicators for out-of-stock products.
- **Multi-Language Support**: A dynamic translation system uses MyMemory Translation API to support 6 languages (English, Hindi, Spanish, French, Arabic, German). It employs a hybrid approach with static UI translations and API-powered dynamic content, including automatic translation of new products, browser language detection, RTL support, and translation caching.
- **Category Pages**: Dedicated submenu category pages for various jewelry types (e.g., gold/silver/meenakari variants of necklaces, earrings, bangles, rings) with specific hero sections and dynamic product loading.
- **Admin Dashboard Caching**: Implemented localStorage-based data caching for instant dashboard display. The system loads cached orders, customers, and notifications immediately, while fresh data from Firebase loads in the background and updates the display automatically. No cache expiration—cached data is always shown instantly and fresh data always fetches in parallel.
- **Inventory Data Caching**: localStorage caching for inventory summary (out-of-stock, low stock, in-stock counts) enabling instant stat card and badge display on page load. Fresh data always fetches in the background and updates automatically. No cache expiration—always shows cached data while fetching fresh.
- **Products Management Caching**: localStorage caching for admin panel products section enables instant display of all products from all categories. Cached product data shows immediately on page load, while fresh product data fetches in the background and updates the grid automatically. No cache expiration—always shows cached data while fetching fresh.
- **Watch & Buy Video Management Caching**: Implemented two-stage loading with localStorage caching for the video management section. Cached video configurations display instantly on page load, while fresh video data loads in the background with parallel product fetching across all categories. Product searches in video features now use parallel fetching instead of sequential, significantly improving load times and eliminating the infinite "Loading..." state.

## External Dependencies

- **Payment Gateway**: Razorpay
- **Shipping Service**: Shiprocket API
- **Translation Service**: MyMemory Translation API
- **Email Service**: Gmail SMTP
- **Firebase Services**:
    - Firebase Authentication
    - Firebase Firestore
    - Firebase Cloud Storage (project "auric-a0c92")
- **Third-party Libraries**:
    - Font Awesome
    - Google Fonts (Playfair Display, Lato)
    - Firebase SDK