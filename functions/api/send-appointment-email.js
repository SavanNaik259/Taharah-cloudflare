export async function onRequestPost({ request, env }) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  try {
    const { appointmentData } = await request.json();
    const resendApiKey = env.RESEND_API_KEY;
    const emailFrom = env.EMAIL_FROM;
    const ownerEmail = env.OWNER_EMAIL || env.EMAIL_USER;

    if (!resendApiKey || !emailFrom) {
      return new Response(JSON.stringify({ success: false, message: "Resend configuration missing" }), { status: 500, headers });
    }

    // Notify Owner
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `Taharah <${emailFrom}>`,
        to: [ownerEmail],
        subject: `New Appointment - ${appointmentData.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
            <h2 style="text-align: center; color: #c59d5f;">New Appointment Request</h2>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Customer Name:</strong> ${appointmentData.name}</p>
              <p><strong>Customer Email:</strong> ${appointmentData.email}</p>
              <p><strong>Date:</strong> ${appointmentData.date}</p>
              <p><strong>Time:</strong> ${appointmentData.time || 'Not specified'}</p>
              <p><strong>Service:</strong> ${appointmentData.service || 'Not specified'}</p>
              <p><strong>Message:</strong> ${appointmentData.message || 'No message provided'}</p>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #888; text-align: center;">Taharah Admin Notification</p>
          </div>
        `
      })
    });

    // Notify Customer
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `Taharah <${emailFrom}>`,
        to: [appointmentData.email],
        subject: "Appointment Booking Received - Taharah",
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
            <h2 style="text-align: center; color: #c59d5f;">Appointment Confirmation</h2>
            <p>Hello ${appointmentData.name},</p>
            <p>Thank you for booking an appointment with Taharah. We have received your request and will confirm it shortly.</p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Date:</strong> ${appointmentData.date}</p>
              <p><strong>Time:</strong> ${appointmentData.time || 'Not specified'}</p>
              <p><strong>Service:</strong> ${appointmentData.service || 'Not specified'}</p>
            </div>
            <p>If you need to reschedule, please contact us at <a href="mailto:officialtaharah@gmail.com">officialtaharah@gmail.com</a></p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #888; text-align: center;">Taharah - Pakistani Fashion</p>
          </div>
        `
      })
    });

    return new Response(JSON.stringify({ success: true, message: "Appointment emails sent" }), { status: 200, headers });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers });
  }
}