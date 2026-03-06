export async function onRequestPost({ request, env }) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  try {
    const { contactData } = await request.json();
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
        subject: `New Contact Message - ${contactData.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
            <h2 style="text-align: center; color: #c59d5f;">New Contact Inquiry</h2>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Name:</strong> ${contactData.name}</p>
              <p><strong>Email:</strong> ${contactData.email}</p>
              <p><strong>Subject:</strong> ${contactData.subject || 'No subject'}</p>
              <p><strong>Message:</strong></p>
              <p style="white-space: pre-wrap;">${contactData.message}</p>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #888; text-align: center;">Taharah Admin Notification</p>
          </div>
        `
      })
    });

    // Notify Customer (Auto-reply)
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `Taharah <${emailFrom}>`,
        to: [contactData.email],
        subject: "We've received your message - Taharah",
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
            <h2 style="text-align: center; color: #c59d5f;">Thank You for Contacting Us</h2>
            <p>Hello ${contactData.name},</p>
            <p>We have received your message and will get back to you as soon as possible.</p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; font-style: italic;">
              "Your message has been logged and our team is reviewing it."
            </div>
            <p>Best regards,<br>Taharah Team</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #888; text-align: center;">Taharah - Pakistani Fashion</p>
          </div>
        `
      })
    });

    return new Response(JSON.stringify({ success: true, message: "Contact email sent" }), { status: 200, headers });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers });
  }
}