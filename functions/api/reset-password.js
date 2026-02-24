export async function onRequestPost(context) {
  const { request, env } = context;
  
  // CORS Headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const { email, token, newPassword } = body;

    if (!email || !token || !newPassword) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Get Firebase Config (fallback to hardcoded if env not set)
    const apiKey = env.FIREBASE_API_KEY || "AIzaSyCQ9gafSnJBwuXvIpnOGn4Kwo8YqMkKY0M";
    const projectId = env.FIREBASE_PROJECT_ID || "studio-7642357109-d9026";

    // 2. Validate token in Firestore via REST API
    // We search for the user document where email matches
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: 'users' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'email' },
            op: 'EQUAL',
            value: { stringValue: email }
          }
        },
        limit: 1
      }
    };

    const firestoreRes = await fetch(firestoreUrl, {
      method: 'POST',
      body: JSON.stringify(queryBody)
    });
    
    const queryResults = await firestoreRes.json();
    const userDoc = queryResults[0]?.document;

    if (!userDoc) {
      return new Response(JSON.stringify({ success: false, error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userData = userDoc.fields;
    const dbToken = userData.passwordResetToken?.stringValue;
    const dbExpiry = userData.passwordResetTokenExpiry?.timestampValue;

    if (!dbToken || dbToken !== token) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid reset token' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (dbExpiry && new Date() > new Date(dbExpiry)) {
      return new Response(JSON.stringify({ success: false, error: 'Token expired' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Update Password via Firebase Auth REST API (Google Identity Toolkit)
    // Note: Since we don't have the user's OOB code (we use a custom one), 
    // we use the 'accounts:update' endpoint which usually requires an ID token.
    // However, for admin-like resets without firebase-admin in a Worker,
    // the standard way is to use the 'accounts:resetPassword' with an oobCode.
    // Since the system generates a CUSTOM token, we must use the 'accounts:update' 
    // with the user's UID. This requires a Google OAuth2 access token with Identity Toolkit scopes.
    
    // FOR CLOUDFLARE WORKERS: The most reliable "Native" way without Node.js is to 
    // use the Firebase Auth REST API for 'resetPassword' using the actual Firebase oobCode,
    // OR if using custom tokens, use a Service Account with a JWT to get an Access Token.
    
    // For this specific implementation (Custom Token):
    // We will return a clear message that for CUSTOM reset tokens, a Node bridge or 
    // Service Account JWT implementation is required.
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Cloudflare Pages requires a Service Account JWT to handle custom password resets. Please ensure FIREBASE_SERVICE_ACCOUNT_JSON is configured or use Firebase standard OOB flow.' 
    }), {
      status: 501,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
