export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const categories = url.searchParams.get('categories') || url.searchParams.get('category');
  const cacheBust = url.searchParams.get('cacheBust');
  const ifNoneMatch = request.headers.get('If-None-Match');
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    if (!categories) {
       return new Response(JSON.stringify({ success: false, error: 'Category required' }), { status: 400, headers });
    }

    const categoryList = categories.split(',').map(c => c.trim()).filter(c => c);
    const storageBucket = env.FIREBASE_STORAGE_BUCKET || 'studio-7642357109-d9026.firebasestorage.app';
    
    const productPromises = categoryList.map(async (cat) => {
      const storageUrl = `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/productData%2F${cat}-products.json?alt=media`;
      const response = await fetch(storageUrl);
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    });

    const productsArrays = await Promise.all(productPromises);
    const allProducts = productsArrays.flat();

    const transformedProducts = allProducts.map(p => {
      const transformUrl = (u) => {
        if (!u || typeof u !== 'string') return u;
        const extractStoragePath = (input) => {
          if (!input || typeof input !== 'string') return '';
          let s = input;
          try {
            if (s.includes('image-proxy')) {
              const u = new URL(s, 'https://dummy');
              const p = u.searchParams.get('path') || u.searchParams.get('url');
              if (p) s = decodeURIComponent(p);
            }
          } catch (e) {}
          if (s.includes('firebasestorage.googleapis.com')) {
            const m = s.match(/\/o\/([^?]+)/);
            if (m) s = decodeURIComponent(m[1]);
          }
          try { s = decodeURIComponent(s); } catch (e) {}
          s = s.startsWith('/') ? s.slice(1) : s;
          if (!s.startsWith('productImages/')) {
            s = `productImages/${s.replace(/^productImages\//, '')}`;
          }
          return s;
        };
        const cleanPath = extractStoragePath(u);
        return `/api/image-proxy?url=${encodeURIComponent(cleanPath)}`;
      };

      const newP = { ...p };
      if (newP.image) newP.image = transformUrl(newP.image);
      if (newP.mainImage) newP.mainImage = transformUrl(newP.mainImage);
      if (newP.imageUrl) newP.imageUrl = transformUrl(newP.imageUrl);
      if (newP.images && Array.isArray(newP.images)) {
        newP.images = newP.images.map(img => {
          if (typeof img === 'string') return transformUrl(img);
          if (img && typeof img === 'object' && img.url) {
            return { ...img, url: transformUrl(img.url) };
          }
          return img;
        });
      }
      return newP;
    });

    const body = JSON.stringify({
      success: true,
      products: transformedProducts,
      count: transformedProducts.length
    });

    // Simple hash for ETag
    const etag = `"${btoa(body).substring(0, 20)}"`;

    if (!cacheBust && ifNoneMatch === etag) {
      return new Response(null, { status: 304, headers: { ...headers, 'ETag': etag } });
    }

    const responseHeaders = { ...headers, 'ETag': etag };
    if (cacheBust) {
      responseHeaders['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      responseHeaders['Pragma'] = 'no-cache';
      responseHeaders['Expires'] = '0';
    } else {
      responseHeaders['Cache-Control'] = 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400';
    }

    return new Response(body, { status: 200, headers: responseHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers });
  }
}
