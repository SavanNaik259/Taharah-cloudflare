// functions/api/videos/[id].js
// Handles PUT (edit) and DELETE operations for a specific video by ID
// This file is required because Cloudflare Pages routing requires
// dynamic path segments to have their own file: [id].js

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function onRequestPut({ request, env, params }) {
  try {
    // params.id is automatically populated by Cloudflare Pages from the [id] filename
    const videoId = params.id;
    const projectID = env.FIREBASE_PROJECT_ID;
    const body = await request.json();

    const accessToken = await getGoogleAuthToken(
      env.FIREBASE_CLIENT_EMAIL,
      env.FIREBASE_PRIVATE_KEY,
      "https://www.googleapis.com/auth/datastore"
    );

    const updateData = { fields: {} };
    if (body.title !== undefined) updateData.fields.title = { stringValue: body.title };
    if (body.productSKU !== undefined) updateData.fields.productSKU = { stringValue: body.productSKU };
    if (body.description !== undefined) updateData.fields.description = { stringValue: body.description };
    updateData.fields.updatedAt = { timestampValue: new Date().toISOString() };

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectID}/databases/(default)/documents/watchBuyVideos/${videoId}?updateMask.fieldPaths=title&updateMask.fieldPaths=productSKU&updateMask.fieldPaths=description&updateMask.fieldPaths=updatedAt`;

    const firestoreRes = await fetch(firestoreUrl, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });

    if (!firestoreRes.ok) {
      const errText = await firestoreRes.text();
      throw new Error(`Firestore update failed: ${firestoreRes.status} - ${errText}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Video updated successfully" }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function onRequestDelete({ request, env, params }) {
  try {
    const videoId = params.id;
    const projectID = env.FIREBASE_PROJECT_ID;

    const accessToken = await getGoogleAuthToken(
      env.FIREBASE_CLIENT_EMAIL,
      env.FIREBASE_PRIVATE_KEY,
      "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/devstorage.full_control"
    );

    // Fetch video document to get storage path for file deletion
    const getUrl = `https://firestore.googleapis.com/v1/projects/${projectID}/databases/(default)/documents/watchBuyVideos/${videoId}`;
    const getRes = await fetch(getUrl, {
      headers: { "Authorization": `Bearer ${accessToken}` },
    });

    if (getRes.ok) {
      const videoData = await getRes.json();
      const storagePath = videoData.fields?.storagePath?.stringValue;

      if (storagePath) {
        // Delete the actual video file from Firebase Storage
        const storageUrl = `https://storage.googleapis.com/storage/v1/b/${env.FIREBASE_STORAGE_BUCKET}/o/${encodeURIComponent(storagePath)}`;
        await fetch(storageUrl, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${accessToken}` },
        });
      }
    }

    // Delete the Firestore document
    await fetch(getUrl, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${accessToken}` },
    });

    return new Response(
      JSON.stringify({ success: true, message: "Video deleted successfully" }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

// ─── JWT / Google Auth Helper ──────────────────────────────────────────────

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
    const str = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedClaim = base64UrlEncode(claim);
  const signatureInput = `${encodedHeader}.${encodedClaim}`;

  // FIX: Use whitelist approach instead of \s to clean the private key
  const cleanKey = pk
    .replace(/-----BEGIN (?:RSA )?PRIVATE KEY-----/g, '')
    .replace(/-----END (?:RSA )?PRIVATE KEY-----/g, '')
    .replace(/[^A-Za-z0-9+/=]/g, '');

  // Ensure padding is correct for atob
  const paddedKey = cleanKey.padEnd(Math.ceil(cleanKey.length / 4) * 4, '=');
  const binaryKey = atob(paddedKey);
  const keyData = new Uint8Array(binaryKey.length);
  for (let i = 0; i < binaryKey.length; i++) {
    keyData[i] = binaryKey.charCodeAt(i);
  }

  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyData.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signatureInput)
  );

  const signatureArray = new Uint8Array(signature);
  let signatureBinary = "";
  for (let i = 0; i < signatureArray.byteLength; i++) {
    signatureBinary += String.fromCharCode(signatureArray[i]);
  }
  const encodedSignature = btoa(signatureBinary)
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
  if (data.error) throw new Error(data.error_description || data.error);
  return data.access_token;
}
