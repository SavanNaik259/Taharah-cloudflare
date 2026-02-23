export async function onRequestPost({ request, env }) {
  const headers = { 
    "Content-Type": "application/json", 
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  try {
    const body = await request.json();
    const { amount, currency = "INR", receipt, notes } = body;

    const keyId = env.RAZORPAY_KEY_ID;
    const keySecret = env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Razorpay credentials not configured in Cloudflare." 
      }), { status: 500, headers });
    }

    const auth = btoa(`${keyId}:${keySecret}`);
    const rzpResp = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${auth}`
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        currency,
        receipt,
        notes
      })
    });

    const data = await rzpResp.json();
    if (!rzpResp.ok) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: data.error?.description || "Razorpay API Error"
      }), { status: rzpResp.status, headers });
    }

    return new Response(JSON.stringify({ success: true, order: data, key_id: keyId }), { status: 200, headers });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers });
  }
}