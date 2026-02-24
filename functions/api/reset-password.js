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

    const API_KEY = env.FIREBASE_API_KEY || "AIzaSyCQ9gafSnJBwuXvIpnOGn4Kwo8YqMkKY0M"; 
    const PROJECT_ID = "studio-7642357109-d9026";

    // 1. Fetch user from Firestore via REST API
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
      headers: { 'Content-Type': 'application/json' },
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
    const dbTokenExpiry = fields.passwordResetTokenExpiry?.timestampValue;
    
    // Validate token
    if (!dbToken || dbToken !== token) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid reset link' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate expiry
    if (dbTokenExpiry) {
      const expiryDate = new Date(dbTokenExpiry);
      if (new Date() > expiryDate) {
        return new Response(JSON.stringify({ success: false, error: 'Reset link has expired' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 2. Get user's account info to get their email (verified)
    // We'll use the "exchange custom token for ID token" or "update profile" flow
    // In Firebase Auth REST API, you can update password if you have an ID token.
    // Since we don't have an ID token, we use the 'setAccountInfo' endpoint with the API Key.
    // IMPORTANT: This requires the user's UID.
    const uid = userDoc.name.split('/').pop();

    // 3. Update Password via Firebase Auth REST API (Identity Toolkit)
    // The 'setAccountInfo' endpoint allows updating passwords with the API key.
    const updateAuthUrl = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${API_KEY}`;
    const updateAuthRes = await fetch(updateAuthUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        localId: uid,
        password: newPassword,
        returnSecureToken: false
      })
    });
    
    const authResult = await updateAuthRes.json();
    if (authResult.error) {
      return new Response(JSON.stringify({ success: false, error: authResult.error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. Cleanup Firestore (remove token)
    const patchUrl = `https://firestore.googleapis.com/v1/${userDoc.name}?updateMask.fieldPaths=passwordResetToken&updateMask.fieldPaths=passwordResetTokenExpiry&updateMask.fieldPaths=passwordResetCompletedAt`;
    await fetch(patchUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          passwordResetCompletedAt: { timestampValue: new Date().toISOString() }
        }
      })
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Password reset successfully' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
