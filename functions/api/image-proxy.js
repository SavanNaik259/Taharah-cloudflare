export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const imageUrl = url.searchParams.get('url');

  if (!imageUrl) {
    return new Response('Missing URL parameter', { status: 400 });
  }

  try {
    const decodedUrl = decodeURIComponent(imageUrl);
    
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
