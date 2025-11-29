// Send notification - service worker will handle display
        const message = {
          token: token,
          notification: {
            title: title,
            body: body
          },
          data: {
            link: link || '/',
            image: image || '/images/logos/royalmeenakari.png',
            buttonText: buttonText || 'View Offer'
          },
          webpush: {
            fcmOptions: {
              link: link || '/'
            },
            headers: {
              Urgency: 'high'
            }
          }
        };

        // Only add image to notification if provided
        if (image) {
          message.notification.image = image;
        }

        const response = await admin.messaging().send(message);