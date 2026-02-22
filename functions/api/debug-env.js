export async function onRequest(context) {
  const { env } = context;
  
  const responseData = {
    FIREBASE_PROJECT_ID: env.FIREBASE_PROJECT_ID || "NOT_SET",
    FIREBASE_CLIENT_EMAIL: env.FIREBASE_CLIENT_EMAIL || "NOT_SET",
    FIREBASE_STORAGE_BUCKET: env.FIREBASE_STORAGE_BUCKET || "NOT_SET",
    FIREBASE_PRIVATE_KEY: env.FIREBASE_PRIVATE_KEY || "NOT_SET"
  };

  return new Response(JSON.stringify(responseData), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
