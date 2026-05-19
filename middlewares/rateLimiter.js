const jwt  = require("jsonwebtoken");
const User = require("../models/User");
const { errorResponse } = require("../utils/ApiResponse");

// ── Protect routes: verify access token ──────────────────
const protect = async (req, res, next) => {
  try {
    let token;

    // 1. Check Authorization header (Bearer token)
    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }
    // 2. Fall back to cookie
    else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return errorResponse(res, {
        statusCode: 401,
        message: "Access denied. No token provided.",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Attach user to request (exclude sensitive fields)
    const user = await User.findById(decoded.id).select("-password -refreshTokens");
    if (!user) {
      return errorResponse(res, { statusCode: 401, message: "User not found." });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return errorResponse(res, { statusCode: 401, message: "Token expired. Please refresh." });
    }
    if (err.name === "JsonWebTokenError") {
      return errorResponse(res, { statusCode: 401, message: "Invalid token." });
    }
    return errorResponse(res, { statusCode: 500, message: "Authentication error." });
  }
};

// ── Role-based access control ─────────────────────────────
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return errorResponse(res, {
      statusCode: 403,
      message: `Access forbidden. Requires role: ${roles.join(" or ")}.`,
    });
  }
  next();
};

// ── Verify email check ────────────────────────────────────
const requireVerified = (req, res, next) => {
  if (!req.user?.isVerified) {
    return errorResponse(res, {
      statusCode: 403,
      message: "Please verify your email address before accessing this resource.",
    });
  }
  next();
};

module.exports = { protect, authorize, requireVerified };