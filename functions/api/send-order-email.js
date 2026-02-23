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
    const { id, orderTotal, customer, products } = await request.json();
    const apiKey = env.RESEND_API_KEY;
    
    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, message: "Resend API key missing" }), { status: 500, headers });
    }

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px;">
        <h2 style="text-align: center;">Order Confirmation - ${id}</h2>
        <p>Hi ${customer.firstName},</p>
        <p>Thank you for your order! Your payment was successful and your order is being processed.</p>
        <p><strong>Total:</strong> ₹${orderTotal.toFixed(2)}</p>
        <h3>Items:</h3>
        <ul>
          ${products.map(p => `<li>${p.name} x ${p.quantity} - ₹${(p.price || 0).toFixed(2)}</li>`).join('')}
        </ul>
        <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
          Taharah | orders@fluxe.in
        </p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: "Taharah <orders@fluxe.in>",
        to: [customer.email],
        bcc: ["orders@fluxe.in"],
        subject: `Order Confirmation - ${id}`,
        html: emailHtml
      })
    });

    return new Response(JSON.stringify({ success: res.ok }), { status: res.status, headers });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers });
  }
}