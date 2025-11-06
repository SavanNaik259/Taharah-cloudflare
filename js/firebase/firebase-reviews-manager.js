
/**
 * Firebase Reviews Manager
 * Handles product review submissions, image uploads, and retrieval
 */

window.FirebaseReviewsManager = (function() {
  let db, storage, auth;

  function init() {
    if (!window.firebase) {
      console.error('Firebase not initialized');
      return false;
    }

    try {
      db = firebase.firestore();
      storage = firebase.storage();
      auth = firebase.auth();
      return true;
    } catch (error) {
      console.error('Error initializing Firebase Reviews Manager:', error);
      return false;
    }
  }

  /**
   * Upload review images to Firebase Storage
   * @param {Array} files - Array of image files
   * @param {String} reviewId - Unique review ID
   * @returns {Promise<Array>} Array of image URLs
   */
  async function uploadReviewImages(files, reviewId) {
    if (!init()) {
      throw new Error('Firebase not initialized');
    }

    const uploadPromises = files.map(async (file, index) => {
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const fileName = `reviews/${reviewId}_${timestamp}_${index}_${randomId}.jpg`;
      const storageRef = storage.ref(fileName);

      // Upload with metadata for CDN caching
      const metadata = {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000',
        customMetadata: {
          reviewId: reviewId,
          uploadedAt: new Date().toISOString()
        }
      };

      await storageRef.put(file, metadata);
      const downloadURL = await storageRef.getDownloadURL();
      return downloadURL;
    });

    return Promise.all(uploadPromises);
  }

  /**
   * Submit a product review
   * @param {Object} reviewData - Review data including rating, comment, images
   * @returns {Promise<Object>} Success status and review ID
   */
  async function submitReview(reviewData) {
    if (!init()) {
      return { success: false, error: 'Firebase not initialized' };
    }

    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'User must be logged in to submit a review' };
    }

    try {
      // Generate unique review ID
      const reviewId = `REVIEW-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      // Upload images if provided
      let imageUrls = [];
      if (reviewData.images && reviewData.images.length > 0) {
        imageUrls = await uploadReviewImages(reviewData.images, reviewId);
      }

      // Create review document
      const review = {
        reviewId: reviewId,
        productId: reviewData.productId,
        productName: reviewData.productName,
        orderId: reviewData.orderId,
        userId: user.uid,
        userEmail: user.email,
        userName: reviewData.userName || user.displayName || user.email.split('@')[0],
        rating: reviewData.rating,
        comment: reviewData.comment || '',
        images: imageUrls,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        verified: true, // Verified purchase
        helpful: 0,
        reported: false
      };

      // Save to Firestore
      await db.collection('productReviews').doc(reviewId).set(review);

      // Update order with review submitted flag
      await db.collection('users')
        .doc(user.uid)
        .collection('orders')
        .doc(reviewData.orderId)
        .update({
          [`reviewSubmitted.${reviewData.productId}`]: true,
          reviewSubmittedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

      return { success: true, reviewId: reviewId };
    } catch (error) {
      console.error('Error submitting review:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get reviews for a specific product
   * @param {String} productId - Product ID
   * @returns {Promise<Object>} Success status and reviews array
   */
  async function getProductReviews(productId) {
    if (!init()) {
      return { success: false, error: 'Firebase not initialized' };
    }

    try {
      const reviewsSnapshot = await db.collection('productReviews')
        .where('productId', '==', productId)
        .orderBy('createdAt', 'desc')
        .get();

      const reviews = reviewsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));

      // Calculate average rating
      const avgRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

      return {
        success: true,
        reviews: reviews,
        averageRating: avgRating,
        totalReviews: reviews.length
      };
    } catch (error) {
      console.error('Error getting product reviews:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user has already reviewed a product for a specific order
   * @param {String} orderId - Order ID
   * @param {String} productId - Product ID
   * @returns {Promise<Boolean>} True if already reviewed
   */
  async function hasUserReviewed(orderId, productId) {
    if (!init()) return false;

    const user = auth.currentUser;
    if (!user) return false;

    try {
      const orderDoc = await db.collection('users')
        .doc(user.uid)
        .collection('orders')
        .doc(orderId)
        .get();

      if (!orderDoc.exists) return false;

      const orderData = orderDoc.data();
      return orderData.reviewSubmitted?.[productId] === true;
    } catch (error) {
      console.error('Error checking review status:', error);
      return false;
    }
  }

  return {
    submitReview,
    getProductReviews,
    hasUserReviewed,
    uploadReviewImages
  };
})();
