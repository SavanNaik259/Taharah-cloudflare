# Automated Notification Triggers - Implementation Guide

All 5 automated notification functions are now created and ready to use. Here's how to trigger each one:

## 1. **Abandoned Cart Notifications** 
- **Function**: `auto-abandoned-cart-check.js`
- **How to trigger**: Call daily via cron job or scheduler
- **API Endpoint**: `/.netlify/functions/auto-abandoned-cart-check`
- **Method**: GET (no body needed)
- **What it does**: Checks all users' carts, if inactive for 24+ hours and has items, sends notification with product image
- **Who gets it**: Only users who added products to cart

---

## 2. **Back-in-Stock Alerts**
- **Function**: `auto-back-in-stock-alerts.js`
- **How to trigger**: Call when product stock changes from 0 to >0
- **API Endpoint**: `/.netlify/functions/auto-back-in-stock-alerts`
- **Method**: POST
- **Body**:
```json
{
  "productId": "PNC-01",
  "productName": "Polki Necklace Collection",
  "productImage": "https://your-image-url.jpg"
}
```
- **What it does**: Sends notification only to users who have this product in cart/wishlist
- **Who gets it**: Only users with product in cart OR wishlist

---

## 3. **Price Drop Alerts**
- **Function**: `auto-price-drop-alerts.js`
- **How to trigger**: Call when product price is reduced
- **API Endpoint**: `/.netlify/functions/auto-price-drop-alerts`
- **Method**: POST
- **Body**:
```json
{
  "productId": "RBC-01",
  "productName": "Royal Bridal Collection",
  "productImage": "https://your-image-url.jpg",
  "oldPrice": 125000,
  "newPrice": 99000
}
```
- **What it does**: Calculates discount % and sends to all opted-in users
- **Who gets it**: ALL users with notifications enabled + all guest devices

---

## 4. **New Product Launch Alerts**
- **Function**: `auto-new-product-alerts.js`
- **How to trigger**: Call when new product is added to catalog
- **API Endpoint**: `/.netlify/functions/auto-new-product-alerts`
- **Method**: POST
- **Body**:
```json
{
  "productId": "NEW-001",
  "productName": "Exclusive Diamond Ring Collection",
  "productImage": "https://your-image-url.jpg"
}
```
- **What it does**: Sends announcement of new product to everyone
- **Who gets it**: ALL users with notifications enabled + all guest devices

---

## 5. **Low Stock Alerts**
- **Function**: `auto-low-stock-alerts.js`
- **How to trigger**: Call when product stock drops below threshold
- **API Endpoint**: `/.netlify/functions/auto-low-stock-alerts`
- **Method**: POST
- **Body**:
```json
{
  "productId": "CHRM-07",
  "productName": "Charm Bracelet",
  "productImage": "https://your-image-url.jpg",
  "stockRemaining": 2,
  "threshold": 3
}
```
- **What it does**: Sends alert only to users who have product in cart/wishlist
- **Who gets it**: Only users with product in cart OR wishlist

---

## Testing Each Function

### Test Abandoned Cart:
```bash
curl -X GET https://royalmeenakari.netlify.app/.netlify/functions/auto-abandoned-cart-check
```

### Test Back-in-Stock:
```bash
curl -X POST https://royalmeenakari.netlify.app/.netlify/functions/auto-back-in-stock-alerts \
  -H "Content-Type: application/json" \
  -d '{"productId":"PNC-01","productName":"Polki Necklace","productImage":"https://example.com/image.jpg"}'
```

### Test Price Drop:
```bash
curl -X POST https://royalmeenakari.netlify.app/.netlify/functions/auto-price-drop-alerts \
  -H "Content-Type: application/json" \
  -d '{"productId":"RBC-01","productName":"Royal Bridal","productImage":"https://example.com/image.jpg","oldPrice":125000,"newPrice":99000}'
```

### Test New Product:
```bash
curl -X POST https://royalmeenakari.netlify.app/.netlify/functions/auto-new-product-alerts \
  -H "Content-Type: application/json" \
  -d '{"productId":"NEW-001","productName":"New Collection","productImage":"https://example.com/image.jpg"}'
```

### Test Low Stock:
```bash
curl -X POST https://royalmeenakari.netlify.app/.netlify/functions/auto-low-stock-alerts \
  -H "Content-Type: application/json" \
  -d '{"productId":"CHRM-07","productName":"Charm","productImage":"https://example.com/image.jpg","stockRemaining":2,"threshold":3}'
```

---

## Integration with Your Systems

### Where to Call These Functions:

1. **Abandoned Cart** → Call daily from your backend scheduling service (cron job, CloudTask, etc.)
2. **Back-in-Stock** → Call from your product update service when stock becomes available
3. **Price Drop** → Call from your price update service when price is reduced
4. **New Product** → Call from your product upload/creation service
5. **Low Stock** → Call from your inventory management system when stock threshold reached

### Example Integration in Backend:
```javascript
// When updating product stock
async function updateProductStock(productId, newStock, oldStock) {
  // Update your database...
  
  // If came from 0 to available
  if (oldStock === 0 && newStock > 0) {
    await fetch('/.netlify/functions/auto-back-in-stock-alerts', {
      method: 'POST',
      body: JSON.stringify({
        productId,
        productName: product.name,
        productImage: product.image
      })
    });
  }
  
  // If dropped below threshold
  if (newStock <= 3) {
    await fetch('/.netlify/functions/auto-low-stock-alerts', {
      method: 'POST',
      body: JSON.stringify({
        productId,
        productName: product.name,
        productImage: product.image,
        stockRemaining: newStock,
        threshold: 3
      })
    });
  }
}
```

---

## Features of Each Function

✅ **Abandoned Cart**: Uses product image from user's cart, sends within 24hrs
✅ **Back-in-Stock**: Only targets wishlist/cart users, shows product image
✅ **Price Drop**: Calculates discount %, sends to everyone, shows discount info
✅ **New Product**: Sends to all opted-in users with product image
✅ **Low Stock**: Targets only interested users (cart/wishlist)

All functions:
- Use real FCM tokens from Firestore
- Send with product images
- Include action buttons for CTAs
- Log all sent/failed counts
- Handle errors gracefully
