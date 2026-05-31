const User          = require("../models/User");
const HealthProfile = require("../models/HealthProfile");

// ── Dashboard Stats ───────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const [totalUsers, totalAssessments, recentUsers] = await Promise.all([
      User.countDocuments(),
      HealthProfile.countDocuments(),
      User.find().sort({ createdAt: -1 }).limit(5).select("firstName lastName email createdAt role"),
    ]);

    res.json({
      success: true,
      stats: { totalUsers, totalAssessments },
      recentUsers,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get All Users ─────────────────────────────────────────
exports.getAllUsers = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find().sort({ createdAt: -1 }).skip(skip).limit(limit)
        .select("-password"),
      User.countDocuments(),
    ]);

    res.json({ success: true, total, page, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Delete User ───────────────────────────────────────────
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    await HealthProfile.deleteMany({ user: req.params.id });
    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get All Assessments ───────────────────────────────────
exports.getAllAssessments = async (req, res) => {
  try {
    const profiles = await HealthProfile.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("user", "firstName lastName email");

    res.json({ success: true, profiles });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Make Admin ────────────────────────────────────────────
exports.makeAdmin = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: "admin" },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: "User is now admin", user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};