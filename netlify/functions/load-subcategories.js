const { Storage } = require('@google-cloud/storage');
const storage = new Storage();
const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'taharah-77c8e.appspot.com';

exports.handler = async (event) => {
    try {
        const category = event.queryStringParameters.category;
        if (!category) {
            return { statusCode: 400, body: 'Missing category' };
        }

        const fileName = 'settings/subcategories.json';
        const file = storage.bucket(bucketName).file(fileName);
        
        let subcategories = {};
        try {
            const [content] = await file.download();
            subcategories = JSON.parse(content.toString());
        } catch (error) {
            console.log('Subcategories file not found');
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, subcategories: [] })
            };
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            },
            body: JSON.stringify({ 
                success: true, 
                subcategories: subcategories[category] || [] 
            })
        };
    } catch (error) {
        console.error('Error loading subcategories:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, error: error.message })
        };
    }
};
