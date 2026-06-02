const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firstName:    { type: String, required: true },
  lastName:     { type: String, default: "" },
  email:        { type: String, required: true, unique: true },
  password:     { type: String, select: false },
  googleId:     { type: String },
  githubId:     { type: String },
  avatar:       { type: String, default: "" },
  authProvider: { type: String, default: "local" },
  isVerified:   { type: Boolean, default: false },
  role: { type: String, enum: ["user", "admin"], default: "user" },

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);