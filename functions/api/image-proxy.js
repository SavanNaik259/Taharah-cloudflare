export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const imageUrl = url.searchParams.get('url');

  if (!imageUrl) {
    return new Response('Missing URL parameter', { status: 400 });
  }

  try {
    const decodedUrl = decodeURIComponent(imageUrl);
    console.log(`[Proxy] Fetching image from: ${decodedUrl}`);

    // Headers to look like a real browser request to avoid blocking
    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9'
    };

    const response = await fetch(decodedUrl, {
      headers: fetchHeaders,
      redirect: 'follow'
    });

    if (!response.ok) {
      console.error(`[Proxy] Failed to fetch image: ${response.status} ${response.statusText}`);
      // Fallback: try one more time with no custom headers
      const retryResponse = await fetch(decodedUrl);
      if (!retryResponse.ok) {
        return new Response(`Failed to fetch image: ${retryResponse.statusText}`, { status: retryResponse.status });
      }
      
      const content = await retryResponse.arrayBuffer();
      return new Response(content, {
        headers: {
          'Content-Type': retryResponse.headers.get('content-type') || 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const contentType = response.headers.get('content-type');
    const imageBuffer = await response.arrayBuffer();

    return new Response(imageBuffer, {
      headers: {
        'Content-Type': contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error(`[Proxy] Error:`, error);
    return new Response(`Error proxying image: ${error.message}`, { status: 500 });
  }
}
