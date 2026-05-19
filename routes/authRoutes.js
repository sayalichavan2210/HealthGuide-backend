const express  = require("express");
const passport = require("passport");
const jwt      = require("jsonwebtoken");
const router   = express.Router();

const {
  register,
  login,
  getMe,
  logout,
} = require("../controllers/authController");

const { protect } = require("../middlewares/authMiddleware");

// ── Local Auth ────────────────────────────────────────────
router.post("/register", register);
router.post("/login",    login);
router.post("/logout",   protect, logout);
router.get("/me",        protect, getMe);

// ── Google OAuth ──────────────────────────────────────────
router.get("/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get("/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: `${process.env.CLIENT_URL}/auth?error=google_failed` }),
  (req, res) => {
    // JWT banao aur frontend pe bhejo
    const accessToken = jwt.sign(
      { id: req.user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    const refreshToken = jwt.sign(
      { id: req.user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // Frontend ko redirect karo token ke saath
    res.redirect(
      `${process.env.CLIENT_URL}/auth/callback?token=${accessToken}&refresh=${refreshToken}`
    );
  }
);

// ── GitHub OAuth ──────────────────────────────────────────
router.get("/github",
  passport.authenticate("github", { scope: ["user:email"] })
);

router.get("/github/callback",
  passport.authenticate("github", { session: false, failureRedirect: `${process.env.CLIENT_URL}/auth?error=github_failed` }),
  (req, res) => {
    const accessToken = jwt.sign(
      { id: req.user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    const refreshToken = jwt.sign(
      { id: req.user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    res.redirect(
      `${process.env.CLIENT_URL}/auth/callback?token=${accessToken}&refresh=${refreshToken}`
    );
  }
);

module.exports = router;