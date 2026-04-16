export async function onRequestPost({ request, env }) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  try {
    const { razorpay_order_id } = await request.json();

    if (!razorpay_order_id) {
      return new Response(JSON.stringify({ success: false, message: "Missing order ID" }), { status: 400, headers });
    }

    const keyId = env.RAZORPAY_KEY_ID || "rzp_live_SG2nO8SrQyBF6r";
    const keySecret = env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return new Response(JSON.stringify({ success: false, message: "Razorpay credentials not configured" }), { status: 500, headers });
    }

    const auth = btoa(`${keyId}:${keySecret}`);

    const paymentsRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}/payments`, {
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json"
      }
    });

    if (!paymentsRes.ok) {
      const errorData = await paymentsRes.json();
      console.error("Razorpay API error:", errorData);
      return new Response(JSON.stringify({ success: false, message: "Failed to fetch payment status" }), { status: 500, headers });
    }

    const paymentsData = await paymentsRes.json();
    const capturedPayment = (paymentsData.items || []).find(p => p.status === 'captured');

    if (capturedPayment) {
      return new Response(JSON.stringify({
        success: true,
        paid: true,
        payment_id: capturedPayment.id,
        amount: capturedPayment.amount / 100,
        method: capturedPayment.method
      }), { status: 200, headers });
    }

    return new Response(JSON.stringify({
      success: true,
      paid: false,
      message: "No captured payment found for this order"
    }), { status: 200, headers });

  } catch (error) {
    console.error("Check payment error:", error.message);
    return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
