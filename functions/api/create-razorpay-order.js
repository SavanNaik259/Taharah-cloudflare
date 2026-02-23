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

    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ success: false, message: "Invalid amount: " + amount }), { status: 400, headers });
    }

    const keyId = env.RAZORPAY_KEY_ID;
    const keySecret = env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error("Missing Razorpay credentials in environment variables");
      return new Response(JSON.stringify({ success: false, message: "Razorpay credentials missing on server" }), { status: 500, headers });
    }

    const auth = btoa(`${keyId}:${keySecret}`);
    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${auth}`
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Convert to paise
        currency,
        receipt,
        notes
      })
    });

    const data = await razorpayResponse.json();

    if (!razorpayResponse.ok) {
      console.error("Razorpay API Error:", data);
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Razorpay API error: " + (data.error?.description || "Unknown error"),
        error: data 
      }), { status: 500, headers });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      order: data, 
      key_id: keyId 
    }), { status: 200, headers });

  } catch (error) {
    console.error("Create Order Function Error:", error);
    return new Response(JSON.stringify({ success: false, message: "Server error: " + error.message }), { status: 500, headers });
  }
}