import { extractPemKey } from "./_utils/googleAuth.js";

export async function onRequestPut({ request, env }) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    const url = new URL(request.url);
    const videoId = url.pathname.split("/").pop();
    const projectID = env.FIREBASE_PROJECT_ID;
    const body = await request.json();

    const accessToken = await getGoogleAuthToken(
      env.FIREBASE_CLIENT_EMAIL,
      env.FIREBASE_PRIVATE_KEY,
      "https://www.googleapis.com/auth/datastore"
    );

    const updateData = { fields: {} };
    if (body.title) updateData.fields.title = { stringValue: body.title };
    if (body.productSKU !== undefined) updateData.fields.productSKU = { stringValue: body.productSKU };
    if (body.description !== undefined) updateData.fields.description = { stringValue: body.description };
    updateData.fields.updatedAt = { timestampValue: new Date().toISOString() };

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectID}/databases/(default)/documents/watchBuyVideos/${videoId}?updateMask.fieldPaths=title&updateMask.fieldPaths=productSKU&updateMask.fieldPaths=description&updateMask.fieldPaths=updatedAt`;
    
    await fetch(firestoreUrl, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(updateData)
    });

    return new Response(JSON.stringify({ success: true, message: "Video updated successfully" }), { status: 200, headers });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers });
  }
}

export async function onRequestDelete({ request, env }) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    const url = new URL(request.url);
    const videoId = url.pathname.split("/").pop();
    const projectID = env.FIREBASE_PROJECT_ID;

    const accessToken = await getGoogleAuthToken(
      env.FIREBASE_CLIENT_EMAIL,
      env.FIREBASE_PRIVATE_KEY,
      "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/devstorage.full_control"
    );

    // Get video data to find storage path
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectID}/databases/(default)/documents/watchBuyVideos/${videoId}`;
    const getRes = await fetch(firestoreUrl, {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });
    
    if (getRes.ok) {
      const videoData = await getRes.json();
      const filename = videoData.fields?.storagePath?.stringValue;
      
      if (filename) {
        const storageUrl = `https://storage.googleapis.com/storage/v1/b/${env.FIREBASE_STORAGE_BUCKET}/o/${encodeURIComponent(filename)}`;
        await fetch(storageUrl, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${accessToken}` }
        });
      }
    }

    await fetch(firestoreUrl, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${accessToken}` }
    });

    return new Response(JSON.stringify({ success: true, message: "Video deleted successfully" }), { status: 200, headers });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Upload-Action, X-Upload-Url",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function onRequestGet({ request, env }) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const projectID = env.FIREBASE_PROJECT_ID;

    if (action === "getUploadUrl") {
      const fileName = url.searchParams.get("fileName") || url.searchParams.get("filename");
      const fileType = url.searchParams.get("fileType") || "video/mp4";

      if (!fileName) {
        return new Response(JSON.stringify({ success: false, error: "FileName is required" }), { status: 400, headers });
      }

      const timestamp = Date.now();
      const safeFilename = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `videos/${timestamp}_${safeFilename}`;
      
      const accessToken = await getGoogleAuthToken(
        env.FIREBASE_CLIENT_EMAIL,
        env.FIREBASE_PRIVATE_KEY,
        "https://www.googleapis.com/auth/devstorage.full_control"
      );

      const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${env.FIREBASE_STORAGE_BUCKET}/o?uploadType=resumable&name=${encodeURIComponent(storagePath)}`;
      
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "X-Upload-Content-Type": fileType,
        }
      });

      if (!res.ok) {
        const errorText = await res.text();
        return new Response(JSON.stringify({
          success: false,
          error: "Failed to generate upload URL",
          status: res.status,
          statusText: res.statusText,
          details: errorText
        }), { status: res.status, headers });
      }

      const location = res.headers.get("Location") || res.headers.get("location");
      if (!location) {
        const responseText = await res.text();
        return new Response(JSON.stringify({
          success: false,
          error: "Missing Location header in Google Storage response",
          status: res.status,
          details: responseText
        }), { status: 500, headers });
      }

      return new Response(JSON.stringify({
        success: true,
        uploadUrl: location,
        storagePath,
        publicUrl: `https://storage.googleapis.com/${env.FIREBASE_STORAGE_BUCKET}/${storagePath}`
      }), { status: 200, headers });
    }

    // List videos
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectID}/databases/(default)/documents/watchBuyVideos?orderBy=uploadedAt desc`;
    const firestoreRes = await fetch(firestoreUrl);
    const data = await firestoreRes.json();
    
    const videos = (data.documents || []).map(doc => {
      const fields = doc.fields;
      return {
        id: doc.name.split("/").pop(),
        title: fields.title?.stringValue,
        productSKU: fields.productSKU?.stringValue,
        description: fields.description?.stringValue,
        videoUrl: fields.videoUrl?.stringValue,
        storagePath: fields.storagePath?.stringValue,
        uploadedAt: fields.uploadedAt?.timestampValue,
        status: fields.status?.stringValue
      };
    });

    return new Response(JSON.stringify({ success: true, videos }), { status: 200, headers });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers });
  }
}

export async function onRequestPost({ request, env }) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Upload-Action, X-Upload-Url",
  };

  try {
    const action = request.headers.get("X-Upload-Action");
    
    if (action === "proxyUpload") {
      const uploadUrl = request.headers.get("X-Upload-Url");
      if (!uploadUrl) {
        return new Response(JSON.stringify({ success: false, error: "Missing X-Upload-Url header" }), { status: 400, headers });
      }

      const contentType = request.headers.get("Content-Type") || "video/mp4";
      const body = await request.arrayBuffer();

      console.log(`Proxying upload to ${uploadUrl} with Content-Type: ${contentType}`);

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
        },
        body: body
      });

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Storage upload failed", 
          status: uploadRes.status,
          details: errorText 
        }), { status: uploadRes.status, headers });
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    }

    const { title, productSKU, description, videoUrl, filename, contentType: rawContentType } = body;
    const contentType = (rawContentType && typeof rawContentType === 'string' && rawContentType.startsWith('video/')) ? rawContentType : 'video/mp4';
    const projectID = env.FIREBASE_PROJECT_ID;

    const accessToken = await getGoogleAuthToken(
      env.FIREBASE_CLIENT_EMAIL,
      env.FIREBASE_PRIVATE_KEY,
      "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/devstorage.full_control"
    );

    // Make file public and set metadata
    const storageUrl = `https://storage.googleapis.com/storage/v1/b/${env.FIREBASE_STORAGE_BUCKET}/o/${encodeURIComponent(filename)}`;
    await fetch(storageUrl, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contentType: contentType,
        cacheControl: "public, max-age=31536000",
        acl: [{ entity: "allUsers", role: "READER" }]
      })
    });

    // Add to Firestore
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectID}/databases/(default)/documents/watchBuyVideos`;
    const res = await fetch(firestoreUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fields: {
          title: { stringValue: title || "Untitled Video" },
          productSKU: { stringValue: productSKU || "" },
          description: { stringValue: description || "" },
          videoUrl: { stringValue: videoUrl },
          storagePath: { stringValue: filename },
          contentType: { stringValue: contentType },
          uploadedAt: { timestampValue: new Date().toISOString() },
          status: { stringValue: "active" }
        }
      })
    });

    const data = await res.json();
    return new Response(JSON.stringify({ success: true, id: data.name.split("/").pop() }), { status: 200, headers });
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

function str2ab(str) {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0; i < str.length; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}
