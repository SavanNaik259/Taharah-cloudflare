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
        
        const bucket = env.FIREBASE_STORAGE_BUCKET || 'studio-7642357109-d9026.firebasestorage.app';

        // 1. If it's already a direct Firebase URL, return it as is
        if (u.includes('firebasestorage.googleapis.com')) {
          return u;
        }

        // 2. If it's already a proxy URL, extract the direct URL
        if (u.startsWith('/api/image-proxy')) {
          try {
            const urlObj = new URL(u, 'https://dummy');
            const extractedUrl = urlObj.searchParams.get('url') || urlObj.searchParams.get('path');
            if (extractedUrl) {
               if (extractedUrl.startsWith('http')) return extractedUrl;
               const cleanPath = extractedUrl.startsWith('/') ? extractedUrl.substring(1) : extractedUrl;
               return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(cleanPath)}?alt=media`;
            }
          } catch (e) {}
        }

        // 3. Handle relative paths (do not force productImages/ if it might already be there)
        const cleanPath = u.startsWith('/') ? u.substring(1) : u;
        
        // If the path doesn't contain a slash, it's likely just a filename that needs productImages/
        // If it already has a folder structure, keep it as is.
        const finalPath = cleanPath.includes('/') ? cleanPath : `productImages/${cleanPath}`;
        
        return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(finalPath)}?alt=media`;
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
