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
    const ownerEmail = env.OWNER_EMAIL || env.EMAIL_USER;

    if (!resendApiKey || !emailFrom) return new Response(JSON.stringify({ success: false, message: "Resend configuration missing" }), { status: 500, headers });

    const { customer, products, orderReference, orderDate, orderTotal, paymentMethod, userSelectedCurrency = 'INR' } = orderData;
    const currencyInfo = currencySymbols[userSelectedCurrency] || currencySymbols['INR'];
    const { symbol } = currencyInfo;

    const productsHTML = products.map(product => {
      const priceDisplay = product.priceDisplay !== undefined ? `${symbol}${product.priceDisplay.toFixed(2)}` : `${symbol}${product.price}`;
      const totalDisplay = product.totalDisplay !== undefined ? `${symbol}${product.totalDisplay.toFixed(2)}` : `${symbol}${(product.price * product.quantity).toFixed(2)}`;
      return `<tr><td style="padding: 10px; border-bottom: 1px solid #e1e1e1;">${product.name || 'Product'}</td><td style="padding: 10px; border-bottom: 1px solid #e1e1e1; text-align: center;">${product.quantity || 1}</td><td style="padding: 10px; border-bottom: 1px solid #e1e1e1; text-align: right;">${priceDisplay}</td><td style="padding: 10px; border-bottom: 1px solid #e1e1e1; text-align: right;">${totalDisplay}</td></tr>`;
    }).join('');

    const customerHtml = `<html><body style="font-family: Arial, sans-serif; color: #333;"><h2>Order Confirmation - Taharah</h2><p>Dear ${customer.firstName},</p><p>Thank you for your order!</p><div style="background: #f8f9fa; padding: 15px; border-radius: 5px;"><p><strong>Order Ref:</strong> ${orderReference}</p><p><strong>Date:</strong> ${formatToIST(orderDate)}</p></div><table style="width: 100%; border-collapse: collapse; margin-top: 20px;"><thead><tr style="background: #f1f1f1;"><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${productsHTML}</tbody></table><p style="text-align: right; font-weight: bold;">Total: ${symbol}${orderData.orderTotalDisplay?.toFixed(2) || orderTotal}</p></body></html>`;

    const ownerHtml = `<html><body><h2>New Order Received</h2><p>Customer: ${customer.firstName} ${customer.lastName} (${customer.email})</p><p>Order Ref: ${orderReference}</p><p>Total: ₹${orderTotal}</p><table border="1" cellpadding="5" style="border-collapse: collapse;">${productsHTML}</table></body></html>`;

    // Send to Customer
    const custRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `Taharah <${emailFrom}>`, to: [customer.email], subject: `Order Received - ${orderReference}`, html: customerHtml })
    });

    // Send to Owner
    if (ownerEmail) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: `Taharah Orders <${emailFrom}>`, to: [ownerEmail], subject: `New Order - ${orderReference}`, html: ownerHtml })
      });
    }

    if (custRes.ok) return new Response(JSON.stringify({ success: true, message: "Order emails sent" }), { status: 200, headers });
    return new Response(JSON.stringify({ success: false, message: "Failed to send customer email" }), { status: 500, headers });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers });
  }
}
