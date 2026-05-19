const { body, validationResult } = require("express-validator");
const { errorResponse }          = require("../utils/ApiResponse");

// ── Run validation and return errors ─────────────────────
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, {
      statusCode: 422,
      message:    "Validation failed",
      errors:     errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ── Sign Up validation rules ──────────────────────────────
const signupRules = [
  body("firstName")
    .trim()
    .notEmpty().withMessage("First name is required")
    .isLength({ max: 50 }).withMessage("First name must be under 50 characters")
    .matches(/^[a-zA-Z\s'-]+$/).withMessage("First name contains invalid characters"),

  body("lastName")
    .trim()
    .notEmpty().withMessage("Last name is required")
    .isLength({ max: 50 }).withMessage("Last name must be under 50 characters")
    .matches(/^[a-zA-Z\s'-]+$/).withMessage("Last name contains invalid characters"),

  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter")
    .matches(/[a-z]/).withMessage("Password must contain at least one lowercase letter")
    .matches(/\d/).withMessage("Password must contain at least one number")
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage("Password must contain at least one special character"),
];

// ── Sign In validation rules ──────────────────────────────
const signinRules = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("password")
    .notEmpty().withMessage("Password is required"),
];

// ── Verify OTP rules ──────────────────────────────────────
const verifyOTPRules = [
  body("email")
    .trim()
    .isEmail().withMessage("Valid email is required")
    .normalizeEmail(),

  body("otp")
    .trim()
    .notEmpty().withMessage("OTP is required")
    .isLength({ min: 6, max: 6 }).withMessage("OTP must be exactly 6 digits")
    .isNumeric().withMessage("OTP must contain only numbers"),
];

// ── Forgot password rules ─────────────────────────────────
const forgotPasswordRules = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please provide a valid email address")
    .normalizeEmail(),
];

// ── Reset password rules ──────────────────────────────────
const resetPasswordRules = [
  body("token")
    .trim()
    .notEmpty().withMessage("Reset token is required"),

  body("password")
    .notEmpty().withMessage("New password is required")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter")
    .matches(/[a-z]/).withMessage("Password must contain at least one lowercase letter")
    .matches(/\d/).withMessage("Password must contain at least one number")
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage("Password must contain at least one special character"),
];

// ── Change password rules ─────────────────────────────────
const changePasswordRules = [
  body("currentPassword").notEmpty().withMessage("Current password is required"),
  body("newPassword")
    .notEmpty().withMessage("New password is required")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
];

module.exports = {
  validate,
  signupRules,
  signinRules,
  verifyOTPRules,
  forgotPasswordRules,
  resetPasswordRules,
  changePasswordRules,
};