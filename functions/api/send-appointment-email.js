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
        html: `<p>New appointment request from ${appointmentData.name}</p><p>Email: ${appointmentData.email}</p><p>Date: ${appointmentData.date}</p>`
      })
    });

    return new Response(JSON.stringify({ success: true, message: "Appointment emails sent" }), { status: 200, headers });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers });
  }
}