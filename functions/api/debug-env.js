export async function onRequest(context) {
  const { env } = context;
  
  const responseData = {
    FIREBASE_PROJECT_ID: env.FIREBASE_PROJECT_ID ? "SET" : "NOT_SET",
    FIREBASE_STORAGE_BUCKET: env.FIREBASE_STORAGE_BUCKET || "NOT_SET (using default)",
    STORAGE_BUCKET_VALUE: env.FIREBASE_STORAGE_BUCKET || "studio-7642357109-d9026.firebasestorage.app",
    NODE_VERSION: typeof process !== 'undefined' ? process.version : 'N/A',
    ENV_KEYS: Object.keys(env)
  };

  return new Response(JSON.stringify(responseData), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
