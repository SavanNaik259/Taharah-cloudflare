import { extractPemKey } from "./_utils/googleAuth.js";

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function onRequestGet({ env }) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    const projectID = env.FIREBASE_PROJECT_ID;
    const accessToken = await getGoogleAuthToken(
      env.FIREBASE_CLIENT_EMAIL,
      env.FIREBASE_PRIVATE_KEY,
      "https://www.googleapis.com/auth/datastore"
    );

    const url = `https://firestore.googleapis.com/v1/projects/${projectID}/databases/(default)/documents/subcategories`;
    const res = await fetch(url, {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });

    const data = await res.json();
    const subcategories = {};

    if (data.documents) {
      data.documents.forEach(doc => {
        const category = doc.name.split("/").pop();
        const fields = doc.fields;
        if (fields && fields.list && fields.list.arrayValue && fields.list.arrayValue.values) {
          subcategories[category] = fields.list.arrayValue.values.map(v => v.stringValue);
        }
      });
    }

    return new Response(JSON.stringify({ success: true, subcategories }), { status: 200, headers });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers });
  }
}

export async function onRequestPost({ request, env }) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    const body = await request.json();
    const { category, subcategory } = body;

    if (!category || !subcategory) {
      return new Response(JSON.stringify({ success: false, error: "Category and subcategory are required" }), { status: 400, headers });
    }

    const projectID = env.FIREBASE_PROJECT_ID;
    const accessToken = await getGoogleAuthToken(
      env.FIREBASE_CLIENT_EMAIL,
      env.FIREBASE_PRIVATE_KEY,
      "https://www.googleapis.com/auth/datastore"
    );

    const docUrl = `https://firestore.googleapis.com/v1/projects/${projectID}/databases/(default)/documents/subcategories/${category}`;
    const getRes = await fetch(docUrl, {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });

    let currentSubs = [];
    let exists = false;
    if (getRes.ok) {
      exists = true;
      const data = await getRes.json();
      if (data.fields && data.fields.list && data.fields.list.arrayValue && data.fields.list.arrayValue.values) {
        currentSubs = data.fields.list.arrayValue.values.map(v => v.stringValue);
      }
    }

    if (!currentSubs.includes(subcategory)) {
      currentSubs.push(subcategory);
      
      const updateData = {
        fields: {
          list: {
            arrayValue: {
              values: currentSubs.map(s => ({ stringValue: s }))
            }
          },
          updatedAt: { timestampValue: new Date().toISOString() }
        }
      };

      const method = exists ? "PATCH" : "POST";
      const finalUrl = exists ? docUrl : `https://firestore.googleapis.com/v1/projects/${projectID}/databases/(default)/documents/subcategories?documentId=${category}`;

      const updateRes = await fetch(finalUrl, {
        method: method,
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updateData)
      });

      if (!updateRes.ok) {
        const errorText = await updateRes.text();
        throw new Error(`Firestore update failed: ${errorText}`);
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers });
  }
}

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
