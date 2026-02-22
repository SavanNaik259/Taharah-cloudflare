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
    const categoryList = categories ? categories.split(',').map(c => c.trim()).filter(c => c) : [category];
    if (categoryList.length === 0 || !categoryList[0]) {
       return new Response(JSON.stringify({ success: false, products: [], error: 'Category required' }), { status: 400, headers });
    }

    const storageBucket = env.FIREBASE_STORAGE_BUCKET || 'studio-7642357109-d9026.firebasestorage.app';
    
    const productPromises = categoryList.map(async (cat) => {
      const isBandwidthTest = cat.startsWith('bandwidth-test-');
      let storageUrl = isBandwidthTest 
        ? `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/bandwidthTest%2F${cat}-products.json?alt=media`
        : `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/productData%2F${cat}-products.json?alt=media`;

      if (cacheBust) storageUrl += `&fbCacheBust=${cacheBust}`;

      const response = await fetch(storageUrl);
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    });

    const productsArrays = await Promise.all(productPromises);
    const allProducts = productsArrays.flat();

    const transformedProducts = allProducts.map(p => {
      const proxyUrl = (u) => {
        if (u && (u.includes('firebasestorage.googleapis.com') || u.includes('googleusercontent.com'))) {
          // Use relative path for production
          return `/api/image-proxy?url=${encodeURIComponent(u)}`;
        }
        return u;
      };

      if (p.image) p.image = proxyUrl(p.image);
      if (p.mainImage) p.mainImage = proxyUrl(p.mainImage);
      if (p.imageUrl) p.imageUrl = proxyUrl(p.imageUrl);
      
      if (p.images && Array.isArray(p.images)) {
        p.images = p.images.map(img => {
          if (typeof img === 'string') return proxyUrl(img);
          if (img && img.url) {
            img.url = proxyUrl(img.url);
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
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers });
  }
}
