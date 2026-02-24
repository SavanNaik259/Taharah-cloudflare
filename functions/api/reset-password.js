export async function onRequestPost({ request, env }) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    const { email, token, newPassword } = await request.json();

    if (!email || !token || !newPassword) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), { status: 400, headers });
    }

    if (newPassword.length < 6) {
      return new Response(JSON.stringify({ success: false, error: "Password must be at least 6 characters long" }), { status: 400, headers });
    }

    const FIREBASE_API_KEY = env.FIREBASE_API_KEY;
    const projectID = env.FIREBASE_PROJECT_ID;

    // Use Firestore REST API to find user and validate token
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectID}/databases/(default)/documents:runQuery`;
    
    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: "users" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "email" },
            op: "EQUAL",
            value: { stringValue: email }
          }
        },
        limit: 1
      }
    };

    const firestoreRes = await fetch(firestoreUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(queryBody)
    });

    if (!firestoreRes.ok) {
      const err = await firestoreRes.text();
      return new Response(JSON.stringify({ success: false, error: "Firestore query failed", details: err }), { status: 500, headers });
    }

    const firestoreData = await firestoreRes.json();
    if (!firestoreData || !firestoreData[0] || !firestoreData[0].document) {
      return new Response(JSON.stringify({ success: false, error: "User not found" }), { status: 404, headers });
    }

    const userDoc = firestoreData[0].document;
    const fields = userDoc.fields;
    
    const storedToken = fields.passwordResetToken?.stringValue;
    const expiryTimestamp = fields.passwordResetTokenExpiry?.timestampValue;

    if (!storedToken || storedToken !== token) {
      return new Response(JSON.stringify({ success: false, error: "Invalid reset link" }), { status: 400, headers });
    }

    if (expiryTimestamp) {
      const now = new Date();
      const expiry = new Date(expiryTimestamp);
      if (now > expiry) {
        return new Response(JSON.stringify({ success: false, error: "Reset link has expired" }), { status: 400, headers });
      }
    }

    // Generate OAuth token using Service Account credentials from env
    const accessToken = await getGoogleAuthToken(
      env.FIREBASE_CLIENT_EMAIL,
      env.FIREBASE_PRIVATE_KEY,
      "https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/datastore"
    );

    const uid = userDoc.name.split("/").pop();

    // Update password in Firebase Auth
    const authUpdateUrl = `https://identitytoolkit.googleapis.com/v1/projects/${projectID}/accounts:update`;
    const authUpdateRes = await fetch(authUpdateUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        localId: uid,
        password: newPassword
      })
    });

    if (!authUpdateRes.ok) {
      const authError = await authUpdateRes.json();
      return new Response(JSON.stringify({ success: false, error: authError.error?.message || "Auth update failed" }), { status: 500, headers });
    }

    // Clear reset fields in Firestore
    const patchUrl = `https://firestore.googleapis.com/v1/${userDoc.name}?updateMask.fieldPaths=passwordResetToken&updateMask.fieldPaths=passwordResetTokenExpiry&updateMask.fieldPaths=passwordResetCompletedAt`;
    const patchRes = await fetch(patchUrl, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fields: {
          passwordResetCompletedAt: { timestampValue: new Date().toISOString() }
        }
      })
    });

    if (!patchRes.ok) {
      console.error("Firestore patch failed:", await patchRes.text());
    }

    return new Response(JSON.stringify({ success: true, message: "Password reset successfully!" }), { status: 200, headers });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers });
  }
}

async function getGoogleAuthToken(email, privateKey, scope) {
  const pk = privateKey.replace(/\\n/g, "\n");
  
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: email,
    scope: scope,
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const base64UrlEncode = (obj) => {
    return btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedClaim = base64UrlEncode(claim);
  const signatureInput = `${encodedHeader}.${encodedClaim}`;

  const keyData = str2ab(atob(pk.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "")));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signatureInput)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
    
  const jwt = `${signatureInput}.${encodedSignature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const data = await res.json();
  if (data.error) throw new Error(`OAuth failed: ${data.error_description || data.error}`);
  return data.access_token;
}

function str2ab(str) {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0; i < str.length; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}
