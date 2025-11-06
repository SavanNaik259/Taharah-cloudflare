
/**
 * Firebase Reviews Manager
 * Handles saving and loading product reviews in Firestore
 * Reviews are stored at path: products/{productId}/reviews/{reviewId}
 */

window.FirebaseReviewsManager = (function() {
    let db, auth;
    let initialized = false;

    function init() {
        if (initialized) return true;
        
        if (!window.firebase) {
            console.error('Firebase not available for Reviews Manager');
            return false;
        }

        try {
            db = firebase.firestore();
            auth = firebase.auth();
            initialized = true;
            console.log('Firebase Reviews Manager initialized');
            return true;
        } catch (error) {
            console.error('Error initializing Firebase Reviews Manager:', error);
            return false;
        }
    }

    /**
     * Submit a product review
     * @param {Object} reviewData - Review information
     * @returns {Promise<Object>} - Success status and review ID
     */
    async function submitReview(reviewData) {
        if (!init()) return { success: false, error: 'Firebase not initialized' };
        
        const user = auth.currentUser;
        if (!user) return { success: false, error: 'User not authenticated' };

        // Validate review data
        if (!reviewData.productId || !reviewData.rating || !reviewData.comment) {
            return { success: false, error: 'Missing required review data' };
        }

        if (reviewData.rating < 1 || reviewData.rating > 5) {
            return { success: false, error: 'Rating must be between 1 and 5' };
        }

        try {
            // Generate a unique ID for the review
            const reviewId = db.collection('temp').doc().id;
            
            const reviewToSave = {
                id: reviewId,
                productId: reviewData.productId,
                productName: reviewData.productName || '',
                orderId: reviewData.orderId || '',
                userId: user.uid,
                userEmail: user.email,
                userName: reviewData.userName || user.displayName || user.email.split('@')[0],
                rating: parseInt(reviewData.rating),
                comment: reviewData.comment.trim(),
                images: reviewData.images || [],
                verified: true, // Mark as verified purchase
                createdAt: firebase.firestore.Timestamp.now(),
                updatedAt: firebase.firestore.Timestamp.now()
            };

            // First, ensure the product document exists or create a placeholder
            const productRef = db.collection('products').doc(reviewData.productId);
            const productDoc = await productRef.get();
            
            if (!productDoc.exists) {
                // Create a minimal product document if it doesn't exist
                await productRef.set({
                    id: reviewData.productId,
                    name: reviewData.productName || 'Product',
                    createdAt: firebase.firestore.Timestamp.now()
                }, { merge: true });
                console.log('Created product document for reviews:', reviewData.productId);
            }

            // Save to Firestore at products/{productId}/reviews/{reviewId}
            await productRef.collection('reviews').doc(reviewId).set(reviewToSave);
            
            console.log('Review saved successfully:', reviewId);
            return { success: true, reviewId: reviewId, review: reviewToSave };
        } catch (error) {
            console.error('Error saving review:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Load reviews for a product
     * @param {String} productId - Product ID
     * @returns {Promise<Object>} - Success status and reviews array
     */
    async function loadProductReviews(productId) {
        if (!init()) return { success: false, error: 'Firebase not initialized' };

        try {
            const reviewsSnapshot = await db.collection('products')
                .doc(productId)
                .collection('reviews')
                .orderBy('createdAt', 'desc')
                .get();

            const reviews = [];
            reviewsSnapshot.forEach(doc => {
                reviews.push({ id: doc.id, ...doc.data() });
            });

            console.log(`Loaded ${reviews.length} reviews for product ${productId}`);
            return { success: true, reviews: reviews };
        } catch (error) {
            console.error('Error loading reviews:', error);
            return { success: false, error: error.message, reviews: [] };
        }
    }

    /**
     * Check if user has already reviewed a product in an order
     * @param {String} productId - Product ID
     * @param {String} orderId - Order ID
     * @returns {Promise<Boolean>} - True if review exists
     */
    async function hasUserReviewed(productId, orderId) {
        if (!init()) return false;
        
        const user = auth.currentUser;
        if (!user) return false;

        try {
            const reviewsSnapshot = await db.collection('products')
                .doc(productId)
                .collection('reviews')
                .where('userId', '==', user.uid)
                .where('orderId', '==', orderId)
                .limit(1)
                .get();

            return !reviewsSnapshot.empty;
        } catch (error) {
            console.error('Error checking review status:', error);
            return false;
        }
    }

    // Initialize when script loads
    init();

    return {
        submitReview,
        loadProductReviews,
        hasUserReviewed,
        init
    };
})();
