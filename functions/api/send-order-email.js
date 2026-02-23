export async function onRequestPost({ request, env }) {
  const headers = { 
    "Content-Type": "application/json", 
    "Access-Control-Allow-Origin": "*" 
  };

  try {
    const orderData = await request.json();
    const resendApiKey = env.RESEND_API_KEY;

    if (!resendApiKey) {
      return new Response(JSON.stringify({ success: false, message: "Resend API key missing" }), { status: 500, headers });
    }

    const customerEmail = orderData.customer.email;
    const adminEmail = env.ADMIN_EMAIL || "info@fluxe.in";
    const orderRef = orderData.orderReference || "N/A";
    const currency = orderData.userSelectedCurrency || "INR";

    const emailBody = `
      <h1>Order Confirmation - ${orderRef}</h1>
      <p>Thank you for your order, ${orderData.customer.firstName}!</p>
      <p>Total: ${currency} ${orderData.orderTotalDisplay || orderData.orderTotal}</p>
      <p>Status: ${orderData.status}</p>
      <h2>Order Details</h2>
      <ul>
        ${(orderData.products || []).map(p => `<li>${p.name || p.productName} x ${p.quantity} - ${currency} ${p.priceDisplay || p.price}</li>`).join('')}
      </ul>
      <p><strong>Shipping Address:</strong><br>
      ${orderData.customer.address}, ${orderData.customer.city}, ${orderData.customer.state} - ${orderData.customer.zipCode}</p>
    `;

    const sendResend = async (to, subject, html) => {
      const body = {
        from: "Taharah <onboarding@resend.dev>",
        to: [to],
        subject: subject,
        html: html
      };
      
      // Use fluxe.in domain if it's verified in Resend
      if (env.RESEND_FROM_EMAIL) {
        body.from = env.RESEND_FROM_EMAIL;
      }

      return fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${resendApiKey}`
        },
        body: JSON.stringify(body)
      });
    };

    const customerResp = await sendResend(customerEmail, `Order Confirmation - ${orderRef}`, emailBody);
    const adminResp = await sendResend(adminEmail, `New Order Received - ${orderRef}`, emailBody);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Emails processed",
      customerSent: customerResp.ok,
      adminSent: adminResp.ok
    }), { status: 200, headers });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers });
  }
}
