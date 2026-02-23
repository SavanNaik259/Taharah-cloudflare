const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  const imageUrl = event.queryStringParameters.url;

  if (!imageUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing URL parameter' })
    };
  }

  try {
    const decodedUrl = decodeURIComponent(imageUrl);
    console.log(`[Local Proxy] Fetching: ${decodedUrl}`);

    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.error(`[Local Proxy] Failed to fetch: ${response.status} ${response.statusText}`);
      return {
        statusCode: response.status,
        body: `Failed to fetch image: ${response.statusText}`
      };
    }

    const contentType = response.headers.get('content-type');
    const buffer = await response.buffer();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType || 'image/jpeg',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000'
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    console.error(`[Local Proxy] Error:`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
