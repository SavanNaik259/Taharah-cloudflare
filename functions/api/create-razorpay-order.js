export async function onRequestPost({ request, env }) {
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

  const { amount, currency = "INR", receipt, notes } = await request.json();

  if (!amount || amount <= 0) {
    return new Response(JSON.stringify({ success:false, message:"Invalid amount"}), { status:400, headers });
  }

  const keyId = env.RAZORPAY_KEY_ID;
  const keySecret = env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return new Response(JSON.stringify({ success:false, message:"Razorpay credentials missing" }), { status:500, headers });
  }

  // Prefer REST API (no Node SDK)
  const auth = btoa(`${keyId}:${keySecret}`);
  const resp = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type":"application/json",
      "Authorization": `Basic ${auth}`
    },
    body: JSON.stringify({
      amount: Math.round(amount * 100),
      currency,
      receipt,
      notes
    })
  });

  const data = await resp.json();

  if (!resp.ok) {
    return new Response(JSON.stringify({ success:false, message:"Failed to create order", error:data }), { status:500, headers });
  }

  return new Response(JSON.stringify({ success:true, order:data, key_id:keyId }), { status:200, headers });
}
