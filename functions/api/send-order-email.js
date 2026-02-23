export async function onRequestPost({ request, env }) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  try {
    const { orderData } = await request.json();
    
    if (!orderData) {
      return new Response(JSON.stringify({ success: false, message: "Missing order data" }), { status: 400, headers });
    }

    const resendApiKey = env.RESEND_API_KEY;
    const emailFrom = env.EMAIL_FROM;
    const ownerEmail = env.OWNER_EMAIL || env.EMAIL_USER;

    if (!resendApiKey || !emailFrom) {
      return new Response(JSON.stringify({ success: false, message: "Resend configuration missing" }), { status: 500, headers });
    }

    // Call Resend API directly via fetch
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `Taharah <${emailFrom}>`,
        to: [orderData.customer.email],
        subject: `Order Received - ${orderData.orderReference}`,
        html: `<p>Thank you for your order, ${orderData.customer.firstName}!</p><p>Order Reference: ${orderData.orderReference}</p>`
      })
    });

    const result = await resendResponse.json();

    if (resendResponse.ok) {
      console.log("Order email sent successfully via Resend:", result.id);
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Order emails sent successfully",
        id: result.id
      }), { status: 200, headers });
    } else {
      console.error("Resend API error:", result);
      return new Response(JSON.stringify({ success: false, message: "Failed to send email via Resend", error: result }), { status: 500, headers });
    }
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers });
  }
}
