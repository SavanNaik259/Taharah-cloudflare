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
- **Video Proxy:** `/api/proxy-video` for CDN caching of Firebase Storage videos.
