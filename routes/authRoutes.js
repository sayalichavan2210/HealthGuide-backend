// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const { register, login, getMe } = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");
const passport = require("passport");
const { accessToken, refreshToken } = generateTokens(user);
const { generateTokens } = require("../utils/generateTokens");

// ── Email/Password ─────────────────────────────
router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);

// ── Google OAuth ───────────────────────────────
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get("/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: `${process.env.CLIENT_URL}/auth?error=oauth_failed` }),
  (req, res) => {
    const { accessToken, refreshToken } = generateTokens(req.user);
   res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${accessToken}&refresh=${refreshToken}`);
  }
);

// ── GitHub OAuth ───────────────────────────────
router.get("/github", passport.authenticate("github", { scope: ["user:email"] }));
router.get("/github/callback",
  passport.authenticate("github", { session: false, failureRedirect: `${process.env.CLIENT_URL}/auth?error=oauth_failed` }),
  (req, res) => {
    const { accessToken, refreshToken } = generateTokens(req.user);
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${accessToken}&refresh=${refreshToken}`);
  }
);

module.exports = router;