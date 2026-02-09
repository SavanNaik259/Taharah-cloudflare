# Royal Meenakari: Category Rebranding Guide

This guide explains how to rebrand category names in the Royal Meenakari platform (e.g., changing "Featured Collection" to "Ready to Wear") without breaking the backend data structures, Firebase collections, or automated systems.

## Core Principle: UI Mapping vs. Backend Data

The most important rule is: **Never change the internal category IDs.** 

The backend (Firebase, Netlify Functions) uses specific strings (IDs) to identify collections. If you change these IDs in the database, the website will lose access to all products in that category. Instead, we use **UI Mapping** to change how these IDs appear to users.

### Internal IDs (DO NOT CHANGE)
- `featured-collection`
- `new-arrivals`
- `saree-collection`
- `gold-necklace`, `silver-necklace`, etc.

---

## Step-by-Step Rebranding Process

### 1. Update Navigation and Static Text
Locate every HTML file where the category name is displayed in the menu, headings, or links.
- **Files**: `index.html`, `admin-panel.html`, `ready-to-wear.html`, `navbar.html` (if exists).
- **Action**: Change the text label from "Featured Collection" to "Ready to Wear".
- **Safety**: Ensure the `href` links still point to the correct files (e.g., `ready-to-wear.html` or `all-collection-t.html?category=featured-collection`).

### 2. Update Admin Display Logic
The admin panel often pulls category names directly from the database. You must intercept this in the JavaScript.

**Example Pattern:**
```javascript
// Before
const categoryName = product.category;

// After (Safe Rebranding)
let categoryDisplay = product.category;
if (categoryDisplay === 'featured-collection') {
    categoryDisplay = 'Ready to Wear';
}
```

**Key Admin Locations:**
- `admin-panel.html`: Product listing tables and inventory views.
- `products-admin-panel.html`: Dropdown menus, form headers, and success messages.

### 3. Update SKU Generation
If the category name change should reflect in the product ID (SKU), update the generation logic but keep the mapping to the original ID.

**File**: `products-admin-panel.html`
```javascript
const prefix = category === 'featured-collection' ? 'RTW' : category.substring(0, 3).toUpperCase();
```

### 4. Maintain Filenames and URL Parameters
Even if the category is now "Ready to Wear", keep using `featured-collection` in URL parameters so the existing logic continues to work.
- **Correct**: `site.com/all-collection-t.html?category=featured-collection`
- **Avoid**: Changing the URL parameter to `?category=ready-to-wear` unless you also update every single backend script.

---

## User's Manual Changes (History)

The following manual changes were performed to implement the "Ready to Wear" branding:

1.  **Section Renaming**: Updated `index.html` section headings and descriptions.
2.  **File Renaming**: Renamed the specific landing page for this category to `ready-to-wear.html`.
3.  **Admin Options**: Modified the category dropdown in `products-admin-panel.html` to show "Ready to Wear" while keeping the value as `featured-collection`.
4.  **Inventory UI**: In `admin-panel.html`, updated the "Out of Stock", "Low Stock", and "All Products" lists to conditionally display "Ready to Wear".
5.  **Edit Forms**: Updated the dynamic headers in the product editor to say "Editing Ready to Wear Product" when the category ID is `featured-collection`.
6.  **SKU Branding**: Updated the SKU prefix from "FEA" to "RTW" for products created under the featured collection.

---

## Troubleshooting

- **Products disappeared?** Check if you accidentally changed a `value="featured-collection"` to `value="Ready to Wear"` in a `<select>` or `fetch` call.
- **Images not loading?** Ensure the storage paths (which use the internal IDs) weren't renamed.
- **Search not working?** Search logic usually filters by the internal ID; ensure the filter buttons still pass the correct ID to the search function.
