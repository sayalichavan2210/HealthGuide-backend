const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
const crypto   = require("crypto");

const userSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    avatar: {
      type: String,
      default: "",
    },

    // ── Auth Provider ─────────────────────────────────────
    authProvider: {
      type: String,
      enum: ["local", "google", "github"],
      default: "local",
    },
    googleId: {
      type: String,
      default: null,
      sparse: true,   // allows multiple null values (unique only when set)
    },

githubId: {
  type: String,
  default: null,
  sparse: true,
},
    // ── Password ──────────────────────────────────────────
    password: {
      type: String,
      minlength: [8, "Password must be at least 8 characters"],
      select: false,  // never returned in queries by default
    },

    // ── Email Verification ────────────────────────────────
    isVerified: {
      type: Boolean,
      default: false,
    },
    emailVerifyOTP: {
      type: String,
      select: false,
    },
    emailVerifyOTPExpiry: {
      type: Date,
      select: false,
    },

    // ── Password Reset ────────────────────────────────────
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpiry: {
      type: Date,
      select: false,
    },

    // ── Refresh Tokens (stored hashed) ────────────────────
    refreshTokens: {
      type: [String],
      select: false,
      default: [],
    },

    // ── Brute Force Protection ────────────────────────────
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },

    // ── Role ──────────────────────────────────────────────
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    // ── Profile Extras ────────────────────────────────────
    dateOfBirth: Date,
    phone: { type: String, default: "" },
    lastLogin: { type: Date, default: null },
  },
  {
    timestamps: true,   // createdAt, updatedAt
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.refreshTokens;
        delete ret.emailVerifyOTP;
        delete ret.emailVerifyOTPExpiry;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpiry;
        delete ret.loginAttempts;
        delete ret.lockUntil;
        return ret;
      },
    },
  }
);



// ── Virtual: fullName ─────────────────────────────────────
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// ── Virtual: isLocked ─────────────────────────────────────
userSchema.virtual("isLocked").get(function () {
  return this.lockUntil && this.lockUntil > Date.now();
});

// ── Pre-save: hash password ───────────────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Method: compare password ──────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// ── Method: generate email OTP ───────────────────────────
userSchema.methods.generateEmailOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
  this.emailVerifyOTP       = otp;
  this.emailVerifyOTPExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return otp;
};

// ── Method: generate password reset token ────────────────
userSchema.methods.generatePasswordResetToken = function () {
  const resetToken          = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken   = crypto.createHash("sha256").update(resetToken).digest("hex");
  this.passwordResetExpiry  = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  return resetToken; // raw token → sent in email
};

// ── Method: increment login attempts ─────────────────────
userSchema.methods.incLoginAttempts = async function () {
  const MAX_ATTEMPTS  = 5;
  const LOCK_DURATION = 30 * 60 * 1000; // 30 minutes

  // Reset if previous lock has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set:   { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= MAX_ATTEMPTS && !this.isLocked) {
    updates.$set = { lockUntil: new Date(Date.now() + LOCK_DURATION) };
  }
  return this.updateOne(updates);
};

// ── Method: reset login attempts after success ───────────
userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set:   { loginAttempts: 0, lastLogin: new Date() },
    $unset: { lockUntil: 1 },
  });
};

module.exports = mongoose.model("User", userSchema);