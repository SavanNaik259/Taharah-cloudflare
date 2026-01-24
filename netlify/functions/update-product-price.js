/**
 * Netlify Function: Update Product Price
 * Updates product price and triggers price-drop notifications
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
  try {
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID || "auric-a0c92",
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || "067bc566a907eeca7ae57d98ec6ba463385b2617",
      private_key: (process.env.FIREBASE_PRIVATE_KEY || `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCW1inMXQEJA7c1\nzhYaXL6CIKmSpDcftI6l/tQ33Z0eIPCqACgb3X0uNOm0G8Bquz9Y5n13FLBOU4oH\n+J/BD0kt16VcYG5oxLQVa9xZVVujDM1C7KzFw4ZQztMkYhjjJo5gPrNKpSsT85rx\n8LjU1doGvk/5K1sWS83jeobGtR35PTtQwAG/aOxzm0c48fj4l5/f618UbTpHyUsZ\nG9tklU7RYTTFYELss+PEcGKTQTSrh/RSMug4GaLqbWsOu+AkJaCZGAsTwMc3yLcC\nTAUZCjR104W+WdR3sc5EVh3Dd54pXGeHIWlgyJhiqPWw09lyQ8rJBWfSKYlzJkpe\nbvb879J7AgMBAAECggEAPBpGOXptqSvj2vqtb/+4oZ1mNFpe5LFLjfVGlqQlsRWr\nD/JUCRZuhPTskqnkOCM4kLH3GHYT8oHzJE37SjBPFocxCugZ1oFayJZcDPSoOQYm\n3B32ki7g3F4tX/f+trRsUwlo47uAuMh+2xzyaUx1Pe6ja0PNXcsC1TvDbHZK5T7W\nO+SBvh9RNmmFsqL5eeRdr4t3NPKDHgQ+P49gevkpAzNHcUm4oQt+orniXYcWfAwl\nJtcCla7LSFrAsW89pITcbnTQSadqUXF6LP68NY5xVfZxWBuO+ajVRvpGofZMlkuo\nz8p1JIt7KLnhBdwkQutI4Zll1wZCBcPydX4EC0wd8QKBgQDIbkgjHzSkvHJHLe1X\nY6LxRJmnvXXvP2RKsRDDtHPq0u/JTjHVfeH7Y4546MQX+9/11XEzMX85JUBa/kza\nfCBuT88SYZeEJknpLhUl5IEKg5K9QkRlLimi1saSN/WGBzk7ZP4tslXD632JkDZS\n6ASYYTe8TDXuF8If/CBjhHdU/wKBgQDAp+WXHYR/BxGCvMM5K2qZRqDNACvlcnia\n9xNEmkrgtNGBEPFGrulwP4vtodkBwWnUiipzKUr6eS520baxO9jgdMJ7+bUnTB7L\peUuGSixIMf0wBvf5OT6FKZ9A6qTc49jd8QD/Vaei8kKS1iCkbOkEwrd7VC1BX8G\nKDBoDJ1WhQKBgQC6aifZ0rpJxaOcJFEtCFSShbVL1+EKhjEnbwwimYF+lHXFC186\nK3y1LWFjf0py7CbfJIfGj3C+m7EBcKfWRcB8GOqFNBOSK3Ju2Bd/SMnkF3+xWyL1\n4DuFYrEJadaHs8w9O69UnRs7v5jhCyobbgRoHXOTRGacbah1yy/sn1XFzQKBgAPX\nlVmVKh5Kasv7rb0HI6IY6X4NIdL6nHMiuEym8xVWJdN4Hge110v4yHadwrEpRU4K\nz1vql+c04XtXJViVg/a9/V7xlO5Ks1aGYXKw58HYkIRODIBDlVlzbfqSRyWXqWVn\nbw5RUBfrW8ALzqET/Mwp4Q6Z/AEQMf9Sb9yzW7PtAoGAJilwi+vA0pNGNlOuKYLj\n8XPYZqktbxs99N0LFPbSIVsVeHwVhoi+KPKgMHuFrQZA22IYJ01acD/LYim3Fi+X\nUD//owCkNu22xWl2SNoBVO3htsGuwokolPBt/MA8mGG+SDR7JJbeDxesfzUWTxHb\nPNWi5ETLiI2OCy1JSmPGq9k=\n-----END PRIVATE KEY-----\n`).replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-fbsvc@auric-a0c92.iam.gserviceaccount.com",
      client_id: process.env.FIREBASE_CLIENT_ID || "112489649638932528471",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CERT_URL || "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40auric-a0c92.iam.gserviceaccount.com"
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "auric-a0c92.firebasestorage.app"
    });

    console.log('Firebase Admin initialized for price updates');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, message: 'Method not allowed' })
    };
  }

  try {
    const { category, products, productId, oldPrice, newPrice } = JSON.parse(event.body);

    if (!category || !products || !productId || !oldPrice || !newPrice) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Missing required fields: category, products, productId, oldPrice, newPrice'
        })
      };
    }

    console.log(`Updating price for product ${productId} in category ${category}`);
    console.log(`Price change: ₹${oldPrice} -> ₹${newPrice}`);

    // Update product data in Firebase Storage
    const bucket = admin.storage().bucket();
    const filePath = `productData/${category}-products.json`;
    const file = bucket.file(filePath);

    const updatedData = JSON.stringify(products, null, 2);
    
    await file.save(updatedData, {
      metadata: {
        contentType: 'application/json',
        cacheControl: 'public, max-age=2592000',
        customMetadata: {
          lastPriceUpdate: new Date().toISOString(),
          updatedProduct: productId,
          priceChange: `${oldPrice}->${newPrice}`
        }
      }
    });

    console.log(`Successfully updated ${category} products file with new price for ${productId}`);

    // ✅ TRIGGER PRICE DROP NOTIFICATION (ONLY if price decreased)
    console.log(`\n🔔 PRICE UPDATE TRIGGER FIRED`);
    console.log(`   Product: ${productId}`);
    console.log(`   Price: ₹${oldPrice} → ₹${newPrice}`);
    
    if (newPrice < oldPrice) {
      try {
        const updatedProduct = products.find(p => p.id === productId || p.productId === productId);
        
        console.log(`   Product details found:`, !!updatedProduct);
        
        if (updatedProduct) {
          console.log(`\n📉 PRICE-DROP CONDITION MET - Calling automation function...`);
          console.log(`   Product name: ${updatedProduct.name || updatedProduct.productName}`);
          console.log(`   Discount: ${Math.round(((oldPrice - newPrice) / oldPrice) * 100)}%`);
          
          const priceDropResponse = await fetch('https://royalmeenakari.netlify.app/.netlify/functions/auto-price-drop-alerts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: productId,
              productName: updatedProduct.name || updatedProduct.productName,
              productImage: updatedProduct.image || updatedProduct.productImage || '',
              oldPrice: oldPrice,
              newPrice: newPrice
            })
          });
          
          const priceDropData = await priceDropResponse.json();
          console.log(`✅ Price-drop function response:`, priceDropData);
        } else {
          console.log(`❌ CRITICAL: Product details not found in products array`);
        }
      } catch (notifError) {
        console.error('Error sending price-drop notification:', notifError.message);
        // Don't fail the main operation
      }
    } else {
      console.log(`ℹ️ Price increase (not a price drop), no notification sent`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Price updated successfully for product ${productId}`,
        productId: productId,
        oldPrice: oldPrice,
        newPrice: newPrice,
        notificationSent: newPrice < oldPrice,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Error updating product price:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: `Failed to update product price: ${error.message}`,
        timestamp: new Date().toISOString()
      })
    };
  }
};
