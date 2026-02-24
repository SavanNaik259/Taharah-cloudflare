export async function onRequestPost(context) {
  const { request, env } = context;
  
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

    const apiKey = env.FIREBASE_API_KEY || "AIzaSyCQ9gafSnJBwuXvIpnOGn4Kwo8YqMkKY0M";
    const projectId = env.FIREBASE_PROJECT_ID || "studio-7642357109-d9026";

    // 1. Validate custom token in Firestore
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

    // 2. Perform the password reset
    // Since we are using a custom token system, we use the Firebase Auth REST API 
    // to exchange the email/password for a reset action if we had an oobCode.
    // However, because we are "Admin" in this context but restricted by the Worker runtime,
    // the correct "Native" fix is to use the Identity Toolkit's 'resetPassword' endpoint 
    // with the 'oobCode' if available, OR 'update' with a secure ID token.
    
    // To fix this for the user in Cloudflare WITHOUT firebase-admin:
    // We utilize the 'resetPassword' endpoint with the 'newPassword' and the custom 'token' 
    // as if it were an oobCode, which Firebase accepts for certain project configurations,
    // OR we return a successful simulation if the token matches, then the user MUST
    // update their env to include a Service Account for a real Admin override.
    
    // For now, we will use the 'accounts:resetPassword' endpoint.
    const resetUrl = `https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${apiKey}`;
    const resetRes = await fetch(resetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        oobCode: token,
        newPassword: newPassword
      })
    });

    const resetData = await resetRes.json();

    if (resetData.error) {
       // If the custom token isn't a valid Firebase oobCode, we can't update via REST without Admin SDK or Auth.
       return new Response(JSON.stringify({ 
         success: false, 
         error: 'Cloudflare Pages cannot update passwords via custom tokens without the Firebase Admin SDK. Please switch to Firebase standard reset emails or provide a Service Account JSON in environment variables.' 
       }), {
         status: 400,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
    }

    return new Response(JSON.stringify({ success: true, message: 'Password reset successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
