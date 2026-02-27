export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const categories = url.searchParams.get('categories') || url.searchParams.get('category');
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=604800'
  };

  try {
    if (!categories) {
       return new Response(JSON.stringify({ success: false, error: 'Category required' }), { status: 400, headers });
    }

    const categoryList = categories.split(',').map(c => c.trim()).filter(c => c);
    const storageBucket = env.FIREBASE_STORAGE_BUCKET || 'studio-7642357109-d9026.firebasestorage.app';
    console.log('Using storage bucket:', storageBucket);
    
    const productPromises = categoryList.map(async (cat) => {
      // Use direct Firebase Storage JSON URL
      const storageUrl = `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/productData%2F${cat}-products.json?alt=media`;
      console.log('Fetching category from:', storageUrl);
      const response = await fetch(storageUrl);
      if (!response.ok) {
        console.error(`Failed to fetch ${cat}: ${response.status}`);
        return [];
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    });

    const productsArrays = await Promise.all(productPromises);
    const allProducts = productsArrays.flat();

    const transformedProducts = allProducts.map(p => {
      const transformUrl = (u) => {
        if (!u || typeof u !== 'string') return u;
        
        // Normalize any image URL to a clean Firebase storage path
        const extractStoragePath = (input) => {
          if (!input || typeof input !== 'string') return '';
          let s = input;

          // If wrapped in proxy (netlify or cloudflare)
          try {
            if (s.includes('image-proxy')) {
              const u = new URL(s, 'https://dummy');
              const p = u.searchParams.get('path') || u.searchParams.get('url');
              if (p) s = decodeURIComponent(p);
            }
          } catch (e) {}

          // If full Firebase URL
          if (s.includes('firebasestorage.googleapis.com')) {
            const m = s.match(/\/o\/([^?]+)/);
            if (m) s = decodeURIComponent(m[1]);
          }

          // Decode any leftover %2F
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

      // Deep copy to avoid mutation issues if needed, but here we just map
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

    return new Response(JSON.stringify({
      success: true,
      products: transformedProducts,
      count: transformedProducts.length
    }), { status: 200, headers });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers });
  }
}
