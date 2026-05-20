const nodemailer = require("nodemailer");

// ── Transporter ───────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || "smtp.gmail.com",
  port:   parseInt(process.env.SMTP_PORT) || 465 ,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ── Verify transporter on startup ────────────────────────
transporter.verify((error) => {
  if (error) {
    console.warn("⚠️  Email transporter error:", error.message);
  } else {
    console.log("📧 Email transporter ready");
  }
});

// ── Base HTML template ────────────────────────────────────
const baseTemplate = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>VitaRisk</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:32px;text-align:center;">
            <div style="display:inline-flex;align-items:center;gap:10px;">
              <div style="width:40px;height:40px;background:rgba(255,255,255,0.2);border-radius:10px;display:inline-block;line-height:40px;text-align:center;font-size:20px;">♥</div>
              <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Vita<span style="color:#c4b5fd;">Risk</span></span>
            </div>
          </td>
        </tr>

        <!-- Body -->
        <tr><td style="padding:36px 40px;">${content}</td></tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f1f5f9;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              © ${new Date().getFullYear()} VitaRisk Health Intelligence. All rights reserved.<br/>
              If you did not request this email, please ignore it.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

// ── Send Email Verification OTP ───────────────────────────
const sendVerificationOTP = async (email, firstName, otp) => {
  const content = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1e293b;">Verify your email</h2>
    <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.6;">
      Hi <strong>${firstName}</strong>, welcome to VitaRisk! Use the OTP below to verify your email address. It expires in <strong>10 minutes</strong>.
    </p>

    <div style="background:#f8f5ff;border:2px dashed #7c3aed;border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7c3aed;">Your OTP</p>
      <p style="margin:0;font-size:42px;font-weight:800;letter-spacing:10px;color:#1e293b;">${otp}</p>
    </div>

    <p style="margin:0;font-size:13px;color:#94a3b8;">
      ⏱ This OTP expires in 10 minutes.<br/>
      🔒 Never share this OTP with anyone.
    </p>`;

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      email,
    subject: `${otp} is your VitaRisk verification code`,
    html:    baseTemplate(content),
  });
};

// ── Send Password Reset Email ─────────────────────────────
const sendPasswordResetEmail = async (email, firstName, resetToken) => {
  const resetURL = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

  const content = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1e293b;">Reset your password</h2>
    <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.6;">
      Hi <strong>${firstName}</strong>, we received a request to reset your VitaRisk password. Click the button below to proceed. This link expires in <strong>30 minutes</strong>.
    </p>

    <div style="text-align:center;margin-bottom:28px;">
      <a href="${resetURL}"
         style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:12px;">
        Reset Password →
      </a>
    </div>

    <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;">Or copy and paste this URL into your browser:</p>
    <p style="margin:0;font-size:12px;color:#7c3aed;word-break:break-all;">${resetURL}</p>`;

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      email,
    subject: "VitaRisk — Password Reset Request",
    html:    baseTemplate(content),
  });
};

// ── Send Welcome Email ────────────────────────────────────
const sendWelcomeEmail = async (email, firstName) => {
  const content = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1e293b;">Welcome to VitaRisk! 🎉</h2>
    <p style="margin:0 0 20px;font-size:15px;color:#64748b;line-height:1.6;">
      Hi <strong>${firstName}</strong>, your email has been verified and your account is ready. Start your health risk assessment today.
    </p>
    <div style="text-align:center;margin-bottom:28px;">
      <a href="${process.env.CLIENT_URL}/risk-assessment"
         style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:12px;">
        Start Assessment →
      </a>
    </div>`;

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      email,
    subject: "Welcome to VitaRisk — Your account is ready",
    html:    baseTemplate(content),
  });
};

module.exports = {
  sendVerificationOTP,
  sendPasswordResetEmail,
  sendWelcomeEmail,
};