export async function onRequestPost({ request, env }) {
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

  try {
    const { orderData, items, customerInfo } = await request.json();
    
    // Prioritize the provided API key, then env
    const RESEND_API_KEY = env.RESEND_API_KEY || "re_TEeXueCx_LkVvYLKY8S9nsQ32regcjzvD";
    
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ success: false, message: "Email API key missing" }), { status: 500, headers });
    }

    const emailHtml = `
      <h1>Order Confirmation</h1>
      <p>Thank you for your order, ${customerInfo.firstName}!</p>
      <p>Order ID: ${orderData.id || "N/A"}</p>
      <p>Total Amount: ${(orderData.amount / 100).toFixed(2)} ${orderData.currency || "INR"}</p>
      <h3>Items:</h3>
      <ul>
        ${items.map(item => `<li>${item.name} x ${item.quantity} - ${item.price}</li>`).join('')}
      </ul>
      <p>We will notify you once your order is shipped.</p>
    `;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: "Taharah <orders@fluxe.in>",
        to: [customerInfo.email],
        subject: `Order Confirmation - ${orderData.id || ""}`,
        html: emailHtml
      })
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.error("Resend API error:", data);
      return new Response(JSON.stringify({ success: false, message: "Failed to send email", error: data }), { status: 500, headers });
    }

    return new Response(JSON.stringify({ success: true, data }), { status: 200, headers });
  } catch (error) {
    console.error("Cloudflare Function Error:", error);
    return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers });
  }
}