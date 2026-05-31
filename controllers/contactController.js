// // controllers/contactController.js
// const nodemailer = require("nodemailer");

// const createTransporter = () =>
//   nodemailer.createTransport({
//     host:   process.env.EMAIL_HOST   || "smtp.gmail.com",
//     port:   Number(process.env.EMAIL_PORT) || 465 ,
//     secure: false,
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASS,
//     },
//   });

const { Resend } = require("resend");

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

    const resend = new Resend(process.env.RESEND_API_KEY);

    const submittedAt = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    // ── Admin email ────────────────────────────────────
    const adminHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#080c18;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;background:#080c18;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
        style="background:#0d1225;border-radius:16px;border:1px solid #1a2340;overflow:hidden;">
        <tr><td style="background:linear-gradient(90deg,#4ADE80,#22c55e);height:3px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="padding:28px 32px;border-bottom:1px solid #1a2340;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#e8f0fe;">🏥 New Contact Request</p>
          <p style="margin:4px 0 0;font-size:12px;color:#3d4d70;">${submittedAt}</p>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 5px;font-size:11px;color:#3d4d70;text-transform:uppercase;">Name</p>
          <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#e8f0fe;">${name}</p>
          <p style="margin:0 0 5px;font-size:11px;color:#3d4d70;text-transform:uppercase;">Email</p>
          <p style="margin:0 0 16px;font-size:14px;color:#4ADE80;">${email}</p>
          ${phone ? `<p style="margin:0 0 5px;font-size:11px;color:#3d4d70;text-transform:uppercase;">Phone</p>
          <p style="margin:0 0 16px;font-size:15px;color:#e8f0fe;">${phone}</p>` : ""}
          <p style="margin:0 0 5px;font-size:11px;color:#3d4d70;text-transform:uppercase;">Subject</p>
          <p style="margin:0 0 16px;font-size:15px;color:#e8f0fe;">${subject || "General Inquiry"}</p>
          <p style="margin:0 0 10px;font-size:11px;color:#3d4d70;text-transform:uppercase;">Message</p>
          <div style="background:#080c18;border:1px solid #1a2340;border-left:3px solid #4ADE80;border-radius:10px;padding:16px;">
            <p style="margin:0;font-size:14px;color:#a8b8d8;line-height:1.7;">${message.replace(/\n/g, "<br>")}</p>
          </div>
        </td></tr>
        <tr><td style="background:linear-gradient(90deg,#4ADE80,#22c55e);height:3px;font-size:0;">&nbsp;</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    // ── User thank you email ───────────────────────────
    const userHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#080c18;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;background:#080c18;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
        style="background:#0d1225;border-radius:16px;border:1px solid #1a2340;overflow:hidden;">
        <tr><td style="background:linear-gradient(90deg,#4ADE80,#22c55e);height:3px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="padding:40px 32px;text-align:center;border-bottom:1px solid #1a2340;">
          <p style="margin:0 0 8px;font-size:24px;font-weight:700;color:#e8f0fe;">Thank You, ${name.split(" ")[0]}! 🎉</p>
          <p style="margin:0;font-size:14px;color:#3d4d70;">We received your message and will reply within 24-48 hours.</p>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <div style="background:#080c18;border:1px solid #1a2340;border-left:3px solid #4ADE80;border-radius:10px;padding:16px;">
            <p style="margin:0 0 6px;font-size:12px;color:#3d4d70;"><strong style="color:#6a7a9a;">Subject:</strong> ${subject || "General Inquiry"}</p>
            <p style="margin:0;font-size:13px;color:#6a7a9a;line-height:1.6;">
              ${message.length > 200 ? message.substring(0, 200) + "..." : message}
            </p>
          </div>
          <div style="text-align:center;margin-top:24px;">
            <a href="https://health-guide-frontend.vercel.app"
              style="display:inline-block;background:#4ADE80;color:#000;text-decoration:none;font-size:13px;font-weight:700;padding:12px 28px;border-radius:10px;">
              Visit HealthGuard AI →
            </a>
          </div>
        </td></tr>
        <tr><td style="background:linear-gradient(90deg,#4ADE80,#22c55e);height:3px;font-size:0;">&nbsp;</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    // ── Dono emails bhejo ──────────────────────────────
    await Promise.all([
      resend.emails.send({
        from:    "HealthGuard AI <onboarding@resend.dev>",
        to:      "sayalic106@gmail.com", // ← tumhara admin email
        replyTo: email,
        subject: `📬 New Contact: ${subject || "General Inquiry"} — ${name}`,
        html:    adminHtml,
      }),
      resend.emails.send({
        from:    "HealthGuard AI <onboarding@resend.dev>",
        to:      email,
        subject: `✅ We received your message, ${name.split(" ")[0]}!`,
        html:    userHtml,
      }),
    ]);

    res.status(201).json({
      success: true,
      message: "Message send ho gaya! Confirmation email check karo.",
    });

  } catch (err) {
    console.error("Contact email error:", err.message);
    res.status(500).json({ success: false, message: "Message send nahi hua: " + err.message });
  }
};