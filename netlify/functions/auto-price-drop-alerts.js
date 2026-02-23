const admin = require('firebase-admin');

const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

function initAdmin() {
    if (admin.apps.length > 0) return;
    
    const privateKey = process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") : undefined;
    
    if (!privateKey) {
        throw new Error('FIREBASE_PRIVATE_KEY is missing');
    }

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
            privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
            client_x509_cert_url: process.env.FIREBASE_CERT_URL
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders, body: '' };
    
    try {
        initAdmin();
        
        console.log('[auto-price-drop-alerts] Price drop notification triggered');
        
        const requestData = JSON.parse(event.body || '{}');
        const { productId, productName, productImage, oldPrice, newPrice } = requestData;
        
        if (!productId || !productName || !oldPrice || !newPrice) {
            throw new Error('Missing required product data');
        }

        const db = admin.firestore();
        const messaging = admin.messaging();

        const tokens = new Set();
        const guestSnap = await db.collection('guest_tokens').get();
        guestSnap.forEach(doc => { if (doc.data().token) tokens.add(doc.data().token); });
        
        const userSnap = await db.collection('users').get();
        userSnap.forEach(doc => {
            (doc.data().pushTokens || []).forEach(t => { if (t) tokens.add(t); });
        });

        const tokenList = Array.from(tokens).filter(t => typeof t === 'string' && t.length > 100);
        
        if (tokenList.length === 0) {
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, message: 'No tokens found' }) };
        }

        const savings = oldPrice - newPrice;
        const savingsPercent = Math.round((savings / oldPrice) * 100);
        
        const dataPayload = {
            title: '📉 Price Drop Alert!',
            body: `${productName} is now just ₹${Math.round(newPrice)}! Save ₹${Math.round(savings)} (${savingsPercent}%)`,
            link: `/product-detail.html?id=${encodeURIComponent(productId)}`,
            imageUrl: productImage || '',
            buttonText: 'View Deal',
            icon: '/images/logos/royalmeenakari.png',
            tag: 'taharah-price-drop',
            timestamp: Date.now().toString()
        };

        const message = {
            data: dataPayload,
            webpush: {
                headers: { 'TTL': '86400', 'Urgency': 'high' },
                fcm_options: { link: dataPayload.link }
            }
        };

        const response = await messaging.sendEachForMulticast({ tokens: tokenList, ...message });

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                stats: { totalSent: response.successCount },
                message: `Successfully sent price drop alert to ${response.successCount} devices`
            })
        };
    } catch (error) {
        console.error('[auto-price-drop-alerts] Send error:', error);
        return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ success: false, error: error.message }) };
    }
};
