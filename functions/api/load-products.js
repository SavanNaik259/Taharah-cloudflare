export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const categories = url.searchParams.get('categories') || url.searchParams.get('category');
  
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
        if (!u) return u;
        
        // Handle legacy Netlify proxy paths in the database
        if (typeof u === 'string' && u.includes('/.netlify/functions/image-proxy')) {
          try {
            const urlObj = new URL(u, 'http://localhost');
            const pathParam = urlObj.searchParams.get('path');
            if (pathParam) {
              const newUrl = `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/${encodeURIComponent(pathParam)}?alt=media`;
              return `/api/image-proxy?url=${encodeURIComponent(newUrl)}`;
            }
          } catch (e) {
            console.error('URL parse error:', e);
          }
        }
        
        // Handle direct Firebase URLs
        if (typeof u === 'string' && u.includes('firebasestorage.googleapis.com')) {
          return `/api/image-proxy?url=${encodeURIComponent(u)}`;
        }
        
        return u;
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
