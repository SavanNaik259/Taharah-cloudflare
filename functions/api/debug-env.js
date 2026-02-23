export async function onRequest(context) {
  const { env, request } = context;
  
  const RAZORPAY_KEY_ID = env.RAZORPAY_KEY_ID ? \`Configured (\${env.RAZORPAY_KEY_ID.substring(0, 4)}...)\` : "Missing";
  const RAZORPAY_KEY_SECRET = env.RAZORPAY_KEY_SECRET ? "Configured" : "Missing";
  const RESEND_API_KEY = env.RESEND_API_KEY ? "Configured" : "Missing";
  
  const debugData = {
    message: "Cloudflare Pages Environment Variables Debug",
    timestamp: new Date().toISOString(),
    env: {
      RAZORPAY_KEY_ID,
      RAZORPAY_KEY_SECRET,
      RESEND_API_KEY,
      all_keys: Object.keys(env)
    },
    request: {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers)
    }
  };

  return new Response(JSON.stringify(debugData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store'
    }
  });
}