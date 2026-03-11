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
- **Dashboard Caching:** localStorage with 1-hour TTL; shows cached data instantly, background refresh after 5s if cache is fresh
- **Static File Caching:** `_headers` file with `no-cache, no-store` for all assets to ensure instant updates on Cloudflare Pages
