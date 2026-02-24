// Format date to IST timezone (UTC+5:30)
function formatToIST(dateString) {
  const date = new Date(dateString);
  const istFormatter = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'Asia/Kolkata'
  });
  return istFormatter.format(date);
}

const currencySymbols = {
  'INR': { symbol: '₹', decimals: 0 },
  'USD': { symbol: '$', decimals: 2 },
  'EUR': { symbol: '€', decimals: 2 },
  'GBP': { symbol: '£', decimals: 2 },
  'AED': { symbol: 'د.إ', decimals: 2 },
  'CAD': { symbol: 'C$', decimals: 2 },
  'AUD': { symbol: 'A$', decimals: 2 }
};

export async function onRequestPost({ request, env }) {
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
  try {
    const { orderData } = await request.json();
    if (!orderData) return new Response(JSON.stringify({ success: false, message: "Missing order data" }), { status: 400, headers });

    const resendApiKey = env.RESEND_API_KEY;
    const emailFrom = env.EMAIL_FROM;
    const ownerEmail = env.OWNER_EMAIL || "githost2007@gmail.com";
    console.log(`Using owner email: ${ownerEmail}`);

    if (!resendApiKey || !emailFrom) return new Response(JSON.stringify({ success: false, message: "Resend configuration missing" }), { status: 500, headers });

    const { customer, products, orderReference, orderDate, orderTotal, paymentMethod, userSelectedCurrency = 'INR' } = orderData;
    const currencyInfo = currencySymbols[userSelectedCurrency] || currencySymbols['INR'];
    const { symbol } = currencyInfo;

    const productsHTML = products.map(product => {
      const priceDisplay = product.priceDisplay !== undefined ? `${symbol}${product.priceDisplay.toFixed(2)}` : `${symbol}${product.price}`;
      const totalDisplay = product.totalDisplay !== undefined ? `${symbol}${product.totalDisplay.toFixed(2)}` : `${symbol}${(product.price * product.quantity).toFixed(2)}`;
      return `<tr><td style="padding: 10px; border-bottom: 1px solid #e1e1e1;">${product.name || 'Product'}</td><td style="padding: 10px; border-bottom: 1px solid #e1e1e1; text-align: center;">${product.quantity || 1}</td><td style="padding: 10px; border-bottom: 1px solid #e1e1e1; text-align: right;">${priceDisplay}</td><td style="padding: 10px; border-bottom: 1px solid #e1e1e1; text-align: right;">${totalDisplay}</td></tr>`;
    }).join('');

    const customerHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; }
          .header { background: #f8f9fa; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; }
          .order-info { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 5px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #f1f1f1; padding: 10px; text-align: left; }
          td { padding: 10px; border-bottom: 1px solid #eee; }
          .total { text-align: right; font-weight: bold; font-size: 18px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">Taharah</div>
          <h2>Order Confirmation</h2>
          <p>Dear ${customer.firstName},</p>
          <p>Thank you for your order! We've received it and are processing it now.</p>
          
          <div class="order-info">
            <p><strong>Order Reference:</strong> ${orderReference}</p>
            <p><strong>Order Date:</strong> ${formatToIST(orderDate)}</p>
            <p><strong>Payment Method:</strong> ${paymentMethod}</p>
          </div>

          <h3>Order Items</h3>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${productsHTML}
            </tbody>
          </table>
          
          <div class="total">
            Total: ${symbol}${orderData.orderTotalDisplay?.toFixed(2) || orderTotal}
          </div>

          <p>If you have any questions, please contact us at <a href="mailto:Officialtaharah@gmail.com">Officialtaharah@gmail.com</a></p>
        </div>
      </body>
      </html>
    `; 

    const ownerHtml = `<html><body><h2>New Order Received</h2><p>Customer: ${customer.firstName} ${customer.lastName} (${customer.email})</p><p>Order Ref: ${orderReference}</p><p>Total: ₹${orderTotal}</p><table border="1" cellpadding="5" style="border-collapse: collapse;">${productsHTML}</table></body></html>`;

    // Send to Customer
    console.log(`Attempting to send email to customer: ${customer.email}`);
    const custRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `Taharah <${emailFrom}>`, to: [customer.email], subject: `Order Received - ${orderReference}`, html: customerHtml })
    });

    let custError = null;
    if (!custRes.ok) {
      custError = await custRes.json();
      console.error('Resend API Customer Error:', custError);
    }

    // Send to Owner
    let ownerRes = { ok: true };
    let ownerError = null;
    if (ownerEmail) {
      console.log(`Attempting to send email to owner: ${ownerEmail}`);
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: `Taharah Orders <${emailFrom}>`, to: [ownerEmail], subject: `New Order - ${orderReference}`, html: ownerHtml })
      });
      ownerRes = response;
      if (!ownerRes.ok) {
        ownerError = await ownerRes.json();
        console.error('Resend API Owner Error:', ownerError);
      }
    }

    if (custRes.ok && ownerRes.ok) return new Response(JSON.stringify({ success: true, message: "Order emails sent" }), { status: 200, headers });
    
    const errorMessage = !custRes.ok && !ownerRes.ok 
      ? "Failed to send both customer and owner emails" 
      : !custRes.ok ? "Failed to send customer email" : "Failed to send owner email";

    return new Response(JSON.stringify({ 
      success: false, 
      message: errorMessage,
      details: {
        customer: custError,
        owner: ownerError
      }
    }), { status: 500, headers });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers });
  }
}
