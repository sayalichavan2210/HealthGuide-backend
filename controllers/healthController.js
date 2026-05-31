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

const { Resend } = require("resend"); // ✅ sirf resend, nodemailer nahi

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

    // ✅ Helper functions
    const getPct       = (v) => Math.round((v || 0) * 100);
    const getRiskColor = (v) => v > 0.6 ? "#f87171" : v > 0.35 ? "#fbbf24" : "#22c55e";
    const getRiskLabel = (v) => v > 0.6 ? "High Risk" : v > 0.35 ? "Moderate" : "Low Risk";
    const overallColor = (r) => ["high","very_high"].includes(r) ? "#f87171" : r === "moderate" ? "#fbbf24" : "#22c55e";

    // ✅ htmlContent yahan define hai
    const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#050A05;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;background:#050A05;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" 
        style="background:#060E06;border-radius:20px;border:1px solid rgba(34,197,94,0.22);overflow:hidden;">
        
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(90deg,#15803D,#22C55E);height:4px;font-size:0;">&nbsp;</td>
        </tr>
        <tr>
          <td style="padding:28px 32px;border-bottom:1px solid rgba(34,197,94,0.12);">
            <p style="margin:0;font-size:20px;font-weight:700;color:#DCFCE7;">🛡️ HealthGuard AI</p>
            <p style="margin:4px 0 0;font-size:13px;color:#4A8A5A;">Health Risk Assessment Report</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px;">
            
            <!-- Personal Details -->
            <p style="margin:0 0 16px;font-size:11px;font-weight:700;color:#2A5A32;text-transform:uppercase;letter-spacing:0.1em;">
              Personal Details
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td width="48%" style="padding:12px 14px;background:rgba(5,20,8,0.9);border:1px solid rgba(34,197,94,0.14);border-radius:10px;">
                  <p style="margin:0 0 4px;font-size:10px;color:#2A5A32;text-transform:uppercase;">Age</p>
                  <p style="margin:0;font-size:16px;font-weight:700;color:#DCFCE7;">${profile.age} years</p>
                </td>
                <td width="4%"></td>
                <td width="48%" style="padding:12px 14px;background:rgba(5,20,8,0.9);border:1px solid rgba(34,197,94,0.14);border-radius:10px;">
                  <p style="margin:0 0 4px;font-size:10px;color:#2A5A32;text-transform:uppercase;">Gender</p>
                  <p style="margin:0;font-size:16px;font-weight:700;color:#DCFCE7;text-transform:capitalize;">${profile.gender || "N/A"}</p>
                </td>
              </tr>
            </table>

            <!-- Risk Analysis -->
            <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#2A5A32;text-transform:uppercase;letter-spacing:0.1em;">
              Risk Analysis
            </p>

            <!-- Diabetes -->
            <div style="background:#071a0a;border:1px solid #0f3a1a;border-radius:12px;padding:16px;margin-bottom:10px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:13px;font-weight:700;color:#DCFCE7;">🩸 Diabetes Risk</td>
                  <td align="right" style="font-size:11px;font-weight:700;color:${getRiskColor(scores.diabetes||0)};">
                    ${getRiskLabel(scores.diabetes||0)}
                  </td>
                </tr>
              </table>
              <div style="background:#062010;border-radius:4px;height:6px;margin:10px 0;overflow:hidden;">
                <div style="width:${getPct(scores.diabetes||0)}%;background:${getRiskColor(scores.diabetes||0)};height:6px;border-radius:4px;"></div>
              </div>
              <p style="margin:0;font-size:16px;font-weight:800;color:${getRiskColor(scores.diabetes||0)};">${getPct(scores.diabetes||0)}%</p>
            </div>

            <!-- Heart Disease -->
            <div style="background:#071a0a;border:1px solid #0f3a1a;border-radius:12px;padding:16px;margin-bottom:10px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:13px;font-weight:700;color:#DCFCE7;">❤️ Heart Disease Risk</td>
                  <td align="right" style="font-size:11px;font-weight:700;color:${getRiskColor(scores.heartDisease||0)};">
                    ${getRiskLabel(scores.heartDisease||0)}
                  </td>
                </tr>
              </table>
              <div style="background:#062010;border-radius:4px;height:6px;margin:10px 0;overflow:hidden;">
                <div style="width:${getPct(scores.heartDisease||0)}%;background:${getRiskColor(scores.heartDisease||0)};height:6px;border-radius:4px;"></div>
              </div>
              <p style="margin:0;font-size:16px;font-weight:800;color:${getRiskColor(scores.heartDisease||0)};">${getPct(scores.heartDisease||0)}%</p>
            </div>

            <!-- Hypertension -->
            <div style="background:#071a0a;border:1px solid #0f3a1a;border-radius:12px;padding:16px;margin-bottom:20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:13px;font-weight:700;color:#DCFCE7;">🩺 Hypertension Risk</td>
                  <td align="right" style="font-size:11px;font-weight:700;color:${getRiskColor(scores.hypertension||0)};">
                    ${getRiskLabel(scores.hypertension||0)}
                  </td>
                </tr>
              </table>
              <div style="background:#062010;border-radius:4px;height:6px;margin:10px 0;overflow:hidden;">
                <div style="width:${getPct(scores.hypertension||0)}%;background:${getRiskColor(scores.hypertension||0)};height:6px;border-radius:4px;"></div>
              </div>
              <p style="margin:0;font-size:16px;font-weight:800;color:${getRiskColor(scores.hypertension||0)};">${getPct(scores.hypertension||0)}%</p>
            </div>

            <!-- Overall Risk -->
            <div style="background:#071a0a;border:1px solid #0f3a1a;border-radius:12px;padding:18px;">
              <p style="margin:0 0 6px;font-size:10px;font-weight:700;color:#2A5A32;text-transform:uppercase;">Overall Risk Level</p>
              <p style="margin:0;font-size:24px;font-weight:800;color:${overallColor(scores.overallRisk)};">
                ${(scores.overallRisk || "low").replace("_"," ").toUpperCase()}
              </p>
            </div>

            <!-- Disclaimer -->
            <p style="margin:20px 0 0;font-size:12px;color:#2A5A32;line-height:1.7;">
              ⚠️ This report is for informational purposes only. Always consult a qualified healthcare professional.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:linear-gradient(90deg,#15803D,#22C55E);height:3px;font-size:0;">&nbsp;</td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    // ✅ Resend se email bhejo
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { error } = await resend.emails.send({
      from:    "HealthGuard AI <onboarding@resend.dev>",
      to:     recipientEmail,   
      subject: `Your Health Risk Report — ${new Date().toLocaleDateString("en-IN")}`,
      html:    htmlContent,
    });

    if (error) {
      console.error("Resend error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }

    res.json({ success: true, message: "Report sent successfully!" });

  } catch (err) {
    console.error("Email error:", err.message);
    res.status(500).json({ success: false, message: "Failed to send email: " + err.message });
  }
};