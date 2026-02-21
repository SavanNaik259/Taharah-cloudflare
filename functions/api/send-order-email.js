export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  try {
    const orderData = await request.json();
    
    // For emails on Cloudflare, we recommend using an HTTP API like Resend, Mailgun, or SendGrid
    // since standard SMTP (Nodemailer) is not supported in the Worker runtime.
    // This is a placeholder for the integration logic.
    console.log('Order email request for:', orderData.orderReference);

    return new Response(JSON.stringify({
      success: true,
      message: 'Order email request received. (Requires Email API configuration on Cloudflare)'
    }), { status: 200, headers });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), { status: 500, headers });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    }
  });
}
