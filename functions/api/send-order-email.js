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
    const payload = await request.json();
    const orderData = payload?.orderData ?? payload;
    if (!orderData) return new Response(JSON.stringify({ success: false, message: "Missing order data" }), { status: 400, headers });

    const resendApiKey = env.RESEND_API_KEY;
    const emailFrom = env.EMAIL_FROM;
    const ownerEmail = env.OWNER_EMAIL || "githost2007@gmail.com";
    console.log(`Using owner email: ${ownerEmail}`);

    if (!resendApiKey || !emailFrom) return new Response(JSON.stringify({ success: false, message: "Resend configuration missing" }), { status: 500, headers });

    const { 
      customer, 
      products: rawProducts, 
      items: rawItems,
      orderReference, 
      orderDate, 
      orderTotal, 
      paymentMethod, 
      userSelectedCurrency = 'INR',
      status,
      cancellationReason,
      cancellationNote
    } = orderData;

    const products = (rawProducts || rawItems || []).map(item => ({
      ...item,
      size: item.size || item.selectedSize || item.variantSize || '',
      color: item.color || item.colour || item.selectedColor || item.selectedColour || '',
      dupatta: item.dupatta || item.duppata || item.selectedDupatta || item.selectedMaterial || item.material || item.materialName || item.dupattaOption || ''
    }));

    const currencyInfo = currencySymbols[userSelectedCurrency] || currencySymbols['INR'];
    const { symbol } = currencyInfo;

    const productsHTML = products.map(product => {
      const priceDisplay = product.priceDisplay !== undefined ? `${symbol}${product.priceDisplay.toFixed(2)}` : `${symbol}${product.price}`;
      const totalDisplay = product.totalDisplay !== undefined ? `${symbol}${product.totalDisplay.toFixed(2)}` : `${symbol}${(product.price * product.quantity).toFixed(2)}`;
      
      let options = [];
      if (product.size) options.push(`Size: ${product.size}`);
      if (product.color) options.push(`Color: ${product.color}`);
      if (product.dupatta) options.push(`Dupatta: ${product.dupatta}`);
      const optionsText = options.length > 0 ? `<br><small style="color: #666;">${options.join(' | ')}</small>` : '';

      return `<tr><td style="padding: 10px; border-bottom: 1px solid #e1e1e1;">${product.name || 'Product'}${optionsText}</td><td style="padding: 10px; border-bottom: 1px solid #e1e1e1; text-align: center;">${product.quantity || 1}</td><td style="padding: 10px; border-bottom: 1px solid #e1e1e1; text-align: right;">${priceDisplay}</td><td style="padding: 10px; border-bottom: 1px solid #e1e1e1; text-align: right;">${totalDisplay}</td></tr>`;
    }).join('');

    const isCancelled = status?.toLowerCase() === 'cancelled';
    const addressInfo = customer ? `
      <p><strong>Address:</strong> ${customer.address || ''}</p>
      <p><strong>City:</strong> ${customer.city || ''}</p>
      <p><strong>State:</strong> ${customer.state || ''}</p>
      <p><strong>Postal Code:</strong> ${customer.postalCode || ''}</p>
    ` : '';

    const commonOrderInfo = `
      <div class="order-info">
        <p><strong>Order Reference:</strong> ${orderReference}</p>
        <p><strong>Order Date:</strong> ${formatToIST(orderDate)}</p>
        <p><strong>Payment Method:</strong> ${paymentMethod}</p>
        <p><strong>Status:</strong> ${status || 'New'}</p>
      </div>
    `;

    const commonCustomerInfo = `
      <div class="order-info">
        <h3>Customer Details</h3>
        <p><strong>Name:</strong> ${customer?.firstName} ${customer?.lastName || ''}</p>
        <p><strong>Email:</strong> ${customer?.email}</p>
        <p><strong>Instagram:</strong> <a href="https://www.instagram.com/officialtaharah_/">officialtaharah_</a></p>
        ${addressInfo}
      </div>
    `;

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
          .cancellation-box { background-color: #fee2e2; border: 1px solid #fecaca; color: #991b1b; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">Taharah</div>
          <h2>${isCancelled ? 'Order Cancelled' : 'Order Confirmation'}</h2>
          
          ${isCancelled ? `
            <div class="cancellation-box">
              <h3 style="margin: 0 0 10px 0;">❌ Your order has been cancelled</h3>
              <p style="margin: 0 0 10px 0;"><strong>Reason:</strong> ${cancellationReason || 'Order cancelled by store administrator'}</p>
              ${cancellationNote ? `<p style="margin: 0;"><strong>Note:</strong> ${cancellationNote}</p>` : ''}
            </div>
          ` : ''}

          <p>Dear ${customer?.firstName},</p>
          <p>${isCancelled ? 'We regret to inform you that your order has been cancelled.' : 'Thank you for your order! We\'ve received it and are processing it now.'}</p>
          
          ${commonOrderInfo}
          ${commonCustomerInfo}

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

          ${isCancelled ? `
            <div style="background-color: #fffbeb; border: 1px solid #fbbf24; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;">If you have already made the payment, a full refund will be processed within 5-7 business days to your original payment method.</p>
            </div>
          ` : ''}

          <p>If you have any questions, please contact us at <a href="mailto:Officialtaharah@gmail.com">Officialtaharah@gmail.com</a></p>
          <p style="font-size: 12px; color: #888; text-align: center;">&copy; ${new Date().getFullYear()} Taharah. All Rights Reserved.</p>
        </div>
      </body>
      </html>
    `; 

    const ownerHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; }
          .header { background: #333; color: #fff; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; }
          .order-info { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 5px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #f1f1f1; padding: 10px; text-align: left; }
          td { padding: 10px; border-bottom: 1px solid #eee; }
          .total { text-align: right; font-weight: bold; font-size: 18px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">Taharah - Admin Notification</div>
          <p style="font-size: 12px; color: #888; text-align: center;">&copy; ${new Date().getFullYear()} Taharah Admin Notification</p>
          <h2>${isCancelled ? 'Order Cancelled' : 'New Order Received'}</h2>
          
          <div class="order-info">
            <p><strong>Instagram:</strong> <a href="https://www.instagram.com/officialtaharah_/" style="color: #fff;">officialtaharah_</a></p>
          </div>
          
          ${isCancelled ? `
            <div style="background-color: #fee2e2; border: 1px solid #fecaca; color: #991b1b; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Cancellation Reason:</strong> ${cancellationReason || 'N/A'}</p>
              ${cancellationNote ? `<p><strong>Note:</strong> ${cancellationNote}</p>` : ''}
            </div>
          ` : ''}

          ${commonOrderInfo}
          ${commonCustomerInfo}

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
        </div>
      </body>
      </html>
    `;

    // Customize subjects
    let customerSubject = isCancelled ? `Order Cancelled - ${orderReference}` : `Order Confirmation - ${orderReference}`;
    let ownerSubject = isCancelled ? `Order Cancelled - ${orderReference}` : `New Order - ${orderReference}`;

    // Send to Customer
    console.log(`Attempting to send email to customer: ${customer?.email}`);
    const custRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `Taharah <${emailFrom}>`, to: [customer?.email], subject: customerSubject, html: customerHtml })
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
        body: JSON.stringify({ from: `Taharah Orders <${emailFrom}>`, to: [ownerEmail], subject: ownerSubject, html: ownerHtml })
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
