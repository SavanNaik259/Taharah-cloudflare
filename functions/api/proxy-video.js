export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const videoUrl = url.searchParams.get("url");

  if (!videoUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  // Security: Only allow proxying from our own Firebase Storage bucket
  const allowedHost = env.FIREBASE_STORAGE_BUCKET || "storage.googleapis.com";
  if (!videoUrl.includes(allowedHost) && !videoUrl.includes("storage.googleapis.com")) {
    return new Response("Unauthorized video source", { status: 403 });
  }

  try {
    const response = await fetch(videoUrl, {
      headers: {
        "User-Agent": "Cloudflare-Worker-Proxy",
      },
    });

    if (!response.ok) {
      return new Response(`Failed to fetch video: ${response.statusText}`, { status: response.status });
    }

    // Disable caching for development on Cloudflare Pages
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");
    newHeaders.set("Access-Control-Allow-Origin", "*");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch (error) {
    return new Response(`Proxy error: ${error.message}`, { status: 500 });
  }
}
