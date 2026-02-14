const { Storage } = require('@google-cloud/storage');
const storage = new Storage();
const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'taharah-77c8e.appspot.com';

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { category, subcategory } = JSON.parse(event.body);
        if (!category || !subcategory) {
            return { statusCode: 400, body: 'Missing category or subcategory' };
        }

        const fileName = 'settings/subcategories.json';
        const file = storage.bucket(bucketName).file(fileName);
        
        let subcategories = {};
        try {
            const [content] = await file.download();
            subcategories = JSON.parse(content.toString());
        } catch (error) {
            console.log('Subcategories file not found, creating new one');
        }

        if (!subcategories[category]) {
            subcategories[category] = [];
        }

        if (!subcategories[category].includes(subcategory)) {
            subcategories[category].push(subcategory);
            await file.save(JSON.stringify(subcategories, null, 2), {
                contentType: 'application/json',
                metadata: {
                    cacheControl: 'public, max-age=0, no-cache'
                }
            });
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, message: 'Subcategory synced' })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: 'Subcategory already exists' })
        };
    } catch (error) {
        console.error('Error syncing subcategory:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, error: error.message })
        };
    }
};
