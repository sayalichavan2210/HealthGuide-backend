const HealthProfile = require("../models/HealthProfile");

// ── CREATE new health assessment ─────────────────────────
exports.createProfile = async (req, res) => {
  try {
    const {
      age, gender, heightCm, weightKg,
      bloodPressureSystolic, bloodPressureDiastolic,
      bloodSugarFasting, cholesterolTotal, heartRateBpm,
      smokingStatus, alcoholConsumption, exerciseDaysPerWeek,
      sleepHoursPerDay, dietType,
      familyHistory, symptoms, notes,
    } = req.body;

    if (!age || !gender || !heightCm || !weightKg) {
      return res.status(400).json({
        success: false,
        message: "age, gender, heightCm, weightKg required hain",
      });
    }

    const heightM = heightCm / 100;
    const bmi = parseFloat((weightKg / (heightM * heightM)).toFixed(1));

    const profile = await HealthProfile.create({
      user: req.user._id,
      age, gender, heightCm, weightKg, bmi,
      bloodPressureSystolic,
      bloodPressureDiastolic,
      bloodSugarFasting,
      cholesterolTotal,
      heartRateBpm,
      smokingStatus:       smokingStatus       || "never",
      alcoholConsumption:  alcoholConsumption  || "none",
      exerciseDaysPerWeek: exerciseDaysPerWeek || 0,
      sleepHoursPerDay:    sleepHoursPerDay    || 7,
      dietType:            dietType            || "other",
      familyHistory: {
        diabetes:     familyHistory?.diabetes     || false,
        heartDisease: familyHistory?.heartDisease || false,
        hypertension: familyHistory?.hypertension || false,
      },
      symptoms:         symptoms || [],
      notes:            notes    || "",
      mlAnalysisStatus: "pending",
    });

    // Local risk calculation
    const bs      = bloodSugarFasting    || 0;
    const bpSys   = bloodPressureSystolic || 0;
    const chol    = cholesterolTotal     || 0;
    const ex      = exerciseDaysPerWeek  || 0;
    const smoking = smokingStatus === "current" ? 1 : 0;
    const fhDia   = familyHistory?.diabetes     || false;
    const fhHeart = familyHistory?.heartDisease || false;

    const diabetesRisk = Math.min(
      (bs > 126  ? 0.4 : bs > 100 ? 0.2 : 0) +
      (bmi > 30  ? 0.2 : bmi > 25 ? 0.1 : 0) +
      (fhDia     ? 0.2 : 0) +
      (age > 45  ? 0.1 : 0) +
      (ex < 2    ? 0.1 : 0), 1
    );

    const heartRisk = Math.min(
      (bpSys > 140 ? 0.3  : bpSys > 120 ? 0.15 : 0) +
      (chol > 200  ? 0.25 : chol > 170  ? 0.1  : 0) +
      (fhHeart     ? 0.2  : 0) +
      (smoking     ? 0.15 : 0) +
      (age > 50    ? 0.1  : 0), 1
    );

    const hyperRisk = Math.min(
      (bpSys > 130 ? 0.35 : bpSys > 120 ? 0.2 : 0) +
      (bmi > 28    ? 0.2  : 0) +
      (age > 40    ? 0.15 : 0) +
      (smoking     ? 0.15 : 0) +
      (ex < 2      ? 0.15 : 0), 1
    );

    const maxRisk = Math.max(diabetesRisk, heartRisk, hyperRisk);

    profile.riskScores = {
      diabetes:     diabetesRisk,
      heartDisease: heartRisk,
      hypertension: hyperRisk,
      overallRisk:  maxRisk > 0.6 ? "high" : maxRisk > 0.35 ? "moderate" : "low",
    };
    profile.mlAnalysisStatus = "completed";
    profile.mlAnalysedAt     = new Date();
    await profile.save();

    res.status(201).json({
      success: true,
      message: "Assessment created successfully",
      profile,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET latest profile ────────────────────────────────────
exports.getLatestProfile = async (req, res) => {
  try {
    const profile = await HealthProfile
      .findOne({ user: req.user._id })
      .sort({ createdAt: -1 });

    if (!profile) {
      return res.status(404).json({ success: false, message: "No health profile found." });
    }
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET history ───────────────────────────────────────────
exports.getHistory = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    const [profiles, total] = await Promise.all([
      HealthProfile.find({ user: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .select("bmi riskScores mlAnalysisStatus symptoms createdAt"),
      HealthProfile.countDocuments({ user: req.user._id }),
    ]);

    res.json({ success: true, total, page, pages: Math.ceil(total / limit), profiles });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET by ID ─────────────────────────────────────────────
exports.getProfileById = async (req, res) => {
  try {
    const profile = await HealthProfile.findOne({ _id: req.params.id, user: req.user._id });
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found" });
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── UPDATE risk scores ────────────────────────────────────
exports.updateRiskScores = async (req, res) => {
  try {
    const { diabetes, heartDisease, hypertension } = req.body;
    const maxRisk = Math.max(diabetes || 0, heartDisease || 0, hypertension || 0);
    const overallRisk = maxRisk >= 0.7 ? "very_high" : maxRisk >= 0.5 ? "high" : maxRisk >= 0.3 ? "moderate" : "low";

    const profile = await HealthProfile.findByIdAndUpdate(
      req.params.id,
      { riskScores: { diabetes, heartDisease, hypertension, overallRisk }, mlAnalysisStatus: "completed", mlAnalysedAt: new Date() },
      { new: true }
    );
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found" });
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE ────────────────────────────────────────────────
exports.deleteProfile = async (req, res) => {
  try {
    const profile = await HealthProfile.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found" });
    res.json({ success: true, message: "Profile deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
// ── SEND REPORT VIA EMAIL ─────────────────────────────────
// Ye function healthController.js mein add karo (end mein)
// Aur routes/healthRoutes.js mein: router.post("/send-report", sendReport);

const nodemailer = require("nodemailer");

exports.sendReport = async (req, res) => {
  try {
    const { profileId, recipientEmail } = req.body;

    if (!recipientEmail) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const profile = await HealthProfile.findOne({
      _id:  profileId,
      user: req.user._id,
    });

    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    const scores = profile.riskScores || {};

    const getRiskLabel = (v) => v > 0.6 ? "High Risk" : v > 0.35 ? "Moderate" : "Low Risk";
    const getPct       = (v) => Math.round((v || 0) * 100);
    const getRiskColor = (v) => v > 0.6 ? "#f87171" : v > 0.35 ? "#fbbf24" : "#22c55e";
    const getRiskBg    = (v) => v > 0.6 ? "#1a0808" : v > 0.35 ? "#1a1505" : "#071a0a";
    const getRiskBorder= (v) => v > 0.6 ? "#3a1212" : v > 0.35 ? "#3a2e08" : "#0f3a1a";
    const getRiskBarBg = (v) => v > 0.6 ? "#2a0e0e" : v > 0.35 ? "#261e05" : "#062010";
    const getPillStyle = (v) => {
      if (v > 0.6)  return "background:#2a0e0e; color:#f87171; border:1px solid #4a1a1a;";
      if (v > 0.35) return "background:#261e05; color:#fbbf24; border:1px solid #3a2e08;";
      return "background:#071a0a; color:#22c55e; border:1px solid #0f3a1a;";
    };
    const overallColor = (r) => ["high","very_high"].includes(r) ? "#f87171" : r === "moderate" ? "#fbbf24" : "#22c55e";
    const overallBg    = (r) => ["high","very_high"].includes(r) ? "#1a0808" : r === "moderate" ? "#1a1505" : "#071a0a";
    const overallBorder= (r) => ["high","very_high"].includes(r) ? "#3a1212" : r === "moderate" ? "#3a2e08" : "#0f3a1a";

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HealthGuard AI — Health Risk Report</title>
</head>
<body style="margin:0; padding:0; background:#050A05; font-family:Arial,Helvetica,sans-serif; -webkit-font-smoothing:antialiased;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#050A05; padding:40px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="600" cellpadding="0" cellspacing="0" border="0"
          style="background:#060E06; border-radius:20px; border:1px solid rgba(34,197,94,0.22); overflow:hidden; max-width:600px; width:100%;
                 box-shadow:0 30px 60px rgba(0,0,0,0.7);">

          <!-- Green top accent line -->
          <tr>
            <td style="background:linear-gradient(90deg,#15803D,#22C55E); height:3px; font-size:0; line-height:0;">&nbsp;</td>
          </tr>

          <!-- ─── HEADER ─────────────────────────────────── -->
          <tr>
            <td style="padding:28px 32px; border-bottom:1px solid rgba(34,197,94,0.12);
                       background:linear-gradient(180deg, rgba(34,197,94,0.05) 0%, transparent 100%);">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <!-- Logo mark -->
                  <td style="width:50px; vertical-align:middle;">
                    <div style="width:46px; height:46px; background:rgba(34,197,94,0.10); border:1px solid rgba(34,197,94,0.28);
                                border-radius:12px; text-align:center; line-height:46px; font-size:22px;">🛡️</div>
                  </td>
                  <!-- Brand name -->
                  <td style="padding-left:12px; vertical-align:middle;">
                    <p style="margin:0; font-size:18px; font-weight:700; color:#DCFCE7; letter-spacing:-0.01em;">HealthGuard AI</p>
                    <p style="margin:3px 0 0; font-size:12px; color:#4A8A5A;">Health Risk Assessment Report</p>
                  </td>
                  <!-- Status badge -->
                  <td align="right" style="vertical-align:middle;">
                    <span style="background:rgba(34,197,94,0.10); border:1px solid rgba(34,197,94,0.30);
                                 border-radius:40px; padding:5px 14px; font-size:11px; color:#22C55E;
                                 font-weight:700; letter-spacing:0.06em; white-space:nowrap;">
                      ● REPORT READY
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ─── BODY ────────────────────────────────────── -->
          <tr>
            <td style="padding:28px 32px;">

              <!-- Greeting -->
              <p style="margin:0 0 24px; font-size:14px; color:#4A8A5A; line-height:1.7;">
                Your personalized health risk assessment is ready. Review your results below and consult a healthcare professional for any concerns.
              </p>

              <!-- ── PERSONAL DETAILS ──────────────────────── -->
              <p style="margin:0 0 12px; font-size:10px; font-weight:700; color:#2A5A32;
                         letter-spacing:0.1em; text-transform:uppercase;">Personal Details</p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td width="48%" style="padding-bottom:10px; vertical-align:top;">
                    <div style="background:rgba(5,20,8,0.9); border:1px solid rgba(34,197,94,0.14);
                                border-radius:12px; padding:14px 16px;">
                      <p style="margin:0 0 5px; font-size:10px; font-weight:700; color:#2A5A32; text-transform:uppercase; letter-spacing:0.08em;">Age</p>
                      <p style="margin:0; font-size:16px; font-weight:700; color:#DCFCE7;">${profile.age} years</p>
                    </div>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style="padding-bottom:10px; vertical-align:top;">
                    <div style="background:rgba(5,20,8,0.9); border:1px solid rgba(34,197,94,0.14);
                                border-radius:12px; padding:14px 16px;">
                      <p style="margin:0 0 5px; font-size:10px; font-weight:700; color:#2A5A32; text-transform:uppercase; letter-spacing:0.08em;">Gender</p>
                      <p style="margin:0; font-size:16px; font-weight:700; color:#DCFCE7; text-transform:capitalize;">${profile.gender || "N/A"}</p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td width="48%" style="vertical-align:top;">
                    <div style="background:rgba(5,20,8,0.9); border:1px solid rgba(34,197,94,0.14);
                                border-radius:12px; padding:14px 16px;">
                      <p style="margin:0 0 5px; font-size:10px; font-weight:700; color:#2A5A32; text-transform:uppercase; letter-spacing:0.08em;">BMI</p>
                      <p style="margin:0; font-size:16px; font-weight:700; color:#DCFCE7;">${profile.bmi || "N/A"}</p>
                    </div>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style="vertical-align:top;">
                    <div style="background:rgba(5,20,8,0.9); border:1px solid rgba(34,197,94,0.14);
                                border-radius:12px; padding:14px 16px;">
                      <p style="margin:0 0 5px; font-size:10px; font-weight:700; color:#2A5A32; text-transform:uppercase; letter-spacing:0.08em;">Assessment Date</p>
                      <p style="margin:0; font-size:15px; font-weight:700; color:#DCFCE7;">
                        ${new Date(profile.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
                      </p>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <div style="height:1px; background:rgba(34,197,94,0.08); margin:0 0 28px;"></div>

              <!-- ── RISK ANALYSIS ──────────────────────────── -->
              <p style="margin:0 0 14px; font-size:10px; font-weight:700; color:#2A5A32;
                         letter-spacing:0.1em; text-transform:uppercase;">Risk Analysis</p>

              ${[
                { label: "Diabetes Risk",      icon: "🩸", val: scores.diabetes     || 0 },
                { label: "Heart Disease Risk",  icon: "❤️", val: scores.heartDisease || 0 },
                { label: "Hypertension Risk",   icon: "🩺", val: scores.hypertension || 0 },
              ].map(({ label, icon, val }) => {
                const pct    = getPct(val);
                const color  = getRiskColor(val);
                const bg     = getRiskBg(val);
                const border = getRiskBorder(val);
                const barBg  = getRiskBarBg(val);
                const pill   = getPillStyle(val);
                const note   = val > 0.6 ? "Significantly elevated" : val > 0.35 ? "Monitor regularly" : "Within normal range";
                return `
              <div style="background:${bg}; border:1px solid ${border}; border-radius:14px; padding:18px; margin-bottom:10px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">
                  <tr>
                    <td style="vertical-align:middle;">
                      <span style="font-size:15px; margin-right:6px;">${icon}</span>
                      <span style="font-size:13px; font-weight:700; color:#DCFCE7;">${label}</span>
                    </td>
                    <td align="right" style="vertical-align:middle;">
                      <span style="${pill} font-size:10px; border-radius:20px; padding:4px 12px; font-weight:700; letter-spacing:0.05em;">
                        ${getRiskLabel(val)}
                      </span>
                    </td>
                  </tr>
                </table>
                <!-- Bar track -->
                <div style="background:${barBg}; border-radius:4px; height:6px; margin-bottom:10px; overflow:hidden;">
                  <div style="width:${pct}%; background:${color}; height:6px; border-radius:4px;"></div>
                </div>
                <!-- Pct + note -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="font-size:15px; font-weight:800; color:${color};">${pct}%</td>
                    <td align="right" style="font-size:11px; color:#4A8A5A;">${note}</td>
                  </tr>
                </table>
              </div>`;
              }).join("")}

              <!-- ── OVERALL RISK ───────────────────────────── -->
              <div style="background:${overallBg(scores.overallRisk)}; border:1px solid ${overallBorder(scores.overallRisk)};
                           border-radius:14px; padding:20px 22px; margin:18px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      <p style="margin:0 0 6px; font-size:10px; font-weight:700; color:#2A5A32;
                                 text-transform:uppercase; letter-spacing:0.09em;">Overall Risk Level</p>
                      <p style="margin:0; font-size:22px; font-weight:800; color:${overallColor(scores.overallRisk)};
                                 letter-spacing:-0.01em;">
                        ${(scores.overallRisk || "low").replace("_", " ").toUpperCase()}
                      </p>
                    </td>
                    <td align="right" style="vertical-align:middle;">
                      <div style="width:44px; height:44px; background:rgba(34,197,94,0.08);
                                  border:1px solid rgba(34,197,94,0.22); border-radius:12px;
                                  text-align:center; line-height:44px; font-size:22px;">📊</div>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- ── REPORTED SYMPTOMS ─────────────────────── -->
              ${profile.symptoms?.length > 0 ? `
              <div style="margin-bottom:18px;">
                <p style="margin:0 0 10px; font-size:10px; font-weight:700; color:#2A5A32;
                           letter-spacing:0.1em; text-transform:uppercase;">Reported Symptoms</p>
                <div style="background:rgba(5,20,8,0.9); border:1px solid rgba(34,197,94,0.14);
                             border-radius:12px; padding:14px 16px;">
                  ${profile.symptoms.map(s =>
                    `<span style="background:rgba(34,197,94,0.08); border:1px solid rgba(34,197,94,0.20);
                                  border-radius:20px; padding:4px 12px; font-size:11px; color:#22C55E;
                                  font-weight:600; display:inline-block; margin:3px 4px;">
                       ${s.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                     </span>`
                  ).join("")}
                </div>
              </div>` : ""}

              <!-- ── NOTES ─────────────────────────────────── -->
              ${profile.notes ? `
              <div style="margin-bottom:18px;">
                <p style="margin:0 0 10px; font-size:10px; font-weight:700; color:#2A5A32;
                           letter-spacing:0.1em; text-transform:uppercase;">Additional Notes</p>
                <div style="background:rgba(5,20,8,0.9); border:1px solid rgba(34,197,94,0.14);
                             border-radius:12px; padding:14px 16px; border-left:3px solid rgba(34,197,94,0.4);">
                  <p style="margin:0; font-size:13px; color:#4A8A5A; line-height:1.7;">${profile.notes}</p>
                </div>
              </div>` : ""}

              <!-- ── DISCLAIMER ─────────────────────────────── -->
              <div style="background:rgba(5,20,8,0.9); border:1px solid rgba(34,197,94,0.10);
                           border-radius:12px; padding:14px 16px; margin-top:8px;
                           display:flex; gap:10px; align-items:flex-start;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="width:20px; vertical-align:top; padding-top:1px; font-size:14px;">⚠️</td>
                    <td style="padding-left:8px; font-size:12px; color:#2A5A32; line-height:1.7;">
                      This report is for informational purposes only and does not constitute medical advice.
                      Always consult a qualified healthcare professional before making any health decisions.
                    </td>
                  </tr>
                </table>
              </div>

            </td>
          </tr>

          <!-- ─── FOOTER ─────────────────────────────────── -->
          <tr>
            <td style="background:rgba(5,18,8,0.95); border-top:1px solid rgba(34,197,94,0.10); padding:18px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width:26px; vertical-align:middle;">
                          <div style="width:24px; height:24px; background:rgba(34,197,94,0.12); border:1px solid rgba(34,197,94,0.25); border-radius:6px; text-align:center; line-height:24px; font-size:12px;">🛡️</div>
                        </td>
                        <td style="padding-left:8px; vertical-align:middle;">
                          <span style="font-size:13px; font-weight:700; color:#DCFCE7;">HealthGuard AI</span>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:6px 0 0; font-size:11px; color:#2A5A32;">
                      Generated on ${new Date().toLocaleDateString("en-IN", { day:"2-digit", month:"long", year:"numeric" })}
                    </p>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="background:rgba(34,197,94,0.08); border:1px solid rgba(34,197,94,0.18);
                                 border-radius:20px; padding:4px 12px; font-size:10px; color:#22C55E;
                                 font-weight:700; letter-spacing:0.06em;">🔒 SECURE &amp; ENCRYPTED</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Green bottom accent line -->
          <tr>
            <td style="background:linear-gradient(90deg,#15803D,#22C55E); height:3px; font-size:0; line-height:0;">&nbsp;</td>
          </tr>

        </table>

        <!-- Below-card note -->
        <p style="margin:20px 0 0; font-size:11px; color:#2A5A32; text-align:center;">
          You received this report because it was requested via HealthGuard AI. &nbsp;|&nbsp; Do not reply to this email.
        </p>

      </td>
    </tr>
  </table>

</body>
</html>`;

    const transporter = nodemailer.createTransport({
      host:   process.env.EMAIL_HOST,
      port:   Number(process.env.EMAIL_PORT) || 465 ,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from:    `"HealthGuard AI" <${process.env.EMAIL_USER}>`,
      to:      recipientEmail,
      subject: `Your Health Risk Assessment Report — ${new Date().toLocaleDateString("en-IN", { day:"2-digit", month:"long", year:"numeric" })}`,
      html:    htmlContent,
    });

    res.json({ success: true, message: "Report sent successfully!" });

  } catch (err) {
    console.error("Email error:", err.message);
    res.status(500).json({ success: false, message: "Failed to send email: " + err.message });
  }
};