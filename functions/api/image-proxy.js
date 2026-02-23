export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const imageUrl = url.searchParams.get('url');

  if (!imageUrl) {
    return new Response('Missing URL parameter', { status: 400 });
  }

  try {
    let decodedUrl = decodeURIComponent(imageUrl);
    
    // If it's a relative path, convert to direct Firebase URL
    if (!decodedUrl.startsWith('http')) {
      const bucket = env.FIREBASE_STORAGE_BUCKET || 'studio-7642357109-d9026.firebasestorage.app';
      const cleanPath = decodedUrl.startsWith('/') ? decodedUrl.substring(1) : decodedUrl;
      
      // If the path doesn't contain a slash, it's likely just a filename that needs productImages/
      const finalPath = (cleanPath.includes('/') || cleanPath.startsWith('productImages')) ? cleanPath : `productImages/${cleanPath}`;
      
      const encodedPath = finalPath.split('/').map(part => encodeURIComponent(part)).join('%2F');
      decodedUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
    }

    // Ensure it's a firebase URL we are fetching
    if (decodedUrl.includes('firebasestorage.googleapis.com') && !decodedUrl.includes('alt=media')) {
      decodedUrl += (decodedUrl.includes('?') ? '&' : '?') + 'alt=media';
    }
    
    const response = await fetch(decodedUrl, {
      method: 'GET',
      headers: {
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      // If proxy fails, redirect user directly to the source
      return Response.redirect(decodedUrl, 302);
    }

    const contentType = response.headers.get('content-type');
    const imageBuffer = await response.arrayBuffer();

    const newHeaders = new Headers();
    newHeaders.set('Content-Type', contentType || 'image/jpeg');
    newHeaders.set('Cache-Control', 'public, max-age=31536000');
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Vary', 'Accept');

    return new Response(imageBuffer, {
      status: 200,
      headers: newHeaders
    });
  } catch (error) {
    try {
      return Response.redirect(decodeURIComponent(imageUrl), 302);
    } catch (e) {
      return new Response(`Error: ${error.message}`, { status: 500 });
    }
  }
}
