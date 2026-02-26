import { extractPemKey } from "./_utils/googleAuth.js";

async function getGoogleAuthToken(email, privateKey, scope) {
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

  const binaryKey = extractPemKey(privateKey);
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

export async function onRequestPost({ request, env }) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    const body = await request.json();
    const { title, body: msgBody, link, imageUrl, buttonText, sendToUsers, sendToGuests } = body;

    if (!title || !msgBody) {
      return new Response(JSON.stringify({ success: false, error: "Title and message body are required" }), { status: 400, headers });
    }

    const accessToken = await getGoogleAuthToken(
      env.FIREBASE_CLIENT_EMAIL,
      env.FIREBASE_PRIVATE_KEY,
      "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform"
    );

    const projectID = env.FIREBASE_PROJECT_ID;
    const tokens = [];

    // Fetch tokens from Firestore
    if (sendToUsers) {
      const usersUrl = `https://firestore.googleapis.com/v1/projects/${projectID}/databases/(default)/documents/users`;
      const usersRes = await fetch(usersUrl, { headers: { "Authorization": `Bearer ${accessToken}` } });
      const usersData = await usersRes.json();
      if (usersData.documents) {
        usersData.documents.forEach(doc => {
          const fields = doc.fields;
          if (fields && fields.pushTokens && fields.pushTokens.arrayValue && fields.pushTokens.arrayValue.values) {
             fields.pushTokens.arrayValue.values.forEach(t => {
               if (t.stringValue) tokens.push(t.stringValue);
             });
          }
        });
      }
    }

    if (sendToGuests) {
      const guestsUrl = `https://firestore.googleapis.com/v1/projects/${projectID}/databases/(default)/documents/guest_tokens`;
      const guestsRes = await fetch(guestsUrl, { headers: { "Authorization": `Bearer ${accessToken}` } });
      const guestsData = await guestsRes.json();
      if (guestsData.documents) {
        guestsData.documents.forEach(doc => {
          const token = doc.fields?.token?.stringValue;
          if (token) tokens.push(token);
        });
      }
    }

    if (tokens.length === 0) {
      return new Response(JSON.stringify({ success: true, stats: { totalSent: 0 }, message: "No tokens found" }), { status: 200, headers });
    }

    const uniqueTokens = [...new Set(tokens)];
    let successCount = 0;

    // Fix image URL to use proxy if it's a Firebase URL or relative path
    let finalImageUrl = imageUrl || "";
    if (finalImageUrl) {
      if (finalImageUrl.includes("firebasestorage.googleapis.com") || !finalImageUrl.startsWith("http")) {
        const hostname = new URL(request.url).hostname;
        const protocol = hostname === "localhost" ? "http" : "https";
        finalImageUrl = `${protocol}://${hostname}/api/image-proxy?url=${encodeURIComponent(finalImageUrl)}`;
      }
    }
    
    // Batch sending in parallel to avoid timeouts
    const sendPromises = uniqueTokens.map(async (token) => {
      try {
        const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectID}/messages:send`;
        const message = {
          message: {
            token: token,
            data: {
              title,
              body: msgBody,
              link: link || "",
              imageUrl: finalImageUrl,
              buttonText: buttonText || "View",
              timestamp: Date.now().toString()
            }
          }
        };

        const fcmRes = await fetch(fcmUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(message)
        });

        if (fcmRes.ok) {
          successCount++;
          return true;
        }
        return false;
      } catch (e) {
        return false;
      }
    });

    await Promise.all(sendPromises);

    // Log to history
    const historyUrl = `https://firestore.googleapis.com/v1/projects/${projectID}/databases/(default)/documents/notification_history`;
    await fetch(historyUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fields: {
          title: { stringValue: title },
          body: { stringValue: msgBody },
          link: { stringValue: link || "" },
          sentAt: { timestampValue: new Date().toISOString() },
          stats: {
            mapValue: {
              fields: {
                totalSent: { integerValue: successCount.toString() }
              }
            }
          }
        }
      })
    });

    return new Response(JSON.stringify({ success: true, stats: { totalSent: successCount } }), { status: 200, headers });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers });
  }
}
