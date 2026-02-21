export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const categories = url.searchParams.get('categories');
  const cacheBust = url.searchParams.get('cacheBust');

  const headers = {
    ...import('./utils/config').then(m => m.corsHeaders),
    'Content-Type': 'application/json'
  };

  if (!category && !categories) {
    return new Response(JSON.stringify({
      success: false,
      products: [],
      error: 'Category parameter is required'
    }), { status: 400, headers });
  }

  try {
    const bucket = env.FIREBASE_STORAGE_BUCKET;
    const baseUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/`;
    
    let allProducts = [];
    const categoryList = categories ? categories.split(',') : [category];

    for (const cat of categoryList) {
      const path = cat.startsWith('bandwidth-test-') ? `bandwidthTest%2F${cat}-products.json` : `productData%2F${cat}-products.json`;
      let storageUrl = `${baseUrl}${path}?alt=media`;
      if (cacheBust) storageUrl += `&fbCacheBust=${cacheBust}`;

      const res = await fetch(storageUrl);
      if (res.ok) {
        const data = await res.json();
        allProducts = allProducts.concat(data);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      products: allProducts,
      message: `Loaded ${allProducts.length} products`
    }), { status: 200, headers });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), { status: 500, headers });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    }
  });
}
