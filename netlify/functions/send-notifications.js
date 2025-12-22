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
        const { title, body, link, imageUrl, buttonText, sendToUsers, sendToGuests, category } = JSON.parse(event.body);
        const db = admin.firestore();
        const messaging = admin.messaging();

        // Collect tokens based on selected audience
        const tokens = new Set();
        let userTokenCount = 0;
        let guestTokenCount = 0;

        // Collect guest tokens if sendToGuests is true
        if (sendToGuests) {
            const guestSnap = await db.collection('guest_tokens').get();
            guestSnap.forEach(doc => {
                const token = doc.data().token;
                if (token) {
                    tokens.add(token);
                    guestTokenCount++;
                }
            });
        }
        
        // Collect user tokens if sendToUsers is true
        if (sendToUsers) {
            const userSnap = await db.collection('users').get();
            userSnap.forEach(doc => {
                (doc.data().pushTokens || []).forEach(t => {
                    if (t) {
                        tokens.add(t);
                        userTokenCount++;
                    }
                });
            });
        }

        const tokenList = Array.from(tokens).filter(t => typeof t === 'string' && t.length > 100);
        if (tokenList.length === 0) {
            return { 
                statusCode: 200, 
                headers: corsHeaders, 
                body: JSON.stringify({ 
                    success: true, 
                    stats: { userTokenCount: 0, guestTokenCount: 0, totalSent: 0 },
                    message: 'No tokens found to send notifications' 
                }) 
            };
        }

        // Create message - use data only, let service worker handle display
        // This prevents FCM from auto-displaying and causing duplicates
        const message = {
            data: { 
                title, 
                body, 
                link: link || '/',
                imageUrl: imageUrl || '',
                buttonText: buttonText || 'View',
                icon: '/images/logos/royalmeenakari.png',
                category: category || 'general'
            }
        };

        const response = await messaging.sendEachForMulticast({
            tokens: tokenList,
            ...message
        });

        console.log(`Notification sent successfully. Success: ${response.successCount}, Failed: ${response.failureCount}`);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                stats: {
                    userTokenCount: userTokenCount,
                    guestTokenCount: guestTokenCount,
                    totalSent: response.successCount
                },
                message: `Successfully sent to ${response.successCount} devices`,
                details: {
                    successCount: response.successCount,
                    failureCount: response.failureCount
                }
            })
        };
    } catch (error) {
        console.error('Send error:', error);
        return { 
            statusCode: 500, 
            headers: corsHeaders, 
            body: JSON.stringify({ 
                success: false,
                error: error.message 
            }) 
        };
    }
};
