export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const body = await request.json();
    const { email, token, newPassword } = body;

    if (!email || !token || !newPassword) {
      return new Response(JSON.stringify({ success: false, error: 'Missing fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. Verify token in Firestore via REST API
    // We need the Firebase API Key and Project ID
    const API_KEY = env.FIREBASE_API_KEY || "AIzaSyCQ9gafSnJBwuXvIpnOGn4Kwo8YqMkKY0M"; 
    const PROJECT_ID = "studio-7642357109-d9026";

    // Fetch user from Firestore
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users`;
    // Note: This is a simplification. In production, you'd query by email.
    // For now, we'll search for the user document.
    const queryUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
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

    const queryRes = await fetch(queryUrl, {
      method: 'POST',
      body: JSON.stringify(queryBody)
    });
    const queryData = await queryRes.json();

    if (!queryData || !queryData[0] || !queryData[0].document) {
      return new Response(JSON.stringify({ success: false, error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userDoc = queryData[0].document;
    const fields = userDoc.fields;
    const dbToken = fields.passwordResetToken?.stringValue;
    
    if (!dbToken || dbToken !== token) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid or expired token' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Update password via Firebase Auth REST API
    // We need the user's UID from the doc name (projects/.../databases/.../documents/users/UID)
    const uid = userDoc.name.split('/').pop();

    // To update password without the old one, we usually need an ID Token.
    // However, since we don't have firebase-admin here, the best approach is 
    // to use a Service Account via a specialized Worker library OR 
    // (Recommended for Cloudflare) Use the Firebase Admin SDK compat layer if possible.
    
    // ALTERNATIVE: Since this is a restricted environment, the most robust "Option B" 
    // is actually to proxy this to a small Node.js service or Firebase Cloud Function 
    // as suggested in Option A.
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Cloudflare environment requires a Node.js bridge or Firebase Admin SDK migration. Please use Option A: Move this logic to a Node-compatible backend.' 
    }), {
      status: 501,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
