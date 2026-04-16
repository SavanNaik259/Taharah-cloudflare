import { getFirebaseConfig } from '../utils/config.js';

async function getFirebaseAccessToken(env) {
  const serviceAccount = getFirebaseConfig(env);
  if (!serviceAccount.private_key || !serviceAccount.client_email) {
    throw new Error('Firebase service account credentials missing');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };

  const enc = new TextEncoder();
  const toBase64Url = (obj) => btoa(String.fromCharCode(...enc.encode(JSON.stringify(obj)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const headerB64 = toBase64Url(header);
  const payloadB64 = toBase64Url(payload);
  const signingInput = `${headerB64}.${payloadB64}`;

  const pemContents = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, enc.encode(signingInput));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const jwt = `${signingInput}.${sigB64}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) throw new Error('Failed to get Firebase access token: ' + JSON.stringify(tokenData));
  return tokenData.access_token;
}

async function firestoreQuery(projectId, accessToken, collectionPath, fieldPath, value) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: collectionPath }],
      where: {
        fieldFilter: {
          field: { fieldPath },
          op: 'EQUAL',
          value: { stringValue: value }
        }
      },
      limit: 1
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  return res.json();
}

async function firestorePatch(projectId, accessToken, documentPath, fields) {
  const firestoreFields = {};
  for (const [key, val] of Object.entries(fields)) {
    if (typeof val === 'string') {
      firestoreFields[key] = { stringValue: val };
    } else if (typeof val === 'boolean') {
      firestoreFields[key] = { booleanValue: val };
    } else if (typeof val === 'number') {
      firestoreFields[key] = { integerValue: String(val) };
    }
  }

  const updateMask = Object.keys(fields).map(k => `updateMask.fieldPaths=${k}`).join('&');
  const url = `https://firestore.googleapis.com/v1/${documentPath}?${updateMask}`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: firestoreFields })
  });

  return res.json();
}

async function firestoreCreate(projectId, accessToken, collectionPath, fields) {
  const firestoreFields = {};
  for (const [key, val] of Object.entries(fields)) {
    if (typeof val === 'string') {
      firestoreFields[key] = { stringValue: val };
    } else if (typeof val === 'boolean') {
      firestoreFields[key] = { booleanValue: val };
    } else if (typeof val === 'number') {
      firestoreFields[key] = { integerValue: String(val) };
    }
  }

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionPath}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: firestoreFields })
  });

  return res.json();
}

function extractStringField(doc, fieldName) {
  return doc?.fields?.[fieldName]?.stringValue || '';
}

function extractMapField(doc, fieldName) {
  const mapValue = doc?.fields?.[fieldName]?.mapValue?.fields;
  if (!mapValue) return {};
  const result = {};
  for (const [key, val] of Object.entries(mapValue)) {
    if (val.stringValue !== undefined) result[key] = val.stringValue;
    else if (val.integerValue !== undefined) result[key] = parseInt(val.integerValue);
    else if (val.doubleValue !== undefined) result[key] = val.doubleValue;
    else if (val.booleanValue !== undefined) result[key] = val.booleanValue;
  }
  return result;
}

async function verifyWebhookSignature(body, signature, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return expected === signature;
}

export async function onRequestPost({ request, env }) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('RAZORPAY_WEBHOOK_SECRET is not configured');
      return new Response(JSON.stringify({ success: false, message: 'Webhook secret not configured' }), { status: 500, headers });
    }

    const rawBody = await request.text();
    const razorpaySignature = request.headers.get('x-razorpay-signature');

    if (!razorpaySignature) {
      console.error('Missing x-razorpay-signature header');
      return new Response(JSON.stringify({ success: false, message: 'Missing signature' }), { status: 400, headers });
    }

    const isValid = await verifyWebhookSignature(rawBody, razorpaySignature, webhookSecret);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response(JSON.stringify({ success: false, message: 'Invalid signature' }), { status: 401, headers });
    }

    const event = JSON.parse(rawBody);
    console.log('Razorpay webhook event received:', event.event);

    if (event.event !== 'payment.captured') {
      console.log('Ignoring non-capture event:', event.event);
      return new Response(JSON.stringify({ success: true, message: 'Event ignored' }), { status: 200, headers });
    }

    const payment = event.payload?.payment?.entity;
    if (!payment) {
      console.error('No payment entity in webhook payload');
      return new Response(JSON.stringify({ success: false, message: 'Invalid payload' }), { status: 400, headers });
    }

    const razorpayOrderId = payment.order_id;
    const razorpayPaymentId = payment.id;
    const amountPaid = payment.amount / 100;
    const customerEmail = payment.email;
    const customerPhone = payment.contact;

    console.log(`Processing payment capture: order=${razorpayOrderId}, payment=${razorpayPaymentId}, amount=${amountPaid}`);

    const projectId = env.FIREBASE_PROJECT_ID;
    if (!projectId) {
      console.error('FIREBASE_PROJECT_ID not configured');
      return new Response(JSON.stringify({ success: true, message: 'Webhook received but Firebase not configured' }), { status: 200, headers });
    }

    let accessToken;
    try {
      accessToken = await getFirebaseAccessToken(env);
    } catch (authError) {
      console.error('Failed to authenticate with Firebase:', authError.message);
      return new Response(JSON.stringify({ success: true, message: 'Webhook received but Firebase auth failed' }), { status: 200, headers });
    }

    let orderDoc = null;
    let orderDocPath = null;

    const usersUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users?pageSize=100`;
    const usersRes = await fetch(usersUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const usersData = await usersRes.json();

    if (usersData.documents) {
      for (const userDoc of usersData.documents) {
        const userId = userDoc.name.split('/').pop();
        const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}/orders:runQuery`;
        const queryBody = {
          structuredQuery: {
            from: [{ collectionId: 'orders' }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'razorpayOrderId' },
                op: 'EQUAL',
                value: { stringValue: razorpayOrderId }
              }
            },
            limit: 1
          }
        };

        try {
          const queryRes = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...queryBody,
              parent: `projects/${projectId}/databases/(default)/documents/users/${userId}`
            })
          });
          const queryResult = await queryRes.json();

          if (Array.isArray(queryResult) && queryResult[0]?.document) {
            orderDoc = queryResult[0].document;
            orderDocPath = orderDoc.name;
            console.log('Found order in user collection:', orderDocPath);
            break;
          }
        } catch (queryError) {
          console.warn(`Error querying orders for user ${userId}:`, queryError.message);
        }
      }
    }

    if (!orderDoc) {
      try {
        const guestQueryRes = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parent: `projects/${projectId}/databases/(default)/documents`,
            structuredQuery: {
              from: [{ collectionId: 'guest-orders' }],
              where: {
                fieldFilter: {
                  field: { fieldPath: 'razorpayOrderId' },
                  op: 'EQUAL',
                  value: { stringValue: razorpayOrderId }
                }
              },
              limit: 1
            }
          })
        });
        const guestResult = await guestQueryRes.json();

        if (Array.isArray(guestResult) && guestResult[0]?.document) {
          orderDoc = guestResult[0].document;
          orderDocPath = orderDoc.name;
          console.log('Found order in guest-orders collection:', orderDocPath);
        }
      } catch (guestError) {
        console.warn('Error querying guest orders:', guestError.message);
      }
    }

    if (!orderDoc) {
      console.warn(`No order found for razorpayOrderId: ${razorpayOrderId}. Payment ID: ${razorpayPaymentId}`);
      return new Response(JSON.stringify({ success: true, message: 'Webhook received but no matching order found' }), { status: 200, headers });
    }

    const currentPaymentStatus = extractStringField(orderDoc, 'paymentStatus');
    if (currentPaymentStatus === 'paid') {
      console.log('Order already marked as paid, skipping update');
      return new Response(JSON.stringify({ success: true, message: 'Order already processed' }), { status: 200, headers });
    }

    console.log('Updating order payment status to paid...');
    const updateResult = await fetch(`https://firestore.googleapis.com/v1/${orderDocPath}?updateMask.fieldPaths=paymentStatus&updateMask.fieldPaths=paymentId&updateMask.fieldPaths=webhookProcessed&updateMask.fieldPaths=webhookProcessedAt`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          paymentStatus: { stringValue: 'paid' },
          paymentId: { stringValue: razorpayPaymentId },
          webhookProcessed: { booleanValue: true },
          webhookProcessedAt: { stringValue: new Date().toISOString() }
        }
      })
    });

    if (updateResult.ok) {
      console.log('Order payment status updated to paid via webhook');
    } else {
      const updateError = await updateResult.text();
      console.error('Failed to update order:', updateError);
    }

    const orderReference = extractStringField(orderDoc, 'orderReference');
    const customer = extractMapField(orderDoc, 'customer');
    const paymentMethod = extractStringField(orderDoc, 'paymentMethod') || 'razorpay';
    const orderDate = extractStringField(orderDoc, 'orderDate');

    const notificationId = Date.now().toString();
    const notificationFields = {
      id: notificationId,
      message: `New order needs confirmation: ${customer.firstName || ''} ${customer.lastName || ''} - Payment captured via webhook`,
      timestamp: new Date().toISOString(),
      type: 'admin-order-pending',
      read: false,
      category: 'new-order',
      priority: 'high',
      source: 'razorpay-webhook',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const notifUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/adminNotifications/${notificationId}`;
      await fetch(notifUrl, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: Object.fromEntries(
            Object.entries(notificationFields).map(([k, v]) => {
              if (typeof v === 'string') return [k, { stringValue: v }];
              if (typeof v === 'boolean') return [k, { booleanValue: v }];
              if (typeof v === 'number') return [k, { integerValue: String(v) }];
              return [k, { stringValue: String(v) }];
            })
          )
        })
      });
      console.log('Admin notification created via webhook');
    } catch (notifError) {
      console.warn('Failed to create admin notification via webhook:', notifError.message);
    }

    if (customer.email) {
      try {
        const resendApiKey = env.RESEND_API_KEY;
        const emailFrom = env.EMAIL_FROM;
        const ownerEmail = env.OWNER_EMAIL || 'officialtaharah@gmail.com';

        if (resendApiKey && emailFrom) {
          const emailOrderData = {
            customer,
            orderReference,
            orderDate,
            orderTotal: amountPaid,
            paymentMethod,
            userSelectedCurrency: 'INR'
          };

          const emailUrl = new URL('/api/send-order-email', request.url);
          const emailRes = await fetch(emailUrl.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderData: emailOrderData })
          });
          const emailResult = await emailRes.json();
          console.log('Webhook email result:', emailResult.success ? 'sent' : emailResult.message);
        } else {
          console.warn('Email configuration missing, skipping webhook email');
        }
      } catch (emailError) {
        console.warn('Failed to send email via webhook:', emailError.message);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Payment captured and order updated',
      orderId: orderDocPath?.split('/').pop(),
      paymentId: razorpayPaymentId
    }), { status: 200, headers });

  } catch (error) {
    console.error('Webhook processing error:', error.message);
    return new Response(JSON.stringify({ success: true, message: 'Webhook received' }), { status: 200, headers });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-razorpay-signature'
    }
  });
}
