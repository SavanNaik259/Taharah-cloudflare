/**
 * Firebase Alert Triggers
 * Handles automatic notifications for 4 scenarios
 */

class FirebaseAlertTriggers {
  static async monitorProductChanges() {
    console.log('🔔 Starting product monitoring for alerts...');
    const db = firebase.firestore();

    // Monitor all products in real-time
    db.collectionGroup('products').onSnapshot(async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type === 'added') {
          await this.handleNewProductAlert(change.doc);
        } else if (change.type === 'modified') {
          await this.handlePriceDropAlert(change.doc);
          await this.handleBackInStockAlert(change.doc);
          await this.handleLowStockAlert(change.doc);
        }
      }
    });
  }

  static async handleNewProductAlert(productDoc) {
    try {
      const product = productDoc.data();
      if (!product.isNewProduct) return;

      console.log('✨ New Product Alert:', product.productName);

      const notification = {
        title: '✨ New Arrival!',
        body: product.productName,
        image: product.image,
        data: {
          link: `/product-detail.html?id=${productDoc.id}`,
          type: 'new_product'
        }
      };

      await this.broadcastNotification(notification);
    } catch (error) {
      console.error('❌ Error handling new product alert:', error);
    }
  }

  static async handleBackInStockAlert(productDoc) {
    try {
      const product = productDoc.data();
      const previousStock = productDoc.metadata?.previousStock || 0;
      const currentStock = product.stock || 0;

      // Alert if previously out of stock and now in stock
      if (previousStock === 0 && currentStock > 0) {
        console.log('📦 Back-in-Stock Alert:', product.productName);

        const notification = {
          title: '📦 Back in Stock!',
          body: `${product.productName} is available again`,
          image: product.image,
          data: {
            link: `/product-detail.html?id=${productDoc.id}`,
            type: 'back_in_stock'
          }
        };

        // Send to users with this product in wishlist
        await this.notifyWishlistUsers(productDoc.id, notification);
      }
    } catch (error) {
      console.error('❌ Error handling back-in-stock alert:', error);
    }
  }

  static async handlePriceDropAlert(productDoc) {
    try {
      const product = productDoc.data();
      const previousPrice = productDoc.metadata?.previousPrice || product.price;
      const currentPrice = product.price || 0;
      const priceDropPercent = 15; // from admin settings

      const percentageDrop = ((previousPrice - currentPrice) / previousPrice) * 100;

      if (percentageDrop >= priceDropPercent) {
        const savedAmount = previousPrice - currentPrice;
        console.log('💰 Price Drop Alert:', product.productName, `Save ₹${savedAmount}`);

        const notification = {
          title: `💰 Price Drop! Save ₹${Math.round(savedAmount)}`,
          body: `${product.productName} now ₹${Math.round(currentPrice)}`,
          image: product.image,
          data: {
            link: `/product-detail.html?id=${productDoc.id}`,
            type: 'price_drop'
          }
        };

        await this.broadcastNotification(notification);
      }
    } catch (error) {
      console.error('❌ Error handling price drop alert:', error);
    }
  }

  static async handleLowStockAlert(productDoc) {
    try {
      const product = productDoc.data();
      const lowStockThreshold = 3;
      const currentStock = product.stock || 0;

      if (currentStock > 0 && currentStock <= lowStockThreshold) {
        console.log('⚡ Low Stock Alert:', product.productName);

        const notification = {
          title: '⚡ Hurry! Only ' + currentStock + ' Left',
          body: product.productName + ' selling fast',
          image: product.image,
          data: {
            link: `/product-detail.html?id=${productDoc.id}`,
            type: 'low_stock'
          }
        };

        // Send to users who recently viewed this product
        await this.notifyRecentViewers(productDoc.id, notification);
      }
    } catch (error) {
      console.error('❌ Error handling low stock alert:', error);
    }
  }

  static async notifyWishlistUsers(productId, notification) {
    try {
      const db = firebase.firestore();
      const wishlistDocs = await db.collectionGroup('wishlist').where('productId', '==', productId).get();

      for (const doc of wishlistDocs.docs) {
        const userId = doc.ref.parent.parent.id;
        await this.sendNotificationToUser(userId, notification);
      }
    } catch (error) {
      console.error('❌ Error notifying wishlist users:', error);
    }
  }

  static async notifyRecentViewers(productId, notification) {
    try {
      const db = firebase.firestore();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const viewerDocs = await db.collectionGroup('productViews')
        .where('productId', '==', productId)
        .where('timestamp', '>=', sevenDaysAgo)
        .get();

      for (const doc of viewerDocs.docs) {
        const userId = doc.ref.parent.parent.id;
        await this.sendNotificationToUser(userId, notification);
      }
    } catch (error) {
      console.error('❌ Error notifying recent viewers:', error);
    }
  }

  static async broadcastNotification(notification) {
    try {
      const db = firebase.firestore();
      const usersSnapshot = await db.collection('users').where('notificationsEnabled', '==', true).get();

      for (const doc of usersSnapshot.docs) {
        await this.sendNotificationToUser(doc.id, notification);
      }

      // Also send to guest users
      const guestTokensSnapshot = await db.collection('guest_tokens').get();
      for (const doc of guestTokensSnapshot.docs) {
        const tokens = doc.data().tokens || [];
        for (const token of tokens) {
          await this.sendNotificationToServer(token, notification);
        }
      }
    } catch (error) {
      console.error('❌ Error broadcasting notification:', error);
    }
  }

  static async sendNotificationToUser(userId, notification) {
    try {
      const db = firebase.firestore();
      const userDoc = await db.collection('users').doc(userId).get();
      const tokens = userDoc.data()?.fcmTokens || [];

      for (const token of tokens) {
        await this.sendNotificationToServer(token, notification);
      }
    } catch (error) {
      console.error('❌ Error sending to user:', error);
    }
  }

  static async sendNotificationToServer(token, notification) {
    try {
      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fcmToken: token,
          title: notification.title,
          body: notification.body,
          image: notification.image,
          data: notification.data
        })
      });

      const result = await response.json();
      console.log('✅ Notification sent:', result);
    } catch (error) {
      console.error('❌ Error sending to server:', error);
    }
  }
}

// Start monitoring on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    FirebaseAlertTriggers.monitorProductChanges();
  });
} else {
  FirebaseAlertTriggers.monitorProductChanges();
}

window.FirebaseAlertTriggers = FirebaseAlertTriggers;
