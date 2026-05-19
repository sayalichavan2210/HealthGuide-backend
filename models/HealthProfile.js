const mongoose = require("mongoose");

const healthProfileSchema = new mongoose.Schema(
  {
    // ── Owner ─────────────────────────────────────────────
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ── Basic Vitals ──────────────────────────────────────
    age: {
      type: Number,
      required: [true, "Age is required"],
      min: [1, "Age must be at least 1"],
      max: [120, "Age cannot exceed 120"],
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: [true, "Gender is required"],
    },
    heightCm: {
      type: Number,
      required: [true, "Height is required"],
      min: 50,
      max: 300,
    },
    weightKg: {
      type: Number,
      required: [true, "Weight is required"],
      min: 1,
      max: 500,
    },
    bmi: {
      type: Number, // auto-calculated on save
    },

    // ── Blood Metrics ─────────────────────────────────────
    bloodPressureSystolic:  { type: Number, min: 60,  max: 250 },
    bloodPressureDiastolic: { type: Number, min: 40,  max: 150 },
    bloodSugarFasting:      { type: Number, min: 50,  max: 600 }, // mg/dL
    cholesterolTotal:       { type: Number, min: 50,  max: 600 }, // mg/dL
    heartRateBpm:           { type: Number, min: 30,  max: 220 },

    // ── Lifestyle ─────────────────────────────────────────
    smokingStatus: {
      type: String,
      enum: ["never", "former", "current"],
      default: "never",
    },
    alcoholConsumption: {
      type: String,
      enum: ["none", "occasional", "moderate", "heavy"],
      default: "none",
    },
    exerciseDaysPerWeek: {
      type: Number,
      min: 0,
      max: 7,
      default: 0,
    },
    sleepHoursPerDay: {
      type: Number,
      min: 0,
      max: 24,
      default: 7,
    },
    dietType: {
      type: String,
      enum: ["vegetarian", "non-vegetarian", "vegan", "other"],
      default: "other",
    },

    // ── Symptoms ──────────────────────────────────────────
    symptoms: {
      type: [String],
      enum: [
        "fatigue",
        "chest_pain",
        "shortness_of_breath",
        "frequent_urination",
        "excessive_thirst",
        "blurred_vision",
        "headache",
        "dizziness",
        "joint_pain",
        "weight_gain",
        "weight_loss",
        "nausea",
        "sweating",
        "palpitations",
        "swollen_feet",
      ],
      default: [],
    },

    // ── Family History ────────────────────────────────────
    familyHistory: {
      diabetes:     { type: Boolean, default: false },
      heartDisease: { type: Boolean, default: false },
      hypertension: { type: Boolean, default: false },
      cancer:       { type: Boolean, default: false },
      stroke:       { type: Boolean, default: false },
    },

    // ── Existing Conditions ───────────────────────────────
    existingConditions: {
      type: [String],
      enum: [
        "diabetes",
        "hypertension",
        "heart_disease",
        "asthma",
        "thyroid",
        "kidney_disease",
        "liver_disease",
        "none",
      ],
      default: ["none"],
    },

    // ── Risk Scores (filled by ML service) ───────────────
    riskScores: {
      diabetes:     { type: Number, min: 0, max: 100, default: null },
      heartDisease: { type: Number, min: 0, max: 100, default: null },
      hypertension: { type: Number, min: 0, max: 100, default: null },
      obesity:      { type: Number, min: 0, max: 100, default: null },
      overallRisk: {
        type: String,
        enum: ["low", "moderate", "high", "very_high", null],
        default: null,
      },
    },

    // ── ML Status ─────────────────────────────────────────
    mlAnalysisStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    mlAnalysedAt: {
      type: Date,
      default: null,
    },

    // ── Notes ─────────────────────────────────────────────
    notes: {
      type: String,
      maxlength: 500,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// ── Auto-calculate BMI before save ───────────────────────
healthProfileSchema.pre("save", function (next) {
  if (this.heightCm && this.weightKg) {
    const heightM = this.heightCm / 100;
    this.bmi = parseFloat((this.weightKg / (heightM * heightM)).toFixed(1));
  }
  next();
});

// ── Virtual: BMI category ─────────────────────────────────
healthProfileSchema.virtual("bmiCategory").get(function () {
  if (!this.bmi) return null;
  if (this.bmi < 18.5) return "underweight";
  if (this.bmi < 25)   return "normal";
  if (this.bmi < 30)   return "overweight";
  return "obese";
});

// ── Index for fast user history lookup ───────────────────
healthProfileSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("HealthProfile", healthProfileSchema);