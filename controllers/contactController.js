// controllers/contactController.js
const { Resend } = require("resend");

exports.submitContact = async (req, res) => {
  try {
    const { name, email, subject, message, phone } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: "Name, email and message are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address" });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const submittedAt = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    const firstName = name.split(" ")[0];

    // ══════════════════════════════════════════════════
    //  ADMIN EMAIL
    // ══════════════════════════════════════════════════
    const adminHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Contact Request — HealthGuard AI</title>
</head>
<body style="margin:0; padding:0; background:#050A05; font-family:Arial,Helvetica,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background:#050A05; padding:40px 16px;">
    <tr><td align="center">

      <!-- Card -->
      <table width="580" cellpadding="0" cellspacing="0" border="0"
        style="background:#060E06; border-radius:20px; border:1px solid rgba(34,197,94,0.22);
               overflow:hidden; max-width:580px; width:100%;
               box-shadow:0 30px 60px rgba(0,0,0,0.7);">

        <!-- Green top line -->
        <tr>
          <td style="background:linear-gradient(90deg,#15803D,#22C55E); height:3px; font-size:0; line-height:0;">&nbsp;</td>
        </tr>

        <!-- Header -->
        <tr>
          <td style="padding:26px 32px; border-bottom:1px solid rgba(34,197,94,0.10);
                     background:linear-gradient(180deg,rgba(34,197,94,0.05) 0%,transparent 100%);">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="vertical-align:middle; width:50px;">
                  <div style="width:46px; height:46px; background:rgba(34,197,94,0.10);
                              border:1px solid rgba(34,197,94,0.28); border-radius:12px;
                              text-align:center; line-height:46px; font-size:22px;">🏥</div>
                </td>
                <td style="padding-left:12px; vertical-align:middle;">
                  <p style="margin:0; font-size:17px; font-weight:700; color:#DCFCE7;">HealthGuard AI</p>
                  <p style="margin:3px 0 0; font-size:12px; color:#4A8A5A;">New Contact Request</p>
                </td>
                <td align="right" style="vertical-align:middle;">
                  <span style="background:rgba(34,197,94,0.10); border:1px solid rgba(34,197,94,0.30);
                               border-radius:40px; padding:5px 13px; font-size:10px; color:#22C55E;
                               font-weight:700; letter-spacing:0.06em; white-space:nowrap;">
                    ● INCOMING
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px;">

            <!-- Timestamp -->
            <p style="margin:0 0 22px; font-size:12px; color:#2A5A32;">
              Received on ${submittedAt} IST
            </p>

            <!-- Sender info grid -->
            <p style="margin:0 0 12px; font-size:10px; font-weight:700; color:#2A5A32;
                       letter-spacing:0.1em; text-transform:uppercase;">Sender Details</p>

            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
              <tr>
                <td width="48%" style="padding-bottom:10px; vertical-align:top;">
                  <div style="background:rgba(5,20,8,0.9); border:1px solid rgba(34,197,94,0.14);
                              border-radius:12px; padding:13px 15px;">
                    <p style="margin:0 0 5px; font-size:10px; font-weight:700; color:#2A5A32;
                               text-transform:uppercase; letter-spacing:0.08em;">Full Name</p>
                    <p style="margin:0; font-size:15px; font-weight:700; color:#DCFCE7;">${name}</p>
                  </div>
                </td>
                <td width="4%"></td>
                <td width="48%" style="padding-bottom:10px; vertical-align:top;">
                  <div style="background:rgba(5,20,8,0.9); border:1px solid rgba(34,197,94,0.14);
                              border-radius:12px; padding:13px 15px;">
                    <p style="margin:0 0 5px; font-size:10px; font-weight:700; color:#2A5A32;
                               text-transform:uppercase; letter-spacing:0.08em;">Email</p>
                    <p style="margin:0; font-size:14px; font-weight:700; color:#22C55E;">${email}</p>
                  </div>
                </td>
              </tr>
              <tr>
                <td width="48%" style="vertical-align:top;">
                  <div style="background:rgba(5,20,8,0.9); border:1px solid rgba(34,197,94,0.14);
                              border-radius:12px; padding:13px 15px;">
                    <p style="margin:0 0 5px; font-size:10px; font-weight:700; color:#2A5A32;
                               text-transform:uppercase; letter-spacing:0.08em;">Phone</p>
                    <p style="margin:0; font-size:15px; font-weight:700; color:#DCFCE7;">
                      ${phone || "—"}
                    </p>
                  </div>
                </td>
                <td width="4%"></td>
                <td width="48%" style="vertical-align:top;">
                  <div style="background:rgba(5,20,8,0.9); border:1px solid rgba(34,197,94,0.14);
                              border-radius:12px; padding:13px 15px;">
                    <p style="margin:0 0 5px; font-size:10px; font-weight:700; color:#2A5A32;
                               text-transform:uppercase; letter-spacing:0.08em;">Subject</p>
                    <p style="margin:0; font-size:14px; font-weight:700; color:#DCFCE7;">
                      ${subject || "General Inquiry"}
                    </p>
                  </div>
                </td>
              </tr>
            </table>

            <!-- Divider -->
            <div style="height:1px; background:rgba(34,197,94,0.08); margin:0 0 24px;"></div>

            <!-- Message -->
            <p style="margin:0 0 12px; font-size:10px; font-weight:700; color:#2A5A32;
                       letter-spacing:0.1em; text-transform:uppercase;">Message</p>
            <div style="background:rgba(5,20,8,0.9); border:1px solid rgba(34,197,94,0.16);
                         border-left:3px solid #22C55E; border-radius:12px; padding:18px 18px 18px 20px;">
              <p style="margin:0; font-size:14px; color:#4A8A5A; line-height:1.75;">
                ${message.replace(/\n/g, "<br>")}
              </p>
            </div>

            <!-- Reply CTA -->
            <div style="margin-top:22px; text-align:center;">
              <a href="mailto:${email}?subject=Re: ${subject || 'General Inquiry'}"
                style="display:inline-block; background:linear-gradient(90deg,#15803D,#22C55E);
                       color:#F0FFF4; text-decoration:none; font-size:13px; font-weight:700;
                       padding:12px 28px; border-radius:40px;
                       box-shadow:0 4px 14px rgba(34,197,94,0.25);">
                Reply to ${firstName} →
              </a>
            </div>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:rgba(5,18,8,0.95); border-top:1px solid rgba(34,197,94,0.10);
                     padding:16px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td>
                  <p style="margin:0; font-size:12px; font-weight:700; color:#DCFCE7;">HealthGuard AI</p>
                  <p style="margin:3px 0 0; font-size:11px; color:#2A5A32;">Admin Notification</p>
                </td>
                <td align="right" style="vertical-align:middle;">
                  <span style="background:rgba(34,197,94,0.08); border:1px solid rgba(34,197,94,0.18);
                               border-radius:20px; padding:4px 12px; font-size:10px; color:#22C55E;
                               font-weight:700; letter-spacing:0.06em;">🔒 SECURE</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Green bottom line -->
        <tr>
          <td style="background:linear-gradient(90deg,#15803D,#22C55E); height:3px; font-size:0; line-height:0;">&nbsp;</td>
        </tr>

      </table>

    </td></tr>
  </table>

</body>
</html>`;


    // ══════════════════════════════════════════════════
    //  USER CONFIRMATION EMAIL
    // ══════════════════════════════════════════════════
    const userHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>We received your message — HealthGuard AI</title>
</head>
<body style="margin:0; padding:0; background:#050A05; font-family:Arial,Helvetica,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background:#050A05; padding:40px 16px;">
    <tr><td align="center">

      <!-- Card -->
      <table width="560" cellpadding="0" cellspacing="0" border="0"
        style="background:#060E06; border-radius:20px; border:1px solid rgba(34,197,94,0.22);
               overflow:hidden; max-width:560px; width:100%;
               box-shadow:0 30px 60px rgba(0,0,0,0.7);">

        <!-- Green top line -->
        <tr>
          <td style="background:linear-gradient(90deg,#15803D,#22C55E); height:3px; font-size:0; line-height:0;">&nbsp;</td>
        </tr>

        <!-- Hero header -->
        <tr>
          <td style="padding:40px 32px 32px; text-align:center;
                     background:linear-gradient(180deg,rgba(34,197,94,0.06) 0%,transparent 100%);
                     border-bottom:1px solid rgba(34,197,94,0.10);">

            <!-- Logo -->
            <div style="display:inline-block; width:56px; height:56px;
                        background:rgba(34,197,94,0.10); border:1px solid rgba(34,197,94,0.28);
                        border-radius:16px; text-align:center; line-height:56px; font-size:28px; margin-bottom:16px;">
              🛡️
            </div>

            <!-- Badge -->
            <div style="margin-bottom:14px;">
              <span style="background:rgba(34,197,94,0.10); border:1px solid rgba(34,197,94,0.28);
                           border-radius:40px; padding:5px 14px; font-size:10px; color:#22C55E;
                           font-weight:700; letter-spacing:0.08em;">
                ● MESSAGE RECEIVED
              </span>
            </div>

            <h1 style="margin:0 0 10px; font-size:26px; font-weight:700; color:#DCFCE7;
                        letter-spacing:-0.02em;">
              Thank you, ${firstName}!
            </h1>
            <p style="margin:0; font-size:14px; color:#4A8A5A; line-height:1.7; max-width:380px; display:inline-block;">
              We've received your message and will get back to you within <strong style="color:#22C55E;">24–48 hours</strong>.
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px;">

            <!-- What you sent -->
            <p style="margin:0 0 12px; font-size:10px; font-weight:700; color:#2A5A32;
                       letter-spacing:0.1em; text-transform:uppercase;">Your Message</p>

            <!-- Subject -->
            <div style="background:rgba(5,20,8,0.9); border:1px solid rgba(34,197,94,0.14);
                         border-radius:12px; padding:12px 15px; margin-bottom:10px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="width:24px; vertical-align:middle; font-size:15px;">📌</td>
                  <td style="padding-left:8px; vertical-align:middle;">
                    <span style="font-size:10px; color:#2A5A32; font-weight:700;
                                 text-transform:uppercase; letter-spacing:0.07em;">Subject &nbsp;·&nbsp;</span>
                    <span style="font-size:13px; color:#DCFCE7; font-weight:600;">
                      ${subject || "General Inquiry"}
                    </span>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Message preview -->
            <div style="background:rgba(5,20,8,0.9); border:1px solid rgba(34,197,94,0.14);
                         border-left:3px solid rgba(34,197,94,0.4); border-radius:12px;
                         padding:16px 18px; margin-bottom:24px;">
              <p style="margin:0; font-size:13px; color:#4A8A5A; line-height:1.75; font-style:italic;">
                "${message.length > 200 ? message.substring(0, 200) + "…" : message}"
              </p>
            </div>

            <!-- Divider -->
            <div style="height:1px; background:rgba(34,197,94,0.08); margin:0 0 24px;"></div>

            <!-- What happens next -->
            <p style="margin:0 0 14px; font-size:10px; font-weight:700; color:#2A5A32;
                       letter-spacing:0.1em; text-transform:uppercase;">What Happens Next</p>

            ${[
              { icon:"👀", step:"Our team will review your message carefully." },
              { icon:"📧", step:"We'll reply to " + email + " within 24–48 hours." },
              { icon:"✅", step:"Urgent issues are prioritised — mention it in your message." },
            ].map(({ icon, step }) => `
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;">
              <tr>
                <td style="width:36px; vertical-align:top; padding-top:2px;">
                  <div style="width:32px; height:32px; background:rgba(34,197,94,0.08);
                              border:1px solid rgba(34,197,94,0.18); border-radius:8px;
                              text-align:center; line-height:32px; font-size:15px;">${icon}</div>
                </td>
                <td style="padding-left:12px; vertical-align:middle;">
                  <p style="margin:0; font-size:13px; color:#4A8A5A; line-height:1.6;">${step}</p>
                </td>
              </tr>
            </table>`).join("")}

            <!-- CTA -->
            <div style="margin-top:26px; text-align:center;">
              <a href="https://health-guide-frontend.vercel.app"
                style="display:inline-block;
                       background:linear-gradient(90deg,#15803D,#16A34A,#22C55E);
                       color:#F0FFF4; text-decoration:none; font-size:14px; font-weight:700;
                       padding:13px 32px; border-radius:40px;
                       box-shadow:0 4px 16px rgba(34,197,94,0.25);">
                Visit HealthGuard AI →
              </a>
            </div>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:rgba(5,18,8,0.95); border-top:1px solid rgba(34,197,94,0.10);
                     padding:16px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td>
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="width:26px; vertical-align:middle;">
                        <div style="width:24px; height:24px; background:rgba(34,197,94,0.12);
                                    border:1px solid rgba(34,197,94,0.25); border-radius:6px;
                                    text-align:center; line-height:24px; font-size:12px;">🛡️</div>
                      </td>
                      <td style="padding-left:8px; vertical-align:middle;">
                        <span style="font-size:13px; font-weight:700; color:#DCFCE7;">HealthGuard AI</span>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:5px 0 0; font-size:11px; color:#2A5A32;">
                    This is an automated confirmation — please do not reply directly.
                  </p>
                </td>
                <td align="right" style="vertical-align:middle;">
                  <span style="background:rgba(34,197,94,0.08); border:1px solid rgba(34,197,94,0.18);
                               border-radius:20px; padding:4px 12px; font-size:10px; color:#22C55E;
                               font-weight:700; letter-spacing:0.06em;">🔒 ENCRYPTED</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Green bottom line -->
        <tr>
          <td style="background:linear-gradient(90deg,#15803D,#22C55E); height:3px; font-size:0; line-height:0;">&nbsp;</td>
        </tr>

      </table>

      <!-- Below-card note -->
      <p style="margin:18px 0 0; font-size:11px; color:#2A5A32; text-align:center;">
        You're receiving this because you submitted a contact form on HealthGuard AI.
      </p>

    </td></tr>
  </table>

</body>
</html>`;

await Promise.all([
  // ✅ Admin ko — tumhari email pe
  resend.emails.send({
    from:    "HealthGuard AI <onboarding@resend.dev>",
    to:      "sayalic106@gmail.com",
    replyTo: email,
    subject: `📬 New Contact: ${subject || "General Inquiry"} — ${name}`,
    html:    adminHtml,
  }),


  resend.emails.send({
    from:    "HealthGuard AI <onboarding@resend.dev>",
    to:      "sayalic106@gmail.com", // ← abhi sirf apni email
    subject: `✅ Confirmation for ${name} (${email})`,
    html:    userHtml,
  }),
]);
    res.status(201).json({
      success: true,
      message: "Message sent! Please check your email for confirmation.",
    });

  } catch (err) {
    console.error("Contact email error:", err.message);
    res.status(500).json({ success: false, message: "Failed to send message: " + err.message });
  }
};