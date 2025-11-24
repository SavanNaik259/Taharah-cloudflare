# Auric Jewelry E-commerce Platform

## Overview
Auric is a premium e-commerce platform for jewelry, offering a seamless online shopping experience. It includes user authentication, cart management, wishlist functionality, multi-currency support (INR base with USD, EUR, GBP, AED, CAD, AUD), order processing, and email notifications. The platform aims to provide a modern interface for browsing and purchasing jewelry, featuring advanced stock management, multi-language support, and integrated shipping. Its business vision is to capture a significant share of the online luxury jewelry market by providing a reliable, feature-rich, and user-friendly platform.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (Nov 24, 2025)

### CRITICAL FIX: First-Visit Welcome Banner Image Responsive Scaling (v3.6.4 ✅ COMPLETE)

**THE REAL ISSUE - Found After Comprehensive Line-by-Line Code Analysis**

User reported: Images not reducing on screen size, welcome text hidden, object-fit covering content.

**Root Cause (Technical Deep-Dive)**:
The banner uses flexbox layout but had a CSS-level constraint issue:
```css
.first-visit-modal-content {
    max-height: 85vh;    /* Only max-height, NO explicit height */
    display: flex;
    flex-direction: column;
}

.first-visit-banner-image {
    height: 50%;         /* 50% of WHAT? */
    flex-shrink: 0;      /* Prevents flex from shrinking */
}
```

The problem: **In a flex container with only `max-height` (no `height`), percentage heights on children DON'T calculate correctly**. The browser couldn't determine what 50% meant, so:
- ❌ Image didn't scale to 50% as intended
- ❌ Image stayed full natural size
- ❌ Text got hidden below/under the oversized image
- ❌ `flex-shrink: 0` prevented any shrinking

**Complete Solution (v3.6.4)**:
Changed from `height: 50%` to `flex: 0 0 50%` (flex-basis percentage) across all breakpoints.

**Why This Works**:
- `flex-basis` works correctly in flex containers even without explicit parent height
- `0 0 50%` means: don't grow (0), don't shrink (0), basis is 50% of available space
- Browser now correctly calculates image height = 50% of container, text = remaining 50%

**All Changes (4 locations in css/first-visit-banner.css)**:
1. **Line 62** - Desktop: `flex: 0 0 50%` (was `height: 50%`)
2. **Line 140** - Tablets (≤768px): `flex: 0 0 45%` (was `height: 45%`)
3. **Line 173** - Small phones (≤480px): `flex: 0 0 40%` (was `height: 40%`)
4. **Line 203** - Landscape (height ≤600px): `flex: 0 0 35%` (was `height: 35%`)

**Result**:
- ✅ Image scales to exact percentage of modal on all screen sizes
- ✅ Text section always visible (takes remaining flex space)
- ✅ Responsive without hidden content
- ✅ Works across all devices (desktop/tablet/phone/landscape)

---

### COMPREHENSIVE FIX: Cart & Checkout Currency Conversion (v3.5.0 ✅ COMPLETE)

**BOTH BUGS FIXED - Root Cause: Missing Currency Conversion in Display**

The issue was NOT in how prices were stored - that was working perfectly. The issue was in HOW PRICES WERE DISPLAYED in the UI without currency conversion applied.

**Root Cause Analysis**:
- Cart stores original INR prices ✅ (e.g., 25000 for $280 product)
- Checkout stores original INR prices ✅
- **BUT**: When displaying, prices were shown as raw INR with current currency symbol
  - Result: 25000 INR displayed as $25,000.00 instead of $280.00 ❌

**Complete Solution (v3.5.0)**:

**Part 1: Fixed cart-manager.js (Lines 719-738 & 778-816)**
- Added currency conversion to cart item display (line 787): converts INR → current currency
- Added currency conversion to cart totals (lines 724-732): converts INR total → display total
- Implementation:
  ```javascript
  itemPriceDisplay = window.CurrencyConverter.convertPrice(item.price);
  totalDisplay = window.CurrencyConverter.convertPrice(totalINR);
  ```

**Part 2: Fixed checkout-script-simplified.js (Lines 577-607 & 609-632)**
- Added currency conversion to item subtotals (lines 589-596): converts INR subtotal → display subtotal
- Added currency conversion to order total (lines 613-631): converts INR total → display total
- Implementation:
  ```javascript
  itemTotalDisplay = window.CurrencyConverter.convertPrice(itemTotal);
  totalDisplay = window.CurrencyConverter.convertPrice(total);
  ```

**Data Flow (v3.5.0 - VERIFIED)**:
1. Product: 25000 INR (original price) ✅
2. Cart stores: 25000 INR (unchanged) ✅
3. Display formula: `convertPrice(25000) × USD_RATE` = 280 ✅
4. Cart displays: **$280.00 USD** ✅ (was $25,000.00 ❌)
5. Checkout displays: **$280.00 USD** ✅

**Works Across All Currencies**:
- INR: ₹25,000
- USD: $280
- EUR: €230
- GBP: £195
- AED: د.إ 1,000
- CAD: $385
- AUD: $435

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
  - **CRITICAL**: All prices stored in original INR, converted only for DISPLAY
  - Display conversion applied consistently across: product pages, cart, checkout, wishlist
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
