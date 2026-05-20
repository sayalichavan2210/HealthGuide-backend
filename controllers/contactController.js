// controllers/contactController.js
const nodemailer = require("nodemailer");

const createTransporter = () =>
  nodemailer.createTransport({
    host:   process.env.EMAIL_HOST   || "smtp.gmail.com",
    port:   Number(process.env.EMAIL_PORT) || 465 ,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

exports.submitContact = async (req, res) => {
  try {
    const { name, email, subject, message, phone } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: "Name, email aur message required hai" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: "Valid email daalo" });
    }

    const transporter = createTransporter();
    const submittedAt = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    // ── 1. Admin ko notification email ────────────────────
    const adminHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#080c18;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#080c18;padding:32px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#0d1225;border-radius:16px;border:1px solid #1a2340;overflow:hidden;max-width:560px;width:100%;">

  <tr><td style="background:linear-gradient(90deg,#4ADE80,#22c55e);height:3px;font-size:0;">&nbsp;</td></tr>

  <tr><td style="padding:28px 32px;border-bottom:1px solid #1a2340;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle;">
        <div style="display:inline-block;background:#0a1a10;border:1px solid #1a3a20;border-radius:10px;padding:8px 14px;font-size:13px;font-weight:600;color:#4ADE80;">🏥 HealthGuard AI</div>
        <p style="margin:10px 0 0;font-size:20px;font-weight:700;color:#e8f0fe;">New Contact Request</p>
        <p style="margin:4px 0 0;font-size:12px;color:#3d4d70;">${submittedAt}</p>
      </td>
      <td align="right" style="vertical-align:top;">
        <span style="background:#0a1a10;border:1px solid #1a3a20;border-radius:20px;padding:5px 14px;font-size:11px;color:#4ADE80;font-weight:600;">● New Message</span>
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:28px 32px;">
    <p style="margin:0 0 18px;font-size:11px;font-weight:700;color:#3d4d70;letter-spacing:0.1em;text-transform:uppercase;">Sender Details</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
      <tr>
        <td width="48%" style="padding-bottom:10px;">
          <div style="background:#080c18;border:1px solid #1a2340;border-radius:10px;padding:14px 16px;">
            <p style="margin:0 0 5px;font-size:11px;color:#3d4d70;text-transform:uppercase;letter-spacing:0.06em;">Name</p>
            <p style="margin:0;font-size:15px;font-weight:600;color:#e8f0fe;">${name}</p>
          </div>
        </td>
        <td width="4%"></td>
        <td width="48%" style="padding-bottom:10px;">
          <div style="background:#080c18;border:1px solid #1a2340;border-radius:10px;padding:14px 16px;">
            <p style="margin:0 0 5px;font-size:11px;color:#3d4d70;text-transform:uppercase;letter-spacing:0.06em;">Email</p>
            <p style="margin:0;font-size:14px;font-weight:600;color:#4ADE80;">${email}</p>
          </div>
        </td>
      </tr>
      ${phone ? `<tr><td colspan="3">
        <div style="background:#080c18;border:1px solid #1a2340;border-radius:10px;padding:14px 16px;margin-bottom:10px;">
          <p style="margin:0 0 5px;font-size:11px;color:#3d4d70;text-transform:uppercase;letter-spacing:0.06em;">Phone</p>
          <p style="margin:0;font-size:15px;font-weight:600;color:#e8f0fe;">${phone}</p>
        </div>
      </td></tr>` : ""}
      <tr><td colspan="3">
        <div style="background:#080c18;border:1px solid #1a2340;border-radius:10px;padding:14px 16px;">
          <p style="margin:0 0 5px;font-size:11px;color:#3d4d70;text-transform:uppercase;letter-spacing:0.06em;">Subject</p>
          <p style="margin:0;font-size:15px;font-weight:600;color:#e8f0fe;">${subject || "General Inquiry"}</p>
        </div>
      </td></tr>
    </table>

    <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#3d4d70;letter-spacing:0.1em;text-transform:uppercase;">Message</p>
    <div style="background:#080c18;border:1px solid #1a2340;border-left:3px solid #4ADE80;border-radius:10px;padding:18px 20px;">
      <p style="margin:0;font-size:14px;color:#a8b8d8;line-height:1.7;">${message.replace(/\n/g, "<br>")}</p>
    </div>

    <div style="margin-top:22px;padding:14px 18px;background:#0a1a10;border:1px solid #1a3a20;border-radius:10px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#3d5a40;">Reply directly to: <a href="mailto:${email}" style="color:#4ADE80;text-decoration:none;font-weight:600;">${email}</a></p>
    </div>
  </td></tr>

  <tr><td style="background:#080c18;border-top:1px solid #1a2340;padding:14px 32px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#2a3a5a;">HealthGuard AI Admin Panel &bull; ${new Date().toLocaleDateString("en-IN")}</p>
  </td></tr>

  <tr><td style="background:linear-gradient(90deg,#4ADE80,#22c55e);height:3px;font-size:0;">&nbsp;</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

    // ── 2. User ko thank you email ────────────────────────
    const userHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#080c18;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#080c18;padding:32px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#0d1225;border-radius:16px;border:1px solid #1a2340;overflow:hidden;max-width:560px;width:100%;">

  <tr><td style="background:linear-gradient(90deg,#4ADE80,#22c55e);height:3px;font-size:0;">&nbsp;</td></tr>

  <!-- Hero -->
  <tr><td style="padding:40px 32px 28px;text-align:center;border-bottom:1px solid #1a2340;">
    <div style="width:64px;height:64px;background:#0a1a10;border:1px solid #1a3a20;border-radius:50%;margin:0 auto 18px;text-align:center;line-height:64px;font-size:28px;">🏥</div>
    <p style="margin:0 0 6px;font-size:24px;font-weight:700;color:#e8f0fe;letter-spacing:-0.02em;">Thank You, ${name.split(" ")[0]}!</p>
    <p style="margin:0;font-size:14px;color:#3d4d70;line-height:1.6;">We've received your message and will get back to you shortly.</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:28px 32px;">

    <!-- What happens next -->
    <p style="margin:0 0 16px;font-size:11px;font-weight:700;color:#3d4d70;letter-spacing:0.1em;text-transform:uppercase;">What Happens Next</p>

    ${[
      ["📬", "Message Received", "Aapka message humein mil gaya hai. Hum carefully review karenge."],
      ["⏱️", "Response Time", "Hum typically 24-48 hours mein reply karte hain."],
      ["📧", "Reply Via Email", `Hum is email pe reply karenge: ${email}`],
    ].map(([icon, title, desc]) => `
    <div style="display:flex;align-items:flex-start;margin-bottom:14px;">
      <div style="width:38px;height:38px;background:#0a1a10;border:1px solid #1a3a20;border-radius:9px;text-align:center;line-height:38px;font-size:16px;flex-shrink:0;">${icon}</div>
      <div style="padding-left:14px;">
        <p style="margin:0 0 3px;font-size:13px;font-weight:600;color:#c8d8f0;">${title}</p>
        <p style="margin:0;font-size:12px;color:#3d4d70;line-height:1.5;">${desc}</p>
      </div>
    </div>`).join("")}

    <!-- Message Summary -->
    <div style="background:#080c18;border:1px solid #1a2340;border-left:3px solid #4ADE80;border-radius:10px;padding:16px 18px;margin-top:8px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#3d4d70;letter-spacing:0.08em;text-transform:uppercase;">Your Message</p>
      <p style="margin:0 0 6px;font-size:12px;color:#3d4d70;"><strong style="color:#6a7a9a;">Subject:</strong> ${subject || "General Inquiry"}</p>
      <p style="margin:0;font-size:13px;color:#6a7a9a;line-height:1.6;">${message.length > 200 ? message.substring(0, 200) + "..." : message}</p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-top:24px;">
      <a href="http://localhost:5173" style="display:inline-block;background:#4ADE80;color:#000;text-decoration:none;font-size:13px;font-weight:700;padding:12px 28px;border-radius:10px;">
        Visit HealthGuard AI →
      </a>
    </div>

  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#080c18;border-top:1px solid #1a2340;padding:16px 32px;text-align:center;">
    <p style="margin:0 0 6px;font-size:12px;color:#2a3a5a;">HealthGuard AI &bull; Empowering Your Health Decisions</p>
    <p style="margin:0;font-size:11px;color:#1e2a40;">Ye ek automated reply hai. Direct reply karne ke liye hum jald hi contact karenge.</p>
  </td></tr>

  <tr><td style="background:linear-gradient(90deg,#4ADE80,#22c55e);height:3px;font-size:0;">&nbsp;</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

    // ── Send both emails ──────────────────────────────────
    await Promise.all([
      // Admin ko
      transporter.sendMail({
        from:    `"HealthGuard AI" <${process.env.EMAIL_USER}>`,
        to:      process.env.EMAIL_USER, // apna email
        replyTo: email,
        subject: `📬 New Contact: ${subject || "General Inquiry"} — ${name}`,
        html:    adminHtml,
      }),
      // User ko
      transporter.sendMail({
        from:    `"HealthGuard AI" <${process.env.EMAIL_USER}>`,
        to:      email,
        subject: `✅ We received your message, ${name.split(" ")[0]}!`,
        html:    userHtml,
      }),
    ]);

    res.status(201).json({
      success: true,
      message: "Message send ho gaya! Aapko confirmation email mil gaya hoga.",
    });

  } catch (err) {
    console.error("Contact email error:", err.message);
    res.status(500).json({ success: false, message: "Message send nahi hua: " + err.message });
  }
};