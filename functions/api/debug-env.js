export async function onRequest(context) {
  const { env } = context;
  
  // Create a safe version of the environment variables to display
  const safeEnv = {};
  for (const key in env) {
    if (typeof env[key] === 'string') {
      // Show first 5 and last 5 characters for sensitive-looking keys
      if (key.includes('KEY') || key.includes('SECRET') || key.includes('CERT')) {
        const val = env[key];
        safeEnv[key] = val.length > 10 
          ? `${val.substring(0, 5)}...${val.substring(val.length - 5)} (Length: ${val.length})`
          : `*** (Length: ${val.length})`;
      } else {
        safeEnv[key] = env[key];
      }
    } else {
      safeEnv[key] = `Type: ${typeof env[key]}`;
    }
  }

  const debugData = {
    message: "Cloudflare Pages Environment Variables Debug",
    timestamp: new Date().toISOString(),
    env_keys: Object.keys(env),
    env_values: safeEnv,
    // Add specific checks for expected variables
    verification: {
      has_project_id: !!env.FIREBASE_PROJECT_ID,
      has_storage_bucket: !!env.FIREBASE_STORAGE_BUCKET,
      has_private_key: !!env.FIREBASE_PRIVATE_KEY,
      storage_bucket_value: env.FIREBASE_STORAGE_BUCKET || 'NOT_SET'
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
