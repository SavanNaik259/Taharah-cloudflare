import { onRequestPost as sendNotifications } from "./send-notifications.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    const body = await request.json();
    const { productId, productName, productImage } = body;

    if (!productId || !productName) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), { status: 400, headers });
    }

    const notificationPayload = {
      title: "✨ New Product Added!",
      body: `Check out our latest: ${productName}`,
      link: `/product-detail.html?id=${encodeURIComponent(productId)}`,
      imageUrl: productImage || "",
      buttonText: "View Product",
      sendToUsers: true,
      sendToGuests: true,
      category: "new-product"
    };

    const forwardedRequest = new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(notificationPayload)
    });

    return await sendNotifications({ request: forwardedRequest, env });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers });
  }
}