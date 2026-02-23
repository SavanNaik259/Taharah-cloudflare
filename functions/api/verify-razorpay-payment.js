export async function onRequestPost({ request, env }) {
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = await request.json();
  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return new Response(JSON.stringify({ success:false, message:"Missing verification data" }), { status:400, headers });
  }

  const secret = env.RAZORPAY_KEY_SECRET;
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

  const expected = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");

  if (expected === razorpay_signature) {
    return new Response(JSON.stringify({ success:true, message:"Payment verified" }), { status:200, headers });
  }

  return new Response(JSON.stringify({ success:false, message:"Verification failed" }), { status:400, headers });
}
