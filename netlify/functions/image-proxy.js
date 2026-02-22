exports.handler = async (event, context) => { const request = { url: "http://localhost" + event.path + (Object.keys(event.queryStringParameters || {}).length ? "?" + new URLSearchParams(event.queryStringParameters).toString() : "") };
  
  const url = new URL(request.url);
  const imageUrl = url.searchParams.get('url');

  if (!imageUrl) {
    return { body: ('Missing URL parameter', { status: 400 });
  }

  try {
    const decodedUrl = decodeURIComponent(imageUrl);
    console.log(`Proxying image: ${decodedUrl}`);

    // Standard headers to avoid blocking
    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
    };

    const response = await fetch(decodedUrl, {
      headers: fetchHeaders
    });

    if (!response.ok) {
      // Retry once without headers if it fails
      const retryResponse = await fetch(decodedUrl);
      if (!retryResponse.ok) {
        return { body: (`Failed to fetch image: ${retryResponse.statusText}`, { status: retryResponse.status });
      }
      
      const content = await retryResponse.arrayBuffer();
      return { body: (content, {
        headers: {
          'Content-Type': retryResponse.headers.get('content-type') || 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const contentType = response.headers.get('content-type');
    const imageBuffer = await response.arrayBuffer();

    return { body: (imageBuffer, {
      headers: {
        'Content-Type': contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error(`Proxy error for ${imageUrl}:`, error);
    return { body: (`Error proxying image: ${error.message}`, { status: 500 });
  }
}
