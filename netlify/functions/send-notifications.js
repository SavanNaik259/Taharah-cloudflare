const admin = require('firebase-admin');

const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

function initAdmin() {
    if (admin.apps.length > 0) return;
    
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (!privateKey) throw new Error('Missing FIREBASE_PRIVATE_KEY');

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey.replace(/\\n/g, '\n')
        })
    });
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders, body: '' };
    
    try {
        initAdmin();
        const { title, body, link } = JSON.parse(event.body);
        const db = admin.firestore();
        const messaging = admin.messaging();

        // Collect tokens
        const tokens = new Set();
        const guestSnap = await db.collection('guest_tokens').get();
        guestSnap.forEach(doc => tokens.add(doc.data().token));
        
        const userSnap = await db.collection('users').get();
        userSnap.forEach(doc => {
            (doc.data().pushTokens || []).forEach(t => tokens.add(t));
        });

        const tokenList = Array.from(tokens).filter(t => typeof t === 'string' && t.length > 100);
        if (tokenList.length === 0) return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, count: 0 }) };

        // For Web Push, including both 'notification' AND 'webpush.notification' (or manual SW handling)
        // often causes duplicates. We'll use 'data' for our custom SW logic to avoid double-display.
        const message = {
            data: { 
                title, 
                body, 
                link: link || '/',
                icon: '/images/logos/royalmeenakari.png'
            },
            webpush: {
                fcmOptions: { link: link || '/' }
            }
        };

        const response = await messaging.sendEachForMulticast({
            tokens: tokenList,
            ...message
        });

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                sent: response.successCount,
                failed: response.failureCount
            })
        };
    } catch (error) {
        console.error('Send error:', error);
        return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: error.message }) };
    }
};
