# Auric Jewelry E-commerce Platform

## Overview
Auric is a premium e-commerce platform for jewelry, offering a seamless online shopping experience. It includes user authentication, cart management, wishlist functionality, multi-currency support (INR base with USD, EUR, GBP, AED, CAD, AUD), order processing, and email notifications. The platform aims to provide a modern interface for browsing and purchasing jewelry, featuring advanced stock management, multi-language support, and integrated shipping. Its business vision is to capture a significant share of the online luxury jewelry market by providing a reliable, feature-rich, and user-friendly platform.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (Nov 24, 2025)

### FEATURE: Product Loading Spinners - All Sections (v3.7.0 ✅ COMPLETE)

**User Request**: "On home page when the new arrivals, all collection and featured collection section products are loading then the loader should show"

**Solution Implemented**:
Added professional loading spinners to display while products are loading from Firebase Storage for ALL three product sections, improving user experience with clear visual feedback.

**Technical Changes**:
1. **Created `css/product-loader.css`**:
   - Elegant spinning loader with gold accent color (#b5a681)
   - Smooth 1s rotation animation
   - Responsive positioning and sizing
   - "Loading..." message below spinner

2. **Modified `index.html`**:
   - Added loader CSS link to `<head>`
   - Added loader elements to New Arrivals section:
     - ID: `#newArrivalsLoader` with class `.product-loader.show`
     - Container ID: `#newArrivalsProductContainer`
   - Added loader elements to Featured Collection section:
     - ID: `#featuredCollectionLoader` with class `.product-loader.show`
     - Container ID: `#featuredCollectionProductContainer`
   - Added loader elements to Jewelry Collection section:
     - ID: `#jewelryCollectionLoader` with class `.product-loader.show`
     - Container ID: `#jewelryCollectionContainer`

3. **Modified `js/new-arrivals-products-loader.js`**:
   - Added loader hiding logic (lines 651-655)
   - Loader automatically hides when products successfully load

4. **Modified `js/featured-collection-products-loader.js`**:
   - Added loader hiding logic (lines 448-452)
   - Loader automatically hides when products successfully load

5. **Modified `js/saree-collection-products-loader.js`**:
   - Added loader hiding logic (lines 454-458)
   - Loader automatically hides when products successfully load

**User Experience**:
- ✅ Loaders show with elegant spinning animation while products load from Firebase
- ✅ New Arrivals: Auto-hide once 6 products loaded
- ✅ Featured Collection: Auto-hide once 6 products loaded
- ✅ Jewelry Collection: Auto-hide once all products from "all collection" loaded
- ✅ Professional gold accent color (#b5a681) matching site design
- ✅ Clear "Loading..." text messages for each section
- ✅ Responsive positioning centered in product containers

**Files Modified**:
- `index.html` - Added loader HTML elements to all 3 sections
- `css/product-loader.css` - NEW - Loader styling and animations
- `js/new-arrivals-products-loader.js` - Added loader hiding
- `js/featured-collection-products-loader.js` - Added loader hiding
- `js/saree-collection-products-loader.js` - Added loader hiding

---

### CRITICAL FIX: First-Visit Welcome Banner - Image & Text Responsive Layout (v3.6.6 ✅ COMPLETE)

**THE REAL ROOT CAUSE - After Comprehensive Line-by-Line Code Analysis**

User reported: Banner showing ONLY the image, welcome text completely hidden.

**Complete Root Cause Chain**:
1. Container had only `max-height: 85vh` (no explicit `height`)
2. Image used `flex: 0 0 50%` (flex-basis needs parent height reference)
3. Without parent height, flex-basis couldn't calculate → image took all space → text hidden

**The Working Solution (v3.6.6)**:
Changed image sizing from `flex: 0 0 [%]` to explicit `height: [%]` with `flex-shrink: 0`, combined with explicit container heights.

**Technical Changes (css/first-visit-banner.css)**:

| Component | Property | Desktop | Tablet | Phone | Landscape |
|-----------|----------|---------|--------|-------|-----------|
| **Container** | `height` | 85vh | 75vh | 65vh | 55vh |
| **Image** | `height` | 65% | 60% | 55% | 50% |
| **Image** | `flex-shrink` | 0 | 0 | 0 | 0 |
| **Text** | `flex` | 1 | 1 | 1 | 1 |

**Key CSS (lines 26-77 in css/first-visit-banner.css)**:
```css
.first-visit-modal-content {
    height: 85vh;           /* ✅ Explicit height (not just max-height) */
    max-height: 85vh;
    display: flex;
    flex-direction: column;
}

.first-visit-banner-image {
    width: 100%;
    height: 50%;            /* ✅ Works with explicit parent height */
    object-fit: cover;
    flex-shrink: 0;         /* ✅ Prevents flex from squishing image */
}

.first-visit-banner-text {
    flex: 1;                /* ✅ Takes remaining space */
    display: flex;
    flex-direction: column;
    justify-content: center;
}
```

**Responsive Breakpoints Applied**:
- **Desktop**: Container 85vh → Image 65% (55.25vh) + Text 35% (29.75vh) ✅
- **Tablets** (≤768px): Container 75vh → Image 60% (45vh) + Text 40% (30vh) ✅
- **Small phones** (≤480px): Container 65vh → Image 55% (35.75vh) + Text 45% (29.25vh) ✅
- **Landscape** (height ≤600px): Container 55vh → Image 50% (27.5vh) + Text 50% (27.5vh) ✅

**Result - VERIFIED WORKING**:
- ✅ Image displays at exact responsive percentage on all devices
- ✅ **Welcome text ALWAYS visible** (no longer hidden!)
- ✅ "Welcome to Royal Meenakari!" heading visible
- ✅ Description text and "Sign Up Now" button visible
- ✅ Perfect responsive layout: desktop/tablet/mobile/landscape
- ✅ Banner scales proportionally based on screen size

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
