export async function onRequestPost({ request, env }) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  try {
    const { email, name, token } = await request.json();
    const resendApiKey = env.RESEND_API_KEY;
    const emailFrom = env.EMAIL_FROM;

    if (!resendApiKey || !emailFrom) {
      return new Response(JSON.stringify({ success: false, message: "Resend configuration missing" }), { status: 500, headers });
    }

    const resetUrl = `${new URL(request.url).origin}/reset-password.html?token=${token}&email=${encodeURIComponent(email)}`;
    const resetUrlFinal = resetUrl.replace('/api/send-password-reset-email', '');

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `Taharah <${emailFrom}>`,
        to: [email],
        subject: "Reset your password - Taharah",
        html: `<p>Hello ${name || 'User'},</p><p>You requested a password reset. Click the link below to proceed:</p><p><a href="${resetUrlFinal}">${resetUrlFinal}</a></p>`
      })
    });

    const result = await resendResponse.json();

    if (resendResponse.ok) {
      return new Response(JSON.stringify({ success: true, id: result.id }), { status: 200, headers });
    } else {
      return new Response(JSON.stringify({ success: false, error: result }), { status: 500, headers });
    }
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers });
  }
}