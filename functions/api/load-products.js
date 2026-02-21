export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const categories = url.searchParams.get('categories');
  const cacheBust = url.searchParams.get('cacheBust');
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    if (!category && !categories) {
      return new Response(JSON.stringify({
        success: false,
        products: [],
        error: 'Category parameter is required'
      }), { status: 400, headers });
    }

    const categoryList = categories ? categories.split(',').map(c => c.trim()).filter(c => c) : [category];
    
    const productPromises = categoryList.map(async (cat) => {
      const isBandwidthTest = cat.startsWith('bandwidth-test-');
      let storageUrl = isBandwidthTest 
        ? `https://firebasestorage.googleapis.com/v0/b/${env.FIREBASE_STORAGE_BUCKET || 'studio-7642357109-d9026.firebasestorage.app'}/o/bandwidthTest%2F${cat}-products.json?alt=media`
        : `https://firebasestorage.googleapis.com/v0/b/${env.FIREBASE_STORAGE_BUCKET || 'studio-7642357109-d9026.firebasestorage.app'}/o/productData%2F${cat}-products.json?alt=media`;

      if (cacheBust) storageUrl += `&fbCacheBust=${cacheBust}`;

      const response = await fetch(storageUrl);
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    });

    const productsArrays = await Promise.all(productPromises);
    const allProducts = productsArrays.flat();

    // Cloudflare specific: transform image URLs to use the image proxy if needed
    const transformedProducts = allProducts.map(p => {
      if (p.image && p.image.includes('firebasestorage.googleapis.com')) {
        p.image = `/api/image-proxy?url=${encodeURIComponent(p.image)}`;
      }
      if (p.images) {
        p.images = p.images.map(img => {
          if (img.url && img.url.includes('firebasestorage.googleapis.com')) {
            img.url = `/api/image-proxy?url=${encodeURIComponent(img.url)}`;
          }
          return img;
        });
      }
      return p;
    });

    return new Response(JSON.stringify({
      success: true,
      products: transformedProducts,
      message: `Loaded ${transformedProducts.length} products`
    }), { status: 200, headers });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), { status: 500, headers });
  }
}
