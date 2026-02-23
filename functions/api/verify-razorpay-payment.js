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
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = body;
    
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return new Response(JSON.stringify({ success: false, message: "Missing verification data" }), { status: 400, headers });
    }

    const secret = env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return new Response(JSON.stringify({ success: false, message: "Razorpay secret missing on server" }), { status: 500, headers });
    }

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      enc.encode(`${razorpay_order_id}|${razorpay_payment_id}`)
    );

    const expected = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    console.log("Expected signature:", expected);
    console.log("Received signature:", razorpay_signature);

    if (expected === razorpay_signature) {
      return new Response(JSON.stringify({ success: true, message: "Payment verified" }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ success: false, message: "Verification failed: Signature mismatch" }), { status: 400, headers });
  } catch (error) {
    console.error("Verify Payment Function Error:", error);
    return new Response(JSON.stringify({ success: false, message: "Server error: " + error.message }), { status: 500, headers });
  }
}