const jwt    = require("jsonwebtoken");
const crypto = require("crypto");
const User   = require("../models/User");

// ── Generate Access Token (short-lived) ───────────────────
const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m" }
  );
};

// ── Generate Refresh Token (long-lived, stored in DB) ─────
const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString("hex");
};

// ── Save refresh token to DB (hashed) ────────────────────
const saveRefreshToken = async (userId, rawToken) => {
  const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");

  await User.findByIdAndUpdate(userId, {
    $push: {
      refreshTokens: {
        $each:     [hashed],
        $slice:    -5,       // keep only 5 most recent (multi-device support)
      },
    },
  });
};

// ── Rotate refresh token (invalidate old, issue new) ─────
const rotateRefreshToken = async (userId, oldRawToken) => {
  const oldHashed = crypto.createHash("sha256").update(oldRawToken).digest("hex");

  const user = await User.findById(userId).select("+refreshTokens");
  if (!user) throw new Error("User not found");

  const tokenExists = user.refreshTokens.includes(oldHashed);
  if (!tokenExists) throw new Error("Refresh token is invalid or already used");

  // Remove old token
  await User.findByIdAndUpdate(userId, {
    $pull: { refreshTokens: oldHashed },
  });

  // Issue new refresh token
  const newRawToken = generateRefreshToken();
  await saveRefreshToken(userId, newRawToken);

  return newRawToken;
};

// ── Revoke a specific refresh token ──────────────────────
const revokeRefreshToken = async (userId, rawToken) => {
  const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");
  await User.findByIdAndUpdate(userId, {
    $pull: { refreshTokens: hashed },
  });
};

// ── Revoke ALL refresh tokens (logout everywhere) ────────
const revokeAllRefreshTokens = async (userId) => {
  await User.findByIdAndUpdate(userId, { $set: { refreshTokens: [] } });
};

// ── Set tokens in HTTP-only cookies ──────────────────────
const setTokenCookies = (res, accessToken, refreshToken) => {
  const isProd = process.env.NODE_ENV === "production";

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure:   isProd,
    sameSite: isProd ? "strict" : "lax",
    maxAge:   15 * 60 * 1000,           // 15 minutes
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure:   isProd,
    sameSite: isProd ? "strict" : "lax",
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
    path:     "/api/auth/refresh",      // only sent to refresh endpoint
  });
};

// ── Clear token cookies ───────────────────────────────────
const clearTokenCookies = (res) => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken", { path: "/api/auth/refresh" });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  saveRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokens,
  setTokenCookies,
  clearTokenCookies,
};