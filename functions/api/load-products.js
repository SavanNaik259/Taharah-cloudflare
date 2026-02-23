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

        // 1. If it's already a direct Firebase URL, ensure it has alt=media
        if (u.includes('firebasestorage.googleapis.com')) {
          if (!u.includes('alt=media')) {
            return u.includes('?') ? `${u}&alt=media` : `${u}?alt=media`;
          }
          return u;
        }

        // 2. If it's already a proxy URL, keep it as is
        if (u.startsWith('/api/image-proxy')) {
          return u;
        }

        // 3. Handle relative paths
        const cleanPath = u.startsWith('/') ? u.substring(1) : u;
        const finalPath = cleanPath.includes('/') ? cleanPath : `productImages/${cleanPath}`;
        
        // Use encodeURIComponent for the path part, but keep the folder structure
        const encodedPath = finalPath.split('/').map(part => encodeURIComponent(part)).join('%2F');
        
        return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
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
